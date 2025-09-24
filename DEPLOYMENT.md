# 🚀 Развертывание NakamaSpace

## Варианты развертывания

### 1. Локальная разработка
```bash
# Клонируйте репозиторий
git clone <your-repo>
cd nakama

# Установите зависимости
npm run install-all

# Настройте базу данных
mysql -u root -p < database/schema.sql

# Настройте .env файл
cp backend/config.example.env backend/.env

# Запустите приложение
npm run dev
```

### 2. Docker развертывание

Создайте `docker-compose.yml`:
```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: your_password
      MYSQL_DATABASE: nakama_space
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      DB_HOST: mysql
      DB_USER: root
      DB_PASSWORD: your_password
      DB_NAME: nakama_space
      JWT_SECRET: your_jwt_secret
    depends_on:
      - mysql
    volumes:
      - ./backend/uploads:/app/uploads

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://localhost:5000/api
    depends_on:
      - backend

volumes:
  mysql_data:
```

### 3. VPS развертывание

#### Подготовка сервера
```bash
# Обновите систему
sudo apt update && sudo apt upgrade -y

# Установите Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установите MySQL
sudo apt install mysql-server -y

# Установите PM2
sudo npm install -g pm2

# Установите Nginx
sudo apt install nginx -y
```

#### Настройка приложения
```bash
# Клонируйте репозиторий
git clone <your-repo>
cd nakama

# Установите зависимости
npm run install-all

# Настройте базу данных
sudo mysql -u root -p < database/schema.sql

# Настройте .env файл
cp backend/config.example.env backend/.env
nano backend/.env

# Соберите frontend
cd frontend
npm run build
cd ..
```

#### Настройка Nginx
```bash
sudo nano /etc/nginx/sites-available/nakama
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/nakama/frontend/build;
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
        alias /path/to/nakama/backend/uploads;
    }
}
```

```bash
# Активируйте конфигурацию
sudo ln -s /etc/nginx/sites-available/nakama /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Настройка SSL с Let's Encrypt
```bash
# Установите Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получите SSL сертификат
sudo certbot --nginx -d your-domain.com

# Настройте автообновление
sudo crontab -e
# Добавьте: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Запуск с PM2
```bash
# Создайте ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'nakama-backend',
    script: './backend/server.js',
    cwd: '/path/to/nakama',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOF

# Запустите приложение
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Cloud развертывание

#### Heroku
```bash
# Установите Heroku CLI
# Создайте Procfile
echo "web: cd backend && npm start" > Procfile

# Создайте приложение
heroku create nakama-space

# Добавьте базу данных
heroku addons:create heroku-postgresql:hobby-dev

# Настройте переменные окружения
heroku config:set JWT_SECRET=your_secret
heroku config:set NODE_ENV=production

# Разверните
git push heroku main
```

#### Vercel (только frontend)
```bash
# Установите Vercel CLI
npm i -g vercel

# Разверните frontend
cd frontend
vercel

# Настройте переменные окружения в Vercel dashboard
```

#### Railway
```bash
# Установите Railway CLI
npm install -g @railway/cli

# Войдите в аккаунт
railway login

# Создайте проект
railway init

# Разверните
railway up
```

## Настройка Telegram Bot

### 1. Создание бота
```bash
# Найдите @BotFather в Telegram
# Создайте бота командой /newbot
# Получите токен
```

### 2. Настройка Mini App
```bash
# Отправьте /newapp боту @BotFather
# Выберите вашего бота
# Укажите URL: https://your-domain.com
# Загрузите иконку и описание
```

### 3. Настройка webhook (опционально)
```bash
# Установите webhook для получения обновлений
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-domain.com/webhook"}'
```

## Мониторинг и логи

### PM2 мониторинг
```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs nakama-backend

# Мониторинг в реальном времени
pm2 monit

# Перезапуск приложения
pm2 restart nakama-backend
```

### Nginx логи
```bash
# Логи доступа
sudo tail -f /var/log/nginx/access.log

# Логи ошибок
sudo tail -f /var/log/nginx/error.log
```

### Системные ресурсы
```bash
# Использование CPU и памяти
htop

# Использование диска
df -h

# Сетевые соединения
netstat -tulpn
```

## Резервное копирование

### База данных
```bash
# Создание бэкапа
mysqldump -u root -p nakama_space > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление
mysql -u root -p nakama_space < backup_file.sql
```

### Файлы
```bash
# Архивирование загруженных файлов
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz backend/uploads/

# Автоматическое резервное копирование
crontab -e
# Добавьте: 0 2 * * * /path/to/backup_script.sh
```

## Безопасность

### Firewall
```bash
# Настройте UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
```

### Обновления
```bash
# Автоматические обновления безопасности
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

### SSL/TLS
- Используйте Let's Encrypt для бесплатных сертификатов
- Настройте HSTS заголовки
- Используйте современные TLS версии

## Масштабирование

### Горизонтальное масштабирование
- Используйте load balancer (Nginx, HAProxy)
- Настройте несколько инстансов backend
- Используйте Redis для сессий
- Настройте CDN для статических файлов

### Вертикальное масштабирование
- Увеличьте RAM и CPU сервера
- Оптимизируйте запросы к базе данных
- Используйте кэширование (Redis, Memcached)
- Настройте индексы в MySQL

## Troubleshooting

### Частые проблемы
1. **Ошибка подключения к БД**: Проверьте настройки в .env
2. **Порт занят**: Измените порт или остановите процесс
3. **SSL ошибки**: Проверьте сертификаты и настройки Nginx
4. **Медленная работа**: Проверьте индексы БД и кэширование

### Логи для отладки
```bash
# Backend логи
pm2 logs nakama-backend --lines 100

# Nginx логи
sudo tail -f /var/log/nginx/error.log

# MySQL логи
sudo tail -f /var/log/mysql/error.log
```

Удачи с развертыванием! 🚀
