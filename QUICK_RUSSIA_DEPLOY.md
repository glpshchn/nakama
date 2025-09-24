# 🇷🇺 Быстрое развертывание NakamaSpace для России

## 🚀 Быстрый старт

### 1. Подготовка сервера
```bash
# Создаем пользователя
sudo adduser nakama
sudo usermod -aG sudo nakama
sudo su - nakama

# Устанавливаем зависимости
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs mysql-server nginx phpmyadmin apache2 php php-mysql
sudo npm install -g pm2

# Настраиваем MySQL
sudo mysql_secure_installation
```

### 2. Настройка базы данных
```bash
# Создаем БД и пользователя
sudo mysql -u root -p
```

```sql
CREATE DATABASE nakama_space CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nakama_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON nakama_space.* TO 'nakama_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Развертывание приложения
```bash
# Клонируем и настраиваем
mkdir -p /home/nakama/apps
cd /home/nakama/apps
git clone <your-repo> nakama-space
cd nakama-space

# Устанавливаем зависимости (автоматически создаст дефолтные изображения)
npm run install-all

# Настраиваем .env
cp backend/config.example.env backend/.env
nano backend/.env
```

**Обновите .env:**
```env
DB_HOST=localhost
DB_USER=nakama_user
DB_PASSWORD=your_strong_password
DB_NAME=nakama_space
JWT_SECRET=your_super_secret_jwt_key_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/webhook
PORT=5000
NODE_ENV=production
```

### 4. Импорт схемы и запуск
```bash
# Импортируем схему
mysql -u nakama_user -p nakama_space < database/schema.sql

# Собираем frontend
cd frontend && npm run build && cd ..

# Создаем директории
mkdir -p backend/uploads
mkdir -p /home/nakama/logs

# Запускаем приложение
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Настройка Nginx
```bash
# Создаем конфигурацию
sudo nano /etc/nginx/sites-available/nakama-space
```

**Конфигурация Nginx:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        root /home/nakama/apps/nakama-space/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Загруженные файлы
    location /uploads {
        alias /home/nakama/apps/nakama-space/backend/uploads;
    }

    # phpMyAdmin
    location /phpmyadmin {
        alias /usr/share/phpmyadmin;
        index index.php;
    }
}
```

```bash
# Активируем сайт
sudo ln -s /etc/nginx/sites-available/nakama-space /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL сертификат
```bash
# Устанавливаем Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получаем сертификат
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 7. Настройка Telegram Bot
1. Найдите [@BotFather](https://t.me/botfather)
2. Создайте бота: `/newbot`
3. Настройте Mini App: `/newapp`
4. URL: `https://yourdomain.com`

### 8. Добавление первого админа
```bash
# Войдите в phpMyAdmin: https://yourdomain.com/phpmyadmin
# Выберите базу nakama_space → таблица users
# Найдите вашего пользователя и измените role на 'admin'
```

## ✅ Проверка работы

### Тестирование функций:
1. **Откройте**: https://yourdomain.com
2. **Авторизуйтесь** через Telegram
3. **Создайте пост** с изображением
4. **Проверьте поиск** - должен автоматически определить регион
5. **Проверьте phpMyAdmin**: https://yourdomain.com/phpmyadmin

### Для России:
- Поиск автоматически переключится на альтернативные источники
- Появится уведомление "Режим для России"
- Будут доступны локальные посты пользователей

## 🎯 Готово!

Ваше приложение теперь работает для всех стран:
- **🇺🇸 США/Европа**: Прямой доступ к API
- **🇷🇺 Россия**: Автоматическое переключение на альтернативы
- **🌍 Другие**: Адаптивная система

**Пользователи из России получают полнофункциональный поиск!** 🚀
