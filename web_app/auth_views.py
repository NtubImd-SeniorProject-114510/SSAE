from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from social_core.pipeline.user import get_username
import requests
from django.shortcuts import redirect
from django.contrib import messages
from social_core.exceptions import AuthForbidden


def create_user(strategy, details, backend, user=None, *args, **kwargs):
    """Create user if it doesn't exist."""
    if user:
        # 如果使用者存在，更新所有相關資訊
        user.first_name = details.get('first_name', '')
        user.last_name = details.get('last_name', '')
        user.email = details.get('email')
        user.username = details.get('username') or details.get('email').split('@')[0]
        
        user.save()
        return {'is_new': False, 'user': user}

    # 取得使用者詳細資料
    email = details.get('email')
    first_name = details.get('first_name', '')
    last_name = details.get('last_name', '')
    username = details.get('username') or email.split('@')[0]

    # 檢查是否已有使用者
    try:
        # 先嘗試用電子郵件查找
        existing_user = User.objects.get(email=email)
        # 更新現有使用者的資訊
        existing_user.first_name = first_name
        existing_user.last_name = last_name
        existing_user.username = username
        existing_user.save()
        return {'is_new': False, 'user': existing_user}
    except User.DoesNotExist:
        pass

    # 創建新使用者（不給予後台權限）
    user = User.objects.create_user(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        password=generate_random_password(),
        is_active=True,
        is_staff=False,  # 確保沒有後台訪問權限
        is_superuser=False  # 確保沒有超級用戶權限
    )
    
    # 獲取 Google 帳號照片
    if backend.name == 'google-oauth2':
        social = kwargs.get('social')
        if social:
            try:
                # Google OAuth2 的照片 URL
                photo_url = social.extra_data.get('picture')
                if photo_url:
                    # 創建或更新 Profile
                    profile, created = Profile.objects.get_or_create(user=user)
                    profile.profile_photo = photo_url
                    profile.save()
            except Exception as e:
                print(f"Error getting Google photo: {str(e)}")
    return {'is_new': True, 'user': user}

import string
import random

def generate_random_password(length=12):
    characters = string.ascii_letters + string.digits + string.punctuation
    return ''.join(random.choices(characters, k=length))


def check_school_email(strategy, backend, user=None, response=None, *args, **kwargs):
    email = response.get("email") if response else None
    if email and not email.endswith("@ntub.edu.tw"):
        if user:
            user.delete()
        # 設定錯誤訊息
        request = strategy.request
        messages.error(request, "請使用學校帳號 (@ntub.edu.tw) 登入")
        return redirect('/index/')   # 直接導回首頁
    return None
