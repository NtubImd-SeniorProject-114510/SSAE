// join_pop.js - 發起揪團彈跳視窗功能

document.addEventListener('DOMContentLoaded', function() {
    initializeCreateActivity();
    initializePreview();
});

function initializeCreateActivity() {
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadForm = document.getElementById('uploadForm');
    const closeUploadBtn = document.getElementById('closeUploadBtn');
    const cancelCreateBtn = document.getElementById('cancel-create-btn');
    const createGroupForm = document.getElementById('create-group-form');
    const imageUploadArea = document.getElementById('image-upload-area');

    if (uploadBtn) uploadBtn.addEventListener('click', () => {
        uploadForm.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });

    const closeForm = () => {
        uploadForm.style.display = 'none';
        document.body.style.overflow = 'auto';
        createGroupForm.reset();
        resetPreview();
    };

    if (closeUploadBtn) closeUploadBtn.addEventListener('click', closeForm);
    if (cancelCreateBtn) cancelCreateBtn.addEventListener('click', closeForm);
    if (uploadForm) uploadForm.addEventListener('click', e => {
        if (e.target === uploadForm) closeForm();
    });

    if (imageUploadArea) {
        imageUploadArea.addEventListener('click', () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.addEventListener('change', handleImageUpload);
            fileInput.click();
        });

        imageUploadArea.addEventListener('dragover', e => {
            e.preventDefault();
            imageUploadArea.style.borderColor = '#3d7e88';
            imageUploadArea.style.backgroundColor = '#f0f8fa';
        });

        imageUploadArea.addEventListener('dragleave', e => {
            e.preventDefault();
            imageUploadArea.style.borderColor = '#ddd';
            imageUploadArea.style.backgroundColor = '#fafafa';
        });

        imageUploadArea.addEventListener('drop', e => {
            e.preventDefault();
            imageUploadArea.style.borderColor = '#ddd';
            imageUploadArea.style.backgroundColor = '#fafafa';
            const files = e.dataTransfer.files;
            if (files.length > 0) handleImageUpload({ target: { files } });
        });
    }

    if (createGroupForm) {
        createGroupForm.addEventListener('submit', async e => {
            e.preventDefault();
            if (!validateForm()) return;

            const formData = new FormData(createGroupForm);

            try {
                const res = await fetch('/activities/create/', {
                    method: 'POST',
                    headers: {
                        'X-Requested-With':'XMLHttpRequest',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: formData
                });
                const data = await res.json();
                console.log('後端回傳:', data);

                if (data.ok) {
                    showSuccessMessage();
                    setTimeout(()=> window.location.href = '/activities/', 1200);
                } else {
                    alert('建立失敗：' + JSON.stringify(data.errors));
                }
            } catch(err) {
                console.error(err);
                alert('建立失敗，請稍後再試');
            }
        });
    }

    function getCookie(name) {
        const value = document.cookie.split('; ').find(row=>row.startsWith(name+'='));
        return value ? decodeURIComponent(value.split('=')[1]) : '';
    }
}

// 圖片上傳
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { alert('圖片檔案大小不能超過 2MB'); return; }
    if (!file.type.startsWith('image/')) { alert('請選擇圖片檔案'); return; }

    const reader = new FileReader();
    reader.onload = e => {
        const imageUploadArea = document.getElementById('image-upload-area');
        const previewImage = document.querySelector('.preview-image');

        if (imageUploadArea) {
            imageUploadArea.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:150px;border-radius:5px;"><div style="margin-top:10px;font-size:14px;color:#666;">點擊更換圖片</div>`;
        }
        if (previewImage) {
            previewImage.style.backgroundImage = `url(${e.target.result})`;
            previewImage.style.backgroundSize = 'cover';
            previewImage.style.backgroundPosition = 'center';
            previewImage.innerHTML = `<div class="preview-tag" id="preview-tag">活動類型</div>`;
        }
    };
    reader.readAsDataURL(file);
}

// 其餘 initializePreview(), resetPreview(), validateForm(), showSuccessMessage() 可沿用原本版本


// 初始化預覽功能
function initializePreview() {
    // 活動標題預覽
    const activityTitle = document.getElementById('activity-title');
    const previewTitle = document.getElementById('preview-title');
    
    if (activityTitle && previewTitle) {
        activityTitle.addEventListener('input', function() {
            previewTitle.textContent = this.value || '活動標題';
        });
    }
    
    // 活動類型預覽
    const activityType = document.getElementById('activity-type');
    const previewTag = document.getElementById('preview-tag');
    
    if (activityType && previewTag) {
        activityType.addEventListener('change', function() {
            const typeMap = {
                'food': '美食',
                'sport': '運動',
                'study': '讀書',
                'travel': '旅遊',
                'movie': '電影',
                'other': '其他'
            };
            previewTag.textContent = typeMap[this.value] || '活動類型';
        });
    }
    
    // 活動地點預覽
    const activityLocation = document.getElementById('activity-location');
    const previewLocation = document.getElementById('preview-location');
    
    if (activityLocation && previewLocation) {
        activityLocation.addEventListener('input', function() {
            previewLocation.textContent = this.value || '活動地點';
        });
    }
    
    // 活動時間預覽
    const activityDate = document.getElementById('activity-date');
    const activityTime = document.getElementById('activity-time');
    const previewTime = document.getElementById('preview-time');
    
    function updateTimePreview() {
        const date = activityDate?.value || '';
        const time = activityTime?.value || '';
        let timeText = '活動時間';
        
        if (date && time) {
            const dateObj = new Date(date);
            const month = dateObj.getMonth() + 1;
            const day = dateObj.getDate();
            const timeFormatted = time.substring(0, 5);
            timeText = `${month}/${day} ${timeFormatted}`;
        } else if (date) {
            const dateObj = new Date(date);
            const month = dateObj.getMonth() + 1;
            const day = dateObj.getDate();
            timeText = `${month}/${day}`;
        }
        
        if (previewTime) {
            previewTime.textContent = timeText;
        }
    }
    
    if (activityDate) {
        activityDate.addEventListener('change', updateTimePreview);
    }
    
    if (activityTime) {
        activityTime.addEventListener('change', updateTimePreview);
    }
    
    // 活動說明預覽
    const activityDescription = document.getElementById('activity-description');
    const previewDescription = document.getElementById('preview-description');
    
    if (activityDescription && previewDescription) {
        activityDescription.addEventListener('input', function() {
            previewDescription.textContent = this.value || '活動說明將顯示在這裡...';
        });
    }
}

// 重置預覽
function resetPreview() {
    const previewTitle = document.getElementById('preview-title');
    const previewTag = document.getElementById('preview-tag');
    const previewLocation = document.getElementById('preview-location');
    const previewTime = document.getElementById('preview-time');
    const previewDescription = document.getElementById('preview-description');
    const previewImage = document.querySelector('.preview-image');
    const imageUploadArea = document.getElementById('image-upload-area');
    
    if (previewTitle) previewTitle.textContent = '活動標題';
    if (previewTag) previewTag.textContent = '活動類型';
    if (previewLocation) previewLocation.textContent = '活動地點';
    if (previewTime) previewTime.textContent = '活動時間';
    if (previewDescription) previewDescription.textContent = '活動說明將顯示在這裡...';
    
    if (previewImage) {
        previewImage.style.backgroundImage = '';
        previewImage.innerHTML = '圖片預覽區域<div class="preview-tag" id="preview-tag">活動類型</div>';
    }
    
    if (imageUploadArea) {
        imageUploadArea.innerHTML = `
            <div class="image-upload-icon">📷</div>
            <div class="image-upload-text">點擊上傳圖片或拖曳圖片至此處</div>
        `;
    }
}

// 驗證表單
function validateForm() {
    const requiredFields = [
        'activity-title',
        'activity-type',
        'activity-location',
        'activity-date',
        'activity-time',
        'activity-description',
        'activity-deadline'
    ];
    
    let isValid = true;
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !field.value.trim()) {
            field.style.borderColor = '#e74c3c';
            isValid = false;
            
            // 3秒後恢復邊框顏色
            setTimeout(() => {
                field.style.borderColor = '#e0e0e0';
            }, 3000);
        }
    });
    
    // 驗證人數邏輯
    const minParticipants = document.getElementById('min-participants');
    const maxParticipants = document.getElementById('max-participants');
    
    if (minParticipants && maxParticipants) {
        const minValue = parseInt(minParticipants.value);
        const maxValue = parseInt(maxParticipants.value);
        
        if (minValue >= maxValue) {
            alert('最多參加人數必須大於最少參加人數');
            maxParticipants.style.borderColor = '#e74c3c';
            isValid = false;
            
            setTimeout(() => {
                maxParticipants.style.borderColor = '#e0e0e0';
            }, 3000);
        }
    }
    
    // 驗證截止日期
    const activityDate = document.getElementById('activity-date');
    const deadline = document.getElementById('activity-deadline');
    
    if (activityDate && deadline && activityDate.value && deadline.value) {
        const activityDateObj = new Date(activityDate.value);
        const deadlineObj = new Date(deadline.value);
        
        if (deadlineObj >= activityDateObj) {
            alert('報名截止日期必須早於活動日期');
            deadline.style.borderColor = '#e74c3c';
            isValid = false;
            
            setTimeout(() => {
                deadline.style.borderColor = '#e0e0e0';
            }, 3000);
        }
    }
    
    if (!isValid) {
        alert('請填寫所有必填欄位並檢查輸入內容');
    }
    
    return isValid;
}

// 顯示成功訊息
function showSuccessMessage() {
    // 創建成功訊息元素
    const successMessage = document.createElement('div');
    successMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #4CAF50;
        color: white;
        padding: 20px 40px;
        border-radius: 10px;
        font-size: 18px;
        font-weight: 600;
        z-index: 300;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);`;
    
    // 添加成功訊息到body
    document.body.appendChild(successMessage);
    
    // 3秒後移除成功訊息
    setTimeout(() => {
        successMessage.remove();
    }, 3000);
}