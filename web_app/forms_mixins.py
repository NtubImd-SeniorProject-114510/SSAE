# web_app/forms_mixins.py
from django import forms
from .utils.content_filter import contains_banned_content

class SafeContentFormMixin:
    """在 Django Form 的 clean() 統一過濾不當詞"""
    def clean(self):
        cleaned = super().clean()
        for name, field in self.fields.items():
            val = cleaned.get(name)
            if isinstance(val, str) and val.strip():
                if contains_banned_content(val):
                    self.add_error(name, "輸入內容包含禁止或不當詞彙，請重新編輯。")
        return cleaned
    

 # web_app/models_mixins.py
from django.core.exceptions import ValidationError
from django.db import models
from .utils.content_filter import contains_banned_content

class SafeContentModelMixin(models.Model):
    """在 model.clean() 過濾不當詞；save 前請記得呼叫 full_clean()"""
    class Meta:
        abstract = True

    def clean(self):
        super().clean()
        for field in self._meta.get_fields():
            if hasattr(field, "attname"):
                val = getattr(self, field.attname, None)
                if isinstance(val, str) and val.strip():
                    if contains_banned_content(val):
                        raise ValidationError({field.name: "輸入內容包含禁止或不當詞彙，請重新編輯。"})