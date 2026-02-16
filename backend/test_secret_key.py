
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'magicup.settings')
django.setup()

from django.contrib.auth.hashers import make_password
from django.core import signing
from django.middleware.csrf import get_token
from django.http import HttpRequest

print("=== Как используется SECRET_KEY ===\n")

# 1. Хэширование пароля
password = "myPassword123"
hashed = make_password(password)
print("1. Хэшированный пароль:")
print(f"   Пароль: {password}")
print(f"   Хэш: {hashed[:50]}...")
print(f"   Использует SECRET_KEY как соль: {'да' if 'pbkdf2_sha256' in hashed else 'нет'}\n")

# 2. Подпись данных
data = {"user_id": 123, "action": "confirm_email"}
signed = signing.dumps(data)
print("2. Подписанные данные:")
print(f"   Оригинал: {data}")
print(f"   Подпись: {signed[:50]}...")
print(f"   Можно проверить только с правильным SECRET_KEY\n")

# 3. CSRF токен
request = HttpRequest()
request.META['SERVER_NAME'] = 'localhost'
request.META['SERVER_PORT'] = '8000'
csrf_token = get_token(request)
print("3. CSRF токен:")
print(f"   Токен: {csrf_token[:30]}...")
print(f"   Каждая форма получает уникальный токен\n")

# 4. Генерация случайных значений
from django.utils.crypto import get_random_string
random_string = get_random_string(length=32)
print("4. Случайные строки (для токенов):")
print(f"   Случайная строка: {random_string}")
print(f"   Использует SECRET_KEY для повышения энтропии")