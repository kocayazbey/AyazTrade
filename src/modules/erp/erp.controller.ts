import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { Permissions } from '../../core/auth/decorators/permissions.decorator';
import { FinanceService } from './services/finance.service';
import { PersonnelService } from './services/personnel.service';
import { PayrollService } from './services/payroll.service';
import { InvoiceService } from './services/invoice.service';
import { PaymentService } from './services/payment.service';
import { AccountingService } from './services/accounting.service';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';

@ApiTags('ERP - Finance & HR')
@Controller({ path: 'erp', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class ERPController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly personnelService: PersonnelService,
    private readonly payrollService: PayrollService,
    private readonly invoiceService: InvoiceService,
    private readonly paymentService: PaymentService,
    private readonly accountingService: AccountingService,
  ) {}

  // ==================== FINANCE ====================

  @Get('finance/accounts')
  @ApiOperation({ summary: 'Get GL accounts' })
  async getGLAccounts(@CurrentUser('tenantId') tenantId: string, @Query('type') accountType?: string) {
    return this.financeService.getGLAccounts(tenantId, accountType);
  }

  @Post('finance/accounts')
  @ApiOperation({ summary: 'Create GL account' })
  async createGLAccount(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.financeService.createGLAccount(data, tenantId);
  }

  @Get('finance/transactions')
  @ApiOperation({ summary: 'Get transactions' })
  async getTransactions(@CurrentUser('tenantId') tenantId: string, @Query() filters: any) {
    return this.financeService.getTransactions(tenantId, filters);
  }

  @Post('finance/transactions')
  @ApiOperation({ summary: 'Create transaction' })
  async createTransaction(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.financeService.createTransaction(data, tenantId, userId);
  }

  @Post('finance/journal-entries')
  @ApiOperation({ summary: 'Create journal entry' })
  async createJournalEntry(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.financeService.createJournalEntry(data, tenantId, userId);
  }

  @Get('finance/summary')
  @ApiOperation({ summary: 'Get income/expense summary' })
  async getFinancialSummary(
    @CurrentUser('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.financeService.getIncomeExpenseSummary(tenantId, new Date(startDate), new Date(endDate));
  }

  @Get('finance/reports')
  @Roles('admin', 'super_admin', 'finance', 'manager')
  @Permissions('view_finance_reports', 'reports')
  @ApiOperation({ summary: 'Get financial reports' })
  async getFinancialReports(
    @CurrentUser('tenantId') tenantId: string,
    @Query('type') reportType: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.financeService.getFinancialReports(tenantId, reportType, new Date(startDate), new Date(endDate));
  }

  // ==================== HR - PERSONNEL ====================

  @Get('hr/employees')
  @ApiOperation({ summary: 'Get employees' })
  async getEmployees(@CurrentUser('tenantId') tenantId: string, @Query() filters: any) {
    return this.personnelService.getEmployees(tenantId, filters);
  }

  @Post('hr/employees')
  @ApiOperation({ summary: 'Create employee' })
  async createEmployee(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.personnelService.createEmployee(data, tenantId);
  }

  @Get('hr/employees/:id')
  @ApiOperation({ summary: 'Get employee by ID' })
  async getEmployeeById(@Param('id') employeeId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.personnelService.getEmployeeById(employeeId, tenantId);
  }

  @Put('hr/employees/:id')
  @ApiOperation({ summary: 'Update employee' })
  async updateEmployee(@Param('id') employeeId: string, @Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.personnelService.updateEmployee(employeeId, data, tenantId);
  }

  @Post('hr/employees/:id/terminate')
  @ApiOperation({ summary: 'Terminate employee' })
  async terminateEmployee(
    @Param('id') employeeId: string,
    @Body('terminationDate') terminationDate: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.personnelService.terminateEmployee(employeeId, new Date(terminationDate), tenantId);
  }

  @Get('hr/employees/statistics/active-count')
  @ApiOperation({ summary: 'Get active employees count' })
  async getActiveEmployeesCount(@CurrentUser('tenantId') tenantId: string) {
    return this.personnelService.getActiveEmployeesCount(tenantId);
  }

  @Get('hr/employees/statistics/by-department')
  @ApiOperation({ summary: 'Get employees by department' })
  async getEmployeesByDepartment(@CurrentUser('tenantId') tenantId: string) {
    return this.personnelService.getEmployeesByDepartment(tenantId);
  }

  // ==================== HR - ATTENDANCE ====================

  @Post('hr/attendance')
  @ApiOperation({ summary: 'Record attendance' })
  async recordAttendance(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.personnelService.recordAttendance(data, tenantId);
  }

  @Get('hr/attendance/:employeeId')
  @ApiOperation({ summary: 'Get attendance records' })
  async getAttendance(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.personnelService.getAttendance(employeeId, new Date(startDate), new Date(endDate), tenantId);
  }

  // ==================== HR - LEAVE REQUESTS ====================

  @Post('hr/leave-requests')
  @ApiOperation({ summary: 'Create leave request' })
  async createLeaveRequest(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.personnelService.createLeaveRequest(data, tenantId);
  }

  @Post('hr/leave-requests/:id/approve')
  @ApiOperation({ summary: 'Approve leave request' })
  async approveLeaveRequest(
    @Param('id') leaveRequestId: string,
    @CurrentUser('id') approverId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.personnelService.approveLeaveRequest(leaveRequestId, approverId, tenantId);
  }

  @Post('hr/leave-requests/:id/reject')
  @ApiOperation({ summary: 'Reject leave request' })
  async rejectLeaveRequest(
    @Param('id') leaveRequestId: string,
    @Body('reason') reason: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.personnelService.rejectLeaveRequest(leaveRequestId, reason, tenantId);
  }

  // ==================== HR - PERFORMANCE ====================

  @Post('hr/performance-reviews')
  @ApiOperation({ summary: 'Create performance review' })
  async createPerformanceReview(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.personnelService.createPerformanceReview(data, tenantId);
  }

  // ==================== HR - PAYROLL ====================

  @Get('hr/payroll')
  @ApiOperation({ summary: 'Get payroll records' })
  async getPayrolls(@CurrentUser('tenantId') tenantId: string, @Query() filters: any) {
    return this.payrollService.getPayrolls(tenantId, filters);
  }

  @Post('hr/payroll/generate')
  @ApiOperation({ summary: 'Generate payroll' })
  async generatePayroll(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.payrollService.generatePayroll(data.employeeId, data.periodStart, data.periodEnd, tenantId, userId);
  }

  @Post('hr/payroll/:id/approve')
  @ApiOperation({ summary: 'Approve payroll' })
  async approvePayroll(@Param('id') payrollId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.payrollService.approvePayroll(payrollId, tenantId);
  }

  @Post('hr/payroll/:id/pay')
  @ApiOperation({ summary: 'Process payroll payment' })
  async processPayment(@Param('id') payrollId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.payrollService.processPayment(payrollId, tenantId);
  }

  @Get('hr/payroll/summary')
  @ApiOperation({ summary: 'Get payroll summary' })
  async getPayrollSummary(
    @CurrentUser('tenantId') tenantId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.payrollService.getPayrollSummary(tenantId, new Date(periodStart), new Date(periodEnd));
  }

  // ==================== INVOICES ====================

  @Get('invoices')
  @ApiOperation({ summary: 'Get invoices' })
  async getInvoices(@CurrentUser('tenantId') tenantId: string, @Query() filters: any) {
    return this.invoiceService.getInvoices(tenantId, filters);
  }

  @Post('invoices')
  @ApiOperation({ summary: 'Create invoice' })
  async createInvoice(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.invoiceService.createInvoice(data, tenantId, userId);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  async getInvoiceById(@Param('id') invoiceId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.invoiceService.getInvoiceById(invoiceId, tenantId);
  }

  @Put('invoices/:id')
  @ApiOperation({ summary: 'Update invoice' })
  async updateInvoice(@Param('id') invoiceId: string, @Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.invoiceService.updateInvoice(invoiceId, data, tenantId);
  }

  @Post('invoices/:id/send')
  @ApiOperation({ summary: 'Send invoice' })
  async sendInvoice(@Param('id') invoiceId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.invoiceService.sendInvoice(invoiceId, tenantId);
  }

  // ==================== PAYMENTS ====================

  @Get('payments')
  @ApiOperation({ summary: 'Get payments' })
  async getPayments(@CurrentUser('tenantId') tenantId: string, @Query() filters: any) {
    return this.paymentService.getPayments(tenantId, filters);
  }

  @Post('payments')
  @ApiOperation({ summary: 'Create payment' })
  async createPayment(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.paymentService.createPayment(data, tenantId, userId);
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Get payment by ID' })
  async getPaymentById(@Param('id') paymentId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.paymentService.getPaymentById(paymentId, tenantId);
  }

  @Put('payments/:id')
  @ApiOperation({ summary: 'Update payment' })
  async updatePayment(@Param('id') paymentId: string, @Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.paymentService.updatePayment(paymentId, data, tenantId);
  }

  // ==================== ACCOUNTING ====================

  @Get('accounting/journal-entries')
  @ApiOperation({ summary: 'Get journal entries' })
  async getJournalEntries(@CurrentUser('tenantId') tenantId: string, @Query() filters: any) {
    return this.accountingService.getJournalEntries(tenantId, filters);
  }

  @Post('accounting/journal-entries')
  @ApiOperation({ summary: 'Create journal entry' })
  async createJournalEntry(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.accountingService.createJournalEntry(data, tenantId, userId);
  }

  @Get('accounting/chart-of-accounts')
  @ApiOperation({ summary: 'Get chart of accounts' })
  async getChartOfAccounts(@CurrentUser('tenantId') tenantId: string) {
    return this.accountingService.getChartOfAccounts(tenantId);
  }

  @Post('accounting/chart-of-accounts')
  @ApiOperation({ summary: 'Create account' })
  async createAccount(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.accountingService.createAccount(data, tenantId);
  }
}

