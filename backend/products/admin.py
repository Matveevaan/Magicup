# backend/products/admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import ProductGroup, Product, ProductVariant


class ProductInline(admin.TabularInline):
    """Встроенная форма для товаров в группе"""
    model = Product
    extra = 0
    fields = ['name', 'display_order', 'is_available', 'is_featured']
    show_change_link = True
    classes = ['collapse']


class ProductVariantInline(admin.TabularInline):
    """Встроенная форма для вариантов товара"""
    model = ProductVariant
    extra = 1  
    fields = ['volume_name', 'volume_value', 'price', 'calories', 'is_available', 'is_default']
    classes = ['collapse']
    
    def get_formset(self, request, obj=None, **kwargs):
        formset = super().get_formset(request, obj, **kwargs)
        formset.form.base_fields['volume_name'].help_text = 'Пример: Маленький, Средний, Порция'
        formset.form.base_fields['volume_value'].help_text = 'Пример: 250 мл, 350 мл, 100 г'
        return formset


@admin.register(ProductGroup)
class ProductGroupAdmin(admin.ModelAdmin):
    """Админка для групп товаров (подменю)"""
    list_display = ['name', 'menu_type_display', 'display_order', 'products_count']
    list_filter = ['menu_type']
    list_editable = ['display_order']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ProductInline]
    
    # Методы для отображения
    def menu_type_display(self, obj):
        return obj.get_menu_type_display()
    menu_type_display.short_description = 'Тип меню'
    
    def products_count(self, obj):
        return obj.products.count()
    products_count.short_description = 'Товаров'
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('menu_type', 'name', 'slug', 'description')
        }),
        ('Отображение', {
            'fields': ('display_order',)
        }),
    )


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Админка для товаров"""
    list_display = ['name', 'menu_type_display', 'group', 'display_order', 
                   'is_available', 'is_featured', 'min_price_display']
    list_filter = ['group__menu_type', 'group', 'is_available', 'is_featured', 'show_in_menu']
    list_editable = ['display_order', 'is_available', 'is_featured']
    search_fields = ['name', 'short_description', 'composition', 'group__name']
    prepopulated_fields = {'slug': ('name',)}
    
    # Встроенные формы для вариантов
    inlines = [ProductVariantInline]
    
    # Поля для формы
    fieldsets = (
        ('Основная информация', {
            'fields': ('group', 'name', 'slug', 'display_order')
        }),
        ('Описание', {
            'fields': ('short_description', 'composition')
        }),
        ('Изображение', {
            'fields': ('image', 'image_preview')
        }),
        ('Статусы', {
            'fields': ('is_available', 'is_featured', 'show_in_menu')
        }),
    )
    
    # Только для чтения
    readonly_fields = ['image_preview']
    
    # Методы для отображения
    def menu_type_display(self, obj):
        return obj.menu_type_display
    menu_type_display.short_description = 'Тип меню'
    
    def min_price_display(self, obj):
        min_price = obj.get_min_price()
        return f"{min_price} ₽" if min_price > 0 else "—"
    min_price_display.short_description = 'Цена от'
    
    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-height: 200px; max-width: 200px;"/>', 
                obj.image.url
            )
        return "Нет изображения"
    image_preview.short_description = 'Превью'


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    """Админка для вариантов товаров"""
    list_display = ['product', 'menu_type', 'group', 'volume_display', 
                   'price', 'calories', 'is_available', 'is_default']
    list_filter = ['is_available', 'is_default', 'product__group__menu_type', 'product__group']
    list_editable = ['price', 'calories', 'is_available', 'is_default']
    search_fields = ['product__name', 'volume_name', 'volume_value', 'product__group__name']
    
    # Методы для отображения
    def menu_type(self, obj):
        return obj.product.menu_type_display
    menu_type.short_description = 'Тип меню'
    
    def group(self, obj):
        return obj.product.group
    group.short_description = 'Группа'
    
    def volume_display(self, obj):
        if obj.volume_name and obj.volume_value:
            return f"{obj.volume_name} ({obj.volume_value})"
        elif obj.volume_value:
            return obj.volume_value
        return "—"
    volume_display.short_description = 'Объем'
    
    def price_display(self, obj):
        return f"{obj.price} ₽"
    price_display.short_description = 'Цена'
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('product', 'volume_name', 'volume_value')
        }),
        ('Цена и характеристики', {
            'fields': ('price', 'calories')
        }),
        ('Статусы', {
            'fields': ('is_available', 'is_default')
        }),
    )
