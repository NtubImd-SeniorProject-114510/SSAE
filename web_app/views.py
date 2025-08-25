#web_app\views.py

import os
import json
import zipfile
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
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
    return render(request, 'personal.html')

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

def book(request):
    return render(request, 'book.html')

def book_detail(request):
    return render(request, 'book_detail.html')

def upload_book(request):
    if request.method == 'POST':
        # 處理表單提交
        try:
            book_title = request.POST.get('bookTitle')
            department = request.POST.get('department')
            grade = request.POST.get('grade')
            book_type = request.POST.get('bookType')
            price = request.POST.get('price')
            condition = request.POST.get('condition')
            description = request.POST.get('bookDescription')
            transaction_methods = request.POST.getlist('transactionMethod')
            book_image = request.FILES.get('bookImage')
            
            # 這裡可以添加保存到數據庫的邏輯
            # ...
            
            # 返回成功響應
            return JsonResponse({'status': 'success', 'message': '書籍上傳成功！'})
        except Exception as e:
            # 返回錯誤響應
            return JsonResponse({'status': 'error', 'message': f'上傳失敗: {str(e)}'})
    else:
        # GET 請求，顯示表單頁面
        return render(request, 'book.html')

def ask_page(request):
    return render(request, "ask.html")

def comment(request):
    return render(request, "comment.html")

def comment_detail(request):
    return render(request, "comment_detail.html")

def add_comment(request):
    return render(request, "add_comment.html")

def personal(request):
    return render(request, "personal.html")

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

USER_ID = "guest"  # 可改為 session 或 request.user.id

def chat_page(request):
    # 首次載入時不帶任何對話，前端會自動建立
    return render(request, "ask.html")

@csrf_exempt
def api_conversations(request):
    if request.method == "GET":
        convos = get_conversations(USER_ID)
        return JsonResponse({"conversations": convos})
    if request.method == "POST":
        data = json.loads(request.body)
        title = data.get("title", "新對話")
        convo_id = create_conversation(USER_ID, title)
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
    data = json.loads(request.body)
    question = data.get("question", "").strip()
    convo_id = data.get("conversation_id")
    if not question or not convo_id:
        return JsonResponse({"error": "缺少 question 或 conversation_id"}, status=400)

    # 🔥 關鍵：獲取「這個對話」的歷史記錄
    conversation_history = get_messages(convo_id)
    
    # 🔥 關鍵：將歷史記錄傳給 RAG 系統
    result = ask_question(question, conversation_history)
    answer = result["answer"]
    
    # 存入 MongoDB
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
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Count, Q
from django.utils import timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime

from .models import GroupActivity, ActivityParticipant
from .forms import ActivityForm

# -----------------------
# 列出活動
# -----------------------
def activity_list(request):
    # 使用 annotate 計算參與者數量，避免 N+1 查詢問題
    activities = (GroupActivity.objects
        .annotate(participants_count=Count('participants', filter=Q(participants__status='joined')))
        .order_by('date', 'time', 'deadline')
    )

    joined_ids = []
    if request.user.is_authenticated:
        joined_ids = list(ActivityParticipant.objects.filter(
            user_id=request.user.id, status='joined'
        ).values_list('activity_id', flat=True))

    return render(request, 'join.html', {
        'activities': activities,
        'joined_ids': joined_ids,
    })

# -----------------------
# 活動詳情
# -----------------------
def activity_detail(request, pk):
    a = get_object_or_404(GroupActivity, pk=pk)
    
    # 計算參加人數
    participants_count = ActivityParticipant.objects.filter(
        activity_id=a.id, status='joined'
    ).count()
    a.participants_count = participants_count
    
    joined = False
    if request.user.is_authenticated:
        joined = ActivityParticipant.objects.filter(
            activity_id=a.id, user_id=request.user.id, status='joined'
        ).exists()
    
    return render(request, 'join_detail.html', {
        'a': a, 
        'joined': joined
    })

# -----------------------
# 加入活動
# -----------------------
@login_required
def join_activity(request, pk):
    if request.method != 'POST':
        return redirect('join_detail', pk=pk)
    
    a = get_object_or_404(GroupActivity, pk=pk)

    # 計算當前已加入人數
    current_joined_count = ActivityParticipant.objects.filter(
        activity_id=a.id, status='joined'
    ).count()

    # 檢查是否已超過報名截止時間
    if a.is_deadline_passed:
        messages.error(request, '已超過報名截止時間')
        return redirect('join_detail', pk=pk)
    
    # 檢查是否已額滿
    if current_joined_count >= a.max_participants:
        messages.error(request, '本活動已額滿')
        return redirect('join_detail', pk=pk)

    # 檢查用戶是否已經報名
    existing_participant = ActivityParticipant.objects.filter(
        activity_id=a.id, user_id=request.user.id
    ).first()
    
    if existing_participant and existing_participant.status == 'joined':
        messages.info(request, '您已經報名此活動')
        return redirect('join_detail', pk=pk)

    # 創建或更新參與者記錄
    ActivityParticipant.objects.update_or_create(
        activity_id=a.id, user_id=request.user.id,
        defaults={
            'status': 'joined', 
            'joined_at': timezone.now(), 
            'updated_at': timezone.now()
        }
    )

    # 重新計算已報名人數
    updated_joined_count = ActivityParticipant.objects.filter(
        activity_id=a.id, status='joined'
    ).count()

    messages.success(request, '報名成功！')

    # 如果是 AJAX 請求，返回 JSON 響應
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({
            'ok': True, 
            'participants': updated_joined_count,
            'message': '報名成功！'
        })
    
    return redirect('join_detail', pk=pk)

# -----------------------
# 取消活動
# -----------------------
@login_required
def cancel_activity(request, pk):
    if request.method != 'POST':
        return redirect('join_detail', pk=pk)
    
    a = get_object_or_404(GroupActivity, pk=pk)
    
    # 查找用戶的參與記錄
    participant = ActivityParticipant.objects.filter(
        activity_id=a.id, user_id=request.user.id, status='joined'
    ).first()
    
    if not participant:
        messages.warning(request, '您尚未報名此活動')
        return redirect('join_detail', pk=pk)
    
    # 更新狀態為已取消
    participant.status = 'cancelled'
    participant.updated_at = timezone.now()
    participant.save()

    # 重新計算已報名人數
    updated_joined_count = ActivityParticipant.objects.filter(
        activity_id=a.id, status='joined'
    ).count()

    messages.info(request, '已取消參加')
    
    # 如果是 AJAX 請求，返回 JSON 響應
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({
            'ok': True, 
            'participants': updated_joined_count,
            'message': '已取消參加'
        })
    
    return redirect('join_detail', pk=pk)

# -----------------------
# 建立活動（支持 AJAX 和表單提交）
# -----------------------
@csrf_exempt
@login_required
def create_activity(request):
    if request.method == 'GET':
        # 如果是 GET 請求，渲染表單頁面
        form = ActivityForm()
        return render(request, 'join_create.html', {'form': form})
    
    elif request.method == 'POST':
        form = ActivityForm(request.POST, request.FILES)
        
        if form.is_valid():
            try:
                # 保存活動，設置發起者為當前用戶
                activity = form.save(commit=False)
                activity.user = request.user
                activity.save()
                
                # 如果是 AJAX 請求
                if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                    return JsonResponse({
                        'ok': True, 
                        'message': '活動創建成功！',
                        'activity_id': activity.id
                    })
                else:
                    # 普通表單提交
                    messages.success(request, '活動創建成功！')
                    return redirect('activity_list')
                    
            except Exception as e:
                # 如果是 AJAX 請求
                if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                    return JsonResponse({
                        'ok': False, 
                        'errors': {'general': [f'創建活動時發生錯誤: {str(e)}']}
                    })
                else:
                    messages.error(request, f'創建活動時發生錯誤: {str(e)}')
                    
        else:
            # 表單驗證失敗
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({
                    'ok': False, 
                    'errors': form.errors
                })
            else:
                messages.error(request, '表單填寫有誤，請檢查後重試')
        
        # 如果是普通表單提交且有錯誤，重新渲染表單
        return render(request, 'join_create.html', {'form': form})
    
    # 其他 HTTP 方法
    return JsonResponse({'ok': False, 'errors': {'general': ['僅接受 GET 和 POST 請求']}})

# -----------------------
# 用戶參與的活動列表（可選功能）
# -----------------------
@login_required
def my_activities(request):
    """用戶參與的活動列表"""
    # 用戶參與的活動
    joined_activities = GroupActivity.objects.filter(
        participants__user=request.user,
        participants__status='joined'
    ).annotate(
        participants_count=Count('participants', filter=Q(participants__status='joined'))
    ).order_by('date', 'time')
    
    # 用戶創建的活動
    created_activities = GroupActivity.objects.filter(
        user=request.user
    ).annotate(
        participants_count=Count('participants', filter=Q(participants__status='joined'))
    ).order_by('date', 'time')
    
    return render(request, 'my_activities.html', {
        'joined_activities': joined_activities,
        'created_activities': created_activities,
    })

# -----------------------
# 活動參與者列表（可選功能）
# -----------------------
@login_required
def activity_participants(request, pk):
    """查看活動參與者列表"""
    activity = get_object_or_404(GroupActivity, pk=pk)
    
    # 只有活動發起者才能查看參與者詳細信息
    if request.user != activity.user:
        messages.error(request, '您沒有權限查看此活動的參與者信息')
        return redirect('activity_detail', pk=pk)
    
    participants = ActivityParticipant.objects.filter(
        activity=activity, status='joined'
    ).select_related('user').order_by('joined_at')
    
    return render(request, 'activity_participants.html', {
        'activity': activity,
        'participants': participants,
    })