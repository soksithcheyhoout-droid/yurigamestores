import React, { useState } from 'react';
import { ShieldCheck, Zap, Headphones, CreditCard, X } from 'lucide-react';
import { GAMES, findAuthorizedGame } from '../data/games';

// Strictly 4 Authorized Games & Official Cambodian Payment Gateways in alternating sequence
const MARQUEE_ITEMS = [
  // 1. Payment: Bakong KHQR
  {
    type: 'payment',
    id: 'bakong',
    name: 'Bakong KHQR',
    tag: 'KHQR',
    tagColor: '#E11D48',
    tagBg: '#FFE4E6',
    tagBorder: '#FECDD3',
    logo: 'https://play-lh.googleusercontent.com/Q27JPO0Plka8m3_-h2yw3Xu22Wedt3NJcxl1NPgMlaI6VRNcmSEPArvAcmnK1_TpmMBUlTsxjS1ycy0rRDFrmA=w240-h480-rw',
    subtitle: 'National Bank of Cambodia',
    badge: '0% Fee',
    highlight: 'Instant'
  },
  // 2. Product: Roblox
  {
    type: 'product',
    id: 'robuxsend',
    name: 'Roblox',
    tag: 'ROBLOX CORP',
    tagColor: '#DC2626',
    tagBg: '#FEE2E2',
    tagBorder: '#FECACA',
    icon: '/assets/games/roblox_tile_4k.jpg',
    currency: 'Robux',
    price: 'From $0.10',
    badge: 'Official Username',
    highlight: 'Hot'
  },
  // 3. Payment: ABA PAY
  {
    type: 'payment',
    id: 'aba',
    name: 'ABA PAY',
    tag: 'ABA',
    tagColor: '#0D9488',
    tagBg: '#CCFBF1',
    tagBorder: '#99F6E4',
    logo: 'https://play-lh.googleusercontent.com/O7xMXY5ehCEVwpR0MlKYQOK5QJ1oFIw4EoXQqyt_vgDKT3Uvn1g8FIz_fNDDhWH4Zbdclp54WhRMnI8vzyE9OeU',
    subtitle: 'Instant Mobile QR Checkout',
    badge: '0% Fee',
    highlight: 'Fast'
  },
  // 4. Product: Mobile Legends KH
  {
    type: 'product',
    id: 'ml',
    name: 'Mobile Legends KH',
    tag: 'MOONTON',
    tagColor: '#0284C7',
    tagBg: '#E0F2FE',
    tagBorder: '#BAE6FD',
    icon: '/assets/games/mlbb_tile_4k.jpg',
    currency: 'Diamonds',
    price: 'From $0.77',
    badge: '5s Moonton Sync',
    highlight: 'Best Value'
  },
  // 5. Payment: ACLEDA Mobile
  {
    type: 'payment',
    id: 'acleda',
    name: 'ACLEDA Mobile',
    tag: 'ACLEDA',
    tagColor: '#2563EB',
    tagBg: '#DBEAFE',
    tagBorder: '#BFDBFE',
    logo: '/assets/payments/khqr_official.svg',
    subtitle: 'ACLEDA KHQR Payment',
    badge: '0% Fee',
    highlight: 'Direct'
  },
  // 6. Product: Free Fire
  {
    type: 'product',
    id: 'ff',
    name: 'Free Fire',
    tag: 'GARENA',
    tagColor: '#EA580C',
    tagBg: '#FFEDD5',
    tagBorder: '#FED7AA',
    icon: '/assets/games/freefire_tile_4k.jpg',
    currency: 'Diamonds',
    price: 'From $0.25',
    badge: 'Official Garena UID',
    highlight: 'Top Seller'
  },
  // 7. Payment: Wing Bank
  {
    type: 'payment',
    id: 'wing',
    name: 'Wing Bank',
    tag: 'WING',
    tagColor: '#65A30D',
    tagBg: '#ECFCCB',
    tagBorder: '#D9F99D',
    logo: '/assets/payments/khqr_official.svg',
    subtitle: 'Wing Money & KHQR Mobile',
    badge: 'Instant QR',
    highlight: '24/7'
  },
  // 8. Product: RoS Legacy
  {
    type: 'product',
    id: 'roslegacy',
    name: 'RoS Legacy',
    tag: 'ROS LEGACY',
    tagColor: '#9333EA',
    tagBg: '#F3E8FF',
    tagBorder: '#E9D5FF',
    icon: '/assets/brand/yurigame-logo.webp',
    currency: 'Diamonds',
    price: 'From $0.99',
    badge: 'Safe Username',
    highlight: 'Exclusive'
  }
];

/**
 * High-End Single-Line Full-Screen Moving Ribbon (Edge-to-Edge, No Card Box)
 * Showcases all products and official payment channels in an infinite moving ribbon
 */
export function ProductPaymentMarquee({ onSelectGame }) {
  const [activeModalItem, setActiveModalItem] = useState(null);

  const handleClickItem = (item) => {
    if (item.type === 'product') {
      const found = findAuthorizedGame(item.id);
      if (onSelectGame) {
        onSelectGame(found);
      }
    } else {
      setActiveModalItem(item);
    }
  };

  return (
    <div className="w-full bg-white/60 sm:bg-transparent backdrop-blur-xs border-y border-slate-200/50 sm:border-slate-200/30 py-1.5 sm:py-2.5 overflow-hidden relative">
      {/* Full-Width Edge-to-Edge Seamless Ticker Stream (Perfect Responsive) */}
      <div className="w-full overflow-hidden mask-edge-fade pause-on-hover select-none">
        <div className="animate-infinite-marquee items-center gap-0 py-0.5">
          {/* Duplicated twice for seamless 100% gapless infinite loop */}
          {MARQUEE_ITEMS.concat(MARQUEE_ITEMS).map((item, idx) => {
            const isProduct = item.type === 'product';

            return (
              <div
                key={`${item.id}-${idx}`}
                onClick={() => handleClickItem(item)}
                role="button"
                tabIndex={0}
                className="inline-flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-4 py-1 hover:text-[#E3062F] active:scale-95 transition-all cursor-pointer shrink-0 select-none group"
              >
                {/* Crisp Logo or Game Icon */}
                {isProduct ? (
                  <img
                    src={item.icon}
                    alt={item.name}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/assets/games/mlbb_tile_4k.jpg';
                    }}
                    className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 rounded-md object-cover border border-slate-200/80 shrink-0 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 rounded-md bg-white border border-slate-200/80 flex items-center justify-center p-0.5 shrink-0 group-hover:scale-105 transition-transform">
                    <img
                      src={item.logo}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {/* Name */}
                <span className="text-[12px] sm:text-[13px] font-bold text-[#0F172A] whitespace-nowrap leading-none group-hover:text-[#E3062F] transition-colors">
                  {item.name}
                </span>

                {/* Vibrant Refined Tag */}
                <span
                  className="text-[8.5px] sm:text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded leading-none whitespace-nowrap"
                  style={{
                    color: item.tagColor,
                    backgroundColor: item.tagBg,
                  }}
                >
                  {item.tag}
                </span>

                {/* Price or Fee */}
                <span className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] group-hover:text-[#E3062F] whitespace-nowrap leading-none transition-colors">
                  {isProduct ? item.price : item.badge}
                </span>

                {/* Elegant Stream Divider */}
                <span className="text-slate-300 select-none ml-2 sm:ml-3 text-[10px] sm:text-xs font-light">•</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Information Modal (Clean Responsive White Theme) */}
      {activeModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setActiveModalItem(null)}
        >
          <div
            className="w-full max-w-[92vw] sm:max-w-sm rounded-2xl bg-white border border-[#E2E8F0] p-5 sm:p-6 text-[#0F172A] shadow-2xl animate-in zoom-in-95 duration-150 relative mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveModalItem(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border-none cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-13 h-13 rounded-xl bg-slate-50 p-2.5 flex items-center justify-center border border-slate-200 shadow-2xs">
                <img src={activeModalItem.logo} alt={activeModalItem.name} className="max-h-full max-w-full object-contain" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                  {activeModalItem.name}
                  <span
                    className="text-[10px] font-black uppercase px-2 py-0.5 rounded"
                    style={{ color: activeModalItem.tagColor, backgroundColor: activeModalItem.tagBg }}
                  >
                    {activeModalItem.tag}
                  </span>
                </h4>
                <p className="text-xs text-[#64748B] mt-0.5">{activeModalItem.subtitle}</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-[#334155] bg-[#F8FAFC] p-4 rounded-xl border border-slate-200 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] font-medium">Processing Fee:</span>
                <span className="font-extrabold text-[#E3062F] bg-[#FFF0F3] px-2 py-0.5 rounded">0% Free</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] font-medium">Confirmation Speed:</span>
                <span className="font-bold text-[#0F172A]">Under 60 Seconds</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] font-medium">Supported Currencies:</span>
                <span className="font-bold text-[#0F172A]">USD, KHR, USDT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] font-medium">Security Standard:</span>
                <span className="font-bold text-emerald-600">National Bank Verified</span>
              </div>
            </div>

            <button
              onClick={() => setActiveModalItem(null)}
              className="w-full py-2.5 rounded-xl bg-[#E3062F] hover:bg-[#B80D2E] font-bold text-white text-xs cursor-pointer border-none transition-all shadow-xs hover:shadow-md"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main TrustBar Section Component
 * Revamped with clean white professional theme
 */
export default function TrustBar() {
  const steps = [
    {
      number: "01",
      icon: <Zap size={18} />,
      title: "Choose a product",
      desc: "Pick Roblox, MLBB, Free Fire, or RoS Legacy."
    },
    {
      number: "02",
      icon: <ShieldCheck size={18} />,
      title: "Enter your player ID",
      desc: "We verify your player ID or username directly with the live server."
    },
    {
      number: "03",
      icon: <CreditCard size={18} />,
      title: "Pay and receive",
      desc: "Pay with Bakong KHQR / ABA Pay and receive your diamonds instantly."
    }
  ];

  return (
    <section id="trust" className="scroll-mt-24 bg-[#111217] py-9 text-white sm:py-12">
      <div className="seagm-container">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_2fr] lg:gap-14">
          <div>
            <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff3156]">How it works</p>
            <h2 className="m-0 mt-2 max-w-xs text-[24px] font-extrabold leading-[1.12] tracking-[-0.035em] sm:text-[30px]">A direct route from checkout to your game.</h2>
            <p className="m-0 mt-3 max-w-sm text-[11px] leading-relaxed text-slate-400 sm:text-[12px]">No account password. No manual code exchange. Just the player ID or username required for your selected game.</p>
          </div>

          <div className="grid gap-0 border-y border-white/15 sm:grid-cols-3 sm:divide-x sm:divide-white/15">
            {steps.map((step) => (
              <div key={step.number} className="grid grid-cols-[36px_1fr] gap-3 border-b border-white/15 py-4 last:border-b-0 sm:block sm:border-b-0 sm:px-5 sm:py-5 first:sm:pl-0 last:sm:pr-0">
                <span className="font-mono text-[11px] text-[#ff3156]">{step.number}</span>
                <div>
                  <span className="mb-2 hidden text-[#ff3156] sm:block">{step.icon}</span>
                  <h3 className="m-0 text-[12px] font-bold text-white sm:text-[13px]">{step.title}</h3>
                  <p className="m-0 mt-1 text-[10px] leading-relaxed text-slate-400 sm:text-[11px]">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:text-[11px]">
          <span>Payments supported through Bakong KHQR and ABA PAY.</span>
          <span className="flex items-center gap-2 text-slate-300"><Headphones size={14} className="text-[#ff3156]" /> Need help? Live support is available.</span>
        </div>
      </div>
    </section>
  );
}
