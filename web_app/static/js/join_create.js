// 即時預覽元素
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
const previewImageArea = document.querySelector('.preview-image');

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
        const formattedTime = activityTime.value.substring(0,5);
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

// 圖片上傳預覽（點擊 + 拖曳）
const imageUploadArea = document.getElementById('image-upload-area');
const coverInput = document.createElement('input');
coverInput.type = 'file';
coverInput.accept = 'image/*';
coverInput.style.display = 'none';
document.body.appendChild(coverInput);

imageUploadArea.addEventListener('click', () => coverInput.click());
coverInput.addEventListener('change', handleFile);

['dragenter','dragover','dragleave','drop'].forEach(e => {
    imageUploadArea.addEventListener(e, preventDefaults, false);
});
['dragenter','dragover'].forEach(e => imageUploadArea.addEventListener(e, highlight, false));
['dragleave','drop'].forEach(e => imageUploadArea.addEventListener(e, unhighlight, false));
imageUploadArea.addEventListener('drop', handleDrop, false);

function preventDefaults(e){ e.preventDefault(); e.stopPropagation(); }
function highlight(){ imageUploadArea.style.borderColor = '#34495e'; imageUploadArea.style.backgroundColor = '#f0f7ff'; }
function unhighlight(){ imageUploadArea.style.borderColor = '#ddd'; imageUploadArea.style.backgroundColor = 'transparent'; }

function handleFile(e){
    const file = e.target.files[0];
    if(file && file.type.startsWith('image/')){
        const reader = new FileReader();
        reader.onload = event => setPreviewImage(event.target.result);
        reader.readAsDataURL(file);
    }
}
function handleDrop(e){
    const dt = e.dataTransfer;
    const file = dt.files[0];
    if(file && file.type.startsWith('image/')){
        const reader = new FileReader();
        reader.onload = event => setPreviewImage(event.target.result);
        reader.readAsDataURL(file);
    }
}
function setPreviewImage(src){
    previewImageArea.innerHTML = '';
    previewImageArea.style.backgroundImage = `url(${src})`;
    previewImageArea.style.backgroundSize = 'cover';
    previewImageArea.style.backgroundPosition = 'center';
    // 保留標籤
    const tag = document.createElement('div');
    tag.className = 'preview-tag';
    tag.id = 'preview-tag';
    tag.textContent = previewTag.textContent;
    previewImageArea.appendChild(tag);
}

// 表單提交
document.getElementById('create-group-form').addEventListener('submit', async function(e){
    e.preventDefault();

    const deadlineDate = new Date(document.getElementById('activity-deadline').value);
    const eventDate = new Date(activityDate.value);
    const minParticipants = parseInt(document.getElementById('min-participants').value);
    const maxParticipants = parseInt(document.getElementById('max-participants').value);

    if(deadlineDate >= eventDate){ alert('報名截止日期必須早於活動日期！'); return false; }
    if(minParticipants > maxParticipants){ alert('最少參加人數不能大於最多參加人數！'); return false; }

    const formData = new FormData(this);
    // Ajax 發送
    try{
        const res = await fetch("{% url 'activity_create' %}", {
            method:'POST',
            headers:{ 'X-CSRFToken': getCookie('csrftoken') },
            body: formData
        });
        const data = await res.json();
        if(data.ok){ alert('活動建立成功！'); window.location.href="{% url 'activities_list' %}"; }
        else{ alert('建立失敗：'+JSON.stringify(data.errors)); }
    }catch(err){ console.error(err); alert('建立失敗'); }
});

function getCookie(name){
    const value = document.cookie.split('; ').find(row=>row.startsWith(name+'='));
    return value ? decodeURIComponent(value.split('=')[1]) : '';
}
