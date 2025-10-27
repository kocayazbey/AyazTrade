import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RESOURCE_OWNERSHIP_KEY, ResourceOwnershipOptions } from '../decorators/resource-ownership.decorator';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<ResourceOwnershipOptions>(RESOURCE_OWNERSHIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user, params } = request;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admin bypasses ownership check
    if (user.role === 'admin') {
      return true;
    }

    // Get resource ID from params
    const resourceId = params[options.resourceIdParam || 'id'];
    
    if (!resourceId) {
      throw new ForbiddenException('Resource ID not found');
    }

    try {
      // Fetch the resource from database
      const resource = await this.fetchResource(options.resourceType, resourceId);
      
      if (!resource) {
        throw new ForbiddenException('Resource not found');
      }

      // Check ownership
      const ownerField = options.ownerField || 'userId';
      const resourceOwnerId = resource[ownerField];

      if (!resourceOwnerId) {
        throw new ForbiddenException('Resource ownership not defined');
      }

      // Allow own access if configured
      if (options.allowOwnAccess && resourceOwnerId === user.id) {
        return true;
      }

      // Check if user owns the resource
      return resourceOwnerId === user.id;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('Failed to verify resource ownership');
    }
  }

  private async fetchResource(resourceType: string, resourceId: string): Promise<any> {
    // This is a mock implementation
    // In production, you'd fetch from the actual database
    const query = this.getResourceQuery(resourceType);
    
    try {
      const result = await this.databaseService.drizzleClient.execute(query, [resourceId]);
      return result.rows?.[0] || null;
    } catch (error) {
      return null;
    }
  }

  private getResourceQuery(resourceType: string): string {
    const queries: Record<string, string> = {
      order: 'SELECT * FROM orders WHERE id = $1',
      product: 'SELECT * FROM products WHERE id = $1',
      customer: 'SELECT * FROM customers WHERE id = $1',
      cart: 'SELECT * FROM carts WHERE id = $1',
      review: 'SELECT * FROM reviews WHERE id = $1',
    };

    return queries[resourceType] || `SELECT * FROM ${resourceType} WHERE id = $1`;
  }
}
