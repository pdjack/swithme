/**
 * mobile.js
 * 모바일 전용 UI 이벤트 핸들러 및 렌더링 로직
 * 기존 store.js의 state를 공유하고, PC 사이드 함수(timer 등)를 재사용합니다.
 */

import { state, saveToLocal, getActiveHistory, getActiveTimetable } from './store.js';
import { icon } from './icons.js';
import { startTimer, stopTimer, resetTimer, updateTimerDisplay } from './timer.js';
import { renderSubjectOptions, getGroupedTaskData } from './tasks.js';
import { renderSubjectManager } from './ui.js';
import { renderTimetable } from './timetable.js';

// ── 타이머 디스플레이 동기화 ─────────────────────────────────────
// 기존 updateTimerDisplay는 #timer-display만 업데이트.
// 모바일에서는 #m-timer-display / #m-timer-progress도 함께 갱신.

function syncMobileTimerDisplay() {
    const mDisplay = document.getElementById('m-timer-display');
    const mProgress = document.getElementById('m-timer-progress');

    const curSecs = state.timer.mode === 'timer'
        ? state.timer.seconds
        : state.timer.stopwatchSeconds;
    const mins = Math.floor(curSecs / 60);
    const secs = curSecs % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (mDisplay) mDisplay.textContent = timeStr;

    if (mProgress) {
        if (state.timer.mode === 'timer') {
            const total = state.timer.totalDuration || 1500;
            // 원 둘레 = 2π × 45 ≈ 282.7
            const offset = 282.7 * (1 - curSecs / total);
            mProgress.style.strokeDashoffset = offset;
            mProgress.style.visibility = 'visible';
        } else {
            mProgress.style.visibility = 'hidden';
        }
    }
}

// 기존 updateTimerDisplay를 확장하여 모바일 표시도 동기화
const originalUpdateTimerDisplay = updateTimerDisplay;
window.updateTimerDisplayExtended = () => {
    originalUpdateTimerDisplay();
    syncMobileTimerDisplay();
};

// 모듈 간 동기화를 위해 전역 노출
window.renderMobileTasks = renderMobileTasks;

// ── 모바일 START/STOP 버튼 상태 반영 ────────────────────────────
function syncMobileStartBtn(isRunning) {
    const btn = document.getElementById('m-btn-start');
    if (!btn) return;
    if (isRunning) {
        btn.textContent = 'STOP';
        btn.style.background = '#FF2D55';
    } else {
        btn.textContent = state.timer.seconds < (state.timer.totalDuration || 1500) && state.timer.mode === 'timer'
            ? 'RESUME'
            : 'START';
        btn.style.background = 'var(--primary)';
    }
}

// ── 세팅 내부 탭 전환 ────────────────────────────────────────────
function switchMobileSettingsTab(tab) {
    document.querySelectorAll('.m-settings-tab').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.settingsTab === tab)
    );
    document.querySelectorAll('.m-settings-tab-panel').forEach(panel => {
        panel.style.display = 'none';
    });
    const target = document.getElementById(`m-settings-tab-${tab}`);
    if (target) target.style.display = '';
}

// ── 탭 전환 ──────────────────────────────────────────────────────
function switchMobileTab(tab) {
    const panels = {
        dashboard: 'm-dashboard-panel',
        plan:      'm-calendar-panel',
        analyze:   'm-analyze-panel',
        settings:  'm-settings-panel',
    };

    document.querySelectorAll('.m-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mtab === tab);
    });

    Object.entries(panels).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el) el.style.display = key === tab ? 'flex' : 'none';
    });

    if (tab === 'dashboard') {
        renderMobileTasks();
        renderTimetable();
        // 회고 탭이 활성 상태면 데이터 동기화
        const activeColTab = document.querySelector('.m-col-tab.active');
        if (activeColTab && activeColTab.dataset.colTab === 'reflection') {
            syncMobileReflectionInputs();
        }
    } else if (tab === 'plan') {
        renderMobileCalendar();
    } else if (tab === 'settings') {
        renderMobileSubjectManager();
        renderMobileReflectionItemManager();
    } else if (tab === 'analyze') {
        if (window.updateAIAdaptiveFeedback) window.updateAIAdaptiveFeedback();
        // 분석 탭의 analysis-content를 모바일 영역에 복사
        syncMobileAnalysisContent();
    }

}

// ── 모바일 할 일 목록 렌더링 ─────────────────────────────────────
export function renderMobileTasks() {
    const mTaskList = document.getElementById('m-task-list');
    if (!mTaskList) return;

    const groupedSubjects = getGroupedTaskData();

    if (groupedSubjects.length === 0) {
        mTaskList.innerHTML = `<li style="text-align:center; padding:32px 12px; color:var(--text-dim); font-size:13px;">오늘의 계획이 없습니다.</li>`;
        return;
    }

    mTaskList.innerHTML = groupedSubjects.map(group => `
        <li class="m-subject-group">
            <div class="m-subject-header">
                <span class="m-subject-bar" style="background:${group.color}"></span>
                <span class="m-subject-name">${group.name}</span>
                <span class="m-subject-time">${group.totalTimeFormatted}</span>
            </div>
            <div class="m-task-items">
                ${group.tasks.map(task => `
                    <div class="m-task-item ${task.completed ? 'completed-task' : ''} ${state.timer.activeTaskId === task.id ? 'active-task' : ''}"
                         data-task-id="${task.id}">
                        <button class="m-task-play-btn ${state.timer.activeTaskId === task.id ? 'playing' : ''}"
                                data-play-id="${task.id}">
                            ${icon(state.timer.activeTaskId === task.id ? 'pause' : 'play')}
                        </button>
                        <span class="m-t-name">${task.name}</span>
                        <div class="m-task-actions">
                            <button class="m-t-delete-btn" data-delete-id="${task.id}">
                                ${icon('trash-2')}
                            </button>
                            <button class="m-t-done-btn" data-done-id="${task.id}"></button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </li>
    `).join('');
}

// ── 모바일 캘린더 렌더링 ─────────────────────────────────────────
let mobileCalendarDate = new Date();

function renderMobileCalendar() {
    const grid = document.getElementById('m-calendar-grid');
    const label = document.getElementById('m-calendar-month-year');
    if (!grid || !label) return;

    grid.innerHTML = '';
    const year = mobileCalendarDate.getFullYear();
    const month = mobileCalendarDate.getMonth();

    const monthNames = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
    label.textContent = `${monthNames[month]} ${year}`;

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
        if (isThisMonth && today.getDate() === day) div.classList.add('today');

        const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const reflection = state.reflections[dateKey];
        const scoreHtml = reflection?.total !== undefined
            ? `<div class="day-score">${reflection.total}</div>`
            : '';

        div.innerHTML = `<span>${day}</span>${scoreHtml}`;
        
        // 날짜 선택 클릭 이벤트 추가
        div.addEventListener('click', () => {
            state.selectedDate = dateKey;
            updateMobileDateDisplay();
            switchMobileTab('dashboard'); // 대시보드 탭으로 전환하여 해당 날짜 계획 확인
            
            // 전역 동기화 (PC 쪽도 필요한 경우)
            if (typeof window.updateDashboardDateDisplay === 'function') {
                window.updateDashboardDateDisplay();
                if (typeof window.renderTasks === 'function') window.renderTasks();
                if (typeof window.renderTimetable === 'function') window.renderTimetable();
            }
        });

        grid.appendChild(div);
    }
}

// ── 모바일 과목 관리자 렌더링 ────────────────────────────────────
function renderMobileSubjectManager() {
    const list = document.getElementById('m-subject-manager-list');
    if (!list) return;
    list.innerHTML = state.subjects.map((s) => `
        <div class="subject-row">
            <input type="text" value="${s.name}" onchange="updateSubjectName('${s.id}', this.value)" placeholder="Name">
            <input type="color" value="${s.color}" onchange="updateSubjectColor('${s.id}', this.value)">
            <button onclick="deleteSubject('${s.id}')" class="ghost-btn" title="Delete">${icon('trash-2')}</button>
        </div>
    `).join('');
}
window.renderMobileSubjectManager = renderMobileSubjectManager;

function renderMobileReflectionItemManager() {
    const list = document.getElementById('m-reflection-item-manager-list');
    if (!list) return;
    list.innerHTML = state.reflectionItems.map(item => `
        <div class="subject-row">
            <span class="r-item-emoji">${item.emoji}</span>
            <input type="text" value="${item.name}" onchange="updateReflectionItemName('${item.id}', this.value)" placeholder="항목 이름">
            <button onclick="deleteReflectionItem('${item.id}')" class="ghost-btn" title="Delete">${icon('trash-2')}</button>
        </div>
    `).join('');
}
window.renderMobileReflectionItemManager = renderMobileReflectionItemManager;

// ── 할 일 / 회고 컬럼 탭 전환 ─────────────────────────────────────
function initColumnTabs() {
    const tabs = document.querySelectorAll('.m-col-tab');
    if (!tabs.length) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchColumnTab(tab.dataset.colTab));
    });

    // 초기 인디케이터 위치 설정
    updateTabIndicator();
}

function switchColumnTab(tabName) {
    const taskList = document.getElementById('m-task-list');
    const reflectionContent = document.getElementById('m-reflection-content');
    const addBtn = document.getElementById('m-open-task-btn');

    document.querySelectorAll('.m-col-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.colTab === tabName);
    });

    if (tabName === 'tasks') {
        if (taskList) taskList.style.display = '';
        if (reflectionContent) reflectionContent.style.display = 'none';
        if (addBtn) addBtn.style.display = '';
    } else if (tabName === 'reflection') {
        if (taskList) taskList.style.display = 'none';
        if (reflectionContent) reflectionContent.style.display = 'flex';
        if (addBtn) addBtn.style.display = 'none';
        syncMobileReflectionInputs();
    }

    updateTabIndicator();
}

function updateTabIndicator() {
    const activeTab = document.querySelector('.m-col-tab.active');
    const indicator = document.querySelector('.m-col-tab-indicator');
    if (!activeTab || !indicator) return;

    const parentLeft = activeTab.parentElement.getBoundingClientRect().left;
    const tabRect = activeTab.getBoundingClientRect();
    indicator.style.left = (tabRect.left - parentLeft) + 'px';
    indicator.style.width = tabRect.width + 'px';
}

window.switchColumnTab = switchColumnTab;

// ── 하루 회고 동기화 (모바일 ↔ 데스크탑 공유 state) ──────────────
window.renderMobileReflectionInputs = () => {
    const container = document.getElementById('m-reflection-items-container');
    if (!container) return;

    const items = state.reflectionItems;
    container.innerHTML = `
        <div class="reflect-item auto">
            <span class="r-label">🎯 목표 달성률</span>
            <div class="r-score-wrap"><span id="m-score-achievement">0</span><small>/20</small></div>
        </div>
        <hr class="r-divider">
        ${items.map((item, i) => {
            const max = window.getReflectionItemMax(i);
            return `
            <div class="reflect-item user">
                <span class="r-label">${item.emoji} ${item.name}</span>
                <div class="r-score-wrap">
                    <input type="number" id="m-input-${item.id}" min="0" max="${max}" value="0"
                        data-max="${max}"
                        oninput="validateScore(this); syncMobileReflection()" class="r-score-input">
                    <small>/${max}</small>
                </div>
            </div>`;
        }).join('')}
    `;
};

function syncMobileReflectionInputs() {
    window.renderMobileReflectionInputs();

    const targetDate = state.selectedDate;
    const data = state.reflections[targetDate];

    for (const item of state.reflectionItems) {
        const input = document.getElementById(`m-input-${item.id}`);
        if (input) input.value = data ? (data[item.id] || 0) : 0;
    }

    window.syncMobileReflection();
}

window.syncMobileReflection = () => {
    const dailyTasks = state.tasks.filter(t => t.date === state.selectedDate);
    const completed = dailyTasks.filter(t => t.completed).length;
    const achievement = dailyTasks.length > 0 ? Math.round((completed / dailyTasks.length) * 20) : 0;

    const el = (id) => document.getElementById(id);
    if (el('m-score-achievement')) el('m-score-achievement').textContent = achievement;

    let total = achievement;
    for (const item of state.reflectionItems) {
        total += parseInt(el(`m-input-${item.id}`)?.value) || 0;
    }
    if (el('m-total-reflection-score')) el('m-total-reflection-score').textContent = total;
};

window.saveMobileReflection = () => {
    const el = (id) => document.getElementById(id);
    const targetDate = state.selectedDate;
    const reflection = {
        achievement: parseInt(el('m-score-achievement')?.textContent) || 0,
    };
    for (const item of state.reflectionItems) {
        reflection[item.id] = parseInt(el(`m-input-${item.id}`)?.value) || 0;
    }
    reflection.total = parseInt(el('m-total-reflection-score')?.textContent) || 0;

    state.reflections[targetDate] = reflection;
    saveToLocal();
    alert(`[${targetDate}] 하루 회고가 저장되었습니다! 총점: ${reflection.total}점`);
};

// ── 분석 결과를 모바일 영역에도 반영 ────────────────────────────
function syncMobileAnalysisContent() {
    const src = document.getElementById('analysis-content');
    const dst = document.getElementById('m-analysis-content');
    if (src && dst) {
        dst.innerHTML = src.innerHTML;
    }
}

// ── 날짜 표시 업데이트 (모바일 상단) ────────────────────────────
function updateMobileDateDisplay() {
    const el = document.getElementById('m-display-date');
    const picker = document.getElementById('m-date-picker');
    if (!el) return;
    const d = new Date(state.selectedDate);
    el.textContent = d.toLocaleDateString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short'
    }).replace(/\//g, '. ');
    
    if (picker) {
        picker.value = state.selectedDate;
    }
}

// ── 메인 초기화 ──────────────────────────────────────────────────
export function setupMobileUI() {
    updateMobileDateDisplay();

    // ── 날짜 선택 제어 (모바일 헤더) ───────────────────────────
    const mDisplayDate = document.getElementById('m-display-date');
    const mDatePicker = document.getElementById('m-date-picker');
    if (mDisplayDate && mDatePicker) {
        mDisplayDate.addEventListener('click', () => {
            if (typeof mDatePicker.showPicker === 'function') {
                mDatePicker.showPicker();
            } else {
                mDatePicker.click();
            }
        });
        mDatePicker.addEventListener('change', (e) => {
            state.selectedDate = e.target.value;
            updateMobileDateDisplay();
            renderMobileTasks();
            renderTimetable();
            
            // PC 쪽과 동기화
            if (typeof window.updateDashboardDateDisplay === 'function') {
                window.updateDashboardDateDisplay();
                if (typeof window.renderTasks === 'function') window.renderTasks();
                if (typeof window.renderTimetable === 'function') window.renderTimetable();
            }
        });
    }

    // 모바일 타이머 표시 hook: 기존 interval tick에 연동
    // timer.js의 updateTimerDisplay를 오버라이드하여 모바일도 함께 업데이트
    const originalFn = window._originalUpdateTimerDisplay || updateTimerDisplay;
    window._originalUpdateTimerDisplay = originalFn;

    // setInterval 내부에서 호출되는 updateTimerDisplay를 패치
    // timer.js에서 import된 함수는 직접 패치할 수 없으므로
    // MutationObserver로 PC 타이머 표시와 동기화합니다.
    const pcDisplay = document.getElementById('timer-display');
    if (pcDisplay) {
        let rafPending = false;
        const observer = new MutationObserver(() => {
            if (rafPending) return;
            rafPending = true;
            window.requestAnimationFrame(() => {
                syncMobileTimerDisplay();
                syncMobileStartBtn(state.timer.isRunning);
                rafPending = false;
            });
        });
        observer.observe(pcDisplay, { childList: true, characterData: true, subtree: true });
    }

    // ── 탭 이벤트 ──────────────────────────────────────────────
    document.querySelectorAll('.m-tab').forEach(btn => {
        btn.addEventListener('click', () => switchMobileTab(btn.dataset.mtab));
    });

    // ── 세팅 내부 탭 전환 (카테고리 / 회고 항목) ─────────────
    document.querySelectorAll('.m-settings-tab').forEach(btn => {
        btn.addEventListener('click', () => switchMobileSettingsTab(btn.dataset.settingsTab));
    });

    // ── 할 일 / 회고 컬럼 탭 전환 ───────────────────────────────
    initColumnTabs();

    // ── 타이머 모드 전환 (모바일 헤더) ────────────────────────
    const mTimerBtn = document.getElementById('m-mode-timer-btn');
    const mStopwatchBtn = document.getElementById('m-mode-stopwatch-btn');

    if (mTimerBtn) {
        mTimerBtn.addEventListener('click', () => {
            if (state.timer.isRunning) return;
            state.timer.mode = 'timer';
            mTimerBtn.classList.add('active');
            mStopwatchBtn?.classList.remove('active');
            // PC 버튼도 동기화
            document.getElementById('mode-timer-btn')?.classList.add('active');
            document.getElementById('mode-stopwatch-btn')?.classList.remove('active');
            updateTimerDisplay();
            syncMobileTimerDisplay();
        });
    }

    if (mStopwatchBtn) {
        mStopwatchBtn.addEventListener('click', () => {
            if (state.timer.isRunning) return;
            state.timer.mode = 'stopwatch';
            mStopwatchBtn.classList.add('active');
            mTimerBtn?.classList.remove('active');
            // PC 버튼도 동기화
            document.getElementById('mode-stopwatch-btn')?.classList.add('active');
            document.getElementById('mode-timer-btn')?.classList.remove('active');
            updateTimerDisplay();
            syncMobileTimerDisplay();
        });
    }

    // ── START / STOP ────────────────────────────────────────────
    const mBtnStart = document.getElementById('m-btn-start');
    if (mBtnStart) {
        mBtnStart.addEventListener('click', () => {
            if (state.timer.isRunning) {
                stopTimer();
                syncMobileStartBtn(false);
            } else {
                startTimer();
                syncMobileStartBtn(state.timer.isRunning);
            }
        });
    }

    // ── RESET ───────────────────────────────────────────────────
    const mBtnReset = document.getElementById('m-btn-reset');
    if (mBtnReset) {
        mBtnReset.addEventListener('click', () => {
            resetTimer();
            syncMobileTimerDisplay();
            syncMobileStartBtn(false);
        });
    }

    // ── 몰입 모드 버튼 ─────────────────────────────────────────
    const mZenBtn = document.getElementById('m-zen-btn');
    if (mZenBtn) {
        mZenBtn.addEventListener('click', () => {
            const overlay = document.getElementById('zen-overlay');
            if (overlay) overlay.classList.add('active');
        });
    }

    // ── 할 일 추가 버튼 (모바일 hero 영역) ────────────────────
    const mOpenTaskHero = document.getElementById('m-open-task-modal-btn');
    if (mOpenTaskHero) {
        mOpenTaskHero.addEventListener('click', () => {
            renderSubjectOptions();
            document.getElementById('task-modal')?.classList.add('active');
        });
    }

    // ── 할 일 추가 버튼 (dashboard 패널) ──────────────────────
    const mOpenTaskDash = document.getElementById('m-open-task-btn');
    if (mOpenTaskDash) {
        mOpenTaskDash.addEventListener('click', () => {
            renderSubjectOptions();
            document.getElementById('task-modal')?.classList.add('active');
        });
    }

    // ── 타임테이블 클리어 (모바일) ────────────────────────────
    const mClearBtn = document.getElementById('m-clear-timetable-btn');
    if (mClearBtn) {
        mClearBtn.addEventListener('click', () => {
            const tt = getActiveTimetable();
            if (tt.type === 'plan') {
                if (confirm('선택한 날짜의 모든 계획을 삭제하시겠습니까?')) {
                    tt.plans = tt.plans.filter(p => p.date && p.date !== state.selectedDate);
                    saveToLocal();
                    renderTimetable();
                }
            } else {
                if (confirm('오늘의 모든 공부 기록(타임테이블)을 삭제하시겠습니까?')) {
                    getActiveHistory().splice(0);
                    state.tasks = state.tasks.map(t => ({ ...t, duration: '0s' }));
                    saveToLocal();
                    renderMobileTasks();
                    renderTimetable();
                }
            }
        });
    }

    // ── 할 일 목록 이벤트 위임 (재렌더 후에도 유효) ───────────
    const mTaskList = document.getElementById('m-task-list');
    if (mTaskList) {
        mTaskList.addEventListener('click', (e) => {
            // 1. 태스크 아이템 자체 클릭 (선택 및 토글)
            const taskItem = e.target.closest('.m-task-item');
            const playBtn = e.target.closest('[data-play-id]');
            const doneBtn = e.target.closest('[data-done-id]');
            const deleteBtn = e.target.closest('[data-delete-id]');

            if (taskItem && !playBtn && !doneBtn && !deleteBtn) {
                const id = Number(taskItem.dataset.taskId);
                if (state.timer.isRunning) return; // 실행 중엔 선택 변경 불가
                state.timer.activeTaskId = (state.timer.activeTaskId === id) ? null : id;
                renderMobileTasks();
                if (typeof window.renderTasks === 'function') window.renderTasks();
                return;
            }

            // 2. 플레이 버튼 클릭 (즉시 시작/중지 및 교체)
            if (playBtn) {
                const id = Number(playBtn.dataset.playId);
                
                if (state.timer.isRunning) {
                    if (state.timer.activeTaskId === id) {
                        // 현재 태스크 중지
                        stopTimer();
                        syncMobileStartBtn(false);
                    } else {
                        // 다른 태스크로 전환: 현재 완료하고 새 태스크 시작
                        stopTimer();
                        state.timer.activeTaskId = id;
                        setTimeout(() => {
                            startTimer();
                            syncMobileStartBtn(true);
                            renderMobileTasks();
                        }, 100);
                    }
                } else {
                    // 멈춰있는 상태: 선택하고 시작
                    state.timer.activeTaskId = id;
                    startTimer();
                    syncMobileStartBtn(true);
                }
                renderMobileTasks();
                if (typeof window.renderTasks === 'function') window.renderTasks();
                return;
            }
            // 완료 버튼
            if (doneBtn) {
                const id = Number(doneBtn.dataset.doneId);
                state.tasks = state.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
                saveToLocal();
                renderMobileTasks();
                window.syncMobileReflection?.();
            }
            // 삭제 버튼
            if (deleteBtn) {
                const id = Number(deleteBtn.dataset.deleteId);
                if (state.timer.activeTaskId === id) {
                    return alert('진행 중인 태스크는 삭제할 수 없습니다.');
                }
                if (confirm('정말 이 할 일을 삭제하시겠습니까?')) {
                    state.tasks = state.tasks.filter(t => t.id !== id);
                    saveToLocal();
                    renderMobileTasks();
                    // PC 쪽도 동기화
                    if (typeof window.renderTasks === 'function') window.renderTasks();
                    window.syncMobileReflection?.();
                }
            }
        });
    }

    // ── 캘린더 페이징 ─────────────────────────────────────────
    document.getElementById('m-prev-month')?.addEventListener('click', () => {
        mobileCalendarDate.setMonth(mobileCalendarDate.getMonth() - 1);
        renderMobileCalendar();
    });
    document.getElementById('m-next-month')?.addEventListener('click', () => {
        mobileCalendarDate.setMonth(mobileCalendarDate.getMonth() + 1);
        renderMobileCalendar();
    });

    // ── 과목 추가 버튼 (설정 탭) ──────────────────────────────
    document.getElementById('m-add-subject-btn')?.addEventListener('click', () => {
        const id = 'SUB_' + Date.now();
        state.subjects.push({ id: id, name: '신규 카테고리', color: '#6A1B9A' });
        saveToLocal();
        renderMobileSubjectManager();
        renderSubjectManager();
        renderSubjectOptions();
    });

    // ── 회고 항목 추가 버튼 (설정 탭) ────────────────────────
    document.getElementById('m-add-reflection-item-btn')?.addEventListener('click', () => {
        window.addReflectionItem();
    });

    // ── 첫 렌더 ────────────────────────────────────────────────
    renderMobileTasks();
    renderTimetable();
    syncMobileTimerDisplay();

    // ── 모달 확인(추가) 후 모바일 목록도 갱신 ─────────────────
    const confirmAdd = document.getElementById('confirm-add-task');
    if (confirmAdd) {
        // 기존 핸들러 이후에 추가 동기화 (이벤트 캡처 순서 보장)
        confirmAdd.addEventListener('click', () => {
            setTimeout(() => {
                renderMobileTasks();
            }, 50);
        });
    }
}
