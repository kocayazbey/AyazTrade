import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

interface DDoSAttack {
  id: string;
  ip: string;
  startTime: number;
  requestCount: number;
  lastRequestTime: number;
  blocked: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface DDoSProtectionConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  blockDurationMs: number;
  whitelistIps: string[];
  blacklistIps: string[];
  enableAutoBlock: boolean;
  enableLogging: boolean;
}

@Injectable()
export class DDoSProtectionEnhancedService {
  private readonly logger = new Logger(DDoSProtectionEnhancedService.name);
  private readonly config: DDoSProtectionConfig;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {
    const parseIpList = (value?: string | string[] | null): string[] => {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length === 0) return [];
        return trimmed.split(',').map(v => v.trim()).filter(Boolean);
      }
      return [];
    };

    this.config = {
      maxRequestsPerMinute: this.configService.get<number>('DDOS_MAX_REQUESTS_PER_MINUTE', 60),
      maxRequestsPerHour: this.configService.get<number>('DDOS_MAX_REQUESTS_PER_HOUR', 1000),
      blockDurationMs: this.configService.get<number>('DDOS_BLOCK_DURATION_MS', 15 * 60 * 1000), // 15 minutes
      whitelistIps: parseIpList(this.configService.get<string | string[]>('DDOS_WHITELIST_IPS')),
      blacklistIps: parseIpList(this.configService.get<string | string[]>('DDOS_BLACKLIST_IPS')),
      enableAutoBlock: this.configService.get<boolean>('DDOS_ENABLE_AUTO_BLOCK', true),
      enableLogging: this.configService.get<boolean>('DDOS_ENABLE_LOGGING', true),
    };
  }

  async checkDDoSProtection(
    ip: string,
    userAgent?: string,
    path?: string,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    blockDuration?: number;
    severity?: string;
  }> {
    try {
      // Check whitelist first
      if (this.config.whitelistIps.includes(ip)) {
        return { allowed: true };
      }

      // Check blacklist
      if (this.config.blacklistIps.includes(ip)) {
        this.logSecurityEvent('BLOCKED_BLACKLIST_IP', { ip, userAgent, path });
        return {
          allowed: false,
          reason: 'IP is blacklisted',
          blockDuration: this.config.blockDurationMs,
        };
      }

      // Check if IP is currently blocked
      const blockKey = `ddos_block:${ip}`;
      const isBlocked = await this.cacheManager.get<boolean>(blockKey);
      if (isBlocked) {
        return {
          allowed: false,
          reason: 'IP is temporarily blocked due to DDoS protection',
          blockDuration: this.config.blockDurationMs,
        };
      }

      // Check request patterns
      const minuteKey = `ddos_minute:${ip}`;
      const hourKey = `ddos_hour:${ip}`;

      const [minuteCount, hourCount] = await Promise.all([
        this.cacheManager.get<number>(minuteKey) || 0,
        this.cacheManager.get<number>(hourKey) || 0,
      ]);

      // Check minute-based rate limit
      if (minuteCount >= this.config.maxRequestsPerMinute) {
        await this.handleDDoSAttack(ip, 'minute', minuteCount, userAgent, path);
        return {
          allowed: false,
          reason: 'Too many requests per minute',
          blockDuration: this.config.blockDurationMs,
          severity: this.getSeverity(minuteCount, this.config.maxRequestsPerMinute),
        };
      }

      // Check hour-based rate limit
      if (hourCount >= this.config.maxRequestsPerHour) {
        await this.handleDDoSAttack(ip, 'hour', hourCount, userAgent, path);
        return {
          allowed: false,
          reason: 'Too many requests per hour',
          blockDuration: this.config.blockDurationMs,
          severity: this.getSeverity(hourCount, this.config.maxRequestsPerHour),
        };
      }

      // Increment counters
      await Promise.all([
        this.cacheManager.set(minuteKey, minuteCount + 1, 60), // 1 minute TTL
        this.cacheManager.set(hourKey, hourCount + 1, 3600), // 1 hour TTL
      ]);

      return { allowed: true };
    } catch (error) {
      this.logger.error('DDoS protection check failed', error);
      // Fail open - allow request if DDoS protection fails
      return { allowed: true };
    }
  }

  private async handleDDoSAttack(
    ip: string,
    type: 'minute' | 'hour',
    count: number,
    userAgent?: string,
    path?: string,
  ): Promise<void> {
    const severity = this.getSeverity(count, type === 'minute' ? this.config.maxRequestsPerMinute : this.config.maxRequestsPerHour);
    
    if (this.config.enableAutoBlock) {
      const blockKey = `ddos_block:${ip}`;
      await this.cacheManager.set(blockKey, true, this.config.blockDurationMs / 1000);
      
      this.logger.warn(`DDoS attack detected and IP blocked`, {
        ip,
        type,
        count,
        severity,
        userAgent,
        path,
        blockDuration: this.config.blockDurationMs,
      });
    }

    if (this.config.enableLogging) {
      this.logSecurityEvent('DDOS_ATTACK_DETECTED', {
        ip,
        type,
        count,
        severity,
        userAgent,
        path,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private getSeverity(count: number, limit: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = count / limit;
    if (ratio >= 3) return 'critical';
    if (ratio >= 2) return 'high';
    if (ratio >= 1.5) return 'medium';
    return 'low';
  }

  private logSecurityEvent(event: string, data: any): void {
    this.logger.warn(`Security Event: ${event}`, {
      event,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  async unblockIp(ip: string): Promise<void> {
    const blockKey = `ddos_block:${ip}`;
    await this.cacheManager.del(blockKey);
    this.logger.log(`DDoS block removed for IP: ${ip}`);
  }

  async getDDoSStats(ip: string): Promise<{
    minuteCount: number;
    hourCount: number;
    isBlocked: boolean;
    blockExpiry?: number;
  }> {
    const [minuteCount, hourCount, isBlocked] = await Promise.all([
      this.cacheManager.get<number>(`ddos_minute:${ip}`) || 0,
      this.cacheManager.get<number>(`ddos_hour:${ip}`) || 0,
      this.cacheManager.get<boolean>(`ddos_block:${ip}`) || false,
    ]);

    return {
      minuteCount,
      hourCount,
      isBlocked,
    };
  }

  async addToWhitelist(ip: string): Promise<void> {
    if (!this.config.whitelistIps.includes(ip)) {
      this.config.whitelistIps.push(ip);
      this.logger.log(`IP added to DDoS whitelist: ${ip}`);
    }
  }

  async addToBlacklist(ip: string): Promise<void> {
    if (!this.config.blacklistIps.includes(ip)) {
      this.config.blacklistIps.push(ip);
      this.logger.log(`IP added to DDoS blacklist: ${ip}`);
    }
  }

  async removeFromWhitelist(ip: string): Promise<void> {
    const index = this.config.whitelistIps.indexOf(ip);
    if (index > -1) {
      this.config.whitelistIps.splice(index, 1);
      this.logger.log(`IP removed from DDoS whitelist: ${ip}`);
    }
  }

  async removeFromBlacklist(ip: string): Promise<void> {
    const index = this.config.blacklistIps.indexOf(ip);
    if (index > -1) {
      this.config.blacklistIps.splice(index, 1);
      this.logger.log(`IP removed from DDoS blacklist: ${ip}`);
    }
  }
}
