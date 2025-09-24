const fs = require('fs');
const path = require('path');

// Создаем дефолтные изображения для локального поиска
const setupDefaultImages = () => {
  const uploadsDir = path.join(__dirname, '../uploads');
  
  // Создаем директорию uploads если её нет
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Создаем SVG изображения-заглушки
  const defaultFurrySVG = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="600" fill="#ff8c00"/>
    <text x="400" y="300" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle">
      🐾 Фурри контент
    </text>
    <text x="400" y="350" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">
      Загрузите свои изображения!
    </text>
  </svg>`;

  const defaultAnimeSVG = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="600" fill="#4169e1"/>
    <text x="400" y="300" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle">
      🎌 Аниме контент
    </text>
    <text x="400" y="350" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">
      Загрузите свои изображения!
    </text>
  </svg>`;

  const defaultOtherSVG = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="600" fill="#808080"/>
    <text x="400" y="300" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle">
      📷 Другой контент
    </text>
    <text x="400" y="350" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">
      Загрузите свои изображения!
    </text>
  </svg>`;

  // Сохраняем SVG файлы
  fs.writeFileSync(path.join(uploadsDir, 'default-furry.svg'), defaultFurrySVG);
  fs.writeFileSync(path.join(uploadsDir, 'default-anime.svg'), defaultAnimeSVG);
  fs.writeFileSync(path.join(uploadsDir, 'default-other.svg'), defaultOtherSVG);

  console.log('✅ Дефолтные изображения созданы');
  console.log('📁 Файлы сохранены в:', uploadsDir);
};

// Запускаем скрипт
if (require.main === module) {
  setupDefaultImages();
}

module.exports = setupDefaultImages;
