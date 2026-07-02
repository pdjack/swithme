# PWA 및 배포 가이드

## 개요

SwitMe는 PWA로 구성되어 있어 브라우저 외에 **독립 앱으로 설치**하여 사용할 수 있다. `vite-plugin-pwa`를 통해 Service Worker와 Web App Manifest가 빌드 시 자동 생성된다.

---

## 핵심 설정 (`vite.config.js`)

| 항목 | 값 | 설명 |
|---|---|---|
| `registerType` | `autoUpdate` | 새 버전 배포 시 Service Worker가 자동 업데이트 |
| `display` | `standalone` | 브라우저 UI 없이 독립 앱처럼 실행 |
| `skipWaiting` | `true` | 새 SW 활성화 시 대기 없이 즉시 교체 |
| `clientsClaim` | `true` | 새 SW가 즉시 모든 클라이언트를 제어 |

---

## PWA 아이콘

| 파일 | 크기 | 용도 |
|---|---|---|
| `public/pwa-192x192.png` | 192×192 | 홈 화면 아이콘 |
| `public/pwa-512x512.png` | 512×512 | 스플래시 화면 / 설치 배너 |

원본: `logo_no_watermark.png` (1024×1024)에서 `sips`로 리사이즈하여 생성.

---

## 배포 및 업데이트 흐름

```
GitHub 푸시 → Vercel 자동 빌드·배포 → 앱이 새 SW 능동 확인 → 감지 시 즉시 교체 → 유저 앱 자동 갱신
```

- 배포 URL: `https://swithme-delta.vercel.app/`
- GitHub에 푸시만 하면 Vercel이 자동 빌드한다.
- 앱은 **포그라운드 복귀 시**(최근앱에서 재개)와 **1시간 주기**로 새 SW를 능동 확인한다(`js/main.js`의 `registerSW` 등록 콜백). 새 버전 감지 시 `skipWaiting` + `clientsClaim`으로 즉시 교체되고, `controllerchange` 이벤트가 페이지를 자동 새로고침한다.

> ⚠️ **`autoUpdate`만으로는 부족하다.** `registerType: autoUpdate`는 "새 SW가 **감지되면** 즉시 교체"만 담당하고, **감지 트리거(새 버전 확인) 자체는 만들지 않는다.** vite-plugin-pwa가 자동 주입하는 기본 등록 코드는 `window` `load` 이벤트 시점에만 확인하는데, 설치형 PWA는 최근앱에서 재개할 때 `load`가 발생하지 않아 갱신을 놓친다(특히 iOS Safari PWA). 이 때문에 예전엔 유저가 앱을 지우고 캐시를 비워야만 갱신됐다. **반드시 능동 `registration.update()` 호출(포그라운드 복귀·주기)이 있어야 설치형 PWA가 자동 갱신된다.**

---

## 배포 후 검증 체크리스트

배포마다 강제는 아니나, **SW·PWA 관련 코드를 손댄 배포**는 아래를 사람 손으로 1회 확인한다. 브라우저 F5(새로고침)만으로 "됐다" 판정 금지 — 새로고침은 항상 `load`를 띄워 갱신되므로, 실패하는 유일한 경로(설치형 재개)를 못 잡는다.

- [ ] 새 버전 배포 완료.
- [ ] 설치형 PWA를 **폰 최근앱에서 재개**(새로고침 X) → 몇 초 내 자동 갱신 확인.
- [ ] iOS Safari 설치본 있으면 동일 재개 확인(가장 취약한 환경).

---

## 앱 설치 방법 (유저 가이드)

| 환경 | 브라우저 | 설치 방법 |
|---|---|---|
| Android | Chrome | 메뉴(⋮) → **"앱 설치"** |
| Android | 삼성 인터넷 | 메뉴(≡) → **"홈 화면에 추가"** |
| iOS | Safari (필수) | 공유 버튼(□↑) → **"홈 화면에 추가"** |
| PC | Chrome / Edge | 주소창 우측 설치 아이콘(⊕) 클릭 |

> **참고**: iOS에서는 Safari에서만 PWA 설치가 가능하다. Chrome, Firefox 등 다른 브라우저에서는 설치 옵션이 표시되지 않는다.
