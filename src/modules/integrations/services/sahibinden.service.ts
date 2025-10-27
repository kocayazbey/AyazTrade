import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface SahibindenListing {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  price: number;
  location: {
    city: string;
    district: string;
    neighborhood?: string;
  };
  images: string[];
  attributes: Record<string, any>;
  status: 'active' | 'inactive' | 'sold' | 'deleted';
  contactInfo: {
    phone?: string;
    email?: string;
  };
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SahibindenLead {
  id: string;
  listingId: string;
  customer: {
    name?: string;
    phone?: string;
    email?: string;
    message?: string;
  };
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected';
  source: 'phone' | 'email' | 'message';
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SahibindenService {
  private readonly logger = new Logger(SahibindenService.name);
  private readonly baseUrl = 'https://api.sahibinden.com';

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async syncListings(instanceId: string): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    errors?: string[];
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      const listings = await this.getListingsFromSahibinden(instance);

      let synced = 0;
      let failed = 0;
      const errors = [];

      for (const listing of listings) {
        try {
          await this.saveListingToLocal(listing, instance);
          synced++;
        } catch (error) {
          failed++;
          errors.push(`Listing ${listing.id}: ${error.message}`);
        }
      }

      await this.updateSyncStatus(instanceId, 'completed', synced, failed);
      return { success: true, synced, failed, errors };

    } catch (error) {
      this.logger.error('Listing sync failed', error);
      await this.updateSyncStatus(instanceId, 'failed', 0, 0, error.message);
      return { success: false, synced: 0, failed: 0, errors: [error.message] };
    }
  }

  async syncLeads(instanceId: string): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    errors?: string[];
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      const leads = await this.getLeadsFromSahibinden(instance);

      let synced = 0;
      let failed = 0;
      const errors = [];

      for (const lead of leads) {
        try {
          await this.saveLeadToLocal(lead, instance);
          synced++;
        } catch (error) {
          failed++;
          errors.push(`Lead ${lead.id}: ${error.message}`);
        }
      }

      await this.updateSyncStatus(instanceId, 'completed', synced, failed);
      return { success: true, synced, failed, errors };

    } catch (error) {
      this.logger.error('Lead sync failed', error);
      await this.updateSyncStatus(instanceId, 'failed', 0, 0, error.message);
      return { success: false, synced: 0, failed: 0, errors: [error.message] };
    }
  }

  async createListing(instanceId: string, listingData: any): Promise<{
    success: boolean;
    listingId?: string;
    error?: string;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      const result = await this.createListingOnSahibinden(instance, listingData);

      if (result.success) {
        await this.saveListingToLocal({
          id: result.listingId,
          ...listingData,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }, instance);
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to create listing', error);
      return { success: false, error: error.message };
    }
  }

  async updateListing(instanceId: string, listingId: string, updateData: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      await this.updateListingOnSahibinden(instance, listingId, updateData);
      await this.updateLocalListing(listingId, updateData);

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to update listing: ${listingId}`, error);
      return { success: false, error: error.message };
    }
  }

  async deleteListing(instanceId: string, listingId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      await this.deleteListingOnSahibinden(instance, listingId);
      await this.updateLocalListing(listingId, { status: 'deleted' });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete listing: ${listingId}`, error);
      return { success: false, error: error.message };
    }
  }

  async getListingStats(instanceId: string, listingId: string): Promise<{
    views: number;
    contacts: number;
    bookmarks: number;
    lastActivity: Date;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      return await this.getListingStatsFromSahibinden(instance, listingId);
    } catch (error) {
      this.logger.error(`Failed to get listing stats: ${listingId}`, error);
      return { views: 0, contacts: 0, bookmarks: 0, lastActivity: new Date() };
    }
  }

  async updateLeadStatus(instanceId: string, leadId: string, status: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const instance = await this.getIntegrationInstance(instanceId);
      await this.updateLeadStatusOnSahibinden(instance, leadId, status);
      await this.updateLocalLeadStatus(leadId, status);

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to update lead status: ${leadId}`, error);
      return { success: false, error: error.message };
    }
  }

  private async getIntegrationInstance(instanceId: string): Promise<any> {
    const result = await this.db.execute(
      'SELECT * FROM integration_instances WHERE id = $1',
      [instanceId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Integration instance not found: ${instanceId}`);
    }

    return {
      ...result.rows[0],
      config: JSON.parse(result.rows[0].config || '{}'),
      credentials: JSON.parse(result.rows[0].credentials || '{}')
    };
  }

  private async getListingsFromSahibinden(instance: any): Promise<SahibindenListing[]> {
    const response = await this.makeApiCall(instance, 'GET', '/listings');

    return response.data || [];
  }

  private async getLeadsFromSahibinden(instance: any): Promise<SahibindenLead[]> {
    const response = await this.makeApiCall(instance, 'GET', '/leads');

    return response.data || [];
  }

  private async saveListingToLocal(listing: SahibindenListing, instance: any): Promise<void> {
    await this.db.execute(`
      INSERT INTO sahibinden_listings (id, title, description, category, subcategory, price, location, images, attributes, status, contact_info, views, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        title = $2, description = $3, category = $4, subcategory = $5,
        price = $6, location = $7, images = $8, attributes = $9,
        status = $10, contact_info = $11, views = $12, updated_at = $14
    `, [
      listing.id,
      listing.title,
      listing.description,
      listing.category,
      listing.subcategory,
      listing.price,
      JSON.stringify(listing.location),
      JSON.stringify(listing.images),
      JSON.stringify(listing.attributes),
      listing.status,
      JSON.stringify(listing.contactInfo),
      listing.views,
      listing.createdAt,
      listing.updatedAt
    ]);
  }

  private async saveLeadToLocal(lead: SahibindenLead, instance: any): Promise<void> {
    await this.db.execute(`
      INSERT INTO sahibinden_leads (id, listing_id, customer_data, status, source, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        customer_data = $3, status = $4, source = $5, updated_at = $7
    `, [
      lead.id,
      lead.listingId,
      JSON.stringify(lead.customer),
      lead.status,
      lead.source,
      lead.createdAt,
      lead.updatedAt
    ]);
  }

  private async createListingOnSahibinden(instance: any, listingData: any): Promise<{
    success: boolean;
    listingId?: string;
    error?: string;
  }> {
    const response = await this.makeApiCall(instance, 'POST', '/listings', listingData);

    return {
      success: true,
      listingId: response.data?.id
    };
  }

  private async updateListingOnSahibinden(instance: any, listingId: string, updateData: any): Promise<void> {
    await this.makeApiCall(instance, 'PUT', `/listings/${listingId}`, updateData);
  }

  private async deleteListingOnSahibinden(instance: any, listingId: string): Promise<void> {
    await this.makeApiCall(instance, 'DELETE', `/listings/${listingId}`);
  }

  private async updateLocalListing(listingId: string, updateData: any): Promise<void> {
    await this.db.execute(`
      UPDATE sahibinden_listings SET
        ${Object.keys(updateData).map(key => `${key} = $${Object.keys(updateData).indexOf(key) + 1}`).join(', ')},
        updated_at = $${Object.keys(updateData).length + 1}
      WHERE id = $${Object.keys(updateData).length + 2}
    `, [...Object.values(updateData), new Date(), listingId]);
  }

  private async getListingStatsFromSahibinden(instance: any, listingId: string): Promise<{
    views: number;
    contacts: number;
    bookmarks: number;
    lastActivity: Date;
  }> {
    const response = await this.makeApiCall(instance, 'GET', `/listings/${listingId}/stats`);

    return response.data || { views: 0, contacts: 0, bookmarks: 0, lastActivity: new Date() };
  }

  private async updateLeadStatusOnSahibinden(instance: any, leadId: string, status: string): Promise<void> {
    await this.makeApiCall(instance, 'PUT', `/leads/${leadId}/status`, { status });
  }

  private async updateLocalLeadStatus(leadId: string, status: string): Promise<void> {
    await this.db.execute(`
      UPDATE sahibinden_leads SET status = $1, updated_at = $2 WHERE id = $3
    `, [status, new Date(), leadId]);
  }

  private async makeApiCall(instance: any, method: string, path: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${instance.credentials.accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'AyazTrade-Sahibinden/1.0'
    };

    this.logger.log(`Making Sahibinden API call: ${method} ${url}`);

    // Mock API response
    return {
      success: true,
      data: {
        id: `SB${Date.now()}`,
        listings: [],
        leads: []
      }
    };
  }

  private async updateSyncStatus(instanceId: string, status: string, synced: number, failed: number, error?: string): Promise<void> {
    await this.db.execute(`
      UPDATE integration_instances SET
        last_sync = $2,
        updated_at = $3,
        sync_stats = $4
      WHERE id = $1
    `, [
      instanceId,
      new Date(),
      new Date(),
      JSON.stringify({ status, synced, failed, error, timestamp: new Date() })
    ]);
  }
}
