// OpenDART 공시검색 API로 특정 날짜(기본: 오늘, KST)의 공시 목록을 가져와 출력한다.
// 사용법: node index.js [YYYYMMDD]

process.loadEnvFile(new URL('.env', import.meta.url));

const API_KEY = process.env.OPENDART_API_KEY;
const ENDPOINT = 'https://opendart.fss.or.kr/api/list.json';
const PAGE_COUNT = 100; // API 최대값

const CORP_CLS = { Y: '유가', K: '코스닥', N: '코넥스', E: '기타' };

// 화면에 보여 줄 시장. 코넥스·기타법인도 보려면 'N', 'E' 를 추가한다.
const MARKETS = ['Y', 'K'];

function todayKST() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10).replaceAll('-', '');
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

async function fetchAll(date) {
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

function print(date, items, totalCount) {
  const pretty = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;
  const markets = MARKETS.map((c) => CORP_CLS[c]).join('·');
  console.log(`\n📋 ${pretty} 공시 목록 — ${markets} ${items.length}건 (전체 ${totalCount}건)\n`);
  if (items.length === 0) {
    console.log('  해당 날짜에 올라온 공시가 없습니다. (주말·공휴일일 수 있습니다)\n');
    return;
  }
  items.forEach((it, i) => {
    const cls = CORP_CLS[it.corp_cls] ?? it.corp_cls;
    const rm = it.rm ? ` [${it.rm}]` : '';
    console.log(`${String(i + 1).padStart(4)}. [${cls}] ${it.corp_name} — ${it.report_nm.replace(/\s+/g, ' ').trim()}${rm}`);
    console.log(`      제출인: ${it.flr_nm} | https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${it.rcept_no}`);
  });
  console.log();
}

async function main() {
  if (!API_KEY) {
    console.error('.env 에 OPENDART_API_KEY 가 없습니다.');
    process.exit(1);
  }
  const date = process.argv[2] ?? todayKST();
  if (!/^\d{8}$/.test(date)) {
    console.error('날짜는 YYYYMMDD 형식으로 입력하세요. 예: node index.js 20261002');
    process.exit(1);
  }
  const all = await fetchAll(date);
  print(date, all.filter((it) => MARKETS.includes(it.corp_cls)), all.length);
}

main().catch((err) => {
  console.error('실패:', err.message);
  process.exit(1);
});
