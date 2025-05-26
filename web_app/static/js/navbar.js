// navbar.js - 清理版本，專注於導航欄功能

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
});

// 初始化用戶菜單功能
function initializeUserMenu() {
    // 獲取元素
    const userMenuButton = document.getElementById('userMenuButton');
    const userDropdown = document.getElementById('userDropdown');
    
    if (!userMenuButton || !userDropdown) {
        console.error('找不到用戶菜單元素');
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