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
GitHub 푸시 → Vercel 자동 빌드·배포 → Service Worker 변경 감지 → 유저 앱 자동 갱신
```

- 배포 URL: `https://swithme-delta.vercel.app/`
- GitHub에 푸시만 하면 Vercel이 자동 빌드하고, `autoUpdate` + `skipWaiting` 설정으로 유저의 앱이 자동 업데이트된다.

---

## 앱 설치 방법 (유저 가이드)

| 환경 | 브라우저 | 설치 방법 |
|---|---|---|
| Android | Chrome | 메뉴(⋮) → **"앱 설치"** |
| Android | 삼성 인터넷 | 메뉴(≡) → **"홈 화면에 추가"** |
| iOS | Safari (필수) | 공유 버튼(□↑) → **"홈 화면에 추가"** |
| PC | Chrome / Edge | 주소창 우측 설치 아이콘(⊕) 클릭 |

> **참고**: iOS에서는 Safari에서만 PWA 설치가 가능하다. Chrome, Firefox 등 다른 브라우저에서는 설치 옵션이 표시되지 않는다.
