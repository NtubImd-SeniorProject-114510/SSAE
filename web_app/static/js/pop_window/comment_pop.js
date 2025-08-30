// comment_pop.js - 評論彈跳視窗功能

// 顯示評分模態框 (包含快速評分和完整評論選項)
function showRatingModal(button) {
    // 獲取課程信息
    const courseItem = button.closest('.course-item') || button.closest('.course-card');
    const courseName = courseItem.querySelector('.course-name, .course-title')?.textContent || '課程名稱';
    const teacherElement = courseItem.querySelector('.course-teacher, .course-instructor');
    let courseTeacher = teacherElement ? teacherElement.textContent.replace('教授', '').trim() : '';
    
    // 顯示模態框並填充課程信息
    const modal = document.getElementById('rating-modal');
    if (!modal) {
        console.error('找不到評分模態框');
        return;
    }
    
    // 更新模態框中的課程信息
    modal.querySelector('.modal-course-name').textContent = courseName;
    modal.querySelector('.modal-course-teacher').textContent = courseTeacher ? courseTeacher + ' 教授' : '';
    
    // 重置星級評分
    const modalStars = modal.querySelectorAll('.modal-stars i');
    modalStars.forEach(star => {
        star.className = 'far fa-star';
    });
    modal.querySelector('#modal-rating-value').value = '0';
    modal.querySelector('.rating-display').textContent = '0.0';
    
    // 顯示模態框
    modal.classList.add('show');
    document.body.classList.add('modal-open');
    
    // 保存課程 ID 到模態框
    const courseId = courseItem.getAttribute('data-course-id') || '1';
    modal.setAttribute('data-course-id', courseId);
    
    // 更新「前往評論頁面」按鈕的連結
    const fullCommentBtn = modal.querySelector('#full-comment-btn');
    if (fullCommentBtn) {
        fullCommentBtn.href = `/add_comment/?course_id=${courseId}`;
    }
}

// 顯示簡單評論模態框 (只有完整評論選項)
function showSimpleCommentModal(button) {
    // 獲取課程信息
    const courseItem = button.closest('.course-item') || button.closest('.course-card');
    const courseName = courseItem.querySelector('.course-name, .course-title')?.textContent || '課程名稱';
    const teacherElement = courseItem.querySelector('.course-teacher, .course-instructor');
    let courseTeacher = teacherElement ? teacherElement.textContent.replace('教授', '').trim() : '';
    
    // 設置彈跳視窗寬度為400px
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.maxWidth = '400px';
    }

    // 顯示模態框並填充課程信息
    const modal = document.getElementById('simple-comment-modal');
    if (!modal) {
        console.error('找不到評論模態框');
        return;
    }
    
    // 更新模態框中的課程信息
    modal.querySelector('.modal-course-name').textContent = courseName;
    modal.querySelector('.modal-course-teacher').textContent = courseTeacher ? courseTeacher + ' 教授' : '';
    
    // 顯示模態框
    modal.classList.add('show');
    document.body.classList.add('modal-open');
    
    // 保存課程 ID 到模態框
    const courseId = courseItem.getAttribute('data-course-id') || '1';
    modal.setAttribute('data-course-id', courseId);
    
    // 更新「撰寫完整評論」按鈕的連結
    const fullCommentBtn = modal.querySelector('#simple-full-comment-btn');
    if (fullCommentBtn) {
        fullCommentBtn.href = `/add_comment/?course_id=${courseId}`;
    }
}

// 設置評分模態框
function setupRatingModal() {
    console.log('初始化評分模態框');
    
    // 綁定新增評論按鈕點擊事件 (完整評分彈窗)
    const createBtns = document.querySelectorAll('.create-btn');
    createBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            showRatingModal(this);
        });
    });

    // 綁定加號按鈕點擊事件 (簡單評論彈窗)
    const plusBtns = document.querySelectorAll('.add-comment-btn');
    plusBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            showSimpleCommentModal(this);
        });
    });

    // 綁定右下角加號按鈕
    const commentBtn = document.getElementById('commentBtn');
    if (commentBtn) {
        console.log('找到 #commentBtn，準備綁定點擊事件');
        commentBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('按下右下角加號，開啟簡易評論彈窗');
            const modal = document.getElementById('simple-comment-modal');
            if (!modal) {
                console.error('找不到簡易評論模態框');
                return;
            }
            // 清空課程資訊，顯示預設文字
            modal.querySelector('.modal-course-name').textContent = '自訂評論';
            modal.querySelector('.modal-course-teacher').textContent = '';
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
    // 關閉按鈕
    const closeButtons = document.querySelectorAll('.modal-close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('show');
                document.body.classList.remove('modal-open');
            }
        });
    });

    // 點擊模態框外部關閉
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
                document.body.classList.remove('modal-open');
            }
        });
    });
}

// 確保在頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('評分模態框 JS 已載入');
    // 延遲一點初始化，確保 DOM 元素都已載入
    setTimeout(() => {
        setupRatingModal();
        initializeModalEvents();
    }, 300);

    // 導出函數，讓其他 JavaScript 文件可以調用
    window.CommentPopup = {
        showRatingModal: showRatingModal,
        showSimpleCommentModal: showSimpleCommentModal
    };
});