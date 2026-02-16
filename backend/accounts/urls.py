# accounts/urls.py
from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    # ========================================================================
    # ОСНОВНАЯ АУТЕНТИФИКАЦИЯ (SESSION-BASED)
    # ========================================================================
    
    # Регистрация нового клиента
    path('register/', 
         views.RegisterView.as_view(), 
         name='register'),
    
    # Вход в систему (создает сессию)
    path('login/', 
         views.LoginView.as_view(), 
         name='login'),
    
    # Выход (удаляет сессию)
    path('logout/', 
         views.LogoutView.as_view(), 
         name='logout'),
    
    # Проверка текущего пользователя
    path('check-auth/', 
         views.CheckAuthView.as_view(), 
         name='check_auth'),
    
    # Получение CSRF токена (для форм)
    path('csrf/', 
         views.GetCSRFToken.as_view(), 
         name='csrf_token'),
    
    # ========================================================================
    # УПРАВЛЕНИЕ ПРОФИЛЕМ
    # ========================================================================
    
    # Получить профиль текущего пользователя
    path('profile/', 
         views.ProfileView.as_view(), 
         name='profile'),
    
    # Обновить профиль
    path('profile/update/', 
         views.UpdateProfileView.as_view(), 
         name='update_profile'),
    
    # Сменить пароль (требует старый пароль)
    path('profile/change-password/', 
         views.ChangePasswordView.as_view(), 
         name='change_password'),
    
    # Получить штрихкод пользователя
    path('profile/barcode/', 
         views.GetBarcodeView.as_view(), 
         name='get_barcode'),
    
    # Распечатать штрихкод (PDF или изображение)
    path('profile/barcode/print/', 
         views.PrintBarcodeView.as_view(), 
         name='print_barcode'),
    
    # ========================================================================
    # ВОССТАНОВЛЕНИЕ ПАРОЛЯ
    # ========================================================================
    
    # Запрос на сброс пароля (отправляет email)
    path('password-reset/', 
         views.PasswordResetRequestView.as_view(), 
         name='password_reset'),
    
    # Подтверждение сброса пароля (с токеном из email)
    path('password-reset/confirm/<uidb64>/<token>/', 
         views.PasswordResetConfirmView.as_view(), 
         name='password_reset_confirm'),
    
    # ========================================================================
    # КАССОВЫЙ ФУНКЦИОНАЛ (POS)
    # Требует авторизацию кассира/администратора
    # ========================================================================
    
    # Поиск клиента по штрихкоду (для кассы)
    path('pos/find-by-barcode/', 
         views.FindByBarcodeView.as_view(), 
         name='find_by_barcode'),
    
    # Оформить покупку
    path('pos/purchase/', 
         views.ProcessPurchaseView.as_view(), 
         name='process_purchase'),
    
    # Быстрая покупка (без использования баллов)
    path('pos/quick-purchase/', 
         views.QuickPurchaseView.as_view(), 
         name='quick_purchase'),
    
    # Расчет скидки перед покупкой
    path('pos/calculate-discount/', 
         views.CalculateDiscountView.as_view(), 
         name='calculate_discount'),
    
    # Получить чек покупки
    path('pos/receipt/<int:purchase_id>/', 
         views.GetReceiptView.as_view(), 
         name='get_receipt'),
    
    # ========================================================================
    # ИСТОРИЯ И СТАТИСТИКА
    # ========================================================================
    
    # История покупок текущего пользователя
    path('my-purchases/', 
         views.MyPurchasesView.as_view(), 
         name='my_purchases'),
    
    # Детали покупки
    path('purchase/<int:purchase_id>/', 
         views.PurchaseDetailView.as_view(), 
         name='purchase_detail'),
    
    # Статистика пользователя
    path('my-statistics/', 
         views.MyStatisticsView.as_view(), 
         name='my_statistics'),
    
    # ========================================================================
    # АДМИНИСТРАТИВНЫЕ ФУНКЦИИ
    # Только для is_staff или is_superuser
    # ========================================================================
    
    # Список всех пользователей (админка)
    path('admin/users/', 
         views.AdminUserListView.as_view(), 
         name='admin_users'),
    
    # Поиск пользователей
    path('admin/users/search/', 
         views.AdminUserSearchView.as_view(), 
         name='admin_user_search'),
    
    # Детали пользователя (админка)
    path('admin/users/<int:user_id>/', 
         views.AdminUserDetailView.as_view(), 
         name='admin_user_detail'),
    
    # Блокировка/разблокировка пользователя
    path('admin/users/<int:user_id>/toggle-active/', 
         views.ToggleUserActiveView.as_view(), 
         name='toggle_user_active'),
    
    # Редактирование пользователя (админка)
    path('admin/users/<int:user_id>/edit/', 
         views.AdminEditUserView.as_view(), 
         name='admin_edit_user'),
    
    # Сброс баллов пользователю
    path('admin/users/<int:user_id>/reset-points/', 
         views.ResetUserPointsView.as_view(), 
         name='reset_user_points'),
    
    # Настройки лояльности
    path('admin/loyalty-settings/', 
         views.LoyaltySettingsView.as_view(), 
         name='loyalty_settings'),
    
    # Статистика кофейни (админская панель)
    path('admin/dashboard/', 
         views.AdminDashboardView.as_view(), 
         name='admin_dashboard'),
    
    # Экспорт пользователей в CSV
    path('admin/export-users/', 
         views.ExportUsersCSVView.as_view(), 
         name='export_users'),
    
    # ========================================================================
    # ПУБЛИЧНЫЕ ФУНКЦИИ (без авторизации)
    # ========================================================================
    
    # Проверка доступности email (при регистрации)
    path('check-email/<str:email>/', 
         views.CheckEmailView.as_view(), 
         name='check_email'),
    
    # Проверка доступности телефона
    path('check-phone/<str:phone>/', 
         views.CheckPhoneView.as_view(), 
         name='check_phone'),
    
    # Информация о программе лояльности
    path('loyalty-info/', 
         views.LoyaltyInfoView.as_view(), 
         name='loyalty_info'),
    
    # Проверка штрихкода (публичная)
    path('validate-barcode/<str:barcode>/', 
         views.ValidateBarcodeView.as_view(), 
         name='validate_barcode'),

    path('debug-session/', views.DebugSessionView.as_view(), name='debug_session'),
]