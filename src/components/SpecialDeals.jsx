import React from 'react';
import { ChevronRight } from 'lucide-react';
import { GAMES, findAuthorizedGame } from '../data/games';

const EXCLUSIVE_OFFERS = [
  {
    id: 'roblox_800',
    title: '800 Robux Special Pack',
    gameName: 'Roblox',
    discount: '15% off',
    image: '/assets/games/roblox_tile_4k.jpg',
    gameId: 'robuxsend'
  },
  {
    id: 'mlbb_weekly',
    title: 'Weekly Diamond Pass',
    gameName: 'Mobile Legends KH',
    discount: '60% off',
    image: '/assets/games/mlbb_tile_4k.jpg',
    gameId: 'ml'
  },
  {
    id: 'ff_520',
    title: '520 Diamonds Pack',
    gameName: 'Free Fire',
    discount: '12% off',
    image: '/assets/games/freefire_tile_4k.jpg',
    gameId: 'ff'
  },
  {
    id: 'ros_748',
    title: '680 + 68 Diamonds',
    gameName: 'RoS Legacy',
    discount: '10% off',
    image: '/assets/brand/yurigame-logo.webp',
    gameId: 'roslegacy'
  },
  {
    id: 'mlbb_2195',
    title: '2,195 Diamonds Mega Pack',
    gameName: 'Mobile Legends KH',
    discount: '18% off',
    image: '/assets/games/mlbb_tile_4k.jpg',
    gameId: 'ml'
  },
];

export default function SpecialDeals({ onSelectGame }) {
  const openOffer = (offer) => {
    const game = findAuthorizedGame(offer.gameId);
    if (game) onSelectGame?.(game);
  };

  return (
    <section id="deals" className="scroll-mt-24 bg-[#F4F4F6] py-7 sm:py-9">
      <div className="seagm-container">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="m-0 text-[20px] font-extrabold tracking-[-0.02em] text-slate-950 sm:text-[22px]">Special deals</h2>
            <p className="m-0 mt-1 text-[11px] text-slate-500 sm:text-[12px]">Limited-time discounts on our 4 authorized top-up games.</p>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-0.5 border-0 bg-transparent p-0 text-[11px] font-bold text-slate-600 hover:text-[#bd0d2e] sm:text-[12px]"
          >
            All products <ChevronRight size={14} />
          </button>
        </div>

        <div className="no-scrollbar grid snap-x snap-mandatory grid-flow-col auto-cols-[72%] gap-3 overflow-x-auto pb-1 sm:auto-cols-[38%] lg:grid-flow-row lg:grid-cols-5 lg:overflow-visible">
          {EXCLUSIVE_OFFERS.map((offer) => (
            <button
              key={offer.id}
              type="button"
              onClick={() => openOffer(offer)}
              className="group snap-start rounded-[10px] border border-slate-200 bg-white p-3 text-left transition-all hover:border-[#e3062f]/50 hover:shadow-[0_10px_24px_rgba(227,6,47,0.08)]"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-1.5 sm:h-14 sm:w-14">
                  <img
                    src={offer.image}
                    alt=""
                    className="h-full w-full object-contain"
                    onError={(event) => {
                      event.currentTarget.src = '/assets/games/mlbb_tile_4k.jpg';
                    }}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="mb-1 inline-block rounded-[4px] bg-[#fff0f3] px-1.5 py-0.5 text-[9px] font-extrabold text-[#bd0d2e]">{offer.discount}</span>
                  <span className="block truncate text-[12px] font-extrabold text-slate-900 sm:text-[13px]">{offer.title}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-slate-500">{offer.gameName}</span>
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2 text-[9px] font-semibold text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Available for instant delivery
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
