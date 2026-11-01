import React, { useMemo } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  Gamepad2,
  ListChecks,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  TimerReset,
  TrendingUp,
  WalletCards,
} from 'lucide-react';

const PERIOD_LABELS = {
  day: 'Today',
  week: 'This week',
  month: 'This month',
  year: 'This year',
};

const STATUS_STYLES = {
  COMPLETED: {
    color: '#10b981',
    className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  },
  PENDING: {
    color: '#f59e0b',
    className: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  },
  FAILED: {
    color: '#f43f5e',
    className: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
  },
  REFUNDED: {
    color: '#8b5cf6',
    className: 'border-violet-500/25 bg-violet-500/10 text-violet-300',
  },
  UNKNOWN: {
    color: '#64748b',
    className: 'border-slate-600 bg-slate-700/30 text-slate-300',
  },
};

function formatUsd(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return 'Unknown time';
  return new Date(value).toLocaleString('en-GB', {
    timeZone: 'Asia/Phnom_Penh',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRange(range) {
  if (!range?.start || !range?.end) return 'Cambodia time';
  const format = (value) => new Date(value).toLocaleDateString('en-GB', {
    timeZone: 'Asia/Phnom_Penh',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return `${format(range.start)} – ${format(range.end)}`;
}

function formatAge(minutes) {
  const value = Math.max(0, Number(minutes || 0));
  if (value < 1) return 'Just now';
  if (value < 60) return `${value}m`;
  if (value < 1440) return `${Math.floor(value / 60)}h ${value % 60}m`;
  return `${Math.floor(value / 1440)}d ${Math.floor((value % 1440) / 60)}h`;
}

function ChangePill({ value, label = 'vs previous period' }) {
  if (value === null || value === undefined) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[9px] font-black text-cyan-300">
        <Sparkles size={10} /> New activity
      </span>
    );
  }

  const positive = Number(value) >= 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-black ${
      positive
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
        : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
    }`} title={label}>
      {positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {Math.abs(Number(value)).toFixed(1)}%
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, detail, change, tone = 'red' }) {
  const tones = {
    red: 'border-[#E3062F]/20 bg-[#E3062F]/10 text-[#ff4969]',
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    cyan: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  };

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[#252938] bg-[#101218] p-4 shadow-[0_12px_35px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:border-[#363b4d] hover:shadow-[0_18px_44px_rgba(0,0,0,0.28)] sm:p-5">
      <div className="pointer-events-none absolute -right-12 -top-14 h-28 w-28 rounded-full bg-[#E3062F]/5 blur-2xl transition group-hover:bg-[#E3062F]/10" />
      <div className="relative flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tones[tone] || tones.red}`}>
          <Icon size={18} />
        </div>
        {change !== false && <ChangePill value={change} />}
      </div>
      <div className="relative mt-5">
        <p className="m-0 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">{label}</p>
        <p className="m-0 mt-1.5 truncate font-mono text-[24px] font-black tracking-[-0.04em] text-white sm:text-[28px]">{value}</p>
        <p className="m-0 mt-1 text-[10px] text-slate-500">{detail}</p>
      </div>
    </article>
  );
}

function TrendChart({ data = [], period }) {
  const visibleData = useMemo(() => {
    const elapsed = data.filter((point) => point.isFuture !== true);
    return elapsed.length ? elapsed : data.slice(0, 1);
  }, [data]);

  const chart = useMemo(() => {
    const width = 1000;
    const height = 270;
    const left = 62;
    const right = 28;
    const top = 26;
    const bottom = 44;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const revenueMax = Math.max(1, ...visibleData.map((point) => Number(point.revenue || 0)));
    const ordersMax = Math.max(1, ...visibleData.map((point) => Number(point.orders || 0)));
    const labelStep = Math.max(1, Math.ceil(visibleData.length / 10));
    const points = visibleData.map((point, index) => {
      const x = visibleData.length === 1
        ? left + plotWidth / 2
        : left + (index / (visibleData.length - 1)) * plotWidth;
      return {
        ...point,
        x,
        revenueY: top + plotHeight - (Number(point.revenue || 0) / revenueMax) * plotHeight,
        ordersY: top + plotHeight - (Number(point.orders || 0) / ordersMax) * plotHeight,
      };
    });

    const smoothPath = (key) => {
      if (points.length === 0) return '';
      if (points.length === 1) {
        const point = points[0];
        return `M ${point.x - 44} ${point[key]} L ${point.x + 44} ${point[key]}`;
      }

      let path = `M ${points[0].x} ${points[0][key]}`;
      for (let index = 0; index < points.length - 1; index += 1) {
        const previous = points[index - 1] || points[index];
        const current = points[index];
        const next = points[index + 1];
        const afterNext = points[index + 2] || next;
        const firstControlX = current.x + (next.x - previous.x) / 6;
        const firstControlY = current[key] + (next[key] - previous[key]) / 6;
        const secondControlX = next.x - (afterNext.x - current.x) / 6;
        const secondControlY = next[key] - (afterNext[key] - current[key]) / 6;
        path += ` C ${firstControlX} ${firstControlY}, ${secondControlX} ${secondControlY}, ${next.x} ${next[key]}`;
      }
      return path;
    };

    const revenueLine = smoothPath('revenueY');
    const ordersLine = smoothPath('ordersY');
    const baseline = top + plotHeight;
    const revenueArea = points.length === 1
      ? `${revenueLine} L ${points[0].x + 44} ${baseline} L ${points[0].x - 44} ${baseline} Z`
      : `${revenueLine} L ${points.at(-1)?.x || left} ${baseline} L ${points[0]?.x || left} ${baseline} Z`;

    return {
      width,
      height,
      left,
      right,
      top,
      bottom,
      plotWidth,
      plotHeight,
      revenueMax,
      ordersMax,
      labelStep,
      points,
      revenueLine,
      ordersLine,
      revenueArea,
    };
  }, [visibleData]);

  const activePoints = visibleData.filter((point) => point.orders > 0 || point.revenue > 0);
  const hasActivity = activePoints.length > 0;

  if (!hasActivity) {
    return (
      <div className="flex h-[250px] flex-col items-center justify-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-500">
          <BarChart3 size={22} />
        </div>
        <p className="m-0 mt-3 text-sm font-black text-slate-300">No sales activity yet</p>
        <p className="m-0 mt-1 text-[11px] text-slate-500">New paid orders will appear here automatically.</p>
      </div>
    );
  }

  if (activePoints.length === 1) {
    const point = activePoints[0];
    return (
      <div className="grid min-h-[250px] gap-3 pt-5 sm:grid-cols-[minmax(0,1.35fr)_minmax(190px,0.65fr)]">
        <div className="relative flex min-h-[210px] flex-col justify-between overflow-hidden rounded-2xl border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.13),rgba(16,18,24,0.86)_58%,rgba(227,6,47,0.07))] p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live period snapshot
            </span>
            <span className="font-mono text-[10px] font-bold text-slate-500">{point.label}</span>
          </div>
          <div className="relative py-4">
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Revenue recorded</p>
            <p className="m-0 mt-1 font-mono text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">{formatUsd(point.revenue)}</p>
            <p className="m-0 mt-2 text-[10px] text-slate-400">This is the first active time bucket in the selected period.</p>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-900/80">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-[#E3062F]" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-rows-2">
          <div className="flex flex-col justify-between rounded-2xl border border-[#E3062F]/20 bg-[rgba(227,6,47,0.08)] p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E3062F]/25 bg-[#E3062F]/10 text-[#ff4969]">
              <ShoppingBag size={17} />
            </div>
            <div><p className="m-0 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Orders captured</p><p className="m-0 mt-1 font-mono text-2xl font-black text-white">{point.orders}</p></div>
          </div>
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
              <Activity size={17} />
            </div>
            <div><p className="m-0 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Trend status</p><p className="m-0 mt-1 text-[11px] font-bold leading-relaxed text-slate-300">The trend line appears automatically after a second active bucket.</p></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[285px] w-full">
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-full w-full" role="img" aria-label={`${PERIOD_LABELS[period]} smooth revenue and order trend`}>
        <defs>
          <linearGradient id="analyticsRevenueArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.34" />
            <stop offset="68%" stopColor="#10b981" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <filter id="analyticsLineGlow" x="-30%" y="-50%" width="160%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {Array.from({ length: 5 }, (_, index) => {
          const y = chart.top + (index / 4) * chart.plotHeight;
          const value = chart.revenueMax * (1 - index / 4);
          return (
            <g key={index}>
              <line x1={chart.left} y1={y} x2={chart.width - chart.right} y2={y} stroke="#252938" strokeWidth="1" strokeDasharray={index === 4 ? '0' : '4 8'} />
              <text x={chart.left - 11} y={y + 4} textAnchor="end" fill="#64748b" fontSize="10">{value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value.toFixed(value < 10 ? 1 : 0)}`}</text>
            </g>
          );
        })}

        {chart.points.find((point) => point.isCurrent) && (
          <line
            x1={chart.points.find((point) => point.isCurrent).x}
            y1={chart.top}
            x2={chart.points.find((point) => point.isCurrent).x}
            y2={chart.top + chart.plotHeight}
            stroke="#E3062F"
            strokeWidth="1"
            strokeDasharray="4 7"
            opacity="0.3"
          />
        )}

        {chart.revenueArea && <path d={chart.revenueArea} fill="url(#analyticsRevenueArea)" />}
        {chart.revenueLine && (
          <path
            d={chart.revenueLine}
            fill="none"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#analyticsLineGlow)"
          />
        )}
        {chart.ordersLine && (
          <path
            d={chart.ordersLine}
            fill="none"
            stroke="#E3062F"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 6"
          />
        )}

        {chart.points.map((point, index) => {
          const showLabel = index % chart.labelStep === 0 || index === chart.points.length - 1 || point.isCurrent;
          return (
            <g key={`${point.label}-${index}`}>
              {(point.revenue > 0 || point.orders > 0) && (
                <>
                  <circle cx={point.x} cy={point.revenueY} r="5" fill="#101218" stroke="#34d399" strokeWidth="3">
                    <title>{point.label}: {formatUsd(point.revenue)} revenue</title>
                  </circle>
                  <circle cx={point.x} cy={point.ordersY} r="3.5" fill="#E3062F" stroke="#101218" strokeWidth="2">
                    <title>{point.label}: {point.orders} orders</title>
                  </circle>
                </>
              )}
              {showLabel && (
                <text x={point.x} y={chart.height - 17} textAnchor="middle" fill={point.isCurrent ? '#ff4969' : '#64748b'} fontSize="10" fontWeight={point.isCurrent ? '700' : '400'}>{point.label}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function StatusDonut({ breakdown = [], total = 0 }) {
  const active = breakdown.filter((item) => item.count > 0);
  const { stops } = active.reduce((state, item) => {
    const start = state.cursor;
    const end = start + (total ? (item.count / total) * 100 : 0);
    return {
      cursor: end,
      stops: [
        ...state.stops,
        `${STATUS_STYLES[item.status]?.color || '#64748b'} ${start}% ${end}%`,
      ],
    };
  }, { cursor: 0, stops: [] });
  const background = stops.length ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(#252938 0 100%)';

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[150px_minmax(0,1fr)] xl:grid-cols-1">
      <div className="relative mx-auto h-36 w-36">
        <div className="absolute inset-0 rounded-full" style={{ background }} />
        <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full border border-slate-800 bg-[#101218] shadow-inner">
          <span className="font-mono text-2xl font-black text-white">{total}</span>
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Orders</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {breakdown.map((item) => {
          const style = STATUS_STYLES[item.status] || STATUS_STYLES.UNKNOWN;
          return (
            <div key={item.status} className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/35 px-3 py-2">
              <span className="flex items-center gap-2 text-[10px] font-bold text-slate-300">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: style.color }} />
                {item.status}
              </span>
              <span className="font-mono text-[11px] font-black text-white">{item.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SourcePill({ source }) {
  return (
    <span className="inline-flex rounded-full border border-slate-700 bg-slate-800/70 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-300">
      {source || 'store'}
    </span>
  );
}

function StatusPill({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.UNKNOWN;
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black ${style.className}`}>
      {status}
    </span>
  );
}

export default function AdminAnalyticsPanel({
  analytics,
  period,
  loading,
  onPeriodChange,
  onRefresh,
  onOpenOrders,
}) {
  const summary = analytics?.summary || {};
  const comparison = analytics?.comparison || {};
  const gameBreakdown = analytics?.gameBreakdown || [];
  const paymentBreakdown = analytics?.paymentBreakdown || [];
  const preOrders = analytics?.preOrders || [];
  const recentOrders = analytics?.recentOrders || [];
  const activeTrendPointCount = (analytics?.trend || []).filter(
    (point) => point.isFuture !== true && (point.orders > 0 || point.revenue > 0)
  ).length;
  const topGameRevenue = Math.max(1, ...gameBreakdown.map((game) => game.revenue || 0));
  const sourceTotal = (analytics?.sourceBreakdown || []).reduce((sum, source) => sum + Number(source.orders || 0), 0);

  if (loading && !analytics) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-32 rounded-3xl border border-slate-800 bg-[#101218]" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-44 rounded-2xl border border-slate-800 bg-[#101218]" />)}
        </div>
        <div className="h-96 rounded-3xl border border-slate-800 bg-[#101218]" />
      </div>
    );
  }

  return (
    <section className="space-y-5 animate-in fade-in duration-300">
      <header className="relative overflow-hidden rounded-3xl border border-[#2a2e3c] bg-[linear-gradient(135deg,#11131a_0%,#0d0f15_62%,#171018_100%)] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.28)] sm:p-7">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#E3062F]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#E3062F]/60 to-transparent" />
        <div className="relative flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E3062F]/25 bg-[#E3062F]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#ff4969]">
                <Activity size={11} /> Business intelligence
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live data
              </span>
            </div>
            <h1 className="m-0 text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">Commerce overview</h1>
            <p className="m-0 mt-2 max-w-2xl text-[11px] leading-relaxed text-slate-400 sm:text-xs">
              Revenue, orders, fulfillment health, and pending demand across every connected order source.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500">
              <span className="flex items-center gap-1.5"><CalendarDays size={12} /> {formatRange(analytics?.range)}</span>
              <span className="flex items-center gap-1.5"><RefreshCw size={12} /> Updated {formatDateTime(analytics?.generatedAt)}</span>
              <span className="flex items-center gap-1.5"><ListChecks size={12} /> {sourceTotal} source records reconciled</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="grid grid-cols-4 rounded-xl border border-slate-700/80 bg-[#090a0f]/80 p-1 shadow-inner">
              {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPeriodChange(key)}
                  className={`rounded-lg px-3 py-2 text-[10px] font-black transition sm:px-4 ${
                    period === key
                      ? 'bg-[#E3062F] text-white shadow-[0_5px_18px_rgba(227,6,47,0.35)]'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 text-[10px] font-black text-white transition hover:border-slate-600 hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </header>

      {(analytics?.warnings || []).length > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[11px] text-amber-200">
          <Activity size={15} className="mt-0.5 shrink-0" />
          <span><strong>Partial source availability.</strong> {analytics.warnings.join(' · ')}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          icon={DollarSign}
          label="Net revenue"
          value={formatUsd(summary.revenue)}
          detail={`${formatUsd(comparison.previousRevenue)} in previous period`}
          change={comparison.revenueChangePercent}
          tone="emerald"
        />
        <KpiCard
          icon={ShoppingBag}
          label="Total orders"
          value={summary.totalOrders || 0}
          detail={`${comparison.previousOrders || 0} in previous period`}
          change={comparison.ordersChangePercent}
          tone="red"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Completion rate"
          value={`${Number(summary.completionRate || 0).toFixed(1)}%`}
          detail={`${summary.completedOrders || 0} orders delivered`}
          change={comparison.completionChangePercent}
          tone="cyan"
        />
        <KpiCard
          icon={TimerReset}
          label="Open pre-orders"
          value={summary.activePreOrders || 0}
          detail={`${summary.pendingOrders || 0} created in this period`}
          change={false}
          tone="amber"
        />
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,0.72fr)]">
        <article className="min-w-0 overflow-hidden rounded-3xl border border-[#252938] bg-[#101218] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.2)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#ff4969]">Performance timeline</span>
              <h2 className="m-0 mt-1 text-lg font-black text-white">Revenue and order velocity</h2>
              <p className="m-0 mt-1 text-[10px] text-slate-500">Hourly, daily, or monthly activity based on the selected period.</p>
            </div>
            {activeTrendPointCount > 1 && (
              <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-[9px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Revenue</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#E3062F]" /> Orders</span>
              </div>
            )}
          </div>
          <TrendChart data={analytics?.trend || []} period={period} />
        </article>

        <article className="rounded-3xl border border-[#252938] bg-[#101218] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.2)] sm:p-6">
          <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Fulfillment health</span>
          <h2 className="m-0 mt-1 text-lg font-black text-white">Order status mix</h2>
          <p className="m-0 mt-1 text-[10px] text-slate-500">Distribution for {PERIOD_LABELS[period].toLowerCase()}.</p>
          <div className="mt-6">
            <StatusDonut breakdown={analytics?.statusBreakdown || []} total={summary.totalOrders || 0} />
          </div>
        </article>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-[#101218] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-400"><TrendingUp size={18} /></div>
          <div><p className="m-0 text-[9px] font-black uppercase tracking-wider text-slate-500">Average order</p><p className="m-0 mt-1 font-mono text-lg font-black text-white">{formatUsd(summary.averageOrderValue)}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-[#101218] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400"><RotateCcw size={18} /></div>
          <div><p className="m-0 text-[9px] font-black uppercase tracking-wider text-slate-500">Refund exposure</p><p className="m-0 mt-1 font-mono text-lg font-black text-white">{formatUsd(summary.refundedAmount)}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-[#101218] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400"><Clock3 size={18} /></div>
          <div><p className="m-0 text-[9px] font-black uppercase tracking-wider text-slate-500">Pending in period</p><p className="m-0 mt-1 font-mono text-lg font-black text-white">{summary.pendingOrders || 0}</p></div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border border-[#252938] bg-[#101218] p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div><span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Product intelligence</span><h2 className="m-0 mt-1 text-base font-black text-white">Top games by revenue</h2></div>
            <Gamepad2 size={19} className="text-[#ff4969]" />
          </div>
          <div className="space-y-3">
            {gameBreakdown.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 py-10 text-center text-[11px] text-slate-500">No game sales in this period.</div>
            ) : gameBreakdown.slice(0, 8).map((game, index) => (
              <div key={game.key} className="rounded-xl border border-slate-800/80 bg-slate-950/35 p-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 font-mono text-[10px] font-black text-slate-400">{String(index + 1).padStart(2, '0')}</span>
                  <div className="min-w-0 flex-1"><p className="m-0 truncate text-xs font-black text-white">{game.label}</p><p className="m-0 mt-0.5 text-[9px] text-slate-500">{game.orders} orders · {game.completed} delivered</p></div>
                  <span className="font-mono text-sm font-black text-emerald-400">{formatUsd(game.revenue)}</span>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-900"><div className="h-full rounded-full bg-gradient-to-r from-[#E3062F] via-[#ff4969] to-emerald-400" style={{ width: `${Math.max(2, (game.revenue / topGameRevenue) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-[#252938] bg-[#101218] p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div><span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Channel intelligence</span><h2 className="m-0 mt-1 text-base font-black text-white">Payment mix</h2></div>
            <WalletCards size={19} className="text-emerald-400" />
          </div>
          <div className="space-y-3">
            {paymentBreakdown.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 py-10 text-center text-[11px] text-slate-500">No payment activity in this period.</div>
            ) : paymentBreakdown.map((method) => {
              const share = summary.revenue ? (method.revenue / summary.revenue) * 100 : 0;
              return (
                <div key={method.key} className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-950/35 p-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"><CreditCard size={16} /></div>
                  <div className="min-w-0 flex-1"><p className="m-0 truncate text-xs font-black text-white">{method.label}</p><p className="m-0 mt-0.5 text-[9px] text-slate-500">{method.orders} orders · {share.toFixed(1)}% of revenue</p></div>
                  <span className="font-mono text-sm font-black text-emerald-400">{formatUsd(method.revenue)}</span>
                </div>
              );
            })}
          </div>
        </article>
      </div>

      <article className="overflow-hidden rounded-3xl border border-amber-500/20 bg-[#101218]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[linear-gradient(90deg,rgba(245,158,11,0.08),transparent)] px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400"><TimerReset size={18} /></div>
            <div><div className="flex flex-wrap items-center gap-2"><h2 className="m-0 text-base font-black text-white">Pre-order operations queue</h2><span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black text-amber-300">{summary.activePreOrders || 0} open</span></div><p className="m-0 mt-1 text-[10px] text-slate-500">Pending payment reservations and orders awaiting fulfillment.</p></div>
          </div>
          <button type="button" onClick={onOpenOrders} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-white hover:bg-slate-700">Open operations</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="border-b border-slate-800 bg-[#0c0e14] text-[9px] font-black uppercase tracking-[0.1em] text-slate-500"><tr><th className="px-5 py-3">Order</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Queue age</th><th className="px-4 py-3">Source</th></tr></thead>
            <tbody className="divide-y divide-slate-800/70">
              {preOrders.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center"><CheckCircle2 size={22} className="mx-auto text-emerald-500" /><p className="m-0 mt-2 text-xs font-black text-slate-300">Queue is clear</p><p className="m-0 mt-1 text-[10px] text-slate-500">No pre-orders need attention.</p></td></tr>
              ) : preOrders.map((order) => (
                <tr key={`${order.source}-${order.ref}`} className="transition hover:bg-slate-900/55">
                  <td className="px-5 py-3.5"><p className="m-0 font-mono text-[11px] font-black text-white">{order.ref}</p><p className="m-0 mt-1 text-[9px] text-slate-500">{formatDateTime(order.timestamp)}</p></td>
                  <td className="px-4 py-3.5"><p className="m-0 text-[11px] font-black text-slate-200">{order.gameName}</p><p className="m-0 mt-1 max-w-52 truncate text-[9px] text-[#ff4969]">{order.packageName} × {order.quantity || 1}</p></td>
                  <td className="px-4 py-3.5 font-mono text-[10px] text-slate-300">{order.player}</td>
                  <td className="px-4 py-3.5 font-mono text-[11px] font-black text-white">{formatUsd(order.totalUsd)}</td>
                  <td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-black ${order.ageMinutes >= 15 ? 'border-rose-500/25 bg-rose-500/10 text-rose-300' : 'border-amber-500/25 bg-amber-500/10 text-amber-300'}`}><Clock3 size={10} /> {formatAge(order.ageMinutes)}</span></td>
                  <td className="px-4 py-3.5"><SourcePill source={order.source} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="overflow-hidden rounded-3xl border border-[#252938] bg-[#101218]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4 sm:px-6">
          <div><span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Audit stream</span><h2 className="m-0 mt-1 text-base font-black text-white">Recent order activity</h2></div>
          <ListChecks size={19} className="text-[#ff4969]" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="border-b border-slate-800 bg-[#0c0e14] text-[9px] font-black uppercase tracking-[0.1em] text-slate-500"><tr><th className="px-5 py-3">Time</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Game</th><th className="px-4 py-3">Package</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Source</th></tr></thead>
            <tbody className="divide-y divide-slate-800/70">
              {recentOrders.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-[11px] text-slate-500">No orders recorded in {PERIOD_LABELS[period].toLowerCase()}.</td></tr>
              ) : recentOrders.slice(0, 20).map((order) => (
                <tr key={`${order.source}-${order.ref}`} className="transition hover:bg-slate-900/55">
                  <td className="whitespace-nowrap px-5 py-3.5 text-[9px] text-slate-500">{formatDateTime(order.timestamp)}</td>
                  <td className="px-4 py-3.5 font-mono text-[10px] font-black text-white">{order.ref}</td>
                  <td className="px-4 py-3.5 text-[11px] font-bold text-slate-200">{order.gameName}</td>
                  <td className="max-w-52 truncate px-4 py-3.5 text-[10px] text-slate-400">{order.packageName} × {order.quantity || 1}</td>
                  <td className="px-4 py-3.5 font-mono text-[11px] font-black text-white">{formatUsd(order.totalUsd)}</td>
                  <td className="px-4 py-3.5"><StatusPill status={order.status} /></td>
                  <td className="px-4 py-3.5"><SourcePill source={order.source} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
