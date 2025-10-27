import { Test, TestingModule } from '@nestjs/testing';
import { LeadService } from '../../src/modules/crm/services/lead.service';
import { DatabaseService } from '../../src/core/database/database.service';

describe('LeadService', () => {
  let service: LeadService;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadService,
        {
          provide: DatabaseService,
          useValue: {
            prismaClient: {
              lead: {
                create: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
              },
            },
          },
        },
      ],
    }).compile();

    service = module.get<LeadService>(LeadService);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new lead', async () => {
      const createLeadDto = {
        name: 'Test Lead',
        email: 'test@example.com',
        source: 'website',
        status: 'new' as const,
      };

      const result = await service.create(createLeadDto, 'tenant1', 'user1');

      expect(result).toBeDefined();
      expect(result.name).toBe(createLeadDto.name);
      expect(result.email).toBe(createLeadDto.email);
      expect(result.tenantId).toBe('tenant1');
      expect(result.createdBy).toBe('user1');
    });
  });

  describe('findAll', () => {
    it('should return all leads for a tenant', async () => {
      const result = await service.findAll('tenant1');

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('findOne', () => {
    it('should return a lead by id', async () => {
      const result = await service.findOne('lead1', 'tenant1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('lead1');
    });
  });

  describe('update', () => {
    it('should update a lead', async () => {
      const updateData = {
        name: 'Updated Lead',
        status: 'contacted' as const,
      };

      const result = await service.update('lead1', updateData, 'tenant1');

      expect(result).toBeDefined();
      expect(result?.name).toBe(updateData.name);
      expect(result?.status).toBe(updateData.status);
    });
  });

  describe('remove', () => {
    it('should remove a lead', async () => {
      const result = await service.remove('lead1', 'tenant1');

      expect(result).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return lead statistics', async () => {
      const result = await service.getStats('tenant1');

      expect(result).toBeDefined();
      expect(result.totalLeads).toBeGreaterThanOrEqual(0);
      expect(result.newLeads).toBeGreaterThanOrEqual(0);
      expect(result.qualifiedLeads).toBeGreaterThanOrEqual(0);
      expect(result.convertedLeads).toBeGreaterThanOrEqual(0);
    });
  });

  describe('convertToCustomer', () => {
    it('should convert a lead to customer', async () => {
      const result = await service.convertToCustomer('lead1', 'tenant1', 'user1');

      expect(result).toBeDefined();
      expect(result.lead).toBeDefined();
      expect(result.customer).toBeDefined();
      expect(result.lead.status).toBe('closed-won');
    });
  });
});
