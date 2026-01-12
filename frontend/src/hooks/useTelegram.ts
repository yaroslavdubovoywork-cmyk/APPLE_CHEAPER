import { useEffect, useState, useCallback } from 'react';
import { TelegramWebApp, TelegramUser } from '../types';

export function useTelegram() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    
    if (tg) {
      setWebApp(tg);
      setUser(tg.initDataUnsafe?.user || null);
      setColorScheme(tg.colorScheme || 'light');
      
      // Mark as ready
      tg.ready();
      tg.expand();
      setIsReady(true);
      
      // Apply theme
      document.body.classList.toggle('dark', tg.colorScheme === 'dark');
      
      // Apply theme colors as CSS variables
      if (tg.themeParams) {
        const root = document.documentElement;
        if (tg.themeParams.bg_color) {
          root.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color);
        }
        if (tg.themeParams.text_color) {
          root.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color);
        }
        if (tg.themeParams.hint_color) {
          root.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color);
        }
        if (tg.themeParams.link_color) {
          root.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color);
        }
        if (tg.themeParams.button_color) {
          root.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color);
        }
        if (tg.themeParams.button_text_color) {
          root.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color);
        }
        if (tg.themeParams.secondary_bg_color) {
          root.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color);
        }
      }
    } else {
      // Development mode without Telegram
      setIsReady(true);
    }
  }, []);
  
  const showMainButton = useCallback((text: string, onClick: () => void) => {
    if (webApp?.MainButton) {
      webApp.MainButton.setText(text);
      webApp.MainButton.onClick(onClick);
      webApp.MainButton.show();
    }
  }, [webApp]);
  
  const hideMainButton = useCallback(() => {
    webApp?.MainButton?.hide();
  }, [webApp]);
  
  const showBackButton = useCallback((onClick: () => void) => {
    if (webApp?.BackButton) {
      webApp.BackButton.onClick(onClick);
      webApp.BackButton.show();
    }
  }, [webApp]);
  
  const hideBackButton = useCallback(() => {
    webApp?.BackButton?.hide();
  }, [webApp]);
  
  const haptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection') => {
    if (!webApp?.HapticFeedback) return;
    
    switch (type) {
      case 'light':
      case 'medium':
      case 'heavy':
        webApp.HapticFeedback.impactOccurred(type);
        break;
      case 'success':
      case 'error':
      case 'warning':
        webApp.HapticFeedback.notificationOccurred(type);
        break;
      case 'selection':
        webApp.HapticFeedback.selectionChanged();
        break;
    }
  }, [webApp]);
  
  const showAlert = useCallback((message: string) => {
    if (webApp?.showAlert) {
      webApp.showAlert(message);
    } else {
      alert(message);
    }
  }, [webApp]);
  
  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (webApp?.showConfirm) {
        webApp.showConfirm(message, resolve);
      } else {
        resolve(confirm(message));
      }
    });
  }, [webApp]);
  
  const close = useCallback(() => {
    webApp?.close();
  }, [webApp]);
  
  return {
    webApp,
    user,
    isReady,
    colorScheme,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    haptic,
    showAlert,
    showConfirm,
    close
  };
}
