import React, { useEffect, useState } from 'react';

export const DEFAULT_SITE_LOGO = '/assets/brand/yurigame-logo.png';
const SITE_LOGO_STORAGE_KEY = 'yurigame_site_logo_v1';
const SITE_CONFIG_CACHE_KEY = 'yurigame_site_config_cache_v2';

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
  if (!clean || clean === '[object Object]' || clean === 'undefined' || clean === 'null') {
    return false;
  }
  return (
    clean.startsWith('data:image/') ||
    clean.startsWith('/') ||
    clean.startsWith('https://') ||
    clean.startsWith('http://')
  );
}

export function getSiteLogo() {
  if (isValidLogoUrl(memorySiteLogo)) return memorySiteLogo;
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
    mark: 'h-7 w-7 rounded-lg',
    word: 'text-[13px]',
    store: 'text-[6px]',
    gap: 'gap-1.5',
  },
  sm: {
    mark: 'h-9 w-9 rounded-xl',
    word: 'text-[16px] sm:text-[17px]',
    store: 'text-[6.5px]',
    gap: 'gap-2',
  },
  md: {
    mark: 'h-11 w-11 rounded-xl',
    word: 'text-[20px]',
    store: 'text-[7px]',
    gap: 'gap-2.5',
  },
  lg: {
    mark: 'h-14 w-14 rounded-2xl',
    word: 'text-[25px]',
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
      fetch('/api/site-config', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          const remoteLogo = data?.siteLogo || data?.contacts?.siteLogo;
          if (data?.success && remoteLogo) {
            setSiteLogo(remoteLogo);
          }
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('yurigame_site_logo_changed', handleLogoChange);
      window.removeEventListener('yurigame_site_config_updated', handleConfigUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const candidateLogo = overrideLogo || siteLogo || DEFAULT_SITE_LOGO;
  const activeLogo = isValidLogoUrl(candidateLogo) ? candidateLogo : DEFAULT_SITE_LOGO;
  const customLogo = isCustomSiteLogo(activeLogo);

  return (
    <span
      className={`inline-flex min-w-0 items-center ${styles.gap} ${className}`}
      aria-label="YuriGame Store"
    >
      <span
        className={`${styles.mark} relative shrink-0 overflow-hidden flex items-center justify-center ${
          customLogo
            ? 'bg-transparent'
            : 'border border-[#e3062f]/25 bg-white shadow-[0_5px_16px_rgba(15,15,18,0.14)]'
        }`}
        aria-hidden="true"
      >
        <img
          src={activeLogo}
          alt=""
          className={`h-full w-full ${customLogo ? 'object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]' : 'object-cover object-top'}`}
          draggable="false"
          onError={(e) => {
            if (!e.currentTarget.src.endsWith(DEFAULT_SITE_LOGO)) {
              e.currentTarget.src = DEFAULT_SITE_LOGO;
            }
          }}
        />
        {!customLogo && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#e3062f]" />}
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
