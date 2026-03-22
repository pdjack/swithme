import { state, getSubjectColor, saveToLocal } from './store.js';
import { renderTasks } from './tasks.js';

const timetableRoot = document.getElementById('timetable-root');

function buildTimetableRows(root) {
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

            const slotRangeStart = slotTime.getTime();
            const slotRangeEnd = slotRangeStart + 10 * 60000;

            const activeSession = state.history.find(session => {
                const sStart = new Date(session.startTime).getTime();
                const sEnd = sStart + session.duration * 1000;
                return sStart < slotRangeEnd && sEnd > slotRangeStart;
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

export function renderTimetable() {
    buildTimetableRows(timetableRoot);
    // 모바일 타임테이블도 동기화
    const mRoot = document.getElementById('m-timetable-root');
    if (mRoot) buildTimetableRows(mRoot);
}

const clearTimetableBtn = document.getElementById('clear-timetable-btn');
if (clearTimetableBtn) {
    clearTimetableBtn.onclick = () => {
        if (confirm('오늘의 모든 공부 기록(타임테이블)을 삭제하시겠습니까?')) {
            state.history = [];
            state.tasks = state.tasks.map(t => ({ ...t, duration: '0s' }));
            saveToLocal();
            renderTasks();
            renderTimetable();
        }
    };
}



