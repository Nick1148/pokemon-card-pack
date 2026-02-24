/**
 * Pokemon Card Pack Simulator - Main App Logic
 */

// ===== Consent & Ad/Analytics Management =====

const ConsentManager = {
    STORAGE_KEY: 'cookie_consent',

    getConsent() {
        return localStorage.getItem(this.STORAGE_KEY); // 'accepted' | 'rejected' | null
    },

    setConsent(value) {
        localStorage.setItem(this.STORAGE_KEY, value);
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

        // Google Analytics 4 (replace G-XXXXXXXXXX with real ID)
        if (!document.getElementById('ga4-script')) {
            const gaScript = document.createElement('script');
            gaScript.id = 'ga4-script';
            gaScript.async = true;
            gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX';
            document.head.appendChild(gaScript);

            gaScript.onload = () => {
                window.dataLayer = window.dataLayer || [];
                window.gtag = function() { dataLayer.push(arguments); };
                gtag('js', new Date());
                gtag('config', 'G-XXXXXXXXXX');
            };
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
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
        isActive: () => {
            const day = new Date().getDay();
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
        isActive: () => {
            return new Date().getDate() <= 7;
        },
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

        if (shareData) {
            this.isReadOnly = true;
            this.collection = this.parseShareData(shareData);
            if (!this.collection) {
                this.isReadOnly = false;
                this.collection = this.loadCollection();
            }
        } else {
            this.isReadOnly = false;
            this.collection = this.loadCollection();
        }

        this.currentPack = null;
        this.currentCardIndex = 0;
        this.isOpening = false;
        this.soundEnabled = true;
        this.totalPacksOpened = this.collection.packsOpened || 0;
        this.userGold = this.collection.userGold !== undefined ? this.collection.userGold : 10000;
        this.achievements = this.collection.achievements || {};
        this.pityCounter = this.collection.pityCounter || 0;
        this.dailyBonus = this.collection.dailyBonus || { lastClaimed: null, streak: 0 };

        this.singlePackCounter = 0; // Track single pack opens for interstitial ads

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
            this.activeEvents = [];
            this.checkActiveEvents();
            this.checkDailyBonus();
            this.initDailyChallenges();
            this.updateWatchAdButton();
        }

        // Cookie consent & ad loading
        ConsentManager.showBannerIfNeeded();
    }

    // ===== Share Data Validation =====

    parseShareData(shareData) {
        try {
            // Size limit: 10KB
            if (shareData.length > 13333) { // ~10KB in base64
                console.warn('Share data too large');
                return null;
            }

            const decoded = JSON.parse(atob(shareData));

            // Validate structure
            if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
                return null;
            }

            // Validate each entry (supports "setId:cardId" and legacy "cardId" keys)
            const validatedCards = {};
            for (const [key, data] of Object.entries(decoded)) {
                if (typeof data !== 'object' || data === null) continue;
                const count = parseInt(data.count);
                if (isNaN(count) || count < 1 || count > 99999) continue;
                // Accept both "sv8:57" and "57" (legacy) formats
                validatedCards[key] = { count, firstPack: parseInt(data.firstPack) || 0 };
            }

            return { cards: validatedCards, packsOpened: 0, userGold: 0 };
        } catch (e) {
            console.warn('Invalid share data:', e.message);
            return null;
        }
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
        };
    }

    initEvents() {
        // Pack opening
        this.els.openBtn.addEventListener('click', () => this.startOpenPack());
        this.els.packContainer.addEventListener('click', () => this.startOpenPack());
        this.els.packContainer.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.startOpenPack();
        });

        // Card reveal
        this.els.nextCardBtn.addEventListener('click', () => this.revealNextCard());
        this.els.skipAllBtn.addEventListener('click', () => this.skipToResults());

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                if (this.els.cardRevealOverlay.classList.contains('active')) {
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
            this.els.startMyOwnBtn.addEventListener('click', () => { window.location.search = ''; });
        }

        // Tabs
        this.els.tabPack.addEventListener('click', () => this.switchTab('pack'));
        this.els.tabCollection.addEventListener('click', () => this.switchTab('collection'));

        // Card zoom
        this.els.cardZoomModal.addEventListener('click', () => {
            this.els.cardZoomModal.classList.remove('active');
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
            this.els.probModalClose.addEventListener('click', () => {
                this.els.probModal.style.display = 'none';
            });
        }
        if (this.els.probModal) {
            this.els.probModal.addEventListener('click', (e) => {
                if (e.target === this.els.probModal) this.els.probModal.style.display = 'none';
            });
        }

        // Daily Bonus Claim
        if (this.els.dailyBonusClaimBtn) {
            this.els.dailyBonusClaimBtn.addEventListener('click', () => this.claimDailyBonus());
        }
        if (this.els.dailyBonusModal) {
            this.els.dailyBonusModal.addEventListener('click', (e) => {
                if (e.target === this.els.dailyBonusModal) this.els.dailyBonusModal.style.display = 'none';
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
    }

    // ===== Sound System (Web Audio API) =====

    initSounds() {
        this.audioCtx = null;
    }

    ensureAudioContext() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    playSound(type) {
        if (!this.soundEnabled) return;
        this.ensureAudioContext();
        const ctx = this.audioCtx;

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
        this.showToast(this.soundEnabled ? '🔊 소리 ON' : '🔇 소리 OFF');
    }

    // ===== Tab Navigation =====

    switchTab(tab) {
        this.playSound('click');
        this.els.tabPack.classList.toggle('active', tab === 'pack');
        this.els.tabCollection.classList.toggle('active', tab === 'collection');
        this.els.packSection.style.display = tab === 'pack' ? '' : 'none';
        this.els.collectionSection.classList.toggle('active', tab === 'collection');
        if (tab === 'collection') this.renderCollection();
    }

    // ===== Pack Opening =====

    async startOpenPack() {
        if (this.isOpening) return;

        const price = this.activeEvents && this.activeEvents.length > 0 ? this.getEffectivePrice() : CARD_SET.price;
        if (this.userGold < price) {
            this.showToast('💰 골드가 부족합니다! 중복 판매 또는 광고를 이용하세요.');
            this.updateWatchAdButton();
            return;
        }

        this.userGold -= price;
        this.updateStats();
        this.saveCollection();
        this.updateWatchAdButton();

        this.isOpening = true;
        this.playSound('click');
        this.els.packResults.style.display = 'none';

        // Generate pack (with pity system)
        this.currentPack = this.gacha.openPack(this.pityCounter);
        this.currentCardIndex = 0;
        this.isCardRevealed = false;

        // Update pity counter
        const hasHighRare = this.currentPack.some(c => ['AR', 'SR', 'SAR', 'MUR'].includes(c.rarity));
        if (hasHighRare) {
            this.pityCounter = 0;
        } else {
            this.pityCounter++;
        }
        this.updatePityDisplay();

        const isGodPack = this.currentPack.isGodPack;
        const rarityOrder = { C: 0, U: 1, R: 2, RR: 3, AR: 4, SR: 5, SAR: 6, MUR: 7 };
        this.currentPack.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]);

        this.els.packContainer.classList.add('shake');
        await this.wait(500);
        this.els.packContainer.classList.remove('shake');

        this.els.cardRevealOverlay.classList.add('active');
        this.playSound('packOpen');

        if (isGodPack) {
            await this.wait(300);
            this.els.godPackAlert.classList.add('active');
            this.playSound('godPack');
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
            await this.wait(3000);
            this.els.godPackAlert.classList.remove('active');
        }

        this.triggerLightBurst(isGodPack ? 'rainbow' : 'purple');
        await this.wait(800);

        this.els.nextCardBtn.textContent = '카드 뒤집기 ✨';
        this.showCardBack();
        this.updateCardCounter();
        this.els.revealControls.style.display = 'flex';
    }

    showCardBack() {
        this.els.cardInner.classList.remove('flipped');
        this.els.cardInner.classList.remove('has-aura');
        this.els.rarityBadge.style.display = 'none';
        this.els.cardFrontFace.className = 'card-face card-front-face';
        this.els.holoOverlay.className = 'holo-overlay';

        if (this.currentPack && this.currentCardIndex < this.currentPack.length) {
            const nextCard = this.currentPack[this.currentCardIndex];
            if (['SR', 'SAR', 'MUR'].includes(nextCard.rarity)) {
                this.els.cardInner.classList.add('has-aura');
            }
        }
    }

    async revealNextCard() {
        if (this.currentCardIndex >= this.currentPack.length) {
            this.finishPack();
            return;
        }

        if (!this.isCardRevealed) {
            const card = this.currentPack[this.currentCardIndex];
            const rarity = card.rarity;
            const info = RARITY_INFO[rarity];
            const isHighRare = ['AR', 'SR', 'SAR', 'MUR'].includes(rarity);
            const isSuperRare = ['SAR', 'MUR'].includes(rarity);

            if (isSuperRare) {
                document.getElementById('currentCardContainer').classList.add('intense-shake-extreme');
                if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 400]);
                this.playSound('godPack');
                await this.wait(1200);
                document.getElementById('currentCardContainer').classList.remove('intense-shake-extreme');
            } else if (isHighRare) {
                document.getElementById('currentCardContainer').classList.add('intense-shake');
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                await this.wait(600);
                document.getElementById('currentCardContainer').classList.remove('intense-shake');
            }

            const imageUrl = getCardImageUrl(card.id, 800);
            this.els.cardImage.onerror = () => { this.els.cardImage.style.display='none'; this.els.cardImage.parentElement.insertAdjacentHTML('beforeend','<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:3rem;color:#fff;background:rgba(0,0,0,0.3);border-radius:12px;">🎴</div>'); };
            this.els.cardImage.src = imageUrl;
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

            this.els.rarityBadge.textContent = `${escapeHtml(info.fullName)} ${escapeHtml(info.label)}`;
            this.els.rarityBadge.style.background = info.bgColor.includes('gradient') ? info.bgColor : info.bgColor;
            this.els.rarityBadge.style.color = info.color;
            this.els.rarityBadge.style.border = `2px solid ${info.color}`;

            await this.wait(400);
            this.els.rarityBadge.style.display = 'block';

            this.addToCollection(card);
            this.isCardRevealed = true;

            if (this.currentCardIndex + 1 < this.currentPack.length) {
                this.els.nextCardBtn.textContent = '다음 카드 →';
            } else {
                this.els.nextCardBtn.textContent = '결과 보기 📊';
            }
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
    }

    async skipToResults() {
        while (this.currentCardIndex < this.currentPack.length) {
            const card = this.currentPack[this.currentCardIndex];
            this.addToCollection(card);
            this.currentCardIndex++;
        }
        this.finishPack();
    }

    finishPack() {
        this.isOpening = false;
        this.totalPacksOpened++;
        this.singlePackCounter++;

        this.els.cardRevealOverlay.classList.remove('active');
        this.els.nextCardBtn.textContent = '다음 카드 →';

        this.saveCollection();
        this.updateStats();
        this.updateWatchAdButton();

        // Track event
        trackEvent('pack_open', CURRENT_SET_ID, 1);

        // Update daily challenges
        this.updateChallengeProgress('packs', 1);

        // Check rarity-based challenges from current pack
        if (this.currentPack) {
            const hasRR = this.currentPack.some(c => ['RR', 'AR', 'SR', 'SAR', 'MUR'].includes(c.rarity));
            const hasSR = this.currentPack.some(c => ['SR', 'SAR', 'MUR'].includes(c.rarity));
            if (hasRR) this.updateChallengeProgress('rarity_RR+', 1);
            if (hasSR) this.updateChallengeProgress('rarity_SR+', 1);
        }

        this.showPackResults();
        this.checkPackAchievements();
    }

    showPackResults() {
        this.els.packResults.style.display = 'block';
        this.els.resultsGrid.innerHTML = '';

        this.currentPack.forEach((card) => {
            const info = RARITY_INFO[card.rarity];
            const div = document.createElement('div');
            div.className = 'result-card';
            div.style.borderColor = info.color;
            const imgUrl = getCardImageUrl(card.id, 400);
            div.innerHTML = `
                <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(card.name)}" loading="lazy" onerror="this.style.display='none';this.parentElement.insertAdjacentHTML('beforeend','<div style=&quot;display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:2rem;color:#fff;background:rgba(0,0,0,0.3);border-radius:8px;&quot;>🎴</div>');">
                <div class="mini-badge" style="background:${escapeHtml(info.color)};color:white;">${escapeHtml(info.label)}</div>
            `;
            div.addEventListener('click', () => this.showCardZoom(card));
            this.els.resultsGrid.appendChild(div);
        });

        this.els.packResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
        try {
            const data = localStorage.getItem('pokemon_card_collection');
            if (data) return JSON.parse(data);

            // Migration: check old keys
            const oldData = localStorage.getItem('stellar_dream_collection') || localStorage.getItem('pokemon_mega_dream_collection');
            if (oldData) {
                const parsed = JSON.parse(oldData);
                localStorage.setItem('pokemon_card_collection', JSON.stringify(parsed));
                localStorage.removeItem('stellar_dream_collection');
                localStorage.removeItem('pokemon_mega_dream_collection');
                return parsed;
            }

            return { cards: {}, packsOpened: 0 };
        } catch {
            return { cards: {}, packsOpened: 0 };
        }
    }

    saveCollection() {
        this.collection.packsOpened = this.totalPacksOpened;
        this.collection.userGold = this.userGold;
        this.collection.achievements = this.achievements;
        this.collection.pityCounter = this.pityCounter;
        this.collection.dailyBonus = this.dailyBonus;
        localStorage.setItem('pokemon_card_collection', JSON.stringify(this.collection));
    }

    /** Collection key: "setId:cardId" to avoid cross-set ID collision */
    collectionKey(cardId, setId) {
        return (setId || CURRENT_SET_ID) + ':' + cardId;
    }

    addToCollection(card) {
        const key = this.collectionKey(card.id);
        const isNew = !this.collection.cards[key];
        if (isNew) {
            this.collection.cards[key] = { count: 0, firstPack: this.totalPacksOpened + 1 };
        }
        this.collection.cards[key].count++;

        // Track new card for daily challenge
        if (isNew) {
            this.updateChallengeProgress('new_cards', 1);
        }

        // Check rarity achievements
        this.checkRarityAchievement(card.rarity);
    }

    getCollectedCount() {
        return CARDS.filter(c => this.collection.cards[this.collectionKey(c.id)]).length;
    }

    updateStats() {
        this.els.userGold.textContent = this.userGold.toLocaleString();
        this.els.totalPacks.textContent = this.totalPacksOpened;
        const collected = this.getCollectedCount();
        this.els.totalCards.textContent = CARDS.length;
        this.els.totalCollected.textContent = collected;
    }

    updatePityDisplay() {
        if (this.els.pityCounter && this.els.pityCount) {
            if (this.pityCounter > 0) {
                this.els.pityCounter.style.display = 'block';
                this.els.pityCount.textContent = this.pityCounter;
            } else {
                this.els.pityCounter.style.display = 'none';
            }
        }
    }

    // ===== Collection Actions =====

    sellDupeCards() {
        this.playSound('click');
        let totalEarned = 0;
        let soldCount = 0;
        const sellPrices = { C: 5, U: 15, R: 50, RR: 150, AR: 200, SR: 500, SAR: 2500, MUR: 5000 };

        for (const [key, data] of Object.entries(this.collection.cards)) {
            // key format: "setId:cardId"
            const parts = key.split(':');
            const setId = parts.length === 2 ? parts[0] : CURRENT_SET_ID;
            const cardId = parts.length === 2 ? parseInt(parts[1]) : parseInt(parts[0]);
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
        try {
            const base64Data = btoa(JSON.stringify(this.collection.cards));
            if (base64Data.length > 13333) {
                this.showToast('컬렉션 데이터가 너무 큽니다.');
                return;
            }
            const shareUrl = `${window.location.origin}${window.location.pathname}?share=${base64Data}`;
            navigator.clipboard.writeText(shareUrl).then(() => {
                this.showToast('✅ 컬렉션 링크가 복사되었습니다!');
            });
        } catch (e) {
            this.showToast('링크 생성에 실패했습니다.');
        }
    }

    renderCollection() {
        this.renderCollectionStats();
        this.renderFilterBar();
        this.renderCollectionGrid();
    }

    renderCollectionStats() {
        const rarities = ['C', 'U', 'R', 'RR', 'AR', 'SR', 'SAR', 'MUR'];
        let html = `
            <div class="collection-stat">
                <div class="stat-label">총 개봉</div>
                <div class="stat-number" style="color:var(--accent-blue);">${this.totalPacksOpened}</div>
            </div>
            <div class="collection-stat">
                <div class="stat-label">수집률</div>
                <div class="stat-number" style="color:var(--accent-gold);">
                    ${Math.round(this.getCollectedCount() / CARDS.length * 100)}%
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width:${this.getCollectedCount() / CARDS.length * 100}%"></div>
                </div>
            </div>
        `;
        rarities.forEach(r => {
            const info = RARITY_INFO[r];
            const total = CARDS.filter(c => c.rarity === r).length;
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
        const filters = [
            { key: 'all', label: '전체' },
            { key: 'C', label: 'C' }, { key: 'U', label: 'U' }, { key: 'R', label: 'R' },
            { key: 'RR', label: 'RR' }, { key: 'AR', label: 'AR' }, { key: 'SR', label: 'SR' },
            { key: 'SAR', label: 'SAR' }, { key: 'MUR', label: 'MUR' },
        ];
        this.els.filterBar.innerHTML = filters.map(f => `
            <button class="filter-btn ${f.key === 'all' ? 'active' : ''}" data-filter="${f.key}">${f.label}</button>
        `).join('');

        this.els.filterBar.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.els.filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderCollectionGrid(btn.dataset.filter);
                this.playSound('click');
            });
        });
    }

    renderCollectionGrid(filter = 'all') {
        let filteredCards = [...CARDS];
        if (filter !== 'all') filteredCards = filteredCards.filter(c => c.rarity === filter);

        const htmlArr = filteredCards.map((card) => {
            const owned = this.collection.cards[this.collectionKey(card.id)];
            const info = RARITY_INFO[card.rarity];
            const isSecret = card.id > CARD_SET.baseCards;
            const imgUrl = getCardImageUrl(card.id, 400);

            return `
                <div class="collection-card ${owned ? 'owned' : 'not-owned'} ${isSecret ? 'secret-card' : ''}"
                     data-id="${card.id}"
                     style="border-color: ${owned ? info.color : 'transparent'};">
                    <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(card.name)}" loading="lazy" onerror="this.style.display='none';this.parentElement.insertAdjacentHTML('beforeend','<div style=&quot;display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:2rem;color:#fff;background:rgba(0,0,0,0.3);border-radius:8px;&quot;>🎴</div>');">
                    ${owned ? `<div class="count-badge">&times;${owned.count}</div>` : ''}
                    ${isSecret ? `<div class="secret-badge" style="background:${info.color};">${escapeHtml(info.label)}</div>` : ''}
                </div>
            `;
        });

        this.els.collectionGrid.innerHTML = htmlArr.join('');

        this.els.collectionGrid.querySelectorAll('.collection-card.owned').forEach(el => {
            el.addEventListener('click', () => {
                const id = parseInt(el.dataset.id);
                const card = CARDS.find(c => c.id === id);
                if (card) this.showCardZoom(card);
            });
        });
    }

    // ===== Card Zoom =====

    showCardZoom(card) {
        const info = RARITY_INFO[card.rarity];
        const imgUrl = getCardImageUrl(card.id, 800);
        this.els.zoomImage.src = imgUrl;
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
        this.playSound('click');
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
                .map(([r, p]) => `<span class="prob-rarity" style="color:${RARITY_INFO[r]?.color || '#fff'}">${r}: ${p}%</span>`)
                .join(' ');
            html += `<tr><td>${escapeHtml(slot.label)}</td><td>${escapeHtml(slot.description)}</td><td>${probs}</td></tr>`;
        }

        html += '</tbody></table>';
        html += `<div class="prob-godpack">🌟 갓팩 확률: ${data.godPack.chance}% (${escapeHtml(data.godPack.description)})</div>`;
        html += '<div class="prob-pity">🔥 천장 시스템: 50팩 연속 SR 이상 미등장 시 SR 이상 보장</div>';
        html += '</div>';

        this.els.probModalBody.innerHTML = html;
        this.els.probModal.style.display = 'flex';
    }

    // ===== Daily Bonus System =====

    checkDailyBonus() {
        const today = new Date().toISOString().split('T')[0];
        if (this.dailyBonus.lastClaimed === today) return;

        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        let streak = this.dailyBonus.streak || 0;

        if (this.dailyBonus.lastClaimed === yesterday) {
            streak = Math.min(streak + 1, 6);
        } else if (this.dailyBonus.lastClaimed) {
            streak = 0; // Reset streak
        }

        const reward = DAILY_BONUS_REWARDS[streak];

        if (this.els.dailyBonusStreak) {
            let streakHtml = '';
            for (let i = 0; i < 7; i++) {
                const active = i <= streak ? 'active' : '';
                const current = i === streak ? 'current' : '';
                streakHtml += `<div class="streak-day ${active} ${current}">
                    <div class="streak-day-num">Day ${i + 1}</div>
                    <div class="streak-day-reward">${DAILY_BONUS_REWARDS[i].toLocaleString()}G</div>
                </div>`;
            }
            this.els.dailyBonusStreak.innerHTML = streakHtml;
        }

        if (this.els.dailyBonusReward) {
            this.els.dailyBonusReward.innerHTML = `<div class="reward-amount">+${reward.toLocaleString()}G</div>`;
        }

        this._pendingDailyStreak = streak;
        this._pendingDailyReward = reward;

        setTimeout(() => {
            this.els.dailyBonusModal.style.display = 'flex';
        }, 500);
    }

    claimDailyBonus() {
        const today = new Date().toISOString().split('T')[0];
        const baseReward = this._pendingDailyReward;
        const bonusMultiplier = this.getGoldBonusMultiplier();
        const reward = Math.round(baseReward * bonusMultiplier);

        this.userGold += reward;
        this.dailyBonus.lastClaimed = today;
        this.dailyBonus.streak = this._pendingDailyStreak;

        this.saveCollection();
        this.updateStats();
        this.updateWatchAdButton();
        this.els.dailyBonusModal.style.display = 'none';
        this.showToast(`🎁 일일 보상 ${reward.toLocaleString()}G 획득!`);
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
        const packMilestones = { 1: 'first_pack', 10: 'pack_10', 50: 'pack_50', 100: 'pack_100' };
        const key = packMilestones[this.totalPacksOpened];
        if (key && !this.achievements[key]) {
            this.unlockAchievement(key);
        }

        // Full set check
        if (!this.achievements.full_set && this.getCollectedCount() >= CARDS.length) {
            this.unlockAchievement('full_set');
        }
    }

    unlockAchievement(key) {
        const ach = ACHIEVEMENTS[key];
        if (!ach) return;

        this.achievements[key] = Date.now();
        this.userGold += ach.gold;
        this.saveCollection();
        this.updateStats();

        trackEvent('achievement_unlocked', key, ach.gold);

        // Show achievement toast
        if (this.els.achievementToast && this.els.achievementText) {
            this.els.achievementText.innerHTML = `${ach.icon} ${escapeHtml(ach.name)}<br><small>${escapeHtml(ach.desc)} (+${ach.gold.toLocaleString()}G)</small>`;
            this.els.achievementToast.style.display = 'flex';
            this.playSound('achievement');
            setTimeout(() => {
                this.els.achievementToast.style.display = 'none';
            }, 4000);
        }
    }

    // ===== Reward Ad =====

    getRewardAdData() {
        const today = new Date().toISOString().split('T')[0];
        const data = JSON.parse(localStorage.getItem('rewardAdData') || '{}');
        if (data.date !== today) return { date: today, count: 0 };
        return data;
    }

    showRewardAd() {
        this.playSound('click');

        // Check daily limit
        const adData = this.getRewardAdData();
        if (adData.count >= 10) {
            this.showToast('오늘의 광고 보상 한도(10회)에 도달했습니다.');
            return;
        }

        // Show reward timer overlay (5 second countdown)
        this.showRewardTimer(() => {
            this.grantAdReward();
        });
    }

    /** Show a 5-second countdown timer overlay, then call onComplete */
    showRewardTimer(onComplete) {
        const overlay = document.getElementById('rewardTimerOverlay');
        const countEl = document.getElementById('rewardTimerCount');
        const progressEl = document.getElementById('rewardTimerProgress');
        if (!overlay) { onComplete(); return; }

        overlay.style.display = 'flex';
        let remaining = 5;
        countEl.textContent = remaining;
        progressEl.style.width = '0%';

        const interval = setInterval(() => {
            remaining--;
            countEl.textContent = remaining;
            progressEl.style.width = ((5 - remaining) / 5 * 100) + '%';

            if (remaining <= 0) {
                clearInterval(interval);
                overlay.style.display = 'none';
                onComplete();
            }
        }, 1000);
    }

    grantAdReward() {
        this.userGold += 500;

        // Update daily counter
        const adData = this.getRewardAdData();
        adData.count++;
        localStorage.setItem('rewardAdData', JSON.stringify(adData));

        this.saveCollection();
        this.updateStats();
        this.updateWatchAdButton();
        this.showToast(`✅ 보상 500G 획득! (오늘 ${adData.count}/10)`);
        this.playSound('achievement');

        // Track & update challenges
        trackEvent('ad_reward_watched', 'reward_500g', 500);
        this.updateChallengeProgress('ad_watch', 1);
    }

    // ===== Watch Ad to Open Pack =====

    updateWatchAdButton() {
        if (this.els.watchAdOpenBtn) {
            const effectivePrice = this.activeEvents && this.activeEvents.length > 0 ? this.getEffectivePrice() : CARD_SET.price;
            const needsGold = this.userGold < effectivePrice;
            const adData = this.getRewardAdData();
            const canWatchAd = adData.count < 10;
            this.els.watchAdOpenBtn.style.display = (needsGold && canWatchAd) ? 'block' : 'none';
        }
    }

    watchAdAndOpenPack() {
        this.playSound('click');
        const adData = this.getRewardAdData();
        if (adData.count >= 10) {
            this.showToast('오늘의 광고 한도에 도달했습니다.');
            return;
        }

        const packPrice = this.activeEvents && this.activeEvents.length > 0 ? this.getEffectivePrice() : CARD_SET.price;

        this.showRewardTimer(() => {
            adData.count++;
            localStorage.setItem('rewardAdData', JSON.stringify(adData));
            trackEvent('ad_reward_watched', 'free_pack', 1);
            this.updateChallengeProgress('ad_watch', 1);
            this.userGold += packPrice;
            this.updateStats();
            this.startOpenPack();
        });
    }

    // ===== Multi-Pack Opening =====

    openMultiplePacks(count) {
        if (this.isOpening) return;

        const unitPrice = this.activeEvents && this.activeEvents.length > 0 ? this.getEffectivePrice() : CARD_SET.price;
        const price = unitPrice * count;
        if (this.userGold < price) {
            this.showToast(`💰 골드가 부족합니다! ${price.toLocaleString()}G 필요`);
            return;
        }

        this.isOpening = true;
        this.userGold -= price;
        this.playSound('packOpen');

        const allCards = [];
        let godPackCount = 0;

        for (let i = 0; i < count; i++) {
            const pack = this.gacha.openPack(this.pityCounter);

            if (pack.isGodPack) godPackCount++;

            const hasHighRare = pack.some(c => ['AR', 'SR', 'SAR', 'MUR'].includes(c.rarity));
            if (hasHighRare) {
                this.pityCounter = 0;
            } else {
                this.pityCounter++;
            }

            for (const card of pack) {
                allCards.push(card);
                this.addToCollection(card);
            }

            this.totalPacksOpened++;
        }

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
        const hasRR = allCards.some(c => ['RR', 'AR', 'SR', 'SAR', 'MUR'].includes(c.rarity));
        const hasSR = allCards.some(c => ['SR', 'SAR', 'MUR'].includes(c.rarity));
        if (hasRR) this.updateChallengeProgress('rarity_RR+', 1);
        if (hasSR) this.updateChallengeProgress('rarity_SR+', 1);

        this.showMultiPackResults(allCards, count, godPackCount);
        this.checkPackAchievements();

        this.isOpening = false;
    }

    showMultiPackResults(allCards, packCount, godPackCount) {
        const rarityOrder = { MUR: 7, SAR: 6, SR: 5, AR: 4, RR: 3, R: 2, U: 1, C: 0 };
        allCards.sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0));

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
        const displayOrder = ['MUR', 'SAR', 'SR', 'AR', 'RR', 'R', 'U', 'C'];
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

        let gridHtml = '';

        // High rarity cards always shown
        for (const card of highCards) {
            const info = RARITY_INFO[card.rarity];
            const imgUrl = getCardImageUrl(card.id, 400);
            gridHtml += `
                <div class="result-card" style="border-color:${info.color};" data-card-id="${card.id}">
                    <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(card.name)}" loading="lazy" onerror="this.style.display='none';this.parentElement.insertAdjacentHTML('beforeend','<div style=&quot;display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:2rem;color:#fff;background:rgba(0,0,0,0.3);border-radius:8px;&quot;>🎴</div>');">
                    <div class="mini-badge" style="background:${escapeHtml(info.color)};color:white;">${escapeHtml(info.label)}</div>
                </div>`;
        }

        // C/U toggle section
        let commonHtml = '';
        if (commonCards.length > 0) {
            commonHtml = `<div class="common-toggle-section">
                <button class="toggle-common-btn" id="toggleCommonBtn">C/U 카드 보기 (${commonCards.length}장) ▼</button>
                <div class="common-cards-grid" id="commonCardsGrid" style="display:none;">`;
            for (const card of commonCards) {
                const info = RARITY_INFO[card.rarity];
                const imgUrl = getCardImageUrl(card.id, 400);
                commonHtml += `
                    <div class="result-card" style="border-color:${info.color};" data-card-id="${card.id}">
                        <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(card.name)}" loading="lazy" onerror="this.style.display='none';this.parentElement.insertAdjacentHTML('beforeend','<div style=&quot;display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:2rem;color:#fff;background:rgba(0,0,0,0.3);border-radius:8px;&quot;>🎴</div>');">
                        <div class="mini-badge" style="background:${escapeHtml(info.color)};color:white;">${escapeHtml(info.label)}</div>
                    </div>`;
            }
            commonHtml += `</div></div>`;
        }

        this.els.packResults.style.display = 'block';
        this.els.packResults.innerHTML = summaryHtml;
        this.els.resultsGrid.innerHTML = gridHtml;
        this.els.packResults.appendChild(this.els.resultsGrid);

        if (commonCards.length > 0) {
            this.els.packResults.insertAdjacentHTML('beforeend', commonHtml);
            const toggleBtn = document.getElementById('toggleCommonBtn');
            const commonGrid = document.getElementById('commonCardsGrid');
            if (toggleBtn && commonGrid) {
                toggleBtn.addEventListener('click', () => {
                    const isHidden = commonGrid.style.display === 'none';
                    commonGrid.style.display = isHidden ? 'grid' : 'none';
                    toggleBtn.textContent = isHidden
                        ? `C/U 카드 숨기기 (${commonCards.length}장) ▲`
                        : `C/U 카드 보기 (${commonCards.length}장) ▼`;
                });
            }
        }

        // Bind card zoom for all result cards
        this.els.packResults.querySelectorAll('.result-card[data-card-id]').forEach(el => {
            el.addEventListener('click', () => {
                const id = parseInt(el.dataset.cardId);
                const card = allCards.find(c => c.id === id) || CARDS.find(c => c.id === id);
                if (card) this.showCardZoom(card);
            });
        });

        this.els.packResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        if (highRareCount > 0) {
            this.playSound('rareReveal');
        }
    }

    // ===== Event System =====

    checkActiveEvents() {
        this.activeEvents = EVENT_PACKS.filter(e => e.isActive());
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
                <span class="event-icon">${event.icon}</span>
                <div class="event-info">
                    <strong>${escapeHtml(event.nameKo || event.name)}</strong>
                    <span>${escapeHtml(event.description)}</span>
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
        this.updatePackUI();
        this.updateStats();
        this.renderCollection();
        this.showToast(`📦 ${CARD_SET.nameKo || CARD_SET.name} 선택!`);
    }

    updatePackUI() {
        const displayName = CARD_SET.nameKo || CARD_SET.name;
        if (this.els.packTitleText) {
            this.els.packTitleText.textContent = displayName;
        }

        // Use event-adjusted price
        const effectivePrice = this.activeEvents && this.activeEvents.length > 0
            ? this.getEffectivePrice()
            : CARD_SET.price;
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
        // Pack cover: real booster pack image
        if (this.els.packCoverImage) {
            this.els.packCoverImage.src = CARD_SET.packImage || '';
        }
        // Multi-pack prices (with event multiplier)
        const p = effectivePrice;
        if (this.els.price1) this.els.price1.textContent = p.toLocaleString();
        if (this.els.price10) this.els.price10.textContent = (p * 10).toLocaleString();
        if (this.els.price30) this.els.price30.textContent = (p * 30).toLocaleString();
    }

    // ===== Daily Challenge System =====

    initDailyChallenges() {
        const today = new Date().toISOString().split('T')[0];
        let challengeData = JSON.parse(localStorage.getItem('dailyChallenges') || '{}');

        // Reset if new day
        if (challengeData.date !== today) {
            // Pick 3 random challenges
            const shuffled = [...DAILY_CHALLENGES].sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, 3);
            challengeData = {
                date: today,
                challenges: selected.map(c => ({
                    ...c,
                    progress: 0,
                    completed: false,
                    claimed: false,
                }))
            };
            localStorage.setItem('dailyChallenges', JSON.stringify(challengeData));
        }

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
                        <span class="challenge-icon">${ch.icon}</span>
                        <div>
                            <div class="challenge-desc">${escapeHtml(ch.desc)}</div>
                            ${progressText ? `<div class="challenge-progress">${progressText}</div>` : ''}
                        </div>
                    </div>
                    <span class="challenge-reward">${done ? '✅ 완료' : `+${ch.reward.toLocaleString()}G`}</span>
                </div>
            `;
        }).join('');
    }

    updateChallengeProgress(type, amount) {
        if (!this.dailyChallenges || !this.dailyChallenges.challenges) return;
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
                this.showToast(`🎯 도전 완료! "${ch.desc}" → +${finalReward.toLocaleString()}G${bonusText}`);
                this.playSound('achievement');
                trackEvent('challenge_completed', ch.id, finalReward);
            }
            changed = true;
        }

        if (changed) {
            localStorage.setItem('dailyChallenges', JSON.stringify(this.dailyChallenges));
            this.renderDailyChallenges();
        }
    }

    // ===== Utilities =====

    closeAllModals() {
        this.els.cardRevealOverlay.classList.remove('active');
        this.els.cardZoomModal.classList.remove('active');
        this.els.godPackAlert.classList.remove('active');
        if (this.els.probModal) this.els.probModal.style.display = 'none';
        if (this.els.dailyBonusModal) this.els.dailyBonusModal.style.display = 'none';
        if (this.isOpening) this.skipToResults();
    }

    showToast(message) {
        this.els.toast.textContent = message;
        this.els.toast.classList.add('show');
        setTimeout(() => this.els.toast.classList.remove('show'), 2500);
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CardPackSimulator();
});
