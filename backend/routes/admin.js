const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Все маршруты требуют авторизации
router.use(authenticateToken);

// Получение списка всех пользователей (только админы)
router.get('/users', requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', role = '', banned = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.id, u.telegram_id, u.username, u.first_name, u.last_name, u.role, 
             u.is_banned, u.created_at,
             (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND is_deleted = FALSE) as posts_count,
             (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
             (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count
      FROM users u
      WHERE 1=1
    `;

    const queryParams = [];

    // Поиск по имени или username
    if (search) {
      query += ' AND (u.username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Фильтр по роли
    if (role && ['user', 'moderator', 'admin'].includes(role)) {
      query += ' AND u.role = ?';
      queryParams.push(role);
    }

    // Фильтр по статусу бана
    if (banned === 'true') {
      query += ' AND u.is_banned = TRUE';
    } else if (banned === 'false') {
      query += ' AND u.is_banned = FALSE';
    }

    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), parseInt(offset));

    const [users] = await pool.execute(query, queryParams);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        has_more: users.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Ошибка получения списка пользователей:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Изменение роли пользователя (только админы)
router.put('/users/:id/role', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Недопустимая роль' });
    }

    // Нельзя изменить роль самому себе
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Нельзя изменить роль самому себе' });
    }

    const [result] = await pool.execute(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ message: 'Роль пользователя обновлена' });
  } catch (error) {
    console.error('Ошибка изменения роли:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Бан/разбан пользователя (модераторы и админы)
router.put('/users/:id/ban', requireRole(['moderator', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_banned, reason } = req.body;

    // Нельзя забанить самого себя
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Нельзя забанить самого себя' });
    }

    // Модераторы не могут банить админов
    if (req.user.role === 'moderator') {
      const [targetUser] = await pool.execute(
        'SELECT role FROM users WHERE id = ?',
        [id]
      );

      if (targetUser.length > 0 && targetUser[0].role === 'admin') {
        return res.status(403).json({ error: 'Модераторы не могут банить администраторов' });
      }
    }

    const [result] = await pool.execute(
      'UPDATE users SET is_banned = ? WHERE id = ?',
      [is_banned, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Создаем уведомление о бане/разбане
    if (is_banned) {
      await pool.execute(
        'INSERT INTO notifications (user_id, type, from_user_id) VALUES (?, ?, ?)',
        [id, 'ban', req.user.id]
      );
    }

    res.json({ 
      message: is_banned ? 'Пользователь заблокирован' : 'Пользователь разблокирован' 
    });
  } catch (error) {
    console.error('Ошибка бана пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение списка постов для модерации (модераторы и админы)
router.get('/posts', requireRole(['moderator', 'admin']), async (req, res) => {
  try {
    const { page = 1, limit = 50, theme = '', nsfw = '', reported = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, u.username, u.first_name, u.last_name, u.role as user_role,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_deleted = FALSE) as comments_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.is_deleted = FALSE
    `;

    const queryParams = [];

    // Фильтр по теме
    if (theme && ['furry', 'anime', 'other'].includes(theme)) {
      query += ' AND p.theme = ?';
      queryParams.push(theme);
    }

    // Фильтр по NSFW
    if (nsfw === 'true') {
      query += ' AND p.is_nsfw = TRUE';
    } else if (nsfw === 'false') {
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
      images: JSON.parse(post.images || '[]')
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
    console.error('Ошибка получения постов для модерации:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удаление поста (модераторы и админы)
router.delete('/posts/:id', requireRole(['moderator', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const [posts] = await pool.execute(
      'SELECT user_id FROM posts WHERE id = ? AND is_deleted = FALSE',
      [id]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Пост не найден' });
    }

    // Помечаем пост как удаленный
    await pool.execute(
      'UPDATE posts SET is_deleted = TRUE WHERE id = ?',
      [id]
    );

    // Создаем уведомление для автора поста
    await pool.execute(
      'INSERT INTO notifications (user_id, type, from_user_id, post_id) VALUES (?, ?, ?, ?)',
      [posts[0].user_id, 'post_deleted', req.user.id, id]
    );

    res.json({ message: 'Пост удален модератором' });
  } catch (error) {
    console.error('Ошибка удаления поста модератором:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение статистики (только админы)
router.get('/stats', requireRole(['admin']), async (req, res) => {
  try {
    // Общая статистика
    const [totalUsers] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const [totalPosts] = await pool.execute('SELECT COUNT(*) as count FROM posts WHERE is_deleted = FALSE');
    const [totalComments] = await pool.execute('SELECT COUNT(*) as count FROM comments WHERE is_deleted = FALSE');
    const [bannedUsers] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE is_banned = TRUE');

    // Статистика по ролям
    const [roleStats] = await pool.execute(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `);

    // Статистика по темам постов
    const [themeStats] = await pool.execute(`
      SELECT theme, COUNT(*) as count 
      FROM posts 
      WHERE is_deleted = FALSE 
      GROUP BY theme
    `);

    // Активность за последние 7 дней
    const [weeklyActivity] = await pool.execute(`
      SELECT DATE(created_at) as date, COUNT(*) as posts_count
      FROM posts 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND is_deleted = FALSE
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json({
      total_users: totalUsers[0].count,
      total_posts: totalPosts[0].count,
      total_comments: totalComments[0].count,
      banned_users: bannedUsers[0].count,
      role_stats: roleStats,
      theme_stats: themeStats,
      weekly_activity: weeklyActivity
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение логов действий (только админы)
router.get('/logs', requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    // Получаем последние уведомления (как логи действий)
    const [logs] = await pool.execute(`
      SELECT n.*, u.username as from_username, u.first_name as from_first_name
      FROM notifications n
      LEFT JOIN users u ON n.from_user_id = u.id
      WHERE n.type IN ('ban', 'post_deleted', 'comment_deleted')
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        has_more: logs.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Ошибка получения логов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
