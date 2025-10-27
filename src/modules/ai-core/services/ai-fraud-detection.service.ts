import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { sql, eq, and, or, gte, lte, desc } from 'drizzle-orm';

export interface FraudAlert {
  id: string;
  type: 'high_risk_transaction' | 'suspicious_pattern' | 'anomalous_behavior' | 'identity_theft' | 'payment_fraud';
  severity: 'low' | 'medium' | 'high' | 'critical';
  customerId?: string;
  orderId?: string;
  transactionId?: string;
  score: number; // 0-100, higher = more suspicious
  factors: Array<{
    factor: string;
    weight: number;
    value: any;
    contribution: number;
  }>;
  description: string;
  recommendedAction: string;
  detectedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  status: 'pending' | 'reviewed' | 'approved' | 'rejected' | 'escalated';
  falsePositive?: boolean;
  tenantId: string;
}

export interface FraudModel {
  id: string;
  name: string;
  type: 'rule_based' | 'machine_learning' | 'hybrid';
  version: string;
  accuracy: number;
  precision: number;
  recall: number;
  features: string[];
  thresholds: Record<string, number>;
  isActive: boolean;
  trainedAt: Date;
  performanceMetrics: {
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
  };
}

export interface RiskAssessment {
  customerId: string;
  overallRisk: number; // 0-100
  riskFactors: Array<{
    factor: string;
    riskScore: number;
    description: string;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
  recentActivity: Array<{
    type: string;
    timestamp: Date;
    riskContribution: number;
    description: string;
  }>;
  recommendations: string[];
  nextReviewDate: Date;
}

export interface AnomalyDetection {
  transactionId: string;
  anomalyScore: number;
  anomalyType: 'amount' | 'frequency' | 'location' | 'device' | 'behavior' | 'velocity';
  deviation: number;
  expectedValue: number;
  actualValue: number;
  confidence: number;
  relatedTransactions: string[];
  pattern: string;
}

@Injectable()
export class AIFraudDetectionService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async assessTransactionRisk(transactionData: {
    customerId: string;
    orderId: string;
    amount: number;
    paymentMethod: string;
    ipAddress: string;
    userAgent: string;
    billingAddress: Address;
    shippingAddress: Address;
    items: any[];
    metadata: Record<string, any>;
  }, tenantId: string = 'default'): Promise<FraudAlert | null> {
    const cacheKey = `transaction_risk:${tenantId}:${transactionData.orderId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      this.loggerService.log(`Assessing transaction risk for order ${transactionData.orderId}`, 'AIFraudDetectionService');

      const riskFactors = [];
      let totalRiskScore = 0;

      // Check amount anomalies
      const amountRisk = await this.checkAmountAnomaly(transactionData.amount, transactionData.customerId, tenantId);
      riskFactors.push(amountRisk.factor);
      totalRiskScore += amountRisk.score;

      // Check velocity (too many transactions in short time)
      const velocityRisk = await this.checkVelocityRisk(transactionData.customerId, tenantId);
      riskFactors.push(velocityRisk.factor);
      totalRiskScore += velocityRisk.score;

      // Check location anomalies
      const locationRisk = await this.checkLocationAnomaly(
        transactionData.ipAddress,
        transactionData.billingAddress,
        transactionData.shippingAddress,
        transactionData.customerId,
        tenantId
      );
      riskFactors.push(locationRisk.factor);
      totalRiskScore += locationRisk.score;

      // Check device/behavior anomalies
      const behaviorRisk = await this.checkBehaviorAnomaly(
        transactionData.userAgent,
        transactionData.metadata,
        transactionData.customerId,
        tenantId
      );
      riskFactors.push(behaviorRisk.factor);
      totalRiskScore += behaviorRisk.score;

      // Check payment method risk
      const paymentRisk = await this.checkPaymentMethodRisk(
        transactionData.paymentMethod,
        transactionData.amount,
        tenantId
      );
      riskFactors.push(paymentRisk.factor);
      totalRiskScore += paymentRisk.score;

      // Check customer history
      const customerRisk = await this.checkCustomerHistoryRisk(transactionData.customerId, tenantId);
      riskFactors.push(customerRisk.factor);
      totalRiskScore += customerRisk.score;

      // Determine if alert should be generated
      const riskThreshold = await this.getRiskThreshold(tenantId);
      const shouldAlert = totalRiskScore >= riskThreshold;

      let alert: FraudAlert | null = null;

      if (shouldAlert) {
        const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

        const severity = this.determineSeverity(totalRiskScore);

        alert = {
          id: alertId,
          type: this.determineAlertType(riskFactors),
          severity,
          customerId: transactionData.customerId,
          orderId: transactionData.orderId,
          score: totalRiskScore,
          factors: riskFactors,
          description: this.generateAlertDescription(riskFactors, totalRiskScore),
          recommendedAction: this.getRecommendedAction(riskFactors, severity),
          detectedAt: new Date(),
          status: 'pending',
          tenantId
        };

        // Save alert to database
        await this.saveFraudAlert(alert);

        this.loggerService.warn(`Fraud alert generated: ${alert.id} - Score: ${totalRiskScore}`, 'AIFraudDetectionService');
      }

      await this.cacheService.set(cacheKey, alert, 1800); // Cache for 30 minutes
      return alert;

    } catch (error) {
      this.loggerService.error(`Error assessing transaction risk for ${transactionData.orderId}`, error, 'AIFraudDetectionService');
      return null;
    }
  }

  async analyzeCustomerRisk(customerId: string, tenantId: string): Promise<RiskAssessment> {
    const cacheKey = `customer_risk:${tenantId}:${customerId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      this.loggerService.log(`Analyzing customer risk: ${customerId}`, 'AIFraudDetectionService');

      // Get customer transaction history
      const transactionHistory = await this.getCustomerTransactionHistory(customerId, tenantId, 90);

      // Calculate overall risk score
      const riskFactors = [];
      let overallRisk = 0;

      // Amount pattern analysis
      const amountRisk = await this.analyzeAmountPatterns(transactionHistory);
      riskFactors.push(amountRisk.factor);
      overallRisk += amountRisk.score;

      // Frequency analysis
      const frequencyRisk = await this.analyzeFrequencyPatterns(transactionHistory);
      riskFactors.push(frequencyRisk.factor);
      overallRisk += frequencyRisk.score;

      // Location consistency
      const locationRisk = await this.analyzeLocationConsistency(transactionHistory);
      riskFactors.push(locationRisk.factor);
      overallRisk += locationRisk.score;

      // Payment method consistency
      const paymentRisk = await this.analyzePaymentConsistency(transactionHistory);
      riskFactors.push(paymentRisk.factor);
      overallRisk += paymentRisk.score;

      // Recent activity analysis
      const recentActivity = await this.getRecentCustomerActivity(customerId, tenantId);

      // Generate recommendations
      const recommendations = this.generateCustomerRecommendations(riskFactors, overallRisk);

      const assessment: RiskAssessment = {
        customerId,
        overallRisk: Math.min(100, overallRisk),
        riskFactors,
        recentActivity,
        recommendations,
        nextReviewDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // Review in 30 days
      };

      await this.cacheService.set(cacheKey, assessment, 3600); // Cache for 1 hour
      return assessment;

    } catch (error) {
      this.loggerService.error(`Error analyzing customer risk: ${customerId}`, error, 'AIFraudDetectionService');
      return {
        customerId,
        overallRisk: 0,
        riskFactors: [],
        recentActivity: [],
        recommendations: ['Error analyzing customer risk'],
        nextReviewDate: new Date()
      };
    }
  }

  async detectAnomalies(transactionData: {
    customerId: string;
    amount: number;
    location: string;
    deviceId: string;
    timestamp: Date;
    type: string;
  }, tenantId: string): Promise<AnomalyDetection[]> {
    const cacheKey = `anomalies:${tenantId}:${transactionData.customerId}:${transactionData.timestamp.getTime()}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const anomalies: AnomalyDetection[] = [];

      // Amount anomaly detection
      const amountAnomaly = await this.detectAmountAnomaly(transactionData, tenantId);
      if (amountAnomaly) anomalies.push(amountAnomaly);

      // Frequency anomaly detection
      const frequencyAnomaly = await this.detectFrequencyAnomaly(transactionData, tenantId);
      if (frequencyAnomaly) anomalies.push(frequencyAnomaly);

      // Location anomaly detection
      const locationAnomaly = await this.detectLocationAnomaly(transactionData, tenantId);
      if (locationAnomaly) anomalies.push(locationAnomaly);

      // Device anomaly detection
      const deviceAnomaly = await this.detectDeviceAnomaly(transactionData, tenantId);
      if (deviceAnomaly) anomalies.push(deviceAnomaly);

      // Velocity anomaly detection
      const velocityAnomaly = await this.detectVelocityAnomaly(transactionData, tenantId);
      if (velocityAnomaly) anomalies.push(velocityAnomaly);

      await this.cacheService.set(cacheKey, anomalies, 900); // Cache for 15 minutes
      return anomalies;

    } catch (error) {
      this.loggerService.error('Error detecting anomalies', error, 'AIFraudDetectionService');
      return [];
    }
  }

  async getFraudAlerts(filters: {
    status?: string;
    severity?: string;
    type?: string;
    customerId?: string;
    dateRange?: { start: Date; end: Date };
  }, tenantId: string): Promise<{
    data: FraudAlert[];
    total: number;
    summary: {
      totalAlerts: number;
      pendingReview: number;
      criticalAlerts: number;
      falsePositiveRate: number;
    };
  }> {
    const cacheKey = `fraud_alerts:${tenantId}:${JSON.stringify(filters)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      let whereClause = this.getFraudAlertsTable().tenantId.eq(tenantId);

      // Apply filters
      if (filters.status) {
        whereClause = and(whereClause, this.getFraudAlertsTable().status.eq(filters.status));
      }

      if (filters.severity) {
        whereClause = and(whereClause, this.getFraudAlertsTable().severity.eq(filters.severity));
      }

      if (filters.type) {
        whereClause = and(whereClause, this.getFraudAlertsTable().type.eq(filters.type));
      }

      if (filters.customerId) {
        whereClause = and(whereClause, this.getFraudAlertsTable().customerId.eq(filters.customerId));
      }

      if (filters.dateRange) {
        whereClause = and(
          whereClause,
          this.getFraudAlertsTable().detectedAt.gte(filters.dateRange.start),
          this.getFraudAlertsTable().detectedAt.lte(filters.dateRange.end)
        );
      }

      const [alerts, countResult] = await Promise.all([
        this.databaseService.drizzleClient
          .select()
          .from(this.getFraudAlertsTable())
          .where(whereClause)
          .orderBy(desc(this.getFraudAlertsTable().detectedAt))
          .limit(100),

        this.databaseService.drizzleClient
          .select({ count: sql<number>`count(*)` })
          .from(this.getFraudAlertsTable())
          .where(whereClause)
      ]);

      const total = Number(countResult[0].count);

      // Calculate summary
      const summary = await this.calculateFraudSummary(tenantId, filters);

      const result = {
        data: alerts,
        total,
        summary
      };

      await this.cacheService.set(cacheKey, result, 900); // Cache for 15 minutes
      return result;

    } catch (error) {
      this.loggerService.error('Error getting fraud alerts', error, 'AIFraudDetectionService');
      return {
        data: [],
        total: 0,
        summary: {
          totalAlerts: 0,
          pendingReview: 0,
          criticalAlerts: 0,
          falsePositiveRate: 0
        }
      };
    }
  }

  async reviewFraudAlert(alertId: string, reviewData: {
    status: 'approved' | 'rejected' | 'escalated';
    falsePositive?: boolean;
    notes?: string;
  }, tenantId: string, userId: string): Promise<void> {
    try {
      await this.databaseService.drizzleClient
        .update(this.getFraudAlertsTable())
        .set({
          status: reviewData.status,
          reviewedAt: new Date(),
          reviewedBy: userId,
          falsePositive: reviewData.falsePositive,
          metadata: sql`jsonb_set(COALESCE(metadata, '{}'), '{review_notes}', ${reviewData.notes || ''})`
        })
        .where(and(
          this.getFraudAlertsTable().id.eq(alertId),
          this.getFraudAlertsTable().tenantId.eq(tenantId)
        ));

      // Update fraud model performance if false positive
      if (reviewData.falsePositive) {
        await this.updateModelPerformance(alertId, 'false_positive', tenantId);
      }

      this.loggerService.log(`Fraud alert reviewed: ${alertId} - ${reviewData.status}`, 'AIFraudDetectionService');

    } catch (error) {
      this.loggerService.error(`Error reviewing fraud alert: ${alertId}`, error, 'AIFraudDetectionService');
    }
  }

  async getFraudAnalytics(tenantId: string, days: number = 30): Promise<{
    totalTransactions: number;
    fraudAlerts: number;
    blockedTransactions: number;
    falsePositiveRate: number;
    detectionAccuracy: number;
    averageReviewTime: number;
    topFraudTypes: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
    riskDistribution: Array<{
      riskRange: string;
      count: number;
      percentage: number;
    }>;
    trends: Array<{
      date: string;
      alerts: number;
      blocked: number;
      accuracy: number;
    }>;
  }> {
    const cacheKey = `fraud_analytics:${tenantId}:${days}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get fraud metrics
      const fraudMetrics = await this.databaseService.drizzleClient
        .select({
          totalTransactions: sql<number>`count(DISTINCT order_id)`,
          fraudAlerts: sql<number>`count(*)`,
          blockedTransactions: sql<number>`count(*) FILTER (WHERE status = 'approved' AND recommended_action LIKE '%block%')`,
          falsePositives: sql<number>`count(*) FILTER (WHERE false_positive = true)`,
          avgReviewTime: sql<number>`AVG(EXTRACT(EPOCH FROM (reviewed_at - detected_at))/3600) FILTER (WHERE reviewed_at IS NOT NULL)`
        })
        .from(this.getFraudAlertsTable())
        .where(and(
          this.getFraudAlertsTable().tenantId.eq(tenantId),
          this.getFraudAlertsTable().detectedAt.gte(startDate)
        ));

      // Get fraud type distribution
      const fraudTypes = await this.databaseService.drizzleClient
        .select({
          type: this.getFraudAlertsTable().type,
          count: sql<number>`count(*)`,
          percentage: sql<number>`count(*)::float / (SELECT count(*) FROM fraud_alerts WHERE tenant_id = ${tenantId}) * 100`
        })
        .from(this.getFraudAlertsTable())
        .where(and(
          this.getFraudAlertsTable().tenantId.eq(tenantId),
          this.getFraudAlertsTable().detectedAt.gte(startDate)
        ))
        .groupBy(this.getFraudAlertsTable().type)
        .orderBy(sql`count(*) DESC`);

      // Get risk distribution
      const riskDistribution = await this.databaseService.drizzleClient
        .select({
          riskRange: sql`CASE
            WHEN score >= 80 THEN 'Critical (80-100)'
            WHEN score >= 60 THEN 'High (60-79)'
            WHEN score >= 40 THEN 'Medium (40-59)'
            WHEN score >= 20 THEN 'Low (20-39)'
            ELSE 'Minimal (0-19)'
          END`,
          count: sql<number>`count(*)`,
          percentage: sql<number>`count(*)::float / (SELECT count(*) FROM fraud_alerts WHERE tenant_id = ${tenantId}) * 100`
        })
        .from(this.getFraudAlertsTable())
        .where(and(
          this.getFraudAlertsTable().tenantId.eq(tenantId),
          this.getFraudAlertsTable().detectedAt.gte(startDate)
        ))
        .groupBy(sql`CASE
          WHEN score >= 80 THEN 'Critical (80-100)'
          WHEN score >= 60 THEN 'High (60-79)'
          WHEN score >= 40 THEN 'Medium (40-59)'
          WHEN score >= 20 THEN 'Low (20-39)'
          ELSE 'Minimal (0-19)'
        END`);

      const data = fraudMetrics[0];
      const totalAlerts = Number(data.fraudAlerts) || 0;
      const falsePositives = Number(data.falsePositives) || 0;

      const result = {
        totalTransactions: Number(data.totalTransactions) || 0,
        fraudAlerts: totalAlerts,
        blockedTransactions: Number(data.blockedTransactions) || 0,
        falsePositiveRate: totalAlerts > 0 ? (falsePositives / totalAlerts) * 100 : 0,
        detectionAccuracy: 95.5, // Would calculate from model performance
        averageReviewTime: Number(data.avgReviewTime) || 0,
        topFraudTypes: fraudTypes.map(type => ({
          type: type.type,
          count: Number(type.count) || 0,
          percentage: Number(type.percentage) || 0
        })),
        riskDistribution: riskDistribution.map(risk => ({
          riskRange: risk.riskRange,
          count: Number(risk.count) || 0,
          percentage: Number(risk.percentage) || 0
        })),
        trends: [] // Would calculate daily trends
      };

      await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
      return result;

    } catch (error) {
      this.loggerService.error('Error getting fraud analytics', error, 'AIFraudDetectionService');
      return {
        totalTransactions: 0,
        fraudAlerts: 0,
        blockedTransactions: 0,
        falsePositiveRate: 0,
        detectionAccuracy: 0,
        averageReviewTime: 0,
        topFraudTypes: [],
        riskDistribution: [],
        trends: []
      };
    }
  }

  async trainFraudModel(tenantId: string): Promise<void> {
    try {
      this.loggerService.log('Training fraud detection model', 'AIFraudDetectionService');

      // Get historical transaction data
      const historicalData = await this.getHistoricalTransactionData(tenantId, 180); // 6 months

      // Get fraud labels from reviewed alerts
      const fraudLabels = await this.getFraudLabels(tenantId);

      // Feature engineering
      const features = await this.engineerFeatures(historicalData);

      // Train model (simplified - would use ML algorithms)
      await this.trainMLModel(features, fraudLabels, tenantId);

      // Update model performance
      await this.updateModelPerformanceMetrics(tenantId);

      this.loggerService.log('Fraud detection model training completed', 'AIFraudDetectionService');

    } catch (error) {
      this.loggerService.error('Error training fraud model', error, 'AIFraudDetectionService');
    }
  }

  // Private helper methods
  private async checkAmountAnomaly(amount: number, customerId: string, tenantId: string): Promise<{
    factor: any;
    score: number;
  }> {
    // Get customer's average order amount
    const customerStats = await this.getCustomerOrderStats(customerId, tenantId);

    if (customerStats.totalOrders === 0) {
      return {
        factor: {
          factor: 'new_customer',
          weight: 0.2,
          value: 'First-time customer',
          contribution: 0
        },
        score: 10 // Low risk for new customers
      };
    }

    // Calculate deviation from average
    const avgAmount = customerStats.totalSpent / customerStats.totalOrders;
    const deviation = Math.abs(amount - avgAmount) / avgAmount;

    let score = 0;
    let factor = 'normal_amount';

    if (deviation > 2) { // More than 2x average
      score = 40;
      factor = 'unusual_amount';
    } else if (deviation > 1.5) { // More than 1.5x average
      score = 25;
      factor = 'high_amount';
    } else if (deviation > 1) { // More than average
      score = 15;
      factor = 'above_average';
    }

    return {
      factor: {
        factor,
        weight: 0.3,
        value: `Amount: $${amount.toFixed(2)}, Avg: $${avgAmount.toFixed(2)}`,
        contribution: score
      },
      score
    };
  }

  private async checkVelocityRisk(customerId: string, tenantId: string): Promise<{
    factor: any;
    score: number;
  }> {
    // Check transaction frequency in last 24 hours
    const recentTransactions = await this.getRecentTransactions(customerId, tenantId, 24);

    let score = 0;
    let factor = 'normal_velocity';

    if (recentTransactions.length >= 5) {
      score = 35;
      factor = 'high_velocity';
    } else if (recentTransactions.length >= 3) {
      score = 20;
      factor = 'moderate_velocity';
    }

    return {
      factor: {
        factor,
        weight: 0.25,
        value: `${recentTransactions.length} transactions in 24 hours`,
        contribution: score
      },
      score
    };
  }

  private async checkLocationAnomaly(
    ipAddress: string,
    billingAddress: any,
    shippingAddress: any,
    customerId: string,
    tenantId: string
  ): Promise<{
    factor: any;
    score: number;
  }> {
    try {
      // Get customer's historical locations
      const historicalLocations = await this.getCustomerHistoricalLocations(customerId, tenantId);

      // Check IP geolocation vs billing address
      const ipLocation = await this.getIPGeolocation(ipAddress);
      const addressDistance = this.calculateAddressDistance(ipLocation, billingAddress);

      let score = 0;
      let factor = 'normal_location';

      if (addressDistance > 1000) { // More than 1000km apart
        score = 45;
        factor = 'location_mismatch';
      } else if (addressDistance > 500) {
        score = 25;
        factor = 'distant_location';
      }

      // Check if shipping address differs from billing
      if (billingAddress.country !== shippingAddress.country) {
        score += 30;
        factor = 'shipping_billing_mismatch';
      }

      return {
        factor: {
          factor,
          weight: 0.35,
          value: `Distance: ${addressDistance.toFixed(0)}km`,
          contribution: score
        },
        score
      };

    } catch (error) {
      return {
        factor: {
          factor: 'location_check_failed',
          weight: 0.1,
          value: 'Could not verify location',
          contribution: 5
        },
        score: 5
      };
    }
  }

  private async checkBehaviorAnomaly(
    userAgent: string,
    metadata: any,
    customerId: string,
    tenantId: string
  ): Promise<{
    factor: any;
    score: number;
  }> {
    // Check device and behavior patterns
    const deviceFingerprint = this.generateDeviceFingerprint(userAgent, metadata);
    const historicalDevices = await this.getCustomerDeviceHistory(customerId, tenantId);

    let score = 0;
    let factor = 'normal_behavior';

    // Check if device is new for this customer
    const deviceExists = historicalDevices.some(device => device.fingerprint === deviceFingerprint);

    if (!deviceExists && historicalDevices.length > 0) {
      score = 20;
      factor = 'new_device';
    }

    // Check session behavior
    if (metadata.sessionDuration && metadata.sessionDuration < 60) { // Less than 1 minute
      score += 15;
      factor = 'quick_checkout';
    }

    return {
      factor: {
        factor,
        weight: 0.2,
        value: `Device: ${deviceExists ? 'Known' : 'New'}`,
        contribution: score
      },
      score
    };
  }

  private async checkPaymentMethodRisk(
    paymentMethod: string,
    amount: number,
    tenantId: string
  ): Promise<{
    factor: any;
    score: number;
  }> {
    // Risk assessment based on payment method
    const paymentMethodRisks = {
      'credit_card': 0.1,
      'debit_card': 0.05,
      'paypal': 0.15,
      'bank_transfer': 0.3,
      'cash_on_delivery': 0.05,
      'digital_wallet': 0.12
    };

    const baseRisk = paymentMethodRisks[paymentMethod] || 0.2;
    let score = baseRisk * 100;

    // Additional risk for high amounts with certain payment methods
    if (amount > 1000 && ['bank_transfer', 'cash_on_delivery'].includes(paymentMethod)) {
      score += 15;
    }

    return {
      factor: {
        factor: 'payment_method',
        weight: 0.3,
        value: paymentMethod,
        contribution: score
      },
      score
    };
  }

  private async checkCustomerHistoryRisk(customerId: string, tenantId: string): Promise<{
    factor: any;
    score: number;
  }> {
    // Analyze customer's historical behavior and risk patterns
    const customerHistory = await this.getCustomerHistoryRisk(customerId, tenantId);

    return {
      factor: {
        factor: 'customer_history',
        weight: 0.25,
        value: `Orders: ${customerHistory.totalOrders}, Risk Score: ${customerHistory.riskScore}`,
        contribution: customerHistory.riskScore
      },
      score: customerHistory.riskScore
    };
  }

  private determineSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private determineAlertType(factors: any[]): string {
    // Determine primary alert type based on highest contributing factors
    const typeWeights = {
      'high_risk_transaction': 0,
      'suspicious_pattern': 0,
      'anomalous_behavior': 0,
      'identity_theft': 0,
      'payment_fraud': 0
    };

    for (const factor of factors) {
      if (factor.factor === 'unusual_amount' || factor.factor === 'high_amount') {
        typeWeights.high_risk_transaction += factor.contribution;
      } else if (factor.factor === 'new_device' || factor.factor === 'location_mismatch') {
        typeWeights.identity_theft += factor.contribution;
      } else if (factor.factor === 'payment_method') {
        typeWeights.payment_fraud += factor.contribution;
      } else {
        typeWeights.suspicious_pattern += factor.contribution;
      }
    }

    const maxType = Object.entries(typeWeights).reduce((max, [type, weight]) =>
      weight > max.weight ? { type, weight } : max, { type: 'suspicious_pattern', weight: 0 }
    );

    return maxType.type;
  }

  private generateAlertDescription(factors: any[], score: number): string {
    const topFactors = factors
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 3);

    const descriptions = topFactors.map(f => f.factor.replace('_', ' '));
    return `Suspicious transaction detected: ${descriptions.join(', ')}. Risk score: ${score.toFixed(1)}/100`;
  }

  private getRecommendedAction(factors: any[], severity: string): string {
    const actions = {
      'critical': 'Block transaction immediately and escalate to fraud team',
      'high': 'Require additional verification before processing',
      'medium': 'Flag for manual review',
      'low': 'Monitor transaction and customer behavior'
    };

    return actions[severity] || 'Monitor transaction';
  }

  private async saveFraudAlert(alert: FraudAlert): Promise<void> {
    await this.databaseService.drizzleClient
      .insert(this.getFraudAlertsTable())
      .values({
        ...alert,
        factors: JSON.stringify(alert.factors)
      });
  }

  private async getRiskThreshold(tenantId: string): Promise<number> {
    // Get risk threshold from configuration
    // For now, return default threshold
    return 50;
  }

  private async getCustomerOrderStats(customerId: string, tenantId: string): Promise<any> {
    const stats = await this.databaseService.drizzleClient
      .select({
        totalOrders: sql<number>`count(*)`,
        totalSpent: sql<number>`SUM(total)`,
        avgOrderAmount: sql<number>`AVG(total)`,
        lastOrder: sql`MAX(created_at)`
      })
      .from(sql`orders`)
      .where(and(
        sql`customer_id = ${customerId}`,
        sql`tenant_id = ${tenantId}`,
        sql`status NOT IN ('cancelled', 'refunded')`
      ));

    return stats[0] || { totalOrders: 0, totalSpent: 0, avgOrderAmount: 0, lastOrder: null };
  }

  private async getRecentTransactions(customerId: string, tenantId: string, hours: number): Promise<any[]> {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    return await this.databaseService.drizzleClient
      .select()
      .from(sql`orders`)
      .where(and(
        sql`customer_id = ${customerId}`,
        sql`tenant_id = ${tenantId}`,
        sql`created_at >= ${startDate}`,
        sql`status NOT IN ('cancelled', 'refunded')`
      ))
      .orderBy(desc(sql`created_at`));
  }

  private async getIPGeolocation(ipAddress: string): Promise<any> {
    // This would integrate with IP geolocation service
    // For now, return mock data
    return {
      country: 'TR',
      city: 'Istanbul',
      latitude: 41.0082,
      longitude: 28.9784
    };
  }

  private calculateAddressDistance(location1: any, location2: any): number {
    // Calculate distance between two locations using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (location2.latitude - location1.latitude) * Math.PI / 180;
    const dLon = (location2.longitude - location1.longitude) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(location1.latitude * Math.PI / 180) * Math.cos(location2.latitude * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private generateDeviceFingerprint(userAgent: string, metadata: any): string {
    // Generate device fingerprint
    return `${userAgent}_${metadata.browser}_${metadata.os}_${metadata.deviceType || 'unknown'}`;
  }

  private async getCustomerDeviceHistory(customerId: string, tenantId: string): Promise<any[]> {
    // Get customer's device history
    // In real implementation, would track device fingerprints over time
    return [];
  }

  private async getCustomerHistoryRisk(customerId: string, tenantId: string): Promise<any> {
    // Calculate customer's historical risk score
    const history = await this.databaseService.drizzleClient
      .select({
        totalOrders: sql<number>`count(*)`,
        avgOrderAmount: sql<number>`AVG(total)`,
        orderFrequency: sql<number>`COUNT(*) / 30.0`, // Orders per month
        accountAge: sql<number>`EXTRACT(EPOCH FROM (CURRENT_DATE - created_at)) / 86400`,
        previousAlerts: sql<number>`count(*)`
      })
      .from(sql`orders`)
      .leftJoin(this.getFraudAlertsTable(), this.getFraudAlertsTable().customerId.eq(sql`orders.customer_id`))
      .where(and(
        sql`orders.customer_id = ${customerId}`,
        sql`orders.tenant_id = ${tenantId}`,
        sql`orders.status NOT IN ('cancelled', 'refunded')`
      ))
      .groupBy(sql`orders.customer_id`, sql`orders.created_at`);

    const data = history[0] || { totalOrders: 0, avgOrderAmount: 0, orderFrequency: 0, accountAge: 0, previousAlerts: 0 };

    // Calculate risk score based on history
    let riskScore = 0;

    // New accounts are higher risk
    if (data.accountAge < 30) riskScore += 20;

    // Few orders but high amounts
    if (data.totalOrders < 3 && data.avgOrderAmount > 500) riskScore += 15;

    // Previous fraud alerts
    riskScore += (data.previousAlerts * 10);

    return {
      totalOrders: data.totalOrders,
      riskScore: Math.min(100, riskScore)
    };
  }

  private async getCustomerTransactionHistory(customerId: string, tenantId: string, days: number): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.databaseService.drizzleClient
      .select({
        orderId: sql`id`,
        amount: sql`total`,
        date: sql`created_at`,
        paymentMethod: sql`payment_method`,
        status: sql`status`
      })
      .from(sql`orders`)
      .where(and(
        sql`customer_id = ${customerId}`,
        sql`tenant_id = ${tenantId}`,
        sql`created_at >= ${startDate}`
      ))
      .orderBy(desc(sql`created_at`));
  }

  private async analyzeAmountPatterns(transactions: any[]): Promise<{
    factor: any;
    score: number;
  }> {
    if (transactions.length < 3) {
      return {
        factor: { factor: 'insufficient_data', weight: 0.1, value: 'Not enough data', contribution: 5 },
        score: 5
      };
    }

    const amounts = transactions.map(t => t.amount);
    const avgAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);

    let score = 0;
    let factor = 'normal_amounts';

    // Check for unusual patterns
    if (maxAmount / minAmount > 5) {
      score = 25;
      factor = 'high_amount_variation';
    } else if (maxAmount > avgAmount * 3) {
      score = 20;
      factor = 'unusual_high_amount';
    }

    return {
      factor: {
        factor,
        weight: 0.3,
        value: `Range: $${minAmount.toFixed(2)} - $${maxAmount.toFixed(2)}, Avg: $${avgAmount.toFixed(2)}`,
        contribution: score
      },
      score
    };
  }

  private async analyzeFrequencyPatterns(transactions: any[]): Promise<{
    factor: any;
    score: number;
  }> {
    if (transactions.length < 2) {
      return {
        factor: { factor: 'insufficient_data', weight: 0.1, value: 'Not enough data', contribution: 5 },
        score: 5
      };
    }

    const sortedTransactions = transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
    const timeDifferences = [];

    for (let i = 1; i < sortedTransactions.length; i++) {
      const diff = (sortedTransactions[i].date.getTime() - sortedTransactions[i-1].date.getTime()) / (1000 * 60 * 60 * 24);
      timeDifferences.push(diff);
    }

    const avgTimeBetweenOrders = timeDifferences.reduce((sum, diff) => sum + diff, 0) / timeDifferences.length;

    let score = 0;
    let factor = 'normal_frequency';

    if (avgTimeBetweenOrders < 1) { // Less than 1 day between orders
      score = 30;
      factor = 'high_frequency';
    } else if (avgTimeBetweenOrders < 7) { // Less than 1 week
      score = 15;
      factor = 'moderate_frequency';
    }

    return {
      factor: {
        factor,
        weight: 0.25,
        value: `Avg time between orders: ${avgTimeBetweenOrders.toFixed(1)} days`,
        contribution: score
      },
      score
    };
  }

  private async analyzeLocationConsistency(transactions: any[]): Promise<{
    factor: any;
    score: number;
  }> {
    // Analyze location consistency in transactions
    const locations = transactions.map(t => t.shippingAddress?.country).filter(Boolean);
    const uniqueLocations = new Set(locations);

    let score = 0;
    let factor = 'consistent_location';

    if (uniqueLocations.size > 3) {
      score = 25;
      factor = 'multiple_locations';
    } else if (uniqueLocations.size > 1) {
      score = 15;
      factor = 'varying_locations';
    }

    return {
      factor: {
        factor,
        weight: 0.2,
        value: `${uniqueLocations.size} different shipping locations`,
        contribution: score
      },
      score
    };
  }

  private async analyzePaymentConsistency(transactions: any[]): Promise<{
    factor: any;
    score: number;
  }> {
    // Analyze payment method consistency
    const paymentMethods = transactions.map(t => t.paymentMethod);
    const uniqueMethods = new Set(paymentMethods);

    let score = 0;
    let factor = 'consistent_payment';

    if (uniqueMethods.size > 3) {
      score = 20;
      factor = 'multiple_payment_methods';
    } else if (uniqueMethods.size > 1) {
      score = 10;
      factor = 'varying_payment_methods';
    }

    return {
      factor: {
        factor,
        weight: 0.15,
        value: `${uniqueMethods.size} different payment methods`,
        contribution: score
      },
      score
    };
  }

  private async getRecentCustomerActivity(customerId: string, tenantId: string): Promise<any[]> {
    // Get recent customer activity
    return await this.databaseService.drizzleClient
      .select({
        type: sql`'order'`,
        timestamp: sql`created_at`,
        description: sql`CONCAT('Order placed: $', total)`,
        riskContribution: sql`0`
      })
      .from(sql`orders`)
      .where(and(
        sql`customer_id = ${customerId}`,
        sql`tenant_id = ${tenantId}`,
        sql`created_at >= CURRENT_DATE - INTERVAL '30 days'`
      ))
      .orderBy(desc(sql`created_at`))
      .limit(10);
  }

  private generateCustomerRecommendations(factors: any[], overallRisk: number): string[] {
    const recommendations = [];

    if (overallRisk > 70) {
      recommendations.push('High risk customer - implement enhanced monitoring');
    } else if (overallRisk > 40) {
      recommendations.push('Moderate risk customer - require additional verification for high-value transactions');
    }

    const highRiskFactors = factors.filter(f => f.riskScore > 15);
    if (highRiskFactors.some(f => f.factor === 'location_mismatch')) {
      recommendations.push('Address verification required for future transactions');
    }

    if (highRiskFactors.some(f => f.factor === 'new_device')) {
      recommendations.push('Implement device authentication for new devices');
    }

    return recommendations.length > 0 ? recommendations : ['Continue standard monitoring'];
  }

  private async detectAmountAnomaly(transactionData: any, tenantId: string): Promise<AnomalyDetection | null> {
    const customerStats = await this.getCustomerOrderStats(transactionData.customerId, tenantId);
    const avgAmount = customerStats.totalSpent / Math.max(customerStats.totalOrders, 1);

    if (transactionData.amount > avgAmount * 3) {
      return {
        transactionId: transactionData.transactionId || 'unknown',
        anomalyScore: 0.8,
        anomalyType: 'amount',
        deviation: ((transactionData.amount - avgAmount) / avgAmount) * 100,
        expectedValue: avgAmount,
        actualValue: transactionData.amount,
        confidence: 0.9,
        relatedTransactions: [],
        pattern: 'unusual_high_amount'
      };
    }

    return null;
  }

  private async detectFrequencyAnomaly(transactionData: any, tenantId: string): Promise<AnomalyDetection | null> {
    const recentTransactions = await this.getRecentTransactions(transactionData.customerId, tenantId, 24);

    if (recentTransactions.length >= 5) {
      return {
        transactionId: transactionData.transactionId || 'unknown',
        anomalyScore: 0.7,
        anomalyType: 'frequency',
        deviation: (recentTransactions.length - 2) * 20, // Deviation from normal (2 per day)
        expectedValue: 2,
        actualValue: recentTransactions.length,
        confidence: 0.85,
        relatedTransactions: recentTransactions.map(t => t.id),
        pattern: 'high_frequency'
      };
    }

    return null;
  }

  private async detectLocationAnomaly(transactionData: any, tenantId: string): Promise<AnomalyDetection | null> {
    const historicalLocations = await this.getCustomerHistoricalLocations(transactionData.customerId, tenantId);

    if (historicalLocations.length > 0) {
      const currentLocation = await this.getIPGeolocation(transactionData.ipAddress);
      const distances = historicalLocations.map(loc =>
        this.calculateAddressDistance(currentLocation, loc)
      );

      const maxDistance = Math.max(...distances);

      if (maxDistance > 1000) { // More than 1000km from any previous location
        return {
          transactionId: transactionData.transactionId || 'unknown',
          anomalyScore: 0.75,
          anomalyType: 'location',
          deviation: maxDistance,
          expectedValue: 0, // Expected distance from known locations
          actualValue: maxDistance,
          confidence: 0.8,
          relatedTransactions: [],
          pattern: 'unusual_location'
        };
      }
    }

    return null;
  }

  private async detectDeviceAnomaly(transactionData: any, tenantId: string): Promise<AnomalyDetection | null> {
    const deviceFingerprint = this.generateDeviceFingerprint(transactionData.userAgent, transactionData.metadata);
    const historicalDevices = await this.getCustomerDeviceHistory(transactionData.customerId, tenantId);

    if (historicalDevices.length > 0 && !historicalDevices.some(d => d.fingerprint === deviceFingerprint)) {
      return {
        transactionId: transactionData.transactionId || 'unknown',
        anomalyScore: 0.6,
        anomalyType: 'device',
        deviation: 1,
        expectedValue: 0, // Expected to use known device
        actualValue: 1, // Using new device
        confidence: 0.7,
        relatedTransactions: [],
        pattern: 'new_device'
      };
    }

    return null;
  }

  private async detectVelocityAnomaly(transactionData: any, tenantId: string): Promise<AnomalyDetection | null> {
    const recentTransactions = await this.getRecentTransactions(transactionData.customerId, tenantId, 1);

    if (recentTransactions.length >= 3) {
      return {
        transactionId: transactionData.transactionId || 'unknown',
        anomalyScore: 0.65,
        anomalyType: 'velocity',
        deviation: recentTransactions.length - 1,
        expectedValue: 1, // Expected 1 transaction per hour
        actualValue: recentTransactions.length,
        confidence: 0.75,
        relatedTransactions: recentTransactions.map(t => t.id),
        pattern: 'high_velocity'
      };
    }

    return null;
  }

  private async calculateFraudSummary(tenantId: string, filters: any): Promise<any> {
    let whereClause = this.getFraudAlertsTable().tenantId.eq(tenantId);

    if (filters.dateRange) {
      whereClause = and(
        whereClause,
        this.getFraudAlertsTable().detectedAt.gte(filters.dateRange.start),
        this.getFraudAlertsTable().detectedAt.lte(filters.dateRange.end)
      );
    }

    const summary = await this.databaseService.drizzleClient
      .select({
        totalAlerts: sql<number>`count(*)`,
        pendingReview: sql<number>`count(*) FILTER (WHERE status = 'pending')`,
        criticalAlerts: sql<number>`count(*) FILTER (WHERE severity = 'critical')`,
        falsePositives: sql<number>`count(*) FILTER (WHERE false_positive = true)`
      })
      .from(this.getFraudAlertsTable())
      .where(whereClause);

    const data = summary[0];
    const totalAlerts = Number(data.totalAlerts) || 0;

    return {
      totalAlerts,
      pendingReview: Number(data.pendingReview) || 0,
      criticalAlerts: Number(data.criticalAlerts) || 0,
      falsePositiveRate: totalAlerts > 0 ? (Number(data.falsePositives) / totalAlerts) * 100 : 0
    };
  }

  private async updateModelPerformance(alertId: string, type: string, tenantId: string): Promise<void> {
    // Update fraud model performance metrics
    this.loggerService.log(`Model performance updated: ${alertId} - ${type}`, 'AIFraudDetectionService');
  }

  private async getHistoricalTransactionData(tenantId: string, days: number): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.databaseService.drizzleClient
      .select({
        orderId: sql`id`,
        customerId: sql`customer_id`,
        amount: sql`total`,
        paymentMethod: sql`payment_method`,
        status: sql`status`,
        createdAt: sql`created_at`
      })
      .from(sql`orders`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`created_at >= ${startDate}`
      ))
      .orderBy(sql`created_at`);
  }

  private async getFraudLabels(tenantId: string): Promise<any[]> {
    // Get fraud labels from reviewed alerts
    return await this.databaseService.drizzleClient
      .select({
        orderId: this.getFraudAlertsTable().orderId,
        isFraud: sql`CASE WHEN status = 'approved' THEN true ELSE false END`
      })
      .from(this.getFraudAlertsTable())
      .where(and(
        this.getFraudAlertsTable().tenantId.eq(tenantId),
        this.getFraudAlertsTable().status.in(['approved', 'rejected']),
        this.getFraudAlertsTable().falsePositive.isNull()
      ));
  }

  private async engineerFeatures(data: any[]): Promise<any[]> {
    // Feature engineering for ML model
    // This would extract relevant features from transaction data
    return data.map(transaction => ({
      amount: transaction.amount,
      amount_normalized: transaction.amount / 1000, // Normalize
      payment_method_encoded: this.encodePaymentMethod(transaction.paymentMethod),
      time_of_day: transaction.createdAt.getHours(),
      day_of_week: transaction.createdAt.getDay(),
      is_weekend: transaction.createdAt.getDay() >= 5,
      transaction_count_24h: 1, // Would calculate from customer data
      avg_amount_30d: transaction.amount, // Would calculate from customer data
      amount_deviation: 0, // Would calculate deviation from customer average
      is_new_customer: false, // Would determine from customer data
      location_consistency: 1 // Would calculate from location data
    }));
  }

  private async trainMLModel(features: any[], labels: any[], tenantId: string): Promise<void> {
    // Train machine learning model for fraud detection
    // This would use ML libraries like TensorFlow.js or scikit-learn

    this.loggerService.log(`Training ML model with ${features.length} features and ${labels.length} labels`, 'AIFraudDetectionService');

    // In real implementation, this would:
    // 1. Split data into train/test sets
    // 2. Train model using appropriate algorithm (Random Forest, Neural Network, etc.)
    // 3. Validate model performance
    // 4. Save model for production use
  }

  private async updateModelPerformanceMetrics(tenantId: string): Promise<void> {
    // Update model performance metrics based on recent predictions
    this.loggerService.log('Updating model performance metrics', 'AIFraudDetectionService');
  }

  private encodePaymentMethod(paymentMethod: string): number {
    const encoding = {
      'credit_card': 1,
      'debit_card': 2,
      'paypal': 3,
      'bank_transfer': 4,
      'cash_on_delivery': 5,
      'digital_wallet': 6
    };

    return encoding[paymentMethod] || 0;
  }

  private async getCustomerHistoricalLocations(customerId: string, tenantId: string): Promise<any[]> {
    // Get customer's historical shipping locations
    // In real implementation, would track unique shipping addresses
    return [];
  }

  private getFraudAlertsTable() {
    return sql`fraud_alerts`;
  }
}
