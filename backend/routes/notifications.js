const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Получение уведомлений пользователя
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unread_only = false } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT n.*, 
             u.username as from_username, u.first_name as from_first_name, u.last_name as from_last_name, u.photo_url as from_photo_url,
             p.content as post_content, p.theme as post_theme,
             c.content as comment_content
      FROM notifications n
      LEFT JOIN users u ON n.from_user_id = u.id
      LEFT JOIN posts p ON n.post_id = p.id
      LEFT JOIN comments c ON n.comment_id = c.id
      WHERE n.user_id = ?
    `;

    const queryParams = [req.user.id];

    if (unread_only === 'true') {
      query += ' AND n.is_read = FALSE';
    }

    query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), parseInt(offset));

    const [notifications] = await pool.execute(query, queryParams);

    // Форматируем уведомления
    const formattedNotifications = notifications.map(notification => {
      let message = '';
      let action = '';

      switch (notification.type) {
        case 'follow':
          message = `${notification.from_first_name || notification.from_username} подписался на вас`;
          action = 'follow';
          break;
        case 'like':
          message = `${notification.from_first_name || notification.from_username} лайкнул ваш пост`;
          action = 'post';
          break;
        case 'mention':
          message = `${notification.from_first_name || notification.from_username} упомянул вас в посте`;
          action = 'post';
          break;
        case 'comment':
          message = `${notification.from_first_name || notification.from_username} прокомментировал ваш пост`;
          action = 'post';
          break;
      }

      return {
        id: notification.id,
        type: notification.type,
        message,
        action,
        is_read: notification.is_read,
        created_at: notification.created_at,
        from_user: {
          id: notification.from_user_id,
          username: notification.from_username,
          first_name: notification.from_first_name,
          last_name: notification.from_last_name,
          photo_url: notification.from_photo_url
        },
        post: notification.post_id ? {
          id: notification.post_id,
          content: notification.post_content,
          theme: notification.post_theme
        } : null,
        comment: notification.comment_id ? {
          id: notification.comment_id,
          content: notification.comment_content
        } : null
      };
    });

    res.json({
      notifications: formattedNotifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        has_more: notifications.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Ошибка получения уведомлений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Отметка уведомления как прочитанного
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Уведомление не найдено' });
    }

    res.json({ message: 'Уведомление отмечено как прочитанное' });
  } catch (error) {
    console.error('Ошибка обновления уведомления:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Отметка всех уведомлений как прочитанных
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );

    res.json({ message: 'Все уведомления отмечены как прочитанные' });
  } catch (error) {
    console.error('Ошибка обновления уведомлений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение количества непрочитанных уведомлений
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );

    res.json({ unread_count: result[0].count });
  } catch (error) {
    console.error('Ошибка получения количества уведомлений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удаление уведомления
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Уведомление не найдено' });
    }

    res.json({ message: 'Уведомление удалено' });
  } catch (error) {
    console.error('Ошибка удаления уведомления:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
