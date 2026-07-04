import { registerSW } from 'virtual:pwa-register';
import { updateDashboardDateDisplay, setupEventListeners, renderSubjectManager } from './ui.js';
import { renderTasks, renderSubjectOptions } from './tasks.js';
import { renderTimetable } from './timetable.js';
import { updateTimerDisplay, startTimer, loadTodayReflection, refreshTimerControls } from './timer.js';
import { setupMobileUI } from './mobile.js';
import { watchDeviceLayout } from './device.js';
import { restoreTimerState, state } from './store.js';
import { initStaticIcons } from './icons.js';
import { setupAnalysisPeriodButtons, setupSnapshotControls } from './analysis.js';
import { seedHabitsForDate, setupHabitEditor } from './habits.js';
import { maybeStartTutorialOnLaunch } from './tutorial.js';

// 새 SW 활성화 시 자동 리로드
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
    });
}

// autoUpdate는 "감지되면 교체"만 담당하고 감지 트리거는 만들지 않는다.
// 설치형 PWA는 최근앱 재개 시 load 이벤트가 없어 갱신을 놓치므로,
// 포그라운드 복귀 + 주기 체크로 새 버전을 능동 확인한다.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

registerSW({
    onRegisteredSW(_swUrl, registration) {
        if (!registration) return;

        setInterval(() => {
            registration.update();
        }, UPDATE_CHECK_INTERVAL_MS);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                registration.update();
            }
        });
    },
});

function init() {
    // 디바이스 감지 후 레이아웃 전환 (resize 시 자동 재적용)
    watchDeviceLayout((_isMobile) => {
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

    // 앱 재시작 시 타이머/스톱워치 상태 복원 (측정중·멈춤·선택 모드)
    restoreTimerState();
    updateTimerDisplay();
    if (state.timer.isRunning) startTimer();

    setupMobileUI();

    // 모바일 UI(관찰자·버튼) 준비 후 복원된 상태를 양쪽 화면에 반영
    if (window.updateTimerDisplayExtended) window.updateTimerDisplayExtended();
    refreshTimerControls();
    setupAnalysisPeriodButtons();
    setupSnapshotControls();
    setupHabitEditor();

    // 오늘 요일에 맞춘 습관 시드 (이미 시드된 항목은 재시드 안 됨)
    seedHabitsForDate(state.selectedDate);
    renderTasks();
    renderTimetable();

    initStaticIcons();

    maybeStartTutorialOnLaunch();
}

document.addEventListener('DOMContentLoaded', () => {
    init();
});
