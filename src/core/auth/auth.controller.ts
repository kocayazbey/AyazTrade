import { Controller, Post, Body, HttpCode, HttpStatus, Request, Get, Delete, Param, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { MFAService } from './services/mfa.service';
import { Public } from './decorators/public.decorator';
import { AuthRateLimit } from '../security/decorators/rate-limit.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MFAService,
  ) {}

  @Post('register')
  @Public()
  @AuthRateLimit()
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() registerDto: any) {
    const user = await this.authService.register(registerDto);
    return {
      success: true,
      message: 'User registered successfully',
      data: user
    };
  }

  @Post('login')
  @Public()
  @AuthRateLimit()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(
    @Body() loginDto: { email: string; password: string },
    @Request() req: any
  ) {
    // Extract IP address and user agent from request
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
                     req.headers['x-real-ip'] ||
                     req.connection.remoteAddress ||
                     req.socket.remoteAddress ||
                     req.ip;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const result = await this.authService.login(loginDto.email, loginDto.password, ipAddress, userAgent);
    return {
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      sessionId: result.sessionId,
      user: result.user
    };
  }

  @Post('refresh')
  @Public()
  @AuthRateLimit()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refresh(
    @Body() body: { refreshToken: string },
    @Request() req: any
  ) {
    // Extract IP address and user agent from request
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
                     req.headers['x-real-ip'] ||
                     req.connection.remoteAddress ||
                     req.socket.remoteAddress ||
                     req.ip;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const tokens = await this.authService.refreshTokens(body.refreshToken, userAgent, ipAddress);
    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionId: tokens.sessionId,
    };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  async getMe(@Request() req: any) {
    const user = await this.authService.getProfile(req.user?.id || '1');
    return {
      success: true,
      data: user
    };
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  async getProfile(@Request() req: any) {
    const user = await this.authService.getProfile(req.user?.id || '1');
    return {
      success: true,
      data: user
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  async logout(@Request() req: any) {
    const userId = req.user?.id;
    const sessionId = req.user?.sessionId;

    if (userId) {
      await this.authService.logout(userId, req.headers.authorization?.replace('Bearer ', ''), sessionId);
    }

    return {
      success: true,
      message: 'Logged out successfully'
    };
  }

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user sessions' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved' })
  async getUserSessions(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const sessions = await this.authService.getUserSessions(userId);
    return {
      success: true,
      data: sessions
    };
  }

  @Delete('sessions/:sessionId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate specific session' })
  @ApiResponse({ status: 200, description: 'Session invalidated' })
  async invalidateSession(
    @Request() req: any,
    @Param('sessionId') targetSessionId: string
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const success = await this.authService.invalidateUserSession(userId, targetSessionId);

    if (!success) {
      throw new NotFoundException('Session not found or already invalidated');
    }

    return {
      success: true,
      message: 'Session invalidated successfully'
    };
  }

  @Delete('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all sessions' })
  @ApiResponse({ status: 200, description: 'All sessions invalidated' })
  async logoutAllSessions(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const invalidatedCount = await this.authService.logoutFromAllSessions(userId);

    return {
      success: true,
      message: `${invalidatedCount} sessions invalidated successfully`
    };
  }

  // MFA endpoints
  @Post('mfa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup MFA for user' })
  @ApiResponse({ status: 200, description: 'MFA setup initiated' })
  async setupMFA(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const mfaSetup = await this.mfaService.setupMFA(userId);
    return {
      success: true,
      message: 'MFA setup initiated. Scan the QR code with your authenticator app.',
      data: {
        qrCode: mfaSetup.qrCode,
        secret: mfaSetup.secret,
        backupCodes: mfaSetup.backupCodes
      }
    };
  }

  @Post('mfa/enable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable MFA after setup' })
  @ApiResponse({ status: 200, description: 'MFA enabled successfully' })
  async enableMFA(@Body() body: { token: string }, @Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    await this.mfaService.enableMFA(userId, body.token);
    return {
      success: true,
      message: 'MFA enabled successfully'
    };
  }

  @Post('mfa/disable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable MFA' })
  @ApiResponse({ status: 200, description: 'MFA disabled successfully' })
  async disableMFA(@Body() body: { token: string }, @Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    await this.mfaService.disableMFA(userId, body.token);
    return {
      success: true,
      message: 'MFA disabled successfully'
    };
  }

  @Post('mfa/verify')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify MFA token' })
  @ApiResponse({ status: 200, description: 'MFA verified successfully' })
  async verifyMFA(@Body() body: { token?: string; backupCode?: string }, @Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    await this.mfaService.verifyMFA(userId, body);
    return {
      success: true,
      message: 'MFA verified successfully'
    };
  }

  @Get('mfa/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get MFA status' })
  @ApiResponse({ status: 200, description: 'MFA status retrieved' })
  async getMFAStatus(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const status = await this.mfaService.getMFAStatus(userId);
    return {
      success: true,
      data: status
    };
  }

  @Post('mfa/backup-codes')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate new backup codes' })
  @ApiResponse({ status: 200, description: 'New backup codes generated' })
  async generateBackupCodes(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const backupCodes = await this.mfaService.generateNewBackupCodes(userId);
    return {
      success: true,
      message: 'New backup codes generated. Save them in a secure place.',
      data: {
        backupCodes
      }
    };
  }
}

