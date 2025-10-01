from django import template
from django.db import connection
import logging

register = template.Library()
logger = logging.getLogger(__name__)

@register.filter
def display_name(user):
    """
    獲取用戶顯示名稱：優先使用暱稱，如果暱稱為空則使用真實姓名
    """
    if not user or not hasattr(user, 'is_authenticated') or not user.is_authenticated:
        return "訪客"
    
    # 嘗試從自定義 User 表獲取暱稱和姓名
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT anonymous, name
                FROM `User`
                WHERE mail = %s
            """, [user.email])
            row = cursor.fetchone()
            if row:
                anonymous, name = row
                # 優先使用暱稱（anonymous 欄位），如果為空則使用真實姓名
                if anonymous and anonymous.strip():
                    return anonymous.strip()
                elif name and name.strip():
                    return name.strip()
    except Exception as e:
        logger.warning(f"無法從自定義 User 表獲取用戶資料: {e}")
    
    # 如果自定義表沒有資料，則使用 Django 用戶的姓名
    if user.last_name and user.first_name:
        return f"{user.last_name}{user.first_name}"
    elif user.first_name:
        return user.first_name
    elif user.username:
        return user.username
    else:
        return "使用者"
