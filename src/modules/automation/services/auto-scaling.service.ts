import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface ScalingRule {
  id: string;
  name: string;
  resource: 'cpu' | 'memory' | 'database' | 'cache' | 'storage';
  metric: string;
  threshold: number;
  operator: 'greater_than' | 'less_than' | 'equals';
  action: 'scale_up' | 'scale_down' | 'maintain';
  scaleFactor: number;
  minInstances: number;
  maxInstances: number;
  cooldownPeriod: number;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

interface ScalingEvent {
  id: string;
  ruleId: string;
  resource: string;
  metric: string;
  value: number;
  threshold: number;
  action: string;
  instancesBefore: number;
  instancesAfter: number;
  timestamp: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
}

interface ResourceMetrics {
  cpu: {
    usage: number;
    load: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    connections: number;
    maxConnections: number;
    queryTime: number;
    slowQueries: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    memoryUsage: number;
    evictions: number;
  };
  storage: {
    used: number;
    total: number;
    iops: number;
    latency: number;
  };
}

interface ScalingRecommendation {
  resource: string;
  currentValue: number;
  threshold: number;
  recommendation: 'scale_up' | 'scale_down' | 'maintain';
  confidence: number;
  estimatedCost: number;
  estimatedPerformance: number;
}

@Injectable()
export class AutoScalingService {
  private readonly logger = new Logger(AutoScalingService.name);
  private scalingInProgress = new Set<string>();

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async createScalingRule(rule: Omit<ScalingRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScalingRule> {
    const ruleId = `rule-${Date.now()}`;
    
    const newRule: ScalingRule = {
      id: ruleId,
      ...rule,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveScalingRule(newRule);
    
    this.logger.log(`Created scaling rule: ${ruleId}`);
    return newRule;
  }

  async getScalingRules(resource?: string): Promise<ScalingRule[]> {
    const result = await this.db.execute(`
      SELECT * FROM scaling_rules
      ${resource ? 'WHERE resource = $1' : ''}
      ORDER BY priority DESC, created_at DESC
    `, resource ? [resource] : []);
    
    return result.rows;
  }

  async updateScalingRule(ruleId: string, updates: Partial<ScalingRule>): Promise<ScalingRule> {
    const existing = await this.getScalingRule(ruleId);
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    
    await this.saveScalingRule(updated);
    
    this.logger.log(`Updated scaling rule: ${ruleId}`);
    return updated;
  }

  async deleteScalingRule(ruleId: string): Promise<void> {
    await this.db.execute(`
      DELETE FROM scaling_rules WHERE id = $1
    `, [ruleId]);
    
    this.logger.log(`Deleted scaling rule: ${ruleId}`);
  }

  async checkScalingConditions(): Promise<void> {
    const rules = await this.getActiveScalingRules();
    const metrics = await this.getResourceMetrics();
    
    for (const rule of rules) {
      if (this.shouldScale(rule, metrics)) {
        await this.executeScaling(rule, metrics);
      }
    }
  }

  async executeScaling(rule: ScalingRule, metrics: ResourceMetrics): Promise<void> {
    if (this.scalingInProgress.has(rule.id)) {
      this.logger.warn(`Scaling already in progress for rule ${rule.id}`);
      return;
    }
    
    this.scalingInProgress.add(rule.id);
    
    try {
      const currentInstances = await this.getCurrentInstances(rule.resource);
      const targetInstances = this.calculateTargetInstances(rule, currentInstances);
      
      if (targetInstances === currentInstances) {
        this.logger.log(`No scaling needed for rule ${rule.id}`);
        return;
      }
      
      const scalingEvent = await this.createScalingEvent(rule, metrics, currentInstances, targetInstances);
      
      await this.performScaling(rule, currentInstances, targetInstances);
      
      scalingEvent.status = 'completed';
      scalingEvent.instancesAfter = targetInstances;
      await this.updateScalingEvent(scalingEvent);
      
      this.logger.log(`Scaling completed for rule ${rule.id}: ${currentInstances} -> ${targetInstances} instances`);
    } catch (error) {
      this.logger.error(`Scaling failed for rule ${rule.id}:`, error);
      await this.handleScalingError(rule, error);
    } finally {
      this.scalingInProgress.delete(rule.id);
    }
  }

  async getScalingHistory(resource?: string, limit: number = 100): Promise<ScalingEvent[]> {
    const result = await this.db.execute(`
      SELECT * FROM scaling_events
      ${resource ? 'WHERE resource = $1' : ''}
      ORDER BY timestamp DESC
      LIMIT $2
    `, resource ? [resource, limit] : [limit]);
    
    return result.rows;
  }

  async getScalingAnalytics(): Promise<{
    totalScalingEvents: number;
    successfulScalingEvents: number;
    failedScalingEvents: number;
    averageScalingTime: number;
    costSavings: number;
    performanceImprovement: number;
  }> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(*) as total_events,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_events,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_events,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_scaling_time
      FROM scaling_events
      WHERE timestamp >= NOW() - INTERVAL '30 days'
    `);
    
    const stats = result.rows[0];
    const totalEvents = parseInt(stats.total_events) || 0;
    const successfulEvents = parseInt(stats.successful_events) || 0;
    const failedEvents = parseInt(stats.failed_events) || 0;
    const averageScalingTime = parseFloat(stats.avg_scaling_time) || 0;
    
    return {
      totalScalingEvents: totalEvents,
      successfulScalingEvents: successfulEvents,
      failedScalingEvents: failedEvents,
      averageScalingTime,
      costSavings: this.calculateCostSavings(),
      performanceImprovement: this.calculatePerformanceImprovement()
    };
  }

  async getScalingRecommendations(): Promise<ScalingRecommendation[]> {
    const metrics = await this.getResourceMetrics();
    const rules = await this.getActiveScalingRules();
    const recommendations: ScalingRecommendation[] = [];
    
    for (const rule of rules) {
      const currentValue = this.getMetricValue(rule.metric, metrics);
      const recommendation = this.generateRecommendation(rule, currentValue, metrics);
      
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }
    
    return recommendations;
  }

  async optimizeScalingRules(): Promise<void> {
    const analytics = await this.getScalingAnalytics();
    const recommendations = await this.getScalingRecommendations();
    
    for (const recommendation of recommendations) {
      if (recommendation.confidence > 0.8) {
        await this.optimizeRuleForResource(recommendation.resource, recommendation);
      }
    }
  }

  private async getActiveScalingRules(): Promise<ScalingRule[]> {
    const result = await this.db.execute(`
      SELECT * FROM scaling_rules
      WHERE status = 'active'
      ORDER BY priority DESC
    `);
    
    return result.rows;
  }

  private async getResourceMetrics(): Promise<ResourceMetrics> {
    // Mock metrics - in real implementation, this would fetch from monitoring system
    return {
      cpu: {
        usage: 75,
        load: 2.5,
        cores: 4
      },
      memory: {
        used: 6 * 1024 * 1024 * 1024, // 6GB
        total: 8 * 1024 * 1024 * 1024, // 8GB
        percentage: 75
      },
      database: {
        connections: 45,
        maxConnections: 100,
        queryTime: 150,
        slowQueries: 5
      },
      cache: {
        hitRate: 0.85,
        missRate: 0.15,
        memoryUsage: 512 * 1024 * 1024, // 512MB
        evictions: 10
      },
      storage: {
        used: 500 * 1024 * 1024 * 1024, // 500GB
        total: 1000 * 1024 * 1024 * 1024, // 1TB
        iops: 1000,
        latency: 5
      }
    };
  }

  private shouldScale(rule: ScalingRule, metrics: ResourceMetrics): boolean {
    const currentValue = this.getMetricValue(rule.metric, metrics);
    
    switch (rule.operator) {
      case 'greater_than':
        return currentValue > rule.threshold;
      case 'less_than':
        return currentValue < rule.threshold;
      case 'equals':
        return currentValue === rule.threshold;
      default:
        return false;
    }
  }

  private getMetricValue(metric: string, metrics: ResourceMetrics): number {
    const parts = metric.split('.');
    let value = metrics as any;
    
    for (const part of parts) {
      value = value[part];
    }
    
    return value || 0;
  }

  private calculateTargetInstances(rule: ScalingRule, currentInstances: number): number {
    let targetInstances = currentInstances;
    
    switch (rule.action) {
      case 'scale_up':
        targetInstances = Math.ceil(currentInstances * rule.scaleFactor);
        break;
      case 'scale_down':
        targetInstances = Math.floor(currentInstances / rule.scaleFactor);
        break;
      case 'maintain':
        targetInstances = currentInstances;
        break;
    }
    
    // Apply min/max constraints
    targetInstances = Math.max(rule.minInstances, targetInstances);
    targetInstances = Math.min(rule.maxInstances, targetInstances);
    
    return targetInstances;
  }

  private async getCurrentInstances(resource: string): Promise<number> {
    // Mock implementation - in real scenario, this would query the actual infrastructure
    const mockInstances = {
      cpu: 4,
      memory: 2,
      database: 1,
      cache: 3,
      storage: 1
    };
    
    return mockInstances[resource] || 1;
  }

  private async createScalingEvent(rule: ScalingRule, metrics: ResourceMetrics, currentInstances: number, targetInstances: number): Promise<ScalingEvent> {
    const eventId = `event-${Date.now()}`;
    const currentValue = this.getMetricValue(rule.metric, metrics);
    
    const event: ScalingEvent = {
      id: eventId,
      ruleId: rule.id,
      resource: rule.resource,
      metric: rule.metric,
      value: currentValue,
      threshold: rule.threshold,
      action: rule.action,
      instancesBefore: currentInstances,
      instancesAfter: targetInstances,
      timestamp: new Date(),
      status: 'in_progress'
    };
    
    await this.saveScalingEvent(event);
    return event;
  }

  private async performScaling(rule: ScalingRule, currentInstances: number, targetInstances: number): Promise<void> {
    this.logger.log(`Scaling ${rule.resource} from ${currentInstances} to ${targetInstances} instances`);
    
    // Mock scaling implementation
    await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate scaling time
    
    // In real implementation, this would:
    // 1. Call Kubernetes API to scale pods
    // 2. Update load balancer configuration
    // 3. Update database connection pools
    // 4. Update cache cluster size
    // 5. Update storage allocation
  }

  private async saveScalingRule(rule: ScalingRule): Promise<void> {
    await this.db.execute(`
      INSERT INTO scaling_rules (id, name, resource, metric, threshold, operator, action, scale_factor, min_instances, max_instances, cooldown_period, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        resource = EXCLUDED.resource,
        metric = EXCLUDED.metric,
        threshold = EXCLUDED.threshold,
        operator = EXCLUDED.operator,
        action = EXCLUDED.action,
        scale_factor = EXCLUDED.scale_factor,
        min_instances = EXCLUDED.min_instances,
        max_instances = EXCLUDED.max_instances,
        cooldown_period = EXCLUDED.cooldown_period,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `, [
      rule.id,
      rule.name,
      rule.resource,
      rule.metric,
      rule.threshold,
      rule.operator,
      rule.action,
      rule.scaleFactor,
      rule.minInstances,
      rule.maxInstances,
      rule.cooldownPeriod,
      rule.status,
      rule.createdAt,
      rule.updatedAt
    ]);
  }

  private async getScalingRule(ruleId: string): Promise<ScalingRule> {
    const result = await this.db.execute(`
      SELECT * FROM scaling_rules WHERE id = $1
    `, [ruleId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Scaling rule not found: ${ruleId}`);
    }
    
    return result.rows[0];
  }

  private async saveScalingEvent(event: ScalingEvent): Promise<void> {
    await this.db.execute(`
      INSERT INTO scaling_events (id, rule_id, resource, metric, value, threshold, action, instances_before, instances_after, timestamp, status, error)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      event.id,
      event.ruleId,
      event.resource,
      event.metric,
      event.value,
      event.threshold,
      event.action,
      event.instancesBefore,
      event.instancesAfter,
      event.timestamp,
      event.status,
      event.error
    ]);
  }

  private async updateScalingEvent(event: ScalingEvent): Promise<void> {
    await this.db.execute(`
      UPDATE scaling_events SET
        status = $2,
        instances_after = $3,
        error = $4
      WHERE id = $1
    `, [
      event.id,
      event.status,
      event.instancesAfter,
      event.error
    ]);
  }

  private async handleScalingError(rule: ScalingRule, error: any): Promise<void> {
    this.logger.error(`Scaling error for rule ${rule.id}:`, error);
    
    // Log error in database
    await this.db.execute(`
      INSERT INTO scaling_events (id, rule_id, resource, metric, value, threshold, action, instances_before, instances_after, timestamp, status, error)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      `error-${Date.now()}`,
      rule.id,
      rule.resource,
      rule.metric,
      0,
      rule.threshold,
      rule.action,
      0,
      0,
      new Date(),
      'failed',
      error.message
    ]);
  }

  private generateRecommendation(rule: ScalingRule, currentValue: number, metrics: ResourceMetrics): ScalingRecommendation | null {
    let recommendation: 'scale_up' | 'scale_down' | 'maintain' = 'maintain';
    let confidence = 0.5;
    
    if (currentValue > rule.threshold * 1.2) {
      recommendation = 'scale_up';
      confidence = 0.9;
    } else if (currentValue < rule.threshold * 0.8) {
      recommendation = 'scale_down';
      confidence = 0.8;
    }
    
    if (confidence < 0.7) return null;
    
    return {
      resource: rule.resource,
      currentValue,
      threshold: rule.threshold,
      recommendation,
      confidence,
      estimatedCost: this.estimateCost(recommendation, rule),
      estimatedPerformance: this.estimatePerformance(recommendation, rule)
    };
  }

  private estimateCost(recommendation: string, rule: ScalingRule): number {
    // Mock cost estimation
    const baseCost = 100; // $100 per instance per month
    const scaleFactor = recommendation === 'scale_up' ? rule.scaleFactor : 1 / rule.scaleFactor;
    return baseCost * scaleFactor;
  }

  private estimatePerformance(recommendation: string, rule: ScalingRule): number {
    // Mock performance estimation
    const basePerformance = 100; // 100% baseline performance
    const scaleFactor = recommendation === 'scale_up' ? rule.scaleFactor : 1 / rule.scaleFactor;
    return basePerformance * scaleFactor;
  }

  private calculateCostSavings(): number {
    // Mock cost savings calculation
    return 1500; // $1500 saved per month
  }

  private calculatePerformanceImprovement(): number {
    // Mock performance improvement calculation
    return 25; // 25% performance improvement
  }

  private async optimizeRuleForResource(resource: string, recommendation: ScalingRecommendation): Promise<void> {
    this.logger.log(`Optimizing scaling rules for ${resource} based on recommendation`);
    
    // Update rule thresholds based on recommendation
    const rules = await this.getScalingRules(resource);
    for (const rule of rules) {
      if (recommendation.recommendation === 'scale_up') {
        rule.threshold = rule.threshold * 0.9; // Lower threshold for earlier scaling
      } else if (recommendation.recommendation === 'scale_down') {
        rule.threshold = rule.threshold * 1.1; // Higher threshold for later scaling
      }
      
      await this.updateScalingRule(rule.id, rule);
    }
  }
}
