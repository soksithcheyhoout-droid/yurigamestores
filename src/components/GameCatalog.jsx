import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Cloud, Loader2, RefreshCw, Search } from 'lucide-react';
import {
  FALLBACK_FOUR_GAMES,
  fetchSoraCatalogue,
  fetchSoraGameWithPackages,
  isSoraGame,
  mapSoraGame,
} from '../data/soraStore';

const CATEGORIES = [
  { id: 'all', label: 'All games' },
];
const INITIAL_VISIBLE_COUNT = 24;
const INITIAL_FOUR_GAMES = FALLBACK_FOUR_GAMES.map(mapSoraGame).filter(Boolean);

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
  const [providerGames, setProviderGames] = useState(INITIAL_FOUR_GAMES);
  const [providerCount, setProviderCount] = useState(INITIAL_FOUR_GAMES.length);
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
          setProviderGames(catalogue.games);
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
    <section id="catalog" className="scroll-mt-24 border-y border-slate-200 bg-white py-8 sm:py-10">
      <div className="seagm-container">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 text-[11px] text-slate-400 sm:text-[12px] font-medium">
            Four carefully selected games with current packages and secure player checks.
          </p>
          <label className="relative block w-full sm:w-[280px]">
            <span className="sr-only">Search products</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search Roblox, MLBB, Free Fire, RoS..."
              className="h-9 w-full rounded-xl border border-slate-700/60 bg-slate-900/60 pl-9 pr-3 text-[12px] text-slate-100 outline-none focus:border-[#e3062f] transition-colors"
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

        <div className="no-scrollbar mb-5 flex gap-5 overflow-x-auto border-b border-slate-200">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => selectCategory(category.id)}
              aria-pressed={selectedCategory === category.id}
              className={`shrink-0 border-0 border-b-2 bg-transparent px-0 pb-2.5 text-[11px] font-bold sm:text-[12px] ${selectedCategory === category.id
                  ? 'border-[#e3062f] text-[#ff5575]'
                  : 'border-transparent text-slate-500 hover:text-slate-100'
                }`}
            >
              {category.label}
            </button>
          ))}
          <span className="ml-auto hidden pb-2.5 text-[10px] text-slate-400 sm:block">
            {filteredGames.length.toLocaleString()} products
          </span>
        </div>

        {visibleGames.length ? (
          <div className="flex flex-wrap gap-3.5 sm:gap-4.5">
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
                  className="group w-[calc(50%-7px)] sm:w-[150px] md:w-[165px] lg:w-[172px] shrink-0 border-0 bg-transparent p-0 text-left cursor-pointer transition-all disabled:cursor-wait disabled:opacity-70"
                >
                  <span className="relative block aspect-square w-full overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:border-[#e3062f]/60 group-hover:shadow-[0_12px_24px_rgba(227,6,47,0.22)]">
                    <img
                      src={game.image}
                      alt={game.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = '/assets/games/mlbb_tile_4k.jpg';
                      }}
                    />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/55 to-transparent" />
                    {isLive && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/75 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] text-white backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#ff1748] shadow-[0_0_6px_rgba(255,23,72,0.9)]" /> Live
                      </span>
                    )}
                    {isOpening && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/75 text-[10px] font-bold text-white backdrop-blur-xs">
                        <Loader2 size={15} className="mr-1.5 animate-spin text-[#ff3156]" /> Loading
                      </span>
                    )}
                  </span>
                  <span className="block pt-2">
                    <span className="block truncate text-[12px] font-extrabold text-slate-100 group-hover:text-[#ff5575] sm:text-[13px] transition-colors">
                      {game.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-slate-400 font-medium sm:text-[11px]">
                      {game.publisher}
                    </span>
                    <span className="mt-1 flex items-baseline gap-1 text-[10px] text-slate-400">
                      {isLive ? (
                        <strong className="text-[11px] font-extrabold text-[#ff5575]">View live prices</strong>
                      ) : (
                        <>From <strong className="text-[12px] font-extrabold text-slate-200 sm:text-[13px]">${startingPrice.toFixed(2)}</strong></>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
            <h3 className="m-0 text-[14px] font-bold text-slate-900">No products found</h3>
            <p className="m-0 mt-1 text-[11px] text-slate-500">Try a different title or category.</p>
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
