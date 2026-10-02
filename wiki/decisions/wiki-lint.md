# 위키를 코드·설정·서버와 대조하는 점검(린트)

- 정한 날: 2026-10-03
- 누가 정함: 항목마다 다르다. 각 항목 끝 괄호에 적었다. 근거는 아래 "근거" 참고.
- 상태: 유지
- 관련: [[index]], [[log]], [[wiki-check-hook]], [[watchlist-telegram]], [[railway-deploy]], [[obsidian-wiki]], [[quoted-link-unresolved]]

## 결정

- 위키를 점검하는 절차를 이 페이지에 남겨, 다음 세션도 같은 방법으로 점검한다. (사용자)
- 언제 점검하는지를 `CLAUDE.md`·`AGENTS.md` 규칙에 넣는다(규칙 12). (사용자)
- 언제 점검하는지는 아래와 같다. (AI 기본값)
  - 작업을 시작할 때: 아래 "가벼운 점검"을 돌린다. 걸린 커밋이 있으면 작업 전에 사용자에게 알리고, 그 변경을 누가 정했는지 묻는다(규칙 2 의 "확인 안 됨").
  - 사용자가 요청할 때: 아래 "전체 점검"을 한다.
  - 서버에 배포(`railway up`)하기 전: 가벼운 점검을 돌린다. 배포한 뒤에는 전체 점검의 "서버" 칸을 다시 보고, [[railway-deploy]] 에 서버가 어느 커밋인지 적는다.
- 점검은 읽기만 한다. 찾은 것은 먼저 보고하고 고치지 않는다. 사용자가 고치라고 하면 고친다. (AI 기본값. 이번 점검에서 사용자가 "아직 고치지는 마"라고 한 대로다.)
- 전체 점검을 하면 아래 "점검 기록"에 날짜, 대조한 HEAD, 결과 요약을 한 줄로 더한다. 새 기록은 맨 아래에 더한다. 가벼운 점검만 한 것은 적지 않는다. (AI 기본값)

## 이유

- 2026-10-03 사용자가 커밋 `550e667` 로 관심 종목에 현대차를 넣었는데, 위키([[watchlist-telegram]], 목차)는 종목 셋 그대로였다. 서버도 그 커밋 전 코드였다. 위키 점검 훅([[wiki-check-hook]])은 위키 안의 형식(변경 기록, 근거, 링크)만 보고, 위키가 코드와 맞는지는 보지 않는다. 그래서 이런 어긋남은 사람이나 AI 가 대조해야 찾을 수 있다.
- 작업 시작 때 가벼운 점검을 하는 이유: 이번 일처럼 위키를 거치지 않은 커밋은 다음 세션이 위키만 읽으면 모른다. 커밋 기록만 보면 되므로 빠르다.

## 가벼운 점검: 위키를 고치지 않고 다른 파일만 바꾼 커밋 찾기

저장소 폴더에서 돌린다. 기준은 아래 "점검 기록"의 마지막 "대조한 HEAD" 다. 그 뒤 커밋 중 `wiki/` 밖 파일만 바꾸고 `wiki/` 는 하나도 고치지 않은 커밋을 찍는다.

```sh
base=$(grep -o '대조한 HEAD `[0-9a-f]*`' wiki/decisions/wiki-lint.md | tail -1 | grep -o '[0-9a-f]\{7,\}')
git log --reverse --format=%h "$base..HEAD" | while read c; do
  f=$(git show --name-only --format= "$c")
  if ! echo "$f" | grep -q '^wiki/'; then git log -1 --format='%h %s' "$c"; fi
done
```

- 아무것도 안 나오면 통과다.
- 이 점검이 못 찾는 것: 위키를 일부만 고친 커밋(코드 두 곳을 바꾸고 위키는 한 곳만 고친 경우), 커밋하지 않은 변경, 서버만 바뀐 것(서버 변수·설정을 직접 바꾼 경우).
- 2026-10-03 시험: 기준 없이(전체 기록) 돌리면 `3515f73`, `d07acfb`(위키를 만들기 전 커밋)와 `550e667` 이 나왔다. 기준 `492fc6e` 로 돌리면 `550e667` 만 나왔다. 위 `grep` 으로 기준을 읽는 부분은 이 페이지를 커밋하기 전에 돌려 봤다(아래 "확인").

## 전체 점검: 순서

1. 읽기: [[index]] 와 위키의 모든 페이지를 읽는다. `dart.js`·`index.js`·`notify.js`, `package.json`, `package-lock.json`, `.gitignore`, `.githooks/*`, `scripts/*` 를 읽는다. `git log --oneline` 으로 마지막 점검 이후 커밋을 본다.
2. 형식 점검(기계):
   - `node scripts/check-wiki.mjs`: 변경 기록, 근거, 링크.
   - 디스크의 위키에서 없는 링크, 이어지지 않은 페이지, 나가는 링크 없는 페이지를 센다. 아래 스크립트는 큰따옴표 안의 링크도 센다(옵시디언과 같다, [[obsidian-wiki]]). 2026-10-03 에는 `wiki-check-hook.md:128 [[링크]]` 하나만 나오는 것이 정상이다([[quoted-link-unresolved]]).

     ```sh
     node -e '
     const fs=require("fs"),path=require("path");
     const files=require("child_process").execSync("git ls-files wiki").toString().trim().split("\n").filter(f=>f.endsWith(".md"));
     const name=f=>path.basename(f,".md"),pages=new Set(files.map(name)),out={},inn={};
     files.forEach(f=>{out[name(f)]=new Set();inn[name(f)]=new Set()});
     for(const f of files)fs.readFileSync(f,"utf8").split("\n").forEach((l,i)=>{
       for(const m of l.replace(/`[^`]*`/g,"").matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)){
         const n=m[1].trim();if(pages.has(n)){out[name(f)].add(n);inn[n].add(name(f))}else console.log("없는 링크",f+":"+(i+1),n)}});
     console.log("페이지",files.length,"| 이어지지 않음",Object.keys(inn).filter(n=>!inn[n].size),"| 나가는 링크 없음",Object.keys(out).filter(n=>!out[n].size));'
     ```

   - 목차: `wiki/decisions`·`references`·`lessons` 의 페이지가 모두 [[index]] 에 있는지 본다. 디스크와 `git ls-files wiki` 의 `.md` 수가 같은지 본다(커밋하지 않은 페이지).
   - `diff CLAUDE.md AGENTS.md` 가 비어 있는지.
   - (2026-10-03 덧붙임) `starter/` 가 원본과 맞는지([[wiki-starter]]): `diff -r scripts starter/scripts && diff -r .githooks starter/.githooks` 는 비어 있어야 하고, `diff CLAUDE.md starter/rules.md` 는 첫 줄과 규칙 9·10 만 달라야 한다. 이 칸의 위키 점검 절차나 [[wiki-check-hook]] 를 바꿨으면 `starter/wiki/` 의 같은 페이지에도 옮겼는지 본다.
3. 결정 대 코드: 결정 페이지의 "결정" 항목을 하나씩 코드와 맞춰 본다. 값이 코드에 있는 것은 그 줄을 찾아 비교한다. 2026-10-03 에 본 것: `MARKETS`, `WATCHLIST`, `SUMMARY_MODEL`·`SUMMARY_INPUT_CHARS`·`SUMMARY_MAX_TOKENS`·`temperature`, `DAILY_LIMIT`, `LOCK_WAIT_MS`·`LOCK_POLL_MS`·`wx`·자기 pid, `STATE_DIR`, `WEEKDAY_HOURS_ONLY`·19:30, `.env` 없으면 넘어가기, `Api`·`maxRetries: 0`, 파일 맨 위 주석.
4. 설정:
   - `git check-ignore -v sent.json sent-count.json sent.lock .env wiki/.obsidian/app.json`: 위키에 적은 `.gitignore` 줄 번호와 맞는지.
   - `git config core.hooksPath`, `ls -l .githooks`(실행 권한).
   - 위키가 가리키는 커밋 해시가 있는지(`git log -1 <해시>`).
   - `.env` 키 이름. 값은 찍지 않는다(이름과 "10자 이상인지" 정도만).
5. 서버(읽기만): 배포·시작 명령 바꾸기·즉시 실행은 하지 않는다.
   - `railway deployment list --json`: 맨 위 배포의 `createdAt` 이 마지막 코드 커밋보다 뒤인지, `startCommand`·`cronSchedule`·`restartPolicyType`·`volumeMounts` 가 [[railway-deploy]] 와 같은지.
   - `railway variable list --json` 은 값을 그대로 찍지 않는다. 출력을 `node` 로 받아 이름만, 그리고 로컬 `.env` 와 "같음/다름"만 찍는다.
   - `git diff --stat <서버에 올린 커밋> HEAD -- dart.js index.js notify.js package.json package-lock.json .gitignore`: 서버에 반영되지 않은 코드 변경.
6. 같은 내용이 두 곳에 있는 것: 목차 요약과 페이지, 결정 페이지끼리, 자료와 결정. 숫자·이름으로 찾는다(예: `grep -rn -e '종목' -e '20개' -e '\*/30' wiki/*.md wiki/*/*.md`).
7. 날짜가 박힌 값: 자료 페이지와 확인 칸의 수(페이지 수, 파일 수)는 그때의 값이다. 지금과 다르면 틀린 것이 아니라 "그때 값"이라고 밝히는 덧붙임이 필요한지 본다.
8. 보고: ① 틀리거나 낡은 곳, ② 목차에 없는 페이지, ③ 같은 내용이 다르게 적힌 곳, ④ 아직 "확인 안 됨"인 결정, ⑤ 직접 확인한 것(명령과 범위), ⑥ 확인하지 못한 것으로 나눈다.

## 고칠 때 주의

- 다른 페이지가 줄 번호로 가리키는 곳이 있다. [[wiki-check-hook]] 128번째 줄은 [[quoted-link-unresolved]]·[[obsidian-wiki]] 가 가리킨다. 그 위에 줄을 더하면 번호가 밀리므로, 덧붙임은 기존 줄 끝에 괄호로 단다. 고친 뒤 `grep -n '\[\[링크\]\]' wiki/decisions/wiki-check-hook.md` 로 본다.
- 결정·자료는 지우지 않고 덧붙인다. [[log]] 는 새 줄만 맨 위에 더한다.
- 점검 장치·규칙 파일(`CLAUDE.md`, `AGENTS.md`, `.githooks/`, `scripts/`, [[wiki-check-hook]])을 고치는 것은 다른 고침과 따로 커밋한다(규칙 11).

## 확인

- 2026-10-03 위 순서로 전체 점검을 했다(대조한 HEAD `550e667`). 결과는 아래 "점검 기록"과 [[log]].
- 2026-10-03 가벼운 점검 명령의 `git log` 부분을 scratchpad 의 `drift.sh` 로 돌렸다. 기준 없이 3개(`3515f73`, `d07acfb`, `550e667`), 기준 `492fc6e` 로 1개(`550e667`)가 나왔다.
- 2026-10-03 이 페이지를 쓴 뒤(커밋 전, HEAD `c169975`) 두 코드 블록을 `awk` 로 이 파일에서 꺼내 그대로 돌렸다.
  - 가벼운 점검: 기준을 `550e667` 로 읽었고, 아무것도 나오지 않았다(그 뒤 커밋 `bf6f889`·`c169975` 는 위키를 고쳤다). 기준 줄만 `492fc6e` 로 바꿔 돌리면 `550e667` 하나가 나왔다.
  - 링크 점검: 없는 링크는 `wiki/decisions/wiki-check-hook.md:128 링크` 하나, 나가는 링크 없는 페이지는 0개였다. 이어지지 않은 페이지로 이 페이지(`wiki-lint`)가 나왔는데, 목차에 넣기 전이었기 때문이다. 목차에 넣은 뒤 다시 돌린 결과는 [[log]] 에 적었다.
- 확인하지 않은 것: 다른 컴퓨터(옵시디언·Railway CLI 로그인이 없는 곳)에서 이 절차를 따라 해 보는 것. Codex 가 이 절차를 따르는지.

## 점검 기록

- 2026-10-03 전체 점검, 대조한 HEAD `550e667`: 관심 종목 현대차 추가가 위키에 없음(사용자 결정으로 고침, [[watchlist-telegram]]). 서버는 그 커밋 전 배포 `5c24e175`라 종목 셋(배포는 권한 판정에서 막혀 하지 못함, [[railway-deploy]]). 낡은 곳 4곳 고침([[railway-cron]] 1, [[obsidian-wiki]] 2, [[wiki-check-hook]] 2). 목차에 없는 페이지 0. 없는 링크는 정상인 1개. 서버 키 4개는 로컬 `.env` 와 같음.

## 근거

- 2026-10-03 대화 (점검 요청): "이 위키를 점검(린트)해 줘. 위키에 적힌 내용이 지금 코드와 설정, 서버 상태와 맞는지 페이지마다 실제로 대조하고, 틀리거나 낡은 곳, 목차에 없는 페이지, 같은 내용이 두 곳에 다르게 적힌 곳을 찾아 줘. 무엇을 직접 확인했고 무엇을 확인하지 못했는지도 나눠 줘. 아직 고치지는 마."
- 2026-10-03 대화 (절차·규칙): "현대차는 내가 넣었어(사용자 결정). 위키를 지금 코드에 맞게 고치고, 서버에도 반영해 줘. 찾은 나머지 낡은 곳도 고쳐 줘. 그리고 이번 점검을 다음 세션도 같은 방법으로 할 수 있게 절차를 위키에 남기고, 언제 점검하는지 규칙에 넣어 줘. 커밋해 줘."
- 언제 점검하는지(작업 시작 때 가벼운 점검, 요청 때 전체 점검, 배포 전후), 가벼운 점검 명령, 전체 점검 순서, 읽기만 하기, 점검 기록 형식, 줄 번호 주의는 사용자가 말하지 않았다. AI 가 고른 것이다.
