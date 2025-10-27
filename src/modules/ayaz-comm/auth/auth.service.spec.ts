import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PasswordStrengthService } from '../../core/security/password-strength.service';
import { SessionManagementService } from '../../core/security/session-management.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let passwordStrengthService: PasswordStrengthService;
  let sessionManagementService: SessionManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: PasswordStrengthService,
          useValue: {
            validatePassword: jest.fn(),
            hashPassword: jest.fn(),
            comparePassword: jest.fn(),
          },
        },
        {
          provide: SessionManagementService,
          useValue: {
            createSession: jest.fn(),
            invalidateSession: jest.fn(),
            validateSession: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    passwordStrengthService = module.get<PasswordStrengthService>(PasswordStrengthService);
    sessionManagementService = module.get<SessionManagementService>(SessionManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user data when credentials are valid', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashedPassword',
      };
      const mockPasswordStrength = {
        isValid: true,
        score: 4,
        feedback: [],
      };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(passwordStrengthService, 'comparePassword').mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual({
        id: '1',
        email: 'test@example.com',
      });
    });

    it('should return null when user is not found', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashedPassword',
      };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(passwordStrengthService, 'comparePassword').mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongPassword');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens on successful login', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
      };
      const mockTokens = {
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser);
      jest.spyOn(jwtService, 'sign').mockReturnValue('accessToken');
      jest.spyOn(jwtService, 'sign').mockReturnValue('refreshToken');
      jest.spyOn(sessionManagementService, 'createSession').mockResolvedValue(undefined);

      const result = await service.login({ email: 'test@example.com', password: 'password' });

      expect(result).toEqual({
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
        user: mockUser,
      });
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login({ email: 'test@example.com', password: 'wrongPassword' }))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should create a new user and return tokens', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashedPassword',
      };
      const mockPasswordStrength = {
        isValid: true,
        score: 4,
        feedback: [],
      };

      jest.spyOn(passwordStrengthService, 'validatePassword').mockResolvedValue(mockPasswordStrength);
      jest.spyOn(passwordStrengthService, 'hashPassword').mockResolvedValue('hashedPassword');
      jest.spyOn(usersService, 'create').mockResolvedValue(mockUser);
      jest.spyOn(jwtService, 'sign').mockReturnValue('accessToken');
      jest.spyOn(jwtService, 'sign').mockReturnValue('refreshToken');
      jest.spyOn(sessionManagementService, 'createSession').mockResolvedValue(undefined);

      const result = await service.register({
        email: 'test@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result).toEqual({
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
        user: {
          id: '1',
          email: 'test@example.com',
        },
      });
    });

    it('should throw BadRequestException when password is weak', async () => {
      const mockPasswordStrength = {
        isValid: false,
        score: 1,
        feedback: ['Password is too weak'],
      };

      jest.spyOn(passwordStrengthService, 'validatePassword').mockResolvedValue(mockPasswordStrength);

      await expect(service.register({
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
      })).rejects.toThrow('Password does not meet strength requirements');
    });
  });

  describe('refreshToken', () => {
    it('should return new access token when refresh token is valid', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      const mockSession = { userId: '1', isValid: true };

      jest.spyOn(jwtService, 'verify').mockReturnValue({ sub: '1' });
      jest.spyOn(sessionManagementService, 'validateSession').mockResolvedValue(mockSession);
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(jwtService, 'sign').mockReturnValue('newAccessToken');

      const result = await service.refreshToken('refreshToken');

      expect(result).toEqual({
        accessToken: 'newAccessToken',
      });
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalidToken'))
        .rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should invalidate session and return success message', async () => {
      jest.spyOn(sessionManagementService, 'invalidateSession').mockResolvedValue(undefined);

      const result = await service.logout('sessionId');

      expect(result).toEqual({
        message: 'Logged out successfully',
      });
    });
  });
});
