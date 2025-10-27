import { Injectable, Logger, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { userSessions } from '../../database/schema/core/audit.schema';
import { eq, and, desc, sql, lt, gt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class SessionManagementService {
  private readonly logger = new Logger(SessionManagementService.name);
  private readonly SESSION_TTL: number;
  private readonly MAX_SESSIONS_PER_USER: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    this.SESSION_TTL = this.configService.get<number>('JWT_REFRESH_TOKEN_EXPIRATION_TIME', 60 * 60 * 24 * 7);
    this.MAX_SESSIONS_PER_USER = this.configService.get<number>('MAX_SESSIONS_PER_USER', 5);
  }

  async createSession(userId: string, userAgent: string, ipAddress: string): Promise<{ sessionId: string; refreshToken: string }> {
    // Check if user has reached maximum sessions limit
    const activeSessions = await this.getActiveSessionsCount(userId);
    if (activeSessions >= this.MAX_SESSIONS_PER_USER) {
      // Invalidate the oldest session
      await this.invalidateOldestSession(userId);
    }

    const sessionId = uuidv4();
    const refreshToken = this.generateSecureToken();

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.SESSION_TTL);

    const deviceInfo = {
      userAgent,
      ipAddress,
      createdFrom: 'web', // Could be 'mobile', 'api', etc.
    };

    // Create session in database
    const [session] = await this.databaseService.drizzleClient
      .insert(userSessions)
      .values({
        userId,
        sessionId,
        refreshToken,
        deviceInfo,
        isActive: true,
        expiresAt,
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    this.logger.log(`Session created for user ${userId}: ${sessionId}`);
    return { sessionId, refreshToken };
  }

  async getSession(sessionId: string): Promise<any | null> {
    try {
      const [session] = await this.databaseService.drizzleClient
        .select()
        .from(userSessions)
        .where(and(
          eq(userSessions.sessionId, sessionId),
          eq(userSessions.isActive, true)
        ))
        .limit(1);

      if (!session) {
        return null;
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        await this.invalidateSession(sessionId);
        return null;
      }

      // Update last activity
      await this.updateLastActivity(sessionId);

      return {
        id: session.id,
        userId: session.userId,
        sessionId: session.sessionId,
        refreshToken: session.refreshToken,
        deviceInfo: session.deviceInfo,
        isActive: session.isActive,
        expiresAt: session.expiresAt,
        lastActivityAt: session.lastActivityAt,
        createdAt: session.createdAt,
      };
    } catch (error) {
      this.logger.error(`Error getting session ${sessionId}`, error);
      return null;
    }
  }

  async invalidateSession(sessionId: string): Promise<void> {
    try {
      await this.databaseService.drizzleClient
        .update(userSessions)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(userSessions.sessionId, sessionId));

      this.logger.log(`Session invalidated: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error invalidating session ${sessionId}`, error);
    }
  }

  async invalidateAllUserSessions(userId: string): Promise<number> {
    try {
      const result = await this.databaseService.drizzleClient
        .update(userSessions)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(and(
          eq(userSessions.userId, userId),
          eq(userSessions.isActive, true)
        ))
        .returning();

      this.logger.log(`Invalidated ${result.length} sessions for user ${userId}`);
      return result.length;
    } catch (error) {
      this.logger.error(`Error invalidating sessions for user ${userId}`, error);
      return 0;
    }
  }

  async isSessionValid(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      return session !== null;
    } catch (error) {
      this.logger.error(`Error checking session validity ${sessionId}`, error);
      return false;
    }
  }

  async validateRefreshToken(refreshToken: string): Promise<string | null> {
    try {
      const [session] = await this.databaseService.drizzleClient
        .select()
        .from(userSessions)
        .where(and(
          eq(userSessions.refreshToken, refreshToken),
          eq(userSessions.isActive, true)
        ))
        .limit(1);

      if (!session) {
        return null;
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        await this.invalidateSession(session.sessionId);
        return null;
      }

      // Update last activity
      await this.updateLastActivity(session.sessionId);

      return session.userId;
    } catch (error) {
      this.logger.error(`Error validating refresh token`, error);
      return null;
    }
  }

  async rotateRefreshToken(oldRefreshToken: string, userId: string, userAgent: string, ipAddress: string): Promise<{ sessionId: string; refreshToken: string }> {
    // Invalidate the old session
    const oldSession = await this.getSessionByRefreshToken(oldRefreshToken);
    if (oldSession) {
      await this.invalidateSession(oldSession.sessionId);
    }

    // Create new session
    return this.createSession(userId, userAgent, ipAddress);
  }

  async getUserSessions(userId: string): Promise<any[]> {
    try {
      const sessions = await this.databaseService.drizzleClient
        .select()
        .from(userSessions)
        .where(eq(userSessions.userId, userId))
        .orderBy(desc(userSessions.createdAt));

      return sessions.map(session => ({
        id: session.id,
        sessionId: session.sessionId,
        deviceInfo: session.deviceInfo,
        isActive: session.isActive,
        expiresAt: session.expiresAt,
        lastActivityAt: session.lastActivityAt,
        createdAt: session.createdAt,
      }));
    } catch (error) {
      this.logger.error(`Error getting sessions for user ${userId}`, error);
      return [];
    }
  }

  async invalidateUserSession(userId: string, sessionId: string): Promise<boolean> {
    try {
      const [session] = await this.databaseService.drizzleClient
        .select()
        .from(userSessions)
        .where(and(
          eq(userSessions.userId, userId),
          eq(userSessions.sessionId, sessionId)
        ))
        .limit(1);

      if (!session) {
        return false;
      }

      await this.invalidateSession(sessionId);
      return true;
    } catch (error) {
      this.logger.error(`Error invalidating user session ${sessionId} for user ${userId}`, error);
      return false;
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await this.databaseService.drizzleClient
        .update(userSessions)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(and(
          eq(userSessions.isActive, true),
          lt(userSessions.expiresAt, new Date())
        ))
        .returning();

      this.logger.log(`Cleaned up ${result.length} expired sessions`);
      return result.length;
    } catch (error) {
      this.logger.error(`Error cleaning up expired sessions`, error);
      return 0;
    }
  }

  // Helper methods
  private async getActiveSessionsCount(userId: string): Promise<number> {
    try {
      const result = await this.databaseService.drizzleClient
        .select({ count: sql`count(*)` })
        .from(userSessions)
        .where(and(
          eq(userSessions.userId, userId),
          eq(userSessions.isActive, true),
          gt(userSessions.expiresAt, new Date())
        ));

      return Number(result[0]?.count) || 0;
    } catch (error) {
      this.logger.error(`Error getting active sessions count for user ${userId}`, error);
      return 0;
    }
  }

  private async invalidateOldestSession(userId: string): Promise<void> {
    try {
      const [oldestSession] = await this.databaseService.drizzleClient
        .select()
        .from(userSessions)
        .where(and(
          eq(userSessions.userId, userId),
          eq(userSessions.isActive, true)
        ))
        .orderBy(userSessions.createdAt)
        .limit(1);

      if (oldestSession) {
        await this.invalidateSession(oldestSession.sessionId);
        this.logger.log(`Invalidated oldest session ${oldestSession.sessionId} for user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Error invalidating oldest session for user ${userId}`, error);
    }
  }

  private async getSessionByRefreshToken(refreshToken: string): Promise<any | null> {
    try {
      const [session] = await this.databaseService.drizzleClient
        .select()
        .from(userSessions)
        .where(and(
          eq(userSessions.refreshToken, refreshToken),
          eq(userSessions.isActive, true)
        ))
        .limit(1);

      return session || null;
    } catch (error) {
      this.logger.error(`Error getting session by refresh token`, error);
      return null;
    }
  }

  private async updateLastActivity(sessionId: string): Promise<void> {
    try {
      await this.databaseService.drizzleClient
        .update(userSessions)
        .set({
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userSessions.sessionId, sessionId));
    } catch (error) {
      this.logger.error(`Error updating last activity for session ${sessionId}`, error);
    }
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }
}