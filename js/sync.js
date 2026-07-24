// 데이터 동기화 (Phase 3 §2) — 로그인 시 로컬↔클라우드 조정 + 로그인 중 변경 자동 업로드.
// 규칙(B+): 한쪽이 비면 있는 쪽 채택(안 물음), 둘 다 있고 다르면 유저에게 선택 요청.
// 저장 대상은 사용자 생성 데이터 9종. 타이머·뷰 상태는 기기별이라 제외.
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, isFirebaseConfigured } from './firebase.js';
import { state, onLocalSave, DATA_UPDATED_AT_KEY } from './store.js';

// 동기화 필드 ↔ localStorage 키 매핑 (store.js flushSave와 일치, 타이머 제외).
const LS_KEYS = {
    tasks: 'switme_tasks',
    timetables: 'switme_timetables',
    activeTimetableId: 'switme_active_timetable_id',
    subjects: 'switme_subjects',
    reflectionItems: 'switme_reflection_items',
    reflections: 'switme_reflections',
    analysisResults: 'switme_analysis',
    habits: 'switme_habits',
    habitSeedLog: 'switme_habit_seed_log',
};
const SYNC_FIELDS = Object.keys(LS_KEYS);
const SCHEMA_VERSION = 1;

// ── 동기화 상태 알림 (UI 가시화) ────────────────────────────────────
// 조용한 실패(네트워크·권한·1MB 초과)를 사용자에게 노출. auth.js 계정 패널이 수신.
// state: 'syncing' | 'synced' | 'error' | 'offline'
function emitSyncStatus(status) {
    window.dispatchEvent(new window.CustomEvent('sync-status', { detail: { state: status } }));
}

// ── 순수 판정 로직 (유닛테스트 대상) ────────────────────────────────
// 사용자가 실제로 만든 콘텐츠가 하나도 없으면 "비었다"로 본다.
// subjects·reflectionItems는 기본값이 있어 판정에서 제외(빈 여부의 근거로 안 씀).
export function isEmptyData(d) {
    if (!d || typeof d !== 'object') return true;
    const hasTasks = Array.isArray(d.tasks) && d.tasks.length > 0;
    const hasReflections = d.reflections && Object.keys(d.reflections).length > 0;
    const hasAnalysis = Array.isArray(d.analysisResults) && d.analysisResults.length > 0;
    const hasHabits = d.habits && Object.keys(d.habits).length > 0;
    const hasTimetableContent = Array.isArray(d.timetables) && d.timetables.some(
        t => (Array.isArray(t.history) && t.history.length > 0) || (Array.isArray(t.plans) && t.plans.length > 0)
    );
    return !(hasTasks || hasReflections || hasAnalysis || hasHabits || hasTimetableContent);
}

export function dataEqual(a, b) {
    return serialize(a) === serialize(b);
    function serialize(d) {
        if (!d) return '';
        return JSON.stringify(SYNC_FIELDS.map(k => d[k] ?? null));
    }
}

// 로그인 시 로컬·클라우드 데이터를 비교해 무엇을 할지 결정.
export function decideSync(local, cloud) {
    const localEmpty = isEmptyData(local);
    const cloudEmpty = isEmptyData(cloud);
    if (localEmpty && cloudEmpty) return 'noop';
    if (cloudEmpty && !localEmpty) return 'push';
    if (localEmpty && !cloudEmpty) return 'pull';
    return dataEqual(local, cloud) ? 'noop' : 'conflict';
}

// ── 로컬 데이터 직렬화/역적용 ───────────────────────────────────────
function readLocalData() {
    const d = {};
    for (const f of SYNC_FIELDS) {
        if (f === 'activeTimetableId') {
            d[f] = state.activeTimetableId ?? null;
        } else {
            d[f] = state[f];
        }
    }
    return d;
}

// 클라우드 데이터를 localStorage에 기록. 적용 후 새로고침으로 전체 화면 일관 반영.
function applyCloudToLocal(cloud) {
    for (const f of SYNC_FIELDS) {
        const key = LS_KEYS[f];
        if (f === 'activeTimetableId') {
            if (cloud[f] !== null && cloud[f] !== undefined) localStorage.setItem(key, String(cloud[f]));
        } else {
            localStorage.setItem(key, JSON.stringify(cloud[f] ?? (Array.isArray(state[f]) ? [] : {})));
        }
    }
    const ts = Number(cloud.updatedAt);
    localStorage.setItem(DATA_UPDATED_AT_KEY, String(Number.isFinite(ts) ? ts : Date.now()));
}

function localUpdatedAt() {
    const raw = Number(localStorage.getItem(DATA_UPDATED_AT_KEY));
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

// ── Firestore 입출력 ────────────────────────────────────────────────
function userDocRef(uid) {
    return doc(db, 'users', uid);
}

async function pushToCloud(uid) {
    const payload = { ...readLocalData(), updatedAt: localUpdatedAt() || Date.now(), schemaVersion: SCHEMA_VERSION };
    await setDoc(userDocRef(uid), payload);
}

async function fetchCloud(uid) {
    const snap = await getDoc(userDocRef(uid));
    return snap.exists() ? snap.data() : null;
}

// 계정 삭제 시 클라우드 문서 제거. 인증이 살아있을 때(계정 삭제 전) 호출해야 규칙 통과.
// 이미 없으면 조용히 통과(멱등). auth.js deleteAccount가 계정 삭제 직전 호출.
export async function deleteCloudData(uid) {
    if (!db || !uid) return;
    await deleteDoc(userDocRef(uid));
}

// ── 충돌 선택 창 (양쪽 셸 공용, 화면 중앙 오버레이) ────────────────
function formatWhen(ms) {
    if (!ms) return '기록 없음';
    const d = new Date(ms);
    const now = new Date();
    const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const sameDay = d.toDateString() === now.toDateString();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    if (sameDay) return `오늘 ${hhmm}`;
    if (isYesterday) return `어제 ${hhmm}`;
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${hhmm}`;
}

// 사용자가 "이 기기 데이터 쓰기"(push) 또는 "저장된 기록 불러오기"(pull) 선택.
function askConflict(localMs, cloudMs) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'sync-conflict-overlay';
        overlay.innerHTML = `
            <div class="sync-conflict-card glass-card">
                <h3 class="sync-conflict-title">데이터가 다릅니다</h3>
                <p class="sync-conflict-desc">이 기기와 계정에 저장된 데이터가 다릅니다. 어느 것을 사용할까요?</p>
                <ul class="sync-conflict-meta">
                    <li>• 이 기기: ${formatWhen(localMs)} 수정</li>
                    <li>• 저장된 기록: ${formatWhen(cloudMs)} 저장</li>
                </ul>
                <div class="sync-conflict-btns">
                    <button class="sync-use-local">이 기기 데이터 쓰기</button>
                    <button class="sync-use-cloud">저장된 기록 불러오기</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        const close = (choice) => { overlay.remove(); resolve(choice); };
        overlay.querySelector('.sync-use-local').addEventListener('click', () => close('push'));
        overlay.querySelector('.sync-use-cloud').addEventListener('click', () => close('pull'));
    });
}

// ── 로그인 시 조정 ─────────────────────────────────────────────────
// 조정은 브라우저 세션당 1회만. 앱 로딩 시 데이터 정규화(날짜 채움·습관 시드)로
// 로컬이 미세 변형되므로, pull 후 새로고침하면 재조정이 또 "다름"을 만들어 충돌 창이
// 무한 반복된다. 세션 플래그로 1회 제한하고, 이후엔 정규화된 로컬을 업로드해 수렴시킨다.
const SYNC_SESSION_KEY = 'switme_synced_session';
let reconciling = false;

// ── 게스트/로그인 데이터 분리 ──────────────────────────────────────
// 게스트와 계정이 같은 localStorage를 공유하므로, 로그아웃해도 계정 데이터가
// 게스트에 남는 누수가 있었다. 로그인 순간 게스트 상태를 세션에 스냅샷해 두고,
// 로그아웃 시 그 스냅샷으로 되돌린다(스냅샷 없으면 게스트를 빈 상태로).
const GUEST_SNAPSHOT_KEY = 'switme_guest_snapshot';
const SNAPSHOT_LS_KEYS = [...Object.values(LS_KEYS), DATA_UPDATED_AT_KEY];

// 게스트→로그인 전환 시 1회만 저장(pull 새로고침 넘어 유지되도록 이미 있으면 보존).
function saveGuestSnapshot() {
    if (sessionStorage.getItem(GUEST_SNAPSHOT_KEY) !== null) return;
    const snap = {};
    for (const k of SNAPSHOT_LS_KEYS) snap[k] = localStorage.getItem(k);
    try { sessionStorage.setItem(GUEST_SNAPSHOT_KEY, JSON.stringify(snap)); } catch { /* noop */ }
}

function clearSyncKeys() {
    for (const k of SNAPSHOT_LS_KEYS) localStorage.removeItem(k);
}

// 로그아웃 시: 스냅샷 복원(계정 데이터 제거) 후 새로고침으로 메모리 상태까지 게스트로 재초기화.
function restoreGuestAndReload() {
    const raw = sessionStorage.getItem(GUEST_SNAPSHOT_KEY);
    if (raw !== null) {
        try {
            const snap = JSON.parse(raw);
            for (const k of SNAPSHOT_LS_KEYS) {
                const v = snap[k];
                if (v === null || v === undefined) localStorage.removeItem(k);
                else localStorage.setItem(k, v);
            }
        } catch { clearSyncKeys(); }
        sessionStorage.removeItem(GUEST_SNAPSHOT_KEY);
    } else {
        clearSyncKeys(); // 스냅샷 없음(로그인 상태로 앱 재시작 등) → 게스트 빈 상태
    }
    window.location.reload();
}

async function reconcile(uid) {
    if (reconciling) return;
    // 이 세션서 이미 조정 완료 → 재질문·루프 방지. 정규화된 로컬만 올려 클라우드 수렴.
    if (sessionStorage.getItem(SYNC_SESSION_KEY) === uid) {
        scheduleCloudPush();
        return;
    }
    reconciling = true;
    try {
        const cloud = await fetchCloud(uid);
        const local = readLocalData();
        let action = decideSync(local, cloud);
        if (action === 'conflict') {
            action = await askConflict(localUpdatedAt(), Number(cloud && cloud.updatedAt));
        }
        if (action === 'pull') {
            applyCloudToLocal(cloud);
            sessionStorage.setItem(SYNC_SESSION_KEY, uid); // 새로고침 후 재조정 스킵
            window.location.reload();
            return;
        }
        // push·noop: 이 세션 조정 완료 표시 후 클라우드를 현재 로컬로 맞춤
        sessionStorage.setItem(SYNC_SESSION_KEY, uid);
        if (action === 'push') {
            emitSyncStatus('syncing');
            await pushToCloud(uid);
        }
        emitSyncStatus('synced');
    } catch (err) {
        console.warn('[sync] reconcile 실패:', err && err.message);
        emitSyncStatus(navigator.onLine ? 'error' : 'offline');
    } finally {
        reconciling = false;
    }
}

// ── 로그인 중 변경 자동 업로드 (디바운스) ──────────────────────────
let currentUid = null;
let pushTimerId = null;
const PUSH_DEBOUNCE_MS = 2000;

function scheduleCloudPush() {
    if (!currentUid) return;
    if (pushTimerId) clearTimeout(pushTimerId);
    pushTimerId = setTimeout(() => {
        emitSyncStatus('syncing');
        pushToCloud(currentUid)
            .then(() => emitSyncStatus('synced'))
            .catch(err => {
                console.warn('[sync] 업로드 실패:', err && err.message);
                emitSyncStatus(navigator.onLine ? 'error' : 'offline');
            });
    }, PUSH_DEBOUNCE_MS);
}

export function setupSync() {
    if (!isFirebaseConfigured || !auth || !db) return;
    onLocalSave(scheduleCloudPush);
    let wasSignedIn = false;
    let sawGuest = false;
    onAuthStateChanged(auth, (user) => {
        currentUid = user ? user.uid : null;
        if (user) {
            // 게스트 상태를 실제로 거쳐 로그인한 경우에만 게스트 데이터를 스냅샷.
            // (로그인 상태로 앱을 재시작한 경우엔 로컬이 계정 데이터라 스냅샷 대상 아님)
            if (sawGuest) saveGuestSnapshot();
            wasSignedIn = true;
            reconcile(user.uid);
        } else {
            sawGuest = true;
            sessionStorage.removeItem(SYNC_SESSION_KEY); // 다음 로그인 때 재조정
            if (wasSignedIn) {
                // 로그인→로그아웃 전환: 게스트로 복원 후 새로고침
                wasSignedIn = false;
                restoreGuestAndReload();
            }
        }
    });
}

window.setupSync = setupSync;
