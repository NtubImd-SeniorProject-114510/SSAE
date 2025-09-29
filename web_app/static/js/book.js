//book.js
window.addEventListener('DOMContentLoaded', () => {
    const popupId = sessionStorage.getItem('openPopup');
    if (popupId) {
        const popup = document.getElementById(popupId);
        if (popup) {
            popup.classList.add('show-popup');
            console.log(`開啟彈窗: ${popupId}`);
        } else {
            console.warn(`找不到彈窗 ID: ${popupId}`);
        }
        sessionStorage.removeItem('openPopup');
    }

    // 修正：將＋按鈕事件註冊放在這裡，確保元素都已渲染
    const centerUploadBtn = document.getElementById('centerUploadBtn');
    const uploadFormModal = document.getElementById('uploadForm');
    const uploadFormEl = document.querySelector('#uploadForm form');
    if (centerUploadBtn && uploadFormModal) {
        centerUploadBtn.addEventListener('click', function() {
            uploadFormModal.classList.add('show');
            document.body.style.overflow = 'hidden';
            document.body.style.height = '100%';
        });
    }

    // 確俞SVG路徑和上傳按鈕中心點對齊
    alignSvgPathWithUploadButton();

    // 背景文字隨滾動移動
    const bgText = document.querySelector('.bg-text');
    if (bgText) {
        window.addEventListener('scroll', function() {
            const scrollPosition = window.scrollY;
            const moveX = scrollPosition * 0.3; // 控制移動速度
            bgText.style.transform = `translateX(-${moveX}px)`;
        });
    }

    // 鎖定背景滾動功能
    function lockBodyScroll() {
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100%';
    }

    function unlockBodyScroll() {
        document.body.style.overflow = '';
        document.body.style.height = '';
    }

    // 篩選標籤點擊效果
    const filterItems = document.querySelectorAll('.filter-item');

    filterItems.forEach(item => {
        item.addEventListener('click', function() {
            // 移除所有active類
            filterItems.forEach(i => i.classList.remove('active'));
            // 添加當前點擊項目的active類
            this.classList.add('active');
            
            // 這裡可以添加實際篩選功能
            const filterType = this.textContent;
            console.log('篩選類型:', filterType);
            
            // 模擬篩選效果
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
    
    // 書籍卡片點擊效果
    const bookCards = document.querySelectorAll('.book-card');
    bookCards.forEach(card => {
        card.addEventListener('click', function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
                // 這裡可以添加點擊後的導航邏輯
                console.log('查看書籍:', this.querySelector('.book-title').textContent);
            }, 150);
        });
    });
    
    // 上傳功能相關
    const closeFormBtn = document.getElementById('closeFormBtn');
    const imagePreview = document.getElementById('imagePreview');
    const imageUpload = document.getElementById('imageUpload');
    const previewImage = document.getElementById('previewImage');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    const submitBtn = document.getElementById('submitBtn');
    // 上傳表單 submit 攔截
    if (uploadFormEl) {
        uploadFormEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            showBookMsg('上傳中...', true);
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '上傳中...'; }

            try {
            const fd = new FormData(uploadFormEl);  // 自動包含檔案與所有欄位
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
                document.body.style.overflow = '';
                document.body.style.height   = '';
                location.reload();
                }, 500);
            } else {
                // ❌ 失敗（包含禁用詞）
                const msg = (data && (data.message ||
                        (data.errors && JSON.stringify(data.errors)))) ||
                        '上傳失敗，請檢查欄位內容';
                showBookMsg(msg, false);   // 🔴 在表單上方顯示紅字
            }
            } catch (err) {
            console.error('[upload_book2] error:', err);
            showBookMsg('網路或系統錯誤，請稍後再試', false);
            } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '上傳書籍'; }
            }
        });
        }
    // 關閉上傳表單
    if (closeFormBtn && uploadFormEl) {
        closeFormBtn.addEventListener('click', function() {
            uploadFormEl.classList.remove('show');
            unlockBodyScroll();
        });
    }

    
    // 點擊預覽區域觸發文件選擇
    imagePreview.addEventListener('click', function() {
        imageUpload.click();
    });
    
    // 圖片上傳預覽
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
    
    // 拖放功能
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
    
    function highlight() {
        previewContainer.classList.add('highlight');
    }
    
    function unhighlight() {
        previewContainer.classList.remove('highlight');
    }
    
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
    
    // 驗證必填欄位
    function validateRequiredFields() {
        const bookTitleInput = document.getElementById('bookTitle');
        const priceInput = document.getElementById('price');
        const faceToFaceCheckbox = document.getElementById('faceToFace');
        const shippingCheckbox = document.getElementById('shipping');
        const submitBtn = document.getElementById('submitBtn');
        const bookTitleError = document.getElementById('bookTitleError');
        const priceError = document.getElementById('priceError');
        const transactionMethodError = document.getElementById('transactionMethodError');
        
        // 初始化時隱藏所有錯誤訊息
        bookTitleError.style.display = 'none';
        priceError.style.display = 'none';
        transactionMethodError.style.display = 'none';
        
        // 檢查必填欄位是否填寫
        function checkRequiredFields() {
            const bookTitleValid = bookTitleInput.value.trim() !== '';
            const priceValid = priceInput.value.trim() !== '';
            const transactionMethodValid = faceToFaceCheckbox.checked || shippingCheckbox.checked;
            
            // 只在表單驗證時才顯示錯誤訊息，不在實時顯示
            return bookTitleValid && priceValid && transactionMethodValid;
        }
        
        // 監聽輸入欄位變化但不顯示錯誤訊息
        bookTitleInput.addEventListener('input', function() {
            // 如果有值則隱藏錯誤訊息
            if (bookTitleInput.value.trim() !== '') {
                bookTitleError.style.display = 'none';
            }
        });
        
        priceInput.addEventListener('input', function() {
            if (priceInput.value.trim() !== '') {
                priceError.style.display = 'none';
            }
        });
        
        function checkTransactionMethod() {
            if (faceToFaceCheckbox.checked || shippingCheckbox.checked) {
                transactionMethodError.style.display = 'none';
            }
        }
        
        faceToFaceCheckbox.addEventListener('change', checkTransactionMethod);
        shippingCheckbox.addEventListener('change', checkTransactionMethod);
        
        return checkRequiredFields;
    }
    
    // 初始化驗證函數
    const checkRequiredFields = validateRequiredFields();
    
    // 提交按鈕點擊事件
    submitBtn.addEventListener('click', function() {
        // 其它提交行為（如表單驗證）
        // ...
        // 點擊提交時也可呼叫 filterBooks 以確保顯示正確
        function filterBooks() {
            const searchTerm = searchInput.value.toLowerCase();
            const department = departmentFilter.value;
            const grade = gradeFilter.value;
            const condition = conditionFilter.value;
            const priceRange = priceFilter.value;
            const academic = document.getElementById('academicFilter').value;
            const category = document.getElementById('categoryFilter').value;

            const bookCards = document.querySelectorAll('.book-card');

            bookCards.forEach(card => {
                const title = card.querySelector('.book-header').textContent.toLowerCase();
                const dept = card.querySelector('.book-department').textContent;
                const bookGrade = card.querySelector('.book-grade').textContent;
                const bookCondition = card.querySelector('.book-condition').textContent;
                const price = parseInt(card.querySelector('.book-price').textContent.replace('$', ''));
                const bookAcademic = card.querySelector('.book-academic').textContent;
                const bookCategory = card.querySelector('.book-category') ? card.querySelector('.book-category').getAttribute('data-id') : '';

                const matchesSearch = title.includes(searchTerm) || searchTerm === '';
                const matchesDept = !department || dept === department;
                const matchesGrade = !grade || bookGrade === grade;
                const matchesCondition = !condition || bookCondition === condition;
                const matchesAcademic = !academic || bookAcademic === academic;
                const matchesCategory = !category || bookCategory === category;

                let matchesPrice = true;
                if (priceRange) {
                    const [min, max] = priceRange.split('-').map(Number);
                    matchesPrice = price >= min && price <= max;
                }

                if (matchesSearch && matchesDept && matchesGrade && matchesCondition && matchesPrice && matchesAcademic && matchesCategory) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }
        filterBooks();
    });
        
        // 其他表單驗證
        if (!validateForm(bookTitle, department, grade, bookType, price, condition, transactionMethods)) {
            return;
        }
        
        // 顯示加載狀態
        submitBtn.textContent = '上傳中...';
        submitBtn.disabled = true;
        
        // 收集交易方式
        const selectedMethods = [];
        transactionMethods.forEach(method => {
            selectedMethods.push(method.value);
        });
        
        // 準備表單數據
        const formData = new FormData();
        formData.append('bookTitle', bookTitle);
        formData.append('department', department);
        formData.append('grade', grade);
        formData.append('bookType', bookType);
        formData.append('price', price);
        formData.append('condition', condition);
        formData.append('bookDescription', bookDescription);
        
        // 添加交易方式
        selectedMethods.forEach(method => {
            formData.append('transactionMethod', method);
        });
        
        // 添加圖片
        if (imageUpload.files[0]) {
            formData.append('bookImage', imageUpload.files[0]);
        }
        
        // 添加CSRF令牌
        const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        
        // 發送AJAX請求
        fetch('/upload_book/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': csrftoken
            },
            credentials: 'same-origin'
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert(data.message);
                uploadForm.style.display = 'none';
                
                // 重置表單
                resetForm();
                
                // 刷新頁面以顯示新上傳的書籍
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                alert(data.message || '上傳失敗，請稍後再試');
                submitBtn.textContent = '上傳書籍';
                submitBtn.disabled = false;
            }
        })
        .catch(error => {
            console.error('上傳錯誤:', error);
            alert('上傳失敗，請稍後再試');
            submitBtn.textContent = '上傳書籍';
            submitBtn.disabled = false;
        });
    });
    
    // 表單驗證函數
    function validateForm(bookTitle, department, grade, bookType, price, condition, transactionMethods) {
        // 必填欄位已在提交按鈕點擊事件中驗證
        
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
    
    // 重置表單函數
    function resetForm() {
        document.getElementById('bookTitle').value = '';
        document.getElementById('department').selectedIndex = 0;
        document.getElementById('grade').selectedIndex = 0;
        document.getElementById('bookType').selectedIndex = 0;
        document.getElementById('price').value = '';
        document.getElementById('condition').selectedIndex = 0;
        document.getElementById('bookDescription').value = '';
        
        // 重置交易方式
        document.querySelectorAll('input[name="transactionMethod"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // 重置圖片
        imageUpload.value = '';
        previewImage.src = '';
        previewImage.style.display = 'none';
        previewPlaceholder.style.display = 'block';
    }
    
    // 模擬添加新卡片的函數
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
    
    // 上傳按鈕點擊事件
    uploadBtn.addEventListener('click', function() {
        uploadForm.style.display = 'flex';
    });
    
    // 添加SVG路徑和上傳按鈕中心點對齊的功能
    function alignSvgPathWithUploadButton() {
        const svgPath = document.getElementById('curve');
        const uploadBtn = document.getElementById('uploadBtn');
        
        if (!svgPath || !uploadBtn) return;
        
        // 獲取SVG元素
        const svg = svgPath.closest('svg');
        if (!svg) return;
        
        // 創建一個新的圓形元素作為參考點
        const centerPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        centerPoint.setAttribute('cx', '50');
        centerPoint.setAttribute('cy', '50');
        centerPoint.setAttribute('r', '2');
        centerPoint.setAttribute('fill', 'transparent');
        centerPoint.setAttribute('id', 'centerPoint');
        svg.appendChild(centerPoint);
        
        // 監聽窗口大小變化，確保對齊
        window.addEventListener('resize', updateAlignment);
        
        // 初始對齊
        updateAlignment();
        
        function updateAlignment() {
            // 獲取SVG中心點的位置
            const svgRect = svg.getBoundingClientRect();
            const svgCenterX = svgRect.left + svgRect.width / 2;
            const svgCenterY = svgRect.top + svgRect.height / 2;
            
            // 獲取上傳按鈕的位置
            const btnRect = uploadBtn.getBoundingClientRect();
            const btnCenterX = btnRect.left + btnRect.width / 2;
            const btnCenterY = btnRect.top + btnRect.height / 2;
            
            // 計算SVG路徑需要的調整
            const pathD = svgPath.getAttribute('d');
            const newPathD = `M 50 50 m -40 0 a 40 40 0 1 1 80 0 a 40 40 0 1 1 -80 0`;
            svgPath.setAttribute('d', newPathD);
            
            // 更新文字路徑的長度，確保文字正確顯示
            const textPath = document.querySelector('textPath');
            if (textPath) {
                textPath.setAttribute('textLength', '250');
            }
        }
    }