import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface QualityInspection {
  id: string;
  productId: string;
  batchId: string;
  inspectionType: 'visual' | 'dimensional' | 'functional' | 'safety' | 'comprehensive';
  status: 'pending' | 'in_progress' | 'passed' | 'failed' | 'requires_review';
  inspectorId?: string;
  aiConfidence: number;
  defects: QualityDefect[];
  measurements: QualityMeasurement[];
  images: string[];
  notes: string;
  createdAt: Date;
  completedAt?: Date;
}

interface QualityDefect {
  id: string;
  type: 'scratch' | 'dent' | 'discoloration' | 'crack' | 'misalignment' | 'contamination' | 'other';
  severity: 'minor' | 'major' | 'critical';
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  description: string;
  aiDetected: boolean;
}

interface QualityMeasurement {
  id: string;
  parameter: string;
  value: number;
  unit: string;
  tolerance: {
    min: number;
    max: number;
  };
  status: 'within_tolerance' | 'out_of_tolerance';
  deviation: number;
}

interface QualityStandard {
  id: string;
  productId: string;
  name: string;
  parameters: QualityParameter[];
  thresholds: {
    defectThreshold: number;
    measurementThreshold: number;
    overallThreshold: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface QualityParameter {
  name: string;
  type: 'visual' | 'dimensional' | 'functional';
  weight: number;
  criteria: Record<string, any>;
}

interface QualityAnalytics {
  totalInspections: number;
  passedInspections: number;
  failedInspections: number;
  passRate: number;
  averageConfidence: number;
  defectDistribution: Record<string, number>;
  topDefects: Array<{
    type: string;
    count: number;
    severity: string;
  }>;
  aiAccuracy: number;
  inspectionEfficiency: number;
}

@Injectable()
export class AiQualityControlService {
  private readonly logger = new Logger(AiQualityControlService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async createQualityStandard(standard: Omit<QualityStandard, 'id' | 'createdAt' | 'updatedAt'>): Promise<QualityStandard> {
    const standardId = `standard-${Date.now()}`;
    
    const newStandard: QualityStandard = {
      id: standardId,
      ...standard,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveQualityStandard(newStandard);
    
    this.logger.log(`Created quality standard: ${standardId}`);
    return newStandard;
  }

  async getQualityStandards(productId?: string): Promise<QualityStandard[]> {
    const result = await this.db.execute(`
      SELECT * FROM quality_standards
      ${productId ? 'WHERE product_id = $1' : ''}
      AND is_active = true
      ORDER BY created_at DESC
    `, productId ? [productId] : []);
    
    return result.rows.map(row => ({
      ...row,
      parameters: JSON.parse(row.parameters || '[]'),
      thresholds: JSON.parse(row.thresholds || '{}')
    }));
  }

  async createQualityInspection(inspection: Omit<QualityInspection, 'id' | 'createdAt' | 'completedAt'>): Promise<QualityInspection> {
    const inspectionId = `inspection-${Date.now()}`;
    
    const newInspection: QualityInspection = {
      id: inspectionId,
      ...inspection,
      createdAt: new Date()
    };

    await this.saveQualityInspection(newInspection);
    
    this.logger.log(`Created quality inspection: ${inspectionId}`);
    return newInspection;
  }

  async getQualityInspections(productId?: string, status?: string): Promise<QualityInspection[]> {
    let query = 'SELECT * FROM quality_inspections';
    const params = [];
    
    if (productId) {
      query += ' WHERE product_id = $1';
      params.push(productId);
    }
    
    if (status) {
      query += productId ? ' AND status = $2' : ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      defects: JSON.parse(row.defects || '[]'),
      measurements: JSON.parse(row.measurements || '[]')
    }));
  }

  async processAiInspection(inspectionId: string, images: string[]): Promise<{
    defects: QualityDefect[];
    measurements: QualityMeasurement[];
    overallConfidence: number;
    recommendation: 'pass' | 'fail' | 'review';
  }> {
    const inspection = await this.getQualityInspection(inspectionId);
    const standard = await this.getQualityStandard(inspection.productId);
    
    // Mock AI processing - in real implementation, this would use computer vision models
    this.logger.log(`Processing AI inspection for ${inspectionId} with ${images.length} images`);
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const defects = await this.detectDefects(images, standard);
    const measurements = await this.performMeasurements(images, standard);
    const overallConfidence = this.calculateOverallConfidence(defects, measurements);
    const recommendation = this.determineRecommendation(defects, measurements, standard);
    
    // Update inspection with AI results
    inspection.defects = defects;
    inspection.measurements = measurements;
    inspection.aiConfidence = overallConfidence;
    inspection.images = images;
    
    if (recommendation === 'pass') {
      inspection.status = 'passed';
    } else if (recommendation === 'fail') {
      inspection.status = 'failed';
    } else {
      inspection.status = 'requires_review';
    }
    
    inspection.completedAt = new Date();
    
    await this.saveQualityInspection(inspection);
    
    this.logger.log(`AI inspection completed for ${inspectionId}: ${recommendation} (confidence: ${overallConfidence})`);
    
    return {
      defects,
      measurements,
      overallConfidence,
      recommendation
    };
  }

  async updateInspectionStatus(inspectionId: string, status: string, inspectorId?: string, notes?: string): Promise<void> {
    const inspection = await this.getQualityInspection(inspectionId);
    
    inspection.status = status as any;
    if (inspectorId) inspection.inspectorId = inspectorId;
    if (notes) inspection.notes = notes;
    
    if (status === 'passed' || status === 'failed') {
      inspection.completedAt = new Date();
    }
    
    await this.saveQualityInspection(inspection);
    
    this.logger.log(`Updated inspection status: ${inspectionId} to ${status}`);
  }

  async getQualityAnalytics(period: string = '30d'): Promise<QualityAnalytics> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(*) as total_inspections,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed_inspections,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_inspections,
        AVG(ai_confidence) as avg_confidence
      FROM quality_inspections
      WHERE created_at >= NOW() - INTERVAL '${period}'
    `);
    
    const stats = result.rows[0];
    const totalInspections = parseInt(stats.total_inspections) || 0;
    const passedInspections = parseInt(stats.passed_inspections) || 0;
    const failedInspections = parseInt(stats.failed_inspections) || 0;
    
    const passRate = totalInspections > 0 ? (passedInspections / totalInspections) * 100 : 0;
    
    // Get defect distribution
    const defectResult = await this.db.execute(`
      SELECT 
        defect_type,
        COUNT(*) as defect_count,
        severity
      FROM quality_defects
      WHERE created_at >= NOW() - INTERVAL '${period}'
      GROUP BY defect_type, severity
      ORDER BY defect_count DESC
    `);
    
    const defectDistribution: Record<string, number> = {};
    const topDefects = defectResult.rows.map(row => ({
      type: row.defect_type,
      count: parseInt(row.defect_count),
      severity: row.severity
    }));
    
    defectResult.rows.forEach(row => {
      defectDistribution[row.defect_type] = parseInt(row.defect_count);
    });
    
    return {
      totalInspections,
      passedInspections,
      failedInspections,
      passRate,
      averageConfidence: parseFloat(stats.avg_confidence) || 0,
      defectDistribution,
      topDefects: topDefects.slice(0, 5),
      aiAccuracy: 94.5, // Mock accuracy
      inspectionEfficiency: 87.2 // Mock efficiency
    };
  }

  async generateQualityReport(productId: string, startDate: Date, endDate: Date): Promise<{
    summary: {
      totalInspections: number;
      passRate: number;
      averageConfidence: number;
    };
    defects: {
      totalDefects: number;
      criticalDefects: number;
      defectTrend: Array<{
        date: string;
        count: number;
      }>;
    };
    recommendations: string[];
  }> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(*) as total_inspections,
        AVG(ai_confidence) as avg_confidence,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed_count
      FROM quality_inspections
      WHERE product_id = $1
        AND created_at BETWEEN $2 AND $3
    `, [productId, startDate, endDate]);
    
    const stats = result.rows[0];
    const totalInspections = parseInt(stats.total_inspections) || 0;
    const passedCount = parseInt(stats.passed_count) || 0;
    const passRate = totalInspections > 0 ? (passedCount / totalInspections) * 100 : 0;
    
    // Get defect trends
    const defectTrendResult = await this.db.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as defect_count
      FROM quality_defects
      WHERE product_id = $1
        AND created_at BETWEEN $2 AND $3
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [productId, startDate, endDate]);
    
    const defectTrend = defectTrendResult.rows.map(row => ({
      date: row.date,
      count: parseInt(row.defect_count)
    }));
    
    // Get critical defects
    const criticalDefectsResult = await this.db.execute(`
      SELECT COUNT(*) as critical_count
      FROM quality_defects
      WHERE product_id = $1
        AND severity = 'critical'
        AND created_at BETWEEN $2 AND $3
    `, [productId, startDate, endDate]);
    
    const criticalDefects = parseInt(criticalDefectsResult.rows[0]?.critical_count) || 0;
    
    // Generate recommendations
    const recommendations = this.generateQualityRecommendations(passRate, criticalDefects);
    
    return {
      summary: {
        totalInspections,
        passRate,
        averageConfidence: parseFloat(stats.avg_confidence) || 0
      },
      defects: {
        totalDefects: defectTrend.reduce((sum, item) => sum + item.count, 0),
        criticalDefects,
        defectTrend
      },
      recommendations
    };
  }

  private async detectDefects(images: string[], standard: QualityStandard): Promise<QualityDefect[]> {
    // Mock defect detection - in real implementation, this would use computer vision models
    const defects: QualityDefect[] = [];
    
    // Simulate defect detection
    for (let i = 0; i < Math.floor(Math.random() * 3); i++) {
      defects.push({
        id: `defect-${Date.now()}-${i}`,
        type: ['scratch', 'dent', 'discoloration', 'crack'][Math.floor(Math.random() * 4)] as any,
        severity: ['minor', 'major', 'critical'][Math.floor(Math.random() * 3)] as any,
        location: {
          x: Math.random() * 100,
          y: Math.random() * 100,
          width: Math.random() * 20 + 5,
          height: Math.random() * 20 + 5
        },
        confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
        description: 'AI-detected defect',
        aiDetected: true
      });
    }
    
    return defects;
  }

  private async performMeasurements(images: string[], standard: QualityStandard): Promise<QualityMeasurement[]> {
    // Mock measurements - in real implementation, this would use computer vision for dimensional analysis
    const measurements: QualityMeasurement[] = [];
    
    for (const parameter of standard.parameters) {
      if (parameter.type === 'dimensional') {
        const value = Math.random() * 10 + 5; // Mock measurement
        const tolerance = { min: value - 0.5, max: value + 0.5 };
        
        measurements.push({
          id: `measurement-${Date.now()}`,
          parameter: parameter.name,
          value,
          unit: 'mm',
          tolerance,
          status: value >= tolerance.min && value <= tolerance.max ? 'within_tolerance' : 'out_of_tolerance',
          deviation: Math.abs(value - (tolerance.min + tolerance.max) / 2)
        });
      }
    }
    
    return measurements;
  }

  private calculateOverallConfidence(defects: QualityDefect[], measurements: QualityMeasurement[]): number {
    if (defects.length === 0 && measurements.length === 0) return 1.0;
    
    const defectConfidence = defects.length > 0 
      ? defects.reduce((sum, defect) => sum + defect.confidence, 0) / defects.length 
      : 1.0;
    
    const measurementConfidence = measurements.length > 0 
      ? measurements.reduce((sum, measurement) => sum + 0.9, 0) / measurements.length 
      : 1.0;
    
    return (defectConfidence + measurementConfidence) / 2;
  }

  private determineRecommendation(defects: QualityDefect[], measurements: QualityMeasurement[], standard: QualityStandard): 'pass' | 'fail' | 'review' {
    const criticalDefects = defects.filter(d => d.severity === 'critical').length;
    const majorDefects = defects.filter(d => d.severity === 'major').length;
    const outOfToleranceMeasurements = measurements.filter(m => m.status === 'out_of_tolerance').length;
    
    if (criticalDefects > 0) return 'fail';
    if (majorDefects > 2 || outOfToleranceMeasurements > 1) return 'fail';
    if (majorDefects > 0 || outOfToleranceMeasurements > 0) return 'review';
    
    return 'pass';
  }

  private generateQualityRecommendations(passRate: number, criticalDefects: number): string[] {
    const recommendations = [];
    
    if (passRate < 90) {
      recommendations.push('Quality pass rate is below target - review inspection standards');
    }
    
    if (criticalDefects > 0) {
      recommendations.push('Critical defects detected - investigate root cause');
    }
    
    if (passRate > 95) {
      recommendations.push('Excellent quality performance - consider optimizing inspection process');
    }
    
    return recommendations;
  }

  private async getQualityInspection(inspectionId: string): Promise<QualityInspection> {
    const result = await this.db.execute(`
      SELECT * FROM quality_inspections WHERE id = $1
    `, [inspectionId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Quality inspection not found: ${inspectionId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      defects: JSON.parse(row.defects || '[]'),
      measurements: JSON.parse(row.measurements || '[]')
    };
  }

  private async getQualityStandard(productId: string): Promise<QualityStandard> {
    const result = await this.db.execute(`
      SELECT * FROM quality_standards
      WHERE product_id = $1 AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `, [productId]);
    
    if (result.rows.length === 0) {
      // Return default standard if none exists
      return {
        id: 'default',
        productId,
        name: 'Default Quality Standard',
        parameters: [],
        thresholds: {
          defectThreshold: 0.1,
          measurementThreshold: 0.05,
          overallThreshold: 0.8
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    const row = result.rows[0];
    return {
      ...row,
      parameters: JSON.parse(row.parameters || '[]'),
      thresholds: JSON.parse(row.thresholds || '{}')
    };
  }

  private async saveQualityStandard(standard: QualityStandard): Promise<void> {
    await this.db.execute(`
      INSERT INTO quality_standards (id, product_id, name, parameters, thresholds, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      standard.id,
      standard.productId,
      standard.name,
      JSON.stringify(standard.parameters),
      JSON.stringify(standard.thresholds),
      standard.isActive,
      standard.createdAt,
      standard.updatedAt
    ]);
  }

  private async saveQualityInspection(inspection: QualityInspection): Promise<void> {
    await this.db.execute(`
      INSERT INTO quality_inspections (id, product_id, batch_id, inspection_type, status, inspector_id, ai_confidence, defects, measurements, images, notes, created_at, completed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        inspector_id = EXCLUDED.inspector_id,
        ai_confidence = EXCLUDED.ai_confidence,
        defects = EXCLUDED.defects,
        measurements = EXCLUDED.measurements,
        images = EXCLUDED.images,
        notes = EXCLUDED.notes,
        completed_at = EXCLUDED.completed_at
    `, [
      inspection.id,
      inspection.productId,
      inspection.batchId,
      inspection.inspectionType,
      inspection.status,
      inspection.inspectorId,
      inspection.aiConfidence,
      JSON.stringify(inspection.defects),
      JSON.stringify(inspection.measurements),
      JSON.stringify(inspection.images),
      inspection.notes,
      inspection.createdAt,
      inspection.completedAt
    ]);
  }
}
