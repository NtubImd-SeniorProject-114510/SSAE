// static/js/comment.js

// 防抖函數
function debounce(func, wait) {
  let timeout;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// 儲存所有課程資料
let allCourses = [];

// 初始化頁面
document.addEventListener('DOMContentLoaded', () => {
  console.log('評論頁面 JS 已加載');

  // 1) 若有需要自動開啟的彈窗
  const popupId = sessionStorage.getItem('openPopup');
  if (popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
      popup.classList.add('active');
      console.log(`自動開啟彈窗: ${popupId}`);
    }
    sessionStorage.removeItem('openPopup');
  }

  // 2) 從頁面載入課程資料
  try {
    const coursesData = document.getElementById('courses-data');
    if (coursesData && coursesData.textContent) {
      allCourses = JSON.parse(coursesData.textContent);
      console.log('已載入課程資料:', allCourses.length, '筆');
    }
  } catch (error) {
    console.error('載入課程資料時發生錯誤:', error);
  }

  // 初始化
  initializeFilters();
  filterAndRenderCourses();
  initializeParallax();
  initializeScrollAnimations();
  initializeInteractions();
});

// 初始化篩選器事件監聽
function initializeFilters() {
  const educationSelect = document.getElementById('education-select');
  const majorSelect = document.getElementById('major-select');
  const gradeSelect = document.getElementById('grade-select');
  const searchBox = document.querySelector('.search-box');

  // 學制變更 → 更新科系
  if (educationSelect) {
    educationSelect.addEventListener('change', function () {
      updateDepartmentOptions(this.value);
      filterAndRenderCourses();
    });
  }

  // 科系/年級變更 → 重渲染
  if (majorSelect) {
    majorSelect.addEventListener('change', filterAndRenderCourses);
  }
  if (gradeSelect) {
    gradeSelect.addEventListener('change', filterAndRenderCourses);
  }

  // 搜尋框
  if (searchBox) {
    searchBox.addEventListener('input', debounce(filterAndRenderCourses, 300));
  }
}

// 更新科系選項（依學制）
function updateDepartmentOptions(academicId) {
  const majorSelect = document.getElementById('major-select');
  if (!majorSelect) return;

  // 清空現有選項，保留「所有科系」
  majorSelect.innerHTML = '<option value="">所有科系</option>';

  // 未選學制 → 不追加
  if (!academicId) return;

  // 從頁面上的 JSON 取得科系資料
  try {
    const departmentsData = JSON.parse(
      document.getElementById('departments-data').textContent
    );
    const departments =
      departmentsData[academicId] || departmentsData['0'] || [];

    departments.forEach((dept) => {
      const option = document.createElement('option');
      option.value = dept.id;
      option.textContent = dept.name;
      majorSelect.appendChild(option);
    });
  } catch (e) {
    console.error('解析 departments-data 失敗：', e);
  }
}

//（可選）改用 API 取得課程
async function fetchAndRenderCourses() {
  const educationSelect = document.getElementById('education-select');
  const majorSelect = document.getElementById('major-select');
  const gradeSelect = document.getElementById('grade-select');
  const searchBox = document.querySelector('.search-box');

  const params = new URLSearchParams();

  if (educationSelect && educationSelect.value) {
    params.append('academic_id', educationSelect.value);
  }
  if (majorSelect && majorSelect.value) {
    params.append('department_id', majorSelect.value);
  }
  if (gradeSelect && gradeSelect.value) {
    params.append('grade', gradeSelect.value);
  }
  if (searchBox && searchBox.value.trim()) {
    params.append('search', searchBox.value.trim());
  }

  try {
    const response = await fetch(`/get_courses/?${params.toString()}`);
    const courses = await response.json();
    renderCourses(courses);
  } catch (error) {
    console.error('獲取課程資料時發生錯誤:', error);
  }
}

// 過濾並渲染課程（本地 allCourses）
function filterAndRenderCourses() {
  const educationSelect = document.getElementById('education-select');
  const majorSelect = document.getElementById('major-select');
  const gradeSelect = document.getElementById('grade-select');
  const searchBox = document.querySelector('.search-box');

  const academicId = educationSelect ? educationSelect.value : '';
  const departmentId = majorSelect ? majorSelect.value : '';
  const grade = gradeSelect ? gradeSelect.value : '';
  const searchQuery = searchBox ? searchBox.value.trim().toLowerCase() : '';

  const filteredCourses = allCourses.filter((course) => {
    if (academicId && String(course.academic_id) !== String(academicId))
      return false;
    if (departmentId && String(course.department_id) !== String(departmentId))
      return false;
    if (grade && String(course.grade_level) !== String(grade)) return false;

    if (searchQuery) {
      const inName = course.course_name
        ? course.course_name.toLowerCase().includes(searchQuery)
        : false;
      const inTeacher = course.course_teacher
        ? course.course_teacher.toLowerCase().includes(searchQuery)
        : false;
      const inId = course.course_id
        ? course.course_id.toLowerCase().includes(searchQuery)
        : false;

      if (!inName && !inTeacher && !inId) return false;
    }

    return true;
  });

  renderCourses(filteredCourses);
}

// 渲染課程列表
function renderCourses(courses) {
  const container = document.querySelector('.activity-grid');
  if (!container) return;

  container.innerHTML = '';

  if (!courses.length) {
    container.innerHTML =
      '<div class="no-results">找不到符合條件的課程</div>';
    return;
  }

  courses.forEach((course) => {
    const el = document.createElement('div');
    el.className = 'course-item';
    el.dataset.department = course.department_name || '';
    el.style.cursor = 'pointer';

    // 點到卡片空白處 → 詳情
    el.addEventListener('click', (e) => {
      if (e.target.closest('a, button, .create-btn, .join-btn')) return;
      window.location.href = `/comment_detail/${course.id}/`;
    });

    el.innerHTML = `
      <div class="course-top">
        <div>
          <h3 class="course-name">${course.course_name || '未命名課程'}</h3>
          <div class="course-meta">
            <span class="course-teacher"><i class="fas fa-user-tie"></i> ${
              course.course_teacher || '未指定教師'
            }</span>
            <span class="course-department"><i class="fas fa-building"></i> ${
              course.department_name || '未指定科系'
            }</span>
          </div>
        </div>
        <div class="course-rating">
          <div class="stars" data-rating="${course.avg_rating || 0}">
            <span class="rating-text">${
              course.avg_rating ? Number(course.avg_rating).toFixed(1) : '0.0'
            }</span>
            <i class="fas fa-star"></i>
          </div>
          <div class="rating-count">(0則評論)</div>
        </div>
      </div>
      <div class="course-bottom">
        <p class="last-date">最新評論: 暫無</p>
        <div class="course-summary">
          <div class="user-info">
            <img src="/static/image/anonymous.png" alt="User Avatar" class="avatar">
            <span class="username">暫無評論</span>
          </div>
          <p>目前還沒有任何評論，成為第一個評論的人吧！</p>
        </div>
        <div class="buttons-container">
          <a href="#"
             class="join-btn add-comment"
             data-course-id="${course.id}">新增評論</a>
          <a href="/comment_detail/${course.id}/" class="join-btn">查看所有評論</a>
        </div>
      </div>
    `;

    container.appendChild(el);
  });

  initializeStarRatings();
}

// 星級顯示
function initializeStarRatings() {
  document.querySelectorAll('.stars').forEach((wrap) => {
    const rating = parseFloat(wrap.getAttribute('data-rating')) || 0;
    const icon = wrap.querySelector('i');
    const text = wrap.querySelector('.rating-text');
    if (icon) {
      icon.className = rating >= 1 ? 'fas fa-star' : 'far fa-star';
    }
    if (text && !Number.isNaN(rating)) {
      text.textContent = rating.toFixed(1);
    }
  });
}

// 滾動動畫（可選）
function initializeScrollAnimations() {
  const allCards = document.querySelectorAll('.activity-card');

  function checkVisibility() {
    const h = window.innerHeight;
    allCards.forEach((card, i) => {
      const top = card.getBoundingClientRect().top;
      if (top < h - 100) {
        setTimeout(() => card.classList.add('visible'), i * 100);
      }
    });
  }

  checkVisibility();
  window.addEventListener('scroll', checkVisibility);
}

// 背景視差
function initializeParallax() {
  const bgText = document.querySelector('.bg-text');
  function parallaxScroll() {
    const y = window.pageYOffset;
    if (bgText) bgText.style.transform = `translateX(${y * -0.1}px)`;
  }
  window.addEventListener('scroll', parallaxScroll);
}

// 互動初始化（包含導頁）
function initializeInteractions() {
  // 事件委派：課程卡片的「新增評論」→ 顯示彈窗
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.add-comment');
    if (!btn) return;
    e.preventDefault();

    if (window.CommentPopup && typeof window.CommentPopup.showSimpleCommentModal === 'function') {
      window.CommentPopup.showSimpleCommentModal(btn);
    } else {
      const fallback = document.querySelector('#simple-comment-modal, .modal');
      if (fallback) {
        fallback.classList.add('active');
        fallback.style.display = 'flex';
      }
    }

    // ★ 打開彈窗後，若彈窗內也有 <select>，補綁一次可見搜尋泡泡（用 class="searchable" 更保險）
    if (typeof window.initVisibleSearchableSelects === 'function') {
      window.initVisibleSearchableSelects(); // 掃描 class="searchable" 的 select
    }
  });
}

/* visible-searchable-select.js — 讓 <select> 有看得見的搜尋輸入泡泡（中文 IME 支援） */
/* 用法：
   1) 直接包含本檔；
   2) 自動套用在 #education-select / #major-select / #grade-select；
   3) 或在任一 <select> 加上 class="searchable"。
*/
(function(){
  const RESET_MS = 700;

  const toHalfWidth = (s) =>
    (s || "")
      .replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
      .replace(/\u3000/g, " ");

  const normalize = (s) =>
    toHalfWidth(String(s || "").trim())
      .toLowerCase()
      .replace(/^[\s\-\[\]\(\)【】·•・]+/, ""); // 去除前置符號

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
    // 阻止 blur 立即消失（讓點選選字表單不會中斷）
    box.addEventListener("mousedown", (e)=> e.stopPropagation());
    document.body.appendChild(box);
    return box;
  }

  function positionOverlay(overlay, anchor){
    const r = anchor.getBoundingClientRect();
    const top = window.scrollY + r.top - 40; // 放在 select 上方
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
      // 若你想把焦點給 overlay 也可以：overlay.focus();
    };

    const hideOverlay = () => {
      overlay.style.display = "none";
    };

    // 動態 options → 清空
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

    // 攔截鍵盤（使用 capture 擋掉原生 typeahead）
    const onKeyDown = (e) => {
      if (document.activeElement !== select) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const nav = ["ArrowUp","ArrowDown","Home","End","Enter","Tab","Escape","PageUp","PageDown"];
      if (nav.includes(e.key)){
        if (e.key === "Escape") { buffer=""; overlay.value=""; hideOverlay(); }
        return; // 導覽鍵交給原生
      }

      showOverlay();

      if (composing){
        e.preventDefault(); e.stopPropagation();
        return; // 等 compositionend
      }

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

    // 用 document 捕捉 → 確保優先權
    document.addEventListener("keydown", onKeyDown, true);

    // select 聚焦時顯示泡泡；失焦或點別處收起
    select.addEventListener("focus", () => {
      buffer && showOverlay();
    });
    select.addEventListener("blur", () => {
      // 略延遲避免點擊 overlay 時立即消失
      setTimeout(()=> hideOverlay(), 80);
    });

    // 點擊畫面其他地方也收起
    document.addEventListener("mousedown", (e)=>{
      if (e.target === overlay) return;
      if (e.target === select) return;
      hideOverlay();
    });
    // 視窗滾動/尺寸變動時重定位
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

  // ★ 自動初始化（comment 頁：education / major / grade）
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", () =>
      initVisibleSearchableSelects(['education-select','major-select','grade-select'])
    );
  }else{
    initVisibleSearchableSelects(['education-select','major-select','grade-select']);
  }
})();