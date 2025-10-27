import { SetMetadata } from '@nestjs/common';

export const RESOURCE_OWNERSHIP_KEY = 'resource_ownership';
export interface ResourceOwnershipOptions {
  resourceType: string;
  resourceIdParam?: string;
  ownerField?: string;
  allowOwnAccess?: boolean;
}

export const ResourceOwnership = (options: ResourceOwnershipOptions) => 
  SetMetadata(RESOURCE_OWNERSHIP_KEY, options);
