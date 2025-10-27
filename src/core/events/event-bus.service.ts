import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';

export interface DomainEvent {
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  eventData: any;
  timestamp: Date;
  version: number;
}

@Injectable()
export class EventBusService implements OnModuleInit {
  private readonly logger = new Logger(EventBusService.name);

  constructor(private eventEmitter: EventEmitter2) {}

  async onModuleInit() {
    this.logger.log('Event Bus Service initialized');
  }

  // Publish domain events
  async publish(event: DomainEvent): Promise<void> {
    try {
      this.eventEmitter.emit(event.eventType, event);
      this.logger.debug(`Published event: ${event.eventType} for aggregate: ${event.aggregateType}:${event.aggregateId}`);
    } catch (error) {
      this.logger.error(`Failed to publish event: ${event.eventType}`, error);
      throw error;
    }
  }

  // Simple emit method for backward compatibility
  async emit(eventType: string, data: any): Promise<void> {
    try {
      this.eventEmitter.emit(eventType, data);
      this.logger.debug(`Emitted event: ${eventType}`);
    } catch (error) {
      this.logger.error(`Failed to emit event: ${eventType}`, error);
      throw error;
    }
  }

  // Publish multiple events
  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  // Subscribe to events
  subscribe(eventType: string, handler: (event: DomainEvent) => void | Promise<void>): void {
    this.eventEmitter.on(eventType, handler);
    this.logger.debug(`Subscribed to event: ${eventType}`);
  }

  // Subscribe to multiple event types
  subscribeToMany(eventTypes: string[], handler: (event: DomainEvent) => void | Promise<void>): void {
    eventTypes.forEach(eventType => {
      this.subscribe(eventType, handler);
    });
  }

  // Unsubscribe from events
  unsubscribe(eventType: string, handler?: (event: DomainEvent) => void | Promise<void>): void {
    if (handler) {
      this.eventEmitter.off(eventType, handler);
    } else {
      this.eventEmitter.removeAllListeners(eventType);
    }
    this.logger.debug(`Unsubscribed from event: ${eventType}`);
  }

  // Create domain event
  createEvent(
    eventType: string,
    aggregateId: string,
    aggregateType: string,
    eventData: any,
    version: number = 1
  ): DomainEvent {
    return {
      eventType,
      aggregateId,
      aggregateType,
      eventData,
      timestamp: new Date(),
      version,
    };
  }

  // Business event helpers
  async publishCustomerCreated(customerId: string, customerData: any): Promise<void> {
    const event = this.createEvent(
      'customer.created',
      customerId,
      'Customer',
      customerData
    );
    await this.publish(event);
  }

  async publishOrderCreated(orderId: string, orderData: any): Promise<void> {
    const event = this.createEvent(
      'order.created',
      orderId,
      'Order',
      orderData
    );
    await this.publish(event);
  }

  async publishInvoiceGenerated(invoiceId: string, invoiceData: any): Promise<void> {
    const event = this.createEvent(
      'invoice.generated',
      invoiceId,
      'Invoice',
      invoiceData
    );
    await this.publish(event);
  }

  async publishPaymentReceived(paymentId: string, paymentData: any): Promise<void> {
    const event = this.createEvent(
      'payment.received',
      paymentId,
      'Payment',
      paymentData
    );
    await this.publish(event);
  }

  async publishInventoryUpdated(productId: string, inventoryData: any): Promise<void> {
    const event = this.createEvent(
      'inventory.updated',
      productId,
      'Inventory',
      inventoryData
    );
    await this.publish(event);
  }

  // Event statistics
  getEventStats(): { totalEvents: number; eventTypes: string[] } {
    const listeners = this.eventEmitter.eventNames();
    return {
      totalEvents: listeners.length,
      eventTypes: listeners as string[],
    };
  }

  // Health check
  isHealthy(): boolean {
    try {
      return this.eventEmitter !== null;
    } catch (error) {
      return false;
    }
  }
}