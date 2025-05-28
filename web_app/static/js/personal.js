function initializeParallax() {
    const bgText = document.querySelector('.bg-text');

    function parallaxScroll() {
        const scrollPosition = window.pageYOffset;
        if (bgText) {
            bgText.style.transform = `translateX(${scrollPosition * -0.9}px)`;
        }
    }

    window.addEventListener('scroll', parallaxScroll);
}


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
    document.getElementById('taskDateMonth').textContent = getMonthYearText(year, month);
    // 設定 input[type=date] min/max
    const min = `${year}-${pad2(month)}-01`;
    const max = `${year}-${pad2(month)}-${pad2(new Date(year, month, 0).getDate())}`;
    const dateInput = document.getElementById('taskDate');
    dateInput.setAttribute('min', min);
    dateInput.setAttribute('max', max);
    // 若目前日期不在範圍，重設
    if (dateInput.value < min || dateInput.value > max) dateInput.value = '';
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
    document.getElementById('prevMonth').onclick = () => {
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
    document.getElementById('nextMonth').onclick = () => {
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
            };
        } else {
            td.onclick = null;
            td.style.cursor = '';
        }
    });
}

function updateSelectedDateDisplay() {
    const display = document.getElementById('selectedDateDisplay');
    const newTaskInput = document.getElementById('newTask');
    if (selectedDay) {
        display.style.display = 'block';
        display.textContent = `${calendarYear}.${calendarMonth}.${selectedDay}`;
        if (newTaskInput) newTaskInput.placeholder = '添加新的待辦事項...';
    } else {
        display.style.display = 'none';
        if (newTaskInput) newTaskInput.placeholder = '請點選左方日期';
    }
    // 右側輸入框清空
    document.getElementById('newTask').value = '';
    document.getElementById('taskTime').value = '';
}


// 待辦事項相關函數
document.getElementById('addTask').addEventListener('click', addNewTask);

function addNewTask() {
    const newTaskInput = document.getElementById('newTask');
    const taskText = newTaskInput.value.trim();

    if (!selectedDay) {
        alert('請先點選左側日曆日期');
        return;
    }
    if (taskText === '') return;

    // 組合 due date string
    let dueDateStr = `${calendarMonth}/${selectedDay}`;

    const todoList = document.querySelector('.todo-list');
    const taskId = 'task' + (todoList.children.length + 1);

    const li = document.createElement('li');
    li.className = 'todo-item';

    li.innerHTML = `
        <input type="checkbox" id="${taskId}">
        <label for="${taskId}">${taskText}</label>
        <span class="todo-status" data-original="${dueDateStr}">${dueDateStr}</span>
    `;

    todoList.appendChild(li);
    newTaskInput.value = '';

    // 加入 calendar event list
    todoEvents.push({
        year: calendarYear,
        month: calendarMonth,
        day: selectedDay,
        text: taskText
    });
    renderCalendarEvents();

    // 添加任務完成事件監聽
    const checkbox = li.querySelector('input[type="checkbox"]');
    const statusSpan = li.querySelector('.todo-status');
    checkbox.addEventListener('change', function() {
        if (this.checked) {
            li.classList.add('completed');
            statusSpan.textContent = '已完成';
            // 行事曆該事件變灰底
            markCalendarEventCompleted(taskText, true);
        } else {
            li.classList.remove('completed');
            statusSpan.textContent = statusSpan.getAttribute('data-original') || dueDateStr;
            markCalendarEventCompleted(taskText, false);
        }
    });

// 標記行事曆事件完成/取消
function markCalendarEventCompleted(eventText, completed) {
    // 只處理當前月份所有事件
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
}

// 已由 renderCalendarEvents 取代

// 任務完成狀態處理
// 初始載入時也要支援恢復 due date
// 這段只針對現有的 li 設定監聽

document.querySelectorAll('.todo-list input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        const listItem = this.closest('.todo-item');
        const statusSpan = listItem.querySelector('.todo-status');
        if (this.checked) {
            listItem.classList.add('completed');
            if (statusSpan) statusSpan.textContent = '已完成';
        } else {
            listItem.classList.remove('completed');
            if (statusSpan) statusSpan.textContent = statusSpan.getAttribute('data-original') || '今天';
        }
    });
});

// 初始化頁面
document.addEventListener('DOMContentLoaded', () => {
    initCalendarPage();
    initializeParallax();
});
