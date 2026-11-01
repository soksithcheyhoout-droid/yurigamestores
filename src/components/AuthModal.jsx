import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import YuriGameLogo from './YuriGameLogo';
import { loginWithGoogle } from '../data/authStore';
import { pauseLenis, resumeLenis } from '../hooks/useLenisSmoothScroll';

export default function AuthModal({ 
  isOpen, 
  onClose, 
  reasonPrompt = '',
  onAuthSuccess 
}) {
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setIsLoading(false);
      pauseLenis();
    } else {
      resumeLenis();
    }
    return () => {
      resumeLenis();
    };
  }, [isOpen]);

  const GOOGLE_CLIENT_ID = "792567167404-k8sg33r3g3vl0q526chplfn723hrs8bv.apps.googleusercontent.com";

  const triggerSuccess = (user, message) => {
    try {
      confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
    } catch (e) {}
    setSuccessMsg(message || `Welcome, ${user.name}!`);
    setTimeout(() => {
      if (onAuthSuccess) onAuthSuccess(user);
      onClose();
    }, 900);
  };

  const handleGoogleSignIn = () => {
    setErrorMsg('');
    setIsLoading(true);

    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 6000);

    if (window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            clearTimeout(safetyTimer);
            if (tokenResponse.error) {
              setIsLoading(false);
              setErrorMsg(`Google Sign-In was cancelled (${tokenResponse.error}).`);
              return;
            }
            try {
              const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
              });
              const profile = await profileRes.json();
              const res = await loginWithGoogle({ profile });
              setIsLoading(false);
              if (res.success) {
                triggerSuccess(res.user, `Welcome, ${res.user.name}!`);
              } else {
                setErrorMsg(res.error || 'Failed to sign in with Google.');
              }
            } catch (err) {
              setIsLoading(false);
              setErrorMsg('Failed to process Google profile.');
            }
          },
          error_callback: (err) => {
            clearTimeout(safetyTimer);
            setIsLoading(false);
            console.warn('Google Token Client Error:', err);
            setErrorMsg(err.message || 'Google popup closed or blocked. Please allow popups.');
          }
        });
        client.requestAccessToken({ prompt: 'select_account' });
      } catch (err) {
        clearTimeout(safetyTimer);
        setIsLoading(false);
        setErrorMsg('Could not open Google authentication window.');
      }
    } else if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            clearTimeout(safetyTimer);
            if (response.credential) {
              const res = await loginWithGoogle({ credential: response.credential });
              setIsLoading(false);
              if (res.success) {
                triggerSuccess(res.user, `Welcome, ${res.user.name}!`);
              } else {
                setErrorMsg(res.error || 'Google login failed.');
              }
            }
          }
        });
        window.google.accounts.id.prompt();
      } catch (err) {
        clearTimeout(safetyTimer);
        setIsLoading(false);
        setErrorMsg('Google login initialization failed.');
      }
    } else {
      clearTimeout(safetyTimer);
      setIsLoading(false);
      setErrorMsg('Google service is loading. Please click again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        data-lenis-prevent
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-4 flex items-center justify-between border-b border-[#F1F5F9]">
          <YuriGameLogo size="sm" showBadge={true} inverse />
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#F8FAFC] hover:bg-[#E2E8F0] text-[#64748B] flex items-center justify-center border border-[#E2E8F0] cursor-pointer transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 text-center">
          <h2 className="text-[18px] font-extrabold text-[#0F172A] mb-1">
            Sign in to YuriGame
          </h2>
          <p className="text-[13px] text-[#64748B] mb-5">
            Sign in with your Google Account to continue
          </p>

          {/* Reason Notification Banner */}
          {reasonPrompt && !successMsg && (
            <div className="mb-4 p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-[#C2410C] text-[12px] font-semibold">
              {reasonPrompt}
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center gap-2 text-[13px] font-bold">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-[#FFF1F0] border border-[#FFCCC7] text-[#E11D48] flex items-start gap-2 text-[12px] text-left">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-[#E11D48]" />
              <span className="font-semibold flex-1">{errorMsg}</span>
            </div>
          )}

          {/* Single Clean Google Login Button */}
          <button
            type="button"
            id="btn-google-login"
            data-testid="btn-google-login"
            disabled={isLoading}
            onClick={handleGoogleSignIn}
            className="w-full h-12 rounded-xl border border-[#CBD5E1] hover:border-[#94A3B8] bg-white hover:bg-[#F8FAFC] text-[14px] font-bold text-[#1E293B] flex items-center justify-center gap-3 cursor-pointer transition-all shadow-xs hover:shadow-sm active:scale-[0.98] disabled:opacity-60"
          >
            {isLoading ? (
              <span className="flex items-center gap-2 text-[13px]">
                <span className="w-4 h-4 border-2 border-[#E3062F] border-t-transparent rounded-full animate-spin"></span>
                <span>Connecting to Google...</span>
              </span>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          {/* Clean Security Footer */}
          <div className="mt-5 pt-3 border-t border-[#F1F5F9] flex items-center justify-center gap-1.5 text-[11px] text-[#94A3B8]">
            <ShieldCheck size={13} className="text-[#E3062F]" />
            <span>Official Google Sign-In • 256-bit SSL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
