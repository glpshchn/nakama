const express = require('express');
const axios = require('axios');
const { pool } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Кэширование результатов поиска
const getCachedResults = async (query, source) => {
  const [results] = await pool.execute(
    'SELECT results FROM search_cache WHERE query = ? AND source = ? AND expires_at > NOW()',
    [query, source]
  );
  
  return results.length > 0 ? JSON.parse(results[0].results) : null;
};

const setCachedResults = async (query, source, results) => {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 минут
  
  await pool.execute(
    'INSERT INTO search_cache (query, source, results, expires_at) VALUES (?, ?, ?, ?)',
    [query, source, JSON.stringify(results), expiresAt]
  );
};

// Поиск на e621 (фурри) через прокси
const searchE621 = async (query, page = 1) => {
  try {
    // Сначала пробуем прямой запрос
    let response;
    try {
      response = await axios.get('https://e621.net/posts.json', {
        params: {
          tags: query,
          page: page,
          limit: 20
        },
        headers: {
          'User-Agent': process.env.E621_USER_AGENT || 'NakamaSpace/1.0'
        },
        timeout: 10000
      });
    } catch (directError) {
      // Если прямой запрос не работает, используем прокси через наш сервер
      console.log('Прямой запрос к e621 не удался, используем прокси');
      response = await axios.get(`http://localhost:${process.env.PORT || 5000}/api/proxy/e621/posts.json`, {
        params: {
          tags: query,
          page: page,
          limit: 20
        }
      });
    }

    return response.data.posts.map(post => ({
      id: post.id,
      url: post.file.url,
      preview: post.preview.url,
      sample: post.sample.url,
      tags: post.tags,
      rating: post.rating,
      score: post.score.total,
      width: post.file.width,
      height: post.file.height,
      file_size: post.file.size,
      source: 'e621'
    }));
  } catch (error) {
    console.error('Ошибка поиска e621:', error);
    return [];
  }
};

// Поиск на Danbooru (аниме) через прокси
const searchDanbooru = async (query, page = 1) => {
  try {
    // Сначала пробуем прямой запрос
    let response;
    try {
      response = await axios.get('https://danbooru.donmai.us/posts.json', {
        params: {
          tags: query,
          page: page,
          limit: 20
        },
        headers: {
          'User-Agent': process.env.DANBOORU_USER_AGENT || 'NakamaSpace/1.0'
        },
        timeout: 10000
      });
    } catch (directError) {
      // Если прямой запрос не работает, используем прокси через наш сервер
      console.log('Прямой запрос к danbooru не удался, используем прокси');
      response = await axios.get(`http://localhost:${process.env.PORT || 5000}/api/proxy/danbooru/posts.json`, {
        params: {
          tags: query,
          page: page,
          limit: 20
        }
      });
    }

    return response.data.map(post => ({
      id: post.id,
      url: post.file_url,
      preview: post.preview_url,
      sample: post.large_file_url,
      tags: post.tag_string.split(' '),
      rating: post.rating,
      score: post.score,
      width: post.image_width,
      height: post.image_height,
      file_size: post.file_size,
      source: 'danbooru'
    }));
  } catch (error) {
    console.error('Ошибка поиска Danbooru:', error);
    return [];
  }
};

// Поиск на Gelbooru (аниме) через прокси
const searchGelbooru = async (query, page = 1) => {
  try {
    // Сначала пробуем прямой запрос
    let response;
    try {
      response = await axios.get('https://gelbooru.com/index.php', {
        params: {
          page: 'dapi',
          s: 'post',
          q: 'index',
          json: 1,
          tags: query,
          pid: page - 1,
          limit: 20
        },
        timeout: 10000
      });
    } catch (directError) {
      // Если прямой запрос не работает, используем прокси через наш сервер
      console.log('Прямой запрос к gelbooru не удался, используем прокси');
      response = await axios.get(`http://localhost:${process.env.PORT || 5000}/api/proxy/gelbooru/index.php`, {
        params: {
          page: 'dapi',
          s: 'post',
          q: 'index',
          json: 1,
          tags: query,
          pid: page - 1,
          limit: 20
        }
      });
    }

    return response.data.post.map(post => ({
      id: post.id,
      url: post.file_url,
      preview: post.preview_url,
      sample: post.sample_url,
      tags: post.tags.split(' '),
      rating: post.rating,
      score: post.score,
      width: post.width,
      height: post.height,
      file_size: post.file_size,
      source: 'gelbooru'
    }));
  } catch (error) {
    console.error('Ошибка поиска Gelbooru:', error);
    return [];
  }
};

// Получение автоподсказок тегов
router.get('/suggestions', async (req, res) => {
  try {
    const { q, source } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    let suggestions = [];

    if (source === 'e621') {
      try {
        // Сначала пробуем прямой запрос
        let response;
        try {
          response = await axios.get('https://e621.net/tags.json', {
            params: {
              'search[name_matches]': `*${q}*`,
              limit: 10
            },
            headers: {
              'User-Agent': process.env.E621_USER_AGENT || 'NakamaSpace/1.0'
            },
            timeout: 5000
          });
        } catch (directError) {
          // Если прямой запрос не работает, используем прокси
          response = await axios.get(`http://localhost:${process.env.PORT || 5000}/api/proxy/e621/tags.json`, {
            params: {
              'search[name_matches]': `*${q}*`,
              limit: 10
            }
          });
        }

        suggestions = response.data.map(tag => ({
          name: tag.name,
          count: tag.post_count,
          category: tag.category
        }));
      } catch (error) {
        console.error('Ошибка получения подсказок e621:', error);
      }
    } else if (source === 'danbooru') {
      try {
        // Сначала пробуем прямой запрос
        let response;
        try {
          response = await axios.get('https://danbooru.donmai.us/tags.json', {
            params: {
              'search[name_matches]': `*${q}*`,
              limit: 10
            },
            timeout: 5000
          });
        } catch (directError) {
          // Если прямой запрос не работает, используем прокси
          response = await axios.get(`http://localhost:${process.env.PORT || 5000}/api/proxy/danbooru/tags.json`, {
            params: {
              'search[name_matches]': `*${q}*`,
              limit: 10
            }
          });
        }

        suggestions = response.data.map(tag => ({
          name: tag.name,
          count: tag.post_count,
          category: tag.category
        }));
      } catch (error) {
        console.error('Ошибка получения подсказок Danbooru:', error);
      }
    }

    res.json(suggestions);
  } catch (error) {
    console.error('Ошибка получения подсказок:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Поиск изображений
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { q, source, page = 1 } = req.query;

    if (!q || !source) {
      return res.status(400).json({ error: 'Запрос и источник обязательны' });
    }

    if (!['e621', 'danbooru', 'gelbooru'].includes(source)) {
      return res.status(400).json({ error: 'Неподдерживаемый источник' });
    }

    // Проверяем кэш
    const cachedResults = await getCachedResults(q, source);
    if (cachedResults) {
      return res.json({
        results: cachedResults,
        source,
        query: q,
        page: parseInt(page),
        cached: true
      });
    }

    let results = [];

    // Выполняем поиск в зависимости от источника
    switch (source) {
      case 'e621':
        results = await searchE621(q, parseInt(page));
        break;
      case 'danbooru':
        results = await searchDanbooru(q, parseInt(page));
        break;
      case 'gelbooru':
        results = await searchGelbooru(q, parseInt(page));
        break;
    }

    // Кэшируем результаты
    if (results.length > 0) {
      await setCachedResults(q, source, results);
    }

    res.json({
      results,
      source,
      query: q,
      page: parseInt(page),
      cached: false
    });
  } catch (error) {
    console.error('Ошибка поиска:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Отправка изображения в чат (через Telegram Bot API)
router.post('/send-to-chat', optionalAuth, async (req, res) => {
  try {
    const { image_url, chat_id } = req.body;

    if (!image_url || !chat_id) {
      return res.status(400).json({ error: 'URL изображения и ID чата обязательны' });
    }

    // Здесь должна быть интеграция с Telegram Bot API
    // Для демонстрации возвращаем успешный ответ
    res.json({
      message: 'Изображение отправлено в чат',
      image_url,
      chat_id
    });
  } catch (error) {
    console.error('Ошибка отправки в чат:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
