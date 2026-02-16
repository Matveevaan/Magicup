# promotions/models.py
from django.db import models
from django.utils.text import slugify
from django.urls import reverse
from tinymce.models import HTMLField

class Promotion(models.Model):
    """
    Модель для акций кофейни
    """
    # Основная информация
    title = models.CharField(
        max_length=200,
        verbose_name='Название акции',
        help_text='Не более 200 символов'
    )
    
    slug = models.SlugField(
        max_length=200,
        unique=True,
        verbose_name='URL-адрес акции',
        help_text='Уникальная часть URL. Заполняется автоматически.'
    )
    
    # Визуальная часть
    image = models.ImageField(
        upload_to='promotions/%Y/%m/%d/',
        verbose_name='Изображение акции',
        help_text='Рекомендуемый размер: 1200×600 пикселей.',
        blank=False,
        null=False
    )
    
    # Описание с WYSIWYG редактором
    description = HTMLField(
        verbose_name='Описание акции',
        help_text='Полное описание акции с форматированием (макс. 500 символов)'
    )
    
    # Краткое описание для карточек
    short_description = models.CharField(
        max_length=200,
        verbose_name='Краткое описание (для карточек)',
        help_text='Краткое описание для отображения в карточке (макс. 200 символов)',
        blank=True
    )
    
    # Период действия
    start_date = models.DateField(
        verbose_name='Дата начала',
        help_text='Когда акция начинает действовать'
    )
    
    end_date = models.DateField(
        verbose_name='Дата окончания',
        help_text='Когда акция заканчивается'
    )
    
    # Статусы
    is_active = models.BooleanField(
        default=True,
        verbose_name='Активна',
        help_text='Отметьте, если акция активна'
    )
    
    is_featured = models.BooleanField(
        default=False,
        verbose_name='Популярная акция',
        help_text='Выделить на главной странице'
    )
    
    # Метаданные
    created_date = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    
    updated_date = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )
    
    # Порядок отображения
    order = models.PositiveIntegerField(
        default=0,
        verbose_name='Порядок отображения',
        help_text='Чем меньше число, тем выше в списке'
    )

    def save(self, *args, **kwargs):
        """Автоматическое создание slug"""
        if not self.slug:
            self.slug = slugify(self.title)
        
        # Автозаполнение short_description если пустое
        if not self.short_description:
            # Удаляем HTML теги и берем первые 200 символов
            import re
            plain_text = re.sub(r'<[^>]+>', '', self.description)
            self.short_description = plain_text[:200].strip()
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.title
    
    def is_current(self):
        """Проверяет, активна ли акция в данный момент"""
        from django.utils import timezone
        today = timezone.now().date()
        return self.start_date <= today <= self.end_date and self.is_active
    
    class Meta:
        verbose_name = 'Акция'
        verbose_name_plural = 'Акции'
        ordering = ['order', '-created_date']
        indexes = [
            models.Index(fields=['is_active', 'start_date', 'end_date']),
            models.Index(fields=['slug']),
        ]