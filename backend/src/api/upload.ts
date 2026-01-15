import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/supabase';
import { verifyToken } from '../middleware/auth';
import { parsePriceData, updatePrices, validatePriceData } from '../services/priceParser';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'text/csv',
      'text/plain',
      'application/vnd.ms-excel'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// POST /api/upload/image - Upload product image
router.post('/image', verifyToken, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileExt = req.file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `products/${fileName}`;
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('images')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });
    
    if (uploadError) {
      throw uploadError;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('images')
      .getPublicUrl(filePath);
    
    res.json({ url: publicUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// DELETE /api/upload/image - Delete product image
router.delete('/image', verifyToken, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Extract file path from URL
    const match = url.match(/\/images\/(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid image URL' });
    }
    
    const filePath = match[1];
    
    const { error } = await supabaseAdmin
      .storage
      .from('images')
      .remove([filePath]);
    
    if (error) {
      throw error;
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// POST /api/upload/prices - Upload price list
router.post('/prices', verifyToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    let content: string;
    
    if (req.file) {
      // File uploaded
      content = req.file.buffer.toString('utf-8');
    } else if (req.body.content) {
      // Text content provided directly
      content = req.body.content;
    } else {
      return res.status(400).json({ error: 'No file or content provided' });
    }
    
    // Parse price data
    const items = parsePriceData(content);
    
    // Validate
    const validationErrors = validatePriceData(items);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
    // Preview mode - just return parsed data without updating
    if (req.query.preview === 'true') {
      return res.json({ 
        items,
        count: items.length
      });
    }
    
    // Update prices
    const result = await updatePrices(items);
    
    res.json(result);
  } catch (error) {
    console.error('Error processing price list:', error);
    res.status(500).json({ error: 'Failed to process price list' });
  }
});

// POST /api/upload/prices/preview - Preview price list without updating
router.post('/prices/preview', verifyToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    let content: string;
    
    if (req.file) {
      content = req.file.buffer.toString('utf-8');
    } else if (req.body.content) {
      content = req.body.content;
    } else {
      return res.status(400).json({ error: 'No file or content provided' });
    }
    
    // Parse price data
    const items = parsePriceData(content);
    
    // Validate
    const validationErrors = validatePriceData(items);
    
    // Get current prices for comparison
    const itemsWithCurrentPrices = await Promise.all(
      items.map(async (item) => {
        let currentPrice: number | null = null;
        let productId: string | null = null;
        let productName: string | null = null;
        
        // Try to find by article
        if (item.article) {
          const { data } = await supabaseAdmin
            .from('products')
            .select('id, name, price')
            .eq('article', item.article)
            .single();
          
          if (data) {
            currentPrice = data.price;
            productId = data.id;
            productName = data.name;
          }
        }
        
        // Try by name if not found
        if (currentPrice === null && item.name) {
          const { data } = await supabaseAdmin
            .from('products')
            .select('id, name, price')
            .ilike('name', `%${item.name}%`)
            .limit(1)
            .single();
          
          if (data) {
            currentPrice = data.price;
            productId = data.id;
            productName = data.name;
          }
        }
        
        return {
          ...item,
          product_id: productId,
          product_name: productName,
          current_price: currentPrice,
          price_change: currentPrice !== null ? item.price - currentPrice : null,
          found: currentPrice !== null
        };
      })
    );
    
    const summary = {
      total: items.length,
      found: itemsWithCurrentPrices.filter(i => i.found).length,
      not_found: itemsWithCurrentPrices.filter(i => !i.found).length,
      price_increased: itemsWithCurrentPrices.filter(i => i.price_change !== null && i.price_change > 0).length,
      price_decreased: itemsWithCurrentPrices.filter(i => i.price_change !== null && i.price_change < 0).length,
      price_unchanged: itemsWithCurrentPrices.filter(i => i.price_change === 0).length
    };
    
    res.json({ 
      items: itemsWithCurrentPrices,
      summary,
      validationErrors
    });
  } catch (error) {
    console.error('Error previewing price list:', error);
    res.status(500).json({ error: 'Failed to preview price list' });
  }
});

export default router;
