import React, { useState, useEffect } from 'react';
import { Shield, Users, FileText, BarChart3, Ban, UserCheck, UserX, Trash2, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';

export const AdminPanel = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('');

  useEffect(() => {
    if (user && ['moderator', 'admin'].includes(user.role)) {
      loadData();
    }
  }, [user, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users' && user.role === 'admin') {
        const data = await adminAPI.getUsers();
        setUsers(data.users || []);
      } else if (activeTab === 'posts') {
        const data = await adminAPI.getPosts();
        setPosts(data.posts || []);
      } else if (activeTab === 'stats' && user.role === 'admin') {
        const data = await adminAPI.getStats();
        setStats(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await adminAPI.updateUserRole(userId, newRole);
      toast.success('Роль пользователя обновлена');
      loadData();
    } catch (error) {
      console.error('Ошибка изменения роли:', error);
      toast.error(error.response?.data?.error || 'Ошибка изменения роли');
    }
  };

  const handleBanUser = async (userId, isBanned) => {
    try {
      await adminAPI.banUser(userId, isBanned);
      toast.success(isBanned ? 'Пользователь заблокирован' : 'Пользователь разблокирован');
      loadData();
    } catch (error) {
      console.error('Ошибка блокировки:', error);
      toast.error(error.response?.data?.error || 'Ошибка блокировки пользователя');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот пост?')) {
      return;
    }

    try {
      await adminAPI.deletePost(postId);
      toast.success('Пост удален');
      loadData();
    } catch (error) {
      console.error('Ошибка удаления поста:', error);
      toast.error(error.response?.data?.error || 'Ошибка удаления поста');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#ff3b30';
      case 'moderator': return '#ff9500';
      case 'user': return '#34c759';
      default: return '#8e8e93';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'moderator': return 'Модератор';
      case 'user': return 'Пользователь';
      default: return role;
    }
  };

  const getThemeColor = (theme) => {
    switch (theme) {
      case 'furry': return '#ff8c00';
      case 'anime': return '#4169e1';
      case 'other': return '#808080';
      default: return '#8e8e93';
    }
  };

  const getThemeLabel = (theme) => {
    switch (theme) {
      case 'furry': return 'Фурри';
      case 'anime': return 'Аниме';
      case 'other': return 'Другое';
      default: return theme;
    }
  };

  if (!user || !['moderator', 'admin'].includes(user.role)) {
    return (
      <div className="container">
        <div className="card text-center">
          <Shield size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <h3>Доступ запрещен</h3>
          <p className="text-muted">
            У вас нет прав для доступа к панели модерации
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'users', label: 'Пользователи', icon: Users, adminOnly: true },
    { id: 'posts', label: 'Посты', icon: FileText, adminOnly: false },
    { id: 'stats', label: 'Статистика', icon: BarChart3, adminOnly: true }
  ];

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !selectedRole || user.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  const filteredPosts = posts.filter(post => {
    const matchesTheme = !selectedTheme || post.theme === selectedTheme;
    return matchesTheme;
  });

  return (
    <div className="container">
      <div className="card mb-2">
        <h2 className="d-flex align-items-center gap-2">
          <Shield size={24} />
          Панель модерации
        </h2>
        <p className="text-muted">
          Добро пожаловать, {getRoleLabel(user.role)}!
        </p>
      </div>

      {/* Вкладки */}
      <div className="card mb-2">
        <div className="d-flex gap-2">
          {tabs.map(tab => {
            if (tab.adminOnly && user.role !== 'admin') return null;
            
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab(tab.id)}
                style={{ flex: 1 }}
              >
                <Icon size={20} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Пользователи */}
      {activeTab === 'users' && user.role === 'admin' && (
        <div className="card">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Управление пользователями</h3>
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-input"
                placeholder="Поиск пользователей..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '200px' }}
              />
              <select
                className="form-input"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{ width: '150px' }}
              >
                <option value="">Все роли</option>
                <option value="user">Пользователь</option>
                <option value="moderator">Модератор</option>
                <option value="admin">Администратор</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <span>Загрузка...</span>
            </div>
          ) : (
            <div className="users-list">
              {filteredUsers.map(user => (
                <div key={user.id} className="user-item d-flex align-items-center justify-content-between p-3 mb-2" style={{ border: '1px solid var(--tg-theme-hint-color)', borderRadius: '8px' }}>
                  <div className="d-flex align-items-center gap-3">
                    <img
                      src={user.photo_url || '/default-avatar.png'}
                      alt={user.username}
                      className="avatar"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNmMWYxZjEiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTIwIDIxdi0yYTQgNCAwIDAgMC00LTRIOGE0IDQgMCAwIDAtNCA0djIiIHN0cm9rZT0iIzk5OTk5OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSI3IiByPSI0IiBzdHJva2U9IiM5OTk5OTkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo8L3N2Zz4K';
                      }}
                    />
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <strong>{user.first_name || user.username || 'Пользователь'}</strong>
                        <span 
                          className="tag"
                          style={{ backgroundColor: getRoleColor(user.role), color: 'white' }}
                        >
                          {getRoleLabel(user.role)}
                        </span>
                        {user.is_banned && (
                          <span className="tag" style={{ backgroundColor: '#ff3b30', color: 'white' }}>
                            Заблокирован
                          </span>
                        )}
                      </div>
                      <div className="text-small text-muted">
                        @{user.username} • {user.posts_count} постов • {user.followers_count} подписчиков
                      </div>
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    <select
                      className="form-input"
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      style={{ width: '120px' }}
                    >
                      <option value="user">Пользователь</option>
                      <option value="moderator">Модератор</option>
                      <option value="admin">Администратор</option>
                    </select>

                    <button
                      className={`btn ${user.is_banned ? 'btn-secondary' : 'btn-danger'}`}
                      onClick={() => handleBanUser(user.id, !user.is_banned)}
                      title={user.is_banned ? 'Разблокировать' : 'Заблокировать'}
                    >
                      {user.is_banned ? <UserCheck size={16} /> : <UserX size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Посты */}
      {activeTab === 'posts' && (
        <div className="card">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Модерация постов</h3>
            <select
              className="form-input"
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              style={{ width: '150px' }}
            >
              <option value="">Все темы</option>
              <option value="furry">Фурри</option>
              <option value="anime">Аниме</option>
              <option value="other">Другое</option>
            </select>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <span>Загрузка...</span>
            </div>
          ) : (
            <div className="posts-list">
              {filteredPosts.map(post => (
                <div key={post.id} className="post-item p-3 mb-3" style={{ border: '1px solid var(--tg-theme-hint-color)', borderRadius: '8px' }}>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <span 
                        className="tag"
                        style={{ backgroundColor: getThemeColor(post.theme), color: 'white' }}
                      >
                        {getThemeLabel(post.theme)}
                      </span>
                      {post.is_nsfw && (
                        <span className="tag" style={{ backgroundColor: '#ff3b30', color: 'white' }}>
                          NSFW
                        </span>
                      )}
                      <span className="text-small text-muted">
                        {post.first_name || post.username}
                      </span>
                    </div>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeletePost(post.id)}
                      title="Удалить пост"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <p className="mb-2" style={{ whiteSpace: 'pre-wrap' }}>
                    {post.content.length > 200 
                      ? `${post.content.substring(0, 200)}...`
                      : post.content
                    }
                  </p>

                  <div className="text-small text-muted">
                    {post.likes_count} лайков • {post.comments_count} комментариев • {new Date(post.created_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Статистика */}
      {activeTab === 'stats' && user.role === 'admin' && (
        <div className="card">
          <h3>Статистика системы</h3>
          
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <span>Загрузка...</span>
            </div>
          ) : stats ? (
            <div className="stats-grid">
              <div className="stat-card p-3 mb-3" style={{ border: '1px solid var(--tg-theme-hint-color)', borderRadius: '8px' }}>
                <h4>Общая статистика</h4>
                <div className="d-flex justify-content-between">
                  <span>Всего пользователей:</span>
                  <strong>{stats.total_users}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Всего постов:</span>
                  <strong>{stats.total_posts}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Всего комментариев:</span>
                  <strong>{stats.total_comments}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Заблокированных:</span>
                  <strong>{stats.banned_users}</strong>
                </div>
              </div>

              <div className="stat-card p-3 mb-3" style={{ border: '1px solid var(--tg-theme-hint-color)', borderRadius: '8px' }}>
                <h4>Распределение по ролям</h4>
                {stats.role_stats.map(stat => (
                  <div key={stat.role} className="d-flex justify-content-between">
                    <span>{getRoleLabel(stat.role)}:</span>
                    <strong>{stat.count}</strong>
                  </div>
                ))}
              </div>

              <div className="stat-card p-3 mb-3" style={{ border: '1px solid var(--tg-theme-hint-color)', borderRadius: '8px' }}>
                <h4>Посты по темам</h4>
                {stats.theme_stats.map(stat => (
                  <div key={stat.theme} className="d-flex justify-content-between">
                    <span>{getThemeLabel(stat.theme)}:</span>
                    <strong>{stat.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
