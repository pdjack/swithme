---
name: commit
description: 변경 사항을 분석하고 커밋 메시지를 생성하여 Git 커밋을 수행한다
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash(git *)
argument-hint: "[커밋 메시지 힌트 (선택)]"
---

# Git Commit

변경 사항을 분석하고, 적절한 커밋 메시지를 생성하여 커밋한다.

## 프로세스

1. `git status`로 변경 사항 확인 (untracked 포함)
2. `git diff`로 staged/unstaged 변경 내용 확인
3. `git log --oneline -5`로 최근 커밋 스타일 확인
4. 변경 내용을 분석하여 커밋 메시지 작성
5. 관련 파일을 staging하고 커밋 실행

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
