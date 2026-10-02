// 관심 종목에 특정 날짜(기본: 오늘, KST)의 공시가 있으면 텔레그램으로 보낸다.
// 사용법: node notify.js [YYYYMMDD]
// 중복 처리는 아직 없다. 실행할 때마다 그날 공시를 모두 다시 보낸다.

import { CORP_CLS, dartUrl, dateArg, fetchAll, prettyDate, reportName } from './dart.js';

// 관심 종목. 이름으로 맞추면 '카카오'에 카카오뱅크·카카오페이까지 걸리므로 종목코드로 맞춘다.
const WATCHLIST = {
  '005930': '삼성전자',
  '035720': '카카오',
  '247540': '에코프로비엠',
};

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(text) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, disable_web_page_preview: true }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`텔레그램 오류 [${data.error_code}] ${data.description}`);
}

function format(date, it) {
  const cls = CORP_CLS[it.corp_cls] ?? it.corp_cls;
  const rm = it.rm ? ` [${it.rm}]` : '';
  return [
    `📢 ${it.corp_name} (${cls}) 공시`,
    `${reportName(it)}${rm}`,
    `${prettyDate(date)} · 제출인: ${it.flr_nm}`,
    dartUrl(it),
  ].join('\n');
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
  for (const it of hits) {
    await sendTelegram(format(date, it));
    console.log(`  보냄: ${it.corp_name} — ${reportName(it)}`);
  }
}

main().catch((err) => {
  console.error('실패:', err.message);
  process.exit(1);
});
