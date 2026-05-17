import { state, saveToLocal, persistTimerState, clearTimerState, getRecordHistory } from './store.js';
import { icon } from './icons.js';
import { renderTasks } from './tasks.js';
import { renderTimetable } from './timetable.js';

let wakeLock = null;

const timerVal = document.getElementById('timer-display');
const zenTimerVal = document.getElementById('zen-timer-display');
const timerProgress = document.getElementById('timer-progress');
const zenOverlay = document.getElementById('zen-overlay');
const btnStart = document.querySelector('.btn-start');

export function updateTimerDisplay() {
    const curSecs = state.timer.mode === 'timer' ? state.timer.seconds : state.timer.stopwatchSeconds;
    const mins = Math.floor(curSecs / 60);
    const secs = curSecs % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    if (timerVal) timerVal.textContent = timeStr;
    if (zenTimerVal) zenTimerVal.textContent = timeStr;
    
    if (state.timer.mode === 'timer') {
        const total = state.timer.totalDuration || 1500;
        const offset = 301.6 * (1 - state.timer.seconds / total);
        if (timerProgress) {
            timerProgress.style.strokeDashoffset = offset;
            timerProgress.style.visibility = 'visible';
        }
    } else {
        if (timerProgress) timerProgress.style.visibility = 'hidden';
    }
}

const TIMER_SET_LIMITS = { h: 23, m: 59, s: 59 };

function pad2(n) { return String(n).padStart(2, '0'); }

function secondsToHms(total) {
    const safe = Math.max(0, Math.floor(total || 0));
    return {
        h: Math.floor(safe / 3600),
        m: Math.floor((safe % 3600) / 60),
        s: safe % 60
    };
}

function clampUnit(unit, raw) {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, TIMER_SET_LIMITS[unit]);
}

function showTimerToast(msg) {
    let toast = document.getElementById('record-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'record-toast';
        toast.className = 'record-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('record-toast--visible');
    setTimeout(() => toast.classList.remove('record-toast--visible'), 2200);
}

function openTimerSetModal() {
    const modal = document.getElementById('timer-set-modal');
    if (!modal) return;

    const initial = secondsToHms(state.timer.totalDuration || 1500);
    const draft = { ...initial };

    // 매 오픈마다 이전 리스너 제거: 셀/프리셋 노드 클론으로 교체
    modal.querySelectorAll('.timer-set-cell, .timer-set-cell-input').forEach(node => {
        if (node.classList.contains('timer-set-cell-input')) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'timer-set-cell';
            btn.dataset.unit = node.dataset.unit;
            btn.setAttribute('aria-label', `${node.dataset.unit} 입력`);
            node.replaceWith(btn);
        } else {
            node.replaceWith(node.cloneNode(true));
        }
    });
    modal.querySelectorAll('.timer-set-preset').forEach(node => {
        node.replaceWith(node.cloneNode(true));
    });

    const cells = modal.querySelectorAll('.timer-set-cell');
    cells.forEach(btn => {
        btn.textContent = pad2(draft[btn.dataset.unit]);
    });

    const beginEdit = (btn) => {
        const unit = btn.dataset.unit;
        const input = document.createElement('input');
        input.type = 'number';
        input.inputMode = 'numeric';
        input.min = '0';
        input.max = String(TIMER_SET_LIMITS[unit]);
        input.value = String(draft[unit]);
        input.className = 'timer-set-cell-input';
        input.dataset.unit = unit;
        btn.replaceWith(input);
        input.focus();
        input.select();

        const commit = () => {
            draft[unit] = clampUnit(unit, input.value);
            const newBtn = document.createElement('button');
            newBtn.type = 'button';
            newBtn.className = 'timer-set-cell';
            newBtn.dataset.unit = unit;
            newBtn.setAttribute('aria-label', btn.getAttribute('aria-label') || '');
            newBtn.textContent = pad2(draft[unit]);
            newBtn.addEventListener('click', () => beginEdit(newBtn));
            input.replaceWith(newBtn);
        };
        input.addEventListener('blur', commit, { once: true });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            else if (e.key === 'Escape') { e.preventDefault(); input.value = String(draft[unit]); input.blur(); }
        });
    };

    cells.forEach(btn => btn.addEventListener('click', () => beginEdit(btn)));

    const presets = modal.querySelectorAll('.timer-set-preset');
    presets.forEach(p => {
        p.addEventListener('click', () => {
            const sec = parseInt(p.dataset.seconds, 10) || 0;
            const hms = secondsToHms(sec);
            draft.h = hms.h; draft.m = hms.m; draft.s = hms.s;
            // 편집 중인 input이 있을 수 있으므로 모든 cell 재구성
            modal.querySelectorAll('.timer-set-cell-input').forEach(inp => inp.blur());
            modal.querySelectorAll('.timer-set-cell').forEach(btn => {
                btn.textContent = pad2(draft[btn.dataset.unit]);
            });
        });
    });

    const close = () => {
        modal.classList.remove('active');
        modal.removeEventListener('click', backdropHandler);
        document.removeEventListener('keydown', escHandler);
    };

    const apply = () => {
        // input이 열려 있으면 먼저 커밋
        const openInput = modal.querySelector('.timer-set-cell-input');
        if (openInput) openInput.blur();
        const total = draft.h * 3600 + draft.m * 60 + draft.s;
        if (total <= 0) { showTimerToast('1초 이상으로 설정해주세요'); return; }
        state.timer.mode = 'timer';
        state.timer.seconds = total;
        state.timer.totalDuration = total;
        saveToLocal();
        updateTimerDisplay();
        close();
    };

    const backdropHandler = (e) => { if (e.target === modal) close(); };
    const escHandler = (e) => {
        if (e.key === 'Escape') close();
    };

    const cancelBtn = document.getElementById('timer-set-cancel');
    const confirmBtn = document.getElementById('timer-set-confirm');
    // 이전 리스너 제거를 위해 노드 클론 후 교체
    const newCancel = cancelBtn.cloneNode(true);
    cancelBtn.replaceWith(newCancel);
    const newConfirm = confirmBtn.cloneNode(true);
    confirmBtn.replaceWith(newConfirm);
    newCancel.addEventListener('click', close);
    newConfirm.addEventListener('click', apply);
    modal.addEventListener('click', backdropHandler);
    document.addEventListener('keydown', escHandler);

    modal.classList.add('active');
}

window.editTimer = () => {
    if (state.timer.isRunning) return;
    if (state.timer.mode !== 'timer') {
        showTimerToast('스톱워치는 0부터 시작합니다');
        return;
    }
    openTimerSetModal();
};

function showNoTaskPanel() {
    const existing = document.getElementById('no-task-panel');
    if (existing) existing.remove();

    const dailyTasks = state.tasks.filter(t => t.date === state.selectedDate);
    const hasTasksToday = dailyTasks.length > 0;

    const panel = document.createElement('div');
    panel.id = 'no-task-panel';
    panel.className = 'no-task-panel';
    panel.innerHTML = `
        <div class="no-task-panel-content">
            <div class="no-task-panel-icon">
                ${icon('alert-circle')}
            </div>
            <p class="no-task-panel-msg">
                ${hasTasksToday ? '할 일을 선택한 후 시작해주세요.' : '할 일을 먼저 추가해주세요.'}
            </p>
            <div class="no-task-panel-actions">
                ${hasTasksToday ? '' : `<button class="no-task-panel-add-btn" id="no-task-add-btn">할 일 추가</button>`}
                <button class="no-task-panel-close-btn" id="no-task-close-btn">확인</button>
            </div>
        </div>
    `;
    document.body.appendChild(panel);

    const closeBtn = document.getElementById('no-task-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => panel.remove());

    const addBtn = document.getElementById('no-task-add-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            panel.remove();
            if (window.renderSubjectOptions) window.renderSubjectOptions();
            const modal = document.getElementById('task-modal');
            if (modal) modal.classList.add('active');
        });
    }

    panel.addEventListener('click', (e) => {
        if (e.target === panel) panel.remove();
    });
}

export function startTimer() {
    if (!state.timer.activeTaskId) {
        showNoTaskPanel();
        return;
    }

    state.timer.isRunning = true;
    if (!state.timer.sessionStartTime) {
        state.timer.sessionStartTime = new Date();
        state.timer.sessionStartSeconds = state.timer.mode === 'timer'
            ? state.timer.seconds
            : state.timer.stopwatchSeconds;
        state.timer.elapsedAtPause = 0;
    }
    state.timer.wallStartTimestamp = Date.now();
    if (btnStart) {
        btnStart.textContent = 'STOP';
        btnStart.style.background = '#FF2D55';
        btnStart.style.color = '#FFFFFF';
    }
    if (state.timer.activeTaskId) {
        const activeTask = state.tasks.find(t => t.id === state.timer.activeTaskId);
        const zenTaskName = document.getElementById('zen-task-name');
        if (zenTaskName) zenTaskName.textContent = activeTask.name;
        if (zenOverlay) zenOverlay.classList.add('active');
    }
    persistTimerState();
    requestWakeLock();
    state.timer.interval = setInterval(() => {
        recalculateFromTimestamp();
        updateTimerDisplay();
        persistTimerState();
    }, 1000);
}

function recalculateFromTimestamp() {
    const elapsedSinceResume = Math.floor((Date.now() - state.timer.wallStartTimestamp) / 1000);
    const totalElapsed = state.timer.elapsedAtPause + elapsedSinceResume;

    if (state.timer.mode === 'timer') {
        const remaining = Math.max(0, state.timer.sessionStartSeconds - totalElapsed);
        state.timer.seconds = remaining;
        if (remaining <= 0) completeSession();
    } else {
        state.timer.stopwatchSeconds = totalElapsed;
    }
}

async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch {
        // 배터리 부족 등 시스템 제한 — 무시
    }
}

function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
    }
}

export function stopTimer() {
    state.timer.isRunning = false;
    clearInterval(state.timer.interval);
    if (state.timer.wallStartTimestamp) {
        state.timer.elapsedAtPause += Math.floor((Date.now() - state.timer.wallStartTimestamp) / 1000);
        state.timer.wallStartTimestamp = null;
    }
    if (btnStart) {
        btnStart.textContent = 'RESUME';
        btnStart.style.background = '#0056B3';
        btnStart.style.color = '#FFFFFF';
    }
    releaseWakeLock();
    clearTimerState();
    recordSession();
}

export function resetTimer() {
    clearInterval(state.timer.interval);
    state.timer.isRunning = false;
    const lastDuration = state.timer.totalDuration || 1500;
    state.timer.seconds = lastDuration;
    state.timer.totalDuration = lastDuration;
    state.timer.sessionStartSeconds = lastDuration;
    state.timer.stopwatchSeconds = 0;
    state.timer.sessionStartTime = null;
    state.timer.wallStartTimestamp = null;
    state.timer.elapsedAtPause = 0;
    clearTimerState();
    releaseWakeLock();
    if (btnStart) {
        btnStart.textContent = 'START';
        btnStart.style.background = '#0056B3';
        btnStart.style.color = '#FFFFFF';
    }
    updateTimerDisplay();
}

function completeSession() {
    recordSession();
    clearTimerState();
    if (zenOverlay) zenOverlay.classList.remove('active');
    alert('Session Complete!');
    resetTimer();
}

function recordSession() {
    if (!state.timer.sessionStartTime) return;

    const currentElapsed = state.timer.elapsedAtPause +
        (state.timer.wallStartTimestamp
            ? Math.floor((Date.now() - state.timer.wallStartTimestamp) / 1000)
            : 0);
    let actualDuration = state.timer.mode === 'timer'
        ? Math.min(currentElapsed, state.timer.sessionStartSeconds)
        : currentElapsed;

    if (actualDuration < 5) {
        state.timer.sessionStartTime = null;
        if (state.timer.mode === 'stopwatch') state.timer.stopwatchSeconds = 0;
        return;
    }

    const session = {
        startTime: state.timer.sessionStartTime.toISOString(),
        taskId: state.timer.activeTaskId,
        subject: state.timer.activeTaskId ? state.tasks.find(t => t.id === state.timer.activeTaskId).subject : 'OTH',
        duration: actualDuration
    };

    // 계획 모드에서도 record 타임테이블에 세션 저장
    const { history: targetHistory, wasRedirected } = getRecordHistory();
    targetHistory.push(session);

    if (state.timer.activeTaskId) {
        state.tasks = state.tasks.map(t => {
            if (t.id === state.timer.activeTaskId) {
                const totalSecs = targetHistory.filter(h => h.taskId === t.id).reduce((acc, h) => acc + h.duration, 0);
                const m = Math.floor(totalSecs / 60);
                const s = totalSecs % 60;
                let timeStr = (m > 0) ? `${m}m ${s}s` : `${s}s`;
                return { ...t, duration: timeStr };
            }
            return t;
        });
    }

    saveToLocal();
    renderTasks();
    renderTimetable();

    if (wasRedirected) {
        showRecordToast();
        showRecordBadge();
    }

    state.timer.sessionStartTime = null;
    if (state.timer.mode === 'stopwatch') state.timer.stopwatchSeconds = 0;
    updateTimerDisplay();
}

function showRecordToast() {
    let toast = document.getElementById('record-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'record-toast';
        toast.className = 'record-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = '기록 탭에 저장되었습니다';
    toast.classList.add('record-toast--visible');
    setTimeout(() => toast.classList.remove('record-toast--visible'), 2500);
}

function showRecordBadge() {
    const badges = [
        document.getElementById('tt-mode-record'),
        document.getElementById('m-tt-mode-record')
    ];
    for (const btn of badges) {
        if (btn) btn.classList.add('tt-mode-btn--badge');
    }
}

// --- Page Visibility API: 화면 복귀 시 즉시 시간 보정 ---
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.timer.isRunning) {
        recalculateFromTimestamp();
        updateTimerDisplay();
        requestWakeLock();
    }
});

// --- Daily Reflection Logic ---

window.getReflectionItemMax = (index) => {
    const count = state.reflectionItems.length;
    if (count === 0) return 0;
    const baseMax = Math.floor(80 / count);
    const remainder = 80 - baseMax * count;
    return index < remainder ? baseMax + 1 : baseMax;
};

window.renderReflectionInputs = () => {
    const container = document.getElementById('reflection-items-container');
    if (!container) return;

    const items = state.reflectionItems;
    container.innerHTML = `
        <div class="reflect-item auto">
            <span class="r-label">🎯 목표 달성률</span>
            <div class="r-score-wrap"><span id="score-achievement">0</span><small>/20</small></div>
        </div>
        <hr class="r-divider">
        ${items.map((item, i) => {
            const max = window.getReflectionItemMax(i);
            return `
            <div class="reflect-item user">
                <span class="r-label">${item.emoji} ${item.name}</span>
                <div class="r-score-wrap">
                    <input type="number" id="input-${item.id}" min="0" max="${max}" value="0"
                        data-max="${max}"
                        oninput="validateScore(this); updateReflection()" class="r-score-input">
                    <small>/${max}</small>
                </div>
            </div>`;
        }).join('')}
    `;
};

window.updateReflection = () => {
    const dailyTasks = state.tasks.filter(t => t.date === state.selectedDate);
    const totalTasks = dailyTasks.length;
    const completedTasks = dailyTasks.filter(t => t.completed).length;
    const scoreAchievement = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 20) : 0;

    const scoreAchievementEl = document.getElementById('score-achievement');
    if (scoreAchievementEl) scoreAchievementEl.textContent = scoreAchievement;

    let total = scoreAchievement;
    for (const item of state.reflectionItems) {
        const input = document.getElementById(`input-${item.id}`);
        total += input ? (parseInt(input.value) || 0) : 0;
    }

    const totalScoreEl = document.getElementById('total-reflection-score');
    if (totalScoreEl) totalScoreEl.textContent = total;
};

window.saveDailyReflection = () => {
    const targetDate = state.selectedDate;
    const reflection = {
        achievement: parseInt(document.getElementById('score-achievement')?.textContent) || 0
    };
    for (const item of state.reflectionItems) {
        reflection[item.id] = parseInt(document.getElementById(`input-${item.id}`)?.value) || 0;
    }
    reflection.total = parseInt(document.getElementById('total-reflection-score')?.textContent) || 0;

    state.reflections[targetDate] = reflection;
    saveToLocal();
    alert(`[${targetDate}] 하루 회고가 저장되었습니다! 총점: ${reflection.total}점`);
};

window.loadReflectionForDate = (date) => {
    const targetDate = date || state.selectedDate;
    const data = state.reflections[targetDate];

    for (const item of state.reflectionItems) {
        const input = document.getElementById(`input-${item.id}`);
        if (input) input.value = data ? (data[item.id] || 0) : 0;
    }

    window.updateReflection();
};

export function loadTodayReflection() {
    window.renderReflectionInputs();
    window.loadReflectionForDate(state.selectedDate);
}

window.validateScore = (input) => {
    let val = parseInt(input.value);
    const max = parseInt(input.dataset.max) || 20;
    if (isNaN(val)) val = 0;
    if (val > max) val = max;
    if (val < 0) val = 0;
    input.value = val;
};

