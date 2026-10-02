// OpenDART 공시검색 API로 특정 날짜(기본: 오늘, KST)의 공시 목록을 가져와 출력한다.
// 사용법: node index.js [YYYYMMDD]

import { CORP_CLS, dartUrl, dateArg, fetchAll, prettyDate, reportName } from './dart.js';

// 화면에 보여 줄 시장. 코넥스·기타법인도 보려면 'N', 'E' 를 추가한다.
const MARKETS = ['Y', 'K'];

function print(date, items, totalCount) {
  const markets = MARKETS.map((c) => CORP_CLS[c]).join('·');
  console.log(`\n📋 ${prettyDate(date)} 공시 목록 — ${markets} ${items.length}건 (전체 ${totalCount}건)\n`);
  if (items.length === 0) {
    console.log('  해당 날짜에 올라온 공시가 없습니다. (주말·공휴일일 수 있습니다)\n');
    return;
  }
  items.forEach((it, i) => {
    const cls = CORP_CLS[it.corp_cls] ?? it.corp_cls;
    const rm = it.rm ? ` [${it.rm}]` : '';
    console.log(`${String(i + 1).padStart(4)}. [${cls}] ${it.corp_name} — ${reportName(it)}${rm}`);
    console.log(`      제출인: ${it.flr_nm} | ${dartUrl(it)}`);
  });
  console.log();
}

async function main() {
  const date = dateArg();
  const all = await fetchAll(date);
  print(date, all.filter((it) => MARKETS.includes(it.corp_cls)), all.length);
}

main().catch((err) => {
  console.error('실패:', err.message);
  process.exit(1);
});
