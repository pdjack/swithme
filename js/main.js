import { updateDashboardDateDisplay, setupEventListeners, renderSubjectManager } from './ui.js';
import { renderTasks, renderSubjectOptions } from './tasks.js';
import { renderTimetable } from './timetable.js';
import { updateTimerDisplay, startTimer, loadTodayReflection } from './timer.js';
import { setupMobileUI } from './mobile.js';
import { watchDeviceLayout } from './device.js';
import { restoreTimerState } from './store.js';
import { initStaticIcons } from './icons.js';
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
        initStaticIcons();
    });

    updateDashboardDateDisplay();
    renderTasks();
    renderTimetable();
    renderSubjectOptions();
    renderSubjectManager();
    loadTodayReflection();
    setupEventListeners();

    // 앱 재시작 시 실행 중이던 타이머 복원
    const timerRestored = restoreTimerState();
    if (timerRestored) {
        updateTimerDisplay();
        startTimer();
    } else {
        updateTimerDisplay();
    }

    setupMobileUI();

    initStaticIcons();
}

document.addEventListener('DOMContentLoaded', () => {
    init();
});
