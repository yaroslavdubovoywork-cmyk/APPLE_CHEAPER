import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import toast from 'react-hot-toast';

// API URL for auth
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    
    // Get form data directly from the form element
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string)?.trim() || '';
    const password = formData.get('password') as string || '';
    
    // Debug log
    console.log('Form submitted with:', { email, passwordLength: password.length });
    
    if (!email || !password) {
      setError('Заполните все поля');
      toast.error('Заполните все поля');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка входа');
      }
      
      // Store token
      if (data.token) {
        localStorage.setItem('admin_token', data.token);
      }
      
      setAuth(data.token, data.user);
      toast.success('Добро пожаловать!');
      navigate('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка входа';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-zinc-50 to-zinc-100">
      <Card className="w-full max-w-md shadow-xl border-zinc-200/50">
        <CardHeader className="text-center pb-2">
          <div className="text-5xl mb-4">🍎</div>
          <CardTitle className="text-2xl font-semibold tracking-tight">Apple Cheaper</CardTitle>
          <CardDescription className="text-base">
            Вход в панель управления
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-zinc-700">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                disabled={isLoading}
                required
                className="flex h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-zinc-700">Пароль</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={isLoading}
                required
                className="flex h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            
            <button 
              type="submit" 
              className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={isLoading}
            >
              {isLoading ? 'Загрузка...' : 'Войти'}
            </button>
          </form>
          
          <p className="text-xs text-center text-zinc-500 mt-4">
            Первый запуск? Введите данные и система создаст аккаунт автоматически.
          </p>
          
          <p className="text-xs text-center text-zinc-400 mt-2">
            API: {API_URL}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
