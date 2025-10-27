import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AuthRateLimit, SkipThrottle } from './core/security/decorators/rate-limit.decorator';
import { UseGuards } from '@nestjs/common';
import { EnhancedThrottlerGuard } from './core/security/guards/enhanced-throttler.guard';

interface LoginDto {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    };
  };
}

@Controller()
export class AuthController {
  @Get()
  @SkipThrottle()
  @UseGuards(EnhancedThrottlerGuard)
  getRoot() {
    return {
      status: 'ok',
      message: 'AyazTrade API is running!',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/api/v1/health',
        docs: '/api/docs',
        api: '/api/v1'
      }
    };
  }

  @Get('health')
  @SkipThrottle()
  @UseGuards(EnhancedThrottlerGuard)
  getHealthCheck() {
    return {
      status: 'ok',
      message: 'AyazTrade API is running!',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Post('auth/login')
  @AuthRateLimit()
  @UseGuards(EnhancedThrottlerGuard)
  async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    try {
      // Mock authentication logic
      if (loginDto.email === 'admin@ayaztrade.com' && loginDto.password === 'admin123') {
        return {
          success: true,
          message: 'Login successful',
          data: {
            token: 'mock-jwt-token-' + Date.now(),
            user: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              email: 'admin@ayaztrade.com',
              firstName: 'Admin',
              lastName: 'User',
              role: 'admin'
            }
          }
        };
      }

      // Mock other user logins
      if (loginDto.email.includes('@ayaztrade.com')) {
        return {
          success: true,
          message: 'Login successful',
          data: {
            token: 'mock-jwt-token-' + Date.now(),
            user: {
              id: 'user-' + Date.now(),
              email: loginDto.email,
              firstName: 'Test',
              lastName: 'User',
              role: 'user'
            }
          }
        };
      }

      // Invalid credentials
      return {
        success: false,
        message: 'Invalid email or password'
      };

    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Login failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
