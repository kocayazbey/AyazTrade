import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

@Injectable()
export class GoogleAnalyticsService {
  private readonly logger = new Logger(GoogleAnalyticsService.name);
  private analyticsDataClient: BetaAnalyticsDataClient;
  private propertyId: string;

  constructor(private configService: ConfigService) {
    this.propertyId = this.configService.get<string>('GA_PROPERTY_ID');
    const credentials = this.configService.get<string>('GA_CREDENTIALS_JSON');

    if (credentials) {
      this.analyticsDataClient = new BetaAnalyticsDataClient({
        credentials: JSON.parse(credentials),
      });
    }
  }

  async getRealtimeReport(): Promise<any> {
    try {
      const [response] = await this.analyticsDataClient.runRealtimeReport({
        property: `properties/${this.propertyId}`,
        dimensions: [{ name: 'country' }, { name: 'city' }],
        metrics: [{ name: 'activeUsers' }],
      });

      return {
        success: true,
        data: response.rows?.map((row) => ({
          country: row.dimensionValues[0].value,
          city: row.dimensionValues[1].value,
          activeUsers: parseInt(row.metricValues[0].value || '0'),
        })),
      };
    } catch (error) {
      this.logger.error('GA realtime report error:', error);
      throw error;
    }
  }

  async getTrafficReport(startDate: string, endDate: string): Promise<any> {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'pageviews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
      });

      return {
        success: true,
        data: response.rows?.map((row) => ({
          date: row.dimensionValues[0].value,
          activeUsers: parseInt(row.metricValues[0].value || '0'),
          sessions: parseInt(row.metricValues[1].value || '0'),
          pageviews: parseInt(row.metricValues[2].value || '0'),
          bounceRate: parseFloat(row.metricValues[3].value || '0'),
          avgSessionDuration: parseFloat(row.metricValues[4].value || '0'),
        })),
      };
    } catch (error) {
      this.logger.error('GA traffic report error:', error);
      throw error;
    }
  }

  async getEcommerceReport(startDate: string, endDate: string): Promise<any> {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'transactions' },
          { name: 'totalRevenue' },
          { name: 'averagePurchaseRevenue' },
          { name: 'ecommercePurchases' },
          { name: 'itemsViewed' },
          { name: 'itemsAddedToCart' },
        ],
      });

      return {
        success: true,
        data: response.rows?.map((row) => ({
          date: row.dimensionValues[0].value,
          transactions: parseInt(row.metricValues[0].value || '0'),
          totalRevenue: parseFloat(row.metricValues[1].value || '0'),
          averagePurchaseRevenue: parseFloat(row.metricValues[2].value || '0'),
          ecommercePurchases: parseInt(row.metricValues[3].value || '0'),
          itemsViewed: parseInt(row.metricValues[4].value || '0'),
          itemsAddedToCart: parseInt(row.metricValues[5].value || '0'),
        })),
      };
    } catch (error) {
      this.logger.error('GA ecommerce report error:', error);
      throw error;
    }
  }

  generateTrackingScript(measurementId: string): string {
    return `
      <!-- Global site tag (gtag.js) - Google Analytics -->
      <script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${measurementId}');
      </script>
    `;
  }

  generateEcommerceScript(): string {
    return `
      <script>
        function trackPurchase(orderData) {
          gtag('event', 'purchase', {
            transaction_id: orderData.orderId,
            value: orderData.total,
            currency: orderData.currency,
            tax: orderData.tax,
            shipping: orderData.shipping,
            items: orderData.items.map(item => ({
              item_id: item.sku,
              item_name: item.name,
              item_category: item.category,
              price: item.price,
              quantity: item.quantity
            }))
          });
        }

        function trackAddToCart(product) {
          gtag('event', 'add_to_cart', {
            currency: 'TRY',
            value: product.price,
            items: [{
              item_id: product.sku,
              item_name: product.name,
              item_category: product.category,
              price: product.price,
              quantity: product.quantity
            }]
          });
        }

        function trackViewItem(product) {
          gtag('event', 'view_item', {
            currency: 'TRY',
            value: product.price,
            items: [{
              item_id: product.sku,
              item_name: product.name,
              item_category: product.category,
              price: product.price
            }]
          });
        }
      </script>
    `;
  }
}

