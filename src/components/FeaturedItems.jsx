import React from 'react';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { findAuthorizedGame } from '../data/games';

const ITEMS = [
  {
    id: 1,
    gameId: 'robuxsend',
    eyebrow: 'Roblox top-up',
    title: 'Instant Robux Delivery by Username',
    desc: 'Automated account lookup and secure Robux delivery directly into your Roblox balance.',
    image: '/assets/games/roblox_tile_4k.jpg',
  },
  {
    id: 2,
    gameId: 'ml',
    eyebrow: 'Mobile Legends KH',
    title: 'Moonton Direct Server Sync',
    desc: 'Weekly Diamond Pass and Diamond packages delivered in under 5 seconds to your User ID & Zone ID.',
    image: '/assets/games/mlbb_tile_4k.jpg',
  },
  {
    id: 3,
    gameId: 'ff',
    eyebrow: 'Free Fire',
    title: 'Garena Automated Direct UID Top-Up',
    desc: 'Instant diamonds deposit across all regions with anti-ban guarantee and official receipts.',
    image: '/assets/games/freefire_tile_4k.jpg',
  },
  {
    id: 4,
    gameId: 'roslegacy',
    eyebrow: 'RoS Legacy',
    title: 'RoS Legacy Safe Username Top-Up',
    desc: 'Official RoS Legacy diamonds top-up. Enter your public username only — password never needed.',
    image: '/assets/brand/yurigame-logo.webp',
  },
];

export default function FeaturedItems({ onSelectGame }) {
  const handleCardClick = (item) => {
    const game = findAuthorizedGame(item.gameId);
    if (game) onSelectGame?.(game);
  };

  return (
    <section className="w-full bg-white py-8 sm:py-12">
      <div className="seagm-container">
        <div className="mb-5 max-w-xl">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#bd0d2e] sm:text-[11px]">
            <BookOpen size={14} />
            Discover our games
          </div>
          <h2 className="m-0 text-xl font-black tracking-[-0.025em] text-slate-950 sm:text-2xl">Supported games & live top-up</h2>
          <p className="m-0 mt-1 text-[12px] leading-relaxed text-slate-500 sm:text-[13px]">Fast, secure top-ups with live player ID verification and Bakong KHQR checkout.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-4">
          {ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleCardClick(item)}
              className="group grid min-h-[126px] grid-cols-[104px_1fr] overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fafb] p-0 text-left transition hover:-translate-y-0.5 hover:border-[#f0a7b6] hover:bg-white hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] sm:min-h-[142px] sm:grid-cols-[132px_1fr]"
            >
              <span className="flex h-full items-center justify-center bg-gradient-to-br from-[#fff1f4] via-white to-[#fff1f3] p-4 sm:p-5">
                <img
                  src={item.image}
                  alt=""
                  className="max-h-20 max-w-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-110 sm:max-h-24"
                  onError={(e) => {
                    e.currentTarget.src = '/assets/games/mlbb_tile_4k.jpg';
                  }}
                />
              </span>
              <span className="flex min-w-0 flex-col justify-center px-4 py-3.5 sm:px-5">
                <span className="text-[9px] font-black uppercase tracking-[0.13em] text-[#bd0d2e] sm:text-[10px]">{item.eyebrow}</span>
                <span className="mt-1.5 text-[14px] font-extrabold leading-snug text-slate-950 transition-colors group-hover:text-[#b80d2e] sm:text-[16px]">{item.title}</span>
                <span className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500 sm:text-[12px]">{item.desc}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-700 sm:text-[11px]">Explore <ArrowUpRight size={12} /></span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
