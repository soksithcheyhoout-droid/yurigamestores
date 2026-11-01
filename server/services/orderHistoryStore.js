import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeOrderRecord } from './orderAnalytics.js';

const ORDER_HISTORY_FILE = path.join(os.tmpdir(), 'yurigame_order_history.json');
const MAX_HISTORY_RECORDS = 50_000;
const historyByReference = new Map();

function loadHistory() {
  try {
    if (!fs.existsSync(ORDER_HISTORY_FILE)) return;
    const parsed = JSON.parse(fs.readFileSync(ORDER_HISTORY_FILE, 'utf8'));
    if (!Array.isArray(parsed)) return;
    for (const record of parsed) {
      const normalized = normalizeOrderRecord(record, record.source || 'history');
      if (normalized.ref) historyByReference.set(normalized.ref, normalized);
    }
  } catch (error) {
    console.warn('[Order History] Could not load fallback history:', error.message);
  }
}

function persistHistory() {
  try {
    const records = [...historyByReference.values()]
      .sort((left, right) => right.timestampMs - left.timestampMs)
      .slice(0, MAX_HISTORY_RECORDS);
    const temporaryFile = `${ORDER_HISTORY_FILE}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify(records, null, 2), 'utf8');
    fs.renameSync(temporaryFile, ORDER_HISTORY_FILE);
  } catch (error) {
    console.warn('[Order History] Could not persist fallback history:', error.message);
  }
}

loadHistory();

export function upsertOrderHistory(order = {}, source = 'checkout') {
  const normalized = normalizeOrderRecord(order, order.source || source);
  if (!normalized.ref) return null;
  historyByReference.set(normalized.ref, normalized);
  persistHistory();
  return normalized;
}

export function getOrderHistory() {
  return [...historyByReference.values()].sort((left, right) => right.timestampMs - left.timestampMs);
}
