import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';
import { ResourceOwnershipGuard } from './resource-ownership.guard';

@Injectable()
export class CombinedAuthGuard extends JwtAuthGuard {
  constructor(
    reflector: Reflector,
    private rolesGuard: RolesGuard,
    private permissionsGuard: PermissionsGuard,
    private resourceOwnershipGuard: ResourceOwnershipGuard,
  ) {
    super(reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First, run JWT authentication
    const jwtResult = await super.canActivate(context);
    if (!jwtResult) {
      return false;
    }

    // Then check roles
    const rolesResult = this.rolesGuard.canActivate(context);
    if (!rolesResult) {
      return false;
    }

    // Then check permissions
    const permissionsResult = this.permissionsGuard.canActivate(context);
    if (!permissionsResult) {
      return false;
    }

    // Finally check resource ownership
    const ownershipResult = await this.resourceOwnershipGuard.canActivate(context);
    
    return ownershipResult;
  }
}
