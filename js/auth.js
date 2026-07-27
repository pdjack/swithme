// 계정·로그인 (Phase 3 §1) — 인증만 담당. 데이터 동기화는 §2에서 붙는다.
// 게스트 모드 유지: 로그인 안 하면 기존과 100% 동일하게 로컬 사용(회귀 방지).
import {
    GoogleAuthProvider,
    EmailAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    getAdditionalUserInfo,
    updatePassword,
    signOut,
    onAuthStateChanged,
    deleteUser,
    reauthenticateWithPopup,
    reauthenticateWithCredential,
    sendEmailVerification,
    sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase.js';
import { deleteCloudData } from './sync.js';
import { showNoticeModal, showPromptModal } from './modal.js';

// 로그인 실패 메시지 한글화 (자주 나오는 것만).
function authErrorMessage(err) {
    const code = err && err.code ? err.code : '';
    const map = {
        'auth/invalid-email': '이메일 형식이 올바르지 않습니다.',
        'auth/user-not-found': '가입되지 않은 이메일입니다. 회원가입을 먼저 해 주세요.',
        'auth/wrong-password': '비밀번호가 틀렸습니다.',
        'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
        'auth/email-already-in-use': '이미 가입된 메일이에요. 로그인해 주세요.',
        'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
        // 가입 링크는 1회용이며 유효기간이 있다. 만료·재사용 시 여기로 온다.
        'auth/invalid-action-code': '가입 링크가 만료되었거나 이미 사용됐어요. 회원가입을 다시 요청해 주세요.',
        'auth/expired-action-code': '가입 링크의 유효기간이 지났어요. 회원가입을 다시 요청해 주세요.',
        'auth/invalid-email-verification': '가입을 요청한 이메일과 다릅니다. 링크를 받은 이메일을 입력해 주세요.',
        'auth/operation-not-allowed': '이메일 로그인이 아직 활성화되지 않았습니다. 관리자에게 문의하세요.',
        'auth/network-request-failed': '네트워크 오류입니다. 연결을 확인해 주세요.',
        'auth/unauthorized-domain': '이 도메인은 로그인이 허용되지 않았습니다. (Firebase 승인된 도메인에 추가 필요)',
        'auth/popup-blocked': '팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도해 주세요.',
        'auth/popup-closed-by-user': '로그인 창이 닫혔습니다.',
        'auth/requires-recent-login': '보안을 위해 다시 로그인한 뒤 계정 삭제를 진행해 주세요.',
    };
    // 미매핑 코드는 원인 추적 위해 콘솔에 실제 코드 노출(사용자 문구는 일반 안내).
    if (code && !map[code]) console.warn('[auth] 미처리 에러 코드:', code, err && err.message);
    return map[code] || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

// 배포 버전 표시 — 계정 탭 하단에 노출. 캐시/구버전 판별용(새 배포마다 갱신).
const APP_BUILD = 'v2026-07-27-a';

// 가입 링크를 요청한 이메일 보관 키 — 링크 클릭 시 같은 브라우저면 재입력 없이 완료된다.
const SIGNUP_EMAIL_KEY = 'swithme:signupEmail';

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 로그아웃 화면으로 재렌더된 직후 한 번 띄울 인라인 안내 — {text, kind}.
// 미인증 로그인 거부(빨강)처럼 세션이 끊긴 뒤 메시지를 전달할 때 쓴다.
// (회원가입 성공은 인라인 대신 중앙 팝업 showNoticeModal로 안내한다.)
let pendingNotice = null;

// 입력값 사전 검증 — Firebase 호출 전에 명확한 안내를 보장(무반응 방지).
function validateCredentials(email, password) {
    if (!email || !password) return '이메일과 비밀번호를 모두 입력해 주세요.';
    if (!EMAIL_PATTERN.test(email)) return '이메일 형식이 올바르지 않습니다.';
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
        const cred = await signInWithEmailAndPassword(auth, email, password);
        // 이메일 인증 강제: 미인증 계정은 로그인 거부 + 인증메일 재발송 후 로그아웃.
        // 링크 가입(§1-10)·구글 계정은 항상 인증 상태라 이 경로에 안 걸린다.
        // 남는 대상은 옛 비밀번호 가입 방식으로 만들어진 기존 계정뿐이다(방어용 유지).
        if (!cred.user.emailVerified) {
            try {
                await sendEmailVerification(cred.user);
            } catch (e) {
                console.warn('[auth] 인증 메일 재발송 실패:', e && e.message);
            }
            pendingNotice = { text: '이메일 인증 후 로그인해 주세요. 인증 메일을 다시 보냈어요.', kind: 'error' };
            await signOut(auth);
            return '';
        }
        return '';
    } catch (err) {
        return authErrorMessage(err);
    }
}

// ── 회원가입 = 이메일 링크 방식 (§1-10) ──────────────────
// 핵심: 링크를 보내는 시점에는 계정이 만들어지지 않는다. 유저가 메일 링크를 눌러야
// 그 순간 계정이 최초 생성되며(이미 인증된 상태), 안 누르면 Firebase에 흔적이 남지 않는다.
// 덕분에 "미인증 방치 계정"이라는 상태 자체가 존재하지 않고, 같은 메일로 언제든 재요청 가능하다.

// 링크 클릭 시 돌아올 주소. Firebase 승인된 도메인이어야 한다(swithme.app · localhost).
function emailLinkSettings() {
    return {
        url: window.location.origin + window.location.pathname,
        handleCodeInApp: true,
    };
}

function storeSignupEmail(email) {
    // 프라이빗 모드 등 저장 불가 환경에서도 진행은 가능해야 한다(링크 열 때 재입력받음).
    try {
        localStorage.setItem(SIGNUP_EMAIL_KEY, email);
    } catch (e) {
        console.warn('[auth] 가입 이메일 임시 저장 실패:', e && e.message);
    }
}

function readSignupEmail() {
    try {
        return localStorage.getItem(SIGNUP_EMAIL_KEY) || '';
    } catch {
        return '';
    }
}

function clearSignupEmail() {
    try {
        localStorage.removeItem(SIGNUP_EMAIL_KEY);
    } catch {
        /* 저장소 접근 불가 — 무시해도 흐름에 영향 없음 */
    }
}

// 주소창에서 1회용 링크 파라미터 제거 — 새로고침 시 만료된 코드로 재시도하는 것을 막는다.
function stripEmailLinkFromUrl() {
    try {
        window.history.replaceState({}, '', window.location.origin + window.location.pathname);
    } catch (e) {
        console.warn('[auth] 주소 정리 실패:', e && e.message);
    }
}

async function requestSignupLink(email) {
    try {
        await sendSignInLinkToEmail(auth, email, emailLinkSettings());
        storeSignupEmail(email);
        await showNoticeModal({
            title: '가입 링크를 보냈어요',
            message: `${email} 로 가입 링크를 보냈어요. 메일 속 링크를 누르면 계정이 만들어집니다. 링크를 누르기 전까지는 계정이 만들어지지 않으니, 안 왔으면 스팸함을 확인한 뒤 다시 요청해 주세요.`,
        });
        return '';
    } catch (err) {
        return authErrorMessage(err);
    }
}

// 가입 링크로 처음 들어온 계정에 로그인용 비밀번호를 정하게 한다.
// 건너뛰어도 계정은 살아있고, 다음 로그인은 "비밀번호를 잊으셨나요?"로 정할 수 있다(막다른 길 금지).
async function setInitialPassword(user) {
    const password = await showPromptModal({
        title: '가입 완료 — 비밀번호를 정해주세요',
        message: '다음부터 이메일과 비밀번호로 로그인합니다.',
        placeholder: `비밀번호 (${MIN_PASSWORD_LENGTH}자 이상)`,
        inputType: 'password',
        okText: '시작하기',
        cancelText: '나중에',
        validate: v => (v.length >= MIN_PASSWORD_LENGTH ? '' : `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`),
    });
    if (!password) {
        await showNoticeModal({
            title: '비밀번호 없이 시작합니다',
            message: '지금은 로그인된 상태라 그대로 쓰시면 됩니다. 다음에 로그인할 때는 로그인 화면의 "비밀번호를 잊으셨나요?"로 비밀번호를 정해 주세요.',
        });
        return;
    }
    try {
        await updatePassword(user, password);
    } catch (err) {
        await showNoticeModal({
            title: '비밀번호를 저장하지 못했어요',
            message: `${authErrorMessage(err)} 로그인 화면의 "비밀번호를 잊으셨나요?"로 다시 정할 수 있어요.`,
        });
    }
}

// 앱 진입 시 주소가 가입 링크인지 확인하고, 맞으면 계정 생성(=최초 로그인)을 완료한다.
async function completeSignupFromLink() {
    if (!auth || !isSignInWithEmailLink(auth, window.location.href)) return;
    let email = readSignupEmail();
    if (!email) {
        // 다른 기기·브라우저에서 링크를 열면 요청자 확인이 필요하다(링크 도용 방지).
        email = await showPromptModal({
            title: '이메일을 확인해 주세요',
            message: '가입을 요청한 이메일을 입력하면 계정 생성이 완료됩니다.',
            placeholder: '이메일',
            inputType: 'email',
            okText: '계정 만들기',
            validate: v => (EMAIL_PATTERN.test(v) ? '' : '이메일 형식이 올바르지 않습니다.'),
        });
        if (!email) {
            stripEmailLinkFromUrl();
            return;
        }
    }
    try {
        const cred = await signInWithEmailLink(auth, email, window.location.href);
        clearSignupEmail();
        stripEmailLinkFromUrl();
        const info = getAdditionalUserInfo(cred);
        if (info && info.isNewUser) await setInitialPassword(cred.user);
    } catch (err) {
        stripEmailLinkFromUrl();
        await showNoticeModal({ title: '가입을 완료하지 못했어요', message: authErrorMessage(err) });
    }
}

// 비밀번호 재설정 — 미인증 방치 계정의 유일한 탈출구이기도 하다(§1-10 막다른 길 금지).
// 비밀번호는 필요 없으므로 이메일 형식만 검증한다.
async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        // 문구 주의: Firebase는 계정 존재 여부를 숨기려고 미가입 메일에도 에러 없이 성공을 돌려주고
        // 실제 메일은 보내지 않는다. 따라서 "보냈다"고 단정하면 거짓 안내가 된다(조건부로 표현).
        await showNoticeModal({
            title: '재설정 메일을 요청했어요',
            message: `${email} 로 가입한 계정이 있다면 재설정 링크가 도착합니다. 메일 속 링크에서 새 비밀번호를 정한 뒤 로그인해 주세요. 몇 분 지나도 안 오면 스팸함을 확인하고, 그래도 없으면 그 메일로는 가입한 적이 없는 것이니 회원가입을 해 주세요.`,
        });
        return '';
    } catch (err) {
        // 가입 안 된 메일이면 "메일 확인해 보세요"가 아니라 막다른 길을 끊는 안내를 준다.
        // (이 분기는 Firebase 콘솔의 이메일 열거 보호가 꺼져 있을 때만 도달한다.)
        if (err && err.code === 'auth/user-not-found') {
            await showNoticeModal({
                title: '가입된 계정이 없어요',
                message: `${email} 로 가입한 계정이 없어요. 회원가입으로 계정을 먼저 만들어 주세요.`,
            });
            return '';
        }
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

// 보안 확인(재인증) — 계정 삭제 등 민감 작업에서 requires-recent-login 발생 시 사용.
// 구글 계정은 팝업 재인증, 이메일 계정은 비밀번호 재입력.
async function reauthenticate(user) {
    const providerId = user.providerData && user.providerData[0] && user.providerData[0].providerId;
    if (providerId === 'google.com') {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
        return;
    }
    const password = prompt('보안 확인을 위해 비밀번호를 다시 입력해 주세요.');
    if (!password) throw new Error('reauth-cancelled');
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
}

// 계정 완전 삭제 (스토어 필수 요건 §5-3). 되돌릴 수 없음 — 이중 확인.
// 순서 필수: 클라우드 문서 먼저 삭제(인증 살아있을 때만 규칙 통과) → 그다음 계정 삭제.
// requires-recent-login 시 재인증 후 재시도(문서 삭제는 멱등).
async function deleteAccount() {
    const user = auth && auth.currentUser;
    if (!user) return;
    if (!confirm('계정을 삭제하면 클라우드에 저장된 데이터가 모두 사라집니다. 되돌릴 수 없습니다. 계속할까요?')) return;
    try {
        await deleteCloudData(user.uid);
        await deleteUser(user);
        alert('계정이 삭제되었습니다.');
    } catch (err) {
        if (err && err.code === 'auth/requires-recent-login') {
            try {
                await reauthenticate(user);
                await deleteCloudData(user.uid);
                await deleteUser(user);
                alert('계정이 삭제되었습니다.');
            } catch (retryErr) {
                if (retryErr && retryErr.message === 'reauth-cancelled') return;
                alert(authErrorMessage(retryErr));
            }
            return;
        }
        alert(authErrorMessage(err));
    }
}

// ── UI 렌더 ─────────────────────────────────────────────
// 로그인 상태에 따라 계정 패널 내용을 채운다. PC·모바일 양쪽 셸 대상.
function accountPanelHTML(user) {
    // 이메일 인증을 강제하므로 로그인 상태의 user는 항상 emailVerified=true다.
    // (미인증 이메일 계정은 로그인 시점에 거부·로그아웃되어 이 함수에 user로 도달하지 못한다.)
    if (user) {
        const label = user.email || user.displayName || '로그인됨';
        return `
            <div class="account-signed-in">
                <p class="account-status">✓ 로그인됨</p>
                <p class="account-email">${label}</p>
                <p class="account-sync-status" role="status"></p>
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
            <p class="account-hint account-signup-hint">회원가입은 이메일만 입력하면 됩니다. 메일 속 링크를 눌러야 계정이 만들어지고, 비밀번호는 그때 정합니다.</p>
            <button type="button" class="account-reset-link">비밀번호를 잊으셨나요?</button>
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

// 처리 중 버튼 비활성화 — 로그인·회원가입 연타로 중복 요청·혼란 에러 방지.
function setPanelBusy(panel, busy) {
    panel.querySelectorAll('button').forEach(btn => { btn.disabled = busy; });
}

// 동기화 상태 표시 문구 (sync.js가 window 'sync-status' 이벤트로 통지).
const SYNC_STATUS_TEXT = {
    syncing: '동기화 중…',
    synced: '✓ 동기화됨',
    error: '⚠ 동기화 실패 — 나중에 다시 시도합니다',
    offline: '오프라인 — 연결되면 자동 동기화됩니다',
};
function updateSyncStatusUI(status) {
    const text = SYNC_STATUS_TEXT[status] || '';
    document.querySelectorAll('.account-sync-status').forEach(el => {
        el.textContent = text;
        el.dataset.state = status;
    });
}

// 이메일 로그인·회원가입 공통 흐름: 사전 검증 → 진행중 표시 → Firebase 호출 → 결과 표시.
async function runEmailAction(panel, action, workingText) {
    const { email, password } = readCredentials(panel);
    const invalid = validateCredentials(email, password);
    if (invalid) return showMsg(panel, invalid, 'error');
    setPanelBusy(panel, true);
    showMsg(panel, workingText, 'info');
    const errorText = await action(email, password);
    // 성공 시 onAuthStateChanged가 패널을 로그인 화면으로 재렌더하므로 여기선 실패만 처리.
    if (errorText) {
        showMsg(panel, errorText, 'error');
        setPanelBusy(panel, false);
    }
}

function bindPanel(panel, user) {
    if (!panel) return;
    panel.innerHTML = accountPanelHTML(user);

    // 배포 버전 줄 — 어느 상태든 항상 표시(구버전 캐시 판별).
    const build = document.createElement('p');
    build.className = 'account-build';
    build.textContent = `빌드 ${APP_BUILD}`;
    panel.appendChild(build);

    if (user) {
        panel.querySelector('.account-logout-btn')?.addEventListener('click', logout);
        panel.querySelector('.account-delete-btn')?.addEventListener('click', deleteAccount);
        return;
    }
    panel.querySelector('.account-google-btn')?.addEventListener('click', async () => {
        setPanelBusy(panel, true);
        showMsg(panel, '구글 로그인 창을 여는 중…', 'info');
        const errorText = await loginWithGoogle();
        if (errorText) {
            showMsg(panel, errorText, 'error');
            setPanelBusy(panel, false);
        }
    });
    panel.querySelector('.account-login-btn')?.addEventListener('click', () =>
        runEmailAction(panel, loginWithEmail, '로그인 중…')
    );
    // 회원가입은 이메일만 받는다 — 계정이 아직 없으니 비밀번호를 정할 대상도 없다(§1-10).
    panel.querySelector('.account-signup-btn')?.addEventListener('click', async () => {
        const { email } = readCredentials(panel);
        if (!EMAIL_PATTERN.test(email)) {
            return showMsg(panel, '가입할 이메일을 입력한 뒤 눌러주세요.', 'error');
        }
        setPanelBusy(panel, true);
        showMsg(panel, '가입 링크를 보내는 중…', 'info');
        const errorText = await requestSignupLink(email);
        showMsg(panel, errorText || '', errorText ? 'error' : 'info');
        setPanelBusy(panel, false);
    });
    panel.querySelector('.account-reset-link')?.addEventListener('click', async () => {
        const { email } = readCredentials(panel);
        if (!EMAIL_PATTERN.test(email)) {
            return showMsg(panel, '재설정 메일을 받을 이메일을 입력한 뒤 눌러주세요.', 'error');
        }
        setPanelBusy(panel, true);
        showMsg(panel, '재설정 메일을 보내는 중…', 'info');
        const errorText = await resetPassword(email);
        showMsg(panel, errorText || '', errorText ? 'error' : 'info');
        setPanelBusy(panel, false);
    });
}

function renderAccountPanels(user) {
    const panels = [
        document.getElementById('settings-tab-account'),
        document.getElementById('m-settings-tab-account'),
    ];
    panels.forEach(panel => bindPanel(panel, user));
    // 세션이 끊긴 뒤(미인증 로그인 거부) 로그아웃 화면에 한 번 안내를 띄운다.
    if (!user && pendingNotice) {
        panels.forEach(panel => panel && showMsg(panel, pendingNotice.text, pendingNotice.kind));
        pendingNotice = null;
    }
}

export function setupAuth() {
    // 동기화 상태 통지 수신(sync.js) — 계정 패널의 동기화 상태 줄을 갱신.
    window.addEventListener('sync-status', (e) => updateSyncStatusUI(e.detail && e.detail.state));

    // Firebase 미설정(.env 없음) 시 게스트 모드로만 동작 — 계정 패널은 로그아웃 화면 고정.
    if (!isFirebaseConfigured || !auth) {
        renderAccountPanels(null);
        return;
    }
    onAuthStateChanged(auth, (user) => {
        renderAccountPanels(user);
    });

    // 가입 링크로 들어왔다면 여기서 계정이 최초 생성된다(§1-10). 링크가 아니면 즉시 반환.
    completeSignupFromLink();
}

window.setupAuth = setupAuth;
