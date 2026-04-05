import { state, saveToLocal } from './store.js';
import { renderTasks, renderSubjectOptions } from './tasks.js';
import { renderTimetable } from './timetable.js';
import { startTimer, stopTimer, resetTimer, updateTimerDisplay, loadTodayReflection } from './timer.js';

let navItems = [];
const dashboardView = document.getElementById('dashboard-canvas');
const calendarView = document.getElementById('calendar-canvas');
const settingsView = document.getElementById('settings-canvas');
const analyzeView = document.getElementById('analyze-canvas');
const subjectManagerList = document.getElementById('subject-manager-list');

// 전역에서 접근 가능하도록 노출
window.switchTab = switchTab;
window.updateDashboardDateDisplay = updateDashboardDateDisplay;
window.renderTasks = renderTasks;
window.renderTimetable = renderTimetable;
window.renderSubjectOptions = renderSubjectOptions;
window.renderSubjectManager = renderSubjectManager;

export function switchTab(tab) {
    if (navItems.length === 0) navItems = document.querySelectorAll('#side-nav-list li');
    navItems.forEach(li => li.classList.toggle('active', li.dataset.tab === tab));
    [dashboardView, calendarView, settingsView, analyzeView].forEach(view => { if (view) view.style.display = 'none'; });
    
    if (tab === 'dashboard') {
        if (dashboardView) dashboardView.style.display = 'grid';
        updateDashboardDateDisplay();
        renderTasks();
        renderTimetable();
        if (window.updateReflection) window.updateReflection();
    } else if (tab === 'plan') {
        if (calendarView) calendarView.style.display = 'grid';
        renderCalendar();
    } else if (tab === 'settings') {
        if (settingsView) settingsView.style.display = 'grid';
        renderSubjectManager();
    } else if (tab === 'analyze') {
        if (analyzeView) analyzeView.style.display = 'grid';
        // Reset analysis content if needed
        const content = document.getElementById('analysis-content');
        if (content && content.innerHTML.trim() === '') {
             content.innerHTML = '<div class="empty-state"><i data-lucide="brain-circuit"></i><p>분석 항목을 선택하여 시작하세요.</p></div>';
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
        if (window.updateAIAdaptiveFeedback) window.updateAIAdaptiveFeedback();
    }
}

export function renderSubjectManager() {
    if (!subjectManagerList) return;
    subjectManagerList.innerHTML = state.subjects.map((s, idx) => `
        <div class="subject-row" draggable="true" ondragstart="handleDragStart(event, ${idx})" ondragover="handleDragOver(event)" ondrop="handleDrop(event, ${idx})" ondragend="handleDragEnd(event)">
            <div class="drag-handle"><i data-lucide="grip-vertical"></i></div>
            <input type="text" value="${s.name}" onchange="updateSubjectName('${s.id}', this.value)" placeholder="Name">
            <input type="color" value="${s.color}" onchange="updateSubjectColor('${s.id}', this.value)">
            <button onclick="deleteSubject('${s.id}')" class="ghost-btn delete-btn" title="Delete"><i data-lucide="trash-2"></i></button>
        </div>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

let draggedIdx = null;
window.handleDragStart = (e, idx) => { draggedIdx = idx; e.target.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; };
window.handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
window.handleDrop = (e, targetIdx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const movedItem = state.subjects.splice(draggedIdx, 1)[0];
    state.subjects.splice(targetIdx, 0, movedItem);
    saveToLocal();
    renderSubjectManager();
    renderSubjectOptions();
    if (window.renderMobileSubjectManager) window.renderMobileSubjectManager();
};
window.handleDragEnd = (e) => { e.target.classList.remove('dragging'); draggedIdx = null; };

window.updateSubjectName = (id, name) => { state.subjects = state.subjects.map(s => s.id === id ? { ...s, name } : s); saveToLocal(); renderSubjectOptions(); renderSubjectManager(); if(window.renderMobileSubjectManager) window.renderMobileSubjectManager(); renderTasks(); if(window.renderMobileTasks) window.renderMobileTasks(); };
window.updateSubjectColor = (id, color) => { state.subjects = state.subjects.map(s => s.id === id ? { ...s, color } : s); saveToLocal(); renderTasks(); if(window.renderMobileTasks) window.renderMobileTasks(); renderTimetable(); renderSubjectManager(); if(window.renderMobileSubjectManager) window.renderMobileSubjectManager(); };
window.deleteSubject = (id) => { if (state.subjects.length <= 1) return alert('최소 하나의 과목은 있어야 합니다.'); state.subjects = state.subjects.filter(s => s.id !== id); saveToLocal(); renderSubjectManager(); renderSubjectOptions(); if(window.renderMobileSubjectManager) window.renderMobileSubjectManager(); renderTasks(); if(window.renderMobileTasks) window.renderMobileTasks(); renderTimetable(); };

let currentCalendarDate = new Date();

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthYearLabel = document.getElementById('calendar-month-year');
    if (!grid || !monthYearLabel) return;
    
    grid.innerHTML = '';
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
    monthYearLabel.textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const today = new Date();
    const isThisMonth = today.getFullYear() === year && today.getMonth() === month;
    
    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day empty';
        grid.appendChild(div);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        if (isThisMonth && today.getDate() === day) {
            div.classList.add('today');
        }

        // 하루 회고 점수 가져오기
        const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const reflection = state.reflections[dateKey];
        let scoreHtml = '';
        if (reflection && reflection.total !== undefined) {
            scoreHtml = `<div class="day-score">${reflection.total}</div>`;
        }

        div.innerHTML = `<span>${day}</span>${scoreHtml}`;
        grid.appendChild(div);
    }
}

export function updateDashboardDateDisplay() {
    const displayDate = document.getElementById('display-date');
    if (!displayDate) return;
    
    const d = new Date(state.selectedDate);
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' };
    displayDate.textContent = d.toLocaleDateString('ko-KR', options).replace(/\//g, '. ');
}

export function setupEventListeners() {
    navItems = document.querySelectorAll('#side-nav-list li');
    
    const openTaskModalBtn = document.getElementById('open-task-modal');
    if (openTaskModalBtn) {
        openTaskModalBtn.onclick = () => { renderSubjectOptions(); document.getElementById('task-modal').classList.add('active'); };
    }
    
    const closeTaskModalBtn = document.getElementById('close-task-modal');
    if (closeTaskModalBtn) {
        closeTaskModalBtn.onclick = () => document.getElementById('task-modal').classList.remove('active');
    }
    
    const confirmAddTaskBtn = document.getElementById('confirm-add-task');
    if (confirmAddTaskBtn) {
        confirmAddTaskBtn.onclick = () => {
            const nameEl = document.getElementById('task-name');
            const subjectEl = document.getElementById('task-subject');
            if(nameEl && nameEl.value) {
                state.tasks.push({
                    id: Date.now(), 
                    subject: subjectEl.value, 
                    name: nameEl.value, 
                    duration: '0s', 
                    completed: false,
                    date: state.selectedDate // 현재 선택된 날짜 저장
                });
                saveToLocal(); renderTasks(); document.getElementById('task-modal').classList.remove('active');
            }
        };
    }

    const displayDate = document.getElementById('display-date');
    const datePicker = document.getElementById('date-picker');
    if (displayDate && datePicker) {
        displayDate.onclick = () => datePicker.showPicker();
        datePicker.value = state.selectedDate;
        datePicker.onchange = (e) => {
            state.selectedDate = e.target.value;
            updateDashboardDateDisplay();
            renderTasks();
            renderTimetable();
            if (window.loadReflectionForDate) window.loadReflectionForDate(state.selectedDate);
            else if (window.loadTodayReflection) window.loadTodayReflection();
        };
    }
    
    const exitZenBtn = document.getElementById('exit-zen-btn');
    if (exitZenBtn) {
        exitZenBtn.onclick = () => document.getElementById('zen-overlay').classList.remove('active');
    }
    
    const modeTimerBtn = document.getElementById('mode-timer-btn');
    if (modeTimerBtn) {
        modeTimerBtn.onclick = () => { 
            if(state.timer.isRunning) return; 
            state.timer.mode = 'timer'; 
            document.getElementById('mode-timer-btn').classList.add('active');
            document.getElementById('mode-stopwatch-btn').classList.remove('active');
            updateTimerDisplay(); 
        };
    }
    
    const modeStopwatchBtn = document.getElementById('mode-stopwatch-btn');
    if (modeStopwatchBtn) {
        modeStopwatchBtn.onclick = () => { 
            if(state.timer.isRunning) return; 
            state.timer.mode = 'stopwatch'; 
            document.getElementById('mode-stopwatch-btn').classList.add('active');
            document.getElementById('mode-timer-btn').classList.remove('active');
            updateTimerDisplay(); 
        };
    }
    
    const prevMonthBtn = document.getElementById('prev-month');
    if (prevMonthBtn) {
        prevMonthBtn.onclick = () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            renderCalendar();
        };
    }
    
    const nextMonthBtn = document.getElementById('next-month');
    if (nextMonthBtn) {
        nextMonthBtn.onclick = () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            renderCalendar();
        };
    }

    const addSubjectBtn = document.getElementById('add-subject-btn');
    if (addSubjectBtn) {
        addSubjectBtn.onclick = () => {
            const id = 'SUB_' + Date.now();
            state.subjects.push({ id: id, name: '신규 과목', color: '#6A1B9A' });
            saveToLocal();
            renderSubjectManager();
            renderSubjectOptions();
            if(window.renderMobileSubjectManager) window.renderMobileSubjectManager();
        };
    }

    navItems.forEach(li => li.onclick = () => switchTab(li.dataset.tab));

    const btnStart = document.querySelector('.btn-start');
    if (btnStart) {
        btnStart.addEventListener('click', () => { if (state.timer.isRunning) stopTimer(); else startTimer(); });
    }
    
    const btnReset = document.querySelector('.btn-reset');
    if (btnReset) {
        btnReset.addEventListener('click', resetTimer);
    }

    // Analysis Action Card Mouse Effect
    document.addEventListener('mousemove', (e) => {
        const cards = document.querySelectorAll('.action-card');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--x', `${x}px`);
            card.style.setProperty('--y', `${y}px`);
        });
    });
}

