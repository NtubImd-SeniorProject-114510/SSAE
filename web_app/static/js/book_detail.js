// 購買按鈕功能
const ctaButtons = document.querySelectorAll('.fixed-cta');
ctaButtons.forEach(button => {
    button.addEventListener('click', function() {
        alert('已加入購物車！請前往個人儀表板完成付款流程。');
    });
});

// 聯絡賣家模態視窗功能
const contactSellerModal = document.getElementById('contactSellerModal');
const contactSellerBtn = document.querySelector('.contact-seller-btn');
const closeModalBtn = document.querySelector('.close-modal');
const cancelBtn = document.querySelector('.cancel-btn');
const sendBtn = document.querySelector('.send-btn');

// 打開模態視窗
if (contactSellerBtn) {
    contactSellerBtn.addEventListener('click', function() {
        contactSellerModal.classList.add('show');
        document.body.style.overflow = 'hidden'; // 防止背景捲動
    });
}

// 關閉模態視窗
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', function() {
        contactSellerModal.classList.remove('show');
        document.body.style.overflow = ''; // 恢復背景捲動
    });
}

// 取消按鈕關閉模態視窗
if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
        contactSellerModal.classList.remove('show');
        document.body.style.overflow = '';
    });
}

// 聯絡方式選擇功能
const contactMethods = document.querySelectorAll('.method-header');
if (contactMethods) {
    contactMethods.forEach(header => {
        header.addEventListener('click', function() {
            // 找到被點擊的選項的內容區域
            const methodDetails = this.nextElementSibling;
            const radio = this.querySelector('input[type="radio"]');
            
            // 選中該選項
            radio.checked = true;
            
            // 顯示選中的選項內容，隱藏其他選項內容
            document.querySelectorAll('.method-details').forEach(detail => {
                detail.style.display = 'none';
            });
            methodDetails.style.display = 'block';
        });
    });
}

// 加入LINE好友按鈕功能
const addLineBtn = document.querySelector('.add-line-btn');
if (addLineBtn) {
    addLineBtn.addEventListener('click', function(e) {
        e.preventDefault();
        alert('已將您導向至LINE加入好友頁面！');
        // 實際應用中可以導向到LINE加好友頁面
        // window.open('https://line.me/ti/p/~wang_ntub', '_blank');
    });
}

// 發送按鈕功能
if (sendBtn) {
    sendBtn.addEventListener('click', function() {
        const subject = document.getElementById('messageSubject').value;
        const content = document.getElementById('messageContent').value;
        const selectedMethod = document.querySelector('input[name="contactMethod"]:checked').id;
        
        if (!content.trim()) {
            alert('請輸入訊息內容！');
            return;
        }
        
        // 顯示發送中的動畫效果
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 發送中...';
        sendBtn.disabled = true;
        
        // 模擬發送電子郵件的過程
        setTimeout(function() {
            // 根據選擇的聯絡方式進行不同的處理
            let message = '';
            let contactData = {};
            
            if (selectedMethod === 'contactLine') {
                // LINE聯絡方式
                contactData = {
                    type: 'line',
                    lineId: 'wang_ntub',
                    message: content,
                    subject: subject,
                    timestamp: new Date().toLocaleString('zh-TW')
                };
                localStorage.setItem('lastContactLine', JSON.stringify(contactData));
                message = '已將您的訊息發送至賣家LINE！建議您加入賣家LINE好友以獲得更快的回覆。';
                
                // 如果在真實應用中，這裡可以打開 LINE 加好友頁面
                // window.open('https://line.me/ti/p/~wang_ntub', '_blank');
                
            } else if (selectedMethod === 'contactEmail') {
                // 電子郵件聯絡方式
                contactData = {
                    type: 'email',
                    to: 'wang_ntub@example.com',
                    subject: subject,
                    body: content,
                    from: '北商二手書平台用戶',
                    timestamp: new Date().toLocaleString('zh-TW')
                };
                localStorage.setItem('lastContactEmail', JSON.stringify(contactData));
                message = '已將您的訊息發送至賣家信箱！賣家將會在 24 小時內回覆您。';
                
                // 如果在真實應用中，這裡可以打開郵件客戶端
                // window.open('mailto:wang_ntub@example.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(content), '_blank');
                
            } else if (selectedMethod === 'contactPhone') {
                // 手機聯絡方式
                contactData = {
                    type: 'phone',
                    phoneNumber: '0912-345-678',
                    callTime: '周一至周五 10:00-18:00',
                    message: content,
                    subject: subject,
                    timestamp: new Date().toLocaleString('zh-TW')
                };
                localStorage.setItem('lastContactPhone', JSON.stringify(contactData));
                message = '已記錄您的詢問訊息！建議您在適合的時間直接撥打賣家電話進行詢問。';
                
                // 如果在真實應用中，這裡可以打開撥號頁面
                // window.open('tel:0912345678', '_blank');
            }
            
            // 顯示成功訊息
            showSuccessMessage(message);
            
            // 關閉模態視窗
            contactSellerModal.classList.remove('show');
            document.body.style.overflow = '';
            
            // 清空輸入內容並重設按鈕
            document.getElementById('messageContent').value = '';
            sendBtn.innerHTML = '發送訊息';
            sendBtn.disabled = false;
        }, 1500); // 模擬發送延遲
    });
}

// 顯示成功訊息的功能
function showSuccessMessage(message) {
    // 創建成功訊息元素
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.innerHTML = `
        <div class="success-icon">
            <i class="fas fa-check-circle"></i>
        </div>
        <div class="success-text">${message}</div>
    `;
    
    // 添加到頁面
    document.body.appendChild(successMessage);
    
    // 添加顯示效果
    setTimeout(() => {
        successMessage.classList.add('show');
    }, 10);
    
    // 設定自動關閉
    setTimeout(() => {
        successMessage.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(successMessage);
        }, 300);
    }, 3000);
}

// 點擊模態視窗外部關閉
window.addEventListener('click', function(event) {
    if (event.target === contactSellerModal) {
        contactSellerModal.classList.remove('show');
        document.body.style.overflow = '';
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // 修復任何布局問題
    fixLayoutIssues();
    
    // 初始化星級評分顯示
    initializeRatings();
    
    // 按讚按鈕功能
    initializeLikeButtons();
    
    // 回覆功能
    initializeReplyButtons();
    
    // 圖片放大功能
    initializeImageZoom();
    
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
    
    // 圖片放大功能
    function initializeImageZoom() {
        const bookImage = document.querySelector('.book-image');
        if (bookImage) {
            bookImage.addEventListener('click', function() {
                // 創建模態框
                const modal = document.createElement('div');
                modal.className = 'image-modal';
                modal.style.position = 'fixed';
                modal.style.top = '0';
                modal.style.left = '0';
                modal.style.width = '100%';
                modal.style.height = '100%';
                modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
                modal.style.display = 'flex';
                modal.style.justifyContent = 'center';
                modal.style.alignItems = 'center';
                modal.style.zIndex = '9999';
                
                // 創建放大的圖片
                const zoomedImage = document.createElement('img');
                zoomedImage.src = this.src;
                zoomedImage.style.maxWidth = '90%';
                zoomedImage.style.maxHeight = '90%';
                zoomedImage.style.objectFit = 'contain';
                zoomedImage.style.border = '5px solid white';
                zoomedImage.style.borderRadius = '5px';
                
                // 創建關閉按鈕
                const closeButton = document.createElement('button');
                closeButton.textContent = '×';
                closeButton.style.position = 'absolute';
                closeButton.style.top = '20px';
                closeButton.style.right = '20px';
                closeButton.style.fontSize = '30px';
                closeButton.style.color = 'white';
                closeButton.style.background = 'none';
                closeButton.style.border = 'none';
                closeButton.style.cursor = 'pointer';
                
                // 添加到文檔
                modal.appendChild(zoomedImage);
                modal.appendChild(closeButton);
                document.body.appendChild(modal);
                
                // 點擊模態框或關閉按鈕時關閉
                modal.addEventListener('click', function(e) {
                    if (e.target === modal || e.target === closeButton) {
                        document.body.removeChild(modal);
                    }
                });
            });
        }
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
        
        // Fix book image and details layout
        const bookImageContainer = document.querySelector('.book-image-container');
        const bookDetailsText = document.querySelector('.book-details-text');
        
        if (bookImageContainer && bookDetailsText) {
            if (window.innerWidth <= 768) {
                bookImageContainer.style.float = 'none';
                bookImageContainer.style.width = '100%';
                bookDetailsText.style.float = 'none';
                bookDetailsText.style.width = '100%';
            } else {
                bookImageContainer.style.float = 'left';
                bookImageContainer.style.width = '30%';
                bookDetailsText.style.float = 'left';
                bookDetailsText.style.width = '65%';
            }
        }
        
        // Ensure related grid has proper layout
        const relatedGrid = document.querySelector('.related-grid');
        if (relatedGrid) {
            relatedGrid.style.clear = 'both';
        }
    }
    
    // 監聽視窗大小變化，重新調整布局
    window.addEventListener('resize', fixLayoutIssues);
});
