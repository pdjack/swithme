// 공용 확인 모달.
//
// - middleText 없으면 2버튼(취소/확인). ok=true / cancel=false 반환 (하위호환).
// - middleText 있으면 3버튼. 'ok' | 'middle' | 'cancel' 문자열 반환.
// - 버튼 배치(모달 규칙 좌·중·우): 좌=위험(middle) / 중앙=취소(cancel) / 우=주요(ok).

// 단일 버튼 안내 모달 — 확인 하나만. 선택이 아닌 통지용(회원가입 인증 메일 안내 등).
// 배경 클릭·버튼으로 닫히며 항상 resolve(). 취소 개념 없음.
export function showNoticeModal({ title = '안내', message = '', okText = '확인' } = {}) {
    return new Promise(resolve => {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-modal-title');
        const messageEl = document.getElementById('confirm-modal-message');
        const okBtn = document.getElementById('confirm-modal-ok');
        const cancelBtn = document.getElementById('confirm-modal-cancel');
        const middleBtn = document.getElementById('confirm-modal-middle');
        if (!modal || !titleEl || !messageEl || !okBtn) {
            window.alert(message);
            resolve();
            return;
        }
        titleEl.textContent = title;
        messageEl.textContent = message;
        okBtn.textContent = okText;

        // 확인 외 버튼 숨김 — 안내는 선택지 없음.
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (middleBtn) middleBtn.style.display = 'none';

        // 이전 리스너 제거: 노드 클론으로 교체.
        const newOk = okBtn.cloneNode(true);
        okBtn.replaceWith(newOk);

        function close() {
            modal.classList.remove('active');
            // 다른 모달 재사용 위해 숨긴 버튼 복구.
            if (cancelBtn) cancelBtn.style.display = '';
            resolve();
        }
        newOk.addEventListener('click', close);
        modal.classList.add('active');
    });
}
export function showConfirmModal({
    title = '확인',
    message = '',
    okText = '삭제',
    cancelText = '취소',
    middleText = null,
} = {}) {
    const threeWay = typeof middleText === 'string';
    return new Promise(resolve => {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-modal-title');
        const messageEl = document.getElementById('confirm-modal-message');
        const okBtn = document.getElementById('confirm-modal-ok');
        const cancelBtn = document.getElementById('confirm-modal-cancel');
        const middleBtn = document.getElementById('confirm-modal-middle');
        if (!modal || !titleEl || !messageEl || !okBtn || !cancelBtn) {
            const fallback = window.confirm(message);
            resolve(threeWay ? (fallback ? 'ok' : 'cancel') : fallback);
            return;
        }
        titleEl.textContent = title;
        messageEl.textContent = message;
        okBtn.textContent = okText;
        cancelBtn.textContent = cancelText;

        // 이전 리스너 제거: 노드 클론으로 교체
        const newOk = okBtn.cloneNode(true);
        okBtn.replaceWith(newOk);
        const newCancel = cancelBtn.cloneNode(true);
        cancelBtn.replaceWith(newCancel);

        let newMiddle = null;
        if (middleBtn) {
            newMiddle = middleBtn.cloneNode(true);
            middleBtn.replaceWith(newMiddle);
            if (threeWay) {
                newMiddle.textContent = middleText;
                newMiddle.style.display = '';
            } else {
                newMiddle.style.display = 'none';
            }
        }

        function close(result) {
            modal.classList.remove('active');
            resolve(result);
        }
        newOk.addEventListener('click', () => close(threeWay ? 'ok' : true));
        newCancel.addEventListener('click', () => close(threeWay ? 'cancel' : false));
        if (newMiddle && threeWay) {
            newMiddle.addEventListener('click', () => close('middle'));
        }
        modal.classList.add('active');
    });
}
