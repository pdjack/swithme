/**
 * device.js
 * 디바이스(모바일/데스크탑)를 감지하여 적절한 레이아웃을 활성화합니다.
 * 터치 스크린 + 화면 너비 768px 이하를 모바일로 분류합니다.
 */

const MOBILE_BREAKPOINT = 768;

export function isMobileDevice() {
    const hasTouchScreen = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    const isNarrowScreen = window.innerWidth <= MOBILE_BREAKPOINT;
    return hasTouchScreen || isNarrowScreen;
}

/**
 * body의 data-device 속성을 갱신하고, PC/모바일 shell을 전환합니다.
 */
export function applyDeviceLayout() {
    const isMobile = isMobileDevice();
    document.body.setAttribute('data-device', isMobile ? 'mobile' : 'desktop');

    const desktopShell = document.getElementById('desktop-shell');
    const mobileShell = document.getElementById('mobile-shell');

    if (desktopShell && mobileShell) {
        desktopShell.style.display = isMobile ? 'none' : 'flex';
        mobileShell.style.display = isMobile ? 'flex' : 'none';
    }
}

/**
 * resize 이벤트에 대응하여 레이아웃 전환을 자동으로 처리합니다.
 * (e.g. 브라우저 창 크기 변경, 기기 회전)
 */
export function watchDeviceLayout(onSwitch) {
    let lastIsMobile = isMobileDevice();
    applyDeviceLayout();

    window.addEventListener('resize', () => {
        const nowMobile = isMobileDevice();
        if (nowMobile !== lastIsMobile) {
            lastIsMobile = nowMobile;
            applyDeviceLayout();
            if (typeof onSwitch === 'function') onSwitch(nowMobile);
        }
    });
}
