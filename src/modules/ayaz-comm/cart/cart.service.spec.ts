import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { QueryOptimizerService } from '../../core/database/query-optimizer.service';

describe('CartService', () => {
  let service: CartService;
  let queryOptimizerService: QueryOptimizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: QueryOptimizerService,
          useValue: {
            executeQuery: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    queryOptimizerService = module.get<QueryOptimizerService>(QueryOptimizerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByUserId', () => {
    it('should return cart for a user', async () => {
      const mockCart = {
        id: '1',
        userId: '1',
        items: [
          { id: '1', productId: '1', quantity: 1, price: 100 },
        ],
        totalAmount: 100,
      };

      jest.spyOn(queryOptimizerService, 'executeQuery').mockResolvedValue([mockCart]);

      const result = await service.findByUserId('1');

      expect(result).toEqual(mockCart);
    });

    it('should return null when cart is not found', async () => {
      jest.spyOn(queryOptimizerService, 'executeQuery').mockResolvedValue([]);

      const result = await service.findByUserId('1');

      expect(result).toBeNull();
    });
  });

  describe('addItem', () => {
    it('should add an item to the cart', async () => {
      const addItemDto = {
        productId: '1',
        quantity: 1,
        price: 100,
      };

      const mockCartItem = {
        id: '1',
        cartId: '1',
        ...addItemDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(queryOptimizerService, 'executeQuery').mockResolvedValue([mockCartItem]);

      const result = await service.addItem('1', addItemDto);

      expect(result).toEqual(mockCartItem);
    });
  });

  describe('updateItem', () => {
    it('should update an item in the cart', async () => {
      const updateItemDto = {
        quantity: 2,
      };

      const mockCartItem = {
        id: '1',
        cartId: '1',
        productId: '1',
        quantity: 2,
        price: 100,
        updatedAt: new Date(),
      };

      jest.spyOn(queryOptimizerService, 'executeQuery').mockResolvedValue([mockCartItem]);

      const result = await service.updateItem('1', updateItemDto);

      expect(result).toEqual(mockCartItem);
    });
  });

  describe('removeItem', () => {
    it('should remove an item from the cart', async () => {
      jest.spyOn(queryOptimizerService, 'executeQuery').mockResolvedValue([]);

      const result = await service.removeItem('1');

      expect(result).toEqual({ message: 'Item removed from cart successfully' });
    });
  });

  describe('clearCart', () => {
    it('should clear all items from the cart', async () => {
      jest.spyOn(queryOptimizerService, 'executeQuery').mockResolvedValue([]);

      const result = await service.clearCart('1');

      expect(result).toEqual({ message: 'Cart cleared successfully' });
    });
  });
});
