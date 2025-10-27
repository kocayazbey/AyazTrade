import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ContractService } from '../services/contract.service';
import { CreateContractDto } from '../dto/create-contract.dto';
import { UpdateContractDto } from '../dto/update-contract.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';

@ApiTags('CRM - Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/crm/contracts')
export class ContractsController {
  constructor(private readonly contractService: ContractService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contract' })
  @ApiResponse({ status: 201, description: 'Contract created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createContractDto: CreateContractDto, @Param('tenantId') tenantId: string, @Param('userId') userId: string) {
    return this.contractService.create(createContractDto, tenantId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all contracts' })
  @ApiResponse({ status: 200, description: 'Contracts retrieved successfully' })
  async findAll(@Query() query: any, @Param('tenantId') tenantId: string) {
    return this.contractService.findAll(tenantId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get contract statistics' })
  @ApiResponse({ status: 200, description: 'Contract statistics retrieved successfully' })
  async getStats(@Param('tenantId') tenantId: string) {
    return this.contractService.getStats(tenantId);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get expiring contracts' })
  @ApiResponse({ status: 200, description: 'Expiring contracts retrieved successfully' })
  async getExpiringContracts(@Query('days') days: number = 30, @Param('tenantId') tenantId: string) {
    return this.contractService.getExpiringContracts(tenantId, days);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a contract by ID' })
  @ApiResponse({ status: 200, description: 'Contract retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async findOne(@Param('id') id: string, @Param('tenantId') tenantId: string) {
    return this.contractService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a contract' })
  @ApiResponse({ status: 200, description: 'Contract updated successfully' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async update(@Param('id') id: string, @Body() updateContractDto: UpdateContractDto, @Param('tenantId') tenantId: string) {
    return this.contractService.update(id, updateContractDto, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a contract' })
  @ApiResponse({ status: 200, description: 'Contract deleted successfully' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async remove(@Param('id') id: string, @Param('tenantId') tenantId: string) {
    return this.contractService.remove(id, tenantId);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate contract' })
  @ApiResponse({ status: 200, description: 'Contract activated successfully' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async activateContract(@Param('id') id: string, @Param('tenantId') tenantId: string) {
    return this.contractService.activateContract(id, tenantId);
  }

  @Post(':id/terminate')
  @ApiOperation({ summary: 'Terminate contract' })
  @ApiResponse({ status: 200, description: 'Contract terminated successfully' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async terminateContract(@Param('id') id: string, @Body() body: { reason?: string }, @Param('tenantId') tenantId: string) {
    return this.contractService.terminateContract(id, tenantId, body.reason);
  }

  @Post(':id/renew')
  @ApiOperation({ summary: 'Renew contract' })
  @ApiResponse({ status: 200, description: 'Contract renewed successfully' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async renewContract(@Param('id') id: string, @Body() body: { newEndDate: Date }, @Param('tenantId') tenantId: string) {
    return this.contractService.renewContract(id, tenantId, body.newEndDate);
  }
}
