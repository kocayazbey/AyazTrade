import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { OrdersService } from '../../src/modules/ayaz-comm/orders/orders.service';
import { CacheService } from '../../src/core/cache/cache.service';
import { EventBusService } from '../../src/core/events/event-bus.service';
import { LoggerService } from '../../src/core/logger/winston-logger.service';
import { CreateOrderDto } from '../../src/modules/ayaz-comm/orders/dto/create-order.dto';
import { UpdateOrderDto } from '../../src/modules/ayaz-comm/orders/dto/update-order.dto';
import { OrderSearchDto } from '../../src/modules/ayaz-comm/orders/dto/order-search.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let cacheService: CacheService;
  let eventBusService: EventBusService;
  let loggerService: LoggerService;

  const mockOrder: any = {
    id: '1',
    orderNumber: 'ORD-2024-001',
    customerId: '1',
    customer: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    },
    items: [
      {
        productId: '1',
        product: {
          id: '1',
          name: 'Test Product',
          sku: 'TEST-001',
        },
        quantity: 2,
        price: 99.99,
        total: 199.98,
      },
    ],
    subtotal: 199.98,
    tax: 19.98,
    shipping: 10.00,
    discount: 0,
    total: 229.96,
    status: 'pending',
    paymentStatus: 'pending',
    shippingAddress: {
      street: '123 Main St',
      city: 'Test City',
      state: 'Test State',
      zipCode: '12345',
      country: 'Test Country',
    },
    billingAddress: {
      street: '123 Main St',
      city: 'Test City',
      state: 'Test State',
      zipCode: '12345',
      country: 'Test Country',
    },
    paymentMethod: 'credit_card',
    notes: '',
    tenantId: 'test-tenant',
    createdBy: '1',
    updatedBy: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateOrderDto: CreateOrderDto = {
    customerId: '1' as any,
    items: [
      {
        productId: '1' as any,
        quantity: 2,
        price: 99.99,
        options: {},
      },
    ],
    shippingAddress: {
      street: '123 Main St',
      city: 'Test City',
      state: 'Test State',
      zipCode: '12345',
      country: 'Test Country',
    } as any,
    billingAddress: {
      street: '123 Main St',
      city: 'Test City',
      state: 'Test State',
      zipCode: '12345',
      country: 'Test Country',
    } as any,
    paymentMethod: 'credit_card' as any,
    notes: 'Test order',
  } as any;

  const mockUpdateOrderDto: UpdateOrderDto = {
    status: 'processing' as any,
    notes: 'Updated notes',
  } as any;

  const mockSearchDto: OrderSearchDto = {
    status: 'pending' as any,
    paymentStatus: 'pending' as any,
    customerId: '1' as any,
    dateFrom: new Date(),
    dateTo: new Date(),
    minTotal: 0,
    maxTotal: 1000,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            deletePattern: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    cacheService = module.get<CacheService>(CacheService);
    eventBusService = module.get<EventBusService>(EventBusService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new order successfully', async () => {
      const mockCreate = jest.spyOn(service as any, 'createOrder').mockResolvedValue(mockOrder);

      const result = await service.create(mockCreateOrderDto, 'test-tenant', '1');

      expect(mockCreate).toHaveBeenCalledWith(mockCreateOrderDto, 'test-tenant', '1');
      expect(result).toEqual(mockOrder);
      expect(result.orderNumber).toMatch(/^ORD-\d{4}-\d{3}$/);
      expect(eventBusService.publish).toHaveBeenCalledWith('order.created', expect.any(Object));
    });

    it('should calculate order totals correctly', async () => {
      jest.spyOn(service as any, 'createOrder').mockResolvedValue(mockOrder);

      const result = await service.create(mockCreateOrderDto, 'test-tenant', '1');

      expect(result.subtotal).toBe(199.98);
      expect(result.tax).toBe(19.98);
      expect(result.total).toBe(229.96);
    });

    it('should throw BadRequestException for invalid order data', async () => {
      const invalidDto = { ...mockCreateOrderDto, items: [] };

      await expect(service.create(invalidDto as any, 'test-tenant', '1')).rejects.toThrow(BadRequestException);
    });

    it('should handle insufficient stock error', async () => {
      jest.spyOn(service as any, 'createOrder').mockRejectedValue(new BadRequestException('Insufficient stock'));

      await expect(service.create(mockCreateOrderDto, 'test-tenant', '1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      const mockOrders = [mockOrder];
      const mockFindAll = jest.spyOn(service as any, 'findAllOrders').mockResolvedValue({
        data: mockOrders,
        total: 1,
        page: 1,
        limit: 10,
      });

      const result = await service.findAll(mockSearchDto, 'test-tenant');

      expect(mockFindAll).toHaveBeenCalledWith(mockSearchDto, 'test-tenant');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
    });

    it('should use cache for order search', async () => {
      const cachedResult = { data: [mockOrder], total: 1, page: 1, limit: 10 };
      jest.spyOn(cacheService, 'get').mockResolvedValue(cachedResult);

      const result = await service.findAll(mockSearchDto, 'test-tenant');

      expect(cacheService.get).toHaveBeenCalled();
      expect(result).toEqual(cachedResult);
    });
  });

  describe('findOne', () => {
    it('should return a single order', async () => {
      const mockFindOne = jest.spyOn(service as any, 'findOneOrder').mockResolvedValue(mockOrder);

      const result = await service.findOne('1', 'test-tenant');

      expect(mockFindOne).toHaveBeenCalledWith('1', 'test-tenant');
      expect(result).toEqual(mockOrder);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent order', async () => {
      jest.spyOn(service as any, 'findOneOrder').mockResolvedValue(null);

      await expect(service.findOne('999', 'test-tenant')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update order successfully', async () => {
      const mockUpdate = jest.spyOn(service as any, 'updateOrder').mockResolvedValue({
        ...mockOrder,
        ...mockUpdateOrderDto,
      });

      const result = await service.update('1', mockUpdateOrderDto, 'test-tenant', '1');

      expect(mockUpdate).toHaveBeenCalledWith('1', mockUpdateOrderDto, 'test-tenant', '1');
      expect(result).toEqual(expect.objectContaining(mockUpdateOrderDto));
      expect(cacheService.del).toHaveBeenCalled();
      expect(eventBusService.publish).toHaveBeenCalledWith('order.updated', expect.any(Object));
    });

    it('should prevent invalid status transitions', async () => {
      jest.spyOn(service as any, 'updateOrder').mockRejectedValue(new BadRequestException('Invalid status transition'));

      await expect(service.update('1', { status: 'shipped' as any }, 'test-tenant', '1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('status management', () => {
    it('should update order status successfully', async () => {
      const mockUpdateStatus = jest.spyOn(service as any, 'updateOrderStatus').mockResolvedValue({
        ...mockOrder,
        status: 'processing',
      });

      const result = await service.updateStatus('1', 'processing', 'test-tenant', '1');

      expect(mockUpdateStatus).toHaveBeenCalledWith('1', 'processing', 'test-tenant', '1');
      expect(result.status).toBe('processing');
      expect(eventBusService.publish).toHaveBeenCalledWith('order.status.updated', expect.any(Object));
    });

    it('should cancel order successfully', async () => {
      const mockCancel = jest.spyOn(service as any, 'cancelOrder').mockResolvedValue({
        ...mockOrder,
        status: 'cancelled',
        cancelledAt: expect.any(Date),
      });

      const result = await service.cancel('1', 'test-tenant', '1');

      expect(mockCancel).toHaveBeenCalledWith('1', 'test-tenant', '1');
      expect(result.status).toBe('cancelled');
      expect(result.cancelledAt).toBeDefined();
      expect(eventBusService.publish).toHaveBeenCalledWith('order.cancelled', expect.any(Object));
    });
  });

  describe('payment management', () => {
    it('should process payment successfully', async () => {
      const mockProcessPayment = jest.spyOn(service as any, 'processPayment').mockResolvedValue({
        ...mockOrder,
        paymentStatus: 'paid',
        paidAt: expect.any(Date),
      });

      const result = await service.processPayment('1', 'credit_card', 'test-tenant', '1');

      expect(mockProcessPayment).toHaveBeenCalledWith('1', 'credit_card', 'test-tenant', '1');
      expect(result.paymentStatus).toBe('paid');
      expect(result.paidAt).toBeDefined();
      expect(eventBusService.publish).toHaveBeenCalledWith('order.payment.processed', expect.any(Object));
    });

    it('should handle payment failure', async () => {
      jest.spyOn(service as any, 'processPayment').mockRejectedValue(new BadRequestException('Payment failed'));

      await expect(service.processPayment('1', 'credit_card', 'test-tenant', '1')).rejects.toThrow(BadRequestException);
    });

    it('should refund payment successfully', async () => {
      const mockRefund = jest.spyOn(service as any, 'refundPayment').mockResolvedValue({
        ...mockOrder,
        paymentStatus: 'refunded',
        refundedAt: expect.any(Date),
        refundAmount: 229.96,
      });

      const result = await service.refund('1', 229.96, 'test-tenant', '1');

      expect(mockRefund).toHaveBeenCalledWith('1', 229.96, 'test-tenant', '1');
      expect(result.paymentStatus).toBe('refunded');
      expect(result.refundAmount).toBe(229.96);
      expect(eventBusService.publish).toHaveBeenCalledWith('order.payment.refunded', expect.any(Object));
    });
  });

  describe('shipping management', () => {
    it('should update shipping status successfully', async () => {
      const mockUpdateShipping = jest.spyOn(service as any, 'updateShippingStatus').mockResolvedValue({
        ...mockOrder,
        shippingStatus: 'shipped',
        shippedAt: expect.any(Date),
        trackingNumber: 'TRK123456789',
      });

      const result = await service.updateShipping('1', 'shipped', 'TRK123456789', 'test-tenant', '1');

      expect(mockUpdateShipping).toHaveBeenCalledWith('1', 'shipped', 'TRK123456789', 'test-tenant', '1');
      expect(result.shippingStatus).toBe('shipped');
      expect(result.trackingNumber).toBe('TRK123456789');
      expect(eventBusService.publish).toHaveBeenCalledWith('order.shipping.updated', expect.any(Object));
    });
  });

  describe('analytics methods', () => {
    it('should return order analytics', async () => {
      jest.spyOn(service as any, 'getTotalOrders').mockResolvedValue(100);
      jest.spyOn(service as any, 'getRevenue').mockResolvedValue(50000);
      jest.spyOn(service as any, 'getConversionRate').mockResolvedValue(3.2);

      const analytics = await service.getOrderAnalytics('test-tenant', '30d');

      expect(analytics).toHaveProperty('totalOrders');
      expect(analytics).toHaveProperty('revenue');
      expect(analytics).toHaveProperty('conversionRate');
    });

    it('should return sales by period', async () => {
      const mockSalesData = [
        { period: '2024-01-01', orders: 10, revenue: 5000 },
        { period: '2024-01-02', orders: 15, revenue: 7500 },
      ];
      jest.spyOn(service as any, 'getSalesByPeriod').mockResolvedValue(mockSalesData);

      const result = await service.getSalesByPeriod('test-tenant', '7d');

      expect(result).toEqual(mockSalesData);
    });
  });

  describe('search and filtering', () => {
    it('should filter orders by customer', async () => {
      const mockFilter = jest.spyOn(service as any, 'filterOrdersByCustomer').mockResolvedValue([mockOrder]);

      const result = await service.findByCustomer('1', mockSearchDto, 'test-tenant');

      expect(mockFilter).toHaveBeenCalledWith('1', mockSearchDto, 'test-tenant');
      expect(result).toEqual([mockOrder]);
    });

    it('should filter orders by date range', async () => {
      const mockFilter = jest.spyOn(service as any, 'filterOrdersByDateRange').mockResolvedValue([mockOrder]);

      const result = await service.findByDateRange(new Date(), new Date(), mockSearchDto, 'test-tenant');

      expect(mockFilter).toHaveBeenCalledWith(new Date(), new Date(), mockSearchDto, 'test-tenant');
      expect(result).toEqual([mockOrder]);
    });
  });

  describe('bulk operations', () => {
    it('should bulk update order status', async () => {
      const mockBulkUpdate = jest.spyOn(service as any, 'bulkUpdateOrderStatus').mockResolvedValue({
        updated: 5,
        failed: 0,
      });

      const result = await service.bulkUpdateStatus(['1', '2'], 'processing', 'test-tenant', '1');

      expect(mockBulkUpdate).toHaveBeenCalledWith(['1', '2'], 'processing', 'test-tenant', '1');
      expect(result).toHaveProperty('updated');
      expect(result).toHaveProperty('failed');
    });

    it('should handle bulk operation failures', async () => {
      jest.spyOn(service as any, 'bulkUpdateOrderStatus').mockResolvedValue({
        updated: 3,
        failed: 2,
      });

      const result = await service.bulkUpdateStatus(['1', '2', '3', '4', '5'], 'processing', 'test-tenant', '1');

      expect(result.updated).toBe(3);
      expect(result.failed).toBe(2);
    });
  });

  describe('validation', () => {
    it('should validate order data', async () => {
      const invalidOrder = { customerId: '', items: [] };
      await expect(service.create(invalidOrder as any, 'test-tenant', '1')).rejects.toThrow();
    });

    it('should validate payment method', async () => {
      const invalidOrder = { ...mockCreateOrderDto, paymentMethod: 'invalid_method' };
      await expect(service.create(invalidOrder as any, 'test-tenant', '1')).rejects.toThrow();
    });
  });

  describe('performance', () => {
    it('should cache frequently accessed orders', async () => {
      jest.spyOn(service as any, 'findOneOrder').mockResolvedValue(mockOrder);

      await service.findOne('1', 'test-tenant');
      await service.findOne('1', 'test-tenant');

      expect(cacheService.set).toHaveBeenCalledTimes(1);
      expect(cacheService.get).toHaveBeenCalledTimes(1);
    });

    it('should handle cache misses', async () => {
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(service as any, 'findOneOrder').mockResolvedValue(mockOrder);

      const result = await service.findOne('1', 'test-tenant');

      expect(result).toEqual(mockOrder);
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      jest.spyOn(service as any, 'findOneOrder').mockRejectedValue(new Error('Connection lost'));

      await expect(service.findOne('1', 'test-tenant')).rejects.toThrow();
      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should handle timeout errors', async () => {
      jest.spyOn(service as any, 'findAllOrders').mockRejectedValue(new Error('Query timeout'));

      await expect(service.findAll(mockSearchDto, 'test-tenant')).rejects.toThrow();
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('business logic', () => {
    it('should calculate taxes correctly', async () => {
      jest.spyOn(service as any, 'createOrder').mockResolvedValue(mockOrder);

      const result = await service.create(mockCreateOrderDto, 'test-tenant', '1');

      expect(result.tax).toBeCloseTo(result.subtotal * 0.1, 2); // Assuming 10% tax
    });

    it('should apply discounts correctly', async () => {
      const orderWithDiscount = { ...mockOrder, discount: 20, total: 209.96 };
      jest.spyOn(service as any, 'createOrder').mockResolvedValue(orderWithDiscount);

      const result = await service.create({
        ...mockCreateOrderDto,
        discountCode: 'SAVE20'
      }, 'test-tenant', '1');

      expect(result.discount).toBe(20);
      expect(result.total).toBe(209.96);
    });

    it('should validate shipping address', async () => {
      const invalidAddress = { ...mockCreateOrderDto, shippingAddress: { street: '' } };
      await expect(service.create(invalidAddress as any, 'test-tenant', '1')).rejects.toThrow();
    });
  });

  describe('audit trail', () => {
    it('should track order changes', async () => {
      jest.spyOn(service as any, 'updateOrder').mockResolvedValue(mockOrder);

      await service.update('1', mockUpdateOrderDto, 'test-tenant', '1');

      expect(eventBusService.publish).toHaveBeenCalledWith('order.updated', expect.objectContaining({
        orderId: '1',
        changes: mockUpdateOrderDto,
        updatedBy: '1',
      }));
    });

    it('should track status changes', async () => {
      jest.spyOn(service as any, 'updateOrderStatus').mockResolvedValue(mockOrder);

      await service.updateStatus('1', 'shipped', 'test-tenant', '1');

      expect(eventBusService.publish).toHaveBeenCalledWith('order.status.updated', expect.objectContaining({
        orderId: '1',
        oldStatus: 'pending',
        newStatus: 'shipped',
        updatedBy: '1',
      }));
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete order lifecycle', async () => {
      // Create order
      jest.spyOn(service as any, 'createOrder').mockResolvedValue(mockOrder);
      const createdOrder = await service.create(mockCreateOrderDto, 'test-tenant', '1');
      expect(createdOrder.status).toBe('pending');

      // Process payment
      jest.spyOn(service as any, 'processPayment').mockResolvedValue({
        ...createdOrder,
        paymentStatus: 'paid',
        paidAt: new Date(),
      });
      const paidOrder = await service.processPayment(createdOrder.id, 'credit_card', 'test-tenant', '1');
      expect(paidOrder.paymentStatus).toBe('paid');

      // Update status to processing
      jest.spyOn(service as any, 'updateOrderStatus').mockResolvedValue({
        ...paidOrder,
        status: 'processing',
      });
      const processingOrder = await service.updateStatus(paidOrder.id, 'processing', 'test-tenant', '1');
      expect(processingOrder.status).toBe('processing');

      // Ship order
      jest.spyOn(service as any, 'updateShippingStatus').mockResolvedValue({
        ...processingOrder,
        shippingStatus: 'shipped',
        trackingNumber: 'TRK123',
      });
      const shippedOrder = await service.updateShipping(processingOrder.id, 'shipped', 'TRK123', 'test-tenant', '1');
      expect(shippedOrder.shippingStatus).toBe('shipped');

      // Deliver order
      jest.spyOn(service as any, 'updateOrderStatus').mockResolvedValue({
        ...shippedOrder,
        status: 'delivered',
        deliveredAt: new Date(),
      });
      const deliveredOrder = await service.updateStatus(shippedOrder.id, 'delivered', 'test-tenant', '1');
      expect(deliveredOrder.status).toBe('delivered');
    });
  });
});
