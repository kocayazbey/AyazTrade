import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CustomersService } from './customers.service';

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly customersService: CustomersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<any> {
    const customer = await this.validateCustomer(email, password);

    if (!customer) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (customer.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    await this.customersService.updateLastLogin(customer.id);

    const tokens = await this.generateTokens(customer);

    return {
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        customerType: customer.customerType,
      },
      ...tokens,
    };
  }

  async register(registerDto: any): Promise<any> {
    const customer = await this.customersService.create(registerDto);

    const tokens = await this.generateTokens(customer);

    return {
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const customer = await this.customersService.findOne(payload.sub);

      return this.generateTokens(customer);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const customer = await this.customersService.findByEmail(email);
    
    if (!customer) {
      return;
    }

    const resetToken = this.jwtService.sign(
      { sub: customer.id, type: 'password-reset' },
      { expiresIn: '1h' },
    );

  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const payload = this.jwtService.verify(token);
      
      if (payload.type !== 'password-reset') {
        throw new Error('Invalid token type');
      }

      await this.customersService.update(payload.sub, { password: newPassword });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async validateCustomer(email: string, password: string): Promise<any> {
    const customer = await this.customersService.findByEmail(email);
    
    if (!customer) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, customer.password);
    
    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...result } = customer;
    return result;
  }

  private async generateTokens(customer: any): Promise<any> {
    const payload = {
      sub: customer.id,
      email: customer.email,
      type: customer.customerType,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
    };
  }
}

