import { state, saveToLocal, persistTimerState, clearTimerState } from './store.js';
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

window.editTimer = () => {
    if (state.timer.isRunning || state.timer.mode !== 'timer') return;
    const newTime = prompt('타이머 시간을 설정하세요 (예: 25:00, 10:30)');
    if (!newTime) return;
    
    const parts = newTime.split(':');
    if (parts.length === 2) {
        const m = parseInt(parts[0]);
        const s = parseInt(parts[1]);
        if (!isNaN(m) && !isNaN(s)) {
            const total = m * 60 + s;
            state.timer.seconds = total;
            state.timer.totalDuration = total;
            state.timer.mode = 'timer';
            updateTimerDisplay();
        }
    } else {
        alert('올바른 형식(MM:SS)으로 입력해주세요.');
    }
};

export function startTimer() {
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
    state.timer.seconds = 1500;
    state.timer.totalDuration = 1500;
    state.timer.sessionStartSeconds = 1500;
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

    state.history.push(session);

    if (state.timer.activeTaskId) {
        state.tasks = state.tasks.map(t => {
            if (t.id === state.timer.activeTaskId) {
                const totalSecs = state.history.filter(h => h.taskId === t.id).reduce((acc, h) => acc + h.duration, 0);
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
    state.timer.sessionStartTime = null;
    if (state.timer.mode === 'stopwatch') state.timer.stopwatchSeconds = 0;
    updateTimerDisplay();
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
window.updateReflection = () => {
    const dailyTasks = state.tasks.filter(t => t.date === state.selectedDate);
    const totalTasks = dailyTasks.length;
    const completedTasks = dailyTasks.filter(t => t.completed).length;
    const scoreAchievement = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 20) : 0;
    
    const scoreAchievementEl = document.getElementById('score-achievement');
    if (scoreAchievementEl) scoreAchievementEl.textContent = scoreAchievement;

    const scoreTimeInput = document.getElementById('input-time');
    const scoreWrongInput = document.getElementById('input-wrong');
    const scoreReviewInput = document.getElementById('input-review');
    const scoreHomeworkInput = document.getElementById('input-homework');
    
    const scoreTime = scoreTimeInput ? (parseInt(scoreTimeInput.value) || 0) : 0;
    const scoreWrong = scoreWrongInput ? (parseInt(scoreWrongInput.value) || 0) : 0;
    const scoreReview = scoreReviewInput ? (parseInt(scoreReviewInput.value) || 0) : 0;
    const scoreHomework = scoreHomeworkInput ? (parseInt(scoreHomeworkInput.value) || 0) : 0;

    const total = scoreAchievement + scoreTime + scoreWrong + scoreReview + scoreHomework;
    const totalScoreEl = document.getElementById('total-reflection-score');
    if (totalScoreEl) totalScoreEl.textContent = total;
};

window.saveDailyReflection = () => {
    const targetDate = state.selectedDate;
    const reflection = {
        achievement: parseInt(document.getElementById('score-achievement').textContent),
        time: parseInt(document.getElementById('input-time').value) || 0,
        wrong: parseInt(document.getElementById('input-wrong').value) || 0,
        review: parseInt(document.getElementById('input-review').value) || 0,
        homework: parseInt(document.getElementById('input-homework').value) || 0,
        total: parseInt(document.getElementById('total-reflection-score').textContent)
    };
    
    state.reflections[targetDate] = reflection;
    saveToLocal();
    alert(`[${targetDate}] 하루 회고가 저장되었습니다! 총점: ${reflection.total}점`);
};

window.loadReflectionForDate = (date) => {
    const targetDate = date || state.selectedDate;
    const data = state.reflections[targetDate];
    const inputTime = document.getElementById('input-time');
    const inputWrong = document.getElementById('input-wrong');
    const inputReview = document.getElementById('input-review');
    const inputHomework = document.getElementById('input-homework');

    if (inputTime) inputTime.value = data ? (data.time || 0) : 0;
    if (inputWrong) inputWrong.value = data ? (data.wrong || 0) : 0;
    if (inputReview) inputReview.value = data ? (data.review || 0) : 0;
    if (inputHomework) inputHomework.value = data ? (data.homework || 0) : 0;
    
    window.updateReflection();
};

export function loadTodayReflection() {
    window.loadReflectionForDate(state.selectedDate);
}

window.validateScore = (input) => {
    let val = parseInt(input.value);
    if (isNaN(val)) val = 0;
    if (val > 20) val = 20;
    if (val < 0) val = 0;
    input.value = val;
};

