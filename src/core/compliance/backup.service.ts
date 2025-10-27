import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/core/database/database.module';
import { Pool } from 'pg';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import { exec } from 'child_process';
import * as util from 'util';

const execPromise = util.promisify(exec);

interface BackupMetadata {
  id: string;
  timestamp: Date;
  size: number;
  type: 'full' | 'incremental';
  location: string;
  checksum: string;
  status: 'completed' | 'failed' | 'in_progress';
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private s3: S3Client;

  constructor(@Inject(DRIZZLE_ORM) private readonly db: any) {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      } : undefined,
    });
  }

  async createBackup(type: 'full' | 'incremental' = 'full'): Promise<BackupMetadata> {
    this.logger.log(`Creating ${type} backup...`);
    const timestamp = new Date();
    const backupId = `backup_${timestamp.getTime()}`;
    const filename = `${backupId}.sql`;

    try {
      const command = type === 'full'
        ? `pg_dump -h ${process.env.DATABASE_HOST} -U ${process.env.DATABASE_USER} -d ${process.env.DATABASE_NAME} > ${filename}`
        : `pg_dump -h ${process.env.DATABASE_HOST} -U ${process.env.DATABASE_USER} -d ${process.env.DATABASE_NAME} --format=custom > ${filename}`;

      await execPromise(command);

      const stats = fs.statSync(filename);
      const size = stats.size;

      const fileContent = fs.readFileSync(filename);
      await this.uploadToS3(filename, fileContent);

      fs.unlinkSync(filename);

      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        size,
        type,
        location: `s3://${process.env.BACKUP_S3_BUCKET}/${filename}`,
        checksum: '',
        status: 'completed',
      };

      this.logger.log(`Backup created: ${backupId} (${(size / 1024 / 1024).toFixed(2)} MB)`);
      return metadata;
    } catch (error) {
      this.logger.error('Backup creation failed:', error);
      throw error;
    }
  }

  async restoreBackup(backupId: string): Promise<void> {
    this.logger.log(`Restoring backup: ${backupId}`);

    try {
      const filename = `${backupId}.sql`;
      const content = await this.downloadFromS3(filename);

      fs.writeFileSync(filename, content);

      const command = `psql -h ${process.env.DATABASE_HOST} -U ${process.env.DATABASE_USER} -d ${process.env.DATABASE_NAME} < ${filename}`;
      await execPromise(command);

      fs.unlinkSync(filename);

      this.logger.log(`Backup restored successfully: ${backupId}`);
    } catch (error) {
      this.logger.error('Backup restore failed:', error);
      throw error;
    }
  }

  async listBackups(): Promise<BackupMetadata[]> {
    try {
      const response = await this.s3.send(new ListObjectsV2Command({
        Bucket: process.env.BACKUP_S3_BUCKET || '',
      }));

      return (response.Contents || []).map(obj => ({
        id: obj.Key!.replace('.sql', ''),
        timestamp: obj.LastModified!,
        size: obj.Size!,
        type: 'full',
        location: `s3://${process.env.BACKUP_S3_BUCKET}/${obj.Key}`,
        checksum: obj.ETag!,
        status: 'completed' as const,
      }));
    } catch (error) {
      this.logger.error('Failed to list backups:', error);
      return [];
    }
  }

  private async uploadToS3(filename: string, content: Buffer): Promise<void> {
    await this.s3.send(new PutObjectCommand({
      Bucket: process.env.BACKUP_S3_BUCKET || '',
      Key: filename,
      Body: content,
    }));
  }

  private async downloadFromS3(filename: string): Promise<Buffer> {
    const response = await this.s3.send(new GetObjectCommand({
      Bucket: process.env.BACKUP_S3_BUCKET || '',
      Key: filename,
    }));

    // In AWS SDK v3, Body is a ReadableStream | Blob | Uint8Array
    const body: any = response.Body;
    if (body instanceof Buffer) return body;
    if (typeof body?.transformToByteArray === 'function') {
      const arr = await body.transformToByteArray();
      return Buffer.from(arr);
    }
    // Fallback: stream to buffer
    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      body.on('data', (chunk: Buffer) => chunks.push(chunk));
      body.on('end', () => resolve(Buffer.concat(chunks)));
      body.on('error', reject);
    });
  }

  async deleteOldBackups(retentionDays: number = 30): Promise<number> {
    const backups = await this.listBackups();
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    let deleted = 0;
    for (const backup of backups) {
      if (backup.timestamp < cutoffDate) {
        await this.s3.send(new DeleteObjectCommand({
          Bucket: process.env.BACKUP_S3_BUCKET || '',
          Key: `${backup.id}.sql`,
        }));
        deleted++;
      }
    }

    this.logger.log(`Deleted ${deleted} old backups`);
    return deleted;
  }
}

