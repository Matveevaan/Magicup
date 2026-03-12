# Magicup

**Magicup** — fullstack-веб-приложение на Django (бэкенд) и Next.js (фронтенд).  
Проект включает аутентификацию, работу со штрихкодами, WYSIWYG-редактор и API на Django REST Framework.

---

#Структура проекта

```
Magicup/
├── backend/           # Django-бэкенд (API, админка, база данных)
│   ├── accounts/      # Приложение для пользователей
│   ├── api/           # REST API (Django REST Framework)
│   ├── magicup/       # Основные настройки Django
│   ├── venv/          # Виртуальное окружение Python
│   ├── .env           # Переменные окружения для бэкенда
│   └── requirements.txt
│
├── frontend/          # Next.js-фронтенд
│   ├── app/           # Страницы и компоненты App Router
│   ├── public/        # Статические файлы
│   ├── package.json
│   └── next.config.js
│
└── README.md          # Вы здесь
```

---

## 🛠 Стек технологий

### Бэкенд (backend/)
- Python 3.14
- Django 5.x
- Django REST Framework
- django-tinymce (WYSIWYG-редактор)
- python-barcode (генерация штрихкодов)
- Pillow (работа с изображениями)
- python-dotenv (переменные окружения)
- SQLite / PostgreSQL

### Фронтенд (frontend/)
- Next.js 14 (App Router)
- React 18
- TypeScript
- Axios / fetch для запросов к API

---

#Установка и запуск

### 1. Клонировать репозиторий
```bash
git clone https://github.com/ваш-аккаунт/magicup.git
cd magicup
```

### 2. Настройка бэкенда (Django)

```bash
# Перейти в папку бэкенда
cd backend

# Создать виртуальное окружение (если ещё нет)
python -m venv venv

# Активировать окружение
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Установить зависимости
pip install -r requirements.txt

# Создать файл .env (скопировать из примера)
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux

# Применить миграции
python manage.py migrate

# Создать суперпользователя (для админки)
python manage.py createsuperuser

# Запустить сервер разработки
python manage.py runserver
```
Бэкенд будет доступен по адресу: **http://127.0.0.1:8000**  
Админка: **http://127.0.0.1:8000/admin**

### 3. Настройка фронтенда (Next.js)

```bash
# Открыть новый терминал и перейти в папку фронтенда
cd frontend

# Установить зависимости
npm install
# или
yarn install

# Создать файл .env.local с адресом API
echo "NEXT_PUBLIC_API_URL=http://127.0.0.1:8000" > .env.local

# Запустить сервер разработки
npm run dev
# или
yarn dev
```
Фронтенд будет доступен по адресу: **http://localhost:3000**

---

## Переменные окружения

### Бэкенд (backend/.env)
```
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///db.sqlite3
# Для PostgreSQL:
# DATABASE_URL=postgres://user:password@localhost:5432/magicup

CORS_ALLOWED_ORIGINS=http://localhost:3000
```
*Чтобы сгенерировать безопасный `SECRET_KEY`:*
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Фронтенд (frontend/.env.local)
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

## API

API построен на Django REST Framework. Основные эндпоинты:

- `GET /api/` — корень API
- `POST /api/auth/login/` — вход
- `POST /api/auth/register/` — регистрация
- `GET /api/users/` — список пользователей (требуется авторизация)
- `GET /api/items/` — пример ресурса



---

## Полезные команды

### Бэкенд
```bash
# Запустить тесты
python manage.py test

# Создать миграции
python manage.py makemigrations

# Применить миграции
python manage.py migrate

# Собрать статику
python manage.py collectstatic

# Создать дамп данных (фикстуры)
python manage.py dumpdata > data.json

# Загрузить данные из фикстур
python manage.py loaddata data.json
```

### Фронтенд
```bash
# Сборка для продакшена
npm run build

# Запуск в production-режиме
npm start

# Линтинг
npm run lint
```

---

## Зависимости

### Обновить requirements.txt (бэкенд)
```bash
cd backend
pip freeze > requirements.txt
```

### Обновить package.json (фронтенд)
```bash
cd frontend
npm update
```

---

## Автор

**Матвеева Анастасия**
- Telegram: [@lovelovepavlalove]
- GitHub: [@matveevaan](https://github.com/Matveevaan/Magicup.git)
- Email: hfkjhvn@gmail.com

---
