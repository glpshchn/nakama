import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Токен истек или недействителен
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// API методы для авторизации
export const authAPI = {
  login: (telegramData) => api.post('/auth/telegram', { initData: telegramData }),
  getMe: () => api.get('/auth/me'),
  updateSettings: (settings) => api.put('/auth/settings', settings),
};

// API методы для постов
export const postsAPI = {
  create: (postData) => api.post('/posts', postData),
  getFeed: (params) => api.get('/posts/feed', { params }),
  getById: (id) => api.get(`/posts/${id}`),
  like: (id) => api.post(`/posts/${id}/like`),
  delete: (id) => api.delete(`/posts/${id}`),
  getComments: (id, params) => api.get(`/posts/${id}/comments`, { params }),
  addComment: (id, commentData) => api.post(`/posts/${id}/comments`, commentData),
  deleteComment: (commentId) => api.delete(`/posts/comments/${commentId}`),
};

// API методы для поиска
export const searchAPI = {
  search: (params) => api.get('/search', { params }),
  getSuggestions: (params) => api.get('/search/suggestions', { params }),
  sendToChat: (data) => api.post('/search/send-to-chat', data),
};

// API методы для пользователей
export const usersAPI = {
  getProfile: (id) => api.get(`/users/${id}`),
  getPosts: (id, params) => api.get(`/users/${id}/posts`, { params }),
  follow: (id) => api.post(`/users/${id}/follow`),
  getFollowers: (id, params) => api.get(`/users/${id}/followers`, { params }),
  getFollowing: (id, params) => api.get(`/users/${id}/following`, { params }),
  search: (query, params) => api.get(`/users/search/${query}`, { params }),
};

// API методы для уведомлений
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// API методы для админки
export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserRole: (userId, role) => api.put(`/admin/users/${userId}/role`, { role }),
  banUser: (userId, isBanned) => api.put(`/admin/users/${userId}/ban`, { is_banned: isBanned }),
  getPosts: (params) => api.get('/admin/posts', { params }),
  deletePost: (postId) => api.delete(`/admin/posts/${postId}`),
  getStats: () => api.get('/admin/stats'),
  getLogs: (params) => api.get('/admin/logs', { params })
};

// Утилиты для работы с файлами
export const uploadFile = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('images', file);

  return api.post('/posts', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });
};

export default api;
