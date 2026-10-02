// OpenDART 공시검색·공시서류원본 API 호출. index.js(목록 출력)와 notify.js(텔레그램 알림)가 같이 쓴다.
// 직접 실행하는 파일이 아니다. 실행은 index.js 나 notify.js 로 한다.

import { inflateRawSync } from 'node:zlib';

process.loadEnvFile(new URL('.env', import.meta.url));

const API_KEY = process.env.OPENDART_API_KEY;
const ENDPOINT = 'https://opendart.fss.or.kr/api/list.json';
const DOCUMENT_ENDPOINT = 'https://opendart.fss.or.kr/api/document.xml';
const PAGE_COUNT = 100; // API 최대값

export const CORP_CLS = { Y: '유가', K: '코스닥', N: '코넥스', E: '기타' };

export function todayKST() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10).replaceAll('-', '');
}

// 명령줄 인자로 받은 날짜(없으면 오늘)를 확인해서 돌려준다. 잘못되면 종료한다.
export function dateArg() {
  if (!API_KEY) {
    console.error('.env 에 OPENDART_API_KEY 가 없습니다.');
    process.exit(1);
  }
  const date = process.argv[2] ?? todayKST();
  if (!/^\d{8}$/.test(date)) {
    console.error('날짜는 YYYYMMDD 형식으로 입력하세요. 예: node index.js 20261002');
    process.exit(1);
  }
  return date;
}

export function prettyDate(date) {
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;
}

export function reportName(it) {
  return it.report_nm.replace(/\s+/g, ' ').trim();
}

export function dartUrl(it) {
  return `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${it.rcept_no}`;
}

async function fetchPage(date, pageNo) {
  const params = new URLSearchParams({
    crtfc_key: API_KEY,
    bgn_de: date,
    end_de: date,
    page_no: String(pageNo),
    page_count: String(PAGE_COUNT),
  });
  const res = await fetch(`${ENDPOINT}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

export async function fetchAll(date) {
  const items = [];
  let pageNo = 1;
  let totalPage = 1;
  do {
    const data = await fetchPage(date, pageNo);
    if (data.status === '013') return []; // 조회된 데이터가 없음
    if (data.status !== '000') {
      throw new Error(`OpenDART 오류 [${data.status}] ${data.message}`);
    }
    items.push(...data.list);
    totalPage = data.total_page;
    pageNo += 1;
  } while (pageNo <= totalPage);
  return items;
}

// 공시서류원본(zip)을 받아 본문 XML 을 글자만 남겨 돌려준다.
// zip 은 central directory 만 읽어 푸는 최소 구현이다(의존성 없이 node:zlib 만 쓴다).
export async function fetchDocumentText(rceptNo) {
  const params = new URLSearchParams({ crtfc_key: API_KEY, rcept_no: rceptNo });
  const res = await fetch(`${DOCUMENT_ENDPOINT}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.readUInt32LE(0) !== 0x04034b50) {
    // zip 이 아니면 오류 응답(XML)이다.
    const msg = buf.toString('utf8').match(/<message>(.*?)<\/message>/)?.[1] ?? '알 수 없는 응답';
    throw new Error(`OpenDART 원문 오류: ${msg}`);
  }
  const files = unzip(buf);
  const main = files.find((f) => f.name === `${rceptNo}.xml`) ?? files[0];
  if (!main) throw new Error('원문 zip 이 비어 있습니다.');
  return htmlToText(main.data.toString('utf8'));
}

function unzip(buf) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd -= 1;
  if (eocd < 0) throw new Error('zip 형식이 아닙니다.');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = [];
  for (let i = 0; i < count; i += 1) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    files.push({ name, data: method === 8 ? inflateRawSync(raw) : raw });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

function htmlToText(html) {
  return html
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
