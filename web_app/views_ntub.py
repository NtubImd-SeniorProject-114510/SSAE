from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib import messages
from django.conf import settings
import json
import logging

from .services.ntub_client import ntub_client, NTUBAPIException

logger = logging.getLogger(__name__)

@login_required
def ntub_dashboard(request):
    """北商學生資訊系統儀表板"""
    context = {
        'api_available': ntub_client.check_api_health(),
        'user': request.user
    }
    return render(request, 'ntub/dashboard.html', context)

def ntub_test_page(request):
    """北商系統測試頁面"""
    context = {
        'api_available': ntub_client.check_api_health()
    }
    return render(request, 'ntub/test.html', context)

@csrf_exempt
@require_http_methods(["POST"])
def input_captcha(request):
    """手動輸入驗證碼"""
    try:
        data = json.loads(request.body)
        session_token = data.get('sessionToken', '').strip()
        captcha_text = data.get('captchaText', '').strip()
        
        if not session_token or not captcha_text:
            return JsonResponse({
                'success': False,
                'message': 'Session token和驗證碼為必填項目'
            })
        
        # 調用Node.js API
        result = ntub_client._make_request('POST', '/input-captcha', {
            'sessionToken': session_token,
            'captchaText': captcha_text
        })
        
        return JsonResponse(result)
        
    except Exception as e:
        logger.error(f"驗證碼輸入失敗: {e}")
        return JsonResponse({
            'success': False,
            'message': '驗證碼輸入失敗，請稍後再試'
        })

@csrf_exempt
@require_http_methods(["POST"])
def ntub_login(request):
    """北商系統登入"""
    try:
        data = json.loads(request.body)
        student_id = data.get('student_id', '').strip()
        password = data.get('password', '').strip()
        
        if not student_id or not password:
            return JsonResponse({
                'success': False,
                'message': '請輸入學號和密碼'
            })
        
        # 調用爬蟲API進行登入
        result = ntub_client.login(student_id, password)
        
        if result.get('success'):
            # 將學號存入session
            request.session['ntub_student_id'] = student_id
            request.session['ntub_logged_in'] = True
            request.session.save()  # 確保session被保存
            
            logger.info(f"用戶成功綁定北商學號 {student_id}")
            
            # 返回成功響應
            return JsonResponse({
                'success': True,
                'message': '登入成功！正在跳轉...',
                'student_id': student_id
            })
        else:
            # 返回原始結果（可能包含驗證碼要求）
            # 確保總是有錯誤訊息
            if not result.get('message'):
                result['message'] = '登入失敗，請檢查學號和密碼'
            return JsonResponse(result)
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': '請求格式錯誤'
        })
    except Exception as e:
        logger.error(f"北商登入錯誤: {e}")
        return JsonResponse({
            'success': False,
            'message': '登入服務暫時不可用'
        })

@login_required
def get_student_profile(request):
    """獲取學生基本資料"""
    if not request.session.get('ntub_logged_in'):
        return JsonResponse({
            'success': False,
            'message': '請先登入北商系統'
        })
    
    try:
        student_id = request.session.get('ntub_student_id')
        
        if not student_id:
            return JsonResponse({
                'success': False,
                'message': '請先登入北商系統'
            })
        
        result = ntub_client.get_student_profile(student_id)
        
        return JsonResponse(result)
        
    except Exception as e:
        logger.error(f"獲取學生資料錯誤: {e}")
        return JsonResponse({
            'success': False,
            'message': '獲取資料失敗'
        })

@login_required
def get_grades(request):
    """獲取學生成績"""
    if not request.session.get('ntub_logged_in'):
        return JsonResponse({
            'success': False,
            'message': '請先登入北商系統'
        })
    
    try:
        student_id = request.session.get('ntub_student_id')
        semester = request.GET.get('semester')
        
        result = ntub_client.get_grades(student_id, semester)
        
        return JsonResponse(result)
        
    except Exception as e:
        logger.error(f"獲取成績錯誤: {e}")
        return JsonResponse({
            'success': False,
            'message': '獲取成績失敗'
        })

@login_required
def get_schedule(request):
    """獲取學生課表"""
    if not request.session.get('ntub_logged_in'):
        return JsonResponse({
            'success': False,
            'message': '請先登入北商系統'
        })
    
    try:
        student_id = request.session.get('ntub_student_id')
        semester = request.GET.get('semester')
        
        if not student_id:
            return JsonResponse({
                'success': False,
                'message': '請先登入北商系統'
            })
        
        logger.info(f"獲取學號 {student_id} 的課表，學期: {semester}")
        result = ntub_client.get_schedule(student_id, semester)
        logger.info(f"課表獲取結果: {result.get('success')}")
        
        return JsonResponse(result)
        
    except Exception as e:
        logger.error(f"獲取課表錯誤: {e}")
        return JsonResponse({
            'success': False,
            'message': '獲取課表失敗'
        })

@login_required
def ntub_logout(request):
    """北商系統登出"""
    try:
        if request.session.get('ntub_logged_in'):
            student_id = request.session.get('ntub_student_id')
            
            # 調用API登出
            ntub_client.logout(student_id)
            
            # 清除session
            request.session.pop('ntub_student_id', None)
            request.session.pop('ntub_logged_in', None)
            
            logger.info(f"用戶 {request.user.username} 已登出北商系統")
        
        return JsonResponse({
            'success': True,
            'message': '登出成功'
        })
        
    except Exception as e:
        logger.error(f"北商登出錯誤: {e}")
        return JsonResponse({
            'success': False,
            'message': '登出失敗'
        })

@login_required
def student_info_page(request):
    """學生資訊頁面"""
    if not request.session.get('ntub_logged_in'):
        messages.warning(request, '請先登入北商學生資訊系統')
        return redirect('ntub_dashboard')
    
    context = {
        'student_id': request.session.get('ntub_student_id'),
        'user': request.user
    }
    
    return render(request, 'ntub/student_info.html', context)

@login_required
def grades_page(request):
    """成績查詢頁面"""
    if not request.session.get('ntub_logged_in'):
        messages.warning(request, '請先登入北商學生資訊系統')
        return redirect('ntub_dashboard')
    
    context = {
        'student_id': request.session.get('ntub_student_id'),
        'user': request.user
    }
    
    return render(request, 'ntub/grades.html', context)

@login_required
def schedule_page(request):
    """課表查詢頁面"""
    if not request.session.get('ntub_logged_in'):
        messages.warning(request, '請先登入北商學生資訊系統')
        return redirect('ntub_dashboard')
    
    context = {
        'student_id': request.session.get('ntub_student_id'),
        'user': request.user
    }
    
    return render(request, 'ntub/schedule.html', context)
