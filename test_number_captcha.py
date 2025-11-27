#!/usr/bin/env python3
"""
測試優化後的數字驗證碼識別
"""

import requests
import json
import time

def test_number_captcha():
    print("🔢 測試數字驗證碼自動識別")
    print("=" * 50)
    
    # 使用真實的學號和密碼進行測試
    student_id = input("請輸入學號: ").strip()
    if not student_id:
        print("❌ 學號不能為空")
        return
    
    password = input("請輸入密碼: ").strip()  
    if not password:
        print("❌ 密碼不能為空")
        return
    
    print(f"\n🔐 測試學號: {student_id}")
    print("🎯 期望行為:")
    print("   - 找到 #Validation_Image 驗證碼圖片")
    print("   - OCR識別數字驗證碼")
    print("   - 如果信心度>50%且長度3-6位：自動填入")
    print("   - 否則：顯示手動輸入界面")
    
    try:
        print("\n📡 發送登入請求...")
        response = requests.post(
            "http://127.0.0.1:8001/api/ntub/login/",
            json={
                "student_id": student_id,
                "password": password
            },
            timeout=60  # 給OCR處理足夠時間
        )
        
        result = response.json()
        
        print(f"\n📋 登入結果:")
        print(f"   成功: {result.get('success')}")
        print(f"   訊息: {result.get('message')}")
        
        if result.get('success'):
            print("🎉 自動登入成功！OCR識別並自動填入了驗證碼！")
        elif result.get('requiresManualInput'):
            print("🖼️ 需要手動輸入驗證碼")
            print(f"   Session Token: {result.get('sessionToken', '')[:20]}...")
            print(f"   OCR建議: '{result.get('ocrSuggestion', '')}'")
            print(f"   有驗證碼圖片: {'captchaImage' in result}")
            
            if result.get('ocrSuggestion'):
                print(f"   📝 OCR識別到數字: {result.get('ocrSuggestion')}")
                print("   💡 你可以在前端界面中確認這個數字是否正確")
        else:
            print("❌ 登入失敗")
            
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
    
    print("\n" + "=" * 50)
    print("測試完成")

if __name__ == "__main__":
    test_number_captcha()
