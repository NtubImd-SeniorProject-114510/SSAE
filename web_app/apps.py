from django.apps import AppConfig
from django.db.models.signals import post_save
from django.contrib.auth import get_user_model

def calculate_student_info(student_id):
    """根據學號計算年級、學制和班級"""
    if not student_id or len(student_id) < 7 or not student_id.isdigit():
        return None, None, None
    
    # 取得入學年（民國年）
    enroll_year = int(student_id[:3])
    
    # 取得當前日期
    from datetime import datetime
    today = datetime.now()
    current_year = today.year - 1911  # 轉換為民國年
    
    # 取得學制
    academic_code = student_id[3]
    academic_map = {
        '2': '二技',
        '4': '四技',
        '5': '五專'
    }
    academic = academic_map.get(academic_code)
    
    # 計算基本年級
    base_grade = current_year - enroll_year + 1
    
    # 檢查是否已過6月30日（升年級）
    if today.month > 6 or (today.month == 6 and today.day > 30):
        grade = base_grade
    else:
        grade = base_grade - 1  # 未到升年級時間，年級減1
    
    # 取得科系
    dept_code = student_id[4]
    dept_map = {
        '1': '會資',
        '2': '財金',
        '3': '財稅',
        '4': '國貿',
        '5': '企管',
        '6': '資管',
        '7': '應外'
    }
    dept = dept_map.get(dept_code, '')
    
    # 組合班級名稱（範例：資管五年甲班）
    grade_map = {
        1: '一',
        2: '二',
        3: '三',
        4: '四',
        5: '五',
        6: '六',
        7: '七'
    }
    
    if academic == '五專':
        class_name = f"{dept}{grade_map.get(grade, '')}年甲班"
    elif academic in ['二技', '四技']:
        class_name = f"{dept}{grade_map.get(grade, '')}年{student_id[5:7]}班"
    else:
        class_name = ''
    
    return str(grade), academic, class_name

def create_or_update_user_profile(sender, instance, created, **kwargs):
    from django.db import connection
    from django.db.utils import DatabaseError
    
    try:
        with connection.cursor() as cursor:
            # 計算學生資訊
            grade, academic, course = calculate_student_info(instance.username)
            
            # Check if user exists in custom User table
            cursor.execute(
                "SELECT user_id FROM `User` WHERE mail = %s", 
                [instance.email]
            )
            user_exists = cursor.fetchone()
            
            if user_exists:
                # Update existing user
                cursor.execute("""
                    UPDATE `User` 
                    SET name = %s,
                        password = %s,
                        grade = %s,
                        academic = %s,
                        course = %s
                    WHERE mail = %s
                """, [f"{instance.last_name}{instance.first_name}".strip() or instance.username, 
                      instance.password,
                      grade,
                      academic,
                      course,
                      instance.email])
            else:
                # Create new user with default values
                cursor.execute("""
                    INSERT INTO `User` 
                    (student_id, mail, name, password, role, grade, academic, course)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, [instance.username, instance.email, 
                      f"{instance.last_name}{instance.first_name}".strip() or instance.username,
                      instance.password, 'student', grade, academic, course])
    except DatabaseError as e:
        print(f"Error syncing user: {e}")

class WebAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'web_app'

    def ready(self):
        # Connect the signal when the app is ready
        post_save.connect(create_or_update_user_profile, sender=get_user_model())
