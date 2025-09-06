// comment_detail.js - 清理版本，專注於頁面特定功能（含後端 API 按讚 + 刪除）

document.addEventListener('DOMContentLoaded', function() {
  console.log('comment_detail.js 已載入');

  // 初始化星級評分顯示
  initializeRatings();

  // 按讚按鈕（打後端 API）
  initializeLikeButtons();

  // 刪除本人評論（打後端 API）
  initializeDeleteButtons();

  // 回覆功能（純前端展示）
  initializeReplyButtons();

  // 連接到 comment_pop.js 的評分模態框功能
  initializeRatingModalConnection();

  // ===== 星星顯示 =====
  function initializeRatings() {
    document.querySelectorAll('.stars').forEach(starsContainer => {
      const rating = parseFloat(starsContainer.getAttribute('data-rating'));
      const stars = Array.from(starsContainer.querySelectorAll('i'));
      updateStarIcons(stars, rating);

      // 若外層加了 .editable-rating，允許點擊改星（純前端用途）
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
        star.className = 'fa-solid fa-star';
      } else if (rating > starValue - 1 && rating < starValue) {
        star.className = 'fa-solid fa-star-half-stroke';
      } else {
        star.className = 'fa-regular fa-star';
      }
    });
  }

  // ===== CSRF =====
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
    return null;
  }
  function getCSRFToken() {
    return (
      getCookie('csrftoken') ||
      (document.querySelector('meta[name="csrf-token"]') && document.querySelector('meta[name="csrf-token"]').content) ||
      ''
    );
  }

  // ===== 按讚（打後端 API）=====
  function initializeLikeButtons() {
    // 事件代理，支援後續動態插入
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('.like-btn.small[data-review-id]');
      if (!btn) return;

      e.preventDefault();

      // 防連點
      if (btn.dataset.loading === '1') return;
      btn.dataset.loading = '1';

      const reviewId = btn.getAttribute('data-review-id');
      const countEl  = btn.querySelector('.like-count');
      const iconWrap = btn.querySelector('.like-icon');

      // 小動畫（按下去縮放）
      if (iconWrap) {
        iconWrap.style.transition = 'transform .15s ease';
        iconWrap.style.transform = 'scale(0.92)';
        setTimeout(() => (iconWrap.style.transform = 'scale(1)'), 120);
      }

      try {
        // 與後端 views.toggle_review_like 對應
        const res = await fetch(`/api/reviews/${reviewId}/toggle-like/`, {
          method: 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken(),
          },
          credentials: 'same-origin', // ★ 帶 cookie
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.error || data.success !== true) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        // 更新 aria 與 data-liked
        btn.setAttribute('aria-pressed', data.is_liked ? 'true' : 'false');
        btn.dataset.liked = data.is_liked ? '1' : '0';

        // 直接替換 icon（避免 class 狀態混亂）
        if (iconWrap) {
          iconWrap.innerHTML = data.is_liked
            ? '<i class="fa-solid fa-thumbs-up"></i>'
            : '<i class="fa-regular fa-thumbs-up"></i>';
        }

        // 更新讚數
        if (typeof data.likes_count === 'number' && countEl) {
          countEl.textContent = String(data.likes_count);
        }

      } catch (err) {
        console.error('toggle like error:', err);
        if (window.CommentToast) {
          CommentToast.toastError('按讚失敗，請稍後再試');
        } else {
          alert('按讚失敗，請稍後再試');
        }
      } finally {
        btn.dataset.loading = '0';
      }
    });
  }

  // ===== 刪除（打後端 API）=====
  function initializeDeleteButtons() {
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('.review-delete-btn[data-review-id]');
      if (!btn) return;

      e.preventDefault();

      const reviewId = btn.getAttribute('data-review-id');
      if (!reviewId) return;

      const ok = window.confirm('確定要刪除此評論嗎？');
      if (!ok) return;

      // 防連點
      if (btn.dataset.loading === '1') return;
      btn.dataset.loading = '1';

      try {
        // 與後端 views.comment_review_delete 對應（請確保 urls.py 有這條路由）
        // 例如：path("comment/review/<int:id>/delete/", views.comment_review_delete, name="comment_review_delete")
        const res = await fetch(`/comment/review/${reviewId}/delete/`, {
          method: 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken(),
          },
          credentials: 'same-origin',
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok !== true) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        // 從 DOM 移除該卡片
        const card = document.getElementById(`review-${reviewId}`);
        if (card) card.remove();

        // 可選：同步更新「評論數量」顯示（若存在）
        const countSpan = document.querySelector('.comment-count');
        if (countSpan) {
          try {
            const m = countSpan.textContent.match(/\((\d+)則評論\)/);
            if (m) {
              const n = Math.max(0, parseInt(m[1], 10) - 1);
              countSpan.textContent = `(${n}則評論)`;
            }
          } catch (_) {}
        }

        if (window.CommentToast) {
          CommentToast.toastSuccess('評論已刪除');
        } else {
          alert('評論已刪除');
        }
      } catch (err) {
        console.error('delete review error:', err);
        if (window.CommentToast) {
          CommentToast.toastError('刪除失敗，請稍後再試');
        } else {
          alert('刪除失敗，請稍後再試');
        }
      } finally {
        btn.dataset.loading = '0';
      }
    });
  }

  // ===== 回覆（純前端展示）=====
  function initializeReplyButtons() {
    document.addEventListener('click', function(e) {
      // 展開/收合回覆框
      if (e.target.closest('.reply-btn')) {
        const button = e.target.closest('.reply-btn');
        const card = button.closest('.comment-card');
        const replyForm = card && card.querySelector('.reply-form');
        if (!replyForm) return;

        // 收合其他
        document.querySelectorAll('.reply-form').forEach(form => {
          if (form !== replyForm) form.style.display = 'none';
        });

        replyForm.style.display = replyForm.style.display === 'block' ? 'none' : 'block';
        if (replyForm.style.display === 'block') {
          replyForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }

      // 子回覆
      if (e.target.closest('.reply-to-reply')) {
        const replyBtn = e.target.closest('.reply-to-reply');
        const container = replyBtn.closest('.replies-container');
        if (!container) return;
        const form = container.querySelector('.reply-form');
        if (form) {
          form.style.display = form.style.display === 'block' ? 'none' : 'block';
          if (form.style.display === 'block') {
            form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }

      // 取消回覆
      if (e.target.closest('.cancel-reply-btn')) {
        const cancelBtn = e.target.closest('.cancel-reply-btn');
        const form = cancelBtn.closest('.reply-form');
        if (form) form.style.display = 'none';
      }

      // 送出回覆（DEMO：前端新增節點）
      if (e.target.closest('.submit-reply-btn')) {
        const submitBtn = e.target.closest('.submit-reply-btn');
        const form = submitBtn.closest('.reply-form');
        if (!form) return;
        const textarea = form.querySelector('textarea');
        if (!textarea) return;

        const replyText = textarea.value.trim();
        if (!replyText) return;

        let repliesContainer = form.closest('.replies-container');
        if (!repliesContainer) {
          const card = form.closest('.comment-card');
          if (card) {
            repliesContainer = card.querySelector('.replies-container');
            if (!repliesContainer) {
              repliesContainer = document.createElement('div');
              repliesContainer.className = 'replies-container';
              card.appendChild(repliesContainer);
            }
          }
        }

        if (repliesContainer) {
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
              <p>${replyText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
              <div class="reply-actions">
                <button class="reply-to-reply">回覆</button>
              </div>
            </div>
          `;
          repliesContainer.appendChild(newReply);

          textarea.value = '';
          form.style.display = 'none';

          const successMsg = document.createElement('div');
          successMsg.className = 'success-message';
          successMsg.textContent = '回覆已送出！';
          successMsg.style.textAlign = 'center';
          successMsg.style.padding = '10px';
          successMsg.style.color = '#4CAF50';
          successMsg.style.margin = '10px 0';
          form.parentNode.insertBefore(successMsg, form.nextSibling);
          setTimeout(() => successMsg.remove(), 3000);
        }
      }
    });
  }

  // ===== 與 comment_pop.js 連動：開啟評分/評論彈窗 =====
  function initializeRatingModalConnection() {
    const addCommentBtn = document.getElementById('add-comment-btn');
    const hiddenCreateBtn = document.querySelector('.hidden-create-btn');

    if (addCommentBtn && hiddenCreateBtn) {
      addCommentBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('觸發評分模態框');
        hiddenCreateBtn.click(); // 交給 comment_pop.js 處理
      });
    } else {
      console.warn('找不到必要的按鈕元素（#add-comment-btn 或 .hidden-create-btn）');
    }
  }
});

// 對外（若其他頁需要呼叫）
function submitComment(commentData) {
  console.log('New comment submitted:', commentData);
}