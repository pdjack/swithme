# SwitMe - JS 코드 전체 정리

> `js/` 폴더 내 모든 JavaScript 모듈의 구조, 역할, 주요 함수를 정리한 문서입니다.

---

## 목차

1. [main.js - 앱 진입점](#1-mainjs---앱-진입점)
2. [store.js - 상태 관리](#2-storejs---상태-관리)
3. [timer.js - 타이머 / 회고](#3-timerjs---타이머--회고)
4. [ui.js - UI 이벤트 & 데스크탑 렌더링](#4-uijs---ui-이벤트--데스크탑-렌더링)
5. [tasks.js - 할 일 목록](#5-tasksjs---할-일-목록)
6. [timetable.js - 타임테이블](#6-timetablejs---타임테이블)
7. [device.js - 디바이스 감지](#7-devicejs---디바이스-감지)
8. [mobile.js - 모바일 전용 UI](#8-mobilejs---모바일-전용-ui)
9. [analysis.js - 분석 모듈](#9-analysisjs---분석-모듈)
10. [icons.js - 인라인 SVG 아이콘](#10-iconsjs---인라인-svg-아이콘)
11. [모듈 의존성 다이어그램](#11-모듈-의존성-다이어그램)

---

## 1. main.js - 앱 진입점

**역할**: DOMContentLoaded 시 앱 전체를 초기화하는 엔트리 포인트.

```js
import { updateDashboardDateDisplay, setupEventListeners, renderSubjectManager } from './ui.js';
import { renderTasks, renderSubjectOptions } from './tasks.js';
import { renderTimetable } from './timetable.js';
import { updateTimerDisplay, loadTodayReflection } from './timer.js';
import { setupMobileUI } from './mobile.js';
import { watchDeviceLayout } from './device.js';
import './analysis.js'; // side effects (window 전역 함수 등록)
```

### `init()`
1. `watchDeviceLayout()` — 디바이스 감지 및 resize 시 레이아웃 자동 전환
2. `updateDashboardDateDisplay()` — 대시보드 날짜 표시
3. `renderTasks()` / `renderTimetable()` — 할 일 & 타임테이블 렌더링
4. `renderSubjectOptions()` / `renderSubjectManager()` — 과목 셀렉트 & 관리자 렌더링
5. `loadTodayReflection()` — 오늘 회고 데이터 로드
6. `setupEventListeners()` — 이벤트 리스너 등록
7. `updateTimerDisplay()` — 타이머 UI 초기화
8. `setupMobileUI()` — 모바일 UI 초기화
9. `initStaticIcons()` — 정적 HTML의 `<i data-lucide>` 요소를 인라인 SVG로 일괄 변환

---

## 2. store.js - 상태 관리

**역할**: 앱 전역 상태(`state`) 관리 및 localStorage 영속화.

### `state` 객체 구조

| 필드 | 타입 | 설명 |
|------|------|------|
| `tasks` | `Array` | 할 일 목록 (`id`, `subject`, `name`, `duration`, `completed`, `date`) |
| `subjects` | `Array` | 과목 목록 (`id`, `name`, `color`) |
| `timer` | `Object` | 타이머 상태 (`mode`, `seconds`, `totalDuration`, `stopwatchSeconds`, `isRunning`, `interval`, `activeTaskId`, `isZenMode`) |
| `timetables` | `Array` | 타임테이블 목록 (`id`, `name`, `history[]`) — 각 타임테이블이 독립된 학습 세션 기록을 보유 |
| `activeTimetableId` | `string` | 현재 활성 타임테이블 ID |
| `reflections` | `Object` | 날짜별 하루 회고 (`{date: {achievement, time, wrong, review, homework, total}}`) |
| `analysisResults` | `Array` | 분석 결과 이력 |
| `selectedDate` | `string` | 현재 선택된 날짜 (YYYY-MM-DD) |

### 기본 과목 데이터

| ID | 이름 | 색상 |
|----|------|------|
| ENG | 영어 | `#E74C3C` |
| MATH | 수학 | `#3F51B5` |
| KOR | 국어 | `#4CAF50` |
| SCI | 과학 | `#E67E22` |
| OTH | 기타 | `#8E8E93` |

### Export 함수

| 함수 | 설명 |
|------|------|
| `saveToLocal()` | state의 tasks, timetables, activeTimetableId, subjects, reflections, analysisResults를 localStorage에 저장 |
| `getActiveHistory()` | 현재 활성 타임테이블의 history 배열 반환 |
| `getSubjectColor(id)` | 과목 ID로 색상 반환 (없으면 `#8E8E93`) |
| `formatSeconds(totalSeconds)` | 초를 `HH:MM:SS` 형식 문자열로 변환 |

---

## 3. timer.js - 타이머 / 회고

**역할**: 타이머(카운트다운) & 스톱워치 로직, 세션 기록, 하루 회고 관리.

### Export 함수

| 함수 | 설명 |
|------|------|
| `updateTimerDisplay()` | 타이머 모드에 따라 시간 표시 및 프로그레스 링 업데이트 |
| `startTimer()` | 타이머 시작, 버튼 STOP으로 변경, 젠 모드 오버레이 활성화 |
| `stopTimer()` | 타이머 정지, 세션 기록 저장 |
| `resetTimer()` | 타이머를 기본값(25분)으로 초기화 |
| `loadTodayReflection()` | 오늘 날짜의 회고 데이터 로드 |

### window 전역 함수

| 함수 | 설명 |
|------|------|
| `editTimer()` | 프롬프트로 타이머 시간 직접 설정 (MM:SS) |
| `updateReflection()` | 하루 회고 점수 계산 (달성률 자동 + 수동 입력 4개 항목) |
| `saveDailyReflection()` | 회고 데이터를 state에 저장 |
| `loadReflectionForDate(date)` | 특정 날짜의 회고 데이터 불러오기 |
| `validateScore(input)` | 회고 점수 입력값 검증 (0~20 범위) |

### 내부 함수

| 함수 | 설명 |
|------|------|
| `completeSession()` | 세션 완료 시 기록 저장 → 알림 → 리셋 |
| `recordSession()` | 학습 세션을 history에 기록 (5초 미만은 무시), 태스크 duration 갱신 |

### 회고 점수 체계 (각 항목 0~20점, 총 100점)
- **달성률** (`achievement`): 완료 태스크 비율 × 20 (자동 계산)
- **시간 관리** (`time`): 수동 입력
- **오답 정리** (`wrong`): 수동 입력
- **복습 진행** (`review`): 수동 입력
- **숙제 완수** (`homework`): 수동 입력

---

## 4. ui.js - UI 이벤트 & 데스크탑 렌더링

**역할**: 데스크탑 탭 전환, 캘린더 렌더링, 과목 관리자, 이벤트 리스너 설정.

### Export 함수

| 함수 | 설명 |
|------|------|
| `switchTab(tab)` | 탭 전환 (`dashboard`, `plan`, `settings`, `analyze`) |
| `renderSubjectManager()` | 과목 관리 UI 렌더링 (드래그앤드롭 정렬, 이름/색상 변경, 삭제) |
| `updateDashboardDateDisplay()` | 대시보드 상단 날짜 표시 업데이트 |
| `setupEventListeners()` | 전체 이벤트 리스너 등록 |

### `setupEventListeners()`에서 등록하는 이벤트

| 대상 | 동작 |
|------|------|
| `#open-task-modal` | 할 일 추가 모달 열기 |
| `#close-task-modal` | 할 일 추가 모달 닫기 |
| `#confirm-add-task` | 할 일 추가 확인 (state에 push, 저장, 렌더) |
| `#display-date` / `#date-picker` | 날짜 선택기 연동 |
| `#exit-zen-btn` | 젠 모드 종료 |
| `#mode-timer-btn` / `#mode-stopwatch-btn` | 타이머/스톱워치 모드 전환 |
| `#prev-month` / `#next-month` | 캘린더 월 이동 |
| `#add-subject-btn` | 새 과목 추가 |
| `.btn-start` / `.btn-reset` | 타이머 시작/정지, 리셋 |
| `mousemove` | 분석 카드 마우스 효과 (CSS 변수 `--x`, `--y`) |

### window 전역 함수 (과목 관리)

| 함수 | 설명 |
|------|------|
| `handleDragStart/Over/Drop/End` | 과목 드래그앤드롭 정렬 |
| `updateSubjectName(id, name)` | 과목 이름 변경 |
| `updateSubjectColor(id, color)` | 과목 색상 변경 |
| `deleteSubject(id)` | 과목 삭제 (최소 1개 유지) |

### 내부 함수

| 함수 | 설명 |
|------|------|
| `renderCalendar()` | 월별 캘린더 렌더링 (날짜별 회고 점수 표시) |

---

## 5. tasks.js - 할 일 목록

**역할**: 할 일 목록 렌더링 및 CRUD 조작.

### Export 함수

| 함수 | 설명 |
|------|------|
| `renderTasks()` | 선택 날짜의 태스크를 과목별 그룹으로 렌더링 + 모바일 동기화 호출 |
| `renderSubjectOptions()` | 과목 select 옵션 렌더링 |

### window 전역 함수

| 함수 | 설명 |
|------|------|
| `deleteTask(e, id)` | 태스크 삭제 (진행 중인 태스크는 삭제 불가) |
| `selectTask(id)` | 태스크 선택/해제 (타이머 실행 중이면 무시) |
| `toggleComplete(e, id)` | 태스크 완료 토글 |

### 렌더링 구조
- 과목별 그룹(`subject-group`) → 과목 헤더(이름 + 총 학습 시간) → 개별 태스크 아이템
- 빈 목록 시 "오늘의 계획이 없습니다." 표시

---

## 6. timetable.js - 타임테이블

**역할**: 24시간(06:00~) 타임테이블을 10분 단위 슬롯으로 렌더링. 멀티 탭(타임테이블 여러 개) 관리.

### Export 함수

| 함수 | 설명 |
|------|------|
| `renderTimetable()` | 데스크탑(`#timetable-root`) + 모바일(`#m-timetable-root`) 타임테이블 동시 렌더링 (활성 탭 기준) |

### 내부 함수

| 함수 | 설명 |
|------|------|
| `buildTimetableRows(root)` | 24시간 × 6슬롯(10분) 그리드 생성, `getActiveHistory()` 세션과 겹치는 슬롯에 과목 색상 채우기 |
| `renderTabs()` | PC + 모바일 탭 바 동시 렌더링 |
| `renderDesktopTabs()` | PC 탭 바 렌더링 (◀/▶ 화살표 포함) |
| `renderMobileTabs()` | 모바일 탭 바 렌더링 (스와이프 스크롤, 롱프레스 컨텍스트 메뉴 포함) |
| `updateScrollArrows()` | PC 전용 — 스크롤 위치 확인 후 ◀/▶ 버튼 표시 갱신 |
| `scrollActiveTabIntoView(listEl)` | 활성 탭이 뷰포트 안에 오도록 자동 스크롤 |
| `startRenameTab(tabEl, nameSpan, id)` | PC 탭 인라인 이름 편집 모드 진입 |
| `showMobileTabMenu(targetTab, ttId)` | 모바일 탭 롱프레스 컨텍스트 메뉴 표시 (이름 변경/삭제) |
| `closeMobileTabMenu()` | 모바일 탭 컨텍스트 메뉴 닫기 |
| `showPlanSlotModal(startSlot, endSlot)` | 빈 슬롯 클릭/드래그 시 계획 추가 모달 표시 |
| `showPlanDetailModal(plan)` | 기존 계획 블록 클릭 시 상세 모달 표시 (삭제/취소/수정) |
| `switchTimetable(id)` | 활성 타임테이블 전환 |
| `addTimetable()` | 새 타임테이블 추가 + 자동 활성화 |
| `deleteTimetable(id)` | 타임테이블 삭제 (최소 1개 유지), 인접 탭 자동 활성화 |
| `renameTimetable(id, name)` | 타임테이블 이름 변경 |

### 탭 인터랙션
- 탭 클릭: 활성 탭 전환
- 탭 더블클릭: 인라인 이름 편집 (Enter/blur 저장)
- `×` 버튼: 탭 삭제 (2개 이상일 때만 표시)
- `+` 버튼: 새 탭 추가
- PC `◀`/`▶` 버튼: 탭 목록 스크롤 (오버플로우 시만 표시)
- 모바일: 터치 스와이프로 탭 스크롤
- 모바일 롱프레스(500ms): 컨텍스트 메뉴 표시 → 이름 변경(`prompt`) / 삭제(`confirm`, 2개 이상일 때만 활성)

### Clear 버튼
- `#clear-timetable-btn` / `#m-clear-timetable-btn` 클릭 시 활성 탭의 history만 삭제 + 태스크 duration 초기화

---

## 7. device.js - 디바이스 감지

**역할**: 모바일/데스크탑 판별 및 레이아웃 자동 전환.

### 판별 기준
- 터치스크린 지원 (`navigator.maxTouchPoints > 0` 또는 `ontouchstart`)
- 또는 화면 너비 ≤ 768px

### Export 함수

| 함수 | 설명 |
|------|------|
| `isMobileDevice()` | 현재 디바이스가 모바일인지 boolean 반환 |
| `applyDeviceLayout()` | `body[data-device]` 속성 설정 + `#desktop-shell` / `#mobile-shell` 표시 전환 |
| `watchDeviceLayout(onSwitch)` | resize 이벤트 감시, 레이아웃 변경 시 콜백 호출 |

---

## 8. mobile.js - 모바일 전용 UI

**역할**: 모바일 전용 이벤트 핸들러, 렌더링 로직. 데스크탑과 동일한 state를 공유하며 PC 함수를 재사용.

### Export 함수

| 함수 | 설명 |
|------|------|
| `setupMobileUI()` | 모바일 UI 전체 초기화 (이벤트 바인딩 + 첫 렌더) |
| `renderMobileTasks()` | 모바일 할 일 목록 렌더링 (재생/완료 버튼 포함) |
| `renderMobileTimetable()` | 모바일 타임테이블 렌더링 |

### 내부 함수

| 함수 | 설명 |
|------|------|
| `syncMobileTimerDisplay()` | 모바일 타이머 표시 동기화 (`#m-timer-display`, `#m-timer-progress`) |
| `syncMobileStartBtn(isRunning)` | 모바일 START/STOP 버튼 상태 동기화 |
| `switchMobileTab(tab)` | 모바일 탭 전환 (`dashboard`, `plan`, `analyze`, `settings`) |
| `renderMobileCalendar()` | 모바일 캘린더 렌더링 |
| `renderMobileSubjectManager()` | 모바일 과목 관리자 렌더링 |
| `syncMobileReflectionInputs()` | 모바일 회고 입력 필드 동기화 |
| `initColumnTabs()` | 할 일/회고 컬럼 탭 초기화 (이벤트 바인딩 + 인디케이터) |
| `switchColumnTab(tabName)` | 할 일/회고 컬럼 탭 전환 (`tasks` / `reflection`) |
| `updateTabIndicator()` | 탭 밑줄 인디케이터 위치 업데이트 |
| `syncMobileAnalysisContent()` | 데스크탑 분석 결과를 모바일 영역에 복사 |
| `updateMobileDateDisplay()` | 모바일 상단 날짜 표시 업데이트 |

### window 전역 함수

| 함수 | 설명 |
|------|------|
| `syncMobileReflection()` | 모바일 회고 점수 재계산 |
| `saveMobileReflection()` | 모바일에서 회고 저장 |
| `switchColumnTab(tabName)` | 할 일/회고 컬럼 탭 전환 |
| `renderMobileTasks()` | 전역 노출 (다른 모듈에서 호출용) |
| `renderMobileTimetable()` | 전역 노출 |

### 모바일 이벤트 바인딩 (`setupMobileUI`)

| 대상 | 동작 |
|------|------|
| `.m-tab` 버튼들 | 탭 전환 |
| `#m-mode-timer-btn` / `#m-mode-stopwatch-btn` | 타이머/스톱워치 모드 전환 (PC 동기화 포함) |
| `#m-btn-start` | START/STOP 토글 |
| `#m-btn-reset` | 타이머 리셋 |
| `#m-zen-btn` | 몰입 모드 진입 |
| `#m-open-task-modal-btn` / `#m-open-task-btn` | 할 일 추가 모달 열기 |
| `#m-clear-timetable-btn` | 타임테이블 초기화 |
| `#m-task-list` (이벤트 위임) | 태스크 재생/완료 토글 |
| `#m-prev-month` / `#m-next-month` | 캘린더 월 이동 |
| `#m-add-subject-btn` | 새 과목 추가 |
| `#confirm-add-task` | 모달 추가 후 모바일 목록 갱신 |

### PC-모바일 동기화 방식
- PC 타이머 표시(`#timer-display`)를 **MutationObserver**로 감시하여 모바일 타이머 자동 갱신

---

## 9. analysis.js - 분석 모듈

**역할**: 학습 성향 테스트, 데이터 분석, AI 통합 리포트, 학습 계획 자동 생성.

### 데이터 구조

#### 테스트 질문 (`analysisQuestions` - 7문항)

| ID | 카테고리 | 내용 |
|----|----------|------|
| q1 | environment | 공부 중 음악/백색소음 청취 여부 |
| q2 | execution | 즉시 행동(3초 법칙) 실천 여부 |
| q3 | method | 에빙하우스 망각곡선 기반 복습 여부 |
| q4 | method | 아웃풋(Output) 공부 비중 |
| q5 | routine | 기상/취침 시간 규칙성 |
| q6 | nutrition | 고당분 간식 섭취 빈도 |
| q7 | metacognition | 약점 키워드 별도 관리 여부 |

#### 페르소나 (`personas` - 6종)

| ID | 이름 | 설명 |
|----|------|------|
| HIGH_POTENTIAL | 완벽한 전략가 | 공부 루틴/방법론이 정밀, 고난도 문항 집중 권장 |
| MULTITASKING_TRAP | 멀티태스킹 함정형 | 환경 관리 부족으로 몰입도 분산 |
| PASSIVE_STUDENT | 가짜 공부 중독형 | 개념 정리에만 시간 소모, 인출 연습 필요 |
| PROCRASTINATOR | 완벽주의 미루기형 | 계획은 거창하지만 실행 문턱이 높음 |
| INCONSISTENT_ROUTINE | 불규칙 엔진형 | 방법은 좋으나 생활 루틴 불안정 |
| UNKNOWN | 성장하는 비기너 | 패턴 미확립 상태 |

### window 전역 함수 — 테스트

| 함수 | 설명 |
|------|------|
| `renderAnalysisTest()` | 현재 step의 질문 렌더링 (프로그레스 바 포함) |
| `submitAnswer(qId, optionIdx)` | 답변 기록 후 다음 step 진행 |
| `finishAnalysisTest()` | 점수 합산 + 페르소나 판별 + 결과 저장 |
| `renderAnalysisResult(res)` | 테스트 결과 화면 렌더링 |

### window 전역 함수 — 데이터 분석

| 함수 | 설명 |
|------|------|
| `startAnalysis(type)` | 분석 유형 라우터 (`test`, `data`, `history`, `ai_integrated`) |
| `renderDataAnalysisFilter()` | 기간 선택 UI (1주일 / 1개월) |
| `performDataAnalysis(days)` | Reflection 데이터 기반 평균 지표 산출 |
| `renderDataAnalysisResult(res, days)` | 데이터 분석 결과 테이블 렌더링 |

### window 전역 함수 — 히스토리

| 함수 | 설명 |
|------|------|
| `renderAnalysisHistory()` | 과거 분석 결과 목록 렌더링 (카드 그리드) |
| `deleteAnalysisResult(id, event)` | 특정 분석 결과 삭제 |

### window 전역 함수 — AI 통합 분석

| 함수 | 설명 |
|------|------|
| `performIntegratedAnalysis()` | 최신 테스트 + 데이터 결과 결합하여 예측 점수 산출 |
| `renderIntegratedResult(res)` | AI 통합 리포트 렌더링 (차트 + 히트맵 + 처방전) |
| `initIntegratedCharts(res)` | Chart.js로 성취도 추세 꺾은선 그래프 생성 (7일 + 예측) |
| `renderImmersionHeatmap()` | 28일 학습 몰입도 히트맵 렌더링 |

### window 전역 함수 — AI 학습 계획

| 함수 | 설명 |
|------|------|
| `generateTomorrowPlan()` | 최근 학습 데이터 + 페르소나 기반 내일 추천 과제 3개 생성 |
| `renderAIPlanModal(plans)` | AI 추천 계획 모달 렌더링 |
| `applyAIPlan(plans)` | 추천 과제를 내일 날짜로 state에 추가 |
| `updateAIAdaptiveFeedback()` | 분석 탭 진입 시 AI 피드백 메시지 동적 생성 |

### AI 예측 점수 공식
```
predictedScore = (데이터분석점수 / 20 × 100) × 0.7 + (테스트점수 / 7 × 100) × 0.3
```

### AI 적응형 피드백 조건
1. 오답 정리 < 10 → 오답 정리 경고
2. 복습 점수 5점 이상 하락 → 망각 주의보
3. 달성률 ≥ 18 → 긍정 피드백
4. 시간 관리 < 10 → 시간 관리 경고
5. 기본 → 격려 메시지

---

## 10. icons.js - 인라인 SVG 아이콘

**역할**: Lucide v1.8.0 기반 인라인 SVG 아이콘 모듈. CDN 의존 제거, PWA 오프라인 지원.

### 주요 export

| 함수 | 설명 |
|------|------|
| `icon(name, size?, extraStyle?)` | 인라인 SVG 문자열 반환. 동적 HTML에서 사용 |
| `initStaticIcons()` | 정적 HTML의 `<i data-lucide="...">` 를 인라인 SVG로 일괄 변환 (초기화 시 1회) |

### 사용 패턴

- **동적 HTML** (template literal): `${icon('trash-2')}`, `${icon('sparkles', 14)}`
- **정적 HTML** (index.html): `<i data-lucide="icon-name"></i>` → `initStaticIcons()`가 변환
- 아이콘 목록 및 모양 묘사: `directives/icon-reference.md` 참조

### window 전역

| 함수 | 설명 |
|------|------|
| `window.icon` | `icon()` 함수를 인라인 onclick에서 사용할 수 있도록 노출 |

---

## 11. 모듈 의존성 다이어그램

```
main.js
├── ui.js
│   ├── store.js
│   ├── tasks.js → store.js
│   └── timetable.js → store.js, tasks.js
├── tasks.js → store.js
├── timetable.js → store.js, tasks.js
├── timer.js → store.js, tasks.js, timetable.js
├── mobile.js → store.js, timer.js, tasks.js, ui.js
├── device.js (독립)
└── analysis.js → store.js (side effects로 window 전역 등록)
```

### 데이터 흐름
```
localStorage ←→ store.js (state)
                   ↕
        ┌──────────┼──────────┐
        ↓          ↓          ↓
    timer.js   tasks.js   analysis.js
    (세션기록)  (태스크CRUD)  (분석결과)
        ↓          ↓
    timetable.js  ui.js ←→ mobile.js
    (시각화)      (데스크탑)   (모바일)
```

### localStorage 키

| 키 | 내용 |
|----|------|
| `switme_tasks` | 할 일 목록 |
| `switme_timetables` | 타임테이블 목록 (`[{id, name, history[]}]`) |
| `switme_active_timetable_id` | 현재 활성 타임테이블 ID |
| `switme_subjects` | 과목 목록 |
| `switme_reflections` | 날짜별 하루 회고 |
| `switme_analysis` | 분석 결과 이력 |

> **마이그레이션**: `switme_timetables`가 없고 `switme_history`가 있으면 자동으로 첫 번째 탭의 history로 이전.
