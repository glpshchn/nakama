import React, { useState } from 'react';
import { X, Image, Hash, User, AlertTriangle } from 'lucide-react';
import { postsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const CreatePostModal = ({ onClose, onPostCreated }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    content: '',
    theme: 'other',
    is_nsfw: false,
    is_sfw: true,
    tags: [],
    mentioned_users: []
  });
  const [tagInput, setTagInput] = useState('');
  const [mentionInput, setMentionInput] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const themes = [
    { id: 'furry', label: 'Фурри', color: '#ff8c00' },
    { id: 'anime', label: 'Аниме', color: '#4169e1' },
    { id: 'other', label: 'Другое', color: '#808080' },
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAddMention = () => {
    const username = mentionInput.replace('@', '').trim();
    if (username && !formData.mentioned_users.includes(username)) {
      setFormData(prev => ({
        ...prev,
        mentioned_users: [...prev.mentioned_users, username]
      }));
      setMentionInput('');
    }
  };

  const handleRemoveMention = (mentionToRemove) => {
    setFormData(prev => ({
      ...prev,
      mentioned_users: prev.mentioned_users.filter(mention => mention !== mentionToRemove)
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      toast.error('Максимум 5 изображений');
      return;
    }

    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Файл слишком большой (максимум 10MB)');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setImages(prev => [...prev, {
          file,
          preview: e.target.result
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.content.trim()) {
      toast.error('Введите текст поста');
      return;
    }

    setLoading(true);
    
    try {
      const submitData = new FormData();
      submitData.append('content', formData.content);
      submitData.append('theme', formData.theme);
      submitData.append('is_nsfw', formData.is_nsfw);
      submitData.append('is_sfw', formData.is_sfw);
      submitData.append('tags', JSON.stringify(formData.tags));
      submitData.append('mentioned_users', JSON.stringify(formData.mentioned_users));

      // Добавляем изображения
      images.forEach(({ file }) => {
        submitData.append('images', file);
      });

      const response = await postsAPI.create(submitData);
      
      if (onPostCreated) {
        // Создаем объект поста для обновления UI
        // Используем данные пользователя из контекста
        
        const newPost = {
          id: response.data.post_id,
          content: formData.content,
          theme: formData.theme,
          is_nsfw: formData.is_nsfw,
          is_sfw: formData.is_sfw,
          tags: formData.tags,
          mentioned_users: formData.mentioned_users,
          images: images.map(({ preview }) => ({ path: preview })),
          likes_count: 0,
          comments_count: 0,
          is_liked: false,
          created_at: new Date().toISOString(),
          user_id: user?.id || 1,
          username: user?.username || 'Вы',
          first_name: user?.first_name || 'Вы',
          last_name: user?.last_name || '',
          photo_url: user?.photo_url || null
        };
        onPostCreated(newPost);
      }
      
      toast.success('Пост создан!');
    } catch (error) {
      console.error('Ошибка создания поста:', error);
      toast.error('Ошибка создания поста');
    } finally {
      setLoading(false);
    }
  };

  return (
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
        maxWidth: '500px',
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
          <h3>Создать пост</h3>
          <button
            className="btn-icon"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '16px' }}>
          {/* Выбор темы */}
          <div className="form-group">
            <label className="form-label">Тема</label>
            <div className="d-flex gap-2">
              {themes.map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  className={`btn ${formData.theme === theme.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFormData(prev => ({ ...prev, theme: theme.id }))}
                  style={{ 
                    backgroundColor: formData.theme === theme.id ? theme.color : undefined,
                    flex: 1
                  }}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>

          {/* Содержимое поста */}
          <div className="form-group">
            <label className="form-label">Содержимое</label>
            <textarea
              className="form-input form-textarea"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              placeholder="Что у вас нового?"
              maxLength={2000}
              required
            />
            <div className="text-small text-muted text-right">
              {formData.content.length}/2000
            </div>
          </div>

          {/* Теги */}
          <div className="form-group">
            <label className="form-label">Теги</label>
            <div className="d-flex gap-2 mb-2">
              <input
                type="text"
                className="form-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Добавить тег"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddTag}
              >
                <Hash size={16} />
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="d-flex flex-wrap gap-1">
                {formData.tags.map(tag => (
                  <span key={tag} className="tag">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'inherit',
                        marginLeft: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Упоминания */}
          <div className="form-group">
            <label className="form-label">Упоминания</label>
            <div className="d-flex gap-2 mb-2">
              <input
                type="text"
                className="form-input"
                value={mentionInput}
                onChange={(e) => setMentionInput(e.target.value)}
                placeholder="@username"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMention())}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddMention}
              >
                <User size={16} />
              </button>
            </div>
            {formData.mentioned_users.length > 0 && (
              <div className="d-flex flex-wrap gap-1">
                {formData.mentioned_users.map(mention => (
                  <span key={mention} className="tag">
                    @{mention}
                    <button
                      type="button"
                      onClick={() => handleRemoveMention(mention)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'inherit',
                        marginLeft: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Изображения */}
          <div className="form-group">
            <label className="form-label">Изображения (максимум 5)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="form-input"
            />
            {images.length > 0 && (
              <div className="mt-2">
                {images.map((image, index) => (
                  <div key={index} style={{ position: 'relative', display: 'inline-block', margin: '4px' }}>
                    <img
                      src={image.preview}
                      alt={`Preview ${index}`}
                      style={{
                        width: '80px',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: '8px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: 'var(--tg-theme-destructive-text-color)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Настройки */}
          <div className="form-group">
            <div className="d-flex align-items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="is_sfw"
                name="is_sfw"
                checked={formData.is_sfw}
                onChange={handleInputChange}
              />
              <label htmlFor="is_sfw" className="form-label" style={{ margin: 0 }}>
                Безопасный для работы (SFW)
              </label>
            </div>
            <div className="d-flex align-items-center gap-2">
              <input
                type="checkbox"
                id="is_nsfw"
                name="is_nsfw"
                checked={formData.is_nsfw}
                onChange={handleInputChange}
              />
              <label htmlFor="is_nsfw" className="form-label" style={{ margin: 0 }}>
                <AlertTriangle size={16} style={{ marginRight: '4px' }} />
                Небезопасный контент (NSFW)
              </label>
            </div>
          </div>

          {/* Кнопки */}
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !formData.content.trim()}
              style={{ flex: 1 }}
            >
              {loading ? 'Создание...' : 'Опубликовать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
