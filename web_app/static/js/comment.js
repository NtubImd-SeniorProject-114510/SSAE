// comment.js

document.addEventListener('DOMContentLoaded', function() {
    console.log('評論頁面 JS 已加載');
    
    // 初始化星級評分顯示
    initializeStarRatings();
    
    // 設置搜尋和過濾功能
    setupSearchAndFilters();
    
    // 設置分頁
    setupPagination();
    
    // 初始化交互元素
    initializeInteractions();
    
    // 注意：評分模態框功能現在由 comment_pop.js 處理
});

// 初始化星級評分顯示
function initializeStarRatings() {
    document.querySelectorAll('.stars').forEach(starsContainer => {
        const rating = parseFloat(starsContainer.getAttribute('data-rating'));
        const stars = Array.from(starsContainer.querySelectorAll('i'));
        
        // 根據評分更新星級圖標
        stars.forEach((star, index) => {
            const position = index + 1;
            
            if (rating >= position) {
                // 全星
                star.className = 'fas fa-star';
            } else if (rating > position - 0.5 && rating < position) {
                // 半星
                star.className = 'fas fa-star-half-alt';
            } else {
                // 空星
                star.className = 'far fa-star';
            }
        });
    });
}

// 設置搜尋和過濾功能
function setupSearchAndFilters() {
    const filterItems = document.querySelectorAll('.filter-item');
    const searchBox = document.querySelector('.search-box');
    const courseItems = document.querySelectorAll('.course-item');
    
    // 組合過濾功能
    function filterCourses() {
        // 搜尋和過濾邏輯實現...
    }
    
    // 添加事件監聽器
    if (searchBox) {
        searchBox.addEventListener('input', filterCourses);
    }
    
    filterItems.forEach(item => {
        item.addEventListener('change', filterCourses);
    });
}

// 設置分頁
function setupPagination() {
    const pageButtons = document.querySelectorAll('.page-btn');
    const nextButton = document.querySelector('.page-next');
    
    // 添加頁面按鈕點擊事件
    pageButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除所有按鈕的活躍狀態
            pageButtons.forEach(btn => btn.classList.remove('active'));
            // 添加活躍狀態到被點擊的按鈕
            this.classList.add('active');
            
            // 滾動到頁面頂部
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
    
    // 下一頁按鈕功能
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            const activeButton = document.querySelector('.page-btn.active');
            if (activeButton) {
                const nextPageButton = activeButton.nextElementSibling;
                if (nextPageButton && nextPageButton.classList.contains('page-btn')) {
                    nextPageButton.click();
                }
            }
        });
    }
}

// 初始化其他交互元素
function initializeInteractions() {
    // 滾動時的統計數據動畫
    const statItems = document.querySelectorAll('.stat-item');
    
    if (statItems.length > 0) {
        // 當統計項目進入視窗時的動畫
        function animateStats() {
            statItems.forEach(item => {
                const position = item.getBoundingClientRect();
                
                // 如果統計項目在視窗內
                if (position.top < window.innerHeight && position.bottom >= 0) {
                    item.classList.add('animated');
                }
            });
        }
        
        // 添加動畫類到統計項目
        statItems.forEach(item => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        });
        
        // 檢查初始位置並在滾動時檢查
        animateStats();
        window.addEventListener('scroll', animateStats);
        
        // 稍有延遲後，動畫統計數據
        setTimeout(() => {
            statItems.forEach((item, index) => {
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 100);
            });
        }, 300);
    }
}