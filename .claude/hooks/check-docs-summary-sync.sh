#!/bin/bash
# swithme 전용 문서요약 동기화 리마인더 — Stop 훅
# 규약: 유저 읽기용 문서(docs/ 전체, README, ui-ux-guide, INDEX, 활용정보/*)가 바뀌면
#       루트 문서요약.html의 해당 섹션도 같은 작업에서 갱신해야 한다.
# 발동: 위 문서 중 하나라도 변경됨 + 문서요약.html 미변경 → 갱신 권고.
# (글로벌 Directives/Planning 레이아웃과 무관. swithme 고유 docs/+문서요약.html 레이아웃 전용.)

cd "$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0

changed=$(git status --porcelain -uall 2>/dev/null | sed 's/^...//')

readingdocs=$(printf '%s\n' "$changed" | grep -E '^(docs/.*\.md|README\.md|directives/ui-ux-guide\.md|directives/INDEX\.md|활용정보/.*\.md)$')
summary=$(printf '%s\n' "$changed" | grep -E '^문서요약\.html$')

# 읽기용 문서 변경 없으면 종료
[ -n "$readingdocs" ] || exit 0
# 이미 문서요약.html도 함께 변경했으면 종료
[ -z "$summary" ] || exit 0

msg="[문서요약 동기화] 유저 읽기용 문서가 바뀌었으나 문서요약.html 미변경.\\nUX/기획/진척/개선현황 변화면 문서요약.html 해당 섹션도 갱신 필요. 코드 식별자·경로 제외. 순수 내부 표현 수정이면 무시."
printf '{"systemMessage": "%s"}' "$msg"
exit 0
