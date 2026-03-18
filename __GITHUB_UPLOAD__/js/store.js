// --- State Management ---
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
        isZenMode: false
    },
    history: JSON.parse(localStorage.getItem('switme_history')) || [],
    reflections: JSON.parse(localStorage.getItem('switme_reflections')) || {},
    analysisResults: JSON.parse(localStorage.getItem('switme_analysis')) || [],
    selectedDate: new Date().toISOString().split('T')[0] // YYYY-MM-DD
};

// Ensure all tasks have a date
state.tasks = state.tasks.map(t => ({ ...t, date: t.date || state.selectedDate }));

export function saveToLocal() {
    localStorage.setItem('switme_tasks', JSON.stringify(state.tasks));
    localStorage.setItem('switme_history', JSON.stringify(state.history));
    localStorage.setItem('switme_subjects', JSON.stringify(state.subjects));
    localStorage.setItem('switme_reflections', JSON.stringify(state.reflections));
    localStorage.setItem('switme_analysis', JSON.stringify(state.analysisResults));
}

export function getSubjectColor(id) {
    const sub = state.subjects.find(s => s.id === id);
    return sub ? sub.color : '#8E8E93';
}

export function formatSeconds(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

