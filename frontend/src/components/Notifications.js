import React, { useState, useEffect } from 'react';
import { Bell, Heart, User, MessageCircle, Hash, Check, Trash2 } from 'lucide-react';
import { notificationsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';
import toast from 'react-hot-toast';

export const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [showUnreadOnly]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const params = {
        page: 1,
        limit: 50,
        unread_only: showUnreadOnly
      };

      const response = await notificationsAPI.getAll(params);
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
      toast.error('Ошибка загрузки уведомлений');
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('Ошибка загрузки счетчика:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Ошибка отметки как прочитанное:', error);
      toast.error('Ошибка обновления уведомления');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
      toast.success('Все уведомления отмечены как прочитанные');
    } catch (error) {
      console.error('Ошибка отметки всех как прочитанных:', error);
      toast.error('Ошибка обновления уведомлений');
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationsAPI.delete(notificationId);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      toast.success('Уведомление удалено');
    } catch (error) {
      console.error('Ошибка удаления уведомления:', error);
      toast.error('Ошибка удаления уведомления');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'follow':
        return <User size={20} />;
      case 'like':
        return <Heart size={20} />;
      case 'mention':
        return <Hash size={20} />;
      case 'comment':
        return <MessageCircle size={20} />;
      default:
        return <Bell size={20} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'follow':
        return '#34c759';
      case 'like':
        return '#ff3b30';
      case 'mention':
        return '#007aff';
      case 'comment':
        return '#ff9500';
      default:
        return '#8e8e93';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Только что';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} ч. назад`;
    } else if (diffInHours < 168) { // 7 дней
      return `${Math.floor(diffInHours / 24)} дн. назад`;
    } else {
      return date.toLocaleDateString('ru-RU');
    }
  };

  if (loading && notifications.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <div className="container">
      {/* Заголовок и фильтры */}
      <div className="card mb-2">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h3 className="d-flex align-items-center gap-2">
            <Bell size={24} />
            Уведомления
            {unreadCount > 0 && (
              <span className="badge" style={{
                backgroundColor: 'var(--tg-theme-destructive-text-color)',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {unreadCount}
              </span>
            )}
          </h3>
          
          {unreadCount > 0 && (
            <button
              className="btn btn-secondary"
              onClick={handleMarkAllAsRead}
            >
              <Check size={16} />
              Прочитать все
            </button>
          )}
        </div>

        <div className="d-flex gap-2">
          <button
            className={`btn ${!showUnreadOnly ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowUnreadOnly(false)}
            style={{ flex: 1 }}
          >
            Все
          </button>
          <button
            className={`btn ${showUnreadOnly ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowUnreadOnly(true)}
            style={{ flex: 1 }}
          >
            Непрочитанные
          </button>
        </div>
      </div>

      {/* Список уведомлений */}
      {notifications.length > 0 ? (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`card notification-item ${!notification.is_read ? 'unread' : ''}`}
              style={{
                borderLeft: !notification.is_read ? '4px solid var(--tg-theme-button-color)' : 'none',
                backgroundColor: !notification.is_read ? 'var(--tg-theme-secondary-bg-color)' : 'var(--tg-theme-bg-color)'
              }}
            >
              <div className="d-flex align-items-start gap-3">
                {/* Иконка */}
                <div
                  className="notification-icon"
                  style={{
                    color: getNotificationColor(notification.type),
                    flexShrink: 0
                  }}
                >
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Содержимое */}
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <p className="notification-message" style={{ margin: 0 }}>
                      {notification.message}
                    </p>
                    
                    <div className="notification-actions d-flex gap-1">
                      {!notification.is_read && (
                        <button
                          className="btn-icon"
                          onClick={() => handleMarkAsRead(notification.id)}
                          title="Отметить как прочитанное"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        className="btn-icon"
                        onClick={() => handleDelete(notification.id)}
                        title="Удалить"
                        style={{ color: 'var(--tg-theme-destructive-text-color)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Информация об отправителе */}
                  {notification.from_user && (
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <img
                        src={notification.from_user.photo_url || '/default-avatar.png'}
                        alt={notification.from_user.username}
                        className="avatar-sm"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNmMWYxZjEiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI2IiB5PSI2Ij4KPHBhdGggZD0iTTIwIDIxdi0yYTQgNCAwIDAgMC00LTRIOGE0IDQgMCAwIDAtNCA0djIiIHN0cm9rZT0iIzk5OTk5OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSI3IiByPSI0IiBzdHJva2U9IiM5OTk5OTkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo8L3N2Zz4K';
                        }}
                      />
                      <span className="text-small text-muted">
                        {notification.from_user.first_name || notification.from_user.username}
                      </span>
                    </div>
                  )}

                  {/* Информация о посте */}
                  {notification.post && (
                    <div className="notification-post-preview" style={{
                      backgroundColor: 'var(--tg-theme-bg-color)',
                      padding: '8px',
                      borderRadius: '6px',
                      marginTop: '8px'
                    }}>
                      <p className="text-small" style={{ margin: 0, opacity: 0.8 }}>
                        {notification.post.content.length > 100 
                          ? `${notification.post.content.substring(0, 100)}...`
                          : notification.post.content
                        }
                      </p>
                    </div>
                  )}

                  {/* Время */}
                  <div className="text-small text-muted">
                    {formatDate(notification.created_at)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center mt-3">
          <Bell size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p className="text-muted">
            {showUnreadOnly ? 'Нет непрочитанных уведомлений' : 'Уведомлений пока нет'}
          </p>
          <p className="text-small text-muted">
            Здесь будут появляться уведомления о лайках, подписках и упоминаниях
          </p>
        </div>
      )}
    </div>
  );
};
