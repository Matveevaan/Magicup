# home/serializers.py
from rest_framework import serializers
from .models import (
    HomePage, HomeCarouselImage, HomeGalleryPair, 
    HomeMap, HomeAdditionalImage
)

class CarouselSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomeCarouselImage
        fields = ['id', 'image_pc', 'image_phone', 'link', 'order']


class PairSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomeGalleryPair
        fields = [
            'id', 'image1', 'image2', 'link1', 'link2', 'order'
        ]


class MapSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomeMap
        fields = ['id', 'preview_image', 'preview_image_phone', 'iframe_code', 'order']


class AdditionalImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomeAdditionalImage
        fields = ['id', 'image', 'image_phone', 'link', 'order']


class HomePageSerializer(serializers.ModelSerializer):
    # Эти поля уже есть в модели, они автоматически сериализуются
    # Не нужно их переопределять, если не нужна дополнительная логика
    
    carousel = serializers.SerializerMethodField()
    pair = serializers.SerializerMethodField()
    map = serializers.SerializerMethodField()
    additional_images = serializers.SerializerMethodField()
    
    class Meta:
        model = HomePage
        fields = [
            'id', 
            'show_carousel',
            'show_pair',
            'show_map',
            'show_gallery',
            'carousel', 
            'pair', 
            'map', 
            'additional_images'
        ]
    
    def get_carousel(self, obj):
        if obj.show_carousel:
            slides = obj.carousel.filter(active=True).order_by('order')
            return CarouselSerializer(slides, many=True).data
        return []
    
    def get_pair(self, obj):
        if obj.show_pair:
            pair = obj.pair_images.filter(active=True).first()
            if pair:
                return PairSerializer(pair).data
        return None
    
    def get_map(self, obj):
        if obj.show_map:
            map_obj = obj.maps.filter(active=True).first()
            if map_obj:
                return MapSerializer(map_obj).data
        return None
    
    def get_additional_images(self, obj):
        if obj.show_gallery:
            images = obj.additional_images.filter(active=True).order_by('order')
            return AdditionalImageSerializer(images, many=True).data
        return []