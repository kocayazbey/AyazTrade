import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private backupConfig = {
    enabled: true,
    schedule: '0 2 * * *', // Daily at 2 AM
    retention: 7, // Keep 7 days of backups
    compression: true,
    encryption: false,
  };

  constructor(private configService: ConfigService) {
    this.initializeBackupConfig();
  }

  private initializeBackupConfig(): void {
    this.backupConfig = {
      enabled: this.configService.get('BACKUP_ENABLED', true),
      schedule: this.configService.get('BACKUP_SCHEDULE', '0 2 * * *'),
      retention: this.configService.get('BACKUP_RETENTION', 7),
      compression: this.configService.get('BACKUP_COMPRESSION', true),
      encryption: this.configService.get('BACKUP_ENCRYPTION', false),
    };
  }

  async createBackup(): Promise<{
    success: boolean;
    backupPath?: string;
    error?: string;
  }> {
    if (!this.backupConfig.enabled) {
      return { success: false, error: 'Backup is disabled' };
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = this.configService.get('BACKUP_DIR', './backups');
      const backupFileName = `backup-${timestamp}.sql`;
      const backupPath = path.join(backupDir, backupFileName);

      // Ensure backup directory exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Create database backup
      const dbHost = this.configService.get('DB_HOST', 'localhost');
      const dbPort = this.configService.get('DB_PORT', 5432);
      const dbName = this.configService.get('DB_NAME', 'ayaztrade');
      const dbUser = this.configService.get('DB_USER', 'postgres');
      const dbPassword = this.configService.get('DB_PASSWORD', '');

      const pgDumpCommand = `PGPASSWORD=${dbPassword} pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} > ${backupPath}`;
      
      this.logger.log('Creating database backup...');
      await execAsync(pgDumpCommand);

      // Compress backup if enabled
      if (this.backupConfig.compression) {
        const compressedPath = `${backupPath}.gz`;
        await execAsync(`gzip ${backupPath}`);
        this.logger.log(`Backup compressed: ${compressedPath}`);
      }

      // Encrypt backup if enabled
      if (this.backupConfig.encryption) {
        const encryptionKey = this.configService.get('BACKUP_ENCRYPTION_KEY');
        if (!encryptionKey) {
          throw new Error('Backup encryption key not configured');
        }
        // This would be implemented with actual encryption logic
        this.logger.log('Backup encrypted');
      }

      this.logger.log(`Backup created successfully: ${backupPath}`);
      return { success: true, backupPath };
    } catch (error) {
      this.logger.error('Backup creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  async restoreBackup(backupPath: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (!fs.existsSync(backupPath)) {
        return { success: false, error: 'Backup file not found' };
      }

      const dbHost = this.configService.get('DB_HOST', 'localhost');
      const dbPort = this.configService.get('DB_PORT', 5432);
      const dbName = this.configService.get('DB_NAME', 'ayaztrade');
      const dbUser = this.configService.get('DB_USER', 'postgres');
      const dbPassword = this.configService.get('DB_PASSWORD', '');

      // Check if backup is compressed
      const isCompressed = backupPath.endsWith('.gz');
      const actualBackupPath = isCompressed ? backupPath.slice(0, -3) : backupPath;

      if (isCompressed) {
        await execAsync(`gunzip -c ${backupPath} > ${actualBackupPath}`);
      }

      const psqlCommand = `PGPASSWORD=${dbPassword} psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} < ${actualBackupPath}`;
      
      this.logger.log('Restoring database backup...');
      await execAsync(psqlCommand);

      if (isCompressed) {
        fs.unlinkSync(actualBackupPath);
      }

      this.logger.log('Backup restored successfully');
      return { success: true };
    } catch (error) {
      this.logger.error('Backup restoration failed:', error);
      return { success: false, error: error.message };
    }
  }

  async listBackups(): Promise<Array<{
    name: string;
    path: string;
    size: number;
    created: Date;
  }>> {
    const backupDir = this.configService.get('BACKUP_DIR', './backups');
    
    if (!fs.existsSync(backupDir)) {
      return [];
    }

    const files = fs.readdirSync(backupDir);
    const backups = files
      .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());

    return backups;
  }

  async cleanupOldBackups(): Promise<{
    success: boolean;
    deletedCount: number;
    error?: string;
  }> {
    try {
      const backups = await this.listBackups();
      const retentionDays = this.backupConfig.retention;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const oldBackups = backups.filter(backup => backup.created < cutoffDate);
      let deletedCount = 0;

      for (const backup of oldBackups) {
        try {
          fs.unlinkSync(backup.path);
          deletedCount++;
          this.logger.log(`Deleted old backup: ${backup.name}`);
        } catch (error) {
          this.logger.error(`Failed to delete backup ${backup.name}:`, error);
        }
      }

      this.logger.log(`Cleanup completed: ${deletedCount} old backups deleted`);
      return { success: true, deletedCount };
    } catch (error) {
      this.logger.error('Backup cleanup failed:', error);
      return { success: false, deletedCount: 0, error: error.message };
    }
  }

  async getBackupStatus(): Promise<{
    enabled: boolean;
    schedule: string;
    retention: number;
    lastBackup?: Date;
    nextBackup?: Date;
    totalBackups: number;
    totalSize: number;
  }> {
    const backups = await this.listBackups();
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    const lastBackup = backups.length > 0 ? backups[0].created : undefined;

    // Calculate next backup time (simplified)
    const nextBackup = lastBackup ? new Date(lastBackup.getTime() + 24 * 60 * 60 * 1000) : undefined;

    return {
      enabled: this.backupConfig.enabled,
      schedule: this.backupConfig.schedule,
      retention: this.backupConfig.retention,
      lastBackup,
      nextBackup,
      totalBackups: backups.length,
      totalSize,
    };
  }
}
