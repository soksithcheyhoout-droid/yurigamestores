import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenisInstance = null;

export function getLenis() {
  return lenisInstance;
}

export function scrollToTarget(target, options = {}) {
  if (lenisInstance) {
    lenisInstance.scrollTo(target, {
      duration: options.duration || 1.2,
      easing: options.easing || ((t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))),
      offset: options.offset || 0,
      immediate: options.immediate || false,
    });
  } else {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

export function pauseLenis() {
  if (lenisInstance) lenisInstance.stop();
  document.body.style.overflow = 'hidden';
}

export function resumeLenis() {
  if (lenisInstance) lenisInstance.start();
  document.body.style.overflow = '';
}

export function useLenisSmoothScroll() {
  useEffect(() => {
    // Check if the user is on a touch device (phones/tablets).
    // Native touch scrolling provides silky 120Hz/60Hz hardware acceleration.
    const isTouchDevice = typeof window !== 'undefined' && (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches
    );

    // Initialize Lenis with optimized inertia for desktop wheel,
    // leaving touch devices to native hardware momentum scroll.
    const lenis = new Lenis({
      duration: 0.85,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: !isTouchDevice,
      syncTouch: false,
      touchMultiplier: 1.0,
      infinite: false,
      prevent: (node) => {
        return Boolean(
          node?.hasAttribute?.('data-lenis-prevent') ||
          node?.closest?.('[data-lenis-prevent], [role="dialog"], .overflow-y-auto, [data-modal-scroll]')
        );
      }
    });

    lenisInstance = lenis;

    // Synchronize Lenis with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    const tickerCallback = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(500, 33);

    return () => {
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);
}
