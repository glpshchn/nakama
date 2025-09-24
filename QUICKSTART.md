# 🚀 Быстрый старт NakamaSpace

## Установка за 5 минут

### 1. Установите зависимости
```bash
# Установка всех зависимостей одной командой
npm run install-all
```

### 2. Настройте базу данных
```bash
# Запустите MySQL и создайте базу данных
mysql -u root -p

# В MySQL выполните:
CREATE DATABASE nakama_space;
USE nakama_space;
source database/schema.sql;
```

### 3. Настройте переменные окружения
```bash
# Скопируйте пример конфигурации
cp backend/config.example.env backend/.env

# Отредактируйте .env файл (минимум):
# DB_PASSWORD=your_mysql_password
# JWT_SECRET=any_random_string_here
```

### 4. Запустите приложение
```bash
# Запуск в режиме разработки
npm run dev
```

### 5. Откройте в браузере
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Демо-режим

Если вы запускаете приложение не в Telegram, используйте кнопку "Войти в демо-режиме" на экране входа.

## Структура проекта

```
nakama/
├── backend/           # Node.js API сервер
│   ├── routes/       # API маршруты
│   ├── middleware/   # Middleware функции
│   ├── config/       # Конфигурация БД
│   └── server.js     # Главный файл сервера
├── frontend/         # React приложение
│   ├── src/
│   │   ├── components/  # React компоненты
│   │   ├── contexts/    # React контексты
│   │   ├── services/    # API сервисы
│   │   └── App.js       # Главный компонент
├── database/         # SQL схемы
└── README.md         # Полная документация
```

## Основные команды

```bash
npm run dev          # Запуск в режиме разработки
npm run server       # Только backend
npm run client       # Только frontend
npm run build        # Сборка для продакшена
npm run install-all  # Установка всех зависимостей
```

## Возможные проблемы

### Ошибка подключения к БД
- Проверьте, что MySQL запущен
- Убедитесь, что пароль в `.env` правильный
- Проверьте, что база данных `nakama_space` создана

### Ошибка портов
- Убедитесь, что порты 3000 и 5000 свободны
- Или измените порты в конфигурации

### Ошибки зависимостей
```bash
# Очистите кэш и переустановите
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json
npm run install-all
```

## Следующие шаги

1. Прочитайте полную документацию в [README.md](README.md)
2. Настройте Telegram Bot для продакшена
3. Настройте HTTPS домен
4. Разверните на сервере

Удачи! 🎉
