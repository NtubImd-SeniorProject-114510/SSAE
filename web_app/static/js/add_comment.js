// static/js/add_comment.js — robust version
// 功能：頂端顯示同步 / 中文可見搜尋泡泡 / Toast 提示 / 匿名或實名顯示切換 & 上傳 / 保證 user_id 由後端以 request.user 儲存

(function(){
  let departmentsData = {};
  let gradesData = {};
  let coursesData = [];

  function el(id){ return document.getElementById(id); }

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

    // 依目前 radio 狀態套用（容錯：有些模板預設 checked 在匿名）
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
    const ratingInput = el('rating-input');
    const btnPreview = el('preview-btn');
    const btnSubmit = el('submit-btn');
    const preview = el('preview');
    const previewText = el('preview_text');

    // 頂端顯示區塊
    const courseNameEl = el('course-name-display');
    const courseTeacherEl = el('course-teacher-display');

    // 依課程下拉目前選項更新頂端顯示
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
        // value 使用資料表主鍵 id
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

    // 預覽
    btnPreview?.addEventListener('click', ()=>{
      const val = (comment?.value || '').trim();
      if(!val){ CommentToast?.toastInfo?.('請先輸入評論內容'); return; }
      preview?.classList.remove('d-none');
      if (previewText) previewText.textContent = val;
      preview?.scrollIntoView({behavior:'smooth', block:'center'});
    });

    // 送出（含匿名狀態）
    btnSubmit?.addEventListener('click', async (e)=>{
      e.preventDefault();

      const cId = course?.value;
      const text = (comment?.value || '').trim();
      const star = parseInt(ratingInput?.value || '0', 10);

      const isAnonymous =
        // radio「匿名」通常是 #anonymous_yes
        (el('anonymous_yes')?.checked === true) ||
        // 若沒有那組 radio，預設匿名 false
        false;

      if(!cId){ CommentToast?.toastError?.('請先選擇課程'); return; }
      if(!text){ CommentToast?.toastInfo?.('評論內容不能為空'); return; }
      if(!(star >=1 && star <=5)){ CommentToast?.toastInfo?.('評分必須是 1–5'); return; }

      const url = `/add_comment/${cId}/submit/`;

      try{
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 送出中…';
        const res = await fetch(url, {
          method: 'POST',
          headers: {'Content-Type':'application/json', 'X-Requested-With':'XMLHttpRequest'},
          body: JSON.stringify({ content: text, rating: star, anonymous: isAnonymous })
        });
        const data = await res.json().catch(()=> ({}));
        if(!res.ok || data.error){
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        CommentToast?.toastSuccess?.('已送出您的評論與評分！');

        // 成功後是否導頁：依需求
        // window.location.href = `/comment_detail/${cId}`;
      }catch(err){
        console.error(err);
        CommentToast?.toastError?.(err.message || '送出失敗，請稍後再試');
      }finally{
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-regular fa-paper-plane"></i> 送出';
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

/* visible-searchable-select.js — 讓 <select> 有「可見的」搜尋輸入泡泡（中文 IME 支援） */
(function(){
  const RESET_MS = 700;

  const toHalfWidth = (s) =>
    (s || "")
      .replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
      .replace(/\u3000/g, " ");

  const normalize = (s) =>
    toHalfWidth(String(s || "").trim())
      .toLowerCase()
      .replace(/^[\s\-\[\]\(\)【】·•・]+/, "");

  function ensureOverlay(){
    let box = document.getElementById("select-search-overlay");
    if (box) return box;
    box = document.createElement("input");
    box.type = "text";
    box.id = "select-search-overlay";
    Object.assign(box.style, {
      position: "absolute",
      zIndex: 9999,
      minWidth: "120px",
      padding: "6px 10px",
      fontSize: "14px",
      border: "1px solid #ccc",
      borderRadius: "8px",
      boxShadow: "0 6px 18px rgba(0,0,0,.08)",
      background: "#fff",
      outline: "none",
      display: "none",
    });
    box.addEventListener("mousedown", (e)=> e.stopPropagation());
    document.body.appendChild(box);
    return box;
  }

  function positionOverlay(overlay, anchor){
    const r = anchor.getBoundingClientRect();
    const top = window.scrollY + r.top - 40; // 選單上方
    const left = window.scrollX + r.left;
    overlay.style.top = `${Math.max(top, window.scrollY)}px`;
    overlay.style.left = `${left}px`;
    overlay.style.minWidth = `${Math.max(160, r.width)}px`;
  }

  function attach(select){
    if (!select || select._vss_bound) return;
    select._vss_bound = true;

    let buffer = "";
       let lastType = 0;
    let composing = false;
    let composeBuf = "";

    const overlay = ensureOverlay();

    const resetIfTimeout = () => {
      const now = Date.now();
      if (now - lastType > RESET_MS) buffer = "";
      lastType = now;
    };

    const applyMatch = () => {
      const opts = Array.from(select.options);
      if (!opts.length) return;
      const from = Math.max(0, select.selectedIndex);
      const n = normalize(buffer);
      if (!n) return;

      const tryMatch = (pred)=>{
        for (let i=1;i<=opts.length;i++){
          const idx = (from + i) % opts.length;
          const txt = normalize(opts[idx].text);
          if (pred(txt)) return idx;
        }
        return -1;
      };
      let idx = tryMatch(t=>t.startsWith(n));
      if (idx === -1) idx = tryMatch(t=>t.includes(n));
      if (idx !== -1){
        select.selectedIndex = idx;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        if (select.options[idx] && select.options[idx].scrollIntoView){
          select.options[idx].scrollIntoView({ block: "nearest" });
        }
      }
    };

    const showOverlay = () => {
      positionOverlay(overlay, select);
      overlay.value = buffer;
      overlay.style.display = "block";
    };
    const hideOverlay = () => { overlay.style.display = "none"; };

    new MutationObserver(()=>{ buffer = ""; overlay.value = ""; })
      .observe(select, { childList: true, subtree: true });

    // IME（中文）支援
    select.addEventListener("compositionstart", ()=>{ composing = true; composeBuf=""; showOverlay(); });
    select.addEventListener("compositionupdate", (e)=>{ composeBuf = e.data || ""; overlay.value = buffer + composeBuf; showOverlay(); });
    select.addEventListener("compositionend", (e)=>{
      composing = false;
      const data = e.data || composeBuf || "";
      resetIfTimeout();
      buffer += data;
      overlay.value = buffer;
      applyMatch();
      composeBuf = "";
    });

    // 攔截鍵盤（capture 擋掉原生 typeahead）
    const onKeyDown = (e) => {
      if (document.activeElement !== select) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const nav = ["ArrowUp","ArrowDown","Home","End","Enter","Tab","Escape","PageUp","PageDown"];
      if (nav.includes(e.key)){
        if (e.key === "Escape") { buffer=""; overlay.value=""; hideOverlay(); }
        return;
      }

      showOverlay();

      if (composing){ e.preventDefault(); e.stopPropagation(); return; }

      if (e.key === "Backspace"){
        e.preventDefault(); e.stopPropagation();
        resetIfTimeout();
        buffer = buffer.slice(0,-1);
        overlay.value = buffer;
        applyMatch();
        if (!buffer) hideOverlay();
        return;
      }

      if (e.key === " "){
        e.preventDefault(); e.stopPropagation();
        resetIfTimeout();
        buffer += " ";
        overlay.value = buffer;
        applyMatch();
        return;
      }

      if (e.key && e.key.length === 1){
        e.preventDefault(); e.stopPropagation();
        resetIfTimeout();
        buffer += e.key;
        overlay.value = buffer;
        applyMatch();
        return;
      }
    };
    document.addEventListener("keydown", onKeyDown, true);

    select.addEventListener("focus", () => { buffer && showOverlay(); });
    select.addEventListener("blur", () => { setTimeout(()=> hideOverlay(), 80); });

    document.addEventListener("mousedown", (e)=>{
      if (e.target === overlay) return;
      if (e.target === select) return;
      hideOverlay();
    });
    window.addEventListener("scroll", ()=>{ if (overlay.style.display==="block") positionOverlay(overlay, select); }, true);
    window.addEventListener("resize", ()=>{ if (overlay.style.display==="block") positionOverlay(overlay, select); });
  }

  function initVisibleSearchableSelects(ids){
    if (Array.isArray(ids) && ids.length){
      ids.forEach(id=>{
        const el = document.getElementById(id);
        if (el && el.tagName==="SELECT") attach(el);
      });
    }
    document.querySelectorAll("select.searchable").forEach(attach);
  }

  // 對外
  window.initVisibleSearchableSelects = initVisibleSearchableSelects;

  // 自動初始化：使用 add_comment 頁的實際 id
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", ()=> initVisibleSearchableSelects(["academic", "department", "grade", "course"]));
  }else{
    initVisibleSearchableSelects(["academic", "department", "grade", "course"]);
  }
})();