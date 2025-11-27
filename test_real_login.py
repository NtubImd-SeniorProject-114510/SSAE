#!/usr/bin/env python3
"""
北商學生資訊系統真實登入測試
"""

import requests
import json
import getpass

def test_real_login():
    """測試真實登入"""
    print("🎓 北商學生資訊系統登入測試")
    print("=" * 40)
    
    # 獲取用戶輸入
    student_id = input("請輸入學號: ").strip()
    if not student_id:
        print("❌ 學號不能為空")
        return
    
    password = getpass.getpass("請輸入密碼: ").strip()
    if not password:
        print("❌ 密碼不能為空")
        return
    
    print(f"\n🔐 嘗試登入學號: {student_id}")
    
    try:
        # 發送登入請求
        response = requests.post(
            "http://localhost:3001/api/login",
            json={
                "studentId": student_id,
                "password": password
            },
            timeout=60  # 增加超時時間，因為爬蟲需要時間
        )
        
        result = response.json()
        
        print(f"\n📋 登入結果:")
        print(f"   狀態: {'✅ 成功' if result.get('success') else '❌ 失敗'}")
        print(f"   訊息: {result.get('message', '無訊息')}")
        
        if result.get('success'):
            session_token = result.get('sessionToken')
            print(f"   Session Token: {session_token[:20]}...")
            
            # 測試獲取學生資料
            print(f"\n📊 嘗試獲取學生資料...")
            profile_response = requests.post(
                "http://localhost:3001/api/student/profile",
                json={"sessionToken": session_token},
                timeout=30
            )
            
            profile_result = profile_response.json()
            if profile_result.get('success'):
                profile_data = profile_result.get('data', {})
                print("✅ 學生資料獲取成功:")
                for key, value in profile_data.items():
                    if value:
                        print(f"   {key}: {value}")
            else:
                print(f"❌ 學生資料獲取失敗: {profile_result.get('message')}")
        
    except requests.exceptions.Timeout:
        print("⏰ 請求超時，可能是網站響應較慢或需要處理驗證碼")
    except requests.exceptions.ConnectionError:
        print("❌ 連接失敗，請確認API服務是否運行")
    except Exception as e:
        print(f"❌ 發生錯誤: {e}")

if __name__ == "__main__":
    test_real_login()
