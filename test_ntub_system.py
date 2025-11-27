#!/usr/bin/env python3
"""
北商學生資訊系統測試腳本
"""

import requests
import json
import time

# 配置
DJANGO_BASE_URL = "http://127.0.0.1:8001"
NTUB_API_BASE_URL = "http://localhost:3001"

def test_api_health():
    """測試API健康狀態"""
    print("🔍 測試API健康狀態...")
    try:
        response = requests.get(f"{NTUB_API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API狀態: {data['status']}")
            print(f"📅 時間戳: {data['timestamp']}")
            return True
        else:
            print(f"❌ API健康檢查失敗: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API連接失敗: {e}")
        return False

def test_django_integration():
    """測試Django整合"""
    print("\n🔍 測試Django整合...")
    try:
        response = requests.get(f"{DJANGO_BASE_URL}/ntub/", timeout=10)
        if response.status_code == 200:
            print("✅ Django NTUB頁面可訪問")
            return True
        else:
            print(f"❌ Django頁面訪問失敗: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Django連接失敗: {e}")
        return False

def test_mock_login():
    """測試模擬登入（使用假資料）"""
    print("\n🔍 測試模擬登入...")
    try:
        # 這裡使用假的學號和密碼進行測試
        # 實際使用時需要真實的北商學生資訊系統憑證
        login_data = {
            "studentId": "test123",
            "password": "testpass"
        }
        
        response = requests.post(
            f"{NTUB_API_BASE_URL}/api/login",
            json=login_data,
            timeout=30
        )
        
        result = response.json()
        print(f"📝 登入測試結果: {result.get('message', '無訊息')}")
        
        if result.get('success'):
            print("✅ 登入流程正常（使用測試資料）")
            return result.get('sessionToken')
        else:
            print("ℹ️  登入失敗是預期的（使用假資料）")
            return None
            
    except Exception as e:
        print(f"❌ 登入測試失敗: {e}")
        return None

def main():
    """主測試函數"""
    print("🚀 開始測試北商學生資訊系統...")
    print("=" * 50)
    
    # 測試API健康狀態
    api_healthy = test_api_health()
    
    # 測試Django整合
    django_working = test_django_integration()
    
    # 測試模擬登入
    session_token = test_mock_login()
    
    # 總結
    print("\n" + "=" * 50)
    print("📊 測試結果總結:")
    print(f"   API服務: {'✅ 正常' if api_healthy else '❌ 異常'}")
    print(f"   Django整合: {'✅ 正常' if django_working else '❌ 異常'}")
    print(f"   登入流程: {'✅ 正常' if session_token else 'ℹ️  需要真實憑證'}")
    
    if api_healthy and django_working:
        print("\n🎉 系統基礎功能正常！")
        print("💡 下一步:")
        print("   1. 訪問 http://127.0.0.1:8001/ntub/ 查看介面")
        print("   2. 使用真實的北商學號和密碼進行測試")
        print("   3. 根據實際的北商系統調整爬蟲邏輯")
    else:
        print("\n⚠️  系統存在問題，請檢查服務狀態")

if __name__ == "__main__":
    main()
