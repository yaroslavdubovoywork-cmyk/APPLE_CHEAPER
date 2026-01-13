import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useTelegram } from './hooks/useTelegram';
import { BottomNav } from './components/BottomNav';
import { Loading } from './components/Loading';

// Lazy load pages
const Catalog = lazy(() => import('./pages/Catalog'));
const Search = lazy(() => import('./pages/Search'));
const Product = lazy(() => import('./pages/Product'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Orders = lazy(() => import('./pages/Orders'));

function App() {
  const { isReady, colorScheme } = useTelegram();
  const location = useLocation();
  
  // Pages where BottomNav should be hidden
  const hideBottomNav = location.pathname === '/checkout';
  
  // Apply color scheme
  useEffect(() => {
    document.body.classList.toggle('dark', colorScheme === 'dark');
  }, [colorScheme]);
  
  if (!isReady) {
    return <Loading fullScreen />;
  }
  
  return (
    <div className="min-h-screen bg-[var(--tg-theme-bg-color)]">
      <Suspense fallback={<Loading fullScreen />}>
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/search" element={<Search />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/orders" element={<Orders />} />
        </Routes>
      </Suspense>
      
      {!hideBottomNav && <BottomNav />}
      
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--tg-theme-secondary-bg-color)',
            color: 'var(--tg-theme-text-color)',
            borderRadius: '12px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#34c759',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: '#ff3b30',
              secondary: 'white',
            },
          },
        }}
      />
    </div>
  );
}

export default App;
