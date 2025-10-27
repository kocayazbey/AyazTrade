import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { Tenant } from '../../core/shared/decorators/tenant.decorator';
import { AyazCommService } from './ayaz-comm.service';

@ApiTags('AyazComm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ayaz-comm')
export class AyazCommController {
  constructor(private readonly ayazCommService: AyazCommService) {}

  @Post('send-message')
  @Roles('admin', 'manager', 'user')
  @ApiOperation({ summary: 'Send message via AyazComm' })
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
  async sendMessage(
    @Body() messageData: any,
    @Tenant() tenantId: string
  ) {
    return await this.ayazCommService.sendMessage(messageData, tenantId);
  }

  @Get('messages')
  @Roles('admin', 'manager', 'user')
  @ApiOperation({ summary: 'Get message history' })
  @ApiResponse({ status: 200, description: 'Message history retrieved' })
  async getMessageHistory(
    @Tenant() tenantId: string,
    @Query('limit') limit?: number
  ) {
    return await this.ayazCommService.getMessageHistory(tenantId, limit);
  }

  @Post('channels')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create new channel' })
  @ApiResponse({ status: 201, description: 'Channel created successfully' })
  async createChannel(
    @Body() channelData: any,
    @Tenant() tenantId: string
  ) {
    return await this.ayazCommService.createChannel(channelData, tenantId);
  }

  @Get('channels')
  @Roles('admin', 'manager', 'user')
  @ApiOperation({ summary: 'Get all channels' })
  @ApiResponse({ status: 200, description: 'Channels retrieved' })
  async getChannels(@Tenant() tenantId: string) {
    return await this.ayazCommService.getChannels(tenantId);
  }

  @Post('broadcast')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Broadcast message to multiple channels' })
  @ApiResponse({ status: 200, description: 'Message broadcasted successfully' })
  async broadcastMessage(
    @Body() broadcastData: { message: string; channels: string[] },
    @Tenant() tenantId: string
  ) {
    return await this.ayazCommService.broadcastMessage(
      broadcastData.message,
      broadcastData.channels,
      tenantId
    );
  }
}
