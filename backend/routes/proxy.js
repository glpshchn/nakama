const express = require('express');
const axios = require('axios');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Простое проксирование запросов через сервер
router.get('/e621/*', optionalAuth, async (req, res) => {
  try {
    const path = req.params[0]; // Получаем путь после /e621/
    const url = `https://e621.net/${path}`;
    
    const response = await axios.get(url, {
      params: req.query,
      headers: {
        'User-Agent': process.env.E621_USER_AGENT || 'NakamaSpace/1.0',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 30000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Ошибка проксирования e621:', error.message);
    res.status(500).json({ 
      error: 'Ошибка получения данных с e621',
      details: error.message 
    });
  }
});

router.get('/danbooru/*', optionalAuth, async (req, res) => {
  try {
    const path = req.params[0];
    const url = `https://danbooru.donmai.us/${path}`;
    
    const response = await axios.get(url, {
      params: req.query,
      headers: {
        'User-Agent': process.env.DANBOORU_USER_AGENT || 'NakamaSpace/1.0',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Ошибка проксирования danbooru:', error.message);
    res.status(500).json({ 
      error: 'Ошибка получения данных с danbooru',
      details: error.message 
    });
  }
});

router.get('/gelbooru/*', optionalAuth, async (req, res) => {
  try {
    const path = req.params[0];
    const url = `https://gelbooru.com/${path}`;
    
    const response = await axios.get(url, {
      params: req.query,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Ошибка проксирования gelbooru:', error.message);
    res.status(500).json({ 
      error: 'Ошибка получения данных с gelbooru',
      details: error.message 
    });
  }
});

module.exports = router;
