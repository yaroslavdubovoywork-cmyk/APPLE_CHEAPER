import { useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { productsApi, categoriesApi, brandsApi, analyticsApi } from '../lib/api';
import { useCartStore } from '../store/cartStore';
import { useCatalogStore } from '../store/catalogStore';
import { ProductCard } from '../components/ProductCard';
import { CategoryNav } from '../components/CategoryNav';
import { SearchInput } from '../components/SearchInput';
import { Loading, ProductCardSkeleton } from '../components/Loading';
import { EmptyState, SearchIcon } from '../components/EmptyState';
import { Product } from '../types';

// Brand Selector Component
function BrandSelector({ 
  brands, 
  selectedId, 
  onSelect 
}: { 
  brands: string[]; 
  selectedId: string; 
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto no-scrollbar -mx-5 px-5">
      <div className="flex gap-3 pb-2">
        <button
          onClick={() => onSelect('all')}
          className={`
            shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold
            transition-all duration-300 ease-out
            ${selectedId === 'all'
              ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg scale-105'
              : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }
          `}
        >
          Все
        </button>
        {brands.map((brand) => (
          <button
            key={brand}
            onClick={() => onSelect(brand)}
            className={`
              shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold
              transition-all duration-300 ease-out
              ${selectedId === brand
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg scale-105'
                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }
            `}
          >
            {brand}
          </button>
        ))}
      </div>
    </div>
  );
}

// Featured Banner Component
function FeaturedBanner({ product, onAddToCart }: { product: Product; onAddToCart: () => void }) {
  if (!product) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-[32px] overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 dark:from-zinc-700 dark:to-zinc-800 dark:border dark:border-zinc-600 p-6 mb-6"
    >
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Хит продаж
          </span>
          <h2 className="text-xl font-bold text-white mt-1 leading-tight">
            {product.name}
          </h2>
          <button
            onClick={onAddToCart}
            className="mt-4 px-5 py-2 bg-white text-black rounded-full text-sm font-semibold hover:bg-zinc-200 transition-colors"
          >
            Купить
          </button>
        </div>
        {product.image_url && (
          <div className="w-32 h-32 flex items-center justify-center">
            <img
              src={product.image_url}
              alt={product.name}
              className="max-w-full max-h-full object-contain drop-shadow-2xl"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Catalog() {
  const { t } = useTranslation();
  const currency = useCartStore(state => state.currency);
  const { addItem } = useCartStore();
  
  // Use global catalog store instead of local state
  const {
    selectedBrand,
    selectedCategory,
    searchQuery,
    page,
    allProducts,
    setSelectedBrand,
    setSelectedCategory,
    setSearchQuery,
    setPage,
    setAllProducts,
    appendProducts,
    resetFilters
  } = useCatalogStore();
  
  // Fetch brands from database
  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });
  
  // Create query key for caching
  const queryKey = `${selectedBrand}-${selectedCategory}-${searchQuery}-${page}`;
  
  // Fetch products
  const { 
    data: productsData, 
    isLoading, 
    isFetching 
  } = useQuery({
    queryKey: ['products', selectedBrand, selectedCategory, searchQuery, page, currency],
    queryFn: () => productsApi.getAll({
      category_id: selectedCategory || undefined,
      search: searchQuery || undefined,
      brand: selectedBrand !== 'all' ? selectedBrand : undefined,
      page,
      limit: 20,
      currency
    }),
    staleTime: 2 * 60 * 1000,
  });
  
  const pagination = productsData?.pagination;
  
  // Update products when data arrives
  useEffect(() => {
    const products = productsData?.products;
    if (products && products.length > 0) {
      if (page === 1) {
        setAllProducts(products, queryKey);
      } else {
        appendProducts(products);
      }
    }
  }, [productsData, page, queryKey, setAllProducts, appendProducts]);
  
  // Get featured product (first one with image)
  const featuredProduct = allProducts.find(p => p.image_url);
  
  // Track page view
  useEffect(() => {
    analyticsApi.trackEvent({ event_type: 'page_view', metadata: { page: 'catalog' } });
  }, []);
  
  const handleLoadMore = useCallback(() => {
    if (pagination && page < pagination.totalPages && !isFetching) {
      setPage(page + 1);
    }
  }, [pagination, page, isFetching, setPage]);
  
  const handleBrandSelect = useCallback((brand: string) => {
    setSelectedBrand(brand);
  }, [setSelectedBrand]);
  
  const handleCategorySelect = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
  }, [setSelectedCategory]);
  
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, [setSearchQuery]);
  
  const remainingCount = pagination ? pagination.total - allProducts.length : 0;
  
  // Show loading only on initial load when no products cached
  const showLoading = isLoading && allProducts.length === 0;
  const showEmpty = !isLoading && allProducts.length === 0 && productsData?.products?.length === 0;
  
  return (
    <div className="min-h-screen pb-28 bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 pt-safe-top">
        <div className="px-5 py-4">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between mb-4"
          >
            <img 
              src="/logo.png" 
              alt="Apple Cheaper" 
              className="h-8 dark:invert"
            />
            <button className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </motion.div>
          
          {/* Brand Selector */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-4"
          >
            <BrandSelector
              brands={brands}
              selectedId={selectedBrand}
              onSelect={handleBrandSelect}
            />
          </motion.div>
          
          {/* Category Pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <CategoryNav
              categories={categories}
              selectedId={selectedCategory}
              onSelect={handleCategorySelect}
            />
          </motion.div>
        </div>
      </header>
      
      {/* Content */}
      <main className="px-5 pt-4">
        {/* Search */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4"
        >
          <SearchInput
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </motion.div>
        
        {/* Active filters indicator */}
        {(selectedBrand !== 'all' || selectedCategory) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-4 text-sm text-zinc-500"
          >
            <span>Фильтры:</span>
            {selectedBrand !== 'all' && (
              <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                {selectedBrand}
              </span>
            )}
            {selectedCategory && (
              <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                {categories.find(c => c.id === selectedCategory)?.name || 'Категория'}
              </span>
            )}
            <button 
              onClick={resetFilters}
              className="text-zinc-400 hover:text-zinc-600 ml-2"
            >
              ✕ Сбросить
            </button>
          </motion.div>
        )}
        
        {showLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : showEmpty ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <EmptyState
              icon={<SearchIcon />}
              title={t('catalog.empty')}
              description={searchQuery ? `По запросу "${searchQuery}" ничего не найдено` : 'Попробуйте изменить фильтры'}
            />
          </motion.div>
        ) : (
          <>
            {/* Featured Banner */}
            {featuredProduct && !searchQuery && selectedBrand === 'all' && !selectedCategory && page === 1 && (
              <FeaturedBanner 
                product={featuredProduct} 
                onAddToCart={() => addItem(featuredProduct)}
              />
            )}
            
            {/* Products Grid */}
            <div className="grid grid-cols-2 gap-4 gap-y-2">
              <AnimatePresence mode="popLayout">
                {allProducts.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </div>
            
            {/* Loading more indicator */}
            {isFetching && page > 1 && (
              <div className="flex justify-center mt-6">
                <Loading size="sm" />
              </div>
            )}
            
            {/* Load More Button */}
            {remainingCount > 0 && !isFetching && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95"
                >
                  <span>Ещё товары</span>
                  <span className="ml-2 text-zinc-500">({remainingCount})</span>
                </button>
              </div>
            )}
            
            {/* All loaded indicator */}
            {pagination && allProducts.length >= pagination.total && allProducts.length > 0 && (
              <div className="flex justify-center mt-8 text-sm text-zinc-400">
                Показаны все {pagination.total} товаров
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
