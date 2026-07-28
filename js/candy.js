// 사탕(토큰) 시스템 — Phase 3 §4-A. BM: 토큰제 Freemium (PRD §9-7).
//
// [게이팅 스위치]
//   CANDY_GATING_ENABLED = false 인 동안 분석은 전부 무료로 열리고 사탕 UI는 숨는다.
//   사탕 지급·병합·저장 로직은 스위치와 무관하게 항상 동작하므로, 스위치를 켜는 순간
//   유저는 그동안 쌓인 무료 사탕을 그대로 보유한 상태로 시작한다.
//   스위치를 켤 때 함께 해야 할 일은 docs/phase3-할일.md §4-A '게이팅 스위치 ON 체크리스트' 참조.
//
// [사탕 두 종류]
//   free : 매달 자동 지급되는 무료 사탕. 같은 달 중복 지급 금지.
//   paid : 광고·구독·토큰팩으로 얻은 사탕. 유저가 값을 치른 것이라 소멸 불가.
//   소비 시 free 를 먼저 깎는다(구매분이 오래 남도록).
//
// [게스트 → 로그인 이관 규칙]
//   free : 큰 쪽만 남김(MAX). 같은 달 지급분이 게스트·계정 양쪽에 있어 합치면 중복이 된다.
//   paid : 합산(SUM). 실제 지불분이라 어느 쪽도 버릴 수 없다.
//   이관 후 게스트 잔량은 0 (복사가 아니라 이동).
import { icon } from './icons.js';
import { saveToLocal, localDateKey } from './store.js';

// ── 스위치 ──────────────────────────────────────────────────────────
// 획득 라인(광고·구독·토큰팩)이 스토어 출시 후에야 열리므로, 그전까지 켜면
// 분석이 월 1회로 잠긴다. 출시 후 §4-B·§4-C 완료 시점에 true 로 바꾼다.
export const CANDY_GATING_ENABLED = false;

export const CANDY_LS_KEY = 'switme_candy';

// 기간별 가격 (PRD §9-7 초안 + 14일·직접선택 확정분)
export const CANDY_COST_TABLE = [
    { maxDays: 7, cost: 1 },
    { maxDays: 14, cost: 2 },
    { maxDays: 30, cost: 3 },
    { maxDays: Infinity, cost: 5 },
];

// ── 순수 로직 (유닛테스트 대상) ─────────────────────────────────────
export function emptyCandy() {
    return { free: 0, paid: 0, lastGrantMonth: null, unlocks: {} };
}

export function normalizeCandy(raw) {
    const base = emptyCandy();
    if (!raw || typeof raw !== 'object') return base;
    const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);
    return {
        free: num(raw.free),
        paid: num(raw.paid),
        lastGrantMonth: typeof raw.lastGrantMonth === 'string' ? raw.lastGrantMonth : null,
        unlocks: raw.unlocks && typeof raw.unlocks === 'object' ? { ...raw.unlocks } : {},
    };
}

export function candyTotal(candy) {
    const c = normalizeCandy(candy);
    return c.free + c.paid;
}

export function monthKeyOf(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// 기간 → 가격. period: { mode:'preset', days } | { mode:'custom', startKey, endKey }
export function periodDayCount(period) {
    if (!period) return 0;
    if (period.mode === 'custom') {
        const start = new Date(period.startKey);
        const end = new Date(period.endKey);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return 0;
        return Math.floor((end - start) / 86400000) + 1;
    }
    return Number(period.days) || 0;
}

export function periodCandyCost(period) {
    const days = periodDayCount(period);
    if (days <= 0) return 0;
    return CANDY_COST_TABLE.find(row => days <= row.maxDays).cost;
}

// 같은 기간을 같은 날 다시 보는 건 무료 — 탭 이동·새로고침마다 깎이는 걸 막는다.
export function unlockKeyOf(period, dateKey) {
    if (!period) return '';
    if (period.mode === 'custom') return `${dateKey}|c:${period.startKey}~${period.endKey}`;
    return `${dateKey}|p:${period.days}`;
}

export function isUnlocked(candy, period, dateKey) {
    return Boolean(normalizeCandy(candy).unlocks[unlockKeyOf(period, dateKey)]);
}

// 매달 무료 사탕 1개 지급. 같은 달엔 몇 번 호출해도 1개만(멱등).
export function grantMonthlyCandy(candy, monthKey) {
    const c = normalizeCandy(candy);
    if (c.lastGrantMonth === monthKey) return c;
    return { ...c, free: c.free + 1, lastGrantMonth: monthKey };
}

// 무료분 먼저 차감. 잔량 부족이면 null (호출부가 획득 안내를 띄운다).
export function spendCandy(candy, cost, unlockKey) {
    const c = normalizeCandy(candy);
    if (cost <= 0) return c;
    if (c.free + c.paid < cost) return null;
    const fromFree = Math.min(c.free, cost);
    const next = {
        ...c,
        free: c.free - fromFree,
        paid: c.paid - (cost - fromFree),
        unlocks: { ...c.unlocks },
    };
    if (unlockKey) next.unlocks[unlockKey] = true;
    return next;
}

// 오늘 이전 해제 기록은 버린다(무한 누적 방지).
export function pruneUnlocks(candy, todayKey) {
    const c = normalizeCandy(candy);
    const kept = {};
    for (const k of Object.keys(c.unlocks)) {
        if (k.startsWith(`${todayKey}|`)) kept[k] = true;
    }
    return { ...c, unlocks: kept };
}

// 게스트 → 계정 이관. free=MAX, paid=SUM, 지급월은 더 나중 것.
export function mergeCandyFromGuest(guestCandy, cloudCandy) {
    const g = normalizeCandy(guestCandy);
    const c = normalizeCandy(cloudCandy);
    const laterMonth = [g.lastGrantMonth, c.lastGrantMonth]
        .filter(Boolean)
        .sort()
        .pop() || null;
    return {
        free: Math.max(g.free, c.free),
        paid: g.paid + c.paid,
        lastGrantMonth: laterMonth,
        unlocks: { ...c.unlocks, ...g.unlocks },
    };
}

// 이관 후 게스트에 남길 값 — 잔량만 0, 지급월·해제기록은 유지(같은 달 재지급 방지).
export function drainedGuestCandy(candy) {
    const c = normalizeCandy(candy);
    return { free: 0, paid: 0, lastGrantMonth: c.lastGrantMonth, unlocks: { ...c.unlocks } };
}

// ── 저장소 입출력 ───────────────────────────────────────────────────
export function readCandy() {
    try {
        return normalizeCandy(JSON.parse(localStorage.getItem(CANDY_LS_KEY)));
    } catch {
        return emptyCandy();
    }
}

// persist=false 는 sync 등 외부에서 이미 저장 흐름을 제어할 때 사용.
export function writeCandy(candy, { notify = true } = {}) {
    const c = normalizeCandy(candy);
    try {
        localStorage.setItem(CANDY_LS_KEY, JSON.stringify(c));
    } catch {
        /* noop */
    }
    if (notify) saveToLocal(); // 로컬 저장 구독자(클라우드 업로드) 깨우기
    renderCandyBadges();
    return c;
}

// ── UI ──────────────────────────────────────────────────────────────
const BADGE_IDS = ['candy-balance-badge', 'm-candy-balance-badge'];
const LOCK_IDS = ['analysis-lock', 'm-analysis-lock'];
const DASHBOARD_IDS = ['analysis-dashboard', 'm-analysis-dashboard'];

export function renderCandyBadges() {
    const total = candyTotal(readCandy());
    BADGE_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (!CANDY_GATING_ENABLED) {
            el.style.display = 'none';
            return;
        }
        el.style.display = '';
        el.innerHTML = `${icon('candy', 15)}<span class="candy-count">${total}</span>`;
        el.title = `보유 사탕 ${total}개`;
    });
}

// 기간 버튼에 가격 표시. 스위치 OFF면 아무것도 안 붙는다.
export function refreshPeriodCostLabels() {
    document.querySelectorAll('.period-btn').forEach(btn => {
        const old = btn.querySelector('.period-cost');
        if (old) old.remove();
        if (!CANDY_GATING_ENABLED) return;
        const raw = btn.dataset.period;
        if (raw === 'custom') return;
        const cost = periodCandyCost({ mode: 'preset', days: Number(raw) });
        const span = document.createElement('span');
        span.className = 'period-cost';
        span.innerHTML = `${icon('candy', 12)}${cost}`;
        btn.appendChild(span);
    });
}

function setDashboardVisible(visible) {
    DASHBOARD_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = visible ? '' : 'none';
    });
}

// 잠금 카드 표시. period 가 null 이면 잠금 해제 상태로 되돌린다.
export function renderCandyLock(period) {
    if (!period) {
        LOCK_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        setDashboardVisible(true);
        return;
    }
    const cost = periodCandyCost(period);
    const total = candyTotal(readCandy());
    const enough = total >= cost;
    const days = periodDayCount(period);
    setDashboardVisible(false);
    LOCK_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = '';
        el.innerHTML = `
            <div class="candy-lock-card glass-card">
                <div class="candy-lock-icon">${icon('candy', 28)}</div>
                <h3 class="candy-lock-title">${days}일 분석 열기</h3>
                <p class="candy-lock-desc">사탕 ${cost}개를 사용하면 오늘 하루 이 기간 분석을 몇 번이든 다시 볼 수 있어요.</p>
                <p class="candy-lock-balance">보유 사탕 <strong>${total}</strong>개</p>
                ${enough
                    ? `<button type="button" class="candy-unlock-btn">사탕 ${cost}개 쓰고 열기</button>`
                    : `<button type="button" class="candy-get-btn">사탕 얻는 방법</button>`}
            </div>`;
    });
}

// 획득 안내 — 광고·구독·토큰팩은 스토어 출시 후 열린다(§4-B·§4-C).
export function openCandyShortageModal(period) {
    const cost = periodCandyCost(period);
    const total = candyTotal(readCandy());
    const overlay = document.createElement('div');
    overlay.className = 'candy-modal-overlay';
    overlay.innerHTML = `
        <div class="candy-modal-card glass-card">
            <h3 class="candy-modal-title">사탕이 부족해요</h3>
            <p class="candy-modal-desc">${periodDayCount(period)}일 분석에 사탕 ${cost}개가 필요해요. 지금 ${total}개 있어요.</p>
            <ul class="candy-modal-ways">
                <li>${icon('candy', 14)} 매달 1개가 자동으로 들어와요</li>
                <li>${icon('candy', 14)} 광고 보고 받기 <em>준비 중</em></li>
                <li>${icon('candy', 14)} 사탕 꾸러미 구매 <em>준비 중</em></li>
                <li>${icon('candy', 14)} 구독하고 매달 받기 <em>준비 중</em></li>
            </ul>
            <button type="button" class="candy-modal-close">닫기</button>
        </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('.candy-modal-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

// ── 앱 진입 시 1회 ──────────────────────────────────────────────────
export function setupCandy() {
    const today = localDateKey(new Date());
    let candy = pruneUnlocks(readCandy(), today);
    candy = grantMonthlyCandy(candy, monthKeyOf(new Date()));
    writeCandy(candy, { notify: false });
    refreshPeriodCostLabels();
    renderCandyBadges();
}

window.setupCandy = setupCandy;
