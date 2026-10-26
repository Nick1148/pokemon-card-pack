/**
 * 정적 검사: JS 문법, JSON 형식, index.html 이 참조하는 로컬 파일 존재 여부.
 * 의존성 없이 `npm run check` 로 실행합니다.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = 0;
const fail = (msg) => { failed++; console.error('✗ ' + msg); };

const jsFiles = ['js/utils.js', 'js/cards.js', 'js/gacha.js', 'js/app.js', 'sw.js', 'fetch-pokemon-cards.js', 'scripts/check.js'];
for (const f of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', path.join(root, f)], { stdio: 'pipe' });
  } catch (e) {
    fail(`${f}: 문법 오류\n${e.stderr}`);
  }
}

for (const f of ['manifest.json', 'vercel.json', 'package.json']) {
  try {
    JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
  } catch (e) {
    fail(`${f}: JSON 형식 오류 (${e.message})`);
  }
}

// HTML 이 참조하는 로컬 파일(src/href)이 실제로 있는지
for (const page of ['index.html', 'terms.html', 'privacy.html', 'credits.html']) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m => m[1])
    .filter(u => !/^(https?:|data:|mailto:|\/\/)/.test(u));
  for (const ref of refs) {
    const clean = ref.split('?')[0].replace(/^\//, '') || 'index.html';
    if (!fs.existsSync(path.join(root, clean))) fail(`${page}: 존재하지 않는 파일 참조 → ${ref}`);
  }
}

// manifest 아이콘 존재
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
for (const icon of manifest.icons || []) {
  if (!fs.existsSync(path.join(root, icon.src.replace(/^\//, '')))) fail(`manifest.json: 아이콘 없음 → ${icon.src}`);
}

// 서비스워커 사전 캐시 목록 존재
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const list = sw.match(/ASSETS_TO_CACHE = \[([\s\S]*?)\]/);
if (list) {
  for (const m of list[1].matchAll(/'([^']+)'/g)) {
    const p = m[1] === '/' ? 'index.html' : m[1].replace(/^\//, '');
    if (!fs.existsSync(path.join(root, p))) fail(`sw.js: 사전 캐시 대상 없음 → ${m[1]}`);
  }
}

// 세트 팩 이미지: 없으면 화면에서 색상 커버로 대체되므로 경고만 출력
const vm = require('vm');
const ctx = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'js/cards.js'), 'utf8') + ';this.PACK_DATA = PACK_DATA;', ctx);
for (const [id, set] of Object.entries(ctx.PACK_DATA)) {
  if (set.info.packImage && !fs.existsSync(path.join(root, set.info.packImage))) {
    console.warn(`! ${id}: 팩 이미지 파일 없음 (${set.info.packImage}) → 색상 커버로 표시됨`);
  }
}

if (failed) {
  console.error(`\n정적 검사 실패: ${failed}건`);
  process.exit(1);
}
console.log('✓ 정적 검사 통과');
