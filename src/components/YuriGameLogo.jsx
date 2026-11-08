import React, { useEffect, useState } from 'react';
import { getBootSiteLogo } from '../data/bootData';

export const DEFAULT_SITE_LOGO = '/assets/brand/yurigame-logo.png';
const SITE_LOGO_STORAGE_KEY = 'yurigame_site_logo_v2';
const SITE_CONFIG_CACHE_KEY = 'yurigame_site_config_cache_v3';

let memorySiteLogo = null;
let didInitialRemoteCheck = false;

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
          src={activeLogo}
          alt=""
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
