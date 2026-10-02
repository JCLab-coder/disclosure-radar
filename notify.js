// 관심 종목에 특정 날짜(기본: 오늘, KST)의 공시가 있으면 텔레그램으로 보낸다.
// 한 번 실행에 메시지 하나로 모아 보낸다. 텔레그램 한도(4096자)를 넘을 때만 공시 단위로 나눈다.
// 사용법: node notify.js [YYYYMMDD]
// 공시 조회(OpenDART 호출)는 dart.js 에 있다. 공시 목록 출력은 index.js.
// 중복 처리는 아직 없다. 실행할 때마다 그날 공시를 모두 다시 보낸다.

import { Api } from 'node-telegram-bot-api';
import { CORP_CLS, dartUrl, dateArg, fetchAll, prettyDate, reportName } from './dart.js';

// 관심 종목. 이름으로 맞추면 '카카오'에 카카오뱅크·카카오페이까지 걸리므로 종목코드로 맞춘다.
const WATCHLIST = {
  '005930': '삼성전자',
  '035720': '카카오',
  '247540': '에코프로비엠',
};

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MAX_LEN = 4096; // 텔레그램 sendMessage 글자 수 한도

function formatItem(it) {
  const cls = CORP_CLS[it.corp_cls] ?? it.corp_cls;
  const rm = it.rm ? ` [${it.rm}]` : '';
  return [
    `▪️ ${it.corp_name} (${cls})`,
    `${reportName(it)}${rm}`,
    `제출인: ${it.flr_nm}`,
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
