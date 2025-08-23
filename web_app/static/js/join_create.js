//web_app\static\js\join_create.js

// 即時預覽功能
const activityTitle = document.getElementById('activity-title');
const activityType = document.getElementById('activity-type');
const activityLocation = document.getElementById('activity-location');
const activityDate = document.getElementById('activity-date');
const activityTime = document.getElementById('activity-time');
const activityDescription = document.getElementById('activity-description');

const previewTitle = document.getElementById('preview-title');
const previewTag = document.getElementById('preview-tag');
const previewLocation = document.getElementById('preview-location');
const previewTime = document.getElementById('preview-time');
const previewDescription = document.getElementById('preview-description');

// 標題預覽
activityTitle.addEventListener('input', () => {
    previewTitle.textContent = activityTitle.value || '活動標題';
});

// 類型預覽
activityType.addEventListener('change', () => {
    const typeMap = {
        'food': '美食',
        'sport': '運動',
        'study': '讀書',
        'travel': '旅遊',
        'movie': '電影',
        'other': '其他'
    };
    previewTag.textContent = typeMap[activityType.value] || '活動類型';
});

// 地點預覽
activityLocation.addEventListener('input', () => {
    previewLocation.textContent = activityLocation.value || '活動地點';
});

// 時間預覽
function updateTimePreview() {
    if (activityDate.value && activityTime.value) {
        const date = new Date(activityDate.value);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const formattedTime = activityTime.value.substring(0, 5);
        previewTime.textContent = `${month}/${day} ${formattedTime}`;
    } else {
        previewTime.textContent = '活動時間';
    }
}

activityDate.addEventListener('input', updateTimePreview);
activityTime.addEventListener('input', updateTimePreview);

// 描述預覽
activityDescription.addEventListener('input', () => {
    previewDescription.textContent = activityDescription.value || '活動說明將顯示在這裡...';
});

// 表單提交處理
document.getElementById('create-group-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // 確認截止日期在活動日期之前
    const deadlineDate = new Date(document.getElementById('activity-deadline').value);
    const eventDate = new Date(activityDate.value);
    
    if (deadlineDate >= eventDate) {
        alert('報名截止日期必須早於活動日期！');
        return false;
    }
    
    // 確認最少人數小於最多人數
    const minParticipants = parseInt(document.getElementById('min-participants').value);
    const maxParticipants = parseInt(document.getElementById('max-participants').value);
    
    if (minParticipants > maxParticipants) {
        alert('最少參加人數不能大於最多參加人數！');
        return false;
    }
    
    // 這裡可以加入表單提交的AJAX請求
    alert('活動發布成功！');
    window.location.href = 'group-activities.html';
});

// 圖片上傳預覽
const imageUploadArea = document.getElementById('image-upload-area');

imageUploadArea.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.click();
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(event) {
                const previewImage = document.querySelector('.preview-image');
                previewImage.innerHTML = '';
                previewImage.style.backgroundImage = `url(${event.target.result})`;
                previewImage.style.backgroundSize = 'cover';
                previewImage.style.backgroundPosition = 'center';
                
                // 保留標籤
                const tag = document.createElement('div');
                tag.className = 'preview-tag';
                tag.id = 'preview-tag';
                tag.textContent = previewTag.textContent;
                previewImage.appendChild(tag);
            }
            
            reader.readAsDataURL(e.target.files[0]);
        }
    });
});

// 拖曳上傳功能
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    imageUploadArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    imageUploadArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    imageUploadArea.addEventListener(eventName, unhighlight, false);
});

function highlight() {
    imageUploadArea.style.borderColor = '#34495e';
    imageUploadArea.style.backgroundColor = '#f0f7ff';
}

function unhighlight() {
    imageUploadArea.style.borderColor = '#ddd';
    imageUploadArea.style.backgroundColor = 'transparent';
}

imageUploadArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files && files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(event) {
            const previewImage = document.querySelector('.preview-image');
            previewImage.innerHTML = '';
            previewImage.style.backgroundImage = `url(${event.target.result})`;
            previewImage.style.backgroundSize = 'cover';
            previewImage.style.backgroundPosition = 'center';
            
            // 保留標籤
            const tag = document.createElement('div');
            tag.className = 'preview-tag';
            tag.id = 'preview-tag';
            tag.textContent = previewTag.textContent;
            previewImage.appendChild(tag);
        }
        
        reader.readAsDataURL(files[0]);
    }
}
