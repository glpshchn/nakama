import React, { useState, useEffect } from 'react';
import { Plus, Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import { postsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { PostCard } from './PostCard';
import { CreatePostModal } from './CreatePostModal';
import { LoadingScreen } from './LoadingScreen';
import toast from 'react-hot-toast';

export const Feed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState('all');

  const themes = [
    { id: 'all', label: 'Все', color: '#808080' },
    { id: 'furry', label: 'Фурри', color: '#ff8c00' },
    { id: 'anime', label: 'Аниме', color: '#4169e1' },
    { id: 'other', label: 'Другое', color: '#808080' },
  ];

  useEffect(() => {
    loadPosts();
  }, [selectedTheme]);

  const loadPosts = async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const params = {
        page: pageNum,
        limit: 20,
        ...(selectedTheme !== 'all' && { theme: selectedTheme })
      };

      const response = await postsAPI.getFeed(params);
      const newPosts = response.data.posts;

      if (append) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }

      setHasMore(response.data.pagination.has_more);
      setPage(pageNum);
    } catch (error) {
      console.error('Ошибка загрузки постов:', error);
      toast.error('Ошибка загрузки ленты');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadPosts(page + 1, true);
    }
  };

  const handleLike = async (postId) => {
    try {
      await postsAPI.like(postId);
      
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            is_liked: !post.is_liked,
            likes_count: post.is_liked ? post.likes_count - 1 : post.likes_count + 1
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Ошибка лайка:', error);
      toast.error('Ошибка при лайке поста');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот пост?')) {
      return;
    }

    try {
      await postsAPI.delete(postId);
      setPosts(prev => prev.filter(post => post.id !== postId));
      toast.success('Пост удален');
    } catch (error) {
      console.error('Ошибка удаления поста:', error);
      toast.error('Ошибка удаления поста');
    }
  };

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
    setShowCreateModal(false);
    toast.success('Пост создан!');
  };

  const handleCommentAdded = (postId) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments_count: post.comments_count + 1
        };
      }
      return post;
    }));
  };

  if (loading && posts.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <div className="container">
      {/* Фильтры по темам */}
      <div className="card mb-2">
        <div className="d-flex gap-1" style={{ overflowX: 'auto' }}>
          {themes.map(theme => (
            <button
              key={theme.id}
              className={`btn ${selectedTheme === theme.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedTheme(theme.id)}
              style={{ 
                minWidth: 'auto',
                whiteSpace: 'nowrap',
                backgroundColor: selectedTheme === theme.id ? theme.color : undefined
              }}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </div>

      {/* Кнопка создания поста */}
      {user && (
        <div className="card mb-2">
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ width: '100%' }}
          >
            <Plus size={20} />
            Создать пост
          </button>
        </div>
      )}

      {/* Лента постов */}
      <div className="posts-feed">
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            onLike={handleLike}
            onDelete={handleDeletePost}
            canDelete={user && (user.id === post.user_id || ['moderator', 'admin'].includes(user.role))}
            onCommentAdded={() => handleCommentAdded(post.id)}
          />
        ))}
      </div>

      {/* Кнопка "Загрузить еще" */}
      {hasMore && (
        <div className="text-center mt-3">
          <button
            className="btn btn-secondary"
            onClick={handleLoadMore}
            disabled={loading}
          >
            {loading ? 'Загрузка...' : 'Загрузить еще'}
          </button>
        </div>
      )}

      {/* Модальное окно создания поста */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
};
