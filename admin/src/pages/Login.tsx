import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuthStore();
  
  // Use refs instead of state for form values
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  
  const [isSetup, setIsSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);
  
  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) => 
      authApi.login(data.email, data.password),
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      toast.success('Добро пожаловать!');
      navigate('/');
    },
    onError: (error: Error) => {
      setIsLoading(false);
      if (error.message.includes('Setup')) {
        setIsSetup(true);
      } else {
        toast.error(error.message || 'Ошибка входа');
      }
    }
  });
  
  const setupMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) => 
      authApi.setup(data.email, data.password),
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      toast.success('Аккаунт создан!');
      navigate('/');
    },
    onError: (error: Error) => {
      setIsLoading(false);
      toast.error(error.message || 'Ошибка создания аккаунта');
    }
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get values directly from DOM refs
    const email = emailRef.current?.value?.trim() || '';
    const password = passwordRef.current?.value || '';
    
    console.log('Login attempt:', { email, passwordLength: password.length });
    
    if (!email || !password) {
      toast.error('Заполните все поля');
      return;
    }
    
    setIsLoading(true);
    
    if (isSetup) {
      setupMutation.mutate({ email, password });
    } else {
      loginMutation.mutate({ email, password });
    }
  };
  
  const loading = isLoading || loginMutation.isPending || setupMutation.isPending;
  
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
              <label htmlFor="email" className="text-sm font-medium text-zinc-700">Email</label>
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                disabled={loading}
                className="flex h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-zinc-700">Пароль</label>
              <input
                ref={passwordRef}
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={loading}
                className="flex h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-white font-medium" 
              disabled={loading}
            >
              {loading ? 'Загрузка...' : isSetup ? 'Создать аккаунт' : 'Войти'}
            </Button>
          </form>
          
          {!isSetup && (
            <p className="text-xs text-center text-muted-foreground mt-4">
              Первый запуск? Введите данные и система создаст аккаунт автоматически.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
