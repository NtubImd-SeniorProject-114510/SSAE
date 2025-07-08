// 隨機數產生器（可重現）
function randomNumber(min, max, seed) {
    const x = Math.sin(seed) * 10000;
    const raw = x - Math.floor(x);
    return raw * (max - min) + min;
}

// 初始化背景動畫 blobs
function initBlobs() {
    const blobs = document.querySelectorAll('.blob');

    blobs.forEach((blob, index) => {
        const seed = index + 100;

        // 設定初始位置
        const initialXPercent = randomNumber(10, 90, seed + 10);
        const initialYPercent = randomNumber(10, 90, seed + 11);
        blob.style.left = `${initialXPercent}%`;
        blob.style.top = `${initialYPercent}%`;

        // 建立動畫 keyframes
        const keyframes = [
            { transform: `translate(${randomNumber(-25, 25, seed + 20)}%, ${randomNumber(-25, 25, seed + 21)}%)` },
            { transform: `translate(${randomNumber(-25, 25, seed + 22)}%, ${randomNumber(-25, 25, seed + 23)}%)` },
            { transform: `translate(${randomNumber(-25, 25, seed + 24)}%, ${randomNumber(-25, 25, seed + 25)}%)` },
            { transform: `translate(${randomNumber(-25, 25, seed + 26)}%, ${randomNumber(-25, 25, seed + 27)}%)` }
        ];

        // 啟用動畫
        blob.animate(keyframes, {
            duration: 8000 + index * 1000,
            iterations: Infinity,
            direction: 'alternate',
            easing: 'ease-in-out'
        });
    });
}



// 當前對話ID
let currentId = null;
let conversations = [];
let nextSeq = 1;

// DOM元素
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menuBtn');
const mainContent = document.getElementById('mainContent');
const currentChatTitle = document.getElementById('currentChatTitle');
const newChatBtn = document.getElementById('newChatBtn');
const chatHistoryEl = document.getElementById('chatHistory');
const chatContainer = document.getElementById('chatContainer');
const noMessagesEl = document.getElementById('noMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

// 建立統一檔案上傳按鈕
const headerArea = currentChatTitle.parentElement;
const uploadContainer = document.createElement('div');
uploadContainer.className = 'upload-container';
uploadContainer.innerHTML = `
    <label for="fileUpload" class="upload-btn">
        <i class="fa-solid fa-upload"></i>
        <span>上傳檔案</span>
    </label>
    <input type="file" id="fileUpload" accept=".pdf,.zip" style="display:none" />
    
    <div id="floating-progress" style="display:none; position:absolute; top:120%; left:80%; margin-left:10px; background:white; border:1px solid #ccc; padding:15px; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.15); z-index:1000; width:280px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <div id="progressText" style="font-size:14px; color:#333; margin-bottom:8px;">準備上傳...</div>
        <div style="background:#f0f0f0; height:8px; border-radius:4px; overflow:hidden;">
            <div id="progressBar" style="background:linear-gradient(90deg, #4CAF50, #45a049); height:100%; width:0%; border-radius:4px; transition:width 0.3s ease;"></div>
        </div>
        <div id="fileInfo" style="font-size:12px; color:#666; margin-top:5px;"></div>
    </div>
`;

// 插入到標題區域的右側
headerArea.style.display = 'flex';
headerArea.style.justifyContent = 'space-between';
headerArea.style.alignItems = 'center';
headerArea.appendChild(uploadContainer);

// 綁定檔案選擇事件
document.getElementById('fileUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        uploadFile(file);
    }
});

// 統一檔案上傳函數
function uploadFile(file) {
    // 檢查檔案類型
    const fileName = file.name.toLowerCase();
    const validTypes = ['.pdf', '.zip'];
    const isValidType = validTypes.some(type => fileName.endsWith(type));
    
    if (!isValidType) {
        alert("請選擇 PDF 或 ZIP 檔案！");
        return;
    }
    
    const formData = new FormData();
    formData.append("file", file);
    
    const progressBox = document.getElementById("floating-progress");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    const fileInfo = document.getElementById("fileInfo");
    
    // 顯示進度框
    progressBox.style.display = "block";
    progressBar.style.width = "0%";
    progressText.innerText = "正在上傳...";
    fileInfo.innerText = `檔案: ${file.name} (${formatFileSize(file.size)})`;
    
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/upload_files/", true);
    
    // 上傳進度
    xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
            const percentage = Math.round((e.loaded / e.total) * 100);
            progressBar.style.width = percentage + "%";
            progressText.innerText = `上傳中... ${percentage}%`;
        }
    };
    
    // 上傳完成
    xhr.onload = () => {
        try {
            const res = JSON.parse(xhr.responseText);
            
            if (res.status === 'success' || res.message) {
                progressBar.style.width = "100%";
                progressText.innerHTML = "" + (res.message || "上傳成功");
                
                // 顯示檔案處理結果
                if (fileName.endsWith('.pdf')) {
                    fileInfo.innerText = "PDF 檔案已成功上傳並加入知識庫";
                } else if (fileName.endsWith('.zip')) {
                    fileInfo.innerText = "ZIP 檔案已解壓縮，PDF 檔案已加入知識庫";
                }
                
                // 3秒後自動隱藏
                setTimeout(() => {
                    progressBox.style.display = "none";
                    // 重置檔案輸入
                    document.getElementById('fileUpload').value = '';
                }, 3000);
                
            } else {
                progressText.innerHTML = `❌ 錯誤：${res.error}`;
                fileInfo.innerText = "上傳失敗，請重試";
                setTimeout(() => progressBox.style.display = "none", 5000);
            }
        } catch (error) {
            progressText.innerHTML = "❌ 回應解析錯誤";
            fileInfo.innerText = "伺服器回應格式錯誤";
            setTimeout(() => progressBox.style.display = "none", 5000);
        }
    };
    
    // 上傳錯誤
    xhr.onerror = () => {
        progressText.innerHTML = "❌ 網路錯誤";
        fileInfo.innerText = "請檢查網路連線並重試";
        setTimeout(() => progressBox.style.display = "none", 5000);
    };
    
    // 上傳超時
    xhr.ontimeout = () => {
        progressText.innerHTML = "❌ 上傳超時";
        fileInfo.innerText = "檔案可能過大，請重試";
        setTimeout(() => progressBox.style.display = "none", 5000);
    };
    
    // 設置30秒超時
    xhr.timeout = 30000;
    
    xhr.send(formData);
}

// 格式化檔案大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 拖拽上傳功能（可選）
function initDragAndDrop() {
    const uploadBtn = document.querySelector('.upload-btn');
    
    // 防止頁面默認拖拽行為
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // 拖拽進入上傳按鈕區域
    uploadBtn.addEventListener('dragenter', () => {
        uploadBtn.style.backgroundColor = '#0056b3';
        uploadBtn.style.transform = 'scale(1.05)';
    });
    
    uploadBtn.addEventListener('dragleave', () => {
        uploadBtn.style.backgroundColor = '';
        uploadBtn.style.transform = '';
    });
    
    // 拖拽放下
    uploadBtn.addEventListener('drop', (e) => {
        uploadBtn.style.backgroundColor = '';
        uploadBtn.style.transform = '';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            uploadFile(files[0]);
        }
    });
}

// 側邊欄切換
let sidebarOpen = false;
menuBtn.addEventListener('click', () => {
    sidebarOpen = !sidebarOpen;
    if (sidebarOpen) {
        sidebar.classList.remove('collapsed');
        menuBtn.classList.add('open');
        document.body.classList.remove('sidebar-collapsed');
    } else {
        sidebar.classList.add('collapsed');
        menuBtn.classList.remove('open');
        document.body.classList.add('sidebar-collapsed');
    }
});

// 從API載入對話列表
async function loadConvos() {
    try {
        const res = await fetch('/api/conversations/');
        conversations = (await res.json()).conversations;
        nextSeq = conversations.length + 1;
        renderConvos();
    } catch (error) {
        console.error('載入對話失敗:', error);
    }
}

// 渲染對話列表
function renderConvos() {
    chatHistoryEl.innerHTML = '';
    conversations.forEach(c => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        if (c.id === currentId) chatItem.classList.add('active');
        
        chatItem.innerHTML = `
            <div class="chat-title">${c.title}</div>
            <div class="chat-actions">
                <button class="action-btn download-btn" data-id="${c.id}">
                    <i class="fa-solid fa-download"></i>
                    <span class="tooltip">匯出對話</span>
                </button>
                <button class="action-btn delete-btn" data-id="${c.id}">
                    <i class="fa-solid fa-trash"></i>
                    <span class="tooltip">刪除對話</span>
                </button>
            </div>
        `;

        chatItem.addEventListener('click', (e) => {
            // 如果點擊的是操作按鈕，不要切換對話
            if (!e.target.closest('.action-btn')) {
                selectConvo(c.id);
            }
        });
        
        chatHistoryEl.appendChild(chatItem);
    });

    // 綁定匯出按鈕事件
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            window.location.assign(`/api/export/${id}/`);
        });
    });

    // 綁定刪除按鈕事件
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            if (!confirm('確定刪除此對話？')) return;
            
            try {
                await fetch(`/api/conversations/${id}/`, { method: 'DELETE' });
                conversations = conversations.filter(x => x.id !== id);
                if (currentId === id) {
                    currentId = null;
                    chatContainer.innerHTML = '';
                    noMessagesEl.style.display = 'block';
                    currentChatTitle.innerText = '對話';
                }
                renderConvos();
            } catch (error) {
                console.error('刪除對話失敗:', error);
            }
        });
    });
}

// 選擇對話
async function selectConvo(id) {
    try {
        currentId = id;
        document.querySelectorAll(".chat-item").forEach(item => item.classList.remove("active"));
        document.querySelector(`.chat-item:has([data-id="${id}"])`)?.classList.add("active");
        
        const res = await fetch(`/api/messages/${id}/`);
        const data = await res.json();
        renderMessages(data.messages);
        
        // 更新標題
        const convo = conversations.find(c => c.id === id);
        if (convo) {
            currentChatTitle.innerText = convo.title;
        }
        
        // 手機版自動關閉側邊欄
        if (window.innerWidth <= 768) {
            sidebar.classList.add('collapsed');
            menuBtn.classList.remove('open');
            document.body.classList.add('sidebar-collapsed');
            sidebarOpen = false;
        }
    } catch (error) {
        console.error('載入對話內容失敗:', error);
    }
}

// 渲染對話訊息
function renderMessages(messages) {
    chatContainer.innerHTML = '';
    noMessagesEl.style.display = messages.length ? 'none' : 'block';
    
    messages.forEach(msg => {
        // 用戶訊息
        const userMsg = document.createElement('div');
        userMsg.className = 'message-container user-container';
        userMsg.innerHTML = `
            <div class="message-content user-content">${msg.question}</div>
            <div class="avatar user-avatar">你</div>
        `;
        chatContainer.appendChild(userMsg);
        
        // 機器人訊息
        const botMsg = document.createElement('div');
        botMsg.className = 'message-container bot-container';
        botMsg.innerHTML = `
            <div class="avatar bot-avatar">AI</div>
            <div class="message-content bot-content">${msg.answer}</div>
        `;
        chatContainer.appendChild(botMsg);
    });
    
    // 滾動到最新訊息
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 建立新對話
newChatBtn.addEventListener('click', async () => {
    try {
        const title = `新對話${nextSeq++}`;
        const res = await fetch("/api/conversations/", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({title})
        });
        
        const newConvo = await res.json();
        currentId = newConvo.id;
        await loadConvos();
        selectConvo(newConvo.id);
    } catch (error) {
        console.error('建立新對話失敗:', error);
    }
});

// 發送訊息
// 發送訊息
async function sendQuestion() {
    const questionEl = document.getElementById('messageInput');
    const question = questionEl.value.trim();
    
    if (!question || !currentId) return;
    
    // 清空輸入框並調整高度
    questionEl.value = '';
    adjustTextareaHeight();
    
    try {
        // 在聊天區域加入用戶訊息
        const userMsg = document.createElement('div');
        userMsg.className = 'message-container user-container';
        userMsg.innerHTML = `
            <div class="message-content user-content">${question}</div>
            <div class="avatar user-avatar">你</div>
        `;
        chatContainer.appendChild(userMsg);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // 在聊天區域加入機器人正在輸入的指示
        const loadingMsg = document.createElement('div');
        loadingMsg.className = 'message-container bot-container';
        loadingMsg.innerHTML = `
            <div class="avatar bot-avatar">AI</div>
            <div class="message-content bot-content loading-dots">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </div>
        `;
        chatContainer.appendChild(loadingMsg);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // 發送到後端
        const res = await fetch("/api/ask/", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({conversation_id: currentId, question: question})
        });
        
        const data = await res.json();
        
        // 移除載入指示器
        chatContainer.removeChild(loadingMsg);
        
        // 建立機器人回覆內容
        let botContent = `<div class="message-content bot-content">${data.answer || data.error}`;
        
        // 如果有來源文檔，添加查看按鈕
        if (data.has_sources && data.sources && data.sources.length > 0) {
            botContent += `
                <div class="source-indicator" style="margin-top: 8px;">
                    <button class="source-btn" onclick="showSources(${JSON.stringify(data.sources).replace(/"/g, '&quot;')})">
                        🗒️ 查看資料來源
                    </button>
                </div>
            `;
        }
        
        botContent += `</div>`;
        
        // 在聊天區域加入機器人回覆
        const botMsg = document.createElement('div');
        botMsg.className = 'message-container bot-container';
        botMsg.innerHTML = `
            <div class="avatar bot-avatar">AI</div>
            ${botContent}
        `;
        chatContainer.appendChild(botMsg);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // 更新對話標題（如果是第一條訊息）
        const convo = conversations.find(c => c.id === currentId);
        if (convo && (!convo.title || convo.title.startsWith('新對話'))) {
            const title = question.length > 25 ? question.substring(0, 25) + '...' : question;
            await fetch(`/api/conversations/${currentId}/`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({title: title})
            });
            currentChatTitle.innerText = title;
            await loadConvos();
        }
    } catch (error) {
        console.error('發送問題失敗:', error);
    }
}

// 新增顯示來源的函數
function showSources(sources) {
    const modal = document.createElement('div');
    modal.className = 'source-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 500px;
        width: 90%;
        max-height: 80%;
        overflow-y: auto;
    `;
    
    let sourcesHtml = '<h3>資料來源</h3>';
    sources.forEach(source => {
        sourcesHtml += `
            <div style="margin: 10px 0;">
                <button onclick="viewPDF('${source}')" style="
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    text-decoration: none;
                    display: inline-block;
                ">
                    📄 ${source}
                </button>
            </div>
        `;
    });
    
    sourcesHtml += `
        <div style="margin-top: 20px; text-align: right;">
            <button onclick="this.closest('.source-modal').remove()" style="
                background: #6c757d;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
            ">關閉</button>
        </div>
    `;
    
    modalContent.innerHTML = sourcesHtml;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // 點擊背景關閉
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 新增查看 PDF 的函數
function viewPDF(filename) {
    window.open(`/api/pdf/${filename}/`, '_blank');
}

// 發送按鈕點擊事件
sendBtn.addEventListener('click', sendQuestion);

// Enter鍵發送(Shift+Enter換行)
messageInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendQuestion();
    }
});

// 自適應文本輸入框高度
function adjustTextareaHeight() {
    messageInput.style.height = 'auto';
    messageInput.style.height = (messageInput.scrollHeight) + 'px';
}

messageInput.addEventListener('input', adjustTextareaHeight);

// 初始化
(async () => {
    await loadConvos();
    
    // 初始化拖拽上傳功能
    initDragAndDrop();
    initBlobs();
    
    // 初始對話選擇
    if (conversations.length) {
        selectConvo(conversations[0].id);
    } else {
        newChatBtn.click();
    }
    
    // 默認收起側邊欄，無論窗口大小
    sidebar.classList.add('collapsed');
    menuBtn.classList.remove('open');
    document.body.classList.add('sidebar-collapsed');
    sidebarOpen = false;
})();

// 窗口大小調整時的行為
window.addEventListener('resize', () => {
    if (window.innerWidth <= 768 && !sidebar.classList.contains('collapsed')) {
        sidebar.classList.add('collapsed');
        menuBtn.classList.remove('open');
        document.body.classList.add('sidebar-collapsed');
        sidebarOpen = false;
    }
});