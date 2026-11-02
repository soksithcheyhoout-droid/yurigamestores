import React from 'react';
import {
  Clock,
  Headphones,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import YuriGameLogo from './YuriGameLogo';

export default function Footer({ contacts = {} }) {
  const telegramUrl = contacts.telegramUrl || 'https://t.me/Yur1Uchiha';
  const telegramUsername = contacts.telegramUsername || '@Yur1Uchiha';

  return (
    <footer className="border-t border-[#1C1E2A] bg-[#0A0B0E] text-slate-400 font-['Kantumruy_Pro'] transition-colors">
      {/* Accepted Payment Methods Row */}
      <div className="border-b border-[#181A22] py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold font-['Rajdhani'] uppercase tracking-wider text-slate-300">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>National Bank of Cambodia &bull; Verified Instant KHQR</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#14151C] border border-white/10 shadow-xs">
              <img
                src="/assets/payments/bakong_khqr.svg"
                alt="Bakong KHQR Official Logo"
                className="h-7 w-auto object-contain"
              />
              <span className="text-xs font-bold text-white font-['Rajdhani']">
                Bakong KHQR (0% Fee)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-3">
            <YuriGameLogo size="default" showBadge={true} inverse />
            <p className="text-[12px] leading-relaxed text-slate-400 m-0">
              Premier digital gaming store in Cambodia. Instant automated delivery for Roblox, Mobile Legends KH, Free Fire & RoS Legacy.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational (99.98% Uptime)</span>
            </div>
          </div>

          {/* Direct Games */}
          <div>
            <h4 className="text-[13px] font-bold text-white mb-3 uppercase tracking-wider font-['Rajdhani']">
              Direct Games
            </h4>
            <ul className="space-y-2 text-[12px] list-none p-0 m-0">
              <li>
                <a href="#catalog" className="text-slate-400 hover:text-[#E3062F] transition-colors no-underline">
                  Roblox Robux (Auto & Manual)
                </a>
              </li>
              <li>
                <a href="#catalog" className="text-slate-400 hover:text-[#E3062F] transition-colors no-underline">
                  Mobile Legends KH Direct Moonton
                </a>
              </li>
              <li>
                <a href="#catalog" className="text-slate-400 hover:text-[#E3062F] transition-colors no-underline">
                  Free Fire Garena UID
                </a>
              </li>
              <li>
                <a href="#catalog" className="text-slate-400 hover:text-[#E3062F] transition-colors no-underline">
                  Rules of Survival Legacy
                </a>
              </li>
            </ul>
          </div>

          {/* Help & Support */}
          <div>
            <h4 className="text-[13px] font-bold text-white mb-3 uppercase tracking-wider font-['Rajdhani']">
              Help & Support
            </h4>
            <ul className="space-y-2 text-[12px] list-none p-0 m-0">
              <li>
                <a href="#faq" className="text-slate-400 hover:text-[#E3062F] transition-colors no-underline">
                  Frequently Asked Questions
                </a>
              </li>
              <li>
                <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#229ED9] transition-colors no-underline">
                  Telegram Admin {telegramUsername}
                </a>
              </li>
              <li>
                <span className="text-slate-500">Support Hours: 24/7/365</span>
              </li>
            </ul>
          </div>

          {/* Automated Storefront */}
          <div>
            <h4 className="text-[13px] font-bold text-white mb-3 uppercase tracking-wider font-['Rajdhani']">
              Automated Storefront
            </h4>
            <p className="text-[11.5px] leading-relaxed text-slate-400 m-0">
              Direct gamer top-up platform engineered for instant diamond and credit delivery with server-side validation.
            </p>
          </div>
        </div>

        {/* Bottom Copyright Row */}
        <div className="pt-6 border-t border-[#181A22] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-slate-500">
          <div className="flex items-center gap-3 flex-wrap">
            <YuriGameLogo size="sm" showBadge={true} inverse />
            <span>&copy; {new Date().getFullYear()} YuriGame Store. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <a href="#terms" className="text-slate-500 hover:text-slate-300 transition-colors no-underline">
              Terms of Service
            </a>
            <span>&bull;</span>
            <a href="#privacy" className="text-slate-500 hover:text-slate-300 transition-colors no-underline">
              Privacy Policy
            </a>
            <span>&bull;</span>
            <span className="text-emerald-500 font-mono">Protected by Cloudflare</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
