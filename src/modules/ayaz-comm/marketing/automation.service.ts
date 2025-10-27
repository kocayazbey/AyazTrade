import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  status: 'active' | 'paused' | 'draft';
  createdAt: Date;
  updatedAt: Date;
  lastRunAt?: Date;
  runCount: number;
}

interface WorkflowTrigger {
  type: 'order_placed' | 'cart_abandoned' | 'customer_registered' | 'product_viewed' | 'review_submitted' | 'subscription_renewed' | 'time_based' | 'segment_entered';
  config: Record<string, any>;
}

interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
  value: any;
  logic?: 'AND' | 'OR';
}

interface WorkflowAction {
  type: 'send_email' | 'send_sms' | 'send_push' | 'add_tag' | 'add_to_segment' | 'create_discount' | 'webhook' | 'wait';
  config: Record<string, any>;
  delay?: number;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  triggeredBy: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  actionsCompleted: number;
  totalActions: number;
}

@Injectable()
export class MarketingAutomationService {
  private readonly logger = new Logger(MarketingAutomationService.name);
  private workflows: Map<string, AutomationWorkflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultWorkflows();
    this.setupEventListeners();
  }

  private initializeDefaultWorkflows(): void {
    const abandonedCartWorkflow: AutomationWorkflow = {
      id: 'abandoned_cart_recovery',
      name: 'Abandoned Cart Recovery',
      description: 'Send reminder emails for abandoned carts',
      trigger: {
        type: 'cart_abandoned',
        config: { hours: 2 },
      },
      conditions: [
        { field: 'cart.total', operator: 'greater_than', value: 100 },
        { field: 'customer.emailVerified', operator: 'equals', value: true, logic: 'AND' },
      ],
      actions: [
        {
          type: 'send_email',
          config: {
            templateId: 'abandoned_cart_reminder',
            subject: 'You left items in your cart!',
          },
          delay: 0,
        },
        {
          type: 'wait',
          config: { duration: 24 * 60 * 60 * 1000 },
          delay: 24 * 60 * 60 * 1000,
        },
        {
          type: 'create_discount',
          config: {
            type: 'percentage',
            value: 10,
            expiresIn: 48 * 60 * 60 * 1000,
          },
          delay: 0,
        },
        {
          type: 'send_email',
          config: {
            templateId: 'abandoned_cart_discount',
            subject: 'Special 10% discount just for you!',
          },
          delay: 0,
        },
      ],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      runCount: 0,
    };

    const welcomeSeriesWorkflow: AutomationWorkflow = {
      id: 'welcome_series',
      name: 'Welcome Email Series',
      description: 'Onboarding email series for new customers',
      trigger: {
        type: 'customer_registered',
        config: {},
      },
      conditions: [],
      actions: [
        {
          type: 'send_email',
          config: {
            templateId: 'welcome_email_1',
            subject: 'Welcome to AyazComm!',
          },
          delay: 0,
        },
        {
          type: 'wait',
          config: { duration: 2 * 24 * 60 * 60 * 1000 },
          delay: 2 * 24 * 60 * 60 * 1000,
        },
        {
          type: 'send_email',
          config: {
            templateId: 'welcome_email_2',
            subject: 'Discover our best products',
          },
          delay: 0,
        },
        {
          type: 'wait',
          config: { duration: 5 * 24 * 60 * 60 * 1000 },
          delay: 5 * 24 * 60 * 60 * 1000,
        },
        {
          type: 'create_discount',
          config: {
            type: 'percentage',
            value: 15,
            expiresIn: 7 * 24 * 60 * 60 * 1000,
          },
          delay: 0,
        },
        {
          type: 'send_email',
          config: {
            templateId: 'welcome_email_3',
            subject: 'Here\'s a special gift for you!',
          },
          delay: 0,
        },
      ],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      runCount: 0,
    };

    const winBackWorkflow: AutomationWorkflow = {
      id: 'win_back_campaign',
      name: 'Win Back Campaign',
      description: 'Re-engage inactive customers',
      trigger: {
        type: 'segment_entered',
        config: { segmentId: 'at_risk' },
      },
      conditions: [],
      actions: [
        {
          type: 'send_email',
          config: {
            templateId: 'we_miss_you',
            subject: 'We miss you! Here\'s 20% off',
          },
          delay: 0,
        },
        {
          type: 'create_discount',
          config: {
            type: 'percentage',
            value: 20,
            expiresIn: 14 * 24 * 60 * 60 * 1000,
          },
          delay: 0,
        },
        {
          type: 'add_tag',
          config: { tag: 'win_back_target' },
          delay: 0,
        },
      ],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      runCount: 0,
    };

    this.workflows.set(abandonedCartWorkflow.id, abandonedCartWorkflow);
    this.workflows.set(welcomeSeriesWorkflow.id, welcomeSeriesWorkflow);
    this.workflows.set(winBackWorkflow.id, winBackWorkflow);

    this.logger.log('Initialized default automation workflows');
  }

  private setupEventListeners(): void {
    this.eventEmitter.on('order.created', (data) => this.handleTrigger('order_placed', data));
    this.eventEmitter.on('cart.abandoned', (data) => this.handleTrigger('cart_abandoned', data));
    this.eventEmitter.on('customer.registered', (data) => this.handleTrigger('customer_registered', data));
    this.eventEmitter.on('product.viewed', (data) => this.handleTrigger('product_viewed', data));
    this.eventEmitter.on('review.submitted', (data) => this.handleTrigger('review_submitted', data));
  }

  private async handleTrigger(triggerType: string, data: any): Promise<void> {
    this.logger.debug(`Trigger received: ${triggerType}`);

    for (const [workflowId, workflow] of this.workflows.entries()) {
      if (workflow.status === 'active' && workflow.trigger.type === triggerType) {
        if (this.evaluateConditions(workflow.conditions, data)) {
          await this.executeWorkflow(workflowId, data);
        }
      }
    }
  }

  private evaluateConditions(conditions: WorkflowCondition[], data: any): boolean {
    if (conditions.length === 0) return true;

    let currentResult = this.evaluateCondition(conditions[0], data);

    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i];
      const result = this.evaluateCondition(condition, data);

      if (condition.logic === 'OR') {
        currentResult = currentResult || result;
      } else {
        currentResult = currentResult && result;
      }
    }

    return currentResult;
  }

  private evaluateCondition(condition: WorkflowCondition, data: any): boolean {
    const value = this.getNestedValue(data, condition.field);

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      case 'contains':
        return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      default:
        return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let value = obj;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private async executeWorkflow(workflowId: string, triggerData: any): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}`,
      workflowId,
      triggeredBy: triggerData.customerId || triggerData.id,
      status: 'running',
      startedAt: new Date(),
      actionsCompleted: 0,
      totalActions: workflow.actions.length,
    };

    this.executions.set(execution.id, execution);
    this.logger.log(`Executing workflow: ${workflow.name} (${workflowId})`);

    try {
      for (const action of workflow.actions) {
        if (action.delay && action.delay > 0) {
          await this.sleep(action.delay);
        }

        await this.executeAction(action, triggerData);
        execution.actionsCompleted++;
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
      workflow.runCount++;
      workflow.lastRunAt = new Date();

      this.logger.log(`Workflow completed: ${workflow.name}`);
    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.completedAt = new Date();

      this.logger.error(`Workflow execution failed: ${workflow.name}`, error);
    }

    this.executions.set(execution.id, execution);
    this.workflows.set(workflowId, workflow);
  }

  private async executeAction(action: WorkflowAction, data: any): Promise<void> {
    this.logger.debug(`Executing action: ${action.type}`);

    switch (action.type) {
      case 'send_email':
        await this.sendEmail(action.config, data);
        break;
      case 'send_sms':
        await this.sendSMS(action.config, data);
        break;
      case 'send_push':
        await this.sendPushNotification(action.config, data);
        break;
      case 'add_tag':
        await this.addTag(action.config, data);
        break;
      case 'add_to_segment':
        await this.addToSegment(action.config, data);
        break;
      case 'create_discount':
        await this.createDiscount(action.config, data);
        break;
      case 'webhook':
        await this.callWebhook(action.config, data);
        break;
      case 'wait':
        break;
      default:
        this.logger.warn(`Unknown action type: ${action.type}`);
    }
  }

  private async sendEmail(config: any, data: any): Promise<void> {
    this.logger.debug(`Sending email: ${config.templateId} to ${data.customerId}`);
  }

  private async sendSMS(config: any, data: any): Promise<void> {
    this.logger.debug(`Sending SMS: ${config.message} to ${data.customerId}`);
  }

  private async sendPushNotification(config: any, data: any): Promise<void> {
    this.logger.debug(`Sending push notification: ${config.title} to ${data.customerId}`);
  }

  private async addTag(config: any, data: any): Promise<void> {
    this.logger.debug(`Adding tag: ${config.tag} to ${data.customerId}`);
  }

  private async addToSegment(config: any, data: any): Promise<void> {
    this.logger.debug(`Adding customer ${data.customerId} to segment: ${config.segmentId}`);
  }

  private async createDiscount(config: any, data: any): Promise<void> {
    this.logger.debug(`Creating discount: ${config.type} ${config.value}% for ${data.customerId}`);
  }

  private async callWebhook(config: any, data: any): Promise<void> {
    this.logger.debug(`Calling webhook: ${config.url}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async createWorkflow(workflow: Partial<AutomationWorkflow>): Promise<AutomationWorkflow> {
    const newWorkflow: AutomationWorkflow = {
      id: `workflow_${Date.now()}`,
      name: workflow.name || '',
      description: workflow.description || '',
      trigger: workflow.trigger || { type: 'order_placed', config: {} },
      conditions: workflow.conditions || [],
      actions: workflow.actions || [],
      status: workflow.status || 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      runCount: 0,
    };

    this.workflows.set(newWorkflow.id, newWorkflow);
    this.logger.log(`Workflow created: ${newWorkflow.name}`);
    return newWorkflow;
  }

  async updateWorkflow(id: string, updates: Partial<AutomationWorkflow>): Promise<AutomationWorkflow> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow ${id} not found`);
    }

    const updatedWorkflow = {
      ...workflow,
      ...updates,
      updatedAt: new Date(),
    };

    this.workflows.set(id, updatedWorkflow);
    this.logger.log(`Workflow updated: ${id}`);
    return updatedWorkflow;
  }

  async deleteWorkflow(id: string): Promise<void> {
    this.workflows.delete(id);
    this.logger.log(`Workflow deleted: ${id}`);
  }

  async getWorkflow(id: string): Promise<AutomationWorkflow> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow ${id} not found`);
    }
    return workflow;
  }

  async getAllWorkflows(filters?: { status?: string; type?: string }): Promise<AutomationWorkflow[]> {
    let workflows = Array.from(this.workflows.values());

    if (filters?.status) {
      workflows = workflows.filter((w) => w.status === filters.status);
    }

    if (filters?.type) {
      workflows = workflows.filter((w) => w.trigger.type === filters.type);
    }

    return workflows;
  }

  async pauseWorkflow(id: string): Promise<AutomationWorkflow> {
    return this.updateWorkflow(id, { status: 'paused' });
  }

  async resumeWorkflow(id: string): Promise<AutomationWorkflow> {
    return this.updateWorkflow(id, { status: 'active' });
  }

  async getWorkflowExecutions(workflowId: string, limit: number = 50): Promise<WorkflowExecution[]> {
    const executions = Array.from(this.executions.values())
      .filter((e) => e.workflowId === workflowId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);

    return executions;
  }

  async getWorkflowStats(workflowId: string): Promise<any> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const executions = Array.from(this.executions.values())
      .filter((e) => e.workflowId === workflowId);

    const completed = executions.filter((e) => e.status === 'completed').length;
    const failed = executions.filter((e) => e.status === 'failed').length;
    const running = executions.filter((e) => e.status === 'running').length;

    const avgExecutionTime = executions
      .filter((e) => e.completedAt)
      .reduce((sum, e) => sum + (e.completedAt.getTime() - e.startedAt.getTime()), 0) / completed || 0;

    return {
      totalRuns: workflow.runCount,
      completed,
      failed,
      running,
      successRate: workflow.runCount > 0 ? (completed / workflow.runCount) * 100 : 0,
      averageExecutionTime: avgExecutionTime,
      lastRun: workflow.lastRunAt,
    };
  }

  async duplicateWorkflow(workflowId: string): Promise<AutomationWorkflow> {
    const original = await this.getWorkflow(workflowId);

    const duplicated: AutomationWorkflow = {
      ...original,
      id: `workflow_${Date.now()}`,
      name: `${original.name} (Copy)`,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      runCount: 0,
      lastRunAt: undefined,
    };

    this.workflows.set(duplicated.id, duplicated);
    this.logger.log(`Workflow duplicated: ${workflowId} -> ${duplicated.id}`);
    return duplicated;
  }

  async testWorkflow(workflowId: string, testData: any): Promise<WorkflowExecution> {
    this.logger.log(`Testing workflow: ${workflowId}`);
    
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const execution: WorkflowExecution = {
      id: `test_exec_${Date.now()}`,
      workflowId,
      triggeredBy: 'test',
      status: 'running',
      startedAt: new Date(),
      actionsCompleted: 0,
      totalActions: workflow.actions.length,
    };

    this.executions.set(execution.id, execution);

    try {
      for (const action of workflow.actions) {
        if (action.type !== 'wait') {
          this.logger.debug(`TEST: Would execute ${action.type} with config:`, action.config);
        }
        execution.actionsCompleted++;
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
      this.logger.log(`Workflow test completed: ${workflowId}`);
    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.completedAt = new Date();
      this.logger.error(`Workflow test failed: ${workflowId}`, error);
    }

    this.executions.set(execution.id, execution);
    return execution;
  }
}

