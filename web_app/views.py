# web_app\views.py

import os
import json
import zipfile
import re
import logging
import base64
import mimetypes
import openpyxl
from datetime import date, timedelta
from io import BytesIO
from urllib.parse import unquote
from .system import ask_question
# Django imports
from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseNotAllowed, HttpResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_http_methods, require_GET, require_POST
from django.views.decorators.clickjacking import xframe_options_exempt
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model
from django.contrib import messages
from django.db import models, connection, transaction, IntegrityError
from django.db.models import Avg, Count, Max, Q, Subquery, OuterRef, F, Value, BooleanField, Case, When, Prefetch, IntegerField
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.encoding import smart_str
from django.urls import reverse, NoReverseMatch
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.templatetags.static import static
from django.conf import settings

# views.py (module import 區)
from django.db.models import Q, F
from django.db.models import Count as DJCount
from django.db.models import Value as DJValue
from django.db.models import IntegerField as DJIntegerField
from django.db.models.functions import Coalesce
import logging
logger = logging.getLogger(__name__)

from social_django.models import UserSocialAuth
import openai

# Local imports
# from .views_rag import ask_question, create_vector_store, load_pdf_documents, split_documents
try:
    from .views_rag import ask_question, create_vector_store, load_pdf_documents, split_documents
    RAG_AVAILABLE = True
except Exception as e:
    logger.warning(f"RAG功能不可用: {e}")
    RAG_AVAILABLE = False
    # 創建假的函數避免錯誤
    def ask_question(question, history=None):
        return {"answer": "抱歉，校規查詢功能暫時不可用，請稍後再試。", "sources": []}
from .models import (
    GroupActivity, ActivityParticipant, ActivityComment, Book2, Department, 
    AcademicGrade, Category, Status, Academic, User, Academica, Departmentd, 
    AcadeGrade, AcadeDepart, CourseReview, Course, Departmentd, Academica, CourseReview, 
    ReviewLike, User as LegacyUser
)
from .forms import Book2Form, ActivityForm
from .utils.content_filter import contains_banned_content, BANNED_WORDS, debug_banned_content
from .mongo import (
    create_conversation, add_message, get_conversations, get_messages,
    delete_conversation, update_conversation_title, get_conversation_by_id
)

# Setup
AuthUser = get_user_model()
logger = logging.getLogger(__name__)

def get_user_display_name(user):
    """
    獲取用戶顯示名稱：優先使用暱稱，如果暱稱為空則使用真實姓名
    """
    if not user or not user.is_authenticated:
        return "訪客"
    
    # 嘗試從自定義 User 表獲取暱稱和姓名
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT anonymous, name
                FROM `User`
                WHERE mail = %s
            """, [user.email])
            row = cursor.fetchone()
            if row:
                anonymous, name = row
                # 優先使用暱稱（anonymous 欄位），如果為空則使用真實姓名
                if anonymous and anonymous.strip():
                    return anonymous.strip()
                elif name and name.strip():
                    return name.strip()
    except Exception as e:
        logger.warning(f"無法從自定義 User 表獲取用戶資料: {e}")
    
    # 如果自定義表沒有資料，則使用 Django 用戶的姓名
    if user.last_name and user.first_name:
        return f"{user.last_name}{user.first_name}"
    elif user.first_name:
        return user.first_name
    elif user.username:
        return user.username
    else:
        return "使用者"

def ttt(request):
    return render(request, 'ttt.html')

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
        return redirect('login')
    # 從自定義 User 表獲取用戶資料
    user_data = None
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT name, student_id, mail, course, grade, academic, role, phone, LINE_ID, anonymous
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
        social = request.user.social_auth.filter(provider='google-oauth2').first()
        if social:
            google_picture = social.extra_data.get('picture')
    except Exception as e:
        print(f"Error getting social auth data: {e}")

    # 讀取「我已參加的活動」與「我發起的活動」
    joined_activities = []
    created_activities = []
    try:
        from django.db.models import Count, Q
        from django.utils import timezone

        now_date = timezone.localdate()
        now_time = timezone.localtime().time()
        upcoming_q = Q(date__gt=now_date) | (Q(date=now_date) & Q(time__gte=now_time))

        joined_activities = (
            GroupActivity.objects
            .filter(participants__user=request.user, participants__status='joined')
            .filter(upcoming_q)
            .annotate(participants_count=Count('participants', filter=Q(participants__status='joined'), distinct=True))
            .order_by('date', 'time')
        )
        created_activities = (
            GroupActivity.objects
            .filter(user=request.user)
            .filter(upcoming_q)
            .annotate(participants_count=Count('participants', filter=Q(participants__status='joined'), distinct=True))
            .order_by('date', 'time')
        )
    except Exception as e:
        print(f"Error fetching joined activities: {e}")

    # 準備行事曆事件（顯示所有我發起/參加過的活動，包含已過去）
    calendar_events = []
    try:
        def to_event(a):
            return {
                "date": getattr(a, 'date', None),
                "title": getattr(a, 'title', ''),
                "id": getattr(a, 'pk', None),
                "created_at": getattr(a, 'created_at', None),
                "time": getattr(a, 'time', None),
            }
        all_created = GroupActivity.objects.filter(user=request.user)
        all_joined = GroupActivity.objects.filter(
            participants__user=request.user,
            participants__status='joined'
        )
        seen = set()
        for a in list(all_created) + list(all_joined):
            if not getattr(a, 'date', None):
                continue
            if a.pk in seen:
                continue
            seen.add(a.pk)
            calendar_events.append(to_event(a))
    except Exception as e:
        print(f"Error building calendar events: {e}")

    # === 以 joined_activities 組成票券（重疊堆疊，越快到的在最上） ===
    tickets = []
    created_flags = []
    try:
        from .models import ActivityParticipant
        import calendar
        from datetime import date as _date, time as _time

        # 疊法參數（可微調）
        BASE_LEFT = 20     # 起始 X
        BASE_TOP  = 10     # 起始 Y
        STEP_X    = 10     # 每張向右偏移（越小越緊）
        STEP_Y    = 18     # 每張向下偏移（越小越緊）
        TICKET_H  = 200    # 票券高度，對應 .cticket

        # 先把活動轉成 list，依 (date, time) 升冪；None 視為最大（排最後）
        def _dt_key(a):
            ad = getattr(a, 'date', None)
            at = getattr(a, 'time', None)
            if ad is None:
                return (_date.max, _time.max)
            if at is None:
                at = _time.max
            return (ad, at)

        ja = list(joined_activities)
        ja.sort(key=_dt_key)  # 越快到的在前面

        total = len(ja)

        for i, a in enumerate(ja, start=1):
            host = (
                getattr(a, 'host_name', None)
                or getattr(a, 'creator_name', None)
                or getattr(getattr(a, 'user', None), 'username', '主辦單位')
            )

            # 人數（含發起者）
            participants_qs = ActivityParticipant.objects.filter(activity=a, status='joined').order_by('id')
            participants_count  = participants_qs.count()
            total_participants  = participants_count + 1
            max_participants    = getattr(a, 'max_participants', None) or getattr(a, 'capacity', 0)
            remaining_slots     = max(0, (max_participants or 0) - total_participants)

            # 使用者順序 → 票號
            user_position = None
            for idx, p in enumerate(participants_qs, start=1):
                if p.user_id == request.user.pk:
                    user_position = idx
                    break
            if user_position is None and a.user_id == request.user.pk:
                user_position = 0

            ticket_number = f"NO:{a.pk:03d}{user_position:03d}" if user_position is not None else f"NO:{a.pk:06d}"

            # 顯示欄位
            if getattr(a, 'date', None):
                month_abbr  = (calendar.month_abbr[a.date.month] or '').capitalize() + '.'
                weekday_zh  = ['星期一','星期二','星期三','星期四','星期五','星期六','星期日'][a.date.weekday()]
                month_num   = a.date.strftime('%m')
                date_num    = a.date.strftime('%d')
                time_txt    = a.time.strftime('%H:%M') if getattr(a, 'time', None) else '—'
            else:
                month_abbr, weekday_zh, month_num, date_num, time_txt = '—','—','—','—','—'

            # 位移與層級：越早越上（top 較小、z 較大），重疊更緊密
            left_px = BASE_LEFT + (i - 1) * STEP_X
            top_px  = BASE_TOP  + (i - 1) * STEP_Y
            z_idx   = 100 - i               # 保持你的原規則：i=1 → 最大

            # 輕微角度變化，避免完全重疊死板
            rotate = (-2 if i % 2 == 0 else 2)

            tickets.append({
                "id": a.pk,
                "title": getattr(a, 'title', ''),
                "subtitle": (getattr(a, 'category', None) or 'CAMPUS EVENT').upper(),
                "weekday": weekday_zh,
                "month": month_num,
                "date": date_num,
                "time": time_txt,
                "month_abbr": month_abbr,

                "number": ticket_number,
                "location": getattr(a, 'location', '校園活動場地'),
                "host": host,
                "icon": getattr(a, 'icon', 'fa-solid fa-ticket'),
                "desc": getattr(a, 'description', '活動說明稍後公布。'),

                "total_participants": total_participants,
                "max_participants": max_participants,
                "remaining_slots": remaining_slots,

                "left_px": left_px,
                "top_px":  top_px,
                "z_index": z_idx,
                "rotate_deg": rotate,
            })

        # 動態容器高度：最後一張的 top + 高度 + 底部留白
        tickets_container_h = (BASE_TOP + (total - 1) * STEP_Y + TICKET_H + 16) if total else 240

    except Exception as e:
        print(f"Error building tickets: {e}")

    # === 我發起的活動：旗子資料 ===
    created_flags = []
    try:
        from .models import ActivityParticipant
        for a in created_activities:
            participants_qs = ActivityParticipant.objects.filter(activity=a, status='joined')
            participants_count = participants_qs.count()
            total_participants = participants_count + 1
            max_participants = getattr(a, 'max_participants', None) or getattr(a, 'capacity', 0)

            if getattr(a, 'date', None):
                weekday_zh = ['星期一','星期二','星期三','星期四','星期五','星期六','星期日'][a.date.weekday()]
                month_num  = a.date.strftime('%m')
                month_abbr  = (calendar.month_abbr[a.date.month] or '').capitalize()
                date_num   = a.date.strftime('%d')
            else:
                weekday_zh, month_num, date_num = '—','—','—'

            created_flags.append({
                "id": a.pk,
                "title": getattr(a, 'title', ''),
                "desc": getattr(a, 'description', '活動說明稍後公布。'),
                "location": getattr(a, 'location', '校園活動場地'),
                "weekday": weekday_zh,
                "month_abbr": month_abbr,
                "month": month_num,
                "date": date_num,
                "time": a.time.strftime('%H:%M') if getattr(a, 'time', None) else '—',
                "total_participants": total_participants,
                "max_participants": max_participants,
                "tone": (getattr(a, 'category', '') or '').lower(),
            })
    except Exception as e:
        print(f"Error building created_flags: {e}")

    # === 我的書櫃（直接使用 Book2 模型） ===
    books = []
    try:
        from .models import Book2
        
        if request.user.is_authenticated:
            # 直接查詢當前用戶的書籍（包含所有狀態）
            user_books = Book2.objects.filter(seller=request.user).order_by('-book_id')
            
            for book in user_books:
                # 獲取書籍狀態
                status_name = ''
                try:
                    if book.status:
                        status_name = str(book.status)
                except Exception:
                    pass
                
                books.append({
                    "id": book.book_id,
                    "title": book.title or '',
                    "author": book.author or '',
                    "publisher": book.publisher or '',
                    "isbn": book.isbn or '',
                    "desc": book.description or '這本書目前尚未提供簡介。',
                    "cover": book.cover_image.url if book.cover_image else '',
                    "status": status_name,
                })

    except Exception as e:
        print(f"Error fetching books: {e}")
    
    return render(request, "personal.html", {
        'user_data': user_data,
        'user': request.user,  # 保留原始的 user 對象以確保向後兼容
        'google_picture': google_picture,  # 添加 Google 照片 URL
        'joined_activities': joined_activities,
        'created_activities': created_activities,
        'calendar_events_json': json.dumps([
            {
                'date': (e['date'].isoformat() if hasattr(e['date'], 'isoformat') else str(e['date'])),
                'title': e['title'],
                'id': e['id'],
                'created_at': (e['created_at'].isoformat() if hasattr(e['created_at'], 'isoformat') else str(e['created_at'])),
                'time': (e['time'].strftime('%H:%M') if hasattr(e['time'], 'strftime') else str(e['time'])),
            }
            for e in calendar_events
        ], ensure_ascii=False),

        # ★ 新增：提供給 course-schedule 卡片使用
        'tickets': tickets,
        'books': books,
        'created_flags': created_flags,
    })


    

def chat(request):
    return render(request, 'chat.html')

def navbar2(request):
    return render(request, 'navbar(2).html')

def join(request):
    return render(request, 'join.html')

def join_create(request):
    return render(request, 'join_create.html')

def _parse_request_data(request):
    """同時支援 JSON 與 x-www-form-urlencoded"""
    if request.content_type and 'application/json' in request.content_type.lower():
        try:
            return json.loads(request.body or '{}')
        except Exception as e:
            logger.warning("add_comment bad json: %s", e)
            return None  # 讓呼叫端回 400
    # fallback: 表單
    return request.POST



def book(request):
    # 只顯示可購買的書籍（排除已下架和已售出）
    from .models import Status
    try:
        offline_status = Status.objects.get(name='已下架')
        sold_status = Status.objects.get(name='已售出')
        books_queryset = Book2.objects.exclude(
            status__in=[offline_status, sold_status]
        ).select_related('academic', 'department', 'grade', 'category', 'status')
    except Status.DoesNotExist:
        # 如果沒有相關狀態，顯示所有書籍
        books_queryset = Book2.objects.all().select_related('academic', 'department', 'grade', 'category', 'status')

    # 應用篩選條件
    search_term = request.GET.get('search', '').strip()
    academic_id = request.GET.get('academic_id', '')
    department_id = request.GET.get('department_id', '')
    grade_level = request.GET.get('grade_level', '')
    category_name = request.GET.get('category', '')
    condition = request.GET.get('condition', '')
    price_range = request.GET.get('price_range', '')

    # 搜尋詞篩選
    if search_term:
        books_queryset = books_queryset.filter(
            Q(title__icontains=search_term) | 
            Q(author__icontains=search_term) |
            Q(description__icontains=search_term)
        )

    # 學制篩選
    if academic_id:
        books_queryset = books_queryset.filter(academic_id=academic_id)

    # 系所篩選
    if department_id:
        books_queryset = books_queryset.filter(department_id=department_id)

    # 年級篩選
    if grade_level:
        books_queryset = books_queryset.filter(grade__grade_level=grade_level)

    # 分類篩選
    if category_name:
        books_queryset = books_queryset.filter(category__name=category_name)

    # 書況篩選 - 需要將顯示文字轉換為數字值
    if condition:
        # 建立書況對應表
        condition_mapping = {
            '全新': 'new',
            '近全新': 'like_new', 
            '良好': 'good',
            '普通': 'fair',
            '需要修復': 'poor'
        }
        condition_value = condition_mapping.get(condition)
        if condition_value:
            books_queryset = books_queryset.filter(condition=condition_value)

    # 價格範圍篩選
    if price_range:
        try:
            min_price, max_price = map(int, price_range.split('-'))
            books_queryset = books_queryset.filter(price__gte=min_price, price__lte=max_price)
        except (ValueError, AttributeError):
            pass

    # 排序
    books_list = books_queryset.order_by('-created_at')

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
    
    # 如果有選擇學制，載入對應的科系和年級
    departments = []
    academic_grades = []
    if academic_id:
        try:
            # 載入該學制下的科系
            academic_departments = AcadeDepart.objects.filter(
                academica_id=academic_id
            ).select_related("departmentd")
            departments = [{"id": ad.departmentd.id, "name": ad.departmentd.name} 
                          for ad in academic_departments]
            
            # 載入該學制下的年級
            academic_grades_qs = AcadeGrade.objects.filter(
                academica_id=academic_id
            ).order_by('id')
            academic_grades = [{"id": ag.id, "grade_level": ag.grade_level} 
                              for ag in academic_grades_qs]
        except Exception as e:
            logger.warning(f"載入科系年級失敗: {e}")
            departments = []
            academic_grades = []

    # 獲取當前用戶的聯絡資訊
    user_phone = None
    user_line_id = None
    if request.user.is_authenticated:
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT phone, LINE_ID
                    FROM `User`
                    WHERE mail = %s
                """, [request.user.email])
                row = cursor.fetchone()
                if row:
                    user_phone, user_line_id = row
                    logger.info(f"Book頁面 - 用戶聯絡資訊查詢結果 - Email: {request.user.email}, Phone: {user_phone}, LINE: {user_line_id}")
                else:
                    logger.info(f"Book頁面 - 未找到用戶聯絡資訊 - Email: {request.user.email}")
        except Exception as e:
            logger.warning(f"Book頁面 - 無法獲取用戶聯絡資訊: {e}")

    return render(request, 'book.html', {
        'books': books,
        'form': form,
        'categories': categories,
        'academics': academics,
        'academic_grades': academic_grades,
        'departments': departments,
        'items_per_row': items_per_row,
        'user_phone': user_phone,
        'user_line_id': user_line_id,
        # 傳遞當前篩選值給模板
        'current_search': search_term,
        'current_academic_id': academic_id,
        'current_department_id': department_id,
        'current_grade_level': grade_level,
        'current_category': category_name,
        'current_condition': condition,
        'current_price_range': price_range,
    })

def book_2(request):
    return render(request, 'book_2.html')

@csrf_exempt
@login_required
@require_http_methods(["POST"])
def remove_book(request, pk):
    """下架書籍"""
    try:
        logger.info(f"開始下架書籍 - 用戶: {request.user.email}, 書籍ID: {pk}")
        
        book = get_object_or_404(Book2, pk=pk)
        logger.info(f"找到書籍: {book.title}, 賣家: {book.seller.email}")
        
        # 檢查是否為書籍擁有者
        if request.user != book.seller:
            logger.warning(f"權限不足 - 當前用戶: {request.user.email}, 書籍賣家: {book.seller.email}")
            return JsonResponse({
                'success': False,
                'message': '您沒有權限下架此書籍'
            }, status=403)
        
        # 檢查當前狀態
        logger.info(f"書籍當前狀態: {book.status}")
        
        # 軟刪除：將狀態設為已下架
        from .models import Status
        try:
            offline_status = Status.objects.get(name='已下架')
            logger.info(f"找到已下架狀態: {offline_status}")
        except Status.DoesNotExist:
            logger.info("未找到已下架狀態，正在創建...")
            # 如果沒有已下架狀態，創建一個
            offline_status, created = Status.objects.get_or_create(
                name='已下架',
                defaults={'name': '已下架'}
            )
            logger.info(f"創建已下架狀態: {offline_status}, 是否新創建: {created}")
        
        # 更新書籍狀態
        old_status = book.status
        book.status = offline_status
        book.save()
        
        logger.info(f"書籍狀態已更新 - 從 {old_status} 到 {book.status}")
        logger.info(f"用戶 {request.user.email} 成功下架了書籍: {book.title} (ID: {book.pk})")
        
        return JsonResponse({
            'success': True,
            'message': '書籍已成功下架'
        })
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"下架書籍失敗 - 用戶: {request.user.email}, 書籍ID: {pk}")
        logger.error(f"錯誤詳情: {str(e)}")
        logger.error(f"完整錯誤堆疊: {error_details}")
        
        return JsonResponse({
            'success': False,
            'message': f'下架失敗: {str(e)}',
            'error_details': str(e)
        }, status=500)

@csrf_exempt
@login_required
@require_http_methods(["POST"])
def mark_book_sold(request, pk):
    """標記書籍為已售出"""
    try:
        logger.info(f"開始標記已售出 - 用戶: {request.user.email}, 書籍ID: {pk}")
        
        book = get_object_or_404(Book2, pk=pk)
        logger.info(f"找到書籍: {book.title}, 賣家: {book.seller.email}")
        
        # 檢查是否為書籍擁有者
        if request.user != book.seller:
            logger.warning(f"權限不足 - 當前用戶: {request.user.email}, 書籍賣家: {book.seller.email}")
            return JsonResponse({
                'success': False,
                'message': '您沒有權限標記此書籍'
            }, status=403)
        
        # 檢查當前狀態
        logger.info(f"書籍當前狀態: {book.status}")
        
        # 設置為已售出狀態
        from .models import Status
        try:
            sold_status = Status.objects.get(name='已售出')
            logger.info(f"找到已售出狀態: {sold_status}")
        except Status.DoesNotExist:
            logger.info("未找到已售出狀態，正在創建...")
            # 如果沒有已售出狀態，創建一個
            sold_status, created = Status.objects.get_or_create(
                name='已售出',
                defaults={'name': '已售出'}
            )
            logger.info(f"創建已售出狀態: {sold_status}, 是否新創建: {created}")
        
        # 更新書籍狀態
        old_status = book.status
        book.status = sold_status
        book.save()
        
        logger.info(f"書籍狀態已更新 - 從 {old_status} 到 {book.status}")
        logger.info(f"用戶 {request.user.email} 成功標記書籍已售出: {book.title} (ID: {book.pk})")
        
        return JsonResponse({
            'success': True,
            'message': '書籍已標記為已售出'
        })
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"標記已售出失敗 - 用戶: {request.user.email}, 書籍ID: {pk}")
        logger.error(f"錯誤詳情: {str(e)}")
        logger.error(f"完整錯誤堆疊: {error_details}")
        
        return JsonResponse({
            'success': False,
            'message': f'標記失敗: {str(e)}',
            'error_details': str(e)
        }, status=500)


def book_detail(request, pk):
    book = get_object_or_404(Book2, pk=pk)
    
    # 檢查書籍狀態（只有擁有者可以查看已下架/已售出的書籍）
    from .models import Status
    try:
        offline_status = Status.objects.get(name='已下架')
        sold_status = Status.objects.get(name='已售出')
        
        # 如果書籍已下架且不是擁有者，返回404
        if book.status == offline_status and (not request.user.is_authenticated or request.user != book.seller):
            from django.http import Http404
            raise Http404("此書籍已下架")
            
        # 如果書籍已售出且不是擁有者，返回404
        if book.status == sold_status and (not request.user.is_authenticated or request.user != book.seller):
            from django.http import Http404
            raise Http404("此書籍已售出")
            
    except Status.DoesNotExist:
        pass  # 如果沒有相關狀態，繼續正常流程
    
    seller_user = book.seller
    seller_google_picture = None
    seller_phone = None
    seller_line_id = None
    
    # 獲取賣家的 Google 頭像
    try:
        if hasattr(seller_user, 'social_auth'):
            social = seller_user.social_auth.filter(provider='google-oauth2').first()
            if social and 'picture' in social.extra_data:
                seller_google_picture = social.extra_data['picture']
    except Exception as e:
        print(f"Error getting seller social auth data: {e}")

    # 獲取賣家的聯絡資訊（電話和LINE ID）
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT phone, LINE_ID
                FROM `User`
                WHERE mail = %s
            """, [seller_user.email])
            row = cursor.fetchone()
            if row:
                seller_phone, seller_line_id = row
    except Exception as e:
        logger.warning(f"無法獲取賣家聯絡資訊: {e}")

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

    # 判斷當前用戶是否為書籍擁有者
    is_owner = request.user.is_authenticated and request.user == book.seller

    return render(request, 'book_detail.html', {
        'book': book,
        'seller_user': seller_user,
        'seller_google_picture': seller_google_picture,
        'seller_phone': seller_phone,
        'seller_line_id': seller_line_id,
        'related_books': related_books[:6],
        'is_owner': is_owner,
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
            # 不當詞過濾（掃所有文字欄位）
            has_banned = any(
                isinstance(v, str) and v.strip() and contains_banned_content(v)
                for v in form.cleaned_data.values()
            )
            if has_banned:
                return JsonResponse({'success': False, 'message': '輸入內容包含禁止詞彙，請重新編輯。'}, status=400)

            book = form.save(commit=False)
            book.seller = request.user
            book.contact = request.user
            if 'cover_image' in request.FILES:
                book.cover_image = request.FILES['cover_image']
            book.save()
            return JsonResponse({'success': True, 'message': '書籍上架成功！', 'book_id': book.pk})
        else:
            # 前端若有逐欄位顯示需求可回 form.errors；否則維持 message
            return JsonResponse({'success': False, 'message': str(form.errors)}, status=400)

    form = Book2Form()
    academics = Academic.objects.all()
    
    # 獲取當前用戶的聯絡資訊
    user_phone = None
    user_line_id = None
    user_email = None
    if request.user.is_authenticated:
        user_email = request.user.email
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT phone, LINE_ID
                    FROM `User`
                    WHERE mail = %s
                """, [request.user.email])
                row = cursor.fetchone()
                if row:
                    user_phone, user_line_id = row
                    # 調試信息
                    logger.info(f"用戶聯絡資訊查詢結果 - Email: {user_email}, Phone: {user_phone}, LINE: {user_line_id}")
                else:
                    logger.info(f"未找到用戶聯絡資訊 - Email: {user_email}")
        except Exception as e:
            logger.warning(f"無法獲取用戶聯絡資訊: {e}")
    
    return render(request, 'book.html', {
        'form': form,
        'books': Book2.objects.all(),
        'academics': academics,
        'user_phone': user_phone,
        'user_line_id': user_line_id,
    })


def ask_page(request):
    return render(request, "ask.html")

# 新增到 views.py 的內容

# 嘗試導入 vision_utils，如果失敗則設為 None
try:
    from .utils.improved_book_recognition import book_recognition_service
except ImportError as e:
    print(f"Warning: Google Cloud Vision not available: {e}")
    book_recognition_service = None

@login_required
@require_http_methods(["POST"])
def recognize_book(request):
    """書籍圖片識別 API"""
    try:
        # 檢查是否有圖片檔案
        if 'image' not in request.FILES:
            return JsonResponse({
                'success': False,
                'error': '未找到圖片檔案'
            }, status=400)
        
        image_file = request.FILES['image']
        
        # 驗證檔案類型
        if not image_file.content_type.startswith('image/'):
            return JsonResponse({
                'success': False,
                'error': '檔案格式不正確，請上傳圖片'
            }, status=400)
        
        # 檢查檔案大小 (限制 10MB)
        if image_file.size > 10 * 1024 * 1024:
            return JsonResponse({
                'success': False,
                'error': '圖片檔案過大，請上傳小於 10MB 的圖片'
            }, status=400)
        
        # 讀取圖片內容
        image_content = image_file.read()
        
        # 檢查 Vision 服務是否可用
        if book_recognition_service is None:
            return JsonResponse({
                'success': False,
                'error': 'Google Cloud Vision 服務未啟用，請聯繫管理員'
            }, status=503)
        
        # 處理書籍識別
        result = book_recognition_service.process_book_image(image_content)
        
        if result['success']:
            # 格式化資料以符合前端需要
            book_info = result['book_info']
            
            response_data = {
                'success': True,
                'data': {
                    'title': book_info.get('title', ''),
                    'author': ', '.join(book_info.get('authors', [])) if book_info.get('authors') else '',
                    'publisher': book_info.get('publisher', ''),
                    'isbn': book_info.get('isbn', ''),
                    'description': book_info.get('description', ''),
                    'published_date': book_info.get('published_date', ''),
                    'page_count': book_info.get('page_count', 0),
                    'thumbnail': book_info.get('thumbnail', ''),
                    'categories': book_info.get('categories', []),
                    'source': book_info.get('source', 'unknown')
                },
                'ocr_text': result.get('ocr_text', ''),
                'message': '書籍識別成功'
            }
            
            return JsonResponse(response_data)
        else:
            return JsonResponse({
                'success': False,
                'error': result.get('error', '識別失敗'),
                'ocr_text': result.get('ocr_text', '')
            }, status=400)
            
    except Exception as e:
        logger.error(f"書籍識別錯誤: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'系統錯誤: {str(e)}'
        }, status=500)

@login_required  
@require_http_methods(["POST"])
def search_book_manual(request):
    """手動搜尋書籍資訊"""
    try:
        data = json.loads(request.body)
        search_query = data.get('query', '').strip()
        search_type = data.get('type', 'title')  # title 或 isbn
        
        if not search_query:
            return JsonResponse({
                'success': False,
                'error': '請輸入搜尋關鍵字'
            }, status=400)
        
        # 檢查 Vision 服務是否可用
        if book_recognition_service is None:
            return JsonResponse({
                'success': False,
                'error': 'Google Cloud Vision 服務未啟用，請聯繫管理員'
            }, status=503)
        
        if search_type == 'isbn':
            # 清理 ISBN 格式
            isbn = re.sub(r'[-\s]', '', search_query)
            if not (len(isbn) in [10, 13] and isbn.isdigit()):
                return JsonResponse({
                    'success': False,
                    'error': 'ISBN 格式不正確'
                }, status=400)
            
            result = book_recognition_service.search_book_by_isbn(isbn)
        else:
            result = book_recognition_service.search_book_by_title(search_query)
        
        if result['success']:
            book_info = result['data']
            return JsonResponse({
                'success': True,
                'data': {
                    'title': book_info.get('title', ''),
                    'author': ', '.join(book_info.get('authors', [])) if book_info.get('authors') else '',
                    'publisher': book_info.get('publisher', ''),
                    'isbn': book_info.get('isbn', ''),
                    'description': book_info.get('description', ''),
                    'published_date': book_info.get('published_date', ''),
                    'thumbnail': book_info.get('thumbnail', ''),
                    'categories': book_info.get('categories', [])
                },
                'message': '書籍查詢成功'
            })
        else:
            return JsonResponse({
                'success': False,
                'error': result.get('error', '查詢失敗')
            }, status=404)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': '請求格式錯誤'
        }, status=400)
    except Exception as e:
        logger.error(f"手動搜尋錯誤: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'搜尋失敗: {str(e)}'
        }, status=500)
#===================================


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
            .annotate(
                participants_count_q=Coalesce(
                    DJCount(
                        'participants',
                        filter=Q(participants__status='joined'),
                        distinct=True,
                    ),
                    0,
                )
            )
            .annotate(
                total_count_q=F('participants_count_q') + DJValue(1, output_field=DJIntegerField())
            )
            .order_by('-total_count_q', '-created_at')
            .first()
        )

        if a_hot:
            title = f"🔥 活動︰{_shorten(a_hot.title)}"
            url = _safe_reverse("activity_detail", args=[a_hot.pk], fallback=f"/activity/{a_hot.pk}/")
            activity_hot_item = {"title": title, "url": url}

    except Exception:
        logger.exception("計算熱門活動失敗")

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
        comment_new_item or {"title": "最新！課程評論︰暫無資料", "url": "/comment/"},
        book_new_item    or {"title": "最新上架！二手書︰暫無資料",   "url": _safe_reverse("book", fallback="/book/")},
        activity_new_item or {"title": "最新！活動︰暫無資料", "url": _safe_reverse("activity_list", fallback="/activities/")},
    ] 

    return render(request, 'index.html', {
        'dlg_left': dlg_left,
        'dlg_right': dlg_right,
        'dlg_mobile': dlg_mobile,
    })

############################################################
# views.py — 課程評論「列表頁」產 JSON 給前端，顯示熱門評論的頭貼與姓名  

def get_legacy_user_id(request) -> int | None:
    """
    回傳你家 User.user_id；若 request.user 沒有 email 或找不到對應，就回傳 None
    """
    email = getattr(request.user, "email", None)
    if not email:
        return None

    return (
        User.objects
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



# ========= 工具函式 =========

def _clean_teacher_name(val: str) -> str:
    """
    把前綴代號（數字/字母/符號）去掉，只留下老師姓名。
    假設格式大多為「1982 蔡宗儒」→ 取最後一段。
    """
    if not val:
        return ""
    s = str(val).strip()
    return s.split()[-1]  # 直接取最後一個詞，去掉代號



# =========================
# 列表頁（含動態統計 + 熱門評論頭貼/姓名）
# =========================

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
            # 平均星等：包含所有評分（純評分 + 有評論且有評分）
            avg_rating=Coalesce(
                Avg('reviews__rating'), 0.0
            ),
            # 評分筆數：所有有評分的評論都算
            rating_count=Coalesce(
                Count('reviews__id', filter=Q(reviews__rating__isnull=False)), 0
            ),
            # 有文字的評論筆數：content 不為空字串且不是 None
            comment_count=Coalesce(
                Count('reviews__id', filter=(~Q(reviews__content="") & ~Q(reviews__content=None))), 0
            ),
            # 最近一則有文字的評論時間
            last_dt=Max('reviews__created_at', filter=(~Q(reviews__content="") & ~Q(reviews__content=None))),

            # 其餘欄位（原本就有）
            has_activity=Case(
                When(Q(rating_count__gt=0) | Q(comment_count__gt=0), then=Value(True)),
                default=Value(False),
                output_field=BooleanField(),
            )
        )
        .order_by('-has_activity', 'course_name')
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
    users = User.objects.filter(user_id__in=user_ids).only('user_id', 'mail')
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
                    # 優先使用暱稱，如果暱稱為空則使用真實姓名
                    try:
                        with connection.cursor() as cursor:
                            cursor.execute("""
                                SELECT anonymous, name
                                FROM `User`
                                WHERE mail = %s
                            """, [em])
                            row = cursor.fetchone()
                            if row:
                                anonymous, name = row
                                if anonymous and anonymous.strip():
                                    display_name = anonymous.strip()
                                elif name and name.strip():
                                    display_name = name.strip()
                                else:
                                    display_name = names_by_email.get(em) or em.split("@")[0]
                            else:
                                display_name = names_by_email.get(em) or em.split("@")[0]
                    except Exception:
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
            "course_teacher": _clean_teacher_name(c.course_teacher),
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

    # 獲取當前用戶的顯示名稱和頭像
    current_user_name = get_user_display_name(request.user) if request.user.is_authenticated else "訪客"
    current_user_avatar = _google_picture(request.user) if request.user.is_authenticated else "/static/image/anonymous.png"

    return render(request, "comment.html", {
        "academics": academics,
        "departments": departments,
        "grades": grades,
        "departments_data": json.dumps(departments_data, ensure_ascii=False),
        "grades_data": json.dumps(grades_data, ensure_ascii=False),
        "courses_json": json.dumps(payload, ensure_ascii=False),
        "current_user_name": current_user_name,
        "current_user_avatar": current_user_avatar,
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
                    # 優先使用暱稱，如果暱稱為空則使用真實姓名
                    try:
                        with connection.cursor() as cursor:
                            cursor.execute("""
                                SELECT anonymous, name
                                FROM `User`
                                WHERE mail = %s
                            """, [u.mail])
                            row = cursor.fetchone()
                            if row:
                                anonymous, name = row
                                if anonymous and anonymous.strip():
                                    display_name = anonymous.strip()
                                elif name and name.strip():
                                    display_name = name.strip()
                                else:
                                    # 如果自定義表沒有資料，使用 Django 用戶的姓名
                                    full_name = f"{getattr(au, 'last_name', '')}{getattr(au, 'first_name', '')}".strip()
                                    display_name = full_name or getattr(au, "username", "") or u.mail
                            else:
                                # 如果自定義表沒有資料，使用 Django 用戶的姓名
                                full_name = f"{getattr(au, 'last_name', '')}{getattr(au, 'first_name', '')}".strip()
                                display_name = full_name or getattr(au, "username", "") or u.mail
                    except Exception:
                        # 如果查詢失敗，使用 Django 用戶的姓名
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
            "course_teacher": _clean_teacher_name(c.course_teacher),
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
        "course_teacher": _clean_teacher_name(c.course_teacher),
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
        "current_user_name": get_user_display_name(request.user),

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
        "course_teacher": _clean_teacher_name(course.course_teacher) or "",
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
        "current_user_name": get_user_display_name(request.user),
        "selected_course": course,
        "selected_teacher": _clean_teacher_name(course.course_teacher) or "",
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


def comment_detail(request, id=None):
    course_id = id or request.GET.get('course_id')
    if not course_id:
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
            # 顯示姓名（優先使用暱稱，如果暱稱為空則使用真實姓名）
            if au:
                # 嘗試從自定義 User 表獲取暱稱
                try:
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            SELECT anonymous, name
                            FROM `User`
                            WHERE mail = %s
                        """, [rv.user.mail])
                        row = cursor.fetchone()
                        if row:
                            anonymous, name = row
                            # 優先使用暱稱，如果為空則使用真實姓名
                            if anonymous and anonymous.strip():
                                display_name = anonymous.strip()
                            elif name and name.strip():
                                display_name = name.strip()
                            else:
                                # 如果自定義表沒有資料，使用 Django 用戶的姓名
                                full = f"{au.last_name or ''}{au.first_name or ''}".strip()
                                display_name = full or au.username or rv.user.mail
                        else:
                            # 如果自定義表沒有資料，使用 Django 用戶的姓名
                            full = f"{au.last_name or ''}{au.first_name or ''}".strip()
                            display_name = full or au.username or rv.user.mail
                except Exception:
                    # 如果查詢失敗，使用 Django 用戶的姓名
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
        'review_count': len([rv for rv in raw_qs if (rv.content or '').strip()]),  # 有文字的評論
        'total_ratings': len([rv for rv in raw_qs if not (rv.content or '').strip()]),  # 純評分（無文字）
        'academic': course.academica,
        'department': course.departmentd,
        'star_distribution': star_distribution,
        'last_review_human': _humanize(display_list[0].created_at) if display_list else "",
        "course_teacher": _clean_teacher_name(course.course_teacher),
    }
    return render(request, "comment_detail.html", context)



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
    新增一筆「評論 + 評分」記錄（允許 content 空字串）。
    一律使用你家的 user_id。
    ✅ 不再 update_or_create；每次呼叫都新增一筆。
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

        legacy_uid = get_legacy_user_id(request)
        if legacy_uid is None:
            return JsonResponse({'error': '無法找到對應的使用者'}, status=403)

        data = json.loads(request.body or "{}")
        content = (data.get('content') or '').strip()
        rating = int(data.get('rating', 0))
        if not (1 <= rating <= 5):
            return JsonResponse({'error': '評分必須是 1-5 的整數'}, status=400)

        # ✅ 改為 create：每次都新增一筆
        review = CourseReview.objects.create(
            user_id=legacy_uid,
            course_id=course.id,
            content=content,
            rating=rating
        )

        return JsonResponse({
            'success': True,
            'is_new': True,
            'review': {
                'id': review.id,
                'content': review.content,
                'rating': review.rating,
                'user_id': legacy_uid,
            },
        }, status=201)

    except IntegrityError as e:
        return JsonResponse({
            'error': '新增失敗：資料庫仍有 (course_id, user_id) 的唯一約束，請先移除該唯一索引後再試。',
            'detail': str(e),
        }, status=409)
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
    legacy_user = get_object_or_404(User, user_id=legacy_uid)

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

import re
import logging
import openai
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

# 設定日誌記錄器
logger = logging.getLogger(__name__)

# ============================================================
# AI 評論優化功能
# ============================================================
# 功能說明:
# 1. 接收使用者輸入的課程評論
# 2. 使用 Azure OpenAI API 進行語意優化
# 3. 保持原意但改善語氣,使其更友善、清晰
# 4. 在評論末尾加上改進建議 (🦉：開頭)
# ============================================================


def _clean_input(text: str) -> str:
    """
    清理輸入文字
    
    處理步驟:
    1. 統一換行符號 (\r\n 或 \r 轉為 \n)
    2. 壓縮多餘空白 (連續空格/Tab 轉為單一空格)
    3. 去除頭尾空白
    
    Args:
        text: 原始輸入文字
    
    Returns:
        str: 清理後的文字
    """
    # 處理可能的 None 值
    text = text or ""
    
    # 統一換行符號
    text = re.sub(r"\r\n?", "\n", text)
    
    # 壓縮空白字元
    text = re.sub(r"[ \t]+", " ", text)
    
    return text.strip()


# AI 系統提示詞 (System Prompt)
SYSTEM_PROMPT = (
    "You help polish course reviews. Keep the user's original meaning almost completely. "
    "Only fix words if they are super harsh or offensive, but make the wording funny, casual, and easy to read—like a real person talking. "
    "Everything else should stay as close to the original as possible. "
    "At the end of the review, add a short, natural improvement suggestion prefixed with 🦉：, and start it on a new line using a literal (so the 🦉 part is always on its own line). "
    "1) Don't add or remove details the user didn't mention, except for the improvement suggestion; "
    "2) Only swap out offensive words while keeping the same strong opinion; "
    "3) Make the smallest edits needed, no over-polishing; "
    "4) Just output the final review text, no explanations; "
    "5) Write in Traditional Chinese."
)


@csrf_exempt
@require_POST
def optimize_comment_ai(request):
    """
    AI 評論優化 API 端點
    
    請求方式: POST
    請求參數:
        - content (str): 使用者輸入的原始評論內容
    
    回應格式:
        成功: {"result": "優化後的評論內容"}
        失敗: {"error": "錯誤訊息"}, status=4xx/5xx
    """
    
    logger.info("=== AI 評論優化請求開始 ===")
    
    # ===== 步驟 1: 載入 Azure OpenAI 設定 =====
    api_key = settings.AZURE_OPENAI_API_KEY
    endpoint = settings.AZURE_OPENAI_ENDPOINT
    api_ver = settings.AZURE_OPENAI_API_VERSION
    deployment = settings.AZURE_OPENAI_DEPLOYMENT_NAME
    
    logger.info(f"Azure OpenAI 端點: {endpoint}")
    logger.info(f"部署名稱: {deployment}")
    logger.info(f"API 版本: {api_ver}")
    
    # 檢查必要設定是否完整
    if not all([api_key, endpoint, deployment]):
        logger.error("❌ Azure OpenAI 設定不完整")
        return JsonResponse(
            {"error": "Azure OpenAI not configured"}, 
            status=503
        )
    
    # ===== 步驟 2: 取得並清理使用者輸入 =====
    raw_content = request.POST.get("content", "")
    logger.info(f"原始輸入長度: {len(raw_content)} 字元")
    
    cleaned_content = _clean_input(raw_content)
    logger.info(f"清理後長度: {len(cleaned_content)} 字元")
    
    # 空內容直接回傳
    if not cleaned_content:
        logger.warning("⚠️  輸入內容為空")
        return JsonResponse({"result": ""})
    
    # ===== 步驟 3: 檢查內容長度 =====
    # 移除換行後檢查實際字數
    content_without_newlines = cleaned_content.replace("\n", "").strip()
    
    if len(content_without_newlines) < 6:
        logger.warning(f"⚠️  內容過短 (僅 {len(content_without_newlines)} 字元)")
        return JsonResponse({
            "result": (
                "（內容過短）目前的評論資訊不足,無法進行語意優化與送出。"
                "請補充具體細節（例如：單元/作業類型/上課節奏/評分標準/時間點等）,再按「轉換」。"
            )
        })
    
    # ===== 步驟 4: 呼叫 Azure OpenAI API =====
    try:
        logger.info("📡 正在呼叫 Azure OpenAI API...")
        
        # 初始化 OpenAI 客戶端
        client = openai.AzureOpenAI(
            api_key=api_key,
            api_version=api_ver,
            azure_endpoint=endpoint,
        )
        
        # 建構使用者訊息
        user_message = (
            "請將以下評論改寫為可直接提交的中性評論文本,避免對話式與流程說明：\n\n"
            f"{cleaned_content}\n\n"
            "注意：只輸出改寫後的最終評論內容；不要出現道歉、無法處理、需要更多資訊等字樣。"
        )
        
        logger.info("📤 發送請求到 OpenAI...")
        
        # 發送 API 請求
        response = client.chat.completions.create(
            model=deployment,
            temperature=0.2,  # 較低溫度確保輸出穩定
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            max_tokens=400,  # 限制回應長度
        )
        
        # 取得 AI 回應內容
        optimized_text = (response.choices[0].message.content or "").strip()
        logger.info(f"📥 收到 AI 回應,長度: {len(optimized_text)} 字元")
        
        # ===== 步驟 5: 驗證 AI 回應品質 =====
        # 黑名單關鍵字 (避免 AI 回應無效內容)
        blacklist_keywords = [
            "無法", 
            "需要更多資訊", 
            "不便", 
            "抱歉", 
            "無法進行有效", 
            "建議您提供"
        ]
        
        # 檢查是否包含黑名單關鍵字或內容過短
        has_blacklist = any(keyword in optimized_text for keyword in blacklist_keywords)
        is_too_short = len(optimized_text) < 6
        
        if has_blacklist or is_too_short:
            logger.warning("⚠️  AI 回應品質不佳,使用預設回應")
            optimized_text = (
                "課程整體品質仍有進步空間；期望在教學重點與作業說明上更清楚,"
                "並提供更多實作示例以提升理解。"
            )
        else:
            logger.info("✅ AI 優化成功")
        
        return JsonResponse({"result": optimized_text})
    
    except openai.APIError as e:
        # OpenAI API 錯誤
        logger.error(f"❌ OpenAI API 錯誤: {str(e)}")
        return JsonResponse(
            {"error": f"OpenAI API 錯誤: {str(e)}"}, 
            status=500
        )
    
    except Exception as e:
        # 其他未預期錯誤
        logger.error(f"❌ 未預期錯誤: {str(e)}", exc_info=True)
        return JsonResponse(
            {"error": f"系統錯誤: {str(e)}"}, 
            status=500
        )
    
    finally:
        logger.info("=== AI 評論優化請求結束 ===\n")


# ============================================================
# 使用範例
# ============================================================
# POST /api/optimize-comment/
# Content-Type: application/x-www-form-urlencoded
# 
# content=這門課真的爛透了老師都在講廢話
#
# 回應:
# {
#   "result": "這門課的教學內容還有很大的改進空間,老師的講解方式可以更精簡有效。\n🦉：建議課程設計時可以加入更多實作練習,讓理論與實務結合得更好。"
# }
# ============================================================

#############################課程評論區##############################


# web_app/views.py

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
        
        # 為發起者和參與者添加顯示名稱
        a.user_display_name = get_user_display_name(a.user)
        for p in a.cleaned_participants:
            p.user_display_name = get_user_display_name(p.user)
            
        # 設定顯示的聯絡資訊：有contact_info就用它，沒有就用email
        if a.contact_info and a.contact_info.strip():
            a.display_contact = a.contact_info
        else:
            a.display_contact = a.user.email if hasattr(a.user, 'email') else '無聯絡資訊'

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

    # 獲取用戶聯絡資訊（用於彈窗發布活動）
    user_phone = ''
    user_line_id = ''
    user_email = ''
    if request.user.is_authenticated:
        try:
            # 嘗試通過email關聯自定義User模型
            from .models import User
            custom_user = User.objects.filter(mail=request.user.email).first()
            if custom_user:
                user_phone = custom_user.phone or ''
                user_line_id = custom_user.LINE_ID or ''
                user_email = custom_user.mail or request.user.email
            else:
                # 如果沒有找到自定義用戶，使用Django標準用戶的資料
                user_email = request.user.email or ''
        except Exception as e:
            print(f"獲取用戶聯絡資訊失敗: {e}")
            user_email = request.user.email or ''

    return render(request, 'join.html', {
        'activities': activities,
        'joined_ids': joined_ids,
        'created_ids': created_ids,
        'current_type': activity_type,
        'current_location_type': location_type,
        'current_time': time_filter,
        'current_search': search_query,
        'user_phone': user_phone,
        'user_line_id': user_line_id,
        'user_email': user_email,
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

    # 為發起者、參與者和評論者添加顯示名稱
    a.user_display_name = get_user_display_name(a.user)
    
    for participant in participants:
        participant.user_display_name = get_user_display_name(participant.user)
    
    for comment in comments:
        comment.user_display_name = get_user_display_name(comment.user)
        for reply in comment.replies.all():
            reply.user_display_name = get_user_display_name(reply.user)

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
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'message': '已超過報名截止時間'})
        return redirect('activity_detail', pk=pk)
    if current_joined_count >= (a.max_participants or 0):
        messages.error(request, '本活動已額滿')
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'message': '本活動已額滿'})
        return redirect('activity_detail', pk=pk)

    # 使用 auth_user（request.user）
    existing = ActivityParticipant.objects.filter(activity_id=a.id, user_id=request.user.id).first()
    if existing and existing.status == 'joined':
        messages.info(request, '您已經報名此活動')
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'message': '您已經報名此活動'})
        return redirect('activity_detail', pk=pk)

    ActivityParticipant.objects.update_or_create(
        activity_id=a.id,
        user_id=request.user.id,
        defaults={'status': 'joined', 'joined_at': timezone.now(), 'updated_at': timezone.now()}
    )
    updated_joined_count = ActivityParticipant.objects.filter(activity_id=a.id, status='joined').count()
    messages.success(request, '報名成功！可至個人中心查看已參加的活動')

    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True, 
            'participants': updated_joined_count, 
            'message': '報名成功！',
            'new_status': 'joined',
            'activity_id': a.id
        })
    
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
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'message': '您尚未報名此活動'})
        return redirect('activity_detail', pk=pk)

    participant.status = 'cancelled'
    participant.updated_at = timezone.now()
    participant.save()
    updated_joined_count = ActivityParticipant.objects.filter(activity_id=a.id, status='joined').count()
    messages.info(request, '已取消參加')

    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({
            'success': True, 
            'participants': updated_joined_count, 
            'message': '已取消參加',
            'new_status': 'not_joined',
            'activity_id': a.id
        })
    
    return redirect('activity_detail', pk=pk)

# -----------------------
# 刪除活動（僅發起者可刪除）
# -----------------------
@login_required
def delete_activity(request, pk):
    if request.method != 'POST':
        return redirect('activity_detail', pk=pk)
    
    activity = get_object_or_404(GroupActivity, pk=pk)
    
    # 檢查是否為活動發起者
    if request.user != activity.user:
        messages.error(request, '您沒有權限刪除此活動')
        return redirect('activity_detail', pk=pk)
    
    # 檢查是否有其他人已經參加
    participant_count = ActivityParticipant.objects.filter(
        activity=activity,
        status='joined'
    ).count()
    
    if participant_count > 0:
        messages.error(request, '已有其他人參加此活動，無法刪除。請聯繫參加者或等待活動結束。')
        return redirect('activity_detail', pk=pk)
    
    # 記錄活動標題用於顯示訊息
    activity_title = activity.title
    
    # 刪除活動（會自動刪除相關的評論和參與記錄）
    activity.delete()
    
    messages.success(request, f'活動「{activity_title}」已成功刪除')
    return redirect('activity_list')

# -----------------------
# 建立活動
# -----------------------

@csrf_exempt
@login_required
def create_activity(request):
    def is_ajax(req):
        return req.headers.get('x-requested-with') == 'XMLHttpRequest'

    def render_form(form_obj):
        # ★ 無論 GET 或 POST 重新 render，都把禁用詞清單和用戶聯絡資訊丟給模板
        user_phone = ''
        user_line_id = ''
        user_email = ''
        try:
            # 嘗試通過email關聯自定義User模型
            from .models import User
            custom_user = User.objects.filter(mail=request.user.email).first()
            if custom_user:
                user_phone = custom_user.phone or ''
                user_line_id = custom_user.LINE_ID or ''
                user_email = custom_user.mail or request.user.email
            else:
                user_email = request.user.email or ''
        except Exception as e:
            print(f"獲取用戶聯絡資訊失敗: {e}")
            user_email = request.user.email or ''
        
        return render(request, 'join_create.html', {
            'form': form_obj,
            'banned_words': BANNED_WORDS,
            'user_phone': user_phone,
            'user_line_id': user_line_id,
            'user_email': user_email,
        })

    if request.method == 'GET':
        return render_form(ActivityForm())
    elif request.method == 'POST':
        # ❶ 前置禁用詞檢查（不依賴 form.is_valid）
        #    覆蓋所有字串欄位：title / description / address / contact...
        text_blob = " ".join(v for v in request.POST.values() if isinstance(v, str))
        if contains_banned_content(text_blob):
            msg = '輸入內容包含禁止或不當詞彙，請重新編輯。'
            if is_ajax(request):
                return JsonResponse({'ok': False, 'success': False, 'message': msg}, status=400)
            messages.error(request, msg)
            return render_form(ActivityForm(request.POST, request.FILES))

        # ❷ 無禁用詞才做表單驗證
        form = ActivityForm(request.POST, request.FILES)
        if form.is_valid():
            try:
                activity = form.save(commit=False)
                activity.user = request.user
                
                # 處理聯絡方式選擇
                contact_method = request.POST.get('contact_method')
                if contact_method:
                    try:
                        # 嘗試通過email關聯自定義User模型
                        from .models import User
                        custom_user = User.objects.filter(mail=request.user.email).first()
                        
                        if contact_method == 'phone' and custom_user and custom_user.phone:
                            activity.contact_info = f"電話: {custom_user.phone}"
                        elif contact_method == 'line' and custom_user and custom_user.LINE_ID:
                            activity.contact_info = f"LINE: {custom_user.LINE_ID}"
                        elif contact_method == 'email':
                            email = (custom_user.mail if custom_user else '') or request.user.email
                            if email:
                                activity.contact_info = f"Email: {email}"
                            else:
                                activity.contact_info = "請聯絡發起者"
                        else:
                            activity.contact_info = "請聯絡發起者"
                    except Exception as e:
                        print(f"處理聯絡方式選擇失敗: {e}")
                        activity.contact_info = "請聯絡發起者"
                
                activity.save()
                if is_ajax(request):
                    return JsonResponse(
                        {'ok': True, 'success': True, 'message': '活動創建成功！', 'activity_id': activity.id},
                        status=201
                    )
                messages.success(request, '活動創建成功！')
                return redirect('activity_list')
            except Exception as e:
                msg = f'創建活動時發生錯誤: {str(e)}'
                if is_ajax(request):
                    return JsonResponse({'ok': False, 'success': False, 'message': msg}, status=500)
                messages.error(request, msg)
                return render_form(form)

        # ❸ 表單驗證失敗（非禁用詞）- 返回詳細錯誤訊息
        if is_ajax(request):
            # 將 form.errors 轉換為友善的錯誤訊息
            error_messages = []
            field_names = {
                'title': '活動標題',
                'activity_type': '活動類型',
                'description': '活動說明',
                'date': '活動日期',
                'time': '活動時間',
                'address': '活動地點',
                'max_participants': '參加人數上限',
                'cover_image': '封面圖片',
                'contact_info': '聯絡方式',
            }
            
            for field, errors in form.errors.items():
                field_label = field_names.get(field, field)
                for error in errors:
                    error_messages.append(f"{field_label}: {error}")
            
            final_message = '\n'.join(error_messages) if error_messages else '表單填寫有誤，請檢查後重試'
            
            return JsonResponse({
                'ok': False, 
                'success': False, 
                'message': final_message,
                'errors': form.errors  # 保留原始錯誤結構供前端使用
            }, status=400)

        # 非 AJAX 請求時，將錯誤顯示給用戶
        for field, errors in form.errors.items():
            for error in errors:
                messages.error(request, f"{field}: {error}")
        return render_form(form)

    # 其他 HTTP 方法
    if is_ajax(request):
        return JsonResponse({'ok': False, 'success': False, 'message': '僅接受 GET 和 POST 請求'}, status=405)
    messages.error(request, '僅接受 GET 和 POST 請求')
    return render_form(ActivityForm())

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

def _parse_request_data(request):
    """優先解析 JSON，失敗時退回 POST（避免 Content-Type 與 body 不一致造成 400）"""
    ctype = (request.content_type or "").lower()
    if "application/json" in ctype:
        try:
            return json.loads(request.body or "{}")
        except Exception:
            # 直接退回 POST，而不是丟 400
            return request.POST
    return request.POST

def _json_error(message, status=400):
    return JsonResponse({"success": False, "ok": False, "message": message}, status=status)

def _json_ok(payload=None, status=200):
    base = {"success": True, "ok": True}
    if payload:
        base.update(payload)
    return JsonResponse(base, status=status)

@csrf_exempt
@login_required
def add_comment(request, activity_id):
    if request.method != "POST":
        return _json_error("僅支援 POST 請求", status=405)

    a = get_object_or_404(GroupActivity, id=activity_id)

    data = _parse_request_data(request)
    content   = (data.get("content") or "").strip()
    parent_id = data.get("parent_id") or None

    if not content:
        return _json_error("留言內容不能為空")

    if contains_banned_content(content):
        return _json_error("輸入內容包含禁止或不當詞彙，請重新編輯。")

    parent = None
    if parent_id:
        parent = get_object_or_404(ActivityComment, id=parent_id, activity=a)

    comment = ActivityComment.objects.create(
        activity=a,
        user=request.user,
        content=content,
        parent=parent
    )

    user_avatar = "/static/image/avatar24-01.jpg"
    display_name = get_user_display_name(request.user)

    return _json_ok({
        "comment": {
            "id": comment.id,
            "content": comment.content,
            "user_name": display_name,
            "user_avatar": user_avatar,
            "created_at": comment.created_at.strftime("%Y-%m-%d %H:%M"),
            "likes_count": 0,
            "is_liked": False
        },
        "message": "留言成功"
    }, status=200)

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

# -----------------------
# 調試禁用詞檢查
# -----------------------
@csrf_exempt
def debug_content_filter(request):
    """調試禁用詞過濾功能"""
    if request.method != 'POST':
        return JsonResponse({'error': '僅支援 POST 請求'}, status=405)
    
    try:
        data = json.loads(request.body)
        text = data.get('text', '')
        
        if not text:
            return JsonResponse({'error': '請提供要檢查的文字'}, status=400)
        
        debug_result = debug_banned_content(text)
        
        return JsonResponse({
            'success': True,
            'text': text,
            'has_banned_content': debug_result['has_banned'],
            'found_words': debug_result['found_words'],
            'normalized_text': debug_result['normalized_text']
        })
        
    except Exception as e:
        return JsonResponse({'error': f'檢查失敗: {str(e)}'}, status=500)
