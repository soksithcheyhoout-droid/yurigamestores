import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronLeft, ExternalLink, Smartphone, RefreshCw, Download } from 'lucide-react';
import QRCode from 'qrcode';
import { getOrCreateDeviceId } from '../data/orderStore';

// Exact Authentic ABA PayWay Loading Spinner from link.payway.com.kh/images/loading.svg
export function AbaLoadingSpinner({ size = 20, className = "" }) {
  const height = Math.round((size * 24) / 22);
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 22 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`animate-spin ${className}`}
      style={{ animationDuration: '1s', display: 'inline-block', verticalAlign: 'middle' }}
    >
      <circle cx="11" cy="12" r="9" stroke="#334155" strokeWidth="4" />
      <circle cx="11" cy="12" r="9" stroke="url(#aba_paint0_linear)" strokeWidth="4" />
      <path
        d="M11.2001 2.70005C16.4801 2.70005 20.0001 6.63995 20.0001 11.5001C20.0001 16.3602 16.4801 21.1801 11.2001 21.1801"
        stroke="url(#aba_paint1_linear)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="aba_paint0_linear" x1="25.08" y1="14.2" x2="11" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#28B4C3" />
          <stop offset="1" stopColor="#E8EEF1" />
        </linearGradient>
        <linearGradient id="aba_paint1_linear" x1="15.8401" y1="20.3601" x2="12.8663" y2="4.9307" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0BBCD4" />
          <stop offset="1" stopColor="#0BBCD4" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function BakongKhqrCard({
  amountUsd,
  totalPrice,
  amountKhr,
  orderRef,
  paymentMethod = 'khqr',
  orderDetails,
  onPaymentConfirmed,
  onBack,
}) {
  const isAba = String(paymentMethod).toLowerCase().includes('aba');
  const currency = 'USD'; // Strictly USD only
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [txData, setTxData] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isManualChecking, setIsManualChecking] = useState(false);
  const pollTimerRef = useRef(null);
  const inFlightPromiseRef = useRef(null);
  const isMountedRef = useRef(true);
  const qrCacheRef = useRef({});

  // Conversion calculations
  const parsedUsd = parseFloat(amountUsd || totalPrice || 0);

  // 1. Fetch Live QR Code from PayLink Gateway (Strictly USD) with 0ms Memory Caching
  const fetchLiveQr = async () => {
    if (qrCacheRef.current['USD']) {
      const cached = qrCacheRef.current['USD'];
      setTxData(cached.txData);
      setQrDataUrl(cached.qrDataUrl);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const chargeAmount = parsedUsd;
      const tranId = orderRef || `YGS_${Date.now()}`;

      const deviceId = getOrCreateDeviceId();
      const res = await fetch('/api/paylink/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        body: JSON.stringify({
          method: isAba ? 'aba' : 'bakong',
          amount: chargeAmount,
          currency: 'USD',
          orderRef: tranId,
          description: `YuriGame TopUp ${isAba ? 'ABA' : 'Bakong'} Payment`,
          deviceId,
          orderDetails: {
            ...(orderDetails || {}),
            deviceId,
          }
        })
      });

      const data = await res.json();
      if (!data.success || !data.qrString) {
        throw new Error(data.error || 'Failed to initialize live KHQR.');
      }

      // Generate local ultra-crisp base64 DataURL in <25ms
      let localUrl = data.qrDataUrl;
      if (!localUrl && data.qrString) {
        try {
          localUrl = await QRCode.toDataURL(data.qrString, {
            width: 450,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: {
              dark: '#081B37',
              light: '#FFFFFF'
            }
          });
        } catch {
          localUrl = `https://api.qrserver.com/v1/create-qr-code/?size=450x450&data=${encodeURIComponent(data.qrString)}`;
        }
      }

      qrCacheRef.current['USD'] = { txData: data, qrDataUrl: localUrl };
      setTxData(data);
      setQrDataUrl(localUrl);
      setTimeLeft(180);
    } catch (err) {
      console.warn('PayLink QR fetch warning:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when amount, payment method, or orderRef changes
  useEffect(() => {
    fetchLiveQr();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [orderRef, paymentMethod, amountUsd, totalPrice]);

  // 2. Real-time Status Polling (Adaptive rapid-polling with in-flight deduplication)
  const pollPaymentCheck = async (isManual = false) => {
    if (!txData || isPaid) return null;
    if (inFlightPromiseRef.current) return inFlightPromiseRef.current;

    const promise = (async () => {
      try {
        const res = await fetch('/api/paylink/check-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tranId: txData.tranId,
            md5: txData.md5,
            force: isManual
          })
        });
        const status = await res.json();

        if (status.paid || status.status === 'PAID' || status.status === 'SUCCESS') {
          setIsPaid(true);
          if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
          if (onPaymentConfirmed) {
            onPaymentConfirmed(status.fulfillment || status.order);
          }
        }
        return status;
      } catch (err) {
        return null;
      } finally {
        inFlightPromiseRef.current = null;
      }
    })();

    inFlightPromiseRef.current = promise;
    return promise;
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (!txData || isPaid) return;

    let cancelled = false;

    const schedulePoll = async () => {
      if (cancelled || isPaid || !isMountedRef.current) return;
      await pollPaymentCheck(false);
      if (!cancelled && !isPaid && isMountedRef.current) {
        pollTimerRef.current = setTimeout(schedulePoll, 900);
      }
    };

    // Immediate first probe on render, then repeat after each response + 900ms gap
    schedulePoll();

    return () => {
      cancelled = true;
      isMountedRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [txData, isPaid, onPaymentConfirmed]);

  // 3. Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const minutesStr = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secondsStr = String(timeLeft % 60).padStart(2, '0');

  const handleManualCheck = async () => {
    if (isPaid || isManualChecking) return;
    setIsManualChecking(true);
    await pollPaymentCheck(true);
    setIsManualChecking(false);
  };

  // QR Code Image source (Prefers instant local DataURL over external network URL)
  const qrCodeUrl = qrDataUrl || txData?.qrDataUrl || (txData?.qrString
    ? `https://api.qrserver.com/v1/create-qr-code/?size=450x450&data=${encodeURIComponent(txData.qrString)}`
    : null);

  const handleDownloadQr = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `KHQR_${orderRef || 'payment'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const headerColor = isAba ? '#003B70' : '#E11D48';
  const merchantDisplayName = txData?.merchantName || 'YuriGameSt4re';

  return (
    <div className="w-full flex flex-col items-center justify-center font-['SF_Pro_Display',Battambang,Arial,sans-serif] select-none py-2">
      
      {/* 1. Header Bar with Bright High-Contrast Colors */}
      <div className="w-full max-w-[290px] flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Back"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <span className="text-[17px] font-black tracking-tight text-white" style={{ color: '#ffffff' }}>
            BAKONG KHQR
          </span>
        </div>

        {/* Digital Time & Loading Spinner in Bright Cyan */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 shadow-xs" title="Payment session active">
          <AbaLoadingSpinner size={16} />
          <span className="text-[13px] font-black text-cyan-400 font-mono tracking-tight" style={{ color: '#22d3ee' }}>
            {minutesStr}:{secondsStr}
          </span>
        </div>
      </div>

      {/* 2. Authentic NBC KHQR Card (Enforced 100% Crisp White Background & Dark Ink Text) */}
      <div
        className="khqr-card-white rounded-[22px] min-h-[396px] w-[285px] flex flex-col overflow-hidden relative shadow-[0_20px_45px_rgba(0,0,0,0.6)]"
        style={{
          backgroundColor: '#ffffff',
          color: '#081B37',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Card Header Strip */}
        <div>
          {/* Top colored strip with authentic NBC KHQR SVG */}
          <div
            className="flex items-center justify-center rounded-t-[21px] h-[44px] transition-colors"
            style={{ backgroundColor: headerColor }}
          >
            <svg width="64" height="15" viewBox="0 0 60 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M39.006 5.19439V9.59764H34.5318C34.0729 9.59764 33.7288 9.2307 33.7288 8.80731V5.22264C33.7288 4.77103 34.1016 4.43231 34.5318 4.43231H38.1743C38.6619 4.40408 39.006 4.74278 39.006 5.19439Z" fill="white"/>
              <path d="M59.9717 6.97176H57.7345C57.7345 4.34676 55.5548 2.20159 52.8875 2.20159C50.7651 2.20159 48.9008 3.55645 48.2699 5.53225C48.1265 6.01209 48.0404 6.49192 48.0404 6.97176V13.9718H47.9831C46.7785 13.9718 45.8033 13.0121 45.8033 11.8266V6.97176H45.832C45.832 5.05241 46.6351 3.21773 48.0691 1.89112C49.3884 0.677406 51.1093 0 52.9162 0C56.8168 0 59.9717 3.13305 59.9717 6.97176Z" fill="white"/>
              <path d="M59.9999 13.9718L56.845 14L56.0706 13.2379L54.3497 11.5444L51.9692 9.20166H55.1241L59.9999 13.9718Z" fill="white"/>
              <path d="M39.7517 11.7702H33.0117C32.1799 11.7702 31.5203 11.121 31.5203 10.3024V3.66936C31.5203 2.85081 32.1799 2.20159 33.0117 2.20159H39.7517C40.5834 2.20159 41.2431 2.85081 41.2431 3.66936V10.3024L43.4802 12.504V2.14515C43.4802 0.959671 42.505 0 41.3005 0H31.4629C30.2583 0 29.2832 0.959671 29.2832 2.14515V11.8266C29.2832 13.0121 30.2583 13.9718 31.4629 13.9718H41.9888L39.7517 11.7702Z" fill="white"/>
              <path d="M12.3614 14H9.20656L2.60996 7.47984V14H0V0H2.60996V6.2379L8.94843 0H12.046L5.16255 6.71772L12.3614 14Z" fill="white"/>
              <path d="M24.1492 0H26.7018V14H24.1492V7.93145H16.8643V14H14.3117V0H16.8643V5.84273H24.1492V0Z" fill="white"/>
            </svg>
          </div>

          {/* Authentic Corner Triangle */}
          <div className="flex justify-end">
            <div
              style={{
                borderLeft: '20px solid transparent',
                borderTop: `20px solid ${headerColor}`,
                height: 0,
                width: 0
              }}
            />
          </div>

          {/* Merchant Name & Amount Row with Crisp High-Contrast Text */}
          <div className="py-2.5 px-4 pl-8 relative -mt-3.5 border-b-2 border-dashed border-slate-300">
            <div>
              <span className="khqr-merchant-name text-[11px] font-black uppercase tracking-wider block text-slate-800" style={{ color: '#1e293b' }}>
                {merchantDisplayName}
              </span>
            </div>

            <div className="mt-1 font-['Nunito_Sans']">
              <div className="flex items-baseline text-sm font-bold w-full">
                <span className="khqr-price-text text-xl font-black text-slate-950" style={{ color: '#081b37' }}>
                  ${parsedUsd.toFixed(2)}
                </span>
                <span className="text-[10px] font-black ml-1.5 text-slate-700">USD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Body: High-Resolution Crisp QR Code with Watermark */}
        <div className="flex justify-center items-center relative flex-1 py-4 px-2 bg-white" style={{ backgroundColor: '#ffffff' }}>
          {/* Subtle NBC Currency Watermark */}
          <img
            src="/assets/payments/usd_badge.png"
            alt="Currency Watermark"
            className="absolute w-[160px] h-[160px] object-contain opacity-10 pointer-events-none"
          />

          <div className="relative flex items-center justify-center">
            {loading ? (
              <div className="w-[195px] h-[195px] flex flex-col items-center justify-center gap-3 bg-slate-50 rounded-xl border border-slate-200">
                <AbaLoadingSpinner size={32} />
                <span className="text-xs font-bold text-slate-600">
                  Generating Live KHQR...
                </span>
              </div>
            ) : qrCodeUrl ? (
              <div className="relative p-1 bg-white rounded-xl shadow-sm">
                <img
                  src={qrCodeUrl}
                  alt="KHQR Code"
                  className="m-auto relative h-auto max-w-[195px] w-[195px] block align-middle rounded-lg"
                />

                {/* Center NBC Official Currency Badge */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-[2px] rounded-full shadow-md flex items-center justify-center pointer-events-none">
                  <img
                    src="/assets/payments/usd_badge.png"
                    alt="USD Dollar"
                    className="w-[26px] h-[26px] rounded-full object-contain"
                  />
                </div>

                {/* Instant Clearing Confirmed Overlay */}
                {isPaid && (
                  <div className="absolute inset-0 bg-emerald-600/95 rounded-lg flex flex-col items-center justify-center text-white p-3 animate-in fade-in zoom-in duration-300">
                    <div className="w-12 h-12 rounded-full bg-white text-emerald-600 flex items-center justify-center mb-1.5 shadow-md">
                      <Check size={28} strokeWidth={3} />
                    </div>
                    <div className="font-black text-sm tracking-wider">PAID & VERIFIED</div>
                    <div className="text-[10px] text-emerald-100 font-mono mt-0.5">Instant Clearing Complete</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-[195px] h-[195px] flex flex-col items-center justify-center gap-2 bg-rose-50 text-rose-700 p-3 text-center rounded-xl border border-rose-200">
                <div className="text-xs font-bold">Failed to load QR</div>
                <button
                  type="button"
                  onClick={() => fetchLiveQr(currency)}
                  className="mt-1 px-3 py-1 bg-rose-600 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-xs hover:bg-rose-700 cursor-pointer"
                >
                  <RefreshCw size={11} />
                  <span>Retry</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Pulse Indicator inside card */}
        <div className="pb-3 text-center bg-white" style={{ backgroundColor: '#ffffff' }}>
          <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 font-extrabold px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{isPaid ? 'Payment Confirmed' : 'Listening for Bakong scan...'}</span>
          </div>
        </div>
      </div>

      {/* 3. Controls & Actions under the Card (Optimized for Dark Checkout Modal) */}
      <div className="text-center p-3 flex flex-col justify-center items-center w-[285px] mt-2 mx-auto">
        {/* Direct Deep Link button (ABA or Bakong) */}
        {txData?.deepLink && (
          <a
            href={txData.deepLink}
            className="w-full mb-2.5 py-2.5 px-3 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 shadow-md transition-transform active:scale-[0.98] bg-[#E3062F] hover:bg-[#ff234c]"
          >
            <Smartphone size={14} />
            <span>Open in Bakong / Mobile Bank</span>
            <ExternalLink size={12} className="opacity-90" />
          </a>
        )}

        {/* Download QR Code Button */}
        <button
          type="button"
          onClick={handleDownloadQr}
          className="bg-transparent border-0 p-0 mb-2 flex items-center justify-center gap-1.5 cursor-pointer text-cyan-400 hover:text-cyan-300 text-xs font-bold"
        >
          <Download size={14} />
          <span>Download KHQR Image</span>
        </button>

        <p className="text-[11px] text-slate-400 leading-snug m-0 mb-2 text-center">
          Scan with Bakong, ABA, ACLEDA, or any KHQR mobile banking app.
        </p>

        {/* Manual Refresh Status */}
        <div className="flex items-center justify-center w-full text-[11px] text-slate-400 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={isManualChecking || isPaid}
            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1.5 bg-transparent border-0 cursor-pointer p-0 font-medium"
            title="Refresh payment status"
          >
            <RefreshCw size={11} className={isManualChecking ? 'animate-spin text-cyan-400' : ''} />
            <span>{isManualChecking ? 'Checking Bakong...' : 'Check Status'}</span>
          </button>
        </div>
      </div>

    </div>
  );
}
