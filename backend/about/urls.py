# about/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AboutPageViewSet

router = DefaultRouter()
router.register(r'about', AboutPageViewSet, basename='about')

urlpatterns = [
    path('', include(router.urls)),
]