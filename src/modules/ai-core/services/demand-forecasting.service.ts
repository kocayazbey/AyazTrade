import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.module';

interface DemandForecast {
  id: string;
  productId: string;
  period: string;
  forecastedDemand: number;
  confidence: number;
  method: 'arima' | 'exponential_smoothing' | 'seasonal' | 'ml_model';
  parameters: Record<string, any>;
  historicalData: Array<{
    date: string;
    demand: number;
  }>;
  forecastData: Array<{
    date: string;
    forecast: number;
    lowerBound: number;
    upperBound: number;
  }>;
  accuracy: number;
  generatedAt: Date;
  validUntil: Date;
}

interface SeasonalPattern {
  productId: string;
  pattern: 'none' | 'weekly' | 'monthly' | 'yearly';
  strength: number;
  peakPeriods: string[];
  lowPeriods: string[];
  detectedAt: Date;
}

interface ForecastAccuracy {
  productId: string;
  method: string;
  mape: number;
  rmse: number;
  mae: number;
  accuracy: number;
  evaluatedAt: Date;
}

@Injectable()
export class DemandForecastingService {
  private readonly logger = new Logger(DemandForecastingService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: any,
  ) {}

  async generateDemandForecast(
    productId: string,
    period: string = '30d',
    method: 'arima' | 'exponential_smoothing' | 'seasonal' | 'ml_model' = 'ml_model'
  ): Promise<DemandForecast> {
    this.logger.log(`Generating demand forecast for product ${productId} using ${method}`);
    
    const historicalData = await this.getHistoricalDemandData(productId, period);
    const seasonalPattern = await this.detectSeasonalPattern(productId, historicalData);
    
    let forecastData: any[];
    let confidence: number;
    let parameters: Record<string, any>;
    
    switch (method) {
      case 'arima':
        ({ forecastData, confidence, parameters } = await this.generateARIMAForecast(historicalData));
        break;
      case 'exponential_smoothing':
        ({ forecastData, confidence, parameters } = await this.generateExponentialSmoothingForecast(historicalData));
        break;
      case 'seasonal':
        ({ forecastData, confidence, parameters } = await this.generateSeasonalForecast(historicalData, seasonalPattern));
        break;
      case 'ml_model':
        ({ forecastData, confidence, parameters } = await this.generateMLForecast(historicalData, seasonalPattern));
        break;
    }
    
    const accuracy = await this.calculateForecastAccuracy(productId, method);
    
    const forecast: DemandForecast = {
      id: `forecast-${Date.now()}`,
      productId,
      period,
      forecastedDemand: forecastData.reduce((sum, f) => sum + f.forecast, 0),
      confidence,
      method,
      parameters,
      historicalData,
      forecastData,
      accuracy,
      generatedAt: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };
    
    await this.saveDemandForecast(forecast);
    
    this.logger.log(`Demand forecast generated for product ${productId}: ${forecast.forecastedDemand} units`);
    return forecast;
  }

  async getDemandForecasts(productId?: string, method?: string): Promise<DemandForecast[]> {
    let query = 'SELECT * FROM demand_forecasts';
    const params = [];
    
    if (productId) {
      query += ' WHERE product_id = $1';
      params.push(productId);
    }
    
    if (method) {
      query += productId ? ' AND method = $2' : ' WHERE method = $1';
      params.push(method);
    }
    
    query += ' ORDER BY generated_at DESC';
    
    const result = await this.db.execute(query, params);
    
    return result.rows.map(row => ({
      ...row,
      parameters: JSON.parse(row.parameters || '{}'),
      historicalData: JSON.parse(row.historical_data || '[]'),
      forecastData: JSON.parse(row.forecast_data || '[]')
    }));
  }

  async detectSeasonalPattern(productId: string, historicalData: any[]): Promise<SeasonalPattern> {
    this.logger.log(`Detecting seasonal pattern for product ${productId}`);
    
    const pattern = this.analyzeSeasonality(historicalData);
    
    const seasonalPattern: SeasonalPattern = {
      productId,
      pattern: pattern.type,
      strength: pattern.strength,
      peakPeriods: pattern.peakPeriods,
      lowPeriods: pattern.lowPeriods,
      detectedAt: new Date()
    };
    
    await this.saveSeasonalPattern(seasonalPattern);
    
    this.logger.log(`Seasonal pattern detected for product ${productId}: ${pattern.type}`);
    return seasonalPattern;
  }

  async calculateForecastAccuracy(productId: string, method: string): Promise<number> {
    const result = await this.db.execute(`
      SELECT * FROM forecast_accuracy
      WHERE product_id = $1 AND method = $2
      ORDER BY evaluated_at DESC
      LIMIT 1
    `, [productId, method]);
    
    if (result.rows.length === 0) {
      return 0.8; // Default accuracy
    }
    
    return parseFloat(result.rows[0].accuracy);
  }

  async getForecastAnalytics(period: string = '30d'): Promise<{
    totalForecasts: number;
    averageAccuracy: number;
    methodPerformance: Array<{
      method: string;
      accuracy: number;
      usage: number;
    }>;
    seasonalPatterns: number;
    topProducts: Array<{
      productId: string;
      forecastedDemand: number;
      accuracy: number;
    }>;
  }> {
    const result = await this.db.execute(`
      SELECT 
        COUNT(*) as total_forecasts,
        AVG(accuracy) as average_accuracy
      FROM demand_forecasts
      WHERE generated_at >= NOW() - INTERVAL '${period}'
    `);
    
    const stats = result.rows[0];
    
    const methodResult = await this.db.execute(`
      SELECT 
        method,
        AVG(accuracy) as avg_accuracy,
        COUNT(*) as usage_count
      FROM demand_forecasts
      WHERE generated_at >= NOW() - INTERVAL '${period}'
      GROUP BY method
    `);
    
    const methodPerformance = methodResult.rows.map(row => ({
      method: row.method,
      accuracy: parseFloat(row.avg_accuracy) || 0,
      usage: parseInt(row.usage_count) || 0
    }));
    
    const patternsResult = await this.db.execute(`
      SELECT COUNT(*) as pattern_count
      FROM seasonal_patterns
      WHERE detected_at >= NOW() - INTERVAL '${period}'
    `);
    
    const seasonalPatterns = parseInt(patternsResult.rows[0]?.pattern_count) || 0;
    
    const topProductsResult = await this.db.execute(`
      SELECT 
        product_id,
        forecasted_demand,
        accuracy
      FROM demand_forecasts
      WHERE generated_at >= NOW() - INTERVAL '${period}'
      ORDER BY forecasted_demand DESC
      LIMIT 10
    `);
    
    const topProducts = topProductsResult.rows.map(row => ({
      productId: row.product_id,
      forecastedDemand: parseFloat(row.forecasted_demand) || 0,
      accuracy: parseFloat(row.accuracy) || 0
    }));
    
    return {
      totalForecasts: parseInt(stats.total_forecasts) || 0,
      averageAccuracy: parseFloat(stats.average_accuracy) || 0,
      methodPerformance,
      seasonalPatterns,
      topProducts
    };
  }

  private async generateARIMAForecast(historicalData: any[]): Promise<{
    forecastData: any[];
    confidence: number;
    parameters: Record<string, any>;
  }> {
    // Mock ARIMA implementation
    const values = historicalData.map(d => d.demand);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const trend = this.calculateTrend(values);
    const seasonality = this.calculateSeasonality(values);
    
    const forecastData = [];
    const startDate = new Date(historicalData[historicalData.length - 1].date);
    
    for (let i = 1; i <= 30; i++) {
      const forecastDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const forecast = mean + (trend * i) + (seasonality * Math.sin(2 * Math.PI * i / 7));
      const variance = Math.sqrt(mean) * 0.1;
      
      forecastData.push({
        date: forecastDate.toISOString().split('T')[0],
        forecast: Math.max(0, forecast),
        lowerBound: Math.max(0, forecast - 1.96 * variance),
        upperBound: forecast + 1.96 * variance
      });
    }
    
    return {
      forecastData,
      confidence: 0.85,
      parameters: { p: 1, d: 1, q: 1, trend, seasonality }
    };
  }

  private async generateExponentialSmoothingForecast(historicalData: any[]): Promise<{
    forecastData: any[];
    confidence: number;
    parameters: Record<string, any>;
  }> {
    // Mock Exponential Smoothing implementation
    const alpha = 0.3; // Smoothing parameter
    const values = historicalData.map(d => d.demand);
    const lastValue = values[values.length - 1];
    const trend = this.calculateTrend(values);
    
    const forecastData = [];
    const startDate = new Date(historicalData[historicalData.length - 1].date);
    
    for (let i = 1; i <= 30; i++) {
      const forecastDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const forecast = lastValue + (trend * i * alpha);
      const variance = Math.sqrt(lastValue) * 0.15;
      
      forecastData.push({
        date: forecastDate.toISOString().split('T')[0],
        forecast: Math.max(0, forecast),
        lowerBound: Math.max(0, forecast - 1.96 * variance),
        upperBound: forecast + 1.96 * variance
      });
    }
    
    return {
      forecastData,
      confidence: 0.80,
      parameters: { alpha, trend }
    };
  }

  private async generateSeasonalForecast(historicalData: any[], seasonalPattern: SeasonalPattern): Promise<{
    forecastData: any[];
    confidence: number;
    parameters: Record<string, any>;
  }> {
    // Mock Seasonal forecasting
    const values = historicalData.map(d => d.demand);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const seasonalFactors = this.calculateSeasonalFactors(values, seasonalPattern.pattern);
    
    const forecastData = [];
    const startDate = new Date(historicalData[historicalData.length - 1].date);
    
    for (let i = 1; i <= 30; i++) {
      const forecastDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const seasonalFactor = this.getSeasonalFactor(forecastDate, seasonalFactors, seasonalPattern.pattern);
      const forecast = mean * seasonalFactor;
      const variance = Math.sqrt(mean) * 0.12;
      
      forecastData.push({
        date: forecastDate.toISOString().split('T')[0],
        forecast: Math.max(0, forecast),
        lowerBound: Math.max(0, forecast - 1.96 * variance),
        upperBound: forecast + 1.96 * variance
      });
    }
    
    return {
      forecastData,
      confidence: 0.82,
      parameters: { seasonalFactors, pattern: seasonalPattern.pattern }
    };
  }

  private async generateMLForecast(historicalData: any[], seasonalPattern: SeasonalPattern): Promise<{
    forecastData: any[];
    confidence: number;
    parameters: Record<string, any>;
  }> {
    // Mock ML model implementation
    const values = historicalData.map(d => d.demand);
    const features = this.extractFeatures(historicalData);
    const model = this.trainMLModel(features, values);
    
    const forecastData = [];
    const startDate = new Date(historicalData[historicalData.length - 1].date);
    
    for (let i = 1; i <= 30; i++) {
      const forecastDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const features = this.extractForecastFeatures(forecastDate, historicalData, seasonalPattern);
      const forecast = this.predictMLModel(model, features);
      const variance = Math.sqrt(forecast) * 0.08;
      
      forecastData.push({
        date: forecastDate.toISOString().split('T')[0],
        forecast: Math.max(0, forecast),
        lowerBound: Math.max(0, forecast - 1.96 * variance),
        upperBound: forecast + 1.96 * variance
      });
    }
    
    return {
      forecastData,
      confidence: 0.90,
      parameters: { model_type: 'neural_network', features: Object.keys(features) }
    };
  }

  private analyzeSeasonality(historicalData: any[]): {
    type: 'none' | 'weekly' | 'monthly' | 'yearly';
    strength: number;
    peakPeriods: string[];
    lowPeriods: string[];
  } {
    const values = historicalData.map(d => d.demand);
    const weeklyVariance = this.calculateWeeklyVariance(values);
    const monthlyVariance = this.calculateMonthlyVariance(values);
    const yearlyVariance = this.calculateYearlyVariance(values);
    
    let type: 'none' | 'weekly' | 'monthly' | 'yearly' = 'none';
    let strength = 0;
    
    if (weeklyVariance > 0.3) {
      type = 'weekly';
      strength = weeklyVariance;
    } else if (monthlyVariance > 0.4) {
      type = 'monthly';
      strength = monthlyVariance;
    } else if (yearlyVariance > 0.5) {
      type = 'yearly';
      strength = yearlyVariance;
    }
    
    const peakPeriods = this.identifyPeakPeriods(historicalData, type);
    const lowPeriods = this.identifyLowPeriods(historicalData, type);
    
    return { type, strength, peakPeriods, lowPeriods };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private calculateSeasonality(values: number[]): number {
    if (values.length < 7) return 0;
    
    const weeklyAverages = [];
    for (let i = 0; i < 7; i++) {
      const dayValues = values.filter((_, index) => index % 7 === i);
      weeklyAverages.push(dayValues.reduce((sum, val) => sum + val, 0) / dayValues.length);
    }
    
    const mean = weeklyAverages.reduce((sum, val) => sum + val, 0) / 7;
    const variance = weeklyAverages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / 7;
    
    return Math.sqrt(variance) / mean;
  }

  private calculateWeeklyVariance(values: number[]): number {
    if (values.length < 14) return 0;
    
    const weeklyGroups = [];
    for (let i = 0; i < values.length; i += 7) {
      weeklyGroups.push(values.slice(i, i + 7));
    }
    
    const weeklyTotals = weeklyGroups.map(group => group.reduce((sum, val) => sum + val, 0));
    const mean = weeklyTotals.reduce((sum, val) => sum + val, 0) / weeklyTotals.length;
    const variance = weeklyTotals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / weeklyTotals.length;
    
    return Math.sqrt(variance) / mean;
  }

  private calculateMonthlyVariance(values: number[]): number {
    if (values.length < 60) return 0;
    
    const monthlyGroups = [];
    for (let i = 0; i < values.length; i += 30) {
      monthlyGroups.push(values.slice(i, i + 30));
    }
    
    const monthlyTotals = monthlyGroups.map(group => group.reduce((sum, val) => sum + val, 0));
    const mean = monthlyTotals.reduce((sum, val) => sum + val, 0) / monthlyTotals.length;
    const variance = monthlyTotals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / monthlyTotals.length;
    
    return Math.sqrt(variance) / mean;
  }

  private calculateYearlyVariance(values: number[]): number {
    if (values.length < 365) return 0;
    
    const yearlyGroups = [];
    for (let i = 0; i < values.length; i += 365) {
      yearlyGroups.push(values.slice(i, i + 365));
    }
    
    const yearlyTotals = yearlyGroups.map(group => group.reduce((sum, val) => sum + val, 0));
    const mean = yearlyTotals.reduce((sum, val) => sum + val, 0) / yearlyTotals.length;
    const variance = yearlyTotals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / yearlyTotals.length;
    
    return Math.sqrt(variance) / mean;
  }

  private identifyPeakPeriods(historicalData: any[], pattern: string): string[] {
    // Mock implementation
    return ['Monday', 'Tuesday', 'Wednesday'];
  }

  private identifyLowPeriods(historicalData: any[], pattern: string): string[] {
    // Mock implementation
    return ['Saturday', 'Sunday'];
  }

  private calculateSeasonalFactors(values: number[], pattern: string): Record<string, number> {
    // Mock implementation
    return {
      'Monday': 1.2,
      'Tuesday': 1.1,
      'Wednesday': 1.0,
      'Thursday': 0.9,
      'Friday': 0.8,
      'Saturday': 0.7,
      'Sunday': 0.6
    };
  }

  private getSeasonalFactor(date: Date, factors: Record<string, number>, pattern: string): number {
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    return factors[dayOfWeek] || 1.0;
  }

  private extractFeatures(historicalData: any[]): any[] {
    // Mock feature extraction
    return historicalData.map((data, index) => ({
      dayOfWeek: new Date(data.date).getDay(),
      month: new Date(data.date).getMonth(),
      demand: data.demand,
      index
    }));
  }

  private trainMLModel(features: any[], values: number[]): any {
    // Mock ML model training
    return {
      type: 'neural_network',
      weights: Array.from({ length: features[0] ? Object.keys(features[0]).length : 4 }, () => Math.random()),
      bias: Math.random()
    };
  }

  private extractForecastFeatures(date: Date, historicalData: any[], seasonalPattern: SeasonalPattern): any {
    return {
      dayOfWeek: date.getDay(),
      month: date.getMonth(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      seasonalStrength: seasonalPattern.strength
    };
  }

  private predictMLModel(model: any, features: any): number {
    // Mock ML prediction
    const weights = model.weights;
    const bias = model.bias;
    const featureValues = Object.values(features);
    
    let prediction = bias;
    for (let i = 0; i < featureValues.length && i < weights.length; i++) {
      prediction += weights[i] * (featureValues[i] as number);
    }
    
    return Math.max(0, prediction);
  }

  private async getHistoricalDemandData(productId: string, period: string): Promise<any[]> {
    const result = await this.db.execute(`
      SELECT 
        DATE(oi.created_at) as date,
        SUM(oi.quantity) as demand
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = $1
        AND o.created_at >= NOW() - INTERVAL '${period}'
      GROUP BY DATE(oi.created_at)
      ORDER BY date ASC
    `, [productId]);
    
    return result.rows.map(row => ({
      date: row.date,
      demand: parseFloat(row.demand) || 0
    }));
  }

  private async saveDemandForecast(forecast: DemandForecast): Promise<void> {
    await this.db.execute(`
      INSERT INTO demand_forecasts (id, product_id, period, forecasted_demand, confidence, method, parameters, historical_data, forecast_data, accuracy, generated_at, valid_until)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      forecast.id,
      forecast.productId,
      forecast.period,
      forecast.forecastedDemand,
      forecast.confidence,
      forecast.method,
      JSON.stringify(forecast.parameters),
      JSON.stringify(forecast.historicalData),
      JSON.stringify(forecast.forecastData),
      forecast.accuracy,
      forecast.generatedAt,
      forecast.validUntil
    ]);
  }

  private async saveSeasonalPattern(pattern: SeasonalPattern): Promise<void> {
    await this.db.execute(`
      INSERT INTO seasonal_patterns (product_id, pattern, strength, peak_periods, low_periods, detected_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (product_id) DO UPDATE SET
        pattern = EXCLUDED.pattern,
        strength = EXCLUDED.strength,
        peak_periods = EXCLUDED.peak_periods,
        low_periods = EXCLUDED.low_periods,
        detected_at = EXCLUDED.detected_at
    `, [
      pattern.productId,
      pattern.pattern,
      pattern.strength,
      JSON.stringify(pattern.peakPeriods),
      JSON.stringify(pattern.lowPeriods),
      pattern.detectedAt
    ]);
  }
}