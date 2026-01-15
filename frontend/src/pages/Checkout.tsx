import { useState, useEffect, useRef } from 'react';
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
  const orderCompletedRef = useRef(false);
  
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
      // Set ref immediately to prevent redirect
      orderCompletedRef.current = true;
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
        quantity: item.quantity,
        variant_id: item.variant?.id
      })),
      ...formData,
      currency,
      telegram_id: user?.id?.toString() || 'unknown',
      telegram_username: user?.username || user?.first_name || 'unknown'
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
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-green-500/10 to-transparent">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          {/* Success Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl p-8 text-center border border-zinc-100 dark:border-zinc-800">
            {/* Animated Check Icon */}
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
              className="relative mx-auto mb-6"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                <motion.svg 
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="w-12 h-12 text-white" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={3}
                >
                  <motion.path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M5 13l4 4L19 7"
                  />
                </motion.svg>
              </div>
              {/* Pulse rings */}
              <motion.div 
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ delay: 0.3, duration: 1, repeat: 2 }}
                className="absolute inset-0 rounded-full bg-green-400"
              />
            </motion.div>
            
            {/* Title */}
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-bold text-zinc-900 dark:text-white mb-2"
            >
              {i18n.language === 'ru' ? 'Заказ принят!' : 'Order Received!'}
            </motion.h1>
            
            {/* Status Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium mb-4"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              {i18n.language === 'ru' ? 'В обработке' : 'Processing'}
            </motion.div>
            
            {/* Description */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed"
            >
              {i18n.language === 'ru' 
                ? 'Мы уже начали обрабатывать ваш заказ. Статус можно отслеживать во вкладке заказов.' 
                : 'We have started processing your order. You can track the status in the orders tab.'}
            </motion.p>
            
            {/* Orders Link Hint */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 mb-6"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  {i18n.language === 'ru' ? 'Мои заказы' : 'My Orders'}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {i18n.language === 'ru' ? 'Вкладка в нижнем меню' : 'Tab in bottom menu'}
                </p>
              </div>
              <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </motion.div>
            
            {/* Done Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/')}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-white dark:to-zinc-200 text-white dark:text-zinc-900 font-semibold text-lg shadow-lg shadow-zinc-900/20 dark:shadow-white/20 transition-all duration-200"
            >
              {i18n.language === 'ru' ? 'Готово' : 'Done'}
            </motion.button>
          </div>
          
          {/* Decorative elements */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex justify-center gap-2 mt-6"
          >
            <span className="text-2xl">🎉</span>
            <span className="text-zinc-400 dark:text-zinc-500 text-sm self-center">
              {i18n.language === 'ru' ? 'Спасибо за заказ!' : 'Thank you for your order!'}
            </span>
            <span className="text-2xl">🎉</span>
          </motion.div>
        </motion.div>
      </div>
    );
  }
  
  // Only redirect if cart is empty AND order wasn't just completed
  if (items.length === 0 && !isSuccess && !orderCompletedRef.current) {
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
