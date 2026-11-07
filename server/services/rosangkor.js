// RosAngkor provider (RoS Angkor auto top-up).
// Calls go out through a fixed-IP proxy (Fixie) so RosAngkor sees an allowlisted IP.
// Auth: X-API-Key header. Base URL + key + proxy come from env.
// Use undici's OWN fetch + ProxyAgent together so the dispatcher is compatible
// (Node's global fetch uses a separate internal undici and rejects this dispatcher).
import { fetch as undiciFetch, ProxyAgent } from 'undici';

const BASE_URL = (process.env.ROSANGKOR_BASE_URL || 'https://api.rosangkor.com/v1').replace(/\/+$/, '');
const API_KEY = process.env.ROSANGKOR_API_KEY || '';
const PROXY_URL = process.env.ROSANGKOR_PROXY_URL || '';
const REQUEST_TIMEOUT_MS = 20_000;

let _dispatcher = null;
function getDispatcher() {
  if (!PROXY_URL) return undefined; // no proxy configured -> direct (will fail IP allowlist)
  if (!_dispatcher) _dispatcher = new ProxyAgent(PROXY_URL);
  return _dispatcher;
}

export function rosangkorConfigured() {
  return Boolean(API_KEY && PROXY_URL && BASE_URL);
}

// Low-level request. Returns { status, ok, payload }.
export async function rosangkorRequest(path, { method = 'GET', body, form = false } = {}) {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = { Accept: 'application/json', 'X-API-Key': API_KEY };
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
      dispatcher: getDispatcher(),
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
