import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../config/supabase';
import { generateToken, verifyToken } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  telegram_id: z.string().optional()
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6)
});

// POST /api/auth/login - Admin login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const { data: user, error } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error || !user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        telegram_id: user.telegram_id
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/register - Register admin (protected, only existing admin can create)
router.post('/register', verifyToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create new users' });
    }
    
    const { email, password, telegram_id } = registerSchema.parse(req.body);
    
    // Check if user exists
    const { data: existing } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();
    
    if (existing) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }
    
    const password_hash = await bcrypt.hash(password, 12);
    
    const { data: user, error } = await supabaseAdmin
      .from('admin_users')
      .insert({
        email: email.toLowerCase(),
        password_hash,
        telegram_id: telegram_id || null,
        role: 'manager' // New users are managers by default
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role,
      telegram_id: user.telegram_id
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, role, telegram_id, created_at')
      .eq('id', req.user?.userId)
      .single();
    
    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/auth/password - Change password
router.put('/password', verifyToken, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    
    const { data: user, error } = await supabaseAdmin
      .from('admin_users')
      .select('password_hash')
      .eq('id', req.user?.userId)
      .single();
    
    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверный текущий пароль' });
    }
    
    const password_hash = await bcrypt.hash(newPassword, 12);
    
    await supabaseAdmin
      .from('admin_users')
      .update({ password_hash, updated_at: new Date().toISOString() })
      .eq('id', req.user?.userId);
    
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// POST /api/auth/setup - Initial setup (create first admin)
router.post('/setup', async (req: Request, res: Response) => {
  try {
    // Check if any admin exists
    const { count } = await supabaseAdmin
      .from('admin_users')
      .select('*', { count: 'exact', head: true });
    
    if (count && count > 0) {
      return res.status(400).json({ error: 'Setup already completed' });
    }
    
    const { email, password } = loginSchema.parse(req.body);
    
    const password_hash = await bcrypt.hash(password, 12);
    
    const { data: user, error } = await supabaseAdmin
      .from('admin_users')
      .insert({
        email: email.toLowerCase(),
        password_hash,
        role: 'admin'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });
    
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Setup failed' });
  }
});

export default router;
