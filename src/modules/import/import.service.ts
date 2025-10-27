import { Injectable } from '@nestjs/common';
import { CacheService } from '../../core/cache/cache.service';
import { LoggerService } from '../../core/logger/logger.service';

@Injectable()
export class ImportService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async importFromCSV(csvContent: string, tenantId: string) {
    try {
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',').map(header => header.trim());
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = this.parseCSVLine(lines[i]);
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          data.push(row);
        }
      }

      this.loggerService.log(`CSV import completed: ${data.length} records`, 'ImportService');
      return { records: data, count: data.length };
    } catch (error) {
      this.loggerService.error('Error importing from CSV', error);
      throw error;
    }
  }

  async importFromExcel(excelContent: any, tenantId: string) {
    try {
      // In real implementation, use a library like 'xlsx'
      const data = [];
      
      this.loggerService.log(`Excel import completed: ${data.length} records`, 'ImportService');
      return { records: data, count: data.length };
    } catch (error) {
      this.loggerService.error('Error importing from Excel', error);
      throw error;
    }
  }

  async importFromJSON(jsonContent: string, tenantId: string) {
    try {
      const data = JSON.parse(jsonContent);
      const records = Array.isArray(data) ? data : [data];

      this.loggerService.log(`JSON import completed: ${records.length} records`, 'ImportService');
      return { records, count: records.length };
    } catch (error) {
      this.loggerService.error('Error importing from JSON', error);
      throw error;
    }
  }

  async validateImportData(data: any[], schema: any) {
    try {
      const validationResults = {
        valid: [],
        invalid: [],
        errors: []
      };

      data.forEach((record, index) => {
        const errors = this.validateRecord(record, schema);
        if (errors.length === 0) {
          validationResults.valid.push(record);
        } else {
          validationResults.invalid.push({ record, errors });
          validationResults.errors.push({
            row: index + 1,
            errors
          });
        }
      });

      return validationResults;
    } catch (error) {
      this.loggerService.error('Error validating import data', error);
      throw error;
    }
  }

  private parseCSVLine(line: string): string[] {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  private validateRecord(record: any, schema: any): string[] {
    const errors = [];
    
    for (const field of schema.required) {
      if (!record[field] || record[field].toString().trim() === '') {
        errors.push(`${field} is required`);
      }
    }

    for (const field of schema.fields) {
      if (record[field.name] && field.type === 'email' && !this.isValidEmail(record[field.name])) {
        errors.push(`${field.name} must be a valid email`);
      }
      
      if (record[field.name] && field.type === 'number' && isNaN(Number(record[field.name]))) {
        errors.push(`${field.name} must be a valid number`);
      }
    }

    return errors;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
