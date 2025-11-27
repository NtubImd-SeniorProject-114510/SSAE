// 全域變數定義
let currentId = null;
let conversations = [];
let nextSeq = 1;
let sidebar, menuBtn, mainContent, currentChatTitle, newChatBtn, chatHistoryEl, chatContainer, noMessagesEl, messageInput, sendBtn;

// 文字區域自適應高度函數
function adjustTextareaHeight(textarea) {
    if (!textarea) {
        textarea = messageInput || document.getElementById('messageInput');
    }
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
}

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

// —— 校規問題跨頁帶入工具 —— //
let _prefillApplied = false;

function _getPrefillFromStorageOrURL() {
  // 1) 先看 sessionStorage（index 帶過來）
  const KEY = 'rules_prefill';
  let text = sessionStorage.getItem(KEY) || '';
  if (text) sessionStorage.removeItem(KEY);

  // 2) 再看 URL ?prefill=... &autoAsk=1
  const usp = new URLSearchParams(window.location.search);
  const urlText = usp.get('prefill');
  const autoAsk = usp.get('autoAsk') === '1';

  if (!text && urlText) text = decodeURIComponent(urlText);

  // 清掉網址上的 prefill/autoAsk 參數，保持乾淨
  if (urlText || autoAsk) {
    usp.delete('prefill');
    usp.delete('autoAsk');
    const clean = `${location.pathname}${usp.toString() ? '?' + usp.toString() : ''}${location.hash || ''}`;
    history.replaceState(null, '', clean);
  }

  return { text: (text || '').trim(), autoAsk };
}

async function _maybeApplyPrefill() {
  if (_prefillApplied) return;               // 只灌一次
  const { text, autoAsk } = _getPrefillFromStorageOrURL();
  if (!text) return;

  const field = messageInput || document.getElementById('messageInput');
  if (!field) return;
  field.value = text;
  adjustTextareaHeight(field);
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.focus();

  if (autoAsk && currentId) {
    // 直接送出（沿用你的 sendQuestion）
    await sendQuestion();
  }

  _prefillApplied = true;
}

// 👉 直接貼上，完整取代你現在的那段
document.addEventListener('DOMContentLoaded', () => {
  // ⚠️ 不在這裡重新宣告 currentId / conversations / nextSeq
  // 這些請用檔案上方既有的全域變數

  // 將 DOM 元素「賦值給全域變數」，避免陰影遮蔽
  sidebar          = document.getElementById('sidebar');
  menuBtn          = document.getElementById('menuBtn');
  mainContent      = document.getElementById('mainContent');
  currentChatTitle = document.getElementById('currentChatTitle');
  newChatBtn       = document.getElementById('newChatBtn');
  chatHistoryEl    = document.getElementById('chatHistory');
  chatContainer    = document.getElementById('chatContainer');
  noMessagesEl     = document.getElementById('noMessages');
  messageInput     = document.getElementById('messageInput');
  sendBtn          = document.getElementById('sendBtn');

  // === 建立統一檔案上傳按鈕（放在標題右側） ===
  if (currentChatTitle && currentChatTitle.parentElement) {
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

    headerArea.style.display = 'flex';
    headerArea.style.justifyContent = 'space-between';
    headerArea.style.alignItems = 'center';
    headerArea.appendChild(uploadContainer);

    // 綁定檔案選擇事件（放這裡最安全）
    const fileInput = uploadContainer.querySelector('#fileUpload');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) uploadFile(file);
      });
    }
  } else {
    console.warn('[chat] 找不到 currentChatTitle 或其 parentElement，略過上傳按鈕插入。');
  }

  // === 發問送出事件 ===
  if (sendBtn && messageInput) {
    // 直接使用你的 sendQuestion()
    sendBtn.addEventListener('click', sendQuestion);

    // Enter 送出（Shift+Enter 換行）
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendQuestion();
      }
    });

    // 自適應高度（若你已有 adjustTextareaHeight，就會生效）
    messageInput.addEventListener('input', () => {
      try { adjustTextareaHeight(messageInput); } catch { /* 兼容舊版 */ adjustTextareaHeight?.(); }
    });
  }

  // === 側邊欄切換功能 ===
  if (menuBtn && sidebar) {
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
  }

  // === 新對話按鈕事件 ===
  if (newChatBtn) {
    newChatBtn.addEventListener('click', createNewChat);
  }

  // === 進頁後嘗試把 index 帶來的問題灌入（並在已有對話且 autoAsk=1 時自動送出）===
  try { _maybeApplyPrefill(); } catch (e) { console.warn('_maybeApplyPrefill 執行失敗：', e); }
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

// 側邊欄切換變數
let sidebarOpen = false;

// 從API載入對話列表（修正版：失敗時顯示訪客提示）
async function loadConvos() {
    try {
        const res = await fetch('/api/conversations/');
        conversations = (await res.json()).conversations;
        nextSeq = conversations.length + 1;
        renderConvos();
    } catch (error) {
        console.error('載入對話失敗:', error);
        // 若發生錯誤，視為沒有對話 -> 顯示訪客提示
        conversations = [];
        renderConvos();
    }
}

// 渲染對話列表（含 historyTitle、訪客/已登入差異與 CTA）
function renderConvos() {
    const historyTitle = document.getElementById('historyTitle');
    chatHistoryEl.innerHTML = '';

    const isAuth = !!window.IS_AUTH; // 確保為布林

    // 沒有對話的狀況
    if (!conversations || conversations.length === 0) {
        // 設定標題（存在就改）
        if (historyTitle) {
            historyTitle.textContent = isAuth
                ? '對話歷史'
                : '訪客模式';
        }

        if (!isAuth) {
            // 訪客提示
            const guestNotice = document.createElement('div');
            guestNotice.className = 'guest-notice';
            guestNotice.style.cssText = `
                padding: 15px;
                text-align: center;
                color: #666;
                font-size: 14px;
                border-radius: 8px;
                background: #f8f9fa;
                margin: 10px;
            `;
            guestNotice.innerHTML = '👤 訪客模式<br/>對話記錄不會被保存';
            chatHistoryEl.appendChild(guestNotice);
        } else {
            // 已登入但尚無對話：顯示 CTA（使用 newChatBtn 重用既有邏輯）
            const emptyNotice = document.createElement('div');
            emptyNotice.className = 'empty-notice';
            emptyNotice.style.cssText = `
                padding: 18px;
                text-align: center;
                color: #444;
                font-size: 14px;
                border-radius: 8px;
                background: #ffffff;
                margin: 10px;
                border: 1px dashed #e0e0e0;
            `;
            emptyNotice.innerHTML = `
                <div style="margin-bottom:10px;">尚無對話 — 您可以建立第一個對話來開始使用。</div>
                <div><button id="createFirstChatBtn" style="
                    background:#007bff;color:#fff;border:0;padding:8px 12px;border-radius:6px;cursor:pointer;
                ">建立第一個對話</button></div>
            `;
            chatHistoryEl.appendChild(emptyNotice);

            // 綁定按鈕
            const createBtn = document.getElementById('createFirstChatBtn');
            if (createBtn) {
                createBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    // 如果你已經有 newChatBtn 的處理流程，直接呼叫它最方便
                    if (typeof newChatBtn !== 'undefined' && newChatBtn) {
                        newChatBtn.click();
                    } else {
                        // fallback：呼叫 API 建立並載入
                        (async () => {
                            try {
                                const title = `新對話${nextSeq++}`;
                                const res = await fetch("/api/conversations/", {
                                    method: "POST",
                                    headers: {"Content-Type": "application/json"},
                                    body: JSON.stringify({title})
                                });
                                const newConvo = await res.json();
                                await loadConvos();
                                selectConvo(newConvo.id);
                            } catch (err) {
                                console.error('建立對話失敗：', err);
                            }
                        })();
                    }
                });
            }
        }

        return; // 無對話就結束
    }

    // 有對話：設定標題
    if (historyTitle) historyTitle.textContent = '對話歷史';

    // 原本的對話列表渲染邏輯（保持你既有內容）
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
        await _maybeApplyPrefill();   // ← 新增：選好對話後嘗試灌字／自動送出
        
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
        // 顯示使用者提問
        const userMsg = document.createElement('div');
        userMsg.className = 'message-container user-container';
        userMsg.innerHTML = `
            <div class="message-content user-content">${msg.question}</div>
            <div class="avatar user-avatar">你</div>
        `;
        chatContainer.appendChild(userMsg);

        // 顯示 AI 回答（含來源）
        const botMsg = document.createElement('div');
        botMsg.className = 'message-container bot-container';

        // 主體內容
        let botContent = `<div class="message-content bot-content">${msg.answer}`;

        // 加入 PDF 資料來源按鈕（如果有）
        const sources = msg.sources || [];
        if (sources.length > 0) {
            botContent += `<div class="source-indicator"><button class="source-btn" onclick="showSources(${JSON.stringify(sources).replace(/"/g, '&quot;')})">📑</button></div>`;
        }

        botContent += `</div>`;

        botMsg.innerHTML = `
            <div class="avatar bot-avatar">AI</div>
            ${botContent}
        `;

        chatContainer.appendChild(botMsg);
    });

    // 滾動到最底部
    chatContainer.scrollTop = chatContainer.scrollHeight;
}


// 建立新對話函數
async function createNewChat() {
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
}


/* =========================
   ✅ 安全提示工具（不依賴現有 showMessage）
   ========================= */
function _safeShowMessage(text, type = 'error') {
  try {
    if (typeof showMessage === 'function') return showMessage(text, type);
  } catch (_) {}
  // 後備：至少給個可見的提示，不會讓程式壞掉
  if (type === 'error') console.error(text);
  else console.log(text);
  try { alert(text); } catch (_) {}
}

/* =========================
   ✅ 確保 currentId 再送出
   （不改動你其它流程）
   ========================= */
async function ensureConversationReady() {
  // 已經有 currentId
  if (window.currentId) return true;

  // 有既有對話 → 選第一個
  if (Array.isArray(window.conversations) && window.conversations.length) {
    if (typeof selectConvo === 'function') {
      await selectConvo(window.conversations[0].id);
      return true;
    }
  }

  // 已登入 → 建立一個新對話（沿用你的 API）
  if (window.IS_AUTH && typeof fetch === 'function') {
    try {
      const title = `新對話${(window.conversations?.length || 0) + 1}`;
      const res = await fetch("/api/conversations/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ title })
      });
      const newConvo = await res.json();
      if (!newConvo?.id) throw new Error('no id in create conversation response');

      window.currentId = newConvo.id;
      if (typeof loadConvos === 'function') await loadConvos();
      if (typeof selectConvo === 'function') await selectConvo(newConvo.id);
      return true;
    } catch (e) {
      console.error('[chat] 建立對話失敗：', e);
      _safeShowMessage('建立對話失敗，請稍後再試', 'error');
      return false;
    }
  }

  // 訪客且沒有 currentId：明確提示
  _safeShowMessage('請先建立一個對話再發送訊息', 'error');
  return false;
}

/* =========================
   ✅ 修正版送出：先確保對話 → 再清空 → 先畫使用者訊息 → 打 API
   並加上「送出中鎖定」避免重複點擊
   ========================= */
let _sendingLock = false;

async function sendQuestion() {
  const field = window.messageInput || document.getElementById('messageInput');
  const sendBtn = window.sendBtn || document.getElementById('sendBtn');
  const text = (field?.value || '').trim();

  if (!field) {
    _safeShowMessage('找不到訊息輸入框', 'error');
    return;
  }
  if (!text) {
    _safeShowMessage('請先輸入問題', 'error');
    return;
  }
  if (_sendingLock) return; // 防重複送

  // 先確保 currentId（必要時自動選或建立）
  const ok = await ensureConversationReady();
  if (!ok) return;

  try {
    _sendingLock = true;
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.classList.add('is-sending');
    }

    // ★ 這時一定有 currentId，才清空輸入框
    field.value = '';
    try {
      if (typeof adjustTextareaHeight === 'function') adjustTextareaHeight(field);
    } catch {}

    // 立刻把使用者訊息畫到畫面（避免「像沒反應」）
    const userMsg = document.createElement('div');
    userMsg.className = 'message-container user-container';
    userMsg.innerHTML = `
      <div class="message-content user-content">${text}</div>
      <div class="avatar user-avatar">你</div>
    `;
    chatContainer.appendChild(userMsg);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // loading dots
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'message-container bot-container';
    loadingMsg.innerHTML = `
      <div class="avatar bot-avatar">AI</div>
      <div class="message-content bot-content loading-dots">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>`;
    chatContainer.appendChild(loadingMsg);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // 送到後端（沿用你的 API）
    let data = {};
    try {
      const res = await fetch("/api/ask/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: window.currentId, question: text })
      });
      // 兼容非 2xx 的情況
      let raw = null;
      try { raw = await res.text(); } catch {}
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: raw || '回應解析失敗' }; }
      if (!res.ok && !data.error) data.error = `HTTP ${res.status}`;
    } catch (e) {
      console.error('呼叫 /api/ask/ 失敗：', e);
      data = { error: '網路或伺服器錯誤' };
    }

    // 移除載入中
    if (loadingMsg.parentNode) chatContainer.removeChild(loadingMsg);

    // 顯示 AI 回覆（保留你的來源按鈕邏輯）
    let botContent = `<div class="message-content bot-content">${data.answer || data.error || '（未收到回應）'}`;
    if (data.has_sources && Array.isArray(data.sources) && data.sources.length) {
      botContent += `<div class="source-indicator"><button class="source-btn" onclick="showSources(${JSON.stringify(data.sources).replace(/"/g, '&quot;')})">📑</button></div>`;
    }
    botContent += `</div>`;

    const botMsg = document.createElement('div');
    botMsg.className = 'message-container bot-container';
    botMsg.innerHTML = `<div class="avatar bot-avatar">AI</div>${botContent}`;
    chatContainer.appendChild(botMsg);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // 首則訊息 → 更新對話標題（延續你的規則）
    try {
      const convo = Array.isArray(window.conversations)
        ? window.conversations.find(c => c.id === window.currentId)
        : null;
      if (convo && (!convo.title || convo.title.startsWith('新對話'))) {
        const title = text.length > 25 ? text.substring(0, 25) + '...' : text;
        await fetch(`/api/conversations/${window.currentId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title })
        });
        if (window.currentChatTitle) window.currentChatTitle.innerText = title;
        if (typeof loadConvos === 'function') await loadConvos();
      }
    } catch (e) {
      console.warn('更新對話標題失敗（略過）：', e);
    }
  } finally {
    _sendingLock = false;
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.classList.remove('is-sending');
    }
  }
}



// 修正後的 showSources 函數
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
        z-index: 9999;
        backdrop-filter: blur(1px);
        animation: fadeIn 0.3s ease;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 24px;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        max-height: 80%;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    
    let sourcesHtml = '<h3 style="margin-top:0; color:#333; font-size:18px; font-weight:600;">📚 資料來源</h3>';
    
    sources.forEach(source => {
        sourcesHtml += `
            <div style="margin: 12px 0; padding: 10px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #9187b2ff;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button onclick="viewPDF('${source}')" style="
                        background: linear-gradient(135deg, #dbcfdfff, #dbcfdfff);
                        color: #615a5aff;
                        border: none;
                        padding: 10px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        text-decoration: none;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.3s ease;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.27);
                        flex: 1;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(24, 24, 24, 0.6)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(49, 49, 49, 0.2)'">
                        📝 ${source}
                    </button>
                    <button onclick="window.open('/api/pdf/${encodeURIComponent(source)}/', '_blank')" style="
                        background: #eacb315c;
                        color: black;
                        border: none;
                        padding: 10px 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.3s ease;
                        box-shadow: 0 2px 4px rgba(183, 183, 183, 0.2);
                    " title="新分頁開啟">
                        🔗
                    </button>
                </div>
            </div>
        `;
    });
    
    sourcesHtml += `
        <div style="margin-top: 24px; text-align: right; border-top: 1px solid #eee; padding-top: 16px;">
            <button onclick="this.closest('.source-modal').remove()" style="
                background: #6c757d;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.2s ease;
            " onmouseover="this.style.background='#5a6268'" onmouseout="this.style.background='#6c757d'">
                關閉
            </button>
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
    
    // ESC 鍵關閉
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}

// 修正後的 viewPDF 函數
function viewPDF(filename) {
    console.log('開啟 PDF:', filename);
    
    // 檢查檔案名稱
    if (!filename || !filename.trim()) {
        alert('無效的檔案名稱');
        return;
    }
    
    // 建立 PDF URL
    const pdfUrl = `/api/pdf/${encodeURIComponent(filename)}/`;
    console.log('PDF URL:', pdfUrl);
    
    // 直接顯示 PDF 模態框，不進行 HEAD 請求測試
    showPDFModal(pdfUrl, filename);
}

function showPDFModal(pdfUrl, filename) {
    // 創建模態框
    const modal = document.createElement('div');
    modal.className = 'pdf-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(2px);
    `;
    
    const pdfContainer = document.createElement('div');
    pdfContainer.style.cssText = `
        position: relative;
        width: 90%;
        height: 90%;
        max-width: 1200px;
        max-height: 800px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        display: flex;
        flex-direction: column;
    `;
    
    // 標題欄
    const titleBar = document.createElement('div');
    titleBar.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        background: #f8f9fa;
        border-bottom: 1px solid #e9ecef;
        flex-shrink: 0;
    `;
    
    const title = document.createElement('h3');
    title.textContent = filename;
    title.style.cssText = `
        margin: 0;
        font-size: 16px;
        color: #333;
        font-weight: 600;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-right: 15px;
    `;
    
    // 操作按鈕組
    const buttonGroup = document.createElement('div');
    buttonGroup.style.cssText = `
        display: flex;
        gap: 10px;
        align-items: center;
    `;
    
    // 新分頁開啟按鈕
    const newTabBtn = document.createElement('button');
    newTabBtn.innerHTML = '🔗 新分頁開啟';
    newTabBtn.style.cssText = `
        background: #28a745;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s ease;
    `;
    newTabBtn.onclick = () => {
        window.open(pdfUrl, '_blank');
    };
    
    // 下載按鈕
    const downloadBtn = document.createElement('button');
    downloadBtn.innerHTML = '📥 下載';
    downloadBtn.style.cssText = `
        background: #007bff;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s ease;
    `;
    downloadBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = filename;
        a.click();
    };
    
    // 關閉按鈕
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 20px;
        color: #666;
        cursor: pointer;
        padding: 5px 10px;
        border-radius: 4px;
        transition: color 0.2s ease;
    `;
    closeBtn.onmouseover = () => closeBtn.style.color = '#333';
    closeBtn.onmouseout = () => closeBtn.style.color = '#666';
    
    // 內容區域
    const contentArea = document.createElement('div');
    contentArea.style.cssText = `
        flex: 1;
        position: relative;
        overflow: hidden;
    `;
    
    // 載入指示器
    const loader = document.createElement('div');
    loader.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        color: #666;
        z-index: 1;
    `;
    loader.innerHTML = `
        <div class="spinner" style="
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        "></div>
        正在載入 PDF...
    `;
    
    // 錯誤提示
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        color: #dc3545;
        display: none;
        z-index: 1;
    `;
    errorDiv.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
        <div style="font-size: 16px; font-weight: 600; margin-bottom: 10px;">PDF 載入失敗</div>
        <div style="font-size: 14px; color: #666;">
            請嘗試點擊「新分頁開啟」或「下載」按鈕
        </div>
    `;
    
    // 嘗試多種方式載入 PDF
    function tryLoadPDF() {
        // 方法1: 直接使用 iframe
        const iframe = document.createElement('iframe');
        iframe.src = pdfUrl;
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            background: white;
        `;
        
        let loadTimeout;
        let hasLoaded = false;
        
        iframe.onload = () => {
            if (!hasLoaded) {
                hasLoaded = true;
                clearTimeout(loadTimeout);
                loader.style.display = 'none';
                console.log('PDF iframe 載入成功');
            }
        };
        
        iframe.onerror = () => {
            if (!hasLoaded) {
                hasLoaded = true;
                clearTimeout(loadTimeout);
                loader.style.display = 'none';
                errorDiv.style.display = 'block';
                console.error('PDF iframe 載入失敗');
            }
        };
        
        // 設置超時
        loadTimeout = setTimeout(() => {
            if (!hasLoaded) {
                hasLoaded = true;
                
                // 移除 iframe 並嘗試方法2
                if (iframe.parentNode) {
                    iframe.parentNode.removeChild(iframe);
                }
                
                // 方法2: 使用 embed 標籤
                const embed = document.createElement('embed');
                embed.src = pdfUrl;
                embed.type = 'application/pdf';
                embed.style.cssText = `
                    width: 100%;
                    height: 100%;
                    border: none;
                `;
                
                contentArea.appendChild(embed);
                loader.style.display = 'none';
                console.log('使用 embed 標籤載入 PDF');
                
                // 如果 embed 也失敗，顯示錯誤
                setTimeout(() => {
                    errorDiv.style.display = 'block';
                }, 3000);
            }
        }, 5000);
        
        contentArea.appendChild(iframe);
    }
    
    // 組裝
    buttonGroup.appendChild(newTabBtn);
    buttonGroup.appendChild(downloadBtn);
    buttonGroup.appendChild(closeBtn);
    titleBar.appendChild(title);
    titleBar.appendChild(buttonGroup);
    contentArea.appendChild(loader);
    contentArea.appendChild(errorDiv);
    pdfContainer.appendChild(titleBar);
    pdfContainer.appendChild(contentArea);
    modal.appendChild(pdfContainer);
    
    // 關閉功能
    function closeModal() {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
    }
    
    // ESC 鍵關閉
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    };
    
    closeBtn.onclick = closeModal;
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
    
    // 添加動畫樣式
    const style = document.createElement('style');
    if (!document.head.querySelector('#pdf-modal-styles')) {
        style.id = 'pdf-modal-styles';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .pdf-modal {
                animation: fadeIn 0.3s ease;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .pdf-modal > div {
                animation: slideIn 0.3s ease;
            }
            
            @keyframes slideIn {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // 顯示模態框
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    
    // 開始載入 PDF
    tryLoadPDF();
}


// 初始化
(async () => {
    await loadConvos();
    
    // 初始化拖拽上傳功能
    initDragAndDrop();
    initBlobs();
    
    // 初始對話選擇（依身份判斷）
    if (conversations.length) {
        // 有對話 → 選第一個
        selectConvo(conversations[0].id);
    } else {
        if (window.IS_AUTH) {
            // 登入使用者 → 自動新建一個對話
            await createNewChat();
        }
        // 否則：訪客 → 保持 renderConvos() 的提示
    }
    
    // 默認收起側邊欄，無論窗口大小
    sidebar.classList.add('collapsed');
    menuBtn.classList.remove('open');
    document.body.classList.add('sidebar-collapsed');
    sidebarOpen = false;
    _maybeApplyPrefill();
})();

// 窗口大小調整時的行為
window.addEventListener('resize', () => {
    if (window.innerWidth <= 768 && !sidebar.classList.contains('collapsed')) {
        sidebar.classList.add('collapsed');
        menuBtn.classList.remove('open');
        document.body.classList.add('sidebar-collapsed');
        sidebarOpen = false;

        _maybeApplyPrefill();
    }
});