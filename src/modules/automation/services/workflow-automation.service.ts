import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';
import { EventBusService } from '../../../core/events/event-bus.service';

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  status: 'active' | 'inactive' | 'draft';
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'manual' | 'webhook';
  event?: string;
  schedule?: string;
  conditions?: Record<string, any>;
}

interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'delay' | 'approval' | 'notification';
  config: Record<string, any>;
  nextSteps: string[];
  errorHandling: {
    retryCount: number;
    retryDelay: number;
    onError: 'stop' | 'continue' | 'skip';
  };
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  currentStep: string;
  context: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
}

interface ApprovalRequest {
  id: string;
  workflowExecutionId: string;
  stepId: string;
  approverId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  respondedAt?: Date;
  comments?: string;
}

@Injectable()
export class WorkflowAutomationService {
  private readonly logger = new Logger(WorkflowAutomationService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
    private readonly eventBus: EventBusService,
  ) {}

  async createWorkflow(workflow: Omit<WorkflowDefinition, 'id' | 'version' | 'createdAt' | 'updatedAt'>): Promise<WorkflowDefinition> {
    const workflowId = `workflow-${Date.now()}`;
    
    const newWorkflow: WorkflowDefinition = {
      id: workflowId,
      ...workflow,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveWorkflow(newWorkflow);
    
    this.logger.log(`Created workflow: ${workflowId}`);
    return newWorkflow;
  }

  async getWorkflows(status?: string): Promise<WorkflowDefinition[]> {
    const result = await this.db.execute(`
      SELECT * FROM workflows
      ${status ? 'WHERE status = $1' : ''}
      ORDER BY created_at DESC
    `, status ? [status] : []);
    
    return result.rows.map(row => ({
      ...row,
      trigger: JSON.parse(row.trigger || '{}'),
      steps: JSON.parse(row.steps || '[]')
    }));
  }

  async updateWorkflow(workflowId: string, updates: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> {
    const existing = await this.getWorkflow(workflowId);
    const updated = {
      ...existing,
      ...updates,
      version: existing.version + 1,
      updatedAt: new Date()
    };
    
    await this.saveWorkflow(updated);
    
    this.logger.log(`Updated workflow: ${workflowId}`);
    return updated;
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    await this.db.execute(`
      DELETE FROM workflows WHERE id = $1
    `, [workflowId]);
    
    this.logger.log(`Deleted workflow: ${workflowId}`);
  }

  async executeWorkflow(workflowId: string, context: Record<string, any> = {}): Promise<WorkflowExecution> {
    const workflow = await this.getWorkflow(workflowId);
    
    if (workflow.status !== 'active') {
      throw new Error(`Workflow ${workflowId} is not active`);
    }
    
    const executionId = `exec-${Date.now()}`;
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'running',
      currentStep: workflow.steps[0]?.id || '',
      context,
      startedAt: new Date(),
      retryCount: 0
    };
    
    await this.saveWorkflowExecution(execution);
    
    // Start workflow execution
    this.executeWorkflowStep(execution, workflow);
    
    this.logger.log(`Started workflow execution: ${executionId}`);
    return execution;
  }

  async getWorkflowExecutions(workflowId?: string): Promise<WorkflowExecution[]> {
    const result = await this.db.execute(`
      SELECT * FROM workflow_executions
      ${workflowId ? 'WHERE workflow_id = $1' : ''}
      ORDER BY started_at DESC
    `, workflowId ? [workflowId] : []);
    
    return result.rows.map(row => ({
      ...row,
      context: JSON.parse(row.context || '{}')
    }));
  }

  async pauseWorkflowExecution(executionId: string): Promise<void> {
    await this.updateWorkflowExecutionStatus(executionId, 'paused');
    this.logger.log(`Paused workflow execution: ${executionId}`);
  }

  async resumeWorkflowExecution(executionId: string): Promise<void> {
    const execution = await this.getWorkflowExecution(executionId);
    const workflow = await this.getWorkflow(execution.workflowId);
    
    execution.status = 'running';
    await this.updateWorkflowExecution(execution);
    
    this.executeWorkflowStep(execution, workflow);
    this.logger.log(`Resumed workflow execution: ${executionId}`);
  }

  async cancelWorkflowExecution(executionId: string): Promise<void> {
    await this.updateWorkflowExecutionStatus(executionId, 'cancelled');
    this.logger.log(`Cancelled workflow execution: ${executionId}`);
  }

  async createApprovalRequest(executionId: string, stepId: string, approverId: string): Promise<ApprovalRequest> {
    const requestId = `approval-${Date.now()}`;
    
    const approvalRequest: ApprovalRequest = {
      id: requestId,
      workflowExecutionId: executionId,
      stepId,
      approverId,
      status: 'pending',
      requestedAt: new Date()
    };
    
    await this.saveApprovalRequest(approvalRequest);
    
    // Send notification to approver
    await this.notifyApprover(approverId, approvalRequest);
    
    this.logger.log(`Created approval request: ${requestId}`);
    return approvalRequest;
  }

  async respondToApprovalRequest(requestId: string, status: 'approved' | 'rejected', comments?: string): Promise<void> {
    const request = await this.getApprovalRequest(requestId);
    
    request.status = status;
    request.respondedAt = new Date();
    request.comments = comments;
    
    await this.updateApprovalRequest(request);
    
    if (status === 'approved') {
      await this.resumeWorkflowExecution(request.workflowExecutionId);
    } else {
      await this.cancelWorkflowExecution(request.workflowExecutionId);
    }
    
    this.logger.log(`Approval request ${requestId} ${status}`);
  }

  async getWorkflowAnalytics(workflowId?: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    successRate: number;
  }> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(*) as total_executions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_executions,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_executions,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_execution_time
      FROM workflow_executions
      ${workflowId ? 'WHERE workflow_id = $1' : ''}
    `, workflowId ? [workflowId] : []);
    
    const stats = result.rows[0];
    const totalExecutions = parseInt(stats.total_executions) || 0;
    const successfulExecutions = parseInt(stats.successful_executions) || 0;
    const failedExecutions = parseInt(stats.failed_executions) || 0;
    const averageExecutionTime = parseFloat(stats.avg_execution_time) || 0;
    
    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0
    };
  }

  private async getWorkflow(workflowId: string): Promise<WorkflowDefinition> {
    const result = await this.db.execute(`
      SELECT * FROM workflows WHERE id = $1
    `, [workflowId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      trigger: JSON.parse(row.trigger || '{}'),
      steps: JSON.parse(row.steps || '[]')
    };
  }

  private async saveWorkflow(workflow: WorkflowDefinition): Promise<void> {
    await this.db.execute(`
      INSERT INTO workflows (id, name, description, trigger, steps, status, version, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        trigger = EXCLUDED.trigger,
        steps = EXCLUDED.steps,
        status = EXCLUDED.status,
        version = EXCLUDED.version,
        updated_at = EXCLUDED.updated_at
    `, [
      workflow.id,
      workflow.name,
      workflow.description,
      JSON.stringify(workflow.trigger),
      JSON.stringify(workflow.steps),
      workflow.status,
      workflow.version,
      workflow.createdAt,
      workflow.updatedAt
    ]);
  }

  private async saveWorkflowExecution(execution: WorkflowExecution): Promise<void> {
    await this.db.execute(`
      INSERT INTO workflow_executions (id, workflow_id, status, current_step, context, started_at, completed_at, error, retry_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      execution.id,
      execution.workflowId,
      execution.status,
      execution.currentStep,
      JSON.stringify(execution.context),
      execution.startedAt,
      execution.completedAt,
      execution.error,
      execution.retryCount
    ]);
  }

  private async getWorkflowExecution(executionId: string): Promise<WorkflowExecution> {
    const result = await this.db.execute(`
      SELECT * FROM workflow_executions WHERE id = $1
    `, [executionId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Workflow execution not found: ${executionId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      context: JSON.parse(row.context || '{}')
    };
  }

  private async updateWorkflowExecution(execution: WorkflowExecution): Promise<void> {
    await this.db.execute(`
      UPDATE workflow_executions SET
        status = $2,
        current_step = $3,
        context = $4,
        completed_at = $5,
        error = $6,
        retry_count = $7
      WHERE id = $1
    `, [
      execution.id,
      execution.status,
      execution.currentStep,
      JSON.stringify(execution.context),
      execution.completedAt,
      execution.error,
      execution.retryCount
    ]);
  }

  private async updateWorkflowExecutionStatus(executionId: string, status: string): Promise<void> {
    await this.db.execute(`
      UPDATE workflow_executions SET status = $2 WHERE id = $1
    `, [executionId, status]);
  }

  private async executeWorkflowStep(execution: WorkflowExecution, workflow: WorkflowDefinition): Promise<void> {
    try {
      const currentStep = workflow.steps.find(step => step.id === execution.currentStep);
      if (!currentStep) {
        execution.status = 'completed';
        execution.completedAt = new Date();
        await this.updateWorkflowExecution(execution);
        return;
      }
      
      await this.executeStep(currentStep, execution);
      
      // Move to next step
      if (currentStep.nextSteps.length > 0) {
        execution.currentStep = currentStep.nextSteps[0];
        await this.updateWorkflowExecution(execution);
        
        // Continue execution
        setTimeout(() => {
          this.executeWorkflowStep(execution, workflow);
        }, 100);
      } else {
        execution.status = 'completed';
        execution.completedAt = new Date();
        await this.updateWorkflowExecution(execution);
      }
    } catch (error) {
      await this.handleWorkflowError(execution, error);
    }
  }

  private async executeStep(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    switch (step.type) {
      case 'action':
        await this.executeAction(step, execution);
        break;
      case 'condition':
        await this.executeCondition(step, execution);
        break;
      case 'delay':
        await this.executeDelay(step, execution);
        break;
      case 'approval':
        await this.executeApproval(step, execution);
        break;
      case 'notification':
        await this.executeNotification(step, execution);
        break;
    }
  }

  private async executeAction(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    const action = step.config.action;
    
    switch (action) {
      case 'send_email':
        await this.sendEmail(step.config, execution.context);
        break;
      case 'update_status':
        await this.updateStatus(step.config, execution.context);
        break;
      case 'create_record':
        await this.createRecord(step.config, execution.context);
        break;
      case 'call_api':
        await this.callApi(step.config, execution.context);
        break;
    }
  }

  private async executeCondition(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    const condition = step.config.condition;
    const value = this.getContextValue(condition.field, execution.context);
    
    let result = false;
    switch (condition.operator) {
      case 'equals':
        result = value === condition.value;
        break;
      case 'not_equals':
        result = value !== condition.value;
        break;
      case 'greater_than':
        result = value > condition.value;
        break;
      case 'less_than':
        result = value < condition.value;
        break;
      case 'contains':
        result = String(value).includes(condition.value);
        break;
    }
    
    if (result) {
      execution.currentStep = step.nextSteps[0];
    } else {
      execution.currentStep = step.nextSteps[1] || step.nextSteps[0];
    }
  }

  private async executeDelay(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    const delay = step.config.delay || 0;
    await new Promise(resolve => setTimeout(resolve, delay * 1000));
  }

  private async executeApproval(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    const approverId = step.config.approverId;
    await this.createApprovalRequest(execution.id, step.id, approverId);
    
    // Pause execution until approval
    execution.status = 'paused';
    await this.updateWorkflowExecution(execution);
  }

  private async executeNotification(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    const notification = step.config;
    await this.sendNotification(notification, execution.context);
  }

  private async handleWorkflowError(execution: WorkflowExecution, error: any): Promise<void> {
    execution.retryCount++;
    execution.error = error.message;
    
    if (execution.retryCount < 3) {
      // Retry after delay
      setTimeout(async () => {
        const workflow = await this.getWorkflow(execution.workflowId);
        await this.executeWorkflowStep(execution, workflow);
      }, 5000);
    } else {
      execution.status = 'failed';
      execution.completedAt = new Date();
    }
    
    await this.updateWorkflowExecution(execution);
  }

  private getContextValue(field: string, context: Record<string, any>): any {
    return field.split('.').reduce((obj, key) => obj?.[key], context);
  }

  private async sendEmail(config: any, context: Record<string, any>): Promise<void> {
    this.logger.log(`Sending email: ${config.subject}`);
  }

  private async updateStatus(config: any, context: Record<string, any>): Promise<void> {
    this.logger.log(`Updating status: ${config.status}`);
  }

  private async createRecord(config: any, context: Record<string, any>): Promise<void> {
    this.logger.log(`Creating record: ${config.table}`);
  }

  private async callApi(config: any, context: Record<string, any>): Promise<void> {
    this.logger.log(`Calling API: ${config.url}`);
  }

  private async sendNotification(config: any, context: Record<string, any>): Promise<void> {
    this.logger.log(`Sending notification: ${config.message}`);
  }

  private async saveApprovalRequest(request: ApprovalRequest): Promise<void> {
    await this.db.execute(`
      INSERT INTO approval_requests (id, workflow_execution_id, step_id, approver_id, status, requested_at, responded_at, comments)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      request.id,
      request.workflowExecutionId,
      request.stepId,
      request.approverId,
      request.status,
      request.requestedAt,
      request.respondedAt,
      request.comments
    ]);
  }

  private async getApprovalRequest(requestId: string): Promise<ApprovalRequest> {
    const result = await this.db.execute(`
      SELECT * FROM approval_requests WHERE id = $1
    `, [requestId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Approval request not found: ${requestId}`);
    }
    
    return result.rows[0];
  }

  private async updateApprovalRequest(request: ApprovalRequest): Promise<void> {
    await this.db.execute(`
      UPDATE approval_requests SET
        status = $2,
        responded_at = $3,
        comments = $4
      WHERE id = $1
    `, [
      request.id,
      request.status,
      request.respondedAt,
      request.comments
    ]);
  }

  private async notifyApprover(approverId: string, request: ApprovalRequest): Promise<void> {
    this.logger.log(`Notifying approver ${approverId} of approval request ${request.id}`);
  }
}
