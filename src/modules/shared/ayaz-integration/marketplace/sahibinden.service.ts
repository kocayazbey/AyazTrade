import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface SahibindenProduct {
  category: number;
  title: string;
  text: string;
  price: number;
  priceType: 1 | 2;
  city: number;
  town: number;
  district?: number;
  address?: string;
  phone?: string;
  email?: string;
  photos: string[];
  properties: Record<string, any>;
  video?: string;
  latitude?: number;
  longitude?: number;
  packageType?: 1 | 2 | 3;
  shippingPrice?: number;
  condition?: 1 | 2;
  swap?: boolean;
  delivery?: boolean;
}

export interface SahibindenListing {
  id: number;
  categoryId: number;
  title: string;
  description: string;
  price: number;
  currency: string;
  location: {
    city: string;
    town: string;
    district?: string;
  };
  photos: string[];
  publishDate: string;
  updateDate: string;
  status: 'active' | 'passive' | 'sold' | 'deleted';
  viewCount: number;
  favoriteCount: number;
  properties: Record<string, any>;
  url: string;
}

export interface SahibindenMessage {
  id: number;
  listingId: number;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  message: string;
  date: string;
  isRead: boolean;
  isReplied: boolean;
}

export interface SahibindenStats {
  totalListings: number;
  activeListings: number;
  passiveListings: number;
  soldListings: number;
  totalViews: number;
  totalFavorites: number;
  totalMessages: number;
  unreadMessages: number;
}

@Injectable()
export class SahibindenService {
  private readonly logger = new Logger(SahibindenService.name);
  private apiClient: AxiosInstance;
  private storeId: string;
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.storeId = this.configService.get<string>('SAHIBINDEN_STORE_ID');
    this.apiKey = this.configService.get<string>('SAHIBINDEN_API_KEY');
    this.apiSecret = this.configService.get<string>('SAHIBINDEN_API_SECRET');
    this.baseUrl = 'https://api.sahibinden.com';

    this.initializeApiClient();
  }

  private initializeApiClient(): void {
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'AyazComm/1.0',
      },
      timeout: 30000,
    });

    this.apiClient.interceptors.request.use(
      (config) => {
        const timestamp = Date.now().toString();
        const nonce = this.generateNonce();
        const signature = this.generateSignature(config.method, config.url, timestamp, nonce);

        config.headers['X-Store-Id'] = this.storeId;
        config.headers['X-Api-Key'] = this.apiKey;
        config.headers['X-Timestamp'] = timestamp;
        config.headers['X-Nonce'] = nonce;
        config.headers['X-Signature'] = signature;

        this.logger.debug(`Sahibinden API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Sahibinden API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.apiClient.interceptors.response.use(
      (response) => {
        this.logger.debug(`Sahibinden API Response: ${response.status}`);
        return response;
      },
      (error) => {
        this.logger.error('Sahibinden API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async createListing(product: SahibindenProduct): Promise<any> {
    try {
      this.logger.log(`Creating listing on Sahibinden: ${product.title}`);

      const payload = {
        category: product.category,
        title: product.title,
        text: product.text,
        price: product.price,
        price_type: product.priceType,
        city: product.city,
        town: product.town,
        district: product.district,
        address: product.address,
        phone: product.phone,
        email: product.email,
        photos: product.photos,
        properties: product.properties,
        video: product.video,
        latitude: product.latitude,
        longitude: product.longitude,
        package_type: product.packageType,
        shipping_price: product.shippingPrice,
        condition: product.condition,
        swap: product.swap ? 1 : 0,
        delivery: product.delivery ? 1 : 0,
      };

      const response = await this.apiClient.post('/v1/classifieds', payload);

      if (response.data.success) {
        this.logger.log(`Listing created successfully: ${response.data.data.id}`);
        return {
          success: true,
          listingId: response.data.data.id,
          url: response.data.data.url,
          publishDate: response.data.data.publish_date,
        };
      } else {
        throw new BadRequestException(response.data.message || 'Failed to create listing');
      }
    } catch (error) {
      this.logger.error(`Failed to create listing: ${product.title}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to create listing on Sahibinden');
    }
  }

  async updateListing(listingId: number, updates: Partial<SahibindenProduct>): Promise<any> {
    try {
      this.logger.log(`Updating listing on Sahibinden: ${listingId}`);

      const payload = {
        title: updates.title,
        text: updates.text,
        price: updates.price,
        price_type: updates.priceType,
        photos: updates.photos,
        properties: updates.properties,
        video: updates.video,
        condition: updates.condition,
        swap: updates.swap ? 1 : 0,
        delivery: updates.delivery ? 1 : 0,
      };

      const response = await this.apiClient.put(`/v1/classifieds/${listingId}`, payload);

      if (response.data.success) {
        this.logger.log(`Listing updated successfully: ${listingId}`);
        return {
          success: true,
          listingId: response.data.data.id,
          updateDate: response.data.data.update_date,
        };
      } else {
        throw new BadRequestException(response.data.message || 'Failed to update listing');
      }
    } catch (error) {
      this.logger.error(`Failed to update listing: ${listingId}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to update listing on Sahibinden');
    }
  }

  async deleteListing(listingId: number): Promise<any> {
    try {
      this.logger.log(`Deleting listing: ${listingId}`);

      const response = await this.apiClient.delete(`/v1/classifieds/${listingId}`);

      if (response.data.success) {
        this.logger.log(`Listing deleted successfully: ${listingId}`);
        return {
          success: true,
          message: response.data.message,
        };
      } else {
        throw new BadRequestException(response.data.message || 'Failed to delete listing');
      }
    } catch (error) {
      this.logger.error(`Failed to delete listing: ${listingId}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to delete listing from Sahibinden');
    }
  }

  async getListing(listingId: number): Promise<SahibindenListing> {
    try {
      this.logger.log(`Fetching listing: ${listingId}`);

      const response = await this.apiClient.get(`/v1/classifieds/${listingId}`);

      if (response.data.success) {
        const data = response.data.data;
        const listing: SahibindenListing = {
          id: data.id,
          categoryId: data.category_id,
          title: data.title,
          description: data.text,
          price: data.price,
          currency: data.currency,
          location: {
            city: data.city_name,
            town: data.town_name,
            district: data.district_name,
          },
          photos: data.photos || [],
          publishDate: data.publish_date,
          updateDate: data.update_date,
          status: data.status,
          viewCount: data.view_count,
          favoriteCount: data.favorite_count,
          properties: data.properties,
          url: data.url,
        };

        this.logger.log(`Listing found: ${listingId}`);
        return listing;
      } else {
        throw new NotFoundException(`Listing ${listingId} not found`);
      }
    } catch (error) {
      this.logger.error(`Failed to fetch listing: ${listingId}`, error.response?.data || error.message);
      throw new NotFoundException(`Listing ${listingId} not found on Sahibinden`);
    }
  }

  async getListings(params?: {
    status?: string;
    category?: number;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<any> {
    try {
      this.logger.log('Fetching listings from Sahibinden');

      const queryParams = {
        store_id: this.storeId,
        page: params?.page || 1,
        page_size: params?.pageSize || 50,
        ...(params?.status && { status: params.status }),
        ...(params?.category && { category: params.category }),
        ...(params?.sortBy && { sort_by: params.sortBy }),
        ...(params?.sortOrder && { sort_order: params.sortOrder }),
      };

      const response = await this.apiClient.get('/v1/classifieds', { params: queryParams });

      if (response.data.success) {
        this.logger.log(`Fetched ${response.data.data.items?.length || 0} listings`);
        return {
          success: true,
          items: response.data.data.items,
          total: response.data.data.total,
          page: response.data.data.page,
          pageSize: response.data.data.page_size,
          totalPages: response.data.data.total_pages,
        };
      } else {
        throw new BadRequestException('Failed to fetch listings');
      }
    } catch (error) {
      this.logger.error('Failed to fetch listings', error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to fetch listings from Sahibinden');
    }
  }

  async updateListingStatus(listingId: number, status: 'active' | 'passive'): Promise<any> {
    try {
      this.logger.log(`Updating listing status: ${listingId} to ${status}`);

      const response = await this.apiClient.patch(`/v1/classifieds/${listingId}/status`, {
        status,
      });

      if (response.data.success) {
        this.logger.log(`Listing status updated: ${listingId}`);
        return {
          success: true,
          listingId,
          status,
        };
      } else {
        throw new BadRequestException(response.data.message || 'Failed to update status');
      }
    } catch (error) {
      this.logger.error(`Failed to update listing status: ${listingId}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to update listing status on Sahibinden');
    }
  }

  async markAsSold(listingId: number, soldPrice?: number): Promise<any> {
    try {
      this.logger.log(`Marking listing as sold: ${listingId}`);

      const response = await this.apiClient.post(`/v1/classifieds/${listingId}/sold`, {
        sold_price: soldPrice,
      });

      if (response.data.success) {
        this.logger.log(`Listing marked as sold: ${listingId}`);
        return {
          success: true,
          listingId,
          soldDate: response.data.data.sold_date,
        };
      } else {
        throw new BadRequestException(response.data.message || 'Failed to mark as sold');
      }
    } catch (error) {
      this.logger.error(`Failed to mark listing as sold: ${listingId}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to mark listing as sold on Sahibinden');
    }
  }

  async getMessages(params?: {
    listingId?: number;
    isRead?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    try {
      this.logger.log('Fetching messages from Sahibinden');

      const queryParams = {
        store_id: this.storeId,
        page: params?.page || 1,
        page_size: params?.pageSize || 50,
        ...(params?.listingId && { listing_id: params.listingId }),
        ...(params?.isRead !== undefined && { is_read: params.isRead ? 1 : 0 }),
      };

      const response = await this.apiClient.get('/v1/messages', { params: queryParams });

      if (response.data.success) {
        this.logger.log(`Fetched ${response.data.data.items?.length || 0} messages`);
        return {
          success: true,
          messages: response.data.data.items.map((msg: any) => ({
            id: msg.id,
            listingId: msg.listing_id,
            senderName: msg.sender_name,
            senderEmail: msg.sender_email,
            senderPhone: msg.sender_phone,
            message: msg.message,
            date: msg.date,
            isRead: msg.is_read,
            isReplied: msg.is_replied,
          })),
          total: response.data.data.total,
        };
      } else {
        throw new BadRequestException('Failed to fetch messages');
      }
    } catch (error) {
      this.logger.error('Failed to fetch messages', error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to fetch messages from Sahibinden');
    }
  }

  async replyToMessage(messageId: number, reply: string): Promise<any> {
    try {
      this.logger.log(`Replying to message: ${messageId}`);

      const response = await this.apiClient.post(`/v1/messages/${messageId}/reply`, {
        message: reply,
      });

      if (response.data.success) {
        this.logger.log(`Message replied: ${messageId}`);
        return {
          success: true,
          messageId,
          replyDate: response.data.data.reply_date,
        };
      } else {
        throw new BadRequestException(response.data.message || 'Failed to reply to message');
      }
    } catch (error) {
      this.logger.error(`Failed to reply to message: ${messageId}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to reply to message on Sahibinden');
    }
  }

  async markMessageAsRead(messageId: number): Promise<any> {
    try {
      this.logger.log(`Marking message as read: ${messageId}`);

      const response = await this.apiClient.patch(`/v1/messages/${messageId}/read`);

      if (response.data.success) {
        this.logger.log(`Message marked as read: ${messageId}`);
        return {
          success: true,
          messageId,
        };
      } else {
        throw new BadRequestException('Failed to mark message as read');
      }
    } catch (error) {
      this.logger.error(`Failed to mark message as read: ${messageId}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to mark message as read on Sahibinden');
    }
  }

  async getCategories(parentId?: number): Promise<any> {
    try {
      this.logger.log('Fetching categories from Sahibinden');

      const params = parentId ? { parent_id: parentId } : {};
      const response = await this.apiClient.get('/v1/categories', { params });

      if (response.data.success) {
        this.logger.log(`Fetched ${response.data.data?.length || 0} categories`);
        return {
          success: true,
          categories: response.data.data.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            parentId: cat.parent_id,
            hasChildren: cat.has_children,
            order: cat.order,
          })),
        };
      } else {
        throw new BadRequestException('Failed to fetch categories');
      }
    } catch (error) {
      this.logger.error('Failed to fetch categories', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch categories from Sahibinden');
    }
  }

  async getCategoryProperties(categoryId: number): Promise<any> {
    try {
      this.logger.log(`Fetching properties for category: ${categoryId}`);

      const response = await this.apiClient.get(`/v1/categories/${categoryId}/properties`);

      if (response.data.success) {
        this.logger.log(`Fetched properties for category: ${categoryId}`);
        return {
          success: true,
          properties: response.data.data.map((prop: any) => ({
            id: prop.id,
            name: prop.name,
            type: prop.type,
            required: prop.required,
            options: prop.options,
          })),
        };
      } else {
        throw new NotFoundException(`Category ${categoryId} not found`);
      }
    } catch (error) {
      this.logger.error(`Failed to fetch category properties: ${categoryId}`, error.response?.data || error.message);
      throw new NotFoundException(`Category ${categoryId} properties not found on Sahibinden`);
    }
  }

  async getCities(): Promise<any> {
    try {
      this.logger.log('Fetching cities from Sahibinden');

      const response = await this.apiClient.get('/v1/locations/cities');

      if (response.data.success) {
        return {
          success: true,
          cities: response.data.data.map((city: any) => ({
            id: city.id,
            name: city.name,
            plateCode: city.plate_code,
          })),
        };
      } else {
        throw new BadRequestException('Failed to fetch cities');
      }
    } catch (error) {
      this.logger.error('Failed to fetch cities', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch cities from Sahibinden');
    }
  }

  async getTowns(cityId: number): Promise<any> {
    try {
      this.logger.log(`Fetching towns for city: ${cityId}`);

      const response = await this.apiClient.get(`/v1/locations/cities/${cityId}/towns`);

      if (response.data.success) {
        return {
          success: true,
          towns: response.data.data.map((town: any) => ({
            id: town.id,
            name: town.name,
          })),
        };
      } else {
        throw new BadRequestException('Failed to fetch towns');
      }
    } catch (error) {
      this.logger.error(`Failed to fetch towns for city: ${cityId}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch towns from Sahibinden');
    }
  }

  async getDistricts(townId: number): Promise<any> {
    try {
      this.logger.log(`Fetching districts for town: ${townId}`);

      const response = await this.apiClient.get(`/v1/locations/towns/${townId}/districts`);

      if (response.data.success) {
        return {
          success: true,
          districts: response.data.data.map((district: any) => ({
            id: district.id,
            name: district.name,
          })),
        };
      } else {
        throw new BadRequestException('Failed to fetch districts');
      }
    } catch (error) {
      this.logger.error(`Failed to fetch districts for town: ${townId}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch districts from Sahibinden');
    }
  }

  async uploadPhoto(listingId: number, photoFile: Buffer, fileName: string): Promise<any> {
    try {
      this.logger.log(`Uploading photo for listing: ${listingId}`);

      const formData = new FormData();
      formData.append('photo', new Blob([photoFile]), fileName);
      formData.append('listing_id', listingId.toString());

      const response = await this.apiClient.post('/v1/photos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        this.logger.log(`Photo uploaded successfully for listing: ${listingId}`);
        return {
          success: true,
          photoUrl: response.data.data.url,
          photoId: response.data.data.id,
        };
      } else {
        throw new BadRequestException(response.data.message || 'Failed to upload photo');
      }
    } catch (error) {
      this.logger.error(`Failed to upload photo for listing: ${listingId}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to upload photo to Sahibinden');
    }
  }

  async deletePhoto(photoId: number): Promise<any> {
    try {
      this.logger.log(`Deleting photo: ${photoId}`);

      const response = await this.apiClient.delete(`/v1/photos/${photoId}`);

      if (response.data.success) {
        this.logger.log(`Photo deleted successfully: ${photoId}`);
        return {
          success: true,
          message: response.data.message,
        };
      } else {
        throw new BadRequestException('Failed to delete photo');
      }
    } catch (error) {
      this.logger.error(`Failed to delete photo: ${photoId}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to delete photo from Sahibinden');
    }
  }

  async getStats(params?: { startDate?: string; endDate?: string }): Promise<SahibindenStats> {
    try {
      this.logger.log('Fetching stats from Sahibinden');

      const queryParams = {
        store_id: this.storeId,
        ...(params?.startDate && { start_date: params.startDate }),
        ...(params?.endDate && { end_date: params.endDate }),
      };

      const response = await this.apiClient.get('/v1/stats', { params: queryParams });

      if (response.data.success) {
        const data = response.data.data;
        const stats: SahibindenStats = {
          totalListings: data.total_listings,
          activeListings: data.active_listings,
          passiveListings: data.passive_listings,
          soldListings: data.sold_listings,
          totalViews: data.total_views,
          totalFavorites: data.total_favorites,
          totalMessages: data.total_messages,
          unreadMessages: data.unread_messages,
        };

        this.logger.log('Stats fetched successfully');
        return stats;
      } else {
        throw new BadRequestException('Failed to fetch stats');
      }
    } catch (error) {
      this.logger.error('Failed to fetch stats', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch stats from Sahibinden');
    }
  }

  async refreshListing(listingId: number): Promise<any> {
    try {
      this.logger.log(`Refreshing listing: ${listingId}`);

      const response = await this.apiClient.post(`/v1/classifieds/${listingId}/refresh`);

      if (response.data.success) {
        this.logger.log(`Listing refreshed successfully: ${listingId}`);
        return {
          success: true,
          listingId,
          refreshDate: response.data.data.refresh_date,
          nextRefreshDate: response.data.data.next_refresh_date,
        };
      } else {
        throw new BadRequestException(response.data.message || 'Failed to refresh listing');
      }
    } catch (error) {
      this.logger.error(`Failed to refresh listing: ${listingId}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to refresh listing on Sahibinden');
    }
  }

  async promoteListing(listingId: number, promotionType: 'vitrin' | 'showcase' | 'homepage', duration: number): Promise<any> {
    try {
      this.logger.log(`Promoting listing: ${listingId} with ${promotionType} for ${duration} days`);

      const response = await this.apiClient.post(`/v1/classifieds/${listingId}/promote`, {
        promotion_type: promotionType,
        duration: duration,
      });

      if (response.data.success) {
        this.logger.log(`Listing promoted successfully: ${listingId}`);
        return {
          success: true,
          listingId,
          promotionType,
          startDate: response.data.data.promotion_start_date,
          endDate: response.data.data.promotion_end_date,
          cost: response.data.data.cost,
        };
      } else {
        throw new BadRequestException(response.data.message || 'Failed to promote listing');
      }
    } catch (error) {
      this.logger.error(`Failed to promote listing: ${listingId}`, error.response?.data || error.message);
      throw new BadRequestException(error.response?.data?.message || 'Failed to promote listing on Sahibinden');
    }
  }

  async bulkCreateListings(products: SahibindenProduct[]): Promise<any> {
    try {
      this.logger.log(`Bulk creating ${products.length} listings`);

      const results = [];

      for (const product of products) {
        try {
          const result = await this.createListing(product);
          results.push({
            success: true,
            title: product.title,
            ...result,
          });
          await this.sleep(1000);
        } catch (error) {
          results.push({
            success: false,
            title: product.title,
            error: error.message,
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      this.logger.log(`Bulk listing creation completed: ${successCount}/${products.length} successful`);

      return {
        success: true,
        total: products.length,
        successful: successCount,
        failed: products.length - successCount,
        results,
      };
    } catch (error) {
      this.logger.error('Bulk listing creation failed', error.response?.data || error.message);
      throw new BadRequestException('Failed to bulk create listings on Sahibinden');
    }
  }

  async bulkUpdateStatus(listingIds: number[], status: 'active' | 'passive'): Promise<any> {
    try {
      this.logger.log(`Bulk updating status for ${listingIds.length} listings`);

      const response = await this.apiClient.patch('/v1/classifieds/bulk/status', {
        listing_ids: listingIds,
        status,
      });

      if (response.data.success) {
        this.logger.log(`Bulk status update completed`);
        return {
          success: true,
          updatedCount: response.data.data.updated_count,
          failedCount: response.data.data.failed_count,
        };
      } else {
        throw new BadRequestException('Failed to bulk update status');
      }
    } catch (error) {
      this.logger.error('Failed to bulk update status', error.response?.data || error.message);
      throw new BadRequestException('Failed to bulk update listing status on Sahibinden');
    }
  }

  async bulkDelete(listingIds: number[]): Promise<any> {
    try {
      this.logger.log(`Bulk deleting ${listingIds.length} listings`);

      const response = await this.apiClient.post('/v1/classifieds/bulk/delete', {
        listing_ids: listingIds,
      });

      if (response.data.success) {
        this.logger.log(`Bulk delete completed`);
        return {
          success: true,
          deletedCount: response.data.data.deleted_count,
          failedCount: response.data.data.failed_count,
        };
      } else {
        throw new BadRequestException('Failed to bulk delete listings');
      }
    } catch (error) {
      this.logger.error('Failed to bulk delete listings', error.response?.data || error.message);
      throw new BadRequestException('Failed to bulk delete listings on Sahibinden');
    }
  }

  async searchListings(query: string, filters?: {
    category?: number;
    city?: number;
    minPrice?: number;
    maxPrice?: number;
    condition?: number;
  }): Promise<any> {
    try {
      this.logger.log(`Searching listings: ${query}`);

      const params = {
        query,
        store_id: this.storeId,
        ...filters,
      };

      const response = await this.apiClient.get('/v1/classifieds/search', { params });

      if (response.data.success) {
        this.logger.log(`Found ${response.data.data.items?.length || 0} listings`);
        return {
          success: true,
          items: response.data.data.items,
          total: response.data.data.total,
        };
      } else {
        throw new BadRequestException('Search failed');
      }
    } catch (error) {
      this.logger.error('Failed to search listings', error.response?.data || error.message);
      throw new BadRequestException('Failed to search listings on Sahibinden');
    }
  }

  async getPromotionPrices(): Promise<any> {
    try {
      this.logger.log('Fetching promotion prices from Sahibinden');

      const response = await this.apiClient.get('/v1/promotions/prices');

      if (response.data.success) {
        return {
          success: true,
          prices: response.data.data.map((price: any) => ({
            type: price.type,
            name: price.name,
            duration: price.duration,
            price: price.price,
            currency: price.currency,
            description: price.description,
          })),
        };
      } else {
        throw new BadRequestException('Failed to fetch promotion prices');
      }
    } catch (error) {
      this.logger.error('Failed to fetch promotion prices', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch promotion prices from Sahibinden');
    }
  }

  async getStoreInfo(): Promise<any> {
    try {
      this.logger.log('Fetching store info from Sahibinden');

      const response = await this.apiClient.get(`/v1/stores/${this.storeId}`);

      if (response.data.success) {
        const data = response.data.data;
        return {
          success: true,
          store: {
            id: data.id,
            name: data.name,
            description: data.description,
            logo: data.logo,
            rating: data.rating,
            reviewCount: data.review_count,
            activeListingsCount: data.active_listings_count,
            totalSales: data.total_sales,
            memberSince: data.member_since,
            verificationStatus: data.verification_status,
            contactInfo: {
              phone: data.phone,
              email: data.email,
              website: data.website,
            },
            address: data.address,
          },
        };
      } else {
        throw new BadRequestException('Failed to fetch store info');
      }
    } catch (error) {
      this.logger.error('Failed to fetch store info', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch store info from Sahibinden');
    }
  }

  async updateStoreInfo(updates: {
    name?: string;
    description?: string;
    logo?: string;
    phone?: string;
    email?: string;
    website?: string;
  }): Promise<any> {
    try {
      this.logger.log('Updating store info on Sahibinden');

      const response = await this.apiClient.put(`/v1/stores/${this.storeId}`, updates);

      if (response.data.success) {
        this.logger.log('Store info updated successfully');
        return {
          success: true,
          message: response.data.message,
        };
      } else {
        throw new BadRequestException(response.data.message || 'Failed to update store info');
      }
    } catch (error) {
      this.logger.error('Failed to update store info', error.response?.data || error.message);
      throw new BadRequestException('Failed to update store info on Sahibinden');
    }
  }

  async getReviews(params?: { page?: number; pageSize?: number }): Promise<any> {
    try {
      this.logger.log('Fetching store reviews from Sahibinden');

      const queryParams = {
        store_id: this.storeId,
        page: params?.page || 1,
        page_size: params?.pageSize || 20,
      };

      const response = await this.apiClient.get('/v1/reviews', { params: queryParams });

      if (response.data.success) {
        return {
          success: true,
          reviews: response.data.data.items.map((review: any) => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            reviewerName: review.reviewer_name,
            date: review.date,
            listingId: review.listing_id,
          })),
          averageRating: response.data.data.average_rating,
          total: response.data.data.total,
        };
      } else {
        throw new BadRequestException('Failed to fetch reviews');
      }
    } catch (error) {
      this.logger.error('Failed to fetch reviews', error.response?.data || error.message);
      throw new BadRequestException('Failed to fetch reviews from Sahibinden');
    }
  }

  async replyToReview(reviewId: number, reply: string): Promise<any> {
    try {
      this.logger.log(`Replying to review: ${reviewId}`);

      const response = await this.apiClient.post(`/v1/reviews/${reviewId}/reply`, {
        reply,
      });

      if (response.data.success) {
        this.logger.log(`Review reply submitted: ${reviewId}`);
        return {
          success: true,
          reviewId,
          replyDate: response.data.data.reply_date,
        };
      } else {
        throw new BadRequestException(response.data.message || 'Failed to reply to review');
      }
    } catch (error) {
      this.logger.error(`Failed to reply to review: ${reviewId}`, error.response?.data || error.message);
      throw new BadRequestException('Failed to reply to review on Sahibinden');
    }
  }

  private generateSignature(method: string, url: string, timestamp: string, nonce: string): string {
    const dataToSign = `${method}${url}${timestamp}${nonce}${this.apiKey}`;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(dataToSign)
      .digest('hex');
  }

  private generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

