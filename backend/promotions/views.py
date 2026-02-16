#promotions\views.py
from rest_framework import viewsets
from django.utils import timezone
from .models import Promotion
from .serializers import PromotionSerializer

class PromotionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API для акций
    """
    queryset = Promotion.objects.filter(is_active=True).order_by('order', '-created_date')
    serializer_class = PromotionSerializer
    lookup_field = 'slug'
    
    def get_queryset(self):
        """Фильтруем только текущие акции по умолчанию"""
        queryset = super().get_queryset()
        
        # Получаем параметр 'all' из query params
        show_all = self.request.query_params.get('all', '').lower() == 'true'
        
        if not show_all:
            today = timezone.now().date()
            queryset = queryset.filter(
                start_date__lte=today,
                end_date__gte=today
            )
        
        return queryset