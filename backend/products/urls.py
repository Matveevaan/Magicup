# products/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Группы
    path('groups/', views.GroupListAPIView.as_view(), name='group-list'),
    path('groups/<slug:slug>/', views.GroupDetailAPIView.as_view(), name='group-detail'),
    
    # Товары
    path('products/', views.ProductListAPIView.as_view(), name='product-list'),
    path('products/<slug:slug>/', views.ProductDetailAPIView.as_view(), name='product-detail'),
    # path('products/search/', views.SearchAPIView.as_view(), name='product-search'),
    
    # Меню
    path('', views.MenuAPIView.as_view(), name='menu-full'),
    path('menu/<str:menu_type>/', views.MenuByTypeAPIView.as_view(), name='menu-by-type'),
    
    path('search/', views.SearchAPIView.as_view(), name='product-search'),
    path('featured/', views.FeaturedAPIView.as_view(), name='featured-products'),
]