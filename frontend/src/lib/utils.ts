import { Currency } from '../types';

// Format price with currency
export function formatPrice(price: number, currency: Currency = 'RUB'): string {
  const symbols: Record<Currency, string> = {
    RUB: '₽',
    USD: '$',
    EUR: '€'
  };
  
  const formatter = new Intl.NumberFormat(
    currency === 'RUB' ? 'ru-RU' : 'en-US',
    {
      minimumFractionDigits: currency === 'RUB' ? 0 : 2,
      maximumFractionDigits: 2
    }
  );
  
  const formattedNumber = formatter.format(price);
  
  if (currency === 'RUB') {
    return `${formattedNumber} ${symbols[currency]}`;
  }
  return `${symbols[currency]}${formattedNumber}`;
}

// Get localized text
export function getLocalizedText(
  ru: string | null | undefined,
  en: string | null | undefined,
  lang: string
): string {
  if (lang === 'en' && en) return en;
  return ru || en || '';
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Class names helper (like clsx)
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Format date
export function formatDate(dateString: string, lang: string = 'ru'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// Format relative time
export function formatRelativeTime(dateString: string, lang: string = 'ru'): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return lang === 'ru' ? 'Сегодня' : 'Today';
  }
  if (diffDays === 1) {
    return lang === 'ru' ? 'Вчера' : 'Yesterday';
  }
  if (diffDays < 7) {
    return lang === 'ru' ? `${diffDays} дней назад` : `${diffDays} days ago`;
  }
  
  return formatDate(dateString, lang);
}

// Truncate text
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// Pluralize (Russian)
export function pluralize(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  
  if (mod100 >= 11 && mod100 <= 19) {
    return many;
  }
  if (mod10 === 1) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return few;
  }
  return many;
}

// Generate placeholder image URL
export function getPlaceholderImage(text: string = 'Apple', size: number = 400): string {
  return `https://placehold.co/${size}x${size}/f5f5f7/1d1d1f?text=${encodeURIComponent(text)}`;
}

// Validate phone number
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

// Format phone number
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11 && cleaned.startsWith('7')) {
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`;
  }
  if (cleaned.length === 10) {
    return `+7 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8)}`;
  }
  
  return phone;
}

// Storage helpers with error handling
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage error:', error);
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Storage error:', error);
    }
  }
};
