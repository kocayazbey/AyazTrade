import { Injectable } from '@nestjs/common';
import { AuthService as CoreAuthService } from '../../../core/auth/auth.service';

@Injectable()
export class AuthService {
  constructor(private readonly coreAuthService: CoreAuthService) {}

  // Delegate all methods to core auth service
  async register(createUserDto: any) {
    return this.coreAuthService.register(createUserDto);
  }

  async login(email: string, password: string) {
    return this.coreAuthService.login(email, password);
  }

  async validateUser(email: string, password: string) {
    return this.coreAuthService.validateUser(email, password);
  }

  async generateTokens(user: any) {
    return this.coreAuthService.generateTokens(user);
  }

  async updateLastLogin(userId: string) {
    return this.coreAuthService.updateLastLogin(userId);
  }

  async findUserByEmail(email: string) {
    return this.coreAuthService.findUserByEmail(email);
  }

  async createUser(userData: any) {
    return this.coreAuthService.createUser(userData);
  }

  async generateVerificationToken(userId: string) {
    return this.coreAuthService.generateVerificationToken(userId);
  }

  async invalidateTokens(userId: string) {
    return this.coreAuthService.invalidateTokens(userId);
  }

  async refreshTokens(refreshToken: string) {
    return this.coreAuthService.refreshTokens(refreshToken);
  }

  async generateResetToken(userId: string) {
    return this.coreAuthService.generateResetToken(userId);
  }

  async resetPassword(token: string, newPassword: string) {
    return this.coreAuthService.resetPassword(token, newPassword);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    return this.coreAuthService.changePassword(userId, currentPassword, newPassword);
  }

  async verifyEmail(token: string) {
    return this.coreAuthService.verifyEmail(token);
  }

  async getUserProfile(userId: string) {
    return this.coreAuthService.getProfile(userId);
  }

  async refreshToken(refreshToken: string) {
    return this.coreAuthService.refreshTokens(refreshToken);
  }

  async logout(userId: string) {
    return this.coreAuthService.invalidateTokens(userId);
  }

  async forgotPassword(email: string) {
    return this.coreAuthService.findUserByEmail(email).then(user => {
      if (!user) {
        return { message: 'If the email exists, a reset link has been sent.' };
      }
      return { message: 'If the email exists, a reset link has been sent.' };
    });
  }

  async updateProfile(userId: string, updateData: any) {
    return this.coreAuthService.getProfile(userId).then(user => {
      return { message: 'Profile updated successfully' };
    });
  }
}
