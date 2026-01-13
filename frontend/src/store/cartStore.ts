import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem, Currency, CartItemVariant } from '../types';

// Helper to generate unique cart item key
const getCartItemKey = (productId: string, variantId?: string) => 
  variantId ? `${productId}_${variantId}` : productId;

interface CartState {
  items: CartItem[];
  currency: Currency;
  
  // Actions
  addItem: (product: Product, quantity?: number, variant?: CartItemVariant) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  setCurrency: (currency: Currency) => void;
  
  // Computed
  getTotal: () => number;
  getItemCount: () => number;
  isInCart: (productId: string, variantId?: string) => boolean;
  getItemQuantity: (productId: string, variantId?: string) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      currency: 'RUB',
      
      addItem: (product: Product, quantity: number = 1, variant?: CartItemVariant) => {
        const { items } = get();
        const itemKey = getCartItemKey(product.id, variant?.id);
        const existingItem = items.find(item => 
          getCartItemKey(item.product.id, item.variant?.id) === itemKey
        );
        
        if (existingItem) {
          set({
            items: items.map(item =>
              getCartItemKey(item.product.id, item.variant?.id) === itemKey
                ? { ...item, quantity: item.quantity + quantity }
                : item
            )
          });
        } else {
          set({ items: [...items, { product, quantity, variant }] });
        }
        
        // Haptic feedback
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      },
      
      removeItem: (productId: string, variantId?: string) => {
        const itemKey = getCartItemKey(productId, variantId);
        set({ 
          items: get().items.filter(item => 
            getCartItemKey(item.product.id, item.variant?.id) !== itemKey
          ) 
        });
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
      },
      
      updateQuantity: (productId: string, quantity: number, variantId?: string) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }
        
        const itemKey = getCartItemKey(productId, variantId);
        set({
          items: get().items.map(item =>
            getCartItemKey(item.product.id, item.variant?.id) === itemKey
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
      
      isInCart: (productId: string, variantId?: string) => {
        const itemKey = getCartItemKey(productId, variantId);
        return get().items.some(item => 
          getCartItemKey(item.product.id, item.variant?.id) === itemKey
        );
      },
      
      getItemQuantity: (productId: string, variantId?: string) => {
        const itemKey = getCartItemKey(productId, variantId);
        const item = get().items.find(item => 
          getCartItemKey(item.product.id, item.variant?.id) === itemKey
        );
        return item?.quantity || 0;
      }
    }),
    {
      name: 'apple-cheaper-cart',
      partialize: (state) => ({ items: state.items, currency: state.currency })
    }
  )
);
