# 옵시디언으로 위키 보기

- 종류: 자료 (결정이 아님)
- 출처: 이 컴퓨터의 Obsidian 1.13.7 (installer 1.13.7) 과 그 `obsidian` 명령(`obsidian help` 출력), 보관함 설정 파일 `wiki/.obsidian/graph.json`
- 확인한 날: 2026-10-03
- 관련: [[index]], [[wiki-check-hook]], [[quoted-link-unresolved]], [[env-not-committed]]

## 보관함

- 옵시디언 보관함 이름은 `wiki`, 경로는 저장소의 `wiki/` 폴더다(`obsidian vaults verbose`). 2026-10-03 파일 18개, 폴더 3개(`obsidian vault`).
- 옵시디언 설정은 `wiki/.obsidian/` 에 있고 커밋하지 않는다([[env-not-committed]], `.gitignore` 6번째 줄). 그래서 아래 그래프 설정은 이 컴퓨터에만 있다.

## obsidian 명령 (2026-10-03 직접 돌려 봄)

저장소 폴더에서 돌렸다. 경로는 보관함(`wiki/`) 기준이다(`decisions/wiki-check-hook.md`). `file=` 은 위키 링크처럼 이름으로, `path=` 는 정확한 경로로 찾는다.

| 하려는 일 | 명령 | 2026-10-03 결과 |
|---|---|---|
| 없는 페이지를 가리키는 링크 | `obsidian unresolved verbose counts` | `링크	1	decisions/wiki-check-hook.md` 1개 |
| 아무 데서도 이어지지 않은 페이지 | `obsidian orphans all` | 없음 |
| 나가는 링크가 없는 페이지 | `obsidian deadends all` | 없음 |
| 개수만 | `obsidian unresolved total` / `orphans total` / `deadends total` | 1 / 0 / 0 |
| 한 페이지가 가리키는 링크 | `obsidian links path=decisions/wiki-check-hook.md` | 8개와 `링크 (unresolved)` |
| 백링크(이 페이지를 가리키는 곳) | `obsidian backlinks file=telegram-library counts` | 5개 파일(`watchlist-telegram`·`wiki-check-hook` 은 2번씩) |
| 보관함의 파일 목록 | `obsidian files` | 18개 |
| 글자 찾기 | `obsidian search query=링크 path=decisions total` | 3 |

- `obsidian backlinks file=index counts` 로 보면 [[index]] 는 위키의 다른 페이지 17개 모두에서 링크를 받는다.
- `obsidian search query='[[링크]]'` 는 "Error: Property cannot be nested within a property." 로 실패했다. 대괄호를 옵시디언 검색 문법으로 읽는 것 같다. 왜 그런지는 확인하지 않았다.
- 링크가 몇 번째 줄에서 나왔는지는 `obsidian eval` 로 옵시디언의 링크 캐시를 읽어 알 수 있었다. `obsidian eval code='JSON.stringify(app.metadataCache.getCache("decisions/wiki-check-hook.md").links.filter(l=>l.link==="링크").map(l=>l.position.start.line+1))'` → `[128]`. `app.metadataCache.unresolvedLinks` 로는 보관함 전체의 없는 링크를 본다.
- 이 명령들은 읽기만 했다. 명령을 돌린 앞뒤로 `wiki/` 아래 `.md` 의 `shasum` 이 같았다(사용자가 돌려 확인).

## 그래프와 백링크

- 그래프: 노드 하나가 페이지 하나, 선이 `[[링크]]` 하나다. 2026-10-03 이 보관함 그래프에는 노드가 19개 있다. 18개는 페이지이고, 1개는 없는 페이지 `링크` 다.
- 그래프의 연한 점 하나는 `링크` 노드다. 옵시디언이 만든 그래프 노드를 `obsidian eval` 로 읽으면(`app.workspace.getLeavesOfType("graph")[0].view.renderer.nodes`) `링크` 만 종류가 `unresolved` 이고 채움색 불투명도가 0.5, 나머지 18개는 1 이다.
  - 이 노드는 [[wiki-check-hook]] 128번째 줄, 근거 칸에 그대로 적은 사용자 말 원문 큰따옴표 안의 `[[링크]]` 에서 나온다. 그대로 두기로 했다([[quoted-link-unresolved]]).
  - 그래프 설정 `wiki/.obsidian/graph.json` 이 `"hideUnresolved": false` 라서 보인다. 그래프 필터에서 이 설정을 켜면 숨겨질 것이다. 켜 보지는 않았다.
- 백링크: 옵시디언에서 페이지를 열면 그 페이지를 가리키는 다른 페이지 목록을 볼 수 있다. 터미널에서는 위 표의 `obsidian backlinks` 로 본다. 화면의 백링크 창은 확인하지 않았다.

## 옵시디언과 `scripts/check-wiki.mjs` 가 다르게 보는 점 (2026-10-03 비교)

`obsidian unresolved`·`orphans`·`deadends` 와 `node scripts/check-wiki.mjs` 를 같은 작업 트리(커밋 `5fef260`, 바뀐 파일 없음)에서 돌려 비교했다. 스크립트는 "위키 점검 통과"(종료 코드 0), 옵시디언은 없는 링크 1개.

| | 옵시디언 | `check-wiki.mjs` |
|---|---|---|
| 큰따옴표 `"…"`·`“…”` 안의 `[[…]]` | 링크로 본다 | 보지 않는다(대화 원문이라서, [[wiki-check-hook]]) |
| 코드 `` `…` `` 안의 `[[…]]` | 링크로 보지 않는다([[wiki-check-hook]] 15·81번째 줄은 잡히지 않음) | 보지 않는다 |
| 이어지지 않은 페이지, 나가는 링크 없는 페이지 | 본다(`orphans`, `deadends`) | 보지 않는다 |
| 보는 내용 | 디스크의 지금 파일 | git 에 올라간 파일의 스테이지된 내용 |
| 보는 파일 | 보관함(`wiki/`)의 파일 | `git ls-files wiki/` 의 `.md` (`wiki/.obsidian/` 제외) |

- 그래서 지금 다른 것은 128번째 줄 `[[링크]]` 하나다.
- 대화 원문이 아닌 곳이라도 큰따옴표 안에 깨진 링크가 생기면 스크립트는 놓치고 옵시디언만 잡는다. 2026-10-03 에는 그런 링크가 없다(옵시디언의 없는 링크가 위 1개뿐).
- 커밋하지 않은 새 페이지는 옵시디언에서는 있는 페이지지만, 스크립트에서는 없는 페이지다(`git ls-files` 기준). 이 차이는 따로 시험하지 않았고 스크립트 코드를 읽고 적은 것이다.

## 확인하지 않은 것

- 옵시디언 공식 도움말 문서는 보지 않았다. 위 내용은 이 컴퓨터에서 명령을 돌리고 설정 파일을 읽어 확인한 것이다.
- 그래프 화면을 캡처해 눈으로 보지는 않았다. 연한 점이 `링크` 라는 것은 그래프 노드 정보와, 사용자가 본 연한 점이 하나라는 말로 맞춘 것이다.
- 다른 버전의 옵시디언에서도 같은지.
