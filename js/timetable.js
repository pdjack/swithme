import { state, getSubjectColor, saveToLocal } from './store.js';
import { renderTasks } from './tasks.js';

const timetableRoot = document.getElementById('timetable-root');

export function renderTimetable() {
    if (!timetableRoot) return;
    timetableRoot.innerHTML = '';
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
            
            // 선택된 날짜 기준 슬롯 시간 설정
            const slotTime = new Date(state.selectedDate);
            slotTime.setHours(hour, j * 10, 0, 0);
            
            // 만약 hour가 startHour보다 작으면 (자정 이후 루프) 다음날로 설정
            if (hour < startHour) {
                slotTime.setDate(slotTime.getDate() + 1);
            }
            
            const slotRangeStart = slotTime.getTime();
            const slotRangeEnd = slotRangeStart + 10 * 60000;

            const activeSession = state.history.find(session => {
                const sStart = new Date(session.startTime).getTime();
                const sEnd = sStart + session.duration * 1000;
                return (sStart < slotRangeEnd && sEnd > slotRangeStart);
            });
            if (activeSession) {
                slot.classList.add('filled');
                slot.style.background = getSubjectColor(activeSession.subject);
            }
            slots.appendChild(slot);
        }
        row.appendChild(slots);
        timetableRoot.appendChild(row);
    }
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

