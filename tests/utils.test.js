const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../js/utils.js');

test('KST 날짜: UTC 15:00 이전/이후 경계', () => {
  // 2026-10-26 14:59:59Z = KST 23:59:59 (26일)
  assert.equal(U.getKSTDateString(new Date('2026-10-26T14:59:59Z')), '2026-10-26');
  // 2026-10-26 15:00:00Z = KST 27일 00:00
  assert.equal(U.getKSTDateString(new Date('2026-10-26T15:00:00Z')), '2026-10-27');
  // 한국 오전(UTC 전날)에도 한국 날짜를 돌려줘야 함 (기존 toISOString 버그)
  assert.equal(U.getKSTDateString(new Date('2026-10-26T22:30:00Z')), '2026-10-27');
});

test('KST 날짜: 연말·윤년 경계', () => {
  assert.equal(U.getKSTDateString(new Date('2026-12-31T15:00:00Z')), '2027-01-01');
  assert.equal(U.previousDateString('2027-01-01'), '2026-12-31');
  assert.equal(U.previousDateString('2028-03-01'), '2028-02-29');
  assert.equal(U.previousDateString('2027-03-01'), '2027-02-28');
  assert.equal(U.previousDateString('not-a-date'), null);
});

test('KST 요일/일자: 금요일 밤 UTC = 한국 토요일', () => {
  // 2026-10-30(금) 16:00Z = KST 2026-10-31(토) 01:00
  assert.equal(U.getKSTDay(new Date('2026-10-30T16:00:00Z')), 6);
  assert.equal(U.getKSTDay(new Date('2026-10-30T14:00:00Z')), 5);
  // 2026-10-31 15:00Z = KST 11월 1일
  assert.equal(U.getKSTDayOfMonth(new Date('2026-10-31T15:00:00Z')), 1);
});

test('safeJsonParse: 손상된 값은 기본값', () => {
  assert.deepEqual(U.safeJsonParse('{bad', {}), {});
  assert.deepEqual(U.safeJsonParse(null, { a: 1 }), { a: 1 });
  assert.deepEqual(U.safeJsonParse('null', []), []);
  assert.deepEqual(U.safeJsonParse('{"a":1}', {}), { a: 1 });
});

test('공유 데이터: 인코딩/디코딩 왕복, base64url 사용', () => {
  // '+' '/' 가 나오도록 다양한 키 사용
  const cards = {};
  for (let i = 1; i <= 120; i++) cards['sv8:' + i] = { count: (i % 7) + 1, firstPack: i };
  const enc = U.encodeShareData(cards);
  assert.ok(!/[+/=]/.test(enc), 'URL 안전 문자만 사용');
  assert.deepEqual(U.decodeShareData(enc), cards);
});

test('공유 데이터: 레거시 base64 링크에서 + 가 공백으로 바뀐 경우 복구', () => {
  const cards = { 'sv8:62': { count: 3, firstPack: 1 }, 'sv8:63': { count: 1, firstPack: 2 } };
  const legacy = Buffer.from(JSON.stringify(cards), 'binary').toString('base64');
  const mangled = new URLSearchParams('share=' + legacy).get('share');
  assert.deepEqual(U.decodeShareData(mangled), cards);
});

test('공유 데이터: 잘못된 입력 거부 및 키·수량 검증', () => {
  assert.equal(U.decodeShareData(''), null);
  assert.equal(U.decodeShareData('%%%'), null);
  assert.equal(U.decodeShareData('a'.repeat(U.SHARE_MAX_LENGTH + 1)), null);
  assert.equal(U.decodeShareData(U.encodeShareData([1, 2])), null);
  const evil = Buffer.from(JSON.stringify({
    '__proto__': { count: 1 },
    '<img src=x>': { count: 1 },
    'sv8:1': { count: -5 },
    'sv8:2': { count: 'abc' },
    'sv8:3': { count: 100000 },
    'sv8:4': { count: '2', firstPack: 'x' },
    '57': { count: 1 },
  })).toString('base64');
  const out = U.decodeShareData(evil);
  assert.deepEqual(Object.keys(out).sort(), ['57', 'sv8:4']);
  assert.deepEqual(out['sv8:4'], { count: 2, firstPack: 0 });
  assert.equal(Object.getPrototypeOf(out), Object.prototype);
});

test('컬렉션 정규화: 손상·조작된 저장값', () => {
  const n = U.normalizeCollection({ userGold: -100, packsOpened: 'x', cards: { 'sv8:1': { count: 2 } }, pityCounter: NaN, dailyBonus: { lastClaimed: 'yesterday', streak: 99 } }, 10000);
  assert.equal(n.userGold, 10000);
  assert.equal(n.packsOpened, 0);
  assert.equal(n.pityCounter, 0);
  assert.equal(n.dailyBonus.lastClaimed, null);
  assert.equal(n.dailyBonus.streak, 6);
  assert.deepEqual(n.cards, { 'sv8:1': { count: 2, firstPack: 0 } });

  const empty = U.normalizeCollection(null, 10000);
  assert.equal(empty.userGold, 10000);
  assert.deepEqual(empty.cards, {});

  // 골드 0 은 유효한 값 (기본값으로 되돌리면 안 됨)
  assert.equal(U.normalizeCollection({ userGold: 0 }, 10000).userGold, 0);
});
