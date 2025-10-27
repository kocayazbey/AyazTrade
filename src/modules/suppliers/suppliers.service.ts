import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, or, like, gte, lte, desc, asc, sql, ilike } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service';
import { suppliers } from '../../database/schema/suppliers.schema';

@Injectable()
export class SuppliersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getSuppliers(query: any) {
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    // Build conditions for filtering
    const conditions = [];

    // Filter by status
    if (query.status) {
      conditions.push(eq(suppliers.status, query.status));
    }

    // Filter by city
    if (query.city) {
      conditions.push(eq(suppliers.city, query.city));
    }

    // Search filter (name, code, contact person, email)
    if (query.search) {
      const searchTerm = `%${query.search}%`;
      conditions.push(
        or(
          ilike(suppliers.name, searchTerm),
          ilike(suppliers.code, searchTerm),
          ilike(suppliers.contactPerson, searchTerm),
          ilike(suppliers.email, searchTerm)
        )
      );
    }

    // Exclude deleted suppliers
    conditions.push(eq(suppliers.deletedAt, null));

    const whereClause = conditions.length > 0 ? and(...conditions) : eq(suppliers.deletedAt, null);

    try {
      // Get total count for pagination
      const totalResult = await this.databaseService.drizzleClient
        .select({ count: sql<number>`count(*)` })
        .from(suppliers)
        .where(whereClause);

      const total = Number(totalResult[0].count);

      // Get paginated results
      const suppliersList = await this.databaseService.drizzleClient
        .select()
        .from(suppliers)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(suppliers.createdAt));

      return {
        success: true,
        data: {
          suppliers: suppliersList,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw new Error(`Suppliers fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getSupplierById(id: string) {
    try {
      const [supplier] = await this.databaseService.drizzleClient
        .select()
        .from(suppliers)
        .where(and(eq(suppliers.id, id), eq(suppliers.deletedAt, null)))
        .limit(1);

      if (!supplier) {
        throw new NotFoundException('Supplier not found');
      }

      return { success: true, data: supplier };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching supplier:', error);
      throw new Error(`Supplier fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createSupplier(data: any, userId: string) {
    try {
      const supplierData = {
        id: `SUP-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: data.name,
        code: data.code || `SUP-${Date.now()}`,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        country: data.country || 'Türkiye',
        taxNumber: data.taxNumber,
        status: data.status || 'active',
        paymentTerms: data.paymentTerms || 'Net 30',
        creditLimit: data.creditLimit || '0',
        balance: '0',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [newSupplier] = await this.databaseService.drizzleClient
        .insert(suppliers)
        .values(supplierData)
        .returning();

      return { success: true, data: newSupplier };
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw new Error(`Supplier creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateSupplier(id: string, data: any) {
    try {
      const [updatedSupplier] = await this.databaseService.drizzleClient
        .update(suppliers)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(suppliers.id, id))
        .returning();

      if (!updatedSupplier) {
        throw new NotFoundException('Supplier not found');
      }

      return { success: true, data: updatedSupplier };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error updating supplier:', error);
      throw new Error(`Supplier update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteSupplier(id: string) {
    try {
      // Soft delete - set deletedAt timestamp
      const [deletedSupplier] = await this.databaseService.drizzleClient
        .update(suppliers)
        .set({
          deletedAt: new Date(),
          status: 'inactive',
          updatedAt: new Date(),
        })
        .where(eq(suppliers.id, id))
        .returning();

      if (!deletedSupplier) {
        throw new NotFoundException('Supplier not found');
      }

      return { success: true, message: 'Supplier deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error deleting supplier:', error);
      throw new Error(`Supplier deletion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateSupplierStatus(id: string, status: string) {
    try {
      const [updatedSupplier] = await this.databaseService.drizzleClient
        .update(suppliers)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(suppliers.id, id))
        .returning();

      if (!updatedSupplier) {
        throw new NotFoundException('Supplier not found');
      }

      return { success: true, data: updatedSupplier };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error updating supplier status:', error);
      throw new Error(`Supplier status update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
