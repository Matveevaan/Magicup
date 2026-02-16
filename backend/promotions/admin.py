# promotions/admin.py
from django.contrib import admin
from django import forms
from .models import Promotion

class PromotionAdminForm(forms.ModelForm):
    class Meta:
        model = Promotion
        fields = '__all__'
    
    def clean_description(self):
        """Проверяем ограничение на 500 символов (без HTML тегов)"""
        import re
        description = self.cleaned_data.get('description', '')
        
        # Удаляем HTML теги и считаем символы
        plain_text = re.sub(r'<[^>]+>', '', description)
        
        if len(plain_text) > 500:
            raise forms.ValidationError(
                f'Текст описания не должен превышать 500 символов. Сейчас: {len(plain_text)} символов.'
            )
        
        return description

@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    form = PromotionAdminForm
    list_display = ['title', 'is_active', 'is_featured', 'start_date', 'end_date', 'order']
    list_filter = ['is_active', 'is_featured', 'start_date', 'end_date']
    search_fields = ['title', 'description']
    prepopulated_fields = {'slug': ('title',)}
    ordering = ['order', '-created_date']