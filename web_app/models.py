from django.db import models
from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator

class AcademicGrade(models.Model):
    id = models.AutoField(primary_key=True)
    grade_level = models.CharField(max_length=50)
    class Meta:
        db_table = 'academic_grade'
        managed = False
    def __str__(self):
        return self.grade_level

class Academic(models.Model):
    id = models.CharField(max_length=1, primary_key=True)
    name = models.CharField(max_length=50)
    def __str__(self):
        return self.name
    class Meta:
        db_table = 'academic'
        managed = False

class Department(models.Model):
    name = models.CharField(max_length=100)
    def __str__(self):
        return self.name
    class Meta:
        db_table = 'department'
        managed = False

#---------
class Academica(models.Model):
    id = models.CharField(primary_key=True, max_length=1)  # 明確設定為主鍵
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
    academica = models.ForeignKey(Academica, db_column='academic_id', on_delete=models.CASCADE)
    departmentd = models.ForeignKey(Departmentd, db_column='department_id', on_delete=models.CASCADE)
    id = models.AutoField(primary_key=True)
    grade_level = models.CharField(max_length=50)
    course_id = models.CharField(max_length=50)
    course_name = models.CharField(max_length=50)
    course_teacher = models.CharField(max_length=50)
    class Meta:
        db_table = 'web_app_course'
        managed = False

    def __str__(self):
        return f"Course related to {self.academica.name} {self.departmentd.name}"

# class CourseStar(models.Model):
#     """
#     Model for storing star ratings for courses.
#     Maps to the existing web_app_CourseStar table.
#     """
#     course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='course_stars')
#     user = models.ForeignKey(User, on_delete=models.CASCADE)
#     star = models.PositiveSmallIntegerField(
#         validators=[MinValueValidator(1), MaxValueValidator(5)]
#     )
#     created_at = models.DateTimeField(auto_now_add=True)
    
#     class Meta:
#         db_table = 'web_app_CourseStar'  # Map to existing table
#         unique_together = ['course', 'user']  # Each user can only rate a course once
#         ordering = ['-created_at']
    
#     def __str__(self):
#         return f"{self.star} stars by {self.user.username} for {self.course.course_name}"

class CourseStar(models.Model):
    """Stores individual star ratings for courses"""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='course_stars')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    star = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'web_app_CourseStar'  # Specify the correct table name
        ordering = ['-created_at']
        unique_together = ['course_id', 'user_id']  # Each user can only rate a course once
    
    def __str__(self):
        return f"{self.star} stars by {self.user.username} for {self.course.course_name}"


class CourseReview(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'web_app_coursereview'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Review by {self.user.username} for {self.course.course_name}"


#-------------

class Category(models.Model):
    name = models.CharField(max_length=50)
    class Meta:
        db_table = 'Category'
    def __str__(self):
        return self.name

class Status(models.Model):
    name = models.CharField(max_length=20)
    def __str__(self):
        return self.name

class Book2(models.Model):
    book_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    academic = models.ForeignKey(Academic, to_field='id', db_column='academic_id', on_delete=models.PROTECT, blank=True, null=True)
    department = models.ForeignKey(Department, to_field='id', db_column='department_id', on_delete=models.PROTECT, blank=True, null=True)
    grade = models.ForeignKey('AcademicGrade', on_delete=models.PROTECT, blank=True, null=True)
    category = models.ForeignKey(Category, to_field='id', db_column='category_id', on_delete=models.PROTECT, blank=True, null=True)
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
    TYPE_CHOICES = [
        ('food', '美食'),
        ('sport', '運動'),
        ('study', '讀書'),
        ('travel', '旅遊'),
        ('movie', '電影'),
        ('other', '其他'),
    ]

    LOCATION_TYPE_CHOICES = [
        ('on_campus', '校內'),
        ('off_campus', '校外'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)  # 發起者
    title = models.CharField(max_length=200)
    description = models.TextField()
    type = models.CharField(max_length=50, choices=TYPE_CHOICES) 
    location = models.CharField(max_length=200)  # 地點名稱
    location_type = models.CharField(max_length=20, choices=LOCATION_TYPE_CHOICES, default='on_campus')
    
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
    def location_display(self):
        return self.location_short

    @property
    def location_short(self):
        """逗號前的部分"""
        if not self.location:
            return ""
        return self.location.split(",")[0]

    @property
    def location_full(self):
        """完整地址，優先用 address，沒有就用 location"""
        return self.address or self.location or ""

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

    def get_type_display_chinese(self):
        """獲取中文顯示的活動類型"""
        type_dict = dict(self.TYPE_CHOICES)
        return type_dict.get(self.type, self.type)

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



class ActivityComment(models.Model):
    activity = models.ForeignKey(GroupActivity, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    likes = models.ManyToManyField(User, related_name='liked_comments', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    @property
    def likes_count(self):
        return self.likes.count()
    
    def __str__(self):
        return f'{self.user.username} - {self.content[:50]}'