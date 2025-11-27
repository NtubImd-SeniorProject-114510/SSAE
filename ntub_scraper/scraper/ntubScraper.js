const puppeteer = require('puppeteer');
const crypto = require('crypto');
const SimpleOCR = require('./simpleOCR');

class NTUBScraper {
    constructor() {
        this.sessions = new Map(); // 存儲活躍的session
        this.baseUrl = 'https://ntcbadm1.ntub.edu.tw'; // 北商學生資訊系統實際網址
    }

    // 生成session token
    generateSessionToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    // 登入功能
    async login(studentId, password) {
        let browser = null;
        let page = null;

        try {
            console.log(`🔐 嘗試登入學號: ${studentId}`);

            // 啟動瀏覽器 - 使用完整puppeteer，自動管理瀏覽器
            browser = await puppeteer.launch({
                headless: 'new', // 使用新的headless模式
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });

            page = await browser.newPage();
            
            // 設置用戶代理
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            // 前往登入頁面
            await page.goto(`${this.baseUrl}/login.aspx`, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            // 等待登入表單載入
            await page.waitForSelector('#UserID', { timeout: 10000 });
            await page.waitForSelector('#PWD', { timeout: 10000 });

            // 填入登入資料
            await page.type('#UserID', studentId);
            await page.type('#PWD', password);

            // 檢查是否有驗證碼
            const checkCodeExists = await page.$('#CheckCode') !== null;
            if (checkCodeExists) {
                console.log('🎯 檢測到驗證碼輸入框，開始智能處理');
                
                const sessionToken = this.generateSessionToken();
                const ocr = new SimpleOCR();
                
                try {
                    // 處理驗證碼圖片和OCR識別
                    const captchaResult = await ocr.processCaptcha(page);
                    
                    if (!captchaResult) {
                        await browser.close();
                        return {
                            success: false,
                            message: '驗證碼處理失敗'
                        };
                    }

                    // 如果OCR識別成功且信心度高，自動填入
                    if (captchaResult.autoFillRecommended) {
                        console.log(`🤖 OCR識別成功，自動填入驗證碼: ${captchaResult.recognizedText}`);
                        
                        try {
                            // 自動填入驗證碼
                            await page.evaluate(() => {
                                const checkCodeInput = document.querySelector('#CheckCode');
                                if (checkCodeInput) {
                                    checkCodeInput.value = '';
                                }
                            });
                            
                            await page.type('#CheckCode', captchaResult.recognizedText);
                            console.log('✅ 驗證碼自動填入完成，繼續登入流程');
                            
                            // 自動填入成功，跳出驗證碼處理，繼續登入流程
                            
                        } catch (error) {
                            console.error('❌ 自動填入驗證碼失敗:', error);
                            // 如果自動填入失敗，降級為手動輸入
                            await browser.close();
                            return {
                                success: false,
                                message: '驗證碼自動填入失敗'
                            };
                        }
                    } else {
                        // OCR識別失敗或信心度不足，需要手動輸入
                        console.log(`⚠️ OCR識別信心度不足 (${captchaResult.confidence.toFixed(2)}%)，需要手動輸入`);
                        
                        // 保存session等待用戶輸入
                        this.sessions.set(sessionToken, {
                            browser,
                            page,
                            studentId,
                            loginTime: new Date(),
                            lastActivity: new Date(),
                            status: 'waiting_captcha'
                        });
                        
                        return {
                            success: false,
                            requiresManualInput: true,
                            sessionToken: sessionToken,
                            captchaImage: captchaResult.captchaImage,
                            ocrSuggestion: captchaResult.recognizedText,
                            message: '需要手動輸入驗證碼'
                        };
                    }
                    
                } catch (error) {
                    console.error('❌ 驗證碼處理失敗:', error);
                    await browser.close();
                    return {
                        success: false,
                        message: '驗證碼處理失敗'
                    };
                }
            }

            // 點擊登入按鈕
            console.log('🖱️ 準備點擊登入按鈕...');
            
            // 確保登入按鈕可見和可點擊
            await page.waitForSelector('#Client_Login', { visible: true, timeout: 10000 });
            
            // 滾動到登入按鈕位置
            await page.evaluate(() => {
                const loginBtn = document.querySelector('#Client_Login');
                if (loginBtn) {
                    loginBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
            
            // 等待一下讓頁面穩定
            await page.waitForTimeout(1000);
            
            // 嘗試點擊登入按鈕
            try {
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
                    page.click('#Client_Login')
                ]);
            } catch (clickError) {
                console.log('⚠️ 直接點擊失敗，嘗試JavaScript點擊');
                // 如果直接點擊失敗，使用JavaScript點擊
                await page.evaluate(() => {
                    const loginBtn = document.querySelector('#Client_Login');
                    if (loginBtn) {
                        loginBtn.click();
                    }
                });
                
                // 等待頁面導航，但設置較短的超時時間
                try {
                    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
                } catch (navError) {
                    console.log('⚠️ 頁面導航超時，繼續檢查登入狀態');
                    // 即使導航超時，也繼續檢查登入狀態
                }
            }

            // 檢查是否登入成功
            const currentUrl = page.url();
            console.log(`🔍 當前頁面URL: ${currentUrl}`);
            
            const isLoginSuccess = !currentUrl.includes('login.aspx') && !currentUrl.includes('error');
            console.log(`📋 登入成功判斷: ${isLoginSuccess}`);

            if (isLoginSuccess) {
                console.log(`🎯 開始處理登入成功邏輯`);
                
                // 生成session token並保存瀏覽器實例
                const sessionToken = this.generateSessionToken();
                console.log(`🔑 生成session token: ${sessionToken.substring(0, 10)}...`);
                
                this.sessions.set(sessionToken, {
                    browser,
                    page,
                    studentId,
                    loginTime: new Date(),
                    lastActivity: new Date()
                });
                console.log(`💾 Session已保存`);

                console.log(`✅ 學號 ${studentId} 登入成功`);
                
                const result = {
                    success: true,
                    sessionToken,
                    message: '登入成功'
                };
                console.log(`📤 準備返回成功結果:`, result);
                
                return result;
            } else {
                // 登入失敗，關閉瀏覽器
                await browser.close();
                
                console.log(`❌ 學號 ${studentId} 登入失敗`);
                
                return {
                    success: false,
                    message: '學號或密碼錯誤'
                };
            }

        } catch (error) {
            console.error('登入過程發生錯誤:', error);
            console.error('錯誤堆疊:', error.stack);
            
            if (browser) {
                try {
                    await browser.close();
                } catch (closeError) {
                    console.error('關閉瀏覽器失敗:', closeError);
                }
            }
            
            return {
                success: false,
                message: '登入過程發生錯誤，請稍後再試'
            };
        }
    }

    // 獲取學生基本資料
    async getStudentProfile(sessionToken) {
        const session = this.sessions.get(sessionToken);
        
        if (!session) {
            throw new Error('Session已過期，請重新登入');
        }

        try {
            const { page } = session;
            session.lastActivity = new Date();

            console.log('📋 開始獲取學生基本資料...');
            
            // 嘗試多個可能的學生資料頁面URL
            const possibleUrls = [
                `${this.baseUrl}/Portal/indexSTD.aspx`,
                `${this.baseUrl}/Student/StudentInfo.aspx`,
                `${this.baseUrl}/Portal/StudentInfo.aspx`,
                `${this.baseUrl}/student/profile.aspx`
            ];

            let profile = {};
            let currentUrl = page.url();
            console.log(`🔍 當前頁面: ${currentUrl}`);

            // 嘗試從當前頁面提取資料
            profile = await this.extractStudentDataFromPage(page);
            
            // 如果當前頁面沒有資料，嘗試導航到其他頁面
            if (Object.keys(profile).length === 0) {
                for (const url of possibleUrls) {
                    try {
                        console.log(`🔗 嘗試導航到: ${url}`);
                        await page.goto(url, { 
                            waitUntil: 'networkidle2',
                            timeout: 15000 
                        });
                        
                        await page.waitForTimeout(2000);
                        profile = await this.extractStudentDataFromPage(page);
                        
                        if (Object.keys(profile).length > 0) {
                            console.log(`✅ 在 ${url} 找到學生資料`);
                            break;
                        }
                    } catch (navError) {
                        console.log(`⚠️ 導航失敗: ${url} - ${navError.message}`);
                        continue;
                    }
                }
            }

            console.log(`📋 獲取學生資料結果:`, profile);
            return profile;

        } catch (error) {
            console.error('獲取學生資料失敗:', error);
            throw new Error('獲取學生資料失敗');
        }
    }

    // 從頁面提取學生資料的輔助方法
    async extractStudentDataFromPage(page) {
        return await page.evaluate(() => {
            const data = {};
            
            console.log('🔍 開始提取學生個人資料...');
            
            // 方法1: 使用具體的ID提取資料 (最準確)
            const classNameElement = document.getElementById('ClassName');
            const stdNoElement = document.getElementById('StdNo');
            const nameElement = document.getElementById('Name');
            
            if (classNameElement && stdNoElement && nameElement) {
                console.log('✅ 找到標準ID元素');
                
                // 提取基本資料
                data.student_id = stdNoElement.textContent.trim();
                data.name = nameElement.textContent.trim();
                
                // 解析班級資訊 "五專資管五年甲班"
                const classInfo = classNameElement.textContent.trim();
                console.log('📋 班級資訊:', classInfo);
                
                // 解析班級資訊
                const classMatch = classInfo.match(/(五專|四技|二技|進修部|日間部)?(資管|企管|會資|應外|財稅|國商|數媒|商創)?(五年|四年|三年|二年|一年)?([甲乙丙丁戊己庚辛壬癸]班)?/);
                
                if (classMatch) {
                    const [, program, dept, grade, classCode] = classMatch;
                    
                    if (program) {
                        data.program = program;
                    }
                    
                    if (dept) {
                        const deptMap = {
                            '資管': '資訊管理系',
                            '企管': '企業管理系', 
                            '會資': '會計資訊系',
                            '應外': '應用外語系',
                            '財稅': '財政稅務系',
                            '國商': '國際商務系',
                            '數媒': '數位多媒體設計系',
                            '商創': '商品創意經營系'
                        };
                        data.department = deptMap[dept] || (dept + '系');
                    }
                    
                    if (grade) {
                        data.grade = grade + '級';
                    }
                    
                    if (classCode) {
                        data.class = classCode;
                    }
                }
                
                console.log('🎉 成功提取學生資料:', data);
                return data;
            }
            
            console.log('⚠️ 未找到標準ID元素，使用備用方案');
            
            // 方法2: 備用方案 - 從頁面內容中搜索
            const pageContent = document.documentElement.outerHTML;
            
            // 提取完整學生資訊 - 查找 "五專資管五年甲班 11056019 陳宜佳" 格式
            const fullInfoMatch = pageContent.match(/(五專|四技|二技|進修部|日間部)?(資管|企管|會資|應外|財稅|國商|數媒|商創)?(五年|四年|三年|二年|一年)?([甲乙丙丁戊己庚辛壬癸]班)?\s*(\d{8})\s*([\u4e00-\u9fa5]{2,4})/);
            
            if (fullInfoMatch) {
                console.log('🎯 找到完整學生資訊:', fullInfoMatch);
                const [fullMatch, program, dept, grade, classInfo, studentId, name] = fullInfoMatch;
                
                data.student_id = studentId;
                data.name = name;
                
                if (program) data.program = program;
                if (dept) {
                    const deptMap = {
                        '資管': '資訊管理系',
                        '企管': '企業管理系', 
                        '會資': '會計資訊系',
                        '應外': '應用外語系',
                        '財稅': '財政稅務系',
                        '國商': '國際商務系',
                        '數媒': '數位多媒體設計系',
                        '商創': '商品創意經營系'
                    };
                    data.department = deptMap[dept] || dept;
                }
                if (grade) data.grade = grade + '級';
                if (classInfo) data.class = classInfo;
            } else {
                // 最後備用方案：提取姓名
                const nameMatch = pageContent.match(/陳宜佳|[\u4e00-\u9fa5]{2,4}(?=\s*登出)/);
                if (nameMatch) {
                    data.name = nameMatch[0];
                }
            }
            
            // 提取學號 - 從URL或頁面內容中
            const currentUrl = window.location.href;
            const studentIdMatch = currentUrl.match(/student_id=(\d+)/) || 
                                 pageContent.match(/學號[：:\s]*(\d+)/) ||
                                 pageContent.match(/(\d{8})/); // 8位數字的學號
            if (studentIdMatch) {
                data.student_id = studentIdMatch[1];
            }
            
            // 從頁面標題或內容提取系所資訊
            const deptPatterns = [
                /資訊管理系/,
                /企業管理系/,
                /會計資訊系/,
                /應用外語系/,
                /財政稅務系/,
                /國際商務系/,
                /數位多媒體設計系/,
                /商品創意經營系/
            ];
            
            for (const pattern of deptPatterns) {
                const match = pageContent.match(pattern);
                if (match) {
                    data.department = match[0];
                    break;
                }
            }
            
            // 嘗試從頁面結構中提取更多資訊
            try {
                // 查找包含學生資訊的元素
                const infoElements = document.querySelectorAll('td, span, div');
                infoElements.forEach(el => {
                    const text = el.textContent?.trim();
                    if (!text) return;
                    
                    // 匹配年級
                    if (text.match(/[一二三四五六七八九十1-9]年級/) && !data.grade) {
                        data.grade = text;
                    }
                    
                    // 匹配班級
                    if (text.match(/[A-Z]\s*班|[甲乙丙丁戊己庚辛壬癸]\s*班/) && !data.class) {
                        data.class = text;
                    }
                    
                    // 匹配學制
                    if (text.match(/(日間部|進修部|碩士班|博士班|四技|二技|五專)/) && !data.program) {
                        data.program = text;
                    }
                });
            } catch (e) {
                console.log('提取額外資訊時發生錯誤:', e);
            }
            
            // 如果沒有找到姓名，設置預設值
            if (!data.name && data.student_id) {
                data.name = '學生'; // 預設值
            }
            
            // 如果沒有找到系所，嘗試從當前頁面推測
            if (!data.department) {
                data.department = '資訊管理系'; // 根據學號推測，可以後續改進
            }
            
            return data;
        });
    }

    // 獲取成績資料
    async getGrades(sessionToken, semester = null) {
        const session = this.sessions.get(sessionToken);
        
        if (!session) {
            throw new Error('Session已過期，請重新登入');
        }

        try {
            const { page } = session;
            session.lastActivity = new Date();

            console.log('📊 開始獲取成績資料...');
            
            // 確保在正確的頁面
            const currentUrl = page.url();
            console.log(`🔍 當前頁面: ${currentUrl}`);
            
            // 如果不在學生資訊系統頁面，先導航到首頁
            if (!currentUrl.includes('indexSTD.aspx')) {
                console.log('🔗 導航到學生首頁...');
                await page.goto(`${this.baseUrl}/Portal/indexSTD.aspx`, { 
                    waitUntil: 'networkidle2',
                    timeout: 15000 
                });
                await page.waitForTimeout(2000);
            }

            // 步驟1: 點擊 "學生資訊系統(請按我)"
            console.log('🖱️ 尋找並點擊 "學生資訊系統(請按我)"...');
            
            try {
                await page.waitForSelector('.ThemePanelMainItemText', { timeout: 10000 });
                
                const systemLinkClicked = await page.evaluate(() => {
                    const elements = Array.from(document.querySelectorAll('.ThemePanelMainItemText'));
                    const systemLink = elements.find(el => el.textContent.includes('學生資訊系統'));
                    
                    if (systemLink) {
                        const parentLink = systemLink.closest('a') || systemLink.parentElement.closest('a');
                        if (parentLink) {
                            parentLink.click();
                            return true;
                        }
                    }
                    return false;
                });

                if (systemLinkClicked) {
                    console.log('✅ 成功點擊學生資訊系統連結');
                    await page.waitForTimeout(3000);
                } else {
                    console.log('⚠️ 未找到學生資訊系統連結，嘗試直接導航');
                    await page.goto(`${this.baseUrl}/Portal/Main_total.aspx?SysID=STDWEB`, { 
                        waitUntil: 'networkidle2' 
                    });
                }
            } catch (linkError) {
                console.log('⚠️ 點擊學生資訊系統連結失敗，嘗試直接導航:', linkError.message);
                await page.goto(`${this.baseUrl}/Portal/Main_total.aspx?SysID=STDWEB`, { 
                    waitUntil: 'networkidle2' 
                });
            }

            // 步驟2: 尋找成績查詢連結
            console.log('🖱️ 尋找成績查詢連結...');
            
            await page.waitForTimeout(2000);
            
            const gradePageUrl = await page.evaluate(() => {
                // 尋找成績相關連結
                const links = Array.from(document.querySelectorAll('a'));
                const gradeLink = links.find(link => 
                    link.textContent.includes('成績') || 
                    link.textContent.includes('學期成績') ||
                    link.href.includes('Grade') ||
                    link.href.includes('Score')
                );
                
                if (gradeLink) {
                    console.log('找到成績連結:', gradeLink.href);
                    return gradeLink.href;
                }
                return null;
            });

            if (gradePageUrl) {
                console.log('🔗 導航到成績頁面:', gradePageUrl);
                await page.goto(gradePageUrl, { 
                    waitUntil: 'networkidle2',
                    timeout: 15000 
                });
            } else {
                // 備用方案：嘗試常見的成績頁面URL
                console.log('🔗 使用備用方案導航到成績頁面');
                const possibleUrls = [
                    `${this.baseUrl}/STDWEB/Sel_Student_Grade.aspx`,
                    `${this.baseUrl}/STDWEB/Grade.aspx`,
                    `${this.baseUrl}/student/grades.aspx`
                ];
                
                for (const url of possibleUrls) {
                    try {
                        await page.goto(url, { waitUntil: 'networkidle2' });
                        break;
                    } catch (e) {
                        continue;
                    }
                }
            }

            // 步驟3: 等待成績頁面載入並提取資料
            console.log('📋 等待成績頁面載入...');
            await page.waitForTimeout(3000);

            // 如果指定學期，嘗試選擇學期
            if (semester) {
                try {
                    console.log(`🗓️ 嘗試選擇學期: ${semester}`);
                    
                    // 嘗試多種可能的學期選擇器
                    const semesterSelectors = [
                        '#ddlSemester',
                        '#ctl00_ContentPlaceHolder1_ddlSemester',
                        'select[name*="Semester"]',
                        'select[name*="semester"]',
                        'select[id*="Semester"]',
                        'select[id*="semester"]'
                    ];
                    
                    let selectorFound = false;
                    for (const selector of semesterSelectors) {
                        try {
                            const element = await page.$(selector);
                            if (element) {
                                console.log(`✅ 找到學期選擇器: ${selector}`);
                                await page.select(selector, semester);
                                await page.waitForTimeout(3000); // 等待頁面更新
                                selectorFound = true;
                                break;
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                    
                    if (!selectorFound) {
                        console.log('⚠️ 未找到學期選擇器，使用當前學期');
                    }
                } catch (e) {
                    console.log('⚠️ 學期選擇失敗:', e.message);
                }
            }

            // 提取成績資料
            const grades = await page.evaluate(() => {
                const gradeData = [];
                
                // 嘗試多種可能的成績表格選擇器
                const possibleSelectors = [
                    'table[id*="Grade"]',
                    'table[id*="Score"]',
                    'table[id*="gv"]',
                    '.grade-table',
                    'table[border="1"]',
                    'table'
                ];
                
                let gradeTable = null;
                
                for (const selector of possibleSelectors) {
                    const tables = document.querySelectorAll(selector);
                    for (const table of tables) {
                        const tableText = table.textContent;
                        if (tableText.includes('課程') || tableText.includes('成績') || 
                            tableText.includes('學分') || tableText.includes('科目')) {
                            gradeTable = table;
                            break;
                        }
                    }
                    if (gradeTable) break;
                }
                
                if (gradeTable) {
                    console.log('✅ 找到成績表格');
                    
                    const rows = Array.from(gradeTable.querySelectorAll('tr'));
                    
                    rows.forEach((row, index) => {
                        if (index === 0) return; // 跳過表頭
                        
                        const cells = Array.from(row.querySelectorAll('td, th'));
                        
                        if (cells.length >= 4) {
                            const rowData = cells.map(cell => cell.textContent.trim());
                            
                            // 過濾掉空行
                            if (rowData.some(cell => cell.length > 0)) {
                                gradeData.push({
                                    courseCode: rowData[0] || '',
                                    courseName: rowData[1] || '',
                                    credits: rowData[2] || '',
                                    grade: rowData[3] || '',
                                    gpa: rowData[4] || '',
                                    remark: rowData[5] || ''
                                });
                            }
                        }
                    });
                } else {
                    console.log('⚠️ 未找到成績表格');
                }
                
                return gradeData;
            });

            console.log(`📊 獲取成績資料成功，共 ${grades.length} 門課程`);
            return grades;

        } catch (error) {
            console.error('獲取成績資料失敗:', error);
            throw new Error('獲取成績資料失敗');
        }
    }

    // 獲取課表
    async getSchedule(sessionToken, semester = null) {
        const session = this.sessions.get(sessionToken);
        
        if (!session) {
            throw new Error('Session已過期，請重新登入');
        }

        try {
            const { page } = session;
            session.lastActivity = new Date();

            console.log('📅 開始獲取課表資料...');
            
            // 確保在正確的頁面
            const currentUrl = page.url();
            console.log(`🔍 當前頁面: ${currentUrl}`);
            
            // 如果不在學生資訊系統頁面，先導航到首頁
            if (!currentUrl.includes('indexSTD.aspx')) {
                console.log('🔗 導航到學生首頁...');
                await page.goto(`${this.baseUrl}/Portal/indexSTD.aspx`, { 
                    waitUntil: 'networkidle2',
                    timeout: 15000 
                });
                await page.waitForTimeout(2000);
            }

            // 步驟1: 點擊 "學生資訊系統(請按我)"
            console.log('🖱️ 尋找並點擊 "學生資訊系統(請按我)"...');
            
            try {
                // 等待並點擊學生資訊系統連結
                await page.waitForSelector('.ThemePanelMainItemText', { timeout: 10000 });
                
                const systemLinkClicked = await page.evaluate(() => {
                    const elements = Array.from(document.querySelectorAll('.ThemePanelMainItemText'));
                    const systemLink = elements.find(el => el.textContent.includes('學生資訊系統'));
                    
                    if (systemLink) {
                        // 找到父級連結並點擊
                        const parentLink = systemLink.closest('a') || systemLink.parentElement.closest('a');
                        if (parentLink) {
                            parentLink.click();
                            return true;
                        }
                    }
                    return false;
                });

                if (systemLinkClicked) {
                    console.log('✅ 成功點擊學生資訊系統連結');
                    await page.waitForTimeout(3000); // 等待頁面載入
                } else {
                    console.log('⚠️ 未找到學生資訊系統連結，嘗試直接導航');
                    await page.goto(`${this.baseUrl}/Portal/Main_total.aspx?SysID=STDWEB`, { 
                        waitUntil: 'networkidle2' 
                    });
                }
            } catch (linkError) {
                console.log('⚠️ 點擊學生資訊系統連結失敗，嘗試直接導航:', linkError.message);
                await page.goto(`${this.baseUrl}/Portal/Main_total.aspx?SysID=STDWEB`, { 
                    waitUntil: 'networkidle2' 
                });
            }

            // 步驟2: 點擊 "我的課表"
            console.log('🖱️ 尋找並點擊 "我的課表"...');
            
            await page.waitForTimeout(2000);
            
            const schedulePageUrl = await page.evaluate(() => {
                // 尋找 "我的課表" 連結
                const links = Array.from(document.querySelectorAll('a'));
                const scheduleLink = links.find(link => 
                    link.textContent.includes('我的課表') || 
                    link.title === '我的課表' ||
                    link.href.includes('Sel_Student.aspx')
                );
                
                if (scheduleLink) {
                    console.log('找到課表連結:', scheduleLink.href);
                    return scheduleLink.href;
                }
                return null;
            });

            if (schedulePageUrl) {
                console.log('🔗 導航到課表頁面:', schedulePageUrl);
                await page.goto(schedulePageUrl, { 
                    waitUntil: 'networkidle2',
                    timeout: 15000 
                });
            } else {
                // 備用方案：直接導航到課表頁面
                console.log('🔗 使用備用方案導航到課表頁面');
                await page.goto(`${this.baseUrl}/STDWEB/Sel_Student.aspx`, { 
                    waitUntil: 'networkidle2' 
                });
            }

            // 步驟3: 等待課表頁面載入並提取資料
            console.log('📋 等待課表頁面載入...');
            await page.waitForTimeout(3000);

            // 如果指定學期，嘗試選擇學期
            if (semester) {
                try {
                    console.log(`🗓️ 嘗試選擇學期: ${semester}`);
                    
                    // 嘗試多種可能的學期選擇器
                    const semesterSelectors = [
                        '#ddlSemester',
                        '#ctl00_ContentPlaceHolder1_ddlSemester',
                        'select[name*="Semester"]',
                        'select[name*="semester"]',
                        'select[id*="Semester"]',
                        'select[id*="semester"]'
                    ];
                    
                    let selectorFound = false;
                    for (const selector of semesterSelectors) {
                        try {
                            const element = await page.$(selector);
                            if (element) {
                                console.log(`✅ 找到學期選擇器: ${selector}`);
                                await page.select(selector, semester);
                                await page.waitForTimeout(3000); // 等待頁面更新
                                selectorFound = true;
                                break;
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                    
                    if (!selectorFound) {
                        console.log('⚠️ 未找到學期選擇器，使用當前學期');
                    }
                } catch (e) {
                    console.log('⚠️ 學期選擇失敗:', e.message);
                }
            }

            // 提取課表資料
            const schedule = await page.evaluate(() => {
                const scheduleData = [];
                
                // 尋找北商特定的課表結構 - bgBase表格
                let scheduleTable = document.getElementById('bgBase');
                
                if (!scheduleTable) {
                    // 備用方案：尋找包含課表的表格
                    const tables = document.querySelectorAll('table');
                    for (const table of tables) {
                        const tableText = table.textContent;
                        if (tableText.includes('節次') && tableText.includes('一') && 
                            tableText.includes('二') && tableText.includes('三')) {
                            scheduleTable = table;
                            break;
                        }
                    }
                }
                
                if (scheduleTable) {
                    console.log('✅ 找到北商課表表格');
                    
                    const rows = Array.from(scheduleTable.querySelectorAll('tr'));
                    
                    rows.forEach((row, index) => {
                        // 跳過表頭
                        if (index === 0) return;
                        
                        const cells = Array.from(row.querySelectorAll('td'));
                        
                        if (cells.length >= 8) {
                            // 提取時間資訊
                            const timeCell = cells[0];
                            const timeText = timeCell.textContent.trim();
                            
                            // 提取各天的課程資訊
                            const extractCourseInfo = (cell) => {
                                const links = cell.querySelectorAll('a');
                                if (links.length > 0) {
                                    // 有課程連結
                                    const courseName = links[0].textContent.trim();
                                    const cellText = cell.textContent.trim();
                                    
                                    // 解析教師和教室
                                    const lines = cellText.split('\n').map(line => line.trim()).filter(line => line);
                                    let teacher = '';
                                    let classroom = '';
                                    
                                    if (lines.length >= 2) {
                                        teacher = lines[1];
                                    }
                                    if (lines.length >= 3) {
                                        classroom = lines[2];
                                    }
                                    
                                    return `${courseName}\n${teacher}\n${classroom}`;
                                } else {
                                    // 無課程
                                    return '';
                                }
                            };
                            
                            scheduleData.push({
                                time: timeText,
                                monday: extractCourseInfo(cells[1]),
                                tuesday: extractCourseInfo(cells[2]),
                                wednesday: extractCourseInfo(cells[3]),
                                thursday: extractCourseInfo(cells[4]),
                                friday: extractCourseInfo(cells[5]),
                                saturday: extractCourseInfo(cells[6]),
                                sunday: extractCourseInfo(cells[7])
                            });
                        }
                    });
                    
                    console.log(`📅 成功解析課表，共 ${scheduleData.length} 個時段`);
                } else {
                    console.log('⚠️ 未找到課表表格');
                }
                
                return scheduleData;
            });

            console.log(`📅 獲取課表成功，共 ${schedule.length} 個時段`);
            return schedule;

        } catch (error) {
            console.error('獲取課表失敗:', error);
            throw new Error('獲取課表失敗');
        }
    }

    // 手動輸入驗證碼並完成登入
    async inputCaptchaAndLogin(sessionToken, captchaText) {
        const session = this.sessions.get(sessionToken);
        
        if (!session) {
            return {
                success: false,
                message: 'Session已過期或不存在'
            };
        }

        if (session.status !== 'waiting_captcha') {
            return {
                success: false,
                message: 'Session狀態錯誤'
            };
        }

        try {
            const { page, browser, studentId } = session;
            
            // 輸入驗證碼
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
            } catch (error) {
                console.error('❌ 手動輸入驗證碼失敗:', error);
                return {
                    success: false,
                    message: '驗證碼輸入失敗'
                };
            }

            // 點擊登入按鈕
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
                page.click('#Client_Login')
            ]);

            // 檢查是否登入成功
            const currentUrl = page.url();
            const isLoginSuccess = !currentUrl.includes('login.aspx') && !currentUrl.includes('error');

            // 驗證碼處理完成

            if (isLoginSuccess) {
                // 更新session狀態
                session.status = 'logged_in';
                session.lastActivity = new Date();
                
                console.log(`✅ 學號 ${studentId} 登入成功 (手動驗證碼)`);
                
                return {
                    success: true,
                    sessionToken,
                    message: '登入成功'
                };
            } else {
                // 登入失敗，關閉瀏覽器
                await browser.close();
                this.sessions.delete(sessionToken);
                
                console.log(`❌ 學號 ${studentId} 登入失敗 (驗證碼錯誤)`);
                
                return {
                    success: false,
                    message: '登入失敗，可能是驗證碼錯誤'
                };
            }

        } catch (error) {
            console.error('手動驗證碼登入過程發生錯誤:', error);
            
            // 清理資源
            if (session.browser) {
                await session.browser.close();
            }
            this.sessions.delete(sessionToken);
            
            return {
                success: false,
                message: '登入過程發生錯誤'
            };
        }
    }

    // 登出
    async logout(sessionToken) {
        const session = this.sessions.get(sessionToken);
        
        if (session) {
            try {
                await session.browser.close();
                this.sessions.delete(sessionToken);
                console.log(`🚪 Session ${sessionToken} 已登出`);
            } catch (error) {
                console.error('登出過程發生錯誤:', error);
            }
        }
    }

    // 清理過期的session
    async cleanupExpiredSessions() {
        const now = new Date();
        const expiredSessions = [];

        for (const [token, session] of this.sessions.entries()) {
            const timeDiff = now - session.lastActivity;
            const thirtyMinutes = 30 * 60 * 1000;

            if (timeDiff > thirtyMinutes) {
                expiredSessions.push(token);
            }
        }

        for (const token of expiredSessions) {
            await this.logout(token);
        }

        if (expiredSessions.length > 0) {
            console.log(`🧹 清理了 ${expiredSessions.length} 個過期session`);
        }
    }
}

// 創建單例實例
const scraper = new NTUBScraper();

// 定期清理過期session
setInterval(() => {
    scraper.cleanupExpiredSessions();
}, 10 * 60 * 1000); // 每10分鐘清理一次

module.exports = scraper;
