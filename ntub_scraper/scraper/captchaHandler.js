const Tesseract = require('tesseract.js');
const Jimp = require('jimp');

class CaptchaHandler {
    constructor() {
        this.ocrWorker = null;
        this.initOCR();
    }

    async initOCR() {
        try {
            console.log('🔍 初始化OCR引擎...');
            this.ocrWorker = await Tesseract.createWorker('eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text' && m.progress) {
                        console.log(`OCR進度: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });
            
            // 設置OCR參數，針對驗證碼優化
            await this.ocrWorker.setParameters({
                'tessedit_char_whitelist': '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
                'tessedit_pageseg_mode': Tesseract.PSM.SINGLE_WORD,
                'tessedit_ocr_engine_mode': Tesseract.OEM.LSTM_ONLY
            });
            
            console.log('✅ OCR引擎初始化完成');
        } catch (error) {
            console.error('❌ OCR引擎初始化失敗:', error);
            this.ocrWorker = null;
        }
    }

    async processCaptchaImage(page) {
        try {
            console.log('🖼️ 開始處理驗證碼圖片...');
            
            // 尋找驗證碼圖片
            const captchaImg = await page.$('img[src*="captcha"], img[src*="verify"], img[id*="captcha"], img[id*="verify"]');
            
            if (!captchaImg) {
                console.log('⚠️ 未找到驗證碼圖片');
                return null;
            }

            // 獲取圖片信息
            const imgInfo = await captchaImg.evaluate(img => ({
                src: img.src,
                width: img.width,
                height: img.height
            }));

            console.log('📷 驗證碼圖片信息:', imgInfo);

            // 截取驗證碼圖片
            const captchaBuffer = await captchaImg.screenshot({
                type: 'png'
            });

            // 預處理圖片
            const processedBuffer = await this.preprocessImage(captchaBuffer);

            // OCR識別
            const ocrResult = await this.recognizeText(processedBuffer);

            return {
                originalImage: captchaBuffer,
                processedImage: processedBuffer,
                recognizedText: ocrResult.text,
                confidence: ocrResult.confidence,
                imgInfo
            };

        } catch (error) {
            console.error('❌ 驗證碼處理失敗:', error);
            return null;
        }
    }

    async preprocessImage(imageBuffer) {
        try {
            console.log('🔧 預處理驗證碼圖片...');
            
            const image = await Jimp.read(imageBuffer);
            
            // 圖片預處理：增強對比度、去噪、二值化
            image
                .resize(image.bitmap.width * 3, image.bitmap.height * 3) // 放大3倍
                .greyscale() // 轉灰階
                .contrast(0.5) // 增加對比度
                .normalize() // 正規化
                .threshold({ max: 128 }); // 二值化
            
            const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
            console.log('✅ 圖片預處理完成');
            
            return processedBuffer;
        } catch (error) {
            console.error('❌ 圖片預處理失敗:', error);
            return imageBuffer; // 返回原圖
        }
    }

    async recognizeText(imageBuffer) {
        try {
            if (!this.ocrWorker) {
                throw new Error('OCR引擎未初始化');
            }

            console.log('🔍 開始OCR文字識別...');
            
            const { data: { text, confidence } } = await this.ocrWorker.recognize(imageBuffer);
            
            // 清理識別結果
            const cleanText = text.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
            
            console.log(`📝 OCR識別結果: "${cleanText}" (信心度: ${confidence.toFixed(2)}%)`);
            
            return {
                text: cleanText,
                confidence: confidence
            };
        } catch (error) {
            console.error('❌ OCR識別失敗:', error);
            return {
                text: '',
                confidence: 0
            };
        }
    }

    async handleCaptcha(page, sessionToken) {
        try {
            console.log('🎯 開始處理驗證碼...');
            
            // 處理驗證碼圖片
            const captchaResult = await this.processCaptchaImage(page);
            
            if (!captchaResult) {
                return {
                    success: false,
                    message: '無法獲取驗證碼圖片',
                    requiresManualInput: true
                };
            }

            // 如果OCR信心度較高，直接使用
            if (captchaResult.confidence > 70 && captchaResult.recognizedText.length >= 3) {
                console.log(`✅ OCR識別信心度較高 (${captchaResult.confidence.toFixed(2)}%)，嘗試自動填入`);
                
                try {
                    // 填入驗證碼
                    await page.type('#CheckCode', captchaResult.recognizedText);
                    
                    return {
                        success: true,
                        method: 'auto_ocr',
                        recognizedText: captchaResult.recognizedText,
                        confidence: captchaResult.confidence
                    };
                } catch (error) {
                    console.error('❌ 自動填入驗證碼失敗:', error);
                }
            }

            // OCR信心度不足，需要手動輸入
            console.log(`⚠️ OCR識別信心度不足 (${captchaResult.confidence.toFixed(2)}%)，需要手動輸入`);
            
            return {
                success: false,
                message: 'OCR識別信心度不足，需要手動輸入驗證碼',
                requiresManualInput: true,
                captchaImage: captchaResult.originalImage.toString('base64'),
                ocrSuggestion: captchaResult.recognizedText,
                sessionToken: sessionToken
            };

        } catch (error) {
            console.error('❌ 驗證碼處理過程發生錯誤:', error);
            return {
                success: false,
                message: '驗證碼處理失敗',
                requiresManualInput: true
            };
        }
    }

    async inputManualCaptcha(page, captchaText) {
        try {
            console.log(`✍️ 手動輸入驗證碼: ${captchaText}`);
            
            // 清空現有內容
            await page.evaluate(() => {
                const checkCodeInput = document.querySelector('#CheckCode');
                if (checkCodeInput) {
                    checkCodeInput.value = '';
                }
            });
            
            // 輸入新的驗證碼
            await page.type('#CheckCode', captchaText);
            
            console.log('✅ 驗證碼輸入完成');
            return true;
        } catch (error) {
            console.error('❌ 手動輸入驗證碼失敗:', error);
            return false;
        }
    }

    async cleanup() {
        if (this.ocrWorker) {
            await this.ocrWorker.terminate();
            console.log('🧹 OCR引擎已清理');
        }
    }
}

module.exports = CaptchaHandler;
