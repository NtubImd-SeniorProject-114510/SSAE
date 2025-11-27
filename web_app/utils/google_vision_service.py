import logging
import requests
import base64
import io
import os
from PIL import Image, ImageEnhance
from django.conf import settings

logger = logging.getLogger(__name__)

class GoogleVisionService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GoogleVisionService, cls).__new__(cls)
            cls._instance.client = None
            # 優先從 .env 讀取 API Key，如果沒有則為 None
            cls._instance.api_key = os.environ.get('GOOGLE_API_KEY')
        return cls._instance

    def __init__(self):
        # 只有當沒有強制設定使用 API Key 時，才嘗試載入官方 Client
        if not self.api_key:
            try:
                from google.cloud import vision
                self.client = vision.ImageAnnotatorClient()
                logger.info("Google Vision API (官方 Client) 初始化成功")
            except Exception:
                self.client = None

    def set_api_key(self, key):
        """允許外部程式強制設定 API Key"""
        self.api_key = key

    def preprocess_image(self, image_content):
        """影像預處理"""
        try:
            image = Image.open(io.BytesIO(image_content))
            if image.mode in ('RGBA', 'LA') or (image.mode == 'P' and 'transparency' in image.info):
                image = image.convert('RGB')

            width, height = image.size
            if width < 1000 or height < 1000:
                scale = max(1000/width, 1000/height)
                image = image.resize((int(width * scale), int(height * scale)), Image.Resampling.LANCZOS)

            image = ImageEnhance.Contrast(image).enhance(1.5)
            image = ImageEnhance.Sharpness(image).enhance(1.5)

            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='JPEG', quality=95)
            return img_byte_arr.getvalue()
        except Exception:
            return image_content

    def detect_web_entities(self, image_content):
        # 1. 嘗試 REST API (優先使用，因為它會回傳詳細的啟用連結)
        if self.api_key:
            return self._rest_api_request(image_content, "WEB_DETECTION")
            
        # 2. 嘗試官方 Client
        if self.client:
            try:
                from google.cloud import vision
                image = vision.Image(content=image_content)
                response = self.client.web_detection(image=image)
                if response.error.message: return {"success": False, "error": response.error.message}
                
                best_guess = response.web_detection.best_guess_labels[0].label if response.web_detection.best_guess_labels else ""
                return {"success": True, "best_guess": best_guess, "source": "Client"}
            except Exception as e:
                return {"success": False, "error": f"Client Error: {str(e)}"}
        
        return {"success": False, "error": "未設定 GOOGLE_API_KEY 且無法載入 Service Account"}

    def detect_text_with_preprocessing(self, image_content):
        processed_image = self.preprocess_image(image_content)

        # 1. 嘗試 REST API
        if self.api_key:
            return self._rest_api_request(processed_image, "DOCUMENT_TEXT_DETECTION")

        # 2. 嘗試官方 Client
        if self.client:
            try:
                from google.cloud import vision
                image = vision.Image(content=processed_image)
                response = self.client.document_text_detection(image=image)
                if response.error.message: return {"success": False, "error": response.error.message}

                full_text = response.full_text_annotation.text
                blocks = []
                for page in response.full_text_annotation.pages:
                    for block in page.blocks:
                        txt = "".join(["".join([s.text for s in w.symbols]) for p in block.paragraphs for w in p.words])
                        box = [{"x": v.x, "y": v.y} for v in block.bounding_box.vertices]
                        blocks.append({"text": txt, "boundingBox": {"vertices": box}})
                return {"success": True, "text": full_text, "text_blocks": blocks, "source": "Client"}
            except Exception as e:
                return {"success": False, "error": f"Client Error: {str(e)}"}

        return {"success": False, "error": "未設定 GOOGLE_API_KEY"}

    def _rest_api_request(self, image_content, feature_type):
        try:
            url = f"https://vision.googleapis.com/v1/images:annotate?key={self.api_key}"
            b64_image = base64.b64encode(image_content).decode()
            payload = {"requests": [{"image": {"content": b64_image}, "features": [{"type": feature_type, "maxResults": 5}]}]}
            
            response = requests.post(url, json=payload, timeout=10)
            data = response.json()
            
            # ★★★ 關鍵：捕捉 Google 回傳的詳細錯誤並顯示給開發者 ★★★
            if "error" in data:
                err_msg = data["error"].get("message", "")
                logger.error(f"Google API 錯誤: {err_msg}")
                
                # 如果錯誤訊息包含啟用連結，直接印出來
                if "Enable it by visiting" in err_msg:
                    print(f"\n\033[91m[嚴重錯誤] Cloud Vision API 未啟用！\033[0m")
                    print(f"\033[93m請點擊此連結啟用服務：\033[0m")
                    # 嘗試從錯誤訊息中提取網址，或給出通用網址
                    print(f"👉 https://console.cloud.google.com/apis/library/vision.googleapis.com")
                    print(f"錯誤詳情: {err_msg}\n")
                    return {"success": False, "error": "Google Cloud Vision 服務未啟用，請查看終端機以獲取啟用連結"}
                
                return {"success": False, "error": f"Google API Error: {err_msg}"}
            
            res = data.get("responses", [{}])[0]
            if not res: return {"success": False, "error": "API 回傳空結果"}

            if feature_type == "WEB_DETECTION":
                web = res.get("webDetection", {})
                guess = web.get("bestGuessLabels", [{}])[0].get("label", "")
                return {"success": True, "best_guess": guess, "source": "REST"}
            
            elif feature_type == "DOCUMENT_TEXT_DETECTION":
                full_text = res.get("fullTextAnnotation", {}).get("text", "")
                blocks = []
                for page in res.get("fullTextAnnotation", {}).get("pages", []):
                    for block in page.get("blocks", []):
                        txt = ""
                        for para in block.get("paragraphs", []):
                            for word in para.get("words", []):
                                txt += "".join([s.get("text") for s in word.get("symbols", [])])
                        vertices = block.get("boundingBox", {}).get("vertices", [])
                        blocks.append({"text": txt, "boundingBox": {"vertices": vertices}})
                return {"success": True, "text": full_text, "text_blocks": blocks, "source": "REST"}

        except Exception as e:
            return {"success": False, "error": str(e)}

google_vision_service = GoogleVisionService()