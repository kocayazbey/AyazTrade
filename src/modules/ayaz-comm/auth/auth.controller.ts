import { Controller, Post, Get, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { EmailService } from '../notifications/email.service';
import { SmsService } from '../notifications/sms.service';
import { IsEmail, IsString, IsOptional, IsPhoneNumber, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  rememberMe?: boolean;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @IsOptional()
  @IsPhoneNumber('TR')
  phone?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  customerType?: 'retail' | 'wholesale' | 'b2b';
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  newPassword: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  newPassword: string;
}

export class VerifyEmailDto {
  @IsString()
  token: string;
}

export class ResendVerificationDto {
  @IsEmail()
  email: string;
}

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    try {
      const { email, password, rememberMe } = loginDto;
      
      const user = await this.authService.validateUser(email, password);
      if (!user) {
        return {
          success: false,
          message: 'Invalid credentials',
        };
      }

      const tokens = await this.authService.generateTokens(user);
      
      // Update last login
      await this.authService.updateLastLogin(user.id);

      return {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified,
          },
          tokens,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Login failed',
        error: error.message,
      };
    }
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User registration' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Registration failed' })
  async register(@Body() registerDto: RegisterDto) {
    try {
      const { email, password, firstName, lastName, phone, companyName, customerType } = registerDto;
      
      // Check if user already exists
      const existingUser = await this.authService.findUserByEmail(email);
      if (existingUser) {
        return {
          success: false,
          message: 'User already exists with this email',
        };
      }

      // Create user
      const user = await this.authService.createUser({
        email,
        password,
        firstName,
        lastName,
        phone,
        companyName,
        customerType: customerType || 'retail',
      });

      // Generate verification token
      const verificationToken = await this.authService.generateVerificationToken(user.id);
      
      // Send verification email
      await this.emailService.sendEmailVerificationEmail(email, verificationToken);

      // Send welcome SMS if phone provided
      if (phone) {
        await this.smsService.sendVerificationSms(phone, '123456'); // TODO: Generate real verification code
      }

      return {
        success: true,
        message: 'Registration successful. Please check your email for verification.',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            customerType: user.customerType,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Registration failed',
        error: error.message,
      };
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Request() req) {
    try {
      const userId = req.user.id;
      
      // Invalidate tokens
      await this.authService.invalidateTokens(userId);
      
      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Logout failed',
        error: error.message,
      };
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() body: { refreshToken: string }) {
    try {
      const { refreshToken } = body;
      
      const tokens = await this.authService.refreshTokens(refreshToken);
      
      return {
        success: true,
        message: 'Token refreshed successfully',
        data: { tokens },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Token refresh failed',
        error: error.message,
      };
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    try {
      const { email } = forgotPasswordDto;
      
      const user = await this.authService.findUserByEmail(email);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Generate reset token
      const resetToken = await this.authService.generateResetToken(user.id);
      
      // Send reset email
      await this.emailService.sendPasswordResetEmail(email, resetToken);
      
      // Send reset SMS if phone exists
      if (user.phone) {
        const resetCode = '123456'; // TODO: Generate real reset code
        await this.smsService.sendPasswordResetSms(user.phone, resetCode);
      }

      return {
        success: true,
        message: 'Password reset instructions sent to your email',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Password reset request failed',
        error: error.message,
      };
    }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    try {
      const { token, newPassword } = resetPasswordDto;
      
      const success = await this.authService.resetPassword(token, newPassword);
      
      if (!success) {
        return {
          success: false,
          message: 'Invalid or expired token',
        };
      }

      return {
        success: true,
        message: 'Password reset successful',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Password reset failed',
        error: error.message,
      };
    }
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = changePasswordDto;
      
      const success = await this.authService.changePassword(userId, currentPassword, newPassword);
      
      if (!success) {
        return {
          success: false,
          message: 'Invalid current password',
        };
      }

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Password change failed',
        error: error.message,
      };
    }
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    try {
      const { token } = verifyEmailDto;
      
      const success = await this.authService.verifyEmail(token);
      
      if (!success) {
        return {
          success: false,
          message: 'Invalid or expired verification token',
        };
      }

      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Email verification failed',
        error: error.message,
      };
    }
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async resendVerification(@Body() resendVerificationDto: ResendVerificationDto) {
    try {
      const { email } = resendVerificationDto;
      
      const user = await this.authService.findUserByEmail(email);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (user.isEmailVerified) {
        return {
          success: false,
          message: 'Email already verified',
        };
      }

      // Generate new verification token
      const verificationToken = await this.authService.generateVerificationToken(user.id);
      
      // Send verification email
      await this.emailService.sendEmailVerificationEmail(email, verificationToken);

      return {
        success: true,
        message: 'Verification email sent',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to resend verification email',
        error: error.message,
      };
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@Request() req) {
    try {
      const userId = req.user.id;
      const user = await this.authService.getUserProfile(userId);
      
      return {
        success: true,
        data: { user },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get profile',
        error: error.message,
      };
    }
  }

  @Get('verify-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify JWT token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  async verifyToken(@Request() req) {
    try {
      return {
        success: true,
        message: 'Token is valid',
        data: {
          user: req.user,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Token verification failed',
        error: error.message,
      };
    }
  }
}
