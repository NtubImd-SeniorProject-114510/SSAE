# utils/google_vision_service.py
import base64
import json
import requests
import logging
from google.oauth2 import service_account
from google.auth.transport.requests import Request
from typing import Dict, Optional, List
import os
from django.conf import settings

logger = logging.getLogger(__name__)

class GoogleVisionService:
    def __init__(self):
        """初始化 Google Vision API 服務"""
        self.credentials = None
        self.vision_api_url = "https://vision.googleapis.com/v1/images:annotate"
        
        # 初始化憑證
        self._initialize_credentials()

    def _initialize_credentials(self):
        """初始化 Google Cloud 憑證"""
        try:
            # 方法 1: 從環境變數讀取服務帳戶 JSON
            if hasattr(settings, 'GOOGLE_CLOUD_CREDENTIALS'):
                credentials_info = settings.GOOGLE_CLOUD_CREDENTIALS
            else:
                # 方法 2: 從檔案讀取
                credentials_path = os.path.join(settings.BASE_DIR, 'config', 'google-credentials.json')
                if os.path.exists(credentials_path):
                    with open(credentials_path, 'r') as f:
                        credentials_info = json.load(f)
                else:
                    # 方法 3: 直接在這裡設定 (不建議用於生產環境)
                    credentials_info = {
                        "type": "service_account",
                        "project_id": "ssae114510",
                        "private_key_id": "d58d80f3142fddab8e1d915c98844a64802e4af6",
                        "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDeDC+Bm3jRTcAV\nLTOllffMhFKzye7V4zCPo5BcfpZTwL3ROPZD5QImm7Edd9wrifJ55Y0TKXkXiSTp\n/IysgXyKF5cYGc73EpNi5OkQ60NZFgtom5KpV3SCJY1MAmPlUm8OYSC2Xc1KNUK1\nAaAp0YEomOd0t2S7mYU7PiAgs47HfeqdEozBEkkiR8U6d6+2PO+AEQVa0TzCvYh3\nPGpdXwKx/Pm1KUuQxBvu1VeYlhP9Ktxl7slfYlkOoWP+WQ1G/XKBa9yVnpmaFssJ\nQOCwJGZNnJhzLHtxC/qOBDb6gQo79eaLvXae4EOeUXwIZsEhoijuixHgwXUK+Co9\nce4SU7XrAgMBAAECggEAZ6sNxPeWxTWFH/3uFnl5a1E+IXV+XfrHkdBeFmj9e1XJ\n6XQsOc+iHO9klir/Lo6ll/at0kvzHqNnihzgequrvvc7kkN+ZskT6cCQ9da5J08M\n/YZgx1Iu8ZJhsSKOjCLb+b0sHiiWL3bFUafUJKINKKyWp132GEYZN2sOaeYbG5SV\nhwoPw3He6KBJJEOk7Pct/5UkPQdEn0oyrAt3ntIiGcbwmUrBl4tRDHQumNX/RvQe\n1e++50VCfV+TLmg/jClTnqFlKOUbgx6CubIcdTnuIyodUV8kRqxFADvPff8FH6C5\nEhEtBwGbfIMGCIi4loeRHIl64ARepN4hhsAJFRfH7QKBgQD+tqM9M17drjPH3VRQ\nFcMld+PiqNOUt573S21J6Vm2SkkYY4bf9LCDa14MsVz71JxYlxSsD5P3MLl6GKK7\nnrM7hsulzhPmyQGBTRdQ2OlBYFaDamlc9OoT56cqKE+dRKeios8FioXdHvKxkaGd\nlvwvH39Ds7LbZuP5/jlZhUz5FwKBgQDfK08HjcmfOxL7w+7mdIunAsyuev4IGuzz\n8B2gPEAXhi2SE3Itz4yaPkE2yh5h+32HLvnvM+bhyc7+NSZ+7zyB/J8E8NiPTFdU\n8/lI5Y5Fz7U6zTZqRI5nLMJhpgAE8RDBfuo5X10WDhBvts6ACZpyAP2HQXctp3gh\nKa0fE8PGTQKBgFnsXqr/lNFMa+l2oQp49GEo92IQ2kmZndyOW3IJmOt7RF0A3h/4\nwcxTvmtavooFoIDCLcEk6scNA54wTltQhtRQHVtW6r3CXu6oKcAYJBk5irFwguwX\nZwBJ+0Et5BWQpGINemrpYaMUBvhbgqQhJrz4MLTVHyLIK1oZv2N0ZR1XAoGBAL74\n/q4GJW0/TiVoK73GKeOHP8Rnt48UC4VMCu4d4PLAfaqtPV36Z+VuNLxABfPvFCJk\njrilf4PkAGAE96ZT70GE/kdqGse1ml42UTKSTkdrUTi6d0BE3l9oLAcH2Khh6ebL\nRoBGHRBMhMA0fU2P6jx4oHvoB6Zn0yL92QnpDfVZAoGAKMTbSLMg1M2HjB4ULwzz\n24zPovS2LVjlCv9sHtJ7fJQuKj114H/1v9Z0lplJJbzCjsNarLCBs/9HUXTglLh1\npDWVaWh/zN/n66OgxTybNk4NKdBt1DhjyHD0Jl/1YH4jVwGI6TE6Bt/3Crlr1mF3\n/03PVniweW9sff4xZimspk8=\n-----END PRIVATE KEY-----\n",
                        "client_email": "vision-api-service@ssae114510.iam.gserviceaccount.com",
                        "client_id": "104012990132494579414",
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/vision-api-service%40ssae114510.iam.gserviceaccount.com",
                        "universe_domain": "googleapis.com"
                    }

            # 創建憑證
            self.credentials = service_account.Credentials.from_service_account_info(
                credentials_info,
                scopes=['https://www.googleapis.com/auth/cloud-platform']
            )
            
            logger.info("Google Vision API 憑證初始化成功")
            
        except Exception as e:
            logger.error(f"Google Vision API 憑證初始化失敗: {e}")
            self.credentials = None

    def _get_access_token(self) -> Optional[str]:
        """獲取 Google Cloud 訪問令牌"""
        try:
            if not self.credentials:
                logger.error("憑證未初始化")
                return None
                
            # 刷新令牌
            request = Request()
            self.credentials.refresh(request)
            
            return self.credentials.token
            
        except Exception as e:
            logger.error(f"獲取訪問令牌失敗: {e}")
            return None

    def detect_text(self, image_data: bytes) -> Dict:
        """使用 Google Vision API 進行文字檢測"""
        try:
            access_token = self._get_access_token()
            if not access_token:
                return {
                    'success': False,
                    'error': '無法獲取 API 訪問令牌'
                }

            # 準備請求頭
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {access_token}'
            }

            # 準備請求數據
            image_content = base64.b64encode(image_data).decode('utf-8')
            
            request_data = {
                'requests': [{
                    'image': {
                        'content': image_content
                    },
                    'features': [
                        {
                            'type': 'TEXT_DETECTION',
                            'maxResults': 50
                        },
                        {
                            'type': 'DOCUMENT_TEXT_DETECTION',
                            'maxResults': 1
                        }
                    ],
                    'imageContext': {
                        'languageHints': ['zh-TW', 'zh-CN', 'en', 'ja']
                    }
                }]
            }

            # 發送請求
            response = requests.post(
                self.vision_api_url,
                headers=headers,
                json=request_data,
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                return self._process_vision_response(result)
            else:
                logger.error(f"Vision API 請求失敗: {response.status_code} - {response.text}")
                return {
                    'success': False,
                    'error': f'API 請求失敗: {response.status_code}'
                }

        except Exception as e:
            logger.error(f"Vision API 文字檢測錯誤: {e}")
            return {
                'success': False,
                'error': f'文字檢測失敗: {str(e)}'
            }

    def _process_vision_response(self, response_data: Dict) -> Dict:
        """處理 Vision API 回應"""
        try:
            if 'responses' not in response_data or not response_data['responses']:
                return {
                    'success': False,
                    'error': '未檢測到文字內容'
                }

            response = response_data['responses'][0]
            
            # 檢查是否有錯誤
            if 'error' in response:
                error_msg = response['error'].get('message', '未知錯誤')
                return {
                    'success': False,
                    'error': f'Vision API 錯誤: {error_msg}'
                }

            # 提取文字內容
            extracted_text = ""
            confidence_scores = []
            text_blocks = []

            # 優先使用 DOCUMENT_TEXT_DETECTION 結果
            if 'fullTextAnnotation' in response:
                full_text = response['fullTextAnnotation']
                extracted_text = full_text.get('text', '')
                
                # 計算置信度
                pages = full_text.get('pages', [])
                for page in pages:
                    for block in page.get('blocks', []):
                        if 'confidence' in block:
                            confidence_scores.append(block['confidence'])
                        
                        # 提取文字塊資訊
                        block_text = ""
                        for paragraph in block.get('paragraphs', []):
                            for word in paragraph.get('words', []):
                                word_text = ''.join([symbol.get('text', '') for symbol in word.get('symbols', [])])
                                block_text += word_text + " "
                        
                        if block_text.strip():
                            text_blocks.append({
                                'text': block_text.strip(),
                                'confidence': block.get('confidence', 0)
                            })

            # 如果沒有 fullTextAnnotation，使用 textAnnotations
            elif 'textAnnotations' in response and response['textAnnotations']:
                extracted_text = response['textAnnotations'][0].get('description', '')
                
                # 從個別文字註釋提取置信度
                for annotation in response['textAnnotations'][1:]:  # 跳過第一個（完整文字）
                    text_blocks.append({
                        'text': annotation.get('description', ''),
                        'confidence': 0.8  # 預設置信度
                    })

            # 計算平均置信度
            avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.8

            # 提取可能的 ISBN
            isbn_candidates = self._extract_isbn_from_text(extracted_text)

            return {
                'success': True,
                'text': extracted_text,
                'confidence': avg_confidence,
                'text_blocks': text_blocks,
                'isbn_candidates': isbn_candidates,
                'total_blocks': len(text_blocks)
            }

        except Exception as e:
            logger.error(f"處理 Vision API 回應錯誤: {e}")
            return {
                'success': False,
                'error': f'處理回應失敗: {str(e)}'
            }

    def _extract_isbn_from_text(self, text: str) -> List[str]:
        """從文字中提取 ISBN"""
        import re
        
        isbn_patterns = [
            r'ISBN[-:\s]*(?:97[89][-\s]?)?(\d{1,5}[-\s]?\d{1,7}[-\s]?\d{1,7}[-\s]?\d{1,7}[-\s]?\d{1})',
            r'(?:ISBN|isbn)[-:\s]*(\d{10}|\d{13})',
            r'(?:^|\s)(\d{13})(?:\s|$)',  # 13位數字
            r'(?:^|\s)(\d{10})(?:\s|$)',  # 10位數字
        ]
        
        isbn_candidates = []
        
        for pattern in isbn_patterns:
            matches = re.findall(pattern, text, re.MULTILINE)
            for match in matches:
                # 清理 ISBN
                clean_isbn = re.sub(r'[-\s]', '', match)
                if len(clean_isbn) in [10, 13] and clean_isbn.isdigit():
                    isbn_candidates.append(clean_isbn)
        
        # 去重並返回
        return list(set(isbn_candidates))

    def detect_text_with_preprocessing(self, image_data: bytes) -> Dict:
        """帶預處理的文字檢測"""
        from PIL import Image, ImageEnhance
        import io
        
        try:
            # 原始圖像檢測
            original_result = self.detect_text(image_data)
            
            # 如果原始檢測成功且置信度高，直接返回
            if original_result.get('success') and original_result.get('confidence', 0) > 0.8:
                return original_result
            
            # 圖像預處理
            try:
                img = Image.open(io.BytesIO(image_data))
                
                # 增強對比度
                enhancer = ImageEnhance.Contrast(img)
                enhanced_img = enhancer.enhance(1.5)
                
                # 增強銳度
                sharpness_enhancer = ImageEnhance.Sharpness(enhanced_img)
                sharp_img = sharpness_enhancer.enhance(1.2)
                
                # 轉換回 bytes
                output = io.BytesIO()
                sharp_img.save(output, format='PNG')
                processed_image_data = output.getvalue()
                
                # 對處理後的圖像進行檢測
                processed_result = self.detect_text(processed_image_data)
                
                # 比較結果，返回更好的那個
                if processed_result.get('success'):
                    if not original_result.get('success'):
                        return processed_result
                    elif processed_result.get('confidence', 0) > original_result.get('confidence', 0):
                        return processed_result
                
                return original_result if original_result.get('success') else processed_result
                
            except Exception as preprocessing_error:
                logger.warning(f"圖像預處理失敗，使用原始結果: {preprocessing_error}")
                return original_result
                
        except Exception as e:
            logger.error(f"帶預處理的文字檢測失敗: {e}")
            return {
                'success': False,
                'error': f'檢測失敗: {str(e)}'
            }


# 創建全局實例
google_vision_service = GoogleVisionService()