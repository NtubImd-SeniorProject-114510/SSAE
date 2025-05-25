// comment.js

document.addEventListener('DOMContentLoaded', function() {
    console.log('評分模態框 JS 已加載');
    
    // 初始化星級評分顯示
    initializeStarRatings();
    
    // 設置搜尋和過濾功能
    setupSearchAndFilters();
    
    // 設置分頁
    setupPagination();
    
    // 初始化交互元素
    initializeInteractions();

    // 新增評論按鈕點擊事件處理
    setupRatingModal();
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

// 設置評分模態框
function setupRatingModal() {
    // 載入模態框 HTML
    loadModalHTML();
    
    // 綁定新增評論按鈕點擊事件
    const createBtns = document.querySelectorAll('.create-btn');
    createBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 獲取課程信息
            const courseItem = this.closest('.course-item');
            const courseName = courseItem.querySelector('.course-name').textContent;
            const courseTeacher = courseItem.querySelector('.course-teacher').textContent.replace('教授', '').trim();
            
            // 顯示模態框並填充課程信息
            const modal = document.getElementById('rating-modal');
            modal.querySelector('.modal-course-name').textContent = courseName;
            modal.querySelector('.modal-course-teacher').textContent = courseTeacher + ' 教授';
            
            // 重置星級評分
            const modalStars = modal.querySelectorAll('.modal-stars i');
            modalStars.forEach(star => {
                star.className = 'far fa-star';
            });
            modal.querySelector('#modal-rating-value').value = '0';
            modal.querySelector('.rating-display').textContent = '0.0';
            
            // 顯示模態框
            modal.classList.add('show');
            // 防止背景滾動
            document.body.classList.add('modal-open');
            
            // 保存課程 ID 到模態框
            const courseId = courseItem.getAttribute('data-course-id') || '1';
            modal.setAttribute('data-course-id', courseId);
        });
    });
    
    // 初始化模態框事件處理
    initializeModalEvents();
}

// 載入模態框 HTML
function loadModalHTML() {
    // 檢查模態框是否已存在
    if (document.getElementById('rating-modal')) {
        return;
    }
    
    // 由於模態框已經通過 Django include 載入，我們只需要初始化事件
    // 如果 include 沒有載入，使用備選方案
    if (!document.getElementById('rating-modal')) {
        console.log('模態框 HTML 尚未載入，使用備選方案');
        createFallbackModal();
    }
}

// 備選方案：創建內嵌模態框（如果外部文件載入失敗）
function createFallbackModal() {
    const modalHtml = `
    <div id="rating-modal" class="modal">
        <div class="modal-content">
            <span class="modal-close">&times;</span>
            <h2>評分選項</h2>
            <div class="modal-course-info">
                <h3 class="modal-course-name"></h3>
                <p class="modal-course-teacher"></p>
            </div>
            <div class="modal-options">
                <div class="modal-rating-option">
                    <h4>快速五星評分</h4>
                    <div class="modal-rating">
                        <div class="modal-stars">
                            <i class="far fa-star" data-value="1"></i>
                            <i class="far fa-star" data-value="2"></i>
                            <i class="far fa-star" data-value="3"></i>
                            <i class="far fa-star" data-value="4"></i>
                            <i class="far fa-star" data-value="5"></i>
                        </div>
                        <div class="rating-display">0.0</div>
                        <input type="hidden" id="modal-rating-value" value="0">
                    </div>
                    <button class="submit-rating-btn">提交評分</button>
                </div>
                <div class="modal-divider"></div>
                <div class="modal-full-option">
                    <h4>撰寫完整評論</h4>
                    <p>前往評論頁面撰寫詳細的課程評價</p>
                    <a id="full-comment-btn" href="/add_comment/" class="full-comment-btn">前往評論頁面</a>
                </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 初始化模態框事件處理
function initializeModalEvents() {
    const modal = document.getElementById('rating-modal');
    if (!modal) return; // 如果模態框不存在則返回
    
    const closeBtn = modal.querySelector('.modal-close');
    const stars = modal.querySelectorAll('.modal-stars i');
    const ratingValue = modal.querySelector('#modal-rating-value');
    const ratingDisplay = modal.querySelector('.rating-display');
    const submitBtn = modal.querySelector('.submit-rating-btn');
    const fullCommentBtn = modal.querySelector('#full-comment-btn');
    
    // 關閉模態框
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.classList.remove('show');
            // 恢復背景滾動
            document.body.classList.remove('modal-open');
        });
    }
    
    // 點擊模態框外部關閉
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.classList.remove('show');
            // 恢復背景滾動
            document.body.classList.remove('modal-open');
        }
    });
    
    // 星級評分點擊
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const value = parseInt(this.getAttribute('data-value'));
            ratingValue.value = value;
            ratingDisplay.textContent = value + '.0';
            
            // 更新星星顯示
            stars.forEach(s => {
                const starValue = parseInt(s.getAttribute('data-value'));
                s.className = starValue <= value ? 'fas fa-star' : 'far fa-star';
            });
        });
        
        // 懸停效果
        star.addEventListener('mouseover', function() {
            const value = parseInt(this.getAttribute('data-value'));
            
            stars.forEach(s => {
                const starValue = parseInt(s.getAttribute('data-value'));
                if (starValue <= value) {
                    s.className = 'fas fa-star';
                }
            });
        });
        
        star.addEventListener('mouseout', function() {
            const currentValue = parseInt(ratingValue.value);
            
            stars.forEach(s => {
                const starValue = parseInt(s.getAttribute('data-value'));
                s.className = starValue <= currentValue ? 'fas fa-star' : 'far fa-star';
            });
        });
    });
    
    // 提交評分
    if (submitBtn) {
        submitBtn.addEventListener('click', function() {
            const value = parseInt(ratingValue.value);
            const courseId = modal.getAttribute('data-course-id');
            
            if (value > 0) {
                submitRating(courseId, value);
            } else {
                alert('請選擇評分！');
            }
        });
    }
    
    // 修改前往完整評論頁面的 URL
    if (fullCommentBtn) {
        fullCommentBtn.addEventListener('click', function(e) {
            const courseId = modal.getAttribute('data-course-id');
            fullCommentBtn.href = `/add_comment/?course=${courseId}`;
        });
    }
}

// 提交評分 (模擬)
function submitRating(courseId, rating) {
    console.log(`提交評分: 課程ID=${courseId}, 評分=${rating}`);
    
    // 顯示成功消息
    const modal = document.getElementById('rating-modal');
    const modalContent = modal.querySelector('.modal-content');
    
    modalContent.innerHTML = `
    <div class="success-message">
        <i class="fas fa-check-circle"></i>
        <h2>評分成功！</h2>
        <p>感謝您的評分，您給出了 ${rating} 星評價。</p>
        <button class="close-modal-btn">關閉</button>
    </div>`;
    
    // 關閉按鈕事件
    const closeBtn = modalContent.querySelector('.close-modal-btn');
    closeBtn.addEventListener('click', function() {
        modal.classList.remove('show');
        // 恢復背景滾動
        document.body.classList.remove('modal-open');
        
        // 重新載入頁面或更新評分顯示
        setTimeout(() => {
            window.location.reload();
        }, 500);
    });
}