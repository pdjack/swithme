/**
 * mobile.js
 * 모바일 전용 UI 이벤트 핸들러 및 렌더링 로직
 * 기존 store.js의 state를 공유하고, PC 사이드 함수(timer 등)를 재사용합니다.
 */

import { state, saveToLocal, formatSeconds, getSubjectColor } from './store.js';
import { startTimer, stopTimer, resetTimer, updateTimerDisplay } from './timer.js';
import { renderSubjectOptions } from './tasks.js';
import { renderSubjectManager } from './ui.js';

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
window.renderMobileTimetable = renderMobileTimetable;

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
        renderMobileTimetable();
    } else if (tab === 'plan') {
        renderMobileCalendar();
    } else if (tab === 'settings') {
        renderMobileSubjectManager();
        syncMobileReflectionInputs();
    } else if (tab === 'analyze') {
        if (window.updateAIAdaptiveFeedback) window.updateAIAdaptiveFeedback();
        // 분석 탭의 analysis-content를 모바일 영역에 복사
        syncMobileAnalysisContent();
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ── 모바일 할 일 목록 렌더링 ─────────────────────────────────────
export function renderMobileTasks() {
    const mTaskList = document.getElementById('m-task-list');
    if (!mTaskList) return;

    const dailyTasks = state.tasks.filter(t => t.date === state.selectedDate);

    const groupedSubjects = state.subjects.map(subject => {
        const tasks = dailyTasks.filter(t => t.subject === subject.id);
        const totalSecs = state.history
            .filter(h => h.subject === subject.id && h.startTime.startsWith(state.selectedDate))
            .reduce((acc, h) => acc + h.duration, 0);
        return { ...subject, tasks, totalTimeFormatted: formatSeconds(totalSecs) };
    }).filter(s => s.tasks.length > 0 || state.history.some(h => h.subject === s.id && h.startTime.startsWith(state.selectedDate)));

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
                            <i data-lucide="${state.timer.activeTaskId === task.id ? 'pause' : 'play'}"></i>
                        </button>
                        <span class="m-t-name">${task.name}</span>
                        <button class="m-t-done-btn" data-done-id="${task.id}"></button>
                    </div>
                `).join('')}
            </div>
        </li>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ── 모바일 타임테이블 렌더링 ─────────────────────────────────────
export function renderMobileTimetable() {
    const root = document.getElementById('m-timetable-root');
    if (!root) return;

    root.innerHTML = '';
    const startHour = 6;

    for (let i = 0; i < 24; i++) {
        const hour = (startHour + i) % 24;
        const row = document.createElement('div');
        row.className = 'hour-row';

        const label = document.createElement('div');
        label.className = 'hour-label';
        label.textContent = hour.toString().padStart(2, '0');
        row.appendChild(label);

        const slots = document.createElement('div');
        slots.className = 'ten-min-slots';

        for (let j = 0; j < 6; j++) {
            const slot = document.createElement('div');
            slot.className = 'slot';

            const slotTime = new Date(state.selectedDate);
            slotTime.setHours(hour, j * 10, 0, 0);
            if (hour < startHour) slotTime.setDate(slotTime.getDate() + 1);

            const slotStart = slotTime.getTime();
            const slotEnd = slotStart + 10 * 60000;

            const activeSession = state.history.find(session => {
                const sStart = new Date(session.startTime).getTime();
                const sEnd = sStart + session.duration * 1000;
                return sStart < slotEnd && sEnd > slotStart;
            });

            if (activeSession) {
                slot.classList.add('filled');
                slot.style.background = getSubjectColor(activeSession.subject);
            }
            slots.appendChild(slot);
        }
        row.appendChild(slots);
        root.appendChild(row);
    }
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
        grid.appendChild(div);
    }
}

// ── 모바일 과목 관리자 렌더링 ────────────────────────────────────
function renderMobileSubjectManager() {
    const list = document.getElementById('m-subject-manager-list');
    if (!list) return;
    list.innerHTML = state.subjects.map((s, idx) => `
        <div class="subject-row">
            <input type="text" value="${s.name}" onchange="updateSubjectName('${s.id}', this.value)" placeholder="Name">
            <input type="color" value="${s.color}" onchange="updateSubjectColor('${s.id}', this.value)">
            <button onclick="deleteSubject('${s.id}')" class="ghost-btn" title="Delete"><i data-lucide="trash-2"></i></button>
        </div>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ── 하루 회고 동기화 (모바일 ↔ 데스크탑 공유 state) ──────────────
function syncMobileReflectionInputs() {
    const targetDate = state.selectedDate;
    const data = state.reflections[targetDate];

    const setVal = (id, key) => {
        const el = document.getElementById(id);
        if (el) el.value = data ? (data[key] || 0) : 0;
    };

    setVal('m-input-time', 'time');
    setVal('m-input-wrong', 'wrong');
    setVal('m-input-review', 'review');
    setVal('m-input-homework', 'homework');

    syncMobileReflection();
}

window.syncMobileReflection = () => {
    const dailyTasks = state.tasks.filter(t => t.date === state.selectedDate);
    const completed = dailyTasks.filter(t => t.completed).length;
    const achievement = dailyTasks.length > 0 ? Math.round((completed / dailyTasks.length) * 20) : 0;

    const el = (id) => document.getElementById(id);
    if (el('m-score-achievement')) el('m-score-achievement').textContent = achievement;

    const time     = parseInt(el('m-input-time')?.value)     || 0;
    const wrong    = parseInt(el('m-input-wrong')?.value)    || 0;
    const review   = parseInt(el('m-input-review')?.value)   || 0;
    const homework = parseInt(el('m-input-homework')?.value) || 0;

    const total = achievement + time + wrong + review + homework;
    if (el('m-total-reflection-score')) el('m-total-reflection-score').textContent = total;
};

window.saveMobileReflection = () => {
    const el = (id) => document.getElementById(id);
    const targetDate = state.selectedDate;
    const reflection = {
        achievement: parseInt(el('m-score-achievement')?.textContent) || 0,
        time:        parseInt(el('m-input-time')?.value)     || 0,
        wrong:       parseInt(el('m-input-wrong')?.value)    || 0,
        review:      parseInt(el('m-input-review')?.value)   || 0,
        homework:    parseInt(el('m-input-homework')?.value) || 0,
        total:       parseInt(el('m-total-reflection-score')?.textContent) || 0,
    };
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
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

// ── 날짜 표시 업데이트 (모바일 상단) ────────────────────────────
function updateMobileDateDisplay() {
    const el = document.getElementById('m-display-date');
    if (!el) return;
    const d = new Date(state.selectedDate);
    el.textContent = d.toLocaleDateString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short'
    }).replace(/\//g, '. ');
}

// ── 메인 초기화 ──────────────────────────────────────────────────
export function setupMobileUI() {
    updateMobileDateDisplay();

    // 모바일 타이머 표시 hook: 기존 interval tick에 연동
    // timer.js의 updateTimerDisplay를 오버라이드하여 모바일도 함께 업데이트
    const originalFn = window._originalUpdateTimerDisplay || updateTimerDisplay;
    window._originalUpdateTimerDisplay = originalFn;

    // setInterval 내부에서 호출되는 updateTimerDisplay를 패치
    // timer.js에서 import된 함수는 직접 패치할 수 없으므로
    // MutationObserver로 PC 타이머 표시와 동기화합니다.
    const pcDisplay = document.getElementById('timer-display');
    if (pcDisplay) {
        const observer = new MutationObserver(() => {
            syncMobileTimerDisplay();
            syncMobileStartBtn(state.timer.isRunning);
        });
        observer.observe(pcDisplay, { childList: true, characterData: true, subtree: true });
    }

    // ── 탭 이벤트 ──────────────────────────────────────────────
    document.querySelectorAll('.m-tab').forEach(btn => {
        btn.addEventListener('click', () => switchMobileTab(btn.dataset.mtab));
    });

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
                syncMobileStartBtn(true);
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
            if (confirm('오늘의 모든 공부 기록(타임테이블)을 삭제하시겠습니까?')) {
                state.history = [];
                state.tasks = state.tasks.map(t => ({ ...t, duration: '0s' }));
                saveToLocal();
                renderMobileTasks();
                renderMobileTimetable();
            }
        });
    }

    // ── 할 일 목록 이벤트 위임 (재렌더 후에도 유효) ───────────
    const mTaskList = document.getElementById('m-task-list');
    if (mTaskList) {
        mTaskList.addEventListener('click', (e) => {
            // 플레이 버튼
            const playBtn = e.target.closest('[data-play-id]');
            if (playBtn) {
                const id = Number(playBtn.dataset.playId);
                if (state.timer.isRunning) return;
                state.timer.activeTaskId = (state.timer.activeTaskId === id) ? null : id;
                renderMobileTasks();
                // PC 쪽도 동기화
                if (window.switchTab) window.switchTab('dashboard');
                return;
            }
            // 완료 버튼
            const doneBtn = e.target.closest('[data-done-id]');
            if (doneBtn) {
                const id = Number(doneBtn.dataset.doneId);
                state.tasks = state.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
                saveToLocal();
                renderMobileTasks();
                window.syncMobileReflection?.();
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
        const id = prompt('과목 코드를 입력하세요 (예: MATH2, PHYS)');
        if (!id) return;
        if (state.subjects.find(s => s.id === id.toUpperCase())) return alert('중복된 코드입니다.');
        state.subjects.push({ id: id.toUpperCase(), name: '신규 과목', color: '#6A1B9A' });
        saveToLocal();
        renderMobileSubjectManager();
        renderSubjectOptions();
    });

    // ── 첫 렌더 ────────────────────────────────────────────────
    renderMobileTasks();
    renderMobileTimetable();
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
