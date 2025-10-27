import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create payment with idempotency support',
    description: 'Creates a payment with optional idempotency key to prevent duplicate processing. If idempotencyKey is provided, the same request will return the same result within 24 hours.'
  })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  @ApiResponse({ status: 409, description: 'Payment already exists (idempotency)' })
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.createPayment(createPaymentDto);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm payment' })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  async confirmPayment(@Param('id') id: string, @Body() confirmationData?: any) {
    return this.paymentsService.confirmPayment(id, confirmationData);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Refund payment' })
  @ApiResponse({ status: 200, description: 'Payment refunded successfully' })
  async refundPayment(@Param('id') id: string, @Body() refundDto: RefundPaymentDto) {
    return this.paymentsService.refundPayment(id, refundDto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel payment' })
  @ApiResponse({ status: 200, description: 'Payment cancelled successfully' })
  async cancelPayment(@Param('id') id: string) {
    return this.paymentsService.cancelPayment(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment details retrieved' })
  async getPayment(@Param('id') id: string) {
    return this.paymentsService.getPaymentById(id);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get payments by order ID' })
  @ApiResponse({ status: 200, description: 'Payment list retrieved' })
  async getPaymentsByOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentsByOrderId(orderId);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get payment analytics' })
  @ApiResponse({ status: 200, description: 'Payment analytics retrieved' })
  async getAnalytics(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.paymentsService.getPaymentAnalytics(new Date(startDate), new Date(endDate));
  }
}

