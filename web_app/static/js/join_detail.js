document.addEventListener('DOMContentLoaded', function() {
    const discussionSection = document.querySelector('.discussion-section');
    if (discussionSection) {
        let commentCountElement = document.getElementById('commentCount');
        let commentCount = commentCountElement ? parseInt(commentCountElement.textContent.match(/\d+/)[0]) : document.querySelectorAll('.comment-card').length;
        
        const existingComments = document.querySelectorAll('.comment-card');
        let nextCommentId = existingComments.length > 0 ? existingComments.length + 1 : 1;

        discussionSection.addEventListener('click', function(e) {
            const target = e.target;

            const likeBtn = target.closest('.like-btn');
            if (likeBtn) {
                e.preventDefault();
                handleLike(likeBtn);
                return;
            }

            const replyBtn = target.closest('.reply-btn, .reply-to-reply');
            if (replyBtn) {
                e.preventDefault();
                handleReply(replyBtn);
                return;
            }

            const cancelBtn = target.closest('.cancel-reply-btn');
            if (cancelBtn) {
                e.preventDefault();
                handleCancelReply(cancelBtn);
                return;
            }

            const submitBtn = target.closest('.submit-reply-btn');
            if (submitBtn) {
                e.preventDefault();
                handleSubmitReply(submitBtn);
                return;
            }
        });

        const submitCommentBtn = document.getElementById('submitComment');
        if (submitCommentBtn) {
            submitCommentBtn.addEventListener('click', function(e) {
                e.preventDefault();
                handleSubmitNewComment();
            });
        }

        function handleLike(button) {
            const likeCountSpan = button.querySelector('.like-count');
            let count = parseInt(likeCountSpan.textContent);
            if (button.classList.toggle('liked')) {
                likeCountSpan.textContent = count + 1;
            } else {
                likeCountSpan.textContent = count - 1;
            }
        }

        function handleReply(button) {
            const parentCard = button.closest('.comment-card, .reply');
            if (!parentCard) return;

            // Remove any other open reply form to keep the UI clean.
            const existingForm = discussionSection.querySelector('.reply-form-container');
            if (existingForm) {
                existingForm.remove();
            }

            const userName = parentCard.querySelector('.user-name')?.textContent.trim() || 'User';
            const replyForm = createReplyForm(userName);
            
            // Insert form right after the actions container for proper placement.
            const actionsDiv = parentCard.querySelector('.comment-actions, .reply-actions');
            if (actionsDiv) {
                actionsDiv.insertAdjacentElement('afterend', replyForm);
            } else {
                parentCard.appendChild(replyForm); // Fallback
            }
            replyForm.querySelector('.reply-textarea').focus();
        }

        function handleCancelReply(button) {
            const form = button.closest('.reply-form-container');
            if (form) {
                form.remove();
            }
        }

        function handleSubmitReply(button) {
            const formContainer = button.closest('.reply-form-container');
            const textarea = formContainer.querySelector('.reply-textarea');
            const replyText = textarea.value.trim();

            if (replyText) {
                const parentCard = formContainer.closest('.comment-card, .reply');
                let repliesContainer = parentCard.querySelector('.replies-container');

                // If a replies container doesn't exist, create one.
                if (!repliesContainer) {
                    repliesContainer = document.createElement('div');
                    repliesContainer.className = 'replies-container';
                    const insertAfter = parentCard.querySelector('.comment-actions, .reply-actions');
                    insertAfter.insertAdjacentElement('afterend', repliesContainer);
                }
                
                const newReply = createReplyElement(replyText);
                repliesContainer.appendChild(newReply);
                formContainer.remove(); // Clean up the form after submission.
            }
        }
        
        function handleSubmitNewComment() {
            const textarea = document.getElementById('newCommentText');
            const commentText = textarea.value.trim();

            if (commentText) {
                const commentsSection = document.getElementById('commentsSection');
                const newComment = createCommentElement(commentText, nextCommentId);
                commentsSection.appendChild(newComment);
                
                textarea.value = ''; // Clear input field.
                commentCount++;
                nextCommentId++;
                if (commentCountElement) {
                    commentCountElement.textContent = `(${commentCount}則評論)`;
                }
                newComment.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        function createReplyForm(replyTo = '') {
            const formContainer = document.createElement('div');
            formContainer.className = 'reply-form-container';
            formContainer.innerHTML = `
                <div class="reply-form">
                    <div class="form-group">
                        <textarea class="form-control reply-textarea" rows="3" placeholder="回覆 @${replyTo}..."></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="cancel-reply-btn">取消</button>
                        <button type="button" class="submit-reply-btn">發送</button>
                    </div>
                </div>`;
            return formContainer;
        }

        function createReplyElement(text) {
            const replyElement = document.createElement('div');
            replyElement.className = 'reply';
            const dateStr = new Date().toLocaleDateString('zh-TW');
            const staticAvatarPath = '/static/image/activity_test.jpg'; // Consistent avatar path

            replyElement.innerHTML = `
                <div class="user-avatar small"><img src="${staticAvatarPath}" alt="使用者頭像"></div>
                <div class="reply-content">
                    <div class="reply-header"><span class="user-name">你</span><span class="reply-date">${dateStr}</span></div>
                    <p>${text}</p>
                    <div class="reply-actions"><button class="reply-to-reply">回覆</button></div>
                </div>`;
            return replyElement;
        }

        function createCommentElement(text, commentId) {
            const commentElement = document.createElement('article');
            commentElement.className = 'comment-card';
            const dateStr = new Date().toLocaleDateString('zh-TW');
            const staticAvatarPath = '/static/image/activity_test.jpg'; // Consistent avatar path

            commentElement.innerHTML = `
                <div class="comment-header">
                    <div class="user-info-container">
                        <div class="user-avatar"><img src="${staticAvatarPath}" alt="使用者頭像"></div>
                        <div class="user-info">
                            <span class="user-name">你</span>
                            <div class="comment-meta">
                                <div class="stars" data-rating="5"></div>
                                <span class="comment-date">${dateStr}</span>
                            </div>
                        </div>
                    </div>
                    <button class="like-btn" data-comment-id="${commentId}"><span class="like-icon"><i class="fa-solid fa-thumbs-up"></i></span><span class="like-count">0</span></button>
                </div>
                <div class="comment-content"><p>${text}</p></div>
                <div class="comment-actions"><button class="reply-btn" data-comment-id="${commentId}">回覆</button></div>
                <div class="replies-container"></div>`;
            
            // Dynamically create and update stars for the new comment.
            const starsContainer = commentElement.querySelector('.stars');
            updateStarIcons(starsContainer, 5); // New comments default to 5 stars.
            return commentElement;
        }
        
        // Initialize star ratings for all comments loaded with the page.
        document.querySelectorAll('.stars').forEach(starsContainer => {
            const rating = parseFloat(starsContainer.getAttribute('data-rating'));
            updateStarIcons(starsContainer, rating);
        });

        function updateStarIcons(container, rating) {
            if (!container) return;
            container.innerHTML = ''; // Clear existing stars to prevent duplicates.
            for (let i = 1; i <= 5; i++) {
                const star = document.createElement('i');
                if (rating >= i) {
                    star.className = 'fa-solid fa-star';
                } else if (rating > i - 1 && rating < i) {
                    star.className = 'fa-solid fa-star-half-stroke';
                } else {
                    star.className = 'fa-regular fa-star';
                }
                container.appendChild(star);
            }
        }
    }

    // --- CTA Button Logic for smooth scrolling ---
    const ctaButtons = document.querySelectorAll('.fixed-cta');
    ctaButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});