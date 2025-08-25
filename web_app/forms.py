# forms.py
from django import forms
from .models import GroupActivity

class ActivityForm(forms.ModelForm):
    class Meta:
        model = GroupActivity
        fields = [
            'title', 'type', 'location', 'address', 'latitude', 'longitude', 'place_id',
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
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # 確保圖片欄位不是必填
        self.fields['cover_image'].required = False
        self.fields['address'].required = False
        self.fields['latitude'].required = False
        self.fields['longitude'].required = False
        self.fields['place_id'].required = False
        self.fields['contact_info'].required = False

    def clean(self):
        cleaned_data = super().clean()
        min_participants = cleaned_data.get('min_participants')
        max_participants = cleaned_data.get('max_participants')
        date = cleaned_data.get('date')
        deadline = cleaned_data.get('deadline')

        if min_participants and max_participants and min_participants >= max_participants:
            self.add_error('max_participants', '最多參加人數必須大於最少參加人數')

        if date and deadline and deadline >= date:
            self.add_error('deadline', '報名截止日期必須早於活動日期')

        return cleaned_data