import React from 'react';

const SIZE_STYLES = {
  xs: {
    mark: 'h-7 w-7 rounded-lg',
    word: 'text-[13px]',
    store: 'text-[6px]',
    gap: 'gap-1.5',
  },
  sm: {
    mark: 'h-9 w-9 rounded-xl',
    word: 'text-[16px] sm:text-[17px]',
    store: 'text-[6.5px]',
    gap: 'gap-2',
  },
  md: {
    mark: 'h-11 w-11 rounded-xl',
    word: 'text-[20px]',
    store: 'text-[7px]',
    gap: 'gap-2.5',
  },
  lg: {
    mark: 'h-14 w-14 rounded-2xl',
    word: 'text-[25px]',
    store: 'text-[8px]',
    gap: 'gap-3',
  },
};

export default function YuriGameLogo({
  className = '',
  showBadge = true,
  size = 'md',
  inverse = false,
}) {
  const styles = SIZE_STYLES[size] || SIZE_STYLES.md;

  return (
    <span
      className={`inline-flex min-w-0 items-center ${styles.gap} ${className}`}
      aria-label="YuriGame Store"
    >
      <span
        className={`${styles.mark} relative shrink-0 overflow-hidden border border-[#e3062f]/25 bg-white shadow-[0_5px_16px_rgba(15,15,18,0.14)]`}
        aria-hidden="true"
      >
        <img
          src="/assets/brand/yurigame-mark.webp"
          alt=""
          className="h-full w-full object-cover"
          draggable="false"
        />
        <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#e3062f]" />
      </span>

      <span className="flex min-w-0 flex-col leading-none">
        <span className={`${styles.word} whitespace-nowrap font-black uppercase tracking-[-0.055em]`}>
          <span className={inverse ? 'text-white' : 'text-[#111217]'}>Yuri</span>
          <span className="text-[#e3062f]">Game</span>
          <span className={inverse ? 'text-white' : 'text-[#111217]'}>Store</span>
        </span>
      </span>
    </span>
  );
}
