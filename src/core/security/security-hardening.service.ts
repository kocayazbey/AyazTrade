import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.module';

interface SecurityVulnerability {
  id: string;
  type: 'sql_injection' | 'xss' | 'csrf' | 'authentication' | 'authorization' | 'data_exposure' | 'insecure_deserialization' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location: string;
  recommendation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'false_positive';
  discoveredAt: Date;
  resolvedAt?: Date;
  metadata: Record<string, any>;
}

interface SecurityScan {
  id: string;
  type: 'automated' | 'manual' | 'penetration' | 'code_review';
  status: 'pending' | 'running' | 'completed' | 'failed';
  target: string;
  findings: string[];
  vulnerabilities: string[];
  startedAt: Date;
  completedAt?: Date;
  report: SecurityReport;
}

interface SecurityReport {
  id: string;
  scanId: string;
  summary: {
    totalVulnerabilities: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    falsePositives: number;
  };
  vulnerabilities: SecurityVulnerability[];
  recommendations: string[];
  compliance: {
    owasp: boolean;
    pci: boolean;
    gdpr: boolean;
    iso27001: boolean;
  };
  generatedAt: Date;
}

interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  category: 'authentication' | 'authorization' | 'data_protection' | 'network' | 'incident_response';
  rules: SecurityRule[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SecurityRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: 'allow' | 'deny' | 'alert' | 'log';
  priority: number;
  isActive: boolean;
}

interface SecurityIncident {
  id: string;
  type: 'breach' | 'intrusion' | 'malware' | 'ddos' | 'phishing' | 'insider_threat' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  affectedSystems: string[];
  discoveredAt: Date;
  reportedAt: Date;
  resolvedAt?: Date;
  assignedTo?: string;
  notes: string[];
}

@Injectable()
export class SecurityHardeningService {
  private readonly logger = new Logger(SecurityHardeningService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async createSecurityScan(scan: Omit<SecurityScan, 'id' | 'startedAt' | 'report'>): Promise<SecurityScan> {
    const scanId = `scan-${Date.now()}`;
    
    const newScan: SecurityScan = {
      id: scanId,
      ...scan,
      startedAt: new Date(),
      report: {
        id: `report-${Date.now()}`,
        scanId,
        summary: {
          totalVulnerabilities: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          falsePositives: 0
        },
        vulnerabilities: [],
        recommendations: [],
        compliance: {
          owasp: false,
          pci: false,
          gdpr: false,
          iso27001: false
        },
        generatedAt: new Date()
      }
    };

    await this.saveSecurityScan(newScan);
    
    this.logger.log(`Created security scan: ${scanId}`);
    return newScan;
  }

  async runSecurityScan(scanId: string): Promise<SecurityReport> {
    const scan = await this.getSecurityScan(scanId);
    
    scan.status = 'running';
    await this.saveSecurityScan(scan);
    
    this.logger.log(`Running security scan: ${scanId}`);
    
    try {
      // Mock security scanning - in real implementation, this would use security tools
      const vulnerabilities = await this.performSecurityScan(scan);
      
      scan.status = 'completed';
      scan.completedAt = new Date();
      scan.vulnerabilities = vulnerabilities.map(v => v.id);
      
      // Generate report
      const report = await this.generateSecurityReport(scan, vulnerabilities);
      scan.report = report;
      
      await this.saveSecurityScan(scan);
      
      this.logger.log(`Security scan completed: ${scanId} - Found ${vulnerabilities.length} vulnerabilities`);
      return report;
      
    } catch (error) {
      scan.status = 'failed';
      await this.saveSecurityScan(scan);
      
      this.logger.error(`Security scan failed: ${scanId}`, error);
      throw error;
    }
  }

  async getSecurityScans(status?: string): Promise<SecurityScan[]> {
    let query = 'SELECT * FROM security_scans';
    const params = [];
    
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY started_at DESC';
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      findings: JSON.parse(row.findings || '[]'),
      vulnerabilities: JSON.parse(row.vulnerabilities || '[]'),
      report: JSON.parse(row.report || '{}')
    }));
  }

  async createSecurityVulnerability(vulnerability: Omit<SecurityVulnerability, 'id' | 'discoveredAt'>): Promise<SecurityVulnerability> {
    const vulnerabilityId = `vuln-${Date.now()}`;
    
    const newVulnerability: SecurityVulnerability = {
      id: vulnerabilityId,
      ...vulnerability,
      discoveredAt: new Date()
    };

    await this.saveSecurityVulnerability(newVulnerability);
    
    this.logger.log(`Created security vulnerability: ${vulnerabilityId}`);
    return newVulnerability;
  }

  async getSecurityVulnerabilities(severity?: string, status?: string): Promise<SecurityVulnerability[]> {
    let query = 'SELECT * FROM security_vulnerabilities';
    const params = [];
    
    if (severity) {
      query += ' WHERE severity = $1';
      params.push(severity);
    }
    
    if (status) {
      query += severity ? ' AND status = $2' : ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY discovered_at DESC';
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  async updateVulnerabilityStatus(vulnerabilityId: string, status: string, notes?: string): Promise<void> {
    const vulnerability = await this.getSecurityVulnerability(vulnerabilityId);
    
    vulnerability.status = status as any;
    
    if (status === 'resolved') {
      vulnerability.resolvedAt = new Date();
    }
    
    if (notes) {
      vulnerability.metadata.notes = notes;
    }
    
    await this.saveSecurityVulnerability(vulnerability);
    
    this.logger.log(`Updated vulnerability status: ${vulnerabilityId} to ${status}`);
  }

  async createSecurityPolicy(policy: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<SecurityPolicy> {
    const policyId = `policy-${Date.now()}`;
    
    const newPolicy: SecurityPolicy = {
      id: policyId,
      ...policy,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveSecurityPolicy(newPolicy);
    
    this.logger.log(`Created security policy: ${policyId}`);
    return newPolicy;
  }

  async getSecurityPolicies(category?: string): Promise<SecurityPolicy[]> {
    const result = await this.db.execute(`
      SELECT * FROM security_policies
      ${category ? 'WHERE category = $1' : ''}
      AND is_active = true
      ORDER BY created_at DESC
    `, category ? [category] : []);
    
    return result.rows.map(row => ({
      ...row,
      rules: JSON.parse(row.rules || '[]')
    }));
  }

  async createSecurityIncident(incident: Omit<SecurityIncident, 'id' | 'discoveredAt' | 'reportedAt'>): Promise<SecurityIncident> {
    const incidentId = `incident-${Date.now()}`;
    
    const newIncident: SecurityIncident = {
      id: incidentId,
      ...incident,
      discoveredAt: new Date(),
      reportedAt: new Date()
    };

    await this.saveSecurityIncident(newIncident);
    
    this.logger.log(`Created security incident: ${incidentId}`);
    return newIncident;
  }

  async getSecurityIncidents(severity?: string, status?: string): Promise<SecurityIncident[]> {
    let query = 'SELECT * FROM security_incidents';
    const params = [];
    
    if (severity) {
      query += ' WHERE severity = $1';
      params.push(severity);
    }
    
    if (status) {
      query += severity ? ' AND status = $2' : ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY discovered_at DESC';
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      affectedSystems: JSON.parse(row.affected_systems || '[]'),
      notes: JSON.parse(row.notes || '[]')
    }));
  }

  async updateIncidentStatus(incidentId: string, status: string, notes?: string): Promise<void> {
    const incident = await this.getSecurityIncident(incidentId);
    
    incident.status = status as any;
    
    if (status === 'resolved') {
      incident.resolvedAt = new Date();
    }
    
    if (notes) {
      incident.notes.push(notes);
    }
    
    await this.saveSecurityIncident(incident);
    
    this.logger.log(`Updated incident status: ${incidentId} to ${status}`);
  }

  async performPenetrationTest(target: string): Promise<SecurityReport> {
    this.logger.log(`Starting penetration test for: ${target}`);
    
    // Mock penetration testing - in real implementation, this would use penetration testing tools
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
    
    const vulnerabilities = await this.generateMockVulnerabilities();
    const report = await this.generateSecurityReport({
      id: 'pen-test',
      type: 'penetration',
      status: 'completed',
      target,
      findings: [],
      vulnerabilities: vulnerabilities.map(v => v.id),
      startedAt: new Date(),
      completedAt: new Date(),
      report: {} as SecurityReport
    }, vulnerabilities);
    
    this.logger.log(`Penetration test completed for: ${target}`);
    return report;
  }

  async performCodeReview(repository: string): Promise<SecurityReport> {
    this.logger.log(`Starting code review for: ${repository}`);
    
    // Mock code review - in real implementation, this would use static analysis tools
    await new Promise(resolve => setTimeout(resolve, 15000)); // 15 seconds
    
    const vulnerabilities = await this.generateMockCodeVulnerabilities();
    const report = await this.generateSecurityReport({
      id: 'code-review',
      type: 'code_review',
      status: 'completed',
      target: repository,
      findings: [],
      vulnerabilities: vulnerabilities.map(v => v.id),
      startedAt: new Date(),
      completedAt: new Date(),
      report: {} as SecurityReport
    }, vulnerabilities);
    
    this.logger.log(`Code review completed for: ${repository}`);
    return report;
  }

  async getSecurityAnalytics(period: string = '30d'): Promise<{
    totalVulnerabilities: number;
    vulnerabilitiesBySeverity: Record<string, number>;
    vulnerabilitiesByType: Record<string, number>;
    averageResolutionTime: number;
    complianceScore: number;
    incidentCount: number;
    topVulnerabilityTypes: Array<{
      type: string;
      count: number;
    }>;
  }> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(*) as total_vulnerabilities,
        severity,
        type,
        AVG(EXTRACT(EPOCH FROM (resolved_at - discovered_at))) as avg_resolution_time
      FROM security_vulnerabilities
      WHERE discovered_at >= NOW() - INTERVAL '${period}'
      GROUP BY severity, type
    `);
    
    const vulnerabilitiesBySeverity: Record<string, number> = {};
    const vulnerabilitiesByType: Record<string, number> = {};
    let totalVulnerabilities = 0;
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    
    result.rows.forEach(row => {
      const count = parseInt(row.total_vulnerabilities) || 0;
      totalVulnerabilities += count;
      
      vulnerabilitiesBySeverity[row.severity] = (vulnerabilitiesBySeverity[row.severity] || 0) + count;
      vulnerabilitiesByType[row.type] = (vulnerabilitiesByType[row.type] || 0) + count;
      
      if (row.avg_resolution_time) {
        totalResolutionTime += parseFloat(row.avg_resolution_time);
        resolvedCount++;
      }
    });
    
    const averageResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;
    
    // Get incident count
    const incidentResult = await this.db.execute(`
      SELECT COUNT(*) as incident_count
      FROM security_incidents
      WHERE discovered_at >= NOW() - INTERVAL '${period}'
    `);
    
    const incidentCount = parseInt(incidentResult.rows[0]?.incident_count) || 0;
    
    // Get top vulnerability types
    const topTypes = Object.entries(vulnerabilitiesByType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
    
    return {
      totalVulnerabilities,
      vulnerabilitiesBySeverity,
      vulnerabilitiesByType,
      averageResolutionTime,
      complianceScore: 85, // Mock compliance score
      incidentCount,
      topVulnerabilityTypes: topTypes
    };
  }

  private async performSecurityScan(scan: SecurityScan): Promise<SecurityVulnerability[]> {
    // Mock vulnerability detection
    const vulnerabilities: SecurityVulnerability[] = [];
    
    const vulnerabilityTypes = [
      { type: 'sql_injection', severity: 'high', title: 'SQL Injection Vulnerability' },
      { type: 'xss', severity: 'medium', title: 'Cross-Site Scripting (XSS)' },
      { type: 'csrf', severity: 'medium', title: 'Cross-Site Request Forgery' },
      { type: 'authentication', severity: 'high', title: 'Weak Authentication' },
      { type: 'data_exposure', severity: 'critical', title: 'Sensitive Data Exposure' }
    ];
    
    for (let i = 0; i < Math.floor(Math.random() * 5) + 1; i++) {
      const vulnType = vulnerabilityTypes[Math.floor(Math.random() * vulnerabilityTypes.length)];
      
      const vulnerability: SecurityVulnerability = {
        id: `vuln-${Date.now()}-${i}`,
        type: vulnType.type as any,
        severity: vulnType.severity as any,
        title: vulnType.title,
        description: `Mock ${vulnType.title} description`,
        location: `Mock location ${i}`,
        recommendation: `Mock recommendation for ${vulnType.title}`,
        status: 'open',
        discoveredAt: new Date(),
        metadata: {
          scanId: scan.id,
          confidence: Math.random() * 0.3 + 0.7
        }
      };
      
      vulnerabilities.push(vulnerability);
      await this.saveSecurityVulnerability(vulnerability);
    }
    
    return vulnerabilities;
  }

  private async generateMockVulnerabilities(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    const mockVulns = [
      { type: 'sql_injection', severity: 'critical', title: 'SQL Injection in Login Form' },
      { type: 'xss', severity: 'high', title: 'Stored XSS in User Comments' },
      { type: 'authentication', severity: 'high', title: 'Weak Password Policy' },
      { type: 'data_exposure', severity: 'critical', title: 'API Key Exposed in Logs' }
    ];
    
    for (let i = 0; i < mockVulns.length; i++) {
      const vuln = mockVulns[i];
      
      vulnerabilities.push({
        id: `mock-vuln-${Date.now()}-${i}`,
        type: vuln.type as any,
        severity: vuln.severity as any,
        title: vuln.title,
        description: `Mock ${vuln.title} description`,
        location: `Mock location ${i}`,
        recommendation: `Mock recommendation for ${vuln.title}`,
        status: 'open',
        discoveredAt: new Date(),
        metadata: { mock: true }
      });
    }
    
    return vulnerabilities;
  }

  private async generateMockCodeVulnerabilities(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    const mockVulns = [
      { type: 'sql_injection', severity: 'high', title: 'SQL Injection in User Query' },
      { type: 'xss', severity: 'medium', title: 'Reflected XSS in Search' },
      { type: 'insecure_deserialization', severity: 'high', title: 'Insecure Deserialization' }
    ];
    
    for (let i = 0; i < mockVulns.length; i++) {
      const vuln = mockVulns[i];
      
      vulnerabilities.push({
        id: `code-vuln-${Date.now()}-${i}`,
        type: vuln.type as any,
        severity: vuln.severity as any,
        title: vuln.title,
        description: `Mock ${vuln.title} description`,
        location: `Mock file:line ${i}`,
        recommendation: `Mock recommendation for ${vuln.title}`,
        status: 'open',
        discoveredAt: new Date(),
        metadata: { mock: true, codeReview: true }
      });
    }
    
    return vulnerabilities;
  }

  private async generateSecurityReport(scan: SecurityScan, vulnerabilities: SecurityVulnerability[]): Promise<SecurityReport> {
    const reportId = `report-${Date.now()}`;
    
    const summary = {
      totalVulnerabilities: vulnerabilities.length,
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length,
      falsePositives: 0
    };
    
    const recommendations = this.generateSecurityRecommendations(vulnerabilities);
    
    const compliance = {
      owasp: summary.critical === 0 && summary.high <= 2,
      pci: summary.critical === 0,
      gdpr: summary.critical === 0,
      iso27001: summary.critical === 0 && summary.high <= 1
    };
    
    const report: SecurityReport = {
      id: reportId,
      scanId: scan.id,
      summary,
      vulnerabilities,
      recommendations,
      compliance,
      generatedAt: new Date()
    };
    
    await this.saveSecurityReport(report);
    
    return report;
  }

  private generateSecurityRecommendations(vulnerabilities: SecurityVulnerability[]): string[] {
    const recommendations = [];
    
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    
    if (criticalCount > 0) {
      recommendations.push('Address critical vulnerabilities immediately');
    }
    
    if (highCount > 0) {
      recommendations.push('Prioritize high-severity vulnerabilities');
    }
    
    if (vulnerabilities.some(v => v.type === 'sql_injection')) {
      recommendations.push('Implement parameterized queries to prevent SQL injection');
    }
    
    if (vulnerabilities.some(v => v.type === 'xss')) {
      recommendations.push('Implement input validation and output encoding');
    }
    
    if (vulnerabilities.some(v => v.type === 'authentication')) {
      recommendations.push('Strengthen authentication mechanisms');
    }
    
    return recommendations;
  }

  private async getSecurityScan(scanId: string): Promise<SecurityScan> {
    const result = await this.db.execute(`
      SELECT * FROM security_scans WHERE id = $1
    `, [scanId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Security scan not found: ${scanId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      findings: JSON.parse(row.findings || '[]'),
      vulnerabilities: JSON.parse(row.vulnerabilities || '[]'),
      report: JSON.parse(row.report || '{}')
    };
  }

  private async getSecurityVulnerability(vulnerabilityId: string): Promise<SecurityVulnerability> {
    const result = await this.db.execute(`
      SELECT * FROM security_vulnerabilities WHERE id = $1
    `, [vulnerabilityId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Security vulnerability not found: ${vulnerabilityId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  private async getSecurityIncident(incidentId: string): Promise<SecurityIncident> {
    const result = await this.db.execute(`
      SELECT * FROM security_incidents WHERE id = $1
    `, [incidentId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Security incident not found: ${incidentId}`);
    }
    
    const row = result.rows[0];
    return {
      ...row,
      affectedSystems: JSON.parse(row.affected_systems || '[]'),
      notes: JSON.parse(row.notes || '[]')
    };
  }

  private async saveSecurityScan(scan: SecurityScan): Promise<void> {
    await this.db.execute(`
      INSERT INTO security_scans (id, type, status, target, findings, vulnerabilities, started_at, completed_at, report)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        findings = EXCLUDED.findings,
        vulnerabilities = EXCLUDED.vulnerabilities,
        completed_at = EXCLUDED.completed_at,
        report = EXCLUDED.report
    `, [
      scan.id,
      scan.type,
      scan.status,
      scan.target,
      JSON.stringify(scan.findings),
      JSON.stringify(scan.vulnerabilities),
      scan.startedAt,
      scan.completedAt,
      JSON.stringify(scan.report)
    ]);
  }

  private async saveSecurityVulnerability(vulnerability: SecurityVulnerability): Promise<void> {
    await this.db.execute(`
      INSERT INTO security_vulnerabilities (id, type, severity, title, description, location, recommendation, status, discovered_at, resolved_at, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        resolved_at = EXCLUDED.resolved_at,
        metadata = EXCLUDED.metadata
    `, [
      vulnerability.id,
      vulnerability.type,
      vulnerability.severity,
      vulnerability.title,
      vulnerability.description,
      vulnerability.location,
      vulnerability.recommendation,
      vulnerability.status,
      vulnerability.discoveredAt,
      vulnerability.resolvedAt,
      JSON.stringify(vulnerability.metadata)
    ]);
  }

  private async saveSecurityPolicy(policy: SecurityPolicy): Promise<void> {
    await this.db.execute(`
      INSERT INTO security_policies (id, name, description, category, rules, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      policy.id,
      policy.name,
      policy.description,
      policy.category,
      JSON.stringify(policy.rules),
      policy.isActive,
      policy.createdAt,
      policy.updatedAt
    ]);
  }

  private async saveSecurityIncident(incident: SecurityIncident): Promise<void> {
    await this.db.execute(`
      INSERT INTO security_incidents (id, type, severity, title, description, status, affected_systems, discovered_at, reported_at, resolved_at, assigned_to, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        resolved_at = EXCLUDED.resolved_at,
        assigned_to = EXCLUDED.assigned_to,
        notes = EXCLUDED.notes
    `, [
      incident.id,
      incident.type,
      incident.severity,
      incident.title,
      incident.description,
      incident.status,
      JSON.stringify(incident.affectedSystems),
      incident.discoveredAt,
      incident.reportedAt,
      incident.resolvedAt,
      incident.assignedTo,
      JSON.stringify(incident.notes)
    ]);
  }

  private async saveSecurityReport(report: SecurityReport): Promise<void> {
    await this.db.execute(`
      INSERT INTO security_reports (id, scan_id, summary, vulnerabilities, recommendations, compliance, generated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      report.id,
      report.scanId,
      JSON.stringify(report.summary),
      JSON.stringify(report.vulnerabilities),
      JSON.stringify(report.recommendations),
      JSON.stringify(report.compliance),
      report.generatedAt
    ]);
  }
}
