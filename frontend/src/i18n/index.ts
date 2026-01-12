import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ru: {
    translation: {
      // Navigation
      'nav.catalog': 'Каталог',
      'nav.cart': 'Корзина',
      'nav.favorites': 'Избранное',
      'nav.orders': 'Заказы',
      
      // Catalog
      'catalog.title': 'Каталог',
      'catalog.all': 'Все товары',
      'catalog.search': 'Поиск товаров...',
      
      // Search
      'search.placeholder': 'Поиск товаров...',
      'catalog.empty': 'Товары не найдены',
      'catalog.filters': 'Фильтры',
      'catalog.sort': 'Сортировка',
      'catalog.inStock': 'В наличии',
      
      // Product
      'product.addToCart': 'В корзину',
      'product.inCart': 'В корзине',
      'product.outOfStock': 'Нет в наличии',
      'product.article': 'Артикул',
      'product.description': 'Описание',
      'product.priceHistory': 'История цен',
      'product.price': 'Цена',
      
      // Cart
      'cart.title': 'Корзина',
      'cart.empty': 'Корзина пуста',
      'cart.emptyText': 'Добавьте товары из каталога',
      'cart.total': 'Итого',
      'cart.checkout': 'Оформить заказ',
      'cart.clear': 'Очистить',
      'cart.items': 'товаров',
      
      // Checkout
      'checkout.title': 'Оформление заказа',
      'checkout.name': 'Ваше имя',
      'checkout.phone': 'Телефон',
      'checkout.address': 'Адрес доставки',
      'checkout.notes': 'Комментарий к заказу',
      'checkout.submit': 'Подтвердить заказ',
      'checkout.success': 'Заказ успешно оформлен!',
      'checkout.successText': 'Мы свяжемся с вами для подтверждения',
      
      // Favorites
      'favorites.title': 'Избранное',
      'favorites.empty': 'Список избранного пуст',
      'favorites.emptyText': 'Добавляйте понравившиеся товары',
      
      // Orders
      'orders.title': 'Мои заказы',
      'orders.empty': 'У вас пока нет заказов',
      'orders.status.pending': 'Ожидает подтверждения',
      'orders.status.confirmed': 'Подтверждён',
      'orders.status.processing': 'В обработке',
      'orders.status.shipped': 'Отправлен',
      'orders.status.delivered': 'Доставлен',
      'orders.status.cancelled': 'Отменён',
      
      // Common
      'common.loading': 'Загрузка...',
      'common.error': 'Произошла ошибка',
      'common.retry': 'Повторить',
      'common.back': 'Назад',
      'common.save': 'Сохранить',
      'common.cancel': 'Отмена',
      'common.delete': 'Удалить',
      'common.edit': 'Редактировать',
      'common.add': 'Добавить',
      'common.remove': 'Удалить',
      'common.currency': 'Валюта',
      'common.language': 'Язык',
      
      // Currency
      'currency.RUB': 'Рубль',
      'currency.USD': 'Доллар',
      'currency.EUR': 'Евро'
    }
  },
  en: {
    translation: {
      // Navigation
      'nav.catalog': 'Catalog',
      'nav.cart': 'Cart',
      'nav.favorites': 'Favorites',
      'nav.orders': 'Orders',
      
      // Catalog
      'catalog.title': 'Catalog',
      'catalog.all': 'All products',
      'catalog.search': 'Search products...',
      
      // Search
      'search.placeholder': 'Search products...',
      'catalog.empty': 'No products found',
      'catalog.filters': 'Filters',
      'catalog.sort': 'Sort',
      'catalog.inStock': 'In stock',
      
      // Product
      'product.addToCart': 'Add to cart',
      'product.inCart': 'In cart',
      'product.outOfStock': 'Out of stock',
      'product.article': 'Article',
      'product.description': 'Description',
      'product.priceHistory': 'Price history',
      
      // Cart
      'cart.title': 'Cart',
      'cart.empty': 'Cart is empty',
      'cart.emptyText': 'Add products from catalog',
      'cart.total': 'Total',
      'cart.checkout': 'Checkout',
      'cart.clear': 'Clear',
      'cart.items': 'items',
      
      // Checkout
      'checkout.title': 'Checkout',
      'checkout.name': 'Your name',
      'checkout.phone': 'Phone',
      'checkout.address': 'Delivery address',
      'checkout.notes': 'Order notes',
      'checkout.submit': 'Confirm order',
      'checkout.success': 'Order placed successfully!',
      'checkout.successText': 'We will contact you for confirmation',
      
      // Favorites
      'favorites.title': 'Favorites',
      'favorites.empty': 'No favorites yet',
      'favorites.emptyText': 'Add products you like',
      
      // Orders
      'orders.title': 'My orders',
      'orders.empty': 'No orders yet',
      'orders.status.pending': 'Pending',
      'orders.status.confirmed': 'Confirmed',
      'orders.status.processing': 'Processing',
      'orders.status.shipped': 'Shipped',
      'orders.status.delivered': 'Delivered',
      'orders.status.cancelled': 'Cancelled',
      
      // Common
      'common.loading': 'Loading...',
      'common.error': 'An error occurred',
      'common.retry': 'Retry',
      'common.back': 'Back',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.add': 'Add',
      'common.remove': 'Remove',
      'common.currency': 'Currency',
      'common.language': 'Language',
      
      // Currency
      'currency.RUB': 'Ruble',
      'currency.USD': 'Dollar',
      'currency.EUR': 'Euro'
    }
  }
};

// Get initial language from Telegram WebApp or browser
const getInitialLanguage = (): string => {
  const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  if (tgLang && ['ru', 'en'].includes(tgLang)) {
    return tgLang;
  }
  const browserLang = navigator.language.split('-')[0];
  return ['ru', 'en'].includes(browserLang) ? browserLang : 'ru';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
