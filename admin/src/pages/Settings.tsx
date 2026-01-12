import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { settingsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import toast from 'react-hot-toast';

export default function Settings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Fetch settings
  const { data: serverSettings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getAll
  });
  
  // Update settings
  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Настройки сохранены');
      setHasChanges(false);
    },
    onError: (error: Error) => toast.error(error.message)
  });
  
  // Sync with server data
  useEffect(() => {
    if (serverSettings) {
      setSettings(serverSettings);
    }
  }, [serverSettings]);
  
  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };
  
  const handleSave = () => {
    updateMutation.mutate(settings);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Настройки</h1>
          <p className="text-muted-foreground">Конфигурация магазина</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || updateMutation.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>
      
      <div className="grid gap-6">
        {/* Store Info */}
        <Card>
          <CardHeader>
            <CardTitle>Информация о магазине</CardTitle>
            <CardDescription>Основные данные магазина</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Название магазина</label>
              <Input
                value={settings.store_name || ''}
                onChange={(e) => handleChange('store_name', e.target.value)}
                placeholder="Apple Cheaper"
              />
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Описание (RU)</label>
                <Textarea
                  value={settings.store_description || ''}
                  onChange={(e) => handleChange('store_description', e.target.value)}
                  placeholder="Лучшие цены на технику Apple"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Описание (EN)</label>
                <Textarea
                  value={settings.store_description_en || ''}
                  onChange={(e) => handleChange('store_description_en', e.target.value)}
                  placeholder="Best prices for Apple products"
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Контактная информация</CardTitle>
            <CardDescription>Контакты для связи с клиентами</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Телефон</label>
                <Input
                  value={settings.contact_phone || ''}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input
                  type="email"
                  value={settings.contact_email || ''}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  placeholder="info@apple-cheaper.ru"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Telegram</label>
                <Input
                  value={settings.contact_telegram || ''}
                  onChange={(e) => handleChange('contact_telegram', e.target.value)}
                  placeholder="@apple_cheaper"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Order Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Настройки заказов</CardTitle>
            <CardDescription>Параметры оформления заказов</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Валюта по умолчанию</label>
                <Select
                  value={settings.default_currency || 'RUB'}
                  onChange={(e) => handleChange('default_currency', e.target.value)}
                  options={[
                    { value: 'RUB', label: 'Рубли (₽)' },
                    { value: 'USD', label: 'Доллары ($)' },
                    { value: 'EUR', label: 'Евро (€)' }
                  ]}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Минимальная сумма заказа</label>
                <Input
                  type="number"
                  value={settings.min_order_amount || '0'}
                  onChange={(e) => handleChange('min_order_amount', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Delivery Info */}
        <Card>
          <CardHeader>
            <CardTitle>Информация о доставке</CardTitle>
            <CardDescription>Условия и способы доставки</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Доставка (RU)</label>
                <Textarea
                  value={settings.delivery_info || ''}
                  onChange={(e) => handleChange('delivery_info', e.target.value)}
                  placeholder="Бесплатная доставка от 10 000₽. Доставка по Москве 1-2 дня."
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Доставка (EN)</label>
                <Textarea
                  value={settings.delivery_info_en || ''}
                  onChange={(e) => handleChange('delivery_info_en', e.target.value)}
                  placeholder="Free delivery from 10,000₽. Moscow delivery 1-2 days."
                  rows={4}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Время работы</label>
              <Input
                value={settings.working_hours || ''}
                onChange={(e) => handleChange('working_hours', e.target.value)}
                placeholder="Пн-Пт: 10:00-20:00, Сб-Вс: 11:00-18:00"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
