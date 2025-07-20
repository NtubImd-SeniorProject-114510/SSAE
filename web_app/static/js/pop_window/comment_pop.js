// comment_pop.js - 評論彈跳視窗功能

// 設置評分模態框
function setupRatingModal() {
    console.log('初始化評分模態框');
    
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
            if (!modal) {
                console.error('找不到評分模態框');
                return;
            }
            
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

    // 綁定右下角加號按鈕
    const commentBtn = document.getElementById('commentBtn');
    if (commentBtn) {
        console.log('找到 #commentBtn，準備綁定點擊事件');
        commentBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('按下右下角加號，嘗試開啟 #rating-modal');
            const modal = document.getElementById('rating-modal');
            if (!modal) {
                console.error('找不到評分模態框');
                return;
            }
            // 清空課程資訊，顯示預設文字
            modal.querySelector('.modal-course-name').textContent = '自訂評論';
            modal.querySelector('.modal-course-teacher').textContent = '';
            const modalStars = modal.querySelectorAll('.modal-stars i');
            modalStars.forEach(star => {
                star.className = 'far fa-star';
            });
            modal.querySelector('#modal-rating-value').value = '0';
            modal.querySelector('.rating-display').textContent = '0.0';
            modal.classList.add('show');
            document.body.classList.add('modal-open');
            modal.removeAttribute('data-course-id');
        });
    } else {
        console.warn('找不到 #commentBtn，無法綁定點擊事件');
    }

    
    // 初始化模態框事件處理
    initializeModalEvents();
}

// 初始化模態框事件處理
function initializeModalEvents() {
    const modal = document.getElementById('rating-modal');
    if (!modal) {
        console.error('找不到評分模態框');
        return;
    }
    
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
            if (ratingValue) ratingValue.value = value;
            if (ratingDisplay) ratingDisplay.textContent = value + '.0';
            
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
                } else {
                    s.className = 'far fa-star';
                }
            });
        });
        
        star.addEventListener('mouseout', function() {
            const currentValue = parseInt(ratingValue?.value || '0');
            
            stars.forEach(s => {
                const starValue = parseInt(s.getAttribute('data-value'));
                s.className = starValue <= currentValue ? 'fas fa-star' : 'far fa-star';
            });
        });
    });
    
    // 提交評分
    if (submitBtn) {
        submitBtn.addEventListener('click', function() {
            const value = parseInt(ratingValue?.value || '0');
            const courseId = modal.getAttribute('data-course-id') || '1';
            
            if (value > 0) {
                console.log(`提交評分：課程ID=${courseId}, 評分=${value}`);
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
    
    // 模擬 AJAX 請求
    setTimeout(() => {
        // 顯示成功消息
        const modal = document.getElementById('rating-modal');
        if (!modal) return;
        
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
        if (closeBtn) {
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
    }, 800); // 模擬網路延遲
}

// 確保在頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('評分模態框 JS 已載入');
    // 延遲一點初始化，確保 DOM 元素都已載入
    setTimeout(() => {
        console.log('執行 setupRatingModal');
        setupRatingModal();
    }, 300);
});