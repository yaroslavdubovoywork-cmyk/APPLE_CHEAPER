import { create } from 'zustand';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

interface FavoritesState {
  favoriteIds: Set<string>;
  isLoaded: boolean;
  isLoading: boolean;
  
  // Actions
  loadFavorites: () => Promise<void>;
  addFavorite: (productId: string) => Promise<void>;
  removeFavorite: (productId: string) => Promise<void>;
  toggleFavorite: (productId: string) => Promise<void>;
  setFavorites: (ids: string[]) => void;
  
  // Computed
  isFavorite: (productId: string) => boolean;
  count: () => number;
}

const getTelegramId = () => {
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || null;
};

export const useFavoritesStore = create<FavoritesState>()((set, get) => ({
  favoriteIds: new Set<string>(),
  isLoaded: false,
  isLoading: false,
  
  loadFavorites: async () => {
    const telegramId = getTelegramId();
    if (!telegramId || !isSupabaseEnabled || get().isLoaded) return;
    
    set({ isLoading: true });
    
    try {
      const { data, error } = await supabase!
        .from('favorites')
        .select('product_id')
        .eq('telegram_id', telegramId);
      
      if (!error && data) {
        set({ 
          favoriteIds: new Set(data.map(f => f.product_id)),
          isLoaded: true 
        });
      }
    } catch (e) {
      console.error('Failed to load favorites:', e);
    } finally {
      set({ isLoading: false });
    }
  },
  
  addFavorite: async (productId: string) => {
    const telegramId = getTelegramId();
    
    // Optimistically update UI
    const newSet = new Set(get().favoriteIds);
    newSet.add(productId);
    set({ favoriteIds: newSet });
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    
    // Sync to Supabase
    if (telegramId && isSupabaseEnabled) {
      try {
        await supabase!
          .from('favorites')
          .upsert({ 
            telegram_id: telegramId, 
            product_id: productId 
          }, { 
            onConflict: 'telegram_id,product_id' 
          });
      } catch (e) {
        console.error('Failed to add favorite:', e);
        // Revert on error
        const revertSet = new Set(get().favoriteIds);
        revertSet.delete(productId);
        set({ favoriteIds: revertSet });
      }
    }
  },
  
  removeFavorite: async (productId: string) => {
    const telegramId = getTelegramId();
    
    // Optimistically update UI
    const newSet = new Set(get().favoriteIds);
    newSet.delete(productId);
    set({ favoriteIds: newSet });
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    
    // Sync to Supabase
    if (telegramId && isSupabaseEnabled) {
      try {
        await supabase!
          .from('favorites')
          .delete()
          .eq('telegram_id', telegramId)
          .eq('product_id', productId);
      } catch (e) {
        console.error('Failed to remove favorite:', e);
        // Revert on error
        const revertSet = new Set(get().favoriteIds);
        revertSet.add(productId);
        set({ favoriteIds: revertSet });
      }
    }
  },
  
  toggleFavorite: async (productId: string) => {
    const { favoriteIds, addFavorite, removeFavorite } = get();
    if (favoriteIds.has(productId)) {
      await removeFavorite(productId);
    } else {
      await addFavorite(productId);
    }
  },
  
  setFavorites: (ids: string[]) => {
    set({ favoriteIds: new Set(ids), isLoaded: true });
  },
  
  isFavorite: (productId: string) => {
    return get().favoriteIds.has(productId);
  },
  
  count: () => {
    return get().favoriteIds.size;
  }
}));
