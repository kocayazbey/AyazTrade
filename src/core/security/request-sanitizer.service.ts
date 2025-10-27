import { Injectable } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsEmail, IsUrl, IsNumber, IsBoolean, IsArray, IsObject } from 'class-validator';

@Injectable()
export class RequestSanitizerService {
  /**
   * Sanitize string input by removing potentially dangerous characters
   */
  sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/script/gi, '') // Remove script tags
      .replace(/iframe/gi, '') // Remove iframe tags
      .replace(/object/gi, '') // Remove object tags
      .replace(/embed/gi, '') // Remove embed tags
      .replace(/link/gi, '') // Remove link tags
      .replace(/meta/gi, '') // Remove meta tags
      .replace(/style/gi, '') // Remove style tags
      .replace(/expression/gi, '') // Remove CSS expressions
      .replace(/url\(/gi, '') // Remove CSS url() functions
      .replace(/@import/gi, '') // Remove CSS @import
      .replace(/@charset/gi, '') // Remove CSS @charset
      .replace(/@media/gi, '') // Remove CSS @media
      .replace(/@keyframes/gi, '') // Remove CSS @keyframes
      .replace(/@supports/gi, '') // Remove CSS @supports
      .replace(/@page/gi, '') // Remove CSS @page
      .replace(/@font-face/gi, '') // Remove CSS @font-face
      .replace(/@namespace/gi, '') // Remove CSS @namespace
      .replace(/@document/gi, '') // Remove CSS @document
      .replace(/@viewport/gi, '') // Remove CSS @viewport
      .replace(/@counter-style/gi, '') // Remove CSS @counter-style
      .replace(/@charset/gi, '') // Remove CSS @charset
      .replace(/@import/gi, '') // Remove CSS @import
      .replace(/@media/gi, '') // Remove CSS @media
      .replace(/@keyframes/gi, '') // Remove CSS @keyframes
      .replace(/@supports/gi, '') // Remove CSS @supports
      .replace(/@page/gi, '') // Remove CSS @page
      .replace(/@font-face/gi, '') // Remove CSS @font-face
      .replace(/@namespace/gi, '') // Remove CSS @namespace
      .replace(/@document/gi, '') // Remove CSS @document
      .replace(/@viewport/gi, '') // Remove CSS @viewport
      .replace(/@counter-style/gi, '') // Remove CSS @counter-style
      .replace(/[^\w\s\-\.@]/g, '') // Remove special characters except alphanumeric, space, hyphen, dot, @
      .substring(0, 1000); // Limit length
  }

  /**
   * Sanitize email input
   */
  sanitizeEmail(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9@._-]/g, '') // Remove invalid characters
      .substring(0, 254); // Email length limit
  }

  /**
   * Sanitize URL input
   */
  sanitizeUrl(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:/gi, '') // Remove data: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/file:/gi, '') // Remove file: protocol
      .replace(/ftp:/gi, '') // Remove ftp: protocol
      .replace(/[^\w\s\-\.@:\/]/g, '') // Remove special characters
      .substring(0, 2048); // URL length limit
  }

  /**
   * Sanitize number input
   */
  sanitizeNumber(input: any): number {
    if (typeof input === 'number') return input;
    if (typeof input === 'string') {
      const parsed = parseFloat(input);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Sanitize boolean input
   */
  sanitizeBoolean(input: any): boolean {
    if (typeof input === 'boolean') return input;
    if (typeof input === 'string') {
      return input.toLowerCase() === 'true' || input === '1';
    }
    return false;
  }

  /**
   * Sanitize array input
   */
  sanitizeArray(input: any): any[] {
    if (!Array.isArray(input)) return [];
    return input.map(item => this.sanitizeValue(item));
  }

  /**
   * Sanitize object input
   */
  sanitizeObject(input: any): Record<string, any> {
    if (typeof input !== 'object' || input === null) return {};
    
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      const sanitizedKey = this.sanitizeString(key);
      if (sanitizedKey) {
        sanitized[sanitizedKey] = this.sanitizeValue(value);
      }
    }
    return sanitized;
  }

  /**
   * Sanitize any value based on its type
   */
  sanitizeValue(input: any): any {
    if (input === null || input === undefined) return input;
    
    if (typeof input === 'string') return this.sanitizeString(input);
    if (typeof input === 'number') return this.sanitizeNumber(input);
    if (typeof input === 'boolean') return this.sanitizeBoolean(input);
    if (Array.isArray(input)) return this.sanitizeArray(input);
    if (typeof input === 'object') return this.sanitizeObject(input);
    
    return input;
  }

  /**
   * Sanitize request body
   */
  sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') return body;
    
    return this.sanitizeObject(body);
  }

  /**
   * Sanitize query parameters
   */
  sanitizeQueryParams(query: any): any {
    if (!query || typeof query !== 'object') return query;
    
    return this.sanitizeObject(query);
  }

  /**
   * Sanitize request headers
   */
  sanitizeHeaders(headers: any): any {
    if (!headers || typeof headers !== 'object') return headers;
    
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(headers)) {
      const sanitizedKey = this.sanitizeString(key);
      if (sanitizedKey) {
        sanitized[sanitizedKey] = this.sanitizeString(String(value));
      }
    }
    return sanitized;
  }
}

// Transform decorators for class-validator
export const SanitizeString = () => Transform(({ value }) => {
  if (typeof value === 'string') {
    return value
      .trim()
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .replace(/script/gi, '')
      .replace(/iframe/gi, '')
      .replace(/object/gi, '')
      .replace(/embed/gi, '')
      .replace(/link/gi, '')
      .replace(/meta/gi, '')
      .replace(/style/gi, '')
      .replace(/expression/gi, '')
      .replace(/url\(/gi, '')
      .replace(/@import/gi, '')
      .replace(/@charset/gi, '')
      .replace(/@media/gi, '')
      .replace(/@keyframes/gi, '')
      .replace(/@supports/gi, '')
      .replace(/@page/gi, '')
      .replace(/@font-face/gi, '')
      .replace(/@namespace/gi, '')
      .replace(/@document/gi, '')
      .replace(/@viewport/gi, '')
      .replace(/@counter-style/gi, '')
      .replace(/[^\w\s\-\.@]/g, '')
      .substring(0, 1000);
  }
  return value;
});

export const SanitizeEmail = () => Transform(({ value }) => {
  if (typeof value === 'string') {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9@._-]/g, '')
      .substring(0, 254);
  }
  return value;
});

export const SanitizeUrl = () => Transform(({ value }) => {
  if (typeof value === 'string') {
    return value
      .trim()
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/file:/gi, '')
      .replace(/ftp:/gi, '')
      .replace(/[^\w\s\-\.@:\/]/g, '')
      .substring(0, 2048);
  }
  return value;
});

export const SanitizeNumber = () => Transform(({ value }) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
});

export const SanitizeBoolean = () => Transform(({ value }) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return false;
});

export const SanitizeArray = () => Transform(({ value }) => {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    if (typeof item === 'string') {
      return item
        .trim()
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .replace(/script/gi, '')
        .replace(/iframe/gi, '')
        .replace(/object/gi, '')
        .replace(/embed/gi, '')
        .replace(/link/gi, '')
        .replace(/meta/gi, '')
        .replace(/style/gi, '')
        .replace(/expression/gi, '')
        .replace(/url\(/gi, '')
        .replace(/@import/gi, '')
        .replace(/@charset/gi, '')
        .replace(/@media/gi, '')
        .replace(/@keyframes/gi, '')
        .replace(/@supports/gi, '')
        .replace(/@page/gi, '')
        .replace(/@font-face/gi, '')
        .replace(/@namespace/gi, '')
        .replace(/@document/gi, '')
        .replace(/@viewport/gi, '')
        .replace(/@counter-style/gi, '')
        .replace(/[^\w\s\-\.@]/g, '')
        .substring(0, 1000);
    }
    return item;
  });
});

export const SanitizeObject = () => Transform(({ value }) => {
  if (typeof value !== 'object' || value === null) return {};
  
  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(value)) {
    const sanitizedKey = key
      .trim()
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .replace(/script/gi, '')
      .replace(/iframe/gi, '')
      .replace(/object/gi, '')
      .replace(/embed/gi, '')
      .replace(/link/gi, '')
      .replace(/meta/gi, '')
      .replace(/style/gi, '')
      .replace(/expression/gi, '')
      .replace(/url\(/gi, '')
      .replace(/@import/gi, '')
      .replace(/@charset/gi, '')
      .replace(/@media/gi, '')
      .replace(/@keyframes/gi, '')
      .replace(/@supports/gi, '')
      .replace(/@page/gi, '')
      .replace(/@font-face/gi, '')
      .replace(/@namespace/gi, '')
      .replace(/@document/gi, '')
      .replace(/@viewport/gi, '')
      .replace(/@counter-style/gi, '')
      .replace(/[^\w\s\-\.@]/g, '')
      .substring(0, 1000);
    
    if (sanitizedKey) {
      sanitized[sanitizedKey] = typeof val === 'string' 
        ? val.trim().replace(/[<>]/g, '').replace(/javascript:/gi, '').replace(/on\w+=/gi, '').replace(/script/gi, '').replace(/iframe/gi, '').replace(/object/gi, '').replace(/embed/gi, '').replace(/link/gi, '').replace(/meta/gi, '').replace(/style/gi, '').replace(/expression/gi, '').replace(/url\(/gi, '').replace(/@import/gi, '').replace(/@charset/gi, '').replace(/@media/gi, '').replace(/@keyframes/gi, '').replace(/@supports/gi, '').replace(/@page/gi, '').replace(/@font-face/gi, '').replace(/@namespace/gi, '').replace(/@document/gi, '').replace(/@viewport/gi, '').replace(/@counter-style/gi, '').replace(/[^\w\s\-\.@]/g, '').substring(0, 1000)
        : val;
    }
  }
  return sanitized;
});
