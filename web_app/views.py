# web_app\views.py

import os
import json
import zipfile
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods, require_GET
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
import json
from django.db import models
from .views_rag import ask_question, create_vector_store, load_pdf_documents, split_documents
from django.contrib.auth.decorators import login_required
from django.db import connection, transaction


def base(request):
    return render(request, 'base.html')

def welcome(request):
    return render(request, 'welcome.html')

def welcome_mo(request):
    return render(request, 'welcome_mo.html')

def index(request):
    return render(request, 'index.html')

# def mobile(request):
#     return render(request, 'mobile.html')

def login(request):
    return render(request, 'login.html')

def personal(request):
    if not request.user.is_authenticated:
        from django.shortcuts import redirect
        return redirect('login')
        
    # 從自定義 User 表獲取用戶資料
    from django.db import connection
    user_data = None
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT name, student_id, mail, course, grade, academic, role 
                FROM `User` 
                WHERE mail = %s
            """, [request.user.email])
            
            columns = [col[0] for col in cursor.description]
            row = cursor.fetchone()
            
            if row:
                user_data = dict(zip(columns, row))
    except Exception as e:
        print(f"Error fetching user data: {e}")
    
    # 獲取 Google 用戶照片
    google_picture = None
    try:
        print("Checking social auth for user:", request.user.email)  # 調試日誌
        social = request.user.social_auth.filter(provider='google-oauth2').first()
        print("Social auth found:", bool(social))  # 調試日誌
        if social:
            print("Social extra data:", social.extra_data)  # 調試日誌
            google_picture = social.extra_data.get('picture')
            print("Google picture URL:", google_picture)  # 調試日誌
    except Exception as e:
        print(f"Error getting social auth data: {e}")  # 調試日誌
    
    return render(request, "personal.html", {
        'user_data': user_data,
        'user': request.user,  # 保留原始的 user 對象以確保向後兼容
        'google_picture': google_picture  # 添加 Google 照片 URL
    })

def chat(request):
    return render(request, 'chat.html')

def navbar2(request):
    return render(request, 'navbar(2).html')

def join(request):
    return render(request, 'join.html')

def join_create(request):
    return render(request, 'join_create.html')

def join_detail(request):
    return render(request, 'join_detail.html')

from .models import ActivityComment, Book2
from .models import Department, Category
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.shortcuts import render, get_object_or_404, redirect
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.contrib.auth.decorators import login_required
from .models import Book2, Category, Academic, AcademicGrade, Department, AcadeDepart, AcadeGrade
from .forms import Book2Form
from django.http import JsonResponse

def book(request):
    books_list = Book2.objects.all().order_by('-created_at')

    # 每行顯示數量（URL參數，預設4）
    items_per_row = int(request.GET.get('items_per_row', 4))
    items_per_page = items_per_row * 3  # 每頁3行

    paginator = Paginator(books_list, items_per_page)
    page_number = request.GET.get('page')
    try:
        books = paginator.page(page_number)
    except PageNotAnInteger:
        books = paginator.page(1)
    except EmptyPage:
        books = paginator.page(paginator.num_pages)

    form = Book2Form()
    categories = Category.objects.all()
    academics = Academic.objects.all()
    # 只傳遞學制，科系和年級透過 AJAX 動態載入
    departments = []  # 空的科系列表
    academic_grades = []  # 空的年級列表

    return render(request, 'book.html', {
        'books': books,
        'form': form,
        'categories': categories,
        'academics': academics,
        'academic_grades': academic_grades,
        'departments': departments,
        'items_per_row': items_per_row,
    })

def book_2(request):
    return render(request, 'book_2.html')

def book_detail(request, pk):
    book = get_object_or_404(Book2, pk=pk)
    seller_user = book.seller
    seller_google_picture = None
    try:
        if hasattr(seller_user, 'social_auth'):
            social = seller_user.social_auth.filter(provider='google-oauth2').first()
            if social and 'picture' in social.extra_data:
                seller_google_picture = social.extra_data['picture']
    except Exception as e:
        print(f"Error getting seller social auth data: {e}")

    related_books_query = Book2.objects.exclude(pk=pk).exclude(status__name__in=['已售出', '下架'])
    related_books = []

    # 同分類 + 同系所
    if book.category and book.department:
        related_books.extend(related_books_query.filter(category=book.category, department=book.department)[:2])

    # 同分類 + 同學制
    if book.category and book.academic and len(related_books) < 6:
        related_books.extend(related_books_query.filter(category=book.category, academic=book.academic)
                             .exclude(pk__in=[b.pk for b in related_books])[:2])

    # 同分類不同系所
    if book.category and len(related_books) < 6:
        related_books.extend(related_books_query.filter(category=book.category)
                             .exclude(pk__in=[b.pk for b in related_books])[:2])

    # 同系所不同分類
    if book.department and len(related_books) < 6:
        related_books.extend(related_books_query.filter(department=book.department)
                             .exclude(pk__in=[b.pk for b in related_books])[:2])

    # 同學制填滿
    if book.academic and len(related_books) < 6:
        remaining = 6 - len(related_books)
        related_books.extend(related_books_query.filter(academic=book.academic)
                             .exclude(pk__in=[b.pk for b in related_books]).order_by('-created_at')[:remaining])

    # 隨機補齊
    if len(related_books) < 6:
        remaining = 6 - len(related_books)
        related_books.extend(related_books_query.exclude(pk__in=[b.pk for b in related_books]).order_by('?')[:remaining])

    return render(request, 'book_detail.html', {
        'book': book,
        'seller_user': seller_user,
        'seller_google_picture': seller_google_picture,
        'related_books': related_books[:6]
    })

def get_related_data(request):
    """根據學制ID獲取對應的科系和年級"""
    academic_id = request.GET.get("academic_id")
    
    # 添加調試資訊
    print(f"收到請求，academic_id: {academic_id}")
    
    if not academic_id:
        return JsonResponse({
            "departments": [], 
            "grades": [],
            "debug": "沒有收到 academic_id"
        })

    try:
        # 先檢查學制是否存在
        try:
            academic = Academic.objects.get(id=academic_id)
            print(f"找到學制: {academic.name}")
        except Academic.DoesNotExist:
            print(f"學制 ID {academic_id} 不存在")
            return JsonResponse({
                "departments": [], 
                "grades": [],
                "error": f"學制 ID {academic_id} 不存在"
            })

        # 找科系：根據 academic_department 表找出該學制下的所有科系
        print("開始查詢科系...")
        academic_departments = AcadeDepart.objects.filter(
            academica_id=academic_id
        ).select_related("departmentd")
        
        print(f"找到 {academic_departments.count()} 個科系關聯")
        
        dept_list = []
        for ad in academic_departments:
            print(f"科系: {ad.departmentd.name}")
            dept_list.append({
                "id": ad.departmentd.id, 
                "name": ad.departmentd.name
            })

        # 找年級：根據 academic_grade 表找出該學制下的所有年級
        print("開始查詢年級...")
        academic_grades = AcadeGrade.objects.filter(
            academica_id=academic_id
        ).order_by('id')
        
        print(f"找到 {academic_grades.count()} 個年級")
        
        grade_list = []
        for ag in academic_grades:
            print(f"年級: {ag.grade_level}")
            grade_list.append({
                "id": ag.id, 
                "grade_level": ag.grade_level
            })

        result = {
            "departments": dept_list,
            "grades": grade_list,
            "debug": f"成功載入 {len(dept_list)} 個科系和 {len(grade_list)} 個年級"
        }
        
        print(f"返回結果: {result}")
        return JsonResponse(result)
        
    except Exception as e:
        error_msg = f"Error in get_related_data: {str(e)}"
        print(error_msg)
        import traceback
        traceback.print_exc()
        
        return JsonResponse({
            "departments": [], 
            "grades": [],
            "error": error_msg
        }, status=500)

@login_required
def upload_book2(request):
    if request.method == "POST":
        form = Book2Form(request.POST, request.FILES)
        if form.is_valid():
            book = form.save(commit=False)
            book.seller = request.user
            book.contact = request.user
            if 'cover_image' in request.FILES:
                book.cover_image = request.FILES['cover_image']
            book.save()
            return JsonResponse({'success': True, 'message': '書籍上架成功！', 'book_id': book.pk})
        else:
            return JsonResponse({'success': False, 'message': str(form.errors)}, status=400)

    form = Book2Form()
    academics = Academic.objects.all()

    return render(request, 'book.html', {
        'form': form,
        'books': Book2.objects.all(),
        'academics': academics,
    })

def ask_page(request):
    return render(request, "ask.html")
############################################################
from django.urls import reverse, NoReverseMatch
from django.db.models import Count, Q

def _safe_reverse(name: str, args=None, kwargs=None, fallback: str = "/") -> str:
    """有就用 url name，沒有就用備援字串。"""
    try:
        return reverse(name, args=args or [], kwargs=kwargs or {})
    except NoReverseMatch:
        return fallback


def _shorten(text: str, limit: int = 24) -> str:
    text = (text or "").strip()
    return text if len(text) <= limit else (text[: limit - 1] + "…")


def index(request):
    from .models import CourseReview, Book2, GroupActivity

    # ====== 課程評論：最新 ======
    comment_new_item = None
    cr_new = (
        CourseReview.objects.select_related("course").order_by("-created_at").first()
    )
    if cr_new and cr_new.course:
        title = f"最新！課程評論︰{_shorten(cr_new.course.course_name)}"
        url = f"/comment_detail/{cr_new.course.id}/"  # 專案已採用此路徑樣式
        comment_new_item = {"title": title, "url": url}

    # ====== 課程評論：熱門（依按讚數） ======
    from .models import ReviewLike  # 確認存在
    comment_hot_item = None
    cr_hot = (
        CourseReview.objects.select_related("course")
        .annotate(likes_count=Count("review_likes"))
        .order_by("-likes_count", "-created_at")
        .first()
    )
    if cr_hot and cr_hot.course:
        title = f"🔥 課程評論︰{_shorten(cr_hot.course.course_name)}"
        url = f"/comment_detail/{cr_hot.course.id}/"
        comment_hot_item = {"title": title, "url": url}

    # ====== 二手書：最新（Book2） ======
    book_new_item = None
    try:
        b_new = Book2.objects.order_by("-created_at").first()
        if b_new:
            title = f"最新上架！二手書︰{_shorten(b_new.title)}"
            url = _safe_reverse("book_detail", args=[b_new.pk], fallback=f"/book/{b_new.pk}/")
            book_new_item = {"title": title, "url": url}
    except Exception:
        pass

    # ====== 二手書：熱門 → 直接導到 NTUB 網站 ======
    ntub = {
        "title": "國立臺北商業大學",
        "url": "https://www.ntub.edu.tw/"
    }

    # ====== 活動召集：最新 ======
    activity_new_item = None
    try:
        a_new = GroupActivity.objects.order_by("-created_at").first()
        if a_new:
            title = f"最新！活動︰{_shorten(a_new.title)}"
            url = _safe_reverse("activity_detail", args=[a_new.pk], fallback=f"/activity/{a_new.pk}/")
            activity_new_item = {"title": title, "url": url}
    except Exception:
        pass

    # ====== 活動召集：熱門（依參與人數） ======
    activity_hot_item = None
    try:
        a_hot = (
            GroupActivity.objects
            .annotate(joined_count=Count("participants", filter=Q(participants__status="joined")))
            .order_by("-joined_count", "-created_at")
            .first()
        )
        if a_hot:
            title = f"🔥 活動︰{_shorten(a_hot.title)}"
            url = _safe_reverse("activity_detail", args=[a_hot.pk], fallback=f"/activity/{a_hot.pk}/")
            activity_hot_item = {"title": title, "url": url}
    except Exception:
        pass

    # ====== 組裝給前端 ======
    # 桌機：左邊 3 個（最新：課程／二手書／活動），右邊 3 個（熱門：課程／二手書／活動）
    dlg_left = [
        activity_new_item or {"title": "最新！活動︰暫無資料", "url": _safe_reverse("activity_list", fallback="/activities/")},
        comment_hot_item  or {"title": "🔥 課程評論︰暫無資料", "url": "/comment/"},
        ntub     or {"title": "國立臺北商業大學",   "url": "https://www.ntub.edu.tw/"},
    ]
    dlg_right = [
        activity_hot_item or {"title": "🔥 活動︰暫無資料", "url": _safe_reverse("activity_list", fallback="/activities/")}, 
        book_new_item    or {"title": "最新上架！二手書︰暫無資料",   "url": _safe_reverse("book", fallback="/book/")},
        comment_new_item or {"title": "最新！課程評論︰暫無資料", "url": "/comment/"},
    ]

    # 手機：3 個（只顯示最新：課程／二手書／活動）
    dlg_mobile = [
        activity_new_item or {"title": "最新！活動︰暫無資料", "url": _safe_reverse("activity_list", fallback="/activities/")},
        book_new_item    or {"title": "最新上架！二手書︰暫無資料",   "url": _safe_reverse("book", fallback="/book/")},
        comment_new_item or {"title": "最新！課程評論︰暫無資料", "url": "/comment/"},
    ] 

    return render(request, 'index.html', {
        'dlg_left': dlg_left,
        'dlg_right': dlg_right,
        'dlg_mobile': dlg_mobile,
    })


# views.py — 課程評論「列表頁」產 JSON 給前端，顯示熱門評論的頭貼與姓名
from django.conf import settings
from django.db.models import Avg, Count, Max, Q, Subquery, OuterRef
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import timedelta
import json

from .models import (
    Course, Departmentd, Academica, AcadeGrade, AcadeDepart,
    CourseReview, ReviewLike,
    User as LegacyUser,   # 你的主系統 User（review 外鍵就是它）
)

# 只用於「顯示頭貼」：透過 email 對應到 auth_user + social_django
from django.contrib.auth import get_user_model
from social_django.models import UserSocialAuth
AuthUser = get_user_model()
# 你家的 User
from .models import User as LegacyUser  

def get_legacy_user_id(request) -> int | None:
    """
    回傳你家 User.user_id；若 request.user 沒有 email 或找不到對應，就回傳 None
    """
    email = getattr(request.user, "email", None)
    if not email:
        return None

    return (
        LegacyUser.objects
        .filter(mail=email)
        .values_list("user_id", flat=True)
        .first()
    )

def _auth_user_map_by_email(emails):
    """
    批次把 email 對應到：
      - auth_user 物件（以 email 為 key）
      - Google 頭貼：pics_by_uid[auth_user.id] = picture_url
    回傳 (u_by_email, pics_by_uid)
    """
    emails = list(emails or [])
    if not emails:
        return {}, {}

    users = AuthUser.objects.filter(email__in=emails).only(
        'id', 'email', 'first_name', 'last_name', 'username'
    )
    u_by_email = {u.email: u for u in users}
    pics_by_uid = {}

    if users:
        sa_qs = UserSocialAuth.objects.filter(
            user_id__in=[u.id for u in users],
            provider__icontains='google'
        )
        for sa in sa_qs:
            try:
                extra = sa.extra_data or {}
                pic = extra.get('picture') or extra.get('avatar_url')
                if pic:
                    pics_by_uid[sa.user_id] = pic
            except Exception:
                pass

    return u_by_email, pics_by_uid

# ---------- 小工具：把時間轉成「幾小時前」 ----------
def _humanize(dt):
    if not dt:
        return ""
    now = timezone.now()
    diff = now - dt
    if diff.total_seconds() < 60:
        return "剛剛"
    if diff.total_seconds() < 3600:
        return f"{int(diff.total_seconds() // 60)} 分鐘前"
    if diff.days < 1:
        return f"{int(diff.total_seconds() // 3600)} 小時前"
    if diff.days < 7:
        return f"{diff.days} 天前"
    return dt.strftime("%Y/%m/%d")


# ---------- 小工具：一次把多個 email 轉成 {email: picture_url} 與 {email: display_name} ----------
def _google_avatar_and_name_by_emails(emails: set[str]) -> tuple[dict, dict]:
    """
    依 email 批次查 auth_user 與 social_django，回傳：
    - pics[email] = 'https://...' 或 None
    - names[email] = '張三' / 'username' / 'email前綴'
    若查不到或沒綁 Google，就回 None/預設名。
    """
    pics: dict[str, str | None] = {}
    names: dict[str, str] = {}

    if not emails:
        return pics, names

    users = list(AuthUser.objects.filter(email__in=list(emails)))
    u_by_id = {u.id: u for u in users}
    u_by_email = {u.email: u for u in users}

    # 先給預設名字
    for em in emails:
        u = u_by_email.get(em)
        if u:
            full = f"{(u.last_name or '')}{(u.first_name or '')}".strip()
            names[em] = full or (u.username or em.split("@")[0])
        else:
            names[em] = em.split("@")[0]

    if not users:
        return pics, names

    # 找 Google 綁定的頭貼
    for sa in UserSocialAuth.objects.filter(user_id__in=u_by_id.keys(), provider__icontains="google"):
        try:
            extra = sa.extra_data or {}
            pic = extra.get("picture") or extra.get("avatar_url")
            if pic:
                au = u_by_id.get(sa.user_id)
                if au and au.email:
                    pics[au.email] = pic
        except Exception:
            pass

    return pics, names


# =========================
# 列表頁（含動態統計 + 熱門評論頭貼/姓名）
# =========================
from django.views.decorators.csrf import ensure_csrf_cookie
from django.db.models import Avg, Count, Max, Q, Subquery, OuterRef, F, Value, BooleanField, Case, When
from django.db.models.functions import Coalesce

@ensure_csrf_cookie
def comment(request):
    academics = Academica.objects.all()
    departments = Departmentd.objects.all()
    grades = list(AcadeGrade.objects.values_list('grade_level', flat=True).distinct())

    # 下拉資料
    departments_data = {"0": list(Departmentd.objects.all().values('id', 'name'))}
    grades_data = {"0": list(AcadeGrade.objects.values_list('grade_level', flat=True).distinct())}
    for a in academics:
        dept_ids = AcadeDepart.objects.filter(academica=a).values_list('departmentd_id', flat=True)
        departments_data[str(a.id)] = list(
            Departmentd.objects.filter(id__in=dept_ids).values('id', 'name')
        )
        grades_data[str(a.id)] = list(
            AcadeGrade.objects.filter(academica=a)
            .values_list('grade_level', flat=True).distinct()
        )

    # 一次抓所有課程
    qs = (
        Course.objects
        .select_related('departmentd', 'academica')
        .annotate(
            avg_rating=Coalesce(
                Avg('reviews__rating', filter=Q(reviews__is_rating_only=True)), 0.0
            ),
            rating_count=Coalesce(
                Count('reviews__id', filter=Q(reviews__is_rating_only=True)), 0
            ),
            comment_count=Coalesce(
                Count('reviews__id', filter=Q(reviews__is_rating_only=False)), 0
            ),
            last_dt=Max('reviews__created_at', filter=Q(reviews__is_rating_only=False)),

            # 新增欄位：是否有評分或評論
            has_activity=Case(
                When(Q(rating_count__gt=0) | Q(comment_count__gt=0), then=Value(True)),
                default=Value(False),
                output_field=BooleanField(),
            )
        )
        .order_by('-has_activity', 'course_name')  # 有活動的課先排前面，再按課程名稱
    )

    course_ids = [c.id for c in qs]

    # 批量抓每門課熱門評論（按讚數+時間）
    top_reviews_qs = (
        CourseReview.objects
        .filter(course_id__in=course_ids, is_rating_only=False)
        .annotate(likes=Count('review_likes'))
        .order_by('course_id', '-likes', '-created_at')
    )

    # 只保留每門課一條熱門評論
    top_review_map = {}
    for tr in top_reviews_qs:
        if tr.course_id not in top_review_map:
            top_review_map[tr.course_id] = tr

    # 批量抓使用者 email
    user_ids = [tr.user_id for tr in top_review_map.values() if not tr.is_anonymous]
    users = LegacyUser.objects.filter(user_id__in=user_ids).only('user_id', 'mail')
    user_id_to_email = {u.user_id: u.mail for u in users if u.mail}

    # 批量查 avatar/name
    email_needed = set(user_id_to_email.values())
    pics_by_email, names_by_email = _google_avatar_and_name_by_emails(email_needed)

    # 組裝 payload
    payload = []
    for c in qs:
        top_review = top_review_map.get(c.id)
        course_summary = None
        if top_review:
            summary = (top_review.content or '').strip()
            if len(summary) > 80:
                summary = summary[:80] + "…"

            avatar_url = "/static/image/anonymous.png"
            display_name = "匿名"
            if not top_review.is_anonymous:
                em = user_id_to_email.get(top_review.user_id)
                if em:
                    avatar_url = pics_by_email.get(em) or "/static/image/anonymous.png"
                    display_name = names_by_email.get(em) or em.split("@")[0]

            course_summary = {
                "review_id": top_review.id,
                "likes": getattr(top_review, "likes", 0),
                "summary": summary,
                "created": _humanize(top_review.created_at),
                "avatar_url": avatar_url,
                "display_name": display_name,
            }

        item = {
            "id": c.id,
            "course_id": c.course_id,
            "course_name": c.course_name,
            "course_teacher": c.course_teacher,
            "academic_id": c.academica_id,
            "academic_name": c.academica.name if c.academica else "",
            "department_id": c.departmentd_id,
            "department_name": c.departmentd.name if c.departmentd else "",
            "grade_level": c.grade_level,
            "avg_rating": round(float(c.avg_rating or 0), 1),
            "rating_count": int(c.rating_count or 0),
            "review_count": int(c.comment_count or 0),
            "last_date": _humanize(c.last_dt) if c.last_dt else "",
            "course_summary": course_summary,
        }
        payload.append(item)

    return render(request, "comment.html", {
        "academics": academics,
        "departments": departments,
        "grades": grades,
        "departments_data": json.dumps(departments_data, ensure_ascii=False),
        "grades_data": json.dumps(grades_data, ensure_ascii=False),
        "courses_json": json.dumps(payload, ensure_ascii=False),
    })


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def submit_rating_only(request, course_id):
    """
    純評分功能 - 一個使用者對一門課只能有一個評分
    """
    try:
        course = get_object_or_404(Course, id=int(course_id))
        legacy_uid = get_legacy_user_id(request)
        if legacy_uid is None:
            return JsonResponse({"error": "無法找到對應的使用者"}, status=403)

        data = json.loads(request.body.decode("utf-8"))
        rating = int(data.get("rating", 0))
        
        if rating < 1 or rating > 5:
            return JsonResponse({"error": "評分必須是 1-5 的整數"}, status=400)

        rating_record, created = CourseReview.objects.update_or_create(
            user_id=legacy_uid,
            course=course,
            is_rating_only=True,
            defaults={
                "rating": rating,
                "content": "",
                "is_anonymous": False,
            },
        )

        return JsonResponse({
            "ok": True,
            "created": created,
            "rating": rating,
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

from django.db.models import Avg, Count, Max, Q
from django.contrib.auth import get_user_model
from social_django.models import UserSocialAuth
from .models import User

@require_GET
def get_courses(request):
    academic_id   = request.GET.get("academic_id")
    department_id = request.GET.get("department_id")
    grade         = request.GET.get("grade")
    search_query  = request.GET.get("search", "").strip()
    course_id     = request.GET.get("course_id")

    qs = Course.objects.select_related('departmentd', 'academica').all()

    if course_id:
        qs = qs.filter(id=course_id) if str(course_id).isdigit() else qs.filter(course_id=course_id)
    else:
        if academic_id and academic_id.isdigit():
            qs = qs.filter(academica_id=academic_id)
        if department_id and department_id.isdigit():
            qs = qs.filter(departmentd_id=department_id)
        if grade:
            qs = qs.filter(grade_level__contains=grade)
        if search_query:
            qs = qs.filter(
                Q(course_name__icontains=search_query) |
                Q(course_teacher__icontains=search_query) |
                Q(course_id__icontains=search_query)
            )

    course_ids = list(qs.values_list('id', flat=True))

    # A) 統計（含純評分）
    ratings_agg = (
        CourseReview.objects
        .filter(course_id__in=course_ids)
        .values('course_id')
        .annotate(
            avg=Avg('rating'),
            total=Count('id'),
            last=Max('created_at'),
        )
    )
    agg_map = {a['course_id']: a for a in ratings_agg}

    # B) 有文字的評論數
    text_counts = (
        CourseReview.objects
        .filter(course_id__in=course_ids)
        .exclude(content__isnull=True)
        .exclude(content__exact='')
        .values('course_id')
        .annotate(cnt=Count('id'))
    )
    text_map = {t['course_id']: t['cnt'] for t in text_counts}

    # C) 先抓每門課的熱門評論（同讚數取最新）→ 批次組出 email 清單
    rough_tops = {}
    emails_needed = set()

    for cid in course_ids:
        top = (
            CourseReview.objects
            .filter(course_id=cid)
            .annotate(likes=Count('review_likes'))
            .order_by('-likes', '-created_at')
            .values('id', 'content', 'likes', 'created_at', 'user_id', 'is_anonymous')
            .first()
        )
        if not top:
            continue
        rough_tops[cid] = top
        if not top["is_anonymous"]:
            # 你家 User.user_id → mail
            u = User.objects.filter(user_id=top["user_id"]).only('mail').first()
            if u and u.mail:
                emails_needed.add(u.mail)

    # D) 批次把 email → auth_user → (名字、google 頭貼)
    AuthUser = get_user_model()
    auth_users = {au.email: au for au in AuthUser.objects.filter(email__in=emails_needed)}

    # 批次查頭貼（provider 一般為 google-oauth2）
    auth_ids = [au.id for au in auth_users.values()]
    pic_map = {}  # auth_user.id -> picture url
    if auth_ids:
        for sa in UserSocialAuth.objects.filter(user_id__in=auth_ids, provider='google-oauth2'):
            try:
                if isinstance(sa.extra_data, dict):
                    pic = sa.extra_data.get('picture')
                    if pic:
                        pic_map[sa.user_id] = pic
            except Exception:
                pass

    # E) 組裝 top_reviews（帶上 display_name / avatar_url）
    top_reviews = {}
    for cid, top in rough_tops.items():
        avatar_url = "/static/image/anonymous.png"
        display_name = "匿名"

        if not top["is_anonymous"]:
            u = User.objects.filter(user_id=top["user_id"]).only('mail').first()
            if u and u.mail:
                au = auth_users.get(u.mail)  # 可能拿不到（不同系統）
                if au:
                    # 名字：先姓+名，否則 username，再退回 mail
                    full_name = f"{getattr(au, 'last_name', '')}{getattr(au, 'first_name', '')}".strip()
                    display_name = full_name or getattr(au, "username", "") or u.mail

                    # 頭貼
                    avatar_url = pic_map.get(au.id, avatar_url)

        top_reviews[cid] = {
            "id": top["id"],
            "content": top["content"] or "",
            "likes": int(top["likes"] or 0),
            "created_at": top["created_at"],
            "avatar_url": avatar_url,
            "display_name": display_name,
        }

    # F) 回傳
    data = []
    for c in qs:
        a = agg_map.get(c.id, {}) or {}
        avg = a.get('avg') or 0.0
        last_dt = a.get('last')

        item = {
            "id": c.id,
            "course_id": c.course_id,
            "course_name": c.course_name,
            "course_teacher": c.course_teacher,
            "academic_id": c.academica_id,
            "academic_name": c.academica.name if c.academica else "",
            "department_id": c.departmentd_id,
            "department_name": c.departmentd.name if c.departmentd else "",
            "grade_level": c.grade_level,

            "avg_rating": round(avg, 1),
            "rating_count": int(a.get('total') or 0),
            "review_count": int(text_map.get(c.id, 0)),
            "last_date": _humanize(last_dt) if last_dt else "",

            "course_summary": None,
        }

        top = top_reviews.get(c.id)
        if top:
            summary = top['content'].strip()
            if len(summary) > 80:
                summary = summary[:80] + "…"
            item["course_summary"] = {
                "review_id": top['id'],
                "likes": top['likes'],
                "summary": summary,
                "created": _humanize(top['created_at']),
                "avatar_url": top['avatar_url'],
                "display_name": top['display_name'],
            }

        data.append(item)

    return JsonResponse(data, safe=False)


@ensure_csrf_cookie
@login_required
@require_http_methods(["GET"])
def add_comment_blank(request):
    academics = Academica.objects.all()
    departments = Departmentd.objects.all()
    grades = list(AcadeGrade.objects.values_list('grade_level', flat=True).distinct())

    departments_data = {}
    grades_data = {}

    departments_data["0"] = list(Departmentd.objects.all().values('id', 'name'))
    grades_data["0"] = list(AcadeGrade.objects.values_list('grade_level', flat=True).distinct())

    for academic in academics:
        aid = str(academic.id)
        dept_ids = AcadeDepart.objects.filter(academica=academic).values_list('departmentd_id', flat=True)
        departments_data[aid] = list(Departmentd.objects.filter(id__in=dept_ids).values('id', 'name'))
        grades_data[aid] = list(
            AcadeGrade.objects.filter(academica=academic)
            .values_list('grade_level', flat=True).distinct()
        )

    courses = Course.objects.select_related('departmentd', 'academica').all()
    courses_data = [{
        'id': c.id,
        'course_id': c.course_id,
        'course_name': c.course_name,
        'course_teacher': c.course_teacher,
        'academic_id': c.academica_id,
        'academic_name': c.academica.name if c.academica else '',
        'department_id': c.departmentd_id,
        'department_name': c.departmentd.name if c.departmentd else '',
        'grade_level': c.grade_level,
    } for c in courses]

    context = {
        "academics": academics,
        "departments": departments,
        "grades": grades,
        "departments_data": json.dumps(departments_data, ensure_ascii=False),
        "grades_data": json.dumps(grades_data, ensure_ascii=False),
        "courses": courses,
        "courses_json": json.dumps(courses_data, ensure_ascii=False),

        "review": None,
        "google_picture": _google_picture(request.user),

        "selected_course": None,
        "selected_teacher": "",
        "selected_academic": None,
        "selected_department": None,
        "selected_grade": None,
    }
    return render(request, "add_comment.html", context)


def _google_picture(user):
    try:
        sa = user.social_auth.filter(provider__icontains='google').first()
        if sa and isinstance(sa.extra_data, dict):
            pic = sa.extra_data.get('picture') or sa.extra_data.get('avatar_url')
            if pic:
                return pic
    except Exception:
        pass
    return None


@ensure_csrf_cookie
@login_required
@require_http_methods(["GET"])
def add_comment_page(request, course_id):
    course = get_object_or_404(Course, id=int(course_id))

    # ★ 用你的 User 表：以 email 對應 user_id
    legacy_uid = get_legacy_user_id(request)
    user_review = None
    if legacy_uid is not None:
        user_review = CourseReview.objects.filter(course=course, user_id=legacy_uid).first()

    academics = Academica.objects.filter(id=course.academica_id)
    departments = Departmentd.objects.filter(id=course.departmentd_id)

    selected_grade = None
    if course.grade_level:
        parts = [p.strip() for p in course.grade_level.split(',') if p.strip()]
        selected_grade = parts[0] if parts else course.grade_level
    grades = [selected_grade] if selected_grade else []

    courses = [course]
    courses_data = [{
        "id": course.id,
        "academic_id": course.academica_id,
        "department_id": course.departmentd_id,
        "course_id": course.course_id,
        "course_name": course.course_name,
        "course_teacher": course.course_teacher or "",
        "grade_level": selected_grade,
    }]

    departments_data = {str(course.academica_id): [{
        "id": course.departmentd_id,
        "name": departments.first().name if departments.exists() else ""
    }]}
    grades_data = {str(course.academica_id): [selected_grade] if selected_grade else []}

    context = {
        "academics": academics,
        "departments": departments,
        "grades": grades,
        "departments_data": json.dumps(departments_data, ensure_ascii=False),
        "grades_data": json.dumps(grades_data, ensure_ascii=False),
        "courses": courses,
        "courses_json": json.dumps(courses_data, ensure_ascii=False),

        "review": user_review,
        "google_picture": _google_picture(request.user),
        "selected_course": course,
        "selected_teacher": course.course_teacher or "",
        "selected_academic": academics.first() if academics.exists() else None,
        "selected_department": departments.first() if departments.exists() else None,
        "selected_grade": selected_grade,
    }
    return render(request, "add_comment.html", context)


@login_required
@require_http_methods(["POST"])
@transaction.atomic
def add_comment_submit(request, course_id):
    """
    新增評論 - 一個使用者可以有多個評論，不包含評分
    """
    try:
        course = get_object_or_404(Course, id=int(course_id))
        legacy_uid = get_legacy_user_id(request)
        if legacy_uid is None:
            return JsonResponse({"error": "無法找到對應的使用者"}, status=403)

        data = json.loads(request.body.decode("utf-8"))
        content = (data.get("content") or "").strip()
        
        if not content:
            return JsonResponse({"error": "評論內容不能為空"}, status=400)

        is_anonymous = bool(data.get("anonymous", True))

        comment = CourseReview.objects.create(
            user_id=legacy_uid,
            course=course,
            content=content,
            rating=None,  # 不包含評分
            is_anonymous=is_anonymous,
            is_rating_only=False,
        )

        return JsonResponse({
            "ok": True,
            "comment_id": comment.id,
            "created_at": comment.created_at.isoformat(),
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@login_required
def delete_review(request, review_id):
    """
    刪除自己的 CourseReview（僅刪自己，且以你家的 user_id 為準）。
    """
    if request.method != 'POST':
        return JsonResponse({'error': '僅支援 POST 請求'}, status=405)

    legacy_uid = get_legacy_user_id(request)
    if legacy_uid is None:
        return JsonResponse({'error': '無法找到對應的使用者'}, status=403)

    review = get_object_or_404(CourseReview, id=review_id, user_id=legacy_uid)
    review.delete()
    return JsonResponse({'success': True})



from django.templatetags.static import static

def comment_detail(request, id=None):
    course_id = id or request.GET.get('course_id')
    if not course_id:
        from django.http import HttpResponseBadRequest
        return HttpResponseBadRequest("Missing course_id parameter")

    course = get_object_or_404(Course, id=course_id)

    stats_qs = CourseReview.objects.filter(course_id=course.id)
    raw_qs = stats_qs.order_by('-created_at')

    # 只取有文字的做顯示
    display_list = [rv for rv in raw_qs if (rv.content or '').strip()]

    # 先把要查的 email 蒐集起來（非匿名才需要）
    emails = set()
    for rv in display_list:
        if rv.is_anonymous:
            continue
        if getattr(rv.user, 'mail', None):
            emails.add(rv.user.mail)

    u_by_email, pics_by_uid = _auth_user_map_by_email(emails)

    # 當前登入者的你家 user_id（做「我是否按讚」）
    legacy_uid = get_legacy_user_id(request)
    liked_by_me_ids = set()
    if legacy_uid and display_list:
        ids = [rv.id for rv in display_list]
        liked_by_me_ids = set(
            ReviewLike.objects.filter(user_id=legacy_uid, review_id__in=ids)
            .values_list('review_id', flat=True)
        )

    review_items = []
    for rv in display_list:
        # 預設
        display_name = "匿名"
        avatar_url = static('image/anonymous.png')  # 匿名預設圖

        if not rv.is_anonymous and getattr(rv.user, 'mail', None):
            au = u_by_email.get(rv.user.mail)
            # 顯示姓名（優先姓+名，退而 username，再退 email）
            if au:
                full = f"{au.last_name or ''}{au.first_name or ''}".strip()
                display_name = full or au.username or rv.user.mail
                # 取 Google 頭貼
                pic = pics_by_uid.get(getattr(au, 'id', None))
                if pic:
                    avatar_url = pic
                else:
                    # 沒有 Google 頭貼時，用一般預設圖
                    avatar_url = static('image/default.png')

        is_owner = bool(request.user.is_authenticated and legacy_uid and rv.user_id == legacy_uid)

        review_items.append({
            "id": rv.id,
            "content": rv.content,
            "rating": rv.rating,
            "created_at": rv.created_at,
            "created_human": _humanize(rv.created_at),
            "user_id": rv.user_id,                # 你家的 user_id
            "display_name": display_name,         # 姓名/匿名
            "avatar_url": avatar_url,             # 一定不為空
            "likes_count": ReviewLike.objects.filter(review_id=rv.id).count(),
            "is_liked_by_me": rv.id in liked_by_me_ids,
            "is_owner": is_owner,
        })

    # 平均星等（全部評分）
    avg_rating = stats_qs.aggregate(avg=Avg('rating'))['avg'] or 0.0
    avg_fill_percent = (avg_rating / 5.0) * 100.0

    # 星等分布（1~5）
    star_counts = stats_qs.values('rating').annotate(count=Count('rating'))
    star_distribution = {1:0, 2:0, 3:0, 4:0, 5:0}
    for item in star_counts:
        r = item['rating']
        if r in star_distribution:
            star_distribution[r] = item['count']

    context = {
        'course': course,
        'review_items': review_items,
        'avg_rating': round(avg_rating, 1),
        'avg_fill_percent': avg_fill_percent,
        'review_count': len([rv for rv in raw_qs if (rv.content or '').strip()]),  # 有文字的
        'total_ratings': stats_qs.count(),                                         # 含純評分
        'academic': course.academica,
        'department': course.departmentd,
        'star_distribution': star_distribution,
        'last_review_human': _humanize(display_list[0].created_at) if display_list else "",
    }
    return render(request, "comment_detail.html", context)


from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required

@login_required
@require_POST
def comment_review_delete(request, id):
    """
    只允許評論作者本人（或管理員）刪除這則評論。
    回傳 JSON：{"ok": True} or {"ok": False, "error": "..."}
    """
    review = get_object_or_404(CourseReview, id=id)

    # 用你家的 user_id 來驗證本人
    legacy_uid = get_legacy_user_id(request)
    if (legacy_uid is None) or (review.user_id != legacy_uid and not request.user.is_staff):
        return JsonResponse({"ok": False, "error": "forbidden"}, status=403)

    review.delete()
    return JsonResponse({"ok": True})



# ========= REST 介面（只用 CourseReview） =========
@csrf_exempt
@login_required
@require_http_methods(["POST"])
def create_course_review(request, course_id):
    """
    新增/更新一筆「評論 + 評分」記錄（僅 CourseReview；允許 content 空字串）。
    一律使用你家的 user_id。
    """
    try:
        # 支援 course_id 或 URL 上傳入的 DB 主鍵
        if not str(course_id).isdigit():
            course = Course.objects.filter(course_id=course_id).first()
            if not course and "_" in course_id:
                numeric_part = course_id.split("_")[0]
                if numeric_part.isdigit():
                    course = Course.objects.filter(id=int(numeric_part)).first()
        else:
            course = Course.objects.filter(id=int(course_id)).first()

        if not course:
            return JsonResponse({'error': f'找不到 ID 為 {course_id} 的課程'}, status=404)

        # ★ 你家的 user_id
        legacy_uid = get_legacy_user_id(request)
        if legacy_uid is None:
            return JsonResponse({'error': '無法找到對應的使用者'}, status=403)

        data = json.loads(request.body or "{}")
        content = (data.get('content') or '').strip()
        rating = int(data.get('rating', 0))
        if not (1 <= rating <= 5):
            return JsonResponse({'error': '評分必須是 1-5 的整數'}, status=400)

        review, created = CourseReview.objects.update_or_create(
            user_id=legacy_uid,              # ★
            course_id=course.id,
            defaults={'content': content, 'rating': rating}
        )

        return JsonResponse({
            'success': True,
            'is_new': created,
            'review': {
                'id': review.id,
                'content': review.content,
                'rating': review.rating,
                'user_id': legacy_uid,      # ★
            },
        }, status=201)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@login_required
@require_http_methods(["PUT"])
def update_course_review(request, course_id, review_id):
    try:
        course = get_object_or_404(Course, id=course_id)
        data = json.loads(request.body or "{}")

        legacy_uid = get_legacy_user_id(request)
        if legacy_uid is None:
            return JsonResponse({'error': '無法找到對應的使用者'}, status=403)

        review = get_object_or_404(
            CourseReview,
            id=review_id,
            user_id=legacy_uid,         # ★ 僅限本人
            course_id=course.id
        )

        if 'content' in data:
            review.content = (data['content'] or '').strip()

        if 'rating' in data:
            rating = int(data['rating'])
            if not (1 <= rating <= 5):
                return JsonResponse({'error': '評分必須是 1-5 的整數'}, status=400)
            review.rating = rating

        review.save()

        return JsonResponse({
            'success': True,
            'review': {'id': review.id, 'content': review.content, 'rating': review.rating}
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@login_required
@require_http_methods(["DELETE"])
def delete_course_review(request, course_id, review_id):
    try:
        legacy_uid = get_legacy_user_id(request)
        if legacy_uid is None:
            return JsonResponse({'error': '無法找到對應的使用者'}, status=403)

        review = get_object_or_404(
            CourseReview, id=review_id, user_id=legacy_uid, course_id=course_id
        )
        review.delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


# =========================
# 動態下拉 API
# =========================
@require_GET
def get_departments(request):
    academic_id = request.GET.get('academic_id')
    if not academic_id:
        return JsonResponse({'error': 'Missing academic_id parameter'}, status=400)

    try:
        academic = get_object_or_404(Academica, id=academic_id)
        dept_ids = AcadeDepart.objects.filter(academica=academic).values_list('departmentd_id', flat=True)
        depts = Departmentd.objects.filter(id__in=dept_ids).values('id', 'name')
        return JsonResponse({'success': True, 'departments': list(depts)})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_GET
def get_grades(request):
    academic_id = request.GET.get('academic_id')
    if not academic_id:
        return JsonResponse({'error': 'Missing academic_id parameter'}, status=400)

    try:
        academic = get_object_or_404(Academica, id=academic_id)
        grades_qs = (
            AcadeGrade.objects
            .filter(academica=academic)
            .values_list('grade_level', flat=True)
            .distinct()
        )
        grades = list(grades_qs)

        if not grades:
            grades = ['一', '二', '三', '四', '五']
        else:
            grades = list(set(grades))
            order = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5}
            grades.sort(key=lambda x: order.get(x, 99))

        return JsonResponse({'success': True, 'grades': grades})
    except Exception as e:
        return JsonResponse({'error': str(e), 'grades': ['一', '二', '三', '四', '五']}, status=200)


# =========================
# CourseReview 專屬「按讚」API（使用 ReviewLike 表）
# =========================
from django.views.decorators.http import require_POST

@csrf_exempt
@login_required
@require_POST
def toggle_review_like(request, review_id):
    if request.method != 'POST':
        return JsonResponse({'error': '僅支援 POST 請求'}, status=405)

    legacy_uid = get_legacy_user_id(request)
    if legacy_uid is None:
        return JsonResponse({'error': '無法找到對應的使用者'}, status=403)

    review = get_object_or_404(CourseReview, id=review_id)
    legacy_user = get_object_or_404(LegacyUser, user_id=legacy_uid)

    like = ReviewLike.objects.filter(review=review, user=legacy_user).first()

    if like:
        like.delete()
        is_liked = False
    else:
        ReviewLike.objects.create(review=review, user=legacy_user)
        is_liked = True

    return JsonResponse({
        'success': True,
        'is_liked': is_liked,
        'likes_count': review.review_likes.count(),
        'review_id': review.id,
    })

# ===== AI Comment Optimization =====
from django.views.decorators.http import require_POST
from django.conf import settings
import re, openai

def _clean_input(text: str) -> str:
    text = re.sub(r"\r\n?", "\n", text or "")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()

SYSTEM_PROMPT = (
    "你是一位課程評論的文字編輯器。請將使用者原始評論改寫為可直接提交的中性、具參考價值的內容："
    "1) 維持使用者觀點，避免命令口吻與對話式語氣；"
    "2) 去除粗話、人身攻擊與過度情緒用語；"
    "3) 盡量具體（內容、節奏、作業/評分、互動、資源等面向）；"
    "4) 允許提出期望或改進方向，但以描述式語句表達（如「希望能提供更多實作範例」），"
    "5) 僅輸出最終評論文本，不要加入任何標題、註解、道歉或教學性提示。"
    "6) 繁體中文輸出。"
)

@csrf_exempt
@require_POST
def optimize_comment_ai(request):
    api_key    = settings.AZURE_OPENAI_API_KEY
    endpoint   = settings.AZURE_OPENAI_ENDPOINT
    api_ver    = settings.AZURE_OPENAI_API_VERSION
    deployment = settings.AZURE_OPENAI_DEPLOYMENT_NAME

    if not (api_key and endpoint and deployment):
        return JsonResponse({"error": "Azure OpenAI not configured"}, status=503)

    raw = _clean_input(request.POST.get("content", ""))
    if not raw:
        return JsonResponse({"result": ""})

    short = raw.replace("\n", "").strip()
    if len(short) < 6:
        return JsonResponse({
            "result": "（內容過短）目前的評論資訊不足，無法進行語意優化與送出。"
                     "請補充具體細節（例如：單元/作業類型/上課節奏/評分標準/時間點等），再按「轉換」。"
        })

    try:
        client = openai.AzureOpenAI(
            api_key=api_key,
            api_version=api_ver,
            azure_endpoint=endpoint,
        )

        msg_user = (
            "請將以下評論改寫為可直接提交的中性評論文本，避免對話式與流程說明：\n\n"
            f"{raw}\n\n"
            "注意：只輸出改寫後的最終評論內容；不要出現道歉、無法處理、需要更多資訊等字樣。"
        )

        resp = client.chat.completions.create(
            model=deployment,
            temperature=0.2,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": msg_user},
            ],
            max_tokens=400,
        )

        text = (resp.choices[0].message.content or "").strip()

        blacklist = ["無法", "需要更多資訊", "不便", "抱歉", "無法進行有效", "建議您提供"]
        if any(k in text for k in blacklist) or len(text) < 6:
            text = "課程整體品質仍有進步空間；期望在教學重點與作業說明上更清楚，並提供更多實作示例以提升理解。"

        return JsonResponse({"result": text})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
# ===== end AI Comment Optimization =====

#############################課程評論區##############################


# web_app/views.py
import json
from django.shortcuts import render
from django.http import JsonResponse, HttpResponseNotAllowed
from django.views.decorators.csrf import csrf_exempt
from .mongo import (
    create_conversation,
    add_message,
    get_conversations,
    get_messages
)
from .views_rag import ask_question

def get_user_id(request):
    if request.user.is_authenticated:
        return str(request.user.id)
    return "guest"

def chat_page(request):
    # 首次載入時不帶任何對話，前端會自動建立
    return render(request, "ask.html")

@csrf_exempt
def api_conversations(request):
    user_id = get_user_id(request)
    if request.method == "GET":
        convos = get_conversations(user_id)
        return JsonResponse({"conversations": convos})
    if request.method == "POST":
        data = json.loads(request.body)
        title = data.get("title", "新對話")
        convo_id = create_conversation(user_id, title)
        return JsonResponse({"id": convo_id, "title": title})
    return HttpResponseNotAllowed(["GET", "POST"])

@csrf_exempt
def api_messages(request, convo_id):
    if request.method == "GET":
        msgs = get_messages(convo_id)
        # format timestamp
        out = []
        for m in msgs:
            out.append({
                "question": m["question"],
                "answer": m["answer"],
                "timestamp": m["timestamp"].strftime("%Y-%m-%d %H:%M:%S"),
                "sources": m.get("sources", [])
            })
        return JsonResponse({"messages": out})
    return HttpResponseNotAllowed(["GET"])

@csrf_exempt
def api_ask(request):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])
    
    user_id = get_user_id(request)
    data = json.loads(request.body)
    question = data.get("question", "").strip()
    convo_id = data.get("conversation_id")
    
    if not question or not convo_id:
        return JsonResponse({"error": "缺少 question 或 conversation_id"}, status=400)

    # 驗證對話是否屬於當前用戶（安全性檢查）
    from .mongo import get_conversation_by_id
    conversation = get_conversation_by_id(convo_id)
    if not conversation or conversation.get("user_id") != user_id:
        return JsonResponse({"error": "無權限存取此對話"}, status=403)

    conversation_history = get_messages(convo_id)
    result = ask_question(question, conversation_history)
    answer = result["answer"]
    add_message(convo_id, question, answer, result.get("sources", []))

    return JsonResponse({
        "answer": answer,
        "has_sources": result["has_sources"],
        "sources": result["sources"]
    })

@csrf_exempt
def upload_files(request):
    """統一處理 PDF 和 ZIP 檔案上傳"""
    if request.method == "POST":
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return JsonResponse({"error": "請選擇檔案"}, status=400)

        # 檢查檔案類型
        file_name = uploaded_file.name.lower()
        if not (file_name.endswith(".pdf") or file_name.endswith(".zip")):
            return JsonResponse({"error": "只支援 PDF 和 ZIP 檔案"}, status=400)

        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            upload_dir = os.path.abspath(os.path.join(current_dir, "..", "uploaded_files"))
            os.makedirs(upload_dir, exist_ok=True)

            if file_name.endswith(".pdf"):
                # 處理 PDF 檔案
                pdf_path = os.path.join(upload_dir, uploaded_file.name)
                with open(pdf_path, "wb") as f:
                    for chunk in uploaded_file.chunks():
                        f.write(chunk)
                message = f"✅ PDF 檔案 '{uploaded_file.name}' 上傳成功"
                
            elif file_name.endswith(".zip"):
                # 處理 ZIP 檔案
                temp_zip_path = os.path.join(upload_dir, "temp_upload.zip")
                
                # 保存上傳的 ZIP 檔案
                with open(temp_zip_path, "wb") as f:
                    for chunk in uploaded_file.chunks():
                        f.write(chunk)

                # 解壓縮 ZIP 檔案中的 PDF 檔案
                extracted_count = 0
                with zipfile.ZipFile(temp_zip_path, "r") as zip_ref:
                    for member in zip_ref.infolist():
                        if member.filename.lower().endswith(".pdf") and not member.is_dir():
                            filename = os.path.basename(member.filename)
                            if filename:  # 確保檔名不為空
                                data = zip_ref.read(member.filename)
                                pdf_path = os.path.join(upload_dir, filename)
                                with open(pdf_path, "wb") as out_file:
                                    out_file.write(data)
                                extracted_count += 1

                # 刪除臨時 ZIP 檔案
                os.remove(temp_zip_path)
                
                if extracted_count == 0:
                    return JsonResponse({"error": "ZIP 檔案中沒有找到 PDF 檔案"}, status=400)
                
                message = f"✅ ZIP 檔案解壓縮完成，提取了 {extracted_count} 個 PDF 檔案"

        except zipfile.BadZipFile:
            return JsonResponse({"error": "ZIP 檔案格式錯誤或損壞"}, status=400)
        except Exception as e:
            return JsonResponse({"error": f"檔案處理失敗：{str(e)}"}, status=500)

        # 重新建立向量資料庫
        try:
            docs = load_pdf_documents()
            if not docs:
                return JsonResponse({"error": "未找到可處理的 PDF 檔案"}, status=400)
            
            splits = split_documents(docs)
            create_vector_store(splits)
            
            return JsonResponse({
                "message": message + "，向量資料庫已更新",
                "status": "success"
            })
            
        except Exception as e:
            return JsonResponse({
                "error": f"建立向量資料庫失敗：{str(e)}",
                "status": "error"
            }, status=500)

    return JsonResponse({"error": "僅支援 POST 請求"}, status=405)

# 保留原來的 upload_zip 函數以向後相容（可選）
@csrf_exempt
def upload_zip(request):
    """向後相容的 ZIP 上傳函數，重導向到新的統一上傳函數"""
    if request.method == "POST":
        # 將 zip_file 重新命名為 file 以符合新函數的參數名稱
        if 'zip_file' in request.FILES:
            request.FILES['file'] = request.FILES['zip_file']
        return upload_files(request)
    return JsonResponse({"error": "僅支援 POST 請求"}, status=405)

# web_app/views.py
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponseNotAllowed
from .mongo import delete_conversation, update_conversation_title

@csrf_exempt
def api_conversation_detail(request, convo_id):
    if request.method == "PATCH":
        data = json.loads(request.body)
        new_title = data.get("title")
        if not new_title:
            return JsonResponse({"error": "缺少 title"}, status=400)
        update_conversation_title(convo_id, new_title)
        return JsonResponse({"message": "更新成功"})
    elif request.method == "DELETE":
        delete_conversation(convo_id)
        return JsonResponse({"message": "刪除成功"})
    else:
        return HttpResponseNotAllowed(["PATCH", "DELETE"])
    
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
import openpyxl
from io import BytesIO
from .mongo import get_messages

@csrf_exempt
def api_export_conversation(request, convo_id):
    if request.method != "GET":
        return HttpResponse(status=405)
    user_id = get_user_id(request)
    msgs = get_messages(convo_id)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "對話紀錄"
    ws.append(["問題", "回答"])
    for m in msgs:
        ws.append([m["question"], m["answer"]])
    out = BytesIO()
    wb.save(out)
    out.seek(0)
    resp = HttpResponse(
        out.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    resp["Content-Disposition"] = f'attachment; filename="conversation_{convo_id}.xlsx"'
    return resp

from django.http import FileResponse
from django.shortcuts import get_object_or_404
import mimetypes

def view_pdf(request, filename):
    """顯示 PDF 檔案"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    pdf_dir = os.path.join(current_dir, "..", "uploaded_files")
    pdf_path = os.path.join(pdf_dir, filename)
    
    if not os.path.exists(pdf_path) or not filename.endswith('.pdf'):
        return JsonResponse({"error": "檔案不存在"}, status=404)
    
    return FileResponse(
        open(pdf_path, 'rb'),
        content_type='application/pdf',
        filename=filename
    )

import os
import mimetypes
from django.http import FileResponse, JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.clickjacking import xframe_options_exempt
from django.utils.encoding import smart_str
from urllib.parse import unquote
import logging

logger = logging.getLogger(__name__)

@csrf_exempt
@xframe_options_exempt  # 允許在 iframe 中顯示
def view_pdf(request, filename):
    """顯示 PDF 檔案"""
    try:
        # URL 解碼檔案名稱
        filename = unquote(filename)
        
        # 取得當前檔案的目錄
        current_dir = os.path.dirname(os.path.abspath(__file__))
        pdf_dir = os.path.abspath(os.path.join(current_dir, "..", "uploaded_files"))
        
        # 安全檢查：防止路徑遍歷攻擊
        filename = os.path.basename(filename)
        pdf_path = os.path.join(pdf_dir, filename)
        
        logger.info(f"📁 PDF 目錄: {pdf_dir}")
        logger.info(f"📄 請求檔案: {filename}")
        logger.info(f"🔍 完整路徑: {pdf_path}")
        logger.info(f"✅ 檔案存在: {os.path.exists(pdf_path)}")
        
        # 檢查檔案是否存在
        if not os.path.exists(pdf_path):
            logger.error(f"❌ 檔案不存在: {pdf_path}")
            return JsonResponse({"error": "檔案不存在"}, status=404)
        
        # 檢查是否為 PDF 檔案
        if not filename.lower().endswith('.pdf'):
            logger.error(f"❌ 非 PDF 檔案: {filename}")
            return JsonResponse({"error": "不是有效的 PDF 檔案"}, status=400)
        
        # 檢查檔案是否可讀
        if not os.access(pdf_path, os.R_OK):
            logger.error(f"❌ 檔案無法讀取: {pdf_path}")
            return JsonResponse({"error": "檔案無法讀取"}, status=403)
        
        # 取得檔案大小
        file_size = os.path.getsize(pdf_path)
        logger.info(f"📊 檔案大小: {file_size} bytes")
        
        try:
            # 開啟檔案並創建回應
            response = FileResponse(
                open(pdf_path, 'rb'),
                content_type='application/pdf',
                as_attachment=False,  # 在瀏覽器中直接顯示
                filename=smart_str(filename)
            )
            
            # 設定重要的 HTTP 標頭
            response['Content-Length'] = str(file_size)
            response['Content-Disposition'] = f'inline; filename="{smart_str(filename)}"'
            
            # 設定 CORS 標頭（如果需要）
            response['Access-Control-Allow-Origin'] = '*'
            response['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            
            # 設定快取標頭
            response['Cache-Control'] = 'public, max-age=3600'  # 快取1小時
            
            # 設定 X-Frame-Options 允許在 iframe 中顯示
            response['X-Frame-Options'] = 'SAMEORIGIN'
            
            # 設定 Content-Security-Policy
            response['Content-Security-Policy'] = "frame-ancestors 'self'"
            
            logger.info(f"✅ PDF 檔案成功返回: {filename}")
            return response
            
        except Exception as e:
            logger.error(f"❌ 開啟檔案失敗: {e}")
            return JsonResponse({"error": f"開啟檔案失敗: {str(e)}"}, status=500)
            
    except Exception as e:
        logger.error(f"❌ view_pdf 函數發生錯誤: {e}")
        return JsonResponse({"error": f"伺服器錯誤: {str(e)}"}, status=500)

@csrf_exempt
@xframe_options_exempt
def view_pdf_streaming(request, filename):
    """使用 streaming 方式顯示 PDF 檔案"""
    try:
        # URL 解碼檔案名稱
        filename = unquote(filename)
        
        current_dir = os.path.dirname(os.path.abspath(__file__))
        pdf_dir = os.path.abspath(os.path.join(current_dir, "..", "uploaded_files"))
        filename = os.path.basename(filename)
        pdf_path = os.path.join(pdf_dir, filename)
        
        if not os.path.exists(pdf_path) or not filename.lower().endswith('.pdf'):
            return JsonResponse({"error": "檔案不存在或不是PDF檔案"}, status=404)
        
        def file_iterator(file_path, chunk_size=8192):
            with open(file_path, 'rb') as f:
                while True:
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    yield chunk
        
        response = HttpResponse(
            file_iterator(pdf_path),
            content_type='application/pdf'
        )
        
        # 設定標頭
        response['Content-Disposition'] = f'inline; filename="{smart_str(filename)}"'
        response['Content-Length'] = str(os.path.getsize(pdf_path))
        response['X-Frame-Options'] = 'SAMEORIGIN'
        response['Content-Security-Policy'] = "frame-ancestors 'self'"
        response['Cache-Control'] = 'public, max-age=3600'
        
        return response
        
    except Exception as e:
        logger.error(f"❌ streaming PDF 錯誤: {e}")
        return JsonResponse({"error": f"伺服器錯誤: {str(e)}"}, status=500)

# 如果需要處理 OPTIONS 請求（CORS 預檢）
@csrf_exempt
def pdf_options(request, filename):
    """處理 PDF 檔案的 OPTIONS 請求"""
    if request.method == 'OPTIONS':
        response = HttpResponse()
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'  # 24小時
        return response
    else:
        return view_pdf(request, filename)
    # web_app/views.py（活動相關部分）

# activities/views.py  或 你目前放活動 view 的檔案

from django.shortcuts import render, get_object_or_404, redirect
from django.db import models
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Count, Q, F, Case, When, IntegerField, Prefetch, Avg
from django.utils import timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from datetime import date, datetime, timedelta
import json  # ← 你有用到 json.loads，要記得匯入

from .models import GroupActivity, ActivityParticipant, ActivityComment
from .forms import ActivityForm

# -----------------------
# 列出活動
# -----------------------
def activity_list(request):
    activity_type = request.GET.get('type', '')
    location_type = request.GET.get('location_type', '')
    time_filter   = request.GET.get('time', '')
    search_query  = request.GET.get('search', '')
    
    activities = (
        GroupActivity.objects
        .prefetch_related(
            Prefetch(
                'participants',
                queryset=ActivityParticipant.objects.filter(status='joined').select_related('user'),
                to_attr='joined_participants'
            )
        )
        .annotate(
            participants_count=Count('participants', filter=Q(participants__status='joined'), distinct=True)
        )
        .annotate(total_count=F('participants_count') + 1)  # + 發起者
    )
    
    if activity_type:
        activities = activities.filter(type=activity_type)
    if location_type:
        activities = activities.filter(location_type=location_type)
        
    today = date.today()
    if time_filter == 'today':
        activities = activities.filter(date=today)
    elif time_filter == 'this_week':
        end_week = today + timedelta(days=7 - today.weekday())
        activities = activities.filter(date__range=[today, end_week])
    elif time_filter == 'this_month':
        activities = activities.filter(date__year=today.year, date__month=today.month)
    
    if search_query:
        activities = activities.filter(
            Q(title__icontains=search_query) |
            Q(description__icontains=search_query) |
            Q(location__icontains=search_query)
        )
    
    # 未過期優先，其餘依時間排序
    activities = activities.order_by(
        Case(When(deadline__lt=timezone.localdate(), then=1), default=0, output_field=IntegerField()),
        'date', 'time', 'deadline'
    )
    
    # 過濾掉發起者本人的參與列表（前端顯示用）
    for a in activities:
        jp = getattr(a, 'joined_participants', []) or []
        a.cleaned_participants = [p for p in jp if p.user_id != a.user_id]

    # 只有登入用戶才需要取得參與/建立狀態
    joined_ids, created_ids = [], []
    if request.user.is_authenticated:
        joined_ids = list(
            ActivityParticipant.objects
            .filter(user=request.user, status='joined')
            .values_list('activity_id', flat=True)
        )
        created_ids = list(
            GroupActivity.objects
            .filter(user=request.user)
            .values_list('id', flat=True)
        )

    return render(request, 'join.html', {
        'activities': activities,
        'joined_ids': joined_ids,
        'created_ids': created_ids,
        'current_type': activity_type,
        'current_location_type': location_type,
        'current_time': time_filter,
        'current_search': search_query,
    })

# -----------------------
# 活動詳情
# -----------------------
def activity_detail(request, pk):
    a = get_object_or_404(GroupActivity, pk=pk)

    participants = (
        ActivityParticipant.objects
        .filter(activity=a, status='joined')
        .select_related('user')
    )
    participants_count   = participants.count()
    total_participants   = participants_count + 1  # + 發起者
    remaining_slots      = max(0, (a.max_participants or 0) - total_participants)

    # 只有登入用戶才檢查參與狀態
    joined, is_creator = False, False
    if request.user.is_authenticated:
        joined     = ActivityParticipant.objects.filter(activity=a, user=request.user, status='joined').exists()
        is_creator = (request.user == a.user)

    comments = (
        ActivityComment.objects
        .filter(activity=a, parent=None)
        .select_related('user')
        .prefetch_related('replies__user', 'likes')
        .order_by('-created_at')
    )

    related_activities = list(
        GroupActivity.objects
        .filter(type=a.type, deadline__gte=timezone.localdate())
        .exclude(id=a.id)
        .annotate(participants_count=Count('participants', filter=Q(participants__status='joined')))
        .order_by('-created_at')[:3]
    )
    if len(related_activities) < 3:
        other_activities = list(
            GroupActivity.objects
            .filter(deadline__gte=timezone.localdate())
            .exclude(type=a.type)
            .exclude(id=a.id)
            .annotate(participants_count=Count('participants', filter=Q(participants__status='joined')))
            .order_by('-created_at')[: (3 - len(related_activities))]
        )
        related_activities.extend(other_activities)

    return render(request, 'join_detail.html', {
        'a': a,
        'participants': participants,
        'total_participants': total_participants,
        'remaining_slots': remaining_slots,
        'joined': joined,
        'is_creator': is_creator,
        'comments': comments,
        'related_activities': related_activities,
    })

# -----------------------
# 加入活動
# -----------------------
@login_required
def join_activity(request, pk):
    if request.method != 'POST':
        return redirect('activity_detail', pk=pk)
    
    a = get_object_or_404(GroupActivity, pk=pk)
    current_joined_count = ActivityParticipant.objects.filter(activity_id=a.id, status='joined').count()

    if a.is_deadline_passed:
        messages.error(request, '已超過報名截止時間')
        return redirect('activity_detail', pk=pk)
    if current_joined_count >= (a.max_participants or 0):
        messages.error(request, '本活動已額滿')
        return redirect('activity_detail', pk=pk)

    # 使用 auth_user（request.user）
    existing = ActivityParticipant.objects.filter(activity_id=a.id, user_id=request.user.id).first()
    if existing and existing.status == 'joined':
        messages.info(request, '您已經報名此活動')
        return redirect('activity_detail', pk=pk)

    ActivityParticipant.objects.update_or_create(
        activity_id=a.id,
        user_id=request.user.id,
        defaults={'status': 'joined', 'joined_at': timezone.now(), 'updated_at': timezone.now()}
    )
    updated_joined_count = ActivityParticipant.objects.filter(activity_id=a.id, status='joined').count()
    messages.success(request, '報名成功！')

    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({'ok': True, 'participants': updated_joined_count, 'message': '報名成功！'})
    
    return redirect('activity_detail', pk=pk)

# -----------------------
# 取消活動
# -----------------------
@login_required
def cancel_activity(request, pk):
    if request.method != 'POST':
        return redirect('activity_detail', pk=pk)
    
    a = get_object_or_404(GroupActivity, pk=pk)
    participant = ActivityParticipant.objects.filter(activity_id=a.id, user_id=request.user.id, status='joined').first()
    if not participant:
        messages.warning(request, '您尚未報名此活動')
        return redirect('activity_detail', pk=pk)

    participant.status = 'cancelled'
    participant.updated_at = timezone.now()
    participant.save()
    updated_joined_count = ActivityParticipant.objects.filter(activity_id=a.id, status='joined').count()
    messages.info(request, '已取消參加')

    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({'ok': True, 'participants': updated_joined_count, 'message': '已取消參加'})
    
    return redirect('activity_detail', pk=pk)

# -----------------------
# 建立活動
# -----------------------
@csrf_exempt
@login_required
def create_activity(request):
    if request.method == 'GET':
        form = ActivityForm()
        return render(request, 'join_create.html', {'form': form})
    
    elif request.method == 'POST':
        form = ActivityForm(request.POST, request.FILES)
        if form.is_valid():
            try:
                activity = form.save(commit=False)
                activity.user = request.user  # ← auth_user
                activity.save()
                if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                    return JsonResponse({'ok': True, 'message': '活動創建成功！', 'activity_id': activity.id})
                else:
                    messages.success(request, '活動創建成功！')
                    return redirect('activity_list')
            except Exception as e:
                if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                    return JsonResponse({'ok': False, 'errors': {'general': [f'創建活動時發生錯誤: {str(e)}']}})
                else:
                    messages.error(request, f'創建活動時發生錯誤: {str(e)}')
        else:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'ok': False, 'errors': form.errors})
            else:
                messages.error(request, '表單填寫有誤，請檢查後重試')
        return render(request, 'join_create.html', {'form': form})
    
    return JsonResponse({'ok': False, 'errors': {'general': ['僅接受 GET 和 POST 請求']}})

# -----------------------
# 用戶參與的活動列表
# -----------------------
@login_required
def my_activities(request):
    joined_activities = (
        GroupActivity.objects
        .filter(participants__user=request.user, participants__status='joined')
        .annotate(participants_count=Count('participants', filter=Q(participants__status='joined'), distinct=True))
        .order_by('date', 'time')
    )
    created_activities = (
        GroupActivity.objects
        .filter(user=request.user)
        .annotate(participants_count=Count('participants', filter=Q(participants__status='joined'), distinct=True))
        .order_by('date', 'time')
    )
    return render(request, 'my_activities.html', {
        'joined_activities': joined_activities,
        'created_activities': created_activities
    })

# -----------------------
# 活動參與者列表（主辦者才能看）
# -----------------------
@login_required
def activity_participants(request, pk):
    activity = get_object_or_404(GroupActivity, pk=pk)
    if request.user != activity.user:
        messages.error(request, '您沒有權限查看此活動的參與者信息')
        return redirect('activity_detail', pk=pk)
    
    participants = (
        ActivityParticipant.objects
        .filter(activity=activity, status='joined')
        .select_related('user')
        .order_by('joined_at')
    )
    return render(request, 'activity_participants.html', {
        'activity': activity,
        'participants': participants
    })

# -----------------------
# 新增活動留言（不是課程評論）
# -----------------------
@csrf_exempt
@login_required
def add_comment(request, activity_id):
    """
    AJAX：新增一則活動留言（支援 parent_id 做子留言）
    """
    if request.method != 'POST':
        return JsonResponse({'error': '僅支援 POST 請求'}, status=405)

    a = get_object_or_404(GroupActivity, id=activity_id)

    try:
        data = json.loads(request.body or "{}")
    except Exception:
        return JsonResponse({'error': '無效的請求內容'}, status=400)

    content   = (data.get('content') or '').strip()
    parent_id = data.get('parent_id')

    if not content:
        return JsonResponse({'error': '留言內容不能為空'}, status=400)

    parent = None
    if parent_id:
        parent = get_object_or_404(ActivityComment, id=parent_id, activity=a)

    comment = ActivityComment.objects.create(
        activity=a,
        user=request.user,   # ← auth_user
        content=content,
        parent=parent
    )

    # 嘗試取 Google 頭像（若你有 social_auth）
    user_avatar = '/static/image/avatar24-01.jpg'
    try:
        social = getattr(request.user, 'social_auth', None)
        if social:
            sa = social.filter(provider__icontains='google').first()
            if sa and isinstance(sa.extra_data, dict):
                user_avatar = sa.extra_data.get('picture') or user_avatar
    except Exception:
        pass

    display_name = (getattr(request.user, 'last_name', '') or '') + (getattr(request.user, 'first_name', '') or '')
    if not display_name:
        display_name = getattr(request.user, 'username', '') or '使用者'

    return JsonResponse({
        'success': True,
        'comment': {
            'id': comment.id,
            'content': comment.content,
            'user_name': display_name,
            'user_avatar': user_avatar,
            'created_at': comment.created_at.strftime('%Y-%m-%d %H:%M'),
            'likes_count': 0,
            'is_liked': False
        }
    })

# -----------------------
# 切換按讚（活動留言）
# -----------------------
@csrf_exempt
@login_required
def toggle_like(request, comment_id):
    if request.method != 'POST':
        return JsonResponse({'error': '僅支援 POST 請求'}, status=405)

    comment = get_object_or_404(ActivityComment, id=comment_id)
        
    if request.user in comment.likes.all():
        comment.likes.remove(request.user)
        is_liked = False
    else:
        comment.likes.add(request.user)
        is_liked = True
    
    return JsonResponse({
        'success': True,
        'is_liked': is_liked,
        'likes_count': comment.likes.count()
    })