# forms.py
from django import forms
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


class Book2Form(forms.ModelForm):

    def clean(self):
        cleaned_data = super().clean()
        title = cleaned_data.get('title')
        price = cleaned_data.get('price')
        if not title or not str(title).strip():
            self.add_error('title', '書名為必填欄位')
        if price in [None, '']:
            self.add_error('price', '價格為必填欄位')
        return cleaned_data

    class Meta:
        model = Book2
        fields = [
            'title', 'academic', 'grade', 'category', 'department',
            'condition', 'price', 'description', 'cover_image'
        ]
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['cover_image'].required = False
