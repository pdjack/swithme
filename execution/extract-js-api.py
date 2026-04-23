"""
extract-js-api.py — js/*.js에서 모듈 구조, API 표면, 의존성을 자동 추출

출력 내용:
  1. 모듈별 export 함수/변수
  2. window 전역 등록 함수
  3. import 의존성 (모듈 간)
  4. localStorage 키
  5. 아이콘 키 목록 (icons.js SVG_PATHS)
  6. 모듈 의존성 다이어그램

사용법:
  python execution/extract-js-api.py
"""

import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
JS_DIR = PROJECT_ROOT / "js"


def extract_exports(content):
    """export 함수/변수 추출"""
    exports = []

    # export function name(...)
    for m in re.finditer(r'export\s+function\s+(\w+)\s*\(([^)]*)\)', content):
        exports.append(("function", m.group(1), m.group(2).strip()))

    # export let/const/var name
    for m in re.finditer(r'export\s+(let|const|var)\s+(\w+)', content):
        exports.append(("variable", m.group(2), m.group(1)))

    # export { name1, name2 }
    for m in re.finditer(r'export\s*\{([^}]+)\}', content):
        names = [n.strip().split(' as ')[0].strip() for n in m.group(1).split(',')]
        for name in names:
            if name:
                exports.append(("re-export", name, ""))

    return exports


def extract_window_globals(content):
    """window.xxx = ... 등록 추출"""
    globals_list = []

    # window.functionName = functionName 또는 window.functionName = function(...)
    for m in re.finditer(r'window\.(\w+)\s*=', content):
        name = m.group(1)
        if name not in globals_list:
            globals_list.append(name)

    return globals_list


def strip_comments(content):
    """JS 주석 제거 (블록 /* */ 및 라인 //)"""
    # 블록 주석 제거
    content = re.sub(r'/\*[\s\S]*?\*/', '', content)
    # 라인 주석 제거 (문자열 내부 제외 — 간단한 근사)
    content = re.sub(r'(?<!["\':])//.*$', '', content, flags=re.MULTILINE)
    return content


def extract_imports(content, current_file):
    """import 문 추출 (로컬 모듈만)"""
    # 주석 제거 후 파싱
    clean = strip_comments(content)
    imports = []
    for m in re.finditer(r"import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['\"]\.\/(\w+)(?:\.js)?['\"]", clean):
        named = m.group(1)
        default = m.group(2)
        module = m.group(3)
        if named:
            names = [n.strip() for n in named.split(',')]
            imports.append((module, names))
        elif default:
            imports.append((module, [default]))

    # import './module.js' (side effects)
    for m in re.finditer(r"import\s+['\"]\.\/(\w+)(?:\.js)?['\"]", clean):
        module = m.group(1)
        imports.append((module, ["(side effects)"]))

    return imports


def extract_localstorage_keys(content):
    """localStorage.getItem/setItem 키 추출"""
    keys = set()
    for m in re.finditer(r"localStorage\.\w+Item\s*\(\s*['\"]([^'\"]+)['\"]", content):
        keys.add(m.group(1))
    return sorted(keys)


def extract_svg_paths_keys(content):
    """icons.js의 SVG_PATHS 객체에서 아이콘 키 추출"""
    # SVG_PATHS 객체 블록만 추출
    match = re.search(r'const SVG_PATHS\s*=\s*\{', content)
    if not match:
        return []

    start = match.end()
    depth = 1
    end = start
    while end < len(content) and depth > 0:
        if content[end] == '{':
            depth += 1
        elif content[end] == '}':
            depth -= 1
        end += 1

    block = content[start:end]
    # 'key': 또는 key: 패턴 (들여쓰기된 줄에서만)
    keys = []
    for m in re.finditer(r"^\s+['\"]?([\w-]+)['\"]?\s*:", block, re.MULTILINE):
        key = m.group(1)
        if key not in keys:
            keys.append(key)
    return keys


def extract_internal_functions(content):
    """export되지 않은 내부 함수 추출"""
    # 모든 function 선언
    all_funcs = set(re.findall(r'(?<!export\s)function\s+(\w+)\s*\(', content))
    # export된 함수
    export_funcs = set(re.findall(r'export\s+function\s+(\w+)', content))
    # window에 등록된 함수
    window_funcs = set(re.findall(r'window\.(\w+)\s*=', content))

    internal = all_funcs - export_funcs - window_funcs
    return sorted(internal)


def build_dependency_diagram(modules_data):
    """모듈 의존성 다이어그램 생성"""
    lines = []
    for name, data in sorted(modules_data.items()):
        deps = [imp[0] for imp in data["imports"]]
        if deps:
            lines.append(f"  {name}.js → {', '.join(d + '.js' for d in deps)}")
        else:
            lines.append(f"  {name}.js (독립)")
    return lines


def main():
    if not JS_DIR.exists():
        print(f"ERROR: {JS_DIR} not found", file=sys.stderr)
        sys.exit(1)

    js_files = sorted(JS_DIR.glob("*.js"))
    if not js_files:
        print("ERROR: No .js files found", file=sys.stderr)
        sys.exit(1)

    modules_data = {}
    all_ls_keys = set()

    for js_file in js_files:
        content = js_file.read_text(encoding="utf-8")
        name = js_file.stem

        exports = extract_exports(content)
        window_globals = extract_window_globals(content)
        imports = extract_imports(content, name)
        ls_keys = extract_localstorage_keys(content)
        internal_funcs = extract_internal_functions(content)
        all_ls_keys.update(ls_keys)

        modules_data[name] = {
            "exports": exports,
            "window_globals": window_globals,
            "imports": imports,
            "ls_keys": ls_keys,
            "internal_funcs": internal_funcs,
            "lines": content.count('\n') + 1,
        }

        # icons.js 전용: SVG_PATHS 키 추출
        if name == "icons":
            modules_data[name]["icon_keys"] = extract_svg_paths_keys(content)

    # === 출력 ===

    for name, data in sorted(modules_data.items()):
        print("=" * 60)
        print(f"## {name}.js ({data['lines']}줄)")
        print("=" * 60)

        # Imports
        if data["imports"]:
            print("\n  ### Imports")
            for module, names in data["imports"]:
                print(f"    ← {module}.js: {', '.join(names)}")

        # Exports
        if data["exports"]:
            print("\n  ### Exports")
            for kind, func_name, params in data["exports"]:
                if kind == "function":
                    print(f"    function {func_name}({params})")
                elif kind == "variable":
                    print(f"    {params} {func_name}")
                else:
                    print(f"    {func_name} (re-export)")

        # Window globals
        if data["window_globals"]:
            print("\n  ### window 전역")
            for func_name in data["window_globals"]:
                print(f"    window.{func_name}")

        # Internal functions
        if data["internal_funcs"]:
            print("\n  ### 내부 함수")
            for func_name in data["internal_funcs"]:
                print(f"    {func_name}()")

        # localStorage
        if data["ls_keys"]:
            print("\n  ### localStorage 키")
            for key in data["ls_keys"]:
                print(f"    '{key}'")

        # Icon keys
        if "icon_keys" in data and data["icon_keys"]:
            print(f"\n  ### SVG 아이콘 키 ({len(data['icon_keys'])}개)")
            for key in data["icon_keys"]:
                print(f"    {key}")

        print()

    # 모듈 의존성 다이어그램
    print("=" * 60)
    print("## 모듈 의존성")
    print("=" * 60)
    for line in build_dependency_diagram(modules_data):
        print(line)
    print()

    # 전체 localStorage 키
    if all_ls_keys:
        print("=" * 60)
        print(f"## localStorage 키 (총 {len(all_ls_keys)}개)")
        print("=" * 60)
        for key in sorted(all_ls_keys):
            print(f"  {key}")
        print()

    # 요약
    total_exports = sum(len(d["exports"]) for d in modules_data.values())
    total_globals = sum(len(d["window_globals"]) for d in modules_data.values())
    total_lines = sum(d["lines"] for d in modules_data.values())
    print("=" * 60)
    print("## 요약")
    print("=" * 60)
    print(f"  모듈: {len(modules_data)}개")
    print(f"  Export 함수/변수: {total_exports}개")
    print(f"  Window 전역: {total_globals}개")
    print(f"  localStorage 키: {len(all_ls_keys)}개")
    print(f"  총 코드: {total_lines:,}줄")


if __name__ == "__main__":
    main()
