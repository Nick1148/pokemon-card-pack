/**
 * Pokemon Card Pack Simulator - Main App Logic
 */

// ===== Consent & Ad/Analytics Management =====

const { storage, getKSTDateString, previousDateString, getKSTDay, getKSTDayOfMonth, safeJsonParse } = window.PackUtils;

// GA4 측정 ID. 실제 ID(G-로 시작)를 넣기 전까지는 스크립트를 로드하지 않습니다.
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
const GA_ENABLED = /^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID) && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX';

const STORAGE_KEYS = {
    collection: 'pokemon_card_collection',
    rewardAd: 'rewardAdData',
    challenges: 'dailyChallenges',
};

const DEFAULT_GOLD = 10000;
const REWARD_AD_DAILY_LIMIT = 10;
const REWARD_AD_GOLD = 500;
const HIGH_RARE = ['AR', 'SR', 'SAR', 'MUR'];
const RR_PLUS = ['RR', 'AR', 'SR', 'SAR', 'MUR'];
const SR_PLUS = ['SR', 'SAR', 'MUR'];
const RARITY_RANK = { C: 0, U: 1, R: 2, RR: 3, AR: 4, SR: 5, SAR: 6, MUR: 7 };

const ConsentManager = {
    STORAGE_KEY: 'cookie_consent',

    getConsent() {
        return storage.get(this.STORAGE_KEY); // 'accepted' | 'rejected' | null
    },

    setConsent(value) {
        storage.set(this.STORAGE_KEY, value);
    },

    hasConsented() {
        return this.getConsent() === 'accepted';
    },

    hasDecided() {
        return this.getConsent() !== null;
    },

    /** Load Adsterra + GA4 scripts dynamically after consent */
    loadAdScripts() {
        if (!this.hasConsented()) return;

        // Adsterra Banner Ads
        // TODO: Replace these placeholder scripts with your actual Adsterra ad codes
        // After Adsterra approval, paste your banner ad scripts into each slot div
        // The scripts will be injected into #adsterraSlotA, #adsterraSlotB, #adsterraSlotC

        // Adsterra Social Bar (high CPM in-page push)
        // TODO: Replace with your Adsterra Social Bar script
        // Example: <script>(function(d,z,s){s.src='//'+d+'/'+z;...})(domain, zoneId, script);</script>

        // Google Analytics 4 — 자리표시자 ID 인 동안에는 불필요한 외부 요청을 하지 않습니다.
        if (GA_ENABLED && !document.getElementById('ga4-script')) {
            window.dataLayer = window.dataLayer || [];
            window.gtag = function() { window.dataLayer.push(arguments); };
            window.gtag('js', new Date());
            window.gtag('config', GA_MEASUREMENT_ID);

            const gaScript = document.createElement('script');
            gaScript.id = 'ga4-script';
            gaScript.async = true;
            gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
            document.head.appendChild(gaScript);
        }
    },

    /** Show consent banner if user hasn't decided yet */
    showBannerIfNeeded() {
        if (this.hasDecided()) {
            if (this.hasConsented()) this.loadAdScripts();
            return;
        }

        const banner = document.getElementById('cookieConsent');
        if (!banner) return;
        banner.style.display = 'flex';

        document.getElementById('cookieAccept').addEventListener('click', () => {
            this.setConsent('accepted');
            banner.style.display = 'none';
            this.loadAdScripts();
        });

        document.getElementById('cookieReject').addEventListener('click', () => {
            this.setConsent('rejected');
            banner.style.display = 'none';
        });
    }
};

// ===== GA4 Event Tracking Helper =====
function trackEvent(action, label, value) {
    if (window.gtag) {
        gtag('event', action, {
            event_category: 'engagement',
            event_label: label,
            value: value
        });
    }
}

// ===== Utility: XSS Prevention =====
function escapeHtml(str) {
    return String(str === undefined || str === null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** 이미지 로드 실패 시 대체 표시 (인라인 onerror 대신 위임 처리) */
function showImageFallback(img) {
    if (!img || img.dataset.fallback === '1') return;
    img.dataset.fallback = '1';
    img.style.display = 'none';
    const holder = document.createElement('div');
    holder.className = 'img-fallback';
    holder.setAttribute('role', 'img');
    holder.setAttribute('aria-label', (img.alt || '카드') + ' (이미지를 불러오지 못했습니다)');
    holder.textContent = '🎴';
    img.insertAdjacentElement('afterend', holder);
}

// ===== Achievement Definitions =====
const ACHIEVEMENTS = {
    first_pack: { name: '첫 팩 개봉!', desc: '첫 번째 팩을 개봉했습니다', gold: 500, icon: '📦' },
    pack_10: { name: '수집가', desc: '10팩 개봉 달성', gold: 1000, icon: '🎯' },
    pack_50: { name: '열정 수집가', desc: '50팩 개봉 달성', gold: 3000, icon: '🔥' },
    pack_100: { name: '레전드 수집가', desc: '100팩 개봉 달성', gold: 5000, icon: '👑' },
    first_RR: { name: '더블레어 획득!', desc: '첫 RR 카드 획득', gold: 300, icon: '⭐' },
    first_AR: { name: '아트레어 획득!', desc: '첫 AR 카드 획득', gold: 500, icon: '🎨' },
    first_SR: { name: '슈퍼레어 획득!', desc: '첫 SR 카드 획득', gold: 1000, icon: '💎' },
    first_SAR: { name: '스페셜아트 획득!', desc: '첫 SAR 카드 획득', gold: 3000, icon: '🌟' },
    first_MUR: { name: '하이퍼레어 획득!', desc: '첫 MUR 카드 획득', gold: 10000, icon: '🏆' },
    full_set: { name: '풀셋 완성!', desc: '모든 카드를 수집했습니다', gold: 50000, icon: '🎊' },
};

// ===== Daily Bonus Config =====
const DAILY_BONUS_REWARDS = [500, 800, 1000, 1500, 2000, 3000, 5000];

// ===== Event Pack Definitions =====
const EVENT_PACKS = [
    {
        id: 'weekly_boost',
        name: '주간 확률 부스트',
        nameKo: '주간 확률 UP',
        icon: '🎰',
        description: 'SAR/MUR 확률 2배!',
        // Active on weekends (Sat-Sun)
        rateBoost: true,
        // 한국 시간 기준 토·일
        isActive: (now) => {
            const day = getKSTDay(now);
            return day === 0 || day === 6;
        },
        priceMultiplier: 1.5,
        bannerColor: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    },
    {
        id: 'new_month',
        name: 'Monthly Special',
        nameKo: '월초 스페셜',
        icon: '🌟',
        description: '첫째주 특별 팩! 골드 보상 2배',
        // 한국 시간 기준 매월 1~7일
        isActive: (now) => getKSTDayOfMonth(now) <= 7,
        priceMultiplier: 1,
        goldBonusMultiplier: 2,
        bannerColor: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    },
];

// ===== Daily Challenge Definitions =====
const DAILY_CHALLENGES = [
    { id: 'open_3', desc: '3팩 개봉하기', icon: '📦', target: 3, type: 'packs', reward: 1000 },
    { id: 'open_5', desc: '5팩 개봉하기', icon: '📦', target: 5, type: 'packs', reward: 2000 },
    { id: 'open_10', desc: '10팩 개봉하기', icon: '🔥', target: 10, type: 'packs', reward: 3500 },
    { id: 'get_rr', desc: 'RR 이상 카드 뽑기', icon: '⭐', target: 1, type: 'rarity_RR+', reward: 1500 },
    { id: 'get_sr', desc: 'SR 이상 카드 뽑기', icon: '💎', target: 1, type: 'rarity_SR+', reward: 2500 },
    { id: 'sell_dupes', desc: '중복 카드 판매하기', icon: '♻️', target: 1, type: 'sell', reward: 800 },
    { id: 'collect_5', desc: '새 카드 5종 수집', icon: '🃏', target: 5, type: 'new_cards', reward: 2000 },
    { id: 'multi10', desc: '10팩 연속 개봉', icon: '🎯', target: 1, type: 'multi10', reward: 1500 },
    { id: 'watch_ad', desc: '광고 2회 시청', icon: '📺', target: 2, type: 'ad_watch', reward: 1000 },
];

class CardPackSimulator {
    constructor() {
        this.gacha = new GachaSystem();

        const urlParams = new URLSearchParams(window.location.search);
        const shareData = urlParams.get('share');
        this.isReadOnly = false;
        this.activeEvents = [];

        if (shareData) {
            this.collection = this.parseShareData(shareData);
            if (this.collection) {
                this.isReadOnly = true;
            } else {
                this.collection = this.loadCollection();
                this.shareLinkInvalid = true;
            }
        } else {
            this.collection = this.loadCollection();
        }

        // 마지막으로 선택한 세트 복원
        if (!this.isReadOnly && this.collection.selectedSet && PACK_DATA[this.collection.selectedSet]) {
            changeSet(this.collection.selectedSet);
            this.gacha.initializeCardPools();
        }

        this.currentPack = null;
        this.currentCardIndex = 0;
        this.isOpening = false;
        this.soundEnabled = true;
        this.totalPacksOpened = this.collection.packsOpened || 0;
        this.userGold = this.collection.userGold;
        this.achievements = this.collection.achievements || {};
        this.pityCounter = this.collection.pityCounter || 0;
        this.dailyBonus = this.collection.dailyBonus || { lastClaimed: null, streak: 0 };

        this.singlePackCounter = 0; // Track single pack opens for interstitial ads
        this.isRevealing = false;   // 카드 뒤집기 애니메이션 중 중복 입력 방지
        this.isRewardTimerRunning = false;
        this.openSession = 0;       // 개봉 세션 식별자 (중간 취소 후 늦게 도착한 비동기 처리 무시)

        this.initElements();
        this.initEvents();
        this.initSounds();
        this.updatePackUI();
        this.updateStats();
        this.updatePityDisplay();

        if (this.isReadOnly) {
            this.setupReadOnlyMode();
        }

        this.renderCollection();

        // Check active events & daily bonus
        if (!this.isReadOnly) {
            this.checkActiveEvents();
            this.checkDailyBonus();
            this.initDailyChallenges();
            this.updateWatchAdButton();
            // 탭을 오래 열어 둔 채 자정(KST)이 지나면 일일 보상·도전·이벤트를 갱신
            this.lastKSTDate = getKSTDateString();
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') this.refreshDailyState();
            });
        }

        if (this.shareLinkInvalid) {
            this.showToast('공유 링크가 올바르지 않아 내 컬렉션을 표시합니다.');
        }

        // Cookie consent & ad loading
        ConsentManager.showBannerIfNeeded();
    }

    refreshDailyState() {
        if (this.isOpening) return;
        const today = getKSTDateString();
        this.checkActiveEvents();
        this.updateWatchAdButton();
        if (today === this.lastKSTDate) return;
        this.lastKSTDate = today;
        this.checkDailyBonus();
        this.initDailyChallenges();
    }

    /** 현재 팩 1개 가격 (이벤트 반영) */
    getUnitPrice() {
        return this.activeEvents.length > 0 ? this.getEffectivePrice() : CARD_SET.price;
    }

    hasRateBoost() {
        return this.activeEvents.some(e => e.rateBoost);
    }

    // ===== Share Data Validation =====

    parseShareData(shareData) {
        // 크기 제한·base64(url) 형식·키 형식("setId:cardId")·수량 범위를 모두 검증
        const cards = window.PackUtils.decodeShareData(shareData);
        if (!cards) {
            console.warn('Invalid share data');
            return null;
        }
        return {
            cards, packsOpened: 0, userGold: 0, achievements: {}, pityCounter: 0,
            dailyBonus: { lastClaimed: null, streak: 0 },
        };
    }

    // ===== Initialization =====

    initElements() {
        this.els = {
            packContainer: document.getElementById('packContainer'),
            openBtn: document.getElementById('openBtn'),
            cardRevealOverlay: document.getElementById('cardRevealOverlay'),
            cardInner: document.getElementById('cardInner'),
            cardImage: document.getElementById('cardImage'),
            cardFrontFace: document.getElementById('cardFrontFace'),
            holoOverlay: document.getElementById('holoOverlay'),
            rarityBadge: document.getElementById('rarityBadge'),
            cardCounter: document.getElementById('cardCounter'),
            nextCardBtn: document.getElementById('nextCardBtn'),
            skipAllBtn: document.getElementById('skipAllBtn'),
            revealControls: document.getElementById('revealControls'),
            packResults: document.getElementById('packResults'),
            resultsGrid: document.getElementById('resultsGrid'),
            lightBurst: document.getElementById('lightBurst'),
            godPackAlert: document.getElementById('godPackAlert'),
            cardZoomModal: document.getElementById('cardZoomModal'),
            zoomImage: document.getElementById('zoomImage'),
            zoomCardName: document.getElementById('zoomCardName'),
            zoomRarityBadge: document.getElementById('zoomRarityBadge'),
            toast: document.getElementById('toast'),
            soundToggle: document.getElementById('soundToggle'),
            screenFlash: document.getElementById('screenFlash'),
            // Stats
            userGold: document.getElementById('userGold'),
            totalPacks: document.getElementById('totalPacks'),
            totalCollected: document.getElementById('totalCollected'),
            totalCards: document.getElementById('totalCards'),
            // Pack UI
            packTitleText: document.getElementById('packTitleText'),
            packSubtitleText: document.getElementById('packSubtitleText'),
            packPriceText: document.getElementById('packPriceText'),
            packCoverImage: document.getElementById('packCoverImage'),
            // Tabs
            tabPack: document.getElementById('tabPack'),
            tabCollection: document.getElementById('tabCollection'),
            packSection: document.getElementById('packSection'),
            collectionSection: document.getElementById('collectionSection'),
            // Collection
            sellDupesBtn: document.getElementById('sellDupesBtn'),
            shareCollectionBtn: document.getElementById('shareCollectionBtn'),
            collectionHeader: document.getElementById('collectionHeader'),
            readOnlyBanner: document.getElementById('readOnlyBanner'),
            startMyOwnBtn: document.getElementById('startMyOwnBtn'),
            collectionStats: document.getElementById('collectionStats'),
            filterBar: document.getElementById('filterBar'),
            collectionGrid: document.getElementById('collectionGrid'),
            // Probability Modal
            probBtn: document.getElementById('probBtn'),
            probModal: document.getElementById('probModal'),
            probModalClose: document.getElementById('probModalClose'),
            probModalBody: document.getElementById('probModalBody'),
            // Daily Bonus
            dailyBonusModal: document.getElementById('dailyBonusModal'),
            dailyBonusStreak: document.getElementById('dailyBonusStreak'),
            dailyBonusReward: document.getElementById('dailyBonusReward'),
            dailyBonusClaimBtn: document.getElementById('dailyBonusClaimBtn'),
            // Achievement
            achievementToast: document.getElementById('achievementToast'),
            achievementText: document.getElementById('achievementText'),
            // Pity
            pityCounter: document.getElementById('pityCounter'),
            pityCount: document.getElementById('pityCount'),
            // Reward Ad
            rewardAdBtn: document.getElementById('rewardAdBtn'),
            // Set switching
            prevSetBtn: document.getElementById('prevSetBtn'),
            nextSetBtn: document.getElementById('nextSetBtn'),
            setNameText: document.getElementById('setNameText'),
            // Multi-pack buttons
            open10Btn: document.getElementById('open10Btn'),
            open30Btn: document.getElementById('open30Btn'),
            price1: document.getElementById('price1'),
            price10: document.getElementById('price10'),
            price30: document.getElementById('price30'),
            // Daily Challenge
            dailyChallengeSection: document.getElementById('dailyChallengeSection'),
            challengeGrid: document.getElementById('challengeGrid'),
            // Watch Ad to Open Pack
            watchAdOpenBtn: document.getElementById('watchAdOpenBtn'),
            // Event Banner
            eventBanner: document.getElementById('eventBanner'),
            packResultsTitle: document.getElementById('packResultsTitle'),
            packResultsSummary: document.getElementById('packResultsSummary'),
            packResultsExtra: document.getElementById('packResultsExtra'),
            srStatus: document.getElementById('srStatus'),
        };
    }

    initEvents() {
        // Pack opening
        this.els.openBtn.addEventListener('click', () => this.startOpenPack());
        this.els.packContainer.addEventListener('click', () => this.startOpenPack());
        this.els.packContainer.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.startOpenPack();
            }
        });

        // Card reveal
        this.els.nextCardBtn.addEventListener('click', () => this.revealNextCard());
        this.els.skipAllBtn.addEventListener('click', () => this.skipToResults());

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                // 버튼에 포커스가 있으면 버튼의 기본 click 이 처리하므로 중복 진행 방지
                const onButton = e.target && e.target.closest && e.target.closest('button');
                if (!onButton && this.els.cardRevealOverlay.classList.contains('active')) {
                    e.preventDefault();
                    this.revealNextCard();
                }
            }
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Collection Action Buttons
        this.els.sellDupesBtn.addEventListener('click', () => this.sellDupeCards());
        this.els.shareCollectionBtn.addEventListener('click', () => this.shareCollectionLink());
        if (this.els.startMyOwnBtn) {
            this.els.startMyOwnBtn.addEventListener('click', () => {
                window.location.href = window.location.pathname;
            });
        }

        // Tabs
        this.els.tabPack.addEventListener('click', () => this.switchTab('pack'));
        this.els.tabCollection.addEventListener('click', () => this.switchTab('collection'));

        // Card zoom
        this.els.cardZoomModal.addEventListener('click', () => this.closeCardZoom());

        // 이미지 로드 실패 대체 표시 (error 이벤트는 버블링되지 않으므로 캡처 단계에서 처리)
        document.addEventListener('error', (e) => {
            const t = e.target;
            if (t && t.tagName === 'IMG' && t.closest('.result-card, .collection-card, .card-front-face')) {
                showImageFallback(t);
            }
        }, true);

        // 팩 이미지가 없는 세트는 세트 색상 커버로 대체
        if (this.els.packCoverImage) {
            this.els.packCoverImage.addEventListener('error', () => this.showPackCoverFallback());
        }

        // 결과/컬렉션 카드 클릭·키보드 (이벤트 위임)
        const activateCard = (el) => {
            const id = parseInt(el.dataset.cardId, 10);
            const card = CARDS.find(c => c.id === id);
            if (card) this.showCardZoom(card, el);
        };
        [this.els.packResults, this.els.collectionGrid].forEach(container => {
            container.addEventListener('click', (e) => {
                const el = e.target.closest('[data-card-id]');
                if (el && container.contains(el)) activateCard(el);
            });
            container.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                const el = e.target.closest('[data-card-id]');
                if (el && container.contains(el)) {
                    e.preventDefault();
                    activateCard(el);
                }
            });
        });
        this.els.filterBar.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-btn');
            if (!btn) return;
            this.collectionFilter = btn.dataset.filter;
            this.renderFilterBar();
            this.renderCollectionGrid(this.collectionFilter);
            this.playSound('click');
        });

        // Sound toggle
        this.els.soundToggle.addEventListener('click', () => this.toggleSound());

        // Touch/click on current card to flip
        document.getElementById('currentCardContainer').addEventListener('click', () => {
            if (this.isOpening && !this.els.cardInner.classList.contains('flipped')) {
                this.revealNextCard();
            }
        });

        // Probability Modal
        if (this.els.probBtn) {
            this.els.probBtn.addEventListener('click', () => this.showProbabilityModal());
        }
        if (this.els.probModalClose) {
            this.els.probModalClose.addEventListener('click', () => this.closeModal(this.els.probModal));
        }
        if (this.els.probModal) {
            this.els.probModal.addEventListener('click', (e) => {
                if (e.target === this.els.probModal) this.closeModal(this.els.probModal);
            });
        }

        // Daily Bonus Claim
        if (this.els.dailyBonusClaimBtn) {
            this.els.dailyBonusClaimBtn.addEventListener('click', () => this.claimDailyBonus());
        }
        if (this.els.dailyBonusModal) {
            this.els.dailyBonusModal.addEventListener('click', (e) => {
                if (e.target === this.els.dailyBonusModal) this.closeModal(this.els.dailyBonusModal);
            });
        }

        // Reward Ad
        if (this.els.rewardAdBtn) {
            this.els.rewardAdBtn.addEventListener('click', () => this.showRewardAd());
        }

        // Set switching
        if (this.els.prevSetBtn) {
            this.els.prevSetBtn.addEventListener('click', () => this.cycleSet(-1));
        }
        if (this.els.nextSetBtn) {
            this.els.nextSetBtn.addEventListener('click', () => this.cycleSet(1));
        }

        // Multi-pack opening
        if (this.els.open10Btn) {
            this.els.open10Btn.addEventListener('click', () => this.openMultiplePacks(10));
        }
        if (this.els.open30Btn) {
            this.els.open30Btn.addEventListener('click', () => this.openMultiplePacks(30));
        }

        // Watch Ad to Open Pack
        if (this.els.watchAdOpenBtn) {
            this.els.watchAdOpenBtn.addEventListener('click', () => this.watchAdAndOpenPack());
        }
    }

    setupReadOnlyMode() {
        this.els.tabPack.style.display = 'none';
        this.switchTab('collection');
        this.els.collectionHeader.style.display = 'none';
        this.els.readOnlyBanner.style.display = 'block';
        this.els.userGold.parentElement.style.opacity = '0.5';
        // 조회 전용: 골드 획득 버튼 숨김 (공유받은 데이터가 내 저장소를 덮어쓰지 않도록)
        if (this.els.rewardAdBtn) this.els.rewardAdBtn.style.display = 'none';
        if (this.els.watchAdOpenBtn) this.els.watchAdOpenBtn.style.display = 'none';
    }

    // ===== Sound System (Web Audio API) =====

    initSounds() {
        this.audioCtx = null;
    }

    ensureAudioContext() {
        if (!this.audioCtx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            this.audioCtx = new Ctx();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
        }
        return this.audioCtx;
    }

    playSound(type) {
        if (!this.soundEnabled) return;
        let ctx;
        try {
            ctx = this.ensureAudioContext();
        } catch (e) {
            ctx = null;
        }
        if (!ctx) return;

        switch (type) {
            case 'packOpen': this.playPackOpenSound(ctx); break;
            case 'cardFlip': this.playCardFlipSound(ctx); break;
            case 'rareReveal': this.playRareRevealSound(ctx); break;
            case 'superRare': this.playSuperRareSound(ctx); break;
            case 'godPack': this.playGodPackSound(ctx); break;
            case 'click': this.playClickSound(ctx); break;
            case 'achievement': this.playAchievementSound(ctx); break;
        }
    }

    playClickSound(ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1);
    }

    playPackOpenSound(ctx) {
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1); gain1.connect(ctx.destination);
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(200, now);
        osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.8);
        gain1.gain.setValueAtTime(0.1, now);
        gain1.gain.linearRampToValueAtTime(0.2, now + 0.3);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 1);
        osc1.start(now); osc1.stop(now + 1);

        const bufferSize = ctx.sampleRate * 0.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = ctx.createGain();
        noise.connect(noiseGain); noiseGain.connect(ctx.destination);
        noiseGain.gain.setValueAtTime(0.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        noise.start(now); noise.stop(now + 0.5);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2); gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(150, now + 0.3);
        osc2.frequency.exponentialRampToValueAtTime(50, now + 0.8);
        gain2.gain.setValueAtTime(0.3, now + 0.3);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        osc2.start(now + 0.3); osc2.stop(now + 0.8);
    }

    playCardFlipSound(ctx) {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    }

    playRareRevealSound(ctx) {
        const now = ctx.currentTime;
        [523, 659, 784, 1047].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            gain.gain.setValueAtTime(0.15, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
            osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.3);
        });
    }

    playSuperRareSound(ctx) {
        const now = ctx.currentTime;
        [262, 330, 392, 523, 659, 784].forEach((freq) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.linearRampToValueAtTime(0.15, now + 0.2);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
            osc.start(now); osc.stop(now + 1.5);
        });
        for (let i = 0; i < 5; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            const startFreq = 2000 + i * 500;
            osc.frequency.setValueAtTime(startFreq, now + 0.3 + i * 0.1);
            osc.frequency.exponentialRampToValueAtTime(startFreq * 1.5, now + 0.3 + i * 0.1 + 0.15);
            gain.gain.setValueAtTime(0.05, now + 0.3 + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3 + i * 0.1 + 0.2);
            osc.start(now + 0.3 + i * 0.1); osc.stop(now + 0.3 + i * 0.1 + 0.2);
        }
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.connect(subGain); subGain.connect(ctx.destination);
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(60, now);
        subOsc.frequency.exponentialRampToValueAtTime(20, now + 1.5);
        subGain.gain.setValueAtTime(0.5, now);
        subGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
        subOsc.start(now); subOsc.stop(now + 1.5);
    }

    playGodPackSound(ctx) {
        const now = ctx.currentTime;
        const scale = [262, 294, 330, 349, 392, 440, 494, 523, 587, 659, 784, 880, 1047];
        scale.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.1, now + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.5);
            osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.5);
        });
        setTimeout(() => this.playSuperRareSound(ctx), scale.length * 80);
    }

    playAchievementSound(ctx) {
        const now = ctx.currentTime;
        [523, 659, 784, 1047, 1319].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.12);
            gain.gain.setValueAtTime(0.12, now + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.4);
            osc.start(now + i * 0.12); osc.stop(now + i * 0.12 + 0.4);
        });
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.els.soundToggle.textContent = this.soundEnabled ? '🔊' : '🔇';
        this.els.soundToggle.setAttribute('aria-pressed', String(!this.soundEnabled));
        this.els.soundToggle.setAttribute('aria-label', this.soundEnabled ? '소리 끄기' : '소리 켜기');
        this.showToast(this.soundEnabled ? '🔊 소리 ON' : '🔇 소리 OFF');
    }

    // ===== Tab Navigation =====

    switchTab(tab) {
        this.playSound('click');
        this.els.tabPack.classList.toggle('active', tab === 'pack');
        this.els.tabCollection.classList.toggle('active', tab === 'collection');
        this.els.tabPack.setAttribute('aria-selected', String(tab === 'pack'));
        this.els.tabCollection.setAttribute('aria-selected', String(tab === 'collection'));
        document.body.dataset.tab = tab;
        this.els.packSection.style.display = tab === 'pack' ? '' : 'none';
        this.els.collectionSection.classList.toggle('active', tab === 'collection');
        if (tab === 'collection') this.renderCollection();
    }

    // ===== Pack Opening =====

    async startOpenPack(options = {}) {
        if (this.isOpening || this.isReadOnly) return;

        const price = options.free ? 0 : this.getUnitPrice();
        if (this.userGold < price) {
            this.showToast('💰 골드가 부족합니다! 중복 판매 또는 광고를 이용하세요.');
            this.updateWatchAdButton();
            return;
        }

        this.isOpening = true;
        const session = ++this.openSession;

        this.userGold -= price;
        this.playSound('click');
        this.els.packResults.style.display = 'none';

        // Generate pack (with pity system)
        this.currentPack = this.gacha.openPack(this.pityCounter, { rateBoost: this.hasRateBoost() });
        this.currentPackSetId = CURRENT_SET_ID;
        this.currentCardIndex = 0;
        this.isCardRevealed = false;
        this.revealedCount = 0; // 컬렉션에 이미 반영된 카드 수 (중복 반영 방지)

        // Update pity counter (SR 이상 등장 시 초기화)
        if (GachaSystem.hasPityBreaker(this.currentPack)) {
            this.pityCounter = 0;
        } else {
            this.pityCounter++;
        }
        this.updatePityDisplay();
        this.updateStats();
        this.saveCollection();
        this.updateWatchAdButton();

        const isGodPack = this.currentPack.isGodPack;
        this.currentPack.sort((a, b) => RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity]);

        this.els.packContainer.classList.add('shake');
        await this.wait(500);
        this.els.packContainer.classList.remove('shake');
        if (session !== this.openSession || !this.isOpening) return;

        this.openOverlay();
        this.playSound('packOpen');

        if (isGodPack) {
            await this.wait(300);
            if (session !== this.openSession || !this.isOpening) return;
            this.els.godPackAlert.classList.add('active');
            this.playSound('godPack');
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
            await this.wait(3000);
            this.els.godPackAlert.classList.remove('active');
            if (session !== this.openSession || !this.isOpening) return;
        }

        this.triggerLightBurst(isGodPack ? 'rainbow' : 'purple');
        await this.wait(800);
        if (session !== this.openSession || !this.isOpening) return;

        this.els.nextCardBtn.textContent = '카드 뒤집기 ✨';
        this.showCardBack();
        this.updateCardCounter();
        this.els.revealControls.style.display = 'flex';
        this.els.nextCardBtn.focus({ preventScroll: true });
    }

    openOverlay() {
        this.lastFocus = document.activeElement;
        this.els.cardRevealOverlay.classList.add('active');
        this.els.cardRevealOverlay.setAttribute('aria-hidden', 'false');
    }

    closeOverlay() {
        this.els.cardRevealOverlay.classList.remove('active');
        this.els.cardRevealOverlay.setAttribute('aria-hidden', 'true');
        if (this.lastFocus && document.contains(this.lastFocus)) {
            this.lastFocus.focus({ preventScroll: true });
        }
    }

    showCardBack() {
        this.els.cardInner.classList.remove('flipped');
        this.els.cardInner.classList.remove('has-aura');
        this.els.rarityBadge.style.display = 'none';
        this.els.cardFrontFace.className = 'card-face card-front-face';
        this.els.holoOverlay.className = 'holo-overlay';
        this.els.holoOverlay.style.opacity = '';

        // 이전 카드의 대체 표시 제거
        this.els.cardFrontFace.querySelectorAll('.img-fallback').forEach(el => el.remove());
        this.els.cardImage.style.display = '';
        delete this.els.cardImage.dataset.fallback;

        if (this.currentPack && this.currentCardIndex < this.currentPack.length) {
            const nextCard = this.currentPack[this.currentCardIndex];
            if (SR_PLUS.includes(nextCard.rarity)) {
                this.els.cardInner.classList.add('has-aura');
            }
        }
    }

    /** 현재 팩에서 index 이전까지의 카드를 컬렉션에 반영 (각 카드는 정확히 한 번만) */
    commitCardsUpTo(index) {
        const end = Math.min(index, this.currentPack.length);
        while (this.revealedCount < end) {
            this.addToCollection(this.currentPack[this.revealedCount]);
            this.revealedCount++;
        }
    }

    async revealNextCard() {
        if (!this.isOpening || !this.currentPack || this.isRevealing) return;
        if (!this.els.cardRevealOverlay.classList.contains('active')) return;

        if (this.currentCardIndex >= this.currentPack.length) {
            this.finishPack();
            return;
        }

        const session = this.openSession;
        this.isRevealing = true;
        try {
            if (!this.isCardRevealed) {
                await this.flipCurrentCard(session);
            } else {
                this.currentCardIndex++;
                this.updateCardCounter();

                if (this.currentCardIndex < this.currentPack.length) {
                    this.showCardBack();
                    this.isCardRevealed = false;
                    this.els.nextCardBtn.textContent = '카드 뒤집기 ✨';
                    await this.wait(300);
                } else {
                    this.finishPack();
                }
            }
        } finally {
            this.isRevealing = false;
        }
    }

    async flipCurrentCard(session) {
        const card = this.currentPack[this.currentCardIndex];
        const rarity = card.rarity;
        const info = RARITY_INFO[rarity] || RARITY_INFO.C;
        const isHighRare = HIGH_RARE.includes(rarity);
        const isSuperRare = ['SAR', 'MUR'].includes(rarity);
        const container = document.getElementById('currentCardContainer');

        if (isSuperRare) {
            container.classList.add('intense-shake-extreme');
            if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 400]);
            this.playSound('godPack');
            await this.wait(1200);
            container.classList.remove('intense-shake-extreme');
        } else if (isHighRare) {
            container.classList.add('intense-shake');
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            await this.wait(600);
            container.classList.remove('intense-shake');
        }
        // 대기 중에 ESC/전체 보기로 개봉이 끝났으면 중단
        if (session !== this.openSession || !this.isOpening) return;

        this.els.cardImage.src = getCardImageUrl(card.id, 800, this.currentPackSetId);
        this.els.cardImage.alt = `${card.name} (${info.fullName})`;
        this.els.cardFrontFace.className = `card-face card-front-face rarity-${rarity}`;

        if (isHighRare) {
            this.els.holoOverlay.className = 'holo-overlay ar-holo';
            this.els.holoOverlay.style.opacity = '1';
        }

        if (isSuperRare) {
            this.els.screenFlash.classList.remove('active');
            void this.els.screenFlash.offsetWidth;
            this.els.screenFlash.classList.add('active');
            this.playSound('superRare');
        } else if (isHighRare) {
            this.playSound('rareReveal');
        } else {
            this.playSound('cardFlip');
        }

        this.els.cardInner.classList.add('flipped');

        if (isSuperRare) {
            this.triggerLightBurst(rarity === 'MUR' ? 'rainbow' : 'gold');
            this.createSparkles(30, info.color);
        } else if (isHighRare) {
            this.createSparkles(15, info.color);
        }

        this.els.rarityBadge.textContent = `${info.fullName} ${info.label}`;
        this.els.rarityBadge.style.background = info.bgColor;
        this.els.rarityBadge.style.color = info.color;
        this.els.rarityBadge.style.border = `2px solid ${info.color}`;

        this.commitCardsUpTo(this.currentCardIndex + 1);
        this.isCardRevealed = true;
        this.announce(`${this.currentCardIndex + 1}번째 카드: ${card.name}, ${info.fullName}`);

        if (this.currentCardIndex + 1 < this.currentPack.length) {
            this.els.nextCardBtn.textContent = '다음 카드 →';
        } else {
            this.els.nextCardBtn.textContent = '결과 보기 📊';
        }

        await this.wait(400);
        if (session !== this.openSession || !this.isOpening) return;
        this.els.rarityBadge.style.display = 'block';
    }

    skipToResults() {
        if (!this.isOpening || !this.currentPack) return;
        this.commitCardsUpTo(this.currentPack.length);
        this.currentCardIndex = this.currentPack.length;
        this.finishPack();
    }

    finishPack() {
        if (!this.isOpening || !this.currentPack) return;
        this.commitCardsUpTo(this.currentPack.length);
        this.isOpening = false;
        this.openSession++;
        this.totalPacksOpened++;
        this.singlePackCounter++;

        this.els.godPackAlert.classList.remove('active');
        this.closeOverlay();
        this.els.nextCardBtn.textContent = '다음 카드 →';

        this.saveCollection();
        this.updateStats();
        this.updateWatchAdButton();

        // Track event
        trackEvent('pack_open', CURRENT_SET_ID, 1);

        // Update daily challenges
        this.updateChallengeProgress('packs', 1);

        // Check rarity-based challenges from current pack
        if (this.currentPack.some(c => RR_PLUS.includes(c.rarity))) this.updateChallengeProgress('rarity_RR+', 1);
        if (this.currentPack.some(c => SR_PLUS.includes(c.rarity))) this.updateChallengeProgress('rarity_SR+', 1);

        this.showPackResults();
        this.checkPackAchievements();
    }

    /** 결과 카드 1장의 HTML (키보드로도 확대 가능) */
    resultCardHtml(card) {
        const info = RARITY_INFO[card.rarity] || RARITY_INFO.C;
        const imgUrl = getCardImageUrl(card.id, 400);
        return `
            <div class="result-card" style="border-color:${info.color};" data-card-id="${card.id}"
                 role="button" tabindex="0" aria-label="${escapeHtml(card.name)} ${escapeHtml(info.fullName)} 크게 보기">
                <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(card.name)}" loading="lazy" decoding="async">
                <div class="mini-badge" style="background:${info.color};color:white;" aria-hidden="true">${escapeHtml(info.label)}</div>
            </div>`;
    }

    showPackResults() {
        this.els.packResults.style.display = 'block';
        this.els.packResultsSummary.innerHTML = '';
        this.els.packResultsExtra.innerHTML = '';
        this.els.packResultsTitle.textContent = '🎉 개봉 결과';
        this.els.resultsGrid.innerHTML = this.currentPack.map(card => this.resultCardHtml(card)).join('');
        this.els.packResults.scrollIntoView({ behavior: this.prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
    }

    prefersReducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /** 스크린리더 알림 */
    announce(message) {
        if (!this.els.srStatus) return;
        this.els.srStatus.textContent = '';
        setTimeout(() => { this.els.srStatus.textContent = message; }, 50);
    }

    // ===== Visual Effects =====

    triggerLightBurst(type = 'purple') {
        const el = this.els.lightBurst;
        el.className = `light-burst ${type}`;
        void el.offsetWidth;
        el.classList.add('active');
        setTimeout(() => el.classList.remove('active'), 1000);
    }

    createSparkles(count = 20, color = '#ffd700') {
        const container = document.createElement('div');
        container.className = 'sparkle';
        container.style.top = '50%';
        container.style.left = '50%';
        document.body.appendChild(container);

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'sparkle-particle';
            const angle = (Math.PI * 2 * i) / count;
            const distance = 80 + Math.random() * 150;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;
            particle.style.cssText = `
                background: ${color};
                --dx: ${dx}px; --dy: ${dy}px;
                width: ${4 + Math.random() * 6}px; height: ${4 + Math.random() * 6}px;
                animation-delay: ${Math.random() * 0.3}s;
                box-shadow: 0 0 8px ${color};
            `;
            container.appendChild(particle);
        }
        setTimeout(() => container.remove(), 2000);
    }

    updateCardCounter() {
        const current = this.currentCardIndex + 1;
        const total = this.currentPack.length;
        this.els.cardCounter.innerHTML = `카드 <span>${Math.min(current, total)}</span> / <span>${total}</span>`;
    }

    // ===== Collection System =====

    loadCollection() {
        let raw = safeJsonParse(storage.get(STORAGE_KEYS.collection), null);

        // Migration: check old keys
        if (!raw) {
            const oldData = storage.get('stellar_dream_collection') || storage.get('pokemon_mega_dream_collection');
            raw = safeJsonParse(oldData, null);
            if (raw) {
                storage.set(STORAGE_KEYS.collection, JSON.stringify(raw));
                storage.remove('stellar_dream_collection');
                storage.remove('pokemon_mega_dream_collection');
            }
        }

        // 손상되었거나 조작된 값(음수·NaN 골드, 잘못된 키 등)은 정규화
        return window.PackUtils.normalizeCollection(raw, DEFAULT_GOLD);
    }

    saveCollection() {
        // 조회 전용(공유 링크)일 때는 절대 저장하지 않음 → 내 컬렉션이 덮어써지지 않음
        if (this.isReadOnly) return;
        this.collection.packsOpened = this.totalPacksOpened;
        this.collection.userGold = this.userGold;
        this.collection.achievements = this.achievements;
        this.collection.pityCounter = this.pityCounter;
        this.collection.dailyBonus = this.dailyBonus;
        this.collection.selectedSet = CURRENT_SET_ID;
        if (!storage.set(STORAGE_KEYS.collection, JSON.stringify(this.collection)) && !this.storageWarned) {
            this.storageWarned = true;
            this.showToast('⚠️ 저장소를 사용할 수 없어 진행 상황이 저장되지 않습니다.');
        }
    }

    /** Collection key: "setId:cardId" to avoid cross-set ID collision */
    collectionKey(cardId, setId) {
        return (setId || CURRENT_SET_ID) + ':' + cardId;
    }

    /** @returns {boolean} 새로 얻은 카드인지 */
    addToCollection(card, options = {}) {
        const key = this.collectionKey(card.id);
        const isNew = !this.collection.cards[key];
        if (isNew) {
            this.collection.cards[key] = { count: 0, firstPack: this.totalPacksOpened + 1 };
        }
        this.collection.cards[key].count++;

        // Track new card for daily challenge (다중 개봉은 호출 측에서 한 번에 반영)
        if (isNew && !options.deferChallenge) {
            this.updateChallengeProgress('new_cards', 1);
        }

        // Check rarity achievements
        this.checkRarityAchievement(card.rarity);
        return isNew;
    }

    getCollectedCount() {
        return CARDS.filter(c => this.collection.cards[this.collectionKey(c.id)]).length;
    }

    updateStats() {
        this.els.userGold.textContent = this.userGold.toLocaleString('ko-KR');
        this.els.totalPacks.textContent = this.totalPacksOpened.toLocaleString('ko-KR');
        const collected = this.getCollectedCount();
        this.els.totalCards.textContent = CARDS.length;
        this.els.totalCollected.textContent = collected;
    }

    updatePityDisplay() {
        if (this.els.pityCounter && this.els.pityCount) {
            if (this.pityCounter > 0 && !this.isReadOnly) {
                this.els.pityCounter.style.display = 'block';
                this.els.pityCount.textContent = Math.min(this.pityCounter, GachaSystem.PITY_LIMIT);
            } else {
                this.els.pityCounter.style.display = 'none';
            }
        }
    }

    // ===== Collection Actions =====

    sellDupeCards() {
        if (this.isReadOnly || this.isOpening) return;
        this.playSound('click');
        let totalEarned = 0;
        let soldCount = 0;
        const sellPrices = { C: 5, U: 15, R: 50, RR: 150, AR: 200, SR: 500, SAR: 2500, MUR: 5000 };

        for (const [key, data] of Object.entries(this.collection.cards)) {
            // key format: "setId:cardId"
            const parts = key.split(':');
            const setId = parts.length === 2 ? parts[0] : CURRENT_SET_ID;
            const cardId = parts.length === 2 ? parseInt(parts[1], 10) : parseInt(parts[0], 10);
            let cardInfo = null;
            if (PACK_DATA[setId]) {
                cardInfo = PACK_DATA[setId].cards.find(c => c.id === cardId);
            }
            if (cardInfo && data.count > 1) {
                const dupes = data.count - 1;
                totalEarned += dupes * (sellPrices[cardInfo.rarity] || 10);
                soldCount += dupes;
                data.count = 1;
            }
        }

        if (soldCount > 0) {
            this.userGold += totalEarned;
            this.saveCollection();
            this.updateStats();
            this.updateWatchAdButton();
            this.renderCollection();
            this.showToast(`♻️ 중복 카드 ${soldCount}장 판매 → ${totalEarned.toLocaleString()}G 획득!`);
            this.playSound('packOpen');
            this.updateChallengeProgress('sell', 1);
        } else {
            this.showToast('판매할 중복 카드가 없습니다.');
        }
    }

    shareCollectionLink() {
        this.playSound('click');
        let shareUrl;
        try {
            const data = window.PackUtils.encodeShareData(this.collection.cards);
            if (data.length > window.PackUtils.SHARE_MAX_LENGTH) {
                this.showToast('컬렉션 데이터가 너무 커서 링크를 만들 수 없습니다.');
                return;
            }
            shareUrl = `${window.location.origin}${window.location.pathname}?share=${data}`;
        } catch (e) {
            this.showToast('링크 생성에 실패했습니다.');
            return;
        }

        const fallback = () => {
            // 클립보드 API 를 쓸 수 없는 환경(HTTP, 구형 브라우저, 권한 거부)
            window.prompt('아래 링크를 복사해 공유하세요.', shareUrl);
        };
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(shareUrl)
                .then(() => this.showToast('✅ 컬렉션 링크가 복사되었습니다!'))
                .catch(fallback);
        } else {
            fallback();
        }
    }

    renderCollection() {
        this.renderCollectionStats();
        this.renderFilterBar();
        this.renderCollectionGrid();
    }

    renderCollectionStats() {
        const rarities = GachaSystem.RARITY_ORDER;
        const collected = this.getCollectedCount();
        const percent = CARDS.length > 0 ? collected / CARDS.length * 100 : 0;
        let html = `
            <div class="collection-stat">
                <div class="stat-label">총 개봉</div>
                <div class="stat-number" style="color:var(--accent-blue);">${this.totalPacksOpened.toLocaleString('ko-KR')}</div>
            </div>
            <div class="collection-stat">
                <div class="stat-label">수집률</div>
                <div class="stat-number" style="color:var(--accent-gold);">
                    ${Math.floor(percent)}%
                </div>
                <div class="progress-bar" role="progressbar" aria-label="수집률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(percent)}">
                    <div class="progress-fill" style="width:${percent}%"></div>
                </div>
            </div>
        `;
        rarities.forEach(r => {
            const info = RARITY_INFO[r];
            const total = CARDS.filter(c => c.rarity === r).length;
            if (total === 0) return; // 세트에 없는 레어도는 표시하지 않음
            const owned = CARDS.filter(c => c.rarity === r && this.collection.cards[this.collectionKey(c.id)]).length;
            html += `
                <div class="collection-stat">
                    <div class="stat-label">${escapeHtml(info.fullName)}</div>
                    <div class="stat-number" style="color:${info.color};">${owned}/${total}</div>
                </div>
            `;
        });
        this.els.collectionStats.innerHTML = html;
    }

    renderFilterBar() {
        const active = this.collectionFilter || 'all';
        const filters = [{ key: 'all', label: '전체' }].concat(
            GachaSystem.RARITY_ORDER
                .filter(r => CARDS.some(c => c.rarity === r))
                .map(r => ({ key: r, label: r }))
        );
        this.els.filterBar.innerHTML = filters.map(f => `
            <button type="button" class="filter-btn ${f.key === active ? 'active' : ''}" data-filter="${f.key}" aria-pressed="${f.key === active}">${f.label}</button>
        `).join('');
    }

    renderCollectionGrid(filter) {
        filter = filter || this.collectionFilter || 'all';
        let filteredCards = [...CARDS];
        if (filter !== 'all') filteredCards = filteredCards.filter(c => c.rarity === filter);

        if (filteredCards.length === 0) {
            this.els.collectionGrid.innerHTML = '<p class="empty-state">이 레어도의 카드가 없습니다.</p>';
            return;
        }

        const htmlArr = filteredCards.map((card) => {
            const owned = this.collection.cards[this.collectionKey(card.id)];
            const info = RARITY_INFO[card.rarity] || RARITY_INFO.C;
            const isSecret = card.id > CARD_SET.baseCards;
            const imgUrl = getCardImageUrl(card.id, 400);
            const label = owned
                ? `${card.name} ${info.fullName}, ${owned.count}장 보유. 크게 보기`
                : `${card.name} ${info.fullName}, 미보유`;

            return `
                <div class="collection-card ${owned ? 'owned' : 'not-owned'} ${isSecret ? 'secret-card' : ''}"
                     ${owned ? `data-card-id="${card.id}" role="button" tabindex="0"` : 'role="img"'}
                     aria-label="${escapeHtml(label)}"
                     style="border-color: ${owned ? info.color : 'transparent'};">
                    <img src="${escapeHtml(imgUrl)}" alt="" loading="lazy" decoding="async">
                    ${owned ? `<div class="count-badge" aria-hidden="true">&times;${owned.count}</div>` : ''}
                    ${isSecret ? `<div class="secret-badge" style="background:${info.color};" aria-hidden="true">${escapeHtml(info.label)}</div>` : ''}
                </div>
            `;
        });

        let html = htmlArr.join('');
        if (filter === 'all' && this.getCollectedCount() === 0) {
            html = `<p class="empty-state">${this.isReadOnly ? '이 세트에서 수집한 카드가 없습니다.' : '아직 이 세트의 카드가 없습니다. 팩을 개봉해 보세요!'}</p>` + html;
        }
        this.els.collectionGrid.innerHTML = html;
    }

    // ===== Card Zoom =====

    showCardZoom(card, opener) {
        const info = RARITY_INFO[card.rarity] || RARITY_INFO.C;
        const imgUrl = getCardImageUrl(card.id, 800);
        this.zoomOpener = opener || document.activeElement;
        this.els.zoomImage.src = imgUrl;
        this.els.zoomImage.alt = `${card.name} (${info.fullName})`;
        this.els.zoomCardName.textContent = card.name;
        this.els.zoomRarityBadge.textContent = info.fullName;
        this.els.zoomRarityBadge.style.background = info.color;
        this.els.zoomRarityBadge.style.color = 'white';
        this.els.zoomRarityBadge.style.padding = '6px 20px';
        this.els.zoomRarityBadge.style.borderRadius = '20px';
        this.els.zoomRarityBadge.style.position = 'static';
        this.els.zoomRarityBadge.style.transform = 'none';
        this.els.zoomRarityBadge.style.display = 'inline-block';
        this.els.cardZoomModal.classList.add('active');
        this.els.cardZoomModal.setAttribute('aria-hidden', 'false');
        this.els.cardZoomModal.focus({ preventScroll: true });
        this.playSound('click');
    }

    closeCardZoom() {
        if (!this.els.cardZoomModal.classList.contains('active')) return;
        this.els.cardZoomModal.classList.remove('active');
        this.els.cardZoomModal.setAttribute('aria-hidden', 'true');
        if (this.zoomOpener && document.contains(this.zoomOpener)) this.zoomOpener.focus({ preventScroll: true });
    }

    openModal(modal, focusEl) {
        this.modalOpener = document.activeElement;
        modal.style.display = 'flex';
        const target = focusEl || modal.querySelector('button');
        if (target) target.focus({ preventScroll: true });
    }

    closeModal(modal) {
        if (!modal || modal.style.display === 'none') return;
        modal.style.display = 'none';
        if (this.modalOpener && document.contains(this.modalOpener)) this.modalOpener.focus({ preventScroll: true });
    }

    // ===== Probability Modal =====

    showProbabilityModal() {
        this.playSound('click');
        const data = GACHA_PROBABILITY_DATA;
        let html = '<div class="prob-info">';
        html += `<p class="prob-desc">1팩 = ${data.packSize}장</p>`;
        html += '<table class="prob-table"><thead><tr><th>슬롯</th><th>설명</th><th>확률</th></tr></thead><tbody>';

        for (const [key, slot] of Object.entries(data.slots)) {
            const probs = Object.entries(slot.probabilities)
                .map(([r, p]) => `<span class="prob-rarity" style="color:${RARITY_INFO[r] ? RARITY_INFO[r].color : '#fff'}">${r}: ${p}%</span>`)
                .join(' ');
            html += `<tr><td>${escapeHtml(slot.label)}</td><td>${escapeHtml(slot.description)}</td><td>${probs}</td></tr>`;
        }

        html += '</tbody></table>';
        html += `<div class="prob-godpack">🌟 갓팩 확률: ${data.godPack.chance}% (${escapeHtml(data.godPack.description)})</div>`;
        html += `<div class="prob-pity">🔥 천장 시스템: ${GachaSystem.PITY_LIMIT}팩 연속 SR 이상 미등장 시 ${GachaSystem.PITY_LIMIT}번째 팩 슬롯 10에서 SR 이상 보장</div>`;
        if (this.hasRateBoost()) {
            html += '<div class="prob-pity">🎰 주말 이벤트 진행 중: 슬롯 10의 SAR·MUR 가중치 2배 (SAR 약 2.9%, MUR 약 1.0%)</div>';
        }
        if (this.gacha.cardsByRarity.AR === this.gacha.cardsByRarity.SAR) {
            html += '<div class="prob-desc">※ 이 세트에는 AR 등급이 없어 AR 확률은 SAR 카드로 대체됩니다.</div>';
        }
        html += '</div>';

        this.els.probModalBody.innerHTML = html;
        this.openModal(this.els.probModal, this.els.probModalClose);
    }

    // ===== Daily Bonus System =====

    checkDailyBonus() {
        // 날짜 경계는 기기 시간대와 무관하게 한국 시간(KST) 자정 기준
        const today = getKSTDateString();
        if (this.dailyBonus.lastClaimed === today) return;

        const yesterday = previousDateString(today);
        let streak = this.dailyBonus.streak || 0;

        if (this.dailyBonus.lastClaimed === yesterday) {
            streak = Math.min(streak + 1, DAILY_BONUS_REWARDS.length - 1);
        } else {
            streak = 0; // 첫 출석이거나 하루 이상 끊김 → 1일차부터
        }

        const reward = DAILY_BONUS_REWARDS[streak];

        if (this.els.dailyBonusStreak) {
            let streakHtml = '';
            for (let i = 0; i < DAILY_BONUS_REWARDS.length; i++) {
                const active = i <= streak ? 'active' : '';
                const current = i === streak ? 'current' : '';
                streakHtml += `<div class="streak-day ${active} ${current}" ${current ? 'aria-current="step"' : ''}>
                    <div class="streak-day-num">Day ${i + 1}</div>
                    <div class="streak-day-reward">${DAILY_BONUS_REWARDS[i].toLocaleString('ko-KR')}G</div>
                </div>`;
            }
            this.els.dailyBonusStreak.innerHTML = streakHtml;
        }

        const displayReward = Math.round(reward * this.getGoldBonusMultiplier());
        if (this.els.dailyBonusReward) {
            this.els.dailyBonusReward.innerHTML = `<div class="reward-amount">+${displayReward.toLocaleString('ko-KR')}G</div>`;
        }

        this._pendingDailyDate = today;
        this._pendingDailyStreak = streak;
        this._pendingDailyReward = reward;

        setTimeout(() => {
            if (this.isOpening) return;
            this.openModal(this.els.dailyBonusModal, this.els.dailyBonusClaimBtn);
        }, 500);
    }

    claimDailyBonus() {
        const today = this._pendingDailyDate;
        // 중복 수령 방지 (더블 클릭, 이미 받은 날)
        if (!today || this.dailyBonus.lastClaimed === today || this.isReadOnly) {
            this.closeModal(this.els.dailyBonusModal);
            return;
        }
        const baseReward = this._pendingDailyReward;
        const bonusMultiplier = this.getGoldBonusMultiplier();
        const reward = Math.round(baseReward * bonusMultiplier);

        this.userGold += reward;
        this.dailyBonus.lastClaimed = today;
        this.dailyBonus.streak = this._pendingDailyStreak;
        this._pendingDailyDate = null;

        this.saveCollection();
        this.updateStats();
        this.updateWatchAdButton();
        this.closeModal(this.els.dailyBonusModal);
        this.showToast(`🎁 일일 보상 ${reward.toLocaleString('ko-KR')}G 획득!`);
        this.playSound('achievement');
        trackEvent('daily_return', `streak_${this.dailyBonus.streak}`, reward);
    }

    // ===== Achievement System =====

    checkRarityAchievement(rarity) {
        const map = { RR: 'first_RR', AR: 'first_AR', SR: 'first_SR', SAR: 'first_SAR', MUR: 'first_MUR' };
        const key = map[rarity];
        if (key && !this.achievements[key]) {
            this.unlockAchievement(key);
        }
    }

    checkPackAchievements() {
        // 다중 개봉으로 마일스톤을 건너뛰어도 달성되도록 '이상' 비교
        const packMilestones = [[1, 'first_pack'], [10, 'pack_10'], [50, 'pack_50'], [100, 'pack_100']];
        for (const [count, key] of packMilestones) {
            if (this.totalPacksOpened >= count && !this.achievements[key]) {
                this.unlockAchievement(key);
            }
        }

        // Full set check
        if (!this.achievements.full_set && CARDS.length > 0 && this.getCollectedCount() >= CARDS.length) {
            this.unlockAchievement('full_set');
        }
    }

    unlockAchievement(key) {
        const ach = ACHIEVEMENTS[key];
        if (!ach || this.isReadOnly) return;

        this.achievements[key] = Date.now();
        this.userGold += ach.gold;
        this.saveCollection();
        this.updateStats();

        trackEvent('achievement_unlocked', key, ach.gold);

        // Show achievement toast
        if (this.els.achievementToast && this.els.achievementText) {
            this.els.achievementText.innerHTML = `${ach.icon} ${escapeHtml(ach.name)}<br><small>${escapeHtml(ach.desc)} (+${ach.gold.toLocaleString('ko-KR')}G)</small>`;
            this.els.achievementToast.style.display = 'flex';
            this.playSound('achievement');
            clearTimeout(this.achievementTimer);
            this.achievementTimer = setTimeout(() => {
                this.els.achievementToast.style.display = 'none';
            }, 4000);
        }
    }

    // ===== Reward Ad =====

    getRewardAdData() {
        const today = getKSTDateString();
        const data = safeJsonParse(storage.get(STORAGE_KEYS.rewardAd), {});
        const count = parseInt(data && data.count, 10);
        if (!data || data.date !== today || isNaN(count) || count < 0) return { date: today, count: 0 };
        return { date: today, count };
    }

    incrementRewardAdCount() {
        const adData = this.getRewardAdData();
        adData.count++;
        storage.set(STORAGE_KEYS.rewardAd, JSON.stringify(adData));
        return adData;
    }

    showRewardAd() {
        if (this.isReadOnly || this.isRewardTimerRunning) return;
        this.playSound('click');

        // Check daily limit
        const adData = this.getRewardAdData();
        if (adData.count >= REWARD_AD_DAILY_LIMIT) {
            this.showToast(`오늘의 광고 보상 한도(${REWARD_AD_DAILY_LIMIT}회)에 도달했습니다.`);
            return;
        }

        // Show reward timer overlay (5 second countdown)
        this.showRewardTimer(() => {
            this.grantAdReward();
        });
    }

    /** Show a 5-second countdown timer overlay, then call onComplete */
    showRewardTimer(onComplete) {
        if (this.isRewardTimerRunning) return;
        const overlay = document.getElementById('rewardTimerOverlay');
        const countEl = document.getElementById('rewardTimerCount');
        const progressEl = document.getElementById('rewardTimerProgress');
        if (!overlay) { onComplete(); return; }

        this.isRewardTimerRunning = true;
        overlay.style.display = 'flex';
        let remaining = 5;
        countEl.textContent = remaining;
        progressEl.style.width = '0%';

        const interval = setInterval(() => {
            remaining--;
            countEl.textContent = Math.max(remaining, 0);
            progressEl.style.width = ((5 - remaining) / 5 * 100) + '%';

            if (remaining <= 0) {
                clearInterval(interval);
                overlay.style.display = 'none';
                this.isRewardTimerRunning = false;
                onComplete();
            }
        }, 1000);
    }

    grantAdReward() {
        // 타이머 도중 날짜가 바뀌었거나 다른 탭에서 한도를 채운 경우 재확인
        if (this.getRewardAdData().count >= REWARD_AD_DAILY_LIMIT) {
            this.showToast(`오늘의 광고 보상 한도(${REWARD_AD_DAILY_LIMIT}회)에 도달했습니다.`);
            return;
        }
        this.userGold += REWARD_AD_GOLD;
        const adData = this.incrementRewardAdCount();

        this.saveCollection();
        this.updateStats();
        this.updateWatchAdButton();
        this.showToast(`✅ 보상 ${REWARD_AD_GOLD}G 획득! (오늘 ${adData.count}/${REWARD_AD_DAILY_LIMIT})`);
        this.playSound('achievement');

        // Track & update challenges
        trackEvent('ad_reward_watched', 'reward_500g', REWARD_AD_GOLD);
        this.updateChallengeProgress('ad_watch', 1);
    }

    // ===== Watch Ad to Open Pack =====

    updateWatchAdButton() {
        if (this.els.watchAdOpenBtn) {
            if (this.isReadOnly) {
                this.els.watchAdOpenBtn.style.display = 'none';
                return;
            }
            const needsGold = this.userGold < this.getUnitPrice();
            const canWatchAd = this.getRewardAdData().count < REWARD_AD_DAILY_LIMIT;
            this.els.watchAdOpenBtn.style.display = (needsGold && canWatchAd) ? 'block' : 'none';
        }
    }

    watchAdAndOpenPack() {
        if (this.isReadOnly || this.isOpening || this.isRewardTimerRunning) return;
        this.playSound('click');
        if (this.getRewardAdData().count >= REWARD_AD_DAILY_LIMIT) {
            this.showToast('오늘의 광고 한도에 도달했습니다.');
            return;
        }

        this.showRewardTimer(() => {
            if (this.isOpening) return;
            if (this.getRewardAdData().count >= REWARD_AD_DAILY_LIMIT) {
                this.showToast('오늘의 광고 한도에 도달했습니다.');
                return;
            }
            this.incrementRewardAdCount();
            trackEvent('ad_reward_watched', 'free_pack', 1);
            this.updateChallengeProgress('ad_watch', 1);
            // 골드를 더했다가 빼는 대신 무료 개봉으로 처리 (가격 변동·중복 클릭에도 골드가 새지 않음)
            this.startOpenPack({ free: true });
        });
    }

    // ===== Multi-Pack Opening =====

    openMultiplePacks(count) {
        if (this.isOpening || this.isReadOnly) return;

        const price = this.getUnitPrice() * count;
        if (this.userGold < price) {
            this.showToast(`💰 골드가 부족합니다! ${price.toLocaleString('ko-KR')}G 필요`);
            return;
        }

        this.isOpening = true;
        this.userGold -= price;
        this.playSound('packOpen');

        const allCards = [];
        let godPackCount = 0;
        let newCardCount = 0;
        const rateBoost = this.hasRateBoost();

        for (let i = 0; i < count; i++) {
            const pack = this.gacha.openPack(this.pityCounter, { rateBoost });

            if (pack.isGodPack) godPackCount++;

            if (GachaSystem.hasPityBreaker(pack)) {
                this.pityCounter = 0;
            } else {
                this.pityCounter++;
            }

            for (const card of pack) {
                allCards.push(card);
                if (this.addToCollection(card, { deferChallenge: true })) newCardCount++;
            }

            this.totalPacksOpened++;
        }
        if (newCardCount > 0) this.updateChallengeProgress('new_cards', newCardCount);

        this.updatePityDisplay();
        this.saveCollection();
        this.updateStats();
        this.updateWatchAdButton();

        // Track events
        trackEvent('pack_open', `multi_${count}_${CURRENT_SET_ID}`, count);

        // Update daily challenges
        this.updateChallengeProgress('packs', count);
        if (count >= 10) this.updateChallengeProgress('multi10', 1);

        // Check rarity for challenges
        const hasRR = allCards.some(c => RR_PLUS.includes(c.rarity));
        const hasSR = allCards.some(c => SR_PLUS.includes(c.rarity));
        if (hasRR) this.updateChallengeProgress('rarity_RR+', 1);
        if (hasSR) this.updateChallengeProgress('rarity_SR+', 1);

        this.showMultiPackResults(allCards, count, godPackCount);
        this.checkPackAchievements();

        this.isOpening = false;
    }

    showMultiPackResults(allCards, packCount, godPackCount) {
        allCards.sort((a, b) => (RARITY_RANK[b.rarity] || 0) - (RARITY_RANK[a.rarity] || 0));

        // Count by rarity
        const rarityCounts = {};
        for (const card of allCards) {
            rarityCounts[card.rarity] = (rarityCounts[card.rarity] || 0) + 1;
        }

        const highRareCount = (rarityCounts.SR || 0) + (rarityCounts.SAR || 0) + (rarityCounts.MUR || 0);

        // Build summary HTML
        let summaryHtml = `<div class="multi-pack-summary">`;
        summaryHtml += `<div class="summary-title">📦 ${packCount}팩 개봉 결과 (${allCards.length}장)</div>`;

        if (godPackCount > 0) {
            summaryHtml += `<div class="summary-godpack">🌟 GOD PACK ${godPackCount}회!</div>`;
        }

        summaryHtml += `<div class="summary-stats">`;
        const displayOrder = [...GachaSystem.RARITY_ORDER].reverse();
        for (const r of displayOrder) {
            if (rarityCounts[r]) {
                const info = RARITY_INFO[r];
                summaryHtml += `<span class="summary-rarity" style="color:${info.color};">${info.label}: ${rarityCounts[r]}</span>`;
            }
        }
        summaryHtml += `</div></div>`;

        // Separate high-rarity and common cards
        const highCards = allCards.filter(c => !['C', 'U'].includes(c.rarity));
        const commonCards = allCards.filter(c => ['C', 'U'].includes(c.rarity));

        // C/U toggle section
        let commonHtml = '';
        if (commonCards.length > 0) {
            commonHtml = `<div class="common-toggle-section">
                <button type="button" class="toggle-common-btn" id="toggleCommonBtn" aria-expanded="false" aria-controls="commonCardsGrid">C/U 카드 보기 (${commonCards.length}장) ▼</button>
                <div class="common-cards-grid" id="commonCardsGrid" hidden>
                    ${commonCards.map(card => this.resultCardHtml(card)).join('')}
                </div></div>`;
        }

        // 단일 개봉 결과와 같은 컨테이너 구조를 유지 (요약/추가 영역만 교체)
        this.els.packResults.style.display = 'block';
        this.els.packResultsTitle.textContent = '🎉 다중 개봉 결과';
        this.els.packResultsSummary.innerHTML = summaryHtml;
        this.els.resultsGrid.innerHTML = highCards.map(card => this.resultCardHtml(card)).join('');
        this.els.packResultsExtra.innerHTML = commonHtml;

        const toggleBtn = document.getElementById('toggleCommonBtn');
        const commonGrid = document.getElementById('commonCardsGrid');
        if (toggleBtn && commonGrid) {
            toggleBtn.addEventListener('click', () => {
                const isHidden = commonGrid.hidden;
                commonGrid.hidden = !isHidden;
                toggleBtn.setAttribute('aria-expanded', String(isHidden));
                toggleBtn.textContent = isHidden
                    ? `C/U 카드 숨기기 (${commonCards.length}장) ▲`
                    : `C/U 카드 보기 (${commonCards.length}장) ▼`;
            });
        }

        this.els.packResults.scrollIntoView({ behavior: this.prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
        this.announce(`${packCount}팩 개봉 완료. 총 ${allCards.length}장, SR 이상 ${highRareCount}장`);

        if (highRareCount > 0) {
            this.playSound('rareReveal');
        }
    }

    // ===== Event System =====

    checkActiveEvents() {
        const now = new Date();
        this.activeEvents = EVENT_PACKS.filter(e => e.isActive(now));
        this.renderEventBanner();
        this.updatePackUI();
    }

    renderEventBanner() {
        if (!this.els.eventBanner) return;

        if (this.activeEvents.length === 0) {
            this.els.eventBanner.style.display = 'none';
            return;
        }

        this.els.eventBanner.style.display = 'block';
        this.els.eventBanner.innerHTML = this.activeEvents.map(event => `
            <div class="event-banner-item" style="background:${event.bannerColor};">
                <span class="event-icon" aria-hidden="true">${event.icon}</span>
                <div class="event-info">
                    <strong>${escapeHtml(event.nameKo || event.name)}</strong>
                    <span>${escapeHtml(event.description)}${event.priceMultiplier && event.priceMultiplier !== 1 ? ` (팩 가격 ×${event.priceMultiplier})` : ''}</span>
                </div>
            </div>
        `).join('');
    }

    /** Get current effective pack price (base price * event multiplier) */
    getEffectivePrice() {
        const basePrice = CARD_SET.price;
        let multiplier = 1;
        for (const event of this.activeEvents) {
            if (event.priceMultiplier) {
                multiplier = Math.max(multiplier, event.priceMultiplier);
            }
        }
        return Math.round(basePrice * multiplier);
    }

    /** Get gold bonus multiplier from active events */
    getGoldBonusMultiplier() {
        let multiplier = 1;
        for (const event of this.activeEvents) {
            if (event.goldBonusMultiplier) {
                multiplier = Math.max(multiplier, event.goldBonusMultiplier);
            }
        }
        return multiplier;
    }

    // ===== Set Switching =====

    cycleSet(direction) {
        if (this.isOpening) return;
        this.playSound('click');

        const setIds = Object.keys(PACK_DATA);
        const currentIdx = setIds.indexOf(CURRENT_SET_ID);
        const newIdx = (currentIdx + direction + setIds.length) % setIds.length;
        const newSetId = setIds[newIdx];

        changeSet(newSetId);
        this.gacha.initializeCardPools();
        this.collectionFilter = 'all';
        // 이전 세트의 개봉 결과는 카드 ID 가 겹치므로 숨김
        this.els.packResults.style.display = 'none';
        this.updatePackUI();
        this.updateStats();
        this.updateWatchAdButton();
        this.renderCollection();
        if (!this.isReadOnly) {
            this.collection.selectedSet = newSetId;
            this.saveCollection();
        }
        this.showToast(`📦 ${CARD_SET.nameKo || CARD_SET.name} 선택!`);
    }

    updatePackUI() {
        const displayName = CARD_SET.nameKo || CARD_SET.name;
        if (this.els.packTitleText) {
            this.els.packTitleText.textContent = displayName;
        }

        // Use event-adjusted price
        const effectivePrice = this.getUnitPrice();
        const hasEventPrice = effectivePrice !== CARD_SET.price;

        if (this.els.packSubtitleText) {
            const priceHtml = hasEventPrice
                ? `<s style="opacity:0.5;">${CARD_SET.price.toLocaleString()}</s> <span style="color:#ef4444;">${effectivePrice.toLocaleString()}</span>`
                : effectivePrice.toLocaleString();
            this.els.packSubtitleText.innerHTML =
                `1팩 ${CARD_SET.cardsPerPack}장 | <span style="color:var(--accent-gold);font-weight:bold;"><span id="packPriceText">${priceHtml}</span>G</span>`;
        }
        if (this.els.setNameText) {
            this.els.setNameText.textContent = CARD_SET.id;
        }
        // Pack cover: real booster pack image (없으면 세트 색상 커버로 대체)
        if (this.els.packCoverImage) {
            const front = this.els.packCoverImage.parentElement;
            front.classList.remove('no-image');
            front.style.background = '';
            this.els.packCoverImage.style.display = '';
            this.els.packCoverImage.alt = `${displayName} 부스터 팩`;
            if (CARD_SET.packImage) {
                this.els.packCoverImage.src = CARD_SET.packImage;
            } else {
                this.showPackCoverFallback();
            }
        }
        if (this.els.packContainer) {
            this.els.packContainer.setAttribute('aria-label', `${displayName} 카드팩 1팩 개봉하기 (${effectivePrice.toLocaleString('ko-KR')}골드)`);
        }
        // Multi-pack prices (with event multiplier)
        const p = effectivePrice;
        if (this.els.price1) this.els.price1.textContent = p.toLocaleString('ko-KR');
        if (this.els.price10) this.els.price10.textContent = (p * 10).toLocaleString('ko-KR');
        if (this.els.price30) this.els.price30.textContent = (p * 30).toLocaleString('ko-KR');
    }

    showPackCoverFallback() {
        const img = this.els.packCoverImage;
        const front = img.parentElement;
        img.style.display = 'none';
        front.classList.add('no-image');
        front.style.background = CARD_SET.coverColor || 'var(--gradient-stellar)';
        front.dataset.setName = CARD_SET.nameKo || CARD_SET.name;
    }

    // ===== Daily Challenge System =====

    initDailyChallenges() {
        const today = getKSTDateString();
        let challengeData = safeJsonParse(storage.get(STORAGE_KEYS.challenges), {});

        // Reset if new day (KST) or data is corrupted
        const valid = challengeData && challengeData.date === today && Array.isArray(challengeData.challenges)
            && challengeData.challenges.every(c => c && DAILY_CHALLENGES.some(d => d.id === c.id));
        if (!valid) {
            // Pick 3 random challenges
            const shuffled = [...DAILY_CHALLENGES].sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, 3);
            challengeData = {
                date: today,
                challenges: selected.map(c => ({
                    id: c.id,
                    progress: 0,
                    completed: false,
                    claimed: false,
                }))
            };
            storage.set(STORAGE_KEYS.challenges, JSON.stringify(challengeData));
        }
        // 설명·보상 등 정의는 저장값이 아닌 코드에서 가져옴 (저장소 조작으로 보상 변경 불가)
        challengeData.challenges = challengeData.challenges.map(c => ({
            ...DAILY_CHALLENGES.find(d => d.id === c.id),
            progress: Math.max(0, parseInt(c.progress, 10) || 0),
            completed: !!c.completed,
            claimed: !!c.claimed,
        }));

        this.dailyChallenges = challengeData;
        this.renderDailyChallenges();
    }

    renderDailyChallenges() {
        if (!this.els.dailyChallengeSection || !this.els.challengeGrid) return;
        if (!this.dailyChallenges || !this.dailyChallenges.challenges) return;

        this.els.dailyChallengeSection.style.display = 'block';
        const challenges = this.dailyChallenges.challenges;

        this.els.challengeGrid.innerHTML = challenges.map((ch, i) => {
            const done = ch.completed;
            const progressText = ch.target > 1 ? `${Math.min(ch.progress, ch.target)}/${ch.target}` : '';
            return `
                <div class="challenge-card ${done ? 'completed' : ''}" data-index="${i}">
                    <div class="challenge-info">
                        <span class="challenge-icon" aria-hidden="true">${ch.icon}</span>
                        <div>
                            <div class="challenge-desc">${escapeHtml(ch.desc)}</div>
                            ${progressText ? `<div class="challenge-progress">${progressText}</div>` : ''}
                        </div>
                    </div>
                    <span class="challenge-reward">${done ? '✅ 완료' : `+${ch.reward.toLocaleString('ko-KR')}G`}</span>
                </div>
            `;
        }).join('');
    }

    updateChallengeProgress(type, amount) {
        if (this.isReadOnly || !this.dailyChallenges || !this.dailyChallenges.challenges) return;
        // 자정(KST)을 넘겨 계속 플레이 중이면 새 도전으로 교체 후 반영
        if (this.dailyChallenges.date !== getKSTDateString()) this.initDailyChallenges();
        let changed = false;

        for (const ch of this.dailyChallenges.challenges) {
            if (ch.completed || ch.claimed) continue;
            if (ch.type !== type) continue;

            ch.progress = (ch.progress || 0) + amount;
            if (ch.progress >= ch.target) {
                ch.completed = true;
                ch.claimed = true;
                const bonusMultiplier = this.getGoldBonusMultiplier();
                const finalReward = Math.round(ch.reward * bonusMultiplier);
                this.userGold += finalReward;
                this.saveCollection();
                this.updateStats();
                const bonusText = bonusMultiplier > 1 ? ` (x${bonusMultiplier} 이벤트!)` : '';
                this.showToast(`🎯 도전 완료! "${ch.desc}" → +${finalReward.toLocaleString('ko-KR')}G${bonusText}`);
                this.playSound('achievement');
                trackEvent('challenge_completed', ch.id, finalReward);
            }
            changed = true;
        }

        if (changed) {
            const toStore = {
                date: this.dailyChallenges.date,
                challenges: this.dailyChallenges.challenges.map(c => ({
                    id: c.id, progress: c.progress, completed: c.completed, claimed: c.claimed,
                })),
            };
            storage.set(STORAGE_KEYS.challenges, JSON.stringify(toStore));
            this.renderDailyChallenges();
        }
    }

    // ===== Utilities =====

    closeAllModals() {
        // 확대 보기 → 모달 → 개봉 중 순서로 한 단계씩 닫음
        if (this.els.cardZoomModal.classList.contains('active')) {
            this.closeCardZoom();
            return;
        }
        if (this.els.probModal && this.els.probModal.style.display !== 'none') {
            this.closeModal(this.els.probModal);
            return;
        }
        if (this.els.dailyBonusModal && this.els.dailyBonusModal.style.display !== 'none') {
            this.closeModal(this.els.dailyBonusModal);
            return;
        }
        if (this.isOpening) this.skipToResults();
    }

    showToast(message) {
        this.els.toast.textContent = message;
        this.els.toast.classList.add('show');
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => this.els.toast.classList.remove('show'), 2500);
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CardPackSimulator();
});

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}
