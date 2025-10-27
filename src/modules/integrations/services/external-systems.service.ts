import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface ExternalSystem {
  id: string;
  name: string;
  type: 'erp' | 'crm' | 'accounting' | 'payment' | 'shipping' | 'inventory' | 'marketing';
  provider: string;
  version: string;
  endpoint: string;
  authentication: {
    type: 'api_key' | 'oauth2' | 'basic' | 'certificate';
    config: Record<string, any>;
  };
  capabilities: string[];
  status: 'active' | 'inactive' | 'maintenance';
  lastSync: Date;
  syncFrequency: number; // minutes
  createdAt: Date;
  updatedAt: Date;
}

interface SystemConnection {
  id: string;
  systemId: string;
  name: string;
  credentials: Record<string, any>;
  config: Record<string, any>;
  status: 'connected' | 'disconnected' | 'error';
  lastSync: Date;
  errorCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DataMapping {
  id: string;
  systemId: string;
  sourceField: string;
  targetField: string;
  transformation: {
    type: 'direct' | 'format' | 'calculate' | 'lookup';
    config: Record<string, any>;
  };
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SyncJob {
  id: string;
  systemId: string;
  direction: 'import' | 'export' | 'bidirectional';
  entity: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  recordsProcessed: number;
  recordsFailed: number;
  error?: string;
  createdAt: Date;
}

interface SyncConflict {
  id: string;
  systemId: string;
  entity: string;
  entityId: string;
  conflictType: 'duplicate' | 'mismatch' | 'missing';
  sourceData: any;
  targetData: any;
  resolution: 'source_wins' | 'target_wins' | 'merge' | 'manual';
  status: 'pending' | 'resolved' | 'ignored';
  createdAt: Date;
  resolvedAt?: Date;
}

@Injectable()
export class ExternalSystemsService {
  private readonly logger = new Logger(ExternalSystemsService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async getAvailableSystems(type?: string): Promise<ExternalSystem[]> {
    const result = await this.db.execute(`
      SELECT * FROM external_systems
      ${type ? 'WHERE type = $1' : ''}
      AND status = 'active'
      ORDER BY name
    `, type ? [type] : []);
    
    return result.rows.map(row => ({
      ...row,
      authentication: JSON.parse(row.authentication || '{}'),
      capabilities: JSON.parse(row.capabilities || '[]')
    }));
  }

  async getSystem(systemId: string): Promise<ExternalSystem> {
    const result = await this.db.execute(`
      SELECT * FROM external_systems WHERE id = $1
    `, [systemId]);
    
    if (result.rows.length === 0) {
      throw new Error(`External system not found: ${systemId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      authentication: JSON.parse(row.authentication || '{}'),
      capabilities: JSON.parse(row.capabilities || '[]')
    };
  }

  async createSystemConnection(connection: Omit<SystemConnection, 'id' | 'createdAt' | 'updatedAt' | 'errorCount'>): Promise<SystemConnection> {
    const connectionId = `connection-${Date.now()}`;
    
    const newConnection: SystemConnection = {
      id: connectionId,
      ...connection,
      errorCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveSystemConnection(newConnection);
    
    this.logger.log(`Created system connection: ${connectionId}`);
    return newConnection;
  }

  async getSystemConnections(systemId?: string): Promise<SystemConnection[]> {
    const result = await this.db.execute(`
      SELECT * FROM system_connections
      ${systemId ? 'WHERE system_id = $1' : ''}
      ORDER BY created_at DESC
    `, systemId ? [systemId] : []);
    
    return result.rows.map(row => ({
      ...row,
      credentials: JSON.parse(row.credentials || '{}'),
      config: JSON.parse(row.config || '{}')
    }));
  }

  async testSystemConnection(connectionId: string): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
  }> {
    const connection = await this.getSystemConnection(connectionId);
    const system = await this.getSystem(connection.systemId);
    
    const startTime = Date.now();
    
    try {
      const response = await this.makeSystemCall(system, connection, 'GET', '/health');
      const responseTime = Date.now() - startTime;
      
      // Update connection status
      connection.status = 'connected';
      connection.lastSync = new Date();
      await this.updateSystemConnection(connection);
      
      return {
        success: true,
        responseTime
      };
    } catch (error) {
      connection.status = 'error';
      connection.errorCount++;
      await this.updateSystemConnection(connection);
      
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  async createDataMapping(mapping: Omit<DataMapping, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataMapping> {
    const mappingId = `mapping-${Date.now()}`;
    
    const newMapping: DataMapping = {
      id: mappingId,
      ...mapping,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveDataMapping(newMapping);
    
    this.logger.log(`Created data mapping: ${mappingId}`);
    return newMapping;
  }

  async getDataMappings(systemId: string): Promise<DataMapping[]> {
    const result = await this.db.execute(`
      SELECT * FROM data_mappings
      WHERE system_id = $1
      ORDER BY source_field
    `, [systemId]);
    
    return result.rows.map(row => ({
      ...row,
      transformation: JSON.parse(row.transformation || '{}')
    }));
  }

  async startSyncJob(systemId: string, direction: 'import' | 'export' | 'bidirectional', entity: string): Promise<SyncJob> {
    const jobId = `sync-${Date.now()}`;
    
    const syncJob: SyncJob = {
      id: jobId,
      systemId,
      direction,
      entity,
      status: 'pending',
      startedAt: new Date(),
      recordsProcessed: 0,
      recordsFailed: 0,
      createdAt: new Date()
    };
    
    await this.saveSyncJob(syncJob);
    
    // Start sync process
    this.processSyncJob(syncJob);
    
    this.logger.log(`Started sync job: ${jobId}`);
    return syncJob;
  }

  async getSyncJobs(systemId?: string, status?: string): Promise<SyncJob[]> {
    let query = 'SELECT * FROM sync_jobs';
    const params = [];
    
    if (systemId) {
      query += ' WHERE system_id = $1';
      params.push(systemId);
    }
    
    if (status) {
      query += systemId ? ' AND status = $2' : ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.db.execute(query, params);
    return result.rows;
  }

  async getSyncConflicts(systemId?: string, status?: string): Promise<SyncConflict[]> {
    let query = 'SELECT * FROM sync_conflicts';
    const params = [];
    
    if (systemId) {
      query += ' WHERE system_id = $1';
      params.push(systemId);
    }
    
    if (status) {
      query += systemId ? ' AND status = $2' : ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      sourceData: JSON.parse(row.source_data || '{}'),
      targetData: JSON.parse(row.target_data || '{}')
    }));
  }

  async resolveSyncConflict(conflictId: string, resolution: 'source_wins' | 'target_wins' | 'merge' | 'manual'): Promise<void> {
    const conflict = await this.getSyncConflict(conflictId);
    
    conflict.resolution = resolution;
    conflict.status = 'resolved';
    conflict.resolvedAt = new Date();
    
    await this.updateSyncConflict(conflict);
    
    // Apply resolution
    await this.applyConflictResolution(conflict);
    
    this.logger.log(`Resolved sync conflict: ${conflictId} with resolution: ${resolution}`);
  }

  async getSystemAnalytics(systemId?: string): Promise<{
    totalConnections: number;
    activeConnections: number;
    totalSyncJobs: number;
    successfulSyncJobs: number;
    failedSyncJobs: number;
    averageSyncTime: number;
    totalConflicts: number;
    resolvedConflicts: number;
  }> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(DISTINCT sc.id) as total_connections,
        SUM(CASE WHEN sc.status = 'connected' THEN 1 ELSE 0 END) as active_connections,
        COUNT(sj.id) as total_sync_jobs,
        SUM(CASE WHEN sj.status = 'completed' THEN 1 ELSE 0 END) as successful_sync_jobs,
        SUM(CASE WHEN sj.status = 'failed' THEN 1 ELSE 0 END) as failed_sync_jobs,
        AVG(EXTRACT(EPOCH FROM (sj.completed_at - sj.started_at))) as avg_sync_time,
        COUNT(sc_conf.id) as total_conflicts,
        SUM(CASE WHEN sc_conf.status = 'resolved' THEN 1 ELSE 0 END) as resolved_conflicts
      FROM system_connections sc
      LEFT JOIN sync_jobs sj ON sc.system_id = sj.system_id
      LEFT JOIN sync_conflicts sc_conf ON sc.system_id = sc_conf.system_id
      ${systemId ? 'WHERE sc.system_id = $1' : ''}
    `, systemId ? [systemId] : []);
    
    const stats = result.rows[0];
    
    return {
      totalConnections: parseInt(stats.total_connections) || 0,
      activeConnections: parseInt(stats.active_connections) || 0,
      totalSyncJobs: parseInt(stats.total_sync_jobs) || 0,
      successfulSyncJobs: parseInt(stats.successful_sync_jobs) || 0,
      failedSyncJobs: parseInt(stats.failed_sync_jobs) || 0,
      averageSyncTime: parseFloat(stats.avg_sync_time) || 0,
      totalConflicts: parseInt(stats.total_conflicts) || 0,
      resolvedConflicts: parseInt(stats.resolved_conflicts) || 0
    };
  }

  private async getSystemConnection(connectionId: string): Promise<SystemConnection> {
    const result = await this.db.execute(`
      SELECT * FROM system_connections WHERE id = $1
    `, [connectionId]);
    
    if (result.rows.length === 0) {
      throw new Error(`System connection not found: ${connectionId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      credentials: JSON.parse(row.credentials || '{}'),
      config: JSON.parse(row.config || '{}')
    };
  }

  private async saveSystemConnection(connection: SystemConnection): Promise<void> {
    await this.db.execute(`
      INSERT INTO system_connections (id, system_id, name, credentials, config, status, last_sync, error_count, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      connection.id,
      connection.systemId,
      connection.name,
      JSON.stringify(connection.credentials),
      JSON.stringify(connection.config),
      connection.status,
      connection.lastSync,
      connection.errorCount,
      connection.createdAt,
      connection.updatedAt
    ]);
  }

  private async updateSystemConnection(connection: SystemConnection): Promise<void> {
    await this.db.execute(`
      UPDATE system_connections SET
        status = $2,
        last_sync = $3,
        error_count = $4,
        updated_at = $5
      WHERE id = $1
    `, [
      connection.id,
      connection.status,
      connection.lastSync,
      connection.errorCount,
      connection.updatedAt
    ]);
  }

  private async makeSystemCall(system: ExternalSystem, connection: SystemConnection, method: string, path: string, data?: any): Promise<any> {
    const url = `${system.endpoint}${path}`;
    const headers = this.buildSystemHeaders(system, connection);
    
    // Mock system call - in real implementation, use axios or similar
    this.logger.log(`Making system call: ${method} ${url}`);
    
    // Simulate system response
    return {
      success: true,
      data: { message: 'System call successful' },
      statusCode: 200
    };
  }

  private buildSystemHeaders(system: ExternalSystem, connection: SystemConnection): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AyazTrade-Integration/1.0'
    };
    
    switch (system.authentication.type) {
      case 'api_key':
        headers['X-API-Key'] = connection.credentials.apiKey;
        break;
      case 'oauth2':
        headers['Authorization'] = `Bearer ${connection.credentials.accessToken}`;
        break;
      case 'basic':
        const credentials = Buffer.from(`${connection.credentials.username}:${connection.credentials.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      case 'certificate':
        // Handle certificate authentication
        break;
    }
    
    return headers;
  }

  private async saveDataMapping(mapping: DataMapping): Promise<void> {
    await this.db.execute(`
      INSERT INTO data_mappings (id, system_id, source_field, target_field, transformation, is_required, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      mapping.id,
      mapping.systemId,
      mapping.sourceField,
      mapping.targetField,
      JSON.stringify(mapping.transformation),
      mapping.isRequired,
      mapping.createdAt,
      mapping.updatedAt
    ]);
  }

  private async saveSyncJob(job: SyncJob): Promise<void> {
    await this.db.execute(`
      INSERT INTO sync_jobs (id, system_id, direction, entity, status, started_at, completed_at, records_processed, records_failed, error, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      job.id,
      job.systemId,
      job.direction,
      job.entity,
      job.status,
      job.startedAt,
      job.completedAt,
      job.recordsProcessed,
      job.recordsFailed,
      job.error,
      job.createdAt
    ]);
  }

  private async updateSyncJob(job: SyncJob): Promise<void> {
    await this.db.execute(`
      UPDATE sync_jobs SET
        status = $2,
        completed_at = $3,
        records_processed = $4,
        records_failed = $5,
        error = $6
      WHERE id = $1
    `, [
      job.id,
      job.status,
      job.completedAt,
      job.recordsProcessed,
      job.recordsFailed,
      job.error
    ]);
  }

  private async processSyncJob(job: SyncJob): Promise<void> {
    try {
      job.status = 'running';
      await this.updateSyncJob(job);
      
      // Mock sync process
      await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate sync time
      
      job.status = 'completed';
      job.completedAt = new Date();
      job.recordsProcessed = 100;
      job.recordsFailed = 0;
      
      await this.updateSyncJob(job);
      
      this.logger.log(`Sync job completed: ${job.id}`);
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.error = error.message;
      
      await this.updateSyncJob(job);
      
      this.logger.error(`Sync job failed: ${job.id}`, error);
    }
  }

  private async getSyncConflict(conflictId: string): Promise<SyncConflict> {
    const result = await this.db.execute(`
      SELECT * FROM sync_conflicts WHERE id = $1
    `, [conflictId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Sync conflict not found: ${conflictId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      sourceData: JSON.parse(row.source_data || '{}'),
      targetData: JSON.parse(row.target_data || '{}')
    };
  }

  private async updateSyncConflict(conflict: SyncConflict): Promise<void> {
    await this.db.execute(`
      UPDATE sync_conflicts SET
        resolution = $2,
        status = $3,
        resolved_at = $4
      WHERE id = $1
    `, [
      conflict.id,
      conflict.resolution,
      conflict.status,
      conflict.resolvedAt
    ]);
  }

  private async applyConflictResolution(conflict: SyncConflict): Promise<void> {
    this.logger.log(`Applying conflict resolution for ${conflict.id}: ${conflict.resolution}`);
    
    // Mock conflict resolution - in real implementation, this would apply the actual resolution
    switch (conflict.resolution) {
      case 'source_wins':
        // Use source data
        break;
      case 'target_wins':
        // Use target data
        break;
      case 'merge':
        // Merge both datasets
        break;
      case 'manual':
        // Require manual intervention
        break;
    }
  }
}
