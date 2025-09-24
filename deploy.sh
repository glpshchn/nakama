#!/bin/bash

# Автоматический скрипт развертывания NakamaSpace
# Использование: ./deploy.sh

set -e  # Остановка при ошибке

echo "🚀 Начинаем развертывание NakamaSpace..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Проверяем, что скрипт запущен от пользователя nakama
if [ "$USER" != "nakama" ]; then
    error "Скрипт должен быть запущен от пользователя 'nakama'"
    echo "Используйте: sudo su - nakama"
    exit 1
fi

# Переменные
APP_DIR="/home/nakama/apps/nakama-space"
BACKUP_DIR="/home/nakama/backups"
LOG_DIR="/home/nakama/logs"

# Создаем необходимые директории
log "Создаем директории..."
mkdir -p $APP_DIR
mkdir -p $BACKUP_DIR
mkdir -p $LOG_DIR

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    error "Node.js не установлен. Установите Node.js 18.x"
    echo "Выполните: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "Затем: sudo apt-get install -y nodejs"
    exit 1
fi

# Проверяем наличие MySQL
if ! command -v mysql &> /dev/null; then
    error "MySQL не установлен. Установите MySQL"
    echo "Выполните: sudo apt install mysql-server -y"
    exit 1
fi

# Проверяем наличие PM2
if ! command -v pm2 &> /dev/null; then
    log "Устанавливаем PM2..."
    sudo npm install -g pm2
fi

# Переходим в директорию приложения
cd $APP_DIR

# Проверяем наличие .env файла
if [ ! -f "backend/.env" ]; then
    warn ".env файл не найден. Создаем из примера..."
    cp backend/config.example.env backend/.env
    warn "Отредактируйте backend/.env файл перед продолжением!"
    echo "Нажмите Enter после редактирования .env файла..."
    read
fi

# Устанавливаем зависимости
log "Устанавливаем зависимости..."
npm run install-all

# Собираем frontend
log "Собираем frontend..."
cd frontend
npm run build
cd ..

# Проверяем подключение к базе данных
log "Проверяем подключение к базе данных..."
if ! mysql -u nakama_user -p$DB_PASSWORD -e "USE nakama_space;" 2>/dev/null; then
    warn "База данных nakama_space не существует или недоступна"
    warn "Создайте базу данных и пользователя:"
    echo "CREATE DATABASE nakama_space;"
    echo "CREATE USER 'nakama_user'@'localhost' IDENTIFIED BY 'your_password';"
    echo "GRANT ALL PRIVILEGES ON nakama_space.* TO 'nakama_user'@'localhost';"
    echo "FLUSH PRIVILEGES;"
    echo "Нажмите Enter после создания базы данных..."
    read
fi

# Импортируем схему базы данных
log "Импортируем схему базы данных..."
if [ -f "database/schema.sql" ]; then
    mysql -u nakama_user -p$DB_PASSWORD nakama_space < database/schema.sql
    log "Схема базы данных импортирована"
else
    warn "Файл database/schema.sql не найден"
fi

# Создаем директорию для загрузок
log "Создаем директорию для загрузок..."
mkdir -p backend/uploads
chmod 755 backend/uploads

# Создаем конфигурацию PM2
log "Создаем конфигурацию PM2..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'nakama-space-backend',
    script: './backend/server.js',
    cwd: '$APP_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '$LOG_DIR/nakama-space-error.log',
    out_file: '$LOG_DIR/nakama-space-out.log',
    log_file: '$LOG_DIR/nakama-space-combined.log',
    time: true
  }]
};
EOF

# Останавливаем существующий процесс (если есть)
log "Останавливаем существующий процесс..."
pm2 stop nakama-space-backend 2>/dev/null || true
pm2 delete nakama-space-backend 2>/dev/null || true

# Запускаем приложение
log "Запускаем приложение..."
pm2 start ecosystem.config.js

# Сохраняем конфигурацию PM2
pm2 save

# Проверяем статус
log "Проверяем статус приложения..."
pm2 status

# Создаем скрипт резервного копирования
log "Создаем скрипт резервного копирования..."
cat > $BACKUP_DIR/backup.sh << 'EOF'
#!/bin/bash

# Настройки
BACKUP_DIR="/home/nakama/backups"
DB_NAME="nakama_space"
DB_USER="nakama_user"
DB_PASS="your_password_here"
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
EOF

chmod +x $BACKUP_DIR/backup.sh

# Создаем скрипт мониторинга
log "Создаем скрипт мониторинга..."
cat > $LOG_DIR/monitor.sh << 'EOF'
#!/bin/bash

echo "🔍 Проверка состояния NakamaSpace..."

# Проверка PM2
echo -n "PM2 статус: "
if pm2 list | grep -q "nakama-space-backend.*online"; then
    echo "✅ Работает"
else
    echo "❌ Не работает"
fi

# Проверка доступности API
echo -n "API доступность: "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health | grep -q "200"; then
    echo "✅ Доступен"
else
    echo "❌ Недоступен"
fi

echo "✅ Проверка завершена"
EOF

chmod +x $LOG_DIR/monitor.sh

# Создаем скрипт обновления
log "Создаем скрипт обновления..."
cat > update.sh << 'EOF'
#!/bin/bash

echo "🔄 Обновляем NakamaSpace..."

# Останавливаем приложение
pm2 stop nakama-space-backend

# Создаем бэкап
./backup.sh

# Получаем обновления
git pull origin main

# Устанавливаем зависимости
npm run install-all

# Собираем frontend
cd frontend
npm run build
cd ..

# Запускаем приложение
pm2 start nakama-space-backend

echo "✅ Обновление завершено!"
EOF

chmod +x update.sh

# Проверяем, что приложение запустилось
sleep 5
if pm2 list | grep -q "nakama-space-backend.*online"; then
    log "✅ Приложение успешно запущено!"
    log "🌐 Frontend: http://localhost:3000 (в production будет через Nginx)"
    log "🔧 Backend API: http://localhost:5000"
    log "📊 PM2 статус: pm2 status"
    log "📝 Логи: pm2 logs nakama-space-backend"
else
    error "❌ Приложение не запустилось. Проверьте логи:"
    echo "pm2 logs nakama-space-backend"
    exit 1
fi

# Показываем следующее шаги
echo ""
log "🎉 Развертывание завершено!"
echo ""
echo "Следующие шаги:"
echo "1. Настройте Nginx (см. QUICK_DEPLOY.md)"
echo "2. Настройте SSL сертификат"
echo "3. Настройте Telegram Bot"
echo "4. Проверьте работу приложения"
echo ""
echo "Полезные команды:"
echo "  pm2 status                    - статус приложения"
echo "  pm2 logs nakama-space-backend - логи приложения"
echo "  pm2 restart nakama-space-backend - перезапуск"
echo "  ./update.sh                   - обновление приложения"
echo "  ./backup.sh                   - резервное копирование"
echo ""