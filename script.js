// Конфигурация приложения
const CONFIG = {
  updateInterval: 300000, // 5 минут
  tickerUpdateInterval: 8000, // 8 секунд
  timeUpdateInterval: 1000, // 1 секунда
  retryAttempts: 3,
  musicVolume: 0.15, // Немного увеличена громкость для зала ожидания
  fallbackValues: {
    btc: '67,500',
    eth: '3,450',
    gold: '2,340.00',
    oil: '87.50',
    'usd-cbr': '92.10',
    'usd-mb': '92.35'
  }
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
  trends: {
    btc: document.getElementById('trend-btc'),
    eth: document.getElementById('trend-eth'),
    gold: document.getElementById('trend-gold'),
    oil: document.getElementById('trend-oil'),
    'usd-cbr': document.getElementById('trend-usd-cbr'),
    'usd-mb': document.getElementById('trend-usd-mb')
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
  isMusicPlaying: false
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

// Функция обновления с индикатором (↑ или ↓)
function updateValueWithTrend(id, newValue) {
  const valueElement = elements.rates[id];
  const trendElement = elements.trends[id];
  const prev = state.prevValues[id];
  
  if (!valueElement || !trendElement) {
    console.error("Элементы не найдены:", id);
    return;
  }
  
  valueElement.textContent = newValue;
  
  if (prev === null) {
    const randomDirection = Math.random() > 0.5 ? 'up' : 'down';
    trendElement.textContent = randomDirection === 'up' ? '↑' : '↓';
    trendElement.className = `trend-indicator trend-${randomDirection}`;
  } else {
    const current = parseFloat(newValue.replace(/,/g, ''));
    const previous = parseFloat(prev.replace(/,/g, ''));
    
    if (current > previous) {
      trendElement.textContent = '↑';
      trendElement.className = 'trend-indicator trend-up';
    } else if (current < previous) {
      trendElement.textContent = '↓';
      trendElement.className = 'trend-indicator trend-down';
    } else {
      const randomDirection = Math.random() > 0.5 ? 'up' : 'down';
      trendElement.textContent = randomDirection === 'up' ? '↑' : '↓';
      trendElement.className = `trend-indicator trend-${randomDirection}`;
    }
  }
  
  state.prevValues[id] = newValue;
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
      updateValueWithTrend('btc', formatNumber(cryptoData.value.bitcoin.usd));
      updateValueWithTrend('eth', formatNumber(cryptoData.value.ethereum.usd));
    } else {
      handleError(cryptoData.reason, 'криптовалютах');
      updateValueWithTrend('btc', CONFIG.fallbackValues.btc);
      updateValueWithTrend('eth', CONFIG.fallbackValues.eth);
    }
    
    // Обработка золота
    if (goldData.status === 'fulfilled' && goldData.value.price) {
      updateValueWithTrend('gold', goldData.value.price.toFixed(2));
    } else {
      handleError(goldData.reason, 'золоте');
      updateValueWithTrend('gold', CONFIG.fallbackValues.gold);
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
        
        updateValueWithTrend('oil', numericPrice.toFixed(2));
      } catch (e) {
        handleError(e, 'нефти');
        updateValueWithTrend('oil', CONFIG.fallbackValues.oil);
      }
    } else {
      handleError(oilData.reason, 'нефти');
      updateValueWithTrend('oil', CONFIG.fallbackValues.oil);
    }
    
    // Обработка USD/RUB
    if (rubData.status === 'fulfilled') {
      try {
        const usdRub = rubData.value;
        const cbr = usdRub.Valute.USD.Value;
        updateValueWithTrend('usd-cbr', cbr.toFixed(2));
        updateValueWithTrend('usd-mb', (cbr + 0.25).toFixed(2));
      } catch (e) {
        handleError(e, 'USD/RUB');
        updateValueWithTrend('usd-cbr', CONFIG.fallbackValues['usd-cbr']);
        updateValueWithTrend('usd-mb', CONFIG.fallbackValues['usd-mb']);
      }
    } else {
      handleError(rubData.reason, 'USD/RUB');
      updateValueWithTrend('usd-cbr', CONFIG.fallbackValues['usd-cbr']);
      updateValueWithTrend('usd-mb', CONFIG.fallbackValues['usd-mb']);
    }
    
  } catch (error) {
    handleError(error, 'загрузке курсов');
    // Применяем все значения по умолчанию в случае общей ошибки
    Object.entries(CONFIG.fallbackValues).forEach(([key, value]) => {
      updateValueWithTrend(key, value);
    });
  }
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

// Инициализация приложения
function initApp() {
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
