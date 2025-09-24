const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');
const { validatePost, validateComment } = require('../middleware/validation');

const router = express.Router();

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Разрешены только изображения (JPEG, PNG, GIF, WebP)'));
    }
  }
});

// Создание поста
router.post('/', authenticateToken, upload.array('images', 5), validatePost, async (req, res) => {
  try {
    const { content, theme, is_nsfw, is_sfw, tags, mentioned_users } = req.body;
    
    // Обработка загруженных изображений
    const images = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      path: `/uploads/${file.filename}`,
      size: file.size
    })) : [];

    // Создаем пост
    const [result] = await pool.execute(
      `INSERT INTO posts (user_id, content, theme, is_nsfw, is_sfw, tags, mentioned_users, images)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        content,
        theme,
        is_nsfw === 'true' || is_nsfw === true,
        is_sfw === 'true' || is_sfw === true,
        JSON.stringify(tags || []),
        JSON.stringify(mentioned_users || []),
        JSON.stringify(images)
      ]
    );

    const postId = result.insertId;

    // Создаем уведомления для упомянутых пользователей
    if (mentioned_users && mentioned_users.length > 0) {
      for (const username of mentioned_users) {
        const [users] = await pool.execute(
          'SELECT id FROM users WHERE username = ? AND id != ?',
          [username.replace('@', ''), req.user.id]
        );

        if (users.length > 0) {
          await pool.execute(
            'INSERT INTO notifications (user_id, type, from_user_id, post_id) VALUES (?, ?, ?, ?)',
            [users[0].id, 'mention', req.user.id, postId]
          );
        }
      }
    }

    res.status(201).json({
      message: 'Пост создан успешно',
      post_id: postId
    });
  } catch (error) {
    console.error('Ошибка создания поста:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение ленты постов
router.get('/feed', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, theme, user_id } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, u.username, u.first_name, u.last_name, u.photo_url,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_deleted = FALSE) as comments_count,
             ${req.user ? '(SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked' : '0 as is_liked'}
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.is_deleted = FALSE
    `;

    const queryParams = [];
    if (req.user) {
      queryParams.push(req.user.id);
    }

    // Фильтр по теме
    if (theme && ['furry', 'anime', 'other'].includes(theme)) {
      query += ' AND p.theme = ?';
      queryParams.push(theme);
    }

    // Фильтр по пользователю
    if (user_id) {
      query += ' AND p.user_id = ?';
      queryParams.push(user_id);
    }

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
    console.error('Ошибка получения ленты:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение поста по ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    let query = `
      SELECT p.*, u.username, u.first_name, u.last_name, u.photo_url,
             (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_deleted = FALSE) as comments_count,
             ${req.user ? '(SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked' : '0 as is_liked'}
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ? AND p.is_deleted = FALSE
    `;

    const queryParams = req.user ? [req.user.id, id] : [id];
    const [posts] = await pool.execute(query, queryParams);

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Пост не найден' });
    }

    const post = posts[0];
    const formattedPost = {
      ...post,
      tags: JSON.parse(post.tags || '[]'),
      mentioned_users: JSON.parse(post.mentioned_users || '[]'),
      images: JSON.parse(post.images || '[]'),
      is_liked: post.is_liked > 0
    };

    res.json(formattedPost);
  } catch (error) {
    console.error('Ошибка получения поста:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Лайк/анлайк поста
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Проверяем, существует ли пост
    const [posts] = await pool.execute(
      'SELECT id FROM posts WHERE id = ? AND is_deleted = FALSE',
      [id]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Пост не найден' });
    }

    // Проверяем, есть ли уже лайк
    const [likes] = await pool.execute(
      'SELECT id FROM likes WHERE user_id = ? AND post_id = ?',
      [req.user.id, id]
    );

    if (likes.length > 0) {
      // Убираем лайк
      await pool.execute(
        'DELETE FROM likes WHERE user_id = ? AND post_id = ?',
        [req.user.id, id]
      );

      // Обновляем счетчик лайков
      await pool.execute(
        'UPDATE posts SET likes_count = likes_count - 1 WHERE id = ?',
        [id]
      );

      res.json({ message: 'Лайк убран', liked: false });
    } else {
      // Добавляем лайк
      await pool.execute(
        'INSERT INTO likes (user_id, post_id) VALUES (?, ?)',
        [req.user.id, id]
      );

      // Обновляем счетчик лайков
      await pool.execute(
        'UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?',
        [id]
      );

      // Создаем уведомление для автора поста
      const [postAuthor] = await pool.execute(
        'SELECT user_id FROM posts WHERE id = ?',
        [id]
      );

      if (postAuthor.length > 0 && postAuthor[0].user_id !== req.user.id) {
        await pool.execute(
          'INSERT INTO notifications (user_id, type, from_user_id, post_id) VALUES (?, ?, ?, ?)',
          [postAuthor[0].user_id, 'like', req.user.id, id]
        );
      }

      res.json({ message: 'Лайк добавлен', liked: true });
    }
  } catch (error) {
    console.error('Ошибка лайка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удаление поста (только автор или модератор)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Проверяем права доступа
    const [posts] = await pool.execute(
      'SELECT user_id FROM posts WHERE id = ? AND is_deleted = FALSE',
      [id]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Пост не найден' });
    }

    const isAuthor = posts[0].user_id === req.user.id;
    const isModerator = ['moderator', 'admin'].includes(req.user.role);

    if (!isAuthor && !isModerator) {
      return res.status(403).json({ error: 'Недостаточно прав для удаления поста' });
    }

    // Помечаем пост как удаленный
    await pool.execute(
      'UPDATE posts SET is_deleted = TRUE WHERE id = ?',
      [id]
    );

    res.json({ message: 'Пост удален' });
  } catch (error) {
    console.error('Ошибка удаления поста:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Комментарии к посту
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [comments] = await pool.execute(
      `SELECT c.*, u.username, u.first_name, u.last_name, u.photo_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ? AND c.is_deleted = FALSE
       ORDER BY c.created_at ASC
       LIMIT ? OFFSET ?`,
      [id, parseInt(limit), parseInt(offset)]
    );

    res.json({
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        has_more: comments.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Ошибка получения комментариев:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Добавление комментария
router.post('/:id/comments', authenticateToken, validateComment, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parent_id } = req.body;

    // Проверяем, существует ли пост
    const [posts] = await pool.execute(
      'SELECT id, user_id FROM posts WHERE id = ? AND is_deleted = FALSE',
      [id]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Пост не найден' });
    }

    // Создаем комментарий
    const [result] = await pool.execute(
      'INSERT INTO comments (user_id, post_id, content, parent_id) VALUES (?, ?, ?, ?)',
      [req.user.id, id, content, parent_id || null]
    );

    // Обновляем счетчик комментариев
    await pool.execute(
      'UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?',
      [id]
    );

    // Создаем уведомление для автора поста
    if (posts[0].user_id !== req.user.id) {
      await pool.execute(
        'INSERT INTO notifications (user_id, type, from_user_id, post_id, comment_id) VALUES (?, ?, ?, ?, ?)',
        [posts[0].user_id, 'comment', req.user.id, id, result.insertId]
      );
    }

    res.status(201).json({
      message: 'Комментарий добавлен',
      comment_id: result.insertId
    });
  } catch (error) {
    console.error('Ошибка добавления комментария:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удаление комментария
router.delete('/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;

    // Проверяем, существует ли комментарий
    const [comments] = await pool.execute(
      'SELECT user_id, post_id FROM comments WHERE id = ? AND is_deleted = FALSE',
      [commentId]
    );

    if (comments.length === 0) {
      return res.status(404).json({ error: 'Комментарий не найден' });
    }

    const comment = comments[0];

    // Проверяем права доступа
    const isAuthor = comment.user_id === req.user.id;
    const isModerator = ['moderator', 'admin'].includes(req.user.role);

    if (!isAuthor && !isModerator) {
      return res.status(403).json({ error: 'Недостаточно прав для удаления комментария' });
    }

    // Помечаем комментарий как удаленный
    await pool.execute(
      'UPDATE comments SET is_deleted = TRUE WHERE id = ?',
      [commentId]
    );

    // Обновляем счетчик комментариев в посте
    await pool.execute(
      'UPDATE posts SET comments_count = comments_count - 1 WHERE id = ?',
      [comment.post_id]
    );

    res.json({ message: 'Комментарий удален' });
  } catch (error) {
    console.error('Ошибка удаления комментария:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
