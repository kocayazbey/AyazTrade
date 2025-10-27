import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { RequireCsrf } from '../../core/decorators/security.decorator';
import { SuppliersService } from './suppliers.service';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { Roles } from '../../core/auth/decorators/roles.decorator';

@ApiTags('Suppliers - Supplier Management')
@Controller({ path: 'suppliers', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @Roles('admin', 'super_admin', 'manager', 'product_manager', 'warehouse_manager')
  @ApiOperation({ summary: 'Get suppliers with filters' })
  @ApiResponse({ status: 200, description: 'Returns paginated suppliers list' })
  async getSuppliers(@Query() query: any) {
    return this.suppliersService.getSuppliers(query);
  }

  @Get(':id')
  @Roles('admin', 'super_admin', 'manager', 'product_manager', 'warehouse_manager')
  @ApiOperation({ summary: 'Get supplier by ID' })
  async getSupplierById(@Param('id') supplierId: string) {
    return this.suppliersService.getSupplierById(supplierId);
  }

  @Post()
  @Roles('admin', 'super_admin')
  @RequireCsrf()
  @ApiOperation({ summary: 'Create supplier (Admin only)' })
  async createSupplier(@Body() data: CreateSupplierDto, @CurrentUser('id') userId: string) {
    return this.suppliersService.createSupplier(data, userId);
  }

  @Put(':id')
  @Roles('admin', 'super_admin')
  @RequireCsrf()
  @ApiOperation({ summary: 'Update supplier (Admin only)' })
  async updateSupplier(@Param('id') supplierId: string, @Body() data: any) {
    return this.suppliersService.updateSupplier(supplierId, data);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @RequireCsrf()
  @ApiOperation({ summary: 'Delete supplier (Admin only)' })
  async deleteSupplier(@Param('id') supplierId: string) {
    return this.suppliersService.deleteSupplier(supplierId);
  }

  @Patch(':id/status')
  @Roles('admin', 'super_admin')
  @RequireCsrf()
  @ApiOperation({ summary: 'Update supplier status' })
  async updateSupplierStatus(@Param('id') supplierId: string, @Body() data: any) {
    return this.suppliersService.updateSupplierStatus(supplierId, data.status);
  }
}
