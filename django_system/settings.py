# django_system/settings.py
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# 載入 .env 環境變數 (這行很重要)
load_dotenv()

# ========================
# 🔑 基本設定
# ========================
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-$fdia7icb&ji2k_6aof1b)s#ozo^kvo9%9@#o@23z+x(ki+r)j')
DEBUG = False
ALLOWED_HOSTS = ['127.0.0.1', 'localhost', '*']

# ========================
# 📦 Installed Apps
# ========================
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "social_django",  # Google OAuth2
    "web_app",
    "reminders",
]

# ========================
# ⚙️ Middleware
# ========================
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "social_django.middleware.SocialAuthExceptionMiddleware",
]

ROOT_URLCONF = 'django_system.urls'

# ========================
# 🎨 Templates
# ========================
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'web_app', 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'social_django.context_processors.backends',
                'social_django.context_processors.login_redirect',
            ],
        },
    },
]

WSGI_APPLICATION = 'django_system.wsgi.application'

# ========================
# 🗄️ Database (MySQL)
# ========================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': '114-510',
        'USER': '114510',
        'PASSWORD': '@!LL51o@',
        'HOST': '140.131.114.242',
        'PORT': '3306',
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

# ========================
# 🔐 Password Validators
# ========================
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',},
]

# ========================
# 👤 Authentication
# ========================
AUTHENTICATION_BACKENDS = (
    'social_core.backends.google.GoogleOAuth2',
    'django.contrib.auth.backends.ModelBackend',
)

LOGIN_URL = '/auth/login/google-oauth2/'
LOGIN_REDIRECT_URL = '/index'
LOGOUT_REDIRECT_URL = '/welcome'
SOCIAL_AUTH_LOGIN_ERROR_URL = '/index/'
SOCIAL_AUTH_RAISE_EXCEPTIONS = False

# ✅ [修改重點] 改成從環境變數讀取，不要直接寫在這裡！
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = os.getenv('GOOGLE_CLIENT_ID')
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI = 'http://127.0.0.1:8000/auth/complete/google-oauth2/'

CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False

SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid'
]

SOCIAL_AUTH_GOOGLE_OAUTH2_EXTRA_DATA = [
    ('picture', 'picture'),
    ('email', 'email'),
    ('name', 'name')
]

SOCIAL_AUTH_PIPELINE = (
    'social_core.pipeline.social_auth.social_details',
    'social_core.pipeline.social_auth.social_uid',
    'social_core.pipeline.social_auth.auth_allowed',
    'social_core.pipeline.social_auth.social_user',
    'social_core.pipeline.user.get_username',
    'web_app.auth_views.check_school_email',
    'web_app.auth_views.create_user',
    'social_core.pipeline.social_auth.associate_user',
    'social_core.pipeline.social_auth.load_extra_data',
    'social_core.pipeline.user.user_details',
)

# ========================
# 🌍 CSRF / Locale
# ========================
CSRF_TRUSTED_ORIGINS = [
    'http://127.0.0.1:8000',
    'http://localhost:8000',
]

LANGUAGE_CODE = 'zh-hant'
TIME_ZONE = 'Asia/Taipei'
USE_I18N = True
USE_TZ = True

# ========================
# 📂 Static & Media
# ========================
STATIC_URL = '/static/'
STATICFILES_DIRS = [os.path.join(BASE_DIR, "web_app", "static")]
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ========================
# 🔑 環境變數 (其他)
# ========================
MONGO_URI = os.getenv("MONGO_URI")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-06-01")
AZURE_OPENAI_DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME")

GOOGLE_APPLICATION_CREDENTIALS = os.path.join(BASE_DIR, "vision_api_key.json")

# ========================
# ⚡ Redis Cache
# ========================
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}
OCR_CACHE_TIMEOUT = 3600

# ========================
# 🖼️ Image Upload
# ========================
MAX_IMAGE_SIZE = 10 * 1024 * 1024
ALLOWED_IMAGE_FORMATS = ['JPEG', 'PNG', 'WebP']

# ========================
# 📝 Logging
# ========================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs/vision_api.log'),
        },
    },
    'loggers': {
        'web_app.utils.google_vision_service': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
        'web_app.utils.enhanced_vision_utils_v2': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

# ========================
# 📧 Email Settings
# ========================
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = "ntubimd114510@gmail.com"
# ✅ [修改重點] Email 密碼也建議從 .env 讀取
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL = "智能校事專家 <ntubimd114510@gmail.com>"

# ========================
# ⏰ Reminder Settings
# ========================
REMINDER_SOURCES = [
    {
        "label": "活動",
        "model": "web_app.ActivityParticipant",
        "filters": {"status": "joined"},
        "date_field": {"date": "activity__date", "time": "activity__time"},
        "title_field": "activity__title",
        "user_field": ["user", "owner", "created_by"],
        "object_field_for_log": "activity",
    },
    {
        "label": "活動（建立者）",
        "model": "web_app.GroupActivity",
        "filters": {},
        "date_field": {"date": "date", "time": "time"},
        "title_field": "title",
        "user_field": ["user", "owner", "created_by"],
        "object_field_for_log": None,
    },
    {
        "label": "行事曆",
        "model": "web_app.Todo",
        "filters": {},
        "date_field": "date",
        "title_field": "title",
        "user_field": ["user", "owner", "created_by"],
        "object_field_for_log": None,
    },
]