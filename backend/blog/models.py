from django.db import models
from django.conf import settings
from tinymce.models import HTMLField  # Импорт для WYSIWYG
from django.utils.text import slugify
from django.urls import reverse
import re

class Category(models.Model):
    """
    Модель категории для группировки статей блога.
    """
    name = models.CharField(
        max_length=100,
        verbose_name='Название категории',
        help_text='Максимум 100 символов. Например: "Новости", "Рецепты"'
    )
    slug = models.SlugField(
        max_length=100,
        unique=True,
        verbose_name='URL-адрес категории',
        help_text='Уникальная часть URL для этой категории. Заполняется автоматически.'
    )

    def save(self, *args, **kwargs):
        """Автоматическое создание slug из названия, если он не задан."""
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'Категория'
        verbose_name_plural = 'Категории'
        ordering = ['name']

class Post(models.Model):
    """
    Основная модель для статей блога кофейни.
    """
    # 1. Основная информация
    title = models.CharField(
        max_length=200,
        verbose_name='Заголовок статьи',
        help_text='Не более 200 символов. Будет отображаться в заголовке страницы.'
    )
    
    slug = models.SlugField(
        max_length=200,
        unique=True,
        verbose_name='URL-адрес статьи',
        help_text='Уникальная часть URL. Используется для создания читаемых ссылок.'
    )
    
    # 2. Связи с другими моделями
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,  # Ссылается на 'accounts.User'
        on_delete=models.CASCADE,
        verbose_name='Автор',
        related_name='blog_posts',
        help_text='Пользователь, который создал статью.'
    )
    excerpt = models.TextField(
        'Краткое описание',
        max_length=300,
        blank=True,
        help_text='Краткое описание для превью (до 300 символов).'
    )
    categories = models.ManyToManyField(
        Category,
        verbose_name='Категории',
        related_name='posts',
        blank=True,
        help_text='Выберите одну или несколько категорий для статьи.'
    )
    
    # 3. Содержимое статьи
    content = HTMLField( 
        verbose_name='Содержимое статьи',
        help_text='Основной текст статьи с форматированием. Используйте редактор выше.'
    )
    
    image = models.ImageField(
        upload_to='blog/%Y/%m/%d/',
        verbose_name='Главное изображение',
        help_text='Рекомендуемый размер: 1200×600 пикселей. Будет использоваться как превью.',
        blank=True,
        null=True
    )
    
    # 4. Мета-данные и статусы
    created_date = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    
    updated_date = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата последнего обновления'
    )
    
    published_date = models.DateTimeField(
        verbose_name='Дата публикации',
        blank=True,
        null=True,
        help_text='Если установить дату в будущем, статья опубликуется автоматически в это время.'
    )
    
    is_published = models.BooleanField(
        default=False,
        verbose_name='Опубликовано',
        help_text='Отметьте, чтобы статья появилась на сайте.'
    )
    
    is_featured = models.BooleanField(
        default=False,
        verbose_name='Рекомендуемая статья',
        help_text='Отметьте, чтобы выделить статью на главной странице.'
    )
    
    views = models.PositiveIntegerField(
        default=0,
        verbose_name='Количество просмотров',
        editable=False  # Это поле нельзя редактировать в админке
    )
    
    # 5. SEO-поля
    meta_title = models.CharField(
        max_length=200,
        verbose_name='Meta Title',
        blank=True,
        help_text='Заголовок для SEO. Если не заполнен, используется обычный заголовок.'
    )
    
    meta_description = models.TextField(
        max_length=300,
        verbose_name='Meta Description',
        blank=True,
        help_text='Краткое описание для поисковых систем (до 300 символов).'
    )

    def save(self, *args, **kwargs):
        """Автоматическая логика при сохранении статьи."""
        # Автоматически создаем slug из заголовка, если он не задан
        if not self.slug:
            self.slug = slugify(self.title)
        # Автоматически создаем excerpt из content, если не указан
        if not self.excerpt and self.content:
            # Убираем HTML-теги
            clean_text = re.sub(r'<[^>]+>', '', self.content)
            # Берем первые 300 символов
            if len(clean_text) > 300:
                self.excerpt = clean_text[:297] + '...'
            else:
                self.excerpt = clean_text
        # Если статья публикуется впервые, устанавливаем дату публикации
        if self.is_published and not self.published_date:
            from django.utils import timezone
            self.published_date = timezone.now()
        
        # Если снимаем с публикации, очищаем дату публикации
        if not self.is_published:
            self.published_date = None
        
        super().save(*args, **kwargs)
    
    def get_absolute_url(self):
        """Возвращает канонический URL для статьи."""
        return reverse('post_detail', kwargs={'slug': self.slug})
    
    def increase_views(self):
        """Увеличивает счетчик просмотров на 1."""
        self.views += 1
        self.save(update_fields=['views'])
    
    def __str__(self):
        return self.title
    
    class Meta:
        verbose_name = 'Статья блога'
        verbose_name_plural = 'Статьи блога'
        ordering = ['-published_date', '-created_date']
        indexes = [
            models.Index(fields=['-published_date', 'is_published']),
            models.Index(fields=['slug']),
        ]

        
