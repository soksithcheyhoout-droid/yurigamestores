import React from 'react';
import { CheckCircle2, Clock, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { formatPrice } from '../data/regionStore';
import { searchSoraOrders } from '../data/soraStore';
import { pauseLenis, resumeLenis } from '../hooks/useLenisSmoothScroll';

export default function OrderReceiptModal({ order: initialOrder, onClose, currentRegion }) {
  const [order, setOrder] = React.useState(initialOrder);

  React.useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  React.useEffect(() => {
    pauseLenis();
    return () => {
      resumeLenis();
    };
  }, []);

  // Real-time live status updater: if the receipt is currently IN PROCESSING,
  // it checks every 2s so the moment admin taps Done in Telegram, the receipt switches to OFFICIAL RECEIPT live!
  React.useEffect(() => {
    if (!order?.ref) return;
    const isStillPending =
      order.status === 'PROCESSING' ||
      order.status === 'Pending' ||
      order.status === 'Processing' ||
      order.status === 'PENDING';
    if (!isStillPending) return;

    let active = true;
    const interval = setInterval(async () => {
      try {
        const payload = await searchSoraOrders(order.ref);
        if (!active) return;
        const found = payload?.orders?.find((o) => (o.ref || o.refid) === order.ref);
        if (found) {
          const rawStatus = String(found.rawStatus || found.status || '').toUpperCase();
          if (rawStatus === 'COMPLETED' || rawStatus === 'SUCCESS' || rawStatus === 'DELIVERED') {
            setOrder((prev) => ({ ...prev, status: 'DELIVERED', reason: found.reason }));
          } else if (rawStatus === 'CANCELLED' || rawStatus === 'FAILED') {
            setOrder((prev) => ({ ...prev, status: 'CANCELLED', reason: found.reason }));
          }
        }
      } catch { }
    }, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [order?.ref, order?.status]);

  if (!order) return null;

  const isPending = order.status === 'PROCESSING' || order.status === 'Pending' || order.status === 'Processing' || order.status === 'PENDING';
  const isFailed = order.status === 'FAILED' || order.status === 'CANCELLED' || order.status === 'Failed' || order.status === 'Cancelled';

  const ref = order.ref || order.refid || 'N/A';
  const gameName = order.gameName || order.gameLabel || order.game || 'Game Credits';
  const packageName = order.packageName || order.item || 'Game Package';
  const verifiedPlayer = order.verifiedPlayer || order.player || order.playerDetails?.account || order.playerDetails?.userId || order.playerDetails?.username || 'Player';
  const paymentMethod = order.paymentMethod || 'Bakong KHQR (Verified)';
  const totalUsd = Number(order.totalUsd || order.amount || 0);
  const totalKhr = order.totalKhr || (Math.round(totalUsd * 4100)).toLocaleString();
  const dateObj = new Date(order.timestamp || order.createdAt || order.created_at || Date.now());
  const dateStr = isNaN(dateObj.getTime()) ? new Date().toLocaleString() : dateObj.toLocaleString();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Receipt Header Banner */}
        <div className={`p-5 border-b border-[#E5E7EB] flex items-center justify-between ${isPending ? 'bg-gradient-to-r from-amber-50 to-white' : isFailed ? 'bg-gradient-to-r from-rose-50 to-white' : 'bg-gradient-to-r from-emerald-50 to-white'
          }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${isPending ? 'bg-amber-500 text-white' : isFailed ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
              }`}>
              {isPending ? <Clock size={22} className="animate-spin" /> : isFailed ? <AlertCircle size={22} /> : <CheckCircle2 size={22} />}
            </div>
            <div>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded text-white uppercase tracking-wider ${isPending ? 'bg-amber-500' : isFailed ? 'bg-rose-600' : 'bg-emerald-600'
                }`}>
                {isPending ? 'IN PROCESSING' : isFailed ? 'ORDER CANCELLED' : 'OFFICIAL RECEIPT'}
              </span>
              <h3 className="text-lg font-bold text-[#0F172A] mt-0.5 leading-tight font-['Outfit']">
                {isPending ? 'Order In Processing' : isFailed ? 'Order Cancelled' : 'Order Completed'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] flex items-center justify-center border-0 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Receipt Details Body */}
        <div
          data-lenis-prevent
          className="p-5 sm:p-6 flex-1 min-h-0 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 mb-5 text-[13px] flex flex-col gap-2.5">
            <div className="flex justify-between pb-2 border-b border-[#E2E8F0]">
              <span className="text-[#64748B]">Order Reference</span>
              <span className="font-mono font-bold text-[#0F172A]">{ref}</span>
            </div>

            <div className="flex justify-between pb-2 border-b border-[#E2E8F0]">
              <span className="text-[#64748B]">Game</span>
              <span className="font-bold text-[#0F172A]">{gameName}</span>
            </div>

            <div className="flex justify-between pb-2 border-b border-[#E2E8F0]">
              <span className="text-[#64748B]">Item / Package</span>
              <span className="font-bold text-[#E3062F]">{packageName}</span>
            </div>

            <div className="flex justify-between pb-2 border-b border-[#E2E8F0]">
              <span className="text-[#64748B]">Account Info</span>
              <span className="font-bold text-[#0F172A]">{verifiedPlayer}</span>
            </div>

            <div className="flex justify-between pb-2 border-b border-[#E2E8F0]">
              <span className="text-[#64748B]">Payment Method</span>
              <span className="font-bold text-[#0F172A]">{paymentMethod}</span>
            </div>

            <div className="flex justify-between pb-2 border-b border-[#E2E8F0]">
              <span className="text-[#64748B]">Date & Time</span>
              <span className="text-[#0F172A]">{dateStr}</span>
            </div>

            <div className="flex justify-between pt-1">
              <span className="font-bold text-[#0F172A] text-base">Total Amount Paid</span>
              <div className="text-right">
                <span className="font-mono font-black text-xl text-[#E3062F]">
                  {formatPrice(totalUsd, currentRegion)}
                </span>
                {currentRegion?.currency !== 'KHR' && (
                  <div className="text-[11px] text-[#64748B]">
                    ≈ ៛{totalKhr || '0'} KHR
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Guarantee / Processing Reassurance Footer */}
          <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-[12px] mb-5 ${isPending ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
            <ShieldCheck size={18} className="shrink-0" />
            <span>
              {isPending
                ? 'Order is being fulfilled by our verified admin team. It is 100% safe to close this tab.'
                : 'This order was processed with 100% secure anti-ban delivery.'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex">
            <button
              type="button"
              onClick={onClose}
              className="w-full seagm-btn-teal py-3 text-sm font-black uppercase tracking-wider cursor-pointer shadow-md active:scale-95 transition-all"
            >
              <span>Close Receipt</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
