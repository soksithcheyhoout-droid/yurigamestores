import React from 'react';
import { ExternalLink } from 'lucide-react';
import { GAMES, findAuthorizedGame } from '../data/games';

export default function NewsAndPromotions({ onSelectGame }) {
  const newsItems = [
    {
      id: 1,
      title: "Mobile Legends: Weekly Diamond Pass Offer with Moonton Direct Sync",
      image: "/assets/banners/banner_mlbb.jpg",
      gameId: "ml"
    },
    {
      id: 2,
      title: "Roblox Robux Instant Delivery with Official Username Verification",
      image: "/assets/games/roblox_hero_4k.jpg",
      gameId: "robuxsend"
    },
    {
      id: 3,
      title: "Garena Free Fire Diamonds Instant Automated Player UID Top-Up",
      image: "/assets/banners/banner_freefire.jpg",
      gameId: "ff"
    },
    {
      id: 4,
      title: "RoS Legacy Official Direct Diamonds Top-Up & Safe Username Checkout",
      image: "/assets/brand/yurigame-logo.webp",
      gameId: "roslegacy"
    }
  ];

  const handleCardClick = (item) => {
    const found = findAuthorizedGame(item.gameId);
    if (onSelectGame) onSelectGame(found);
  };

  const handleNewsHeaderClick = () => {
    const el = document.getElementById('catalog');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="news" className="scroll-mt-24 w-full py-6 sm:py-8 bg-[#F4F4F6]">
      <div className="seagm-container">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-sm sm:text-base font-black text-[#0F172A] tracking-wider uppercase font-['Outfit'] m-0 whitespace-nowrap shrink-0">
            NEWS & PROMOTIONS
          </h2>

          <a 
            href="#catalog" 
            onClick={handleNewsHeaderClick}
            className="inline-flex items-center gap-1 text-[11px] sm:text-[11.5px] font-bold text-[#475569] hover:text-[#E3062F] transition-colors no-underline cursor-pointer shrink-0"
          >
            <span className="hidden sm:inline">Browse all 4 games on </span>
            <span className="sm:hidden">More on </span>
            <strong className="text-[#E3062F]">YuriGame Live</strong>
            <ExternalLink size={12} className="text-[#E3062F]" />
          </a>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {newsItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleCardClick(item)}
              className="bg-transparent rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group flex flex-col active:scale-[0.98] select-none"
            >
              {/* Graphic Banner */}
              <div className="relative aspect-[227/126] w-full overflow-hidden rounded-xl bg-slate-200/60 border border-slate-200/80 shadow-2xs group-hover:shadow-xs group-hover:border-[#E3062F]/50 transition-all">
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/assets/games/mlbb_tile_4k.jpg';
                  }}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute top-2 left-2 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
                  Live Top-Up
                </span>
              </div>

              {/* Title */}
              <p className="mt-2 text-[12px] sm:text-[13px] font-extrabold text-[#0F172A] leading-snug line-clamp-2 group-hover:text-[#E3062F] transition-colors">
                {item.title}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
