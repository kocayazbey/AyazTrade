import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { dashboards } from '../../../../database/schema/shared/analytics.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createDashboard(data: any, tenantId: string) {
    const [dashboard] = await this.db
      .insert(dashboards)
      .values({
        tenantId,
        ...data,
      })
      .returning();

    await this.eventBus.emit('dashboard.created', { dashboardId: dashboard.id, tenantId });
    return dashboard;
  }

  async getDashboards(tenantId: string) {
    return await this.db
      .select()
      .from(dashboards)
      .where(eq(dashboards.tenantId, tenantId));
  }

  async getDashboardData(dashboardId: string, tenantId: string) {
    const [dashboard] = await this.db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, dashboardId))
      .limit(1);

    const widgets = dashboard.widgets as any[] || [];
    const widgetData = await Promise.all(
      widgets.map(async (widget: any) => {
        const data = await this.fetchWidgetData(widget, tenantId);
        return {
          ...widget,
          data,
        };
      })
    );

    return {
      dashboard,
      widgets: widgetData,
    };
  }

  private async fetchWidgetData(widget: any, tenantId: string) {
    switch (widget.type) {
      case 'kpi':
        return { value: 0, target: 0, achievement: 0 };
      case 'chart':
        return { labels: [], data: [] };
      case 'table':
        return { headers: [], rows: [] };
      default:
        return {};
    }
  }
}

