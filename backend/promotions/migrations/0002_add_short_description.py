from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('promotions', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='promotion',
            name='short_description',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Краткое описание для отображения в карточке (макс. 200 символов)',
                max_length=200,
                verbose_name='Краткое описание (для карточек)'
            ),
        ),
    ]
