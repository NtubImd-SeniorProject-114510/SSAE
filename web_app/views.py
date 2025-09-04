# web_app\views.py

import os
import json
import zipfile
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods, require_GET
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from django.db import models
from .views_rag import ask_question, create_vector_store, load_pdf_documents, split_documents
from django.contrib.auth.decorators import login_required

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

from .models import ActivityComment, Book2, Course, CourseReview

from .models import Department, Category
######
from .models import Course, Departmentd, Academica, AcadeGrade, AcadeDepart,CourseReview, CourseStar

from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

from django.shortcuts import render, get_object_or_404, redirect
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.contrib.auth.decorators import login_required
from .models import Book2, Category, Academic, AcademicGrade, Department
from .forms import Book2Form

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
    academic_grades = AcademicGrade.objects.all()
    departments = Department.objects.all()

    return render(request, 'book.html', {
        'books': books,
        'form': form,
        'categories': categories,
        'academics': academics,
        'academic_grades': academic_grades,
        'departments': departments,
        'items_per_row': items_per_row,  # 傳給前端
    })

def book_2(request):
    return render(request, 'book_2.html')

from django.shortcuts import get_object_or_404
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
            return redirect('book')
    else:
        form = Book2Form()
    return render(request, 'book.html', {'form': form, 'books': Book2.objects.all()})

def ask_page(request):
    return render(request, "ask.html")
    
from django.template.loader import render_to_string
from django.http import JsonResponse

def filter_books(request):
    books = Book2.objects.all()

    # 篩選條件...
    category = request.GET.get('category')
    if category:
        books = books.filter(category__id=category)

    # 產生 HTML（使用 book_cards.html）
    html = render_to_string('book_cards.html', {'books': books})
    return JsonResponse({"html": html, "count": books.count()})

##########
def comment(request):
    academics = Academica.objects.all()
    departments = Departmentd.objects.all()
    grades = list(AcadeGrade.objects.values_list('grade_level', flat=True).distinct())

    # Prepare data for dynamic filtering
    departments_data = {}
    grades_data = {}

    # 所有學制時，顯示所有科系、所有年級
    departments_data[0] = list(Departmentd.objects.all().values('id', 'name'))
    grades_data[0] = list(AcadeGrade.objects.values_list('grade_level', flat=True).distinct())

    for academic in academics:
        # 只處理 academic.id 是數字的情況
        if not str(academic.id).isdigit():
            continue
        departments_data[academic.id] = list(
            Departmentd.objects.filter(
                acadedepart__academica=academic.id
            ).values('id', 'name')
        )
        grades_data[academic.id] = list(
            AcadeGrade.objects.filter(academica=academic.id).values_list('grade_level', flat=True).distinct()
        )

    # Get all courses with related data
    courses = Course.objects.select_related('departmentd', 'academica').all()
    
    # Prepare courses data for the template
    courses_data = [{
        'id': course.id,
        'course_id': course.course_id,
        'course_name': course.course_name,
        'course_teacher': course.course_teacher,
        'academic_id': course.academica_id,
        'academic_name': course.academica.name if course.academica else '',
        'department_id': course.departmentd_id,
        'department_name': course.departmentd.name if course.departmentd else '',
        'grade_level': course.grade_level,
    } for course in courses]
    
    # Convert data to JSON for the template
    import json
    departments_json = json.dumps(departments_data)
    courses_json = json.dumps(courses_data)
    
    return render(request, "comment.html", {
        "academics": academics,
        "departments": departments,
        "grades": grades,
        "departments_data": departments_json,
        "grades_data": grades_data,
        "courses": courses,
        "courses_json": courses_json,
    })


def get_courses(request):
    academic_id = request.GET.get("academic_id")
    department_id = request.GET.get("department_id")
    grade = request.GET.get("grade")
    search_query = request.GET.get("search", "").strip()
    course_id = request.GET.get("course_id")  # 新增 course_id 參數

    # Start with all courses and use select_related to optimize database queries
    courses = Course.objects.select_related('departmentd', 'academica').all()

    # 如果有提供 course_id，優先使用它來查詢
    if course_id:
        if str(course_id).isdigit():
            courses = courses.filter(id=course_id)
        else:
            # 如果不是數字，嘗試通過 course_id 欄位查找
            courses = courses.filter(course_id=course_id)
    else:
        # 否則使用其他過濾條件
        if academic_id and academic_id.isdigit():
            courses = courses.filter(academica_id=academic_id)
        
        if department_id and department_id.isdigit():
            courses = courses.filter(departmentd_id=department_id)
        
        if grade:
            courses = courses.filter(grade_level__contains=grade)
        
        # Apply search query if provided
        if search_query:
            courses = courses.filter(
                Q(course_name__icontains=search_query) |
                Q(course_teacher__icontains=search_query) |
                Q(course_id__icontains=search_query)
            )

    # Prepare the response data
    data = []
    for course in courses:
        data.append({
            "id": course.id,  # 使用資料庫中的主鍵 id
            "course_id": course.course_id,  # 保留 course_id 用於顯示
            "course_name": course.course_name,
            "course_teacher": course.course_teacher,
            "academic_id": course.academica_id,
            "academic_name": course.academica.name if course.academica else "",
            "department_id": course.departmentd_id,
            "department_name": course.departmentd.name if course.departmentd else "",
            "grade_level": course.grade_level,
        })

    return JsonResponse(data, safe=False)


@csrf_exempt
@login_required
def add_comment(request, course_id):
    try:
        # Convert course_id to integer if it's not already
        course_id = int(course_id)
        course = get_object_or_404(Course, id=course_id)
    except (ValueError, TypeError):
        return JsonResponse({'error': '無效的課程ID'}, status=400)
        
    if request.method == 'POST':
        data = json.loads(request.body)
        content = data.get('content', '').strip()
        rating = data.get('rating', 5)  # Default to 5 if not provided
        
        if not content:
            return JsonResponse({'error': '評論內容不能為空'}, status=400)
        
        # Validate rating
        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                raise ValueError("Rating must be between 1 and 5")
        except (ValueError, TypeError):
            return JsonResponse({'error': '評分必須是1-5的數字'}, status=400)
        
        # Create or update review
        review, created = CourseReview.objects.update_or_create(
            course=course,
            user=request.user,
            defaults={
                'content': content,
                'rating': rating
            }
        )
        
        # 獲取用戶頭像
        user_avatar = '/static/image/avatar24-01.jpg'  # 預設頭像
        if hasattr(request.user, 'social_auth'):
            social = request.user.social_auth.filter(provider='google-oauth2').first()
            if social and 'picture' in social.extra_data:
                user_avatar = social.extra_data['picture']
        
        return JsonResponse({
            'success': True,
            'is_new': created,
            'review': {
                'id': review.id,
                'content': review.content,
                'rating': review.rating,
                'user_name': request.user.first_name or request.user.username,
                'user_avatar': user_avatar,
                'created_at': review.created_at.strftime('%Y-%m-%d %H:%M'),
                'updated_at': review.updated_at.strftime('%Y-%m-%d %H:%M') if review.updated_at else None
            }
        })
    
    return JsonResponse({'error': '僅支援 POST 請求'}, status=405)


@csrf_exempt
@login_required
def delete_review(request, review_id):
    if request.method == 'POST':
        review = get_object_or_404(CourseReview, id=review_id, user=request.user)
        review.delete()
        return JsonResponse({'success': True})
    
    return JsonResponse({'error': '僅支援 POST 請求'}, status=405)


@csrf_exempt
@login_required
def toggle_like(request, comment_id):
    if request.method == 'POST':
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
    
    return JsonResponse({'error': '僅支援 POST 請求'}, status=405)


def comment_detail(request):
    """View to display course reviews and comments"""
    course_id = request.GET.get('course_id')
    if not course_id:
        from django.http import HttpResponseBadRequest
        return HttpResponseBadRequest("Missing course_id parameter")
        
    course = get_object_or_404(Course, id=course_id)
    reviews = CourseReview.objects.filter(course=course).select_related('user').order_by('-created_at')
    
    # Get user's review if exists
    user_review = None
    if request.user.is_authenticated:
        try:
            user_review = CourseReview.objects.get(course=course, user=request.user)
        except CourseReview.DoesNotExist:
            pass
    
    course = get_object_or_404(Course, id=course_id)
    reviews = course.reviews.all()
    
    # Calculate average rating from reviews
    avg_rating = reviews.aggregate(
        avg_rating=Avg('rating')
    )['avg_rating']
    
    # Get star counts for each rating (1-5)
    star_counts = reviews.exclude(rating__isnull=True).values('rating').annotate(
        count=Count('rating')
    ).order_by('rating')
    
    star_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for item in star_counts:
        rating = item['rating']
        if rating and 1 <= rating <= 5:  # Validate rating value
            star_distribution[rating] = item['count']
    
    context = {
        'course': course,
        'reviews': reviews,
        'user_review': user_review,
        'avg_rating': round(avg_rating, 1) if avg_rating is not None else '尚無評分',
        'review_count': reviews.count(),
        'academic': course.academica,
        'department': course.departmentd,
        'star_distribution': star_distribution,
        'total_ratings': sum(star_distribution.values()),
    }
    return render(request, "comment_detail.html", context)

def add_comment(request):
    import json
    from .models import Course, Departmentd, Academica, AcadeDepart, AcadeGrade

    academics = Academica.objects.all()
    departments = Departmentd.objects.all()
    grades = list(AcadeGrade.objects.values_list('grade_level', flat=True).distinct())

    # 資料對應 dicts
    departments_data = {}
    grades_data = {}

    # 預設學制 0 時顯示全部
    departments_data[0] = list(departments.values('id', 'name'))
    grades_data[0] = grades

    for academic in academics:
        if not str(academic.id).isdigit():
            continue

        departments_data[academic.id] = list(
            Departmentd.objects.filter(
                acadedepart__academica=academic.id
            ).values('id', 'name')
        )

        grades_data[academic.id] = list(
            AcadeGrade.objects.filter(
                academica=academic.id
            ).values_list('grade_level', flat=True).distinct()
        )

    # 課程資料
    courses = Course.objects.select_related('departmentd', 'academica').all()
    courses_data = [{
        'id': course.id,
        'course_id': course.course_id,
        'course_name': course.course_name,      # 確保course_name欄位存在
        'course_teacher': course.course_teacher,
        'academic_id': course.academica_id,
        'academic_name': course.academica.name if course.academica else '',
        'department_id': course.departmentd_id,
        'department_name': course.departmentd.name if course.departmentd else '',
        'grade_level': course.grade_level,
    } for course in courses]

    # 是否有選到某課程
    course_id = request.GET.get('course_id') or request.GET.get('course')
    selected_course = None
    selected_teacher = None
    selected_academic = None
    selected_department = None
    selected_grade = None

    if course_id:
        try:
            selected_course = Course.objects.get(id=course_id)
            selected_teacher = selected_course.course_teacher
            selected_academic = selected_course.academica
            selected_department = selected_course.departmentd

            if selected_course.grade_level:
                grades_split = selected_course.grade_level.split(',')
                selected_grade = grades_split[0].strip() if grades_split else None
        except Course.DoesNotExist:
            pass

    return render(request, "add_comment.html", {
        "academics": academics,
        "departments": departments,
        "grades": grades,
        "departments_data": json.dumps(departments_data, ensure_ascii=False),
        "grades_data": json.dumps(grades_data, ensure_ascii=False),
        "courses": courses,
        "courses_json": json.dumps(courses_data, ensure_ascii=False),  # 這裡有回傳 JSON 格式資料
        "selected_course": selected_course,
        "selected_teacher": selected_teacher,
        "selected_academic": selected_academic,
        "selected_department": selected_department,
        "selected_grade": selected_grade,
    })




# API Endpoints for Dynamic Dropdowns
@require_GET
def get_departments(request):
    """API endpoint to get departments for a given academic system"""
    academic_id = request.GET.get('academic_id')
    if not academic_id:
        return JsonResponse({'error': 'Missing academic_id parameter'}, status=400)
    
    try:
        from .models import AcadeDepart, Department, Academica
        
        # Get the academic system
        academic = Academica.objects.get(id=academic_id)
        
        # Get department IDs for the selected academic system
        dept_ids = AcadeDepart.objects.filter(academica=academic).values_list('departmentd_id', flat=True)
        departments = Department.objects.filter(id__in=dept_ids).values('id', 'name')
        
        return JsonResponse({
            'success': True,
            'departments': list(departments)
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@require_GET
def get_grades(request):
    """API endpoint to get grades for a given academic system"""
    academic_id = request.GET.get('academic_id')
    if not academic_id:
        return JsonResponse({'error': 'Missing academic_id parameter'}, status=400)
    
    try:
        from .models import AcadeGrade, Academica
        
        # Get the academic system
        academic = Academica.objects.get(id=academic_id)
        
        # Get all unique grade levels for this academic system
        grades = AcadeGrade.objects.filter(academica=academic).values_list('grade_level', flat=True).distinct()
        
        # If no specific grades found, return default grades
        if not grades:
            grades = ['一', '二', '三', '四', '五']
        else:
            # Convert to list and remove duplicates
            grades = list(set(grades))
            # Sort grades if needed
            grade_order = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5}
            grades.sort(key=lambda x: grade_order.get(x, 99))
        
        return JsonResponse({
            'success': True,
            'grades': list(grades)
        })
    except Exception as e:
        return JsonResponse({'error': str(e), 'grades': ['一', '二', '三', '四', '五']}, status=200)

# API Views for Course Reviews
@csrf_exempt
@login_required
@require_http_methods(["POST"])
def create_course_review(request, course_id):
    try:
        # 處理不同類型的 course_id
        if not str(course_id).isdigit():
            # 如果不是數字，嘗試通過 course_id 欄位查找
            course = Course.objects.filter(course_id=course_id).first()
            if not course and '_' in course_id:
                # 如果找不到且包含底線，嘗試分割 course_id 獲取數字部分
                numeric_part = course_id.split('_')[0]
                if numeric_part.isdigit():
                    course = Course.objects.filter(id=int(numeric_part)).first()
        else:
            # 如果是數字，直接通過 id 查找
            course = Course.objects.filter(id=int(course_id)).first()
            
        if not course:
            return JsonResponse({'error': f'找不到 ID 為 {course_id} 的課程'}, status=404)
            
        data = json.loads(request.body)
        
        # Create or update review
        review, created = CourseReview.objects.update_or_create(
            course=course,
            user=request.user,
            defaults={
                'content': data.get('content'),
                'rating': int(data.get('rating', 5))
            }
        )
        
        return JsonResponse({
            'success': True,
            'is_new': created,
            'review': {
                'id': review.id,
                'content': review.content,
                'rating': review.rating,
                'user_name': request.user.first_name or request.user.username,
                'created_at': review.created_at.strftime('%Y-%m-%d %H:%M'),
                'updated_at': review.updated_at.strftime('%Y-%m-%d %H:%M') if review.updated_at else None
            }
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@login_required
@require_http_methods(["PUT"])
def update_course_review(request, course_id, review_id):
    try:
        review = get_object_or_404(CourseReview, id=review_id, user=request.user, course_id=course_id)
        data = json.loads(request.body)
        
        if 'content' in data:
            review.content = data['content']
        if 'rating' in data:
            review.rating = int(data['rating'])
        
        review.save()
        
        return JsonResponse({
            'success': True,
            'review': {
                'id': review.id,
                'content': review.content,
                'rating': review.rating,
                'updated_at': review.updated_at.strftime('%Y-%m-%d %H:%M')
            }
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@login_required
@require_http_methods(["DELETE"])
def delete_course_review(request, course_id, review_id):
    try:
        review = get_object_or_404(CourseReview, id=review_id, user=request.user, course_id=course_id)
        review.delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
#####




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

from django.shortcuts import render, get_object_or_404, redirect
from django.db import models
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Count, Q, F, Case, When, IntegerField, Prefetch, Avg
from django.utils import timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from datetime import date, datetime, timedelta

from .models import GroupActivity, ActivityParticipant
from .forms import ActivityForm

# -----------------------
# 列出活動
# -----------------------
def activity_list(request):
    activity_type = request.GET.get('type', '')
    location_type = request.GET.get('location_type', '')
    time_filter = request.GET.get('time', '')
    search_query = request.GET.get('search', '')
    
    activities = GroupActivity.objects.prefetch_related(
        Prefetch(
            'participants',
            queryset=ActivityParticipant.objects.filter(status='joined').select_related('user'),
            to_attr='joined_participants'
        )
    ).annotate(
        participants_count=Count('participants', filter=Q(participants__status='joined'), distinct=True)
    ).annotate(total_count=F('participants_count') + 1)
    
    if activity_type:
        activities = activities.filter(type=activity_type)
    if location_type:
        activities = activities.filter(location_type=location_type)
        
    today = date.today()
    if time_filter == 'today':
        activities = activities.filter(date=today)
    elif time_filter == 'this_week':
        end_week = today + timedelta(days=7-today.weekday())
        activities = activities.filter(date__range=[today, end_week])
    elif time_filter == 'this_month':
        activities = activities.filter(date__year=today.year, date__month=today.month)
    
    if search_query:
        activities = activities.filter(
            Q(title__icontains=search_query) |
            Q(description__icontains=search_query) |
            Q(location__icontains=search_query)
        )
    
    activities = activities.order_by(
        Case(When(deadline__lt=timezone.now().date(), then=1), default=0, output_field=IntegerField()),
        'date', 'time', 'deadline'
    )
    
    for a in activities:
        a.cleaned_participants = [p for p in a.joined_participants if p.user_id != a.user_id]

    # 只有登入用戶才需要取得參與狀態
    joined_ids, created_ids = [], []
    if request.user.is_authenticated:
        joined_ids = list(ActivityParticipant.objects.filter(user=request.user, status='joined').values_list('activity_id', flat=True))
        created_ids = list(GroupActivity.objects.filter(user=request.user).values_list('id', flat=True))

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
    participants = ActivityParticipant.objects.filter(activity=a, status='joined').select_related('user')
    participants_count = participants.count()
    total_participants = participants_count + 1
    remaining_slots = max(0, a.max_participants - total_participants)

    # 只有登入用戶才檢查參與狀態
    joined, is_creator = False, False
    if request.user.is_authenticated:
        joined = ActivityParticipant.objects.filter(activity=a, user=request.user, status='joined').exists()
        is_creator = (request.user == a.user)

    comments = ActivityComment.objects.filter(activity=a, parent=None).select_related('user').prefetch_related('replies__user', 'likes').order_by('-created_at')

    related_activities = list(GroupActivity.objects.filter(type=a.type, deadline__gte=timezone.now().date()).exclude(id=a.id).annotate(participants_count=Count('participants', filter=Q(participants__status='joined'))).order_by('-created_at')[:3])
    if len(related_activities) < 3:
        other_activities = list(GroupActivity.objects.filter(deadline__gte=timezone.now().date()).exclude(type=a.type).exclude(id=a.id).annotate(participants_count=Count('participants', filter=Q(participants__status='joined'))).order_by('-created_at')[:3-len(related_activities)])
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
    if current_joined_count >= a.max_participants:
        messages.error(request, '本活動已額滿')
        return redirect('activity_detail', pk=pk)

    existing_participant = ActivityParticipant.objects.filter(activity_id=a.id, user_id=request.user.id).first()
    if existing_participant and existing_participant.status == 'joined':
        messages.info(request, '您已經報名此活動')
        return redirect('activity_detail', pk=pk)

    ActivityParticipant.objects.update_or_create(activity_id=a.id, user_id=request.user.id, defaults={'status': 'joined', 'joined_at': timezone.now(), 'updated_at': timezone.now()})
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
                activity.user = request.user
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
    joined_activities = GroupActivity.objects.filter(participants__user=request.user, participants__status='joined').annotate(participants_count=Count('participants', filter=Q(participants__status='joined'))).order_by('date', 'time')
    created_activities = GroupActivity.objects.filter(user=request.user).annotate(participants_count=Count('participants', filter=Q(participants__status='joined'))).order_by('date', 'time')
    return render(request, 'my_activities.html', {'joined_activities': joined_activities, 'created_activities': created_activities})

# -----------------------
# 活動參與者列表
# -----------------------
@login_required
def activity_participants(request, pk):
    activity = get_object_or_404(GroupActivity, pk=pk)
    if request.user != activity.user:
        messages.error(request, '您沒有權限查看此活動的參與者信息')
        return redirect('activity_detail', pk=pk)
    
    participants = ActivityParticipant.objects.filter(activity=activity, status='joined').select_related('user').order_by('joined_at')
    return render(request, 'activity_participants.html', {'activity': activity, 'participants': participants})

# -----------------------
# 新增評論（保留 @login_required）
# -----------------------
@csrf_exempt
@login_required
def add_comment(request, activity_id):
    if request.method == 'POST':
        activity = get_object_or_404(GroupActivity, id=activity_id)
        data = json.loads(request.body)
        content = data.get('content', '').strip()
        parent_id = data.get('parent_id')
        
        if not content:
            return JsonResponse({'error': '評論內容不能為空'}, status=400)
        
        parent_comment = None
        if parent_id:
            parent_comment = get_object_or_404(ActivityComment, id=parent_id)
        
        comment = ActivityComment.objects.create(
            activity=activity,
            user=request.user,
            content=content,
            parent=parent_comment
        )
        
        # 獲取用戶頭像
        user_avatar = '/static/image/avatar24-01.jpg'  # 預設頭像
        if hasattr(request.user, 'social_auth'):
            social = request.user.social_auth.filter(provider='google-oauth2').first()
            if social and 'picture' in social.extra_data:
                user_avatar = social.extra_data['picture']
        
        return JsonResponse({
            'success': True,
            'comment': {
                'id': comment.id,
                'content': comment.content,
                'user_name': request.user.first_name or request.user.username,
                'user_avatar': user_avatar,
                'created_at': comment.created_at.strftime('%Y-%m-%d %H:%M'),
                'likes_count': 0,
                'is_liked': False
            }
        })
    
    return JsonResponse({'error': '僅支援 POST 請求'}, status=405)

# -----------------------
# 切換按讚（保留 @login_required）
# -----------------------
@csrf_exempt
@login_required
def toggle_like(request, comment_id):
    if request.method == 'POST':
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
            'likes_count': comment.likes_count
        })
    
    return JsonResponse({'error': '僅支援 POST 請求'}, status=405)
