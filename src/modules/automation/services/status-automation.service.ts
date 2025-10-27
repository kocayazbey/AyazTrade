import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';
import { EventBusService } from '../../../core/events/event-bus.service';

interface StatusRule {
  id: string;
  name: string;
  entity: string;
  conditions: StatusCondition[];
  actions: StatusAction[];
  priority: number;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

interface StatusCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

interface StatusAction {
  type: 'update_status' | 'send_notification' | 'trigger_workflow' | 'assign_user' | 'create_task';
  config: Record<string, any>;
  delay?: number;
}

interface StatusTransition {
  id: string;
  entity: string;
  fromStatus: string;
  toStatus: string;
  conditions: StatusCondition[];
  actions: StatusAction[];
  isAutomatic: boolean;
  requiresApproval: boolean;
  approverRole?: string;
  createdAt: Date;
}

interface StatusHistory {
  id: string;
  entityId: string;
  entity: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  reason?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class StatusAutomationService {
  private readonly logger = new Logger(StatusAutomationService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
    private readonly eventBus: EventBusService,
  ) {}

  async createStatusRule(rule: Omit<StatusRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<StatusRule> {
    const ruleId = `rule-${Date.now()}`;
    
    const newRule: StatusRule = {
      id: ruleId,
      ...rule,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveStatusRule(newRule);
    
    this.logger.log(`Created status rule: ${ruleId}`);
    return newRule;
  }

  async getStatusRules(entity?: string): Promise<StatusRule[]> {
    const result = await this.db.execute(`
      SELECT * FROM status_rules
      ${entity ? 'WHERE entity = $1' : ''}
      ORDER BY priority DESC, created_at DESC
    `, entity ? [entity] : []);
    
    return result.rows.map(row => ({
      ...row,
      conditions: JSON.parse(row.conditions || '[]'),
      actions: JSON.parse(row.actions || '[]')
    }));
  }

  async updateStatusRule(ruleId: string, updates: Partial<StatusRule>): Promise<StatusRule> {
    const existing = await this.getStatusRule(ruleId);
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    
    await this.saveStatusRule(updated);
    
    this.logger.log(`Updated status rule: ${ruleId}`);
    return updated;
  }

  async deleteStatusRule(ruleId: string): Promise<void> {
    await this.db.execute(`
      DELETE FROM status_rules WHERE id = $1
    `, [ruleId]);
    
    this.logger.log(`Deleted status rule: ${ruleId}`);
  }

  async createStatusTransition(transition: Omit<StatusTransition, 'id' | 'createdAt'>): Promise<StatusTransition> {
    const transitionId = `transition-${Date.now()}`;
    
    const newTransition: StatusTransition = {
      id: transitionId,
      ...transition,
      createdAt: new Date()
    };

    await this.saveStatusTransition(newTransition);
    
    this.logger.log(`Created status transition: ${transitionId}`);
    return newTransition;
  }

  async getStatusTransitions(entity: string): Promise<StatusTransition[]> {
    const result = await this.db.execute(`
      SELECT * FROM status_transitions
      WHERE entity = $1
      ORDER BY created_at DESC
    `, [entity]);
    
    return result.rows.map(row => ({
      ...row,
      conditions: JSON.parse(row.conditions || '[]'),
      actions: JSON.parse(row.actions || '[]')
    }));
  }

  async updateEntityStatus(entity: string, entityId: string, newStatus: string, changedBy: string, reason?: string, metadata?: Record<string, any>): Promise<void> {
    const currentStatus = await this.getCurrentStatus(entity, entityId);
    
    if (currentStatus === newStatus) {
      this.logger.warn(`Entity ${entityId} is already in status ${newStatus}`);
      return;
    }
    
    // Check if transition is allowed
    const isTransitionAllowed = await this.isTransitionAllowed(entity, currentStatus, newStatus);
    if (!isTransitionAllowed) {
      throw new Error(`Transition from ${currentStatus} to ${newStatus} is not allowed for ${entity}`);
    }
    
    // Update status
    await this.updateStatusInDatabase(entity, entityId, newStatus);
    
    // Log status change
    await this.logStatusChange(entity, entityId, currentStatus, newStatus, changedBy, reason, metadata);
    
    // Execute status change actions
    await this.executeStatusChangeActions(entity, entityId, currentStatus, newStatus, metadata);
    
    // Emit status change event
    await this.eventBus.emit('status.changed', {
      entity,
      entityId,
      fromStatus: currentStatus,
      toStatus: newStatus,
      changedBy,
      reason,
      metadata
    });
    
    this.logger.log(`Updated ${entity} ${entityId} status from ${currentStatus} to ${newStatus}`);
  }

  async getStatusHistory(entity: string, entityId: string): Promise<StatusHistory[]> {
    const result = await this.db.execute(`
      SELECT * FROM status_history
      WHERE entity = $1 AND entity_id = $2
      ORDER BY timestamp DESC
    `, [entity, entityId]);
    
    return result.rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  async getCurrentStatus(entity: string, entityId: string): Promise<string> {
    const result = await this.db.execute(`
      SELECT status FROM ${entity}
      WHERE id = $1
    `, [entityId]);
    
    if (result.rows.length === 0) {
      throw new Error(`${entity} with id ${entityId} not found`);
    }
    
    return result.rows[0].status;
  }

  async getAvailableTransitions(entity: string, currentStatus: string): Promise<StatusTransition[]> {
    const transitions = await this.getStatusTransitions(entity);
    
    return transitions.filter(transition => 
      transition.fromStatus === currentStatus && 
      this.evaluateTransitionConditions(transition, {})
    );
  }

  async executeStatusRules(entity: string, entityId: string, data: Record<string, any>): Promise<void> {
    const rules = await this.getStatusRules(entity);
    
    for (const rule of rules) {
      if (rule.status === 'active' && this.evaluateRuleConditions(rule, data)) {
        await this.executeRuleActions(rule, entity, entityId, data);
      }
    }
  }

  async getStatusAnalytics(entity?: string): Promise<{
    totalEntities: number;
    statusDistribution: Record<string, number>;
    averageStatusDuration: Record<string, number>;
    statusChangeFrequency: Record<string, number>;
  }> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(*) as total_entities,
        status,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration
      FROM ${entity || 'orders'}
      GROUP BY status
    `);
    
    const statusDistribution: Record<string, number> = {};
    const averageStatusDuration: Record<string, number> = {};
    
    result.rows.forEach(row => {
      statusDistribution[row.status] = parseInt(row.total_entities) || 0;
      averageStatusDuration[row.status] = parseFloat(row.avg_duration) || 0;
    });
    
    // Get status change frequency
    const changeResult = await this.db.execute(`
      SELECT 
        to_status,
        COUNT(*) as change_count
      FROM status_history
      ${entity ? 'WHERE entity = $1' : ''}
      GROUP BY to_status
    `, entity ? [entity] : []);
    
    const statusChangeFrequency: Record<string, number> = {};
    changeResult.rows.forEach(row => {
      statusChangeFrequency[row.to_status] = parseInt(row.change_count) || 0;
    });
    
    return {
      totalEntities: Object.values(statusDistribution).reduce((sum, count) => sum + count, 0),
      statusDistribution,
      averageStatusDuration,
      statusChangeFrequency
    };
  }

  private async saveStatusRule(rule: StatusRule): Promise<void> {
    await this.db.execute(`
      INSERT INTO status_rules (id, name, entity, conditions, actions, priority, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        entity = EXCLUDED.entity,
        conditions = EXCLUDED.conditions,
        actions = EXCLUDED.actions,
        priority = EXCLUDED.priority,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `, [
      rule.id,
      rule.name,
      rule.entity,
      JSON.stringify(rule.conditions),
      JSON.stringify(rule.actions),
      rule.priority,
      rule.status,
      rule.createdAt,
      rule.updatedAt
    ]);
  }

  private async getStatusRule(ruleId: string): Promise<StatusRule> {
    const result = await this.db.execute(`
      SELECT * FROM status_rules WHERE id = $1
    `, [ruleId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Status rule not found: ${ruleId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      conditions: JSON.parse(row.conditions || '[]'),
      actions: JSON.parse(row.actions || '[]')
    };
  }

  private async saveStatusTransition(transition: StatusTransition): Promise<void> {
    await this.db.execute(`
      INSERT INTO status_transitions (id, entity, from_status, to_status, conditions, actions, is_automatic, requires_approval, approver_role, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      transition.id,
      transition.entity,
      transition.fromStatus,
      transition.toStatus,
      JSON.stringify(transition.conditions),
      JSON.stringify(transition.actions),
      transition.isAutomatic,
      transition.requiresApproval,
      transition.approverRole,
      transition.createdAt
    ]);
  }

  private async isTransitionAllowed(entity: string, fromStatus: string, toStatus: string): Promise<boolean> {
    const transitions = await this.getStatusTransitions(entity);
    
    return transitions.some(transition => 
      transition.fromStatus === fromStatus && 
      transition.toStatus === toStatus
    );
  }

  private async updateStatusInDatabase(entity: string, entityId: string, status: string): Promise<void> {
    await this.db.execute(`
      UPDATE ${entity} SET status = $2, updated_at = NOW() WHERE id = $1
    `, [entityId, status]);
  }

  private async logStatusChange(entity: string, entityId: string, fromStatus: string, toStatus: string, changedBy: string, reason?: string, metadata?: Record<string, any>): Promise<void> {
    const historyId = `history-${Date.now()}`;
    
    await this.db.execute(`
      INSERT INTO status_history (id, entity, entity_id, from_status, to_status, changed_by, reason, metadata, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [
      historyId,
      entity,
      entityId,
      fromStatus,
      toStatus,
      changedBy,
      reason,
      JSON.stringify(metadata || {})
    ]);
  }

  private async executeStatusChangeActions(entity: string, entityId: string, fromStatus: string, toStatus: string, metadata?: Record<string, any>): Promise<void> {
    const transitions = await this.getStatusTransitions(entity);
    const transition = transitions.find(t => 
      t.fromStatus === fromStatus && t.toStatus === toStatus
    );
    
    if (transition) {
      for (const action of transition.actions) {
        await this.executeStatusAction(action, entity, entityId, metadata);
      }
    }
  }

  private evaluateRuleConditions(rule: StatusRule, data: Record<string, any>): boolean {
    if (rule.conditions.length === 0) return true;
    
    let result = true;
    let logicalOperator = 'AND';
    
    for (const condition of rule.conditions) {
      const conditionResult = this.evaluateCondition(condition, data);
      
      if (logicalOperator === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }
      
      logicalOperator = condition.logicalOperator || 'AND';
    }
    
    return result;
  }

  private evaluateTransitionConditions(transition: StatusTransition, data: Record<string, any>): boolean {
    if (transition.conditions.length === 0) return true;
    
    return transition.conditions.every(condition => 
      this.evaluateCondition(condition, data)
    );
  }

  private evaluateCondition(condition: StatusCondition, data: Record<string, any>): boolean {
    const value = this.getFieldValue(condition.field, data);
    
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
      default:
        return false;
    }
  }

  private getFieldValue(field: string, data: Record<string, any>): any {
    return field.split('.').reduce((obj, key) => obj?.[key], data);
  }

  private async executeRuleActions(rule: StatusRule, entity: string, entityId: string, data: Record<string, any>): Promise<void> {
    for (const action of rule.actions) {
      if (action.delay && action.delay > 0) {
        setTimeout(async () => {
          await this.executeStatusAction(action, entity, entityId, data);
        }, action.delay * 1000);
      } else {
        await this.executeStatusAction(action, entity, entityId, data);
      }
    }
  }

  private async executeStatusAction(action: StatusAction, entity: string, entityId: string, data: Record<string, any>): Promise<void> {
    switch (action.type) {
      case 'update_status':
        await this.updateEntityStatus(entity, entityId, action.config.status, 'system');
        break;
      case 'send_notification':
        await this.sendNotification(action.config, entity, entityId, data);
        break;
      case 'trigger_workflow':
        await this.triggerWorkflow(action.config, entity, entityId, data);
        break;
      case 'assign_user':
        await this.assignUser(action.config, entity, entityId, data);
        break;
      case 'create_task':
        await this.createTask(action.config, entity, entityId, data);
        break;
    }
  }

  private async sendNotification(config: any, entity: string, entityId: string, data: Record<string, any>): Promise<void> {
    this.logger.log(`Sending notification for ${entity} ${entityId}: ${config.message}`);
  }

  private async triggerWorkflow(config: any, entity: string, entityId: string, data: Record<string, any>): Promise<void> {
    this.logger.log(`Triggering workflow ${config.workflowId} for ${entity} ${entityId}`);
  }

  private async assignUser(config: any, entity: string, entityId: string, data: Record<string, any>): Promise<void> {
    this.logger.log(`Assigning user ${config.userId} to ${entity} ${entityId}`);
  }

  private async createTask(config: any, entity: string, entityId: string, data: Record<string, any>): Promise<void> {
    this.logger.log(`Creating task for ${entity} ${entityId}: ${config.title}`);
  }
}
