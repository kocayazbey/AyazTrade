import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface Translation {
  id: string;
  key: string;
  locale: string;
  value: string;
  namespace?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface TranslationContent {
  productId?: string;
  categoryId?: string;
  pageId?: string;
  locale: string;
  title?: string;
  description?: string;
  content?: string;
  metaTitle?: string;
  metaDescription?: string;
  slug?: string;
}

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private defaultLocale: string;
  private supportedLocales: string[];
  private fallbackLocale: string;
  private translations: Map<string, Map<string, string>>;

  constructor(private configService: ConfigService) {
    this.defaultLocale = this.configService.get<string>('DEFAULT_LOCALE') || 'tr';
    this.supportedLocales = this.configService.get<string>('SUPPORTED_LOCALES')?.split(',') || ['tr', 'en'];
    this.fallbackLocale = this.configService.get<string>('FALLBACK_LOCALE') || 'en';
    this.translations = new Map();
    this.loadTranslations();
  }

  private loadTranslations(): void {
    const locales = {
      tr: {
        'common.home': 'Ana Sayfa',
        'common.products': 'Ürünler',
        'common.categories': 'Kategoriler',
        'common.cart': 'Sepet',
        'common.checkout': 'Ödeme',
        'common.account': 'Hesabım',
        'common.orders': 'Siparişlerim',
        'common.wishlist': 'Favorilerim',
        'common.search': 'Ara',
        'common.login': 'Giriş Yap',
        'common.register': 'Kayıt Ol',
        'common.logout': 'Çıkış',
        'product.add_to_cart': 'Sepete Ekle',
        'product.out_of_stock': 'Stokta Yok',
        'product.price': 'Fiyat',
        'product.description': 'Açıklama',
        'product.reviews': 'Değerlendirmeler',
        'product.specifications': 'Özellikler',
        'cart.empty': 'Sepetiniz boş',
        'cart.subtotal': 'Ara Toplam',
        'cart.total': 'Toplam',
        'cart.shipping': 'Kargo',
        'cart.tax': 'KDV',
        'cart.continue_shopping': 'Alışverişe Devam',
        'cart.proceed_checkout': 'Ödemeye Geç',
        'order.order_number': 'Sipariş Numarası',
        'order.status': 'Durum',
        'order.total': 'Toplam',
        'order.date': 'Tarih',
        'order.track': 'Takip Et',
        'order.pending': 'Beklemede',
        'order.processing': 'İşleniyor',
        'order.shipped': 'Kargoya Verildi',
        'order.delivered': 'Teslim Edildi',
        'order.cancelled': 'İptal Edildi',
        'checkout.shipping_address': 'Teslimat Adresi',
        'checkout.billing_address': 'Fatura Adresi',
        'checkout.payment_method': 'Ödeme Yöntemi',
        'checkout.shipping_method': 'Kargo Yöntemi',
        'checkout.place_order': 'Siparişi Tamamla',
        'validation.required': 'Bu alan zorunludur',
        'validation.email': 'Geçerli bir e-posta adresi giriniz',
        'validation.phone': 'Geçerli bir telefon numarası giriniz',
        'validation.min_length': 'Minimum {min} karakter olmalıdır',
        'validation.max_length': 'Maksimum {max} karakter olmalıdır',
        'success.order_placed': 'Siparişiniz başarıyla oluşturuldu',
        'success.product_added': 'Ürün sepete eklendi',
        'success.account_created': 'Hesabınız oluşturuldu',
        'error.generic': 'Bir hata oluştu',
        'error.network': 'Bağlantı hatası',
        'error.not_found': 'Bulunamadı',
      },
      en: {
        'common.home': 'Home',
        'common.products': 'Products',
        'common.categories': 'Categories',
        'common.cart': 'Cart',
        'common.checkout': 'Checkout',
        'common.account': 'My Account',
        'common.orders': 'My Orders',
        'common.wishlist': 'Wishlist',
        'common.search': 'Search',
        'common.login': 'Login',
        'common.register': 'Register',
        'common.logout': 'Logout',
        'product.add_to_cart': 'Add to Cart',
        'product.out_of_stock': 'Out of Stock',
        'product.price': 'Price',
        'product.description': 'Description',
        'product.reviews': 'Reviews',
        'product.specifications': 'Specifications',
        'cart.empty': 'Your cart is empty',
        'cart.subtotal': 'Subtotal',
        'cart.total': 'Total',
        'cart.shipping': 'Shipping',
        'cart.tax': 'Tax',
        'cart.continue_shopping': 'Continue Shopping',
        'cart.proceed_checkout': 'Proceed to Checkout',
        'order.order_number': 'Order Number',
        'order.status': 'Status',
        'order.total': 'Total',
        'order.date': 'Date',
        'order.track': 'Track',
        'order.pending': 'Pending',
        'order.processing': 'Processing',
        'order.shipped': 'Shipped',
        'order.delivered': 'Delivered',
        'order.cancelled': 'Cancelled',
        'checkout.shipping_address': 'Shipping Address',
        'checkout.billing_address': 'Billing Address',
        'checkout.payment_method': 'Payment Method',
        'checkout.shipping_method': 'Shipping Method',
        'checkout.place_order': 'Place Order',
        'validation.required': 'This field is required',
        'validation.email': 'Please enter a valid email address',
        'validation.phone': 'Please enter a valid phone number',
        'validation.min_length': 'Minimum {min} characters required',
        'validation.max_length': 'Maximum {max} characters allowed',
        'success.order_placed': 'Your order has been placed successfully',
        'success.product_added': 'Product added to cart',
        'success.account_created': 'Your account has been created',
        'error.generic': 'An error occurred',
        'error.network': 'Network error',
        'error.not_found': 'Not found',
      },
    };

    for (const [locale, translations] of Object.entries(locales)) {
      this.translations.set(locale, new Map(Object.entries(translations)));
    }
  }

  translate(key: string, locale?: string, params?: Record<string, any>): string {
    const targetLocale = locale || this.defaultLocale;
    const localeTranslations = this.translations.get(targetLocale);

    if (!localeTranslations) {
      this.logger.warn(`Locale ${targetLocale} not found, using fallback`);
      return this.translate(key, this.fallbackLocale, params);
    }

    let translation = localeTranslations.get(key);

    if (!translation && targetLocale !== this.fallbackLocale) {
      this.logger.warn(`Translation key ${key} not found in ${targetLocale}, using fallback`);
      return this.translate(key, this.fallbackLocale, params);
    }

    if (!translation) {
      this.logger.warn(`Translation key ${key} not found`);
      return key;
    }

    if (params) {
      Object.keys(params).forEach((param) => {
        translation = translation.replace(`{${param}}`, params[param].toString());
      });
    }

    return translation;
  }

  async getTranslations(locale: string, namespace?: string): Promise<Record<string, string>> {
    const localeTranslations = this.translations.get(locale);

    if (!localeTranslations) {
      throw new NotFoundException(`Locale ${locale} not found`);
    }

    const result: Record<string, string> = {};
    
    for (const [key, value] of localeTranslations.entries()) {
      if (!namespace || key.startsWith(`${namespace}.`)) {
        result[key] = value;
      }
    }

    return result;
  }

  async addTranslation(key: string, locale: string, value: string, namespace?: string): Promise<Translation> {
    let localeTranslations = this.translations.get(locale);

    if (!localeTranslations) {
      localeTranslations = new Map();
      this.translations.set(locale, localeTranslations);
    }

    localeTranslations.set(key, value);

    const translation: Translation = {
      id: `${locale}_${key}`,
      key,
      locale,
      value,
      namespace,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.logger.log(`Translation added: ${key} (${locale})`);
    return translation;
  }

  async updateTranslation(key: string, locale: string, value: string): Promise<Translation> {
    const localeTranslations = this.translations.get(locale);

    if (!localeTranslations || !localeTranslations.has(key)) {
      throw new NotFoundException(`Translation ${key} not found for locale ${locale}`);
    }

    localeTranslations.set(key, value);

    const translation: Translation = {
      id: `${locale}_${key}`,
      key,
      locale,
      value,
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    this.logger.log(`Translation updated: ${key} (${locale})`);
    return translation;
  }

  async deleteTranslation(key: string, locale: string): Promise<void> {
    const localeTranslations = this.translations.get(locale);

    if (!localeTranslations || !localeTranslations.has(key)) {
      throw new NotFoundException(`Translation ${key} not found for locale ${locale}`);
    }

    localeTranslations.delete(key);
    this.logger.log(`Translation deleted: ${key} (${locale})`);
  }

  async translateContent(content: TranslationContent): Promise<TranslationContent> {
    return content;
  }

  async getProductTranslations(productId: string, locale: string): Promise<any> {
    return {
      productId,
      locale,
      title: '',
      description: '',
      shortDescription: '',
      metaTitle: '',
      metaDescription: '',
      attributes: {},
    };
  }

  async getCategoryTranslations(categoryId: string, locale: string): Promise<any> {
    return {
      categoryId,
      locale,
      name: '',
      description: '',
      metaTitle: '',
      metaDescription: '',
    };
  }

  getSupportedLocales(): string[] {
    return this.supportedLocales;
  }

  getDefaultLocale(): string {
    return this.defaultLocale;
  }

  detectLocale(acceptLanguage?: string): string {
    if (!acceptLanguage) {
      return this.defaultLocale;
    }

    const languages = acceptLanguage.split(',').map((lang) => {
      const parts = lang.trim().split(';');
      const locale = parts[0].split('-')[0];
      const quality = parts[1] ? parseFloat(parts[1].replace('q=', '')) : 1.0;
      return { locale, quality };
    });

    languages.sort((a, b) => b.quality - a.quality);

    for (const lang of languages) {
      if (this.supportedLocales.includes(lang.locale)) {
        return lang.locale;
      }
    }

    return this.defaultLocale;
  }

  formatCurrency(amount: number, locale: string, currency: string = 'TRY'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  formatDate(date: Date, locale: string, format: 'short' | 'medium' | 'long' = 'medium'): string {
    const options: Intl.DateTimeFormatOptions = 
      format === 'short' ? { year: 'numeric', month: 'numeric', day: 'numeric' } :
      format === 'long' ? { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' } :
      { year: 'numeric', month: 'short', day: 'numeric' };

    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  formatNumber(number: number, locale: string, decimals: number = 2): string {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(number);
  }
}

