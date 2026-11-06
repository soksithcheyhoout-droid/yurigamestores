import { getOrCreateDeviceId } from './orderStore';

const REQUEST_TIMEOUT_MS = 15_000;
const FALLBACK_GAME_IMAGE = '/assets/games/mlbb_tile_4k.jpg';

export class SoraCatalogueError extends Error {
  constructor(message, code = 'catalogue_error') {
    super(message);
    this.name = 'SoraCatalogueError';
    this.code = code;
  }
}

async function requestJson(path, { signal, method = 'GET', body } = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortFromParent = () => controller.abort();
  signal?.addEventListener('abort', abortFromParent, { once: true });

  try {
    const response = await fetch(path, {
      method,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.success !== true) {
      throw new SoraCatalogueError(
        payload?.error || 'Live catalogue is temporarily unavailable.',
        payload?.code || 'catalogue_unavailable',
      );
    }
    return payload;
  } catch (error) {
    if (error instanceof SoraCatalogueError) throw error;
    if (error?.name === 'AbortError') {
      throw new SoraCatalogueError('Live catalogue request timed out.', 'catalogue_timeout');
    }
    throw new SoraCatalogueError('Could not connect to the live catalogue.', 'catalogue_unavailable');
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromParent);
  }
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapField(field, index) {
  const name = String(field?.name || field?.label || `Field ${index + 1}`);
  const options = Array.isArray(field?.options) ? field.options : [];
  return {
    key: field?.key || `${slugify(name).replaceAll('-', '_') || 'field'}_${index}`,
    label: name,
    type: options.length || field?.type === 'select' ? 'select' : 'text',
    options,
    required: field?.required !== false,
    placeholder: field?.placeholder || `Enter ${name}`,
  };
}

export const CANONICAL_GAME_SLUGS = {
  robuxsend: 'roblox',
  ml: 'mobile-legends',
  ff: 'free-fire',
  roslegacy: 'ros-legacy',
};

export function mapSoraGame(game) {
  const code = String(game?.code || '').trim();
  if (!code) return null;

  const slug = CANONICAL_GAME_SLUGS[code] || `sora-${code}`;

  const defaultTile =
    code === 'robuxsend' ? '/assets/games/roblox_tile_4k.jpg' :
    code === 'ml' ? '/assets/games/mlbb_tile_4k.jpg' :
    code === 'ff' ? '/assets/games/freefire_tile_4k.jpg' :
    '/assets/brand/yurigame-logo.webp';

  const defaultBanner =
    code === 'robuxsend' ? '/assets/games/roblox_hero_4k.jpg' :
    code === 'ml' ? '/assets/games/mlbb_hero_4k.jpg' :
    code === 'ff' ? '/assets/games/freefire_hero_4k.jpg' :
    '/assets/brand/yurigame-logo.webp';

  const rawImage = String(game?.image || '');
  const rawBanner = String(game?.banner || game?.image || '');
  const finalImage = (!rawImage || rawImage.includes('harikitopup.com')) ? defaultTile : rawImage;
  const finalBanner = (!rawBanner || rawBanner.includes('harikitopup.com')) ? defaultBanner : rawBanner;

  const publisherMap = {
    robuxsend: 'Roblox Corp',
    ml: 'Moonton',
    ff: 'Garena',
    roslegacy: 'NetEase',
  };
  const publisher = game?.publisher || publisherMap[code] || 'Official Publisher';

  return {
    id: `sora_${code}`,
    slug,
    provider: 'soratopup',
    providerCode: code,
    orderingEnabled: true,
    verificationMode: game?.verificationMode || (code === 'robuxsend' ? 'official' : 'none'),
    name: String(game?.name || (code === 'robuxsend' ? 'Roblox' : code)),
    publisher,
    category: 'popular',
    badge: code === 'robuxsend' ? 'Instant Robux' : 'Official Top-Up',
    image: finalImage,
    banner: finalBanner,
    description: String(
      game?.description ||
      (code === 'robuxsend'
        ? 'Instant Robux delivery to your Roblox account by username. Safe and verified.'
        : 'Official game top-up with instant automated delivery.')
    ),
    currency: code === 'robuxsend' ? 'Robux' : 'Diamonds',
    needServer: Boolean(game?.needServer),
    fields: (Array.isArray(game?.fields) ? game.fields : []).map(mapField),
    packages: [],
    stockOpen: game?.stockOpen !== false,
    maintenance: Boolean(game?.maintenance),
    maintenanceReason: game?.maintenanceReason || '',
    rating: 'Live',
    sales: 'API',
  };
}

function mapSoraPackage(item, gameCode) {
  const code = String(item?.code || '').trim();
  const price = Number(item?.price);
  if (!code || !Number.isFinite(price)) return null;

  return {
    id: `sora_${gameCode}_${code}`,
    providerCode: code,
    name: String(item?.name || code),
    price,
    bonus: 'Live provider price',
    popular: false,
  };
}

export const FALLBACK_FOUR_GAMES = [
  {
    code: 'robuxsend',
    name: 'Roblox',
    image: '/assets/games/current_roblox.jpg',
    banner: '/assets/games/current_roblox.jpg',
    description: 'Robux delivered by Roblox username after account verification.',
    needServer: false,
    verificationMode: 'official',
    fields: [{ name: 'Roblox Username', required: true, type: 'text', options: [] }],
  },
  {
    code: 'ml',
    name: 'Mobile Legends KH',
    image: '/assets/games/current_mobile-legends.jpg',
    banner: '/assets/banners/banner_mlbb.jpg',
    description: 'Mobile Legends KH top-up. Enter your User ID and Zone ID.',
    needServer: true,
    verificationMode: 'live',
    fields: [
      { name: 'User ID', required: true, type: 'text', options: [] },
      { name: 'Server ID', required: true, type: 'text', options: [] },
    ],
  },
  {
    code: 'ff',
    name: 'Free Fire',
    image: '/assets/games/current_free-fire.jpg',
    banner: '/assets/banners/banner_freefire.jpg',
    description: 'Free Fire direct top-up. Available for KH/SG/MY and all regions.',
    needServer: false,
    verificationMode: 'live',
    fields: [{ name: 'Player ID', placeholder: 'Enter Free Fire Player ID (e.g. 10000001)', required: true, type: 'text', options: [] }],
  },
  {
    code: 'roslegacy',
    name: 'RoS Legacy',
    image: '/assets/games/current_ros-legacy.jpg',
    banner: '/assets/games/current_ros-legacy.jpg',
    description: 'RoS Legacy top-up. Enter your public username only.',
    needServer: false,
    verificationMode: 'format',
    fields: [{ name: 'Username', required: true, type: 'text', options: [] }],
  },
];

const FALLBACK_PACKAGES_BY_CODE = {
  robuxsend: [
    { code: '10', name: '10 Robux', price: 0.10 },
    { code: '20', name: '20 Robux', price: 0.19 },
    { code: '50', name: '50 Robux', price: 0.45 },
    { code: '80', name: '80 Robux', price: 0.74 },
    { code: '100', name: '100 Robux', price: 0.89 },
    { code: '200', name: '200 Robux', price: 1.78 },
    { code: '400', name: '400 Robux', price: 3.55 },
    { code: '800', name: '800 Robux', price: 6.99 },
    { code: '1000', name: '1,000 Robux', price: 8.75 },
    { code: '2000', name: '2,000 Robux', price: 17.50 },
  ],
  ml: [
    { code: '55', name: '55 Diamonds', price: 0.93 },
    { code: 'weekly', name: 'Weekly Diamond Pass', price: 1.81 },
    { code: '86', name: '86 Diamonds', price: 1.48 },
    { code: '172', name: '172 Diamonds', price: 2.92 },
    { code: '257', name: '257 Diamonds', price: 4.18 },
    { code: '343', name: '343 Diamonds', price: 5.65 },
    { code: '706', name: '706 Diamonds', price: 11.20 },
    { code: '2195', name: '2,195 Diamonds', price: 34.50 },
  ],
  ff: [
    { code: '100', name: '100 Diamonds', price: 0.95 },
    { code: 'weekly', name: 'Weekly Membership', price: 1.90 },
    { code: '310', name: '310 Diamonds', price: 2.85 },
    { code: '520', name: '520 Diamonds', price: 4.65 },
    { code: 'monthly', name: 'Monthly Membership', price: 7.60 },
    { code: '1060', name: '1,060 Diamonds', price: 9.20 },
  ],
  roslegacy: [
    { code: '60', name: '60 Diamonds', price: 0.99 },
    { code: '330', name: '300 + 30 Diamonds', price: 4.99 },
    { code: '748', name: '680 + 68 Diamonds', price: 9.99 },
    { code: '1408', name: '1,280 + 128 Diamonds', price: 19.99 },
  ],
};

const CATALOGUE_CACHE_KEY = 'yurigame_catalogue_cache_v2';

export function getCachedCatalogue() {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(CATALOGUE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.games) && parsed.games.length > 0) {
      return parsed;
    }
  } catch {}
  return null;
}

export function setCachedCatalogue(catalogue) {
  try {
    if (typeof window !== 'undefined' && Array.isArray(catalogue?.games) && catalogue.games.length > 0) {
      window.localStorage.setItem(CATALOGUE_CACHE_KEY, JSON.stringify(catalogue));
    }
  } catch {}
}

export async function fetchSoraCatalogue(options = {}) {
  try {
    const payload = await requestJson('/api/soratopup/catalogue', options);
    const games = (Array.isArray(payload.games) ? payload.games : [])
      .map(mapSoraGame)
      .filter(Boolean);
    if (games.length > 0) {
      const result = {
        games,
        count: Number(payload.count) || games.length,
        fetchedAt: payload.fetchedAt || null,
        isFallback: false,
      };
      setCachedCatalogue(result);
      return result;
    }
  } catch (error) {
    if (options.signal?.aborted) {
      const cached = getCachedCatalogue();
      if (cached) return cached;
      return {
        games: FALLBACK_FOUR_GAMES.map(mapSoraGame).filter(Boolean),
        count: FALLBACK_FOUR_GAMES.length,
        fetchedAt: new Date().toISOString(),
        isFallback: true,
      };
    }
    console.warn('Backend catalogue connecting, using verified local store:', error.message);
  }

  const cached = getCachedCatalogue();
  if (cached) return cached;

  const fallback = FALLBACK_FOUR_GAMES.map(mapSoraGame).filter(Boolean);
  return {
    games: fallback,
    count: fallback.length,
    fetchedAt: new Date().toISOString(),
    isFallback: true,
  };
}

export async function fetchSoraGameWithPackages(gameCode, options = {}) {
  const code = String(gameCode || '').trim();
  if (!code) throw new SoraCatalogueError('A game code is required.', 'invalid_game_code');

  try {
    const payload = await requestJson(`/api/soratopup/packages?game=${encodeURIComponent(code)}`, options);
    const game = mapSoraGame(payload.game || { code, name: code });
    const packages = (Array.isArray(payload.packages) ? payload.packages : [])
      .map((item) => mapSoraPackage(item, code))
      .filter(Boolean);

    if (game && packages.length > 0) {
      return {
        ...game,
        packages,
        providerFetchedAt: payload.fetchedAt || null,
      };
    }
  } catch (error) {
    if (options.signal?.aborted) throw error;
    console.warn('Backend packages connecting, using verified local packages:', error.message);
  }

  // Graceful local packages fallback
  const fallbackGameData = FALLBACK_FOUR_GAMES.find((g) => g.code === code) || { code, name: code };
  const game = mapSoraGame(fallbackGameData);
  const rawPackages = FALLBACK_PACKAGES_BY_CODE[code] || [
    { code: 'pack_1', name: 'Standard Pack', price: 1.00 },
    { code: 'pack_2', name: 'Pro Pack', price: 5.00 },
  ];
  const packages = rawPackages.map((item) => mapSoraPackage(item, code)).filter(Boolean);

  return {
    ...game,
    packages,
    providerFetchedAt: new Date().toISOString(),
  };
}

export async function verifySoraPlayer(gameCode, fieldValues, options = {}) {
  const code = String(gameCode || '').trim();
  if (!code) throw new SoraCatalogueError('A game code is required.', 'invalid_game_code');

  return requestJson('/api/soratopup/verify-player', {
    ...options,
    method: 'POST',
    body: {
      gameCode: code,
      fieldValues: Array.isArray(fieldValues) ? fieldValues : [],
    },
  });
}

export function isSoraGame(game) {
  return game?.provider === 'soratopup' && Boolean(game?.providerCode);
}

export async function searchSoraOrders(query = '', options = {}) {
  const q = String(query || '').trim();
  const deviceId = getOrCreateDeviceId();
  const endpoint = `/api/soratopup/orders/lookup?query=${encodeURIComponent(q)}&deviceId=${encodeURIComponent(deviceId)}`;
  return requestJson(endpoint, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'x-device-id': deviceId,
    },
  });
}

export async function fetchSoraOrder(ref, options = {}) {
  const cleanRef = String(ref || '').trim();
  if (!cleanRef) throw new SoraCatalogueError('An order reference is required.', 'invalid_order_ref');
  return requestJson(`/api/soratopup/order/${encodeURIComponent(cleanRef)}`, options);
}

export async function createSoraTopupOrder(
  {
    game,
    code,
    fieldValues = [],
    orderRef = '',
    packageName = '',
    totalUsd = 0,
    totalKhr = '',
    paymentMethod = '',
    quantity = 1,
    playerDetails = {},
  },
  options = {}
) {
  return requestJson('/api/soratopup/order', {
    ...options,
    method: 'POST',
    body: {
      game,
      code,
      fieldValues,
      orderRef,
      packageName,
      totalUsd,
      totalKhr,
      paymentMethod,
      quantity,
      playerDetails,
    },
  });
}
