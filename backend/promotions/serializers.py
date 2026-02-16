# promotions/serializers.py
from rest_framework import serializers
from .models import Promotion

class PromotionSerializer(serializers.ModelSerializer):
    """Сериализатор для акций"""
    is_current = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Promotion
        fields = [
            'id', 'title', 'slug', 'image',
            'description', 'short_description', 'start_date', 'end_date',
            'is_active', 'is_featured', 'is_current',
            'created_date', 'updated_date'
        ]