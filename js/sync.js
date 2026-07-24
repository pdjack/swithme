// 데이터 동기화 (Phase 3 §2) — 로그인 시 로컬↔클라우드 조정 + 로그인 중 변경 자동 업로드.
// 규칙(B+): 한쪽이 비면 있는 쪽 채택(안 물음), 둘 다 있고 다르면 유저에게 선택 요청.
// 저장 대상은 사용자 생성 데이터 9종. 타이머·뷰 상태는 기기별이라 제외.
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
let reconciling = false;
async function reconcile(uid) {
    if (reconciling) return;
    reconciling = true;
    try {
        const cloud = await fetchCloud(uid);
        const local = readLocalData();
        let action = decideSync(local, cloud);
        if (action === 'conflict') {
            action = await askConflict(localUpdatedAt(), Number(cloud && cloud.updatedAt));
        }
        if (action === 'push') {
            await pushToCloud(uid);
        } else if (action === 'pull') {
            applyCloudToLocal(cloud);
            window.location.reload();
        }
        // noop: 아무것도 안 함
    } catch (err) {
        console.warn('[sync] reconcile 실패:', err && err.message);
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
        pushToCloud(currentUid).catch(err => console.warn('[sync] 업로드 실패:', err && err.message));
    }, PUSH_DEBOUNCE_MS);
}

export function setupSync() {
    if (!isFirebaseConfigured || !auth || !db) return;
    onLocalSave(scheduleCloudPush);
    onAuthStateChanged(auth, (user) => {
        currentUid = user ? user.uid : null;
        if (user) reconcile(user.uid);
    });
}

window.setupSync = setupSync;
