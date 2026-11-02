import React, { useEffect, useState } from 'react';
import AdminDashboard from './components/AdminDashboard';
import Footer from './components/Footer';
import GameCatalog from './components/GameCatalog';
import GameDetailPage from './components/GameDetailPage';
import Hero from './components/Hero';
import Navbar from './components/Navbar';
import AliceSupportWidget from './components/AliceSupportWidget';
import OrderLookupModal from './components/OrderLookupModal';
import OrderReceiptModal from './components/OrderReceiptModal';
import RegionLangModal from './components/RegionLangModal';
import CasinoSpinWheelModal from './components/CasinoSpinWheelModal';
import { CASINO_CONFIG } from './data/casinoConfig';
import { findAuthorizedGame, syncGamesWithAdminConfig } from './data/games';
import {
  getStoredOrders,
  getStoredWalletBalance,
  saveNewOrder,
  saveWalletBalance,
} from './data/orderStore';
import { getStoredRegion, saveStoredRegion } from './data/regionStore';
import { fetchSoraGameWithPackages } from './data/soraStore';
import { useLenisSmoothScroll, scrollToTarget } from './hooks/useLenisSmoothScroll';
import { useScrollReveal } from './hooks/useScrollReveal';
import 'lenis/dist/lenis.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) return this.props.fallback || null;
    return this.props.children;
  }
}

export default function App() {
  useLenisSmoothScroll();

  const [walletBalance, setWalletBalanceState] = useState(() => getStoredWalletBalance());
  const [selectedGame, setSelectedGame] = useState(null);
  const [activeOrderReceipt, setActiveOrderReceipt] = useState(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [currentRegion, setCurrentRegion] = useState(() => getStoredRegion());
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [pastOrders, setPastOrders] = useState(() => getStoredOrders());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [siteConfig, setSiteConfig] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('yurigame_site_config_cache_v2');
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return null;
  });
  const [casinoSpinOrder, setCasinoSpinOrder] = useState(null);

  useEffect(() => {
    fetch('/api/site-config')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          setSiteConfig(data);
          try {
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('yurigame_site_config_cache_v2', JSON.stringify(data));
            }
          } catch {}
          if (Array.isArray(data.games)) {
            syncGamesWithAdminConfig(data.games);
          }
        }
      })
      .catch(() => {});
  }, []);
  const [isAdminView, setIsAdminView] = useState(() => {
    try {
      const path = window.location.pathname;
      return path.startsWith('/admin') || new URLSearchParams(window.location.search).has('admin') || new URLSearchParams(window.location.search).has('token');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleOrderEvent = (event) => {
      if (event.detail) {
        setPastOrders((orders) => [event.detail, ...orders.filter((order) => order.ref !== event.detail.ref)]);
      }
    };
    const handleWalletEvent = (event) => {
      if (typeof event.detail === 'number') setWalletBalanceState(event.detail);
    };
    const handleRegionEvent = (event) => {
      if (event.detail) setCurrentRegion(event.detail);
    };
    const handleOrdersSynced = (event) => {
      if (Array.isArray(event.detail)) setPastOrders(event.detail);
    };

    window.addEventListener('cheydev_new_order', handleOrderEvent);
    window.addEventListener('cheydev_orders_synced', handleOrdersSynced);
    window.addEventListener('cheydev_wallet_update', handleWalletEvent);
    window.addEventListener('cheydev_region_changed', handleRegionEvent);

    return () => {
      window.removeEventListener('cheydev_new_order', handleOrderEvent);
      window.removeEventListener('cheydev_orders_synced', handleOrdersSynced);
      window.removeEventListener('cheydev_wallet_update', handleWalletEvent);
      window.removeEventListener('cheydev_region_changed', handleRegionEvent);
    };
  }, []);

  const setWalletBalance = (updater) => {
    setWalletBalanceState((balance) => {
      const nextBalance = typeof updater === 'function' ? updater(balance) : updater;
      saveWalletBalance(nextBalance);
      return nextBalance;
    });
  };

  const handleSelectGame = (gameOrId) => {
    if (!gameOrId) return;

    let target = null;
    if (typeof gameOrId === 'string') {
      target = findAuthorizedGame(gameOrId);
    } else if (typeof gameOrId === 'object') {
      const lookupIds = [
        gameOrId.providerCode,
        gameOrId.code,
        gameOrId.slug,
        gameOrId.gameId,
        gameOrId.id,
      ].filter(Boolean);
      const base = lookupIds
        .map((identifier) => findAuthorizedGame(identifier))
        .find(Boolean);
      const hasPackages = Array.isArray(gameOrId.packages) && gameOrId.packages.length > 0;
      const hasFields = Array.isArray(gameOrId.fields) && gameOrId.fields.length > 0;

      // A complete provider response can stand on its own. Never borrow Roblox
      // details for an unrecognized card or provider identifier.
      if (!base && !hasPackages) {
        console.warn('Ignoring unknown game selection:', lookupIds[0] || gameOrId.name || 'unknown');
        return;
      }

      target = {
        ...(base || {}),
        ...gameOrId,
        image: gameOrId.image || base?.image || '',
        banner: gameOrId.banner || gameOrId.image || base?.banner || '',
        fields: hasFields ? gameOrId.fields : (base?.fields || []),
        packages: hasPackages ? gameOrId.packages : (base?.packages || []),
      };
    }

    if (!target) return;
    setSelectedGame(target);

    try {
      window.history.pushState({ page: 'game', gameId: target.providerCode || target.id }, '', `/game/${target.slug || target.providerCode || target.id}`);
    } catch {
      // History may be unavailable in embedded previews.
    }
    scrollToTarget(0, { immediate: true });
  };

  const handleBackToHome = () => {
    setSelectedGame(null);
    try {
      window.history.pushState({}, '', '/');
    } catch {
      // History may be unavailable in embedded previews.
    }
    scrollToTarget(0, { duration: 0.8 });
  };

  useEffect(() => {
    const handlePopState = (event) => {
      if (window.location.pathname.startsWith('/admin')) {
        setIsAdminView(true);
        return;
      }
      setIsAdminView(false);
      if (event.state?.gameId) {
        setSelectedGame(findAuthorizedGame(event.state.gameId));
      } else {
        setSelectedGame(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenAdmin = () => {
    setIsAdminView(true);
    try {
      window.history.pushState({ page: 'admin' }, '', '/admin');
    } catch {}
    scrollToTarget(0, { immediate: true });
  };

  useEffect(() => {
    let cancelled = false;

    try {
      const path = window.location.pathname;
      if (!path.includes('/game/')) return undefined;
      const rawId = decodeURIComponent(path.split('/game/')[1]?.split('?')[0]?.split('#')[0]?.replace(/\/$/, '') || '');
      if (!rawId) return undefined;

      // Map canonical slugs (roblox, mobile-legends, etc.) and sora-* identifiers to provider codes
      let providerCode = null;
      if (rawId.startsWith('sora-')) {
        providerCode = rawId.slice('sora-'.length);
      } else if (rawId === 'roblox' || rawId === 'robuxsend') {
        providerCode = 'robuxsend';
      } else if (rawId === 'mobile-legends' || rawId === 'ml' || rawId === 'mlbb') {
        providerCode = 'ml';
      } else if (rawId === 'free-fire' || rawId === 'ff') {
        providerCode = 'ff';
      } else if (rawId === 'ros-legacy' || rawId === 'roslegacy' || rawId === 'ros') {
        providerCode = 'roslegacy';
      }

      if (providerCode) {
        fetchSoraGameWithPackages(providerCode)
          .then((game) => {
            if (!cancelled) setSelectedGame(game);
          })
          .catch(() => {
            if (!cancelled) {
              const fallback = findAuthorizedGame(rawId);
              setSelectedGame(fallback || null);
            }
          });
        return () => {
          cancelled = true;
        };
      }

      const game = findAuthorizedGame(rawId);
      setSelectedGame(game || null);
    } catch {
      // Keep the storefront route if the URL cannot be read.
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const handleOrderComplete = (newOrder) => {
    setPastOrders(saveNewOrder(newOrder));
  };

  useScrollReveal([selectedGame, selectedCategory]);

  if (isAdminView) {
    return (
      <AdminDashboard
        onBackToStore={() => {
          setIsAdminView(false);
          try {
            window.history.pushState({}, '', '/');
          } catch {}
          scrollToTarget(0, { immediate: true });
        }}
      />
    );
  }

  return (
    <div className="yurigame-theme flex min-h-screen w-full flex-col bg-[#090a0e] text-slate-200 selection:bg-[#e3062f] selection:text-white">
      <Navbar
        onOpenLookup={() => setIsLookupOpen(true)}
        currentRegion={currentRegion}
        onOpenRegionModal={() => setIsRegionModalOpen(true)}
        onToggleRegion={() => setIsRegionModalOpen(true)}
        onGoHome={handleBackToHome}
        onSelectGame={handleSelectGame}
        onSelectCategory={setSelectedCategory}
      />

      {selectedGame ? (
        <ErrorBoundary
          fallback={(
            <div className="seagm-container py-16 text-center">
              <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h3 className="mb-2 text-lg font-bold text-slate-950">Game details unavailable</h3>
                <p className="mb-6 text-sm text-slate-500">This product could not load right now. Browse another top-up or try again.</p>
                <button type="button" onClick={handleBackToHome} className="rounded-xl border-0 bg-[#e3062f] px-5 py-2.5 font-bold text-white hover:bg-[#b80d2e]">
                  Return to storefront
                </button>
              </div>
            </div>
          )}
        >
          <GameDetailPage
            key={selectedGame.providerCode || selectedGame.id || selectedGame.slug}
            game={selectedGame}
            onBack={handleBackToHome}
            walletBalance={walletBalance}
            currentRegion={currentRegion}
            onOrderComplete={handleOrderComplete}
            onDeductWallet={(amount) => setWalletBalance((balance) => Math.max(0, balance - amount))}
          />
        </ErrorBoundary>
      ) : (
        <main>
          <Hero
            onSelectGame={handleSelectGame}
          />
          <GameCatalog
            onSelectGame={handleSelectGame}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />
        </main>
      )}

      <Footer contacts={siteConfig?.contacts} />
      <AliceSupportWidget
        onOpenLookup={() => setIsLookupOpen(true)}
        contacts={siteConfig?.contacts}
        hasBottomBar={Boolean(selectedGame)}
      />

      <ErrorBoundary>
        {isLookupOpen && (
          <OrderLookupModal
            pastOrders={pastOrders}
            currentRegion={currentRegion}
            onClose={() => setIsLookupOpen(false)}
            onViewReceipt={(order) => setActiveOrderReceipt(order)}
          />
        )}

        {activeOrderReceipt && (
          <OrderReceiptModal
            order={activeOrderReceipt}
            currentRegion={currentRegion}
            onClose={() => setActiveOrderReceipt(null)}
          />
        )}
        <RegionLangModal
          isOpen={isRegionModalOpen}
          onClose={() => setIsRegionModalOpen(false)}
          currentRegion={currentRegion}
          onSelectRegion={(region) => {
            setCurrentRegion(region);
            saveStoredRegion(region);
          }}
        />

        {/* VIP Casino Spin Wheel Modal (Disabled by default until launch) */}
        {CASINO_CONFIG.enabled && casinoSpinOrder && (
          <CasinoSpinWheelModal
            isOpen={!!casinoSpinOrder}
            onClose={() => setCasinoSpinOrder(null)}
            purchasedQty={casinoSpinOrder.qty || 50}
            currencyName={casinoSpinOrder.currency || 'Diamonds'}
            gameName={casinoSpinOrder.gameName || 'Mobile Legends KH'}
            bankedProfitUsd={siteConfig?.casino_vault_profit || 0}
          />
        )}
      </ErrorBoundary>
    </div>
  );
}
