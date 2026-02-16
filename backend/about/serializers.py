# about/serializers.py
from rest_framework import serializers
from .models import AboutPage, Gallery, GalleryImage

class GalleryImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = GalleryImage
        fields = ['id', 'image', 'caption', 'show_caption', 'display_order']

class GallerySerializer(serializers.ModelSerializer):
    images = GalleryImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Gallery
        fields = [
            'id', 'title', 'description', 
            'show_title', 'show_description', 'is_visible',
            'display_order', 'images'
        ]

class AboutPageSerializer(serializers.ModelSerializer):
    galleries = GallerySerializer(many=True, read_only=True)
    
    class Meta:
        model = AboutPage
        fields = [
            'id', 'title', 'main_image', 'show_main_image',
            'main_text', 'show_main_text', 'is_active',
            'galleries'
        ]