import { Injectable } from '@nestjs/common';

@Injectable()
export class WhatsappService {
  async send(notification: any): Promise<void> {
    // Integration with WhatsApp Business API
  }

  async sendTemplate(phone: string, templateName: string, parameters: any): Promise<void> {
    // Send templated message
  }

  async sendMedia(phone: string, mediaUrl: string, caption?: string): Promise<void> {
    // Send media message
  }
}

