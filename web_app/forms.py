# forms.py
from django import forms
from .models import GroupActivity

class ActivityForm(forms.ModelForm):
    class Meta:
        model = GroupActivity
        fields = [
            'title', 'type', 'location', 'date', 'time',
            'min_participants', 'max_participants',
            'description', 'cover_image', 'deadline'
        ]
        widgets = {
            'date': forms.DateInput(attrs={'type': 'date'}),
            'time': forms.TimeInput(attrs={'type': 'time'}),
            'deadline': forms.DateInput(attrs={'type': 'date'}),
        }

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
