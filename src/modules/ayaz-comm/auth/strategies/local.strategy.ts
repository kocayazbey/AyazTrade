import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      usernameField: 'email',
    });
  }

  async validate(email: string, password: string): Promise<any> {
    // Mock validation - in real app, validate against database
    if (email === 'admin@example.com' && password === 'password') {
      return { userId: '1', email, role: 'admin' };
    }
    throw new UnauthorizedException();
  }
}
