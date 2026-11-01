// YuriGame Store - Casino Spin & Profit-Vault Engine Configuration
// REAL PROVIDER PACKAGES & DYNAMIC BAIT CASINO WHEEL
// Feature is DISABLED by default (enabled: false) until you are ready to launch.

export const CASINO_CONFIG = {
  // Master Feature Switch - Kept FALSE so nothing shows on storefront until you are ready!
  enabled: false,

  // Profit-Vault Safety Controls
  // The house MUST accumulate this much pure profit from purchases BEFORE any bonus tier unlocks!
  profitVault: {
    // Minimum profit (in USD) required in the vault before ANY upgraded tier can be won
    activationThresholdUsd: 50.00,
    // Max percentage of the vault that can be awarded as a bonus on a single lucky spin
    maxVaultSpendPercent: 5.0,
  },

  // Probabilities when Vault is ACTIVATED (When profit target is met)
  // House keeps 99.7% of all spins on the base tier!
  odds: {
    baseOutcomeChance: 0.997,     // 99.7% - Base package customer purchased (guaranteed floor, 100% normal profit for you)
    smallBonusChance: 0.0025,     // 0.25% - Small upgrade (e.g. 55 -> 86 diamonds)
    luckyWinChance: 0.0005,       // 0.05% - Lucky upgrade (e.g. 55 -> 172 diamonds)
    megaBaitJackpotChance: 0.00001, // 0.001% (1 in 100,000) - The 257💎 "Bait" jackpot (virtually untouchable tease)
  },

  // Game-specific Provider-Accredited Tiers
  // Every single outcome corresponds to a real, valid product_code in platform_pricing
  gameCatalogTiers: {
    // Mobile Legends: Bang Bang (mlbb)
    mlbb: [
      {
        purchaseRange: [0, 80],
        base: { qty: 55, code: 'mlbb_55', cost: 0.714 },
        bonus: { qty: 86, code: 'mlbb_86', cost: 1.132 },
        lucky: { qty: 172, code: 'mlbb_172', cost: 2.254 },
        bait: { qty: 257, code: 'mlbb_257', cost: 3.223, label: 'VIP JACKPOT' }, // The 250+ bait!
      },
      {
        purchaseRange: [81, 200],
        base: { qty: 172, code: 'mlbb_172', cost: 2.254 },
        bonus: { qty: 257, code: 'mlbb_257', cost: 3.223 },
        lucky: { qty: 344, code: 'mlbb_344', cost: 4.498 },
        bait: { qty: 514, code: 'mlbb_514', cost: 6.457, label: 'VIP JACKPOT' },
      },
      {
        purchaseRange: [201, 550],
        base: { qty: 514, code: 'mlbb_514', cost: 6.457 },
        bonus: { qty: 600, code: 'mlbb_600', cost: 7.589 },
        lucky: { qty: 706, code: 'mlbb_706', cost: 8.843 },
        bait: { qty: 878, code: 'mlbb_878', cost: 11.098, label: 'MEGA JACKPOT' }, // The 800+ bait!
      },
      {
        purchaseRange: [551, 99999],
        base: { qty: 1050, code: 'mlbb_1050', cost: 13.352 },
        bonus: { qty: 1136, code: 'mlbb_1136', cost: 14.484 },
        lucky: { qty: 1222, code: 'mlbb_1222', cost: 15.596 },
        bait: { qty: 1412, code: 'mlbb_1412', cost: 17.697, label: 'ROYAL JACKPOT' },
      },
    ],

    // Free Fire (freefire_sg)
    freefire: [
      {
        purchaseRange: [0, 80],
        base: { qty: 25, code: 'freefire_sg_25', cost: 0.245 },
        bonus: { qty: 50, code: 'freefire_sg_25', cost: 0.490, qtyMultiplier: 2 },
        lucky: { qty: 100, code: 'freefire_sg_100', cost: 0.938 },
        bait: { qty: 310, code: 'freefire_sg_310', cost: 2.836, label: 'VIP JACKPOT' }, // The 310 bait!
      },
      {
        purchaseRange: [81, 250],
        base: { qty: 100, code: 'freefire_sg_100', cost: 0.938 },
        bonus: { qty: 310, code: 'freefire_sg_310', cost: 2.836 },
        lucky: { qty: 520, code: 'freefire_sg_520', cost: 4.723 },
        bait: { qty: 1060, code: 'freefire_sg_1060', cost: 9.435, label: 'MEGA JACKPOT' },
      },
      {
        purchaseRange: [251, 99999],
        base: { qty: 520, code: 'freefire_sg_520', cost: 4.723 },
        bonus: { qty: 1060, code: 'freefire_sg_1060', cost: 9.435 },
        lucky: { qty: 2180, code: 'freefire_sg_2180', cost: 18.880 },
        bait: { qty: 5600, code: 'freefire_sg_5600', cost: 47.185, label: 'ROYAL JACKPOT' },
      },
    ],

    // Roblox (robuxsend)
    roblox: [
      {
        purchaseRange: [0, 99],
        base: { qty: 80, code: 'sora_robuxsend_80', cost: 0.65 },
        bonus: { qty: 100, code: 'sora_robuxsend_100', cost: 0.78 },
        lucky: { qty: 200, code: 'sora_robuxsend_200', cost: 1.55 },
        bait: { qty: 400, code: 'sora_robuxsend_400', cost: 3.10, label: 'VIP JACKPOT' },
      },
      {
        purchaseRange: [100, 99999],
        base: { qty: 400, code: 'sora_robuxsend_400', cost: 3.10 },
        bonus: { qty: 800, code: 'sora_robuxsend_800', cost: 6.20 },
        lucky: { qty: 1000, code: 'sora_robuxsend_1000', cost: 7.80 },
        bait: { qty: 2000, code: 'sora_robuxsend_2000', cost: 15.50, label: 'MEGA JACKPOT' },
      },
    ],
  },
};

/**
 * Resolve the provider-backed tier for a given game and purchase amount
 */
export function resolveTierConfig(gameCode = 'mlbb', purchasedQty = 55) {
  const gKey = String(gameCode || '').toLowerCase();
  const tiers = gKey.includes('freefire') || gKey.includes('ff')
    ? CASINO_CONFIG.gameCatalogTiers.freefire
    : gKey.includes('roblox') || gKey.includes('robux')
    ? CASINO_CONFIG.gameCatalogTiers.roblox
    : CASINO_CONFIG.gameCatalogTiers.mlbb;

  const qty = Math.max(10, Number(purchasedQty) || 55);
  const match = tiers.find(
    (t) => qty >= t.purchaseRange[0] && qty <= t.purchaseRange[1]
  );
  return match || tiers[0];
}

/**
 * Generate 10 High-Roller Casino Wheel Segments with Enticing Bait
 */
export function generateWheelSegments(gameCode = 'mlbb', purchasedQty = 55, currencyName = 'Diamonds') {
  const tier = resolveTierConfig(gameCode, purchasedQty);

  // 10 Vegas Wheel Segments:
  // - 6 Base Guaranteed segments (what they bought)
  // - 2 Small Bonus segments (sweet tease)
  // - 1 Lucky Win segment
  // - 1 ULTRA-LUSTROUS GOLDEN BAIT JACKPOT SLICE (e.g. 257 💎 or 878 💎)
  return [
    { id: 0, label: `${tier.base.qty}`, sublabel: 'GUARANTEED', type: 'base', isBait: false, productCode: tier.base.code, color: '#0B0D13', textColor: '#CBD5E1', border: '#1E293B' },
    { id: 1, label: `${tier.bonus.qty}`, sublabel: 'LUCKY BONUS', type: 'bonus', isBait: false, productCode: tier.bonus.code, color: '#181B26', textColor: '#E3062F', border: '#E3062F' },
    { id: 2, label: `${tier.base.qty}`, sublabel: currencyName, type: 'base', isBait: false, productCode: tier.base.code, color: '#07080B', textColor: '#64748B', border: '#1E293B' },
    { id: 3, label: `${tier.base.qty}`, sublabel: 'GUARANTEED', type: 'base', isBait: false, productCode: tier.base.code, color: '#0B0D13', textColor: '#CBD5E1', border: '#1E293B' },
    { id: 4, label: `${tier.bait.qty}`, sublabel: tier.bait.label || 'VIP JACKPOT', type: 'bait', isBait: true, productCode: tier.bait.code, color: '#2A200A', textColor: '#FFD700', border: '#FFD700' }, // THE GOLDEN BAIT!
    { id: 5, label: `${tier.base.qty}`, sublabel: currencyName, type: 'base', isBait: false, productCode: tier.base.code, color: '#07080B', textColor: '#64748B', border: '#1E293B' },
    { id: 6, label: `${tier.lucky.qty}`, sublabel: 'BIG WIN', type: 'lucky', isBait: false, productCode: tier.lucky.code, color: '#1B1425', textColor: '#A855F7', border: '#9333EA' },
    { id: 7, label: `${tier.base.qty}`, sublabel: 'GUARANTEED', type: 'base', isBait: false, productCode: tier.base.code, color: '#0B0D13', textColor: '#CBD5E1', border: '#1E293B' },
    { id: 8, label: `${tier.bonus.qty}`, sublabel: 'LUCKY BONUS', type: 'bonus', isBait: false, productCode: tier.bonus.code, color: '#181B26', textColor: '#E3062F', border: '#E3062F' },
    { id: 9, label: `${tier.base.qty}`, sublabel: currencyName, type: 'base', isBait: false, productCode: tier.base.code, color: '#07080B', textColor: '#64748B', border: '#1E293B' },
  ];
}

/**
 * Determine spin outcome using the Gated Profit-Vault Engine
 * ALWAYS profits first. Win chance is strictly 0% until profit vault is funded.
 */
export function calculateSpinOutcome(gameCode = 'mlbb', purchasedQty = 55, bankedProfitUsd = 0) {
  const segments = generateWheelSegments(gameCode, purchasedQty);
  const baseIndices = [0, 2, 3, 5, 7, 9];

  // 1. INVIOLABLE CHECK: Is the house profit vault target met?
  // If not, win chance is STRICTLY 0.00%. Always lands on base tier!
  const isVaultEligible = bankedProfitUsd >= CASINO_CONFIG.profitVault.activationThresholdUsd;

  if (!isVaultEligible) {
    // Pick one of the base segments at random so the needle moves dynamically
    const randomBaseIndex = baseIndices[Math.floor(Math.random() * baseIndices.length)];
    return {
      targetSegmentIndex: randomBaseIndex,
      awardedQty: Number(segments[randomBaseIndex].label),
      productCode: segments[randomBaseIndex].productCode,
      isBonus: false,
      winType: 'base',
      segment: segments[randomBaseIndex],
    };
  }

  // 2. If vault target is met, roll cryptographically secure random number
  const cryptoArray = new Uint32Array(1);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(cryptoArray);
  } else {
    cryptoArray[0] = Math.floor(Math.random() * 0xffffffff);
  }
  const roll = cryptoArray[0] / 0xffffffff;

  // Ultra-microscopic Bait Jackpot (Segment 4: e.g. 257 💎)
  if (roll > 1 - CASINO_CONFIG.odds.megaBaitJackpotChance) {
    return {
      targetSegmentIndex: 4,
      awardedQty: Number(segments[4].label),
      productCode: segments[4].productCode,
      isBonus: true,
      winType: 'bait_jackpot',
      segment: segments[4],
    };
  }

  // Rare Lucky Win (Segment 6: e.g. 172 💎)
  if (roll > 1 - (CASINO_CONFIG.odds.megaBaitJackpotChance + CASINO_CONFIG.odds.luckyWinChance)) {
    return {
      targetSegmentIndex: 6,
      awardedQty: Number(segments[6].label),
      productCode: segments[6].productCode,
      isBonus: true,
      winType: 'lucky',
      segment: segments[6],
    };
  }

  // Small Bonus Win (Segment 1 or 8: e.g. 86 💎)
  if (roll > 1 - (CASINO_CONFIG.odds.megaBaitJackpotChance + CASINO_CONFIG.odds.luckyWinChance + CASINO_CONFIG.odds.smallBonusChance)) {
    const bonusIdx = Math.random() > 0.5 ? 1 : 8;
    return {
      targetSegmentIndex: bonusIdx,
      awardedQty: Number(segments[bonusIdx].label),
      productCode: segments[bonusIdx].productCode,
      isBonus: true,
      winType: 'bonus',
      segment: segments[bonusIdx],
    };
  }

  // 99.7% Default: Regular Guaranteed Outcome
  const randomBaseIndex = baseIndices[Math.floor(Math.random() * baseIndices.length)];
  return {
    targetSegmentIndex: randomBaseIndex,
    awardedQty: Number(segments[randomBaseIndex].label),
    productCode: segments[randomBaseIndex].productCode,
    isBonus: false,
    winType: 'base',
    segment: segments[randomBaseIndex],
  };
}
