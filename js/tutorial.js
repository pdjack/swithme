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
            <p class="tut-intro">하루 단위가 아닌 <b>며칠~몇 달치 데이터</b>를 한 번에 보고 패턴을 찾는 탭이에요.</p>
            <ol class="tut-steps">
                <li><b>기간 선택</b> — 위쪽 7일/14일/30일/90일/직접 버튼으로 분석 범위 지정.</li>
                <li><b>종합 점수 카드</b> — 회고 점수를 평균낸 100점 만점. 아래에 항목별 평균(시간관리·복습 등)이 함께 표시. 이전에 저장해둔 분석과 비교한 <b>증감 표시(▲▼)</b>도 떠요.</li>
                <li><b>카테고리별 활동 시간 그래프</b> — 어디(영어·운동·일 등)에 얼마나 시간을 썼는지 막대 그래프로 비교. 색은 카테고리 색 그대로.</li>
                <li><b>발견 카드</b> ✨ — 데이터를 자동 분석해 "수학 시간이 평소보다 30% 늘었어요" 같은 변화를 알려줘요.</li>
                <li><b>제안 카드</b> ⚡ — 약점을 콕 집어 개선 방법을 제안. 예: "회고를 자주 빠뜨려요. 매일 저녁 알람을 권해요."</li>
                <li><b>회고 메모 모음</b> 📓 — 그 기간 동안 남긴 메모들을 한 화면에서 다시 읽을 수 있어요.</li>
            </ol>
            <p class="tut-tip">💡 <b>이 분석 저장</b> — 위쪽 '이 분석 저장' 버튼을 누르면 지금 분석 결과가 통째로 보관돼요. 한 달 뒤·시험 후 다시 열어보면 그동안 얼마나 달라졌는지 확인할 수 있어요. 저장할 때 이름·메모도 함께 남길 수 있고, '저장됨' 버튼으로 언제든 다시 열어볼 수 있어요.</p>
        `,
        mobile: '#m-analyze-panel',
        desktop: '#analyze-canvas',
        tab: 'analyze',
    },
    {
        id: 'settings-category',
        title: '설정 — 카테고리',
        body: `
            <p class="tut-intro">활동 분류를 직접 만드는 탭이에요.</p>
            <ol class="tut-steps">
                <li><b>+ 버튼</b>으로 새 카테고리 추가 (예: 영어, 운동, 일).</li>
                <li>이름·색상을 자유롭게 변경.</li>
                <li>필요 없으면 삭제도 가능.</li>
            </ol>
            <p class="tut-tip">💡 카테고리 색은 <b>타임테이블 칸 색</b>과 <b>분석 그래프 색</b>에 그대로 반영돼요.</p>
        `,
        mobile: '[data-settings-tab="category"].m-settings-tab',
        desktop: '[data-settings-tab="category"].settings-tab',
        tab: 'settings',
        before: () => {
            if (isMobile() && window.switchMobileSettingsTab) {
                window.switchMobileSettingsTab('category');
            } else if (window.switchSettingsTab) {
                window.switchSettingsTab('category');
            }
        },
    },
    {
        id: 'settings-reflection',
        title: '설정 — 회고 항목',
        body: `
            <p class="tut-intro">매일 회고 탭에서 체크할 점검 항목을 직접 구성하는 곳이에요.</p>
            <ol class="tut-steps">
                <li><b>+ 버튼</b>으로 새 항목 추가 (예: ⏰시간관리, 📝오답정리, 🔄복습).</li>
                <li>각 항목마다 <b>이름·이모지</b>를 자유롭게 설정.</li>
                <li>필요 없는 항목은 삭제.</li>
            </ol>
            <p class="tut-tip">💡 여기서 만든 항목이 매일 <b>회고 탭의 체크리스트</b>로 그대로 나타나요.</p>
        `,
        mobile: '[data-settings-tab="reflection"].m-settings-tab',
        desktop: '[data-settings-tab="reflection"].settings-tab',
        tab: 'settings',
        before: () => {
            if (isMobile() && window.switchMobileSettingsTab) {
                window.switchMobileSettingsTab('reflection');
            } else if (window.switchSettingsTab) {
                window.switchSettingsTab('reflection');
            }
        },
    },
    {
        id: 'settings-habit',
        title: '설정 — 습관',
        body: `
            <p class="tut-intro">매일 반복되는 일정을 한 번만 등록해두면 매일 자동으로 들어가요.</p>
            <ol class="tut-steps">
                <li><b>요일 탭 선택</b> — 일~토 중 하나, 또는 '매일'.</li>
                <li><b>할 일 등록</b> — 예: "수학 문제집"을 월·수·금에 등록.</li>
                <li><b>플랜 등록</b> — 시간대까지 잡힌 일정. 예: "06:00~07:00 영어 듣기"를 매일에 등록.</li>
                <li><b>자동 추가</b> — 그날 대시보드를 열면 등록한 항목이 <b>오늘 할 일/플랜에 자동으로 들어가요</b>.</li>
                <li>겹치면 <b>특정 요일이 우선</b>이에요. 한 번 추가된 항목은 그날엔 다시 안 들어와요 (직접 지워도 같은 날엔 안 돌아옴).</li>
            </ol>
            <p class="tut-tip">💡 매번 똑같이 적기 귀찮은 루틴이 있으면 여기서 한 번에 해결.</p>
        `,
        mobile: '[data-settings-tab="habit"].m-settings-tab',
        desktop: '[data-settings-tab="habit"].settings-tab',
        tab: 'settings',
        before: () => {
            if (isMobile() && window.switchMobileSettingsTab) {
                window.switchMobileSettingsTab('habit');
            } else if (window.switchSettingsTab) {
                window.switchSettingsTab('habit');
            }
        },
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
            <p class="tut-intro">하루 단위가 아닌 <b>며칠~몇 달치 데이터</b>를 한 번에 보고 패턴을 찾는 탭이에요.</p>
            <ol class="tut-steps">
                <li><b>기간 선택</b> — 7일/14일/30일/90일/직접 버튼.</li>
                <li><b>종합 점수</b> — 회고 점수 평균 100점 만점. 항목별 평균과 ▲▼ 증감 표시.</li>
                <li><b>카테고리별 활동 시간 그래프</b> — 어디에 시간 많이 썼는지 막대 비교.</li>
                <li><b>발견 ✨</b> — "수학 시간이 30% 늘었어요" 같은 자동 분석.</li>
                <li><b>제안 ⚡</b> — 약점 보완 행동 추천.</li>
                <li><b>회고 메모 모음 📓</b> — 그 기간 메모 다시 읽기.</li>
            </ol>
            <p class="tut-tip">💡 <b>이 분석 저장</b> 버튼으로 지금 상태 보관 → 나중에 변화 비교. '저장됨' 버튼으로 언제든 다시 열어보기.</p>
        `,
        mobile: '#m-analyze-panel',
        desktop: '#analyze-canvas',
    },
    settings: {
        title: '내 입맛에 맞추기',
        body: `
            <p class="tut-intro">앱을 본인 스타일에 맞게 바꿀 수 있는 곳. 세 가지 탭으로 나뉘어요.</p>
            <ol class="tut-steps">
                <li><b>카테고리</b> — 활동 분류 추가/삭제, 색상 변경.</li>
                <li><b>회고 항목</b> — 매일 체크할 항목 구성.</li>
                <li><b>습관</b> — 반복 일정 한 번만 등록해두면 매일 자동 추가.</li>
            </ol>
            <p class="tut-tip">💡 각 탭별 자세한 설명은 '튜토리얼 다시보기 ▾' 메뉴에서 분야별로 다시 볼 수 있어요.</p>
        `,
        mobile: '.m-settings-tab-bar',
        desktop: '.settings-tab-bar',
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

    bubble.style.transform = '';
    bubble.style.bottom = 'auto';
    if (isMobile()) {
        bubble.style.left = `${margin}px`;
        bubble.style.right = `${margin}px`;
        bubble.style.width = 'auto';
    } else {
        bubble.style.left = '';
        bubble.style.right = '';
        bubble.style.width = '440px';
    }

    const bubbleHeight = bubble.offsetHeight || 200;
    const spaceBelow = vh - targetRect.bottom - margin;
    const spaceAbove = targetRect.top - margin;

    let topPos;
    if (spaceBelow >= bubbleHeight) {
        topPos = targetRect.bottom + margin;
    } else if (spaceAbove >= bubbleHeight) {
        topPos = targetRect.top - bubbleHeight - margin;
    } else {
        // 위·아래 모두 부족 → viewport 안에 강제로 들어가게 클램프
        topPos = Math.max(margin, (vh - bubbleHeight) / 2);
    }
    // 최종 클램프: 절대 viewport 밖으로 나가지 않게
    topPos = Math.max(margin, Math.min(topPos, vh - bubbleHeight - margin));
    bubble.style.top = `${topPos}px`;

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

export function startSingleStep(id) {
    const step = MAIN_STEPS.find(s => s.id === id);
    if (!step) return;
    ensureOverlay();
    overlayEl.classList.add('active', 'tutorial-mode-context');
    overlayEl.classList.remove('tutorial-mode-main');

    applyStepTab(step);
    if (typeof step.before === 'function') step.before();

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
        nextBtn.removeEventListener('click', closeHandler);
        overlayEl.querySelector('.tutorial-skip').style.display = '';
        overlayEl.querySelector('.tutorial-prev').style.visibility = '';
    };
    nextBtn.addEventListener('click', closeHandler);

    const hole = overlayEl.querySelector('.tutorial-hole');
    const bubble = overlayEl.querySelector('.tutorial-bubble');
    // 탭 전환 후 DOM 안정화 대기
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const rect = getTargetRect(step);
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
    });
}

function toggleTutorialMenu(triggerEl) {
    const existing = document.querySelector('.tutorial-menu');
    if (existing) {
        existing.remove();
        document.removeEventListener('click', outsideMenuHandler, true);
        return;
    }
    const menu = document.createElement('div');
    menu.className = 'tutorial-menu';
    const items = [
        { id: '__full__', label: '처음부터 전체 보기' },
        ...MAIN_STEPS.map((s, i) => ({ id: s.id, label: `${i + 1}. ${s.title}` })),
    ];
    menu.innerHTML = items.map((it, i) =>
        `<button class="tutorial-menu-item${it.id === '__full__' ? ' is-full' : ''}" data-tut-id="${it.id}">${it.label}</button>${i === 0 ? '<div class="tutorial-menu-sep"></div>' : ''}`
    ).join('');
    document.body.appendChild(menu);

    const r = triggerEl.getBoundingClientRect();
    const menuW = 240;
    let left = r.right - menuW;
    left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
    let top = r.bottom + 6;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.width = `${menuW}px`;

    menu.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-tut-id]');
        if (!btn) return;
        const id = btn.getAttribute('data-tut-id');
        menu.remove();
        document.removeEventListener('click', outsideMenuHandler, true);
        if (id === '__full__') {
            resetTutorial();
        } else {
            startSingleStep(id);
        }
    });

    setTimeout(() => document.addEventListener('click', outsideMenuHandler, true), 0);
}

function outsideMenuHandler(e) {
    const menu = document.querySelector('.tutorial-menu');
    if (!menu) {
        document.removeEventListener('click', outsideMenuHandler, true);
        return;
    }
    if (menu.contains(e.target)) return;
    if (e.target.closest('.settings-tutorial-btn, .m-settings-tutorial-btn')) return;
    menu.remove();
    document.removeEventListener('click', outsideMenuHandler, true);
}

export function openTutorialMenu(triggerEl) {
    toggleTutorialMenu(triggerEl);
}

export function maybeStartTutorialOnLaunch() {
    // 날짜 라벨 클릭 시 컨텍스트 튜토리얼 트리거 (PC + 모바일)
    const dateEls = ['display-date', 'm-display-date'];
    dateEls.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', () => maybeShowContextTutorial('date'));
    });

    // 자동 시작하지 않음. 설정 메뉴의 튜토리얼 버튼으로만 진입.
}

window.resetTutorial = resetTutorial;
window.maybeShowContextTutorial = maybeShowContextTutorial;
window.startSingleStep = startSingleStep;
window.openTutorialMenu = openTutorialMenu;
