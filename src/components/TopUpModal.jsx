import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, ShieldCheck, AlertCircle, ArrowRight, Zap, QrCode, Wallet, Loader2, Sparkles, UserCheck, Activity, CreditCard } from 'lucide-react';
import confetti from 'canvas-confetti';
import BakongKhqrCard from './BakongKhqrCard';
import { recordWalletTransaction } from '../data/orderStore';
import { verifySoraPlayer } from '../data/soraStore';

import { pauseLenis, resumeLenis } from '../hooks/useLenisSmoothScroll';

export default function TopUpModal({ game, onClose, onOrderComplete, walletBalance, onDeductWallet }) {
  useEffect(() => {
    if (game) {
      pauseLenis();
      return () => {
        resumeLenis();
      };
    }
  }, [game]);

  const safePackages = game?.packages || [];
  const [selectedPkg, setSelectedPkg] = useState(safePackages[0] || null);
  const [quantity, setQuantity] = useState(1);

  // Step 2: Account Form Fields
  const [formData, setFormData] = useState({});
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedProfile, setVerifiedProfile] = useState(null);
  const [formError, setFormError] = useState('');

  // Step 3: Payment Method ('khqr', 'aba', 'wing', 'balance')
  const [paymentMethod, setPaymentMethod] = useState('khqr');

  // Step 4: Payment & Delivery Stage ('form', 'awaiting_payment', 'delivering', 'completed')
  const [stage, setStage] = useState('form');

  // Unique Order Reference for this checkout session
  const pendingOrderRef = useMemo(() => `CD-${Math.floor(100000 + Math.random() * 900000)}`, [game?.id]);

  // Terms agreement checkbox
  const [agreedTerms, setAgreedTerms] = useState(true);

  // Total price calculation
  const totalPrice = ((selectedPkg?.price || 0) * quantity).toFixed(2);
  const rielPrice = (Number(totalPrice) * 4100).toLocaleString();

  // Initialize form fields for the game
  useEffect(() => {
    if (!game) return;
    const initial = {};
    (game.fields || []).forEach(f => {
      initial[f.key] = f.type === 'select' ? f.options[0] : '';
    });
    setFormData(initial);
    setVerifiedProfile(null);
    if (game.packages && game.packages.length > 0) {
      setSelectedPkg(game.packages[0]);
    }
  }, [game]);

  if (!game) return null;

  const handleFieldChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setVerifiedProfile(null);
    setFormError('');
  };

  // Dynamic In-Game Account Verification
  const handleVerifyAccount = async () => {
    for (let f of game.fields) {
      if (!formData[f.key] || formData[f.key].trim() === '') {
        setFormError(`Please enter your ${f.label}`);
        return;
      }
    }

    setIsVerifying(true);
    setFormError('');

    try {
      const fieldValues = (game.fields || []).map((f) => formData[f.key] || '');
      const gameCode = game.providerCode || game.id || 'ml';
      const result = await verifySoraPlayer(gameCode, fieldValues);

      const allowFormatOnly = gameCode === 'roslegacy';
      if (!result.verified && (!allowFormatOnly || !result.formatValid)) {
        setFormError(result.message || 'Player account was not found on game servers.');
        setVerifiedProfile(null);
        return;
      }

      setVerifiedProfile({
        verified: Boolean(result.verified),
        nickname: result.player?.displayName || result.player?.nickname || 'Player',
        displayName: result.player?.displayName || result.player?.nickname || '',
        avatar: result.player?.avatar || null,
        level: (gameCode === 'ff' || game?.id === 'ff') ? null : (result.player?.level ?? null),
        serverRegion: result.player?.region || (formData.zoneId ? `Zone ${formData.zoneId}` : 'Live Gateway'),
        statusText: result.source || 'Live Game Gateway',
        uidFormatted: result.player?.id || formData.userId || '',
        ping: 'Active',
      });
    } catch (err) {
      setFormError(err.message || 'Player lookup unavailable.');
      setVerifiedProfile(null);
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-check Free Fire Player ID when user enters a valid 6–14 digit Player ID
  useEffect(() => {
    const isFreeFire = game?.providerCode === 'ff' || game?.id === 'ff' || game?.slug === 'free-fire';
    if (!isFreeFire) return;
    const cleanId = String(formData.userId || '').trim().replace(/[\s-]/g, '');
    if (!/^\d{6,14}$/.test(cleanId)) return;
    if (verifiedProfile && String(verifiedProfile.uidFormatted || verifiedProfile.playerId) === cleanId) return;

    const timer = setTimeout(() => {
      handleVerifyAccount();
    }, 600);

    return () => clearTimeout(timer);
  }, [game, formData.userId]);

  // Submit Order / Proceed to Payment
  const handleProceedToPayment = () => {
    for (let f of game.fields) {
      if (!formData[f.key] || formData[f.key].trim() === '') {
        setFormError(`Please fill in ${f.label} before proceeding.`);
        return;
      }
    }

    const isVerified = Boolean(
      verifiedProfile?.verified === true ||
      (game?.providerCode === 'roslegacy' && verifiedProfile?.formatValid === true)
    );
    if (!isVerified) {
      setFormError(`Account not verified! Please click "Verify Account" above to check your account first.`);
      return;
    }

    if (!agreedTerms) {
      setFormError("Please agree to the terms and verify your ID is correct.");
      return;
    }

    setStage('awaiting_payment');
  };

  // Simulated Delivery and Completion
  const executeFulfillment = () => {
    setStage('delivering');

    if (paymentMethod === 'balance') {
      onDeductWallet(Number(totalPrice));
      recordWalletTransaction({
        id: pendingOrderRef,
        type: "EXPENSE",
        title: `${selectedPkg.name} (${game.name})`,
        amount: Number(totalPrice),
        timestamp: new Date().toISOString(),
        status: "COMPLETED",
        method: "YuriGame Store Balance"
      });
    }

    setTimeout(() => {
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      const completedOrder = {
        ref: pendingOrderRef,
        gameId: game.id,
        gameName: game.name,
        packageName: selectedPkg.name,
        quantity: quantity,
        totalUsd: Number(totalPrice),
        totalKhr: rielPrice,
        paymentMethod: paymentMethod === 'khqr' ? 'Bakong KHQR' : paymentMethod === 'aba' ? 'ABA PAY Mobile' : 'YuriGame Wallet',
        playerDetails: formData,
        verifiedPlayer: verifiedProfile ? `${verifiedProfile.nickname} (Lv.${verifiedProfile.level})` : `Player ID: ${formData.userId || 'Gamer'}`,
        timestamp: new Date().toISOString(),
        status: 'DELIVERED',
        serverPing: verifiedProfile?.ping || '16ms',
        icon: game.image || '/assets/games/mlbb_tile_4k.jpg'
      };

      onOrderComplete(completedOrder);
    }, 150);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" data-lenis-prevent role="dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header with Game Banner Art */}
        <div style={{
          position: 'relative',
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img
              src={game.image || game.banner}
              alt={game.name}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/assets/games/mlbb_tile_4k.jpg';
              }}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                objectFit: 'cover',
                border: '2px solid #bae6fd',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.1)'
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="badge badge-cyan" style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}>
                  {game.publisher}
                </span>
                <span className="badge badge-green" style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Zap size={11} />
                  <span>Auto Delivery</span>
                </span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
                {game.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fee2e2';
              e.currentTarget.style.color = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
          {stage === 'form' && (
            <div>
              {/* STEP 1: Select Denomination / Package */}
              <div style={{ marginBottom: '1.75rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#0284c7',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      fontFamily: 'var(--font-gaming)'
                    }}>1</span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                      Select Package
                    </span>
                  </div>

                  {/* Quantity Counter */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: '#f8fafc',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #cbd5e1',
                    padding: '0.2rem 0.5rem'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Qty:</span>
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      style={{
                        background: '#e2e8f0',
                        border: 'none',
                        color: '#0f172a',
                        width: '22px',
                        height: '22px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                    >-</button>
                    <span className="mono" style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: '18px', textAlign: 'center', color: '#0f172a' }}>
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(q => q + 1)}
                      style={{
                        background: '#0284c7',
                        border: 'none',
                        color: '#ffffff',
                        width: '22px',
                        height: '22px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                    >+</button>
                  </div>
                </div>

                {/* Packages Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
                  gap: '0.65rem'
                }}>
                  {game.packages.map(pkg => {
                    const isSelected = selectedPkg.id === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPkg(pkg)}
                        style={{
                          padding: '0.85rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                          background: isSelected ? '#f0f9ff' : '#ffffff',
                          boxShadow: isSelected ? '0 2px 10px rgba(2, 132, 199, 0.18)' : '0 1px 3px rgba(15, 23, 42, 0.04)',
                          cursor: 'pointer',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s'
                        }}
                      >
                        {pkg.bonus && (
                          <div style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '6px',
                            background: isSelected ? '#f59e0b' : '#fef3c7',
                            color: isSelected ? '#ffffff' : '#b45309',
                            border: '1px solid #fde68a',
                            borderRadius: '4px',
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            padding: '1px 5px',
                            fontFamily: 'var(--font-gaming)'
                          }}>
                            {pkg.bonus}
                          </div>
                        )}

                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.4rem', lineHeight: 1.25 }}>
                          {pkg.name}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                          <span className="mono" style={{ fontSize: '1rem', fontWeight: 800, color: '#d97706' }}>
                            ${pkg.price.toFixed(2)}
                          </span>
                          {isSelected && (
                            <div style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              background: '#0284c7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff'
                            }}>
                              <Check size={11} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP 2: Enter Account Information & Live Verification */}
              <div style={{
                marginBottom: '1.75rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-lg)',
                padding: '1.15rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#0284c7',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-gaming)'
                  }}>2</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                    Account Details
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: game.fields.length > 1 ? 'repeat(auto-fit, minmax(180px, 1fr))' : '1fr',
                  gap: '0.75rem',
                  marginBottom: '0.75rem'
                }}>
                  {game.fields.map(field => (
                    <div key={field.key}>
                      <label style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        color: '#475569',
                        marginBottom: '0.35rem',
                        fontWeight: 600
                      }}>
                        {field.label}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          value={formData[field.key] || ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: 'var(--radius-md)',
                            color: '#0f172a',
                            fontSize: '0.9rem',
                            outline: 'none'
                          }}
                        >
                          {field.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          value={formData[field.key] || ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: 'var(--radius-md)',
                            color: '#0f172a',
                            fontSize: '0.9rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#0284c7'}
                          onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Live ID Check Button & Status */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  paddingTop: '0.5rem'
                }}>
                  <button
                    type="button"
                    onClick={handleVerifyAccount}
                    disabled={isVerifying}
                    className="btn btn-outline btn-sm"
                    style={{
                      borderColor: verifiedProfile ? '#059669' : '#cbd5e1',
                      color: verifiedProfile ? '#059669' : '#0f172a'
                    }}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 size={13} className="pulse-dot" />
                        <span>Verifying Account...</span>
                      </>
                    ) : verifiedProfile ? (
                      <>
                        <Check size={14} color="#059669" />
                        <span>Account Verified</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} color="#0284c7" />
                        <span>Verify Account</span>
                      </>
                    )}
                  </button>

                  {verifiedProfile && (
                    <div style={{
                      marginTop: '0.85rem',
                      padding: '0.85rem 1rem',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#16a34a',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <UserCheck size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                            {verifiedProfile.displayName || verifiedProfile.nickname} {verifiedProfile.level != null ? <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>(Lv.{verifiedProfile.level})</span> : null}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {verifiedProfile.serverRegion}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#15803d',
                        background: '#dcfce7',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                        <span>Server Ping: {verifiedProfile.ping}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 3: Payment Method Selection */}
              <div style={{ marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#0284c7',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-gaming)'
                  }}>3</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                    Payment Method
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {/* Bakong / KHQR */}
                  <div
                    onClick={() => setPaymentMethod('khqr')}
                    style={{
                      padding: '0.9rem',
                      borderRadius: 'var(--radius-md)',
                      border: paymentMethod === 'khqr' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                      background: paymentMethod === 'khqr' ? '#f0f9ff' : '#ffffff',
                      boxShadow: paymentMethod === 'khqr' ? '0 2px 10px rgba(2, 132, 199, 0.15)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        color: '#0f172a'
                      }}>
                        <QrCode size={18} color="#0284c7" />
                        <span>Bakong / KHQR</span>
                      </div>
                      <span className="badge badge-green" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                        Instant
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Scan via ABA Mobile, ACLEDA, Wing or any KHQR banking app.
                    </div>
                  </div>

                  {/* ABA PAY Mobile */}
                  <div
                    onClick={() => setPaymentMethod('aba')}
                    style={{
                      padding: '0.9rem',
                      borderRadius: 'var(--radius-md)',
                      border: paymentMethod === 'aba' ? '2px solid #00577B' : '1px solid #e2e8f0',
                      background: paymentMethod === 'aba' ? '#f0f9ff' : '#ffffff',
                      boxShadow: paymentMethod === 'aba' ? '0 2px 10px rgba(0, 87, 123, 0.15)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        color: '#0f172a'
                      }}>
                        <CreditCard size={18} color="#00577B" />
                        <span>ABA PAY Mobile</span>
                      </div>
                      <span className="badge badge-cyan" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                        Instant
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Direct checkout via ABA Mobile app with 0% fee.
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                marginBottom: '1rem',
                fontSize: '0.78rem',
                color: '#475569'
              }}>
                <input
                  type="checkbox"
                  id="agree-tnc"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  style={{ marginTop: '0.2rem', accentColor: '#0284c7' }}
                />
                <label htmlFor="agree-tnc" style={{ cursor: 'pointer', lineHeight: 1.4 }}>
                  I confirm that my Game ID is accurate. Top-ups sent to wrong IDs entered by customers cannot be refunded.
                </label>
              </div>

              {/* Error Message */}
              {formError && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-md)',
                  color: '#dc2626',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem'
                }}>
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Order Summary & Submit Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '1rem',
                borderTop: '1px solid #e2e8f0'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>TOTAL AMOUNT</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span className="mono font-gaming" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0284c7', lineHeight: 1 }}>
                      ${totalPrice}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>
                      USD
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleProceedToPayment}
                  className="btn btn-primary btn-lg"
                  style={{ minWidth: '180px' }}
                >
                  <span>Buy Now</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4A: Authentic Bakong KHQR Payment Stage */}
          {stage === 'awaiting_payment' && (
            <div style={{ padding: '0.5rem 0' }}>
              <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setStage('form')}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '999px',
                    padding: '0.35rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  ← Back to Order Details
                </button>
              </div>

              {/* High-Precision Real Bakong KHQR Card */}
              <BakongKhqrCard
                amountUsd={totalPrice}
                amountKhr={rielPrice}
                orderRef={pendingOrderRef}
                paymentMethod={paymentMethod}
                onPaymentConfirmed={executeFulfillment}
                onBack={() => setStage('form')}
              />
            </div>
          )}

          {/* STEP 4B: Delivering Progress Stage */}
          {stage === 'delivering' && (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: '#e0f2fe',
                border: '2px solid #0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                boxShadow: '0 0 25px rgba(2, 132, 199, 0.25)'
              }}>
                <Loader2 size={36} color="#0284c7" className="pulse-dot" style={{ animation: 'spin 1s linear infinite' }} />
              </div>

              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                Payment Confirmed — Delivering!
              </h3>

              <p style={{ fontSize: '0.95rem', color: '#475569', maxWidth: '420px', margin: '0 auto 1rem' }}>
                Sending your <span style={{ color: '#0284c7', fontWeight: 700 }}>{selectedPkg.name}</span> directly to Game ID <span className="mono" style={{ color: '#d97706', fontWeight: 700 }}>{formData.userId}</span>.
              </p>

              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Usually completes within ~5 seconds. Please keep this window open...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
