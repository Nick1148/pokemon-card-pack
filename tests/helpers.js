const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

/** 브라우저 전역 스크립트(cards.js, gacha.js)를 격리된 컨텍스트에 불러옵니다. */
function loadGacha(random) {
  const ctx = { Math: Object.create(Math) };
  if (random) ctx.Math.random = random;
  vm.createContext(ctx);
  const src = ['js/cards.js', 'js/gacha.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
  vm.runInContext(src + '\n;this.PACK_DATA = PACK_DATA; this.GachaSystem = GachaSystem; this.changeSet = changeSet; this.getCardImageUrl = getCardImageUrl;', ctx);
  return ctx;
}

module.exports = { loadGacha, root };
