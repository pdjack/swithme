// 계정·로그인 (Phase 3 §1) — 인증만 담당. 데이터 동기화는 §2에서 붙는다.
// 게스트 모드 유지: 로그인 안 하면 기존과 100% 동일하게 로컬 사용(회귀 방지).
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    deleteUser,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase.js';

// 로그인 실패 메시지 한글화 (자주 나오는 것만).
function authErrorMessage(err) {
    const code = err && err.code ? err.code : '';
    const map = {
        'auth/invalid-email': '이메일 형식이 올바르지 않습니다.',
        'auth/user-not-found': '가입되지 않은 이메일입니다.',
        'auth/wrong-password': '비밀번호가 틀렸습니다.',
        'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
        'auth/email-already-in-use': '이미 가입된 이메일입니다.',
        'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
        'auth/operation-not-allowed': '이메일 로그인이 아직 활성화되지 않았습니다. 관리자에게 문의하세요.',
        'auth/network-request-failed': '네트워크 오류입니다. 연결을 확인해 주세요.',
        'auth/popup-closed-by-user': '로그인 창이 닫혔습니다.',
        'auth/requires-recent-login': '보안을 위해 다시 로그인한 뒤 계정 삭제를 진행해 주세요.',
    };
    return map[code] || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

const MIN_PASSWORD_LENGTH = 6;

// 입력값 사전 검증 — Firebase 호출 전에 명확한 안내를 보장(무반응 방지).
function validateCredentials(email, password) {
    if (!email || !password) return '이메일과 비밀번호를 모두 입력해 주세요.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '이메일 형식이 올바르지 않습니다.';
    if (password.length < MIN_PASSWORD_LENGTH) return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
    return '';
}

// 아래 email 함수들은 실패 시 에러 문구를 반환한다(성공은 빈 문자열). 호출부가 인라인 표시.
async function loginWithGoogle() {
    try {
        await signInWithPopup(auth, new GoogleAuthProvider());
        return '';
    } catch (err) {
        return authErrorMessage(err);
    }
}

async function loginWithEmail(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        return '';
    } catch (err) {
        return authErrorMessage(err);
    }
}

async function signupWithEmail(email, password) {
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        return '';
    } catch (err) {
        return authErrorMessage(err);
    }
}

async function logout() {
    try {
        await signOut(auth);
    } catch (err) {
        alert(authErrorMessage(err));
    }
}

// 계정 삭제 (스토어 필수 요건 §5-3). 되돌릴 수 없음 — 이중 확인.
async function deleteAccount() {
    const user = auth && auth.currentUser;
    if (!user) return;
    if (!confirm('계정을 삭제하면 클라우드에 저장된 데이터가 모두 사라집니다. 되돌릴 수 없습니다. 계속할까요?')) return;
    try {
        await deleteUser(user);
        alert('계정이 삭제되었습니다.');
    } catch (err) {
        alert(authErrorMessage(err));
    }
}

// ── UI 렌더 ─────────────────────────────────────────────
// 로그인 상태에 따라 계정 패널 내용을 채운다. PC·모바일 양쪽 셸 대상.
function accountPanelHTML(user) {
    if (user) {
        const label = user.email || user.displayName || '로그인됨';
        return `
            <div class="account-signed-in">
                <p class="account-status">✓ 로그인됨</p>
                <p class="account-email">${label}</p>
                <button class="account-logout-btn ghost-btn">로그아웃</button>
                <hr class="account-divider" />
                <p class="account-danger-label">⚠ 계정 삭제 (되돌릴 수 없음)</p>
                <p class="account-danger-desc">클라우드에 저장된 데이터가 모두 삭제됩니다.</p>
                <button class="account-delete-btn danger-btn">계정 삭제</button>
            </div>`;
    }
    return `
        <div class="account-signed-out">
            <p class="account-status">로그인 안 됨 (게스트)</p>
            <p class="account-hint">로그인하면 다른 기기와 자동 백업·동기화됩니다.</p>
            <button class="account-google-btn ghost-btn">G  구글로 계속하기</button>
            <div class="account-divider-text">— 또는 이메일 —</div>
            <input type="email" class="account-email-input" placeholder="이메일" autocomplete="email" />
            <input type="password" class="account-password-input" placeholder="비밀번호 (6자 이상)" autocomplete="current-password" />
            <div class="account-email-btns">
                <button class="account-login-btn ghost-btn">로그인</button>
                <button class="account-signup-btn ghost-btn">회원가입</button>
            </div>
            <p class="account-msg" role="alert"></p>
        </div>`;
}

function readCredentials(panel) {
    const email = panel.querySelector('.account-email-input')?.value.trim() || '';
    const password = panel.querySelector('.account-password-input')?.value || '';
    return { email, password };
}

// 인라인 안내문 표시 — 성공 시 초록, 실패 시 빨강. alert보다 확실히 보인다(무반응 방지).
function showMsg(panel, text, kind = 'error') {
    const el = panel.querySelector('.account-msg');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('is-error', kind === 'error');
    el.classList.toggle('is-info', kind === 'info');
}

// 이메일 로그인·회원가입 공통 흐름: 사전 검증 → 진행중 표시 → Firebase 호출 → 결과 표시.
async function runEmailAction(panel, action, workingText) {
    const { email, password } = readCredentials(panel);
    const invalid = validateCredentials(email, password);
    if (invalid) return showMsg(panel, invalid, 'error');
    showMsg(panel, workingText, 'info');
    const errorText = await action(email, password);
    // 성공 시 onAuthStateChanged가 패널을 로그인 화면으로 재렌더하므로 여기선 실패만 표시.
    if (errorText) showMsg(panel, errorText, 'error');
}

function bindPanel(panel, user) {
    if (!panel) return;
    panel.innerHTML = accountPanelHTML(user);

    if (user) {
        panel.querySelector('.account-logout-btn')?.addEventListener('click', logout);
        panel.querySelector('.account-delete-btn')?.addEventListener('click', deleteAccount);
        return;
    }
    panel.querySelector('.account-google-btn')?.addEventListener('click', async () => {
        showMsg(panel, '구글 로그인 창을 여는 중…', 'info');
        const errorText = await loginWithGoogle();
        if (errorText) showMsg(panel, errorText, 'error');
    });
    panel.querySelector('.account-login-btn')?.addEventListener('click', () =>
        runEmailAction(panel, loginWithEmail, '로그인 중…')
    );
    panel.querySelector('.account-signup-btn')?.addEventListener('click', () =>
        runEmailAction(panel, signupWithEmail, '회원가입 중…')
    );
}

function renderAccountPanels(user) {
    bindPanel(document.getElementById('settings-tab-account'), user);
    bindPanel(document.getElementById('m-settings-tab-account'), user);
}

export function setupAuth() {
    // Firebase 미설정(.env 없음) 시 게스트 모드로만 동작 — 계정 패널은 로그아웃 화면 고정.
    if (!isFirebaseConfigured || !auth) {
        renderAccountPanels(null);
        return;
    }
    onAuthStateChanged(auth, (user) => {
        renderAccountPanels(user);
    });
}

window.setupAuth = setupAuth;
