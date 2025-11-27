#!/usr/bin/env python3
"""
調試登入流程，檢查Django和Node.js之間的通信
"""

import requests
import json
import time

def debug_login_flow():
    print("🔍 調試登入流程")
    print("=" * 60)
    
    # 測試數據
    student_id = "11056019"  # 從日誌中看到的成功學號
    password = "test"  # 測試密碼
    
    print(f"📋 測試學號: {student_id}")
    
    # 1. 直接測試Node.js API
    print("\n1️⃣ 直接測試Node.js API...")
    try:
        nodejs_response = requests.post(
            "http://localhost:3001/api/login",
            json={
                "studentId": student_id,
                "password": password
            },
            timeout=60
        )
        
        print(f"   狀態碼: {nodejs_response.status_code}")
        print(f"   響應頭: {dict(nodejs_response.headers)}")
        
        try:
            nodejs_result = nodejs_response.json()
            print(f"   響應內容: {json.dumps(nodejs_result, indent=2, ensure_ascii=False)}")
        except:
            print(f"   響應文本: {nodejs_response.text}")
            
    except Exception as e:
        print(f"   Node.js API錯誤: {e}")
    
    # 2. 測試Django API
    print("\n2️⃣ 測試Django API...")
    try:
        django_response = requests.post(
            "http://127.0.0.1:8001/api/ntub/login/",
            json={
                "student_id": student_id,
                "password": password
            },
            timeout=60
        )
        
        print(f"   狀態碼: {django_response.status_code}")
        print(f"   響應頭: {dict(django_response.headers)}")
        
        try:
            django_result = django_response.json()
            print(f"   響應內容: {json.dumps(django_result, indent=2, ensure_ascii=False)}")
        except:
            print(f"   響應文本: {django_response.text}")
            
    except Exception as e:
        print(f"   Django API錯誤: {e}")
    
    # 3. 檢查Django日誌建議
    print("\n3️⃣ 建議檢查:")
    print("   - Django控制台日誌")
    print("   - Node.js控制台日誌")
    print("   - 網路連接狀況")
    
    print("\n" + "=" * 60)
    print("調試完成")

if __name__ == "__main__":
    debug_login_flow()
