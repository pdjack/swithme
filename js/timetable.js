import { state, getSubjectColor, saveToLocal, getActiveHistory } from './store.js';
import { renderTasks } from './tasks.js';

// ─── 타임테이블 그리드 렌더링 ───────────────────────────────────────

function buildTimetableRows(root) {
    if (!root) return;
    root.innerHTML = '';
    const startHour = 6;
    const activeHistory = getActiveHistory();

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

            const slotTime = new Date(state.selectedDate);
            slotTime.setHours(hour, j * 10, 0, 0);
            if (hour < startHour) slotTime.setDate(slotTime.getDate() + 1);

            const slotRangeStart = slotTime.getTime();
            const slotRangeEnd = slotRangeStart + 10 * 60000;

            const activeSession = activeHistory.find(session => {
                const sStart = new Date(session.startTime).getTime();
                const sEnd = sStart + session.duration * 1000;
                return sStart < slotRangeEnd && sEnd > slotRangeStart;
            });

            if (activeSession) {
                slot.classList.add('filled');
                slot.style.background = getSubjectColor(activeSession.subject);
            }
            slots.appendChild(slot);
        }
        row.appendChild(slots);
        root.appendChild(row);
    }
}

export function renderTimetable() {
    buildTimetableRows(document.getElementById('timetable-root'));
    buildTimetableRows(document.getElementById('m-timetable-root'));
}

// ─── 탭 관련 유틸 ───────────────────────────────────────────────────

function generateTimetableId() {
    return 'tt_' + Date.now();
}

function getNextPlanName() {
    const count = state.timetables.length + 1;
    return `플랜 ${count}`;
}

// ─── PC: 스크롤 화살표 표시 갱신 ────────────────────────────────────

function updateScrollArrows() {
    const list = document.getElementById('tt-tab-list');
    const btnLeft = document.getElementById('tt-scroll-left');
    const btnRight = document.getElementById('tt-scroll-right');
    if (!list || !btnLeft || !btnRight) return;

    const canScrollLeft = list.scrollLeft > 0;
    const canScrollRight = list.scrollLeft + list.clientWidth < list.scrollWidth - 1;

    btnLeft.classList.toggle('tt-scroll-btn--visible', canScrollLeft);
    btnRight.classList.toggle('tt-scroll-btn--visible', canScrollRight);
}

// ─── 활성 탭을 뷰포트 안으로 스크롤 ────────────────────────────────

function scrollActiveTabIntoView(listEl) {
    if (!listEl) return;
    const activeTab = listEl.querySelector('.tt-tab--active');
    if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
}

// ─── 탭 렌더링 (PC) ─────────────────────────────────────────────────

function renderDesktopTabs() {
    const list = document.getElementById('tt-tab-list');
    if (!list) return;
    list.innerHTML = '';

    state.timetables.forEach(tt => {
        const tab = document.createElement('div');
        tab.className = 'tt-tab' + (tt.id === state.activeTimetableId ? ' tt-tab--active' : '');
        tab.dataset.id = tt.id;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'tt-tab__name';
        nameSpan.textContent = tt.name;
        tab.appendChild(nameSpan);

        // 삭제 버튼 (탭이 2개 이상일 때만)
        if (state.timetables.length > 1) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'tt-tab__close';
            closeBtn.innerHTML = '&times;';
            closeBtn.title = '탭 삭제';
            closeBtn.addEventListener('click', e => {
                e.stopPropagation();
                deleteTimetable(tt.id);
            });
            tab.appendChild(closeBtn);
        }

        // 탭 클릭 → 활성화
        tab.addEventListener('click', () => switchTimetable(tt.id));

        // 더블클릭 → 인라인 이름 편집
        tab.addEventListener('dblclick', e => {
            e.stopPropagation();
            startRenameTab(tab, nameSpan, tt.id);
        });

        list.appendChild(tab);
    });

    setTimeout(() => {
        scrollActiveTabIntoView(list);
        updateScrollArrows();
    }, 0);
}

// ─── 모바일 탭 컨텍스트 메뉴 ────────────────────────────────────────

function closeMobileTabMenu() {
    const existing = document.getElementById('m-tt-context-menu');
    if (existing) existing.remove();
}

function showMobileTabMenu(targetTab, ttId) {
    closeMobileTabMenu();

    const menu = document.createElement('div');
    menu.id = 'm-tt-context-menu';
    menu.className = 'm-tt-context-menu';

    const renameBtn = document.createElement('button');
    renameBtn.className = 'm-tt-context-menu__item';
    renameBtn.textContent = '이름 변경';
    renameBtn.addEventListener('click', () => {
        closeMobileTabMenu();
        const tt = state.timetables.find(t => t.id === ttId);
        if (!tt) return;
        const newName = prompt('새 이름을 입력하세요', tt.name);
        if (newName !== null && newName.trim()) {
            renameTimetable(ttId, newName.trim().slice(0, 12));
        }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'm-tt-context-menu__item m-tt-context-menu__item--danger';
    deleteBtn.textContent = '삭제';
    if (state.timetables.length <= 1) {
        deleteBtn.disabled = true;
    }
    deleteBtn.addEventListener('click', () => {
        closeMobileTabMenu();
        if (confirm('이 타임테이블을 삭제하시겠습니까?')) {
            deleteTimetable(ttId);
        }
    });

    menu.appendChild(renameBtn);
    menu.appendChild(deleteBtn);

    // 탭 위치 기준으로 메뉴 배치
    const rect = targetTab.getBoundingClientRect();
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.left = Math.max(8, rect.left) + 'px';

    document.body.appendChild(menu);

    // 메뉴 밖 터치 시 닫기
    setTimeout(() => {
        function dismissIfOutside(e) {
            if (menu.contains(e.target)) return;
            closeMobileTabMenu();
            document.removeEventListener('touchstart', dismissIfOutside, true);
            document.removeEventListener('click', dismissIfOutside, true);
        }
        document.addEventListener('touchstart', dismissIfOutside, { capture: true });
        document.addEventListener('click', dismissIfOutside, { capture: true });
    }, 0);
}

// ─── 탭 렌더링 (모바일) ─────────────────────────────────────────────

function renderMobileTabs() {
    const list = document.getElementById('m-tt-tab-list');
    if (!list) return;
    list.innerHTML = '';
    closeMobileTabMenu();

    state.timetables.forEach(tt => {
        const tab = document.createElement('div');
        tab.className = 'm-tt-tab' + (tt.id === state.activeTimetableId ? ' m-tt-tab--active' : '');
        tab.dataset.id = tt.id;
        tab.textContent = tt.name;

        // 탭 클릭 → 활성화
        tab.addEventListener('click', () => switchTimetable(tt.id));

        // 롱프레스 → 컨텍스트 메뉴
        let longPressTimer = null;
        let didLongPress = false;

        tab.addEventListener('touchstart', e => {
            didLongPress = false;
            longPressTimer = setTimeout(() => {
                didLongPress = true;
                e.preventDefault();
                showMobileTabMenu(tab, tt.id);
            }, 500);
        }, { passive: false });

        tab.addEventListener('touchend', () => {
            clearTimeout(longPressTimer);
            if (didLongPress) {
                // 롱프레스 후 click 이벤트 무시
                tab.addEventListener('click', e => e.stopImmediatePropagation(), { once: true, capture: true });
            }
        });

        tab.addEventListener('touchmove', () => {
            clearTimeout(longPressTimer);
        });

        list.appendChild(tab);
    });

    // 활성 탭 자동 스크롤
    setTimeout(() => scrollActiveTabIntoView(list), 0);
}

// ─── 탭 전체 렌더링 ─────────────────────────────────────────────────

function renderTabs() {
    renderDesktopTabs();
    renderMobileTabs();
}

// ─── 인라인 이름 편집 ────────────────────────────────────────────────

function startRenameTab(tabEl, nameSpan, id) {
    const input = document.createElement('input');
    input.className = 'tt-tab__input';
    input.value = nameSpan.textContent;
    input.maxLength = 12;
    tabEl.replaceChild(input, nameSpan);
    input.focus();
    input.select();

    function commit() {
        const newName = input.value.trim() || nameSpan.textContent;
        renameTimetable(id, newName);
    }

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { renderTabs(); }
    });
    input.addEventListener('blur', commit);
}

// ─── 탭 CRUD ────────────────────────────────────────────────────────

function switchTimetable(id) {
    if (state.activeTimetableId === id) return;
    state.activeTimetableId = id;
    saveToLocal();
    renderTabs();
    renderTimetable();
}

function addTimetable() {
    const newTt = { id: generateTimetableId(), name: getNextPlanName(), history: [] };
    state.timetables.push(newTt);
    state.activeTimetableId = newTt.id;
    saveToLocal();
    renderTabs();
    renderTimetable();
}

function deleteTimetable(id) {
    if (state.timetables.length <= 1) return;

    const idx = state.timetables.findIndex(t => t.id === id);
    state.timetables.splice(idx, 1);

    // 삭제된 탭이 활성 탭이었으면 인접 탭으로 이동
    if (state.activeTimetableId === id) {
        const newIdx = Math.max(0, idx - 1);
        state.activeTimetableId = state.timetables[newIdx].id;
    }

    saveToLocal();
    renderTabs();
    renderTimetable();
}

function renameTimetable(id, name) {
    const tt = state.timetables.find(t => t.id === id);
    if (tt) tt.name = name;
    saveToLocal();
    renderTabs();
}

// ─── 이벤트 바인딩 ───────────────────────────────────────────────────

// PC: + 버튼
const addBtn = document.getElementById('tt-add-btn');
if (addBtn) addBtn.addEventListener('click', addTimetable);

// PC: ◀ 버튼
const scrollLeftBtn = document.getElementById('tt-scroll-left');
if (scrollLeftBtn) {
    scrollLeftBtn.addEventListener('click', () => {
        const list = document.getElementById('tt-tab-list');
        if (list) list.scrollBy({ left: -120, behavior: 'smooth' });
    });
}

// PC: ▶ 버튼
const scrollRightBtn = document.getElementById('tt-scroll-right');
if (scrollRightBtn) {
    scrollRightBtn.addEventListener('click', () => {
        const list = document.getElementById('tt-tab-list');
        if (list) list.scrollBy({ left: 120, behavior: 'smooth' });
    });
}

// PC: 탭 목록 스크롤 이벤트 → 화살표 갱신
const ttTabList = document.getElementById('tt-tab-list');
if (ttTabList) {
    ttTabList.addEventListener('scroll', updateScrollArrows);
}

// PC: 탭 바 크기 변화 감지 → 화살표 갱신
const ttTabBar = document.getElementById('timetable-tab-bar');
if (ttTabBar && typeof window.ResizeObserver !== 'undefined') {
    new window.ResizeObserver(updateScrollArrows).observe(ttTabBar);
}

// Mobile: + 버튼
const mAddBtn = document.getElementById('m-tt-add-btn');
if (mAddBtn) mAddBtn.addEventListener('click', addTimetable);

// Clear 버튼 (PC)
const clearTimetableBtn = document.getElementById('clear-timetable-btn');
if (clearTimetableBtn) {
    clearTimetableBtn.addEventListener('click', () => {
        if (confirm('현재 타임테이블의 모든 공부 기록을 삭제하시겠습니까?')) {
            getActiveHistory().splice(0);
            state.tasks = state.tasks.map(t => ({ ...t, duration: '0s' }));
            saveToLocal();
            renderTasks();
            renderTimetable();
        }
    });
}

// ─── 초기 탭 렌더링 ─────────────────────────────────────────────────
renderTabs();
