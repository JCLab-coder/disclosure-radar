# 키 네 개: 이름과 받는 곳

- 종류: 자료 (결정이 아님)
- 출처:
  - OpenDART: `https://opendart.fss.or.kr/intro/main.do` ("인증키 신청" 메뉴, `/uss/umt/EgovMberInsertView.do`)
  - 텔레그램 봇 토큰: `https://core.telegram.org/bots/features#botfather`
  - 텔레그램 대화방 id: `https://core.telegram.org/bots/api#getupdates`
  - OpenRouter: `https://openrouter.ai/docs/api-reference/authentication`, 키 만드는 곳 `https://openrouter.ai/keys`
- 확인한 날: 2026-10-03
- 관련: [[index]], [[env-not-committed]], [[railway-deploy]], [[watchlist-telegram]], [[disclosure-summary]], [[opendart-document-api]], [[openrouter-models]], [[sent-dedup]], [[daily-message-limit]]

다른 컴퓨터에서 봇을 돌릴 때 필요한 키를 정리한 것이다. 키 값은 위키에 적지 않는다([[env-not-committed]]). 값은 위키나 git 이 아닌 곳에 따로 둔다.

## 키 네 개

| 이름 | 쓰는 코드 | 받는 곳 |
|---|---|---|
| `OPENDART_API_KEY` | `dart.js` (공시 목록 `list.json`, 원문 `document.xml` 의 `crtfc_key`) | OpenDART 사이트의 "인증키 신청" 메뉴 |
| `TELEGRAM_BOT_TOKEN` | `notify.js` (`node-telegram-bot-api`) | 텔레그램 @BotFather 에서 `/newbot` 으로 봇을 만들면 받는다. 잃어버리거나 새어 나가면 `/token` 으로 새로 받는다. |
| `TELEGRAM_CHAT_ID` | `notify.js` (`sendMessage` 의 `chat_id`) | 키가 아니라 메시지를 받을 대화방 번호다. 봇에게 메시지를 보낸 뒤 Bot API `getUpdates` 를 부르면, 응답의 `message.chat.id` 에 있다. |
| `OPENROUTER_API_KEY` | `notify.js` (요약, `Authorization: Bearer <키>`) | `https://openrouter.ai/keys` 에서 이름과 사용 한도를 정해 만든다. |

- 지금 쓰는 값은 이 컴퓨터의 `.env` 와 Railway 서버 변수에 있다([[railway-deploy]]). 서버 변수에는 이 넷 말고도 `STATE_DIR=/data`, `WEEKDAY_HOURS_ONLY=1` 이 있는데, 이 둘은 비밀값이 아니고 서버에서만 쓴다.

## 다른 컴퓨터에서 돌리기

1. 이 저장소를 받는다. 2026-10-03 에는 원격 저장소가 없다(`git remote -v` 결과가 비어 있음).
2. Node 21.7 이상을 쓴다(`package.json` 의 `engines`, `process.loadEnvFile` 때문). 이 컴퓨터는 v25.9.0 이다.
3. `npm install` 을 한다(`node-telegram-bot-api`).
4. 프로젝트 폴더에 `.env` 를 만든다. `.env` 는 커밋하지 않는다([[env-not-committed]]).

   ```
   OPENDART_API_KEY=<값>
   TELEGRAM_BOT_TOKEN=<값>
   TELEGRAM_CHAT_ID=<값>
   OPENROUTER_API_KEY=<값>
   ```

5. `node notify.js` (오늘) 또는 `node notify.js 20261002` (그날)를 돌린다. `node index.js` 는 `OPENDART_API_KEY` 만 있으면 된다.

주의: 다른 컴퓨터는 보낸 기록(`sent.json`)과 하루 센 값(`sent-count.json`)을 따로 가진다. 그래서 서버가 이미 보낸 공시가 다시 가고, 하루 20개도 따로 센다([[railway-deploy]] "알아 둘 것", [[sent-dedup]], [[daily-message-limit]]).

## 직접 확인한 것

- 2026-10-03 위 출처 페이지 네 개를 열어 받는 곳을 확인했다. OpenDART 는 메인 페이지 메뉴에 "인증키 신청"이 있다. 텔레그램은 `/newbot` 으로 토큰을 받고, `/token` 으로 새로 받는다. `getUpdates` 의 결과에서 Message 의 `chat` 은 Chat 객체이고, 그 `id` 가 대화방 id 다. OpenRouter 는 keys 페이지에서 키를 만들고 Bearer 헤더로 보낸다.
- 2026-10-03 `grep -n "process.env" *.js` 로 코드가 읽는 변수를 봤다. 키 네 개와 `STATE_DIR`, `WEEKDAY_HOURS_ONLY` 다.
- 2026-10-03 값을 가리고(`sed 's/=.*/=<hidden>/' .env`) 이 컴퓨터 `.env` 의 이름을 봤다. 위 네 개다.

## 확인하지 않은 것

- 다른 컴퓨터에서 위 순서대로 실제로 돌려 보지 않았다.
- OpenDART 인증키 신청 과정(가입, 승인에 걸리는 시간)은 직접 해 보지 않았다.
- 지금 쓰는 `TELEGRAM_CHAT_ID` 를 어떻게 얻었는지는 기록이 없다. `getUpdates` 로 얻는 법은 문서만 봤고 이 프로젝트에서 돌려 보지 않았다.
- `OPENROUTER_API_KEY` 가 없을 때 `notify.js` 가 어떻게 되는지는 이번에 돌려 보지 않았다.
