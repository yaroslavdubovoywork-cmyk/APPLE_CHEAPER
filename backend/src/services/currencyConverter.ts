import { Currency, CurrencyRates } from '../types';

// Cache for currency rates
let cachedRates: CurrencyRates | null = null;
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Base rates (RUB as base, updated periodically)
const DEFAULT_RATES: CurrencyRates = {
  RUB: 1,
  USD: 0.011, // ~90 RUB per USD
  EUR: 0.010, // ~100 RUB per EUR
  updated_at: new Date().toISOString()
};

// Fetch current exchange rates
async function fetchRates(): Promise<CurrencyRates> {
  const apiKey = process.env.CURRENCY_API_KEY;
  
  if (!apiKey) {
    console.warn('Currency API key not set, using default rates');
    return DEFAULT_RATES;
  }
  
  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/RUB`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch rates');
    }
    
    const data = await response.json();
    
    return {
      RUB: 1,
      USD: data.conversion_rates.USD || DEFAULT_RATES.USD,
      EUR: data.conversion_rates.EUR || DEFAULT_RATES.EUR,
      updated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching currency rates:', error);
    return cachedRates || DEFAULT_RATES;
  }
}

// Get current rates (with caching)
export async function getRates(): Promise<CurrencyRates> {
  const now = Date.now();
  
  if (cachedRates) {
    const cacheAge = now - new Date(cachedRates.updated_at).getTime();
    if (cacheAge < CACHE_TTL) {
      return cachedRates;
    }
  }
  
  cachedRates = await fetchRates();
  return cachedRates;
}

// Convert price from RUB to target currency
export async function convertPrice(
  priceRub: number,
  targetCurrency: Currency
): Promise<number> {
  if (targetCurrency === 'RUB') {
    return priceRub;
  }
  
  const rates = await getRates();
  const converted = priceRub * rates[targetCurrency];
  
  // Round to 2 decimal places
  return Math.round(converted * 100) / 100;
}

// Convert prices for multiple products
export async function convertPrices(
  prices: Array<{ id: string; price: number }>,
  targetCurrency: Currency
): Promise<Array<{ id: string; price: number; originalPrice: number }>> {
  const rates = await getRates();
  
  return prices.map(item => ({
    id: item.id,
    originalPrice: item.price,
    price: targetCurrency === 'RUB' 
      ? item.price 
      : Math.round(item.price * rates[targetCurrency] * 100) / 100
  }));
}

// Format price with currency symbol
export function formatPrice(price: number, currency: Currency): string {
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

// Get all available currencies
export function getAvailableCurrencies(): Array<{ code: Currency; name: string; symbol: string }> {
  return [
    { code: 'RUB', name: 'Российский рубль', symbol: '₽' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' }
  ];
}
