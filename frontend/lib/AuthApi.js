// frontend/lib/AuthApi.js

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Получение CSRF токена из cookies
 * Django устанавливает csrftoken cookie при первом GET запросе
 */
function getCSRFToken() {
  if (typeof document === 'undefined') {
    return '';
  }
  
  const name = 'csrftoken';
  let cookieValue = null;
  
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  
  return cookieValue || '';
}

/**
 * Типовой формат ответа API:
 * {
 *   success: boolean,     // true если запрос успешен (status 2xx)
 *   data: any,           // response.data при успехе, null при ошибке
 *   error: string|null,  // сообщение об ошибке, null при успехе
 *   status: number       // HTTP статус код
 * }
 */

/**
 * Базовый клиент для API запросов
 * Автоматически добавляет CSRF токен и обрабатывает credentials
 */

async function apiClient(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log(`[API] Запрос: ${options.method || 'GET'} ${endpoint}`);
  console.log(`[API] Полный URL: ${url}`);
  console.log(`[API] Опции запроса:`, { 
    method: options.method, 
    headers: options.headers,
    body: options.body ? JSON.parse(options.body) : undefined,
    credentials: options.credentials 
  });
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET')) {
    const csrfToken = getCSRFToken();
    console.log('[API] CSRF Token из cookie:', csrfToken ? 'найден' : 'не найден');
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }
  }
  
  const config = {
    ...options,
    headers,
    credentials: 'include',
  };
  
  try {
    const response = await fetch(url, config);
    
    console.log(`[API] Статус ответа: ${response.status} ${response.statusText}`);
    console.log(`[API] Заголовки ответа:`, Object.fromEntries(response.headers.entries()));
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
      console.log(`[API] Данные ответа (JSON):`, data);
    } else {
      data = await response.text();
      console.log(`[API] Данные ответа (текст):`, data.substring(0, 200) + '...');
    }
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
    };
  } catch (error) {
    console.error('[API] Ошибка сети:', error);
    throw error;
  }
}

/**
 * Унифицированная обертка для API запросов
 * Преобразует ответ apiClient в стандартный формат
 */
async function callApi(endpoint, options = {}) {
  try {
    const response = await apiClient(endpoint, options);
    
    console.log(`[API] Ответ от ${endpoint}:`, {
      status: response.status,
      ok: response.ok,
      data: response.data
    });
    
    return {
      success: response.ok,
      data: response.ok ? response.data : null,
      error: response.ok 
        ? null 
        : (response.data?.error || response.data?.message || response.statusText || 'Ошибка запроса'),
      status: response.status,
    };
  } catch (error) {
    console.error('[API] Сетевая ошибка:', error);
    return {
      success: false,
      data: null,
      error: error.message || 'Ошибка соединения с сервером',
      status: 0,
    };
  }
}

// ============================================================================
// 1. АУТЕНТИФИКАЦИЯ И CSRF
// ============================================================================

/**
 * Получение CSRF токена от сервера
 */
export async function fetchCSRFToken() {
  return callApi('/accounts/csrf/', {
    method: 'GET',
  });
}

/**
 * Регистрация нового клиента
 */
export async function registerUser(userData) {
  console.log('[API] Регистрация пользователя, отправляемые данные:', JSON.stringify(userData, null, 2));
  
  const result = await callApi('/accounts/register/', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  
  console.log('[API] Сырой результат регистрации:', result);
  
  // Если ошибка, выводим детали
  if (!result.success) {
    console.error('[API] Ошибка регистрации. Статус:', result.status);
    console.error('[API] Данные ошибки:', result.data);
    console.error('[API] Текст ошибки:', result.error);
  }
  
  return result;
}
/**
 * Вход в систему (создание сессии)
 */
export async function loginUser(email, password) {
  console.log('[API] Вход пользователя:', email);
  
  const result = await callApi('/accounts/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  
  // После успешного входа проверяем сессию (для отладки)
  if (result.success) {
    console.log('[API] Вход успешен');
    setTimeout(async () => {
      await checkAuth(); // просто для логов
    }, 100);
  }
  
  return result;
}

/**
 * Выход из системы (удаление сессии)
 */
export async function logoutUser() {
  return callApi('/accounts/logout/', {
    method: 'POST',
  });
}

/**
 * Проверка текущей аутентификации
 */
export async function checkAuth() {
  console.log('[API] Проверка авторизации...');
  const result = await callApi('/accounts/check-auth/', {
    method: 'GET',
  });
  
  if (result.success) {
    console.log('[API] Статус авторизации:', 
      result.data?.authenticated ? '✅ есть' : '❌ нет');
  }
  
  return result;
}

// ============================================================================
// 2. УПРАВЛЕНИЕ ПРОФИЛЕМ
// ============================================================================

/**
 * Получение профиля текущего пользователя
 */
export async function getUserProfile() {
  console.log('[API] Запрос профиля пользователя');
  const result = await callApi('/accounts/profile/', {
    method: 'GET',
  });
  
  console.log('[API] Ответ профиля:', result);
  return result;
}

/**
 * Обновление профиля пользователя
 */
export async function updateUserProfile(profileData) {
  return callApi('/accounts/profile/update/', {
    method: 'PATCH',
    body: JSON.stringify(profileData),
  });
}

/**
 * Смена пароля пользователя
 */
export async function changeUserPassword(passwordData) {
  return callApi('/accounts/profile/change-password/', {
    method: 'POST',
    body: JSON.stringify(passwordData),
  });
}

/**
 * Получение штрихкода текущего пользователя
 */
export async function getUserBarcode() {
  return callApi('/accounts/profile/barcode/', {
    method: 'GET',
  });
}

/**
 * Получение штрихкода для печати
 */
export async function printUserBarcode(options = {}) {
  const params = new URLSearchParams(options).toString();
  return callApi(`/accounts/profile/barcode/print/?${params}`, {
    method: 'GET',
  });
}

// ============================================================================
// 3. ВОССТАНОВЛЕНИЕ ПАРОЛЯ
// ============================================================================

/**
 * Запрос на сброс пароля (отправка email)
 */
export async function requestPasswordReset(email) {
  return callApi('/accounts/password-reset/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Подтверждение сброса пароля
 */
export async function confirmPasswordReset(uidb64, token, passwordData) {
  return callApi(`/accounts/password-reset/confirm/${uidb64}/${token}/`, {
    method: 'POST',
    body: JSON.stringify(passwordData),
  });
}

// ============================================================================
// 4. КАССОВЫЙ ФУНКЦИОНАЛ (POS)
// ============================================================================

/**
 * Поиск клиента по штрихкоду (для кассы)
 */
export async function findCustomerByBarcode(barcode) {
  return callApi('/accounts/pos/find-by-barcode/', {
    method: 'POST',
    body: JSON.stringify({ barcode }),
  });
}

/**
 * Оформление покупки (полный цикл)
 */
export async function processPurchase(purchaseData) {
  console.log('[API] Оформление покупки, данные:', purchaseData)
  
  // Явно преобразуем в JSON строку
  const body = JSON.stringify(purchaseData)
  console.log('[API] JSON body:', body)
  
  return callApi('/accounts/pos/purchase/', {
    method: 'POST',
    body: body,
  });
}

/**
 * Быстрая покупка (без использования баллов)
 */
export async function quickPurchase(purchaseData) {
  return callApi('/accounts/pos/quick-purchase/', {
    method: 'POST',
    body: JSON.stringify(purchaseData),
  });
}

/**
 * Расчет скидки перед покупкой
 */
export async function calculateDiscount(barcode, amount) {
  return callApi('/accounts/pos/calculate-discount/', {
    method: 'POST',
    body: JSON.stringify({ barcode, amount }),
  });
}

/**
 * Получение чека покупки
 */
export async function getPurchaseReceipt(purchaseId) {
  return callApi(`/accounts/pos/receipt/${purchaseId}/`, {
    method: 'GET',
  });
}

// ============================================================================
// 5. ИСТОРИЯ И СТАТИСТИКА
// ============================================================================

/**
 * История покупок текущего пользователя (с пагинацией)
 */
export async function getMyPurchases(params = {}) {
  const queryParams = new URLSearchParams();
  
  // Добавляем параметры, если они есть
  if (params.page) queryParams.append('page', params.page);
  if (params.page_size) queryParams.append('page_size', params.page_size);
  if (params.per_page) queryParams.append('per_page', params.per_page);
  
  const queryString = queryParams.toString();
  const endpoint = `/accounts/my-purchases/${queryString ? `?${queryString}` : ''}`;
  
  console.log('Запрос истории покупок:', endpoint);
  
  return callApi(endpoint, {
    method: 'GET',
  });
}

/**
 * Детали конкретной покупки
 */
export async function getPurchaseDetail(purchaseId) {
  return callApi(`/accounts/purchase/${purchaseId}/`, {
    method: 'GET',
  });
}

/**
 * Статистика текущего пользователя
 */
export async function getMyStatistics() {
  return callApi('/accounts/my-statistics/', {
    method: 'GET',
  });
}

// ============================================================================
// 6. АДМИНИСТРАТИВНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Список всех пользователей (админка) с пагинацией
 */
export async function getAllUsers(params = {}) {
  const queryParams = new URLSearchParams(params).toString();
  const endpoint = `/accounts/admin/users/${queryParams ? `?${queryParams}` : ''}`;
  
  return callApi(endpoint, {
    method: 'GET',
  });
}

/**
 * Поиск пользователей (админка)
 */
export async function searchUsers(query) {
  return callApi(`/accounts/admin/users/search/?q=${encodeURIComponent(query)}`, {
    method: 'GET',
  });
}

/**
 * Детальная информация о пользователе (админка)
 */
export async function getUserDetail(userId) {
  return callApi(`/accounts/admin/users/${userId}/`, {
    method: 'GET',
  });
}

/**
 * Блокировка/разблокировка пользователя
 */
export async function toggleUserActive(userId) {
  return callApi(`/accounts/admin/users/${userId}/toggle-active/`, {
    method: 'POST',
  });
}

/**
 * Редактирование пользователя (админка)
 */
export async function adminEditUser(userId, userData) {
  return callApi(`/accounts/admin/users/${userId}/edit/`, {
    method: 'PATCH',
    body: JSON.stringify(userData),
  });
}

/**
 * Сброс баллов пользователю
 */
export async function resetUserPoints(userId) {
  return callApi(`/accounts/admin/users/${userId}/reset-points/`, {
    method: 'POST',
  });
}

/**
 * Получение настроек лояльности
 */
export async function getLoyaltySettings() {
  return callApi('/accounts/admin/loyalty-settings/', {
    method: 'GET',
  });
}

/**
 * Обновление настроек лояльности
 */
export async function updateLoyaltySettings(settings) {
  return callApi('/accounts/admin/loyalty-settings/', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

/**
 * Дашборд администратора (статистика кофейни)
 */
export async function getAdminDashboard() {
  return callApi('/accounts/admin/dashboard/', {
    method: 'GET',
  });
}

/**
 * Экспорт пользователей в CSV
 * Специальная обработка для скачивания файла
 */
export async function exportUsersCSV() {
  try {
    const response = await fetch(`${API_BASE_URL}/accounts/admin/export-users/`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'X-CSRFToken': getCSRFToken(),
      },
    });

    if (response.ok) {
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'users_export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      return {
        success: true,
        data: null,
        error: null,
        status: 200,
      };
    }
    
    return {
      success: false,
      data: null,
      error: 'Ошибка при экспорте',
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message || 'Ошибка соединения',
      status: 0,
    };
  }
}

// ============================================================================
// 7. ПУБЛИЧНЫЕ ФУНКЦИИ (БЕЗ АВТОРИЗАЦИИ)
// ============================================================================

/**
 * Проверка доступности email при регистрации
 */
export async function checkEmailAvailability(email) {
  return callApi(`/accounts/check-email/${encodeURIComponent(email)}/`, {
    method: 'GET',
  });
}

/**
 * Проверка доступности телефона при регистрации
 */
export async function checkPhoneAvailability(phone) {
  return callApi(`/accounts/check-phone/${encodeURIComponent(phone)}/`, {
    method: 'GET',
  });
}

/**
 * Информация о программе лояльности
 */
export async function getLoyaltyInfo() {
  return callApi('/accounts/loyalty-info/', {
    method: 'GET',
  });
}

/**
 * Проверка валидности штрихкода
 */
export async function validateBarcode(barcode) {
  return callApi(`/accounts/validate-barcode/${barcode}/`, {
    method: 'GET',
  });
}

// ============================================================================
// 8. ПОЛЕЗНЫЕ ХУКИ ДЛЯ REACT
// ============================================================================

/**
 * Создание React хука для работы с API
 * Использование:
 * const { data, loading, error, execute } = useApi(apiFunction);
 */
export function createApiHook(apiFunction) {
  return function useApiHook(...args) {
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    
    const execute = React.useCallback(async (...executeArgs) => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await apiFunction(...executeArgs);
        if (response.success) {
          setData(response.data);
          return response;
        } else {
          setError(response.error);
          return response;
        }
      } catch (err) {
        const errorResponse = {
          success: false,
          data: null,
          error: err.message || 'Network error',
          status: 0,
        };
        setError(errorResponse.error);
        return errorResponse;
      } finally {
        setLoading(false);
      }
    }, []);
    
    return { data, loading, error, execute };
  };
}

// ============================================================================
// ЕДИНЫЙ ЭКСПОРТ
// ============================================================================

const AuthApi = {
  // Аутентификация
  fetchCSRFToken,
  registerUser,
  loginUser,
  logoutUser,
  checkAuth,
  
  // Профиль
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  getUserBarcode,
  printUserBarcode,
  
  // Восстановление пароля
  requestPasswordReset,
  confirmPasswordReset,
  
  // POS касса
  findCustomerByBarcode,
  processPurchase,
  quickPurchase,
  calculateDiscount,
  getPurchaseReceipt,
  
  // История и статистика
  getMyPurchases,
  getPurchaseDetail,
  getMyStatistics,
  
  // Админка
  getAllUsers,
  searchUsers,
  getUserDetail,
  toggleUserActive,
  adminEditUser,
  resetUserPoints,
  getLoyaltySettings,
  updateLoyaltySettings,
  getAdminDashboard,
  exportUsersCSV,
  
  // Публичные
  checkEmailAvailability,
  checkPhoneAvailability,
  getLoyaltyInfo,
  validateBarcode,
  
  // Утилиты
  createApiHook,
  callApi, // экспортируем для возможности прямого использования
  apiClient, // экспортируем для крайних случаев
};

export default AuthApi;