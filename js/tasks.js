import { state, formatSeconds, saveToLocal } from './store.js';

const taskList = document.getElementById('task-list');
const subjectSelect = document.getElementById('task-subject');

export function renderTasks() {
    if (!taskList) return;
    
    // Check if we are in mobile clean mode (based on container existance or tab)
    const mobileTaskWrapper = document.querySelector('.mobile-task-wrapper');
    
    // 선택된 날짜의 태스크 필터링
    const dailyTasks = state.tasks.filter(t => t.date === state.selectedDate);
    
    // 과목별로 그룹화 및 시간 계산 (초 단위)
    const groupedSubjects = state.subjects.map(subject => {
        const tasksForSubject = dailyTasks.filter(t => t.subject === subject.id);
        const totalSecs = state.history
            .filter(h => h.subject === subject.id && h.startTime.startsWith(state.selectedDate))
            .reduce((acc, h) => acc + h.duration, 0);
            
        // 현재 타이머가 돌아가고 있고, 해당 과목이 선택되어 있다면 추가 시간(현재 세션) 합산
        let liveDuration = totalSecs;
        if (state.timer.isRunning && state.timer.activeTaskId) {
            const activeTask = state.tasks.find(t => t.id === state.timer.activeTaskId);
            if (activeTask && activeTask.subject === subject.id) {
                const curSecs = state.timer.mode === 'timer' 
                    ? (state.timer.sessionStartSeconds - state.timer.seconds)
                    : state.timer.stopwatchSeconds;
                liveDuration += curSecs;
            }
        }

        const h = Math.floor(liveDuration / 3600);
        const m = Math.floor((liveDuration % 3600) / 60);
        const s = liveDuration % 60;
        const h_mm_ss = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        return {
            ...subject,
            tasks: tasksForSubject,
            totalTimeFormatted: h_mm_ss
        };
    });

    // Mobile Minimal View (Based on Ref Image)
    if (mobileTaskWrapper) {
        taskList.innerHTML = groupedSubjects.map(group => {
            const isRunning = state.timer.isRunning && state.timer.activeTaskId && 
                            state.tasks.find(t => t.id === state.timer.activeTaskId)?.subject === group.id;
            
            return `
                <li class="task-minimal-item ${isRunning ? 'is-running' : ''}">
                    <div class="play-btn-circle" style="background: ${group.color};" onclick="handlePlaySubject('${group.id}')">
                        <i data-lucide="${isRunning ? 'pause' : 'play'}"></i>
                    </div>
                    <div class="subject-info">
                        <span class="subject-title">${group.name}</span>
                        <span class="subject-duration">${group.totalTimeFormatted}</span>
                    </div>
                    <div class="more-btn">
                        <i data-lucide="more-vertical" class="small-icon"></i>
                    </div>
                </li>
            `;
        }).join('');
    } else {
        // Existing Desktop Grouped View
        taskList.innerHTML = groupedSubjects.filter(s => s.tasks.length > 0 || state.history.some(h => h.subject === s.id && h.startTime.startsWith(state.selectedDate))).map(group => `
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
                                <button onclick="deleteTask(event, ${task.id})" class="ghost-btn delete-btn" title="Delete"><i data-lucide="trash-2"></i></button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    if (groupedSubjects.length === 0) {
        taskList.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-dim);">오늘의 계획이 없습니다.</div>';
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.handlePlaySubject = (subjectId) => {
    const isRunning = state.timer.isRunning && state.timer.activeTaskId && 
                    state.tasks.find(t => t.id === state.timer.activeTaskId)?.subject === subjectId;

    if (isRunning) {
        import('./timer.js').then(m => m.stopTimer());
        return;
    }

    if (state.timer.isRunning) {
        alert('이미 다른 공부가 진행 중입니다. 먼저 중단해주세요.');
        return;
    }

    // 과목을 선택하면 해당 과목의 첫 번째 완료되지 않은 태스크를 찾아 시작
    let tasks = state.tasks.filter(t => t.subject === subjectId && t.date === state.selectedDate && !t.completed);
    
    if (tasks.length === 0) {
        // 계획이 없을 경우 '기본 학습' 태스크 자동 생성
        const newTask = {
            id: Date.now(),
            subject: subjectId,
            name: '기본 학습',
            duration: '0s',
            completed: false,
            date: state.selectedDate
        };
        state.tasks.push(newTask);
        saveToLocal();
        tasks = [newTask];
    }
    
    state.timer.activeTaskId = tasks[0].id;
    import('./timer.js').then(m => m.startTimer());
};

export function renderSubjectOptions() {
    if (!subjectSelect) return;
    subjectSelect.innerHTML = state.subjects.map(s => `<option value="${s.id}">${s.name} (${s.id})</option>`).join('');
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

