import crypto from 'crypto';
import QRCode from 'qrcode';

// EMVCo TLV (Tag-Length-Value) Helper
export function buildTag(id, val) {
  const v = String(val == null ? '' : val);
  return id.padStart(2, '0') + String(v.length).padStart(2, '0') + v;
}

// 16-bit CRC Calculation (CRC-16/CCITT-FALSE, polynomial 0x1021, init 0xFFFF)
export function crc16(str) {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generates an authentic National Bank of Cambodia (NBC) Bakong KHQR EMVCo string in < 1ms.
 */
export function generateBakongKhqr({
  merchantId = 'kry_lychhay@aclb',
  merchantName = 'YuriGameSt4re',
  merchantCity = 'Phnom Penh',
  amount = 0,
  currency = 'USD',
  billNumber = 'YGS_ORDER',
  storeLabel = 'YuriGameSt4re',
  terminal = 'POS-01',
}) {
  const isKhr = String(currency).toUpperCase() === 'KHR';
  const currCode = isKhr ? '116' : '840';
  const numAmount = Number(amount || 0);
  const amountStr = isKhr ? String(Math.round(numAmount)) : numAmount.toFixed(2);

  // Tag 29: Merchant Account Information (Bakong Account)
  const sub29 = buildTag('00', merchantId);
  const tag29 = buildTag('29', sub29);

  // Tag 62: Additional Data Field Template (Bill/Ref, Store, Terminal)
  const sub62 =
    buildTag('01', billNumber) +
    buildTag('03', storeLabel) +
    buildTag('07', terminal);
  const tag62 = buildTag('62', sub62);

  // Tag 99: Custom Timestamp Tags
  const now = Date.now();
  const sub99 =
    buildTag('00', String(now)) +
    buildTag('01', String(now + 24 * 3600 * 1000));
  const tag99 = buildTag('99', sub99);

  // Assemble EMVCo Payload
  const raw =
    buildTag('00', '01') + // Format Indicator
    buildTag('01', '12') + // Dynamic QR
    tag29 +
    buildTag('52', '5999') + // MCC
    buildTag('53', currCode) + // Currency
    buildTag('54', amountStr) + // Amount
    buildTag('58', 'KH') + // Country
    buildTag('59', merchantName) + // Merchant Name
    buildTag('60', merchantCity) + // Merchant City
    tag62 +
    tag99 +
    '6304'; // CRC Tag header

  const checksum = crc16(raw);
  const qrString = raw + checksum;
  const md5 = crypto.createHash('md5').update(qrString).digest('hex');

  return {
    qrString,
    md5,
    deepLink: `bakong://qr?data=${encodeURIComponent(qrString)}`,
    amount: Number(amountStr),
    currency: isKhr ? 'KHR' : 'USD',
  };
}

/**
 * Generates both the authentic KHQR string and ultra-crisp Base64 PNG DataURL in ~15ms.
 */
export async function generateLocalKhqrWithDataUrl(params) {
  const khqr = generateBakongKhqr(params);
  let qrDataUrl = null;

  try {
    qrDataUrl = await QRCode.toDataURL(khqr.qrString, {
      width: 450,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#081B37',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.warn('[KHQR Local] QRCode render warning:', err.message);
  }

  return {
    ...khqr,
    qrDataUrl,
  };
}

export default {
  buildTag,
  crc16,
  generateBakongKhqr,
  generateLocalKhqrWithDataUrl,
};

