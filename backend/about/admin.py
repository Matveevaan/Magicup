# about/admin.py - упрощенная версия
from django.contrib import admin
from django.utils.html import format_html
from .models import AboutPage, Gallery, GalleryImage

# Inline для изображений галереи
class GalleryImageInline(admin.TabularInline):
    model = GalleryImage
    extra = 1
    fields = ['image', 'caption', 'show_caption', 'display_order']
    classes = ['collapse']

# Inline для галерей
class GalleryInline(admin.TabularInline):
    model = Gallery
    extra = 1
    fields = ['title', 'description', 'show_title', 'show_description', 'is_visible', 'display_order']
    classes = ['collapse']
    show_change_link = True
    inlines = [GalleryImageInline]

@admin.register(AboutPage)
class AboutPageAdmin(admin.ModelAdmin):
    # Только для чтения
    readonly_fields = ['image_preview', 'updated_at']
    
    # Inline галерей
    inlines = [GalleryInline]
    
    # Список
    list_display = ['title', 'is_active', 'updated_at', 'show_main_image', 'show_main_text']
    list_editable = ['is_active', 'show_main_image', 'show_main_text']
    list_filter = ['is_active', 'show_main_image', 'show_main_text']
    
    # Поля
    fieldsets = (
        ('Основные настройки', {
            'fields': ('title', 'slug', 'is_active', 'updated_at')
        }),
        ('Главное изображение', {
            'fields': ('main_image', 'show_main_image', 'image_preview')
        }),
        ('Основной текст', {
            'fields': ('main_text', 'show_main_text')
        }),
        ('SEO настройки', {
            'fields': ('meta_title', 'meta_description'),
            'classes': ('collapse',)
        }),
    )
    
    def image_preview(self, obj):
        """Безопасный предпросмотр изображения"""
        if obj and obj.main_image:
            try:
                url = obj.main_image.url
                return format_html(
                    '<img src="{}" style="max-width: 300px; max-height: 200px;" />',
                    url
                )
            except:
                return "Изображение не доступно"
        return "Изображение не загружено"
    
    image_preview.short_description = 'Предпросмотр'

@admin.register(Gallery)
class GalleryAdmin(admin.ModelAdmin):
    inlines = [GalleryImageInline]
    list_display = ['title', 'about_page', 'is_visible', 'display_order']
    list_editable = ['is_visible', 'display_order']
    list_filter = ['is_visible', 'about_page']
    search_fields = ['title', 'description']

@admin.register(GalleryImage)
class GalleryImageAdmin(admin.ModelAdmin):
    list_display = ['caption', 'gallery', 'show_caption', 'display_order']
    list_editable = ['show_caption', 'display_order']
    list_filter = ['gallery', 'show_caption']
    search_fields = ['caption']