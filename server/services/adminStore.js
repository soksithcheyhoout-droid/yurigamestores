import fs from 'node:fs';

import os from 'node:os';

import path from 'node:path';

import crypto from 'node:crypto';



// Store configuration file in OS temp directory (completely outside the repository)

// This guarantees that Vite's file watcher will never trigger a reload when admin updates settings!

const ADMIN_CONFIG_FILE = path.join(os.tmpdir(), 'yurigame_admin_config.json');



// Default initial games with full packages & fields

const DEFAULT_GAMES = [

  {

    id: 'robuxsend',

    slug: 'roblox',

    providerCode: 'robuxsend',

    name: 'Roblox',

    publisher: 'Roblox Corp',

    currency: 'Robux',

    stockOpen: true,

    banner: '/assets/games/roblox_hero_4k.jpg',

    image: '/assets/games/roblox_tile_4k.jpg',

    badge: 'Official Username',

    description: 'Instant Robux delivery to your Roblox account by username. Safe and verified.',

    fields: [

      { key: 'userId', label: 'Roblox Username', placeholder: 'e.g. Ucantusemeee', type: 'text', required: true }

    ],

    packages: [

      { id: 'rblx_10', code: '10', name: '10 Robux', diamonds: 10, price: 0.10, bonus: 'Instant 5s', popular: false, inStock: true, image: '' },

      { id: 'rblx_20', code: '20', name: '20 Robux', diamonds: 20, price: 0.19, bonus: '+5% Value', popular: false, inStock: true, image: '' },

      { id: 'rblx_50', code: '50', name: '50 Robux', diamonds: 50, price: 0.45, bonus: 'Popular', popular: false, inStock: true, image: '' },

      { id: 'rblx_80', code: '80', name: '80 Robux', diamonds: 80, price: 0.74, bonus: 'Best Value', popular: true, inStock: true, image: '' },

      { id: 'rblx_100', code: '100', name: '100 Robux', diamonds: 100, price: 0.89, bonus: 'Hot Pack', popular: true, inStock: true, image: '' },

      { id: 'rblx_200', code: '200', name: '200 Robux', diamonds: 200, price: 1.78, bonus: 'Bonus Value', popular: false, inStock: true, image: '' },

      { id: 'rblx_400', code: '400', name: '400 Robux', diamonds: 400, price: 3.55, bonus: 'Best Seller', popular: true, inStock: true, image: '' },

      { id: 'rblx_800', code: '800', name: '800 Robux', diamonds: 800, price: 6.99, bonus: '+50 Bonus', popular: true, inStock: true, image: '' },

      { id: 'rblx_1000', code: '1000', name: '1,000 Robux', diamonds: 1000, price: 8.75, bonus: 'VIP Pack', popular: false, inStock: true, image: '' },

      { id: 'rblx_2000', code: '2000', name: '2,000 Robux', diamonds: 2000, price: 17.50, bonus: 'Mega Pack', popular: true, inStock: true, image: '' }

    ]

  },

  {

    id: 'ml',

    slug: 'mobile-legends',

    providerCode: 'ml',

    name: 'Mobile Legends: Bang Bang',

    publisher: 'Moonton',

    currency: 'Diamonds',

    stockOpen: true,

    banner: '/assets/games/mlbb_hero_4k.jpg',

    image: '/assets/games/mlbb_tile_4k.jpg',

    badge: '5s Moonton Sync',

    description: 'Mobile Legends official direct diamond top-up. Enter your User ID and Zone ID.',

    fields: [

      { key: 'userId', label: 'User ID', placeholder: 'e.g. 29481903', type: 'text', required: true },

      { key: 'zoneId', label: 'Zone ID / Server ID', placeholder: 'e.g. 2042', type: 'text', required: true }

    ],

    packages: [

      { id: 'ml_weekly', code: 'weekly', name: 'Weekly Diamond Pass', diamonds: 210, price: 1.81, bonus: 'Save 60%', popular: true, inStock: true, image: '' },

      { id: 'ml_55', code: '55', name: '55 Diamonds', diamonds: 55, price: 0.77, bonus: 'Fast Delivery', popular: false, inStock: true, image: '' },

      { id: 'ml_86', code: '86', name: '86 Diamonds', diamonds: 86, price: 1.25, bonus: '+9 Bonus', popular: false, inStock: true, image: '' },

      { id: 'ml_172', code: '172', name: '172 Diamonds', diamonds: 172, price: 2.45, bonus: '+16 Bonus', popular: false, inStock: true, image: '' },

      { id: 'ml_257', code: '257', name: '257 Diamonds', diamonds: 257, price: 3.65, bonus: '+27 Bonus', popular: true, inStock: true, image: '' },

      { id: 'ml_343', code: '343', name: '343 Diamonds', diamonds: 343, price: 4.85, bonus: '+37 Bonus', popular: false, inStock: true, image: '' },

      { id: 'ml_706', code: '706', name: '706 Diamonds', diamonds: 706, price: 9.80, bonus: '+88 Bonus', popular: true, inStock: true, image: '' },

      { id: 'ml_2195', code: '2195', name: '2,195 Diamonds', diamonds: 2195, price: 30.50, bonus: '+320 Bonus', popular: true, inStock: true, image: '' },

      { id: 'ml_3688', code: '3688', name: '3,688 Diamonds', diamonds: 3688, price: 50.80, bonus: '+550 Bonus', popular: false, inStock: true, image: '' },

      { id: 'ml_5532', code: '5532', name: '5,532 Diamonds', diamonds: 5532, price: 76.50, bonus: '+800 Bonus', popular: true, inStock: true, image: '' }

    ]

  },

  {

    id: 'ff',

    slug: 'free-fire',

    providerCode: 'ff',

    name: 'Free Fire',

    publisher: 'Garena',

    currency: 'Diamonds',

    stockOpen: true,

    banner: '/assets/games/freefire_hero_4k.jpg',

    image: '/assets/games/freefire_tile_4k.jpg',

    badge: 'Official Garena UID',

    description: 'Free Fire diamonds top-up. Enter your Player ID for instant automated delivery.',

    fields: [

      { key: 'userId', label: 'Player ID', placeholder: 'Enter Free Fire Player ID (e.g. 10000001)', type: 'text', required: true }

    ],

    packages: [

      { id: 'ff_25', code: '25', name: '25 Diamonds', diamonds: 25, price: 0.25, bonus: 'Starter Pack', popular: false, inStock: true, image: '' },

      { id: 'ff_50', code: '50', name: '50 Diamonds', diamonds: 50, price: 0.48, bonus: '+5 Bonus', popular: false, inStock: true, image: '' },

      { id: 'ff_100', code: '100', name: '100 Diamonds', diamonds: 100, price: 0.88, bonus: '+10 Bonus', popular: false, inStock: true, image: '' },

      { id: 'ff_weekly', code: 'weekly', name: 'Weekly Membership', diamonds: 450, price: 1.80, bonus: '450 Total', popular: true, inStock: true, image: '' },

      { id: 'ff_310', code: '310', name: '310 Diamonds', diamonds: 310, price: 2.65, bonus: '+31 Bonus', popular: false, inStock: true, image: '' },

      { id: 'ff_520', code: '520', name: '520 Diamonds', diamonds: 520, price: 4.40, bonus: '+52 Bonus', popular: true, inStock: true, image: '' },

      { id: 'ff_monthly', code: 'monthly', name: 'Monthly Membership', diamonds: 2600, price: 7.20, bonus: '2600 Total', popular: true, inStock: true, image: '' },

      { id: 'ff_1060', code: '1060', name: '1,060 Diamonds', diamonds: 1060, price: 8.75, bonus: '+106 Bonus', popular: true, inStock: true, image: '' },

      { id: 'ff_2180', code: '2180', name: '2,180 Diamonds', diamonds: 2180, price: 17.80, bonus: '+218 Bonus', popular: false, inStock: true, image: '' },

      { id: 'ff_5600', code: '5600', name: '5,600 Diamonds', diamonds: 5600, price: 44.50, bonus: '+560 Bonus', popular: true, inStock: true, image: '' }

    ]

  },

  {

    id: 'roslegacy',

    slug: 'ros-legacy',

    providerCode: 'roslegacy',

    name: 'RoS Legacy',

    publisher: 'RoS Legacy',

    currency: 'Diamonds',

    stockOpen: true,

    banner: '/assets/brand/yurigame-logo.webp',

    image: '/assets/brand/yurigame-logo.webp',

    badge: 'Official Top-Up',

    description: 'RoS Legacy top-up. Enter your Username or Gmail and Password so admin can deliver your diamonds.',

    fields: [

      { key: 'account', label: 'Username or Gmail', placeholder: 'e.g. PlayerName or player@gmail.com', type: 'text', required: true },

      { key: 'password', label: 'RoS Account Password', placeholder: 'Enter your RoS password', type: 'password', required: true }

    ],

    packages: [

      { id: 'ros_200', code: '200', name: '200 Diamonds', diamonds: 200, price: 4.00, bonus: 'Fast Delivery', popular: false, inStock: true, image: '' },

      { id: 'ros_300', code: '300', name: '300 Diamonds', diamonds: 300, price: 6.00, bonus: 'Direct Top-Up', popular: false, inStock: true, image: '' },

      { id: 'ros_400', code: '400', name: '400 Diamonds', diamonds: 400, price: 7.20, bonus: 'Value Pack', popular: false, inStock: true, image: '' },

      { id: 'ros_500', code: '500', name: '500 Diamonds', diamonds: 500, price: 8.88, bonus: 'Hot Pack', popular: true, inStock: true, image: '' },

      { id: 'ros_1000', code: '1000', name: '1,000 Diamonds', diamonds: 1000, price: 18.00, bonus: 'Best Value', popular: true, inStock: true, image: '' },

      { id: 'ros_1500', code: '1500', name: '1,500 Diamonds', diamonds: 1500, price: 26.00, bonus: 'Super Value', popular: true, inStock: true, image: '' },

      { id: 'ros_2000', code: '2000', name: '2,000 Diamonds', diamonds: 2000, price: 36.00, bonus: 'VIP Mega Pack', popular: true, inStock: true, image: '' }

    ]

  }

];



// Default MLBB Event Categories (Weekly Event, Mega Event, etc.)

const DEFAULT_MLBB_EVENTS = [

  {

    id: 'mlbb_weekly_event',

    name: 'Weekly Diamond Pass Event',

    badge: 'Special Weekly Event',

    banner: '/assets/games/mlbb_hero_4k.jpg',

    isOpen: true, // Admin can open/close this category

    description: 'Special Weekly Pass & Bonus Diamonds Event with direct Moonton sync.',

    packages: [

      {

        id: 'mle_pass_1',

        code: 'mle_weekly_1',

        name: 'Weekly Diamond Pass (Special Event)',

        diamonds: 220,

        price: 1.80,

        bonus: '🔥 60% OFF',

        popular: true,

        inStock: true,

        image: '/assets/games/mlbb_tile_4k.jpg'

      },

      {

        id: 'mle_pass_2',

        code: 'mle_weekly_2',

        name: 'Weekly Pass x2 Bundle (Event)',

        diamonds: 440,

        price: 3.55,

        bonus: 'Double Value',

        popular: true,

        inStock: true,

        image: '/assets/games/mlbb_tile_4k.jpg'

      }

    ]

  },

  {

    id: 'mlbb_mega_event',

    name: 'Mega Diamonds Promo Event',

    badge: 'Limited Time Event',

    banner: '/assets/games/mlbb_hero_4k.jpg',

    isOpen: true,

    description: 'Exclusive Mega Diamond event packages with extra bonus diamonds.',

    packages: [

      {

        id: 'mle_mega_300',

        code: 'mle_mega_300',

        name: '300 + 45 Bonus Diamonds (Mega Event)',

        diamonds: 345,

        price: 4.20,

        bonus: '+45 FREE',

        popular: true,

        inStock: true,

        image: '/assets/games/mlbb_tile_4k.jpg'

      },

      {

        id: 'mle_mega_1000',

        code: 'mle_mega_1000',

        name: '1,000 + 150 Bonus Diamonds (Mega Event)',

        diamonds: 1150,

        price: 13.99,

        bonus: 'Super Bonus',

        popular: true,

        inStock: true,

        image: '/assets/games/mlbb_tile_4k.jpg'

      }

    ]

  }

];



// Default Contact & Support Settings

export function normalizeTelegramUrl(input, fallbackUsername = 'Yur1Uchiha') {
  if (!input) return `https://t.me/${fallbackUsername.replace(/^@/, '')}`;
  let str = String(input).trim();
  if (str.startsWith('https://t.me/') || str.startsWith('http://t.me/')) return str;
  if (str.startsWith('t.me/')) return `https://${str}`;
  if (str.startsWith('@')) return `https://t.me/${str.slice(1)}`;
  if (/^[a-zA-Z0-9_]{3,}$/.test(str)) return `https://t.me/${str}`;
  return str;
}

export function normalizeTelegramUsername(input, fallback = '@Yur1Uchiha') {
  if (!input) return fallback;
  let str = String(input).trim();
  if (str.startsWith('https://t.me/')) str = str.replace('https://t.me/', '');
  if (str.startsWith('http://t.me/')) str = str.replace('http://t.me/', '');
  if (str.startsWith('t.me/')) str = str.replace('t.me/', '');
  str = str.replace(/[^a-zA-Z0-9_]/g, '');
  return str ? `@${str}` : fallback;
}

const DEFAULT_CONTACTS = {
  telegramUrl: 'https://t.me/Yur1Uchiha',
  telegramUsername: '@Yur1Uchiha',
  facebookUrl: 'https://facebook.com/yurigamestore',
  supportPhone: '+855 12 345 678',
  supportHours: '24/7 Fast & Friendly Live Support',
  announcement: 'Welcome to YuriGame Store! Direct instant game credits delivered 24/7.',
  telegramAdmin1Id: '6805487598',
  telegramAdmin1Name: '@Yur1Uchiha',
  telegramAdmin2Id: '7283817695',
  telegramAdmin2Name: '@kaixite',
  telegramGroupId: '-1004493408552',
  telegramBotToken: ''
};



// Default Slide Banners for Hero / Promotions

const DEFAULT_BANNERS = [

  {

    id: 'banner_mlbb',

    title: 'Mobile Legends: Bang Bang Live Top-Up',

    subtitle: 'Weekly Diamond Pass Offer with Moonton Direct Sync',

    actionLabel: 'Open MLBB Packages',

    image: '/assets/banners/banner_mlbb.jpg',

    gameSlug: 'mobile-legends',

    active: true

  },

  {

    id: 'banner_roblox',

    title: 'Roblox Robux Instant Delivery',

    subtitle: 'Official Username Verification & Fast Manual Robux Credit',

    actionLabel: 'Open Roblox Packages',

    image: '/assets/games/roblox_hero_4k.jpg',

    gameSlug: 'roblox',

    active: true

  },

  {

    id: 'banner_ff',

    title: 'Garena Free Fire Diamonds',

    subtitle: 'Instant Automated Player UID Diamonds Top-Up',

    actionLabel: 'Open Free Fire Packages',

    image: '/assets/banners/banner_freefire.jpg',

    gameSlug: 'free-fire',

    active: true

  },

  {

    id: 'banner_ros',

    title: 'RoS Legacy Official Direct Diamonds',

    subtitle: 'Safe Username or Gmail Top-Up with Guaranteed Admin Delivery',

    actionLabel: 'Open RoS Legacy Packages',

    image: '/assets/brand/yurigame-logo.webp',

    gameSlug: 'ros-legacy',

    active: true

  }

];



// Master in-memory configuration with disk persistence

let adminConfig = {

  games: DEFAULT_GAMES,

  mlbbEvents: DEFAULT_MLBB_EVENTS,

  contacts: DEFAULT_CONTACTS,

  banners: DEFAULT_BANNERS,

  updatedAt: new Date().toISOString()

};



// Valid active admin tokens (token => { createdAt, expiresAt })

const activeAdminTokens = new Map();



// 2FA Admin Challenge & Session Stores

const stagedAdminChallenges = new Map();

const activeAdminSessions = new Map();




// Load persisted config from disk (outside repo)

export function loadAdminConfig() {

  try {

    if (fs.existsSync(ADMIN_CONFIG_FILE)) {

      const raw = fs.readFileSync(ADMIN_CONFIG_FILE, 'utf-8');

      const loaded = JSON.parse(raw);

      if (loaded && Array.isArray(loaded.games)) {

        // Merge with defaults to ensure all 4 default games are strictly present

        const gamesMerged = DEFAULT_GAMES.map((defGame) => {

          const found = loaded.games.find((g) => g.id === defGame.id || g.slug === defGame.slug);

          if (!found) return defGame;

          return {

            ...defGame,

            ...found,

            fields: defGame.fields, // enforce correct fields for RoS & Roblox

            packages: Array.isArray(found.packages) && found.packages.length > 0 ? found.packages : defGame.packages

          };

        });



        adminConfig = {

          games: gamesMerged,

          mlbbEvents: Array.isArray(loaded.mlbbEvents) ? loaded.mlbbEvents : DEFAULT_MLBB_EVENTS,

          contacts: (() => {
            const raw = { ...DEFAULT_CONTACTS, ...(loaded.contacts || {}), telegramBotToken: '' };
            const uName = normalizeTelegramUsername(raw.telegramUsername || '@Yur1Uchiha');
            return {
              ...raw,
              telegramUsername: uName,
              telegramUrl: normalizeTelegramUrl(raw.telegramUrl, uName),
              telegramAdmin1Name: normalizeTelegramUsername(raw.telegramAdmin1Name || '@Yur1Uchiha'),
              telegramAdmin2Name: normalizeTelegramUsername(raw.telegramAdmin2Name || '@kaixite'),
            };
          })(),

          banners: Array.isArray(loaded.banners) ? loaded.banners : DEFAULT_BANNERS,

          updatedAt: loaded.updatedAt || new Date().toISOString()

        };

        // Rewrite legacy persisted config without server credentials.
        saveAdminConfig();
        return adminConfig;

      }

    }

  } catch (err) {

    console.warn('[Admin Store] Could not load persisted admin config:', err.message);

  }



  saveAdminConfig();

  return adminConfig;

}



// Persist config to disk

export function saveAdminConfig() {

  try {

    adminConfig.updatedAt = new Date().toISOString();

    const persistedConfig = {
      ...adminConfig,
      contacts: {
        ...(adminConfig.contacts || {}),
        telegramBotToken: '',
      },
    };
    fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify(persistedConfig, null, 2), 'utf-8');

  } catch (err) {

    console.warn('[Admin Store] Could not write admin config:', err.message);

  }

}



// Generate single-click URL token for Telegram /admin command

export function generateAdminToken(adminUserId = '') {

  const token = crypto.randomBytes(24).toString('hex');

  const expiresAt = Date.now() + 10 * 60 * 1000; // one-click links expire after 10 minutes

  activeAdminTokens.set(token, {

    adminUserId: String(adminUserId || ''),

    createdAt: Date.now(),

    expiresAt

  });

  return token;

}



// Verify admin token

export function verifyAdminToken(token) {

  if (!token) return false;

  const entry = activeAdminTokens.get(token);

  if (!entry) return false;

  if (Date.now() > entry.expiresAt) {

    activeAdminTokens.delete(token);

    return false;

  }

  return true;

}



function createClientFingerprint(clientIp = '', userAgent = '') {
  return crypto
    .createHash('sha256')
    .update(`${String(clientIp || 'unknown').trim()}|${String(userAgent || '').slice(0, 300)}`)
    .digest('hex');
}

export function consumeAdminToken(token) {
  if (!verifyAdminToken(token)) return null;
  const cleanToken = String(token).trim();
  const entry = activeAdminTokens.get(cleanToken) || null;
  activeAdminTokens.delete(cleanToken);
  return entry;
}

export function createAdminSession(clientIp = '', userAgent = '', adminId = 'admin_master') {
  const now = Date.now();
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = now + 12 * 60 * 60 * 1000;
  activeAdminSessions.set(sessionToken, {
    adminId: String(adminId || 'admin_master'),
    createdAt: now,
    expiresAt,
    clientFingerprint: createClientFingerprint(clientIp, userAgent),
  });
  return { token: sessionToken, expiresAt };
}

// Step 1: issue a Telegram possession challenge. No reusable PIN enters browser JavaScript.
export async function requestAdminOtp(clientIp = '', userAgent = '', sendOtpFn = null) {
  const ipKey = String(clientIp || 'unknown').trim();
  const now = Date.now();
  const clientFingerprint = createClientFingerprint(ipKey, userAgent);

  // Keep the challenge store bounded and invalidate older challenges for this browser context.
  for (const [key, entry] of stagedAdminChallenges) {
    if (entry.expiresAt <= now || entry.clientFingerprint === clientFingerprint) {
      stagedAdminChallenges.delete(key);
    }
  }
  while (stagedAdminChallenges.size >= 10_000) {
    stagedAdminChallenges.delete(stagedAdminChallenges.keys().next().value);
  }

  const otp = crypto.randomInt(100000, 1_000_000).toString();
  const challengeId = crypto.randomBytes(32).toString('hex');
  const otpHashed = crypto.createHash('sha256').update(`${challengeId}:${otp}`).digest('hex');

  stagedAdminChallenges.set(challengeId, {
    otpHashed,
    attempts: 0,
    createdAt: now,
    expiresAt: now + 5 * 60 * 1000,
    clientFingerprint,
  });

  if (typeof sendOtpFn !== 'function') {
    stagedAdminChallenges.delete(challengeId);
    throw new Error('Telegram verification delivery is unavailable.');
  }

  try {
    await sendOtpFn(otp, ipKey, userAgent);
  } catch (err) {
    console.error('[Admin 2FA] Failed to send Telegram OTP:', err.message);
    stagedAdminChallenges.delete(challengeId);
    throw new Error('Could not send verification code to Telegram. Please check Telegram bot connectivity.');
  }

  return {
    challengeId,
    expiresInSeconds: 300,
  };
}



// 2FA Step 2: Verify Telegram OTP and issue signed session token

export function verifyAdminOtp(challengeId, otp, clientIp = '', userAgent = '') {

  if (!challengeId || !otp) {

    throw new Error('Challenge session ID and 6-digit verification code are required.');

  }



  const cleanChallenge = String(challengeId).trim();

  const cleanOtp = String(otp).trim();

  const now = Date.now();



  const entry = stagedAdminChallenges.get(cleanChallenge);

  if (!entry) {

    throw new Error('Verification session not found or already used. Please request a new code.');

  }

  const clientFingerprint = createClientFingerprint(clientIp, userAgent);
  if (entry.clientFingerprint !== clientFingerprint) {
    stagedAdminChallenges.delete(cleanChallenge);
    throw new Error('Verification session does not match this browser or network. Request a new code.');
  }



  if (now > entry.expiresAt) {

    stagedAdminChallenges.delete(cleanChallenge);

    throw new Error('Verification code has expired. Please request a new code.');

  }



  entry.attempts += 1;

  if (entry.attempts > 3) {

    stagedAdminChallenges.delete(cleanChallenge);

    throw new Error('Maximum verification attempts exceeded. Please login again.');

  }



  const expectedHash = entry.otpHashed;

  const actualHash = crypto.createHash('sha256').update(`${cleanChallenge}:${cleanOtp}`).digest('hex');



  // Constant-time comparison

  const match = crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(actualHash));

  if (!match) {

    throw new Error(`Incorrect verification code. ${3 - entry.attempts} attempt(s) remaining.`);

  }



  // Successfully verified: burn challenge ticket (anti-replay)

  stagedAdminChallenges.delete(cleanChallenge);



  return createAdminSession(clientIp, userAgent, 'admin_master');

}



// 2FA Step 3: Resend OTP (with 45s cooldown)

export async function resendAdminOtp(challengeId, clientIp = '', userAgent = '', sendOtpFn = null) {

  const cleanChallenge = String(challengeId || '').trim();

  const entry = stagedAdminChallenges.get(cleanChallenge);

  const now = Date.now();



  if (!entry || now > entry.expiresAt) {

    throw new Error('Verification session has expired. Please request a new code.');

  }

  if (entry.clientFingerprint !== createClientFingerprint(clientIp, userAgent)) {
    stagedAdminChallenges.delete(cleanChallenge);
    throw new Error('Verification session does not match this browser or network. Request a new code.');
  }



  // 45 seconds cooldown

  if (now - entry.createdAt < 45 * 1000) {

    const waitSec = Math.ceil((45 * 1000 - (now - entry.createdAt)) / 1000);

    throw new Error(`Please wait ${waitSec} second(s) before requesting another code.`);

  }



  const otp = crypto.randomInt(100000, 1_000_000).toString();

  entry.otpHashed = crypto.createHash('sha256').update(`${cleanChallenge}:${otp}`).digest('hex');

  entry.createdAt = now;

  entry.expiresAt = now + 5 * 60 * 1000;

  entry.attempts = 0;



  if (typeof sendOtpFn === 'function') {

    await sendOtpFn(otp, clientIp, userAgent);

  }



  return { success: true, expiresInSeconds: 300 };

}



// Verify active admin session

export function verifyAdminSession(token, clientIp = '', userAgent = '') {

  if (!token) return false;

  const cleanToken = String(token).trim();

  const entry = activeAdminSessions.get(cleanToken);

  if (!entry) return false;

  if (Date.now() > entry.expiresAt) {

    activeAdminSessions.delete(cleanToken);

    return false;

  }

  const clientFingerprint = createClientFingerprint(clientIp, userAgent);
  if (!entry.clientFingerprint || entry.clientFingerprint !== clientFingerprint) {
    activeAdminSessions.delete(cleanToken);
    return false;
  }

  return true;

}



// Revoke admin session

export function revokeAdminSession(token) {

  if (token) activeAdminSessions.delete(String(token).trim());

}



function stripInternalPackageFields(pkg = {}) {
  const publicPackage = { ...pkg };
  delete publicPackage.providerName;
  delete publicPackage.providerPrice;
  delete publicPackage.providerSyncedAt;
  return publicPackage;
}

function getPublicContacts() {
  const contacts = adminConfig.contacts || {};
  return {
    telegramUrl: contacts.telegramUrl || '',
    telegramUsername: contacts.telegramUsername || '',
    facebookUrl: contacts.facebookUrl || '',
    supportPhone: contacts.supportPhone || '',
    supportHours: contacts.supportHours || '',
    announcement: contacts.announcement || '',
  };
}

// Get clean configuration for public storefront.
export function getPublicSiteConfig() {
  return {
    games: adminConfig.games.map((game) => ({
      ...game,
      packages: (game.packages || [])
        .filter((pkg) => pkg.inStock !== false)
        .map(stripInternalPackageFields),
    })),
    mlbbEvents: (adminConfig.mlbbEvents || [])
      .filter((event) => event.isOpen === true)
      .map((event) => ({
        ...event,
        packages: (event.packages || [])
          .filter((pkg) => pkg.inStock !== false)
          .map(stripInternalPackageFields),
      })),
    contacts: getPublicContacts(),
    banners: (adminConfig.banners || []).filter((banner) => banner.active !== false),
  };
}

// Protected dashboard configuration. Server credentials never enter browser JavaScript.
export function getAdminClientConfig() {
  const safeContacts = { ...(adminConfig.contacts || {}) };
  delete safeContacts.telegramBotToken;
  return {
    ...adminConfig,
    contacts: {
      ...safeContacts,
      telegramBotConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    },
  };
}

// Full server-only admin configuration.
export function getAdminFullConfig() {
  return adminConfig;
}



// Game Stock & Logo Update

export function updateGameConfig(gameId, updateData = {}) {

  const idx = adminConfig.games.findIndex((g) => g.id === gameId || g.slug === gameId || g.providerCode === gameId);

  if (idx === -1) return null;



  const current = adminConfig.games[idx];

  adminConfig.games[idx] = {

    ...current,

    name: updateData.name || current.name,

    image: updateData.image || current.image,

    banner: updateData.banner || current.banner,

    badge: updateData.badge || current.badge,

    stockOpen: typeof updateData.stockOpen === 'boolean' ? updateData.stockOpen : current.stockOpen

  };

  saveAdminConfig();

  return adminConfig.games[idx];

}



// Add Package to Game

export function addPackageToGame(gameId, pkgData = {}) {

  const game = adminConfig.games.find((g) => g.id === gameId || g.slug === gameId || g.providerCode === gameId);

  if (!game) return null;



  const newPkg = {

    id: pkgData.id || `${game.id}_${Date.now()}`,

    code: String(pkgData.code || pkgData.providerCode || pkgData.diamonds || Date.now()),

    providerCode: String(pkgData.providerCode || pkgData.code || '').trim(),

    providerName: String(pkgData.providerName || '').trim(),

    providerPrice: Number.isFinite(Number(pkgData.providerPrice)) ? Number(pkgData.providerPrice) : null,

    providerConnected: Boolean(pkgData.providerConnected && (pkgData.providerCode || pkgData.code)),

    providerSyncedAt: pkgData.providerSyncedAt || null,

    name: pkgData.name || `${pkgData.diamonds || '100'} ${game.currency}`,

    diamonds: Number(pkgData.diamonds || 0),

    price: Number(pkgData.price || 1.0),

    bonus: pkgData.bonus || '',

    popular: Boolean(pkgData.popular),

    inStock: pkgData.inStock !== false,

    image: pkgData.image || ''

  };



  game.packages.push(newPkg);

  saveAdminConfig();

  return newPkg;

}



// Update Package in Game

export function updatePackageInGame(gameId, pkgId, updateData = {}) {

  const game = adminConfig.games.find((g) => g.id === gameId || g.slug === gameId || g.providerCode === gameId);

  if (!game) return null;



  const pkgIdx = game.packages.findIndex((p) => p.id === pkgId || p.code === pkgId);

  if (pkgIdx === -1) return null;



  const current = game.packages[pkgIdx];

  game.packages[pkgIdx] = {

    ...current,

    code: updateData.code !== undefined ? String(updateData.code).trim() : current.code,

    providerCode: updateData.providerCode !== undefined ? String(updateData.providerCode).trim() : (current.providerCode || ''),

    providerName: updateData.providerName !== undefined ? String(updateData.providerName).trim() : (current.providerName || ''),

    providerPrice: updateData.providerPrice !== undefined && Number.isFinite(Number(updateData.providerPrice))
      ? Number(updateData.providerPrice)
      : (current.providerPrice ?? null),

    providerConnected: updateData.providerConnected !== undefined
      ? Boolean(updateData.providerConnected)
      : Boolean(current.providerConnected),

    providerSyncedAt: updateData.providerSyncedAt !== undefined ? updateData.providerSyncedAt : (current.providerSyncedAt || null),

    name: updateData.name || current.name,

    diamonds: updateData.diamonds !== undefined ? Number(updateData.diamonds) : current.diamonds,

    price: updateData.price !== undefined ? Number(updateData.price) : current.price,

    bonus: updateData.bonus !== undefined ? updateData.bonus : current.bonus,

    popular: updateData.popular !== undefined ? Boolean(updateData.popular) : current.popular,

    inStock: updateData.inStock !== undefined ? Boolean(updateData.inStock) : current.inStock,

    image: updateData.image !== undefined ? updateData.image : current.image

  };



  saveAdminConfig();

  return game.packages[pkgIdx];

}



// Delete Package from Game

export function deletePackageFromGame(gameId, pkgId) {

  const game = adminConfig.games.find((g) => g.id === gameId || g.slug === gameId || g.providerCode === gameId);

  if (!game) return false;



  const lenBefore = game.packages.length;

  game.packages = game.packages.filter((p) => p.id !== pkgId && p.code !== pkgId);

  saveAdminConfig();

  return game.packages.length < lenBefore;

}



// MLBB Event Categories Management

export function addMlbbEvent(eventData = {}) {

  const newEvent = {

    id: eventData.id || `mlbb_event_${Date.now()}`,

    name: eventData.name || 'New Special Event',

    badge: eventData.badge || 'Event',

    banner: eventData.banner || '/assets/games/mlbb_hero_4k.jpg',

    isOpen: eventData.isOpen !== false,

    description: eventData.description || 'Special diamonds event.',

    packages: Array.isArray(eventData.packages) ? eventData.packages : []

  };



  adminConfig.mlbbEvents.push(newEvent);

  saveAdminConfig();

  return newEvent;

}



export function updateMlbbEvent(eventId, updateData = {}) {

  const idx = adminConfig.mlbbEvents.findIndex((e) => e.id === eventId);

  if (idx === -1) return null;



  const current = adminConfig.mlbbEvents[idx];

  adminConfig.mlbbEvents[idx] = {

    ...current,

    name: updateData.name || current.name,

    badge: updateData.badge || current.badge,

    banner: updateData.banner || current.banner,

    description: updateData.description !== undefined ? updateData.description : current.description,

    isOpen: typeof updateData.isOpen === 'boolean' ? updateData.isOpen : current.isOpen

  };



  saveAdminConfig();

  return adminConfig.mlbbEvents[idx];

}



export function deleteMlbbEvent(eventId) {

  const lenBefore = adminConfig.mlbbEvents.length;

  adminConfig.mlbbEvents = adminConfig.mlbbEvents.filter((e) => e.id !== eventId);

  saveAdminConfig();

  return adminConfig.mlbbEvents.length < lenBefore;

}



export function addPackageToMlbbEvent(eventId, pkgData = {}) {

  const event = adminConfig.mlbbEvents.find((e) => e.id === eventId);

  if (!event) return null;



  const newPkg = {

    id: pkgData.id || `mle_${Date.now()}`,

    code: String(pkgData.code || pkgData.providerCode || pkgData.diamonds || Date.now()),

    providerCode: String(pkgData.providerCode || pkgData.code || '').trim(),

    providerName: String(pkgData.providerName || '').trim(),

    providerPrice: Number.isFinite(Number(pkgData.providerPrice)) ? Number(pkgData.providerPrice) : null,

    providerConnected: Boolean(pkgData.providerConnected && (pkgData.providerCode || pkgData.code)),

    providerSyncedAt: pkgData.providerSyncedAt || null,

    name: pkgData.name || `${pkgData.diamonds || '100'} Diamonds (Event)`,

    diamonds: Number(pkgData.diamonds || 0),

    price: Number(pkgData.price || 1.0),

    bonus: pkgData.bonus || '',

    popular: Boolean(pkgData.popular),

    inStock: pkgData.inStock !== false,

    image: pkgData.image || '/assets/games/mlbb_tile_4k.jpg'

  };



  event.packages.push(newPkg);

  saveAdminConfig();

  return newPkg;

}



export function updatePackageInMlbbEvent(eventId, pkgId, updateData = {}) {

  const event = adminConfig.mlbbEvents.find((e) => e.id === eventId);

  if (!event) return null;



  const pkgIdx = event.packages.findIndex((p) => p.id === pkgId || p.code === pkgId);

  if (pkgIdx === -1) return null;



  const current = event.packages[pkgIdx];

  event.packages[pkgIdx] = {

    ...current,

    code: updateData.code !== undefined ? String(updateData.code).trim() : current.code,

    providerCode: updateData.providerCode !== undefined ? String(updateData.providerCode).trim() : (current.providerCode || ''),

    providerName: updateData.providerName !== undefined ? String(updateData.providerName).trim() : (current.providerName || ''),

    providerPrice: updateData.providerPrice !== undefined && Number.isFinite(Number(updateData.providerPrice))
      ? Number(updateData.providerPrice)
      : (current.providerPrice ?? null),

    providerConnected: updateData.providerConnected !== undefined
      ? Boolean(updateData.providerConnected)
      : Boolean(current.providerConnected),

    providerSyncedAt: updateData.providerSyncedAt !== undefined ? updateData.providerSyncedAt : (current.providerSyncedAt || null),

    name: updateData.name || current.name,

    diamonds: updateData.diamonds !== undefined ? Number(updateData.diamonds) : current.diamonds,

    price: updateData.price !== undefined ? Number(updateData.price) : current.price,

    bonus: updateData.bonus !== undefined ? updateData.bonus : current.bonus,

    popular: updateData.popular !== undefined ? Boolean(updateData.popular) : current.popular,

    inStock: updateData.inStock !== undefined ? Boolean(updateData.inStock) : current.inStock,

    image: updateData.image !== undefined ? updateData.image : current.image

  };



  saveAdminConfig();

  return event.packages[pkgIdx];

}



export function deletePackageFromMlbbEvent(eventId, pkgId) {

  const event = adminConfig.mlbbEvents.find((e) => e.id === eventId);

  if (!event) return false;



  const lenBefore = event.packages.length;

  event.packages = event.packages.filter((p) => p.id !== pkgId && p.code !== pkgId);

  saveAdminConfig();

  return event.packages.length < lenBefore;

}



// Contact Settings
export function updateContactSettings(newContacts = {}) {
  const current = adminConfig.contacts || DEFAULT_CONTACTS;
  const username = newContacts.telegramUsername !== undefined
    ? normalizeTelegramUsername(newContacts.telegramUsername, current.telegramUsername || '@Yur1Uchiha')
    : (current.telegramUsername || '@Yur1Uchiha');

  const rawUrl = newContacts.telegramUrl !== undefined ? newContacts.telegramUrl : current.telegramUrl;
  const url = normalizeTelegramUrl(rawUrl, username);

  adminConfig.contacts = {
    ...current,
    telegramUrl: url,
    telegramUsername: username,
    facebookUrl: newContacts.facebookUrl !== undefined ? newContacts.facebookUrl : current.facebookUrl,
    supportPhone: newContacts.supportPhone !== undefined ? newContacts.supportPhone : current.supportPhone,
    supportHours: newContacts.supportHours !== undefined ? newContacts.supportHours : current.supportHours,
    announcement: newContacts.announcement !== undefined ? newContacts.announcement : current.announcement,
    telegramAdmin1Id: newContacts.telegramAdmin1Id !== undefined ? String(newContacts.telegramAdmin1Id).trim() : (current.telegramAdmin1Id || '6805487598'),
    telegramAdmin1Name: newContacts.telegramAdmin1Name !== undefined ? normalizeTelegramUsername(newContacts.telegramAdmin1Name, '@Yur1Uchiha') : (current.telegramAdmin1Name || '@Yur1Uchiha'),
    telegramAdmin2Id: newContacts.telegramAdmin2Id !== undefined ? String(newContacts.telegramAdmin2Id).trim() : (current.telegramAdmin2Id || '7283817695'),
    telegramAdmin2Name: newContacts.telegramAdmin2Name !== undefined ? normalizeTelegramUsername(newContacts.telegramAdmin2Name, '@kaixite') : (current.telegramAdmin2Name || '@kaixite'),
    telegramGroupId: newContacts.telegramGroupId !== undefined ? String(newContacts.telegramGroupId).trim() : (current.telegramGroupId || '-1004493408552'),
    // Bot credentials are server-only and must come from TELEGRAM_BOT_TOKEN.
    telegramBotToken: ''
  };

  saveAdminConfig();
  return adminConfig.contacts;
}



// Slide Banners Management

export function addSlideBanner(bannerData = {}) {

  const newBanner = {

    id: bannerData.id || `banner_${Date.now()}`,

    title: bannerData.title || 'Special Promotion',

    subtitle: bannerData.subtitle || 'Limited time top-up offers',

    actionLabel: bannerData.actionLabel || 'Shop Now',

    image: bannerData.image || '/assets/games/mlbb_hero_4k.jpg',

    gameSlug: bannerData.gameSlug || 'mobile-legends',

    active: bannerData.active !== false

  };



  adminConfig.banners.push(newBanner);

  saveAdminConfig();

  return newBanner;

}



export function updateSlideBanner(bannerId, updateData = {}) {

  const idx = adminConfig.banners.findIndex((b) => b.id === bannerId);

  if (idx === -1) return null;



  const current = adminConfig.banners[idx];

  adminConfig.banners[idx] = {

    ...current,

    title: updateData.title || current.title,

    subtitle: updateData.subtitle || current.subtitle,

    actionLabel: updateData.actionLabel || current.actionLabel,

    image: updateData.image || current.image,

    gameSlug: updateData.gameSlug || current.gameSlug,

    active: typeof updateData.active === 'boolean' ? updateData.active : current.active

  };



  saveAdminConfig();

  return adminConfig.banners[idx];

}



export function deleteSlideBanner(bannerId) {

  const lenBefore = adminConfig.banners.length;

  adminConfig.banners = adminConfig.banners.filter((b) => b.id !== bannerId);

  saveAdminConfig();

  return adminConfig.banners.length < lenBefore;

}



// Initial load

loadAdminConfig();



