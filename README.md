# YuriGame Store

A React/Vite game top-up storefront with an Express backend, MySQL order storage, Bakong/ABA payment support, and a live SoraTopup catalogue.

## Development

```powershell
npm install
npm run server
npm run dev
```

The Vite app runs on `http://localhost:5173` and proxies `/api` requests to the Express server on `http://localhost:5001`.

## Environment

Copy `.env.example` to `.env` and configure the required services. Keep `.env` private; it is excluded by `.gitignore`.

```env
SORATOPUP_BASE_URL=https://app.soratopup.com/api/v1
SORATOPUP_API_KEY=your-soratopup-api-key
```

`SORATOPUP_API_KEY` is server-only. Never expose it through a `VITE_` variable or client-side code.

## SoraTopup integration

The Express server authenticates to SoraTopup with a Bearer token, normalizes provider responses, validates game codes, applies request timeouts, and caches read-only data.

Local endpoints:

- `GET /api/soratopup/status` — connection status and current game count; provider balance is not exposed.
- `GET /api/soratopup/catalogue` — normalized live game catalogue, cached for five minutes.
- `GET /api/soratopup/packages?game=<code>` — current packages and prices, cached for two minutes.
- `GET /api/soratopup/image/:gameCode` — allowlisted same-origin image proxy for provider artwork.

The storefront loads 24 games initially and adds 24 per request to avoid rendering hundreds of images at once. Clicking a live game loads its current packages and required account fields.

Provider order submission is intentionally locked. Enabling paid fulfillment requires a server-side binding between a confirmed payment, the selected package, the player fields, and one stable SoraTopup idempotency key. A public pass-through order endpoint would allow unauthorized spending and must not be added.

## Validation

```powershell
npm run lint
npm run build
```
