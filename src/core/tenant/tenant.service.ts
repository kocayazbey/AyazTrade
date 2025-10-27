import { Injectable } from '@nestjs/common';

@Injectable()
export class TenantService {
  private tenantId: string;

  setTenantId(tenantId: string) {
    this.tenantId = tenantId;
  }

  getTenantId(): string {
    return this.tenantId;
  }
}

