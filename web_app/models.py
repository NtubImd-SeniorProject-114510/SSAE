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

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

# ===== 學制 / 科系 / 關聯 / 年級 =====
class Academica(models.Model):
    id = models.CharField(primary_key=True, max_length=1)
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
        # 安全回傳
        return f"{getattr(self.academica, 'name', '')}-{getattr(self.departmentd, 'name', '')}".strip('-')

class AcadeGrade(models.Model):
    academica = models.ForeignKey(Academica, db_column='academic_id', on_delete=models.CASCADE)
    grade_level = models.CharField(max_length=50)
    class Meta:
        db_table = 'academic_grade'
        managed = False
    def __str__(self):
        return self.grade_level

# ===== 唯一的使用者表（就是你資料庫的 User）=====
class User(models.Model):
    user_id = models.AutoField(primary_key=True)
    mail = models.CharField(max_length=255, blank=True, null=True)
    class Meta:
        db_table = "User"
        managed = False
    def __str__(self):
        return self.mail or f"User({self.user_id})"

# ===== 課程 =====
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
        return f"{self.course_name}（{self.course_teacher}）"

# ===== 評論（user → 你家的 User.user_id）=====
class CourseReview(models.Model):
    course = models.ForeignKey('Course', on_delete=models.CASCADE, related_name='reviews')
    user   = models.ForeignKey('User', on_delete=models.CASCADE, db_column='user_id', to_field='user_id')

    content = models.TextField()
    rating  = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=False, blank=False,
    )
    is_anonymous = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'web_app_coursereview'
        managed = False
        ordering = ['-created_at']
        # 注意：managed=False 下 constraints 只作為文件；實際約束請在 DB 裡維護
        # constraints = [
        #     models.UniqueConstraint(
        #         fields=['course', 'user'],
        #         name='web_app_coursereview_course_id_user_id_e646b5c0_uniq',
        #     ),
        # ]

    def __str__(self):
        return f"Review(user_id={getattr(self.user, 'user_id', None)}, course_id={getattr(self.course, 'id', None)})"

    @property
    def display_name(self):
        if self.is_anonymous:
            return "匿名"
        # 你家的 User 只有 mail；若你有 name 欄位，可自行改為 name
        return self.user.mail or f"使用者{self.user.user_id}"

# ===== 按讚（user → 你家的 User.user_id）=====
class ReviewLike(models.Model):
    review = models.ForeignKey('CourseReview', on_delete=models.CASCADE, related_name='review_likes')
    user   = models.ForeignKey('User', on_delete=models.CASCADE, db_column='user_id', to_field='user_id')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'web_app_ReviewLike'
        managed  = False
        constraints = [
            models.UniqueConstraint(fields=['review', 'user'], name='uniq_reviewlike_review_user'),
        ]
        indexes = [
            models.Index(fields=['review', 'user'], name='idx_reviewlike_review_user'),
        ]

    def __str__(self):
        return f"Like(review={getattr(self.review, 'id', None)}, user={getattr(self.user, 'user_id', None)})"
#-------------



class Category(models.Model):
    name = models.CharField(max_length=50)
    class Meta:
        db_table = 'Category'
    def __str__(self):
        return self.name

class Status(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=20)  # 例如：可購買、已售完

    def __str__(self):
        return self.name


class Book2(models.Model):
    book_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    
    academic = models.ForeignKey(
        'Academic', 
        to_field='id', 
        db_column='academic_id', 
        on_delete=models.PROTECT, 
        blank=True, 
        null=True
    )
    department = models.ForeignKey(
        'Department', 
        to_field='id', 
        db_column='department_id', 
        on_delete=models.PROTECT, 
        blank=True, 
        null=True
    )
    grade = models.ForeignKey(
        'AcademicGrade', 
        to_field='id', 
        db_column='grade_id', 
        on_delete=models.PROTECT, 
        blank=True, 
        null=True
    )
    category = models.ForeignKey(
        'Category', 
        to_field='id', 
        db_column='category_id', 
        on_delete=models.PROTECT, 
        blank=True, 
        null=True
    )
    
    CONDITION_CHOICES = [
        ('new', '全新'),
        ('good', '良好'),
        ('used', '尚可'),
    ]
    condition = models.CharField(max_length=10, choices=CONDITION_CHOICES, blank=True, null=True)

    price = models.IntegerField()
    description = models.TextField(blank=True)
    cover_image = models.ImageField(upload_to='book2_covers/', blank=True, null=True)
    
    contact = models.ForeignKey(
        'auth.User', 
        on_delete=models.PROTECT, 
        related_name='book2_contact'
    )
    seller = models.ForeignKey(
        'auth.User', 
        on_delete=models.PROTECT, 
        related_name='book2_seller'
    )

    status = models.ForeignKey(
        'Status', 
        on_delete=models.PROTECT, 
        blank=True, 
        null=True, 
        default=1,  # 預設為可購買
        db_column='status_id'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'web_app_book2'

    def __str__(self):
        return self.title



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




# activities/models.py
from django.conf import settings
from django.db import models
from django.utils import timezone


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

    # 發起者：一律使用 auth_user
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='group_activities_created',
        verbose_name='發起者'
    )

    title = models.CharField(max_length=200)
    description = models.TextField()
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    location = models.CharField(max_length=200)  # 地點名稱
    location_type = models.CharField(max_length=20, choices=LOCATION_TYPE_CHOICES, default='on_campus')

    # 地理位置相關欄位
    address = models.TextField(blank=True, null=True)  # 完整地址
    latitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)   # 緯度
    longitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)  # 經度
    place_id = models.CharField(max_length=200, blank=True, null=True)  # Google Places ID

    date = models.DateField()
    time = models.TimeField()
    deadline = models.DateField()  # 報名截止日期
    min_participants = models.IntegerField(default=1)
    max_participants = models.IntegerField(default=10)

    cover_image = models.ImageField(upload_to='group_activity_images/', null=True, blank=True)
    contact_info = models.CharField(max_length=200, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    # ====== 顯示/計算用屬性 ======
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
        try:
            return self.joined_count >= (self.max_participants or 0)
        except Exception:
            return False

    @property
    def tag_css(self):
        # 注意：type 存的是 key（如 'sport'），這裡對應 CSS 類別
        mapping = {
            'food': 'food',
            'sport': 'sport',
            'study': 'study',
            'travel': 'travel',
            'movie': 'movie',
            'other': 'other',
        }
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
        base = self.title or f'活動 {self.pk}'
        try:
            uname = getattr(self.user, 'get_full_name', lambda: '')() or getattr(self.user, 'username', '')
            if uname:
                return f'{base}／by {uname}'
        except Exception:
            pass
        return base

    class Meta:
        verbose_name = '團體活動'
        verbose_name_plural = '團體活動'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['date', 'time'], name='idx_ga_dt'),
            models.Index(fields=['type'], name='idx_ga_type'),
            models.Index(fields=['location_type'], name='idx_ga_loctype'),
        ]


class ActivityParticipant(models.Model):
    STATUS_CHOICES = [
        ("joined", "已加入"),
        ("cancelled", "已取消"),
    ]

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="joined")
    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # 參與者 → auth_user
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='group_activity_participations'
    )

    # 活動
    activity = models.ForeignKey(
        GroupActivity,
        on_delete=models.CASCADE,
        related_name="participants"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'activity'], name='uniq_user_activity')
        ]
        indexes = [
            models.Index(fields=['activity', 'user'], name='idx_part_activity_user'),
            models.Index(fields=['status'], name='idx_part_status'),
        ]

    def __str__(self):
        return f'Participant(user={self.user_id}, activity={self.activity_id}, status={self.status})'


class ActivityComment(models.Model):
    activity = models.ForeignKey(
        GroupActivity,
        on_delete=models.CASCADE,
        related_name='comments'
    )

    # 留言者 → auth_user
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='activity_comments'
    )

    content = models.TextField()
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='replies'
    )

    # 按讚的人 → auth_user
    likes = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='liked_activity_comments',
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['activity', 'created_at'], name='idx_cmt_activity_created'),
        ]

    @property
    def likes_count(self):
        return self.likes.count()

    def __str__(self):
        uname = ''
        try:
            uname = getattr(self.user, 'get_full_name', lambda: '')() or getattr(self.user, 'username', '')
        except Exception:
            pass
        snippet = (self.content or '')[:20].replace('\n', ' ')
        return f'{uname or "user"}: {snippet}'