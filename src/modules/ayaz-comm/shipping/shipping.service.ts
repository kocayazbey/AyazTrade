import { Injectable, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ShippingRatesService } from './shipping-rates.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';

export enum ShipmentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETURNED = 'returned',
  CANCELLED = 'cancelled',
}

@Injectable()
export class ShippingService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly shippingRatesService: ShippingRatesService,
  ) {}

  async createShipment(createShipmentDto: CreateShipmentDto): Promise<any> {
    const { orderId, carrier, service, fromAddress, toAddress, packages } = createShipmentDto;

    // Validate addresses
    if (!toAddress || !toAddress.city || !toAddress.postalCode) {
      throw new BadRequestException('Invalid shipping address');
    }

    // Calculate shipping cost
    const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0);
    const shippingCost = await this.shippingRatesService.calculateRate(carrier, service, totalWeight, toAddress);

    const shipment = {
      id: `SHIP${Date.now()}`,
      orderId,
      carrier,
      service,
      trackingNumber: this.generateTrackingNumber(carrier),
      status: ShipmentStatus.PENDING,
      fromAddress,
      toAddress,
      packages,
      shippingCost,
      estimatedDelivery: this.calculateEstimatedDelivery(carrier, service),
      createdAt: new Date(),
      updatedAt: new Date(),
      events: [],
    };

    await this.eventEmitter.emit('shipment.created', shipment);

    return shipment;
  }

  async updateShipmentStatus(shipmentId: string, status: ShipmentStatus, location?: string): Promise<any> {
    // In real implementation, fetch from database
    const shipment = { id: shipmentId, status: ShipmentStatus.PROCESSING, events: [] };

    shipment.status = status;
    shipment['updatedAt'] = new Date();

    const event = {
      status,
      location: location || 'Unknown',
      timestamp: new Date(),
      description: this.getStatusDescription(status),
    };

    shipment.events.push(event);

    await this.eventEmitter.emit('shipment.status_updated', { shipment, event });

    return shipment;
  }

  async cancelShipment(shipmentId: string, reason: string): Promise<any> {
    const shipment = { id: shipmentId, status: ShipmentStatus.PROCESSING };

    if ([ShipmentStatus.DELIVERED, ShipmentStatus.CANCELLED].includes(shipment.status)) {
      throw new BadRequestException('Cannot cancel shipment in current status');
    }

    shipment.status = ShipmentStatus.CANCELLED;
    shipment['cancelledAt'] = new Date();
    shipment['cancellationReason'] = reason;
    shipment['updatedAt'] = new Date();

    await this.eventEmitter.emit('shipment.cancelled', shipment);

    return shipment;
  }

  async getShipmentById(shipmentId: string): Promise<any> {
    // In real implementation, fetch from database
    return null;
  }

  async getShipmentByOrderId(orderId: string): Promise<any> {
    // In real implementation, fetch from database
    return null;
  }

  async getShipmentByTrackingNumber(trackingNumber: string): Promise<any> {
    // In real implementation, fetch from database
    return null;
  }

  async schedulePickup(shipmentId: string, pickupDate: Date, pickupTime: string): Promise<any> {
    const shipment = { id: shipmentId };

    const pickup = {
      id: `PICKUP${Date.now()}`,
      shipmentId,
      scheduledDate: pickupDate,
      scheduledTime: pickupTime,
      status: 'scheduled',
      createdAt: new Date(),
    };

    await this.eventEmitter.emit('pickup.scheduled', pickup);

    return pickup;
  }

  async generateLabel(shipmentId: string): Promise<any> {
    // In real implementation, integrate with carrier API to generate label
    return {
      shipmentId,
      labelUrl: `https://example.com/labels/${shipmentId}.pdf`,
      format: 'PDF',
      createdAt: new Date(),
    };
  }

  async calculateShippingCost(
    carrier: string,
    service: string,
    weight: number,
    destination: any,
  ): Promise<number> {
    return this.shippingRatesService.calculateRate(carrier, service, weight, destination);
  }

  private generateTrackingNumber(carrier: string): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${carrier.substring(0, 3).toUpperCase()}${timestamp}${random}`;
  }

  private calculateEstimatedDelivery(carrier: string, service: string): Date {
    // Simple estimation logic
    const daysMap = {
      express: 1,
      standard: 3,
      economy: 5,
    };

    const days = daysMap[service.toLowerCase()] || 3;
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + days);

    return estimatedDate;
  }

  private getStatusDescription(status: ShipmentStatus): string {
    const descriptions = {
      [ShipmentStatus.PENDING]: 'Shipment created, awaiting processing',
      [ShipmentStatus.PROCESSING]: 'Shipment is being processed',
      [ShipmentStatus.SHIPPED]: 'Shipment has been picked up',
      [ShipmentStatus.IN_TRANSIT]: 'Shipment is in transit',
      [ShipmentStatus.OUT_FOR_DELIVERY]: 'Shipment is out for delivery',
      [ShipmentStatus.DELIVERED]: 'Shipment has been delivered',
      [ShipmentStatus.FAILED]: 'Delivery attempt failed',
      [ShipmentStatus.RETURNED]: 'Shipment is being returned',
      [ShipmentStatus.CANCELLED]: 'Shipment has been cancelled',
    };

    return descriptions[status] || 'Status updated';
  }

  async getShipments(filters: any): Promise<any> {
    // Mock implementation - replace with actual database query
    const mockShipments = [
      {
        id: '1',
        orderId: 'ORD-001',
        trackingNumber: 'TRK123456789',
        status: 'in_transit',
        carrier: 'Aras Kargo',
        service: 'Express',
        customerName: 'Ahmet Yılmaz',
        estimatedDelivery: '2024-01-15',
        actualDelivery: null,
        createdAt: '2024-01-10',
        weight: 1.5,
        origin: 'İstanbul',
        destination: 'Ankara'
      },
      {
        id: '2',
        orderId: 'ORD-002',
        trackingNumber: 'TRK987654321',
        status: 'delivered',
        carrier: 'Yurtiçi Kargo',
        service: 'Standard',
        customerName: 'Ayşe Kaya',
        estimatedDelivery: '2024-01-12',
        actualDelivery: '2024-01-12',
        createdAt: '2024-01-08',
        weight: 2.0,
        origin: 'İzmir',
        destination: 'Antalya'
      }
    ];

    let filteredShipments = [...mockShipments];

    // Apply filters
    if (filters.status) {
      filteredShipments = filteredShipments.filter(s => s.status === filters.status);
    }

    if (filters.carrier) {
      filteredShipments = filteredShipments.filter(s => s.carrier === filters.carrier);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredShipments = filteredShipments.filter(s =>
        s.trackingNumber.toLowerCase().includes(searchTerm) ||
        s.orderId.toLowerCase().includes(searchTerm) ||
        s.customerName.toLowerCase().includes(searchTerm)
      );
    }

    return {
      success: true,
      data: {
        shipments: filteredShipments,
        total: filteredShipments.length,
        page: parseInt(filters.page) || 1,
        limit: parseInt(filters.limit) || 20
      }
    };
  }
}
