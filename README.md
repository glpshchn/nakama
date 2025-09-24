# NakamaSpace 🦊

**Telegram Mini App - Социальная сеть для фурри и аниме сообщества**

NakamaSpace - это полноценная социальная сеть, встроенная в Telegram как Mini App. Приложение предоставляет возможности для создания постов, поиска изображений, подписок и уведомлений в стиле Telegram.

## ✨ Возможности

### 📝 Лента постов
- Создание постов с темами: **Фурри** (оранжевый), **Аниме** (синий), **Другое** (серый)
- Поддержка SFW/NSFW контента
- Загрузка до 5 изображений на пост
- Система тегов и упоминаний пользователей (@username)
- Лайки и комментарии
- Система модерации и администрирования

### 🔍 Поиск изображений
- **E621 API** для фурри контента
- **Danbooru/Gelbooru API** для аниме контента
- Автоподсказки тегов
- Галерея результатов с навигацией
- Отправка изображений в чат бота

### 🔔 Уведомления
- Уведомления о подписках, лайках, упоминаниях
- Система прочитанных/непрочитанных
- Управление уведомлениями

### 👤 Профиль и настройки
- Авторизация через Telegram
- Настройки приватности (вайтлист, скрытие NSFW)
- Статистика пользователя
- Управление подписками

## 🛠 Технологии

### Backend
- **Node.js** + **Express.js**
- **MySQL** база данных
- **JWT** авторизация
- **Socket.io** для уведомлений в реальном времени
- **Multer** для загрузки файлов
- **Axios** для внешних API

### Frontend
- **React 18** с хуками
- **React Router** для навигации
- **Axios** для API запросов
- **React Hot Toast** для уведомлений
- **Lucide React** для иконок
- **CSS Variables** для темной/светлой темы

### База данных
- **MySQL** с phpMyAdmin
- Таблицы: users, posts, follows, likes, comments, notifications, search_cache

## 🚀 Установка и запуск

### Предварительные требования
- Node.js 16+
- MySQL 8.0+
- phpMyAdmin (опционально)

### 1. Клонирование репозитория
```bash
git clone <repository-url>
cd nakama
```

### 2. Установка зависимостей
```bash
# Установка всех зависимостей
npm run install-all

# Или по отдельности:
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 3. Настройка базы данных
```bash
# Создайте базу данных MySQL
mysql -u root -p

# Выполните SQL скрипт
source database/schema.sql
```

### 4. Настройка переменных окружения
```bash
# Скопируйте пример конфигурации
cp backend/config.example.env backend/.env

# Отредактируйте .env файл
nano backend/.env
```

Пример `.env` файла:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=nakama_space

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_here

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/webhook

# API Keys
E621_USER_AGENT=NakamaSpace/1.0
DANBOORU_API_KEY=your_danbooru_api_key
GELBOORU_API_KEY=your_gelbooru_api_key

# Server Configuration
PORT=5000
NODE_ENV=development

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
```

### 5. Запуск приложения
```bash
# Запуск в режиме разработки (backend + frontend)
npm run dev

# Или по отдельности:
npm run server  # Backend на порту 5000
npm run client  # Frontend на порту 3000
```

### 6. Сборка для продакшена
```bash
npm run build
```

## 📱 Настройка Telegram Bot

### 1. Создание бота
1. Найдите [@BotFather](https://t.me/botfather) в Telegram
2. Создайте нового бота командой `/newbot`
3. Получите токен бота

### 2. Настройка Mini App
1. Отправьте команду `/newapp` боту @BotFather
2. Выберите вашего бота
3. Укажите URL вашего приложения
4. Загрузите иконку и описание

### 3. Настройка домена
Для работы в продакшене настройте HTTPS домен и укажите его в настройках бота.

## 🎨 Дизайн

Приложение использует дизайн-систему Telegram:
- **Цветовая схема**: автоматическая адаптация к теме устройства
- **Типографика**: системные шрифты iOS/Android
- **Компоненты**: карточки, кнопки, формы в стиле Telegram
- **Анимации**: плавные переходы и hover-эффекты

## 🔧 API Endpoints

### Авторизация
- `POST /api/auth/telegram` - Авторизация через Telegram
- `GET /api/auth/me` - Получение профиля пользователя
- `PUT /api/auth/settings` - Обновление настроек

### Посты
- `POST /api/posts` - Создание поста
- `GET /api/posts/feed` - Получение ленты
- `GET /api/posts/:id` - Получение поста
- `POST /api/posts/:id/like` - Лайк поста
- `DELETE /api/posts/:id` - Удаление поста

### Поиск
- `GET /api/search` - Поиск изображений
- `GET /api/search/suggestions` - Автоподсказки тегов

### Пользователи
- `GET /api/users/:id` - Профиль пользователя
- `POST /api/users/:id/follow` - Подписка на пользователя

### Уведомления
- `GET /api/notifications` - Получение уведомлений
- `PUT /api/notifications/:id/read` - Отметка как прочитанное

## 🗄 Структура базы данных

### Основные таблицы:
- **users** - пользователи
- **posts** - посты
- **follows** - подписки
- **likes** - лайки
- **comments** - комментарии
- **notifications** - уведомления
- **search_cache** - кэш поиска

## 🚀 Развертывание

### Docker (рекомендуется)
```bash
# Создайте docker-compose.yml
# Настройте переменные окружения
docker-compose up -d
```

### VPS/Cloud
1. Настройте сервер с Node.js и MySQL
2. Клонируйте репозиторий
3. Установите зависимости
4. Настройте базу данных
5. Настройте переменные окружения
6. Запустите приложение с PM2

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Внесите изменения
4. Создайте Pull Request

## 📄 Лицензия

MIT License - см. файл [LICENSE](LICENSE)

## 🆘 Поддержка

Если у вас возникли вопросы или проблемы:
1. Проверьте [Issues](https://github.com/your-repo/issues)
2. Создайте новый Issue с описанием проблемы
3. Приложите логи и скриншоты

## 🎯 Планы развития

- [ ] Система комментариев
- [ ] Чаты между пользователями
- [ ] Группы и сообщества
- [ ] Система рейтингов
- [ ] Мобильное приложение
- [ ] API для сторонних разработчиков

---

**Создано с ❤️ для Telegram сообщества**