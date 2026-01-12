import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../store/cartStore';
import { useTelegram } from '../hooks/useTelegram';
import { CartItem } from '../components/CartItem';
import { EmptyState, CartIcon } from '../components/EmptyState';
import { formatPrice, pluralize } from '../lib/utils';

export default function Cart() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { haptic, showConfirm } = useTelegram();
  
  const { items, clearCart, getTotal, getItemCount, currency } = useCartStore();
  const total = getTotal();
  const itemCount = getItemCount();
  
  // Trigger haptic on item count change
  useEffect(() => {
    if (itemCount > 0) {
      haptic('selection');
    }
  }, [itemCount, haptic]);
  
  const handleClearCart = async () => {
    const confirmed = await showConfirm(
      i18n.language === 'ru' 
        ? 'Очистить корзину?' 
        : 'Clear cart?'
    );
    if (confirmed) {
      clearCart();
    }
  };
  
  const handleCheckout = () => {
    navigate('/checkout');
  };
  
  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-safe-top pb-24">
        <header className="px-4 py-4">
          <h1 className="text-2xl font-bold text-[var(--tg-theme-text-color)]">
            {t('cart.title')}
          </h1>
        </header>
        
        <EmptyState
          icon={<CartIcon />}
          title={t('cart.empty')}
          description={t('cart.emptyText')}
          action={
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-full bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] font-medium"
            >
              {t('catalog.title')}
            </button>
          }
        />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-safe-top pb-40">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--tg-theme-text-color)]">
            {t('cart.title')}
          </h1>
          <p className="text-sm text-[var(--tg-theme-hint-color)]">
            {itemCount} {i18n.language === 'ru' 
              ? pluralize(itemCount, 'товар', 'товара', 'товаров')
              : t('cart.items')
            }
          </p>
        </div>
        
        <button
          onClick={handleClearCart}
          className="text-sm text-red-500 font-medium"
        >
          {t('cart.clear')}
        </button>
      </header>
      
      {/* Cart Items */}
      <div className="px-4">
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => (
            <CartItem key={item.product.id} item={item} index={index} />
          ))}
        </AnimatePresence>
      </div>
      
      {/* Bottom Summary & Checkout */}
      <div className="fixed bottom-16 left-0 right-0 p-4 glass border-t border-[var(--tg-theme-hint-color)]/10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[var(--tg-theme-hint-color)]">
            {t('cart.total')}
          </span>
          <motion.span
            key={total}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-2xl font-bold text-[var(--tg-theme-text-color)]"
          >
            {formatPrice(total, currency)}
          </motion.span>
        </div>
        
        <button
          onClick={handleCheckout}
          className="w-full py-4 rounded-2xl bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] font-semibold text-lg transition-all duration-200 active:scale-[0.98]"
        >
          {t('cart.checkout')}
        </button>
      </div>
    </div>
  );
}
