// 점검 장치나 규칙 파일이 바뀌는 커밋을 사람이 알아보게 표시한다. 막지는 않는다. .githooks/pre-commit 과 .githooks/commit-msg 가 부른다.
//   node scripts/check-guard.mjs              스테이지된 변경 중 점검 장치·규칙 파일을 화면에 알린다
//   node scripts/check-guard.mjs <메시지파일>   커밋 메시지 첫 줄 앞에 MARK 를 붙이고, 바뀐 파일 목록을 첫 줄 아래에 넣는다
// 지난 커밋에서 찾을 때는 훅과 상관없이 git 기록으로 본다: git log --oneline -- .githooks scripts CLAUDE.md AGENTS.md wiki/decisions/wiki-check-hook.md

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const MARK = '[점검·규칙 변경]';
const GUARDED = [
  (p) => p.startsWith('.githooks/'),
  (p) => p.startsWith('scripts/'),
  (p) => p === 'CLAUDE.md',
  (p) => p === 'AGENTS.md',
  (p) => p === 'wiki/decisions/wiki-check-hook.md',
];

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
let base;
try {
  base = git('rev-parse', '--verify', '-q', 'HEAD').trim();
} catch {
  base = git('hash-object', '-t', 'tree', '/dev/null').trim(); // 첫 커밋은 빈 트리와 비교
}
const changed = git('diff', '--cached', '--name-only', '--no-renames', base)
  .split('\n')
  .filter((p) => p !== '' && GUARDED.some((match) => match(p)));

if (changed.length === 0) process.exit(0);

const messageFile = process.argv[2];
if (!messageFile) {
  console.error(`${MARK} 이 커밋은 점검 장치나 규칙 파일을 바꾼다. 커밋 메시지에 표시를 붙인다.`);
  for (const p of changed) console.error(`  - ${p}`);
  console.error('이 커밋 자체는 마지막 커밋에 있는 점검 스크립트로 점검한다.');
  process.exit(0);
}

const text = readFileSync(messageFile, 'utf8');
if (text.includes(MARK)) process.exit(0); // 이미 붙어 있으면 그대로 둔다
const msgLines = text.split('\n');
const first = msgLines.findIndex((l) => l.trim() !== '' && !l.startsWith('#'));
if (first === -1) process.exit(0); // 빈 메시지는 git 이 알아서 막는다
msgLines[first] = `${MARK} ${msgLines[first]}`;
msgLines.splice(first + 1, 0, '', `바뀐 점검 장치·규칙 파일: ${changed.join(', ')}`);
writeFileSync(messageFile, msgLines.join('\n'));
