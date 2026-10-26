/**
 * Pokemon Card Pack Simulator - Pure helpers
 *
 * 브라우저에서는 전역(window)으로, Node(테스트)에서는 module.exports 로 노출됩니다.
 * DOM 에 의존하지 않는 로직만 둡니다.
 */
(function (root) {
    'use strict';

    // 한국 표준시(KST)는 UTC+9 고정이며 서머타임이 없습니다.
    const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
    const DAY_MS = 24 * 60 * 60 * 1000;

    /** KST 기준 날짜 문자열 'YYYY-MM-DD' (기기 시간대와 무관) */
    function getKSTDateString(date) {
        const d = date instanceof Date ? date : new Date();
        return new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
    }

    /** 'YYYY-MM-DD' 의 하루 전 날짜 문자열 */
    function previousDateString(dateStr) {
        const t = Date.parse(dateStr + 'T00:00:00Z');
        if (isNaN(t)) return null;
        return new Date(t - DAY_MS).toISOString().slice(0, 10);
    }

    /** KST 기준 요일 (0=일 ~ 6=토) */
    function getKSTDay(date) {
        const d = date instanceof Date ? date : new Date();
        return new Date(d.getTime() + KST_OFFSET_MS).getUTCDay();
    }

    /** KST 기준 일(1~31) */
    function getKSTDayOfMonth(date) {
        const d = date instanceof Date ? date : new Date();
        return new Date(d.getTime() + KST_OFFSET_MS).getUTCDate();
    }

    function safeJsonParse(str, fallback) {
        if (typeof str !== 'string' || str === '') return fallback;
        try {
            const v = JSON.parse(str);
            return v === null || v === undefined ? fallback : v;
        } catch (e) {
            return fallback;
        }
    }

    /** localStorage 접근은 사파리 사설 모드·저장소 차단 시 예외를 던질 수 있습니다. */
    const storage = {
        get(key) {
            try { return root.localStorage ? root.localStorage.getItem(key) : null; } catch (e) { return null; }
        },
        set(key, value) {
            try { root.localStorage.setItem(key, value); return true; } catch (e) { return false; }
        },
        remove(key) {
            try { root.localStorage.removeItem(key); } catch (e) { /* noop */ }
        },
    };

    function toNonNegativeInt(v, fallback) {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) return fallback;
        return Math.floor(n);
    }

    // 컬렉션 키: "setId:cardId" (예: sv8:57) 또는 레거시 "cardId"
    const COLLECTION_KEY_RE = /^(?:[a-z0-9]{1,16}:)?\d{1,4}$/;

    /** 공유 링크/저장소에서 읽은 카드 맵을 검증해 안전한 객체만 돌려줍니다. */
    function sanitizeCards(raw, maxCount) {
        const limit = maxCount || 99999;
        const out = {};
        if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out;
        for (const key of Object.keys(raw)) {
            if (!COLLECTION_KEY_RE.test(key)) continue;
            const data = raw[key];
            if (typeof data !== 'object' || data === null) continue;
            const count = parseInt(data.count, 10);
            if (isNaN(count) || count < 1 || count > limit) continue;
            out[key] = { count, firstPack: toNonNegativeInt(data.firstPack, 0) };
        }
        return out;
    }

    /** 저장된 컬렉션을 정규화합니다. 손상된 값은 기본값으로 되돌립니다. */
    function normalizeCollection(raw, defaultGold) {
        const src = (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) ? raw : {};
        const gold = toNonNegativeInt(src.userGold, defaultGold);
        const daily = (typeof src.dailyBonus === 'object' && src.dailyBonus !== null) ? src.dailyBonus : {};
        return {
            cards: sanitizeCards(src.cards, Number.MAX_SAFE_INTEGER),
            packsOpened: toNonNegativeInt(src.packsOpened, 0),
            userGold: gold,
            achievements: (typeof src.achievements === 'object' && src.achievements !== null && !Array.isArray(src.achievements)) ? src.achievements : {},
            pityCounter: toNonNegativeInt(src.pityCounter, 0),
            dailyBonus: {
                lastClaimed: typeof daily.lastClaimed === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(daily.lastClaimed) ? daily.lastClaimed : null,
                streak: Math.min(toNonNegativeInt(daily.streak, 0), 6),
            },
            selectedSet: typeof src.selectedSet === 'string' ? src.selectedSet : undefined,
        };
    }

    // ===== 공유 링크 인코딩 (base64url: URL 에서 '+' 가 공백으로 바뀌는 문제 방지) =====
    const SHARE_MAX_LENGTH = 13334; // ~10KB JSON

    function encodeShareData(cards) {
        const json = JSON.stringify(cards);
        const b64 = (typeof btoa === 'function') ? btoa(json) : Buffer.from(json, 'binary').toString('base64');
        return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function decodeShareData(str) {
        if (typeof str !== 'string' || str.length === 0 || str.length > SHARE_MAX_LENGTH) return null;
        // 레거시 링크: 표준 base64 의 '+' 가 쿼리 파싱 중 공백으로 바뀐 경우 복원
        let b64 = str.trim().replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64)) return null;
        while (b64.length % 4 !== 0) b64 += '=';
        try {
            const json = (typeof atob === 'function') ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
            const decoded = JSON.parse(json);
            if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) return null;
            return sanitizeCards(decoded);
        } catch (e) {
            return null;
        }
    }

    const api = {
        KST_OFFSET_MS,
        getKSTDateString,
        previousDateString,
        getKSTDay,
        getKSTDayOfMonth,
        safeJsonParse,
        storage,
        sanitizeCards,
        normalizeCollection,
        encodeShareData,
        decodeShareData,
        SHARE_MAX_LENGTH,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        root.PackUtils = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
