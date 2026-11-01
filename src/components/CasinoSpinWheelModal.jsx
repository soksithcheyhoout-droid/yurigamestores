import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, X, ShieldCheck, Zap, Flame, Crown, Volume2, VolumeX } from 'lucide-react';
import { CASINO_CONFIG, generateWheelSegments, calculateSpinOutcome } from '../data/casinoConfig';

/**
 * Realistic Multi-Tone Casino Audio Synthesizer via Web Audio API
 * Generates mechanical wheel clicks that shift pitch as speed decays, plus a royal win chime.
 */
function playPegClick(audioCtxRef, currentSpeedRatio = 1.0) {
  try {
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'suspended') return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Pitch drops slightly as speed slows down, mimicking mechanical flapper resistance
    const baseFreq = 480 + 350 * currentSpeedRatio;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.035);
  } catch {}
}

function playJackpotFanfare(audioCtxRef) {
  try {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const notes = [440, 554.37, 659.25, 880, 1108.73]; // A Major royal fanfare
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const startTime = ctx.currentTime + idx * 0.1;
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.14, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  } catch {}
}

export default function CasinoSpinWheelModal({
  isOpen = false,
  onClose,
  gameCode = 'mlbb',
  purchasedQty = 55,
  currencyName = 'Diamonds',
  gameName = 'Mobile Legends: Bang Bang',
  bankedProfitUsd = 0,
  onSpinComplete,
  forcePreview = false,
}) {
  // Feature Guard: 100% disabled by default until turned on
  if ((!CASINO_CONFIG.enabled && !forcePreview) || !isOpen) {
    return null;
  }

  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [ledChaseIndex, setLedChaseIndex] = useState(0);

  const segments = useRef(generateWheelSegments(gameCode, purchasedQty, currencyName)).current;
  const numSegments = segments.length;
  const arcSize = (2 * Math.PI) / numSegments;

  const rotationRef = useRef(0);
  const currentPegRef = useRef(0);
  const flapperVibrateRef = useRef(0);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  // Perimeter LED bulb chasing animation
  useEffect(() => {
    const interval = setInterval(() => {
      setLedChaseIndex((prev) => (prev + 1) % 24);
    }, isSpinning ? 60 : 250);
    return () => clearInterval(interval);
  }, [isSpinning]);

  // High-Resolution 3D Beveled Casino Roulette Wheel Renderer
  const drawWheel = useCallback((currentRotation) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 30;

    ctx.clearRect(0, 0, width, height);

    // ── 1. Deep Shadow Backdrop ───────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 24, 0, 2 * Math.PI);
    ctx.fillStyle = '#050608';
    ctx.shadowColor = 'rgba(227, 6, 47, 0.45)';
    ctx.shadowBlur = 45;
    ctx.fill();
    ctx.restore();

    // ── 2. Outer Beveled 24K Polished Gold Ring ───────────────────────────
    const goldGrad = ctx.createLinearGradient(0, 0, width, height);
    goldGrad.addColorStop(0, '#FFE58F');
    goldGrad.addColorStop(0.2, '#D4AF37');
    goldGrad.addColorStop(0.4, '#8A6818');
    goldGrad.addColorStop(0.6, '#FFF1B8');
    goldGrad.addColorStop(0.8, '#D4AF37');
    goldGrad.addColorStop(1, '#5C440B');

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 22, 0, 2 * Math.PI);
    ctx.fillStyle = goldGrad;
    ctx.fill();

    // Inner Obsidian Trough for LED bulbs
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 12, 0, 2 * Math.PI);
    ctx.fillStyle = '#090B10';
    ctx.fill();

    // ── 3. 24 Perimeter Casino LED Bulbs ──────────────────────────────────
    const totalBulbs = 24;
    for (let b = 0; b < totalBulbs; b++) {
      const bAngle = (b * 2 * Math.PI) / totalBulbs;
      const bX = centerX + Math.cos(bAngle) * (radius + 17);
      const bY = centerY + Math.sin(bAngle) * (radius + 17);
      const isLit = (b + ledChaseIndex) % 3 === 0;

      ctx.beginPath();
      ctx.arc(bX, bY, isLit ? 3.8 : 2.5, 0, 2 * Math.PI);
      if (isLit) {
        ctx.fillStyle = b % 2 === 0 ? '#FFE066' : '#FF1E46';
        ctx.shadowColor = b % 2 === 0 ? '#FFD700' : '#E3062F';
        ctx.shadowBlur = 12;
      } else {
        ctx.fillStyle = '#1E2538';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // ── 4. Inner Brass Spoke Ring ─────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#121520';
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fill();

    // ── 5. Draw Segments ──────────────────────────────────────────────────
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(currentRotation);

    for (let i = 0; i < numSegments; i++) {
      const seg = segments[i];
      const startAngle = i * arcSize;
      const endAngle = startAngle + arcSize;

      // Segment Wedge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      if (seg.isBait) {
        // Ultra-luxurious Radiant Golden Bait Segment
        const baitGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, radius);
        baitGrad.addColorStop(0, '#FFF4CC');
        baitGrad.addColorStop(0.35, '#F3C649');
        baitGrad.addColorStop(0.7, '#D4AF37');
        baitGrad.addColorStop(1, '#8C6B14');
        ctx.fillStyle = baitGrad;
      } else {
        ctx.fillStyle = seg.color;
      }
      ctx.fill();

      // Gleaming Metallic Divider Spokes
      ctx.strokeStyle = seg.isBait ? '#FFF1B8' : (seg.border || '#334155');
      ctx.lineWidth = seg.isBait ? 3 : 2;
      ctx.stroke();

      // Text & Emblems
      ctx.save();
      ctx.rotate(startAngle + arcSize / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      // Primary Diamond Amount
      ctx.font = seg.isBait ? '900 22px "Outfit", sans-serif' : '900 18px "Outfit", sans-serif';
      ctx.fillStyle = seg.isBait ? '#07080B' : seg.textColor;
      ctx.fillText(`${seg.label}`, radius - 44, -7);

      // Sublabel Badge
      ctx.font = '800 10px "Outfit", sans-serif';
      if (seg.isBait) {
        ctx.fillStyle = '#800010';
        ctx.fillText(`★ ${seg.sublabel} ★`, radius - 44, 12);
      } else if (seg.type === 'lucky') {
        ctx.fillStyle = '#C084FC';
        ctx.fillText(seg.sublabel, radius - 44, 11);
      } else if (seg.type === 'bonus') {
        ctx.fillStyle = '#FF4D6D';
        ctx.fillText(seg.sublabel, radius - 44, 11);
      } else {
        ctx.fillStyle = '#64748B';
        ctx.fillText(seg.sublabel, radius - 44, 11);
      }

      // Perimeter Golden Pin Rivet
      ctx.beginPath();
      ctx.arc(radius - 8, 0, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFE58F';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    ctx.restore(); // Restore wheel rotation

    // ── 6. Center 3D Crown Hub (Las Vegas Casino Core) ───────────────────
    ctx.save();
    // Beveled Gold Outer Hub
    ctx.beginPath();
    ctx.arc(centerX, centerY, 52, 0, 2 * Math.PI);
    ctx.fillStyle = goldGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Dark Ruby Inset
    ctx.beginPath();
    ctx.arc(centerX, centerY, 42, 0, 2 * Math.PI);
    const rubyGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 42);
    rubyGrad.addColorStop(0, '#E3062F');
    rubyGrad.addColorStop(0.6, '#750216');
    rubyGrad.addColorStop(1, '#0E1017');
    ctx.fillStyle = rubyGrad;
    ctx.fill();

    // Center YuriGame Crown Crest
    ctx.font = 'bold 22px "Outfit", sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👑', centerX, centerY - 1);
    ctx.restore();

    // ── 7. Top Flapper / Needle with Physics Deflection ────────────────────
    const needleDeflect = flapperVibrateRef.current * 4;
    ctx.save();
    ctx.translate(centerX, centerY - radius - 16);
    ctx.rotate(needleDeflect * (Math.PI / 180));

    // Needle Body
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.lineTo(10, -10);
    ctx.lineTo(0, 28);
    ctx.closePath();
    const needleGrad = ctx.createLinearGradient(-10, -10, 10, 28);
    needleGrad.addColorStop(0, '#FFF1B8');
    needleGrad.addColorStop(0.5, '#D4AF37');
    needleGrad.addColorStop(1, '#E3062F');
    ctx.fillStyle = needleGrad;
    ctx.shadowColor = 'rgba(227, 6, 47, 0.8)';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Needle Pivot Jewel
    ctx.beginPath();
    ctx.arc(0, -6, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();
  }, [arcSize, ledChaseIndex, numSegments, segments]);

  useEffect(() => {
    drawWheel(0);
  }, [drawWheel]);

  // Execute Spin Action
  const handleStartSpin = () => {
    if (isSpinning || hasSpun) return;
    initAudio();
    setIsSpinning(true);

    // 1. Gated Profit-Vault Engine determines outcome
    const outcome = calculateSpinOutcome(gameCode, purchasedQty, bankedProfitUsd);
    setSpinResult(outcome);

    // 2. Exact stopping target calculation
    const targetSegmentCenter = outcome.targetSegmentIndex * arcSize + arcSize / 2;
    const targetBaseAngle = (3 * Math.PI) / 2 - targetSegmentCenter;

    const fullRevolutions = 8 * (2 * Math.PI);
    const jitter = (Math.random() - 0.5) * (arcSize * 0.45);
    const totalRotationTarget = rotationRef.current + fullRevolutions + (targetBaseAngle - (rotationRef.current % (2 * Math.PI))) + jitter;

    const startTime = performance.now();
    const duration = 6200; // 6.2s luxury deceleration
    const startRotation = rotationRef.current;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Authentic quintic deceleration curve
      const easeOut = 1 - Math.pow(1 - progress, 5);
      const currentRot = startRotation + (totalRotationTarget - startRotation) * easeOut;
      rotationRef.current = currentRot;

      // Peg click sound and flapper deflection physics
      const currentSpeedRatio = 1 - easeOut;
      const currentPeg = Math.floor(currentRot / (arcSize / 1.5));
      if (currentPeg !== currentPegRef.current) {
        currentPegRef.current = currentPeg;
        flapperVibrateRef.current = Math.min(1, currentSpeedRatio * 2.5);
        if (soundEnabled) playPegClick(audioCtxRef, currentSpeedRatio);
      } else {
        flapperVibrateRef.current *= 0.85; // Dampen flapper back to center
      }

      drawWheel(currentRot);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setHasSpun(true);
        flapperVibrateRef.current = 0;
        drawWheel(totalRotationTarget);

        if (outcome.isBonus) {
          if (soundEnabled) playJackpotFanfare(audioCtxRef);
          try {
            confetti({
              particleCount: 160,
              spread: 90,
              origin: { y: 0.58 },
              colors: ['#FFD700', '#E3062F', '#FFFFFF', '#A855F7', '#FF1E46'],
            });
          } catch {}
        }

        setTimeout(() => {
          setShowResultModal(true);
          if (onSpinComplete) onSpinComplete(outcome);
        }, 750);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const baitSegment = segments.find((s) => s.isBait);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-[#0E1017] p-6 shadow-2xl overflow-hidden font-['Outfit',sans-serif]">
        
        {/* Top Ruby Glow Bar */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-1.5 bg-gradient-to-r from-transparent via-[#E3062F] to-transparent opacity-95" />

        {/* Header with Casino Audio Toggle */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E3062F]/20 to-red-600/10 border border-[#E3062F]/40 text-[#E3062F]">
              <Crown size={20} className="text-[#FFD700]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#FFD700]">
                <Flame size={12} className="fill-[#FFD700] text-[#FFD700]" /> VIP High-Roller Spin
              </div>
              <h2 className="text-base font-black text-white m-0 tracking-tight leading-tight">
                {gameName} Bonus Wheel
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute Casino Sounds' : 'Unmute Casino Sounds'}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSpinning}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* The Golden Teaser / Bait Banner */}
        {baitSegment && (
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#2A200A] via-[#1A1508] to-[#0E1017] border border-[#D4AF37]/40 px-3.5 py-2 text-xs">
            <div className="flex items-center gap-2 text-[#FFE58F]">
              <Sparkles size={15} className="text-[#FFD700] shrink-0" />
              <span>
                Top Jackpot Slice: <strong className="text-[#FFD700] font-black">{baitSegment.label} {currencyName}</strong>
              </span>
            </div>
            <span className="rounded-full bg-[#FFD700]/15 border border-[#FFD700]/30 px-2 py-0.5 text-[10px] font-black tracking-wider text-[#FFD700] uppercase">
              100% Zero-Loss
            </span>
          </div>
        )}

        {/* Wheel Container */}
        <div className="relative my-3 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="max-w-full drop-shadow-[0_0_40px_rgba(227,6,47,0.25)]"
          />
        </div>

        {/* Guaranteed Protection Note */}
        <div className="mb-3 flex items-center justify-center gap-1.5 text-xs text-slate-400 text-center">
          <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
          <span>
            Purchased: <strong className="text-white">{purchasedQty} {currencyName}</strong>. You will never receive less than this.
          </span>
        </div>

        {/* Spin CTA Button */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleStartSpin}
            disabled={isSpinning || hasSpun}
            className={`w-full h-13 rounded-2xl font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl ${
              hasSpun
                ? 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                : isSpinning
                ? 'bg-gradient-to-r from-[#8B031C] to-[#590111] text-white/70 animate-pulse'
                : 'bg-gradient-to-r from-[#E3062F] via-[#FF1E46] to-[#B80D2E] hover:shadow-[0_0_30px_rgba(227,6,47,0.5)] text-white active:scale-[0.98]'
            }`}
          >
            {isSpinning ? (
              <>Spinning High-Roller Wheel...</>
            ) : hasSpun ? (
              <>Spin Recorded</>
            ) : (
              <>
                <Zap size={17} className="fill-white" /> Spin Wheel For {baitSegment?.label || 'Bonus'} {currencyName}
              </>
            )}
          </button>
        </div>

        {/* Outcome Modal Overlay */}
        {showResultModal && spinResult && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/92 p-5 backdrop-blur-md animate-in zoom-in-95 duration-200">
            <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-[#090A0E] p-6 text-center shadow-2xl relative">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFD700]/20 to-amber-500/10 border border-[#FFD700]/40 text-[#FFD700]">
                <Trophy size={28} />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-black uppercase tracking-wider mb-2 text-slate-300">
                {spinResult.isBonus ? '🎉 Bonus Diamond Upgrade!' : 'Standard Guaranteed Delivery'}
              </div>

              <h3 className="text-3xl font-black text-white m-0 tracking-tight">
                {spinResult.awardedQty} {currencyName}
              </h3>
              
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {spinResult.isBonus
                  ? `Congratulations! Upgraded to ${spinResult.awardedQty} ${currencyName}! Delivered directly via provider code ${spinResult.productCode}.`
                  : `Your guaranteed order of ${spinResult.awardedQty} ${currencyName} is confirmed and in automated delivery.`}
              </p>

              <button
                type="button"
                onClick={onClose}
                className="mt-5 w-full h-11 rounded-xl bg-gradient-to-r from-[#E3062F] to-[#b80d2e] font-black text-xs uppercase tracking-wider text-white shadow-lg cursor-pointer hover:opacity-95"
              >
                Claim Package
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
