//lib/api.js
// lib/api.js - ОБНОВЛЕННЫЙ ДЛЯ НОВОЙ СТРУКТУРЫ

const API_URL = 'http://localhost:8000/api/accounts';

class AuthAPI {
  static csrfToken = null;
  static isStaff = false; // Флаг - является ли пользователь персоналом

  // ==========================================================================
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // ==========================================================================

  /**
   * Метод для чтения кук из браузера
   * Используется для получения CSRF токена, который Django автоматически
   * устанавливает в cookies при первом запросе
   */
  static getCookie(name) {
    // Проверяем что мы в браузере (не на сервере при SSR)
    if (typeof document === 'undefined') return null;
    
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        // Ищем куку с нужным именем
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  /**
   * Получить CSRF токен с сервера
   * В Django REST Framework с сессиями CSRF токен обычно уже в куках,
   * но иногда нужно явно запросить
   */
  static async getCSRFToken() {
    try {
      console.log('[API] Запрашиваем CSRF токен...');
      
      const response = await fetch(`${API_URL}/csrf/`, {
        method: 'GET',
        credentials: 'include', // Важно! Отправляем cookies
      });
      
      console.log('[API] CSRF ответ статус:', response.status);
      
      // Пробуем получить токен из кук (основной способ в Django)
      const csrfTokenFromCookie = this.getCookie('csrftoken');
      console.log('[API] CSRF из cookies:', csrfTokenFromCookie ? 'получен' : 'нет');
      
      if (csrfTokenFromCookie) {
        this.csrfToken = csrfTokenFromCookie;
        return { success: true, token: csrfTokenFromCookie };
      }
      
      // Если не получили из кук, пробуем из ответа сервера
      let data = {};
      try {
        const text = await response.text();
        if (text) {
          data = JSON.parse(text);
        }
      } catch (e) {
        console.log('[API] CSRF endpoint не вернул JSON');
      }
      
      if (data.csrfToken) {
        this.csrfToken = data.csrfToken;
        return { success: true, token: data.csrfToken };
      }
      
      // Fallback для разработки
      console.warn('[API] CSRF токен не найден, используем fallback');
      this.csrfToken = 'dev-csrf-token';
      return { success: true, token: 'dev-csrf-token' };
      
    } catch (error) {
      console.error('[API] Ошибка получения CSRF:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Убедиться что у нас есть CSRF токен
   * Проверяет в памяти, потом в куках, потом запрашивает у сервера
   */
  static async ensureCSRFToken() {
    // Если уже есть в памяти и это не dev-токен
    if (this.csrfToken && this.csrfToken !== 'dev-csrf-token') {
      return { success: true, token: this.csrfToken };
    }
    
    // Пробуем получить из кук
    const csrfFromCookie = this.getCookie('csrftoken');
    if (csrfFromCookie) {
      this.csrfToken = csrfFromCookie;
      return { success: true, token: csrfFromCookie };
    }
    
    // Запрашиваем у сервера
    return await this.getCSRFToken();
  }

  // ==========================================================================
  // АУТЕНТИФИКАЦИЯ И РЕГИСТРАЦИЯ
  // ==========================================================================

  /**
   * Регистрация нового пользователя (клиента кофейни)
   * @param {Object} userData - данные пользователя
   * @returns {Promise} результат регистрации
   */
  static async register(userData) {
    try {
      console.log('[API] Регистрация пользователя:', userData.email);
      
      const csrfResult = await this.ensureCSRFToken();
      if (!csrfResult.success) {
        throw new Error('Не удалось получить CSRF токен');
      }
      
      const response = await fetch(`${API_URL}/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfResult.token,
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          password_confirm: userData.password_confirm,
          first_name: userData.first_name,
          phone: userData.phone || '',
        }),
        credentials: 'include', // Важно для сессий!
      });
      
      const data = await response.json();
      console.log('[API] Ответ регистрации:', data);
      
      if (!response.ok) {
        // Обработка ошибок валидации
        const errors = [];
        if (data.email) errors.push(`Email: ${data.email[0]}`);
        if (data.password) errors.push(`Пароль: ${data.password[0]}`);
        if (data.password_confirm) errors.push(`Подтверждение пароля: ${data.password_confirm[0]}`);
        if (data.first_name) errors.push(`Имя: ${data.first_name[0]}`);
        if (data.phone) errors.push(`Телефон: ${data.phone[0]}`);
        if (data.non_field_errors) errors.push(data.non_field_errors[0]);
        
        throw new Error(errors.join(', ') || 'Ошибка регистрации');
      }
      
      // После успешной регистрации обновляем флаг персонала
      if (data.user) {
        this.isStaff = data.user.is_staff || false;
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка регистрации:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Вход в систему (создает сессию на сервере)
   * @param {string} email - email пользователя
   * @param {string} password - пароль
   * @returns {Promise} результат входа
   */
  static async login(email, password) {
    try {
      console.log('[API] Вход пользователя:', email);
      
      const csrfResult = await this.ensureCSRFToken();
      if (!csrfResult.success) {
        throw new Error('Не удалось получить CSRF токен');
      }
      
      const response = await fetch(`${API_URL}/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfResult.token,
        },
        body: JSON.stringify({ 
          email: email,  // Изменили с username на email
          password: password 
        }),
        credentials: 'include', // Критически важно для сессий!
      });
      
      const data = await response.json();
      console.log('[API] Ответ входа:', data);
      
      if (!response.ok) {
        // Обработка ошибок аутентификации
        if (data.non_field_errors) {
          throw new Error(data.non_field_errors[0]);
        }
        if (data.detail) {
          throw new Error(data.detail);
        }
        throw new Error('Неверный email или пароль');
      }
      
      // Обновляем флаг персонала
      if (data.user) {
        this.isStaff = data.user.is_staff || false;
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка входа:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Выход из системы (удаляет сессию на сервере)
   * @returns {Promise} результат выхода
   */
  static async logout() {
    try {
      console.log('[API] Выход из системы');
      
      const csrfResult = await this.ensureCSRFToken();
      
      const response = await fetch(`${API_URL}/logout/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfResult.token || 'dev-csrf-token',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Если 403 - проблема с CSRF, пробуем без него
        if (response.status === 403) {
          console.warn('[API] CSRF ошибка, пробуем без токена');
          const retryResponse = await fetch(`${API_URL}/logout/`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (retryResponse.ok) {
            // Сбрасываем состояние
            this.csrfToken = null;
            this.isStaff = false;
            return { success: true, data: { detail: 'Успешный выход' } };
          }
        }
        
        throw new Error(data.detail || `Ошибка выхода (${response.status})`);
      }
      
      // Сбрасываем состояние
      this.csrfToken = null;
      this.isStaff = false;
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка выхода:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Проверка текущей авторизации пользователя
   * @returns {Promise} информация об авторизации
   */
  static async checkAuth() {
    try {
      console.log('[API] Проверка авторизации');
      
      const response = await fetch(`${API_URL}/check-auth/`, {
        method: 'GET',
        credentials: 'include',
      });
      
      const data = await response.json();
      console.log('[API] Статус авторизации:', data.authenticated ? 'авторизован' : 'нет');
      
      if (data.authenticated && data.user) {
        this.isStaff = data.user.is_staff || false;
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка проверки авторизации:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
  // ==========================================================================

  /**
   * Получить профиль текущего пользователя
   * @returns {Promise} данные профиля
   */
  static async getProfile() {
    try {
      console.log('[API] Получение профиля');
      
      const response = await fetch(`${API_URL}/profile/`, {
        method: 'GET',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Если 401 - не авторизован, это нормально
        if (response.status === 401) {
          return { success: true, data: null };
        }
        throw new Error(data.detail || 'Ошибка получения профиля');
      }
      
      // Обновляем флаг персонала
      if (data.is_staff !== undefined) {
        this.isStaff = data.is_staff;
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка получения профиля:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Обновить профиль пользователя
   * @param {Object} updates - обновленные данные
   * @returns {Promise} результат обновления
   */
  static async updateProfile(updates) {
    try {
      console.log('[API] Обновление профиля:', updates);
      
      const csrfResult = await this.ensureCSRFToken();
      if (!csrfResult.success) {
        throw new Error('Не удалось получить CSRF токен');
      }
      
      const response = await fetch(`${API_URL}/profile/`, {
        method: 'PATCH', // Используем PATCH для частичного обновления
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfResult.token,
        },
        body: JSON.stringify(updates),
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Обработка ошибок валидации
        const errors = [];
        if (data.email) errors.push(`Email: ${data.email[0]}`);
        if (data.first_name) errors.push(`Имя: ${data.first_name[0]}`);
        if (data.phone) errors.push(`Телефон: ${data.phone[0]}`);
        if (errors.length > 0) {
          throw new Error(errors.join(', '));
        }
        throw new Error(data.detail || 'Ошибка обновления профиля');
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка обновления профиля:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Смена пароля пользователя
   * @param {string} oldPassword - текущий пароль
   * @param {string} newPassword - новый пароль
   * @param {string} newPasswordConfirm - подтверждение нового пароля
   * @returns {Promise} результат смены пароля
   */
  static async changePassword(oldPassword, newPassword, newPasswordConfirm) {
    try {
      console.log('[API] Смена пароля');
      
      const csrfResult = await this.ensureCSRFToken();
      if (!csrfResult.success) {
        throw new Error('Не удалось получить CSRF токен');
      }
      
      const response = await fetch(`${API_URL}/profile/change_password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfResult.token,
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
          new_password_confirm: newPasswordConfirm,
        }),
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const errors = [];
        if (data.old_password) errors.push(`Текущий пароль: ${data.old_password[0]}`);
        if (data.new_password) errors.push(`Новый пароль: ${data.new_password[0]}`);
        if (data.new_password_confirm) errors.push(`Подтверждение: ${data.new_password_confirm[0]}`);
        if (errors.length > 0) {
          throw new Error(errors.join(', '));
        }
        throw new Error(data.detail || 'Ошибка смены пароля');
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка смены пароля:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Получить штрихкод пользователя
   * @returns {Promise} данные штрихкода
   */
  static async getBarcode() {
    try {
      console.log('[API] Получение штрихкода');
      
      const response = await fetch(`${API_URL}/profile/barcode/`, {
        method: 'GET',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.detail) {
          throw new Error(data.detail);
        }
        if (data.error) {
          throw new Error(data.error);
        }
        throw new Error('Ошибка получения штрихкода');
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка получения штрихкода:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // ИСТОРИЯ ПОКУПОК
  // ==========================================================================

  /**
   * Получить историю покупок текущего пользователя
   * @returns {Promise} список покупок
   */
  static async getPurchaseHistory() {
    try {
      console.log('[API] Получение истории покупок');
      
      const response = await fetch(`${API_URL}/purchases/`, {
        method: 'GET',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Если 401 - не авторизован
        if (response.status === 401) {
          return { success: true, data: [] };
        }
        throw new Error(data.detail || 'Ошибка получения истории покупок');
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка получения истории покупок:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Получить детали конкретной покупки
   * @param {number} purchaseId - ID покупки
   * @returns {Promise} данные покупки
   */
  static async getPurchaseDetail(purchaseId) {
    try {
      console.log('[API] Получение деталей покупки:', purchaseId);
      
      const response = await fetch(`${API_URL}/purchases/${purchaseId}/`, {
        method: 'GET',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Покупка не найдена');
        }
        throw new Error(data.detail || 'Ошибка получения деталей покупки');
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка получения деталей покупки:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // КАССОВЫЙ ФУНКЦИОНАЛ (только для персонала)
  // ==========================================================================

  /**
   * Поиск клиента по штрихкоду (для кассы)
   * Требует прав персонала (is_staff)
   * @param {string} barcode - штрихкод клиента
   * @returns {Promise} данные клиента
   */
  static async findCustomerByBarcode(barcode) {
    try {
      console.log('[API] Поиск клиента по штрихкоду:', barcode);
      
      const csrfResult = await this.ensureCSRFToken();
      if (!csrfResult.success) {
        throw new Error('Не удалось получить CSRF токен');
      }
      
      const response = await fetch(`${API_URL}/pos/find_by_barcode/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfResult.token,
        },
        body: JSON.stringify({ barcode }),
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Доступ запрещен. Требуются права персонала.');
        }
        if (data.error) {
          throw new Error(data.error);
        }
        if (data.detail) {
          throw new Error(data.detail);
        }
        throw new Error('Ошибка поиска клиента');
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка поиска клиента:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Оформление покупки (для кассы)
   * Требует прав персонала
   * @param {Object} purchaseData - данные покупки
   * @returns {Promise} результат покупки
   */
  static async processPurchase(purchaseData) {
    try {
      console.log('[API] Оформление покупки:', purchaseData);
      
      const csrfResult = await this.ensureCSRFToken();
      if (!csrfResult.success) {
        throw new Error('Не удалось получить CSRF токен');
      }
      
      const response = await fetch(`${API_URL}/pos/purchase/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfResult.token,
        },
        body: JSON.stringify(purchaseData),
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Доступ запрещен. Требуются права персонала.');
        }
        if (data.error) {
          throw new Error(data.error);
        }
        throw new Error('Ошибка оформления покупки');
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка оформления покупки:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Быстрая покупка (без использования баллов)
   * Требует прав персонала
   * @param {Object} purchaseData - данные покупки
   * @returns {Promise} результат покупки
   */
  static async quickPurchase(purchaseData) {
    try {
      console.log('[API] Быстрая покупка:', purchaseData);
      
      const csrfResult = await this.ensureCSRFToken();
      if (!csrfResult.success) {
        throw new Error('Не удалось получить CSRF токен');
      }
      
      const response = await fetch(`${API_URL}/pos/quick_purchase/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfResult.token,
        },
        body: JSON.stringify(purchaseData),
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Доступ запрещен. Требуются права персонала.');
        }
        if (data.error) {
          throw new Error(data.error);
        }
        throw new Error('Ошибка оформления быстрой покупки');
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка быстрой покупки:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Расчет скидки перед покупкой
   * Требует прав персонала
   * @param {Object} calculationData - данные для расчета
   * @returns {Promise} расчет скидки
   */
  static async calculateDiscount(calculationData) {
    try {
      console.log('[API] Расчет скидки:', calculationData);
      
      const csrfResult = await this.ensureCSRFToken();
      if (!csrfResult.success) {
        throw new Error('Не удалось получить CSRF токен');
      }
      
      const response = await fetch(`${API_URL}/pos/calculate_discount/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfResult.token,
        },
        body: JSON.stringify(calculationData),
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Доступ запрещен. Требуются права персонала.');
        }
        if (data.error) {
          throw new Error(data.error);
        }
        throw new Error('Ошибка расчета скидки');
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка расчета скидки:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // СТАТИСТИКА
  // ==========================================================================

  /**
   * Получить статистику текущего пользователя
   * @returns {Promise} статистика пользователя
   */
  static async getStatistics() {
    try {
      console.log('[API] Получение статистики');
      
      const response = await fetch(`${API_URL}/statistics/`, {
        method: 'GET',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          return { success: true, data: null };
        }
        throw new Error(data.detail || 'Ошибка получения статистики');
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка получения статистики:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // АДМИНИСТРАТИВНЫЕ ФУНКЦИИ (только для админов)
  // ==========================================================================

  /**
   * Получить список всех пользователей (админка)
   * Требует прав администратора
   * @returns {Promise} список пользователей
   */
  static async getAdminUsers() {
    try {
      console.log('[API] Получение списка пользователей (админка)');
      
      const response = await fetch(`${API_URL}/admin/users/`, {
        method: 'GET',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Доступ запрещен. Требуются права администратора.');
        }
        throw new Error(data.detail || 'Ошибка получения списка пользователей');
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка получения списка пользователей:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Получить статистику кофейни (админка)
   * Требует прав администратора
   * @returns {Promise} статистика кофейни
   */
  static async getAdminDashboard() {
    try {
      console.log('[API] Получение статистики кофейни (админка)');
      
      const response = await fetch(`${API_URL}/admin/dashboard/`, {
        method: 'GET',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Доступ запрещен. Требуются права администратора.');
        }
        throw new Error(data.detail || 'Ошибка получения статистики кофейни');
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка получения статистики кофейни:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // ПУБЛИЧНЫЕ ФУНКЦИИ (без авторизации)
  // ==========================================================================

  /**
   * Проверить доступность email при регистрации
   * @param {string} email - email для проверки
   * @returns {Promise} результат проверки
   */
  static async checkEmail(email) {
    try {
      console.log('[API] Проверка email:', email);
      
      const response = await fetch(`${API_URL}/check-email/${email}/`, {
        method: 'GET',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Ошибка проверки email');
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка проверки email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Проверить доступность телефона
   * @param {string} phone - телефон для проверки
   * @returns {Promise} результат проверки
   */
  static async checkPhone(phone) {
    try {
      console.log('[API] Проверка телефона:', phone);
      
      const response = await fetch(`${API_URL}/check-phone/${phone}/`, {
        method: 'GET',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Ошибка проверки телефона');
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка проверки телефона:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Получить информацию о программе лояльности
   * @returns {Promise} информация о лояльности
   */
  static async getLoyaltyInfo() {
    try {
      console.log('[API] Получение информации о лояльности');
      
      const response = await fetch(`${API_URL}/loyalty-info/`, {
        method: 'GET',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Ошибка получения информации о лояльности');
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка получения информации о лояльности:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Проверить валидность штрихкода
   * @param {string} barcode - штрихкод для проверки
   * @returns {Promise} результат проверки
   */
  static async validateBarcode(barcode) {
    try {
      console.log('[API] Проверка штрихкода:', barcode);
      
      const response = await fetch(`${API_URL}/validate-barcode/${barcode}/`, {
        method: 'GET',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Ошибка проверки штрихкода');
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('[API] Ошибка проверки штрихкода:', error);
      return { success: false, error: error.message };
    }
  }
}

// Инициализация при загрузке модуля (только в браузере)
if (typeof window !== 'undefined') {
  console.log('[API] Инициализация API модуля');
  
  // Автоматически получаем CSRF токен при загрузке
  AuthAPI.ensureCSRFToken().then(result => {
    if (result.success) {
      console.log('[API] CSRF токен инициализирован');
    } else {
      console.warn('[API] Не удалось инициализировать CSRF токен:', result.error);
    }
  }).catch(err => {
    console.error('[API] Ошибка инициализации CSRF:', err);
  });
}

export default AuthAPI;