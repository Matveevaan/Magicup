# tests/test_models.py
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from accounts.models import User, LoyaltySettings, Purchase
from accounts.models import find_user_by_barcode, process_purchase
import re


class UserModelTest(TestCase):
    def setUp(self):
        self.user_data = {
            'email': 'client@test.com',
            'first_name': 'Иван',
            'password': 'testpass123',
        }
    
    def test_create_client(self):
        """Создание обычного клиента"""
        user = User.objects.create_user(**self.user_data)
        
        self.assertEqual(user.email, 'client@test.com')
        self.assertEqual(user.first_name, 'Иван')
        self.assertIsNotNone(user.username)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertIsNotNone(user.barcode)
        self.assertEqual(len(user.barcode), 13)
        self.assertTrue(re.match(r'^\d{13}$', user.barcode))
    
    def test_create_superuser(self):
        """Создание администратора"""
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@test.com',
            password='adminpass'
        )
        
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
        self.assertIsNone(admin.barcode)
        self.assertEqual(admin.points, 0)
    
    def test_phone_validation(self):
        """Валидация телефона"""
        # Правильный формат
        user = User.objects.create_user(
            email='test@test.com',
            first_name='Test',
            password='pass',
            phone='+79991234567'
        )
        self.assertEqual(user.phone, '+79991234567')
        
        # Неправильный формат
        user2 = User(
            email='test2@test.com',
            first_name='Test',
            password='pass',
            phone='89991234567'  # Без +
        )
        with self.assertRaises(ValidationError):
            user2.full_clean()
    
    def test_barcode_generation(self):
        """Генерация уникального штрихкода"""
        user1 = User.objects.create_user(
            email='user1@test.com',
            first_name='User1',
            password='pass'
        )
        
        user2 = User.objects.create_user(
            email='user2@test.com',
            first_name='User2',
            password='pass'
        )
        
        self.assertNotEqual(user1.barcode, user2.barcode)
        self.assertIsNotNone(user1.get_barcode_image_base64())
    
    def test_calculate_ean13_check_digit(self):
        """Проверка контрольной цифры EAN-13"""
        user = User()
        
        # Пример из стандарта EAN-13
        barcode12 = '400638133393'  # Должен стать 4006381333931
        check_digit = user.calculate_ean13_check_digit(barcode12)
        self.assertEqual(check_digit, '1')
        
        # Наш префикс 460
        barcode12 = '460123456789'
        check_digit = user.calculate_ean13_check_digit(barcode12)
        self.assertTrue(check_digit.isdigit())
        self.assertEqual(len(check_digit), 1)
    
    def test_calculate_discount(self):
        """Расчет скидки по баллам"""
        user = User.objects.create_user(
            email='discount@test.com',
            first_name='Discount',
            password='pass'
        )
        user.points = 50
        user.save()
        
        # Скидка 50 баллов
        result = user.calculate_discount(1000)
        self.assertEqual(result['discount'], 50)
        self.assertEqual(result['final_price'], 950)
        self.assertEqual(result['points_used'], 50)
        
        # Скидка больше суммы
        result = user.calculate_discount(30)
        self.assertEqual(result['discount'], 30)
        self.assertEqual(result['final_price'], 0)
        self.assertEqual(result['points_used'], 30)
    
    def test_add_purchase(self):
        """Регистрация покупки"""
        user = User.objects.create_user(
            email='purchase@test.com',
            first_name='Purchase',
            password='pass'
        )
        
        initial_points = user.points
        points_earned = user.add_purchase(1000)
        
        # Проверяем начисление баллов (5% от 1000 = 50)
        self.assertEqual(points_earned, 50)
        self.assertEqual(user.points, initial_points + 50)
        self.assertEqual(user.total_spent, Decimal('1000'))
        self.assertEqual(user.visits_count, 1)
        self.assertIsNotNone(user.last_visit)
    
    def test_register_purchase_with_points(self):
        """Полный цикл покупки с использованием баллов"""
        user = User.objects.create_user(
            email='full@test.com',
            first_name='Full',
            password='pass'
        )
        user.points = 100
        user.save()
        
        result = user.register_purchase(500, use_points=True)
        
        self.assertTrue(result['success'])
        self.assertEqual(result['points_used'], 100)  # Максимум 100 баллов
        self.assertEqual(result['final_amount'], 400)  # 500 - 100
        # Начисление: 5% от 400 = 20 баллов
        self.assertEqual(result['points_earned'], 20)
        self.assertEqual(result['points_balance'], 20)  # 100 - 100 + 20
    
    def test_update_profile(self):
        """Обновление профиля"""
        user = User.objects.create_user(
            email='update@test.com',
            first_name='OldName',
            password='pass',
            phone='+79991111111'
        )       


class LoyaltySettingsTest(TestCase):
    def test_singleton_behavior(self):
        """Проверка что настройки в единственном экземпляре"""
        # Создаем настройки
        settings = LoyaltySettings.get_settings()
        initial_id = settings.id
        
        # Меняем значения через save
        settings.points_percentage = Decimal('15.00')
        settings.save()
        
        # Пытаемся создать новые настройки
        new_settings = LoyaltySettings(
            points_percentage=Decimal('25.00'),
            max_points_per_use=500
        )
        new_settings.save()  # Должен обновить существующие
        
        # Проверяем что запись все еще одна
        self.assertEqual(LoyaltySettings.objects.count(), 1)
        
        # Проверяем что id не изменился
        settings.refresh_from_db()
        self.assertEqual(settings.id, initial_id)
        self.assertEqual(settings.points_percentage, Decimal('25.00'))
        
    def test_get_settings(self):
        """Получение настроек"""
        settings = LoyaltySettings.get_settings()
        self.assertIsInstance(settings, LoyaltySettings)
        self.assertEqual(settings.points_percentage, Decimal('5.00'))
        self.assertEqual(settings.max_points_per_use, 100)


class PurchaseModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='purchase_user@test.com',
            first_name='Purchase',
            password='pass'
        )
    
    def test_create_purchase(self):
        """Создание записи о покупке"""
        purchase = Purchase.objects.create(
            user=self.user,
            total_amount=Decimal('1000.00'),
            final_amount=Decimal('950.00'),
            points_used=50,
            points_earned=25,
            items_summary='Кофе и пирожное'
        )
        
        self.assertEqual(purchase.user, self.user)
        self.assertEqual(purchase.total_amount, Decimal('1000.00'))
        self.assertEqual(purchase.points_used, 50)
        self.assertEqual(purchase.points_earned, 25)
        self.assertIsNotNone(purchase.purchase_date)
        self.assertEqual(purchase.items_summary, 'Кофе и пирожное')


class HelperFunctionsTest(TestCase):
    def test_find_user_by_barcode(self):
        """Поиск пользователя по штрихкоду"""
        user = User.objects.create_user(
            email='barcode@test.com',
            first_name='Barcode',
            password='pass'
        )
        
        result = find_user_by_barcode(user.barcode)
        self.assertTrue(result['found'])
        self.assertEqual(result['user']['name'], 'Barcode')
        self.assertEqual(result['user']['points'], 0)
    
    def test_find_user_by_barcode_not_found(self):
        """Поиск несуществующего штрихкода"""
        result = find_user_by_barcode('1234567890123')
        self.assertFalse(result['found'])
        self.assertIn('не найден', result['error'])
    
    def test_process_purchase(self):
        """Обработка покупки через функцию"""
        user = User.objects.create_user(
            email='process@test.com',
            first_name='Process',
            password='pass'
        )
        
        result = process_purchase(user.barcode, 1000, use_points=False)
        self.assertTrue(result['success'])
        self.assertEqual(result['customer'], 'Process')
        self.assertEqual(result['amount'], 1000)
        
        # Проверяем что запись создалась
        self.assertEqual(Purchase.objects.filter(user=user).count(), 1)
    
    def test_process_purchase_user_not_found(self):
        """Обработка покупки с неверным штрихкодом"""
        result = process_purchase('0000000000000', 1000)
        self.assertFalse(result['success'])
        self.assertIn('не найден', result['error'])