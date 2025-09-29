import os
import re
import requests
import json
from google.cloud import vision
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class BookRecognitionService:
    def __init__(self):
        # 設定 Google Cloud Vision API 認證
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = os.path.join(
            settings.BASE_DIR, 'ssae114510-d58d80f3142f.json'
        )
        self.vision_client = vision.ImageAnnotatorClient()

    def extract_text_from_image(self, image_content):
        """從圖片中提取文字"""
        try:
            image = vision.Image(content=image_content)
            
            # 使用 DOCUMENT_TEXT_DETECTION 獲得更好的 OCR 結果
            response = self.vision_client.document_text_detection(image=image)
            
            if response.error.message:
                raise Exception(f'Vision API 錯誤: {response.error.message}')
            
            # 獲取完整文字
            full_text = response.full_text_annotation.text if response.full_text_annotation else ""
            
            # 提取結構化資訊
            extracted_info = self.parse_book_info(full_text)
            
            return {
                'success': True,
                'full_text': full_text,
                'extracted_info': extracted_info
            }
            
        except Exception as e:
            logger.error(f"Vision API 錯誤: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'full_text': '',
                'extracted_info': {}
            }

    def parse_book_info(self, text):
        """從 OCR 文字中解析書籍資訊"""
        info = {
            'title': '',
            'author': '',
            'publisher': '',
            'isbn': '',
            'edition': ''
        }
        
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        # ISBN 正則表達式 (支援 ISBN-10 和 ISBN-13)
        isbn_patterns = [
            r'ISBN[-:\s]*(\d{13})',  # ISBN-13
            r'ISBN[-:\s]*(\d{10})',  # ISBN-10  
            r'ISBN[-:\s]*(\d{3}-\d{1}-\d{3}-\d{5}-\d{1})',  # 格式化 ISBN-13
            r'ISBN[-:\s]*(\d{1}-\d{3}-\d{5}-\d{1})',  # 格式化 ISBN-10
            r'(\d{13})',  # 純數字 13 位
            r'(\d{10})'   # 純數字 10 位
        ]
        
        # 尋找 ISBN
        for line in lines:
            for pattern in isbn_patterns:
                match = re.search(pattern, line.upper())
                if match:
                    isbn = re.sub(r'[-\s]', '', match.group(1))
                    if len(isbn) in [10, 13] and isbn.isdigit():
                        info['isbn'] = isbn
                        break
            if info['isbn']:
                break
        
        # 常見的出版社關鍵字
        publisher_keywords = [
            '出版', '社', '書局', '文化', '教育', '大學', '學院', 
            'Press', 'Publishing', 'Publishers', 'Books', 'Education'
        ]
        
        # 常見的版次關鍵字  
        edition_keywords = ['版', '刷', 'Edition', 'Ed.']
        
        # 解析邏輯：通常標題在前幾行，作者在標題附近，出版社包含特定關鍵字
        for i, line in enumerate(lines[:10]):  # 只看前10行
            line_upper = line.upper()
            
            # 推測標題（通常是最長的行或第一行）
            if not info['title'] and len(line) > 10 and not any(kw in line for kw in ['ISBN', '出版', '作者', '編者']):
                info['title'] = line
            
            # 推測作者（包含"作者"、"編者"、"著"等）
            if any(keyword in line for keyword in ['作者', '編者', '著', 'Author', 'By']):
                author = re.sub(r'(作者|編者|著|Author|By)[:：\s]*', '', line).strip()
                if author and not info['author']:
                    info['author'] = author
            
            # 推測出版社
            if any(kw in line for kw in publisher_keywords):
                if not info['publisher']:
                    info['publisher'] = line
            
            # 推測版次
            if any(kw in line for kw in edition_keywords):
                if not info['edition']:
                    info['edition'] = line
        
        # 如果沒找到標題，用第一行非 ISBN 的文字
        if not info['title'] and lines:
            for line in lines:
                if 'ISBN' not in line.upper() and len(line) > 5:
                    info['title'] = line
                    break
        
        return info

    def search_book_by_isbn(self, isbn):
        """使用 ISBN 查詢書籍資訊"""
        try:
            # 使用 Google Books API
            url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('totalItems', 0) > 0:
                    book = data['items'][0]['volumeInfo']
                    
                    return {
                        'success': True,
                        'data': {
                            'title': book.get('title', ''),
                            'authors': book.get('authors', []),
                            'publisher': book.get('publisher', ''),
                            'published_date': book.get('publishedDate', ''),
                            'description': book.get('description', ''),
                            'page_count': book.get('pageCount', 0),
                            'categories': book.get('categories', []),
                            'isbn': isbn,
                            'thumbnail': book.get('imageLinks', {}).get('thumbnail', ''),
                            'language': book.get('language', '')
                        }
                    }
                else:
                    # 嘗試 Open Library API 作為備選
                    return self.search_book_openlibrary(isbn)
            
            return {'success': False, 'error': '無法找到書籍資訊'}
            
        except Exception as e:
            logger.error(f"書籍查詢錯誤: {str(e)}")
            return {'success': False, 'error': f'查詢失敗: {str(e)}'}

    def search_book_openlibrary(self, isbn):
        """使用 Open Library API 查詢書籍"""
        try:
            url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&jscmd=data&format=json"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                isbn_key = f"ISBN:{isbn}"
                
                if isbn_key in data:
                    book = data[isbn_key]
                    
                    return {
                        'success': True,
                        'data': {
                            'title': book.get('title', ''),
                            'authors': [author.get('name', '') for author in book.get('authors', [])],
                            'publisher': ', '.join([pub.get('name', '') for pub in book.get('publishers', [])]),
                            'published_date': book.get('publish_date', ''),
                            'description': book.get('notes', ''),
                            'page_count': book.get('number_of_pages', 0),
                            'isbn': isbn,
                            'thumbnail': book.get('cover', {}).get('medium', ''),
                        }
                    }
            
            return {'success': False, 'error': '未找到書籍資訊'}
            
        except Exception as e:
            logger.error(f"Open Library 查詢錯誤: {str(e)}")
            return {'success': False, 'error': f'備用查詢失敗: {str(e)}'}

    def search_book_by_title(self, title):
        """使用書名查詢書籍資訊"""
        try:
            # 清理標題
            clean_title = re.sub(r'[^\w\s\u4e00-\u9fff]', ' ', title).strip()
            
            url = f"https://www.googleapis.com/books/v1/volumes?q=intitle:{clean_title}&maxResults=5"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('totalItems', 0) > 0:
                    # 返回最匹配的結果
                    best_match = data['items'][0]['volumeInfo']
                    
                    # 嘗試獲取 ISBN
                    isbn = ''
                    for identifier in best_match.get('industryIdentifiers', []):
                        if identifier.get('type') in ['ISBN_13', 'ISBN_10']:
                            isbn = identifier.get('identifier', '')
                            break
                    
                    return {
                        'success': True,
                        'data': {
                            'title': best_match.get('title', ''),
                            'authors': best_match.get('authors', []),
                            'publisher': best_match.get('publisher', ''),
                            'published_date': best_match.get('publishedDate', ''),
                            'description': best_match.get('description', ''),
                            'page_count': best_match.get('pageCount', 0),
                            'categories': best_match.get('categories', []),
                            'isbn': isbn,
                            'thumbnail': best_match.get('imageLinks', {}).get('thumbnail', ''),
                            'language': best_match.get('language', '')
                        }
                    }
            
            return {'success': False, 'error': '未找到匹配的書籍'}
            
        except Exception as e:
            logger.error(f"標題查詢錯誤: {str(e)}")
            return {'success': False, 'error': f'查詢失敗: {str(e)}'}

    def process_book_image(self, image_content):
        """完整的書籍圖片處理流程"""
        result = {
            'success': False,
            'book_info': {},
            'ocr_text': '',
            'error': ''
        }
        
        try:
            # 1. OCR 文字識別
            ocr_result = self.extract_text_from_image(image_content)
            
            if not ocr_result['success']:
                result['error'] = ocr_result['error']
                return result
            
            result['ocr_text'] = ocr_result['full_text']
            extracted_info = ocr_result['extracted_info']
            
            # 2. 優先使用 ISBN 查詢
            if extracted_info.get('isbn'):
                book_result = self.search_book_by_isbn(extracted_info['isbn'])
                
                if book_result['success']:
                    result['success'] = True
                    result['book_info'] = book_result['data']
                    result['book_info']['source'] = 'isbn_search'
                    return result
            
            # 3. 使用標題查詢
            if extracted_info.get('title'):
                book_result = self.search_book_by_title(extracted_info['title'])
                
                if book_result['success']:
                    result['success'] = True
                    result['book_info'] = book_result['data']
                    result['book_info']['source'] = 'title_search'
                    return result
            
            # 4. 如果都查詢不到，返回 OCR 解析的基本資訊
            if any(extracted_info.values()):
                result['success'] = True
                result['book_info'] = {
                    'title': extracted_info.get('title', ''),
                    'authors': [extracted_info.get('author', '')] if extracted_info.get('author') else [],
                    'publisher': extracted_info.get('publisher', ''),
                    'isbn': extracted_info.get('isbn', ''),
                    'source': 'ocr_only'
                }
                return result
            
            result['error'] = '無法從圖片中識別書籍資訊'
            return result
            
        except Exception as e:
            logger.error(f"書籍處理錯誤: {str(e)}")
            result['error'] = f'處理失敗: {str(e)}'
            return result

# 全域實例
book_recognition_service = BookRecognitionService()