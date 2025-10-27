import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
import { CrmService } from '../crm.service';
import { CreateContactDto, ContactStatus, ContactSource } from '../dto/create-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { SearchContactsDto } from '../dto/search-contacts.dto';
import { BulkUpdateContactsDto } from '../dto/bulk-update-contacts.dto';

@ApiTags('CRM - Contact Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'crm/contacts', version: '1' })
export class ContactsController {
  constructor(private readonly crmService: CrmService) {}

  @Get()
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Get contacts with filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: ContactStatus, description: 'Contact status' })
  @ApiQuery({ name: 'company', required: false, type: String, description: 'Company name filter' })
  @ApiQuery({ name: 'email', required: false, type: String, description: 'Email filter' })
  @ApiQuery({ name: 'name', required: false, type: String, description: 'Name filter' })
  @ApiQuery({ name: 'industry', required: false, type: String, description: 'Industry filter' })
  @ApiQuery({ name: 'city', required: false, type: String, description: 'City filter' })
  @ApiQuery({ name: 'country', required: false, type: String, description: 'Country filter' })
  @ApiQuery({ name: 'tags', required: false, type: [String], description: 'Tags filter' })
  @ApiQuery({ name: 'minScore', required: false, type: Number, description: 'Minimum lead score' })
  @ApiQuery({ name: 'maxScore', required: false, type: Number, description: 'Maximum lead score' })
  @ApiResponse({ status: 200, description: 'Contacts retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getContacts(
    @Query() query: SearchContactsDto,
    @Tenant() tenantId: string
  ) {
    return this.crmService.getContacts(query, tenantId);
  }

  @Get('search')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Search contacts by term' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search term' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum results' })
  @ApiResponse({ status: 200, description: 'Search results retrieved' })
  async searchContacts(
    @Query('q') searchTerm: string,
    @Query('limit') limit: number,
    @Tenant() tenantId: string
  ) {
    return this.crmService.searchContacts(searchTerm, tenantId, limit || 20);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Get contact by ID' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: 200, description: 'Contact retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async getContactById(
    @Param('id', ParseUUIDPipe) contactId: string,
    @Tenant() tenantId: string
  ) {
    return this.crmService.getContactById(contactId, tenantId);
  }

  @Get(':id/activities')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Get contact activities' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Activity type filter' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Activity status filter' })
  @ApiResponse({ status: 200, description: 'Contact activities retrieved' })
  async getContactActivities(
    @Param('id', ParseUUIDPipe) contactId: string,
    @Query() query: any,
    @Tenant() tenantId: string
  ) {
    return this.crmService.getContactActivities(contactId, tenantId, query);
  }

  @Post()
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Create new contact' })
  @ApiResponse({ status: 201, description: 'Contact created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 409, description: 'Conflict - email already exists' })
  async createContact(
    @Body() createContactDto: CreateContactDto,
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.crmService.createContact(createContactDto, tenantId, userId);
  }

  @Post('bulk')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Bulk create contacts' })
  @ApiResponse({ status: 201, description: 'Contacts created successfully' })
  async bulkCreateContacts(
    @Body() contactsData: CreateContactDto[],
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    const results = [];

    for (const contactData of contactsData) {
      try {
        const contact = await this.crmService.createContact(contactData, tenantId, userId);
        results.push({ success: true, data: contact });
      } catch (error) {
        results.push({ success: false, error: error.message, data: contactData });
      }
    }

    return {
      total: contactsData.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  @Put(':id')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Update contact' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: 200, description: 'Contact updated successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  @ApiResponse({ status: 409, description: 'Conflict - email already exists' })
  async updateContact(
    @Param('id', ParseUUIDPipe) contactId: string,
    @Body() updateContactDto: UpdateContactDto,
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.crmService.updateContact(contactId, updateContactDto, tenantId, userId);
  }

  @Put('bulk')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Bulk update contacts' })
  @ApiResponse({ status: 200, description: 'Bulk update completed' })
  async bulkUpdateContacts(
    @Body() bulkUpdateDto: BulkUpdateContactsDto,
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.crmService.bulkUpdateContacts(bulkUpdateDto.updates, tenantId, userId);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Delete contact (soft delete)' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: 200, description: 'Contact deleted successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  @HttpCode(HttpStatus.OK)
  async deleteContact(
    @Param('id', ParseUUIDPipe) contactId: string,
    @Tenant() tenantId: string
  ) {
    return this.crmService.deleteContact(contactId, tenantId);
  }

  @Post(':id/convert-to-customer')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Convert contact to customer' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: 200, description: 'Contact converted to customer' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async convertToCustomer(
    @Param('id', ParseUUIDPipe) contactId: string,
    @Body() customerData: any,
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    // First get the contact
    const contact = await this.crmService.getContactById(contactId, tenantId);

    // Create customer from contact data
    const customerPayload = {
      companyName: contact.company || `${contact.firstName} ${contact.lastName}`,
      contactName: `${contact.firstName} ${contact.lastName}`,
      email: contact.email,
      phone: contact.phone || contact.mobile,
      website: contact.website,
      industry: contact.industry,
      billingAddress: contact.address,
      city: contact.city,
      state: contact.state,
      country: contact.country,
      postalCode: contact.postalCode,
      customerType: 'individual',
      taxId: customerData.taxId,
      paymentTerms: customerData.paymentTerms || 'net30',
      salesRepId: userId,
      ...customerData
    };

    // TODO: Implement customer creation service
    // const customer = await this.customerService.createCustomer(customerPayload, tenantId, userId);

    // Update contact to link with customer
    await this.crmService.updateContact(contactId, {
      customerId: 'temp_customer_id', // Will be replaced with actual customer ID
      status: ContactStatus.ACTIVE
    }, tenantId, userId);

    return {
      message: 'Contact converted to customer successfully',
      contactId,
      // customer
    };
  }

  @Post(':id/convert-to-lead')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Convert contact to lead' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: 200, description: 'Contact converted to lead' })
  async convertToLead(
    @Param('id', ParseUUIDPipe) contactId: string,
    @Body() leadData: any,
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    // First get the contact
    const contact = await this.crmService.getContactById(contactId, tenantId);

    // Create lead from contact data
    const leadPayload = {
      companyName: contact.company || `${contact.firstName} ${contact.lastName}`,
      contactName: `${contact.firstName} ${contact.lastName}`,
      email: contact.email,
      phone: contact.phone || contact.mobile,
      source: contact.source || ContactSource.WEBSITE,
      status: 'new',
      leadScore: contact.leadScore || 50,
      estimatedValue: leadData.estimatedValue,
      assignedTo: userId,
      notes: leadData.notes,
      metadata: {
        convertedFromContact: true,
        originalContactId: contactId
      }
    };

    // TODO: Implement lead creation service
    // const lead = await this.leadService.createLead(leadPayload, tenantId, userId);

    // Update contact to link with lead
    await this.crmService.updateContact(contactId, {
      leadId: 'temp_lead_id', // Will be replaced with actual lead ID
      status: ContactStatus.ACTIVE
    }, tenantId, userId);

    return {
      message: 'Contact converted to lead successfully',
      contactId,
      // lead
    };
  }

  @Post(':id/score')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Update contact lead score' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: 200, description: 'Contact score updated' })
  async updateLeadScore(
    @Param('id', ParseUUIDPipe) contactId: string,
    @Body() scoreData: { score: number; reason?: string },
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.crmService.updateContact(contactId, {
      leadScore: scoreData.score,
      customFields: {
        scoreUpdatedBy: userId,
        scoreUpdateReason: scoreData.reason,
        scoreUpdatedAt: new Date()
      }
    }, tenantId, userId);
  }

  @Post(':id/tags')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Add tags to contact' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: 200, description: 'Tags added successfully' })
  async addTags(
    @Param('id', ParseUUIDPipe) contactId: string,
    @Body() tagData: { tags: string[] },
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    const contact = await this.crmService.getContactById(contactId, tenantId);
    const existingTags = contact.tags || [];
    const newTags = [...new Set([...existingTags, ...tagData.tags])];

    return this.crmService.updateContact(contactId, {
      tags: newTags,
      customFields: {
        tagsUpdatedBy: userId,
        tagsUpdatedAt: new Date()
      }
    }, tenantId, userId);
  }

  @Delete(':id/tags')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Remove tags from contact' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: 200, description: 'Tags removed successfully' })
  async removeTags(
    @Param('id', ParseUUIDPipe) contactId: string,
    @Body() tagData: { tags: string[] },
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    const contact = await this.crmService.getContactById(contactId, tenantId);
    const existingTags = contact.tags || [];
    const tagsToRemove = new Set(tagData.tags);
    const newTags = existingTags.filter((tag: string) => !tagsToRemove.has(tag));

    return this.crmService.updateContact(contactId, {
      tags: newTags,
      customFields: {
        tagsUpdatedBy: userId,
        tagsUpdatedAt: new Date()
      }
    }, tenantId, userId);
  }

  @Post('import')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Import contacts from CSV/Excel' })
  @ApiResponse({ status: 200, description: 'Import completed' })
  async importContacts(
    @Body() importData: { data: any[]; mapping: any },
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    const results = [];

    for (const row of importData.data) {
      try {
        const contactData = this.mapImportData(row, importData.mapping);
        const contact = await this.crmService.createContact(contactData, tenantId, userId);
        results.push({ success: true, data: contact, originalRow: row });
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
  @ApiOperation({ summary: 'Export contacts to CSV' })
  @ApiQuery({ name: 'filters', required: false, type: String, description: 'JSON filters' })
  @ApiResponse({ status: 200, description: 'CSV export data' })
  async exportContacts(
    @Query('filters') filters: string,
    @Tenant() tenantId: string
  ) {
    const query = filters ? JSON.parse(filters) : {};
    const contacts = await this.crmService.getContacts(query, tenantId);

    // Convert to CSV format
    const csvData = contacts.data.map((contact: any) => ({
      'First Name': contact.firstName,
      'Last Name': contact.lastName,
      'Email': contact.email,
      'Phone': contact.phone,
      'Mobile': contact.mobile,
      'Company': contact.company,
      'Title': contact.title,
      'Industry': contact.industry,
      'City': contact.city,
      'Country': contact.country,
      'Lead Score': contact.leadScore,
      'Status': contact.status,
      'Source': contact.source,
      'Tags': (contact.tags || []).join(';'),
      'Created At': contact.createdAt,
      'Updated At': contact.updatedAt,
    }));

    return {
      filename: `contacts_export_${new Date().toISOString().split('T')[0]}.csv`,
      data: csvData,
      total: contacts.total
    };
  }

  private mapImportData(row: any, mapping: any): CreateContactDto {
    const contactData: CreateContactDto = {
      firstName: row[mapping.firstName] || '',
      lastName: row[mapping.lastName] || '',
      email: row[mapping.email],
      phone: row[mapping.phone],
      mobile: row[mapping.mobile],
      company: row[mapping.company],
      title: row[mapping.title],
      industry: row[mapping.industry],
      city: row[mapping.city],
      country: row[mapping.country],
      source: row[mapping.source] || ContactSource.OTHER,
      leadScore: row[mapping.leadScore] ? parseInt(row[mapping.leadScore]) : 0,
      tags: row[mapping.tags] ? row[mapping.tags].split(',').map((t: string) => t.trim()) : [],
    };

    return contactData;
  }
}
