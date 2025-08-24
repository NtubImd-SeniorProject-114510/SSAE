from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class GroupActivity(models.Model):
    # 直接用 Django 預設的 id，不需要自己定義 activity_id
    user = models.ForeignKey(User, on_delete=models.CASCADE)  # 發起者
    title = models.CharField(max_length=200)
    description = models.TextField()
    type = models.CharField(max_length=50)  # 活動類型
    location = models.CharField(max_length=200)
    date = models.DateField()
    time = models.TimeField()
    deadline = models.DateField()  # 報名截止日期
    min_participants = models.IntegerField(default=1)
    max_participants = models.IntegerField(default=10)
    cover_image = models.ImageField(upload_to='group_activity_images/', null=True, blank=True)  # 封面圖片，可選

    # ===== 便捷屬性 =====
    @property
    def is_full(self):
        # 在使用 view 時，用 annotate 計算 joined_count
        return False  # 預設 False，視 view 傳入數據更新

    @property
    def tag_css(self):
        mapping = {'美食':'food','運動':'sports','讀書':'study','旅遊':'travel','電影':'movie'}
        return mapping.get(self.type, 'other')

    @property
    def is_deadline_passed(self):
        if self.deadline:
            return timezone.localdate() > self.deadline
        return False


class ActivityParticipant(models.Model):
    STATUS_CHOICES = [
        ("joined", "已加入"),
        ("cancelled", "已取消"),
    ]

    # 這裡可以不用特別指定 id，Django 會自動生成
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="joined")
    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    activity = models.ForeignKey(GroupActivity, on_delete=models.CASCADE, related_name="participants")

    class Meta:
        constraints = [
            # 注意：ForeignKey 在 Model 中是 activity 和 user，不是 activity_id / user_id
            models.UniqueConstraint(fields=['user', 'activity'], name='uniq_user_activity')
        ]
