// OpenDART 공시검색 API 호출. index.js(목록 출력)와 notify.js(텔레그램 알림)가 같이 쓴다.

process.loadEnvFile(new URL('.env', import.meta.url));

const API_KEY = process.env.OPENDART_API_KEY;
const ENDPOINT = 'https://opendart.fss.or.kr/api/list.json';
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
