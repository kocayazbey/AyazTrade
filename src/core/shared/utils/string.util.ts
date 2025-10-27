export class StringUtil {
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  static capitalizeWords(str: string): string {
    return str.split(' ').map(word => this.capitalize(word)).join(' ');
  }

  static camelCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  }

  static kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  static snakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .toLowerCase();
  }

  static pascalCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, word => word.toUpperCase())
      .replace(/\s+/g, '');
  }

  static slugify(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static truncate(str: string, length: number, suffix: string = '...'): string {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  }

  static truncateWords(str: string, wordCount: number, suffix: string = '...'): string {
    const words = str.split(' ');
    if (words.length <= wordCount) return str;
    return words.slice(0, wordCount).join(' ') + suffix;
  }

  static stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  static escapeHtml(str: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return str.replace(/[&<>"']/g, (m) => map[m]);
  }

  static unescapeHtml(str: string): string {
    const map: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'"
    };
    return str.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, (m) => map[m]);
  }

  static generateSlug(str: string): string {
    return this.slugify(str);
  }

  static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static generateRandomNumber(length: number): string {
    const chars = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  static maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) return email;
    const maskedLocal = localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1];
    return `${maskedLocal}@${domain}`;
  }

  static maskPhone(phone: string): string {
    if (phone.length <= 4) return phone;
    return '*'.repeat(phone.length - 4) + phone.slice(-4);
  }

  static maskCreditCard(cardNumber: string): string {
    if (cardNumber.length <= 4) return cardNumber;
    return '*'.repeat(cardNumber.length - 4) + cardNumber.slice(-4);
  }

  static formatCurrency(amount: number, currency: string = 'USD', locale: string = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  static formatNumber(number: number, locale: string = 'en-US'): string {
    return new Intl.NumberFormat(locale).format(number);
  }

  static formatPercentage(value: number, decimals: number = 2): string {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  static pluralize(count: number, singular: string, plural?: string): string {
    if (count === 1) return singular;
    return plural || singular + 's';
  }

  static ordinal(number: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const value = number % 100;
    return number + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
  }

  static initials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }

  static extractEmails(text: string): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return text.match(emailRegex) || [];
  }

  static extractUrls(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  }

  static extractPhoneNumbers(text: string): string[] {
    const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
    return text.match(phoneRegex) || [];
  }

  static removeAccents(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  static normalizeWhitespace(str: string): string {
    return str.replace(/\s+/g, ' ').trim();
  }

  static removeSpecialCharacters(str: string): string {
    return str.replace(/[^a-zA-Z0-9\s]/g, '');
  }

  static removeNumbers(str: string): string {
    return str.replace(/\d/g, '');
  }

  static removeLetters(str: string): string {
    return str.replace(/[a-zA-Z]/g, '');
  }

  static isEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static isPhoneNumber(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  static isCreditCard(cardNumber: string): boolean {
    const cardRegex = /^[0-9]{13,19}$/;
    return cardRegex.test(cardNumber.replace(/\s/g, ''));
  }

  static isUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  static isSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug);
  }

  static isAlphanumeric(str: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(str);
  }

  static isNumeric(str: string): boolean {
    return /^\d+$/.test(str);
  }

  static isAlpha(str: string): boolean {
    return /^[a-zA-Z]+$/.test(str);
  }

  static isEmpty(str: string): boolean {
    return !str || str.trim().length === 0;
  }

  static isNotEmpty(str: string): boolean {
    return str && str.trim().length > 0;
  }

  static countWords(str: string): number {
    return str.trim().split(/\s+/).length;
  }

  static countCharacters(str: string): number {
    return str.length;
  }

  static countLines(str: string): number {
    return str.split('\n').length;
  }

  static reverse(str: string): string {
    return str.split('').reverse().join('');
  }

  static shuffle(str: string): string {
    return str.split('').sort(() => Math.random() - 0.5).join('');
  }

  static sort(str: string): string {
    return str.split('').sort().join('');
  }

  static unique(str: string): string {
    return [...new Set(str.split(''))].join('');
  }

  static repeat(str: string, count: number): string {
    return str.repeat(count);
  }

  static padStart(str: string, length: number, padString: string = ' '): string {
    return str.padStart(length, padString);
  }

  static padEnd(str: string, length: number, padString: string = ' '): string {
    return str.padEnd(length, padString);
  }

  static pad(str: string, length: number, padString: string = ' '): string {
    return str.padStart(Math.ceil((length + str.length) / 2), padString).padEnd(length, padString);
  }
}
