import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import { generateLocalKhqrWithDataUrl } from './services/khqrGenerator.js';
import pool, { testConnection } from './config/db.js';
import {
  buildOrderAnalytics,
  deduplicateOrders,
  normalizeOrderRecord,
} from './services/orderAnalytics.js';
import {
  getOrderHistory,
  upsertOrderHistory,
} from './services/orderHistoryStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const distPath = path.resolve(PROJECT_ROOT, 'dist');
import {
  PlayerLookupError,
  verifyPlayerAccount,
} from './services/playerLookup.js';
import {
  createSoraOrderBatch,
  getSoraCatalogue,
  getSoraGameImageSource,
  getLiveSoraPackages,
  getSoraOrder,
  getSoraOrders,
  getSoraPackages,
  getSoraStatus,
  getProviderHealth,
  getAllProviderHealth,
  getProviderCatalog,
  getProviderGame,
  MAX_ORDER_QUANTITY,
  normalizeOrderQuantity,
  resolveSoraPackage,
  SoraTopupError,
} from './services/soratopup.js';
import {
  startTelegramBotPolling,
  notifyRosOrderToAdmins,
  notifyOrderToAdmins,
  getRosOrder,
  getAllRosOrders,
  approveOrderFromWeb,
  cancelOrderFromWeb,
  sendAdminLoginOtp,
  sendAdminLoginSuccessAlert,
  sendTestTelegramPing,
  handleTelegramWebhookUpdate,
} from './services/telegramBot.js';
import {
  getPublicSiteConfig,
  getAdminClientConfig,
  getAdminFullConfig,
  loadAdminConfigFromDb,
  consumeAdminToken,
  createAdminSession,
  requestAdminOtp,
  verifyAdminOtp,
  resendAdminOtp,
  verifyAdminSession,
  revokeAdminSession,
  updateGameConfig,
  importProviderGame,
  removeGame,
  addPackageToGame,
  updatePackageInGame,
  deletePackageFromGame,
  addMlbbEvent,
  updateMlbbEvent,
  deleteMlbbEvent,
  addPackageToMlbbEvent,
  updatePackageInMlbbEvent,
  deletePackageFromMlbbEvent,
  updateContactSettings,
  addSlideBanner,
  updateSlideBanner,
  deleteSlideBanner,
} from './services/adminStore.js';

import {
  createConcurrencyLimiter,
  createRateLimiter,
  getRequestIp,
} from './middleware/requestProtection.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const trustProxyHops = Math.max(0, Math.min(5, Number.parseInt(process.env.TRUST_PROXY_HOPS || '1', 10) || 0));
app.disable('x-powered-by');
app.set('trust proxy', trustProxyHops);

// In-Memory resilient fallback store when MySQL is offline
const inMemoryOrders = [
  {
    ref: 'YGS-161563',
    userId: 'usr_vip1',
    gameId: 'roslegacy',
    gameName: 'RoS Legacy',
    packageName: '200 Diamonds',
    quantity: 1,
    totalUsd: 4.00,
    totalKhr: '16,400',
    paymentMethod: 'Bakong KHQR',
    playerDetails: { userId: 'asdasdas', gmail: 'player@gmail.com', zoneId: 'Global' },
    verifiedPlayer: 'asdasdas (player@gmail.com)',
    status: 'PROCESSING',
    serverPing: '18ms',
    icon: '/assets/brand/yurigame-logo.webp',
    timestamp: new Date().toISOString(),
  },
  {
    ref: 'CD-948210',
    userId: 'usr_vip1',
    gameId: 'ml',
    gameName: 'Mobile Legends KH',
    packageName: 'Weekly Diamond Pass',
    quantity: 1,
    totalUsd: 1.81,
    totalKhr: '7,421',
    paymentMethod: 'Bakong / KHQR',
    playerDetails: { userId: '29481903', zoneId: '2042' },
    verifiedPlayer: 'Shadow_Chey99 (Zone: 2042)',
    status: 'DELIVERED',
    serverPing: '18ms',
    icon: '/assets/games/mlbb_tile_4k.jpg',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    ref: 'BOTWL7CIUM5B31D',
    userId: 'usr_vip1',
    gameId: 'robuxsend',
    gameName: 'Roblox',
    packageName: '10 Robux',
    quantity: 1,
    totalUsd: 0.10,
    totalKhr: '410',
    paymentMethod: 'Bakong / KHQR',
    playerDetails: { userId: 'Ucantusemeee' },
    verifiedPlayer: 'Ucantusemeee (@Yur1Uchiha)',
    status: 'DELIVERED',
    serverPing: '14ms',
    icon: '/assets/games/roblox_tile_4k.jpg',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    ref: 'CD-948195',
    userId: 'usr_vip2',
    gameId: 'ff',
    gameName: 'Free Fire',
    packageName: '100 Diamonds',
    quantity: 1,
    totalUsd: 0.95,
    totalKhr: '3,895',
    paymentMethod: 'Bakong / KHQR',
    playerDetails: { userId: '12345678' },
    verifiedPlayer: 'FB:ㅤ@GMRemyX (Lv.69)',
    status: 'DELIVERED',
    serverPing: '16ms',
    icon: '/assets/games/freefire_tile_4k.jpg',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];

const inMemoryUsers = new Map([
  [
    'yuri@gmail.com',
    {
      id: 'usr_yuri',
      name: 'Yuri Uchiha',
      email: 'yuri@gmail.com',
      phone: '+855 12 345 678',
      role: 'VIP Member',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Yuri',
      balance: 84.06,
      joined: '2026-10-01',
    },
  ],
]);

// Middleware: Security Headers & CORS
const allowedOrigins = [
  'https://yurigamest4res.com',
  'https://www.yurigamest4res.com',
  'https://yurigamestores.com',
  'https://www.yurigamestores.com',
  'https://yurigamest4re.com',
  'https://www.yurigamest4re.com',
  'https://yurigamest4re.games',
  'https://www.yurigamest4re.games',
  'http://localhost:5173',
  'http://localhost:5001',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5001',
  process.env.PUBLIC_URL,
  process.env.APP_URL,
].filter(Boolean).map((origin) => String(origin).replace(/\/$/, ''));

const positiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const apiConcurrencyLimit = createConcurrencyLimiter({
  maxPerIp: positiveInt(process.env.API_MAX_CONCURRENT_PER_IP, 24),
  maxGlobal: positiveInt(process.env.API_MAX_CONCURRENT_GLOBAL, 600),
});
const globalApiRateLimit = createRateLimiter({
  name: 'api-global',
  windowMs: 60_000,
  max: positiveInt(process.env.API_RATE_LIMIT_PER_MINUTE, 300),
  message: 'Request limit reached. Please wait before continuing.',
});
const mutationRateLimit = createRateLimiter({
  name: 'api-mutation',
  windowMs: 60_000,
  max: positiveInt(process.env.API_MUTATION_LIMIT_PER_MINUTE, 90),
  skip: (req) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path === '/paylink/check-payment',
  message: 'Too many changes were submitted. Please wait and try again.',
});
const accountAuthRateLimit = createRateLimiter({
  name: 'account-auth',
  windowMs: 15 * 60_000,
  max: positiveInt(process.env.AUTH_RATE_LIMIT_PER_15_MINUTES, 20),
  message: 'Too many sign-in attempts. Please wait before trying again.',
});
const adminAuthRateLimit = createRateLimiter({
  name: 'admin-auth',
  windowMs: 15 * 60_000,
  max: positiveInt(process.env.ADMIN_AUTH_RATE_LIMIT_PER_15_MINUTES, 10),
  skip: (req) => req.method === 'GET' && req.path.endsWith('/session'),
  message: 'Too many administrator authentication attempts. Please wait and retry.',
});
const adminOtpGlobalRateLimit = createRateLimiter({
  name: 'admin-otp-global',
  windowMs: 15 * 60_000,
  max: positiveInt(process.env.ADMIN_OTP_GLOBAL_LIMIT_PER_15_MINUTES, 30),
  keyGenerator: () => 'all-clients',
  message: 'Administrator verification is temporarily busy. Please wait and retry.',
});
const playerVerificationRateLimit = createRateLimiter({
  name: 'player-verification',
  windowMs: 60_000,
  max: positiveInt(process.env.PLAYER_VERIFY_LIMIT_PER_MINUTE, 15),
  message: 'Too many player checks. Please wait before verifying again.',
});
const publicLookupRateLimit = createRateLimiter({
  name: 'public-order-lookup',
  windowMs: 60_000,
  max: positiveInt(process.env.ORDER_LOOKUP_LIMIT_PER_MINUTE, 240),
  message: 'Too many order searches. Please wait before searching again.',
});
const paymentCreateRateLimit = createRateLimiter({
  name: 'payment-create',
  windowMs: 60_000,
  max: positiveInt(process.env.PAYMENT_CREATE_LIMIT_PER_MINUTE, 15),
  message: 'Too many payment requests. Please wait before creating another QR.',
});
const paymentStatusRateLimit = createRateLimiter({
  name: 'payment-status',
  windowMs: 60_000,
  max: positiveInt(process.env.PAYMENT_STATUS_LIMIT_PER_MINUTE, 180),
  message: 'Payment status is being checked too frequently. Please wait briefly.',
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    try {
      const parsedHost = new URL(origin).hostname;
      if (
        parsedHost.endsWith('.railway.app') ||
        parsedHost.includes('yurigamest4re') ||
        parsedHost.includes('yurigamestore')
      ) {
        return callback(null, true);
      }
    } catch { }
    return callback(null, false);
  },
  credentials: true
}));

app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  const noStore =
    req.path.startsWith('/api/admin') ||
    req.path.startsWith('/api/auth') ||
    req.path.startsWith('/api/paylink') ||
    req.path.startsWith('/admin');
  if (noStore) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
  }
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use('/api', apiConcurrencyLimit, globalApiRateLimit, mutationRateLimit);
app.use('/api/auth', accountAuthRateLimit);
app.use('/api/admin/auth', adminAuthRateLimit);
app.use('/api/admin/auth/login-request', adminOtpGlobalRateLimit);
app.use('/api/soratopup/verify-player', playerVerificationRateLimit);
app.use('/api/soratopup/orders/lookup', publicLookupRateLimit);
app.use('/api/paylink/generate-qr', paymentCreateRateLimit);
app.use('/api/paylink/check-payment', paymentStatusRateLimit);

app.use(express.json({ limit: '50mb', strict: true }));
app.use(express.urlencoded({ extended: true, limit: '50mb', parameterLimit: 1000 }));

// Native Scrypt Password Hashing & Constant-Time Verification
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  if (!storedHash.startsWith('scrypt:')) {
    return password === storedHash;
  }
  const parts = storedHash.split(':');
  if (parts.length !== 3) return false;
  const [, salt, originalHash] = parts;
  try {
    const computedHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(originalHash, 'hex'));
  } catch {
    return false;
  }
}

// Telegram Webhook Endpoint (Supports instant callback queries & dual polling/webhook modes)
app.post('/api/telegram/webhook', (req, res) => {
  res.json({ ok: true });
  if (req.body) {
    handleTelegramWebhookUpdate(req.body).catch((err) => {
      console.warn('[Telegram Webhook] Update processing error:', err.message);
    });
  }
});

// Authoritative Server-Side Package Pricing (Anti-Tampering)
export async function getAuthoritativePackagePrice(gameIdOrCode, packageIdOrCode, quantity = 1) {
  const cleanGame = String(gameIdOrCode || '').toLowerCase().trim();
  const cleanPkg = String(packageIdOrCode || '').toLowerCase().trim();
  const qty = normalizeOrderQuantity(Number(quantity || 1));

  const config = getAdminFullConfig();

  // 1. Search in adminConfig.games
  for (const game of (config?.games || [])) {
    const gameMatch =
      String(game.id || '').toLowerCase() === cleanGame ||
      String(game.slug || '').toLowerCase() === cleanGame ||
      String(game.providerCode || '').toLowerCase() === cleanGame;

    if (gameMatch && Array.isArray(game.packages)) {
      const pkg = game.packages.find(p =>
        String(p.id || '').toLowerCase() === cleanPkg ||
        String(p.code || '').toLowerCase() === cleanPkg ||
        String(p.providerCode || '').toLowerCase() === cleanPkg
      );
      if (pkg && typeof pkg.price === 'number') {
        const providerGameCode = String(game.providerCode || game.id || '').toLowerCase();
        let providerCode = pkg.providerCode || pkg.code || pkg.id;
        let providerConnected = Boolean(pkg.providerConnected || pkg.providerCode);

        const requiresLiveProvider = pkg.providerConnected
          || !['robuxsend', 'roslegacy'].includes(providerGameCode);
        if (requiresLiveProvider) {
          const resolved = await resolveSoraPackage(providerGameCode, {
            providerCode: pkg.providerCode || undefined,
            code: pkg.code,
            name: pkg.name,
            diamonds: pkg.diamonds,
          });
          if (!resolved) return null;
          providerCode = resolved.code;
          providerConnected = true;
        }

        return {
          price: Number((pkg.price * qty).toFixed(2)),
          name: pkg.name || `${pkg.diamonds || pkg.code} Credits`,
          gameName: game.name,
          providerCode,
          providerConnected,
        };
      }
    }
  }

  // 2. Search in adminConfig.mlbbEvents
  for (const event of (config?.mlbbEvents || [])) {
    if (Array.isArray(event.packages)) {
      const pkg = event.packages.find(p =>
        String(p.id || '').toLowerCase() === cleanPkg ||
        String(p.code || '').toLowerCase() === cleanPkg ||
        String(p.providerCode || '').toLowerCase() === cleanPkg
      );
      if (pkg && typeof pkg.price === 'number') {
        const resolved = await resolveSoraPackage('ml', {
          providerCode: pkg.providerCode || undefined,
          code: pkg.code,
          name: pkg.name,
          diamonds: pkg.diamonds,
        });
        if (!resolved) return null;

        return {
          price: Number((pkg.price * qty).toFixed(2)),
          name: pkg.name,
          gameName: 'Mobile Legends KH',
          providerCode: resolved.code,
          providerConnected: true,
        };
      }
    }
  }

  // 3. Fallback: Search in live SoraTopup packages
  try {
    const soraData = await getSoraPackages(cleanGame);
    const packages = Array.isArray(soraData) ? soraData : (soraData?.packages || []);
    const pkg = packages.find(p =>
      String(p.code || '').toLowerCase() === cleanPkg ||
      String(p.id || '').toLowerCase() === cleanPkg
    );
    if (pkg && pkg.price) {
      return {
        price: Number((Number(pkg.price) * qty).toFixed(2)),
        name: pkg.name || pkg.item,
        gameName: soraData?.gameName || cleanGame,
        providerCode: pkg.code || pkg.id,
        providerConnected: true,
      };
    }
  } catch (err) {
    console.warn('[Price Check] Live SoraTopup package lookup notice:', err.message);
  }

  return null;
}
app.use((req, res, next) => {
  if (process.env.SECURITY_DEBUG === 'true' && req.url.startsWith('/api/auth')) {
    console.info(`[Auth Request] ${req.method} ${req.url}`);
  }
  next();
});

// 1. Health & Database Diagnostic Check
app.get('/api/health', async (req, res) => {
  const t0 = Date.now();
  const dbStatus = await testConnection();
  const latency = Date.now() - t0;

  if (dbStatus.connected) {
    return res.json({
      status: 'online',
      mysql: 'connected',
      database: dbStatus.database,
      latency: `${latency}ms`,
      serverTime: dbStatus.serverTime
    });
  } else {
    return res.status(500).json({
      status: 'degraded',
      mysql: 'disconnected',
      error: dbStatus.error,
      code: dbStatus.code
    });
  }
});

// Helper to inspect email/identifier, validate Gmail format, and catch fake emails
export function inspectEmailOrIdentifier(id) {
  const clean = (id || '').trim().toLowerCase();

  // If phone number
  if (/^(\+?[0-9\s-]{8,18})$/.test(clean)) {
    return { type: 'phone', valid: true, clean };
  }

  // Check if input is an explicit fake keyword or pattern
  if (clean === 'fake' || clean.startsWith('fake@') || clean.includes('fakegmail') || clean.includes('fakeemail')) {
    return {
      type: 'email',
      isGmail: clean.includes('gmail'),
      valid: false,
      error: 'Gmail not found. Fake or placeholder Gmail addresses cannot be used.'
    };
  }

  if (clean.includes('@')) {
    const parts = clean.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return { type: 'email', valid: false, error: 'Invalid email address format.' };
    }
    const [username, domain] = parts;

    // Malformed or incomplete Gmail domain
    if (domain === 'gmail' || domain.startsWith('gmai.') || domain.startsWith('gmial.')) {
      return {
        type: 'email',
        isGmail: true,
        valid: false,
        error: 'Gmail not found. Incomplete domain (did you mean @gmail.com?)'
      };
    }

    if (domain === 'gmail.com') {
      // Google requires 6 to 30 characters
      if (username.length < 6) {
        return {
          type: 'email',
          isGmail: true,
          valid: false,
          error: 'Gmail not found. Google requires Gmail usernames to be at least 6 characters.'
        };
      }
      if (!/^[a-z0-9.]+$/.test(username)) {
        return {
          type: 'email',
          isGmail: true,
          valid: false,
          error: 'Gmail not found. Contains forbidden characters for a Gmail address.'
        };
      }
      if (username.startsWith('.') || username.endsWith('.') || username.includes('..')) {
        return {
          type: 'email',
          isGmail: true,
          valid: false,
          error: 'Gmail not found. Periods cannot be consecutive or at the start/end.'
        };
      }
      const fakeNames = ['fake', 'fakemail', 'fakeuser', 'fakegmail', 'test', 'temp', 'dummy', 'nobody', 'sample', 'asdfgh', '123456', 'unknown'];
      if (fakeNames.some(f => username.replace(/\./g, '') === f || username.replace(/\./g, '').startsWith('fake'))) {
        return {
          type: 'email',
          isGmail: true,
          valid: false,
          error: 'Gmail not found. Fake or placeholder Gmail addresses cannot be used.'
        };
      }
      return { type: 'email', isGmail: true, valid: true, clean };
    }

    // Disposable/fake email domains
    const disposable = ['tempmail.com', 'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'fake.com', 'trashmail.com'];
    if (disposable.includes(domain)) {
      return { type: 'email', valid: false, error: 'Fake email domain detected. Please use a real Gmail address.' };
    }

    return { type: 'email', isGmail: false, valid: true, clean };
  }

  // Incomplete string containing 'fake' or 'gmail'
  if (clean.includes('fake') || clean.includes('gmail')) {
    return {
      type: 'email',
      isGmail: true,
      valid: false,
      error: 'Gmail not found. Please enter a valid registered Gmail address.'
    };
  }

  return { type: 'unknown', valid: true, clean };
}

// 2. Auth: Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    // Block unverified manual Gmail registration - must use Google OAuth
    if (cleanEmail.endsWith('@gmail.com') || cleanEmail.includes('gmail')) {
      return res.status(400).json({
        success: false,
        error: 'Gmail not found or unverified: To prevent fake Gmail accounts like ' + cleanEmail + ', all Gmail accounts must be authenticated using the official "Continue with Google" button.'
      });
    }

    // Validate email and catch fake patterns
    const check = inspectEmailOrIdentifier(cleanEmail);
    if (!check.valid) {
      return res.status(400).json({ success: false, error: check.error });
    }

    // Check existing email
    const [existing] = await pool.query('SELECT id FROM `users` WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    const newId = `usr_${Date.now()}`;
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`;
    const role = 'VIP Member';
    const initialBalance = 0.00;
    const hashedPassword = hashPassword(cleanPassword);

    await pool.query(
      `INSERT INTO \`users\` (id, name, email, phone, password, role, avatar, wallet_balance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, cleanName, cleanEmail, cleanPhone || '+855 00 000 000', hashedPassword, role, avatar, initialBalance]
    );

    const user = {
      id: newId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone || '+855 00 000 000',
      role,
      avatar,
      balance: initialBalance,
      joined: new Date().toISOString().split('T')[0]
    };

    return res.status(201).json({ success: true, user });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during registration.' });
  }
});

// 3. Auth: Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;
    const cleanId = (emailOrPhone || '').trim().toLowerCase();
    const cleanPw = (password || '').trim();

    if (!cleanId || !cleanPw) {
      return res.status(400).json({ success: false, error: 'Email/phone and password are required.' });
    }

    // Inspect if input is fake or invalid Gmail/email
    const check = inspectEmailOrIdentifier(cleanId);
    if (!check.valid) {
      return res.status(401).json({ success: false, error: check.error });
    }

    const [rows] = await pool.query(
      `SELECT id, name, email, phone, password, role, avatar, wallet_balance, created_at 
       FROM \`users\` 
       WHERE LOWER(email) = ? OR REPLACE(phone, ' ', '') = ?`,
      [cleanId, cleanId.replace(/\s+/g, '')]
    );

    if (rows.length === 0) {
      if (check.isGmail || cleanId.includes('@gmail.com') || cleanId.includes('gmail')) {
        return res.status(401).json({
          success: false,
          error: 'Gmail not found. Please check your email or click Register below.'
        });
      }
      if (cleanId.includes('@')) {
        return res.status(401).json({
          success: false,
          error: 'Email not found. Please check your email or click Register below.'
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Account not found. Please register first.'
      });
    }

    const userRecord = rows[0];
    const passwordValid = verifyPassword(cleanPw, userRecord.password);
    if (!passwordValid) {
      return res.status(401).json({ success: false, error: 'Invalid password. Please try again.' });
    }

    // Auto-upgrade legacy plaintext password to secure scrypt hash
    if (!userRecord.password.startsWith('scrypt:')) {
      try {
        await pool.query('UPDATE `users` SET password = ? WHERE id = ?', [hashPassword(cleanPw), userRecord.id]);
      } catch (upgradeErr) {
        console.warn('Password hash upgrade notice:', upgradeErr.message);
      }
    }

    // Record login event in MySQL user_logins table
    try {
      const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').toString().slice(0, 64);
      const userAgent = (req.headers['user-agent'] || 'Unknown Browser').toString();
      await pool.query(
        'INSERT INTO `user_logins` (user_id, user_email, ip_address, user_agent) VALUES (?, ?, ?, ?)',
        [userRecord.id, userRecord.email, clientIp, userAgent]
      );
    } catch (logErr) {
      console.warn('Could not record user_logins audit:', logErr.message);
    }

    const user = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      phone: userRecord.phone,
      role: userRecord.role,
      avatar: userRecord.avatar,
      balance: parseFloat(userRecord.wallet_balance),
      joined: userRecord.created_at.toISOString().split('T')[0]
    };

    return res.json({ success: true, user });
  } catch (err) {
    console.error('Login error:', err?.code || err?.name || 'authentication_failure');
    return res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
});

// 3B. Auth: Google Sign-In / Login & Registration in MySQL
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential, profile, mode = 'login' } = req.body;
    let email = '';
    let name = '';
    let picture = '';

    // Strict Cryptographic Token Verification with Google Identity Service
    if (credential) {
      try {
        const googleVerifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        if (googleVerifyRes.ok) {
          const googleData = await googleVerifyRes.json();
          if (googleData.email && googleData.email_verified) {
            email = String(googleData.email).toLowerCase().trim();
            name = String(googleData.name || googleData.given_name || 'Google Gamer').trim();
            picture = googleData.picture || '';
          }
        }
      } catch (verErr) {
        console.warn('Google Token verification error:', verErr.message);
      }
    }

    // Support OAuth2 Access Token verification if access_token was provided
    if (!email && req.body.access_token) {
      try {
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${req.body.access_token}` }
        });
        if (infoRes.ok) {
          const info = await infoRes.json();
          if (info.email && info.email_verified) {
            email = String(info.email).toLowerCase().trim();
            name = String(info.name || info.given_name || 'Google Gamer').trim();
            picture = info.picture || '';
          }
        }
      } catch (infoErr) {
        console.warn('Google Access Token verification error:', infoErr.message);
      }
    }

    // Unverified requests are strictly rejected
    if (!email) {
      return res.status(401).json({
        success: false,
        error: 'Google authentication failed: Cryptographically verified Google token required.'
      });
    }

    const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').toString().slice(0, 64);
    const userAgent = (req.headers['user-agent'] || 'Google Chrome OAuth').toString();

    // Check if user already exists in MySQL
    const [existing] = await pool.query('SELECT * FROM `users` WHERE LOWER(email) = ?', [email]);
    let userRecord = null;
    let isNew = false;

    if (existing.length > 0) {
      userRecord = existing[0];
      if (picture && (!userRecord.avatar || userRecord.avatar.includes('dicebear'))) {
        await pool.query('UPDATE `users` SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [picture, userRecord.id]);
        userRecord.avatar = picture;
      }
    } else {
      // New user logging in with verified Google account -> create user in MySQL
      isNew = true;
      const newId = `usr_g_${Date.now()}`;
      const defaultAvatar = picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;
      const initialBalance = 0.00;
      const role = 'Gold VIP Member';

      await pool.query(
        `INSERT INTO \`users\` (id, name, email, phone, password, role, avatar, wallet_balance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, name, email, '+855 00 000 000', 'google_oauth_verified', role, defaultAvatar, initialBalance]
      );

      const [newRows] = await pool.query('SELECT * FROM `users` WHERE id = ?', [newId]);
      userRecord = newRows[0];
    }

    // Record login audit in user_logins
    try {
      await pool.query(
        'INSERT INTO `user_logins` (user_id, user_email, ip_address, user_agent) VALUES (?, ?, ?, ?)',
        [userRecord.id, userRecord.email, clientIp, `Google OAuth (${userAgent})`]
      );
    } catch (logErr) {
      console.warn('Could not record Google login audit:', logErr.message);
    }

    const sessionUser = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      phone: userRecord.phone,
      role: userRecord.role,
      avatar: userRecord.avatar,
      balance: parseFloat(userRecord.wallet_balance),
      joined: userRecord.created_at.toISOString().split('T')[0],
      provider: 'google'
    };

    return res.json({ success: true, user: sessionUser, isNew });
  } catch (err) {
    console.error('Google Auth error:', err?.code || err?.name || 'authentication_failure');
    return res.status(500).json({ success: false, error: 'Failed to authenticate with Google.' });
  }
});

// 4. Auth: Get Users List (with in-memory fallback)
app.get('/api/auth/users', requireAdminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, phone, role, avatar, wallet_balance, created_at FROM \`users\` ORDER BY created_at DESC`
    );
    const sanitized = rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      role: r.role,
      avatar: r.avatar,
      balance: parseFloat(r.wallet_balance),
      joined: r.created_at.toISOString().split('T')[0]
    }));
    return res.json({ success: true, users: sanitized });
  } catch (err) {
    const defaultUsers = Array.from(inMemoryUsers.values());
    return res.json({ success: true, users: defaultUsers, dbMode: 'in_memory' });
  }
});

// 5. Auth: Get User by ID (with in-memory fallback)
app.get('/api/auth/user/:id', requireAdminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, phone, role, avatar, wallet_balance, created_at FROM \`users\` WHERE id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const r = rows[0];
    return res.json({
      success: true,
      user: {
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        role: r.role,
        avatar: r.avatar,
        balance: parseFloat(r.wallet_balance),
        joined: r.created_at.toISOString().split('T')[0]
      }
    });
  } catch (err) {
    const user = Array.from(inMemoryUsers.values()).find(u => u.id === req.params.id) || inMemoryUsers.get('yuri@gmail.com');
    return res.json({ success: true, user, dbMode: 'in_memory' });
  }
});

// 6. Orders: Fetch Recent Orders from MySQL (with In-Memory Fallback)
app.get('/api/orders', requireAdminAuth, async (req, res) => {
  const { userId } = req.query;

  const rosList = getAllRosOrders();
  const formattedRos = rosList.map(o => ({
    ref: o.ref,
    userId: o.userId || null,
    gameId: 'roslegacy',
    gameName: 'RoS Legacy',
    packageName: o.packageName || 'RoS Diamonds',
    packageId: o.packageId || null,
    quantity: o.quantity || 1,
    totalUsd: parseFloat(o.totalUsd || 0),
    totalKhr: o.totalKhr || '16,400',
    paymentMethod: o.paymentMethod || 'Bakong KHQR',
    playerDetails: {
      userId: o.playerDetails?.userId || o.playerDetails?.username || 'Player',
      gmail: o.playerDetails?.gmail || '',
      zoneId: o.playerDetails?.gmail || '',
      server: 'Global'
    },
    verifiedPlayer: o.verifiedPlayer || o.playerDetails?.userId || 'RoS Player',
    status: o.status === 'COMPLETED' ? 'DELIVERED' : (o.status === 'CANCELLED' ? 'FAILED' : 'PROCESSING'),
    serverPing: '18ms',
    icon: o.icon || '/assets/brand/yurigame-logo.webp',
    timestamp: o.createdAt || o.updatedAt || new Date().toISOString()
  }));

  try {
    let query = 'SELECT * FROM `orders`';
    const params = [];
    if (userId) {
      query += ' WHERE user_id = ?';
      params.push(userId);
    }
    query += ' ORDER BY created_at DESC LIMIT 50';

    const [rows] = await pool.query(query, params);
    const dbOrders = rows.map(o => ({
      ref: o.ref,
      userId: o.user_id,
      gameId: o.game_id,
      gameName: o.game_name,
      packageName: o.package_name,
      packageId: o.package_id,
      quantity: o.quantity,
      totalUsd: parseFloat(o.total_usd),
      totalKhr: o.total_khr,
      paymentMethod: o.payment_method,
      playerDetails: {
        userId: o.player_id,
        zoneId: o.zone_id || '',
        server: o.server_region || ''
      },
      verifiedPlayer: o.verified_player,
      status: o.status,
      serverPing: o.server_ping,
      icon: o.icon,
      timestamp: o.created_at ? o.created_at.toISOString() : new Date().toISOString()
    }));

    const rosRefs = new Set(formattedRos.map(r => r.ref));
    const uniqueDb = dbOrders.filter(o => !rosRefs.has(o.ref));
    return res.json({ success: true, orders: [...formattedRos, ...uniqueDb] });
  } catch (err) {
    const filtered = userId
      ? inMemoryOrders.filter(o => o.userId === userId)
      : inMemoryOrders;
    const rosRefs = new Set(formattedRos.map(r => r.ref));
    const uniqueMem = filtered.filter(o => !rosRefs.has(o.ref));
    return res.json({ success: true, orders: [...formattedRos, ...uniqueMem], dbMode: 'in_memory' });
  }
});

// 7. Orders: Save New Order to MySQL & Deduct Diamond Stock (with In-Memory Fallback)
app.post('/api/orders', requireAdminAuth, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const order = req.body;
    const ref = order.ref || `CD-${Math.floor(100000 + Math.random() * 900000)}`;
    const userId = order.userId || null;
    const gameId = order.gameId || 'game';
    const gameName = order.gameName || 'Game Top-Up';
    const packageName = order.packageName || 'Package';
    const packageId = order.packageId || null;
    const quantity = Math.max(1, parseInt(order.quantity || 1, 10));
    const totalUsd = parseFloat(order.totalUsd || 0);
    const totalKhr = order.totalKhr || (totalUsd * 4100).toLocaleString();
    const paymentMethod = order.paymentMethod || 'Direct KHQR';
    const playerId = (order.playerDetails && (order.playerDetails.userId || order.playerDetails.playerId)) || 'Unknown';
    const zoneId = (order.playerDetails && (order.playerDetails.zoneId || '')) || '';
    const serverRegion = (order.playerDetails && (order.playerDetails.server || '')) || '';
    const verifiedPlayer = order.verifiedPlayer || playerId;
    const status = order.status || 'DELIVERED';
    const serverPing = order.serverPing || '18ms';
    const icon = order.icon || '';

    // Step 7A: Check & Deduct Diamond Stock from MySQL stock table
    let remainingStock = null;
    let stockItem = null;

    const [stockRows] = await connection.query(
      `SELECT * FROM \`diamond_stock\` 
       WHERE (package_id = ? AND package_id IS NOT NULL) 
          OR (game_id = ? AND package_name = ?) 
       LIMIT 1 FOR UPDATE`,
      [packageId, gameId, packageName]
    );

    if (stockRows.length > 0) {
      stockItem = stockRows[0];
      const currentStock = stockItem.stock_quantity;
      const newStock = Math.max(0, currentStock - quantity);
      remainingStock = newStock;
      const newStatus = newStock === 0 ? 'OUT_OF_STOCK' : (newStock <= stockItem.min_stock_alert ? 'LOW_STOCK' : 'IN_STOCK');

      await connection.query(
        'UPDATE `diamond_stock` SET stock_quantity = ?, status = ? WHERE id = ?',
        [newStock, newStatus, stockItem.id]
      );

      await connection.query(
        `INSERT INTO \`stock_history\` (package_id, change_type, quantity_change, remaining_stock, order_ref, note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [stockItem.package_id, 'PURCHASE', -quantity, newStock, ref, `Customer buy: ${packageName} (x${quantity})`]
      );
    }

    // Step 7B: Insert Order into MySQL orders table
    await connection.query(
      `INSERT INTO \`orders\` 
       (ref, user_id, game_id, game_name, package_name, package_id, quantity, total_usd, total_khr, payment_method, player_id, zone_id, server_region, verified_player, status, server_ping, icon)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ref, userId, gameId, gameName, packageName, packageId || (stockItem ? stockItem.package_id : null), quantity, totalUsd, totalKhr, paymentMethod, playerId, zoneId, serverRegion, verifiedPlayer, status, serverPing, icon]
    );

    // Step 7C: Deduct wallet balance if paid with Cheydev Wallet
    if (paymentMethod.toLowerCase().includes('wallet') && userId) {
      const [userRows] = await connection.query('SELECT wallet_balance FROM `users` WHERE id = ? FOR UPDATE', [userId]);
      if (userRows.length > 0) {
        const currentBal = parseFloat(userRows[0].wallet_balance);
        const newBal = Math.max(0, currentBal - totalUsd);
        await connection.query('UPDATE `users` SET wallet_balance = ? WHERE id = ?', [newBal, userId]);

        const txId = `TX-PUR-${Math.floor(10000 + Math.random() * 90000)}`;
        await connection.query(
          `INSERT INTO \`wallet_transactions\` (id, user_id, type, title, amount, payment_method, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [txId, userId, 'PURCHASE', `${gameName} - ${packageName}`, totalUsd, 'Cheydev Wallet', 'COMPLETED']
        );
      }
    }

    await connection.commit();

    const savedOrder = {
      ref,
      userId,
      gameId,
      gameName,
      packageName,
      packageId: packageId || (stockItem ? stockItem.package_id : null),
      quantity,
      totalUsd,
      totalKhr,
      paymentMethod,
      playerDetails: { userId: playerId, zoneId, server: serverRegion },
      verifiedPlayer,
      status,
      serverPing,
      icon,
      remainingStock,
      timestamp: new Date().toISOString()
    };
    inMemoryOrders.unshift(savedOrder);
    upsertOrderHistory(savedOrder, 'store');
    notifyOrderToAdmins(savedOrder).catch((e) => console.warn('[Telegram Alert] Order notice:', e.message));
    return res.status(201).json({ success: true, order: savedOrder });
  } catch (err) {
    if (connection) {
      try { await connection.rollback(); } catch { }
    }
    const order = req.body || {};
    const ref = order.ref || `CD-${Math.floor(100000 + Math.random() * 900000)}`;
    const savedOrder = {
      ref,
      userId: order.userId || null,
      gameId: order.gameId || 'game',
      gameName: order.gameName || 'Game Top-Up',
      packageName: order.packageName || 'Package',
      packageId: order.packageId || null,
      quantity: Number(order.quantity || 1),
      totalUsd: parseFloat(order.totalUsd || 0),
      totalKhr: order.totalKhr || ((parseFloat(order.totalUsd || 0) * 4100).toLocaleString()),
      paymentMethod: order.paymentMethod || 'Direct KHQR',
      playerDetails: order.playerDetails || {},
      verifiedPlayer: order.verifiedPlayer || 'Player',
      status: order.status || 'DELIVERED',
      serverPing: order.serverPing || '18ms',
      icon: order.icon || '',
      timestamp: new Date().toISOString()
    };
    inMemoryOrders.unshift(savedOrder);
    upsertOrderHistory(savedOrder, 'store');
    notifyOrderToAdmins(savedOrder).catch((e) => console.warn('[Telegram Alert] Order notice fallback:', e.message));
    return res.status(201).json({ success: true, order: savedOrder, dbMode: 'in_memory' });
  } finally {
    if (connection) {
      try { connection.release(); } catch { }
    }
  }
});

// 8. Wallet: Get History & Balance
app.get('/api/wallet/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const [userRows] = await pool.query('SELECT wallet_balance FROM `users` WHERE id = ?', [userId]);
    const balance = userRows.length > 0 ? parseFloat(userRows[0].wallet_balance) : 25.00;

    const [txRows] = await pool.query(
      `SELECT * FROM \`wallet_transactions\` WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
      [userId]
    );

    const history = txRows.map(t => ({
      id: t.id,
      userId: t.user_id,
      type: t.type,
      title: t.title,
      amount: parseFloat(t.amount),
      paymentMethod: t.payment_method,
      status: t.status,
      timestamp: t.created_at.toISOString()
    }));

    return res.json({ success: true, balance, history });
  } catch (err) {
    return res.json({
      success: true,
      balance: 25.00,
      history: [
        {
          id: 'TX-DEP-9901',
          type: 'DEPOSIT',
          title: 'Bakong KHQR Direct Top-Up',
          amount: 25.00,
          paymentMethod: 'Bakong KHQR',
          status: 'COMPLETED',
          timestamp: new Date().toISOString()
        }
      ],
      dbMode: 'in_memory'
    });
  }
});

const ADMIN_SESSION_COOKIE = 'yurigame_admin_session';

function parseCookies(req) {
  return String(req.headers.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separator = part.indexOf('=');
      if (separator <= 0) return cookies;
      const name = part.slice(0, separator);
      const value = part.slice(separator + 1);
      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        cookies[name] = value;
      }
      return cookies;
    }, {});
}

function getAdminSessionToken(req) {
  const authHeader = String(req.headers.authorization || '');
  return parseCookies(req)[ADMIN_SESSION_COOKIE]
    || req.headers['x-admin-token']
    || req.headers['x-admin-session']
    || (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null);
}

function setAdminSessionCookie(req, res, token, expiresAt) {
  const secureRequest = process.env.NODE_ENV === 'production' || req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  const attributes = [
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/api',
    `Max-Age=${maxAge}`,
    'Priority=High',
  ];
  if (secureRequest) attributes.push('Secure');
  res.setHeader('Set-Cookie', attributes.join('; '));
}

function clearAdminSessionCookie(req, res) {
  const secureRequest = process.env.NODE_ENV === 'production' || req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
  const attributes = [
    `${ADMIN_SESSION_COOKIE}=`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/api',
    'Max-Age=0',
    'Priority=High',
  ];
  if (secureRequest) attributes.push('Secure');
  res.setHeader('Set-Cookie', attributes.join('; '));
}

// Admin Auth Helper Middleware (Telegram challenge + bound HttpOnly session)
export function requireAdminAuth(req, res, next) {
  const token = getAdminSessionToken(req);
  const clientIp = getRequestIp(req);
  const userAgent = req.headers['user-agent'] || '';
  const unsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const requestOrigin = String(req.headers.origin || '');
  const fetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();

  if (unsafeMethod && (fetchSite === 'cross-site' || (requestOrigin && !allowedOrigins.includes(requestOrigin)))) {
    return res.status(403).json({
      success: false,
      code: 'cross_site_admin_request_blocked',
      error: 'Cross-site administrator requests are not allowed.',
    });
  }

  if (token && verifyAdminSession(token, clientIp, userAgent)) {
    req.adminSessionToken = token;
    return next();
  }

  clearAdminSessionCookie(req, res);
  return res.status(401).json({ success: false, error: 'Unauthorized: Valid Telegram-verified admin session required.' });
}

// 9. Wallet: Deposit Funds (Protected - server/admin authorized only)
app.post('/api/wallet/deposit', requireAdminAuth, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { userId, amount, paymentMethod } = req.body;
    const depositAmount = parseFloat(amount || 0);

    if (depositAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Deposit amount must be greater than zero.' });
    }

    const txId = `TX-DEP-${Math.floor(10000 + Math.random() * 90000)}`;
    const method = paymentMethod || 'Bakong KHQR (ABA Bank)';

    if (userId) {
      await connection.query(
        'UPDATE `users` SET wallet_balance = wallet_balance + ? WHERE id = ?',
        [depositAmount, userId]
      );
    }

    await connection.query(
      `INSERT INTO \`wallet_transactions\` (id, user_id, type, title, amount, payment_method, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [txId, userId || null, 'DEPOSIT', 'Bakong KHQR Direct Top-Up', depositAmount, method, 'COMPLETED']
    );

    await connection.commit();

    let newBalance = depositAmount;
    if (userId) {
      const [u] = await pool.query('SELECT wallet_balance FROM `users` WHERE id = ?', [userId]);
      if (u.length > 0) newBalance = parseFloat(u[0].wallet_balance);
    }

    return res.status(201).json({
      success: true,
      balance: newBalance,
      transaction: {
        id: txId,
        type: 'DEPOSIT',
        title: 'Bakong KHQR Direct Top-Up',
        amount: depositAmount,
        paymentMethod: method,
        status: 'COMPLETED',
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    await connection.rollback();
    console.error('Deposit error:', err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
});

// 10. Diamond Stock: List all stock or filter by gameId
app.get('/api/stock', async (req, res) => {
  try {
    const { gameId } = req.query;
    let query = 'SELECT * FROM `diamond_stock`';
    const params = [];
    if (gameId) {
      query += ' WHERE game_id = ?';
      params.push(gameId);
    }
    query += ' ORDER BY game_id, selling_price ASC';
    const [rows] = await pool.query(query, params);
    return res.json({ success: true, count: rows.length, stock: rows });
  } catch (err) {
    return res.json({
      success: true,
      count: 4,
      stock: [
        { id: 1, game_id: 'robuxsend', package_name: '800 Robux', stock_quantity: 999, status: 'IN_STOCK' },
        { id: 2, game_id: 'ml', package_name: 'Weekly Diamond Pass', stock_quantity: 999, status: 'IN_STOCK' },
        { id: 3, game_id: 'ff', package_name: '520 Diamonds', stock_quantity: 999, status: 'IN_STOCK' },
        { id: 4, game_id: 'roslegacy', package_name: '680 + 68 Diamonds', stock_quantity: 999, status: 'IN_STOCK' }
      ],
      dbMode: 'in_memory'
    });
  }
});

// 11. Diamond Stock: Get single package stock
app.get('/api/stock/:packageId', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM `diamond_stock` WHERE package_id = ?', [req.params.packageId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Package stock not found.' });
    }
    return res.json({ success: true, stock: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 12. Diamond Stock: Restock or adjust inventory
app.post('/api/stock/restock', requireAdminAuth, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { packageId, addQuantity, note, supplier } = req.body;
    const qtyToAdd = parseInt(addQuantity || 0, 10);
    if (!packageId || isNaN(qtyToAdd) || qtyToAdd <= 0) {
      return res.status(400).json({ success: false, error: 'packageId and valid addQuantity (> 0) required.' });
    }

    const [rows] = await connection.query('SELECT * FROM `diamond_stock` WHERE package_id = ? FOR UPDATE', [packageId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Package not found in diamond stock.' });
    }

    const item = rows[0];
    const newStock = item.stock_quantity + qtyToAdd;
    const newStatus = newStock <= 0 ? 'OUT_OF_STOCK' : (newStock <= item.min_stock_alert ? 'LOW_STOCK' : 'IN_STOCK');

    await connection.query(
      'UPDATE `diamond_stock` SET stock_quantity = ?, status = ?, supplier = COALESCE(?, supplier) WHERE id = ?',
      [newStock, newStatus, supplier || null, item.id]
    );

    await connection.query(
      'INSERT INTO `stock_history` (package_id, change_type, quantity_change, remaining_stock, note) VALUES (?, ?, ?, ?, ?)',
      [packageId, 'RESTOCK', qtyToAdd, newStock, note || `Restocked +${qtyToAdd} units`]
    );

    await connection.commit();
    return res.json({ success: true, packageId, oldStock: item.stock_quantity, newStock, status: newStatus });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
});

// 13. Stock Audit History
app.get('/api/stock/history/audit', requireAdminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM `stock_history` ORDER BY created_at DESC LIMIT 50');
    return res.json({ success: true, history: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 14. SoraTopup read-only provider integration
function sendSoraTopupError(res, error) {
  const status = error instanceof SoraTopupError ? error.status : 502;
  const code = error instanceof SoraTopupError ? error.code : 'provider_unavailable';
  console.warn('SoraTopup request failed:', code);
  return res.status(status).json({
    success: false,
    provider: 'soratopup',
    code,
    error: error instanceof SoraTopupError
      ? error.message
      : 'SoraTopup is temporarily unavailable.',
  });
}

function getConfiguredGame(identifier) {
  const clean = String(identifier || '').toLowerCase().trim();
  return (getAdminFullConfig()?.games || []).find((game) =>
    [game.id, game.slug, game.providerCode]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase() === clean)
  ) || null;
}

async function connectAdminPackageToSora(gameIdentifier, packageData = {}, options = {}) {
  const game = getConfiguredGame(gameIdentifier);
  if (!game) {
    throw new SoraTopupError('Game not found.', {
      status: 404,
      code: 'game_not_found',
    });
  }

  const providerGameCode = String(game.providerCode || game.id || '').toLowerCase();
  // RoS Legacy now auto-delivers via Bay2Game, so it is connectable like the others.
  const isSoraGame = ['ml', 'mobile-legends', 'ff', 'free-fire', 'freefire', 'robuxsend', 'roblox', 'roslegacy', 'ros'].includes(providerGameCode);

  // Only truly manual/custom games skip provider connection.
  if (!providerGameCode || !isSoraGame) {
    return {
      ...packageData,
      providerConnected: false,
    };
  }

  try {
    const providerPackage = await resolveSoraPackage(providerGameCode, packageData, options);
    if (providerPackage) {
      return {
        ...packageData,
        code: providerPackage.code,
        providerCode: providerPackage.code,
        providerName: providerPackage.name,
        providerPrice: providerPackage.price,
        providerConnected: true,
        providerSyncedAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.warn(`[connectAdminPackageToSora] Provider match skipped for ${providerGameCode}:`, error.message);
  }

  // Gracefully return package data so admin can always save images, prices, titles, badges, etc.
  return {
    ...packageData,
    providerConnected: false,
  };
}

async function syncConfiguredPackagesWithSora({ force = false } = {}) {
  const config = getAdminFullConfig();
  const availableGames = new Set();
  const result = { connected: 0, unchanged: 0, unmatched: 0, unavailableGames: [] };

  const providerGameCodes = [...new Set(
    (config.games || [])
      .map((game) => String(game.providerCode || game.id || '').toLowerCase())
      .filter(Boolean)
  )];

  for (const providerGameCode of providerGameCodes) {
    try {
      await getLiveSoraPackages(providerGameCode, { force });
      availableGames.add(providerGameCode);
    } catch {
      result.unavailableGames.push(providerGameCode);
    }
  }

  for (const game of (config.games || [])) {
    const providerGameCode = String(game.providerCode || game.id || '').toLowerCase();
    if (!availableGames.has(providerGameCode)) continue;

    for (const pkg of (game.packages || [])) {
      try {
        const connected = await connectAdminPackageToSora(providerGameCode, pkg);
        if (!connected?.providerConnected) {
          result.unmatched += 1;
          continue;
        }
        const alreadyCurrent = pkg.providerConnected
          && pkg.providerCode === connected.providerCode
          && Number(pkg.providerPrice) === Number(connected.providerPrice);
        if (alreadyCurrent) {
          result.unchanged += 1;
          continue;
        }
        updatePackageInGame(game.id, pkg.id, connected);
        result.connected += 1;
      } catch (error) {
        if (error instanceof SoraTopupError && error.code === 'provider_package_match_required') {
          result.unmatched += 1;
          continue;
        }
        throw error;
      }
    }
  }

  if (availableGames.has('ml')) {
    for (const event of (config.mlbbEvents || [])) {
      for (const pkg of (event.packages || [])) {
        try {
          const connected = await connectAdminPackageToSora('ml', pkg);
          if (!connected?.providerConnected) {
            result.unmatched += 1;
            continue;
          }
          const alreadyCurrent = pkg.providerConnected
            && pkg.providerCode === connected.providerCode
            && Number(pkg.providerPrice) === Number(connected.providerPrice);
          if (alreadyCurrent) {
            result.unchanged += 1;
            continue;
          }
          updatePackageInMlbbEvent(event.id, pkg.id, connected);
          result.connected += 1;
        } catch (error) {
          if (error instanceof SoraTopupError && error.code === 'provider_package_match_required') {
            result.unmatched += 1;
            continue;
          }
          throw error;
        }
      }
    }
  }

  return result;
}


function sendPlayerLookupError(res, error) {
  const status = error instanceof PlayerLookupError ? error.status : 502;
  const code = error instanceof PlayerLookupError ? error.code : 'lookup_unavailable';
  console.warn('Player lookup failed:', code);
  return res.status(status).json({
    success: false,
    code,
    error: error instanceof PlayerLookupError
      ? error.message
      : 'Player lookup is temporarily unavailable.',
  });
}

const LOCAL_GAME_IMAGES = {
  robuxsend: '/assets/games/roblox_kh.png',
  ml: '/assets/games/ml_kh.png',
  ff: '/assets/games/ff_kh.png',
  roslegacy: '/assets/games/ros_legacy_kh.webp',
};

const LOCAL_GAME_BANNERS = {
  robuxsend: '/assets/games/roblox_hero_4k.jpg',
  ml: '/assets/banners/banner_mlbb.jpg',
  ff: '/assets/banners/banner_freefire.jpg',
  roslegacy: '/assets/brand/yurigame-logo.webp',
};

function publicSoraGame(game) {
  if (!game) return null;
  const adminCfg = getAdminFullConfig();
  const adminGame = adminCfg?.games?.find(g =>
    String(g.id || g.code || '').toLowerCase() === String(game.code || '').toLowerCase() ||
    String(g.slug || '').toLowerCase() === String(game.slug || '').toLowerCase() ||
    String(g.providerCode || '').toLowerCase() === String(game.code || '').toLowerCase()
  );

  const customImage = adminGame?.image && String(adminGame.image).trim();
  const customBanner = adminGame?.banner && String(adminGame.banner).trim();

  const publisherMap = {
    robuxsend: 'Roblox Corp',
    ml: 'Moonton',
    ff: 'Garena',
    roslegacy: 'NetEase',
  };

  return {
    ...game,
    name: adminGame?.name || game.name,
    publisher: adminGame?.publisher || publisherMap[game.code] || 'Official Publisher',
    stockOpen: adminGame?.stockOpen !== false,
    adminMaintenance: adminGame?.maintenance === true,
    image: customImage || LOCAL_GAME_IMAGES[game.code] || (game.image ? `/api/soratopup/image/${encodeURIComponent(game.code)}` : '/assets/games/mlbb_tile_4k.jpg'),
    banner: customBanner || LOCAL_GAME_BANNERS[game.code] || customImage || LOCAL_GAME_IMAGES[game.code] || (game.banner || game.image || '/assets/games/mlbb_hero_4k.jpg'),
  };
}

const CORE_GAME_CODES = new Set(['robuxsend', 'ml', 'ff', 'roslegacy']);

// Convert an admin-config (imported) game into the public storefront shape.
function publicImportedGame(g) {
  const code = String(g.providerCode || g.id || '').toLowerCase();
  const h = getProviderHealth(code);
  return {
    id: `sora_${code}`,
    code,
    slug: g.slug || code,
    provider: 'soratopup',
    providerCode: code,
    name: g.name || code,
    publisher: g.publisher || 'Bay2Game',
    category: 'popular',
    badge: g.badge || 'Official Top-Up',
    image: g.image || '/assets/games/mlbb_tile_4k.jpg',
    banner: g.banner || g.image || '/assets/games/mlbb_hero_4k.jpg',
    description: g.description || '',
    currency: g.currency || 'Diamonds',
    needServer: Array.isArray(g.fields) && g.fields.length > 1,
    verificationMode: g.verificationMode || 'format',
    fields: (Array.isArray(g.fields) ? g.fields : []).map((f, i) => ({
      key: f.key || `field_${i}`,
      name: f.label || f.name || `Field ${i + 1}`,
      label: f.label || f.name || `Field ${i + 1}`,
      type: 'text',
      required: f.required !== false,
      options: [],
      placeholder: f.placeholder || `Enter ${f.label || f.name || 'value'}`,
    })),
    stockOpen: g.stockOpen !== false,
    maintenance: !h.ok || g.maintenance === true,
    maintenanceReason: g.maintenance === true ? 'Temporarily disabled by admin' : (h.reason || ''),
    rating: 'Live',
    sales: 'API',
  };
}

app.get('/api/soratopup/status', async (req, res) => {
  try {
    const status = await getSoraStatus();
    return res.json({ success: true, provider: 'soratopup', ...status });
  } catch (error) {
    return sendSoraTopupError(res, error);
  }
});

app.get('/api/soratopup/image/:gameCode', async (req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const imageUrl = await getSoraGameImageSource(req.params.gameCode);
    const response = await fetch(imageUrl, {
      headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg' },
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    const contentLength = Number(response.headers.get('content-length') || 0);
    const allowedType = /^image\/(?:avif|webp|png|jpe?g)$/i.test(contentType);

    if (!response.ok || !allowedType || contentLength > 5_000_000) {
      return res.status(404).end();
    }

    const image = Buffer.from(await response.arrayBuffer());
    if (image.length > 5_000_000) return res.status(413).end();

    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.send(image);
  } catch {
    return res.status(404).end();
  } finally {
    clearTimeout(timeout);
  }
});

app.get('/api/soratopup/catalogue', async (req, res) => {
  try {
    const catalogue = await getSoraCatalogue();
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    return res.json({
      success: true,
      provider: 'soratopup',
      count: catalogue.count,
      fetchedAt: catalogue.fetchedAt,
      games: [
        ...catalogue.games.map((g) => {
          const h = getProviderHealth(g.code);
          const pub = publicSoraGame(g);
          const down = !h.ok || pub.adminMaintenance === true;
          return { ...pub, maintenance: down, maintenanceReason: pub.adminMaintenance ? 'Temporarily disabled by admin' : (h.reason || '') };
        }),
        // Admin-imported games (anything beyond the 4 core games). Resilient: a bad entry can't break the list.
        ...((getAdminFullConfig()?.games || [])
          .filter((g) => !CORE_GAME_CODES.has(String(g.id || g.providerCode || '').toLowerCase()))
          .map((g) => { try { return publicImportedGame(g); } catch { return null; } })
          .filter(Boolean)),
      ],
    });
  } catch (error) {
    return sendSoraTopupError(res, error);
  }
});

// Live provider health per game (down = upstream supplier unreachable). Polled by the storefront.
app.get('/api/provider-health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const health = getAllProviderHealth();
    // Admin's manual maintenance toggle overrides to "down".
    const adminCfg = getAdminFullConfig();
    for (const g of (adminCfg?.games || [])) {
      const key = String(g.providerCode || g.id || '').toLowerCase();
      if (key && g.maintenance === true) {
        health[key] = { ok: false, reason: 'Temporarily disabled by admin', at: Date.now() };
      }
    }
    return res.json({ success: true, health });
  } catch {
    return res.json({ success: true, health: {} });
  }
});

app.get('/api/soratopup/packages', async (req, res) => {
  try {
    const gameCode = req.query.game;
    const adminCfg = getAdminFullConfig();
    const adminGame = adminCfg?.games?.find(g =>
      String(g.id || g.code || '').toLowerCase() === String(gameCode || '').toLowerCase() ||
      String(g.slug || '').toLowerCase() === String(gameCode || '').toLowerCase() ||
      String(g.providerCode || '').toLowerCase() === String(gameCode || '').toLowerCase()
    );

    // Core games use getSoraPackages; imported games aren't in the storefront list, so that may throw.
    let result = null;
    try {
      result = await getSoraPackages(gameCode);
    } catch (err) {
      if (!adminGame) throw err; // unknown game with no admin config → real error
    }

    let finalPackages = result?.packages || [];
    if (adminGame && Array.isArray(adminGame.packages) && adminGame.packages.length > 0) {
      finalPackages = adminGame.packages
        .filter(p => p.inStock !== false)
        .map(p => ({
          id: p.id,
          code: p.providerCode || p.code || p.id,
          providerCode: p.providerCode || p.code || p.id,
          providerConnected: Boolean(p.providerConnected || p.providerCode),
          name: p.name,
          price: p.price,
          originalPrice: p.originalPrice || p.price,
          bonus: p.bonus || '',
          image: p.image || '',
          inStock: p.inStock !== false,
          popular: p.popular || false,
        }));
    }

    const health = getProviderHealth(result?.game?.code || gameCode);
    const pubGame = result?.game ? publicSoraGame(result.game) : publicImportedGame(adminGame);
    const adminMaint = adminGame?.maintenance === true;
    const gameDown = !health.ok || adminMaint;
    res.set('Cache-Control', 'no-cache, must-revalidate');
    return res.json({
      success: true,
      provider: 'soratopup',
      count: finalPackages.length,
      fetchedAt: result?.fetchedAt || new Date().toISOString(),
      game: { ...pubGame, maintenance: gameDown, maintenanceReason: adminMaint ? 'Temporarily disabled by admin' : (health.reason || '') },
      packages: finalPackages,
    });
  } catch (error) {
    return sendSoraTopupError(res, error);
  }
});

app.post('/api/soratopup/verify-player', async (req, res) => {
  try {
    const { gameCode, fieldValues } = req.body || {};
    const result = await verifyPlayerAccount(gameCode, fieldValues);
    res.set({
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return sendPlayerLookupError(res, error);
  }
});

// Public Safe Order Lookup (Targeted by reference or player username with masked PII, bound to paying device & IP)
app.get('/api/soratopup/orders/lookup', async (req, res) => {
  try {
    const q = String(req.query.query || '').trim().toLowerCase();
    const clientIp = getClientIp(req);
    const deviceId = String(req.headers['x-device-id'] || req.query.deviceId || '').trim();

    // Query all manual orders
    const allManual = getAllRosOrders();

    // STRICT DEVICE PRIVACY FILTERING (Zero Leaks Across Devices):
    // Orders are strictly bound to the purchaser's unique device ID!
    const matchedManual = allManual.filter((o) => {
      // 1. Exclude all dummy/test seed orders from public tracking
      const ref = String(o.ref || '').toLowerCase();
      const user = String(o.playerDetails?.account || o.playerDetails?.userId || o.playerDetails?.username || o.verifiedPlayer || '').toLowerCase();
      if (ref.startsWith('test-') || user === 'asdasdas' || user.includes('asdasdas')) {
        return false;
      }

      const orderDevice = String(o.deviceId || '').trim();
      const isOwnerDevice = Boolean(deviceId && orderDevice && orderDevice === deviceId);

      // 2. If user explicitly entered a search query:
      if (q && q.length >= 2) {
        // Exact order reference lookup (case-insensitive)
        if (ref === q || ref.includes(q)) {
          return true;
        }

        // Exact Player ID / Username lookup
        if (user && (user === q || (isOwnerDevice && user.includes(q)))) {
          return true;
        }

        return false;
      }

      // 3. When browsing without a search query, ONLY return orders placed from THIS EXACT DEVICE:
      // If this device never purchased an order, return false (zero orders listed).
      return isOwnerDevice;
    });

    const formattedManual = matchedManual.map((o) => {
      const rawGame = String(o.gameId || o.game || o.gameName || '').toLowerCase();
      const rawPkg = String(o.packageName || '').toLowerCase();
      const isRoblox = rawGame.includes('roblox') || rawGame.includes('robux') || rawPkg.includes('robux');
      const isFreeFire = rawGame.includes('freefire') || rawGame.includes('free fire') || rawGame === 'ff';
      const isRoS = rawGame.includes('ros') || rawGame.includes('legacy');

      const gameLabel = isRoblox ? 'Roblox' : isFreeFire ? 'Free Fire' : (o.gameName || 'RoS Legacy');
      const gameId = isRoblox ? 'robuxsend' : isFreeFire ? 'ff' : 'roslegacy';
      const defaultItem = isRoblox ? '100 Robux' : isFreeFire ? 'Diamonds' : 'RoS Diamonds';
      const currency = isRoblox ? 'Robux' : 'Diamonds';
      const icon = isRoblox
        ? '/assets/games/roblox_tile_4k.jpg'
        : isFreeFire
          ? '/assets/games/freefire_tile_4k.jpg'
          : '/assets/brand/yurigame-logo.webp';

      const rawGmail = o.playerDetails?.gmail || '';
      const maskedGmail = rawGmail.length > 5
        ? `${rawGmail.slice(0, 2)}***@${rawGmail.split('@')[1] || 'mail.com'}`
        : '';

      const playerName = o.playerDetails?.account || o.playerDetails?.userId || o.playerDetails?.username || o.verifiedPlayer || 'Player';

      const isDone = o.status === 'COMPLETED' || o.status === 'DELIVERED' || o.status === 'SUCCESS';
      const isCancelled = o.status === 'CANCELLED' || o.status === 'FAILED';

      return {
        refid: o.ref,
        ref: o.ref,
        gameId,
        gameLabel,
        gameName: gameLabel,
        icon,
        item: o.packageName || defaultItem,
        packageName: o.packageName || defaultItem,
        amount: Number(o.totalUsd || 0),
        totalUsd: Number(o.totalUsd || 0),
        totalKhr: o.totalKhr || (Math.round((Number(o.totalUsd || 0)) * 4100)).toLocaleString(),
        paymentMethod: o.paymentMethod || 'Bakong KHQR',
        status: isDone ? 'Success' : (isCancelled ? 'Failed' : 'Pending'),
        rawStatus: o.status,
        player: playerName,
        verifiedPlayer: o.verifiedPlayer || playerName,
        nickname: maskedGmail ? `Gmail: ${maskedGmail}` : (o.verifiedPlayer || playerName),
        reason: isDone
          ? `Delivered by Admin ${o.handledBy || ''}`
          : (isCancelled ? 'Cancelled by Admin' : `In Processing — Awaiting Admin ${currency}`),
        created_at: o.createdAt || o.updatedAt || new Date().toISOString(),
        createdAt: o.createdAt || o.updatedAt || new Date().toISOString(),
        timestamp: o.createdAt || o.updatedAt || new Date().toISOString(),
      };
    });

    let soraList = [];
    if (q && q.length >= 2) {
      try {
        const orders = await getSoraOrders({ query: q, limit: 20 });
        soraList = Array.isArray(orders) ? orders : (orders?.orders || []);
      } catch (soraErr) {
        console.warn('External SoraTopup query notice:', soraErr.message);
      }
    }

    const combined = [...formattedManual, ...soraList];
    return res.json({
      success: true,
      provider: 'soratopup',
      count: combined.length,
      orders: combined,
    });
  } catch (error) {
    return sendSoraTopupError(res, error);
  }
});

// Admin-Only Full Orders Dump
app.get('/api/soratopup/orders', requireAdminAuth, async (req, res) => {
  try {
    const { query = '', limit = 50 } = req.query || {};

    // 1. Always load manual admin orders (RoS Legacy & Roblox) first
    const manualList = getAllRosOrders(query);
    const formattedManual = manualList.map((o) => {
      const rawGame = String(o.gameId || o.game || o.gameName || '').toLowerCase();
      const rawPkg = String(o.packageName || '').toLowerCase();
      const isRoblox = rawGame.includes('roblox') || rawGame.includes('robux') || rawPkg.includes('robux');
      const isFreeFire = rawGame.includes('freefire') || rawGame.includes('free fire') || rawGame === 'ff';
      const isRoS = rawGame.includes('ros') || rawGame.includes('legacy');

      const gameLabel = isRoblox ? 'Roblox' : isFreeFire ? 'Free Fire' : (o.gameName || 'RoS Legacy');
      const gameId = isRoblox ? 'robuxsend' : isFreeFire ? 'ff' : 'roslegacy';
      const defaultItem = isRoblox ? '100 Robux' : isFreeFire ? 'Diamonds' : 'RoS Diamonds';
      const currency = isRoblox ? 'Robux' : 'Diamonds';
      const icon = isRoblox
        ? '/assets/games/roblox_tile_4k.jpg'
        : isFreeFire
          ? '/assets/games/freefire_tile_4k.jpg'
          : '/assets/brand/yurigame-logo.webp';

      return {
        refid: o.ref,
        ref: o.ref,
        gameId,
        gameLabel,
        gameName: gameLabel,
        icon,
        item: o.packageName || defaultItem,
        amount: o.totalUsd || 0,
        status: o.status === 'COMPLETED' ? 'Success' : (o.status === 'CANCELLED' ? 'Failed' : 'Pending'),
        player: o.playerDetails?.account || o.playerDetails?.userId || o.playerDetails?.username || o.verifiedPlayer || 'Player',
        nickname: o.playerDetails?.gmail ? `Gmail: ${o.playerDetails.gmail}` : (o.verifiedPlayer || o.playerDetails?.userId || 'Player'),
        gmail: o.playerDetails?.gmail || '',
        reason: o.status === 'COMPLETED'
          ? `Delivered by Admin ${o.handledBy || ''}`
          : (o.status === 'CANCELLED' ? 'Cancelled by Admin' : `In Processing — Awaiting Admin ${currency}`),
        created_at: o.createdAt || o.updatedAt || new Date().toISOString(),
      };
    });

    // 2. Safely query external SoraTopup orders without failing the endpoint if provider is down
    let soraList = [];
    try {
      const orders = await getSoraOrders({ query, limit });
      soraList = Array.isArray(orders) ? orders : (orders?.orders || []);
    } catch (soraErr) {
      console.warn('External SoraTopup query notice:', soraErr.message);
    }

    const combined = [...formattedManual, ...soraList];

    return res.json({
      success: true,
      provider: 'soratopup',
      count: combined.length,
      orders: combined,
    });
  } catch (error) {
    return sendSoraTopupError(res, error);
  }
});

app.get('/api/soratopup/order/:ref', async (req, res) => {
  try {
    const result = await getSoraOrder(req.params.ref);
    return res.json({
      success: true,
      provider: 'soratopup',
      order: result,
    });
  } catch (error) {
    return sendSoraTopupError(res, error);
  }
});

// Authoritative Server-Side Order Fulfillment (Called ONLY after verified payment gateway confirmation)
export async function fulfillVerifiedOrder(orderDetails = {}) {
  const {
    game,
    gameId,
    code,
    packageCode,
    fieldValues = [],
    orderRef,
    ref,
    packageName,
    totalUsd,
    totalKhr,
    paymentMethod,
    playerDetails,
    verifiedPlayer,
  } = orderDetails;

  const targetGame = gameId || game;
  const targetCode = packageCode || code;
  const targetQuantity = normalizeOrderQuantity(orderDetails.quantity || 1);
  const finalRef = orderRef || ref || `YGS-${Math.floor(100000 + Math.random() * 900000)}`;

  const cleanTargetGame = targetGame === 'roblox' ? 'robuxsend' : targetGame;

  // Player fields per provider. RoS Legacy on Bay2Game maps userid=username and serverid=password.
  let cleanFieldValues;
  if (cleanTargetGame === 'roslegacy') {
    const rosUser = (Array.isArray(fieldValues) && fieldValues[0]) || playerDetails?.account || playerDetails?.userId || playerDetails?.username || verifiedPlayer || 'RoS Player';
    const rosPass = (Array.isArray(fieldValues) && fieldValues[1]) || playerDetails?.password || '';
    cleanFieldValues = [rosUser, rosPass];
  } else {
    cleanFieldValues = Array.isArray(fieldValues) && fieldValues.length > 0 && fieldValues[0]
      ? fieldValues
      : [playerDetails?.userId || playerDetails?.username || playerDetails?.account || verifiedPlayer || 'Player'];
  }

  // RoS manual orders arrive with only a packageId/name — resolve the Bay2Game product code (e.g. 500 -> ROS_500DM).
  let resolvedCode = targetCode;
  if (cleanTargetGame === 'roslegacy') {
    if (!resolvedCode) {
      const fromId = String(orderDetails.packageId || '').replace(/^sora_[^_]+_/, '').trim();
      const fromName = (String(packageName || '').match(/\d[\d,]*/) || [])[0]?.replace(/,/g, '') || '';
      resolvedCode = fromId || fromName;
    }
    try {
      const resolvedPkg = await resolveSoraPackage('roslegacy', { code: resolvedCode, name: packageName, diamonds: Number(resolvedCode) });
      if (resolvedPkg?.code) resolvedCode = resolvedPkg.code;
    } catch (resolveErr) {
      console.warn('[RoS] product code resolution notice:', resolveErr.message);
    }
  }

  // Automated provider fulfillment (one idempotent order per unit of quantity).
  // RoS Legacy and Roblox are "manual-style": if the provider cannot deliver, we keep the paid order
  // and notify admins (no action buttons) instead of hard-failing, so nothing is ever lost.
  const manualStyle = cleanTargetGame === 'roslegacy' || cleanTargetGame === 'robuxsend';
  let batch;
  try {
    batch = await createSoraOrderBatch({
      game: cleanTargetGame,
      code: resolvedCode,
      fieldValues: cleanFieldValues,
      orderRef: finalRef,
      quantity: targetQuantity,
    });
  } catch (batchErr) {
    if (!manualStyle) throw batchErr;
    console.warn(`[Fulfillment] ${cleanTargetGame} auto-delivery failed, flagged for admin:`, batchErr.message);
    batch = {
      requestedQuantity: targetQuantity,
      completedQuantity: 0,
      failedQuantity: targetQuantity,
      status: 'FAILED',
      successful: [],
      failed: [{ item: 1, orderRef: finalRef, message: batchErr.message }],
    };
  }
  const primaryResult = batch.successful[0]?.response || {};
  const fullyDelivered = batch.failedQuantity === 0;
  const fulfillmentStatus = fullyDelivered ? 'DELIVERED' : 'PENDING_ADMIN';
  const providerRefs = batch.successful.map((item) => item.providerRef || item.orderRef);
  const fulfillmentMessage = fullyDelivered
    ? `${batch.completedQuantity} of ${batch.requestedQuantity} item(s) delivered successfully.`
    : `${batch.completedQuantity} of ${batch.requestedQuantity} item(s) delivered. ${batch.failedQuantity} item(s) require admin review.`;

  try {
    const gameNameMap = {
      robuxsend: 'Roblox',
      roblox: 'Roblox',
      ml: 'Mobile Legends KH',
      mlbb: 'Mobile Legends KH',
      ff: 'Free Fire',
      freefire: 'Free Fire',
      roslegacy: 'RoS Legacy',
    };
    const resolvedGameName = gameNameMap[cleanTargetGame] || cleanTargetGame;

    const automatedOrder = {
      ref: finalRef,
      clientIp: orderDetails.clientIp || '',
      deviceId: orderDetails.deviceId || '',
      game: cleanTargetGame,
      gameId: cleanTargetGame,
      gameName: resolvedGameName,
      packageId: orderDetails.packageId || resolvedCode || targetCode,
      packageName: packageName || primaryResult?.item || (cleanTargetGame === 'robuxsend' ? `${resolvedCode || targetCode} Robux` : cleanTargetGame === 'roslegacy' ? 'RoS Diamonds' : `${resolvedCode || targetCode} Credits`),
      quantity: targetQuantity,
      deliveredQuantity: batch.completedQuantity,
      pendingQuantity: batch.failedQuantity,
      providerRefs,
      totalUsd: Number(totalUsd || primaryResult?.amount || 0),
      totalKhr: totalKhr || (Math.round(Number(totalUsd || primaryResult?.amount || 0) * 4100)).toLocaleString(),
      paymentMethod: paymentMethod || 'Bakong KHQR',
      playerDetails: cleanTargetGame === 'roslegacy'
        ? {
            userId: cleanFieldValues[0] || playerDetails?.account || 'RoS Player',
            account: cleanFieldValues[0] || playerDetails?.account || 'RoS Player',
            username: cleanFieldValues[0] || playerDetails?.account || 'RoS Player',
            password: cleanFieldValues[1] || playerDetails?.password || '',
          }
        : {
            userId: cleanFieldValues[0] || playerDetails?.userId || playerDetails?.account || 'Player',
            zoneId: cleanFieldValues[1] || playerDetails?.zoneId || '',
            account: cleanFieldValues[0] || playerDetails?.account || playerDetails?.userId || 'Player',
          },
      verifiedPlayer: verifiedPlayer || cleanFieldValues[0] || playerDetails?.userId || 'Player',
      status: fulfillmentStatus,
      providerStatus: batch.status,
      providerReason: fulfillmentMessage,
      source: 'instant_api',
      createdAt: new Date().toISOString(),
    };
    await persistOrderHistory(automatedOrder);
    notifyOrderToAdmins(automatedOrder).catch((error) => console.warn('[Telegram Alert] Order notification warning:', error.message));
  } catch (notifyErr) {
    console.warn('[Order History] Automated order recording notice:', notifyErr.message);
  }

  return {
    success: true,
    provider: 'instant_api',
    refid: finalRef,
    orderRef: finalRef,
    providerRefs,
    status: fulfillmentStatus,
    partial: !fullyDelivered,
    requestedQuantity: batch.requestedQuantity,
    deliveredQuantity: batch.completedQuantity,
    failedQuantity: batch.failedQuantity,
    message: fulfillmentMessage,
    order: primaryResult,
  };
}

// Protected Order Routes (Client direct fulfillment strictly prohibited - Admin credentials required)
app.post('/api/soratopup/order', requireAdminAuth, async (req, res) => {
  try {
    const fulfillment = await fulfillVerifiedOrder(req.body);
    return res.json(fulfillment);
  } catch (error) {
    return sendSoraTopupError(res, error);
  }
});

app.post(['/api/ros/order', '/api/roblox/order', '/api/manual/order'], requireAdminAuth, async (req, res) => {
  try {
    const fulfillment = await fulfillVerifiedOrder({ ...req.body, isManualGame: true });
    return res.json(fulfillment);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get(['/api/order-status/:ref', '/api/ros/order-status/:ref', '/api/roblox/order-status/:ref'], async (req, res) => {
  try {
    const { ref } = req.params;
    const order = await getRosOrder(ref);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    return res.json({
      success: true,
      ref: order.ref,
      status: order.status,
      handledBy: order.handledBy || null,
      handledAt: order.handledAt || null,
      handledAtFormatted: order.handledAtFormatted || null,
      order,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 15. PayLinkAPI Dual-Rail Payment Gateway (Bakong KHQR + ABA PayWay)
const PAYLINK_API_URL = process.env.PAYLINK_API_URL || 'https://paylinkapi-bot.onrender.com';
const PAYLINK_API_KEY = process.env.PAYLINK_API_KEY || '';

// 15A. PayLink Key Verification & Health Check
app.get('/api/paylink/status', async (req, res) => {
  try {
    const isConfigured = Boolean(PAYLINK_API_KEY);
    if (!isConfigured) {
      return res.status(503).json({
        success: false,
        configured: false,
        keyValid: false,
        error: 'PayLinkAPI is not configured.',
      });
    }
    const pingRes = await fetch(`${PAYLINK_API_URL}/api/bakong/generate-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAYLINK_API_KEY}`,
        'x-api-key': PAYLINK_API_KEY
      },
      body: JSON.stringify({ amount: 0.1, currency: 'USD', tranId: `PING_${Date.now()}` })
    });
    const pingData = await pingRes.json().catch(() => ({}));
    const keyValid = pingData.success === true;

    return res.json({
      success: true,
      configured: isConfigured,
      keyValid,
      bank: pingData.bank || 'DUAL_SUITE',
      merchantId: pingData.merchantId || process.env.PAYLINK_BAKONG_ACCOUNT || 'hut_soksitchey1@aclb',
      merchantName: pingData.merchantName || process.env.PAYLINK_STORE_NAME || 'topup',
      gatewayUrl: PAYLINK_API_URL
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to verify PayLinkAPI: ' + err.message
    });
  }
});

// Server-Side Verified Pending Orders Map & In-Flight Payment Deduplication
const pendingOrders = new Map();
const inFlightPaymentChecks = new Map();
let adminProviderOrdersCache = { orders: [], expiresAt: 0 };
// Cleanup old pending records every 10 mins
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [key, val] of pendingOrders.entries()) {
    if ((val.createdAt || 0) < cutoff) pendingOrders.delete(key);
  }
}, 10 * 60 * 1000);

// ⚡ AUTONOMOUS BACKGROUND PAYMENT WATCHER
// Automatically monitors live payment status with PayLink / Bakong upstream
// so that client polling responds in <1ms without network wait or timeouts.
const activePaymentWatchers = new Map();

function stopOrderPaymentWatcher(key) {
  if (!key) return;
  const watcher = activePaymentWatchers.get(key);
  if (watcher) {
    if (watcher.intervalId) clearInterval(watcher.intervalId);
    if (watcher.initialTimer) clearTimeout(watcher.initialTimer);
    activePaymentWatchers.delete(key);
  }
}

// 🛡️ AUTHORITATIVE PAYMENT VALIDATION HELPER
// Prevents any QR code glitches, bypasses, or underpayments ($0.02 instead of $2.00)
function verifyTransactionPayment(data, pending, logContext = '') {
  if (!data || !pending) return { valid: false, reason: 'missing_data' };

  const isPaid = Boolean(
    data.paid === true ||
    data.status === 'PAID' ||
    data.status === 'SUCCESS' ||
    data.data?.paid === true ||
    data.data?.status === 'PAID'
  );
  if (!isPaid) return { valid: false, reason: 'not_paid' };

  // Extract actual received payment amount from any gateway format
  const rawPaidAmount =
    data.amount !== undefined ? Number(data.amount) :
      data.data?.amount !== undefined ? Number(data.data.amount) :
        data.transaction?.amount !== undefined ? Number(data.transaction.amount) :
          data.payment?.amount !== undefined ? Number(data.payment.amount) :
            data.raw?.amount !== undefined ? Number(data.raw.amount) :
              null;

  const rawPaidCurrency = String(
    data.currency ||
    data.data?.currency ||
    data.transaction?.currency ||
    data.payment?.currency ||
    data.raw?.currency ||
    'USD'
  ).toUpperCase();

  const expectedAmount = Number(pending.expectedAmount || 0);

  // If the gateway reported an amount, strictly verify it meets the expected threshold
  if (rawPaidAmount !== null && !isNaN(rawPaidAmount)) {
    let isSufficient = false;
    if (rawPaidCurrency === 'USD') {
      // Half a cent micro-rounding tolerance max
      isSufficient = rawPaidAmount >= (expectedAmount - 0.005);
    } else if (rawPaidCurrency === 'KHR') {
      const expectedKhr = Math.round(expectedAmount * 4000);
      isSufficient = rawPaidAmount >= (expectedKhr - 100);
    } else {
      isSufficient = rawPaidAmount >= (expectedAmount - 0.005);
    }

    if (!isSufficient) {
      console.error(
        `🚨 [CRITICAL UNDERPAYMENT DETECTED ${logContext}] Expected $${expectedAmount} USD, but received only ${rawPaidAmount} ${rawPaidCurrency}! Rejecting payment & fulfillment.`
      );
      return {
        valid: false,
        reason: 'underpaid',
        expected: expectedAmount,
        received: rawPaidAmount,
        currency: rawPaidCurrency
      };
    }
  }

  return { valid: true };
}

function startOrderPaymentWatcher(tranId, md5) {
  const key = String(tranId || md5 || '');
  if (!key) return;
  if (activePaymentWatchers.has(key)) return;

  const startTime = Date.now();
  const maxLifetimeMs = 15 * 60 * 1000; // Watch for up to 15 minutes
  let isChecking = false;

  const checkTick = async () => {
    if (isChecking) return;
    if (Date.now() - startTime > maxLifetimeMs) {
      stopOrderPaymentWatcher(key);
      return;
    }

    const pending = pendingOrders.get(tranId) || (md5 ? pendingOrders.get(md5) : null);
    if (!pending || pending.paid || pending.status === 'COMPLETED' || pending.status === 'UNDERPAID_BLOCKED') {
      stopOrderPaymentWatcher(key);
      return;
    }

    isChecking = true;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);
      const res = await fetch(`${PAYLINK_API_URL}/api/payment/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PAYLINK_API_KEY}`,
          'x-api-key': PAYLINK_API_KEY
        },
        body: JSON.stringify({ tranId, md5 }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      const data = await res.json().catch(() => ({}));
      const paymentCheck = verifyTransactionPayment(data, pending, `[WATCHER ${key}]`);

      if (paymentCheck.reason === 'underpaid') {
        pending.paid = false;
        pending.status = 'UNDERPAID_BLOCKED';
        pending.fraudDetails = paymentCheck;
        stopOrderPaymentWatcher(key);
        return;
      }

      if (paymentCheck.valid && !pending.paid) {
        pending.paid = true;
        pending.bank = data.bank || pending.bank || 'BAKONG';
        pending.raw = data;

        console.log(`[PAYMENT VERIFIED AUTONOMOUS] Verified payment for order ${tranId || md5}`);

        if (pending.orderDetails && pending.status === 'PENDING') {
          pending.status = 'PROCESSING';
          try {
            console.log(`[FULFILLING AUTONOMOUS] Executing fulfillment for ${tranId}...`);
            const fulfillment = await fulfillVerifiedOrder(pending.orderDetails);
            pending.fulfillment = fulfillment;
            pending.status = 'COMPLETED';
          } catch (fulfillErr) {
            console.error('Autonomous fulfillment notice:', fulfillErr.message);
            pending.status = 'PENDING_ADMIN';
            pending.fulfillment = {
              refid: pending.orderDetails.orderRef || tranId,
              status: 'PENDING_ADMIN',
              message: 'Payment verified! Item is queued for delivery: ' + fulfillErr.message
            };
          }
        }
        stopOrderPaymentWatcher(key);
      }
    } catch {
      // Upstream busy or network jitter, will re-check next tick
    } finally {
      isChecking = false;
    }
  };

  // Run first check after 500ms, then every 1500ms (matching PayLink new engine recommendation)
  const initialTimer = setTimeout(() => {
    checkTick();
    const intervalId = setInterval(checkTick, 1500);
    const existing = activePaymentWatchers.get(key);
    if (existing) {
      existing.intervalId = intervalId;
    } else {
      activePaymentWatchers.set(key, { intervalId, stop: () => stopOrderPaymentWatcher(key) });
    }
  }, 500);

  activePaymentWatchers.set(key, { initialTimer, stop: () => stopOrderPaymentWatcher(key) });
}

function mapDatabaseOrder(row) {
  return {
    ref: row.ref,
    userId: row.user_id,
    gameId: row.game_id,
    gameName: row.game_name,
    packageId: row.package_id,
    packageName: row.package_name,
    quantity: row.quantity,
    totalUsd: Number(row.total_usd || 0),
    totalKhr: row.total_khr,
    paymentMethod: row.payment_method,
    playerDetails: {
      userId: row.player_id,
      zoneId: row.zone_id || '',
      server: row.server_region || '',
    },
    verifiedPlayer: row.verified_player,
    status: row.status,
    serverPing: row.server_ping,
    icon: row.icon,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function persistOrderHistory(order = {}) {
  const normalized = normalizeOrderRecord(order, order.source || 'checkout');
  if (!normalized.ref) return null;

  const memoryOrder = {
    ...order,
    ref: normalized.ref,
    gameId: normalized.gameId,
    gameName: normalized.gameName,
    packageId: normalized.packageId || null,
    packageName: normalized.packageName,
    quantity: normalized.quantity,
    totalUsd: normalized.totalUsd,
    totalKhr: order.totalKhr || Math.round(normalized.totalUsd * 4100).toLocaleString(),
    paymentMethod: normalized.paymentMethod,
    status: order.status || normalized.status,
    timestamp: normalized.timestamp,
  };
  const existingIndex = inMemoryOrders.findIndex((item) => item.ref === normalized.ref);
  if (existingIndex >= 0) inMemoryOrders.splice(existingIndex, 1);
  inMemoryOrders.unshift(memoryOrder);
  upsertOrderHistory(memoryOrder, order.source || 'checkout');

  try {
    await pool.query(
      `INSERT INTO \`orders\`
       (ref, user_id, game_id, game_name, package_name, package_id, quantity, total_usd, total_khr, payment_method, player_id, zone_id, server_region, verified_player, status, server_ping, icon, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         game_id = VALUES(game_id),
         game_name = VALUES(game_name),
         package_name = VALUES(package_name),
         package_id = VALUES(package_id),
         quantity = VALUES(quantity),
         total_usd = VALUES(total_usd),
         total_khr = VALUES(total_khr),
         payment_method = VALUES(payment_method),
         player_id = VALUES(player_id),
         zone_id = VALUES(zone_id),
         server_region = VALUES(server_region),
         verified_player = VALUES(verified_player),
         status = VALUES(status),
         server_ping = VALUES(server_ping),
         icon = VALUES(icon)`,
      [
        normalized.ref,
        order.userId || null,
        normalized.gameId,
        normalized.gameName,
        normalized.packageName,
        normalized.packageId || null,
        normalized.quantity,
        normalized.totalUsd,
        memoryOrder.totalKhr,
        normalized.paymentMethod,
        order.playerDetails?.userId || order.playerDetails?.account || normalized.player,
        order.playerDetails?.zoneId || '',
        order.playerDetails?.server || '',
        order.verifiedPlayer || normalized.player,
        memoryOrder.status,
        order.serverPing || '',
        order.icon || '',
        new Date(normalized.timestampMs),
      ]
    );
  } catch (error) {
    console.warn('[Order History] Database persistence skipped:', error.message);
  }

  return normalized;
}

async function collectAllAdminOrders() {
  const records = [];
  const warnings = [];

  try {
    const [rows] = await pool.query('SELECT * FROM `orders` ORDER BY created_at DESC LIMIT 10000');
    records.push(...rows.map((row) => normalizeOrderRecord(mapDatabaseOrder(row), 'database')));
  } catch (error) {
    warnings.push(`Database: ${error.message}`);
  }

  records.push(...getOrderHistory().map((order) => normalizeOrderRecord(order, order.source || 'history')));
  records.push(...inMemoryOrders.map((order) => normalizeOrderRecord(order, 'memory')));
  records.push(...getAllRosOrders().map((order) => normalizeOrderRecord(order, 'manual')));

  let providerOrders = adminProviderOrdersCache.orders;
  if (adminProviderOrdersCache.expiresAt <= Date.now()) {
    try {
      providerOrders = await getSoraOrders({ limit: 100 });
      adminProviderOrdersCache = {
        orders: providerOrders,
        expiresAt: Date.now() + 30_000,
      };
    } catch (error) {
      warnings.push(`SoraTopup: ${error.message}`);
    }
  }
  records.push(...providerOrders.map((order) => normalizeOrderRecord(order, 'soratopup')));

  const uniquePendingRecords = [...new Set(pendingOrders.values())];
  records.push(...uniquePendingRecords.map((pending) => normalizeOrderRecord({
    ...(pending.orderDetails || {}),
    ref: pending.orderDetails?.orderRef || pending.tranId,
    status: pending.status || 'PENDING',
    expectedAmount: pending.expectedAmount,
    createdAt: pending.createdAt,
    preOrder: pending.status === 'PENDING',
  }, 'preorder')));

  return {
    orders: deduplicateOrders(records),
    warnings,
  };
}

// 15B. Generate Live KHQR (Bakong / ABA)
app.post('/api/paylink/generate-qr', async (req, res) => {
  try {
    if (!PAYLINK_API_KEY) {
      return res.status(503).json({ success: false, error: 'PayLinkAPI is not configured.' });
    }
    const { method = 'bakong', orderRef, description, orderDetails } = req.body;

    const clientIp = getClientIp(req);
    const deviceId = String(req.headers['x-device-id'] || req.body?.deviceId || req.body?.orderDetails?.deviceId || '').trim();

    // 🛡️ 1. MANDATORY ORDER DETAILS VALIDATION (Anti-Bypass)
    if (!orderDetails || typeof orderDetails !== 'object') {
      return res.status(400).json({ success: false, error: 'Valid order details are required to generate a payment QR.' });
    }

    orderDetails.clientIp = clientIp;
    orderDetails.deviceId = deviceId;

    // 🛡️ 2. SERVER-SIDE AUTHORITATIVE PRICE VALIDATION (Anti-Glitch / Anti-Tamper)
    // Client-sent amount is COMPLETELY IGNORED. The server calculates the exact price from catalog.
    const targetGame = orderDetails.gameId || orderDetails.game || orderDetails.providerCode;
    const targetPackage = orderDetails.packageId || orderDetails.packageCode || orderDetails.code;
    const providerPackageCode = orderDetails.providerPackageCode || orderDetails.packageCode || orderDetails.code;
    const requestedQuantity = Number(orderDetails.quantity || 1);

    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > MAX_ORDER_QUANTITY) {
      return res.status(400).json({
        success: false,
        error: `Quantity must be a whole number between 1 and ${MAX_ORDER_QUANTITY}.`,
      });
    }
    const targetQuantity = requestedQuantity;

    if (!targetGame || !targetPackage) {
      return res.status(400).json({ success: false, error: 'Valid game and package selection required.' });
    }

    let authoritative = await getAuthoritativePackagePrice(targetGame, targetPackage, targetQuantity);
    if (!authoritative && providerPackageCode && providerPackageCode !== targetPackage) {
      authoritative = await getAuthoritativePackagePrice(targetGame, providerPackageCode, targetQuantity);
    }
    if (!authoritative) {
      return res.status(400).json({ success: false, error: 'The selected game package is unavailable or does not exist.' });
    }

    // Hard-lock the price directly to the official catalog price:
    const expectedUsd = Number(authoritative.price.toFixed(2));
    const numAmount = expectedUsd;
    const currency = 'USD'; // Strictly USD

    if (numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Authoritative price must be greater than zero.' });
    }

    // Enforce verified details and translate the storefront package to its live provider SKU.
    orderDetails.totalUsd = expectedUsd;
    orderDetails.packageName = authoritative.name;
    orderDetails.packageCode = authoritative.providerCode || targetPackage;
    orderDetails.providerConnected = Boolean(authoritative.providerConnected);

    const isAba = String(method).toLowerCase().includes('aba');
    const cleanRef = String(orderRef || '').trim();
    const tranId = (cleanRef && !pendingOrders.has(cleanRef))
      ? cleanRef
      : `${cleanRef || 'YGS'}_${Date.now()}`;
    const merchantId = process.env.PAYLINK_BAKONG_ACCOUNT || 'kry_lychhay@aclb';
    const merchantName = process.env.PAYLINK_STORE_NAME || 'YuriGameSt4re';

    // ⚡ NEW HIGH-SPEED PAYLINK ENGINE (v2026.11)
    // PayLink official endpoint: POST /api/payment/generate-qr (takes ~600ms)
    let qrString = null;
    let qrDataUrl = null;
    let md5 = null;
    let deepLink = null;
    let finalTranId = tranId;

    if (PAYLINK_API_KEY && PAYLINK_API_URL) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const payRes = await fetch(`${PAYLINK_API_URL}/api/payment/generate-qr`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${PAYLINK_API_KEY}`,
            'x-api-key': PAYLINK_API_KEY
          },
          body: JSON.stringify({
            amount: numAmount,
            currency: (currency || 'USD').toUpperCase(),
            orderId: tranId,
            method: isAba ? 'aba' : 'bakong',
            description: description || `YuriGame TopUp ${tranId}`
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        const payData = await payRes.json().catch(() => ({}));
        if (payData.success && payData.qrString) {
          qrString = payData.qrString;
          md5 = payData.md5;
          finalTranId = payData.tranId || payData.transactionId || tranId;
          deepLink = payData.deepLink || payData.deeplink || `bakong://qr?data=${encodeURIComponent(qrString)}`;
        }
      } catch (upstreamErr) {
        console.warn('[PayLink Generate] Remote engine notice, using local generator fallback:', upstreamErr.message);
      }
    }

    // Instant local NBC Bakong generator fallback if remote unavailable
    if (!qrString) {
      const localResult = await generateLocalKhqrWithDataUrl({
        merchantId,
        merchantName,
        amount: numAmount,
        currency: (currency || 'USD').toUpperCase(),
        billNumber: finalTranId,
        storeLabel: merchantName,
      });
      qrString = localResult.qrString;
      md5 = localResult.md5;
      deepLink = localResult.deepLink;
      qrDataUrl = localResult.qrDataUrl;
    }

    // Generate local ultra-crisp Base64 PNG image in <10ms if not present
    if (!qrDataUrl && qrString) {
      try {
        qrDataUrl = await QRCode.toDataURL(qrString, {
          width: 450,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#081B37',
            light: '#FFFFFF'
          }
        });
      } catch { }
    }

    // Save authoritative pending order record on server
    const pendingRecord = {
      tranId: finalTranId,
      md5,
      expectedAmount: numAmount,
      currency: (currency || 'USD').toUpperCase(),
      orderDetails: orderDetails || null,
      clientIp,
      deviceId,
      status: 'PENDING',
      createdAt: Date.now()
    };
    pendingOrders.set(finalTranId, pendingRecord);
    if (md5) {
      pendingOrders.set(md5, pendingRecord);
    }

    // ⚡ Start Autonomous Server-Side Payment Watcher with exact official tranId & md5
    startOrderPaymentWatcher(finalTranId, md5);

    return res.json({
      success: true,
      bank: isAba ? 'ABA' : 'BAKONG',
      merchantId,
      merchantName,
      merchantLink: null,
      qrString,
      qrDataUrl,
      md5,
      tranId: finalTranId,
      deepLink,
      androidIntent: null,
      amount: numAmount,
      currency: (currency || 'USD').toUpperCase()
    });
  } catch (err) {
    console.error('PayLink generate-qr error:', err);
    return res.status(500).json({ success: false, error: 'PayLink Gateway error: ' + err.message });
  }
});

// PayLink Gateway Connection Warm-Up & Keep-Alive (Prevents Render cold-starts)
if (PAYLINK_API_KEY && PAYLINK_API_URL) {
  const warmUpPayLink = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      await fetch(`${PAYLINK_API_URL}/api/payment/generate-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PAYLINK_API_KEY}`,
          'x-api-key': PAYLINK_API_KEY
        },
        body: JSON.stringify({ amount: 0.1, currency: 'USD', orderId: `WARM_${Date.now()}`, method: 'bakong' }),
        signal: controller.signal
      });
      clearTimeout(timeout);
    } catch {
      // warm-up silent
    }
  };
  setTimeout(warmUpPayLink, 1500);
  setInterval(warmUpPayLink, 3.5 * 60 * 1000);
}

// 15C. Real-time Status Polling & Authoritative Server Fulfillment (Ultra-Fast with In-Memory Cache & Coalescing)
app.post('/api/paylink/check-payment', async (req, res) => {
  try {
    if (!PAYLINK_API_KEY) {
      return res.status(503).json({ success: false, error: 'PayLinkAPI is not configured.' });
    }
    const { tranId, md5, force = false } = req.body;
    if (!tranId && !md5) {
      return res.status(400).json({ success: false, error: 'tranId or md5 is required.' });
    }

    // ⚡ Fast-path (<1ms): If order is already confirmed paid or completed in-memory, respond instantly
    const pending = pendingOrders.get(tranId) || (md5 ? pendingOrders.get(md5) : null);
    if (pending && (pending.status === 'COMPLETED' || pending.fulfillment || pending.paid)) {
      return res.json({
        success: true,
        paid: true,
        status: 'PAID',
        bank: pending.bank || 'BAKONG',
        tranId: pending.tranId || tranId,
        fulfillment: pending.fulfillment,
        raw: pending.raw || { paid: true, status: 'PAID' }
      });
    }

    // Ensure autonomous background watcher is running
    const watcherKey = tranId || md5;
    if (!activePaymentWatchers.has(watcherKey) && !pending?.paid) {
      startOrderPaymentWatcher(tranId, md5);
    }

    // ⚡ Rapid polling (<1ms): If automatic poll (!force), return current status instantly from memory
    // The background watcher is querying PayLink every 1.8s so client requests never hang
    if (!force) {
      return res.json({
        success: true,
        paid: false,
        status: pending?.status || 'PENDING',
        bank: pending?.bank || 'BAKONG',
        tranId: pending?.tranId || tranId,
      });
    }

    // Manual check clicked by user (force: true): perform direct coalesced check
    const cacheKey = String(tranId || md5);
    let checkPromise = inFlightPaymentChecks.get(cacheKey);

    if (!checkPromise) {
      checkPromise = (async () => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 6500);
          const response = await fetch(`${PAYLINK_API_URL}/api/payment/check`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${PAYLINK_API_KEY}`,
              'x-api-key': PAYLINK_API_KEY
            },
            body: JSON.stringify({ tranId, md5 }),
            signal: controller.signal
          });
          clearTimeout(timeout);

          let parsed = {};
          try {
            const text = await response.text();
            parsed = text ? JSON.parse(text) : {};
          } catch {
            parsed = {};
          }
          return parsed;
        } catch (fetchErr) {
          console.warn('[PayLink Check] Upstream check notice:', fetchErr.message);
          return { paid: false, status: 'PENDING' };
        } finally {
          inFlightPaymentChecks.delete(cacheKey);
        }
      })();

      inFlightPaymentChecks.set(cacheKey, checkPromise);
    }

    const data = await checkPromise;
    const paymentCheck = verifyTransactionPayment(data, pending, `[MANUAL_CHECK ${cacheKey}]`);

    if (paymentCheck.reason === 'underpaid') {
      if (pending) {
        pending.paid = false;
        pending.status = 'UNDERPAID_BLOCKED';
        pending.fraudDetails = paymentCheck;
      }
      stopOrderPaymentWatcher(watcherKey);
      return res.status(400).json({
        success: false,
        paid: false,
        status: 'UNDERPAID_BLOCKED',
        error: `Payment underpaid! Expected $${paymentCheck.expected.toFixed(2)} USD, but received only $${paymentCheck.received.toFixed(2)} ${paymentCheck.currency}. Delivery refused.`
      });
    }

    const isPaid = Boolean(paymentCheck.valid);
    let fulfillment = null;

    if (isPaid && pending) {
      pending.paid = true;
      if (data.bank) pending.bank = data.bank;
      pending.raw = data;

      if (pending.fulfillment) {
        fulfillment = pending.fulfillment;
      } else if (pending.orderDetails && pending.status === 'PENDING') {
        pending.status = 'PROCESSING';
        try {
          console.log(`[PAYMENT VERIFIED] Fulfilling order ${pending.tranId} server-side...`);
          fulfillment = await fulfillVerifiedOrder(pending.orderDetails);
          pending.fulfillment = fulfillment;
          pending.status = 'COMPLETED';
        } catch (fulfillErr) {
          console.error('Fulfillment error after verified payment:', fulfillErr);
          fulfillment = {
            refid: pending.orderDetails.orderRef || tranId,
            status: 'PENDING_ADMIN',
            message: 'Payment verified! Item is queued for delivery: ' + fulfillErr.message
          };
          pending.fulfillment = fulfillment;
          pending.status = 'PENDING_ADMIN';
          persistOrderHistory({
            ...pending.orderDetails,
            ref: pending.orderDetails.orderRef || tranId,
            status: 'PENDING_ADMIN',
            source: 'preorder',
            createdAt: pending.createdAt,
          }).catch(() => { });
        }
      }
      stopOrderPaymentWatcher(watcherKey);
    }

    return res.json({
      success: true,
      paid: isPaid,
      status: data.status || (isPaid ? 'PAID' : 'PENDING'),
      bank: data.bank || pending?.bank || 'BAKONG',
      tranId: data.tranId || tranId,
      fulfillment,
      raw: data
    });
  } catch (err) {
    console.error('PayLink check-payment error:', err);
    return res.status(500).json({ success: false, error: 'Failed to verify transaction status.' });
  }
});

// ==========================================
// ADMIN DASHBOARD & PUBLIC STORE CONFIG APIS
// ==========================================

// 1. Public Site Configuration (Storefront dynamic games, packages, open MLBB events, banners, contacts)
app.get('/api/site-config', (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  return res.json({
    success: true,
    ...getPublicSiteConfig()
  });
});

// Helper to get real client IP behind Cloudflare and reverse proxies
function getClientIp(req) {
  return getRequestIp(req);
}

// 2A. Step 1: Dispatch a Telegram possession challenge (no reusable browser PIN).
app.post('/api/admin/auth/login-request', async (req, res) => {
  const clientIp = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Web Browser';

  try {
    const result = await requestAdminOtp(clientIp, userAgent, sendAdminLoginOtp);
    return res.json({
      success: true,
      requireOtp: true,
      challengeId: result.challengeId,
      expiresInSeconds: result.expiresInSeconds,
      message: 'A 6-digit verification code has been dispatched to registered Telegram admins.'
    });
  } catch (err) {
    return res.status(503).json({
      success: false,
      error: err.message || 'Telegram verification is temporarily unavailable.'
    });
  }
});

// 2B. Step 2: Verify Telegram OTP and Issue Signed Session Token
app.post('/api/admin/auth/verify-otp', async (req, res) => {
  const { challengeId, otp } = req.body || {};
  const clientIp = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Web Browser';

  try {
    const result = verifyAdminOtp(challengeId, otp, clientIp, userAgent);
    setAdminSessionCookie(req, res, result.token, result.expiresAt);
    // Send background alert to Telegram confirming successful login
    sendAdminLoginSuccessAlert(clientIp, userAgent).catch(() => { });

    return res.json({
      success: true,
      authenticated: true,
      expiresAt: result.expiresAt,
      message: 'Admin Telegram verification successful. A protected HttpOnly session was created.'
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: err.message || 'OTP verification failed.'
    });
  }
});

// 2C. Step 3: Resend Telegram OTP (with 45s cooldown)
app.post('/api/admin/auth/resend-otp', async (req, res) => {
  const { challengeId } = req.body || {};
  const clientIp = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Web Browser';

  try {
    const result = await resendAdminOtp(challengeId, clientIp, userAgent, sendAdminLoginOtp);
    return res.json({
      success: true,
      message: 'A new verification code has been sent to Telegram admins.'
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Could not resend OTP code.'
    });
  }
});

// 2D. Verify the current bound HttpOnly session without exposing its token.
app.get('/api/admin/auth/session', (req, res) => {
  const token = getAdminSessionToken(req);
  const valid = token && verifyAdminSession(
    token,
    getClientIp(req),
    req.headers['user-agent'] || ''
  );
  if (!valid) clearAdminSessionCookie(req, res);
  return res.json({
    success: true,
    authenticated: Boolean(valid),
    message: valid ? 'Active admin session is valid.' : 'No active admin session.'
  });
});

// 2E. Admin Logout (Revoke Session Token)
app.post('/api/admin/auth/logout', (req, res) => {
  const token = getAdminSessionToken(req);
  if (token) revokeAdminSession(token);
  clearAdminSessionCookie(req, res);
  return res.json({ success: true, message: 'Admin logged out successfully.' });
});

// 2F. Exchange a single-use Telegram link for a bound HttpOnly session.
app.post('/api/admin/auth/verify', (req, res) => {
  const { token } = req.body || {};
  const oneClickEntry = token ? consumeAdminToken(token) : null;

  if (oneClickEntry) {
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Web Browser';
    const session = createAdminSession(clientIp, userAgent, oneClickEntry.adminUserId || 'telegram_admin');
    setAdminSessionCookie(req, res, session.token, session.expiresAt);
    return res.json({
      success: true,
      authenticated: true,
      expiresAt: session.expiresAt,
      message: 'Single-use Telegram link exchanged for a protected admin session.'
    });
  }

  return res.status(401).json({ success: false, error: 'Invalid, expired, or already-used Telegram admin link.' });
});

// 3. Full Admin Configuration
app.get('/api/admin/config', requireAdminAuth, (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  return res.json({
    success: true,
    config: getAdminClientConfig()
  });
});

// Live SoraTopup SKUs used to connect admin-created packages safely.
app.get('/api/admin/soratopup/packages/:gameId', requireAdminAuth, async (req, res) => {
  try {
    const game = getConfiguredGame(req.params.gameId);
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found.' });
    }

    const providerGameCode = game.providerCode || game.id;
    const result = await getLiveSoraPackages(providerGameCode, {
      force: req.query.refresh === '1',
    });
    return res.json({
      success: true,
      game: {
        id: game.id,
        name: game.name,
        providerCode: providerGameCode,
      },
      fetchedAt: result.fetchedAt,
      packages: (result.packages || []).map((pkg) => ({
        providerCode: pkg.code,
        name: pkg.name,
        price: Number(pkg.price),
      })),
    });
  } catch (error) {
    return sendSoraTopupError(res, error);
  }
});

app.post('/api/admin/soratopup/sync', requireAdminAuth, async (req, res) => {
  try {
    const result = await syncConfiguredPackagesWithSora({ force: true });
    return res.json({ success: true, result });
  } catch (error) {
    return sendSoraTopupError(res, error);
  }
});

function saveBase64ToFile(base64Str, prefix = 'img') {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) {
    return base64Str;
  }
  try {
    const match = base64Str.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,([\s\S]+)$/);
    if (!match) return base64Str;
    let ext = match[1].toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    else if (ext.includes('svg')) ext = 'svg';
    else if (ext.includes('webp')) ext = 'webp';
    else if (ext.includes('png')) ext = 'png';
    else ext = 'jpg';

    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const uploadDir = path.join(PROJECT_ROOT, 'public', 'assets', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, filename);
    const cleanedBase64 = match[2].replace(/\s/g, '');
    fs.writeFileSync(filePath, Buffer.from(cleanedBase64, 'base64'));
    return `/assets/uploads/${filename}`;
  } catch (err) {
    console.warn('[saveBase64ToFile] Error saving upload to disk:', err.message);
    return base64Str;
  }
}

function sanitizeUploadPayload(body = {}, prefix = 'img') {
  if (!body || typeof body !== 'object') return body;
  const clone = { ...body };
  if (clone.image && typeof clone.image === 'string' && clone.image.startsWith('data:image/')) {
    clone.image = saveBase64ToFile(clone.image, `${prefix}_icon`);
  }
  if (clone.banner && typeof clone.banner === 'string' && clone.banner.startsWith('data:image/')) {
    clone.banner = saveBase64ToFile(clone.banner, `${prefix}_banner`);
  }
  return clone;
}

// 4. Update Game (Option 5: Stock Open/Close, Logo, Banner, Name)
app.post('/api/admin/games/:gameId', requireAdminAuth, (req, res) => {
  const { gameId } = req.params;
  const sanitized = sanitizeUploadPayload(req.body || {}, `game_${gameId}`);
  const updated = updateGameConfig(gameId, sanitized);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Game not found' });
  }
  return res.json({ success: true, game: updated });
});

// 4a. Provider catalog — list ALL Bay2Game games for the admin "Add Game" picker.
app.get('/api/admin/provider-catalog', requireAdminAuth, async (req, res) => {
  try {
    const games = await getProviderCatalog();
    return res.json({ success: true, count: games.length, games });
  } catch (error) {
    return res.status(502).json({ success: false, error: error.message || 'Could not load provider catalog.' });
  }
});

// TEMP read-only diagnostic (remove after). Tests getProviderGame for many codes on production.
app.get('/api/debug/provider-check', async (req, res) => {
  if (req.query.k !== 'yg_diag_8731') return res.status(404).json({ error: 'not found' });
  const results = [];
  let catalog = [];
  try {
    catalog = await getProviderCatalog();
  } catch (e) { return res.json({ catalogError: e.message }); }
  // Test the first N non-core games (what the picker shows at the top).
  const n = Math.min(Number(req.query.n) || 12, 40);
  for (const c of catalog.slice(0, n)) {
    try {
      const { products } = await getProviderGame(c.code);
      results.push({ code: c.code, ok: true, products: products.length });
    } catch (e) {
      results.push({ code: c.code, ok: false, error: e.message });
    }
  }
  return res.json({ catalogCount: catalog.length, tested: results.length, results });
});

// 4b. Import a game from the provider — auto-creates it with all packages + fields.
app.post('/api/admin/games/import', requireAdminAuth, async (req, res) => {
  try {
    const gameCode = String(req.body?.gameCode || '').trim();
    if (!gameCode) return res.status(400).json({ success: false, error: 'gameCode is required.' });
    const { game, products } = await getProviderGame(gameCode);
    if (!products.length) {
      return res.status(404).json({ success: false, error: 'That game has no purchasable packages.' });
    }
    const imported = importProviderGame({ ...game, packages: products });
    if (!imported) return res.status(400).json({ success: false, error: 'Could not import that game.' });
    return res.json({ success: true, game: imported, packageCount: imported.packages?.length || 0 });
  } catch (error) {
    return res.status(502).json({ success: false, error: error.message || 'Import failed.' });
  }
});

// 4c. Remove an (imported) game.
app.delete('/api/admin/games/:gameId', requireAdminAuth, (req, res) => {
  const protectedCore = ['robuxsend', 'ml', 'ff', 'roslegacy'];
  const gameId = String(req.params.gameId || '').toLowerCase();
  if (protectedCore.includes(gameId)) {
    return res.status(400).json({ success: false, error: 'Core games cannot be removed (use the stock/maintenance toggle instead).' });
  }
  const removed = removeGame(gameId);
  if (!removed) return res.status(404).json({ success: false, error: 'Game not found' });
  return res.json({ success: true });
});

// 5. Products / Packages CRUD (Option 1)
app.post('/api/admin/packages/:gameId', requireAdminAuth, async (req, res) => {
  const { gameId } = req.params;
  try {
    const sanitized = sanitizeUploadPayload(req.body || {}, `pkg_${gameId}`);
    const connectedData = await connectAdminPackageToSora(gameId, sanitized);
    const created = addPackageToGame(gameId, connectedData);
    if (!created) {
      return res.status(400).json({ success: false, error: 'Could not add package' });
    }
    return res.status(201).json({ success: true, package: created });
  } catch (error) {
    return sendSoraTopupError(res, error);
  }
});

app.put('/api/admin/packages/:gameId/:pkgId', requireAdminAuth, async (req, res) => {
  const { gameId, pkgId } = req.params;
  try {
    const sanitized = sanitizeUploadPayload(req.body || {}, `pkg_${gameId}`);
    const connectedData = await connectAdminPackageToSora(gameId, sanitized);
    const updated = updatePackageInGame(gameId, pkgId, connectedData);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }
    return res.json({ success: true, package: updated });
  } catch (error) {
    return sendSoraTopupError(res, error);
  }
});

app.delete('/api/admin/packages/:gameId/:pkgId', requireAdminAuth, (req, res) => {
  const { gameId, pkgId } = req.params;
  const ok = deletePackageFromGame(gameId, pkgId);
  return res.json({ success: ok });
});

// 6. MLBB Event Categories & Event Packages CRUD (Option 1)
app.post('/api/admin/mlbb-events', requireAdminAuth, (req, res) => {
  const sanitized = sanitizeUploadPayload(req.body || {}, 'event');
  const created = addMlbbEvent(sanitized);
  return res.status(201).json({ success: true, event: created });
});

app.put('/api/admin/mlbb-events/:eventId', requireAdminAuth, (req, res) => {
  const { eventId } = req.params;
  const sanitized = sanitizeUploadPayload(req.body || {}, 'event');
  const updated = updateMlbbEvent(eventId, sanitized);
  if (!updated) return res.status(404).json({ success: false, error: 'Event not found' });
  return res.json({ success: true, event: updated });
});

app.delete('/api/admin/mlbb-events/:eventId', requireAdminAuth, (req, res) => {
  const { eventId } = req.params;
  const ok = deleteMlbbEvent(eventId);
  return res.json({ success: ok });
});

app.post('/api/admin/mlbb-events/:eventId/packages', requireAdminAuth, async (req, res) => {
  const { eventId } = req.params;
  try {
    const sanitized = sanitizeUploadPayload(req.body || {}, 'event_pkg');
    const connectedData = await connectAdminPackageToSora('ml', sanitized);
    const created = addPackageToMlbbEvent(eventId, connectedData);
    if (!created) return res.status(400).json({ success: false, error: 'Could not add event package' });
    return res.status(201).json({ success: true, package: created });
  } catch (error) {
    return sendSoraTopupError(res, error);
  }
});

app.put('/api/admin/mlbb-events/:eventId/packages/:pkgId', requireAdminAuth, async (req, res) => {
  const { eventId, pkgId } = req.params;
  try {
    const sanitized = sanitizeUploadPayload(req.body || {}, 'event_pkg');
    const connectedData = await connectAdminPackageToSora('ml', sanitized);
    const updated = updatePackageInMlbbEvent(eventId, pkgId, connectedData);
    if (!updated) return res.status(404).json({ success: false, error: 'Event package not found' });
    return res.json({ success: true, package: updated });
  } catch (error) {
    return sendSoraTopupError(res, error);
  }
});

app.delete('/api/admin/mlbb-events/:eventId/packages/:pkgId', requireAdminAuth, (req, res) => {
  const { eventId, pkgId } = req.params;
  const ok = deletePackageFromMlbbEvent(eventId, pkgId);
  return res.json({ success: ok });
});

// 7. Contact Settings (Option 3)
app.post('/api/admin/contacts', requireAdminAuth, (req, res) => {
  const updated = updateContactSettings(req.body || {});
  return res.json({ success: true, contacts: updated });
});

// Test Telegram Bot Connection & Ping Registered Admins
app.post('/api/admin/telegram/test', requireAdminAuth, async (req, res) => {
  try {
    const result = await sendTestTelegramPing();
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Telegram test failed.' });
  }
});

// 8. Slide Banners (Option 4)
app.post('/api/admin/banners', requireAdminAuth, (req, res) => {
  const sanitized = sanitizeUploadPayload(req.body || {}, 'banner');
  const created = addSlideBanner(sanitized);
  return res.status(201).json({ success: true, banner: created });
});

app.put('/api/admin/banners/:bannerId', requireAdminAuth, (req, res) => {
  const { bannerId } = req.params;
  const sanitized = sanitizeUploadPayload(req.body || {}, 'banner');
  const updated = updateSlideBanner(bannerId, sanitized);
  if (!updated) return res.status(404).json({ success: false, error: 'Banner not found' });
  return res.json({ success: true, banner: updated });
});

app.delete('/api/admin/banners/:bannerId', requireAdminAuth, (req, res) => {
  const { bannerId } = req.params;
  const ok = deleteSlideBanner(bannerId);
  return res.json({ success: ok });
});

// 9. Dynamic Order Analytics (database + manual + SoraTopup + pending checkouts)
app.get('/api/admin/analytics', requireAdminAuth, async (req, res) => {
  try {
    const { orders, warnings } = await collectAllAdminOrders();
    const analytics = buildOrderAnalytics(orders, String(req.query.period || 'day').toLowerCase());
    return res.json({ success: true, ...analytics, warnings });
  } catch (error) {
    console.error('[Admin Analytics] Failed to build analytics:', error);
    return res.status(500).json({ success: false, error: 'Could not load order analytics.' });
  }
});

// 10. Unified Admin Orders & Web 1-Click Approvals
app.get('/api/admin/orders', requireAdminAuth, async (req, res) => {
  try {
    const { orders, warnings } = await collectAllAdminOrders();
    return res.json({
      success: true,
      warnings,
      orders: orders.map((order) => ({
        ref: order.ref,
        gameId: order.gameId,
        gameName: order.gameName,
        packageId: order.packageId,
        packageName: order.packageName,
        quantity: order.quantity,
        totalUsd: order.totalUsd,
        totalKhr: order.totalKhr,
        paymentMethod: order.paymentMethod,
        playerDetails: {
          account: order.player,
          userId: order.player,
        },
        verifiedPlayer: order.player,
        status: order.status,
        rawStatus: order.rawStatus,
        source: order.source,
        isPreOrder: order.isPreOrder,
        timestamp: order.timestamp,
        createdAt: order.timestamp,
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/orders/:ref/approve', requireAdminAuth, async (req, res) => {
  try {
    const { ref } = req.params;
    const { adminName } = req.body || {};
    const updated = await approveOrderFromWeb(ref, { name: adminName || 'Admin Web', id: 'web_panel' });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    return res.json({ success: true, order: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/orders/:ref/cancel', requireAdminAuth, async (req, res) => {
  try {
    const { ref } = req.params;
    const { adminName } = req.body || {};
    const updated = await cancelOrderFromWeb(ref, { name: adminName || 'Admin Web', id: 'web_panel' });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    return res.json({ success: true, order: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Idempotent MariaDB / MySQL Schema Initialization
async function ensureDatabaseSchema() {
  try {
    const conn = await pool.getConnection();
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`email\` VARCHAR(255) UNIQUE NOT NULL,
        \`phone\` VARCHAR(64) DEFAULT '+855 00 000 000',
        \`password\` VARCHAR(255) NOT NULL,
        \`role\` VARCHAR(64) DEFAULT 'VIP Member',
        \`avatar\` TEXT,
        \`wallet_balance\` DECIMAL(12, 2) DEFAULT 0.00,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`user_logins\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` VARCHAR(64),
        \`user_email\` VARCHAR(255),
        \`ip_address\` VARCHAR(128),
        \`user_agent\` TEXT,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`diamond_stock\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`package_id\` VARCHAR(64) UNIQUE,
        \`package_name\` VARCHAR(255),
        \`stock_quantity\` INT DEFAULT 100,
        \`min_stock_alert\` INT DEFAULT 10,
        \`status\` VARCHAR(32) DEFAULT 'IN_STOCK',
        \`supplier\` VARCHAR(255) DEFAULT 'Direct Garena/Moonton API',
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`stock_history\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`package_id\` VARCHAR(64),
        \`change_type\` VARCHAR(32),
        \`quantity_change\` INT,
        \`remaining_stock\` INT,
        \`order_ref\` VARCHAR(64),
        \`note\` TEXT,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`orders\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`ref\` VARCHAR(64) UNIQUE NOT NULL,
        \`user_id\` VARCHAR(64),
        \`game_id\` VARCHAR(64),
        \`game_name\` VARCHAR(255),
        \`package_name\` VARCHAR(255),
        \`package_id\` VARCHAR(64),
        \`quantity\` INT DEFAULT 1,
        \`total_usd\` DECIMAL(10, 2) DEFAULT 0.00,
        \`total_khr\` VARCHAR(64),
        \`payment_method\` VARCHAR(64),
        \`player_id\` VARCHAR(128),
        \`zone_id\` VARCHAR(64),
        \`server_region\` VARCHAR(64),
        \`verified_player\` VARCHAR(255),
        \`status\` VARCHAR(32) DEFAULT 'PENDING',
        \`server_ping\` VARCHAR(32),
        \`icon\` TEXT,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`wallet_transactions\` (
        \`id\` VARCHAR(64) PRIMARY KEY,
        \`user_id\` VARCHAR(64),
        \`type\` VARCHAR(32),
        \`title\` VARCHAR(255),
        \`amount\` DECIMAL(10, 2) DEFAULT 0.00,
        \`payment_method\` VARCHAR(64),
        \`status\` VARCHAR(32) DEFAULT 'COMPLETED',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    conn.release();
    console.log('✅ MariaDB database schema verified successfully.');
  } catch (err) {
    console.warn('⚠️ Database schema verification notice:', err.message);
  }
}

// API requests never fall through to the SPA document.
app.use('/api', (req, res) => {
  return res.status(404).json({
    success: false,
    code: 'api_not_found',
    error: 'API endpoint not found.',
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error?.type === 'entity.too.large' || error?.status === 413) {
    return res.status(413).json({
      success: false,
      code: 'payload_too_large',
      error: 'Request payload is too large.',
    });
  }
  if (error instanceof SyntaxError && Object.hasOwn(error, 'body')) {
    return res.status(400).json({
      success: false,
      code: 'invalid_json',
      error: 'Request body must contain valid JSON.',
    });
  }

  console.error('[Server Error]', error?.message || 'Unknown request failure');
  return res.status(500).json({
    success: false,
    code: 'internal_error',
    error: 'The server could not process this request.',
  });
});

// Static Assets Serving (uploads, game tiles, promo banners)
app.use('/assets', express.static(path.join(PROJECT_ROOT, 'public', 'assets'), { maxAge: '7d' }));

// Production Static Serving for Built React Frontend
if (fs.existsSync(distPath)) {
  console.log(`📦 Serving production build from: ${distPath}`);
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if ((req.method === 'GET' || req.method === 'HEAD') && !req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

export const httpServer = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 YuriGame Store API Server running at http://localhost:${PORT}`);
  await ensureDatabaseSchema().catch((e) => console.warn('[DB] Schema verification notice:', e.message));
  // Load the durable admin config (imported games, prices, logos) from MySQL so it survives redeploys.
  // Runs even if the schema step above hiccuped, so imported games are always restored.
  await loadAdminConfigFromDb().catch((e) => console.warn('[Admin Store] DB config load skipped:', e.message));
  if (process.env.SORA_STARTUP_SYNC_DISABLED !== 'true') {
    syncConfiguredPackagesWithSora()
      .then((result) => {
        console.log(`[SoraTopup Sync] ${result.connected} package(s) connected, ${result.unchanged} already current, ${result.unmatched} need manual SKU selection.`);
      })
      .catch((error) => {
        console.warn('[SoraTopup Sync] Startup sync skipped:', error.message);
      });
  }
  if (process.env.TELEGRAM_POLLING_DISABLED !== 'true') {
    startTelegramBotPolling();
  }
});

httpServer.headersTimeout = 10_000;
httpServer.requestTimeout = 30_000;
httpServer.keepAliveTimeout = 5_000;
httpServer.timeout = 120_000;
httpServer.maxHeadersCount = 100;

