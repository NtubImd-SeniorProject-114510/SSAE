function showLoader() {
    document.querySelector('.loader').style.display = 'grid';
    document.querySelector('.loader-overlay').style.display = 'block';
}

function hideLoader() {
    document.querySelector('.loader').style.display = 'none';
    document.querySelector('.loader-overlay').style.display = 'none';
}

// 頁面載入完成後自動隱藏
window.addEventListener('load', function() {
    hideLoader();
});
