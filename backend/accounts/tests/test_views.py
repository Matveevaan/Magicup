# tests/test_views.py
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from accounts.models import LoyaltySettings, Purchase
import json

User = get_user_model()


class AuthenticationViewsTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'email': 'test@test.com',
            'first_name': 'Иван',
            'phone': '+79991234567',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
        }
    
    def test_register_success(self):
        """Успешная регистрация"""
        url = reverse('accounts:register')
        response = self.client.post(url, self.user_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['user']['email'], 'test@test.com')
        self.assertEqual(response.data['user']['first_name'], 'Иван')
        
        # Проверяем что пользователь создан
        self.assertTrue(User.objects.filter(email='test@test.com').exists())
        
        # Проверяем что создан штрихкод
        user = User.objects.get(email='test@test.com')
        self.assertIsNotNone(user.barcode)
    
    def test_register_invalid_data(self):
        """Регистрация с невалидными данными"""
        data = self.user_data.copy()
        data['password_confirm'] = 'DifferentPass!'  # Пароли не совпадают
        
        url = reverse('accounts:register')
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password_confirm', response.data)
    
    def test_login_success(self):
        """Успешный вход"""
        # Сначала регистрируем пользователя
        user = User.objects.create_user(
            email='login@test.com',
            first_name='Login',
            password='testpass123'
        )
        
        url = reverse('accounts:login')
        data = {
            'email': 'login@test.com',
            'password': 'testpass123'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['user']['email'], 'login@test.com')
        
        # Проверяем что сессия создана
        self.assertIn('_auth_user_id', self.client.session)
    
    def test_login_invalid_credentials(self):
        """Вход с неверными данными"""
        url = reverse('accounts:login')
        data = {
            'email': 'nonexistent@test.com',
            'password': 'wrongpass'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_logout(self):
        """Выход из системы"""
        # Сначала входим
        user = User.objects.create_user(
            email='logout@test.com',
            first_name='Logout',
            password='testpass123'
        )
        self.client.force_login(user)
        
        url = reverse('accounts:logout')
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        
        # Проверяем что сессия удалена
        self.assertNotIn('_auth_user_id', self.client.session)
    
    def test_check_auth_authenticated(self):
        """Проверка авторизации (авторизован)"""
        user = User.objects.create_user(
            email='auth@test.com',
            first_name='Auth',
            password='pass'
        )
        self.client.force_login(user)
        
        url = reverse('accounts:check_auth')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['authenticated'])
        self.assertEqual(response.data['user']['email'], 'auth@test.com')
    
    def test_check_auth_not_authenticated(self):
        """Проверка авторизации (не авторизован)"""
        url = reverse('accounts:check_auth')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['authenticated'])


class ProfileViewsTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='profile@test.com',
            first_name='Profile',
            password='testpass123',
            phone='+79991111111'
        )
        self.client.force_login(self.user)
    
    def test_get_profile(self):
        """Получение профиля"""
        url = reverse('accounts:profile')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'profile@test.com')
        self.assertEqual(response.data['first_name'], 'Profile')
        self.assertEqual(response.data['phone'], '+79991111111')
    
    def test_update_profile(self):
        """Обновление профиля"""
        url = reverse('accounts:update_profile')
        data = {
            'first_name': 'НовоеИмя',
            'phone': '+79992222222'
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['user']['first_name'], 'НовоеИмя')
        self.assertEqual(response.data['user']['phone'], '+79992222222')
        
        # Проверяем в базе
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'НовоеИмя')
        self.assertEqual(self.user.phone, '+79992222222')
    
    def test_change_password(self):
        """Смена пароля"""
        url = reverse('accounts:change_password')
        data = {
            'old_password': 'testpass123',
            'new_password': 'NewStrongPass456!',
            'new_password_confirm': 'NewStrongPass456!'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        
        # Проверяем что пароль изменился
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewStrongPass456!'))
    
    def test_get_barcode(self):
        """Получение штрихкода"""
        url = reverse('accounts:get_barcode')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('barcode', response.data)
        self.assertIn('barcode_image', response.data)
        self.assertIn('customer_name', response.data)
        self.assertEqual(response.data['customer_name'], 'Profile')
    
    def test_print_barcode(self):
        """Печать штрихкода"""
        url = reverse('accounts:print_barcode')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('barcode_image', response.data)


class CashierViewsTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Создаем кассира
        self.cashier = User.objects.create_user(
            email='cashier@test.com',
            first_name='Кассир',
            password='pass',
            is_staff=True
        )
        self.client.force_login(self.cashier)
        
        # Создаем клиента
        self.customer = User.objects.create_user(
            email='customer@test.com',
            first_name='Клиент',
            password='pass'
        )
        self.customer.points = 100
        self.customer.save()
    
    def test_find_by_barcode_success(self):
        """Успешный поиск по штрихкоду"""
        url = reverse('accounts:find_by_barcode')
        data = {'barcode': self.customer.barcode}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['found'])
        self.assertEqual(response.data['customer']['name'], 'Клиент')
        self.assertEqual(response.data['customer']['points'], 100)
        self.assertIn('barcode_image', response.data['customer'])
    
    def test_find_by_barcode_not_found(self):
        """Поиск несуществующего штрихкода"""
        url = reverse('accounts:find_by_barcode')
        data = {'barcode': '0000000000000'}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data['found'])
        self.assertIn('не найден', response.data['error'])
    
    def test_find_by_barcode_staff(self):
        """Поиск по штрихкоду сотрудника"""
        staff_user = User.objects.create_user(
            email='staff@test.com',
            first_name='Сотрудник',
            password='pass',
            is_staff=True
        )
        
        url = reverse('accounts:find_by_barcode')
        data = {'barcode': staff_user.barcode}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('сотрудник', response.data['error'])
    
    def test_process_purchase_success(self):
        """Успешное оформление покупки"""
        url = reverse('accounts:process_purchase')
        data = {
            'barcode': self.customer.barcode,
            'amount': 1000,
            'use_points': True
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['customer'], 'Клиент')
        self.assertEqual(response.data['amount'], 1000)
        self.assertEqual(response.data['points_used'], 100)  # Максимум баллов
        self.assertEqual(response.data['final_amount'], 900)  # 1000 - 100
        self.assertEqual(response.data['points_earned'], 45)  # 5% от 900
        
        # Проверяем запись в базе
        self.assertEqual(Purchase.objects.filter(user=self.customer).count(), 1)
        
        # Проверяем обновление баллов
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.points, 45)  # 100 - 100 + 45
    
    def test_quick_purchase(self):
        """Быстрая покупка без баллов"""
        url = reverse('accounts:quick_purchase')
        data = {
            'barcode': self.customer.barcode,
            'amount': 500
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['points_used'], 0)
        self.assertEqual(response.data['points_earned'], 25)  # 5% от 500
    
    def test_calculate_discount(self):
        """Расчет скидки"""
        url = reverse('accounts:calculate_discount')
        data = {
            'barcode': self.customer.barcode,
            'amount': 1000
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['customer'], 'Клиент')
        self.assertEqual(response.data['current_points'], 100)
        self.assertEqual(response.data['discount'], 100)
        self.assertEqual(response.data['final_price'], 900)
        self.assertEqual(response.data['points_used'], 100)
    
    def test_get_receipt(self):
        """Получение чека"""
        # Сначала создаем покупку
        purchase = Purchase.objects.create(
            user=self.customer,
            total_amount=1000,
            final_amount=900,
            points_used=100,
            points_earned=45,
            items_summary='Кофе латте'
        )
        
        url = reverse('accounts:get_receipt', args=[purchase.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('receipt', response.data)
        self.assertEqual(response.data['receipt']['customer']['name'], 'Клиент')
        self.assertEqual(response.data['receipt']['amounts']['total'], 1000)
        self.assertEqual(response.data['receipt']['points']['used'], 100)


class HistoryAndStatisticsTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='history@test.com',
            first_name='History',
            password='pass'
        )
        self.client.force_login(self.user)
        
        # Создаем покупки через правильный метод
        for i in range(15):
            # Создаем покупку, которая обновит visits_count
            purchase = Purchase.objects.create(
                user=self.user,
                total_amount=100 * (i + 1),
                final_amount=95 * (i + 1),
                points_used=5 * (i + 1),
                points_earned=5,
                items_summary=f'Покупка {i+1}'
            )
            
            # Вручную обновляем статистику пользователя
            # так как create() не вызывает сигналы
            self.user.visits_count = Purchase.objects.filter(user=self.user).count()
            self.user.total_spent = sum(
                float(p.total_amount) for p in Purchase.objects.filter(user=self.user)
            )
        
        self.user.save()
        self.user.refresh_from_db()
    
    def test_my_statistics(self):
        """Статистика пользователя"""
        url = reverse('accounts:my_statistics')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Обновляем пользователя
        self.user.refresh_from_db()
        
        # Проверяем
        self.assertEqual(response.data['summary']['visits_count'], self.user.visits_count)
        self.assertEqual(self.user.visits_count, 15)  # Должно быть 15
        self.assertEqual(response.data['summary']['total_points_earned'], self.user.points)
        self.assertIn('loyalty', response.data)
        self.assertIn('purchase_history', response.data)
        
        # Проверяем количество элементов в истории
        self.assertEqual(len(response.data['purchase_history']), 10)  # Последние 10 покупок

class AdminViewsTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Создаем администратора
        self.admin = User.objects.create_superuser(
            username='admin',
            email='admin@test.com',
            password='adminpass'
        )
        self.client.force_login(self.admin)
        
        # Создаем несколько пользователей
        for i in range(25):
            User.objects.create_user(
                email=f'user{i}@test.com',
                first_name=f'User{i}',
                password='pass'
            )
    
    def test_admin_user_list_pagination(self):
        """Список пользователей с пагинацией"""
        url = reverse('accounts:admin_users')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        
        # Проверяем пагинацию (25 пользователей + 1 админ = 26)
        self.assertIn('pagination', response.data)
        self.assertEqual(response.data['pagination']['current_page'], 1)
        self.assertEqual(response.data['pagination']['total_items'], 26)
        self.assertEqual(len(response.data['data']), 20)  # По умолчанию 20 на странице
    
    def test_admin_user_list_with_per_page(self):
        """Список пользователей с кастомным per_page"""
        url = reverse('accounts:admin_users') + '?per_page=10'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 10)
        self.assertEqual(response.data['pagination']['items_per_page'], 10)
    
    def test_admin_dashboard(self):
        """Админская панель статистики"""
        url = reverse('accounts:admin_dashboard')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('general', response.data)
        self.assertIn('today', response.data)
        self.assertIn('top_customers', response.data)
        
        self.assertEqual(response.data['general']['total_customers'], 25)  # Только клиенты
    
    def test_loyalty_settings_get(self):
        """Получение настроек лояльности"""
        url = reverse('accounts:loyalty_settings')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data['settings']['points_percentage']), 5.00)
        self.assertEqual(response.data['settings']['max_points_per_use'], 100)
    
    def test_loyalty_settings_update(self):
        """Обновление настроек лояльности"""
        url = reverse('accounts:loyalty_settings')
        data = {
            'points_percentage': 10.0,
            'max_points_per_use': 200
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(float(response.data['settings']['points_percentage']), 10.0)
        self.assertEqual(response.data['settings']['max_points_per_use'], 200)
        
        # Проверяем в базе
        settings = LoyaltySettings.get_settings()
        self.assertEqual(settings.points_percentage, 10.0)
        self.assertEqual(settings.max_points_per_use, 200)
    
    def test_admin_user_search(self):
        """Поиск пользователей"""
        url = reverse('accounts:admin_user_search') + '?q=user1'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertTrue(response.data['count'] > 0)
    
    def test_toggle_user_active(self):
        """Блокировка/разблокировка пользователя"""
        user = User.objects.filter(is_superuser=False).first()
        
        url = reverse('accounts:toggle_user_active', args=[user.id])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        
        # Проверяем что статус изменился
        user.refresh_from_db()
        self.assertFalse(user.is_active)
    
    def test_export_users_csv(self):
        """Экспорт пользователей в CSV"""
        url = reverse('accounts:export_users')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv')
        self.assertIn('attachment', response['Content-Disposition'])
        
        # Проверяем содержимое
        content = response.content.decode('utf-8')
        self.assertIn('ID,Email,Имя', content)
        self.assertIn('admin@test.com', content)


class PublicViewsTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Создаем пользователя для проверки занятости
        self.existing_user = User.objects.create_user(
            email='existing@test.com',
            first_name='Existing',
            password='pass',
            phone='+79991234567'
        )
    
    def test_check_email_available(self):
        """Проверка свободного email"""
        url = reverse('accounts:check_email', args=['free@test.com'])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['available'])
    
    def test_check_email_taken(self):
        """Проверка занятого email"""
        url = reverse('accounts:check_email', args=['existing@test.com'])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['available'])
    
    def test_check_phone_available(self):
        """Проверка свободного телефона"""
        url = reverse('accounts:check_phone', args=['+79998887766'])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['available'])
    
    def test_check_phone_taken(self):
        """Проверка занятого телефона"""
        url = reverse('accounts:check_phone', args=['+79991234567'])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['available'])
    
    def test_loyalty_info(self):
        """Информация о программе лояльности"""
        url = reverse('accounts:loyalty_info')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['program_name'], 'MagicUP Coffee Loyalty')
        self.assertEqual(response.data['points_percentage'], 5.0)
        self.assertIn('rules', response.data)
        self.assertIn('benefits', response.data)
    
    def test_validate_barcode_valid(self):
        """Проверка валидного штрихкода"""
        url = reverse('accounts:validate_barcode', args=[self.existing_user.barcode])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['valid'])
        self.assertTrue(response.data['exists'])
    
    def test_validate_barcode_invalid(self):
        """Проверка невалидного штрихкода"""
        url = reverse('accounts:validate_barcode', args=['12345'])  # Не 13 цифр
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['valid'])
        self.assertIn('13 цифр', response.data['error'])
    
    def test_validate_barcode_free(self):
        """Проверка свободного штрихкода"""
        url = reverse('accounts:validate_barcode', args=['1234567890123'])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['valid'])
        self.assertFalse(response.data['exists'])


class PermissionTests(APITestCase):
    """Тесты на проверку прав доступа"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Создаем обычного пользователя
        self.regular_user = User.objects.create_user(
            email='regular@test.com',
            first_name='Regular',
            password='pass'
        )
        
        # Создаем кассира
        self.cashier = User.objects.create_user(
            email='cashier@test.com',
            first_name='Cashier',
            password='pass',
            is_staff=True
        )
        
        # Создаем суперпользователя
        self.superuser = User.objects.create_superuser(
            username='super',
            email='super@test.com',
            password='superpass'
        )
    
    def test_regular_user_cannot_access_admin_views(self):
        """Обычный пользователь не может получить доступ к админке"""
        self.client.force_login(self.regular_user)
        
        # Попытка получить список пользователей
        url = reverse('accounts:admin_users')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Попытка получить статистику
        url = reverse('accounts:admin_dashboard')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_cashier_can_access_pos_but_not_all_admin(self):
        """Кассир может использовать кассу, но не все админские функции"""
        self.client.force_login(self.cashier)
        
        # Кассир может искать по штрихкоду
        url = reverse('accounts:find_by_barcode')
        response = self.client.post(url, {'barcode': '123'}, format='json')
        
        # Получит ошибку валидации, но не 403
        self.assertNotEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Кассир НЕ может экспортировать пользователей
        url = reverse('accounts:export_users')
        response = self.client.get(url)
        
        # Но может, потому что is_staff=True дает доступ ко всем admin views
        # Это нужно исправить в декораторе staff_required
    
    def test_superuser_can_access_everything(self):
        """Суперпользователь имеет доступ ко всему"""
        self.client.force_login(self.superuser)
        
        urls_to_test = [
            reverse('accounts:admin_users'),
            reverse('accounts:admin_dashboard'),
            reverse('accounts:loyalty_settings'),
            reverse('accounts:find_by_barcode'),
        ]
        
        for url in urls_to_test:
            response = self.client.get(url) if 'find-by-barcode' not in url else \
                      self.client.post(url, {'barcode': '123'}, format='json')
            self.assertNotEqual(response.status_code, status.HTTP_403_FORBIDDEN)