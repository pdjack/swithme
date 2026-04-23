"""
extract-html-structure.py — index.html에서 UI 구조 정보를 자동 추출

출력 내용:
  1. Desktop Shell 트리 구조 (ID, 클래스, 주요 속성)
  2. Mobile Shell 트리 구조
  3. 공유 컴포넌트 (모달, 오버레이)
  4. PC ↔ 모바일 ID 매핑 테이블

사용법:
  python execution/extract-html-structure.py
"""

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
HTML_PATH = PROJECT_ROOT / "index.html"


class Node:
    """HTML 요소를 트리 노드로 표현"""

    def __init__(self, tag, attrs, parent=None):
        self.tag = tag
        self.attrs = dict(attrs)
        self.parent = parent
        self.children = []

    @property
    def id(self):
        return self.attrs.get("id", "")

    @property
    def classes(self):
        return self.attrs.get("class", "")

    def label(self):
        """노드 요약 라벨 생성"""
        parts = [self.tag]
        if self.id:
            parts.append(f"#{self.id}")
        if self.classes:
            cls_list = self.classes.split()
            # 주요 클래스만 표시 (최대 3개)
            shown = cls_list[:3]
            parts.append("." + ".".join(shown))
            if len(cls_list) > 3:
                parts.append(f"(+{len(cls_list) - 3})")
        # data-* 속성 표시
        for k, v in self.attrs.items():
            if k.startswith("data-") and k != "data-lucide":
                parts.append(f'[{k}="{v}"]')
        return " ".join(parts)


class StructureParser(HTMLParser):
    """index.html을 파싱하여 트리 구조를 구축"""

    # 구조적으로 의미 없는 태그 (트리에서 제외)
    SKIP_TAGS = {"script", "link", "meta", "style", "br", "hr", "img"}
    # self-closing 태그
    VOID_TAGS = {"br", "hr", "img", "input", "meta", "link", "i"}

    def __init__(self):
        super().__init__()
        self.root = Node("root", [], None)
        self.current = self.root
        self.tag_stack = []

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP_TAGS and tag != "input":
            return
        node = Node(tag, attrs, self.current)
        self.current.children.append(node)
        if tag not in self.VOID_TAGS:
            self.current = node
            self.tag_stack.append(tag)

    def handle_endtag(self, tag):
        if tag in self.SKIP_TAGS and tag != "input":
            return
        if tag in self.VOID_TAGS:
            return
        # 스택에서 매칭되는 태그까지 올라감
        while self.tag_stack and self.tag_stack[-1] != tag:
            self.tag_stack.pop()
            if self.current.parent:
                self.current = self.current.parent
        if self.tag_stack:
            self.tag_stack.pop()
            if self.current.parent:
                self.current = self.current.parent


def find_node(node, predicate):
    """조건에 맞는 노드를 DFS로 찾음"""
    if predicate(node):
        return node
    for child in node.children:
        result = find_node(child, predicate)
        if result:
            return result
    return None


def find_all_nodes(node, predicate, results=None):
    """조건에 맞는 모든 노드를 DFS로 수집"""
    if results is None:
        results = []
    if predicate(node):
        results.append(node)
    for child in node.children:
        find_all_nodes(child, predicate, results)
    return results


def is_meaningful(node):
    """트리 출력에 포함할 만한 노드인지 판단"""
    if node.id:
        return True
    if node.classes:
        return True
    if node.attrs.get("data-tab"):
        return True
    # 주요 구조 태그
    if node.tag in ("nav", "section", "header", "footer", "main", "aside", "form"):
        return True
    return False


def print_tree(node, indent=0, max_depth=6):
    """의미 있는 노드만 트리 형태로 출력"""
    if indent > max_depth:
        return

    if is_meaningful(node):
        prefix = "  " * indent
        connector = "├── " if indent > 0 else ""
        print(f"{prefix}{connector}{node.label()}")
        for child in node.children:
            print_tree(child, indent + 1, max_depth)
    else:
        # 의미 없는 노드는 건너뛰고 자식만 처리
        for child in node.children:
            print_tree(child, indent, max_depth)


def extract_id_mapping(root):
    """PC(#xxx) ↔ 모바일(#m-xxx) ID 매핑 추출"""
    all_ids = []
    find_all_nodes(root, lambda n: bool(n.id), all_ids)

    pc_ids = {}
    mobile_ids = {}

    for node in all_ids:
        nid = node.id
        if nid.startswith("m-"):
            mobile_ids[nid] = node
        else:
            pc_ids[nid] = node

    # 매핑 생성: m-xxx → xxx
    mapping = []
    for m_id, m_node in sorted(mobile_ids.items()):
        pc_id = m_id[2:]  # m- 제거
        if pc_id in pc_ids:
            mapping.append((pc_id, m_id))

    return mapping


def extract_shared_components(root):
    """공유 컴포넌트 (모달, 오버레이 등) 추출"""
    shared = []

    def is_shared(node):
        nid = node.id or ""
        cls = node.classes or ""
        return (
            "modal" in nid
            or "modal" in cls
            or "overlay" in nid
            or "overlay" in cls
        )

    find_all_nodes(root, is_shared, shared)
    return shared


def main():
    if not HTML_PATH.exists():
        print(f"ERROR: {HTML_PATH} not found", file=sys.stderr)
        sys.exit(1)

    html_content = HTML_PATH.read_text(encoding="utf-8")
    parser = StructureParser()
    parser.feed(html_content)
    root = parser.root

    # 1. Desktop Shell
    desktop = find_node(root, lambda n: n.id == "desktop-shell")
    if desktop:
        print("=" * 60)
        print("## Desktop Shell (#desktop-shell)")
        print("=" * 60)
        print_tree(desktop)
        print()

    # 2. Mobile Shell
    mobile = find_node(root, lambda n: n.id == "mobile-shell")
    if mobile:
        print("=" * 60)
        print("## Mobile Shell (#mobile-shell)")
        print("=" * 60)
        print_tree(mobile)
        print()

    # 3. 공유 컴포넌트
    shared = extract_shared_components(root)
    if shared:
        print("=" * 60)
        print("## 공유 컴포넌트 (모달/오버레이)")
        print("=" * 60)
        for node in shared:
            print(f"  {node.label()}")
            for child in node.children:
                if is_meaningful(child):
                    print(f"    ├── {child.label()}")
        print()

    # 4. ID 매핑
    mapping = extract_id_mapping(root)
    if mapping:
        print("=" * 60)
        print("## PC ↔ 모바일 ID 매핑")
        print("=" * 60)
        print(f"  {'PC ID':<35} {'모바일 ID'}")
        print(f"  {'-'*35} {'-'*35}")
        for pc_id, m_id in mapping:
            print(f"  #{pc_id:<34} #{m_id}")
        print()

    # 5. 전체 ID 목록
    all_ids = []
    find_all_nodes(root, lambda n: bool(n.id), all_ids)
    print("=" * 60)
    print(f"## 전체 ID 목록 (총 {len(all_ids)}개)")
    print("=" * 60)
    for node in all_ids:
        tag_info = node.tag
        if node.classes:
            tag_info += f" .{node.classes.split()[0]}"
        print(f"  #{node.id:<35} ({tag_info})")


if __name__ == "__main__":
    main()
