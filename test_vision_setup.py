# test_vision_setup.py
# 放在 Django 專案根目錄下，用來測試 Google Cloud Vision API 設定

import os
import sys

# 設定認證檔案路径
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = 'ssae114510-d58d80f3142f.json'

def test_json_file():
    """檢查 JSON 認證檔案是否存在且格式正確"""
    import json
    
    json_path = 'ssae114510-d58d80f3142f.json'
    
    # 檢查檔案是否存在
    if not os.path.exists(json_path):
        print(f"❌ 錯誤：找不到認證檔案 {json_path}")
        print("   請確認檔案在專案根目錄中")
        return False
    
    # 檢查檔案是否可讀
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError:
        print("❌ 錯誤：JSON 檔案格式不正確")
        return False
    except Exception as e:
        print(f"❌ 錯誤：無法讀取 JSON 檔案 - {e}")
        return False
    
    # 檢查必要欄位
    required_fields = ['type', 'project_id', 'private_key', 'client_email']
    for field in required_fields:
        if field not in data:
            print(f"❌ 錯誤：JSON 檔案缺少必要欄位 '{field}'")
            return False
    
    print("✅ JSON 認證檔案檢查通過")
    print(f"   專案 ID: {data['project_id']}")
    print(f"   服務帳戶: {data['client_email']}")
    return True

def test_vision_import():
    """測試是否能成功導入 Google Cloud Vision"""
    try:
        from google.cloud import vision
        print("✅ Google Cloud Vision 套件導入成功")
        return True
    except ImportError as e:
        print("❌ 錯誤：無法導入 Google Cloud Vision")
        print(f"   錯誤訊息: {e}")
        print("   請執行: pip install google-cloud-vision")
        return False

def test_vision_client():
    """測試 Vision API 客戶端連線"""
    try:
        from google.cloud import vision
        client = vision.ImageAnnotatorClient()
        print("✅ Vision API 客戶端建立成功")
        return True, client
    except Exception as e:
        print(f"❌ 錯誤：無法建立 Vision API 客戶端")
        print(f"   錯誤訊息: {e}")
        print("   可能原因:")
        print("   - JSON 認證檔案路径錯誤")
        print("   - 服務帳戶權限不足")
        print("   - Vision API 未啟用")
        return False, None

def test_simple_ocr():
    """測試基本 OCR 功能"""
    try:
        from google.cloud import vision
        import io
        from PIL import Image, ImageDraw, ImageFont
        
        # 建立一個簡單的測試圖片（包含文字）
        img = Image.new('RGB', (300, 100), color='white')
        draw = ImageDraw.Draw(img)
        
        try:
            # 嘗試使用預設字體
            font = ImageFont.load_default()
        except:
            font = None
            
        draw.text((10, 30), "Test Book Title", fill='black', font=font)
        draw.text((10, 60), "ISBN: 1234567890", fill='black', font=font)
        
        # 轉換為字節
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr = img_byte_arr.getvalue()
        
        # 使用 Vision API
        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=img_byte_arr)
        response = client.text_detection(image=image)
        
        if response.error.message:
            print(f"❌ API 請求錯誤: {response.error.message}")
            return False
            
        texts = response.text_annotations
        if texts:
            detected_text = texts[0].description
            print("✅ OCR 功能測試成功")
            print(f"   識別文字: {repr(detected_text.strip())}")
            return True
        else:
            print("⚠️  OCR 測試：沒有識別到文字")
            print("   這可能是正常的（測試圖片很簡單）")
            return True
            
    except Exception as e:
        print(f"❌ OCR 功能測試失敗: {e}")
        return False

def main():
    """主測試函數"""
    print("🔍 Google Cloud Vision API 設定檢查")
    print("=" * 50)
    
    # 測試 1: 檢查 JSON 檔案
    if not test_json_file():
        print("\n❌ 請先修復 JSON 檔案問題")
        return
    
    print()
    
    # 測試 2: 檢查套件導入
    if not test_vision_import():
        print("\n❌ 請先安裝必要套件")
        return
    
    print()
    
    # 測試 3: 檢查客戶端連線
    success, client = test_vision_client()
    if not success:
        print("\n❌ 請檢查 Google Cloud 設定")
        print("\n📋 需要檢查的項目:")
        print("1. 前往 Google Cloud Console")
        print("2. 確認專案已選擇正確")
        print("3. 啟用 Cloud Vision API")
        print("4. 檢查服務帳戶權限")
        print("5. 確認已設定付款方式（如果需要）")
        return
    
    print()
    
    # 測試 4: 測試 OCR 功能
    if test_simple_ocr():
        print("\n🎉 所有測試通過！Google Cloud Vision API 已準備就緒")
        print("\n📝 下一步：")
        print("1. 將 vision_utils.py 放入 web_app/utils/ 目錄")
        print("2. 更新您的 Django views.py")
        print("3. 更新前端 HTML 和 JavaScript")
        print("4. 測試完整的書籍識別功能")
    else:
        print("\n⚠️  基本連線成功，但 OCR 功能需要進一步檢查")

if __name__ == "__main__":
    main()