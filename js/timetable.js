import { state, getSubjectColor, saveToLocal, getActiveHistory, getActiveTimetable, getActivePlans } from './store.js';
import { renderTasks } from './tasks.js';

// ─── 상수 ───────────────────────────────────────────────────────────
const START_HOUR = 6;
const SLOT_COUNT = 144; // 24h × 6 slots
const SLOT_MS = 10 * 60 * 1000; // 10분

// ─── 타임테이블 그리드 렌더링 (기록 모드) ──────────────────────────

function buildSlotMap(activeHistory, selectedDate) {
    const slotMap = new Array(SLOT_COUNT).fill(null);

    const base = new Date(selectedDate);
    base.setHours(START_HOUR, 0, 0, 0);
    const baseMs = base.getTime();
    const totalMs = SLOT_COUNT * SLOT_MS;

    for (const session of activeHistory) {
        const sStart = new Date(session.startTime).getTime();
        const sEnd = sStart + session.duration * 1000;

        if (sEnd <= baseMs || sStart >= baseMs + totalMs) continue;

        const firstSlot = Math.max(0, Math.floor((sStart - baseMs) / SLOT_MS));
        const lastSlot = Math.min(SLOT_COUNT - 1, Math.floor((sEnd - 1 - baseMs) / SLOT_MS));

        for (let s = firstSlot; s <= lastSlot; s++) {
            if (!slotMap[s]) slotMap[s] = session;
        }
    }

    return slotMap;
}

// ─── 슬롯 인덱스 ↔ 시간 변환 ───────────────────────────────────────

function slotToTimeLabel(slotIdx) {
    const totalMinutes = (START_HOUR * 60) + (slotIdx * 10);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function slotRangeLabel(startSlot, endSlot) {
    return `${slotToTimeLabel(startSlot)} ~ ${slotToTimeLabel(endSlot + 1)}`;
}

// ─── 기록 모드 그리드 빌드 ──────────────────────────────────────────

function buildRecordRows(root, slotMap) {
    if (!root) return;
    root.innerHTML = '';

    for (let i = 0; i < 24; i++) {
        const hour = (START_HOUR + i) % 24;
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

            const activeSession = slotMap[i * 6 + j];
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

// ─── 계획 모드 그리드 빌드 ──────────────────────────────────────────

function buildPlanRows(root, plans, isPc) {
    if (!root) return;
    root.innerHTML = '';
    root.classList.add(isPc ? 'timetable-container--plan' : 'm-timetable-container--plan');

    const rowHeight = isPc ? 32 : 28;
    const labelWidth = isPc ? 50 : 36;

    // 빈 그리드 행 생성
    for (let i = 0; i < 24; i++) {
        const hour = (START_HOUR + i) % 24;
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
            slot.dataset.slotIdx = String(i * 6 + j);
            slots.appendChild(slot);
        }
        row.appendChild(slots);
        root.appendChild(row);
    }

    // 계획 블록 오버레이 렌더링
    for (const plan of plans) {
        renderPlanBlock(root, plan, rowHeight, labelWidth);
    }

    // 계획 슬롯 선택 이벤트 바인딩
    bindPlanSelection(root, isPc);
}

function renderPlanBlock(root, plan, rowHeight, labelWidth) {
    const slotsContainer = root.querySelector('.ten-min-slots');
    if (!slotsContainer) return;

    const borderBottom = 1; // border-bottom 1px
    const slotHeight = (rowHeight + borderBottom) / 6; // 10분 슬롯 높이

    // 10분 슬롯 단위로 정확한 위치/높이 계산
    const topPx = plan.startSlot * slotHeight;
    const bottomPx = (plan.endSlot + 1) * slotHeight;
    const height = bottomPx - topPx;

    const block = document.createElement('div');
    block.className = 'plan-block';
    if (!plan.subject) block.classList.add('plan-block--no-subject');

    block.style.position = 'absolute';
    block.style.top = topPx + 'px';
    block.style.left = labelWidth + 'px';
    block.style.right = '0';
    block.style.height = height + 'px';
    block.dataset.planId = plan.id;

    if (plan.subject) {
        const baseColor = getSubjectColor(plan.subject);
        block.style.background = lightenColor(baseColor, 0.25);
    }

    if (plan.memo) {
        const memoEl = document.createElement('span');
        memoEl.className = 'plan-block__memo';
        memoEl.textContent = plan.memo;
        block.appendChild(memoEl);
    }

    block.addEventListener('click', (e) => {
        e.stopPropagation();
        showPlanDetailModal(plan);
    });

    root.appendChild(block);
}

function lightenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xFF) + Math.round(255 * amount));
    const g = Math.min(255, ((num >> 8) & 0xFF) + Math.round(255 * amount));
    const b = Math.min(255, (num & 0xFF) + Math.round(255 * amount));
    return `rgb(${r}, ${g}, ${b})`;
}

// ─── 계획 슬롯 선택 (1.5초 누르기 + 범위 확장) ─────────────────────

let planSelectState = null; // { root, startSlot, endSlot, isPc, longPressTimer, active }

function bindPlanSelection(root, isPc) {
    const allSlots = root.querySelectorAll('.slot[data-slot-idx]');

    allSlots.forEach(slot => {
        // 마우스 이벤트 (PC)
        slot.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const idx = parseInt(slot.dataset.slotIdx);
            // 이미 계획이 있는 슬롯은 무시 (클릭은 plan-block이 처리)
            if (isSlotOccupied(idx)) return;
            startLongPress(root, idx, isPc);
        });

        // 터치 이벤트 (모바일)
        slot.addEventListener('touchstart', (e) => {
            const idx = parseInt(slot.dataset.slotIdx);
            if (isSlotOccupied(idx)) return;
            const touch = e.touches[0];
            startLongPress(root, idx, isPc, touch.clientX, touch.clientY);
        }, { passive: true });
    });

    // 마우스 이동 (PC)
    root.addEventListener('mousemove', (e) => {
        if (!planSelectState || !planSelectState.active) return;
        const slotEl = getSlotFromPoint(e.clientX, e.clientY, root);
        if (slotEl) {
            const idx = parseInt(slotEl.dataset.slotIdx);
            updateSelection(root, idx);
        }
    });

    // 터치 이동 (모바일)
    root.addEventListener('touchmove', (e) => {
        if (!planSelectState) return;
        // 롱프레스 대기 중이면 일정 거리 이내 미세 움직임은 허용
        if (!planSelectState.active) {
            const touch = e.touches[0];
            const dx = touch.clientX - (planSelectState.touchStartX || 0);
            const dy = touch.clientY - (planSelectState.touchStartY || 0);
            if (dx * dx + dy * dy > 100) { // 10px 반경 초과 시 취소
                cancelLongPress();
            }
            return;
        }
        const touch = e.touches[0];
        const slotEl = getSlotFromPoint(touch.clientX, touch.clientY, root);
        if (slotEl) {
            const idx = parseInt(slotEl.dataset.slotIdx);
            updateSelection(root, idx);
        }
        e.preventDefault(); // 스크롤 방지
    }, { passive: false });

    // 선택 완료: mouseup / touchend
    root.addEventListener('mouseup', () => finishSelection());
    root.addEventListener('touchend', () => finishSelection());

    // 선택 취소: mouseleave
    root.addEventListener('mouseleave', () => {
        if (planSelectState && !planSelectState.active) {
            cancelLongPress();
        }
    });
}

function startLongPress(root, slotIdx, isPc, touchX, touchY) {
    cancelLongPress();

    const slot = root.querySelector(`.slot[data-slot-idx="${slotIdx}"]`);
    if (slot) slot.classList.add('plan-hover');

    planSelectState = {
        root,
        startSlot: slotIdx,
        endSlot: slotIdx,
        isPc,
        active: false,
        touchStartX: touchX || 0,
        touchStartY: touchY || 0,
        longPressTimer: setTimeout(() => {
            if (!planSelectState) return;
            planSelectState.active = true;
            // 롱프레스 성공 - 선택 시작 피드백
            if (slot) {
                slot.classList.remove('plan-hover');
                slot.classList.add('plan-selecting');
            }
        }, 1500)
    };
}

function cancelLongPress() {
    if (planSelectState) {
        clearTimeout(planSelectState.longPressTimer);
        clearSelectionHighlight(planSelectState.root);
        planSelectState = null;
    }
}

function updateSelection(root, slotIdx) {
    if (!planSelectState || !planSelectState.active) return;

    planSelectState.endSlot = slotIdx;

    // 하이라이트 갱신
    clearSelectionHighlight(root);
    const minSlot = Math.min(planSelectState.startSlot, planSelectState.endSlot);
    const maxSlot = Math.max(planSelectState.startSlot, planSelectState.endSlot);

    for (let i = minSlot; i <= maxSlot; i++) {
        const el = root.querySelector(`.slot[data-slot-idx="${i}"]`);
        if (el) el.classList.add('plan-selecting');
    }
}

function clearSelectionHighlight(root) {
    root.querySelectorAll('.slot.plan-selecting, .slot.plan-hover').forEach(el => {
        el.classList.remove('plan-selecting', 'plan-hover');
    });
}

function finishSelection() {
    if (!planSelectState) return;

    const { root, startSlot, endSlot, active } = planSelectState;

    // 탭(롱프레스 미완료) → 단일 슬롯 선택
    if (!active) {
        const slotIdx = startSlot;
        cancelLongPress();
        if (isSlotOccupied(slotIdx)) return;
        showPlanSlotModal(slotIdx, slotIdx);
        return;
    }

    // 롱프레스 완료 → 드래그 범위 선택
    const minSlot = Math.min(startSlot, endSlot);
    const maxSlot = Math.max(startSlot, endSlot);

    clearSelectionHighlight(root);
    planSelectState = null;

    // 겹침 검사
    const plans = getActivePlans();
    for (const p of plans) {
        if (minSlot <= p.endSlot && maxSlot >= p.startSlot) {
            // 겹치는 계획이 있으면 무시
            return;
        }
    }

    showPlanSlotModal(minSlot, maxSlot);
}

function isSlotOccupied(slotIdx) {
    const plans = getActivePlans();
    return plans.some(p => slotIdx >= p.startSlot && slotIdx <= p.endSlot);
}

function getSlotFromPoint(x, y, root) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    if (el.classList.contains('slot') && el.dataset.slotIdx !== undefined && root.contains(el)) {
        return el;
    }
    return null;
}

// ─── 계획 슬롯 설정 모달 ───────────────────────────────────────────

function showPlanSlotModal(startSlot, endSlot) {
    const modal = document.getElementById('plan-slot-modal');
    const timeLabel = document.getElementById('plan-slot-time-label');
    const subjectSelect = document.getElementById('plan-slot-subject');
    const memoInput = document.getElementById('plan-slot-memo');

    timeLabel.textContent = slotRangeLabel(startSlot, endSlot);

    // 과목 드롭다운 채우기
    subjectSelect.innerHTML = '<option value="">선택 안 함</option>';
    state.subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub.id;
        opt.textContent = sub.name;
        subjectSelect.appendChild(opt);
    });

    memoInput.value = '';
    modal.classList.add('active');

    // 이벤트 리스너 (한 번만)
    const confirmBtn = document.getElementById('plan-slot-confirm');
    const cancelBtn = document.getElementById('plan-slot-cancel');

    function closeModal() {
        modal.classList.remove('active');
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', closeModal);
    }

    function onConfirm() {
        const subject = subjectSelect.value || null;
        const memo = memoInput.value.trim() || '';

        const newPlan = {
            id: 'plan_' + Date.now(),
            startSlot,
            endSlot,
            subject,
            memo
        };

        getActivePlans().push(newPlan);
        saveToLocal();
        renderTimetable();
        closeModal();
    }

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', closeModal);
}

// ─── 계획 상세/수정/삭제 모달 ───────────────────────────────────────

function showPlanDetailModal(plan) {
    const modal = document.getElementById('plan-detail-modal');
    const timeLabel = document.getElementById('plan-detail-time-label');
    const subjectEl = document.getElementById('plan-detail-subject');
    const memoEl = document.getElementById('plan-detail-memo');

    timeLabel.textContent = slotRangeLabel(plan.startSlot, plan.endSlot);

    if (plan.subject) {
        const sub = state.subjects.find(s => s.id === plan.subject);
        subjectEl.textContent = sub ? sub.name : plan.subject;
        subjectEl.style.color = getSubjectColor(plan.subject);
        subjectEl.style.display = '';
    } else {
        subjectEl.style.display = 'none';
    }

    memoEl.textContent = plan.memo || '(메모 없음)';
    modal.classList.add('active');

    const deleteBtn = document.getElementById('plan-detail-delete');
    const editBtn = document.getElementById('plan-detail-edit');

    function closeModal() {
        modal.classList.remove('active');
        deleteBtn.removeEventListener('click', onDelete);
        editBtn.removeEventListener('click', onEdit);
    }

    function onDelete() {
        const plans = getActivePlans();
        const idx = plans.findIndex(p => p.id === plan.id);
        if (idx !== -1) plans.splice(idx, 1);
        saveToLocal();
        renderTimetable();
        closeModal();
    }

    function onEdit() {
        closeModal();
        startResizeMode(plan);
    }

    deleteBtn.addEventListener('click', onDelete);
    editBtn.addEventListener('click', onEdit);
}

// ─── 수정 모드 (양끝 핸들 드래그) ──────────────────────────────────

function startResizeMode(plan) {
    // 양쪽 root에서 해당 블록 찾기
    const roots = [
        document.getElementById('timetable-root'),
        document.getElementById('m-timetable-root')
    ].filter(Boolean);

    roots.forEach(root => {
        const block = root.querySelector(`.plan-block[data-plan-id="${plan.id}"]`);
        if (!block) return;

        const isRootPc = root.id === 'timetable-root';
        const rowHeight = isRootPc ? 32 : 28;

        // 상단 핸들
        const topHandle = document.createElement('div');
        topHandle.className = 'plan-resize-handle plan-resize-handle--top';
        block.appendChild(topHandle);

        // 하단 핸들
        const bottomHandle = document.createElement('div');
        bottomHandle.className = 'plan-resize-handle plan-resize-handle--bottom';
        block.appendChild(bottomHandle);

        block.classList.add('plan-block--resizing');

        function bindHandle(handle, isTop) {
            let startY = 0;
            let originalSlot = isTop ? plan.startSlot : plan.endSlot;

            function onStart(e) {
                e.stopPropagation();
                e.preventDefault();
                const point = e.touches ? e.touches[0] : e;
                startY = point.clientY;
                originalSlot = isTop ? plan.startSlot : plan.endSlot;
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onEnd);
                document.addEventListener('touchmove', onMove, { passive: false });
                document.addEventListener('touchend', onEnd);
            }

            function onMove(e) {
                e.preventDefault();
                const point = e.touches ? e.touches[0] : e;
                const dy = point.clientY - startY;
                const slotDelta = Math.round(dy / ((rowHeight + 1) / 6));
                let newSlot = originalSlot + slotDelta;
                newSlot = Math.max(0, Math.min(SLOT_COUNT - 1, newSlot));

                if (isTop) {
                    if (newSlot > plan.endSlot) newSlot = plan.endSlot;
                    plan.startSlot = newSlot;
                } else {
                    if (newSlot < plan.startSlot) newSlot = plan.startSlot;
                    plan.endSlot = newSlot;
                }

                saveToLocal();
                renderTimetable();
                // 리렌더 후 다시 resize 모드 재적용
                window.requestAnimationFrame(() => startResizeMode(plan));
            }

            function onEnd() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onEnd);
                document.removeEventListener('touchmove', onMove);
                document.removeEventListener('touchend', onEnd);
                saveToLocal();
                renderTimetable();
            }

            handle.addEventListener('mousedown', onStart);
            handle.addEventListener('touchstart', onStart, { passive: false });
        }

        bindHandle(topHandle, true);
        bindHandle(bottomHandle, false);

        // 블록 외부 클릭 시 resize 모드 종료
        function dismissResize(e) {
            if (block.contains(e.target)) return;
            block.classList.remove('plan-block--resizing');
            topHandle.remove();
            bottomHandle.remove();
            document.removeEventListener('mousedown', dismissResize, true);
            document.removeEventListener('touchstart', dismissResize, true);
        }

        setTimeout(() => {
            document.addEventListener('mousedown', dismissResize, { capture: true });
            document.addEventListener('touchstart', dismissResize, { capture: true });
        }, 0);
    });
}

// ─── 메인 렌더 함수 ─────────────────────────────────────────────────

export function renderTimetable() {
    const tt = getActiveTimetable();
    const pcRoot = document.getElementById('timetable-root');
    const mRoot = document.getElementById('m-timetable-root');

    // 모드 바 동기화
    syncModeBar();

    if (tt.type === 'plan') {
        // 계획 모드
        if (pcRoot) {
            pcRoot.classList.remove('timetable-container--plan');
            buildPlanRows(pcRoot, tt.plans, true);
        }
        if (mRoot) {
            mRoot.classList.remove('m-timetable-container--plan');
            buildPlanRows(mRoot, tt.plans, false);
        }
    } else {
        // 기록 모드
        if (pcRoot) pcRoot.classList.remove('timetable-container--plan');
        if (mRoot) mRoot.classList.remove('m-timetable-container--plan');

        const slotMap = buildSlotMap(getActiveHistory(), state.selectedDate);
        buildRecordRows(pcRoot, slotMap);
        buildRecordRows(mRoot, slotMap);
    }
}

// ─── 모드 바 동기화 ─────────────────────────────────────────────────

function syncModeBar() {
    const tt = getActiveTimetable();
    const mode = tt.type || 'record';

    [
        { record: 'tt-mode-record', plan: 'tt-mode-plan' },
        { record: 'm-tt-mode-record', plan: 'm-tt-mode-plan' }
    ].forEach(ids => {
        const recordBtn = document.getElementById(ids.record);
        const planBtn = document.getElementById(ids.plan);
        if (recordBtn) recordBtn.classList.toggle('tt-mode-btn--active', mode === 'record');
        if (planBtn) planBtn.classList.toggle('tt-mode-btn--active', mode === 'plan');
    });
}

// ─── 모드 전환 로직 ─────────────────────────────────────────────────

function switchMode(targetMode) {
    const tt = getActiveTimetable();
    if (tt.type === targetMode) return;

    // 기존 데이터가 있는지 확인
    const hasData = (tt.type === 'record' && tt.history.length > 0) ||
                    (tt.type === 'plan' && tt.plans.length > 0);

    if (hasData) {
        showModeConfirmModal(targetMode);
    } else {
        tt.type = targetMode;
        saveToLocal();
        renderTimetable();
    }
}

function showModeConfirmModal(targetMode) {
    const modal = document.getElementById('tt-mode-confirm-modal');
    modal.classList.add('active');

    const newTabBtn = document.getElementById('tt-mode-new-tab');
    const overwriteBtn = document.getElementById('tt-mode-overwrite');
    const cancelBtn = document.getElementById('tt-mode-cancel');

    function closeModal() {
        modal.classList.remove('active');
        newTabBtn.removeEventListener('click', onNewTab);
        overwriteBtn.removeEventListener('click', onOverwrite);
        cancelBtn.removeEventListener('click', closeModal);
    }

    function onNewTab() {
        // 새 탭 생성 후 해당 모드로 설정
        const newTt = {
            id: generateTimetableId(),
            name: getNextPlanName(),
            type: targetMode,
            history: [],
            plans: []
        };
        state.timetables.push(newTt);
        state.activeTimetableId = newTt.id;
        saveToLocal();
        renderTabs();
        renderTimetable();
        closeModal();
    }

    function onOverwrite() {
        const tt = getActiveTimetable();
        tt.type = targetMode;
        tt.history = [];
        tt.plans = [];
        saveToLocal();
        renderTimetable();
        closeModal();
    }

    newTabBtn.addEventListener('click', onNewTab);
    overwriteBtn.addEventListener('click', onOverwrite);
    cancelBtn.addEventListener('click', closeModal);
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
    const activeTab = listEl.querySelector('.tt-tab--active, .m-tt-tab--active');
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
    const newTt = { id: generateTimetableId(), name: getNextPlanName(), type: 'record', history: [], plans: [] };
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

// 모드 전환 버튼 (PC)
document.getElementById('tt-mode-record')?.addEventListener('click', () => switchMode('record'));
document.getElementById('tt-mode-plan')?.addEventListener('click', () => switchMode('plan'));

// 모드 전환 버튼 (모바일)
document.getElementById('m-tt-mode-record')?.addEventListener('click', () => switchMode('record'));
document.getElementById('m-tt-mode-plan')?.addEventListener('click', () => switchMode('plan'));

// Clear 버튼 (PC)
const clearTimetableBtn = document.getElementById('clear-timetable-btn');
if (clearTimetableBtn) {
    clearTimetableBtn.addEventListener('click', () => {
        const tt = getActiveTimetable();
        if (tt.type === 'plan') {
            if (confirm('현재 타임테이블의 모든 계획을 삭제하시겠습니까?')) {
                tt.plans.splice(0);
                saveToLocal();
                renderTimetable();
            }
        } else {
            if (confirm('현재 타임테이블의 모든 공부 기록을 삭제하시겠습니까?')) {
                getActiveHistory().splice(0);
                state.tasks = state.tasks.map(t => ({ ...t, duration: '0s' }));
                saveToLocal();
                renderTasks();
                renderTimetable();
            }
        }
    });
}

// ─── 초기 탭 렌더링 ─────────────────────────────────────────────────
renderTabs();
