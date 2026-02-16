
const BLOG_API_URL = 'http://127.0.0.1:8000/api/blog';

class BlogAPI {
  // Получить список статей
  static async getPosts(page = 1, categorySlug = '') {
    try {
      let url = `${BLOG_API_URL}/posts/`;
      
      // Если указана категория, используем специальный endpoint
      if (categorySlug) {
        url = `${BLOG_API_URL}/posts/by_category/?category_slug=${categorySlug}`;
      } else {
        const params = new URLSearchParams();
        if (page > 1) params.append('page', page);
        url = `${url}?${params}`;
      }
      
      console.log('Fetching from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      
        signal: AbortSignal.timeout(5000),
      });
      
      console.log('Posts API Response:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Posts data structure:', data);
      
      // Обработка пагинированного ответа
      if (data.results) {
        return {
          results: data.results,
          count: data.count || data.results.length
        };
      }
      
      // Обработка обычного массива
      return {
        results: Array.isArray(data) ? data : [],
        count: Array.isArray(data) ? data.length : 0
      };
      
    } catch (error) {
      console.error('Error in getPosts:', error.message, error);
      return { results: [], count: 0 };
    }
  }

  // Получить одну статью по slug
  static async getPost(slug) {
    try {
      const url = `${BLOG_API_URL}/posts/${slug}/`;
      console.log('Fetching post from:', url);
      
      const response = await fetch(url, {
        credentials: 'include',
        signal: AbortSignal.timeout(5000),
      });
      
      console.log('Post API Response:', response.status, response.statusText);
      
      if (response.status === 404) {
        console.log('Post not found');
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`Ошибка загрузки статьи: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Post data received');
      return data;
      
    } catch (error) {
      console.error('Error in getPost:', error.message, error);
      return null;
    }
  }

  // Получить категории
  static async getCategories() {
    try {
      const url = `${BLOG_API_URL}/categories/`;
      console.log('[API] Запрос категорий по URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      console.log('[API] Статус ответа:', response.status, response.statusText);
      
      if (!response.ok) {
        console.error('[API] Ошибка HTTP:', response.status);
        const errorText = await response.text();
        console.error('[API] Текст ошибки:', errorText);
        return [];
      }
      
      const data = await response.json();
      console.log('[API] Полученные данные:', data);
      
      if (!Array.isArray(data)) {
        console.error('[API] Ответ не является массивом:', typeof data);
        return [];
      }
      
      console.log(`[API] Загружено категорий: ${data.length}`);
      if (data.length > 0) {
        console.log('Категории:');
        data.forEach((cat, index) => {
          console.log(`   ${index + 1}. ${cat.name} (slug: ${cat.slug})`);
        });
      }
      
      return data;
      
    } catch (error) {
      console.error('[API] Фатальная ошибка:', error.message);
      console.error('[API] Стек ошибки:', error.stack);
      return [];
    }
  }
}

export default BlogAPI;