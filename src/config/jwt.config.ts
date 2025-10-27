import { JwtModuleOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export const getJwtConfig = (configService: ConfigService): JwtModuleOptions => {
  return {
    secret: configService.get('JWT_SECRET', 'your-secret-key'),
    signOptions: {
      expiresIn: configService.get('JWT_EXPIRES_IN', '24h'),
      issuer: configService.get('JWT_ISSUER', 'ayaztrade'),
      audience: configService.get('JWT_AUDIENCE', 'ayaztrade-users'),
    },
    verifyOptions: {
      issuer: configService.get('JWT_ISSUER', 'ayaztrade'),
      audience: configService.get('JWT_AUDIENCE', 'ayaztrade-users'),
    },
  };
};

export const getJwtTokenConfig = (configService: ConfigService) => {
  return {
    accessTokenExpiresIn: configService.get('JWT_ACCESS_TOKEN_EXPIRES_IN', '1h'),
    refreshTokenExpiresIn: configService.get('JWT_REFRESH_TOKEN_EXPIRES_IN', '7d'),
    resetTokenExpiresIn: configService.get('JWT_RESET_TOKEN_EXPIRES_IN', '1h'),
    verificationTokenExpiresIn: configService.get('JWT_VERIFICATION_TOKEN_EXPIRES_IN', '24h'),
    emailVerificationExpiresIn: configService.get('JWT_EMAIL_VERIFICATION_EXPIRES_IN', '24h'),
    keyRotationInterval: parseInt(configService.get('JWT_KEY_ROTATION_INTERVAL', '86400000')),
    keyLifetime: parseInt(configService.get('JWT_KEY_LIFETIME', '604800000')),
    gracePeriod: parseInt(configService.get('JWT_GRACE_PERIOD', '3600000')),
  };
};