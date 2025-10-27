import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface Migration {
  id: string;
  name: string;
  description: string;
  file: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
  executedAt?: Date;
  executionTime?: number;
  error?: string;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MigrationFile {
  version: string;
  description: string;
  up: string;
  down: string;
  dependencies?: string[];
  tenantId?: string;
}

interface MigrationResult {
  success: boolean;
  executionId?: string;
  error?: string;
  warnings?: string[];
}

@Injectable()
export class DrizzleMigrationsService {
  private readonly logger = new Logger(DrizzleMigrationsService.name);

  private readonly migrationFiles: MigrationFile[] = [
    {
      version: '001_initial_schema',
      description: 'Initial database schema creation',
      up: `
        -- Create tenants table
        CREATE TABLE IF NOT EXISTS tenants (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          domain VARCHAR(255) UNIQUE NOT NULL,
          subdomain VARCHAR(255) UNIQUE,
          status VARCHAR(50) DEFAULT 'active',
          plan VARCHAR(50) DEFAULT 'free',
          features JSONB DEFAULT '[]',
          limits JSONB DEFAULT '{}',
          settings JSONB DEFAULT '{}',
          subscription JSONB DEFAULT '{}',
          created_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create tenant_users table
        CREATE TABLE IF NOT EXISTS tenant_users (
          id VARCHAR(255) PRIMARY KEY,
          tenant_id VARCHAR(255) REFERENCES tenants(id),
          user_id VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'viewer',
          permissions JSONB DEFAULT '[]',
          departments JSONB DEFAULT '[]',
          status VARCHAR(50) DEFAULT 'active',
          invited_by VARCHAR(255),
          invited_at TIMESTAMP,
          joined_at TIMESTAMP,
          last_login_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create tenant_configurations table
        CREATE TABLE IF NOT EXISTS tenant_configurations (
          id VARCHAR(255) PRIMARY KEY,
          tenant_id VARCHAR(255) REFERENCES tenants(id),
          category VARCHAR(100) NOT NULL,
          key VARCHAR(255) NOT NULL,
          value TEXT,
          type VARCHAR(50) DEFAULT 'string',
          sensitive BOOLEAN DEFAULT false,
          description TEXT,
          validation JSONB DEFAULT '{}',
          created_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tenant_id, key)
        );

        -- Create tenant_databases table
        CREATE TABLE IF NOT EXISTS tenant_databases (
          id VARCHAR(255) PRIMARY KEY,
          tenant_id VARCHAR(255) REFERENCES tenants(id),
          database_name VARCHAR(255) NOT NULL,
          schema_name VARCHAR(255) NOT NULL,
          connection_string TEXT NOT NULL,
          status VARCHAR(50) DEFAULT 'active',
          size INTEGER DEFAULT 0,
          last_backup_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create tenant_activity_log table
        CREATE TABLE IF NOT EXISTS tenant_activity_log (
          id VARCHAR(255) PRIMARY KEY,
          tenant_id VARCHAR(255) REFERENCES tenants(id),
          action VARCHAR(100) NOT NULL,
          description TEXT,
          performed_by VARCHAR(255),
          metadata JSONB DEFAULT '{}',
          performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);
        CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
        CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id);
        CREATE INDEX IF NOT EXISTS idx_tenant_configurations_tenant ON tenant_configurations(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_tenant_databases_tenant ON tenant_databases(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_tenant_activity_tenant ON tenant_activity_log(tenant_id);
      `,
      down: `
        DROP TABLE IF EXISTS tenant_activity_log;
        DROP TABLE IF EXISTS tenant_databases;
        DROP TABLE IF EXISTS tenant_configurations;
        DROP TABLE IF EXISTS tenant_users;
        DROP TABLE IF EXISTS tenants;
      `
    },
    {
      version: '002_add_integration_tables',
      description: 'Add integration-related tables',
      dependencies: ['001_initial_schema'],
      up: `
        -- Create integration_instances table
        CREATE TABLE IF NOT EXISTS integration_instances (
          id VARCHAR(255) PRIMARY KEY,
          integration_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          config JSONB DEFAULT '{}',
          credentials JSONB DEFAULT '{}',
          status VARCHAR(50) DEFAULT 'active',
          last_sync TIMESTAMP,
          error_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create webhook_endpoints table
        CREATE TABLE IF NOT EXISTS webhook_endpoints (
          id VARCHAR(255) PRIMARY KEY,
          integration_id VARCHAR(255) NOT NULL,
          url TEXT NOT NULL,
          events JSONB DEFAULT '[]',
          secret VARCHAR(255),
          status VARCHAR(50) DEFAULT 'active',
          retry_policy JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create webhook_events table
        CREATE TABLE IF NOT EXISTS webhook_events (
          id VARCHAR(255) PRIMARY KEY,
          endpoint_id VARCHAR(255) REFERENCES webhook_endpoints(id),
          event VARCHAR(255) NOT NULL,
          payload JSONB DEFAULT '{}',
          status VARCHAR(50) DEFAULT 'pending',
          attempts INTEGER DEFAULT 0,
          last_attempt TIMESTAMP,
          next_retry TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_integration_instances_integration ON integration_instances(integration_id);
        CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_integration ON webhook_endpoints(integration_id);
        CREATE INDEX IF NOT EXISTS idx_webhook_events_endpoint ON webhook_events(endpoint_id);
        CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
      `,
      down: `
        DROP TABLE IF EXISTS webhook_events;
        DROP TABLE IF EXISTS webhook_endpoints;
        DROP TABLE IF EXISTS integration_instances;
      `
    },
    {
      version: '003_add_notification_tables',
      description: 'Add notification and messaging tables',
      dependencies: ['002_add_integration_tables'],
      up: `
        -- Create websocket_connections table
        CREATE TABLE IF NOT EXISTS websocket_connections (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255),
          tenant_id VARCHAR(255),
          role VARCHAR(100),
          socket_id VARCHAR(255) NOT NULL,
          connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_ping TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          subscriptions JSONB DEFAULT '[]'
        );

        -- Create websocket_notifications table
        CREATE TABLE IF NOT EXISTS websocket_notifications (
          id VARCHAR(255) PRIMARY KEY,
          type VARCHAR(100) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          data JSONB DEFAULT '{}',
          priority VARCHAR(50) DEFAULT 'medium',
          recipient_type VARCHAR(50) DEFAULT 'user',
          recipients JSONB DEFAULT '[]',
          read BOOLEAN DEFAULT false,
          read_at TIMESTAMP,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create notification_subscriptions table
        CREATE TABLE IF NOT EXISTS notification_subscriptions (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255),
          tenant_id VARCHAR(255),
          role VARCHAR(100),
          event_types JSONB DEFAULT '[]',
          channels JSONB DEFAULT '[]',
          filters JSONB DEFAULT '{}',
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_websocket_connections_user ON websocket_connections(user_id);
        CREATE INDEX IF NOT EXISTS idx_websocket_connections_tenant ON websocket_connections(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_websocket_notifications_type ON websocket_notifications(type);
        CREATE INDEX IF NOT EXISTS idx_websocket_notifications_read ON websocket_notifications(read);
        CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user ON notification_subscriptions(user_id);
        CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_tenant ON notification_subscriptions(tenant_id);
      `,
      down: `
        DROP TABLE IF EXISTS notification_subscriptions;
        DROP TABLE IF EXISTS websocket_notifications;
        DROP TABLE IF EXISTS websocket_connections;
      `
    },
    {
      version: '004_add_live_chat_tables',
      description: 'Add live chat system tables',
      dependencies: ['003_add_notification_tables'],
      up: `
        -- Create chat_agents table
        CREATE TABLE IF NOT EXISTS chat_agents (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          role VARCHAR(100) DEFAULT 'agent',
          department VARCHAR(100) DEFAULT 'general',
          status VARCHAR(50) DEFAULT 'offline',
          max_concurrent_chats INTEGER DEFAULT 5,
          current_chats INTEGER DEFAULT 0,
          skills JSONB DEFAULT '[]',
          languages JSONB DEFAULT '["tr"]',
          tenant_id VARCHAR(255),
          last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create live_chat_conversations table
        CREATE TABLE IF NOT EXISTS live_chat_conversations (
          id VARCHAR(255) PRIMARY KEY,
          customer_id VARCHAR(255),
          customer_name VARCHAR(255),
          customer_email VARCHAR(255),
          customer_phone VARCHAR(50),
          agent_id VARCHAR(255) REFERENCES chat_agents(id),
          agent_name VARCHAR(255),
          department VARCHAR(100) DEFAULT 'general',
          priority VARCHAR(50) DEFAULT 'medium',
          status VARCHAR(50) DEFAULT 'waiting',
          subject VARCHAR(500),
          tags JSONB DEFAULT '[]',
          source VARCHAR(100) DEFAULT 'website',
          channel VARCHAR(100) DEFAULT 'web',
          tenant_id VARCHAR(255),
          metadata JSONB DEFAULT '{}',
          messages INTEGER DEFAULT 0,
          unread_count INTEGER DEFAULT 0,
          last_message_at TIMESTAMP,
          last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          assigned_at TIMESTAMP,
          resolved_at TIMESTAMP,
          closed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create live_chat_messages table
        CREATE TABLE IF NOT EXISTS live_chat_messages (
          id VARCHAR(255) PRIMARY KEY,
          conversation_id VARCHAR(255) REFERENCES live_chat_conversations(id),
          sender_id VARCHAR(255),
          sender_type VARCHAR(50) DEFAULT 'customer',
          sender_name VARCHAR(255),
          message TEXT NOT NULL,
          message_type VARCHAR(50) DEFAULT 'text',
          attachments JSONB DEFAULT '[]',
          metadata JSONB DEFAULT '{}',
          read BOOLEAN DEFAULT false,
          read_at TIMESTAMP,
          edited BOOLEAN DEFAULT false,
          edited_at TIMESTAMP,
          deleted BOOLEAN DEFAULT false,
          deleted_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create chat_queues table
        CREATE TABLE IF NOT EXISTS chat_queues (
          id VARCHAR(255) PRIMARY KEY,
          conversation_id VARCHAR(255) REFERENCES live_chat_conversations(id),
          priority INTEGER DEFAULT 50,
          department VARCHAR(100) DEFAULT 'general',
          skills JSONB DEFAULT '[]',
          languages JSONB DEFAULT '["tr"]',
          assigned_at TIMESTAMP,
          estimated_wait_time INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create chat_departments table
        CREATE TABLE IF NOT EXISTS chat_departments (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          agents JSONB DEFAULT '[]',
          max_wait_time INTEGER DEFAULT 300,
          operating_hours JSONB DEFAULT '{}',
          auto_assignment BOOLEAN DEFAULT true,
          skills JSONB DEFAULT '[]',
          languages JSONB DEFAULT '["tr"]',
          tenant_id VARCHAR(255),
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_chat_agents_department ON chat_agents(department);
        CREATE INDEX IF NOT EXISTS idx_chat_agents_status ON chat_agents(status);
        CREATE INDEX IF NOT EXISTS idx_live_chat_conversations_department ON live_chat_conversations(department);
        CREATE INDEX IF NOT EXISTS idx_live_chat_conversations_status ON live_chat_conversations(status);
        CREATE INDEX IF NOT EXISTS idx_live_chat_conversations_customer ON live_chat_conversations(customer_email);
        CREATE INDEX IF NOT EXISTS idx_live_chat_messages_conversation ON live_chat_messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_chat_queues_department ON chat_queues(department);
        CREATE INDEX IF NOT EXISTS idx_chat_queues_priority ON chat_queues(priority);
      `,
      down: `
        DROP TABLE IF EXISTS chat_departments;
        DROP TABLE IF EXISTS chat_queues;
        DROP TABLE IF EXISTS live_chat_messages;
        DROP TABLE IF EXISTS live_chat_conversations;
        DROP TABLE IF EXISTS chat_agents;
      `
    },
    {
      version: '005_add_analytics_tables',
      description: 'Add analytics and reporting tables',
      dependencies: ['004_add_live_chat_tables'],
      up: `
        -- Create analytics_events table
        CREATE TABLE IF NOT EXISTS analytics_events (
          id VARCHAR(255) PRIMARY KEY,
          type VARCHAR(100) NOT NULL,
          session_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255),
          tenant_id VARCHAR(255),
          data JSONB DEFAULT '{}',
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_agent TEXT,
          ip_address INET,
          referrer TEXT,
          url TEXT
        );

        -- Create realtime_metrics table
        CREATE TABLE IF NOT EXISTS realtime_metrics (
          id VARCHAR(255) PRIMARY KEY,
          metric VARCHAR(255) NOT NULL,
          value DECIMAL(15,2) NOT NULL,
          previous_value DECIMAL(15,2),
          change DECIMAL(15,2),
          change_percent DECIMAL(10,2),
          period VARCHAR(10) NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          tenant_id VARCHAR(255),
          metadata JSONB DEFAULT '{}'
        );

        -- Create kpi_metrics table
        CREATE TABLE IF NOT EXISTS kpi_metrics (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100) NOT NULL,
          calculation JSONB NOT NULL,
          target DECIMAL(15,2),
          target_direction VARCHAR(20) DEFAULT 'higher',
          unit VARCHAR(50) NOT NULL,
          visualization JSONB DEFAULT '{}',
          refresh_interval INTEGER DEFAULT 300,
          status VARCHAR(50) DEFAULT 'active',
          created_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          tenant_id VARCHAR(255)
        );

        -- Create kpi_values table
        CREATE TABLE IF NOT EXISTS kpi_values (
          id VARCHAR(255) PRIMARY KEY,
          kpi_id VARCHAR(255) REFERENCES kpi_metrics(id),
          value DECIMAL(15,2) NOT NULL,
          previous_value DECIMAL(15,2),
          change DECIMAL(15,2),
          change_percent DECIMAL(10,2),
          target DECIMAL(15,2),
          target_achievement DECIMAL(10,2),
          trend VARCHAR(20) DEFAULT 'stable',
          status VARCHAR(50) DEFAULT 'good',
          calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          period VARCHAR(10) NOT NULL,
          tenant_id VARCHAR(255)
        );

        -- Create trend_analysis table
        CREATE TABLE IF NOT EXISTS trend_analysis (
          id VARCHAR(255) PRIMARY KEY,
          kpi_id VARCHAR(255) REFERENCES kpi_metrics(id),
          metric VARCHAR(255) NOT NULL,
          period VARCHAR(20) NOT NULL,
          data_points JSONB DEFAULT '[]',
          trend JSONB DEFAULT '{}',
          insights JSONB DEFAULT '[]',
          generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          tenant_id VARCHAR(255)
        );

        -- Create alert_rules table
        CREATE TABLE IF NOT EXISTS alert_rules (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          kpi_id VARCHAR(255) REFERENCES kpi_metrics(id),
          condition JSONB NOT NULL,
          severity VARCHAR(50) DEFAULT 'warning',
          notification_channels JSONB DEFAULT '[]',
          notification_recipients JSONB DEFAULT '[]',
          cooldown INTEGER DEFAULT 60,
          active BOOLEAN DEFAULT true,
          created_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          tenant_id VARCHAR(255)
        );

        -- Create kpi_alerts table
        CREATE TABLE IF NOT EXISTS kpi_alerts (
          id VARCHAR(255) PRIMARY KEY,
          type VARCHAR(100) NOT NULL,
          kpi_id VARCHAR(255) REFERENCES kpi_metrics(id),
          metric VARCHAR(255) NOT NULL,
          severity VARCHAR(50) DEFAULT 'warning',
          message TEXT NOT NULL,
          data JSONB DEFAULT '{}',
          acknowledged BOOLEAN DEFAULT false,
          acknowledged_by VARCHAR(255),
          acknowledged_at TIMESTAMP,
          resolved BOOLEAN DEFAULT false,
          resolved_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          tenant_id VARCHAR(255)
        );

        -- Create business_insights table
        CREATE TABLE IF NOT EXISTS business_insights (
          id VARCHAR(255) PRIMARY KEY,
          type VARCHAR(100) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          severity VARCHAR(50) DEFAULT 'info',
          kpi_ids JSONB DEFAULT '[]',
          data JSONB DEFAULT '{}',
          actionable BOOLEAN DEFAULT false,
          recommendations JSONB DEFAULT '[]',
          expires_at TIMESTAMP,
          acknowledged BOOLEAN DEFAULT false,
          acknowledged_by VARCHAR(255),
          acknowledged_at TIMESTAMP,
          generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          tenant_id VARCHAR(255)
        );

        -- Create custom_reports table
        CREATE TABLE IF NOT EXISTS custom_reports (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(100) NOT NULL,
          data_source VARCHAR(100) NOT NULL,
          configuration JSONB NOT NULL,
          schedule JSONB DEFAULT '{}',
          permissions JSONB DEFAULT '{}',
          status VARCHAR(50) DEFAULT 'active',
          created_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          tenant_id VARCHAR(255)
        );

        -- Create report_executions table
        CREATE TABLE IF NOT EXISTS report_executions (
          id VARCHAR(255) PRIMARY KEY,
          report_id VARCHAR(255) REFERENCES custom_reports(id),
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(50) DEFAULT 'running',
          data JSONB DEFAULT '{}',
          error TEXT,
          execution_time INTEGER DEFAULT 0,
          result_count INTEGER DEFAULT 0,
          triggered_by VARCHAR(255)
        );

        -- Create report_templates table
        CREATE TABLE IF NOT EXISTS report_templates (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          description TEXT,
          configuration JSONB DEFAULT '{}',
          thumbnail TEXT,
          tags JSONB DEFAULT '[]',
          public BOOLEAN DEFAULT false,
          created_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          usage_count INTEGER DEFAULT 0
        );

        -- Create report_dashboards table
        CREATE TABLE IF NOT EXISTS report_dashboards (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          layout JSONB DEFAULT '{}',
          filters JSONB DEFAULT '{}',
          permissions JSONB DEFAULT '{}',
          auto_refresh BOOLEAN DEFAULT true,
          refresh_interval INTEGER DEFAULT 300,
          theme JSONB DEFAULT '{}',
          created_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          tenant_id VARCHAR(255)
        );

        -- Create metric_subscriptions table
        CREATE TABLE IF NOT EXISTS metric_subscriptions (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255),
          tenant_id VARCHAR(255),
          role VARCHAR(100),
          metrics JSONB DEFAULT '[]',
          periods JSONB DEFAULT '[]',
          thresholds JSONB DEFAULT '{}',
          alerts BOOLEAN DEFAULT true,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(type);
        CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
        CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant ON analytics_events(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_realtime_metrics_metric ON realtime_metrics(metric);
        CREATE INDEX IF NOT EXISTS idx_realtime_metrics_period ON realtime_metrics(period);
        CREATE INDEX IF NOT EXISTS idx_realtime_metrics_timestamp ON realtime_metrics(timestamp);
        CREATE INDEX IF NOT EXISTS idx_kpi_metrics_category ON kpi_metrics(category);
        CREATE INDEX IF NOT EXISTS idx_kpi_metrics_status ON kpi_metrics(status);
        CREATE INDEX IF NOT EXISTS idx_kpi_values_kpi ON kpi_values(kpi_id);
        CREATE INDEX IF NOT EXISTS idx_kpi_values_period ON kpi_values(period);
        CREATE INDEX IF NOT EXISTS idx_trend_analysis_kpi ON trend_analysis(kpi_id);
        CREATE INDEX IF NOT EXISTS idx_alert_rules_kpi ON alert_rules(kpi_id);
        CREATE INDEX IF NOT EXISTS idx_kpi_alerts_kpi ON kpi_alerts(kpi_id);
        CREATE INDEX IF NOT EXISTS idx_business_insights_type ON business_insights(type);
        CREATE INDEX IF NOT EXISTS idx_custom_reports_type ON custom_reports(type);
        CREATE INDEX IF NOT EXISTS idx_report_executions_report ON report_executions(report_id);
        CREATE INDEX IF NOT EXISTS idx_report_templates_category ON report_templates(category);
        CREATE INDEX IF NOT EXISTS idx_report_dashboards_tenant ON report_dashboards(tenant_id);
      `,
      down: `
        DROP TABLE IF EXISTS metric_subscriptions;
        DROP TABLE IF EXISTS report_dashboards;
        DROP TABLE IF EXISTS report_templates;
        DROP TABLE IF EXISTS report_executions;
        DROP TABLE IF EXISTS custom_reports;
        DROP TABLE IF EXISTS business_insights;
        DROP TABLE IF EXISTS kpi_alerts;
        DROP TABLE IF EXISTS alert_rules;
        DROP TABLE IF EXISTS trend_analysis;
        DROP TABLE IF EXISTS kpi_values;
        DROP TABLE IF NOT EXISTS kpi_metrics;
        DROP TABLE IF NOT EXISTS realtime_metrics;
        DROP TABLE IF NOT EXISTS analytics_events;
      `
    },
    {
      version: '006_add_inventory_tables',
      description: 'Add inventory management tables',
      dependencies: ['005_add_analytics_tables'],
      up: `
        -- Create inventory_updates table
        CREATE TABLE IF NOT EXISTS inventory_updates (
          id VARCHAR(255) PRIMARY KEY,
          product_id VARCHAR(255) NOT NULL,
          sku VARCHAR(255) NOT NULL,
          warehouse_id VARCHAR(255),
          location VARCHAR(255),
          type VARCHAR(50) NOT NULL,
          previous_stock INTEGER NOT NULL,
          new_stock INTEGER NOT NULL,
          change_amount INTEGER NOT NULL,
          reason TEXT,
          reference_id VARCHAR(255),
          user_id VARCHAR(255),
          user_name VARCHAR(255),
          automatic BOOLEAN DEFAULT false,
          metadata JSONB DEFAULT '{}',
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          tenant_id VARCHAR(255)
        );

        -- Create stock_movements table
        CREATE TABLE IF NOT EXISTS stock_movements (
          id VARCHAR(255) PRIMARY KEY,
          product_id VARCHAR(255) NOT NULL,
          sku VARCHAR(255) NOT NULL,
          from_warehouse_id VARCHAR(255),
          to_warehouse_id VARCHAR(255),
          quantity INTEGER NOT NULL,
          unit_cost DECIMAL(10,2),
          total_cost DECIMAL(10,2),
          movement_type VARCHAR(50) NOT NULL,
          reference_type VARCHAR(100) NOT NULL,
          reference_id VARCHAR(255) NOT NULL,
          notes TEXT,
          user_id VARCHAR(255),
          user_name VARCHAR(255),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          tenant_id VARCHAR(255)
        );

        -- Create warehouse_inventory table
        CREATE TABLE IF NOT EXISTS warehouse_inventory (
          id VARCHAR(255) PRIMARY KEY,
          product_id VARCHAR(255) NOT NULL,
          warehouse_id VARCHAR(255) NOT NULL,
          sku VARCHAR(255) NOT NULL,
          stock INTEGER DEFAULT 0,
          reserved_stock INTEGER DEFAULT 0,
          available_stock INTEGER DEFAULT 0,
          min_stock INTEGER DEFAULT 0,
          max_stock INTEGER DEFAULT 0,
          location VARCHAR(255),
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          tenant_id VARCHAR(255),
          UNIQUE(product_id, warehouse_id)
        );

        -- Create inventory_alerts table
        CREATE TABLE IF NOT EXISTS inventory_alerts (
          id VARCHAR(255) PRIMARY KEY,
          type VARCHAR(100) NOT NULL,
          severity VARCHAR(50) DEFAULT 'warning',
          product_id VARCHAR(255) NOT NULL,
          sku VARCHAR(255) NOT NULL,
          warehouse_id VARCHAR(255),
          message TEXT NOT NULL,
          data JSONB DEFAULT '{}',
          acknowledged BOOLEAN DEFAULT false,
          acknowledged_by VARCHAR(255),
          acknowledged_at TIMESTAMP,
          resolved BOOLEAN DEFAULT false,
          resolved_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          tenant_id VARCHAR(255)
        );

        -- Create inventory_subscriptions table
        CREATE TABLE IF NOT EXISTS inventory_subscriptions (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255),
          tenant_id VARCHAR(255),
          role VARCHAR(100),
          product_ids JSONB DEFAULT '[]',
          categories JSONB DEFAULT '[]',
          warehouses JSONB DEFAULT '[]',
          alert_types JSONB DEFAULT '[]',
          stock_levels JSONB DEFAULT '{}',
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_inventory_updates_product ON inventory_updates(product_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_updates_sku ON inventory_updates(sku);
        CREATE INDEX IF NOT EXISTS idx_inventory_updates_type ON inventory_updates(type);
        CREATE INDEX IF NOT EXISTS idx_inventory_updates_timestamp ON inventory_updates(timestamp);
        CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
        CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON stock_movements(from_warehouse_id, to_warehouse_id);
        CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_product ON warehouse_inventory(product_id);
        CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_warehouse ON warehouse_inventory(warehouse_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_alerts_product ON inventory_alerts(product_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_alerts_type ON inventory_alerts(type);
        CREATE INDEX IF NOT EXISTS idx_inventory_alerts_acknowledged ON inventory_alerts(acknowledged);
        CREATE INDEX IF NOT EXISTS idx_inventory_subscriptions_user ON inventory_subscriptions(user_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_subscriptions_tenant ON inventory_subscriptions(tenant_id);
      `,
      down: `
        DROP TABLE IF EXISTS inventory_subscriptions;
        DROP TABLE IF EXISTS inventory_alerts;
        DROP TABLE IF EXISTS warehouse_inventory;
        DROP TABLE IF EXISTS stock_movements;
        DROP TABLE IF EXISTS inventory_updates;
      `
    },
    {
      version: '007_add_payment_tables',
      description: 'Add payment processing tables',
      dependencies: ['006_add_inventory_tables'],
      up: `
        -- Create payments table
        CREATE TABLE IF NOT EXISTS payments (
          id VARCHAR(255) PRIMARY KEY,
          payment_id VARCHAR(255) UNIQUE NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(10) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          provider VARCHAR(100) NOT NULL,
          provider_payment_id VARCHAR(255),
          provider_status VARCHAR(100),
          customer_email VARCHAR(255),
          customer_name VARCHAR(255),
          customer_phone VARCHAR(50),
          order_id VARCHAR(255),
          payment_method VARCHAR(100),
          installments INTEGER DEFAULT 1,
          error TEXT,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          tenant_id VARCHAR(255)
        );

        -- Create payment_webhooks table
        CREATE TABLE IF NOT EXISTS payment_webhooks (
          id VARCHAR(255) PRIMARY KEY,
          provider VARCHAR(100) NOT NULL,
          event_type VARCHAR(100) NOT NULL,
          payment_id VARCHAR(255) NOT NULL,
          data JSONB DEFAULT '{}',
          status VARCHAR(50) DEFAULT 'pending',
          processed_at TIMESTAMP,
          error TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create payment_refunds table
        CREATE TABLE IF NOT EXISTS payment_refunds (
          id VARCHAR(255) PRIMARY KEY,
          payment_id VARCHAR(255) REFERENCES payments(id),
          refund_id VARCHAR(255) UNIQUE NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(10) NOT NULL,
          reason TEXT,
          status VARCHAR(50) DEFAULT 'pending',
          provider_refund_id VARCHAR(255),
          requested_by VARCHAR(255),
          processed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          tenant_id VARCHAR(255)
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
        CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider);
        CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_email);
        CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
        CREATE INDEX IF NOT EXISTS idx_payment_webhooks_provider ON payment_webhooks(provider);
        CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status ON payment_webhooks(status);
        CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment ON payment_refunds(payment_id);
        CREATE INDEX IF NOT EXISTS idx_payment_refunds_status ON payment_refunds(status);
      `,
      down: `
        DROP TABLE IF EXISTS payment_refunds;
        DROP TABLE IF EXISTS payment_webhooks;
        DROP TABLE IF EXISTS payments;
      `
    },
    {
      version: '008_add_messaging_tables',
      description: 'Add SMS, Email and WhatsApp messaging tables',
      dependencies: ['007_add_payment_tables'],
      up: `
        -- Create sms_messages table
        CREATE TABLE IF NOT EXISTS sms_messages (
          id VARCHAR(255) PRIMARY KEY,
          to_phone VARCHAR(50) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'transactional',
          sender VARCHAR(100),
          status VARCHAR(50) DEFAULT 'sent',
          provider VARCHAR(100) NOT NULL,
          provider_message_id VARCHAR(255),
          cost DECIMAL(6,4),
          sent_at TIMESTAMP,
          delivered_at TIMESTAMP,
          error TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create email_messages table
        CREATE TABLE IF NOT EXISTS email_messages (
          id VARCHAR(255) PRIMARY KEY,
          to_addresses JSONB NOT NULL,
          cc_addresses JSONB DEFAULT '[]',
          bcc_addresses JSONB DEFAULT '[]',
          subject VARCHAR(500) NOT NULL,
          html_content TEXT,
          text_content TEXT,
          template_id VARCHAR(255),
          variables JSONB DEFAULT '{}',
          attachments JSONB DEFAULT '[]',
          type VARCHAR(50) DEFAULT 'transactional',
          status VARCHAR(50) DEFAULT 'sent',
          provider VARCHAR(100) NOT NULL,
          provider_message_id VARCHAR(255),
          sent_at TIMESTAMP,
          delivered_at TIMESTAMP,
          opened_at TIMESTAMP,
          clicked_at TIMESTAMP,
          scheduled_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create email_templates table
        CREATE TABLE IF NOT EXISTS email_templates (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          subject VARCHAR(500) NOT NULL,
          html_content TEXT NOT NULL,
          text_content TEXT,
          variables JSONB DEFAULT '[]',
          category VARCHAR(50) DEFAULT 'transactional',
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create email_campaigns table
        CREATE TABLE IF NOT EXISTS email_campaigns (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          template_id VARCHAR(255) REFERENCES email_templates(id),
          recipients JSONB NOT NULL,
          scheduled_at TIMESTAMP,
          status VARCHAR(50) DEFAULT 'draft',
          sent INTEGER DEFAULT 0,
          delivered INTEGER DEFAULT 0,
          bounced INTEGER DEFAULT 0,
          opened INTEGER DEFAULT 0,
          clicked INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create whatsapp_messages table
        CREATE TABLE IF NOT EXISTS whatsapp_messages (
          id VARCHAR(255) PRIMARY KEY,
          from_phone VARCHAR(50) NOT NULL,
          to_phone VARCHAR(50) NOT NULL,
          message JSONB NOT NULL,
          status VARCHAR(50) DEFAULT 'sent',
          provider VARCHAR(100) DEFAULT 'whatsapp',
          provider_message_id VARCHAR(255),
          sent_at TIMESTAMP,
          delivered_at TIMESTAMP,
          read_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create whatsapp_conversations table
        CREATE TABLE IF NOT EXISTS whatsapp_conversations (
          id VARCHAR(255) PRIMARY KEY,
          customer_phone VARCHAR(50) NOT NULL,
          customer_name VARCHAR(255),
          status VARCHAR(50) DEFAULT 'active',
          messages INTEGER DEFAULT 0,
          last_message_at TIMESTAMP,
          assigned_to VARCHAR(255),
          tags JSONB DEFAULT '[]',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create whatsapp_templates table
        CREATE TABLE IF NOT EXISTS whatsapp_templates (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          language VARCHAR(10) NOT NULL,
          category VARCHAR(50) NOT NULL,
          components JSONB NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create whatsapp_contacts table
        CREATE TABLE IF NOT EXISTS whatsapp_contacts (
          id VARCHAR(255) PRIMARY KEY,
          wa_id VARCHAR(50) UNIQUE NOT NULL,
          profile JSONB DEFAULT '{}',
          verified BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create otp_credentials table
        CREATE TABLE IF NOT EXISTS otp_credentials (
          id VARCHAR(255) PRIMARY KEY,
          phone VARCHAR(50) NOT NULL,
          otp VARCHAR(10) NOT NULL,
          purpose VARCHAR(100) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          attempts INTEGER DEFAULT 0,
          max_attempts INTEGER DEFAULT 3,
          verified BOOLEAN DEFAULT false,
          sms_message_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(phone, purpose)
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_sms_messages_phone ON sms_messages(to_phone);
        CREATE INDEX IF NOT EXISTS idx_sms_messages_type ON sms_messages(type);
        CREATE INDEX IF NOT EXISTS idx_sms_messages_status ON sms_messages(status);
        CREATE INDEX IF NOT EXISTS idx_email_messages_to ON email_messages USING GIN(to_addresses);
        CREATE INDEX IF NOT EXISTS idx_email_messages_status ON email_messages(status);
        CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
        CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
        CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(to_phone);
        CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
        CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON whatsapp_conversations(customer_phone);
        CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status ON whatsapp_conversations(status);
        CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_name ON whatsapp_templates(name);
        CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_wa_id ON whatsapp_contacts(wa_id);
        CREATE INDEX IF NOT EXISTS idx_otp_credentials_phone ON otp_credentials(phone);
        CREATE INDEX IF NOT EXISTS idx_otp_credentials_expires ON otp_credentials(expires_at);
      `,
      down: `
        DROP TABLE IF EXISTS otp_credentials;
        DROP TABLE IF EXISTS whatsapp_contacts;
        DROP TABLE IF EXISTS whatsapp_templates;
        DROP TABLE IF EXISTS whatsapp_conversations;
        DROP TABLE IF EXISTS whatsapp_messages;
        DROP TABLE IF EXISTS email_campaigns;
        DROP TABLE IF EXISTS email_templates;
        DROP TABLE IF EXISTS email_messages;
        DROP TABLE IF EXISTS sms_messages;
      `
    }
  ];

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async runMigrations(tenantId?: string): Promise<{
    success: boolean;
    executed: number;
    failed: number;
    errors?: string[];
    results?: MigrationResult[];
  }> {
    try {
      const results: MigrationResult[] = [];
      let executed = 0;
      let failed = 0;
      const errors: string[] = [];

      // Get pending migrations
      const pendingMigrations = await this.getPendingMigrations(tenantId);

      for (const migration of pendingMigrations) {
        try {
          const result = await this.executeMigration(migration, tenantId);

          if (result.success) {
            executed++;
            results.push(result);
          } else {
            failed++;
            errors.push(`Migration ${migration.name}: ${result.error}`);
          }
        } catch (error) {
          failed++;
          errors.push(`Migration ${migration.name}: ${error.message}`);
        }
      }

      this.logger.log(`Migration completed: ${executed} executed, ${failed} failed`);
      return {
        success: failed === 0,
        executed,
        failed,
        errors: errors.length > 0 ? errors : undefined,
        results
      };

    } catch (error) {
      this.logger.error('Failed to run migrations', error);
      return {
        success: false,
        executed: 0,
        failed: 0,
        errors: [error.message]
      };
    }
  }

  async rollbackMigration(version: string, tenantId?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const migration = await this.getMigrationByVersion(version, tenantId);

      if (!migration) {
        throw new Error('Migration not found');
      }

      if (migration.status !== 'completed') {
        throw new Error('Can only rollback completed migrations');
      }

      // Execute rollback
      await this.executeRollback(migration, tenantId);

      // Update migration status
      await this.updateMigrationStatus(migration.id, 'rolled_back', tenantId);

      this.logger.log(`Migration rolled back: ${version}`);
      return { success: true };

    } catch (error) {
      this.logger.error('Failed to rollback migration', error);
      return { success: false, error: error.message };
    }
  }

  async getMigrationStatus(tenantId?: string): Promise<{
    total: number;
    pending: number;
    completed: number;
    failed: number;
    migrations: Migration[];
  }> {
    try {
      const migrations = await this.getAllMigrations(tenantId);

      const stats = {
        total: migrations.length,
        pending: migrations.filter(m => m.status === 'pending').length,
        completed: migrations.filter(m => m.status === 'completed').length,
        failed: migrations.filter(m => m.status === 'failed').length,
        migrations
      };

      return stats;

    } catch (error) {
      this.logger.error('Failed to get migration status', error);
      return {
        total: 0,
        pending: 0,
        completed: 0,
        failed: 0,
        migrations: []
      };
    }
  }

  async createMigrationFile(migrationData: {
    name: string;
    description: string;
    up: string;
    down: string;
    dependencies?: string[];
    tenantId?: string;
  }): Promise<{
    success: boolean;
    migrationId?: string;
    error?: string;
  }> {
    try {
      const migrationId = `migration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const migration: Migration = {
        id: migrationId,
        name: migrationData.name,
        description: migrationData.description,
        file: migrationData.name,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId: migrationData.tenantId
      };

      await this.saveMigrationToDB(migration);

      this.logger.log(`Migration file created: ${migrationId}`);
      return { success: true, migrationId };

    } catch (error) {
      this.logger.error('Failed to create migration file', error);
      return { success: false, error: error.message };
    }
  }

  private async getPendingMigrations(tenantId?: string): Promise<Migration[]> {
    try {
      const result = await this.db.execute(`
        SELECT * FROM migrations
        WHERE status = 'pending' ${tenantId ? 'AND tenant_id = $1' : ''}
        ORDER BY created_at ASC
      `, tenantId ? [tenantId] : []);

      return result.rows.map(row => ({
        ...row,
        executedAt: row.executed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

    } catch (error) {
      this.logger.error('Failed to get pending migrations', error);
      return [];
    }
  }

  private async getAllMigrations(tenantId?: string): Promise<Migration[]> {
    try {
      const result = await this.db.execute(`
        SELECT * FROM migrations
        ${tenantId ? 'WHERE tenant_id = $1' : ''}
        ORDER BY created_at ASC
      `, tenantId ? [tenantId] : []);

      return result.rows.map(row => ({
        ...row,
        executedAt: row.executed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

    } catch (error) {
      this.logger.error('Failed to get all migrations', error);
      return [];
    }
  }

  private async getMigrationByVersion(version: string, tenantId?: string): Promise<Migration | null> {
    try {
      const result = await this.db.execute(`
        SELECT * FROM migrations
        WHERE file = $1 ${tenantId ? 'AND tenant_id = $2' : ''}
      `, tenantId ? [version, tenantId] : [version]);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        ...row,
        executedAt: row.executed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

    } catch (error) {
      this.logger.error('Failed to get migration by version', error);
      return null;
    }
  }

  private async executeMigration(migration: Migration, tenantId?: string): Promise<MigrationResult> {
    try {
      // Update status to running
      await this.updateMigrationStatus(migration.id, 'running', tenantId);

      const startTime = Date.now();

      // Execute migration SQL
      await this.db.execute(migration.up || '');

      const executionTime = Date.now() - startTime;

      // Update status to completed
      await this.updateMigrationStatus(migration.id, 'completed', tenantId, executionTime);

      return {
        success: true,
        executionId: migration.id
      };

    } catch (error) {
      await this.updateMigrationStatus(migration.id, 'failed', tenantId, 0, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async executeRollback(migration: Migration, tenantId?: string): Promise<void> {
    try {
      // Execute rollback SQL
      await this.db.execute(migration.down || '');
    } catch (error) {
      this.logger.error('Failed to execute rollback', error);
      throw error;
    }
  }

  private async updateMigrationStatus(
    migrationId: string,
    status: string,
    tenantId?: string,
    executionTime?: number,
    error?: string
  ): Promise<void> {
    await this.db.execute(`
      UPDATE migrations SET
        status = $1,
        executed_at = $2,
        execution_time = $3,
        error = $4,
        updated_at = $5
      WHERE id = $6 ${tenantId ? 'AND tenant_id = $7' : ''}
    `, [
      status,
      status === 'completed' || status === 'failed' ? new Date() : undefined,
      executionTime,
      error,
      new Date(),
      migrationId,
      ...(tenantId ? [tenantId] : [])
    ]);
  }

  private async saveMigrationToDB(migration: Migration): Promise<void> {
    await this.db.execute(`
      INSERT INTO migrations (id, name, description, file, status, tenant_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      migration.id,
      migration.name,
      migration.description,
      migration.file,
      migration.status,
      migration.tenantId,
      migration.createdAt,
      migration.updatedAt
    ]);
  }
}
