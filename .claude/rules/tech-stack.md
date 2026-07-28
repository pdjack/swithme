# 기술 스택 및 코드 품질 원칙

> swithme 프로젝트의 기술 구성, npm 스크립트, 코드 품질 원칙을 정의한다.
> 프로젝트 정체성·로드맵, 그리고 **아키텍처·검증 규칙(셸 분리·상태 저장·린트·테스트 등)은 `CLAUDE.md`의 "항상 적용되는 핵심 규칙"이 단일 출처**다. 여기 사본을 두지 않는다.

---

## 기술 스택

- **프론트엔드:** HTML5, Vanilla CSS, Vanilla JavaScript (ES6+)
- **디자인 시스템:** 다크 모드, 글래스모피즘(Glassmorphism), 현대적 타이포그래피(Inter, Outfit), 부드러운 그라데이션과 마이크로 인터랙션
- **상태 관리:** `localStorage` 기반 클라이언트 사이드 저장(1차). 로그인 시 Firestore와 양방향 동기화.
- **백엔드(Firebase, ✅ 부분 구현):** ✅ Auth(구글·이메일) · ✅ Firestore(계정 데이터 동기화·백업, 접근 제한은 루트 `firestore.rules`) / ☐ FCM·APNs(푸시) · ☐ **이중 IAP**(Google Play Billing + Apple StoreKit) 결제 검증. 결정 근거 PRD §9-5, 세부 태스크 `docs/phase3-할일.md`. 설정 키는 `.env`로 관리(하드코딩 금지).
- **앱 셸(Phase 4 확정, ☐ 미구현):** 하이브리드 — **Capacitor**로 기존 웹을 네이티브 WebView에 담아 iOS·Android 동시 빌드. 결정 근거 PRD §10, 세부 `docs/하이브리드-출시-할일.md`.
- **코드 품질:** ESLint (Flat Config) + Prettier
- **테스트:** Vitest + jsdom (`tests/` 디렉토리)
- **PWA:** `vite-plugin-pwa`를 통한 오프라인 지원, Service Worker 자동 생성

---

## 주요 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 (PWA 포함) |
| `npm run lint` | ESLint 검사 |
| `npm run lint:fix` | ESLint 자동 수정 |
| `npm run format` | Prettier 포매팅 |
| `npm test` | Vitest watch 모드 |
| `npm run test:run` | Vitest 단일 실행 |
| `npm run docs` | 유저 읽기용 통합본 `문서요약.html` 재생성 (원본 마크다운 → HTML) |

---

## 코드 컨벤션

### 아키텍처 패턴 · 검증 루틴

→ **`CLAUDE.md` "항상 적용되는 핵심 규칙"** 참조 (셸 분리, 상태 저장, 모바일 동기화 구조, 전역 함수 등록, 린트·테스트 의무). 중복 방지를 위해 여기 옮겨 적지 않는다.

### 보안

- API 키 및 비밀번호는 절대 코드에 하드코딩하지 않으며 `.env`를 사용할 것.
  - Firebase 설정 키가 실제로 `.env`로 관리되고 있다. `.env`는 버전 관리에서 제외한다.

### 코드 품질 원칙

- **Self-Documenting Code:** 주석에 의존하기보다 변수명과 함수명만으로 의도가 드러나는 코드를 작성한다.
- **Edge Case 고려:** 에지 케이스를 항상 고려하며, 적절한 Try-Catch 또는 Error Boundary 구현을 포함한다.
