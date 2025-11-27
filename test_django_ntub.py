#!/usr/bin/env python3
import os
import sys
import django

# 設置Django環境
sys.path.append('/Users/ikea/SSAE')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_system.settings')
django.setup()

from web_app.services.ntub_client import ntub_client

def test_django_ntub_connection():
    print("🧪 測試Django到NTUB API的連接")
    print("=" * 50)
    
    # 測試API健康檢查
    print("1. 測試API健康檢查...")
    health_status = ntub_client.check_api_health()
    print(f"   結果: {'✅ 正常' if health_status else '❌ 異常'}")
    
    # 測試登入API
    print("\n2. 測試登入API...")
    try:
        result = ntub_client.login("test123", "testpass")
        print(f"   結果: {result}")
        print(f"   包含requiresManualInput: {'requiresManualInput' in result}")
        if 'requiresManualInput' in result:
            print(f"   requiresManualInput值: {result['requiresManualInput']}")
    except Exception as e:
        print(f"   錯誤: {e}")
    
    print("\n" + "=" * 50)
    print("測試完成")

if __name__ == "__main__":
    test_django_ntub_connection()
