import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-$fdia7icb&ji2k_6aof1b)s#ozo^kvo9%9@#o@23z+x(ki+r)j'
DEBUG = True
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "social_django",  # Google OAuth2
    "web_app",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "social_django.middleware.SocialAuthExceptionMiddleware",  # 處理登入錯誤
]

ROOT_URLCONF = 'django_system.urls'

SOCIAL_AUTH_GOOGLE_OAUTH2_AUTH_EXTRA_ARGUMENTS = {
    'prompt': 'select_account',
}

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
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

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': '114-510',
        'USER': '114510',
        'PASSWORD': '@!LL51o@',
        'HOST': '140.131.114.242',
        'PORT': '3306',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',},
]

# Social Auth 設定
AUTHENTICATION_BACKENDS = (
    'social_core.backends.google.GoogleOAuth2',
    'django.contrib.auth.backends.ModelBackend',
)

LOGIN_URL = '/auth/login/google-oauth2/'
LOGIN_REDIRECT_URL = '/index'
LOGOUT_REDIRECT_URL = '/welcome'
SOCIAL_AUTH_LOGIN_ERROR_URL = '/index/'
SOCIAL_AUTH_RAISE_EXCEPTIONS = False

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler',},
    },
    'loggers': {
        'your_app_name': {'handlers': ['console'], 'level': 'INFO', 'propagate': True,}
    },
}

SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = '37270199093-k1doq535f74tl3423amrrqv9dincdeb4.apps.googleusercontent.com'
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = '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'
SOCIAL_AUTH_GOOGLE_OAUTH2_WHITELISTED_DOMAINS = ['ntub.edu.tw']
SOCIAL_AUTH_REDIRECT_IS_HTTPS = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI = 'http://127.0.0.1:8000/auth/complete/google-oauth2/'
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True


# 請求用戶的個人資料和電子郵件權限
SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid'
]

# 確保獲取用戶的個人資料圖片
SOCIAL_AUTH_GOOGLE_OAUTH2_EXTRA_DATA = [
    ('picture', 'picture'),
    ('email', 'email'),
    ('name', 'name')
]

# Social Auth Pipeline
SOCIAL_AUTH_PIPELINE = (
    'social_core.pipeline.social_auth.social_details',
    'social_core.pipeline.social_auth.social_uid',
    'social_core.pipeline.social_auth.auth_allowed',
    'social_core.pipeline.social_auth.social_user',
    'social_core.pipeline.user.get_username',
    'web_app.auth_views.check_school_email',  # 添加學校郵件檢查
    'web_app.auth_views.create_user',
    'social_core.pipeline.social_auth.associate_user',
    'social_core.pipeline.social_auth.load_extra_data',
    'social_core.pipeline.user.user_details',
)

# 設定安全的域名
CSRF_TRUSTED_ORIGINS = [
    'http://127.0.0.1:8000',
    'http://localhost:8000',
    'http://d27e8c3eadeb.ngrok-free.app',  # Ngrok的地址
]

# 國際化設置
LANGUAGE_CODE = 'zh-hant'
TIME_ZONE = 'Asia/Taipei'
USE_I18N = True
USE_TZ = True

# 靜態文件設置
STATIC_URL = 'static/'
STATICFILES_DIRS = [os.path.join(BASE_DIR, "web_app", "static")]
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# 媒體文件設置
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# 預設主鍵欄位類型
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# 載入 .env 檔案
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

ALLOWED_HOSTS = ['*', 'b5bd1f1cffd38137455bf0672b7a89c2.serveo.net']

# 確保在 http://127.0.0.1:8000 下 cookie 會被送出
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
