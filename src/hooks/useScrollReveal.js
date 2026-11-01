import { useEffect } from 'react';

/**
 * useScrollReveal
 * Monitors .scroll-reveal and .scroll-card elements with IntersectionObserver
 * and adds the .revealed class when scrolled into view.
 */
export function useScrollReveal(dependencies = []) {
  useEffect(() => {
    const observerCallback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        } else if (entry.boundingClientRect.top > (window.innerHeight || document.documentElement.clientHeight)) {
          // Reset when scrolled back below viewport so scrolling down re-animates cards 1 by 1
          entry.target.classList.remove('revealed');
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: '0px 0px -30px 0px',
      threshold: 0.12
    });

    const selector = '.scroll-reveal, .scroll-card, .scroll-card-1by1';
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => observer.observe(el));

    // Secondary scan for dynamically rendered items
    const timeout = setTimeout(() => {
      const extraElements = document.querySelectorAll('.scroll-reveal, .scroll-card, .scroll-card-1by1');
      extraElements.forEach(el => observer.observe(el));
    }, 400);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, dependencies);
}
