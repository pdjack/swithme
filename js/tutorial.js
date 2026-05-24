// 튜토리얼 시스템 — 스포트라이트 + 풍선 방식
//
// 메인 플로우 (첫 진입 자동, 4스텝): 할 일 → 타이머 → 타임테이블 → 회고
// 컨텍스트 (해당 탭 첫 진입 시 자동, 각 1회): 분석 / 설정 / 날짜

const FLAG_MAIN_DONE = 'switme_tutorial_completed';
const FLAG_SEEN_PREFIX = 'switme_tutorial_seen_';

const MAIN_STEPS = [
    {
        id: 'task-add',
        title: '할 일 추가하기',
        body: `
            <p class="tut-intro">오늘 해야 할 일들을 미리 적어두는 곳이에요.</p>
            <ol class="tut-steps">
                <li><b>+ 버튼</b>을 누르면 입력창이 열려요.</li>
                <li><b>카테고리</b>를 고르고(예: 영어/수학/운동) <b>할 일 이름</b>을 적어요.</li>
                <li>저장하면 왼쪽 목록에 카드로 보여요.</li>
                <li>마쳤으면 <b>체크박스</b>를 눌러 완료 표시.</li>
            </ol>
            <p class="tut-tip">💡 카테고리는 나중에 '설정'에서 자유롭게 만들 수 있어요.</p>
        `,
        mobile: '#m-open-task-btn',
        desktop: '#open-task-modal',
        tab: 'dashboard',
    },
    {
        id: 'timer-start',
        title: '시간 재기',
        body: `
            <p class="tut-intro">집중한 시간을 자동으로 기록해주는 타이머예요.</p>
            <ol class="tut-steps">
                <li>먼저 왼쪽 <b>할 일 카드를 탭</b>해서 골라요. (안 골라도 OK)</li>
                <li>가운데 <b>25:00 숫자를 누르면</b> 원하는 시간으로 바꿀 수 있어요.</li>
                <li><b>START</b> 버튼을 누르면 시작.</li>
                <li>다시 누르면 일시정지, <b>RESET</b>은 초기화.</li>
            </ol>
            <p class="tut-tip">💡 위쪽 '타이머 / 스톱워치' 전환 가능. 시간 정해두고 집중하려면 타이머, 흘러가는 대로 재려면 스톱워치.</p>
        `,
        mobile: '#m-btn-start',
        desktop: '.timer-btns .btn-start',
        tab: 'dashboard',
    },
    {
        id: 'timetable',
        title: '하루 한눈에 보기',
        body: `
            <p class="tut-intro">하루 24시간을 작은 칸으로 나눠 어디에 시간 썼는지 보여줘요. <b>한 칸 = 10분</b>.</p>
            <ol class="tut-steps">
                <li>타이머로 잰 시간은 <b>자동으로 색칠</b>돼요.</li>
                <li>빈 칸을 <b>직접 탭</b>하면 카테고리·메모를 적어 채울 수 있어요.</li>
                <li>위쪽 <b>'기록' 탭</b>은 실제로 한 일, <b>'플랜' 탭</b>은 계획.</li>
                <li>+ 버튼으로 여러 개의 기록표·계획표를 만들 수 있어요.</li>
            </ol>
            <p class="tut-tip">💡 새로고침(↻) 버튼을 누르면 그 표 안의 모든 칸을 한 번에 비울 수 있어요.</p>
        `,
        mobile: '#m-timetable-root',
        desktop: '#timetable-root',
        tab: 'dashboard',
    },
    {
        id: 'reflection',
        title: '오늘 돌아보기',
        body: `
            <p class="tut-intro">하루를 마치며 짧게 점검하는 공간이에요.</p>
            <ol class="tut-steps">
                <li>위에 있는 <b>'회고' 탭</b>으로 전환하면 나타나요.</li>
                <li>오늘 잘한 항목에 <b>체크</b>하면 점수가 쌓여요. (예: 시간 관리, 복습 등)</li>
                <li>아래 메모 칸에 <b>오늘의 한 줄</b>을 남겨보세요.</li>
                <li>저장한 회고는 캘린더·분석 탭에서 다시 볼 수 있어요.</li>
            </ol>
            <p class="tut-tip">💡 점검 항목은 '설정 → 회고 항목'에서 자유롭게 추가/삭제 가능.</p>
        `,
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
        title: '쌓인 기록 보기',
        body: `
            <p class="tut-intro">여러 날의 데이터를 한 번에 분석해주는 탭이에요.</p>
            <ol class="tut-steps">
                <li>위쪽 <b>기간 버튼</b>(7일 / 14일 / 30일 / 90일 / 직접)으로 분석 범위 선택.</li>
                <li>카테고리별 <b>막대 그래프</b>로 어디에 시간을 많이 썼는지 비교.</li>
                <li>오늘의 <b>총점</b>과 <b>인사이트·처방</b>이 자동으로 떠요.</li>
                <li>맨 아래 <b>회고 메모 모음</b>으로 지난 생각들을 다시 볼 수 있어요.</li>
            </ol>
            <p class="tut-tip">💡 '저장' 버튼으로 지금 상태를 스냅샷으로 보관 → 나중에 변화 비교 가능.</p>
        `,
        mobile: '#m-analyze-panel',
        desktop: '#analyze-canvas',
        tab: 'analyze',
    },
    {
        id: 'settings',
        title: '내 입맛에 맞추기',
        body: `
            <p class="tut-intro">앱을 본인 스타일에 맞게 바꿀 수 있는 곳.</p>
            <ol class="tut-steps">
                <li><b>카테고리</b> — 색상·이름 변경, 추가/삭제. 분야가 늘면 여기서 만들어요.</li>
                <li><b>회고 항목</b> — 매일 점검할 체크리스트를 직접 구성.</li>
                <li><b>습관</b> — 요일별 반복 일정(예: 월·수·금 운동) 등록 → 매일 자동으로 할 일에 들어가요.</li>
            </ol>
            <p class="tut-tip">💡 카테고리 색은 타임테이블·분석 그래프에 그대로 나타나요. 시각적으로 알아보기 쉽게 정해두세요.</p>
        `,
        mobile: '#m-settings-panel',
        desktop: '#settings-canvas',
        tab: 'settings',
    },
    {
        id: 'date',
        title: '다른 날짜 보기',
        body: `
            <p class="tut-intro">어제·내일·지난주 기록도 자유롭게 오갈 수 있어요.</p>
            <ol class="tut-steps">
                <li>화면 맨 위 <b>날짜 글자를 탭</b>하면 달력이 열려요.</li>
                <li>원하는 날짜를 고르면 그날의 <b>할 일·타임테이블·회고</b>가 모두 표시.</li>
                <li><b>캘린더 탭</b>(📅)에서 한 달치를 한눈에 보고 클릭 이동도 가능.</li>
            </ol>
            <p class="tut-tip">💡 미래 날짜로 가서 미리 계획을 짜둘 수도 있어요.</p>
        `,
        mobile: '#m-display-date',
        desktop: '#display-date',
        tab: 'dashboard',
    },
];

const FIRST_LAUNCH_MAX = 4; // 첫 진입 시엔 메인 4스텝만. 나머지 3은 컨텍스트로 처리.
let maxStepsForRun = FIRST_LAUNCH_MAX;

const CONTEXT_STEPS = {
    analyze: {
        title: '쌓인 기록 보기',
        body: `
            <p class="tut-intro">여러 날의 데이터를 한 번에 분석해주는 탭이에요.</p>
            <ol class="tut-steps">
                <li>위쪽 <b>기간 버튼</b>(7일 / 14일 / 30일 / 90일)으로 분석 범위 선택.</li>
                <li>카테고리별 <b>막대 그래프</b>로 어디에 시간을 많이 썼는지 비교.</li>
                <li>오늘의 <b>총점</b>과 <b>인사이트·처방</b>이 자동으로 떠요.</li>
                <li>맨 아래 <b>회고 메모 모음</b>으로 지난 생각들을 다시 볼 수 있어요.</li>
            </ol>
            <p class="tut-tip">💡 '저장' 버튼으로 지금 상태를 스냅샷으로 보관 → 나중에 변화 비교 가능.</p>
        `,
        mobile: '#m-analyze-panel',
        desktop: '#analyze-canvas',
    },
    settings: {
        title: '내 입맛에 맞추기',
        body: `
            <p class="tut-intro">앱을 본인 스타일에 맞게 바꿀 수 있는 곳.</p>
            <ol class="tut-steps">
                <li><b>카테고리</b> — 색상·이름 변경, 추가/삭제.</li>
                <li><b>회고 항목</b> — 매일 점검할 체크리스트를 직접 구성.</li>
                <li><b>습관</b> — 요일별 반복 일정 등록 → 매일 자동으로 할 일에 들어가요.</li>
            </ol>
            <p class="tut-tip">💡 카테고리 색은 타임테이블·분석 그래프에 그대로 나타나요.</p>
        `,
        mobile: '#m-settings-panel',
        desktop: '#settings-canvas',
    },
    date: {
        title: '다른 날짜 보기',
        body: `
            <p class="tut-intro">어제·내일·지난주 기록도 자유롭게 오갈 수 있어요.</p>
            <ol class="tut-steps">
                <li>화면 맨 위 <b>날짜 글자를 탭</b>하면 달력이 열려요.</li>
                <li>원하는 날짜를 고르면 그날의 <b>할 일·타임테이블·회고</b>가 표시.</li>
                <li><b>캘린더 탭</b>(📅)에서 한 달치를 한눈에 보고 클릭 이동도 가능.</li>
            </ol>
            <p class="tut-tip">💡 미래 날짜로 가서 미리 계획을 짜둘 수도 있어요.</p>
        `,
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
    overlayEl.querySelector('.tutorial-body').innerHTML = step.body;

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
        bubble.style.width = '440px';
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
        const bubbleWidth = 440;
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
    overlayEl.querySelector('.tutorial-body').innerHTML = step.body;
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
