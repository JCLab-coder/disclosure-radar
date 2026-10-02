# disclosure-radar

관심 종목(삼성전자, 카카오, 에코프로비엠, 현대차)에 새 공시가 올라오면 OpenDART 에서 가져와 AI 세 줄 요약을 붙여 텔레그램으로 보내는 봇이다.

인프런 강의 '옵시디언 x 클로드 코드 LLM 위키 실전'의 실습 저장소다. 강의는 이 봇을 Claude Code 와 Codex 로 만들면서, 대화에만 남고 사라지는 결정과 이유를 `wiki/` 에 남기고, 그 위키를 규칙(`CLAUDE.md`, `AGENTS.md`)과 점검 스크립트(`scripts/`, `.githooks/`)로 지키는 과정을 다룬다. 봇 코드보다 위키와 그것을 지키는 장치가 이 저장소의 본체다.

## 장별 태그

장이 끝날 때마다 태그를 달아 두었다. `ch01` 부터 `ch09` 까지.

```
git clone https://github.com/JCLab-coder/disclosure-radar.git
cd disclosure-radar
git checkout ch05
```

이렇게 하면 5장이 끝난 시점의 저장소를 받는다. 태그 뒤의 커밋은 공개용 README, 라이선스, `.env.example`, `prompts/` 뿐이다.

| 태그 | 장 | 그 시점에 들어 있는 것 |
|---|---|---|
| `ch01` | 1장. 위키 없이 시작하면 | 오늘 공시 목록(유가증권시장과 코스닥만), 위키 시작, `CLAUDE.md` 와 `AGENTS.md` |
| `ch02` | 2장. 결정은 대화에 남지 않는다 | 관심 종목 공시를 텔레그램으로 보내기, 결정마다 누가 정했는지 적기 |
| `ch03` | 3장. 위키에 없는 것은 추측한다 | AI 세 줄 요약, `wiki/references/` 자료 페이지, 확인 칸 규칙, 개인 이름을 적지 않는 규칙 |
| `ch04` | 4장. 같은 실수를 두 번 하지 않으려면 | 보낸 공시 기록(`sent.json`), 동시 실행 잠금, 하루 20개 한도, `wiki/lessons/` |
| `ch05` | 5장. 비밀은 위키에 적지 않는다 | Railway 서버 실행, 키 이름과 받는 곳(`wiki/references/api-keys.md`) |
| `ch06` | 6장. 위키를 지키는 법 | 커밋 전 위키 점검 훅, `.env` 실제 값 차단, 규칙 11 |
| `ch07` | 7장. 옵시디언으로 본다 | 옵시디언으로 위키 보는 법(`wiki/references/obsidian-wiki.md`) |
| `ch08` | 8장. 6개월 뒤 위키가 망가지는 방식 | 위키 점검 절차(`wiki/decisions/wiki-lint.md`), 규칙 12 |
| `ch09` | 9장. 내 업무 위키로 옮긴다 | 다른 프로젝트에 넣는 뼈대(`starter/`) |

장마다 실제로 입력한 지시는 `prompts/` 에 있다.

## 실행

Node 21.7 이상이 필요하다(`process.loadEnvFile` 을 쓴다). `.env.example` 을 `.env` 로 복사해 값을 채운다. `.env` 는 커밋하지 않는다(`.gitignore` 에 있다).

```
npm install
node index.js              # 오늘 공시 목록을 화면에만 출력 (OPENDART_API_KEY 만 필요)
node index.js 20261002     # 그날 공시 목록
node notify.js             # 관심 종목 새 공시를 요약해 텔레그램으로 실제로 보낸다 (키 네 개 모두 필요)
```

태그(`ch01` 부터 `ch09`)를 받으면 `.env.example` 이 없다. 공개할 때 더한 파일이라서다. 위의 네 줄로 `.env` 를 직접 만든다. `ch01` 부터 `ch04` 까지는 `.env` 파일이 아예 없으면 시작하자마자 `ENOENT` 오류로 멈춘다(`.env` 가 없어도 넘어가게 바뀐 것은 5장 서버 배포 때다).

`notify.js` 는 화면에만 찍는 모드가 없다. 돌리면 바로 보낸다. 보낸 기록은 `sent.json`, 하루 센 값은 `sent-count.json` 에 생긴다.

커밋 전 점검 훅을 켜려면 한 번 실행한다.

```
git config core.hooksPath .githooks
```

다른 프로젝트에 이 위키 방식을 넣는 순서는 `starter/README.md` 에 있다.

## 필요한 키

| 이름 | 받는 곳 |
|---|---|
| `OPENDART_API_KEY` | OpenDART(opendart.fss.or.kr) 인증키 신청 |
| `TELEGRAM_BOT_TOKEN` | 텔레그램 @BotFather 에서 `/newbot` |
| `TELEGRAM_CHAT_ID` | 봇에게 메시지를 보낸 뒤 Bot API `getUpdates` 응답의 `message.chat.id` |
| `OPENROUTER_API_KEY` | openrouter.ai/keys |

자세한 절차는 `wiki/references/api-keys.md` 에 있다. 키 값은 위키에도, 커밋에도, AI 에게 보내는 지시에도 넣지 않는다.

## 주의

이 봇은 공시를 알려 주는 실습용 도구다. 투자나 매매를 권유하지 않으며, 요약은 AI 가 만든 것이라 틀릴 수 있다. 판단은 반드시 DART 원문으로 한다.

## 라이선스

코드는 MIT (`LICENSE`). 강의 본문과 화면은 인프런 강의 구매자의 학습 용도로만 제공되며 이 저장소에 포함되지 않는다.

## 강의와 커밋 번호가 다를 때

이 공개 저장소는 공시 원문에 있던 임원 이름을 이력 전체에서 지우느라, 강의 영상과 PDF에 나오는 커밋 번호 일부가 다릅니다. 내용은 같습니다. 강의에서 본 번호로 찾을 때는 아래 표의 오른쪽 번호를 쓰세요. 장별 태그(ch01~ch09)는 그대로입니다.

| 강의 속 번호 | 이 저장소 번호 | 태그 |
|---|---|---|
| # 원본 짧은해시 | 공개본 짧은해시 | 태그 |
| 81db5e7 | 1df90b1 |  |
| b574816 | 5990b7c |  |
| c5dd819 | dc57fc4 | ch03 |
| c61ab1d | 06c3ec7 |  |
| 3244c35 | 9344d38 |  |
| 5ae927a | 6b589d7 | ch04 |
| acadc2a | f45daa7 |  |
| 85825fa | d9c5fed |  |
| d42b4a9 | ccfa5c6 |  |
| f2c14e2 | 1a3ade5 | ch05 |
| 42f3867 | 8c14106 |  |
| c518e81 | e4613f1 |  |
| 0efeef7 | c691766 |  |
| 5fef260 | 356e613 | ch06 |
| 492fc6e | b3d32cb | ch07 |
| 550e667 | e2e971f |  |
| bf6f889 | 420ec1a |  |
| c169975 | 4951d0a |  |
| 0dcfcce | cd4a344 |  |
| f36e1c8 | 6948f24 |  |
| ddb0b73 | 4d98abe |  |
| 6549991 | d2dfaec | ch08 |
| 19213e3 | f9c46c1 | ch09 |
