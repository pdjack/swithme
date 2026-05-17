---
name: commit
description: 변경 사항을 분석하고 커밋 메시지를 생성하여 Git 커밋 + 푸시(+ 필요 시 머지)까지 수행한다
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash(git *)
argument-hint: "[커밋 메시지 힌트 (선택)]"
---

# Git Commit + Push

변경 사항을 분석하고 커밋한 뒤, 원격으로 푸시한다. 작업 브랜치가 main이 아니면 main으로 머지 후 푸시한다.

## 프로세스

1. `git status`로 변경 사항 확인 (untracked 포함)
2. `git diff`로 staged/unstaged 변경 내용 확인
3. `git log --oneline -5`로 최근 커밋 스타일 확인
4. 변경 내용을 분석하여 커밋 메시지 작성
5. 관련 파일을 staging하고 커밋 실행
6. **현재 브랜치 확인** (`git rev-parse --abbrev-ref HEAD`)
   - **main 브랜치**: 곧바로 `git push origin main` 실행
   - **다른 브랜치**:
     a. 해당 브랜치 푸시 (`git push -u origin <branch>`)
     b. `git checkout main && git pull --ff-only origin main`
     c. `git merge --no-ff <branch>` (충돌 발생 시 즉시 중단하고 사용자에게 알림)
     d. `git push origin main`
     e. 원래 브랜치로 복귀 (`git checkout <branch>`)
7. 푸시 결과(커밋 해시 범위)를 사용자에게 보고

## 커밋 메시지 컨벤션

- **feat:** 새 기능
- **fix:** 버그 수정
- **docs:** 문서 변경
- **refactor:** 리팩토링
- **test:** 테스트 추가/수정
- **perf:** 성능 개선
- **chore:** 의존성, 설정 등 기타 변경

## 규칙

- 커밋 메시지는 영어로, 첫 줄 72자 이내
- 현재형 사용 ("add" not "added")
- `.env`, `credentials.json` 등 민감 파일은 커밋하지 않음
- `git add .` 대신 관련 파일만 선별적으로 staging
- 사용자가 힌트를 제공하면 해당 내용을 커밋 메시지에 반영
- 커밋 메시지 끝에 Co-Authored-By 라인 추가:
  `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`
- HEREDOC 방식으로 커밋 메시지 전달
- **푸시 단계는 사용자 확인 없이 자동 진행** (이 skill 호출 자체가 푸시 동의로 간주)
- `--force` / `--no-verify`는 절대 사용하지 않음
- 머지 충돌이 발생하면 푸시를 중단하고 사용자에게 상황을 알린 뒤 멈춤
- 작업 브랜치가 main이면 머지 단계를 생략 (푸시만 실행)
