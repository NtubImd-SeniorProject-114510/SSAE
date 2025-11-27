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
      openModal(popup);
      console.log(`自動開啟彈窗: ${popupId}`);
    }
    sessionStorage.removeItem('openPopup');
  }

  // 檢查是否需要刷新評星數據（檢查兩種存儲方式）
  const needRefreshSession = sessionStorage.getItem('needRefreshRatings');
  const needRefreshLocal = localStorage.getItem('needRefreshRatings');
  
  if (needRefreshSession || needRefreshLocal) {
    console.log('檢測到需要刷新評星數據');
    
    // 清除標記
    sessionStorage.removeItem('needRefreshRatings');
    localStorage.removeItem('needRefreshRatings');
    
    // 延遲一點時間確保頁面完全載入後再刷新
    setTimeout(() => {
      refreshCourseData();
    }, 300);
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

// 監聽頁面顯示事件，處理從其他頁面返回的情況
window.addEventListener('pageshow', (event) => {
  console.log('pageshow 事件觸發，persisted:', event.persisted);
  
  // 檢查是否需要刷新（不管是否從快取載入）
  const needRefreshSession = sessionStorage.getItem('needRefreshRatings');
  const needRefreshLocal = localStorage.getItem('needRefreshRatings');
  
  if (needRefreshSession || needRefreshLocal) {
    console.log('檢測到需要刷新評星數據（pageshow事件）');
    
    // 清除標記
    sessionStorage.removeItem('needRefreshRatings');
    localStorage.removeItem('needRefreshRatings');
    
    setTimeout(() => {
      refreshCourseData();
    }, 300);
  }
});

// 初始化篩選器事件
function initializeFilters() {
  const educationSelect = document.getElementById('education-select');
  const majorSelect = document.getElementById('major-select');
  const gradeSelect = document.getElementById('grade-select');
  const ratingSelect = document.getElementById('rating-select');
  const reviewCountSelect = document.getElementById('review-count-select');
  const sortSelect = document.getElementById('sort-select');
  const searchBox = document.querySelector('.search-box');

  // 學制變更 → 更新科系選項 + 重渲染
  if (educationSelect) {
    educationSelect.addEventListener('change', function () {
      updateDepartmentOptions(this.value);
      filterAndRenderCourses();
    });
  }
  if (majorSelect) {
    majorSelect.addEventListener('change', filterAndRenderCourses);
  }
  if (gradeSelect) {
    gradeSelect.addEventListener('change', filterAndRenderCourses);
  }

  // 新增的篩選器
  if (ratingSelect) {
    ratingSelect.addEventListener('change', filterAndRenderCourses);
  }
  if (reviewCountSelect) {
    reviewCountSelect.addEventListener('change', filterAndRenderCourses);
  }
  if (sortSelect) {
    sortSelect.addEventListener('change', filterAndRenderCourses);
  }

  // 搜尋框
  if (searchBox) {
    searchBox.addEventListener('input', debounce(filterAndRenderCourses, 300));
  }

  // 清除篩選按鈕
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearAllFilters);
  }
}

// 清除所有篩選條件
function clearAllFilters() {
  // 重置所有下拉選單
  const educationSelect = document.getElementById('education-select');
  const majorSelect = document.getElementById('major-select');
  const gradeSelect = document.getElementById('grade-select');
  const ratingSelect = document.getElementById('rating-select');
  const reviewCountSelect = document.getElementById('review-count-select');
  const sortSelect = document.getElementById('sort-select');
  const searchBox = document.querySelector('.search-box');
  const clearBtn = document.getElementById('clear-filters-btn');

  if (educationSelect) educationSelect.value = '';
  if (majorSelect) {
    majorSelect.innerHTML = '<option value="">所有科系</option>';
    majorSelect.value = '';
  }
  if (gradeSelect) gradeSelect.value = '';
  if (ratingSelect) ratingSelect.value = '';
  if (reviewCountSelect) reviewCountSelect.value = '';
  if (sortSelect) sortSelect.value = 'name';
  if (searchBox) searchBox.value = '';

  // 按鈕動畫反饋
  if (clearBtn) {
    clearBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      clearBtn.style.transform = '';
    }, 150);
  }

  // 重新渲染所有課程
  filterAndRenderCourses();
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
  const ratingSelect = document.getElementById('rating-select');
  const reviewCountSelect = document.getElementById('review-count-select');
  const sortSelect = document.getElementById('sort-select');
  const searchBox = document.querySelector('.search-box');

  const academicId = educationSelect ? educationSelect.value : '';
  const departmentId = majorSelect ? majorSelect.value : '';
  const grade = gradeSelect ? gradeSelect.value : '';
  const minRating = ratingSelect ? parseFloat(ratingSelect.value) || 0 : 0;
  const minReviewCount = reviewCountSelect ? parseInt(reviewCountSelect.value) || 0 : 0;
  const sortBy = sortSelect ? sortSelect.value : 'name';
  const searchQuery = searchBox ? searchBox.value.trim().toLowerCase() : '';


  let filteredCourses = allCourses.filter((course) => {
    // 原有篩選條件
    if (academicId && String(course.academic_id) !== String(academicId))
      return false;
    if (departmentId && String(course.department_id) !== String(departmentId))
      return false;
    if (grade && String(course.grade_level) !== String(grade)) return false;

    // 新增評分篩選
    const courseRating = parseFloat(course.avg_rating) || 0;
    if (minRating > 0 && courseRating < minRating) {
      return false;
    }

    // 新增評論數量篩選
    const reviewCount = parseInt(course.review_count) || 0;
    if (minReviewCount > 0 && reviewCount < minReviewCount) {
      return false;
    }

    // 搜尋篩選
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

  // 排序邏輯
  filteredCourses.sort((a, b) => {
    switch (sortBy) {
      case 'rating-desc':
        return (parseFloat(b.avg_rating) || 0) - (parseFloat(a.avg_rating) || 0);
      case 'rating-asc':
        return (parseFloat(a.avg_rating) || 0) - (parseFloat(b.avg_rating) || 0);
      case 'review-count-desc':
        return (parseInt(b.review_count) || 0) - (parseInt(a.review_count) || 0);
      case 'review-count-asc':
        return (parseInt(a.review_count) || 0) - (parseInt(b.review_count) || 0);
      case 'name':
      default:
        return (a.course_name || '').localeCompare(b.course_name || '');
    }
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

// 刷新課程數據
async function refreshCourseData() {
  console.log('🔄 正在刷新課程數據...');
  
  try {
    // 重新從伺服器獲取最新的課程數據
    console.log('📡 發送請求到 /get_courses/');
    const response = await fetch('/get_courses/');
    
    if (response.ok) {
      const freshCourses = await response.json();
      const oldCount = allCourses.length;
      allCourses = freshCourses;
      
      console.log('✅ 已刷新課程資料:', allCourses.length, '筆 (原本:', oldCount, '筆)');
      
      // 重新渲染課程列表
      filterAndRenderCourses();
      
      console.log('🎯 課程列表已重新渲染完成');
    } else {
      console.error('❌ 刷新課程數據失敗:', response.status, response.statusText);
      // 如果請求失敗，至少重新渲染現有數據
      filterAndRenderCourses();
    }
  } catch (error) {
    console.error('💥 刷新課程數據時發生錯誤:', error);
    
    // 如果網路請求失敗，至少重新渲染現有數據
    console.log('🔄 網路請求失敗，使用現有數據重新渲染');
    filterAndRenderCourses();
  }
  
  // 確保透明度恢復正常（無論成功或失敗）
  const container = document.querySelector('.activity-grid');
  if (container) {
    container.style.opacity = '';  // 移除 inline style，恢復 CSS 預設值
    container.style.transition = '';  // 移除過渡效果
  }
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
  const allCards = document.querySelectorAll('.course-card');

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


// ---- 統一的開/關 Modal 工具 ----
function openModal(modal) {
  if (!modal) return;
  modal.classList.add('show');                 // 統一用 .show 控制狀態
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // 可選：若有 backdrop
  const backdrop = document.querySelector('.modal-backdrop');
  if (backdrop) backdrop.classList.add('show');
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  const backdrop = document.querySelector('.modal-backdrop.show');
  if (backdrop) backdrop.classList.remove('show');
}

// 全域一次性委派（叉叉/取消/遮罩/ESC）
document.addEventListener('click', (e) => {
  // 叉叉或任何 data-modal-close
  const closer = e.target.closest('[data-modal-close], .modal__close, .btn-close');
  if (closer) {
    const modal = closer.closest('.modal');
    if (modal) closeModal(modal);
    return;
  }
  // 點 backdrop（外層 .modal）關閉
  if (e.target.classList?.contains('modal') && e.target.classList.contains('show')) {
    closeModal(e.target);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const opened = document.querySelector('.modal.show');
    if (opened) closeModal(opened);
  }
});


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
      // ✅ 改走統一的 openModal，而不是 active + inline style
      const modal =
        document.getElementById('simple-comment-modal') ||
        document.querySelector('.modal'); // 若 id 不存在，退而求其次
      openModal(modal);
    }
  });
}
