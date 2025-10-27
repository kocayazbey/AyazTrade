import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class CustomerAddressesService {
  async create(customerId: string, addressData: any): Promise<any> {
    const address = {
      ...addressData,
      customerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return address;
  }

  async findByCustomer(customerId: string): Promise<any[]> {
    return [];
  }

  async findOne(id: string): Promise<any> {
    const address = null;
    
    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    return address;
  }

  async update(id: string, updateData: any): Promise<any> {
    const address = await this.findOne(id);

    const updated = {
      ...address,
      ...updateData,
      updatedAt: new Date(),
    };

    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
  }

  async setDefault(customerId: string, addressId: string): Promise<void> {
    const addresses = await this.findByCustomer(customerId);
    
    for (const addr of addresses) {
      if (addr.id === addressId) {
        await this.update(addr.id, { isDefault: true });
      } else if (addr.isDefault) {
        await this.update(addr.id, { isDefault: false });
      }
    }
  }

  async getDefault(customerId: string): Promise<any> {
    const addresses = await this.findByCustomer(customerId);
    return addresses.find(addr => addr.isDefault) || addresses[0] || null;
  }
}

