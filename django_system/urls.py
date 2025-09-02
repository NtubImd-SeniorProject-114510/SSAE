#django_system\urls.py

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
    path('login/' , views.login, name='login'),
    path('welcome/' , views.welcome),
    path('welcome_mo/' , views.welcome_mo, name='wel_mo'),
    path('' , views.welcome),
    path('index/' , views.index),
    # path('mobile/' , views.mobile, name='mobile'),
    path('personal/' , views.personal),
    path('chat/' , views.chat),
    path('join/', views.activity_list, name='activity_list'),
    path('join_create/' , views.join_create),
    path('book/', views.book, name='book'),
    path('book/<int:pk>/', views.book_detail, name='book_detail'),
    path('book/upload/', views.upload_book2, name='upload_book'),
    
  
    # Dynamic Dropdowns API
    path('api/departments/', views.get_departments, name='get_departments'),
    path('api/grades/', views.get_grades, name='get_grades'),
    path('book_2/', views.book_2, name='book_2'),
    path("test/", views.ask_page, name="ask_page"),
    path('navbar2/' , views.navbar2),

    # 新增：統一檔案上傳路由 (支援 PDF 和 ZIP)
    path("upload_files/", views.upload_files, name="upload_files"),
    # 保留：向後相容的 ZIP 上傳路由
    path("upload_zip/", views.upload_zip, name="upload_zip"),

    #####
    # 保留的頁面
    path("comment/", views.comment, name="comment"),
    path('comment_detail/<int:id>/', views.comment_detail, name='comment_detail'),
    path('comment_detail/', views.comment_detail, name='comment_detail_legacy'),

    # 空白建立（未選課）—— 新增這條
    path("add_comment/", views.add_comment_blank, name="add_comment_new"),
    # 已選課（保留）
    path("add_comment/<int:course_id>/", views.add_comment_page, name="add_comment"),
    # 送出評論的 POST API 送出評論（保留）
    path("add_comment/<int:course_id>/submit/", views.add_comment_submit, name="add_comment_submit"),

    # 其餘 Review API（如你需要 REST 介面）
    path('api/courses/<int:course_id>/reviews/', views.create_course_review, name='create_course_review'),
    path('api/courses/<int:course_id>/reviews/<int:review_id>/', views.update_course_review, name='update_course_review'),
    path('api/courses/<int:course_id>/reviews/<int:review_id>/delete/', views.delete_course_review, name='delete_course_review'),
    #####

    path("personal/", views.personal, name="personal"),
    path('api/conversations/', views.api_conversations),
    path('api/messages/<str:convo_id>/', views.api_messages),
    path('api/ask/', views.api_ask),
    path('api/conversations/<str:convo_id>/', views.api_conversation_detail),
    path('api/export/<str:convo_id>/', views.api_export_conversation),
    path('auth/', include('social_django.urls', namespace='social')),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('api/pdf/<str:filename>/', views.view_pdf, name='view_pdf'),
    path('activities/', views.activity_list, name='activity_list'),
    path('activities/<int:pk>/', views.activity_detail, name='join_detail'),
    path("activities/<int:pk>/", views.activity_detail, name="activity_detail"),
    path('activities/<int:pk>/join/', views.join_activity, name='join_activity'),
    path('activities/<int:pk>/cancel/', views.cancel_activity, name='cancel_activity'),
    path('activities/<int:pk>/participants/', views.activity_participants, name='activity_participants'),
    path('activities/create/', views.create_activity, name='create_activity'),
    path('create/', views.create_activity, name='create_activity'),
    path('my-activities/', views.my_activities, name='my_activities'),
    path('api/activities/<int:activity_id>/comments/', views.add_comment, name='add_comment_api'),
    path('api/comments/<int:comment_id>/toggle-like/', views.toggle_like, name='toggle_like'),
]

from django.conf import settings
from django.conf.urls.static import static


# 媒體檔案 (圖片上傳) 設定

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)