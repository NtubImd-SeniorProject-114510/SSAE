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
        
        # 使用原生 SQL 更新資料
        from django.db import connection
        with connection.cursor() as cursor:
            # 先檢查是否存在記錄
            cursor.execute("""
                SELECT user_id FROM `User` WHERE mail = %s
            """, [request.user.email])
            
            if cursor.fetchone():
                # 更新現有記錄
                cursor.execute("""
                    UPDATE `User` 
                    SET anonymous = %s, phone = %s, LINE_ID = %s 
                    WHERE mail = %s
                """, [anonymous or None, phone or None, line_id or None, request.user.email])
            else:
                # 創建新記錄
                cursor.execute("""
                    INSERT INTO `User` (mail, anonymous, phone, LINE_ID) 
                    VALUES (%s, %s, %s, %s)
                """, [request.user.email, anonymous or None, phone or None, line_id or None])
        
        return JsonResponse({
            'success': True,
            'message': '個人資料更新成功',
            'data': {
                'anonymous': anonymous,
                'phone': phone,
                'line_id': line_id
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': '無效的 JSON 格式'}, status=400)
    except Exception as e:
        return JsonResponse({'error': f'更新失敗: {str(e)}'}, status=500)
