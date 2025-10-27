import { Injectable } from '@nestjs/common';

@Injectable()
export class OrderStatusService {
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Beklemede',
      confirmed: 'Onaylandı',
      processing: 'Hazırlanıyor',
      shipped: 'Kargoya Verildi',
      delivered: 'Teslim Edildi',
      cancelled: 'İptal Edildi',
      returned: 'İade Edildi',
      refunded: 'Para İadesi Yapıldı',
    };

    return labels[status] || status;
  }

  getPaymentStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Beklemede',
      paid: 'Ödendi',
      failed: 'Başarısız',
      refunded: 'İade Edildi',
      partially_refunded: 'Kısmi İade',
    };

    return labels[status] || status;
  }

  getFulfillmentStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      unfulfilled: 'Hazırlanmadı',
      partially_fulfilled: 'Kısmen Hazırlandı',
      fulfilled: 'Hazırlandı',
    };

    return labels[status] || status;
  }

  getAvailableActions(status: string): string[] {
    const actions: Record<string, string[]> = {
      pending: ['confirm', 'cancel'],
      confirmed: ['process', 'cancel'],
      processing: ['ship', 'cancel'],
      shipped: ['mark_delivered'],
      delivered: ['request_return'],
      cancelled: [],
      returned: ['process_refund'],
      refunded: [],
    };

    return actions[status] || [];
  }

  canTransition(from: string, to: string): boolean {
    const validTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered', 'returned'],
      delivered: ['returned'],
      cancelled: [],
      returned: ['refunded'],
      refunded: [],
    };

    return validTransitions[from]?.includes(to) || false;
  }

  getStatusTimeline(orderHistory: any[]): any[] {
    return orderHistory.map(entry => ({
      status: entry.status,
      label: this.getStatusLabel(entry.status),
      timestamp: entry.createdAt,
      comment: entry.comment,
    }));
  }
}

