const CAMBODIA_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const VALID_PERIODS = new Set(['day', 'week', 'month', 'year']);

function finiteAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.abs(amount) : 0;
}

function parseTimestamp(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.getTime();
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 10_000_000_000 ? value * 1000 : value;
  }

  const raw = String(value || '').trim();
  if (!raw) return Date.now();

  // SoraTopup returns Cambodia-local timestamps without an explicit offset.
  const providerLocal = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/);
  const parsed = Date.parse(providerLocal ? `${providerLocal[1]}T${providerLocal[2]}+07:00` : raw);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function normalizeStatus(value, type = '') {
  const raw = `${value || ''} ${type || ''}`.toUpperCase();
  if (raw.includes('REFUND')) return 'REFUNDED';
  if (raw.includes('SUCCESS') || raw.includes('DELIVERED') || raw.includes('COMPLETED') || raw.includes('DONE')) {
    return 'COMPLETED';
  }
  if (raw.includes('CANCEL') || raw.includes('FAILED') || raw.includes('ERROR') || raw.includes('REJECT')) {
    return 'FAILED';
  }
  if (
    raw.includes('PENDING') ||
    raw.includes('PROCESS') ||
    raw.includes('RUNNING') ||
    raw.includes('QUEUE') ||
    raw.includes('PREORDER') ||
    raw.includes('PRE-ORDER') ||
    raw.includes('UNPAID')
  ) {
    return 'PENDING';
  }
  return 'UNKNOWN';
}

export function normalizeOrderRecord(order = {}, source = 'unknown') {
  const timestampMs = parseTimestamp(
    order.timestamp || order.createdAt || order.created_at || order.date || order.updatedAt || order.updated_at
  );
  const ref = String(
    order.orderRef || order.ref || order.refid || order.tranId || order.id || ''
  ).trim();
  const rawStatus = order.status || order.providerStatus || 'UNKNOWN';
  const status = normalizeStatus(rawStatus, order.type);
  const playerDetails = order.playerDetails || {};

  return {
    ref,
    source,
    gameId: String(order.gameId || order.game || order.providerCode || 'unknown'),
    gameName: String(order.gameName || order.gameLabel || order.game || 'Unknown Game'),
    packageId: String(order.packageId || order.packageCode || order.code || ''),
    packageName: String(order.packageName || order.item || order.description || 'Unknown Package'),
    quantity: Math.max(1, Number.parseInt(order.quantity || 1, 10) || 1),
    totalUsd: finiteAmount(order.totalUsd ?? order.amount ?? order.expectedAmount ?? order.signedAmount),
    totalKhr: String(order.totalKhr || ''),
    paymentMethod: String(order.paymentMethod || order.method || (source === 'soratopup' ? 'SoraTopup' : 'Unknown')),
    player: String(
      playerDetails.account ||
      playerDetails.userId ||
      playerDetails.playerId ||
      order.player ||
      order.nickname ||
      order.verifiedPlayer ||
      'Player'
    ),
    status,
    rawStatus: String(rawStatus),
    isPreOrder: Boolean(order.isPreOrder || order.preOrder || order.pre_order || status === 'PENDING'),
    timestamp: new Date(timestampMs).toISOString(),
    timestampMs,
  };
}

function statusRank(status) {
  if (status === 'REFUNDED') return 5;
  if (status === 'COMPLETED') return 4;
  if (status === 'FAILED') return 3;
  if (status === 'PENDING') return 2;
  return 1;
}

export function deduplicateOrders(records = []) {
  const byReference = new Map();

  records.forEach((record, index) => {
    if (!record) return;
    const normalized = record.timestampMs ? record : normalizeOrderRecord(record);
    const key = normalized.ref || `${normalized.source}:${normalized.timestampMs}:${index}`;
    const existing = byReference.get(key);
    if (!existing) {
      byReference.set(key, normalized);
      return;
    }

    const normalizedWins = statusRank(normalized.status) > statusRank(existing.status)
      || (
        statusRank(normalized.status) === statusRank(existing.status)
        && normalized.timestampMs > existing.timestampMs
      );
    const primary = normalizedWins ? normalized : existing;
    const secondary = normalizedWins ? existing : normalized;
    byReference.set(key, {
      ...secondary,
      ...primary,
      ref: primary.ref || secondary.ref,
      player: primary.player !== 'Player' ? primary.player : secondary.player,
      gameName: primary.gameName !== 'Unknown Game' ? primary.gameName : secondary.gameName,
      packageName: primary.packageName !== 'Unknown Package' ? primary.packageName : secondary.packageName,
    });
  });

  return [...byReference.values()].sort((left, right) => right.timestampMs - left.timestampMs);
}

function getCambodiaPeriodRange(period, nowMs) {
  const shifted = new Date(nowMs + CAMBODIA_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  let shiftedStart;

  if (period === 'year') {
    shiftedStart = Date.UTC(year, 0, 1);
  } else if (period === 'month') {
    shiftedStart = Date.UTC(year, month, 1);
  } else if (period === 'week') {
    const midnight = Date.UTC(year, month, day);
    const weekday = new Date(midnight).getUTCDay();
    const daysSinceMonday = (weekday + 6) % 7;
    shiftedStart = midnight - daysSinceMonday * DAY_MS;
  } else {
    shiftedStart = Date.UTC(year, month, day);
  }

  return {
    startMs: shiftedStart - CAMBODIA_OFFSET_MS,
    endMs: nowMs,
  };
}

function buildTrend(period, range, orders) {
  const shiftedStart = new Date(range.startMs + CAMBODIA_OFFSET_MS);
  let bucketCount;
  let labels;

  if (period === 'day') {
    bucketCount = 24;
    labels = Array.from({ length: bucketCount }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);
  } else if (period === 'week') {
    bucketCount = 7;
    labels = Array.from({ length: bucketCount }, (_, index) => {
      const date = new Date(shiftedStart.getTime() + index * DAY_MS);
      return date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    });
  } else if (period === 'month') {
    const year = shiftedStart.getUTCFullYear();
    const month = shiftedStart.getUTCMonth();
    bucketCount = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    labels = Array.from({ length: bucketCount }, (_, index) => String(index + 1));
  } else {
    bucketCount = 12;
    labels = Array.from({ length: bucketCount }, (_, index) =>
      new Date(Date.UTC(2020, index, 1)).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
    );
  }

  const shiftedEnd = new Date(range.endMs + CAMBODIA_OFFSET_MS);
  const currentBucketIndex = period === 'day'
    ? shiftedEnd.getUTCHours()
    : period === 'week'
      ? Math.floor((range.endMs - range.startMs) / DAY_MS)
      : period === 'month'
        ? shiftedEnd.getUTCDate() - 1
        : shiftedEnd.getUTCMonth();
  const buckets = labels.map((label, index) => ({
    label,
    orders: 0,
    revenue: 0,
    isFuture: index > currentBucketIndex,
    isCurrent: index === currentBucketIndex,
  }));
  for (const order of orders) {
    const local = new Date(order.timestampMs + CAMBODIA_OFFSET_MS);
    let index;
    if (period === 'day') index = local.getUTCHours();
    else if (period === 'week') index = Math.floor((order.timestampMs - range.startMs) / DAY_MS);
    else if (period === 'month') index = local.getUTCDate() - 1;
    else index = local.getUTCMonth();

    if (index < 0 || index >= buckets.length) continue;
    buckets[index].orders += 1;
    if (order.status === 'COMPLETED') buckets[index].revenue += order.totalUsd;
  }

  return buckets.map((bucket) => ({
    ...bucket,
    revenue: Number(bucket.revenue.toFixed(2)),
  }));
}

function buildBreakdown(orders, keySelector, labelSelector) {
  const groups = new Map();
  for (const order of orders) {
    const key = keySelector(order) || 'unknown';
    const current = groups.get(key) || {
      key,
      label: labelSelector(order) || 'Unknown',
      orders: 0,
      completed: 0,
      revenue: 0,
    };
    current.orders += 1;
    if (order.status === 'COMPLETED') {
      current.completed += 1;
      current.revenue += order.totalUsd;
    }
    groups.set(key, current);
  }

  return [...groups.values()]
    .map((group) => ({ ...group, revenue: Number(group.revenue.toFixed(2)) }))
    .sort((left, right) => right.revenue - left.revenue || right.orders - left.orders);
}

function summarizeOrders(orders) {
  const completed = orders.filter((order) => order.status === 'COMPLETED');
  const pending = orders.filter((order) => order.status === 'PENDING');
  const failed = orders.filter((order) => order.status === 'FAILED');
  const refunded = orders.filter((order) => order.status === 'REFUNDED');
  const revenue = completed.reduce((sum, order) => sum + order.totalUsd, 0);
  const refundedAmount = refunded.reduce((sum, order) => sum + order.totalUsd, 0);

  return {
    totalOrders: orders.length,
    completedOrders: completed.length,
    pendingOrders: pending.length,
    failedOrders: failed.length,
    refundedOrders: refunded.length,
    revenue: Number(revenue.toFixed(2)),
    refundedAmount: Number(refundedAmount.toFixed(2)),
    averageOrderValue: completed.length ? Number((revenue / completed.length).toFixed(2)) : 0,
    completionRate: orders.length ? Number(((completed.length / orders.length) * 100).toFixed(1)) : 0,
  };
}

function getPreviousPeriodRange(period, currentRange) {
  const shiftedStart = new Date(currentRange.startMs + CAMBODIA_OFFSET_MS);
  let previousStartMs;

  if (period === 'week') {
    previousStartMs = currentRange.startMs - 7 * DAY_MS;
  } else if (period === 'month') {
    previousStartMs = Date.UTC(
      shiftedStart.getUTCFullYear(),
      shiftedStart.getUTCMonth() - 1,
      1
    ) - CAMBODIA_OFFSET_MS;
  } else if (period === 'year') {
    previousStartMs = Date.UTC(
      shiftedStart.getUTCFullYear() - 1,
      0,
      1
    ) - CAMBODIA_OFFSET_MS;
  } else {
    previousStartMs = currentRange.startMs - DAY_MS;
  }

  const elapsed = currentRange.endMs - currentRange.startMs;
  return {
    startMs: previousStartMs,
    endMs: Math.min(previousStartMs + elapsed, currentRange.startMs - 1),
  };
}

function percentageChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export function buildOrderAnalytics(records = [], requestedPeriod = 'day', now = Date.now()) {
  const period = VALID_PERIODS.has(requestedPeriod) ? requestedPeriod : 'day';
  const allOrders = deduplicateOrders(records);
  const range = getCambodiaPeriodRange(period, now);
  const previousRange = getPreviousPeriodRange(period, range);
  const periodOrders = allOrders.filter(
    (order) => order.timestampMs >= range.startMs && order.timestampMs <= range.endMs
  );
  const previousOrders = allOrders.filter(
    (order) => order.timestampMs >= previousRange.startMs && order.timestampMs <= previousRange.endMs
  );
  const summary = summarizeOrders(periodOrders);
  const previousSummary = summarizeOrders(previousOrders);
  const currentPreOrders = allOrders
    .filter((order) => order.isPreOrder && order.status === 'PENDING')
    .map((order) => ({
      ...order,
      ageMinutes: Math.max(0, Math.floor((now - order.timestampMs) / 60_000)),
    }))
    .slice(0, 100);

  return {
    period,
    timezone: 'Asia/Phnom_Penh',
    generatedAt: new Date(now).toISOString(),
    range: {
      start: new Date(range.startMs).toISOString(),
      end: new Date(range.endMs).toISOString(),
    },
    previousRange: {
      start: new Date(previousRange.startMs).toISOString(),
      end: new Date(previousRange.endMs).toISOString(),
    },
    summary: {
      ...summary,
      activePreOrders: currentPreOrders.length,
    },
    comparison: {
      previousRevenue: previousSummary.revenue,
      previousOrders: previousSummary.totalOrders,
      revenueChangePercent: percentageChange(summary.revenue, previousSummary.revenue),
      ordersChangePercent: percentageChange(summary.totalOrders, previousSummary.totalOrders),
      completionChangePercent: percentageChange(summary.completionRate, previousSummary.completionRate),
    },
    trend: buildTrend(period, range, periodOrders),
    statusBreakdown: [
      { status: 'COMPLETED', count: summary.completedOrders },
      { status: 'PENDING', count: summary.pendingOrders },
      { status: 'FAILED', count: summary.failedOrders },
      { status: 'REFUNDED', count: summary.refundedOrders },
      { status: 'UNKNOWN', count: periodOrders.filter((order) => order.status === 'UNKNOWN').length },
    ],
    gameBreakdown: buildBreakdown(
      periodOrders,
      (order) => order.gameId,
      (order) => order.gameName
    ),
    paymentBreakdown: buildBreakdown(
      periodOrders,
      (order) => order.paymentMethod.toLowerCase(),
      (order) => order.paymentMethod
    ),
    preOrders: currentPreOrders,
    recentOrders: periodOrders.slice(0, 50),
    sourceBreakdown: buildBreakdown(
      allOrders,
      (order) => order.source,
      (order) => order.source
    ).map(({ key, label, orders }) => ({ key, label, orders })),
  };
}
