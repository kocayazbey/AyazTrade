import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { QueryOptimizerService } from '../../core/database/query-optimizer.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let queryOptimizerService: QueryOptimizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: QueryOptimizerService,
          useValue: {
            getOrdersWithDetails: jest.fn(),
            executeQuery: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    queryOptimizerService = module.get<QueryOptimizerService>(QueryOptimizerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all orders with details', async () => {
      const mockOrders = [
        {
          id: '1',
          customerId: '1',
          totalAmount: 100,
          status: 'pending',
          customer: { id: '1', firstName: 'John', lastName: 'Doe' },
          items: [{ id: '1', productId: '1', quantity: 1, price: 100 }],
        },
      ];

      jest.spyOn(queryOptimizerService, 'getOrdersWithDetails').mockResolvedValue(mockOrders);

      const result = await service.findAll();

      expect(result).toEqual(mockOrders);
      expect(queryOptimizerService.getOrdersWithDetails).toHaveBeenCalledWith();
    });

    it('should return orders filtered by customer', async () => {
      const mockOrders = [
        {
          id: '1',
          customerId: '1',
          totalAmount: 100,
          status: 'pending',
          customer: { id: '1', firstName: 'John', lastName: 'Doe' },
          items: [],
        },
      ];

      jest.spyOn(queryOptimizerService, 'getOrdersWithDetails').mockResolvedValue(mockOrders);

      const result = await service.findAll('1');

      expect(result).toEqual(mockOrders);
      expect(queryOptimizerService.getOrdersWithDetails).toHaveBeenCalledWith();
    });
  });

  describe('findOne', () => {
    it('should return a single order with details', async () => {
      const mockOrder = {
        id: '1',
        customerId: '1',
        totalAmount: 100,
        status: 'pending',
        customer: { id: '1', firstName: 'John', lastName: 'Doe' },
        items: [{ id: '1', productId: '1', quantity: 1, price: 100 }],
      };

      jest.spyOn(queryOptimizerService, 'getOrdersWithDetails').mockResolvedValue([mockOrder]);

      const result = await service.findOne('1');

      expect(result).toEqual(mockOrder);
      expect(queryOptimizerService.getOrdersWithDetails).toHaveBeenCalledWith(['1']);
    });

    it('should return null when order is not found', async () => {
      jest.spyOn(queryOptimizerService, 'getOrdersWithDetails').mockResolvedValue([]);

      const result = await service.findOne('1');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new order', async () => {
      const createOrderDto = {
        customerId: '1',
        items: [
          { productId: '1', quantity: 1, price: 100 },
        ],
        totalAmount: 100,
        shippingAddress: '123 Main St',
      };

      const mockOrder = {
        id: '1',
        ...createOrderDto,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(queryOptimizerService, 'executeQuery').mockResolvedValue([mockOrder]);

      const result = await service.create(createOrderDto);

      expect(result).toEqual(mockOrder);
    });
  });

  describe('update', () => {
    it('should update an existing order', async () => {
      const updateOrderDto = {
        status: 'processing',
      };

      const mockOrder = {
        id: '1',
        customerId: '1',
        totalAmount: 100,
        status: 'processing',
        shippingAddress: '123 Main St',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(queryOptimizerService, 'executeQuery').mockResolvedValue([mockOrder]);

      const result = await service.update('1', updateOrderDto);

      expect(result).toEqual(mockOrder);
    });
  });

  describe('remove', () => {
    it('should remove an order', async () => {
      jest.spyOn(queryOptimizerService, 'executeQuery').mockResolvedValue([]);

      const result = await service.remove('1');

      expect(result).toEqual({ message: 'Order deleted successfully' });
    });
  });
});
