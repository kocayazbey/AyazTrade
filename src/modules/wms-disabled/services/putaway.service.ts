import { Injectable } from '@nestjs/common';

@Injectable()
export class PutawayService {
  async getPendingTasks() {
    return { data: [], total: 0 };
  }

  async createPutawayTask(data: any) {
    return { id: Date.now().toString(), ...data, createdAt: new Date().toISOString() };
  }

  async completePutaway(taskId: string, actualLocationId: string) {
    return { id: taskId, status: 'completed', actualLocationId, completedAt: new Date().toISOString() };
  }
}