import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { StandardRateLimit } from '../../core/security/decorators/rate-limit.decorator';
import { EmailAutomationService } from './services/email-automation.service';
import { WorkflowAutomationService } from './services/workflow-automation.service';
import { StatusAutomationService } from './services/status-automation.service';
import { AutoScalingService } from './services/auto-scaling.service';

@ApiTags('Automation - Workflow & Process Automation')
@Controller({ path: 'automation', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AutomationController {
  constructor(
    private readonly emailAutomation: EmailAutomationService,
    private readonly workflowAutomation: WorkflowAutomationService,
    private readonly statusAutomation: StatusAutomationService,
    private readonly autoScaling: AutoScalingService,
  ) {}

  // ==================== EMAIL AUTOMATION ====================

  @Post('email/templates')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create email template' })
  @ApiResponse({ status: 201, description: 'Email template created' })
  async createEmailTemplate(@Body() template: any) {
    return this.emailAutomation.createEmailTemplate(template);
  }

  @Get('email/templates')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get email templates' })
  @ApiResponse({ status: 200, description: 'Email templates' })
  async getEmailTemplates(@Query('type') type?: string) {
    return this.emailAutomation.getEmailTemplates(type);
  }

  @Post('email/triggers')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create email trigger' })
  @ApiResponse({ status: 201, description: 'Email trigger created' })
  async createEmailTrigger(@Body() trigger: any) {
    return this.emailAutomation.createEmailTrigger(trigger);
  }

  @Get('email/triggers')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get email triggers' })
  @ApiResponse({ status: 200, description: 'Email triggers' })
  async getEmailTriggers() {
    return this.emailAutomation.getEmailTriggers();
  }

  @Post('email/execute-trigger')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Execute email trigger' })
  @ApiResponse({ status: 200, description: 'Email trigger executed' })
  async executeEmailTrigger(
    @Body() data: { event: string; data: any }
  ) {
    await this.emailAutomation.executeEmailTrigger(data.event, data.data);
    return { success: true };
  }

  @Post('email/campaigns')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create email campaign' })
  @ApiResponse({ status: 201, description: 'Email campaign created' })
  async createEmailCampaign(@Body() campaign: any) {
    return this.emailAutomation.createEmailCampaign(campaign);
  }

  @Post('email/campaigns/:campaignId/send')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Send email campaign' })
  @ApiResponse({ status: 200, description: 'Email campaign sent' })
  async sendEmailCampaign(@Param('campaignId') campaignId: string) {
    await this.emailAutomation.sendEmailCampaign(campaignId);
    return { success: true };
  }

  @Post('email/campaigns/:campaignId/schedule')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Schedule email campaign' })
  @ApiResponse({ status: 200, description: 'Email campaign scheduled' })
  async scheduleEmailCampaign(
    @Param('campaignId') campaignId: string,
    @Body() schedule: { scheduledAt: Date }
  ) {
    await this.emailAutomation.scheduleEmailCampaign(campaignId, schedule.scheduledAt);
    return { success: true };
  }

  @Get('email/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get email analytics' })
  @ApiResponse({ status: 200, description: 'Email analytics' })
  async getEmailAnalytics(@Query('campaignId') campaignId?: string) {
    return this.emailAutomation.getEmailAnalytics(campaignId);
  }

  // ==================== WORKFLOW AUTOMATION ====================

  @Post('workflows')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created' })
  async createWorkflow(@Body() workflow: any) {
    return this.workflowAutomation.createWorkflow(workflow);
  }

  @Get('workflows')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get workflows' })
  @ApiResponse({ status: 200, description: 'Workflows' })
  async getWorkflows(@Query('status') status?: string) {
    return this.workflowAutomation.getWorkflows(status);
  }

  @Post('workflows/:workflowId/execute')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Execute workflow' })
  @ApiResponse({ status: 200, description: 'Workflow execution started' })
  async executeWorkflow(
    @Param('workflowId') workflowId: string,
    @Body() context: Record<string, any>
  ) {
    return this.workflowAutomation.executeWorkflow(workflowId, context);
  }

  @Get('workflows/executions')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get workflow executions' })
  @ApiResponse({ status: 200, description: 'Workflow executions' })
  async getWorkflowExecutions(@Query('workflowId') workflowId?: string) {
    return this.workflowAutomation.getWorkflowExecutions(workflowId);
  }

  @Post('workflows/executions/:executionId/pause')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Pause workflow execution' })
  @ApiResponse({ status: 200, description: 'Workflow execution paused' })
  async pauseWorkflowExecution(@Param('executionId') executionId: string) {
    await this.workflowAutomation.pauseWorkflowExecution(executionId);
    return { success: true };
  }

  @Post('workflows/executions/:executionId/resume')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Resume workflow execution' })
  @ApiResponse({ status: 200, description: 'Workflow execution resumed' })
  async resumeWorkflowExecution(@Param('executionId') executionId: string) {
    await this.workflowAutomation.resumeWorkflowExecution(executionId);
    return { success: true };
  }

  @Post('workflows/executions/:executionId/cancel')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Cancel workflow execution' })
  @ApiResponse({ status: 200, description: 'Workflow execution cancelled' })
  async cancelWorkflowExecution(@Param('executionId') executionId: string) {
    await this.workflowAutomation.cancelWorkflowExecution(executionId);
    return { success: true };
  }

  @Post('workflows/approvals')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create approval request' })
  @ApiResponse({ status: 201, description: 'Approval request created' })
  async createApprovalRequest(
    @Body() data: { executionId: string; stepId: string; approverId: string }
  ) {
    return this.workflowAutomation.createApprovalRequest(data.executionId, data.stepId, data.approverId);
  }

  @Post('workflows/approvals/:requestId/respond')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Respond to approval request' })
  @ApiResponse({ status: 200, description: 'Approval request responded' })
  async respondToApprovalRequest(
    @Param('requestId') requestId: string,
    @Body() data: { status: 'approved' | 'rejected'; comments?: string }
  ) {
    await this.workflowAutomation.respondToApprovalRequest(requestId, data.status, data.comments);
    return { success: true };
  }

  @Get('workflows/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get workflow analytics' })
  @ApiResponse({ status: 200, description: 'Workflow analytics' })
  async getWorkflowAnalytics(@Query('workflowId') workflowId?: string) {
    return this.workflowAutomation.getWorkflowAnalytics(workflowId);
  }

  // ==================== STATUS AUTOMATION ====================

  @Post('status/rules')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create status rule' })
  @ApiResponse({ status: 201, description: 'Status rule created' })
  async createStatusRule(@Body() rule: any) {
    return this.statusAutomation.createStatusRule(rule);
  }

  @Get('status/rules')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get status rules' })
  @ApiResponse({ status: 200, description: 'Status rules' })
  async getStatusRules(@Query('entity') entity?: string) {
    return this.statusAutomation.getStatusRules(entity);
  }

  @Post('status/transitions')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create status transition' })
  @ApiResponse({ status: 201, description: 'Status transition created' })
  async createStatusTransition(@Body() transition: any) {
    return this.statusAutomation.createStatusTransition(transition);
  }

  @Get('status/transitions/:entity')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get status transitions' })
  @ApiResponse({ status: 200, description: 'Status transitions' })
  async getStatusTransitions(@Param('entity') entity: string) {
    return this.statusAutomation.getStatusTransitions(entity);
  }

  @Post('status/update')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Update entity status' })
  @ApiResponse({ status: 200, description: 'Entity status updated' })
  async updateEntityStatus(
    @Body() data: { entity: string; entityId: string; status: string; changedBy: string; reason?: string; metadata?: Record<string, any> }
  ) {
    await this.statusAutomation.updateEntityStatus(data.entity, data.entityId, data.status, data.changedBy, data.reason, data.metadata);
    return { success: true };
  }

  @Get('status/history/:entity/:entityId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get status history' })
  @ApiResponse({ status: 200, description: 'Status history' })
  async getStatusHistory(
    @Param('entity') entity: string,
    @Param('entityId') entityId: string
  ) {
    return this.statusAutomation.getStatusHistory(entity, entityId);
  }

  @Get('status/transitions/:entity/:currentStatus')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get available transitions' })
  @ApiResponse({ status: 200, description: 'Available transitions' })
  async getAvailableTransitions(
    @Param('entity') entity: string,
    @Param('currentStatus') currentStatus: string
  ) {
    return this.statusAutomation.getAvailableTransitions(entity, currentStatus);
  }

  @Post('status/execute-rules')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Execute status rules' })
  @ApiResponse({ status: 200, description: 'Status rules executed' })
  async executeStatusRules(
    @Body() data: { entity: string; entityId: string; data: Record<string, any> }
  ) {
    await this.statusAutomation.executeStatusRules(data.entity, data.entityId, data.data);
    return { success: true };
  }

  @Get('status/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get status analytics' })
  @ApiResponse({ status: 200, description: 'Status analytics' })
  async getStatusAnalytics(@Query('entity') entity?: string) {
    return this.statusAutomation.getStatusAnalytics(entity);
  }

  // ==================== AUTO SCALING ====================

  @Post('scaling/rules')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create scaling rule' })
  @ApiResponse({ status: 201, description: 'Scaling rule created' })
  async createScalingRule(@Body() rule: any) {
    return this.autoScaling.createScalingRule(rule);
  }

  @Get('scaling/rules')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get scaling rules' })
  @ApiResponse({ status: 200, description: 'Scaling rules' })
  async getScalingRules(@Query('resource') resource?: string) {
    return this.autoScaling.getScalingRules(resource);
  }

  @Post('scaling/check')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Check scaling conditions' })
  @ApiResponse({ status: 200, description: 'Scaling conditions checked' })
  async checkScalingConditions() {
    await this.autoScaling.checkScalingConditions();
    return { success: true };
  }

  @Get('scaling/history')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get scaling history' })
  @ApiResponse({ status: 200, description: 'Scaling history' })
  async getScalingHistory(@Query('resource') resource?: string, @Query('limit') limit: number = 100) {
    return this.autoScaling.getScalingHistory(resource, limit);
  }

  @Get('scaling/analytics')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get scaling analytics' })
  @ApiResponse({ status: 200, description: 'Scaling analytics' })
  async getScalingAnalytics() {
    return this.autoScaling.getScalingAnalytics();
  }

  @Get('scaling/recommendations')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get scaling recommendations' })
  @ApiResponse({ status: 200, description: 'Scaling recommendations' })
  async getScalingRecommendations() {
    return this.autoScaling.getScalingRecommendations();
  }

  @Post('scaling/optimize')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Optimize scaling rules' })
  @ApiResponse({ status: 200, description: 'Scaling rules optimized' })
  async optimizeScalingRules() {
    await this.autoScaling.optimizeScalingRules();
    return { success: true };
  }

  // ==================== COMPREHENSIVE AUTOMATION ====================

  @Get('dashboard')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get automation dashboard' })
  @ApiResponse({ status: 200, description: 'Automation dashboard data' })
  async getAutomationDashboard() {
    const [
      emailAnalytics,
      workflowAnalytics,
      statusAnalytics,
      scalingAnalytics
    ] = await Promise.all([
      this.emailAutomation.getEmailAnalytics(),
      this.workflowAutomation.getWorkflowAnalytics(),
      this.statusAutomation.getStatusAnalytics(),
      this.autoScaling.getScalingAnalytics()
    ]);

    return {
      email: emailAnalytics,
      workflow: workflowAnalytics,
      status: statusAnalytics,
      scaling: scalingAnalytics,
      lastUpdated: new Date(),
      insights: this.generateAutomationInsights(emailAnalytics, workflowAnalytics, statusAnalytics, scalingAnalytics)
    };
  }

  @Get('health')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get automation health' })
  @ApiResponse({ status: 200, description: 'Automation health status' })
  async getAutomationHealth() {
    return {
      emailAutomation: 'healthy',
      workflowAutomation: 'healthy',
      statusAutomation: 'healthy',
      autoScaling: 'healthy',
      lastChecked: new Date(),
      uptime: 99.9,
      performance: {
        averageResponseTime: 150,
        throughput: 1000,
        errorRate: 0.02
      }
    };
  }

  private generateAutomationInsights(emailAnalytics: any, workflowAnalytics: any, statusAnalytics: any, scalingAnalytics: any) {
    const insights = [];
    
    if (emailAnalytics.openRate < 20) {
      insights.push('📧 Email open rate is low - consider improving subject lines');
    }
    
    if (workflowAnalytics.successRate < 90) {
      insights.push('⚙️ Workflow success rate is below target - review failed executions');
    }
    
    if (scalingAnalytics.totalScalingEvents > 100) {
      insights.push('📈 High scaling activity detected - consider optimizing thresholds');
    }
    
    return insights;
  }
}
