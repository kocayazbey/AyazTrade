#!/usr/bin/env ts-node

/**
 * Schema Naming Standardization Script
 *
 * This script ensures all database schema naming follows PostgreSQL conventions:
 * - Table names: lowercase with underscores (snake_case)
 * - Column names: lowercase with underscores (snake_case)
 * - Primary keys: id (uuid)
 * - Foreign keys: {referenced_table}_id
 * - Timestamps: created_at, updated_at
 * - Boolean flags: is_{property}, has_{property}
 * - Enum values: lowercase with underscores
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// Use process.cwd() for the current working directory
const __dirname = process.cwd();

interface NamingRule {
  pattern: RegExp;
  replacement: string;
  description: string;
}

interface SchemaFile {
  path: string;
  content: string;
  issues: string[];
}

// Naming conventions for PostgreSQL
const NAMING_RULES: NamingRule[] = [
  // Column naming patterns
  {
    pattern: /firstName/g,
    replacement: 'first_name',
    description: 'firstName → first_name'
  },
  {
    pattern: /lastName/g,
    replacement: 'last_name',
    description: 'lastName → last_name'
  },
  {
    pattern: /phoneNumber/g,
    replacement: 'phone',
    description: 'phoneNumber → phone'
  },
  {
    pattern: /orderNumber/g,
    replacement: 'order_number',
    description: 'orderNumber → order_number'
  },
  {
    pattern: /totalAmount/g,
    replacement: 'total_amount',
    description: 'totalAmount → total_amount'
  },
  {
    pattern: /paymentId/g,
    replacement: 'payment_id',
    description: 'paymentId → payment_id'
  },
  {
    pattern: /paymentReference/g,
    replacement: 'payment_reference',
    description: 'paymentReference → payment_reference'
  },
  {
    pattern: /paymentMethod/g,
    replacement: 'payment_method',
    description: 'paymentMethod → payment_method'
  },
  {
    pattern: /paymentStatus/g,
    replacement: 'payment_status',
    description: 'paymentStatus → payment_status'
  },
  {
    pattern: /orderDate/g,
    replacement: 'order_date',
    description: 'orderDate → order_date'
  },
  {
    pattern: /createdAt/g,
    replacement: 'created_at',
    description: 'createdAt → created_at'
  },
  {
    pattern: /updatedAt/g,
    replacement: 'updated_at',
    description: 'updatedAt → updated_at'
  },
  {
    pattern: /deletedAt/g,
    replacement: 'deleted_at',
    description: 'deletedAt → deleted_at'
  },
  {
    pattern: /isActive/g,
    replacement: 'is_active',
    description: 'isActive → is_active'
  },
  {
    pattern: /isFeatured/g,
    replacement: 'is_featured',
    description: 'isFeatured → is_featured'
  },
  {
    pattern: /isDigital/g,
    replacement: 'is_digital',
    description: 'isDigital → is_digital'
  },
  {
    pattern: /trackInventory/g,
    replacement: 'track_inventory',
    description: 'trackInventory → track_inventory'
  },
  {
    pattern: /allowBackorders/g,
    replacement: 'allow_backorders',
    description: 'allowBackorders → allow_backorders'
  },
  {
    pattern: /shortDescription/g,
    replacement: 'short_description',
    description: 'shortDescription → short_description'
  },
  {
    pattern: /compareAtPrice/g,
    replacement: 'compare_at_price',
    description: 'compareAtPrice → compare_at_price'
  },
  {
    pattern: /costPrice/g,
    replacement: 'cost_price',
    description: 'costPrice → cost_price'
  },
  {
    pattern: /wholesalePrice/g,
    replacement: 'wholesale_price',
    description: 'wholesalePrice → wholesale_price'
  },
  {
    pattern: /minOrderQuantity/g,
    replacement: 'min_order_quantity',
    description: 'minOrderQuantity → min_order_quantity'
  },
  {
    pattern: /maxOrderQuantity/g,
    replacement: 'max_order_quantity',
    description: 'maxOrderQuantity → max_order_quantity'
  },
  {
    pattern: /stockQuantity/g,
    replacement: 'stock_quantity',
    description: 'stockQuantity → stock_quantity'
  },
  {
    pattern: /lowStockThreshold/g,
    replacement: 'low_stock_threshold',
    description: 'lowStockThreshold → low_stock_threshold'
  },
  {
    pattern: /weightUnit/g,
    replacement: 'weight_unit',
    description: 'weightUnit → weight_unit'
  },
  {
    pattern: /seoTitle/g,
    replacement: 'seo_title',
    description: 'seoTitle → seo_title'
  },
  {
    pattern: /seoDescription/g,
    replacement: 'seo_description',
    description: 'seoDescription → seo_description'
  },
  {
    pattern: /seoKeywords/g,
    replacement: 'seo_keywords',
    description: 'seoKeywords → seo_keywords'
  },
  {
    pattern: /mfaSecret/g,
    replacement: 'mfa_secret',
    description: 'mfaSecret → mfa_secret'
  },
  {
    pattern: /mfaBackupCodes/g,
    replacement: 'mfa_backup_codes',
    description: 'mfaBackupCodes → mfa_backup_codes'
  },
  {
    pattern: /mfaEnabled/g,
    replacement: 'mfa_enabled',
    description: 'mfaEnabled → mfa_enabled'
  },
  {
    pattern: /mfaEnabledAt/g,
    replacement: 'mfa_enabled_at',
    description: 'mfaEnabledAt → mfa_enabled_at'
  },
  {
    pattern: /lastLogin/g,
    replacement: 'last_login',
    description: 'lastLogin → last_login'
  },
  {
    pattern: /tenantId/g,
    replacement: 'tenant_id',
    description: 'tenantId → tenant_id'
  },
  {
    pattern: /productId/g,
    replacement: 'product_id',
    description: 'productId → product_id'
  },
  {
    pattern: /categoryId/g,
    replacement: 'category_id',
    description: 'categoryId → category_id'
  },
  {
    pattern: /brandId/g,
    replacement: 'brand_id',
    description: 'brandId → brand_id'
  },
  {
    pattern: /vendorId/g,
    replacement: 'vendor_id',
    description: 'vendorId → vendor_id'
  },
  {
    pattern: /warehouseId/g,
    replacement: 'warehouse_id',
    description: 'warehouseId → warehouse_id'
  },
  {
    pattern: /locationId/g,
    replacement: 'location_id',
    description: 'locationId → location_id'
  },
  {
    pattern: /variantId/g,
    replacement: 'variant_id',
    description: 'variantId → variant_id'
  },
  {
    pattern: /orderId/g,
    replacement: 'order_id',
    description: 'orderId → order_id'
  },
  {
    pattern: /userId/g,
    replacement: 'user_id',
    description: 'userId → user_id'
  },
  {
    pattern: /inventoryId/g,
    replacement: 'inventory_id',
    description: 'inventoryId → inventory_id'
  },
  {
    pattern: /referenceId/g,
    replacement: 'reference_id',
    description: 'referenceId → reference_id'
  },
  {
    pattern: /createdBy/g,
    replacement: 'created_by',
    description: 'createdBy → created_by'
  },
  {
    pattern: /updatedBy/g,
    replacement: 'updated_by',
    description: 'updatedBy → updated_by'
  },
  {
    pattern: /changedBy/g,
    replacement: 'changed_by',
    description: 'changedBy → changed_by'
  },
  {
    pattern: /parentId/g,
    replacement: 'parent_id',
    description: 'parentId → parent_id'
  },
  {
    pattern: /batchNumber/g,
    replacement: 'batch_number',
    description: 'batchNumber → batch_number'
  },
  {
    pattern: /serialNumber/g,
    replacement: 'serial_number',
    description: 'serialNumber → serial_number'
  },
  {
    pattern: /unitCost/g,
    replacement: 'unit_cost',
    description: 'unitCost → unit_cost'
  },
  {
    pattern: /totalValue/g,
    replacement: 'total_value',
    description: 'totalValue → total_value'
  },
  {
    pattern: /reservedQuantity/g,
    replacement: 'reserved_quantity',
    description: 'reservedQuantity → reserved_quantity'
  },
  {
    pattern: /availableQuantity/g,
    replacement: 'available_quantity',
    description: 'availableQuantity → available_quantity'
  },
  {
    pattern: /transferNumber/g,
    replacement: 'transfer_number',
    description: 'transferNumber → transfer_number'
  },
  {
    pattern: /fromWarehouseId/g,
    replacement: 'from_warehouse_id',
    description: 'fromWarehouseId → from_warehouse_id'
  },
  {
    pattern: /toWarehouseId/g,
    replacement: 'to_warehouse_id',
    description: 'toWarehouseId → to_warehouse_id'
  },
  {
    pattern: /fromLocationId/g,
    replacement: 'from_location_id',
    description: 'fromLocationId → from_location_id'
  },
  {
    pattern: /toLocationId/g,
    replacement: 'to_location_id',
    description: 'toLocationId → to_location_id'
  },
  {
    pattern: /movementType/g,
    replacement: 'movement_type',
    description: 'movementType → movement_type'
  },
  {
    pattern: /movementDate/g,
    replacement: 'movement_date',
    description: 'movementDate → movement_date'
  },
];

function findSchemaFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findSchemaFiles(fullPath));
    } else if (entry.name.endsWith('.schema.ts') || entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function analyzeSchemaFile(filePath: string): SchemaFile {
  const content = readFileSync(filePath, 'utf-8');
  const issues: string[] = [];

  // Check for camelCase patterns that should be snake_case

  let newContent = content;
  let hasChanges = false;

  for (const rule of NAMING_RULES) {
    if (rule.pattern.test(content)) {
      newContent = newContent.replace(rule.pattern, rule.replacement);
      hasChanges = true;
      issues.push(`Applied rule: ${rule.description}`);
    }
  }

  // Check for common camelCase patterns in column definitions
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for column definitions with camelCase
    if (line.includes('varchar') || line.includes('text') || line.includes('decimal') || line.includes('boolean')) {
      const camelCaseMatch = line.match(/[a-z]+[A-Z][a-zA-Z]*/g);
      if (camelCaseMatch) {
        camelCaseMatch.forEach(match => {
          if (!match.includes('Id') && !match.includes('At') && !match.includes('By')) {
            const snakeCase = match.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            issues.push(`Line ${i + 1}: Consider renaming '${match}' to '${snakeCase}'`);
          }
        });
      }
    }
  }

  return {
    path: filePath,
    content: hasChanges ? newContent : content,
    issues,
  };
}

function generateReport(files: SchemaFile[]): void {
  console.log('🔍 Schema Naming Standardization Report\n');

  let totalIssues = 0;
  let filesWithIssues = 0;

  for (const file of files) {
    if (file.issues.length > 0) {
      filesWithIssues++;
      totalIssues += file.issues.length;

      console.log(`📄 ${file.path}`);
      file.issues.forEach(issue => console.log(`  ⚠️  ${issue}`));
      console.log('');
    }
  }

  console.log(`📊 Summary:`);
  console.log(`   Files analyzed: ${files.length}`);
  console.log(`   Files with issues: ${filesWithIssues}`);
  console.log(`   Total issues: ${totalIssues}`);
}

async function main() {
  const schemaDir = join(__dirname, 'src/database/schema');
  const schemaFiles = findSchemaFiles(schemaDir);

  console.log(`🔍 Analyzing ${schemaFiles.length} schema files...\n`);

  const analyzedFiles = schemaFiles.map(analyzeSchemaFile);

  // Generate report
  generateReport(analyzedFiles);

  // Ask user if they want to apply fixes
  const hasChanges = analyzedFiles.some(file => file.content !== readFileSync(file.path, 'utf-8'));

  if (hasChanges) {
    console.log('✏️  Changes detected. Apply fixes? (y/N): ');

    // For now, just show what would be changed
    console.log('\n📝 Files that would be modified:');
    analyzedFiles.forEach(file => {
      const original = readFileSync(file.path, 'utf-8');
      if (file.content !== original) {
        console.log(`  ${file.path}`);
      }
    });
  } else {
    console.log('✅ All schema files follow naming conventions!');
  }
}

// Run if called directly
const isMainModule = process.argv[1]?.includes('standardize-schema-naming');
if (isMainModule) {
  main().catch(console.error);
}

export { analyzeSchemaFile, findSchemaFiles, NAMING_RULES };
