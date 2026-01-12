import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesState {
  favoriteIds: Set<string>;
  
  // Actions
  addFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
  toggleFavorite: (productId: string) => void;
  setFavorites: (ids: string[]) => void;
  
  // Computed
  isFavorite: (productId: string) => boolean;
  count: () => number;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteIds: new Set<string>(),
      
      addFavorite: (productId: string) => {
        const newSet = new Set(get().favoriteIds);
        newSet.add(productId);
        set({ favoriteIds: newSet });
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      },
      
      removeFavorite: (productId: string) => {
        const newSet = new Set(get().favoriteIds);
        newSet.delete(productId);
        set({ favoriteIds: newSet });
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      },
      
      toggleFavorite: (productId: string) => {
        const { favoriteIds } = get();
        if (favoriteIds.has(productId)) {
          get().removeFavorite(productId);
        } else {
          get().addFavorite(productId);
        }
      },
      
      setFavorites: (ids: string[]) => {
        set({ favoriteIds: new Set(ids) });
      },
      
      isFavorite: (productId: string) => {
        return get().favoriteIds.has(productId);
      },
      
      count: () => {
        return get().favoriteIds.size;
      }
    }),
    {
      name: 'apple-cheaper-favorites',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          return {
            ...parsed,
            state: {
              ...parsed.state,
              favoriteIds: new Set(parsed.state.favoriteIds || [])
            }
          };
        },
        setItem: (name, value) => {
          const str = JSON.stringify({
            ...value,
            state: {
              ...value.state,
              favoriteIds: Array.from(value.state.favoriteIds || [])
            }
          });
          localStorage.setItem(name, str);
        },
        removeItem: (name) => localStorage.removeItem(name)
      }
    }
  )
);
