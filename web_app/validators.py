 # web_app/validators.py
from django.core.exceptions import ValidationError
from .utils.content_filter import contains_banned_content

def validate_clean_text(value: str):
    if isinstance(value, str) and contains_banned_content(value):
        raise ValidationError("輸入內容包含禁止或不當詞彙，請重新編輯。")