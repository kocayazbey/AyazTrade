import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { Permissions } from '../../core/auth/decorators/permissions.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AdminService } from './admin.service';

@ApiTags('Admin Panel')
@Controller({ path: 'admin', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions('view_dashboard')
  @ApiOperation({ summary: 'Get admin dashboard data' })
  @ApiResponse({ status: 200, description: 'Returns dashboard statistics and overview' })
  async getDashboard(@CurrentUser('tenantId') tenantId: string) {
    return this.adminService.getDashboardData(tenantId);
  }

  @Get('stats')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions('view_stats')
  @ApiOperation({ summary: 'Get system statistics' })
  @ApiResponse({ status: 200, description: 'Returns system statistics' })
  async getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.adminService.getSystemStats(tenantId);
  }

  // ==================== USER MANAGEMENT ====================

  @Get('users')
  @Roles('admin', 'super_admin')
  @Permissions('view_users')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Returns paginated users list' })
  async getUsers(@Query() filters: any, @CurrentUser('tenantId') tenantId: string) {
    return this.adminService.getUsers(filters, tenantId);
  }

  @Get('users/:id')
  @Roles('admin', 'super_admin')
  @Permissions('view_users')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'Returns user details' })
  async getUser(@Param('id') userId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.adminService.getUser(userId, tenantId);
  }

  @Post('users')
  @Roles('admin', 'super_admin')
  @Permissions('create_users')
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async createUser(@Body() userData: any, @CurrentUser('tenantId') tenantId: string) {
    return this.adminService.createUser(userData, tenantId);
  }

  @Put('users/:id')
  @Roles('admin', 'super_admin')
  @Permissions('edit_users')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async updateUser(
    @Param('id') userId: string,
    @Body() userData: any,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.adminService.updateUser(userId, userData, tenantId);
  }

  @Delete('users/:id')
  @Roles('super_admin')
  @Permissions('delete_users')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(@Param('id') userId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.adminService.deleteUser(userId, tenantId);
  }

  // ==================== ROLE MANAGEMENT ====================

  @Get('roles')
  @Roles('admin', 'super_admin')
  @Permissions('view_roles')
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({ status: 200, description: 'Returns roles list' })
  async getRoles(@CurrentUser('tenantId') tenantId: string) {
    return this.adminService.getRoles(tenantId);
  }

  @Get('permissions')
  @Roles('admin', 'super_admin')
  @Permissions('view_permissions')
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({ status: 200, description: 'Returns permissions list' })
  async getPermissions(@CurrentUser('tenantId') tenantId: string) {
    return this.adminService.getPermissions(tenantId);
  }

  @Post('roles')
  @Roles('super_admin')
  @Permissions('create_roles')
  @ApiOperation({ summary: 'Create new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  async createRole(@Body() roleData: any, @CurrentUser('tenantId') tenantId: string) {
    return this.adminService.createRole(roleData, tenantId);
  }

  @Put('roles/:id')
  @Roles('super_admin')
  @Permissions('edit_roles')
  @ApiOperation({ summary: 'Update role' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  async updateRole(
    @Param('id') roleId: string,
    @Body() roleData: any,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.adminService.updateRole(roleId, roleData, tenantId);
  }

  @Delete('roles/:id')
  @Roles('super_admin')
  @Permissions('delete_roles')
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  async deleteRole(@Param('id') roleId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.adminService.deleteRole(roleId, tenantId);
  }

  // ==================== SYSTEM SETTINGS ====================

  @Get('settings')
  @Roles('admin', 'super_admin')
  @Permissions('view_settings')
  @ApiOperation({ summary: 'Get system settings' })
  @ApiResponse({ status: 200, description: 'Returns system settings' })
  async getSettings(@CurrentUser('tenantId') tenantId: string) {
    return this.adminService.getSettings(tenantId);
  }

  @Put('settings')
  @Roles('admin', 'super_admin')
  @Permissions('edit_settings')
  @ApiOperation({ summary: 'Update system settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSettings(@Body() settings: any, @CurrentUser('tenantId') tenantId: string) {
    return this.adminService.updateSettings(settings, tenantId);
  }

  // ==================== AUDIT LOGS ====================

  @Get('audit-logs')
  @Roles('admin', 'super_admin')
  @Permissions('view_audit_logs')
  @ApiOperation({ summary: 'Get audit logs' })
  @ApiResponse({ status: 200, description: 'Returns audit logs' })
  async getAuditLogs(@Query() filters: any, @CurrentUser('tenantId') tenantId: string) {
    return this.adminService.getAuditLogs(filters, tenantId);
  }

  // ==================== SYSTEM HEALTH ====================

  @Get('health')
  @Roles('admin', 'super_admin')
  @Permissions('view_system_health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'Returns system health information' })
  async getSystemHealth(@CurrentUser('tenantId') tenantId: string) {
    return this.adminService.getSystemHealth(tenantId);
  }

  // ==================== BACKUP & RESTORE ====================

  @Post('backup')
  @Roles('super_admin')
  @Permissions('manage_backups')
  @ApiOperation({ summary: 'Create system backup' })
  @ApiResponse({ status: 200, description: 'Backup created successfully' })
  async createBackup(@CurrentUser('tenantId') tenantId: string) {
    return this.adminService.createBackup(tenantId);
  }

  @Get('backups')
  @Roles('admin', 'super_admin')
  @Permissions('view_backups')
  @ApiOperation({ summary: 'Get available backups' })
  @ApiResponse({ status: 200, description: 'Returns available backups' })
  async getBackups(@CurrentUser('tenantId') tenantId: string) {
    return this.adminService.getBackups(tenantId);
  }

  @Post('restore/:backupId')
  @Roles('super_admin')
  @Permissions('manage_backups')
  @ApiOperation({ summary: 'Restore from backup' })
  @ApiResponse({ status: 200, description: 'System restored successfully' })
  async restoreBackup(
    @Param('backupId') backupId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.adminService.restoreBackup(backupId, tenantId);
  }
}

