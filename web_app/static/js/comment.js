// 防抖函數
function debounce(func, wait) {
    let timeout;
    return function() {
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
    // 檢查是否有彈出視窗需要開啟
    const popupId = sessionStorage.getItem('openPopup');
    if (popupId) {
        const popup = document.getElementById(popupId);
        if (popup) {
            popup.classList.add('active');
            console.log(`自動開啟彈窗: ${popupId}`);
        } else {
            console.warn(`找不到彈窗 ID: ${popupId}`);
        }
        sessionStorage.removeItem('openPopup');
    }

    // 從頁面載入課程資料
    try {
        const coursesData = document.getElementById('courses-data');
        if (coursesData && coursesData.textContent) {
            allCourses = JSON.parse(coursesData.textContent);
            console.log('已載入課程資料:', allCourses.length, '筆');
        }
    } catch (error) {
        console.error('載入課程資料時發生錯誤:', error);
    }

    // 初始化篩選器
    initializeFilters();
    
    // 初始渲染所有課程
    filterAndRenderCourses();
});

// 初始化篩選器事件監聽
function initializeFilters() {
    const educationSelect = document.getElementById("education-select");
    const majorSelect = document.getElementById("major-select");
    const gradeSelect = document.getElementById("grade-select");
    const searchBox = document.querySelector(".search-box");

    // 當學制變更時，更新科系選項
    if (educationSelect) {
        educationSelect.addEventListener("change", function() {
            updateDepartmentOptions(this.value);
            filterAndRenderCourses();
        });
    }

    // 當科系或年級變更時，重新渲染課程
    if (majorSelect) {
        majorSelect.addEventListener("change", filterAndRenderCourses);
    }
    
    if (gradeSelect) {
        gradeSelect.addEventListener("change", filterAndRenderCourses);
    }

    // 搜尋框輸入時進行篩選
    if (searchBox) {
        searchBox.addEventListener("input", debounce(filterAndRenderCourses, 300));
    }
}

// 更新科系選項
function updateDepartmentOptions(academicId) {
    const majorSelect = document.getElementById("major-select");
    if (!majorSelect) return;

    // 清空現有選項，保留「所有科系」
    majorSelect.innerHTML = '<option value="">所有科系</option>';
    
    // 如果沒有選擇學制，則不顯示任何科系選項
    if (!academicId) return;

    // 從頁面上的 data 屬性獲取科系資料
    const departmentsData = JSON.parse(document.getElementById('departments-data').textContent);
    const departments = departmentsData[academicId] || [];

    // 添加科系選項
    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.id;
        option.textContent = dept.name;
        majorSelect.appendChild(option);
    });
}

// 獲取並渲染課程
async function fetchAndRenderCourses() {
    const educationSelect = document.getElementById("education-select");
    const majorSelect = document.getElementById("major-select");
    const gradeSelect = document.getElementById("grade-select");
    const searchBox = document.querySelector(".search-box");

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

// 過濾並渲染課程
function filterAndRenderCourses() {
    const educationSelect = document.getElementById("education-select");
    const majorSelect = document.getElementById("major-select");
    const gradeSelect = document.getElementById("grade-select");
    const searchBox = document.querySelector(".search-box");
    
    // 獲取篩選條件
    const academicId = educationSelect ? educationSelect.value : '';
    const departmentId = majorSelect ? majorSelect.value : '';
    const grade = gradeSelect ? gradeSelect.value : '';
    const searchQuery = searchBox ? searchBox.value.trim().toLowerCase() : '';
    
    // 過濾課程
    const filteredCourses = allCourses.filter(course => {
        // 學制過濾
        if (academicId && course.academic_id != academicId) return false;
        
        // 科系過濾
        if (departmentId && course.department_id != departmentId) return false;
        
        // 年級過濾
        if (grade && course.grade_level != grade) return false;
        
        // 搜尋關鍵字過濾
        if (searchQuery) {
            const searchInName = course.course_name ? course.course_name.toLowerCase().includes(searchQuery) : false;
            const searchInTeacher = course.course_teacher ? course.course_teacher.toLowerCase().includes(searchQuery) : false;
            const searchInId = course.course_id ? course.course_id.toLowerCase().includes(searchQuery) : false;
            
            if (!searchInName && !searchInTeacher && !searchInId) {
                return false;
            }
        }
        
        return true;
    });
    
    // 渲染過濾後的課程
    renderCourses(filteredCourses);
}

// 渲染課程列表
function renderCourses(courses) {
    const activitiesContainer = document.querySelector(".activity-grid");
    if (!activitiesContainer) return;

    // 清空現有課程
    activitiesContainer.innerHTML = '';

    if (courses.length === 0) {
        activitiesContainer.innerHTML = '<div class="no-results">找不到符合條件的課程</div>';
        return;
    }

    // 渲染每個課程
    courses.forEach(course => {
        const courseElement = document.createElement('div');
        courseElement.className = 'course-item';
        courseElement.dataset.department = course.department_name || '';
        
        // 添加點擊事件處理
        courseElement.style.cursor = 'pointer';
        courseElement.addEventListener('click', function(e) {
            // 如果點擊的是按鈕，則不處理（避免事件冒泡）
            if (e.target.closest('a, button, .create-btn, .join-btn')) {
                return;
            }
            // 導航到評論詳情頁面
            window.location.href = `/comment_detail/?course_id=${course.id}`;
        });
        
        // 使用與原始模板相同的結構
        courseElement.innerHTML = `
            <div class="course-top">
                <div>
                    <h3 class="course-name">${course.course_name || '未命名課程'}</h3>
                    <div class="course-meta">
                        <span class="course-teacher"><i class="fas fa-user-tie"></i> ${course.course_teacher || '未指定教師'}</span>
                        <span class="course-department"><i class="fas fa-building"></i> ${course.department_name || '未指定科系'}</span>
                    </div>
                </div>
                
                <div class="course-rating">
                    <div class="stars" data-rating="4.6">
                        <span class="rating-text">4.6</span>
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
                    <a href="#" class="create-btn">新增評論</a>
                    <a href="/comment_detail/?course_id=${course.id}" class="join-btn">查看所有評論</a>
                </div>
            </div>
        `;
        
        activitiesContainer.appendChild(courseElement);
    });
}




// //
// document.addEventListener("DOMContentLoaded", function () {
//     const eduSelect = document.getElementById("education-select");
//     const majorSelect = document.getElementById("major-select");
//     const gradeSelect = document.getElementById("grade-select");

//     const majorOptions = {
//         "five": [
//             "所有科系", "財政稅務系", "國際貿易系","企業管理系",
//              "資訊管理系", "財務金融系", "應用外語系", "會計資訊系","體育"
//         ],
//         "two": [
//             "所有科系", "通識", "會計資訊系", "財務金融系",
//             "財政稅務系", "國際商務系", "企業管理系", "資訊管理系", "應用外語系",
//             "商業設計管理系", "創意科技與產品設計系"
//         ],
//         "four": [
//             "所有科系", "通識", "會計資訊系", "財務金融系",
//             "財政稅務系", "國際商務系", "企業管理系", "資訊管理系", "應用外語系",
//             "商業設計管理系", "創意科技與產品設計系", "數位多媒體設計系", "體育室", "軍訓室"
//         ],
//         "": ["所有科系"] // 預設空白
//     };

//     const gradeOptions = {
//         "five": ["所有年級", "一年級", "二年級", "三年級", "四年級", "五年級"],
//         "two": ["所有年級", "一年級", "二年級"],
//         "four": ["所有年級", "一年級", "二年級", "三年級", "四年級"],
//         "": ["所有年級", "一年級", "二年級", "三年級", "四年級", "五年級"]
//     };

//     eduSelect.addEventListener("change", function () {
//         const selectedEdu = eduSelect.value;

//         updateSelectOptions(majorSelect, majorOptions[selectedEdu] || majorOptions[""]);
//         updateSelectOptions(gradeSelect, gradeOptions[selectedEdu] || gradeOptions[""]);
//     });

//     function updateSelectOptions(selectElement, options) {
//         selectElement.innerHTML = "";
//         options.forEach(optionText => {
//             const option = document.createElement("option");
//             option.textContent = optionText;
//             selectElement.appendChild(option);
//         });
//     }

//     // 初始化顯示預設選項
//     updateSelectOptions(majorSelect, majorOptions[""]);
//     updateSelectOptions(gradeSelect, gradeOptions[""]);
// });




// comment.js

document.addEventListener('DOMContentLoaded', function() {
    console.log('評論頁面 JS 已加載');
    
    // 初始化星級評分顯示
    initializeStarRatings();
    
    // 設置搜尋和過濾功能
    setupSearchAndFilters();
    
    // 設置分頁
    setupPagination();
    
    // 初始化交互元素
    initializeInteractions();
    
    // 添加視差滾動效果
    initializeParallax();
    
    // 注意：評分模態框功能現在由 comment_pop.js 處理
});

// 滾動動畫
function initializeScrollAnimations() {
    const allCards = document.querySelectorAll('.activity-card');
    
    function checkVisibility() {
        const windowHeight = window.innerHeight;
        
        allCards.forEach((card, index) => {
            const cardTop = card.getBoundingClientRect().top;
            
            if (cardTop < windowHeight - 100) {
                setTimeout(() => {
                    card.classList.add('visible');
                }, index * 100); // 錯開動畫時間
            }
        });
    }
    
    // 初始檢查
    checkVisibility();
    
    // 滾動事件監聽
    window.addEventListener('scroll', checkVisibility);
}

// 背景文字視差效果
function initializeParallax() {
    const bgText = document.querySelector('.bg-text');
    
    function parallaxScroll() {
        const scrollPosition = window.pageYOffset;
        if (bgText) {
            bgText.style.transform = `translateX(${scrollPosition * -0.1}px)`;
        }
    }
    
    window.addEventListener('scroll', parallaxScroll);
}


// 初始化星級評分顯示
function initializeStarRatings() {
    document.querySelectorAll('.stars').forEach(starsContainer => {
        const rating = parseFloat(starsContainer.getAttribute('data-rating'));
        const stars = Array.from(starsContainer.querySelectorAll('i'));
        
        // 根據評分更新星級圖標
        stars.forEach((star, index) => {
            const position = index + 1;
            
            if (rating >= position) {
                // 全星
                star.className = 'fas fa-star';
            } else if (rating > position - 0.5 && rating < position) {
                // 半星
                star.className = 'fas fa-star-half-alt';
            } else {
                // 空星
                star.className = 'far fa-star';
            }
        });
    });
}

// 設置搜尋和過濾功能
function setupSearchAndFilters() {
    const filterItems = document.querySelectorAll('.filter-item');
    const searchBox = document.querySelector('.search-box');
    const courseItems = document.querySelectorAll('.course-item');
    
    // 組合過濾功能
    function filterCourses() {
        // 搜尋和過濾邏輯實現...
    }
    
    // 添加事件監聽器
    if (searchBox) {
        searchBox.addEventListener('input', filterCourses);
    }
    
    filterItems.forEach(item => {
        item.addEventListener('change', filterCourses);
    });
}

// 設置分頁
function setupPagination() {
    const pageButtons = document.querySelectorAll('.page-btn');
    const nextButton = document.querySelector('.page-next');
    
    // 添加頁面按鈕點擊事件
    pageButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除所有按鈕的活躍狀態
            pageButtons.forEach(btn => btn.classList.remove('active'));
            // 添加活躍狀態到被點擊的按鈕
            this.classList.add('active');
            
            // 滾動到頁面頂部
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
    
    // 下一頁按鈕功能
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            const activeButton = document.querySelector('.page-btn.active');
            if (activeButton) {
                const nextPageButton = activeButton.nextElementSibling;
                if (nextPageButton && nextPageButton.classList.contains('page-btn')) {
                    nextPageButton.click();
                }
            }
        });
    }
}

// 初始化其他交互元素
function initializeInteractions() {
    // 滾動時的統計數據動畫
    const statItems = document.querySelectorAll('.stat-item');
    
    if (statItems.length > 0) {
        // 當統計項目進入視窗時的動畫
        function animateStats() {
            statItems.forEach(item => {
                const position = item.getBoundingClientRect();
                
                // 如果統計項目在視窗內
                if (position.top < window.innerHeight && position.bottom >= 0) {
                    item.classList.add('animated');
                }
            });
        }
        
        // 添加動畫類到統計項目
        statItems.forEach(item => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        });
        
        // 檢查初始位置並在滾動時檢查
        animateStats();
        window.addEventListener('scroll', animateStats);
        
        // 稍有延遲後，動畫統計數據
        setTimeout(() => {
            statItems.forEach((item, index) => {
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 100);
            });
        }, 300);
    }
    
    // 圓形上傳按鈕點擊事件
    const commentBtn = document.getElementById('commentBtn');
    if (commentBtn) {
        commentBtn.addEventListener('click', function() {
            const modal = document.getElementById('commentModal');
            if (modal) {
                modal.style.display = 'flex';
            }
        });
    }
    
    // 創建評論按鈕點擊事件
    const createBtns = document.querySelectorAll('.create-btn');
    createBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const modal = document.getElementById('commentModal');
            if (modal) {
                modal.style.display = 'flex';
            }
        });
    });
}