# Production security and DDoS deployment

Browser DevTools cannot be disabled by website code. Security must assume every public request and frontend asset can be inspected or modified by the visitor.

## Application protections enabled

- Server-authoritative prices and package mappings
- Telegram-only admin possession challenge; no reusable browser PIN
- Single-use 10-minute Telegram access links
- IP/browser-bound HttpOnly admin sessions with `SameSite=Strict`
- One-time challenge and link replay protection
- OTP delivery only to private registered admin chats, never groups
- Bounded per-IP API rate limits
- Stricter authentication, payment, player-check, and order-lookup limits
- Per-IP and global concurrent request limits
- Two-megabyte JSON body limit
- Slow-request and excessive-header limits
- Sanitized public and admin configuration responses
- No production source maps
- No browser-delivered bot token, master PIN, or provider cost
- Persistent order history and idempotent provider fulfillment

All limits can be tuned with the variables documented in `.env.example`.

## Required edge protection

Application rate limiting cannot absorb a large distributed or volumetric DDoS attack. Put the production domain behind a CDN/WAF such as Cloudflare and complete these steps:

1. Proxy every public DNS record through the CDN.
2. Keep the origin IP private. Configure the host firewall to accept HTTP/HTTPS only from the CDN proxy ranges.
3. Enable managed WAF rules, bot protection, and automatic DDoS protection.
4. Challenge suspicious traffic before it reaches the origin.
5. Apply edge rate rules matching the application defaults:
   - `/api/admin/auth/*`: 10 requests per 15 minutes per IP
   - `/api/auth/*`: 20 requests per 15 minutes per IP
   - `/api/paylink/generate-qr`: 15 requests per minute per IP
   - `/api/paylink/check-payment`: 180 requests per minute per IP
   - `/api/soratopup/verify-player`: 15 requests per minute per IP
   - `/api/soratopup/orders/lookup`: 30 requests per minute per IP
   - `/api/*`: 300 requests per minute per IP
6. Cache only static hashed assets. Never cache `/api/admin/*`, `/api/auth/*`, or `/api/paylink/*`.
7. Set `TRUST_PROXY_HOPS` to the actual number of trusted proxy hops between the CDN and Node server.
8. For multiple Node instances, replace the in-memory limiter store with a shared Redis-backed limiter.

## Credential action required

The previous Telegram token existed in browser-delivered source. Revoke that token with BotFather, issue a new token, and put only the replacement in the server-side `TELEGRAM_BOT_TOKEN` environment variable.

No system can guarantee complete protection against every DDoS attack. The CDN/WAF and origin firewall handle volumetric traffic; the application controls abusive requests that reach Node.js.
