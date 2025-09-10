# forms.py
from django import forms
import os
from .models import GroupActivity, Book, Book2

class ActivityForm(forms.ModelForm):
    class Meta:
        model = GroupActivity
        fields = [
            'title', 'type', 'location_type', 'location', 
            'address', 'latitude', 'longitude', 'place_id',
            'date', 'time', 'min_participants', 'max_participants',
            'description', 'cover_image', 'deadline', 'contact_info'
        ]
        widgets = {
            'date': forms.DateInput(attrs={'type': 'date'}),
            'time': forms.TimeInput(attrs={'type': 'time'}),
            'deadline': forms.DateInput(attrs={'type': 'date'}),
            'cover_image': forms.FileInput(attrs={'required': False}),
            'address': forms.HiddenInput(),
            'latitude': forms.HiddenInput(),
            'longitude': forms.HiddenInput(),
            'place_id': forms.HiddenInput(),
            'location_type': forms.RadioSelect(),  # 使用單選按鈕
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['cover_image'].required = False
        self.fields['address'].required = False
        self.fields['latitude'].required = False
        self.fields['longitude'].required = False
        self.fields['place_id'].required = False
        self.fields['contact_info'].required = False
        
    def clean(self):
        cleaned_data = super().clean()
        location_type = cleaned_data.get('location_type')
        location = cleaned_data.get('location')
        min_participants = cleaned_data.get('min_participants')
        max_participants = cleaned_data.get('max_participants')
        date = cleaned_data.get('date')
        deadline = cleaned_data.get('deadline')

        # 校內校外驗證（改成只檢查 location）
        if location_type == 'off_campus' and (not location or not location.strip()):
            self.add_error('location', '校外活動必須填寫地點')

        # 原有驗證
        if min_participants and max_participants and min_participants >= max_participants:
            self.add_error('max_participants', '最多參加人數必須大於最少參加人數')

        if date and deadline and deadline >= date:
            self.add_error('deadline', '報名截止日期必須早於活動日期')

        return cleaned_data
    
from django import forms
from django.core.exceptions import ValidationError
from .models import Book2, Department

class Book2Form(forms.ModelForm):
    department = forms.ModelChoiceField(
        queryset=Department.objects.all(),
        required=False,
        empty_label="全部系所"
    )

    class Meta:
        model = Book2
        fields = [
            'title', 'academic', 'grade', 'category', 'department',
            'condition', 'price', 'description', 'cover_image'
        ]
        widgets = {
            'description': forms.Textarea(attrs={'rows':3,'placeholder':'請描述書籍狀況、購買原因等...'}),
        }
    
    def clean_price(self):
        price = self.cleaned_data.get('price')
        if price is not None and price < 0:
            raise ValidationError('價格不能為負數')
        return price


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
            # 檢查文件大小 (5MB限制)
            if cover_image.size > 5 * 1024 * 1024:
                raise ValidationError('圖片大小不能超過5MB')

            # 檢查文件格式
            allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
            ext = os.path.splitext(cover_image.name)[1].lower()
            if ext not in allowed_extensions:
                raise ValidationError(f'不支援的圖片格式。支援的格式：{", ".join(allowed_extensions)}')

            # 檢查是否為圖片文件
            if not cover_image.content_type.startswith('image/'):
                raise ValidationError('請上傳有效的圖片文件')

        return cover_image

    def clean(self):
        cleaned_data = super().clean()
        return cleaned_data
