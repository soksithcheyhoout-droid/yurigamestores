import React from 'react';
import { Crown, Check, Send, Zap, Award } from 'lucide-react';
import { RESELLER_PLANS } from '../data/plans';

export default function ResellerPlans({ onSelectPlan }) {
  return (
    <section id="resellers" className="w-full py-12 bg-[#F4F4F6]">
      <div className="seagm-container">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E3062F] bg-[#FFF0F3] border border-[#F4B2C0] rounded-full px-3 py-1 mb-2">
            <Crown size={14} className="text-[#E3062F]" />
            <span>WHOLESALE & RESELLER ACCESS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight font-['Outfit']">
            Reseller & Wholesale Plans
          </h2>
          <p className="text-[13px] text-[#64748B] mt-1.5">
            Boost your gaming shop with direct API access, wholesale discounts up to 25%, and automated balance reloads
          </p>
        </div>

        {/* 3 Tier Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {RESELLER_PLANS.map((plan) => {
            const isFeatured = plan.popular;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 transition-all flex flex-col justify-between relative bg-white border ${
                  isFeatured
                    ? 'border-[#E3062F] ring-2 ring-[#E3062F]/30 shadow-md transform md:-translate-y-1'
                    : 'border-[#E5E7EB] hover:border-[#E3062F]/60 shadow-xs'
                }`}
              >
                {isFeatured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E3062F] text-white text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full shadow-xs">
                    MOST POPULAR
                  </span>
                )}

                <div>
                  <div className="text-center pb-5 border-b border-[#F1F5F9]">
                    <h3 className="text-lg font-bold text-[#0F172A] font-['Outfit']">
                      {plan.name}
                    </h3>
                    <div className="text-[12px] text-[#64748B] mt-0.5">
                      {plan.tagline}
                    </div>

                    <div className="mt-4 flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-black text-[#0F172A] font-mono">
                        ${plan.price}
                      </span>
                      <span className="text-[12px] text-[#94A3B8]">/{plan.period}</span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="py-5 space-y-2.5 list-none p-0 m-0">
                    {(plan.features || []).map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-[13px] text-[#475569]">
                        <Check size={16} className="text-[#E3062F] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <div className="pt-3 border-t border-[#F1F5F9]">
                  <button
                    type="button"
                    onClick={() => onSelectPlan && onSelectPlan(plan)}
                    className={`w-full py-2.5 text-xs font-bold rounded-lg border-0 cursor-pointer transition-all ${
                      isFeatured
                        ? 'seagm-btn-orange'
                        : 'seagm-btn-teal'
                    }`}
                  >
                    <span>{plan.cta || 'Get Started'}</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
