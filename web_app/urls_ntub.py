from django.urls import path
from . import views_ntub

urlpatterns = [
    # 主要頁面
    path('ntub/', views_ntub.ntub_dashboard, name='ntub_dashboard'),
    path('ntub/test/', views_ntub.ntub_test_page, name='ntub_test'),
    path('ntub/student-info/', views_ntub.student_info_page, name='ntub_student_info'),
    path('ntub/grades/', views_ntub.grades_page, name='ntub_grades'),
    path('ntub/schedule/', views_ntub.schedule_page, name='ntub_schedule'),
    
    # API端點
    path('api/ntub/login/', views_ntub.ntub_login, name='api_ntub_login'),
    path('api/ntub/input-captcha/', views_ntub.input_captcha, name='api_ntub_input_captcha'),
    path('api/ntub/logout/', views_ntub.ntub_logout, name='api_ntub_logout'),
    path('api/ntub/profile/', views_ntub.get_student_profile, name='api_ntub_profile'),
    path('api/ntub/grades/', views_ntub.get_grades, name='api_ntub_grades'),
    path('api/ntub/schedule/', views_ntub.get_schedule, name='api_ntub_schedule'),
]
