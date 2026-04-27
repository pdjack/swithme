// --- State Management ---
//
// [상태 동기화 규칙]
// - state 객체가 Single Source of Truth. PC/모바일 모두 직접 읽고 쓴다.
// - state 변경 후 반드시 saveToLocal() 호출.
// - state 변경 후 PC/모바일 렌더 함수를 모두 호출하여 양쪽 UI 갱신.
// - 동기화 우선순위: ① 렌더 함수 직접 호출(권장) ② window 전역 함수(순환참조 회피 시)
//   ③ MutationObserver(최후 수단, 반드시 스로틀링 적용)

// 기존 switme_history 마이그레이션: switme_timetables가 없고 switme_history가 있으면 첫 번째 탭으로 이전
function loadTimetables() {
    const savedTimetables = localStorage.getItem('switme_timetables');
    if (savedTimetables) {
        const parsed = JSON.parse(savedTimetables);
        // 마이그레이션: type/plans/view 기본값 보강.
        // view: 탭별 화면 뷰('plan'|'record'). 기존 type을 폴백으로 사용해 첫 표시를 자연스럽게.
        return parsed.map(tt => ({
            ...tt,
            type: tt.type || 'record',
            plans: tt.plans || [],
            view: tt.view || tt.type || 'record'
        }));
    }
    const legacyHistory = localStorage.getItem('switme_history');
    const history = legacyHistory ? JSON.parse(legacyHistory) : [];
    return [{ id: 'tt_default', name: '플랜 1', type: 'record', view: 'record', history, plans: [] }];
}

function loadActiveTimetableId(timetables) {
    const saved = localStorage.getItem('switme_active_timetable_id');
    if (saved && timetables.find(t => t.id === saved)) return saved;
    return timetables[0].id;
}

const _timetables = loadTimetables();

// 습관 타임테이블 자동 생성 (요일별 7개 + 매일 1개, 총 8개).
// 사용자에게는 대시보드 탭바에 노출되지 않도록 isHabit 플래그를 부여.
const HABIT_DAY_KEYS = ['daily', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const HABIT_DAY_LABELS = {
    daily: '매일', mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일'
};
HABIT_DAY_KEYS.forEach(key => {
    const id = `habit_${key}`;
    if (!_timetables.find(t => t.id === id)) {
        _timetables.push({
            id,
            name: `습관 · ${HABIT_DAY_LABELS[key]}`,
            type: 'plan',
            view: 'plan',
            history: [],
            plans: [],
            isHabit: true,
            habitDayKey: key
        });
    }
});

function loadHabits() {
    const saved = localStorage.getItem('switme_habits');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch {
            // fall through
        }
    }
    const init = {};
    HABIT_DAY_KEYS.forEach(k => { init[k] = { tasks: [] }; });
    return init;
}

function loadHabitSeedLog() {
    const saved = localStorage.getItem('switme_habit_seed_log');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch {
            // fall through
        }
    }
    return {};
}

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
    reflectionItems: JSON.parse(localStorage.getItem('switme_reflection_items')) || [
        { id: 'time', name: '시간 관리', emoji: '⏰' },
        { id: 'wrong', name: '오답 정리', emoji: '📝' },
        { id: 'review', name: '복습 진행', emoji: '🔄' },
        { id: 'homework', name: '숙제 완수', emoji: '📚' }
    ],
    reflections: JSON.parse(localStorage.getItem('switme_reflections')) || {},
    analysisResults: JSON.parse(localStorage.getItem('switme_analysis')) || [],
    habits: loadHabits(),
    habitSeedLog: loadHabitSeedLog(),
    habitEditorDay: 'daily', // 현재 편집 중인 요일 키 (daily/mon/tue/wed/thu/fri/sat/sun)
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
    localStorage.setItem('switme_reflection_items', JSON.stringify(state.reflectionItems));
    localStorage.setItem('switme_reflections', JSON.stringify(state.reflections));
    localStorage.setItem('switme_analysis', JSON.stringify(state.analysisResults));
    localStorage.setItem('switme_habits', JSON.stringify(state.habits));
    localStorage.setItem('switme_habit_seed_log', JSON.stringify(state.habitSeedLog));
}

export function saveToLocal() {
    if (saveTimerId) clearTimeout(saveTimerId);
    saveTimerId = setTimeout(flushSave, 300);
}

// 페이지 이탈·백그라운드 전환 시 미저장 데이터 즉시 기록
window.addEventListener('beforeunload', flushSave);
window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSave();
});

export function getActiveTimetable() {
    return state.timetables.find(t => t.id === state.activeTimetableId) || state.timetables[0];
}

export function getActiveHistory() {
    return getActiveTimetable().history;
}

/**
 * 기록 전용 history 반환.
 * 활성 타임테이블이 record면 그대로, plan이면 별도 record 타임테이블을 찾거나 자동 생성.
 * @returns {{ history: Array, wasRedirected: boolean }}
 */
export function getRecordHistory() {
    const active = getActiveTimetable();
    if (active.type === 'record') {
        return { history: active.history, wasRedirected: false };
    }
    let recordTt = state.timetables.find(t => t.type === 'record');
    if (!recordTt) {
        recordTt = {
            id: 'tt_' + Date.now(),
            name: '기록',
            type: 'record',
            history: [],
            plans: []
        };
        state.timetables.push(recordTt);
    }
    return { history: recordTt.history, wasRedirected: true };
}

export function getActivePlans() {
    return getActiveTimetable().plans;
}

export function getHabitTimetable(dayKey) {
    return state.timetables.find(t => t.id === `habit_${dayKey}`);
}

export function getHabitDayKeyForDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return map[d.getDay()];
}

export const HABIT_DAY_KEYS_ORDERED = ['daily', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const HABIT_DAY_LABELS_KO = HABIT_DAY_LABELS;

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

