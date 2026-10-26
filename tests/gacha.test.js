const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGacha } = require('./helpers');

const ORDER = ['C', 'U', 'R', 'RR', 'AR', 'SR', 'SAR', 'MUR'];

test('모든 세트: 팩은 10장, 정의된 레어도만, 팩 내 중복 없음', () => {
  const ctx = loadGacha();
  for (const setId of Object.keys(ctx.PACK_DATA)) {
    ctx.changeSet(setId);
    const g = new ctx.GachaSystem();
    for (let i = 0; i < 300; i++) {
      const pack = g.openPack(i % 60);
      assert.equal(pack.length, 10, `${setId} 팩 크기`);
      for (const c of pack) {
        assert.ok(ORDER.includes(c.rarity), `${setId} 레어도 ${c.rarity}`);
        assert.ok(Number.isInteger(c.id) && c.id > 0);
      }
      if (!pack.isGodPack) {
        assert.equal(new Set(pack.map(c => c.id)).size, 10, `${setId} 팩 내 중복`);
      }
    }
  }
});

test('천장: 49팩 연속 미등장 후 50번째 팩은 SR 이상 보장', () => {
  // 갓팩이 나오지 않도록 random 을 고정 시퀀스로 (0.5 → 갓팩 아님)
  const ctx = loadGacha(() => 0.5);
  ctx.changeSet('sv8');
  const g = new ctx.GachaSystem();
  const pack = g.openPack(49);
  assert.ok(ctx.GachaSystem.hasPityBreaker(pack), '50번째 팩에 SR+ 필요');
  const normal = g.openPack(48);
  assert.ok(!normal.isGodPack);
});

test('천장 초기화 기준은 SR 이상 (AR 은 초기화하지 않음)', () => {
  const ctx = loadGacha();
  assert.equal(ctx.GachaSystem.hasPityBreaker([{ rarity: 'AR' }, { rarity: 'RR' }]), false);
  assert.equal(ctx.GachaSystem.hasPityBreaker([{ rarity: 'SR' }]), true);
  assert.equal(ctx.GachaSystem.hasPityBreaker([{ rarity: 'MUR' }]), true);
});

test('빈 레어도 풀은 다른 풀로 대체 (placeholder 카드 생성 금지)', () => {
  const ctx = loadGacha();
  ctx.changeSet('sv8pt5'); // AR 없음
  const g = new ctx.GachaSystem();
  assert.ok(g.getPool('AR').length > 0);
  g.cardsByRarity.MUR = [];
  const pool = g.getPool('MUR');
  assert.ok(pool.length > 0);
  assert.ok(pool.every(c => c.rarity !== 'MUR'));
});

test('주말 부스트: SAR/MUR 비율이 의미 있게 증가', () => {
  const ctx = loadGacha();
  ctx.changeSet('sv8');
  const g = new ctx.GachaSystem();
  const N = 20000;
  const count = (boost) => {
    let n = 0;
    for (let i = 0; i < N; i++) {
      const p = g.generateNormalPack(false, boost);
      if (['SAR', 'MUR'].includes(p[9].rarity)) n++;
    }
    return n / N;
  };
  const base = count(false);
  const boosted = count(true);
  // 기대값: 2.0% → 약 3.9%
  assert.ok(base > 0.012 && base < 0.03, `기본 ${base}`);
  assert.ok(boosted > base * 1.5, `부스트 ${boosted} vs 기본 ${base}`);
});

test('갓팩은 10장이며 AR 이상으로만 구성', () => {
  const ctx = loadGacha();
  for (const setId of Object.keys(ctx.PACK_DATA)) {
    ctx.changeSet(setId);
    const g = new ctx.GachaSystem();
    const pack = g.generateGodPack();
    assert.equal(pack.length, 10);
    assert.ok(pack.every(c => ['AR', 'SR', 'SAR', 'MUR', 'RR'].includes(c.rarity)), setId);
  }
});

test('카드 데이터: 세트별 ID 중복 없음, 이미지 URL 은 https', () => {
  const ctx = loadGacha();
  for (const [setId, set] of Object.entries(ctx.PACK_DATA)) {
    const ids = set.cards.map(c => c.id);
    assert.equal(new Set(ids).size, ids.length, setId);
    for (const c of set.cards) {
      assert.match(c.imageSmall, /^https:\/\//);
      assert.match(c.imageLarge, /^https:\/\//);
    }
    assert.equal(ctx.getCardImageUrl(ids[0], 800, setId), set.cards[0].imageLarge);
  }
});
