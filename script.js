// Конфигурация приложения
const CONFIG = {
  updateInterval: 300000, // 5 минут
  tickerUpdateInterval: 8000, // 8 секунд
  timeUpdateInterval: 1000, // 1 секунда
  retryAttempts: 3,
  musicVolume: 0.15,
  fallbackValues: {
    btc: '67,500',
    eth: '3,450',
    gold: '2,340.00',
    oil: '87.50',
    'usd-cbr': '92.10',
    'usd-mb': '92.35'
  },
  chartPoints: 20, // Количество точек на графике
  chartUpdateInterval: 30000 // Обновление графиков каждые 30 секунд
};

// API URLs
const API_URLS = {
  crypto: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd',
  gold: 'https://api.gold-api.com/price/XAU',
  oil: 'https://www.alphavantage.co/query?function=WTI&interval=weekly&apikey=GAJYW71E8KK0I7CL',
  usdRub: 'https://www.cbr-xml-daily.ru/daily_json.js'
};

// Заглушки для новостей
const NEWS_LIST = [
  "Bitcoin превысил 70 000 долларов",
  "Ethereum готовится к обновлению Dencun",
  "Рынок криптовалют стабилизируется после волатильности",
  "Simple Exchange запустил новый офис в Дубае",
  "Крупные институты увеличивают позиции в BTC"
];

const AD_TEXT = "Simple Exchange - надежный обменник криптовалют с офисами в Москве и Нижнем Новгороде. Работаем по всему миру. Покупка и продажа USDT, оплата счетов от иностранных контрагентов. Быстрые и безопасные сделки с криптовалютой.";

// Кэширование DOM-элементов
const elements = {
  time: {
    moscow: document.getElementById('moscow'),
    dubai: document.getElementById('dubai'),
    bangkok: document.getElementById('bangkok'),
    london: document.getElementById('london'),
    ny: document.getElementById('ny')
  },
  rates: {
    btc: document.getElementById('btc'),
    eth: document.getElementById('eth'),
    gold: document.getElementById('gold'),
    oil: document.getElementById('oil'),
    'usd-cbr': document.getElementById('usd-cbr'),
    'usd-mb': document.getElementById('usd-mb')
  },
  charts: {
    btc: document.getElementById('chart-btc'),
    eth: document.getElementById('chart-eth'),
    gold: document.getElementById('chart-gold'),
    oil: document.getElementById('chart-oil'),
    'usd-cbr': document.getElementById('chart-usd-cbr'),
    'usd-mb': document.getElementById('chart-usd-mb')
  },
  ticker: document.getElementById('ticker'),
  music: document.getElementById('bg-music')
};

// Состояние приложения
const state = {
  currentNewsIndex: 0,
  prevValues: {
    btc: null,
    eth: null,
    gold: null,
    oil: null,
    'usd-cbr': null,
    'usd-mb': null
  },
  isMusicPlaying: false,
  chartData: {
    btc: [],
    eth: [],
    gold: [],
    oil: [],
    'usd-cbr': [],
    'usd-mb': []
  },
  chartColors: {
    btc: '#F7931A',
    eth: '#627EEA',
    gold: '#FFD700',
    oil: '#333333',
    'usd-cbr': '#1E88E5',
    'usd-mb': '#43A047'
  }
};

// Улучшенная функция fetch с повторными попытками
async function fetchWithRetry(url, options = {}, retries = CONFIG.retryAttempts) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

// Централизованная обработка ошибок
function handleError(error, context) {
  console.error(`Ошибка в ${context}:`, error);
}

// Форматирование чисел
function formatNumber(num) {
  return new Intl.NumberFormat('en-US').format(num);
}

// Функция обновления значения
function updateValue(id, newValue) {
  const valueElement = elements.rates[id];
  
  if (!valueElement) {
    console.error("Элемент не найден:", id);
    return;
  }
  
  valueElement.textContent = newValue;
  
  // Сохраняем предыдущее значение для сравнения
  state.prevValues[id] = newValue;
  
  // Обновляем данные для графика
  const numericValue = parseFloat(newValue.replace(/,/g, ''));
  updateChartData(id, numericValue);
}

// Обновление данных для графика
function updateChartData(id, value) {
  if (!state.chartData[id]) {
    state.chartData[id] = [];
  }
  
  // Добавляем новое значение
  state.chartData[id].push({
    time: new Date(),
    value: value
  });
  
  // Ограничиваем количество точек
  if (state.chartData[id].length > CONFIG.chartPoints) {
    state.chartData[id].shift();
  }
  
  // Обновляем график
  updateChart(id);
}

// Обновление SVG графика
function updateChart(id) {
  const data = state.chartData[id] || [];
  const pathElement = elements.charts[id];
  
  if (!pathElement || data.length < 2) {
    return;
  }
  
  // Находим минимальное и максимальное значение для масштабирования
  const values = data.map(point => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1; // Избегаем деления на ноль
  
  // Создаем путь для SVG
  let pathData = '';
  const width = 300;
  const height = 100;
  const padding = 10;
  
  data.forEach((point, index) => {
    const x = (index / (data.length - 1)) * (width - 2 * padding) + padding;
    const y = height - ((point.value - minValue) / range) * (height - 2 * padding) - padding;
    
    if (index === 0) {
      pathData += `M ${x} ${y}`;
    } else {
      pathData += ` L ${x} ${y}`;
    }
  });
  
  // Обновляем путь
  pathElement.setAttribute('d', pathData);
  
  // Обновляем цвет линии в зависимости от тренда
  if (data.length > 1) {
    const lastValue = data[data.length - 1].value;
    const prevValue = data[data.length - 2].value;
    const color = lastValue >= prevValue ? '#00C853' : '#d32f2f';
    pathElement.setAttribute('stroke', color);
  }
}

// Оптимизация обновления времени
function updateTime() {
  const now = new Date();
  const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  
  elements.time.moscow.textContent = now.toLocaleTimeString('ru-RU', { ...options, timeZone: 'Europe/Moscow' });
  elements.time.dubai.textContent = now.toLocaleTimeString('ru-RU', { ...options, timeZone: 'Asia/Dubai' });
  elements.time.bangkok.textContent = now.toLocaleTimeString('ru-RU', { ...options, timeZone: 'Asia/Bangkok' });
  elements.time.london.textContent = now.toLocaleTimeString('ru-RU', { ...options, timeZone: 'Europe/London' });
  elements.time.ny.textContent = now.toLocaleTimeString('ru-RU', { ...options, timeZone: 'America/New_York' });
}

// Обновление всех курсов
async function fetchAllRates() {
  try {
    const [cryptoData, goldData, oilData, rubData] = await Promise.allSettled([
      fetchWithRetry(API_URLS.crypto),
      fetchWithRetry(API_URLS.gold),
      fetchWithRetry(API_URLS.oil),
      fetchWithRetry(API_URLS.usdRub)
    ]);

    // Обработка криптовалют
    if (cryptoData.status === 'fulfilled') {
      updateValue('btc', formatNumber(cryptoData.value.bitcoin.usd));
      updateValue('eth', formatNumber(cryptoData.value.ethereum.usd));
    } else {
      handleError(cryptoData.reason, 'криптовалютах');
      updateValue('btc', CONFIG.fallbackValues.btc);
      updateValue('eth', CONFIG.fallbackValues.eth);
    }
    
    // Обработка золота
    if (goldData.status === 'fulfilled' && goldData.value.price) {
      updateValue('gold', goldData.value.price.toFixed(2));
    } else {
      handleError(goldData.reason, 'золоте');
      updateValue('gold', CONFIG.fallbackValues.gold);
    }
    
    // Обработка нефти
    if (oilData.status === 'fulfilled') {
      try {
        const oilRes = oilData.value;
        if (!oilRes || !oilRes.data || !Array.isArray(oilRes.data)) {
          throw new Error("Неверный формат ответа API");
        }
        
        const sortedData = [...oilRes.data].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (sortedData.length === 0) {
          throw new Error("Отсутствуют данные по нефти");
        }
        
        const latestData = sortedData[0];
        if (!latestData || typeof latestData.value !== 'string') {
          throw new Error("Некорректное значение цены");
        }
        
        const numericPrice = parseFloat(latestData.value);
        if (isNaN(numericPrice)) {
          throw new Error(`Не удалось преобразовать "${latestData.value}" в число`);
        }
        
        updateValue('oil', numericPrice.toFixed(2));
      } catch (e) {
        handleError(e, 'нефти');
        updateValue('oil', CONFIG.fallbackValues.oil);
      }
    } else {
      handleError(oilData.reason, 'нефти');
      updateValue('oil', CONFIG.fallbackValues.oil);
    }
    
    // Обработка USD/RUB
    if (rubData.status === 'fulfilled') {
      try {
        const usdRub = rubData.value;
        const cbr = usdRub.Valute.USD.Value;
        updateValue('usd-cbr', cbr.toFixed(2));
        updateValue('usd-mb', (cbr + 0.25).toFixed(2));
      } catch (e) {
        handleError(e, 'USD/RUB');
        updateValue('usd-cbr', CONFIG.fallbackValues['usd-cbr']);
        updateValue('usd-mb', CONFIG.fallbackValues['usd-mb']);
      }
    } else {
      handleError(rubData.reason, 'USD/RUB');
      updateValue('usd-cbr', CONFIG.fallbackValues['usd-cbr']);
      updateValue('usd-mb', CONFIG.fallbackValues['usd-mb']);
    }
    
  } catch (error) {
    handleError(error, 'загрузке курсов');
    // Применяем все значения по умолчанию в случае общей ошибки
    Object.entries(CONFIG.fallbackValues).forEach(([key, value]) => {
      updateValue(key, value);
    });
  }
}

// Симуляция обновления графиков (для демонстрации)
function simulateChartUpdates() {
  Object.keys(state.chartData).forEach(id => {
    if (state.chartData[id].length > 0) {
      const lastValue = state.chartData[id][state.chartData[id].length - 1].value;
      // Генерируем случайное изменение в пределах ±1%
      const change = (Math.random() - 0.5) * 0.02;
      const newValue = lastValue * (1 + change);
      updateChartData(id, newValue);
    }
  });
}

// Плавное обновление бегущей строки
function updateTicker() {
  const ticker = elements.ticker;
  const isAd = Math.random() > 0.5;
  const newText = isAd 
    ? `РЕКЛАМА: ${AD_TEXT}` 
    : `НОВОСТЬ: ${NEWS_LIST[state.currentNewsIndex]}`;
  
  // Плавная смена текста без перезапуска анимации
  ticker.style.transition = 'opacity 0.5s';
  ticker.style.opacity = '0';
  
  setTimeout(() => {
    ticker.textContent = newText;
    ticker.style.opacity = '1';
    state.currentNewsIndex = (state.currentNewsIndex + 1) % NEWS_LIST.length;
  }, 500);
}

// Автоматическое управление музыкой
function initMusic() {
  // Устанавливаем громкость
  elements.music.volume = CONFIG.musicVolume;
  
  // Пытаемся автоматически запустить музыку
  const playPromise = elements.music.play();
  
  if (playPromise !== undefined) {
    playPromise.then(() => {
      // Автовоспроизведение успешно начато
      state.isMusicPlaying = true;
      console.log("Музыка автоматически запущена");
    }).catch(error => {
      // Автовоспроизведение заблокировано браузером
      console.error("Автовоспроизведение заблокировано:", error);
      
      // Добавляем обработчик клика для запуска музыки при первом взаимодействии
      document.addEventListener('click', function enableMusic() {
        elements.music.play().then(() => {
          state.isMusicPlaying = true;
          console.log("Музыка запущена после клика");
        }).catch(e => {
          console.error("Не удалось запустить музыку после клика:", e);
        });
        
        // Удаляем обработчик после первого использования
        document.removeEventListener('click', enableMusic);
      }, { once: true });
    });
  }
}

// Автоматический перезапуск страницы каждые 24 часа для предотвращения зависаний
function setupAutoRefresh() {
  const refreshInterval = 24 * 60 * 60 * 1000; // 24 часа в миллисекундах
  
  setTimeout(() => {
    console.log("Автоматическое обновление страницы через 24 часа");
    window.location.reload(true);
  }, refreshInterval);
}

// Инициализация графиков с начальными данными
function initCharts() {
  // Заполняем графики начальными данными
  Object.keys(CONFIG.fallbackValues).forEach(id => {
    const numericValue = parseFloat(CONFIG.fallbackValues[id].replace(/,/g, ''));
    
    // Создаем начальные данные (все точки с одинаковым значением)
    for (let i = 0; i < CONFIG.chartPoints; i++) {
      state.chartData[id].push({
        time: new Date(Date.now() - (CONFIG.chartPoints - i) * 60000), // Каждая точка с интервалом в минуту
        value: numericValue
      });
    }
    
    // Сразу отрисовываем график
    updateChart(id);
  });
  
  // Запускаем симуляцию обновления графиков
  setInterval(simulateChartUpdates, CONFIG.chartUpdateInterval);
}

// Инициализация приложения
function initApp() {
  // Сразу отображаем значения по умолчанию
  Object.entries(CONFIG.fallbackValues).forEach(([key, value]) => {
    elements.rates[key].textContent = value;
  });
  
  // Инициализируем графики с начальными данными
  initCharts();
  
  // Запуск обновлений
  fetchAllRates();
  setInterval(fetchAllRates, CONFIG.updateInterval);
  
  updateTime();
  setInterval(updateTime, CONFIG.timeUpdateInterval);
  
  updateTicker();
  setInterval(updateTicker, CONFIG.tickerUpdateInterval);
  
  // Автоматическое управление музыкой
  initMusic();
  
  // Настройка автоматического обновления страницы
  setupAutoRefresh();
  
  // Переход в полноэкранный режим (опционально)
  document.addEventListener('dblclick', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Ошибка при попытке перейти в полноэкранный режим: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  });
}

// Запуск приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', initApp);
