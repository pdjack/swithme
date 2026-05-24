// 튜토리얼 시스템 — 스포트라이트 + 풍선 방식
//
// 메인 플로우 (첫 진입 자동, 4스텝): 할 일 → 타이머 → 타임테이블 → 회고
// 컨텍스트 (해당 탭 첫 진입 시 자동, 각 1회): 분석 / 설정 / 날짜

const FLAG_MAIN_DONE = 'switme_tutorial_completed';
const FLAG_SEEN_PREFIX = 'switme_tutorial_seen_';

const MAIN_STEPS = [
    {
        id: 'task-add',
        title: '할 일 추가',
        body: '오른쪽 + 버튼을 눌러 오늘 할 일을 추가하세요. 카테고리·이름만 적으면 끝.',
        mobile: '#m-open-task-btn',
        desktop: '#open-task-modal',
        tab: 'dashboard',
    },
    {
        id: 'timer-start',
        title: '타이머 시작',
        body: '할 일을 선택하고 START 버튼을 누르면 시간이 기록됩니다. 25분 집중 → 짧은 휴식이 기본.',
        mobile: '#m-btn-start',
        desktop: '.timer-btns .btn-start',
        tab: 'dashboard',
    },
    {
        id: 'timetable',
        title: '타임테이블',
        body: '하루를 10분 단위 격자로 시각화. 기록 탭은 실제 활동, 플랜 탭은 계획. 격자를 탭하여 직접 입력도 가능합니다.',
        mobile: '#m-timetable-root',
        desktop: '#timetable-root',
        tab: 'dashboard',
    },
    {
        id: 'reflection',
        title: '회고',
        body: '하루를 마무리하며 항목별로 점검하고 메모를 남겨보세요. 시간관리·오답정리·복습·숙제 등.',
        mobile: '#m-reflection-items-container',
        desktop: '#reflection-items-container',
        tab: 'dashboard',
        before: () => {
            if (isMobile() && window.switchMobileColumnTab) {
                window.switchMobileColumnTab('reflection');
            }
        },
    },
    {
        id: 'analyze',
        title: '분석 탭',
        body: '누적된 데이터로 카테고리별 시간·총점·트렌드를 확인. 기간 토글로 7/14/30/90일 비교 가능. 스냅샷으로 저장도 됩니다.',
        mobile: '#m-analyze-panel',
        desktop: '#analyze-canvas',
        tab: 'analyze',
    },
    {
        id: 'settings',
        title: '설정 탭',
        body: '카테고리·회고 항목·습관을 관리. 습관 탭에선 요일별 반복 계획을 미리 등록하면 자동 시드됩니다.',
        mobile: '#m-settings-panel',
        desktop: '#settings-canvas',
        tab: 'settings',
    },
    {
        id: 'date',
        title: '날짜 변경',
        body: '날짜 라벨을 탭하면 캘린더가 열립니다. 다른 날짜를 선택하면 그 날의 할 일·타임테이블·회고가 표시됩니다.',
        mobile: '#m-display-date',
        desktop: '#display-date',
        tab: 'dashboard',
    },
];

const FIRST_LAUNCH_MAX = 4; // 첫 진입 시엔 메인 4스텝만. 나머지 3은 컨텍스트로 처리.
let maxStepsForRun = FIRST_LAUNCH_MAX;

const CONTEXT_STEPS = {
    analyze: {
        title: '분석 탭',
        body: '누적된 데이터로 카테고리별 시간·총점·트렌드를 확인. 기간 토글로 7/14/30/90일 비교 가능. 스냅샷으로 저장도 됩니다.',
        mobile: '#m-analyze-panel',
        desktop: '#analyze-panel',
    },
    settings: {
        title: '설정 탭',
        body: '카테고리·회고 항목·습관을 관리. 습관 탭에선 요일별 반복 계획을 미리 등록하면 자동 시드됩니다.',
        mobile: '#m-settings-panel',
        desktop: '#settings-panel',
    },
    date: {
        title: '날짜 변경',
        body: '날짜 라벨을 탭하면 캘린더가 열립니다. 다른 날짜를 선택하면 그 날의 할 일·타임테이블·회고가 표시됩니다.',
        mobile: '#m-display-date',
        desktop: '#display-date',
    },
};

let currentStepIndex = 0;
let overlayEl = null;

function isMobile() {
    return document.body.getAttribute('data-device') === 'mobile';
}

function ensureOverlay() {
    if (overlayEl) return overlayEl;
    overlayEl = document.createElement('div');
    overlayEl.id = 'tutorial-overlay';
    overlayEl.className = 'tutorial-overlay';
    overlayEl.innerHTML = `
        <svg class="tutorial-mask" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <mask id="tutorial-hole-mask">
                    <rect width="100%" height="100%" fill="white"/>
                    <rect class="tutorial-hole" x="0" y="0" width="0" height="0" rx="12" fill="black"/>
                </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#tutorial-hole-mask)"/>
        </svg>
        <div class="tutorial-bubble">
            <div class="tutorial-step-label"></div>
            <div class="tutorial-title"></div>
            <div class="tutorial-body"></div>
            <div class="tutorial-foot">
                <div class="tutorial-dots"></div>
                <div class="tutorial-actions">
                    <button class="tutorial-skip">건너뛰기</button>
                    <button class="tutorial-prev">이전</button>
                    <button class="tutorial-next">다음 →</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlayEl);

    overlayEl.querySelector('.tutorial-skip').addEventListener('click', endTutorial);
    overlayEl.querySelector('.tutorial-prev').addEventListener('click', prevStep);
    overlayEl.querySelector('.tutorial-next').addEventListener('click', nextStep);
    window.addEventListener('resize', () => {
        if (overlayEl.classList.contains('active')) renderCurrentStep();
    });
    return overlayEl;
}

function getTargetRect(step) {
    const selector = isMobile() ? step.mobile : step.desktop;
    if (!selector) return null;
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;
    return rect;
}

function applyStepTab(step) {
    if (!step.tab) return;
    if (isMobile() && window.switchMobileTab) {
        window.switchMobileTab(step.tab);
    } else if (window.switchTab) {
        window.switchTab(step.tab);
    }
}

function renderCurrentStep() {
    const step = MAIN_STEPS[currentStepIndex];
    if (!step) return;

    applyStepTab(step);
    if (typeof step.before === 'function') step.before();

    const bubble = overlayEl.querySelector('.tutorial-bubble');
    overlayEl.querySelector('.tutorial-step-label').textContent =
        `STEP ${currentStepIndex + 1} / ${maxStepsForRun}`;
    overlayEl.querySelector('.tutorial-title').textContent = step.title;
    overlayEl.querySelector('.tutorial-body').textContent = step.body;

    // 점 표시
    const dotsEl = overlayEl.querySelector('.tutorial-dots');
    dotsEl.innerHTML = Array.from({ length: maxStepsForRun }, (_, i) =>
        `<span class="tutorial-dot${i === currentStepIndex ? ' on' : ''}"></span>`).join('');

    // 이전 버튼 표시 여부
    const prevBtn = overlayEl.querySelector('.tutorial-prev');
    prevBtn.style.visibility = currentStepIndex === 0 ? 'hidden' : 'visible';

    // 마지막 스텝이면 다음 → 완료
    const nextBtn = overlayEl.querySelector('.tutorial-next');
    nextBtn.textContent = currentStepIndex === maxStepsForRun - 1 ? '완료' : '다음 →';

    // 탭 전환 직후 DOM 안정화 대기
    requestAnimationFrame(() => {
        const rect = getTargetRect(step);
        const hole = overlayEl.querySelector('.tutorial-hole');
        if (rect) {
            const padding = 8;
            hole.setAttribute('x', Math.max(0, rect.left - padding));
            hole.setAttribute('y', Math.max(0, rect.top - padding));
            hole.setAttribute('width', rect.width + padding * 2);
            hole.setAttribute('height', rect.height + padding * 2);
            positionBubble(bubble, rect);
        } else {
            hole.setAttribute('width', 0);
            hole.setAttribute('height', 0);
            bubble.style.top = '50%';
            bubble.style.left = '50%';
            bubble.style.transform = 'translate(-50%, -50%)';
        }
    });
}

function positionBubble(bubble, targetRect) {
    const margin = 16;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // 모바일은 가로 폭 가득, 위치만 상/하 결정
    bubble.style.transform = '';
    if (isMobile()) {
        bubble.style.left = `${margin}px`;
        bubble.style.right = `${margin}px`;
        bubble.style.width = 'auto';
    } else {
        bubble.style.left = '';
        bubble.style.right = '';
        bubble.style.width = '360px';
    }

    // 타겟 위와 아래 중 더 공간 큰 쪽
    const spaceBelow = vh - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const bubbleHeight = bubble.offsetHeight || 200;

    if (spaceBelow >= bubbleHeight + margin || spaceBelow >= spaceAbove) {
        bubble.style.top = `${targetRect.bottom + margin}px`;
        bubble.style.bottom = 'auto';
    } else {
        bubble.style.top = 'auto';
        bubble.style.bottom = `${vh - targetRect.top + margin}px`;
    }

    // PC는 가로 중앙 정렬을 타겟 중심에 맞춤
    if (!isMobile()) {
        const targetCenter = targetRect.left + targetRect.width / 2;
        const bubbleWidth = 360;
        let leftPos = targetCenter - bubbleWidth / 2;
        leftPos = Math.max(margin, Math.min(leftPos, vw - bubbleWidth - margin));
        bubble.style.left = `${leftPos}px`;
    }
}

function nextStep() {
    if (currentStepIndex < maxStepsForRun - 1) {
        currentStepIndex += 1;
        renderCurrentStep();
    } else {
        endTutorial();
    }
}

function prevStep() {
    if (currentStepIndex > 0) {
        currentStepIndex -= 1;
        renderCurrentStep();
    }
}

function endTutorial() {
    if (!overlayEl) return;
    overlayEl.classList.remove('active');
    localStorage.setItem(FLAG_MAIN_DONE, '1');
    // 풀 워크스루(다시보기)에서 컨텍스트 스텝까지 모두 봤으면 본 것으로 처리
    if (maxStepsForRun === MAIN_STEPS.length) {
        Object.keys(CONTEXT_STEPS).forEach(k => localStorage.setItem(FLAG_SEEN_PREFIX + k, '1'));
    }
}

export function startMainTutorial(opts = {}) {
    ensureOverlay();
    currentStepIndex = 0;
    maxStepsForRun = opts.full ? MAIN_STEPS.length : FIRST_LAUNCH_MAX;
    overlayEl.classList.add('active', 'tutorial-mode-main');
    overlayEl.classList.remove('tutorial-mode-context');
    // 다음 프레임에서 렌더(레이아웃 stabilize)
    requestAnimationFrame(() => {
        requestAnimationFrame(renderCurrentStep);
    });
}

function showContextStep(key) {
    const step = CONTEXT_STEPS[key];
    if (!step) return;
    ensureOverlay();
    overlayEl.classList.add('active', 'tutorial-mode-context');
    overlayEl.classList.remove('tutorial-mode-main');

    overlayEl.querySelector('.tutorial-step-label').textContent = '';
    overlayEl.querySelector('.tutorial-title').textContent = step.title;
    overlayEl.querySelector('.tutorial-body').textContent = step.body;
    overlayEl.querySelector('.tutorial-dots').innerHTML = '';
    overlayEl.querySelector('.tutorial-prev').style.visibility = 'hidden';
    overlayEl.querySelector('.tutorial-skip').style.display = 'none';
    const nextBtn = overlayEl.querySelector('.tutorial-next');
    nextBtn.textContent = '확인';

    const closeHandler = () => {
        overlayEl.classList.remove('active');
        localStorage.setItem(FLAG_SEEN_PREFIX + key, '1');
        nextBtn.removeEventListener('click', closeHandler);
        // 원복
        overlayEl.querySelector('.tutorial-skip').style.display = '';
        overlayEl.querySelector('.tutorial-prev').style.visibility = '';
    };
    nextBtn.addEventListener('click', closeHandler);

    const rect = (() => {
        const selector = isMobile() ? step.mobile : step.desktop;
        const el = document.querySelector(selector);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return null;
        return r;
    })();
    const hole = overlayEl.querySelector('.tutorial-hole');
    const bubble = overlayEl.querySelector('.tutorial-bubble');
    requestAnimationFrame(() => {
        if (rect) {
            const padding = 8;
            hole.setAttribute('x', Math.max(0, rect.left - padding));
            hole.setAttribute('y', Math.max(0, rect.top - padding));
            hole.setAttribute('width', rect.width + padding * 2);
            hole.setAttribute('height', rect.height + padding * 2);
            positionBubble(bubble, rect);
        } else {
            hole.setAttribute('width', 0);
            hole.setAttribute('height', 0);
            bubble.style.top = '50%';
            bubble.style.left = '50%';
            bubble.style.transform = 'translate(-50%, -50%)';
        }
    });
}

export function maybeShowContextTutorial(key) {
    if (!CONTEXT_STEPS[key]) return;
    if (localStorage.getItem(FLAG_SEEN_PREFIX + key) === '1') return;
    // 메인 튜토리얼 진행 중이면 보류
    if (overlayEl && overlayEl.classList.contains('active') && overlayEl.classList.contains('tutorial-mode-main')) return;
    // 다음 프레임에서 실행 (탭 전환 애니메이션 후)
    setTimeout(() => showContextStep(key), 150);
}

export function resetTutorial() {
    localStorage.removeItem(FLAG_MAIN_DONE);
    Object.keys(CONTEXT_STEPS).forEach(k => localStorage.removeItem(FLAG_SEEN_PREFIX + k));
    // 대시보드 탭으로 이동 후 풀 워크스루(7스텝) 시작
    if (isMobile() && window.switchMobileTab) {
        window.switchMobileTab('dashboard');
    } else if (window.switchTab) {
        window.switchTab('dashboard');
    }
    setTimeout(() => startMainTutorial({ full: true }), 200);
}

export function maybeStartTutorialOnLaunch() {
    // 날짜 라벨 클릭 시 컨텍스트 튜토리얼 트리거 (PC + 모바일)
    const dateEls = ['display-date', 'm-display-date'];
    dateEls.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', () => maybeShowContextTutorial('date'));
    });

    if (localStorage.getItem(FLAG_MAIN_DONE) === '1') return;
    // 페이지 안정화 후 시작
    setTimeout(startMainTutorial, 600);
}

window.resetTutorial = resetTutorial;
window.maybeShowContextTutorial = maybeShowContextTutorial;
