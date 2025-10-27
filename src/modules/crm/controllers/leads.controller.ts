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
import { LeadService } from '../services/lead.service';
import { CreateLeadDto, UpdateLeadDto } from '../dto/create-lead.dto';

@ApiTags('CRM - Leads Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'crm/leads', version: '1' })
export class LeadsController {
  constructor(private readonly leadService: LeadService) {}

  @Get()
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Get leads with filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Lead status filter' })
  @ApiQuery({ name: 'source', required: false, type: String, description: 'Lead source filter' })
  @ApiQuery({ name: 'assignedTo', required: false, type: String, description: 'Assigned user filter' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
  @ApiQuery({ name: 'minScore', required: false, type: Number, description: 'Minimum lead score' })
  @ApiQuery({ name: 'maxScore', required: false, type: Number, description: 'Maximum lead score' })
  @ApiQuery({ name: 'minValue', required: false, type: Number, description: 'Minimum estimated value' })
  @ApiQuery({ name: 'maxValue', required: false, type: Number, description: 'Maximum estimated value' })
  @ApiResponse({ status: 200, description: 'Leads retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(
    @Query() query: any,
    @Tenant() tenantId: string
  ) {
    return this.leadService.findAll(tenantId, query);
  }

  @Get('search')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Search leads by term' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search term' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum results' })
  @ApiResponse({ status: 200, description: 'Search results retrieved' })
  async searchLeads(
    @Query('q') searchTerm: string,
    @Query('limit') limit: number,
    @Tenant() tenantId: string
  ) {
    return this.leadService.searchLeads(searchTerm, tenantId, limit || 20);
  }

  @Get('stats')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Get lead statistics' })
  @ApiResponse({ status: 200, description: 'Lead statistics retrieved successfully' })
  async getStats(@Tenant() tenantId: string) {
    return this.leadService.getStats(tenantId);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Get lead by ID' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Lead retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenantId: string
  ) {
    return this.leadService.findOne(id, tenantId);
  }

  @Post()
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Create new lead' })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  async create(
    @Body() createLeadDto: CreateLeadDto,
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.leadService.create(createLeadDto, tenantId, userId);
  }

  @Post('bulk')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Bulk create leads' })
  @ApiResponse({ status: 201, description: 'Leads created successfully' })
  async bulkCreate(
    @Body() leadsData: CreateLeadDto[],
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    const results = [];

    for (const leadData of leadsData) {
      try {
        const lead = await this.leadService.create(leadData, tenantId, userId);
        results.push({ success: true, data: lead });
      } catch (error) {
        results.push({ success: false, error: error.message, data: leadData });
      }
    }

    return {
      total: leadsData.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  @Patch(':id')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Update lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Lead updated successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.leadService.update(id, updateLeadDto, tenantId, userId);
  }

  @Post('bulk-update')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Bulk update leads' })
  @ApiResponse({ status: 200, description: 'Bulk update completed' })
  async bulkUpdate(
    @Body() updates: Array<{id: string, data: UpdateLeadDto}>,
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.leadService.bulkUpdate(updates, tenantId, userId);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Delete lead (soft delete)' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Lead deleted successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenantId: string
  ) {
    return this.leadService.remove(id, tenantId);
  }

  @Post(':id/convert')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Convert lead to customer' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Lead converted to customer successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 400, description: 'Lead already converted' })
  async convertToCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() customerData: any,
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.leadService.convertToCustomer(id, tenantId, userId, customerData);
  }

  @Post(':id/score')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Update lead score' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Lead score updated' })
  async updateScore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() scoreData: { score: number; reason?: string },
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.leadService.updateScore(id, scoreData.score, scoreData.reason || 'Manual update', tenantId, userId);
  }

  @Post(':id/assign')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Assign lead to user' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Lead assigned successfully' })
  async assignTo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignData: { assignedTo: string },
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.leadService.assignTo(id, assignData.assignedTo, tenantId, userId);
  }

  @Post('import')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Import leads from CSV/Excel' })
  @ApiResponse({ status: 200, description: 'Import completed' })
  async importLeads(
    @Body() importData: { data: any[]; mapping: any },
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    const results = [];

    for (const row of importData.data) {
      try {
        const leadData = this.mapImportData(row, importData.mapping);
        const lead = await this.leadService.create(leadData, tenantId, userId);
        results.push({ success: true, data: lead, originalRow: row });
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
  @ApiOperation({ summary: 'Export leads to CSV' })
  @ApiQuery({ name: 'filters', required: false, type: String, description: 'JSON filters' })
  @ApiResponse({ status: 200, description: 'CSV export data' })
  async exportLeads(
    @Query('filters') filters: string,
    @Tenant() tenantId: string
  ) {
    const query = filters ? JSON.parse(filters) : {};
    const leads = await this.leadService.findAll(tenantId, query);

    // Convert to CSV format
    const csvData = leads.data.map((lead: any) => ({
      'Lead Number': lead.leadNumber,
      'Contact Name': lead.contactName,
      'Company': lead.companyName,
      'Email': lead.email,
      'Phone': lead.phone,
      'Source': lead.source,
      'Status': lead.status,
      'Lead Score': lead.leadScore,
      'Estimated Value': lead.estimatedValue,
      'Assigned To': lead.assignedUser?.firstName + ' ' + lead.assignedUser?.lastName || '',
      'Created At': lead.createdAt,
      'Updated At': lead.updatedAt,
    }));

    return {
      filename: `leads_export_${new Date().toISOString().split('T')[0]}.csv`,
      data: csvData,
      total: leads.total
    };
  }

  private mapImportData(row: any, mapping: any): CreateLeadDto {
    return {
      companyName: row[mapping.companyName],
      contactName: row[mapping.contactName] || '',
      email: row[mapping.email],
      phone: row[mapping.phone],
      source: row[mapping.source] || 'import',
      status: row[mapping.status] || 'new',
      leadScore: row[mapping.leadScore] ? parseInt(row[mapping.leadScore]) : undefined,
      estimatedValue: row[mapping.estimatedValue] ? parseFloat(row[mapping.estimatedValue]) : undefined,
      notes: row[mapping.notes],
      metadata: {
        importedAt: new Date(),
        importSource: 'csv'
      }
    };
  }
}
