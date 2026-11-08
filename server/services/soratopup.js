// Provider: Bay2Game Reseller API (https://api.bay2game.xyz/api)
// Auth: api_key passed as a query param (GET) or body field (POST).
// Endpoints used: /profile, /categories, /products?game_code=, /create_order (POST), /check_order?reference=
import { createRosAngkorTopup } from './rosangkor.js';

const DEFAULT_BASE_URL = 'https://api.bay2game.xyz/api';
// Roblox (robuxsend) is NOT sold by Bay2Game, so it keeps using the legacy SoraTopup provider.
const SORATOPUP_DEFAULT_BASE_URL = 'https://app.soratopup.com/api/v1';
const REQUEST_TIMEOUT_MS = 15_000;

// Games still fulfilled by the legacy SoraTopup provider (everything else uses Bay2Game).
const SORATOPUP_GAMES = new Set(['robuxsend', 'roblox']);
function providerForGame(code) {
  return SORATOPUP_GAMES.has(cleanString(code, 80).toLowerCase()) ? 'soratopup' : 'bay2game';
}

// Map our internal storefront codes to Bay2Game game codes.
const PROVIDER_GAME_CODE_MAP = {
  ml: 'mlbb',
  mlbb: 'mlbb',
  'mobile-legends': 'mlbb',
  ff: 'freefire_sg',
  freefire: 'freefire_sg',
  'free-fire': 'freefire_sg',
  roslegacy: 'ros_legacy',
  ros: 'ros_legacy',
  // robuxsend/roblox is NOT offered by Bay2Game; handled locally via fallback packages.
};

// Games that require a server/zone id as the second player field on Bay2Game.
const PROVIDER_SERVER_GAMES = new Set(['mlbb', 'ros_legacy', 'mla', 'mlbb_global', 'mlbb_br', 'mlbb_tr', 'mlbb_ru', 'mlbb_exclusive']);

function toProviderGameCode(code) {
  const clean = cleanString(code, 80).toLowerCase();
  return PROVIDER_GAME_CODE_MAP[clean] || clean;
}

// Extract a trailing numeric token from a Bay2Game product_code, e.g. MLBB_55 -> "55", ROS_200DM -> "200".
function trailingNumber(code) {
  const matches = String(code || '').match(/\d+/g);
  return matches && matches.length ? matches[matches.length - 1] : '';
}

// ---- Provider health tracking (derived from real order outcomes) ----
// When an order fails because the upstream game supplier is unreachable, we flag that game as
// "down" so the storefront can disable buying and mark the tile. It auto-recovers after a cooldown
// (so customers can retry) and is cleared immediately on the next successful order.
const PROVIDER_DOWN_COOLDOWN_MS = 5 * 60_000;
const SUPPLIER_DOWN_PATTERNS = /can'?t reach|cannot reach|unreachable|try again|temporarily|maintenance|mirae|timed ?out|timeout|unavailable|not allowed at the moment|currently inactive/i;
const providerHealth = new Map(); // storefront code -> { ok, reason, at }

function markProviderHealth(code, ok, reason = '') {
  const key = String(code || '').trim().toLowerCase();
  if (!key) return;
  providerHealth.set(key, { ok, reason: ok ? '' : String(reason || '').slice(0, 200), at: Date.now() });
}

export function getProviderHealth(code) {
  const key = String(code || '').trim().toLowerCase();
  const h = providerHealth.get(key);
  if (!h) return { ok: true, reason: '', at: 0 };
  // Optimistically recover after the cooldown so a customer order can re-test the supplier.
  if (!h.ok && Date.now() - h.at > PROVIDER_DOWN_COOLDOWN_MS) {
    return { ok: true, reason: '', at: h.at, recovering: true };
  }
  return { ok: h.ok, reason: h.reason, at: h.at };
}

export function getAllProviderHealth() {
  const out = {};
  for (const code of getStorefrontCodes()) out[code] = getProviderHealth(code);
  return out;
}
const CATALOGUE_TTL_MS = 5 * 60_000;
const PACKAGE_TTL_MS = 2 * 60_000;
export const MAX_ORDER_QUANTITY = 10;
export const ROS_LEGACY_PACKAGES = [
  { id: "sora_roslegacy_200", code: "200", providerCode: "200", name: "200 Diamonds", price: 4.00, bonus: "Fast Delivery", popular: false },
  { id: "sora_roslegacy_300", code: "300", providerCode: "300", name: "300 Diamonds", price: 6.00, bonus: "Direct Top-Up", popular: false },
  { id: "sora_roslegacy_400", code: "400", providerCode: "400", name: "400 Diamonds", price: 7.20, bonus: "Value Pack", popular: false },
  { id: "sora_roslegacy_500", code: "500", providerCode: "500", name: "500 Diamonds", price: 8.88, bonus: "Hot Pack", popular: true },
  { id: "sora_roslegacy_1000", code: "1000", providerCode: "1000", name: "1,000 Diamonds", price: 18.00, bonus: "Best Value", popular: true },
  { id: "sora_roslegacy_1500", code: "1500", providerCode: "1500", name: "1,500 Diamonds", price: 26.00, bonus: "Super Value", popular: true },
  { id: "sora_roslegacy_2000", code: "2000", providerCode: "2000", name: "2,000 Diamonds", price: 36.00, bonus: "VIP Mega Pack", popular: true },
];

export const ROBUX_PACKAGES = [
  { id: "sora_robuxsend_10", code: "10", providerCode: "10", name: "10 Robux", price: 0.10, bonus: "Instant 5s", popular: false },
  { id: "sora_robuxsend_20", code: "20", providerCode: "20", name: "20 Robux", price: 0.19, bonus: "+5% Value", popular: false },
  { id: "sora_robuxsend_50", code: "50", providerCode: "50", name: "50 Robux", price: 0.45, bonus: "Popular", popular: false },
  { id: "sora_robuxsend_80", code: "80", providerCode: "80", name: "80 Robux", price: 0.74, bonus: "Best Value", popular: true },
  { id: "sora_robuxsend_100", code: "100", providerCode: "100", name: "100 Robux", price: 0.89, bonus: "Hot Pack", popular: true },
  { id: "sora_robuxsend_200", code: "200", providerCode: "200", name: "200 Robux", price: 1.78, bonus: "Bonus Value", popular: false },
  { id: "sora_robuxsend_400", code: "400", providerCode: "400", name: "400 Robux", price: 3.55, bonus: "Best Seller", popular: true },
  { id: "sora_robuxsend_800", code: "800", providerCode: "800", name: "800 Robux", price: 6.99, bonus: "+50 Bonus", popular: true },
  { id: "sora_robuxsend_1000", code: "1000", providerCode: "1000", name: "1,000 Robux", price: 8.75, bonus: "VIP Pack", popular: false },
  { id: "sora_robuxsend_2000", code: "2000", providerCode: "2000", name: "2,000 Robux", price: 17.50, bonus: "Mega Pack", popular: true },
];

const DEFAULT_STOREFRONT_CODES = ['robuxsend', 'ml', 'ff', 'roslegacy'];
const STOREFRONT_GAME_OVERRIDES = {
  roslegacy: {
    name: 'RoS Legacy',
    description: 'RoS Legacy top-up. Enter your Username or Gmail and Password.',
    fields: [
      { name: 'Username or Gmail', required: true, type: 'text', options: [] },
      { name: 'Account Password', required: true, type: 'password', options: [] },
    ],
    needServer: false,
    verificationMode: 'format',
    packages: ROS_LEGACY_PACKAGES,
  },
  ml: {
    name: 'Mobile Legends KH',
    verificationMode: 'live',
    needServer: true,
    fields: [
      { name: 'User ID', required: true, type: 'text', options: [] },
      { name: 'Server ID', required: true, type: 'text', options: [] },
    ],
  },
  ff: {
    name: 'Free Fire',
    verificationMode: 'live',
    needServer: false,
    fields: [
      { name: 'Player ID', required: true, type: 'text', options: [] },
    ],
  },
  robuxsend: {
    name: 'Roblox',
    description: 'Instant Robux delivery to your Roblox account by username. Safe and verified.',
    fields: [
      { name: 'Roblox Username', required: true, type: 'text', options: [] },
    ],
    needServer: false,
    verificationMode: 'official',
    packages: ROBUX_PACKAGES,
  },
};

let catalogueCache = null;
const packageCache = new Map();

export class SoraTopupError extends Error {
  constructor(message, { status = 502, code = 'provider_error', cause } = {}) {
    super(message, { cause });
    this.name = 'SoraTopupError';
    this.status = status;
    this.code = code;
  }
}

function getConfig(provider = 'bay2game') {
  const isSora = provider === 'soratopup';
  const rawBaseUrl = isSora
    ? (process.env.SORATOPUP_BASE_URL || SORATOPUP_DEFAULT_BASE_URL).trim()
    : (process.env.BAY2GAME_BASE_URL || DEFAULT_BASE_URL).trim();
  const apiKey = isSora
    ? (process.env.SORATOPUP_API_KEY || '').trim()
    : (process.env.BAY2GAME_API_KEY || '').trim();

  if (!apiKey) {
    throw new SoraTopupError(`${isSora ? 'Roblox provider (SoraTopup)' : 'Game provider (Bay2Game)'} is not configured.`, {
      status: 503,
      code: 'provider_not_configured',
    });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawBaseUrl);
  } catch {
    throw new SoraTopupError('Provider base URL is invalid.', {
      status: 503,
      code: 'provider_config_invalid',
    });
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new SoraTopupError('Provider base URL must use HTTPS.', {
      status: 503,
      code: 'provider_config_invalid',
    });
  }

  return {
    baseUrl: parsedUrl.toString().replace(/\/+$/, ''),
    apiKey,
    auth: isSora ? 'bearer' : 'query',
  };
}

async function providerRequest(path, { provider = 'bay2game', method = 'GET', body, headers = {} } = {}) {
  const { baseUrl, apiKey, auth } = getConfig(provider);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // Bay2Game authenticates with api_key (query param + JSON body); SoraTopup uses a Bearer token.
  const url = new URL(`${baseUrl}${path}`);
  const reqHeaders = { Accept: 'application/json', ...headers };
  let outboundBody = body;
  if (auth === 'query') {
    url.searchParams.set('api_key', apiKey);
    outboundBody = body ? { api_key: apiKey, ...body } : undefined;
  } else {
    reqHeaders.Authorization = `Bearer ${apiKey}`;
  }
  if (outboundBody) reqHeaders['Content-Type'] = 'application/json';

  try {
    const response = await fetch(url.toString(), {
      method,
      headers: reqHeaders,
      body: outboundBody ? JSON.stringify(outboundBody) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    let payload;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      throw new SoraTopupError('Game provider returned an invalid response.', {
        status: 502,
        code: 'provider_invalid_response',
      });
    }

    // Bay2Game returns HTTP 200 with { status: "success" | "error" | "failed", message }.
    const logicalError = payload?.status === 'error' || payload?.status === 'failed' || payload?.ok === false;
    if (!response.ok || logicalError) {
      const upstreamMsg = payload?.message || payload?.msg || payload?.error || 'Game provider could not complete the request.';
      const publicStatus = response.status === 429 ? 429 : (response.status === 400 || logicalError) ? 400 : 502;
      throw new SoraTopupError(
        response.status === 429
          ? 'Provider request limit reached. Please try again shortly.'
          : upstreamMsg,
        { status: publicStatus, code: 'provider_request_failed' },
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof SoraTopupError) throw error;
    if (error?.name === 'AbortError') {
      throw new SoraTopupError('SoraTopup request timed out.', {
        status: 504,
        code: 'provider_timeout',
        cause: error,
      });
    }
    throw new SoraTopupError('SoraTopup is temporarily unavailable.', {
      status: 502,
      code: 'provider_unavailable',
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function getStorefrontCodes() {
  const configured = String(process.env.SORATOPUP_GAME_CODES || '')
    .split(',')
    .map((code) => code.trim())
    .filter((code) => /^[a-zA-Z0-9_-]{1,80}$/.test(code));
  return configured.length ? [...new Set(configured)] : DEFAULT_STOREFRONT_CODES;
}

function cleanString(value, maxLength = 220) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function createFieldKey(name, index) {
  const key = cleanString(name, 80)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return key ? `${key}_${index}` : `field_${index}`;
}

function normalizeInput(input, index) {
  const source = typeof input === 'string' ? { name: input } : (input || {});
  const name = cleanString(source.name || source.label || `Field ${index + 1}`, 80);
  const options = Array.isArray(source.options)
    ? source.options.map((option) => cleanString(option, 120)).filter(Boolean).slice(0, 100)
    : [];
  const type = options.length > 0 || source.type === 'select' ? 'select' : 'text';

  return {
    key: createFieldKey(name, index),
    name,
    label: name,
    position: Number.isFinite(Number(source.position)) ? Number(source.position) : index,
    required: source.required !== false,
    type,
    options,
    placeholder: type === 'select' ? `Select ${name}` : `Enter ${name}`,
  };
}

function safeImageUrl(value) {
  const raw = cleanString(value, 500);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.toString() : '';
  } catch {
    return '';
  }
}

function normalizeGame(game) {
  const code = cleanString(game?.code, 80);
  if (!code) return null;

  const override = STOREFRONT_GAME_OVERRIDES[code] || {};
  const rawInputs = override.fields || (
    Array.isArray(game?.inputs) && game.inputs.length
      ? game.inputs
      : Array.isArray(game?.fields)
        ? game.fields
        : []
  );
  const inputs = rawInputs
    .map(normalizeInput)
    .sort((left, right) => left.position - right.position);

  return {
    code,
    name: cleanString(override.name || game?.name || code, 160),
    image: safeImageUrl(game?.image),
    description: cleanString(override.description || game?.description, 1_000),
    needServer: override.needServer ?? Boolean(game?.needServer),
    verificationMode: override.verificationMode || 'none',
    fields: inputs,
  };
}

function normalizePackage(item, gameCode) {
  // Bay2Game products: { id, product_code, name, sell_price }. Fall back to legacy { code, price }.
  const code = cleanString(item?.product_code || item?.code, 100);
  const price = Number(item?.sell_price ?? item?.price);
  if (!code || !Number.isFinite(price) || price < 0) return null;

  return {
    code,
    providerCode: code,
    gameCode,
    name: cleanString(item?.name || code, 180),
    price,
  };
}

function validGameCode(value) {
  const code = cleanString(value, 80);
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(code)) {
    throw new SoraTopupError('A valid game code is required.', {
      status: 400,
      code: 'invalid_game_code',
    });
  }
  return code;
}

function storefrontGameCode(value) {
  let code = validGameCode(value);
  if (code === 'roblox') code = 'robuxsend';
  if (!getStorefrontCodes().includes(code)) {
    throw new SoraTopupError('This game is not available in the storefront.', {
      status: 404,
      code: 'game_not_available',
    });
  }
  return code;
}

export async function getSoraCatalogue({ force = false } = {}) {
  const now = Date.now();
  if (!force && catalogueCache && catalogueCache.expiresAt > now) {
    return catalogueCache.value;
  }

  let normalizedGames = [];
  try {
    const payload = await providerRequest('/categories');
    const cats = Array.isArray(payload?.categories) ? payload.categories : [];
    // Only surface the Bay2Game categories that map back to a storefront game, with live images/names.
    const reverseMap = { mlbb: 'ml', freefire_global: 'ff', ros_legacy: 'roslegacy' };
    normalizedGames = cats
      .map((cat) => {
        const storeCode = reverseMap[cat?.game_code];
        if (!storeCode) return null;
        return normalizeGame({
          code: storeCode,
          name: cat.name,
          image: cat.image_url,
          description: cat.description,
          fields: Array.isArray(cat.game_fields) ? cat.game_fields : [],
          needServer: PROVIDER_SERVER_GAMES.has(cat.game_code),
        });
      })
      .filter(Boolean);
  } catch (err) {
    console.warn('Upstream catalogue fetch warning:', err.message);
  }
  const gamesByCode = new Map(normalizedGames.map((game) => [game.code, game]));

  // Ensure Roblox is ALWAYS present in gamesByCode
  if (!gamesByCode.has('robuxsend')) {
    gamesByCode.set('robuxsend', normalizeGame({
      code: 'robuxsend',
      name: 'Roblox',
      image: '/assets/games/roblox_kh.png',
      description: 'Instant Robux delivery to your Roblox account by username. Safe and verified.',
      needServer: false,
      verificationMode: 'official',
      fields: [{ name: 'Roblox Username', required: true, type: 'text', options: [] }],
    }));
  }

  // Ensure Mobile Legends is ALWAYS present in gamesByCode
  if (!gamesByCode.has('ml')) {
    gamesByCode.set('ml', normalizeGame({
      code: 'ml',
      name: 'Mobile Legends KH',
      image: '/assets/games/ml_kh.png',
      description: 'Mobile Legends KH direct diamond top-up. Enter your User ID and Zone ID.',
      needServer: true,
      verificationMode: 'live',
      fields: [
        { name: 'User ID', required: true, type: 'text', options: [] },
        { name: 'Server ID', required: true, type: 'text', options: [] },
      ],
    }));
  }

  // Ensure Free Fire is ALWAYS present in gamesByCode
  if (!gamesByCode.has('ff')) {
    gamesByCode.set('ff', normalizeGame({
      code: 'ff',
      name: 'Free Fire',
      image: '/assets/games/ff_kh.png',
      description: 'Free Fire direct diamond recharge by Player ID.',
      needServer: false,
      verificationMode: 'live',
      fields: [{ name: 'Player ID', required: true, type: 'text', options: [] }],
    }));
  }

  // Ensure RoS Legacy is ALWAYS present in gamesByCode
  if (!gamesByCode.has('roslegacy')) {
    gamesByCode.set('roslegacy', normalizeGame({
      code: 'roslegacy',
      name: 'RoS Legacy',
      image: '/assets/games/ros_legacy_kh.webp',
      description: 'RoS Legacy top-up. Enter your Username or Gmail and Password.',
      needServer: false,
      verificationMode: 'format',
      fields: [
        { name: 'Username or Gmail', required: true, type: 'text', options: [] },
        { name: 'Account Password', required: true, type: 'password', options: [] },
      ],
    }));
  }

  // Restrict catalogue strictly to the 4 games: Roblox, Mobile Legends, Free Fire, and RoS Legacy
  const codes = getStorefrontCodes();
  const games = codes.map((code) => gamesByCode.get(code)).filter(Boolean);

  const value = {
    games,
    count: games.length,
    providerTotalCount: normalizedGames.length,
    fetchedAt: new Date().toISOString(),
  };
  catalogueCache = { value, expiresAt: now + CATALOGUE_TTL_MS };
  return value;
}

// Raw provider catalog (ALL Bay2Game games) for the admin "Add Game" picker — not restricted to storefront codes.
export async function getProviderCatalog() {
  const payload = await providerRequest('/categories', { provider: 'bay2game' });
  const cats = Array.isArray(payload?.categories) ? payload.categories : [];
  return cats
    .map((c) => ({
      code: cleanString(c.game_code, 80),
      name: cleanString(c.name, 160),
      image: safeImageUrl(c.image_url),
      description: cleanString(c.description, 500),
      fields: Array.isArray(c.game_fields) ? c.game_fields.map((f) => String(f)) : [],
    }))
    .filter((c) => c.code)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Raw provider game + its products, for importing a new game into the admin store.
export async function getProviderGame(gameCode) {
  const code = cleanString(gameCode, 80);
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(code)) {
    throw new SoraTopupError('A valid game code is required.', { status: 400, code: 'invalid_game_code' });
  }
  const payload = await providerRequest(`/products?game_code=${encodeURIComponent(code)}`, { provider: 'bay2game' });
  const g = payload?.game || {};
  const products = (Array.isArray(payload?.products) ? payload.products : [])
    .map((p) => normalizePackage(p, code))
    .filter(Boolean);
  return {
    game: {
      code,
      name: cleanString(g.name || code, 160),
      image: safeImageUrl(g.image_url),
      description: cleanString(g.description, 1000),
      fields: Array.isArray(g.game_fields) ? g.game_fields.map((f) => String(f)) : [],
    },
    products,
  };
}

export async function getLiveSoraPackages(gameCode, { force = false } = {}) {
  let code = validGameCode(gameCode);
  if (code === 'roblox') code = 'robuxsend';

  const provider = providerForGame(code);

  const cacheKey = `live:${code}`;
  const now = Date.now();
  const cached = packageCache.get(cacheKey);
  if (!force && cached && cached.expiresAt > now) return cached.value;

  let game;
  let packages;
  if (provider === 'soratopup') {
    // Legacy SoraTopup provider (Roblox / robuxsend).
    const payload = await providerRequest(`/packages?game=${encodeURIComponent(code)}`, { provider: 'soratopup' });
    game = normalizeGame(payload?.gameInfo || { code, name: payload?.game || code });
    packages = (Array.isArray(payload?.packages) ? payload.packages : [])
      .map((item) => normalizePackage(item, code))
      .filter(Boolean);
  } else {
    // Bay2Game provider (ML / FF / RoS Legacy).
    const providerCode = toProviderGameCode(code);
    const payload = await providerRequest(`/products?game_code=${encodeURIComponent(providerCode)}`, { provider: 'bay2game' });
    const g = payload?.game || {};
    game = normalizeGame({
      code, // keep storefront code so STOREFRONT_GAME_OVERRIDES (labels/fields) apply
      name: g.name,
      image: g.image_url,
      description: g.description,
      fields: Array.isArray(g.game_fields) ? g.game_fields : [],
      needServer: PROVIDER_SERVER_GAMES.has(providerCode),
    });
    packages = (Array.isArray(payload?.products) ? payload.products : [])
      .map((item) => normalizePackage(item, code))
      .filter(Boolean);
  }

  const value = {
    game,
    packages,
    count: packages.length,
    fetchedAt: new Date().toISOString(),
  };
  packageCache.set(cacheKey, { value, expiresAt: now + PACKAGE_TTL_MS });
  return value;
}

export async function getSoraPackages(gameCode, { force = false } = {}) {
  const code = storefrontGameCode(gameCode);

  try {
    return await getLiveSoraPackages(code, { force });
  } catch (error) {
    if (code === 'roslegacy') {
      return {
        game: normalizeGame({
          code: 'roslegacy',
          name: 'RoS Legacy',
          image: '/assets/brand/yurigame-logo.webp',
          description: 'RoS Legacy top-up. Enter your Username or Gmail and Password.',
          needServer: false,
          verificationMode: 'format',
          fields: [
            { name: 'Username or Gmail', required: true, type: 'text', options: [] },
            { name: 'Account Password', required: true, type: 'password', options: [] },
          ],
        }),
        packages: ROS_LEGACY_PACKAGES,
        count: ROS_LEGACY_PACKAGES.length,
        fetchedAt: new Date().toISOString(),
        isFallback: true,
      };
    }

    if (code === 'robuxsend') {
      return {
        game: normalizeGame({
          code: 'robuxsend',
          name: 'Roblox',
          image: '/assets/games/roblox_tile_4k.jpg',
          description: 'Instant Robux delivery to your Roblox account by username. Safe and verified.',
          needServer: false,
          verificationMode: 'official',
          fields: [{ name: 'Roblox Username', required: true, type: 'text', options: [] }],
        }),
        packages: ROBUX_PACKAGES,
        count: ROBUX_PACKAGES.length,
        fetchedAt: new Date().toISOString(),
        isFallback: true,
      };
    }

    if (code === 'ml') {
      const mlPackages = [
        { id: "sora_ml_weekly", code: "weekly", providerCode: "weekly", name: "Weekly Diamond Pass", price: 1.81, bonus: "Save 60%", popular: true },
        { id: "sora_ml_55", code: "55", providerCode: "55", name: "55 Diamonds", price: 0.77, bonus: "Fast Delivery", popular: false },
        { id: "sora_ml_86", code: "86", providerCode: "86", name: "86 Diamonds", price: 1.25, bonus: "+9 Bonus", popular: false },
        { id: "sora_ml_172", code: "172", providerCode: "172", name: "172 Diamonds", price: 2.45, bonus: "+16 Bonus", popular: false },
        { id: "sora_ml_257", code: "257", providerCode: "257", name: "257 Diamonds", price: 3.65, bonus: "+27 Bonus", popular: true },
        { id: "sora_ml_343", code: "343", providerCode: "343", name: "343 Diamonds", price: 4.85, bonus: "+37 Bonus", popular: false },
        { id: "sora_ml_706", code: "706", providerCode: "706", name: "706 Diamonds", price: 9.80, bonus: "+88 Bonus", popular: true },
        { id: "sora_ml_2195", code: "2195", providerCode: "2195", name: "2,195 Diamonds", price: 30.50, bonus: "+320 Bonus", popular: true },
        { id: "sora_ml_3688", code: "3688", providerCode: "3688", name: "3,688 Diamonds", price: 50.80, bonus: "+550 Bonus", popular: false },
        { id: "sora_ml_5532", code: "5532", providerCode: "5532", name: "5,532 Diamonds", price: 76.50, bonus: "+800 Bonus", popular: true }
      ];
      return {
        game: normalizeGame({
          code: 'ml',
          name: 'Mobile Legends KH',
          image: '/assets/games/mlbb_tile_4k.jpg',
          description: 'Mobile Legends KH direct diamond top-up. Enter your User ID and Zone ID.',
          needServer: true,
          verificationMode: 'live',
          fields: [
            { name: 'User ID', required: true, type: 'text', options: [] },
            { name: 'Server ID', required: true, type: 'text', options: [] },
          ],
        }),
        packages: mlPackages,
        count: mlPackages.length,
        fetchedAt: new Date().toISOString(),
        isFallback: true,
      };
    }

    if (code === 'ff') {
      const ffPackages = [
        { id: "sora_ff_25", code: "25", providerCode: "25", name: "25 Diamonds", price: 0.25, bonus: "Starter Pack", popular: false },
        { id: "sora_ff_50", code: "50", providerCode: "50", name: "50 Diamonds", price: 0.48, bonus: "+5 Bonus", popular: false },
        { id: "sora_ff_100", code: "100", providerCode: "100", name: "100 Diamonds", price: 0.88, bonus: "+10 Bonus", popular: false },
        { id: "sora_ff_weekly", code: "weekly", providerCode: "weekly", name: "Weekly Membership", price: 1.80, bonus: "450 Total", popular: true },
        { id: "sora_ff_310", code: "310", providerCode: "310", name: "310 Diamonds", price: 2.60, bonus: "+31 Bonus", popular: true },
        { id: "sora_ff_520", code: "520", providerCode: "520", name: "520 Diamonds", price: 4.30, bonus: "+52 Bonus", popular: false },
        { id: "sora_ff_1060", code: "1060", providerCode: "1060", name: "1,060 Diamonds", price: 8.60, bonus: "+106 Bonus", popular: true },
        { id: "sora_ff_2180", code: "2180", providerCode: "2180", name: "2,180 Diamonds", price: 17.20, bonus: "+218 Bonus", popular: true }
      ];
      return {
        game: normalizeGame({
          code: 'ff',
          name: 'Free Fire',
          image: '/assets/games/freefire_tile_4k.jpg',
          description: 'Free Fire direct diamond recharge by Player ID.',
          needServer: false,
          verificationMode: 'live',
          fields: [{ name: 'Player ID', required: true, type: 'text', options: [] }],
        }),
        packages: ffPackages,
        count: ffPackages.length,
        fetchedAt: new Date().toISOString(),
        isFallback: true,
      };
    }

    throw error;
  }
}

function normalizePackageLookup(value) {
  return cleanString(value, 180)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function findPackageByCode(packages, code) {
  const cleanCode = cleanString(code, 100).toLowerCase();
  if (!cleanCode) return null;
  return packages.find((item) => String(item.code || '').toLowerCase() === cleanCode) || null;
}

/**
 * Resolve an admin-created package to an exact SoraTopup SKU.
 * Explicit provider codes win. Otherwise, exact names, weekly aliases,
 * and exact numeric diamond quantities are matched without approximation.
 */
export async function resolveSoraPackage(gameCode, packageData = {}, { force = false } = {}) {
  const result = await getLiveSoraPackages(gameCode, { force });
  const packages = Array.isArray(result?.packages) ? result.packages : [];
  if (packages.length === 0) return null;

  // Match a requested code against Bay2Game product_codes, e.g. "55" or "MLBB_55" -> MLBB_55.
  const smartFind = (requested) => {
    const want = cleanString(requested, 100).toLowerCase();
    if (!want) return null;
    const exact = findPackageByCode(packages, want);
    if (exact) return exact;
    const wantNum = trailingNumber(want);
    return packages.find((item) => {
      const have = String(item.code || '').toLowerCase();
      if (have === want) return true;
      if (have.endsWith(`_${want}`)) return true;
      if (wantNum && trailingNumber(have) === wantNum && (have.includes(want) || have.endsWith(`_${wantNum}`))) return true;
      return false;
    }) || null;
  };

  const explicitProviderCode = packageData.providerCode || packageData.soraCode;
  if (explicitProviderCode) {
    const explicitMatch = smartFind(explicitProviderCode);
    if (explicitMatch) return explicitMatch;
  }

  const legacyCodeMatch = smartFind(packageData.code);
  if (legacyCodeMatch) return legacyCodeMatch;

  const requestedName = normalizePackageLookup(packageData.name);
  if (requestedName) {
    const exactNameMatch = packages.find(
      (item) => normalizePackageLookup(item.name) === requestedName
    );
    if (exactNameMatch) return exactNameMatch;
  }

  const searchableText = `${packageData.name || ''} ${packageData.code || ''}`.toLowerCase();
  const compactText = normalizePackageLookup(searchableText);
  const namedSkuAliases = [
    { pattern: /weeklyelite|eliteweekly/, code: 'WeeklyElite' },
    { pattern: /monthlyepic|epicmonthly/, code: 'MonthlyEpic' },
    { pattern: /twilight/, code: 'Twilight' },
  ];

  for (const alias of namedSkuAliases) {
    if (alias.pattern.test(compactText)) {
      const match = findPackageByCode(packages, alias.code);
      if (match) return match;
    }
  }

  if (/weekly|w\s*[.]?\s*pass/.test(searchableText)) {
    const multiplierMatch = searchableText.match(/(?:x\s*(10|[2-5])|\b(10|[2-5])\s*x|\b(10|[2-5])\s*weekly)/i);
    const multiplier = Number(multiplierMatch?.[1] || multiplierMatch?.[2] || multiplierMatch?.[3] || 1);
    const weeklyCode = multiplier > 1 ? `${multiplier}Weekly` : 'Weekly';
    const match = findPackageByCode(packages, weeklyCode);
    if (match) return match;
  }

  const diamondCount = Number(packageData.diamonds);
  if (Number.isFinite(diamondCount) && diamondCount > 0) {
    const normalizedDiamondCount = Math.trunc(diamondCount);
    const exactDiamondMatch = smartFind(String(normalizedDiamondCount));
    if (exactDiamondMatch) return exactDiamondMatch;

    const suffixedDiamondMatches = packages.filter((item) => {
      const match = String(item.code || '').match(/^(\d+)[a-z]+$/i);
      return match && Number(match[1]) === normalizedDiamondCount;
    });
    if (suffixedDiamondMatches.length === 1) return suffixedDiamondMatches[0];
  }

  const numbersInName = String(packageData.name || '').match(/\d[\d,]*/g) || [];
  if (numbersInName.length === 1) {
    const exactNameQuantityMatch = smartFind(numbersInName[0].replaceAll(',', ''));
    if (exactNameQuantityMatch) return exactNameQuantityMatch;
  }

  return null;
}

export async function getSoraOrders({ limit = 50, query = '' } = {}) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const cleanQ = cleanString(query, 100).toLowerCase();

  if (cleanQ.length >= 8 && !cleanQ.includes(' ')) {
    try {
      const singleOrder = await getSoraOrder(query);
      if (singleOrder?.ok && singleOrder?.refid) {
        return [singleOrder];
      }
    } catch {
      // Continue to list search
    }
  }

  // Bay2Game has no bulk order-list endpoint (ML/FF history lives in our own store).
  // The legacy SoraTopup provider does, so we surface its list (Roblox orders) when configured.
  let orders = [];
  try {
    const payload = await providerRequest(`/orders?limit=${safeLimit}`, { provider: 'soratopup' });
    orders = Array.isArray(payload?.orders) ? payload.orders : [];
  } catch {
    return [];
  }

  if (!cleanQ) return orders;

  return orders.filter((o) => {
    const ref = cleanString(o.refid || o.ref).toLowerCase();
    const player = cleanString(o.player).toLowerCase();
    const nick = cleanString(o.nickname).toLowerCase();
    const game = cleanString(o.gameId || o.gameLabel).toLowerCase();
    const item = cleanString(o.item).toLowerCase();
    const reason = cleanString(o.reason).toLowerCase();

    return (
      ref.includes(cleanQ) ||
      player.includes(cleanQ) ||
      nick.includes(cleanQ) ||
      game.includes(cleanQ) ||
      item.includes(cleanQ) ||
      reason.includes(cleanQ)
    );
  });
}

export async function getSoraOrder(ref) {
  const cleanRef = cleanString(ref, 80);
  if (!cleanRef) {
    throw new SoraTopupError('Order reference is required.', {
      status: 400,
      code: 'missing_ref',
    });
  }
  // Order could belong to either provider. Try Bay2Game first, then fall back to legacy SoraTopup.
  try {
    const payload = await providerRequest(`/check_order?reference=${encodeURIComponent(cleanRef)}`, { provider: 'bay2game' });
    const order = payload?.order || payload?.data || payload || {};
    return {
      ok: true,
      refid: order?.reference || cleanRef,
      ref: cleanRef,
      status: order?.status,
      player: order?.game_user_id,
      item: order?.product_name || order?.product_code,
      amount: order?.price ?? order?.cost,
      raw: payload,
      ...order,
    };
  } catch (bay2Err) {
    try {
      return await providerRequest(`/order?ref=${encodeURIComponent(cleanRef)}`, { provider: 'soratopup' });
    } catch {
      throw bay2Err;
    }
  }
}

export async function createSoraOrder({ game, code, fieldValues = [], orderRef = '' }) {
  const cleanGame = cleanString(game, 40);
  const cleanCode = cleanString(code, 100);
  if (!cleanGame) throw new SoraTopupError('Game code is required.', { status: 400, code: 'game_required' });
  if (!cleanCode) throw new SoraTopupError('Item/package code is required.', { status: 400, code: 'code_required' });
  if (!Array.isArray(fieldValues) || fieldValues.length === 0 || !cleanString(fieldValues[0])) {
    throw new SoraTopupError('Player details (fieldValues) are required.', { status: 400, code: 'missing_fields' });
  }

  const reference = cleanString(orderRef, 80) || `YGS_${cleanGame}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    // RoS Angkor via the RosAngkor provider: gid = player's Game ID (fieldValues[0]), code = pack (dm800).
    if (cleanGame === 'rosangkor') {
      const result = await createRosAngkorTopup({ gid: fieldValues[0], pack: cleanCode, orderId: reference });
      markProviderHealth(cleanGame, true);
      return {
        ok: true,
        refid: result.code || reference,
        ref: reference,
        reference: result.order_id || reference,
        status: String(result.status) === 'delivered' ? 'delivered' : (result.status || 'processing'),
        item: `${result.diamonds || ''} Diamonds`.trim(),
        amount: result.price != null ? Number(result.price) : undefined,
        raw: result,
      };
    }

    // Legacy SoraTopup provider (Roblox / robuxsend) keeps its original order contract.
    if (providerForGame(cleanGame) === 'soratopup') {
      const res = await providerRequest('/order', {
        provider: 'soratopup',
        method: 'POST',
        headers: {
          'Idempotency-Key': reference,
          'X-Idempotency-Key': reference,
        },
        body: {
          game: cleanGame,
          code: cleanCode,
          fieldValues: fieldValues.map((v) => cleanString(v, 120)),
          idempotency_key: reference,
          idempotencyKey: reference,
          orderRef: reference,
        },
      });
      markProviderHealth(cleanGame, true);
      return res;
    }

    // Bay2Game provider (ML / FF / RoS): reference is required, unique, and doubles as the status handle.
    const providerGame = toProviderGameCode(cleanGame);
    const body = {
      game_code: providerGame,
      product_code: cleanCode,
      game_user_id: cleanString(fieldValues[0], 120),
      reference,
    };
    // Second field for games that need it — Bay2Game reads it as `game_zone_id`.
    // ML: zone/server id. RoS Legacy: account password. Any imported 2-field game: the 2nd field.
    if (cleanString(fieldValues[1])) {
      body.game_zone_id = cleanString(fieldValues[1], 120);
    }

    const payload = await providerRequest('/create_order', { provider: 'bay2game', method: 'POST', body });
    markProviderHealth(cleanGame, true);

    // Normalize to the shape the fulfillment layer expects (refid/ref/status/item/amount).
    const order = payload?.order || payload?.data || payload || {};
    const providerRef = order?.reference || payload?.reference || reference;
    return {
      ok: true,
      refid: providerRef,
      ref: reference,
      reference: providerRef,
      status: order?.status || payload?.status || 'submitted',
      item: order?.product_name || order?.product_code || payload?.product_name,
      amount: order?.price ?? order?.cost ?? payload?.price,
      raw: payload,
    };
  } catch (err) {
    // Flag the game as "down" only for upstream-supplier outages (not for bad credentials).
    if (err instanceof SoraTopupError && SUPPLIER_DOWN_PATTERNS.test(err.message || '')) {
      markProviderHealth(cleanGame, false, err.message);
    }
    throw err;
  }
}

export function normalizeOrderQuantity(value) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ORDER_QUANTITY) {
    throw new SoraTopupError(`Quantity must be a whole number between 1 and ${MAX_ORDER_QUANTITY}.`, {
      status: 400,
      code: 'invalid_quantity',
    });
  }
  return quantity;
}

export function buildSoraBatchPlan(orderRef, quantity) {
  const count = normalizeOrderQuantity(quantity);
  const baseRef = cleanString(orderRef, 80) || `YGS_BATCH_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  return Array.from({ length: count }, (_, index) => {
    if (count === 1) return { index: 0, orderRef: baseRef };
    const suffix = `-${index + 1}`;
    return {
      index,
      orderRef: `${baseRef.slice(0, 80 - suffix.length)}${suffix}`,
    };
  });
}

export async function createSoraOrderBatch(
  { game, code, fieldValues = [], orderRef = '', quantity = 1 },
  { orderFn = createSoraOrder } = {}
) {
  const plan = buildSoraBatchPlan(orderRef, quantity);
  const successful = [];
  const failed = [];

  // Submit sequentially to avoid provider rate spikes. Child references make retries idempotent.
  for (const item of plan) {
    try {
      const response = await orderFn({
        game,
        code,
        fieldValues,
        orderRef: item.orderRef,
      });
      successful.push({
        item: item.index + 1,
        orderRef: item.orderRef,
        providerRef: response?.refid || response?.ref || null,
        response,
      });
    } catch (error) {
      failed.push({
        item: item.index + 1,
        orderRef: item.orderRef,
        code: error?.code || 'provider_error',
        message: error?.message || 'Provider order failed.',
      });
    }
  }

  if (successful.length === 0) {
    throw new SoraTopupError('SoraTopup could not deliver any item in this quantity batch. The paid order requires admin review.', {
      status: 502,
      code: 'batch_fulfillment_failed',
    });
  }

  return {
    requestedQuantity: plan.length,
    completedQuantity: successful.length,
    failedQuantity: failed.length,
    status: failed.length === 0 ? 'COMPLETED' : 'PARTIAL',
    successful,
    failed,
  };
}

export async function getSoraStatus() {
  const [account, catalogue] = await Promise.all([
    providerRequest('/profile'),
    getSoraCatalogue(),
  ]);

  const user = account?.user || account || {};
  return {
    configured: true,
    connected: true,
    balance: Number(user?.balance ?? 0),
    username: cleanString(user?.username, 80),
    currency: 'USD',
    gameCount: catalogue.count,
    catalogueFetchedAt: catalogue.fetchedAt,
  };
}

export async function getSoraGameImageSource(gameCode) {
  const code = storefrontGameCode(gameCode);
  if (code === 'robuxsend') return '/assets/games/roblox_tile_4k.jpg';
  if (code === 'roslegacy') return '/assets/brand/yurigame-logo.webp';

  const catalogue = await getSoraCatalogue();
  const game = catalogue.games.find((item) => item.code === code);

  if (!game?.image) {
    throw new SoraTopupError('Game image was not found.', {
      status: 404,
      code: 'image_not_found',
    });
  }

  const imageUrl = new URL(game.image);
  const allowedHosts = ['soratopup.com', 'cdn.camrapidsecure.com', 'camrapidsecure.com', 'bay2game.xyz', 'api.bay2game.xyz'];
  const allowedHost = allowedHosts.some((host) => imageUrl.hostname === host || imageUrl.hostname.endsWith(`.${host}`));
  if (imageUrl.protocol !== 'https:' || !allowedHost) {
    throw new SoraTopupError('Game image source is not allowed.', {
      status: 400,
      code: 'image_source_not_allowed',
    });
  }

  return imageUrl.toString();
}
