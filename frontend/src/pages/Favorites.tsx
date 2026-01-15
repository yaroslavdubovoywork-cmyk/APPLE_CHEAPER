import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { favoritesApi } from '../lib/api';
import { useFavoritesStore } from '../store/favoritesStore';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Loading';
import { EmptyState, HeartIcon } from '../components/EmptyState';

export default function Favorites() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setFavorites, loadFavorites, isLoaded } = useFavoritesStore();
  
  // Load favorites on mount
  useEffect(() => {
    if (!isLoaded) {
      loadFavorites();
    }
  }, [isLoaded, loadFavorites]);
  
  // Fetch favorites with products from server
  const { data: favorites = [], isLoading, refetch } = useQuery({
    queryKey: ['favorites'],
    queryFn: favoritesApi.getAll,
    staleTime: 0, // Always refetch
  });
  
  // Sync favorites to local store when data changes
  useEffect(() => {
    if (favorites.length > 0) {
      setFavorites(favorites.map(f => f.product_id));
    }
  }, [favorites, setFavorites]);
  
  // Refetch when page becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refetch]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen pt-safe-top pb-24">
        <header className="px-4 py-4">
          <h1 className="text-2xl font-bold text-[var(--tg-theme-text-color)]">
            {t('favorites.title')}
          </h1>
        </header>
        
        <div className="px-4 grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }
  
  if (favorites.length === 0) {
    return (
      <div className="min-h-screen pt-safe-top pb-24">
        <header className="px-4 py-4">
          <h1 className="text-2xl font-bold text-[var(--tg-theme-text-color)]">
            {t('favorites.title')}
          </h1>
        </header>
        
        <EmptyState
          icon={<HeartIcon />}
          title={t('favorites.empty')}
          description={t('favorites.emptyText')}
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
    <div className="min-h-screen pt-safe-top pb-24">
      <header className="px-4 py-4">
        <h1 className="text-2xl font-bold text-[var(--tg-theme-text-color)]">
          {t('favorites.title')}
        </h1>
        <p className="text-sm text-[var(--tg-theme-hint-color)]">
          {favorites.length} {t('cart.items')}
        </p>
      </header>
      
      <div className="px-4 grid grid-cols-2 gap-4">
        {favorites.map((favorite, index) => (
          <ProductCard
            key={favorite.id}
            product={{
              ...favorite.product,
              price: favorite.product.price
            }}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
