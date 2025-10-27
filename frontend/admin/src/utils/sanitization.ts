import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Configure DOMPurify with JSDOM for server-side rendering
const window = new JSDOM('').window;
const DOMPurifyServer = DOMPurify(window as any);

// Allowed HTML tags and attributes for rich text content
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img', 'table',
  'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'span', 'div'
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'id',
  'colspan', 'rowspan', 'style'
];

// Sanitization configuration
export const SANITIZATION_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button', 'meta', 'link'],
  FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'],
};

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export const sanitizeHtml = (html: string): string => {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return DOMPurifyServer.sanitize(html, SANITIZATION_CONFIG);
};

/**
 * Sanitize plain text (remove all HTML)
 */
export const sanitizeText = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove HTML tags and decode HTML entities
  const withoutTags = text.replace(/<[^>]*>/g, '');
  const decoded = withoutTags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');

  return decoded.trim();
};

/**
 * Sanitize user input for safe display
 */
export const sanitizeInput = (input: string, allowHtml: boolean = false): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  if (allowHtml) {
    return sanitizeHtml(input);
  }

  return sanitizeText(input);
};

/**
 * Validate and sanitize URL
 */
export const sanitizeUrl = (url: string): string => {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    const urlObj = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return '';
    }

    // Remove potentially dangerous query parameters
    const safeUrl = `${urlObj.origin}${urlObj.pathname}`;

    return safeUrl;
  } catch (error) {
    // Invalid URL
    return '';
  }
};

/**
 * Sanitize filename for safe storage
 */
export const sanitizeFilename = (filename: string): string => {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  // Remove or replace dangerous characters
  const sanitized = filename
    .replace(/[/\\:*?"<>|]/g, '_') // Replace path separators and special chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/\.+/g, '.') // Remove multiple dots
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

  // Ensure filename is not empty and not too long
  if (!sanitized || sanitized.length > 255) {
    return `file_${Date.now()}`;
  }

  return sanitized;
};

/**
 * Sanitize JSON data
 */
export const sanitizeJson = (data: any): any => {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeText(data);
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeJson(item));
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip potentially dangerous keys
      if (typeof key === 'string' && !key.startsWith('__') && !key.includes('eval')) {
        sanitized[key] = sanitizeJson(value);
      }
    }
    return sanitized;
  }

  return data;
};

/**
 * Check if content contains potentially dangerous patterns
 */
export const containsDangerousContent = (content: string): boolean => {
  if (!content || typeof content !== 'string') {
    return false;
  }

  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<form[^>]*>/gi,
    /<input[^>]*>/gi,
    /<meta[^>]*>/gi,
    /<link[^>]*>/gi,
    /eval\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
  ];

  return dangerousPatterns.some(pattern => pattern.test(content));
};

/**
 * Escape HTML entities
 */
export const escapeHtml = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const htmlEntities: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => htmlEntities[char] || char);
};

/**
 * Comprehensive input sanitization for forms
 */
export const sanitizeFormData = (formData: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(formData)) {
    if (typeof value === 'string') {
      // Determine if field should allow HTML based on field name
      const allowHtmlFields = ['description', 'content', 'notes', 'html', 'rich_text'];
      const allowHtml = allowHtmlFields.some(field => key.toLowerCase().includes(field));

      sanitized[key] = sanitizeInput(value, allowHtml);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeJson(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

export default {
  sanitizeHtml,
  sanitizeText,
  sanitizeInput,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeJson,
  containsDangerousContent,
  escapeHtml,
  sanitizeFormData,
};
