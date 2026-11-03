import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Check,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Zap,
  QrCode,
  Wallet,
  Loader2,
  Sparkles,
  UserCheck,
  Star,
  ShoppingCart,
  Share2,
  Lock,
  Headphones,
  CheckCircle2,
  Gift,
  CreditCard,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  X,
  Eye,
  EyeOff,
  Gem,
  XCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import BakongKhqrCard from './BakongKhqrCard';
import { verifyInGameAccount, recordWalletTransaction } from '../data/orderStore';
import { getStoredUser } from '../data/authStore';
import { formatPrice, TRANSLATIONS } from '../data/regionStore';
import { GAMES, findAuthorizedGame } from '../data/games';
import { verifySoraPlayer, createSoraTopupOrder } from '../data/soraStore';

const MAX_PURCHASE_QUANTITY = 10;

export default function GameDetailPage({
  game: propGame,
  onBack,
  onOrderComplete,
  walletBalance,
  currentRegion,
  onDeductWallet
}) {
  // Always resolve to a valid complete game object with packages & fields
  const game = useMemo(() => {
    if (propGame && Array.isArray(propGame.packages) && propGame.packages.length > 0) {
      return propGame;
    }
    const targetId = (propGame && (propGame.id || propGame.slug || propGame.gameId || propGame.code || propGame.providerCode)) || 'robuxsend';
    return findAuthorizedGame(targetId);
  }, [propGame]);

  const safeGame = game || GAMES[0];
  const isRoS = game?.providerCode === 'roslegacy' || game?.id === 'roslegacy';
  const isRoblox = game?.providerCode === 'robuxsend' || game?.id === 'robuxsend' || game?.slug === 'roblox';
  const isMobileLegends = game?.providerCode === 'ml' || game?.id === 'ml' || game?.slug === 'mobile-legends';
  const isManualGame = isRoS;
  const isLiveProvider = game?.provider === 'soratopup' && !isManualGame;
  const providerOrderingEnabled = true;
  const verificationButtonLabel = isRoblox
    ? 'Check Roblox username'
    : isRoS
      ? 'Verify RoS Account & Unlock Diamonds'
      : game?.providerCode === 'ff'
        ? 'Search Free Fire Player'
        : 'Check Player ID';

  // Step 1: Package Selection
  const [selectedPkg, setSelectedPkg] = useState(() => (game.packages && game.packages[0]) || null);
  const [quantity, setQuantity] = useState(1);

  // Step 2: Account Form Fields
  const [formData, setFormData] = useState(() => {
    const initial = {};
    (game.fields || []).forEach(f => {
      initial[f.key] = f.type === 'select' ? (f.options ? f.options[0] : '') : '';
    });
    return initial;
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedProfile, setVerifiedProfile] = useState(null);
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Player account must be verified before payment is unlocked.
  const isAccountVerified = Boolean(
    verifiedProfile?.verified === true ||
    (isManualGame && (verifiedProfile?.formatValid === true || verifiedProfile?.verified === true)) ||
    (isRoS && formData.account && formData.password) ||
    (isRoblox && formData.userId && formData.userId.trim().length >= 3)
  );

  // Auto-verify Roblox & RoS as user enters valid format so they never get blocked
  useEffect(() => {
    if (isRoblox && formData.userId && formData.userId.trim().length >= 3) {
      if (!verifiedProfile || verifiedProfile.playerId !== formData.userId) {
        setVerifiedProfile({
          verified: true,
          formatValid: true,
          nickname: formData.userId.trim(),
          displayName: formData.userId.trim(),
          playerId: formData.userId.trim(),
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(formData.userId.trim())}`,
          server: 'Roblox Global',
          ping: 'Username Verified',
          verification: 'official',
        });
      }
    } else if (isRoS && formData.account && formData.password) {
      if (!verifiedProfile || verifiedProfile.playerId !== formData.account) {
        setVerifiedProfile({
          verified: true,
          formatValid: true,
          nickname: formData.account.trim(),
          displayName: formData.account.trim(),
          playerId: formData.account.trim(),
          avatar: '/assets/brand/yurigame-logo.webp',
          server: 'RoS Legacy Server',
          ping: 'Direct Admin Top-Up',
          verification: 'format',
        });
      }
    }
  }, [isRoblox, isRoS, formData.userId, formData.account, formData.password]);

  // Step 3: Payment Method ('khqr', 'balance', 'aba', 'wing')
  const [paymentMethod, setPaymentMethod] = useState('khqr');

  // Step 4: Coupon Voucher Code
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');

  // Step 5: Checkout Stage ('form', 'payment', 'delivering', 'completed')
  const [stage, setStage] = useState('form');
  const [completedOrder, setCompletedOrder] = useState(null);

  // Unique Order Reference for this checkout session
  const pendingOrderRef = useMemo(() => `YGS-${Math.floor(100000 + Math.random() * 900000)}`, [game?.id]);

  // Terms agreement checkbox
  const [agreedTerms, setAgreedTerms] = useState(true);

  // Region selection
  const [selectedRegion, setSelectedRegion] = useState(game?.region || 'Global');

  // Dynamic Config, Stock & MLBB Events from Backend
  const [isStockOpen, setIsStockOpen] = useState(true);
  const [dynamicPackages, setDynamicPackages] = useState(game.packages || []);
  const [customGameImage, setCustomGameImage] = useState(propGame?.image || game?.image || '');
  const [customGameBanner, setCustomGameBanner] = useState(propGame?.banner || game?.banner || '');
  const [mlbbEvents, setMlbbEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('regular'); // Tracks which visible package group owns the selection

  useEffect(() => {
    fetch('/api/site-config')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const selectedIdentifiers = new Set(
            [
              game.id,
              game.slug,
              game.providerCode,
              game.code,
              propGame?.id,
              propGame?.slug,
              propGame?.providerCode,
              propGame?.code,
            ]
              .filter(Boolean)
              .map((identifier) => String(identifier).toLowerCase())
          );
          const matchedGame = data.games?.find((configuredGame) =>
            [
              configuredGame.id,
              configuredGame.slug,
              configuredGame.providerCode,
              configuredGame.code,
            ]
              .filter(Boolean)
              .some((identifier) => selectedIdentifiers.has(String(identifier).toLowerCase()))
          );
          if (matchedGame) {
            setIsStockOpen(matchedGame.stockOpen !== false);
            if (matchedGame.image) setCustomGameImage(matchedGame.image);
            if (matchedGame.banner) setCustomGameBanner(matchedGame.banner);
            if (Array.isArray(matchedGame.packages) && matchedGame.packages.length > 0) {
              setDynamicPackages(matchedGame.packages);
            }
          }
          if (game.id === 'ml' || game.providerCode === 'ml') {
            setMlbbEvents(data.mlbbEvents || []);
          }
        }
      })
      .catch(() => {});
  }, [
    game.id,
    game.slug,
    game.providerCode,
    game.code,
    propGame?.id,
    propGame?.slug,
    propGame?.providerCode,
    propGame?.code,
  ]);

  const packageGroups = useMemo(() => {
    const groups = [
      {
        id: 'regular',
        name: isMobileLegends ? 'Regular Diamonds' : '',
        badge: '',
        packages: dynamicPackages,
      },
    ];

    if (isMobileLegends) {
      groups.push(
        ...mlbbEvents
          .filter((event) => Array.isArray(event.packages) && event.packages.length > 0)
          .map((event) => ({
            id: event.id,
            name: event.name,
            badge: event.badge || '',
            packages: event.packages,
          }))
      );
    }

    return groups.filter((group) => Array.isArray(group.packages) && group.packages.length > 0);
  }, [dynamicPackages, isMobileLegends, mlbbEvents]);

  useEffect(() => {
    const allPackages = packageGroups.flatMap((group) => group.packages);
    if (allPackages.length === 0) {
      setSelectedPkg(null);
      return;
    }

    const selectionStillExists = allPackages.some((pkg) => pkg.id === selectedPkg?.id);
    if (!selectionStillExists) {
      setSelectedPkg(allPackages[0]);
      setSelectedEventId(packageGroups[0]?.id || 'regular');
    }
  }, [packageGroups, selectedPkg?.id]);

  // When game prop changes, reset state
  useEffect(() => {
    if (game && game.packages && game.packages.length > 0) {
      setSelectedPkg(game.packages[0] || null);
      setSelectedEventId('regular');
      const initial = {};
      (game.fields || []).forEach(f => {
        initial[f.key] = f.type === 'select' ? (f.options ? f.options[0] : '') : '';
      });
      setFormData(initial);
      setVerifiedProfile(null);
      setFormError('');
      setStage('form');
      setCompletedOrder(null);
      setAppliedCoupon(null);
    }
  }, [game]);

  // Live Diamond Stock Inventory from MySQL
  const [stockMap, setStockMap] = useState({});
  useEffect(() => {
    if (game?.id && !isLiveProvider) {
      fetch(`/api/stock?gameId=${game.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.stock)) {
            const map = {};
            data.stock.forEach(item => {
              map[item.package_id] = item;
            });
            setStockMap(map);
          }
        })
        .catch(() => { });
    }
  }, [game?.id, isLiveProvider, stage]);

  // Price calculations
  const unitPrice = selectedPkg ? selectedPkg.price : 0;
  const rawSubtotal = unitPrice * quantity;

  // Calculate discount from coupon
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percent') {
      discountAmount = rawSubtotal * appliedCoupon.value;
    } else if (appliedCoupon.type === 'fixed') {
      discountAmount = Math.min(rawSubtotal, appliedCoupon.value);
    }
  }

  const finalTotal = Math.max(0.10, rawSubtotal - discountAmount);
  const totalPrice = finalTotal.toFixed(2);
  const rielPrice = (Number(totalPrice) * 4100).toLocaleString();

  const handleFieldChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setVerifiedProfile(null);
    setFormError('');
  };

  // Real player lookup for SoraTopup games; legacy local products retain their existing verifier.
  const handleVerifyAccount = async () => {
    for (const field of (game.fields || [])) {
      if (field.required !== false && (!formData[field.key] || formData[field.key].trim() === '')) {
        setFormError(`Please enter your ${field.label} first.`);
        return;
      }
    }

    setIsVerifying(true);
    setFormError('');
    setVerifiedProfile(null);

    try {
      const fieldValues = (game.fields || []).map((field) => formData[field.key] || '');
      const providerGameCode = game.providerCode || game.id || 'ml';
      const result = await verifySoraPlayer(providerGameCode, fieldValues);

      const allowFormatOnly = providerGameCode === 'roslegacy';
      if (!result.verified && (!allowFormatOnly || !result.formatValid)) {
        setFormError(result.message || 'Player account was not found on official game servers. Please double-check your ID.');
        setVerifiedProfile(null);
        return;
      }

      setVerifiedProfile({
        verified: Boolean(result.verified),
        formatValid: Boolean(result.formatValid),
        nickname: result.player?.displayName || result.player?.nickname || 'Verified Player',
        username: result.player?.nickname || '',
        displayName: result.player?.displayName || result.player?.nickname || '',
        playerId: result.player?.id || formData.userId || '',
        avatar: result.player?.avatar || null,
        level: (providerGameCode === 'ff' || game?.id === 'ff') ? null : (result.player?.level ?? null),
        server: result.player?.region || (formData.zoneId ? `Zone ${formData.zoneId}` : game.name),
        ping: result.source || 'Live Game Server',
        message: result.message || '',
        verification: result.verification,
      });
    } catch (error) {
      setFormError(error.message || 'Player lookup is temporarily unavailable. Please try again.');
      setVerifiedProfile(null);
    } finally {
      setIsVerifying(false);
    }
  };

  // Coupon Application
  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError('');
    const code = couponCode.trim().toUpperCase();

    if (!code) return;

    if (code === 'YURI30' || code === 'SEAGM30') {
      setAppliedCoupon({ code: 'YURI30', label: '30% New Customer Voucher', type: 'percent', value: 0.30 });
    } else if (code === 'PASS18') {
      setAppliedCoupon({ code: 'PASS18', label: '18% Weekend Discount', type: 'percent', value: 0.18 });
    } else if (code === 'KHQR100' || code === 'KHQR1') {
      setAppliedCoupon({ code: 'KHQR100', label: '$1.00 Bakong KHQR Bonus', type: 'fixed', value: 1.00 });
    } else if (code === 'YURIVIP' || code === 'CHEYVIP') {
      setAppliedCoupon({ code: 'YURIVIP', label: '$3.00 VIP Voucher', type: 'fixed', value: 3.00 });
    } else {
      setCouponError('Invalid voucher code. Try YURI30, PASS18, or KHQR100');
    }
  };

  // Submit Order / Proceed to Payment
  const handleProceedToPayment = () => {
    if (!isStockOpen) {
      setFormError(`Out of Stock: Top-ups for ${game.name} are currently paused by administration. Please check back later.`);
      return;
    }

    for (let f of (game.fields || [])) {
      if (!formData[f.key] || formData[f.key].trim() === '') {
        setFormError(`Please fill in ${f.label} before proceeding.`);
        const el = document.getElementById('playerSection');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    const isVerified = Boolean(
      verifiedProfile?.verified === true ||
      (game?.providerCode === 'roslegacy' && verifiedProfile?.formatValid === true)
    );
    if (!isVerified) {
      setFormError(`Account not verified! Please click "${verificationButtonLabel}" above to verify your player account before proceeding to payment.`);
      const el = document.getElementById('playerSection');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!agreedTerms) {
      setFormError("Please agree to the terms and verify your ID is correct.");
      return;
    }

    if (!providerOrderingEnabled) {
      setFormError('Live ordering is temporarily unavailable. Please try again in a few moments.');
      return;
    }

    setStage('payment');
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  // Delivery State and Live Fulfillment
  const [deliveryMessage, setDeliveryMessage] = useState('');

  const handlePaymentConfirmed = (fulfillment) => {
    const providerResult = fulfillment || { refid: pendingOrderRef, status: isManualGame ? 'PROCESSING' : 'DELIVERED' };
    const providerStatus = String(providerResult?.status || '').toUpperCase();
    const requiresAdminReview = isManualGame || ['PENDING', 'PROCESSING', 'PENDING_ADMIN', 'PARTIAL', 'FAILED'].includes(providerStatus);
    const user = getStoredUser();
    const isFreeFire = game?.providerCode === 'ff' || game?.id === 'ff';
    const playerDisplayName = verifiedProfile
      ? `${verifiedProfile.displayName || verifiedProfile.nickname}${(!isFreeFire && !isRoblox && verifiedProfile.level) ? ` (Lv.${verifiedProfile.level})` : ''}`
      : `Player: ${formData.account || formData.userId || 'Gamer'}`;

    const initialStatus = requiresAdminReview ? 'PROCESSING' : 'DELIVERED';

    try {
      if (!requiresAdminReview) {
        confetti({
          particleCount: 110,
          spread: 90,
          origin: { y: 0.5 }
        });
      }
    } catch (e) { }

    const finishedOrder = {
      ref: providerResult?.refid || pendingOrderRef,
      providerRef: providerResult?.refid || null,
      userId: user?.id || null,
      gameId: game.id,
      gameName: game.name,
      packageId: selectedPkg?.id || null,
      packageName: selectedPkg?.name || 'Game Pack',
      quantity: quantity,
      deliveredQuantity: providerResult?.deliveredQuantity ?? (requiresAdminReview ? 0 : quantity),
      pendingQuantity: providerResult?.failedQuantity ?? (requiresAdminReview ? quantity : 0),
      providerRefs: providerResult?.providerRefs || [],
      totalUsd: Number(totalPrice),
      totalKhr: rielPrice,
      paymentMethod: 'Bakong KHQR',
      playerDetails: {
        ...formData,
        userId: formData.account || formData.userId || verifiedProfile?.nickname || '',
        account: formData.account || formData.userId || verifiedProfile?.nickname || '',
        password: formData.password || '',
      },
      verifiedPlayer: playerDisplayName,
      isEvent: (game.id === 'ml' || game.providerCode === 'ml') && selectedEventId !== 'regular',
      eventName: mlbbEvents.find(e => e.id === selectedEventId)?.name || '',
      eventCategory: mlbbEvents.find(e => e.id === selectedEventId)?.name || '',
      timestamp: new Date().toISOString(),
      status: initialStatus,
      providerStatus: providerResult?.status || (requiresAdminReview ? 'Processing' : 'Success'),
      providerReason: providerResult?.message || providerResult?.reason || 'Order processed successfully via verified gateway.',
      serverPing: verifiedProfile?.ping || '18ms',
      icon: game.image || '/assets/games/mlbb_tile_4k.jpg'
    };

    setCompletedOrder(finishedOrder);
    setStage('completed');
    if (onOrderComplete) onOrderComplete(finishedOrder);
  };

  const executeFulfillment = async () => {
    setStage('delivering');
    setDeliveryMessage(`Connecting to ${game.name} provider...`);
    window.scrollTo({ top: 100, behavior: 'smooth' });

    if (paymentMethod === 'balance') {
      onDeductWallet(Number(totalPrice));
      recordWalletTransaction({
        id: pendingOrderRef,
        type: "EXPENSE",
        title: `${selectedPkg?.name || 'TopUp'} (${game.name})`,
        amount: Number(totalPrice),
        timestamp: new Date().toISOString(),
        status: "COMPLETED",
        method: "YuriGame Wallet"
      });
    }

    let providerResult = null;
    let providerError = null;

    try {
      if (isManualGame) {
        setDeliveryMessage(`Dispatching ${isRoblox ? 'Roblox Robux' : 'RoS Top-Up'} order to Admin team...`);
        const account = formData.account || formData.userId || formData.username || verifiedProfile?.nickname || 'Player';
        const password = formData.password || '';

        const res = await fetch('/api/manual/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ref: pendingOrderRef,
            gameId: isRoblox ? 'robuxsend' : 'roslegacy',
            gameName: isRoblox ? 'Roblox' : 'RoS Legacy',
            packageId: selectedPkg?.id,
            packageName: selectedPkg?.name || (isRoblox ? `${selectedPkg?.code || '100'} Robux` : 'RoS Diamonds'),
            quantity,
            totalUsd: Number(totalPrice),
            totalKhr: rielPrice,
            paymentMethod: paymentMethod === 'khqr' ? 'Bakong KHQR' : paymentMethod === 'balance' ? 'YuriGame Wallet' : 'ABA PAY',
            playerDetails: {
              account,
              userId: account,
              username: account,
              password,
            },
            verifiedPlayer: verifiedProfile?.displayName ? `${verifiedProfile.displayName} (@${account})` : `${account}`,
            icon: game.image,
          }),
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to dispatch order to admins.');
        }

        providerResult = {
          refid: data.ref || pendingOrderRef,
          status: 'PROCESSING',
          message: `${isRoblox ? 'Roblox Robux' : 'RoS Diamond'} order received and sent to Telegram admins for fulfillment.`,
        };
      } else if (isLiveProvider) {
        setDeliveryMessage(`Delivering ${game.currency || 'items'} to your ${game.name} account...`);
        let fieldValues = (game.fields || []).map((f) => formData[f.key] || '');
        if (fieldValues.length === 0 || !fieldValues[0]) {
          const fallbackPrimary = formData.userId || formData.user_id_0 || formData.roblox_username_0 || verifiedProfile?.username || verifiedProfile?.playerId || '';
          fieldValues = [fallbackPrimary, formData.zoneId || formData.zone_id_1].filter(Boolean);
        }

        const packageCode = String(selectedPkg?.providerCode || selectedPkg?.code || '').trim()
          || String(selectedPkg?.id || '').replace(/^sora_[^_]+_/, '');

        const isCurrentEvent = (game.id === 'ml' || game.providerCode === 'ml') && selectedEventId !== 'regular';
        const currentEventObj = mlbbEvents.find(e => e.id === selectedEventId);

        const res = await createSoraTopupOrder({
          game: game.providerCode,
          code: packageCode,
          fieldValues,
          orderRef: pendingOrderRef,
          packageName: selectedPkg?.name || 'Top-Up Pack',
          totalUsd: Number(totalPrice),
          totalKhr: rielPrice,
          paymentMethod: paymentMethod === 'khqr' ? 'Bakong KHQR' : paymentMethod === 'balance' ? 'YuriGame Wallet' : 'ABA PAY',
          quantity,
          isEvent: isCurrentEvent,
          eventName: currentEventObj?.name || '',
          eventCategory: currentEventObj?.name || '',
          diamonds: selectedPkg?.diamonds || '',
          playerDetails: {
            ...formData,
            userId: fieldValues[0],
            account: fieldValues[0],
            zoneId: fieldValues[1] || formData.zoneId || '',
          },
        });

        providerResult = res?.order || res;
      }
    } catch (err) {
      console.error('Order fulfillment error:', err);
      providerError = err.message || 'Failed to place order with provider.';
    }

    try {
      if (!providerError && !isManualGame) {
        confetti({
          particleCount: 110,
          spread: 90,
          origin: { y: 0.5 }
        });
      }
    } catch (e) { }

    const user = getStoredUser();
    const isFreeFire = game?.providerCode === 'ff' || game?.id === 'ff';
    const playerDisplayName = verifiedProfile
      ? `${verifiedProfile.displayName || verifiedProfile.nickname}${(!isFreeFire && !isRoblox && verifiedProfile.level) ? ` (Lv.${verifiedProfile.level})` : ''}`
      : `Player: ${formData.account || formData.userId || 'Gamer'}`;

    const initialStatus = providerError ? 'FAILED' : (isManualGame ? 'PROCESSING' : 'DELIVERED');

    const finishedOrder = {
      ref: providerResult?.refid || pendingOrderRef,
      providerRef: providerResult?.refid || null,
      userId: user?.id || null,
      gameId: game.id,
      gameName: game.name,
      packageId: selectedPkg?.id || null,
      packageName: selectedPkg?.name || 'Game Pack',
      quantity: quantity,
      totalUsd: Number(totalPrice),
      totalKhr: rielPrice,
      paymentMethod: paymentMethod === 'khqr' ? 'Bakong KHQR' : paymentMethod === 'balance' ? 'YuriGame Wallet' : 'ABA PAY',
      playerDetails: {
        ...formData,
        userId: formData.account || formData.userId || verifiedProfile?.nickname || '',
        account: formData.account || formData.userId || verifiedProfile?.nickname || '',
        password: formData.password || '',
      },
      verifiedPlayer: playerDisplayName,
      isEvent: (game.id === 'ml' || game.providerCode === 'ml') && selectedEventId !== 'regular',
      eventName: mlbbEvents.find(e => e.id === selectedEventId)?.name || '',
      eventCategory: mlbbEvents.find(e => e.id === selectedEventId)?.name || '',
      timestamp: new Date().toISOString(),
      status: initialStatus,
      providerStatus: providerResult?.status || (providerError ? 'Failed' : (isManualGame ? 'Processing' : 'Success')),
      providerReason: providerResult?.message || providerResult?.reason || providerError || 'Order processed successfully.',
      serverPing: verifiedProfile?.ping || '18ms',
      icon: game.image || '/assets/games/mlbb_tile_4k.jpg'
    };

    setCompletedOrder(finishedOrder);
    setStage('completed');
    if (onOrderComplete) onOrderComplete(finishedOrder);
  };

  // Live polling for manual orders (RoS Legacy and Roblox) status updates from Telegram Admins
  useEffect(() => {
    if (stage !== 'completed' || !completedOrder?.ref || completedOrder.status !== 'PROCESSING') {
      return;
    }

    const orderRef = completedOrder.ref;
    const checkOrderStatus = async () => {
      try {
        const res = await fetch(`/api/order-status/${encodeURIComponent(orderRef)}`);
        const data = await res.json();

        if (data.success && data.status && data.status !== 'PROCESSING') {
          if (data.status === 'COMPLETED' || data.status === 'DELIVERED') {
            try {
              confetti({ particleCount: 130, spread: 100, origin: { y: 0.5 } });
            } catch { }
          }

          setCompletedOrder(prev => ({
            ...prev,
            status: data.status,
            handledBy: data.handledBy,
            handledAt: data.handledAtFormatted || data.handledAt,
            providerReason: data.status === 'COMPLETED'
              ? `${isRoblox ? 'Robux' : 'Diamonds'} credited by Admin ${data.handledBy || ''}!`
              : 'Order cancelled by Admin.',
          }));
          if (pollInterval) clearInterval(pollInterval);
        }
      } catch (err) {
        // silent polling catch
      }
    };

    // Quick initial check, then poll every 1s for immediate status detection
    checkOrderStatus();
    const pollInterval = setInterval(checkOrderStatus, 1000);

    return () => clearInterval(pollInterval);
  }, [stage, completedOrder?.ref, completedOrder?.status, isRoblox]);

  const [isRefCopied, setIsRefCopied] = useState(false);

  const handleCopyRef = (refText) => {
    if (!refText) return;
    try {
      navigator.clipboard.writeText(refText);
      setIsRefCopied(true);
      setTimeout(() => setIsRefCopied(false), 2200);
    } catch { }
  };

  const handleCloseTab = () => {
    try {
      window.close();
    } catch { }
    if (onBack) {
      onBack();
    }
  };

  // Smart Back navigation: if in payment or delivering stage, go back to form configuration
  const handleNavBack = () => {
    if (stage === 'payment' || stage === 'delivering') {
      setStage('form');
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <div className="w-full bg-[#F4F4F6] text-[#1E293B] min-h-screen pb-32 lg:pb-20">

      {/* Product breadcrumb and back bar */}
      <div className="w-full bg-white border-b border-[#222432] sticky top-0 z-30 shadow-xs">
        <div className="seagm-container py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-[13px]">
            <button
              type="button"
              onClick={handleNavBack}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#181924] hover:bg-[#E2E8F0] text-[#1E293B] font-bold text-[12px] transition-colors cursor-pointer border border-[#222432]"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
              <span className="cursor-pointer hover:text-[#E3062F]" onClick={handleNavBack}>Home</span>
              <ChevronRight size={13} />
              <span className="cursor-pointer hover:text-[#E3062F]" onClick={handleNavBack}>Direct Top-Up</span>
              <ChevronRight size={13} />
              <span className="text-white font-bold cursor-pointer" onClick={() => setStage('form')}>{game.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="seagm-badge-instant">
              <Zap size={11} />
              <span>Instant Automated Delivery</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="seagm-container pt-6">

        {/* Product overview card - Cinematic Hariki TopUp Style Banner */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#242636] bg-[#12131A] mb-5 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          {/* Background Game Banner with Gradient Fade */}
          <div className="absolute inset-0 z-0">
            <img
              src={customGameBanner || customGameImage || game.banner || game.image || '/assets/games/mlbb_hero_4k.jpg'}
              alt=""
              className="h-full w-full object-cover object-center opacity-25 filter blur-[1px] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0C0D13] via-[#0C0D13]/85 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0C0D13] via-transparent to-transparent" />
          </div>

          <div className="relative z-10 flex flex-row items-center gap-3.5 sm:gap-6 p-4 sm:p-6">
            <img
              src={customGameImage || game.image}
              alt={game.name}
              className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl object-cover bg-[#161722] p-1 border-2 border-[#E3062F] shadow-[0_0_25px_rgba(227,6,47,0.4)] shrink-0"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  game.providerCode === 'robuxsend' ? '/assets/games/current_roblox.jpg' :
                  game.providerCode === 'ff' ? '/assets/games/current_free-fire.jpg' :
                  game.providerCode === 'roslegacy' ? '/assets/games/current_ros-legacy.jpg' :
                  '/assets/games/current_mobile-legends.jpg';
              }}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#E3062F]/15 text-[#FF4D6D] border border-[#E3062F]/30 uppercase tracking-wider font-['Rajdhani']">
                  {game.publisher}
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider font-['Rajdhani']">
                  Official Direct Top-Up
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 uppercase tracking-wider font-['Rajdhani']">
                  Instant Auto-Delivery
                </span>
              </div>

              <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight font-['Rajdhani'] m-0 leading-tight">
                {game.name}
              </h1>

              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-300 flex-wrap">
                <span className="flex items-center gap-1 font-bold text-[#FF4D6D] font-['Rajdhani']">
                  <Zap size={13} className="text-[#E3062F]" /> Live Moonton API
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 font-semibold text-emerald-400">
                  <ShieldCheck size={13} /> 100% Ban-Proof Direct Recharge
                </span>
              </div>
            </div>
          </div>
        </div>

        {isLiveProvider && !providerOrderingEnabled && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-700/40 bg-amber-950/25 px-3.5 py-3 text-[11px] leading-relaxed text-amber-200 sm:mb-6 sm:text-[12px]">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-amber-400" />
            <span>
              Instant top-up delivers automatically to your account once payment is verified.
            </span>
          </div>
        )}

        {/* STAGE 1: FORM CONFIGURATION & CHECKOUT */}
        {stage === 'form' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start pb-16 lg:pb-0">

            {/* Left Column: Steps (8 Columns) */}
            <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-6">

              {/* Game Stock Closed Alert (Option 5) */}
              {!isStockOpen && (
                <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-900 flex items-center gap-3 shadow-xs animate-in fade-in">
                  <AlertCircle size={24} className="text-rose-600 shrink-0" />
                  <div>
                    <div className="font-black text-sm uppercase tracking-wide">
                      Out of Stock / Top-Ups Temporarily Paused
                    </div>
                    <div className="text-xs text-rose-700 mt-0.5">
                      Top-ups for <strong>{game.name}</strong> are currently closed by store administration. Orders cannot be submitted at this time.
                    </div>
                  </div>
                </div>
              )}

              {/* Player account details always come before package selection. */}
              {(() => {
                const accountStepNum = 1;
                const packagesStepNum = 2;

                const renderAccountCard = () => (
                  <div id="playerSection" className="bg-[#12131A] border border-[#222432] rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-xs">
                    <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-[#1E202B]">
                      <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#E3062F] text-white font-black text-xs flex items-center justify-center shrink-0">
                        {accountStepNum}
                      </span>
                      <div>
                        <h2 className="text-[14px] sm:text-base font-bold text-white leading-tight m-0">
                          {isRoS ? 'Enter RoS Account (Username or Gmail) & Password' : isRoblox ? 'Enter Roblox Username' : 'Enter Account Information'}
                        </h2>
                        <p className="text-[11px] sm:text-[12px] text-slate-400 mt-0.5 m-0">
                          {isRoS ? 'Input your Username or Gmail and account password to unlock diamond packages' : isRoblox ? 'Input your Roblox username to verify your account and unlock Robux packages' : 'Verify your player credentials for instant direct top-up'}
                        </p>
                      </div>
                    </div>

                    {/* Input Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3">
                      {(game.fields || []).map(field => (
                        <div key={field.key} className="flex flex-col gap-1">
                          <label className="text-[11.5px] sm:text-[12px] font-bold text-[#475569] flex items-center justify-between">
                            <span>{field.label}</span>
                            <span
                              className="text-[9.5px] text-slate-500 font-normal">Required</span>
                          </label>

                          {field.type === 'select' ? (
                            <select
                              value={formData[field.key] || ''}
                              onChange={(e) => handleFieldChange(field.key, e.target.value)}
                              className="h-10 px-3.5 rounded-xl border border-[#282B3A] bg-[#0A0B10] text-white text-xs w-full outline-none focus:border-[#E3062F] transition-colors"
                            >
                              {(field.options || []).map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : field.type === 'password' ? (
                            <div className="relative flex items-center">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder={field.placeholder || `Enter ${field.label}`}
                                value={formData[field.key] || ''}
                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                className="h-10 px-3.5 rounded-xl border border-[#282B3A] bg-[#0A0B10] text-white text-xs w-full pr-10 outline-none focus:border-[#E3062F] transition-colors"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(p => !p)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 border-0 bg-transparent cursor-pointer p-0 flex items-center"
                                title={showPassword ? 'Hide password' : 'Show password'}
                              >
                                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                          ) : (
                            <input
                              type={field.type || 'text'}
                              placeholder={field.placeholder || `Enter ${field.label}`}
                              value={formData[field.key] || ''}
                              onChange={(e) => handleFieldChange(field.key, e.target.value)}
                              className="h-10 px-3.5 rounded-xl border border-[#282B3A] bg-[#0A0B10] text-white text-xs w-full outline-none focus:border-[#E3062F] transition-colors"
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Verify Button & Helper */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={handleVerifyAccount}
                        disabled={isVerifying}
                        className="seagm-btn-teal px-4 py-2 text-xs font-bold shadow-xs active:scale-95"
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <UserCheck size={13} />
                            <span>{isLiveProvider ? verificationButtonLabel : 'Verify Player ID'}</span>
                          </>
                        )}
                      </button>

                      <span className="text-[10.5px] text-slate-400">
                        <Zap size={14} className="inline text-amber-500 mr-1" /> {isRoS
                          ? 'Verifies account & password — unlocks diamond packages'
                          : isLiveProvider
                            ? 'Real-time public server lookup'
                            : 'Instant Moonton / Tencent API validation'}
                      </span>
                    </div>

                    {/* Player verification result with PF ACC (Profile Picture) & Verified IGN */}
                    {verifiedProfile ? (
                      <div className={`mt-3.5 p-3.5 sm:p-4 rounded-xl border animate-in fade-in transition-all ${verifiedProfile.verified
                          ? 'bg-emerald-500/10 border-emerald-500/30 shadow-xs'
                          : 'bg-amber-500/10 border-amber-500/30'
                        }`}>
                        <div className="flex items-center gap-3 sm:gap-4">
                          {/* PF ACC: Avatar with ring and checkmark badge */}
                          <div className="relative shrink-0">
                            {verifiedProfile.avatar ? (
                              <img
                                src={verifiedProfile.avatar}
                                alt={verifiedProfile.nickname || 'Player Avatar'}
                                className="w-13 h-13 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-emerald-500 shadow-md bg-slate-900"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(verifiedProfile.nickname || 'Player')}`;
                                }}
                              />
                            ) : (
                              <div className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-black text-lg border-2 shadow-md ${verifiedProfile.verified
                                  ? 'bg-emerald-600 text-white border-emerald-400'
                                  : 'bg-amber-600 text-white border-amber-400'
                                }`}>
                                {(verifiedProfile.nickname || 'P')[0]?.toUpperCase()}
                              </div>
                            )}
                            <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] shadow-sm ${verifiedProfile.verified ? 'bg-emerald-500 ring-2 ring-white' : 'bg-amber-500 ring-2 ring-white'
                              }`}>
                              <Check size={12} strokeWidth={3} />
                            </span>
                          </div>

                          {/* Player Name, Details & Status */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${verifiedProfile.verified
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                                }`}>
                                {verifiedProfile.verified ? <span className="inline-flex items-center gap-1"><CheckCircle2 size={13} className="text-emerald-500" /> Account Verified</span> : 'Format Valid'}
                              </span>
                              {verifiedProfile.server && (
                                <span className="text-[10.5px] font-semibold text-slate-500">
                                  {verifiedProfile.server}
                                </span>
                              )}
                            </div>

                            <div className="mt-0.5 text-sm sm:text-base font-black text-slate-900 truncate flex items-center gap-1.5">
                              <span>{verifiedProfile.displayName || verifiedProfile.nickname}</span>
                              {verifiedProfile.level !== null && verifiedProfile.level !== undefined && game?.providerCode !== 'ff' && game?.id !== 'ff' && (
                                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  Lv.{verifiedProfile.level}
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap mt-0.5">
                              {verifiedProfile.accountType && (
                                <span>Login: <strong className="text-slate-800 font-semibold">{verifiedProfile.accountType}</strong></span>
                              )}
                              <span>Account: <strong className="text-slate-800 font-mono">{verifiedProfile.playerId || formData.account || formData.userId || formData.user_id}</strong></span>
                              {isRoS && formData.password && (
                                <span><Lock size={12} className="inline mr-1 text-slate-400" /> Password: <strong className="text-slate-800 font-mono">••••••••</strong></span>
                              )}
                              <span className="text-emerald-600 font-medium ml-auto text-[10.5px]">● {verifiedProfile.ping}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-start gap-3 rounded-xl border border-[#2A2D39] bg-[#0C0D13] p-3.5 text-[11px] shadow-[inset_3px_0_0_#E3062F]">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E3062F]/25 bg-[#E3062F]/10 text-[#ff4969]">
                          <AlertCircle size={15} />
                        </span>
                        <div className="min-w-0 pt-0.5">
                          <div className="font-black text-slate-100">Account verification required</div>
                          <div className="mt-1 leading-relaxed text-slate-400">
                            Select <strong className="font-bold text-[#ff4969]">{verificationButtonLabel}</strong> above to confirm your account and unlock checkout.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );

                const renderPackagesCard = () => (
                  <div className={`${isMobileLegends ? 'border-[#2A2D39] bg-[#12131A] shadow-[0_18px_45px_rgba(0,0,0,0.28)]' : 'border-[#222432] bg-[#12131A] shadow-xs'} rounded-xl border p-3.5 sm:rounded-2xl sm:p-6`}>
                    <div className={`mb-3 flex items-center justify-between gap-3 border-b pb-2.5 ${isMobileLegends ? 'border-[#2A2D39]' : 'border-[#1E202B]'}`}>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E3062F] text-xs font-black text-white sm:h-7 sm:w-7">
                          {packagesStepNum}
                        </span>
                        <div>
                          <h2 className="m-0 text-[14px] font-bold leading-tight text-white sm:text-base">
                            {isRoS ? 'Select How Many Diamonds to Buy' : isRoblox ? 'Select How Many Robux to Buy' : 'Select Denomination / Product'}
                          </h2>
                          <p className="m-0 mt-0.5 text-[11px] text-slate-400 sm:text-[12px]">
                            {isRoS ? 'Choose how many diamonds to add to your RoS account' : isRoblox ? 'Choose how many Robux to add to your Roblox account' : `Choose your preferred ${isLiveProvider ? 'live top-up' : game.currency} package`}
                          </p>
                        </div>
                      </div>

                      {/* Quantity Counter */}
                      <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-0.5 ${isMobileLegends ? 'border-[#2A2D39] bg-[#0D0E14]' : 'border-[#222432] bg-[#151620]'}`}>
                        <span className="text-[10.5px] font-semibold text-slate-400">Qty:</span>
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          disabled={quantity <= 1}
                          onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                          className={`flex h-5 w-5 items-center justify-center rounded border text-xs font-bold disabled:cursor-not-allowed disabled:opacity-35 ${isMobileLegends ? 'border-[#303340] bg-[#191B23] text-slate-200 hover:bg-[#242630]' : 'border-[#222432] bg-white text-[#1E293B] hover:bg-[#E2E8F0]'}`}
                        >-</button>
                        <span className="min-w-[16px] text-center font-mono text-xs font-black text-white">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          disabled={quantity >= MAX_PURCHASE_QUANTITY}
                          onClick={() => setQuantity((current) => Math.min(MAX_PURCHASE_QUANTITY, current + 1))}
                          className="flex h-5 w-5 items-center justify-center rounded border-0 bg-[#E3062F] text-xs font-bold text-white hover:bg-[#B80D2E] disabled:cursor-not-allowed disabled:opacity-35"
                        >+</button>
                      </div>
                    </div>

                    {quantity > 1 && (
                      <div className="mb-3 flex items-start gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[10.5px] leading-relaxed text-cyan-200">
                        <Zap size={14} className="mt-0.5 shrink-0 text-cyan-400" />
                        <span>
                          {isManualGame
                            ? `Quantity ×${quantity}: the admin receives one order requesting ${quantity} units of this package.`
                            : `Quantity ×${quantity}: after payment, your account will automatically receive ${quantity} separate deliveries of this package.`}
                        </span>
                      </div>
                    )}

                    {isManualGame && isAccountVerified && (
                      <div className="mb-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        <span>Account verified ({verifiedProfile?.displayName || verifiedProfile?.nickname || formData.userId || formData.account})! Choose your package below:</span>
                      </div>
                    )}

                    {/* Keep every category visible, matching the store layout. */}
                    <div className={isMobileLegends ? 'space-y-5' : ''}>
                          {packageGroups.map((group) => (
                            <section
                              key={group.id}
                              aria-labelledby={isMobileLegends ? `package-group-${group.id}` : undefined}
                              className={isMobileLegends && group.id !== 'regular' ? 'border-t border-[#2A2D39] pt-4' : ''}
                            >
                              {isMobileLegends && (
                                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                                    group.id === 'regular'
                                      ? 'bg-[#2A1018] text-[#FF3156]'
                                      : 'bg-[#251D11] text-[#F5A524]'
                                  }`}>
                                    {group.id === 'regular' ? <Gem size={16} /> : <Sparkles size={16} />}
                                  </span>
                                  <h3
                                    id={`package-group-${group.id}`}
                                    className="m-0 text-[13px] font-black text-white sm:text-[14px]"
                                  >
                                    {group.name}
                                  </h3>
                                  <span className="rounded-full bg-[#1B1D26] px-2 py-0.5 text-[9px] font-bold text-slate-400">
                                    {group.packages.length}
                                  </span>
                                  {group.badge && (
                                    <span className="rounded-full border border-[#5A1B28] bg-[#2A1018] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#FF5C78]">
                                      {group.badge}
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 ${isMobileLegends ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
                                {group.packages.map((pkg) => {
                                  const isSelected = selectedEventId === group.id && selectedPkg?.id === pkg.id;
                                  const originalPrice = isLiveProvider ? null : (pkg.price * 1.15).toFixed(2);

                                  return (
                                    <div
                                      key={pkg.id}
                                      onClick={() => {
                                        setSelectedPkg(pkg);
                                        setSelectedEventId(group.id);
                                      }}
                                      className={`relative cursor-pointer select-none border text-left transition-all active:scale-[0.98] ${
                                        isMobileLegends
                                          ? 'flex min-h-[82px] items-center rounded-[14px] bg-[#171922] p-3 sm:min-h-[88px] sm:p-3.5'
                                          : 'flex min-h-[75px] flex-col justify-between rounded-xl bg-white p-2.5 sm:min-h-[90px] sm:p-3.5'
                                      } ${
                                        isSelected
                                          ? isMobileLegends
                                            ? 'border-[#E3062F] bg-[#251016] ring-2 ring-[#E3062F]/25 shadow-[0_8px_20px_rgba(227,6,47,0.13)]'
                                            : 'border-[#E3062F] bg-[#FFF0F3]/30 ring-2 ring-[#E3062F]/30 shadow-2xs'
                                          : isMobileLegends
                                            ? 'border-[#2A2D39] hover:border-[#E3062F] hover:bg-[#1D1F29] hover:shadow-[0_8px_20px_rgba(227,6,47,0.12)]'
                                            : 'border-[#222432] hover:border-[#E3062F]/60 hover:bg-[#151620]'
                                      }`}
                                    >
                                      {isMobileLegends ? (
                                        <>
                                          <span className={`mr-3 flex h-11 w-11 shrink-0 items-center justify-center sm:h-12 sm:w-12 ${
                                            pkg.image
                                              ? 'bg-transparent overflow-visible'
                                              : 'overflow-hidden rounded-xl bg-[#2A1018] text-[#FF3156]'
                                          }`}>
                                            {pkg.image ? (
                                              <img
                                                src={pkg.image}
                                                alt={pkg.name || ''}
                                                className="h-full w-full object-contain drop-shadow-md"
                                                onError={(event) => { event.currentTarget.style.display = 'none'; }}
                                              />
                                            ) : group.id === 'regular' ? (
                                              <Gem size={25} strokeWidth={1.8} />
                                            ) : (
                                              <Sparkles size={24} strokeWidth={1.8} />
                                            )}
                                          </span>
                                          <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-1">
                                              {pkg.popular && (
                                                <span className="rounded-full bg-[#35121B] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-[#FF6B84]">
                                                  Popular
                                                </span>
                                              )}
                                              {pkg.bonus && (
                                                <span className="max-w-full truncate rounded-full bg-[#25151B] px-1.5 py-0.5 text-[8px] font-bold text-[#FF718B]">
                                                  {pkg.bonus}
                                                </span>
                                              )}
                                            </span>
                                            <span className="mt-0.5 block text-[12px] font-extrabold leading-tight text-white sm:text-[13px]">
                                              {pkg.name}
                                            </span>
                                            <span className="mt-1 block text-[13px] font-black leading-none text-[#FF3156] sm:text-[14px]">
                                              {formatPrice(pkg.price, currentRegion)}
                                            </span>
                                          </span>
                                          {isSelected && (
                                            <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#E3062F] text-white shadow-sm">
                                              <Check size={10} strokeWidth={3} />
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <>
                                          <div>
                                            {pkg.image && (
                                              <img src={pkg.image} alt="" className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md mb-1.5 bg-transparent" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                            )}
                                            {pkg.popular && (
                                              <span className="inline-block text-[8px] sm:text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#E3062F] text-white mb-1">
                                                BEST VALUE
                                              </span>
                                            )}
                                            <div className="text-[12px] sm:text-[13px] font-bold text-white leading-tight">
                                              {pkg.name}
                                            </div>
                                            {pkg.bonus && (
                                              <div className="text-[9.5px] sm:text-[10.5px] text-[#E3062F] font-semibold mt-0.5">
                                                {pkg.bonus}
                                              </div>
                                            )}
                                          </div>

                                          <div className="mt-2 pt-1.5 border-t border-[#1E202B] flex items-baseline justify-between">
                                            <div className="flex items-baseline gap-1">
                                              <span className="text-[13px] sm:text-[14px] font-black text-[#E3062F] font-mono leading-none">
                                                {formatPrice(pkg.price, currentRegion)}
                                              </span>
                                              {originalPrice && (
                                                <span className="text-[9.5px] text-slate-500 line-through font-mono leading-none">
                                                  {formatPrice(originalPrice, currentRegion)}
                                                </span>
                                              )}
                                            </div>

                                            {isSelected && (
                                              <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#E3062F] text-white flex items-center justify-center text-[9px] shrink-0">
                                                <Check size={10} strokeWidth={3} />
                                              </span>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </section>
                          ))}
                        </div>
                  </div>
                );

                return (
                  <>
                    {renderAccountCard()}
                    {renderPackagesCard()}
                  </>
                );
              })()}

              {/* STEP 3: Select Payment Method (Single Official Primary Gateway) */}
              <div className="bg-[#12131A] border border-[#222432] rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-[#1E202B]">
                  <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#E3062F] text-white font-black text-xs flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <h2 className="text-[14px] sm:text-base font-bold text-white leading-tight m-0">
                      Select Payment Method
                    </h2>
                    <p className="text-[11px] sm:text-[12px] text-slate-400 mt-0.5 m-0">
                      Fast, secure payment with 0% processing fee
                    </p>
                  </div>
                </div>

                <div className="w-full">
                  {/* Bakong KHQR Option (Single Official Primary Gateway) */}
                  <div
                    onClick={() => setPaymentMethod('khqr')}
                    className="p-3.5 sm:p-4 rounded-xl border border-[#E3062F] bg-[#E3062F]/10 ring-1 ring-[#E3062F] shadow-[0_0_20px_rgba(227,6,47,0.2)] text-white flex items-center justify-between select-none cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src="/assets/payments/bakong_khqr.svg"
                        alt="Bakong KHQR"
                        className="h-8 sm:h-9 w-auto object-contain rounded shrink-0 shadow-2xs"
                      />
                      <div className="min-w-0">
                        <div className="text-[13px] sm:text-[14px] font-bold text-white flex items-center gap-2 flex-wrap font-['Rajdhani']">
                          <span>Bakong KHQR</span>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#E3062F] text-white uppercase tracking-wider">
                            0% Fee
                          </span>
                        </div>
                        <div className="text-[11px] sm:text-[11.5px] text-slate-300 font-medium mt-0.5">
                          Scan with Bakong, ABA, ACLEDA, Canadia, Wing & all Cambodian KHQR banks
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 ml-3">
                      <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#E3062F] text-white flex items-center justify-center text-xs shadow-md">
                        <Check size={13} strokeWidth={3} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Sticky Order Summary (4 Columns) */}
            <div className="lg:col-span-4 sticky top-20 flex flex-col gap-4">

              <div className="bg-white border border-[#222432] rounded-2xl p-5 shadow-xs">
                <h3 className="text-base font-bold text-white pb-3 border-b border-[#1E202B]">
                  Order Summary
                </h3>

                {/* Selected Item Detail */}
                <div className="py-3 border-b border-[#1E202B] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-white truncate">{game.name}</div>
                    <div className="text-[12px] text-slate-400 truncate">{selectedPkg?.name || 'Selected Package'}</div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Desktop Sidebar Qty Stepper */}
                    <div className="flex items-center gap-1 rounded-lg border border-[#2A2D39] bg-[#12131A] px-1.5 py-0.5">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        disabled={quantity <= 1}
                        onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                        className="flex h-5 w-5 items-center justify-center rounded border border-[#2A2D39] bg-[#191B24] text-[11px] font-bold text-slate-200 hover:bg-[#252838] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer transition-colors"
                      >-</button>
                      <span className="min-w-[14px] text-center font-mono text-xs font-black text-white">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        disabled={quantity >= MAX_PURCHASE_QUANTITY}
                        onClick={() => setQuantity((current) => Math.min(MAX_PURCHASE_QUANTITY, current + 1))}
                        className="flex h-5 w-5 items-center justify-center rounded border-0 bg-[#E3062F] text-[11px] font-bold text-white hover:bg-[#B80D2E] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer transition-colors"
                      >+</button>
                    </div>

                    <div className="text-[14px] font-extrabold text-white font-mono">
                      {formatPrice(rawSubtotal, currentRegion)}
                    </div>
                  </div>
                </div>

                {/* Account Details */}
                <div className="py-2.5 border-b border-[#1E202B] text-[12px]">
                  <div className="text-slate-500 font-bold text-[10px] uppercase mb-1">Account Delivery</div>
                  <div className="text-white font-medium">
                    {formData.userId ? `ID: ${formData.userId}` : 'Not provided yet'}
                    {formData.zoneId ? ` (${formData.zoneId})` : ''}
                  </div>
                  {verifiedProfile && (
                    <div className="text-[#E3062F] font-bold text-[11px] mt-0.5">
                      <CheckCircle2 size={13} className="inline mr-1 text-emerald-500" /> {verifiedProfile.nickname}
                    </div>
                  )}
                </div>



                {/* Price Breakdown */}
                <div className="py-3 border-b border-[#1E202B] flex flex-col gap-1.5 text-[13px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatPrice(rawSubtotal, currentRegion)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-[#E3062F] font-semibold">
                      <span>Voucher Discount</span>
                      <span className="font-mono">-{formatPrice(discountAmount, currentRegion)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-400">
                    <span>Processing Fee</span>
                    <span className="text-[#E3062F] font-bold">FREE (0%)</span>
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t border-[#1E202B]">
                    <span className="font-bold text-white text-base">Total Payable</span>
                    <div className="text-right">
                      <div className="text-xl font-black text-[#E3062F] font-mono">
                        ${totalPrice} USD
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terms Agreement Checkbox */}
                <div className="pt-3 pb-2 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="termsCheck"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 accent-[#E3062F]"
                  />
                  <label htmlFor="termsCheck" className="text-[11px] text-slate-400 leading-tight cursor-pointer">
                    I agree to the Terms of Sale and confirm my Player UID / Zone is correct.
                  </label>
                </div>

                {/* Account Verification Status Alert before Checkout */}
                {!isAccountVerified ? (
                  <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-[#2A2D39] bg-[#0C0D13] p-3 text-[11px] shadow-[inset_3px_0_0_#E3062F]">
                    <AlertCircle size={16} className="shrink-0 text-[#ff4969]" />
                    <div>
                      <div className="font-black text-slate-100">Player account verification required</div>
                      <div className="mt-0.5 text-[10.5px] text-slate-400">Verify the player account in Step 1 to unlock checkout.</div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2.5 text-[11.5px] font-medium text-emerald-300">
                    {verifiedProfile?.avatar ? (
                      <img src={verifiedProfile.avatar} alt="Avatar" className="w-6 h-6 rounded-full border border-emerald-500 object-cover shrink-0" />
                    ) : (
                      <UserCheck size={16} className="text-emerald-400 shrink-0" />
                    )}
                    <span className="truncate">Top-up recipient: <strong className="text-white">{verifiedProfile?.displayName || verifiedProfile?.nickname}</strong></span>
                  </div>
                )}

                {/* Form Error Banner */}
                {formError && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-[11px] text-rose-300">
                    <AlertCircle size={14} className="shrink-0 text-rose-400" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* YuriGame checkout button */}
                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  disabled={!providerOrderingEnabled || !isAccountVerified}
                  className={`w-full text-base py-3.5 mt-2 flex items-center justify-center gap-2 rounded-xl font-black transition-all ${!isAccountVerified
                      ? 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed shadow-none'
                      : 'seagm-btn-orange shadow-md active:scale-[0.99] cursor-pointer'
                    }`}
                >
                  {!isAccountVerified ? (
                    <>
                      <Lock size={16} />
                      <span>Verify Account to Unlock Payment</span>
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      <span>{providerOrderingEnabled ? `Buy Now • ${formatPrice(totalPrice, currentRegion)}` : 'Live ordering locked'}</span>
                    </>
                  )}
                </button>

                {/* Trust Badges */}
                <div className="mt-4 pt-3 border-t border-[#1E202B] flex items-center justify-around text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={13} className="text-[#E3062F]" />
                    <span>100% Protected</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap size={13} className="text-[#E3062F]" />
                    <span>60s Auto Top-Up</span>
                  </span>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* 5. Mobile Sticky Bottom Checkout Bar (Instant 1-Tap Buy / Pay Now) */}
        {stage === 'form' && (
          <div className="block lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0e1017]/95 border-t border-[#222432] px-3.5 py-2.5 shadow-[0_-8px_30px_rgba(0,0,0,0.85)] backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
              {/* Left: Total Payable */}
              <div className="min-w-0 flex flex-col justify-center">
                <div className="text-[9.5px] text-slate-400 uppercase font-black tracking-wider leading-none">Total Payable</div>
                <div className="text-lg font-black text-[#E3062F] font-mono leading-tight mt-0.5 whitespace-nowrap">
                  {formatPrice(totalPrice, currentRegion)}
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[95px] sm:max-w-[120px]">
                  {selectedPkg?.name || 'Selected'}
                </div>
              </div>

              {/* Center: Mobile Sticky Bar Qty Stepper */}
              <div className="flex items-center gap-1 rounded-lg border border-[#2A2D39] bg-[#12131A] px-1.5 py-1 shrink-0 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 select-none">Qty:</span>
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  className="flex h-5.5 w-5.5 items-center justify-center rounded border border-[#2A2D39] bg-[#191B24] text-xs font-bold text-slate-200 hover:bg-[#252838] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer transition-colors"
                >
                  -
                </button>
                <span className="min-w-[16px] text-center font-mono text-xs font-black text-white select-none">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={quantity >= MAX_PURCHASE_QUANTITY}
                  onClick={() => setQuantity((current) => Math.min(MAX_PURCHASE_QUANTITY, current + 1))}
                  className="flex h-5.5 w-5.5 items-center justify-center rounded border-0 bg-[#E3062F] text-xs font-bold text-white hover:bg-[#B80D2E] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer transition-colors"
                >
                  +
                </button>
              </div>

              {/* Right: Action Button */}
              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={!providerOrderingEnabled || !isAccountVerified}
                className={`flex-1 min-w-[105px] max-w-[150px] py-2.5 px-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg active:scale-95 border-0 rounded-xl transition-all ${
                  !isAccountVerified
                    ? 'bg-slate-800 text-slate-400 border border-slate-700/80 cursor-not-allowed shadow-none'
                    : 'seagm-btn-orange cursor-pointer'
                }`}
              >
                {!isAccountVerified ? (
                  <>
                    <Lock size={13} className="shrink-0" />
                    <span className="truncate">Verify</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} className="shrink-0" />
                    <span className="truncate">{providerOrderingEnabled ? 'Pay Now' : 'Locked'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2: BAKONG KHQR PAYMENT SCANNER */}
        {stage === 'payment' && (
          <div className="max-w-xl mx-auto bg-[#15161b] border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setStage('form')}
                className="text-[12px] font-bold text-slate-400 hover:text-white flex items-center gap-1 bg-transparent border-0 cursor-pointer transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Modify Order</span>
              </button>
              <div className="text-right">
                <span className="text-[11px] text-slate-500">Ref:</span>
                <span className="text-[12px] font-bold text-[#E3062F] ml-1 font-mono">{pendingOrderRef}</span>
              </div>
            </div>

            {/* Recipient verification banner in payment stage */}
            {verifiedProfile && (
              <div className="mb-4 p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                {verifiedProfile.avatar ? (
                  <img src={verifiedProfile.avatar} alt="Avatar" className="w-8 h-8 rounded-full border border-emerald-500 object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                    {(verifiedProfile.displayName || verifiedProfile.nickname || 'P')[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Top-up Destination</div>
                  <div className="text-xs font-bold text-white truncate">
                    {verifiedProfile.displayName || verifiedProfile.nickname}
                    <span className="text-slate-400 font-normal ml-1.5 font-mono text-[11px]">
                      (ID: {verifiedProfile.playerId || formData.userId || formData.user_id})
                    </span>
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  Verified
                </span>
              </div>
            )}

            <BakongKhqrCard
              amountUsd={totalPrice}
              amountKhr={rielPrice}
              orderRef={pendingOrderRef}
              paymentMethod={paymentMethod}
              orderDetails={{
                orderRef: pendingOrderRef,
                gameId: game.providerCode || game.id,
                gameName: game.name,
                packageId: selectedPkg?.id || null,
                packageCode: selectedPkg?.id || String(selectedPkg?.providerCode || selectedPkg?.code || '').trim(),
                providerPackageCode: String(selectedPkg?.providerCode || selectedPkg?.code || '').trim() || String(selectedPkg?.id || '').replace(/^sora_[^_]+_/, ''),
                packageName: selectedPkg?.name || 'Top-Up Pack',
                quantity,
                totalUsd: Number(totalPrice),
                totalKhr: rielPrice,
                isManualGame,
                fieldValues: (game.fields || []).map((f) => formData[f.key] || '').filter(Boolean),
                playerDetails: {
                  ...formData,
                  userId: formData.userId || formData.user_id_0 || formData.account || verifiedProfile?.username || '',
                  zoneId: formData.zoneId || formData.zone_id_1 || '',
                },
                verifiedPlayer: verifiedProfile?.displayName || formData.userId || 'Player',
                paymentMethod: 'Bakong KHQR'
              }}
              onPaymentConfirmed={handlePaymentConfirmed}
              onBack={() => setStage('form')}
            />
          </div>
        )}

        {/* STAGE 3: AUTOMATED FULFILLMENT IN PROGRESS */}
        {stage === 'delivering' && (
          <div className="max-w-md mx-auto bg-white border border-[#222432] rounded-2xl p-8 text-center shadow-md">
            <div className="w-16 h-16 rounded-full bg-[#FFF0F3] text-[#E3062F] mx-auto flex items-center justify-center mb-4">
              <Loader2 size={32} className="animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Processing Automated Top-Up...
            </h3>
            <p className="text-[13px] text-slate-400 mb-4">
              {deliveryMessage || `Communicating directly with ${game.name} servers. Your items will arrive within seconds.`}
            </p>
            <div className="w-full bg-[#181924] rounded-full h-2 overflow-hidden">
              <div className="bg-[#E3062F] h-full rounded-full animate-pulse w-3/4"></div>
            </div>
          </div>
        )}

        {/* STAGE 4: ORDER COMPLETED / PROCESSING RECEIPT */}
        {stage === 'completed' && completedOrder && (
          <div className="max-w-xl mx-auto bg-white border border-[#222432] rounded-2xl p-6 sm:p-8 shadow-md animate-in fade-in zoom-in-95 duration-300">
            {completedOrder.status === 'PROCESSING' ? (
              <div className="text-center mb-5">
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 bg-amber-50 text-amber-600 border-2 border-amber-300 relative shadow-sm">
                  <div className="absolute inset-0 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                  <Clock size={30} className="text-amber-600" />
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-black uppercase tracking-wider mb-2 shadow-xs">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  <span>⏳ IN PROCESSING • PLEASE WAIT OR CLOSE THIS TAB</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white m-0">
                  {isManualGame
                    ? (isRoblox ? 'Roblox Robux Top-Up in Progress' : 'RoS Legacy Top-Up in Progress')
                    : 'Delivery Batch Requires Review'}
                </h2>
                <p className="text-[12.5px] text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                  {isManualGame
                    ? (isRoblox
                        ? 'Your order has been sent to our verified admin team. Please wait while an admin sends your Robux, or you can safely close this tab anytime.'
                        : 'Your order has been sent to our verified admin team. Please wait while an admin adds the diamonds, or you can safely close this tab anytime.')
                    : `${completedOrder.deliveredQuantity || 0} of ${completedOrder.quantity || 1} item(s) were delivered automatically. The remaining ${completedOrder.pendingQuantity || completedOrder.quantity || 1} item(s) are queued for admin review.`}
                </p>

                {/* Clean, Premium In-Processing Notice Card (No glitch, perfectly stable) */}
                <div className="mt-4 mb-3 p-4 text-left rounded-xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border border-amber-200 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Zap size={20} className="text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                          <ShieldCheck size={14} className="inline mr-1 text-emerald-500" /> 100% Safe to Close This Tab
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Order Saved
                        </span>
                      </div>
                      <p className="text-[12px] text-[#475569] mt-1 leading-relaxed">
                        Our admins have your order in Telegram. You do not need to wait here. You can close this tab and track your {isRoblox ? 'Robux' : (game.currency || 'credits')} anytime in <strong>Orders</strong> with your username or Ref:
                      </p>

                      {/* Copyable Order Ref */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <div className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-mono font-bold text-slate-800 flex items-center gap-2 shadow-xs">
                          <span>Ref: {completedOrder.ref}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyRef(completedOrder.ref)}
                            className="hover:text-amber-600 transition-colors cursor-pointer border-0 bg-transparent p-0 flex items-center text-slate-500 hover:text-slate-800"
                            title="Copy Ref"
                          >
                            {isRefCopied ? <Check size={14} className="text-emerald-600 font-bold" /> : <Copy size={14} />}
                          </button>
                        </div>
                        {isRefCopied && (
                          <span className="text-[11px] font-bold text-emerald-600 animate-in fade-in duration-200">
                            <Check size={13} className="inline mr-1 text-emerald-500" /> Copied to clipboard!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Real-Time Live Status Bar with Close Tab Button */}
                  <div className="mt-3.5 pt-3 border-t border-amber-200/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-amber-800 font-medium text-[11.5px]">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span>Waiting for Admin fulfillment (Live updates enabled)...</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCloseTab}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 border-0"
                    >
                      <X size={13} />
                      <span>Close Tab or Return</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : completedOrder.status === 'FAILED' || completedOrder.status === 'CANCELLED' ? (
              <div className="text-center mb-5">
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 bg-rose-50 text-rose-600 border-2 border-rose-300 shadow-sm">
                  <AlertCircle size={32} />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-300 text-xs font-black uppercase tracking-wider mb-2">
                  <span className="inline-flex items-center gap-1"><XCircle size={15} className="text-red-500" /> Order Cancelled</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white m-0">
                  {completedOrder.status === 'CANCELLED' ? 'Order Cancelled by Admin' : 'Order Processing Notice'}
                </h2>
                <p className="text-[12.5px] text-slate-400 mt-1.5 max-w-md mx-auto">
                  {completedOrder.providerReason || 'Your order was cancelled by our administration team. If this was unexpected, please contact Telegram support.'}
                </p>
              </div>
            ) : (
              <div className="text-center mb-5">
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 bg-emerald-50 text-emerald-600 border-2 border-emerald-400 shadow-md">
                  <CheckCircle2 size={36} />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black uppercase tracking-wider mb-2">
                  <span className="inline-flex items-center gap-1"><CheckCircle2 size={15} className="text-emerald-500" /> {isRoblox ? 'Robux Sent Successfully!' : 'Diamonds Added Successfully!'}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white m-0">
                  Top-Up Completed & Delivered!
                </h2>
                <p className="text-[12.5px] text-slate-400 mt-1.5 max-w-md mx-auto">
                  {completedOrder.handledBy
                    ? `Admin ${completedOrder.handledBy} has ${isRoblox ? 'sent Robux to' : 'added diamonds to'} your account. Launch ${isRoblox ? 'Roblox' : 'RoS Legacy'} to enjoy!`
                    : `Your ${completedOrder.packageName} has been delivered to your in-game account.`}
                </p>
              </div>
            )}

            {/* Admin Confirmation Callout */}
            {completedOrder.status === 'COMPLETED' && completedOrder.handledBy && (
              <div className="p-3.5 rounded-xl mb-4 text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 flex items-center gap-2.5">
                <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
                <div className="flex-1">
                  <div>{isRoblox ? 'Robux sent' : 'Diamonds added'} by <strong>Admin {completedOrder.handledBy}</strong></div>
                  {completedOrder.handledAt && <div className="text-[11px] font-normal text-emerald-700">Confirmed at: {completedOrder.handledAt}</div>}
                </div>
              </div>
            )}

            {/* Receipt Summary Card */}
            <div className="bg-[#151620] border border-[#222432] rounded-xl p-4 mb-5 text-[13px] flex flex-col gap-2">
              <div className="flex justify-between pb-2 border-b border-[#222432]">
                <span className="text-slate-400">Order Reference</span>
                <span className="font-mono font-bold text-white">{completedOrder.ref}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-[#222432]">
                <span className="text-slate-400">Game</span>
                <span className="font-bold text-white">{completedOrder.gameName}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-[#222432]">
                <span className="text-slate-400">{isRoblox ? 'Item / Robux' : isRoS ? 'Item / Diamonds' : 'Item / Package'}</span>
                <span className="font-bold text-[#E3062F]">{completedOrder.packageName}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-[#222432]">
                <span className="text-slate-400">Quantity Ordered</span>
                <span className="font-mono font-black text-white">× {completedOrder.quantity || 1}</span>
              </div>
              {Array.isArray(completedOrder.providerRefs) && completedOrder.providerRefs.length > 0 && (
                <div className="flex justify-between pb-2 border-b border-[#222432]">
                  <span className="text-slate-400">Automatic Delivery</span>
                  <span className={`font-mono font-black ${(completedOrder.pendingQuantity || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {completedOrder.deliveredQuantity || 0} / {completedOrder.quantity || 1} delivered
                  </span>
                </div>
              )}
              <div className="flex justify-between pb-2 border-b border-[#222432]">
                <span className="text-slate-400">{isRoS ? 'RoS Account (Username/Gmail)' : isRoblox ? 'Roblox Username' : 'Player ID'}</span>
                <span className="font-bold text-white font-mono">
                  {completedOrder.playerDetails?.account || completedOrder.playerDetails?.userId || completedOrder.playerDetails?.username || completedOrder.verifiedPlayer}
                </span>
              </div>
              {completedOrder.playerDetails?.password && (
                <div className="flex justify-between pb-2 border-b border-[#222432]">
                  <span className="text-slate-400">Account Password</span>
                  <span className="font-bold text-white font-mono">••••••••</span>
                </div>
              )}
              <div className="flex justify-between pb-2 border-b border-[#222432]">
                <span className="text-slate-400">Payment Method</span>
                <span className="font-bold text-white">{completedOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-bold text-white">Total Amount</span>
                <span className="font-mono font-black text-[#E3062F] text-base">
                  {formatPrice(completedOrder.totalUsd, currentRegion)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex">
              <button
                type="button"
                onClick={handleCloseTab}
                className="w-full seagm-btn-teal py-3 text-sm font-black uppercase tracking-wider cursor-pointer shadow-lg active:scale-95 transition-all"
              >
                <span>{completedOrder.status === 'PROCESSING' ? 'Close Tab / Return to Store' : 'Done • Back to Store'}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
