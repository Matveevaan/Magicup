# tests/test_serializers.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError
from accounts.serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
)
from accounts.models import LoyaltySettings
import json

User = get_user_model()


class UserRegistrationSerializerTest(TestCase):
    def setUp(self):
        self.valid_data = {
            'email': 'newuser@test.com',
            'first_name': 'Иван',
            'phone': '+79991234567',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
        }
    
    def test_valid_registration(self):
        """Валидные данные для регистрации"""
        serializer = UserRegistrationSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid())
        
        user = serializer.save()
        self.assertEqual(user.email, 'newuser@test.com')
        self.assertEqual(user.first_name, 'Иван')
        self.assertEqual(user.phone, '+79991234567')
        self.assertTrue(user.check_password('StrongPass123!'))
        self.assertIsNotNone(user.barcode)
    
    def test_password_mismatch(self):
        """Пароли не совпадают"""
        data = self.valid_data.copy()
        data['password_confirm'] = 'DifferentPass123!'
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('password_confirm', serializer.errors)
    
    def test_weak_password(self):
        """Слабый пароль"""
        data = self.valid_data.copy()
        data['password'] = '123'
        data['password_confirm'] = '123'
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)
    
    def test_invalid_email(self):
        """Неверный email"""
        data = self.valid_data.copy()
        data['email'] = 'not-an-email'
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)
    
    def test_duplicate_email(self):
        """Email уже существует"""
        User.objects.create_user(
            email='existing@test.com',
            first_name='Existing',
            password='pass'
        )
        
        data = self.valid_data.copy()
        data['email'] = 'existing@test.com'
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)
    
    def test_invalid_name(self):
        """Имя содержит недопустимые символы"""
        data = self.valid_data.copy()
        data['first_name'] = 'Иван123'
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('first_name', serializer.errors)
    
    def test_invalid_phone(self):
        """Неверный формат телефона"""
        data = self.valid_data.copy()
        data['phone'] = '89991234567'  # Без +
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('phone', serializer.errors)


class UserLoginSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='login@test.com',
            first_name='Login',
            password='testpass123'
        )
    
    def test_valid_login(self):
        """Валидные данные для входа"""
        data = {
            'email': 'login@test.com',
            'password': 'testpass123'
        }
        
        serializer = UserLoginSerializer(
            data=data,
            context={'request': type('Request', (), {'META': {}})()}
        )
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['user'], self.user)
    
    def test_invalid_password(self):
        """Неверный пароль"""
        data = {
            'email': 'login@test.com',
            'password': 'wrongpass'
        }
        
        serializer = UserLoginSerializer(
            data=data,
            context={'request': type('Request', (), {'META': {}})()}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)
    
    def test_nonexistent_user(self):
        """Пользователь не существует"""
        data = {
            'email': 'nonexistent@test.com',
            'password': 'pass'
        }
        
        serializer = UserLoginSerializer(
            data=data,
            context={'request': type('Request', (), {'META': {}})()}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)
    
    def test_inactive_user(self):
        """Неактивный пользователь"""
        self.user.is_active = False
        self.user.save()
        
        data = {
            'email': 'login@test.com',
            'password': 'testpass123'
        }
        
        serializer = UserLoginSerializer(
            data=data,
            context={'request': type('Request', (), {'META': {}})()}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)


class UserProfileSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='profile@test.com',
            first_name='Profile',
            password='pass'
        )
    
    def test_serialize_profile(self):
        """Сериализация профиля"""
        serializer = UserProfileSerializer(self.user)
        data = serializer.data
        
        self.assertEqual(data['email'], 'profile@test.com')
        self.assertEqual(data['first_name'], 'Profile')
        self.assertEqual(data['points'], 0)
        self.assertIn('barcode', data)
        self.assertIn('barcode_image', data)
        self.assertIn('date_joined', data)


class UserUpdateSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='update@test.com',
            first_name='OldName',
            password='pass',
            phone='+79991111111'
        )
        # Создаем mock request
        self.request = type('Request', (), {
            'user': self.user,
            'META': {}
        })()
    
    def test_valid_update(self):
        """Валидное обновление"""
        data = {
            'first_name': 'NewName',
            'phone': '+79992222222'
        }
        
        serializer = UserUpdateSerializer(
            self.user,
            data=data,
            partial=True,
            context={'request': self.request}  # Используем созданный request
        )
        
        self.assertTrue(serializer.is_valid())
        updated_user = serializer.save()
        self.assertEqual(updated_user.first_name, 'NewName')
        self.assertEqual(updated_user.phone, '+79992222222')


class ChangePasswordSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='changepass@test.com',
            first_name='User',
            password='oldpass123'
        )
    
    def test_valid_password_change(self):
        """Валидная смена пароля"""
        data = {
            'old_password': 'oldpass123',
            'new_password': 'NewStrongPass456!',
            'new_password_confirm': 'NewStrongPass456!'
        }
        
        serializer = ChangePasswordSerializer(
            data=data,
            context={'request': type('Request', (), {'user': self.user})()}
        )
        
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['new_password'], 'NewStrongPass456!')
    
    def test_wrong_old_password(self):
        """Неверный старый пароль"""
        data = {
            'old_password': 'wrongpass',
            'new_password': 'NewPass123!',
            'new_password_confirm': 'NewPass123!'
        }
        
        serializer = ChangePasswordSerializer(
            data=data,
            context={'request': type('Request', (), {'user': self.user})()}
        )
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('old_password', serializer.errors)
    
    def test_password_mismatch(self):
        """Новые пароли не совпадают"""
        data = {
            'old_password': 'oldpass123',
            'new_password': 'NewPass123!',
            'new_password_confirm': 'DifferentPass456!'
        }
        
        serializer = ChangePasswordSerializer(
            data=data,
            context={'request': type('Request', (), {'user': self.user})()}
        )
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('new_password_confirm', serializer.errors)
    
    def test_same_password(self):
        """Новый пароль совпадает со старым"""
        data = {
            'old_password': 'oldpass123',
            'new_password': 'oldpass123',
            'new_password_confirm': 'oldpass123'
        }
        
        serializer = ChangePasswordSerializer(
            data=data,
            context={'request': type('Request', (), {'user': self.user})()}
        )
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('new_password', serializer.errors)
    
    def test_weak_new_password(self):
        """Слабый новый пароль"""
        data = {
            'old_password': 'oldpass123',
            'new_password': '123',
            'new_password_confirm': '123'
        }
        
        serializer = ChangePasswordSerializer(
            data=data,
            context={'request': type('Request', (), {'user': self.user})()}
        )
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('new_password', serializer.errors)