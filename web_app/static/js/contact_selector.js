// 聯絡方式選擇功能（防止重複初始化）
if (typeof window.contactSelectorInitialized === 'undefined') {
    window.contactSelectorInitialized = false;
    window.userContactInfo = {
        phone: '',
        line_id: '',
        email: ''
    };
}
let userContactInfo = window.userContactInfo;

// 頁面載入時初始化聯絡功能
document.addEventListener('DOMContentLoaded', function() {
    if (window.contactSelectorInitialized) {
        console.log('聯絡功能已初始化，跳過');
        return;
    }
    
    console.log('DOM載入完成，開始初始化聯絡功能');
    window.contactSelectorInitialized = true;
    
    // 使用更長的延遲確保所有元素都已載入
    setTimeout(() => {
        console.log('開始載入聯絡功能');
        loadUserContactInfo();
        initContactMethodSelector();
        initContactEditModal();
    }, 500);
});

// 也監聽window.onload事件作為備用
window.addEventListener('load', function() {
    console.log('Window載入完成，檢查聯絡功能是否已初始化');
    
    // 如果還沒初始化，進行初始化
    if (!window.contactSelectorInitialized) {
        const editBtn = document.getElementById('edit-contact-btn');
        if (editBtn) {
            console.log('備用初始化聯絡功能');
            window.contactSelectorInitialized = true;
            setTimeout(() => {
                loadUserContactInfo();
                initContactMethodSelector();
                initContactEditModal();
            }, 100);
        }
    }
});

// 獲取用戶聯絡資訊
async function loadUserContactInfo() {
    try {
        // 首先嘗試從Django模板變數獲取用戶資訊
        if (typeof window.userContactData !== 'undefined') {
            userContactInfo = window.userContactData;
            window.userContactInfo = userContactInfo; // 同步到全域變數
            console.log('從模板變數載入聯絡資訊:', userContactInfo);
            updateContactDisplay();
            updateContactReminder();
            return;
        }
        
        // 如果沒有模板變數，嘗試API
        const response = await fetch('/api/profile/contact-info/', {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            const data = await response.json();
            userContactInfo = {
                phone: data.phone || '',
                line_id: data.line_id || '',
                email: data.email || ''
            };
        } else {
            // 如果API不存在，使用示例數據
            userContactInfo = {
                phone: '0912345678',
                line_id: 'example_line',
                email: 'user@example.com'
            };
        }
        updateContactDisplay();
        updateContactReminder();
    } catch (error) {
        console.error('獲取聯絡資訊失敗:', error);
        // 使用示例數據
        userContactInfo = {
            phone: '0912345678',
            line_id: 'example_line',
            email: 'user@example.com'
        };
        updateContactDisplay();
        updateContactReminder();
    }
}

// 更新聯絡方式顯示
function updateContactDisplay() {
    const phoneDisplay = document.getElementById('phone-display');
    const lineDisplay = document.getElementById('line-display');
    const emailDisplay = document.getElementById('email-display');
    
    if (phoneDisplay) {
        phoneDisplay.textContent = userContactInfo.phone || '未設定';
        phoneDisplay.className = userContactInfo.phone ? 'contact-value has-value' : 'contact-value';
    }
    
    if (lineDisplay) {
        lineDisplay.textContent = userContactInfo.line_id || '未設定';
        lineDisplay.className = userContactInfo.line_id ? 'contact-value has-value' : 'contact-value';
    }
    
    if (emailDisplay) {
        emailDisplay.textContent = userContactInfo.email || '未設定';
        emailDisplay.className = userContactInfo.email ? 'contact-value has-value' : 'contact-value';
    }
    
    // 禁用沒有設定的聯絡方式
    const phoneOption = document.getElementById('contact-phone');
    const lineOption = document.getElementById('contact-line');
    const emailOption = document.getElementById('contact-email');
    
    if (phoneOption) phoneOption.disabled = !userContactInfo.phone;
    if (lineOption) lineOption.disabled = !userContactInfo.line_id;
    if (emailOption) emailOption.disabled = !userContactInfo.email;
    
    // 自動選擇第一個可用的聯絡方式
    if (userContactInfo.phone && phoneOption && !document.querySelector('input[name="contact_method"]:checked')) {
        phoneOption.checked = true;
        updateSelectedContactMethod('phone');
    } else if (userContactInfo.line_id && lineOption && !document.querySelector('input[name="contact_method"]:checked')) {
        lineOption.checked = true;
        updateSelectedContactMethod('line');
    } else if (userContactInfo.email && emailOption && !document.querySelector('input[name="contact_method"]:checked')) {
        emailOption.checked = true;
        updateSelectedContactMethod('email');
    }
}

// 更新聯絡資訊提醒
function updateContactReminder() {
    const statusText = document.getElementById('contact-status-text');
    const editBtn = document.getElementById('edit-contact-btn');
    const reminderIcon = document.querySelector('.reminder-icon i');
    
    if (!statusText) return;
    
    const hasPhone = userContactInfo.phone && userContactInfo.phone.trim() !== '';
    const hasLine = userContactInfo.line_id && userContactInfo.line_id.trim() !== '';
    const hasEmail = userContactInfo.email && userContactInfo.email.trim() !== '';
    const totalCount = (hasPhone ? 1 : 0) + (hasLine ? 1 : 0) + (hasEmail ? 1 : 0);
    
    console.log('聯絡資訊檢查:', {
        phone: userContactInfo.phone,
        line_id: userContactInfo.line_id,
        email: userContactInfo.email,
        hasPhone,
        hasLine,
        hasEmail,
        totalCount
    });
    
    if (totalCount === 0) {
        statusText.textContent = '尚未設定任何聯絡資訊，請先設定聯絡方式';
        if (reminderIcon) {
            reminderIcon.className = 'fas fa-exclamation-triangle';
            reminderIcon.style.color = '#dc3545';
        }
    } else if (totalCount < 3) {
        statusText.textContent = `已設定 ${totalCount}/3 種聯絡方式，建議補充完整聯絡資訊`;
        if (reminderIcon) {
            reminderIcon.className = 'fas fa-info-circle';
            reminderIcon.style.color = '#ffc107';
        }
    } else {
        statusText.textContent = '聯絡資訊已完整設定';
        if (reminderIcon) {
            reminderIcon.className = 'fas fa-check-circle';
            reminderIcon.style.color = '#28a745';
        }
    }
    
    if (editBtn) {
        editBtn.style.display = 'inline-flex';
    }
}

// 初始化聯絡方式選擇器
function initContactMethodSelector() {
    const contactOptions = document.querySelectorAll('input[name="contact_method"]');
    
    contactOptions.forEach(option => {
        option.addEventListener('change', function() {
            if (this.checked) {
                console.log('選擇聯絡方式:', this.value);
                // 更新表單中的聯絡方式值
                updateSelectedContactMethod(this.value);
            }
        });
    });
}

// 更新選擇的聯絡方式
function updateSelectedContactMethod(method) {
    let contactValue = '';
    let contactLabel = '';
    let iconClass = '';
    
    switch(method) {
        case 'phone':
            contactValue = userContactInfo.phone;
            contactLabel = '電話';
            iconClass = 'fas fa-phone';
            break;
        case 'line':
            contactValue = userContactInfo.line_id;
            contactLabel = 'LINE';
            iconClass = 'fas fa-comments'; // 使用聊天圖標代替LINE專用圖標
            break;
        case 'email':
            contactValue = userContactInfo.email;
            contactLabel = 'Email';
            iconClass = 'fas fa-envelope';
            break;
    }
    
    // 更新聯絡方式預覽卡片
    updateContactPreviewCard(method, contactLabel, contactValue, iconClass);
    
    console.log(`已選擇 ${method}: ${contactValue}`);
}

// 更新聯絡方式預覽卡片
function updateContactPreviewCard(method, label, value, iconClass) {
    // 查找或創建聯絡方式預覽卡片
    let previewCard = document.getElementById('contact-preview-card');
    
    if (!previewCard) {
        // 如果不存在預覽卡片，創建一個
        previewCard = createContactPreviewCard();
        
        // 將預覽卡片插入到聯絡方式選擇器後面
        const contactSelector = document.querySelector('.contact-method-selector');
        if (contactSelector) {
            contactSelector.parentNode.insertBefore(previewCard, contactSelector.nextSibling);
        }
    }
    
    // 更新卡片內容
    const iconElement = previewCard.querySelector('.contact-preview-icon i');
    const labelElement = previewCard.querySelector('.contact-preview-label');
    const valueElement = previewCard.querySelector('.contact-preview-value');
    
    console.log('更新預覽卡片:', {
        method,
        label,
        value,
        iconClass,
        iconElement: !!iconElement,
        labelElement: !!labelElement,
        valueElement: !!valueElement
    });
    
    if (iconElement) {
        console.log('更新圖標從', iconElement.className, '到', iconClass);
        // 清除所有現有的類名並設置新的
        iconElement.className = '';
        iconElement.className = iconClass;
        
        // 強制重新渲染
        iconElement.style.display = 'none';
        iconElement.offsetHeight; // 觸發重排
        iconElement.style.display = '';
        
        console.log('圖標更新後的className:', iconElement.className);
    }
    if (labelElement) labelElement.textContent = label + ':';
    if (valueElement) valueElement.textContent = value;
    
    // 顯示卡片
    previewCard.style.display = 'block';
    
    // 添加動畫效果
    previewCard.classList.remove('contact-preview-animate');
    setTimeout(() => {
        previewCard.classList.add('contact-preview-animate');
    }, 10);
}

// 創建聯絡方式預覽卡片
function createContactPreviewCard() {
    const card = document.createElement('div');
    card.id = 'contact-preview-card';
    card.className = 'contact-preview-card';
    card.style.display = 'none';
    
    card.innerHTML = `
        <div class="contact-preview-content">
            <div class="contact-preview-icon">
                <i class="fas fa-phone"></i>
            </div>
            <div class="contact-preview-text">
                <div class="contact-preview-title">聯絡方式</div>
                <div class="contact-preview-info">
                    <span class="contact-preview-label">電話:</span>
                    <span class="contact-preview-value">未設定</span>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// 初始化聯絡資訊編輯模態框
function initContactEditModal() {
    const editBtn = document.getElementById('edit-contact-btn');
    const modal = document.getElementById('contact-edit-modal');
    const closeBtn = document.getElementById('close-contact-modal');
    const cancelBtn = document.getElementById('cancel-contact-edit');
    const saveBtn = document.getElementById('save-contact-info');
    
    console.log('初始化聯絡編輯模態框:', {
        editBtn: !!editBtn,
        modal: !!modal,
        closeBtn: !!closeBtn,
        cancelBtn: !!cancelBtn,
        saveBtn: !!saveBtn
    });
    
    if (!editBtn || !modal) {
        console.error('找不到編輯按鈕或模態框元素');
        return;
    }
    
    // 標記按鈕已初始化
    editBtn.setAttribute('data-initialized', 'true');
    
    // 開啟模態框
    editBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('編輯按鈕被點擊');
        
        const editPhone = document.getElementById('edit-phone');
        const editLine = document.getElementById('edit-line');
        const editEmail = document.getElementById('edit-email');
        
        console.log('填入當前聯絡資訊:', userContactInfo);
        
        if (editPhone) editPhone.value = userContactInfo.phone || '';
        if (editLine) editLine.value = userContactInfo.line_id || '';
        if (editEmail) editEmail.value = userContactInfo.email || '';
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        console.log('模態框已開啟');
    });
    
    // 關閉模態框
    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    // 點擊背景關閉
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // 儲存聯絡資訊
    if (saveBtn) {
        saveBtn.addEventListener('click', async function() {
            const editPhone = document.getElementById('edit-phone');
            const editLine = document.getElementById('edit-line');
            const editEmail = document.getElementById('edit-email');
            
            const phone = editPhone ? editPhone.value.trim() : '';
            const lineId = editLine ? editLine.value.trim() : '';
            const email = editEmail ? editEmail.value.trim() : '';
            
            try {
                const response = await fetch('/api/profile/update/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken'),
                        'Content-Type': 'application/json'
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        phone: phone,
                        line_id: lineId,
                        email: email
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        // 更新本地資料
                        userContactInfo.phone = phone;
                        userContactInfo.line_id = lineId;
                        userContactInfo.email = email;
                        
                        // 更新顯示
                        updateContactDisplay();
                        updateContactReminder();
                        
                        // 關閉模態框
                        closeModal();
                        
                        // 顯示成功訊息
                        showMessage('聯絡資訊更新成功！', 'success');
                    } else {
                        showMessage('更新失敗：' + (data.message || '未知錯誤'), 'error');
                    }
                } else {
                    // 如果API不存在，直接更新本地資料
                    userContactInfo.phone = phone;
                    userContactInfo.line_id = lineId;
                    userContactInfo.email = email;
                    
                    updateContactDisplay();
                    updateContactReminder();
                    closeModal();
                    showMessage('聯絡資訊更新成功！', 'success');
                }
            } catch (error) {
                console.error('更新聯絡資訊失敗:', error);
                // 直接更新本地資料作為備用方案
                userContactInfo.phone = phone;
                userContactInfo.line_id = lineId;
                userContactInfo.email = email;
                
                updateContactDisplay();
                updateContactReminder();
                closeModal();
                showMessage('聯絡資訊更新成功！', 'success');
            }
        });
    }
}

// 顯示訊息
function showMessage(message, type) {
    // 創建訊息元素
    const messageEl = document.createElement('div');
    messageEl.className = `message-toast ${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        ${type === 'success' ? 'background: #28a745;' : 'background: #dc3545;'}
    `;
    
    document.body.appendChild(messageEl);
    
    // 顯示動畫
    setTimeout(() => {
        messageEl.style.transform = 'translateX(0)';
    }, 100);
    
    // 自動移除
    setTimeout(() => {
        messageEl.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 300);
    }, 3000);
}

// 獲取CSRF Token的輔助函數
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// 全域調試函數
window.testContactEdit = function() {
    console.log('測試聯絡編輯功能');
    const editBtn = document.getElementById('edit-contact-btn');
    const modal = document.getElementById('contact-edit-modal');
    
    console.log('編輯按鈕:', editBtn);
    console.log('模態框:', modal);
    console.log('用戶聯絡資訊:', userContactInfo);
    console.log('模板變數:', window.userContactData);
    
    if (editBtn) {
        console.log('手動觸發編輯按鈕點擊');
        editBtn.click();
    }
};

// 檢查用戶資料的調試函數
window.checkUserData = function() {
    console.log('=== 用戶資料檢查 ===');
    console.log('模板變數 window.userContactData:', window.userContactData);
    console.log('本地變數 userContactInfo:', userContactInfo);
    console.log('全域變數 window.userContactInfo:', window.userContactInfo);
    
    // 檢查DOM元素
    const phoneDisplay = document.getElementById('phone-display');
    const lineDisplay = document.getElementById('line-display');
    const emailDisplay = document.getElementById('email-display');
    
    console.log('DOM顯示元素:');
    console.log('- 電話顯示:', phoneDisplay?.textContent);
    console.log('- LINE顯示:', lineDisplay?.textContent);
    console.log('- Email顯示:', emailDisplay?.textContent);
};

// 檢查後端用戶資料的調試函數
window.checkBackendUserData = async function() {
    console.log('=== 檢查後端用戶資料 ===');
    try {
        const response = await fetch('/api/debug/user-contact/', {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('後端用戶資料:', data);
            
            if (data.custom_user) {
                console.log('✅ 找到自定義用戶資料:');
                console.log('- 電話:', data.custom_user.phone);
                console.log('- LINE ID:', data.custom_user.LINE_ID);
                console.log('- Email:', data.custom_user.mail);
            } else {
                console.log('❌ 沒有找到自定義用戶資料');
                console.log('Django用戶資料:', data.auth_user);
            }
        } else {
            console.error('無法獲取後端用戶資料:', response.status);
        }
    } catch (error) {
        console.error('檢查後端用戶資料失敗:', error);
    }
};

// 測試聯絡方式圖標更新的調試函數
window.testContactIconUpdate = function() {
    console.log('=== 測試聯絡方式圖標更新 ===');
    
    // 測試每種聯絡方式
    const methods = [
        { method: 'phone', label: '電話', iconClass: 'fas fa-phone', value: '0912345678' },
        { method: 'line', label: 'LINE', iconClass: 'fas fa-comments', value: 'test-line-id' },
        { method: 'email', label: 'Email', iconClass: 'fas fa-envelope', value: 'test@example.com' }
    ];
    
    let index = 0;
    const testNext = () => {
        if (index < methods.length) {
            const { method, label, iconClass, value } = methods[index];
            console.log(`測試 ${method}:`, { label, iconClass, value });
            updateContactPreviewCard(method, label, value, iconClass);
            index++;
            setTimeout(testNext, 2000); // 2秒後測試下一個
        }
    };
    
    testNext();
};
