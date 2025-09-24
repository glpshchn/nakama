# 🚀 Полная инструкция по развертыванию NakamaSpace

## 📋 Содержание
1. [Подготовка сервера](#подготовка-сервера)
2. [Установка зависимостей](#установка-зависимостей)
3. [Настройка базы данных](#настройка-базы-данных)
4. [Развертывание приложения](#развертывание-приложения)
5. [Настройка веб-сервера](#настройка-веб-сервера)
6. [Настройка SSL](#настройка-ssl)
7. [Настройка Telegram Bot](#настройка-telegram-bot)
8. [Тестирование](#тестирование)
9. [Мониторинг](#мониторинг)

---

## 🖥️ Подготовка сервера

### Требования к серверу:
- **ОС**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **RAM**: минимум 2GB, рекомендуется 4GB+
- **CPU**: минимум 2 ядра
- **Диск**: минимум 20GB свободного места
- **Сеть**: статический IP адрес, открытые порты 80, 443, 22

### 1. Обновление системы

```bash
# Обновляем пакеты
sudo apt update && sudo apt upgrade -y

# Устанавливаем необходимые пакеты
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
```

### 2. Создание пользователя для приложения

```bash
# Создаем пользователя nakama
sudo adduser nakama

# Добавляем в группу sudo
sudo usermod -aG sudo nakama

# Переключаемся на пользователя nakama
sudo su - nakama

# Создаем SSH ключи (опционально)
ssh-keygen -t rsa -b 4096 -C "nakama@yourdomain.com"
```

### 3. Настройка брандмауэра

```bash
# Устанавливаем UFW
sudo apt install ufw -y

# Настраиваем правила
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3306/tcp  # MySQL (только если нужен внешний доступ)

# Включаем брандмауэр
sudo ufw enable

# Проверяем статус
sudo ufw status
```

---

## 📦 Установка зависимостей

### 1. Установка Node.js

```bash
# Устанавливаем Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверяем версии
node --version  # должно быть v18.x.x
npm --version   # должно быть 9.x.x+

# Устанавливаем PM2 глобально
sudo npm install -g pm2
```

### 2. Установка MySQL

```bash
# Устанавливаем MySQL Server
sudo apt install mysql-server -y

# Запускаем и включаем автозапуск
sudo systemctl start mysql
sudo systemctl enable mysql

# Проверяем статус
sudo systemctl status mysql

# Настраиваем безопасность MySQL
sudo mysql_secure_installation
```

**Настройки безопасности MySQL:**
- Установите пароль для root
- Удалите анонимных пользователей: `Y`
- Запретите root логин удаленно: `Y`
- Удалите тестовую базу: `Y`
- Перезагрузите таблицы привилегий: `Y`

### 3. Установка Nginx

```bash
# Устанавливаем Nginx
sudo apt install nginx -y

# Запускаем и включаем автозапуск
sudo systemctl start nginx
sudo systemctl enable nginx

# Проверяем статус
sudo systemctl status nginx

# Проверяем, что Nginx работает
curl -I http://localhost
```

### 4. Установка phpMyAdmin

```bash
# Устанавливаем Apache (если не установлен)
sudo apt install apache2 -y

# Устанавливаем PHP и необходимые модули
sudo apt install php php-mysql php-mbstring php-zip php-gd php-json php-curl -y

# Устанавливаем phpMyAdmin
sudo apt install phpmyadmin -y
```

**При установке phpMyAdmin:**
- Выберите `apache2` как веб-сервер
- Выберите `Yes` для настройки базы данных
- Установите пароль для phpMyAdmin

```bash
# Создаем симлинк для Apache
sudo ln -s /usr/share/phpmyadmin /var/www/html/phpmyadmin

# Включаем необходимые модули Apache
sudo a2enmod rewrite
sudo a2enmod ssl
sudo systemctl restart apache2
```

---

## 🗄️ Настройка базы данных

### 1. Создание базы данных и пользователя

```bash
# Входим в MySQL как root
sudo mysql -u root -p

# Создаем базу данных и пользователя
CREATE DATABASE nakama_space CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nakama_user'@'localhost' IDENTIFIED BY 'your_strong_password_here';
GRANT ALL PRIVILEGES ON nakama_space.* TO 'nakama_user'@'localhost';
FLUSH PRIVILEGES;

# Проверяем создание
SHOW DATABASES;
SELECT User, Host FROM mysql.user WHERE User = 'nakama_user';

# Выходим из MySQL
EXIT;
```

### 2. Импорт схемы базы данных

```bash
# Переключаемся на пользователя nakama
sudo su - nakama

# Создаем директорию для приложения
mkdir -p /home/nakama/apps
cd /home/nakama/apps

# Клонируем репозиторий (замените на ваш URL)
git clone https://github.com/yourusername/nakama-space.git nakama-space
cd nakama-space

# Импортируем схему базы данных
mysql -u nakama_user -p nakama_space < database/schema.sql

# Проверяем, что таблицы созданы
mysql -u nakama_user -p nakama_space -e "SHOW TABLES;"
```

### 3. Настройка phpMyAdmin

```bash
# Создаем пользователя для phpMyAdmin
sudo mysql -u root -p

# Создаем пользователя phpMyAdmin
CREATE USER 'phpmyadmin'@'localhost' IDENTIFIED BY 'phpmyadmin_strong_password';
GRANT ALL PRIVILEGES ON *.* TO 'phpmyadmin'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
EXIT;
```

**Настройка конфигурации phpMyAdmin:**
```bash
sudo nano /etc/phpmyadmin/config.inc.php
```

Добавьте в конец файла:
```php
// Настройки безопасности
$cfg['Servers'][$i]['auth_type'] = 'cookie';
$cfg['Servers'][$i]['host'] = 'localhost';
$cfg['Servers'][$i]['connect_type'] = 'tcp';
$cfg['Servers'][$i]['compress'] = false;
$cfg['Servers'][$i]['AllowNoPassword'] = false;

// Настройки интерфейса
$cfg['DefaultLang'] = 'ru';
$cfg['ServerDefault'] = 1;
$cfg['UploadDir'] = '';
$cfg['SaveDir'] = '';

// Безопасность
$cfg['blowfish_secret'] = 'your_blowfish_secret_here_make_it_long_and_random';
```

---

## 🚀 Развертывание приложения

### 1. Настройка переменных окружения

```bash
# Создаем .env файл
cp backend/config.example.env backend/.env

# Редактируем .env файл
nano backend/.env
```

**Содержимое `.env` файла:**
```env
# Database Configuration
DB_HOST=localhost
DB_USER=nakama_user
DB_PASSWORD=your_strong_password_here
DB_NAME=nakama_space

# JWT Secret (сгенерируйте случайную строку)
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random_at_least_32_characters

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/webhook

# API Keys
E621_USER_AGENT=NakamaSpace/1.0 (your_contact_info)
DANBOORU_API_KEY=your_danbooru_api_key_here
GELBOORU_API_KEY=your_gelbooru_api_key_here

# Server Configuration
PORT=5000
NODE_ENV=production

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com
```

### 2. Установка зависимостей

```bash
# Устанавливаем зависимости для всего проекта
npm run install-all

# Проверяем, что все установилось
ls -la node_modules
ls -la backend/node_modules
ls -la frontend/node_modules
```

### 3. Сборка frontend

```bash
# Собираем React приложение
cd frontend
npm run build

# Проверяем, что сборка прошла успешно
ls -la build/

# Возвращаемся в корневую директорию
cd ..
```

### 4. Создание необходимых директорий

```bash
# Создаем директорию для загруженных файлов
mkdir -p backend/uploads
chmod 755 backend/uploads

# Создаем директорию для логов
mkdir -p /home/nakama/logs
chmod 755 /home/nakama/logs

# Создаем директорию для бэкапов
mkdir -p /home/nakama/backups
chmod 755 /home/nakama/backups
```

### 5. Настройка PM2

```bash
# Создаем конфигурацию PM2
nano ecosystem.config.js
```

**Содержимое `ecosystem.config.js`:**
```javascript
module.exports = {
  apps: [{
    name: 'nakama-space-backend',
    script: './backend/server.js',
    cwd: '/home/nakama/apps/nakama-space',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/home/nakama/logs/nakama-space-error.log',
    out_file: '/home/nakama/logs/nakama-space-out.log',
    log_file: '/home/nakama/logs/nakama-space-combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### 6. Запуск приложения

```bash
# Запускаем приложение
pm2 start ecosystem.config.js

# Сохраняем конфигурацию PM2
pm2 save

# Настраиваем автозапуск
pm2 startup

# Выполните команду, которую покажет PM2 (обычно что-то вроде):
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u nakama --hp /home/nakama

# Проверяем статус
pm2 status
pm2 logs nakama-space-backend --lines 50
```

---

## 🌐 Настройка веб-сервера

### 1. Создание конфигурации Nginx

```bash
# Создаем конфигурацию сайта
sudo nano /etc/nginx/sites-available/nakama-space
```

**Содержимое конфигурации:**
```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

# Upstream для backend
upstream nakama_backend {
    server 127.0.0.1:5000;
    keepalive 32;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Frontend (React build)
    location / {
        root /home/nakama/apps/nakama-space/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Кэширование статических файлов
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Vary "Accept-Encoding";
        }
        
        # Кэширование HTML файлов
        location ~* \.html$ {
            expires 1h;
            add_header Cache-Control "public, must-revalidate";
        }
    }

    # Backend API с rate limiting
    location /api {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://nakama_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # WebSocket для уведомлений
    location /socket.io/ {
        proxy_pass http://nakama_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Загруженные файлы
    location /uploads {
        alias /home/nakama/apps/nakama-space/backend/uploads;
        expires 1y;
        add_header Cache-Control "public";
        add_header Vary "Accept-Encoding";
        
        # Безопасность
        location ~* \.(php|php3|php4|php5|phtml|pl|py|jsp|asp|sh|cgi)$ {
            deny all;
        }
    }

    # phpMyAdmin
    location /phpmyadmin {
        alias /usr/share/phpmyadmin;
        index index.php;
        
        # Rate limiting для phpMyAdmin
        limit_req zone=login burst=5 nodelay;
        
        location ~ ^/phpmyadmin/(.+\.php)$ {
            alias /usr/share/phpmyadmin;
            fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME $request_filename;
            include fastcgi_params;
            
            # Безопасность
            fastcgi_param PHP_VALUE "open_basedir=/usr/share/phpmyadmin:/tmp";
        }
        
        location ~* ^/phpmyadmin/(.+\.(jpg|jpeg|gif|css|png|js|ico|html|xml|txt))$ {
            alias /usr/share/phpmyadmin;
            expires 1y;
            add_header Cache-Control "public";
        }
    }

    # Безопасность - скрываем служебные файлы
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ /\.(htaccess|htpasswd|ini|log|sh|sql|conf)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Блокируем доступ к конфигурационным файлам
    location ~ /(config|database|\.env) {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Логи
    access_log /var/log/nginx/nakama-space.access.log;
    error_log /var/log/nginx/nakama-space.error.log;
    
    # Размер загружаемых файлов
    client_max_body_size 10M;
}
```

### 2. Активация конфигурации

```bash
# Активируем сайт
sudo ln -s /etc/nginx/sites-available/nakama-space /etc/nginx/sites-enabled/

# Удаляем дефолтный сайт
sudo rm /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
sudo nginx -t

# Перезапускаем Nginx
sudo systemctl restart nginx

# Проверяем статус
sudo systemctl status nginx
```

### 3. Настройка прав доступа

```bash
# Устанавливаем правильные права на файлы
sudo chown -R nakama:nakama /home/nakama/apps/nakama-space
sudo chmod -R 755 /home/nakama/apps/nakama-space
sudo chmod 600 /home/nakama/apps/nakama-space/backend/.env

# Права на директорию загрузок
sudo chmod 755 /home/nakama/apps/nakama-space/backend/uploads
sudo chown -R nakama:www-data /home/nakama/apps/nakama-space/backend/uploads
```

---

## 🔒 Настройка SSL

### 1. Установка Certbot

```bash
# Устанавливаем Certbot
sudo apt install certbot python3-certbot-nginx -y

# Проверяем установку
certbot --version
```

### 2. Получение SSL сертификата

```bash
# Получаем сертификат для домена
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Следуйте инструкциям:
# - Введите email для уведомлений
# - Согласитесь с условиями использования
# - Выберите, хотите ли получать новости от EFF
# - Certbot автоматически настроит Nginx
```

### 3. Настройка автообновления

```bash
# Проверяем автообновление
sudo certbot renew --dry-run

# Настраиваем cron для автообновления
sudo crontab -e

# Добавляем строку:
# 0 12 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
```

### 4. Проверка SSL

```bash
# Проверяем статус сертификата
sudo certbot certificates

# Проверяем доступность по HTTPS
curl -I https://yourdomain.com
curl -I https://yourdomain.com/api/health
```

---

## 🤖 Настройка Telegram Bot

### 1. Создание бота

1. Найдите [@BotFather](https://t.me/botfather) в Telegram
2. Отправьте команду `/newbot`
3. Введите имя бота (например: "NakamaSpace Bot")
4. Введите username бота (например: "nakamaspace_bot")
5. Сохраните полученный токен

### 2. Настройка Mini App

```bash
# В @BotFather выполните команды:
/newapp
# Выберите вашего бота
# Введите название приложения: NakamaSpace
# Введите описание: Социальная сеть для фурри и аниме сообщества
# Введите URL: https://yourdomain.com
# Загрузите иконку приложения (512x512 PNG)
```

### 3. Обновление конфигурации

```bash
# Обновите .env файл с токеном бота
nano backend/.env

# Добавьте/обновите:
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/webhook

# Перезапускаем приложение
pm2 restart nakama-space-backend

# Проверяем логи
pm2 logs nakama-space-backend --lines 20
```

---

## 🧪 Тестирование

### 1. Проверка всех сервисов

```bash
# Проверяем статус PM2
pm2 status

# Проверяем статус Nginx
sudo systemctl status nginx

# Проверяем статус MySQL
sudo systemctl status mysql

# Проверяем доступность API
curl -I http://localhost:5000/api/health
```

### 2. Тестирование прокси (для России)

```bash
# Тестируем e621 через прокси
curl "https://yourdomain.com/api/proxy/e621/posts.json?tags=cat&limit=1"

# Тестируем danbooru через прокси
curl "https://yourdomain.com/api/proxy/danbooru/posts.json?tags=cat&limit=1"

# Тестируем gelbooru через прокси
curl "https://yourdomain.com/api/proxy/gelbooru/index.php?page=dapi&s=post&q=index&json=1&tags=cat&limit=1"
```

### 3. Тестирование функций приложения

1. **Откройте сайт**: https://yourdomain.com
2. **Проверьте авторизацию** через Telegram
3. **Создайте тестовый пост** с изображением
4. **Проверьте комментарии**
5. **Проверьте поиск** - должен работать для всех источников
6. **Проверьте уведомления**
7. **Проверьте phpMyAdmin**: https://yourdomain.com/phpmyadmin

### 4. Добавление первого администратора

```bash
# Войдите в phpMyAdmin: https://yourdomain.com/phpmyadmin
# Выберите базу nakama_space → таблица users
# Найдите вашего пользователя и измените role на 'admin'
# Или выполните SQL:
mysql -u nakama_user -p nakama_space -e "UPDATE users SET role = 'admin' WHERE id = 1;"
```

---

## 📊 Мониторинг

### 1. Создание скрипта мониторинга

```bash
# Создаем скрипт мониторинга
nano /home/nakama/monitor.sh
```

**Содержимое `monitor.sh`:**
```bash
#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Проверка состояния NakamaSpace..."

# Проверка PM2
echo -n "PM2 статус: "
if pm2 list | grep -q "nakama-space-backend.*online"; then
    echo -e "${GREEN}✅ Работает${NC}"
else
    echo -e "${RED}❌ Не работает${NC}"
fi

# Проверка Nginx
echo -n "Nginx статус: "
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Работает${NC}"
else
    echo -e "${RED}❌ Не работает${NC}"
fi

# Проверка MySQL
echo -n "MySQL статус: "
if systemctl is-active --quiet mysql; then
    echo -e "${GREEN}✅ Работает${NC}"
else
    echo -e "${RED}❌ Не работает${NC}"
fi

# Проверка доступности API
echo -n "API доступность: "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health | grep -q "200"; then
    echo -e "${GREEN}✅ Доступен${NC}"
else
    echo -e "${RED}❌ Недоступен${NC}"
fi

# Проверка SSL
echo -n "SSL сертификат: "
if openssl s_client -connect yourdomain.com:443 -servername yourdomain.com </dev/null 2>/dev/null | openssl x509 -noout -dates | grep -q "notAfter"; then
    echo -e "${GREEN}✅ Действителен${NC}"
else
    echo -e "${RED}❌ Проблемы${NC}"
fi

# Проверка прокси
echo -n "Прокси e621: "
if curl -s -o /dev/null -w "%{http_code}" "https://yourdomain.com/api/proxy/e621/posts.json?tags=cat&limit=1" | grep -q "200"; then
    echo -e "${GREEN}✅ Работает${NC}"
else
    echo -e "${RED}❌ Не работает${NC}"
fi

echo "✅ Проверка завершена"
```

```bash
# Делаем скрипт исполняемым
chmod +x /home/nakama/monitor.sh

# Запускаем проверку
./monitor.sh
```

### 2. Создание скрипта резервного копирования

```bash
# Создаем скрипт резервного копирования
nano /home/nakama/backup.sh
```

**Содержимое `backup.sh`:**
```bash
#!/bin/bash

# Настройки
BACKUP_DIR="/home/nakama/backups"
DB_NAME="nakama_space"
DB_USER="nakama_user"
DB_PASS="your_password_here"
APP_DIR="/home/nakama/apps/nakama-space"
DATE=$(date +%Y%m%d_%H%M%S)

# Создаем директорию для бэкапов
mkdir -p $BACKUP_DIR

echo "🔄 Начинаем резервное копирование..."

# Создаем бэкап базы данных
echo "📊 Создаем бэкап базы данных..."
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Создаем бэкап загруженных файлов
echo "📁 Создаем бэкап файлов..."
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz $APP_DIR/backend/uploads/

# Создаем бэкап конфигурации
echo "⚙️ Создаем бэкап конфигурации..."
tar -czf $BACKUP_DIR/config_backup_$DATE.tar.gz $APP_DIR/backend/.env $APP_DIR/ecosystem.config.js

# Удаляем старые бэкапы (старше 7 дней)
echo "🗑️ Удаляем старые бэкапы..."
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "✅ Резервное копирование завершено: $(date)"
```

```bash
# Делаем скрипт исполняемым
chmod +x /home/nakama/backup.sh

# Тестируем бэкап
./backup.sh
```

### 3. Настройка автоматических задач

```bash
# Настраиваем cron задачи
crontab -e

# Добавляем следующие строки:
# Резервное копирование каждый день в 2:00
0 2 * * * /home/nakama/backup.sh >> /home/nakama/logs/backup.log 2>&1

# Мониторинг каждые 5 минут
*/5 * * * * /home/nakama/monitor.sh >> /home/nakama/logs/monitor.log 2>&1

# Очистка логов каждую неделю
0 0 * * 0 find /home/nakama/logs -name "*.log" -mtime +30 -delete
```

---

## 🎉 Готово!

Ваше приложение NakamaSpace теперь полностью развернуто и готово к использованию!

### Доступные URL:
- **Сайт**: https://yourdomain.com
- **API**: https://yourdomain.com/api
- **Прокси для России**: https://yourdomain.com/api/proxy/
- **phpMyAdmin**: https://yourdomain.com/phpmyadmin

### Полезные команды:
```bash
# Мониторинг
./monitor.sh

# Резервное копирование
./backup.sh

# Управление приложением
pm2 status
pm2 logs nakama-space-backend
pm2 restart nakama-space-backend

# Проверка сервисов
sudo systemctl status nginx mysql
```

### Поддержка:
- Логи приложения: `pm2 logs nakama-space-backend`
- Логи Nginx: `sudo tail -f /var/log/nginx/error.log`
- Логи MySQL: `sudo tail -f /var/log/mysql/error.log`

### Особенности для России:
- ✅ **Автоматическое проксирование** - если API заблокированы
- ✅ **Прозрачная работа** - пользователь не замечает разницы
- ✅ **Быстрая работа** - кэширование результатов
- ✅ **Все функции доступны** - поиск, автоподсказки, отправка в чат

**Удачного использования!** 🚀
