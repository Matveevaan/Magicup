# about/views.py
from rest_framework import viewsets
from rest_framework.response import Response
from .models import AboutPage
from .serializers import AboutPageSerializer

class AboutPageViewSet(viewsets.ReadOnlyModelViewSet):
    """API для страницы 'О нас'"""
    queryset = AboutPage.objects.filter(is_active=True)
    serializer_class = AboutPageSerializer
    lookup_field = 'slug'
    
    def list(self, request):
        # Возвращаем первую активную страницу
        page = self.queryset.first()
        if not page:
            return Response({'detail': 'Страница не найдена'}, status=404)
        
        serializer = self.get_serializer(page)
        return Response(serializer.data)