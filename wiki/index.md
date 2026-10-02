# disclosure-radar 위키

정해진 결정과 그 이유를 남기는 곳이다. 작업 전에 이 목차와 관련 페이지를 먼저 읽는다. 변경 기록은 [[log]].

## 결정 (decisions/)

괄호는 누가 정했는지다(사용자 / AI 기본값 / 확인 안 됨, 다루는 법은 `CLAUDE.md` 규칙 2). "항목마다"인 페이지는 항목 끝 괄호를 본다.

- [[markets-filter]] (사용자): 공시 목록은 유가·코스닥만. 건수가 적다는 말이 나와도 넓히지 않는다.
- [[file-structure]] (사용자): 코드는 `dart.js`(조회)·`index.js`(목록)·`notify.js`(알림) 셋. 조회 코드를 `notify.js` 로 합치지 않는다.
- [[watchlist-telegram]] (항목마다): 관심 종목 넷(삼성전자·카카오·에코프로비엠·현대차)의 공시를 종목코드로 골라, 한 번 실행에 메시지 하나로 텔레그램에 보낸다(4096자 넘으면 나눔).
- [[telegram-library]] (사용자): 전송은 `node-telegram-bot-api` 의 `sendMessage()`.
- [[disclosure-summary]] (항목마다): 공시 원문을 OpenRouter `google/gemini-2.5-flash-lite` 로 세 줄 요약해 넣는다. 실패하면 요약 없이 보낸다.
- [[sent-dedup]] (사용자, 방법은 AI 기본값): 보낸 접수번호를 `sent.json` 에 남겨 다시 보내지 않는다. 동시 실행은 `sent.lock` 으로 막는다.
- [[daily-message-limit]] (사용자, 세부는 AI 기본값): 하루(보내는 날, KST) 메시지 20개까지. 센 값은 `sent-count.json`. 못 보낸 공시는 다음 날 간다.
- [[railway-deploy]] (항목마다): Railway 에서 KST 평일 08:00~19:00 30분마다 `node notify.js`. 키는 서버 변수, 상태 파일은 볼륨 `/data`(`STATE_DIR`). 2026-10-03 배포 `d0489669` 로 현대차 추가를 반영했다(서버 파일 내용은 보지 않음).
- [[wiki-check-hook]] (사용자, 방법은 AI 기본값): 커밋 전 훅(`.githooks/`)이 변경 기록 지난 줄, 결정 페이지 근거 줄, 없는 페이지 링크(`scripts/check-wiki.mjs`)와 커밋·커밋 메시지에 든 `.env` 실제 값(`scripts/check-secrets.mjs`, 값은 찍지 않음)을 점검해 막는다. 점검 스크립트는 마지막 커밋에 있는 것을 돌리고, 점검 장치·규칙 파일이 바뀌는 커밋은 메시지에 `[점검·규칙 변경]` 을 붙인다(`scripts/check-guard.mjs`). 새로 받은 저장소에서는 `git config core.hooksPath .githooks` 로 켠다.
- [[env-not-committed]] (항목마다): `.env`·`node_modules/`·`wiki/.obsidian/` 은 커밋하지 않는다. 비밀값은 위키에도 적지 않는다.
- [[wiki-lint]] (사용자, 시점·방법은 AI 기본값): 위키를 코드·설정·서버와 대조하는 점검 절차. 작업을 시작할 때 가벼운 점검(위키를 고치지 않고 다른 파일만 바꾼 커밋 찾기), 요청할 때 전체 점검, 배포 전후에 서버 칸. 읽기만 하고 보고한 뒤 고친다. 점검 기록이 이 페이지에 있다(`CLAUDE.md` 규칙 12).
- [[quoted-link-unresolved]] (사용자): [[wiki-check-hook]] 근거 원문 큰따옴표 안의 `[[링크]]` 는 옵시디언에서 없는 링크(그래프의 연한 점)로 보여도 그대로 둔다.

## 자료 (references/)

결정이 아니라 작업하다 알아낸 자료다. 모두 2026-10-03 확인.

- [[api-keys]]: 키 네 개의 이름·받는 곳, 다른 컴퓨터에서 돌리는 순서. 값은 없다.
- [[opendart-document-api]]: `document.xml` 응답 형식, OpenDART 호출 한도(하루 20,000건, 넘으면 `020`).
- [[openrouter-models]]: OpenRouter 저가 모델 요금, `chat/completions` 호출.
- [[railway-cron]]: Railway 크론(UTC, 5분 이상 간격), `railway.json` 2026-12-01 지원 종료, API 로 설정·즉시 실행하는 법.
- [[obsidian-wiki]]: 옵시디언으로 위키 보기(그래프·백링크·`obsidian` 명령), 그래프의 연한 점, `scripts/check-wiki.mjs` 와 다르게 보는 점.

## 교훈 (lessons/)

이전에 한 실수다. 비슷한 작업 전에 읽는다.

- [[concurrent-runs]]: 차례로 두 번 돌린 것은 동시 실행 확인이 아니다. 상태 파일의 읽기~쓰기를 통째로 잠그고, 결과는 실제 전송 횟수로 본다.
- [[checker-self-edit]]: 점검에 막히면 규칙 파일·점검 장치를 고쳐 통과시키지 않고 사용자에게 묻는다. 장치를 바꿀 일이 있으면 그것만 따로 커밋한다.

## 쓰는 규칙

공통 규칙은 `CLAUDE.md`(= `AGENTS.md`)에 있다. 여기에는 페이지 형식만 적는다.

- 결정: `wiki/decisions/<이름>.md` 에 결정 하나. 무엇을, 누가(항목마다 다르면 항목 끝 괄호), 왜, 언제, 확인, 근거(커밋·대화 원문 그대로)를 적는다.
- 자료: `wiki/references/<이름>.md`. 출처 주소, 확인한 날, 직접 확인한 것과 확인하지 않은 것.
- 교훈: `wiki/lessons/<이름>.md`. 무슨 일이 있었나, 원인, 다음에 어떻게 할지, 근거.
- 결정을 뒤집을 때는 페이지를 지우지 않고, 바뀐 내용과 이유를 그 페이지에 덧붙인다.
- 페이지를 추가하거나 고치면 이 목차와 [[log]] 를 함께 고친다. [[log]] 의 지난 기록은 고쳐 쓰지 않고, 새 기록을 맨 위에 더한다.
