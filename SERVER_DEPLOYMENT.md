# 🚀 Развертывание NakamaSpace на сервере

## Подготовка сервера

### 1. Создание пользователя для приложения

```bash
# Создаем пользователя nakama
sudo adduser nakama

# Добавляем в группу sudo (опционально)
sudo usermod -aG sudo nakama

# Переключаемся на пользователя nakama
sudo su - nakama
```

### 2. Установка Node.js

```bash
# Установка Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверяем версии
node --version
npm --version
```

### 3. Установка MySQL

```bash
# Обновляем пакеты
sudo apt update

# Устанавливаем MySQL
sudo apt install mysql-server -y

# Запускаем MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Настраиваем безопасность MySQL
sudo mysql_secure_installation
```

### 4. Установка phpMyAdmin

```bash
# Устанавливаем Apache (если не установлен)
sudo apt install apache2 -y

# Устанавливаем phpMyAdmin
sudo apt install phpmyadmin -y

# Выбираем Apache при установке
# Создаем симлинк для Apache
sudo ln -s /usr/share/phpmyadmin /var/www/html/phpmyadmin

# Включаем модули Apache
sudo a2enmod rewrite
sudo systemctl restart apache2
```

### 5. Настройка MySQL для приложения

```bash
# Входим в MySQL как root
sudo mysql -u root -p

# Создаем базу данных и пользователя
CREATE DATABASE nakama_space;
CREATE USER 'nakama_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON nakama_space.* TO 'nakama_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Развертывание приложения

### 1. Клонирование и настройка

```bash
# Переключаемся на пользователя nakama
sudo su - nakama

# Создаем директорию для приложения
mkdir -p /home/nakama/apps
cd /home/nakama/apps

# Клонируем репозиторий
git clone <your-repository-url> nakama-space
cd nakama-space

# Устанавливаем зависимости
npm run install-all
```

### 2. Настройка базы данных

```bash
# Импортируем схему базы данных
mysql -u nakama_user -p nakama_space < database/schema.sql

# Проверяем, что таблицы созданы
mysql -u nakama_user -p nakama_space -e "SHOW TABLES;"
```

### 3. Настройка переменных окружения

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
DB_PASSWORD=strong_password_here
DB_NAME=nakama_space

# JWT Secret (сгенерируйте случайную строку)
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/webhook

# API Keys
E621_USER_AGENT=NakamaSpace/1.0
DANBOORU_API_KEY=your_danbooru_api_key
GELBOORU_API_KEY=your_gelbooru_api_key

# Server Configuration
PORT=5000
NODE_ENV=production

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
```

### 4. Сборка frontend

```bash
# Собираем React приложение
cd frontend
npm run build
cd ..
```

### 5. Создание директории для загрузок

```bash
# Создаем директорию для загруженных файлов
mkdir -p backend/uploads
chmod 755 backend/uploads
```

## Настройка Nginx

### 1. Установка Nginx

```bash
sudo apt install nginx -y
```

### 2. Создание конфигурации сайта

```bash
sudo nano /etc/nginx/sites-available/nakama-space
```

**Содержимое конфигурации:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend (React build)
    location / {
        root /home/nakama/apps/nakama-space/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Кэширование статических файлов
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket для уведомлений
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
        expires 1y;
        add_header Cache-Control "public";
    }

    # phpMyAdmin
    location /phpmyadmin {
        alias /usr/share/phpmyadmin;
        index index.php;
        
        location ~ ^/phpmyadmin/(.+\.php)$ {
            alias /usr/share/phpmyadmin;
            fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME $request_filename;
            include fastcgi_params;
        }
        
        location ~* ^/phpmyadmin/(.+\.(jpg|jpeg|gif|css|png|js|ico|html|xml|txt))$ {
            alias /usr/share/phpmyadmin;
            expires 1y;
            add_header Cache-Control "public";
        }
    }

    # Безопасность
    location ~ /\. {
        deny all;
    }
    
    # Логи
    access_log /var/log/nginx/nakama-space.access.log;
    error_log /var/log/nginx/nakama-space.error.log;
}
```

### 3. Активация конфигурации

```bash
# Активируем сайт
sudo ln -s /etc/nginx/sites-available/nakama-space /etc/nginx/sites-enabled/

# Удаляем дефолтный сайт
sudo rm /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
sudo nginx -t

# Перезапускаем Nginx
sudo systemctl restart nginx
```

## Настройка SSL с Let's Encrypt

### 1. Установка Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Получение SSL сертификата

```bash
# Получаем сертификат
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Настраиваем автообновление
sudo crontab -e
# Добавляем строку:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## Настройка PM2 для управления процессом

### 1. Установка PM2

```bash
# Устанавливаем PM2 глобально
sudo npm install -g pm2

# Переключаемся на пользователя nakama
sudo su - nakama
cd /home/nakama/apps/nakama-space
```

### 2. Создание конфигурации PM2

```bash
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
    time: true
  }]
};
```

### 3. Создание директории для логов

```bash
mkdir -p /home/nakama/logs
```

### 4. Запуск приложения

```bash
# Запускаем приложение
pm2 start ecosystem.config.js

# Сохраняем конфигурацию PM2
pm2 save

# Настраиваем автозапуск
pm2 startup
# Выполните команду, которую покажет PM2
```

## Настройка phpMyAdmin

### 1. Настройка доступа к phpMyAdmin

```bash
# Создаем пользователя для phpMyAdmin
sudo mysql -u root -p

# Создаем пользователя для phpMyAdmin
CREATE USER 'phpmyadmin'@'localhost' IDENTIFIED BY 'phpmyadmin_password';
GRANT ALL PRIVILEGES ON *.* TO 'phpmyadmin'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
EXIT;
```

### 2. Настройка конфигурации phpMyAdmin

```bash
sudo nano /etc/phpmyadmin/config.inc.php
```

**Добавьте в конец файла:**
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
$cfg['blowfish_secret'] = 'your_blowfish_secret_here';
```

## Настройка брандмауэра

```bash
# Настраиваем UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3306  # MySQL (только если нужен внешний доступ)
```

## Мониторинг и обслуживание

### 1. Команды для мониторинга

```bash
# Статус приложения
pm2 status

# Логи приложения
pm2 logs nakama-space-backend

# Мониторинг в реальном времени
pm2 monit

# Перезапуск приложения
pm2 restart nakama-space-backend

# Остановка приложения
pm2 stop nakama-space-backend
```

### 2. Мониторинг системы

```bash
# Использование ресурсов
htop

# Использование диска
df -h

# Логи Nginx
sudo tail -f /var/log/nginx/nakama-space.access.log
sudo tail -f /var/log/nginx/nakama-space.error.log

# Логи MySQL
sudo tail -f /var/log/mysql/error.log
```

### 3. Резервное копирование

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
DB_PASS="strong_password_here"
APP_DIR="/home/nakama/apps/nakama-space"

# Создаем директорию для бэкапов
mkdir -p $BACKUP_DIR

# Создаем бэкап базы данных
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql

# Создаем бэкап загруженных файлов
tar -czf $BACKUP_DIR/uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz $APP_DIR/backend/uploads/

# Удаляем старые бэкапы (старше 7 дней)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $(date)"
```

```bash
# Делаем скрипт исполняемым
chmod +x /home/nakama/backup.sh

# Настраиваем автоматическое резервное копирование
crontab -e
# Добавляем строку:
# 0 2 * * * /home/nakama/backup.sh
```

## Проверка работоспособности

### 1. Проверка сервисов

```bash
# Проверяем статус всех сервисов
sudo systemctl status nginx
sudo systemctl status mysql
sudo systemctl status apache2
pm2 status
```

### 2. Проверка доступности

```bash
# Проверяем доступность сайта
curl -I http://yourdomain.com
curl -I https://yourdomain.com

# Проверяем API
curl -I http://yourdomain.com/api/health

# Проверяем phpMyAdmin
curl -I http://yourdomain.com/phpmyadmin
```

### 3. Тестирование функций

1. Откройте https://yourdomain.com
2. Проверьте авторизацию
3. Создайте тестовый пост
4. Проверьте комментарии
5. Проверьте поиск
6. Проверьте уведомления

## Устранение неполадок

### 1. Проблемы с правами доступа

```bash
# Исправляем права на файлы
sudo chown -R nakama:nakama /home/nakama/apps/nakama-space
sudo chmod -R 755 /home/nakama/apps/nakama-space
```

### 2. Проблемы с базой данных

```bash
# Проверяем подключение к MySQL
mysql -u nakama_user -p nakama_space -e "SELECT 1;"

# Проверяем таблицы
mysql -u nakama_user -p nakama_space -e "SHOW TABLES;"
```

### 3. Проблемы с Nginx

```bash
# Проверяем конфигурацию
sudo nginx -t

# Перезапускаем Nginx
sudo systemctl restart nginx

# Проверяем логи
sudo tail -f /var/log/nginx/error.log
```

## Безопасность

### 1. Настройка SSH

```bash
# Отключаем root логин
sudo nano /etc/ssh/sshd_config
# Устанавливаем: PermitRootLogin no

# Перезапускаем SSH
sudo systemctl restart ssh
```

### 2. Настройка MySQL

```bash
# Удаляем тестовые базы данных
sudo mysql -u root -p
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.user WHERE User='';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Регулярные обновления

```bash
# Настраиваем автоматические обновления безопасности
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Заключение

После выполнения всех шагов у вас будет:

- ✅ Приложение NakamaSpace, работающее на https://yourdomain.com
- ✅ phpMyAdmin доступный по https://yourdomain.com/phpmyadmin
- ✅ Автоматическое резервное копирование
- ✅ SSL сертификат от Let's Encrypt
- ✅ Мониторинг и логирование
- ✅ Безопасная конфигурация

Приложение готово к использованию! 🚀
