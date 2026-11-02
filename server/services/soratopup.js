const DEFAULT_BASE_URL = 'https://app.soratopup.com/api/v1';
const REQUEST_TIMEOUT_MS = 15_000;
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
    name: 'Mobile Legends: Bang Bang',
    verificationMode: 'live',
  },
  ff: {
    name: 'Free Fire',
    verificationMode: 'live',
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

function getConfig() {
  const rawBaseUrl = (process.env.SORATOPUP_BASE_URL || DEFAULT_BASE_URL).trim();
  const apiKey = (process.env.SORATOPUP_API_KEY || '').trim();

  if (!apiKey) {
    throw new SoraTopupError('SoraTopup is not configured.', {
      status: 503,
      code: 'provider_not_configured',
    });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawBaseUrl);
  } catch {
    throw new SoraTopupError('SoraTopup base URL is invalid.', {
      status: 503,
      code: 'provider_config_invalid',
    });
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new SoraTopupError('SoraTopup base URL must use HTTPS.', {
      status: 503,
      code: 'provider_config_invalid',
    });
  }

  return {
    baseUrl: parsedUrl.toString().replace(/\/+$/, ''),
    apiKey,
  };
}

async function providerRequest(path, { method = 'GET', body, headers = {} } = {}) {
  const { baseUrl, apiKey } = getConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    let payload;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      throw new SoraTopupError('SoraTopup returned an invalid response.', {
        status: 502,
        code: 'provider_invalid_response',
      });
    }

    if (!response.ok || payload?.ok === false) {
      const upstreamCode = String(payload?.error || 'provider_request_failed');
      const upstreamMsg = payload?.msg || payload?.error || 'SoraTopup could not complete the request.';
      const publicStatus = response.status === 429 ? 429 : response.status === 400 ? 400 : 502;
      throw new SoraTopupError(
        response.status === 429
          ? 'SoraTopup request limit reached. Please try again shortly.'
          : upstreamMsg,
        { status: publicStatus, code: upstreamCode },
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
  const code = cleanString(item?.code, 100);
  const price = Number(item?.price);
  if (!code || !Number.isFinite(price) || price < 0) return null;

  return {
    code,
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
    const payload = await providerRequest('/catalogue');
    normalizedGames = (Array.isArray(payload?.games) ? payload.games : [])
      .map(normalizeGame)
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
      image: '/assets/games/current_roblox.jpg',
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
      name: 'Mobile Legends: Bang Bang',
      image: '/assets/games/current_mobile-legends.jpg',
      description: 'Mobile Legends direct diamond top-up. Enter your User ID and Zone ID.',
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
      image: '/assets/games/current_free-fire.jpg',
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
      image: '/assets/games/current_ros-legacy.jpg',
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

export async function getLiveSoraPackages(gameCode, { force = false } = {}) {
  let code = validGameCode(gameCode);
  if (code === 'roblox') code = 'robuxsend';
  const cacheKey = `live:${code}`;
  const now = Date.now();
  const cached = packageCache.get(cacheKey);
  if (!force && cached && cached.expiresAt > now) return cached.value;

  const payload = await providerRequest(`/packages?game=${encodeURIComponent(code)}`);
  const game = normalizeGame(payload?.gameInfo || { code, name: payload?.game || code });
  const packages = (Array.isArray(payload?.packages) ? payload.packages : [])
    .map((item) => normalizePackage(item, code))
    .filter(Boolean);
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
          name: 'Mobile Legends: Bang Bang',
          image: '/assets/games/mlbb_tile_4k.jpg',
          description: 'Mobile Legends direct diamond top-up. Enter your User ID and Zone ID.',
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

  const explicitProviderCode = packageData.providerCode || packageData.soraCode;
  if (explicitProviderCode) {
    return findPackageByCode(packages, explicitProviderCode);
  }

  const legacyCodeMatch = findPackageByCode(packages, packageData.code);
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
    const exactDiamondMatch = findPackageByCode(packages, String(normalizedDiamondCount));
    if (exactDiamondMatch) return exactDiamondMatch;

    const suffixedDiamondMatches = packages.filter((item) => {
      const match = String(item.code || '').match(/^(\d+)[a-z]+$/i);
      return match && Number(match[1]) === normalizedDiamondCount;
    });
    if (suffixedDiamondMatches.length === 1) return suffixedDiamondMatches[0];
  }

  const numbersInName = String(packageData.name || '').match(/\d[\d,]*/g) || [];
  if (numbersInName.length === 1) {
    const exactNameQuantityMatch = findPackageByCode(packages, numbersInName[0].replaceAll(',', ''));
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

  const payload = await providerRequest(`/orders?limit=${safeLimit}`);
  const orders = Array.isArray(payload?.orders) ? payload.orders : [];

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
  return await providerRequest(`/order?ref=${encodeURIComponent(cleanRef)}`);
}

export async function createSoraOrder({ game, code, fieldValues = [], orderRef = '' }) {
  const cleanGame = cleanString(game, 40);
  const cleanCode = cleanString(code, 40);
  if (!cleanGame) throw new SoraTopupError('Game code is required.', { status: 400, code: 'game_required' });
  if (!cleanCode) throw new SoraTopupError('Item/package code is required.', { status: 400, code: 'code_required' });
  if (!Array.isArray(fieldValues) || fieldValues.length === 0) {
    throw new SoraTopupError('Player details (fieldValues) are required.', { status: 400, code: 'missing_fields' });
  }

  // SoraTopup requires an idempotency key to prevent accidental duplicate orders
  const idempotencyKey = cleanString(orderRef, 80) || `YGS_${cleanGame}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return await providerRequest('/order', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
      'X-Idempotency-Key': idempotencyKey,
    },
    body: {
      game: cleanGame,
      code: cleanCode,
      fieldValues: fieldValues.map((v) => cleanString(v, 120)),
      idempotency_key: idempotencyKey,
      idempotencyKey: idempotencyKey,
      ...(orderRef ? { orderRef: cleanString(orderRef, 80) } : {}),
    },
  });
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
    providerRequest('/balance'),
    getSoraCatalogue(),
  ]);

  return {
    configured: true,
    connected: true,
    currency: cleanString(account?.currency, 12),
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
  const allowedHost = imageUrl.hostname === 'soratopup.com' || imageUrl.hostname.endsWith('.soratopup.com');
  if (imageUrl.protocol !== 'https:' || !allowedHost) {
    throw new SoraTopupError('Game image source is not allowed.', {
      status: 400,
      code: 'image_source_not_allowed',
    });
  }

  return imageUrl.toString();
}
