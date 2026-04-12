# 스윗미 (Sweet Me) - 프론트엔드 구조 정리

## 개요

학습 관리 대시보드 웹앱. PC(데스크톱)와 모바일 두 가지 셸(Shell)로 분리된 레이아웃을 가지며, 타이머/스톱워치, 할 일 관리, 타임테이블, 캘린더, AI 분석, 설정(과목 관리 + 하루 회고) 기능을 제공한다.

---

## index.html 구조

### 외부 의존성
| 리소스 | 용도 |
|---|---|
| Google Fonts (`Inter`, `Outfit`) | 본문 및 타이머 전용 폰트 |
| Lucide Icons (unpkg CDN) | 아이콘 시스템 |
| Chart.js (jsdelivr CDN) | 차트/그래프 렌더링 |
| `style.css` | 전체 스타일시트 |
| `js/main.js` (ESM) | 핵심 로직 엔트리포인트 |

---

### 1. Desktop Shell (`#desktop-shell`)

PC 화면 전용 레이아웃. `display: flex`로 좌측 사이드바 + 우측 메인 영역 구성.

#### 1-1. 사이드바 (`.side-nav`)
- 68px 고정 폭, 세로 네비게이션
- 탭: `dashboard` / `plan` (캘린더) / `analyze` (분석) / `settings`
- 하단: 아바타 영역

#### 1-2. 메인 뷰포트 (`.main-viewport`)

**상단 바 (`.top-bar`)**
- 제목: "Deep Focus Dashboard"
- 날짜 표시 (`#display-date`) + 숨겨진 date picker (`#date-picker`)
- 몰입 모드 버튼, 알림 아이콘

**Dashboard Canvas (`#dashboard-canvas`)** — 3컬럼 그리드 (`1fr 1.3fr 1fr`)

| 컬럼 | 내용 |
|---|---|
| **Left** (`.col-left`) | Next Tasks 카드 (할 일 목록 `#task-list`) + Daily Reflection 카드 (목표달성률 자동계산 + 시간관리/오답정리/복습진행/숙제완수 수동입력, 각 /20점) |
| **Center** (`.col-center`) | Hero 타이머 카드 — Timer/Stopwatch 모드 전환, SVG 링 프로그레스 (`#timer-progress`), 시간 표시 (`#timer-display`), START/RESET 버튼 |
| **Right** (`.col-right`) | Study Timetable — 탭 바(`#timetable-tab-bar`: ◀`#tt-scroll-left` / 탭목록`#tt-tab-list` / ▶`#tt-scroll-right` / +`#tt-add-btn`) + 24시간 × 6슬롯 그리드(`#timetable-root`) + Clear 버튼 |

**Calendar Canvas (`#calendar-canvas`)** — 숨김 상태
- 월 네비게이션 (이전/다음)
- 요일 헤더 + 캘린더 그리드 (`#calendar-grid`)

**Settings Canvas (`#settings-canvas`)** — 숨김 상태
- 과목 관리 (`#subject-manager-list`), 과목 추가 버튼

**Analyze Canvas (`#analyze-canvas`)** — 숨김 상태
- AI 일일 메시지 배너 (`#ai-daily-message`)
- 4개 액션 카드: 테스트 분석 / 학습 데이터 분석 / 지난 분석 기록 / AI 통합 맞춤 처방
- 분석 콘텐츠 영역 (`#analysis-content`)
- 오늘의 분석 팁 (`#analysis-quick-tip`)

---

### 2. Mobile Shell (`#mobile-shell`)

모바일 전용 레이아웃. 기본 `display: none`, JS에서 디바이스 판별 후 표시.

#### 2-1. 모바일 헤더 (`.m-header`)
- 좌: 타이머/스톱워치 모드 전환 (`.m-mode-switcher`)
- 중앙: 날짜 (`#m-display-date`)
- 우: 몰입 모드 버튼 (`#m-zen-btn`)

#### 2-2. Hero 타이머 (`.m-timer-hero`)
- SVG 링 타이머 (`#m-timer-progress`, `#m-timer-display`)
- 탭 네비게이션 (`.m-tab-nav`) — 대시보드 / 캘린더 / 분석 / 설정 (4버튼 그리드)
- 컨트롤: RESET / START / 할 일 추가 버튼

#### 2-3. 콘텐츠 영역 (`.m-content-area`)

| 패널 | 내용 |
|---|---|
| **Dashboard** (`#m-dashboard-panel`) | 2컬럼 분할 — 좌: 탭 전환(`.m-col-tabs`: 할 일/회고) → 할 일 목록 (`#m-task-list`) 또는 회고 (`#m-reflection-content`), 우: 타임테이블 탭 바(`#m-timetable-tab-bar`: 탭목록`#m-tt-tab-list` / +`#m-tt-add-btn`) + 타임테이블(`#m-timetable-root`) |
| **Calendar** (`#m-calendar-panel`) | 월 네비게이션 + 캘린더 그리드 (`#m-calendar-grid`) |
| **Analyze** (`#m-analyze-panel`) | AI 배너 + 4개 액션 카드(2×2 그리드) + 분석 콘텐츠 (`#m-analysis-content`) |
| **Settings** (`#m-settings-panel`) | 과목 관리 (`#m-subject-manager-list`) |

---

### 3. 공유 컴포넌트

| 컴포넌트 | 설명 |
|---|---|
| **Zen Mode Overlay** (`#zen-overlay`) | 전체화면 몰입 모드. 과목명 + 대형 타이머 표시 |
| **Task Modal** (`#task-modal`) | 할 일 추가 모달. 과목 선택(`#task-subject`) + 내용 입력(`#task-name`) |
| **Plan Slot Modal** (`#plan-slot-modal`) | 계획 슬롯 추가 모달. 시간 라벨 + 과목 선택(`#plan-slot-subject`) + 메모 입력(`#plan-slot-memo`) + 취소/확인 버튼 |
| **Plan Detail Modal** (`#plan-detail-modal`) | 계획 상세 모달. 시간 라벨 + 과목명 + 메모 + 삭제(`#plan-detail-delete`)/취소(`#plan-detail-cancel`)/수정(`#plan-detail-edit`) 버튼 |

---

## 데이터 흐름 요약

```
index.html
  ├── Desktop Shell (#desktop-shell)     ← PC 전용
  │     ├── Side Nav (탭 전환)
  │     └── Main Viewport
  │           ├── Dashboard Canvas (할 일 + 타이머 + 타임테이블)
  │           ├── Calendar Canvas
  │           ├── Analyze Canvas
  │           └── Settings Canvas
  │
  ├── Mobile Shell (#mobile-shell)       ← 모바일 전용
  │     ├── Header (모드 전환 + 날짜 + 몰입)
  │     ├── Timer Hero (링 + 탭 네비 + 컨트롤)
  │     └── Content Area
  │           ├── Dashboard Panel (할 일/회고 탭 전환 + 타임테이블 분할)
  │           ├── Calendar Panel
  │           ├── Analyze Panel
  │           └── Settings Panel (과목 관리)
  │
  └── 공유 컴포넌트
        ├── Zen Mode Overlay
        ├── Task Add Modal
        ├── Plan Slot Modal
        └── Plan Detail Modal
```

---

## ID 매핑 (PC ↔ 모바일)

| 기능 | PC ID | 모바일 ID |
|---|---|---|
| 타이머 프로그레스 | `#timer-progress` | `#m-timer-progress` |
| 타이머 표시 | `#timer-display` | `#m-timer-display` |
| 할 일 목록 | `#task-list` | `#m-task-list` |
| 회고 콘텐츠 | (`.reflection-card`) | `#m-reflection-content` |
| 타임테이블 그리드 | `#timetable-root` | `#m-timetable-root` |
| 타임테이블 탭 바 | `#timetable-tab-bar` | `#m-timetable-tab-bar` |
| 타임테이블 탭 목록 | `#tt-tab-list` | `#m-tt-tab-list` |
| 타임테이블 탭 추가 버튼 | `#tt-add-btn` | `#m-tt-add-btn` |
| 캘린더 그리드 | `#calendar-grid` | `#m-calendar-grid` |
| 월 표시 | `#calendar-month-year` | `#m-calendar-month-year` |
| 과목 관리 | `#subject-manager-list` | `#m-subject-manager-list` |
| 회고 총점 | `#total-reflection-score` | `#m-total-reflection-score` |
| 목표 달성률 | `#score-achievement` | `#m-score-achievement` |
| 분석 콘텐츠 | `#analysis-content` | `#m-analysis-content` |
| AI 메시지 | `#ai-message-text` | `#m-ai-message-text` |
| 날짜 표시 | `#display-date` | `#m-display-date` |

