import React, { useState, useEffect } from 'react';
import { Zap, X, Check, Globe, CheckCircle2 } from 'lucide-react';
import { REGIONS, saveStoredRegion } from '../data/regionStore';
import CountryFlag from './CountryFlag';
import { pauseLenis, resumeLenis } from '../hooks/useLenisSmoothScroll';

export default function RegionLangModal({ isOpen, onClose, currentRegion, onSelectRegion }) {
  const [selectedId, setSelectedId] = useState(currentRegion?.id || 'in_usd');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && currentRegion?.id) {
      setSelectedId(currentRegion.id);
    }
  }, [isOpen, currentRegion]);

  // Lock background scroll and prevent touch-move interference
  useEffect(() => {
    if (isOpen) {
      pauseLenis();
    } else {
      resumeLenis();
    }
    return () => {
      resumeLenis();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApply = (region) => {
    const target = region || REGIONS.find(r => r.id === selectedId) || REGIONS[0];
    setSelectedId(target.id);
    saveStoredRegion(target);
    if (onSelectRegion) onSelectRegion(target);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 300);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        data-lenis-prevent
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[80vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#F1F5F9] bg-[#F8FAFC] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFF0F3] text-[#E3062F] flex items-center justify-center shrink-0">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A] leading-tight">
                Region, Language & Currency
              </h3>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Select your preferred country, language, and display currency
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#E2E8F0] text-[#64748B] flex items-center justify-center transition-colors border-0 bg-transparent cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Region & Currency List - Smooth Native Touch Scrolling */}
        <div 
          data-lenis-prevent
          className="p-3.5 sm:p-5 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2.5"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          <div className="text-[11px] font-extrabold text-[#94A3B8] uppercase tracking-wider mb-2">
            Available Regional Settings
          </div>

          {REGIONS.map((r) => {
            const isSelected = selectedId === r.id;
            return (
              <div
                key={r.id}
                onClick={() => {
                  setSelectedId(r.id);
                  handleApply(r);
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group active:scale-[0.99] ${
                  isSelected 
                    ? 'border-[#E3062F] bg-[#FFF0F3]/30 ring-2 ring-[#E3062F]/20' 
                    : 'border-[#E2E8F0] hover:border-[#E3062F]/60 hover:bg-[#F8FAFC]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <CountryFlag code={r.countryCode} className="w-7 h-5 rounded-xs shadow-2xs shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-[#0F172A] flex items-center gap-2 flex-wrap">
                      <span>{r.countryName}</span>
                      <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-[#F1F5F9] text-[#475569] font-mono">
                        {r.displayLabel}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748B] mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>Language: <strong className="text-[#0F172A]">{r.langName}</strong></span>
                      <span>•</span>
                      <span>Currency: <strong className="text-[#E3062F] font-mono">{r.currency} ({r.currencySymbol})</strong></span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  {isSelected ? (
                    <span className="w-5 h-5 rounded-full bg-[#E3062F] text-white flex items-center justify-center text-xs">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded-full border border-[#CBD5E1] group-hover:border-[#E3062F]" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-[#F8FAFC] border-t border-[#F1F5F9] flex items-center justify-between shrink-0 gap-2">
          <span className="text-[10px] sm:text-[11px] text-[#64748B] leading-tight">
            <Zap size={14} className="inline mr-1 text-amber-500" /> Instant conversion across all game packages
          </span>
          <button
            onClick={() => handleApply()}
            className="seagm-btn-teal text-xs py-2 px-4 sm:px-5 font-bold flex items-center gap-1.5 shrink-0"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 size={14} />
                <span>Applied!</span>
              </>
            ) : (
              <span>Save & Apply</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
