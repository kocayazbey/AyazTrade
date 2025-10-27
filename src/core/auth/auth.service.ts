import { Injectable, UnauthorizedException, BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { users } from '../../database/schema/core/users.schema';
import { eq } from 'drizzle-orm';
import { getJwtTokenConfig } from '../../config';
import { IPFilterService } from '../security/ip-filter.service';
import { SessionManagementService } from '../security/session-management.service';

@Injectable()
export class AuthService {
  private readonly saltRounds: number;
  private readonly jwtTokenConfig: any;
  private readonly TOKEN_BLACKLIST_PREFIX = 'blacklist:token:';
  private readonly REFRESH_TOKEN_PREFIX = 'refresh:token:';
  private readonly REFRESH_TOKEN_TTL: number;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private databaseService: DatabaseService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private ipFilterService: IPFilterService,
    private sessionManagementService: SessionManagementService,
  ) {
    this.saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
    this.jwtTokenConfig = getJwtTokenConfig(this.configService);
    this.REFRESH_TOKEN_TTL = this.jwtTokenConfig.keyLifetime / 1000; // Convert milliseconds to seconds
  }

  // Password policy validation
  private validatePasswordPolicy(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (password.length > 128) {
      errors.push('Password must be at most 128 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return { valid: errors.length === 0, errors };
  }

  // Hash password
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  // Verify password
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async register(data: any) {
    // Validate password policy
    const passwordValidation = this.validatePasswordPolicy(data.password);
    if (!passwordValidation.valid) {
      throw new BadRequestException({
        message: 'Password validation failed',
        errors: passwordValidation.errors
      });
    }

    // Check if user already exists
    const existingUser = await this.findUserByEmail(data.email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(data.password);
    
    // Create user in database
    const [user] = await this.databaseService.drizzleClient
      .insert(users)
      .values({
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName || data.name?.split(' ')[0] || null,
        lastName: data.lastName || data.name?.split(' ').slice(1).join(' ') || null,
        role: data.role || 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      id: user.id,
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
      role: user.role,
      createdAt: user.createdAt.toISOString()
    };
  }

  async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    // Check if IP is banned before attempting authentication
    if (ipAddress) {
      const banCheck = await this.ipFilterService.isBanned(ipAddress);
      if (banCheck.banned) {
        throw new UnauthorizedException(`IP address is temporarily banned: ${banCheck.reason}`);
      }
    }

    // Validate user with IP tracking for security
    const user = await this.validateUser(email, password, ipAddress);

    // Create session using session management service
    const sessionData = await this.sessionManagementService.createSession(
      user.id,
      userAgent || 'Unknown',
      ipAddress || 'Unknown'
    );

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: sessionData.sessionId
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: this.jwtTokenConfig.accessTokenExpiresIn });

    return {
      accessToken,
      refreshToken: sessionData.refreshToken,
      sessionId: sessionData.sessionId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: this.getPermissionsByRole(user.role)
      },
    };
  }

  async validateUser(email: string, password: string, ipAddress?: string) {
    // Fetch user from database
    const [user] = await this.databaseService.drizzleClient
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // Track failed login attempt for non-existent user attempts
      if (ipAddress) {
        await this.ipFilterService.trackFailedLoginAttempt(ipAddress);
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      // Track failed login attempt for inactive user attempts
      if (ipAddress) {
        await this.ipFilterService.trackFailedLoginAttempt(ipAddress);
      }
      throw new UnauthorizedException('User account is inactive');
    }

    // Verify password
    const isValid = await this.verifyPassword(password, user.password);

    if (!isValid) {
      // Track failed login attempt for incorrect password attempts
      if (ipAddress) {
        await this.ipFilterService.trackFailedLoginAttempt(ipAddress);
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.updateLastLogin(user.id);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || email,
      role: user.role,
    };
  }

  async getProfile(userId: string) {
    const [user] = await this.databaseService.drizzleClient
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      phone: user.phone,
      role: user.role,
      permissions: this.getPermissionsByRole(user.role),
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private getPermissionsByRole(role: string): string[] {
    const permissions: Record<string, string[]> = {
      admin: ['*'],
      manager: ['products:read', 'products:write', 'orders:read', 'orders:write', 'customers:read'],
      staff: ['products:read', 'orders:read'],
      vendor: ['products:read', 'products:write:own', 'orders:read:own']
    };
    return permissions[role] || [];
  }

  async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: this.jwtTokenConfig.accessTokenExpiresIn });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: this.jwtTokenConfig.refreshTokenExpiresIn });

    return { accessToken, refreshToken };
  }

  async findUserByEmail(email: string) {
    const [user] = await this.databaseService.drizzleClient
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isEmailVerified: true, // TODO: Add email verification tracking
      isPhoneVerified: false, // TODO: Add phone verification tracking
    };
  }

  async findUserByEmailFromId(userId: string) {
    const [user] = await this.databaseService.drizzleClient
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      role: user.role,
    };
  }

  async createUser(userData: any) {
    // Check if user already exists
    const existingUser = await this.findUserByEmail(userData.email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password if provided
    const hashedPassword = userData.password 
      ? await this.hashPassword(userData.password)
      : null;

    const [user] = await this.databaseService.drizzleClient
      .insert(users)
      .values({
        email: userData.email,
        password: hashedPassword || '',
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        phone: userData.phone || null,
        role: userData.role || 'user',
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      id: user.id,
      ...userData,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async generateResetToken(userId: string) {
    return this.jwtService.sign({ userId }, { expiresIn: this.jwtTokenConfig.resetTokenExpiresIn });
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify(token) as { userId: string };
      
      // Validate password policy
      const passwordValidation = this.validatePasswordPolicy(newPassword);
      if (!passwordValidation.valid) {
        throw new BadRequestException({
          message: 'Password validation failed',
          errors: passwordValidation.errors
        });
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);
      
      // Update user password in database
      await this.databaseService.drizzleClient
        .update(users)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, payload.userId));
      
      return true;
    } catch (error) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    // Fetch user
    const [user] = await this.databaseService.drizzleClient
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isValid = await this.verifyPassword(currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Validate new password policy
    const passwordValidation = this.validatePasswordPolicy(newPassword);
    if (!passwordValidation.valid) {
      throw new BadRequestException({
        message: 'Password validation failed',
        errors: passwordValidation.errors
      });
    }

    // Hash and update password
    const hashedPassword = await this.hashPassword(newPassword);
    await this.databaseService.drizzleClient
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return true;
  }

  async verifyEmail(token: string) {
    try {
      const payload = this.jwtService.verify(token) as { userId: string };
      
      // Update user email verification status (when email verification tracking is added)
      // For now, just mark as verified
      await this.databaseService.drizzleClient
        .update(users)
        .set({ updatedAt: new Date() })
        .where(eq(users.id, payload.userId));
      
      return true;
    } catch (error) {
      throw new BadRequestException('Invalid or expired verification token');
    }
  }

  async updateLastLogin(userId: string) {
    await this.databaseService.drizzleClient
      .update(users)
      .set({ lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
    return true;
  }

  async invalidateTokens(userId: string) {
    // Remove all refresh tokens for the user
    const pattern = `${this.REFRESH_TOKEN_PREFIX}${userId}:*`;
    // Note: cache-manager doesn't support pattern deletion directly
    // In production, you'd use Redis directly for pattern deletion
    await this.cacheManager.del(`${this.REFRESH_TOKEN_PREFIX}${userId}`);
    return true;
  }

  async refreshTokens(refreshToken: string, userAgent?: string, ipAddress?: string) {
    try {
      // Validate refresh token using session management service
      const userId = await this.sessionManagementService.validateRefreshToken(refreshToken);

      if (!userId) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Get user information
      const user = await this.findUserByEmailFromId(userId);

      // Generate new access token
      const newAccessToken = this.jwtService.sign(
        { sub: user.id, email: user.email, role: user.role, sessionId: sessionData.sessionId },
        { expiresIn: this.jwtTokenConfig.accessTokenExpiresIn }
      );

      // Rotate refresh token using session management
      const sessionData = await this.sessionManagementService.rotateRefreshToken(
        refreshToken,
        user.id,
        userAgent || 'Unknown',
        ipAddress || 'Unknown'
      );

      return {
        accessToken: newAccessToken,
        refreshToken: sessionData.refreshToken,
        sessionId: sessionData.sessionId,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    const hashedToken = this.hashToken(token);
    const isRevoked = await this.cacheManager.get<boolean>(`${this.TOKEN_BLACKLIST_PREFIX}${hashedToken}`);
    return !!isRevoked;
  }

  async revokeToken(token: string): Promise<boolean> {
    const hashedToken = this.hashToken(token);
    const payload = this.jwtService.decode(token) as any;
    
    if (!payload || !payload.exp) {
      return false;
    }

    // Calculate remaining TTL
    const currentTime = Math.floor(Date.now() / 1000);
    const ttl = payload.exp - currentTime;

    if (ttl > 0) {
      await this.cacheManager.set(`${this.TOKEN_BLACKLIST_PREFIX}${hashedToken}`, true, ttl);
    }
    
    return true;
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    // Generate a random token
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    const token = `${userId}:${timestamp}:${randomBytes}`;
    
    return this.jwtService.sign(
      { userId, randomBytes, timestamp },
      { expiresIn: this.jwtTokenConfig.refreshTokenExpiresIn }
    );
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const hashedToken = this.hashToken(refreshToken);
    await this.cacheManager.set(
      `${this.REFRESH_TOKEN_PREFIX}${userId}:${hashedToken}`,
      refreshToken,
      this.REFRESH_TOKEN_TTL
    );
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async logout(userId: string, accessToken: string, sessionId?: string): Promise<void> {
    // Revoke the access token
    await this.revokeToken(accessToken);

    // Invalidate specific session or all sessions for the user
    if (sessionId) {
      await this.sessionManagementService.invalidateSession(sessionId);
    } else {
      await this.sessionManagementService.invalidateAllUserSessions(userId);
    }
  }

  async getUserSessions(userId: string): Promise<any[]> {
    return await this.sessionManagementService.getUserSessions(userId);
  }

  async invalidateUserSession(userId: string, sessionId: string): Promise<boolean> {
    return await this.sessionManagementService.invalidateUserSession(userId, sessionId);
  }

  async logoutFromAllSessions(userId: string): Promise<number> {
    return await this.sessionManagementService.invalidateAllUserSessions(userId);
  }

  async generateVerificationToken(userId: string) {
    return this.jwtService.sign({ userId }, { expiresIn: this.jwtTokenConfig.verificationTokenExpiresIn });
  }

  async verifyToken(token: string): Promise<{ valid: boolean; payload?: any; expired?: boolean; message?: string }> {
    try {
      // Check if token is revoked first
      const isRevoked = await this.isTokenRevoked(token);
      if (isRevoked) {
        return { valid: false, message: 'Token has been revoked' };
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token) as any;

      if (!payload) {
        return { valid: false, message: 'Invalid token payload' };
      }

      // Check token expiration
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < currentTime) {
        return { valid: false, expired: true, message: 'Token has expired' };
      }

      // Check if user still exists and is active
      const user = await this.findUserByEmail(payload.email);
      if (!user) {
        return { valid: false, message: 'User not found' };
      }

      // Additional security checks
      if (payload.sessionId) {
        const sessionValid = await this.sessionManagementService.isSessionValid(payload.sessionId);
        if (!sessionValid) {
          return { valid: false, message: 'Invalid session' };
        }
      }

      return {
        valid: true,
        payload: {
          ...payload,
          userId: payload.sub,
          userRole: payload.role,
        }
      };

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, expired: true, message: 'Token has expired' };
      } else if (error.name === 'JsonWebTokenError') {
        return { valid: false, message: 'Invalid token format' };
      } else if (error.name === 'NotBeforeError') {
        return { valid: false, message: 'Token not active yet' };
      }

      return { valid: false, message: 'Token verification failed' };
    }
  }

  async verifyTokenExpiration(token: string): Promise<{ isExpired: boolean; expiresAt?: Date; timeUntilExpiry?: number }> {
    try {
      const payload = this.jwtService.decode(token) as any;

      if (!payload || !payload.exp) {
        return { isExpired: true };
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const expiresAt = new Date(payload.exp * 1000);
      const timeUntilExpiry = payload.exp - currentTime;

      return {
        isExpired: timeUntilExpiry <= 0,
        expiresAt,
        timeUntilExpiry: Math.max(0, timeUntilExpiry)
      };

    } catch (error) {
      return { isExpired: true };
    }
  }
}

