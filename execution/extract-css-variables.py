"""
extract-css-variables.py — style.css에서 디자인 시스템 정보를 자동 추출

출력 내용:
  1. CSS 변수 (:root)
  2. 주요 셀렉터 목록 (클래스별 핵심 속성)
  3. 미디어 쿼리 브레이크포인트
  4. @keyframes 애니메이션

사용법:
  python execution/extract-css-variables.py
"""

import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CSS_PATH = PROJECT_ROOT / "style.css"


def extract_root_variables(css_text):
    """`:root { ... }` 블록에서 CSS 변수 추출"""
    # :root 블록 찾기
    match = re.search(r':root\s*\{([^}]+)\}', css_text)
    if not match:
        return []

    block = match.group(1)
    variables = []
    for line in block.strip().split('\n'):
        line = line.strip().rstrip(';')
        if ':' not in line:
            continue
        # --name: value 형태
        m = re.match(r'(--[\w-]+)\s*:\s*(.+)', line)
        if m:
            name = m.group(1)
            value = m.group(2).strip()
            variables.append((name, value))
    return variables


def extract_selectors(css_text):
    """주요 셀렉터와 핵심 속성 추출"""
    # 주석과 @규칙 내부 제거 (미디어 쿼리는 별도 처리)
    results = []

    # 최상위 규칙만 추출 (미디어 쿼리 내부 제외)
    # 간단한 방법: { } 균형을 추적
    depth = 0
    current_selector = ""
    current_body = ""
    in_media = False
    i = 0

    while i < len(css_text):
        ch = css_text[i]

        if ch == '/' and i + 1 < len(css_text) and css_text[i + 1] == '*':
            # 주석 건너뛰기
            end = css_text.find('*/', i + 2)
            i = end + 2 if end != -1 else len(css_text)
            continue

        if ch == '{':
            depth += 1
            if depth == 1:
                current_selector = current_selector.strip()
                current_body = ""
                if current_selector.startswith('@'):
                    in_media = True
            elif depth == 2 and in_media:
                pass  # 미디어 쿼리 내부 규칙 건너뛰기
            i += 1
            continue

        if ch == '}':
            if depth == 1 and not in_media:
                # 최상위 규칙 완료
                if current_selector and not current_selector.startswith('@'):
                    props = parse_properties(current_body)
                    if props:
                        results.append((current_selector, props))
                current_selector = ""
                current_body = ""
            elif depth == 1 and in_media:
                in_media = False
                current_selector = ""
            depth -= 1
            i += 1
            continue

        if depth == 0:
            current_selector += ch
        elif depth == 1 and not in_media:
            current_body += ch

        i += 1

    return results


def parse_properties(body):
    """CSS 속성 블록에서 핵심 속성만 추출"""
    # 레이아웃, 크기, 색상 관련 핵심 속성만
    IMPORTANT_PROPS = {
        'display', 'position', 'width', 'height', 'max-width', 'min-height',
        'grid-template-columns', 'grid-template-rows', 'grid-auto-rows',
        'flex', 'flex-direction', 'gap',
        'background', 'background-color',
        'border-radius', 'font-size', 'font-family',
        'z-index', 'overflow',
        'padding', 'margin',
    }

    props = []
    for line in body.strip().split(';'):
        line = line.strip()
        if ':' not in line:
            continue
        prop_name = line.split(':')[0].strip()
        prop_value = ':'.join(line.split(':')[1:]).strip()
        if prop_name in IMPORTANT_PROPS:
            props.append((prop_name, prop_value))
    return props


def extract_media_queries(css_text):
    """미디어 쿼리 브레이크포인트 추출"""
    queries = []
    for match in re.finditer(r'@media\s*\(([^)]+)\)', css_text):
        condition = match.group(1).strip()
        if condition not in [q[0] for q in queries]:
            # 해당 미디어 쿼리 내부의 셀렉터 목록 추출
            start = match.end()
            depth = 0
            selectors = []
            buf = ""
            j = start
            while j < len(css_text):
                ch = css_text[j]
                if ch == '{':
                    depth += 1
                    if depth == 1:
                        pass  # 미디어 쿼리 시작
                    elif depth == 2:
                        sel = buf.strip()
                        if sel:
                            selectors.append(sel)
                        buf = ""
                elif ch == '}':
                    depth -= 1
                    if depth == 0:
                        break
                    buf = ""
                else:
                    if depth == 1:
                        buf += ch
                j += 1
            queries.append((condition, selectors))
    return queries


def extract_keyframes(css_text):
    """@keyframes 애니메이션 이름 추출"""
    return re.findall(r'@keyframes\s+([\w-]+)', css_text)


def filter_important_selectors(selectors):
    """출력할 만한 주요 셀렉터만 필터링"""
    important = []
    for selector, props in selectors:
        # ID 셀렉터, 주요 클래스 (. 접두어), 태그+클래스 조합
        sel = selector.strip()
        # 여러 셀렉터가 ,로 연결된 경우 첫 번째만 판단
        first_sel = sel.split(',')[0].strip()
        if any(c in first_sel for c in ('#', '.')):
            important.append((sel, props))
        elif first_sel in ('body', 'html'):
            important.append((sel, props))
    return important


def main():
    if not CSS_PATH.exists():
        print(f"ERROR: {CSS_PATH} not found", file=sys.stderr)
        sys.exit(1)

    css_text = CSS_PATH.read_text(encoding="utf-8")

    # 1. CSS 변수
    variables = extract_root_variables(css_text)
    if variables:
        print("=" * 60)
        print("## CSS 변수 (:root)")
        print("=" * 60)
        for name, value in variables:
            print(f"  {name:<25} {value}")
        print()

    # 2. 주요 셀렉터
    selectors = extract_selectors(css_text)
    important = filter_important_selectors(selectors)
    if important:
        print("=" * 60)
        print(f"## 주요 셀렉터 (총 {len(important)}개)")
        print("=" * 60)
        for selector, props in important:
            print(f"\n  {selector}")
            for prop_name, prop_value in props:
                print(f"    {prop_name}: {prop_value}")
        print()

    # 3. 미디어 쿼리
    queries = extract_media_queries(css_text)
    if queries:
        print("=" * 60)
        print("## 미디어 쿼리")
        print("=" * 60)
        for condition, sels in queries:
            print(f"\n  @media ({condition})")
            for sel in sels[:10]:  # 최대 10개만 표시
                print(f"    - {sel}")
            if len(sels) > 10:
                print(f"    ... +{len(sels) - 10}개")
        print()

    # 4. 애니메이션
    keyframes = extract_keyframes(css_text)
    if keyframes:
        print("=" * 60)
        print("## @keyframes 애니메이션")
        print("=" * 60)
        for name in keyframes:
            print(f"  {name}")
        print()

    # 요약
    print("=" * 60)
    print("## 요약")
    print("=" * 60)
    print(f"  CSS 변수: {len(variables)}개")
    print(f"  주요 셀렉터: {len(important)}개 (전체 {len(selectors)}개)")
    print(f"  미디어 쿼리: {len(queries)}개")
    print(f"  애니메이션: {len(keyframes)}개")
    print(f"  파일 크기: {len(css_text):,}자 / {css_text.count(chr(10))+1}줄")


if __name__ == "__main__":
    main()
