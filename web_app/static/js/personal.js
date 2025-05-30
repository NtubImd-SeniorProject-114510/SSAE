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
    // 計算每月第一天是星期幾
    const firstDay = new Date(year, month - 1, 1).getDay();
    // 當月天數
    const daysInMonth = new Date(year, month, 0).getDate();
    // 上月天數
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
        td.textContent = day;
        row.appendChild(td);
        day++;
    }
    calendarBody.appendChild(row);
    // 其餘日期
    while (day <= daysInMonth) {
        row = document.createElement('tr');
        for (let i = 0; i < 7; i++) {
            if (day > daysInMonth) {
                const td = document.createElement('td');
                td.className = 'other-month';
                td.textContent = day - daysInMonth;
                row.appendChild(td);
            } else {
                const td = document.createElement('td');
                td.textContent = day;
                row.appendChild(td);
                day++;
            }
        }
        calendarBody.appendChild(row);
    }
    // 填入事件
    renderCalendarEvents();
}

function renderCalendarEvents() {
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
            // 勾選完成的任務加 event-completed
            const todoCheckbox = Array.from(document.querySelectorAll('.todo-list label')).find(label => label.textContent === ev.text)?.previousElementSibling;
            if (todoCheckbox && todoCheckbox.checked) {
                eventDiv.classList.add('event-completed');
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
                selectedDay = parseInt(td.textContent);
                updateSelectedDateDisplay();
                // 高亮顯示
                document.querySelectorAll('#calendarBody td').forEach(t => t.classList.remove('selected-calendar-day'));
                td.classList.add('selected-calendar-day');
                showDetailCard();
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
        if (events.length === 0) {
            ul.innerHTML = '<li style="padding: 20px; text-align: center; color: #999;">尚無事項</li>';
        } else {
            events.forEach((ev, idx) => {
            const taskId = `detail-task-${idx}`;

            // 建立 li 待辦項目
            const li = document.createElement('li');
            li.className = 'todo-item';
            li.innerHTML = `
                <input type="checkbox" id="${taskId}">
                <label for="${taskId}">${ev.title || ev.text}</label>
                <span class="todo-status" data-original="${ev.month}/${ev.day}">${ev.month}/${ev.day}</span>
                <button class="delete-task-btn" title="刪除事項">×</button>
            `;
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

            const checkbox = li.querySelector('input[type="checkbox"]');
            const statusSpan = li.querySelector('.todo-status');
            const deleteBtn = li.querySelector('.delete-task-btn');

            deleteBtn.addEventListener('click', function () {
                if (confirm('確定要刪除此待辦事項嗎？')) {
                    todoEvents = todoEvents.filter(item => item !== ev);
                    showDetailCard();
                    updateTodoList();
                    renderCalendarEvents();
                }
            });

            if (ev.completed) {
                li.classList.add('completed');
                checkbox.checked = true;
                statusSpan.textContent = '已完成';
            }

            checkbox.addEventListener('change', function () {
                if (this.checked) {
                    li.classList.add('completed');
                    statusSpan.textContent = '已完成';
                    markCalendarEventCompleted(ev.text, true);
                    updateTaskCompletion(ev.text, true);

                    // 自動收起詳細說明（如存在）
                    if (detailDiv) {
                        detailDiv.classList.add('collapsed');
                    }

                } else {
                    li.classList.remove('completed');
                    statusSpan.textContent = statusSpan.getAttribute('data-original');
                    markCalendarEventCompleted(ev.text, false);
                    updateTaskCompletion(ev.text, false);
                }
            });
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
    if (todoEvents.length === 0) {
        todoUl.innerHTML = '<li class="todo-item" style="padding: 20px; text-align: center; color: #999;">尚無待辦事項</li>';
    } else {
        todoEvents.forEach((ev, idx) => {
            const taskId = 'task' + (idx + 1);
            const li = document.createElement('li');
            li.className = 'todo-item';
            li.innerHTML = `
                <input type="checkbox" id="${taskId}">
                <label for="${taskId}">${ev.text}</label>
                <span class="todo-status" data-original="${ev.month}/${ev.day}">${ev.month}/${ev.day}</span>
                 <button class="delete-task-btn" title="刪除事項">×</button>
            `;
            todoUl.appendChild(li);

            const checkbox = li.querySelector('input[type="checkbox"]');
            const statusSpan = li.querySelector('.todo-status');
            const deleteBtn = li.querySelector('.delete-task-btn');

            deleteBtn.addEventListener('click', function () {
                if (confirm('確定要刪除此待辦事項嗎？')) {
                    // 從陣列中移除
                    todoEvents = todoEvents.filter(item => item !== ev);
                    updateTodoList();
                    renderCalendarEvents();
                }
            });

            if (ev.completed) {
                li.classList.add('completed');
                checkbox.checked = true;
                statusSpan.textContent = '已完成';
            }

            checkbox.addEventListener('change', function () {
                if (checkbox.checked) {
                    li.classList.add('completed');
                    statusSpan.textContent = '已完成';
                    markCalendarEventCompleted(ev.text, true);
                    updateTaskCompletion(ev.text, true);
                } else {
                    li.classList.remove('completed');
                    statusSpan.textContent = statusSpan.getAttribute('data-original');
                    markCalendarEventCompleted(ev.text, false);
                    updateTaskCompletion(ev.text, false);
                }
                renderCalendarEvents();
            });
        });
    }
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
function addNewTask() {
    const newTaskInput = document.getElementById('newTask');
    if (!newTaskInput) return;

    const taskText = newTaskInput.value.trim();
    if (!selectedDay) {
        alert('請先點選左側日曆日期');
        return;
    }
    if (taskText === '') return;

    let dueDateStr = `${calendarMonth}/${selectedDay}`;

    todoEvents.push({
        year: calendarYear,
        month: calendarMonth,
        day: selectedDay,
        text: taskText,
        completed: false
    });

    newTaskInput.value = '';
    renderCalendarEvents();
    updateTodoList();


    // 添加任務完成事件監聽
    const checkbox = li.querySelector('input[type="checkbox"]');
    const statusSpan = li.querySelector('.todo-status');
    checkbox.addEventListener('change', function() {
        if (this.checked) {
            li.classList.add('completed');
            statusSpan.textContent = '已完成';
            updateTaskCompletion(ev.text, true);
            // 行事曆該事件變灰底
            markCalendarEventCompleted(taskText, true);
        } else {
            li.classList.remove('completed');
            statusSpan.textContent = statusSpan.getAttribute('data-original') || dueDateStr;
            updateTaskCompletion(ev.text, false);
            markCalendarEventCompleted(taskText, false);
        }
    });
}

// 新增詳細資訊卡片的待辦事項
// 確保 DOMContentLoaded 後再綁定事件
window.addEventListener('DOMContentLoaded', function () {
    const addDetailBtn = document.getElementById('addDetailTask');
    if (addDetailBtn) {
        addDetailBtn.addEventListener('click', function () {
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

            todoEvents.push({
                year: calendarYear,
                month: calendarMonth,
                day: selectedDay,
                text: taskText,
                title: title,
                description: description,
                completed: false
            });

            titleInput.value = '';
            if (descriptionInput) descriptionInput.value = '';

            showDetailCard();
            renderCalendarEvents();
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

    initCalendarPage();
});


function updateTaskCompletion(taskText, completed) {
    for (let ev of todoEvents) {
        if (ev.text === taskText) {
            ev.completed = completed;
            break;
        }
    }
}