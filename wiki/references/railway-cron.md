# Railway 크론과 설정 방법

- 종류: 자료 (결정이 아님)
- 출처:
  - Railway 문서 Cron jobs: `https://docs.railway.com/reference/cron-jobs`
  - Railway 문서 Config as code: `https://docs.railway.com/reference/config-as-code`
  - Railway 문서 Infrastructure as Code: `https://docs.railway.com/infrastructure-as-code`, `https://docs.railway.com/infrastructure-as-code/reference`
  - npm 패키지 `railway` 3.12.0 (Railway TypeScript SDK) 의 `README.md`, `dist/index-UavU4i3L.d.ts`
  - Railway CLI 5.49.6 출력과 Railway GraphQL API(`railway api`) 응답
- 확인한 날: 2026-10-03
- 관련: [[index]], [[railway-deploy]]

## 문서에서 확인한 것 (문서 원문)

- 시간대: "Cron jobs are scheduled based on UTC (Coordinated Universal Time)."
- 최소 간격: "Scheduled runs must be at least 5 minutes apart in UTC."
- 앞 실행이 아직 돌고 있을 때: "If a previous execution of your Cron service has a status of `Active`, the execution is still running and any new executions will not be run."
- 프로세스는 끝나야 한다: "Services configured as cron jobs are expected to execute a task, and terminate as soon as that task is finished, leaving no open resources."
- `railway.json`(Config as Code) 키: `deploy.cronSchedule`, `deploy.startCommand`, `deploy.restartPolicyType`(`ON_FAILURE`, `ALWAYS`, `NEVER`).
- Config as Code 지원 종료: "Existing Config as Code files stop being read on **2026-12-01** (hard cutoff)." CLI 도 `railway.json` 이 있으면 같은 날짜를 경고로 낸다.
- 새 형식(`.railway/railway.ts`, Infrastructure as Code) 문서에는 서비스의 크론 일정·재시작 정책을 적는 예시가 없다. SDK README 에는 "`fn` (cron)" 이라는 자원 이름만 있다. SDK 타입에는 `cronSchedule`, `restartPolicyType` 필드가 있다. 실제로 써 보지는 않았다.
- 크론 식은 서비스마다 하나다(설정 값 `cronSchedule` 이 문자열 하나다).

## 직접 해 보고 확인한 것 (2026-10-03, 이 프로젝트)

- `railway.json` 에 `startCommand`·`cronSchedule`·`restartPolicyType` 을 넣고 `railway up` 했다. 배포 정보(`deployment.meta`)의 `propertyFileMapping` 에는 세 키가 잡혔다. 그런데 `serviceManifest.deploy` 에는 `startCommand`·`cronSchedule` 이 `null`, `restartPolicyType` 은 `ON_FAILURE` 로 들어갔다. 컨테이너는 `npm start`(`node index.js`)를 한 번 실행했다. 왜 적용되지 않았는지는 확인하지 않았다.
- GraphQL `serviceInstanceUpdate`(`startCommand`, `cronSchedule`, `restartPolicyType`)로 서비스 설정에 직접 넣었다. `serviceInstance` 를 다시 조회하면 넣은 값과 `nextCronRunAt` 이 나온다.
- 크론 일정을 넣은 서비스는 `railway up` 으로 배포만 해서는 실행되지 않았다(배포 로그 없음).
- 크론 `50 16 * * *` 의 실행은 16:52:54 에 시작했다(약 3분 늦음, 1번 봄). 실행 기록은 GraphQL `deploymentInstanceExecutions(input:{serviceId, environmentId})` 로 볼 수 있다(`status` `EXITED`, `createdAt`, `completedAt`).
- 지금 한 번 실행시키기: GraphQL `deploymentInstanceExecutionCreate(input:{serviceInstanceId})`. `serviceInstanceId` 는 `serviceInstance(serviceId, environmentId) { id }` 로 얻는다. 2026-10-03 1번 써서 바로 실행됐다.
- 실행 로그는 `railway logs --deployment` 로 볼 수 있었다.
- `railway variable set KEY --stdin` 으로 값을 명령줄에 쓰지 않고 넣을 수 있다.
- 볼륨은 `railway volume add --mount-path /data` 로 서비스에 붙는다. 배포 로그에 "Mounting volume on: …" 이 나온다.
- 크론 실행마다 새 컨테이너가 뜨지만 볼륨 파일은 남는다(1번째 실행이 쓴 `sent.json` 을 2번째 실행이 읽었다).
- `railway volume files --volume <이름> list /` 는 크론 서비스(떠 있는 컨테이너 없음)에서 "Failed to initialize SFTP session … Timeout" 으로 실패했다.
- 서비스 설정의 시작 명령을 바꾼 뒤에는 `railway up` 으로 다시 배포해야 실행에 반영됐다. `railway deployment redeploy` 는 이전 배포의 설정을 그대로 가져가서, 서비스 설정에서 바꾼 시작 명령이 반영되지 않았다(`deployment.meta.serviceManifest.deploy.startCommand` 가 이전 값, `reason` `redeploy`). 1번 봤다.
- `railway up` 은 `.gitignore` 에 있는 파일을 빼고 올린다. 커밋하지 않았어도 `.gitignore` 에 없는 파일(이 프로젝트에서는 `wiki/.obsidian/`)은 올라간다.

## 확인하지 않은 것

- 크론이 정각보다 얼마나 늦게 도는지(1번만 봤다).
- `.railway/railway.ts` 로 크론 서비스를 정의하는 방법.
- 서비스 설정을 API 로 넣은 뒤 2026-12-01 이후에도 그대로 유지되는지(이 날짜 이후에 다시 본다).
