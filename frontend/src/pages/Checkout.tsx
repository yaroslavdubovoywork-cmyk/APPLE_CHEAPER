import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ordersApi, analyticsApi } from '../lib/api';
import { useCartStore } from '../store/cartStore';
import { useTelegram } from '../hooks/useTelegram';
import { Loading } from '../components/Loading';
import { formatPrice, isValidPhone, cn } from '../lib/utils';

export default function Checkout() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { showBackButton, hideBackButton, haptic, showAlert, user } = useTelegram();
  
  const { items, clearCart, getTotal, currency } = useCartStore();
  const total = getTotal();
  
  const [formData, setFormData] = useState({
    contact_name: user?.first_name || '',
    contact_phone: '',
    contact_address: '',
    notes: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Setup back button
  useEffect(() => {
    showBackButton(() => navigate('/cart'));
    return () => hideBackButton();
  }, [showBackButton, hideBackButton, navigate]);
  
  // Track checkout start
  useEffect(() => {
    analyticsApi.trackEvent({
      event_type: 'checkout_start',
      metadata: { items_count: items.length, total }
    });
  }, []);
  
  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      setIsSuccess(true);
      clearCart();
      haptic('success');
    },
    onError: (error: Error) => {
      showAlert(error.message || t('common.error'));
      haptic('error');
    }
  });
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.contact_name.trim()) {
      newErrors.contact_name = i18n.language === 'ru' 
        ? 'Введите имя' 
        : 'Enter your name';
    }
    
    if (!formData.contact_phone.trim()) {
      newErrors.contact_phone = i18n.language === 'ru' 
        ? 'Введите телефон' 
        : 'Enter phone number';
    } else if (!isValidPhone(formData.contact_phone)) {
      newErrors.contact_phone = i18n.language === 'ru' 
        ? 'Неверный формат телефона' 
        : 'Invalid phone format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      haptic('error');
      return;
    }
    
    createOrderMutation.mutate({
      items: items.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      })),
      ...formData,
      currency
    });
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-[var(--tg-theme-text-color)] mb-2">
            {t('checkout.success')}
          </h1>
          
          <p className="text-[var(--tg-theme-hint-color)] mb-8">
            {t('checkout.successText')}
          </p>
          
          <button
            onClick={() => navigate('/')}
            className="px-8 py-4 rounded-2xl bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] font-semibold"
          >
            {t('catalog.title')}
          </button>
        </motion.div>
      </div>
    );
  }
  
  if (items.length === 0) {
    navigate('/cart');
    return null;
  }
  
  return (
    <div className="min-h-screen pt-safe-top pb-8">
      <header className="px-4 py-4">
        <h1 className="text-2xl font-bold text-[var(--tg-theme-text-color)]">
          {t('checkout.title')}
        </h1>
      </header>
      
      <form onSubmit={handleSubmit} className="px-4 space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-[var(--tg-theme-text-color)] mb-2">
            {t('checkout.name')} *
          </label>
          <input
            type="text"
            name="contact_name"
            value={formData.contact_name}
            onChange={handleChange}
            className={cn(
              "w-full px-4 py-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color)]",
              "text-[var(--tg-theme-text-color)] placeholder:text-[var(--tg-theme-hint-color)]",
              "outline-none focus:ring-2 focus:ring-[var(--tg-theme-button-color)]/30",
              errors.contact_name && "ring-2 ring-red-500"
            )}
            placeholder={i18n.language === 'ru' ? 'Иван Иванов' : 'John Doe'}
          />
          {errors.contact_name && (
            <p className="text-sm text-red-500 mt-1">{errors.contact_name}</p>
          )}
        </div>
        
        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-[var(--tg-theme-text-color)] mb-2">
            {t('checkout.phone')} *
          </label>
          <input
            type="tel"
            name="contact_phone"
            value={formData.contact_phone}
            onChange={handleChange}
            className={cn(
              "w-full px-4 py-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color)]",
              "text-[var(--tg-theme-text-color)] placeholder:text-[var(--tg-theme-hint-color)]",
              "outline-none focus:ring-2 focus:ring-[var(--tg-theme-button-color)]/30",
              errors.contact_phone && "ring-2 ring-red-500"
            )}
            placeholder="+7 (999) 123-45-67"
          />
          {errors.contact_phone && (
            <p className="text-sm text-red-500 mt-1">{errors.contact_phone}</p>
          )}
        </div>
        
        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-[var(--tg-theme-text-color)] mb-2">
            {t('checkout.address')}
          </label>
          <input
            type="text"
            name="contact_address"
            value={formData.contact_address}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] placeholder:text-[var(--tg-theme-hint-color)] outline-none focus:ring-2 focus:ring-[var(--tg-theme-button-color)]/30"
            placeholder={i18n.language === 'ru' ? 'Город, улица, дом' : 'City, street, building'}
          />
        </div>
        
        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-[var(--tg-theme-text-color)] mb-2">
            {t('checkout.notes')}
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] placeholder:text-[var(--tg-theme-hint-color)] outline-none focus:ring-2 focus:ring-[var(--tg-theme-button-color)]/30 resize-none"
            placeholder={i18n.language === 'ru' ? 'Дополнительная информация' : 'Additional information'}
          />
        </div>
        
        {/* Order Summary */}
        <div className="bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl p-4">
          <h3 className="font-semibold text-[var(--tg-theme-text-color)] mb-3">
            {i18n.language === 'ru' ? 'Ваш заказ' : 'Your order'}
          </h3>
          
          <div className="space-y-2 mb-4">
            {items.map(item => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span className="text-[var(--tg-theme-text-color)] truncate mr-2">
                  {item.product.name} × {item.quantity}
                </span>
                <span className="text-[var(--tg-theme-text-color)] shrink-0">
                  {formatPrice(item.product.price * item.quantity, currency)}
                </span>
              </div>
            ))}
          </div>
          
          <div className="border-t border-[var(--tg-theme-hint-color)]/20 pt-3 flex justify-between">
            <span className="font-semibold text-[var(--tg-theme-text-color)]">
              {t('cart.total')}
            </span>
            <span className="font-bold text-lg text-[var(--tg-theme-text-color)]">
              {formatPrice(total, currency)}
            </span>
          </div>
        </div>
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={createOrderMutation.isPending}
          className="w-full py-4 rounded-2xl bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] font-semibold text-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
        >
          {createOrderMutation.isPending ? (
            <Loading size="sm" className="mx-auto" />
          ) : (
            t('checkout.submit')
          )}
        </button>
      </form>
    </div>
  );
}
