import { PriceUpdateItem, PriceUpdateResult } from '../types';
import { supabaseAdmin } from '../config/supabase';

// Parse price string with currency support
function parsePrice(priceStr: string): number | null {
  // Remove currency symbols and whitespace
  const cleaned = priceStr
    .replace(/[₽$€руб\.rub\s]/gi, '')
    .replace(/,/g, '.')
    .trim();
  
  const price = parseFloat(cleaned);
  return isNaN(price) || price <= 0 ? null : price;
}

// Parse CSV/TSV format
function parseCSV(content: string, delimiter: string = ';'): PriceUpdateItem[] {
  const lines = content.trim().split('\n');
  const items: PriceUpdateItem[] = [];
  
  // Skip header if present
  const startIndex = lines[0].toLowerCase().includes('артикул') || 
                     lines[0].toLowerCase().includes('article') ||
                     lines[0].toLowerCase().includes('название') ||
                     lines[0].toLowerCase().includes('name') ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(delimiter).map(p => p.trim());
    
    if (parts.length >= 2) {
      // Try to parse: Article;Name;Price or Article;Price or Name;Price
      if (parts.length >= 3) {
        const price = parsePrice(parts[2]);
        if (price !== null) {
          items.push({
            article: parts[0] || undefined,
            name: parts[1] || undefined,
            price
          });
        }
      } else {
        const price = parsePrice(parts[1]);
        if (price !== null) {
          // Check if first part looks like an article (contains numbers/letters without spaces)
          const isArticle = /^[A-Z0-9-_]+$/i.test(parts[0]);
          items.push({
            article: isArticle ? parts[0] : undefined,
            name: isArticle ? undefined : parts[0],
            price
          });
        }
      }
    }
  }
  
  return items;
}

// Parse simple text format (Name: Price)
function parseTextFormat(content: string): PriceUpdateItem[] {
  const lines = content.trim().split('\n');
  const items: PriceUpdateItem[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Try format: "Name: Price" or "Name - Price"
    const match = trimmed.match(/^(.+?)[\s]*[:–-][\s]*(.+)$/);
    if (match) {
      const price = parsePrice(match[2]);
      if (price !== null) {
        items.push({
          name: match[1].trim(),
          price
        });
      }
    }
  }
  
  return items;
}

// Auto-detect format and parse
export function parsePriceData(content: string): PriceUpdateItem[] {
  const trimmed = content.trim();
  
  // Check for CSV/TSV delimiters
  if (trimmed.includes(';')) {
    return parseCSV(trimmed, ';');
  }
  if (trimmed.includes('\t')) {
    return parseCSV(trimmed, '\t');
  }
  if (trimmed.includes(',') && trimmed.split('\n')[0].split(',').length >= 2) {
    return parseCSV(trimmed, ',');
  }
  
  // Fall back to text format
  return parseTextFormat(trimmed);
}

// Update prices in database
export async function updatePrices(items: PriceUpdateItem[]): Promise<PriceUpdateResult> {
  const result: PriceUpdateResult = {
    success: 0,
    failed: 0,
    errors: []
  };
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const lineNumber = i + 1;
    
    try {
      let product = null;
      
      // First try to find by article
      if (item.article) {
        const { data } = await supabaseAdmin
          .from('products')
          .select('id, price')
          .eq('article', item.article)
          .single();
        product = data;
      }
      
      // If not found, try by name
      if (!product && item.name) {
        const { data } = await supabaseAdmin
          .from('products')
          .select('id, price')
          .ilike('name', `%${item.name}%`)
          .limit(1)
          .single();
        product = data;
      }
      
      if (!product) {
        result.failed++;
        result.errors.push({
          line: lineNumber,
          article: item.article,
          name: item.name,
          reason: 'Товар не найден'
        });
        continue;
      }
      
      // Save old price to history
      await supabaseAdmin
        .from('price_history')
        .insert({
          product_id: product.id,
          price: product.price
        });
      
      // Update price
      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update({ price: item.price, updated_at: new Date().toISOString() })
        .eq('id', product.id);
      
      if (updateError) {
        result.failed++;
        result.errors.push({
          line: lineNumber,
          article: item.article,
          name: item.name,
          reason: updateError.message
        });
      } else {
        result.success++;
      }
    } catch (error) {
      result.failed++;
      result.errors.push({
        line: lineNumber,
        article: item.article,
        name: item.name,
        reason: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  }
  
  return result;
}

// Validate price data before processing
export function validatePriceData(items: PriceUpdateItem[]): string[] {
  const errors: string[] = [];
  
  if (items.length === 0) {
    errors.push('Не удалось распознать данные. Проверьте формат файла.');
    return errors;
  }
  
  const seen = new Set<string>();
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const line = i + 1;
    
    if (!item.article && !item.name) {
      errors.push(`Строка ${line}: отсутствует артикул или название`);
    }
    
    if (item.price <= 0) {
      errors.push(`Строка ${line}: некорректная цена`);
    }
    
    const key = item.article || item.name || '';
    if (seen.has(key)) {
      errors.push(`Строка ${line}: дубликат записи "${key}"`);
    }
    seen.add(key);
  }
  
  return errors;
}
