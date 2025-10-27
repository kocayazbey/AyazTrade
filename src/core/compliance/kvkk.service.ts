import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/core/database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

@Injectable()
export class KvkkService {
  private readonly logger = new Logger(KvkkService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: any) {}

  async recordConsent(
    userId: string,
    consentType: string,
    granted: boolean,
    ipAddress?: string,
  ): Promise<void> {
    await this.db.execute(
      `INSERT INTO user_consents (user_id, consent_type, granted, timestamp, ip_address)
       VALUES ($1, $2, $3, NOW(), $4)`,
      [userId, consentType, granted, ipAddress]
    );

    this.logger.log(`KVKK consent recorded for user ${userId}: ${consentType}=${granted}`);
  }

  async getConsentHistory(userId: string): Promise<any[]> {
    const result = await this.db.execute(
      `SELECT * FROM user_consents WHERE user_id = $1 ORDER BY timestamp DESC`,
      [userId]
    );
    return result.rows;
  }

  async exportPersonalData(userId: string): Promise<any> {
    this.logger.log(`Exporting personal data for user ${userId} (KVKK Article 11)`);
    
    const user = await this.db.execute(
      `SELECT email, first_name, last_name, phone, created_at FROM users WHERE id = $1`,
      [userId]
    );

    return {
      personalInfo: user.rows[0],
      consents: await this.getConsentHistory(userId),
      exportDate: new Date(),
      regulation: 'KVKK (Kişisel Verilerin Korunması Kanunu)',
    };
  }

  async anonymizeData(userId: string): Promise<void> {
    await this.db.execute(
      `UPDATE users SET 
        email = 'anonymized_' || $1 || '@kvkk.local',
        first_name = 'Anonim',
        last_name = 'Kullanıcı',
        phone = NULL,
        deleted_at = NOW()
      WHERE id = $1`,
      [userId]
    );

    this.logger.log(`User data anonymized per KVKK request: ${userId}`);
  }

  async deletePersonalData(userId: string, reason: string): Promise<void> {
    await this.db.execute(
      `UPDATE users SET 
        is_active = false,
        deleted_at = NOW(),
        metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{deletion}', $2::jsonb)
      WHERE id = $1`,
      [userId, JSON.stringify({ reason, date: new Date(), regulation: 'KVKK' })]
    );

    this.logger.warn(`Personal data deletion initiated for user ${userId}: ${reason}`);
  }
}

