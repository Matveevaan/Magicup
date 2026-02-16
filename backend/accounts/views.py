# accounts/views.py
from django.db import models
from django.utils import timezone
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger  # Импортируем пагинатор
from .models import User, Purchase, LoyaltySettings
from .serializers import (
    UserRegistrationSerializer, 
    UserProfileSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    PurchaseHistorySerializer,
)
import json

# ============================================================================
# ДЕКОРАТОРЫ ДЛЯ ПРОВЕРКИ ПРАВ
# ============================================================================

def staff_required(view_func):
    """Только для персонала кофейни"""
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return Response({'error': 'Требуется авторизация'}, status=401)
        if not request.user.is_staff:
            return Response({'error': 'Доступ запрещен'}, status=403)
        return view_func(request, *args, **kwargs)
    return wrapper

# ============================================================================
# КОНСТАНТЫ ПАГИНАЦИИ
# ============================================================================

ITEMS_PER_PAGE = 20  # Количество элементов на одной странице по умолчанию

# ============================================================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ПАГИНАЦИИ
# ============================================================================

def get_paginated_response(page_obj, data_list, request, total_count=None):
    """
    Создает стандартизированный ответ с пагинацией
    
    Args:
        page_obj: объект страницы от Paginator
        data_list: список данных для текущей страницы
        request: объект запроса
        total_count: общее количество элементов (если отличается от page_obj.paginator.count)
    
    Returns:
        Response с данными и метаинформацией о пагинации
    """
    if total_count is None:
        total_count = page_obj.paginator.count
    
    # Получаем базовый URL без параметров пагинации
    base_url = request.build_absolute_uri().split('?')[0]
    
    # Формируем метаинформацию о пагинации
    pagination_info = {
        'current_page': page_obj.number,  # Текущий номер страницы
        'total_pages': page_obj.paginator.num_pages,  # Общее количество страниц
        'total_items': total_count,  # Общее количество элементов
        'items_per_page': page_obj.paginator.per_page,  # Элементов на странице
        'has_next': page_obj.has_next(),  # Есть ли следующая страница
        'has_previous': page_obj.has_previous(),  # Есть ли предыдущая страница
        'next_page_number': page_obj.next_page_number() if page_obj.has_next() else None,  # Номер следующей страницы
        'previous_page_number': page_obj.previous_page_number() if page_obj.has_previous() else None,  # Номер предыдущей страницы
    }
    
    return Response({
        'success': True,
        'data': data_list,  # Данные текущей страницы
        'pagination': pagination_info,  # Информация о пагинации
        'links': {
            'first': f"{base_url}?page=1",  # Ссылка на первую страницу
            'last': f"{base_url}?page={page_obj.paginator.num_pages}",  # Ссылка на последнюю страницу
            'next': f"{base_url}?page={page_obj.next_page_number()}" if page_obj.has_next() else None,  # Следующая страница
            'prev': f"{base_url}?page={page_obj.previous_page_number()}" if page_obj.has_previous() else None,  # Предыдущая страница
        }
    })

# ============================================================================
# АУТЕНТИФИКАЦИЯ
# ============================================================================

class GetCSRFToken(APIView):
    """Получить CSRF токен для форм"""
    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        return Response({'success': 'CSRF cookie set'})


class RegisterView(APIView):
    """Регистрация нового клиента"""
    @method_decorator(csrf_protect)
    def post(self, request):
        print("\n" + "🔥"*50)
        print("REGISTER VIEW CALLED")
        
        # Получаем данные напрямую из request.data (DRF уже распарсил их)
        data = request.data
        print(f"Data from request.data: {data}")
        
        # Если данных нет, пробуем прочитать body (только если request.data пустой)
        if not data and request.body:
            import json
            try:
                data = json.loads(request.body)
                print(f"Data from request.body: {data}")
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                return Response(
                    {'error': 'Invalid JSON format'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Создаем сериализатор
        serializer = UserRegistrationSerializer(data=data)
        
        # Проверяем валидность
        if not serializer.is_valid():
            print(f"❌ Serializer errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        print(f"✅ Validated data: {serializer.validated_data}")
        
        try:
            # Сохраняем пользователя
            user = serializer.save()
            print(f"✅ User created: {user.id} - {user.email}")
            
            # Автоматический вход
            login(request, user)
            
            return Response({
                'success': True,
                'message': 'Регистрация успешна!',
                'user': UserProfileSerializer(user).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class LoginView(APIView):
    """Вход в систему (создает сессию)"""
    @method_decorator(csrf_protect)
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {'error': 'Укажите email и пароль'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Аутентифицируем пользователя
        user = authenticate(request, email=email, password=password)
        
        if user is not None:
            if not user.is_active:
                return Response(
                    {'error': 'Аккаунт деактивирован'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Создаем сессию
            login(request, user)
            
            return Response({
                'success': True,
                'message': 'Вход выполнен',
                'user': UserProfileSerializer(user).data
            })
        
        return Response(
            {'error': 'Неверный email или пароль'},
            status=status.HTTP_400_BAD_REQUEST
        )


class LogoutView(APIView):
    """Выход из системы (удаляет сессию)"""
    def post(self, request):
        if request.user.is_authenticated:
            logout(request)
            return Response({'success': True, 'message': 'Выход выполнен'})
        return Response({'error': 'Вы не авторизованы'}, status=401)


class CheckAuthView(APIView):
    """Проверить текущую авторизацию"""
    def get(self, request):
        if request.user.is_authenticated:
            return Response({
                'authenticated': True,
                'user': UserProfileSerializer(request.user).data
            })
        return Response({'authenticated': False})

# ============================================================================
# ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
# ============================================================================

class ProfileView(APIView):
    """Получить профиль текущего пользователя"""
    @method_decorator(login_required)
    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)


class UpdateProfileView(APIView):
    """Обновить профиль"""
    @method_decorator(login_required)
    @method_decorator(csrf_protect)
    def patch(self, request):
        serializer = UserUpdateSerializer(
            request.user, 
            data=request.data, 
            partial=True,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Профиль обновлен',
                'user': UserProfileSerializer(request.user).data
            })
        
        return Response(serializer.errors, status=400)


class ChangePasswordView(APIView):
    """Сменить пароль"""
    @method_decorator(login_required)
    @method_decorator(csrf_protect)
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            
            # Обновляем сессию после смены пароля
            login(request, request.user)
            
            return Response({
                'success': True,
                'message': 'Пароль успешно изменен'
            })
        
        return Response(serializer.errors, status=400)


class GetBarcodeView(APIView):
    """Получить штрихкод пользователя"""
    @method_decorator(login_required)
    def get(self, request):
        if not request.user.barcode:
            return Response({
                'error': 'У пользователя нет штрихкода'
            }, status=400)
        
        barcode_image = request.user.get_barcode_image_base64()
        
        return Response({
            'barcode': request.user.barcode,
            'barcode_image': barcode_image,
            'customer_name': request.user.first_name
        })

# ============================================================================
# КАССОВЫЙ ФУНКЦИОНАЛ
# ============================================================================

class FindByBarcodeView(APIView):
    """Поиск клиента по штрихкоду (для кассы)"""
    @method_decorator(login_required)
    @method_decorator(staff_required)
    @method_decorator(csrf_protect)
    def post(self, request):
        barcode = request.data.get('barcode')
        
        if not barcode:
            return Response(
                {'error': 'Укажите штрихкод'},
                status=400
            )
        
        try:
            user = User.objects.get(barcode=barcode)
            
            if user.is_staff or user.is_superuser:
                return Response({
                    'error': 'Это сотрудник кофейни, а не клиент'
                }, status=400)
            
            return Response({
                'found': True,
                'customer': {
                    'id': user.id,
                    'name': user.first_name,
                    'email': user.email,
                    'phone': user.phone,
                    'points': user.points,
                    'total_spent': float(user.total_spent),
                    'visits_count': user.visits_count,
                    'last_visit': user.last_visit,
                    'barcode': user.barcode,
                    'barcode_image': user.get_barcode_image_base64()
                }
            })
            
        except User.DoesNotExist:
            return Response({
                'found': False,
                'error': 'Клиент не найден'
            }, status=404)


class ProcessPurchaseView(APIView):
    """Оформить покупку через кассу"""
    @method_decorator(login_required)
    @method_decorator(staff_required)
    @method_decorator(csrf_protect)
    def post(self, request):
        import json
        
        print("\n" + "🔥"*50)
        print("ProcessPurchaseView получил данные:")
        
        # Сначала получаем cart_items напрямую из request.data
        barcode = request.data.get('barcode')
        amount = request.data.get('amount')
        use_points = request.data.get('use_points', False)
        cart_items = request.data.get('cart_items', [])
        
        print(f"  barcode: {barcode}")
        print(f"  amount: {amount}")
        print(f"  use_points: {use_points}")
        print(f"  cart_items ({len(cart_items)}): {cart_items}")
        print("🔥"*50 + "\n")
        
        if not barcode or not amount:
            return Response(
                {'error': 'Укажите штрихкод и сумму'},
                status=400
            )
        
        try:
            amount_float = float(amount)
            if amount_float <= 0:
                raise ValueError
        except ValueError:
            return Response(
                {'error': 'Неверная сумма'},
                status=400
            )
        
        try:
            user = User.objects.get(barcode=barcode)
        except User.DoesNotExist:
            return Response(
                {'error': 'Клиент не найден'},
                status=404
            )
        
        if user.is_staff or user.is_superuser:
            return Response({
                'error': 'Это сотрудник, покупки недоступны'
            }, status=400)
        
        try:
            # Передаем cart_items в метод register_purchase
            result = user.register_purchase(amount_float, use_points, cart_items)
            
            result['cashier'] = request.user.first_name
            result['purchase_time'] = Purchase.objects.get(
                id=result['purchase_id']
            ).purchase_date.strftime('%d.%m.%Y %H:%M')
            
            return Response(result)
            
        except Exception as e:
            print(f"❌ Ошибка при оформлении: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Ошибка при оформлении: {str(e)}'},
                status=500
            )


class QuickPurchaseView(APIView):
    """Быстрая покупка (без использования баллов)"""
    @method_decorator(login_required)
    @method_decorator(staff_required)
    @method_decorator(csrf_protect)
    def post(self, request):
        data = request.data.copy()
        data['use_points'] = False
        
        request._data = data
        return ProcessPurchaseView().post(request)


class CalculateDiscountView(APIView):
    """Рассчитать скидку перед покупкой"""
    @method_decorator(login_required)
    @method_decorator(staff_required)
    @method_decorator(csrf_protect)
    def post(self, request):
        barcode = request.data.get('barcode')
        amount = request.data.get('amount')
        
        if not barcode or not amount:
            return Response(
                {'error': 'Укажите штрихкод и сумму'},
                status=400
            )
        
        try:
            user = User.objects.get(barcode=barcode)
            
            if user.is_staff or user.is_superuser:
                return Response({
                    'error': 'Это сотрудник'
                }, status=400)
            
            discount_info = user.calculate_discount(float(amount))
            
            return Response({
                'customer': user.first_name,
                'current_points': user.points,
                **discount_info
            })
            
        except User.DoesNotExist:
            return Response(
                {'error': 'Клиент не найден'},
                status=404
            )
        except ValueError:
            return Response(
                {'error': 'Неверная сумма'},
                status=400
            )

# ============================================================================
# ИСТОРИЯ ПОКУПОК (С ПАГИНАЦИЕЙ)
# ============================================================================

class MyPurchasesView(APIView):
    """История покупок текущего пользователя с пагинацией"""
    @method_decorator(login_required)
    def get(self, request):
        # Получаем все покупки пользователя, отсортированные по дате (новые сначала)
        all_purchases = Purchase.objects.filter(user=request.user).order_by('-purchase_date')
        
        # Получаем номер страницы из GET-параметра, по умолчанию 1
        page_number = request.GET.get('page', 1)
        
        # Получаем количество элементов на страницу из GET-параметра (опционально)
        items_per_page = request.GET.get('per_page', ITEMS_PER_PAGE)
        
        try:
            # Преобразуем в число, проверяя валидность
            items_per_page = int(items_per_page)
            if items_per_page < 1 or items_per_page > 100:  # Ограничиваем от 1 до 100
                items_per_page = ITEMS_PER_PAGE
        except (ValueError, TypeError):
            # Если передано некорректное значение, используем значение по умолчанию
            items_per_page = ITEMS_PER_PAGE
        
        # Создаем объект пагинатора
        paginator = Paginator(all_purchases, items_per_page)
        
        try:
            # Получаем запрошенную страницу
            page_obj = paginator.page(page_number)
        except PageNotAnInteger:
            # Если page не является числом, возвращаем первую страницу
            page_obj = paginator.page(1)
        except EmptyPage:
            # Если номер страницы больше максимального, возвращаем последнюю страницу
            page_obj = paginator.page(paginator.num_pages)
        
        # Сериализуем данные только для текущей страницы
        serializer = PurchaseHistorySerializer(page_obj.object_list, many=True)
        
        # Возвращаем ответ с пагинацией
        return get_paginated_response(page_obj, serializer.data, request)


class PurchaseDetailView(APIView):
    """Детали конкретной покупки"""
    @method_decorator(login_required)
    def get(self, request, purchase_id):
        try:
            purchase = Purchase.objects.get(id=purchase_id, user=request.user)
            serializer = PurchaseHistorySerializer(purchase)
            return Response(serializer.data)
        except Purchase.DoesNotExist:
            return Response(
                {'error': 'Покупка не найдена'},
                status=404
            )

# ============================================================================
# АДМИНИСТРАТИВНЫЕ ФУНКЦИИ (С ПАГИНАЦИЕЙ)
# ============================================================================

class AdminUserListView(APIView):
    """Список всех пользователей (админка) с пагинацией"""
    @method_decorator(login_required)
    @method_decorator(staff_required)
    def get(self, request):
        # Получаем всех пользователей, отсортированных по дате регистрации (новые сначала)
        all_users = User.objects.all().order_by('-date_joined')
        
        # Получаем номер страницы из GET-параметра
        page_number = request.GET.get('page', 1)
        
        # Получаем количество элементов на страницу
        items_per_page = request.GET.get('per_page', ITEMS_PER_PAGE)
        
        try:
            # Проверяем и ограничиваем значение per_page
            items_per_page = int(items_per_page)
            if items_per_page < 1 or items_per_page > 100:
                items_per_page = ITEMS_PER_PAGE
        except (ValueError, TypeError):
            items_per_page = ITEMS_PER_PAGE
        
        # Создаем пагинатор
        paginator = Paginator(all_users, items_per_page)
        
        try:
            # Получаем запрошенную страницу
            page_obj = paginator.page(page_number)
        except PageNotAnInteger:
            # Если page не число - первая страница
            page_obj = paginator.page(1)
        except EmptyPage:
            # Если страница за пределами - последняя страница
            page_obj = paginator.page(paginator.num_pages)
        
        # Подготавливаем данные для текущей страницы
        user_data = []
        for user in page_obj.object_list:  # page_obj.object_list содержит пользователей только текущей страницы
            user_data.append({
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'phone': user.phone,
                'points': user.points,
                'total_spent': float(user.total_spent),
                'visits_count': user.visits_count,
                'last_visit': user.last_visit,
                'date_joined': user.date_joined,
                'is_active': user.is_active,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'barcode': user.barcode
            })
        
        # Возвращаем ответ с пагинацией
        return get_paginated_response(page_obj, user_data, request)


class AdminDashboardView(APIView):
    """Статистика кофейни"""
    @method_decorator(login_required)
    @method_decorator(staff_required)
    def get(self, request):
        from django.db.models import Sum, Count
        from django.utils import timezone
        
        total_customers = User.objects.filter(
            is_staff=False, 
            is_superuser=False
        ).count()
        
        total_purchases = Purchase.objects.count()
        total_revenue_result = Purchase.objects.aggregate(
            total=Sum('final_amount')
        )
        total_revenue = total_revenue_result['total'] or 0
        
        today = timezone.now().date()
        today_purchases = Purchase.objects.filter(
            purchase_date__date=today
        )
        today_count = today_purchases.count()
        today_revenue_result = today_purchases.aggregate(
            total=Sum('final_amount')
        )
        today_revenue = today_revenue_result['total'] or 0
        
        top_customers = User.objects.filter(
            is_staff=False, is_superuser=False
        ).order_by('-total_spent')[:5]
        
        top_customers_data = []
        for customer in top_customers:
            top_customers_data.append({
                'name': customer.first_name,
                'email': customer.email,
                'total_spent': float(customer.total_spent),
                'visits': customer.visits_count
            })
        
        return Response({
            'general': {
                'total_customers': total_customers,
                'total_purchases': total_purchases,
                'total_revenue': float(total_revenue),
                'average_receipt': float(total_revenue / total_purchases) if total_purchases > 0 else 0
            },
            'today': {
                'purchases_count': today_count,
                'revenue': float(today_revenue),
                'average_today': float(today_revenue / today_count) if today_count > 0 else 0
            },
            'top_customers': top_customers_data
        })

# ============================================================================
# ПУБЛИЧНЫЕ ФУНКЦИИ
# ============================================================================

class CheckEmailView(APIView):
    """Проверить, свободен ли email"""
    def get(self, request, email):
        exists = User.objects.filter(email=email).exists()
        return Response({
            'email': email,
            'available': not exists,
            'message': 'Email занят' if exists else 'Email свободен'
        })


class CheckPhoneView(APIView):
    """Проверить, свободен ли телефон"""
    def get(self, request, phone):
        exists = User.objects.filter(phone=phone).exists()
        return Response({
            'phone': phone,
            'available': not exists,
            'message': 'Телефон занят' if exists else 'Телефон свободен'
        })


class LoyaltyInfoView(APIView):
    """Информация о программе лояльности"""
    def get(self, request):
        settings = LoyaltySettings.get_settings()
        
        return Response({
            'program_name': 'MagicUP Coffee Loyalty',
            'points_percentage': float(settings.points_percentage),
            'max_points_per_use': settings.max_points_per_use,
            'rules': [
                f'Начисляем {settings.points_percentage}% от суммы покупки',
                f'Максимум можно списать {settings.max_points_per_use} баллов за раз',
                '1 балл = 1 рубль скидки',
                'Баллы не сгорают'
            ],
            'benefits': [
                'Бесплатный кофе после 10 посещений',
                'Скидка 20% в день рождения',
                'Доступ к специальным предложениям'
            ]
        })


class ValidateBarcodeView(APIView):
    """Проверить валидность штрихкода"""
    def get(self, request, barcode):
        if not barcode.isdigit() or len(barcode) != 13:
            return Response({
                'valid': False,
                'error': 'Штрихкод должен содержать 13 цифр'
            })
        
        exists = User.objects.filter(barcode=barcode).exists()
        
        if exists:
            return Response({
                'valid': True,
                'exists': True,
                'message': 'Штрихкод зарегистрирован'
            })
        else:
            return Response({
                'valid': True,
                'exists': False,
                'message': 'Штрихкод свободен'
            })

class PrintBarcodeView(APIView):
    """Сгенерировать PDF/изображение штрихкода для печати"""
    @method_decorator(login_required)
    def get(self, request):
        # Проверяем, что у пользователя есть штрихкод
        if not request.user.barcode:
            return Response({
                'error': 'У пользователя нет штрихкода'
            }, status=400)
        
        # Получаем параметры запроса
        format_type = request.GET.get('format', 'image')  # image или pdf
        width = int(request.GET.get('width', 300))  # Ширина изображения
        height = int(request.GET.get('height', 150))  # Высота изображения
        
        # Генерируем изображение штрихкода
        barcode_image_base64 = request.user.get_barcode_image_base64()
        
        if not barcode_image_base64:
            return Response({
                'error': 'Не удалось сгенерировать штрихкод'
            }, status=500)
        
        if format_type == 'image':
            # Возвращаем изображение в base64
            return Response({
                'success': True,
                'format': 'image',
                'customer_name': request.user.first_name,
                'barcode': request.user.barcode,
                'barcode_image': barcode_image_base64,
                'download_url': barcode_image_base64  # URL для скачивания
            })
        elif format_type == 'pdf':
            # Для PDF потребуется дополнительная библиотека (reportlab)
            # Пока возвращаем сообщение, что PDF пока не поддерживается
            return Response({
                'success': False,
                'message': 'PDF формат временно не поддерживается. Используйте формат image.',
                'alternative': {
                    'format': 'image',
                    'barcode_image': barcode_image_base64
                }
            }, status=400)
        else:
            return Response({
                'error': 'Неподдерживаемый формат. Используйте image или pdf.'
            }, status=400)

# ============================================================================
# ВОССТАНОВЛЕНИЕ ПАРОЛЯ (ЗАГЛУШКИ)
# ============================================================================

class PasswordResetRequestView(APIView):
    """Запрос на сброс пароля (заглушка)"""
    def post(self, request):
        # TODO: Реализовать отправку email с токеном сброса
        email = request.data.get('email')
        
        if not email:
            return Response(
                {'error': 'Укажите email'},
                status=400
            )
        
        try:
            user = User.objects.get(email=email)
            if not user.is_active:
                return Response(
                    {'error': 'Аккаунт деактивирован'},
                    status=400
                )
            
            # Генерируем токен (упрощенная версия)
            import secrets
            token = secrets.token_urlsafe(32)
            user.reset_password_token = token
            # Токен действует 1 час
            from django.utils import timezone
            from datetime import timedelta
            user.reset_password_token_expires = timezone.now() + timedelta(hours=1)
            user.save()
            
            return Response({
                'success': True,
                'message': f'Инструкции по сбросу пароля отправлены на {email}',
                'note': 'В реальном приложении здесь отправляется email с ссылкой'
            })
            
        except User.DoesNotExist:
            # Для безопасности не сообщаем, что email не существует
            return Response({
                'success': True,
                'message': 'Если email зарегистрирован, инструкции будут отправлены'
            })


class PasswordResetConfirmView(APIView):
    """Подтверждение сброса пароля (заглушка)"""
    def post(self, request, uidb64, token):
        # TODO: Реализовать проверку uidb64 и токена
        new_password = request.data.get('new_password')
        new_password_confirm = request.data.get('new_password_confirm')
        
        if not new_password or not new_password_confirm:
            return Response(
                {'error': 'Укажите новый пароль и подтверждение'},
                status=400
            )
        
        if new_password != new_password_confirm:
            return Response(
                {'error': 'Пароли не совпадают'},
                status=400
            )
        
        try:
            # В реальном приложении здесь декодируется uidb64 и проверяется токен
            # Пока просто ищем по токену (упрощенно)
            user = User.objects.get(reset_password_token=token)
            
            # Проверяем срок действия токена
            from django.utils import timezone
            if user.reset_password_token_expires < timezone.now():
                return Response(
                    {'error': 'Срок действия токена истек'},
                    status=400
                )
            
            # Устанавливаем новый пароль
            user.set_password(new_password)
            user.reset_password_token = None
            user.reset_password_token_expires = None
            user.save()
            
            return Response({
                'success': True,
                'message': 'Пароль успешно изменен'
            })
            
        except User.DoesNotExist:
            return Response(
                {'error': 'Неверный или устаревший токен'},
                status=400
            )


# ============================================================================
# ЧЕК ПОКУПКИ
# ============================================================================

class GetReceiptView(APIView):
    """Получить чек покупки"""
    @method_decorator(login_required)
    @method_decorator(staff_required)
    def get(self, request, purchase_id):
        try:
            purchase = Purchase.objects.get(id=purchase_id)
            
            # Формируем данные чека
            receipt_data = {
                'purchase_id': purchase.id,
                'date': purchase.purchase_date.strftime('%d.%m.%Y %H:%M'),
                'customer': {
                    'name': purchase.user.first_name,
                    'email': purchase.user.email,
                    'phone': purchase.user.phone,
                },
                'cashier': request.user.first_name,
                'items': purchase.items_summary or 'Покупка в кофейне',
                'amounts': {
                    'total': float(purchase.total_amount),
                    'final': float(purchase.final_amount),
                    'discount': float(purchase.total_amount - purchase.final_amount),
                },
                'points': {
                    'used': purchase.points_used,
                    'earned': purchase.points_earned,
                    'balance': purchase.user.points,
                },
                'receipt_number': f"ЧЕК-{purchase.id:06d}",
                'tax_info': 'НДС не облагается',
                'footer': 'Спасибо за покупку! Ждем Вас снова!',
            }
            
            return Response({
                'success': True,
                'receipt': receipt_data,
                'printable': receipt_data,  # Для печати
            })
            
        except Purchase.DoesNotExist:
            return Response(
                {'error': 'Покупка не найдена'},
                status=404
            )


# ============================================================================
# СТАТИСТИКА ПОЛЬЗОВАТЕЛЯ
# ============================================================================

class MyStatisticsView(APIView):
    """Статистика текущего пользователя"""
    @method_decorator(login_required)
    def get(self, request):
        user = request.user
        
        # Рассчитываем средний чек
        avg_receipt = 0
        if user.visits_count > 0:
            avg_receipt = float(user.total_spent) / user.visits_count
        
        # Получаем последние покупки для графика
        last_purchases = Purchase.objects.filter(user=user).order_by('-purchase_date')[:10]
        
        purchase_history = []
        for purchase in last_purchases:
            purchase_history.append({
                'date': purchase.purchase_date.strftime('%d.%m.%Y'),
                'amount': float(purchase.final_amount),
                'points_earned': purchase.points_earned,
            })
        
        # Определяем уровень лояльности
        loyalty_level = 'Новичок'
        if user.visits_count >= 20:
            loyalty_level = 'VIP'
        elif user.visits_count >= 10:
            loyalty_level = 'Постоянный клиент'
        elif user.visits_count >= 5:
            loyalty_level = 'Активный клиент'
        
        return Response({
            'summary': {
                'total_spent': float(user.total_spent),
                'visits_count': user.visits_count,
                'average_receipt': round(avg_receipt, 2),
                'total_points_earned': user.points,
                'last_visit': user.last_visit.strftime('%d.%m.%Y %H:%M') if user.last_visit else None,
                'days_since_last_visit': (timezone.now() - user.last_visit).days if user.last_visit else None,
            },
            'loyalty': {
                'level': loyalty_level,
                'points_percentage': float(LoyaltySettings.get_settings().points_percentage),
                'max_points_per_use': LoyaltySettings.get_settings().max_points_per_use,
                'next_level_visits': max(0, 20 - user.visits_count) if user.visits_count < 20 else 0,
            },
            'purchase_history': purchase_history,
        })


# ============================================================================
# АДМИНИСТРАТИВНЫЕ ФУНКЦИИ (ПРОСТЫЕ РЕАЛИЗАЦИИ)
# ============================================================================

class AdminUserSearchView(APIView):
    """Поиск пользователей (админка)"""
    @method_decorator(login_required)
    @method_decorator(staff_required)
    def get(self, request):
        query = request.GET.get('q', '')
        
        if not query:
            return Response({'error': 'Укажите поисковый запрос'}, status=400)
        
        # Ищем по разным полям
        users = User.objects.filter(
            models.Q(email__icontains=query) |
            models.Q(first_name__icontains=query) |
            models.Q(phone__icontains=query) |
            models.Q(barcode__icontains=query)
        ).order_by('-date_joined')[:50]  # Ограничиваем результаты
        
        user_data = []
        for user in users:
            user_data.append({
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'phone': user.phone,
                'points': user.points,
                'total_spent': float(user.total_spent),
                'visits_count': user.visits_count,
                'is_active': user.is_active,
                'barcode': user.barcode,
            })
        
        return Response({
            'success': True,
            'query': query,
            'count': len(user_data),
            'users': user_data,
        })


class AdminUserDetailView(APIView):
    """Детали пользователя (админка)"""
    @method_decorator(login_required)
    @method_decorator(staff_required)
    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            
            # Получаем историю покупок пользователя
            purchases = Purchase.objects.filter(user=user).order_by('-purchase_date')[:20]
            
            purchase_history = []
            for purchase in purchases:
                purchase_history.append({
                    'id': purchase.id,
                    'date': purchase.purchase_date.strftime('%d.%m.%Y %H:%M'),
                    'total_amount': float(purchase.total_amount),
                    'final_amount': float(purchase.final_amount),
                    'points_used': purchase.points_used,
                    'points_earned': purchase.points_earned,
                    'items': purchase.items_summary,
                })
            
            return Response({
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'phone': user.phone,
                    'points': user.points,
                    'total_spent': float(user.total_spent),
                    'visits_count': user.visits_count,
                    'last_visit': user.last_visit,
                    'date_joined': user.date_joined,
                    'is_active': user.is_active,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser,
                    'barcode': user.barcode,
                    'barcode_image': user.get_barcode_image_base64(),
                },
                'purchase_history': purchase_history,
                'stats': {
                    'avg_receipt': float(user.total_spent / user.visits_count) if user.visits_count > 0 else 0,
                    'days_since_last_visit': (timezone.now() - user.last_visit).days if user.last_visit else None,
                    'days_since_join': (timezone.now() - user.date_joined).days,
                }
            })
            
        except User.DoesNotExist:
            return Response(
                {'error': 'Пользователь не найден'},
                status=404
            )


class ToggleUserActiveView(APIView):
    """Блокировка/разблокировка пользователя"""
    @method_decorator(login_required)
    @method_decorator(staff_required)
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            
            # Нельзя блокировать суперпользователей
            if user.is_superuser:
                return Response({
                    'error': 'Нельзя блокировать администратора'
                }, status=400)
            
            # Нельзя блокировать себя
            if user == request.user:
                return Response({
                    'error': 'Нельзя заблокировать самого себя'
                }, status=400)
            
            # Переключаем статус
            user.is_active = not user.is_active
            user.save()
            
            return Response({
                'success': True,
                'message': f'Пользователь {"разблокирован" if user.is_active else "заблокирован"}',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'is_active': user.is_active,
                }
            })
            
        except User.DoesNotExist:
            return Response(
                {'error': 'Пользователь не найден'},
                status=404
            )


class AdminEditUserView(APIView):
    """Редактирование пользователя (админка)"""
    @method_decorator(login_required)
    @method_decorator(staff_required)
    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            
            # Разрешаем редактировать только определенные поля
            allowed_fields = ['first_name', 'email', 'phone', 'points', 'is_active']
            
            data = request.data.copy()
            
            # Проверяем email на уникальность (если изменяется)
            if 'email' in data and data['email'] != user.email:
                if User.objects.filter(email=data['email']).exclude(id=user.id).exists():
                    return Response({
                        'error': 'Этот email уже используется другим пользователем'
                    }, status=400)
            
            # Обновляем только разрешенные поля
            for field in allowed_fields:
                if field in data:
                    setattr(user, field, data[field])
            
            user.save()
            
            return Response({
                'success': True,
                'message': 'Пользователь обновлен',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'phone': user.phone,
                    'points': user.points,
                    'is_active': user.is_active,
                }
            })
            
        except User.DoesNotExist:
            return Response(
                {'error': 'Пользователь не найден'},
                status=404
            )


class ResetUserPointsView(APIView):
    """Сброс баллов пользователю"""
    @method_decorator(login_required)
    @method_decorator(staff_required)
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            
            # Сохраняем старое значение для лога
            old_points = user.points
            
            # Сбрасываем баллы
            user.points = 0
            user.save()
            
            return Response({
                'success': True,
                'message': f'Баллы сброшены (было: {old_points})',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'old_points': old_points,
                    'new_points': user.points,
                }
            })
            
        except User.DoesNotExist:
            return Response(
                {'error': 'Пользователь не найден'},
                status=404
            )


class LoyaltySettingsView(APIView):
    """Настройки лояльности"""
    @method_decorator(login_required)
    @method_decorator(staff_required)
    def get(self, request):
        """Получить текущие настройки"""
        settings = LoyaltySettings.get_settings()
        
        return Response({
            'settings': {
                'id': settings.id,
                'points_percentage': float(settings.points_percentage),
                'max_points_per_use': settings.max_points_per_use,
                'updated_at': settings.updated_at,
            }
        })
    
    @method_decorator(login_required)
    @method_decorator(staff_required)
    def post(self, request):
        """Обновить настройки"""
        points_percentage = request.data.get('points_percentage')
        max_points_per_use = request.data.get('max_points_per_use')
        
        # Валидация
        errors = {}
        
        if points_percentage is not None:
            try:
                points_percentage = float(points_percentage)
                if points_percentage < 0 or points_percentage > 100:
                    errors['points_percentage'] = 'Процент должен быть от 0 до 100'
            except ValueError:
                errors['points_percentage'] = 'Некорректное значение процента'
        
        if max_points_per_use is not None:
            try:
                max_points_per_use = int(max_points_per_use)
                if max_points_per_use < 1:
                    errors['max_points_per_use'] = 'Минимум 1 балл'
            except ValueError:
                errors['max_points_per_use'] = 'Некорректное значение'
        
        if errors:
            return Response({'errors': errors}, status=400)
        
        # Обновляем настройки
        settings = LoyaltySettings.get_settings()
        
        if points_percentage is not None:
            settings.points_percentage = points_percentage
        if max_points_per_use is not None:
            settings.max_points_per_use = max_points_per_use
        
        settings.save()
        
        return Response({
            'success': True,
            'message': 'Настройки обновлены',
            'settings': {
                'id': settings.id,
                'points_percentage': float(settings.points_percentage),
                'max_points_per_use': settings.max_points_per_use,
                'updated_at': settings.updated_at,
            }
        })


class ExportUsersCSVView(APIView):
    """Экспорт пользователей в CSV"""
    @method_decorator(login_required)
    @method_decorator(staff_required)
    def get(self, request):
        import csv
        from django.http import HttpResponse
        import io
        
        # Создаем HttpResponse с CSV
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="users_export.csv"'
        
        # Создаем CSV writer
        writer = csv.writer(response)
        
        # Заголовки
        writer.writerow([
            'ID', 'Email', 'Имя', 'Телефон', 'Баллы', 
            'Всего потрачено', 'Посещений', 'Последнее посещение',
            'Дата регистрации', 'Активен', 'Штрихкод'
        ])
        
        # Данные
        users = User.objects.all().order_by('-date_joined')
        for user in users:
            writer.writerow([
                user.id,
                user.email,
                user.first_name,
                user.phone or '',
                user.points,
                float(user.total_spent),
                user.visits_count,
                user.last_visit.strftime('%Y-%m-%d %H:%M') if user.last_visit else '',
                user.date_joined.strftime('%Y-%m-%d %H:%M'),
                'Да' if user.is_active else 'Нет',
                user.barcode or '',
            ])
        
        return response

    # accounts/views.py - добавьте в конец файла

class DebugSessionView(APIView):
    """Отладка сессии - проверить статус авторизации и cookies"""
    
    def get(self, request):
        """Проверка сессии пользователя"""
        from django.contrib.sessions.models import Session
        from django.utils import timezone
        
        # Информация о текущем пользователе
        user_data = None
        if request.user.is_authenticated:
            user_data = {
                'id': request.user.id,
                'email': request.user.email,
                'first_name': request.user.first_name,
                'is_staff': request.user.is_staff,
                'is_superuser': request.user.is_superuser,
            }
        
        # Информация о сессии
        session_data = {}
        if request.session.session_key:
            try:
                session = Session.objects.get(
                    session_key=request.session.session_key,
                    expire_date__gt=timezone.now()
                )
                session_data = {
                    'session_key': request.session.session_key,
                    'expire_date': session.expire_date,
                    'data': session.get_decoded(),
                }
            except Session.DoesNotExist:
                session_data = {
                    'session_key': request.session.session_key,
                    'error': 'Сессия не найдена в БД'
                }
        
        return Response({
            'is_authenticated': request.user.is_authenticated,
            'user': user_data,
            'session': session_data,
            'cookies': {
                'sessionid': request.COOKIES.get('sessionid'),
                'csrftoken': request.COOKIES.get('csrftoken'),
            },
            'headers': {
                'x-csrftoken': request.headers.get('X-CSRFToken'),
                'cookie': bool(request.headers.get('Cookie')),
            }
        })
