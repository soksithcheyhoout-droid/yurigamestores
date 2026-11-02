// YuriGame Store - Strictly 4 Authorized Games
// 1. Roblox (robuxsend)
// 2. Mobile Legends: Bang Bang (ml)
// 3. Free Fire (ff)
// 4. RoS Legacy (roslegacy)

export const GAMES = [
  {
    id: "robuxsend",
    slug: "roblox",
    provider: "soratopup",
    providerCode: "robuxsend",
    name: "Roblox",
    publisher: "Roblox Corp",
    category: "popular",
    type: "casual",
    currency: "Robux",
    hot: true,
    featured: true,
    banner: "/assets/games/current_roblox.jpg",
    image: "/assets/games/current_roblox.jpg",
    badge: "Official Username",
    orderingEnabled: true,
    verificationMode: "official",
    description: "Instant Robux delivery to your Roblox account by username. Safe and verified.",
    fields: [
      { key: "userId", label: "Roblox Username", placeholder: "e.g. Ucantusemeee", type: "text", required: true }
    ],
    packages: [
      { id: "sora_robuxsend_10", code: "10", providerCode: "10", name: "10 Robux", price: 0.10, bonus: "Instant 5s", popular: false },
      { id: "sora_robuxsend_20", code: "20", providerCode: "20", name: "20 Robux", price: 0.19, bonus: "+5% Value", popular: false },
      { id: "sora_robuxsend_50", code: "50", providerCode: "50", name: "50 Robux", price: 0.45, bonus: "Popular", popular: false },
      { id: "sora_robuxsend_80", code: "80", providerCode: "80", name: "80 Robux", price: 0.74, bonus: "Best Value", popular: true },
      { id: "sora_robuxsend_100", code: "100", providerCode: "100", name: "100 Robux", price: 0.89, bonus: "Hot Pack", popular: true },
      { id: "sora_robuxsend_200", code: "200", providerCode: "200", name: "200 Robux", price: 1.78, bonus: "Bonus Value", popular: false },
      { id: "sora_robuxsend_400", code: "400", providerCode: "400", name: "400 Robux", price: 3.55, bonus: "Best Seller", popular: true },
      { id: "sora_robuxsend_800", code: "800", providerCode: "800", name: "800 Robux", price: 6.99, bonus: "+50 Bonus", popular: true },
      { id: "sora_robuxsend_1000", code: "1000", providerCode: "1000", name: "1,000 Robux", price: 8.75, bonus: "VIP Pack", popular: false },
      { id: "sora_robuxsend_2000", code: "2000", providerCode: "2000", name: "2,000 Robux", price: 17.50, bonus: "Mega Pack", popular: true }
    ]
  },
  {
    id: "ml",
    slug: "mobile-legends",
    provider: "soratopup",
    providerCode: "ml",
    name: "Mobile Legends: Bang Bang",
    publisher: "Moonton",
    category: "popular",
    type: "moba",
    currency: "Diamonds",
    hot: true,
    featured: true,
    banner: "/assets/banners/banner_mlbb.jpg",
    image: "/assets/games/current_mobile-legends.jpg",
    badge: "5s Moonton Sync",
    orderingEnabled: true,
    verificationMode: "live",
    description: "Mobile Legends official direct diamond top-up. Enter your User ID and Zone ID.",
    fields: [
      { key: "userId", label: "User ID", placeholder: "e.g. 29481903", type: "text", required: true },
      { key: "zoneId", label: "Zone ID / Server ID", placeholder: "e.g. 2042", type: "text", required: true }
    ],
    packages: [
      { id: "sora_ml_weekly", code: "weekly", providerCode: "weekly", name: "Weekly Diamond Pass", price: 1.81, bonus: "Save 60%", popular: true },
      { id: "sora_ml_55", code: "55", providerCode: "55", name: "55 Diamonds", price: 0.77, bonus: "Fast Delivery", popular: false },
      { id: "sora_ml_86", code: "86", providerCode: "86", name: "86 Diamonds", price: 1.25, bonus: "+9 Bonus", popular: false },
      { id: "sora_ml_172", code: "172", providerCode: "172", name: "172 Diamonds", price: 2.45, bonus: "+16 Bonus", popular: false },
      { id: "sora_ml_257", code: "257", providerCode: "257", name: "257 Diamonds", price: 3.65, bonus: "+27 Bonus", popular: true },
      { id: "sora_ml_343", code: "343", providerCode: "343", name: "343 Diamonds", price: 4.85, bonus: "+37 Bonus", popular: false },
      { id: "sora_ml_706", code: "706", providerCode: "706", name: "706 Diamonds", price: 9.80, bonus: "+88 Bonus", popular: true },
      { id: "sora_ml_2195", code: "2195", providerCode: "2195", name: "2,195 Diamonds", price: 30.50, bonus: "+320 Bonus", popular: true },
      { id: "sora_ml_3688", code: "3688", providerCode: "3688", name: "3,688 Diamonds", price: 50.80, bonus: "+550 Bonus", popular: false },
      { id: "sora_ml_5532", code: "5532", providerCode: "5532", name: "5,532 Diamonds", price: 76.50, bonus: "+800 Bonus", popular: true }
    ]
  },
  {
    id: "ff",
    slug: "free-fire",
    provider: "soratopup",
    providerCode: "ff",
    name: "Free Fire",
    publisher: "Garena",
    category: "popular",
    type: "shooter",
    currency: "Diamonds",
    hot: true,
    featured: true,
    banner: "/assets/banners/banner_freefire.jpg",
    image: "/assets/games/current_free-fire.jpg",
    badge: "Official Garena UID",
    orderingEnabled: true,
    verificationMode: "live",
    description: "Free Fire diamonds top-up. Enter your Player ID for instant automated delivery.",
    fields: [
      { key: "userId", label: "Player ID", placeholder: "Enter Free Fire Player ID (e.g. 10000001)", type: "text", required: true }
    ],
    packages: [
      { id: "sora_ff_25", code: "25", providerCode: "25", name: "25 Diamonds", price: 0.25, bonus: "Starter Pack", popular: false },
      { id: "sora_ff_50", code: "50", providerCode: "50", name: "50 Diamonds", price: 0.48, bonus: "+5 Bonus", popular: false },
      { id: "sora_ff_100", code: "100", providerCode: "100", name: "100 Diamonds", price: 0.88, bonus: "+10 Bonus", popular: false },
      { id: "sora_ff_weekly", code: "weekly", providerCode: "weekly", name: "Weekly Membership", price: 1.80, bonus: "450 Total", popular: true },
      { id: "sora_ff_310", code: "310", providerCode: "310", name: "310 Diamonds", price: 2.65, bonus: "+31 Bonus", popular: false },
      { id: "sora_ff_520", code: "520", providerCode: "520", name: "520 Diamonds", price: 4.40, bonus: "+52 Bonus", popular: true },
      { id: "sora_ff_monthly", code: "monthly", providerCode: "monthly", name: "Monthly Membership", price: 7.20, bonus: "2600 Total", popular: true },
      { id: "sora_ff_1060", code: "1060", providerCode: "1060", name: "1,060 Diamonds", price: 8.75, bonus: "+106 Bonus", popular: true },
      { id: "sora_ff_2180", code: "2180", providerCode: "2180", name: "2,180 Diamonds", price: 17.80, bonus: "+218 Bonus", popular: false },
      { id: "sora_ff_5600", code: "5600", providerCode: "5600", name: "5,600 Diamonds", price: 44.50, bonus: "+560 Bonus", popular: true }
    ]
  },
  {
    id: "roslegacy",
    slug: "ros-legacy",
    provider: "soratopup",
    providerCode: "roslegacy",
    name: "RoS Legacy",
    publisher: "RoS Legacy",
    category: "popular",
    type: "shooter",
    currency: "Diamonds",
    hot: true,
    featured: true,
    banner: "/assets/games/current_ros-legacy.jpg",
    image: "/assets/games/current_ros-legacy.jpg",
    badge: "Official Top-Up",
    orderingEnabled: true,
    verificationMode: "format",
    description: "RoS Legacy top-up. Enter your Username or Gmail and Password so admin can deliver your diamonds.",
    fields: [
      { key: "account", label: "Username or Gmail", placeholder: "e.g. PlayerName or player@gmail.com", type: "text", required: true },
      { key: "password", label: "RoS Account Password", placeholder: "Enter your RoS password", type: "password", required: true }
    ],
    packages: [
      { id: "sora_roslegacy_200", code: "200", providerCode: "200", name: "200 Diamonds", price: 4.00, bonus: "Fast Delivery", popular: false },
      { id: "sora_roslegacy_300", code: "300", providerCode: "300", name: "300 Diamonds", price: 6.00, bonus: "Direct Top-Up", popular: false },
      { id: "sora_roslegacy_400", code: "400", providerCode: "400", name: "400 Diamonds", price: 7.20, bonus: "Value Pack", popular: false },
      { id: "sora_roslegacy_500", code: "500", providerCode: "500", name: "500 Diamonds", price: 8.88, bonus: "Hot Pack", popular: true },
      { id: "sora_roslegacy_1000", code: "1000", providerCode: "1000", name: "1,000 Diamonds", price: 18.00, bonus: "Best Value", popular: true },
      { id: "sora_roslegacy_1500", code: "1500", providerCode: "1500", name: "1,500 Diamonds", price: 26.00, bonus: "Super Value", popular: true },
      { id: "sora_roslegacy_2000", code: "2000", providerCode: "2000", name: "2,000 Diamonds", price: 36.00, bonus: "VIP Mega Pack", popular: true }
    ]
  }
];

// Compatibility lookup function: maps supported slugs, provider ids, and legacy aliases.
// Unknown identifiers return null instead of silently opening Roblox.
export function findAuthorizedGame(identifier) {
  const raw = String(identifier || '').toLowerCase().trim();
  if (!raw) return null;

  const clean = raw.replace(/^sora[_-]/, '');

  const exact = GAMES.find((game) =>
    game.id === clean ||
    game.slug === clean ||
    game.providerCode === clean
  );
  if (exact) return exact;

  if (clean.includes('roblox') || clean.includes('robux')) {
    return GAMES.find((game) => game.id === 'robuxsend') || null;
  }
  if (clean === 'mlbb' || clean === 'mobilelegends' || clean.includes('mobile-legends')) {
    return GAMES.find((game) => game.id === 'ml') || null;
  }
  if (clean.includes('freefire') || clean.includes('free-fire')) {
    return GAMES.find((game) => game.id === 'ff') || null;
  }
  if (clean.includes('ros') || clean.includes('legacy')) {
    return GAMES.find((game) => game.id === 'roslegacy') || null;
  }

  return null;
}

// Sync in-memory games with live Admin Config from backend
export function syncGamesWithAdminConfig(configuredGames) {
  if (!Array.isArray(configuredGames)) return;
  for (const cfg of configuredGames) {
    if (!cfg) continue;
    const target = GAMES.find((g) =>
      g.id === cfg.id ||
      g.slug === cfg.slug ||
      g.providerCode === cfg.id ||
      g.providerCode === cfg.code
    );
    if (target) {
      if (cfg.name) target.name = cfg.name;
      if (cfg.image) target.image = cfg.image;
      if (cfg.banner) target.banner = cfg.banner;
      if (typeof cfg.stockOpen === 'boolean') target.stockOpen = cfg.stockOpen;
      if (Array.isArray(cfg.packages) && cfg.packages.length > 0) {
        target.packages = cfg.packages;
      }
    }
  }
}
