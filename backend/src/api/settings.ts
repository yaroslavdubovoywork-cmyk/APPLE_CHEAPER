import { Router, Request, Response } from 'express';
import { supabaseAdmin, supabase } from '../config/supabase';
import { verifyToken } from '../middleware/auth';
import { getRates, getAvailableCurrencies } from '../services/currencyConverter';

const router = Router();

// Default settings
const DEFAULT_SETTINGS: Record<string, string> = {
  'store_name': 'Apple Cheaper',
  'store_description': 'Лучшие цены на технику Apple',
  'store_description_en': 'Best prices for Apple products',
  'contact_phone': '',
  'contact_email': '',
  'contact_telegram': '',
  'default_currency': 'RUB',
  'min_order_amount': '0',
  'delivery_info': '',
  'delivery_info_en': '',
  'working_hours': ''
};

// GET /api/settings - Get all settings
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*');
    
    if (error) throw error;
    
    // Merge with defaults
    const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
    data?.forEach(item => {
      settings[item.key] = item.value;
    });
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// GET /api/settings/:key - Get single setting
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();
    
    if (error || !data) {
      // Return default value if exists
      if (DEFAULT_SETTINGS[key] !== undefined) {
        return res.json({ key, value: DEFAULT_SETTINGS[key] });
      }
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    res.json({ key, value: data.value });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// PUT /api/settings - Update settings (admin only)
router.put('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    
    if (typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid settings format' });
    }
    
    for (const [key, value] of Object.entries(settings)) {
      if (typeof value !== 'string') continue;
      
      await supabaseAdmin
        .from('settings')
        .upsert({
          key,
          value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// PUT /api/settings/:key - Update single setting (admin only)
router.put('/:key', verifyToken, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (typeof value !== 'string') {
      return res.status(400).json({ error: 'Value must be a string' });
    }
    
    await supabaseAdmin
      .from('settings')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// GET /api/settings/currencies/rates - Get currency rates
router.get('/currencies/rates', async (req: Request, res: Response) => {
  try {
    const rates = await getRates();
    res.json(rates);
  } catch (error) {
    console.error('Error fetching currency rates:', error);
    res.status(500).json({ error: 'Failed to fetch currency rates' });
  }
});

// GET /api/settings/currencies/list - Get available currencies
router.get('/currencies/list', async (req: Request, res: Response) => {
  try {
    const currencies = getAvailableCurrencies();
    res.json(currencies);
  } catch (error) {
    console.error('Error fetching currencies:', error);
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
});

export default router;
