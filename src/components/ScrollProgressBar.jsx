import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollProgressBar() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
        setScrollProgress(Math.round(currentProgress));
      }
      setShowBackToTop(window.scrollY > 220);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* 1. Ultra-Thin Glowing Neon Scroll Progress Bar under Navbar */}
      <div className="fixed top-16 left-0 right-0 h-[3px] z-40 bg-slate-100/60 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 transition-all duration-75 ease-out"
          style={{
            width: `${scrollProgress}%`,
            boxShadow: '0 0 10px rgba(6, 182, 212, 0.7), 0 0 4px rgba(37, 99, 235, 0.5)'
          }}
        />
      </div>

      {/* 2. Floating Bottom-Right Scroll Indicator & Quick Back-to-Top Button */}
      <div
        className={`fixed bottom-6 right-6 z-40 transition-all duration-300 transform ${
          showBackToTop ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-6 opacity-0 scale-90 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={handleScrollToTop}
          className="group relative flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-slate-900/90 hover:bg-blue-600 text-white backdrop-blur-xl border border-white/20 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.3)] transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95"
          title="Back to top"
        >
          {/* Circular SVG Ring Progress */}
          <div className="relative w-6 h-6 flex items-center justify-center">
            <svg className="w-6 h-6 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-700"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-cyan-400 transition-all duration-100"
                strokeDasharray={`${scrollProgress}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <ArrowUp size={12} className="absolute group-hover:-translate-y-0.5 transition-transform text-white" />
          </div>

          <span className="text-xs font-mono font-bold tracking-tight text-cyan-300 group-hover:text-white">
            {scrollProgress}%
          </span>
          <span className="text-[11px] font-medium text-slate-300 group-hover:text-white hidden sm:inline-block">
            Top
          </span>
        </button>
      </div>
    </>
  );
}
