import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem, Currency } from '../types';

interface CartState {
  items: CartItem[];
  currency: Currency;
  
  // Actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setCurrency: (currency: Currency) => void;
  
  // Computed
  getTotal: () => number;
  getItemCount: () => number;
  isInCart: (productId: string) => boolean;
  getItemQuantity: (productId: string) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      currency: 'RUB',
      
      addItem: (product: Product, quantity: number = 1) => {
        const { items } = get();
        const existingItem = items.find(item => item.product.id === product.id);
        
        if (existingItem) {
          set({
            items: items.map(item =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            )
          });
        } else {
          set({ items: [...items, { product, quantity }] });
        }
        
        // Haptic feedback
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      },
      
      removeItem: (productId: string) => {
        set({ items: get().items.filter(item => item.product.id !== productId) });
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      },
      
      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        
        set({
          items: get().items.map(item =>
            item.product.id === productId
              ? { ...item, quantity }
              : item
          )
        });
      },
      
      clearCart: () => {
        set({ items: [] });
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      },
      
      setCurrency: (currency: Currency) => {
        set({ currency });
      },
      
      getTotal: () => {
        return get().items.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        );
      },
      
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
      
      isInCart: (productId: string) => {
        return get().items.some(item => item.product.id === productId);
      },
      
      getItemQuantity: (productId: string) => {
        const item = get().items.find(item => item.product.id === productId);
        return item?.quantity || 0;
      }
    }),
    {
      name: 'apple-cheaper-cart',
      partialize: (state) => ({ items: state.items, currency: state.currency })
    }
  )
);
