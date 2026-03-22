import { updateDashboardDateDisplay, setupEventListeners, renderSubjectManager } from './ui.js';
import { renderTasks, renderSubjectOptions } from './tasks.js';
import { renderTimetable } from './timetable.js';
import { updateTimerDisplay, loadTodayReflection } from './timer.js';
import { setupMobileUI } from './mobile.js';
import { watchDeviceLayout } from './device.js';
import './analysis.js'; // For side effects (window attachments)

// SW 업데이트 시 자동 리로드
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
    });
}

function init() {
    // 디바이스 감지 후 레이아웃 전환 (resize 시 자동 재적용)
    watchDeviceLayout((isMobile) => {
        // 레이아웃 전환 시 필요한 데이터 재렌더링
        renderTasks();
        renderTimetable();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    updateDashboardDateDisplay();
    renderTasks();
    renderTimetable();
    renderSubjectOptions();
    renderSubjectManager();
    loadTodayReflection();
    setupEventListeners();
    updateTimerDisplay();
    setupMobileUI();

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    init();
});
