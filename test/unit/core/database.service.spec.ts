import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../src/core/database/database.service';

describe('DatabaseService', () => {
  let service: DatabaseService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                DATABASE_URL: 'postgresql://postgres:password@localhost:5432/ayaztrade',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to database', async () => {
      // Mock the prisma connect method
      const mockConnect = jest.fn().mockResolvedValue(undefined);
      service['prisma'] = { $connect: mockConnect } as any;

      await service.onModuleInit();

      expect(mockConnect).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from database', async () => {
      const mockDisconnect = jest.fn().mockResolvedValue(undefined);
      const mockEnd = jest.fn().mockResolvedValue(undefined);
      
      service['prisma'] = { $disconnect: mockDisconnect } as any;
      service['connection'] = { end: mockEnd } as any;

      await service.onModuleDestroy();

      expect(mockDisconnect).toHaveBeenCalled();
      expect(mockEnd).toHaveBeenCalled();
    });
  });

  describe('isHealthy', () => {
    it('should return true when database is healthy', async () => {
      const mockQueryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
      service['prisma'] = { $queryRaw: mockQueryRaw } as any;

      const result = await service.isHealthy();

      expect(result).toBe(true);
      expect(mockQueryRaw).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return false when database is unhealthy', async () => {
      const mockQueryRaw = jest.fn().mockRejectedValue(new Error('Connection failed'));
      service['prisma'] = { $queryRaw: mockQueryRaw } as any;

      const result = await service.isHealthy();

      expect(result).toBe(false);
    });
  });

  describe('transaction', () => {
    it('should execute transaction', async () => {
      const mockTransaction = jest.fn().mockImplementation((fn) => fn({}));
      service['prisma'] = { $transaction: mockTransaction } as any;

      const mockFn = jest.fn().mockResolvedValue('result');
      const result = await service.transaction(mockFn);

      expect(result).toBe('result');
      expect(mockTransaction).toHaveBeenCalledWith(mockFn);
    });
  });

  describe('rawQuery', () => {
    it('should execute raw query', async () => {
      const mockQueryRawUnsafe = jest.fn().mockResolvedValue([{ id: 1 }]);
      service['prisma'] = { $queryRawUnsafe: mockQueryRawUnsafe } as any;

      const result = await service.rawQuery('SELECT * FROM users', [1, 2]);

      expect(result).toEqual([{ id: 1 }]);
      expect(mockQueryRawUnsafe).toHaveBeenCalledWith('SELECT * FROM users', 1, 2);
    });
  });

  describe('getConnectionInfo', () => {
    it('should return connection information', () => {
      const result = service.getConnectionInfo();

      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('connected');
      expect(result.provider).toBe('postgresql');
    });
  });
});
