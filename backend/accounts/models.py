# users/models.py

from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import validate_email, RegexValidator, MinValueValidator
from django.utils.crypto import get_random_string
from django.utils import timezone
from django.core.exceptions import ValidationError
from decimal import Decimal
import barcode
from barcode.writer import ImageWriter
from io import BytesIO
import base64
import re

# ============================================================================
# ВАЛИДАТОРЫ
# ============================================================================

phone_regex = RegexValidator(
    regex=r'^\+7\d{10}$',
    message="Телефон в формате: '+79999999999'"
)

name_regex = RegexValidator(
    regex=r'^[a-zA-Zа-яА-ЯёЁ\s\-]+$',
    message="Только буквы, пробелы и дефисы"
)

# ============================================================================
# МЕНЕДЖЕР ПОЛЬЗОВАТЕЛЕЙ
# ============================================================================

class UserManager(BaseUserManager):
    """Создание пользователей"""
    
    def create_user(self, email, password=None, **extra_fields):
        """Создание обычного клиента"""
        if not email:
            raise ValueError('Email обязателен')
        
        email = self.normalize_email(email)
        
        # Автоматический логин из email
        if 'username' not in extra_fields:
            username_base = email.split('@')[0]
            username = username_base
            counter = 1
            
            while User.objects.filter(username=username).exists():
                username = f"{username_base}{counter}"
                counter += 1
            
            extra_fields['username'] = username
        
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        
        # Генерация штрихкода
        if not user.barcode and not user.is_superuser:
            user.generate_ean13_barcode()
        
        user.save(using=self._db)
        return user
    
    def create_superuser(self, username, password=None, **extra_fields):
        """Создание администратора"""
        if not username:
            raise ValueError('Администратор должен иметь логин')
        
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        email = extra_fields.pop('email', None)
        if not email:
            email = f'{username}@admin.magicup'
        
        extra_fields['barcode'] = None
        extra_fields['username'] = username
        
        return self.create_user(email=email, password=password, **extra_fields)

# ============================================================================
# НАСТРОЙКИ ЛОЯЛЬНОСТИ 
# ============================================================================

class LoyaltySettings(models.Model):
    """Настройки системы лояльности"""
    
    # Основные настройки
    points_percentage = models.DecimalField(
        'Процент начисления',
        max_digits=5,
        decimal_places=2,
        default=Decimal('5.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    
    max_points_per_use = models.IntegerField(
        'Максимум баллов за раз',
        default=100,
        validators=[MinValueValidator(1)]
    )
    
    updated_at = models.DateTimeField('Обновлено', auto_now=True)
    
    class Meta:
        verbose_name = 'Настройка лояльности'
        verbose_name_plural = 'Настройки лояльности'
    
    def __str__(self):
        return f"Настройки ({self.points_percentage}%)"
    
    def save(self, *args, **kwargs):
        """Только одна запись настроек"""
        if not self.pk and LoyaltySettings.objects.exists():
            existing = LoyaltySettings.objects.first()
            existing.points_percentage = self.points_percentage
            existing.max_points_per_use = self.max_points_per_use
            super(LoyaltySettings, existing).save(*args, **kwargs)
            return existing
        return super().save(*args, **kwargs)
    
    @classmethod
    def get_settings(cls):
        """Получение текущих настроек"""
        settings, created = cls.objects.get_or_create(
            defaults={
                'points_percentage': Decimal('5.00'),
                'max_points_per_use': 100,
            }
        )
        return settings

# ============================================================================
# ПОЛЬЗОВАТЕЛЬ
# ============================================================================

class User(AbstractUser):
    """Модель пользователя кофейни"""
    
    # Основные поля
    username = models.CharField('Логин', max_length=150, unique=True, blank=True, null=True)
    first_name = models.CharField('Имя', max_length=150, validators=[name_regex])
    email = models.EmailField('Email', unique=True, validators=[validate_email])
    phone = models.CharField('Телефон', max_length=20, validators=[phone_regex], blank=True)
    
    # Система лояльности
    points = models.IntegerField('Бонусные баллы', default=0)
    total_spent = models.DecimalField('Всего потрачено', max_digits=10, decimal_places=2, default=0)
    barcode = models.CharField('Штрих-код', max_length=13, unique=True, blank=True, null=True)
    
    # Статистика
    visits_count = models.IntegerField('Посещений', default=0)
    last_visit = models.DateTimeField('Последнее посещение', null=True, blank=True)
    
    # Восстановление пароля
    reset_password_token = models.CharField('Токен сброса', max_length=100, blank=True, null=True)
    reset_password_token_expires = models.DateTimeField('Срок токена', null=True, blank=True)
    
    # Настройки Django
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name']
    objects = UserManager()
    
    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'
        ordering = ['-date_joined']
    
    def __str__(self):
        return f"{self.first_name} ({self.email})" if not self.is_superuser else f"Админ: {self.username}"
    
    # Штрихкод
    def calculate_ean13_check_digit(self, barcode12):
        """Расчет контрольной цифры EAN-13"""
        if not barcode12.isdigit() or len(barcode12) != 12:
            raise ValueError("Нужно 12 цифр")
        
        sum_odd = sum(int(barcode12[i]) for i in range(12) if (i + 1) % 2 == 1)
        sum_even = sum(int(barcode12[i]) for i in range(12) if (i + 1) % 2 == 0)
        
        total = sum_odd + (sum_even * 3)
        return str((10 - (total % 10)) % 10)
    
    def generate_ean13_barcode(self):
        """Генерация уникального штрихкода"""
        if self.is_superuser:
            return
        
        for _ in range(100):
            barcode12 = '460' + get_random_string(9, '0123456789')
            
            try:
                check_digit = self.calculate_ean13_check_digit(barcode12)
                full_barcode = barcode12 + check_digit
                
                if not User.objects.filter(barcode=full_barcode).exists():
                    self.barcode = full_barcode
                    return
            except ValueError:
                continue
        
        raise ValueError("Не удалось сгенерировать штрих-код")
    
    def get_barcode_image_base64(self):
        """Картинка штрихкода в base64"""
        if not self.barcode or not re.match(r'^\d{13}$', self.barcode):
            return None
        
        try:
            ean = barcode.get('ean13', self.barcode, writer=ImageWriter())
            ean.writer.set_options({
                'module_height': 15.0,
                'module_width': 0.2,
                'quiet_zone': 6.5,
                'font_size': 10,
                'write_text': True,
            })
            
            buffer = BytesIO()
            ean.write(buffer)
            buffer.seek(0)
            
            barcode_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            return f"data:image/png;base64,{barcode_base64}"
            
        except Exception:
            return None
    
    def save(self, *args, **kwargs):
        """Автоматическая генерация логина и штрихкода"""
        if not self.is_superuser and not self.username:
            username_base = self.email.split('@')[0]
            username = username_base
            counter = 1
            
            while User.objects.filter(username=username).exists():
                username = f"{username_base}{counter}"
                counter += 1
            
            self.username = username
        
        if not self.barcode and not self.is_superuser:
            self.generate_ean13_barcode()
        
        if self.is_superuser:
            self.points = 0
            self.total_spent = 0
            self.barcode = None
        
        super().save(*args, **kwargs)
    
    # Система лояльности
    def calculate_discount(self, purchase_amount):
        """Расчет скидки по баллам"""
        if self.is_superuser:
            return {'discount': 0, 'final_price': float(purchase_amount), 'points_used': 0}
        
        settings = LoyaltySettings.get_settings()
        max_points_to_use = min(self.points, settings.max_points_per_use)
        
        purchase_decimal = Decimal(str(purchase_amount))
        discount_rubles = Decimal(str(max_points_to_use))
        
        final_price = purchase_decimal - discount_rubles
        
        if final_price < Decimal('0'):
            discount_rubles = purchase_decimal
            final_price = Decimal('0')
            points_used = int(purchase_decimal)
        else:
            points_used = max_points_to_use
        
        return {
            'discount': float(discount_rubles),
            'final_price': float(final_price),
            'points_used': points_used,
        }
    
    def add_purchase(self, amount, points_used=0):
        """Регистрация покупки"""
        if self.is_superuser:
            return 0
        
        settings = LoyaltySettings.get_settings()
        amount_decimal = Decimal(str(amount))
        
        # Начисляем баллы на сумму после скидки
        amount_for_points = amount_decimal - Decimal(str(points_used))
        if amount_for_points < Decimal('0'):
            amount_for_points = Decimal('0')
        
        # Расчет баллов
        points_earned_decimal = (amount_for_points * settings.points_percentage) / Decimal('100')
        points_earned = int(points_earned_decimal)
        
        # Обновляем статистику
        self.total_spent += amount_decimal
        self.visits_count += 1
        self.last_visit = timezone.now()
        
        # Списание баллов
        if points_used > 0:
            self.points -= points_used
        
        # Начисление баллов
        if points_earned > 0:
            self.points += points_earned
        
        self.save()
        return points_earned
    
    def register_purchase(self, amount, use_points=False, cart_items=None):
        """Полный цикл покупки с деталями товаров"""
        print(f"=== НАЧАЛО РЕГИСТРАЦИИ ПОКУПКИ ===")
        print(f"Пользователь: {self.id} - {self.email}")
        print(f"Сумма: {amount}, use_points={use_points}")
        print(f"Товары из корзины ({len(cart_items) if cart_items else 0}): {cart_items}")
        
        # Убедимся, что cart_items - это список
        if cart_items is None:
            cart_items = []
        
        if use_points:
            discount_info = self.calculate_discount(amount)
            points_used = discount_info['points_used']
            final_amount = discount_info['final_price']
        else:
            points_used = 0
            final_amount = float(amount)
        
        print(f"Списано баллов: {points_used}, итог: {final_amount}")
        
        points_earned = self.add_purchase(amount, points_used)
        print(f"Начислено баллов: {points_earned}, новый баланс: {self.points}")
        
        # Формируем детальную информацию о товарах
        items_detail = []
        items_text = []
        
        for item in cart_items:
            items_detail.append({
                'product_id': item.get('productId'),
                'product_name': item.get('productName'),
                'variant_name': item.get('variantName'),
                'quantity': item.get('quantity'),
                'price': float(item.get('price', 0)),
                'total': float(item.get('total', 0))
            })
            items_text.append(f"{item.get('productName')} ({item.get('variantName')}) x{item.get('quantity')}")
        
        items_summary = ', '.join(items_text) if items_text else f"Покупка на {amount} руб."
        
        print(f"items_detail: {items_detail}")
        print(f"items_summary: {items_summary}")
        
        # Создаем запись о покупке
        purchase = Purchase.objects.create(
            user=self,
            total_amount=amount,
            final_amount=final_amount,
            points_used=points_used,
            points_earned=points_earned,
            items_summary=items_summary,
            items_detail=items_detail
        )
        
        print(f"✅ ПОКУПКА СОЗДАНА: ID={purchase.id}")
        print(f"=== КОНЕЦ РЕГИСТРАЦИИ ПОКУПКИ ===\n")
        
        return {
            'success': True,
            'purchase_id': purchase.id,
            'customer': self.first_name,
            'amount': float(amount),
            'points_used': points_used,
            'final_amount': final_amount,
            'points_earned': points_earned,
            'points_balance': self.points,
            'items': items_detail
    }
# ============================================================================
# ИСТОРИЯ ПОКУПОК 
# ============================================================================

class Purchase(models.Model):
    """История покупок"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchases')
    total_amount = models.DecimalField('Сумма', max_digits=10, decimal_places=2)
    final_amount = models.DecimalField('Итоговая сумма', max_digits=10, decimal_places=2)
    points_used = models.IntegerField('Использовано баллов', default=0)
    points_earned = models.IntegerField('Начислено баллов', default=0)
    purchase_date = models.DateTimeField('Дата', default=timezone.now)
    items_summary = models.TextField('Товары', blank=True)
    items_detail = models.JSONField('Детали товаров', default=list, blank=True)
    class Meta:
        verbose_name = 'Покупка'
        verbose_name_plural = 'Покупки'
        ordering = ['-purchase_date']
    
    def __str__(self):
        return f"{self.user.first_name}: {self.final_amount} руб."

# ============================================================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ============================================================================

def find_user_by_barcode(barcode):
    """Поиск пользователя по штрихкоду"""
    try:
        user = User.objects.get(barcode=barcode)
        return {
            'found': True,
            'user': {
                'name': user.first_name,
                'email': user.email,
                'phone': user.phone,
                'points': user.points,
                'visits_count': user.visits_count,
                'barcode_image': user.get_barcode_image_base64()
            }
        }
    except User.DoesNotExist:
        return {'found': False, 'error': 'Пользователь не найден'}

def process_purchase(barcode, amount, use_points=False):
    """Обработка покупки"""
    try:
        user = User.objects.get(barcode=barcode)
        result = user.register_purchase(amount, use_points)
        return result
    except User.DoesNotExist:
        return {'success': False, 'error': 'Пользователь не найден'}