import React from 'react';
import { Zap } from 'lucide-react';
import { GAMES, findAuthorizedGame } from '../data/games';

export default function MarqueeBadges({ onSelectGame }) {
  const row1 = [
    { id: "robuxsend", name: "Roblox", currency: "Robux", badge: "Official Username", icon: "/assets/games/roblox_tile_4k.jpg" },
    { id: "ml", name: "Mobile Legends KH", currency: "Diamonds", badge: "5s Moonton Sync", icon: "/assets/games/mlbb_tile_4k.jpg" },
    { id: "ff", name: "Free Fire", currency: "Diamonds", badge: "Official Direct UID", icon: "/assets/games/freefire_tile_4k.jpg" },
    { id: "roslegacy", name: "RoS Legacy", currency: "Diamonds", badge: "Secure Voucher", icon: "/assets/brand/yurigame-logo.webp" },
    { id: "robuxsend", name: "Roblox", currency: "Robux", badge: "Instant Delivery", icon: "/assets/games/roblox_tile_4k.jpg" },
    { id: "ml", name: "Mobile Legends KH Pass", currency: "Weekly Pass", badge: "Save 60%", icon: "/assets/games/mlbb_tile_4k.jpg" },
    { id: "ff", name: "Free Fire", currency: "Diamonds", badge: "Anti-Ban 100%", icon: "/assets/games/freefire_tile_4k.jpg" },
    { id: "roslegacy", name: "RoS Legacy", currency: "Diamonds", badge: "Fast Top-Up", icon: "/assets/brand/yurigame-logo.webp" }
  ];

  const row2 = [
    { id: "ml", name: "Mobile Legends KH", currency: "Diamonds", badge: "Live Check", icon: "/assets/games/mlbb_tile_4k.jpg" },
    { id: "robuxsend", name: "Roblox Robux", currency: "Robux", badge: "Official API", icon: "/assets/games/roblox_tile_4k.jpg" },
    { id: "ff", name: "Garena Free Fire", currency: "Diamonds", badge: "Automated", icon: "/assets/games/freefire_tile_4k.jpg" },
    { id: "roslegacy", name: "RoS Legacy Top-Up", currency: "Diamonds", badge: "Safe Username", icon: "/assets/brand/yurigame-logo.webp" },
    { id: "robuxsend", name: "Roblox", currency: "Robux", badge: "Official Users API", icon: "/assets/games/roblox_tile_4k.jpg" },
    { id: "ml", name: "Mobile Legends KH", currency: "Diamonds", badge: "Zone ID Sync", icon: "/assets/games/mlbb_tile_4k.jpg" },
    { id: "ff", name: "Free Fire", currency: "Diamonds", badge: "Direct Deposit", icon: "/assets/games/freefire_tile_4k.jpg" },
    { id: "roslegacy", name: "RoS Legacy", currency: "Diamonds", badge: "24/7 Available", icon: "/assets/brand/yurigame-logo.webp" }
  ];

  const renderBadge = (item, key, isRow2) => (
    <div
      key={key}
      onClick={() => {
        const found = findAuthorizedGame(item.id);
        if (onSelectGame) onSelectGame(found);
      }}
      role="button"
      tabIndex={0}
      className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-blue-400/60 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer shrink-0 group transform hover:-translate-y-0.5"
    >
      <img
        src={item.icon}
        alt={item.name}
        loading="lazy"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = '/assets/games/mlbb_tile_4k.jpg';
        }}
        className="w-10 h-10 rounded-xl object-cover border border-slate-200/80 shadow-2xs shrink-0"
      />
      <div>
        <div className="text-xs font-extrabold text-slate-800 whitespace-nowrap leading-tight group-hover:text-blue-600 transition-colors">
          {item.name}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[11px] font-bold ${isRow2 ? 'text-indigo-600' : 'text-cyan-600'}`}>
            {item.currency}
          </span>
          <span className="inline-flex items-center text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.2">
            <Zap size={9} className="mr-0.5" />
            <span>{item.badge}</span>
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <section className="py-6 bg-[#F8FAFC] border-y border-slate-200/60 overflow-hidden relative select-none">
      <div className="max-w-7xl mx-auto px-4 mb-3 flex items-center justify-between">
        <div className="text-xs font-black uppercase tracking-widest text-slate-400 font-['Outfit']">
          Authorized Live Top-Up Games
        </div>
        <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Verified Instant Top-Up & Bakong KHQR
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* Track 1: Scroll Left */}
        <div className="flex gap-4 animate-marquee-slow hover:[animation-play-state:paused] w-max">
          {row1.map((item, idx) => renderBadge(item, `r1-${idx}`, false))}
          {row1.map((item, idx) => renderBadge(item, `r1-dup-${idx}`, false))}
        </div>

        {/* Track 2: Scroll Right */}
        <div className="flex gap-4 animate-marquee-reverse-slow hover:[animation-play-state:paused] w-max">
          {row2.map((item, idx) => renderBadge(item, `r2-${idx}`, true))}
          {row2.map((item, idx) => renderBadge(item, `r2-dup-${idx}`, true))}
        </div>
      </div>
    </section>
  );
}
