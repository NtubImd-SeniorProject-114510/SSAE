// static/js/add_comment.js — robust version（含：轉換錯誤時禁止送出）
// 功能：頂端顯示同步 / 中文可見搜尋泡泡 / Toast 提示 / 匿名或實名顯示切換 & 上傳 / 保證 user_id 由後端以 request.user 儲存

(function(){
  let departmentsData = {};
  let gradesData = {};
  let coursesData = [];

  function el(id){ return document.getElementById(id); }

  function getCSRFToken() {
    // 先從 cookie 拿
    const m = document.cookie.match(/(?:^|;)\s*csrftoken=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
    // 退而求其次：從頁面上的 hidden input / meta 拿
    return document.querySelector('input[name="csrfmiddlewaretoken"]')?.value
        || document.querySelector('meta[name="csrf-token"]')?.content
        || '';
  }

  // ===== 新增：轉換/送出的狀態控制常數 =====
  const GUARD = {
    MIN_LEN: 20,                             // 你可依規則調整
    ERROR_TEXT: '轉換失敗，請稍後重試',        // 轉換器回傳的失敗訊息
    SHORT_HINT: '（內容過短）請補充具體細節。' // 你現有在右框顯示的「過短」提示
  };

  // 嘗試多種來源取得目前使用者資訊（供「實名」顯示）
  function getCurrentUserInfo(){
    // 1) <script type="application/json" id="current-user">{"username":"張三","avatar":"/media/u1.png"}</script>
    try{
      const j = el('current-user')?.textContent;
      if (j) {
        const data = JSON.parse(j);
        if (data && (data.username || data.name)) {
          return {
            username: data.username || data.name || '使用者',
            avatar: data.avatar || data.photo || data.image || ''
          };
        }
      }
    }catch(_){}
    // 2) <body data-username="張三" data-avatar="/media/u1.png">
    try{
      const b = document.body;
      const u = b?.dataset?.username || '';
      const a = b?.dataset?.avatar || '';
      if (u) return { username: u, avatar: a || '' };
    }catch(_){}
    // 3) window.CURRENT_USER = { username, avatar }
    try{
      if (window.CURRENT_USER && (window.CURRENT_USER.username || window.CURRENT_USER.name)) {
        return {
          username: window.CURRENT_USER.username || window.CURRENT_USER.name || '使用者',
          avatar: window.CURRENT_USER.avatar || ''
        };
      }
    }catch(_){}
    // 4) 預設
    return { username: '使用者', avatar: '' };
  }

  // 切換「匿名/實名」顯示
  function bindAnonymousToggle(){
    const container = document.querySelector('.display-mode-container');
    if (!container) return;

    const radioAnon = el('anonymous_yes'); // HTML 標籤文字是「匿名」
    const radioReal = el('anonymous_no');  // HTML 標籤文字是「實名」
    const avatarEl = container.querySelector('.user-info .avatar');
    const nameEl = container.querySelector('.user-info .username');

    const CURRENT = getCurrentUserInfo();
    const REAL_NAME = CURRENT.username || '使用者';
    const REAL_AVATAR = CURRENT.avatar || '/static/image/anonymous.png';
    const ANON_NAME = '匿名';
    const ANON_AVATAR = '/static/image/anonymous.png';

    function applyDisplay(isAnonymous){
      if (avatarEl) avatarEl.src = isAnonymous ? ANON_AVATAR : REAL_AVATAR;
      if (nameEl) nameEl.textContent = isAnonymous ? ANON_NAME : REAL_NAME;
    }

    const initialAnonymous = !!(radioAnon?.checked); // radioAnon 代表匿名
    applyDisplay(initialAnonymous);

    radioAnon?.addEventListener('change', ()=> {
      if (radioAnon.checked) applyDisplay(true);
    });
    radioReal?.addEventListener('change', ()=> {
      if (radioReal.checked) applyDisplay(false);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){

    // === 強化：預覽區僅允許「刪除/剪下」，中英/注音都無法新增 ===
    (function enforceDeleteOnlyOnPreview_hard(){
      const elp = document.getElementById('comment-preview') || document.getElementById('preview_text');
      if (!elp) return;

      const isTextarea = elp.tagName === 'TEXTAREA';

      // 關閉系統自動更正，避免自動插入
      if (isTextarea) {
        elp.setAttribute('autocomplete', 'off');
        elp.setAttribute('autocorrect', 'off');
        elp.setAttribute('autocapitalize', 'off');
        elp.setAttribute('spellcheck', 'false');
      }

      // 取值/設值封裝，兼容 div / textarea
      const getVal = () => ('value' in elp ? elp.value : elp.textContent || '');
      const setVal = (v) => {
        if ('value' in elp) elp.value = v;
        else elp.textContent = v;
      };

      // 快照（含游標）
      let prev = getVal();
      let selStart = isTextarea ? (elp.selectionStart ?? prev.length) : null;
      let selEnd   = isTextarea ? (elp.selectionEnd   ?? prev.length) : null;

      function snapshot() {
        prev = getVal();
        if (isTextarea) {
          selStart = elp.selectionStart ?? prev.length;
          selEnd   = elp.selectionEnd   ?? prev.length;
        }
      }
      function restore() {
        setVal(prev);
        if (isTextarea) {
          try {
            elp.setSelectionRange(selStart, selEnd);
          } catch(_){}
        }
      }

      // 允許的 beforeinput 類型（刪除相關）
      const ALLOWED = new Set([
        'deleteContentBackward',
        'deleteContentForward',
        'deleteByCut',
        'deleteByDrag',
        'deleteContent'
      ]);

      // 1) 先用 beforeinput 擋（可攔 New text / Paste / IME 插入）
      elp.addEventListener('beforeinput', (e) => {
        const t = e.inputType || '';
        if (!ALLOWED.has(t)) {
          e.preventDefault();
        } else {
          snapshot();
        }
      });

      // 2) 後盾：input 事件上做「差異比對」，若偵測到有新增 → 立刻回滾
      elp.addEventListener('input', () => {
        const cur = getVal();
        if (cur.length > prev.length) {
          restore();
        } else {
          snapshot();
        }
      });

      // 3) 禁止貼上、拖放插入
      elp.addEventListener('paste', (e) => e.preventDefault());
      elp.addEventListener('drop',  (e) => e.preventDefault());

      // 4) 鍵盤層限制
      elp.addEventListener('keydown', (e) => {
        const NAV = new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown','Tab','Escape','Shift','Control','Alt','Meta']);
        if (NAV.has(e.key)) return;
        if (e.key === 'Backspace' || e.key === 'Delete') { snapshot(); return; }

        if (e.ctrlKey || e.metaKey) {
          const k = e.key.toLowerCase();
          if (k === 'a' || k === 'c' || k === 'x') { snapshot(); return; } // 全選/複製/剪下
          if (k === 'v' || k === 'z' || k === 'y') { e.preventDefault(); return; } // 貼上/Undo/Redo 禁止
        }

        if (e.key.length === 1) { // 任何可見字元
          e.preventDefault();
        }
      });

      // 5) IME 組字
      elp.addEventListener('compositionstart', () => snapshot());
      elp.addEventListener('compositionupdate', () => {});
      elp.addEventListener('compositionend', () => {});
    })();


    // 讀取嵌入的 JSON 資料
    try{
      departmentsData = JSON.parse(el('departments-data')?.textContent || '{}');
      gradesData = JSON.parse(el('grades-data')?.textContent || '{}');
      coursesData = JSON.parse(el('courses-data')?.textContent || '[]');
    }catch(e){
      console.error('資料解析失敗：', e);
    }

    const academic = el('academic');
    const department = el('department');
    const grade = el('grade');
    const course = el('course');
    const comment = el('comment_text');
    const btnPreview = el('preview-btn');   // 你現有的「轉換/預覽」按鈕
    const btnSubmit = el('submit-btn');
    const preview = el('preview');          // 右側框外層
    const previewText = el('preview_text'); // 右側實際文字（或 #comment-preview）

    // ===== 新增：預覽框狀態與送出鎖定工具 =====
    function setPreviewState(kind, msg) {
      // kind: 'ok' | 'error' | 'empty'
      if (!preview) return;
      preview.dataset.state = kind;
      preview.classList.remove('is-error', 'is-ok', 'is-empty');
      if (kind === 'error') preview.classList.add('is-error');
      if (kind === 'ok')    preview.classList.add('is-ok');
      if (kind === 'empty') preview.classList.add('is-empty');
      if (typeof msg === 'string' && previewText) previewText.textContent = msg;
    }

    function lockSubmit(lock, reason='') {
      if (!btnSubmit) return;
      btnSubmit.disabled = !!lock;
      btnSubmit.setAttribute('aria-disabled', lock ? 'true' : 'false');
      btnSubmit.classList.toggle('is-disabled', !!lock);
      if (lock && reason) btnSubmit.title = reason; else btnSubmit.removeAttribute('title');
    }

    function hasBlockingError() {
      if (!preview) return false;
      const stateErr = preview.dataset.state === 'error';
      const txt = (previewText ? ('value' in previewText ? previewText.value : previewText.textContent) : '')?.trim() || '';
      const isErrorText = txt === GUARD.ERROR_TEXT || txt.startsWith('（內容過短）') || txt.startsWith(GUARD.SHORT_HINT);
      return stateErr || isErrorText;
    }

    // 頂端顯示區塊
    const courseNameEl = el('course-name-display');
    const courseTeacherEl = el('course-teacher-display');

    function updateCourseHeaderFromSelect() {
      if (!course) return;
      const opt = course.selectedOptions && course.selectedOptions[0];
      const name = opt ? (opt.dataset.name || opt.textContent || '') : '';
      const teacher = opt ? (opt.dataset.teacher || '') : '';
      if (courseNameEl) courseNameEl.textContent = (name || '請先選擇課程').trim();
      if (courseTeacherEl) courseTeacherEl.textContent = (teacher || '—').trim();
    }

    // 學制改變時重建科系與年級
    function populateDepartments(){
      if (!academic || !department) return;
      const list = departmentsData[academic.value] || [];
      department.innerHTML = '<option value="">請先選擇學制</option>';
      list.forEach(d=>{
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.name;
        department.appendChild(opt);
      });
    }

    function populateGrades(){
      if (!academic || !grade) return;
      const list = gradesData[academic.value] || [];
      grade.innerHTML = '<option value="">請先選擇學制</option>';
      list.forEach(g=>{
        const val = g.grade_level || g;
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        grade.appendChild(opt);
      });
    }

    function populateCourses(){
      if (!course) return;
      const a = academic?.value, d = department?.value, g = grade?.value;

      let filtered = (coursesData || []).filter(c=>
        (!a || String(c.academic_id) === String(a)) &&
        (!d || String(c.department_id) === String(d)) &&
        (!g || String(c.grade_level) === String(g))
      );
      course.innerHTML = '<option value="">請先選擇學制、科系和年級</option>';

      if(filtered.length === 0){
        course.innerHTML = '<option value="">沒有符合條件的課程</option>';
        updateCourseHeaderFromSelect();
        return;
      }

      filtered.forEach(c=>{
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.course_name}（${c.course_teacher || '未填寫教師'}）`;
        opt.dataset.name = c.course_name || '';
        opt.dataset.teacher = c.course_teacher || '';
        course.appendChild(opt);
      });

      const pre = window.__PRESELECTED__ && window.__PRESELECTED__.courseId;
      if (pre) course.value = String(pre);

      updateCourseHeaderFromSelect();
    }

    // 事件綁定
    academic?.addEventListener('change', ()=>{
      populateDepartments();
      populateGrades();
      populateCourses();
    });
    department?.addEventListener('change', populateCourses);
    grade?.addEventListener('change', populateCourses);
    course?.addEventListener('change', updateCourseHeaderFromSelect);

    // 初始預選
    if(window.__PRESELECTED__){
      if(window.__PRESELECTED__.academicId && academic) {
        academic.value = String(window.__PRESELECTED__.academicId);
      }
      populateDepartments();
      if(window.__PRESELECTED__.departmentId && department){
        department.value = String(window.__PRESELECTED__.departmentId);
      }
      populateGrades();
      if(window.__PRESELECTED__.grade && grade){
        grade.value = String(window.__PRESELECTED__.grade);
      }
    }

    // 初始課程清單 + 同步頂端顯示
    populateCourses();
    updateCourseHeaderFromSelect();

    // 綁定匿名/實名切換與視覺
    bindAnonymousToggle();

    // ===== 修改：預覽/轉換按鈕流程 =====
    btnPreview?.addEventListener('click', ()=>{
      const raw = (comment?.value || '').trim();

      // 先清空既有狀態
      if (raw.length === 0) {
        setPreviewState('empty', '');
        lockSubmit(false);
        CommentToast?.toastInfo?.('請先輸入評論內容');
        return;
      }

      // 基本門檻（字數不足 → 右側框顯示提示 + 鎖送出）
      if (raw.length < GUARD.MIN_LEN) {
        setPreviewState('error', GUARD.SHORT_HINT);
        lockSubmit(true, '評論內容太短，請補充後再送出');
        preview?.classList.remove('d-none');
        preview?.scrollIntoView({behavior:'smooth', block:'center'});
        return;
      }

      // 一般情況：此處可接你的「語意優化 API」；目前先直接顯示原文當預覽
      setPreviewState('ok', raw);
      lockSubmit(false);
      preview?.classList.remove('d-none');
      preview?.scrollIntoView({behavior:'smooth', block:'center'});
    });

    // 任何輸入變更 → 清掉錯誤，解鎖（讓使用者可以再按一次轉換）
    comment?.addEventListener('input', ()=>{
      if (!comment) return;
      // 只有在原先是 error 時才重置，避免干擾正常狀態
      if (preview?.dataset.state === 'error') {
        setPreviewState('empty', '');
        lockSubmit(false);
      }
    });

    // ===== 修改：送出前的最終把關（轉換失敗/過短一律擋掉） =====
    btnSubmit?.addEventListener('click', async (e) => {
      e.preventDefault();

      const cId = course?.value;
      const isAnonymous = (el('anonymous_yes')?.checked === true) || false;

      const previewBox = el('comment-preview') || el('preview_text');
      const previewVal = (previewBox ? ('value' in previewBox ? previewBox.value : previewBox.textContent) : '').trim();

      if(!cId){ CommentToast?.toastError?.('請先選擇課程'); return; }

      // 需要先「轉換/預覽」
      if(!previewVal){
        CommentToast?.toastInfo?.('請先按「轉換」，產生可提交的評論內容，再送出。');
        return;
      }

      // 一律擋掉錯誤狀態或錯誤訊息
      if (hasBlockingError()) {
        CommentToast?.toastError?.('目前預覽內容無法提交，請修正後再試。');
        return;
      }

      // 防呆：再次檢查字數
      if (previewVal.length < GUARD.MIN_LEN) {
        setPreviewState('error', GUARD.SHORT_HINT);
        lockSubmit(true, '評論內容太短');
        CommentToast?.toastInfo?.('評論內容過短，請補充具體細節後再送出。');
        return;
      }

      // 再擋一次「轉換失敗」這句話
      if (previewVal === GUARD.ERROR_TEXT) {
        setPreviewState('error', GUARD.ERROR_TEXT);
        lockSubmit(true, '轉換失敗，請稍後重試');
        CommentToast?.toastError?.('轉換失敗提示不可作為評論內容。');
        return;
      }

      // 覆蓋原始輸入：保證送出的是「轉換後」內容
      if (comment) comment.value = previewVal;

      const url = `/add_comment/${cId}/submit/`;

      try{
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 送出中…';

        const res = await fetch(url, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type':'application/json',
            'X-Requested-With':'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken(),
          },
          body: JSON.stringify({
            content: previewVal,        // ★ 只送轉換/預覽後的內容
            anonymous: isAnonymous
          })
        });

        const data = await res.json().catch(()=> ({}));
        if(!res.ok || data.error){
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        // 成功 → 跳轉到 comment_detail/<cId>
        window.location.href = `/comment_detail/${cId}`;

      }catch(err){
        console.error(err);
        CommentToast?.toastError?.(err.message || '送出失敗，請稍後再試');
        btnSubmit.innerHTML = '送出失敗';
      }
    });
  });
})();

// ======== 評分星星互動（健壯化） ========
(function () {
  function initAddCommentStars() {
    const root = document.getElementById('rating-stars');
    if (!root || root.dataset.bound === '1') return;

    const stars = root.querySelectorAll('i[data-rating]');
    const input = document.getElementById('rating-input');
    const text  = root.querySelector('.rating-text');

    function getCurrent() {
      const v = parseInt(input?.value || root.getAttribute('data-rating') || '0', 10);
      return Number.isFinite(v) ? Math.max(0, Math.min(5, v)) : 0;
    }

    function paint(val) {
      const v = Math.max(0, Math.min(5, parseInt(val || '0', 10)));
      stars.forEach((s) => {
        const n = parseInt(s.getAttribute('data-rating') || '0', 10);
        if (n <= v) {
          s.classList.remove('fa-regular');
          s.classList.add('fa-solid');
        } else {
          s.classList.remove('fa-solid');
          s.classList.add('fa-regular');
        }
        s.classList.add('fa-star');
      });
      if (text) { text.textContent = (v || 0).toFixed(1) + '/5.0'; }
      root.setAttribute('data-rating', String(v));
    }

    function commit(val) {
      const v = Math.max(1, Math.min(5, parseInt(val || '0', 10)));
      if (input) input.value = String(v);
      paint(v);
    }

    stars.forEach((star) => {
      star.style.cursor = 'pointer';

      star.addEventListener('mouseenter', () => {
        const v = parseInt(star.getAttribute('data-rating') || '0', 10);
        paint(v);
      });

      star.addEventListener('mouseleave', () => {
        paint(getCurrent());
      });

      star.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const v = parseInt(star.getAttribute('data-rating') || '0', 10);
        commit(v);
      });

      star.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation();
        const v = parseInt(star.getAttribute('data-rating') || '0', 10);
        commit(v);
      }, { passive: false });
    });

    root.tabIndex = 0;
    root.addEventListener('keydown', (e) => {
      const cur = getCurrent();
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault(); commit(Math.min(5, cur + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault(); commit(Math.max(1, cur - 1));
      } else if (/^[1-5]$/.test(e.key)) {
        e.preventDefault(); commit(parseInt(e.key, 10));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        if (input) input.value = '0';
        paint(0);
      }
    });

    paint(getCurrent());
    root.dataset.bound = '1';
  }

  document.addEventListener('DOMContentLoaded', initAddCommentStars);
})();