# 기술 스택 및 코드 컨벤션

> swithme 프로젝트의 기술 구성, npm 스크립트, 코드 작성 시 따라야 할 컨벤션을 정의한다.
> 프로젝트 정체성·로드맵은 `CLAUDE.md`를 참조한다.

---

## 기술 스택

- **프론트엔드:** HTML5, Vanilla CSS, Vanilla JavaScript (ES6+)
- **디자인 시스템:** 다크 모드, 글래스모피즘(Glassmorphism), 현대적 타이포그래피(Inter, Outfit), 부드러운 그라데이션과 마이크로 인터랙션
- **상태 관리:** `localStorage` 기반 클라이언트 사이드 저장
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

---

## 코드 컨벤션

### 아키텍처 패턴

- PC(`#desktop-shell`)와 모바일(`#mobile-shell`)은 별도 셸로 분리되어 있으므로, **UI 변경 시 양쪽 모두 반영**할 것.
- 상태는 `js/store.js`의 `state` 객체를 통해 중앙 관리된다. **변경 후 `saveToLocal()` 호출 필수**.
- 모바일은 PC 타이머를 `MutationObserver`로 감시하여 동기화하는 구조.
- 새 전역 함수는 `window`에 등록하는 기존 패턴을 따를 것.

### 검증 루틴

- JS 코드 수정 후 `npm run lint`로 린트 검사를 수행할 것. **새로운 warning/error를 추가하지 않도록 주의.**
- 핵심 로직(`js/store.js`, `js/timer.js`) 변경 시 `npm run test:run`으로 기존 테스트 통과 여부를 확인할 것.

### 보안

- API 키 및 비밀번호는 절대 코드에 하드코딩하지 않으며 `.env`를 사용할 것.
  - 현재 시점엔 외부 API 호출이 없으나, 로드맵(로그인·동기화) 도입 시 적용된다.

### 코드 품질 원칙

- **Self-Documenting Code:** 주석에 의존하기보다 변수명과 함수명만으로 의도가 드러나는 코드를 작성한다.
- **Edge Case 고려:** 에지 케이스를 항상 고려하며, 적절한 Try-Catch 또는 Error Boundary 구현을 포함한다.
