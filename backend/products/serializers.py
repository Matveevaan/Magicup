# products/serializers.py
from rest_framework import serializers
from .models import ProductGroup, Product, ProductVariant


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ['id', 'volume_name', 'volume_value', 'price', 'calories', 
                 'is_available', 'is_default']


class ProductSerializer(serializers.ModelSerializer):
    # Вычисляемые поля
    menu_type = serializers.CharField(source='group.menu_type', read_only=True)
    menu_type_display = serializers.CharField(source='group.get_menu_type_display', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)
    
    # Варианты
    variants = ProductVariantSerializer(many=True, read_only=True)
    
    # URL изображения
    image_url = serializers.SerializerMethodField()
    
    # Минимальная цена - это SerializerMethodField, а не поле модели!
    min_price = serializers.SerializerMethodField()  # ← ДОБАВИТЬ ЭТУ СТРОЧКУ!
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'group', 'group_name', 'menu_type', 'menu_type_display',
            'short_description', 'composition', 'image', 'image_url',
            'is_available', 'is_featured', 'display_order',
            'created_at', 'min_price', 'variants'  # min_price остаётся здесь
        ]
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
    
    def get_min_price(self, obj):
        """Метод для получения минимальной цены"""
        return obj.get_min_price()  


class ProductGroupSerializer(serializers.ModelSerializer):
    menu_type_display = serializers.CharField(source='get_menu_type_display', read_only=True)
    
    class Meta:
        model = ProductGroup
        fields = ['id', 'name', 'slug', 'menu_type', 'menu_type_display', 
                 'description', 'display_order']