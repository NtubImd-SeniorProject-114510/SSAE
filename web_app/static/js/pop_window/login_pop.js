// login_pop.js - 登入彈跳視窗功能

document.addEventListener('DOMContentLoaded', function() {
    console.log('login_pop.js 已載入');
    
    // 初始化登入模態視窗功能
    initializeLoginModal();
});

// 初始化登入模態視窗
function initializeLoginModal() {
    // 獲取元素
    const loginButton = document.getElementById('loginButton');
    const loginModal = document.getElementById('loginModal');
    const closeModalButton = document.querySelector('.close-modal');
    const cancelLoginButton = document.getElementById('cancelLogin');
    
    // 檢查必要元素是否存在
    if (!loginModal) {
        console.error('找不到登入模態視窗元素');
        return;
    }
    
    // 顯示登入模態視窗
    if (loginButton) {
        loginButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('顯示登入模態視窗');
            
            // 隱藏用戶下拉菜單（如果存在）
            const userDropdown = document.getElementById('userDropdown');
            if (userDropdown) {
                userDropdown.classList.remove('show');
            }
            
            // 顯示登入模態視窗
            loginModal.classList.add('show');
            
            // 防止背景滾動
            document.body.style.overflow = 'hidden';
        });
    }
    
    // 關閉模態視窗的函數
    function closeLoginModal() {
        if (loginModal) {
            loginModal.classList.remove('show');
            // 恢復背景滾動
            document.body.style.overflow = 'auto';
            console.log('關閉登入模態視窗');
        }
    }
    
    // 點擊 X 按鈕關閉模態視窗
    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeLoginModal);
    }
    
    // 點擊取消按鈕關閉模態視窗（如果存在）
    if (cancelLoginButton) {
        cancelLoginButton.addEventListener('click', closeLoginModal);
    }
    
    // 點擊模態視窗外部關閉模態視窗
    if (loginModal) {
        loginModal.addEventListener('click', function(e) {
            if (e.target === loginModal) {
                closeLoginModal();
            }
        });
    }
    
    // ESC 鍵關閉模態視窗
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && loginModal.classList.contains('show')) {
            closeLoginModal();
        }
    });
    
    // 處理表單提交（如果需要額外邏輯）
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            // 這裡可以添加表單提交前的驗證邏輯
            console.log('登入表單提交');
        });
    }
    
    // 處理登出按鈕點擊（添加確認對話框）
    const logoutButton = document.querySelector('.btn-logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            // 添加確認對話框
            if (!confirm('確定要登出嗎？')) {
                e.preventDefault();
            }
        });
    }
}

// 全域函數：手動顯示登入模態視窗
function showLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

// 全域函數：手動關閉登入模態視窗
function hideLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}