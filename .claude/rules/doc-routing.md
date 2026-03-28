# 문서 라우팅 맵

> 코드 변경 시 **어떤 문서를 참조하고 업데이트해야 하는지** 판단하기 위한 매핑 테이블.

---

## 작업 전 참조 가이드

작업을 시작하기 전, 아래 표를 확인하여 **필요한 문서만 선택적으로** 읽는다.
서브에이전트 생성 시에도 관련 문서 경로를 프롬프트에 포함할 것.

| 작업 유형 | 먼저 읽을 문서 |
|---|---|
| JS 로직 수정/추가 | `directives/js-code-reference.md` |
| HTML 구조/ID 변경 | `directives/STRUCTURE.md` |
| CSS/스타일 변경 | `directives/style-reference.md` |
| 모바일 전용 작업 | `directives/STRUCTURE.md` (ID 매핑) + `directives/js-code-reference.md` (mobile.js) |
| 새 탭/캔버스 추가 | 위 3개 문서 모두 |

---

## 변경 트리거 → 수정 대상

| 트리거 (변경 유형) | 수정 대상 문서 | 비고 |
|---|---|---|
| JS 모듈 추가/삭제 | `directives/js-code-reference.md` | 모듈 목차, 의존성 다이어그램, localStorage 키 등 |
| JS 함수 추가/삭제/시그니처 변경 | `directives/js-code-reference.md` | 해당 모듈 섹션의 함수 테이블 |
| window 전역 함수 등록/제거 | `directives/js-code-reference.md` | window 전역 함수 테이블 |
| HTML 구조 변경 (ID, 셸, 레이아웃) | `directives/STRUCTURE.md` | Desktop/Mobile Shell 구조, ID 매핑 테이블 |
| 새 HTML 요소 ID 추가 (PC/모바일) | `directives/STRUCTURE.md` | ID 매핑 (PC ↔ 모바일) 테이블 |
| 공유 컴포넌트(모달, 오버레이) 추가/삭제 | `directives/STRUCTURE.md` | 공유 컴포넌트 섹션 |
| CSS 변수(`:root`) 추가/변경 | `directives/style-reference.md` | 핵심 CSS 변수 섹션 |
| 주요 셀렉터 추가/삭제 | `directives/style-reference.md` | 해당 영역 스타일 테이블 |
| 반응형 브레이크포인트 변경 | `directives/style-reference.md` | 미디어 쿼리 섹션 |
| 모바일 셸 전용 스타일 변경 | `directives/style-reference.md` | 모바일 셸 전용 섹션 |
| 기술 스택/npm 스크립트 변경 | `CLAUDE.md` | 기술 스택, 주요 스크립트 섹션 |
| 새 rules 파일 추가/삭제 | `CLAUDE.md` | 필수 참고 문서 섹션 |
| 작업 유의사항/협업 원칙 변경 | `CLAUDE.md` | 해당 섹션 |
| 새 directive 파일 추가/삭제 | `directives/INDEX.md` | 지침 목록 테이블 |
| PWA/배포 설정 변경 | `.claude/rules/pwa-deploy.md` | 미생성 시 새로 작성 |

---

## 복수 문서 수정이 필요한 경우

| 작업 예시 | 수정 대상 |
|---|---|
| 새 탭(Canvas/Panel) 추가 | `STRUCTURE.md` + `js-code-reference.md` + `style-reference.md` |
| 새 JS 모듈 파일 생성 | `js-code-reference.md` (모듈 섹션 + 의존성 다이어그램) |
| 과목 관리 로직 변경 | `js-code-reference.md` (store + ui + mobile 함수 테이블) |
| 모바일 전용 새 기능 추가 | `STRUCTURE.md` (ID 매핑) + `js-code-reference.md` (mobile.js) + `style-reference.md` (모바일 셸) |
