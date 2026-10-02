// 커밋에 .env 의 실제 값이 들어가는지 점검한다. .githooks/pre-commit 과 .githooks/commit-msg 가 부른다.
//   node scripts/check-secrets.mjs              스테이지된 변경에서 더해지는 줄(모든 파일, .env 를 억지로 add 한 것 포함)
//   node scripts/check-secrets.mjs <메시지파일>   커밋 메시지
// 값은 어디에도 찍지 않는다. 키 이름과 파일·줄 번호만 알린다.
// .env 가 없으면(값을 모르는 컴퓨터) 점검하지 않고 그렇다고 알린다. 6자보다 짧은 값은 흔한 글자와 겹쳐 보지 않는다.
// 문제가 있으면 종료 코드 1.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

const MIN_LENGTH = 6;

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const envPath = join(root, '.env');
if (!existsSync(envPath)) {
  console.log('.env 가 없어 비밀값 점검을 건너뜁니다.');
  process.exit(0);
}

const secrets = Object.entries(parseEnv(readFileSync(envPath, 'utf8')))
  .map(([name, value]) => [name, value.trim()])
  .filter(([, value]) => value.length >= MIN_LENGTH);

const problems = [];
const scan = (where, text) => {
  for (const [name, value] of secrets) {
    if (text.includes(value)) problems.push(`${where}: .env 의 ${name} 값이 들어 있다.`);
  }
};

const messageFile = process.argv[2];
if (messageFile) {
  for (const [i, line] of readFileSync(messageFile, 'utf8').split('\n').entries()) scan(`커밋 메시지 ${i + 1}번째 줄`, line);
} else {
  const diff = execFileSync('git', ['diff', '--cached', '--no-color', '--no-ext-diff', '--text', '-U0'], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  let file = '?';
  let lineNo = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      file = line.slice(4).replace(/^b\//, '');
    } else if (line.startsWith('@@')) {
      lineNo = Number(/\+(\d+)/.exec(line)?.[1] ?? 0);
    } else if (line.startsWith('+')) {
      scan(`${file}:${lineNo}`, line.slice(1));
      lineNo++;
    }
  }
}

if (problems.length > 0) {
  console.error('비밀값 점검 실패. 커밋하지 않는다. (값은 찍지 않는다)');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('값을 지우고, 이미 다른 곳에 올라갔다면 그 키를 새로 발급받는다. wiki/decisions/wiki-check-hook.md 참고.');
  process.exit(1);
}
console.log(messageFile ? '커밋 메시지 비밀값 점검 통과.' : '비밀값 점검 통과.');
