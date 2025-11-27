const Tesseract = require('tesseract.js');
const Jimp = require('jimp');

class SimpleOCR {
    constructor() {
        this.isInitialized = false;
    }

    async recognizeText(imageBuffer) {
        try {
            console.log('🔍 開始數字驗證碼OCR識別...');
            
            // 預處理圖片
            const processedBuffer = await this.preprocessImage(imageBuffer);
            
            // 使用Tesseract進行識別，專門針對數字優化
            const { data: { text, confidence } } = await Tesseract.recognize(processedBuffer, 'eng', {
                logger: m => {
                    if (m.status === 'recognizing text' && m.progress) {
                        console.log(`OCR進度: ${Math.round(m.progress * 100)}%`);
                    }
                },
                tessedit_char_whitelist: '0123456789', // 只識別數字
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_WORD, // 單個詞模式
                tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY
            });
            
            // 清理識別結果，只保留數字
            const cleanText = text.replace(/\D/g, ''); // 移除所有非數字字符
            
            console.log(`📝 數字驗證碼識別結果: "${cleanText}" (信心度: ${confidence.toFixed(2)}%)`);
            
            return {
                text: cleanText,
                confidence: confidence,
                success: cleanText.length >= 3 && cleanText.length <= 6 && confidence > 50 // 降低信心度要求
            };
        } catch (error) {
            console.error('❌ OCR識別失敗:', error);
            return {
                text: '',
                confidence: 0,
                success: false
            };
        }
    }

    async preprocessImage(imageBuffer) {
        try {
            console.log('🔧 預處理數字驗證碼圖片...');
            
            const image = await Jimp.read(imageBuffer);
            
            // 針對數字驗證碼的特殊預處理
            image
                .resize(image.bitmap.width * 3, image.bitmap.height * 3) // 放大3倍，提高清晰度
                .greyscale() // 轉灰階
                .contrast(0.5) // 增強對比度
                .brightness(0.1) // 稍微增加亮度
                .normalize() // 正規化
                .threshold({ max: 128 }); // 二值化，黑白分明
            
            const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
            console.log('✅ 數字驗證碼圖片預處理完成');
            
            return processedBuffer;
        } catch (error) {
            console.error('❌ 圖片預處理失敗:', error);
            return imageBuffer; // 返回原圖
        }
    }

    async processCaptcha(page) {
        try {
            console.log('🖼️ 開始處理數字驗證碼圖片...');
            
            // 專門尋找 Validation_Image
            let captchaImg = await page.$('#Validation_Image');
            
            if (!captchaImg) {
                // 備選方案：尋找其他可能的驗證碼圖片
                captchaImg = await page.$('img[src*="captcha"], img[src*="verify"], img[id*="captcha"], img[id*="verify"], img[id*="validation"]');
            }
            
            if (!captchaImg) {
                console.log('⚠️ 未找到 Validation_Image 或其他驗證碼圖片');
                // 如果還是沒找到，嘗試找所有圖片
                const allImages = await page.$$('img');
                for (const img of allImages) {
                    const id = await img.evaluate(el => el.id);
                    const src = await img.evaluate(el => el.src);
                    if (id && (id.includes('validation') || id.includes('captcha') || id.includes('verify'))) {
                        captchaImg = img;
                        console.log(`📷 找到驗證碼圖片: ${id}`);
                        break;
                    }
                    if (src && (src.includes('captcha') || src.includes('verify') || src.includes('code'))) {
                        captchaImg = img;
                        console.log(`📷 找到驗證碼圖片: ${src}`);
                        break;
                    }
                }
            } else {
                console.log('📷 找到 Validation_Image 驗證碼圖片');
            }

            let captchaBuffer;
            if (captchaImg) {
                captchaBuffer = await captchaImg.screenshot({ type: 'png' });
                console.log('📷 驗證碼圖片截取成功');
            } else {
                console.log('⚠️ 未找到驗證碼圖片，截取登入區域');
                // 截取登入表單區域
                const loginForm = await page.$('#form1');
                if (loginForm) {
                    captchaBuffer = await loginForm.screenshot({ type: 'png' });
                } else {
                    captchaBuffer = await page.screenshot({ 
                        type: 'png',
                        clip: { x: 0, y: 0, width: 800, height: 400 }
                    });
                }
            }

            // OCR識別
            const ocrResult = await this.recognizeText(captchaBuffer);

            return {
                captchaImage: captchaBuffer.toString('base64'),
                ocrResult: ocrResult,
                recognizedText: ocrResult.text,
                confidence: ocrResult.confidence,
                autoFillRecommended: ocrResult.success
            };

        } catch (error) {
            console.error('❌ 驗證碼處理失敗:', error);
            return null;
        }
    }
}

module.exports = SimpleOCR;
