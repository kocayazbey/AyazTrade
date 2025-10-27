import { Alert, Platform, PermissionsAndroid, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './api.service';

export interface BarcodeResult {
  type: 'QR_CODE' | 'BARCODE' | 'UNKNOWN';
  data: string;
  format?: string;
  rawBytes?: number[];
}

export interface ProductSearchResult {
  success: boolean;
  product?: {
    id: string;
    name: string;
    sku: string;
    barcode: string;
    image: string;
    price: number;
    inStock: boolean;
    variants?: any[];
  };
  message?: string;
}

export interface ScanHistory {
  id: string;
  type: BarcodeResult['type'];
  data: string;
  timestamp: string;
  productFound?: boolean;
  productId?: string;
}

class BarcodeService {
  private static instance: BarcodeService;
  private scanHistory: ScanHistory[] = [];
  private maxHistorySize = 50;

  private constructor() {}

  static getInstance(): BarcodeService {
    if (!BarcodeService.instance) {
      BarcodeService.instance = new BarcodeService();
    }
    return BarcodeService.instance;
  }

  async initialize(): Promise<boolean> {
    try {
      // Load scan history
      await this.loadScanHistory();

      // Check camera permission
      const hasPermission = await this.checkCameraPermission();

      if (!hasPermission) {
        const granted = await this.requestCameraPermission();
        if (!granted) {
          Alert.alert(
            'Kamera İzni Gerekli',
            'Barkod tarama için kamera izni vermeniz gerekiyor.',
            [
              { text: 'İptal', style: 'cancel' },
              {
                text: 'Ayarlara Git',
                onPress: () => this.openSettings(),
              },
            ]
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize barcode service:', error);
      return false;
    }
  }

  private async checkCameraPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
        return granted;
      } catch (error) {
        console.error('Failed to check camera permission:', error);
        return false;
      }
    }
    return true; // iOS permissions are handled by the library
  }

  private async requestCameraPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.error('Failed to request camera permission:', error);
        return false;
      }
    }
    return true;
  }

  private openSettings(): void {
    if (Platform.OS === 'android') {
      Linking.openSettings();
    } else {
      Linking.openURL('app-settings:');
    }
  }

  // QR Code and Barcode scanning
  async scanBarcode(): Promise<BarcodeResult | null> {
    try {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Barcode service not initialized');
      }

      // This would integrate with your camera library
      // For now, we'll simulate the scanning result
      return new Promise((resolve) => {
        // Simulate camera scanning
        setTimeout(() => {
          // This is where you'd use react-native-camera or similar
          // For demonstration, we'll return a mock result
          resolve({
            type: 'BARCODE',
            data: '1234567890123', // Example barcode
            format: 'EAN_13',
          });
        }, 2000);
      });
    } catch (error) {
      console.error('Failed to scan barcode:', error);
      Alert.alert('Hata', 'Barkod taranamadı. Lütfen tekrar deneyin.');
      return null;
    }
  }

  async scanQRCode(): Promise<BarcodeResult | null> {
    try {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Barcode service not initialized');
      }

      return new Promise((resolve) => {
        // Simulate QR code scanning
        setTimeout(() => {
          resolve({
            type: 'QR_CODE',
            data: 'https://ayaztrade.com/product/123',
            format: 'QR_CODE',
          });
        }, 1500);
      });
    } catch (error) {
      console.error('Failed to scan QR code:', error);
      Alert.alert('Hata', 'QR kod taranamadı. Lütfen tekrar deneyin.');
      return null;
    }
  }

  // Product search by barcode
  async searchProductByBarcode(barcode: string): Promise<ProductSearchResult> {
    try {
      const data = await apiService.searchProducts(`barcode:${barcode}`);

      if (data.success && data.data.products.length > 0) {
        const product = data.data.products[0];

        // Add to scan history
        await this.addToHistory({
          type: 'BARCODE',
          data: barcode,
          productFound: true,
          productId: product.id,
        });

        return {
          success: true,
          product: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            barcode: barcode,
            image: product.images?.[0] || '',
            price: product.price,
            inStock: product.inStock,
            variants: product.variants,
          },
        };
      } else {
        // Product not found
        await this.addToHistory({
          type: 'BARCODE',
          data: barcode,
          productFound: false,
        });

        return {
          success: false,
          message: 'Bu barkoda ait ürün bulunamadı.',
        };
      }
    } catch (error: any) {
      console.error('Failed to search product by barcode:', error);
      return {
        success: false,
        message: error.message || 'Ürün araması başarısız.',
      };
    }
  }

  async searchProductByQRCode(qrData: string): Promise<ProductSearchResult> {
    try {
      // Check if QR code contains a product URL
      if (qrData.includes('/product/')) {
        const productId = qrData.split('/product/')[1];
        const data = await apiService.getProduct(productId);

        if (data.success) {
          await this.addToHistory({
            type: 'QR_CODE',
            data: qrData,
            productFound: true,
            productId: data.data.id,
          });

          return {
            success: true,
            product: {
              id: data.data.id,
              name: data.data.name,
              sku: data.data.sku,
              barcode: data.data.barcode,
              image: data.data.images?.[0] || '',
              price: data.data.price,
              inStock: data.data.inStock,
              variants: data.data.variants,
            },
          };
        }
      }

      // Try to search as barcode
      return await this.searchProductByBarcode(qrData);
    } catch (error: any) {
      console.error('Failed to search product by QR code:', error);
      return {
        success: false,
        message: error.message || 'QR kod ile ürün araması başarısız.',
      };
    }
  }

  // Scan history management
  private async addToHistory(item: Omit<ScanHistory, 'id' | 'timestamp'>): Promise<void> {
    try {
      const historyItem: ScanHistory = {
        id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        ...item,
      };

      this.scanHistory.unshift(historyItem);

      // Keep only recent items
      if (this.scanHistory.length > this.maxHistorySize) {
        this.scanHistory = this.scanHistory.slice(0, this.maxHistorySize);
      }

      await this.saveScanHistory();
    } catch (error) {
      console.error('Failed to add to scan history:', error);
    }
  }

  async getScanHistory(): Promise<ScanHistory[]> {
    return [...this.scanHistory];
  }

  async clearScanHistory(): Promise<boolean> {
    try {
      this.scanHistory = [];
      await AsyncStorage.removeItem('scan_history');
      return true;
    } catch (error) {
      console.error('Failed to clear scan history:', error);
      return false;
    }
  }

  private async loadScanHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('scan_history');
      if (stored) {
        this.scanHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load scan history:', error);
    }
  }

  private async saveScanHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem('scan_history', JSON.stringify(this.scanHistory));
    } catch (error) {
      console.error('Failed to save scan history:', error);
    }
  }

  // Barcode validation
  validateBarcode(barcode: string): boolean {
    // Basic barcode validation
    if (!barcode || barcode.length === 0) {
      return false;
    }

    // Remove spaces and special characters
    const cleanBarcode = barcode.replace(/[^0-9A-Za-z]/g, '');

    // Check length (typical barcode lengths)
    return cleanBarcode.length >= 8 && cleanBarcode.length <= 18;
  }

  validateQRCode(qrData: string): boolean {
    // Basic QR code validation
    if (!qrData || qrData.length === 0) {
      return false;
    }

    // Check if it's a URL or contains expected patterns
    return qrData.length > 0 && (qrData.startsWith('http') || qrData.length <= 1000);
  }

  // Barcode generation (for testing purposes)
  generateBarcodeImage(barcode: string, format: string = 'CODE128'): string {
    // This would integrate with a barcode generation library
    // For now, return a placeholder URL
    return `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcode)}&code=${format}&multiplebarcodes=false&translate-esc=false&unit=Fit&dpi=96&imagetype=Gif&rotation=0&color=%23000000&bgcolor=%23ffffff&qunit=Mm&quiet=0`;
  }

  // Bulk scanning
  async scanMultipleBarcodes(): Promise<BarcodeResult[]> {
    try {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Barcode service not initialized');
      }

      // This would implement continuous scanning
      // For now, return a single result
      const result = await this.scanBarcode();
      return result ? [result] : [];
    } catch (error) {
      console.error('Failed to scan multiple barcodes:', error);
      return [];
    }
  }

  // Inventory scanning
  async scanInventoryLocation(locationCode: string): Promise<any> {
    try {
      const data = await apiService.getInventory(locationCode);

      if (data.success) {
        return {
          success: true,
          location: locationCode,
          products: data.data.products,
          totalItems: data.data.totalItems,
        };
      } else {
        return {
          success: false,
          message: data.message || 'Lokasyon bulunamadı.',
        };
      }
    } catch (error: any) {
      console.error('Failed to scan inventory location:', error);
      return {
        success: false,
        message: error.message || 'Envanter taraması başarısız.',
      };
    }
  }

  // Analytics
  async getScanAnalytics(): Promise<{
    totalScans: number;
    successfulScans: number;
    scanTypes: Record<string, number>;
    recentActivity: ScanHistory[];
  }> {
    const totalScans = this.scanHistory.length;
    const successfulScans = this.scanHistory.filter(h => h.productFound).length;
    const scanTypes = this.scanHistory.reduce((acc, scan) => {
      acc[scan.type] = (acc[scan.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalScans,
      successfulScans,
      scanTypes,
      recentActivity: this.scanHistory.slice(0, 10),
    };
  }

  // Integration with camera
  async openBarcodeScanner(): Promise<BarcodeResult | null> {
    try {
      // This would open the camera with barcode scanning overlay
      // Integration depends on your camera library choice
      return await this.scanBarcode();
    } catch (error) {
      console.error('Failed to open barcode scanner:', error);
      return null;
    }
  }

  async openQRScanner(): Promise<BarcodeResult | null> {
    try {
      return await this.scanQRCode();
    } catch (error) {
      console.error('Failed to open QR scanner:', error);
      return null;
    }
  }

  // Utility methods
  parseBarcodeFormat(format: string): string {
    switch (format.toUpperCase()) {
      case 'EAN_13':
        return 'EAN-13';
      case 'EAN_8':
        return 'EAN-8';
      case 'CODE_128':
        return 'Code 128';
      case 'CODE_39':
        return 'Code 39';
      case 'QR_CODE':
        return 'QR Kod';
      case 'UPC_A':
        return 'UPC-A';
      case 'UPC_E':
        return 'UPC-E';
      default:
        return format;
    }
  }

  // Flash and torch control (if supported by camera)
  async toggleFlash(): Promise<boolean> {
    // Implementation depends on camera library
    return false;
  }

  async toggleTorch(): Promise<boolean> {
    // Implementation depends on camera library
    return false;
  }

  // Sound and vibration feedback
  async playScanSound(): Promise<void> {
    try {
      // Play scan sound
      console.log('Playing scan sound');
      // Implementation would use a sound library
    } catch (error) {
      console.error('Failed to play scan sound:', error);
    }
  }

  async vibrateOnScan(): Promise<void> {
    try {
      // Trigger vibration
      console.log('Vibrating on scan');
      // Implementation would use Vibration API
    } catch (error) {
      console.error('Failed to vibrate on scan:', error);
    }
  }
}

export default BarcodeService;
