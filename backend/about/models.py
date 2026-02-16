# about/models.py
from django.db import models
from tinymce import models as tinymce_models
from django.core.validators import FileExtensionValidator

class AboutPage(models.Model):
    """Основная страница 'О нас'"""
    title = models.CharField('Заголовок страницы', max_length=200, default='О нас')
    slug = models.SlugField('URL', max_length=200, unique=True, default='about')
    
    # Основное изображение (можно отключить)
    main_image = models.ImageField(
        'Главное изображение', 
        upload_to='about/',
        blank=True,
        null=True,
        help_text='Основное фото для страницы'
    )
    show_main_image = models.BooleanField('Показывать главное изображение', default=True)
    
    # Основной текст (можно отключить)
    main_text = tinymce_models.HTMLField('Основной текст', blank=True)
    show_main_text = models.BooleanField('Показывать основной текст', default=True)
    
    # Общие настройки
    is_active = models.BooleanField('Активно', default=True)
    meta_title = models.CharField('Meta Title', max_length=200, blank=True)
    meta_description = models.TextField('Meta Description', max_length=300, blank=True)
    
    updated_at = models.DateTimeField('Дата обновления', auto_now=True)
    
    class Meta:
        verbose_name = 'Страница "О нас"'
        verbose_name_plural = 'Страница "О нас"'
    
    def __str__(self):
        return self.title


class Gallery(models.Model):
    """Галерея на странице 'О нас'"""
    about_page = models.ForeignKey(
        AboutPage, 
        on_delete=models.CASCADE, 
        related_name='galleries'
    )
    
    title = models.CharField('Название галереи', max_length=200, blank=True)
    description = models.TextField('Описание галереи', blank=True)
    
    # Настройки отображения
    show_title = models.BooleanField('Показывать заголовок', default=True)
    show_description = models.BooleanField('Показывать описание', default=True)
    is_visible = models.BooleanField('Показывать галерею', default=True)
    
    # Порядок отображения
    display_order = models.PositiveIntegerField('Порядок отображения', default=0)
    
    class Meta:
        verbose_name = 'Галерея'
        verbose_name_plural = 'Галереи'
        ordering = ['display_order']
    
    def __str__(self):
        return self.title or f"Галерея #{self.id}"


class GalleryImage(models.Model):
    """Изображения в галерее"""
    gallery = models.ForeignKey(
        Gallery,
        on_delete=models.CASCADE,
        related_name='images'
    )
    
    image = models.ImageField(
        'Изображение', 
        upload_to='about/gallery/',
        validators=[
            FileExtensionValidator(
                allowed_extensions=['jpg', 'jpeg', 'png', 'webp'],
                message='Разрешены только файлы: JPG, JPEG, PNG, WebP'
            ),
        ],
        help_text='Рекомендуемый размер: 1200x800px (3:2), формат: JPEG/WebP, максимум 5MB'
    )
    caption = models.CharField('Подпись', max_length=200, blank=True)
    show_caption = models.BooleanField('Показывать подпись', default=True)
    
    # Порядок отображения
    display_order = models.PositiveIntegerField('Порядок отображения', default=0)
    
    class Meta:
        verbose_name = 'Изображение галереи'
        verbose_name_plural = 'Изображения галереи'
        ordering = ['display_order']
    
    def __str__(self):
        return f"Изображение {self.id}"