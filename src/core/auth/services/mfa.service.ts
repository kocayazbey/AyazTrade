import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { users } from '../../../database/schema/core/users.schema';
import { eq } from 'drizzle-orm';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

export interface MFASetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface MFAVerification {
  token: string;
  backupCode?: string;
}

@Injectable()
export class MFAService {
  private readonly logger = new Logger(MFAService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async setupMFA(userId: string): Promise<MFASetup> {
    try {
      // Get user info for QR code
      const [user] = await this.databaseService.drizzleClient
        .select({
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const userInfo = user;

      // Generate TOTP secret
      const secret = speakeasy.generateSecret({
        name: `AyazTrade (${userInfo.email})`,
        issuer: 'AyazTrade',
        length: 32,
      });

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store secret and backup codes in database (encrypted)
      await this.databaseService.drizzleClient
        .update(users)
        .set({
          mfaSecret: this.encryptSecret(secret.base32),
          mfaBackupCodes: this.encryptBackupCodes(backupCodes),
          mfaEnabled: false, // Will be enabled after verification
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Generate QR code
      const qrCode = await qrcode.toDataURL(secret.otpauth_url!);

      return {
        secret: secret.base32,
        qrCode,
        backupCodes,
      };
    } catch (error) {
      this.logger.error('Failed to setup MFA', error, { userId });
      throw new BadRequestException('Failed to setup MFA');
    }
  }

  async enableMFA(userId: string, token: string): Promise<boolean> {
    try {
      // Get user MFA secret
      const [user] = await this.databaseService.drizzleClient
        .select({
          mfaSecret: users.mfaSecret,
          mfaBackupCodes: users.mfaBackupCodes,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length || !user[0].mfaSecret) {
        throw new BadRequestException('MFA not configured');
      }

      // Verify token
      const secret = this.decryptSecret(user[0].mfaSecret);
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2, // Allow 2 time steps (1 minute) tolerance
      });

      if (!verified) {
        throw new BadRequestException('Invalid verification code');
      }

      // Enable MFA
      await this.databaseService.drizzleClient
        .update(users)
        .set({
          mfaEnabled: true,
          mfaEnabledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      this.logger.log('MFA enabled successfully', { userId });
      return true;
    } catch (error) {
      this.logger.error('Failed to enable MFA', error, { userId });
      throw error;
    }
  }

  async disableMFA(userId: string, token: string): Promise<boolean> {
    try {
      // Get user MFA secret
      const [user] = await this.databaseService.drizzleClient
        .select({
          mfaSecret: users.mfaSecret,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length || !user[0].mfaSecret) {
        throw new BadRequestException('MFA not enabled');
      }

      // Verify token before disabling
      const secret = this.decryptSecret(user[0].mfaSecret);
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2,
      });

      if (!verified) {
        throw new BadRequestException('Invalid verification code');
      }

      // Disable MFA
      await this.databaseService.drizzleClient
        .update(users)
        .set({
          mfaEnabled: false,
          mfaSecret: null,
          mfaBackupCodes: null,
          mfaEnabledAt: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      this.logger.log('MFA disabled successfully', { userId });
      return true;
    } catch (error) {
      this.logger.error('Failed to disable MFA', error, { userId });
      throw error;
    }
  }

  async verifyMFA(userId: string, verification: MFAVerification): Promise<boolean> {
    try {
      // Get user MFA data
      const [user] = await this.databaseService.drizzleClient
        .select({
          mfaSecret: users.mfaSecret,
          mfaBackupCodes: users.mfaBackupCodes,
          mfaEnabled: users.mfaEnabled,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user || !user.mfaEnabled || !user.mfaSecret) {
        throw new BadRequestException('MFA not enabled');
      }

      const secret = this.decryptSecret(user.mfaSecret);
      let verified = false;

      // Try TOTP first
      if (verification.token && !verification.backupCode) {
        verified = speakeasy.totp.verify({
          secret,
          encoding: 'base32',
          token: verification.token,
          window: 2,
        });
      }

      // Try backup codes if TOTP fails
      if (!verified && verification.backupCode) {
        const backupCodes = this.decryptBackupCodes(user.mfaBackupCodes!);
        const codeIndex = backupCodes.indexOf(verification.backupCode);

        if (codeIndex !== -1) {
          // Remove used backup code
          backupCodes.splice(codeIndex, 1);
          await this.databaseService.drizzleClient
            .update(users)
            .set({
              mfaBackupCodes: this.encryptBackupCodes(backupCodes),
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

          verified = true;
        }
      }

      if (!verified) {
        throw new BadRequestException('Invalid verification code');
      }

      this.logger.log('MFA verification successful', { userId });
      return true;
    } catch (error) {
      this.logger.error('MFA verification failed', error, { userId });
      throw error;
    }
  }

  async generateNewBackupCodes(userId: string): Promise<string[]> {
    try {
      const backupCodes = this.generateBackupCodes();

      await this.databaseService.drizzleClient
        .update(users)
        .set({
          mfaBackupCodes: this.encryptBackupCodes(backupCodes),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return backupCodes;
    } catch (error) {
      this.logger.error('Failed to generate backup codes', error, { userId });
      throw new BadRequestException('Failed to generate backup codes');
    }
  }

  async getMFAStatus(userId: string): Promise<{
    enabled: boolean;
    configured: boolean;
    backupCodesCount: number;
  }> {
    try {
      const [user] = await this.databaseService.drizzleClient
        .select({
          mfaEnabled: users.mfaEnabled,
          mfaSecret: users.mfaSecret,
          mfaBackupCodes: users.mfaBackupCodes,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const userData = user;
      const backupCodes = userData.mfaBackupCodes
        ? this.decryptBackupCodes(userData.mfaBackupCodes)
        : [];

      return {
        enabled: userData.mfaEnabled || false,
        configured: !!userData.mfaSecret,
        backupCodesCount: backupCodes.length,
      };
    } catch (error) {
      this.logger.error('Failed to get MFA status', error, { userId });
      throw error;
    }
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      // Generate 8-character alphanumeric codes
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  private encryptSecret(secret: string): string {
    // In production, use proper encryption
    // For now, just base64 encode
    return Buffer.from(secret).toString('base64');
  }

  private decryptSecret(encryptedSecret: string): string {
    // In production, use proper decryption
    return Buffer.from(encryptedSecret, 'base64').toString();
  }

  private encryptBackupCodes(codes: string[]): string {
    // In production, use proper encryption
    return Buffer.from(JSON.stringify(codes)).toString('base64');
  }

  private decryptBackupCodes(encryptedCodes: string): string[] {
    // In production, use proper decryption
    return JSON.parse(Buffer.from(encryptedCodes, 'base64').toString());
  }
}
