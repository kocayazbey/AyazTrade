import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';

interface JwtKey {
  kid: string;
  secret: string;
  algorithm: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

@Injectable()
export class JwtKeyRotationService {
  private readonly logger = new Logger(JwtKeyRotationService.name);
  private readonly keyRotationInterval: number;
  private readonly keyLifetime: number;
  private readonly gracePeriod: number;
  private currentKey: JwtKey;
  private previousKey: JwtKey | null = null;

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.keyRotationInterval = this.configService.get<number>('JWT_KEY_ROTATION_INTERVAL', 24 * 60 * 60 * 1000); // 24 hours
    this.keyLifetime = this.configService.get<number>('JWT_KEY_LIFETIME', 7 * 24 * 60 * 60 * 1000); // 7 days
    this.gracePeriod = this.configService.get<number>('JWT_GRACE_PERIOD', 60 * 60 * 1000); // 1 hour

    this.initializeKeys();
    this.startKeyRotation();
  }

  private async initializeKeys() {
    // Try to get current key from cache
    const cachedKey = await this.cacheManager.get<JwtKey>('jwt_current_key');
    
    if (cachedKey && this.isKeyValid(cachedKey)) {
      this.currentKey = cachedKey;
      this.logger.log(`Loaded existing JWT key: ${cachedKey.kid}`);
    } else {
      // Generate new key
      this.currentKey = await this.generateNewKey();
      await this.cacheManager.set('jwt_current_key', this.currentKey, this.keyLifetime / 1000);
      this.logger.log(`Generated new JWT key: ${this.currentKey.kid}`);
    }

    // Try to get previous key for grace period
    const cachedPreviousKey = await this.cacheManager.get<JwtKey>('jwt_previous_key');
    if (cachedPreviousKey && this.isKeyInGracePeriod(cachedPreviousKey)) {
      this.previousKey = cachedPreviousKey;
      this.logger.log(`Loaded previous JWT key for grace period: ${cachedPreviousKey.kid}`);
    }
  }

  private async generateNewKey(): Promise<JwtKey> {
    const kid = crypto.randomUUID();
    const secret = crypto.randomBytes(64).toString('base64');
    const now = new Date();
    
    return {
      kid,
      secret,
      algorithm: 'HS256',
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.keyLifetime),
      isActive: true,
    };
  }

  private isKeyValid(key: JwtKey): boolean {
    const now = new Date();
    return key.isActive && key.expiresAt > now;
  }

  private isKeyInGracePeriod(key: JwtKey): boolean {
    const now = new Date();
    const gracePeriodEnd = new Date(key.expiresAt.getTime() + this.gracePeriod);
    return !key.isActive && gracePeriodEnd > now;
  }

  private async startKeyRotation() {
    setInterval(async () => {
      await this.rotateKey();
    }, this.keyRotationInterval);
  }

  private async rotateKey() {
    try {
      this.logger.log('Starting JWT key rotation...');

      // Move current key to previous
      if (this.currentKey) {
        this.previousKey = { ...this.currentKey, isActive: false };
        await this.cacheManager.set('jwt_previous_key', this.previousKey, this.gracePeriod / 1000);
        this.logger.log(`Moved current key to previous: ${this.previousKey.kid}`);
      }

      // Generate new current key
      this.currentKey = await this.generateNewKey();
      await this.cacheManager.set('jwt_current_key', this.currentKey, this.keyLifetime / 1000);
      
      this.logger.log(`JWT key rotation completed. New key: ${this.currentKey.kid}`);
      
      // Clean up expired previous key
      if (this.previousKey && !this.isKeyInGracePeriod(this.previousKey)) {
        await this.cacheManager.del('jwt_previous_key');
        this.previousKey = null;
        this.logger.log(`Cleaned up expired previous key: ${this.previousKey?.kid}`);
      }

    } catch (error) {
      this.logger.error('JWT key rotation failed:', error);
    }
  }

  getCurrentKey(): JwtKey {
    return this.currentKey;
  }

  getPreviousKey(): JwtKey | null {
    return this.previousKey;
  }

  async getKeyByKid(kid: string): Promise<JwtKey | null> {
    if (this.currentKey?.kid === kid) {
      return this.currentKey;
    }
    
    if (this.previousKey?.kid === kid) {
      return this.previousKey;
    }

    return null;
  }

  async signToken(payload: any): Promise<string> {
    const key = this.getCurrentKey();
    
    return this.jwtService.sign(payload, {
      secret: key.secret,
      algorithm: key.algorithm as any,
      header: {
        kid: key.kid,
        alg: key.algorithm,
      },
      issuer: this.configService.get<string>('JWT_ISSUER', 'ayaztrade'),
      audience: this.configService.get<string>('JWT_AUDIENCE', 'ayaztrade-api'),
    });
  }

  async verifyToken(token: string): Promise<any> {
    try {
      // First try with current key
      if (this.currentKey) {
        try {
          return this.jwtService.verify(token, {
            secret: this.currentKey.secret,
            algorithms: [this.currentKey.algorithm as any],
            issuer: this.configService.get<string>('JWT_ISSUER', 'ayaztrade'),
            audience: this.configService.get<string>('JWT_AUDIENCE', 'ayaztrade-api'),
          });
        } catch (error) {
          // If current key fails, try with previous key during grace period
          if (this.previousKey && this.isKeyInGracePeriod(this.previousKey)) {
            return this.jwtService.verify(token, {
              secret: this.previousKey.secret,
              algorithms: [this.previousKey.algorithm as any],
              issuer: this.configService.get<string>('JWT_ISSUER', 'ayaztrade'),
              audience: this.configService.get<string>('JWT_AUDIENCE', 'ayaztrade-api'),
            });
          }
          throw error;
        }
      }
      
      throw new Error('No valid JWT key available');
    } catch (error) {
      this.logger.warn(`JWT verification failed: ${error.message}`);
      throw error;
    }
  }

  async getKeyStatus() {
    return {
      current: this.currentKey ? {
        kid: this.currentKey.kid,
        createdAt: this.currentKey.createdAt,
        expiresAt: this.currentKey.expiresAt,
        isActive: this.currentKey.isActive,
      } : null,
      previous: this.previousKey ? {
        kid: this.previousKey.kid,
        createdAt: this.previousKey.createdAt,
        expiresAt: this.previousKey.expiresAt,
        isActive: this.previousKey.isActive,
        inGracePeriod: this.isKeyInGracePeriod(this.previousKey),
      } : null,
      nextRotation: new Date(Date.now() + this.keyRotationInterval),
    };
  }

  async forceKeyRotation() {
    this.logger.log('Forcing JWT key rotation...');
    await this.rotateKey();
  }
}
