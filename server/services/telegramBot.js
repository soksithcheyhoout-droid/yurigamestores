import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/db.js';
import { generateAdminToken, getAdminFullConfig } from './adminStore.js';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LEGACY_ROS_DATA_FILE = path.resolve(__dirname, '../data/ros_orders.json');
// Save orders outside repository root in OS temp dir so Vite watcher never triggers a page reload!
const ROS_DATA_FILE = path.join(os.tmpdir(), 'yurigame_orders_store.json');

// Persistent & In-Memory store for RoS Orders
const rosOrders = new Map();

function loadPersistedRosOrders() {
  try {
    const fileToLoad = fs.existsSync(ROS_DATA_FILE) ? ROS_DATA_FILE : (fs.existsSync(LEGACY_ROS_DATA_FILE) ? LEGACY_ROS_DATA_FILE : null);
    if (fileToLoad) {
      const raw = fs.readFileSync(fileToLoad, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const order of list) {
          if (order && order.ref) {
            rosOrders.set(order.ref, order);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[RoS Persistence] Could not load persisted RoS orders:', err.message);
  }
}

let persistTimer = null;
function persistRosOrders() {
  if (persistTimer) return;
  persistTimer = setTimeout(async () => {
    persistTimer = null;
    try {
      const dir = path.dirname(ROS_DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const list = Array.from(rosOrders.values());
      await fs.promises.writeFile(ROS_DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[RoS Persistence] Could not save RoS orders to file:', err.message);
    }
  }, 50);
}

// Initial hydration from disk
loadPersistedRosOrders();

// Configuration
export function getTelegramConfig() {
  const fullConfig = (typeof getAdminFullConfig === 'function' ? getAdminFullConfig() : null) || {};
  const contacts = fullConfig.contacts || {};

  const botToken = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const admin1 = (contacts.telegramAdmin1Id || process.env.TELEGRAM_ADMIN_1 || '6805487598').trim();
  const admin1Name = (contacts.telegramAdmin1Name || '@Yur1Uchiha').trim();
  const admin2 = (contacts.telegramAdmin2Id || process.env.TELEGRAM_ADMIN_2 || '7283817695').trim();
  const admin2Name = (contacts.telegramAdmin2Name || '@kaixite').trim();
  const groupId = (contacts.telegramGroupId || process.env.TELEGRAM_GROUP_ID || '-1004493408552').trim();

  const adminIds = [admin1, admin2].filter(Boolean);

  return {
    botToken,
    adminIds,
    groupId,
    admin1,
    admin1Name,
    admin2,
    admin2Name,
  };
}

// Live health check for the Telegram bot token (getMe). Never throws.
export async function pingTelegramBot(tokenOverride) {
  const token = String(tokenOverride || process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!token) return { ok: false, configured: false, message: 'No bot token set.' };
  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/getMe`);
    const data = await res.json().catch(() => ({}));
    if (data?.ok && data.result) {
      return { ok: true, configured: true, account: `@${data.result.username}`, message: 'Connected' };
    }
    return { ok: false, configured: true, message: data?.description || `getMe failed (HTTP ${res.status})` };
  } catch (err) {
    return { ok: false, configured: true, message: err.message || 'Request failed.' };
  }
}

async function telegramRequest(method, payload = {}) {
  const { botToken } = getTelegramConfig();
  if (!botToken) return null;

  try {
    const url = `${TELEGRAM_API_BASE}/bot${botToken}/${method}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return await res.json();
  } catch (err) {
    console.error(`Telegram API error (${method}):`, err.message);
    return null;
  }
}

// Format local time nicely for Cambodia/Asia timezone
function formatLocalTime(date = new Date()) {
  try {
    return date.toLocaleString('en-GB', {
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return date.toISOString();
  }
}

// 1. Save or Update Manual Order (RoS Legacy & Roblox) in memory, persistent disk file, and MySQL
export async function saveRosOrder(order) {
  if (!order || !order.ref) return null;

  const isRoblox = String(order.gameId || order.game || '').toLowerCase().includes('roblox') || String(order.gameId || order.game || '').toLowerCase().includes('robux');
  const defaultGameId = isRoblox ? 'robuxsend' : 'roslegacy';
  const defaultGameName = isRoblox ? 'Roblox' : 'RoS Legacy';
  const defaultPackage = isRoblox ? '100 Robux' : '200 Diamonds';

  const existing = rosOrders.get(order.ref) || {};
  const merged = {
    ...existing,
    ...order,
    clientIp: order.clientIp || existing.clientIp || '',
    deviceId: order.deviceId || existing.deviceId || '',
    gameId: order.gameId || existing.gameId || defaultGameId,
    gameName: order.gameName || existing.gameName || defaultGameName,
    packageName: order.packageName || existing.packageName || defaultPackage,
    status: order.status || existing.status || 'PROCESSING',
    updatedAt: new Date().toISOString(),
    createdAt: existing.createdAt || order.createdAt || new Date().toISOString(),
  };

  rosOrders.set(order.ref, merged);
  persistRosOrders();

  // Optional: Update or Insert into MySQL `orders` table if available
  try {
    if (pool) {
      const [rows] = await pool.query('SELECT id FROM `orders` WHERE ref = ? LIMIT 1', [order.ref]);
      const playerIdentifier = merged.playerDetails?.account || merged.playerDetails?.userId || merged.playerDetails?.username || merged.verifiedPlayer || 'Player';
      if (rows.length > 0) {
        await pool.query(
          'UPDATE `orders` SET status = ?, verified_player = ? WHERE ref = ?',
          [merged.status, merged.verifiedPlayer || playerIdentifier, order.ref]
        );
      } else {
        await pool.query(
          `INSERT INTO \`orders\` 
           (ref, user_id, game_id, game_name, package_name, quantity, total_usd, total_khr, payment_method, player_id, zone_id, verified_player, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            merged.ref,
            merged.userId || null,
            merged.gameId,
            merged.gameName,
            merged.packageName,
            merged.quantity || 1,
            parseFloat(merged.totalUsd || 0),
            merged.totalKhr || '0',
            merged.paymentMethod || 'Bakong KHQR',
            playerIdentifier,
            merged.playerDetails?.gmail || merged.playerDetails?.zoneId || '',
            merged.verifiedPlayer || playerIdentifier,
            merged.status || 'PROCESSING'
          ]
        );
      }
    }
  } catch (err) {
    // MySQL table update is non-blocking
  }

  return merged;
}

// 2. Query RoS Order by Ref
export async function getRosOrder(ref) {
  if (!ref) return null;
  if (rosOrders.has(ref)) {
    return rosOrders.get(ref);
  }

  // Fallback to MySQL if in-memory cache missed
  try {
    if (pool) {
      const [rows] = await pool.query('SELECT * FROM `orders` WHERE ref = ? LIMIT 1', [ref]);
      if (rows.length > 0) {
        const row = rows[0];
        const loaded = {
          ref: row.ref,
          gameId: row.game_id,
          gameName: row.game_name,
          packageName: row.package_name,
          quantity: row.quantity,
          totalUsd: parseFloat(row.total_usd),
          totalKhr: row.total_khr,
          paymentMethod: row.payment_method,
          status: row.status === 'DELIVERED' ? 'COMPLETED' : row.status,
          playerDetails: {
            userId: row.player_id,
            gmail: row.zone_id || '',
          },
          verifiedPlayer: row.verified_player,
          createdAt: row.created_at,
        };
        rosOrders.set(ref, loaded);
        return loaded;
      }
    }
  } catch { }

  return null;
}

// Query all RoS Orders (for Track Order modal and admin dashboard)
export function getAllRosOrders(query = '') {
  const cleanQ = String(query || '').trim().toLowerCase();
  const list = Array.from(rosOrders.values()).reverse();
  if (!cleanQ) return list;
  return list.filter((o) => {
    const ref = String(o.ref || '').toLowerCase();
    const user = String(o.playerDetails?.account || o.playerDetails?.userId || o.playerDetails?.username || o.verifiedPlayer || '').toLowerCase();
    const gmail = String(o.playerDetails?.gmail || '').toLowerCase();
    const pkg = String(o.packageName || '').toLowerCase();
    return ref.includes(cleanQ) || user.includes(cleanQ) || gmail.includes(cleanQ) || pkg.includes(cleanQ);
  });
}

// 3. Update RoS Order Status (called when Admin taps Done or Cancel)
export async function updateRosOrderStatus(ref, newStatus, adminInfo = {}) {
  const order = await getRosOrder(ref);
  if (!order) return null;

  const updated = {
    ...order,
    status: newStatus,
    handledBy: adminInfo.name || adminInfo.username || adminInfo.id || 'Admin',
    handledAt: new Date().toISOString(),
    handledAtFormatted: formatLocalTime(),
  };

  rosOrders.set(ref, updated);
  persistRosOrders();

  if (pool) {
    const dbStatus = newStatus === 'COMPLETED' ? 'DELIVERED' : newStatus;
    pool.query('UPDATE `orders` SET status = ? WHERE ref = ?', [dbStatus, ref]).catch((err) => {
      console.warn('Could not update MySQL order status:', err.message);
    });
  }

  return updated;
}

// Set to prevent duplicate notification spam for the same order ref
const recentlyNotifiedRefs = new Set();

// 4. Send Instant Payment & Order Notification to Supergroup & Both Admins for ALL GAMES
export async function notifyOrderToAdmins(order) {
  if (!order || !order.ref) return false;

  // Deduplication check: ignore if sent in the last 60 seconds
  if (recentlyNotifiedRefs.has(order.ref)) {
    return true;
  }
  recentlyNotifiedRefs.add(order.ref);
  setTimeout(() => recentlyNotifiedRefs.delete(order.ref), 60_000);

  const { adminIds, groupId, admin1, admin2 } = getTelegramConfig();

  const gameCode = String(order.gameId || order.game || order.providerCode || '').toLowerCase();
  const rawGameName = order.gameName || (
    gameCode.includes('ros') ? 'Rules of Survival (RoS Legacy)' :
    gameCode.includes('robux') || gameCode.includes('roblox') ? 'Roblox' :
    gameCode.includes('ml') ? 'Mobile Legends KH' :
    gameCode.includes('ff') || gameCode.includes('freefire') ? 'Free Fire' :
    'YuriGame Store Top-Up'
  );

  const isRoS = gameCode.includes('ros') || rawGameName.toLowerCase().includes('ros');
  const isRoblox = gameCode.includes('robux') || gameCode.includes('roblox') || rawGameName.toLowerCase().includes('roblox');
  const isMLBB = gameCode.includes('ml') || rawGameName.toLowerCase().includes('mobile legends') || rawGameName.toLowerCase().includes('mlbb');
  const isFF = gameCode.includes('ff') || rawGameName.toLowerCase().includes('free fire');

  // Option 6: Detect MLBB Special Events vs Regular Diamonds
  const isMlbbEvent = isMLBB && (
    Boolean(order.isEvent) ||
    Boolean(order.eventCategory) ||
    String(order.packageName || '').toLowerCase().includes('event') ||
    String(order.packageName || '').toLowerCase().includes('weekly diamond pass') ||
    String(order.packageName || '').toLowerCase().includes('mega')
  );
  const mlbbEventLabel = order.eventName || order.eventCategory || (String(order.packageName || '').toLowerCase().includes('weekly') ? 'Weekly Diamond Pass Event' : 'Special Diamonds Event');

  const account = order.playerDetails?.account || order.playerDetails?.userId || order.playerDetails?.username || order.verifiedPlayer || 'Customer Account';
  const password = order.playerDetails?.password || '';
  const zoneId = order.playerDetails?.zoneId || order.playerDetails?.server || '';
  const verifiedPlayer = order.verifiedPlayer || account;
  const amountUsd = Number(order.totalUsd || order.amount || 0).toFixed(2);
  const amountKhr = order.totalKhr || (Math.round(amountUsd * 4100)).toLocaleString();
  const packageName = order.packageName || order.item || 'Game Credits';
  const quantity = order.quantity || 1;
  const paymentMethod = order.paymentMethod || 'Bakong KHQR (Verified)';
  const timeFormatted = formatLocalTime();

  // 1. Credentials section formatted specifically per game
  let playerCredsHtml = '';
  if (isRoS) {
    playerCredsHtml = [
      `👤 <b>PLAYER LOGIN CREDENTIALS:</b>`,
      `🎮 <b>Account (Username or Gmail):</b> <code>${account}</code>`,
      `🔑 <b>Account Password:</b> <code>${password || 'Not provided'}</code>`,
    ].join('\n');
  } else if (isRoblox) {
    playerCredsHtml = [
      `👤 <b>PLAYER ROBLOX ACCOUNT:</b>`,
      `🎮 <b>Roblox Username:</b> <code>${account}</code>`,
      `🏷️ <b>Recipient Name:</b> <code>${verifiedPlayer}</code>`,
    ].join('\n');
  } else if (isMLBB) {
    playerCredsHtml = [
      `👤 <b>PLAYER MOONTON ACCOUNT:</b>`,
      `🎮 <b>User ID:</b> <code>${account}</code> ${zoneId ? `(Zone: <code>${zoneId}</code>)` : ''}`,
      `🏷️ <b>In-Game Name (IGN):</b> <code>${verifiedPlayer}</code>`,
    ].join('\n');
  } else if (isFF) {
    playerCredsHtml = [
      `👤 <b>PLAYER GARENA ACCOUNT:</b>`,
      `🎮 <b>Free Fire Player ID:</b> <code>${account}</code>`,
      `🏷️ <b>Character IGN:</b> <code>${verifiedPlayer}</code>`,
    ].join('\n');
  } else {
    playerCredsHtml = [
      `👤 <b>PLAYER ACCOUNT:</b>`,
      `🎮 <b>Account / Player ID:</b> <code>${account}</code>`,
    ].join('\n');
  }

  // 2. Status & Action Buttons
  let statusHtml = '';
  let inlineKeyboard = null;

  const statusUpper = String(order.status || '').toUpperCase();
  const autoDelivered = ['DELIVERED', 'COMPLETED', 'SUCCESS'].includes(statusUpper);

  if (isRoS) {
    if (autoDelivered) {
      // Auto-delivered via provider — informational only, no buttons.
      statusHtml = [
        `⚡ <b>Payment Status:</b> 🟢 <b>PAID & CONFIRMED</b>`,
        `🚀 <b>Fulfillment:</b> <b>Auto-delivered via provider</b>`,
        `🕒 <b>Delivered At:</b> ${timeFormatted}`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `✨ <i>Diamonds credited automatically to the RoS account.</i>`,
      ].join('\n');
      inlineKeyboard = null;
    } else {
      // RoS Legacy auto-delivery failed → an admin tops up the account manually with the
      // credentials above, then taps Approve to mark it completed (the customer's order screen
      // flips from Pending to Success live). "Mark Failed" cancels the order instead.
      statusHtml = [
        `⚠️ <b>Order Status:</b> 🟠 <b>NEEDS ADMIN ATTENTION</b> (auto-delivery failed)`,
        `🕒 <b>Received At:</b> ${timeFormatted}`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `👇 <i>Admins: top up this RoS account manually with the credentials above, then tap</i> <b>✅ Approve</b>.`,
      ].join('\n');
      inlineKeyboard = {
        inline_keyboard: [[
          { text: '✅ Approve (Mark Completed)', callback_data: `ros_done:${order.ref}` },
          { text: '❌ Mark Failed', callback_data: `ros_cancel:${order.ref}` },
        ]],
      };
    }
  } else if (isRoblox) {
    // Roblox fulfillment — informational only, no Done/Cancel buttons.
    statusHtml = autoDelivered
      ? [
          `⚡ <b>Payment Status:</b> 🟢 <b>PAID & CONFIRMED</b>`,
          `🚀 <b>Fulfillment:</b> <b>Auto-delivered</b>`,
          `🕒 <b>Delivered At:</b> ${timeFormatted}`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          `✨ <i>Robux sent automatically to Roblox user ${account}.</i>`,
        ].join('\n')
      : [
          `⚠️ <b>Order Status:</b> 🟠 <b>NEEDS ADMIN ATTENTION</b> (auto-delivery failed)`,
          `🕒 <b>Received At:</b> ${timeFormatted}`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          `👇 <i>Admins: please send Robux to Roblox user <b>${account}</b> manually.</i>`,
        ].join('\n');
    inlineKeyboard = null;
  } else if (isMLBB && isMlbbEvent) {
    statusHtml = [
      `🌟 <b>MLBB Mode:</b> <b>SPECIAL EVENT PURCHASE (${mlbbEventLabel})</b>`,
      `⚡ <b>Payment Status:</b> 🟢 <b>PAID & CONFIRMED</b>`,
      `🚀 <b>Fulfillment:</b> <b>Instant Automated Event Delivery (Moonton API)</b>`,
      `🕒 <b>Paid At:</b> ${timeFormatted}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `✨ <i>Payment verified! Player ${account} received ${packageName} from Event ${mlbbEventLabel}.</i>`,
    ].join('\n');
  } else if (isMLBB) {
    statusHtml = [
      `💎 <b>MLBB Mode:</b> <b>REGULAR TOP-UP (Standard Diamonds)</b>`,
      `⚡ <b>Payment Status:</b> 🟢 <b>PAID & CONFIRMED</b>`,
      `🚀 <b>Fulfillment:</b> <b>Instant Automated Delivery (Moonton API)</b>`,
      `🕒 <b>Paid At:</b> ${timeFormatted}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `✨ <i>Payment verified & diamonds dispatched directly to Moonton account!</i>`,
    ].join('\n');
  } else {
    statusHtml = [
      `⚡ <b>Payment Status:</b> 🟢 <b>PAID & CONFIRMED</b>`,
      `🚀 <b>Fulfillment:</b> <b>Instant Automated Delivery (${isFF ? 'Garena' : 'Publisher'} API)</b>`,
      `🕒 <b>Paid At:</b> ${timeFormatted}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `✨ <i>Payment verified & items dispatched directly to player account!</i>`,
    ].join('\n');
  }

  // Premium formatted HTML message with rich styling
  const messageText = [
    `👑 <b>YURIGAME STORE — NEW PAYMENT & ORDER</b> 💎`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `⚡ <b>Game:</b> ${rawGameName}`,
    ...(isMLBB ? [`🏷️ <b>Category:</b> ${isMlbbEvent ? `🌟 <b>EVENT: ${mlbbEventLabel}</b>` : `💎 <b>Regular Diamonds Store</b>`}`] : []),
    `🆔 <b>Order Ref:</b> <code>${order.ref}</code>`,
    `💎 <b>Item / Package:</b> <b>${packageName}</b> (x${quantity})`,
    `💵 <b>Amount Paid:</b> <b>$${amountUsd} USD</b>`,
    `💳 <b>Payment Method:</b> ${paymentMethod}`,
    ``,
    playerCredsHtml,
    ``,
    `👥 <b>Supergroup Admins:</b> <a href="tg://user?id=${admin1}">Admin 1</a> • <a href="tg://user?id=${admin2}">Admin 2 (@kaixite)</a>`,
    statusHtml,
  ].join('\n');

  const adminMessages = [];

  // Alert to Supergroup ONLY (never send private DM notifications to admins)
  const dispatchTargets = [];
  if (groupId) {
    dispatchTargets.push({ id: groupId, type: 'Supergroup' });
  } else {
    // Fallback only if no group is configured
    for (const adminId of adminIds) {
      dispatchTargets.push({ id: adminId, type: 'Admin' });
    }
  }

  const broadcastResults = await Promise.allSettled(
    dispatchTargets.map(async (target) => {
      try {
        const res = await telegramRequest('sendMessage', {
          chat_id: target.id,
          text: messageText,
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard || undefined,
        });
        return { target, res };
      } catch (err) {
        console.warn(`[Telegram Alert] Error notifying ${target.type} ${target.id}:`, err.message);
        return null;
      }
    })
  );

  for (const item of broadcastResults) {
    if (item.status === 'fulfilled' && item.value?.res?.ok && item.value.res.result?.message_id) {
      adminMessages.push({
        chatId: item.value.target.id,
        messageId: item.value.res.result.message_id,
      });
      console.log(`[Telegram Alert] Sent order ${order.ref} (${rawGameName}) to ${item.value.target.type} ${item.value.target.id}`);
    }
  }

  if (isRoS || isRoblox) {
    // Record group messages so we can update the message card upon action
    order.adminMessages = adminMessages;
    saveRosOrder(order);
  }

  return adminMessages.length > 0;
}

// Backward-compatible alias for RoS Legacy
export async function notifyRosOrderToAdmins(order) {
  return notifyOrderToAdmins(order);
}

// 5. Update Telegram message cards on Group / Admin chats after an action is taken
async function updateAdminMessages(order, status, adminUser, clickedChatId = null, clickedMessageId = null) {
  if (!order) return;

  const isRoblox = String(order.gameId || order.game || '').toLowerCase().includes('roblox') || String(order.gameId || order.game || '').toLowerCase().includes('robux');
  const gameTitle = isRoblox ? 'Roblox' : 'Rules of Survival (RoS Legacy)';
  const itemType = isRoblox ? 'Robux Pack' : 'Diamond Pack';
  const itemCurrency = isRoblox ? 'Robux' : 'Diamonds';

  const account = order.playerDetails?.account || order.playerDetails?.userId || order.playerDetails?.username || order.verifiedPlayer || 'Unknown';
  const password = order.playerDetails?.password || '';
  const amountUsd = Number(order.totalUsd || 0).toFixed(2);
  const packageName = order.packageName || (isRoblox ? 'Robux' : 'RoS Diamonds');
  const quantity = order.quantity || 1;
  const adminName = adminUser?.first_name || 'Admin';
  const adminHandle = adminUser?.username ? `@${adminUser.username}` : `ID: ${adminUser?.id || ''}`;
  const actionTime = formatLocalTime();

  let updatedText = '';
  if (status === 'COMPLETED') {
    updatedText = [
      `👑 <b>YURIGAME STORE — ${gameTitle.toUpperCase()} ORDER COMPLETED</b> ✅`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `⚡ <b>Game:</b> ${gameTitle}`,
      `🆔 <b>Order Ref:</b> <code>${order.ref}</code>`,
      `💎 <b>${itemType}:</b> <b>${packageName}</b> (x${quantity})`,
      `💵 <b>Amount Paid:</b> $${amountUsd} USD`,
      ``,
      `👤 <b>PLAYER ACCOUNT:</b>`,
      `🎮 <b>${isRoblox ? 'Roblox Username' : 'Account (Username/Gmail)'}:</b> <code>${account}</code>`,
      ...(isRoblox ? [] : [`🔑 <b>Account Password:</b> <code>${password || 'Not provided'}</code>`]),
      ``,
      `✅ <b>Order Status:</b> 🟢 <b>COMPLETED & DELIVERED</b>`,
      `👨‍💻 <b>Handled By:</b> <b>${adminName}</b> (${adminHandle})`,
      `⏰ <b>Delivered At:</b> ${actionTime}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `✨ <i>${itemCurrency} have been credited successfully! Customer screen notified live.</i>`,
    ].join('\n');
  } else {
    updatedText = [
      `👑 <b>YURIGAME STORE — ${gameTitle.toUpperCase()} ORDER CANCELLED</b> ❌`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `⚡ <b>Game:</b> ${gameTitle}`,
      `🆔 <b>Order Ref:</b> <code>${order.ref}</code>`,
      `💎 <b>${itemType}:</b> <b>${packageName}</b>`,
      `💵 <b>Amount:</b> $${amountUsd} USD`,
      ``,
      `👤 <b>PLAYER ACCOUNT:</b>`,
      `🎮 <b>${isRoblox ? 'Roblox Username' : 'Account (Username/Gmail)'}:</b> <code>${account}</code>`,
      ...(isRoblox ? [] : [`🔑 <b>Account Password:</b> <code>${password || 'Not provided'}</code>`]),
      ``,
      `❌ <b>Order Status:</b> 🔴 <b>CANCELLED BY ADMIN</b>`,
      `👨‍💻 <b>Cancelled By:</b> <b>${adminName}</b> (${adminHandle})`,
      `⏰ <b>Cancelled At:</b> ${actionTime}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `⚠️ <i>Order has been marked cancelled.</i>`,
    ].join('\n');
  }

  // Collect target messages to edit
  const messagesToEdit = [];
  if (clickedChatId && clickedMessageId) {
    messagesToEdit.push({ chatId: clickedChatId, messageId: clickedMessageId });
  }
  if (Array.isArray(order.adminMessages)) {
    for (const msg of order.adminMessages) {
      if (!messagesToEdit.some((m) => String(m.chatId) === String(msg.chatId) && String(m.messageId) === String(msg.messageId))) {
        messagesToEdit.push(msg);
      }
    }
  }

  await Promise.allSettled(
    messagesToEdit.map(async (msg) => {
      try {
        await telegramRequest('editMessageText', {
          chat_id: msg.chatId,
          message_id: msg.messageId,
          text: updatedText,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [] }, // Remove buttons
        });
      } catch (err) {
        console.warn(`[Telegram Alert] Failed to edit message ${msg.messageId} in chat ${msg.chatId}:`, err.message);
      }
    })
  );
}

// 6. Telegram Long-Polling Engine for Admin Action Buttons
let isPollingActive = false;
let pollingOffset = 0;

export function startTelegramBotPolling() {
  if (isPollingActive) return;
  const { botToken } = getTelegramConfig();
  if (!botToken) {
    console.warn('[Telegram Bot] Bot token missing, skipping polling.');
    return;
  }

  isPollingActive = true;
  console.log('[Telegram Bot] 🚀 Starting Telegram Bot polling for Admin actions...');

  // ⚡ Ensure webhook is cleared so getUpdates reliably gets all inline button taps!
  telegramRequest('deleteWebhook', { drop_pending_updates: false }).catch(() => {});

  const poll = async () => {
    while (isPollingActive) {
      try {
        const url = `${TELEGRAM_API_BASE}/bot${botToken}/getUpdates?offset=${pollingOffset}&timeout=20`;
        const res = await fetch(url);
        const data = await res.json();

        if (data?.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            pollingOffset = update.update_id + 1;

            // Handle Incoming Messages (e.g. /admin command)
            if (update.message) {
              handleIncomingMessage(update.message).catch(() => {});
            }

            // Handle Callback Queries (when Admin taps Done or Cancel)
            if (update.callback_query) {
              handleCallbackQuery(update.callback_query).catch((err) => {
                console.error('[Telegram Bot] Error handling callback query:', err.message);
              });
            }
          }
        }
      } catch (err) {
        // Wait 2 seconds on error before retrying
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  };

  poll();
}

async function handleCallbackQuery(query) {
  const data = String(query.data || '');
  const adminUser = query.from || {};
  const queryId = query.id;
  const clickedChatId = query.message?.chat?.id;
  const clickedMessageId = query.message?.message_id;

  const isDone = data.startsWith('ros_done:') || data.startsWith('roblox_done:');
  const isCancel = data.startsWith('ros_cancel:') || data.startsWith('roblox_cancel:');

  if (!isDone && !isCancel) return;

  const orderRef = data.replace(/^ros_done:|^roblox_done:|^ros_cancel:|^roblox_cancel:/, '').trim();

  // ⚡ SUB-50ms INSTANT ACKNOWLEDGEMENT: Stop the Telegram button spinner immediately!
  telegramRequest('answerCallbackQuery', {
    callback_query_id: queryId,
    text: isDone ? `✅ SUCCESS! Order ${orderRef} completed!` : `❌ Order ${orderRef} cancelled.`,
    show_alert: isDone,
  }).catch(() => {});

  const order = await getRosOrder(orderRef);

  if (isDone) {
    if (!order) {
      console.warn(`[Telegram Alert] Order ${orderRef} not found in store.`);
      return;
    }

    if (order.status === 'COMPLETED') {
      return;
    }

    // Mark order as COMPLETED in memory immediately
    const updated = await updateRosOrderStatus(orderRef, 'COMPLETED', adminUser);

    // Update message card on Telegram group immediately
    updateAdminMessages(updated, 'COMPLETED', adminUser, clickedChatId, clickedMessageId).catch((err) =>
      console.warn('[Telegram Alert] updateAdminMessages error:', err.message)
    );
    console.log(`[Telegram Alert] ✅ Order ${orderRef} (${order.gameName || 'Manual Game'}) marked COMPLETED by ${adminUser.first_name || adminUser.id}`);
  } else if (isCancel) {
    if (!order) {
      console.warn(`[Telegram Alert] Order ${orderRef} not found in store.`);
      return;
    }

    // Mark order as CANCELLED in memory immediately
    const updated = await updateRosOrderStatus(orderRef, 'CANCELLED', adminUser);

    updateAdminMessages(updated, 'CANCELLED', adminUser, clickedChatId, clickedMessageId).catch((err) =>
      console.warn('[Telegram Alert] updateAdminMessages error:', err.message)
    );
    console.log(`[Telegram Alert] ❌ Order ${orderRef} marked CANCELLED by ${adminUser.first_name || adminUser.id}`);
  }
}

// 7. Export Webhook Update Handler for production /api/telegram/webhook route
export async function handleTelegramWebhookUpdate(update) {
  if (!update) return;
  if (update.message) {
    await handleIncomingMessage(update.message).catch(() => {});
  }
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query).catch(() => {});
  }
}

// 7. Handle Incoming Text Messages (e.g. /admin command from Admins)
async function handleIncomingMessage(msg) {
  if (!msg || !msg.text) return;
  const rawText = String(msg.text || '').trim();
  const text = rawText.toLowerCase();
  const chatId = msg.chat?.id;
  const senderId = String(msg.from?.id || '');
  const senderName = msg.from?.first_name || msg.from?.username || 'Admin';
  const { admin1, admin2, groupId, adminIds } = getTelegramConfig();

  // Strict Authorization: Sender must be a registered admin ID
  const isAuthorized = adminIds.includes(senderId);

  if (text === '/admin' || text === '/dashboard' || text.startsWith('/admin ') || text === '/start admin') {
    if (!isAuthorized) {
      await telegramRequest('sendMessage', {
        chat_id: chatId,
        text: `⛔ <b>Access Denied</b>\n\nOnly registered YuriGame Administrators are authorized to access the Admin Control Panel.\nYour Telegram ID: <code>${senderId}</code>`,
        parse_mode: 'HTML',
      });
      return;
    }

    // The admin link may be generated in a private DM with the bot OR inside the
    // official admin supergroup (set via TELEGRAM_GROUP_ID). Never in any other group.
    const isPrivateChat = msg.chat?.type === 'private';
    const isTrustedGroup = groupId && String(chatId) === String(groupId);
    if (!isPrivateChat && !isTrustedGroup) {
      await telegramRequest('sendMessage', {
        chat_id: chatId,
        text: `⚠️ <b>Security Notice</b>\n\nAdmin links can only be generated in a private direct message with this bot, or inside the official YuriGame admin group.`,
        parse_mode: 'HTML',
      });
      return;
    }

    // Generate a secure single-use 10-minute admin token
    const token = generateAdminToken(senderId);
    const host = (process.env.PUBLIC_URL || process.env.APP_URL || 'https://yurigamest4res.com').replace(/\/$/, '');
    const adminUrl = `${host}/admin?token=${token}`;

    const replyHtml = [
      `👑 <b>YURIGAME STORE — ADMIN CONTROL PANEL</b> 🛡️`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `👋 <i>Hello, <b>${senderName}</b>!</i>`,
      ``,
      `Your secure one-click link to access the <b>YuriGame Admin Dashboard</b> is ready:`,
      ``,
      `👉 <b>Direct Access URL:</b>`,
      `<code>${adminUrl}</code>`,
      ``,
      `🔐 <i>This link expires after 30 minutes. After opening it you must enter the admin password, then a 6-digit OTP sent to this group.</i>`,
      ``,
      `🛠️ <b>Dashboard Control Features:</b>`,
      `1️⃣ <b>Products & Prices:</b> Add, Edit, Delete, Stock, Promos & custom diamond/robux icons`,
      `2️⃣ <b>MLBB Event Categories:</b> Create Events, Open/Close user visibility, custom event diamond packs`,
      `3️⃣ <b>Live Order Approvals:</b> 1-Click Confirm & Mark Done for Roblox Robux & RoS Diamonds`,
      `4️⃣ <b>Support & Contacts:</b> Update Telegram & Facebook links live on website`,
      `5️⃣ <b>Slide Banners:</b> Add, change, and toggle promo hero banners`,
      `6️⃣ <b>Stock Control:</b> 1-click toggle Stock Open / Closed for each game`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `⚡ <i>Link active for 30 minutes. Tap below, then enter the admin password + OTP:</i>`,
    ].join('\n');

    await telegramRequest('sendMessage', {
      chat_id: chatId,
      text: replyHtml,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🚀 Open Admin Dashboard', url: adminUrl }
          ]
        ]
      }
    });

    console.log(`[Telegram Bot] 🔐 Generated /admin dashboard URL for Admin ${senderName} (${senderId})`);
  } else if (text === '/help' || text === '/start') {
    if (isAuthorized) {
      await telegramRequest('sendMessage', {
        chat_id: chatId,
        text: `👑 <b>YuriGame Admin System</b>\n\nSend <code>/admin</code> anytime to get your secure one-click link to the <b>Admin Control Panel</b>!`,
        parse_mode: 'HTML',
      });
    }
  }
}

// 8. Web Admin 1-Click Approval / Cancellation (Option 2)
export async function approveOrderFromWeb(ref, adminInfo = {}) {
  const order = await getRosOrder(ref);
  if (!order) return null;

  const adminUser = {
    first_name: adminInfo.name || 'Web Admin',
    username: adminInfo.username || 'admin_web',
    id: adminInfo.id || 'web'
  };

  const updated = await updateRosOrderStatus(ref, 'COMPLETED', adminUser);
  updateAdminMessages(updated, 'COMPLETED', adminUser).catch((err) => {
    console.warn('[Telegram Alert] updateAdminMessages error:', err.message);
  });
  return updated;
}

export async function cancelOrderFromWeb(ref, adminInfo = {}) {
  const order = await getRosOrder(ref);
  if (!order) return null;

  const adminUser = {
    first_name: adminInfo.name || 'Web Admin',
    username: adminInfo.username || 'admin_web',
    id: adminInfo.id || 'web'
  };

  const updated = await updateRosOrderStatus(ref, 'CANCELLED', adminUser);
  updateAdminMessages(updated, 'CANCELLED', adminUser).catch((err) => {
    console.warn('[Telegram Alert] updateAdminMessages error:', err.message);
  });
  return updated;
}

// 9. Admin 2FA Security Alerts
export async function sendAdminLoginOtp(otpCode, ip = 'Unknown', userAgent = '') {
  const { adminIds, groupId } = getTelegramConfig();
  const timeStr = formatLocalTime(new Date());
  const cleanAgent = String(userAgent || 'Web Browser').slice(0, 100);

  const text = [
    `🛡️ <b>YURIGAME STORE — ADMIN 2FA VERIFICATION</b>`,
    ``,
    `An admin login attempt was initiated for the <b>Admin Control Panel</b>.`,
    ``,
    `🔑 <b>Your 6-Digit OTP Code:</b>`,
    `👉 <code><b>${otpCode}</b></code>`,
    ``,
    `⏱ <b>Expires in:</b> 5 minutes`,
    `📍 <b>IP Address:</b> <code>${ip}</code>`,
    `🖥 <b>Device:</b> <code>${cleanAgent}</code>`,
    `🕒 <b>Time:</b> <code>${timeStr}</code>`,
    ``,
    `⚠️ <i>Do NOT share this code with anyone. If you did not initiate this login, ignore it and review your admin security settings.</i>`
  ].join('\n');

  // The 2FA OTP is delivered to the admin Telegram GROUP first, so any on-duty admin
  // can read the code the moment the password step is passed.
  let sentCount = 0;
  if (groupId) {
    try {
      const groupRes = await telegramRequest('sendMessage', {
        chat_id: groupId,
        text,
        parse_mode: 'HTML',
      });
      if (groupRes?.ok) sentCount++;
    } catch (groupErr) {
      console.warn('[Admin 2FA] Group OTP delivery failed:', groupErr?.message || groupErr);
    }
  }

  // Fallback to private registered admin DMs only if the group delivery failed.
  const targets = [...new Set(adminIds.filter(Boolean))];
  if (sentCount === 0) {
    const results = await Promise.allSettled(
      targets.map((chatId) =>
        telegramRequest('sendMessage', {
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        })
      )
    );
    sentCount = results.filter((result) => result.status === 'fulfilled' && result.value?.ok === true).length;
  }

  if (sentCount === 0) {
    throw new Error('Telegram rejected all configured OTP destinations. Please ensure the bot is in your Telegram admin group, or started in private chat (/start).');
  }
  return { sentCount, totalTargets: targets.length };
}

export async function sendAdminLoginSuccessAlert(ip = 'Unknown', userAgent = '') {
  const { adminIds, groupId } = getTelegramConfig();
  const timeStr = formatLocalTime(new Date());
  const cleanAgent = String(userAgent || 'Web Browser').slice(0, 100);

  const text = [
    `✅ <b>YURIGAME STORE — ADMIN LOGIN CONFIRMED</b>`,
    ``,
    `An administrator has successfully verified 2FA Telegram OTP and entered the <b>Admin Control Panel</b>.`,
    ``,
    `📍 <b>IP Address:</b> <code>${ip}</code>`,
    `🖥 <b>Device:</b> <code>${cleanAgent}</code>`,
    `🕒 <b>Time:</b> <code>${timeStr}</code>`,
  ].join('\n');

  const targets = [...new Set([...adminIds, groupId].filter(Boolean))];
  await Promise.allSettled(
    targets.map((chatId) =>
      telegramRequest('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      })
    )
  );
}



// 10. Send Test Telegram Ping (for Admin settings verification)
export async function sendTestTelegramPing() {
  const config = getTelegramConfig();
  const timeStr = formatLocalTime(new Date());

  const text = [
    `🔔 <b>YURIGAME STORE — TELEGRAM INTEGRATION TEST</b> 🛡️`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `✅ <b>Connection Status:</b> Telegram Bot linked successfully!`,
    `👑 <b>Admin 1 (Master):</b> <code>${config.admin1}</code> (${config.admin1Name})`,
    `👨‍💻 <b>Admin 2:</b> <code>${config.admin2}</code> (${config.admin2Name})`,
    `👥 <b>Notification Supergroup:</b> <code>${config.groupId}</code>`,
    `⏰ <b>Timestamp:</b> <code>${timeStr}</code>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `✨ <i>All order notifications, 2FA OTP codes, and /admin commands are fully connected live.</i>`
  ].join('\n');

  const targets = [...new Set([...config.adminIds, config.groupId].filter(Boolean))];
  const results = await Promise.allSettled(
    targets.map((chatId) =>
      telegramRequest('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      })
    )
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value?.ok).length;
  return {
    success: succeeded > 0,
    sentCount: succeeded,
    totalTargets: targets.length,
    admin1: `${config.admin1} (${config.admin1Name})`,
    admin2: `${config.admin2} (${config.admin2Name})`,
    groupId: config.groupId,
  };
}
