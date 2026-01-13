import { create } from 'zustand';
import { Product } from '../types';

interface CatalogState {
  // Filters
  selectedBrand: string;
  selectedCategory: string | null;
  searchQuery: string;
  page: number;
  
  // Products cache
  allProducts: Product[];
  lastQueryKey: string;
  
  // Actions
  setSelectedBrand: (brand: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  setPage: (page: number) => void;
  setAllProducts: (products: Product[], queryKey: string) => void;
  appendProducts: (products: Product[]) => void;
  resetFilters: () => void;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  // Initial state
  selectedBrand: 'all',
  selectedCategory: null,
  searchQuery: '',
  page: 1,
  allProducts: [],
  lastQueryKey: '',
  
  // Actions
  setSelectedBrand: (brand) => {
    set({ selectedBrand: brand, page: 1, allProducts: [] });
  },
  
  setSelectedCategory: (category) => {
    set({ selectedCategory: category, page: 1, allProducts: [] });
  },
  
  setSearchQuery: (query) => {
    set({ searchQuery: query, page: 1, allProducts: [] });
  },
  
  setPage: (page) => {
    set({ page });
  },
  
  setAllProducts: (products, queryKey) => {
    const { lastQueryKey } = get();
    // Only update if query key changed or products are new
    if (queryKey !== lastQueryKey || products.length > 0) {
      set({ allProducts: products, lastQueryKey: queryKey });
    }
  },
  
  appendProducts: (products) => {
    set((state) => {
      const existingIds = new Set(state.allProducts.map(p => p.id));
      const newProducts = products.filter(p => !existingIds.has(p.id));
      return { allProducts: [...state.allProducts, ...newProducts] };
    });
  },
  
  resetFilters: () => {
    set({
      selectedBrand: 'all',
      selectedCategory: null,
      searchQuery: '',
      page: 1,
      allProducts: []
    });
  }
}));
