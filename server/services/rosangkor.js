// RosAngkor provider (RoS Angkor auto top-up).
// Calls go out through a fixed-IP proxy (Fixie) so RosAngkor sees an allowlisted IP.
// Auth: X-API-Key header. Base URL + key + proxy come from env.
// Use undici's OWN fetch + ProxyAgent together so the dispatcher is compatible
// (Node's global fetch uses a separate internal undici and rejects this dispatcher).
import { fetch as undiciFetch, ProxyAgent } from 'undici';
import { getProviderCredential } from './providerCredentials.js';

const DEFAULT_BASE_URL = 'https://api.rosangkor.com/v1';
const REQUEST_TIMEOUT_MS = 20_000;

// Credentials are read dynamically so the admin panel can rotate the key/proxy at runtime.
// Admin-panel override (DB) wins over the env var.
function getBaseUrl() {
  return (getProviderCredential('rosangkor', 'baseUrl') || process.env.ROSANGKOR_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}
function getApiKey() {
  return getProviderCredential('rosangkor', 'apiKey') || process.env.ROSANGKOR_API_KEY || '';
}
function getProxyUrl() {
  return getProviderCredential('rosangkor', 'proxyUrl') || process.env.ROSANGKOR_PROXY_URL || '';
}

// One ProxyAgent per distinct proxy URL; rebuilt automatically when the proxy changes.
const _dispatchers = new Map();
function dispatcherFor(proxyUrl) {
  if (!proxyUrl) return undefined; // no proxy -> direct (will fail the IP allowlist)
  if (!_dispatchers.has(proxyUrl)) _dispatchers.set(proxyUrl, new ProxyAgent(proxyUrl));
  return _dispatchers.get(proxyUrl);
}

export function rosangkorConfigured() {
  return Boolean(getApiKey() && getProxyUrl() && getBaseUrl());
}

// Low-level request. Returns { status, ok, payload }. Credentials default to the live config but
// can be overridden per-call (used by the admin panel to validate a new key/proxy before saving).
export async function rosangkorRequest(path, { method = 'GET', body, form = false, apiKey, proxyUrl, baseUrl } = {}) {
  const key = (apiKey !== undefined ? apiKey : getApiKey());
  const base = (baseUrl || getBaseUrl()).replace(/\/+$/, '');
  const proxy = (proxyUrl !== undefined ? proxyUrl : getProxyUrl());
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = { Accept: 'application/json', 'X-API-Key': key };
  let outBody;
  if (body) {
    if (form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      outBody = new URLSearchParams(body).toString();
    } else {
      headers['Content-Type'] = 'application/json';
      outBody = JSON.stringify(body);
    }
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await undiciFetch(url, {
      method,
      headers,
      body: outBody,
      dispatcher: dispatcherFor(proxy),
      signal: controller.signal,
    });
    const text = await res.text();
    let payload;
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text.slice(0, 1000) }; }
    return { status: res.status, ok: res.ok, payload };
  } catch (err) {
    // Surface the real network cause (proxy/DNS/TLS) instead of a bare "fetch failed".
    const cause = err?.cause ? `${err.cause.code || ''} ${err.cause.message || ''}`.trim() : '';
    const e = new Error(cause ? `${err.message} (${cause})` : err.message);
    e.code = err?.cause?.code || err?.code;
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

// ---- High-level RosAngkor operations (per the official v1 API) ----

// GET /packs — the diamond packs you can sell (dm80 … dm40000) with your discounted price.
export async function getRosAngkorPacks() {
  const r = await rosangkorRequest('/packs');
  if (!r.ok || !r.payload?.ok) {
    throw new Error(r.payload?.message || `Could not load RosAngkor packs (${r.payload?.error || r.status})`);
  }
  return {
    currency: r.payload.currency || 'USD',
    discountPercent: Number(r.payload.discount_percent || 0),
    packs: Array.isArray(r.payload.packs) ? r.payload.packs : [],
  };
}

// GET /players/{gid} — verify a RoS player by their Game ID; returns the in-game name.
export async function checkRosAngkorPlayer(gid) {
  const clean = String(gid || '').trim();
  if (!/^\d{6,12}$/.test(clean)) {
    return { ok: false, error: 'bad_gid', message: 'Player ID must be 6–12 digits.' };
  }
  const r = await rosangkorRequest(`/players/${encodeURIComponent(clean)}`);
  if (!r.ok || !r.payload?.ok) {
    return { ok: false, error: r.payload?.error || 'player_not_found', message: r.payload?.message || 'Player not found.' };
  }
  return {
    ok: true,
    gid: r.payload.gid,
    name: r.payload.name,
    level: r.payload.level,
    banned: Boolean(r.payload.banned),
    nation: r.payload.nation,
    hasAvatar: Boolean(r.payload.has_avatar),
  };
}

// POST /topups — deliver diamonds. gid = player Game ID, pack = pack code (dm800), orderId = your unique ref.
export async function createRosAngkorTopup({ gid, pack, orderId }) {
  const body = { gid: String(gid || '').trim(), pack: String(pack || '').trim(), order_id: String(orderId || '').trim() };
  const r = await rosangkorRequest('/topups', { method: 'POST', body });
  if (!r.ok || !r.payload?.ok) {
    const err = r.payload?.error || 'topup_failed';
    const e = new Error(r.payload?.message || `RosAngkor top-up failed (${err})`);
    e.code = err;
    e.status = r.status;
    throw e;
  }
  return r.payload; // { ok, order_id, code, gid, pack, diamonds, status, player, price, balance, ... }
}

// GET /topups/{order_id} — check delivery status.
export async function getRosAngkorTopupStatus(orderId) {
  const r = await rosangkorRequest(`/topups/${encodeURIComponent(String(orderId || '').trim())}`);
  if (!r.ok || !r.payload?.ok) {
    return { ok: false, error: r.payload?.error || 'order_not_found', message: r.payload?.message || 'Order not found.' };
  }
  return r.payload; // { ok, order_id, code, status, diamonds, delivered_at, ... }
}

// Live health/validation ping (hits GET /me). Optionally test an override key/proxy before it is
// saved. Never throws — returns { ok, configured, account, balance, currency, message }.
export async function pingRosAngkor(override = {}) {
  const key = (override.apiKey !== undefined ? String(override.apiKey || '') : getApiKey()).trim();
  const proxy = (override.proxyUrl !== undefined ? String(override.proxyUrl || '') : getProxyUrl()).trim();
  const base = (override.baseUrl || getBaseUrl());
  if (!key) return { ok: false, configured: false, message: 'No RoS Angkor API key set.' };
  if (!proxy) return { ok: false, configured: false, message: 'No proxy URL set (RoS Angkor requires a static-IP proxy).' };
  try {
    const r = await rosangkorRequest('/me', { apiKey: key, proxyUrl: proxy, baseUrl: base });
    if (!r.ok || !r.payload?.ok) {
      return { ok: false, configured: true, status: r.status, message: r.payload?.message || r.payload?.error || `HTTP ${r.status}` };
    }
    return {
      ok: true,
      configured: true,
      account: r.payload.name || r.payload.id || '',
      balance: Number(r.payload.balance ?? 0),
      currency: r.payload.currency || 'USD',
      message: 'Connected',
    };
  } catch (err) {
    return { ok: false, configured: true, message: err.message || 'Request failed.' };
  }
}
