const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Получение профиля пользователя
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await pool.execute(
      'SELECT id, username, first_name, last_name, photo_url, created_at FROM users WHERE id = ? AND is_banned = FALSE',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = users[0];

    // Получаем статистику пользователя
    const [followersCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM follows WHERE following_id = ?',
      [id]
    );

    const [followingCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?',
      [id]
    );

    const [postsCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND is_deleted = FALSE',
      [id]
    );

    // Проверяем, подписан ли текущий пользователь
    let isFollowing = false;
    if (req.user) {
      const [follows] = await pool.execute(
        'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
        [req.user.id, id]
      );
      isFollowing = follows.length > 0;
    }

    res.json({
      ...user,
      followers_count: followersCount[0].count,
      following_count: followingCount[0].count,
      posts_count: postsCount[0].count,
      is_following: isFollowing
    });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение постов пользователя
router.get('/:id/posts', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, u.username, u.first_name, u.last_name, u.photo_url,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_deleted = FALSE) as comments_count,
             ${req.user ? '(SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked' : '0 as is_liked'}
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ? AND p.is_deleted = FALSE
    `;

    const queryParams = req.user ? [req.user.id, id] : [id];

    // Фильтр NSFW для пользователей с настройками
    if (req.user && req.user.nsfw_hidden) {
      query += ' AND p.is_nsfw = FALSE';
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), parseInt(offset));

    const [posts] = await pool.execute(query, queryParams);

    // Парсим JSON поля
    const formattedPosts = posts.map(post => ({
      ...post,
      tags: JSON.parse(post.tags || '[]'),
      mentioned_users: JSON.parse(post.mentioned_users || '[]'),
      images: JSON.parse(post.images || '[]'),
      is_liked: post.is_liked > 0
    }));

    res.json({
      posts: formattedPosts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        has_more: posts.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Ошибка получения постов пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Подписка/отписка от пользователя
router.post('/:id/follow', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = parseInt(id);

    if (targetUserId === req.user.id) {
      return res.status(400).json({ error: 'Нельзя подписаться на самого себя' });
    }

    // Проверяем, существует ли пользователь
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND is_banned = FALSE',
      [targetUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Проверяем, есть ли уже подписка
    const [follows] = await pool.execute(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [req.user.id, targetUserId]
    );

    if (follows.length > 0) {
      // Убираем подписку
      await pool.execute(
        'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
        [req.user.id, targetUserId]
      );

      res.json({ message: 'Подписка отменена', following: false });
    } else {
      // Добавляем подписку
      await pool.execute(
        'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
        [req.user.id, targetUserId]
      );

      // Создаем уведомление
      await pool.execute(
        'INSERT INTO notifications (user_id, type, from_user_id) VALUES (?, ?, ?)',
        [targetUserId, 'follow', req.user.id]
      );

      res.json({ message: 'Подписка добавлена', following: true });
    }
  } catch (error) {
    console.error('Ошибка подписки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение подписчиков пользователя
router.get('/:id/followers', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [followers] = await pool.execute(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.photo_url, f.created_at as followed_at
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = ? AND u.is_banned = FALSE
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [id, parseInt(limit), parseInt(offset)]
    );

    res.json({
      followers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        has_more: followers.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Ошибка получения подписчиков:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение подписок пользователя
router.get('/:id/following', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [following] = await pool.execute(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.photo_url, f.created_at as followed_at
       FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = ? AND u.is_banned = FALSE
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [id, parseInt(limit), parseInt(offset)]
    );

    res.json({
      following,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        has_more: following.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Ошибка получения подписок:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Поиск пользователей
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [users] = await pool.execute(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.photo_url,
              (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
              (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND is_deleted = FALSE) as posts_count
       FROM users u
       WHERE (u.username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?) 
       AND u.is_banned = FALSE
       ORDER BY u.username
       LIMIT ? OFFSET ?`,
      [`%${query}%`, `%${query}%`, `%${query}%`, parseInt(limit), parseInt(offset)]
    );

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        has_more: users.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Ошибка поиска пользователей:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
