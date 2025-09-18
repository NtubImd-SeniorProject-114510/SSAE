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

    // 計算顯示用文字
    const avgRating = course.avg_rating ? Number(course.avg_rating).toFixed(1) : '0.0';
    const ratingCount = course.rating_count || 0;   // 幾則評分（含純評分）
    const reviewCount = course.review_count || 0;   // 幾則評論（有文字）
    const lastDate   = course.last_date || '暫無';

    let summaryHtml = `
      <div class="user-info">
        <img src="/static/image/anonymous.png" alt="User Avatar" class="avatar">
        <span class="username">暫無評論</span>
      </div>
      <p>目前還沒有任何評論，成為第一個評論的人吧！</p>
    `;
    if (course.course_summary) {
      summaryHtml = `
        <div class="user-info">
          <img src="${course.course_summary.avatar_url || '/static/image/anonymous.png'}" alt="User Avatar" class="avatar">
          <span class="username">${course.course_summary.display_name || '使用者'}</span>
        </div>
        <p>${course.course_summary.summary}</p>
        <div class="likes"><i class="fa-solid fa-thumbs-up"></i> ${course.course_summary.likes}　${course.course_summary.created}</div>
      `;
    }

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
          <div class="stars" data-rating="${avgRating}">
            <span class="rating-text">${avgRating}</span>
            <i class="fa-solid fa-thumbs-up"></i>
          </div>
          <div class="rating-count">${ratingCount} 則評分</div>
        </div>
      </div>
      <div class="course-bottom">
        <p class="last-date">最新評論: ${lastDate}</p>
        <div class="course-summary">${summaryHtml}</div>
        <div class="review-counter">${reviewCount} 則評論</div>
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
