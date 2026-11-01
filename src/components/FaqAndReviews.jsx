import React, { useState } from 'react';
import { ChevronDown, MessageCircle, Send } from 'lucide-react';

const FAQS = [
  {
    q: 'How quickly will my top-up arrive?',
    a: 'Orders are processed automatically after payment confirmation. Most supported direct top-ups arrive within a few seconds, although publisher processing times can occasionally vary.',
  },
  {
    q: 'Do you need my game password?',
    a: 'No. We only request the public player information required by the publisher, such as your User ID and server or zone. Never share your account password.',
  },
  {
    q: 'How do I pay with Bakong KHQR?',
    a: 'Choose Bakong KHQR at checkout, then scan the generated QR code with a supported Cambodian banking app. Your order updates automatically when payment is confirmed.',
  },
  {
    q: 'What if I entered the wrong player ID?',
    a: 'Contact support as soon as possible with your order reference. Completed digital deliveries may not be reversible, so always check the player name and ID before paying.',
  },
  {
    q: 'Where can I check my order?',
    a: 'Use Track Order in the header and enter your order reference. You can view the latest payment and fulfilment status without creating an account.',
  },
];

export default function FaqAndReviews() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <section id="faq" className="scroll-mt-24 bg-[#F4F4F6] py-10 sm:py-14">
      <div className="seagm-container">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
          <div>
            <p className="m-0 text-[10px] font-bold uppercase tracking-[0.17em] text-[#bd0d2e]">Support</p>
            <h2 className="m-0 mt-2 max-w-sm text-[26px] font-extrabold leading-[1.1] tracking-[-0.035em] text-slate-950 sm:text-[32px]">Questions before you check out?</h2>
            <p className="m-0 mt-3 max-w-sm text-[12px] leading-relaxed text-slate-600">Read the essentials here, or talk to the support team if your question is specific to an order.</p>

            <div className="mt-6 border-l-2 border-[#bd0d2e] pl-4">
              <div className="flex items-center gap-2 text-[12px] font-bold text-slate-900">
                <MessageCircle size={16} className="text-[#bd0d2e]" /> Live order support
              </div>
              <p className="m-0 mt-1 text-[10px] leading-relaxed text-slate-500">Include your order reference so the team can help faster.</p>
              <a
                href="https://t.me/cheydev_support"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#a30a26] no-underline hover:underline"
              >
                Contact support on Telegram <Send size={13} />
              </a>
            </div>
          </div>

          <div className="border-t border-slate-300">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={faq.q} className="border-b border-slate-300">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    className="flex w-full items-center justify-between gap-4 border-0 bg-transparent py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-[12px] font-bold text-slate-900 sm:text-[13px]">{faq.q}</span>
                    <ChevronDown size={16} className={`shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && <p className="m-0 max-w-2xl pb-4 pr-8 text-[11px] leading-relaxed text-slate-600 sm:text-[12px]">{faq.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
