import { memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../store/cartStore';
import { useFavoritesStore } from '../store/favoritesStore';
import { cn } from '../lib/utils';

export const BottomNav = memo(function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const itemCount = useCartStore(state => state.getItemCount());
  const favoritesCount = useFavoritesStore(state => state.count());
  
  // Hide on checkout page
  if (location.pathname.includes('/checkout')) {
    return null;
  }
  
  const navItems = [
    {
      to: '/',
      label: t('nav.catalog'),
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      )
    },
    {
      to: '/search',
      label: 'Поиск',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      )
    },
    {
      to: '/favorites',
      label: t('nav.favorites'),
      badge: favoritesCount > 0 ? favoritesCount : null,
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    },
    {
      to: '/cart',
      label: t('nav.cart'),
      badge: itemCount > 0 ? itemCount : null,
      special: true,
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      )
    },
    {
      to: '/orders',
      label: 'Профиль',
      icon: (active: boolean) => (
        <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      )
    }
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe-bottom">
      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-7">
          <NavLink
            to="/cart"
            className="flex items-center justify-center w-14 h-14 rounded-full bg-black dark:bg-white text-white dark:text-black shadow-2xl shadow-black/30"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-black text-black dark:text-white text-xs font-bold flex items-center justify-center border-2 border-black dark:border-white">
              {itemCount > 9 ? '9+' : itemCount}
            </span>
          </NavLink>
        </div>
      )}
      
      {/* Nav Bar */}
      <div className="mx-4 mb-4 rounded-[28px] bg-white dark:bg-zinc-900 shadow-2xl shadow-black/10 border border-zinc-200/50 dark:border-zinc-800">
        <div className="flex items-center justify-around py-3 px-2">
          {navItems.filter(item => !item.special || itemCount === 0).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "flex flex-col items-center justify-center px-4 py-1 relative",
                "transition-all duration-200",
                isActive
                  ? "text-black dark:text-white"
                  : "text-zinc-400 dark:text-zinc-500"
              )}
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    {item.icon(isActive)}
                    {item.badge && !item.special && (
                      <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold flex items-center justify-center">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
});
