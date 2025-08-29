//web_app\static\js\join.js
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

// join.js - 清理版本，專注於頁面特定功能

document.addEventListener('DOMContentLoaded', function() {
    console.log('join.js 已載入');
    
    // 初始化頁面功能
    sortActivitiesByStatus(); // 首先排序活動
    initializeScrollAnimations();
    initializeParallax();
    initializeRandomClouds();
    initializeActivityCards();
});

// 新增：按照活動狀態排序功能
function sortActivitiesByStatus() {
    const activityGrid = document.querySelector('.activity-grid');
    if (!activityGrid) return;
    
    const activityCards = Array.from(activityGrid.querySelectorAll('.activity-card'));
    
    // 按狀態排序：正常活動在前，已截止/額滿的在後
    const sortedCards = activityCards.sort((a, b) => {
        const aIsDisabled = isActivityDisabled(a);
        const bIsDisabled = isActivityDisabled(b);
        
        // 如果 a 是禁用的而 b 不是，a 排在後面
        if (aIsDisabled && !bIsDisabled) return 1;
        // 如果 b 是禁用的而 a 不是，a 排在前面
        if (!aIsDisabled && bIsDisabled) return -1;
        // 如果狀態相同，保持原順序
        return 0;
    });
    
    // 清空容器並重新添加排序後的卡片
    activityGrid.innerHTML = '';
    sortedCards.forEach(card => {
        activityGrid.appendChild(card);
    });
    
    console.log('活動已按狀態重新排序');
}

// 檢查活動是否已截止或額滿
function isActivityDisabled(activityCard) {
    const joinBtn = activityCard.querySelector('.join-btn');
    if (!joinBtn) return false;
    
    // 檢查按鈕是否有 disabled class 或包含特定文字
    const isDisabled = joinBtn.classList.contains('disabled');
    const buttonText = joinBtn.textContent.trim();
    const isDeadlineOrFull = buttonText.includes('已額滿') || 
                            buttonText.includes('截止') || 
                            buttonText.includes('無法參加');
    
    return isDisabled || isDeadlineOrFull;
}

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

// 初始化活動卡片功能
function initializeActivityCards() {
    // 獲取所有活動卡片
    const activityCards = document.querySelectorAll('.activity-card');
    
    // 為每個活動卡片添加點擊事件監聽器
    activityCards.forEach(function(card) {
        card.style.cursor = 'pointer'; // 添加手型游標，提示可點擊
        
        // 確保卡片點擊功能正常
        card.addEventListener('click', function(e) {
            // 如果點擊的是 "我要參加" 按鈕，不執行卡片點擊
            if (e.target.closest('.join-btn')) {
                return;
            }
            
            // 獲取跳轉 URL（如果有設定 onclick）
            const clickHandler = this.getAttribute('onclick');
            if (clickHandler) {
                // 執行原本的 onclick 邏輯
                eval(clickHandler);
            }
        });
    });
    
    // 防止"我要參加"按鈕冒泡事件
    const joinButtons = document.querySelectorAll('.join-btn');
    joinButtons.forEach(function(button) {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); // 阻止事件冒泡
            console.log('參加活動:', this.href);
        });
    });
}

// 過濾功能
function initializeFilters() {
    const filterItems = document.querySelectorAll('.filter-item');
    const searchBox = document.querySelector('.search-box');
    const activityCards = document.querySelectorAll('.activity-card');
    
    // 過濾器事件監聽
    filterItems.forEach(filter => {
        filter.addEventListener('change', applyFilters);
    });
    
    // 搜尋框事件監聽
    if (searchBox) {
        searchBox.addEventListener('input', applyFilters);
    }
    
    function applyFilters() {
        const searchTerm = searchBox ? searchBox.value.toLowerCase() : '';
        
        activityCards.forEach(card => {
            const title = card.querySelector('.activity-title')?.textContent.toLowerCase() || '';
            const description = card.querySelector('.activity-description')?.textContent.toLowerCase() || '';
            const location = card.querySelector('.activity-location')?.textContent.toLowerCase() || '';
            
            // 檢查是否符合搜尋條件
            const matchesSearch = !searchTerm || 
                title.includes(searchTerm) || 
                description.includes(searchTerm) || 
                location.includes(searchTerm);
            
            // 顯示或隱藏卡片
            if (matchesSearch) {
                card.style.display = 'block';
                // 重新觸發動畫
                setTimeout(() => {
                    card.classList.add('visible');
                }, 100);
            } else {
                card.style.display = 'none';
                card.classList.remove('visible');
            }
        });
    }
}

// 工具函數：獲取活動資料
function getActivityData(card) {
    return {
        title: card.querySelector('.activity-title')?.textContent || '',
        description: card.querySelector('.activity-description')?.textContent || '',
        location: card.querySelector('.activity-location span:last-child')?.textContent || '',
        time: card.querySelector('.activity-time span:last-child')?.textContent || '',
        participants: card.querySelector('.participant-count')?.textContent || '',
        type: card.querySelector('.activity-tag')?.textContent || ''
    };
}

// 初始化過濾功能（如果需要的話）
// initializeFilters();

// static/js/join.js 末尾或合適位置新增：
document.addEventListener('click', async (e)=>{
  const form = e.target.closest('form.inline-form');
  if (!form) return;
  e.preventDefault();
  const url = form.action;
  const btn = form.querySelector('button.join-btn');
  try {
    const res = await fetch(url, {method:'POST', headers:{'X-Requested-With':'XMLHttpRequest','X-CSRFToken': getCookie('csrftoken')}});
    const data = await res.json();
    if (data.ok) {
      // 根據 action 切換文案
      if (url.includes('/join/')) {
        btn.textContent = '取消參加';
        form.action = form.action.replace('/join/','/cancel/');
      } else {
        btn.textContent = '我要參加';
        form.action = form.action.replace('/cancel/','/join/');
      }
      // 更新人數（選到同卡片內的 .participant-count）
      const card = form.closest('.activity-card');
      const countEl = card?.querySelector('.participant-count');
      if (countEl && Number.isInteger(data.participants)) {
        // 右側顯示格式：current/max人
        const max = countEl.textContent.split('/')[1];
        countEl.textContent = `${data.participants}/${max}`;
      }
      
      // 活動狀態可能改變後，重新排序
      setTimeout(() => {
        sortActivitiesByStatus();
      }, 100);
      
    } else {
      alert('操作失敗');
    }
  } catch(err){
    console.error(err);
    form.submit(); // 退路：改用傳統提交
  }
});

function getCookie(name) {
  const value = document.cookie.split('; ').find(row=>row.startsWith(name+'='));
  return value ? decodeURIComponent(value.split('=')[1]) : '';
}