const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');

// Импорт маршрутов
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const searchRoutes = require('./routes/search');
const proxyRoutes = require('./routes/proxy');
const usersRoutes = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.telegram.org", "https://e621.net", "https://danbooru.donmai.us", "https://gelbooru.com"]
    }
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: { error: 'Слишком много запросов, попробуйте позже' }
});
app.use('/api/', limiter);

// Статические файлы
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API маршруты
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// WebSocket для уведомлений в реальном времени
io.on('connection', (socket) => {
  console.log('Пользователь подключился:', socket.id);

  // Подписка на уведомления пользователя
  socket.on('subscribe-notifications', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`Пользователь ${userId} подписался на уведомления`);
  });

  // Отписка от уведомлений
  socket.on('unsubscribe-notifications', (userId) => {
    socket.leave(`user-${userId}`);
    console.log(`Пользователь ${userId} отписался от уведомлений`);
  });

  socket.on('disconnect', () => {
    console.log('Пользователь отключился:', socket.id);
  });
});

// Middleware для отправки уведомлений через WebSocket
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Файл слишком большой' });
  }
  
  res.status(500).json({ 
    error: 'Внутренняя ошибка сервера',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Запуск сервера
const startServer = async () => {
  try {
    // Проверяем подключение к базе данных
    await testConnection();
    
    server.listen(PORT, () => {
      console.log(`🚀 Сервер запущен на порту ${PORT}`);
      console.log(`📱 NakamaSpace API готов к работе`);
      console.log(`🌐 Режим: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Получен сигнал SIGTERM, завершаем работу...');
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Получен сигнал SIGINT, завершаем работу...');
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
});

startServer();

module.exports = { app, io };
