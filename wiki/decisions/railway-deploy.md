# Railway 서버에서 평일 08:00~19:00 30분마다 돌린다

- 정한 날: 2026-10-03
- 누가 정함: 항목마다 다르다. 각 항목 끝 괄호에 적었다. 근거는 아래 "근거" 참고.
- 상태: 유지
- 관련: [[index]], [[log]], [[railway-cron]], [[sent-dedup]], [[daily-message-limit]], [[concurrent-runs]], [[env-not-committed]], [[file-structure]]

## 결정

- `notify.js` 를 Railway 서버에 올려 KST 평일 오전 8시부터 오후 7시까지 30분마다 자동으로 돌린다. (사용자)
- 키(`OPENDART_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `OPENROUTER_API_KEY`)는 서버 변수로 넣는다. `.env` 는 올리지 않는다(`.gitignore` 에 있어 `railway up` 이 빼고 올린다). (사용자)
- 08:00 과 19:00 을 둘 다 넣는다. 하루 23번(08:00, 08:30, …, 19:00)이다. (AI 기본값)
- Railway 크론은 UTC 이고 크론 식은 하나뿐이다([[railway-cron]]). KST 평일 08:00~19:00 은 UTC 로 일요일 23시부터 금요일 10시에 걸쳐 있어 식 하나로 딱 맞출 수 없다. 그래서 크론은 넓게 `*/30 0-10,23 * * 0-5`(UTC)로 두고, `notify.js` 가 `WEEKDAY_HOURS_ONLY=1` 일 때 KST 평일 08:00~19:00 이 아니면 아무것도 하지 않고 끝나게 했다(종료 코드 0). 서버 변수에 `WEEKDAY_HOURS_ONLY=1` 을 넣었다. 로컬에서 직접 실행할 때는 이 변수가 없으니 전처럼 언제든 돈다. (AI 기본값)
  - 크론이 늦게 돌 수 있어(2026-10-03 시험에서 16:50 예정이 16:52:54 에 시작) 19시대는 19:30 전까지 받는다. 19:30 실행(UTC 10:30)은 거른다. (AI 기본값)
  - 공휴일은 거르지 않는다. 평일이면 돈다. 공휴일에는 공시가 거의 없어 0건으로 끝난다. (AI 기본값)
- 상태 파일(`sent.json`, `sent-count.json`, `sent.lock`)은 서버 볼륨(`/data`)에 둔다. 서버 컨테이너의 파일은 실행이 끝나면 사라지므로, 그대로 두면 실행마다 같은 공시를 다시 보내고([[sent-dedup]]) 하루 20개도 0부터 다시 센다([[daily-message-limit]]). `notify.js` 가 `STATE_DIR` 변수(없으면 전처럼 프로젝트 폴더)를 읽게 했고, 서버 변수에 `STATE_DIR=/data` 를 넣었다. (AI 기본값)
- `sent.lock` 에 적힌 pid 가 자기 pid 와 같으면 남은 잠금으로 보고 치운다. 컨테이너에서는 강제 종료된 이전 실행과 새 실행의 pid 가 같을 수 있다. 그러면 남은 잠금을 살아 있는 실행의 것으로 보고 10분 기다린 뒤 실패하고, 그 뒤 실행도 모두 같은 이유로 실패한다. (AI 기본값)
- `dart.js` 는 `.env` 가 없으면 넘어간다(서버에는 `.env` 가 없다). 다른 이유로 못 읽으면 전처럼 오류다. (AI 기본값)
- 시작 명령 `node notify.js`, 크론 식, 재시작 정책 `NEVER` 는 저장소 파일이 아니라 Railway 서비스 설정에 API(`serviceInstanceUpdate`)로 넣었다. `railway.json` 은 써 봤지만 적용되지 않았고(`npm start` 가 돌았다), 2026-12-01 에 지원이 끝난다([[railway-cron]]). 그래서 지웠다. 새 형식 `.railway/railway.ts` 는 크론 서비스 적는 법이 문서에 없어 쓰지 않았다. (AI 기본값)
  - 재시작 정책을 `NEVER` 로 둔 이유: 실패하면 다음 30분 실행이 다시 한다. 기본값 `ON_FAILURE` 는 실패한 실행을 곧바로 최대 10번 다시 돌린다. (AI 기본값)
- Railway 프로젝트 `disclosure-radar`, 서비스 `disclosure-radar`, 환경 `production`, 볼륨 `disclosure-radar-volume`(`/data`)을 새로 만들었다. 지역은 Railway 기본값(`europe-west4`)이다. (AI 기본값)
- 배포는 `railway up`(이 폴더를 올림)으로 한다. GitHub 저장소와 잇지 않았다. 코드를 고치면 `railway up` 을 다시 해야 서버에 반영된다. (AI 기본값)

## 알아 둘 것

- 서버와 로컬은 상태 파일을 따로 가진다. 같은 날 로컬에서 `node notify.js` 를 돌리면 서버가 이미 보낸 공시가 다시 가고, 하루 20개도 따로 센다. [[sent-dedup]]·[[daily-message-limit]] 의 "다른 컴퓨터나 다른 폴더에서 같은 봇으로 실행하는 경우"에 해당한다.
- 서버 볼륨의 `sent.json` 은 빈 상태로 시작했다. 로컬 `sent.json` 은 옮기지 않았다. 서버는 그날(KST) 공시만 보므로, 로컬에서 이미 보낸 지난 날짜 공시가 서버에서 다시 가지는 않는다.
- 2026-10-03 위키 점검 때 서버는 현대차 추가([[watchlist-telegram]], 커밋 `550e667`, KST 03:11)를 반영하지 않은 상태였다. 마지막 배포 `5c24e175` 가 KST 02:14 에 만들어졌기 때문이다(`railway deployment list --json` 의 `createdAt` `2026-10-02T17:14:50Z`). 그래서 서버는 관심 종목 셋, 로컬은 넷을 본다. 서버 파일을 직접 열어 보지는 않았고 배포 시각으로 판단했다. 사용자가 반영을 요청했지만, 이 세션의 `railway up` 은 Claude Code 자동 모드의 권한 판정("Production Deploy")에서 막혀 실행되지 않았다. 반영하려면 사용자가 `railway up --ci -s disclosure-radar -e production` 을 돌린다.
  - 2026-10-03 덧붙임: 사용자가 위 명령을 직접 돌려 배포 `d0489669` 가 만들어졌다("Deploy complete"). 그래서 서버도 관심 종목 넷을 본다. 다만 이것은 배포 시각과 작업 트리로 판단한 것이고, 서버 파일은 열어 보지 않았다. 아래 확인 칸 참고.

## 확인

- 2026-10-03 시간 거르기(로컬): `inWeekdayHoursKST` 를 떼어 내 2026-10-04(일) 00:00 UTC 부터 7일 동안 크론 식 `*/30 0-10,23 * * 0-5` 이 도는 시각마다 넣었다. 통과한 시각 115개가 KST 2026-10-05(월)~10-09(금) 08:00~19:00 30분 간격 115개와 순서까지 같았다. 늦게 도는 경우 UTC 10:04·10:29 는 통과, 10:30(KST 19:30)·일요일 22:59·금요일 23:00(KST 토 08:00)은 거름.
- 2026-10-03 가짜 조회·전송(로컬): scratchpad 에 `notify.js` 를 복사하고(`cmp` 로 원본과 같음 확인), 가짜 `dart.js`(삼성전자 공시 3건)와 가짜 `node-telegram-bot-api`(보내지 않고 기록만)를 두었다. 실제 텔레그램·상태 파일은 쓰지 않았다.
  - 없는 폴더를 `STATE_DIR` 로 주고 실행: 폴더를 만들고 `sent.json`·`sent-count.json` 을 거기에 썼다. 프로그램 폴더에는 생기지 않았다. 같은 `STATE_DIR`(끝에 `/` 붙임)로 다시 실행하면 새로 보낼 것 0건.
  - 자기 pid 가 적힌 `sent.lock` 을 두고 같은 프로세스에서 `notify.js` 를 불러 실행: "이전 실행(pid …)이 남긴 sent.lock 을 지웁니다" 뒤 1개 전송, 종료 코드 0.
  - 살아 있는 다른 프로세스(`sleep 60`) pid 의 잠금: 기다렸다(3초에 끊음). 잠금은 지우지 않았다.
  - `WEEKDAY_HOURS_ONLY=1` (실행 때 KST 토요일): "KST 평일 08:00~19:00 이 아니라 실행하지 않습니다", 전송 0.
  - `STATE_DIR` 없이: 전처럼 프로그램 폴더에 상태 파일이 생겼다.
- 2026-10-03 `.env` 없는 폴더에 실제 `dart.js` 만 두고 불러오기: 오류 없이 불러왔다. 원래 폴더에서는 `.env` 의 `OPENDART_API_KEY` 를 읽었다.
- 2026-10-03 서버 변수: 키 4개를 `railway variable set KEY --stdin` 으로 넣고, `railway variable list --json` 값과 로컬 `.env` 값을 sha256 앞 8자리로 비교해 4개 중 4개가 같았다(값은 출력하지 않았다).
- 2026-10-03 서버 실행(진짜): 크론을 잠깐 `50 16 * * *`(UTC), `WEEKDAY_HOURS_ONLY=0` 으로 바꾸고 `railway up` 했다. 크론 실행 1번(`deploymentInstanceExecutions`: 16:52:54 시작, 16:52:57 `EXITED`)이 있었다. 로그는 "Mounting volume on: …", "2026-10-03 관심 종목 공시 0건 (전체 0건), 이미 보낸 것 0건 빼고 새로 보낼 것 0건". 서버에서 `node notify.js` 가 돌고 서버 변수의 OpenDART 키로 조회가 됐다. 공시가 0건(토요일)이라 요약·텔레그램 전송·볼륨에 상태 파일 쓰기는 서버에서 일어나지 않았다.
- 그 뒤 크론을 `*/30 0-10,23 * * 0-5`, `WEEKDAY_HOURS_ONLY=1` 로 되돌리고 다시 `railway up` 했다. `serviceInstance` 조회: `startCommand` `node notify.js`, `cronSchedule` `*/30 0-10,23 * * 0-5`, `restartPolicyType` `NEVER`, `nextCronRunAt` `2026-10-02T23:00:00.000Z`(KST 토 08:00).
- 2026-10-03 서버 거르기(진짜): 되돌린 뒤 GraphQL `deploymentInstanceExecutionCreate` 로 지금 한 번 실행시켰다(UTC 16:54:36 = KST 토 01:54). 로그: "KST 평일 08:00~19:00 이 아니라 실행하지 않습니다. (지금 UTC 2026-10-02T16:54:36.809Z)". 실행 상태 `EXITED`(16:54:38). OpenDART 조회도 하지 않았다.
- 2026-10-03 서버 전송(진짜): 사용자 요청으로 지난 평일 날짜로 서버에서 실행했다. 서버 설정을 잠깐 시작 명령 `node notify.js 20261002`, `WEEKDAY_HOURS_ONLY=0` 으로 바꾸고 `railway up` 한 뒤 `deploymentInstanceExecutionCreate` 로 두 번 실행했다. 2026-10-02 관심 종목 공시는 1건(`20261002800981`, 삼성전자 최대주주등소유주식변동신고서)이고, 로컬에서 보낸 적 없는 공시다(로컬 `sent.json` 에 없음).
  - 1번째(UTC 16:58:46): "관심 종목 공시 1건 (전체 771건), 이미 보낸 것 0건 빼고 새로 보낼 것 1건", "요약 비용 약 $0.00039", "메시지 1개로 보냄 (오늘 1/20)". 실행 상태 `EXITED`.
  - 2번째(UTC 16:59:34, 같은 배포): "이미 보낸 것 1건 빼고 새로 보낼 것 0건". 1번째 실행이 볼륨에 쓴 `sent.json` 을 2번째 실행(새 컨테이너)이 읽었다.
  - 텔레그램 대화방에 메시지가 실제로 도착했는지는 이 세션에서 직접 보지 않았다. 서버 로그의 "메시지 1개로 보냄"은 `sendMessage` 가 성공했을 때만 나온다.
  - `railway volume files --volume disclosure-radar-volume list /` 는 "Failed to initialize SFTP session … Timeout" 으로 실패해 볼륨 파일 목록은 이 명령으로 보지 못했다.
- 2026-10-03 서버 볼륨 내용과 서버 코드(진짜): 커밋 `acadc2a` 를 만든 뒤(작업 트리에는 커밋 안 하는 `wiki/.obsidian/` 만 남음) 시작 명령을 잠깐 파일 해시·`/data` 목록·내용을 출력하는 `sh -c '…'` 로 바꾸고 `railway up` 해서 한 번 실행했다(배포 `a056c97d`).
  - `/data`: `sent.json` 은 `["20261002800981"]`, `sent-count.json` 은 date `20261003`, count `1`. `sent.lock` 은 없었다.
  - 서버 `/app` 의 파일(`node_modules` 제외) 28개의 sha256 과 `git show acadc2a:<파일>` 의 sha256 을 비교했다. 커밋 파일 23개 중 23개가 같았다(`dart.js`, `index.js`, `notify.js`, `package.json`, `package-lock.json`, `.gitignore`, `CLAUDE.md`, `AGENTS.md`, 위키 15개). 서버에만 있는 5개는 커밋하지 않은 `wiki/.obsidian/*.json` 이다. `.env`·`sent.json`·`sent-count.json` 은 올라가지 않았다.
  - 그 뒤 시작 명령을 `node notify.js` 로 되돌리고 같은 작업 트리(HEAD `acadc2a`, `git status` 는 `wiki/.obsidian/` 만)를 다시 `railway up` 했다(배포 `5c24e175`). 이 마지막 배포의 파일 해시는 직접 보지 않았다. 같은 작업 트리를 한 번 더 올린 것이다. `deployment.meta` 의 `startCommand` `node notify.js`, `cronSchedule` `*/30 0-10,23 * * 0-5`, `restartPolicyType` `NEVER`. 바로 한 번 실행하니 "KST 평일 08:00~19:00 이 아니라 실행하지 않습니다".
  - 처음에는 시작 명령만 바꾸고 `railway deployment redeploy` 를 했는데, 이전 배포의 설정(시작 명령 `node notify.js`)이 그대로 쓰였다. 그래서 진단은 `railway up` 으로 다시 했다. [[railway-cron]] 참고.
- 2026-10-03 현대차 추가 반영(사용자가 `railway up --ci -s disclosure-radar -e production` 을 실행): 실행 전 HEAD 는 `0dcfcce`(KST 03:20:48)였고, `git status --short` 출력이 비어 있었다. 출력은 빌드 스냅샷 60 kB, Railpack 0.40.1, node 21.7.3, 시작 명령 `node notify.js`, "Deploy complete" 였다. 그 뒤 `railway deployment list --json` 로 확인했다. 맨 위 배포는 `d0489669`(`SUCCESS`, `createdAt` `2026-10-02T18:21:27Z` = KST 03:21:27)이고, `startCommand` `node notify.js`, `cronSchedule` `*/30 0-10,23 * * 0-5`, `restartPolicyType` `NEVER`, `volumeMounts` `["/data"]` 로 전과 같았다. 이전 배포 `5c24e175` 는 `REMOVED` 였다. 서버 `/app` 의 파일 해시와 `WATCHLIST` 내용은 보지 않았다. 볼 때는 시작 명령을 잠깐 바꿔야 해서 하지 않았다. `wiki/.obsidian/` 이 빠졌는지도 보지 않았다. 반영 뒤 크론 실행(다음은 KST 2026-10-05 월 08:00)도 아직 보지 않았다.
- 확인하지 않은 것: 실제 평일 크론 23번이 모두 도는지, 크론이 몇 분까지 늦는지, 실행 중 컨테이너가 죽었을 때 남은 잠금 처리(서버에서), 2026-12-01 이후 서비스 설정이 그대로인지.

## 근거

- 2026-10-03 대화: "이 봇을 레일웨이 서버에 올려서 평일 오전 8시부터 오후 7시까지 30분마다 자동으로 돌게 해 줘. 레일웨이 CLI 는 로그인돼 있어. 키는 서버 변수로 넣고, 올린 다음 서버에서 실제로 한 번 돌았는지 확인해 줘."
- 08:00·19:00 포함, 크론 식과 코드 거르기, 19:30 전까지 받기, 공휴일, 볼륨·`STATE_DIR`, 잠금 pid 처리, `.env` 없으면 넘어가기, API 로 서비스 설정, 재시작 `NEVER`, 이름·지역, `railway up` 배포는 사용자가 말하지 않았다. 작업하면서 AI 가 고른 것이다.
