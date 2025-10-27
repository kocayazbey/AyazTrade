import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class PasswordStrengthService {
  private readonly MIN_SCORE = 3;
  private readonly MIN_LENGTH = 8;

  async validatePassword(password: string): Promise<void> {
    if (!password || password.length < this.MIN_LENGTH) {
      throw new BadRequestException(`Password must be at least ${this.MIN_LENGTH} characters long.`);
    }

    // Basic password strength validation
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const score = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

    if (score < this.MIN_SCORE) {
      throw new BadRequestException('Password is too weak. Include uppercase, lowercase, numbers, and special characters.');
    }
  }

  async getPasswordStrength(password: string): Promise<{ score: number; feedback: any }> {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const score = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

    return {
      score,
      feedback: {
        warning: score < 3 ? 'Password is weak' : undefined,
        suggestions: [
          !hasUpperCase ? 'Add uppercase letters' : null,
          !hasLowerCase ? 'Add lowercase letters' : null,
          !hasNumbers ? 'Add numbers' : null,
          !hasSpecialChar ? 'Add special characters' : null,
        ].filter(Boolean),
      },
    };
  }
}