# models.py
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class GroupActivity(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)  # 發起者
    title = models.CharField(max_length=200)
    description = models.TextField()
    type = models.CharField(max_length=50)  # 活動類型
    location = models.CharField(max_length=200)  # 地點名稱
    
    # 新增地理位置相關欄位
    address = models.TextField(blank=True, null=True)  # 完整地址
    latitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)  # 緯度
    longitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)  # 經度
    place_id = models.CharField(max_length=200, blank=True, null=True)  # Google Places ID
    
    date = models.DateField()
    time = models.TimeField()
    deadline = models.DateField()  # 報名截止日期
    min_participants = models.IntegerField(default=1)
    max_participants = models.IntegerField(default=10)
    cover_image = models.ImageField(upload_to='group_activity_images/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)  # 新增時自動填入
    # 新增聯絡方式欄位
    contact_info = models.CharField(max_length=200, blank=True, null=True)

    @property
    def is_full(self):
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
    
    @property
    def has_location_data(self):
        """檢查是否有地理位置資料"""
        return self.latitude is not None and self.longitude is not None

class ActivityParticipant(models.Model):
    STATUS_CHOICES = [
        ("joined", "已加入"),
        ("cancelled", "已取消"),
    ]

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="joined")
    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    activity = models.ForeignKey(GroupActivity, on_delete=models.CASCADE, related_name="participants")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'activity'], name='uniq_user_activity')
        ]