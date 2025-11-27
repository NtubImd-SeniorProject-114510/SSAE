from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
import json

@csrf_exempt
@login_required
def update_profile(request):
    """更新個人資料 API"""
    if request.method != 'POST':
        return JsonResponse({'error': '只接受 POST 請求'}, status=405)
    
    try:
        data = json.loads(request.body)
        anonymous = data.get('anonymous', '').strip()
        phone = data.get('phone', '').strip()
        line_id = data.get('line_id', '').strip()
        email = data.get('email', '').strip()
        
        # 使用Django ORM更新資料
        from .models import User
        
        # 嘗試獲取或創建自定義用戶記錄
        custom_user, created = User.objects.get_or_create(
            mail=request.user.email,
            defaults={
                'anonymous': anonymous or None,
                'phone': phone or None,
                'LINE_ID': line_id or None,
                'mail': email or request.user.email
            }
        )
        
        if not created:
            # 更新現有記錄
            custom_user.anonymous = anonymous or None
            custom_user.phone = phone or None
            custom_user.LINE_ID = line_id or None
            if email:
                custom_user.mail = email
            custom_user.save()
        
        return JsonResponse({
            'success': True,
            'message': '個人資料更新成功',
            'data': {
                'anonymous': anonymous,
                'phone': phone,
                'line_id': line_id,
                'email': email
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': '無效的 JSON 格式'}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'更新失敗: {str(e)}'}, status=500)
