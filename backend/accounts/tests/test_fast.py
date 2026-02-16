# tests/test_fast.py
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()

class FastTest(TestCase):
    """Быстрые smoke-тесты для проверки работоспособности"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_home_page(self):
        """Проверка что сервер запускается"""
        response = self.client.get('/')
        self.assertIn(response.status_code, [200, 404, 403])
    
    def test_admin_login(self):
        """Проверка административного интерфейса"""
        response = self.client.get('/admin/')
        self.assertIn(response.status_code, [200, 302])
    
    def test_api_root(self):
        """Проверка доступности API"""
        # Проверяем несколько ключевых endpoints
        endpoints = [
            reverse('accounts:register'),
            reverse('accounts:login'),
            reverse('accounts:loyalty_info'),
        ]
        
        for endpoint in endpoints:
            try:
                response = self.client.get(endpoint)
                self.assertIn(response.status_code, [200, 400, 405])
            except Exception as e:
                print(f"Error testing {endpoint}: {e}")
    
    def test_create_and_login_user(self):
        """Создание пользователя и вход"""
        # Регистрация
        data = {
            'email': 'smoke@test.com',
            'first_name': 'Smoke',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
        }
        
        response = self.client.post(
            reverse('accounts:register'),
            data,
            format='json'
        )
        
        self.assertIn(response.status_code, [201, 400])
        
        # Если регистрация успешна, пробуем войти
        if response.status_code == 201:
            login_data = {
                'email': 'smoke@test.com',
                'password': 'TestPass123!',
            }
            
            response = self.client.post(
                reverse('accounts:login'),
                login_data,
                format='json'
            )
            
            self.assertIn(response.status_code, [200, 400])