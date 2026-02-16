// lib\promotionsApi.js
const API_URL = 'http://127.0.0.1:8000/api/promotions';

class PromotionsAPI {
  // Получить список акций
  static async getPromotions(showAll = false) {
    try {
      const url = `${API_URL}/promotions/${showAll ? '?all=true' : ''}`;
      console.log('[Promotions] Запрос акций:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Обработка пагинированного ответа
      if (data.results) {
        return {
          results: data.results || [],
          count: data.count || data.results.length
        };
      }
      
      // Обработка обычного массива
      return {
        results: Array.isArray(data) ? data : [],
        count: Array.isArray(data) ? data.length : 0
      };
      
    } catch (error) {
      console.error('Error in getPromotions:', error.message);
      return { results: [], count: 0 };
    }
  }

  // Получить одну акцию по slug
  static async getPromotion(slug) {
    try {
      const url = `${API_URL}/promotions/${slug}/`;
      console.log('[Promotions] Запрос акции:', url);
      
      const response = await fetch(url, {
        cache: 'no-store',
      });
      
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Ошибка загрузки акции');
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('Error in getPromotion:', error.message);
      return null;
    }
  }

  // Получить популярные акции
  static async getFeaturedPromotions() {
    try {
      const url = `${API_URL}/promotions/featured/`;
      const response = await fetch(url, { cache: 'no-store' });
      
      if (!response.ok) throw new Error('Ошибка загрузки популярных акций');
      
      const data = await response.json();
      return Array.isArray(data) ? data : [];
      
    } catch (error) {
      console.error('Error in getFeaturedPromotions:', error.message);
      return [];
    }
  }
}

export default PromotionsAPI;