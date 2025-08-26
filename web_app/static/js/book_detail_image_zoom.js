// 書籍詳情頁：點擊圖片放大預覽
// 需搭配 book_detail.html 及 book_detail.css

document.addEventListener('DOMContentLoaded', function() {
    const img = document.querySelector('.book-image-container img.book-image');
    if (!img) return;

    // 建立放大遮罩
    let overlay = document.createElement('div');
    overlay.className = 'image-zoom-overlay';
    overlay.innerHTML = `
        <div class="zoom-img-wrapper">
            <img src="${img.src}" alt="book zoom" class="zoom-img">
        </div>
    `;
    overlay.style.display = 'none';
    document.body.appendChild(overlay);

    // 滑鼠移入顯示放大
    img.addEventListener('mouseenter', function() {
        overlay.querySelector('img.zoom-img').src = img.src;
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });
    // 滑鼠移出關閉放大
    img.addEventListener('mouseleave', function() {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    });
    // 滑鼠移出 overlay 也關閉
    overlay.addEventListener('mouseleave', function() {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    });
});
