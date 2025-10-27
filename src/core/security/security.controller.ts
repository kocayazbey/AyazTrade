import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IPFilterService } from './ip-filter.service';

@ApiTags('Security')
@Controller({ path: 'security', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SecurityController {
  constructor(private readonly ipFilterService: IPFilterService) {}

  @Get('ip-filter/stats')
  @ApiOperation({ summary: 'Get IP filter statistics' })
  async getIPStats() {
    return this.ipFilterService.getStats();
  }

  @Get('ip-filter/whitelist')
  @ApiOperation({ summary: 'Get IP whitelist' })
  async getWhitelist() {
    return this.ipFilterService.getWhitelist();
  }

  @Get('ip-filter/blacklist')
  @ApiOperation({ summary: 'Get IP blacklist' })
  async getBlacklist() {
    return this.ipFilterService.getBlacklist();
  }

  @Post('ip-filter/whitelist')
  @ApiOperation({ summary: 'Add IP to whitelist' })
  async addToWhitelist(@Body() data: any) {
    await this.ipFilterService.addToWhitelist(data);
    return { success: true };
  }

  @Post('ip-filter/blacklist')
  @ApiOperation({ summary: 'Add IP to blacklist' })
  async addToBlacklist(@Body() data: any) {
    await this.ipFilterService.addToBlacklist(data);
    return { success: true };
  }

  @Delete('ip-filter/whitelist/:ip')
  @ApiOperation({ summary: 'Remove IP from whitelist' })
  async removeFromWhitelist(@Param('ip') ip: string) {
    await this.ipFilterService.removeFromWhitelist(ip);
    return { success: true };
  }
}

