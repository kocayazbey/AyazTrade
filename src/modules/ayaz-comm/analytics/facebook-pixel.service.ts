import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class FacebookPixelService {
  private readonly logger = new Logger(FacebookPixelService.name);
  private apiClient: AxiosInstance;
  private pixelId: string;
  private accessToken: string;
  private testEventCode: string;

  constructor(private configService: ConfigService) {
    this.pixelId = this.configService.get<string>('FB_PIXEL_ID');
    this.accessToken = this.configService.get<string>('FB_PIXEL_ACCESS_TOKEN');
    this.testEventCode = this.configService.get<string>('FB_PIXEL_TEST_EVENT_CODE');

    this.apiClient = axios.create({
      baseURL: 'https://graph.facebook.com/v18.0',
      timeout: 30000,
    });
  }

  async trackServerEvent(eventName: string, eventData: any, userData: any): Promise<any> {
    try {
      const eventTime = Math.floor(Date.now() / 1000);
      const eventId = this.generateEventId();

      const payload = {
        data: [
          {
            event_name: eventName,
            event_time: eventTime,
            event_id: eventId,
            event_source_url: eventData.sourceUrl || '',
            action_source: 'website',
            user_data: {
              em: userData.email ? this.hashData(userData.email) : undefined,
              ph: userData.phone ? this.hashData(userData.phone) : undefined,
              fn: userData.firstName ? this.hashData(userData.firstName) : undefined,
              ln: userData.lastName ? this.hashData(userData.lastName) : undefined,
              ct: userData.city ? this.hashData(userData.city) : undefined,
              st: userData.state ? this.hashData(userData.state) : undefined,
              zp: userData.zipCode ? this.hashData(userData.zipCode) : undefined,
              country: userData.country ? this.hashData(userData.country) : undefined,
              client_ip_address: userData.ipAddress,
              client_user_agent: userData.userAgent,
              fbp: userData.fbp,
              fbc: userData.fbc,
            },
            custom_data: eventData.customData || {},
          },
        ],
        test_event_code: this.testEventCode,
      };

      const response = await this.apiClient.post(
        `/${this.pixelId}/events?access_token=${this.accessToken}`,
        payload
      );

      this.logger.log(`Facebook Pixel event tracked: ${eventName}`);
      return {
        success: true,
        eventId: eventId,
        eventsReceived: response.data.events_received,
      };
    } catch (error) {
      this.logger.error(`Facebook Pixel tracking error: ${error.message}`);
      throw error;
    }
  }

  async trackPurchase(orderData: any, userData: any): Promise<any> {
    return this.trackServerEvent('Purchase', {
      sourceUrl: orderData.sourceUrl,
      customData: {
        value: orderData.total,
        currency: orderData.currency || 'TRY',
        content_type: 'product',
        content_ids: orderData.items.map((item: any) => item.sku),
        contents: orderData.items.map((item: any) => ({
          id: item.sku,
          quantity: item.quantity,
          item_price: item.price,
        })),
        num_items: orderData.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
      },
    }, userData);
  }

  async trackAddToCart(product: any, userData: any): Promise<any> {
    return this.trackServerEvent('AddToCart', {
      sourceUrl: product.sourceUrl,
      customData: {
        value: product.price,
        currency: product.currency || 'TRY',
        content_type: 'product',
        content_ids: [product.sku],
        contents: [{
          id: product.sku,
          quantity: product.quantity || 1,
          item_price: product.price,
        }],
      },
    }, userData);
  }

  async trackViewContent(product: any, userData: any): Promise<any> {
    return this.trackServerEvent('ViewContent', {
      sourceUrl: product.sourceUrl,
      customData: {
        value: product.price,
        currency: product.currency || 'TRY',
        content_type: 'product',
        content_ids: [product.sku],
        content_name: product.name,
        content_category: product.category,
      },
    }, userData);
  }

  async trackInitiateCheckout(cartData: any, userData: any): Promise<any> {
    return this.trackServerEvent('InitiateCheckout', {
      sourceUrl: cartData.sourceUrl,
      customData: {
        value: cartData.total,
        currency: cartData.currency || 'TRY',
        content_type: 'product',
        content_ids: cartData.items.map((item: any) => item.sku),
        contents: cartData.items.map((item: any) => ({
          id: item.sku,
          quantity: item.quantity,
          item_price: item.price,
        })),
        num_items: cartData.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
      },
    }, userData);
  }

  async trackSearch(searchData: any, userData: any): Promise<any> {
    return this.trackServerEvent('Search', {
      sourceUrl: searchData.sourceUrl,
      customData: {
        search_string: searchData.query,
        content_category: searchData.category,
      },
    }, userData);
  }

  generatePixelScript(pixelId: string): string {
    return `
      <!-- Facebook Pixel Code -->
      <script>
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        fbq('track', 'PageView');
      </script>
      <noscript>
        <img height="1" width="1" style="display:none"
          src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>
      </noscript>
      <!-- End Facebook Pixel Code -->
    `;
  }

  generateEcommerceScript(): string {
    return `
      <script>
        function trackFBPurchase(orderData) {
          fbq('track', 'Purchase', {
            value: orderData.total,
            currency: orderData.currency,
            content_type: 'product',
            content_ids: orderData.items.map(item => item.sku),
            contents: orderData.items.map(item => ({
              id: item.sku,
              quantity: item.quantity,
              item_price: item.price
            })),
            num_items: orderData.items.reduce((sum, item) => sum + item.quantity, 0)
          });
        }

        function trackFBAddToCart(product) {
          fbq('track', 'AddToCart', {
            value: product.price,
            currency: 'TRY',
            content_type: 'product',
            content_ids: [product.sku],
            contents: [{
              id: product.sku,
              quantity: product.quantity || 1,
              item_price: product.price
            }]
          });
        }

        function trackFBViewContent(product) {
          fbq('track', 'ViewContent', {
            value: product.price,
            currency: 'TRY',
            content_type: 'product',
            content_ids: [product.sku],
            content_name: product.name,
            content_category: product.category
          });
        }

        function trackFBInitiateCheckout(cartData) {
          fbq('track', 'InitiateCheckout', {
            value: cartData.total,
            currency: 'TRY',
            content_type: 'product',
            content_ids: cartData.items.map(item => item.sku),
            contents: cartData.items.map(item => ({
              id: item.sku,
              quantity: item.quantity,
              item_price: item.price
            })),
            num_items: cartData.items.reduce((sum, item) => sum + item.quantity, 0)
          });
        }

        function trackFBSearch(query) {
          fbq('track', 'Search', {
            search_string: query
          });
        }
      </script>
    `;
  }

  private hashData(data: string): string {
    return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex');
  }

  private generateEventId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

