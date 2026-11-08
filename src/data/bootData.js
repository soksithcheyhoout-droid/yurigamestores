// Live admin data injected by the server into index.html (window.__YURI_BOOT__).
// Reading this synchronously on first render means the storefront paints the admin's
// real logo, game images and banners immediately — no default image flashing on refresh.

function readBoot() {
  if (typeof window === 'undefined') return null;
  const boot = window.__YURI_BOOT__;
  return boot && typeof boot === 'object' ? boot : null;
}

const BOOT = readBoot();

export function getBootSiteConfig() {
  const cfg = BOOT?.siteConfig;
  return cfg && typeof cfg === 'object' ? cfg : null;
}

export function getBootCatalogue() {
  const cat = BOOT?.catalogue;
  return cat && Array.isArray(cat.games) && cat.games.length > 0 ? cat : null;
}

export function getBootSiteLogo() {
  const cfg = getBootSiteConfig();
  const logo = cfg?.siteLogo || cfg?.contacts?.siteLogo;
  return typeof logo === 'string' && logo.trim() ? logo.trim() : '';
}

export function getBootBanners() {
  const cfg = getBootSiteConfig();
  return Array.isArray(cfg?.banners) && cfg.banners.length > 0 ? cfg.banners : null;
}

export function hasBootData() {
  return Boolean(getBootSiteConfig() || getBootCatalogue());
}

