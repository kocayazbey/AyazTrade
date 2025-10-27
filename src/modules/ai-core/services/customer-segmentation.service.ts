import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria;
  customerCount: number;
  averageLTV: number;
  characteristics: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface SegmentCriteria {
  rfm?: {
    recency: { min: number; max: number };
    frequency: { min: number; max: number };
    monetary: { min: number; max: number };
  };
  behavioral?: {
    purchasePattern: string[];
    productCategories: string[];
    priceRange: { min: number; max: number };
  };
  demographic?: {
    ageRange: { min: number; max: number };
    location: string[];
    gender: string[];
  };
}

interface RFMAnalysis {
  customerId: string;
  recency: number;
  frequency: number;
  monetary: number;
  rfmScore: string;
  segment: string;
  calculatedAt: Date;
}

interface BehavioralPattern {
  customerId: string;
  patterns: {
    purchaseFrequency: number;
    averageOrderValue: number;
    preferredCategories: string[];
    preferredTime: string;
    preferredDay: string;
  };
  cluster: number;
  confidence: number;
  analyzedAt: Date;
}

interface SegmentationResult {
  totalCustomers: number;
  segments: Array<{
    segment: string;
    count: number;
    percentage: number;
    averageLTV: number;
    characteristics: string[];
  }>;
  accuracy: number;
  generatedAt: Date;
}

@Injectable()
export class CustomerSegmentationService {
  private readonly logger = new Logger(CustomerSegmentationService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async createCustomerSegment(segment: Omit<CustomerSegment, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomerSegment> {
    const segmentId = `segment-${Date.now()}`;
    
    const newSegment: CustomerSegment = {
      id: segmentId,
      ...segment,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveCustomerSegment(newSegment);
    
    this.logger.log(`Created customer segment: ${segmentId}`);
    return newSegment;
  }

  async getCustomerSegments(): Promise<CustomerSegment[]> {
    const result = await this.db.execute(`
      SELECT * FROM customer_segments
      ORDER BY created_at DESC
    `);
    
    return result.rows.map(row => ({
      ...row,
      criteria: JSON.parse(row.criteria || '{}'),
      characteristics: JSON.parse(row.characteristics || '[]')
    }));
  }

  async performRFMAnalysis(): Promise<RFMAnalysis[]> {
    this.logger.log('Performing RFM analysis');
    
    const customers = await this.getAllCustomers();
    const rfmResults: RFMAnalysis[] = [];
    
    for (const customer of customers) {
      const orders = await this.getCustomerOrders(customer.id);
      
      if (orders.length === 0) continue;
      
      const rfm = this.calculateRFM(orders);
      const rfmScore = this.calculateRFMScore(rfm);
      const segment = this.determineRFMSegment(rfmScore);
      
      const rfmAnalysis: RFMAnalysis = {
        customerId: customer.id,
        recency: rfm.recency,
        frequency: rfm.frequency,
        monetary: rfm.monetary,
        rfmScore,
        segment,
        calculatedAt: new Date()
      };
      
      rfmResults.push(rfmAnalysis);
      await this.saveRFMAnalysis(rfmAnalysis);
    }
    
    this.logger.log(`RFM analysis completed for ${rfmResults.length} customers`);
    return rfmResults;
  }

  async performBehavioralSegmentation(): Promise<BehavioralPattern[]> {
    this.logger.log('Performing behavioral segmentation');
    
    const customers = await this.getAllCustomers();
    const behavioralData = [];
    
    for (const customer of customers) {
      const orders = await this.getCustomerOrders(customer.id);
      const patterns = this.analyzeBehavioralPatterns(orders);
      
      const behavioralPattern: BehavioralPattern = {
        customerId: customer.id,
        patterns,
        cluster: this.performKMeansClustering(patterns),
        confidence: this.calculateClusteringConfidence(patterns),
        analyzedAt: new Date()
      };
      
      behavioralData.push(behavioralPattern);
      await this.saveBehavioralPattern(behavioralPattern);
    }
    
    this.logger.log(`Behavioral segmentation completed for ${behavioralData.length} customers`);
    return behavioralData;
  }

  async performKMeansSegmentation(k: number = 5): Promise<SegmentationResult> {
    this.logger.log(`Performing K-means segmentation with k=${k}`);
    
    const customers = await this.getAllCustomers();
    const features = await this.extractCustomerFeatures(customers);
    
    const clusters = this.performKMeansClustering(features, k);
    const segments = this.analyzeClusters(clusters, customers);
    
    const result: SegmentationResult = {
      totalCustomers: customers.length,
      segments,
      accuracy: this.calculateSegmentationAccuracy(clusters),
      generatedAt: new Date()
    };
    
    await this.saveSegmentationResult(result);
    
    this.logger.log(`K-means segmentation completed: ${segments.length} segments`);
    return result;
  }

  async getSegmentationAnalytics(): Promise<{
    totalSegments: number;
    totalCustomers: number;
    segmentDistribution: Array<{
      segment: string;
      count: number;
      percentage: number;
    }>;
    averageLTV: number;
    topSegments: Array<{
      segment: string;
      averageLTV: number;
      customerCount: number;
    }>;
  }> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(DISTINCT s.id) as total_segments,
        COUNT(DISTINCT csa.customer_id) as total_customers
      FROM customer_segments s
      LEFT JOIN customer_segment_assignments csa ON s.id = csa.segment_id
    `);
    
    const stats = result.rows[0];
    
    const distributionResult = await this.db.execute(`
      SELECT 
        s.name as segment,
        COUNT(csa.customer_id) as count,
        AVG(cl.ltv) as avg_ltv
      FROM customer_segments s
      LEFT JOIN customer_segment_assignments csa ON s.id = csa.segment_id
      LEFT JOIN customer_ltv cl ON csa.customer_id = cl.customer_id
      GROUP BY s.id, s.name
      ORDER BY count DESC
    `);
    
    const totalCustomers = parseInt(stats.total_customers) || 0;
    
    const segmentDistribution = distributionResult.rows.map(row => ({
      segment: row.segment,
      count: parseInt(row.count) || 0,
      percentage: totalCustomers > 0 ? (parseInt(row.count) / totalCustomers) * 100 : 0
    }));
    
    const averageLTV = distributionResult.rows.reduce((sum, row) => sum + parseFloat(row.avg_ltv || 0), 0) / distributionResult.rows.length;
    
    const topSegments = distributionResult.rows.slice(0, 5).map(row => ({
      segment: row.segment,
      averageLTV: parseFloat(row.avg_ltv) || 0,
      customerCount: parseInt(row.count) || 0
    }));
    
    return {
      totalSegments: parseInt(stats.total_segments) || 0,
      totalCustomers,
      segmentDistribution,
      averageLTV,
      topSegments
    };
  }

  private calculateRFM(orders: any[]): { recency: number; frequency: number; monetary: number } {
    const now = new Date();
    const lastOrderDate = new Date(orders[orders.length - 1].created_at);
    const recency = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const frequency = orders.length;
    const monetary = orders.reduce((sum, order) => sum + order.total_amount, 0);
    
    return { recency, frequency, monetary };
  }

  private calculateRFMScore(rfm: { recency: number; frequency: number; monetary: number }): string {
    const recencyScore = this.getRecencyScore(rfm.recency);
    const frequencyScore = this.getFrequencyScore(rfm.frequency);
    const monetaryScore = this.getMonetaryScore(rfm.monetary);
    
    return `${recencyScore}${frequencyScore}${monetaryScore}`;
  }

  private getRecencyScore(recency: number): number {
    if (recency <= 30) return 5;
    if (recency <= 60) return 4;
    if (recency <= 90) return 3;
    if (recency <= 180) return 2;
    return 1;
  }

  private getFrequencyScore(frequency: number): number {
    if (frequency >= 20) return 5;
    if (frequency >= 15) return 4;
    if (frequency >= 10) return 3;
    if (frequency >= 5) return 2;
    return 1;
  }

  private getMonetaryScore(monetary: number): number {
    if (monetary >= 5000) return 5;
    if (monetary >= 3000) return 4;
    if (monetary >= 1500) return 3;
    if (monetary >= 500) return 2;
    return 1;
  }

  private determineRFMSegment(rfmScore: string): string {
    const score = parseInt(rfmScore);
    
    if (score >= 444) return 'Champions';
    if (score >= 433) return 'Loyal Customers';
    if (score >= 422) return 'Potential Loyalists';
    if (score >= 411) return 'New Customers';
    if (score >= 333) return 'Promising';
    if (score >= 322) return 'Need Attention';
    if (score >= 311) return 'About to Sleep';
    if (score >= 222) return 'At Risk';
    if (score >= 211) return 'Cannot Lose Them';
    if (score >= 111) return 'Hibernating';
    
    return 'Lost';
  }

  private analyzeBehavioralPatterns(orders: any[]): {
    purchaseFrequency: number;
    averageOrderValue: number;
    preferredCategories: string[];
    preferredTime: string;
    preferredDay: string;
  } {
    const purchaseFrequency = orders.length / 12; // Monthly frequency
    const averageOrderValue = orders.reduce((sum, order) => sum + order.total_amount, 0) / orders.length;
    
    const categories = orders.flatMap(order => order.items?.map((item: any) => item.category) || []);
    const categoryCounts = categories.reduce((acc, category) => {
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const preferredCategories = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
    
    const timeCounts = orders.reduce((acc, order) => {
      const hour = new Date(order.created_at).getHours();
      const timeSlot = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      acc[timeSlot] = (acc[timeSlot] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const preferredTime = Object.entries(timeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'morning';
    
    const dayCounts = orders.reduce((acc, order) => {
      const day = new Date(order.created_at).toLocaleDateString('en-US', { weekday: 'long' });
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const preferredDay = Object.entries(dayCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Monday';
    
    return {
      purchaseFrequency,
      averageOrderValue,
      preferredCategories,
      preferredTime,
      preferredDay
    };
  }

  private performKMeansClustering(features: any[], k: number = 5): any[] {
    // Mock K-means implementation
    const normalizedFeatures = this.normalizeFeatures(features);
    
    // Simple clustering based on feature similarity
    const cluster = Math.floor(Math.random() * k);
    return cluster;
  }

  private calculateClusteringConfidence(patterns: any): number {
    // Mock confidence calculation
    const featureCount = Object.keys(patterns).length;
    return Math.min(0.9, 0.5 + (featureCount * 0.1));
  }

  private async extractCustomerFeatures(customers: any[]): Promise<any[]> {
    const features = [];
    
    for (const customer of customers) {
      const orders = await this.getCustomerOrders(customer.id);
      const patterns = this.analyzeBehavioralPatterns(orders);
      
      features.push({
        customerId: customer.id,
        purchaseFrequency: patterns.purchaseFrequency,
        averageOrderValue: patterns.averageOrderValue,
        categoryDiversity: patterns.preferredCategories.length,
        timeConsistency: patterns.preferredTime,
        dayConsistency: patterns.preferredDay
      });
    }
    
    return features;
  }


  private analyzeClusters(clusters: any[], customers: any[]): Array<{
    segment: string;
    count: number;
    percentage: number;
    averageLTV: number;
    characteristics: string[];
  }> {
    const segmentMap = new Map<number, any[]>();
    
    clusters.forEach(cluster => {
      if (!segmentMap.has(cluster.cluster)) {
        segmentMap.set(cluster.cluster, []);
      }
      segmentMap.get(cluster.cluster).push(cluster);
    });
    
    const segments = [];
    let totalCustomers = customers.length;
    
    segmentMap.forEach((clusterCustomers, clusterId) => {
      const count = clusterCustomers.length;
      const percentage = (count / totalCustomers) * 100;
      
      // Mock LTV calculation
      const averageLTV = Math.random() * 1000 + 500;
      
      const characteristics = this.generateSegmentCharacteristics(clusterId, clusterCustomers);
      
      segments.push({
        segment: `Cluster ${clusterId + 1}`,
        count,
        percentage,
        averageLTV,
        characteristics
      });
    });
    
    return segments;
  }

  private generateSegmentCharacteristics(clusterId: number, customers: any[]): string[] {
    const characteristics = [
      'High purchase frequency',
      'Premium product preference',
      'Weekend shoppers',
      'Mobile users',
      'Social media influenced'
    ];
    
    return characteristics.slice(0, Math.floor(Math.random() * 3) + 2);
  }

  private calculateSegmentationAccuracy(clusters: any[]): number {
    // Mock accuracy calculation
    return Math.random() * 0.3 + 0.7; // 70-100% accuracy
  }

  private normalizeFeatures(features: any[]): any[] {
    // Mock feature normalization
    return features.map(feature => feature);
  }

  private async getAllCustomers(): Promise<any[]> {
    const result = await this.db.execute(`
      SELECT * FROM customers
    `);
    
    return result.rows;
  }

  private async getCustomerOrders(customerId: string): Promise<any[]> {
    const result = await this.db.execute(`
      SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at ASC
    `, [customerId]);
    
    return result.rows;
  }

  private async saveCustomerSegment(segment: CustomerSegment): Promise<void> {
    await this.db.execute(`
      INSERT INTO customer_segments (id, name, description, criteria, customer_count, average_ltv, characteristics, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      segment.id,
      segment.name,
      segment.description,
      JSON.stringify(segment.criteria),
      segment.customerCount,
      segment.averageLTV,
      JSON.stringify(segment.characteristics),
      segment.createdAt,
      segment.updatedAt
    ]);
  }

  private async saveRFMAnalysis(analysis: RFMAnalysis): Promise<void> {
    await this.db.execute(`
      INSERT INTO rfm_analysis (customer_id, recency, frequency, monetary, rfm_score, segment, calculated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (customer_id) DO UPDATE SET
        recency = EXCLUDED.recency,
        frequency = EXCLUDED.frequency,
        monetary = EXCLUDED.monetary,
        rfm_score = EXCLUDED.rfm_score,
        segment = EXCLUDED.segment,
        calculated_at = EXCLUDED.calculated_at
    `, [
      analysis.customerId,
      analysis.recency,
      analysis.frequency,
      analysis.monetary,
      analysis.rfmScore,
      analysis.segment,
      analysis.calculatedAt
    ]);
  }

  private async saveBehavioralPattern(pattern: BehavioralPattern): Promise<void> {
    await this.db.execute(`
      INSERT INTO behavioral_patterns (customer_id, patterns, cluster, confidence, analyzed_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (customer_id) DO UPDATE SET
        patterns = EXCLUDED.patterns,
        cluster = EXCLUDED.cluster,
        confidence = EXCLUDED.confidence,
        analyzed_at = EXCLUDED.analyzed_at
    `, [
      pattern.customerId,
      JSON.stringify(pattern.patterns),
      pattern.cluster,
      pattern.confidence,
      pattern.analyzedAt
    ]);
  }

  private async saveSegmentationResult(result: SegmentationResult): Promise<void> {
    await this.db.execute(`
      INSERT INTO segmentation_results (total_customers, segments, accuracy, generated_at)
      VALUES ($1, $2, $3, $4)
    `, [
      result.totalCustomers,
      JSON.stringify(result.segments),
      result.accuracy,
      result.generatedAt
    ]);
  }
}