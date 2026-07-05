// 공용 확인 모달.
//
// - middleText 없으면 2버튼(취소/확인). ok=true / cancel=false 반환 (하위호환).
// - middleText 있으면 3버튼. 'ok' | 'middle' | 'cancel' 문자열 반환.
// - 버튼 배치(모달 규칙 좌·중·우): 좌=위험(middle) / 중앙=취소(cancel) / 우=주요(ok).
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
