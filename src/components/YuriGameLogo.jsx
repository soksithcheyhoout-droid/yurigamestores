import React, { useEffect, useState } from 'react';
import { getBootSiteLogo } from '../data/bootData';

export const DEFAULT_SITE_LOGO = '/assets/brand/yurigame-logo.png';
const SITE_LOGO_STORAGE_KEY = 'yurigame_site_logo_v2';
const SITE_CONFIG_CACHE_KEY = 'yurigame_site_config_cache_v3';

let memorySiteLogo = null;
let didInitialRemoteCheck = false;

function updateBrowserFavicon(_logoUrl) {
  if (typeof document === 'undefined') return;
  try {
    let iconLink = document.querySelector("link[rel~='icon']");
    if (!iconLink) {
      iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      document.head.appendChild(iconLink);
    }
    // Always use the official crisp high-contrast favicon for the browser tab
    // Large wide logos squeezed into 16x16 become blurry/washed-out blobs
    iconLink.href = '/assets/brand/yurigame-favicon.png';
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

const SIZE_STYLES = {
  xs: {
    mark: 'h-8 w-auto min-w-[32px] max-w-[80px] sm:h-9 sm:min-w-[36px] sm:max-w-[96px]',
    word: 'text-[13px] sm:text-[14px]',
    store: 'text-[6px]',
    gap: 'gap-1.5 sm:gap-2',
  },
  sm: {
    mark: 'h-9 w-auto min-w-[36px] max-w-[90px] sm:h-10 sm:min-w-[40px] sm:max-w-[110px]',
    word: 'text-[15px] sm:text-[17px]',
    store: 'text-[6.5px]',
    gap: 'gap-2 sm:gap-2.5',
  },
  md: {
    mark: 'h-9 w-auto min-w-[36px] max-w-[90px] sm:h-11 sm:min-w-[44px] sm:max-w-[120px] lg:h-12 lg:min-w-[48px] lg:max-w-[135px]',
    word: 'text-[15px] sm:text-[18px] lg:text-[21px]',
    store: 'text-[7px]',
    gap: 'gap-1.5 sm:gap-2.5 lg:gap-3',
  },
  lg: {
    mark: 'h-16 w-auto min-w-[64px] max-w-[180px] sm:h-20 sm:min-w-[80px] sm:max-w-[220px]',
    word: 'text-[22px] sm:text-[26px]',
    store: 'text-[8px]',
    gap: 'gap-3',
  },
};

export default function YuriGameLogo({
  className = '',
  showBadge = true,
  size = 'md',
  inverse = false,
  overrideLogo = '',
  showText,
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

  const isCustom = isCustomSiteLogo(activeLogo);
  // Always show the website brand name text "YuriGameStore" unless explicitly set to showText={false}
  const shouldShowText = typeof showText === 'boolean' ? showText : true;

  return (
    <span
      className={`inline-flex min-w-0 items-center ${styles.gap} ${className}`}
      aria-label="YuriGame Store"
    >
      <span
        className={`${isCustom ? 'h-9 w-auto max-w-[90px] sm:h-11 sm:max-w-[120px] lg:h-12 lg:max-w-[135px]' : styles.mark} relative shrink-0 overflow-visible flex items-center justify-center bg-transparent`}
        aria-hidden="true"
      >
        <img
          src={activeLogo}
          alt="YuriGame Store Logo"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="h-full w-auto max-w-full object-contain drop-shadow-[0_3px_10px_rgba(0,0,0,0.55)]"
          draggable="false"
          onError={(e) => {
            if (!e.currentTarget.src.endsWith(DEFAULT_SITE_LOGO)) {
              e.currentTarget.src = DEFAULT_SITE_LOGO;
            }
          }}
        />
      </span>

      {shouldShowText && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className={`${styles.word} whitespace-nowrap font-black uppercase tracking-[-0.045em] flex items-center`}>
            <span className={inverse ? 'text-white' : 'text-[#111217]'}>Yuri</span>
            <span className="text-[#e3062f]">Game</span>
            <span className={inverse ? 'text-white' : 'text-[#111217]'}>Store</span>
          </span>
        </span>
      )}
    </span>
  );
}
