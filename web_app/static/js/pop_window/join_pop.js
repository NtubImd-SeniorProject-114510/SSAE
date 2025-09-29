// join_pop.js - 發起揪團彈跳視窗功能（Leaflet + Nominatim 自動補全）
// 修正版本 - 解決人數按鈕和地址自動補全問題

document.addEventListener('DOMContentLoaded', () => {
    initCreateActivity();
    initPreview();
    initLocationAutocomplete(); // 修正函數名稱
    initNumberButtons(); // 修正函數名稱
    // Map 不會在 DOMContentLoaded 直接初始化（因為預覽地圖預設 hidden），
    // 會在需要顯示地圖時建立（initMapIfNeeded）。
});

// 全域變數
let previewMap = null;
let previewMarker = null;
let mapInitialized = false;

// ---------------- 初始化表單、開關、圖片、送出 ----------------
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

    // ====== 安全通知（showNotification 失敗就退回 alert）======
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

    // ====== 審查相關：錯誤抽取 + 從模板讀禁用詞 ======
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
        if (/禁止|不當|禁用/.test(msg)) {
            msg = '輸入內容包含禁止或不當詞彙，請重新編輯。';
        } else if (/csrf|forbidden|禁止存取|驗證/i.test(msg)) {
            msg = '驗證逾時或未登入，請重新登入後再試。';
        }
        return msg;
    }

    const BANNED_WORDS = (() => {
        try {
            const el = document.getElementById('bannedWords');
            return el ? JSON.parse(el.textContent) : [];
        } catch (_) {
            return [];
        }
    })();

    const hitBanned = (text='') => {
        const t = String(text).toLowerCase();
        return BANNED_WORDS.some(w => t.includes(String(w).toLowerCase()));
    };

    // 圖片上傳、拖放
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

    // 表單提交
    createGroupForm?.addEventListener('submit', async e => {
        e.preventDefault();
        if (!validateForm()) return;

        // ★★★ 前端禁用詞審查：命中就顯示一句話並停止送出
        const title = document.getElementById('activity-title')?.value || '';
        const desc  = document.getElementById('activity-description')?.value || '';
        if (hitBanned(`${title}\n${desc}`)) {
            safeNotify('error', '輸入內容包含禁止或不當詞彙，請重新編輯。');
            return;
        }

        // 若選校內，統一填 selected-address 為教室
        const locationRadio = document.querySelector('input[name="location_type"]:checked');
        const selectedAddress = document.getElementById('selected-address');
        if (locationRadio?.value === 'on_campus') {
            const classroom = document.getElementById('classroom')?.value.trim();
            if (selectedAddress) selectedAddress.value = classroom || '校內教室';
        }

        const formData = new FormData(createGroupForm);

        try {
            const res = await fetch('/activities/create/', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: formData,
                credentials: 'same-origin' // 帶 cookie，避免 CSRF 失敗
            });

            let data = null;
            let rawText = '';
            try { data = await res.json(); } catch { try { rawText = await res.text(); } catch {} }

            // 失敗分支：只顯示一句話（統一處理）
            if (!res.ok || !(data?.success ?? data?.ok)) {
                let msg = extractOneMessage(data, rawText) || '輸入內容包含禁止或不當詞彙，請重新編輯。';
                safeNotify('error', msg);
                return;
            }

            // 成功分支
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

// ---------------- 圖片處理 ----------------
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
            // 確保 tag 存在
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

// ---------------- 人數加減按鈕（修正函數名稱）----------------
function initNumberButtons() {
    document.querySelectorAll('.num-btn').forEach(btn => {
        btn.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation(); // 防止事件冒泡
            
            const targetId = this.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) {
                console.error('找不到目標輸入框:', targetId);
                return;
            }
            
            let v = parseInt(input.value) || 0;
            const min = parseInt(input.min) || 1;
            const max = parseInt(input.max) || 999;
            
            if (this.classList.contains('plus-btn')) {
                v++;
            } else if (this.classList.contains('minus-btn')) {
                v--;
            }
            
            // 確保數值在合理範圍內
            if (v < min) v = min;
            if (v > max) v = max;
            
            input.value = v;
            
            // 觸發 input event（若有其他監聽）
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            
            console.log(`按鈕點擊: ${targetId} = ${v}`);
        }, { passive: false });
    });
    
    console.log('人數按鈕初始化完成，找到', document.querySelectorAll('.num-btn').length, '個按鈕');
}

// ---------------- 地點自動補全 (Nominatim)（修正函數名稱）----------------
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
        
        // 若空值就直接隱藏地圖（但不改已選經緯）
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
                            // 顯示地圖並定位
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

    // 點頁面其他處關閉建議清單
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.innerHTML = '';
            suggestionsBox.style.display = 'none';
        }
    });
    
    console.log('地址自動補全初始化完成');
}

// ---------------- preview（文字、時間、地點） ----------------
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

    // 監聽地點類型變更
    document.querySelectorAll('input[name="location_type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const locationType = this.value;
            const classroomField = document.getElementById('classroom-field');
            const locationField = document.getElementById('location-field');
            
            if (locationType === 'on_campus') {
                classroomField.style.display = 'block';
                locationField.style.display = 'none';
            } else {
                classroomField.style.display = 'none';
                locationField.style.display = 'block';
            }
            
            updateLocationPreview();
        });
    });

    // title
    titleInput?.addEventListener('input', () => {
        if (previewTitle) previewTitle.textContent = titleInput.value || '活動標題';
    });

    // type -> tag
    typeInput?.addEventListener('change', () => {
        if (!previewTag) return;
        const map = { 'food':'美食','sport':'運動','study':'讀書','travel':'旅遊','movie':'電影','other':'其他' };
        previewTag.textContent = map[typeInput.value] || '活動類型';
    });

    // desc
    descInput?.addEventListener('input', () => {
        if (previewDescription) previewDescription.textContent = descInput.value || '活動說明將顯示在這裡...';
    });

    // date/time
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

    // location preview triggers (classroom or location input)
    const updatePreviewLocationHandler = () => updateLocationPreview();
    classroomInput?.addEventListener('input', updatePreviewLocationHandler);
    locationInput?.addEventListener('input', updatePreviewLocationHandler);

    // 初始化一次
    if (previewTitle) previewTitle.textContent = titleInput?.value || '活動標題';
    if (previewTag) previewTag.textContent = { 'food':'美食' }[typeInput?.value] || previewTag.textContent;
    if (previewDescription) previewDescription.textContent = descInput?.value || '活動說明將顯示在這裡...';
    updateTimePreview();
    updateLocationPreview();
}

// ---------------- Map 初始化（延後到第一次需要顯示時） ----------------
function initMapIfNeeded() {
    const mapEl = document.getElementById('preview-map');
    if (!mapEl) return;
    if (mapInitialized) return;

    // 建立地圖
    const defaultLat = 25.033964;
    const defaultLng = 121.564468;
    previewMap = L.map('preview-map', { preferCanvas: true }).setView([defaultLat, defaultLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(previewMap);

    previewMarker = L.marker([defaultLat, defaultLng], { draggable: false }).addTo(previewMap);
    previewMarker.bindPopup('活動地點');

    mapInitialized = true;
}

// ---------------- 更新地點預覽與地圖顯示 ----------------
function updateLocationPreview() {
    const locationType = document.querySelector('input[name="location_type"]:checked')?.value;
    const previewLocationEl = document.getElementById('preview-location');
    const mapEl = document.getElementById('preview-map');

    if (!previewLocationEl) return;

    if (locationType === 'on_campus') {
        // 校內：顯示教室文字，隱藏地圖
        const classroom = document.getElementById('classroom')?.value || '';
        previewLocationEl.textContent = classroom || '校內教室';
        if (mapEl) mapEl.style.display = 'none';
    } else {
        // 校外：顯示地址文字，顯示地圖（初始化 map）
        const address = document.getElementById('activity-location')?.value || '';
        previewLocationEl.textContent = address || '活動地點';

        // 顯示 map 容器並初始化（若尚未）
        if (mapEl) mapEl.style.display = 'block';
        initMapIfNeeded();
        // 若 map 已初始化，定位到 selected-lat/lon（或預設）
        if (mapInitialized && previewMap && previewMarker) {
            const lat = parseFloat(document.getElementById('selected-latitude')?.value) || null;
            const lng = parseFloat(document.getElementById('selected-longitude')?.value) || null;
            // 若有 lat/lng，使用；否則嘗試用地址搜尋後的值（autocomplete 已會填入 selected-latitude）
            const useLat = (lat !== null && !isNaN(lat));
            const useLng = (lng !== null && !isNaN(lng));
            setTimeout(() => {
                previewMap.invalidateSize();
                if (useLat && useLng) {
                    previewMap.setView([lat, lng], 15);
                    previewMarker.setLatLng([lat, lng]);
                    previewMarker.bindPopup(`<b>${address || '活動地點'}</b>`).openPopup();
                }
            }, 120);
        }
    }
}

// ---------------- reset preview ----------------
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

    // reset hidden location inputs
    ['selected-address','selected-latitude','selected-longitude','selected-place-id'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // hide map container
    const mapEl = document.getElementById('preview-map');
    if (mapEl) mapEl.style.display = 'none';
}

// ---------------- 表單驗證（簡單） ----------------
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

// ---------------- 成功訊息 ----------------
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