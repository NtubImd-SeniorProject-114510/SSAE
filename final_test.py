#!/usr/bin/env python3
"""
最終測試 - 驗證完整的登入流程
"""

import requests
import json
import time

def final_test():
    print("🎯 最終測試 - 完整登入流程")
    print("=" * 60)
    
    # 使用從日誌中看到的成功學號
    student_id = "11056019"
    password = "test"
    
    print(f"📋 測試學號: {student_id}")
    print("🎯 預期行為:")
    print("   1. OCR自動識別數字驗證碼")
    print("   2. 自動填入到 #CheckCode")
    print("   3. 點擊 #Client_Login")
    print("   4. 返回登入成功響應")
    
    try:
        print(f"\n📡 發送登入請求... (時間: {time.strftime('%H:%M:%S')})")
        
        start_time = time.time()
        response = requests.post(
            "http://127.0.0.1:8001/api/ntub/login/",
            json={
                "student_id": student_id,
                "password": password
            },
            timeout=90  # 給足夠時間處理OCR
        )
        end_time = time.time()
        
        print(f"⏱️ 請求耗時: {end_time - start_time:.2f} 秒")
        print(f"📊 HTTP狀態碼: {response.status_code}")
        
        try:
            result = response.json()
            print(f"\n📋 響應結果:")
            print(f"   成功: {result.get('success')}")
            print(f"   訊息: {result.get('message')}")
            
            if result.get('success'):
                print("🎉 測試成功！自動登入完成！")
                if result.get('session_token'):
                    print(f"   Session Token: {result.get('session_token')[:20]}...")
            elif result.get('requiresManualInput'):
                print("🖼️ 需要手動輸入驗證碼")
                print(f"   OCR建議: '{result.get('ocrSuggestion', '')}'")
            else:
                print("❌ 登入失敗")
                
        except json.JSONDecodeError:
            print(f"❌ 響應解析失敗: {response.text}")
            
    except requests.exceptions.Timeout:
        print("⏰ 請求超時 - 可能OCR處理時間較長")
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
    
    print(f"\n🕒 測試完成時間: {time.strftime('%H:%M:%S')}")
    print("=" * 60)

if __name__ == "__main__":
    final_test()
