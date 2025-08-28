//index
window.addEventListener('DOMContentLoaded', () => {
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
});


// //
// document.addEventListener("DOMContentLoaded", function () {
//     const eduSelect = document.getElementById("education-select");
//     const majorSelect = document.getElementById("major-select");
//     const gradeSelect = document.getElementById("grade-select");

//     const majorOptions = {
//         "five": [
//             "所有科系", "財政稅務系", "國際貿易系","企業管理系",
//              "資訊管理系", "財務金融系", "應用外語系", "會計資訊系", "體育"
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