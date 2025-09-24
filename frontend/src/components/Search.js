import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, Download, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { searchAPI } from '../services/api';
import toast from 'react-hot-toast';

export const Search = () => {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('e621');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const searchTimeoutRef = useRef(null);

  const sources = [
    { id: 'e621', label: 'E621 (Фурри)', color: '#ff8c00' },
    { id: 'danbooru', label: 'Danbooru (Аниме)', color: '#4169e1' },
    { id: 'gelbooru', label: 'Gelbooru (Аниме)', color: '#6a5acd' },
  ];


  useEffect(() => {
    if (query.length >= 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        fetchSuggestions();
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query, source]);

  const fetchSuggestions = async () => {
    try {
      const response = await searchAPI.getSuggestions({ q: query, source });
      setSuggestions(response.data);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Ошибка получения подсказок:', error);
    }
  };

  const handleSearch = async (searchQuery = query, pageNum = 1) => {
    if (!searchQuery.trim()) {
      toast.error('Введите поисковый запрос');
      return;
    }

    setLoading(true);
    try {
      const response = await searchAPI.search({
        q: searchQuery,
        source,
        page: pageNum
      });

      if (pageNum === 1) {
        setResults(response.data.results);
      } else {
        setResults(prev => [...prev, ...response.data.results]);
      }

      setHasMore(response.data.results.length === 20);
      setPage(pageNum);
      setShowSuggestions(false);
    } catch (error) {
      console.error('Ошибка поиска:', error);
      toast.error('Ошибка поиска');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      handleSearch(query, page + 1);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.name);
    setShowSuggestions(false);
    handleSearch(suggestion.name);
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
  };

  const handleDownload = async (image) => {
    try {
      await searchAPI.sendToChat({
        imageUrl: image.url,
        caption: `Изображение из ${sources.find(s => s.id === source)?.label || source}`
      });
      toast.success('Изображение отправлено в чат!');
    } catch (error) {
      console.error('Ошибка отправки:', error);
      toast.error('Ошибка отправки изображения');
    }
  };

  const navigateImage = (direction) => {
    if (!selectedImage) return;
    
    const currentIndex = results.findIndex(img => img.id === selectedImage.id);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
    } else {
      newIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
    }
    
    setSelectedImage(results[newIndex]);
  };

  const getRatingColor = (rating) => {
    switch (rating) {
      case 's': return '#34c759'; // safe
      case 'q': return '#ff9500'; // questionable
      case 'e': return '#ff3b30'; // explicit
      default: return '#999999';
    }
  };

  const getRatingLabel = (rating) => {
    switch (rating) {
      case 's': return 'SFW';
      case 'q': return 'Questionable';
      case 'e': return 'NSFW';
      default: return rating;
    }
  };

  return (
    <div className="container">
      {/* Поисковая строка */}
      <div className="card mb-2">
        <div className="form-group">
          <div className="d-flex gap-2">
            <div className="flex-grow-1" style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Введите теги для поиска..."
                onFocus={() => setShowSuggestions(suggestions.length > 0)}
              />
              
              {/* Подсказки */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions-dropdown" style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--tg-theme-bg-color)',
                  border: '1px solid var(--tg-theme-hint-color)',
                  borderRadius: '8px',
                  maxHeight: '200px',
                  overflow: 'auto',
                  zIndex: 1000,
                  marginTop: '4px'
                }}>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="suggestion-item"
                      onClick={() => handleSuggestionClick(suggestion)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        background: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderBottom: index < suggestions.length - 1 ? '1px solid var(--tg-theme-hint-color)' : 'none'
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <span>{suggestion.name}</span>
                        <span className="text-small text-muted">
                          {suggestion.count} постов
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button
              className="btn btn-primary"
              onClick={() => handleSearch()}
              disabled={loading}
            >
              <SearchIcon size={20} />
            </button>
          </div>
        </div>

        {/* Выбор источника */}
        <div className="d-flex gap-2">
          {sources.map(src => (
            <button
              key={src.id}
              className={`btn ${source === src.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSource(src.id)}
              style={{ 
                backgroundColor: source === src.id ? src.color : undefined,
                flex: 1
              }}
            >
              {src.label}
            </button>
          ))}
        </div>
      </div>

      {/* Результаты поиска */}
      {results.length > 0 && (
        <div className="search-results">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h3>Результаты поиска</h3>
            <span className="text-muted text-small">
              {results.length} изображений
            </span>
          </div>

          <div className="image-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '8px'
          }}>
            {results.map((image) => (
              <div
                key={image.id}
                className="image-card"
                onClick={() => handleImageClick(image)}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  backgroundColor: 'var(--tg-theme-secondary-bg-color)'
                }}
              >
                <img
                  src={image.preview || image.sample}
                  alt={`Image ${image.id}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                
                {/* Рейтинг */}
                <div
                  className="image-rating"
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    backgroundColor: getRatingColor(image.rating),
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}
                >
                  {getRatingLabel(image.rating)}
                </div>

                {/* Счетчик */}
                <div
                  className="image-score"
                  style={{
                    position: 'absolute',
                    bottom: '4px',
                    left: '4px',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px'
                  }}
                >
                  {image.score}
                </div>
              </div>
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
        </div>
      )}

      {/* Модальное окно просмотра изображения */}
      {selectedImage && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="image-viewer" style={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {/* Кнопка закрытия */}
            <button
              className="btn-icon"
              onClick={() => setSelectedImage(null)}
              style={{
                position: 'absolute',
                top: '-50px',
                right: '0',
                color: 'white',
                zIndex: 2001
              }}
            >
              <X size={24} />
            </button>

            {/* Навигация */}
            <button
              className="btn-icon"
              onClick={() => navigateImage('prev')}
              style={{
                position: 'absolute',
                left: '-50px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'white',
                zIndex: 2001
              }}
            >
              <ChevronLeft size={24} />
            </button>

            <button
              className="btn-icon"
              onClick={() => navigateImage('next')}
              style={{
                position: 'absolute',
                right: '-50px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'white',
                zIndex: 2001
              }}
            >
              <ChevronRight size={24} />
            </button>

            {/* Изображение */}
            <img
              src={selectedImage.url || selectedImage.sample}
              alt={`Image ${selectedImage.id}`}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />

            {/* Информация */}
            <div className="image-info" style={{
              marginTop: '16px',
              textAlign: 'center',
              color: 'white'
            }}>
              <div className="d-flex gap-2 align-items-center justify-content-center mb-2">
                <span
                  className="tag"
                  style={{
                    backgroundColor: getRatingColor(selectedImage.rating),
                    color: 'white'
                  }}
                >
                  {getRatingLabel(selectedImage.rating)}
                </span>
                <span className="text-small">
                  Счет: {selectedImage.score}
                </span>
                <span className="text-small">
                  {selectedImage.width}×{selectedImage.height}
                </span>
              </div>

              {/* Теги */}
              {selectedImage.tags && selectedImage.tags.length > 0 && (
                <div className="mb-2">
                  <div className="d-flex flex-wrap gap-1 justify-content-center">
                    {selectedImage.tags.slice(0, 10).map((tag, index) => (
                      <span key={index} className="tag text-small">
                        {tag}
                      </span>
                    ))}
                    {selectedImage.tags.length > 10 && (
                      <span className="text-small text-muted">
                        +{selectedImage.tags.length - 10} еще
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Кнопка скачивания */}
              <button
                className="btn btn-primary"
                onClick={() => handleDownload(selectedImage)}
                style={{ marginTop: '8px' }}
              >
                <Download size={16} />
                Отправить в чат
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Состояние загрузки */}
      {loading && results.length === 0 && (
        <div className="loading">
          <div className="spinner"></div>
          <span>Поиск изображений...</span>
        </div>
      )}

      {/* Пустое состояние */}
      {!loading && results.length === 0 && query && (
        <div className="text-center mt-3">
          <p className="text-muted">Ничего не найдено</p>
          <p className="text-small text-muted">
            Попробуйте изменить поисковый запрос или источник
          </p>
        </div>
      )}
    </div>
  );
};
