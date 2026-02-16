# home/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import HomePage
from .serializers import HomePageSerializer

class HomeAPIView(APIView):
    """API для главной страницы - фиксированная структура"""
    
    def get(self, request):
        page = HomePage.objects.first()
        if not page:
            # Создаем пустую если нет
            page = HomePage.objects.create(name='Главная')
        
        serializer = HomePageSerializer(page)
        return Response(serializer.data)
        
