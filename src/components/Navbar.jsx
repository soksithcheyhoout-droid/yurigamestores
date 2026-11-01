import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Clock3,
  Menu,
  Search,
  X,
  Zap,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { fetchSoraCatalogue, fetchSoraGameWithPackages } from '../data/soraStore';
import { TRANSLATIONS } from '../data/regionStore';
import YuriGameLogo from './YuriGameLogo';
import CountryFlag from './CountryFlag';

const NAV_GAMES = [
  { providerCode: 'robuxsend', name: 'Roblox', publisher: 'Official Username', image: 'https://storage.harikitopup.com/branding/vouchers/roblox.svg', badge: 'Instant' },
  { providerCode: 'ml', name: 'Mobile Legends', publisher: 'Moonton 5s Sync', image: '/assets/games/mlbb_tile_4k.jpg', badge: 'Hot' },
  { providerCode: 'ff', name: 'Free Fire', publisher: 'Garena UID Direct', image: 'https://storage.harikitopup.com/branding/vouchers/freefire.svg', badge: 'Fast' },
  { providerCode: 'roslegacy', name: 'RoS Legacy', publisher: 'Dedicated Admin', image: '/assets/brand/yurigame-logo.webp', badge: 'Safe' },
];

export default function Navbar({
  onOpenLookup,
  currentRegion,
  onOpenRegionModal,
  onToggleRegion,
  onGoHome,
  onSelectGame,
  onSelectCategory,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [gamesMenuHovered, setGamesMenuHovered] = useState(false);
  const [catalogGames, setCatalogGames] = useState(NAV_GAMES);
  const searchRef = useRef(null);
  const t = TRANSLATIONS[currentRegion?.lang || 'en'] || TRANSLATIONS.en;

  useEffect(() => {
    fetchSoraCatalogue()
      .then((cat) => {
        if (Array.isArray(cat?.games) && cat.games.length > 0) {
          setCatalogGames(cat.games);
        }
      })
      .catch(() => {});
  }, []);

  const searchResults = searchQuery.trim()
    ? catalogGames.filter((game) => {
        const query = searchQuery.toLowerCase();
        return (
          game.name.toLowerCase().includes(query) ||
          game.providerCode?.toLowerCase().includes(query) ||
          game.publisher?.toLowerCase().includes(query) ||
          game.currency?.toLowerCase().includes(query)
        );
      }).slice(0, 8)
    : [];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openProviderGame = async (game) => {
    setSearchQuery('');
    setSearchFocused(false);
    setMobileMenuOpen(false);
    setGamesMenuHovered(false);
    try {
      const liveGame = await fetchSoraGameWithPackages(game.providerCode || game.code);
      onSelectGame?.(liveGame);
    } catch {
      scrollToSection('catalog', 'all');
    }
  };

  const handleSearchResultClick = (game) => {
    openProviderGame(game);
  };

  const scrollToSection = (id, category) => {
    setMobileMenuOpen(false);
    setGamesMenuHovered(false);
    if (category) onSelectCategory?.(category);
    onGoHome?.();
    window.setTimeout(() => {
      const target = document.getElementById(id) || document.getElementById('footer') || document.getElementById('catalog');
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const openRegionPicker = () => {
    setMobileMenuOpen(false);
    (onOpenRegionModal || onToggleRegion)?.();
  };

  const renderSearchResults = () => {
    if (!searchQuery.trim()) return null;

    return (
      <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-[#2D303E] bg-[#12131A] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
        <div className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400 font-['Rajdhani']">
          {searchResults.length ? 'Available Products' : 'No matching products'}
        </div>
        {searchResults.map((game) => (
          <button
            key={game.providerCode || game.code}
            type="button"
            onClick={() => handleSearchResultClick(game)}
            className="group flex w-full items-center gap-3 rounded-xl border border-transparent bg-transparent p-2 text-left transition-all hover:border-[#E3062F]/40 hover:bg-[#1A1C25] cursor-pointer"
          >
            <img
              src={game.image}
              alt=""
              className="h-10 w-10 shrink-0 rounded-xl border border-[#262833] bg-slate-900 object-cover"
              onError={(e) => {
                e.currentTarget.src = '/assets/games/mlbb_tile_4k.jpg';
              }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold text-white group-hover:text-[#E3062F] font-['Rajdhani']">
                {game.name}
              </span>
              <span className="block truncate text-[11px] text-slate-400">{game.publisher}</span>
            </span>
            <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#E3062F]">
              Direct Live
            </span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <header className="yurigame-navbar sticky top-0 z-40 w-full border-b border-[#1E202B] bg-[#0A0B10]/95 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      {/* Top micro ticker */}
      <div className="w-full border-b border-[#171922] bg-[#0E0F15]">
        <div className="seagm-container flex h-8 items-center justify-between text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              Automated 24/7 Top-Up Processing
            </span>
            <span className="hidden h-3 w-px bg-slate-700 sm:inline" aria-hidden="true" />
            <span className="hidden sm:inline text-slate-400">
              Instant Bakong KHQR & ABA Pay
            </span>
          </div>


        </div>
      </div>

      {/* Main Navbar Row */}
      <div className="seagm-container flex h-[66px] items-center gap-3 lg:h-[72px] lg:gap-6">
        {/* Brand Logo */}
        <a
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onGoHome?.();
          }}
          className="group flex shrink-0 items-center no-underline transition-transform duration-200 hover:scale-[1.02]"
          aria-label="YuriGame Store home"
        >
          <YuriGameLogo size="sm" showBadge={false} inverse />
          <span className="ml-2.5 hidden rounded-md border border-[#E3062F]/50 bg-[#E3062F]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#FF4D6D] sm:inline-flex font-['Rajdhani']">
            Store
          </span>
        </a>

        {/* Desktop PC Nav with Interactive Hover Animations */}
        <nav className="hidden shrink-0 items-center gap-1 xl:flex">
          {/* Games Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setGamesMenuHovered(true)}
            onMouseLeave={() => setGamesMenuHovered(false)}
          >
            <button
              type="button"
              onClick={() => scrollToSection('catalog', 'all')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-bold font-['Rajdhani'] uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                gamesMenuHovered
                  ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(227,6,47,0.25)] border border-[#E3062F]/40'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <span>Games</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${gamesMenuHovered ? 'rotate-180 text-[#E3062F]' : 'text-slate-400'}`}
              />
            </button>

            {/* Hover Mega Dropdown for Games */}
            {gamesMenuHovered && (
              <div className="absolute left-0 top-full pt-2 z-50 w-72 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="rounded-2xl border border-[#2B2E3D] bg-[#12131A] p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 font-['Rajdhani']">
                    Authorized Games
                  </div>
                  <div className="space-y-1 mt-1">
                    {NAV_GAMES.map((game) => (
                      <button
                        key={game.providerCode}
                        type="button"
                        onClick={() => openProviderGame(game)}
                        className="group flex w-full items-center gap-2.5 rounded-xl border border-transparent p-2 text-left transition-all hover:border-[#E3062F]/40 hover:bg-[#1A1C25] cursor-pointer"
                      >
                        <img
                          src={game.image}
                          alt={game.name}
                          className="h-8 w-8 rounded-lg object-cover border border-[#262835] bg-slate-900"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-bold text-white group-hover:text-[#E3062F] font-['Rajdhani'] truncate">
                            {game.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {game.publisher}
                          </div>
                        </div>
                        <span className="rounded bg-[#E3062F]/15 border border-[#E3062F]/30 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#FF4D6D]">
                          {game.badge}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => scrollToSection('catalog', 'popular')}
            className="px-3.5 py-2 rounded-xl text-[13px] font-bold font-['Rajdhani'] uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200 cursor-pointer"
          >
            Direct Top-Up
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('faq')}
            className="px-3.5 py-2 rounded-xl text-[13px] font-bold font-['Rajdhani'] uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200 cursor-pointer"
          >
            Support & Help
          </button>
        </nav>

        {/* Global Search Bar */}
        <div ref={searchRef} className="relative ml-auto hidden min-w-0 max-w-[420px] flex-1 md:block">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => setSearchFocused(true)}
            placeholder={t.searchPlaceholder || 'Search Roblox, Mobile Legends, Free Fire, RoS...'}
            className="h-10 w-full rounded-xl border border-[#262836] bg-[#12131A] pl-10 pr-4 text-[13px] font-medium text-white placeholder-slate-500 outline-none transition focus:border-[#E3062F] focus:bg-[#161821] focus:ring-2 focus:ring-[#E3062F]/20 font-['Kantumruy_Pro']"
          />
          {searchFocused && renderSearchResults()}
        </div>

        {/* Right CTA Actions: Orders & Mobile Menu Toggle */}
        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
          <button
            type="button"
            onClick={onOpenLookup}
            className="group relative flex h-10 items-center gap-2 rounded-xl border border-[#262836] bg-[#12131A] px-3.5 text-slate-200 transition-all duration-200 hover:border-[#E3062F] hover:bg-[#E3062F]/10 hover:text-white hover:shadow-[0_0_20px_rgba(227,6,47,0.3)] active:scale-95 cursor-pointer font-['Rajdhani']"
            aria-label="Track an order"
          >
            <Clock3 size={16} className="text-[#E3062F] transition-transform duration-200 group-hover:rotate-45" />
            <span className="text-[13px] font-bold uppercase tracking-wider">
              Track Orders
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#262836] bg-[#12131A] text-slate-200 transition hover:bg-white/10 xl:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="border-t border-[#1C1E28] bg-[#0E0F15] px-4 pb-6 pt-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] xl:hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="seagm-container !px-0">
            <div className="relative mb-4 md:hidden">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search games, Robux, diamonds..."
                className="h-10 w-full rounded-xl border border-[#262836] bg-[#14151D] pl-10 pr-4 text-[13px] text-white placeholder-slate-500 outline-none focus:border-[#E3062F]"
              />
              {renderSearchResults()}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => scrollToSection('catalog', 'all')}
                className="rounded-xl border border-[#252735] bg-[#14151D] p-3 text-left hover:border-[#E3062F] hover:bg-[#1A1C27] transition cursor-pointer"
              >
                <span className="block text-[13px] font-bold text-white font-['Rajdhani']">
                  Direct Top-Up
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  All 4 Games
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLookup?.();
                }}
                className="rounded-xl border border-[#252735] bg-[#14151D] p-3 text-left hover:border-[#E3062F] hover:bg-[#1A1C27] transition cursor-pointer"
              >
                <span className="block text-[13px] font-bold text-white font-['Rajdhani']">
                  Track Order
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  Search by ID / Ref
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={openRegionPicker}
              className="mt-3 flex w-full items-center justify-between rounded-xl border border-[#252735] bg-[#14151D] p-3 text-left"
            >
              <span className="flex items-center gap-2.5 text-[12px] font-bold text-slate-200">
                <CountryFlag code={currentRegion?.countryCode || 'KH'} className="h-4 w-6 rounded-sm" />
                {currentRegion?.displayLabel || 'KH / KHR'}
              </span>
              <span className="text-[11px] font-bold text-[#E3062F]">Change</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
