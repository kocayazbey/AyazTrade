import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('order-confirmation')
  @Roles('admin', 'editor')
  async sendOrderConfirmation(@Body() orderData: {
    userId: string;
    orderId: string;
    userEmail: string;
    phoneNumber?: string;
    deviceToken?: string;
  }) {
    const { userId, orderId, userEmail, phoneNumber, deviceToken } = orderData;
    
    const result = await this.notificationsService.sendOrderConfirmation(
      userId,
      orderId,
      userEmail,
      phoneNumber,
      deviceToken
    );
    
    return {
      success: result.success,
      message: 'Order confirmation notifications sent',
      result,
    };
  }

  @Post('order-status-update')
  @Roles('admin', 'editor')
  async sendOrderStatusUpdate(@Body() statusData: {
    userId: string;
    orderId: string;
    status: string;
    userEmail: string;
    phoneNumber?: string;
    deviceToken?: string;
  }) {
    const { userId, orderId, status, userEmail, phoneNumber, deviceToken } = statusData;
    
    const result = await this.notificationsService.sendOrderStatusUpdate(
      userId,
      orderId,
      status,
      userEmail,
      phoneNumber,
      deviceToken
    );
    
    return {
      success: result.success,
      message: 'Order status update notifications sent',
      result,
    };
  }

  @Post('order-cancellation')
  @Roles('admin', 'editor')
  async sendOrderCancellation(@Body() cancellationData: {
    userId: string;
    orderId: string;
    reason: string;
    userEmail: string;
    phoneNumber?: string;
    deviceToken?: string;
  }) {
    const { userId, orderId, reason, userEmail, phoneNumber, deviceToken } = cancellationData;
    
    const result = await this.notificationsService.sendOrderCancellation(
      userId,
      orderId,
      reason,
      userEmail,
      phoneNumber,
      deviceToken
    );
    
    return {
      success: result.success,
      message: 'Order cancellation notifications sent',
      result,
    };
  }

  @Post('password-reset')
  @Roles('admin', 'editor')
  async sendPasswordReset(@Body() resetData: {
    userEmail: string;
    resetToken: string;
    phoneNumber?: string;
    resetCode?: string;
  }) {
    const { userEmail, resetToken, phoneNumber, resetCode } = resetData;
    
    const result = await this.notificationsService.sendPasswordReset(
      userEmail,
      resetToken,
      phoneNumber,
      resetCode
    );
    
    return {
      success: result.success,
      message: 'Password reset notifications sent',
      result,
    };
  }

  @Post('verification-code')
  @Roles('admin', 'editor')
  async sendVerificationCode(@Body() verificationData: {
    phoneNumber: string;
    code: string;
  }) {
    const { phoneNumber, code } = verificationData;
    
    const result = await this.notificationsService.sendVerificationCode(phoneNumber, code);
    
    return {
      success: result.success,
      message: 'Verification code sent',
      result,
    };
  }

  @Post('promotional-campaign')
  @Roles('admin')
  async sendPromotionalCampaign(@Body() campaignData: {
    title: string;
    description: string;
    discountCode?: string;
    discountPercentage?: number;
    recipients: {
      emails?: string[];
      phoneNumbers?: string[];
      deviceTokens?: string[];
    };
  }) {
    const result = await this.notificationsService.sendPromotionalCampaign(campaignData);
    
    return {
      success: result.success,
      message: 'Promotional campaign sent',
      result,
    };
  }
}