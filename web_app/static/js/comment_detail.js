// comment_detail.js - 清理版本（含後端 API 按讚 + 刪除 + 換行渲染 AI 評論）

document.addEventListener('DOMContentLoaded', function() {
  console.log('comment_detail.js 已載入');

  initializeRatings();
  initializeLikeButtons();
  initializeDeleteButtons();
  initializeReplyButtons();
  initializeRatingModalConnection();
  initializeRenderLineBreaks();
  clearAllReplyForms(); // 新增：清空所有回覆表單

  // ===== 清空所有回覆對話框 =====
  function clearAllReplyForms() {
    document.querySelectorAll('.reply-form textarea').forEach(textarea => {
      textarea.value = '';
    });
  }

  // ===== 星星顯示 =====
  function initializeRatings() {
    document.querySelectorAll('.stars').forEach(starsContainer => {
      const rating = parseFloat(starsContainer.getAttribute('data-rating'));
      const stars = Array.from(starsContainer.querySelectorAll('i'));
      updateStarIcons(stars, rating);

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
      (document.querySelector('meta[name="csrf-token"]')?.content) ||
      ''
    );
  }

  // ===== 按讚（打後端 API）=====
  function initializeLikeButtons() {
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('.like-btn.small[data-review-id]');
      if (!btn) return;
      e.preventDefault();
      if (btn.dataset.loading === '1') return;
      btn.dataset.loading = '1';

      const reviewId = btn.getAttribute('data-review-id');
      const countEl = btn.querySelector('.like-count');
      const iconWrap = btn.querySelector('.like-icon');

      if (iconWrap) {
        iconWrap.style.transition = 'transform .15s ease';
        iconWrap.style.transform = 'scale(0.92)';
        setTimeout(() => (iconWrap.style.transform = 'scale(1)'), 120);
      }

      try {
        const res = await fetch(`/api/reviews/${reviewId}/toggle-like/`, {
          method: 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken(),
          },
          credentials: 'same-origin',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.error || data.success !== true) throw new Error(data.error || `HTTP ${res.status}`);

        btn.setAttribute('aria-pressed', data.is_liked ? 'true' : 'false');
        btn.dataset.liked = data.is_liked ? '1' : '0';

        if (iconWrap) {
          iconWrap.innerHTML = data.is_liked
            ? '<i class="fa-solid fa-thumbs-up"></i>'
            : '<i class="fa-regular fa-thumbs-up"></i>';
        }

        if (typeof data.likes_count === 'number' && countEl) {
          countEl.textContent = String(data.likes_count);
        }

      } catch (err) {
        console.error('toggle like error:', err);
        window.CommentToast ? CommentToast.toastError('按讚失敗,請稍後再試') : alert('按讚失敗,請稍後再試');
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

      if (!window.confirm('確定要刪除此評論嗎？')) return;
      if (btn.dataset.loading === '1') return;
      btn.dataset.loading = '1';

      try {
        const res = await fetch(`/comment/review/${reviewId}/delete/`, {
          method: 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken(),
          },
          credentials: 'same-origin',
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok !== true) throw new Error(data.error || `HTTP ${res.status}`);

        document.getElementById(`review-${reviewId}`)?.remove();

        const countSpan = document.querySelector('.comment-count');
        if (countSpan) {
          const m = countSpan.textContent.match(/\((\d+)則評論\)/);
          if (m) {
            const n = Math.max(0, parseInt(m[1], 10) - 1);
            countSpan.textContent = `(${n}則評論)`;
          }
        }

        window.CommentToast ? CommentToast.toastSuccess('評論已刪除') : alert('評論已刪除');

      } catch (err) {
        console.error('delete review error:', err);
        window.CommentToast ? CommentToast.toastError('刪除失敗,請稍後再試') : alert('刪除失敗,請稍後再試');
      } finally {
        btn.dataset.loading = '0';
      }
    });
  }

  // ===== 回覆（純前端展示）=====
  function initializeReplyButtons() {
    document.addEventListener('click', function(e) {
      const toggleForm = (form) => {
        document.querySelectorAll('.reply-form').forEach(f => {
          if (f !== form) f.style.display = 'none';
        });
        form.style.display = form.style.display === 'block' ? 'none' : 'block';
        if (form.style.display === 'block') {
          form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          // 清空當前開啟的對話框
          const textarea = form.querySelector('textarea');
          if (textarea) textarea.value = '';
        }
      };

      if (e.target.closest('.reply-btn')) {
        const form = e.target.closest('.comment-card')?.querySelector('.reply-form');
        if (form) toggleForm(form);
      }

      if (e.target.closest('.reply-to-reply')) {
        const form = e.target.closest('.replies-container')?.querySelector('.reply-form');
        if (form) toggleForm(form);
      }

      if (e.target.closest('.cancel-reply-btn')) {
        const form = e.target.closest('.reply-form');
        const textarea = form?.querySelector('textarea');
        if (textarea) textarea.value = ''; // 取消時清空
        form.style.display = 'none';
      }

      if (e.target.closest('.submit-reply-btn')) {
        const form = e.target.closest('.reply-form');
        const textarea = form?.querySelector('textarea');
        const replyText = textarea?.value.trim();
        if (!form || !textarea || !replyText) return;

        let repliesContainer = form.closest('.replies-container') || form.closest('.comment-card')?.querySelector('.replies-container');
        if (!repliesContainer) {
          repliesContainer = document.createElement('div');
          repliesContainer.className = 'replies-container';
          form.closest('.comment-card')?.appendChild(repliesContainer);
        }

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
        successMsg.style.cssText = 'text-align:center; padding:10px; color:#4CAF50; margin:10px 0;';
        form.parentNode.insertBefore(successMsg, form.nextSibling);
        setTimeout(() => successMsg.remove(), 3000);
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
        hiddenCreateBtn.click();
      });
    } else {
      console.warn('找不到必要的按鈕元素（#add-comment-btn 或 .hidden-create-btn）');
    }
  }

  // ===== AI 評論換行渲染 =====
  function initializeRenderLineBreaks() {
    document.querySelectorAll('.ai-comment-content').forEach(el => {
      el.innerHTML = el.textContent.replace(/\n/g, '<br>');
    });
  }
});

// 對外（若其他頁需要呼叫）
function submitComment(commentData) {
  console.log('New comment submitted:', commentData);
}