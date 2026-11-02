import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Cloud,
  Flame,
  Loader2,
  RefreshCw,
  Search,
  Zap,
} from 'lucide-react';
import {
  FALLBACK_FOUR_GAMES,
  fetchSoraCatalogue,
  fetchSoraGameWithPackages,
  getCachedCatalogue,
  isSoraGame,
  mapSoraGame,
} from '../data/soraStore';

const CATEGORIES = [
  { id: 'all', label: 'All games' },
];
const INITIAL_VISIBLE_COUNT = 24;
const getInitialGames = () => {
  const cached = getCachedCatalogue();
  if (cached?.games?.length) return cached.games;
  return FALLBACK_FOUR_GAMES.map(mapSoraGame).filter(Boolean);
};
const INITIAL_FOUR_GAMES = getInitialGames();

function getStartingPrice(game) {
  const prices = (game.packages || []).map((item) => Number(item.price)).filter(Number.isFinite);
  return prices.length ? Math.min(...prices) : 0;
}

export default function GameCatalog({
  onSelectGame,
  selectedCategory: externalCategory,
  setSelectedCategory: setExternalCategory,
}) {
  const [internalCategory, setInternalCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ key: 'all:', count: INITIAL_VISIBLE_COUNT });
  const [providerGames, setProviderGames] = useState(() => getInitialGames());
  const [providerCount, setProviderCount] = useState(() => {
    const cached = getCachedCatalogue();
    return cached?.count || INITIAL_FOUR_GAMES.length;
  });
  const [providerState, setProviderState] = useState('ready');
  const [providerError, setProviderError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [openingGameCode, setOpeningGameCode] = useState('');
  const selectedCategory = externalCategory ?? internalCategory;
  const setSelectedCategory = setExternalCategory || setInternalCategory;

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    fetchSoraCatalogue({ signal: controller.signal })
      .then((catalogue) => {
        if (!active) return;
        if (Array.isArray(catalogue.games) && catalogue.games.length > 0) {
          setProviderGames((current) => {
            const isSame =
              current.length === catalogue.games.length &&
              current.every(
                (g, i) =>
                  g.id === catalogue.games[i]?.id &&
                  g.image === catalogue.games[i]?.image &&
                  g.name === catalogue.games[i]?.name &&
                  g.stockOpen === catalogue.games[i]?.stockOpen
              );
            return isSame ? current : catalogue.games;
          });
          setProviderCount(catalogue.count || catalogue.games.length);
          setProviderState('ready');
          setProviderError('');
        }
      })
      .catch((error) => {
        if (!active) return;
        console.warn('Catalogue sync check:', error?.message);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken]);

  const availableGames = useMemo(() => providerGames, [providerGames]);

  const filteredGames = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return availableGames.filter((game) => {
      const categoryMatches =
        selectedCategory === 'all' ||
        (selectedCategory === 'popular' && game.category === 'popular') ||
        game.category === selectedCategory;
      const searchMatches =
        !query ||
        game.name.toLowerCase().includes(query) ||
        game.publisher?.toLowerCase().includes(query) ||
        game.currency?.toLowerCase().includes(query) ||
        game.description?.toLowerCase().includes(query);
      return categoryMatches && searchMatches;
    });
  }, [availableGames, searchQuery, selectedCategory]);

  const filterKey = `${selectedCategory}:${searchQuery.trim().toLowerCase()}`;
  const visibleCount = pagination.key === filterKey ? pagination.count : INITIAL_VISIBLE_COUNT;
  const visibleGames = filteredGames.slice(0, visibleCount);

  const selectCategory = (category) => {
    setSelectedCategory(category);
  };

  const openGame = async (game) => {
    if (game.stockOpen === false) {
      setProviderError(`${game.name} is currently out of stock. Please check back later!`);
      return;
    }

    if (!isSoraGame(game)) {
      onSelectGame?.(game);
      return;
    }

    if (openingGameCode) return;
    setOpeningGameCode(game.providerCode);
    setProviderError('');
    try {
      const liveGame = await fetchSoraGameWithPackages(game.providerCode);
      onSelectGame?.(liveGame);
    } catch (error) {
      setProviderError(error.message || 'Could not load live package prices.');
    } finally {
      setOpeningGameCode('');
    }
  };

  return (
    <section id="catalog" className="scroll-mt-24 border-y border-slate-800/80 bg-[#0d0e14] py-6 sm:py-9">
      <div className="seagm-container">
        {/* Section Header with Featured Badge */}
        <div className="mb-4 sm:mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between sm:justify-start gap-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#E3062F] to-[#FF4D6D] text-white shadow-[0_4px_14px_rgba(227,6,47,0.4)]">
                <Flame size={17} className="fill-white" />
              </span>
              <h2 className="m-0 text-base sm:text-xl font-black uppercase tracking-tight text-white font-['Rajdhani'] flex items-center gap-1.5">
                Featured <span className="text-[#E3062F]">Games</span>
              </h2>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700/80 text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-200 shadow-sm">
              <span className="text-[#E3062F] font-black">{visibleGames.length}</span> GAMES
              <ArrowRight size={12} className="text-[#E3062F]" />
            </span>
          </div>

          <label className="relative block w-full sm:w-[280px]">
            <span className="sr-only">Search products</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search Roblox, MLBB, Free Fire, RoS..."
              className="h-9 w-full rounded-xl border border-slate-700/60 bg-slate-900/80 pl-9 pr-3 text-[12px] text-slate-100 outline-none focus:border-[#e3062f] transition-colors"
            />
          </label>
        </div>

        {providerError && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#e3062f]/30 bg-[#2a1018] px-3.5 py-2.5 text-[11px] text-[#ff8299]">
            <span>{providerError}</span>
            {providerState === 'error' && (
              <button
                type="button"
                onClick={() => {
                  setProviderState('loading');
                  setProviderError('');
                  setReloadToken((token) => token + 1);
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#e3062f]/35 bg-[#e3062f] px-2.5 py-1.5 font-bold text-white hover:bg-[#ff234c]"
              >
                <RefreshCw size={11} /> Retry
              </button>
            )}
          </div>
        )}

        <div className="no-scrollbar mb-4 flex gap-5 overflow-x-auto border-b border-slate-800/70">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => selectCategory(category.id)}
              aria-pressed={selectedCategory === category.id}
              className={`shrink-0 border-0 border-b-2 bg-transparent px-0 pb-2 text-[11px] font-bold sm:text-[12px] ${selectedCategory === category.id
                  ? 'border-[#e3062f] text-[#ff5575]'
                  : 'border-transparent text-slate-500 hover:text-slate-100'
                }`}
            >
              {category.label}
            </button>
          ))}
          <span className="ml-auto hidden pb-2 text-[10px] text-slate-400 sm:block">
            {filteredGames.length.toLocaleString()} authorized products
          </span>
        </div>

        {visibleGames.length ? (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-3.5">
            {visibleGames.map((game) => {
              const isLive = isSoraGame(game);
              const isOpening = openingGameCode === game.providerCode;
              const startingPrice = getStartingPrice(game);

              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => openGame(game)}
                  disabled={Boolean(openingGameCode)}
                  className="group relative flex flex-col justify-between rounded-xl sm:rounded-2xl bg-gradient-to-b from-[#181926]/90 to-[#0e0f16]/95 p-1.5 sm:p-2.5 border border-slate-800/90 hover:border-[#E3062F]/60 transition-all duration-300 shadow-md hover:shadow-[0_10px_25px_rgba(227,6,47,0.25)] hover:-translate-y-0.5 text-left cursor-pointer disabled:cursor-wait disabled:opacity-70"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg sm:rounded-xl border border-slate-700/50 bg-[#12131C] shadow-inner">
                    <img
                      src={game.image}
                      alt={game.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        const fallback =
                          game.providerCode === 'robuxsend' ? '/assets/games/current_roblox.jpg' :
                          game.providerCode === 'ff' ? '/assets/games/current_free-fire.jpg' :
                          game.providerCode === 'roslegacy' ? '/assets/games/current_ros-legacy.jpg' :
                          '/assets/games/current_mobile-legends.jpg';
                        event.currentTarget.src = fallback;
                      }}
                    />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-6 sm:h-10 bg-gradient-to-t from-black/65 to-transparent" />
                    <span
                      className={`absolute left-1 top-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[7px] sm:text-[8px] font-black uppercase tracking-wider backdrop-blur-sm ${
                        game.stockOpen !== false
                          ? 'border-emerald-500/40 bg-black/85 text-emerald-300'
                          : 'border-rose-500/50 bg-black/85 text-rose-300'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          game.stockOpen !== false
                            ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                            : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]'
                        }`}
                      />
                      {game.stockOpen !== false ? 'In Stock' : 'Out of Stock'}
                    </span>
                    {isOpening && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/80 text-[8px] sm:text-[10px] font-bold text-white backdrop-blur-xs">
                        <Loader2 size={13} className="mr-1 animate-spin text-[#ff3156]" /> Loading
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 sm:mt-2 flex flex-col flex-1 justify-between w-full">
                    <div>
                      <span className="block truncate text-center text-[10px] sm:text-[13.5px] font-black text-white group-hover:text-[#ff4d6d] transition-colors leading-tight">
                        {game.name}
                      </span>
                      <span className="mt-0.5 block truncate text-center text-[8.5px] sm:text-[11px] text-slate-400 font-medium">
                        {game.publisher}
                      </span>
                    </div>

                    {/* Action Button: TOP UP or OUT OF STOCK */}
                    <div className="mt-1.5 sm:mt-2.5 w-full">
                      <span
                        className={`w-full inline-flex items-center justify-center gap-1 py-1 sm:py-1.5 px-1 rounded-full text-white text-[9px] sm:text-[11.5px] font-black uppercase tracking-wider transition-all ${
                          game.stockOpen !== false
                            ? 'bg-gradient-to-r from-[#e3062f] via-[#ff1e4a] to-[#ff4969] shadow-[0_3px_10px_rgba(227,6,47,0.35)] group-hover:shadow-[0_6px_20px_rgba(227,6,47,0.55)] group-hover:scale-[1.02]'
                            : 'bg-slate-800 text-slate-400 border border-slate-700/80'
                        }`}
                      >
                        {game.stockOpen !== false ? (
                          <>
                            <Zap size={10} className="fill-white" />
                            TOP UP
                          </>
                        ) : (
                          'OUT OF STOCK'
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-5 py-10 text-center">
            <h3 className="m-0 text-[14px] font-bold text-slate-100">No products found</h3>
            <p className="m-0 mt-1 text-[11px] text-slate-400">Try a different title or category.</p>
          </div>
        )}

        {visibleCount < filteredGames.length && (
          <div className="mt-7 flex justify-center">
            <button
              type="button"
              onClick={() => setPagination({ key: filterKey, count: visibleCount + LOAD_MORE_COUNT })}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-[11px] font-bold text-slate-700 hover:border-[#e3062f] hover:text-[#ff5575]"
            >
              Load more games
              <ChevronDown size={14} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
