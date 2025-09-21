document.addEventListener('DOMContentLoaded', function() {
    initializeActivityMap();
    initializeComments();
    initializeCTAButtons();
    initializeLoginIntegration(); // 新增：初始化登入整合
});

// ========================== 登入整合功能 ==========================
// 觸發導航列登入流程的函數
function triggerNavbarLogin() {
    console.log('觸發導航列登入流程...');
    
    // 方法1：直接點擊導航列的登入按鈕
    const navLoginButton = document.getElementById('loginButton');
    if (navLoginButton) {
        console.log('找到導航列登入按鈕，模擬點擊');
        
        // 先顯示用戶下拉菜單（如果需要）
        const userMenuButton = document.getElementById('userMenuButton');
        const userDropdown = document.getElementById('userDropdown');
        
        if (userMenuButton && userDropdown && !userDropdown.classList.contains('show')) {
            // 顯示下拉菜單
            userDropdown.classList.add('show');
            
            // 延遲一點再點擊登入按鈕，讓動畫完成
            setTimeout(() => {
                navLoginButton.click();
            }, 150);
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
        
        // 如果需要先打開手機菜單
        const phoneDropdown = document.getElementById('phoneDropdown');
        if (phoneDropdown && !phoneDropdown.classList.contains('show')) {
            // 打開手機菜單
            if (typeof openPhoneMenu === 'function') {
                openPhoneMenu();
            }
            
            setTimeout(() => {
                phoneLoginButton.click();
            }, 150);
        } else {
            phoneLoginButton.click();
        }
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
    
    // 方法4：直接跳轉到 Google OAuth2（最後備用）
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
    } else {
        console.log('未找到導航列登入按鈕');
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


// ========================== 活動地圖 ==========================
function initializeActivityMap() {
    const mapElement = document.getElementById('activity-map');
    if (!mapElement) return; // 沒有地圖就直接返回

    const lat = parseFloat(mapElement.dataset.lat);
    const lng = parseFloat(mapElement.dataset.lng);
    const location = mapElement.dataset.location || '';
    const address = mapElement.dataset.address || '';

    // 如果沒有座標就隱藏整個地圖區塊
    if (!lat || !lng) {
        mapElement.closest('.section')?.remove();
        return;
    }

    const map = L.map('activity-map').setView([lat, lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const marker = L.marker([lat, lng]).addTo(map);

    marker.bindPopup(`
        <div style="padding: 10px;">
            <h4 style="margin: 0 0 5px 0;">${location}</h4>
            <p style="margin: 0; color: #666;">${address}</p>
        </div>
    `);
}

// ========================== 評論功能 ==========================
function initializeComments() {
    const discussionSection = document.querySelector('.discussion-section');
    if (!discussionSection) return;

    discussionSection.addEventListener('click', function(e) {
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            e.preventDefault();
            const commentId = likeBtn.dataset.commentId;
            toggleLike(commentId, likeBtn);
            return;
        }

        const replyBtn = e.target.closest('.reply-btn');
        if (replyBtn) {
            e.preventDefault();
            handleReply(replyBtn);
            return;
        }

        const cancelBtn = e.target.closest('.cancel-reply-btn');
        if (cancelBtn) {
            cancelBtn.closest('.reply-form-container')?.remove();
            return;
        }

        const submitReplyBtn = e.target.closest('.submit-reply-btn');
        if (submitReplyBtn) {
            e.preventDefault();
            const formContainer = submitReplyBtn.closest('.reply-form-container');
            const textarea = formContainer.querySelector('.reply-textarea');
            const content = textarea.value.trim();
            const parentId = formContainer.dataset.parentId;
            const activityId = formContainer.dataset.activityId;
            if (content) submitComment(activityId, content, textarea, parentId);
        }
    });

    const submitBtn = document.getElementById('submitComment');
    if (submitBtn) {
        submitBtn.addEventListener('click', function() {
            const textarea = document.getElementById('newCommentText');
            const content = textarea.value.trim();
            const activityId = this.dataset.activityId;
            if (content) submitComment(activityId, content, textarea);
        });
    }
}

// 建立回覆表單
function handleReply(button) {
    const parentCard = button.closest('.comment-card, .reply');
    if (!parentCard) return;

    parentCard.querySelector('.reply-form-container')?.remove();

    const userName = parentCard.querySelector('.user-name')?.textContent.trim() || 'User';
    const activityId = document.getElementById('submitComment')?.dataset.activityId;

    const formContainer = document.createElement('div');
    formContainer.className = 'reply-form-container';
    formContainer.dataset.parentId = parentCard.dataset.commentId;
    formContainer.dataset.activityId = activityId;

    formContainer.innerHTML = `
        <div class="reply-form">
            <div class="form-group">
                <textarea class="form-control reply-textarea" rows="3" placeholder="回覆 @${userName}..."></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="cancel-reply-btn">取消</button>
                <button type="button" class="submit-reply-btn">發送</button>
            </div>
        </div>`;
    parentCard.appendChild(formContainer);
    formContainer.querySelector('.reply-textarea').focus();
}

// ========================== 後端交互 ==========================
function toggleLike(commentId, button) {
    fetch(`/api/comments/${commentId}/toggle-like/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            const likeCount = button.querySelector('.like-count');
            if (likeCount) likeCount.textContent = data.likes_count;
            button.classList.toggle('liked', data.is_liked);
        }
    })
    .catch(err => console.error('Like error:', err));
}

function submitComment(activityId, content, textarea, parentId = null) {
  // 前端先檢查空白
  if (!content || !content.trim()) {
    showCommentMsg('留言內容不能為空', false);
    return;
  }

  fetch(`/api/activities/${activityId}/comments/`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
          'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ content, parent_id: parentId })
  })
  .then(async (r) => {
      let data = {};
      try { data = await r.json(); } catch (e) {}
      const failed = !r.ok || data.success === false || data.ok === false;

      if (failed) {
        const msg = pickMessage(data) || '留言送出失敗，請檢查內容後再試。';
        showCommentMsg(msg, false);           // 🔴 顯示後端錯誤（含禁用詞）
        return;
      }

      // ✅ 成功
      showCommentMsg('留言成功！', true);
      if (textarea) textarea.value = '';
      // 你也可以在這裡直接把新留言插入 DOM；先沿用原本行為：
      location.reload();
  })
  .catch(err => {
      console.error('Comment error:', err);
      showCommentMsg('網路或系統錯誤，請稍後再試', false);
  });
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie) {
        const cookies = document.cookie.split(';');
        for (let c of cookies) {
            c = c.trim();
            if (c.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(c.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// ========================== CTA 按鈕 ==========================
function initializeCTAButtons() {
    document.querySelectorAll('.fixed-cta').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetElement = document.querySelector(targetId);
            if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
        });
    });
}


// 工具函數：檢查用戶是否已登入
function isUserAuthenticated() {
    return document.querySelector('[data-user-authenticated]') !== null;
}

// 設為全域函數，確保模板中的 onclick 可以調用
window.triggerNavbarLogin = triggerNavbarLogin;


// 顯示留言錯誤/成功訊息（沒有容器就自動建一個）
function showCommentMsg(text, ok = false) {
  let box = document.getElementById('commentMsg');
  if (!box) {
    // 優先插在討論區頂部；找不到就插在 body 內
    const host = document.querySelector('.discussion-section') || document.body;
    box = document.createElement('div');
    box.id = 'commentMsg';
    box.style.margin = '8px 0';
    box.style.fontSize = '14px';
    host.prepend(box);
  }
  box.textContent = text;
  box.style.color = ok ? '#0a0' : '#c00';
}

// 從各種回傳格式萃取訊息：支援 {success/message} 與 {ok/errors.general[0]}
function pickMessage(data) {
  if (!data || typeof data !== 'object') return '';
  if (data.message) return data.message;
  if (data.errors) {
    if (Array.isArray(data.errors)) return data.errors[0] || '';
    if (data.errors.general && Array.isArray(data.errors.general)) return data.errors.general[0] || '';
    const k = Object.keys(data.errors)[0];
    if (k && Array.isArray(data.errors[k])) return data.errors[k][0] || '';
  }
  return '';
}