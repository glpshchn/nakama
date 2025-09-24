import React, { useState } from 'react';
import { Heart, MessageCircle, MoreHorizontal, User, Calendar, Tag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Comments } from './Comments';

export const PostCard = ({ post, onLike, onDelete, canDelete, onCommentAdded }) => {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const getThemeColor = (theme) => {
    switch (theme) {
      case 'furry': return '#ff8c00';
      case 'anime': return '#4169e1';
      case 'other': return '#808080';
      default: return '#808080';
    }
  };

  const getThemeLabel = (theme) => {
    switch (theme) {
      case 'furry': return 'Фурри';
      case 'anime': return 'Аниме';
      case 'other': return 'Другое';
      default: return 'Другое';
    }
  };

  const formatDate = (dateString) => {
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true, 
      locale: ru 
    });
  };

  const handleLike = () => {
    if (onLike) {
      onLike(post.id);
    }
  };

  const handleDelete = () => {
    if (onDelete && window.confirm('Вы уверены, что хотите удалить этот пост?')) {
      onDelete(post.id);
    }
    setShowMenu(false);
  };

  const handleUserClick = () => {
    // В реальном приложении здесь будет переход к профилю пользователя
    console.log('Переход к профилю пользователя:', post.user_id);
  };

  return (
    <div className="card post-card">
      {/* Заголовок поста */}
      <div className="card-header">
        <div className="d-flex align-items-center gap-2">
          <img
            src={post.photo_url || '/default-avatar.png'}
            alt={post.username}
            className="avatar"
            onError={(e) => {
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNmMWYxZjEiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTIwIDIxdi0yYTQgNCAwIDAgMC00LTRIOGE0IDQgMCAwIDAtNCA0djIiIHN0cm9rZT0iIzk5OTk5OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSI3IiByPSI0IiBzdHJva2U9IiM5OTk5OTkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo8L3N2Zz4K';
            }}
          />
          <div className="flex-grow-1">
            <button 
              className="btn-link"
              onClick={handleUserClick}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--tg-theme-text-color)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <strong>{post.first_name || post.username || 'Пользователь'}</strong>
            </button>
            <div className="text-small text-muted">
              {formatDate(post.created_at)}
            </div>
          </div>
        </div>

        {/* Меню действий */}
        {canDelete && (
          <div className="post-menu">
            <button
              className="btn-icon"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreHorizontal size={20} />
            </button>
            
            {showMenu && (
              <div className="dropdown-menu" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 1000 }}>
                <button className="dropdown-item btn-danger" onClick={handleDelete}>
                  Удалить пост
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Тема поста */}
      <div className="mb-2">
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
        {post.is_sfw && (
          <span className="tag" style={{ backgroundColor: '#34c759', color: 'white' }}>
            SFW
          </span>
        )}
      </div>

      {/* Содержимое поста */}
      <div className="post-content mb-3">
        <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {post.content}
        </p>
      </div>

      {/* Теги */}
      {post.tags && post.tags.length > 0 && (
        <div className="mb-3">
          <div className="d-flex align-items-center gap-1 mb-1">
            <Tag size={14} />
            <span className="text-small text-muted">Теги:</span>
          </div>
          <div>
            {post.tags.map((tag, index) => (
              <span key={index} className="tag">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Упомянутые пользователи */}
      {post.mentioned_users && post.mentioned_users.length > 0 && (
        <div className="mb-3">
          <div className="d-flex align-items-center gap-1 mb-1">
            <User size={14} />
            <span className="text-small text-muted">Упомянуты:</span>
          </div>
          <div>
            {post.mentioned_users.map((username, index) => (
              <span key={index} className="tag">
                @{username}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Изображения */}
      {post.images && post.images.length > 0 && (
        <div className="post-images mb-3">
          {post.images.map((image, index) => (
            <img
              key={index}
              src={image.path}
              alt={`Изображение ${index + 1}`}
              style={{
                width: '100%',
                maxHeight: '300px',
                objectFit: 'cover',
                borderRadius: '8px',
                marginBottom: '8px'
              }}
            />
          ))}
        </div>
      )}

      {/* Действия */}
      <div className="post-actions d-flex justify-content-between align-items-center">
        <div className="d-flex gap-3">
          <button
            className={`btn-icon ${post.is_liked ? 'liked' : ''}`}
            onClick={handleLike}
            style={{ color: post.is_liked ? '#ff3b30' : 'var(--tg-theme-hint-color)' }}
          >
            <Heart size={20} fill={post.is_liked ? 'currentColor' : 'none'} />
            <span className="text-small">{post.likes_count}</span>
          </button>

          <button
            className="btn-icon"
            onClick={() => setShowComments(!showComments)}
            style={{ color: 'var(--tg-theme-hint-color)' }}
          >
            <MessageCircle size={20} />
            <span className="text-small">{post.comments_count}</span>
          </button>
        </div>
      </div>

      {/* Комментарии */}
      {showComments && (
        <Comments 
          postId={post.id} 
          onCommentAdded={() => {
            if (onCommentAdded) {
              onCommentAdded();
            }
          }}
        />
      )}
    </div>
  );
};
