import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWTPayload, TelegramWebAppInitData } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      telegramUser?: {
        id: number;
        first_name: string;
        last_name?: string;
        username?: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

// Verify JWT token for admin routes
export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

// Verify admin role
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
}

// Generate JWT token
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verify Telegram WebApp init data
export function verifyTelegramWebApp(req: Request, res: Response, next: NextFunction) {
  const initData = req.headers['x-telegram-init-data'] as string;
  
  if (!initData) {
    // Allow requests without Telegram auth for development
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    return res.status(401).json({ error: 'Telegram authentication required' });
  }
  
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      throw new Error('Hash not found');
    }
    
    // Remove hash from data
    urlParams.delete('hash');
    
    // Sort params alphabetically and create check string
    const sortedParams = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Create secret key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(TELEGRAM_BOT_TOKEN)
      .digest();
    
    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(sortedParams)
      .digest('hex');
    
    if (calculatedHash !== hash) {
      throw new Error('Invalid hash');
    }
    
    // Parse user data
    const userDataStr = urlParams.get('user');
    if (userDataStr) {
      req.telegramUser = JSON.parse(userDataStr);
    }
    
    next();
  } catch (error) {
    console.error('Telegram auth error:', error);
    return res.status(401).json({ error: 'Invalid Telegram authentication' });
  }
}

// Optional Telegram auth (doesn't block if not present)
export function optionalTelegramAuth(req: Request, res: Response, next: NextFunction) {
  const initData = req.headers['x-telegram-init-data'] as string;
  
  if (initData) {
    try {
      const urlParams = new URLSearchParams(initData);
      const userDataStr = urlParams.get('user');
      if (userDataStr) {
        req.telegramUser = JSON.parse(userDataStr);
      }
    } catch (error) {
      // Ignore errors for optional auth
    }
  }
  
  next();
}
