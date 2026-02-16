# products/models.py

from django.db import models
from django.utils.text import slugify
from django.core.validators import MinValueValidator

class ProductGroup(models.Model):
    """Группа товаров (подменю) - например: Кофе, Чай, Торты"""
    
    # Тип меню (фиксированные категории)
    MENU_TYPES = [
        ('drinks', 'Напитки'),
        ('desserts', 'Десерты'),
        ('sandwiches', 'Сэндвичи и выпечка'),
    ]
    
    # Основные поля
    menu_type = models.CharField(
        'Тип меню',
        max_length=20,
        choices=MENU_TYPES,
        default='drinks'
    )
    name = models.CharField('Название группы', max_length=200)
    slug = models.SlugField('URL', max_length=200, unique=True, blank=True)
    description = models.TextField('Описание', blank=True)
    
    # Порядок отображения
    display_order = models.PositiveIntegerField('Порядок отображения', default=0)
    
    class Meta:
        verbose_name = 'Группа товаров'
        verbose_name_plural = 'Группы товаров'
        ordering = ['menu_type', 'display_order', 'name']
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(f"{self.get_menu_type_display()}-{self.name}")
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.get_menu_type_display()}: {self.name}"


class Product(models.Model):
    """Основной товар"""
    
    # Связь с группой
    group = models.ForeignKey(
        ProductGroup,
        on_delete=models.CASCADE,
        verbose_name='Группа',
        related_name='products'
    )
    
    # Основные поля
    name = models.CharField('Название', max_length=200)
    slug = models.SlugField('URL', max_length=200, unique=True, blank=True)
    
    # Описание
    short_description = models.TextField('Краткое описание', blank=True)
    composition = models.TextField('Состав', blank=True)
    
    # Изображение
    image = models.ImageField('Изображение', upload_to='products/', blank=True, null=True)
    
    # Статусы
    is_available = models.BooleanField('В наличии', default=True)
    is_featured = models.BooleanField('Рекомендуемый', default=False)
    show_in_menu = models.BooleanField('Показывать в меню', default=True)
    
    # Порядок в группе
    display_order = models.PositiveIntegerField('Порядок в группе', default=0)
    created_at = models.DateTimeField('Дата создания', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Товар'
        verbose_name_plural = 'Товары'
        ordering = ['group', 'display_order', '-is_featured', 'name']
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    # Свойства для удобства
    @property
    def menu_type(self):
        """Тип меню через группу"""
        return self.group.menu_type
    
    @property
    def menu_type_display(self):
        """Отображаемое название типа меню"""
        return self.group.get_menu_type_display()
    
    def get_min_price(self):
        """Минимальная цена среди всех вариантов"""
        variants = self.variants.filter(is_available=True)
        if variants.exists():
            return min(v.price for v in variants)
        return 0
    
    def __str__(self):
        return f"{self.group.name}: {self.name}"


class ProductVariant(models.Model):
    """Вариант товара с настраиваемым объемом"""
    
    # Связь с товаром
    product = models.ForeignKey(
        Product, 
        on_delete=models.CASCADE, 
        related_name='variants',
        verbose_name='Товар'
    )
    
    # Название объема
    volume_name = models.CharField(
        'Название размера',
        blank=True,
        max_length=50,
        help_text='Например: Маленький, Средний, 1 порция, 100г'
    )
    
    # Значение объема
    volume_value = models.CharField(
        'Значение объема',
        max_length=50,
        help_text='Например: 250 мл, 350 мл, 100 г'
    )
    
    # Цена
    price = models.DecimalField(
        'Цена',
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    
    # Калории (необязательно)
    calories = models.PositiveIntegerField(
        'Калории',
        blank=True,
        null=True,
        help_text='Необязательно'
    )
    
    # Статус
    is_available = models.BooleanField('В наличии', default=True)
    is_default = models.BooleanField('Вариант по умолчанию', default=False)
    
    class Meta:
        verbose_name = 'Вариант товара'
        verbose_name_plural = 'Варианты товаров'
        ordering = ['product', '-is_default']
    
    def save(self, *args, **kwargs):
        # Если это первый вариант, делаем его вариантом по умолчанию
        if not self.pk and not ProductVariant.objects.filter(product=self.product).exists():
            self.is_default = True
        super().save(*args, **kwargs)
    
    def __str__(self):
        if self.volume_name and self.volume_value:
            return f"{self.product.name} - {self.volume_name} ({self.volume_value})"
        elif self.volume_value:
            return f"{self.product.name} - {self.volume_value}"
        return f"{self.product.name} - Без размера"