from rest_framework import serializers
from .models import Post, Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']
        lookup_field = 'slug'

class PostListSerializer(serializers.ModelSerializer):
    """Сериализатор для списка статей (краткая информация)"""
    categories = CategorySerializer(many=True, read_only=True)
    author_name = serializers.CharField(source='author.username', read_only=True)
    
    class Meta:
        model = Post
        fields = [
            'id', 'title', 'slug', 'author_name',
            'image', 'excerpt', 'published_date',
            'views', 'categories'
        ]
        lookup_field = 'slug'
        extra_kwargs = {
            'url': {'lookup_field': 'slug'}
        }

class PostDetailSerializer(serializers.ModelSerializer):
    """Сериализатор для детального просмотра статьи"""
    categories = CategorySerializer(many=True, read_only=True)
    author_name = serializers.CharField(source='author.username', read_only=True)
    author_fullname = serializers.CharField(source='author.get_full_name', read_only=True)
    
    class Meta:
        model = Post
        fields = [
            'id', 'title', 'slug', 'content',
            'author_name', 'author_fullname',
            'image', 'published_date', 'views',
            'categories', 'meta_title', 'meta_description'
        ]
        lookup_field = 'slug'
        extra_kwargs = {
            'url': {'lookup_field': 'slug'}
        }