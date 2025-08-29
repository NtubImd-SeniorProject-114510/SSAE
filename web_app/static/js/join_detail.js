document.addEventListener('DOMContentLoaded', function() {
    initializeActivityMap();
    initializeComments();
    initializeCTAButtons();
});

// ========================== 活動地圖 ==========================
function initializeActivityMap() {
    const mapElement = document.getElementById('activity-map');
    if (!mapElement) return;

    const lat = parseFloat(mapElement.dataset.lat);
    const lng = parseFloat(mapElement.dataset.lng);
    const location = mapElement.dataset.location;
    const address = mapElement.dataset.address;

    if (lat && lng) {
        const map = L.map('activity-map').setView([lat, lng], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        const marker = L.marker([lat, lng]).addTo(map);
        
        marker.bindPopup(`
            <div style="padding: 10px;">
                <h4 style="margin: 0 0 5px 0;">${location}</h4>
                <p style="margin: 0; color: #666;">${address}</p>
            </div>
        `);
    }
}

// ========================== 評論功能 ==========================
function initializeComments() {
    const discussionSection = document.querySelector('.discussion-section');
    if (!discussionSection) return;

    // 點擊事件代理
    discussionSection.addEventListener('click', function(e) {
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            e.preventDefault();
            const commentId = likeBtn.dataset.commentId;
            toggleLike(commentId, likeBtn);
            return;
        }

        // 只處理主評論的回覆，移除 .reply-to-reply
        const replyBtn = e.target.closest('.reply-btn');
        if (replyBtn) {
            e.preventDefault();
            handleReply(replyBtn);
            return;
        }

        const cancelBtn = e.target.closest('.cancel-reply-btn');
        if (cancelBtn) {
            cancelBtn.closest('.reply-form-container')?.remove();
            return;
        }

        const submitReplyBtn = e.target.closest('.submit-reply-btn');
        if (submitReplyBtn) {
            e.preventDefault();
            const formContainer = submitReplyBtn.closest('.reply-form-container');
            const textarea = formContainer.querySelector('.reply-textarea');
            const content = textarea.value.trim();
            const parentId = formContainer.dataset.parentId;
            const activityId = formContainer.dataset.activityId;
            if (content) {
                submitComment(activityId, content, textarea, parentId);
            }
        }
    });

    // 發表新評論
    const submitBtn = document.getElementById('submitComment');
    if (submitBtn) {
        submitBtn.addEventListener('click', function() {
            const textarea = document.getElementById('newCommentText');
            const content = textarea.value.trim();
            const activityId = this.dataset.activityId;
            if (content) {
                submitComment(activityId, content, textarea);
            }
        });
    }
}

// 建立回覆表單
function handleReply(button) {
    const parentCard = button.closest('.comment-card, .reply');
    if (!parentCard) return;

    // 移除舊表單
    parentCard.querySelector('.reply-form-container')?.remove();

    const userName = parentCard.querySelector('.user-name')?.textContent.trim() || 'User';
    const activityId = document.getElementById('submitComment')?.dataset.activityId;

    const formContainer = document.createElement('div');
    formContainer.className = 'reply-form-container';
    formContainer.dataset.parentId = parentCard.dataset.commentId;
    formContainer.dataset.activityId = activityId;

    formContainer.innerHTML = `
        <div class="reply-form">
            <div class="form-group">
                <textarea class="form-control reply-textarea" rows="3" placeholder="回覆 @${userName}..."></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="cancel-reply-btn">取消</button>
                <button type="button" class="submit-reply-btn">發送</button>
            </div>
        </div>`;
    parentCard.appendChild(formContainer);
    formContainer.querySelector('.reply-textarea').focus();
}

// ========================== 後端交互 ==========================
// 點讚
function toggleLike(commentId, button) {
    fetch(`/api/comments/${commentId}/toggle-like/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            const likeCount = button.querySelector('.like-count');
            likeCount.textContent = data.likes_count;
            button.classList.toggle('liked', data.is_liked);
        }
    })
    .catch(err => console.error('Like error:', err));
}

// 發表評論 / 回覆
function submitComment(activityId, content, textarea, parentId = null) {
    fetch(`/api/activities/${activityId}/comments/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            content: content,
            parent_id: parentId
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            textarea.value = '';
            // 重新載入或用 AJAX 動態插入
            location.reload();
        }
    })
    .catch(err => console.error('Comment error:', err));
}

// 取 CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie) {
        const cookies = document.cookie.split(';');
        for (let c of cookies) {
            c = c.trim();
            if (c.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(c.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// ========================== CTA 按鈕 ==========================
function initializeCTAButtons() {
    document.querySelectorAll('.fixed-cta').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}
