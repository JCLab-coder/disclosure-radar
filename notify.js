// 관심 종목에 특정 날짜(기본: 오늘, KST)의 공시가 있으면 텔레그램으로 보낸다.
// 한 번 실행에 메시지 하나로 모아 보낸다. 텔레그램 한도(4096자)를 넘을 때만 공시 단위로 나눈다.
// 공시마다 원문을 OpenRouter(저가 모델)로 세 줄 요약해 같이 넣는다. 요약이 실패하면 요약 없이 보낸다.
// 사용법: node notify.js [YYYYMMDD]
// 공시 조회(OpenDART 호출)는 dart.js 에 있다. 공시 목록 출력은 index.js.
// 한 번 보낸 공시(접수번호)는 sent.json 에 남기고 다시 보내지 않는다. 새 공시가 없으면 아무것도 보내지 않는다.
// 동시에 여러 번 실행되면 sent.lock 으로 한 번에 하나씩 돌게 한다(뒤 실행은 기다렸다가 sent.json 을 다시 읽는다).
// 하루(보내는 날, KST)에 메시지를 20개까지만 보낸다. 센 값은 sent-count.json 에 있다. 못 보낸 공시는 다음 날 간다.
// 상태 파일(sent.json, sent-count.json, sent.lock)은 STATE_DIR(없으면 이 폴더)에 둔다. 서버에서는 볼륨(/data)이다.
// WEEKDAY_HOURS_ONLY=1 이면 KST 평일 08:00~19:00 이 아닐 때 아무것도 하지 않고 끝난다(서버 크론용).

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Api } from 'node-telegram-bot-api';
import { CORP_CLS, dartUrl, dateArg, fetchAll, fetchDocumentText, prettyDate, reportName, todayKST } from './dart.js';

// 관심 종목. 이름으로 맞추면 '카카오'에 카카오뱅크·카카오페이까지 걸리므로 종목코드로 맞춘다.
const WATCHLIST = {
  '005930': '삼성전자',
  '035720': '카카오',
  '247540': '에코프로비엠',
  '005380': '현대차',
};

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MAX_LEN = 4096; // 텔레그램 sendMessage 글자 수 한도

// 상태 파일을 두는 폴더. 서버 컨테이너의 파일은 실행이 끝나면 사라지므로, 서버에서는 볼륨 경로를 준다.
const STATE_DIR = process.env.STATE_DIR ? pathToFileURL(`${process.env.STATE_DIR.replace(/\/+$/, '')}/`) : new URL('.', import.meta.url);

// 보낸 공시의 접수번호(rcept_no) 목록. 접수번호는 공시마다 하나라서 이것으로 중복을 가린다.
const SENT_FILE = new URL('sent.json', STATE_DIR);

function loadSent() {
  try {
    return new Set(JSON.parse(readFileSync(SENT_FILE, 'utf8')));
  } catch (err) {
    if (err.code === 'ENOENT') return new Set();
    throw new Error(`sent.json 을 읽지 못했습니다: ${err.message}`);
  }
}

function saveSent(sent) {
  writeFileSync(SENT_FILE, `${JSON.stringify([...sent].sort(), null, 2)}\n`);
}

// 하루에 보낸 메시지 수. 공시 날짜가 아니라 보내는 날(KST) 기준으로 센다.
// 날짜가 바뀌면 0부터 다시 센다. 읽기·쓰기는 sent.json 과 같이 sent.lock 안에서만 한다.
const COUNT_FILE = new URL('sent-count.json', STATE_DIR);
const DAILY_LIMIT = 30;

function loadCount(today) {
  let data;
  try {
    data = JSON.parse(readFileSync(COUNT_FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return 0;
    throw new Error(`sent-count.json 을 읽지 못했습니다: ${err.message}`);
  }
  if (!/^\d{8}$/.test(data?.date) || !Number.isInteger(data?.count) || data.count < 0) {
    throw new Error('sent-count.json 형식이 맞지 않습니다.');
  }
  return data.date === today ? data.count : 0;
}

function saveCount(today, count) {
  writeFileSync(COUNT_FILE, `${JSON.stringify({ date: today, count })}\n`);
}

// 동시에 두 번 실행되면 둘 다 같은 sent.json 을 읽고 같은 공시를 보낸다.
// sent.json 읽기부터 마지막 기록까지를 잠금 파일로 감싸, 뒤 실행은 앞 실행이 끝날 때까지 기다린다.
const LOCK_FILE = new URL('sent.lock', STATE_DIR);
const LOCK_WAIT_MS = 10 * 60 * 1000; // 이만큼 기다려도 못 잡으면 보내지 않고 끝낸다
const LOCK_POLL_MS = 500;

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

async function acquireLock() {
  const deadline = Date.now() + LOCK_WAIT_MS;
  let told = false;
  for (;;) {
    try {
      writeFileSync(LOCK_FILE, `${process.pid}\n`, { flag: 'wx' }); // 이미 있으면 EEXIST
      return;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    let pid;
    try {
      pid = Number(readFileSync(LOCK_FILE, 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') continue; // 그사이 풀렸다
      throw err;
    }
    // 잠근 실행이 강제 종료돼 남은 잠금이면 치우고 다시 잡는다.
    // 컨테이너에서는 새 실행의 pid 가 남은 잠금의 pid 와 같을 수 있다(예: 둘 다 1). 자기 pid 면 남은 잠금이다.
    if (pid > 0 && (pid === process.pid || !isAlive(pid))) {
      console.error(`이전 실행(pid ${pid})이 남긴 sent.lock 을 지웁니다.`);
      rmSync(LOCK_FILE, { force: true });
      continue;
    }
    if (Date.now() > deadline) {
      throw new Error(`다른 실행(pid ${pid})이 ${LOCK_WAIT_MS / 60000}분 넘게 sent.lock 을 잡고 있습니다.`);
    }
    if (!told) {
      console.log(`다른 실행(pid ${pid})이 끝나기를 기다립니다.`);
      told = true;
    }
    await new Promise((r) => setTimeout(r, LOCK_POLL_MS));
  }
}

function releaseLock() {
  rmSync(LOCK_FILE, { force: true });
}

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
// 메시지마다 들어간 공시도 같이 돌려준다(보낸 것만 sent.json 에 남기려고).
function buildMessages(date, hits) {
  const header = `📢 ${prettyDate(date)} 관심 종목 공시 ${hits.length}건`;
  const messages = [];
  let cur = { text: header, items: [] };
  for (const it of hits) {
    const block = formatItem(it);
    if (cur.text.length + 2 + block.length > MAX_LEN) {
      messages.push(cur);
      cur = { text: `${header} (이어서)`, items: [] };
    }
    cur.text += `\n\n${block}`;
    cur.items.push(it);
  }
  messages.push(cur);
  return messages;
}

// KST 평일 08:00~19:00 인지. Railway 크론은 UTC 이고 식이 하나뿐이라 넓게 잡고 여기서 거른다.
// 크론이 몇 분 늦게 돌 수 있어 19시대는 19:30 전까지 받는다(19:30 실행은 거른다).
function inWeekdayHoursKST(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay(); // 0 일요일 … 6 토요일
  const h = kst.getUTCHours();
  const m = kst.getUTCMinutes();
  return day >= 1 && day <= 5 && ((h >= 8 && h < 19) || (h === 19 && m < 30));
}

async function main() {
  if (process.env.WEEKDAY_HOURS_ONLY === '1' && !inWeekdayHoursKST()) {
    console.log(`KST 평일 08:00~19:00 이 아니라 실행하지 않습니다. (지금 UTC ${new Date().toISOString()})`);
    return;
  }
  const date = dateArg();
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('.env 에 TELEGRAM_BOT_TOKEN 과 TELEGRAM_CHAT_ID 가 필요합니다.');
    process.exit(1);
  }
  const all = await fetchAll(date);
  const matched = all.filter((it) => it.stock_code in WATCHLIST);
  mkdirSync(STATE_DIR, { recursive: true });
  await acquireLock();
  try {
    await sendNew(date, all, matched);
  } finally {
    releaseLock();
  }
}

// sent.json 을 읽어 새 공시만 요약·전송하고 기록한다. 잠금을 잡은 상태에서만 부른다.
async function sendNew(date, all, matched) {
  const sent = loadSent();
  const hits = matched.filter((it) => !sent.has(it.rcept_no));
  console.log(
    `${prettyDate(date)} 관심 종목 공시 ${matched.length}건 (전체 ${all.length}건), ` +
      `이미 보낸 것 ${matched.length - hits.length}건 빼고 새로 보낼 것 ${hits.length}건`,
  );
  if (hits.length === 0) return;
  const today = todayKST();
  let count = loadCount(today);
  if (count >= DAILY_LIMIT) {
    // 요약도 하지 않는다. 못 보낸 공시는 sent.json 에 남지 않으니 다음 날 실행에 간다.
    console.log(`오늘(${prettyDate(today)}) 이미 메시지 ${count}개를 보내 하루 한도 ${DAILY_LIMIT}개에 닿았습니다. 보내지 않습니다.`);
    return;
  }
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
  let sentMessages = 0;
  for (const { text, items } of messages) {
    if (count >= DAILY_LIMIT) {
      const left = messages.slice(sentMessages).reduce((n, m) => n + m.items.length, 0);
      console.log(`하루 한도 ${DAILY_LIMIT}개에 닿아 남은 메시지 ${messages.length - sentMessages}개(공시 ${left}건)는 보내지 않습니다.`);
      break;
    }
    await telegram.sendMessage({
      chat_id: CHAT_ID,
      text,
      link_preview_options: { is_disabled: true },
    });
    // 메시지 하나가 갈 때마다 남긴다. 뒤 메시지가 실패해도 이미 간 공시는 다시 보내지 않는다.
    count += 1;
    saveCount(today, count);
    for (const it of items) sent.add(it.rcept_no);
    saveSent(sent);
    for (const it of items) console.log(`  포함: ${it.corp_name} — ${reportName(it)}`);
    sentMessages += 1;
  }
  console.log(`메시지 ${sentMessages}개로 보냄 (오늘 ${count}/${DAILY_LIMIT})`);
}

main().catch((err) => {
  console.error('실패:', err.message);
  process.exit(1);
});
