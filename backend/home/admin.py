# backend/home/admin.py
from django.contrib import admin
from .models import HomePage, HomeCarouselImage, HomeGalleryPair, HomeMap, HomeAdditionalImage

# Главная страница в админке
@admin.register(HomePage)
class HomePageAdmin(admin.ModelAdmin):
    # Поля для управления блоками
    fieldsets = [
        ('Управление блоками', {
            'fields': [
                ('show_carousel', 'show_pair'),
                ('show_map', 'show_gallery'),
            ],
        }),
    ]
    
    list_display = ['name', 'updated', 'show_carousel', 'show_pair', 'show_map', 'show_gallery']
    
    def get_inline_instances(self, request, obj=None):
        """Динамически добавляем inline только для включенных блоков"""
        inlines = []
        
        # Создаем inline классы только при необходимости
        if obj and obj.show_carousel:
            class CarouselInline(admin.TabularInline):
                model = HomeCarouselImage
                extra = 1
                fields = ['order', 'image_pc', 'image_phone', 'link', 'active']
                verbose_name = "Слайд карусели"
                verbose_name_plural = "🎠 Карусель (необязательно)"
            inlines.append(CarouselInline)
        
        if obj and obj.show_pair:
            class PairInline(admin.TabularInline):
                model = HomeGalleryPair
                extra = 1
                max_num = 1
                fields = ['order', 'image1', 'image2', 'link1', 'link2', 'active']
                verbose_name = "Пара картинок"
                verbose_name_plural = "📐 Пара картинок (необязательно)"
            inlines.append(PairInline)
        
        if obj and obj.show_map:
            class MapInline(admin.TabularInline):
                model = HomeMap
                extra = 1
                max_num = 1
                fields = ['order', 'preview_image', 'preview_image_phone', 'iframe_code', 'active']
                verbose_name = "Google Карта"
                verbose_name_plural = "🗺️ Google Карта (необязательно)"
                
                def formfield_for_dbfield(self, db_field, **kwargs):
                    if db_field.name == 'iframe_code':
                        kwargs['widget'] = admin.widgets.AdminTextareaWidget(attrs={'rows': 6})
                    return super().formfield_for_dbfield(db_field, **kwargs)
            inlines.append(MapInline)
        
        if obj and obj.show_gallery:
            class AdditionalImageInline(admin.TabularInline):
                model = HomeAdditionalImage
                extra = 3
                fields = ['order', 'image', 'image_phone', 'link', 'active']
                verbose_name = "Дополнительная картинка"
                verbose_name_plural = "➕ Дополнительные картинки (необязательно)"
            inlines.append(AdditionalImageInline)
        
        return [inline(self.model, self.admin_site) for inline in inlines]
    
    def has_add_permission(self, request):
        """Только одна главная страница"""
        return not HomePage.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        """Нельзя удалить главную страницу"""
        return False


# Регистрируем модели для прямого доступа в админке
@admin.register(HomeCarouselImage)
class HomeCarouselImageAdmin(admin.ModelAdmin):
    list_display = ['id', 'page', 'order', 'active']
    list_filter = ['active', 'page']
    list_editable = ['order', 'active']
    ordering = ['page', 'order']
    search_fields = ['link']

@admin.register(HomeGalleryPair)
class HomeGalleryPairAdmin(admin.ModelAdmin):
    list_display = ['page', 'order', 'active']
    list_filter = ['active', 'page']
    list_editable = ['order', 'active']
    ordering = ['page', 'order']

@admin.register(HomeMap)
class HomeMapAdmin(admin.ModelAdmin):
    list_display = ['page', 'order', 'active']
    list_filter = ['active', 'page']
    list_editable = ['order', 'active']
    ordering = ['page', 'order']

@admin.register(HomeAdditionalImage)
class HomeAdditionalImageAdmin(admin.ModelAdmin):
    list_display = ['page', 'order', 'active']
    list_filter = ['active', 'page']
    list_editable = ['order', 'active']
    ordering = ['page', 'order']