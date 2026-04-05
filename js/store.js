// --- State Management ---

// 기존 switme_history 마이그레이션: switme_timetables가 없고 switme_history가 있으면 첫 번째 탭으로 이전
function loadTimetables() {
    const savedTimetables = localStorage.getItem('switme_timetables');
    if (savedTimetables) {
        return JSON.parse(savedTimetables);
    }
    const legacyHistory = localStorage.getItem('switme_history');
    const history = legacyHistory ? JSON.parse(legacyHistory) : [];
    return [{ id: 'tt_default', name: '플랜 1', history }];
}

function loadActiveTimetableId(timetables) {
    const saved = localStorage.getItem('switme_active_timetable_id');
    if (saved && timetables.find(t => t.id === saved)) return saved;
    return timetables[0].id;
}

const _timetables = loadTimetables();

export let state = {
    tasks: JSON.parse(localStorage.getItem('switme_tasks')) || [
        { id: 1, subject: 'ENG', name: '모의고사 1회', duration: '0s', completed: true, date: new Date().toISOString().split('T')[0] },
        { id: 2, subject: 'ENG', name: '듣기평가 30문제', duration: '0s', completed: false, date: new Date().toISOString().split('T')[0] },
        { id: 3, subject: 'KOR', name: '문학책 읽기', duration: '0s', completed: true, date: new Date().toISOString().split('T')[0] },
        { id: 4, subject: 'MATH', name: '수1 문제집 30문제', duration: '0s', completed: true, date: new Date().toISOString().split('T')[0] },
        { id: 5, subject: 'MATH', name: '오답노트', duration: '0s', completed: false, date: new Date().toISOString().split('T')[0] }
    ],
    subjects: JSON.parse(localStorage.getItem('switme_subjects')) || [
        { id: 'ENG', name: '영어', color: '#E74C3C' },
        { id: 'MATH', name: '수학', color: '#3F51B5' },
        { id: 'KOR', name: '국어', color: '#4CAF50' },
        { id: 'SCI', name: '과학', color: '#E67E22' },
        { id: 'OTH', name: '기타', color: '#8E8E93' }
    ],
    timer: {
        mode: 'timer',
        seconds: 1500, // Default 25m
        totalDuration: 1500, // Total time for progress ring
        sessionStartSeconds: 1500, // Time at start of current session
        stopwatchSeconds: 0,
        isRunning: false,
        interval: null,
        activeTaskId: null,
        isZenMode: false,
        wallStartTimestamp: null, // Date.now() when timer started/resumed
        elapsedAtPause: 0 // Accumulated seconds before current run
    },
    timetables: _timetables,
    activeTimetableId: loadActiveTimetableId(_timetables),
    reflections: JSON.parse(localStorage.getItem('switme_reflections')) || {},
    analysisResults: JSON.parse(localStorage.getItem('switme_analysis')) || [],
    selectedDate: new Date().toISOString().split('T')[0] // YYYY-MM-DD
};

// Ensure all tasks have a date
state.tasks = state.tasks.map(t => ({ ...t, date: t.date || state.selectedDate }));

// ── localStorage 디바운스 저장 ───────────────────────────────────────
// 빠른 연속 조작 시 직렬화를 한 번으로 병합 (300ms)
let saveTimerId = null;

function flushSave() {
    if (saveTimerId) {
        clearTimeout(saveTimerId);
        saveTimerId = null;
    }
    localStorage.setItem('switme_tasks', JSON.stringify(state.tasks));
    localStorage.setItem('switme_timetables', JSON.stringify(state.timetables));
    localStorage.setItem('switme_active_timetable_id', state.activeTimetableId);
    localStorage.setItem('switme_subjects', JSON.stringify(state.subjects));
    localStorage.setItem('switme_reflections', JSON.stringify(state.reflections));
    localStorage.setItem('switme_analysis', JSON.stringify(state.analysisResults));
}

export function saveToLocal() {
    if (saveTimerId) return;
    saveTimerId = setTimeout(flushSave, 300);
}

// 페이지 이탈·백그라운드 전환 시 미저장 데이터 즉시 기록
window.addEventListener('beforeunload', flushSave);
window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSave();
});

export function getActiveHistory() {
    const active = state.timetables.find(t => t.id === state.activeTimetableId);
    return active ? active.history : state.timetables[0].history;
}

export function getSubjectColor(id) {
    const sub = state.subjects.find(s => s.id === id);
    return sub ? sub.color : '#8E8E93';
}

export function persistTimerState() {
    localStorage.setItem('switme_timer', JSON.stringify({
        mode: state.timer.mode,
        isRunning: state.timer.isRunning,
        wallStartTimestamp: state.timer.wallStartTimestamp,
        elapsedAtPause: state.timer.elapsedAtPause,
        sessionStartSeconds: state.timer.sessionStartSeconds,
        totalDuration: state.timer.totalDuration,
        activeTaskId: state.timer.activeTaskId,
        sessionStartTime: state.timer.sessionStartTime instanceof Date
            ? state.timer.sessionStartTime.toISOString()
            : state.timer.sessionStartTime || null
    }));
}

export function restoreTimerState() {
    const saved = localStorage.getItem('switme_timer');
    if (!saved) return false;

    try {
        const data = JSON.parse(saved);
        if (!data.isRunning || !data.wallStartTimestamp) {
            clearTimerState();
            return false;
        }

        state.timer.mode = data.mode;
        state.timer.activeTaskId = data.activeTaskId;
        state.timer.sessionStartSeconds = data.sessionStartSeconds;
        state.timer.totalDuration = data.totalDuration;
        state.timer.wallStartTimestamp = data.wallStartTimestamp;
        state.timer.elapsedAtPause = data.elapsedAtPause;
        state.timer.sessionStartTime = data.sessionStartTime ? new Date(data.sessionStartTime) : null;

        const elapsedSinceResume = Math.floor((Date.now() - data.wallStartTimestamp) / 1000);
        const totalElapsed = data.elapsedAtPause + elapsedSinceResume;

        if (data.mode === 'timer') {
            const remaining = Math.max(0, data.sessionStartSeconds - totalElapsed);
            state.timer.seconds = remaining;
        } else {
            state.timer.stopwatchSeconds = totalElapsed;
        }

        return true;
    } catch {
        clearTimerState();
        return false;
    }
}

export function clearTimerState() {
    localStorage.removeItem('switme_timer');
}

// ── 렌더링 배치 스케줄러 ────────────────────────────────────────────
// 여러 렌더 함수를 Set으로 중복 제거 후 단일 rAF에서 한 번에 실행
const pendingRenders = new Set();
let renderRafId = null;

export function scheduleRender(...fns) {
    for (const fn of fns) {
        if (fn) pendingRenders.add(fn);
    }
    if (renderRafId) return;
    renderRafId = window.requestAnimationFrame(() => {
        renderRafId = null;
        const batch = [...pendingRenders];
        pendingRenders.clear();
        batch.forEach(fn => fn());
    });
}

export function formatSeconds(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

