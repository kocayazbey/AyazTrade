import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Tenant } from '../../../core/shared/decorators/tenant.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { ActivityService } from '../services/activity.service';
import { CreateActivityDto, UpdateActivityDto } from '../dto/create-activity.dto';

@ApiTags('CRM - Activities & Tasks Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'crm/activities', version: '1' })
export class ActivitiesController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Get activities with filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Activity type filter' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Activity status filter' })
  @ApiQuery({ name: 'priority', required: false, type: String, description: 'Activity priority filter' })
  @ApiQuery({ name: 'assignedTo', required: false, type: String, description: 'Assigned user filter' })
  @ApiQuery({ name: 'relatedTo', required: false, type: String, description: 'Related entity filter' })
  @ApiQuery({ name: 'relatedId', required: false, type: String, description: 'Related entity ID filter' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date filter' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date filter' })
  @ApiQuery({ name: 'overdue', required: false, type: Boolean, description: 'Show only overdue activities' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
  @ApiResponse({ status: 200, description: 'Activities retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(
    @Query() query: any,
    @Tenant() tenantId: string
  ) {
    return this.activityService.findAll(tenantId, query);
  }

  @Get('search')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Search activities by term' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search term' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum results' })
  @ApiResponse({ status: 200, description: 'Search results retrieved' })
  async searchActivities(
    @Query('q') searchTerm: string,
    @Query('limit') limit: number,
    @Tenant() tenantId: string
  ) {
    return this.activityService.searchActivities(searchTerm, tenantId, limit || 20);
  }

  @Get('stats')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Get activity statistics' })
  @ApiResponse({ status: 200, description: 'Activity statistics retrieved successfully' })
  async getStats(@Tenant() tenantId: string) {
    return this.activityService.getStats(tenantId);
  }

  @Get('upcoming')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Get upcoming activities' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to look ahead' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by assigned user' })
  @ApiResponse({ status: 200, description: 'Upcoming activities retrieved successfully' })
  async getUpcomingActivities(
    @Query('days') days: number,
    @Query('userId') userId: string,
    @Tenant() tenantId: string
  ) {
    return this.activityService.getUpcomingActivities(tenantId, days || 7, userId);
  }

  @Get('overdue')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Get overdue activities' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by assigned user' })
  @ApiResponse({ status: 200, description: 'Overdue activities retrieved successfully' })
  async getOverdueActivities(
    @Query('userId') userId: string,
    @Tenant() tenantId: string
  ) {
    return this.activityService.getOverdueActivities(tenantId, userId);
  }

  @Get('user/:userId')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Get activities by user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Activity type filter' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Activity status filter' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date filter' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date filter' })
  @ApiResponse({ status: 200, description: 'User activities retrieved successfully' })
  async getActivitiesByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() filters: any,
    @Tenant() tenantId: string
  ) {
    return this.activityService.getActivitiesByUser(userId, tenantId, filters);
  }

  @Get('customer/:customerId')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Get activities by customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Activity type filter' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Activity status filter' })
  @ApiResponse({ status: 200, description: 'Customer activities retrieved successfully' })
  async getActivitiesByCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() filters: any,
    @Tenant() tenantId: string
  ) {
    return this.activityService.getActivitiesByRelatedEntity('customer', customerId, tenantId, filters);
  }

  @Get('lead/:leadId')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Get activities by lead' })
  @ApiParam({ name: 'leadId', description: 'Lead ID' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Activity type filter' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Activity status filter' })
  @ApiResponse({ status: 200, description: 'Lead activities retrieved successfully' })
  async getActivitiesByLead(
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Query() filters: any,
    @Tenant() tenantId: string
  ) {
    return this.activityService.getActivitiesByRelatedEntity('lead', leadId, tenantId, filters);
  }

  @Get('contact/:contactId')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Get activities by contact' })
  @ApiParam({ name: 'contactId', description: 'Contact ID' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Activity type filter' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Activity status filter' })
  @ApiResponse({ status: 200, description: 'Contact activities retrieved successfully' })
  async getActivitiesByContact(
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Query() filters: any,
    @Tenant() tenantId: string
  ) {
    return this.activityService.getActivitiesByRelatedEntity('contact', contactId, tenantId, filters);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Get activity by ID' })
  @ApiParam({ name: 'id', description: 'Activity ID' })
  @ApiResponse({ status: 200, description: 'Activity retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenantId: string
  ) {
    return this.activityService.findOne(id, tenantId);
  }

  @Post()
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Create new activity' })
  @ApiResponse({ status: 201, description: 'Activity created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 404, description: 'Related entity not found' })
  async create(
    @Body() createActivityDto: CreateActivityDto,
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.activityService.create(createActivityDto, tenantId, userId);
  }

  @Post('bulk')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Bulk create activities' })
  @ApiResponse({ status: 201, description: 'Activities created successfully' })
  async bulkCreate(
    @Body() activitiesData: CreateActivityDto[],
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    const results = [];

    for (const activityData of activitiesData) {
      try {
        const activity = await this.activityService.create(activityData, tenantId, userId);
        results.push({ success: true, data: activity });
      } catch (error) {
        results.push({ success: false, error: error.message, data: activityData });
      }
    }

    return {
      total: activitiesData.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  @Patch(':id')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Update activity' })
  @ApiParam({ name: 'id', description: 'Activity ID' })
  @ApiResponse({ status: 200, description: 'Activity updated successfully' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 400, description: 'Bad request - related entity not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateActivityDto: UpdateActivityDto,
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.activityService.update(id, updateActivityDto, tenantId, userId);
  }

  @Post('bulk-update')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Bulk update activities' })
  @ApiResponse({ status: 200, description: 'Bulk update completed' })
  async bulkUpdate(
    @Body() updates: Array<{id: string, data: UpdateActivityDto}>,
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.activityService.bulkUpdate(updates, tenantId, userId);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Delete activity (soft delete)' })
  @ApiParam({ name: 'id', description: 'Activity ID' })
  @ApiResponse({ status: 200, description: 'Activity deleted successfully' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenantId: string
  ) {
    return this.activityService.remove(id, tenantId);
  }

  @Post(':id/complete')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Complete activity' })
  @ApiParam({ name: 'id', description: 'Activity ID' })
  @ApiResponse({ status: 200, description: 'Activity completed successfully' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async completeActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { outcome?: string },
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.activityService.completeActivity(id, tenantId, userId, body.outcome);
  }

  @Post(':id/reschedule')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Reschedule activity' })
  @ApiParam({ name: 'id', description: 'Activity ID' })
  @ApiResponse({ status: 200, description: 'Activity rescheduled successfully' })
  async rescheduleActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() scheduleData: { scheduledAt: Date; reason?: string },
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.activityService.update(id, {
      scheduledAt: new Date(scheduleData.scheduledAt),
      metadata: {
        rescheduledBy: userId,
        rescheduleReason: scheduleData.reason,
        rescheduledAt: new Date(),
      }
    }, tenantId, userId);
  }

  @Post(':id/assign')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Assign activity to user' })
  @ApiParam({ name: 'id', description: 'Activity ID' })
  @ApiResponse({ status: 200, description: 'Activity assigned successfully' })
  async assignActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignData: { assignedTo: string; reason?: string },
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.activityService.update(id, {
      assignedTo: assignData.assignedTo,
      metadata: {
        assignmentUpdatedBy: userId,
        assignmentUpdateReason: assignData.reason,
        assignmentUpdatedAt: new Date(),
      }
    }, tenantId, userId);
  }

  @Post('import')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Import activities from CSV/Excel' })
  @ApiResponse({ status: 200, description: 'Import completed' })
  async importActivities(
    @Body() importData: { data: any[]; mapping: any },
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    const results = [];

    for (const row of importData.data) {
      try {
        const activityData = this.mapImportData(row, importData.mapping);
        const activity = await this.activityService.create(activityData, tenantId, userId);
        results.push({ success: true, data: activity, originalRow: row });
      } catch (error) {
        results.push({ success: false, error: error.message, originalRow: row });
      }
    }

    return {
      total: importData.data.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  @Get('export/csv')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Export activities to CSV' })
  @ApiQuery({ name: 'filters', required: false, type: String, description: 'JSON filters' })
  @ApiResponse({ status: 200, description: 'CSV export data' })
  async exportActivities(
    @Query('filters') filters: string,
    @Tenant() tenantId: string
  ) {
    const query = filters ? JSON.parse(filters) : {};
    const activities = await this.activityService.findAll(tenantId, query);

    // Convert to CSV format
    const csvData = activities.data.map((activity: any) => ({
      'Activity Type': activity.activityType,
      'Subject': activity.subject,
      'Description': activity.description,
      'Status': activity.status,
      'Priority': activity.priority,
      'Scheduled At': activity.scheduledAt,
      'Completed At': activity.completedAt,
      'Outcome': activity.outcome,
      'Assigned To': activity.assignedUser?.firstName + ' ' + activity.assignedUser?.lastName || '',
      'Related To': activity.relatedTo,
      'Related ID': activity.relatedId,
      'Created At': activity.createdAt,
      'Updated At': activity.updatedAt,
    }));

    return {
      filename: `activities_export_${new Date().toISOString().split('T')[0]}.csv`,
      data: csvData,
      total: activities.total
    };
  }

  private mapImportData(row: any, mapping: any): CreateActivityDto {
    return {
      activityType: row[mapping.activityType] || 'task',
      subject: row[mapping.subject] || '',
      description: row[mapping.description],
      relatedTo: row[mapping.relatedTo],
      relatedId: row[mapping.relatedId],
      scheduledAt: row[mapping.scheduledAt] ? new Date(row[mapping.scheduledAt]) : undefined,
      priority: row[mapping.priority] || 'medium',
      status: row[mapping.status] || 'pending',
      assignedTo: row[mapping.assignedTo],
      notes: row[mapping.notes],
      metadata: {
        importedAt: new Date(),
        importSource: 'csv'
      }
    };
  }
}
