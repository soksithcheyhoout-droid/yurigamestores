import React, { useState } from 'react';
import { Wallet, X, Plus, CheckCircle2, ArrowRight, History, ShieldCheck, Zap, Sparkles, Building2, Landmark, CreditCard, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import BakongKhqrCard from './BakongKhqrCard';
import { getStoredWalletHistory, recordWalletTransaction } from '../data/orderStore';
import { formatPrice } from '../data/regionStore';
import { pauseLenis, resumeLenis } from '../hooks/useLenisSmoothScroll';

export default function WalletModal({ balance, onAddFunds, onClose, currentRegion, currentUser }) {
  const [activeTab, setActiveTab] = useState('deposit'); // 'deposit' | 'history'
  const [amount, setAmount] = useState(10);
  const [selectedMethod, setSelectedMethod] = useState('khqr');
  const [showQr, setShowQr] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [walletRef, setWalletRef] = useState(() => `YGS-DEP-${Math.floor(100000 + Math.random() * 900000)}`);
  const [history, setHistory] = useState(() => getStoredWalletHistory());

  React.useEffect(() => {
    pauseLenis();
    return () => {
      resumeLenis();
    };
  }, []);

  // Sync wallet transactions from MySQL for logged in user
  React.useEffect(() => {
    if (currentUser?.id) {
      fetch(`/api/wallet/${encodeURIComponent(currentUser.id)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.history)) {
            setHistory(data.history);
          }
        })
        .catch(() => {});
    }
  }, [currentUser?.id, activeTab]);

  const quickAmounts = [5, 10, 20, 50, 100];

  const gateways = [
    { 
      id: 'khqr', 
      title: 'Bakong KHQR (NBC Official)', 
      sub: 'Zero fee • Instant QR scan with any banking app', 
      logo: '/assets/payments/bakong_khqr.svg', 
      badge: 'RECOMMENDED' 
    },
    { 
      id: 'aba', 
      title: 'ABA PAY Direct', 
      sub: 'Instant mobile push notification checkout', 
      logo: '/assets/payments/aba_pay.svg', 
      badge: 'POPULAR' 
    }
  ];

  const handleStartDeposit = () => {
    if (amount <= 0 || isNaN(amount)) return;
    setWalletRef(`YGS-DEP-${Math.floor(100000 + Math.random() * 900000)}`);
    setShowQr(true);
  };

  const handleConfirmDeposit = () => {
    setIsSuccess(true);
    try {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}

    const newTx = {
      id: walletRef,
      type: "DEPOSIT",
      title: selectedMethod === 'khqr' ? "Bakong KHQR Wallet Top-Up" : "ABA PAY Wallet Top-Up",
      amount: parseFloat(amount),
      timestamp: new Date().toISOString(),
      status: "COMPLETED",
      method: selectedMethod === 'khqr' ? 'Bakong KHQR' : 'ABA PAY'
    };

    const updatedHistory = recordWalletTransaction(newTx, currentUser?.id);
    setHistory(updatedHistory);

    setTimeout(() => {
      onAddFunds(amount);
      setIsSuccess(false);
      setShowQr(false);
      setActiveTab('history');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" onClick={onClose}>
      <div 
        role="dialog"
        aria-modal="true"
        className="w-full bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" 
        style={{ maxWidth: showQr ? '440px' : '520px' }}
        onClick={(e) => e.stopPropagation()} 
      >
        {/* Header */}
        <div className="p-5 bg-white border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF0F3] text-[#E3062F] flex items-center justify-center shadow-xs">
              <Wallet size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#0F172A] leading-tight font-['Outfit']">
                  YuriGame Wallet
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FFF0F3] text-[#E3062F]">
                  0% Fee
                </span>
              </div>
              <div className="text-[12px] text-[#64748B]">
                Available Balance: <strong className="text-[#E3062F] font-mono">{formatPrice(balance, currentRegion)}</strong>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] flex items-center justify-center border-0 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 flex border-b border-[#F1F5F9] gap-3">
          <button
            onClick={() => { setActiveTab('deposit'); setShowQr(false); }}
            className={`pb-2.5 text-[13px] font-bold border-b-2 transition-colors cursor-pointer bg-transparent border-t-0 border-l-0 border-r-0 ${
              activeTab === 'deposit'
                ? 'border-[#E3062F] text-[#E3062F]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Top Up Balance
          </button>
          <button
            onClick={() => { setActiveTab('history'); setShowQr(false); }}
            className={`pb-2.5 text-[13px] font-bold border-b-2 transition-colors cursor-pointer bg-transparent border-t-0 border-l-0 border-r-0 ${
              activeTab === 'history'
                ? 'border-[#E3062F] text-[#E3062F]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            History & Statements ({history.length})
          </button>
        </div>

        {/* Modal Body */}
        <div 
          data-lenis-prevent 
          className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          {activeTab === 'deposit' && (
            <>
              {!showQr ? (
                <div className="flex flex-col gap-4">
                  {/* Select Amount */}
                  <div>
                    <label className="text-[12px] font-bold text-[#475569] block mb-2">
                      1. Select Top-Up Amount (USD)
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {quickAmounts.map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setAmount(amt)}
                          className={`py-2 rounded-lg text-[13px] font-mono font-bold transition-all cursor-pointer border ${
                            amount === amt
                              ? 'bg-[#E3062F] text-white border-[#E3062F] shadow-xs'
                              : 'bg-[#F8FAFC] text-[#1E293B] border-[#E2E8F0] hover:border-[#E3062F]/50'
                          }`}
                        >
                          {formatPrice(amt, currentRegion)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Amount Input */}
                  <div>
                    <label className="text-[12px] font-bold text-[#475569] block mb-1">
                      Or Custom USD Amount:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="seagm-input font-mono font-bold text-base"
                      placeholder="Enter amount in USD"
                    />
                  </div>

                  {/* Select Payment Channel */}
                  <div>
                    <label className="text-[12px] font-bold text-[#475569] block mb-2">
                      2. Payment Method (0% Surcharge)
                    </label>
                    <div className="flex flex-col gap-2">
                      {gateways.map(gw => {
                        const Icon = gw.icon;
                        const isSelected = selectedMethod === gw.id;

                        return (
                          <div
                            key={gw.id}
                            onClick={() => setSelectedMethod(gw.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'border-[#E3062F] bg-[#FFF0F3]/30 ring-2 ring-[#E3062F]/20'
                                : 'border-[#E2E8F0] hover:border-[#E3062F]/50 bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <img 
                                src={gw.logo} 
                                alt={gw.title} 
                                className="h-8 w-auto object-contain rounded shrink-0 shadow-2xs" 
                              />
                              <div>
                                <div className="text-[13px] font-bold text-[#0F172A] flex items-center gap-2">
                                  <span>{gw.title}</span>
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-[#FFF0F3] text-[#E3062F]">
                                    {gw.badge}
                                  </span>
                                </div>
                                <div className="text-[11px] text-[#64748B]">{gw.sub}</div>
                              </div>
                            </div>

                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-[#E3062F] text-white flex items-center justify-center text-[10px] shrink-0">
                                <Check size={12} strokeWidth={3} />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={handleStartDeposit}
                    className="seagm-btn-orange w-full py-3 mt-2 text-sm"
                  >
                    <span>Proceed with {selectedMethod === 'khqr' ? 'Bakong KHQR' : 'ABA PAY'} • {formatPrice(amount, currentRegion)}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowQr(false)}
                    className="text-[12px] font-bold text-[#64748B] hover:text-[#0F172A] mb-3 inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                  >
                    ← Change Amount
                  </button>

                  <BakongKhqrCard
                    amountUsd={amount}
                    amountKhr={(amount * 4100).toLocaleString()}
                    orderRef={walletRef}
                    paymentMethod={selectedMethod}
                    onPaymentConfirmed={handleConfirmDeposit}
                    onBack={() => setShowQr(false)}
                  />
                </div>
              )}
            </>
          )}

          {activeTab === 'history' && (
            <div className="flex flex-col gap-2">
              {history.length > 0 ? (
                history.map((tx, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between text-[13px]"
                  >
                    <div>
                      <div className="font-bold text-[#0F172A]">{tx.title}</div>
                      <div className="text-[11px] text-[#64748B]">
                        {new Date(tx.timestamp).toLocaleString()} • {tx.method}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono font-bold ${
                        tx.type === 'DEPOSIT' ? 'text-[#059669]' : 'text-[#E11D48]'
                      }`}>
                        {tx.type === 'DEPOSIT' ? '+' : '-'}{formatPrice(tx.amount, currentRegion)}
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-[#64748B] text-[13px]">
                  No past transactions found.
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
