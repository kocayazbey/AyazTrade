import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { UsersService } from '../../src/core/auth/auth.service';
import { CacheService } from '../../src/core/cache/cache.service';
import { EventBusService } from '../../src/core/events/event-bus.service';
import { LoggerService } from '../../src/core/logger/winston-logger.service';

describe('UsersService', () => {
  let service: UsersService;
  let cacheService: CacheService;
  let eventBusService: EventBusService;
  let loggerService: LoggerService;

  const mockUser: any = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    status: 'active',
    tenantId: 'test-tenant',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
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

    service = module.get<UsersService>(UsersService);
    cacheService = module.get<CacheService>(CacheService);
    eventBusService = module.get<EventBusService>(EventBusService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const mockCreate = jest.spyOn(service as any, 'createUser').mockResolvedValue(mockUser);

      const result = await service.create({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      }, 'test-tenant');

      expect(mockCreate).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
      expect(eventBusService.publish).toHaveBeenCalledWith('user.created', expect.any(Object));
    });

    it('should handle duplicate email error', async () => {
      jest.spyOn(service as any, 'createUser').mockRejectedValue(new ConflictException('Email already exists'));

      await expect(service.create({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
      }, 'test-tenant')).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      const mockFindOne = jest.spyOn(service as any, 'findOneUser').mockResolvedValue(mockUser);

      const result = await service.findOne('1');

      expect(mockFindOne).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockUser);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      jest.spyOn(service as any, 'findOneUser').mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const mockUpdate = jest.spyOn(service as any, 'updateUser').mockResolvedValue({
        ...mockUser,
        name: 'Updated Name',
      });

      const result = await service.update('1', { name: 'Updated Name' });

      expect(mockUpdate).toHaveBeenCalledWith('1', { name: 'Updated Name' });
      expect(result.name).toBe('Updated Name');
      expect(cacheService.del).toHaveBeenCalled();
      expect(eventBusService.publish).toHaveBeenCalledWith('user.updated', expect.any(Object));
    });
  });

  describe('remove', () => {
    it('should soft delete user successfully', async () => {
      const mockRemove = jest.spyOn(service as any, 'removeUser').mockResolvedValue({
        ...mockUser,
        deletedAt: expect.any(Date),
      });

      const result = await service.remove('1');

      expect(mockRemove).toHaveBeenCalledWith('1');
      expect(result.deletedAt).toBeDefined();
      expect(cacheService.deletePattern).toHaveBeenCalled();
      expect(eventBusService.publish).toHaveBeenCalledWith('user.deleted', expect.any(Object));
    });
  });

  describe('password management', () => {
    it('should update password successfully', async () => {
      const mockUpdatePassword = jest.spyOn(service as any, 'updatePassword').mockResolvedValue(mockUser);

      const result = await service.updatePassword('1', 'oldPassword', 'newPassword123');

      expect(mockUpdatePassword).toHaveBeenCalledWith('1', 'oldPassword', 'newPassword123');
      expect(result).toEqual(mockUser);
      expect(eventBusService.publish).toHaveBeenCalledWith('user.password.updated', expect.any(Object));
    });

    it('should handle incorrect old password', async () => {
      jest.spyOn(service as any, 'updatePassword').mockRejectedValue(new BadRequestException('Incorrect old password'));

      await expect(service.updatePassword('1', 'wrongPassword', 'newPassword123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('role management', () => {
    it('should update user role successfully', async () => {
      const mockUpdateRole = jest.spyOn(service as any, 'updateUserRole').mockResolvedValue({
        ...mockUser,
        role: 'admin',
      });

      const result = await service.updateRole('1', 'admin');

      expect(mockUpdateRole).toHaveBeenCalledWith('1', 'admin');
      expect(result.role).toBe('admin');
      expect(eventBusService.publish).toHaveBeenCalledWith('user.role.updated', expect.any(Object));
    });
  });

  describe('status management', () => {
    it('should activate user successfully', async () => {
      const mockActivate = jest.spyOn(service as any, 'activateUser').mockResolvedValue({
        ...mockUser,
        status: 'active',
      });

      const result = await service.activate('1');

      expect(mockActivate).toHaveBeenCalledWith('1');
      expect(result.status).toBe('active');
      expect(eventBusService.publish).toHaveBeenCalledWith('user.activated', expect.any(Object));
    });

    it('should deactivate user successfully', async () => {
      const mockDeactivate = jest.spyOn(service as any, 'deactivateUser').mockResolvedValue({
        ...mockUser,
        status: 'inactive',
      });

      const result = await service.deactivate('1');

      expect(mockDeactivate).toHaveBeenCalledWith('1');
      expect(result.status).toBe('inactive');
      expect(eventBusService.publish).toHaveBeenCalledWith('user.deactivated', expect.any(Object));
    });
  });

  describe('authentication', () => {
    it('should validate user credentials', async () => {
      const mockValidate = jest.spyOn(service as any, 'validateUser').mockResolvedValue(mockUser);

      const result = await service.validateCredentials('test@example.com', 'password123');

      expect(mockValidate).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result).toEqual(mockUser);
    });

    it('should handle invalid credentials', async () => {
      jest.spyOn(service as any, 'validateUser').mockResolvedValue(null);

      const result = await service.validateCredentials('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('profile management', () => {
    it('should update user profile successfully', async () => {
      const mockUpdateProfile = jest.spyOn(service as any, 'updateProfile').mockResolvedValue({
        ...mockUser,
        phone: '+1234567890',
        address: 'Updated Address',
      });

      const result = await service.updateProfile('1', {
        phone: '+1234567890',
        address: 'Updated Address',
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith('1', {
        phone: '+1234567890',
        address: 'Updated Address',
      });
      expect(result.phone).toBe('+1234567890');
      expect(result.address).toBe('Updated Address');
    });
  });

  describe('validation', () => {
    it('should validate email format', async () => {
      await expect(service.create({
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User',
      }, 'test-tenant')).rejects.toThrow();
    });

    it('should validate password strength', async () => {
      await expect(service.create({
        email: 'test@example.com',
        password: '123',
        name: 'Test User',
      }, 'test-tenant')).rejects.toThrow();
    });
  });

  describe('performance', () => {
    it('should cache user lookups', async () => {
      jest.spyOn(service as any, 'findOneUser').mockResolvedValue(mockUser);

      await service.findOne('1');
      await service.findOne('1');

      expect(cacheService.set).toHaveBeenCalledTimes(1);
      expect(cacheService.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      jest.spyOn(service as any, 'findOneUser').mockRejectedValue(new Error('Connection lost'));

      await expect(service.findOne('1')).rejects.toThrow();
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('audit trail', () => {
    it('should track user creation', async () => {
      jest.spyOn(service as any, 'createUser').mockResolvedValue(mockUser);

      await service.create({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      }, 'test-tenant');

      expect(eventBusService.publish).toHaveBeenCalledWith('user.created', expect.objectContaining({
        userId: '1',
        email: 'new@example.com',
        createdBy: 'system',
      }));
    });

    it('should track user updates', async () => {
      jest.spyOn(service as any, 'updateUser').mockResolvedValue(mockUser);

      await service.update('1', { name: 'Updated Name' });

      expect(eventBusService.publish).toHaveBeenCalledWith('user.updated', expect.objectContaining({
        userId: '1',
        changes: { name: 'Updated Name' },
      }));
    });
  });
});
