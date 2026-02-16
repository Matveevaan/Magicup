//lib/auth.js

import AuthAPI from './api';

class AuthService {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.isStaff = false; // Является ли пользователь персоналом
    this.loading = false;
    this.error = null;
    
    // Загружаем пользователя при создании сервиса
    if (typeof window !== 'undefined') {
      this.loadUser();
    }
  }

  /**
   * Загрузить информацию о текущем пользователе
   * Вызывается при загрузке приложения для восстановления сессии
   * @returns {Promise} результат загрузки
   */
  async loadUser() {
    this.loading = true;
    try {
      console.log('[Auth] Загрузка пользователя...');
      
      const result = await AuthAPI.checkAuth();
      
      if (result.success) {
        if (result.data.authenticated && result.data.user) {
          this.user = result.data.user;
          this.isAuthenticated = true;
          this.isStaff = result.data.user.is_staff || false;
          
          console.log('[Auth] Пользователь загружен:', this.user.email);
          console.log('[Auth] Статус персонала:', this.isStaff ? 'да' : 'нет');
          
          return { success: true, user: this.user, isStaff: this.isStaff };
        } else {
          this.user = null;
          this.isAuthenticated = false;
          this.isStaff = false;
          
          console.log('[Auth] Пользователь не авторизован');
          return { success: true, user: null, isStaff: false };
        }
      } else {
        this.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.error = error.message;
      console.error('[Auth] Ошибка загрузки пользователя:', error);
      return { success: false, error: error.message };
    } finally {
      this.loading = false;
    }
  }

  /**
   * Регистрация нового пользователя
   * @param {Object} userData - данные пользователя
   * @returns {Promise} результат регистрации
   */
  async register(userData) {
    this.loading = true;
    this.error = null;
    
    try {
      console.log('[Auth] Регистрация нового пользователя:', userData.email);
      
      const result = await AuthAPI.register(userData);
      
      if (result.success) {
        // После успешной регистрации сразу логиним пользователя
        this.user = result.data.user || result.data;
        this.isAuthenticated = true;
        this.isStaff = this.user?.is_staff || false;
        
        console.log('[Auth] Регистрация успешна:', this.user.email);
        
        return { 
          success: true, 
          user: this.user,
          isStaff: this.isStaff 
        };
      } else {
        this.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.error = error.message;
      console.error('[Auth] Ошибка регистрации:', error);
      return { success: false, error: error.message };
    } finally {
      this.loading = false;
    }
  }

  /**
   * Вход в систему
   * @param {string} email - email пользователя
   * @param {string} password - пароль
   * @returns {Promise} результат входа
   */
  async login(email, password) {
    this.loading = true;
    this.error = null;
    
    try {
      console.log('[Auth] Вход пользователя:', email);
      
      const result = await AuthAPI.login(email, password);
      
      if (result.success) {
        // Получаем полный профиль после успешного входа
        const profileResult = await AuthAPI.getProfile();
        
        if (profileResult.success && profileResult.data) {
          this.user = profileResult.data;
        } else {
          this.user = result.data.user || result.data;
        }
        
        this.isAuthenticated = true;
        this.isStaff = this.user?.is_staff || false;
        
        console.log('[Auth] Вход успешен:', this.user.email);
        console.log('[Auth] Статус персонала:', this.isStaff ? 'да' : 'нет');
        
        return { 
          success: true, 
          user: this.user,
          isStaff: this.isStaff 
        };
      } else {
        this.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.error = error.message;
      console.error('[Auth] Ошибка входа:', error);
      return { success: false, error: error.message };
    } finally {
      this.loading = false;
    }
  }

  /**
   * Выход из системы
   * @returns {Promise} результат выхода
   */
  async logout() {
    this.loading = true;
    
    try {
      console.log('[Auth] Выход пользователя');
      
      const result = await AuthAPI.logout();
      
      if (result.success) {
        this.user = null;
        this.isAuthenticated = false;
        this.isStaff = false;
        
        console.log('[Auth] Выход успешен');
        
        return { success: true };
      } else {
        this.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.error = error.message;
      console.error('[Auth] Ошибка выхода:', error);
      return { success: false, error: error.message };
    } finally {
      this.loading = false;
    }
  }

  /**
   * Получить профиль текущего пользователя
   * @returns {Promise} данные профиля
   */
  async getProfile() {
    try {
      console.log('[Auth] Получение профиля');
      
      const result = await AuthAPI.getProfile();
      
      if (result.success) {
        if (result.data) {
          this.user = result.data;
          this.isAuthenticated = true;
          this.isStaff = result.data.is_staff || false;
        }
        return result;
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      console.error('[Auth] Ошибка получения профиля:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Обновить профиль пользователя
   * @param {Object} updates - обновленные данные
   * @returns {Promise} результат обновления
   */
  async updateProfile(updates) {
    this.loading = true;
    
    try {
      console.log('[Auth] Обновление профиля');
      
      const result = await AuthAPI.updateProfile(updates);
      
      if (result.success) {
        // Обновляем локальные данные пользователя
        this.user = { ...this.user, ...updates };
        
        return { success: true, user: this.user };
      } else {
        this.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.error = error.message;
      console.error('[Auth] Ошибка обновления профиля:', error);
      return { success: false, error: error.message };
    } finally {
      this.loading = false;
    }
  }

  /**
   * Смена пароля пользователя
   * @param {string} oldPassword - текущий пароль
   * @param {string} newPassword - новый пароль
   * @param {string} newPasswordConfirm - подтверждение нового пароля
   * @returns {Promise} результат смены пароля
   */
  async changePassword(oldPassword, newPassword, newPasswordConfirm) {
    this.loading = true;
    
    try {
      console.log('[Auth] Смена пароля');
      
      const result = await AuthAPI.changePassword(oldPassword, newPassword, newPasswordConfirm);
      
      if (result.success) {
        return { success: true };
      } else {
        this.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.error = error.message;
      console.error('[Auth] Ошибка смены пароля:', error);
      return { success: false, error: error.message };
    } finally {
      this.loading = false;
    }
  }

  /**
   * Получить штрихкод пользователя
   * @returns {Promise} данные штрихкода
   */
  async getBarcode() {
    try {
      console.log('[Auth] Получение штрихкода');
      
      const result = await AuthAPI.getBarcode();
      
      return result;
    } catch (error) {
      console.error('[Auth] Ошибка получения штрихкода:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Получить историю покупок пользователя
   * @returns {Promise} список покупок
   */
  async getPurchaseHistory() {
    try {
      console.log('[Auth] Получение истории покупок');
      
      const result = await AuthAPI.getPurchaseHistory();
      
      return result;
    } catch (error) {
      console.error('[Auth] Ошибка получения истории покупок:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Получить детали покупки
   * @param {number} purchaseId - ID покупки
   * @returns {Promise} данные покупки
   */
  async getPurchaseDetail(purchaseId) {
    try {
      console.log('[Auth] Получение деталей покупки:', purchaseId);
      
      const result = await AuthAPI.getPurchaseDetail(purchaseId);
      
      return result;
    } catch (error) {
      console.error('[Auth] Ошибка получения деталей покупки:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Получить статистику пользователя
   * @returns {Promise} статистика
   */
  async getStatistics() {
    try {
      console.log('[Auth] Получение статистики');
      
      const result = await AuthAPI.getStatistics();
      
      return result;
    } catch (error) {
      console.error('[Auth] Ошибка получения статистики:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // КАССОВЫЕ ФУНКЦИИ (только для персонала)
  // ==========================================================================

  /**
   * Поиск клиента по штрихкоду (для кассы)
   * Проверяет права персонала перед вызовом
   * @param {string} barcode - штрихкод клиента
   * @returns {Promise} результат поиска
   */
  async findCustomerByBarcode(barcode) {
    // Проверяем что пользователь имеет права персонала
    if (!this.isStaff) {
      const error = 'Доступ запрещен. Требуются права персонала.';
      console.error('[Auth]', error);
      return { success: false, error };
    }
    
    try {
      console.log('[Auth] Поиск клиента по штрихкоду:', barcode);
      
      const result = await AuthAPI.findCustomerByBarcode(barcode);
      
      return result;
    } catch (error) {
      console.error('[Auth] Ошибка поиска клиента:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Оформление покупки (для кассы)
   * Проверяет права персонала
   * @param {Object} purchaseData - данные покупки
   * @returns {Promise} результат покупки
   */
  async processPurchase(purchaseData) {
    if (!this.isStaff) {
      const error = 'Доступ запрещен. Требуются права персонала.';
      console.error('[Auth]', error);
      return { success: false, error };
    }
    
    try {
      console.log('[Auth] Оформление покупки');
      
      const result = await AuthAPI.processPurchase(purchaseData);
      
      return result;
    } catch (error) {
      console.error('[Auth] Ошибка оформления покупки:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Быстрая покупка (без баллов)
   * Проверяет права персонала
   * @param {Object} purchaseData - данные покупки
   * @returns {Promise} результат покупки
   */
  async quickPurchase(purchaseData) {
    if (!this.isStaff) {
      const error = 'Доступ запрещен. Требуются права персонала.';
      console.error('[Auth]', error);
      return { success: false, error };
    }
    
    try {
      console.log('[Auth] Быстрая покупка');
      
      const result = await AuthAPI.quickPurchase(purchaseData);
      
      return result;
    } catch (error) {
      console.error('[Auth] Ошибка быстрой покупки:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Расчет скидки перед покупкой
   * Проверяет права персонала
   * @param {Object} calculationData - данные для расчета
   * @returns {Promise} расчет скидки
   */
  async calculateDiscount(calculationData) {
    if (!this.isStaff) {
      const error = 'Доступ запрещен. Требуются права персонала.';
      console.error('[Auth]', error);
      return { success: false, error };
    }
    
    try {
      console.log('[Auth] Расчет скидки');
      
      const result = await AuthAPI.calculateDiscount(calculationData);
      
      return result;
    } catch (error) {
      console.error('[Auth] Ошибка расчета скидки:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // АДМИНИСТРАТИВНЫЕ ФУНКЦИИ (только для админов)
  // ==========================================================================

  /**
   * Получить список всех пользователей (админка)
   * Проверяет права персонала
   * @returns {Promise} список пользователей
   */
  async getAdminUsers() {
    if (!this.isStaff) {
      const error = 'Доступ запрещен. Требуются права администратора.';
      console.error('[Auth]', error);
      return { success: false, error };
    }
    
    try {
      console.log('[Auth] Получение списка пользователей (админка)');
      
      const result = await AuthAPI.getAdminUsers();
      
      return result;
    } catch (error) {
      console.error('[Auth] Ошибка получения списка пользователей:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Получить статистику кофейни (админка)
   * Проверяет права персонала
   * @returns {Promise} статистика кофейни
   */
  async getAdminDashboard() {
    if (!this.isStaff) {
      const error = 'Доступ запрещен. Требуются права администратора.';
      console.error('[Auth]', error);
      return { success: false, error };
    }
    
    try {
      console.log('[Auth] Получение статистики кофейни');
      
      const result = await AuthAPI.getAdminDashboard();
      
      return result;
    } catch (error) {
      console.error('[Auth] Ошибка получения статистики кофейни:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // ПУБЛИЧНЫЕ ФУНКЦИИ (без проверки авторизации)
  // ==========================================================================

  /**
   * Проверить доступность email
   * @param {string} email - email для проверки
   * @returns {Promise} результат проверки
   */
  async checkEmail(email) {
    try {
      console.log('[Auth] Проверка email:', email);
      
      const result = await AuthAPI.checkEmail(email);
      
      return result;
    } catch (error) {
      console.error('[Auth] Ошибка проверки email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Проверить доступность телефона
   * @param {string} phone - телефон для проверки
   * @returns {Promise} результат проверки
   */
  async checkPhone(phone) {
    try {
      console.log('[Auth] Проверка телефона:', phone);
      
      const result = await AuthAPI.checkPhone(phone);
      
      return result;
    } catch (error) {
      console.error('[Auth] Ошибка проверки телефона:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Получить информацию о программе лояльности
   * @returns {Promise} информация о лояльности
   */
  async getLoyaltyInfo() {
    try {
      console.log('[Auth] Получение информации о лояльности');
      
      const result = await AuthAPI.getLoyaltyInfo();
      
      return result;
    } catch (error) {
      console.error('[Auth] Ошибка получения информации о лояльности:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Проверить валидность штрихкода
   * @param {string} barcode - штрихкод для проверки
   * @returns {Promise} результат проверки
   */
  async validateBarcode(barcode) {
    try {
      console.log('[Auth] Проверка штрихкода:', barcode);
      
      const result = await AuthAPI.validateBarcode(barcode);
      
      return result;
    } catch (error) {
      console.error('[Auth] Ошибка проверки штрихкода:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Сбросить ошибку
   */
  clearError() {
    this.error = null;
  }
}

// Создаем глобальный экземпляр сервиса
const authService = new AuthService();

export default authService;