import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { QuoteService } from '../services/quote.service';
import { CreateQuoteDto } from '../dto/create-quote.dto';
import { UpdateQuoteDto } from '../dto/update-quote.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';

@ApiTags('CRM - Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/crm/quotes')
export class QuotesController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new quote' })
  @ApiResponse({ status: 201, description: 'Quote created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createQuoteDto: CreateQuoteDto, @Param('tenantId') tenantId: string, @Param('userId') userId: string) {
    return this.quoteService.create(createQuoteDto, tenantId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all quotes' })
  @ApiResponse({ status: 200, description: 'Quotes retrieved successfully' })
  async findAll(@Query() query: any, @Param('tenantId') tenantId: string) {
    return this.quoteService.findAll(tenantId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get quote statistics' })
  @ApiResponse({ status: 200, description: 'Quote statistics retrieved successfully' })
  async getStats(@Param('tenantId') tenantId: string) {
    return this.quoteService.getStats(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a quote by ID' })
  @ApiResponse({ status: 200, description: 'Quote retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async findOne(@Param('id') id: string, @Param('tenantId') tenantId: string) {
    return this.quoteService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a quote' })
  @ApiResponse({ status: 200, description: 'Quote updated successfully' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async update(@Param('id') id: string, @Body() updateQuoteDto: UpdateQuoteDto, @Param('tenantId') tenantId: string) {
    return this.quoteService.update(id, updateQuoteDto, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a quote' })
  @ApiResponse({ status: 200, description: 'Quote deleted successfully' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async remove(@Param('id') id: string, @Param('tenantId') tenantId: string) {
    return this.quoteService.remove(id, tenantId);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send quote to customer' })
  @ApiResponse({ status: 200, description: 'Quote sent successfully' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async sendQuote(@Param('id') id: string, @Param('tenantId') tenantId: string) {
    return this.quoteService.sendQuote(id, tenantId);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept quote' })
  @ApiResponse({ status: 200, description: 'Quote accepted successfully' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async acceptQuote(@Param('id') id: string, @Param('tenantId') tenantId: string) {
    return this.quoteService.acceptQuote(id, tenantId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject quote' })
  @ApiResponse({ status: 200, description: 'Quote rejected successfully' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async rejectQuote(@Param('id') id: string, @Body() body: { reason?: string }, @Param('tenantId') tenantId: string) {
    return this.quoteService.rejectQuote(id, tenantId, body.reason);
  }
}
