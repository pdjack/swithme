# 스윗미 (Sweet Me) - 프리미엄 대시보드

이 프로젝트는 학생들을 위한 몰입형 학습 관리 대시보드입니다.

## 주요 기능
* **DashBoard:** 목표 달성 및 일일 회고 관리.
* **Deep Focus Timer:** 뽀모도로 타이머 및 스톱워치 기능 (Zen 모드 지원).
* **Timetable:** 주간/일간 학습 시간표 관리.
* **Subjects:** 과목별 색상 지정 및 관리.

## 실행 방법

본 프로젝트는 `Vite`를 사용하도록 구성되었습니다.

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **개발 서버 실행**
   ```bash
   npm start
   ```
   브라우저에서 `http://localhost:5173` 접속.

## 프로젝트 구조
* `index.html`: 메인 대시보드 구조.
* `style.css`: 전체 스타일링 (Glassmorphism 적용).
* `js/`: 핵심 로직 (Store, UI, Timer 등).
* `agent.md`: 에이전트 작업 가이드 (AI 협업용).
