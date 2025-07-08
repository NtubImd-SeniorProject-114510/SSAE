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

def index(request):
    return render(request, 'index.html')

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
                "timestamp": m["timestamp"].strftime("%Y-%m-%d %H:%M:%S")
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

    # 呼叫現有 RAG 邏輯
    result = ask_question(question)
    answer = result["answer"]
    
    # 存入 MongoDB
    add_message(convo_id, question, answer)
    
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