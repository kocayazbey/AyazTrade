import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { CacheService } from '../../../core/cache/cache.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { sql, eq, and, gte, lte, desc } from 'drizzle-orm';

export interface SentimentAnalysis {
  id: string;
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  scores: {
    positive: number;
    negative: number;
    neutral: number;
  };
  emotions: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    disgust: number;
  };
  keywords: string[];
  topics: string[];
  entities: Array<{
    entity: string;
    type: string;
    sentiment: string;
  }>;
  suggestions: string[];
  metadata: Record<string, any>;
  tenantId: string;
  createdAt: Date;
}

export interface ReviewAnalysis {
  reviewId: string;
  productId?: string;
  customerId?: string;
  rating: number;
  sentiment: SentimentAnalysis;
  themes: string[];
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  responseRequired: boolean;
  responseSuggestion?: string;
}

export interface CustomerFeedbackTrend {
  period: string;
  averageSentiment: number;
  totalReviews: number;
  positiveReviews: number;
  negativeReviews: number;
  neutralReviews: number;
  topComplaints: string[];
  topCompliments: string[];
  emergingIssues: string[];
  sentimentChange: number; // Change from previous period
}

export interface ProductSentiment {
  productId: string;
  productName: string;
  overallSentiment: number;
  reviewCount: number;
  averageRating: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  keyStrengths: string[];
  keyWeaknesses: string[];
  improvementAreas: string[];
  competitorComparison: {
    avgSentiment: number;
    avgRating: number;
    reviewCount: number;
  };
}

export interface SocialMediaMonitoring {
  platform: 'twitter' | 'facebook' | 'instagram' | 'youtube' | 'other';
  mentions: number;
  sentiment: number;
  engagement: number;
  reach: number;
  topHashtags: string[];
  topMentions: string[];
  trendingTopics: string[];
}

@Injectable()
export class AISentimentAnalysisService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly loggerService: LoggerService,
  ) {}

  async analyzeText(text: string, context?: {
    productId?: string;
    customerId?: string;
    source?: string;
    metadata?: Record<string, any>;
  }, tenantId: string = 'default'): Promise<SentimentAnalysis> {
    const cacheKey = `sentiment_analysis:${tenantId}:${text.length}:${context?.productId || 'none'}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      this.loggerService.log(`Analyzing sentiment for text: ${text.substring(0, 100)}...`, 'AISentimentAnalysisService');

      // Preprocess text
      const processedText = this.preprocessText(text);

      // Calculate sentiment scores
      const sentimentScores = await this.calculateSentimentScores(processedText);

      // Determine overall sentiment
      const sentiment = this.determineSentiment(sentimentScores);
      const confidence = Math.max(sentimentScores.positive, sentimentScores.negative, sentimentScores.neutral);

      // Extract emotions
      const emotions = await this.extractEmotions(processedText);

      // Extract keywords and topics
      const keywords = this.extractKeywords(processedText);
      const topics = this.extractTopics(processedText, context?.productId);

      // Extract entities
      const entities = this.extractEntities(processedText);

      // Generate suggestions
      const suggestions = this.generateSuggestions(sentiment, keywords, topics, context);

      const analysis: SentimentAnalysis = {
        id: `sentiment-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        content: text,
        sentiment,
        confidence,
        scores: sentimentScores,
        emotions,
        keywords,
        topics,
        entities,
        suggestions,
        metadata: context?.metadata || {},
        tenantId,
        createdAt: new Date()
      };

      await this.cacheService.set(cacheKey, analysis, 3600); // Cache for 1 hour
      return analysis;

    } catch (error) {
      this.loggerService.error('Error analyzing sentiment', error, 'AISentimentAnalysisService');
      return {
        id: `error-${Date.now()}`,
        content: text,
        sentiment: 'neutral',
        confidence: 0,
        scores: { positive: 0, negative: 0, neutral: 1 },
        emotions: { joy: 0, sadness: 0, anger: 0, fear: 0, surprise: 0, disgust: 0 },
        keywords: [],
        topics: [],
        entities: [],
        suggestions: ['Error analyzing sentiment'],
        metadata: {},
        tenantId,
        createdAt: new Date()
      };
    }
  }

  async analyzeReview(reviewData: {
    reviewId: string;
    content: string;
    rating: number;
    productId?: string;
    customerId?: string;
    source: string;
  }, tenantId: string): Promise<ReviewAnalysis> {
    const cacheKey = `review_analysis:${tenantId}:${reviewData.reviewId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Analyze sentiment
      const sentiment = await this.analyzeText(
        reviewData.content,
        {
          productId: reviewData.productId,
          customerId: reviewData.customerId,
          source: reviewData.source,
          metadata: { rating: reviewData.rating }
        },
        tenantId
      );

      // Extract themes
      const themes = this.extractReviewThemes(reviewData.content, reviewData.rating);

      // Determine if actionable and priority
      const actionable = this.isReviewActionable(sentiment, reviewData.rating);
      const priority = this.determineReviewPriority(sentiment, reviewData.rating);
      const responseRequired = sentiment.sentiment === 'negative' || reviewData.rating <= 2;
      const responseSuggestion = responseRequired ? this.generateResponseSuggestion(sentiment, themes) : undefined;

      const analysis: ReviewAnalysis = {
        reviewId: reviewData.reviewId,
        productId: reviewData.productId,
        customerId: reviewData.customerId,
        rating: reviewData.rating,
        sentiment,
        themes,
        actionable,
        priority,
        responseRequired,
        responseSuggestion
      };

      await this.cacheService.set(cacheKey, analysis, 1800); // Cache for 30 minutes
      return analysis;

    } catch (error) {
      this.loggerService.error(`Error analyzing review: ${reviewData.reviewId}`, error, 'AISentimentAnalysisService');
      return {
        reviewId: reviewData.reviewId,
        productId: reviewData.productId,
        customerId: reviewData.customerId,
        rating: reviewData.rating,
        sentiment: await this.analyzeText(reviewData.content, {}, tenantId),
        themes: [],
        actionable: false,
        priority: 'low',
        responseRequired: false
      };
    }
  }

  async getCustomerFeedbackTrends(
    productId?: string,
    tenantId: string = 'default',
    days: number = 90
  ): Promise<CustomerFeedbackTrend[]> {
    const cacheKey = `feedback_trends:${tenantId}:${productId || 'all'}:${days}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get reviews by time periods
      const trends = await this.calculateFeedbackTrends(productId, tenantId, startDate);

      await this.cacheService.set(cacheKey, trends, 3600); // Cache for 1 hour
      return trends;

    } catch (error) {
      this.loggerService.error('Error getting feedback trends', error, 'AISentimentAnalysisService');
      return [];
    }
  }

  async getProductSentiment(productId: string, tenantId: string): Promise<ProductSentiment> {
    const cacheKey = `product_sentiment:${tenantId}:${productId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Get product reviews
      const reviews = await this.getProductReviews(productId, tenantId);

      if (reviews.length === 0) {
        return {
          productId,
          productName: await this.getProductName(productId),
          overallSentiment: 0,
          reviewCount: 0,
          averageRating: 0,
          sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
          keyStrengths: [],
          keyWeaknesses: [],
          improvementAreas: [],
          competitorComparison: {
            avgSentiment: 0,
            avgRating: 0,
            reviewCount: 0
          }
        };
      }

      // Analyze all reviews
      const reviewAnalyses = await Promise.all(
        reviews.map(review => this.analyzeReview(review, tenantId))
      );

      // Calculate overall metrics
      const overallSentiment = reviewAnalyses.reduce((sum, analysis) =>
        sum + analysis.sentiment.confidence, 0
      ) / reviewAnalyses.length;

      const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

      // Sentiment distribution
      const sentimentDistribution = {
        positive: reviewAnalyses.filter(a => a.sentiment.sentiment === 'positive').length / reviewAnalyses.length,
        negative: reviewAnalyses.filter(a => a.sentiment.sentiment === 'negative').length / reviewAnalyses.length,
        neutral: reviewAnalyses.filter(a => a.sentiment.sentiment === 'neutral').length / reviewAnalyses.length
      };

      // Extract key themes
      const allKeywords = reviewAnalyses.flatMap(a => a.sentiment.keywords);
      const keywordFreq = {};
      allKeywords.forEach(keyword => {
        keywordFreq[keyword] = (keywordFreq[keyword] || 0) + 1;
      });

      const topKeywords = Object.entries(keywordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([keyword]) => keyword);

      // Determine strengths and weaknesses
      const keyStrengths = this.extractKeyStrengths(reviewAnalyses);
      const keyWeaknesses = this.extractKeyWeaknesses(reviewAnalyses);
      const improvementAreas = this.suggestImprovements(keyWeaknesses, topKeywords);

      // Competitor comparison (simplified)
      const competitorComparison = await this.getCompetitorComparison(productId, tenantId);

      const result: ProductSentiment = {
        productId,
        productName: await this.getProductName(productId),
        overallSentiment,
        reviewCount: reviews.length,
        averageRating,
        sentimentDistribution,
        keyStrengths,
        keyWeaknesses,
        improvementAreas,
        competitorComparison
      };

      await this.cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
      return result;

    } catch (error) {
      this.loggerService.error(`Error getting product sentiment: ${productId}`, error, 'AISentimentAnalysisService');
      return {
        productId,
        productName: 'Unknown',
        overallSentiment: 0,
        reviewCount: 0,
        averageRating: 0,
        sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
        keyStrengths: [],
        keyWeaknesses: [],
        improvementAreas: [],
        competitorComparison: {
          avgSentiment: 0,
          avgRating: 0,
          reviewCount: 0
        }
      };
    }
  }

  async monitorSocialMedia(
    keywords: string[],
    platforms: string[],
    tenantId: string,
    hours: number = 24
  ): Promise<SocialMediaMonitoring[]> {
    const cacheKey = `social_monitoring:${tenantId}:${keywords.join(',')}:${platforms.join(',')}:${hours}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // In real implementation, this would integrate with social media APIs
      // For now, return mock data
      const monitoring: SocialMediaMonitoring[] = platforms.map(platform => ({
        platform: platform as any,
        mentions: Math.floor(Math.random() * 1000),
        sentiment: (Math.random() - 0.5) * 2, // -1 to 1
        engagement: Math.floor(Math.random() * 5000),
        reach: Math.floor(Math.random() * 50000),
        topHashtags: keywords.slice(0, 5),
        topMentions: [`@${platform}_user_1`, `@${platform}_user_2`, `@${platform}_user_3`],
        trendingTopics: ['product_launch', 'customer_service', 'quality_issues']
      }));

      await this.cacheService.set(cacheKey, monitoring, 1800); // Cache for 30 minutes
      return monitoring;

    } catch (error) {
      this.loggerService.error('Error monitoring social media', error, 'AISentimentAnalysisService');
      return [];
    }
  }

  async getCustomerSentimentInsights(tenantId: string, days: number = 30): Promise<Array<{
    type: 'trend' | 'issue' | 'opportunity' | 'warning';
    title: string;
    description: string;
    impact: string;
    recommendation: string;
    data: any;
  }>> {
    const cacheKey = `sentiment_insights:${tenantId}:${days}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const insights = [];

      // Analyze sentiment trends
      const trends = await this.getCustomerFeedbackTrends(undefined, tenantId, days);

      if (trends.length >= 2) {
        const recentTrend = trends[0];
        const previousTrend = trends[1];

        if (recentTrend.averageSentiment < previousTrend.averageSentiment - 0.1) {
          insights.push({
            type: 'warning',
            title: 'Declining Customer Sentiment',
            description: `Customer sentiment decreased by ${(previousTrend.averageSentiment - recentTrend.averageSentiment).toFixed(2)} points`,
            impact: 'Potential churn risk and reputation damage',
            recommendation: 'Investigate recent issues and improve customer experience',
            data: { current: recentTrend.averageSentiment, previous: previousTrend.averageSentiment }
          });
        }

        if (recentTrend.negativeReviews > previousTrend.negativeReviews * 1.5) {
          insights.push({
            type: 'issue',
            title: 'Increase in Negative Reviews',
            description: `Negative reviews increased by ${((recentTrend.negativeReviews / previousTrend.negativeReviews - 1) * 100).toFixed(1)}%`,
            impact: 'Customer dissatisfaction and potential revenue loss',
            recommendation: 'Address common complaints and improve product quality',
            data: { current: recentTrend.negativeReviews, previous: previousTrend.negativeReviews }
          });
        }
      }

      // Analyze top complaints
      const topComplaints = await this.getTopComplaints(tenantId, days);
      if (topComplaints.length > 0) {
        insights.push({
          type: 'issue',
          title: 'Common Customer Complaints',
          description: `Top complaints: ${topComplaints.slice(0, 3).join(', ')}`,
          impact: 'Recurring issues affecting customer satisfaction',
          recommendation: 'Focus on resolving these specific issues',
          data: { complaints: topComplaints }
        });
      }

      // Analyze positive trends
      const positiveTrends = await this.getPositiveTrends(tenantId, days);
      if (positiveTrends.length > 0) {
        insights.push({
          type: 'opportunity',
          title: 'Positive Customer Feedback',
          description: `Strong positive feedback on: ${positiveTrends.slice(0, 3).join(', ')}`,
          impact: 'Marketing and product development opportunities',
          recommendation: 'Highlight these strengths in marketing and build upon them',
          data: { strengths: positiveTrends }
        });
      }

      await this.cacheService.set(cacheKey, insights, 3600); // Cache for 1 hour
      return insights;

    } catch (error) {
      this.loggerService.error('Error getting sentiment insights', error, 'AISentimentAnalysisService');
      return [];
    }
  }

  // Private helper methods
  private preprocessText(text: string): string {
    // Text preprocessing: lowercase, remove punctuation, etc.
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async calculateSentimentScores(text: string): Promise<{
    positive: number;
    negative: number;
    neutral: number;
  }> {
    // Calculate sentiment scores using keyword-based approach
    // In real implementation, would use NLP models like BERT or sentiment lexicons

    const positiveWords = ['excellent', 'amazing', 'perfect', 'love', 'great', 'awesome', 'fantastic', 'wonderful', 'best', 'good', 'happy', 'satisfied', 'recommend', 'quality', 'fast', 'reliable', 'helpful', 'professional'];
    const negativeWords = ['terrible', 'awful', 'horrible', 'hate', 'bad', 'worst', 'poor', 'disappointed', 'frustrated', 'angry', 'slow', 'unreliable', 'unhelpful', 'unprofessional', 'broken', 'defective', 'expensive', 'overpriced'];

    const words = text.split(' ');
    let positiveScore = 0;
    let negativeScore = 0;

    for (const word of words) {
      if (positiveWords.includes(word)) positiveScore++;
      if (negativeWords.includes(word)) negativeScore++;
    }

    const totalWords = words.length;
    const positive = Math.min(1, positiveScore / Math.max(totalWords / 10, 1));
    const negative = Math.min(1, negativeScore / Math.max(totalWords / 10, 1));
    const neutral = 1 - positive - negative;

    return {
      positive: Math.max(0, positive),
      negative: Math.max(0, negative),
      neutral: Math.max(0, neutral)
    };
  }

  private determineSentiment(scores: any): 'positive' | 'negative' | 'neutral' {
    if (scores.positive > scores.negative && scores.positive > scores.neutral) return 'positive';
    if (scores.negative > scores.positive && scores.negative > scores.neutral) return 'negative';
    return 'neutral';
  }

  private async extractEmotions(text: string): Promise<any> {
    // Extract emotions using keyword-based approach
    const emotionWords = {
      joy: ['happy', 'excited', 'pleased', 'delighted', 'joyful', 'thrilled'],
      sadness: ['sad', 'disappointed', 'upset', 'unhappy', 'depressed', 'miserable'],
      anger: ['angry', 'frustrated', 'irritated', 'furious', 'annoyed', 'mad'],
      fear: ['worried', 'scared', 'anxious', 'afraid', 'nervous', 'concerned'],
      surprise: ['surprised', 'shocked', 'amazed', 'astonished', 'unexpected'],
      disgust: ['disgusted', 'repulsed', 'grossed out', 'revolted']
    };

    const words = text.toLowerCase().split(' ');
    const emotions = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0,
      disgust: 0
    };

    for (const word of words) {
      for (const [emotion, emotionWords] of Object.entries(emotionWords)) {
        if (emotionWords.includes(word)) {
          emotions[emotion]++;
        }
      }
    }

    // Normalize to 0-1 scale
    const totalEmotions = Object.values(emotions).reduce((sum, count) => sum + count, 0);
    if (totalEmotions > 0) {
      for (const emotion in emotions) {
        emotions[emotion] = emotions[emotion] / totalEmotions;
      }
    }

    return emotions;
  }

  private extractKeywords(text: string): string[] {
    // Extract important keywords
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can'];

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(' ')
      .filter(word => word.length > 3 && !stopWords.includes(word));

    // Count word frequency
    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Return top keywords
    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private extractTopics(text: string, productId?: string): string[] {
    // Extract topics based on content
    const topics = [];

    // Product-related topics
    if (text.includes('delivery') || text.includes('shipping')) topics.push('Delivery');
    if (text.includes('price') || text.includes('cost') || text.includes('expensive')) topics.push('Pricing');
    if (text.includes('quality') || text.includes('defect') || text.includes('broken')) topics.push('Quality');
    if (text.includes('support') || text.includes('service') || text.includes('help')) topics.push('Customer Service');
    if (text.includes('design') || text.includes('look') || text.includes('appearance')) topics.push('Design');
    if (text.includes('package') || text.includes('packaging')) topics.push('Packaging');
    if (text.includes('return') || text.includes('refund')) topics.push('Returns');

    return topics;
  }

  private extractEntities(text: string): Array<{ entity: string; type: string; sentiment: string }> {
    // Extract named entities
    // In real implementation, would use NER (Named Entity Recognition)
    const entities = [];

    // Simple pattern matching for common entities
    const patterns = {
      product: /\b(product|item|model)\s+([A-Za-z0-9-]+)/gi,
      brand: /\b(brand|company|manufacturer)\s+([A-Za-z\s]+)/gi,
      person: /\b(person|customer|user)\s+([A-Za-z\s]+)/gi
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const entity = match.split(' ').slice(1).join(' ');
          entities.push({
            entity,
            type,
            sentiment: 'neutral' // Would analyze sentiment towards entity
          });
        });
      }
    }

    return entities;
  }

  private generateSuggestions(sentiment: string, keywords: string[], topics: string[], context?: any): string[] {
    const suggestions = [];

    if (sentiment === 'negative') {
      suggestions.push('Consider reaching out to the customer for more details');
      suggestions.push('Review internal processes related to mentioned issues');
    } else if (sentiment === 'positive') {
      suggestions.push('Thank the customer for positive feedback');
      suggestions.push('Use positive feedback in marketing materials');
    }

    // Topic-specific suggestions
    if (topics.includes('Quality')) {
      if (sentiment === 'negative') {
        suggestions.push('Investigate quality control processes');
      } else {
        suggestions.push('Highlight quality in product descriptions');
      }
    }

    if (topics.includes('Delivery')) {
      if (sentiment === 'negative') {
        suggestions.push('Review shipping partner performance');
      } else {
        suggestions.push('Promote fast delivery in marketing');
      }
    }

    return suggestions.length > 0 ? suggestions : ['No specific suggestions available'];
  }

  private extractReviewThemes(content: string, rating: number): string[] {
    const themes = [];

    // Rating-based themes
    if (rating >= 4) {
      themes.push('Positive Experience');
    } else if (rating <= 2) {
      themes.push('Negative Experience');
    } else {
      themes.push('Mixed Experience');
    }

    // Content-based themes
    if (content.includes('price') || content.includes('cost')) themes.push('Value for Money');
    if (content.includes('quality')) themes.push('Product Quality');
    if (content.includes('delivery') || content.includes('shipping')) themes.push('Delivery Experience');
    if (content.includes('support') || content.includes('service')) themes.push('Customer Support');
    if (content.includes('design') || content.includes('look')) themes.push('Product Design');

    return themes;
  }

  private isReviewActionable(sentiment: SentimentAnalysis, rating: number): boolean {
    return sentiment.sentiment === 'negative' || rating <= 2 || sentiment.confidence > 0.7;
  }

  private determineReviewPriority(sentiment: SentimentAnalysis, rating: number): 'high' | 'medium' | 'low' {
    if (sentiment.sentiment === 'negative' && rating <= 2) return 'high';
    if (sentiment.sentiment === 'negative' || rating <= 3) return 'medium';
    return 'low';
  }

  private generateResponseSuggestion(sentiment: SentimentAnalysis, themes: string[]): string {
    if (themes.includes('Product Quality')) {
      return 'Thank you for your feedback. We apologize for the quality issue and would like to offer you a replacement or refund.';
    } else if (themes.includes('Delivery Experience')) {
      return 'Thank you for bringing this to our attention. We apologize for the delivery delay and are reviewing our shipping processes.';
    } else if (themes.includes('Customer Support')) {
      return 'Thank you for your feedback. We apologize for any inconvenience and are committed to improving our customer service.';
    } else {
      return 'Thank you for your feedback. We appreciate your input and are always looking for ways to improve.';
    }
  }

  private async calculateFeedbackTrends(productId: string | undefined, tenantId: string, startDate: Date): Promise<CustomerFeedbackTrend[]> {
    // Calculate feedback trends over time
    const trends: CustomerFeedbackTrend[] = [];

    // Weekly trends for the last 12 weeks
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(startDate.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000));

      const weekReviews = await this.getReviewsInDateRange(productId, tenantId, weekStart, weekEnd);

      if (weekReviews.length > 0) {
        const sentiments = weekReviews.map(review => this.analyzeSentiment(review.content));
        const avgSentiment = sentiments.reduce((sum, s) => sum + s.confidence, 0) / sentiments.length;

        const previousWeek = i > 0 ? trends[11 - i + 1] : null;
        const sentimentChange = previousWeek ? avgSentiment - previousWeek.averageSentiment : 0;

        trends.push({
          period: weekStart.toISOString().split('T')[0],
          averageSentiment: avgSentiment,
          totalReviews: weekReviews.length,
          positiveReviews: sentiments.filter(s => s.sentiment === 'positive').length,
          negativeReviews: sentiments.filter(s => s.sentiment === 'negative').length,
          neutralReviews: sentiments.filter(s => s.sentiment === 'neutral').length,
          topComplaints: this.extractTopComplaints(weekReviews),
          topCompliments: this.extractTopCompliments(weekReviews),
          emergingIssues: this.identifyEmergingIssues(weekReviews),
          sentimentChange
        });
      }
    }

    return trends;
  }

  private analyzeSentiment(text: string): any {
    // Simplified sentiment analysis for trends
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'perfect', 'awesome'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'poor', 'disappointed', 'worst'];

    const words = text.toLowerCase().split(' ');
    let positive = 0;
    let negative = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positive++;
      if (negativeWords.includes(word)) negative++;
    });

    const total = positive + negative;
    if (total === 0) return { sentiment: 'neutral', confidence: 0 };

    if (positive > negative) {
      return { sentiment: 'positive', confidence: positive / total };
    } else if (negative > positive) {
      return { sentiment: 'negative', confidence: negative / total };
    } else {
      return { sentiment: 'neutral', confidence: 0.5 };
    }
  }

  private async getTopComplaints(tenantId: string, days: number): Promise<string[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get negative reviews and extract common complaints
    const negativeReviews = await this.databaseService.drizzleClient
      .select({ content: sql`content`, rating: sql`rating` })
      .from(sql`reviews`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`created_at >= ${startDate}`,
        sql`rating <= 2`
      ))
      .orderBy(desc(sql`created_at`))
      .limit(100);

    // Extract common themes from negative reviews
    const complaints = [];
    for (const review of negativeReviews) {
      const themes = this.extractReviewThemes(review.content, review.rating);
      complaints.push(...themes.filter(theme => theme.includes('Negative')));
    }

    // Count frequency of complaints
    const complaintFreq = {};
    complaints.forEach(complaint => {
      complaintFreq[complaint] = (complaintFreq[complaint] || 0) + 1;
    });

    return Object.entries(complaintFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([complaint]) => complaint);
  }

  private async getPositiveTrends(tenantId: string, days: number): Promise<string[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get positive reviews and extract common themes
    const positiveReviews = await this.databaseService.drizzleClient
      .select({ content: sql`content`, rating: sql`rating` })
      .from(sql`reviews`)
      .where(and(
        sql`tenant_id = ${tenantId}`,
        sql`created_at >= ${startDate}`,
        sql`rating >= 4`
      ))
      .orderBy(desc(sql`created_at`))
      .limit(100);

    // Extract common themes from positive reviews
    const compliments = [];
    for (const review of positiveReviews) {
      const themes = this.extractReviewThemes(review.content, review.rating);
      compliments.push(...themes.filter(theme => theme.includes('Positive')));
    }

    // Count frequency of compliments
    const complimentFreq = {};
    compliments.forEach(compliment => {
      complimentFreq[compliment] = (complimentFreq[compliment] || 0) + 1;
    });

    return Object.entries(complimentFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([compliment]) => compliment);
  }

  private async getProductReviews(productId: string, tenantId: string): Promise<any[]> {
    return await this.databaseService.drizzleClient
      .select({
        reviewId: sql`id`,
        content: sql`content`,
        rating: sql`rating`,
        customerId: sql`customer_id`,
        createdAt: sql`created_at`
      })
      .from(sql`reviews`)
      .where(and(
        sql`product_id = ${productId}`,
        sql`tenant_id = ${tenantId}`,
        sql`created_at >= CURRENT_DATE - INTERVAL '365 days'`
      ))
      .orderBy(desc(sql`created_at`))
      .limit(1000);
  }

  private async getProductName(productId: string): Promise<string> {
    const products = await this.databaseService.drizzleClient
      .select({ name: sql`name` })
      .from(sql`products`)
      .where(sql`id = ${productId}`)
      .limit(1);

    return products[0]?.name || 'Unknown Product';
  }

  private extractKeyStrengths(analyses: ReviewAnalysis[]): string[] {
    // Extract common positive themes
    const positiveReviews = analyses.filter(a => a.sentiment.sentiment === 'positive');
    const allKeywords = positiveReviews.flatMap(a => a.sentiment.keywords);

    const keywordFreq = {};
    allKeywords.forEach(keyword => {
      keywordFreq[keyword] = (keywordFreq[keyword] || 0) + 1;
    });

    return Object.entries(keywordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([keyword]) => keyword);
  }

  private extractKeyWeaknesses(analyses: ReviewAnalysis[]): string[] {
    // Extract common negative themes
    const negativeReviews = analyses.filter(a => a.sentiment.sentiment === 'negative');
    const allKeywords = negativeReviews.flatMap(a => a.sentiment.keywords);

    const keywordFreq = {};
    allKeywords.forEach(keyword => {
      keywordFreq[keyword] = (keywordFreq[keyword] || 0) + 1;
    });

    return Object.entries(keywordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([keyword]) => keyword);
  }

  private suggestImprovements(weaknesses: string[], keywords: string[]): string[] {
    const improvements = [];

    if (weaknesses.includes('quality')) {
      improvements.push('Improve product quality control processes');
    }

    if (weaknesses.includes('delivery') || weaknesses.includes('shipping')) {
      improvements.push('Optimize delivery and shipping processes');
    }

    if (weaknesses.includes('price') || weaknesses.includes('expensive')) {
      improvements.push('Review pricing strategy and consider competitive pricing');
    }

    if (weaknesses.includes('support') || weaknesses.includes('service')) {
      improvements.push('Enhance customer support training and response times');
    }

    return improvements.length > 0 ? improvements : ['Focus on general customer satisfaction improvements'];
  }

  private async getCompetitorComparison(productId: string, tenantId: string): Promise<any> {
    // Get competitor sentiment data
    // In real implementation, would compare with competitor products
    return {
      avgSentiment: 0.6,
      avgRating: 3.8,
      reviewCount: 150
    };
  }

  private async getReviewsInDateRange(productId: string | undefined, tenantId: string, startDate: Date, endDate: Date): Promise<any[]> {
    let whereClause = and(
      sql`tenant_id = ${tenantId}`,
      sql`created_at >= ${startDate}`,
      sql`created_at <= ${endDate}`
    );

    if (productId) {
      whereClause = and(whereClause, sql`product_id = ${productId}`);
    }

    return await this.databaseService.drizzleClient
      .select({
        content: sql`content`,
        rating: sql`rating`
      })
      .from(sql`reviews`)
      .where(whereClause)
      .orderBy(desc(sql`created_at`));
  }

  private extractTopComplaints(reviews: any[]): string[] {
    // Extract common complaints from reviews
    const complaints = [];
    for (const review of reviews) {
      if (review.rating <= 2) {
        const themes = this.extractReviewThemes(review.content, review.rating);
        complaints.push(...themes);
      }
    }

    const complaintFreq = {};
    complaints.forEach(complaint => {
      complaintFreq[complaint] = (complaintFreq[complaint] || 0) + 1;
    });

    return Object.entries(complaintFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([complaint]) => complaint);
  }

  private extractTopCompliments(reviews: any[]): string[] {
    // Extract common compliments from reviews
    const compliments = [];
    for (const review of reviews) {
      if (review.rating >= 4) {
        const themes = this.extractReviewThemes(review.content, review.rating);
        compliments.push(...themes);
      }
    }

    const complimentFreq = {};
    compliments.forEach(compliment => {
      complimentFreq[compliment] = (complimentFreq[compliment] || 0) + 1;
    });

    return Object.entries(complimentFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([compliment]) => compliment);
  }

  private identifyEmergingIssues(reviews: any[]): string[] {
    // Identify emerging issues from recent reviews
    const recentReviews = reviews.slice(0, Math.floor(reviews.length / 2));
    return this.extractTopComplaints(recentReviews);
  }
}
