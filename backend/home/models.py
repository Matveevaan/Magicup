from django.db import models
from django.core.exceptions import ValidationError

class HomePage(models.Model):
    """Главная страница"""
    name = models.CharField('Для админки', max_length=100, default='Главная', editable=False)
    updated = models.DateTimeField('Обновлено', auto_now=True)
    
    # Поля для включения/выключения блоков
    show_carousel = models.BooleanField('Показывать карусель', default=True)
    show_pair = models.BooleanField('Показывать парные картинки', default=True)
    show_map = models.BooleanField('Показывать карту', default=True)
    show_gallery = models.BooleanField('Показывать галерею', default=True)
    
    class Meta:
        verbose_name = 'Главная страница'
        verbose_name_plural = 'Главная страница'
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # Всегда один экземпляр
        if not self.pk and HomePage.objects.exists():
            return
        super().save(*args, **kwargs)


class HomeCarouselImage(models.Model):
    """Карусель"""
    page = models.ForeignKey(HomePage, on_delete=models.CASCADE, related_name='carousel')
    
    # Картинки (не обязательные)
    image_pc = models.ImageField(
        '🖥️ Для компьютера/планшета', 
        upload_to='home/carousel/pc/',
        blank=True,
        null=True,
        help_text='Не обязательно'
    )
    
    image_phone = models.ImageField(
        '📱 Для телефона', 
        upload_to='home/carousel/phone/',
        blank=True,
        null=True,
        help_text='Не обязательно'
    )
    
    # Ссылка по клику (не обязательно)
    link = models.URLField('Ссылка', blank=True)
    
    # Порядок показа
    order = models.IntegerField('Порядок', default=0)
    
    # Вкл/выкл
    active = models.BooleanField('Показывать', default=True)
    
    class Meta:
        verbose_name = 'Слайд карусели'
        verbose_name_plural = 'Карусель'
        ordering = ['order']
    
    def __str__(self):
        return f"Слайд {self.order}"
    
    # Убираем проверку на обязательность картинок
    def clean(self):
        pass  # Никаких проверок


class HomeGalleryPair(models.Model):
    """Две картинки рядом"""
    page = models.ForeignKey(HomePage, on_delete=models.CASCADE, related_name='pair_images')
    
    # Картинки (не обязательные)
    image1 = models.ImageField(
        'Первая картинка пары', 
        upload_to='home/gallery/pair/',
        blank=True,
        null=True,
        help_text='Не обязательно'
    )
    
    image2 = models.ImageField(
        'Вторая картинка пары', 
        upload_to='home/gallery/pair/',
        blank=True,
        null=True,
        help_text='Не обязательно'
    )
    
    # Ссылки (не обязательно)
    link1 = models.URLField('Ссылка для первой', blank=True)
    link2 = models.URLField('Ссылка для второй', blank=True)
    
    # Порядок
    order = models.IntegerField('Порядок', default=0)
    
    # Вкл/выкл
    active = models.BooleanField('Показывать', default=True)
    
    class Meta:
        verbose_name = 'Пара картинок'
        verbose_name_plural = 'Пара картинок'
        ordering = ['order']
    
    def __str__(self):
        return f"Пара картинок #{self.order}"


class HomeMap(models.Model):
    """Google Карта"""
    page = models.ForeignKey(HomePage, on_delete=models.CASCADE, related_name='maps')
    
    # Превью картинка (не обязательно)
    preview_image = models.ImageField(
        'Превью карты для компьютера/планшета', 
        upload_to='home/map/pc/',
        blank=True,
        null=True,
        help_text='Не обязательно'
    )
    preview_image_phone = models.ImageField(
        'Превью карты для телефона', 
        upload_to='home/map/phone/',
        blank=True,
        null=True,
        help_text='Не обязательно'
    )
    
    # HTML код iframe
    iframe_code = models.TextField(
        'Код iframe карты', 
        blank=True,  # ← Делаем необязательным
        help_text='HTML код из Google Maps'
    )
    
    # Порядок
    order = models.IntegerField('Порядок', default=0)
    
    # Вкл/выкл
    active = models.BooleanField('Показывать', default=True)
    
    class Meta:
        verbose_name = 'Google Карта'
        verbose_name_plural = 'Google Карта'
        ordering = ['order']
    
    def __str__(self):
        return f"Карта #{self.order}"


class HomeAdditionalImage(models.Model):
    """Дополнительные картинки"""
    page = models.ForeignKey(HomePage, on_delete=models.CASCADE, related_name='additional_images')
    
    # Картинка (не обязательно)
    image = models.ImageField(
        'Картинка', 
        upload_to='home/gallery/additional/pc/',
        blank=True,
        null=True,
        help_text='Не обязательно'
    )
    image_phone = models.ImageField(
        'Картинка для телефона', 
        upload_to='home/gallery/additional/phone/',
        blank=True,
        null=True,
        help_text='Не обязательно'
    )
    # Ссылка (не обязательно)
    link = models.URLField('Ссылка', blank=True)
    
    # Порядок
    order = models.IntegerField('Порядок', default=0)
    
    # Вкл/выкл
    active = models.BooleanField('Показывать', default=True)
    
    class Meta:
        verbose_name = 'Дополнительная картинка'
        verbose_name_plural = 'Дополнительные картинки'
        ordering = ['order']
    
    def __str__(self):
        return f"Картинка #{self.order}"