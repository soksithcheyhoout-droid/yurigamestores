// Central Dynamic Order & Transaction Store for Cheydev TopUp
// Manages real persistent orders, MySQL synchronization, dynamic live feed generation, and player verification

const STORAGE_ORDERS_KEY = 'cheydev_orders_v2';
const STORAGE_WALLET_KEY = 'cheydev_wallet_v2';
const STORAGE_WALLET_HIST_KEY = 'cheydev_wallet_history_v2';

// Realistic initial orders for initial hydration
const SEED_ORDERS = [
  {
    ref: "YGS-161563",
    gameId: "roslegacy",
    gameName: "RoS Legacy",
    packageName: "200 Diamonds",
    quantity: 1,
    totalUsd: 4.00,
    totalKhr: "16,400",
    paymentMethod: "Bakong KHQR",
    playerDetails: { userId: "asdasdas", gmail: "player@gmail.com" },
    verifiedPlayer: "asdasdas",
    timestamp: new Date().toISOString(),
    status: "PROCESSING",
    serverPing: "18ms",
    icon: "/assets/brand/yurigame-logo.webp"
  },
  {
    ref: "CD-948210",
    gameId: "mlbb",
    gameName: "Mobile Legends: Bang Bang",
    packageName: "Weekly Diamond Pass",
    quantity: 1,
    totalUsd: 1.81,
    totalKhr: "7,421",
    paymentMethod: "Bakong / KHQR",
    playerDetails: { userId: "29481903", zoneId: "2042" },
    verifiedPlayer: "Shadow_Chey99 (Zone: 2042)",
    timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    status: "DELIVERED",
    serverPing: "18ms",
    icon: "/assets/games/mlbb_tile_4k.jpg"
  },
  {
    ref: "CD-948195",
    gameId: "pubgm",
    gameName: "PUBG Mobile",
    packageName: "660 UC Royale Pass",
    quantity: 1,
    totalUsd: 9.40,
    totalKhr: "38,540",
    paymentMethod: "ABA PAY Mobile",
    playerDetails: { userId: "5123849102" },
    verifiedPlayer: "Sniper_DaraKH",
    timestamp: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    status: "DELIVERED",
    serverPing: "22ms",
    icon: "/assets/games/pubg_tile_4k.jpg"
  },
  {
    ref: "CD-948180",
    gameId: "genshin",
    gameName: "Genshin Impact",
    packageName: "Blessing of Welkin Moon",
    quantity: 1,
    totalUsd: 4.80,
    totalKhr: "19,680",
    paymentMethod: "Bakong / KHQR",
    playerDetails: { userId: "800192841", server: "Asia" },
    verifiedPlayer: "Kaveh_Traveler (Asia)",
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    status: "DELIVERED",
    serverPing: "24ms",
    icon: "/assets/games/genshin_tile_4k.jpg"
  }
];

// Check backend & MySQL database health
export async function checkDbHealth() {
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Backend offline or unreachable
  }
  return { status: 'offline', mysql: 'disconnected' };
}

// Sync orders from MySQL database into store and cache without dropping local RoS orders
export async function syncOrdersFromDb() {
  try {
    const res = await fetch('/api/orders');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        const local = getStoredOrders();
        const remoteRefs = new Set(data.orders.map(o => o.ref));
        const keepLocal = local.filter(o => !remoteRefs.has(o.ref));
        const merged = [...data.orders, ...keepLocal];

        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(merged.slice(0, 50)));
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cheydev_orders_synced', { detail: merged }));
        }
        return merged;
      }
    }
  } catch (e) {
    console.log('[orderStore] Offline or using local order cache');
  }
  return getStoredOrders();
}

// Sync specific logged-in user's orders from MySQL
export async function syncUserOrdersFromDb(userId) {
  try {
    const url = userId ? `/api/orders?userId=${encodeURIComponent(userId)}` : '/api/orders';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(data.orders));
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cheydev_orders_synced', { detail: data.orders }));
        }
        return data.orders;
      }
    }
  } catch (err) {
    console.warn('Error syncing user orders:', err.message);
  }
  return getStoredOrders();
}

// Fetch user's wallet balance and transaction history from MySQL
export async function fetchUserWallet(userId) {
  try {
    const res = await fetch(`/api/wallet/${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        saveWalletBalance(data.balance);
        if (Array.isArray(data.history)) {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_WALLET_HIST_KEY, JSON.stringify(data.history));
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cheydev_wallet_history_synced', { detail: data.history }));
          }
        }
        return data;
      }
    }
  } catch (err) {
    console.warn('Error fetching user wallet from MySQL:', err.message);
  }
  return null;
}

// Automatically initiate sync on load in browser environment
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncOrdersFromDb();
  }, 100);
}

// Persistent unique device identifier for device-bound order tracking and privacy
export function getOrCreateDeviceId() {
  if (typeof localStorage === 'undefined') return 'device_' + Date.now();
  try {
    let id = localStorage.getItem('yurigame_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem('yurigame_device_id', id);
    }
    return id;
  } catch {
    return 'device_' + Date.now();
  }
}

// Load persisted orders
export function getStoredOrders() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_ORDERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading stored orders", e);
  }
  return [];
}

// Save order to store and sync with MySQL database
export function saveNewOrder(order) {
  try {
    const existing = getStoredOrders();
    const updated = [order, ...existing.filter(o => o.ref !== order.ref)];
    
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(updated.slice(0, 50)));
    }
    
    // Dispatch custom event so all open tabs or listening components update immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cheydev_new_order', { detail: order }));
    }

    // Persist to MySQL Backend API asynchronously
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('[OrderStore] Order successfully saved to MySQL database:', data.order.ref);
        }
      })
      .catch(err => {
        console.warn('[OrderStore] Could not persist order to MySQL, stored locally:', err.message);
      });

    return updated;
  } catch (e) {
    console.error("Error saving order", e);
    return [order];
  }
}

// Synchronize order statuses from live server checks back into localStorage and broadcast to app
export function syncOrdersStatusWithRemote(remoteOrders = []) {
  if (!Array.isArray(remoteOrders) || remoteOrders.length === 0) return;
  try {
    const existing = getStoredOrders();
    let hasChanges = false;
    const remoteMap = new Map();
    for (const r of remoteOrders) {
      if (r && (r.ref || r.refid)) {
        remoteMap.set(r.ref || r.refid, r);
      }
    }

    const updated = existing.map((local) => {
      const match = remoteMap.get(local.ref);
      if (!match) return local;

      const rawNew = String(match.status || match.rawStatus || '').toUpperCase();
      const standardNew =
        rawNew === 'COMPLETED' || rawNew === 'SUCCESS' || rawNew === 'DELIVERED'
          ? 'DELIVERED'
          : rawNew === 'CANCELLED' || rawNew === 'FAILED'
          ? 'CANCELLED'
          : 'PROCESSING';

      const localStatus = String(local.status || '').toUpperCase();
      if (standardNew !== localStatus && standardNew !== 'PROCESSING') {
        hasChanges = true;
        return {
          ...local,
          status: standardNew,
          reason: match.reason || local.reason,
          handledBy: match.handledBy || local.handledBy,
        };
      }
      return local;
    });

    if (hasChanges) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(updated.slice(0, 50)));
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cheydev_orders_synced', { detail: updated }));
      }
    }
  } catch (err) {
    console.warn('[OrderStore] syncOrdersStatusWithRemote error:', err);
  }
}

// Load persisted wallet balance
export function getStoredWalletBalance() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_WALLET_KEY);
      if (raw !== null) {
        const val = parseFloat(raw);
        if (!isNaN(val)) return val;
      }
    }
  } catch (e) {
    console.error("Error reading wallet", e);
  }
  return 25.00;
}

// Save wallet balance
export function saveWalletBalance(newBalance) {
  try {
    const safe = Math.max(0, parseFloat(newBalance.toFixed(2)));
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_WALLET_KEY, safe.toString());
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cheydev_wallet_update', { detail: safe }));
    }
    return safe;
  } catch (e) {
    console.error("Error saving wallet", e);
    return newBalance;
  }
}

const SEED_WALLET_HISTORY = [
  {
    id: "TX-DEP-94182",
    type: "DEPOSIT",
    title: "Bakong KHQR Direct Top-Up",
    amount: 25.00,
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    status: "COMPLETED",
    method: "Bakong KHQR (ABA Bank)"
  }
];

export function getStoredWalletHistory() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_WALLET_HIST_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading wallet history", e);
  }
  return SEED_WALLET_HISTORY;
}

export function recordWalletTransaction(entry, userId = null) {
  try {
    const existing = getStoredWalletHistory();
    const updated = [entry, ...existing].slice(0, 30);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_WALLET_HIST_KEY, JSON.stringify(updated));
    }

    // Persist deposit to MySQL backend if it's a deposit
    if (entry.type === 'DEPOSIT') {
      fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          amount: entry.amount,
          paymentMethod: entry.method
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            console.log('[OrderStore] Wallet deposit saved to MySQL:', data.transaction.id);
          }
        })
        .catch(err => {
          console.warn('[OrderStore] Could not sync deposit with MySQL:', err.message);
        });
    }

    return updated;
  } catch (e) {
    console.error("Error saving wallet transaction", e);
    return [entry];
  }
}

// Realistic gamer names list
const REALISTIC_GAMERS = [
  "Vannak_KH", "Sreypov_Pro", "Dara_Striker", "Borey_Sniper", "Sokha_Gamer",
  "Rithy_King", "Meng_ML", "Chann_FreeFire", "Piseth_Valorant", "Nary_Queen",
  "Sovann_Ghost", "Kosal_God", "Mony_PUBG", "Vichet_Apex", "Sothea_HOK"
];

// Dynamic live order generator that combines real user orders with live simulated activity
export function createLiveOrderGenerator(gamesData) {
  let listeners = [];
  let userOrders = getStoredOrders();

  // Listen to real orders placed in this session
  if (typeof window !== 'undefined') {
    window.addEventListener('cheydev_new_order', (e) => {
      if (e.detail) {
        userOrders = [e.detail, ...userOrders];
        broadcast(e.detail, true);
      }
    });

    window.addEventListener('cheydev_orders_synced', (e) => {
      if (Array.isArray(e.detail)) {
        userOrders = e.detail;
      }
    });
  }

  function broadcast(orderItem, isUserOrder = false) {
    listeners.forEach(fn => fn(orderItem, isUserOrder));
  }

  function generateSimulatedOrder() {
    if (!gamesData || gamesData.length === 0) return null;
    const game = gamesData[Math.floor(Math.random() * gamesData.length)];
    const pkg = game.packages[Math.floor(Math.random() * game.packages.length)];
    const gamerName = REALISTIC_GAMERS[Math.floor(Math.random() * REALISTIC_GAMERS.length)];
    const methods = ["Bakong KHQR", "ABA PAY", "YuriGame Wallet"];
    const method = methods[Math.floor(Math.random() * methods.length)];
    const randomUid = `${Math.floor(10000000 + Math.random() * 89999999)}`;
    const randomZone = game.id === 'mlbb' ? ` (${Math.floor(2000 + Math.random() * 8000)})` : '';

    return {
      ref: `CD-${Math.floor(100000 + Math.random() * 900000)}`,
      gameId: game.id,
      gameName: game.name,
      packageName: pkg.name,
      quantity: 1,
      totalUsd: pkg.price,
      totalKhr: (pkg.price * 4100).toLocaleString(),
      paymentMethod: method,
      playerDetails: { userId: randomUid },
      verifiedPlayer: `${gamerName}${randomZone}`,
      timestamp: new Date().toISOString(),
      status: "DELIVERED",
      serverPing: `${Math.floor(12 + Math.random() * 18)}ms`,
      icon: game.image || `/assets/games/${game.id}_tile_4k.jpg`,
      isLiveStream: true
    };
  }

  return {
    subscribe: (callback) => {
      listeners.push(callback);
      return () => {
        listeners = listeners.filter(fn => fn !== callback);
      };
    },
    getNextOrder: () => {
      // If user has recent orders, give them priority
      if (userOrders.length > 0 && Math.random() < 0.4) {
        const item = userOrders[Math.floor(Math.random() * Math.min(3, userOrders.length))];
        return { ...item, isUserOrder: true };
      }
      return generateSimulatedOrder();
    }
  };
}

// Player verifier placeholder (all active storefront games verify live via SoraTopup / Moonton / Garena)
export function verifyInGameAccount(game, fieldsData) {
  const uid = fieldsData.userId || fieldsData.playerId || 'Player';
  const zone = fieldsData.zoneId || fieldsData.server || '';

  return {
    verified: false,
    nickname: uid,
    level: null,
    serverRegion: zone ? `Zone ${zone}` : 'Official Gateway',
    statusText: "Live Server Verification",
    uidFormatted: uid,
    ping: 'Live'
  };
}
 