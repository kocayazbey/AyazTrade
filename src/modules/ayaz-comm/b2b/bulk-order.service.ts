import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

interface BulkOrderItem {
  sku: string;
  quantity: number;
  price?: number;
  notes?: string;
  lineNumber: number;
}

interface BulkOrderResult {
  success: boolean;
  totalItems: number;
  validItems: number;
  invalidItems: number;
  items: BulkOrderItem[];
  errors: Array<{ line: number; error: string }>;
}

interface QuickOrderItem {
  sku: string;
  quantity: number;
}

@Injectable()
export class BulkOrderService {
  private readonly logger = new Logger(BulkOrderService.name);

  async importFromExcel(fileBuffer: Buffer): Promise<BulkOrderResult> {
    try {
      this.logger.log('Processing Excel import for bulk order');

      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);

      const items: BulkOrderItem[] = [];
      const errors: Array<{ line: number; error: string }> = [];

      for (let i = 0; i < data.length; i++) {
        const row: any = data[i];
        const lineNumber = i + 2;

        try {
          const sku = this.extractValue(row, ['SKU', 'sku', 'Ürün Kodu', 'Product Code']);
          const quantity = this.extractValue(row, ['Quantity', 'quantity', 'Miktar', 'Adet']);

          if (!sku) {
            errors.push({ line: lineNumber, error: 'SKU is required' });
            continue;
          }

          if (!quantity || quantity <= 0) {
            errors.push({ line: lineNumber, error: 'Valid quantity is required' });
            continue;
          }

          const item: BulkOrderItem = {
            sku: String(sku).trim(),
            quantity: Number(quantity),
            price: this.extractValue(row, ['Price', 'price', 'Fiyat']),
            notes: this.extractValue(row, ['Notes', 'notes', 'Not', 'Notlar']),
            lineNumber,
          };

          items.push(item);
        } catch (error) {
          errors.push({ line: lineNumber, error: error.message });
        }
      }

      const result: BulkOrderResult = {
        success: errors.length === 0,
        totalItems: data.length,
        validItems: items.length,
        invalidItems: errors.length,
        items,
        errors,
      };

      this.logger.log(`Excel import processed: ${items.length} valid, ${errors.length} invalid`);
      return result;
    } catch (error) {
      this.logger.error('Excel import failed:', error);
      throw new BadRequestException('Failed to process Excel file');
    }
  }

  async importFromCSV(csvContent: string): Promise<BulkOrderResult> {
    try {
      this.logger.log('Processing CSV import for bulk order');

      const lines = csvContent.split('\n').filter((line) => line.trim());
      if (lines.length === 0) {
        throw new BadRequestException('CSV file is empty');
      }

      const headers = lines[0].split(',').map((h) => h.trim());
      const items: BulkOrderItem[] = [];
      const errors: Array<{ line: number; error: string }> = [];

      for (let i = 1; i < lines.length; i++) {
        const lineNumber = i + 1;
        try {
          const values = lines[i].split(',').map((v) => v.trim());
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index];
          });

          const sku = this.extractValue(row, ['SKU', 'sku', 'Ürün Kodu']);
          const quantity = this.extractValue(row, ['Quantity', 'quantity', 'Miktar']);

          if (!sku || !quantity || quantity <= 0) {
            errors.push({ line: lineNumber, error: 'Invalid SKU or quantity' });
            continue;
          }

          items.push({
            sku: String(sku).trim(),
            quantity: Number(quantity),
            notes: this.extractValue(row, ['Notes', 'Not']),
            lineNumber,
          });
        } catch (error) {
          errors.push({ line: lineNumber, error: error.message });
        }
      }

      return {
        success: errors.length === 0,
        totalItems: lines.length - 1,
        validItems: items.length,
        invalidItems: errors.length,
        items,
        errors,
      };
    } catch (error) {
      this.logger.error('CSV import failed:', error);
      throw new BadRequestException('Failed to process CSV file');
    }
  }

  async quickOrder(items: QuickOrderItem[]): Promise<any> {
    this.logger.log(`Processing quick order with ${items.length} items`);

    const validItems = [];
    const invalidItems = [];

    for (const item of items) {
      if (item.sku && item.quantity > 0) {
        validItems.push(item);
      } else {
        invalidItems.push({ sku: item.sku, error: 'Invalid SKU or quantity' });
      }
    }

    return {
      success: invalidItems.length === 0,
      validItems,
      invalidItems,
      cartId: `cart_${Date.now()}`,
    };
  }

  async validateBulkOrder(items: BulkOrderItem[]): Promise<any> {
    const results = [];

    for (const item of items) {
      const validation = {
        sku: item.sku,
        quantity: item.quantity,
        isValid: true,
        errors: [],
        product: null,
        stockAvailable: true,
        price: 0,
      };

      results.push(validation);
    }

    return results;
  }

  generateExcelTemplate(): Buffer {
    const ws = XLSX.utils.aoa_to_sheet([
      ['SKU', 'Quantity', 'Notes'],
      ['PROD-001', '10', 'Urgent'],
      ['PROD-002', '20', ''],
      ['PROD-003', '5', 'Gift wrap'],
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bulk Order');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  generateCSVTemplate(): string {
    return `SKU,Quantity,Notes
PROD-001,10,Urgent
PROD-002,20,
PROD-003,5,Gift wrap`;
  }

  private extractValue(row: any, possibleKeys: string[]): any {
    for (const key of possibleKeys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return row[key];
      }
    }
    return null;
  }
}

