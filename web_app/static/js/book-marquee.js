// 二手書卡片跑馬燈效果和顏色設定
document.addEventListener('DOMContentLoaded', function() {
    initBookConditionColors();
    initBookMetaMarquee();
});

// 初始化書籍狀態顏色
function initBookConditionColors() {
    const conditionTags = document.querySelectorAll('.book-meta-tag.book-condition');
    
    conditionTags.forEach(tag => {
        const text = tag.textContent.trim();
        
        // 根據文字內容添加對應的顏色類別
        if (text.includes('全新')) {
            tag.classList.add('condition-new');
        } else if (text.includes('良好')) {
            tag.classList.add('condition-good');
        } else if (text.includes('尚可')) {
            tag.classList.add('condition-fair');
        }
    });
}

function initBookMetaMarquee() {
    const bookMetaElements = document.querySelectorAll('.book-meta');
    
    bookMetaElements.forEach(meta => {
        // 檢查內容是否超出容器寬度
        if (meta.scrollWidth > meta.clientWidth) {
            // 創建跑馬燈容器
            const marqueeContainer = document.createElement('div');
            marqueeContainer.className = 'book-meta-marquee';
            
            // 複製原始內容
            const originalContent = meta.innerHTML;
            
            // 創建兩份內容用於無縫循環
            marqueeContainer.innerHTML = originalContent + ' • ' + originalContent;
            
            // 清空原始容器並添加跑馬燈容器
            meta.innerHTML = '';
            meta.appendChild(marqueeContainer);
            
            // 添加跑馬燈標記
            meta.classList.add('has-marquee');
        }
    });
}

// 如果頁面動態添加了新的書籍卡片，可以調用這個函數
function refreshBookMetaMarquee() {
    // 重設所有已有的跑馬燈
    const existingMarquees = document.querySelectorAll('.book-meta.has-marquee');
    existingMarquees.forEach(meta => {
        meta.classList.remove('has-marquee');
        const marqueeContainer = meta.querySelector('.book-meta-marquee');
        if (marqueeContainer) {
            const content = marqueeContainer.innerHTML.split(' • ')[0]; // 取第一份內容
            meta.innerHTML = content;
        }
    });
    
    // 重新初始化顏色和跑馬燈
    initBookConditionColors();
    initBookMetaMarquee();
}

// 導出函數供其他腳本使用
window.bookMarquee = {
    init: initBookMetaMarquee,
    refresh: refreshBookMetaMarquee,
    initColors: initBookConditionColors
};
