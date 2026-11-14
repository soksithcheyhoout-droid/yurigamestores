// Runtime-editable provider credentials (API keys / proxy) for the admin "API & Providers" panel.
//
// These OVERRIDE the matching environment variables so an admin can rotate a key from the
// dashboard and have it take effect immediately — no Railway redeploy. Stored in the existing
// `app_config` MySQL table (durable across redeploys) under the `provider_credentials` row.
//
// SECURITY: these are server-side secrets. They are never placed in adminConfig and never sent
// to the browser. The admin panel only ever receives masked values from a dedicated endpoint.
import { pool } from '../config/db.js';

const CONFIG_KEY = 'provider_credentials';

// Shape of the overrides. Empty string = "no override, fall back to the env var".
const creds = {
  bay2game: { apiKey: '' },
  rosangkor: { apiKey: '', proxyUrl: '', baseUrl: '' },
  soratopup: { apiKey: '' },
};

async function ensureTable() {
  if (!pool) return false;
  await pool.query(
    'CREATE TABLE IF NOT EXISTS `app_config` (`config_key` VARCHAR(64) PRIMARY KEY, `config_json` LONGTEXT, `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
  );
  return true;
}

// Load saved overrides from the DB at startup (called after the schema is ready).
export async function loadProviderCredentials() {
  try {
    if (!pool) return;
    await ensureTable();
    const [rows] = await pool.query('SELECT config_json FROM `app_config` WHERE config_key = ?', [CONFIG_KEY]);
    if (rows.length) {
      let loaded = {};
      try { loaded = JSON.parse(rows[0].config_json || '{}'); } catch { loaded = {}; }
      for (const provider of Object.keys(creds)) {
        if (loaded[provider] && typeof loaded[provider] === 'object') {
          for (const field of Object.keys(creds[provider])) {
            if (typeof loaded[provider][field] === 'string') {
              creds[provider][field] = loaded[provider][field];
            }
          }
        }
      }
      console.log('[Provider Credentials] Overrides loaded from database.');
    }
  } catch (err) {
    console.warn('[Provider Credentials] Load notice:', err.message);
  }
}

async function persist() {
  try {
    if (!pool) return;
    await ensureTable();
    await pool.query(
      'INSERT INTO `app_config` (config_key, config_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_json = VALUES(config_json)',
      [CONFIG_KEY, JSON.stringify(creds)]
    );
  } catch (err) {
    console.warn('[Provider Credentials] Save notice:', err.message);
  }
}

// Return the admin override for a provider field, or '' when not set (caller then uses the env var).
export function getProviderCredential(provider, field = 'apiKey') {
  const p = creds[String(provider || '').toLowerCase()];
  if (!p) return '';
  return String(p[field] || '').trim();
}

// Update one or more fields for a provider and persist durably. Returns false for unknown providers.
export function setProviderCredentials(provider, fields = {}) {
  const key = String(provider || '').toLowerCase();
  if (!creds[key]) return false;
  let changed = false;
  for (const [field, value] of Object.entries(fields)) {
    if (field in creds[key] && value !== undefined && value !== null) {
      creds[key][field] = String(value).trim();
      changed = true;
    }
  }
  if (changed) persist().catch(() => {});
  return changed;
}
