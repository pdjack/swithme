# Directives Index

작업 수행 시 이 인덱스를 먼저 읽고, 관련 지침 파일을 선택적으로 참조한다.

> **신규 기능·신규 화면 작업 시 우선 확인 문서**
> - `docs/PRD.md` §3 (핵심 기능 정의) — 기존 기능 범위와 구현 상태
> - `docs/PRD.md` §5 (화면 구조) — PC/모바일 레이아웃 패턴. 신규 화면도 이 구조를 따른다.

## 규칙 문서

| 파일 | 설명 |
|------|------|
| `ui-ux-guide.md` | PC↔모바일 UI/UX 일관성 원칙, 네이밍·이벤트·상태·모달·아이콘 규칙, 불일치 목록 |

## 코드 구조 추출 스크립트

사실 정보(ID, 셀렉터, 함수 시그니처 등)는 문서가 아닌 스크립트로 코드에서 직접 추출한다.

| 명령어 | 출력 내용 |
|--------|----------|
| `python3 execution/extract-html-structure.py` | HTML 셸 구조, 전체 ID 목록, PC↔모바일 ID 매핑, 공유 컴포넌트 |
| `python3 execution/extract-css-variables.py` | CSS 변수(:root), 주요 셀렉터, 미디어 쿼리, 애니메이션 |
| `python3 execution/extract-js-api.py` | export 함수, window 전역, 모듈 의존성, localStorage 키, SVG 아이콘 키 |

## 기능 플랜

| 파일 | 설명 |
|------|------|
| `AI_학습_강화_플랜.md` | AI 기반 성취도 예측, 맞춤형 피드백, 지능형 학습 계획 추천 기능 구축 플랜 |
| `AI_통합_분석_플랜.md` | 성향 진단(Test) + 학습 데이터(Data) 결합을 통한 성적 예측 및 초개인화 학습 지침 설계 |
