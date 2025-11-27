from django.db import models

# Create your models here.


from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

User = get_user_model()

class ReminderLog(models.Model):
    REMINDER_CHOICES = [
        ("D7", "7-days-before"),
        ("D1", "1-day-before"),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reminder_logs")

    # 記錄「被提醒的物件」（活動或行事曆）；支援任何模型
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.CharField(max_length=64)
    content_object = GenericForeignKey("content_type", "object_id")

    reminder_type = models.CharField(max_length=2, choices=REMINDER_CHOICES)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "content_type", "object_id", "reminder_type")

    def __str__(self):
        return f"{self.user} {self.reminder_type} {self.content_type_id}:{self.object_id}"