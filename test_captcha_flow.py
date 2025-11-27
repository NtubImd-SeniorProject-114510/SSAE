#!/usr/bin/env python3
"""
測試完整的驗證碼處理流程
"""

import requests
import json
import time

def test_complete_captcha_flow():
    print("🧪 測試完整驗證碼處理流程")
    print("=" * 50)
    
    # 1. 測試登入並獲取驗證碼
    print("1. 測試登入並獲取驗證碼...")
    login_data = {
        "student_id": "test123",
        "password": "testpass"
    }
    
    try:
        response = requests.post(
            "http://127.0.0.1:8001/api/ntub/login/",
            json=login_data,
            timeout=30
        )
        
        result = response.json()
        print(f"   登入結果: {result.get('success')}")
        print(f"   訊息: {result.get('message')}")
        
        if result.get('requiresManualInput'):
            session_token = result.get('sessionToken')
            print(f"   Session Token: {session_token[:20]}...")
            print(f"   有驗證碼圖片: {'captchaImage' in result}")
            print(f"   OCR建議: {result.get('ocrSuggestion', '無')}")
            
            # 2. 測試驗證碼提交
            print("\n2. 測試驗證碼提交...")
            captcha_data = {
                "sessionToken": session_token,
                "captchaText": "TEST"
            }
            
            captcha_response = requests.post(
                "http://127.0.0.1:8001/api/ntub/input-captcha/",
                json=captcha_data,
                timeout=30
            )
            
            captcha_result = captcha_response.json()
            print(f"   驗證碼提交結果: {captcha_result.get('success')}")
            print(f"   訊息: {captcha_result.get('message')}")
            
        else:
            print("   未檢測到驗證碼需求")
            
    except Exception as e:
        print(f"   錯誤: {e}")
    
    print("\n" + "=" * 50)
    print("測試完成")

if __name__ == "__main__":
    test_complete_captcha_flow()
