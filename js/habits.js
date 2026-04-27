// 습관(고정 일정) 관리 모듈.
//
// - 위클리/매일 단위로 반복할 할 일과 플랜을 미리 등록하고,
//   대시보드 진입 시 그날 요일에 맞춰 자동 시드(seed)한다.
// - 우선순위: 매일 < 요일 < 사용자 수정.
//   - 시드 순서: 요일 우선 → 매일은 충돌 없는 항목만 추가.
//   - habitSeedLog로 한 번 시드된 항목은 사용자가 삭제해도 재시드하지 않는다.

import {
    state,
    saveToLocal,
    getHabitTimetable,
    getHabitDayKeyForDate,
    getSubjectColor,
    HABIT_DAY_KEYS_ORDERED,
    HABIT_DAY_LABELS_KO
} from './store.js';
import { icon } from './icons.js';
import { bindPlanSelection } from './timetable.js';

const START_HOUR = 6;

// ─── 시드 ─────────────────────────────────────────────────────────────

function makeTaskKey(t) { return `${t.subject}::${t.name}`; }
function makePlanKey(p) { return `${p.startSlot}-${p.endSlot}-${p.subject || ''}-${p.memo || ''}`; }

// 습관 탭에서 저장한 변경을 즉시 대시보드에 반영한다.
// - 신규 항목은 seed로 오늘자 데이터에 복사된다.
// - 기존 카드/타임테이블은 그대로 두고 화면만 다시 그린다.
function syncDashboardAfterHabitChange() {
    seedHabitsForDate(state.selectedDate);
    if (typeof window.renderTasks === 'function') window.renderTasks();
    if (typeof window.renderMobileTasks === 'function') window.renderMobileTasks();
    if (typeof window.renderTimetable === 'function') window.renderTimetable();
}

export function seedHabitsForDate(dateKey) {
    if (!state.habitSeedLog) state.habitSeedLog = {};
    const log = state.habitSeedLog[dateKey] || { taskKeys: [], planKeys: [] };

    const dayKey = getHabitDayKeyForDate(dateKey);
    const dailyHabit = state.habits?.daily || { tasks: [] };
    const dayHabit = state.habits?.[dayKey] || { tasks: [] };

    // ── 할 일 시드 ─────────────────────────────────────────
    const taskSeenKeys = new Set();
    const mergedTasks = [];
    for (const t of dayHabit.tasks) {
        const k = makeTaskKey(t);
        if (taskSeenKeys.has(k)) continue;
        taskSeenKeys.add(k);
        mergedTasks.push(t);
    }
    for (const t of dailyHabit.tasks) {
        const k = makeTaskKey(t);
        if (taskSeenKeys.has(k)) continue;
        taskSeenKeys.add(k);
        mergedTasks.push(t);
    }

    let nextTaskId = Math.max(0, ...state.tasks.map(t => Number(t.id) || 0)) + 1;
    for (const ht of mergedTasks) {
        const key = makeTaskKey(ht);
        if (log.taskKeys.includes(key)) continue;
        const exists = state.tasks.some(t =>
            t.date === dateKey && t.subject === ht.subject && t.name === ht.name
        );
        if (!exists) {
            state.tasks.push({
                id: nextTaskId++,
                subject: ht.subject,
                name: ht.name,
                duration: '0s',
                completed: false,
                date: dateKey,
                fromHabit: true
            });
        }
        log.taskKeys.push(key);
    }

    // ── 플랜 시드 ─────────────────────────────────────────
    // 활성 비-습관 타임테이블에 시드. 모든 타임테이블이 plan/record 두 뷰를 모두 보유하므로 mode 필터는 불필요.
    const activeTt = state.timetables.find(t => t.id === state.activeTimetableId);
    const target = activeTt && !activeTt.isHabit
        ? activeTt
        : state.timetables.find(t => !t.isHabit);

    if (target) {
        const dailyTt = getHabitTimetable('daily');
        const dayTt = getHabitTimetable(dayKey);
        const dailyPlans = dailyTt?.plans || [];
        const dayPlans = dayTt?.plans || [];

        // 요일 우선순위 보장: 요일 플랜과 슬롯이 겹치는 "이전에 시드된 매일 출신 블록"을 제거.
        // 사용자가 직접 만든 블록(fromHabit !== true)은 절대 건드리지 않는다.
        const dayOccupiedSlots = new Set();
        for (const p of dayPlans) {
            for (let s = p.startSlot; s <= p.endSlot; s++) dayOccupiedSlots.add(s);
        }
        if (dayOccupiedSlots.size > 0) {
            const dailyKeySet = new Set(dailyPlans.map(makePlanKey));
            const removedDailyKeys = [];
            target.plans = target.plans.filter(p => {
                if (!p.fromHabit) return true;
                if (p.date !== dateKey) return true;
                let overlap = false;
                for (let s = p.startSlot; s <= p.endSlot; s++) {
                    if (dayOccupiedSlots.has(s)) { overlap = true; break; }
                }
                if (!overlap) return true;
                const k = makePlanKey(p);
                if (dailyKeySet.has(k)) {
                    removedDailyKeys.push(k);
                    return false;
                }
                return true;
            });
            if (removedDailyKeys.length > 0) {
                log.planKeys = log.planKeys.filter(k => !removedDailyKeys.includes(k));
            }
        }

        const occupied = new Set();
        for (const p of target.plans) {
            if (p.date && p.date !== dateKey) continue;
            for (let s = p.startSlot; s <= p.endSlot; s++) occupied.add(s);
        }

        // 요일 우선 → 매일 보충. 머지 단계에서 매일이 요일과 충돌하면 미리 제외.
        const seenSlots = new Set();
        const merged = [];
        for (const p of dayPlans) {
            merged.push(p);
            for (let s = p.startSlot; s <= p.endSlot; s++) seenSlots.add(s);
        }
        for (const p of dailyPlans) {
            let conflict = false;
            for (let s = p.startSlot; s <= p.endSlot; s++) {
                if (seenSlots.has(s)) { conflict = true; break; }
            }
            if (!conflict) {
                merged.push(p);
                for (let s = p.startSlot; s <= p.endSlot; s++) seenSlots.add(s);
            }
        }

        for (const hp of merged) {
            const key = makePlanKey(hp);
            if (log.planKeys.includes(key)) continue;
            let collide = false;
            for (let s = hp.startSlot; s <= hp.endSlot; s++) {
                if (occupied.has(s)) { collide = true; break; }
            }
            if (collide) continue;
            target.plans.push({
                id: 'plan_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                startSlot: hp.startSlot,
                endSlot: hp.endSlot,
                subject: hp.subject,
                memo: hp.memo,
                date: dateKey,
                fromHabit: true
            });
            for (let s = hp.startSlot; s <= hp.endSlot; s++) occupied.add(s);
            log.planKeys.push(key);
        }
    }

    state.habitSeedLog[dateKey] = log;
    saveToLocal();
}

// ─── 요일 탭 ─────────────────────────────────────────────────────────

function renderDayTabs(containerId, isPc) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = HABIT_DAY_KEYS_ORDERED.map(key => `
        <button class="${isPc ? 'habit-day-tab' : 'm-habit-day-tab'} ${state.habitEditorDay === key ? 'active' : ''}"
                data-day="${key}">${HABIT_DAY_LABELS_KO[key]}</button>
    `).join('');
    container.querySelectorAll('[data-day]').forEach(btn => {
        btn.addEventListener('click', () => {
            state.habitEditorDay = btn.dataset.day;
            saveToLocal();
            renderHabitEditor();
        });
    });
}

// ─── 할 일 편집 ──────────────────────────────────────────────────────

function getHabitTasks() {
    const dayKey = state.habitEditorDay;
    if (!state.habits[dayKey]) state.habits[dayKey] = { tasks: [] };
    return state.habits[dayKey].tasks;
}

function renderHabitTasks() {
    const tasks = getHabitTasks();
    const renderInto = (rootId) => {
        const root = document.getElementById(rootId);
        if (!root) return;
        if (tasks.length === 0) {
            root.innerHTML = '<div class="habit-empty">이 요일에 등록된 습관 할 일이 없습니다.</div>';
            return;
        }
        root.innerHTML = tasks.map((t, idx) => {
            const sub = state.subjects.find(s => s.id === t.subject);
            const color = sub ? sub.color : '#8E8E93';
            const subName = sub ? sub.name : t.subject;
            return `
                <li class="habit-task-item" data-idx="${idx}">
                    <span class="habit-task-bar" style="background:${color}"></span>
                    <div class="habit-task-body">
                        <span class="habit-task-subject">${subName}</span>
                        <span class="habit-task-name">${t.name}</span>
                    </div>
                    <div class="habit-task-actions">
                        <button class="ghost-btn habit-task-edit" data-idx="${idx}" title="수정">${icon('grip-vertical')}</button>
                        <button class="ghost-btn habit-task-delete" data-idx="${idx}" title="삭제">${icon('trash-2')}</button>
                    </div>
                </li>
            `;
        }).join('');
        root.querySelectorAll('.habit-task-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = Number(btn.dataset.idx);
                tasks.splice(idx, 1);
                saveToLocal();
                renderHabitTasks();
                syncDashboardAfterHabitChange();
            });
        });
        root.querySelectorAll('.habit-task-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = Number(btn.dataset.idx);
                openHabitTaskModal(idx);
            });
        });
    };
    renderInto('habit-task-list');
    renderInto('m-habit-task-list');
}

function openHabitTaskModal(editIdx = null) {
    const modal = document.getElementById('habit-task-modal');
    const title = document.getElementById('habit-task-modal-title');
    const subjectSel = document.getElementById('habit-task-subject');
    const nameInput = document.getElementById('habit-task-name');
    const cancelBtn = document.getElementById('habit-task-cancel');
    const confirmBtn = document.getElementById('habit-task-confirm');

    subjectSel.innerHTML = state.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    const tasks = getHabitTasks();
    if (editIdx !== null && tasks[editIdx]) {
        title.textContent = '습관 할 일 수정';
        subjectSel.value = tasks[editIdx].subject;
        nameInput.value = tasks[editIdx].name;
    } else {
        title.textContent = '습관 할 일 추가';
        nameInput.value = '';
    }
    modal.classList.add('active');

    function close() {
        modal.classList.remove('active');
        cancelBtn.removeEventListener('click', close);
        confirmBtn.removeEventListener('click', confirm);
    }
    function confirm() {
        const name = nameInput.value.trim();
        if (!name) { nameInput.focus(); return; }
        const subject = subjectSel.value;
        if (editIdx !== null && tasks[editIdx]) {
            tasks[editIdx] = { subject, name };
        } else {
            tasks.push({ subject, name });
        }
        saveToLocal();
        renderHabitTasks();
        syncDashboardAfterHabitChange();
        close();
    }
    cancelBtn.addEventListener('click', close);
    confirmBtn.addEventListener('click', confirm);
}

// ─── 플랜 편집 (24h 그리드) ──────────────────────────────────────────

function lightenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xFF) + Math.round(255 * amount));
    const g = Math.min(255, ((num >> 8) & 0xFF) + Math.round(255 * amount));
    const b = Math.min(255, (num & 0xFF) + Math.round(255 * amount));
    return `rgb(${r}, ${g}, ${b})`;
}

function slotRangeLabel(startSlot, endSlot) {
    const fmt = (s) => {
        const totalMin = (START_HOUR * 60) + s * 10;
        const h = Math.floor(totalMin / 60) % 24;
        const m = totalMin % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };
    return `${fmt(startSlot)} ~ ${fmt(endSlot + 1)}`;
}

function buildHabitGrid(root, plans, isPc) {
    if (!root) return;
    root.innerHTML = '';
    root.classList.add(isPc ? 'timetable-container--plan' : 'm-timetable-container--plan');

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

    for (const plan of plans) {
        for (let s = plan.startSlot; s <= plan.endSlot; s++) {
            const slot = root.querySelector(`.slot[data-slot-idx="${s}"]`);
            if (!slot) continue;
            slot.classList.add('plan-filled');
            slot.dataset.planId = plan.id;
            slot.style.background = plan.subject
                ? lightenColor(getSubjectColor(plan.subject), 0.25)
                : '#C7C7CC';
            slot.addEventListener('click', (e) => {
                e.stopPropagation();
                openHabitPlanDetail(plan);
            });
        }
    }

    // 빈 슬롯 → 짧게 누름(단일 칸) 또는 길게 누른 뒤 드래그(범위)로 추가
    bindPlanSelection(root, isPc, {
        isSlotOccupied: (slotIdx) => {
            const tt = getHabitTimetable(state.habitEditorDay);
            if (!tt) return false;
            return tt.plans.some(p => slotIdx >= p.startSlot && slotIdx <= p.endSlot);
        },
        onSelected: (startSlot, endSlot) => {
            openHabitPlanAdd(startSlot, endSlot);
        }
    });
}

function openHabitPlanAdd(startSlot, endSlot) {
    const modal = document.getElementById('plan-slot-modal');
    const timeLabel = document.getElementById('plan-slot-time-label');
    const subjectSelect = document.getElementById('plan-slot-subject');
    const memoInput = document.getElementById('plan-slot-memo');
    const confirmBtn = document.getElementById('plan-slot-confirm');
    const cancelBtn = document.getElementById('plan-slot-cancel');

    timeLabel.textContent = slotRangeLabel(startSlot, endSlot);

    subjectSelect.innerHTML = '<option value="">선택 안 함</option>' +
        state.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    memoInput.value = '';
    modal.classList.add('active');

    // 기존 dashboard용 confirm 리스너를 임시 차단하기 위해 cloneNode로 교체
    const newConfirm = confirmBtn.cloneNode(true);
    confirmBtn.replaceWith(newConfirm);
    const newCancel = cancelBtn.cloneNode(true);
    cancelBtn.replaceWith(newCancel);

    function close() {
        modal.classList.remove('active');
        // 모달이 다른 곳에서도 사용되므로, 닫을 때 원래 핸들러는 timetable.js에서 다음 호출 시 다시 바인딩됨
    }
    newConfirm.addEventListener('click', () => {
        const tt = getHabitTimetable(state.habitEditorDay);
        if (!tt) return;
        tt.plans.push({
            id: 'habit_plan_' + Date.now(),
            startSlot,
            endSlot,
            subject: subjectSelect.value || null,
            memo: memoInput.value.trim()
        });
        saveToLocal();
        renderHabitPlanGrid();
        syncDashboardAfterHabitChange();
        close();
    });
    newCancel.addEventListener('click', close);
}

function openHabitPlanDetail(plan) {
    const modal = document.getElementById('plan-detail-modal');
    const timeLabel = document.getElementById('plan-detail-time-label');
    const subjectEl = document.getElementById('plan-detail-subject');
    const memoEl = document.getElementById('plan-detail-memo');
    const deleteBtn = document.getElementById('plan-detail-delete');
    const cancelBtn = document.getElementById('plan-detail-cancel');
    const editBtn = document.getElementById('plan-detail-edit');

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

    const newDelete = deleteBtn.cloneNode(true);
    deleteBtn.replaceWith(newDelete);
    const newCancel = cancelBtn.cloneNode(true);
    cancelBtn.replaceWith(newCancel);
    const newEdit = editBtn.cloneNode(true);
    editBtn.replaceWith(newEdit);

    function close() { modal.classList.remove('active'); }

    newDelete.addEventListener('click', () => {
        const tt = getHabitTimetable(state.habitEditorDay);
        if (tt) {
            const idx = tt.plans.findIndex(p => p.id === plan.id);
            if (idx !== -1) tt.plans.splice(idx, 1);
            saveToLocal();
            renderHabitPlanGrid();
            syncDashboardAfterHabitChange();
        }
        close();
    });
    newCancel.addEventListener('click', close);
    newEdit.addEventListener('click', () => {
        // 간단한 인라인 수정: 카테고리 변경만 허용 (시간 범위는 삭제 후 재추가 권장)
        close();
        const sub = prompt('카테고리 ID 변경 (취소 시 빈칸):', plan.subject || '');
        if (sub === null) return;
        plan.subject = sub.trim() || null;
        saveToLocal();
        renderHabitPlanGrid();
        syncDashboardAfterHabitChange();
    });
}

function renderHabitPlanGrid() {
    const tt = getHabitTimetable(state.habitEditorDay);
    const plans = tt?.plans || [];
    buildHabitGrid(document.getElementById('habit-timetable-root'), plans, true);
    buildHabitGrid(document.getElementById('m-habit-timetable-root'), plans, false);
}

// ─── 통합 렌더 ───────────────────────────────────────────────────────

export function renderHabitEditor() {
    renderDayTabs('habit-day-tabs', true);
    renderDayTabs('m-habit-day-tabs', false);
    renderHabitTasks();
    renderHabitPlanGrid();
}

export function setupHabitEditor() {
    const pcAddBtn = document.getElementById('habit-add-task-btn');
    if (pcAddBtn) pcAddBtn.addEventListener('click', () => openHabitTaskModal());
    const mAddBtn = document.getElementById('m-habit-add-task-btn');
    if (mAddBtn) mAddBtn.addEventListener('click', () => openHabitTaskModal());

    const pcClearBtn = document.getElementById('habit-clear-timetable-btn');
    if (pcClearBtn) pcClearBtn.addEventListener('click', clearHabitPlans);
    const mClearBtn = document.getElementById('m-habit-clear-timetable-btn');
    if (mClearBtn) mClearBtn.addEventListener('click', clearHabitPlans);
}

function clearHabitPlans() {
    const tt = getHabitTimetable(state.habitEditorDay);
    if (!tt || tt.plans.length === 0) return;
    if (!confirm(`${HABIT_DAY_LABELS_KO[state.habitEditorDay]} 요일의 습관 플랜을 모두 비우시겠습니까?`)) return;
    tt.plans = [];
    saveToLocal();
    renderHabitPlanGrid();
    syncDashboardAfterHabitChange();
}

window.renderHabitEditor = renderHabitEditor;
window.seedHabitsForDate = seedHabitsForDate;
