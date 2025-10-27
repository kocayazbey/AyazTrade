import { Injectable } from '@nestjs/common';

@Injectable()
export class ReviewModerationService {
  private readonly bannedWords = [
    'spam',
    'fake',
    // Add more banned words
  ];

  async moderateReview(reviewText: string): Promise<{ isValid: boolean; reason?: string }> {
    // Check for banned words
    const lowerText = reviewText.toLowerCase();
    for (const word of this.bannedWords) {
      if (lowerText.includes(word)) {
        return { isValid: false, reason: `Contains banned word: ${word}` };
      }
    }

    // Check minimum length
    if (reviewText.length < 10) {
      return { isValid: false, reason: 'Review too short' };
    }

    // Check maximum length
    if (reviewText.length > 5000) {
      return { isValid: false, reason: 'Review too long' };
    }

    // Check for excessive caps
    const capsCount = (reviewText.match(/[A-Z]/g) || []).length;
    if (capsCount / reviewText.length > 0.5) {
      return { isValid: false, reason: 'Excessive use of capital letters' };
    }

    // Check for spam patterns (repeated characters)
    if (/(.)\1{5,}/.test(reviewText)) {
      return { isValid: false, reason: 'Spam pattern detected' };
    }

    return { isValid: true };
  }

  async detectSpam(reviewText: string): Promise<boolean> {
    // Simple spam detection
    const spamIndicators = [
      /\b(buy now|click here|limited time|act now)\b/i,
      /(.{1,10})\1{3,}/i, // Repeated patterns
      /[A-Z]{10,}/, // Excessive caps
    ];

    return spamIndicators.some((pattern) => pattern.test(reviewText));
  }

  async sentimentAnalysis(reviewText: string): Promise<{ sentiment: string; score: number }> {
    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'best', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'horrible', 'worst', 'hate', 'awful', 'poor'];

    const lowerText = reviewText.toLowerCase();
    let score = 0;

    positiveWords.forEach((word) => {
      const count = (lowerText.match(new RegExp(word, 'g')) || []).length;
      score += count;
    });

    negativeWords.forEach((word) => {
      const count = (lowerText.match(new RegExp(word, 'g')) || []).length;
      score -= count;
    });

    let sentiment = 'neutral';
    if (score > 0) sentiment = 'positive';
    if (score < 0) sentiment = 'negative';

    return { sentiment, score };
  }
}

