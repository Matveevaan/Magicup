# backend/blog/admin.py

from django.contrib import admin
from .models import Category, Post
from tinymce.widgets import TinyMCE
from django.db import models

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'is_published', 'published_date', 'views')
    list_filter = ('is_published', 'categories', 'author')
    search_fields = ('title', 'content')
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ('views', 'created_date', 'updated_date')
    
    # Используем TinyMCE для поля content
    formfield_overrides = {
        models.TextField: {'widget': TinyMCE()},
    }
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('title', 'slug', 'author', 'content', 'image')
        }),
        ('Категории и теги', {
            'fields': ('categories',)
        }),
        ('Даты и статус', {
            'fields': ('published_date', 'is_published', 'is_featured')
        }),
        ('SEO', {
            'fields': ('meta_title', 'meta_description'),
            'classes': ('collapse',)
        }),
        ('Статистика', {
            'fields': ('views', 'created_date', 'updated_date'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Автоматически устанавливаем автора при создании"""
        if not obj.pk:  # Если объект создается впервые
            obj.author = request.user
        super().save_model(request, obj, form, change)
        