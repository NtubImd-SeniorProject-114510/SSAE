// book.js
// 📚 書籍交易系統前端功能腳本
// 包含：彈窗顯示、背景滾動效果、篩選功能、書籍卡片效果、表單驗證與上傳功能、圖片預覽與拖放、SVG 對齊等

window.addEventListener('DOMContentLoaded', () => {

    /* -------------------------
       1. 頁面載入後處理彈窗顯示
    ------------------------- */
    const popupId = sessionStorage.getItem('openPopup');
    if (popupId) {
        const popup = document.getElementById(popupId);
        if (popup) {
            popup.classList.add('show-popup');
            console.log(`開啟彈窗: ${popupId}`);
        } else {
            console.warn(`找不到彈窗 ID: ${popupId}`);
        }
        sessionStorage.removeItem('openPopup'); // 清除暫存，避免下次重複
    }

    /* -------------------------
       2. 上傳表單彈窗控制
    ------------------------- */
    const centerUploadBtn = document.getElementById('centerUploadBtn'); // 中央上傳按鈕
    const uploadFormModal = document.getElementById('uploadForm');     // 上傳表單彈窗
    const uploadFormEl = document.querySelector('#uploadForm form');   // 上傳表單本體

    if (centerUploadBtn && uploadFormModal) {
        centerUploadBtn.addEventListener('click', function() {
            uploadFormModal.classList.add('show'); // 顯示表單
            document.body.style.overflow = 'hidden'; // 鎖定背景捲動
            document.body.style.height = '100%';
        });
    }

    // 關閉表單（右上角 × 按鈕）
    const closeFormBtn = document.getElementById('closeFormBtn');
    if (closeFormBtn && uploadFormEl) {
        closeFormBtn.addEventListener('click', function() {
            uploadFormEl.classList.remove('show');
            unlockBodyScroll();
        });
    }

    /* -------------------------
       3. 背景文字隨滾動移動效果
    ------------------------- */
    const bgText = document.querySelector('.bg-text');
    if (bgText) {
        window.addEventListener('scroll', function() {
            const scrollPosition = window.scrollY;
            const moveX = scrollPosition * 0.3; // 控制移動速度
            bgText.style.transform = `translateX(-${moveX}px)`;
        });
    }

    /* -------------------------
       4. 鎖定/解鎖背景捲動
    ------------------------- */
    function lockBodyScroll() {
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100%';
    }

    function unlockBodyScroll() {
        document.body.style.overflow = '';
        document.body.style.height = '';
    }

    /* -------------------------
       5. 篩選功能（書籍分類）
    ------------------------- */
    const filterItems = document.querySelectorAll('.filter-item');
    filterItems.forEach(item => {
        item.addEventListener('click', function() {
            // 移除舊的 active 樣式
            filterItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active'); // 新選擇項目加上 active

            // TODO: 實際篩選邏輯，這裡僅模擬動畫
            console.log('篩選類型:', this.textContent);

            const bookCards = document.querySelectorAll('.book-card');
            bookCards.forEach(card => {
                card.style.opacity = '0.6';
                card.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'scale(1)';
                }, 300);
            });
        });
    });

    /* -------------------------
       6. 書籍卡片點擊效果
    ------------------------- */
    const bookCards = document.querySelectorAll('.book-card');
    bookCards.forEach(card => {
        card.addEventListener('click', function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
                console.log('查看書籍:', this.querySelector('.book-title').textContent);
                // TODO: 書籍詳情頁導航
            }, 150);
        });
    });

    /* -------------------------
       7. 上傳表單提交處理
    ------------------------- */
    const imagePreview = document.getElementById('imagePreview');
    const imageUpload = document.getElementById('imageUpload');
    const previewImage = document.getElementById('previewImage');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    const submitBtn = document.getElementById('submitBtn');

    if (uploadFormEl) {
        uploadFormEl.addEventListener('submit', async (e) => {
            e.preventDefault(); // 防止頁面跳轉
            showBookMsg('上傳中...', true);
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '上傳中...'; }

            try {
                // 收集表單資料
                const fd = new FormData(uploadFormEl);
                const resp = await fetch(uploadFormEl.action, {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRFToken': getCookie('csrftoken'),
                    },
                    body: fd,
                    credentials: 'same-origin',
                });

                let data = {};
                try { data = await resp.json(); } catch (e) {}

                if (resp.ok && data && data.success) {
                    // ✅ 成功
                    showBookMsg(data.message || '書籍上架成功！', true);
                    uploadFormEl.reset();
                    if (previewImage && previewPlaceholder) {
                        previewImage.src = '';
                        previewImage.style.display = 'none';
                        previewPlaceholder.style.display = 'block';
                    }
                    setTimeout(() => {
                        uploadFormModal.classList.remove('show');
                        unlockBodyScroll();
                        location.reload();
                    }, 500);
                } else {
                    // ❌ 失敗
                    const msg = (data && (data.message ||
                                (data.errors && JSON.stringify(data.errors)))) ||
                                '上傳失敗，請檢查欄位內容';
                    showBookMsg(msg, false);
                }
            } catch (err) {
                console.error('[upload_book2] error:', err);
                showBookMsg('網路或系統錯誤，請稍後再試', false);
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '上傳書籍'; }
            }
        });
    }

    /* -------------------------
       8. 圖片上傳預覽與拖放
    ------------------------- */
    // 點擊圖片預覽框 → 開啟檔案選擇
    imagePreview.addEventListener('click', function() {
        imageUpload.click();
    });

    // 選擇圖片後顯示預覽
    imageUpload.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                previewImage.style.display = 'block';
                previewPlaceholder.style.display = 'none';
            }
            reader.readAsDataURL(this.files[0]);
        }
    });

    // 拖放上傳功能
    const previewContainer = document.querySelector('.preview-container');
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        previewContainer.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        previewContainer.addEventListener(eventName, highlight, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        previewContainer.addEventListener(eventName, unhighlight, false);
    });

    function highlight() { previewContainer.classList.add('highlight'); }
    function unhighlight() { previewContainer.classList.remove('highlight'); }

    // 拖放圖片 → 自動觸發 change 事件
    previewContainer.addEventListener('drop', handleDrop, false);
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length) {
            imageUpload.files = files;
            const event = new Event('change');
            imageUpload.dispatchEvent(event);
        }
    }

    /* -------------------------
       9. 表單驗證功能
    ------------------------- */
    function validateForm(bookTitle, department, grade, bookType, price, condition, transactionMethods) {
        if (!imageUpload.files[0]) {
            alert('請上傳書籍圖片！');
            return false;
        }
        if (!department) {
            alert('請選擇系所！');
            return false;
        }
        if (!grade) {
            alert('請選擇年級！');
            return false;
        }
        if (!bookType) {
            alert('請選擇書籍類型！');
            return false;
        }
        if (!condition) {
            alert('請選擇書籍狀況！');
            return false;
        }
        return true;
    }

    /* -------------------------
       10. 重置表單
    ------------------------- */
    function resetForm() {
        document.getElementById('bookTitle').value = '';
        document.getElementById('department').selectedIndex = 0;
        document.getElementById('grade').selectedIndex = 0;
        document.getElementById('bookType').selectedIndex = 0;
        document.getElementById('price').value = '';
        document.getElementById('condition').selectedIndex = 0;
        document.getElementById('bookDescription').value = '';
        document.querySelectorAll('input[name="transactionMethod"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        imageUpload.value = '';
        previewImage.src = '';
        previewImage.style.display = 'none';
        previewPlaceholder.style.display = 'block';
    }

    /* -------------------------
       11. 模擬新增書籍卡片
    ------------------------- */
    function addNewBookCard(bookTitle, bookDescription, bookType) {
        const booksGrid = document.querySelector('.books-grid');
        const newCard = document.createElement('div');
        newCard.classList.add('book-card');
        newCard.innerHTML = `
            <div class="book-image">
                <img src="/api/placeholder/400/320" alt="${bookTitle}" class="book-cover">
            </div>
            <h3 class="book-title">${bookTitle}</h3>
            <p class="book-description">${bookDescription}</p>
            <div class="tag-container">
                <span class="tag">#${bookType}</span>
            </div>
        `;
        booksGrid.prepend(newCard);
    }

    /* -------------------------
       12. SVG 路徑與按鈕對齊
    ------------------------- */
    alignSvgPathWithUploadButton();
    function alignSvgPathWithUploadButton() {
        const svgPath = document.getElementById('curve');
        const uploadBtn = document.getElementById('uploadBtn');
        if (!svgPath || !uploadBtn) return;

        const svg = svgPath.closest('svg');
        if (!svg) return;

        // 創建參考點（圓形）
        const centerPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        centerPoint.setAttribute('cx', '50');
        centerPoint.setAttribute('cy', '50');
        centerPoint.setAttribute('r', '2');
        centerPoint.setAttribute('fill', 'transparent');
        centerPoint.setAttribute('id', 'centerPoint');
        svg.appendChild(centerPoint);

        window.addEventListener('resize', updateAlignment);
        updateAlignment();

        function updateAlignment() {
            const newPathD = `M 50 50 m -40 0 a 40 40 0 1 1 80 0 a 40 40 0 1 1 -80 0`;
            svgPath.setAttribute('d', newPathD);
            const textPath = document.querySelector('textPath');
            if (textPath) {
                textPath.setAttribute('textLength', '250');
            }
        }
    }
});
