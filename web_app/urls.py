from django.urls import path
from . import views

urlpatterns = [
    path('book/upload/', views.upload_book, name='upload_book'),
    path('book/', views.book, name='book'),
    # 你可依需求再加其他路由
]
