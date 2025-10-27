import { Injectable, Logger } from '@nestjs/common';

interface B2BCampaign {
  id: string;
  name: string;
  description: string;
  type: 'volume_discount' | 'tiered_pricing' | 'free_shipping' | 'bundle' | 'seasonal';
  startDate: Date;
  endDate: Date;
  status: 'active' | 'scheduled' | 'expired';
  customerSegments: string[];
  rules: {
    minQuantity?: number;
    minAmount?: number;
    discountPercent?: number;
    discountAmount?: number;
    productIds?: string[];
    categoryIds?: string[];
  };
  banner?: string;
  priority: number;
  usageCount: number;
  maxUsage?: number;
}

@Injectable()
export class B2BCampaignsService {
  private readonly logger = new Logger(B2BCampaignsService.name);
  private campaigns: Map<string, B2BCampaign> = new Map();

  constructor() {
    this.seedCampaigns();
  }

  private seedCampaigns() {
    const sampleCampaigns: B2BCampaign[] = [
      {
        id: 'camp_1',
        name: 'Toplu Alım İndirimi - %15',
        description: '100+ adet alımlarda %15 indirim',
        type: 'volume_discount',
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-12-31'),
        status: 'active',
        customerSegments: ['platinum', 'gold'],
        rules: {
          minQuantity: 100,
          discountPercent: 15,
        },
        priority: 1,
        usageCount: 47,
      },
      {
        id: 'camp_2',
        name: 'Kış Sezonu Özel Fırsatı',
        description: 'Seçili ürünlerde %20 indirim',
        type: 'seasonal',
        startDate: new Date('2025-11-01'),
        endDate: new Date('2026-02-28'),
        status: 'active',
        customerSegments: ['all'],
        rules: {
          discountPercent: 20,
          categoryIds: ['electronics', 'computers'],
        },
        banner: 'https://via.placeholder.com/1200x300/4A90E2/FFFFFF?text=Kış+Kampanyası',
        priority: 2,
        usageCount: 89,
      },
      {
        id: 'camp_3',
        name: 'Ücretsiz Kargo',
        description: '5.000 TL ve üzeri siparişlerde ücretsiz kargo',
        type: 'free_shipping',
        startDate: new Date('2025-10-15'),
        endDate: new Date('2026-01-15'),
        status: 'active',
        customerSegments: ['all'],
        rules: {
          minAmount: 5000,
        },
        priority: 3,
        usageCount: 234,
      },
      {
        id: 'camp_4',
        name: 'Yılbaşı Paketi',
        description: '3 Al 2 Öde',
        type: 'bundle',
        startDate: new Date('2025-12-15'),
        endDate: new Date('2026-01-05'),
        status: 'scheduled',
        customerSegments: ['all'],
        rules: {
          minQuantity: 3,
          discountPercent: 33,
        },
        banner: 'https://via.placeholder.com/1200x300/E74C3C/FFFFFF?text=Yılbaşı+Kampanyası',
        priority: 1,
        usageCount: 0,
        maxUsage: 500,
      },
    ];

    sampleCampaigns.forEach(campaign => {
      this.campaigns.set(campaign.id, campaign);
    });
  }

  async getActiveCampaigns(customerSegment?: string): Promise<B2BCampaign[]> {
    const now = new Date();
    const allCampaigns = Array.from(this.campaigns.values());

    return allCampaigns
      .filter(campaign => {
        if (campaign.status !== 'active') return false;
        if (campaign.startDate > now || campaign.endDate < now) return false;
        if (customerSegment && !campaign.customerSegments.includes('all') && !campaign.customerSegments.includes(customerSegment)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.priority - b.priority);
  }

  async getCampaignById(campaignId: string): Promise<B2BCampaign | null> {
    return this.campaigns.get(campaignId) || null;
  }

  async getAllCampaigns(): Promise<B2BCampaign[]> {
    return Array.from(this.campaigns.values());
  }

  async createCampaign(campaignData: Partial<B2BCampaign>): Promise<B2BCampaign> {
    const campaign: B2BCampaign = {
      id: `camp_${Date.now()}`,
      name: campaignData.name || 'Yeni Kampanya',
      description: campaignData.description || '',
      type: campaignData.type || 'volume_discount',
      startDate: campaignData.startDate || new Date(),
      endDate: campaignData.endDate || new Date(),
      status: campaignData.status || 'scheduled',
      customerSegments: campaignData.customerSegments || ['all'],
      rules: campaignData.rules || {},
      priority: campaignData.priority || 10,
      usageCount: 0,
    };

    this.campaigns.set(campaign.id, campaign);
    this.logger.log(`B2B campaign created: ${campaign.name}`);

    return campaign;
  }

  async updateCampaign(campaignId: string, updates: Partial<B2BCampaign>): Promise<B2BCampaign | null> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return null;

    const updated = { ...campaign, ...updates };
    this.campaigns.set(campaignId, updated);

    this.logger.log(`B2B campaign updated: ${campaignId}`);
    return updated;
  }

  async deleteCampaign(campaignId: string): Promise<boolean> {
    const deleted = this.campaigns.delete(campaignId);
    if (deleted) {
      this.logger.log(`B2B campaign deleted: ${campaignId}`);
    }
    return deleted;
  }

  async applyCampaigns(customerId: string, items: any[], totalAmount: number): Promise<{
    appliedCampaigns: B2BCampaign[];
    totalDiscount: number;
    finalAmount: number;
  }> {
    const activeCampaigns = await this.getActiveCampaigns();
    const appliedCampaigns: B2BCampaign[] = [];
    let totalDiscount = 0;

    for (const campaign of activeCampaigns) {
      let discount = 0;

      switch (campaign.type) {
        case 'volume_discount':
          const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
          if (campaign.rules.minQuantity && totalQty >= campaign.rules.minQuantity) {
            discount = totalAmount * (campaign.rules.discountPercent || 0) / 100;
            appliedCampaigns.push(campaign);
          }
          break;

        case 'free_shipping':
          if (campaign.rules.minAmount && totalAmount >= campaign.rules.minAmount) {
            appliedCampaigns.push(campaign);
          }
          break;

        case 'seasonal':
          discount = totalAmount * (campaign.rules.discountPercent || 0) / 100;
          appliedCampaigns.push(campaign);
          break;
      }

      totalDiscount += discount;
    }

    return {
      appliedCampaigns,
      totalDiscount,
      finalAmount: totalAmount - totalDiscount,
    };
  }
}
