# .env 와 node_modules 는 커밋하지 않는다

- 정한 날: 2026-10-02
- 누가 정함: 확인 안 됨 (커밋 `3515f73` 만 있고, 사용자가 정했는지 AI 가 골랐는지 남은 기록이 없다. 사용자 결정처럼 다룬다.)
- 상태: 유지
- 관련: [[index]], [[log]]

## 결정

`.gitignore` 에 `.env` 와 `node_modules/` 를 넣어 커밋에서 뺀다.

## 이유

- `.env` 에는 OpenDART API 키(`OPENDART_API_KEY`)가 들어 있다. `index.js` 가 `process.loadEnvFile` 로 이 파일을 읽는다.
- `node_modules/` 는 설치하면 다시 생기는 파일이라 저장소에 둘 필요가 없다.

## 앞으로

- API 키 같은 비밀값은 코드나 커밋에 넣지 않고 `.env` 에만 둔다.

## 근거

- 커밋 `3515f73` "커밋에서 .env 와 node_modules 를 뺀다"
