import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, MoreHorizontal, Trash2 } from 'lucide-react';
import { postsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const Comments = ({ postId, onCommentAdded }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (postId) {
      loadComments();
    }
  }, [postId]);

  const loadComments = async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const response = await postsAPI.getComments(postId, {
        page: pageNum,
        limit: 20
      });

      const newComments = response.data.comments;

      if (append) {
        setComments(prev => [...prev, ...newComments]);
      } else {
        setComments(newComments);
      }

      setHasMore(response.data.pagination.has_more);
      setPage(pageNum);
    } catch (error) {
      console.error('Ошибка загрузки комментариев:', error);
      toast.error('Ошибка загрузки комментариев');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      toast.error('Введите текст комментария');
      return;
    }

    if (!user) {
      toast.error('Необходимо войти в систему');
      return;
    }

    try {
      setSubmitting(true);
      const response = await postsAPI.addComment(postId, {
        content: newComment.trim()
      });

      // Создаем объект нового комментария
      const comment = {
        id: response.data.comment_id,
        content: newComment.trim(),
        user_id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        photo_url: user.photo_url,
        created_at: new Date().toISOString(),
        is_deleted: false
      };

      setComments(prev => [comment, ...prev]);
      setNewComment('');
      
      if (onCommentAdded) {
        onCommentAdded();
      }

      toast.success('Комментарий добавлен');
    } catch (error) {
      console.error('Ошибка добавления комментария:', error);
      toast.error('Ошибка добавления комментария');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот комментарий?')) {
      return;
    }

    try {
      await postsAPI.deleteComment(commentId);
      
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      
      if (onCommentAdded) {
        onCommentAdded();
      }
      
      toast.success('Комментарий удален');
    } catch (error) {
      console.error('Ошибка удаления комментария:', error);
      toast.error('Ошибка удаления комментария');
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

  const canDelete = (comment) => {
    return user && (user.id === comment.user_id || ['moderator', 'admin'].includes(user.role));
  };

  return (
    <div className="post-comments mt-3 pt-3" style={{ borderTop: '1px solid var(--tg-theme-hint-color)' }}>
      {/* Форма добавления комментария */}
      {user && (
        <form onSubmit={handleSubmit} className="mb-3">
          <div className="d-flex gap-2 align-items-start">
            <img
              src={user.photo_url || '/default-avatar.png'}
              alt={user.username}
              className="avatar-sm"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNmMWYxZjEiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI2IiB5PSI2Ij4KPHBhdGggZD0iTTIwIDIxdi0yYTQgNCAwIDAgMC00LTRIOGE0IDQgMCAwIDAtNCA0djIiIHN0cm9rZT0iIzk5OTk5OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSI3IiByPSI0IiBzdHJva2U9IiM5OTk5OTkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo8L3N2Zz4K';
              }}
            />
            <div className="flex-grow-1">
              <textarea
                className="form-input"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Написать комментарий..."
                rows={2}
                maxLength={500}
                style={{ resize: 'vertical', minHeight: '60px' }}
              />
              <div className="d-flex justify-content-between align-items-center mt-1">
                <span className="text-small text-muted">
                  {newComment.length}/500
                </span>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submitting || !newComment.trim()}
                >
                  {submitting ? (
                    'Отправка...'
                  ) : (
                    <>
                      <Send size={14} />
                      Отправить
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Список комментариев */}
      {comments.length > 0 ? (
        <div className="comments-list">
          {comments.map((comment) => (
            <div key={comment.id} className="comment-item mb-3">
              <div className="d-flex gap-2">
                <img
                  src={comment.photo_url || '/default-avatar.png'}
                  alt={comment.username}
                  className="avatar-sm"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNmMWYxZjEiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI2IiB5PSI2Ij4KPHBhdGggZD0iTTIwIDIxdi0yYTQgNCAwIDAgMC00LTRIOGE0IDQgMCAwIDAtNCA0djIiIHN0cm9rZT0iIzk5OTk5OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSI3IiByPSI0IiBzdHJva2U9IiM5OTk5OTkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo8L3N2Zz4K';
                  }}
                />
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <div>
                      <strong className="text-small">
                        {comment.first_name || comment.username || 'Пользователь'}
                      </strong>
                      <span className="text-small text-muted ml-2">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    
                    {canDelete(comment) && (
                      <button
                        className="btn-icon"
                        onClick={() => handleDelete(comment.id)}
                        title="Удалить комментарий"
                        style={{ color: 'var(--tg-theme-destructive-text-color)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  
                  <p className="text-small mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Кнопка "Загрузить еще" */}
          {hasMore && (
            <div className="text-center mt-3">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => loadComments(page + 1, true)}
                disabled={loading}
              >
                {loading ? 'Загрузка...' : 'Загрузить еще комментарии'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-muted">
          <MessageCircle size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
          <p className="text-small mb-0">Пока нет комментариев</p>
          <p className="text-small">Станьте первым, кто оставит комментарий!</p>
        </div>
      )}
    </div>
  );
};
