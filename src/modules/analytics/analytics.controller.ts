import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AnalyticsFilterDto } from './dto/analytics-filter.dto';

@ApiTags('Analytics - Dashboard Analytics')
@Controller({ path: 'analytics', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('recent-activities')
  @ApiOperation({ summary: 'Get recent activities' })
  @ApiResponse({ status: 200, description: 'Returns recent activities' })
  async getRecentActivities(
    @Query() filterDto: AnalyticsFilterDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.analyticsService.getRecentActivities(filterDto, tenantId);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get top products' })
  @ApiResponse({ status: 200, description: 'Returns top products' })
  async getTopProducts(
    @Query() filterDto: AnalyticsFilterDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.analyticsService.getTopProducts(filterDto, tenantId);
  }

  @Get('order-status')
  @ApiOperation({ summary: 'Get order status distribution' })
  @ApiResponse({ status: 200, description: 'Returns order status distribution' })
  async getOrderStatus(
    @Query() filterDto: AnalyticsFilterDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.analyticsService.getOrderStatus(filterDto, tenantId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard analytics' })
  @ApiResponse({ status: 200, description: 'Returns dashboard analytics' })
  async getDashboard(
    @Query('period') period: string = '30d',
    @Query('compare') compare: string = 'false',
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.analyticsService.getDashboardAnalytics(
      period,
      compare === 'true',
      tenantId
    );
  }
}

