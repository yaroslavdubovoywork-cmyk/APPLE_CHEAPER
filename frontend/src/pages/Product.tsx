import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { productsApi, analyticsApi } from '../lib/api';
import { useCartStore } from '../store/cartStore';
import { useFavoritesStore } from '../store/favoritesStore';
import { useTelegram } from '../hooks/useTelegram';
import { Loading } from '../components/Loading';
import { formatPrice, getLocalizedText, cn, getPlaceholderImage } from '../lib/utils';

export default function Product() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const { showBackButton, hideBackButton, haptic } = useTelegram();
  
  const { addItem, isInCart, getItemQuantity, currency } = useCartStore();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  // Setup back button
  useEffect(() => {
    showBackButton(() => navigate(-1));
    return () => hideBackButton();
  }, [showBackButton, hideBackButton, navigate]);
  
  // Fetch product
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id, currency],
    queryFn: () => productsApi.getById(id!, currency),
    enabled: !!id
  });
  
  // Track product view
  useEffect(() => {
    if (product) {
      analyticsApi.trackEvent({
        event_type: 'product_view',
        product_id: product.id
      });
    }
  }, [product]);
  
  if (isLoading) {
    return <Loading fullScreen />;
  }
  
  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-zinc-950">
        <div className="text-center">
          <p className="text-zinc-500 mb-4">
            {t('common.error')}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }
  
  const name = getLocalizedText(product.name, product.name_en, i18n.language);
  const description = getLocalizedText(product.description, product.description_en, i18n.language);
  const inCart = isInCart(product.id);
  const quantity = getItemQuantity(product.id);
  const favorite = isFavorite(product.id);
  const inStock = product.stock === null || product.stock > 0;
  const categoryName = product.category 
    ? getLocalizedText(product.category.name, product.category.name_en, i18n.language)
    : product.brand || '';
  
  // Check if description is long
  const isLongDescription = description && description.length > 120;
  const displayDescription = showFullDescription || !isLongDescription
    ? description
    : description?.slice(0, 120) + '...';
  
  const handleAddToCart = () => {
    if (inStock) {
      addItem(product);
      haptic('success');
      analyticsApi.trackEvent({
        event_type: 'add_to_cart',
        product_id: product.id
      });
    }
  };
  
  const handleToggleFavorite = () => {
    toggleFavorite(product.id);
    haptic('light');
    analyticsApi.trackEvent({
      event_type: favorite ? 'remove_from_favorites' : 'add_to_favorites',
      product_id: product.id
    });
  };
  
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 pb-28">
      {/* Hero Section with Gradient Background */}
      <div className="relative">
        {/* Gradient Background */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 h-[55vh] bg-gradient-to-br from-zinc-100 via-zinc-200 to-zinc-300 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-950"
          style={{
            borderBottomLeftRadius: '40px',
            borderBottomRightRadius: '40px',
          }}
        />
        
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-20 w-10 h-10 rounded-xl bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md flex items-center justify-center shadow-lg"
        >
          <svg className="w-5 h-5 text-zinc-700 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>
        
        {/* Product Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 pt-16 px-8 pb-4"
        >
          <div className="relative aspect-square max-w-[320px] mx-auto">
            <img
              src={product.image_url || getPlaceholderImage(name.slice(0, 2), 800)}
              alt={name}
              className="w-full h-full object-contain drop-shadow-2xl"
              style={{
                filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.25))',
              }}
            />
            
            {/* Out of Stock Badge */}
            {!inStock && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-3 rounded-full bg-black/70 backdrop-blur-md"
              >
                <span className="text-white font-medium">
                  {t('product.outOfStock')}
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
      
      {/* Product Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="relative z-20 -mt-8 mx-4 bg-white dark:bg-zinc-800 dark:border dark:border-zinc-700 rounded-[32px] shadow-xl p-6"
      >
        {/* Category / Brand */}
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
          {categoryName}
        </p>
        
        {/* Product Name */}
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4 leading-tight">
          {name}
        </h1>
        
        {/* Price Section */}
        <div className="mb-6">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 tracking-wide mb-1">
            {t('product.price')}
          </p>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-zinc-900 dark:text-white">
              {formatPrice(product.price, currency)}
            </span>
            {product.original_price && product.original_price !== product.price && (
              <span className="text-lg text-zinc-400 line-through">
                {formatPrice(product.original_price, 'RUB')}
              </span>
            )}
          </div>
        </div>
        
        {/* Description */}
        {description && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs text-zinc-400 dark:text-zinc-500 tracking-wide">
                {t('product.description')}
              </p>
              {/* Rating stars placeholder */}
              <div className="flex gap-0.5 ml-auto">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={cn(
                      "w-4 h-4",
                      star <= 4 ? "text-zinc-900 dark:text-white" : "text-zinc-300 dark:text-zinc-600"
                    )}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-sm">
              {displayDescription}
              {isLongDescription && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-zinc-900 dark:text-white font-semibold ml-1 underline underline-offset-2"
                >
                  {showFullDescription ? 'Скрыть' : 'Читать далее'}
                </button>
              )}
            </p>
          </div>
        )}
        
        {/* Article */}
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-5">
          {t('product.article')}: {product.article}
        </p>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Favorite Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleFavorite}
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-200",
              favorite
                ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30"
                : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            )}
          >
            <svg
              className={cn(
                "w-6 h-6 transition-colors duration-200",
                favorite ? "text-red-500" : "text-zinc-600 dark:text-zinc-400"
              )}
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
          </motion.button>
          
          {/* Add to Cart Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleAddToCart}
            disabled={!inStock}
            className={cn(
              "flex-1 h-14 rounded-2xl font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2",
              inCart
                ? "bg-green-500 text-white"
                : inStock
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
            )}
          >
            {inCart ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {t('product.inCart')} ({quantity})
              </>
            ) : inStock ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {t('product.addToCart')}
              </>
            ) : (
              t('product.outOfStock')
            )}
          </motion.button>
        </div>
      </motion.div>
      
      {/* Price History (if exists) */}
      <AnimatePresence>
        {product.price_history && product.price_history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mx-4 mt-4 bg-white dark:bg-zinc-800 dark:border dark:border-zinc-700 rounded-[24px] shadow-lg p-5"
          >
            <h2 className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-3">
              {t('product.priceHistory')}
            </h2>
            <div className="space-y-2">
              {product.price_history.slice(0, 3).map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                >
                  <span className="text-sm text-zinc-500">
                    {new Date(item.created_at).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US')}
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {formatPrice(item.price, 'RUB')}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
