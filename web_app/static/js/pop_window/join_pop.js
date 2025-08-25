// join_pop.js - 發起揪團彈跳視窗功能 + Leaflet地圖整合
document.addEventListener('DOMContentLoaded', function() {
    initializeCreateActivity();
    initializePreview();
    initializePreviewMap();
    initializeLocationAutocomplete();
});

let previewMap;
let previewMarker;

// 初始化建立活動功能
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
        // 延遲初始化地圖，確保容器已顯示
        setTimeout(() => {
            if (previewMap) {
                previewMap.invalidateSize();
            }
        }, 100);
    });

    const closeForm = () => {
        uploadForm.style.display = 'none';
        document.body.style.overflow = 'auto';
        if (createGroupForm) {
            createGroupForm.reset();
            resetPreview();
        }
    };

    if (closeUploadBtn) closeUploadBtn.addEventListener('click', closeForm);
    if (cancelCreateBtn) cancelCreateBtn.addEventListener('click', closeForm);
    if (uploadForm) uploadForm.addEventListener('click', e => {
        if (e.target === uploadForm) closeForm();
    });

    // 圖片上傳區域處理
    if (imageUploadArea) {
        imageUploadArea.addEventListener('click', () => {
            const actualFileInput = document.getElementById('activity-cover');
            if (actualFileInput) actualFileInput.click();
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
            if (files.length > 0) {
                const actualFileInput = document.getElementById('activity-cover');
                if (actualFileInput) actualFileInput.files = files;
                handleImageUpload({ target: { files } });
            }
        });
    }

    const actualFileInput = document.getElementById('activity-cover');
    if (actualFileInput) actualFileInput.addEventListener('change', handleImageUpload);

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

// 處理圖片上傳
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { 
        alert('圖片檔案大小不能超過 2MB'); 
        return; 
    }
    if (!file.type.startsWith('image/')) { 
        alert('請選擇圖片檔案'); 
        return; 
    }

    const actualFileInput = document.getElementById('activity-cover');
    if (actualFileInput && event.target !== actualFileInput) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        actualFileInput.files = dataTransfer.files;
    }

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
    console.log('圖片上傳成功:', file.name);
}

// 初始化預覽
function initializePreview() {
    const activityTitle = document.getElementById('activity-title');
    const previewTitle = document.getElementById('preview-title');
    if (activityTitle && previewTitle) {
        activityTitle.addEventListener('input', function() {
            previewTitle.textContent = this.value || '活動標題';
        });
    }

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

    const activityLocation = document.getElementById('activity-location');
    const previewLocation = document.getElementById('preview-location');
    if (activityLocation && previewLocation) {
        activityLocation.addEventListener('input', function() {
            previewLocation.textContent = this.value || '活動地點';
        });
    }

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
        if (previewTime) previewTime.textContent = timeText;
    }
    
    if (activityDate) activityDate.addEventListener('change', updateTimePreview);
    if (activityTime) activityTime.addEventListener('change', updateTimePreview);

    const activityDescription = document.getElementById('activity-description');
    const previewDescription = document.getElementById('preview-description');
    if (activityDescription && previewDescription) {
        activityDescription.addEventListener('input', function() {
            previewDescription.textContent = this.value || '活動說明將顯示在這裡...';
        });
    }
}

// 初始化預覽地圖
function initializePreviewMap() {
    const mapElement = document.getElementById('preview-map');
    if (!mapElement) return;

    // 預設座標：台北市中心
    const defaultLat = 25.033964;
    const defaultLng = 121.564468;

    previewMap = L.map('preview-map').setView([defaultLat, defaultLng], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(previewMap);

    previewMarker = L.marker([defaultLat, defaultLng]).addTo(previewMap);
    previewMarker.bindPopup('活動地點').openPopup();
}

// 初始化地點自動完成功能
function initializeLocationAutocomplete() {
    const locationInput = document.getElementById('activity-location');
    const suggestionsBox = document.getElementById('location-suggestions');
    const selectedLat = document.getElementById('selected-latitude');
    const selectedLng = document.getElementById('selected-longitude');
    const selectedAddress = document.getElementById('selected-address');
    const selectedPlaceId = document.getElementById('selected-place-id');

    if (!locationInput || !suggestionsBox) return;

    let debounceTimeout = null;

    // 輸入即時搜尋
    locationInput.addEventListener('input', function() {
        const query = locationInput.value.trim();
        if (!query) {
            suggestionsBox.innerHTML = '';
            suggestionsBox.style.display = 'none';
            return;
        }

        if (debounceTimeout) clearTimeout(debounceTimeout);
        
        debounceTimeout = setTimeout(() => {
            searchLocations(query);
        }, 300);
    });

    // 搜尋地點
    function searchLocations(query) {
        // 使用 Nominatim API 搜尋地點
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=tw&addressdetails=1`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                displaySuggestions(data);
            })
            .catch(error => {
                console.error('搜尋地點失敗:', error);
                suggestionsBox.innerHTML = '';
                suggestionsBox.style.display = 'none';
            });
    }

    // 顯示建議
    function displaySuggestions(locations) {
        suggestionsBox.innerHTML = '';
        
        if (locations.length === 0) {
            suggestionsBox.style.display = 'none';
            return;
        }

        locations.forEach(location => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.innerHTML = `
                <div class="suggestion-main">${location.display_name}</div>
                <div class="suggestion-type">${getLocationType(location)}</div>
            `;

            suggestionItem.addEventListener('click', () => {
                selectLocation(location);
            });

            suggestionsBox.appendChild(suggestionItem);
        });

        suggestionsBox.style.display = 'block';
    }

    // 選擇地點
    function selectLocation(location) {
        const lat = parseFloat(location.lat);
        const lng = parseFloat(location.lon);
        
        // 更新輸入欄位
        locationInput.value = location.display_name;
        
        // 更新隱藏欄位
        selectedLat.value = lat;
        selectedLng.value = lng;
        selectedAddress.value = location.display_name;
        selectedPlaceId.value = location.place_id || '';

        // 更新預覽地圖
        updatePreviewMap(lat, lng, location.display_name);

        // 隱藏建議框
        suggestionsBox.innerHTML = '';
        suggestionsBox.style.display = 'none';
    }

    // 更新預覽地圖
    function updatePreviewMap(lat, lng, address) {
        if (previewMap && previewMarker) {
            previewMap.setView([lat, lng], 15);
            previewMarker.setLatLng([lat, lng]);
            previewMarker.bindPopup(`<b>${address}</b>`).openPopup();
        }
    }

    // 獲取地點類型
    function getLocationType(location) {
        if (location.type) {
            const typeMap = {
                'restaurant': '餐廳',
                'cafe': '咖啡廳',
                'school': '學校',
                'university': '大學',
                'hospital': '醫院',
                'hotel': '飯店',
                'shop': '商店',
                'mall': '購物中心',
                'park': '公園',
                'museum': '博物館',
                'cinema': '電影院',
                'gym': '健身房',
                'library': '圖書館'
            };
            return typeMap[location.type] || location.type;
        }
        return '';
    }

    // 點擊其他地方隱藏建議
    document.addEventListener('click', function(e) {
        if (!locationInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.innerHTML = '';
            suggestionsBox.style.display = 'none';
        }
    });
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
        imageUploadArea.innerHTML = `<div class="image-upload-icon">📷</div><div class="image-upload-text">點擊上傳圖片或拖曳圖片至此處</div>`;
    }

    // 重置地圖到預設位置
    if (previewMap && previewMarker) {
        const defaultLat = 25.033964;
        const defaultLng = 121.564468;
        previewMap.setView([defaultLat, defaultLng], 13);
        previewMarker.setLatLng([defaultLat, defaultLng]);
        previewMarker.bindPopup('活動地點');
    }

    // 清空隱藏欄位
    const hiddenFields = ['selected-latitude', 'selected-longitude', 'selected-address', 'selected-place-id'];
    hiddenFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });
}

// 驗證表單
function validateForm() {
    const requiredFields = [
        'activity-title','activity-type','activity-location',
        'activity-date','activity-time','activity-description','activity-deadline'
    ];
    
    let isValid = true;
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !field.value.trim()) {
            field.style.borderColor = '#e74c3c';
            isValid = false;
            setTimeout(() => { 
                field.style.borderColor = '#e0e0e0'; 
            }, 3000);
        }
    });

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
    const successMessage = document.createElement('div');
    successMessage.textContent = '活動建立成功！';
    successMessage.style.cssText = `
        position: fixed; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        background-color: #4CAF50; color: white;
        padding: 20px 40px; border-radius: 10px;
        font-size: 18px; font-weight: 600;
        z-index: 300; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);`;
    document.body.appendChild(successMessage);
    setTimeout(() => { 
        successMessage.remove(); 
    }, 3000);
}