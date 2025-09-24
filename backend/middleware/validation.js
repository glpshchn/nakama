const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Ошибка валидации',
      details: errors.array()
    });
  }
  next();
};

const validatePost = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Содержимое поста должно быть от 1 до 2000 символов'),
  body('theme')
    .isIn(['furry', 'anime', 'other'])
    .withMessage('Тема должна быть: furry, anime или other'),
  body('is_nsfw')
    .optional()
    .isBoolean()
    .withMessage('is_nsfw должно быть булевым значением'),
  body('is_sfw')
    .optional()
    .isBoolean()
    .withMessage('is_sfw должно быть булевым значением'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Теги должны быть массивом'),
  body('mentioned_users')
    .optional()
    .isArray()
    .withMessage('Упомянутые пользователи должны быть массивом'),
  handleValidationErrors
];

const validateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Комментарий должен быть от 1 до 500 символов'),
  body('post_id')
    .isInt({ min: 1 })
    .withMessage('ID поста должен быть положительным числом'),
  body('parent_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID родительского комментария должен быть положительным числом'),
  handleValidationErrors
];

const validateUserSettings = [
  body('whitelist_enabled')
    .optional()
    .isBoolean()
    .withMessage('whitelist_enabled должно быть булевым значением'),
  body('nsfw_hidden')
    .optional()
    .isBoolean()
    .withMessage('nsfw_hidden должно быть булевым значением'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validatePost,
  validateComment,
  validateUserSettings
};
