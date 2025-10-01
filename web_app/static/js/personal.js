function initializeParallax() {
    const bgText = document.querySelector('.bg-text');

    function parallaxScroll() {
        const scrollPosition = window.pageYOffset;
        if (bgText) {
            bgText.style.transform = `translateX(${scrollPosition * -0.7}px)`;
        }
    }

    window.addEventListener('scroll', parallaxScroll);
}

window.addEventListener('DOMContentLoaded', function () {
    initializeParallax(); // <== 確保執行初始化
});


// ===== 編輯姓名 =====
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const row   = document.querySelector('.user-name-row');
    if (!row) return;
    let nameEl  = row.querySelector('.user-name');
    const btn   = row.querySelector('#editNameBtn');

    let editing = false;
    let inputEl = null;
    const pencilSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>
      </svg>`;
    const checkSVG  = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M20 6 9 17l-5-5"/>
      </svg>`;

    function startEdit() {
      const current = nameEl.textContent.trim();
      inputEl = document.createElement('input');
      inputEl.type = 'text';
      inputEl.className = 'user-name-input';
      inputEl.maxLength = 20;
      inputEl.value = current;

      nameEl.replaceWith(inputEl);     // 直接用 input 取代顯示
      inputEl.focus();
      btn.innerHTML = checkSVG;        // 鉛筆 → 勾勾（代表儲存）
      btn.setAttribute('title','儲存');
      row.style.gap = '2px';
      editing = true;
    }

    function saveEdit() {
      const newVal = (inputEl.value || '').trim();
      const display = document.createElement('div');
      display.className = 'user-name';
      display.textContent = newVal || nameEl?.textContent?.trim() || '';
      inputEl.replaceWith(display);
      nameEl = display;

      btn.innerHTML = pencilSVG;       // 勾勾 → 鉛筆
      btn.setAttribute('title','編輯姓名');
      row.style.gap = '25px';
      editing = false;

      // TODO: 在這裡用 fetch/POST 傳到後端保存（如果要即時存 DB）
      // fetch('/profile/update-name/', { method:'POST', headers:{'Content-Type':'application/json','X-CSRFToken': csrftoken}, body: JSON.stringify({ name: newVal }) })
    }

    function cancelEdit() {            // 按 Esc 還原
      const display = document.createElement('div');
      display.className = 'user-name';
      display.textContent = nameEl?.textContent?.trim() || '';
      if (inputEl && inputEl.parentNode) {
        inputEl.replaceWith(display);
        nameEl = display;
      }
      btn.innerHTML = pencilSVG;
      btn.setAttribute('title','編輯姓名');
      editing = false;
    }

    btn.addEventListener('click', () => {
      if (!editing) startEdit();
      else saveEdit();
    });

    // Enter 儲存、Esc 取消
    document.addEventListener('keydown', (e) => {
      if (!editing) return;
      if (e.key === 'Enter') saveEdit();
      if (e.key === 'Escape') cancelEdit();
    });
  });
})();


(function(){
try {
    var node = document.getElementById('calendar-events');
    window.calendarEventsData = node ? JSON.parse(node.textContent || '[]') : [];
} catch (e) { window.calendarEventsData = []; }
})();


// ===== Books modal =====
(function(){
  const modal = document.getElementById('cshelfBookModal');
  if (!modal) return;
  const closeBtn = document.getElementById('cshelfCloseBtn');
  const tTitle = document.getElementById('cshelfBookTitle');
  const tAuthor = document.getElementById('cshelfBookAuthor');
  const tPublisher = document.getElementById('cshelfBookPublisher');
  const tISBN = document.getElementById('cshelfBookISBN');
  const tDesc = document.getElementById('cshelfBookDesc');

  document.querySelectorAll('.cshelf__book').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      tTitle.textContent = btn.dataset.title || '';
      tAuthor.textContent = btn.dataset.author || '—';
      tPublisher.textContent = btn.dataset.publisher || '—';
      tISBN.textContent = btn.dataset.isbn || '—';
      tDesc.textContent = btn.dataset.desc || '';
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden','false');
    });
  });

  const close = ()=>{
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
  };
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e)=>{ if (e.target === modal) close(); });
})();

// ===== Tickets flip & gentle float =====
(function(){
  const tickets = document.querySelectorAll('.cticket');
  tickets.forEach((el, idx)=>{
    el.addEventListener('click', ()=> el.classList.toggle('is-flipped'));

    // gentle float: 每 3~4.5 秒輕微改變 rotate 角度
    const base = el.style.transform || '';
    const getRot = ()=>{
      const m = base.match(/rotate\(([-\d.]+)deg\)/);
      return m ? parseFloat(m[1]) : 0;
    };
    let baseDeg = getRot();
    setInterval(()=>{
      const random = (Math.random() - 0.5) * 2; // -1 ~ +1 度
      el.style.transform = base.replace(/rotate\([-\d.]+deg\)/, `rotate(${(baseDeg + random).toFixed(2)}deg)`);
    }, 3000 + idx*400);
  });
})();

// ===== 小三角旗 modal 開啟（全頁） =====
(function(){
  let modal = document.getElementById('cflagModal');
  if (!modal) return;

  // 確保 modal 在 body 直層（避免被祖先 overflow/transform 影響）
  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  const closeBtn = document.getElementById('cflagCloseBtn');
  const elTitle = document.getElementById('cflagTitle');
  const elWhen  = document.getElementById('cflagWhen');
  const elWhere = document.getElementById('cflagWhere');
  const elPeople= document.getElementById('cflagPeople');
  const elDesc  = document.getElementById('cflagDesc');

  const open = () => { modal.classList.add('is-open'); modal.setAttribute('aria-hidden','false'); };
  const close = () => { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden','true'); };

  document.querySelectorAll('.gflag').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const title = btn.dataset.title || '活動';
      const weekday = btn.dataset.weekday || '';
      const date = btn.dataset.date || '';
      const time = btn.dataset.time || '';
      const location = btn.dataset.location || '—';
      const total = btn.dataset.total || '0';
      const max = btn.dataset.max || '0';
      const desc = btn.dataset.desc || '';

      elTitle.textContent = title;
      elWhen.textContent  = `${weekday} ${date} 日 ${time}`;
      elWhere.textContent = location;
      elPeople.textContent= `${total}/${max} 人`;
      elDesc.textContent  = desc;

      open();
    });
  });

  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e)=>{ if (e.target === modal) close(); });
})();



// 學分進度條
const segments = document.querySelectorAll('.progress-segment');
const tooltip = document.getElementById('tooltip');

segments.forEach(segment => {
    segment.addEventListener('mouseenter', function(e) {
        const tooltipText = this.getAttribute('data-tooltip');
        if (tooltipText && this.style.width !== '0%') {
            tooltip.textContent = tooltipText;
            tooltip.classList.add('show');
            
            // 计算tooltip位置
            const rect = this.getBoundingClientRect();
            const containerRect = this.closest('.profile-item').getBoundingClientRect();
            
            const left = rect.left - containerRect.left + (rect.width / 2);
            tooltip.style.left = left + 'px';
            tooltip.style.transform = `translateX(-90%) translateY(6px)`;
        }
    });
    
    segment.addEventListener('mouseleave', function() {
        tooltip.classList.remove('show');
    });
});

// 页面加载时触发动画
window.addEventListener('load', function() {
    const segments = document.querySelectorAll('.progress-segment.animate');
    segments.forEach((segment, index) => {
        setTimeout(() => {
            segment.style.animationDelay = `${index * 0.2}s`;
        }, 100);
    });
});
document.addEventListener('DOMContentLoaded', function() {
    segments.forEach(segment => {
        if (segment.style.width === '0%') {
            segment.style.pointerEvents = 'none';
        }
    });
});



// 日期相關函數
// 全域狀態
let calendarYear, calendarMonth;
let todoEvents = [];

// ===== API 工具函數 =====
function getCSRFToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') {
            return value;
        }
    }
    return null;
}

async function apiCall(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken() || ''
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, mergedOptions);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// ===== Todo API 函數 =====
async function loadTodos() {
    try {
        const data = await apiCall('/api/todos/');
        
        // 保留活動事件，只更新待辦事項
        const activityEvents = todoEvents.filter(ev => ev.source === 'activity');
        const todoEventsFromAPI = data.todos.map(todo => ({
            id: todo.id,
            year: new Date(todo.date).getFullYear(),
            month: new Date(todo.date).getMonth() + 1,
            day: new Date(todo.date).getDate(),
            text: todo.title,
            title: todo.title,
            description: todo.description,
            completed: todo.completed,
            source: 'todo',
            created_at: todo.created_at
        }));
        
        // 合併活動和待辦事項，並按時間排序
        todoEvents = [...activityEvents, ...todoEventsFromAPI];
        
        // 按日期和時間排序
        todoEvents.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            if (a.month !== b.month) return a.month - b.month;
            if (a.day !== b.day) return a.day - b.day;
            
            // 同一天內，如果有時間資訊就按時間排序
            if (a.time && b.time) {
                return a.time.localeCompare(b.time);
            }
            
            // 如果有創建時間就按創建時間排序
            if (a.created_at && b.created_at) {
                return new Date(a.created_at) - new Date(b.created_at);
            }
            
            return 0;
        });
        
        // 重新渲染
        updateTodoList();
        renderCalendarEvents();
        console.log('[personal] Loaded todos from API:', todoEvents);
    } catch (error) {
        console.error('[personal] Failed to load todos:', error);
        alert('載入待辦事項失敗：' + error.message);
    }
}

async function createTodoAPI(title, description, date) {
    try {
        const data = await apiCall('/api/todos/create/', {
            method: 'POST',
            body: JSON.stringify({ title, description, date })
        });
        console.log('[personal] Created todo:', data.todo);
        return data.todo;
    } catch (error) {
        console.error('[personal] Failed to create todo:', error);
        throw error;
    }
}

async function updateTodoAPI(todoId, updates) {
    try {
        const data = await apiCall(`/api/todos/${todoId}/update/`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        console.log('[personal] Updated todo:', data.todo);
        return data.todo;
    } catch (error) {
        console.error('[personal] Failed to update todo:', error);
        throw error;
    }
}

async function deleteTodoAPI(todoId) {
    try {
        await apiCall(`/api/todos/${todoId}/delete/`, {
            method: 'DELETE'
        });
        console.log('[personal] Deleted todo:', todoId);
    } catch (error) {
        console.error('[personal] Failed to delete todo:', error);
        throw error;
    }
}

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function getCurrentMonthYearObj() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function getMonthYearText(year, month) {
    return `${year}年${month}月`;
}

function updateCurrentMonth() {
    document.getElementById('currentMonth').textContent = getMonthYearText(calendarYear, calendarMonth);
}

function renderCalendar(year, month) {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const prevMonthDays = new Date(year, month - 1, 0).getDate();
    const calendarBody = document.getElementById('calendarBody');
    calendarBody.innerHTML = '';

    let row = document.createElement('tr');
    // 上月補空格
    for (let i = 0; i < firstDay; i++) {
        const td = document.createElement('td');
        td.className = 'other-month';
        td.textContent = prevMonthDays - firstDay + i + 1;
        row.appendChild(td);
    }

    let day = 1;
    for (let i = firstDay; i < 7; i++) {
        const td = document.createElement('td');
        td.textContent = day++;
        row.appendChild(td);
    }
    calendarBody.appendChild(row);

    // 其餘日期
    let nextMonthDay = 1;
    while (day <= daysInMonth) {
        row = document.createElement('tr');
        for (let i = 0; i < 7; i++) {
            const td = document.createElement('td');
            if (day > daysInMonth) {
                td.className = 'other-month';
                td.textContent = nextMonthDay++;
            } else {
                td.textContent = day++;
            }
            row.appendChild(td);
        }
        calendarBody.appendChild(row);
    }

    // 填入事件
    renderCalendarEvents();
}


function renderCalendarEvents() {
    // 新增：點擊事件讓點擊有事件的td滾動到詳細卡片
    setTimeout(function() {
        const calendarBody = document.getElementById('calendarBody');
        if (!calendarBody) return;
        calendarBody.querySelectorAll('td').forEach(td => {
            td.removeEventListener('click', td.__scrollToDetailHandler);
            td.__scrollToDetailHandler = function(e) {
                // 只對本月且有 .event 的 td 作用
                if (td.classList.contains('other-month')) return;
                if (!td.querySelector('.event')) return;
                const detailCard = document.querySelector('.detail-card');
                if (detailCard) {
                    detailCard.style.display = '';
                    detailCard.scrollIntoView({behavior: 'smooth'});
                }
            };
            td.addEventListener('click', td.__scrollToDetailHandler);
        });
    }, 0);

    // 只顯示當月事件
    const calendarBody = document.getElementById('calendarBody');
    if (!calendarBody) return;
    const tds = calendarBody.querySelectorAll('td');
    tds.forEach(td => {
        // 移除舊事件
        td.querySelectorAll('.event').forEach(ev => ev.remove());
        // 只處理本月
        if (td.classList.contains('other-month')) return;
        const day = parseInt(td.childNodes[0]?.nodeValue?.trim());
        if (!day) return;
        const events = todoEvents.filter(ev => ev.year === calendarYear && ev.month === calendarMonth && ev.day === day);
        events.forEach(ev => {
            const eventDiv = document.createElement('div');
            eventDiv.className = 'event';
            eventDiv.textContent = ev.text;
            
            // 活動和待辦事項使用不同的樣式
            if (ev.source === 'activity') {
                eventDiv.classList.add('event-activity');
            } else {
                // 待辦事項：檢查是否已完成
                if (ev.completed) {
                    eventDiv.classList.add('event-completed');
                }
            }
            td.appendChild(eventDiv);
        });
    });
}

function setCalendarMonth(year, month) {
    calendarYear = year;
    calendarMonth = month;
    updateCurrentMonth();
    renderCalendar(year, month);
    updateTaskDatePickerMonth(year, month);
}

function updateTaskDatePickerMonth(year, month) {
    const monthDisplay = document.getElementById('taskDateMonth');
    if (monthDisplay) {
        monthDisplay.textContent = getMonthYearText(year, month);
    }
    // 設定 input[type=date] min/max
    const min = `${year}-${pad2(month)}-01`;
    const max = `${year}-${pad2(month)}-${pad2(new Date(year, month, 0).getDate())}`;
    const dateInput = document.getElementById('taskDate');
    if (dateInput) {
        dateInput.setAttribute('min', min);
        dateInput.setAttribute('max', max);
        // 若目前日期不在範圍，重設
        if (dateInput.value < min || dateInput.value > max) dateInput.value = '';
    }
}

// 初始化月份狀態
(function() {
    const now = getCurrentMonthYearObj();
    calendarYear = now.year;
    calendarMonth = now.month;
})();

// 初始化頁面
let selectedDay = null;
function initCalendarPage() {
    updateCurrentMonth();
    renderCalendar(calendarYear, calendarMonth);

    // 日曆左右切換
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    
    if (prevMonthBtn) {
        prevMonthBtn.onclick = () => {
            if (calendarMonth === 1) {
                calendarYear--;
                calendarMonth = 12;
            } else {
                calendarMonth--;
            }
            setCalendarMonth(calendarYear, calendarMonth);
            selectedDay = null;
            updateSelectedDateDisplay();
            bindCalendarDayClick();
        };
    }
    
    if (nextMonthBtn) {
        nextMonthBtn.onclick = () => {
            if (calendarMonth === 12) {
                calendarYear++;
                calendarMonth = 1;
            } else {
                calendarMonth++;
            }
            setCalendarMonth(calendarYear, calendarMonth);
            selectedDay = null;
            updateSelectedDateDisplay();
            bindCalendarDayClick();
        };
    }
    
    bindCalendarDayClick();
}

function bindCalendarDayClick() {
    // 只給本月的 td 綁定點擊
    document.querySelectorAll('#calendarBody td').forEach(td => {
        if (!td.classList.contains('other-month')) {
            td.style.cursor = 'pointer';
            td.onclick = function() {
                selectedDay = parseInt(td.childNodes[0]?.nodeValue?.trim());
                updateSelectedDateDisplay();
                // 高亮顯示
                document.querySelectorAll('#calendarBody td').forEach(t => t.classList.remove('selected-calendar-day'));
                td.classList.add('selected-calendar-day');
                showDetailCard();
                // 動畫：確保卡片顯示後再滾動
                setTimeout(function() {
                    const detailCard = document.querySelector('.detail-card');
                    if (detailCard) {
                        detailCard.scrollIntoView({behavior: 'smooth'});
                    }
                }, 100);
            };
        } else {
            td.onclick = null;
            td.style.cursor = '';
        }
    });
}



// 顯示詳細資訊卡片，隱藏待辦事項卡片，並載入該天事項
function showDetailCard() {
    const todoCard = document.querySelector('.todo-card');
    const detailCard = document.querySelector('.detail-card');

    if (todoCard) todoCard.style.display = 'none';
    if (detailCard) detailCard.style.display = 'block';

    const titleElement = document.getElementById('detailCardTitle');
    const dateElement = document.getElementById('detailCardDate');

    if (titleElement) titleElement.textContent = '詳細資訊';
    if (dateElement) dateElement.textContent = `${calendarYear}.${calendarMonth}.${selectedDay}`;

    const ul = document.querySelector('.detail-todo-list');
    if (ul) {
        ul.innerHTML = '';
        const events = todoEvents.filter(ev => ev.year === calendarYear && ev.month === calendarMonth && ev.day === selectedDay);
        
        // 按類型和時間排序：活動在前，待辦事項在後，同類型內按創建時間排序
        events.sort((a, b) => {
            // 活動優先顯示
            if (a.source === 'activity' && b.source !== 'activity') return -1;
            if (a.source !== 'activity' && b.source === 'activity') return 1;
            
            // 同類型按創建時間排序（如果有的話）
            if (a.created_at && b.created_at) {
                return new Date(a.created_at) - new Date(b.created_at);
            }
            
            // 預設按標題排序
            return (a.title || a.text || '').localeCompare(b.title || b.text || '');
        });
        if (events.length === 0) {
            ul.innerHTML = '<li style="padding: 20px; text-align: center; color: #999;">尚無事項</li>';
        } else {
            events.forEach((ev, idx) => {
            const taskId = `detail-task-${idx}`;

            // 建立 li 待辦項目
            const li = document.createElement('li');
            li.className = 'todo-item';
            
            // 活動項目不能勾選完成或刪除
            if (ev.source === 'activity') {
                li.innerHTML = `
                    <span class="activity-indicator">📅</span>
                    <label class="activity-label">${ev.title || ev.text}</label>
                    <span class="todo-status activity-status">${ev.month}/${ev.day}</span>
                `;
                li.classList.add('activity-item');
            } else {
                li.innerHTML = `
                    <input type="checkbox" id="${taskId}">
                    <label for="${taskId}">${ev.title || ev.text}</label>
                    <span class="todo-status" data-original="${ev.month}/${ev.day}">${ev.month}/${ev.day}</span>
                    <button class="delete-task-btn" title="刪除事項">×</button>
                `;
            }
            ul.appendChild(li);

            // 建立說明容器（分開 append）
            let detailDiv = null;
            if (ev.description) {
                detailDiv = document.createElement('div');
                detailDiv.className = 'todo-detail-container';
                detailDiv.innerHTML = `
                    <div class="todo-detail-label">詳細說明</div>
                    <div class="todo-detail-box">${ev.description}</div>
                `;
                ul.appendChild(detailDiv);

                // 是否預設收起（若已完成）
                if (ev.completed) {
                    detailDiv.classList.add('collapsed');
                }

                // 點擊 todo-item 時 toggle 展開/收起
                li.addEventListener('click', function (e) {
                    // 避免點到 checkbox、刪除鍵時也觸發 toggle
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                    detailDiv.classList.toggle('collapsed');
                });
            }

            // 只有待辦事項才有互動功能，活動項目只是顯示
            if (ev.source !== 'activity') {
                const checkbox = li.querySelector('input[type="checkbox"]');
                const statusSpan = li.querySelector('.todo-status');
                const deleteBtn = li.querySelector('.delete-task-btn');

                deleteBtn.addEventListener('click', async function () {
                    if (confirm('確定要刪除此待辦事項嗎？')) {
                        try {
                            await deleteTodoAPI(ev.id);
                            await loadTodos();
                            showDetailCard();
                        } catch (error) {
                            alert('刪除待辦事項失敗：' + error.message);
                        }
                    }
                });

                if (ev.completed) {
                    li.classList.add('completed');
                    checkbox.checked = true;
                    statusSpan.textContent = '已完成';
                }

                checkbox.addEventListener('change', async function () {
                    const completed = this.checked;
                    try {
                        await updateTodoAPI(ev.id, { completed });
                        
                        if (completed) {
                            // 更新資料
                            updateTaskCompletion(ev.text, true);
                            renderCalendarEvents();
                            
                            // 添加完成動畫
                            li.classList.add('completing');
                            
                            // 為其他項目添加向上移動動畫
                            const allItems = Array.from(ul.querySelectorAll('.todo-item'));
                            const currentIndex = allItems.indexOf(li);
                            
                            // 為當前項目之後的所有項目添加向上移動動畫
                            allItems.slice(currentIndex + 1).forEach((item, index) => {
                                setTimeout(() => {
                                    item.classList.add('slide-up');
                                    // 移除動畫類別，以便下次使用
                                    setTimeout(() => {
                                        item.classList.remove('slide-up');
                                    }, 400);
                                }, 100 + index * 50); // 錯開動畫時間
                            });
                            
                            // 動畫結束後重新載入詳細卡片
                            setTimeout(() => {
                                loadTodos().then(() => {
                                    showDetailCard();
                                });
                            }, 600);
                            
                        } else {
                            li.classList.remove('completed');
                            statusSpan.textContent = statusSpan.getAttribute('data-original');
                            updateTaskCompletion(ev.text, false);
                            renderCalendarEvents();
                        }
                    } catch (error) {
                        // 回復 checkbox 狀態
                        this.checked = !completed;
                        alert('更新待辦事項失敗：' + error.message);
                    }
                });
            }
        });

        }
    }

    updateTodoList();
}



// 重新渲染主待辦事項卡片的列表
function updateTodoList() {
    const todoUl = document.querySelector('.todo-list');
    if (!todoUl) return;
    todoUl.innerHTML = '';

    // 只保留「今天之後（含今天）」的項目
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
    const isTodayOrFuture = (ev) => {
        // 無日期的項目不顯示在待辦
        if (!ev || !ev.year || !ev.month || !ev.day) return false;
        
        // 已完成的待辦事項不顯示（但活動仍然顯示）
        if (ev.source === 'todo' && ev.completed) return false;
        
        if (ev.year > y) return true;
        if (ev.year < y) return false;
        if (ev.month > m) return true;
        if (ev.month < m) return false;
        return ev.day >= d; // 同年同月需 >= 今天（含今天）
    };

    const list = (todoEvents || []).filter(isTodayOrFuture);
    
    // 按日期和時間排序（最近的在前面）
    list.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if (a.month !== b.month) return a.month - b.month;
        if (a.day !== b.day) return a.day - b.day;
        
        // 同一天內，如果有時間資訊就按時間排序
        if (a.time && b.time) {
            return a.time.localeCompare(b.time);
        }
        
        // 如果有創建時間就按創建時間排序
        if (a.created_at && b.created_at) {
            return new Date(a.created_at) - new Date(b.created_at);
        }
        
        return 0;
    });

    if (list.length === 0) {
        todoUl.innerHTML = '<li class="todo-item" style="padding: 20px; text-align: center; color: #999;">尚無待辦事項</li>';
        return;
    }

    list.forEach((ev, idx) => {
        const taskId = 'task' + (idx + 1);
        const li = document.createElement('li');
        li.className = 'todo-item';
        
        // 活動項目不能勾選完成或刪除
        if (ev.source === 'activity') {
            li.innerHTML = `
                <span class="activity-indicator">📅</span>
                <label class="activity-label">${ev.text}</label>
                <span class="todo-status activity-status">${ev.month}/${ev.day}</span>
            `;
            li.classList.add('activity-item');
        } else {
            li.innerHTML = `
                <input type="checkbox" id="${taskId}">
                <label for="${taskId}">${ev.text}</label>
                <span class="todo-status" data-original="${ev.month}/${ev.day}">${ev.month}/${ev.day}</span>
                <button class="delete-task-btn" title="刪除事項">×</button>
            `;
        }
        todoUl.appendChild(li);

        // 只有待辦事項才有互動功能，活動項目只是顯示
        if (ev.source !== 'activity') {
            const checkbox = li.querySelector('input[type="checkbox"]');
            const statusSpan = li.querySelector('.todo-status');
            const deleteBtn = li.querySelector('.delete-task-btn');

            deleteBtn.addEventListener('click', async function () {
                if (confirm('確定要刪除此待辦事項嗎？')) {
                    try {
                        await deleteTodoAPI(ev.id);
                        await loadTodos();
                    } catch (error) {
                        alert('刪除待辦事項失敗：' + error.message);
                    }
                }
            });

            if (ev.completed) {
                li.classList.add('completed');
                checkbox.checked = true;
                statusSpan.textContent = '已完成';
            }

            checkbox.addEventListener('change', async function () {
                const completed = this.checked;
                try {
                    await updateTodoAPI(ev.id, { completed });
                    
                    if (completed) {
                        // 更新資料
                        updateTaskCompletion(ev.text, true);
                        renderCalendarEvents();
                        
                        // 添加完成動畫
                        li.classList.add('completing');
                        
                        // 為其他項目添加向上移動動畫
                        const allItems = Array.from(todoUl.querySelectorAll('.todo-item'));
                        const currentIndex = allItems.indexOf(li);
                        
                        // 為當前項目之後的所有項目添加向上移動動畫
                        allItems.slice(currentIndex + 1).forEach((item, index) => {
                            setTimeout(() => {
                                item.classList.add('slide-up');
                                // 移除動畫類別，以便下次使用
                                setTimeout(() => {
                                    item.classList.remove('slide-up');
                                }, 400);
                            }, 100 + index * 50); // 錯開動畫時間
                        });
                        
                        // 動畫結束後重新載入列表
                        setTimeout(() => {
                            loadTodos();
                        }, 600);
                        
                    } else {
                        li.classList.remove('completed');
                        statusSpan.textContent = statusSpan.getAttribute('data-original');
                        updateTaskCompletion(ev.text, false);
                        renderCalendarEvents();
                    }
                } catch (error) {
                    // 回復 checkbox 狀態
                    this.checked = !completed;
                    alert('更新待辦事項失敗：' + error.message);
                }
            });
        }
    });
}

// 標記行事曆事件完成/取消
function markCalendarEventCompleted(eventText, completed) {
    const calendarBody = document.getElementById('calendarBody');
    if (!calendarBody) return;
    const tds = calendarBody.querySelectorAll('td');
    tds.forEach(td => {
        td.querySelectorAll('.event').forEach(ev => {
            if (ev.textContent === eventText) {
                if (completed) {
                    ev.classList.add('event-completed');
                } else {
                    ev.classList.remove('event-completed');
                }
            }
        });
    });
}
function updateTaskCompletion(taskText, completed) {
    for (let ev of todoEvents) {
        if (ev.text === taskText) {
            ev.completed = completed;
            break;
        }
    }
}

function updateSelectedDateDisplay() {
    const display = document.getElementById('selectedDateDisplay');
    const newTaskInput = document.getElementById('newTask');
    if (selectedDay) {
        if (display) {
            display.style.display = 'block';
            display.textContent = `${calendarYear}.${calendarMonth}.${selectedDay}`;
        }
        if (newTaskInput) newTaskInput.placeholder = '添加新的待辦事項...';
    } else {
        if (display) display.style.display = 'none';
        if (newTaskInput) newTaskInput.placeholder = '請點選左方日期';
    }
    if (newTaskInput) newTaskInput.value = '';
}


// 待辦事項相關函數
async function addNewTask() {
    const newTaskInput = document.getElementById('newTask');
    if (!newTaskInput) return;

    const taskText = newTaskInput.value.trim();
    if (!selectedDay) {
        alert('請先點選左側日曆日期');
        return;
    }
    if (taskText === '') return;

    const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    
    try {
        await createTodoAPI(taskText, '', dateStr);
        newTaskInput.value = '';
        await loadTodos(); // 重新載入所有待辦事項
    } catch (error) {
        alert('新增待辦事項失敗：' + error.message);
    }
}

// 新增詳細資訊卡片的待辦事項
// 確保 DOMContentLoaded 後再綁定事件
window.addEventListener('DOMContentLoaded', function () {
    const addDetailBtn = document.getElementById('addDetailTask');
    if (addDetailBtn) {
        addDetailBtn.addEventListener('click', async function () {
            // 新增：點擊新增事項後滾動回行事曆
            setTimeout(function() {
                const calendarCard = document.querySelector('.calendar-card');
                if (calendarCard) {
                    calendarCard.scrollIntoView({behavior: 'smooth'});
                }
            }, 350); // 稍微延遲，讓新增動畫/渲染完成

            const titleInput = document.getElementById('newDetailTaskTitle');
            const descriptionInput = document.getElementById('newDetailTaskDescription');

            if (!titleInput) {
                console.error('找不到標題輸入框');
                return;
            }

            const title = titleInput.value.trim();
            const description = descriptionInput ? descriptionInput.value.trim() : '';

            if (!selectedDay) {
                alert('請先點選左側日曆日期');
                return;
            }
            if (!title) {
                alert('請輸入待辦事項標題');
                return;
            }

            let taskText = title;

            const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
            
            try {
                await createTodoAPI(title, description, dateStr);
                titleInput.value = '';
                if (descriptionInput) descriptionInput.value = '';
                await loadTodos(); // 重新載入
                showDetailCard(); // 重新顯示詳細卡片
            } catch (error) {
                alert('新增待辦事項失敗：' + error.message);
            }
        });
    }

    const backBtn = document.getElementById('backToTodo');
    if (backBtn) {
        backBtn.addEventListener('click', function () {
            const detailCard = document.querySelector('.detail-card');
            const todoCard = document.querySelector('.todo-card');
            if (detailCard) detailCard.style.display = 'none';
            if (todoCard) todoCard.style.display = 'block';

            updateTodoList();
        });
    }

    const clearBtn = document.getElementById('clearDetailForm');
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            const titleInput = document.getElementById('newDetailTaskTitle');
            const descriptionInput = document.getElementById('newDetailTaskDescription');
            if (titleInput) titleInput.value = '';
            if (descriptionInput) descriptionInput.value = '';
            if (titleInput) titleInput.focus();
        });
    }

    const titleInput = document.getElementById('newDetailTaskTitle');
    if (titleInput) {
        titleInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                const descriptionInput = document.getElementById('newDetailTaskDescription');
                if (descriptionInput) {
                    descriptionInput.focus();
                }
            }
        });
    }

    const descriptionInput = document.getElementById('newDetailTaskDescription');
    if (descriptionInput) {
        descriptionInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                const addBtn = document.getElementById('addDetailTask');
                if (addBtn) {
                    addBtn.click();
                }
            }
        });
    }

    // 導後端傳來的活動事件注入行事曆（需在 initCalendarPage 之前）
    try {
        var evs = (window.calendarEventsData || []);
        console.log('[personal] calendarEventsData:', evs);
        evs.forEach(function(e){
            if (!e || !e.date) return;
            var d = new Date(e.date);
            if (isNaN(d)) return;
            todoEvents.push({
                year: d.getFullYear(),
                month: d.getMonth() + 1,
                day: d.getDate(),
                text: e.title || '活動',
                title: e.title || '活動',
                completed: false,
                source: 'activity',
                activityId: e.id, // 保存活動 ID
                created_at: e.created_at || new Date().toISOString(), // 活動創建時間
                time: e.time || null // 活動時間
            });
        });
        
        // 注入後立即排序（按日期和時間）
        todoEvents.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            if (a.month !== b.month) return a.month - b.month;
            if (a.day !== b.day) return a.day - b.day;
            
            // 同一天內，如果有時間資訊就按時間排序
            if (a.time && b.time) {
                return a.time.localeCompare(b.time);
            }
            
            // 如果有創建時間就按創建時間排序
            if (a.created_at && b.created_at) {
                return new Date(a.created_at) - new Date(b.created_at);
            }
            
            return 0;
        });
        console.log('[personal] todoEvents after inject:', todoEvents);

        // 若本月沒有任何事件，則自動切換到最近的一筆活動月份
        if (todoEvents.length > 0) {
            var hasInCurrentMonth = todoEvents.some(function(ev){
                return ev.year === calendarYear && ev.month === calendarMonth;
            });
            if (!hasInCurrentMonth) {
                // 選擇未來最近的活動，若都在過去則取第一筆
                var now = new Date();
                var upcoming = todoEvents
                    .map(function(ev){ return new Date(ev.year, ev.month - 1, ev.day); })
                    .sort(function(a, b){ return a - b; })
                    .find(function(d){ return d >= new Date(now.getFullYear(), now.getMonth(), 1); }) ||
                    new Date(todoEvents[0].year, todoEvents[0].month - 1, todoEvents[0].day);
                calendarYear = upcoming.getFullYear();
                calendarMonth = upcoming.getMonth() + 1;
                console.log('[personal] switch calendar to', calendarYear, calendarMonth);
            }
        }
    } catch (err) { console.warn('[personal] inject events error:', err); }

    // 載入後端待辦事項（會保留已注入的活動事件）
    loadTodos().then(() => {
        console.log('[personal] Initial todos loaded');
    }).catch(error => {
        console.error('[personal] Failed to load initial todos:', error);
    });

    initCalendarPage();

});
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        const userNameDiv = document.querySelector('.profile-image .user-name');
        const editBtn = document.querySelector('.profile-image .btn-secondary');
        let editing = false;
        let inputEl = null;
        if (userNameDiv && editBtn) {
            editBtn.addEventListener('click', function () {
                if (!editing) {
                    // Create input
                    inputEl = document.createElement('input');
                    inputEl.type = 'text';
                    inputEl.className = 'user-name-input';
                    inputEl.value = userNameDiv.textContent.trim();
                    inputEl.style.width = '100%';
                    inputEl.style.marginTop = '8px';
                    inputEl.maxLength = 20;
                    userNameDiv.style.display = 'none';
                    userNameDiv.parentNode.insertBefore(inputEl, editBtn);
                    inputEl.focus();
                    editBtn.textContent = '儲存';
                    editing = true;

                    // Save on blur or enter
                    function saveName() {
                        userNameDiv.textContent = inputEl.value.trim() || userNameDiv.textContent;
                        userNameDiv.style.display = '';
                        inputEl.remove();
                        editBtn.textContent = '編輯資料';
                        editing = false;
                    }
                    inputEl.addEventListener('blur', saveName);
                    inputEl.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter') {
                            saveName();
                        }
                    });
                }
            });
        }
    });
})();
