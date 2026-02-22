/**
 * 가챠 (확률) 시스템
 *
 * 실제 팩 확률 기반:
 * - 1팩 = 10장
 * - 슬롯 1~5: C/U (기본 카드)
 * - 슬롯 6~7: U/R
 * - 슬롯 8: R 이상 확정 (레어 슬롯)
 * - 슬롯 9: R/RR/AR
 * - 슬롯 10: RR 이상 확정 (하이레어 슬롯)
 * - 갓팩: 약 0.5% (AR 1 + SR 5 + SAR 4)
 *
 * 천장(Pity) 시스템:
 * - 50팩 연속 SR 이상 미등장 시 SR 이상 보장
 */

class GachaSystem {
    constructor() {
        this.cardsByRarity = {};
        this.initializeCardPools();
    }

    initializeCardPools() {
        this.cardsByRarity = {
            C: CARDS.filter(c => c.rarity === 'C'),
            U: CARDS.filter(c => c.rarity === 'U'),
            R: CARDS.filter(c => c.rarity === 'R'),
            RR: CARDS.filter(c => c.rarity === 'RR'),
            AR: CARDS.filter(c => c.rarity === 'AR'),
            SR: CARDS.filter(c => c.rarity === 'SR'),
            SAR: CARDS.filter(c => c.rarity === 'SAR'),
            MUR: CARDS.filter(c => c.rarity === 'MUR'),
        };
        // Fallback: if AR pool is empty (e.g. sv8pt5), use SAR as substitute
        if (this.cardsByRarity.AR.length === 0) {
            this.cardsByRarity.AR = this.cardsByRarity.SAR.length > 0
                ? this.cardsByRarity.SAR
                : this.cardsByRarity.RR;
        }
    }

    pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    weightedPick(weights) {
        const total = Object.values(weights).reduce((a, b) => a + b, 0);
        let roll = Math.random() * total;
        for (const [rarity, weight] of Object.entries(weights)) {
            roll -= weight;
            if (roll <= 0) return rarity;
        }
        return Object.keys(weights)[0];
    }

    isGodPack() {
        return Math.random() < 0.005;
    }

    generateGodPack() {
        const pack = [];
        const usedIds = new Set();

        const pickUniqueFrom = (pool, count) => {
            for (let i = 0; i < count; i++) {
                const available = pool.filter(c => !usedIds.has(c.id));
                if (available.length === 0) break;
                const card = this.pickRandom(available);
                pack.push({ ...card, isNew: true });
                usedIds.add(card.id);
            }
        };

        // AR 1장
        pickUniqueFrom(this.cardsByRarity.AR, 1);
        // SR 5장
        pickUniqueFrom(this.cardsByRarity.SR, 5);
        // SAR 4장
        pickUniqueFrom(this.cardsByRarity.SAR, 4);

        // 부족하면 AR로 채움
        while (pack.length < 10) {
            pack.push({ ...this.pickRandom(this.cardsByRarity.AR || this.cardsByRarity.RR), isNew: true });
        }

        pack.isGodPack = true;
        return pack;
    }

    /**
     * 일반 팩 생성 (10장)
     * @param {boolean} pityGuarantee - true면 슬롯 10에서 SR 이상 보장
     */
    generateNormalPack(pityGuarantee = false) {
        const pack = [];
        const usedIds = new Set();

        const pickUnique = (pool) => {
            const available = pool.filter(c => !usedIds.has(c.id));
            const card = available.length > 0 ? this.pickRandom(available) : this.pickRandom(pool);

            if (!card) {
                return { id: 1, name: '데이터 준비중', type: 'normal', rarity: 'C' };
            }

            usedIds.add(card.id);
            return { ...card };
        };

        // 슬롯 1~3: 커먼
        for (let i = 0; i < 3; i++) {
            pack.push(pickUnique(this.cardsByRarity.C));
        }

        // 슬롯 4~5: 커먼/언커먼
        for (let i = 0; i < 2; i++) {
            const rarity = this.weightedPick({ C: 40, U: 60 });
            pack.push(pickUnique(this.cardsByRarity[rarity]));
        }

        // 슬롯 6~7: 언커먼/레어
        for (let i = 0; i < 2; i++) {
            const rarity = this.weightedPick({ U: 70, R: 30 });
            pack.push(pickUnique(this.cardsByRarity[rarity]));
        }

        // 슬롯 8: 레어 확정
        const slot8Rarity = this.weightedPick({ R: 70, RR: 25, AR: 5 });
        pack.push(pickUnique(this.cardsByRarity[slot8Rarity]));

        // 슬롯 9: 레어/더블레어/아트레어
        const slot9Rarity = this.weightedPick({ R: 50, RR: 30, AR: 15, SR: 5 });
        pack.push(pickUnique(this.cardsByRarity[slot9Rarity]));

        // 슬롯 10: 하이레어 슬롯 (천장 시스템 적용)
        if (pityGuarantee) {
            // 천장 발동: SR 이상 보장
            const pityRarity = this.weightedPick({ SR: 60, SAR: 25, MUR: 15 });
            pack.push(pickUnique(this.cardsByRarity[pityRarity]));
        } else {
            const slot10Rarity = this.weightedPick({
                RR: 850,
                AR: 100,
                SR: 30,
                SAR: 15,
                MUR: 5,
            });
            pack.push(pickUnique(this.cardsByRarity[slot10Rarity]));
        }

        return pack;
    }

    /**
     * 팩 하나 개봉
     * @param {number} pityCounter - 연속 팩 카운터 (SR+ 미등장)
     */
    openPack(pityCounter = 0) {
        if (this.isGodPack()) {
            const pack = this.generateGodPack();
            pack.isGodPack = true;
            return pack;
        }

        const pityGuarantee = pityCounter >= 49; // 50팩째에 천장 발동
        const pack = this.generateNormalPack(pityGuarantee);
        pack.isGodPack = false;
        return pack;
    }

    getHighestRarity(pack) {
        const order = ['C', 'U', 'R', 'RR', 'AR', 'SR', 'SAR', 'MUR'];
        let highest = 0;
        for (const card of pack) {
            const idx = order.indexOf(card.rarity);
            if (idx > highest) highest = idx;
        }
        return order[highest];
    }
}
