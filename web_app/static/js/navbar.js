// navbar.js - 包含桌面和手機菜單功能

// 監聽滾動事件
window.addEventListener('scroll', function() {
    const navbar = document.getElementById('navbar');
    
    // 當滾動超過50px時，切換到滾動狀態的導航欄
    if (window.scrollY > 50) {
        navbar.classList.remove('navbar-initial');
        navbar.classList.add('navbar-scrolled');
    } else {
        navbar.classList.add('navbar-initial');
        navbar.classList.remove('navbar-scrolled');
    }
});

// 使用者菜單功能
document.addEventListener('DOMContentLoaded', function() {
    console.log('navbar.js 已載入');
    
    // 初始化用戶菜單
    initializeUserMenu();
    
    // 初始化手機菜單
    initializePhoneMenu();
});

// 初始化用戶菜單功能
function initializeUserMenu() {
    // 獲取元素
    const userMenuButton = document.getElementById('userMenuButton');
    const userDropdown = document.getElementById('userDropdown');
    
    if (!userMenuButton || !userDropdown) {
        console.log('桌面用戶菜單元素未找到（可能是手機版）');
        return;
    }
    
    // 點擊用戶圖標顯示/隱藏下拉菜單
    userMenuButton.addEventListener('click', function(e) {
        e.stopPropagation(); // 防止點擊事件傳播
        console.log('切換用戶下拉菜單');
        userDropdown.classList.toggle('show');
    });
    
    // 點擊頁面其他部分關閉下拉菜單
    document.addEventListener('click', function(e) {
        if (!userMenuButton.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.remove('show');
        }
    });
    
    // ESC 鍵關閉下拉菜單
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && userDropdown.classList.contains('show')) {
            userDropdown.classList.remove('show');
        }
    });
    
    // 處理下拉菜單項目點擊
    const dropdownItems = userDropdown.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // 如果是登入按鈕，讓 login_pop.js 處理
            if (this.id === 'loginButton') {
                // 隱藏下拉菜單
                userDropdown.classList.remove('show');
                // 其他邏輯由 login_pop.js 處理
                return;
            }
            
            // 其他菜單項目的處理
            console.log('點擊菜單項目:', this.textContent);
            userDropdown.classList.remove('show');
        });
    });
}

// 初始化手機菜單功能
function initializePhoneMenu() {
    // 獲取元素
    const phoneMenuButton = document.getElementById('phoneMenuButton');
    const phoneMenuOverlay = document.getElementById('phoneMenuOverlay');
    const phoneDropdown = document.getElementById('phoneDropdown');
    const phoneMenuClose = document.getElementById('phoneMenuClose');
    
    if (!phoneMenuButton || !phoneMenuOverlay || !phoneDropdown || !phoneMenuClose) {
        console.log('手機菜單元素未找到（可能是桌面版）');
        return;
    }
    
    // 點擊菜單按鈕打開菜單
    phoneMenuButton.addEventListener('click', function(e) {
        e.stopPropagation();
        console.log('打開手機菜單');
        openPhoneMenu();
    });
    
    // 點擊關閉按鈕
    phoneMenuClose.addEventListener('click', function(e) {
        e.stopPropagation();
        console.log('關閉手機菜單');
        closePhoneMenu();
    });
    
    // 點擊覆蓋層關閉菜單
    phoneMenuOverlay.addEventListener('click', function() {
        console.log('點擊覆蓋層關閉菜單');
        closePhoneMenu();
    });
    
    // ESC 鍵關閉菜單
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && phoneDropdown.classList.contains('show')) {
            closePhoneMenu();
        }
    });
    
    // 處理手機菜單項目點擊
    const phoneDropdownItems = phoneDropdown.querySelectorAll('a');
    phoneDropdownItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // 如果是登入按鈕，讓 login_pop.js 處理
            if (this.id === 'phoneLoginButton') {
                // 關閉手機菜單
                closePhoneMenu();
                // 其他邏輯由 login_pop.js 處理
                return;
            }
            
            // 其他菜單項目的處理
            console.log('點擊手機菜單項目:', this.textContent);
            
            // 如果是內部連結，關閉菜單
            if (this.href && !this.href.includes('#')) {
                closePhoneMenu();
            }
        });
    });
    
    // 防止菜單面板內部點擊關閉菜單
    phoneDropdown.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

// 打開手機菜單
function openPhoneMenu() {
    const phoneMenuOverlay = document.getElementById('phoneMenuOverlay');
    const phoneDropdown = document.getElementById('phoneDropdown');
    
    if (phoneMenuOverlay && phoneDropdown) {
        phoneMenuOverlay.classList.add('show');
        phoneDropdown.classList.add('show');
        
        // 防止背景滾動
        document.body.style.overflow = 'hidden';
    }
}

// 關閉手機菜單
function closePhoneMenu() {
    const phoneMenuOverlay = document.getElementById('phoneMenuOverlay');
    const phoneDropdown = document.getElementById('phoneDropdown');
    
    if (phoneMenuOverlay && phoneDropdown) {
        phoneMenuOverlay.classList.remove('show');
        phoneDropdown.classList.remove('show');
        
        // 恢復背景滾動
        document.body.style.overflow = '';
    }
}

// 工具函數：手動顯示用戶下拉菜單
function showUserDropdown() {
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
        userDropdown.classList.add('show');
    }
}

// 工具函數：手動隱藏用戶下拉菜單
function hideUserDropdown() {
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
        userDropdown.classList.remove('show');
    }
}

// 視窗大小改變時處理
window.addEventListener('resize', function() {
    // 如果切換到桌面版，關閉手機菜單
    if (window.innerWidth > 768) {
        closePhoneMenu();
    }
});