import { Injectable, Logger } from '@nestjs/common';

interface OrderTemplate {
  id: string;
  customerId: string;
  name: string;
  description?: string;
  items: Array<{
    productId: string;
    sku: string;
    quantity: number;
  }>;
  frequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  lastUsed?: Date;
  useCount: number;
  createdAt: Date;
}

@Injectable()
export class ReorderService {
  private readonly logger = new Logger(ReorderService.name);
  private templates: Map<string, OrderTemplate[]> = new Map();

  async reorderFromHistory(customerId: string, orderId: string): Promise<any> {
    this.logger.log(`Creating reorder from ${orderId} for customer ${customerId}`);

    const originalOrder = {
      items: [
        { productId: '1', sku: 'PROD-001', quantity: 10, name: 'Product 1', price: 100 },
        { productId: '2', sku: 'PROD-002', quantity: 5, name: 'Product 2', price: 200 },
      ],
    };

    return {
      success: true,
      cartId: `cart_${Date.now()}`,
      itemsAdded: originalOrder.items.length,
      items: originalOrder.items,
    };
  }

  async saveAsTemplate(customerId: string, name: string, items: any[]): Promise<OrderTemplate> {
    const template: OrderTemplate = {
      id: `template_${Date.now()}`,
      customerId,
      name,
      items: items.map(item => ({
        productId: item.productId,
        sku: item.sku,
        quantity: item.quantity,
      })),
      useCount: 0,
      createdAt: new Date(),
    };

    let customerTemplates = this.templates.get(customerId) || [];
    customerTemplates.push(template);
    this.templates.set(customerId, customerTemplates);

    this.logger.log(`Order template saved: ${name}`);
    return template;
  }

  async getTemplates(customerId: string): Promise<OrderTemplate[]> {
    return this.templates.get(customerId) || [];
  }

  async useTemplate(templateId: string): Promise<any> {
    for (const [customerId, templates] of this.templates.entries()) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        template.lastUsed = new Date();
        template.useCount++;
        
        return {
          success: true,
          cartId: `cart_${Date.now()}`,
          itemsAdded: template.items.length,
          items: template.items,
        };
      }
    }
    throw new Error('Template not found');
  }

  async getFrequentlyOrdered(customerId: string, limit: number = 20): Promise<any[]> {
    return [
      { productId: '1', sku: 'PROD-001', name: 'Product 1', orderCount: 25, lastOrdered: new Date(), avgQuantity: 15 },
      { productId: '2', sku: 'PROD-002', name: 'Product 2', orderCount: 18, lastOrdered: new Date(), avgQuantity: 10 },
    ];
  }

  async quickReorder(customerId: string, productId: string, quantity?: number): Promise<any> {
    const avgQty = quantity || 10;

    return {
      success: true,
      cartId: `cart_${Date.now()}`,
      itemAdded: {
        productId,
        quantity: avgQty,
      },
    };
  }
}

