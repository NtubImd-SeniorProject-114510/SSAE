const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const ntubScraper = require('./scraper/ntubScraper');

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中間件
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:8000',
        'http://127.0.0.1:8001',
        'http://127.0.0.1:8002',
        'http://localhost:8001',
        'http://localhost:8002'
    ],
    credentials: true
}));

// 限制請求頻率
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分鐘
    max: 100, // 每15分鐘最多100次請求
    message: '請求過於頻繁，請稍後再試'
});
app.use(limiter);

app.use(express.json());

// 健康檢查
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 登入驗證
app.post('/api/login', async (req, res) => {
    try {
        const { studentId, password } = req.body;
        
        if (!studentId || !password) {
            return res.status(400).json({
                success: false,
                message: '學號和密碼為必填項目'
            });
        }

        const result = await ntubScraper.login(studentId, password);
        console.log('🔄 收到爬蟲結果:', result);
        
        if (result.success) {
            console.log('✅ 發送成功響應給Django');
            res.json({
                success: true,
                message: '登入成功',
                sessionToken: result.sessionToken
            });
        } else if (result.requiresManualInput) {
            // 需要手動輸入驗證碼
            res.status(401).json({
                success: false,
                requiresManualInput: true,
                sessionToken: result.sessionToken,
                captchaImage: result.captchaImage,
                ocrSuggestion: result.ocrSuggestion,
                message: result.message || '需要手動輸入驗證碼'
            });
        } else {
            res.status(401).json({
                success: false,
                message: result.message || '登入失敗'
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: '服務器錯誤，請稍後再試'
        });
    }
});

// 獲取學生基本資料
app.post('/api/student/profile', async (req, res) => {
    try {
        const { sessionToken } = req.body;
        
        if (!sessionToken) {
            return res.status(401).json({
                success: false,
                message: '請先登入'
            });
        }

        const profile = await ntubScraper.getStudentProfile(sessionToken);
        
        res.json({
            success: true,
            data: profile
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: '獲取資料失敗'
        });
    }
});

// 獲取成績資料
app.post('/api/student/grades', async (req, res) => {
    try {
        const { sessionToken, semester } = req.body;
        
        if (!sessionToken) {
            return res.status(401).json({
                success: false,
                message: '請先登入'
            });
        }

        const grades = await ntubScraper.getGrades(sessionToken, semester);
        
        res.json({
            success: true,
            data: grades
        });
    } catch (error) {
        console.error('Grades error:', error);
        res.status(500).json({
            success: false,
            message: '獲取成績失敗'
        });
    }
});

// 獲取課表
app.post('/api/student/schedule', async (req, res) => {
    try {
        const { sessionToken, semester } = req.body;
        
        if (!sessionToken) {
            return res.status(401).json({
                success: false,
                message: '請先登入'
            });
        }

        const schedule = await ntubScraper.getSchedule(sessionToken, semester);
        
        res.json({
            success: true,
            data: schedule
        });
    } catch (error) {
        console.error('Schedule error:', error);
        res.status(500).json({
            success: false,
            message: '獲取課表失敗'
        });
    }
});

// 手動輸入驗證碼
app.post('/api/input-captcha', async (req, res) => {
    try {
        const { sessionToken, captchaText } = req.body;
        
        if (!sessionToken || !captchaText) {
            return res.status(400).json({
                success: false,
                message: 'Session token和驗證碼為必填項目'
            });
        }

        const result = await ntubScraper.inputCaptchaAndLogin(sessionToken, captchaText);
        
        res.json(result);
    } catch (error) {
        console.error('Input captcha error:', error);
        res.status(500).json({
            success: false,
            message: '驗證碼輸入失敗'
        });
    }
});

// 登出
app.post('/api/logout', async (req, res) => {
    try {
        const { sessionToken } = req.body;
        
        if (sessionToken) {
            await ntubScraper.logout(sessionToken);
        }
        
        res.json({
            success: true,
            message: '登出成功'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: '登出失敗'
        });
    }
});

// 錯誤處理中間件
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        message: '服務器內部錯誤'
    });
});

// 404處理
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API端點不存在'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 NTUB Scraper API 運行在 http://localhost:${PORT}`);
    console.log(`📊 健康檢查: http://localhost:${PORT}/health`);
});

module.exports = app;
