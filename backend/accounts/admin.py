# accounts/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django import forms
from django.core.exceptions import ValidationError
from .models import User, LoyaltySettings, Purchase


class CustomUserCreationForm(forms.ModelForm):
    """Форма для создания пользователя в админке"""
    password1 = forms.CharField(label='Пароль', widget=forms.PasswordInput)
    password2 = forms.CharField(label='Подтверждение пароля', widget=forms.PasswordInput)
    
    class Meta:
        model = User
        fields = ('email', 'first_name', 'phone')
    
    def clean_email(self):
        """Проверка уникальности email"""
        email = self.cleaned_data.get('email')
        if email and User.objects.filter(email=email).exists():
            raise ValidationError("Пользователь с таким email уже существует")
        return email
    
    def clean_username(self):
        """Проверка уникальности username"""
        username = self.cleaned_data.get('username')
        if username and User.objects.filter(username=username).exists():
            raise ValidationError("Пользователь с таким логином уже существует")
        return username
    
    def clean_password2(self):
        """Проверка совпадения паролей"""
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("Пароли не совпадают")
        return password2
    
    def save(self, commit=True):
        """Сохранение пользователя с правильной обработкой пароля и генерацией штрих-кода"""
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        
        # Генерация штрих-кода для обычных пользователей
        if not user.barcode and not user.is_superuser:
            user.generate_ean13_barcode()
        
        if commit:
            user.save()
        return user


class CustomUserAdmin(UserAdmin):
    """Кастомная админка для модели пользователя"""
    
    add_form = CustomUserCreationForm
    
    # Отображение в списке пользователей
    list_display = (
        'email', 'first_name', 'phone', 'points', 
        'total_spent', 'visits_count', 'is_staff', 'is_superuser', 'is_active'
    )
    
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'date_joined')
    
    search_fields = ('email', 'first_name', 'phone', 'barcode')
    
    ordering = ('-date_joined',)  # Новые пользователи сверху
    
    # Группировка полей при редактировании пользователя
    fieldsets = (
        (None, {'fields': ('email', 'username', 'password')}),
        ('Персональная информация', {'fields': ('first_name', 'last_name', 'phone')}),
        ('Система лояльности', {
            'fields': ('barcode', 'points', 'total_spent', 'visits_count', 'last_visit'),
            'classes': ('collapse',)  # Сворачиваемый блок
        }),
        ('Права доступа', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('Важные даты', {'fields': ('last_login', 'date_joined')}),
    )
    
    # Поля при создании нового пользователя
    add_fieldsets = (
        (None, {
            'classes': ('wide',),  # Широкое поле ввода
            'fields': ('email', 'first_name', 'phone', 'password1', 'password2'),
        }),
    )
    
    # Поля, которые всегда только для чтения
    readonly_fields = ('last_login', 'date_joined', 'barcode')
    
    def get_readonly_fields(self, request, obj=None):
        """
        Определяем, какие поля будут только для чтения.
        При редактировании существующего пользователя защищаем поля лояльности.
        """
        readonly_fields = list(super().get_readonly_fields(request, obj))
        
        if obj:  # Если редактируем существующего пользователя
            # Для не-администраторов защищаем поля лояльности от прямого редактирования
            if not obj.is_superuser and not obj.is_staff:
                readonly_fields.extend(['points', 'total_spent', 'visits_count', 'last_visit'])
            # Для суперпользователей разрешаем редактирование
            else:
                readonly_fields = [f for f in readonly_fields if f not in 
                                  ['points', 'total_spent', 'visits_count', 'last_visit']]
        
        return tuple(readonly_fields)
    
    def get_fieldsets(self, request, obj=None):
        """Динамически меняем fieldsets в зависимости от типа пользователя"""
        fieldsets = super().get_fieldsets(request, obj)
        
        if obj and obj.is_superuser:
            # Для суперпользователей убираем блок лояльности
            fieldsets = tuple(fs for fs in fieldsets if 'Система лояльности' not in fs[0])
        
        return fieldsets
    
    # Кастомные действия для админки
    actions = ['reset_points', 'export_users_csv']
    
    def reset_points(self, request, queryset):
        """Сбросить баллы выбранным пользователям"""
        # Не сбрасываем баллы администраторам
        users_to_reset = queryset.filter(is_staff=False, is_superuser=False)
        count = users_to_reset.update(points=0)
        
        self.message_user(
            request, 
            f'Баллы успешно сброшены для {count} пользователей'
        )
    
    reset_points.short_description = "Сбросить баллы лояльности"
    
    def export_users_csv(self, request, queryset):
        """Экспорт пользователей в CSV"""
        import csv
        from django.http import HttpResponse
        import io
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="users.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Email', 'Имя', 'Телефон', 'Баллы', 
            'Всего потрачено', 'Посещений', 'Статус'
        ])
        
        for user in queryset:
            status = 'Админ' if user.is_superuser else 'Персонал' if user.is_staff else 'Клиент'
            writer.writerow([
                user.email,
                user.first_name,
                user.phone,
                user.points,
                float(user.total_spent),
                user.visits_count,
                status
            ])
        
        return response
    
    export_users_csv.short_description = "Экспорт в CSV"


@admin.register(LoyaltySettings)
class LoyaltySettingsAdmin(admin.ModelAdmin):
    """Админка для настроек системы лояльности"""
    
    # Разрешаем только одну запись
    def has_add_permission(self, request):
        return not LoyaltySettings.objects.exists()
    
    # Запрещаем удаление
    def has_delete_permission(self, request, obj=None):
        return False
    
    list_display = (
        'points_percentage',
        'max_points_per_use',
        'updated_at',
    )
    
    fieldsets = (
        ('Основные настройки', {
            'fields': ('points_percentage', 'max_points_per_use'),
            'description': 'Настройте параметры начисления и использования баллов'
        }),
    )
    
    readonly_fields = ('updated_at',)
    
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        from django.contrib import messages
        messages.success(
            request, 
            f'Настройки лояльности обновлены! Теперь начисляется {obj.points_percentage}% баллов'
        )


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    """Админка для истории покупок"""
    
    list_display = (
        'user',
        'total_amount',
        'final_amount',
        'points_used',
        'points_earned',
        'purchase_date',
    )
    
    list_filter = ('purchase_date',)
    
    search_fields = ('user__email', 'user__first_name', 'items_summary')
    
    readonly_fields = ('purchase_date',)
    
    date_hierarchy = 'purchase_date'
    
    # Автозаполнение связанных полей
    autocomplete_fields = ['user']
    
    # Оптимизация запросов
    list_select_related = ('user',)


# Регистрируем модели
admin.site.register(User, CustomUserAdmin)
# LoyaltySettings и Purchase уже зарегистрированы через декораторы