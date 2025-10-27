import { Injectable } from '@nestjs/common';

@Injectable()
export class WarehouseService {
  async getWarehouses() {
    return {
      data: [
        {
          id: '1',
          name: 'Main Warehouse',
          location: 'İstanbul',
          capacity: 10000,
          status: 'active'
        }
      ],
      total: 1
    };
  }

  async createWarehouse(data: any) {
    return {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date().toISOString()
    };
  }

  async getWarehouseById(warehouseId: string) {
    return {
      id: warehouseId,
      name: 'Main Warehouse',
      location: 'İstanbul',
      capacity: 10000,
      status: 'active'
    };
  }

  async getLocations(warehouseId: string, filters: any) {
    return {
      data: [
        {
          id: '1',
          warehouseId,
          code: 'A-01-01',
          type: 'storage',
          status: 'available'
        }
      ],
      total: 1
    };
  }

  async createLocation(warehouseId: string, data: any) {
    return {
      id: Date.now().toString(),
      warehouseId,
      ...data,
      createdAt: new Date().toISOString()
    };
  }

  async getWarehouseStatistics(warehouseId: string) {
    return {
      totalLocations: 100,
      occupiedLocations: 75,
      availableLocations: 25,
      utilizationRate: 75
    };
  }
}