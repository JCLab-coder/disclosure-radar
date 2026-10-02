# OpenRouter 모델과 요금

- 종류: 자료 (결정이 아님)
- 출처: `https://openrouter.ai/api/v1/models` (공개 API, 키 없이 호출), `https://openrouter.ai/api/v1/chat/completions` (요약 호출)
- 확인한 날: 2026-10-03
- 관련: [[index]], [[disclosure-summary]]

## 직접 확인한 것

`curl -s https://openrouter.ai/api/v1/models` 결과에서 이름에 gemini flash, gpt-4.1-nano, gpt-4o-mini, gpt-5-nano·mini, haiku, qwen3, deepseek, llama-4, mistral-small 이 들어간 모델만 골랐다(`:free` 제외). 그중 입력 요금이 싼 순서로 40개를 봤다. 전체 모델 목록을 다 본 것은 아니다.

`pricing.prompt`·`pricing.completion` 에 100만을 곱한 값이다(달러 / 100만 토큰). 본 것 중 일부:

| 모델 | 입력 | 출력 |
|---|---|---|
| `google/gemini-2.5-flash-lite` (요약에 씀) | 0.100 | 0.400 |
| `openai/gpt-4.1-nano` | 0.100 | 0.400 |
| `openai/gpt-5-nano` | 0.050 | 0.400 |
| `qwen/qwen3.7-flash` | 0.030 | 0.130 |
| `deepseek/deepseek-v4-flash` | 0.028 | 0.056 |
| `mistralai/mistral-small-3.2-24b-instruct` | 0.094 | 0.250 |
| `meta-llama/llama-4-scout` | 0.100 | 0.300 |

- `:batch` 가 붙은 모델 이름도 목록에 있었다(예: `google/gemini-2.5-flash-lite:batch` 0.050 / 0.200).
- `chat/completions` 를 `Authorization: Bearer <OPENROUTER_API_KEY>` 로 불렀을 때, 응답의 `usage.cost` 에 비용이 달러로 들어 있었다. `node notify.js 20261001` 에서 요약 5건의 `usage.cost` 합계가 $0.00059 였다.

## 확인하지 않은 것

- 위 모델들의 한국어 요약 품질. 실제로 써 본 것은 `google/gemini-2.5-flash-lite` 하나다.
- 모델별로 추론(thinking) 토큰을 쓰는지 여부.
- `:batch` 모델의 사용법과 조건.
- 요금은 바뀔 수 있다. 위 값은 2026-10-03 에 본 값이다.
