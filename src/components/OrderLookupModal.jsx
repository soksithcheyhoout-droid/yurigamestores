import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Loader2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { formatPrice } from '../data/regionStore';
import { searchSoraOrders } from '../data/soraStore';
import { syncOrdersStatusWithRemote } from '../data/orderStore';
import { pauseLenis, resumeLenis } from '../hooks/useLenisSmoothScroll';
import { getSiteLogo } from './YuriGameLogo';

export function getOrderGameIcon(o) {
  if (!o) return getSiteLogo();
  if (o.icon && typeof o.icon === 'string' && !o.icon.includes('yurigame-logo.webp')) {
    return o.icon;
  }
  const rawGame = String(o?.gameId || o?.gameLabel || o?.gameName || o?.game || '').toLowerCase();
  const rawItem = String(o?.item || o?.packageName || '').toLowerCase();

  if (
    rawGame.includes('roblox') ||
    rawGame.includes('robux') ||
    rawItem.includes('robux') ||
    rawGame === 'robuxsend'
  ) {
    return '/assets/games/roblox_tile_4k.jpg';
  }
  if (
    rawGame.includes('freefire') ||
    rawGame.includes('free fire') ||
    rawGame === 'ff' ||
    rawItem.includes('free fire')
  ) {
    return '/assets/games/freefire_tile_4k.jpg';
  }
  if (
    rawGame.includes('ros') ||
    rawGame.includes('legacy') ||
    rawGame === 'roslegacy'
  ) {
    return getSiteLogo();
  }
  if (
    rawGame.includes('mobile legend') ||
    rawGame.includes('mlbb') ||
    rawGame === 'ml' ||
    rawItem.includes('diamond') ||
    rawItem.includes('twilight') ||
    rawItem.includes('weekly pass')
  ) {
    return '/assets/games/mlbb_tile_4k.jpg';
  }
  if (rawGame.includes('pubg')) {
    return '/assets/games/pubg_tile_4k.jpg';
  }
  if (rawGame.includes('valorant') || rawGame.includes('valo')) {
    return '/assets/games/valo_tile_4k.jpg';
  }
  if (rawGame.includes('cod') || rawGame.includes('call of duty')) {
    return '/assets/games/codm_tile_4k.jpg';
  }
  if (rawGame.includes('clash')) {
    return '/assets/games/clash_tile_4k.jpg';
  }
  if (rawGame.includes('genshin')) {
    return '/assets/games/genshin_tile_4k.jpg';
  }
  if (rawGame.includes('honkai')) {
    return '/assets/games/honkai_tile_4k.jpg';
  }
  if (rawGame.includes('steam')) {
    return '/assets/games/steam_tile_4k.jpg';
  }
  if (o.icon && !o.icon.includes('harikitopup.com')) {
    return o.icon;
  }
  return '/assets/brand/yurigame-logo.webp';
}

function normalizeSoraOrder(o) {
  const isRoS = o.gameId === 'roslegacy' || o.gameLabel === 'RoS Legacy';
  const isRoblox =
    o.gameId === 'robuxsend' ||
    o.gameLabel === 'Roblox' ||
    o.gameName === 'Roblox' ||
    String(o.gameId || o.gameLabel || o.gameName || '').toLowerCase().includes('roblox') ||
    String(o.item || o.packageName || '').toLowerCase().includes('robux');
  const isManual = isRoS;
  const rawStatus = String(o.rawStatus || o.status || '').toUpperCase();
  const status =
    rawStatus === 'COMPLETED' || rawStatus === 'SUCCESS' || rawStatus === 'DELIVERED'
      ? 'DELIVERED'
      : rawStatus === 'CANCELLED' || rawStatus === 'FAILED'
        ? 'CANCELLED'
        : 'PROCESSING';

  return {
    ref: o.refid || o.ref || 'API-ORDER',
    gameName: o.gameLabel || o.gameName || (isRoblox ? 'Roblox' : isRoS ? 'RoS Legacy' : 'Game Top-Up'),
    packageName: o.item || o.packageName || 'Game Credits',
    totalUsd: Number(o.amount || o.totalUsd) || 0,
    totalKhr: o.totalKhr || (Math.round((Number(o.amount || o.totalUsd || 0)) * 4100)).toLocaleString(),
    status,
    rawStatus: o.rawStatus || o.status,
    verifiedPlayer: o.player
      ? `${o.player}${o.nickname ? ' (' + o.nickname + ')' : ''}`
      : o.nickname || o.verifiedPlayer || 'Player',
    playerDetails: {
      userId: o.player || o.playerDetails?.userId || o.playerDetails?.account || '',
      nickname: o.nickname || o.playerDetails?.nickname || '',
      gmail: o.gmail || o.playerDetails?.gmail || '',
    },
    reason: o.reason || '',
    timestamp: o.created_at || o.createdAt || o.timestamp || new Date().toISOString(),
    isLiveProvider: !isManual,
    isManualAdmin: isManual,
    icon: getOrderGameIcon(o),
  };
}

export default function OrderLookupModal({
  pastOrders = [],
  onClose,
  onViewReceipt,
  currentRegion,
}) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [liveOrders, setLiveOrders] = useState([]);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [searchTrigger, setSearchTrigger] = useState(0);

  useEffect(() => {
    pauseLenis();
    return () => {
      resumeLenis();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const cleanQ = query.trim();

    const fetchLive = async (isInitial = false) => {
      if (isInitial) setIsLoadingLive(true);
      try {
        const payload = await searchSoraOrders(cleanQ);
        if (!active) return;
        const list = Array.isArray(payload?.orders) ? payload.orders : [];
        const normalized = list.map(normalizeSoraOrder);
        setLiveOrders(normalized);
        syncOrdersStatusWithRemote(normalized);
      } catch (err) {
        console.warn('Could not fetch live orders:', err);
      } finally {
        if (active && isInitial) setIsLoadingLive(false);
      }
    };

    fetchLive(true);
    // Dynamic real-time auto-polling every 2.5 seconds:
    const timer = setInterval(() => {
      fetchLive(false);
    }, 2500);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [query, searchTrigger]);

  const q = query.trim().toLowerCase();
  const localFiltered = pastOrders.filter((o) => {
    if (!q) return true;
    return (
      (o.ref && o.ref.toLowerCase().includes(q)) ||
      (o.playerDetails?.account && o.playerDetails.account.toLowerCase().includes(q)) ||
      (o.playerDetails?.userId && o.playerDetails.userId.toLowerCase().includes(q)) ||
      (o.playerDetails?.gmail && o.playerDetails.gmail.toLowerCase().includes(q)) ||
      (o.gameName && o.gameName.toLowerCase().includes(q)) ||
      (o.packageName && o.packageName.toLowerCase().includes(q)) ||
      (o.verifiedPlayer && o.verifiedPlayer.toLowerCase().includes(q))
    );
  });

  const liveRefs = new Set(liveOrders.map((o) => o.ref));
  const uniqueLocal = localFiltered.filter((o) => !liveRefs.has(o.ref));
  const combinedOrders = [...liveOrders, ...uniqueLocal];

  const filteredOrders = combinedOrders.filter((order) => {
    const s = String(order.status || '').toUpperCase();
    if (activeFilter === 'delivered') {
      return s === 'COMPLETED' || s === 'DELIVERED' || s === 'SUCCESS';
    }
    if (activeFilter === 'pending') {
      return s === 'PENDING' || s === 'PROCESSING';
    }
    if (activeFilter === 'refunded') {
      return s === 'REFUNDED' || s === 'CANCELLED' || s === 'FAILED';
    }
    return true;
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTrigger((prev) => prev + 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl bg-[#0F1016] rounded-2xl sm:rounded-3xl border border-[#242636] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1E202C] bg-gradient-to-r from-[#151620] to-[#111218] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E3062F]/15 border border-[#E3062F]/30 text-[#E3062F] flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight font-['Rajdhani'] uppercase tracking-wider">
                Track Order by ID & Username
              </h3>
              <p className="text-[11px] sm:text-[12px] text-slate-400 mt-0.5 m-0">
                Search by Player ID, Username, or Order Reference
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 cursor-pointer transition-colors"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-3.5 sm:p-5 border-b border-[#1E202C] bg-[#13141C]">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1 flex items-center">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 pointer-events-none z-10">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter User ID, Player Name, or Ref (e.g. YGS-462709)..."
                className="h-10 text-xs sm:text-sm w-full pl-10 pr-3 rounded-xl border border-[#27293A] bg-[#0A0B10] text-white placeholder-slate-500 outline-none transition focus:border-[#E3062F] focus:ring-1 focus:ring-[#E3062F] font-['Kantumruy_Pro']"
              />
            </div>
            <button
              type="submit"
              disabled={isLoadingLive}
              className="h-10 px-4 sm:px-5 rounded-xl bg-[#E3062F] hover:bg-[#b80d2e] text-white font-bold text-xs sm:text-[13px] font-['Rajdhani'] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm disabled:opacity-50"
            >
              {isLoadingLive ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span className="hidden sm:inline">Searching...</span>
                </>
              ) : (
                'Search'
              )}
            </button>
          </form>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#1C1D26] overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Orders' },
              { id: 'delivered', label: 'Delivered' },
              { id: 'pending', label: 'Paid' },
              { id: 'refunded', label: 'Refunded / Failed' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold font-['Rajdhani'] uppercase tracking-wider transition-all cursor-pointer shrink-0 ${activeFilter === tab.id
                    ? 'bg-[#E3062F] text-white shadow-sm'
                    : 'bg-[#181924] text-slate-400 hover:text-white hover:bg-[#202230]'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body / Orders List */}
        <div
          data-lenis-prevent
          className="p-3.5 sm:p-5 flex-1 min-h-0 overflow-y-auto space-y-2.5 bg-[#0C0D12]"
        >
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => {
              const s = String(order.status || '').toUpperCase();
              const isSuccess = s === 'SUCCESS' || s === 'DELIVERED' || s === 'COMPLETED';
              const isPending = s === 'PENDING' || s === 'PROCESSING';
              const isRefunded = s === 'REFUNDED';
              const isFailed = s === 'FAILED' || s === 'CANCELLED';
              const gameTileIcon = order.icon || getOrderGameIcon(order);

              return (
                <div
                  key={order.ref}
                  className="p-3.5 sm:p-4 rounded-2xl border border-[#222434] bg-gradient-to-br from-[#151622] to-[#0E0F16] hover:border-[#E3062F]/50 transition-all flex flex-col gap-3 shadow-md"
                >
                  {/* Top Row: Game Icon, Titles, and Status Pill */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={gameTileIcon}
                        alt={order.gameName}
                        className="w-12 h-12 rounded-xl object-cover border border-[#2C2E42] bg-slate-900 shrink-0 shadow-sm"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getOrderGameIcon(order);
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-white font-['Rajdhani'] tracking-wide">
                            {order.gameName}
                          </span>
                          {order.isManualAdmin ? (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              Admin Delivery
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30">
                              Instant API
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] font-black text-[#FF4D6D] font-['Rajdhani'] mt-0.5 leading-tight">
                          {order.packageName}
                        </div>
                      </div>
                    </div>

                    {/* Status Pill Badge */}
                    <div className="shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase font-['Rajdhani'] inline-flex items-center gap-1.5 ${isSuccess
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs'
                            : isFailed
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : isRefunded
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : isPending
                                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/40 shadow-xs'
                                  : 'bg-slate-700/30 text-slate-300 border border-slate-600'
                          }`}
                      >
                        {isPending && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />}
                        <span>{isPending ? 'Paid' : isSuccess ? 'Delivered' : isFailed ? 'Cancelled' : order.status}</span>
                      </span>
                    </div>
                  </div>

                  {/* Player Account & Ref Badges (NO TRUNCATE! Clean, wrap-safe chips) */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-0.5">
                    <span className="px-2.5 py-1 rounded-lg bg-[#181A26] border border-[#272A3C] font-mono text-slate-300 font-bold shrink-0">
                      Ref: <span className="text-white">{order.ref}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#181A26] border border-[#272A3C] text-slate-300 font-semibold break-all flex-1 min-w-[140px]">
                      Player: <strong className="text-emerald-400 font-bold">{order.verifiedPlayer}</strong>
                    </span>
                  </div>

                  {/* Admin Note / Status Reason */}
                  {order.reason && (
                    <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-xl leading-relaxed">
                      💬 {order.reason}
                    </div>
                  )}

                  {/* Bottom Row: Price & Official Receipt Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#1F212E] mt-0.5">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Paid</div>
                      <div className="font-mono font-black text-base text-white">
                        {formatPrice(order.totalUsd, currentRegion)}
                      </div>
                    </div>

                    {onViewReceipt && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewReceipt(order);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#E3062F] hover:bg-rose-600 text-white font-bold text-xs font-['Rajdhani'] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                      >
                        <span>Official Receipt</span>
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-14 text-center text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Search size={20} />
              </div>
              <p className="text-sm font-bold text-slate-300 m-0">
                {query.trim().length >= 2 ? 'No matching orders found' : 'Track Your YuriGame Order'}
              </p>
              <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                {query.trim().length >= 2
                  ? 'No order matches your search query. Please double check your Player ID, username, or order reference number.'
                  : 'Enter your Player ID, Game Username, or Order Reference above and tap Search to view live order and delivery status.'}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[#1C1E26] bg-[#111218] flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>Verified Server-Side Database Records</span>
          </span>
          <span className="font-mono text-[10px]">
            {filteredOrders.length > 0 ? `${filteredOrders.length} order(s) listed` : 'Ready to search'}
          </span>
        </div>
      </div>
    </div>
  );
}
