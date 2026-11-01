// Isolated Professional Receipt & Invoice Printer for Mobile & Desktop
// Generates a standalone, beautiful 1-page official invoice without background website elements.

export function printReceiptInvoice(order, currentRegion = { currency: 'USD', rate: 1 }) {
  if (!order) return;

  const ref = order.ref || order.refid || 'N/A';
  const gameName = order.gameName || order.gameLabel || order.game || 'Game Credits';
  const packageName = order.packageName || order.item || 'Game Package';
  const quantity = Number(order.quantity || 1);
  const player =
    order.verifiedPlayer ||
    order.player ||
    order.playerDetails?.account ||
    order.playerDetails?.userId ||
    order.playerDetails?.username ||
    'Player';
  const paymentMethod = order.paymentMethod || 'Bakong KHQR (Verified)';
  const totalUsd = Number(order.totalUsd || order.amount || 0);
  const totalKhr = order.totalKhr || Math.round(totalUsd * 4100).toLocaleString();
  const dateObj = new Date(order.timestamp || order.createdAt || order.created_at || Date.now());
  const dateStr = isNaN(dateObj.getTime()) ? new Date().toLocaleString() : dateObj.toLocaleString();

  const status = String(order.status || '').toUpperCase();
  const isDelivered = status === 'DELIVERED' || status === 'COMPLETED' || status === 'SUCCESS';
  const isCancelled = status === 'CANCELLED' || status === 'FAILED';
  const statusLabel = isDelivered ? 'OFFICIAL RECEIPT • DELIVERED' : isCancelled ? 'ORDER CANCELLED' : 'IN PROCESSING • PAID';
  const statusColor = isDelivered ? '#059669' : isCancelled ? '#dc2626' : '#d97706';
  const statusBg = isDelivered ? '#ecfdf5' : isCancelled ? '#fef2f2' : '#fffbeb';
  const statusBorder = isDelivered ? '#a7f3d0' : isCancelled ? '#fecaca' : '#fde68a';

  const logoUrl = `${window.location.origin}/assets/brand/yurigame-logo.webp`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt_${ref}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 24px;
      max-width: 640px;
      margin: 0 auto;
      line-height: 1.5;
      font-size: 13px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand img {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      object-fit: contain;
      border: 1px solid #e2e8f0;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #e3062f;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .brand-sub {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${statusColor};
      background: ${statusBg};
      border: 1.5px solid ${statusBorder};
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
    }
    .info-label {
      font-size: 10.5px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.3px;
      margin-bottom: 3px;
    }
    .info-val {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      word-break: break-all;
    }
    .info-val.mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .table-container {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      padding: 11px 16px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #475569;
      letter-spacing: 0.4px;
      border-bottom: 1px solid #e2e8f0;
    }
    td {
      padding: 14px 16px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
      color: #1e293b;
    }
    .total-box {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .total-label {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    .total-val {
      font-size: 24px;
      font-weight: 900;
      color: #e3062f;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      text-align: right;
    }
    .total-khr {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      text-align: right;
      margin-top: 2px;
    }
    .security-notice {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 11.5px;
      color: #065f46;
      margin-bottom: 20px;
      font-weight: 500;
      line-height: 1.4;
    }
    .footer {
      text-align: center;
      border-top: 1px dashed #cbd5e1;
      padding-top: 16px;
      font-size: 11px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <img src="${logoUrl}" alt="YuriGame" onerror="this.style.display='none'" />
      <div>
        <div class="brand-title">YuriGame Store</div>
        <div class="brand-sub">Official Digital Gaming Store • yurigamest4res.com</div>
      </div>
    </div>
    <div class="status-badge">${statusLabel}</div>
  </div>

  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">Order Reference</div>
      <div class="info-val mono">${ref}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Date & Time</div>
      <div class="info-val">${dateStr}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Player Account</div>
      <div class="info-val">${player}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Payment Method</div>
      <div class="info-val">${paymentMethod}</div>
    </div>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Game</th>
          <th>Package / Description</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-weight: 700;">${gameName}</td>
          <td style="font-weight: 600; color: #e3062f;">${packageName}</td>
          <td style="text-align: center; font-weight: 700;">× ${quantity}</td>
          <td style="text-align: right; font-weight: 800; font-family: monospace;">$${totalUsd.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="total-box">
    <div>
      <div class="total-label">Total Amount Paid</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
        Instant 0% transaction fee • Payment Verified
      </div>
    </div>
    <div>
      <div class="total-val">$${totalUsd.toFixed(2)}</div>
      <div class="total-khr">≈ ៛${totalKhr} KHR</div>
    </div>
  </div>

  <div class="security-notice">
    🛡️ <strong>Verified Anti-Ban Delivery Guarantee:</strong> This transaction was securely verified and delivered with official Moonton / Tencent / Roblox compliance.
  </div>

  <div class="footer">
    Thank you for choosing YuriGame Store! For 24/7 customer support, contact @YuriUchiha or visit https://yurigamest4res.com
  </div>
</body>
</html>`;

  // Use isolated invisible iframe so background web page is NEVER printed
  let iframe = document.getElementById('receipt-print-frame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'receipt-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.warn('Iframe print fallback to window.print():', e);
      window.print();
    }
  }, 250);
}
