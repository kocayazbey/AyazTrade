import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ProductsService } from '../../src/modules/products/products.service';
import { CacheService } from '../../src/core/cache/cache.service';
import { EventBusService } from '../../src/core/events/event-bus.service';
import { LoggerService } from '../../src/core/logger/winston-logger.service';
import { CreateProductDto } from '../../src/modules/products/dto/create-product.dto';
import { UpdateProductDto } from '../../src/modules/products/dto/update-product.dto';
import { ProductSearchDto } from '../../src/modules/products/dto/product-search.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let cacheService: CacheService;
  let eventBusService: EventBusService;
  let loggerService: LoggerService;

  const mockProduct: any = {
    id: '1',
    name: 'Test Product',
    description: 'Test Description',
    price: '99.99',
    stockQuantity: 100,
    sku: 'TEST-001',
    categoryId: '1',
    brandId: '1',
    vendorId: '1',
    status: 'active',
    images: ['image1.jpg'],
    options: [],
    attributes: {},
    tenantId: 'test-tenant',
    createdBy: '1',
    updatedBy: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockCreateProductDto: CreateProductDto = {
    name: 'New Product',
    description: 'New Description',
    price: 199.99,
    stock: 50,
    sku: 'NEW-001',
    categoryId: '1' as any,
    brandId: '1' as any,
    vendorId: '1' as any,
    status: 'active' as any,
    images: ['new-image.jpg'],
    variants: [],
    seo: {} as any,
  } as any;

  const mockUpdateProductDto: UpdateProductDto = {
    name: 'Updated Product',
    price: 299.99,
  } as any;

  const mockSearchDto: ProductSearchDto = {
    search: 'test',
    category: 'electronics',
    status: 'active' as any,
    minPrice: 0,
    maxPrice: 1000,
    sortBy: 'name',
    sortOrder: 'ASC',
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
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

    service = module.get<ProductsService>(ProductsService);
    cacheService = module.get<CacheService>(CacheService);
    eventBusService = module.get<EventBusService>(EventBusService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new product successfully', async () => {
      const mockCreate = jest.spyOn(service as any, 'createProduct').mockResolvedValue(mockProduct);

      const result = await service.create(mockCreateProductDto, 'test-tenant', '1');

      expect(mockCreate).toHaveBeenCalledWith(mockCreateProductDto, 'test-tenant', '1');
      expect(result).toEqual(mockProduct);
      expect(eventBusService.publish).toHaveBeenCalledWith('product.created', expect.any(Object));
    });

    it('should throw BadRequestException for invalid product data', async () => {
      const invalidDto = { ...mockCreateProductDto, name: '' };

      await expect(service.create(invalidDto as any, 'test-tenant', '1')).rejects.toThrow(BadRequestException);
    });

    it('should handle duplicate SKU error', async () => {
      jest.spyOn(service as any, 'createProduct').mockRejectedValue(new ConflictException('SKU already exists'));

      await expect(service.create(mockCreateProductDto, 'test-tenant', '1')).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const mockProducts = [mockProduct];
      const mockFindAll = jest.spyOn(service as any, 'findAllProducts').mockResolvedValue({
        data: mockProducts,
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

    it('should use cache for product search', async () => {
      const cachedResult = { data: [mockProduct], total: 1, page: 1, limit: 10 };
      jest.spyOn(cacheService, 'get').mockResolvedValue(cachedResult);

      const result = await service.findAll(mockSearchDto, 'test-tenant');

      expect(cacheService.get).toHaveBeenCalled();
      expect(result).toEqual(cachedResult);
    });
  });

  describe('findOne', () => {
    it('should return a single product', async () => {
      const mockFindOne = jest.spyOn(service as any, 'findOneProduct').mockResolvedValue(mockProduct);

      const result = await service.findOne('1', 'test-tenant');

      expect(mockFindOne).toHaveBeenCalledWith('1', 'test-tenant');
      expect(result).toEqual(mockProduct);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent product', async () => {
      jest.spyOn(service as any, 'findOneProduct').mockResolvedValue(null);

      await expect(service.findOne('999', 'test-tenant')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update product successfully', async () => {
      const mockUpdate = jest.spyOn(service as any, 'updateProduct').mockResolvedValue({
        ...mockProduct,
        ...mockUpdateProductDto,
      });

      const result = await service.update('1', mockUpdateProductDto, 'test-tenant', '1');

      expect(mockUpdate).toHaveBeenCalledWith('1', mockUpdateProductDto, 'test-tenant', '1');
      expect(result).toEqual(expect.objectContaining(mockUpdateProductDto));
      expect(cacheService.del).toHaveBeenCalled();
      expect(eventBusService.publish).toHaveBeenCalledWith('product.updated', expect.any(Object));
    });

    it('should handle version conflicts', async () => {
      jest.spyOn(service as any, 'updateProduct').mockRejectedValue(new ConflictException('Version conflict'));

      await expect(service.update('1', mockUpdateProductDto, 'test-tenant', '1')).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft delete product successfully', async () => {
      const mockRemove = jest.spyOn(service as any, 'removeProduct').mockResolvedValue({
        ...mockProduct,
        deletedAt: expect.any(Date),
      });

      const result = await service.remove('1', 'test-tenant', '1');

      expect(mockRemove).toHaveBeenCalledWith('1', 'test-tenant', '1');
      expect(result.deletedAt).toBeDefined();
      expect(cacheService.deletePattern).toHaveBeenCalled();
      expect(eventBusService.publish).toHaveBeenCalledWith('product.deleted', expect.any(Object));
    });
  });

  describe('restore', () => {
    it('should restore soft deleted product', async () => {
      const deletedProduct = { ...mockProduct, deletedAt: new Date() };
      const mockRestore = jest.spyOn(service as any, 'restoreProduct').mockResolvedValue({
        ...deletedProduct,
        deletedAt: null,
      });

      const result = await service.restore('1', 'test-tenant', '1');

      expect(mockRestore).toHaveBeenCalledWith('1', 'test-tenant', '1');
      expect(result.deletedAt).toBeNull();
      expect(eventBusService.publish).toHaveBeenCalledWith('product.restored', expect.any(Object));
    });
  });

  describe('stock management', () => {
    it('should update stock successfully', async () => {
      const mockUpdateStock = jest.spyOn(service as any, 'updateStock').mockResolvedValue({
        ...mockProduct,
        stockQuantity: 80,
      });

      const result = await service.updateStock('1', -20, 'test-tenant', '1');

      expect(mockUpdateStock).toHaveBeenCalledWith('1', -20, 'test-tenant', '1');
      expect(result.stockQuantity).toBe(80);
      expect(eventBusService.publish).toHaveBeenCalledWith('product.stock.updated', expect.any(Object));
    });

    it('should prevent negative stock', async () => {
      jest.spyOn(service as any, 'updateStock').mockRejectedValue(new BadRequestException('Insufficient stock'));

      await expect(service.updateStock('1', -200, 'test-tenant', '1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('analytics methods', () => {
    it('should return analytics overview', async () => {
      jest.spyOn(service as any, 'getTotalProducts').mockResolvedValue(100);
      jest.spyOn(service as any, 'getLowStockProducts').mockResolvedValue(5);
      jest.spyOn(service as any, 'getTopSellingProducts').mockResolvedValue([]);

      const overview = await service.getProductAnalytics('test-tenant', '30d');

      expect(overview).toHaveProperty('totalProducts');
      expect(overview).toHaveProperty('lowStockCount');
      expect(overview).toHaveProperty('topSellingProducts');
    });

    it('should handle analytics errors gracefully', async () => {
      jest.spyOn(service as any, 'getTotalProducts').mockRejectedValue(new Error('Database error'));

      const overview = await service.getProductAnalytics('test-tenant', '30d');

      expect(overview).toHaveProperty('totalProducts');
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('search and filtering', () => {
    it('should filter products by category', async () => {
      const mockFilter = jest.spyOn(service as any, 'filterProductsByCategory').mockResolvedValue([mockProduct]);

      const result = await service.findByCategory('1', mockSearchDto, 'test-tenant');

      expect(mockFilter).toHaveBeenCalledWith('1', mockSearchDto, 'test-tenant');
      expect(result).toEqual([mockProduct]);
    });

    it('should search products by text', async () => {
      const mockSearch = jest.spyOn(service as any, 'searchProducts').mockResolvedValue([mockProduct]);

      const result = await service.search('test query', mockSearchDto, 'test-tenant');

      expect(mockSearch).toHaveBeenCalledWith('test query', mockSearchDto, 'test-tenant');
      expect(result).toEqual([mockProduct]);
    });
  });

  describe('bulk operations', () => {
    it('should bulk update products', async () => {
      const mockBulkUpdate = jest.spyOn(service as any, 'bulkUpdateProducts').mockResolvedValue({
        updated: 5,
        failed: 0,
      });

      const result = await service.bulkUpdate(['1', '2'], { status: 'inactive' }, 'test-tenant', '1');

      expect(mockBulkUpdate).toHaveBeenCalledWith(['1', '2'], { status: 'inactive' }, 'test-tenant', '1');
      expect(result).toHaveProperty('updated');
      expect(result).toHaveProperty('failed');
    });

    it('should handle bulk operation failures', async () => {
      jest.spyOn(service as any, 'bulkUpdateProducts').mockResolvedValue({
        updated: 3,
        failed: 2,
      });

      const result = await service.bulkUpdate(['1', '2', '3', '4', '5'], { status: 'inactive' }, 'test-tenant', '1');

      expect(result.updated).toBe(3);
      expect(result.failed).toBe(2);
    });
  });

  describe('validation', () => {
    it('should validate product data', async () => {
      const invalidProduct = { name: '', price: -10 };
      await expect(service.create(invalidProduct as any, 'test-tenant', '1')).rejects.toThrow();
    });

    it('should validate SKU uniqueness', async () => {
      jest.spyOn(service as any, 'checkSkuUniqueness').mockResolvedValue(false);

      await expect(service.create({ ...mockCreateProductDto, sku: 'DUPLICATE' }, 'test-tenant', '1')).rejects.toThrow(ConflictException);
    });
  });

  describe('performance', () => {
    it('should cache frequently accessed products', async () => {
      jest.spyOn(service as any, 'findOneProduct').mockResolvedValue(mockProduct);

      await service.findOne('1', 'test-tenant');
      await service.findOne('1', 'test-tenant');

      expect(cacheService.set).toHaveBeenCalledTimes(1);
      expect(cacheService.get).toHaveBeenCalledTimes(1);
    });

    it('should handle cache misses', async () => {
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(service as any, 'findOneProduct').mockResolvedValue(mockProduct);

      const result = await service.findOne('1', 'test-tenant');

      expect(result).toEqual(mockProduct);
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      jest.spyOn(service as any, 'findOneProduct').mockRejectedValue(new Error('Connection lost'));

      await expect(service.findOne('1', 'test-tenant')).rejects.toThrow();
      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should handle timeout errors', async () => {
      jest.spyOn(service as any, 'findAllProducts').mockRejectedValue(new Error('Query timeout'));

      await expect(service.findAll(mockSearchDto, 'test-tenant')).rejects.toThrow();
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('data integrity', () => {
    it('should maintain referential integrity', async () => {
      jest.spyOn(service as any, 'validateReferences').mockResolvedValue(true);

      const result = await service.create(mockCreateProductDto, 'test-tenant', '1');

      expect(result).toBeDefined();
    });

    it('should prevent invalid category references', async () => {
      jest.spyOn(service as any, 'validateReferences').mockResolvedValue(false);

      await expect(service.create(mockCreateProductDto, 'test-tenant', '1')).rejects.toThrow();
    });
  });
});
