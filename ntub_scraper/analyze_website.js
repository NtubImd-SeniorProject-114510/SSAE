const puppeteer = require('puppeteer-core');

async function analyzeNTUBWebsite() {
    let browser = null;
    
    try {
        console.log('🔍 開始分析北商學生資訊系統網站結構...');
        
        // 啟動瀏覽器
        browser = await puppeteer.launch({
            headless: false, // 設為false以便觀察
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        const page = await browser.newPage();
        
        // 設置用戶代理
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        console.log('📡 正在訪問登入頁面...');
        
        // 前往登入頁面
        await page.goto('https://ntcbadm1.ntub.edu.tw/login.aspx', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });

        console.log('✅ 頁面載入完成');
        
        // 分析頁面結構
        const pageInfo = await page.evaluate(() => {
            // 尋找可能的登入表單元素
            const forms = Array.from(document.querySelectorAll('form'));
            const inputs = Array.from(document.querySelectorAll('input'));
            const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'));
            
            // 尋找可能的學號輸入框
            const possibleUserFields = inputs.filter(input => {
                const id = input.id?.toLowerCase() || '';
                const name = input.name?.toLowerCase() || '';
                const placeholder = input.placeholder?.toLowerCase() || '';
                const type = input.type?.toLowerCase() || '';
                
                return type === 'text' && (
                    id.includes('user') || id.includes('student') || id.includes('account') ||
                    name.includes('user') || name.includes('student') || name.includes('account') ||
                    placeholder.includes('學號') || placeholder.includes('帳號') || placeholder.includes('user')
                );
            });
            
            // 尋找可能的密碼輸入框
            const possiblePasswordFields = inputs.filter(input => {
                const type = input.type?.toLowerCase() || '';
                return type === 'password';
            });
            
            // 尋找可能的驗證碼
            const captchaImages = Array.from(document.querySelectorAll('img')).filter(img => {
                const src = img.src?.toLowerCase() || '';
                const id = img.id?.toLowerCase() || '';
                return src.includes('captcha') || src.includes('verify') || id.includes('captcha') || id.includes('verify');
            });
            
            return {
                title: document.title,
                url: window.location.href,
                forms: forms.map(form => ({
                    id: form.id,
                    action: form.action,
                    method: form.method
                })),
                userFields: possibleUserFields.map(input => ({
                    id: input.id,
                    name: input.name,
                    type: input.type,
                    placeholder: input.placeholder
                })),
                passwordFields: possiblePasswordFields.map(input => ({
                    id: input.id,
                    name: input.name,
                    type: input.type
                })),
                buttons: buttons.map(btn => ({
                    id: btn.id,
                    type: btn.type,
                    value: btn.value,
                    textContent: btn.textContent?.trim()
                })),
                captchaImages: captchaImages.map(img => ({
                    id: img.id,
                    src: img.src,
                    alt: img.alt
                })),
                allInputs: inputs.map(input => ({
                    id: input.id,
                    name: input.name,
                    type: input.type,
                    placeholder: input.placeholder
                }))
            };
        });

        console.log('\n📋 網站分析結果:');
        console.log('=====================================');
        console.log(`標題: ${pageInfo.title}`);
        console.log(`網址: ${pageInfo.url}`);
        
        console.log('\n📝 表單信息:');
        pageInfo.forms.forEach((form, index) => {
            console.log(`  表單 ${index + 1}:`);
            console.log(`    ID: ${form.id || '無'}`);
            console.log(`    Action: ${form.action || '無'}`);
            console.log(`    Method: ${form.method || '無'}`);
        });
        
        console.log('\n👤 可能的學號輸入框:');
        if (pageInfo.userFields.length > 0) {
            pageInfo.userFields.forEach((field, index) => {
                console.log(`  輸入框 ${index + 1}:`);
                console.log(`    ID: ${field.id || '無'}`);
                console.log(`    Name: ${field.name || '無'}`);
                console.log(`    Placeholder: ${field.placeholder || '無'}`);
            });
        } else {
            console.log('  未找到明顯的學號輸入框');
        }
        
        console.log('\n🔒 密碼輸入框:');
        if (pageInfo.passwordFields.length > 0) {
            pageInfo.passwordFields.forEach((field, index) => {
                console.log(`  密碼框 ${index + 1}:`);
                console.log(`    ID: ${field.id || '無'}`);
                console.log(`    Name: ${field.name || '無'}`);
            });
        } else {
            console.log('  未找到密碼輸入框');
        }
        
        console.log('\n🔘 按鈕:');
        pageInfo.buttons.forEach((btn, index) => {
            console.log(`  按鈕 ${index + 1}:`);
            console.log(`    ID: ${btn.id || '無'}`);
            console.log(`    Type: ${btn.type || '無'}`);
            console.log(`    Value: ${btn.value || '無'}`);
            console.log(`    Text: ${btn.textContent || '無'}`);
        });
        
        console.log('\n🖼️ 驗證碼圖片:');
        if (pageInfo.captchaImages.length > 0) {
            pageInfo.captchaImages.forEach((img, index) => {
                console.log(`  圖片 ${index + 1}:`);
                console.log(`    ID: ${img.id || '無'}`);
                console.log(`    Src: ${img.src}`);
                console.log(`    Alt: ${img.alt || '無'}`);
            });
        } else {
            console.log('  未找到驗證碼圖片');
        }
        
        console.log('\n📋 所有輸入框:');
        pageInfo.allInputs.forEach((input, index) => {
            console.log(`  ${index + 1}. ID: ${input.id || '無'}, Name: ${input.name || '無'}, Type: ${input.type}, Placeholder: ${input.placeholder || '無'}`);
        });
        
        // 等待5秒讓用戶觀察頁面
        console.log('\n⏳ 等待5秒讓您觀察頁面...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
    } catch (error) {
        console.error('❌ 分析過程發生錯誤:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// 執行分析
analyzeNTUBWebsite();
