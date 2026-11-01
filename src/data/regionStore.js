// Region, Language & Currency Store with persistent localStorage and live listeners

export const REGIONS = [
  {
    id: 'kh_usd',
    countryCode: 'KH',
    countryName: 'Cambodia',
    flag: '🇰🇭',
    lang: 'en',
    langName: 'English (Cambodia)',
    currency: 'USD',
    currencySymbol: '$',
    rate: 1.0,
    displayLabel: 'EN-KH / USD'
  },
  {
    id: 'kh_khr',
    countryCode: 'KH',
    countryName: 'Cambodia (KHR)',
    flag: '🇰🇭',
    lang: 'kh',
    langName: 'ភាសាខ្មែរ (Khmer)',
    currency: 'KHR',
    currencySymbol: '៛',
    rate: 4100,
    displayLabel: 'KH / KHR'
  },
  {
    id: 'in_usd',
    countryCode: 'IN',
    countryName: 'India (USD)',
    flag: '🇮🇳',
    lang: 'en',
    langName: 'English (India)',
    currency: 'USD',
    currencySymbol: '$',
    rate: 1.0,
    displayLabel: 'EN-IN / USD'
  },
  {
    id: 'in_inr',
    countryCode: 'IN',
    countryName: 'India (INR)',
    flag: '🇮🇳',
    lang: 'en',
    langName: 'English (India)',
    currency: 'INR',
    currencySymbol: '₹',
    rate: 86.5,
    displayLabel: 'EN-IN / INR'
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
  },
  {
    id: 'my_myr',
    countryCode: 'MY',
    countryName: 'Malaysia',
    flag: '🇲🇾',
    lang: 'en',
    langName: 'English (Malaysia)',
    currency: 'MYR',
    currencySymbol: 'RM',
    rate: 4.45,
    displayLabel: 'EN-MY / MYR'
  }
];

const STORAGE_KEY = 'cheydev_region_settings';

export function getStoredRegion() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const found = REGIONS.find(r => r.id === parsed.id);
      if (found) return found;
    }
  } catch (e) {}
  // Default to Cambodia KH / KHR
  return REGIONS.find(r => r.id === 'kh_khr') || REGIONS[0];
}

export function saveStoredRegion(region) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(region));
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('cheydev_region_changed', { detail: region }));
}

// Convert and format USD price to active currency
export function formatPrice(usdAmount, activeRegion) {
  const region = activeRegion || getStoredRegion();
  const num = typeof usdAmount === 'number' ? usdAmount : parseFloat(usdAmount) || 0;
  const converted = num * (region.rate || 1.0);

  if (region.currency === 'KHR') {
    // Cambodian Riel: round to nearest 100 or format with comma
    const rounded = Math.round(converted / 50) * 50;
    return `៛${rounded.toLocaleString('en-US')}`;
  }
  if (region.currency === 'INR') {
    return `₹${Math.round(converted).toLocaleString('en-US')}`;
  }
  if (region.currency === 'THB') {
    return `฿${Math.round(converted).toLocaleString('en-US')}`;
  }
  if (region.currency === 'MYR') {
    return `RM ${converted.toFixed(2)}`;
  }
  // Default USD
  return `$${converted.toFixed(2)}`;
}

// UI Translations Dictionary
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
  },
  kh: {
    game: 'ហ្គេម',
    card: 'កាតហ្គេម',
    directTopUp: 'បញ្ចូលពេជ្រផ្ទាល់',
    cdKey: 'CD-Key',
    mobileRecharge: 'បញ្ចូលលុយទូរស័ព្ទ',
    searchPlaceholder: 'ស្វែងរកហ្គេម, កាត, ពេជ្រ...',
    signIn: 'ចូលគណនី',
    addFunds: 'បញ្ចូលលុយ',
    appLink: 'YURIGAME កម្មវិធី',
    trackOrder: 'តាមដានការបញ្ជាទិញ',
    wallet: 'កាបូបលុយ',
    dealsTitle: 'ប្រូម៉ូសិនពិសេស',
    dealsSubtitle: 'ការបញ្ចុះតម្លៃពេជ្រ និងកាតហ្គេមមានកំណត់',
    catalogTitle: 'បញ្ចូលពេជ្រហ្គេមផ្ទាល់',
    catalogSubtitle: 'ផ្ទេរពេជ្រចូលគណនីហ្គេមភ្លាមៗ ២៤/៧ ស្វ័យប្រវត្តិ',
    selectPayment: 'ជ្រើសរើសវិធីទូទាត់ប្រាក់',
    selectPaymentSub: 'ទូទាត់រហ័ស សុវត្ថិភាព មិនគិតថ្លៃសេវា 0%',
    enterAccount: 'បញ្ចូលព័ត៌មានគណនីហ្គេម',
    enterAccountSub: 'ផ្ទៀងផ្ទាត់លេខសម្គាល់គណនី (ID) របស់អ្នក',
    verifyPlayerBtn: 'ផ្ទៀងផ្ទាត់ ID អ្នកលេង',
    instantScan: 'មិនគិតថ្លៃសេវា 0% • ស្កេនភ្លាមៗ',
    pushCheckout: 'ទូទាត់រហ័សតាម ABA Mobile',
    instantDeduction: 'កាត់ទឹកប្រាក់ភ្លាមៗ',
    buyNow: 'បញ្ចូលទឹកប្រាក់ឥឡូវនេះ',
    orderSummary: 'សេចក្តីសង្ខេបការបញ្ជាទិញ',
    payWith: 'ទូទាត់ជាមួយ',
    allGames: 'ហ្គេមទាំងអស់',
    popularGames: 'ពេញនិយម',
    pcGames: 'ហ្គេមកុំព្យូទ័រ',
    mobileGames: 'ហ្គេមទូរស័ព្ទ'
  }
};
