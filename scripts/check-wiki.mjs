// 커밋 전에 위키를 점검한다. .githooks/pre-commit 이 부른다. 직접 돌려도 된다: node scripts/check-wiki.mjs
// 스테이지된 내용(git index)을 마지막 커밋(HEAD)과 비교한다. 작업 트리는 보지 않는다.
//   1. wiki/log.md 의 지난 줄이 바뀌거나 지워졌는지 (HEAD 의 줄이 순서대로 모두 남아 있어야 한다. 새 줄은 어디에 더해도 된다.)
//   2. wiki/decisions/*.md 의 "## 근거" 칸 줄이 지워졌는지 (HEAD 의 근거 줄이 같은 페이지 근거 칸에 그대로 있어야 한다.)
//   3. wiki/ 안의 [[링크]] 가 없는 페이지를 가리키는지 (`…` 코드 안과 "…" 큰따옴표 안은 보지 않는다. 큰따옴표 안은 대화 원문이다.)
// 문제가 있으면 종료 코드 1.

import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const tryGit = (...args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
};

const hasHead = tryGit('rev-parse', '--verify', '-q', 'HEAD') !== null;
const atHead = (path) => (hasHead ? tryGit('show', `HEAD:${path}`) : null);
const staged = (path) => tryGit('show', `:${path}`);
const lines = (text) => text.split('\n').map((l) => l.replace(/\r$/, ''));

const problems = [];

// 1. 변경 기록
const LOG = 'wiki/log.md';
const oldLog = atHead(LOG);
if (oldLog !== null) {
  const newLog = staged(LOG);
  if (newLog === null) {
    problems.push(`${LOG}: 파일이 지워졌다.`);
  } else {
    const newLines = lines(newLog);
    let j = 0;
    for (const [i, line] of lines(oldLog).entries()) {
      if (line.trim() === '') continue;
      while (j < newLines.length && newLines[j] !== line) j++;
      if (j === newLines.length) {
        problems.push(`${LOG}: 지난 줄이 바뀌었거나 지워졌다 (HEAD ${i + 1}번째 줄): ${line.slice(0, 80)}`);
        j = 0; // 다음 줄은 처음부터 다시 찾는다
      } else {
        j++;
      }
    }
  }
}

// 2. 결정 페이지의 근거 칸
const evidence = (text) => {
  const out = [];
  let inside = false;
  for (const line of lines(text)) {
    if (/^##\s/.test(line)) inside = /^##\s+근거\s*$/.test(line);
    else if (inside && line.trim() !== '') out.push(line);
  }
  return out;
};
const oldDecisions = hasHead
  ? git('ls-tree', '-r', '--name-only', 'HEAD', '--', 'wiki/decisions/').split('\n').filter((p) => p.endsWith('.md'))
  : [];
for (const path of oldDecisions) {
  const newText = staged(path);
  if (newText === null) {
    problems.push(`${path}: 결정 페이지가 지워졌다. 결정을 뒤집을 때는 페이지를 지우지 않고 덧붙인다.`);
    continue;
  }
  const kept = new Set(evidence(newText));
  for (const line of evidence(atHead(path))) {
    if (!kept.has(line)) problems.push(`${path}: 근거 줄이 바뀌었거나 지워졌다: ${line.slice(0, 80)}`);
  }
}

// 3. [[링크]]
const wikiFiles = git('ls-files', '--', 'wiki/')
  .split('\n')
  .filter((p) => p.endsWith('.md') && !p.startsWith('wiki/.obsidian/'));
const pages = new Set(wikiFiles.map((p) => p.split('/').pop().replace(/\.md$/, '')));
for (const path of wikiFiles) {
  const text = staged(path);
  if (text === null) continue;
  for (const [i, line] of lines(text).entries()) {
    const plain = line.replace(/`[^`]*`/g, '').replace(/"[^"]*"/g, '').replace(/“[^”]*”/g, '');
    for (const m of plain.matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)) {
      const name = m[1].trim();
      if (!pages.has(name)) problems.push(`${path}:${i + 1}: [[${name}]] 페이지가 없다.`);
    }
  }
}

if (problems.length > 0) {
  console.error('위키 점검 실패. 커밋하지 않는다.');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('규칙은 wiki/decisions/wiki-check-hook.md 참고.');
  process.exit(1);
}
console.log('위키 점검 통과.');
