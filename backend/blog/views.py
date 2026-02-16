
from rest_framework import viewsets, filters, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Post, Category
from .serializers import PostListSerializer, PostDetailSerializer, CategorySerializer

class PostViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API для статей блога
    """
    queryset = Post.objects.filter(is_published=True).order_by('-published_date')
    serializer_class = PostListSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content', 'excerpt']
    ordering_fields = ['published_date', 'views', 'title']
    
    # КЛЮЧЕВАЯ НАСТРОЙКА: используем slug вместо id
    lookup_field = 'slug'
    lookup_url_kwarg = 'slug'
    
    # Разрешаем доступ всем (публичный API)
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        """Используем разные сериализаторы для списка и деталей"""
        if self.action == 'retrieve':
            return PostDetailSerializer
        return PostListSerializer
    
    def get_object(self):
        """Переопределяем для поиска по slug"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Получаем slug из URL параметров
        slug = self.kwargs.get('slug')
        
        # Ищем статью по slug
        obj = get_object_or_404(queryset, slug=slug)
        
        # Проверяем права доступа
        self.check_object_permissions(self.request, obj)
        
        return obj
    
    def retrieve(self, request, *args, **kwargs):
        """Увеличиваем счетчик просмотров при открытии статьи"""
        instance = self.get_object()
        instance.increase_views()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Получить рекомендуемые статьи"""
        featured_posts = self.get_queryset().filter(is_featured=True)[:3]
        serializer = self.get_serializer(featured_posts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='by_category')
    def by_category(self, request):
        """Получить статьи по категории"""
        category_slug = request.query_params.get('category_slug', '')
        
        if not category_slug:
            return Response(
                {'error': 'category_slug parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            category = Category.objects.get(slug=category_slug)
        except Category.DoesNotExist:
            return Response(
                {'error': 'Category not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        posts = self.get_queryset().filter(categories=category)
        
        page = self.paginate_queryset(posts)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """API для категорий"""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = None  # Отключаем пагинацию для категорий
    
    def list(self, request, *args, **kwargs):
        """Переопределяем для отладки"""
        print("=== DEBUG: Запрос списка категорий ===")
        print(f"Количество категорий в базе: {Category.objects.count()}")
        
        categories = Category.objects.all()
        for cat in categories:
            print(f"  - {cat.id}: {cat.name} (slug: {cat.slug})")
        
        # Проверяем, что queryset не пустой
        if not categories.exists():
            print("ВНИМАНИЕ: Категорий нет в базе данных!")
            print("Создайте категории через админку Django")
        
        return super().list(request, *args, **kwargs)