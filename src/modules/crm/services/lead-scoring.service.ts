import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface LeadScoringRule {
  id: string;
  name: string;
  description: string;
  conditions: LeadScoringCondition[];
  score: number;
  weight: number;
  isActive: boolean;
  category: 'demographic' | 'behavioral' | 'engagement' | 'company' | 'custom';
  createdAt: Date;
  updatedAt: Date;
}

interface LeadScoringCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in' | 'exists' | 'not_exists';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

interface LeadScore {
  id: string;
  leadId: string;
  totalScore: number;
  categoryScores: Record<string, number>;
  ruleScores: Array<{
    ruleId: string;
    ruleName: string;
    score: number;
    weight: number;
  }>;
  lastCalculated: Date;
  previousScore?: number;
  scoreChange?: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface LeadScoringModel {
  id: string;
  name: string;
  description: string;
  rules: string[];
  weights: Record<string, number>;
  thresholds: {
    hot: number;
    warm: number;
    cold: number;
  };
  isActive: boolean;
  accuracy: number;
  createdAt: Date;
  updatedAt: Date;
}

interface LeadBehavior {
  id: string;
  leadId: string;
  action: string;
  value: number;
  timestamp: Date;
  metadata: Record<string, any>;
}

interface ScoringInsight {
  category: string;
  insight: string;
  impact: 'positive' | 'negative' | 'neutral';
  recommendation: string;
  confidence: number;
}

@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async createScoringRule(rule: Omit<LeadScoringRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeadScoringRule> {
    const ruleId = `rule-${Date.now()}`;
    
    const newRule: LeadScoringRule = {
      id: ruleId,
      ...rule,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveScoringRule(newRule);
    
    this.logger.log(`Created scoring rule: ${ruleId}`);
    return newRule;
  }

  async getScoringRules(category?: string, isActive?: boolean): Promise<LeadScoringRule[]> {
    let query = 'SELECT * FROM lead_scoring_rules';
    const params = [];
    
    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }
    
    if (isActive !== undefined) {
      query += category ? ' AND is_active = $2' : ' WHERE is_active = $1';
      params.push(isActive);
    }
    
    query += ' ORDER BY weight DESC, created_at DESC';
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      conditions: JSON.parse(row.conditions || '[]')
    }));
  }

  async updateScoringRule(ruleId: string, updates: Partial<LeadScoringRule>): Promise<LeadScoringRule> {
    const existing = await this.getScoringRule(ruleId);
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    
    await this.saveScoringRule(updated);
    
    this.logger.log(`Updated scoring rule: ${ruleId}`);
    return updated;
  }

  async deleteScoringRule(ruleId: string): Promise<void> {
    await this.db.execute(`
      DELETE FROM lead_scoring_rules WHERE id = $1
    `, [ruleId]);
    
    this.logger.log(`Deleted scoring rule: ${ruleId}`);
  }

  async calculateLeadScore(leadId: string, forceRecalculate: boolean = false): Promise<LeadScore> {
    const existingScore = await this.getLeadScore(leadId);
    
    if (existingScore && !forceRecalculate) {
      return existingScore;
    }
    
    const lead = await this.getLead(leadId);
    const rules = await this.getActiveScoringRules();
    const behaviors = await this.getLeadBehaviors(leadId);
    
    const categoryScores: Record<string, number> = {};
    const ruleScores: Array<{
      ruleId: string;
      ruleName: string;
      score: number;
      weight: number;
    }> = [];
    
    let totalScore = 0;
    
    for (const rule of rules) {
      const ruleScore = this.evaluateRule(rule, lead, behaviors);
      const weightedScore = ruleScore * rule.weight;
      
      totalScore += weightedScore;
      
      if (!categoryScores[rule.category]) {
        categoryScores[rule.category] = 0;
      }
      categoryScores[rule.category] += weightedScore;
      
      ruleScores.push({
        ruleId: rule.id,
        ruleName: rule.name,
        score: ruleScore,
        weight: rule.weight
      });
    }
    
    const previousScore = existingScore?.totalScore || 0;
    const scoreChange = totalScore - previousScore;
    const trend = this.determineTrend(scoreChange);
    
    const leadScore: LeadScore = {
      id: `score-${Date.now()}`,
      leadId,
      totalScore,
      categoryScores,
      ruleScores,
      lastCalculated: new Date(),
      previousScore,
      scoreChange,
      trend
    };
    
    await this.saveLeadScore(leadScore);
    
    this.logger.log(`Calculated lead score for ${leadId}: ${totalScore}`);
    return leadScore;
  }

  async getLeadScore(leadId: string): Promise<LeadScore | null> {
    const result = await this.db.execute(`
      SELECT * FROM lead_scores
      WHERE lead_id = $1
      ORDER BY last_calculated DESC
      LIMIT 1
    `, [leadId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      ...row,
      categoryScores: JSON.parse(row.category_scores || '{}'),
      ruleScores: JSON.parse(row.rule_scores || '[]')
    };
  }

  async getLeadScores(filters?: {
    minScore?: number;
    maxScore?: number;
    category?: string;
    trend?: string;
  }): Promise<LeadScore[]> {
    let query = 'SELECT * FROM lead_scores WHERE 1=1';
    const params = [];
    
    if (filters?.minScore !== undefined) {
      query += ' AND total_score >= $' + (params.length + 1);
      params.push(filters.minScore);
    }
    
    if (filters?.maxScore !== undefined) {
      query += ' AND total_score <= $' + (params.length + 1);
      params.push(filters.maxScore);
    }
    
    if (filters?.trend) {
      query += ' AND trend = $' + (params.length + 1);
      params.push(filters.trend);
    }
    
    query += ' ORDER BY total_score DESC, last_calculated DESC';
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      categoryScores: JSON.parse(row.category_scores || '{}'),
      ruleScores: JSON.parse(row.rule_scores || '[]')
    }));
  }

  async createScoringModel(model: Omit<LeadScoringModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<LeadScoringModel> {
    const modelId = `model-${Date.now()}`;
    
    const newModel: LeadScoringModel = {
      id: modelId,
      ...model,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveScoringModel(newModel);
    
    this.logger.log(`Created scoring model: ${modelId}`);
    return newModel;
  }

  async getScoringModels(): Promise<LeadScoringModel[]> {
    const result = await this.db.execute(`
      SELECT * FROM lead_scoring_models
      ORDER BY created_at DESC
    `);
    
    return result.rows.map(row => ({
      ...row,
      rules: JSON.parse(row.rules || '[]'),
      weights: JSON.parse(row.weights || '{}'),
      thresholds: JSON.parse(row.thresholds || '{}')
    }));
  }

  async trainScoringModel(modelId: string, trainingData: any[]): Promise<{
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  }> {
    // Mock model training - in real implementation, this would use ML algorithms
    this.logger.log(`Training scoring model: ${modelId}`);
    
    // Simulate training process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const metrics = {
      accuracy: 0.85,
      precision: 0.82,
      recall: 0.88,
      f1Score: 0.85
    };
    
    // Update model accuracy
    await this.updateScoringModel(modelId, { accuracy: metrics.accuracy });
    
    this.logger.log(`Model training completed: ${modelId} - Accuracy: ${metrics.accuracy}`);
    return metrics;
  }

  async getScoringInsights(leadId: string): Promise<ScoringInsight[]> {
    const score = await this.getLeadScore(leadId);
    if (!score) {
      return [];
    }
    
    const insights: ScoringInsight[] = [];
    
    // Analyze category scores
    for (const [category, categoryScore] of Object.entries(score.categoryScores)) {
      if (categoryScore > 50) {
        insights.push({
          category,
          insight: `Strong performance in ${category} category`,
          impact: 'positive',
          recommendation: 'Continue current engagement strategy',
          confidence: 0.8
        });
      } else if (categoryScore < 20) {
        insights.push({
          category,
          insight: `Weak performance in ${category} category`,
          impact: 'negative',
          recommendation: 'Focus on improving this area',
          confidence: 0.7
        });
      }
    }
    
    // Analyze trend
    if (score.trend === 'increasing') {
      insights.push({
        category: 'trend',
        insight: 'Lead score is increasing',
        impact: 'positive',
        recommendation: 'Maintain current approach',
        confidence: 0.9
      });
    } else if (score.trend === 'decreasing') {
      insights.push({
        category: 'trend',
        insight: 'Lead score is decreasing',
        impact: 'negative',
        recommendation: 'Review engagement strategy',
        confidence: 0.8
      });
    }
    
    return insights;
  }

  async getScoringAnalytics(): Promise<{
    totalLeads: number;
    averageScore: number;
    scoreDistribution: Record<string, number>;
    topScoringCategories: Array<{ category: string; averageScore: number }>;
    conversionRate: number;
  }> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(*) as total_leads,
        AVG(total_score) as avg_score,
        (SUM(CASE WHEN total_score >= 70 THEN 1 ELSE 0 END)::float / COUNT(*)) * 100 as conversion_rate
      FROM lead_scores
    `);
    
    const stats = result.rows[0];
    
    // Get score distribution
    const distributionResult = await this.db.execute(`
      SELECT 
        CASE 
          WHEN total_score >= 80 THEN 'hot'
          WHEN total_score >= 50 THEN 'warm'
          ELSE 'cold'
        END as score_range,
        COUNT(*) as count
      FROM lead_scores
      GROUP BY score_range
    `);
    
    const scoreDistribution: Record<string, number> = {};
    distributionResult.rows.forEach(row => {
      scoreDistribution[row.score_range] = parseInt(row.count) || 0;
    });
    
    // Get top scoring categories
    const categoryResult = await this.db.execute(`
      SELECT 
        key as category,
        AVG(value::float) as avg_score
      FROM lead_scores,
      LATERAL jsonb_each(category_scores)
      GROUP BY key
      ORDER BY avg_score DESC
      LIMIT 5
    `);
    
    const topScoringCategories = categoryResult.rows.map(row => ({
      category: row.category,
      averageScore: parseFloat(row.avg_score) || 0
    }));
    
    return {
      totalLeads: parseInt(stats.total_leads) || 0,
      averageScore: parseFloat(stats.avg_score) || 0,
      scoreDistribution,
      topScoringCategories,
      conversionRate: parseFloat(stats.conversion_rate) || 0
    };
  }

  private async getActiveScoringRules(): Promise<LeadScoringRule[]> {
    const result = await this.db.execute(`
      SELECT * FROM lead_scoring_rules
      WHERE is_active = true
      ORDER BY weight DESC
    `);
    
    return result.rows.map(row => ({
      ...row,
      conditions: JSON.parse(row.conditions || '[]')
    }));
  }

  private async getLead(leadId: string): Promise<any> {
    const result = await this.db.execute(`
      SELECT * FROM leads WHERE id = $1
    `, [leadId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Lead not found: ${leadId}`);
    }
    
    return result.rows[0];
  }

  private async getLeadBehaviors(leadId: string): Promise<LeadBehavior[]> {
    const result = await this.db.execute(`
      SELECT * FROM lead_behaviors
      WHERE lead_id = $1
      ORDER BY timestamp DESC
    `, [leadId]);
    
    return result.rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  private evaluateRule(rule: LeadScoringRule, lead: any, behaviors: LeadBehavior[]): number {
    if (rule.conditions.length === 0) {
      return rule.score;
    }
    
    let result = true;
    let logicalOperator = 'AND';
    
    for (const condition of rule.conditions) {
      const conditionResult = this.evaluateCondition(condition, lead, behaviors);
      
      if (logicalOperator === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }
      
      logicalOperator = condition.logicalOperator || 'AND';
    }
    
    return result ? rule.score : 0;
  }

  private evaluateCondition(condition: LeadScoringCondition, lead: any, behaviors: LeadBehavior[]): boolean {
    let value = this.getFieldValue(condition.field, lead, behaviors);
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'greater_than':
        return value > condition.value;
      case 'less_than':
        return value < condition.value;
      case 'contains':
        return String(value).includes(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'exists':
        return value !== undefined && value !== null;
      case 'not_exists':
        return value === undefined || value === null;
      default:
        return false;
    }
  }

  private getFieldValue(field: string, lead: any, behaviors: LeadBehavior[]): any {
    if (field.startsWith('behavior.')) {
      const behaviorField = field.substring(9);
      const recentBehavior = behaviors.find(b => b.action === behaviorField);
      return recentBehavior?.value || 0;
    }
    
    return field.split('.').reduce((obj, key) => obj?.[key], lead);
  }

  private determineTrend(scoreChange: number): 'increasing' | 'decreasing' | 'stable' {
    if (scoreChange > 5) return 'increasing';
    if (scoreChange < -5) return 'decreasing';
    return 'stable';
  }

  private async saveScoringRule(rule: LeadScoringRule): Promise<void> {
    await this.db.execute(`
      INSERT INTO lead_scoring_rules (id, name, description, conditions, score, weight, is_active, category, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        conditions = EXCLUDED.conditions,
        score = EXCLUDED.score,
        weight = EXCLUDED.weight,
        is_active = EXCLUDED.is_active,
        category = EXCLUDED.category,
        updated_at = EXCLUDED.updated_at
    `, [
      rule.id,
      rule.name,
      rule.description,
      JSON.stringify(rule.conditions),
      rule.score,
      rule.weight,
      rule.isActive,
      rule.category,
      rule.createdAt,
      rule.updatedAt
    ]);
  }

  private async getScoringRule(ruleId: string): Promise<LeadScoringRule> {
    const result = await this.db.execute(`
      SELECT * FROM lead_scoring_rules WHERE id = $1
    `, [ruleId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Scoring rule not found: ${ruleId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      conditions: JSON.parse(row.conditions || '[]')
    };
  }

  private async saveLeadScore(score: LeadScore): Promise<void> {
    await this.db.execute(`
      INSERT INTO lead_scores (id, lead_id, total_score, category_scores, rule_scores, last_calculated, previous_score, score_change, trend)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (lead_id) DO UPDATE SET
        total_score = EXCLUDED.total_score,
        category_scores = EXCLUDED.category_scores,
        rule_scores = EXCLUDED.rule_scores,
        last_calculated = EXCLUDED.last_calculated,
        previous_score = EXCLUDED.previous_score,
        score_change = EXCLUDED.score_change,
        trend = EXCLUDED.trend
    `, [
      score.id,
      score.leadId,
      score.totalScore,
      JSON.stringify(score.categoryScores),
      JSON.stringify(score.ruleScores),
      score.lastCalculated,
      score.previousScore,
      score.scoreChange,
      score.trend
    ]);
  }

  private async saveScoringModel(model: LeadScoringModel): Promise<void> {
    await this.db.execute(`
      INSERT INTO lead_scoring_models (id, name, description, rules, weights, thresholds, is_active, accuracy, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      model.id,
      model.name,
      model.description,
      JSON.stringify(model.rules),
      JSON.stringify(model.weights),
      JSON.stringify(model.thresholds),
      model.isActive,
      model.accuracy,
      model.createdAt,
      model.updatedAt
    ]);
  }

  private async updateScoringModel(modelId: string, updates: Partial<LeadScoringModel>): Promise<void> {
    await this.db.execute(`
      UPDATE lead_scoring_models SET
        accuracy = $2,
        updated_at = $3
      WHERE id = $1
    `, [modelId, updates.accuracy, new Date()]);
  }
}
