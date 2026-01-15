import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import toast from 'react-hot-toast';

// Set to false to enable real Supabase authentication
const USE_DEMO = false;

export default function Login() {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSetup, setIsSetup] = useState(false);
  
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);
  
  const loginMutation = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      toast.success('Добро пожаловать!');
      navigate('/');
    },
    onError: (error: Error) => {
      // Check if setup is needed
      if (error.message.includes('Setup')) {
        setIsSetup(true);
      } else {
        toast.error(error.message || 'Ошибка входа');
      }
    }
  });
  
  const setupMutation = useMutation({
    mutationFn: () => authApi.setup(email, password),
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      toast.success('Аккаунт создан!');
      navigate('/');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Ошибка создания аккаунта');
    }
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Demo mode - skip backend
    if (USE_DEMO) {
      const demoUser = {
        id: 'demo-admin',
        email: email || 'admin@demo.com',
        role: 'admin' as const,
        telegram_id: null,
        created_at: new Date().toISOString()
      };
      setAuth('demo-token', demoUser);
      toast.success('Добро пожаловать в демо-режим!');
      navigate('/');
      return;
    }
    
    if (!email || !password) {
      toast.error('Заполните все поля');
      return;
    }
    
    if (isSetup) {
      setupMutation.mutate();
    } else {
      loginMutation.mutate();
    }
  };
  
  const isLoading = loginMutation.isPending || setupMutation.isPending;
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-zinc-50 to-zinc-100">
      <Card className="w-full max-w-md shadow-xl border-zinc-200/50">
        <CardHeader className="text-center pb-2">
          <div className="text-5xl mb-4">🍎</div>
          <CardTitle className="text-2xl font-semibold tracking-tight">Apple Cheaper</CardTitle>
          <CardDescription className="text-base">
            {isSetup 
              ? 'Создайте первый аккаунт администратора' 
              : 'Вход в панель управления'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                disabled={isLoading}
                className="flex h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="flex h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-white font-medium" 
              disabled={isLoading}
            >
              {isLoading ? 'Загрузка...' : isSetup ? 'Создать аккаунт' : 'Войти'}
            </Button>
          </form>
          
          {USE_DEMO && (
            <p className="text-xs text-center text-emerald-600 mt-4 font-medium">
              🚀 Демо-режим: нажмите "Войти" без заполнения полей
            </p>
          )}
          
          {!isSetup && !USE_DEMO && (
            <p className="text-xs text-center text-muted-foreground mt-4">
              Первый запуск? Введите данные и система создаст аккаунт автоматически.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
