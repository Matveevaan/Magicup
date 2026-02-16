# test_simple.py
import os
import sys

# Добавляем путь к проекту
project_path = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_path)

# Настраиваем Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

# Теперь импортируем модель
from accounts.models import User

print("Тестирование модели User...")

# Создаем пользователя
try:
    user = User.objects.create_user(
        email='test@magicup.ru',
        password='test123',
        phone='+79991112233'
    )
    print(f"✓ Создан пользователь: {user.email}")
    print(f"  Штрих-код: {user.barcode}")
    print(f"  Баллы: {user.points}")
    
    # Тест покупки
    user.add_purchase(350)
    print(f"✓ После покупки: {user.points} баллов")
    
    # Поиск по штрих-коду
    found_user = User.objects.get(barcode=user.barcode)
    print(f"✓ Найден по штрих-коду: {found_user.email}")
    
    print("\n✓ Все тесты пройдены успешно!")
    
except Exception as e:
    print(f"✗ Ошибка: {e}")
    import traceback
    traceback.print_exc()