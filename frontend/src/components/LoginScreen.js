import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const LoginScreen = () => {
  const { login } = useAuth();

  useEffect(() => {
    // Проверяем, запущено ли приложение в Telegram
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Расширяем приложение на весь экран
      tg.expand();
      
      // Получаем данные пользователя
      const initData = tg.initData;
      
      if (initData) {
        handleTelegramLogin(initData);
      } else {
        // Если данных нет, показываем кнопку входа
        tg.ready();
        tg.MainButton.setText('Войти через Telegram');
        tg.MainButton.show();
        tg.MainButton.onClick(() => {
          // В реальном приложении здесь будет редирект на Telegram OAuth
          toast.error('Функция входа через Telegram недоступна в демо-режиме');
        });
      }
    } else {
      // Демо-режим для разработки
      console.log('Демо-режим: Telegram WebApp не доступен');
    }
  }, []);

  const handleTelegramLogin = async (initData) => {
    try {
      const result = await login(initData);
      if (result.success) {
        toast.success('Успешная авторизация!');
      } else {
        toast.error(result.error || 'Ошибка авторизации');
      }
    } catch (error) {
      toast.error('Ошибка авторизации');
    }
  };

  const handleDemoLogin = async () => {
    // Демо-авторизация для разработки
    const demoData = 'user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Demo%22%2C%22last_name%22%3A%22User%22%2C%22username%22%3A%22demo_user%22%2C%22language_code%22%3A%22ru%22%7D&chat_instance=-123456789&chat_type=sender&auth_date=1234567890&hash=demo_hash';
    
    try {
      const result = await login(demoData);
      if (result.success) {
        toast.success('Демо-авторизация успешна!');
      } else {
        toast.error(result.error || 'Ошибка демо-авторизации');
      }
    } catch (error) {
      toast.error('Ошибка демо-авторизации');
    }
  };

  return (
    <div className="container">
      <div className="card text-center">
        <h1 className="card-title">NakamaSpace</h1>
        <p className="card-subtitle mb-3">
          Социальная сеть для фурри и аниме сообщества
        </p>
        
        <div className="mb-3">
          <h3>Добро пожаловать!</h3>
          <p className="text-muted">
            Войдите через Telegram, чтобы начать пользоваться приложением
          </p>
        </div>

        {!window.Telegram?.WebApp && (
          <div className="mb-3">
            <p className="text-muted text-small mb-2">
              Демо-режим (Telegram WebApp недоступен)
            </p>
            <button 
              className="btn btn-primary"
              onClick={handleDemoLogin}
            >
              Войти в демо-режиме
            </button>
          </div>
        )}

        <div className="text-muted text-small">
          <p>Возможности приложения:</p>
          <ul style={{ textAlign: 'left', marginTop: '16px' }}>
            <li>📝 Создание постов с темами (фурри, аниме, другое)</li>
            <li>🔍 Поиск изображений через e621 и Danbooru</li>
            <li>👥 Подписки и уведомления</li>
            <li>🎨 Стиль интерфейса в духе Telegram</li>
            <li>🛡️ Система модерации и NSFW фильтры</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
