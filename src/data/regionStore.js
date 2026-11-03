// Region, Language & Currency Store with persistent localStorage and live listeners
// Strictly USD ($) only and English only (no Khmer script, no Riel)

export const REGIONS = [
  {
    id: 'kh_usd',
    countryCode: 'KH',
    countryName: 'Cambodia',
    flag: '🇰🇭',
    lang: 'en',
    langName: 'English (USD)',
    currency: 'USD',
    currencySymbol: '$',
    rate: 1.0,
    displayLabel: 'KH / USD'
  },
  {
    id: 'global_usd',
    countryCode: 'GL',
    countryName: 'Global / International',
    flag: '',
    lang: 'en',
    langName: 'English',
    currency: 'USD',
    currencySymbol: '$',
    rate: 1.0,
    displayLabel: 'EN / USD'
  }
];

const STORAGE_KEY = 'cheydev_region_settings';

export function getStoredRegion() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id === 'kh_usd' || parsed?.currency === 'USD') {
        const found = REGIONS.find(r => r.id === parsed.id);
        if (found) return found;
      }
    }
  } catch (e) {}
  // Default strictly to Cambodia USD
  return REGIONS[0];
}

export function saveStoredRegion(region) {
  try {
    const safeRegion = (region && region.currency === 'USD') ? region : REGIONS[0];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeRegion));
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('cheydev_region_changed', { detail: REGIONS[0] }));
}

// Convert and format USD price to active currency - Strictly USD ($) only
export function formatPrice(usdAmount) {
  const num = typeof usdAmount === 'number' ? usdAmount : parseFloat(usdAmount) || 0;
  return `$${num.toFixed(2)}`;
}

// UI Translations Dictionary - English Only
export const TRANSLATIONS = {
  en: {
    game: 'Game',
    card: 'Card',
    directTopUp: 'Direct Top-Up',
    cdKey: 'CD-Key',
    mobileRecharge: 'Mobile Recharge',
    searchPlaceholder: 'Search games, cards, vouchers...',
    signIn: 'Sign In',
    addFunds: 'Add Funds',
    appLink: 'YURIGAME APP',
    trackOrder: 'Track Order',
    wallet: 'Wallet',
    dealsTitle: 'Special Deals',
    dealsSubtitle: 'Limited-time discounted game vouchers & diamonds',
    catalogTitle: 'Direct Game Top-Up',
    catalogSubtitle: 'Instant automatic delivery to your game account 24/7',
    selectPayment: 'Select Payment Method',
    selectPaymentSub: 'Fast, secure payment with 0% processing fee',
    enterAccount: 'Enter Account Information',
    enterAccountSub: 'Verify your player credentials for instant direct top-up',
    verifyPlayerBtn: 'Verify Player ID',
    instantScan: '0% Fee • Instant Scan',
    pushCheckout: 'Push notification checkout',
    instantDeduction: 'Instant deduction',
    buyNow: 'Top Up Now',
    orderSummary: 'Order Summary',
    payWith: 'Pay with',
    allGames: 'All Games',
    popularGames: 'Popular',
    pcGames: 'PC Games',
    mobileGames: 'Mobile Games'
  }
};

// Mirror kh to en so any fallback always gets clean English
TRANSLATIONS.kh = TRANSLATIONS.en;
