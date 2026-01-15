import { memo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Product } from '../types';
import { useCartStore } from '../store/cartStore';
import { useFavoritesStore } from '../store/favoritesStore';
import { formatPrice, getLocalizedText, cn, getPlaceholderImage } from '../lib/utils';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export const ProductCard = memo(function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();
  const { addItem, isInCart, currency } = useCartStore();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  
  const name = getLocalizedText(product.name, product.name_en, i18n.language);
  const inCart = isInCart(product.id);
  const favorite = isFavorite(product.id);
  const inStock = product.stock === null || product.stock > 0;
  
  // Check if product has variants (show "from" prefix)
  const hasVariants = product.variants && product.variants.length > 0;
  
  // Calculate min price from base price and variant prices
  const getMinPrice = () => {
    if (!hasVariants) return product.price;
    const variantPrices = product.variants!
      .map(v => v.price)
      .filter((p): p is number => p !== null && p !== undefined);
    if (variantPrices.length === 0) return product.price;
    return Math.min(product.price, ...variantPrices);
  };
  
  const displayPrice = getMinPrice();
  const pricePrefix = hasVariants ? (i18n.language === 'ru' ? 'от ' : 'from ') : '';
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inStock && !inCart) {
      addItem(product);
    }
  };
  
  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleFavorite(product.id);
    // Invalidate favorites query to refresh the list
    queryClient.invalidateQueries({ queryKey: ['favorites'] });
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1]
      }}
      className="relative pt-20"
    >
      <Link
        to={`/product/${product.id}`}
        className="group block"
      >
        {/* Card Container */}
        <div className="relative rounded-[28px] bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-800 dark:border dark:border-zinc-600 px-3 pt-20 pb-3 min-h-[160px]">
          
          {/* Product Image - FLOATING ABOVE THE CARD */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[85%] h-32 z-10 pointer-events-none">
            <img
              src={product.image_url || getPlaceholderImage(name.slice(0, 2))}
              alt={name}
              className={cn(
                "w-full h-full object-contain",
                "transition-all duration-500 ease-out",
                "group-hover:scale-110 group-hover:-translate-y-2",
                "drop-shadow-xl"
              )}
              style={{
                filter: 'drop-shadow(0 25px 35px rgba(0,0,0,0.2))'
              }}
              loading="lazy"
            />
          </div>
          
          {/* Bottom Info */}
          <div className="relative z-10">
            {/* Product Name & Category */}
            <div className="mb-1">
              <h3 className="font-semibold text-[14px] text-zinc-900 dark:text-white leading-tight line-clamp-2">
                {name}
              </h3>
              {product.category && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {getLocalizedText(product.category.name, product.category.name_en, i18n.language)}
                </p>
              )}
            </div>
            
            {/* Price & Buttons Row */}
            <div className="flex items-center justify-between gap-1">
              <p className="font-bold text-[15px] text-zinc-900 dark:text-white whitespace-nowrap">
                <span className="font-normal text-[12px] text-zinc-500 dark:text-zinc-400">{pricePrefix}</span>
                {formatPrice(displayPrice, currency)}
              </p>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                {/* Favorite Button */}
                <button
                  onClick={handleToggleFavorite}
                  className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-full",
                    "transition-all duration-300 ease-out active:scale-90",
                    favorite 
                      ? "bg-red-500 text-white" 
                      : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                  )}
                  aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <svg
                    className="w-4 h-4"
                    fill={favorite ? "currentColor" : "none"}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
                
                {/* Add to Cart Button */}
                {inStock && (
                  <button
                    onClick={handleAddToCart}
                    className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-full",
                      "transition-all duration-300 ease-out active:scale-90",
                      inCart
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "bg-black text-white dark:bg-white dark:text-black hover:scale-110 shadow-lg"
                    )}
                    aria-label={inCart ? t('product.inCart') : t('product.addToCart')}
                  >
                    {inCart ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Out of Stock Overlay */}
          {!inStock && (
            <div className="absolute inset-0 rounded-[28px] bg-white/70 dark:bg-black/70 flex items-center justify-center backdrop-blur-sm z-30">
              <span className="text-zinc-900 dark:text-white text-sm font-medium px-4 py-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
                {t('product.outOfStock')}
              </span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
});
