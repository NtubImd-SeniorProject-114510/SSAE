// join.js - 清理版本，移除所有彈窗相關代碼

document.addEventListener('DOMContentLoaded', function() {
    console.log('join.js 已載入');
    // 初始化頁面功能
    sortActivitiesByStatus();
    initializeScrollAnimations();
    initializeParallax();
    initializeRandomClouds();
    initializeActivityCards();
    initializeMobileGridButtons();
    initializeAjaxForms();
});

// 按照活動狀態排序功能
function sortActivitiesByStatus() {
    const activityGrid = document.querySelector('.activity-grid');
    if (!activityGrid) return;
    
    const activityCards = Array.from(activityGrid.querySelectorAll('.activity-card'));
    
    // 按狀態排序：正常活動在前，已截止/額滿的在後
    const sortedCards = activityCards.sort((a, b) => {
        const aIsDisabled = isActivityDisabled(a);
        const bIsDisabled = isActivityDisabled(b);
        
        if (aIsDisabled && !bIsDisabled) return 1;
        if (!aIsDisabled && bIsDisabled) return -1;
        return 0;
    });
    
    // 清空容器並重新添加排序後的卡片
    activityGrid.innerHTML = '';
    sortedCards.forEach(card => {
        activityGrid.appendChild(card);
    });
    
    console.log('活動已按狀態重新排序');
}

// 檢查活動是否已截止或額滿
function isActivityDisabled(activityCard) {
    const joinBtn = activityCard.querySelector('.join-btn');
    if (!joinBtn) return false;
    
    const isDisabled = joinBtn.classList.contains('disabled');
    const buttonText = joinBtn.textContent.trim();
    const isDeadlineOrFull = buttonText.includes('已額滿') || 
                            buttonText.includes('截止') || 
                            buttonText.includes('無法參加');
    
    return isDisabled || isDeadlineOrFull;
}

// 滾動動畫
function initializeScrollAnimations() {
    const allCards = document.querySelectorAll('.activity-card');
    
    function checkVisibility() {
        const windowHeight = window.innerHeight;
        
        allCards.forEach((card, index) => {
            const cardTop = card.getBoundingClientRect().top;
            
            if (cardTop < windowHeight - 100) {
                setTimeout(() => {
                    card.classList.add('visible');
                }, index * 100);
            }
        });
    }
    
    checkVisibility();
    window.addEventListener('scroll', checkVisibility);
}

// 背景文字視差效果
function initializeParallax() {
    const bgText = document.querySelector('.bg-text');
    
    function parallaxScroll() {
        const scrollPosition = window.pageYOffset;
        if (bgText) {
            bgText.style.transform = `translateX(${scrollPosition * -0.1}px)`;
        }
    }
    
    window.addEventListener('scroll', parallaxScroll);
}

// 初始化活動卡片功能
function initializeActivityCards() {
    const activityCards = document.querySelectorAll('.activity-card');
    
    activityCards.forEach(function(card) {
        card.style.cursor = 'pointer';
        
        card.addEventListener('click', function(e) {
            // 如果點擊的是按鈕或連結，不執行卡片點擊
            if (e.target.closest('.join-btn') || e.target.closest('a')) {
                return;
            }
            
            // 獲取跳轉 URL
            const clickHandler = this.getAttribute('onclick');
            if (clickHandler) {
                eval(clickHandler);
            }
        });
    });
    
    // 防止按鈕冒泡事件
    const joinButtons = document.querySelectorAll('.join-btn');
    joinButtons.forEach(function(button) {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
}

// AJAX 表單提交（僅限已登入用戶）
document.addEventListener('click', async (e) => {
    const form = e.target.closest('form.inline-form');
    if (!form) return;
    
    // 檢查用戶是否已登入
    const isAuthenticated = document.querySelector('[data-user-authenticated]');
    
    if (!isAuthenticated) {
        // 訪客點擊會直接跳轉到登入頁面（由模板中的 a 標籤處理）
        return;
    }
    
    e.preventDefault();
    const url = form.action;
    const btn = form.querySelector('button.join-btn');
    
    try {
        const res = await fetch(url, {
            method: 'POST', 
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        const data = await res.json();
        
        if (data.ok) {
            // 根據 action 切換文案
            if (url.includes('/join/')) {
                btn.textContent = '取消參加';
                form.action = form.action.replace('/join/','/cancel/');
            } else {
                btn.textContent = '我要參加';
                form.action = form.action.replace('/cancel/','/join/');
            }
            
            // 更新人數
            const card = form.closest('.activity-card');
            const countEl = card?.querySelector('.participant-count');
            if (countEl && Number.isInteger(data.participants)) {
                const max = countEl.textContent.split('/')[1];
                countEl.textContent = `${data.participants}/${max}`;
            }
            
            // 重新排序
            setTimeout(() => {
                sortActivitiesByStatus();
            }, 100);
            
        } else {
            alert('操作失敗');
        }
    } catch(err) {
        console.error(err);
        form.submit();
    }
});

function getCookie(name) {
    const value = document.cookie.split('; ').find(row => row.startsWith(name + '='));
    return value ? decodeURIComponent(value.split('=')[1]) : '';
}

function clearFilters() {
    document.querySelectorAll('.filter-item').forEach(select => {
        select.selectedIndex = 0;
    });
    document.querySelector('.search-box').value = '';
    window.location.href = window.location.pathname;
}

// 確保表單提交正常工作
document.addEventListener('DOMContentLoaded', function() {
    const filterForm = document.getElementById('filterForm');
    if (filterForm) {
        console.log('篩選表單已初始化');
        
        const searchBox = filterForm.querySelector('.search-box');
        if (searchBox) {
            searchBox.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    filterForm.submit();
                }
            });
        }
    }
});

// 初始化隨機雲朵（保留原有功能）
function initializeRandomClouds() {
    // 如果原本有雲朵動畫，保留在這裡
}

// join.js - 添加觸發導航列登入的函數

// 觸發導航列登入流程的函數
function triggerNavbarLogin() {
    console.log('觸發導航列登入流程...');
    
    // 方法1：直接點擊導航列的登入按鈕
    const navLoginButton = document.getElementById('loginButton');
    if (navLoginButton) {
        console.log('找到導航列登入按鈕，模擬點擊');
        
        // 先顯示用戶下拉菜單
        const userMenuButton = document.getElementById('userMenuButton');
        const userDropdown = document.getElementById('userDropdown');
        
        if (userMenuButton && userDropdown) {
            // 顯示下拉菜單
            userDropdown.classList.add('show');
            
            // 延遲一點再點擊登入按鈕
            setTimeout(() => {
                navLoginButton.click();
            }, 100);
        } else {
            // 直接點擊登入按鈕
            navLoginButton.click();
        }
        return;
    }
    
    // 方法2：檢查手機版的登入按鈕
    const phoneLoginButton = document.querySelector('#phoneDropdown #loginButton');
    if (phoneLoginButton) {
        console.log('使用手機版登入按鈕');
        phoneLoginButton.click();
        return;
    }
    
    // 方法3：嘗試調用可能存在的登入彈窗函數
    const possibleLoginFunctions = [
        'showLoginModal',
        'openLoginPopup', 
        'displayAuthModal',
        'showLoginPop',
        'openAuthModal',
        'triggerLoginModal'
    ];
    
    for (const funcName of possibleLoginFunctions) {
        if (typeof window[funcName] === 'function') {
            console.log(`找到登入函數: ${funcName}`);
            window[funcName]();
            return;
        }
    }
    
    // 方法4：直接跳轉到 Google OAuth2（與導航列相同）
    console.log('直接跳轉到 Google 登入');
    window.location.href = '/auth/login/google-oauth2/';
}

// 檢查並初始化登入彈窗功能
function initializeLoginIntegration() {
    console.log('初始化登入整合功能...');
    
    // 檢查導航列登入按鈕是否存在
    const navLoginButton = document.getElementById('loginButton');
    if (navLoginButton) {
        console.log('找到導航列登入按鈕');
        console.log('按鈕 href:', navLoginButton.href);
        console.log('按鈕 onclick:', navLoginButton.getAttribute('onclick'));
        
        // 檢查按鈕是否有特殊的事件監聽器
        if (typeof getEventListeners === 'function') {
            const listeners = getEventListeners(navLoginButton);
            console.log('導航列登入按鈕的事件監聽器:', listeners);
        }
    }
    
    // 檢查是否有登入相關的全域函數
    const loginFunctions = [
        'showLoginModal',
        'openLoginPopup', 
        'displayAuthModal',
        'showLoginPop',
        'openAuthModal'
    ];
    
    loginFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`找到全域登入函數: ${funcName}`);
        }
    });
    
    // 檢查 login_pop.html 是否已載入
    const loginPop = document.getElementById('login_pop') || 
                    document.getElementById('loginModal') ||
                    document.querySelector('[class*="login"][class*="pop"]') ||
                    document.querySelector('[class*="login"][class*="modal"]');
    
    if (loginPop) {
        console.log('找到登入彈窗元素:', loginPop.id || loginPop.className);
    } else {
        console.log('未找到登入彈窗元素');
    }
}

// 在 DOM 載入完成後執行初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('join.js 已載入');
    
    // 初始化登入整合
    setTimeout(() => {
        initializeLoginIntegration();
    }, 500); // 延遲確保所有 include 的模板都已載入
    
    // 初始化其他頁面功能
    sortActivitiesByStatus();
    initializeScrollAnimations();
    initializeParallax();
    initializeRandomClouds();
    initializeActivityCards();
});

// 設為全域函數
window.triggerNavbarLogin = triggerNavbarLogin;

// 初始化手機版網格按鈕功能
function initializeMobileGridButtons() {
    const mobileButtons = document.querySelectorAll('.grid-btn');
    const desktopSelector = document.getElementById('items-per-row');
    
    if (mobileButtons.length === 0) return;
    
    // 為每個按鈕添加點擊事件
    mobileButtons.forEach(button => {
        button.addEventListener('click', function() {
            const value = this.getAttribute('data-value');
            
            // 移除所有按鈕的 active 類
            mobileButtons.forEach(btn => btn.classList.remove('active'));
            
            // 添加 active 類到當前按鈕
            this.classList.add('active');
            
            // 同步更新桌面版選擇器的值
            if (desktopSelector) {
                desktopSelector.value = value;
                
                // 觸發桌面版選擇器的 change 事件
                const changeEvent = new Event('change', { bubbles: true });
                desktopSelector.dispatchEvent(changeEvent);
            }
            
            console.log(`手機版選擇：每行 ${value} 個`);
        });
    });
    
    // 監聽桌面版選擇器變化，同步到手機版按鈕
    if (desktopSelector) {
        desktopSelector.addEventListener('change', function() {
            const value = this.value;
            
            // 更新手機版按鈕狀態
            mobileButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-value') === value) {
                    btn.classList.add('active');
                }
            });
        });
    }
    
    // 檢查螢幕尺寸，在480px以下時限制選項並預設為1行
    function checkScreenSize() {
        if (window.innerWidth <= 480) {
            // 只在初次載入或從大螢幕切換到小螢幕時設定預設值
            if (desktopSelector && parseInt(desktopSelector.value) > 2) {
                desktopSelector.value = '1';
                const changeEvent = new Event('change', { bubbles: true });
                desktopSelector.dispatchEvent(changeEvent);
                
                // 同步手機版按鈕狀態
                mobileButtons.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.getAttribute('data-value') === '1') {
                        btn.classList.add('active');
                    }
                });
            }
        }
    }
    
    // 初始化手機版按鈕狀態
    if (window.innerWidth <= 480) {
        // 如果桌面版選擇器值大於2，設定為1，否則保持當前值
        const currentValue = desktopSelector ? desktopSelector.value : '1';
        const targetValue = parseInt(currentValue) > 2 ? '1' : currentValue;
        
        if (desktopSelector && parseInt(currentValue) > 2) {
            desktopSelector.value = targetValue;
        }
        
        // 同步按鈕狀態
        mobileButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-value') === targetValue) {
                btn.classList.add('active');
            }
        });
    }
    // 初始檢查和監聽窗口大小變化
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    console.log('手機版網格按鈕已初始化');
}

// 初始化AJAX表單處理
function initializeAjaxForms() {
    const joinForms = document.querySelectorAll('form[action*="join"], form[action*="cancel"]');
    
    joinForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const actionUrl = this.action;
            const activityCard = this.closest('.activity-card');
            const button = this.querySelector('button[type="submit"]');
            
            // 禁用按鈕防止重複提交
            button.disabled = true;
            const originalText = button.innerHTML;
            button.innerHTML = '處理中...';
            
            fetch(actionUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // 更新按鈕狀態
                    updateActivityButton(activityCard, data.new_status, data.activity_id);
                    
                    // 顯示成功訊息
                    showMessage(data.message, 'success');
                } else {
                    // 顯示錯誤訊息
                    showMessage(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('操作失敗，請稍後再試', 'error');
            })
            .finally(() => {
                // 恢復按鈕狀態
                button.disabled = false;
                button.innerHTML = originalText;
            });
        });
    });
    
    console.log('AJAX表單已初始化');
}

// 更新活動按鈕狀態
function updateActivityButton(activityCard, newStatus, activityId) {
    // 按鈕直接在 activity-card 下面，不在特定容器中
    const buttonContainer = activityCard;
    
    let newButtonHTML = '';
    
    if (newStatus === 'joined') {
        // 用戶已參加，顯示取消參加按鈕
        newButtonHTML = `
            <form action="/activities/${activityId}/cancel/" method="post" class="inline-form" onclick="event.stopPropagation();">
                <input type="hidden" name="csrfmiddlewaretoken" value="${getCsrfToken()}">
                <button class="join-button" type="submit">取消參加 <i class="fa-regular fa-calendar-xmark"></i></button>
            </form>
        `;
    } else if (newStatus === 'not_joined') {
        // 用戶未參加，顯示立即參加按鈕
        newButtonHTML = `
            <form action="/activities/${activityId}/join/" method="post" class="inline-form" onclick="event.stopPropagation();">
                <input type="hidden" name="csrfmiddlewaretoken" value="${getCsrfToken()}">
                <button class="join-button" type="submit">立即參加 <i class="fa-solid fa-bolt"></i></button>
            </form>
        `;
    }
    
    // 更新按鈕HTML - 尋找具有 join-button 類別的按鈕或其父表單
    const existingButton = buttonContainer.querySelector('.join-button') || 
                          buttonContainer.querySelector('form.inline-form') ||
                          buttonContainer.querySelector('a.join-button');
    
    if (existingButton && newButtonHTML) {
        // 如果現有按鈕在表單中，替換整個表單；否則替換按鈕本身
        const formParent = existingButton.closest('form.inline-form');
        const targetElement = formParent || existingButton;
        targetElement.outerHTML = newButtonHTML;
        
        // 重新初始化新按鈕的AJAX功能
        const newForm = buttonContainer.querySelector('form.inline-form');
        if (newForm) {
            initializeFormAjax(newForm);
        }
    }
}

// 為單個表單初始化AJAX
function initializeFormAjax(form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const actionUrl = this.action;
        const activityCard = this.closest('.activity-card');
        const button = this.querySelector('button[type="submit"]');
        
        button.disabled = true;
        const originalText = button.innerHTML;
        button.innerHTML = '處理中...';
        
        fetch(actionUrl, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateActivityButton(activityCard, data.new_status, data.activity_id);
                showMessage(data.message, 'success');
            } else {
                showMessage(data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage('操作失敗，請稍後再試', 'error');
        })
        .finally(() => {
            button.disabled = false;
            button.innerHTML = originalText;
        });
    });
}

// 獲取CSRF Token
function getCsrfToken() {
    const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
    return csrfInput ? csrfInput.value : '';
}

// 顯示訊息
function showMessage(message, type) {
    // 創建訊息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = `ajax-message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        ${type === 'success' ? 'background-color: #28a745;' : 'background-color: #dc3545;'}
    `;
    
    document.body.appendChild(messageDiv);
    
    // 顯示動畫
    setTimeout(() => {
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateX(0)';
    }, 100);
    
    // 自動移除
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}

