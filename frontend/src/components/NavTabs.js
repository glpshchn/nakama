import React from 'react';
import { Home, Search, Bell, User, Shield } from 'lucide-react';

export const NavTabs = ({ activeTab, onTabChange, user }) => {
  const tabs = [
    { id: 'feed', label: 'Лента', icon: Home },
    { id: 'search', label: 'Поиск', icon: Search },
    { id: 'notifications', label: 'Уведомления', icon: Bell },
    { id: 'profile', label: 'Профиль', icon: User },
  ];

  // Добавляем админ-панель для модераторов и админов
  if (user && ['moderator', 'admin'].includes(user.role)) {
    tabs.push({ id: 'admin', label: 'Модерация', icon: Shield });
  }

  return (
    <nav className="nav-tabs">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`nav-tab ${activeTab === id ? 'active' : ''}`}
          onClick={() => onTabChange(id)}
        >
          <Icon size={20} />
          <span className="text-small">{label}</span>
        </button>
      ))}
    </nav>
  );
};
