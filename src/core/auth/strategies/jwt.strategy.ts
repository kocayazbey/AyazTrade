import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      issuer: configService.get<string>('JWT_ISSUER', 'ayaztrade'),
      audience: configService.get<string>('JWT_AUDIENCE', 'ayaztrade-api'),
    });
  }

  async validate(payload: any) {
    const user = await this.authService.findUserByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedException();
    }

    // Include sessionId in the returned user object
    return {
      ...user,
      sessionId: payload.sessionId,
    };
  }
}