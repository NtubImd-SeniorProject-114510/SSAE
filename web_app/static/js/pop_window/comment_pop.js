// static/js/comment_pop.js - 僅在各自的 modal 內更新連結，不影響頁面上其他元素

// ===== 小工具：通用取 courseId（不會修改 DOM）=====
function getCourseIdFrom(el) {
  // 0) 直接看傳入元素
  if (el) {
    const selfId = el.getAttribute?.('data-course-id') || el?.dataset?.courseId;
    if (selfId && /^\d+$/.test(String(selfId))) return String(selfId);

    const host = el.closest?.('.course-item, .course-card, .modal, [data-course-id]');
    const hostId = host?.getAttribute?.('data-course-id') || host?.dataset?.courseId;
    if (hostId && /^\d+$/.test(String(hostId))) return String(hostId);

    const href = el.getAttribute?.('href');
    if (href) {
      try {
        const u = new URL(href, window.location.origin);
        const q = u.searchParams.get('course_id');
        if (q && /^\d+$/.test(String(q))) return String(q);
      } catch (e) {
        const m = href.match(/(?:\?|&)course_id=(\d+)/);
        if (m && m[1]) return String(m[1]);
      }
    }
  }

  // 1) 從當前 URL 的 path 推斷：/comment_detail/123/ 或 /add_comment/123/
  try {
    const path = window.location.pathname || '';
    let m = path.match(/\/comment_detail\/(\d+)\//);
    if (m && m[1]) return String(m[1]);
    m = path.match(/\/add_comment\/(\d+)\//);
    if (m && m[1]) return String(m[1]);
  } catch (e) {}

  // 2) 頁面上第一個帶 data-course-id 的元素
  const anyData = document.querySelector('[data-course-id]');
  const anyId = anyData?.getAttribute?.('data-course-id') || anyData?.dataset?.courseId;
  if (anyId && /^\d+$/.test(String(anyId))) return String(anyId);

  // 3) 從 querystring ?course_id=
  try {
    const u = new URL(window.location.href);
    const q = u.searchParams.get('course_id');
    if (q && /^\d+$/.test(String(q))) return String(q);
  } catch (e) {}

  return null;
}

// ===== 取得課程名稱（盡量聰明找）=====
function getCourseNameFrom(triggerEl) {
  // 先從卡片就近抓
  const courseItem = triggerEl?.closest?.('.course-item, .course-card');
  const nearbyName = courseItem?.querySelector?.('.course-name, .course-title, [data-course-name]');
  if (nearbyName) {
    const txt = (nearbyName.getAttribute?.('data-course-name') || nearbyName.textContent || '').trim();
    if (txt) return txt;
  }

  // 在頁面上常見的位置找（適用 comment_detail 頁）
  const candidates = [
    '#detail-course-name',
    '.detail-course-name',
    '.course-name',
    '.course-title',
    '[data-course-name]',
  ];
  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (el) {
      const txt = (el.getAttribute?.('data-course-name') || el.textContent || '').trim();
      if (txt) return txt;
    }
  }

  return '課程名稱';
}

// ===== 取得老師名稱（若有）=====
function getTeacherNameFrom(triggerEl) {
  const courseItem = triggerEl?.closest?.('.course-item, .course-card');
  const teacherElement = courseItem?.querySelector?.('.course-teacher, .course-instructor, [data-course-teacher]');
  if (teacherElement) {
    return (teacherElement.getAttribute?.('data-course-teacher') || teacherElement.textContent || '')
      .replace('教授', '')
      .trim();
  }

  const candidates = [
    '#detail-course-teacher',
    '.detail-course-teacher',
    '.course-teacher',
    '.course-instructor',
    '[data-course-teacher]',
  ];
  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (el) {
      return (el.getAttribute?.('data-course-teacher') || el.textContent || '')
        .replace('教授', '')
        .trim();
    }
  }

  return '';
}

// ===== 僅在「指定的 modal 範圍內」設定前往評論頁面連結 =====
function setFullCommentLinkInModal(modalEl, selector, courseId) {
  if (!modalEl || !selector) return;
  const a = modalEl.querySelector(selector); // 只找這個 modal 裡的
  if (!a) return;

  if (courseId && /^\d+$/.test(String(courseId))) {
    a.href = '/add_comment/' + courseId + '/';
    a.setAttribute('data-course-id', courseId);
    modalEl.setAttribute('data-course-id', courseId);
  } else {
    a.href = '/add_comment/';
    a.removeAttribute('data-course-id');
    modalEl.removeAttribute('data-course-id');
  }
}

// ===== 顯示評分（完整）模態框 =====
function showRatingModal(triggerEl) {
  const modal = document.getElementById('rating-modal');
  if (!modal) {
    console.error('[comment_pop] 找不到評分模態框 #rating-modal');
    return;
  }

  const courseName = getCourseNameFrom(triggerEl);
  const courseTeacher = getTeacherNameFrom(triggerEl);
  const nameEl = modal.querySelector('.modal-course-name');
  const teacherEl = modal.querySelector('.modal-course-teacher');
  if (nameEl) nameEl.textContent = courseName;
  if (teacherEl) teacherEl.textContent = courseTeacher ? courseTeacher + ' 教授' : '';

  // 重置星星與顯示
  modal.querySelectorAll('.modal-stars i').forEach(
    (star) => (star.className = 'far fa-star')
  );
  const ratingInput = modal.querySelector('#modal-rating-value');
  if (ratingInput) ratingInput.value = '0';
  const display = modal.querySelector('.rating-display');
  if (display) display.textContent = '0.0';

  // ★ 啟用評分控制
  initModalRatingControls(modal);

  // 設定「前往評論頁面」連結（帶 ID）+ 把 ID 設到提交按鈕
  const courseId = getCourseIdFrom(triggerEl);
  setFullCommentLinkInModal(modal, '#full-comment-btn', courseId);
  const submitBtn = modal.querySelector('#rating-submit-btn');
  if (submitBtn) {
    if (courseId) submitBtn.setAttribute('data-course-id', courseId);
    else submitBtn.removeAttribute('data-course-id');
  }
  if (courseId) {
    modal.setAttribute('data-course-id', courseId);
  } else {
    modal.removeAttribute('data-course-id');
  }

  // 開啟
  modal.classList.add('show');
  document.body.classList.add('modal-open');
}

// ===== 評分星星互動：hover 高亮、click 設定、鍵盤操作 =====
function initModalRatingControls(modal) {
  if (!modal || modal.dataset.ratingBound === '1') return;

  const starsWrap = modal.querySelector('.modal-stars');
  const stars = modal.querySelectorAll('.modal-stars i');
  const input = modal.querySelector('#modal-rating-value');
  const display = modal.querySelector('.rating-display');

  // 目前評分（以 input 為主，沒有就以 0）
  function getCurrent() {
    const v = parseInt(input?.value || '0', 10);
    return Number.isFinite(v) ? Math.max(0, Math.min(5, v)) : 0;
  }

  // 套用指定顯示值（不寫入 input）
  function paint(value) {
    const v = Math.max(0, Math.min(5, parseInt(value || '0', 10)));
    stars.forEach((s) => {
      const n = parseInt(s.getAttribute('data-value') || '0', 10);
      s.className = (n <= v) ? 'fas fa-star' : 'far fa-star';
    });
    if (display && Number.isFinite(v)) {
      display.textContent = v.toFixed(1);
    }
  }

  // 設定實際評分（同時寫入 input 與顯示）
  function commit(value) {
    const v = Math.max(1, Math.min(5, parseInt(value || '0', 10)));
    if (input) input.value = String(v);
    paint(v);
  }

  // 事件：滑過高亮、移出還原、點擊設定
  stars.forEach((star) => {
    star.style.cursor = 'pointer';

    star.addEventListener('mouseenter', () => {
      const v = parseInt(star.getAttribute('data-value') || '0', 10);
      paint(v);
    });

    star.addEventListener('mouseleave', () => {
      paint(getCurrent());
    });

    star.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const v = parseInt(star.getAttribute('data-value') || '0', 10);
      commit(v);
    });

    // 觸控裝置：touchstart 直接評分
    star.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const v = parseInt(star.getAttribute('data-value') || '0', 10);
      commit(v);
    }, { passive: false });
  });

  // 鍵盤操作：方向鍵/數字鍵 1-5/Backspace 清空
  modal.addEventListener('keydown', (e) => {
    const cur = getCurrent();
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      commit(Math.min(5, cur + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      commit(Math.max(1, cur - 1));
    } else if (/^[1-5]$/.test(e.key)) {
      e.preventDefault();
      commit(parseInt(e.key, 10));
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      if (input) input.value = '0';
      paint(0);
    }
  });

  // 初始狀態：根據 input 畫一次（沒有就 0.0）
  paint(getCurrent());

  // 避免重複綁定
  modal.dataset.ratingBound = '1';
}

// ===== 顯示簡易評論模態框 =====
// opts.blank === true 時，不帶任何課程（給 #commentBtn 用），強制 /add_comment/
function showSimpleCommentModal(triggerEl, opts = {}) {
  const modal = document.getElementById('simple-comment-modal');
  if (!modal) {
    console.error('[comment_pop] 找不到簡易評論模態框 #simple-comment-modal');
    return;
  }

  let courseName = '課程名稱';
  let courseTeacher = '';
  let courseId = null;

  if (!opts.blank) {
    courseName = getCourseNameFrom(triggerEl);
    courseTeacher = getTeacherNameFrom(triggerEl);
    courseId = getCourseIdFrom(triggerEl);
  } else {
    // blank 模式：顯示通用文字，不帶 ID
    courseName = '前往新增課程評論頁面';
    courseTeacher = '';
    courseId = null;
  }

  const nameEl = modal.querySelector('.modal-course-name');
  const teacherEl = modal.querySelector('.modal-course-teacher');
  if (nameEl) nameEl.textContent = courseName;
  if (teacherEl) teacherEl.textContent = courseTeacher ? courseTeacher + ' 教授' : '';

  if (opts.blank) {
    // ✅ 強制不帶 ID，直接導向 /add_comment/
    const a = modal.querySelector('#simple-full-comment-btn');
    if (a) {
      a.href = '/add_comment/';
      a.removeAttribute('data-course-id');
    }
    modal.removeAttribute('data-course-id');
  } else {
    // 一般模式：若有 ID 就覆寫成 /add_comment/<id>/
    setFullCommentLinkInModal(modal, '#simple-full-comment-btn', courseId);
  }

  // 開啟
  modal.classList.add('show');
  document.body.classList.add('modal-open');
}

// ===== 關閉模態框（僅此 modal）=====
function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('show');
  const anyOpen = document.querySelector('.modal.show');
  if (!anyOpen) document.body.classList.remove('modal-open');
}

// ===== 初始化模態框事件處理（僅針對各自 modal）=====
function initializeModalEvents() {
  // 關閉按鈕（叉叉）
  document.querySelectorAll('.modal .modal-close').forEach((button) => {
    button.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      closeModal(this.closest('.modal'));
    });
  });

  // 點遮罩關閉
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', function (e) {
      if (e.target === this) closeModal(this);
    });
  });

  // 按 ESC 關閉
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.show').forEach((m) => closeModal(m));
    }
  });
}

/**
 * ===== 事件委派（使用 capture=true 優先攔截）=====
 * - comment 頁：.add-comment → 評分選項（帶 ID）
 * - comment_detail 頁：#add-comment-btn → 評分選項（帶 ID）
 * - comment 頁：#commentBtn → 簡單評論（不帶 ID、導向 /add_comment/）
 */
function initializeInteractions() {
  // 先攔截（capture phase）
  document.addEventListener('click', function (e) {
    // --- .add-comment（comment 頁）→ 評分選項 ---
    const addBtn = e.target.closest('.add-comment');
    if (addBtn) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      showRatingModal(addBtn);
      return;
    }

    // --- #add-comment-btn（comment_detail 頁）→ 評分選項 ---
    const detailAddBtn = e.target.closest('#add-comment-btn');
    if (detailAddBtn) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      showRatingModal(detailAddBtn);
      return;
    }

    // --- #commentBtn（comment 頁）→ 簡單評論（不綁定課程） ---
    const commentBtn = e.target.closest('#commentBtn');
    if (commentBtn) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      // blank: true → 不帶 courseId，保留 /add_comment/
      showSimpleCommentModal(commentBtn, { blank: true });
      return;
    }
  }, true);

  // modal 內部導頁（分流：simple 保持空白；full 依 ID 導向）
  document.addEventListener('click', function (e) {
    // ① simple-full-comment-btn：若未明確帶 data-course-id，**一律**去 /add_comment/
    const aSimple = e.target.closest('#simple-full-comment-btn');
    if (aSimple) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      const idAttr =
        aSimple.getAttribute('data-course-id') ||
        aSimple.closest('.modal')?.getAttribute('data-course-id');
      if (idAttr && /^\d+$/.test(String(idAttr))) {
        window.location.href = '/add_comment/' + idAttr + '/';
      } else {
        // 明確不帶 ID（避免從網址/其他元素再推斷）
        window.location.href = '/add_comment/';
      }
      return;
    }

    // ② full-comment-btn：可依頁面/按鈕/彈窗帶入的 ID 導向
    const aFull = e.target.closest('#full-comment-btn');
    if (aFull) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      const modal = aFull.closest('.modal');
      const id =
        aFull.getAttribute('data-course-id') ||
        modal?.getAttribute('data-course-id') ||
        getCourseIdFrom(aFull);
      if (id && /^\d+$/.test(String(id))) {
        window.location.href = '/add_comment/' + id + '/';
      } else {
        // 沒有 ID 時保留原始 href（通常是 /add_comment/）
        window.location.href = aFull.href || '/add_comment/';
      }
      return;
    }
  });
}

// ===== 首次載入 =====
document.addEventListener('DOMContentLoaded', function () {
  initializeModalEvents();
  initializeInteractions();

  // 導出 API（給其他檔案可用）
  window.CommentPopup = {
    showRatingModal,
    showSimpleCommentModal,
  };
});

// ====== 評分提交（使用 modal 內的欄位與按鈕）======
(function () {
  function getCourseId() {
    // 優先讀取 modal 或按鈕上的 data-course-id
    const modal = document.getElementById('rating-modal');
    const fromModal = modal?.getAttribute('data-course-id');
    if (fromModal && /^\d+$/.test(String(fromModal))) return String(fromModal);

    const btn = document.getElementById('rating-submit-btn');
    const fromBtn = btn && (btn.dataset.courseId || btn.getAttribute('data-course-id'));
    if (fromBtn && /^\d+$/.test(String(fromBtn))) return String(fromBtn);

    return window.courseId || null;
  }

  async function submitRating() {
    const modal = document.getElementById('rating-modal');
    const ratingEl = modal?.querySelector('#modal-rating-value') || document.getElementById('rating-input');
    const submitBtn = modal?.querySelector('#rating-submit-btn') || document.getElementById('rating-submit-btn');

    const rating = ratingEl ? parseInt(ratingEl.value || '0', 10) : 0;
    const courseId = getCourseId();

    if (!courseId) {
      CommentToast?.toastError?.('找不到課程代號，無法提交評分');
      return;
    }
    if (!rating || rating < 1 || rating > 5) {
      CommentToast?.toastInfo?.('請先選擇 1–5 顆星再提交');
      return;
    }

    // 按鈕 loading
    let origHTML = '';
    if (submitBtn) {
      origHTML = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 提交中…';
    }

    try {
      const res = await fetch(`/api/comments/${courseId}/reviews/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ rating, content: (window.currentCommentText || '').trim() || '（僅評分）' })
      });
      const data = await res.json().catch(()=> ({}));
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);

      // ✅ 成功提示
      CommentToast?.toastSuccess?.('已記錄您的評分！感謝提供回饋。');

      // 重置並關閉 modal
      if (modal) {
        // 重置星星
        modal.querySelectorAll('.modal-stars i').forEach(
          (star) => (star.className = 'far fa-star')
        );
        const ratingInput = modal.querySelector('#modal-rating-value');
        if (ratingInput) ratingInput.value = '0';
        const display = modal.querySelector('.rating-display');
        if (display) display.textContent = '0.0';

        closeModal(modal);
      }

      // TODO: 若需要，這裡可以觸發頁面上的平均星等/分布刷新
      // refreshStarsUI(data);

    } catch (err) {
      CommentToast?.toastError?.(err.message || '提交評分失敗，請稍後再試');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origHTML || '提交評分';
      }
    }
  }

  function bind() {
    // 明確的提交按鈕（modal 內）
    const btn = document.getElementById('rating-submit-btn') 
             || document.getElementById('submit-rating') 
             || document.querySelector('[data-action="submit-rating"], .submit-rating-btn');
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); submitRating(); });

    // 若是表單提交（modal 內）
    const form = document.getElementById('rating-form') || document.querySelector('form[data-rating-form]');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); submitRating(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();