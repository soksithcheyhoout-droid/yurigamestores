const MAX_TRACKED_CLIENTS = 50_000;

function normalizeIp(value) {
  const raw = String(value || 'unknown').trim().replace(/^::ffff:/, '').split('%')[0];
  if (!raw.includes(':')) return raw || 'unknown';

  // Group IPv6 clients by /64 so rotating privacy addresses cannot trivially bypass limits.
  const parts = raw.split(':').filter(Boolean);
  return `${parts.slice(0, 4).join(':')}::/64`;
}

export function getRequestIp(req) {
  return normalizeIp(req.ip || req.socket?.remoteAddress || 'unknown');
}

function pruneStore(store, now) {
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }

  if (store.size <= MAX_TRACKED_CLIENTS) return;
  const overflow = store.size - MAX_TRACKED_CLIENTS;
  let removed = 0;
  for (const key of store.keys()) {
    store.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
}

export function createRateLimiter({
  name,
  windowMs,
  max,
  skip,
  keyGenerator,
  message = 'Too many requests. Please wait and try again.',
}) {
  const store = new Map();
  let requestCount = 0;
  const safeWindowMs = Math.max(1_000, Number(windowMs) || 60_000);
  const safeMax = Math.max(1, Number(max) || 60);

  return function rateLimit(req, res, next) {
    if (req.method === 'OPTIONS' || req.method === 'HEAD' || skip?.(req)) return next();

    const now = Date.now();
    requestCount += 1;
    if (requestCount % 500 === 0 || store.size > MAX_TRACKED_CLIENTS) pruneStore(store, now);

    const identity = keyGenerator ? String(keyGenerator(req)) : getRequestIp(req);
    const key = `${name}:${identity}`;
    const current = store.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + safeWindowMs }
      : current;
    entry.count += 1;
    store.set(key, entry);

    const remaining = Math.max(0, safeMax - entry.count);
    const resetSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader('RateLimit-Limit', String(safeMax));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(resetSeconds));
    res.setHeader('RateLimit-Policy', `${safeMax};w=${Math.ceil(safeWindowMs / 1000)}`);

    if (entry.count <= safeMax) return next();

    res.setHeader('Retry-After', String(resetSeconds));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(429).json({
      success: false,
      code: 'rate_limited',
      error: message,
      retryAfterSeconds: resetSeconds,
    });
  };
}

export function createConcurrencyLimiter({ maxPerIp = 24, maxGlobal = 600 } = {}) {
  const activeByIp = new Map();
  let activeGlobal = 0;

  return function concurrencyLimit(req, res, next) {
    if (req.method === 'OPTIONS' || req.method === 'HEAD') return next();

    const key = getRequestIp(req);
    const activeForIp = activeByIp.get(key) || 0;
    if (activeForIp >= maxPerIp || activeGlobal >= maxGlobal) {
      res.setHeader('Retry-After', '2');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(429).json({
        success: false,
        code: 'too_many_concurrent_requests',
        error: 'Too many simultaneous requests. Please retry shortly.',
        retryAfterSeconds: 2,
      });
    }

    activeByIp.set(key, activeForIp + 1);
    activeGlobal += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      activeGlobal = Math.max(0, activeGlobal - 1);
      const remaining = Math.max(0, (activeByIp.get(key) || 1) - 1);
      if (remaining === 0) activeByIp.delete(key);
      else activeByIp.set(key, remaining);
    };

    res.once('finish', release);
    res.once('close', release);
    return next();
  };
}
