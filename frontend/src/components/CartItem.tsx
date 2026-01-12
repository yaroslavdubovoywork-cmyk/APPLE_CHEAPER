import { memo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CartItem as CartItemType } from '../types';
import { useCartStore } from '../store/cartStore';
import { formatPrice, getLocalizedText, getPlaceholderImage } from '../lib/utils';

interface CartItemProps {
  item: CartItemType;
  index?: number;
}

export const CartItem = memo(function CartItem({ item, index = 0 }: CartItemProps) {
  const { i18n } = useTranslation();
  const { updateQuantity, removeItem, currency } = useCartStore();
  
  const name = getLocalizedText(item.product.name, item.product.name_en, i18n.language);
  const total = item.product.price * item.quantity;
  
  const handleIncrement = () => {
    updateQuantity(item.product.id, item.quantity + 1);
  };
  
  const handleDecrement = () => {
    if (item.quantity > 1) {
      updateQuantity(item.product.id, item.quantity - 1);
    } else {
      removeItem(item.product.id);
    }
  };
  
  const handleRemove = () => {
    removeItem(item.product.id);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="flex gap-4 py-4 border-b border-[var(--tg-theme-hint-color)]/20 last:border-0"
    >
      {/* Product Image */}
      <Link to={`/product/${item.product.id}`} className="shrink-0">
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-[var(--tg-theme-secondary-bg-color)]">
          <img
            src={item.product.image_url || getPlaceholderImage(name.slice(0, 2), 160)}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>
      </Link>
      
      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <Link to={`/product/${item.product.id}`}>
          <h3 className="font-medium text-[var(--tg-theme-text-color)] line-clamp-2 leading-tight mb-1">
            {name}
          </h3>
        </Link>
        
        <p className="text-sm text-[var(--tg-theme-hint-color)] mb-2">
          {formatPrice(item.product.price, currency)}
        </p>
        
        <div className="flex items-center justify-between">
          {/* Quantity Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleDecrement}
              className="w-8 h-8 rounded-full bg-[var(--tg-theme-secondary-bg-color)] flex items-center justify-center text-[var(--tg-theme-text-color)] transition-opacity hover:opacity-70 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </button>
            
            <span className="w-10 text-center font-medium text-[var(--tg-theme-text-color)]">
              {item.quantity}
            </span>
            
            <button
              onClick={handleIncrement}
              className="w-8 h-8 rounded-full bg-[var(--tg-theme-secondary-bg-color)] flex items-center justify-center text-[var(--tg-theme-text-color)] transition-opacity hover:opacity-70 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          {/* Total & Remove */}
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[var(--tg-theme-text-color)]">
              {formatPrice(total, currency)}
            </span>
            
            <button
              onClick={handleRemove}
              className="w-8 h-8 rounded-full flex items-center justify-center text-red-500 transition-opacity hover:opacity-70 active:scale-95"
              aria-label="Remove"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
