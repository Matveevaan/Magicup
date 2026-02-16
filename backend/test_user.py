import os
import sys
import django
import pathlib

# Добавляем текущую директорию в путь Python
current_path = pathlib.Path(__file__).parent.absolute()
sys.path.insert(0, str(current_path))

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'magicup.settings')

try:
    django.setup()
    print("✓ Django успешно настроен")
except django.core.exceptions.ImproperlyConfigured as e:
    # Если не найден модуль backend, пробуем другой вариант
    print(f"Пробуем альтернативный путь...")
    
    # Пробуем найти файл settings.py в текущей директории
    if os.path.exists('settings.py'):
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
    else:
        # Пробуем найти по имени проекта (часто project_name.settings)
        project_name = os.path.basename(current_path)
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', f'{project_name}.settings')
    
    django.setup()

# Теперь импортируем модель
from accounts.models import User

def test_user_creation():
    """Тест создания пользователя"""
    print("=== Тестирование создания пользователя ===")
    
    try:
        # 1. Создаем тестового пользователя
        user = User.objects.create_user(
            email='test@magicup.ru',
            password='test123',
            phone='+79991112233',
            first_name='Иван',
            last_name='Тестов'
        )
        print(f"✓ Пользователь создан: {user.email}")
        print(f"  Штрих-код: {user.barcode}")
        print(f"  Баланс: {user.points} баллов")
        print(f"  Телефон: {user.phone}")
        
        # 2. Тестируем покупку
        print("\n=== Тестирование покупки ===")
        user.add_purchase(350)  # Покупка на 350 руб
        print(f"✓ Покупка на 350 руб добавлена")
        print(f"  Новый баланс: {user.points} баллов")
        
        # 3. Ищем по штрих-коду
        print("\n=== Поиск по штрих-коду ===")
        user2 = User.objects.get(barcode=user.barcode)
        print(f"✓ Пользователь найден по штрих-коду: {user2.barcode}")
        print(f"  Email: {user2.email}")
        
        # 4. Проверяем скидку
        print("\n=== Тестирование скидки ===")
        original_price = 1000
        discount = user.calculate_discount(original_price)
        print(f"Цена товара: {original_price} руб")
        print(f"Скидка: {discount['discount']} руб")
        print(f"Итоговая цена: {discount['final_price']} руб")
        print(f"Будет списано: {discount['points_used']} баллов")
        
        # 5. Применяем скидку
        if discount['points_used'] > 0:
            user.spend_points(discount['points_used'])
            print(f"✓ Баллы списаны")
            print(f"  Остаток баллов: {user.points}")
        
        return True
        
    except Exception as e:
        print(f"✗ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_user_methods():
    """Тест дополнительных методов"""
    print("\n=== Тестирование методов пользователя ===")
    
    try:
        # Получаем пользователя
        user = User.objects.get(email='test@magicup.ru')
        
        # Проверяем строковое представление
        print(f"✓ str(user): {user}")
        
        # Проверяем имя
        print(f"✓ Полное имя: {user.get_full_name()}")
        
        return True
    except Exception as e:
        print(f"✗ Ошибка: {e}")
        return False

def cleanup_test_data():
    """Очистка тестовых данных"""
    print("\n=== Очистка тестовых данных ===")
    
    try:
        deleted_count, _ = User.objects.filter(email='test@magicup.ru').delete()
        if deleted_count > 0:
            print(f"✓ Удалено {deleted_count} тестовых пользователей")
        else:
            print("✓ Тестовые пользователи не найдены")
        return True
    except Exception as e:
        print(f"✗ Ошибка при очистке: {e}")
        return False

if __name__ == '__main__':
    # Сначала определим имя модуля settings
    print("Определение настроек Django...")
    
    # Проверяем структуру проекта
    print(f"Текущая директория: {os.getcwd()}")
    print("Содержимое директории:")
    for item in os.listdir('.'):
        print(f"  - {item}")
    
    # Пробуем найти settings.py
    if os.path.exists('settings.py'):
        print("✓ Найден settings.py в текущей директории")
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
    elif os.path.exists('backend/settings.py'):
        print("✓ Найден backend/settings.py")
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    else:
        # Ищем папку с settings.py
        for root, dirs, files in os.walk('.'):
            if 'settings.py' in files:
                module_name = root.replace('./', '').replace('/', '.')
                if module_name:
                    os.environ.setdefault('DJANGO_SETTINGS_MODULE', f'{module_name}.settings')
                    print(f"✓ Найден {module_name}.settings")
                    break
    
    print("\nЗапуск тестов...")
    
    # Запускаем Django
    django.setup()
    
    # Очищаем старые тестовые данные
    cleanup_test_data()
    
    # Запускаем тесты
    success = test_user_creation()
    
    if success:
        test_user_methods()
    
    print("\n" + "="*50)
    print("Тест завершен!")
    print("Для очистки запустите: python test_user.py --cleanup")