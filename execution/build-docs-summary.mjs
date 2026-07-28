#!/usr/bin/env node
/**
 * 유저 읽기용 문서 통합본 생성기 — 원본 마크다운 → 단일 HTML.
 *
 * 왜 스크립트인가: 예전 통합본은 손으로 베낀 사본이라 원본과 어긋났다(섹션 누락·
 * 낡은 마커·유령 문서). 생성물로 바꾸면 원본이 곧 단일 진실원이 되어 어긋날 수 없다.
 *
 * 대상 문서 목록은 CLAUDE.md의 "유저가 읽어야 하는 문서" 표에서 읽는다.
 * 표에 문서를 추가하면 통합본에도 자동 반영되므로 이 스크립트를 고칠 필요가 없다.
 *
 * 사용: node execution/build-docs-summary.mjs [--if-stale]
 *   --if-stale : 원본이 결과물보다 새로울 때만 재생성 (훅에서 사용)
 */

import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_LIST = resolve(ROOT, 'CLAUDE.md');
const OUTPUT = resolve(ROOT, '문서요약.html');
const LIST_HEADING = '### 유저가 읽어야 하는 문서';

const readIfExists = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : null);

/** CLAUDE.md의 문서 목록 표에서 `경로` | 읽는 시점 을 뽑는다. */
function parseDocList(markdown) {
  const section = markdown.split(LIST_HEADING)[1];
  if (!section) {
    throw new Error(`CLAUDE.md에서 "${LIST_HEADING}" 표를 찾지 못했다.`);
  }
  const rows = section.split('\n---')[0].split('\n');
  const docs = [];
  for (const row of rows) {
    const match = row.match(/^\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|\s*$/);
    if (!match) continue;
    const [, path, when] = match;
    if (!path.endsWith('.md')) continue;
    docs.push({ path, when });
  }
  if (docs.length === 0) throw new Error('문서 목록 표를 파싱했으나 항목이 0개다.');
  return docs;
}

/** 파일 경로 → 고정 앵커 id. 파일명이 바뀌지 않는 한 링크가 유지된다. */
function anchorFor(path) {
  return (
    'doc-' +
    path
      .replace(/\.md$/, '')
      .replace(/[/\\]/g, '-')
      .replace(/[^0-9A-Za-z가-힣-]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase()
  );
}

/**
 * 원본 첫 번째 h1을 문서 제목으로 올리고 본문에서는 걷어낸다.
 * (걷어내지 않으면 섹션 헤더와 본문에 같은 제목이 두 번 보인다.)
 */
function splitTitle(markdown, path) {
  const h1 = markdown.match(/^#\s+(.+)$/m);
  if (!h1) {
    return {
      title: path.replace(/^.*[/\\]/, '').replace(/\.md$/, ''),
      body: markdown,
    };
  }
  return {
    title: h1[1].trim(),
    body: markdown.replace(h1[0], '').replace(/^\s+/, ''),
  };
}

const escapeHtml = (text) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
  );

function buildSections(docs) {
  const sections = [];
  const missing = [];
  for (const doc of docs) {
    const source = readIfExists(resolve(ROOT, doc.path));
    if (source === null) {
      missing.push(doc.path);
      continue;
    }
    const { title, body } = splitTitle(source, doc.path);
    sections.push({
      ...doc,
      anchor: anchorFor(doc.path),
      title,
      body: marked.parse(body, { gfm: true, breaks: false }),
    });
  }
  return { sections, missing };
}

function renderHtml(sections) {
  const nav = sections
    .map(
      (s) =>
        `      <li><a href="#${s.anchor}">${escapeHtml(s.title)}<span>${escapeHtml(s.path)}</span></a></li>`
    )
    .join('\n');

  const body = sections
    .map(
      (s) => `    <section class="doc" id="${s.anchor}">
      <header class="doc-head">
        <h1>${escapeHtml(s.title)}</h1>
        <p class="doc-meta"><code>${escapeHtml(s.path)}</code> · 읽는 시점: ${escapeHtml(s.when)}</p>
      </header>
      <div class="doc-body">
${s.body}
      </div>
    </section>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>swithme 문서 통합본</title>
<style>
:root {
  --bg: #0f1117; --panel: #161923; --panel-2: #1d2130; --line: #2a3040;
  --text: #e6e9f0; --muted: #97a0b5; --accent: #7aa2ff; --accent-soft: #7aa2ff22;
  --ok: #4ade80; --todo: #fbbf24;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font-family: "Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
  line-height: 1.7; -webkit-text-size-adjust: 100%;
}
a { color: var(--accent); }
.banner {
  background: var(--accent-soft); border-bottom: 1px solid var(--line);
  padding: 10px 16px; font-size: 13px; color: var(--muted); text-align: center;
}
.banner strong { color: var(--text); }
.layout { display: flex; align-items: flex-start; }
nav {
  position: sticky; top: 0; flex: 0 0 280px; height: 100vh; overflow-y: auto;
  background: var(--panel); border-right: 1px solid var(--line); padding: 20px 16px;
}
nav h2 { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin: 0 0 12px; }
nav ul { list-style: none; margin: 0; padding: 0; }
nav a {
  display: block; padding: 9px 10px; margin-bottom: 2px; border-radius: 8px;
  text-decoration: none; color: var(--text); font-size: 14px; font-weight: 600;
}
nav a span { display: block; font-size: 11px; font-weight: 400; color: var(--muted); margin-top: 2px; }
nav a:hover, nav a.active { background: var(--panel-2); }
#search {
  width: 100%; margin-bottom: 14px; padding: 10px 12px; border-radius: 8px;
  border: 1px solid var(--line); background: var(--bg); color: var(--text); font-size: 14px;
}
#search:focus { outline: 2px solid var(--accent); outline-offset: -1px; }
main { flex: 1 1 auto; min-width: 0; padding: 32px 40px 120px; }
.doc { max-width: 900px; margin: 0 auto 72px; }
.doc-head { border-bottom: 1px solid var(--line); padding-bottom: 14px; margin-bottom: 24px; }
.doc-head h1 { margin: 0; font-size: 28px; }
.doc-meta { margin: 8px 0 0; font-size: 13px; color: var(--muted); }
.doc-body h2 { margin-top: 40px; font-size: 22px; border-bottom: 1px solid var(--line); padding-bottom: 8px; }
.doc-body h3 { margin-top: 30px; font-size: 18px; }
.doc-body h4 { margin-top: 22px; font-size: 16px; color: var(--muted); }
.doc-body table { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 14px; }
.doc-body th, .doc-body td { border: 1px solid var(--line); padding: 9px 12px; text-align: left; vertical-align: top; }
.doc-body th { background: var(--panel-2); }
.doc-body code { background: var(--panel-2); padding: 2px 6px; border-radius: 5px; font-size: 13px; }
.doc-body pre { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px; overflow-x: auto; }
.doc-body pre code { background: none; padding: 0; }
.doc-body blockquote {
  margin: 18px 0; padding: 2px 16px; border-left: 3px solid var(--accent);
  background: var(--panel); border-radius: 0 8px 8px 0; color: var(--muted);
}
.doc-body blockquote strong { color: var(--text); }
.doc-body img { max-width: 100%; }
.doc-body hr { border: none; border-top: 1px solid var(--line); margin: 32px 0; }
.table-scroll { overflow-x: auto; }
#empty { display: none; color: var(--muted); text-align: center; padding: 60px 0; }
#menu-toggle { display: none; }
@media (max-width: 860px) {
  .layout { display: block; }
  nav {
    position: static; width: 100%; height: auto; flex: none;
    border-right: none; border-bottom: 1px solid var(--line);
  }
  nav.collapsed ul, nav.collapsed h2 { display: none; }
  /* 좁은 화면에서 표가 글자 단위로 찌그러지지 않도록 최소 폭을 주고 가로 스크롤에 맡긴다. */
  .doc-body table { min-width: 520px; }
  #menu-toggle {
    display: block; width: 100%; margin-bottom: 12px; padding: 10px;
    background: var(--panel-2); color: var(--text); border: 1px solid var(--line);
    border-radius: 8px; font-size: 14px; font-weight: 600;
  }
  main { padding: 20px 16px 80px; }
  .doc-head h1 { font-size: 22px; }
}
</style>
</head>
<body>
<div class="banner">
  <strong>자동 생성 파일</strong> — 직접 수정하지 말 것. 원본 마크다운을 고친 뒤 <code>npm run docs</code>로 다시 만든다.
</div>
<div class="layout">
  <nav id="nav" class="collapsed">
    <button id="menu-toggle" type="button">☰ 문서 목록</button>
    <input id="search" type="search" placeholder="전체 문서 검색…" autocomplete="off">
    <h2>문서</h2>
    <ul id="nav-list">
${nav}
    </ul>
  </nav>
  <main id="main">
${body}
    <p id="empty">검색 결과 없음.</p>
  </main>
</div>
<script>
(function () {
  var search = document.getElementById('search');
  var docs = Array.prototype.slice.call(document.querySelectorAll('.doc'));
  var links = Array.prototype.slice.call(document.querySelectorAll('#nav-list a'));
  var empty = document.getElementById('empty');
  var nav = document.getElementById('nav');

  document.getElementById('menu-toggle').addEventListener('click', function () {
    nav.classList.toggle('collapsed');
  });

  // 넓은 표는 가로 스크롤 컨테이너로 감싸 본문이 옆으로 밀리지 않게 한다.
  Array.prototype.forEach.call(document.querySelectorAll('.doc-body table'), function (table) {
    var wrap = document.createElement('div');
    wrap.className = 'table-scroll';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });

  var haystacks = docs.map(function (doc) { return doc.textContent.toLowerCase(); });

  search.addEventListener('input', function () {
    var query = search.value.trim().toLowerCase();
    var hits = 0;
    docs.forEach(function (doc, i) {
      var match = !query || haystacks[i].indexOf(query) !== -1;
      doc.style.display = match ? '' : 'none';
      links[i].style.display = match ? '' : 'none';
      if (match) hits++;
    });
    empty.style.display = hits ? 'none' : 'block';
  });

  // 현재 보고 있는 문서를 목차에서 강조.
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      links.forEach(function (link) {
        link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
      });
    });
  }, { rootMargin: '-10% 0px -80% 0px' });
  docs.forEach(function (doc) { observer.observe(doc); });

  links.forEach(function (link) {
    link.addEventListener('click', function () {
      if (window.innerWidth <= 860) nav.classList.add('collapsed');
    });
  });
})();
</script>
</body>
</html>
`;
}

function newestSourceTime(docs) {
  const paths = [SOURCE_LIST, ...docs.map((d) => resolve(ROOT, d.path))];
  return paths.reduce((newest, path) => {
    if (!existsSync(path)) return newest;
    return Math.max(newest, statSync(path).mtimeMs);
  }, 0);
}

function main() {
  const ifStale = process.argv.includes('--if-stale');
  const docs = parseDocList(readFileSync(SOURCE_LIST, 'utf8'));

  if (ifStale && existsSync(OUTPUT) && statSync(OUTPUT).mtimeMs >= newestSourceTime(docs)) {
    return;
  }

  const { sections, missing } = buildSections(docs);
  const html = renderHtml(sections);
  const previous = readIfExists(OUTPUT);
  if (previous === html) return;

  writeFileSync(OUTPUT, html, 'utf8');
  console.log(`문서요약.html 생성 — 문서 ${sections.length}개`);
  if (missing.length) {
    console.warn(`⚠ 목록에는 있으나 파일이 없어 건너뜀: ${missing.join(', ')}`);
  }
}

main();
