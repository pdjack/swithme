# 문서 라우팅 맵

> 코드 변경 시 **어떤 문서를 참조하고 업데이트해야 하는지** 판단하기 위한 매핑 테이블.

---

## 작업 전 참조 가이드

작업을 시작하기 전, 아래 표를 확인하여 **필요한 정보를 확보**한다.
사실 정보는 추출 스크립트로, 규칙·원칙은 문서로 참조한다.

| 작업 유형 | 추출 스크립트 실행 | 규칙 문서 |
|---|---|---|
| JS 로직 수정/추가 | `extract-js-api.py` | `tech-stack.md` |
| HTML 구조/ID 변경 | `extract-html-structure.py` | — |
| CSS/스타일 변경 | `extract-css-variables.py` | `ui-ux-guide.md` (브랜드 규칙) |
| 모바일 전용 작업 | `extract-html-structure.py` + `extract-js-api.py` | `ui-ux-guide.md` |
| PC/모바일 공통 기능 구현 | 3개 모두 | `ui-ux-guide.md`, `tech-stack.md` |
| 아이콘 추가/변경 | `extract-js-api.py` (아이콘 키 확인) | `ui-ux-guide.md` (아이콘 규칙) |
| 새 탭/캔버스 추가 | 3개 모두 | `ui-ux-guide.md` |
| 기능 기획/분석 관련 | — | `docs/PRD.md` + `활용정보/` + `directives/` 플랜 문서 |
| 신규 문서 작성/마커 표기 | — | `doc-conventions.md` |
| 협업 방식·Plan 운영 | — | `collaboration.md` |

> **스크립트 경로**: 모두 `execution/` 디렉토리에 위치. `python3 execution/<스크립트명>` 으로 실행.

> **원칙**: 위 표에 매핑되지 않은 작업이라도, 질문 전에 프로젝트 내(`docs/`, `활용정보/`, `directives/`)에서 관련 문서를 능동적으로 탐색한다. 문서에 이미 답이 있는 내용을 유저에게 다시 질문하지 않는다.

---

## 변경 트리거 → 수정 대상

코드 변경 시 **추출 스크립트가 커버하는 사실 정보는 문서 업데이트가 불필요**하다.
아래는 여전히 수동 업데이트가 필요한 항목만 정리한 테이블이다.

| 트리거 (변경 유형) | 수정 대상 문서 | 비고 |
|---|---|---|
| 프로젝트 정체성/로드맵 변경 | `CLAUDE.md` | 정체성 섹션 |
| 핵심 운영 규칙(매번 적용) 변경 | `CLAUDE.md` | 핵심 규칙 섹션 |
| 기술 스택/npm 스크립트/코드 컨벤션 변경 | `.claude/rules/tech-stack.md` | |
| 협업 원칙/Plan 운영/짧은 동의 해석 변경 | `.claude/rules/collaboration.md` | |
| 문서 작성 규칙(SRP/마커/어휘) 변경 | `.claude/rules/doc-conventions.md` | |
| 새 rules 파일 추가/삭제 | `CLAUDE.md` 라우팅 표 + 본 문서 | 양쪽 모두 갱신 |
| 새 directive 파일 추가/삭제 | `directives/INDEX.md` | 지침 목록 테이블 |
| PC/모바일 간 UI 불일치 발견/수정 | `directives/ui-ux-guide.md` | 불일치 목록(섹션 3) 갱신 |
| UI/UX 규칙 변경 (네이밍, 이벤트, 상태 등) | `directives/ui-ux-guide.md` | 해당 규칙 섹션 |
| PWA/배포 설정 변경 | `.claude/rules/pwa-deploy.md` | 미생성 시 새로 작성 |

### 더 이상 문서 업데이트 불필요 (스크립트가 대체)

| 변경 유형 | 이전 수정 대상 | 현재 |
|---|---|---|
| JS 모듈/함수/window 전역 변경 | ~~`js-code-reference.md`~~ | `extract-js-api.py`가 자동 추출 |
| HTML 구조/ID 변경 | ~~`STRUCTURE.md`~~ | `extract-html-structure.py`가 자동 추출 |
| CSS 변수/셀렉터/미디어 쿼리 변경 | ~~`style-reference.md`~~ | `extract-css-variables.py`가 자동 추출 |
| 아이콘 추가/삭제 | ~~`icon-reference.md`~~ | `extract-js-api.py`가 자동 추출 |
