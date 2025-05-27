// add_comment.js - 整合版本

document.addEventListener('DOMContentLoaded', function() {
    console.log('add_comment.js 已載入');
    
    // 初始化所有功能
    initializeUserInterface();
    initializeRatingSystem();
    initializeTextConversion();
    initializeFormValidation();
});

// 初始化用戶界面功能
function initializeUserInterface() {
    // 注意：根據HTML，anonymous_yes對應匿名，anonymous_no對應實名
    const anonymousRadio = document.getElementById('anonymous_yes');  // 匿名選項
    const realNameRadio = document.getElementById('anonymous_no');    // 實名選項
    const usernameElement = document.querySelector('.username');
    const avatarElement = document.querySelector('.avatar');
    
    // 檢查元素是否存在
    if (!anonymousRadio || !realNameRadio || !usernameElement || !avatarElement) {
        console.error('找不到必要的用戶界面元素');
        console.log('anonymousRadio:', anonymousRadio);
        console.log('realNameRadio:', realNameRadio);
        console.log('usernameElement:', usernameElement);
        console.log('avatarElement:', avatarElement);
        return;
    }
    
    // 設定固定的用戶名和頭像路徑
    const realName = '實名用戶';  // 您可以根據需要修改這個名稱
    const anonymousName = '匿名';
    const realNameAvatarPath = '/static/image/lay.png';
    const anonymousAvatarPath = '/static/image/anonymous.png';
    
    console.log('實名用戶名:', realName);
    console.log('實名頭像路徑:', realNameAvatarPath);
    console.log('匿名頭像路徑:', anonymousAvatarPath);
    
    // Handle anonymous selection (anonymous_yes = 匿名)
    anonymousRadio.addEventListener('change', function() {
        console.log('選擇匿名:', this.checked);
        if (this.checked) {
            usernameElement.textContent = anonymousName;
            avatarElement.src = anonymousAvatarPath;
            console.log('已切換到匿名模式');
            console.log('當前頭像路徑:', avatarElement.src);
        }
    });
    
    // Handle real name selection (anonymous_no = 實名)  
    realNameRadio.addEventListener('change', function() {
        console.log('選擇實名:', this.checked);
        if (this.checked) {
            usernameElement.textContent = realName;
            avatarElement.src = realNameAvatarPath;
            console.log('已切換到實名模式');
            console.log('當前頭像路徑:', avatarElement.src);
        }
    });
    
    // 設置初始狀態 - 根據HTML，默認選中匿名 (anonymous_yes checked)
    if (anonymousRadio.checked) {
        usernameElement.textContent = anonymousName;
        avatarElement.src = anonymousAvatarPath;
        console.log('初始化為匿名模式');
        console.log('初始頭像路徑:', avatarElement.src);
    } else if (realNameRadio.checked) {
        usernameElement.textContent = realName;
        avatarElement.src = realNameAvatarPath;
        console.log('初始化為實名模式');
        console.log('初始頭像路徑:', avatarElement.src);
    }
}

// 初始化星級評分系統
function initializeRatingSystem() {
    const starsContainer = document.getElementById('rating-stars');
    if (!starsContainer) return;
    
    const stars = Array.from(starsContainer.querySelectorAll('i'));
    const ratingInput = document.getElementById('rating-input');
    const ratingText = starsContainer.querySelector('.rating-text');
    
    // Set initial rating to 1 by default
    let currentRating = 1;
    if (ratingInput) ratingInput.value = '1';
    updateStars(currentRating);
    
    // Click to set rating
    starsContainer.addEventListener('click', (e) => {
        if (e.target.matches('i')) {
            const star = e.target;
            const newRating = parseInt(star.getAttribute('data-rating'));
            
            // 設置為新的評分值
            currentRating = Math.min(5, Math.max(1, newRating)); // 確保最小評分為1
            
            updateStars(currentRating);
            if (ratingInput) ratingInput.value = currentRating;
            if (ratingText) ratingText.textContent = `${currentRating}/5.0`;
        }
    });
    
    // Hover effect for better user experience
    stars.forEach(star => {
        star.addEventListener('mouseenter', function() {
            const hoverRating = parseInt(this.getAttribute('data-rating'));
            updateStars(hoverRating, false); // Don't update input on hover
        });
    });
    
    // Reset to current rating when mouse leaves
    starsContainer.addEventListener('mouseleave', function() {
        updateStars(currentRating);
    });
    
    function updateStars(rating, updateText = true) {
        // Ensure rating is at least 1
        if (rating < 1) rating = 1;
        
        stars.forEach((star, index) => {
            const starRating = index + 1; // 1, 2, 3, 4, 5
            
            if (rating >= starRating) {
                // Full star
                star.className = 'fa-solid fa-star';
            } else {
                // Empty star
                star.className = 'fa-regular fa-star';
            }
        });
        
        // Update rating text
        if (updateText && ratingText) {
            ratingText.textContent = `${rating}/5.0`;
        }
    }
}

// 初始化文字轉換功能
function initializeTextConversion() {
    const commentTextarea = document.getElementById('comment_text');
    const previewTextarea = document.getElementById('preview_text');
    const convertBtn = document.getElementById('convert_btn');
    
    // Make sure preview is initially empty
    previewTextarea.value = '';
    
    // Handle convert button click - transfer content from left to right with filtering
    convertBtn.addEventListener('click', function() {
        const originalText = commentTextarea.value;
        
        if (!originalText.trim()) {
            alert('請先輸入評論內容再進行轉換');
            return;
        }
        
        // 示例轉換：將原文轉換為更正面的評論
        let convertedText = '';
        
        // 檢查是否包含負面詞彙並轉換
        const negativeWords = {
            '很爛': '有改進空間',
            '超爛': '需要加強',
            '難死了': '具有挑戰性',
            '無聊': '比較平淡',
            '垃圾': '不太適合',
            '糟糕': '需要改善',
            '討厭': '不太喜歡',
            '幹': '真是',
            '靠': '哎呀',
            '爛': '需要改善',
            '廢': '有些不足'
        };
        
        convertedText = originalText;
        
        // 替換負面詞彙
        Object.keys(negativeWords).forEach(word => {
            const regex = new RegExp(word, 'g');
            convertedText = convertedText.replace(regex, negativeWords[word]);
        });
        
        // 如果沒有需要轉換的內容，添加一些正面的修飾
        if (convertedText === originalText) {
            convertedText = '總體來說，' + originalText + ' 希望能持續改進，讓課程更好。';
        } else {
            convertedText = '經過思考後，我認為' + convertedText + ' 以上是我的客觀評價。';
        }
        
        // Update preview with converted text
        previewTextarea.value = convertedText;
        
        // 顯示轉換完成提示
        const originalBtnText = convertBtn.innerHTML;
        const originalBgColor = convertBtn.style.backgroundColor;
        
        convertBtn.innerHTML = '已轉換';
        convertBtn.style.backgroundColor = '#e0d3e0';
        convertBtn.style.color = '#635c63';
        convertBtn.disabled = true;
        
        setTimeout(() => {
            convertBtn.innerHTML = originalBtnText;
            convertBtn.style.backgroundColor = originalBgColor;
            convertBtn.style.color = '#fff';
            convertBtn.disabled = false;
        }, 1500);
    });
}

// 初始化表單驗證和提交
function initializeFormValidation() {
    const commentForm = document.querySelector('.comment-form');
    const commentTextarea = document.getElementById('comment_text');
    const previewTextarea = document.getElementById('preview_text');
    
    if (!commentForm) return;
    
    // Remove the onsubmit attribute from HTML to prevent conflicts
    commentForm.removeAttribute('onsubmit');
    
    // Form submission handling with validation
    commentForm.addEventListener('submit', function(e) {
        e.preventDefault(); // 防止默認提交
        
        // 獲取所有必填欄位
        const schoolYear = document.getElementById('school_year')?.value || '';
        const category = document.getElementById('category')?.value || '';
        const classInfo = document.getElementById('class_info')?.value || '';
        const course = document.getElementById('course')?.value || '';
        const rating = document.getElementById('rating-input')?.value || '';
        const commentText = commentTextarea?.value.trim() || '';
        const previewText = previewTextarea?.value.trim() || '';
        const realNameRadio = document.getElementById('anonymous_no'); // 實名選項
        
        // 驗證必填欄位
        let missingFields = [];
        
        if (!schoolYear) missingFields.push('學年度');
        if (!category) missingFields.push('學制');
        if (!classInfo) missingFields.push('班級');
        if (!course) missingFields.push('課程');
        if (!rating || rating < 1 || rating > 5) missingFields.push('課程評分');
        if (!commentText && !previewText) missingFields.push('評論內容');
        
        if (missingFields.length > 0) {
            alert('請填寫以下必填欄位：\n' + missingFields.join('、'));
            return;
        }
        
        // 確認提交
        const isAnonymous = realNameRadio?.checked ? '實名' : '匿名';
        const finalText = previewText || commentText; // 優先使用轉換後的文字
        
        const confirmMessage = `送出後將無法修改，確定要送出嗎？`;
        
        if (confirm(confirmMessage)) {
            // 如果有轉換後的文字，將其設為主要提交內容
            if (previewText && commentTextarea) {
                commentTextarea.value = previewText;
            }
            
            // 顯示提交中狀態
            const submitBtn = this.querySelector('.btn-submit');
            if (submitBtn) {
                const originalText = submitBtn.innerHTML;
                
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 送出中...';
                submitBtn.disabled = true;
                
                // 模擬提交過程
                setTimeout(() => {
                    alert('評論送出成功！');
                    window.location.href = '/comment/';
                }, 1500);
            }
        }
    });
}

// 全域函數用於確認提交（向後兼容，並整合原本HTML中的驗證邏輯）
function confirmSubmission() {
    const form = document.getElementById('commentForm');
    if (!form) return false;
    
    const comment = form.querySelector('textarea[name="comment_text"]')?.value.trim() || '';
    const rating = parseFloat(document.getElementById('rating-input')?.value || 0);
    const courseSelect = form.querySelector('select[name="course"]');
    const classSelect = form.querySelector('select[name="class_info"]');
    const schoolYearSelect = form.querySelector('select[name="school_year"]');
    const categorySelect = form.querySelector('select[name="category"]');
    
    // 驗證必填欄位
    if (!courseSelect?.value) {
        alert('請選擇課程');
        return false;
    }
    
    if (!classSelect?.value) {
        alert('請選擇班級');
        return false;
    }
    
    if (!schoolYearSelect?.value) {
        alert('請選擇學年度');
        return false;
    }
    
    if (!categorySelect?.value) {
        alert('請選擇學制');
        return false;
    }
    
    if (!comment) {
        alert('請輸入評論內容');
        return false;
    }
    
    if (isNaN(rating) || rating < 1 || rating > 5) {
        alert('請給出有效的評分 (1-5分)');
        return false;
    }
    
    // 顯示確認對話框
    const confirmation = confirm('評論將公開顯示，送出後無法修改。');
        
    if (confirmation) {
        // 顯示載入中或禁用按鈕等處理
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...';
            
            // 模擬提交完成後跳轉
            setTimeout(() => {
                alert('評論送出成功！');
                window.location.href = '/comment/';
            }, 1500);
        }
    }
    
    return confirmation;
}