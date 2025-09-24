import React, { useState, useEffect } from 'react';
import { User, Settings, Heart, Users, MessageCircle, LogOut, Save, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI, usersAPI } from '../services/api';
import { LoadingScreen } from './LoadingScreen';
import toast from 'react-hot-toast';

export const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    whitelist_enabled: false,
    nsfw_hidden: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getMe();
      setProfile(response.data);
      setSettings({
        whitelist_enabled: response.data.whitelist_enabled,
        nsfw_hidden: response.data.nsfw_hidden
      });
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
      toast.error('Ошибка загрузки профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await authAPI.updateSettings(settings);
      updateUser(settings);
      toast.success('Настройки сохранены');
      setShowSettings(false);
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
      toast.error('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Вы уверены, что хотите выйти?')) {
      logout();
      toast.success('Вы вышли из аккаунта');
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!profile) {
    return (
      <div className="container">
        <div className="card text-center">
          <p className="text-muted">Ошибка загрузки профиля</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Информация о профиле */}
      <div className="card mb-2">
        <div className="text-center">
          <img
            src={profile.photo_url || '/default-avatar.png'}
            alt={profile.username}
            className="avatar-lg mb-2"
            onError={(e) => {
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiNmMWYxZjEiLz4KPHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSIxMiIgeT0iMTIiPgo8cGF0aCBkPSJNMjAgMjF2LTJhNCA0IDAgMCAwLTQtNEg4YTQgNCAwIDAgMC00IDR2MiIgc3Ryb2tlPSIjOTk5OTk5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8Y2lyY2xlIGN4PSIxMiIgY3k9IjciIHI9IjQiIHN0cm9rZT0iIzk5OTk5OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cjwvc3ZnPgo=';
            }}
          />
          
          <h2 className="card-title">
            {profile.first_name || profile.username || 'Пользователь'}
          </h2>
          
          {profile.username && (
            <p className="text-muted mb-2">@{profile.username}</p>
          )}

          <div className="d-flex justify-content-center gap-3 mb-3">
            <div className="text-center">
              <div className="text-large" style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {profile.posts_count || 0}
              </div>
              <div className="text-small text-muted">Постов</div>
            </div>
            <div className="text-center">
              <div className="text-large" style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {profile.followers_count || 0}
              </div>
              <div className="text-small text-muted">Подписчиков</div>
            </div>
            <div className="text-center">
              <div className="text-large" style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {profile.following_count || 0}
              </div>
              <div className="text-small text-muted">Подписок</div>
            </div>
          </div>

          <div className="text-small text-muted">
            На платформе с {new Date(profile.created_at).toLocaleDateString('ru-RU')}
          </div>
        </div>
      </div>

      {/* Действия */}
      <div className="card mb-2">
        <div className="d-flex gap-2">
          <button
            className="btn btn-secondary"
            onClick={() => setShowSettings(true)}
            style={{ flex: 1 }}
          >
            <Settings size={20} />
            Настройки
          </button>
          <button
            className="btn btn-danger"
            onClick={handleLogout}
            style={{ flex: 1 }}
          >
            <LogOut size={20} />
            Выйти
          </button>
        </div>
      </div>

      {/* Информация о приложении */}
      <div className="card">
        <h3 className="card-title">О NakamaSpace</h3>
        <div className="text-small text-muted">
          <p>Версия: 1.0.0</p>
          <p>Социальная сеть для фурри и аниме сообщества</p>
          <p>Создано с ❤️ для Telegram</p>
        </div>
      </div>

      {/* Модальное окно настроек */}
      {showSettings && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'var(--tg-theme-bg-color)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div className="modal-header" style={{
              padding: '16px',
              borderBottom: '1px solid var(--tg-theme-hint-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3>Настройки</h3>
              <button
                className="btn-icon"
                onClick={() => setShowSettings(false)}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '16px' }}>
              {/* Настройка вайтлиста */}
              <div className="form-group">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <label className="form-label" style={{ margin: 0 }}>
                      Включить вайтлист
                    </label>
                    <p className="text-small text-muted" style={{ margin: 0 }}>
                      Показывать только посты без фурри контента
                    </p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.whitelist_enabled}
                      onChange={(e) => handleSettingsChange('whitelist_enabled', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              {/* Настройка NSFW */}
              <div className="form-group">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <label className="form-label" style={{ margin: 0 }}>
                      Скрывать NSFW контент
                    </label>
                    <p className="text-small text-muted" style={{ margin: 0 }}>
                      Скрывать посты с пометкой NSFW (кроме поиска)
                    </p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.nsfw_hidden}
                      onChange={(e) => handleSettingsChange('nsfw_hidden', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              {/* Кнопки */}
              <div className="d-flex gap-2 mt-3">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowSettings(false)}
                  style={{ flex: 1 }}
                >
                  Отмена
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  style={{ flex: 1 }}
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
