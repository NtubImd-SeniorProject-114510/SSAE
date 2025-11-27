import requests
import json
from django.conf import settings
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)

class NTUBClient:
    """北商學生資訊系統客戶端"""
    
    def __init__(self):
        self.api_base_url = getattr(settings, 'NTUB_API_URL', 'http://localhost:3001/api')
        self.timeout = 30
        
    def _make_request(self, method, endpoint, data=None, headers=None):
        """發送HTTP請求的通用方法"""
        url = f"{self.api_base_url}{endpoint}"
        
        default_headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'SSAE-Django-Client/1.0'
        }
        
        if headers:
            default_headers.update(headers)
            
        try:
            if method.upper() == 'GET':
                response = requests.get(url, params=data, headers=default_headers, timeout=self.timeout)
            else:
                response = requests.post(url, json=data, headers=default_headers, timeout=self.timeout)
            
            # 對於NTUB API，401可能是正常響應（需要驗證碼），不要拋出異常
            if response.status_code == 401:
                try:
                    return response.json()
                except json.JSONDecodeError:
                    response.raise_for_status()
            else:
                response.raise_for_status()
                
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"NTUB API請求失敗: {e}")
            logger.error(f"請求URL: {url}")
            logger.error(f"請求數據: {data}")
            raise NTUBAPIException(f"API請求失敗: {str(e)}")
        except json.JSONDecodeError as e:
            logger.error(f"NTUB API響應解析失敗: {e}")
            raise NTUBAPIException("API響應格式錯誤")
    
    def login(self, student_id, password):
        """學生登入"""
        try:
            data = {
                'studentId': student_id,
                'password': password
            }
            
            # 調用爬蟲API進行登入
            logger.info(f"發送登入請求到Node.js API: {data}")
            result = self._make_request('POST', '/login', data)
            logger.info(f"收到Node.js API響應: {result}")
            
            if result.get('success'):
                # 將學號存入session - 使用Django session作為備用
                session_token = result.get('sessionToken')
                try:
                    cache_key = f"ntub_session_{student_id}"
                    cache.set(cache_key, session_token, timeout=1800)
                    logger.info(f"Session token已保存到緩存")
                except Exception as cache_error:
                    logger.warning(f"緩存保存失敗，使用Django session作為備用: {cache_error}")
                
                # 無論如何都保存到類變量作為備用
                if not hasattr(self, '_session_backup'):
                    self._session_backup = {}
                self._session_backup[student_id] = session_token
                logger.info(f"Session token已保存到備用存儲")
                
                logger.info(f"學號 {student_id} 登入成功")
                return {
                    'success': True,
                    'session_token': session_token,
                    'message': result.get('message', '登入成功')
                }
            else:
                logger.warning(f"學號 {student_id} 登入失敗: {result.get('message')}")
                return result  # 直接返回原始結果，包含requiresManualInput等字段
                
        except Exception as e:
            logger.error(f"登入過程發生錯誤: {e}")
            logger.error(f"錯誤類型: {type(e)}")
            logger.error(f"錯誤詳情: {str(e)}")
            import traceback
            logger.error(f"錯誤堆疊: {traceback.format_exc()}")
            return {
                'success': False,
            }
    
    def get_student_profile(self, student_id):
        """獲取學生基本資料"""
        try:
            # 嘗試從緩存獲取session token
            session_token = None
            try:
                cache_key = f"ntub_session_{student_id}"
                session_token = cache.get(cache_key)
            except Exception as cache_error:
                logger.warning(f"緩存獲取失敗: {cache_error}")
            
            # 如果緩存失敗，嘗試從備用存儲獲取
            if not session_token and hasattr(self, '_session_backup'):
                session_token = self._session_backup.get(student_id)
                if session_token:
                    logger.info(f"從備用存儲獲取到session token")
            
            if not session_token:
                # 如果沒有session token，返回提示重新登入
                return {
                    'success': False,
                    'message': 'Session已過期，請重新登入北商系統'
                }
            
            data = {
                'sessionToken': session_token
            }
            
            result = self._make_request('POST', '/student/profile', data)
            
            return result
            
        except Exception as e:
            logger.error(f"獲取學生資料失敗: {e}")
            return {
                'success': False,
                'message': str(e)
            }
    
    def get_grades(self, student_id, semester=None):
        """獲取學生成績"""
        try:
            # 嘗試從緩存獲取session token
            session_token = None
            try:
                cache_key = f"ntub_session_{student_id}"
                session_token = cache.get(cache_key)
            except Exception as cache_error:
                logger.warning(f"緩存獲取失敗: {cache_error}")
            
            # 如果緩存失敗，嘗試從備用存儲獲取
            if not session_token and hasattr(self, '_session_backup'):
                session_token = self._session_backup.get(student_id)
                if session_token:
                    logger.info(f"從備用存儲獲取到session token")
            
            if not session_token:
                return {
                    'success': False,
                    'message': 'Session已過期，請重新登入北商系統'
                }
            
            data = {
                'sessionToken': session_token,
                'semester': semester
            }
            
            response = self._make_request('POST', '/student/grades', data)
            
            if response.get('success'):
                grades_data = response.get('data', [])
                logger.info(f"獲取學號 {student_id} 成績資料成功，共 {len(grades_data)} 門課程")
                return {
                    'success': True,
                    'data': grades_data
                }
            else:
                return {
                    'success': False,
                    'message': response.get('message', '獲取成績失敗')
                }
                
        except Exception as e:
            logger.error(f"獲取成績失敗: {e}")
            return {
                'success': False,
                'message': '獲取成績失敗，請重新登入'
            }
    
    def get_schedule(self, student_id, semester=None):
        """獲取學生課表"""
        try:
            # 嘗試從緩存獲取session token
            session_token = None
            try:
                cache_key = f"ntub_session_{student_id}"
                session_token = cache.get(cache_key)
            except Exception as cache_error:
                logger.warning(f"緩存獲取失敗: {cache_error}")
            
            # 如果緩存失敗，嘗試從備用存儲獲取
            if not session_token and hasattr(self, '_session_backup'):
                session_token = self._session_backup.get(student_id)
                if session_token:
                    logger.info(f"從備用存儲獲取到session token")
            
            if not session_token:
                return {
                    'success': False,
                    'message': 'Session已過期，請重新登入北商系統'
                }
            
            data = {'sessionToken': session_token}
            if semester:
                data['semester'] = semester
            
            result = self._make_request('POST', '/student/schedule', data)
            return result
                
        except Exception as e:
            logger.error(f"獲取課表失敗: {e}")
            return {
                'success': False,
                'message': '獲取課表失敗，請重新登入'
            }
    
    def logout(self, student_id):
        """學生登出"""
        try:
            cache_key = f"ntub_session_{student_id}"
            session_token = cache.get(cache_key)
            
            if session_token:
                data = {'sessionToken': session_token}
                self._make_request('POST', '/logout', data)
                
                # 清除緩存
                cache.delete(cache_key)
                
            logger.info(f"學號 {student_id} 登出成功")
            return {'success': True, 'message': '登出成功'}
            
        except Exception as e:
            logger.error(f"登出失敗: {e}")
            return {'success': False, 'message': '登出失敗'}
    
    def check_api_health(self):
        """檢查API服務狀態"""
        try:
            health_url = f"{self.api_base_url.replace('/api', '')}/health"
            logger.info(f"檢查API健康狀態: {health_url}")
            response = requests.get(health_url, timeout=5)
            logger.info(f"API健康檢查響應: {response.status_code}")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"API健康檢查失敗: {e}")
            return False


class NTUBAPIException(Exception):
    """NTUB API異常類"""
    pass


# 創建全局實例
ntub_client = NTUBClient()
