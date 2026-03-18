import { updateDashboardDateDisplay, setupEventListeners, renderSubjectManager } from './ui.js';
import { renderTasks, renderSubjectOptions } from './tasks.js';
import { renderTimetable } from './timetable.js';
import { updateTimerDisplay, loadTodayReflection } from './timer.js';
import './analysis.js'; // For side effects (window attachments)

function init() {
    updateDashboardDateDisplay();
    renderTasks();
    renderTimetable();
    renderSubjectOptions();
    renderSubjectManager();
    loadTodayReflection();
    setupEventListeners();
    updateTimerDisplay();
    
    // 사이드바 아이콘 렌더링
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Start the app
document.addEventListener('DOMContentLoaded', () => {
    init();
});
