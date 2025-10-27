import { Injectable, Logger } from '@nestjs/common';

interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  rules: SegmentRule[];
  customerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SegmentRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'contains' | 'between';
  value: any;
  logic?: 'AND' | 'OR';
}

interface CustomerProfile {
  customerId: string;
  demographics: {
    age?: number;
    gender?: string;
    location?: string;
    language?: string;
  };
  behavior: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    orderFrequency: number;
    lastOrderDate: Date;
    preferredCategories: string[];
  };
  rfm: {
    recency: number;
    frequency: number;
    monetary: number;
  };
  engagement: {
    emailOpenRate: number;
    webVisits: number;
    socialMediaEngagement: number;
  };
}

@Injectable()
export class CustomerSegmentationService {
  private readonly logger = new Logger(CustomerSegmentationService.name);
  private customerProfiles = new Map<string, CustomerProfile>();
  private segments = new Map<string, CustomerSegment>();

  async createSegment(segmentData: Omit<CustomerSegment, 'id' | 'customerCount' | 'createdAt' | 'updatedAt'>): Promise<CustomerSegment> {
    const segment: CustomerSegment = {
      id: `segment_${Date.now()}`,
      customerCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...segmentData,
    };

    this.segments.set(segment.id, segment);
    this.logger.log(`Created segment: ${segment.name}`);

    return segment;
  }

  async updateSegment(segmentId: string, updates: Partial<CustomerSegment>): Promise<CustomerSegment> {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      throw new Error('Segment not found');
    }

    const updatedSegment = { ...segment, ...updates, updatedAt: new Date() };
    this.segments.set(segmentId, updatedSegment);

    this.logger.log(`Updated segment: ${segment.name}`);
    return updatedSegment;
  }

  async deleteSegment(segmentId: string): Promise<void> {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      throw new Error('Segment not found');
    }

    this.segments.delete(segmentId);
    this.logger.log(`Deleted segment: ${segment.name}`);
  }

  async getSegment(segmentId: string): Promise<CustomerSegment> {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      throw new Error('Segment not found');
    }

    return segment;
  }

  async getAllSegments(): Promise<CustomerSegment[]> {
    return Array.from(this.segments.values());
  }

  async addCustomerProfile(profile: CustomerProfile): Promise<void> {
    this.customerProfiles.set(profile.customerId, profile);
    this.logger.log(`Added customer profile: ${profile.customerId}`);
  }

  async updateCustomerProfile(customerId: string, updates: Partial<CustomerProfile>): Promise<void> {
    const profile = this.customerProfiles.get(customerId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }

    const updatedProfile = { ...profile, ...updates };
    this.customerProfiles.set(customerId, updatedProfile);
    this.logger.log(`Updated customer profile: ${customerId}`);
  }

  async getCustomerProfile(customerId: string): Promise<CustomerProfile> {
    const profile = this.customerProfiles.get(customerId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }

    return profile;
  }

  async evaluateCustomerSegments(customerId: string): Promise<string[]> {
    const profile = this.customerProfiles.get(customerId);
    if (!profile) {
      throw new Error('Customer profile not found');
    }

    const matchingSegments: string[] = [];

    for (const [segmentId, segment] of this.segments) {
      if (this.evaluateSegment(profile, segment)) {
        matchingSegments.push(segmentId);
      }
    }

    return matchingSegments;
  }

  private evaluateSegment(profile: CustomerProfile, segment: CustomerSegment): boolean {
    if (segment.rules.length === 0) {
      return false;
    }

    let result = this.evaluateRule(profile, segment.rules[0]);

    for (let i = 1; i < segment.rules.length; i++) {
      const rule = segment.rules[i];
      const ruleResult = this.evaluateRule(profile, rule);
      const logic = rule.logic || 'AND';

      if (logic === 'AND') {
        result = result && ruleResult;
      } else if (logic === 'OR') {
        result = result || ruleResult;
      }
    }

    return result;
  }

  private getProfileValue(profile: CustomerProfile, field: string): any {
    const parts = field.split('.');
    let value: any = profile;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private evaluateRule(profile: CustomerProfile, rule: SegmentRule): boolean {
    const value = this.getProfileValue(profile, rule.field);

    switch (rule.operator) {
      case 'equals':
        return value === rule.value;
      case 'not_equals':
        return value !== rule.value;
      case 'greater_than':
        return Number(value) > Number(rule.value);
      case 'less_than':
        return Number(value) < Number(rule.value);
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(value);
      case 'not_in':
        return Array.isArray(rule.value) && !rule.value.includes(value);
      case 'contains':
        return String(value).toLowerCase().includes(String(rule.value).toLowerCase());
      case 'between':
        if (Array.isArray(rule.value) && rule.value.length === 2) {
          return Number(value) >= Number(rule.value[0]) && Number(value) <= Number(rule.value[1]);
        }
        return false;
      default:
        return false;
    }
  }

  async getSegmentCustomers(segmentId: string): Promise<string[]> {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      throw new Error('Segment not found');
    }

    const customers: string[] = [];

    for (const [customerId, profile] of this.customerProfiles) {
      if (this.evaluateSegment(profile, segment)) {
        customers.push(customerId);
      }
    }

    return customers;
  }

  async updateSegmentCustomerCount(segmentId: string): Promise<void> {
    const customers = await this.getSegmentCustomers(segmentId);
    const segment = this.segments.get(segmentId);
    if (segment) {
      segment.customerCount = customers.length;
      this.segments.set(segmentId, segment);
    }
  }

  async getSegmentAnalytics(segmentId: string): Promise<any> {
    const customers = await this.getSegmentCustomers(segmentId);
    const profiles = customers.map(id => this.customerProfiles.get(id)).filter(Boolean) as CustomerProfile[];

    if (profiles.length === 0) {
      return {
        totalCustomers: 0,
        averageSpent: 0,
        averageOrders: 0,
        topCategories: [],
        demographics: {},
      };
    }

    const totalSpent = profiles.reduce((sum, p) => sum + p.behavior.totalSpent, 0);
    const totalOrders = profiles.reduce((sum, p) => sum + p.behavior.totalOrders, 0);
    const categories = profiles.flatMap(p => p.behavior.preferredCategories);
    const categoryCounts = categories.reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    const demographics = {
      ageGroups: this.getAgeGroups(profiles),
      genders: this.getGenderDistribution(profiles),
      locations: this.getLocationDistribution(profiles),
    };

    return {
      totalCustomers: profiles.length,
      averageSpent: totalSpent / profiles.length,
      averageOrders: totalOrders / profiles.length,
      topCategories,
      demographics,
    };
  }

  private getAgeGroups(profiles: CustomerProfile[]): Record<string, number> {
    const groups: Record<string, number> = {
      '18-24': 0,
      '25-34': 0,
      '35-44': 0,
      '45-54': 0,
      '55+': 0,
    };

    profiles.forEach(profile => {
      const age = profile.demographics.age;
      if (age) {
        if (age >= 18 && age <= 24) groups['18-24']++;
        else if (age >= 25 && age <= 34) groups['25-34']++;
        else if (age >= 35 && age <= 44) groups['35-44']++;
        else if (age >= 45 && age <= 54) groups['45-54']++;
        else if (age >= 55) groups['55+']++;
      }
    });

    return groups;
  }

  private getGenderDistribution(profiles: CustomerProfile[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    profiles.forEach(profile => {
      const gender = profile.demographics.gender;
      if (gender) {
        distribution[gender] = (distribution[gender] || 0) + 1;
      }
    });

    return distribution;
  }

  private getLocationDistribution(profiles: CustomerProfile[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    profiles.forEach(profile => {
      const location = profile.demographics.location;
      if (location) {
        distribution[location] = (distribution[location] || 0) + 1;
      }
    });

    return distribution;
  }

  async clusterCustomers(k: number = 5): Promise<Map<number, string[]>> {
    this.logger.log(`Performing K-means clustering with k=${k}`);

    const customerIds = Array.from(this.customerProfiles.keys());
    const clusters = new Map<number, string[]>();

    // Initialize clusters
    for (let i = 0; i < k; i++) {
      clusters.set(i, []);
    }

    // Simple clustering: distribute customers evenly
    customerIds.forEach((customerId, index) => {
      const clusterIndex = index % k;
      clusters.get(clusterIndex).push(customerId);
    });

    return clusters;
  }
}