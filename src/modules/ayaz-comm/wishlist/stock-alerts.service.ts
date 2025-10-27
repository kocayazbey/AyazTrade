import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class StockAlertsService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async createStockAlert(customerId: string, productId: string, variantId?: string): Promise<any> {
    const alert = {
      id: `SALERT${Date.now()}`,
      customerId,
      productId,
      variantId,
      isActive: true,
      createdAt: new Date(),
    };

    await this.eventEmitter.emit('stock_alert.created', alert);
    return alert;
  }

  async notifyBackInStock(productId: string): Promise<void> {
    await this.eventEmitter.emit('stock_alert.triggered', { productId });
  }

  async deleteStockAlert(alertId: string): Promise<void> {
    await this.eventEmitter.emit('stock_alert.deleted', { alertId });
  }
}

