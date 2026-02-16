# products/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import ProductGroup, Product
from .serializers import ProductGroupSerializer, ProductSerializer


# =========== ГРУППЫ ===========
class GroupListAPIView(APIView):
    """Все группы товаров"""
    
    def get(self, request):
        # Просто все группы
        groups = ProductGroup.objects.all().order_by('display_order', 'name')
        
        serializer = ProductGroupSerializer(groups, many=True, context={'request': request})
        return Response(serializer.data)


class GroupDetailAPIView(APIView):
    """Одна группа с товарами"""
    
    def get(self, request, slug):
        # Находим группу
        group = get_object_or_404(ProductGroup, slug=slug)
        
        # Товары этой группы
        products = group.products.filter(is_available=True).order_by('display_order')
        
        # Данные группы
        group_data = ProductGroupSerializer(group, context={'request': request}).data
        
        # Добавляем товары в ответ
        group_data['products'] = ProductSerializer(
            products, 
            many=True, 
            context={'request': request}
        ).data
        
        return Response(group_data)


# =========== ТОВАРЫ ===========
class ProductListAPIView(APIView):
    """Все товары"""
    
    def get(self, request):
        # Базовый запрос - только доступные товары
        products = Product.objects.filter(is_available=True).order_by('display_order', 'name')
        
        # Фильтры из параметров
        group_slug = request.GET.get('group')
        menu_type = request.GET.get('menu_type')
        featured = request.GET.get('featured')
        
        if group_slug:
            products = products.filter(group__slug=group_slug)
        
        if menu_type:
            products = products.filter(group__menu_type=menu_type)
        
        if featured == 'true':
            products = products.filter(is_featured=True)
        
        serializer = ProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)


class ProductDetailAPIView(APIView):
    """Один товар"""
    
    def get(self, request, slug):
        product = get_object_or_404(Product, slug=slug, is_available=True)
        serializer = ProductSerializer(product, context={'request': request})
        return Response(serializer.data)


# =========== МЕНЮ ===========
class MenuAPIView(APIView):
    """Полное меню для сайта"""
    
    def get(self, request):
        # Все группы с товарами
        groups = ProductGroup.objects.all().order_by('display_order', 'name')
        
        # Для каждой группы получаем товары
        menu_data = []
        
        for group in groups:
            # Товары этой группы
            products = group.products.filter(is_available=True).order_by('display_order')
            
            if products.exists():  # Только группы с товарами
                group_data = {
                    'id': group.id,
                    'name': group.name,
                    'slug': group.slug,
                    'menu_type': group.menu_type,
                    'menu_type_display': group.get_menu_type_display(),
                    'products': ProductSerializer(
                        products, 
                        many=True, 
                        context={'request': request}
                    ).data
                }
                menu_data.append(group_data)
        
        return Response(menu_data)


# =========== ПОИСК ===========
class SearchAPIView(APIView):
    """Поиск товаров"""
    
    def get(self, request):
        query = request.GET.get('q', '').strip()
        
        if not query or len(query) < 2:
            return Response({'results': []})
        
        # Ищем товары по названию и описанию
        products = Product.objects.filter(
            Q(name__icontains=query) |
            Q(short_description__icontains=query) |
            Q(composition__icontains=query),
            is_available=True
        ).order_by('name')
        
        serializer = ProductSerializer(products, many=True, context={'request': request})
        return Response({'results': serializer.data, 'query': query})


# =========== РЕКОМЕНДУЕМЫЕ ===========
class FeaturedAPIView(APIView):
    """Рекомендуемые товары"""
    
    def get(self, request):
        # Только рекомендуемые товары
        products = Product.objects.filter(
            is_featured=True,
            is_available=True
        ).order_by('-created_at')[:12]  # Ограничиваем 12 товарами
        
        serializer = ProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)


# =========== ПО ТИПАМ МЕНЮ ===========
class MenuByTypeAPIView(APIView):
    """Товары по типу меню (Напитки/Десерты/Сэндвичи)"""
    
    def get(self, request, menu_type):
        # Проверяем валидность типа
        valid_types = ['drinks', 'desserts', 'sandwiches']
        if menu_type not in valid_types:
            return Response(
                {'error': f'Неправильный тип меню. Допустимые: {", ".join(valid_types)}'},
                status=400
            )
        
        # Группы этого типа
        groups = ProductGroup.objects.filter(menu_type=menu_type).order_by('display_order')
        
        # Все товары этих групп
        products = Product.objects.filter(
            group__menu_type=menu_type,
            is_available=True
        ).order_by('group__display_order', 'display_order')
        
        # Подготовка данных
        result = {
            'menu_type': menu_type,
            'menu_type_display': dict(ProductGroup.MENU_TYPES).get(menu_type, menu_type),
            'groups': [],
            'products': ProductSerializer(products, many=True, context={'request': request}).data
        }
        
        # Добавляем группы
        for group in groups:
            result['groups'].append({
                'id': group.id,
                'name': group.name,
                'slug': group.slug,
                'products_count': group.products.filter(is_available=True).count()
            })
        
        return Response(result)