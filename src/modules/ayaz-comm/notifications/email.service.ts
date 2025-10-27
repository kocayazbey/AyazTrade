import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendWelcomeEmail(userEmail: string, userName: string) {
    const mailOptions = {
      from: this.configService.get('SMTP_FROM') || 'noreply@ayaztrade.com',
      to: userEmail,
      subject: 'Welcome to AyazTrade!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e3a8a;">Welcome to AyazTrade!</h1>
          <p>Hello ${userName},</p>
          <p>Thank you for joining AyazTrade. We're excited to have you on board!</p>
          <p>You can now start shopping and enjoy our wide range of products.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get('FRONTEND_URL')}/login" 
               style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              Start Shopping
            </a>
          </div>
          <p>Best regards,<br>The AyazTrade Team</p>
        </div>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendOrderConfirmation(userId: string, orderId: string) {
    // TODO: Get user and order details from database
    const userEmail = 'user@example.com'; // Replace with actual user email
    const orderNumber = 'AYZ123456'; // Replace with actual order number

    const mailOptions = {
      from: this.configService.get('SMTP_FROM') || 'noreply@ayaztrade.com',
      to: userEmail,
      subject: 'Order Confirmation - AyazTrade',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e3a8a;">Order Confirmed!</h1>
          <p>Thank you for your order!</p>
          <p><strong>Order Number:</strong> ${orderNumber}</p>
          <p>We'll send you another email when your order ships.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get('FRONTEND_URL')}/orders/${orderId}" 
               style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              View Order
            </a>
          </div>
          <p>Best regards,<br>The AyazTrade Team</p>
        </div>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendOrderStatusUpdate(userId: string, orderId: string, status: string) {
    // TODO: Get user and order details from database
    const userEmail = 'user@example.com'; // Replace with actual user email
    const orderNumber = 'AYZ123456'; // Replace with actual order number

    const statusMessages = {
      'confirmed': 'Your order has been confirmed and is being prepared.',
      'processing': 'Your order is being processed.',
      'shipped': 'Your order has been shipped and is on its way.',
      'delivered': 'Your order has been delivered.',
      'cancelled': 'Your order has been cancelled.',
    };

    const mailOptions = {
      from: this.configService.get('SMTP_FROM') || 'noreply@ayaztrade.com',
      to: userEmail,
      subject: `Order Update - ${orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e3a8a;">Order Status Update</h1>
          <p><strong>Order Number:</strong> ${orderNumber}</p>
          <p><strong>Status:</strong> ${status}</p>
          <p>${statusMessages[status] || 'Your order status has been updated.'}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get('FRONTEND_URL')}/orders/${orderId}" 
               style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              View Order
            </a>
          </div>
          <p>Best regards,<br>The AyazTrade Team</p>
        </div>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendOrderCancellation(userId: string, orderId: string, reason?: string) {
    // TODO: Get user and order details from database
    const userEmail = 'user@example.com'; // Replace with actual user email
    const orderNumber = 'AYZ123456'; // Replace with actual order number

    const mailOptions = {
      from: this.configService.get('SMTP_FROM') || 'noreply@ayaztrade.com',
      to: userEmail,
      subject: `Order Cancelled - ${orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ef4444;">Order Cancelled</h1>
          <p>We're sorry to inform you that your order has been cancelled.</p>
          <p><strong>Order Number:</strong> ${orderNumber}</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>If you have any questions, please contact our customer service.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get('FRONTEND_URL')}/contact" 
               style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              Contact Support
            </a>
          </div>
          <p>Best regards,<br>The AyazTrade Team</p>
        </div>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendPasswordResetEmail(userEmail: string, resetToken: string) {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: this.configService.get('SMTP_FROM') || 'noreply@ayaztrade.com',
      to: userEmail,
      subject: 'Password Reset - AyazTrade',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e3a8a;">Password Reset Request</h1>
          <p>You requested to reset your password.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              Reset Password
            </a>
          </div>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br>The AyazTrade Team</p>
        </div>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendPasswordChangedConfirmation(userEmail: string) {
    const mailOptions = {
      from: this.configService.get('SMTP_FROM') || 'noreply@ayaztrade.com',
      to: userEmail,
      subject: 'Password Changed - AyazTrade',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e3a8a;">Password Changed Successfully</h1>
          <p>Your password has been changed successfully.</p>
          <p>If you didn't make this change, please contact our support team immediately.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get('FRONTEND_URL')}/login" 
               style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              Login
            </a>
          </div>
          <p>Best regards,<br>The AyazTrade Team</p>
        </div>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendNewsletter(newsletterData: {
    subject: string;
    content: string;
    recipients: string[];
  }) {
    const { subject, content, recipients } = newsletterData;

    const mailOptions = {
      from: this.configService.get('SMTP_FROM') || 'noreply@ayaztrade.com',
      to: recipients.join(','),
      subject,
      html: content,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendPromotionalEmail(userEmail: string, promotionData: {
    title: string;
    description: string;
    discountCode?: string;
    discountPercentage?: number;
  }) {
    const { title, description, discountCode, discountPercentage } = promotionData;

    const mailOptions = {
      from: this.configService.get('SMTP_FROM') || 'noreply@ayaztrade.com',
      to: userEmail,
      subject: title,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e3a8a;">${title}</h1>
          <p>${description}</p>
          ${discountCode ? `
            <div style="background-color: #f97316; color: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 4px;">
              <h2>Special Offer!</h2>
              <p>Use code: <strong>${discountCode}</strong></p>
              ${discountPercentage ? `<p>Get ${discountPercentage}% off!</p>` : ''}
            </div>
          ` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get('FRONTEND_URL')}/shop" 
               style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              Shop Now
            </a>
          </div>
          <p>Best regards,<br>The AyazTrade Team</p>
        </div>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }
}