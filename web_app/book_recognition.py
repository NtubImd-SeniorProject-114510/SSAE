"""
書籍封面辨識和資訊擷取服務
使用 Google Cloud Vision API 進行 OCR，並搜尋書籍資訊
"""
import os
import re
import json
import requests
import logging
from typing import Dict, List, Optional, Tuple
from google.cloud import vision
from django.conf import settings

logger = logging.getLogger(__name__)

class BookRecognitionService:
    def __init__(self):
        """初始化書籍辨識服務"""
        self.vision_client = None
        self._initialize_vision_client()
        
    def _initialize_vision_client(self):
        """初始化 Google Cloud Vision 客戶端"""
        try:
            # 優先使用你在 settings.py 中設定的方式
            from django.conf import settings
            
            # 檢查是否已在 settings.py 中設定
            if hasattr(settings, 'GOOGLE_APPLICATION_CREDENTIALS'):
                credentials_path = settings.GOOGLE_APPLICATION_CREDENTIALS
                if os.path.exists(credentials_path):
                    # 確保環境變數已設定
                    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
                    self.vision_client = vision.ImageAnnotatorClient()
                    logger.info(f"使用 settings.py 中的認證檔案: {credentials_path}")
                    return
                else:
                    logger.error(f"settings.py 中指定的認證檔案不存在: {credentials_path}")
            
            # 備用：從環境變數獲取
            credentials_path = os.getenv('GOOGLE_CLOUD_CREDENTIALS_PATH')
            if credentials_path and os.path.exists(credentials_path):
                os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
                self.vision_client = vision.ImageAnnotatorClient()
                logger.info(f"使用環境變數中的認證檔案: {credentials_path}")
                return
            
            # 如果都沒有設定
            logger.warning("未找到 Google Cloud Vision API 認證設定")
            self.vision_client = None
            
        except Exception as e:
            logger.error(f"Google Cloud Vision 客戶端初始化失敗: {e}")
            self.vision_client = None

    def extract_text_from_image(self, image_data: bytes) -> str:
        """
        使用 Google Cloud Vision API 從圖片中提取文字
        
        Args:
            image_data: 圖片的二進位資料
            
        Returns:
            提取到的文字內容
        """
        if not self.vision_client:
            raise Exception("Google Cloud Vision 客戶端未正確初始化")
            
        try:
            image = vision.Image(content=image_data)
            
            # 執行文字辨識
            response = self.vision_client.text_detection(image=image)
            
            if response.error.message:
                raise Exception(f'Vision API 錯誤: {response.error.message}')
            
            # 獲取辨識結果
            texts = response.text_annotations
            if texts:
                extracted_text = texts[0].description  # 第一個結果包含完整文字
                logger.info(f"成功提取文字，長度: {len(extracted_text)}")
                return extracted_text
            else:
                logger.warning("未從圖片中檢測到任何文字")
                return ""
                
        except Exception as e:
            logger.error(f"文字提取失敗: {e}")
            raise

    def parse_book_info_from_text(self, text: str) -> Dict[str, str]:
        """
        從提取的文字中解析書籍基本資訊
        
        Args:
            text: OCR 提取的文字
            
        Returns:
            包含可能書名、作者等資訊的字典
        """
        # 清理文字
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        # 常見的書籍資訊模式
        isbn_pattern = r'ISBN[:\s]*([0-9\-Xx]{10,17})'
        
        parsed_info = {
            'possible_titles': [],
            'possible_authors': [],
            'isbn': '',
            'publisher': ''
        }
        
        # 尋找 ISBN
        isbn_match = re.search(isbn_pattern, text, re.IGNORECASE)
        if isbn_match:
            parsed_info['isbn'] = isbn_match.group(1).replace('-', '').replace('X', 'x')
        
        # 分析可能的書名（通常是較長的行，且在前面部分）
        for i, line in enumerate(lines[:5]):  # 只看前5行
            # 過濾掉明顯不是書名的行
            if len(line) > 5 and not re.match(r'^[0-9\-\s]+$', line):
                if not any(keyword in line.lower() for keyword in ['isbn', 'edition', '版', '刷']):
                    parsed_info['possible_titles'].append(line)
        
        # 尋找可能的作者（包含常見作者關鍵字）
        author_keywords = ['著', '作者', 'by', '編著', '主編', '譯']
        for line in lines:
            for keyword in author_keywords:
                if keyword in line:
                    # 提取作者名字
                    author = re.sub(r'[著作者編譯主\s]*', '', line).strip()
                    if author and len(author) < 50:  # 作者名字不會太長
                        parsed_info['possible_authors'].append(author)
                    break
        
        # 尋找出版社
        publisher_keywords = ['出版', 'Press', 'Publications', '社']
        for line in lines:
            if any(keyword in line for keyword in publisher_keywords):
                if len(line) < 100:  # 出版社名字不會太長
                    parsed_info['publisher'] = line.strip()
                    break
        
        return parsed_info

    def search_book_by_isbn(self, isbn: str) -> Optional[Dict]:
        """
        通過 ISBN 搜尋書籍資訊
        
        Args:
            isbn: 書籍 ISBN
            
        Returns:
            書籍詳細資訊或 None
        """
        if not isbn:
            return None
            
        try:
            # 使用 Open Library API
            url = f"https://openlibrary.org/api/books"
            params = {
                'bibkeys': f'ISBN:{isbn}',
                'jscmd': 'data',
                'format': 'json'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            isbn_key = f'ISBN:{isbn}'
            
            if isbn_key in data:
                book_data = data[isbn_key]
                return self._format_book_info(book_data)
                
            # 如果 Open Library 找不到，嘗試 Google Books API
            return self._search_google_books_by_isbn(isbn)
            
        except Exception as e:
            logger.error(f"ISBN 搜尋失敗: {e}")
            return None

    def _search_google_books_by_isbn(self, isbn: str) -> Optional[Dict]:
        """使用 Google Books API 搜尋"""
        try:
            url = "https://www.googleapis.com/books/v1/volumes"
            params = {'q': f'isbn:{isbn}'}
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data.get('totalItems', 0) > 0:
                book_info = data['items'][0]['volumeInfo']
                return {
                    'title': book_info.get('title', ''),
                    'authors': book_info.get('authors', []),
                    'publisher': book_info.get('publisher', ''),
                    'published_date': book_info.get('publishedDate', ''),
                    'isbn': isbn,
                    'description': book_info.get('description', ''),
                    'page_count': book_info.get('pageCount'),
                    'categories': book_info.get('categories', [])
                }
        except Exception as e:
            logger.error(f"Google Books API 搜尋失敗: {e}")
            
        return None

    def search_book_by_title_author(self, title: str, author: str = None) -> Optional[Dict]:
        """
        通過書名和作者搜尋書籍資訊
        
        Args:
            title: 書名
            author: 作者（可選）
            
        Returns:
            書籍詳細資訊或 None
        """
        try:
            # 構建搜尋查詢
            query = title
            if author:
                query += f' author:{author}'
            
            url = "https://www.googleapis.com/books/v1/volumes"
            params = {
                'q': query,
                'maxResults': 5,  # 獲取前5個結果
                'langRestrict': 'zh'  # 優先中文結果
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data.get('totalItems', 0) > 0:
                # 選擇最相似的結果
                best_match = self._find_best_match(data['items'], title, author)
                if best_match:
                    book_info = best_match['volumeInfo']
                    
                    # 提取 ISBN
                    isbn = ''
                    if 'industryIdentifiers' in book_info:
                        for identifier in book_info['industryIdentifiers']:
                            if identifier['type'] in ['ISBN_13', 'ISBN_10']:
                                isbn = identifier['identifier']
                                break
                    
                    return {
                        'title': book_info.get('title', ''),
                        'authors': book_info.get('authors', []),
                        'publisher': book_info.get('publisher', ''),
                        'published_date': book_info.get('publishedDate', ''),
                        'isbn': isbn,
                        'description': book_info.get('description', ''),
                        'page_count': book_info.get('pageCount'),
                        'categories': book_info.get('categories', [])
                    }
                    
        except Exception as e:
            logger.error(f"書名作者搜尋失敗: {e}")
            
        return None

    def _find_best_match(self, items: List, target_title: str, target_author: str = None) -> Optional[Dict]:
        """尋找最佳匹配的書籍"""
        best_score = 0
        best_match = None
        
        for item in items:
            book_info = item.get('volumeInfo', {})
            title = book_info.get('title', '').lower()
            authors = [author.lower() for author in book_info.get('authors', [])]
            
            # 計算相似度分數
            score = 0
            
            # 標題相似度
            if target_title.lower() in title or title in target_title.lower():
                score += 3
            elif any(word in title for word in target_title.lower().split()):
                score += 1
                
            # 作者相似度
            if target_author:
                target_author_lower = target_author.lower()
                if any(target_author_lower in author or author in target_author_lower 
                       for author in authors):
                    score += 2
            
            if score > best_score:
                best_score = score
                best_match = item
                
        return best_match if best_score > 0 else None

    def _format_book_info(self, book_data: Dict) -> Dict:
        """格式化書籍資訊"""
        return {
            'title': book_data.get('title', ''),
            'authors': [author.get('name', '') for author in book_data.get('authors', [])],
            'publisher': book_data.get('publishers', [{}])[0].get('name', '') if book_data.get('publishers') else '',
            'published_date': book_data.get('publish_date', ''),
            'isbn': '',
            'description': book_data.get('description', ''),
            'page_count': book_data.get('number_of_pages'),
            'categories': book_data.get('subjects', [])
        }

    def recognize_book(self, image_data: bytes) -> Dict:
        """
        完整的書籍辨識流程
        
        Args:
            image_data: 圖片的二進位資料
            
        Returns:
            包含辨識結果的字典
        """
        try:
            # 檢查 Vision API 是否可用
            if not self.vision_client:
                return {
                    'success': False,
                    'error': 'Google Cloud Vision API 未正確設定。請檢查認證設定。',
                    'setup_required': True
                }
            
            # 1. 提取文字
            extracted_text = self.extract_text_from_image(image_data)
            if not extracted_text:
                return {
                    'success': False, 
                    'error': '無法從圖片中提取文字，請確保圖片清晰且包含文字內容'
                }
            
            # 2. 解析基本資訊
            parsed_info = self.parse_book_info_from_text(extracted_text)
            
            # 3. 搜尋詳細資訊
            book_info = None
            
            # 優先使用 ISBN 搜尋
            if parsed_info['isbn']:
                book_info = self.search_book_by_isbn(parsed_info['isbn'])
                
            # 如果 ISBN 搜尋失敗，使用書名和作者搜尋
            if not book_info and parsed_info['possible_titles']:
                title = parsed_info['possible_titles'][0]  # 使用第一個可能的書名
                author = parsed_info['possible_authors'][0] if parsed_info['possible_authors'] else None
                book_info = self.search_book_by_title_author(title, author)
            
            if book_info:
                return {
                    'success': True,
                    'book_info': {
                        'title': book_info['title'],
                        'author': ', '.join(book_info['authors']) if book_info['authors'] else '',
                        'publisher': book_info['publisher'],
                        'isbn': book_info['isbn'],
                        'description': book_info.get('description', '')[:500],  # 限制描述長度
                        'categories': book_info.get('categories', [])
                    },
                    'extracted_text': extracted_text,
                    'parsed_info': parsed_info,
                    'confidence': 'high'  # 找到完整資訊
                }
            else:
                # 如果找不到完整資訊，返回解析的基本資訊
                return {
                    'success': True,
                    'book_info': {
                        'title': parsed_info['possible_titles'][0] if parsed_info['possible_titles'] else '',
                        'author': parsed_info['possible_authors'][0] if parsed_info['possible_authors'] else '',
                        'publisher': parsed_info['publisher'],
                        'isbn': parsed_info['isbn'],
                        'description': '',
                        'categories': []
                    },
                    'extracted_text': extracted_text,
                    'parsed_info': parsed_info,
                    'note': '僅提供基本辨識資訊，建議手動確認',
                    'confidence': 'low'  # 只有基本資訊
                }
                
        except Exception as e:
            logger.error(f"書籍辨識失敗: {e}")
            return {
                'success': False,
                'error': f'辨識過程發生錯誤: {str(e)}'
            }


# 建立全域實例
book_recognition_service = BookRecognitionService()