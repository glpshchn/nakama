const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Telegram Web App Data validation
const validateTelegramData = (data, botToken) => {
  const secret = crypto.createHash('sha256').update(botToken).digest();
  const checkString = Object.keys(data)
    .filter(key => key !== 'hash')
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('\n');
  
  const hmac = crypto.createHmac('sha256', secret).update(checkString).digest('hex');
  return hmac === data.hash;
};

// Авторизация через Telegram
router.post('/telegram', async (req, res) => {
  try {
    const { initData } = req.body;
    
    if (!initData) {
      return res.status(400).json({ error: 'Данные Telegram не предоставлены' });
    }

    // Парсим данные Telegram
    const urlParams = new URLSearchParams(initData);
    const data = {};
    for (const [key, value] of urlParams) {
      data[key] = value;
    }

    // Проверяем подпись
    if (!validateTelegramData(data, process.env.TELEGRAM_BOT_TOKEN)) {
      return res.status(401).json({ error: 'Недействительные данные Telegram' });
    }

    const userData = JSON.parse(data.user);
    const telegramId = userData.id;

    // Ищем или создаем пользователя
    let [users] = await pool.execute(
      'SELECT * FROM users WHERE telegram_id = ?',
      [telegramId]
    );

    let user;
    if (users.length === 0) {
      // Создаем нового пользователя
      const [result] = await pool.execute(
        `INSERT INTO users (telegram_id, username, first_name, last_name, photo_url) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          telegramId,
          userData.username || null,
          userData.first_name || null,
          userData.last_name || null,
          userData.photo_url || null
        ]
      );
      
      user = {
        id: result.insertId,
        telegram_id: telegramId,
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name,
        photo_url: userData.photo_url,
        role: 'user',
        is_banned: false,
        whitelist_enabled: false,
        nsfw_hidden: true
      };
    } else {
      // Обновляем существующего пользователя
      await pool.execute(
        `UPDATE users SET username = ?, first_name = ?, last_name = ?, photo_url = ?
         WHERE telegram_id = ?`,
        [
          userData.username || users[0].username,
          userData.first_name || users[0].first_name,
          userData.last_name || users[0].last_name,
          userData.photo_url || users[0].photo_url,
          telegramId
        ]
      );
      
      user = users[0];
      user.username = userData.username || user.username;
      user.first_name = userData.first_name || user.first_name;
      user.last_name = userData.last_name || user.last_name;
      user.photo_url = userData.photo_url || user.photo_url;
    }

    // Создаем JWT токен
    const token = jwt.sign(
      { userId: user.id, telegramId: user.telegram_id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        photo_url: user.photo_url,
        role: user.role,
        whitelist_enabled: user.whitelist_enabled,
        nsfw_hidden: user.nsfw_hidden
      }
    });
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение информации о текущем пользователе
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, first_name, last_name, photo_url, role, whitelist_enabled, nsfw_hidden, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Получаем статистику пользователя
    const [followersCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM follows WHERE following_id = ?',
      [req.user.id]
    );

    const [followingCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?',
      [req.user.id]
    );

    const [postsCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND is_deleted = FALSE',
      [req.user.id]
    );

    res.json({
      ...users[0],
      followers_count: followersCount[0].count,
      following_count: followingCount[0].count,
      posts_count: postsCount[0].count
    });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновление настроек пользователя
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const { whitelist_enabled, nsfw_hidden } = req.body;

    await pool.execute(
      'UPDATE users SET whitelist_enabled = ?, nsfw_hidden = ? WHERE id = ?',
      [whitelist_enabled, nsfw_hidden, req.user.id]
    );

    res.json({ message: 'Настройки обновлены' });
  } catch (error) {
    console.error('Ошибка обновления настроек:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
