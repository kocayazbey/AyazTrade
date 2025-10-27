import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { SystemVerificationService } from './system-verification.service';

@ApiTags('System Verification')
@Controller('verification')
export class VerificationController {
  constructor(
    private readonly verificationService: SystemVerificationService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Verify system health and configuration' })
  @ApiResponse({ status: 200, description: 'System verification report' })
  async verify(
    @Query('deepCheck') deepCheck?: string,
    @Query('skipReports') skipReports?: string,
    @Query('confirmModules') confirmModules?: string,
    @Query('testRealConnections') testRealConnections?: string,
  ) {
    const options = {
      deepCheck: deepCheck === 'true',
      skipReports: skipReports === 'true',
      confirmModules: confirmModules !== 'false',
      testRealConnections: testRealConnections !== 'false',
    };

    return await this.verificationService.verify(options);
  }
}

