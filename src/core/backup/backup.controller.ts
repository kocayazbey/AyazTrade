import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { BackupService } from './backup.service';

@Controller('backup')
export class BackupController {
  constructor(private backupService: BackupService) {}

  @Post('create')
  async createBackup() {
    return this.backupService.createBackup();
  }

  @Post('restore')
  async restoreBackup(@Body('backupPath') backupPath: string) {
    return this.backupService.restoreBackup(backupPath);
  }

  @Get('list')
  async listBackups() {
    return this.backupService.listBackups();
  }

  @Post('cleanup')
  async cleanupOldBackups() {
    return this.backupService.cleanupOldBackups();
  }

  @Get('status')
  async getBackupStatus() {
    return this.backupService.getBackupStatus();
  }
}
