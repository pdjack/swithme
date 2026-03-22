# style.css 구조 레퍼런스

총 약 1,979줄. 크게 **공통/데스크톱 스타일** → **모바일 셸 전용 스타일** 순서로 구성.

---

## 핵심 브랜드 컬러 및 CSS 변수 (`:root`)

스윗미(Sweet Me) 브랜드 아이덴티티를 나타내는 핵심 색상(중요도 순: 검정 - 파랑 - 하양 - 노랑)과 UI 구성에 사용되는 전체 CSS 변수 매핑 요소입니다.

```css
/* 기본 브랜드 및 테마 컬러 */
--bg: #0A0A0B          /* 1. 검정 (Black) - 기본 배경색 */
--card: #141417        /* 1. 검정 (Black) - 카드 배경 요소 */
--primary: #0056B3     /* 2. 파랑 (Blue) - 메인 브랜드 포인트 및 활성화 버튼 */
--text-main: #FFFFFF   /* 3. 하양 (White) - 메인 본문 및 타이틀 텍스트 */
/* *참고: 4순위 색상인 노랑(Yellow, #FFCC00)은 아이콘 등 특정 그래픽 요소에 포인트로 사용됩니다. */

/* 보조 및 상태 표시 컬러 */
--success: #28A745     /* 상태: 성공, 완료 (그린) */
--pink: #FF2D55        /* 상태: 경고, 삭제 (핑크) */
--text-dim: #8E8E93    /* 보조 텍스트 밀도 감소 (그레이) */
--glass: rgba(255,255,255,0.03)  /* 유리 질감 반투명 효과 */
--border: rgba(255,255,255,0.08) /* 컴포넌트 경계선(테두리) */
```

---

## 주요 섹션별 스타일 정리

### 레이아웃
| 셀렉터 | 역할 | 핵심 속성 |
|---|---|---|
| `.app-shell` | PC 전체 레이아웃 | `display: flex; height: 100vh` |
| `.side-nav` | 좌측 사이드바 | `width: 68px`, 세로 flex |
| `.main-viewport` | 메인 콘텐츠 | `flex: 1; padding: 32px 40px` |
| `.dashboard-canvas` | 대시보드 3컬럼 | `grid-template-columns: 1fr 1.3fr 1fr` |

### 카드 시스템
| 셀렉터 | 설명 |
|---|---|
| `.glass-card` | 기본 카드. `background: var(--card)`, `border-radius: 24px`, `box-shadow` |
| `.grid-preview` | 타임테이블 카드. 흰색 배경 (`#FFFFFF`), 별도 border 스타일 |
| `.hero-timer-card` | 타이머 히어로. `linear-gradient` 배경, `border-radius: 32px` |

### 타이머
| 셀렉터 | 설명 |
|---|---|
| `.timer-ring` | SVG 링 래퍼 (`280×280px`) |
| `.ring-active` | SVG 프로그레스 링. `stroke: var(--primary)`, `stroke-dasharray: 301.6` |
| `.timer-val` | 시간 텍스트. `font-size: 72px`, 클릭 가능 |
| `.btn-start` | START 버튼. `background: var(--primary)`, `border-radius: 20px` |

### 타임테이블
| 셀렉터 | 설명 |
|---|---|
| `.hour-row` | 1시간 행 (`height: 32px`) |
| `.hour-label` | 시간 라벨 (`width: 50px`, 회색 배경) |
| `.ten-min-slots` | 10분 단위 슬롯 컨테이너 |
| `.slot` | 개별 슬롯. `.slot.filled`시 과목 색상으로 채움 |

### 할 일 목록
| 셀렉터 | 설명 |
|---|---|
| `.task-list` | 전체 목록 컨테이너 |
| `.subject-group` | 과목별 그룹 |
| `.subject-header` | 과목명 + 누적 시간 헤더 |
| `.task-item` | 개별 할 일. `.active` / `.completed` 상태 |
| `.task-actions` | 호버 시 나타나는 액션 버튼 (`opacity: 0 → 1`) |

### Daily Reflection (하루 회고)
| 셀렉터 | 설명 |
|---|---|
| `.reflection-card` | 회고 카드 |
| `.total-score-badge` | 총점 뱃지 (`background: var(--primary)`) |
| `.reflect-item` | 개별 항목 (`.auto`: 자동 계산, `.user`: 수동 입력) |
| `.r-score-input` | 점수 입력 필드 (number, 투명 배경) |
| `.btn-save-reflection` | 저장 버튼. 호버시 블루 변환 |

### 캘린더
| 셀렉터 | 설명 |
|---|---|
| `.calendar-grid` | 7컬럼 그리드 (`grid-auto-rows: minmax(100px, auto)`) |
| `.calendar-day` | 날짜 셀. `.today`시 블루 글로우 |
| `.day-score` | 일일 점수 뱃지 (우상단) |

### 분석 (Analyze)
| 셀렉터 | 설명 |
|---|---|
| `.analysis-actions` | 액션 카드 컨테이너 (flex wrap) |
| `.action-card` | 분석 메뉴 카드 (`130×80px`). 호버시 상승 + 블루 border |
| `.analysis-main-content` | 분석 결과 영역 (`min-height: 550px`) |
| `.test-container` | 테스트 분석 UI (질문 + 선택지) |
| `.result-container` | 결과 표시 UI (페르소나 카드) |
| `.history-grid` | 분석 기록 그리드 |
| `.data-table` | 데이터 분석 테이블 |
| `.ai-message-banner` | AI 메시지 배너 (펄스 애니메이션) |

### 모달
| 셀렉터 | 설명 |
|---|---|
| `.modal` | 오버레이 (`background: rgba(0,0,0,0.8)`, backdrop-filter blur) |
| `.modal.active` | 표시 상태 (`display: flex`) |
| `.modal-content` | 모달 본문 (`width: 400px`) |

### Zen Mode (몰입 모드)
| 셀렉터 | 설명 |
|---|---|
| `.zen-overlay` | 전체화면 오버레이 (`z-index: 2000`, 블랙 배경) |
| `#zen-timer-display` | 초대형 타이머 (`font-size: 180px`) |

### 과목 관리 (Settings)
| 셀렉터 | 설명 |
|---|---|
| `.subject-row` | 과목 행. 드래그 핸들 + 이름 input + 색상 picker + 삭제 |
| `.subject-row.dragging` | 드래그 중 상태 |

---

## 반응형 미디어 쿼리

| 브레이크포인트 | 적용 내용 |
|---|---|
| `≤1024px` | 대시보드 2컬럼, 타임테이블 전체 폭 |
| `≤768px` | 사이드바 → 하단 고정 바, 1컬럼 레이아웃, 타이머/모달/캘린더 축소 |
| `≤480px` | 타이틀 축소, 버튼 세로 배치 |

---

## 모바일 셸 전용 스타일 (`#mobile-shell`)

PC 반응형과 별개로 완전히 분리된 모바일 전용 레이아웃. `100dvh` 사용.

| 영역 | 주요 스타일 |
|---|---|
| `.m-header` | 상단 고정, `backdrop-filter: blur(20px)`, safe-area 패딩 |
| `.m-timer-hero` | 타이머 영역. `clamp(140px, 35vw, 180px)` 반응형 링 크기 |
| `.m-tab-nav` | 4컬럼 그리드 탭 버튼. active시 블루 글로우 |
| `.m-split-view` | 대시보드 2컬럼 분할 (할 일 + 타임테이블) |
| `.m-task-list` | 모바일 할 일 목록. `min-height: 44px` 터치 최적화 |
| `.m-timetable-container` | 흰색 배경, `hour-row` 28px로 축소 |
| `.m-calendar-grid` | 7컬럼, `grid-auto-rows: minmax(48px, auto)` |
| `.m-analysis-grid` | 2×2 그리드 분석 카드 |
| `.m-reflection-grid` | 회고 입력 영역 (설정 탭 내) |

---

## 애니메이션

| 이름 | 효과 |
|---|---|
| `fadeIn` | 0→1 opacity |
| `slideUp` | 아래→위 슬라이드 + 페이드 |
| `fadeInScale` | 0.9→1 스케일 + 페이드 (탄성) |
| `ai-pulse` | AI 상태 점 펄스 (2초 주기) |
