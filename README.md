# Apple Cheaper - Telegram Mini App

Магазин электроники в формате Telegram Mini App с админ-панелью.

## 🚀 Деплой на Render

### Шаг 1: Подготовка репозитория

1. Создайте репозиторий на GitHub
2. Загрузите код:

```bash
cd apple-cheaper
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/apple-cheaper.git
git push -u origin main
```

### Шаг 2: Деплой на Render

1. Зайдите на [render.com](https://render.com) и авторизуйтесь
2. Нажмите **New** → **Blueprint**
3. Подключите ваш GitHub репозиторий
4. Render автоматически найдёт `render.yaml` и создаст сервисы

### Шаг 3: Настройка переменных окружения

После создания сервисов, настройте Environment Variables для каждого:

#### Mini App (apple-cheaper-app):
| Переменная | Значение |
|------------|----------|
| `VITE_SUPABASE_URL` | `https://ntiqlxtbjllhbrqqkuis.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50aXFseHRiamxsaGJycXFrdWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjU3MjksImV4cCI6MjA4MzcwMTcyOX0.0EplIrFzzOZpv5qIvwnPKO3ZllG3ryRUhp5IUqPNliU` |

#### Admin Panel (apple-cheaper-admin):
| Переменная | Значение |
|------------|----------|
| `VITE_SUPABASE_URL` | `https://ntiqlxtbjllhbrqqkuis.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | (тот же ключ) |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | (получите в Supabase Dashboard → Settings → API) |

### Шаг 4: Запустите деплой

Нажмите **Manual Deploy** → **Deploy latest commit** для каждого сервиса.

---

## 🔗 URL после деплоя

После успешного деплоя вы получите:
- **Mini App:** `https://apple-cheaper-app.onrender.com`
- **Admin Panel:** `https://apple-cheaper-admin.onrender.com`

---

## 📱 Настройка Telegram Bot

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен бота
3. Настройте Mini App:
   ```
   /newapp
   → Выберите бота
   → Название: Apple Cheaper
   → URL: https://apple-cheaper-app.onrender.com
   ```

---

## 🛠 Локальная разработка

### Требования
- Node.js 18+
- npm или yarn

### Запуск

```bash
# Frontend (Mini App)
cd frontend
npm install
npm run dev
# → http://localhost:5173

# Admin Panel
cd admin
npm install
npm run dev
# → http://localhost:5174
```

### Environment Variables (локально)

Создайте `.env` в папках `frontend/` и `admin/`:

```env
VITE_SUPABASE_URL=https://ntiqlxtbjllhbrqqkuis.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📊 Структура проекта

```
apple-cheaper/
├── frontend/          # Telegram Mini App (React + Vite)
├── admin/             # Админ-панель (React + Vite + Shadcn)
├── supabase/          # Миграции базы данных
├── render.yaml        # Конфиг для Render.com
└── README.md
```

---

## 🗄 База данных (Supabase)

Таблицы:
- `products` - Товары
- `categories` - Категории
- `orders` - Заказы
- `order_items` - Позиции заказов
- `favorites` - Избранное
- `price_history` - История цен
- `admin_users` - Администраторы
- `settings` - Настройки

Storage:
- `products` - Изображения товаров

---

## 📝 Лицензия

MIT
