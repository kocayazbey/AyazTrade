import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ANY_KEY = 'require_any';
export interface RequireAnyOptions {
  roles?: string[];
  permissions?: string[];
}

export const RequireAny = (options: RequireAnyOptions) => SetMetadata(REQUIRE_ANY_KEY, options);
