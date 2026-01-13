import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { productsApi, categoriesApi } from '../lib/api';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Loading';
import { EmptyState, SearchIcon } from '../components/EmptyState';
import { cn } from '../lib/utils';
import { useCartStore } from '../store/cartStore';
import { Category } from '../types';

// Popular search terms
const POPULAR_SEARCHES = [
  'iPhone', 'MacBook', 'AirPods', 'iPad', 'Apple Watch',
  'Samsung', 'Xiaomi', 'Наушники', 'Часы', 'Чехол'
];

// Recent searches storage
const RECENT_SEARCHES_KEY = 'apple-cheaper-recent-searches';
const MAX_RECENT_SEARCHES = 8;

function getRecentSearches(): string[] {
  try {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  try {
    const recent = getRecentSearches();
    const updated = [query, ...recent.filter(s => s !== query)].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Ignore storage errors
  }
}

export default function Search() {
  const { i18n } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const { currency } = useCartStore();
  
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
    // Auto-focus search input
    inputRef.current?.focus();
  }, []);
  
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  
  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll()
  });
  
  // Fetch search results
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', debouncedQuery, selectedCategory, currency],
    queryFn: () => productsApi.getAll({
      search: debouncedQuery,
      category_id: selectedCategory || undefined,
      limit: 50,
      currency
    }),
    enabled: debouncedQuery.length >= 2
  });
  
  const results = data?.products || [];
  const hasResults = results.length > 0;
  const showInitialState = !debouncedQuery || debouncedQuery.length < 2;
  
  // Handle search submission
  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
      setRecentSearches(getRecentSearches());
    }
  }, []);
  
  // Handle clear input
  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
    inputRef.current?.focus();
  };
  
  // Handle clear recent
  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };
  
  return (
    <div className="min-h-screen pb-28 bg-white dark:bg-zinc-950">
      {/* Search Header */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl pt-safe-top">
        <div className="px-5 py-4">
          {/* Search Input */}
          <div className="relative">
            <motion.div
              animate={{ scale: isFocused ? 1.02 : 1 }}
              className={cn(
                "relative flex items-center gap-3 px-5 py-4 rounded-2xl",
                "bg-zinc-100 dark:bg-zinc-800 border-2 transition-colors duration-200",
                isFocused 
                  ? "border-zinc-400 dark:border-zinc-500" 
                  : "border-transparent"
              )}
            >
              {/* Search Icon */}
              <svg 
                className={cn(
                  "w-5 h-5 shrink-0 transition-colors duration-200",
                  isFocused ? "text-zinc-600 dark:text-zinc-300" : "text-zinc-400 dark:text-zinc-500"
                )}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              
              {/* Input */}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(query);
                    inputRef.current?.blur();
                  }
                }}
                placeholder={i18n.language === 'ru' ? "Поиск товаров..." : "Search products..."}
                className="flex-1 bg-transparent text-zinc-900 dark:text-white text-base outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
              
              {/* Loading Indicator */}
              {isFetching && query && (
                <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
              )}
              
              {/* Clear Button */}
              {query && !isFetching && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  onClick={handleClear}
                  className="p-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 hover:bg-zinc-400 dark:hover:bg-zinc-500 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              )}
            </motion.div>
          </div>
          
          {/* Category Filter Pills */}
          {debouncedQuery && debouncedQuery.length >= 2 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 overflow-x-auto no-scrollbar -mx-5 px-5"
            >
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
                    !selectedCategory
                      ? "bg-black dark:bg-white text-white dark:text-black"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  {i18n.language === 'ru' ? 'Все' : 'All'}
                </button>
                {categories.map((cat: Category) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
                      selectedCategory === cat.id
                        ? "bg-black dark:bg-white text-white dark:text-black"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    {i18n.language === 'ru' ? cat.name : (cat.name_en || cat.name)}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <main className="px-5">
        <AnimatePresence mode="wait">
          {/* Initial State - Popular & Recent Searches */}
          {showInitialState && (
            <motion.div
              key="initial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-4"
            >
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      {i18n.language === 'ru' ? 'Недавние' : 'Recent'}
                    </h2>
                    <button
                      onClick={handleClearRecent}
                      className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                      {i18n.language === 'ru' ? 'Очистить' : 'Clear'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((search, index) => (
                      <motion.button
                        key={search}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleSearch(search)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {search}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Popular Searches */}
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                  {i18n.language === 'ru' ? 'Популярное' : 'Popular'}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map((search, index) => (
                    <motion.button
                      key={search}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleSearch(search)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      {search}
                    </motion.button>
                  ))}
                </div>
              </div>
              
              {/* Search Tips */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-12 p-6 rounded-3xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 dark:border dark:border-zinc-700"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-700 flex items-center justify-center shadow-sm">
                    <svg className="w-6 h-6 text-zinc-600 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">
                      {i18n.language === 'ru' ? 'Советы по поиску' : 'Search Tips'}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {i18n.language === 'ru' 
                        ? 'Введите название товара, бренд или артикул. Например: "iPhone 16" или "AirPods Pro"'
                        : 'Enter product name, brand or article. For example: "iPhone 16" or "AirPods Pro"'
                      }
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
          
          {/* Loading State */}
          {!showInitialState && isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pt-8 grid grid-cols-2 gap-4 gap-y-2"
            >
              {[...Array(6)].map((_, i) => (
                <div key={i} className="pt-20">
                  <ProductCardSkeleton />
                </div>
              ))}
            </motion.div>
          )}
          
          {/* Results */}
          {!showInitialState && !isLoading && hasResults && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Results Header */}
              <div className="py-4 flex items-center justify-between">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {i18n.language === 'ru' 
                    ? `Найдено ${results.length} ${results.length === 1 ? 'товар' : results.length < 5 ? 'товара' : 'товаров'}`
                    : `Found ${results.length} ${results.length === 1 ? 'product' : 'products'}`
                  }
                </p>
              </div>
              
              {/* Products Grid */}
              <div className="grid grid-cols-2 gap-4 gap-y-2 pt-8">
                {results.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            </motion.div>
          )}
          
          {/* No Results */}
          {!showInitialState && !isLoading && !hasResults && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pt-12"
            >
              <EmptyState
                icon={<SearchIcon />}
                title={i18n.language === 'ru' ? 'Ничего не найдено' : 'No results found'}
                description={
                  i18n.language === 'ru'
                    ? `По запросу "${debouncedQuery}" товары не найдены. Попробуйте изменить запрос.`
                    : `No products found for "${debouncedQuery}". Try a different search.`
                }
                action={
                  <button
                    onClick={handleClear}
                    className="px-6 py-3 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium"
                  >
                    {i18n.language === 'ru' ? 'Очистить поиск' : 'Clear search'}
                  </button>
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
