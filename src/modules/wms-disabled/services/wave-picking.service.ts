import { Injectable } from '@nestjs/common';

@Injectable()
export class WavePickingService {
  async createWave(warehouseId: string, orderIds: string[], config: any) {
    return { id: Date.now().toString(), warehouseId, orderIds, config, createdAt: new Date().toISOString() };
  }

  async releaseWave(waveId: string, warehouseId: string) {
    return { id: waveId, status: 'released', releasedAt: new Date().toISOString() };
  }

  async completeWave(waveId: string) {
    return { id: waveId, status: 'completed', completedAt: new Date().toISOString() };
  }
}