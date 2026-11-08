import React, { useEffect, useState } from 'react';
import { getBootSiteLogo } from '../data/bootData';

export const DEFAULT_SITE_LOGO = '/assets/brand/yurigame-logo.png';
const SITE_LOGO_STORAGE_KEY = 'yurigame_site_logo_v2';
const SITE_CONFIG_CACHE_KEY = 'yurigame_site_config_cache_v3';

let memorySiteLogo = null;
const trimmedLogoCache = new Map();
const TRIMMED_LOGO_STORAGE_KEY = 'yurigame_logo_trimmed_v1';

function hashLogoSource(str) {
  const s = String(str || '');
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return `${s.length}_${h >>> 0}`;
}

// Restore the last trimmed logo from storage so a refresh paints the final logo instantly.
(function hydrateTrimmedLogoCache() {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(TRIMMED_LOGO_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.hash === 'string' && typeof parsed.trimmed === 'string') {
      trimmedLogoCache.set(`hash:${parsed.hash}`, parsed.trimmed);
    }
  } catch {}
})();

function getStoredTrimmedLogo(srcUrl) {
  if (trimmedLogoCache.has(srcUrl)) return trimmedLogoCache.get(srcUrl);
  const byHash = trimmedLogoCache.get(`hash:${hashLogoSource(srcUrl)}`);
  if (byHash) {
    const resolved = byHash === '__self__' ? srcUrl : byHash;
    trimmedLogoCache.set(srcUrl, resolved);
    return resolved;
  }
  return '';
}

function persistTrimmedLogo(srcUrl, trimmed) {
  trimmedLogoCache.set(srcUrl, trimmed);
  if (typeof window === 'undefined') return;
  try {
    const hash = hashLogoSource(srcUrl);
    const stored = trimmed === srcUrl ? '__self__' : trimmed;
    trimmedLogoCache.set(`hash:${hash}`, stored);
    window.localStorage.setItem(TRIMMED_LOGO_STORAGE_KEY, JSON.stringify({ hash, trimmed: stored }));
  } catch {}
}

function updateBrowserFavicon(logoUrl) {
  if (typeof document === 'undefined' || !logoUrl) return;
  try {
    let iconLink = document.querySelector("link[rel~='icon']");
    if (!iconLink) {
      iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      document.head.appendChild(iconLink);
    }
    iconLink.href = logoUrl;
  } catch {}
}

export function isValidLogoUrl(val) {
  if (!val || typeof val !== 'string') return false;
  const clean = val.trim();
  if (
    !clean ||
    clean === '[object Object]' ||
    clean === 'undefined' ||
    clean === 'null' ||
    clean === '/assets/brand/yurigame-logo.webp' ||
    clean.startsWith('/assets/uploads/') ||
    clean.includes('harikitopup.com')
  ) {
    return false;
  }
  if (clean.startsWith('data:image/')) {
    return clean.includes(';base64,') && clean.length >= 180;
  }
  return (
    clean.startsWith('/') ||
    clean.startsWith('https://') ||
    clean.startsWith('http://')
  );
}

/**
 * Automatically tight-crops excess transparent margins around a logo image
 * so the emblem/character fills 100% of its display container.
 */
function autoTrimTransparentLogo(srcUrl) {
  return new Promise((resolve) => {
    if (typeof document === 'undefined' || !isValidLogoUrl(srcUrl)) {
      return resolve(srcUrl);
    }
    const known = getStoredTrimmedLogo(srcUrl);
    if (known) {
      return resolve(known);
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => resolve(srcUrl);
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h || w < 16 || h < 16) return resolve(srcUrl);
        const maxDim = 512;
        const scale = w > maxDim || h > maxDim ? maxDim / Math.max(w, h) : 1;
        const cw = Math.max(1, Math.round(w * scale));
        const ch = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(srcUrl);
        ctx.drawImage(img, 0, 0, cw, ch);
        const { data } = ctx.getImageData(0, 0, cw, ch);

        let minX = cw;
        let minY = ch;
        let maxX = 0;
        let maxY = 0;
        let found = false;

        for (let y = 0; y < ch; y++) {
          for (let x = 0; x < cw; x++) {
            const a = data[(y * cw + x) * 4 + 3];
            if (a > 45) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              found = true;
            }
          }
        }

        const boxW = maxX - minX + 1;
        const boxH = maxY - minY + 1;
        if (!found || boxW < 12 || boxH < 12) {
          persistTrimmedLogo(srcUrl, srcUrl);
          return resolve(srcUrl);
        }

        // Only re-encode if trimming actually removes meaningful margin (>4% on any axis)
        if (boxW >= cw * 0.96 && boxH >= ch * 0.96) {
          persistTrimmedLogo(srcUrl, srcUrl);
          return resolve(srcUrl);
        }

        const pad = 2;
        const sx = Math.max(0, minX - pad);
        const sy = Math.max(0, minY - pad);
        const sw = Math.min(cw - sx, boxW + pad * 2);
        const sh = Math.min(ch - sy, boxH + pad * 2);

        const out = document.createElement('canvas');
        out.width = sw;
        out.height = sh;
        const outCtx = out.getContext('2d');
        if (!outCtx) return resolve(srcUrl);
        outCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
        const trimmedDataUrl = out.toDataURL('image/png');
        persistTrimmedLogo(srcUrl, trimmedDataUrl);
        resolve(trimmedDataUrl);
      } catch {
        resolve(srcUrl);
      }
    };
    img.src = srcUrl;
  });
}

export function getSiteLogo() {
  if (isValidLogoUrl(memorySiteLogo)) return memorySiteLogo;
  // Server-injected live logo (from the database) always wins on page load/refresh.
  const bootLogo = getBootSiteLogo();
  if (isValidLogoUrl(bootLogo)) {
    memorySiteLogo = bootLogo;
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(SITE_LOGO_STORAGE_KEY, bootLogo); } catch {}
    }
    return memorySiteLogo;
  }
  if (typeof window !== 'undefined') {
    try {
      const direct = window.localStorage.getItem(SITE_LOGO_STORAGE_KEY);
      if (isValidLogoUrl(direct)) {
        memorySiteLogo = direct.trim();
        return memorySiteLogo;
      } else if (direct) {
        window.localStorage.removeItem(SITE_LOGO_STORAGE_KEY);
      }
      const rawCfg = window.localStorage.getItem(SITE_CONFIG_CACHE_KEY);
      if (rawCfg) {
        const parsed = JSON.parse(rawCfg);
        const fromCfg = parsed?.siteLogo || parsed?.contacts?.siteLogo;
        if (isValidLogoUrl(fromCfg)) {
          memorySiteLogo = String(fromCfg).trim();
          return memorySiteLogo;
        }
      }
    } catch {}
  }
  return DEFAULT_SITE_LOGO;
}

export function isCustomSiteLogo(logoUrl) {
  if (!isValidLogoUrl(logoUrl)) return false;
  const clean = String(logoUrl).trim();
  return (
    clean !== DEFAULT_SITE_LOGO &&
    clean !== '/assets/brand/yurigame-logo.webp' &&
    clean !== '/assets/brand/yurigame-favicon.png'
  );
}

export function setSiteLogo(newLogo) {
  const candidate =
    newLogo && typeof newLogo === 'object' && typeof newLogo.url === 'string'
      ? newLogo.url
      : newLogo;
  const clean = isValidLogoUrl(candidate) ? String(candidate).trim() : DEFAULT_SITE_LOGO;
  memorySiteLogo = clean;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SITE_LOGO_STORAGE_KEY, clean);
      const rawCfg = window.localStorage.getItem(SITE_CONFIG_CACHE_KEY);
      if (rawCfg) {
        const parsed = JSON.parse(rawCfg);
        parsed.siteLogo = clean;
        if (parsed.contacts && typeof parsed.contacts === 'object') {
          parsed.contacts.siteLogo = clean;
        }
        window.localStorage.setItem(SITE_CONFIG_CACHE_KEY, JSON.stringify(parsed));
      }
    } catch {}
    updateBrowserFavicon(clean);
    window.dispatchEvent(new CustomEvent('yurigame_site_logo_changed', { detail: clean }));
  }
  return clean;
}

let didInitialRemoteCheck = false;

const SIZE_STYLES = {
  xs: {
    mark: 'h-10 w-auto min-w-[40px] max-w-[96px] sm:h-11 sm:min-w-[44px] sm:max-w-[110px]',
    word: 'text-[14px] sm:text-[15.5px]',
    store: 'text-[6px]',
    gap: 'gap-2',
  },
  sm: {
    mark: 'h-12 w-auto min-w-[48px] max-w-[125px] sm:h-14 sm:min-w-[56px] sm:max-w-[145px]',
    word: 'text-[17px] sm:text-[19px]',
    store: 'text-[6.5px]',
    gap: 'gap-2.5',
  },
  md: {
    mark: 'h-14 w-auto min-w-[56px] max-w-[150px] sm:h-16 sm:min-w-[64px] sm:max-w-[175px] lg:h-[70px] lg:min-w-[70px] lg:max-w-[195px]',
    word: 'text-[19px] sm:text-[22px] lg:text-[24px]',
    store: 'text-[7px]',
    gap: 'gap-2.5 sm:gap-3',
  },
  lg: {
    mark: 'h-20 w-auto min-w-[80px] max-w-[220px] sm:h-24 sm:min-w-[96px] sm:max-w-[260px]',
    word: 'text-[26px] sm:text-[30px]',
    store: 'text-[8px]',
    gap: 'gap-3.5',
  },
};

export default function YuriGameLogo({
  className = '',
  showBadge = true,
  size = 'md',
  inverse = false,
  overrideLogo = '',
}) {
  const styles = SIZE_STYLES[size] || SIZE_STYLES.md;
  const [siteLogo, setSiteLogoState] = useState(() => getSiteLogo());

  useEffect(() => {
    const handleLogoChange = (event) => {
      const next = event?.detail || getSiteLogo();
      if (next) setSiteLogoState(next);
    };
    const handleConfigUpdate = (event) => {
      const cfg = event?.detail;
      const next = cfg?.siteLogo || cfg?.contacts?.siteLogo;
      if (next) {
        setSiteLogoState(next);
      } else {
        setSiteLogoState(getSiteLogo());
      }
    };
    const handleStorage = (event) => {
      if (event.key === SITE_LOGO_STORAGE_KEY || event.key === SITE_CONFIG_CACHE_KEY) {
        setSiteLogoState(getSiteLogo());
      }
    };

    window.addEventListener('yurigame_site_logo_changed', handleLogoChange);
    window.addEventListener('yurigame_site_config_updated', handleConfigUpdate);
    window.addEventListener('storage', handleStorage);

    if (!didInitialRemoteCheck) {
      didInitialRemoteCheck = true;
      // Server already injected the live logo into the page — no need to re-fetch and re-render.
      if (getBootSiteLogo()) {
        updateBrowserFavicon(getSiteLogo());
      } else {
        fetch('/api/site-config', { cache: 'no-store' })
          .then((res) => res.json())
          .then((data) => {
            const remoteLogo = data?.siteLogo || data?.contacts?.siteLogo;
            if (data?.success && remoteLogo && remoteLogo !== getSiteLogo()) {
              setSiteLogo(remoteLogo);
            }
          })
          .catch(() => {});
      }
    }

    return () => {
      window.removeEventListener('yurigame_site_logo_changed', handleLogoChange);
      window.removeEventListener('yurigame_site_config_updated', handleConfigUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const candidateLogo = overrideLogo || siteLogo || DEFAULT_SITE_LOGO;
  const activeLogo = isValidLogoUrl(candidateLogo) ? candidateLogo : DEFAULT_SITE_LOGO;
  const [trimmedFor, setTrimmedFor] = useState(() => {
    if (activeLogo === DEFAULT_SITE_LOGO) {
      return { src: activeLogo, out: DEFAULT_SITE_LOGO };
    }
    const known = getStoredTrimmedLogo(activeLogo);
    return known ? { src: activeLogo, out: known } : null;
  });

  useEffect(() => {
    let cancelled = false;
    if (activeLogo === DEFAULT_SITE_LOGO) {
      setTrimmedFor({ src: activeLogo, out: DEFAULT_SITE_LOGO });
      return undefined;
    }
    const known = getStoredTrimmedLogo(activeLogo);
    if (known) {
      setTrimmedFor((prev) => (prev?.src === activeLogo && prev?.out === known ? prev : { src: activeLogo, out: known }));
      return undefined;
    }
    autoTrimTransparentLogo(activeLogo).then((result) => {
      if (!cancelled) {
        setTrimmedFor({ src: activeLogo, out: result || activeLogo });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeLogo]);

  // If already trimmed or known, display immediately. If first time trimming an untrimmed image,
  // show with gentle transition so there is never an ugly layout snap or blank box.
  const isReady = Boolean(trimmedFor?.src === activeLogo || activeLogo === DEFAULT_SITE_LOGO);
  const displayLogo = (trimmedFor?.src === activeLogo ? trimmedFor.out : '') || activeLogo;

  return (
    <span
      className={`inline-flex min-w-0 items-center ${styles.gap} ${className}`}
      aria-label="YuriGame Store"
    >
      <span
        className={`${styles.mark} relative shrink-0 overflow-visible flex items-center justify-center bg-transparent`}
        aria-hidden="true"
      >
        <img
          src={displayLogo}
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="sync"
          className="h-full w-auto max-w-full object-contain drop-shadow-[0_3px_10px_rgba(0,0,0,0.55)] transition-opacity duration-150"
          style={{ opacity: isReady ? 1 : 0.85 }}
          draggable="false"
          onError={(e) => {
            if (!e.currentTarget.src.endsWith(DEFAULT_SITE_LOGO)) {
              e.currentTarget.src = DEFAULT_SITE_LOGO;
            }
          }}
        />
      </span>

      <span className="flex min-w-0 flex-col leading-none">
        <span className={`${styles.word} whitespace-nowrap font-black uppercase tracking-[-0.055em]`}>
          <span className={inverse ? 'text-white' : 'text-[#111217]'}>Yuri</span>
          <span className="text-[#e3062f]">Game</span>
          <span className={inverse ? 'text-white' : 'text-[#111217]'}>Store</span>
        </span>
      </span>
    </span>
  );
}
