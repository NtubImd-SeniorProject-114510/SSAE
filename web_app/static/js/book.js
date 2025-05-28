document.addEventListener('DOMContentLoaded', function() {
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
    
    // 中心上傳按鈕點擊事件
    const centerUploadBtn = document.getElementById('centerUploadBtn');
    if (centerUploadBtn) {
        centerUploadBtn.addEventListener('click', function() {
            const uploadForm = document.getElementById('uploadForm');
            if (uploadForm) {
                uploadForm.style.display = 'flex';
                // 鎖定背景滾動
                lockBodyScroll();
                // 初始化表單驗證
                validateRequiredFields();
            }
        });
    }
    
    // 初始化表單驗證
    validateRequiredFields();
    
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
    const uploadForm = document.getElementById('uploadForm');
    const closeFormBtn = document.getElementById('closeFormBtn');
    const imagePreview = document.getElementById('imagePreview');
    const imageUpload = document.getElementById('imageUpload');
    const previewImage = document.getElementById('previewImage');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    const submitBtn = document.getElementById('submitBtn');
    
    // 關閉上傳表單
    closeFormBtn.addEventListener('click', function() {
        uploadForm.style.display = 'none';
        // 解鎖背景滾動
        unlockBodyScroll();
    });
    
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
        // 獲取所有表單值
        const bookTitle = document.getElementById('bookTitle').value;
        const department = document.getElementById('department').value;
        const grade = document.getElementById('grade').value;
        const bookType = document.getElementById('bookType').value;
        const price = document.getElementById('price').value;
        const condition = document.getElementById('condition').value;
        const bookDescription = document.getElementById('bookDescription').value;
        const transactionMethods = document.querySelectorAll('input[name="transactionMethod"]:checked');
        
        // 驗證必填欄位
        const bookTitleError = document.getElementById('bookTitleError');
        const priceError = document.getElementById('priceError');
        const transactionMethodError = document.getElementById('transactionMethodError');
        
        // 顯示錯誤訊息，只在點擊上傳按鈕後顯示
        if (bookTitle.trim() === '') {
            bookTitleError.style.display = 'block';
        }
        
        if (price.trim() === '') {
            priceError.style.display = 'block';
        }
        
        if (transactionMethods.length === 0) {
            transactionMethodError.style.display = 'block';
        }
        
        // 如果有錯誤，不繼續提交
        if (bookTitle.trim() === '' || price.trim() === '' || transactionMethods.length === 0) {
            return;
        }
        
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
    
    // 模擬添加新卡片的函數 (未使用)
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
});
