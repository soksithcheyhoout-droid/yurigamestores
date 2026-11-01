import React, { useEffect, useRef, useState } from 'react';
import {
  Clock,
  Send,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';

function TelegramIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M21.5 3.5L2.5 10.8C1.2 11.3 1.2 12.1 2.3 12.4L7.2 13.9L18.5 6.8C19 6.5 19.5 6.7 19.1 7.1L9.9 15.4H9.8L9.8 19.8C10.4 19.8 10.7 19.5 11 19.2L13.9 16.4L18.8 20C19.7 20.5 20.4 20.2 20.6 19.1L22.8 4.7C23.1 3.5 22.3 2.9 21.5 3.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function AliceSupportWidget({ onOpenLookup, telegramUrl, contacts = {}, hasBottomBar = false }) {
  const cleanTelegramUrl = telegramUrl || contacts.telegramUrl || 'https://t.me/Yur1Uchiha';
  const cleanTelegramUsername = contacts.telegramUsername || '@Yur1Uchiha';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'support',
      text: `Hi! Welcome to YuriGame Store 24/7 Live Support. How can we help you with your top-up today?`,
      time: 'Just now',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Smart automatic assistant replies
    setTimeout(() => {
      const lower = text.toLowerCase();
      let reply = '';

      if (lower.includes('track') || lower.includes('order') || lower.includes('status') || lower.includes('check')) {
        reply = "You can track your real-time top-up status anytime using our Order Lookup! Click 'Track Order' below to search by your username or reference.";
      } else if (lower.includes('khqr') || lower.includes('payment') || lower.includes('bakong') || lower.includes('pay')) {
        reply = "We support official Bakong KHQR with 0% fee! All payments are verified server-side in ~3 seconds. You can scan with Bakong, ABA, ACLEDA, Wing, or any Cambodian mobile banking app to receive diamonds or Robux automatically.";
      } else if (lower.includes('roblox') || lower.includes('robux')) {
        reply = "Roblox Robux are delivered directly to your account by username. Please make sure your username is spelled accurately during checkout.";
      } else if (lower.includes('ml') || lower.includes('mobile legends') || lower.includes('diamond')) {
        reply = "Mobile Legends direct top-ups sync with official Moonton servers in ~5 seconds. Enter your User ID and Zone ID to verify before purchasing!";
      } else if (lower.includes('admin') || lower.includes('human') || lower.includes('agent') || lower.includes('help')) {
        reply = `Our human admin team is available 24/7 on Telegram. You can chat directly with our team at ${cleanTelegramUsername}!`;
      } else {
        reply = `Thank you for reaching out! For immediate assistance, order modifications, or custom requests, our admin team is standing by on Telegram ${cleanTelegramUsername}.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'support',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className={`fixed ${hasBottomBar ? 'bottom-20 sm:bottom-24 lg:bottom-5' : 'bottom-5'} right-3 sm:right-5 z-40 flex flex-col items-end transition-all duration-300`}>
      {/* Floating Launcher Pill */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex h-14 items-center gap-3 rounded-full border border-white/20 bg-gradient-to-r from-[#0E1015] via-[#161820] to-[#0E1015] px-4 py-2 text-white shadow-[0_12px_36px_rgba(0,0,0,0.7),0_0_20px_rgba(34,158,217,0.35)] transition-all duration-300 hover:scale-105 hover:border-[#229ED9]/60 active:scale-95 cursor-pointer"
          aria-label="Open 24/7 live support"
        >
          {/* Telegram Avatar with Online Pulse */}
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2AABEE] to-[#229ED9] text-white shadow-[0_4px_12px_rgba(34,158,217,0.4)] border border-white/30">
            <TelegramIcon size={20} className="translate-x-[-1px] translate-y-[1px]" />
            {/* Green Pulse Dot */}
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#101116] bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          </div>

          <div className="flex flex-col text-left pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold text-white font-['Rajdhani'] tracking-wide">
                Live Support
              </span>
            </div>
            <div className="text-[11px] font-medium text-slate-400 font-['Kantumruy_Pro']">
              Telegram 24/7 Live
            </div>
          </div>

          {/* Glowing Badge Ring */}
          <span className="pointer-events-none absolute -inset-0.5 -z-10 rounded-full bg-gradient-to-r from-[#229ED9]/30 to-[#E3062F]/30 opacity-0 blur-xs transition-opacity duration-300 group-hover:opacity-100" />
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="relative flex h-[500px] w-[350px] sm:w-[380px] flex-col overflow-hidden rounded-2xl border border-[#262836] bg-[#0E0F15] shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(34,158,217,0.2)] animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-[#232532] bg-gradient-to-r from-[#171822] to-[#12131A] px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2AABEE] to-[#229ED9] text-white border border-white/20 shadow-md">
                <TelegramIcon size={20} className="translate-x-[-1px] translate-y-[1px]" />
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#12131A] bg-emerald-500 shadow-[0_0_6px_#10b981]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="m-0 text-[14px] font-bold text-white font-['Rajdhani']">
                    Live Support
                  </h3>
                  <span className="rounded-full bg-[#229ED9]/15 border border-[#229ED9]/40 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider text-[#229ED9]">
                    Telegram 24/7
                  </span>
                </div>
                <p className="m-0 text-[11px] text-slate-400">
                  Direct support via {cleanTelegramUsername} on Telegram
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white cursor-pointer"
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-1.5 border-b border-[#1E202B] bg-[#13141D] px-3 py-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenLookup?.();
              }}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2D3D] bg-[#1A1C27] px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:border-[#E3062F] hover:text-[#E3062F] transition shrink-0 cursor-pointer font-['Rajdhani']"
            >
              <Clock size={12} className="text-[#E3062F]" />
              <span>Track Order</span>
            </button>
            <a
              href={cleanTelegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2D3D] bg-[#1A1C27] px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:border-[#229ED9] hover:text-[#229ED9] transition shrink-0 no-underline font-['Rajdhani']"
            >
              <TelegramIcon size={12} className="text-[#229ED9]" />
              <span>Telegram Admin ({cleanTelegramUsername})</span>
            </a>
            <button
              type="button"
              onClick={() => handleSendMessage('How does Bakong KHQR payment work?')}
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2D3D] bg-[#1A1C27] px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:border-amber-400 hover:text-amber-400 transition shrink-0 cursor-pointer font-['Rajdhani']"
            >
              <Zap size={11} className="text-amber-400" />
              <span>Payment Help</span>
            </button>
          </div>

          {/* Message History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-['Kantumruy_Pro']">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className={`flex gap-2 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.sender === 'support' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2AABEE] to-[#229ED9] text-white shadow-sm mt-0.5">
                      <TelegramIcon size={14} className="translate-x-[-0.5px] translate-y-[0.5px]" />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${msg.sender === 'user'
                        ? 'bg-[#E3062F] text-white rounded-br-xs'
                        : 'bg-[#181A23] text-slate-200 border border-[#252837] rounded-bl-xs'
                      }`}
                  >
                    {msg.text}
                  </div>
                </div>
                <span className="mt-1 text-[10px] text-slate-400 px-1 font-mono">
                  {msg.time}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#181A23] border border-[#252837]">
                  <TelegramIcon size={12} className="text-[#229ED9]" />
                </div>
                <span className="flex items-center gap-1 font-['Rajdhani'] text-[11px]">
                  <span>Support is replying</span>
                  <span className="flex gap-0.5">
                    <span className="h-1 w-1 rounded-full bg-[#229ED9] animate-bounce" />
                    <span className="h-1 w-1 rounded-full bg-[#229ED9] animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1 w-1 rounded-full bg-[#229ED9] animate-bounce [animation-delay:0.4s]" />
                  </span>
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Footer */}
          <div className="border-t border-[#1F212D] bg-[#12131A] p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask a question or tap Telegram..."
                className="h-10 flex-1 rounded-xl border border-[#2B2E3E] bg-[#0E0F15] px-3.5 text-xs text-white placeholder-slate-500 outline-none transition focus:border-[#229ED9] focus:ring-1 focus:ring-[#229ED9]"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#2AABEE] to-[#229ED9] text-white shadow-md transition hover:opacity-90 active:scale-95 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
