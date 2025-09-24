-- Скрипт для добавления первого администратора
-- Используйте этот скрипт после создания базы данных

USE nakama_space;

-- Способ 1: Обновить существующего пользователя до администратора
-- Замените USER_ID на ID пользователя, которого хотите сделать админом
UPDATE users SET role = 'admin' WHERE id = USER_ID;

-- Способ 2: Создать тестового администратора (для разработки)
-- ВНИМАНИЕ: Используйте только для тестирования!
INSERT INTO users (
    telegram_id, 
    username, 
    first_name, 
    last_name, 
    role, 
    is_banned, 
    whitelist_enabled, 
    nsfw_hidden
) VALUES (
    123456789,  -- Замените на реальный Telegram ID
    'admin',    -- Username администратора
    'Администратор',  -- Имя
    'Системы',  -- Фамилия
    'admin',    -- Роль
    FALSE,      -- Не забанен
    FALSE,      -- Без вайтлиста
    FALSE       -- Показывать NSFW
);

-- Способ 3: Найти пользователя по username и сделать админом
-- Замените 'username' на реальный username
UPDATE users SET role = 'admin' WHERE username = 'username';

-- Проверка: посмотреть всех администраторов
SELECT id, telegram_id, username, first_name, last_name, role, created_at 
FROM users 
WHERE role = 'admin';

-- Проверка: посмотреть всех модераторов
SELECT id, telegram_id, username, first_name, last_name, role, created_at 
FROM users 
WHERE role IN ('moderator', 'admin');

-- Полезные запросы для управления ролями:

-- Сделать пользователя модератором
-- UPDATE users SET role = 'moderator' WHERE id = USER_ID;

-- Вернуть пользователя к обычной роли
-- UPDATE users SET role = 'user' WHERE id = USER_ID;

-- Забанить пользователя
-- UPDATE users SET is_banned = TRUE WHERE id = USER_ID;

-- Разбанить пользователя
-- UPDATE users SET is_banned = FALSE WHERE id = USER_ID;

-- Посмотреть статистику ролей
SELECT role, COUNT(*) as count FROM users GROUP BY role;

-- Посмотреть заблокированных пользователей
SELECT id, username, first_name, last_name, role, created_at 
FROM users 
WHERE is_banned = TRUE;
