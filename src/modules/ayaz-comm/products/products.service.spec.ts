import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { QueryOptimizerService } from '../../core/database/query-optimizer.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let queryOptimizerService: QueryOptimizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: QueryOptimizerService,
          useValue: {
            getProductsWithDetails: jest.fn(),
            executeQuery: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    queryOptimizerService = module.get<QueryOptimizerService>(QueryOptimizerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all products with details', async () => {
      const mockProducts = [
        {
          id: '1',
          name: 'Product 1',
          price: 100,
          category: { id: '1', name: 'Category 1' },
          variants: [{ id: '1', size: 'M', color: 'Red' }],
        },
      ];

      jest.spyOn(queryOptimizerService, 'getProductsWithDetails').mockResolvedValue(mockProducts);

      const result = await service.findAll();

      expect(result).toEqual(mockProducts);
      expect(queryOptimizerService.getProductsWithDetails).toHaveBeenCalledWith();
    });

    it('should return products filtered by category', async () => {
      const mockProducts = [
        {
          id: '1',
          name: 'Product 1',
          price: 100,
          category: { id: '1', name: 'Category 1' },
          variants: [],
        },
      ];

      jest.spyOn(queryOptimizerService, 'getProductsWithDetails').mockResolvedValue(mockProducts);

      const result = await service.findAll('1');

      expect(result).toEqual(mockProducts);
      expect(queryOptimizerService.getProductsWithDetails).toHaveBeenCalledWith();
    });
  });

  describe('findOne', () => {
    it('should return a single product with details', async () => {
      const mockProduct = {
        id: '1',
        name: 'Product 1',
        price: 100,
        category: { id: '1', name: 'Category 1' },
        variants: [{ id: '1', size: 'M', color: 'Red' }],
      };

      jest.spyOn(queryOptimizerService, 'getProductsWithDetails').mockResolvedValue([mockProduct]);

      const result = await service.findOne('1');

      expect(result).toEqual(mockProduct);
      expect(queryOptimizerService.getProductsWithDetails).toHaveBeenCalledWith(['1']);
    });

    it('should return null when product is not found', async () => {
      jest.spyOn(queryOptimizerService, 'getProductsWithDetails').mockResolvedValue([]);

      const result = await service.findOne('1');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const createProductDto = {
        name: 'New Product',
        price: 100,
        categoryId: '1',
        description: 'A new product',
      };

      const mockProduct = {
        id: '1',
        ...createProductDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(queryOptimizerService, 'executeQuery').mockResolvedValue([mockProduct]);

      const result = await service.create(createProductDto);

      expect(result).toEqual(mockProduct);
    });
  });

  describe('update', () => {
    it('should update an existing product', async () => {
      const updateProductDto = {
        name: 'Updated Product',
        price: 150,
      };

      const mockProduct = {
        id: '1',
        ...updateProductDto,
        categoryId: '1',
        description: 'An updated product',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(queryOptimizerService, 'executeQuery').mockResolvedValue([mockProduct]);

      const result = await service.update('1', updateProductDto);

      expect(result).toEqual(mockProduct);
    });
  });

  describe('remove', () => {
    it('should remove a product', async () => {
      jest.spyOn(queryOptimizerService, 'executeQuery').mockResolvedValue([]);

      const result = await service.remove('1');

      expect(result).toEqual({ message: 'Product deleted successfully' });
    });
  });
});
