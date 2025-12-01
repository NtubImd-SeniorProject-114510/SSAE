# -*- coding: utf-8 -*-

import re
import requests
import logging
import threading
import concurrent.futures
from typing import Dict, List, Optional
from difflib import SequenceMatcher

try:
    from googleapiclient.discovery import build
    from bs4 import BeautifulSoup
except ImportError:
    pass

from .google_vision_service import google_vision_service

# 將 Log 層級調高，隱藏 INFO，只顯示 ERROR
logging.basicConfig(level=logging.ERROR, format='%(message)s')
logger = logging.getLogger(__name__)

class TerminalUI:
    # 只保留最終結果的輸出功能
    @staticmethod
    def print_result(info):
        print(f"\n{'-'*50}")
        print(f"✅ 辨識成功")
        print(f"{'-'*50}")
        for k, l in [('title','書名'), ('authors','作者'), ('publisher','出版社'), ('isbn','ISBN')]:
            val = info.get(k,'')
            if isinstance(val, list): val = ', '.join(val)
            if val: print(f"{l}：{val}")
        print(f"{'-'*50}\n")

class FinalBookRecognizer:
    def __init__(self):
        self.google_books_api = {'base_url': 'https://www.googleapis.com/books/v1/volumes'}
        self.google_api_key = "AIzaSyARwMYmmWQbUeNNxXKP0WAOg0Tlp9xwVXY"
        self.google_search_cx_id = "e250702ba333848ea"
        
        google_vision_service.set_api_key(self.google_api_key)

        self.generic_labels = [
            'poster', 'book', 'book cover', 'publication', 'paper', 'text', 'font', 
            'rectangle', 'advertising', 'logo', 'brand', 'magenta', 'material property',
            'graphic design', 'flyer', 'brochure', 'album cover', 'product', 
            'illustration', 'stairs', 'multimedia software', 'diagram', 'screenshot'
        ]
        
        self.noise_patterns = [
            r'第\s*\d+\s*版', r'^\d{2,}', r'Vol\.\d+', r'No\.\d+', 
            r'\d+th\s*Edition', r'\d+st\s*Edition', r'\d+nd\s*Edition', r'\d+rd\s*Edition',
            r'(?i)(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth|Sixteenth|Seventeenth|Eighteenth|Nineteenth|Twentieth)\s+Edition',
            r'紅沙龍', r'藍沙龍', r'大師名作', r'經典文學', r'暢銷書系', r'Systems Analysis', r'International Student'
        ]

    def _clean_text(self, text: str) -> str:
        text = re.sub(r'(?<=[\u4e00-\u9fa5])\s+(?=[\u4e00-\u9fa5])', '', text)
        return text.strip('., \t\n').strip()

    def _remove_edition_noise(self, text: str) -> str:
        cleaned = text
        for pattern in self.noise_patterns:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
        return cleaned.strip()
        
    def _split_camel_case(self, text: str) -> str:
        return re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', text)

    def _extract_isbn_from_text(self, text: str) -> Optional[str]:
        clean = re.sub(r'[-—\s]', '', text)
        match = re.search(r'(978\d{10})', clean)
        return match.group(1) if match else None

    def _check_keyword_containment(self, query: str, result_title: str) -> bool:
        split_query = self._split_camel_case(query)
        result_norm = result_title.replace(' ', '').lower()
        query_norm = split_query.lower()
        
        q_words = set(re.findall(r'\w+', query_norm))
        r_words = set(re.findall(r'\w+', result_norm))
        
        query_chinese = re.findall(r'[\u4e00-\u9fa5]+', query)
        
        if not query_chinese:
            flat_query = query.lower().replace(' ', '')
            flat_result = result_title.lower().replace(' ', '')
            if len(flat_query) > 10 and (flat_query in flat_result or flat_result in flat_query): return True
            if not q_words: return True
            overlap = len(q_words & r_words) / len(q_words)
            return overlap > 0.2 

        match_count = 0
        for word in query_chinese:
            if len(word) > 1 and word in result_norm: match_count += 1
            elif len(word) == 1 and word in result_norm: match_count += 0.5
        
        if match_count > 0: return True
        
        q_chars = set(query)
        r_chars = set(result_title)
        if len(q_chars) == 0: return False
        return (len(q_chars & r_chars) / len(q_chars)) > 0.4

    def process_book_image(self, image_data: bytes) -> Dict:
        result_template = {"title": "未知", "authors": [], "isbn": "", "source": "無"}
        
        try:
            # 1. 平行執行 Vision API
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                future_web = executor.submit(google_vision_service.detect_web_entities, image_data)
                future_ocr = executor.submit(google_vision_service.detect_text_with_preprocessing, image_data)
                web_res = future_web.result()
                ocr_res = future_ocr.result()
            
            full_text = ocr_res.get('text', '')
            best_guess = web_res.get('best_guess', '').lower()
            
            # 2. ISBN 秒殺
            isbn = self._extract_isbn_from_text(full_text)
            if isbn:
                # 優先用 Google Books 查 ISBN (最快)
                res = self._search_google_books(f"isbn:{isbn}")
                if not res: 
                    # 沒找到再用爬蟲 (較慢)
                    res = self._search_books_com_tw(isbn)
                if res: return self._success_return(res, full_text)

            # 3. 建立搜尋任務
            tasks = []
            if best_guess and not any(g in best_guess for g in self.generic_labels):
                 tasks.append({"q": best_guess, "type": "google", "weight": 0.6})

            raw_lines = [l.strip() for l in full_text.split('\n') if len(l.strip()) > 1]
            valid_lines = []
            for l in raw_lines:
                cleaned = self._remove_edition_noise(l)
                if len(cleaned) > 1: valid_lines.append(cleaned)
            
            if valid_lines:
                line1 = valid_lines[0]
                # 標題搜尋
                tasks.append({"q": line1, "type": "google", "weight": 0.9})
                tasks.append({"q": line1, "type": "books_tw", "weight": 1.0}) # 博客來權重高

                # 滑動視窗 (長標題)
                if len(line1) > 8:
                    mid = len(line1) // 2
                    tasks.append({"q": line1[:mid+2], "type": "google", "weight": 0.8})
                    tasks.append({"q": line1[mid-2:], "type": "google", "weight": 0.8})

                # 組合技
                if len(valid_lines) > 1:
                    author_part = self._clean_text(valid_lines[1])
                    if len(author_part) < 20:
                        query = f"{line1} {author_part}"
                        tasks.append({"q": query, "type": "google", "weight": 1.2})

            text_blocks = ocr_res.get('text_blocks', [])
            if text_blocks:
                max_block = max(text_blocks, key=lambda b: abs(b['boundingBox']['vertices'][2]['y'] - b['boundingBox']['vertices'][0]['y']))
                tasks.append({"q": max_block['text'], "type": "google", "weight": 0.9})

            if not tasks:
                return {"success": False, "book_info": result_template, "ocr_text": full_text, "error": "無法提取關鍵字"}

            unique_tasks = []
            seen = set()
            for t in tasks:
                k = f"{t['q']}_{t['type']}"
                if k not in seen:
                    unique_tasks.append(t)
                    seen.add(k)

            # 4. 競速搜尋
            best_result_so_far = None
            highest_score = 0.0
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
                future_to_task = {executor.submit(self._execute_search_task, t, full_text): t for t in unique_tasks}
                
                for future in concurrent.futures.as_completed(future_to_task):
                    try:
                        result = future.result()
                        if result:
                            score, data = result
                            if score > highest_score:
                                highest_score = score
                                best_result_so_far = data
                            
                            # ★ 極速回傳：分數 > 85 就走人 (降低門檻以求速度)
                            if score >= 85:
                                return self._success_return(best_result_so_far, full_text)
                                
                    except Exception: pass

            if best_result_so_far and highest_score > 35:
                return self._success_return(best_result_so_far, full_text)
            
            if full_text:
                fallback = valid_lines[0] if valid_lines else "未知"
                ocr_info = {"title": fallback, "source": "OCR 原始文字"}
                return self._success_return(ocr_info, full_text)

            return {"success": False, "book_info": result_template, "error": "查無資料"}

        except Exception as e:
            return {"success": False, "book_info": result_template, "error": str(e)}

    def _execute_search_task(self, task, full_text):
        query = task['q']
        search_type = task['type']
        
        res = None
        if search_type == 'books_tw':
            res = self._search_books_com_tw(query, timeout=3.5) # 縮短 Timeout
        else:
            res = self._search_google_books(query)
            
        if not res: return None
        res_title = res.get('title', '')
        if not self._check_keyword_containment(query, res_title): return None

        score = 0
        if res.get('isbn'): score += 30
        if res.get('authors'): score += 10
        if res.get('title'): score += 10
        if re.search(r'[\u4e00-\u9fa5]', res_title): score += 30
        
        similarity = SequenceMatcher(None, query, res_title).ratio()
        if similarity > 0.5: score += 20
        if search_type == 'books_tw': score += 15 
        
        score *= task['weight']
        res['source'] = 'Books.tw' if search_type=='books_tw' else 'Google'
        return (score, res)

    def _search_books_com_tw(self, query, timeout=5):
        try:
            service = build("customsearch", "v1", developerKey=self.google_api_key)
            full_query = f'site:books.com.tw {query}' 
            res = service.cse().list(q=full_query, cx=self.google_search_cx_id, num=1).execute()
            if 'items' in res and len(res['items']) > 0:
                return self._scrape_books_page(res['items'][0]['link'], timeout)
        except Exception: pass
        return None

    def _scrape_books_page(self, url, timeout):
        try:
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
            resp = requests.get(url, headers=headers, timeout=timeout)
            if resp.status_code != 200: return None
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            title = soup.find('meta', property='og:title')['content'] if soup.find('meta', property='og:title') else ''
            title = title.split('：')[0] if '：' in title else title
            title = re.sub(r' - 博客來.*', '', title)

            authors = []
            for a in soup.select('a[href*="adv_author"]'): authors.append(a.text.strip())
            
            pub_tag = soup.select_one('a[href*="adv_pub"]')
            if not pub_tag: pub_tag = soup.select_one('a[href*="pub"]')
            publisher = pub_tag.text.strip() if pub_tag else ''
            
            isbn = ''
            isbn_tag = soup.find(string=re.compile(r'ISBN：'))
            if isbn_tag: isbn = isbn_tag.replace('ISBN：', '').strip()
            
            date = ''
            date_tag = soup.find(string=re.compile(r'出版日期：'))
            if date_tag: date = date_tag.replace('出版日期：', '').strip()

            if title:
                return {"title": title, "authors": list(set(authors)), "publisher": publisher, "publishedDate": date, "isbn": isbn}
        except Exception: pass
        return None

    def _search_google_books(self, query):
        try:
            safe_query = query[:100]
            url = f"{self.google_books_api['base_url']}?q={safe_query}&maxResults=1&langRestrict=zh&key={self.google_api_key}"
            r = requests.get(url, timeout=2) # Google Books 極速 timeout
            if r.status_code == 200 and r.json().get('totalItems', 0) > 0:
                vol = r.json()['items'][0]['volumeInfo']
                return {
                    "title": vol.get('title'),
                    "authors": vol.get('authors', []),
                    "publisher": vol.get('publisher'),
                    "publishedDate": vol.get('publishedDate'),
                    "isbn": next((i['identifier'] for i in vol.get('industryIdentifiers', []) if i['type']=='ISBN_13'), ""),
                }
        except: pass
        return None

    def _success_return(self, info, ocr_text):
        TerminalUI.print_result(info)
        return {"success": True, "book_info": info, "ocr_text": ocr_text}

book_recognition_service = FinalBookRecognizer()