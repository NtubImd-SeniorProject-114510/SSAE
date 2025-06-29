// 報名按鈕功能
const ctaButtons = document.querySelectorAll('.fixed-cta');
ctaButtons.forEach(button => {
    button.addEventListener('click', function() {
        alert('報名成功！請於 4/5 前完成繳費，活動詳情將發送到您的個人儀表板。');
    });
});



document.addEventListener('DOMContentLoaded', function() {
    let commentCount = 3;
    let commentId = 4;

    // 按讚功能
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const likeCountSpan = this.querySelector('.like-count');
            let count = parseInt(likeCountSpan.textContent);
            
            if (this.classList.contains('liked')) {
                this.classList.remove('liked');
                likeCountSpan.textContent = count - 1;
            } else {
                this.classList.add('liked');
                likeCountSpan.textContent = count + 1;
            }
        });
    });

    // 回覆按鈕功能
    document.querySelectorAll('.reply-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const commentId = this.getAttribute('data-comment-id');
            const replyForm = document.getElementById(`replyForm${commentId}`);
            
            if (replyForm.style.display === 'none') {
                replyForm.style.display = 'block';
                replyForm.querySelector('.reply-textarea').focus();
            } else {
                replyForm.style.display = 'none';
            }
        });
    });

    // 取消回覆按鈕
    document.querySelectorAll('.cancel-reply-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const commentId = this.getAttribute('data-comment-id');
            const replyForm = document.getElementById(`replyForm${commentId}`);
            replyForm.style.display = 'none';
            replyForm.querySelector('.reply-textarea').value = '';
        });
    });

    // 提交回覆按鈕
    document.querySelectorAll('.submit-reply-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const commentId = this.getAttribute('data-comment-id');
            const replyForm = document.getElementById(`replyForm${commentId}`);
            const textarea = replyForm.querySelector('.reply-textarea');
            const replyText = textarea.value.trim();
            
            if (replyText) {
                const repliesContainer = document.getElementById(`replies${commentId}`);
                const now = new Date();
                const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
                
                const replyHTML = `
                    <div class="reply">
                        <div class="user-avatar small">
                            <img src="{% static 'image/activity_test.jpg' %}" alt="使用者頭像">
                        </div>
                        <div class="reply-content">
                            <div class="reply-header">
                                <span class="user-name">你</span>
                                <span class="reply-date">${dateStr}</span>
                            </div>
                            <p>${replyText}</p>
                            <div class="reply-actions">
                                <button class="reply-to-reply">回覆</button>
                            </div>
                        </div>
                    </div>
                `;
                
                repliesContainer.insertAdjacentHTML('beforeend', replyHTML);
                replyForm.style.display = 'none';
                textarea.value = '';
            }
        });
    });

    // 發表新留言
    document.getElementById('submitComment').addEventListener('click', function() {
        const textarea = document.getElementById('newCommentText');
        const commentText = textarea.value.trim();
        
        if (commentText) {
            const commentsSection = document.getElementById('commentsSection');
            const now = new Date();
            const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
            
            const commentHTML = `
                <article class="comment-card">
                    <div class="comment-header">
                        <div class="user-info-container">
                            <div class="user-avatar">
                                <img src="{% static 'image/activity_test.jpg' %}" alt="使用者頭像">
                            </div>
                            <div class="user-info">
                                <span class="user-name">你</span>
                                <div class="comment-meta">
                                    <div class="stars" data-rating="5">
                                        <i class="fa-solid fa-star"></i>
                                        <i class="fa-solid fa-star"></i>
                                        <i class="fa-solid fa-star"></i>
                                        <i class="fa-solid fa-star"></i>
                                        <i class="fa-solid fa-star"></i>
                                    </div>
                                    <span class="comment-date">${dateStr}</span>
                                </div>
                            </div>
                        </div>
                        <button class="like-btn" data-comment-id="${commentId}">
                            <span class="like-icon"><i class="fa-solid fa-thumbs-up"></i></span>
                            <span class="like-count">0</span>
                        </button>
                    </div>
                    <div class="comment-content">
                        <p>${commentText}</p>
                    </div>
                    <div class="comment-actions">
                        <button class="reply-btn" data-comment-id="${commentId}">回覆</button>
                    </div>
                    
                    <div class="reply-form" id="replyForm${commentId}" style="display: none;">
                        <div class="form-group">
                            <textarea class="form-control reply-textarea" rows="3" placeholder="撰寫回覆..."></textarea>
                        </div>
                        <div class="form-actions">
                            <button class="cancel-reply-btn" data-comment-id="${commentId}">取消</button>
                            <button class="submit-reply-btn" data-comment-id="${commentId}">發送</button>
                        </div>
                    </div>
                    
                    <div class="replies-container" id="replies${commentId}"></div>
                </article>
            `;
            
            commentsSection.insertAdjacentHTML('beforeend', commentHTML);
            
            // 為新留言添加事件監聽器
            const newComment = commentsSection.lastElementChild;
            
            // 按讚功能
            const likeBtn = newComment.querySelector('.like-btn');
            likeBtn.addEventListener('click', function() {
                const likeCountSpan = this.querySelector('.like-count');
                let count = parseInt(likeCountSpan.textContent);
                
                if (this.classList.contains('liked')) {
                    this.classList.remove('liked');
                    likeCountSpan.textContent = count - 1;
                } else {
                    this.classList.add('liked');
                    likeCountSpan.textContent = count + 1;
                }
            });
            
            // 回覆功能
            const replyBtn = newComment.querySelector('.reply-btn');
            replyBtn.addEventListener('click', function() {
                const cId = this.getAttribute('data-comment-id');
                const replyForm = document.getElementById(`replyForm${cId}`);
                
                if (replyForm.style.display === 'none') {
                    replyForm.style.display = 'block';
                    replyForm.querySelector('.reply-textarea').focus();
                } else {
                    replyForm.style.display = 'none';
                }
            });
            
            // 取消回覆
            const cancelBtn = newComment.querySelector('.cancel-reply-btn');
            cancelBtn.addEventListener('click', function() {
                const cId = this.getAttribute('data-comment-id');
                const replyForm = document.getElementById(`replyForm${cId}`);
                replyForm.style.display = 'none';
                replyForm.querySelector('.reply-textarea').value = '';
            });
            
            // 提交回覆
            const submitBtn = newComment.querySelector('.submit-reply-btn');
            submitBtn.addEventListener('click', function() {
                const cId = this.getAttribute('data-comment-id');
                const replyForm = document.getElementById(`replyForm${cId}`);
                const replyTextarea = replyForm.querySelector('.reply-textarea');
                const replyText = replyTextarea.value.trim();
                
                if (replyText) {
                    const repliesContainer = document.getElementById(`replies${cId}`);
                    const now = new Date();
                    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
                    
                    const replyHTML = `
                        <div class="reply">
                            <div class="user-avatar small">
                                <img src="{% static 'image/activity_test.jpg' %}" alt="使用者頭像">
                            </div>
                            <div class="reply-content">
                                <div class="reply-header">
                                    <span class="user-name">你</span>
                                    <span class="reply-date">${dateStr}</span>
                                </div>
                                <p>${replyText}</p>
                                <div class="reply-actions">
                                    <button class="reply-to-reply">回覆</button>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    repliesContainer.insertAdjacentHTML('beforeend', replyHTML);
                    replyForm.style.display = 'none';
                    replyTextarea.value = '';
                }
            });
            
            // 更新留言計數
            commentCount++;
            commentId++;
            document.getElementById('commentCount').textContent = `(${commentCount}則評論)`;
            
            // 清空輸入框
            textarea.value = '';
            
            // 滾動到新留言
            newComment.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
});