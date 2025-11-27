from django import forms
import os
from .models import ActivityComment, GroupActivity, Book, Book2
from django.core.exceptions import ValidationError

# ★ 加上這行：導入表單過濾 Mixin
from .forms_mixins import SafeContentFormMixin


# 活動建立表單：掛上 Mixin
# ---------------------------
class ActivityForm(SafeContentFormMixin, forms.ModelForm):
    class Meta:
        model = GroupActivity
        fields = [
            'title', 'type', 'location_type', 'location', 
            'address', 'latitude', 'longitude', 'place_id',
            'date', 'time', 'min_participants', 'max_participants',
            'description', 'cover_image', 'deadline'
        ]
        widgets = {
            'date': forms.DateInput(attrs={'type': 'date'}),
            'time': forms.TimeInput(attrs={'type': 'time'}),
            'deadline': forms.DateInput(attrs={'type': 'date'}),
            'address': forms.HiddenInput(),
            'latitude': forms.HiddenInput(),
            'longitude': forms.HiddenInput(),
            'place_id': forms.HiddenInput(),
            'location_type': forms.RadioSelect(),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['cover_image'].required = False
        self.fields['address'].required = False
        self.fields['latitude'].required = False
        self.fields['longitude'].required = False
        self.fields['place_id'].required = False
        
    def clean(self):
        cleaned_data = super().clean()  # ★ 會先跑 SafeContentFormMixin.clean()
        location_type = cleaned_data.get('location_type')
        location = cleaned_data.get('location')
        min_participants = cleaned_data.get('min_participants')
        max_participants = cleaned_data.get('max_participants')
        date = cleaned_data.get('date')
        deadline = cleaned_data.get('deadline')

        if location_type == 'off_campus' and (not location or not location.strip()):
            self.add_error('location', '校外活動必須填寫地點')

        if min_participants and max_participants and min_participants >= max_participants:
            self.add_error('max_participants', '最多參加人數必須大於最少參加人數')

        if date and deadline and deadline >= date:
            self.add_error('deadline', '報名截止日期必須早於活動日期')

        return cleaned_data


# ---------------------------
# 二手書上傳表單：掛上 Mixin
# ---------------------------
from .models import Book2, Department

class Book2Form(SafeContentFormMixin, forms.ModelForm):
    department = forms.ModelChoiceField(
        queryset=Department.objects.all(),
        required=False,
        empty_label="全部系所"
    )

    class Meta:
        model = Book2
        fields = [
            'title', 'author', 'publisher', 'isbn', 
            'price', 'academic', 'department', 'grade', 
            'category', 'condition', 'description', 'cover_image'
        ]
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': '請輸入書名'
            }),
            'author': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': '請輸入作者'
            }),
            'publisher': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': '請輸入出版社'
            }),
            'isbn': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': '請輸入 ISBN'
            }),
            'price': forms.NumberInput(attrs={
                'class': 'form-input',
                'placeholder': '請輸入價格',
                'min': '0'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-textarea',
                'rows': 3,
                'placeholder': '請描述書籍狀況、購買原因等...'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # department queryset 動態更新，避免送出錯誤
        self.fields['department'].queryset = Department.objects.all()
        self.fields['department'].required = False
        self.fields['department'].empty_label = "全部系所"

        # 設置其他欄位
        self.fields['title'].required = True
        self.fields['price'].required = True
        self.fields['cover_image'].required = False
        self.fields['academic'].required = False
        self.fields['grade'].required = False
        self.fields['category'].required = False
        self.fields['condition'].required = False
        self.fields['description'].required = False

    def clean_title(self):
        title = self.cleaned_data.get('title')
        if not title or not str(title).strip():
            raise ValidationError('書名為必填欄位')
        return title.strip()

    # ★ 只保留一個 clean_price（避免重複定義被覆蓋）
    def clean_price(self):
        price = self.cleaned_data.get('price')
        if price in [None, '']:
            raise ValidationError('價格為必填欄位')
        if price < 0:
            raise ValidationError('價格不能為負數')
        return price

    def clean_cover_image(self):
        cover_image = self.cleaned_data.get('cover_image')
        if cover_image:
            if cover_image.size > 5 * 1024 * 1024:
                raise ValidationError('圖片大小不能超過5MB')
            allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
            ext = os.path.splitext(cover_image.name)[1].lower()
            if ext not in allowed_extensions:
                raise ValidationError(f'不支援的圖片格式。支援的格式：{", ".join(allowed_extensions)}')
            if not cover_image.content_type.startswith('image/'):
                raise ValidationError('請上傳有效的圖片文件')
        return cover_image

    def clean(self):
        cleaned_data = super().clean()  # ★ 會先跑 SafeContentFormMixin.clean()
        return cleaned_data