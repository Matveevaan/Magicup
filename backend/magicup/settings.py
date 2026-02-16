# backend/magicup/settings.py
import os
from pathlib import Path
from dotenv import load_dotenv

# Загружаем .env
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# Используем ключ из .env или генерируем новый
SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    # Генерируем ключ если в .env нет
    from django.core.management.utils import get_random_secret_key
    SECRET_KEY = get_random_secret_key()

DEBUG = os.getenv('DEBUG', 'False') == 'True'

DEBUG = True

ALLOWED_HOSTS = []

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'home', # приложение главной страницы 'home
    'products', # приложение товаров
    'about', # приложение страницы 'about
    'accounts', # приложение аккаунтов
    'tinymce',  # WYSIWYG-редактор
    'blog',     # приложение блога
    'promotions', # акции
    
]
ROOT_URLCONF = 'magicup.urls'

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    
]


TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'magicup.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'ru-ru'
TIME_ZONE = 'Europe/Moscow'
USE_I18N = True
USE_TZ = True

# Статические файлы (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')  # Собранные статические файлы
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'staticfiles'),  # Папка для разработки
]

# Медиа файлы (загружаемые пользователями)
MEDIA_URL = '/media/'  # Обратите внимание на слэш в начале
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')  # Папка для медиа файлов

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework настройки
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    # 'DEFAULT_PERMISSION_CLASSES': [
    #     # AllowAny для публичного API
    #     'rest_framework.permissions.AllowAny',
    # ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
}
# Настройки сессий
SESSION_COOKIE_AGE = 86400  # 24 часа (в секундах)
SESSION_SAVE_EVERY_REQUEST = True  # обновлять сессию при каждом запросе

# CORS_ALLOW_ALL_ORIGINS = True  # Разрешить все домены (только для разработки!)
CORS_ALLOW_CREDENTIALS = True  # Разрешить куки
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000", 
    "http://127.0.0.1:3000",
]
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]

CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_HTTPONLY = False  # Должен быть False для доступа JS
CSRF_USE_SESSIONS = False
CSRF_COOKIE_SECURE = False  # False для localhost
SESSION_COOKIE_SAMESITE = 'Lax'

AUTH_USER_MODEL = 'accounts.User'

# штрих-код
BARCODE_LENGTH = 12


TINYMCE_DEFAULT_CONFIG = {
    # Высота редактора в пикселях
    'height': 500,
    
    # Показывать ли строку меню сверху (Файл, Правка, Вид и т.д.)
    'menubar': True,
    
    # Список подключенных плагинов (расширений функциональности)
    'plugins': 'advlist autolink lists link image charmap preview anchor searchreplace code help wordcount',
    
    # Добавляем лицензию GPL (бесплатно для open source)
    'license_key': 'gpl',
    
    # Используем локальные файлы TinyMCE
    # 'content_css': '/static/css/tinymce.css',
    
    # Панель инструментов (кнопки форматирования)
    'toolbar': 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist | link image | help',
    
    'content_style': '''
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            font-size: 14px; 
            line-height: 1.6; 
            color: #333; 
        }
        h1, h2, h3 { color: #5D4037; margin-top: 1.5em; }
        img { max-width: 100%; height: auto; }
    ''',
    
    # Отключаем проверку лицензии
    'promotion': False,
    'branding': False,
}
