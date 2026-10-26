/**
 * 390px 모바일 화면 E2E 스모크 테스트 (Playwright 필요: `npm i -D playwright` 또는 전역 설치)
 * 실행: npm run test:e2e
 * 외부 요청(카드 이미지 CDN, 웹폰트)은 차단하고 로컬 파일만으로 검사합니다.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..', '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain' };

function serve() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.normalize(path.join(root, urlPath === '/' ? 'index.html' : urlPath));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

async function newPage(browser, base, { storage } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
  if (storage) {
    await context.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, storage);
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  return { page, errors, context };
}

const state = (page) => page.evaluate(() => ({
  gold: window.app.userGold,
  packs: window.app.totalPacksOpened,
  total: Object.values(window.app.collection.cards).reduce((a, c) => a + c.count, 0),
  opening: window.app.isOpening,
}));

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  let passed = 0;
  const step = async (name, fn) => { await fn(); passed++; console.log('✓ ' + name); };

  try {
    const { page, errors } = await newPage(browser, base, { storage: { cookie_consent: 'rejected' } });
    await page.goto(base);
    await page.waitForFunction(() => window.app);

    await step('첫 방문: 일일 보상 모달 표시 후 수령', async () => {
      await page.waitForSelector('#dailyBonusModal', { state: 'visible' });
      await page.click('#dailyBonusClaimBtn');
      assert.equal(await page.isVisible('#dailyBonusModal'), false);
      assert.equal((await state(page)).gold, 10500);
    });

    await step('390px 에서 가로 스크롤 없음', async () => {
      const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      assert.ok(sw <= iw, `scrollWidth ${sw} > ${iw}`);
    });

    await step('팩 이미지가 없는 세트는 색상 커버로 대체', async () => {
      await page.waitForFunction(() => document.querySelector('.pack-front').classList.contains('no-image') || document.getElementById('packCoverImage').naturalWidth > 0);
    });

    await step('1팩 개봉: 카드 하나씩 뒤집기 → 10장·1팩 반영', async () => {
      const before = await state(page);
      await page.click('#openBtn');
      // 개봉 즉시 가격 차감 (업적·도전 보상은 개봉 완료 후 더해짐)
      assert.equal((await state(page)).gold, before.gold - 2000);
      await page.waitForSelector('#revealControls', { state: 'visible' });
      await page.waitForFunction(() => document.getElementById('cardRevealOverlay').classList.contains('active'));
      for (let i = 0; i < 40 && (await state(page)).opening; i++) {
        await page.click('#nextCardBtn');
        await page.waitForTimeout(80);
        await page.waitForFunction(() => !window.app.isRevealing);
      }
      const after = await state(page);
      assert.equal(after.opening, false);
      assert.equal(after.packs, before.packs + 1);
      assert.equal(after.total, before.total + 10);
      assert.equal(await page.locator('#resultsGrid .result-card').count(), 10);
    });

    await step('카드 1장 공개 후 "전체 보기" 해도 중복 반영 없음', async () => {
      const before = await state(page);
      await page.click('#openBtn');
      await page.waitForSelector('#revealControls', { state: 'visible' });
      await page.waitForFunction(() => document.getElementById('cardRevealOverlay').classList.contains('active') && document.getElementById('nextCardBtn').textContent.includes('뒤집기'));
      await page.click('#nextCardBtn');
      await page.waitForFunction(() => window.app.isCardRevealed && !window.app.isRevealing);
      await page.click('#skipAllBtn');
      const after = await state(page);
      assert.equal(after.total, before.total + 10);
      assert.equal(after.packs, before.packs + 1);
    });

    await step('개봉 애니메이션 도중 ESC: 1회만 반영, 오버레이 닫힘', async () => {
      const before = await state(page);
      await page.click('#openBtn');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1500);
      const after = await state(page);
      assert.equal(after.packs, before.packs + 1);
      assert.equal(after.total, before.total + 10);
      assert.equal(await page.evaluate(() => document.getElementById('cardRevealOverlay').classList.contains('active')), false);
    });

    await step('다중 개봉 → 이어서 단일 개봉 시 이전 요약이 남지 않음', async () => {
      await page.evaluate(() => { window.app.userGold = 100000; window.app.updateStats(); });
      await page.click('#open10Btn');
      assert.ok(await page.isVisible('.multi-pack-summary'));
      await page.click('#openBtn');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !window.app.isOpening);
      assert.equal(await page.locator('.multi-pack-summary').count(), 0);
      assert.equal(await page.locator('#resultsGrid .result-card').count(), 10);
    });

    await step('컬렉션 탭: 렌더링·필터·키보드로 카드 확대', async () => {
      await page.click('#tabCollection');
      assert.ok(await page.locator('.collection-card').count() > 100);
      await page.click('.filter-btn[data-filter="C"]');
      assert.equal(await page.getAttribute('.filter-btn[data-filter="C"]', 'aria-pressed'), 'true');
      await page.focus('.collection-card[data-card-id]');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.getElementById('cardZoomModal').classList.contains('active'));
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.getElementById('cardZoomModal').classList.contains('active')), false);
      const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      assert.ok(sw <= iw, `컬렉션 scrollWidth ${sw}`);
    });

    await step('세트 변경이 저장되고 새로고침 후 복원', async () => {
      await page.click('#tabPack');
      await page.click('#nextSetBtn');
      const setId = await page.evaluate(() => CURRENT_SET_ID);
      await page.reload();
      await page.waitForFunction(() => window.app);
      assert.equal(await page.evaluate(() => CURRENT_SET_ID), setId);
    });

    await step('공유 링크: 조회 전용 모드는 내 저장 데이터를 덮어쓰지 않음', async () => {
      const mine = await page.evaluate(() => localStorage.getItem('pokemon_card_collection'));
      const shareData = await page.evaluate(() => PackUtils.encodeShareData({ 'sv8:1': { count: 3, firstPack: 1 } }));
      const { page: p2, errors: e2, context } = await newPage(browser, base);
      await p2.goto(base);
      await p2.evaluate((v) => localStorage.setItem('pokemon_card_collection', v), mine);
      await p2.goto(base + '?share=' + shareData);
      await p2.waitForFunction(() => window.app);
      assert.equal(await p2.evaluate(() => window.app.isReadOnly), true);
      assert.equal(await p2.isVisible('#rewardAdBtn'), false);
      await p2.evaluate(() => { window.app.saveCollection(); window.app.showRewardAd(); });
      assert.equal(await p2.evaluate(() => localStorage.getItem('pokemon_card_collection')), mine);
      assert.deepEqual(e2, []);
      await context.close();
    });

    await step('잘못된 공유 링크·손상된 저장소에도 오류 없이 시작', async () => {
      const { page: p3, errors: e3, context } = await newPage(browser, base, {
        storage: { pokemon_card_collection: '{broken', rewardAdData: 'x', dailyChallenges: '[1,2]', cookie_consent: 'rejected' },
      });
      await p3.goto(base + '?share=%%%invalid');
      await p3.waitForFunction(() => window.app);
      assert.equal(await p3.evaluate(() => window.app.isReadOnly), false);
      assert.equal(await p3.evaluate(() => window.app.userGold), 10000);
      assert.deepEqual(e3, []);
      await context.close();
    });

    await step('페이지 스크립트 오류 없음', async () => {
      assert.deepEqual(errors, []);
    });

    console.log(`\nE2E 통과: ${passed}건`);
  } catch (e) {
    console.error('✗ E2E 실패:', e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
