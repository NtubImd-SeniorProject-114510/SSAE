// join_pop.js - 發起揪團彈跳視窗功能（Leaflet + Nominatim 自動補全）
// 修正版本 - 解決校外即時顯示地圖問題

// 防止重複初始化
if (typeof window.joinPopInitialized === 'undefined') {
    window.joinPopInitialized = false;
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.joinPopInitialized) {
        console.log('join_pop.js 已初始化，跳過重複初始化');
        return;
    }
    
    console.log('join_pop.js 開始初始化');
    window.joinPopInitialized = true;
    
    initCreateActivity();
    initPreview();
    initLocationAutocomplete();
    initNumberButtons();
});

// 全域變數（防止重複聲明）
if (typeof window.previewMap === 'undefined') {
    window.previewMap = null;
    window.previewMarker = null;
    window.mapInitialized = false;
}
var previewMap = window.previewMap;
var previewMarker = window.previewMarker;
var mapInitialized = window.mapInitialized;

// 初始化活動創建功能
function initCreateActivity() {
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadForm = document.getElementById('uploadForm');
    const closeUploadBtn = document.getElementById('closeUploadBtn');
    const cancelCreateBtn = document.getElementById('cancel-create-btn');
    const createGroupForm = document.getElementById('create-group-form');
    const imageUploadArea = document.getElementById('image-upload-area');

    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            uploadForm.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            setTimeout(() => { if (previewMap) previewMap.invalidateSize(); }, 120);
        });
    }

    const closeForm = () => {
        uploadForm.style.display = 'none';
        document.body.style.overflow = 'auto';
        if (createGroupForm) {
            createGroupForm.reset();
            resetPreview();
            const mapEl = document.getElementById('preview-map');
            if (mapEl) mapEl.style.display = 'none';
        }
    };

    closeUploadBtn?.addEventListener('click', closeForm);
    cancelCreateBtn?.addEventListener('click', closeForm);
    uploadForm?.addEventListener('click', e => { if (e.target === uploadForm) closeForm(); });

    function safeNotify(type, msg) {
        try {
            if (typeof window.showNotification === 'function') {
                window.showNotification(type, msg);
            } else {
                alert(msg);
            }
        } catch (e) {
            console.warn('showNotification failed, fallback to alert:', e);
            alert(msg);
        }
    }

    function extractOneMessage(data, raw='') {
        let msg = data?.message || '';
        if (!msg && data?.errors) {
            const v = Array.isArray(data.errors)
                ? data.errors[0]
                : (data.errors.general && data.errors.general[0]) ||
                  (Object.values(data.errors)[0] && Object.values(data.errors)[0][0]);
            if (v) msg = v;
        }
        if (!msg && raw) {
            msg = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }
        return msg || '';
    }

    const BANNED_WORDS = (() => {
        try {
            const el = document.getElementById('bannedWords');
            return el ? JSON.parse(el.textContent) : [];
        } catch (_) { return []; }
    })();

    const hitBanned = (text='') => {
        const t = String(text).toLowerCase();
        return BANNED_WORDS.some(w => t.includes(String(w).toLowerCase()));
    };

    if (imageUploadArea) {
        imageUploadArea.addEventListener('click', () => document.getElementById('activity-cover')?.click());
        imageUploadArea.addEventListener('dragover', e => { e.preventDefault(); imageUploadArea.style.borderColor = '#3d7e88'; imageUploadArea.style.backgroundColor = '#f0f8fa'; });
        imageUploadArea.addEventListener('dragleave', e => { e.preventDefault(); resetImageArea(); });
        imageUploadArea.addEventListener('drop', e => {
            e.preventDefault();
            resetImageArea();
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const fileInput = document.getElementById('activity-cover');
                if (fileInput) fileInput.files = files;
                handleImageUpload({ target: { files } });
            }
        });
    }
    document.getElementById('activity-cover')?.addEventListener('change', handleImageUpload);

    createGroupForm?.addEventListener('submit', async e => {
        e.preventDefault();
        if (!validateForm()) return;

        const title = document.getElementById('activity-title')?.value || '';
        const desc  = document.getElementById('activity-description')?.value || '';
        if (hitBanned(`${title}\n${desc}`)) {
            safeNotify('error', '輸入內容包含禁止或不當詞彙，請重新編輯。');
            return;
        }

        const locationRadio = document.querySelector('input[name="location_type"]:checked');
        const selectedAddress = document.getElementById('selected-address');
        if (locationRadio?.value === 'on_campus') {
            const classroom = document.getElementById('classroom')?.value.trim();
            if (selectedAddress) selectedAddress.value = classroom || '校內教室';
        }

        const formData = new FormData(createGroupForm);
        const createUrl = (createGroupForm && createGroupForm.action) || '/activities/create/';

        try {
            const res = await fetch(createUrl, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: formData,
                credentials: 'same-origin'
            });

            let data = null, rawText = '';
            try { data = await res.json(); } catch { try { rawText = await res.text(); } catch {} }

            if (!res.ok || !(data?.success ?? data?.ok)) {
                let msg = extractOneMessage(data, rawText);
                const looksBanned = (data && (data.code === 'BANNED' || data.code === 'BANNED_TITLE')) ||
                                    /禁止|不當|禁用/.test(msg);
                if (looksBanned) {
                    msg = '輸入內容包含禁止或不當詞彙，請重新編輯。';
                } else if (/csrf|forbidden|禁止存取|驗證/i.test((msg || '').toLowerCase())) {
                    msg = '驗證逾時或未登入，請重新登入後再試。';
                }
                if (!msg) msg = '提交失敗，請稍後再試';
                safeNotify('error', msg);
                return;
            }

            safeNotify('success', data?.message || '活動創建成功！');
            showSuccessMessage();
            setTimeout(() => { window.location.href = '/activities/'; }, 1200);

        } catch (err) {
            console.error(err);
            safeNotify('error', '網路或系統異常，請稍後再試');
        }
    });

    function resetImageArea() {
        if (!imageUploadArea) return;
        imageUploadArea.style.borderColor = '#ddd';
        imageUploadArea.style.backgroundColor = '#fafafa';
        const fileInput = document.getElementById('activity-cover');
        if (fileInput && !fileInput.files.length) {
            imageUploadArea.innerHTML = `<div class="image-upload-icon">📷</div><div class="image-upload-text">點擊上傳圖片或拖曳圖片至此處</div>`;
        }
    }

    function getCookie(name) {
        const value = document.cookie.split('; ').find(row => row.startsWith(name + '='));
        return value ? decodeURIComponent(value.split('=')[1]) : '';
    }
}

function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('圖片檔案大小不能超過 2MB'); return; }
    if (!file.type.startsWith('image/')) { alert('請選擇圖片檔案'); return; }

    const fileInput = document.getElementById('activity-cover');
    if (fileInput && event.target !== fileInput) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
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
            if (!previewImage.querySelector('.preview-tag')) {
                const tag = document.createElement('div');
                tag.className = 'preview-tag';
                tag.id = 'preview-tag';
                tag.innerText = '活動類型';
                previewImage.appendChild(tag);
            }
        }
    };
    reader.readAsDataURL(file);
}

function initNumberButtons() {
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            
            const targetId = this.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) {
                console.error('找不到目標輸入框:', targetId);
                return;
            }
            
            let v = parseInt(input.value) || 0;
            const min = parseInt(input.min) || 1;
            const max = parseInt(input.max) || 999;
            
            if (this.classList.contains('plus')) {
                v++;
            } else if (this.classList.contains('minus')) {
                v--;
            }
            
            if (v < min) v = min;
            if (v > max) v = max;
            
            input.value = v;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            
            console.log(`按鈕點擊: ${targetId} = ${v}`);
        }, { passive: false });
    });
    
    console.log('人數按鈕初始化完成，找到', document.querySelectorAll('.num-btn').length, '個按鈕');
}

function initLocationAutocomplete() {
    const input = document.getElementById('activity-location');
    const suggestionsBox = document.getElementById('location-suggestions');
    
    if (!input || !suggestionsBox) {
        console.error('地址自動補全初始化失敗: 找不到必要元素');
        return;
    }

    let timer = null;
    
    input.addEventListener('input', function () {
        clearTimeout(timer);
        const q = this.value.trim();
        suggestionsBox.innerHTML = '';
        suggestionsBox.style.display = 'none';
        
        if (!q) {
            updateLocationPreview();
            return;
        }
        
        console.log('搜尋地址:', q);
        
        timer = setTimeout(async () => {
            try {
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=6&countrycodes=tw`;
                console.log('發送請求:', url);
                
                const res = await fetch(url, { 
                    headers: { 'Accept-Language': 'zh-TW' } 
                });
                
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                
                const data = await res.json();
                console.log('收到回應:', data);
                
                suggestionsBox.innerHTML = '';
                
                if (Array.isArray(data) && data.length) {
                    data.forEach(place => {
                        const item = document.createElement('div');
                        item.className = 'suggestion-item';
                        item.innerHTML = `<div class="suggestion-main">${place.display_name}</div>`;
                        item.addEventListener('click', () => {
                            console.log('選擇地點:', place);
                            input.value = place.display_name;
                            document.getElementById('selected-address').value = place.display_name || '';
                            document.getElementById('selected-latitude').value = place.lat || '';
                            document.getElementById('selected-longitude').value = place.lon || '';
                            document.getElementById('selected-place-id').value = place.place_id || '';
                            suggestionsBox.innerHTML = '';
                            suggestionsBox.style.display = 'none';
                            updateLocationPreview();
                        });
                        suggestionsBox.appendChild(item);
                    });
                    suggestionsBox.style.display = 'block';
                } else {
                    suggestionsBox.innerHTML = `<div class="suggestion-item disabled">找不到相關地點</div>`;
                    suggestionsBox.style.display = 'block';
                }
            } catch (err) {
                console.error('Autocomplete error:', err);
                suggestionsBox.innerHTML = `<div class="suggestion-item disabled">搜尋失敗，請檢查網路連線</div>`;
                suggestionsBox.style.display = 'block';
            }
        }, 350);
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.innerHTML = '';
            suggestionsBox.style.display = 'none';
        }
    });
    
    console.log('地址自動補全初始化完成');
}

function initPreview() {
    const titleInput = document.getElementById('activity-title');
    const typeInput = document.getElementById('activity-type');
    const descInput = document.getElementById('activity-description');
    const dateInput = document.getElementById('activity-date');
    const timeInput = document.getElementById('activity-time');
    const classroomInput = document.getElementById('classroom');
    const locationInput = document.getElementById('activity-location');

    const previewTitle = document.getElementById('preview-title');
    const previewTag = document.getElementById('preview-tag');
    const previewDescription = document.getElementById('preview-description');
    const previewTime = document.getElementById('preview-time');
    const previewLocation = document.getElementById('preview-location');

    // ===== 🎯 修正：監聽地點類型變更，即時顯示/隱藏地圖 =====
    const locationRadios = document.querySelectorAll('input[name="location_type"]');
    
    // 處理地點類型切換的函數
    function handleLocationTypeChange(locationType) {
        console.log('地點類型切換:', locationType);
        const classroomField = document.getElementById('classroom-field');
        const locationField = document.getElementById('location-field');
        
        if (locationType === 'on_campus') {
            if (classroomField) classroomField.style.display = 'block';
            if (locationField) locationField.style.display = 'none';
        } else if (locationType === 'off_campus') {
            if (classroomField) classroomField.style.display = 'none';
            if (locationField) locationField.style.display = 'block';
        }
        
        // 立即更新地圖顯示狀態
        updateLocationPreview();
    }
    
    // 綁定 change 事件
    locationRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            handleLocationTypeChange(this.value);
        });
        
        // ★ 如果這個 radio 已經被選中，立即處理
        if (radio.checked) {
            console.log('初始化時發現已選中的選項:', radio.value);
            handleLocationTypeChange(radio.value);
        }
    });
    
    // ★ 如果沒有任何選項被選中，預設隱藏兩個欄位
    const checkedRadio = document.querySelector('input[name="location_type"]:checked');
    if (!checkedRadio) {
        console.log('初始化：沒有選中任何地點類型');
        const classroomField = document.getElementById('classroom-field');
        const locationField = document.getElementById('location-field');
        if (classroomField) classroomField.style.display = 'none';
        if (locationField) locationField.style.display = 'none';
    }

    titleInput?.addEventListener('input', () => {
        if (previewTitle) previewTitle.textContent = titleInput.value || '活動標題';
    });

    typeInput?.addEventListener('change', () => {
        if (!previewTag) return;
        const map = { 'food':'美食','sport':'運動','study':'讀書','travel':'旅遊','movie':'電影','other':'其他' };
        previewTag.textContent = map[typeInput.value] || '活動類型';
    });

    descInput?.addEventListener('input', () => {
        if (previewDescription) previewDescription.textContent = descInput.value || '活動說明將顯示在這裡...';
    });

    function updateTimePreview() {
        if (!previewTime) return;
        const d = dateInput?.value || '';
        const t = timeInput?.value || '';
        let s = '活動時間';
        if (d && t) {
            const dateObj = new Date(d);
            if (!isNaN(dateObj)) {
                s = `${dateObj.getMonth()+1}/${dateObj.getDate()} ${t.substring(0,5)}`;
            } else {
                s = `${d} ${t}`;
            }
        } else if (d) {
            const dateObj = new Date(d);
            if (!isNaN(dateObj)) {
                s = `${dateObj.getMonth()+1}/${dateObj.getDate()}`;
            } else s = d;
        } else if (t) s = t;
        previewTime.textContent = s;
    }
    dateInput?.addEventListener('change', updateTimePreview);
    timeInput?.addEventListener('change', updateTimePreview);

    const updatePreviewLocationHandler = () => updateLocationPreview();
    classroomInput?.addEventListener('input', updatePreviewLocationHandler);
    locationInput?.addEventListener('input', updatePreviewLocationHandler);

    if (previewTitle) previewTitle.textContent = titleInput?.value || '活動標題';
    if (previewTag) previewTag.textContent = { 'food':'美食' }[typeInput?.value] || previewTag.textContent;
    if (previewDescription) previewDescription.textContent = descInput?.value || '活動說明將顯示在這裡...';
    updateTimePreview();
    updateLocationPreview();
}

function initMapIfNeeded() {
    const mapEl = document.getElementById('preview-map');
    if (!mapEl) {
        console.warn('找不到地圖容器 #preview-map');
        return;
    }
    if (mapInitialized) {
        console.log('地圖已初始化，跳過');
        return;
    }

    console.log('初始化 Leaflet 地圖...');
    const defaultLat = 25.033964;
    const defaultLng = 121.564468;
    
    try {
        previewMap = L.map('preview-map', { preferCanvas: true }).setView([defaultLat, defaultLng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(previewMap);

        previewMarker = L.marker([defaultLat, defaultLng], { draggable: false }).addTo(previewMap);
        previewMarker.bindPopup('活動地點');

        mapInitialized = true;
        window.previewMap = previewMap;
        window.previewMarker = previewMarker;
        window.mapInitialized = true;
        
        console.log('✅ 地圖初始化成功');
    } catch (err) {
        console.error('❌ 地圖初始化失敗:', err);
    }
}

// ===== 🎯 修正：更新地點預覽與地圖顯示邏輯 =====
function updateLocationPreview() {
    const locationType = document.querySelector('input[name="location_type"]:checked')?.value;
    const previewLocationEl = document.getElementById('preview-location');
    const mapEl = document.getElementById('preview-map');

    console.log('更新地點預覽, 類型:', locationType);

    if (!previewLocationEl) {
        console.warn('找不到 #preview-location 元素');
        return;
    }

    if (locationType === 'on_campus') {
        // 校內：顯示教室文字，隱藏地圖
        const classroom = document.getElementById('classroom')?.value || '';
        previewLocationEl.textContent = classroom || '校內教室';
        if (mapEl) {
            mapEl.style.display = 'none';
            console.log('隱藏地圖 (校內模式)');
        }
    } else {
        // ★ 校外：立即顯示地圖並初始化
        const address = document.getElementById('activity-location')?.value || '';
        previewLocationEl.textContent = address || '活動地點';

        if (mapEl) {
            mapEl.style.display = 'block';
            console.log('顯示地圖 (校外模式)');
            
            // 立即初始化地圖（如果尚未初始化）
            initMapIfNeeded();
            
            // 如果地圖已初始化，更新位置
            if (mapInitialized && previewMap && previewMarker) {
                const lat = parseFloat(document.getElementById('selected-latitude')?.value) || null;
                const lng = parseFloat(document.getElementById('selected-longitude')?.value) || null;
                
                setTimeout(() => {
                    previewMap.invalidateSize();
                    
                    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
                        console.log(`定位到: ${lat}, ${lng}`);
                        previewMap.setView([lat, lng], 15);
                        previewMarker.setLatLng([lat, lng]);
                        previewMarker.bindPopup(`<b>${address || '活動地點'}</b>`).openPopup();
                    } else {
                        // 沒有具體座標，顯示預設位置
                        console.log('使用預設位置 (台北市中心)');
                        const defaultLat = 25.033964;
                        const defaultLng = 121.564468;
                        previewMap.setView([defaultLat, defaultLng], 13);
                        previewMarker.setLatLng([defaultLat, defaultLng]);
                        previewMarker.bindPopup('請輸入地址以定位').openPopup();
                    }
                }, 150);
            }
        }
    }
}

function resetPreview() {
    const previewTitle = document.getElementById('preview-title');
    const previewTag = document.getElementById('preview-tag');
    const previewLocation = document.getElementById('preview-location');
    const previewTime = document.getElementById('preview-time');
    const previewDescription = document.getElementById('preview-description');
    const previewImage = document.querySelector('.preview-image');

    if (previewTitle) previewTitle.textContent = '活動標題';
    if (previewTag) previewTag.textContent = '活動類型';
    if (previewLocation) previewLocation.textContent = '活動地點';
    if (previewTime) previewTime.textContent = '活動時間';
    if (previewDescription) previewDescription.textContent = '活動說明將顯示在這裡...';
    if (previewImage) {
        previewImage.style.backgroundImage = '';
        if (!previewImage.querySelector('.preview-tag')) {
            const tag = document.createElement('div'); tag.className = 'preview-tag'; tag.id = 'preview-tag'; tag.innerText = '活動類型';
            previewImage.appendChild(tag);
        }
    }

    ['selected-address','selected-latitude','selected-longitude','selected-place-id'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const mapEl = document.getElementById('preview-map');
    if (mapEl) mapEl.style.display = 'none';
}

function validateForm() {
    let ok = true;
    const title = document.getElementById('activity-title');
    if (title && !title.value.trim()) { title.style.borderColor = '#e74c3c'; ok = false; setTimeout(() => title.style.borderColor = '', 2000); }
    const type = document.getElementById('activity-type');
    if (type && !type.value) { type.style.borderColor = '#e74c3c'; ok = false; setTimeout(() => type.style.borderColor = '', 2000); }
    const date = document.getElementById('activity-date');
    if (date && !date.value) { date.style.borderColor = '#e74c3c'; ok = false; setTimeout(() => date.style.borderColor = '', 2000); }
    const time = document.getElementById('activity-time');
    if (time && !time.value) { time.style.borderColor = '#e74c3c'; ok = false; setTimeout(() => time.style.borderColor = '', 2000); }

    const locationRadio = document.querySelector('input[name="location_type"]:checked');
    if (!locationRadio) { alert('請選擇地點類型（校內/校外）'); return false; }
    if (locationRadio.value === 'on_campus') {
        const classroom = document.getElementById('classroom');
        if (!classroom || !classroom.value.trim()) { classroom.style.borderColor = '#e74c3c'; ok = false; setTimeout(() => classroom.style.borderColor = '', 2000); }
    } else {
        const addr = document.getElementById('activity-location');
        if (!addr || !addr.value.trim()) { addr.style.borderColor = '#e74c3c'; ok = false; setTimeout(() => addr.style.borderColor = '', 2000); }
    }

    if (!ok) alert('請填寫所有必填欄位');
    return ok;
}

function showSuccessMessage() {
    const msg = document.createElement('div');
    msg.textContent = '建立成功！';
    Object.assign(msg.style, {
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        backgroundColor: 'rgba(0,128,0,0.9)', color: '#fff', padding: '18px 28px', borderRadius: '10px', zIndex: 9999
    });
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 1500);
}