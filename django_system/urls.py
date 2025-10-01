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
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from web_app import views
from web_app import views_todo  # Todo API
from django.conf import settings
from django.conf.urls.static import static
from web_app import views
from web_app import views_todo  # Todo API
from web_app import profile_api  # Profile API
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('base/' , views.base),
    path('ttt/' , views.ttt),
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
    path('book/<int:pk>/remove/', views.remove_book, name='remove_book'),
    path('book/<int:pk>/mark-sold/', views.mark_book_sold, name='mark_book_sold'),
    path('book/upload/', views.upload_book2, name='upload_book2'),


    # Dynamic Dropdowns API
    path('api/departments/', views.get_departments, name='get_departments'),
    path('api/grades/', views.get_grades, name='get_grades'),
    path('book_2/', views.book_2, name='book_2'),
    path('test/', views.ask_page, name='ask_page'),
    path('test/', views.ask_page, name='ask_page'),
    path('navbar2/' , views.navbar2),

    # 統一檔案上傳路由 (支援 PDF 和 ZIP)
    path('upload_files/', views.upload_files, name='upload_files'),
    # 向後相容的 ZIP 上傳路由
    path('upload_zip/', views.upload_zip, name='upload_zip'),
    # 統一檔案上傳路由 (支援 PDF 和 ZIP)
    path('upload_files/', views.upload_files, name='upload_files'),
    # 向後相容的 ZIP 上傳路由
    path('upload_zip/', views.upload_zip, name='upload_zip'),

    # 課程評論 / Review 頁面與 API
    path('comment/', views.comment, name='comment'),
    # 課程評論 / Review 頁面與 API
    path('comment/', views.comment, name='comment'),
    # 課程評論 / Review 頁面與 API
    path('comment/', views.comment, name='comment'),
    path('comment_detail/<int:id>/', views.comment_detail, name='comment_detail'),
    path('comment_detail/', views.comment_detail, name='comment_detail_legacy'),
    path('add_comment/', views.add_comment_blank, name='add_comment_new'),
    path('add_comment/<int:course_id>/', views.add_comment_page, name='add_comment'),
    path('add_comment/<int:course_id>/submit/', views.add_comment_submit, name='add_comment_submit'),
    path('comment/review/<int:id>/delete/', views.comment_review_delete, name='comment_review_delete'),
    path('add_comment/', views.add_comment_blank, name='add_comment_new'),
    path('add_comment/<int:course_id>/', views.add_comment_page, name='add_comment'),
    path('add_comment/<int:course_id>/submit/', views.add_comment_submit, name='add_comment_submit'),
    path('comment/review/<int:id>/delete/', views.comment_review_delete, name='comment_review_delete'),
    path('api/courses/<int:course_id>/reviews/', views.create_course_review, name='create_course_review'),
    path('api/courses/<int:course_id>/reviews/<int:review_id>/', views.update_course_review, name='update_course_review'),
    path('api/courses/<int:course_id>/reviews/<int:review_id>/delete/', views.delete_course_review, name='delete_course_review'),
    path('api/reviews/<int:review_id>/toggle-like/', views.toggle_review_like, name='toggle_review_like'),
    path('api/reviews/<int:review_id>/toggle-like/', views.toggle_review_like, name='toggle_review_like'),
    path('api/rating/<int:course_id>/', views.submit_rating_only, name='submit_rating_only'),
    path('api/comment/optimize_ai', views.optimize_comment_ai, name='optimize_comment_ai'),
    path('api/comment/optimize_ai', views.optimize_comment_ai, name='optimize_comment_ai'),

    # 對話/RAG/檔案
    path('personal/', views.personal, name='personal'),
    # 對話/RAG/檔案
    path('personal/', views.personal, name='personal'),
    path('api/rating/<int:course_id>/', views.submit_rating_only, name='submit_rating_only'),
    path('api/comment/optimize_ai', views.optimize_comment_ai, name='optimize_comment_ai'),
    # 對話/RAG/檔案
    path('personal/', views.personal, name='personal'),
    path('api/conversations/', views.api_conversations),
    path('api/messages/<str:convo_id>/', views.api_messages),
    path('api/ask/', views.api_ask),
    path('api/conversations/<str:convo_id>/', views.api_conversation_detail),
    path('api/export/<str:convo_id>/', views.api_export_conversation),
    path('auth/', include('social_django.urls', namespace='social')),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('api/pdf/<str:filename>/', views.view_pdf, name='view_pdf'),

    # 活動系統

    # 活動系統
    path('activities/', views.activity_list, name='activity_list'),
    path('activities/<int:pk>/', views.activity_detail, name='join_detail'),
    path('activities/<int:pk>/', views.activity_detail, name='activity_detail'),
    path('activities/<int:pk>/', views.activity_detail, name='activity_detail'),
    path('activities/<int:pk>/join/', views.join_activity, name='join_activity'),
    path('activities/<int:pk>/cancel/', views.cancel_activity, name='cancel_activity'),
    path('activities/<int:pk>/participants/', views.activity_participants, name='activity_participants'),
    path('activities/create/', views.create_activity, name='create_activity'),
    path('create/', views.create_activity, name='create_activity'),
    path('my-activities/', views.my_activities, name='my_activities'),
    path('api/activities/<int:activity_id>/comments/', views.add_comment, name='add_comment_api'),
    path('api/comments/<int:comment_id>/toggle-like/', views.toggle_like, name='toggle_like'),
    path('get-related-data/', views.get_related_data, name='get_related_data'),
    path('api/recognize-book/', views.recognize_book, name='recognize_book'),
    path('api/search-book/', views.search_book_manual, name='search_book_manual'),

    # Todo API（持久化）
    path('api/todos/', views_todo.get_todos, name='get_todos'),
    path('api/todos/create/', views_todo.create_todo, name='create_todo'),
    path('api/todos/<int:todo_id>/update/', views_todo.update_todo, name='update_todo'),
    path('api/todos/<int:todo_id>/delete/', views_todo.delete_todo, name='delete_todo'),
    
    # Profile API
    path('api/profile/update/', profile_api.update_profile, name='update_profile'),
]

# 媒體/靜態檔案設定（開發環境）
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)