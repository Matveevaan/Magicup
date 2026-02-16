const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const DJANGO_URL = process.env.NEXT_PUBLIC_DJANGO_URL || 'http://localhost:8000';

class HomeApi {
  constructor() {
    this.baseURL = API_URL;
    this.djangoURL = DJANGO_URL;
    this.cache = null;
    this.lastFetchTime = 0;
    this.CACHE_DURATION = 30000; // 30 секунд кэша
  }

  // Вспомогательная функция для получения полного URL медиа файла
  getFullMediaUrl(path) {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('/media/')) {
      return `${this.djangoURL}${path}`;
    }
    return `${this.djangoURL}/media/${path}`;
  }

  // Обработка данных: добавление полных URL для медиа файлов
  processMediaData(data) {
    if (!data) return data;
    
    // Создаем глубокую копию чтобы не мутировать оригинальные данные
    const processed = JSON.parse(JSON.stringify(data));
    
    // Обработка карусели
    if (processed.carousel && Array.isArray(processed.carousel)) {
      processed.carousel = processed.carousel.map(slide => ({
        ...slide,
        image_pc: this.getFullMediaUrl(slide.image_pc),
        image_phone: this.getFullMediaUrl(slide.image_phone),
        // Сохраняем оригинальные пути на всякий случай
        _image_pc_original: slide.image_pc,
        _image_phone_original: slide.image_phone,
      }));
    }
    
    // Обработка парных картинок
    if (processed.pair) {
      processed.pair = {
        ...processed.pair,
        image1: this.getFullMediaUrl(processed.pair.image1),
        image2: this.getFullMediaUrl(processed.pair.image2),
        _image1_original: processed.pair.image1,
        _image2_original: processed.pair.image2,
      };
    }
    
    // Обработка карты - ВАЖНО: добавили preview_image_phone
    if (processed.map) {
      processed.map = {
        ...processed.map,
        preview_image: this.getFullMediaUrl(processed.map.preview_image),
        preview_image_phone: this.getFullMediaUrl(processed.map.preview_image_phone), // ← ДОБАВЛЕНО
        _preview_image_original: processed.map.preview_image,
        _preview_image_phone_original: processed.map.preview_image_phone, // ← ДОБАВЛЕНО
      };
    }
    
    // Обработка дополнительных картинок - ВАЖНО: добавили image_phone
    if (processed.additional_images && Array.isArray(processed.additional_images)) {
      processed.additional_images = processed.additional_images.map(img => ({
        ...img,
        image: this.getFullMediaUrl(img.image),
        image_phone: this.getFullMediaUrl(img.image_phone), // ← ДОБАВЛЕНО
        _image_original: img.image,
        _image_phone_original: img.image_phone, // ← ДОБАВЛЕНО
      }));
    }
    
    return processed;
  }

  // Общий метод для запросов с кэшированием
  async request(endpoint = '', options = {}, useCache = true) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Проверяем кэш для GET запросов
    if (useCache && options.method === undefined && this.cache) {
      const now = Date.now();
      if (now - this.lastFetchTime < this.CACHE_DURATION) {
        return this.cache;
      }
    }

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-cache',
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      const result = {
        success: true,
        data,
        rawData: data, // Сохраняем оригинальные данные
        timestamp: Date.now(),
      };
      
      // Кэшируем результат для главной страницы
      if (endpoint === '/home/' && useCache) {
        this.cache = result;
        this.lastFetchTime = Date.now();
      }
      
      return result;
    } catch (error) {
      console.error('Ошибка при запросе:', error);
      
      // Если есть кэшированные данные, возвращаем их даже при ошибке
      if (this.cache && endpoint === '/home/') {
        console.warn('Используем кэшированные данные из-за ошибки сети');
        return {
          ...this.cache,
          fromCache: true,
          error: error.message,
        };
      }
      
      return {
        success: false,
        error: error.message,
        data: null,
        rawData: null,
      };
    }
  }

  // Очистить кэш
  clearCache() {
    this.cache = null;
    this.lastFetchTime = 0;
  }

  // Получить полные данные главной страницы с обработанными URL
  async getHomeData(forceRefresh = false, processMedia = true) {
    if (forceRefresh) {
      this.clearCache();
    }
    
    const result = await this.request('/home/', {}, !forceRefresh);
    
    if (result.success && result.data && processMedia) {
      // Обрабатываем медиа URL
      result.data = this.processMediaData(result.data);
    }
    
    return result;
  }

  // Получить только карусель с обработанными URL
  async getCarousel() {
    const result = await this.getHomeData(false, false); // Не обрабатываем здесь
    if (result.success && result.data) {
      if (!result.data.show_carousel) {
        return {
          success: false,
          error: 'Карусель отключена в настройках',
          data: [],
        };
      }
      
      const carousel = result.data.carousel || [];
      const processedCarousel = carousel.map(slide => ({
        ...slide,
        image_pc: this.getFullMediaUrl(slide.image_pc),
        image_phone: this.getFullMediaUrl(slide.image_phone),
      }));
      
      return {
        success: true,
        data: processedCarousel,
        hasImages: carousel.some(slide => slide.image_pc || slide.image_phone),
        count: carousel.length,
      };
    }
    return result;
  }

  // Получить пару картинок с обработанными URL
  async getPairImages() {
    const result = await this.getHomeData(false, false);
    if (result.success && result.data) {
      if (!result.data.show_pair) {
        return {
          success: false,
          error: 'Парные картинки отключены в настройках',
          data: null,
        };
      }
      
      const pair = result.data.pair || null;
      const processedPair = pair ? {
        ...pair,
        image1: this.getFullMediaUrl(pair.image1),
        image2: this.getFullMediaUrl(pair.image2),
      } : null;
      
      return {
        success: true,
        data: processedPair,
        hasImages: pair && (pair.image1 || pair.image2),
        hasLinks: pair && (pair.link1 || pair.link2),
      };
    }
    return result;
  }

  // Получить карту с обработанными URL - ВАЖНО: обновлено для мобильной версии
  async getMap() {
    const result = await this.getHomeData(false, false);
    if (result.success && result.data) {
      if (!result.data.show_map) {
        return {
          success: false,
          error: 'Карта отключена в настройках',
          data: null,
        };
      }
      
      const mapData = result.data.map || null;
      const processedMap = mapData ? {
        ...mapData,
        preview_image: this.getFullMediaUrl(mapData.preview_image),
        preview_image_phone: this.getFullMediaUrl(mapData.preview_image_phone), // ← ДОБАВЛЕНО
      } : null;
      
      return {
        success: true,
        data: processedMap,
        hasIframe: mapData && mapData.iframe_code,
        hasPreview: mapData && (mapData.preview_image || mapData.preview_image_phone), // ← ОБНОВЛЕНО
        hasPcPreview: mapData && mapData.preview_image,
        hasPhonePreview: mapData && mapData.preview_image_phone, // ← ДОБАВЛЕНО
      };
    }
    return result;
  }

  // Получить дополнительные картинки с обработанными URL - ВАЖНО: обновлено для мобильной версии
  async getAdditionalImages() {
    const result = await this.getHomeData(false, false);
    if (result.success && result.data) {
      if (!result.data.show_gallery) {
        return {
          success: false,
          error: 'Галерея отключена в настройках',
          data: [],
        };
      }
      
      const images = result.data.additional_images || [];
      const processedImages = images.map(img => ({
        ...img,
        image: this.getFullMediaUrl(img.image),
        image_phone: this.getFullMediaUrl(img.image_phone), // ← ДОБАВЛЕНО
      }));
      
      return {
        success: true,
        data: processedImages,
        count: images.length,
        hasImages: images.some(img => img.image || img.image_phone), // ← ОБНОВЛЕНО
        hasPcImages: images.some(img => img.image), // ← ДОБАВЛЕНО
        hasPhoneImages: images.some(img => img.image_phone), // ← ДОБАВЛЕНО
        hasLinks: images.some(img => img.link),
      };
    }
    return result;
  }

  // Проверить какие блоки включены
  async getActiveBlocks() {
    const result = await this.getHomeData(false, false);
    if (result.success && result.data) {
      return {
        success: true,
        data: {
          show_carousel: result.data.show_carousel || false,
          show_pair: result.data.show_pair || false,
          show_map: result.data.show_map || false,
          show_gallery: result.data.show_gallery || false,
        },
      };
    }
    return result;
  }

  // Получить статистику по блокам - ВАЖНО: обновлено
  async getBlockStats() {
    const result = await this.getHomeData(false, false);
    if (result.success && result.data) {
      const data = result.data;
      
      const stats = {
        blocksEnabled: {
          carousel: data.show_carousel || false,
          pair: data.show_pair || false,
          map: data.show_map || false,
          gallery: data.show_gallery || false,
        },
        contentStats: {
          carouselSlides: (data.carousel || []).length,
          carouselHasPcImages: (data.carousel || []).some(slide => slide.image_pc), // ← ОБНОВЛЕНО
          carouselHasPhoneImages: (data.carousel || []).some(slide => slide.image_phone), // ← ОБНОВЛЕНО
          pairHasImages: data.pair && (data.pair.image1 || data.pair.image2),
          mapHasIframe: data.map && data.map.iframe_code,
          mapHasPcPreview: data.map && data.map.preview_image, // ← ОБНОВЛЕНО
          mapHasPhonePreview: data.map && data.map.preview_image_phone, // ← ДОБАВЛЕНО
          galleryImages: (data.additional_images || []).length,
          galleryHasPcImages: (data.additional_images || []).some(img => img.image), // ← ОБНОВЛЕНО
          galleryHasPhoneImages: (data.additional_images || []).some(img => img.image_phone), // ← ДОБАВЛЕНО
        },
        activeBlocksCount: [
          data.show_carousel,
          data.show_pair,
          data.show_map,
          data.show_gallery,
        ].filter(Boolean).length,
      };
      
      return {
        success: true,
        data: stats,
      };
    }
    return result;
  }

  // Проверить доступность API
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/home/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return {
        success: response.ok,
        status: response.status,
        online: response.ok,
      };
    } catch (error) {
      return {
        success: false,
        online: false,
        error: error.message,
      };
    }
  }

  // Проверить доступность медиа файла
  async checkMediaFile(url) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors', // Для обхода CORS при проверке
      });
      
      return {
        success: true,
        exists: true,
        url,
      };
    } catch (error) {
      return {
        success: false,
        exists: false,
        url,
        error: error.message,
      };
    }
  }

  // Получить все медиа файлы с проверкой - ВАЖНО: обновлено
  async getAllMediaWithCheck() {
    const result = await this.getHomeData();
    
    if (!result.success || !result.data) {
      return result;
    }
    
    const mediaFiles = [];
    
    // Собираем все медиа файлы
    if (result.data.carousel) {
      result.data.carousel.forEach(slide => {
        if (slide.image_pc) mediaFiles.push(slide.image_pc);
        if (slide.image_phone) mediaFiles.push(slide.image_phone);
      });
    }
    
    if (result.data.pair) {
      if (result.data.pair.image1) mediaFiles.push(result.data.pair.image1);
      if (result.data.pair.image2) mediaFiles.push(result.data.pair.image2);
    }
    
    // ВАЖНО: добавляем оба варианта карты
    if (result.data.map) {
      if (result.data.map.preview_image) mediaFiles.push(result.data.map.preview_image);
      if (result.data.map.preview_image_phone) mediaFiles.push(result.data.map.preview_image_phone); // ← ДОБАВЛЕНО
    }
    
    // ВАЖНО: добавляем оба варианта галереи
    if (result.data.additional_images) {
      result.data.additional_images.forEach(img => {
        if (img.image) mediaFiles.push(img.image);
        if (img.image_phone) mediaFiles.push(img.image_phone); // ← ДОБАВЛЕНО
      });
    }
    
    // Проверяем каждый файл
    const checkPromises = mediaFiles.map(url => this.checkMediaFile(url));
    const checkResults = await Promise.all(checkPromises);
    
    return {
      ...result,
      mediaCheck: {
        total: mediaFiles.length,
        available: checkResults.filter(r => r.exists).length,
        unavailable: checkResults.filter(r => !r.exists).length,
        results: checkResults,
      },
    };
  }

  // Новый метод: получить подходящее изображение для устройства
  getDeviceImage(item, deviceType = 'auto') {
    if (!item) return null;
    
    if (deviceType === 'phone' || (deviceType === 'auto' && this.isMobileDevice())) {
      // Для телефона сначала пробуем мобильную версию, потом обычную
      return item.image_phone || item.image || item.preview_image_phone || item.preview_image;
    } else {
      // Для ПК сначала пробуем ПК версию, потом обычную
      return item.image_pc || item.image || item.preview_image || item.preview_image_phone;
    }
  }

  // Вспомогательный метод для определения мобильного устройства
  isMobileDevice() {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
}

// Создаем экземпляр
const homeApi = new HomeApi();

export default homeApi;