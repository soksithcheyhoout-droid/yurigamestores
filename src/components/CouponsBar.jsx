import React, { useState } from 'react';
import { Check } from 'lucide-react';

export default function CouponsBar() {
  const [claimedCodes, setClaimedCodes] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  const coupons = [
    {
      code: "NEXON30",
      discount: "30% OFF",
      title: "Nexon Game Card (Karma Koin)",
      status: "available"
    },
    {
      code: "NEW31",
      discount: "31% OFF",
      title: "New Users Exclusive Voucher",
      status: "coming_soon"
    },
    {
      code: "MLBB18",
      discount: "18% OFF",
      title: "Mobile Legends KH Diamond Pass",
      status: "available"
    },
    {
      code: "PUBG10",
      discount: "10% OFF",
      title: "PUBG Mobile UC Global Voucher",
      status: "available"
    }
  ];

  const handleClaim = (coupon) => {
    if (coupon.status === 'coming_soon') {
      setToastMessage('This coupon will be available soon! Check back daily.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setClaimedCodes(prev => ({ ...prev, [coupon.code]: true }));
    try {
      navigator.clipboard.writeText(coupon.code);
    } catch (e) {}

    setToastMessage(`Coupon "${coupon.code}" Claimed! Code copied to clipboard.`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  return (
    <section id="coupons" className="w-full pt-1 pb-6 bg-[#F4F4F6]">
      <div className="seagm-container">
        
        {/* Header subtitle matching Screenshot 3 */}
        <div className="mb-3">
          <p className="text-[12px] text-[#64748B] m-0">
            Claim your coupon now for extra savings! Do not miss out!
          </p>
        </div>

        {/* Coupons Cards: 2-column grid on mobile (no horizontal scroll), 4-column on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {coupons.map((coupon) => {
            const isClaimed = claimedCodes[coupon.code];
            const isComingSoon = coupon.status === 'coming_soon';

            return (
              <div 
                key={coupon.code}
                className="bg-white border border-[#E2E8F0] rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 shadow-2xs hover:border-[#E3062F]/35 hover:shadow-[0_8px_22px_rgba(227,6,47,0.08)] transition-all overflow-hidden w-full"
              >
                <div className="w-full min-w-0 flex-1">
                  <div className="text-base sm:text-lg font-black text-[#0F172A] font-['Outfit'] tracking-tight">
                    {coupon.discount}
                  </div>
                  <div 
                    title={coupon.title}
                    className="text-[11.5px] sm:text-[12px] text-[#64748B] font-medium leading-snug line-clamp-2 min-h-[32px] sm:min-h-0 mt-1 break-words"
                  >
                    {coupon.title}
                  </div>
                </div>

                <div className="mt-1 sm:mt-0 shrink-0">
                  {isComingSoon ? (
                    <span className="inline-flex items-center justify-center text-[11px] font-semibold text-[#94A3B8] bg-[#F1F5F9] px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                      Coming Soon!
                    </span>
                  ) : (
                    <button
                      onClick={() => handleClaim(coupon)}
                      className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer border-0 ${
                        isClaimed
                          ? 'bg-[#FFF0F3] text-[#E3062F]'
                          : 'bg-[#1E293B] hover:bg-black text-white'
                      }`}
                    >
                      {isClaimed ? (
                        <span className="flex items-center gap-1">
                          <Check size={12} /> Claimed
                        </span>
                      ) : (
                        'CLAIM'
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-[13px] animate-in slide-in-from-bottom-3 duration-200">
            <Check size={16} className="text-[#E3062F]" />
            <span>{toastMessage}</span>
          </div>
        )}

      </div>
    </section>
  );
}
