// 관심 종목에 특정 날짜(기본: 오늘, KST)의 공시가 있으면 텔레그램으로 보낸다.
// 한 번 실행에 메시지 하나로 모아 보낸다. 텔레그램 한도(4096자)를 넘을 때만 공시 단위로 나눈다.
// 공시마다 원문을 OpenRouter(저가 모델)로 세 줄 요약해 같이 넣는다. 요약이 실패하면 요약 없이 보낸다.
// 사용법: node notify.js [YYYYMMDD]
// 공시 조회(OpenDART 호출)는 dart.js 에 있다. 공시 목록 출력은 index.js.
// 중복 처리는 아직 없다. 실행할 때마다 그날 공시를 모두 다시 보낸다.

import { Api } from 'node-telegram-bot-api';
import { CORP_CLS, dartUrl, dateArg, fetchAll, fetchDocumentText, prettyDate, reportName } from './dart.js';

// 관심 종목. 이름으로 맞추면 '카카오'에 카카오뱅크·카카오페이까지 걸리므로 종목코드로 맞춘다.
const WATCHLIST = {
  '005930': '삼성전자',
  '035720': '카카오',
  '247540': '에코프로비엠',
};

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MAX_LEN = 4096; // 텔레그램 sendMessage 글자 수 한도

// 요약 비용을 줄이려고 저가·비추론 모델을 쓰고, 원문 길이와 출력 토큰을 제한한다.
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SUMMARY_MODEL = 'google/gemini-2.5-flash-lite';
const SUMMARY_INPUT_CHARS = 6000; // 원문 앞부분만 보낸다
const SUMMARY_MAX_TOKENS = 300;

async function summarize(it) {
  const text = (await fetchDocumentText(it.rcept_no)).slice(0, SUMMARY_INPUT_CHARS);
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: SUMMARY_MODEL,
      max_tokens: SUMMARY_MAX_TOKENS,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            '한국 상장사 공시 원문을 투자자용으로 요약한다. 한국어로 정확히 세 줄, 줄마다 "- "로 시작하고 한 문장으로 쓴다. ' +
            '핵심 내용·숫자·날짜를 원문 그대로 쓰고, 원문에 없는 내용은 쓰지 않는다. 개인 연락처·주소는 쓰지 않는다. 다른 말은 덧붙이지 않는다.',
        },
        { role: 'user', content: `회사: ${it.corp_name}\n보고서: ${reportName(it)}\n\n원문:\n${text}` },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${data.error?.message ?? res.statusText}`);
  const lines = (data.choices?.[0]?.message?.content ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (lines.length === 0) throw new Error('OpenRouter 응답이 비어 있습니다.');
  return { text: lines.join('\n'), cost: data.usage?.cost ?? 0 };
}

function formatItem(it) {
  const cls = CORP_CLS[it.corp_cls] ?? it.corp_cls;
  const rm = it.rm ? ` [${it.rm}]` : '';
  return [
    `▪️ ${it.corp_name} (${cls})`,
    `${reportName(it)}${rm}`,
    `제출인: ${it.flr_nm}`,
    ...(it.summary ? [it.summary] : []),
    dartUrl(it),
  ].join('\n');
}

// 머리말 + 공시들을 메시지로 묶는다. 보통 하나지만, 한도를 넘으면 공시 단위로 나눈다.
function buildMessages(date, hits) {
  const header = `📢 ${prettyDate(date)} 관심 종목 공시 ${hits.length}건`;
  const messages = [];
  let cur = header;
  for (const it of hits) {
    const block = formatItem(it);
    if (cur.length + 2 + block.length > MAX_LEN) {
      messages.push(cur);
      cur = `${header} (이어서)`;
    }
    cur += `\n\n${block}`;
  }
  messages.push(cur);
  return messages;
}

async function main() {
  const date = dateArg();
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('.env 에 TELEGRAM_BOT_TOKEN 과 TELEGRAM_CHAT_ID 가 필요합니다.');
    process.exit(1);
  }
  const all = await fetchAll(date);
  const hits = all.filter((it) => it.stock_code in WATCHLIST);
  console.log(`${prettyDate(date)} 관심 종목 공시 ${hits.length}건 (전체 ${all.length}건)`);
  if (hits.length === 0) return;
  if (OPENROUTER_KEY) {
    let cost = 0;
    for (const it of hits) {
      try {
        const s = await summarize(it);
        it.summary = s.text;
        cost += s.cost;
      } catch (err) {
        console.error(`  요약 실패(요약 없이 보냄): ${it.corp_name} — ${err.message}`);
      }
    }
    console.log(`요약 비용 약 $${cost.toFixed(5)} (${SUMMARY_MODEL})`);
  } else {
    console.error('.env 에 OPENROUTER_API_KEY 가 없어 요약 없이 보냅니다.');
  }
  const telegram = new Api(BOT_TOKEN, { maxRetries: 0 }); // 기존처럼 실패 시 재전송 없이 종료한다.
  const messages = buildMessages(date, hits);
  for (const text of messages) {
    await telegram.sendMessage({
      chat_id: CHAT_ID,
      text,
      link_preview_options: { is_disabled: true },
    });
  }
  for (const it of hits) console.log(`  포함: ${it.corp_name} — ${reportName(it)}`);
  console.log(`메시지 ${messages.length}개로 보냄`);
}

main().catch((err) => {
  console.error('실패:', err.message);
  process.exit(1);
});
