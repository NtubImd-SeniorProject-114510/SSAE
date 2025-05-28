// 報名按鈕功能
const ctaButtons = document.querySelectorAll('.fixed-cta');
ctaButtons.forEach(button => {
    button.addEventListener('click', function() {
        alert('報名成功！請於 4/5 前完成繳費，活動詳情將發送到您的個人儀表板。');
    });
});



document.addEventListener('DOMContentLoaded', function() {
    // Fix any layout issues on load
    fixLayoutIssues();
    // 初始化星級評分顯示
    initializeRatings();
    
    // 按讚按鈕功能
    initializeLikeButtons();
    
    // 回覆功能
    initializeReplyButtons();
    
    // 新增留言功能
    initializeCommentForm();
    
    // Initialize star ratings with Font Awesome icons
    function initializeRatings() {
        document.querySelectorAll('.stars').forEach(starsContainer => {
            const rating = parseFloat(starsContainer.getAttribute('data-rating'));
            const stars = Array.from(starsContainer.querySelectorAll('i'));
            
            // Set initial rating display
            updateStarIcons(stars, rating);
            
            // Make stars clickable for rating input (if needed)
            if (starsContainer.closest('.editable-rating')) {
                stars.forEach((star, index) => {
                    star.addEventListener('click', () => {
                        const newRating = index + 1;
                        starsContainer.setAttribute('data-rating', newRating);
                        updateStarIcons(stars, newRating);
                    });
                });
            }
        });
    }
    
    function updateStarIcons(stars, rating) {
        stars.forEach((star, index) => {
            const starValue = index + 1;
            
            if (rating >= starValue) {
                // Full star
                star.className = 'fa-solid fa-star';
            } else if (rating > starValue - 1 && rating < starValue) {
                // Half star (for decimal values like 4.5, 3.5, etc.)
                star.className = 'fa-solid fa-star-half-stroke';
            } else {
                // Empty star
                star.className = 'fa-regular fa-star';
            }
        });
    }
    
    // Like button functionality
    function initializeLikeButtons() {
        const likeButtons = document.querySelectorAll('.like-btn');
        likeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const likeCount = this.querySelector('.like-count');
                if (!likeCount) return;
                
                const currentCount = parseInt(likeCount.textContent);
                const isLiked = this.classList.contains('liked');
                const likeIcon = this.querySelector('.like-icon');
                
                if (isLiked) {
                    likeCount.textContent = currentCount - 1;
                    this.classList.remove('liked');
                    if (likeIcon) {
                        likeIcon.innerHTML = '<i class="fa-solid fa-thumbs-up"></i>';
                    }
                } else {
                    likeCount.textContent = currentCount + 1;
                    this.classList.add('liked');
                    if (likeIcon) {
                        likeIcon.innerHTML = '<i class="fa-solid fa-thumbs-up"></i>';
                        
                        // Add animation
                        const icon = likeIcon.querySelector('i');
                        if (icon) {
                            icon.style.transform = 'scale(1.3)';
                            setTimeout(() => {
                                icon.style.transform = 'scale(1)';
                            }, 200);
                        }
                    }
                }
            });
        });
    }

    // Comment form functionality
    function initializeCommentForm() {
        const submitButton = document.getElementById('submitComment');
        const commentTextarea = document.getElementById('newCommentText');
        const commentsSection = document.querySelector('.comments-section');
        const commentCount = document.querySelector('.comment-count');
        
        if (submitButton && commentTextarea && commentsSection) {
            submitButton.addEventListener('click', function() {
                const commentText = commentTextarea.value.trim();
                if (commentText) {
                    // Create a new comment
                    const newComment = createCommentElement(commentText);
                    
                    // Add the new comment to the comments section
                    commentsSection.insertBefore(newComment, commentsSection.firstChild);
                    
                    // Clear the textarea
                    commentTextarea.value = '';
                    
                    // Update comment count
                    if (commentCount) {
                        const currentCount = parseInt(commentCount.textContent.match(/\d+/)[0]);
                        commentCount.textContent = `(${currentCount + 1}則評論)`;
                    }
                    
                    // Initialize like button for the new comment
                    initializeLikeButtons();
                    
                    // Initialize reply button for the new comment
                    initializeReplyButtons();
                }
            });
        }
    }
    
    function createCommentElement(commentText) {
        const currentDate = new Date();
        const formattedDate = `${currentDate.getFullYear()}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getDate().toString().padStart(2, '0')}`;
        
        // Create the comment article element
        const article = document.createElement('article');
        article.className = 'comment-card';
        
        // Create the comment HTML structure
        article.innerHTML = `
            <div class="comment-header">
                <div class="user-avatar">
                    <img src="/static/images/default-avatar.png" alt="使用者頭像">
                </div>
                <div class="user-info">
                    <span class="user-name">我</span>
                    <div class="comment-meta">
                        <span class="comment-date">${formattedDate}</span>
                    </div>
                </div>
                <button class="like-btn small">
                    <span class="like-icon"><i class="fa-solid fa-thumbs-up"></i></span>
                    <span class="like-count">0</span>
                </button>
            </div>
            <div class="comment-content">
                <p>${commentText}</p>
            </div>
            <div class="comment-actions">
                <button class="reply-btn">回覆</button>
            </div>
            <div class="reply-form" style="display: none;">
                <div class="form-group">
                    <textarea class="form-control" rows="3" placeholder="撰寫回覆..."></textarea>
                </div>
                <div class="form-actions">
                    <button class="cancel-reply-btn">取消</button>
                    <button class="submit-reply-btn">發送</button>
                </div>
            </div>
            <div class="replies-container"></div>
        `;
        
        return article;
    }
    
    // Reply functionality
    function initializeReplyButtons() {
        // Handle main reply buttons
        document.addEventListener('click', function(e) {
            // Reply button click
            if (e.target.closest('.reply-btn')) {
                const button = e.target.closest('.reply-btn');
                const commentCard = button.closest('.comment-card');
                const replyForm = commentCard.querySelector('.reply-form');
                
                if (!replyForm) return;
                
                // Hide all other reply forms
                document.querySelectorAll('.reply-form').forEach(form => {
                    if (form !== replyForm) {
                        form.style.display = 'none';
                    }
                });
                
                // Toggle current reply form
                if (replyForm.style.display === 'block') {
                    replyForm.style.display = 'none';
                } else {
                    replyForm.style.display = 'block';
                    replyForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
            
            // Reply to reply button click
            if (e.target.closest('.reply-to-reply')) {
                const replyBtn = e.target.closest('.reply-to-reply');
                const replyContainer = replyBtn.closest('.replies-container');
                if (!replyContainer) return;
                
                const replyForm = replyContainer.querySelector('.reply-form');
                
                if (replyForm) {
                    replyForm.style.display = replyForm.style.display === 'block' ? 'none' : 'block';
                    if (replyForm.style.display === 'block') {
                        replyForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }
            }
            
            // Cancel reply button click
            if (e.target.closest('.cancel-reply-btn')) {
                const cancelBtn = e.target.closest('.cancel-reply-btn');
                const form = cancelBtn.closest('.reply-form');
                if (form) {
                    form.style.display = 'none';
                }
            }
            
            // Submit reply button click
            if (e.target.closest('.submit-reply-btn')) {
                const submitBtn = e.target.closest('.submit-reply-btn');
                const form = submitBtn.closest('.reply-form');
                if (!form) return;
                
                const textarea = form.querySelector('textarea');
                if (!textarea) return;
                
                const replyText = textarea.value.trim();
                
                if (replyText) {
                    let repliesContainer = form.closest('.replies-container');
                    
                    // If not inside a replies-container, look for one in the parent comment-card
                    if (!repliesContainer) {
                        const commentCard = form.closest('.comment-card');
                        if (commentCard) {
                            repliesContainer = commentCard.querySelector('.replies-container');
                            
                            // Create a replies-container if it doesn't exist
                            if (!repliesContainer) {
                                repliesContainer = document.createElement('div');
                                repliesContainer.className = 'replies-container';
                                commentCard.appendChild(repliesContainer);
                            }
                        }
                    }
                    
                    if (repliesContainer) {
                        // Create new reply element
                        const newReply = document.createElement('div');
                        newReply.className = 'reply';
                        newReply.innerHTML = `
                            <div class="user-avatar small">
                                <img src="/static/images/default-avatar.png" alt="使用者頭像">
                            </div>
                            <div class="reply-content">
                                <div class="reply-header">
                                    <span class="user-name">匿名用戶</span>
                                    <span class="reply-date">剛剛</span>
                                </div>
                                <p>${replyText}</p>
                                <div class="reply-actions">
                                    <button class="reply-to-reply">回覆</button>
                                </div>
                            </div>
                        `;
                        
                        // Insert new reply
                        repliesContainer.appendChild(newReply);
                        
                        // Clear and hide form
                        textarea.value = '';
                        form.style.display = 'none';
                        
                        // Show success message
                        const successMsg = document.createElement('div');
                        successMsg.className = 'success-message';
                        successMsg.textContent = '回覆已送出！';
                        successMsg.style.textAlign = 'center';
                        successMsg.style.padding = '10px';
                        successMsg.style.color = '#4CAF50';
                        successMsg.style.margin = '10px 0';
                        
                        form.parentNode.insertBefore(successMsg, form.nextSibling);
                        
                        // Remove success message after 3 seconds
                        setTimeout(() => {
                            successMsg.remove();
                        }, 3000);
                    }
                }
            }
        });
    }
    
    // Function to fix layout issues
    function fixLayoutIssues() {
        // Ensure proper spacing between sections
        document.querySelectorAll('.section').forEach(section => {
            section.style.clear = 'both';
            section.style.overflow = 'hidden';
        });
        
        // Fix any overlapping elements in the comments section
        const commentsSection = document.querySelector('.comments-section');
        if (commentsSection) {
            commentsSection.style.clear = 'both';
            commentsSection.style.overflow = 'hidden';
        }
        
        // Fix map container and address elements
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            mapContainer.style.clear = 'both';
            mapContainer.style.position = 'relative';
            mapContainer.style.overflow = 'hidden';
        }
        
        const address = document.querySelector('.address');
        if (address) {
            address.style.clear = 'both';
            address.style.position = 'relative';
            address.style.marginTop = '20px';
        }
        
        // Ensure related grid has proper layout
        const relatedGrid = document.querySelector('.related-grid');
        if (relatedGrid) {
            relatedGrid.style.clear = 'both';
        }
    }
});


