import { state, formatSeconds, saveToLocal, getActiveHistory } from './store.js';

const taskList = document.getElementById('task-list');
const subjectSelect = document.getElementById('task-subject');

// 과목별 태스크 그룹핑 (PC/모바일 공용)
export function getGroupedTaskData() {
    const dailyTasks = state.tasks.filter(t => t.date === state.selectedDate);
    const activeHistory = getActiveHistory();

    return state.subjects.map(subject => {
        const tasks = dailyTasks.filter(t => t.subject === subject.id);
        const totalSecs = activeHistory
            .filter(h => h.subject === subject.id && h.startTime.startsWith(state.selectedDate))
            .reduce((acc, h) => acc + h.duration, 0);

        return {
            ...subject,
            tasks,
            totalTimeFormatted: formatSeconds(totalSecs)
        };
    }).filter(s => s.tasks.length > 0 || activeHistory.some(h => h.subject === s.id && h.startTime.startsWith(state.selectedDate)));
}

export function renderTasks() {
    if (!taskList) return;

    const groupedSubjects = getGroupedTaskData();

    taskList.innerHTML = groupedSubjects.map(group => `
        <div class="subject-group">
            <div class="subject-header">
                <div class="subject-title-wrap">
                    <span class="subject-bar" style="background:${group.color}"></span>
                    <span class="subject-name">${group.name}</span>
                </div>
                <span class="subject-time">${group.totalTimeFormatted}</span>
            </div>
            <div class="task-items-container">
                ${group.tasks.map(task => `
                    <div class="task-item ${task.completed ? 'completed' : ''} ${state.timer.activeTaskId === task.id ? 'active' : ''}" onclick="selectTask(${task.id})">
                        <button onclick="toggleComplete(event, ${task.id})" class="task-icon-btn ${task.completed ? 'completed' : ''}">
                            <i data-lucide="${task.completed ? 'check-circle' : 'circle'}"></i>
                        </button>
                        <div class="task-details">
                            <span class="t-name">${task.name}</span>
                        </div>
                        <div class="task-actions">
                            <button onclick="playTask(event, ${task.id})" class="ghost-btn play-btn" title="Start Timer">
                                <i data-lucide="${state.timer.activeTaskId === task.id && state.timer.isRunning ? 'pause' : 'play'}"></i>
                            </button>
                            <button onclick="deleteTask(event, ${task.id})" class="ghost-btn delete-btn" title="Delete"><i data-lucide="trash-2"></i></button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    if (groupedSubjects.length === 0) {
        taskList.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-dim);">오늘의 계획이 없습니다.</div>';
    }

    // 모바일 할 일 목록도 동기화
    if (window.renderMobileTasks) window.renderMobileTasks();
}

// 모듈 간 동기화를 위해 전역 노출
window.renderTasks = renderTasks;
window.renderSubjectOptions = renderSubjectOptions;

import { startTimer, stopTimer } from './timer.js';

window.playTask = (e, id) => {
    e.stopPropagation();
    
    if (state.timer.isRunning) {
        if (state.timer.activeTaskId === id) {
            stopTimer();
        } else {
            // 다른 태스크로 전환
            stopTimer();
            state.timer.activeTaskId = id;
            setTimeout(() => {
                startTimer();
                renderTasks();
            }, 100);
        }
    } else {
        state.timer.activeTaskId = id;
        startTimer();
    }
    renderTasks();
};


export function renderSubjectOptions() {
    if (!subjectSelect) return;
    subjectSelect.innerHTML = state.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

window.deleteTask = (e, id) => { 
    e.stopPropagation(); 
    if (state.timer.activeTaskId === id) return alert('진행 중인 태스크는 삭제할 수 없습니다.'); 
    state.tasks = state.tasks.filter(t => t.id !== id); 
    saveToLocal(); 
    renderTasks(); 
};

window.selectTask = (id) => { 
    if (state.timer.isRunning) return; 
    state.timer.activeTaskId = (state.timer.activeTaskId === id) ? null : id; 
    renderTasks(); 
};

window.toggleComplete = (e, id) => { 
    e.stopPropagation(); 
    state.tasks = state.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t); 
    saveToLocal(); 
    renderTasks(); 
};

