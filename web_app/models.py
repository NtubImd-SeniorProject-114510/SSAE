from django.db import models
from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone

class Academic(models.Model):
    name = models.CharField(max_length=50)
    def __str__(self):
        return self.name

class Department(models.Model):
    name = models.CharField(max_length=100)
    def __str__(self):
        return self.name

#---------
class Academica(models.Model):
    name = models.CharField(max_length=50)
    class Meta:
        db_table = 'academic'
        managed = False
    def __str__(self):
        return self.name

class Departmentd(models.Model):
    name = models.CharField(max_length=100)
    class Meta:
        db_table = 'department'
        managed = False
    def __str__(self):
        return self.name

class AcadeDepart(models.Model):
    academica = models.ForeignKey(Academica, db_column='academic_id', on_delete=models.CASCADE)
    departmentd = models.ForeignKey(Departmentd, db_column='department_id', on_delete=models.CASCADE)
    class Meta:
        db_table = 'academic_department'
        managed = False
    def __str__(self):
        return self.name

class AcadeGrade(models.Model):
    academica = models.ForeignKey(Academica, db_column='academic_id', on_delete=models.CASCADE)
    grade_level = models.CharField(max_length=50)
    class Meta:
        db_table = 'academic_grade'
        managed = False
    def __str__(self):
        return self.name

class Course(models.Model):
    academica = models.ForeignKey(Academica, on_delete=models.CASCADE)
    departmentd = models.ForeignKey(Departmentd, on_delete=models.CASCADE)
    grade_level = models.CharField(max_length=50)
    class Meta:
        db_table = 'web_app_course'
        managed = False

    def __str__(self):
        return f"Course related to {self.academic.name} {self.departmentd.name}"
#-------------

class Category(models.Model):
    name = models.CharField(max_length=50)
    def __str__(self):
        return self.name

class Status(models.Model):
    name = models.CharField(max_length=20)
    def __str__(self):
        return self.name

class Book2(models.Model):
    book_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    academic = models.ForeignKey(Academic, on_delete=models.PROTECT, blank=True, null=True)
    department = models.ForeignKey(Department, on_delete=models.PROTECT, blank=True, null=True)
    grade = models.IntegerField(blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, blank=True, null=True)
    CONDITION_CHOICES = [
        ('new', '全新'),
        ('good', '良好'),
        ('used', '尚可'),
    ]
    condition = models.CharField(max_length=10, choices=CONDITION_CHOICES, blank=True, null=True)

    price = models.IntegerField()
    contact = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='book2_contact')
    description = models.TextField(blank=True)
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='book2_seller')

    status = models.ForeignKey(Status, on_delete=models.PROTECT, blank=True, null=True)
    cover_image = models.ImageField(upload_to='book2_covers/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

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
    def joined_count(self):
        """返回已加入活動的參與者數量"""
        return self.participants.filter(status='joined').count()

    @property
    def is_full(self):
        """檢查活動是否已額滿"""
        return self.joined_count >= self.max_participants

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

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = '團體活動'
        verbose_name_plural = '團體活動'
        ordering = ['-created_at']

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




class Book(models.Model):
    title = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True)
    
    DEPARTMENT_CHOICES = [
        ('CS', '資訊系'),
        ('EE', '電機系'),
        ('ME', '機械系'),
    ]
    department = models.CharField(max_length=50, choices=DEPARTMENT_CHOICES)

    GRADE_CHOICES = [
        ('1', '一年級'),
        ('2', '二年級'),
        ('3', '三年級'),
        ('4', '四年級'),
    ]
    grade = models.CharField(max_length=10, choices=GRADE_CHOICES)

    TYPE_CHOICES = [
        ('textbook', '教科書'),
        ('reference', '參考書'),
        ('novel', '小說'),
    ]
    book_type = models.CharField(max_length=50, choices=TYPE_CHOICES)

    CONDITION_CHOICES = [
        ('new', '全新'),
        ('good', '良好'),
        ('used', '二手'),
    ]
    condition = models.CharField(max_length=50, choices=CONDITION_CHOICES)

    TRANSACTION_CHOICES = [
        ('face', '面交'),
        ('mail', '郵寄'),
    ]
    transaction = models.CharField(max_length=50, choices=TRANSACTION_CHOICES)

    # 圖片欄位
    cover_image = models.ImageField(upload_to='book_covers/', blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
