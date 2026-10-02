# 위키 starter

disclosure-radar 에서 쓰는 위키 방식을 다른 프로젝트에 그대로 넣기 위한 폴더다. 이 프로젝트에만 해당하는 결정(공시, 텔레그램, 서버 등)은 뺐다.

방식은 네 가지로 되어 있다.

1. 규칙 파일: Claude Code 와 Codex 가 작업 전에 위키를 읽고, 결정마다 누가 정했는지와 근거를 남기고, 점검에 막혀도 규칙·장치를 고치지 않게 하는 규칙 12개.
2. 위키 뼈대: 목차, 변경 기록, 결정·자료·교훈 폴더, 쓰는 규칙.
3. 점검 스크립트와 훅: 커밋 전에 변경 기록 지난 줄, 결정 페이지 근거 줄, 없는 링크, `.env` 실제 값을 막고, 점검 장치·규칙 파일이 바뀐 커밋에 표시를 붙인다.
4. 점검 절차: 위키가 코드·설정·서버와 맞는지 대조하는 순서(가벼운 점검, 전체 점검).

## 들어 있는 것

| starter 안의 파일 | 넣을 곳 | 설명 |
|---|---|---|
| `rules.md` | `CLAUDE.md` 와 `AGENTS.md` (같은 내용 두 개) | 규칙 12개. starter 안에서는 `CLAUDE.md`·`AGENTS.md` 라는 이름으로 두지 않는다. 그 이름이면 이 폴더를 열 때 하위 폴더 규칙으로 읽힌다. |
| `wiki/index.md`, `wiki/log.md` | `wiki/` | 목차와 변경 기록 |
| `wiki/decisions/wiki-check-hook.md` | `wiki/decisions/` | 훅이 무엇을 왜 막는지, 한계 |
| `wiki/decisions/wiki-lint.md` | `wiki/decisions/` | 점검 절차와 점검 기록 |
| `wiki/lessons/checker-self-edit.md` | `wiki/lessons/` | 점검에 막혔을 때 장치를 고쳐 통과시킨 일과 교훈 |
| `wiki/references/.gitkeep` | `wiki/references/` | 빈 폴더를 git 에 남기려는 파일. 자료 페이지가 생기면 지워도 된다. |
| `scripts/check-wiki.mjs`, `check-secrets.mjs`, `check-guard.mjs` | `scripts/` | 점검 스크립트. 원본과 같은 파일이다. |
| `.githooks/pre-commit`, `.githooks/commit-msg` | `.githooks/` | 훅. 원본과 같은 파일이다. 실행 권한이 있어야 한다. |
| `page-templates/*.md` | 넣지 않음 | 결정·자료·교훈 페이지를 새로 만들 때 베끼는 틀 |

`{{…}}` 는 넣을 때 채우는 자리다. 넣은 뒤 `grep -rnE '\{\{[^}]+\}\}' CLAUDE.md AGENTS.md wiki` 가 아무것도 찍지 않아야 한다.

## 필요한 것

- git, `sh`
- Node 20.12 이상(`check-secrets.mjs` 가 `node:util` 의 `parseEnv` 를 쓴다. 처음 만든 컴퓨터는 Node 25.9.0). 프로젝트가 Node 프로젝트가 아니어도 훅을 돌리려면 Node 가 있어야 한다.
- 비밀값은 저장소 맨 위 `.env` 에 둔다는 전제다. 다른 곳에 두면 비밀값 점검이 그 값을 모른다.

## 다른 프로젝트에 넣는 순서

아래에서 `$STARTER` 는 이 `starter/` 폴더, `$TARGET` 은 넣을 프로젝트 폴더(git 저장소)다.

### 1. 부딪히는 것이 없는지 본다

```sh
cd "$TARGET"
git status --short                      # 깨끗한 상태에서 시작한다
ls CLAUDE.md AGENTS.md wiki scripts .githooks 2>/dev/null
git config core.hooksPath; git config --global core.hooksPath
```

- 작업 트리가 깨끗하지 않으면 먼저 커밋하거나 치운다. starter 를 넣는 커밋은 다른 변경과 섞지 않는다(규칙 11. 이 커밋에는 점검 장치·규칙 파일이 모두 들어간다).
- `CLAUDE.md`·`AGENTS.md` 가 이미 있으면 덮어쓰지 않는다. 있던 내용 아래에 `rules.md` 의 규칙을 더하고, 두 파일을 같은 내용으로 맞춘다. 있던 규칙과 부딪히는 것이 있으면 사용자에게 묻는다.
- `wiki/`, `scripts/` 에 같은 이름 파일이 있으면 멈추고 사용자에게 묻는다. `scripts/` 에 다른 스크립트가 이미 있으면, 그 스크립트를 바꾸는 커밋에도 `[점검·규칙 변경]` 표시가 붙는다(`check-guard.mjs` 는 `scripts/` 전부를 본다). 싫으면 목록을 좁히는 것은 점검 장치 변경이니 따로 커밋한다.
- 저장소의 `core.hooksPath` 가 이미 다른 곳(husky 의 `.husky` 등)이면 바꾸지 말고 사용자에게 묻는다. 그 훅에서 `.githooks/pre-commit`·`commit-msg` 를 부르게 하는 방법도 있다. 전역 `core.hooksPath` 는 그대로 두면 된다(훅이 먼저 부른다).

### 2. 파일을 복사한다

```sh
cp "$STARTER/rules.md" CLAUDE.md
cp "$STARTER/rules.md" AGENTS.md
mkdir -p scripts .githooks
cp -R "$STARTER/wiki" .
cp "$STARTER"/scripts/check-*.mjs scripts/
cp "$STARTER"/.githooks/pre-commit "$STARTER"/.githooks/commit-msg .githooks/
chmod +x .githooks/pre-commit .githooks/commit-msg
```

`cp -R` 는 숨김 파일 `.gitkeep` 도 옮긴다. 실행 권한이 빠지면 git 은 그 훅을 말없이 건너뛴다(처음 만든 프로젝트에서 실제로 있었던 일).

### 3. 프로젝트에 맞게 채운다

- `CLAUDE.md`·`AGENTS.md` 첫 줄 `{{프로젝트 이름}}`. 두 파일은 늘 같아야 한다(`diff CLAUDE.md AGENTS.md`).
- 규칙 9·10 은 "저장소를 나중에 공개할 수 있다"는 전제다. 공개하지 않는 저장소라도 그대로 두는 것을 권한다. 바꾸려면 사용자가 정한다.
- `wiki/index.md` 첫 줄 `{{프로젝트 이름}}`.
- `wiki/log.md` 의 날짜와 첫 줄. 이 줄은 첫 커밋 뒤에는 고칠 수 없다(훅이 막는다). 커밋 전에 채운다.
- `wiki/decisions/wiki-check-hook.md` 의 "정한 날", "이 프로젝트에 넣음"의 넣은 날·넣자고 한 사람. 사용자가 넣자고 했으면 그 말 원문을 근거 칸에 새 줄로 더한다(줄이지 않고 그대로).
- `wiki/decisions/wiki-lint.md` 의 "정한 날", "이 프로젝트에서 대조할 것"(코드 파일, 값이 있는 곳, 서버). 서버가 없으면 "없음".
- `wiki-check-hook.md`·`wiki-lint.md` 의 확인 칸은 아직 아무것도 돌리지 않았으므로 "아직 확인하지 않았다."로 적는다. 5·6 단계를 한 뒤 실제 결과로 바꾼다.
- `wiki-lint.md` 의 점검 기록 줄은 6단계에서 채운다. 그대로 둔다.
- 자리 표시가 남았는지 본다: `grep -rnE '\{\{[^}]+\}\}' CLAUDE.md AGENTS.md wiki`. 이 단계에서는 `wiki-lint.md` 의 점검 기록 줄 하나만 나와야 한다.

### 4. `.gitignore` 와 훅을 켠다

```sh
printf '%s\n' '.env' 'wiki/.obsidian/' >> .gitignore    # 이미 있으면 더하지 않는다
git config core.hooksPath .githooks
git add CLAUDE.md AGENTS.md wiki scripts .githooks .gitignore
node scripts/check-wiki.mjs                              # "위키 점검 통과." 가 나와야 한다
git commit -m "위키 starter 를 넣는다"
```

- 첫 커밋에서는 HEAD 에 점검 스크립트가 없어 "스테이지된 것을 돌립니다" 문구가 세 번 나오는 것이 정상이다.
- 커밋 메시지 첫 줄에 `[점검·규칙 변경]` 이, 그 아래에 바뀐 파일 목록이 붙는 것이 정상이다(`git log -1`). 붙지 않으면 `commit-msg` 실행 권한을 본다.
- `core.hooksPath` 는 `.git/config` 에 들어가 저장소와 함께 옮겨지지 않는다. 이 저장소를 새로 받은 컴퓨터마다 `git config core.hooksPath .githooks` 를 한 번 돌린다. 프로젝트 README 에도 적어 두면 좋다.

### 5. 정말 막히는지 확인한다

실제 저장소가 아니라 복제본에서 한다. 끝나면 복제본을 지운다.

```sh
tmp=$(mktemp -d) && git clone -q "$TARGET" "$tmp/c" && cd "$tmp/c" && git config core.hooksPath .githooks
# 1) 변경 기록 지난 줄 고치기 → 막혀야 한다
sed -i.bak '7s/$/ 고침/' wiki/log.md && rm wiki/log.md.bak && git commit -qam t1; echo "종료 코드 $?"; git checkout -q -- .
# 2) 결정 페이지 근거 줄 고치기 → 막혀야 한다
sed -i.bak 's/^- 이 페이지는 위키 starter 에서 왔다./- 요약함./' wiki/decisions/wiki-lint.md && rm wiki/decisions/wiki-lint.md.bak && git commit -qam t2; echo "종료 코드 $?"; git checkout -q -- .
# 3) 없는 페이지 링크 → 막혀야 한다
echo '- [[없는페이지]]' >> wiki/index.md && git commit -qam t3; echo "종료 코드 $?"; git checkout -q -- .
# 4) .env 값이 든 파일 → 막혀야 한다 (가짜 값)
echo 'FAKE_KEY=starter-test-value-123' > .env && echo 'starter-test-value-123' > leak.txt && git add leak.txt && git commit -qm t4; echo "종료 코드 $?"; git reset -q; rm -f leak.txt .env
# 5) log.md 맨 위에 새 줄 더하기 → 통과해야 한다
sed -i.bak '5a\
- 시험 줄' wiki/log.md && rm wiki/log.md.bak && git commit -qam t5; echo "종료 코드 $?"
cd / && rm -rf "$tmp"
```

1~4 는 종료 코드가 0 이 아니어야 하고, 5 는 0 이어야 한다. 줄 번호는 starter 의 `wiki/log.md` 그대로일 때다(5번째 줄이 날짜 머리말, 7번째 줄이 첫 기록). 바꿨다면 맞춘다. 결과(몇 개 중 몇 개)를 `wiki/decisions/wiki-check-hook.md` 확인 칸에 적는다.

### 6. 첫 전체 점검을 하고 기준을 남긴다

`wiki/decisions/wiki-lint.md` 의 "전체 점검" 순서대로 한 번 점검한다. 점검 기록 줄의 자리를 채운다. "대조한 HEAD" 는 4단계 커밋의 해시(`git rev-parse --short HEAD`)다. 이 해시가 다음부터 가벼운 점검의 기준이 된다. 기준이 없으면 가벼운 점검은 전체 기록을 보고 "기준이 없다"고 알린다.

확인 칸들을 채우고, `wiki/log.md` 맨 위에 새 줄을 더해 커밋한다. `wiki/decisions/wiki-check-hook.md` 확인 칸을 채우면 그 파일이 점검 장치 목록에 있어 `[점검·규칙 변경]` 표시가 붙는다. 정상이다.

### 7. 다음 세션부터

- AI 는 작업 전에 `CLAUDE.md` 대로 `wiki/index.md` 를 읽고, 가벼운 점검을 돌린다.
- 결정이 생기면 `page-templates/decision.md` 를 베껴 `wiki/decisions/` 에 만들고, `wiki/index.md` 목차와 `wiki/log.md` 를 고친다. `page-templates/` 는 프로젝트에 넣지 않았으므로 이 starter 에서 베끼거나, 같은 형식을 `wiki/index.md` 의 쓰는 규칙에서 본다.

## 원본과 맞추기

이 starter 는 disclosure-radar 의 파일에서 뽑았다. 원본의 점검 스크립트·훅을 고치면 starter 도 같이 고친다. 둘이 같은지는 disclosure-radar 저장소 폴더에서 이렇게 본다.

```sh
diff -r scripts starter/scripts && diff -r .githooks starter/.githooks && echo 같음
diff CLAUDE.md starter/rules.md     # 첫 줄과 규칙 9·10 만 달라야 한다
```

다른 프로젝트에 넣은 뒤에는 그 프로젝트의 것이 따로 간다. 한쪽을 고쳤다고 다른 쪽이 바뀌지 않는다.
