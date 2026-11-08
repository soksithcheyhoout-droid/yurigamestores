import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  PhoneCall,
  Sliders,
  Image as ImageIcon,
  Power,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  Save,
  ArrowLeft,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  Search,
  ExternalLink,
  Send,
  AlertCircle,
  UploadCloud,
  Smartphone,
  Users,
  User,
  HelpCircle,
  Gem,
  Flame,
  X,
  Check,
  BarChart3,
  DollarSign,
  TrendingUp,
  CalendarDays,
  ShoppingCart,
  Activity
} from 'lucide-react';
import YuriGameLogo, { DEFAULT_SITE_LOGO, getSiteLogo, setSiteLogo, isValidLogoUrl } from './YuriGameLogo';
import AdminAnalyticsPanel from './AdminAnalyticsPanel';
import ImageUploadPicker, {
  compressImageFile,
  removeImageBackground,
  processLogoFileWithAutoCut,
} from './ImageUploadPicker';
import { syncGamesWithAdminConfig } from '../data/games';
import { formatPrice } from '../data/regionStore';

const LEGACY_PLACEHOLDER_ASSETS = new Set([
  '/assets/games/current_roblox.jpg',
  '/assets/games/current_mobile-legends.jpg',
  '/assets/games/current_free-fire.jpg',
  '/assets/games/current_ros-legacy.jpg',
  '/assets/brand/yurigame-logo.webp',
]);

function getFallbackGameTile(gameOrCode) {
  const code = String(
    typeof gameOrCode === 'object' && gameOrCode !== null
      ? (gameOrCode.providerCode || gameOrCode.id || gameOrCode.slug || gameOrCode.code || '')
      : (gameOrCode || '')
  ).toLowerCase();
  const nameLower = String(typeof gameOrCode === 'object' ? gameOrCode?.name || '' : '').toLowerCase();
  if (code === 'robuxsend' || code.includes('roblox')) return '/assets/games/roblox_kh.png';
  if (code === 'ff' || code.includes('free-fire')) return '/assets/games/ff_kh.png';
  if (code === 'rosangkor' || code.includes('angkor') || nameLower.includes('angkor')) return '/assets/games/ros_angkor.png';
  if (code === 'roslegacy' || code.includes('ros')) return '/assets/games/ros_legacy_kh.webp';
  if (code === 'ml' || code.includes('mobile-legends')) return '/assets/games/ml_kh.png';
  return DEFAULT_SITE_LOGO;
}

function getSafeAdminGameImage(game) {
  const fallback = getFallbackGameTile(game);
  const raw = typeof game?.image === 'object' && game?.image !== null
    ? String(game.image.url || game.image.src || '').trim()
    : String(game?.image || '').trim();
  if (
    !isValidLogoUrl(raw) ||
    raw.startsWith('/assets/uploads/') ||
    LEGACY_PLACEHOLDER_ASSETS.has(raw)
  ) {
    return fallback;
  }
  const code = String(game?.providerCode || game?.id || game?.slug || game?.code || '').toLowerCase();
  if (code && code !== 'ml' && !code.includes('mobile-legends')) {
    const lower = raw.toLowerCase();
    if (lower.includes('ml_kh') || lower.includes('mlbb') || lower.includes('mobile-legends')) {
      return fallback;
    }
  }
  return raw;
}

function getFallbackBanner(slugOrCode) {
  const s = String(slugOrCode || '').toLowerCase();
  if (s.includes('roblox') || s === 'robuxsend') return '/assets/games/roblox_hero_4k.jpg';
  if (s.includes('free-fire') || s === 'ff') return '/assets/banners/banner_freefire.jpg';
  if (s.includes('angkor') || s === 'rosangkor') return '/assets/games/ros_angkor.png';
  if (s.includes('ros')) return '/assets/games/ros_legacy_kh.webp';
  return '/assets/banners/banner_mlbb.jpg';
}

export default function AdminDashboard({ onBackToStore }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginStep, setLoginStep] = useState('REQUEST'); // 'REQUEST' | 'OTP'
  const [challengeId, setChallengeId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState('analytics'); // analytics, products, orders, contacts, banners, stock, telegram

  // "Add Game from Bay2Game" picker state
  const [showAddGame, setShowAddGame] = useState(false);
  const [providerCatalog, setProviderCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [importingCode, setImportingCode] = useState('');

  // "Add Coming Soon Game" state
  const [showAddComingSoon, setShowAddComingSoon] = useState(false);
  const [comingSoonName, setComingSoonName] = useState('');
  const [comingSoonImage, setComingSoonImage] = useState('');
  const [addingComingSoon, setAddingComingSoon] = useState(false);

  // Master Data
  const [config, setConfig] = useState(null);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('day');
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const analyticsRequestRef = useRef({ id: 0, controller: null });
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Selected Game for Products Tab
  const [selectedGameId, setSelectedGameId] = useState('robuxsend');

  // Order Filters
  const [orderFilter, setOrderFilter] = useState('all'); // 'all', 'PROCESSING', 'COMPLETED', 'CANCELLED'
  const [orderSearch, setOrderSearch] = useState('');

  // Modals for editing/adding
  const [editingPackage, setEditingPackage] = useState(null);
  const [isAddingPackage, setIsAddingPackage] = useState(false);
  const [packageFormData, setPackageFormData] = useState({
    name: '',
    providerCode: '',
    diamonds: 100,
    price: 1.0,
    bonus: '',
    popular: false,
    inStock: true,
    image: ''
  });

  // MLBB Event Modal
  const [editingMlbbEvent, setEditingMlbbEvent] = useState(null);
  const [isAddingMlbbEvent, setIsAddingMlbbEvent] = useState(false);
  const [mlbbEventFormData, setMlbbEventFormData] = useState({
    name: '',
    badge: 'Special Event',
    banner: '/assets/games/mlbb_hero_4k.jpg',
    description: '',
    isOpen: true
  });

  // MLBB Event Package Modal
  const [editingEventPkg, setEditingEventPkg] = useState(null);
  const [isAddingEventPkg, setIsAddingEventPkg] = useState(false);
  const [targetEventId, setTargetEventId] = useState(null);
  const [eventPkgFormData, setEventPkgFormData] = useState({
    name: '',
    providerCode: '',
    diamonds: 100,
    price: 1.0,
    bonus: '',
    popular: true,
    inStock: true,
    image: '/assets/games/mlbb_tile_4k.jpg'
  });
  const [liveProviderPackages, setLiveProviderPackages] = useState([]);
  const [isLoadingLivePackages, setIsLoadingLivePackages] = useState(false);
  const [liveProviderError, setLiveProviderError] = useState('');
  const [isSyncingSora, setIsSyncingSora] = useState(false);

  // Slide Banner Modal
  const [editingBanner, setEditingBanner] = useState(null);
  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [bannerFormData, setBannerFormData] = useState({
    title: '',
    subtitle: '',
    actionLabel: 'Shop Now',
    image: '',
    gameSlug: 'mobile-legends',
    active: true
  });

  // Contacts & Telegram Form
  const [contactsData, setContactsData] = useState({
    siteLogo: getSiteLogo(),
    telegramUrl: '',
    telegramUsername: '',
    facebookUrl: '',
    supportPhone: '',
    supportHours: '',
    announcement: '',
    telegramAdmin1Id: '6805487598',
    telegramAdmin1Name: '@Yur1Uchiha',
    telegramAdmin2Id: '7283817695',
    telegramAdmin2Name: '@kaixite',
    telegramGroupId: '-1004493408552'
  });
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);

  // Website Brand Logo & Auto-Cut Background Controls
  const [siteLogoState, setSiteLogoState] = useState(() => getSiteLogo());
  const [originalSiteLogo, setOriginalSiteLogo] = useState(null);
  const [siteLogoUrlInput, setSiteLogoUrlInput] = useState('');
  const [isProcessingSiteLogo, setIsProcessingSiteLogo] = useState(false);
  const [autoCutLogoBg, setAutoCutLogoBg] = useState(true);
  const [logoBgColorMode, setLogoBgColorMode] = useState('auto'); // 'auto' | 'white' | 'black' | 'custom'
  const [logoCustomBgHex, setLogoCustomBgHex] = useState('#ffffff');
  const [logoCutInner, setLogoCutInner] = useState(false);
  const [logoTolerance, setLogoTolerance] = useState(48);

  useEffect(() => {
    const syncLogoState = () => {
      const current = getSiteLogo();
      if (isValidLogoUrl(current)) {
        setSiteLogoState(current);
      }
    };
    window.addEventListener('yurigame_site_logo_changed', syncLogoState);
    window.addEventListener('yurigame_site_config_updated', syncLogoState);
    return () => {
      window.removeEventListener('yurigame_site_logo_changed', syncLogoState);
      window.removeEventListener('yurigame_site_config_updated', syncLogoState);
    };
  }, []);

  const resolveLogoTargetColor = () => (logoBgColorMode === 'custom' ? logoCustomBgHex : logoBgColorMode);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Professional in-app confirm dialog (replaces ugly native window.confirm).
  const [confirmState, setConfirmState] = useState(null);
  const confirmAction = (opts) => new Promise((resolve) => setConfirmState({ ...opts, resolve }));
  const closeConfirm = (result) => setConfirmState((s) => { if (s && s.resolve) s.resolve(result); return null; });

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
  });

  const isSoraSupportedGame = (gameId) => {
    const clean = String(gameId || '').toLowerCase();
    return clean === 'ml' || clean === 'mobile-legends' || clean === 'ff' || clean === 'free-fire' || clean === 'freefire';
  };

  const isRegularPackageModalOpen = isAddingPackage || Boolean(editingPackage);
  const isEventPackageModalOpen = isAddingEventPkg || Boolean(editingEventPkg);

  useEffect(() => {
    const providerGameId = isEventPackageModalOpen ? 'ml' : selectedGameId;
    const shouldLoad = Boolean(providerGameId)
      && isSoraSupportedGame(providerGameId)
      && (isRegularPackageModalOpen || isEventPackageModalOpen);

    if (!shouldLoad) {
      setLiveProviderPackages([]);
      setLiveProviderError('');
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    setIsLoadingLivePackages(true);
    setLiveProviderError('');

    fetch(`/api/admin/soratopup/packages/${providerGameId}`, {
      headers: getAuthHeaders(),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Could not load SoraTopup Live products.');
        }
        if (active) setLiveProviderPackages(data.packages || []);
      })
      .catch((error) => {
        if (active && error.name !== 'AbortError') {
          setLiveProviderPackages([]);
          setLiveProviderError(error.message || 'Could not load SoraTopup Live products.');
        }
      })
      .finally(() => {
        if (active) setIsLoadingLivePackages(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isRegularPackageModalOpen, isEventPackageModalOpen, selectedGameId]);

  const applyLiveProviderPackage = (providerCode, isEventPackage = false) => {
    const livePackage = liveProviderPackages.find((pkg) => pkg.providerCode === providerCode);
    const setFormData = isEventPackage ? setEventPkgFormData : setPackageFormData;

    setFormData((current) => {
      if (!livePackage) return { ...current, providerCode };
      const numericCode = /^\d+$/.test(livePackage.providerCode)
        ? Number(livePackage.providerCode)
        : null;
      const friendlyName = String(livePackage.name || livePackage.providerCode)
        .replace(/\bDM\b/gi, 'Diamonds')
        .replace(/^W[.]Pass$/i, 'Weekly Diamond Pass')
        .replace(/^W[.]Elite$/i, 'Weekly Elite')
        .replace(/^M[.]Epic$/i, 'Monthly Epic');

      return {
        ...current,
        providerCode: livePackage.providerCode,
        name: current.name.trim() ? current.name : friendlyName,
        diamonds: numericCode || current.diamonds,
        price: Number(livePackage.price),
      };
    });
  };

  // 1. Exchange a one-time Telegram link or verify the HttpOnly session cookie.
  useEffect(() => {
    sessionStorage.removeItem('yurigame_admin_token');
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      try {
        window.history.replaceState({}, '', '/admin');
      } catch { }
      verifyOneClickToken(token);
    } else {
      verifyExistingSession();
    }
  }, []);

  // Timer countdown for Telegram OTP
  useEffect(() => {
    if (!isAuthenticated && loginStep === 'OTP') {
      const interval = setInterval(() => {
        setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loginStep]);

  // Server verification of the bound HttpOnly session.
  const verifyExistingSession = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/auth/session', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success && data.authenticated) {
        setIsAuthenticated(true);
        fetchFullConfig();
        fetchOrders();
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Exchange the short-lived, single-use Telegram link for an HttpOnly session.
  const verifyOneClickToken = async (token) => {
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      let data = null;
      try { data = await res.json(); } catch { }

      if (res.ok && data?.success && data?.authenticated) {
        setIsAuthenticated(true);
        fetchFullConfig();
        fetchOrders();
      } else if (data?.error) {
        setAuthError(data.error);
      } else if (res.status === 502 || res.status === 503) {
        setAuthError('Server is temporarily reloading. Please retry in a few seconds.');
      } else {
        setAuthError('One-click link is invalid, expired, or already used. Send /admin to the Telegram bot for a new link.');
      }
    } catch {
      setAuthError('Connection error verifying the one-click Telegram link.');
    } finally {
      setIsLoggingIn(false);
      setIsLoading(false);
    }
  };

  // Step 1: request a Telegram possession challenge; no reusable PIN is sent.
  const handleRequestOtp = async (e) => {
    e?.preventDefault();
    if (isLoggingIn) return;

    setIsLoggingIn(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/auth/login-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      let data = null;
      try {
        data = await res.json();
      } catch {
        // response was not JSON (e.g. 502 Bad Gateway HTML from proxy during reload)
      }

      if (res.ok && data?.success && data?.requireOtp) {
        setChallengeId(data.challengeId);
        setLoginStep('OTP');
        setOtpCode('');
        setOtpTimer(data.expiresInSeconds || 300);
        setResendCooldown(45);
        showToast('Verification code dispatched to Telegram admins');
      } else if (data?.error) {
        setAuthError(data.error);
      } else if (res.status === 502 || res.status === 503) {
        setAuthError('Authentication server is restarting or busy. Please wait 5 seconds and retry.');
      } else if (res.status === 504) {
        setAuthError('Server connection timed out. Please try again.');
      } else if (res.status === 429) {
        setAuthError('Too many attempts. Please wait a moment before trying again.');
      } else {
        setAuthError(`Authentication failed (${res.status || 'Offline'}). Please retry.`);
      }
    } catch {
      setAuthError(
        typeof navigator !== 'undefined' && navigator.onLine === false
          ? 'You appear to be offline. Check your internet connection.'
          : 'Unable to connect to authentication server. Please check your connection or wait a moment.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 2FA Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (!otpCode || isLoggingIn || !challengeId) return;

    setIsLoggingIn(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, otp: otpCode })
      });
      let data = null;
      try { data = await res.json(); } catch { }

      if (res.ok && data?.success && data?.authenticated) {
        setIsAuthenticated(true);
        setOtpCode('');
        setChallengeId('');
        fetchFullConfig();
        fetchOrders();
        showToast('Welcome back, Admin!');
      } else if (data?.error) {
        setAuthError(data.error);
      } else if (res.status === 502 || res.status === 503) {
        setAuthError('Server is temporarily reloading. Please retry in a few seconds.');
      } else {
        setAuthError('Invalid or expired verification code.');
      }
    } catch {
      setAuthError('Connection error verifying verification code. Please retry.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 2FA Step 3: Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoggingIn || !challengeId) return;
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId })
      });
      const data = await res.json();
      if (data.success) {
        setResendCooldown(45);
        setOtpTimer(300);
        showToast('A new 6-digit code was sent to Telegram');
      } else {
        setAuthError(data.error || 'Could not resend verification code.');
      }
    } catch {
      setAuthError('Connection error resending verification code.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Cache synchronization helper so storefront displays updated logos and banners on initial paint
  const updateClientCaches = (configData) => {
    if (!configData || typeof window === 'undefined') return;
    try {
      const candidateSiteLogo =
        configData.siteLogo ||
        configData.contacts?.siteLogo ||
        getSiteLogo();
      const resolvedSiteLogo = isValidLogoUrl(candidateSiteLogo)
        ? candidateSiteLogo
        : DEFAULT_SITE_LOGO;

      setSiteLogo(resolvedSiteLogo);
      setSiteLogoState(resolvedSiteLogo);

      if (Array.isArray(configData.games) && configData.games.length > 0) {
        syncGamesWithAdminConfig(configData.games);
      }

      // 1. Site config cache
      const siteConfigPayload = {
        success: true,
        siteLogo: resolvedSiteLogo,
        games: configData.games || [],
        banners: (configData.banners || []).filter((b) => b.active !== false),
        contacts: {
          ...(configData.contacts || {}),
          siteLogo: resolvedSiteLogo,
        },
        comingSoonGames: configData.comingSoonGames || [],
      };
      window.localStorage.setItem('yurigame_site_config_cache_v3', JSON.stringify(siteConfigPayload));

      // 2. Hero slides cache (homepage carousel renders updated slides on refresh)
      if (Array.isArray(configData.banners)) {
        const activeBanners = configData.banners.filter((b) => b.active !== false);
        if (activeBanners.length > 0) {
          const mappedSlides = activeBanners.map((b) => {
            const safeFallback = getFallbackBanner(b.gameSlug || b.title);
            const rawImg = isValidLogoUrl(b.image) && !String(b.image).startsWith('/assets/uploads/') && !LEGACY_PLACEHOLDER_ASSETS.has(String(b.image).trim())
              ? b.image
              : safeFallback;
            return {
              id: b.id,
              image: rawImg,
              fallbackImage: safeFallback,
              title: b.title,
              actionLabel: b.actionLabel || 'Shop now',
              providerCode:
                b.gameSlug === 'roblox' ? 'robuxsend' :
                  b.gameSlug === 'mobile-legends' ? 'ml' :
                    b.gameSlug === 'free-fire' ? 'ff' :
                      b.gameSlug === 'rosangkor' ? 'rosangkor' : 'roslegacy',
              position: 'center',
            };
          });
          window.localStorage.setItem('yurigame_hero_slides_v3', JSON.stringify(mappedSlides));
        }
      }

      // 3. Catalogue cache (game grid renders updated logo images on refresh without glitch)
      if (Array.isArray(configData.games) && configData.games.length > 0) {
        const mappedGames = configData.games.map((g) => {
          const code = g.providerCode || g.id || g.code;
          const validImg = getSafeAdminGameImage(g);
          const fallbackBan = getFallbackBanner(code);
          const validBan = isValidLogoUrl(g.banner) && !String(g.banner).startsWith('/assets/uploads/') && !LEGACY_PLACEHOLDER_ASSETS.has(String(g.banner).trim())
            ? g.banner
            : fallbackBan;
          return {
            id: `sora_${code}`,
            slug: g.slug || (
              code === 'robuxsend' ? 'roblox' :
                code === 'ml' ? 'mobile-legends' :
                  code === 'ff' ? 'free-fire' :
                    code === 'rosangkor' ? 'rosangkor' : 'ros-legacy'
            ),
            provider: 'soratopup',
            providerCode: code,
            orderingEnabled: true,
            verificationMode: g.verificationMode || (code === 'robuxsend' ? 'official' : code === 'rosangkor' ? 'live' : 'none'),
            name: g.name,
            publisher:
              g.publisher ||
              (code === 'robuxsend' ? 'Roblox Corp' :
                code === 'rosangkor' ? 'RoS Angkor' :
                  code === 'roslegacy' ? 'RoS Legacy' :
                    code === 'ml' ? 'Moonton' :
                      code === 'ff' ? 'Garena' : 'Official Publisher'),
            category: 'popular',
            badge: g.badge || (code === 'robuxsend' ? 'Instant Robux' : 'Official Top-Up'),
            image: validImg,
            banner: validBan,
            description: g.description || '',
            currency: code === 'robuxsend' ? 'Robux' : 'Diamonds',
            needServer: Boolean(g.needServer),
            fields: g.fields || [],
            packages: g.packages || [],
            stockOpen: g.stockOpen !== false,
            maintenance: g.maintenance === true,
            rating: 'Live',
            sales: 'API',
          };
        });
        window.localStorage.setItem('yurigame_catalogue_cache_v3', JSON.stringify({
          games: mappedGames,
          count: mappedGames.length,
          fetchedAt: new Date().toISOString(),
          isFallback: false,
        }));
      }

      window.dispatchEvent(new CustomEvent('yurigame_site_config_updated', {
        detail: siteConfigPayload,
      }));
    } catch (e) {
      console.warn('Cache update warning:', e);
    }
  };

  // 2. Load Full Configuration
  const fetchFullConfig = async (explicitToken) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/config', {
        headers: getAuthHeaders(explicitToken),
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
        setContactsData(data.config.contacts || {});
        updateClientCaches(data.config);
      } else if (res.status === 401) {
        handleLogout('Admin session expired (30 minutes limit). Please log in again.');
      }
    } catch (err) {
      console.error('Failed to load admin config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Load Orders for live approvals
  const fetchOrders = async (explicitToken) => {
    try {
      const res = await fetch('/api/admin/orders', {
        headers: getAuthHeaders(explicitToken)
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      } else if (res.status === 401) {
        handleLogout('Admin session expired (30 minutes limit). Please log in again.');
      }
    } catch (err) {
      console.error('Failed to load admin orders:', err);
    }
  };

  const fetchAnalytics = async (explicitToken, period = analyticsPeriod) => {
    analyticsRequestRef.current.controller?.abort();
    const requestId = analyticsRequestRef.current.id + 1;
    const controller = new AbortController();
    analyticsRequestRef.current = { id: requestId, controller };
    setIsAnalyticsLoading(true);

    try {
      const res = await fetch(`/api/admin/analytics?period=${encodeURIComponent(period)}`, {
        headers: getAuthHeaders(explicitToken),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (analyticsRequestRef.current.id !== requestId) return;

      if (res.ok && data.success) {
        setAnalytics(data);
      } else if (res.status === 401) {
        handleLogout('Admin session expired (30 minutes limit). Please log in again.');
      } else {
        showToast(data.error || 'Could not load analytics. Live data will retry automatically.');
      }
    } catch (err) {
      if (err.name !== 'AbortError' && analyticsRequestRef.current.id === requestId) {
        console.error('Failed to load admin analytics:', err);
        showToast('Analytics connection interrupted. Existing data is preserved and will retry automatically.');
      }
    } finally {
      if (analyticsRequestRef.current.id === requestId) {
        setIsAnalyticsLoading(false);
      }
    }
  };

  // Auto-refresh analytics every 30 seconds while visible.
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'analytics') return undefined;
    fetchAnalytics(undefined, analyticsPeriod);
    const interval = setInterval(() => fetchAnalytics(undefined, analyticsPeriod), 30_000);
    return () => {
      clearInterval(interval);
      analyticsRequestRef.current.controller?.abort();
    };
  }, [isAuthenticated, activeTab, analyticsPeriod]);

  // Auto-refresh orders every 5 seconds when in Orders tab
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'orders') return;
    const interval = setInterval(() => fetchOrders(), 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, activeTab]);

  // Handle Logout (optionally showing reason)
  const handleLogout = (reason = '') => {
    analyticsRequestRef.current.controller?.abort();
    fetch('/api/admin/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
    }).catch(() => { });
    sessionStorage.removeItem('yurigame_admin_token');
    setIsAuthenticated(false);
    setLoginStep('REQUEST');
    setOtpCode('');
    setChallengeId('');
    if (reason) {
      setAuthError(reason);
      showToast(reason);
    }
  };

  // Heartbeat check every 45s: automatically log out when 30-minute session expires
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/auth/session', {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (!res.ok || !data.success || !data.authenticated) {
          handleLogout('Admin session expired after 30 minutes. Please log in again.');
        }
      } catch { }
    }, 45000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // =====================================
  // ACTIONS: Game Stock & Logo (Option 5)
  // =====================================
  const handleToggleGameStock = async (gameId, currentStockOpen) => {
    try {
      const res = await fetch(`/api/admin/games/${gameId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ stockOpen: !currentStockOpen })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Stock for ${data.game.name} set to ${!currentStockOpen ? 'OPEN (In Stock)' : 'CLOSED (Out of Stock)'}`);
        fetchFullConfig();
      }
    } catch {
      showToast('Error updating stock status');
    }
  };

  const openAddGameModal = async () => {
    setShowAddGame(true);
    setCatalogSearch('');
    if (providerCatalog.length) return;
    setCatalogLoading(true);
    try {
      const res = await fetch('/api/admin/provider-catalog', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setProviderCatalog(data.games || []);
      else showToast(data.error || 'Could not load provider games.');
    } catch {
      showToast('Could not load provider games.');
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleImportGame = async (gameCode) => {
    setImportingCode(gameCode);
    try {
      const res = await fetch('/api/admin/games/import', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ gameCode }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Imported ${data.game.name} with ${data.packageCount} packages! Set your prices + logo.`);
        await fetchFullConfig();
        setSelectedGameId(data.game.id);
        setShowAddGame(false);
      } else {
        showToast(data.error || 'Import failed.');
      }
    } catch {
      showToast('Import failed.');
    } finally {
      setImportingCode('');
    }
  };

  const handleRemoveGame = async (gameId, gameName) => {
    if (!(await confirmAction({ title: 'Remove game', message: `Remove "${gameName}" from your store? This permanently deletes the game and all its packages.`, confirmText: 'Remove game', danger: true }))) return;
    try {
      const res = await fetch(`/api/admin/games/${encodeURIComponent(gameId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Removed ${gameName}.`);
        await fetchFullConfig();
        setSelectedGameId((config?.games || [])[0]?.id || null);
      } else {
        showToast(data.error || 'Could not remove game.');
      }
    } catch {
      showToast('Could not remove game.');
    }
  };

  // ---- Coming Soon games (display-only tiles on the home page) ----
  const handleAddComingSoon = async () => {
    const name = comingSoonName.trim();
    if (!name) { showToast('Enter a game name first.'); return; }
    setAddingComingSoon(true);
    try {
      const res = await fetch('/api/admin/coming-soon', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, image: comingSoonImage }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`"${data.game.name}" added as Coming Soon — now on the home page!`);
        setComingSoonName('');
        setComingSoonImage('');
        setShowAddComingSoon(false);
        await fetchFullConfig();
      } else {
        showToast(data.error || 'Could not add coming-soon game.');
      }
    } catch {
      showToast('Could not add coming-soon game.');
    } finally {
      setAddingComingSoon(false);
    }
  };

  const handleRemoveComingSoon = async (id, name) => {
    if (!(await confirmAction({ title: 'Remove Coming Soon', message: `Remove "${name}" from the home page?`, confirmText: 'Remove', danger: true }))) return;
    try {
      const res = await fetch(`/api/admin/coming-soon/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Removed "${name}" from Coming Soon.`);
        await fetchFullConfig();
      } else {
        showToast(data.error || 'Could not remove.');
      }
    } catch {
      showToast('Could not remove coming-soon game.');
    }
  };

  const handleToggleGameMaintenance = async (gameId, currentMaintenance) => {
    try {
      const res = await fetch(`/api/admin/games/${gameId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ maintenance: !currentMaintenance })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${data.game.name} top-up ${!currentMaintenance ? 'marked UNAVAILABLE — customers cannot pay' : 'marked AVAILABLE again'}`);
        fetchFullConfig();
      }
    } catch {
      showToast('Could not update maintenance status.');
    }
  };

  const handleUpdateGameInfo = async (gameId, updateFields) => {
    try {
      const res = await fetch(`/api/admin/games/${encodeURIComponent(gameId)}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateFields)
      });
      const data = await res.json();
      if (data.success && data.game) {
        showToast(`Game info updated for ${data.game.name}`);
        setConfig((prev) => {
          if (!prev) return prev;
          const updatedGames = (prev.games || []).map((g) =>
            g.id === gameId || g.slug === gameId || g.providerCode === gameId ? { ...g, ...data.game } : g
          );
          const newCfg = { ...prev, games: updatedGames };
          updateClientCaches(newCfg);
          return newCfg;
        });
        if (data.game) {
          syncGamesWithAdminConfig([data.game]);
        }
        fetchFullConfig();
      } else {
        showToast(data.error || 'Could not update game info');
      }
    } catch {
      showToast('Error updating game info');
    }
  };

  // =====================================
  // ACTIONS: Website Brand Logo & Auto-Cut Background
  // =====================================
  const handleSaveSiteLogo = async (newLogoInput, customToastMsg = '') => {
    const candidate = newLogoInput && typeof newLogoInput === 'object'
      ? String(newLogoInput.url || newLogoInput.src || '').trim()
      : String(newLogoInput || '').trim();
    const resolved = isValidLogoUrl(candidate) ? candidate : DEFAULT_SITE_LOGO;
    // Optimistically update everywhere on the page & browser favicon immediately
    setSiteLogoState(resolved);
    setSiteLogo(resolved);
    setContactsData((prev) => ({ ...prev, siteLogo: resolved }));

    try {
      const res = await fetch('/api/admin/site-logo', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ siteLogo: resolved }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        const savedLogo = isValidLogoUrl(data.siteLogo) ? data.siteLogo : resolved;
        setSiteLogoState(savedLogo);
        setSiteLogo(savedLogo);
        setConfig((prev) => {
          if (!prev) return prev;
          const nextCfg = {
            ...prev,
            siteLogo: savedLogo,
            contacts: { ...(prev.contacts || {}), siteLogo: savedLogo },
          };
          updateClientCaches(nextCfg);
          return nextCfg;
        });
        showToast(customToastMsg || 'Website logo updated everywhere on the homepage & storefront!');
      } else {
        showToast(data.error || 'Could not save website logo to server.');
      }
    } catch {
      showToast('Saved locally — server connection error while syncing logo.');
    }
  };

  const handleUploadSiteLogoFile = async (file) => {
    if (!file) return;
    setIsProcessingSiteLogo(true);
    try {
      showToast(
        autoCutLogoBg
          ? 'Uploading logo & auto-cutting background (white/black/color)...'
          : 'Uploading website logo...'
      );
      const rawCompressed = await compressImageFile(file, 800, 0.92, { forcePng: true });
      if (rawCompressed) {
        setOriginalSiteLogo(rawCompressed);
      }
      const processed = await processLogoFileWithAutoCut(file, {
        maxWidth: 800,
        tolerance: logoTolerance,
        feather: 20,
        targetColor: resolveLogoTargetColor(),
        cutInnerHoles: logoCutInner,
        autoCut: autoCutLogoBg,
      });
      if (processed) {
        await handleSaveSiteLogo(
          processed,
          autoCutLogoBg
            ? 'Website logo uploaded & background auto-cut — live across the entire website!'
            : 'Website logo uploaded — live across the entire website!'
        );
      }
    } catch {
      showToast('Failed to process website logo image.');
    } finally {
      setIsProcessingSiteLogo(false);
    }
  };

  const handleManualCutSiteLogo = async () => {
    const rawCandidate = originalSiteLogo || siteLogoState || getSiteLogo();
    const sourceLogo = isValidLogoUrl(rawCandidate) && !String(rawCandidate).startsWith('/assets/uploads/')
      ? rawCandidate
      : DEFAULT_SITE_LOGO;
    setIsProcessingSiteLogo(true);
    try {
      showToast('Cutting background from website logo...');
      if (!originalSiteLogo) {
        setOriginalSiteLogo(sourceLogo);
      }
      const cutOut = await removeImageBackground(sourceLogo, logoTolerance, 20, {
        targetColor: resolveLogoTargetColor(),
        cutInnerHoles: logoCutInner,
        trim: true,
      });
      if (cutOut) {
        await handleSaveSiteLogo(
          cutOut,
          'Background removed (transparent PNG) & applied everywhere on the website!'
        );
      }
    } catch {
      showToast('Could not auto-cut background from this image.');
    } finally {
      setIsProcessingSiteLogo(false);
    }
  };

  const handleUndoCutSiteLogo = async () => {
    if (!originalSiteLogo) return;
    await handleSaveSiteLogo(originalSiteLogo, 'Restored original un-cut website logo!');
    setOriginalSiteLogo(null);
  };

  const handleResetSiteLogo = async () => {
    setOriginalSiteLogo(null);
    setSiteLogoUrlInput('');
    await handleSaveSiteLogo(DEFAULT_SITE_LOGO, 'Reset to default YuriGame Store logo!');
  };

  const handleCutExistingGameLogo = async (game) => {
    const sourceImg = isValidLogoUrl(game?.image) && !String(game.image).startsWith('/assets/uploads/')
      ? game.image
      : getFallbackGameTile(game);
    if (!sourceImg) return;
    try {
      showToast(`Cutting background for ${game.name} logo...`);
      const cutOut = await removeImageBackground(sourceImg, logoTolerance, 20, {
        targetColor: resolveLogoTargetColor(),
        cutInnerHoles: logoCutInner,
        trim: true,
      });
      if (cutOut) {
        await handleUpdateGameInfo(game.id, { image: cutOut });
        showToast(`Background cut & transparent PNG saved for ${game.name}!`);
      }
    } catch {
      showToast(`Could not cut background for ${game.name}.`);
    }
  };

  // =====================================
  // ACTIONS: Product Packages (Option 1)
  // =====================================
  const handleSyncSoraPackages = async () => {
    if (isSyncingSora) return;
    setIsSyncingSora(true);
    try {
      const res = await fetch('/api/admin/soratopup/sync', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        showToast(data.error || 'Could not synchronize SoraTopup packages.');
        return;
      }
      const result = data.result || {};
      showToast(`Sora sync complete: ${result.connected || 0} connected, ${result.unchanged || 0} current, ${result.unmatched || 0} need SKU selection.`);
      fetchFullConfig();
    } catch {
      showToast('Could not connect to the game provider.');
    } finally {
      setIsSyncingSora(false);
    }
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    try {
      if (editingPackage) {
        // Update package
        const res = await fetch(`/api/admin/packages/${selectedGameId}/${editingPackage.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(packageFormData)
        });
        const data = await res.json();
        if (data.success) {
          const connection = data.package.providerConnected
            ? ` Connected to provider (${data.package.providerCode}).`
            : '';
          showToast(`Package "${data.package.name}" updated successfully!${connection}`);
          setEditingPackage(null);
          fetchFullConfig();
        } else {
          showToast(data.error || 'Could not update package.');
        }
      } else {
        // Add new package
        const res = await fetch(`/api/admin/packages/${selectedGameId}`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(packageFormData)
        });
        const data = await res.json();
        if (data.success) {
          const connection = data.package.providerConnected
            ? ` Connected to provider (${data.package.providerCode}).`
            : '';
          showToast(`New package "${data.package.name}" added!${connection}`);
          setIsAddingPackage(false);
          fetchFullConfig();
        } else {
          showToast(data.error || 'Could not add package.');
        }
      }
    } catch {
      showToast('Error saving package');
    }
  };

  const handleDeletePackage = async (gameId, pkgId, pkgName) => {
    if (!(await confirmAction({ title: 'Delete package', message: `Delete the package "${pkgName}"? This can't be undone.`, confirmText: 'Delete', danger: true }))) return;
    try {
      const res = await fetch(`/api/admin/packages/${gameId}/${pkgId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Package "${pkgName}" deleted`);
        fetchFullConfig();
      }
    } catch {
      showToast('Error deleting package');
    }
  };

  // =====================================
  // ACTIONS: MLBB Event Categories (Option 1)
  // =====================================
  const handleToggleMlbbEventOpen = async (eventId, currentIsOpen, eventName) => {
    try {
      const res = await fetch(`/api/admin/mlbb-events/${eventId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isOpen: !currentIsOpen })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Event "${eventName}" visibility set to ${!currentIsOpen ? 'OPEN (Visible to Users)' : 'CLOSED (Hidden from Users)'}`);
        fetchFullConfig();
      }
    } catch {
      showToast('Error updating event visibility');
    }
  };

  const handleSaveMlbbEvent = async (e) => {
    e.preventDefault();
    try {
      if (editingMlbbEvent) {
        const res = await fetch(`/api/admin/mlbb-events/${editingMlbbEvent.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(mlbbEventFormData)
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Event category "${data.event.name}" updated!`);
          setEditingMlbbEvent(null);
          fetchFullConfig();
        }
      } else {
        const res = await fetch('/api/admin/mlbb-events', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(mlbbEventFormData)
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Event category "${data.event.name}" created!`);
          setIsAddingMlbbEvent(false);
          fetchFullConfig();
        }
      }
    } catch {
      showToast('Error saving event category');
    }
  };

  const handleDeleteMlbbEvent = async (eventId, eventName) => {
    if (!(await confirmAction({ title: 'Delete event category', message: `Delete event category "${eventName}" and all its packages?`, confirmText: 'Delete', danger: true }))) return;
    try {
      const res = await fetch(`/api/admin/mlbb-events/${eventId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Event "${eventName}" deleted`);
        fetchFullConfig();
      }
    } catch {
      showToast('Error deleting event category');
    }
  };

  // MLBB Event Package CRUD
  const handleSaveEventPackage = async (e) => {
    e.preventDefault();
    if (!targetEventId) return;
    try {
      if (editingEventPkg) {
        const res = await fetch(`/api/admin/mlbb-events/${targetEventId}/packages/${editingEventPkg.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(eventPkgFormData)
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Event package "${data.package.name}" updated and connected to SoraTopup Live (${data.package.providerCode}).`);
          setEditingEventPkg(null);
          fetchFullConfig();
        } else {
          showToast(data.error || 'Could not update event package.');
        }
      } else {
        const res = await fetch(`/api/admin/mlbb-events/${targetEventId}/packages`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(eventPkgFormData)
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Event package "${data.package.name}" added and connected to SoraTopup Live (${data.package.providerCode}).`);
          setIsAddingEventPkg(false);
          fetchFullConfig();
        } else {
          showToast(data.error || 'Could not add event package.');
        }
      }
    } catch {
      showToast('Error saving event package');
    }
  };

  const handleDeleteEventPackage = async (eventId, pkgId, pkgName) => {
    if (!(await confirmAction({ title: 'Delete event package', message: `Delete event package "${pkgName}"?`, confirmText: 'Delete', danger: true }))) return;
    try {
      const res = await fetch(`/api/admin/mlbb-events/${eventId}/packages/${pkgId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Event package "${pkgName}" deleted`);
        fetchFullConfig();
      }
    } catch {
      showToast('Error deleting event package');
    }
  };

  // =====================================
  // ACTIONS: Orders 1-Click Approve (Option 2)
  // =====================================
  const handleApproveOrder = async (orderRef, gameName, player) => {
    // Instant optimistic update so UI responds immediately
    setOrders(prev => prev.map(o => o.ref === orderRef ? { ...o, status: 'COMPLETED', handledBy: 'Admin Control Center' } : o));
    try {
      const res = await fetch(`/api/admin/orders/${orderRef}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ adminName: 'Admin Control Center' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Order ${orderRef} (${gameName}) marked COMPLETED & customer notified live!`);
        fetchOrders();
      } else {
        showToast(data.error || 'Failed to approve order');
        fetchOrders();
      }
    } catch {
      showToast('Error approving order');
      fetchOrders();
    }
  };

  const handleCancelOrder = async (orderRef) => {
    if (!(await confirmAction({ title: 'Cancel order', message: `Cancel order ${orderRef}? The customer will be notified it was cancelled.`, confirmText: 'Cancel order', cancelText: 'Keep order', danger: true }))) return;
    // Instant optimistic update
    setOrders(prev => prev.map(o => o.ref === orderRef ? { ...o, status: 'CANCELLED', handledBy: 'Admin Control Center' } : o));
    try {
      const res = await fetch(`/api/admin/orders/${orderRef}/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ adminName: 'Admin Control Center' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Order ${orderRef} marked CANCELLED`);
        fetchOrders();
      } else {
        showToast(data.error || 'Failed to cancel order');
        fetchOrders();
      }
    } catch {
      showToast('Error cancelling order');
      fetchOrders();
    }
  };

  // =====================================
  // ACTIONS: Contact Settings (Option 3)
  // =====================================
  const handleSaveContacts = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      const res = await fetch('/api/admin/contacts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(contactsData)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Settings & Telegram linkage saved live!');
        fetchFullConfig();
      }
    } catch {
      showToast('Error saving contact settings');
    }
  };

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    try {
      const res = await fetch('/api/admin/telegram/test', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Test alert delivered to Admins & Supergroup! (${data.result?.sentCount || 0} received)`);
      } else {
        showToast(`Telegram test failed: ${data.error || 'Check bot settings'}`);
      }
    } catch {
      showToast('Connection error during Telegram test');
    } finally {
      setIsTestingTelegram(false);
    }
  };

  // =====================================
  // ACTIONS: Slide Banners (Option 4)
  // =====================================
  const handleSaveBanner = async (e) => {
    e.preventDefault();
    try {
      if (editingBanner) {
        const res = await fetch(`/api/admin/banners/${editingBanner.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(bannerFormData)
        });
        const data = await res.json();
        if (data.success && data.banner) {
          showToast(`Banner "${data.banner.title}" updated!`);
          setEditingBanner(null);
          setConfig((prev) => {
            if (!prev) return prev;
            const updatedBanners = (prev.banners || []).map((b) =>
              b.id === data.banner.id ? data.banner : b
            );
            const newCfg = { ...prev, banners: updatedBanners };
            updateClientCaches(newCfg);
            return newCfg;
          });
          fetchFullConfig();
        }
      } else {
        const res = await fetch('/api/admin/banners', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(bannerFormData)
        });
        const data = await res.json();
        if (data.success && data.banner) {
          showToast(`Banner "${data.banner.title}" created!`);
          setIsAddingBanner(false);
          setConfig((prev) => {
            if (!prev) return prev;
            const updatedBanners = [...(prev.banners || []), data.banner];
            const newCfg = { ...prev, banners: updatedBanners };
            updateClientCaches(newCfg);
            return newCfg;
          });
          fetchFullConfig();
        }
      }
    } catch {
      showToast('Error saving banner');
    }
  };

  const handleDeleteBanner = async (bannerId, title) => {
    if (!(await confirmAction({ title: 'Delete banner', message: `Delete slide banner "${title}"?`, confirmText: 'Delete', danger: true }))) return;
    try {
      const res = await fetch(`/api/admin/banners/${bannerId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Slide banner "${title}" deleted`);
        setConfig((prev) => {
          if (!prev) return prev;
          const updatedBanners = (prev.banners || []).filter((b) => b.id !== bannerId);
          const newCfg = { ...prev, banners: updatedBanners };
          updateClientCaches(newCfg);
          return newCfg;
        });
        fetchFullConfig();
      }
    } catch {
      showToast('Error deleting banner');
    }
  };

  // ========================================================
  // RENDER: LOGIN SCREEN WITH TELEGRAM 2FA (No emojis, 100% SVG)
  // ========================================================
  if (!isAuthenticated) {
    const formatTimer = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
      <div className="min-h-screen bg-[#07080b] flex flex-col items-center justify-center p-4 text-slate-200 font-['Outfit']">
        <div className="w-full max-w-md bg-[#0e1017] border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Accent Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-2 bg-gradient-to-r from-transparent via-[#E3062F] to-transparent opacity-80" />

          {loginStep === 'REQUEST' ? (
            <>
              <div className="text-center mb-6">
                <div className="inline-block mb-3 p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
                  <YuriGameLogo inverse />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider mb-2">
                  <ShieldCheck size={14} />
                  <span>Telegram-Protected Access</span>
                </div>
                <h1 className="text-2xl font-black text-white m-0">Administrator Access</h1>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Request a single-use verification code. No reusable admin PIN or session token is sent through browser JavaScript.
                </p>
              </div>

              <div className="mb-4 grid gap-2 text-[10.5px] text-slate-400">
                <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5">
                  <Smartphone size={14} className="shrink-0 text-emerald-400" /> Code delivered only to registered Telegram admins
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5">
                  <Lock size={14} className="shrink-0 text-[#E3062F]" /> Session is HttpOnly, single-browser, and network-bound
                </div>
              </div>

              <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
                {authError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-[#E3062F] to-rose-700 hover:from-rose-600 hover:to-rose-800 text-white font-black text-sm tracking-wide shadow-lg cursor-pointer transition-transform active:scale-[0.98] border-0 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Sending Secure Telegram Code...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Send Code to Telegram Admins</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 pt-3.5 border-t border-slate-800/80 text-center text-[11px] text-slate-400">
                <span>For a single-use 10-minute access link, send </span>
                <code className="text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded font-mono font-bold">/admin</code>
                <span> privately to your Telegram bot.</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="inline-block mb-3 p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
                  <YuriGameLogo inverse />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider mb-2">
                  <Smartphone size={14} />
                  <span>Telegram 2FA Challenge</span>
                </div>
                <h1 className="text-2xl font-black text-white m-0">Enter Verification Code</h1>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  A 6-digit one-time code was sent to your registered Telegram admin accounts. Enter the code below to confirm login.
                </p>
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs font-mono">
                  <Clock size={13} className={otpTimer < 60 ? 'text-rose-400' : 'text-slate-400'} />
                  <span>Expires in: {formatTimer(otpTimer)}</span>
                </div>
              </div>

              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 text-center">
                    6-Digit Verification Code (OTP)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="000000"
                      autoFocus
                      required
                      className="w-full h-14 px-4 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-mono text-2xl tracking-[0.4em] text-center focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>

                {authError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn || otpCode.length !== 6 || otpTimer === 0}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-sm tracking-wide shadow-lg cursor-pointer transition-transform active:scale-[0.98] border-0 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      <span>Confirm & Access Dashboard</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginStep('REQUEST');
                      setAuthError('');
                    }}
                    className="text-slate-400 hover:text-white flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0"
                  >
                    <ArrowLeft size={13} />
                    <span>Request New Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isLoggingIn}
                    className="text-slate-400 hover:text-white flex items-center gap-1.5 bg-transparent border-0 cursor-pointer p-0 disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={resendCooldown > 0 ? '' : 'text-emerald-400'} />
                    <span>
                      {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                    </span>
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <button
              type="button"
              onClick={onBackToStore}
              className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto bg-transparent border-0 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Return to Storefront</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedGame = config?.games?.find((g) => g.id === selectedGameId) || config?.games?.[0];

  // Which upstream provider fulfils a game: Roblox -> SoraTopup, everything else -> Bay2Game.
  const providerNameFor = (g) =>
    ['robuxsend', 'roblox'].includes(String(g?.providerCode || g?.id || '').toLowerCase())
      ? 'Sora'
      : 'Bay2Game';
  const selectedProviderName = providerNameFor(selectedGame);

  const filteredOrders = orders.filter((o) => {
    if (orderFilter !== 'all' && o.status !== orderFilter) return false;
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      const ref = String(o.ref || '').toLowerCase();
      const player = String(o.playerDetails?.account || o.playerDetails?.userId || o.verifiedPlayer || '').toLowerCase();
      const game = String(o.gameName || '').toLowerCase();
      return ref.includes(q) || player.includes(q) || game.includes(q);
    }
    return true;
  });

  const analyticsSummary = analytics?.summary || {};
  const analyticsTrend = analytics?.trend || [];
  const maxTrendRevenue = Math.max(1, ...analyticsTrend.map((point) => point.revenue || 0));
  const maxTrendOrders = Math.max(1, ...analyticsTrend.map((point) => point.orders || 0));
  const periodLabels = {
    day: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
  };
  const formatUsd = (value) => `$${Number(value || 0).toFixed(2)}`;
  const formatAnalyticsTime = (value) => {
    if (!value) return 'Unknown time';
    return new Date(value).toLocaleString('en-GB', {
      timeZone: 'Asia/Phnom_Penh',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-[#07080b] text-slate-200 font-['Outfit'] selection:bg-[#E3062F] selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-100 bg-[#E3062F] text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 animate-in slide-in-from-top-4">
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Professional Confirm Dialog */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => closeConfirm(false)}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl border border-slate-700 bg-[#0e1017] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${confirmState.danger ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-[#E3062F]/15 text-[#E3062F] border border-[#E3062F]/30'}`}>
                  <AlertCircle size={22} />
                </div>
                <h3 className="text-base sm:text-lg font-black text-white m-0 leading-tight">{confirmState.title || 'Please confirm'}</h3>
              </div>
              <p className="text-[13px] sm:text-sm text-slate-300 leading-relaxed m-0">{confirmState.message}</p>
            </div>
            <div className="flex gap-2.5 p-4 border-t border-slate-800 bg-slate-900/40">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="flex-1 py-3 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border-0 cursor-pointer transition-colors active:scale-[0.98]"
              >
                {confirmState.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className={`flex-1 py-3 sm:py-2.5 rounded-xl font-black text-sm border-0 cursor-pointer text-white transition-colors active:scale-[0.98] ${confirmState.danger ? 'bg-rose-600 hover:bg-rose-500 shadow-[0_6px_20px_rgba(225,29,72,0.35)]' : 'bg-[#E3062F] hover:bg-[#b80d2e] shadow-[0_6px_20px_rgba(227,6,47,0.35)]'}`}
              >
                {confirmState.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 bg-[#0c0e14]/95 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <YuriGameLogo size="sm" showBadge={false} inverse className="shrink-0" />
          <div className="h-4 sm:h-5 w-px bg-slate-800 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-[#E3062F]/15 border border-[#E3062F]/40 text-[#E3062F] text-[10px] sm:text-[11px] font-black uppercase tracking-wider whitespace-nowrap">
              Control Panel
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold hidden sm:inline-flex items-center gap-1">
              <Clock size={10} /> 30m Auto-Expire
            </span>
            <span className="text-xs text-slate-400 font-medium hidden lg:inline whitespace-nowrap">
              Store Master Admin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-[#E3062F]/15 hover:bg-[#E3062F]/25 text-[#ff4d6d] text-xs font-black border border-[#E3062F]/40 flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
            title="Change Website Logo & Auto-Cut Background"
          >
            <Sparkles size={13} />
            <span className="hidden xs:inline">Website Logo</span>
          </button>

          <button
            type="button"
            onClick={fetchFullConfig}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 cursor-pointer transition-colors"
            title="Refresh Store Data"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={onBackToStore}
            className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
            title="Return to YuriGame Store"
          >
            <ExternalLink size={13} />
            <span className="hidden xs:inline">Storefront</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 sm:p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 cursor-pointer transition-colors"
            title="Lock Dashboard"
          >
            <Power size={14} />
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-[#0b0c12] border-b border-slate-800/80 px-4 sm:px-8">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${activeTab === 'analytics'
                ? 'bg-[#E3062F] text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
          >
            <BarChart3 size={15} />
            <span>1. Analytics</span>
            {(analytics?.summary?.activePreOrders || 0) > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-black">
                {analytics.summary.activePreOrders}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${activeTab === 'products'
                ? 'bg-[#E3062F] text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
          >
            <Package size={15} />
            <span>2. Products & MLBB Events</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${activeTab === 'orders'
                ? 'bg-[#E3062F] text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
          >
            <CheckCircle2 size={15} />
            <span>3. Orders & Approvals</span>
            {orders.filter((o) => ['PENDING', 'PROCESSING', 'Pending'].includes(o.status)).length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-400 text-black text-[10px] font-black flex items-center justify-center">
                {orders.filter((o) => ['PENDING', 'PROCESSING', 'Pending'].includes(o.status)).length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${activeTab === 'contacts'
                ? 'bg-[#E3062F] text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
          >
            <PhoneCall size={15} />
            <span>4. Support & Contacts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('banners')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${activeTab === 'banners'
                ? 'bg-[#E3062F] text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
          >
            <ImageIcon size={15} />
            <span>5. Slide Banners</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${activeTab === 'stock'
                ? 'bg-[#E3062F] text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
          >
            <Sliders size={15} />
            <span>6. Logo & Stock Control</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('telegram')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${activeTab === 'telegram'
                ? 'bg-[#E3062F] text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
          >
            <Send size={15} />
            <span>7. Telegram Bot & Alerts</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        {/* ========================================================= */}
        {/* TAB 1: DYNAMIC ORDER ANALYTICS                            */}
        {/* ========================================================= */}
        {activeTab === 'analytics' && (
          <AdminAnalyticsPanel
            analytics={analytics}
            period={analyticsPeriod}
            loading={isAnalyticsLoading}
            onPeriodChange={setAnalyticsPeriod}
            onRefresh={() => fetchAnalytics(undefined, analyticsPeriod)}
            onOpenOrders={() => setActiveTab('orders')}
          />
        )}

        {/* Legacy renderer is available only for an explicitly versioned legacy payload. */}
        {analytics?.uiVersion === 'legacy' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="rounded-2xl border border-slate-800 bg-[#0e1017] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <BarChart3 size={21} className="text-[#E3062F]" />
                    <h1 className="m-0 text-xl font-black text-white sm:text-2xl">Sales & Order Analytics</h1>
                  </div>
                  <p className="m-0 text-xs text-slate-400">
                    Live totals from database orders, SoraTopup, manual orders, and pending checkout reservations.
                  </p>
                  {analytics?.generatedAt && (
                    <p className="m-0 mt-1 text-[10px] text-slate-500">
                      Updated {formatAnalyticsTime(analytics.generatedAt)} · Cambodia time
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-1">
                    {['day', 'week', 'month', 'year'].map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setAnalyticsPeriod(period)}
                        className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition ${analyticsPeriod === period
                            ? 'bg-[#E3062F] text-white shadow-md'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          }`}
                      >
                        {periodLabels[period]}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchAnalytics(undefined, analyticsPeriod)}
                    disabled={isAnalyticsLoading}
                    className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 text-[11px] font-bold text-white hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    <RefreshCw size={13} className={isAnalyticsLoading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {(analytics?.warnings || []).length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                <strong>Partial data:</strong> {analytics.warnings.join(' · ')}
              </div>
            )}

            {isAnalyticsLoading && !analytics ? (
              <div className="flex min-h-80 items-center justify-center rounded-2xl border border-slate-800 bg-[#0e1017] text-slate-400">
                <RefreshCw size={20} className="mr-2 animate-spin text-[#E3062F]" /> Loading analytics...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                  {[
                    {
                      label: 'Revenue',
                      value: formatUsd(analyticsSummary.revenue),
                      helper: periodLabels[analyticsPeriod],
                      icon: <DollarSign size={17} />,
                      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
                    },
                    {
                      label: 'All Orders',
                      value: analyticsSummary.totalOrders || 0,
                      helper: `${analyticsSummary.completedOrders || 0} completed`,
                      icon: <ShoppingCart size={17} />,
                      color: 'text-[#ff4969] bg-[#E3062F]/10 border-[#E3062F]/25',
                    },
                    {
                      label: 'Completed',
                      value: analyticsSummary.completedOrders || 0,
                      helper: `${analyticsSummary.completionRate || 0}% completion`,
                      icon: <CheckCircle2 size={17} />,
                      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25',
                    },
                    {
                      label: 'Pre-orders',
                      value: analyticsSummary.activePreOrders || 0,
                      helper: `${analyticsSummary.pendingOrders || 0} in this period`,
                      icon: <Clock size={17} />,
                      color: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
                    },
                    {
                      label: 'Average Order',
                      value: formatUsd(analyticsSummary.averageOrderValue),
                      helper: 'Completed sales',
                      icon: <TrendingUp size={17} />,
                      color: 'text-violet-400 bg-violet-500/10 border-violet-500/25',
                    },
                    {
                      label: 'Failed / Refunded',
                      value: (analyticsSummary.failedOrders || 0) + (analyticsSummary.refundedOrders || 0),
                      helper: `${formatUsd(analyticsSummary.refundedAmount)} refunded`,
                      icon: <Activity size={17} />,
                      color: 'text-rose-400 bg-rose-500/10 border-rose-500/25',
                    },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-slate-800 bg-[#0e1017] p-4">
                      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl border ${metric.color}`}>
                        {metric.icon}
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{metric.label}</div>
                      <div className="mt-1 truncate font-mono text-xl font-black text-white">{metric.value}</div>
                      <div className="mt-1 text-[10px] text-slate-500">{metric.helper}</div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
                  <div className="rounded-2xl border border-slate-800 bg-[#0e1017] p-5 sm:p-6">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="m-0 text-base font-black text-white">Revenue & Order Trend</h2>
                        <p className="m-0 mt-0.5 text-[11px] text-slate-500">{periodLabels[analyticsPeriod]} by Cambodia local time</p>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Revenue</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#E3062F]" /> Orders</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto pb-2">
                      <div className="flex h-56 min-w-max items-end gap-2 border-b border-slate-800 px-1 pt-7">
                        {analyticsTrend.map((point) => (
                          <div key={point.label} className="group flex w-9 shrink-0 flex-col items-center justify-end sm:w-11">
                            <div className="pointer-events-none mb-1 hidden whitespace-nowrap rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[9px] text-white shadow-xl group-hover:block">
                              {point.orders} orders · {formatUsd(point.revenue)}
                            </div>
                            <div className="flex h-40 items-end gap-1">
                              <div
                                className="w-2 rounded-t bg-emerald-500/80 transition-all group-hover:bg-emerald-400"
                                style={{ height: `${Math.max(point.revenue > 0 ? 4 : 0, (point.revenue / maxTrendRevenue) * 150)}px` }}
                              />
                              <div
                                className="w-2 rounded-t bg-[#E3062F]/80 transition-all group-hover:bg-[#ff3156]"
                                style={{ height: `${Math.max(point.orders > 0 ? 4 : 0, (point.orders / maxTrendOrders) * 150)}px` }}
                              />
                            </div>
                            <span className="mt-2 max-w-11 truncate text-[9px] text-slate-500">{point.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-[#0e1017] p-5 sm:p-6">
                    <h2 className="m-0 text-base font-black text-white">Order Status</h2>
                    <p className="m-0 mt-0.5 text-[11px] text-slate-500">Current period distribution</p>
                    <div className="mt-5 space-y-3">
                      {(analytics?.statusBreakdown || []).map((item) => {
                        const total = Math.max(1, analyticsSummary.totalOrders || 0);
                        const width = (item.count / total) * 100;
                        const color = item.status === 'COMPLETED'
                          ? 'bg-emerald-500'
                          : item.status === 'PENDING'
                            ? 'bg-amber-500'
                            : item.status === 'REFUNDED'
                              ? 'bg-violet-500'
                              : 'bg-rose-500';
                        return (
                          <div key={item.status}>
                            <div className="mb-1 flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-300">{item.status}</span>
                              <span className="font-mono text-slate-500">{item.count}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-900">
                              <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-[#0e1017] p-5 sm:p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="m-0 text-base font-black text-white">Game Performance</h2>
                        <p className="m-0 mt-0.5 text-[11px] text-slate-500">Orders and completed revenue</p>
                      </div>
                      <Gem size={18} className="text-[#E3062F]" />
                    </div>
                    <div className="space-y-3">
                      {(analytics?.gameBreakdown || []).length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-800 py-8 text-center text-xs text-slate-500">No game sales in this period.</div>
                      ) : (
                        analytics.gameBreakdown.map((game) => {
                          const topRevenue = Math.max(1, ...(analytics.gameBreakdown || []).map((item) => item.revenue || 0));
                          return (
                            <div key={game.key} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-xs font-black text-white">{game.label}</div>
                                  <div className="mt-0.5 text-[10px] text-slate-500">{game.orders} orders · {game.completed} completed</div>
                                </div>
                                <div className="font-mono text-sm font-black text-emerald-400">{formatUsd(game.revenue)}</div>
                              </div>
                              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-900">
                                <div className="h-full rounded-full bg-gradient-to-r from-[#E3062F] to-emerald-500" style={{ width: `${(game.revenue / topRevenue) * 100}%` }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-[#0e1017] p-5 sm:p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="m-0 text-base font-black text-white">Payment Channels</h2>
                        <p className="m-0 mt-0.5 text-[11px] text-slate-500">Revenue grouped by payment method</p>
                      </div>
                      <DollarSign size={18} className="text-emerald-400" />
                    </div>
                    <div className="space-y-3">
                      {(analytics?.paymentBreakdown || []).length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-800 py-8 text-center text-xs text-slate-500">No payment data in this period.</div>
                      ) : (
                        analytics.paymentBreakdown.map((method) => (
                          <div key={method.key} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                            <div>
                              <div className="text-xs font-black text-white">{method.label}</div>
                              <div className="mt-0.5 text-[10px] text-slate-500">{method.orders} orders</div>
                            </div>
                            <div className="font-mono text-sm font-black text-emerald-400">{formatUsd(method.revenue)}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-500/25 bg-[#0e1017] p-5 sm:p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock size={18} className="text-amber-400" />
                        <h2 className="m-0 text-base font-black text-white">Pre-orders & Pending Queue</h2>
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-300">
                          {analyticsSummary.activePreOrders || 0}
                        </span>
                      </div>
                      <p className="m-0 mt-1 text-[11px] text-slate-500">Unpaid reservations, processing orders, and paid orders awaiting fulfillment.</p>
                    </div>
                    <button type="button" onClick={() => setActiveTab('orders')} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-slate-700">
                      Open Order Manager
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full min-w-[760px] text-left text-xs">
                      <thead className="border-b border-slate-800 bg-slate-900/90 text-[9px] font-black uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-3 py-2.5">Reference</th>
                          <th className="px-3 py-2.5">Game / Package</th>
                          <th className="px-3 py-2.5">Player</th>
                          <th className="px-3 py-2.5">Amount</th>
                          <th className="px-3 py-2.5">Waiting</th>
                          <th className="px-3 py-2.5">Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70 bg-slate-950/30">
                        {(analytics?.preOrders || []).length === 0 ? (
                          <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No active pre-orders or pending checkouts.</td></tr>
                        ) : (
                          analytics.preOrders.map((order) => (
                            <tr key={`${order.source}-${order.ref}`} className="hover:bg-slate-900/60">
                              <td className="px-3 py-3 font-mono font-bold text-white">{order.ref}</td>
                              <td className="px-3 py-3">
                                <div className="font-bold text-slate-200">{order.gameName}</div>
                                <div className="text-[10px] text-[#ff4969]">{order.packageName}</div>
                              </td>
                              <td className="px-3 py-3 text-slate-300">{order.player}</td>
                              <td className="px-3 py-3 font-mono font-bold text-white">{formatUsd(order.totalUsd)}</td>
                              <td className="px-3 py-3 text-amber-300">{order.ageMinutes < 1 ? 'Just now' : `${order.ageMinutes} min`}</td>
                              <td className="px-3 py-3"><span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[9px] font-bold uppercase text-slate-300">{order.source}</span></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#0e1017] p-5 sm:p-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="m-0 text-base font-black text-white">Previous Orders</h2>
                      <p className="m-0 mt-0.5 text-[11px] text-slate-500">Most recent orders inside {periodLabels[analyticsPeriod].toLowerCase()}</p>
                    </div>
                    <CalendarDays size={18} className="text-[#E3062F]" />
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full min-w-[780px] text-left text-xs">
                      <thead className="border-b border-slate-800 bg-slate-900/90 text-[9px] font-black uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-3 py-2.5">Date</th>
                          <th className="px-3 py-2.5">Reference</th>
                          <th className="px-3 py-2.5">Game</th>
                          <th className="px-3 py-2.5">Package</th>
                          <th className="px-3 py-2.5">Amount</th>
                          <th className="px-3 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70 bg-slate-950/30">
                        {(analytics?.recentOrders || []).length === 0 ? (
                          <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No orders recorded in this period.</td></tr>
                        ) : (
                          analytics.recentOrders.slice(0, 20).map((order) => (
                            <tr key={`${order.source}-${order.ref}`} className="hover:bg-slate-900/60">
                              <td className="whitespace-nowrap px-3 py-3 text-[10px] text-slate-400">{formatAnalyticsTime(order.timestamp)}</td>
                              <td className="px-3 py-3 font-mono font-bold text-white">{order.ref}</td>
                              <td className="px-3 py-3 font-bold text-slate-200">{order.gameName}</td>
                              <td className="px-3 py-3 text-slate-400">{order.packageName}</td>
                              <td className="px-3 py-3 font-mono font-black text-white">{formatUsd(order.totalUsd)}</td>
                              <td className="px-3 py-3">
                                <span className={`rounded-full border px-2 py-1 text-[9px] font-black ${order.status === 'COMPLETED'
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                    : order.status === 'PENDING'
                                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                      : order.status === 'REFUNDED'
                                        ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
                                        : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                                  }`}>
                                  {order.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PRODUCTS & MLBB EVENTS                            */}
        {/* ========================================================= */}
        {activeTab === 'products' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Game Selector Strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0e1017] p-4 rounded-2xl border border-slate-800">
              <div>
                <h2 className="text-lg font-black text-white m-0">Product & Package Manager</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage diamonds, Robux stock, prices, promotions, and custom icons.
                </p>
              </div>

              {/* Game Tabs — wrap so every game is visible without horizontal scrolling */}
              <div className="flex flex-wrap items-center gap-2">
                {(config?.games || []).map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => setSelectedGameId(game.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 border cursor-pointer transition-all ${selectedGameId === game.id
                        ? 'bg-[#E3062F] text-white border-[#E3062F] shadow-md'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                  >
                    <span>{game.name}</span>
                    <span className={`w-2 h-2 rounded-full ${game.stockOpen ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={openAddGameModal}
                  className="px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border border-dashed border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 cursor-pointer transition-all shrink-0"
                >
                  <Plus size={14} />
                  <span>Add Game</span>
                </button>
              </div>
            </div>

            {/* Add Game from Bay2Game modal */}
            {showAddGame && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowAddGame(false)}>
                <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-700 bg-[#0e1017] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-base font-black text-white m-0">Add Game from Bay2Game</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 m-0">Pick a game — all packages import automatically. Then set your prices &amp; logo.</p>
                    </div>
                    <button type="button" onClick={() => setShowAddGame(false)} className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-0 text-lg font-black">✕</button>
                  </div>
                  <div className="p-3 border-b border-slate-800">
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Search games (e.g. PUBG, Genshin, Valorant, HOK)..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-[#E3062F]"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                    {catalogLoading ? (
                      <div className="py-10 text-center text-slate-400 text-sm">Loading games…</div>
                    ) : (
                      providerCatalog
                        .filter((g) => {
                          const q = catalogSearch.trim().toLowerCase();
                          return !q || g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q);
                        })
                        .slice(0, 150)
                        .map((g) => {
                          const already = (config?.games || []).some((cg) => String(cg.id || cg.providerCode || '').toLowerCase() === g.code.toLowerCase());
                          return (
                            <div key={g.code} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
                              <img src={g.image} alt="" className="h-10 w-10 rounded-lg object-cover border border-slate-700 bg-slate-800 shrink-0" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-bold text-white">{g.name}</div>
                                <div className="truncate text-[10px] text-slate-500 font-mono">{g.code} · {(g.fields || []).join(', ') || 'userid'}</div>
                              </div>
                              <button
                                type="button"
                                disabled={already || importingCode === g.code}
                                onClick={() => handleImportGame(g.code)}
                                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-black border-0 ${already ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : importingCode === g.code ? 'bg-emerald-800 text-white cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'}`}
                              >
                                {already ? 'Added' : importingCode === g.code ? 'Importing…' : 'Import'}
                              </button>
                            </div>
                          );
                        })
                    )}
                    {!catalogLoading && providerCatalog.length === 0 && (
                      <div className="py-10 text-center text-slate-400 text-sm">No games available right now.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Selected Game Packages Header */}
            {selectedGame && (
              <div className="bg-[#0e1017] p-6 rounded-2xl border border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="relative group shrink-0">
                      <img
                        src={getSafeAdminGameImage(selectedGame)}
                        alt={selectedGame.name}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-700 shadow-md"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getFallbackGameTile(selectedGame);
                        }}
                      />
                      <input
                        type="file"
                        id={`tab2-logo-file-${selectedGame.id}`}
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              showToast(
                                autoCutLogoBg
                                  ? `Uploading & auto-cutting background for ${selectedGame.name}...`
                                  : `Uploading logo for ${selectedGame.name}...`
                              );
                              const optimized = await processLogoFileWithAutoCut(file, {
                                maxWidth: 800,
                                tolerance: logoTolerance,
                                feather: 20,
                                targetColor: resolveLogoTargetColor(),
                                cutInnerHoles: logoCutInner,
                                autoCut: autoCutLogoBg,
                              });
                              if (optimized) {
                                await handleUpdateGameInfo(selectedGame.id, { image: optimized });
                                showToast(`Logo for ${selectedGame.name} updated (background auto-cut)!`);
                              }
                            } catch (err) {
                              showToast('Failed to process image');
                            }
                          }
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor={`tab2-logo-file-${selectedGame.id}`}
                        className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold cursor-pointer transition-opacity"
                        title="Click to change logo"
                      >
                        <UploadCloud size={16} />
                      </label>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-white m-0">{selectedGame.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1.5 ${selectedGame.stockOpen ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${selectedGame.stockOpen ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          <span>{selectedGame.stockOpen ? 'In Stock' : 'Out of Stock'}</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {selectedGame.id === 'roslegacy' && 'Customer input: Username/Gmail + Password'}
                        {selectedGame.id === 'robuxsend' && 'Customer input: Roblox Username only (live avatar check)'}
                        {selectedGame.id === 'ml' && 'Customer input: User ID + Zone ID'}
                        {selectedGame.id === 'ff' && 'Customer input: Player ID'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <label
                          htmlFor={`tab2-logo-file-${selectedGame.id}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 cursor-pointer flex items-center gap-1.5 transition-colors"
                        >
                          <UploadCloud size={12} className="text-[#E3062F]" />
                          <span>Change Logo (Auto-Cut BG)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleCutExistingGameLogo(selectedGame)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 cursor-pointer flex items-center gap-1.5 transition-colors"
                          title="Cut white, black, or colored background from current logo"
                        >
                          <Sparkles size={12} />
                          <span>Cut Logo BG</span>
                        </button>
                        <input
                          type="file"
                          id={`tab2-banner-file-${selectedGame.id}`}
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                showToast(`Uploading banner for ${selectedGame.name}...`);
                                const optimized = await compressImageFile(file, 1600, 0.85);
                                if (optimized) {
                                  await handleUpdateGameInfo(selectedGame.id, { banner: optimized });
                                  showToast(`Cover banner for ${selectedGame.name} updated!`);
                                }
                              } catch (err) {
                                showToast('Failed to process image');
                              }
                            }
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                        <label
                          htmlFor={`tab2-banner-file-${selectedGame.id}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 cursor-pointer flex items-center gap-1.5 transition-colors"
                        >
                          <UploadCloud size={12} className="text-amber-400" />
                          <span>Change Cover Banner</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const newUrl = window.prompt(`Enter direct image URL for ${selectedGame.name} logo:`, selectedGame.image);
                            if (newUrl && newUrl.trim()) {
                              handleUpdateGameInfo(selectedGame.id, { image: newUrl.trim() });
                            }
                          }}
                          className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer bg-transparent border-0"
                        >
                          Or paste URL
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {Boolean(selectedGame.providerCode || selectedGame.id) && (
                      <button
                        type="button"
                        onClick={handleSyncSoraPackages}
                        disabled={isSyncingSora}
                        className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-black text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-wait disabled:opacity-60"
                      >
                        <RefreshCw size={15} className={isSyncingSora ? 'animate-spin' : ''} />
                        <span>{isSyncingSora ? `Syncing ${selectedProviderName} Live...` : `Sync ${selectedProviderName} Live`}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPackageFormData({
                          name: '',
                          providerCode: '',
                          diamonds: 100,
                          price: 1.0,
                          bonus: '',
                          popular: false,
                          inStock: true,
                          image: ''
                        });
                        setIsAddingPackage(true);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer border-0"
                    >
                      <Plus size={16} />
                      <span>Add New Package</span>
                    </button>
                  </div>
                </div>

                {/* Packages Grid — 2 per row on phones, more on larger screens */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
                  {(selectedGame.packages || []).map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${pkg.inStock !== false ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-950/60 border-slate-900 opacity-60'
                        }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-mono text-base font-black text-white">
                            {pkg.name}
                          </span>
                          {pkg.bonus && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
                              {pkg.bonus}
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-lg font-black text-[#E3062F] font-mono">
                            ${Number(pkg.price).toFixed(2)} USD
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                          <span>Qty / Credits: <strong>{pkg.diamonds || pkg.code}</strong> {selectedGame.currency}</span>
                        </div>

                        {Boolean(selectedGame.providerCode || selectedGame.id) && (
                          <div className={`mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-black ${pkg.providerConnected
                              ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400'
                              : 'border-amber-500/35 bg-amber-500/10 text-amber-300'
                            }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${pkg.providerConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                            {pkg.providerConnected
                              ? `${selectedProviderName} Live · ${pkg.providerCode}`
                              : `Edit to connect with ${selectedProviderName}`}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 gap-2">
                        <span className={`text-[10.5px] font-bold ${pkg.inStock !== false ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pkg.inStock !== false ? '● In Stock' : '○ Out of Stock'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPackage(pkg);
                              setPackageFormData({
                                name: pkg.name,
                                providerCode: pkg.providerCode || pkg.code || '',
                                diamonds: pkg.diamonds || Number(pkg.code) || 100,
                                price: pkg.price,
                                bonus: pkg.bonus || '',
                                popular: Boolean(pkg.popular),
                                inStock: pkg.inStock !== false,
                                image: pkg.image || ''
                              });
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer border-0"
                            title="Edit Package"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePackage(selectedGame.id, pkg.id, pkg.name)}
                            className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 cursor-pointer border-0"
                            title="Delete Package"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SPECIAL SECTION: MOBILE LEGENDS EVENT CATEGORIES */}
            {selectedGameId === 'ml' && (
              <div className="bg-[#0e1017] p-6 rounded-2xl border border-amber-500/30 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles size={20} className="text-amber-400" />
                      <h3 className="text-xl font-black text-white m-0">Mobile Legends KH Event Categories</h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      Manage Special Events & Weekly Events. Toggle <strong>Open / Close</strong>: when Closed, users will not see the event in the store. When users pay from an event, Telegram alerts will display full event details!
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMlbbEventFormData({
                        name: '',
                        badge: 'Special Event',
                        banner: '/assets/games/mlbb_hero_4k.jpg',
                        description: '',
                        isOpen: true
                      });
                      setIsAddingMlbbEvent(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer border-0"
                  >
                    <Plus size={16} />
                    <span>Add New Event Category</span>
                  </button>
                </div>

                {/* List of MLBB Events */}
                <div className="space-y-6">
                  {(config?.mlbbEvents || []).map((event) => (
                    <div
                      key={event.id}
                      className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center font-black">
                            <Sparkles size={18} className="text-amber-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-base font-black text-white m-0">{event.name}</h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {event.badge || 'Event'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{event.description}</p>
                          </div>
                        </div>

                        {/* Open / Close Visibility Toggle */}
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggleMlbbEventOpen(event.id, event.isOpen, event.name)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border cursor-pointer transition-all ${event.isOpen
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                              }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${event.isOpen ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                              <span>{event.isOpen ? 'OPEN (Visible)' : 'CLOSED (Hidden)'}</span>
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTargetEventId(event.id);
                              setEventPkgFormData({
                                name: '',
                                providerCode: '',
                                diamonds: 100,
                                price: 1.0,
                                bonus: '',
                                popular: true,
                                inStock: true,
                                image: '/assets/games/mlbb_tile_4k.jpg'
                              });
                              setIsAddingEventPkg(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>Add Event Diamond</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingMlbbEvent(event);
                              setMlbbEventFormData({
                                name: event.name,
                                badge: event.badge || 'Special Event',
                                banner: event.banner || '',
                                description: event.description || '',
                                isOpen: event.isOpen !== false
                              });
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer border-0"
                            title="Edit Event"
                          >
                            <Edit size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteMlbbEvent(event.id, event.name)}
                            className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 cursor-pointer border-0"
                            title="Delete Event"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Event Packages List */}
                      <div className="mt-4">
                        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-3">
                          Event Diamond Packs ({(event.packages || []).length})
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {(event.packages || []).map((pkg) => (
                            <div
                              key={pkg.id}
                              className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={pkg.image || '/assets/games/mlbb_tile_4k.jpg'}
                                  alt={pkg.name}
                                  className="w-9 h-9 rounded-lg object-cover border border-slate-700"
                                />
                                <div>
                                  <div className="font-bold text-white text-xs leading-tight">{pkg.name}</div>
                                  <div className="text-[11px] font-mono text-amber-400 mt-0.5 flex items-center gap-1">
                                    <span>${Number(pkg.price).toFixed(2)} USD</span>
                                    <span>•</span>
                                    <span>{pkg.diamonds}</span>
                                    <Gem size={11} className="text-amber-400" />
                                  </div>
                                  <div className={`mt-1 text-[9px] font-bold ${pkg.providerConnected ? 'text-emerald-400' : 'text-amber-300'}`}>
                                    {pkg.providerConnected
                                      ? `${selectedProviderName} Live · ${pkg.providerCode}`
                                      : `Edit to connect with ${selectedProviderName}`}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetEventId(event.id);
                                    setEditingEventPkg(pkg);
                                    setEventPkgFormData({
                                      name: pkg.name,
                                      providerCode: pkg.providerCode || pkg.code || '',
                                      diamonds: pkg.diamonds,
                                      price: pkg.price,
                                      bonus: pkg.bonus || '',
                                      popular: Boolean(pkg.popular),
                                      inStock: pkg.inStock !== false,
                                      image: pkg.image || '/assets/games/mlbb_tile_4k.jpg'
                                    });
                                  }}
                                  className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white border-0 cursor-pointer"
                                >
                                  <Edit size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEventPackage(event.id, pkg.id, pkg.name)}
                                  className="p-1 rounded bg-rose-500/15 text-rose-400 hover:bg-rose-500/30 border-0 cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: LIVE ORDERS & APPROVALS (Option 2)                 */}
        {/* ========================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#0e1017] p-6 rounded-2xl border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-white m-0">Live Orders & Admin Approvals</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    1-click Confirm & Mark Done for Roblox Robux and RoS Diamonds. Updates live on customer screen & Telegram!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchOrders}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Refresh Orders</span>
                </button>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  {['all', 'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setOrderFilter(f)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${orderFilter === f
                          ? 'bg-[#E3062F] text-white'
                          : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      {f === 'all' ? 'All Orders' : f === 'PENDING' ? 'Pending / Pre-order' : f}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search ref, player, game..."
                    className="w-full h-9 pl-8 pr-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#E3062F]"
                  />
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              {/* Orders Table (desktop) */}
              <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Ref & Time</th>
                      <th className="py-3 px-4">Game</th>
                      <th className="py-3 px-4">Player Account</th>
                      <th className="py-3 px-4">Package / Item</th>
                      <th className="py-3 px-4">Amount Paid</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No orders matching current filter.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => {
                        const isRoblox = String(order.gameId || order.game || '').toLowerCase().includes('roblox') || String(order.gameId || order.game || '').toLowerCase().includes('robux');
                        const isRoS = String(order.gameId || order.game || '').toLowerCase().includes('ros');
                        const isPending = ['PENDING', 'PROCESSING', 'Pending', 'PENDING_ADMIN'].includes(order.status);
                        const canApproveManually = isPending && (
                          order.source === 'manual' ||
                          isRoblox ||
                          isRoS
                        );

                        return (
                          <tr key={order.ref} className="hover:bg-slate-900/50 transition-colors">
                            <td className="py-3.5 px-4">
                              <span className="font-mono font-bold text-white block">{order.ref}</span>
                              <span className="text-[10px] text-slate-500">
                                {order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : 'Recent'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-bold text-slate-200">
                              {order.gameName || (isRoblox ? 'Roblox' : isRoS ? 'RoS Legacy' : 'Game')}
                            </td>

                            <td className="py-3.5 px-4 font-mono">
                              <div className="text-white font-bold">
                                {order.playerDetails?.account || order.playerDetails?.userId || order.verifiedPlayer || 'Player'}
                              </div>
                              {order.playerDetails?.password && (
                                <div className="text-[10px] text-amber-400 font-sans">
                                  Password: <code>{order.playerDetails.password}</code>
                                </div>
                              )}
                              {order.playerDetails?.gmail && (
                                <div className="text-[10px] text-slate-400">
                                  Gmail: {order.playerDetails.gmail}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="text-[#E3062F] font-bold block">{order.packageName} × {order.quantity || 1}</span>
                              <span className="text-[10px] text-slate-500">{order.paymentMethod || 'Bakong KHQR'}</span>
                            </td>

                            <td className="py-3.5 px-4 font-mono font-bold text-white">
                              ${Number(order.totalUsd || 0).toFixed(2)}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${isPending
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : order.status === 'COMPLETED' || order.status === 'DELIVERED'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}>
                                {isPending && <Clock size={12} className="animate-spin" />}
                                <span>{isPending ? 'Pending' : order.status}</span>
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              {canApproveManually ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleApproveOrder(order.ref, order.gameName, order.playerDetails?.account)}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer flex items-center gap-1 shadow-sm border-0"
                                    title="Mark order Done & Delivered"
                                  >
                                    <CheckCircle2 size={13} />
                                    <span>{isRoblox ? 'Done (Robux Sent)' : isRoS ? 'Done (Diamonds Added)' : 'Approve'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleCancelOrder(order.ref)}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs cursor-pointer border border-rose-500/40"
                                    title="Cancel Order"
                                  >
                                    <XCircle size={13} />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic">
                                  {isPending ? `Monitoring via ${order.source || 'gateway'}` : `Recorded via ${order.source || 'store'}`}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Orders — mobile card view (same data, nothing cut off) */}
              <div className="lg:hidden space-y-3">
                {filteredOrders.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 py-8 text-center text-slate-500 text-sm">No orders matching current filter.</div>
                ) : (
                  filteredOrders.map((order) => {
                    const isRoblox = String(order.gameId || order.game || '').toLowerCase().includes('roblox') || String(order.gameId || order.game || '').toLowerCase().includes('robux');
                    const isRoS = String(order.gameId || order.game || '').toLowerCase().includes('ros');
                    const isPending = ['PENDING', 'PROCESSING', 'Pending', 'PENDING_ADMIN'].includes(order.status);
                    const canApproveManually = isPending && (order.source === 'manual' || isRoblox || isRoS);
                    return (
                      <div key={order.ref} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-mono font-bold text-white text-sm truncate">{order.ref}</div>
                            <div className="text-[10px] text-slate-500">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : 'Recent'}</div>
                          </div>
                          <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${isPending ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : (order.status === 'COMPLETED' || order.status === 'DELIVERED') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                            {isPending && <Clock size={11} className="animate-spin" />}
                            <span>{isPending ? 'Pending' : order.status}</span>
                          </span>
                        </div>
                        <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                          <div><div className="text-slate-500">Game</div><div className="font-bold text-slate-200">{order.gameName || (isRoblox ? 'Roblox' : isRoS ? 'RoS Legacy' : 'Game')}</div></div>
                          <div><div className="text-slate-500">Amount</div><div className="font-mono font-bold text-white">${Number(order.totalUsd || 0).toFixed(2)}</div></div>
                          <div className="col-span-2">
                            <div className="text-slate-500">Player Account</div>
                            <div className="font-mono font-bold text-white break-all">{order.playerDetails?.account || order.playerDetails?.userId || order.verifiedPlayer || 'Player'}</div>
                            {order.playerDetails?.password && (<div className="text-[10px] text-amber-400 break-all">Password: <code>{order.playerDetails.password}</code></div>)}
                            {order.playerDetails?.gmail && (<div className="text-[10px] text-slate-400 break-all">Gmail: {order.playerDetails.gmail}</div>)}
                          </div>
                          <div className="col-span-2">
                            <div className="text-slate-500">Package / Item</div>
                            <div className="text-[#E3062F] font-bold">{order.packageName} × {order.quantity || 1}</div>
                            <div className="text-[10px] text-slate-500">{order.paymentMethod || 'Bakong KHQR'}</div>
                          </div>
                        </div>
                        {canApproveManually ? (
                          <div className="mt-3 flex items-center gap-2">
                            <button type="button" onClick={() => handleApproveOrder(order.ref, order.gameName, order.playerDetails?.account)} className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer flex items-center justify-center gap-1 border-0">
                              <CheckCircle2 size={13} /><span>{isRoblox ? 'Done (Robux)' : isRoS ? 'Done (Diamonds)' : 'Approve'}</span>
                            </button>
                            <button type="button" onClick={() => handleCancelOrder(order.ref)} className="px-3 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs cursor-pointer border border-rose-500/40 flex items-center gap-1">
                              <XCircle size={13} /><span>Cancel</span>
                            </button>
                          </div>
                        ) : (
                          <div className="mt-2.5 text-[10px] text-slate-500 italic">{isPending ? `Monitoring via ${order.source || 'gateway'}` : `Recorded via ${order.source || 'store'}`}</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SUPPORT & CONTACTS (Option 3)                      */}
        {/* ========================================================= */}
        {activeTab === 'contacts' && (
          <div className="max-w-2xl mx-auto bg-[#0e1017] p-6 sm:p-8 rounded-2xl border border-slate-800 animate-in fade-in duration-200">
            <div className="mb-6 pb-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white m-0">Website Brand Logo & Support Links</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Update the official website logo (with auto-cut background) and Telegram, Facebook, and hotline links.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('stock')}
                className="px-3 py-1.5 rounded-xl bg-[#E3062F]/15 hover:bg-[#E3062F]/25 text-[#ff4d6d] text-xs font-black border border-[#E3062F]/40 flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={13} />
                <span>Full Logo Studio</span>
              </button>
            </div>

            {/* Quick Website Logo Control inside Support & Contacts */}
            <div className="mb-6 p-4 rounded-2xl border border-[#E3062F]/30 bg-slate-950/60 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className="w-16 h-16 rounded-xl border border-slate-700 flex items-center justify-center p-1.5 shrink-0 overflow-hidden"
                  style={{
                    backgroundImage:
                      'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                    backgroundSize: '12px 12px',
                    backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
                    backgroundColor: '#0f172a',
                  }}
                >
                  <img
                    src={(isValidLogoUrl(siteLogoState) && siteLogoState) || getSiteLogo() || DEFAULT_SITE_LOGO}
                    alt="Website Brand Logo"
                    className="w-full h-full object-contain drop-shadow-md"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = DEFAULT_SITE_LOGO;
                    }}
                  />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                    <span>Website Master Logo</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                      Auto-Cut BG Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 m-0">
                    Updates Navbar, Hero Banner, Footer, Order Lookup, Receipts & Favicon simultaneously.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  id="contacts-site-logo-file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await handleUploadSiteLogoFile(file);
                    e.target.value = '';
                  }}
                />
                <label
                  htmlFor="contacts-site-logo-file"
                  className="px-3.5 py-2 rounded-xl bg-[#E3062F] hover:bg-rose-700 text-white text-xs font-black cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <UploadCloud size={14} />
                  <span>{isProcessingSiteLogo ? 'Cutting BG...' : 'Upload Logo (Auto-Cut BG)'}</span>
                </label>
                <button
                  type="button"
                  onClick={handleManualCutSiteLogo}
                  disabled={isProcessingSiteLogo}
                  className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold cursor-pointer flex items-center gap-1"
                >
                  <Sparkles size={13} />
                  <span>Cut BG</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveContacts} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Telegram Username Handle (Admin)
                </label>
                <input
                  type="text"
                  value={contactsData.telegramUsername || ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const clean = raw.replace(/^@/, '').trim();
                    const formattedUsername = clean ? `@${clean}` : '';
                    const formattedUrl = clean ? `https://t.me/${clean}` : contactsData.telegramUrl;
                    setContactsData({
                      ...contactsData,
                      telegramUsername: formattedUsername,
                      telegramUrl: formattedUrl,
                      telegramAdmin1Name: formattedUsername || contactsData.telegramAdmin1Name,
                    });
                  }}
                  placeholder="@Yur1Uchiha"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-[#E3062F]"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Automatically syncs with storefront footer, header, support chat widget, and Telegram Bot!
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Telegram Support Direct URL
                </label>
                <input
                  type="text"
                  value={contactsData.telegramUrl || ''}
                  onChange={(e) => {
                    let val = e.target.value.trim();
                    if (val.startsWith('@')) val = `https://t.me/${val.slice(1)}`;
                    setContactsData({ ...contactsData, telegramUrl: val });
                  }}
                  placeholder="https://t.me/Yur1Uchiha"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-[#E3062F]"
                />
                <span className="text-[11px] text-cyan-400 font-mono mt-1 block">
                  Live link: {contactsData.telegramUrl || 'https://t.me/Yur1Uchiha'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Facebook Page / Messenger URL
                </label>
                <input
                  type="text"
                  value={contactsData.facebookUrl || ''}
                  onChange={(e) => setContactsData({ ...contactsData, facebookUrl: e.target.value })}
                  placeholder="https://facebook.com/yurigamestore"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-[#E3062F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Hotline / Phone Number
                </label>
                <input
                  type="text"
                  value={contactsData.supportPhone || ''}
                  onChange={(e) => setContactsData({ ...contactsData, supportPhone: e.target.value })}
                  placeholder="+855 12 345 678"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-[#E3062F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Operating Hours Banner
                </label>
                <input
                  type="text"
                  value={contactsData.supportHours || ''}
                  onChange={(e) => setContactsData({ ...contactsData, supportHours: e.target.value })}
                  placeholder="24/7 Fast & Friendly Support"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#E3062F]"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-[#E3062F] hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border-0 shadow-lg"
                >
                  <Save size={16} />
                  <span>Save Contact Settings Live</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: SLIDE BANNERS (Option 4)                           */}
        {/* ========================================================= */}
        {activeTab === 'banners' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#0e1017] p-6 rounded-2xl border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-black text-white m-0">Promotional Slide Banners</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Upload new promotional slides, change banner images, edit headings, or remove banners from the storefront carousel.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setBannerFormData({
                      title: '',
                      subtitle: '',
                      actionLabel: 'Shop Now',
                      image: '/assets/games/mlbb_hero_4k.jpg',
                      gameSlug: 'mobile-legends',
                      active: true
                    });
                    setIsAddingBanner(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer border-0"
                >
                  <Plus size={16} />
                  <span>Add New Banner Slide</span>
                </button>
              </div>

              {/* Banners List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(config?.banners || []).map((b) => (
                  <div
                    key={b.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden flex flex-col justify-between"
                  >
                    <div className="relative h-44 bg-slate-950">
                      <img
                        src={b.image || getFallbackBanner(b.gameSlug)}
                        alt={b.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getFallbackBanner(b.gameSlug);
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 flex flex-col justify-end">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#E3062F] text-white w-max mb-1">
                          {b.gameSlug}
                        </span>
                        <h4 className="text-white font-black text-base leading-tight m-0">{b.title}</h4>
                        <p className="text-xs text-slate-300 mt-1 line-clamp-1">{b.subtitle}</p>
                      </div>
                    </div>

                    <div className="p-4 flex items-center justify-between border-t border-slate-800 bg-[#0c0e14]">
                      <span className={`text-xs font-bold ${b.active ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {b.active ? '● Active Slide' : '○ Inactive'}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBanner(b);
                            setBannerFormData({
                              title: b.title,
                              subtitle: b.subtitle,
                              actionLabel: b.actionLabel || 'Shop Now',
                              image: b.image,
                              gameSlug: b.gameSlug,
                              active: b.active !== false
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold cursor-pointer border-0 flex items-center gap-1"
                        >
                          <Edit size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBanner(b.id, b.title)}
                          className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/30 cursor-pointer border-0"
                          title="Delete Banner"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: WEBSITE LOGO & GAME STOCK CONTROL                  */}
        {/* ========================================================= */}
        {activeTab === 'stock' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* WEBSITE BRAND LOGO & AUTO-CUT BACKGROUND STUDIO */}
            <div className="bg-[#0e1017] p-6 rounded-2xl border border-[#E3062F]/40 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E3062F] via-amber-400 to-emerald-400" />

              <div className="flex flex-wrap items-start justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles size={20} className="text-[#E3062F]" />
                    <h2 className="text-xl font-black text-white m-0">
                      Website Master Logo & Auto Background Cutter
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                      Syncs Everywhere Live
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 m-0">
                    Upload any logo image — it automatically cuts out white, black, or any colored background into a clean transparent PNG and updates the Navbar, Hero Banner, Footer, Order Lookup, Receipts, and Browser Favicon immediately.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {originalSiteLogo && (
                    <button
                      type="button"
                      onClick={handleUndoCutSiteLogo}
                      className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw size={13} />
                      <span>Undo Cut</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetSiteLogo}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw size={13} />
                    <span>Reset Default Logo</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
                {/* Left: Live Transparent Checkerboard Preview + Mini Navbar Preview */}
                <div className="flex flex-col gap-3">
                  <div
                    className="h-44 w-full rounded-2xl border border-slate-700 flex flex-col items-center justify-center p-4 relative overflow-hidden shadow-inner"
                    style={{
                      backgroundImage:
                        'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
                      backgroundColor: '#0f172a',
                    }}
                  >
                    <img
                      src={(isValidLogoUrl(siteLogoState) && siteLogoState) || getSiteLogo() || DEFAULT_SITE_LOGO}
                      alt="Website Brand Logo Preview"
                      className="max-h-32 max-w-full object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.65)] transition-transform duration-200 hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_SITE_LOGO;
                      }}
                    />
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/75 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                      Transparent PNG Preview
                    </span>
                  </div>

                  {/* Live Storefront Header Simulation */}
                  <div className="rounded-xl border border-slate-800 bg-[#07090e] px-3.5 py-2.5 flex items-center justify-between gap-2 overflow-hidden">
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <YuriGameLogo size="sm" showBadge={false} inverse />
                    </div>
                    <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Header
                    </span>
                  </div>
                </div>

                {/* Right: Upload Actions & Smart Background Auto-Cut Engine Settings */}
                <div className="space-y-4">
                  {/* Primary Upload & Cut Buttons */}
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="file"
                      id="master-site-logo-upload"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await handleUploadSiteLogoFile(file);
                        e.target.value = '';
                      }}
                    />
                    <label
                      htmlFor="master-site-logo-upload"
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#E3062F] to-rose-600 hover:from-rose-600 hover:to-[#E3062F] text-white font-black text-xs uppercase tracking-wider cursor-pointer flex items-center gap-2 shadow-lg transition-transform active:scale-[0.99]"
                    >
                      <UploadCloud size={17} />
                      <span>
                        {isProcessingSiteLogo
                          ? 'Processing & Cutting Background...'
                          : autoCutLogoBg
                            ? 'Upload New Logo (Auto-Cut Background)'
                            : 'Upload New Website Logo'}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={handleManualCutSiteLogo}
                      disabled={isProcessingSiteLogo}
                      className="px-4 py-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-black text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-colors"
                      title="Cut white, black, or colored background from the current logo right now"
                    >
                      <Sparkles size={15} />
                      <span>Cut Current Logo Background Now</span>
                    </button>
                  </div>

                  {/* Smart Auto-Cut Background Controls (Applies to Website Logo & Game Logos) */}
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs font-black text-white cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={autoCutLogoBg}
                          onChange={(e) => setAutoCutLogoBg(e.target.checked)}
                          className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                        />
                        <Sparkles size={14} className="text-emerald-400" />
                        <span>Auto-Cut Logo Background on Upload (Website Logo & Game Logos)</span>
                      </label>

                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={logoCutInner}
                          onChange={(e) => setLogoCutInner(e.target.checked)}
                          className="accent-emerald-500 w-3.5 h-3.5 rounded cursor-pointer"
                        />
                        <span>Also Cut Inner Background Holes (inside letters O, A, B)</span>
                      </label>
                    </div>

                    {/* Background Color Target Selector */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-400 mr-1">
                          Background Color to Cut:
                        </span>
                        {[
                          { id: 'auto', label: 'Auto Detect (White / Black / Any Color)' },
                          { id: 'white', label: 'White BG' },
                          { id: 'black', label: 'Black BG' },
                          { id: 'custom', label: 'Pick Specific Color' },
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => setLogoBgColorMode(mode.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors ${logoBgColorMode === mode.id
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                              }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                        {logoBgColorMode === 'custom' && (
                          <input
                            type="color"
                            value={logoCustomBgHex}
                            onChange={(e) => setLogoCustomBgHex(e.target.value)}
                            className="w-7 h-7 rounded cursor-pointer border border-slate-700 bg-transparent p-0"
                            title="Select background color to cut out"
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-semibold">
                          Cut Strength ({logoTolerance}):
                        </span>
                        <input
                          type="range"
                          min="15"
                          max="95"
                          value={logoTolerance}
                          onChange={(e) => setLogoTolerance(Number(e.target.value))}
                          className="w-28 accent-emerald-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Direct Logo Image URL Input with Auto-Cut */}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={siteLogoUrlInput}
                      onChange={(e) => setSiteLogoUrlInput(e.target.value)}
                      placeholder="Or paste direct logo image URL (https://... or /assets/...) and click Apply"
                      className="flex-1 min-w-[220px] h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#E3062F]"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const rawUrl = siteLogoUrlInput.trim();
                        if (!rawUrl) {
                          showToast('Paste a logo image URL first.');
                          return;
                        }
                        setIsProcessingSiteLogo(true);
                        try {
                          setOriginalSiteLogo(rawUrl);
                          if (autoCutLogoBg) {
                            const cutUrl = await removeImageBackground(rawUrl, logoTolerance, 20, {
                              targetColor: resolveLogoTargetColor(),
                              cutInnerHoles: logoCutInner,
                              trim: true,
                            });
                            await handleSaveSiteLogo(cutUrl || rawUrl, 'Logo URL applied & background auto-cut!');
                          } else {
                            await handleSaveSiteLogo(rawUrl, 'Logo URL applied across the website!');
                          }
                          setSiteLogoUrlInput('');
                        } catch {
                          await handleSaveSiteLogo(rawUrl, 'Logo URL applied across the website!');
                        } finally {
                          setIsProcessingSiteLogo(false);
                        }
                      }}
                      className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black border border-slate-700 cursor-pointer"
                    >
                      Apply URL
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#0e1017] p-6 rounded-2xl border border-slate-800">
              <div className="mb-6 pb-4 border-b border-slate-800">
                <h2 className="text-xl font-black text-white m-0">Game Stock Status & Logo Manager</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click to open or close stock for any game, or upload game logos (with automatic background removal).
                </p>
              </div>

              {/* Coming Soon Games Manager */}
              <div className="mb-6 rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-white m-0 flex items-center gap-2"><Sparkles size={16} className="text-violet-400" /> Coming Soon Games</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 m-0">Add a logo + name — it appears on the home page as a "Coming Soon" tile (not purchasable). Remove it anytime.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddComingSoon((v) => !v)}
                    className="px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border border-dashed border-violet-500/50 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 cursor-pointer transition-all shrink-0"
                  >
                    <Plus size={14} /><span>{showAddComingSoon ? 'Close' : 'Add Coming Soon Game'}</span>
                  </button>
                </div>

                {showAddComingSoon && (
                  <div className="mb-4 rounded-xl border border-slate-700 bg-[#0e1017] p-4">
                    <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-24 w-24 rounded-xl border border-slate-700 bg-slate-900 overflow-hidden flex items-center justify-center">
                          {comingSoonImage ? <img src={comingSoonImage} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] text-slate-500 text-center px-2">No logo yet</span>}
                        </div>
                        <input
                          type="file"
                          id="cs-logo-file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const opt = await processLogoFileWithAutoCut(file, {
                                  maxWidth: 800,
                                  tolerance: logoTolerance,
                                  feather: 20,
                                  targetColor: resolveLogoTargetColor(),
                                  cutInnerHoles: logoCutInner,
                                  autoCut: autoCutLogoBg,
                                });
                                if (opt) setComingSoonImage(opt);
                              } catch { showToast('Failed to process image'); }
                            }
                            e.target.value = '';
                          }}
                        />
                        <label htmlFor="cs-logo-file" className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 cursor-pointer flex items-center gap-1.5">
                          <UploadCloud size={13} className="text-violet-400" /> Upload Logo (Auto-Cut)
                        </label>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">Game Name</label>
                        <input
                          type="text"
                          value={comingSoonName}
                          onChange={(e) => setComingSoonName(e.target.value)}
                          placeholder="e.g. Genshin Impact"
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-violet-500"
                        />
                        <div className="mt-auto flex gap-2 pt-2">
                          <button
                            type="button"
                            disabled={addingComingSoon || !comingSoonName.trim()}
                            onClick={handleAddComingSoon}
                            className={`flex-1 py-2.5 rounded-xl font-black text-sm border-0 text-white ${addingComingSoon || !comingSoonName.trim() ? 'bg-slate-700 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500 cursor-pointer'}`}
                          >
                            {addingComingSoon ? 'Adding…' : 'Done — Show on Home'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowAddComingSoon(false); setComingSoonName(''); setComingSoonImage(''); }}
                            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border-0 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(config?.comingSoonGames || []).length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {(config?.comingSoonGames || []).map((g) => (
                      <div key={g.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-2.5 flex flex-col items-center text-center gap-2">
                        <div className="h-16 w-16 rounded-lg border border-slate-700 bg-slate-900 overflow-hidden flex items-center justify-center">
                          {g.image ? <img src={g.image} alt="" className="h-full w-full object-cover" /> : <span className="text-[9px] text-slate-500">No logo</span>}
                        </div>
                        <div className="text-xs font-bold text-white truncate w-full">{g.name}</div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-violet-300">Coming Soon</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveComingSoon(g.id, g.name)}
                          className="w-full mt-1 py-1.5 rounded-lg bg-rose-600/15 text-rose-300 hover:bg-rose-600/30 text-[11px] font-black border border-rose-500/40 cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">No coming-soon games yet. Click "Add Coming Soon Game" to create one.</p>
                )}
              </div>

              {/* Default Game Stock Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(config?.games || []).map((game) => (
                  <div
                    key={game.id}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative mb-3 rounded-xl overflow-hidden h-32 bg-slate-950">
                        <img
                          src={getSafeAdminGameImage(game)}
                          alt={game.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getFallbackGameTile(game);
                          }}
                        />
                        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${game.stockOpen ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'
                          }`}>
                          {game.stockOpen ? 'OPEN' : 'CLOSED'}
                        </span>
                      </div>

                      <h3 className="text-base font-black text-white m-0">{game.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Currency: <strong>{game.currency}</strong>
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleGameStock(game.id, game.stockOpen)}
                        className={`w-full py-2.5 px-3 rounded-xl font-black text-xs cursor-pointer border-0 transition-transform active:scale-[0.98] flex items-center justify-center gap-1.5 ${game.stockOpen
                            ? 'bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/40'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                          }`}
                      >
                        <Power size={14} />
                        <span>{game.stockOpen ? 'Click to Close Stock' : 'Click to Open Stock'}</span>
                      </button>

                      {/* Maintenance / Cannot Top-Up toggle (use when the provider/game server is down) */}
                      <button
                        type="button"
                        onClick={() => handleToggleGameMaintenance(game.id, game.maintenance === true)}
                        className={`w-full py-2.5 px-3 rounded-xl font-black text-xs cursor-pointer border-0 transition-transform active:scale-[0.98] flex items-center justify-center gap-1.5 ${game.maintenance === true
                            ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg'
                            : 'bg-amber-600/15 text-amber-300 hover:bg-amber-600/25 border border-amber-500/40'
                          }`}
                      >
                        <AlertCircle size={14} />
                        <span>{game.maintenance === true ? 'Maintenance ON — click to allow top-up' : 'Mark "Cannot Top-Up" (Maintenance)'}</span>
                      </button>

                      {/* Native Device File Input for Game Logo */}
                      <div className="relative">
                        <input
                          type="file"
                          id={`game-logo-file-${game.id}`}
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                showToast(
                                  autoCutLogoBg
                                    ? `Uploading & auto-cutting background for ${game.name}...`
                                    : `Optimizing & uploading logo for ${game.name}...`
                                );
                                const optimized = await processLogoFileWithAutoCut(file, {
                                  maxWidth: 800,
                                  tolerance: logoTolerance,
                                  feather: 20,
                                  targetColor: resolveLogoTargetColor(),
                                  cutInnerHoles: logoCutInner,
                                  autoCut: autoCutLogoBg,
                                });
                                if (optimized) {
                                  await handleUpdateGameInfo(game.id, { image: optimized });
                                  showToast(`Logo for ${game.name} updated (background auto-cut)!`);
                                }
                              } catch (err) {
                                showToast('Failed to process image');
                              }
                            }
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                        <label
                          htmlFor={`game-logo-file-${game.id}`}
                          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <UploadCloud size={14} className="text-[#E3062F]" />
                          <span>Upload Logo (Auto-Cut BG)</span>
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCutExistingGameLogo(game)}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold border border-emerald-500/30 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                        title="Cut white, black, or colored background from this game's current logo"
                      >
                        <Sparkles size={13} />
                        <span>Cut Existing Logo Background</span>
                      </button>

                      {/* Native Device File Input for Game Cover Banner */}
                      <div className="relative">
                        <input
                          type="file"
                          id={`game-banner-file-${game.id}`}
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                showToast(`Optimizing & uploading cover banner for ${game.name}...`);
                                const optimized = await compressImageFile(file, 1600, 0.85);
                                if (optimized) {
                                  await handleUpdateGameInfo(game.id, { banner: optimized });
                                  showToast(`Cover banner for ${game.name} updated from device!`);
                                }
                              } catch (err) {
                                showToast('Failed to process image');
                              }
                            }
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                        <label
                          htmlFor={`game-banner-file-${game.id}`}
                          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <UploadCloud size={14} className="text-amber-400" />
                          <span>Upload Banner (PC / Phone)</span>
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const newUrl = window.prompt(`Enter direct image URL for ${game.name}:`, game.image);
                          if (newUrl && newUrl.trim()) {
                            handleUpdateGameInfo(game.id, { image: newUrl.trim() });
                          }
                        }}
                        className="w-full text-center text-[11px] text-slate-400 hover:text-slate-300 cursor-pointer py-1"
                      >
                        Or paste image link URL
                      </button>

                      {/* Remove button — only for imported games (core/default games are protected). */}
                      {!['robuxsend', 'ml', 'ff', 'roslegacy', 'rosangkor'].includes(String(game.id || '').toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveGame(game.id, game.name)}
                          className="w-full mt-1 py-2 px-3 rounded-xl bg-rose-600/15 text-rose-300 hover:bg-rose-600/30 text-xs font-black border border-rose-500/40 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Trash2 size={14} />
                          <span>Remove Game</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: TELEGRAM BOT & SYSTEM ALERTS (Option 6)            */}
        {/* ========================================================= */}
        {activeTab === 'telegram' && (
          <div className="max-w-3xl mx-auto bg-[#0e1017] p-6 sm:p-8 rounded-2xl border border-slate-800 animate-in fade-in duration-200">
            <div className="mb-6 pb-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Send size={22} className="text-cyan-400" />
                  <h2 className="text-xl font-black text-white m-0">Telegram Bot & Notifications (Option 6)</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Configure dynamic Telegram admin recipients, 2FA OTP destinations, and order notifications.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={isTestingTelegram}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#229ED9]/15 hover:bg-[#229ED9]/25 text-[#229ED9] border border-[#229ED9]/30 text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Zap size={14} />
                <span>{isTestingTelegram ? 'Sending Test...' : 'Send Test Notification'}</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Bot Status</span>
                  <span className="text-slate-400">Live long-polling active for <code>/admin</code> command & inline delivery buttons</span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ACTIVE & LISTENING</span>
                </span>
              </div>

              {/* Form for Dynamic Telegram Configuration */}
              <form onSubmit={handleSaveContacts} className="space-y-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="font-black text-white block text-sm uppercase tracking-wider text-slate-300">
                  Registered Admins & Supergroup Configuration
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Primary Admin 1 Telegram ID
                    </label>
                    <input
                      type="text"
                      value={contactsData.telegramAdmin1Id || ''}
                      onChange={(e) => setContactsData({ ...contactsData, telegramAdmin1Id: e.target.value })}
                      placeholder="6805487598"
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Admin 1 Username / Handle
                    </label>
                    <input
                      type="text"
                      value={contactsData.telegramAdmin1Name || ''}
                      onChange={(e) => setContactsData({ ...contactsData, telegramAdmin1Name: e.target.value })}
                      placeholder="@Yur1Uchiha"
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Secondary Admin 2 Telegram ID
                    </label>
                    <input
                      type="text"
                      value={contactsData.telegramAdmin2Id || ''}
                      onChange={(e) => setContactsData({ ...contactsData, telegramAdmin2Id: e.target.value })}
                      placeholder="7283817695"
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Admin 2 Username / Handle
                    </label>
                    <input
                      type="text"
                      value={contactsData.telegramAdmin2Name || ''}
                      onChange={(e) => setContactsData({ ...contactsData, telegramAdmin2Name: e.target.value })}
                      placeholder="@kaixite"
                      className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Notification Supergroup Chat ID
                  </label>
                  <input
                    type="text"
                    value={contactsData.telegramGroupId || ''}
                    onChange={(e) => setContactsData({ ...contactsData, telegramGroupId: e.target.value })}
                    placeholder="-1004493408552"
                    className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    All instant order alerts and customer payment notices are dispatched here.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-400 font-medium">
                    ✓ Changes take effect immediately without server restart
                  </span>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#E3062F] hover:bg-[#c20527] text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#E3062F]/30 transition active:scale-95 cursor-pointer"
                  >
                    Save Telegram Settings
                  </button>
                </div>
              </form>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-amber-200">
                <span className="font-black flex items-center gap-1.5 text-sm"><HelpCircle size={15} /><span>How Telegram /admin works:</span></span>
                <p className="leading-relaxed">
                  Admins can simply open Telegram, message the bot or type <code className="bg-black/50 px-1 py-0.5 rounded text-amber-300">/admin</code> in the group chat.
                  The bot verifies their admin identity and instantly replies with a secure one-click link to open this Admin Control Panel with no PIN required!
                </p>
              </div>

              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-2 text-cyan-200">
                <span className="font-black flex items-center gap-1.5 text-sm"><Sparkles size={15} /><span>MLBB Event Telegram Alerts:</span></span>
                <p className="leading-relaxed">
                  When customers purchase from an MLBB Event (e.g. Weekly Diamond Pass Event or Mega Event), the Telegram notification highlights:
                  <br />
                  <code className="bg-black/60 text-yellow-300 px-1 py-0.5 rounded block mt-1">
                    [MLBB SPECIAL EVENT: Event Name] • User ID: 12345 (Zone: 2042)
                  </code>
                  When purchased from normal diamonds, it clearly highlights:
                  <br />
                  <code className="bg-black/60 text-cyan-300 px-1 py-0.5 rounded block mt-1">
                    [MLBB REGULAR TOP-UP] • Standard Store Diamonds
                  </code>
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT PRODUCT PACKAGE                         */}
      {/* ========================================================= */}
      {(isAddingPackage || editingPackage) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0e1017] border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white m-0">
                {editingPackage ? 'Edit Product Package' : `Add Package to ${selectedGame?.name}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddingPackage(false);
                  setEditingPackage(null);
                }}
                className="text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Package Display Name</label>
                <input
                  type="text"
                  required
                  value={packageFormData.name}
                  onChange={(e) => setPackageFormData({ ...packageFormData, name: e.target.value })}
                  placeholder="e.g. 500 Diamonds or 100 Robux"
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#E3062F]"
                />
              </div>

              {isSoraSupportedGame(selectedGame?.providerCode || selectedGame?.id) ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <label className="mb-1 block font-bold text-emerald-300">SoraTopup Live Product</label>
                  <select
                    value={liveProviderPackages.find((pkg) => pkg.providerCode.toLowerCase() === String(packageFormData.providerCode || '').toLowerCase())?.providerCode || packageFormData.providerCode}
                    onChange={(e) => applyLiveProviderPackage(e.target.value, false)}
                    disabled={isLoadingLivePackages}
                    className="h-10 w-full rounded-xl border border-emerald-500/30 bg-slate-900 px-3 text-white outline-none focus:border-emerald-400 disabled:opacity-60"
                  >
                    <option value="">Auto-match from name and credits</option>
                    {liveProviderPackages.map((pkg) => (
                      <option key={pkg.providerCode} value={pkg.providerCode}>
                        {pkg.providerCode} · {pkg.name} · ${Number(pkg.price).toFixed(2)} provider cost
                      </option>
                    ))}
                  </select>
                  <div className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
                    {isLoadingLivePackages
                      ? 'Loading current SoraTopup products...'
                      : liveProviderError
                        ? <span className="text-amber-400">Custom SKU (saved directly to store)</span>
                        : packageFormData.providerCode
                          ? <span className="text-emerald-400">Connected SKU: {packageFormData.providerCode}</span>
                          : 'Exact diamond amounts and Weekly names connect automatically when saved.'}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Sparkles size={14} className="text-amber-400" />
                    <span>Admin Direct Delivery Package</span>
                  </div>
                  <div className="mt-1 text-[11px] leading-relaxed text-slate-400">
                    Orders for this game are fulfilled directly by store admin. Product images, names, and prices save instantly.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Quantity (Credits)</label>
                  <input
                    type="number"
                    required
                    value={packageFormData.diamonds}
                    onChange={(e) => setPackageFormData({ ...packageFormData, diamonds: Number(e.target.value) })}
                    placeholder="100"
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-[#E3062F]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Price ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={packageFormData.price}
                    onChange={(e) => setPackageFormData({ ...packageFormData, price: Number(e.target.value) })}
                    placeholder="1.00"
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-[#E3062F]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Promo / Bonus Badge (Optional)</label>
                <input
                  type="text"
                  value={packageFormData.bonus}
                  onChange={(e) => setPackageFormData({ ...packageFormData, bonus: e.target.value })}
                  placeholder="e.g. 20% OFF or BEST VALUE"
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#E3062F]"
                />
              </div>

              <ImageUploadPicker
                label="Diamond / Robux Package Icon (from PC or Phone)"
                value={packageFormData.image}
                onChange={(val) => setPackageFormData({ ...packageFormData, image: val })}
                placeholder="Click to choose icon from your PC or Phone"
                aspectRatio="square"
                maxDimension={512}
                helperText="Icon displayed for this diamond / robux package on YuriGame store."
              />

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={packageFormData.inStock}
                    onChange={(e) => setPackageFormData({ ...packageFormData, inStock: e.target.checked })}
                    className="checkbox checkbox-sm checkbox-error"
                  />
                  <span className="font-bold text-slate-300">In Stock</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={packageFormData.popular}
                    onChange={(e) => setPackageFormData({ ...packageFormData, popular: e.target.checked })}
                    className="checkbox checkbox-sm checkbox-error"
                  />
                  <span className="font-bold text-slate-300">Hot / Popular</span>
                </label>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingPackage(false);
                    setEditingPackage(null);
                  }}
                  className="flex-1 h-10 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-[#E3062F] hover:bg-rose-700 text-white font-bold cursor-pointer border-0"
                >
                  Save Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT MLBB EVENT CATEGORY                     */}
      {/* ========================================================= */}
      {(isAddingMlbbEvent || editingMlbbEvent) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0e1017] border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white m-0">
                {editingMlbbEvent ? 'Edit MLBB Event Category' : 'Create New MLBB Event Category'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddingMlbbEvent(false);
                  setEditingMlbbEvent(null);
                }}
                className="text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMlbbEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Event Category Name</label>
                <input
                  type="text"
                  required
                  value={mlbbEventFormData.name}
                  onChange={(e) => setMlbbEventFormData({ ...mlbbEventFormData, name: e.target.value })}
                  placeholder="e.g. Weekly Diamond Pass Event"
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#E3062F]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Event Badge Label</label>
                <input
                  type="text"
                  value={mlbbEventFormData.badge}
                  onChange={(e) => setMlbbEventFormData({ ...mlbbEventFormData, badge: e.target.value })}
                  placeholder="e.g. Special Event or Limited Time"
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#E3062F]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Description / Promo Text</label>
                <input
                  type="text"
                  value={mlbbEventFormData.description}
                  onChange={(e) => setMlbbEventFormData({ ...mlbbEventFormData, description: e.target.value })}
                  placeholder="e.g. Save 60% with instant automated delivery"
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#E3062F]"
                />
              </div>

              <ImageUploadPicker
                label="Event Banner / Cover Image (from PC or Phone)"
                value={mlbbEventFormData.banner}
                onChange={(val) => setMlbbEventFormData({ ...mlbbEventFormData, banner: val })}
                placeholder="Click to choose event cover from PC or Phone"
                aspectRatio="banner"
                helperText="Wide cover image shown at the top of this special event category."
              />

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <input
                    type="checkbox"
                    checked={mlbbEventFormData.isOpen}
                    onChange={(e) => setMlbbEventFormData({ ...mlbbEventFormData, isOpen: e.target.checked })}
                    className="checkbox checkbox-sm checkbox-warning"
                  />
                  <div>
                    <span className="font-bold text-white block">Category Open (Visible to Users)</span>
                    <span className="text-[10px] text-slate-400">If unchecked, category is Closed and users cannot see it.</span>
                  </div>
                </label>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingMlbbEvent(false);
                    setEditingMlbbEvent(null);
                  }}
                  className="flex-1 h-10 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black cursor-pointer border-0"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT MLBB EVENT PACKAGE                      */}
      {/* ========================================================= */}
      {(isAddingEventPkg || editingEventPkg) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0e1017] border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white m-0">
                {editingEventPkg ? 'Edit Event Diamond Pack' : 'Add Diamond Pack to Event'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddingEventPkg(false);
                  setEditingEventPkg(null);
                }}
                className="text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEventPackage} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Package Name</label>
                <input
                  type="text"
                  required
                  value={eventPkgFormData.name}
                  onChange={(e) => setEventPkgFormData({ ...eventPkgFormData, name: e.target.value })}
                  placeholder="e.g. 250 Diamonds (Event Special)"
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                <label className="mb-1 block font-bold text-emerald-300">SoraTopup Live Product</label>
                <select
                  value={liveProviderPackages.find((pkg) => pkg.providerCode.toLowerCase() === String(eventPkgFormData.providerCode || '').toLowerCase())?.providerCode || eventPkgFormData.providerCode}
                  onChange={(e) => applyLiveProviderPackage(e.target.value, true)}
                  disabled={isLoadingLivePackages}
                  className="h-10 w-full rounded-xl border border-emerald-500/30 bg-slate-900 px-3 text-white outline-none focus:border-emerald-400 disabled:opacity-60"
                >
                  <option value="">Auto-match from package name and diamonds</option>
                  {liveProviderPackages.map((pkg) => (
                    <option key={pkg.providerCode} value={pkg.providerCode}>
                      {pkg.providerCode} · {pkg.name} · ${Number(pkg.price).toFixed(2)} provider cost
                    </option>
                  ))}
                </select>
                <div className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
                  {isLoadingLivePackages
                    ? 'Loading current SoraTopup products...'
                    : liveProviderError
                      ? <span className="text-rose-400">{liveProviderError}</span>
                      : eventPkgFormData.providerCode
                        ? <span className="text-emerald-400">Connected SKU: {eventPkgFormData.providerCode}</span>
                        : 'Weekly, 2Weekly, and exact diamond products connect automatically when saved.'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Number of Diamonds</label>
                  <input
                    type="number"
                    required
                    value={eventPkgFormData.diamonds}
                    onChange={(e) => setEventPkgFormData({ ...eventPkgFormData, diamonds: Number(e.target.value) })}
                    placeholder="250"
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Price ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={eventPkgFormData.price}
                    onChange={(e) => setEventPkgFormData({ ...eventPkgFormData, price: Number(e.target.value) })}
                    placeholder="3.50"
                    className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Promo Badge</label>
                <input
                  type="text"
                  value={eventPkgFormData.bonus}
                  onChange={(e) => setEventPkgFormData({ ...eventPkgFormData, bonus: e.target.value })}
                  placeholder="e.g. +25 FREE"
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <ImageUploadPicker
                label="Event Diamond Pack Icon (from PC or Phone)"
                value={eventPkgFormData.image}
                onChange={(val) => setEventPkgFormData({ ...eventPkgFormData, image: val })}
                placeholder="Click to choose event diamond icon from PC or Phone"
                aspectRatio="square"
                maxDimension={512}
                helperText="Icon displayed for this event diamond package."
              />

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingEventPkg(false);
                    setEditingEventPkg(null);
                  }}
                  className="flex-1 h-10 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black cursor-pointer border-0"
                >
                  Save Event Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT SLIDE BANNER (Option 4)                 */}
      {/* ========================================================= */}
      {(isAddingBanner || editingBanner) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0e1017] border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white m-0">
                {editingBanner ? 'Edit Slide Banner' : 'Add New Slide Banner'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddingBanner(false);
                  setEditingBanner(null);
                }}
                className="text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Banner Title</label>
                <input
                  type="text"
                  required
                  value={bannerFormData.title}
                  onChange={(e) => setBannerFormData({ ...bannerFormData, title: e.target.value })}
                  placeholder="e.g. Roblox Robux Instant Delivery"
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#E3062F]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Subtitle / Notice</label>
                <input
                  type="text"
                  value={bannerFormData.subtitle}
                  onChange={(e) => setBannerFormData({ ...bannerFormData, subtitle: e.target.value })}
                  placeholder="e.g. Official Username Verification"
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#E3062F]"
                />
              </div>

              <ImageUploadPicker
                label="Slide Banner Image (from PC or Phone)"
                value={bannerFormData.image}
                onChange={(val) => setBannerFormData({ ...bannerFormData, image: val })}
                placeholder="Click to choose wide promo slide from PC or Phone"
                aspectRatio="banner"
                helperText="High-res banner slide displayed in the hero carousel on YuriGame home."
              />

              <div>
                <label className="block font-bold text-slate-300 mb-1">Target Game Slug</label>
                <select
                  value={bannerFormData.gameSlug}
                  onChange={(e) => setBannerFormData({ ...bannerFormData, gameSlug: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#E3062F]"
                >
                  <option value="roblox">Roblox</option>
                  <option value="mobile-legends">Mobile Legends KH</option>
                  <option value="free-fire">Free Fire</option>
                  <option value="ros-legacy">RoS Legacy</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bannerFormData.active}
                    onChange={(e) => setBannerFormData({ ...bannerFormData, active: e.target.checked })}
                    className="checkbox checkbox-sm checkbox-error"
                  />
                  <span className="font-bold text-slate-300">Active Slide (Shown in Store Hero)</span>
                </label>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingBanner(false);
                    setEditingBanner(null);
                  }}
                  className="flex-1 h-10 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-[#E3062F] hover:bg-rose-700 text-white font-bold cursor-pointer border-0"
                >
                  Save Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

