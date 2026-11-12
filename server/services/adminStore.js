import fs from 'node:fs';

import os from 'node:os';

import path from 'node:path';

import crypto from 'node:crypto';

import { pool } from '../config/db.js';



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

    image: '/assets/games/roblox_kh.png',

    badge: 'Official Username',

    description: 'Instant Robux delivery to your Roblox account by username. Safe and verified.',

    fields: [

      { key: 'userId', label: 'Roblox Username', placeholder: 'e.g. Ucantusemeee', type: 'text', required: true }

    ],

    packages: [

      { id: 'rblx_100', code: '100', name: '100 Robux', diamonds: 100, price: 1.00, bonus: 'Hot Pack', popular: true, inStock: true, image: '' },

      { id: 'rblx_200', code: '200', name: '200 Robux', diamonds: 200, price: 2.00, bonus: 'Bonus Value', popular: false, inStock: true, image: '' },

      { id: 'rblx_300', code: '300', name: '300 Robux', diamonds: 300, price: 3.00, bonus: 'Best Seller', popular: true, inStock: true, image: '' },

      { id: 'rblx_400', code: '400', name: '400 Robux', diamonds: 400, price: 4.00, bonus: '+10 Bonus', popular: false, inStock: true, image: '' },

      { id: 'rblx_500', code: '500', name: '500 Robux', diamonds: 500, price: 4.50, bonus: 'VIP Pack', popular: true, inStock: true, image: '' },

      { id: 'rblx_1000', code: '1000', name: '1,000 Robux', diamonds: 1000, price: 9.00, bonus: 'Mega Pack', popular: true, inStock: true, image: '' }

    ]

  },

  {

    id: 'ml',

    slug: 'mobile-legends',

    providerCode: 'ml',

    name: 'Mobile Legends KH',

    publisher: 'Moonton',

    currency: 'Diamonds',

    stockOpen: true,

    banner: '/assets/games/mlbb_hero_4k.jpg',

    image: '/assets/games/ml_kh.png',

    badge: '5s Moonton Sync',

    description: 'Mobile Legends KH official direct diamond top-up. Enter your User ID and Zone ID.',

    fields: [

      { key: 'userId', label: 'User ID', placeholder: 'e.g. 29481903', type: 'text', required: true },

      { key: 'zoneId', label: 'Zone ID / Server ID', placeholder: 'e.g. 2042', type: 'text', required: true }

    ],

    packages: [

      { id: 'ml_55', code: '55', name: '55 Diamonds', diamonds: 55, price: 0.90, bonus: 'Fast Delivery', popular: false, inStock: true, image: '' },

      { id: 'ml_86', code: '86', name: '86 Diamonds', diamonds: 86, price: 1.35, bonus: '+9 Bonus', popular: false, inStock: true, image: '' },

      { id: 'ml_165', code: '165', name: '165 Diamonds', diamonds: 165, price: 2.50, bonus: '', popular: false, inStock: true, image: '' },

      { id: 'ml_172', code: '172', name: '172 Diamonds', diamonds: 172, price: 2.60, bonus: '+16 Bonus', popular: false, inStock: true, image: '' },

      { id: 'ml_275', code: '275', name: '275 Diamonds', diamonds: 275, price: 3.85, bonus: '', popular: false, inStock: true, image: '' },

      { id: 'ml_343', code: '343', name: '343 Diamonds', diamonds: 343, price: 4.96, bonus: '+37 Bonus', popular: true, inStock: true, image: '' },

      { id: 'ml_429', code: '429', name: '429 Diamonds', diamonds: 429, price: 6.08, bonus: '', popular: false, inStock: true, image: '' },

      { id: 'ml_514', code: '514', name: '514 Diamonds', diamonds: 514, price: 7.15, bonus: '', popular: false, inStock: true, image: '' },

      { id: 'ml_565', code: '565', name: '565 Diamonds', diamonds: 565, price: 7.80, bonus: '', popular: false, inStock: true, image: '' },

      { id: 'ml_600', code: '600', name: '600 Diamonds', diamonds: 600, price: 8.48, bonus: '', popular: false, inStock: true, image: '' },

      { id: 'ml_706', code: '706', name: '706 Diamonds', diamonds: 706, price: 9.80, bonus: '+88 Bonus', popular: true, inStock: true, image: '' },

      { id: 'ml_878', code: '878', name: '878 Diamonds', diamonds: 878, price: 12.15, bonus: '', popular: false, inStock: true, image: '' },

      { id: 'ml_963', code: '963', name: '963 Diamonds', diamonds: 963, price: 13.21, bonus: '', popular: false, inStock: true, image: '' },

      { id: 'ml_1584', code: '1584', name: '1,584 Diamonds', diamonds: 1584, price: 21.99, bonus: '', popular: false, inStock: true, image: '' },

      { id: 'ml_2195', code: '2195', name: '2,195 Diamonds', diamonds: 2195, price: 29.50, bonus: '+320 Bonus', popular: true, inStock: true, image: '' },

      { id: 'ml_2901', code: '2901', name: '2,901 Diamonds', diamonds: 2901, price: 39.88, bonus: '', popular: false, inStock: true, image: '' },

      { id: 'ml_3688', code: '3688', name: '3,688 Diamonds', diamonds: 3688, price: 49.30, bonus: '+550 Bonus', popular: false, inStock: true, image: '' },

      { id: 'ml_5532', code: '5532', name: '5,532 Diamonds', diamonds: 5532, price: 73.00, bonus: '+800 Bonus', popular: true, inStock: true, image: '' },

      { id: 'ml_9288', code: '9288', name: '9,288 Diamonds', diamonds: 9288, price: 124.00, bonus: '', popular: true, inStock: true, image: '' }

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

    image: '/assets/games/ff_kh.png',

    badge: 'Official Garena UID',

    description: 'Free Fire diamonds top-up. Enter your Player ID for instant automated delivery.',

    fields: [

      { key: 'userId', label: 'Player ID', placeholder: 'Enter Free Fire Player ID (e.g. 10000001)', type: 'text', required: true }

    ],

    packages: [

      { id: 'ff_25', code: 'FREEFIRE_SG_25', name: '25 Diamonds', diamonds: 25, price: 0.29, bonus: 'Starter Pack', popular: false, inStock: true, image: '' },

      { id: 'ff_100', code: 'FREEFIRE_SG_100', name: '100 Diamonds', diamonds: 100, price: 0.98, bonus: '', popular: false, inStock: true, image: '' },

      { id: 'ff_310', code: 'FREEFIRE_SG_310', name: '310 Diamonds', diamonds: 310, price: 2.99, bonus: '', popular: false, inStock: true, image: '' },

      { id: 'ff_520', code: 'FREEFIRE_SG_520', name: '520 Diamonds', diamonds: 520, price: 4.80, bonus: '', popular: true, inStock: true, image: '' },

      { id: 'ff_1060', code: 'FREEFIRE_SG_1060', name: '1,060 Diamonds', diamonds: 1060, price: 9.39, bonus: '', popular: true, inStock: true, image: '' },

      { id: 'ff_2180', code: 'FREEFIRE_SG_2180', name: '2,180 Diamonds', diamonds: 2180, price: 18.49, bonus: '', popular: false, inStock: true, image: '' },

      { id: 'ff_5600', code: 'FREEFIRE_SG_5600', name: '5,600 Diamonds', diamonds: 5600, price: 47.99, bonus: '', popular: true, inStock: true, image: '' },

      { id: 'ff_11500', code: 'FREEFIRE_SG_11500', name: '11,500 Diamonds', diamonds: 11500, price: 95.00, bonus: '', popular: false, inStock: true, image: '' },

      { id: 'ff_weeklylite', code: 'FREEFIRE_SG_Weekly_Lite', name: 'Weekly Lite', diamonds: 100, price: 0.39, bonus: '', popular: false, inStock: true, image: '' },

      { id: 'ff_monthly', code: 'FREEFIRE_SG_Monthly_Membership', name: 'Monthly Pass', diamonds: 100, price: 7.50, bonus: '', popular: true, inStock: true, image: '' }

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

    banner: '/assets/games/ros_legacy_kh.webp',

    image: '/assets/games/ros_legacy_kh.webp',

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

  },

  {
    id: 'rosangkor',
    slug: 'rosangkor',
    providerCode: 'rosangkor',
    name: 'RoS Angkor',
    publisher: 'RoS Angkor',
    currency: 'Diamonds',
    stockOpen: true,
    maintenance: false,
    // Live player verification via RosAngkor GET /players/{gid} (shows the player's name).
    verificationMode: 'live',
    banner: '/assets/games/ros_angkor_v2.png',
    image: '/assets/games/ros_angkor_v2.png',
    badge: 'Instant Auto Top-Up',
    description: 'RoS Angkor diamonds — instant auto top-up. Enter your Player ID (6–12 digits).',
    fields: [
      { key: 'userId', label: 'Player ID', placeholder: 'Enter your RoS Angkor Player ID', type: 'text', required: true }
    ],
    // Pack codes (dm80 … dm40000) are the RosAngkor API pack ids. Selling price defaults to retail
    // (your cost is 15% less); edit prices in the admin panel.
    packages: [
      { id: 'rosangkor_dm80', code: 'dm80', providerCode: 'dm80', name: '80 Diamonds', diamonds: 80, price: 1.00, bonus: '', popular: false, inStock: true, image: '' },
      { id: 'rosangkor_dm160', code: 'dm160', providerCode: 'dm160', name: '160 Diamonds', diamonds: 160, price: 2.00, bonus: '', popular: false, inStock: true, image: '' },
      { id: 'rosangkor_dm240', code: 'dm240', providerCode: 'dm240', name: '240 Diamonds', diamonds: 240, price: 3.00, bonus: '', popular: false, inStock: true, image: '' },
      { id: 'rosangkor_dm400', code: 'dm400', providerCode: 'dm400', name: '400 Diamonds', diamonds: 400, price: 5.00, bonus: '', popular: false, inStock: true, image: '' },
      { id: 'rosangkor_dm800', code: 'dm800', providerCode: 'dm800', name: '800 Diamonds', diamonds: 800, price: 10.00, bonus: 'Popular', popular: true, inStock: true, image: '' },
      { id: 'rosangkor_dm1200', code: 'dm1200', providerCode: 'dm1200', name: '1,200 Diamonds', diamonds: 1200, price: 15.00, bonus: '', popular: false, inStock: true, image: '' },
      { id: 'rosangkor_dm1600', code: 'dm1600', providerCode: 'dm1600', name: '1,600 Diamonds', diamonds: 1600, price: 20.00, bonus: 'Best Value', popular: true, inStock: true, image: '' },
      { id: 'rosangkor_dm2000', code: 'dm2000', providerCode: 'dm2000', name: '2,000 Diamonds', diamonds: 2000, price: 25.00, bonus: '', popular: false, inStock: true, image: '' },
      { id: 'rosangkor_dm2400', code: 'dm2400', providerCode: 'dm2400', name: '2,400 Diamonds', diamonds: 2400, price: 30.00, bonus: '', popular: false, inStock: true, image: '' },
      { id: 'rosangkor_dm3200', code: 'dm3200', providerCode: 'dm3200', name: '3,200 Diamonds', diamonds: 3200, price: 40.00, bonus: '', popular: false, inStock: true, image: '' },
      { id: 'rosangkor_dm4000', code: 'dm4000', providerCode: 'dm4000', name: '4,000 Diamonds', diamonds: 4000, price: 50.00, bonus: '', popular: false, inStock: true, image: '' },
      { id: 'rosangkor_dm6000', code: 'dm6000', providerCode: 'dm6000', name: '6,000 Diamonds', diamonds: 6000, price: 75.00, bonus: '', popular: false, inStock: true, image: '' },
      { id: 'rosangkor_dm8000', code: 'dm8000', providerCode: 'dm8000', name: '8,000 Diamonds', diamonds: 8000, price: 100.00, bonus: '', popular: false, inStock: true, image: '' },
      { id: 'rosangkor_dm12000', code: 'dm12000', providerCode: 'dm12000', name: '12,000 Diamonds', diamonds: 12000, price: 150.00, bonus: '', popular: false, inStock: true, image: '' },
      { id: 'rosangkor_dm16000', code: 'dm16000', providerCode: 'dm16000', name: '16,000 Diamonds', diamonds: 16000, price: 200.00, bonus: '', popular: false, inStock: true, image: '' },
      { id: 'rosangkor_dm24000', code: 'dm24000', providerCode: 'dm24000', name: '24,000 Diamonds', diamonds: 24000, price: 300.00, bonus: '', popular: false, inStock: true, image: '' },
      { id: 'rosangkor_dm40000', code: 'dm40000', providerCode: 'dm40000', name: '40,000 Diamonds', diamonds: 40000, price: 500.00, bonus: '', popular: false, inStock: true, image: '' }
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
  siteLogo: '/assets/brand/yurigame-logo.png',
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

    title: 'Mobile Legends KH Live Top-Up',

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

    image: '/assets/games/ros_legacy_kh.webp',

    gameSlug: 'ros-legacy',

    active: true

  }

];



// Master in-memory configuration with disk persistence

let adminConfig = {

  siteLogo: '/assets/brand/yurigame-logo.png',

  games: DEFAULT_GAMES,

  mlbbEvents: DEFAULT_MLBB_EVENTS,

  contacts: DEFAULT_CONTACTS,

  banners: DEFAULT_BANNERS,

  comingSoonGames: [],

  updatedAt: new Date().toISOString()

};



// Valid active admin tokens (token => { createdAt, expiresAt })

const activeAdminTokens = new Map();



// 2FA Admin Challenge & Session Stores

const stagedAdminChallenges = new Map();

const activeAdminSessions = new Map();

const PUBLIC_ROOT_DIR = path.resolve(process.cwd(), 'public');

export function getDefaultBannerForSlug(gameSlug = '', title = '') {
  const s = `${String(gameSlug || '')} ${String(title || '')}`.toLowerCase();
  if (s.includes('roblox') || s.includes('robux')) return '/assets/games/roblox_hero_4k.jpg';
  if (s.includes('free-fire') || s.includes('free fire') || s === 'ff ') return '/assets/banners/banner_freefire.jpg';
  if (s.includes('angkor') || s.includes('rosangkor')) return '/assets/games/ros_angkor_v2.png';
  if (s.includes('ros')) return '/assets/games/ros_legacy_kh.webp';
  return '/assets/banners/banner_mlbb.jpg';
}

export function getDefaultGameImageForId(gameIdOrSlug = '') {
  const s = String(gameIdOrSlug || '').toLowerCase();
  if (s === 'robuxsend' || s.includes('roblox')) return '/assets/games/roblox_kh.png';
  if (s === 'ff' || s.includes('free-fire')) return '/assets/games/ff_kh.png';
  if (s === 'rosangkor' || s.includes('angkor')) return '/assets/games/ros_angkor_v2.png';
  if (s === 'roslegacy' || s.includes('ros')) return '/assets/games/ros_legacy_kh.webp';
  if (s === 'ml' || s.includes('mobile-legends')) return '/assets/games/ml_kh.png';
  return '/assets/brand/yurigame-logo.png';
}

export function resolveValidAssetUrl(rawUrl, fallbackUrl = '/assets/brand/yurigame-logo.png') {
  if (!rawUrl) return fallbackUrl;
  const candidate = typeof rawUrl === 'object' && rawUrl !== null
    ? String(rawUrl.url || rawUrl.src || '').trim()
    : String(rawUrl).trim();
  if (
    !candidate ||
    candidate === '[object Object]' ||
    candidate === 'undefined' ||
    candidate === 'null' ||
    candidate.includes('harikitopup.com') ||
    candidate.startsWith('/assets/uploads/')
  ) {
    return fallbackUrl;
  }
  if (candidate === '/assets/games/ros_angkor.png') {
    return '/assets/games/ros_angkor_v2.png';
  }
  if (candidate.startsWith('data:image/')) {
    if (!candidate.includes(';base64,') || candidate.length < 64) {
      return fallbackUrl;
    }
    return candidate;
  }
  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }
  if (candidate.startsWith('/')) {
    const cleanRel = candidate.split('?')[0].split('#')[0].replace(/^\/+/, '');
    const fullDiskPath = path.join(PUBLIC_ROOT_DIR, cleanRel);
    if (fs.existsSync(fullDiskPath)) {
      return candidate;
    }
    return fallbackUrl;
  }
  return fallbackUrl;
}

const LEGACY_PLACEHOLDER_GAME_IMAGES = new Set([
  '/assets/games/current_roblox.jpg',
  '/assets/games/current_mobile-legends.jpg',
  '/assets/games/current_free-fire.jpg',
  '/assets/games/current_ros-legacy.jpg',
  '/assets/brand/yurigame-logo.webp',
]);

export function resolveValidGameImage(gameObj, fallbackUrl) {
  const idOrSlug = `${gameObj?.id || ''} ${gameObj?.slug || ''} ${gameObj?.providerCode || ''} ${gameObj?.name || ''}`.toLowerCase();
  const fb = fallbackUrl || getDefaultGameImageForId(idOrSlug);
  let resolved = resolveValidAssetUrl(gameObj?.image, fb);
  if (resolved === '/assets/games/ros_angkor.png') {
    resolved = '/assets/games/ros_angkor_v2.png';
  }
  if (LEGACY_PLACEHOLDER_GAME_IMAGES.has(resolved)) {
    return fb;
  }
  const isMlGame = idOrSlug.includes('mobile-legends') || String(gameObj?.id || '').toLowerCase() === 'ml';
  if (
    !isMlGame &&
    (resolved.includes('ml_kh') || resolved.includes('mlbb') || resolved.includes('mobile-legends'))
  ) {
    return fb;
  }
  return resolved;
}

export function resolveValidBannerImage(bannerObj, fallbackUrl) {
  const fb = fallbackUrl || getDefaultBannerForSlug(bannerObj?.gameSlug || bannerObj?.id, bannerObj?.title);
  const resolved = resolveValidAssetUrl(bannerObj?.image, fb);
  if (LEGACY_PLACEHOLDER_GAME_IMAGES.has(resolved)) {
    return fb;
  }
  return resolved;
}

// Load persisted config from disk (outside repo)

export function loadAdminConfig() {

  try {

    if (fs.existsSync(ADMIN_CONFIG_FILE)) {

      const raw = fs.readFileSync(ADMIN_CONFIG_FILE, 'utf-8');

      const loaded = JSON.parse(raw);

      if (loaded && Array.isArray(loaded.games)) {

        // Merge with defaults to ensure all core games are strictly present

        const gamesMerged = DEFAULT_GAMES.map((defGame) => {

          const found = loaded.games.find((g) => g.id === defGame.id || g.slug === defGame.slug);

          if (!found) return defGame;

          return {

            ...defGame,

            ...found,

            image: resolveValidGameImage(found, defGame.image),

            banner: resolveValidBannerImage({ ...found, image: found.banner, gameSlug: defGame.slug }, defGame.banner),

            fields: defGame.fields, // enforce correct fields for RoS & Roblox

            packages: Array.isArray(found.packages) && found.packages.length > 0 ? found.packages : defGame.packages

          };

        });



        const defKeys = new Set(DEFAULT_GAMES.flatMap((g) => [g.id, g.slug].filter(Boolean)));
        const importedGames = (loaded.games || [])
          .filter((g) => g && !defKeys.has(g.id) && !defKeys.has(g.slug))
          .map((g) => ({
            ...g,
            image: resolveValidGameImage(g, getDefaultGameImageForId(g.id || g.slug)),
            banner: resolveValidBannerImage({ ...g, image: g.banner, gameSlug: g.slug || g.id }, getDefaultBannerForSlug(g.slug || g.id, g.name)),
          }));

        const loadedSiteLogo = resolveValidAssetUrl(
          loaded.siteLogo || loaded.contacts?.siteLogo,
          '/assets/brand/yurigame-logo.png'
        );

        const loadedBanners = (Array.isArray(loaded.banners) && loaded.banners.length > 0 ? loaded.banners : DEFAULT_BANNERS).map((b, idx) => {
          const defBanner = DEFAULT_BANNERS[idx] || DEFAULT_BANNERS[0];
          const fallbackImg = getDefaultBannerForSlug(b?.gameSlug || defBanner?.gameSlug, b?.title || defBanner?.title);
          return {
            ...defBanner,
            ...b,
            image: resolveValidBannerImage(b, fallbackImg),
          };
        });

        adminConfig = {

          siteLogo: loadedSiteLogo,

          games: [...gamesMerged, ...importedGames],

          mlbbEvents: Array.isArray(loaded.mlbbEvents) ? loaded.mlbbEvents : DEFAULT_MLBB_EVENTS,

          contacts: (() => {
            const raw = { ...DEFAULT_CONTACTS, ...(loaded.contacts || {}), telegramBotToken: '' };
            const uName = normalizeTelegramUsername(raw.telegramUsername || '@Yur1Uchiha');
            return {
              ...raw,
              siteLogo: loadedSiteLogo,
              telegramUsername: uName,
              telegramUrl: normalizeTelegramUrl(raw.telegramUrl, uName),
              telegramAdmin1Name: normalizeTelegramUsername(raw.telegramAdmin1Name || '@Yur1Uchiha'),
              telegramAdmin2Name: normalizeTelegramUsername(raw.telegramAdmin2Name || '@kaixite'),
            };
          })(),

          banners: loadedBanners,

          comingSoonGames: (Array.isArray(loaded.comingSoonGames) ? loaded.comingSoonGames : []).map((cs) => ({
            ...cs,
            image: resolveValidAssetUrl(cs?.image, '/assets/brand/yurigame-logo.png'),
          })),

          updatedAt: loaded.updatedAt || new Date().toISOString()

        };

        // Rewrite legacy persisted config without server credentials.
        saveAdminConfig({ skipDb: true });
        return adminConfig;

      }

    }

  } catch (err) {

    console.warn('[Admin Store] Could not load persisted admin config:', err.message);

  }



  saveAdminConfig({ skipDb: true });

  return adminConfig;

}

// Persist config to disk

export function saveAdminConfig({ skipDb = false } = {}) {
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

  // Also persist to MySQL so the config (incl. imported games) survives Railway redeploys.
  if (!skipDb) return saveAdminConfigToDb();
  return Promise.resolve();
}

// ---- Durable persistence in MySQL (survives container redeploys) ----
function mergeLoadedConfig(loaded) {
  const gamesMerged = DEFAULT_GAMES.map((defGame) => {
    const found = (loaded.games || []).find((g) => {
      const gId = String(g?.id || '').toLowerCase();
      const gSlug = String(g?.slug || '').toLowerCase();
      const gCode = String(g?.providerCode || g?.code || '').toLowerCase();
      const gName = String(g?.name || '').toLowerCase();
      const defId = String(defGame.id || '').toLowerCase();
      const defSlug = String(defGame.slug || '').toLowerCase();
      const defCode = String(defGame.providerCode || defGame.code || '').toLowerCase();
      const defName = String(defGame.name || '').toLowerCase();
      return (
        gId === defId || gId === defSlug ||
        gSlug === defSlug || gSlug === defId ||
        (gCode && (gCode === defCode || gCode === defId || gCode === defSlug)) ||
        (gName && defName && gName === defName)
      );
    });
    if (!found) return defGame;
    const validImage = resolveValidGameImage(found, defGame.image);
    const validBanner = resolveValidBannerImage({ ...found, image: found.banner, gameSlug: defGame.slug }, defGame.banner);
    // One-time refresh for RoS Angkor: if the stored copy predates the real RosAngkor pack catalog
    // (pack codes start with "dm"), adopt the current default config but keep the admin's valid logo/banner.
    if (defGame.id === 'rosangkor') {
      const hasRealPacks = Array.isArray(found.packages) && found.packages.some((p) => String(p.code || '').startsWith('dm'));
      if (!hasRealPacks) {
        return { ...defGame, image: validImage, banner: validBanner };
      }
    }
    return {
      ...defGame,
      ...found,
      image: validImage,
      banner: validBanner,
      fields: defGame.fields,
      packages: Array.isArray(found.packages) && found.packages.length > 0 ? found.packages : defGame.packages,
    };
  });
  const defKeys = new Set(DEFAULT_GAMES.flatMap((g) => [g.id, g.slug].filter(Boolean)));
  const importedGames = (loaded.games || [])
    .filter((g) => g && !defKeys.has(g.id) && !defKeys.has(g.slug))
    .map((g) => ({
      ...g,
      image: resolveValidGameImage(g, getDefaultGameImageForId(g.id || g.slug)),
      banner: resolveValidBannerImage({ ...g, image: g.banner, gameSlug: g.slug || g.id }, getDefaultBannerForSlug(g.slug || g.id, g.name)),
    }));
  const mergedSiteLogo = resolveValidAssetUrl(
    loaded.siteLogo || loaded.contacts?.siteLogo || adminConfig.siteLogo,
    '/assets/brand/yurigame-logo.png'
  );
  const rawBanners = Array.isArray(loaded.banners) && loaded.banners.length > 0 ? loaded.banners : adminConfig.banners;
  const mergedBanners = (rawBanners || DEFAULT_BANNERS).map((b, idx) => {
    const defBanner = DEFAULT_BANNERS[idx] || DEFAULT_BANNERS[0];
    const fallbackImg = getDefaultBannerForSlug(b?.gameSlug || defBanner?.gameSlug, b?.title || defBanner?.title);
    return {
      ...defBanner,
      ...b,
      image: resolveValidBannerImage(b, fallbackImg),
    };
  });
  const mergedComingSoon = (Array.isArray(loaded.comingSoonGames) ? loaded.comingSoonGames : (adminConfig.comingSoonGames || [])).map((cs) => ({
    ...cs,
    image: resolveValidAssetUrl(cs?.image, '/assets/brand/yurigame-logo.png'),
  }));
  return {
    siteLogo: mergedSiteLogo,
    games: [...gamesMerged, ...importedGames],
    mlbbEvents: Array.isArray(loaded.mlbbEvents) ? loaded.mlbbEvents : adminConfig.mlbbEvents,
    contacts: { ...adminConfig.contacts, ...(loaded.contacts || {}), siteLogo: mergedSiteLogo, telegramBotToken: '' },
    banners: mergedBanners,
    comingSoonGames: mergedComingSoon,
    updatedAt: loaded.updatedAt || new Date().toISOString(),
  };
}

async function ensureAppConfigTable() {
  if (!pool) return false;
  await pool.query(
    'CREATE TABLE IF NOT EXISTS `app_config` (`config_key` VARCHAR(64) PRIMARY KEY, `config_json` LONGTEXT, `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
  );
  return true;
}

export async function saveAdminConfigToDb() {
  try {
    if (!pool) return;
    await ensureAppConfigTable();
    const json = JSON.stringify({
      ...adminConfig,
      contacts: { ...(adminConfig.contacts || {}), telegramBotToken: '' },
    });
    await pool.query(
      'INSERT INTO `app_config` (config_key, config_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_json = VALUES(config_json)',
      ['admin_config', json]
    );

    // Save each individual game under game_<id> to guarantee durability even if overall payload is large
    for (const g of (adminConfig.games || [])) {
      const keys = [g.id, g.slug, g.providerCode, g.code].filter(Boolean);
      for (const k of keys) {
        const cleanKey = `game_${String(k).toLowerCase()}`;
        await pool.query(
          'INSERT INTO `app_config` (config_key, config_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_json = VALUES(config_json)',
          [cleanKey, JSON.stringify(g)]
        ).catch((e) => console.warn(`[Admin Store] Game ${cleanKey} save notice:`, e.message));
      }
    }

    if (adminConfig.siteLogo) {
      await pool.query(
        'INSERT INTO `app_config` (config_key, config_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_json = VALUES(config_json)',
        ['site_logo', JSON.stringify({ siteLogo: adminConfig.siteLogo })]
      ).catch(() => {});
    }

    console.log('[Admin Store] Admin config saved to database (durable).');
  } catch (err) {
    console.error('[Admin Store] DB config save error:', err.message);
  }
}

// Called at startup (after the DB schema is ready) to override the in-memory config with the durable copy.
export async function loadAdminConfigFromDb() {
  try {
    if (!pool) return false;
    await ensureAppConfigTable();
    const [rows] = await pool.query('SELECT config_key, config_json FROM `app_config`');
    if (!rows.length) {
      await saveAdminConfigToDb();
      return false;
    }
    const rowMap = new Map(rows.map((r) => [r.config_key, r.config_json]));
    const mainJson = rowMap.get('admin_config');
    let loaded = null;
    if (mainJson) {
      try { loaded = JSON.parse(mainJson); } catch {}
    }
    if (!loaded || typeof loaded !== 'object') {
      loaded = { games: [] };
    }

    // Also overlay any individual game rows (game_ff, game_ml, etc.) from MySQL
    const loadedGames = Array.isArray(loaded.games) ? [...loaded.games] : [];
    for (const [key, val] of rowMap.entries()) {
      if (key.startsWith('game_')) {
        try {
          const gData = JSON.parse(val);
          const gCode = key.replace(/^game_/, '').toLowerCase();
          const existingIdx = loadedGames.findIndex((eg) =>
            String(eg.id || eg.slug || eg.providerCode || eg.code || '').toLowerCase() === gCode
          );
          if (existingIdx !== -1) {
            loadedGames[existingIdx] = { ...loadedGames[existingIdx], ...gData };
          } else {
            loadedGames.push(gData);
          }
        } catch {}
      }
    }
    loaded.games = loadedGames;

    if (rowMap.has('site_logo')) {
      try {
        const logoData = JSON.parse(rowMap.get('site_logo'));
        if (logoData?.siteLogo) loaded.siteLogo = logoData.siteLogo;
      } catch {}
    }

    adminConfig = mergeLoadedConfig(loaded);
    saveAdminConfig({ skipDb: true });
    console.log('[Admin Store] Admin config loaded from database (durable).');
    return true;
  } catch (err) {
    console.warn('[Admin Store] DB config load notice:', err.message);
  }
  return false;
}



// Generate single-click URL token for Telegram /admin command

export function generateAdminToken(adminUserId = '') {

  const token = crypto.randomBytes(24).toString('hex');

  const expiresAt = Date.now() + 30 * 60 * 1000; // one-click links expire after 30 minutes

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

export const ADMIN_SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes session expiry

export function createAdminSession(clientIp = '', userAgent = '', adminId = 'admin_master') {
  const now = Date.now();
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = now + ADMIN_SESSION_DURATION_MS;
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

  // Note: challengeId is a cryptographically unique 256-bit token; we permit verified OTPs without strict IP pinning
  // so mobile cellular data hops and Cloudflare proxy edge transitions do not block legitimate admin logins.



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

  // Allow resend within active session without strict IP pinning



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
  const siteLogo = resolveValidAssetUrl(
    adminConfig.siteLogo || contacts.siteLogo,
    '/assets/brand/yurigame-logo.png'
  );
  return {
    siteLogo,
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
  const siteLogo = resolveValidAssetUrl(
    adminConfig.siteLogo || adminConfig.contacts?.siteLogo,
    '/assets/brand/yurigame-logo.png'
  );
  return {
    siteLogo,
    games: adminConfig.games.map((game) => ({
      ...game,
      code: game.code || game.id || game.providerCode || game.slug,
      providerCode: game.providerCode || game.code || game.id || game.slug,
      image: resolveValidGameImage(game, getDefaultGameImageForId(game.id || game.slug)),
      banner: resolveValidBannerImage({ ...game, image: game.banner, gameSlug: game.slug || game.id }, getDefaultBannerForSlug(game.slug || game.id, game.name)),
      packages: (game.packages || [])
        .filter((pkg) => pkg.inStock !== false)
        .map(stripInternalPackageFields),
    })),
    mlbbEvents: (adminConfig.mlbbEvents || [])
      .filter((event) => event.isOpen === true)
      .map((event) => ({
        ...event,
        banner: resolveValidAssetUrl(event.banner, '/assets/games/mlbb_hero_4k.jpg'),
        packages: (event.packages || [])
          .filter((pkg) => pkg.inStock !== false)
          .map(stripInternalPackageFields),
      })),
    contacts: getPublicContacts(),
    banners: (adminConfig.banners || [])
      .filter((banner) => banner.active !== false)
      .map((banner) => ({
        ...banner,
        image: resolveValidBannerImage(banner, getDefaultBannerForSlug(banner.gameSlug, banner.title)),
      })),
    comingSoonGames: (Array.isArray(adminConfig.comingSoonGames) ? adminConfig.comingSoonGames : []).map((cs) => ({
      ...cs,
      image: resolveValidAssetUrl(cs?.image, '/assets/brand/yurigame-logo.png'),
    })),
  };
}

// ---- Coming Soon games (display-only placeholder tiles on the storefront) ----
export function addComingSoonGame({ name, image } = {}) {
  const cleanName = String(name || '').trim().slice(0, 80);
  if (!cleanName) return null;
  if (!Array.isArray(adminConfig.comingSoonGames)) adminConfig.comingSoonGames = [];
  const validImage = resolveValidAssetUrl(image, '/assets/brand/yurigame-logo.png');
  const entry = {
    id: `cs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    image: String(validImage || '').slice(0, 2000000),
    comingSoon: true,
    createdAt: new Date().toISOString(),
  };
  adminConfig.comingSoonGames.push(entry);
  saveAdminConfig();
  return entry;
}

export function removeComingSoonGame(id) {
  const target = String(id || '').trim();
  if (!Array.isArray(adminConfig.comingSoonGames)) return false;
  const before = adminConfig.comingSoonGames.length;
  adminConfig.comingSoonGames = adminConfig.comingSoonGames.filter((g) => String(g.id) !== target);
  if (adminConfig.comingSoonGames.length !== before) {
    saveAdminConfig();
    return true;
  }
  return false;
}

// Protected dashboard configuration. Server credentials never enter browser JavaScript.
export function getAdminClientConfig() {
  const safeContacts = { ...(adminConfig.contacts || {}) };
  delete safeContacts.telegramBotToken;
  const siteLogo = resolveValidAssetUrl(
    adminConfig.siteLogo || safeContacts.siteLogo,
    '/assets/brand/yurigame-logo.png'
  );
  return {
    ...adminConfig,
    siteLogo,
    games: (adminConfig.games || []).map((game) => ({
      ...game,
      image: resolveValidGameImage(game, getDefaultGameImageForId(game.id || game.slug)),
      banner: resolveValidBannerImage({ ...game, image: game.banner, gameSlug: game.slug || game.id }, getDefaultBannerForSlug(game.slug || game.id, game.name)),
    })),
    banners: (adminConfig.banners || []).map((banner) => ({
      ...banner,
      image: resolveValidBannerImage(banner, getDefaultBannerForSlug(banner.gameSlug, banner.title)),
    })),
    comingSoonGames: (adminConfig.comingSoonGames || []).map((cs) => ({
      ...cs,
      image: resolveValidAssetUrl(cs?.image, '/assets/brand/yurigame-logo.png'),
    })),
    contacts: {
      ...safeContacts,
      siteLogo,
      telegramBotConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    },
  };
}

// Full server-only admin configuration.
export function getAdminFullConfig() {
  return adminConfig;
}

// Import a game from the provider catalog: auto-creates the game entry with all packages + fields.
export function importProviderGame(providerGame = {}) {
  const code = String(providerGame.code || '').trim().toLowerCase();
  if (!code || !/^[a-z0-9_-]{1,80}$/.test(code)) return null;

  const rawFields = Array.isArray(providerGame.fields) && providerGame.fields.length ? providerGame.fields : ['userid'];
  const fields = rawFields.map((f, i) => {
    const raw = String(f).toLowerCase();
    const label = raw === 'userid' ? 'User ID'
      : raw === 'serverid' ? 'Server ID'
        : raw === 'zoneid' ? 'Zone ID'
          : raw === 'charname' ? 'Character Name'
            : (String(f).charAt(0).toUpperCase() + String(f).slice(1));
    const key = raw === 'userid' ? 'userId' : (raw === 'serverid' || raw === 'zoneid') ? 'zoneId' : (raw || `field_${i}`);
    return { key, label, placeholder: `Enter ${label}`, type: 'text', required: true };
  });

  const packages = (Array.isArray(providerGame.packages) ? providerGame.packages : []).map((p) => {
    const diamonds = Number(String(p.name || '').match(/\d[\d,]*/)?.[0]?.replace(/,/g, '')) || 0;
    const price = Number(p.price) || 0;
    return {
      id: `${code}_${String(p.code)}`.replace(/[^a-z0-9_]+/gi, '_').slice(0, 80),
      code: p.code,
      providerCode: p.code,
      name: p.name || String(p.code),
      diamonds,
      price,
      providerPrice: price,
      providerConnected: true,
      bonus: '',
      popular: false,
      inStock: true,
      image: '',
    };
  });

  const entry = {
    id: code,
    slug: code,
    providerCode: code,
    code,
    name: providerGame.name || code,
    // Show only the game's own name on the storefront — no 'Bay2Game' publisher label.
    publisher: '',
    // No forced currency label — imported games mirror Bay2Game exactly (package names carry
    // their own units, e.g. "475", "20 000 Coins"). Admin only edits the price.
    currency: '',
    stockOpen: true,
    maintenance: false,
    verificationMode: 'format',
    banner: providerGame.image || '',
    image: providerGame.image || '',
    badge: 'Official Top-Up',
    description: providerGame.description || `${providerGame.name || code} direct top-up.`,
    fields,
    packages,
  };

  const idx = adminConfig.games.findIndex((g) =>
    String(g.id || '').toLowerCase() === code || String(g.providerCode || '').toLowerCase() === code
  );
  if (idx >= 0) {
    // Already exists: refresh name/image/fields + merge any NEW packages, keep admin's prices/stock.
    const existing = adminConfig.games[idx];
    const existingCodes = new Set((existing.packages || []).map((p) => String(p.providerCode || p.code).toLowerCase()));
    const newPkgs = packages.filter((p) => !existingCodes.has(String(p.providerCode).toLowerCase()));
    adminConfig.games[idx] = {
      ...existing,
      name: entry.name,
      image: existing.image || entry.image,
      banner: existing.banner || entry.banner,
      fields: existing.fields && existing.fields.length ? existing.fields : fields,
      packages: [...(existing.packages || []), ...newPkgs],
    };
    saveAdminConfig();
    return adminConfig.games[idx];
  }

  adminConfig.games.push(entry);
  saveAdminConfig();
  return entry;
}

// Remove a game entirely (used to delete an imported game).
export function removeGame(gameId) {
  const target = String(gameId || '').trim().toLowerCase();
  const before = adminConfig.games.length;
  adminConfig.games = adminConfig.games.filter((g) =>
    !(String(g.id || '').toLowerCase() === target || String(g.providerCode || '').toLowerCase() === target)
  );
  if (adminConfig.games.length !== before) {
    saveAdminConfig();
    return true;
  }
  return false;
}



// Game Stock & Logo Update
export async function updateGameConfig(gameId, updateData = {}) {
  const target = String(gameId || '').trim().toLowerCase();
  const idx = adminConfig.games.findIndex((g) =>
    String(g.id || '').toLowerCase() === target ||
    String(g.slug || '').toLowerCase() === target ||
    String(g.providerCode || '').toLowerCase() === target ||
    String(g.code || '').toLowerCase() === target ||
    String(g.name || '').toLowerCase() === target
  );

  if (idx === -1) return null;

  const current = adminConfig.games[idx];
  const fallbackImg = getDefaultGameImageForId(current.id || current.slug);
  const fallbackBan = getDefaultBannerForSlug(current.slug || current.id);
  const nextImage = updateData.image !== undefined
    ? resolveValidAssetUrl(updateData.image, resolveValidAssetUrl(current.image, fallbackImg))
    : resolveValidAssetUrl(current.image, fallbackImg);
  const nextBanner = updateData.banner !== undefined
    ? resolveValidAssetUrl(updateData.banner, resolveValidAssetUrl(current.banner, fallbackBan))
    : resolveValidAssetUrl(current.banner, fallbackBan);

  adminConfig.games[idx] = {
    ...current,
    name: updateData.name || current.name,
    image: nextImage,
    banner: nextBanner,
    badge: updateData.badge || current.badge,
    stockOpen: typeof updateData.stockOpen === 'boolean' ? updateData.stockOpen : current.stockOpen,
    maintenance: typeof updateData.maintenance === 'boolean' ? updateData.maintenance : (current.maintenance || false),
    // RosAngkor Game ID (admin-settable) — enables RoS Angkor auto-delivery.
    providerGid: updateData.providerGid !== undefined ? String(updateData.providerGid).trim() : current.providerGid,
  };

  await saveAdminConfig();
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



// Contact Settings & Website Brand Logo
export function updateSiteLogo(newLogoStr) {
  const resolvedLogo = resolveValidAssetUrl(newLogoStr, '/assets/brand/yurigame-logo.png');
  adminConfig.siteLogo = resolvedLogo;
  adminConfig.contacts = {
    ...(adminConfig.contacts || DEFAULT_CONTACTS),
    siteLogo: resolvedLogo,
    telegramBotToken: '',
  };
  saveAdminConfig();
  return resolvedLogo;
}

export function updateContactSettings(newContacts = {}) {
  const current = adminConfig.contacts || DEFAULT_CONTACTS;
  const username = newContacts.telegramUsername !== undefined
    ? normalizeTelegramUsername(newContacts.telegramUsername, current.telegramUsername || '@Yur1Uchiha')
    : (current.telegramUsername || '@Yur1Uchiha');

  const rawUrl = newContacts.telegramUrl !== undefined ? newContacts.telegramUrl : current.telegramUrl;
  const url = normalizeTelegramUrl(rawUrl, username);
  const nextSiteLogo = newContacts.siteLogo !== undefined
    ? resolveValidAssetUrl(newContacts.siteLogo, '/assets/brand/yurigame-logo.png')
    : resolveValidAssetUrl(adminConfig.siteLogo || current.siteLogo, '/assets/brand/yurigame-logo.png');

  adminConfig.siteLogo = nextSiteLogo;
  adminConfig.contacts = {
    ...current,
    siteLogo: nextSiteLogo,
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
  const slug = bannerData.gameSlug || 'mobile-legends';
  const fallbackImg = getDefaultBannerForSlug(slug);
  const newBanner = {
    id: bannerData.id || `banner_${Date.now()}`,
    title: bannerData.title || 'Special Promotion',
    subtitle: bannerData.subtitle || 'Limited time top-up offers',
    actionLabel: bannerData.actionLabel || 'Shop Now',
    image: resolveValidAssetUrl(bannerData.image, fallbackImg),
    gameSlug: slug,
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
  const nextSlug = updateData.gameSlug || current.gameSlug || 'mobile-legends';
  const fallbackImg = getDefaultBannerForSlug(nextSlug);
  const nextImage = updateData.image !== undefined
    ? resolveValidAssetUrl(updateData.image, resolveValidAssetUrl(current.image, fallbackImg))
    : resolveValidAssetUrl(current.image, fallbackImg);

  adminConfig.banners[idx] = {
    ...current,
    title: updateData.title || current.title,
    subtitle: updateData.subtitle || current.subtitle,
    actionLabel: updateData.actionLabel || current.actionLabel,
    image: nextImage,
    gameSlug: nextSlug,
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



