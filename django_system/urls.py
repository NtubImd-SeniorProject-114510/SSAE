#urls.py
"""
URL configuration for django_system project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from web_app import views
from django.urls import include, path
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('base/' , views.base),
    path('login/' , views.login),
    path('welcome/' , views.welcome),
    path('' , views.welcome),
    path('index/' , views.index),
    path('personal/' , views.personal),
    path('chat/' , views.chat),
    path('join/' , views.join),
    path('join_create/' , views.join_create),
    path('join_detail/' , views.join_detail),
    path('book/' , views.book, name='book'),
    path('book_detail/' , views.book_detail, name='book_detail'),
    path('upload_book/' , views.upload_book, name='upload_book'),
    path("test/", views.ask_page, name="ask_page"),
    path('navbar2/' , views.navbar2),
    path("upload_zip/", views.upload_zip, name="upload_zip"),
    path("comment/", views.comment, name="comment"),   
    path("comment_detail/", views.comment_detail, name="comment_detail"),   
    path("add_comment/", views.add_comment, name="add_comment"),
    path("personal/", views.personal, name="personal"),
    path('api/conversations/', views.api_conversations),
    path('api/conversations/<str:convo_id>/messages/', views.api_messages),
    path('api/ask/', views.api_ask),
    path('api/conversations/<str:convo_id>/', views.api_conversation_detail),
    path('api/conversations/<str:convo_id>/export_excel/', views.api_export_conversation),
    path('auth/', include('social_django.urls', namespace='social')),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
]
