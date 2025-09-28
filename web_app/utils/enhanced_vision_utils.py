# utils/enhanced_vision_utils_v2.py
import base64
import re
import requests
import json
import logging
from typing import Dict, List, Optional, Tuple
from PIL import Image, ImageEnhance, ImageFilter
import io
import cv2
import numpy as np
from difflib import SequenceMatcher
import time
from .google_vision_service import google_vision_service

logger = logging.getLogger(__name__)

class EnhancedBookRecognitionService:
    def __init__(self):
        # Google Books API 配置
        self.google_books_api = {
            'base_url': 'https://www.googleapis.com/books/v1/volumes',
            'key': None  # 如果有 Google Books API key 可以設定
        }
        
        # Open Library API
        self.open_library_api = {
            'search_url': 'https://openlibrary.org/search.json',
            'books_url': 'https://openlibrary.org/api/books'
        }
        
        # ISBN 正則表達式模式
        self.isbn_patterns = [
            r'ISBN[-:\s]*(?:97[89][-\s]?)?(\d{1,5}[-\s]?\d{1,7}[-\s]?\d{1,7}[-\s]?\d{1,7}[-\s]?\d{1})',
            r'(?:ISBN|isbn)[-:\s]*(\d{10}|\d{13})',
            r'(?:^|\s)(\d{13})(?:\s|$)',
            r'(?:^|\s)(\d{10})(?:\s|$)',
        ]
        
        # 書名清理模式
        self.title_cleanup_patterns = [
            r'^ISBN.*?[:：]\s*',
            r'第\d+版.*$',
            r'\([^)]*edition[^)]*\)$',
            r'\d+th\s+edition.*$',
            r'修訂版.*$',
            r'增訂版.*$',
            r'最新版.*$',
            r'^\d+\.\s*',  # 移除開頭數字編號
            r'^[•·]\s*',   # 移除項目符號
        ]
        
        # 分類關鍵字映射
        self.category_keywords = {
            '數學': [
                'mathematics', 'math', 'calculus', 'algebra', 'geometry', 'statistics',
                '數學', '微積分', '代數', '幾何', '統計', '機率', '離散數學'
            ],
            '物理': [
                'physics', 'mechanics', 'thermodynamics', 'electromagnetism',
                '物理', '力學', '熱力學', '電磁學', '量子'
            ],
            '化學': [
                'chemistry', 'organic', 'inorganic', 'biochemistry',
                '化學', '有機化學', '無機化學', '生物化學'
            ],
            '生物': [
                'biology', 'biochemistry', 'molecular', 'genetics', 'ecology',
                '生物', '遺傳學', '生態學', '細胞'
            ],
            '計算機': [
                'computer', 'programming', 'software', 'algorithm', 'data structure',
                '計算機', '程式', '軟體', '演算法', '資料結構', '程式設計'
            ],
            '電子電機': [
                'electrical', 'electronic', 'circuit', 'signal', 'communication',
                '電子', '電機', '電路', '訊號', '通訊'
            ],
            '機械工程': [
                'mechanical', 'engineering', 'manufacturing', 'materials',
                '機械', '工程', '製造', '材料'
            ],
            '經濟': [
                'economics', 'finance', 'accounting', 'investment',
                '經濟', '財務', '會計', '投資', '金融'
            ],
            '管理': [
                'management', 'business', 'administration', 'marketing',
                '管理', '企業', '行政', '行銷', '市場'
            ],
            '語言文學': [
                'language', 'literature', 'linguistics', 'english', 'chinese',
                '語言', '文學', '語言學', '英文', '中文', '國文'
            ],
            '歷史': ['history', '歷史', '史學'],
            '心理學': ['psychology', '心理', '心理學'],
            '社會學': ['sociology', '社會', '社會學', 'social'],
            '法律': ['law', '法律', 'legal', '法學'],
            '醫學': ['medicine', '醫學', 'medical', 'health', '醫療', '健康'],
            '藝術設計': ['art', 'design', '藝術', '設計', '美術'],
            '教育': ['education', '教育', 'teaching', '教學'],
            '哲學': ['philosophy', '哲學'],
            '地理': ['geography', '地理']
        }

    def process_book_image(self, image_data: bytes) -> Dict:
        """完整的書籍圖像處理流程"""
        try:
            logger.info("開始書籍圖像識別流程")
            
            # 1. 使用 Google Vision API 進行 OCR
            ocr_result = google_vision_service.detect_text_with_preprocessing(image_data)
            
            if not ocr_result.get('success'):
                return {
                    'success': False,
                    'error': ocr_result.get('error', '無法提取文字'),
                    'ocr_text': ''
                }
            
            extracted_text = ocr_result.get('text', '')
            confidence = ocr_result.get('confidence', 0)
            isbn_candidates = ocr_result.get('isbn_candidates', [])
            
            logger.info(f"OCR 成功，信心度: {confidence:.2f}, 找到 {len(isbn_candidates)} 個 ISBN 候選")
            
            if not extracted_text.strip():
                return {
                    'success': False,
                    'error': '未檢測到有效文字內容',
                    'ocr_text': extracted_text
                }

            # 2. 搜尋書籍資訊
            search_results = []
            search_attempts = []

            # 優先使用 ISBN 搜尋
            for isbn in isbn_candidates:
                logger.info(f"嘗試使用 ISBN 搜尋: {isbn}")
                result = self._search_by_isbn(isbn)
                search_attempts.append(f"ISBN: {isbn}")
                
                if result.get('success'):
                    search_results.append(result['data'])
                    logger.info(f"ISBN 搜尋成功: {result['data'].get('title', 'Unknown')}")
                    break

            # 如果 ISBN 搜尋失敗，嘗試書名搜尋
            if not search_results:
                possible_titles = self._extract_possible_titles(extracted_text)
                logger.info(f"嘗試書名搜尋，候選書名: {possible_titles}")
                
                for title in possible_titles:
                    if len(title.strip()) >= 3:
                        result = self._search_by_title(title)
                        search_attempts.append(f"Title: {title}")
                        
                        if result.get('success'):
                            search_results.append(result['data'])
                            logger.info(f"書名搜尋成功: {result['data'].get('title', 'Unknown')}")
                            break

            # 3. 處理搜尋結果
            if search_results:
                best_result = search_results[0]  # 取第一個成功的結果
                
                # 增強資訊
                enhanced_result = self._enhance_book_info(best_result, extracted_text)
                
                return {
                    'success': True,
                    'book_info': enhanced_result,
                    'ocr_text': extracted_text,
                    'search_attempts': search_attempts,
                    'confidence': confidence,
                    'isbn_found': len(isbn_candidates) > 0
                }
            else:
                return {
                    'success': False,
                    'error': '無法找到匹配的書籍資訊',
                    'ocr_text': extracted_text,
                    'search_attempts': search_attempts,
                    'suggestions': self._extract_manual_suggestions(extracted_text)
                }

        except Exception as e:
            logger.error(f"書籍圖像處理錯誤: {e}")
            return {
                'success': False,
                'error': f'處理錯誤: {str(e)}',
                'ocr_text': ''
            }

    def _search_by_isbn(self, isbn: str) -> Dict:
        """通過 ISBN 搜尋書籍"""
        results = []
        
        # Google Books API
        google_result = self._search_google_books_by_isbn(isbn)
        if google_result:
            results.append(google_result)
        
        # Open Library API
        openlibrary_result = self._search_openlibrary_by_isbn(isbn)
        if openlibrary_result:
            results.append(openlibrary_result)
        
        if results:
            # 選擇信心度最高的結果
            best_result = max(results, key=lambda x: x.get('confidence', 0))
            return {'success': True, 'data': best_result}
        
        return {'success': False, 'error': f'未找到 ISBN {isbn} 對應的書籍'}

    def _search_by_title(self, title: str) -> Dict:
        """通過書名搜尋書籍"""
        results = []
        
        # Google Books API
        google_result = self._search_google_books_by_title(title)
        if google_result:
            results.append(google_result)
        
        # Open Library API
        openlibrary_result = self._search_openlibrary_by_title(title)
        if openlibrary_result:
            results.append(openlibrary_result)
        
        if results:
            # 計算與原始標題的相似度
            for result in results:
                similarity = self._calculate_similarity(
                    title.lower(), 
                    result.get('title', '').lower()
                )
                result['title_similarity'] = similarity
                result['confidence'] = result.get('confidence', 0.5) + similarity * 0.3
            
            # 選擇綜合評分最高的結果
            best_result = max(results, key=lambda x: x.get('confidence', 0))
            
            # 只接受相似度足夠高的結果
            if best_result.get('title_similarity', 0) > 0.3:
                return {'success': True, 'data': best_result}
        
        return {'success': False, 'error': f'未找到書名 "{title}" 對應的書籍'}

    def _search_google_books_by_isbn(self, isbn: str) -> Optional[Dict]:
        """Google Books ISBN 搜尋"""
        try:
            params = {
                'q': f'isbn:{isbn}',
                'maxResults': 1,
                'langRestrict': 'zh-TW|zh-CN|en'
            }
            
            if self.google_books_api['key']:
                params['key'] = self.google_books_api['key']
            
            response = requests.get(
                self.google_books_api['base_url'], 
                params=params, 
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('totalItems', 0) > 0:
                    return self._parse_google_books_item(data['items'][0])
                    
        except Exception as e:
            logger.error(f"Google Books ISBN 搜尋錯誤: {e}")
            
        return None

    def _search_google_books_by_title(self, title: str) -> Optional[Dict]:
        """Google Books 書名搜尋"""
        try:
            params = {
                'q': f'intitle:"{title}"',
                'maxResults': 3,
                'langRestrict': 'zh-TW|zh-CN|en',
                'orderBy': 'relevance'
            }
            
            if self.google_books_api['key']:
                params['key'] = self.google_books_api['key']
            
            response = requests.get(
                self.google_books_api['base_url'], 
                params=params, 
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('totalItems', 0) > 0:
                    # 找到最相似的書名
                    best_match = None
                    best_similarity = 0
                    
                    for item in data['items']:
                        book_title = item.get('volumeInfo', {}).get('title', '')
                        similarity = self._calculate_similarity(title.lower(), book_title.lower())
                        
                        if similarity > best_similarity:
                            best_similarity = similarity
                            best_match = item
                    
                    if best_match and best_similarity > 0.3:
                        return self._parse_google_books_item(best_match)
                        
        except Exception as e:
            logger.error(f"Google Books 書名搜尋錯誤: {e}")
            
        return None

    def _parse_google_books_item(self, item: Dict) -> Dict:
        """解析 Google Books API 回應項目"""
        volume_info = item.get('volumeInfo', {})
        
        # 提取 ISBN
        isbn = ''
        identifiers = volume_info.get('industryIdentifiers', [])
        for identifier in identifiers:
            if identifier.get('type') in ['ISBN_13', 'ISBN_10']:
                isbn = identifier.get('identifier', '')
                break
        
        return {
            'title': volume_info.get('title', ''),
            'authors': volume_info.get('authors', []),
            'publisher': volume_info.get('publisher', ''),
            'published_date': volume_info.get('publishedDate', ''),
            'isbn': isbn,
            'description': volume_info.get('description', ''),
            'page_count': volume_info.get('pageCount', 0),
            'categories': volume_info.get('categories', []),
            'thumbnail': volume_info.get('imageLinks', {}).get('thumbnail', ''),
            'source': 'Google Books',
            'confidence': 0.9
        }

    def _search_openlibrary_by_isbn(self, isbn: str) -> Optional[Dict]:
        """Open Library ISBN 搜尋"""
        try:
            url = f"{self.open_library_api['books_url']}?bibkeys=ISBN:{isbn}&format=json&jscmd=data"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                book_key = f"ISBN:{isbn}"
                
                if book_key in data:
                    return self._parse_openlibrary_book(data[book_key], isbn)
                    
        except Exception as e:
            logger.error(f"Open Library ISBN 搜尋錯誤: {e}")
            
        return None

    def _search_openlibrary_by_title(self, title: str) -> Optional[Dict]:
        """Open Library 書名搜尋"""
        try:
            params = {
                'title': title,
                'limit': 5
            }
            
            response = requests.get(
                self.open_library_api['search_url'], 
                params=params, 
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('docs'):
                    # 找到最相似的書名
                    best_match = None
                    best_similarity = 0
                    
                    for doc in data['docs']:
                        book_title = doc.get('title', '')
                        similarity = self._calculate_similarity(title.lower(), book_title.lower())
                        
                        if similarity > best_similarity:
                            best_similarity = similarity
                            best_match = doc
                    
                    if best_match and best_similarity > 0.3:
                        return self._parse_openlibrary_doc(best_match)
                        
        except Exception as e:
            logger.error(f"Open Library 書名搜尋錯誤: {e}")
            
        return None

    def _parse_openlibrary_book(self, book_data: Dict, isbn: str) -> Dict:
        """解析 Open Library 書籍資料 (從 books API)"""
        return {
            'title': book_data.get('title', ''),
            'authors': [author.get('name', '') for author in book_data.get('authors', [])],
            'publisher': ', '.join([pub.get('name', '') for pub in book_data.get('publishers', [])]),
            'published_date': book_data.get('publish_date', ''),
            'isbn': isbn,
            'description': book_data.get('description', ''),
            'page_count': book_data.get('number_of_pages', 0),
            'categories': [],
            'thumbnail': '',
            'source': 'Open Library',
            'confidence': 0.85
        }

    def _parse_openlibrary_doc(self, doc: Dict) -> Dict:
        """解析 Open Library 文檔資料 (從 search API)"""
        return {
            'title': doc.get('title', ''),
            'authors': doc.get('author_name', []),
            'publisher': ', '.join(doc.get('publisher', [])),
            'published_date': str(doc.get('first_publish_year', '')),
            'isbn': doc.get('isbn', [''])[0] if doc.get('isbn') else '',
            'description': '',
            'page_count': doc.get('number_of_pages_median', 0),
            'categories': doc.get('subject', [])[:5],  # 限制分類數量
            'thumbnail': '',
            'source': 'Open Library',
            'confidence': 0.8
        }

    def _extract_possible_titles(self, text: str) -> List[str]:
        """從 OCR 文字中提取可能的書名"""
        lines = text.split('\n')
        possible_titles = []
        
        for line in lines:
            line = line.strip()
            
            # 跳過太短或包含特定關鍵字的行
            if len(line) < 3:
                continue
                
            skip_keywords = [
                'isbn', '版次', 'edition', '價格', '
            , '￥', '元', 
                '頁數', 'page', '出版', 'publisher', '作者', 'author',
                '年', '月', '日', 'copyright', '©'
            ]
            
            if any(keyword in line.lower() for keyword in skip_keywords):
                continue
            
            # 清理書名
            cleaned_title = line
            for pattern in self.title_cleanup_patterns:
                cleaned_title = re.sub(pattern, '', cleaned_title, flags=re.IGNORECASE)
            
            cleaned_title = cleaned_title.strip()
            
            # 進一步清理
            cleaned_title = re.sub(r'^[^\w\u4e00-\u9fff]+', '', cleaned_title)
            cleaned_title = re.sub(r'[^\w\u4e00-\u9fff\s]+
            , '', cleaned_title)
            
            if len(cleaned_title) >= 3 and len(cleaned_title) <= 100:
                possible_titles.append(cleaned_title)
        
        # 按長度排序，優先選擇中等長度的標題
        possible_titles.sort(key=lambda x: abs(len(x) - 20))
        
        return possible_titles[:5]

    def _enhance_book_info(self, book_info: Dict, ocr_text: str) -> Dict:
        """增強書籍資訊"""
        enhanced_info = book_info.copy()
        
        # 智慧分類
        categories = self._smart_categorize(
            enhanced_info.get('title', ''),
            enhanced_info.get('description', ''),
            enhanced_info.get('categories', []),
            ocr_text
        )
        
        enhanced_info['categories'] = categories
        enhanced_info['suggested_db_category'] = self._map_to_db_category(categories)
        
        # 提取額外資訊
        if not enhanced_info.get('description') and ocr_text:
            # 從 OCR 文字中提取可能的描述
            description = self._extract_description_from_ocr(ocr_text)
            if description:
                enhanced_info['description'] = description
        
        return enhanced_info

    def _smart_categorize(self, title: str, description: str, existing_categories: List[str], ocr_text: str = '') -> List[str]:
        """智慧分類"""
        categories = set()
        
        # 添加現有分類
        for cat in existing_categories:
            categories.add(cat)
        
        # 分析文字內容
        text_to_analyze = f"{title} {description} {ocr_text}".lower()
        
        # 關鍵字匹配
        for category, keywords in self.category_keywords.items():
            for keyword in keywords:
                if keyword.lower() in text_to_analyze:
                    categories.add(category)
                    break
        
        return list(categories)

    def _map_to_db_category(self, categories: List[str]) -> Optional[int]:
        """映射到資料庫分類 ID"""
        try:
            from ..models import Category
            
            # 直接匹配
            for cat_name in categories:
                try:
                    category = Category.objects.get(name=cat_name)
                    return category.pk
                except Category.DoesNotExist:
                    continue
            
            # 模糊匹配
            db_categories = Category.objects.all()
            for db_cat in db_categories:
                for api_cat in categories:
                    if self._calculate_similarity(db_cat.name.lower(), api_cat.lower()) > 0.7:
                        return db_cat.pk
                        
        except Exception as e:
            logger.error(f"分類映射錯誤: {e}")
            
        return None

    def _extract_description_from_ocr(self, ocr_text: str) -> str:
        """從 OCR 文字中提取描述"""
        lines = ocr_text.split('\n')
        description_lines = []
        
        for line in lines:
            line = line.strip()
            
            # 跳過短行和特定關鍵字行
            if len(line) < 10:
                continue
                
            skip_patterns = [
                r'isbn', r'版次', r'edition', r'價格', r'\
            , r'￥', r'元',
                r'頁數', r'page', r'出版', r'publisher', r'作者', r'author'
            ]
            
            if any(re.search(pattern, line, re.IGNORECASE) for pattern in skip_patterns):
                continue
            
            # 可能是描述的行
            if len(line) > 15 and any(char in line for char in '。，、！？;:.'):
                description_lines.append(line)
        
        if description_lines:
            description = ' '.join(description_lines[:3])  # 取前3行
            return description[:200] + '...' if len(description) > 200 else description
        
        return ''

    def _extract_manual_suggestions(self, ocr_text: str) -> List[str]:
        """提取手動搜尋建議"""
        suggestions = []
        
        if not ocr_text:
            return suggestions
        
        lines = ocr_text.split('\n')
        
        for line in lines:
            line = line.strip()
            
            if len(line) < 3 or len(line) > 50:
                continue
            
            # 跳過明顯不是書名的行
            skip_keywords = ['isbn', 'price', '
            , '￥', '元', '版次', 'edition']
            if any(keyword in line.lower() for keyword in skip_keywords):
                continue
            
            # 清理並添加建議
            cleaned = re.sub(r'^[^\w\u4e00-\u9fff]+', '', line)
            cleaned = re.sub(r'[^\w\u4e00-\u9fff\s]+
            , '', cleaned)
            
            if len(cleaned.strip()) >= 3:
                suggestions.append(cleaned.strip())
        
        return list(set(suggestions))[:5]

    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """計算文字相似度"""
        return SequenceMatcher(None, text1, text2).ratio()

    def search_book_by_isbn(self, isbn: str) -> Dict:
        """公開 ISBN 搜尋接口"""
        cleaned_isbn = re.sub(r'[-\s]', '', isbn)
        
        if not self._validate_isbn(cleaned_isbn):
            return {'success': False, 'error': 'ISBN 格式不正確'}
        
        return self._search_by_isbn(cleaned_isbn)

    def search_book_by_title(self, title: str) -> Dict:
        """公開書名搜尋接口"""
        if len(title.strip()) < 2:
            return {'success': False, 'error': '書名太短'}
        
        return self._search_by_title(title.strip())

    def _validate_isbn(self, isbn: str) -> bool:
        """驗證 ISBN 格式"""
        if len(isbn) == 10:
            return self._validate_isbn10(isbn)
        elif len(isbn) == 13:
            return self._validate_isbn13(isbn)
        return False

    def _validate_isbn10(self, isbn: str) -> bool:
        """ISBN-10 校驗"""
        try:
            total = 0
            for i, digit in enumerate(isbn[:9]):
                total += int(digit) * (10 - i)
            
            check = isbn[9]
            check_val = 10 if check.upper() == 'X' else int(check)
            
            return (total + check_val) % 11 == 0
        except:
            return False

    def _validate_isbn13(self, isbn: str) -> bool:
        """ISBN-13 校驗"""
        try:
            total = 0
            for i, digit in enumerate(isbn[:12]):
                multiplier = 1 if i % 2 == 0 else 3
                total += int(digit) * multiplier
            
            check_digit = (10 - (total % 10)) % 10
            return check_digit == int(isbn[12])
        except:
            return False


# 創建全局實例
enhanced_book_recognition_service = EnhancedBookRecognitionService()