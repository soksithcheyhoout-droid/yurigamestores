import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ShieldCheck, Zap } from 'lucide-react';
import { fetchSoraGameWithPackages } from '../data/soraStore';
import YuriGameLogo from './YuriGameLogo';

const AUTO_PLAY_MS = 6500;
const HERO_CACHE_KEY = 'yurigame_hero_slides_v2';

function getCachedSlides() {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(HERO_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  return null;
}

const PROMO_SLIDES = [
  {
    id: 'roblox-live',
    image: '/assets/games/current_roblox.jpg',
    fallbackImage: '/assets/games/current_roblox.jpg',
    title: 'Roblox Robux fast delivery with official username verification',
    actionLabel: 'Open Roblox Robux packages',
    providerCode: 'robuxsend',
    position: 'center',
  },
  {
    id: 'mlbb-anniversary',
    image: '/assets/banners/banner_mlbb.jpg',
    title: 'Mobile Legends KH direct diamonds top-up with fast 5-second sync',
    actionLabel: 'Open Mobile Legends KH packages',
    providerCode: 'ml',
    position: 'center',
  },
  {
    id: 'free-fire-diamonds',
    image: '/assets/banners/banner_freefire.jpg',
    title: 'Free Fire diamonds official top-up with instant UID verification',
    actionLabel: 'Open Free Fire packages',
    providerCode: 'ff',
    position: 'center',
  },
  {
    id: 'ros-legacy-live',
    image: '/assets/games/current_ros-legacy.jpg',
    fallbackImage: '/assets/games/current_ros-legacy.jpg',
    title: 'RoS Legacy direct top-up with dedicated admin fulfillment',
    actionLabel: 'Open RoS Legacy packages',
    providerCode: 'roslegacy',
    position: 'center',
  },
];

function wrapIndex(index) {
  return (index + PROMO_SLIDES.length) % PROMO_SLIDES.length;
}

export default function Hero({ onSelectGame }) {
  const [slides, setSlides] = useState(() => getCachedSlides() || PROMO_SLIDES);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isOpeningSlide, setIsOpeningSlide] = useState(false);
  const touchStartX = useRef(null);
  const didSwipe = useRef(false);

  useEffect(() => {
    fetch('/api/site-config', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.banners) && d.banners.length > 0) {
          const mapped = d.banners.map(b => {
            const bannerImg = (b.image && String(b.image).trim())
              ? b.image
              : (b.gameSlug === 'mobile-legends' ? '/assets/banners/banner_mlbb.jpg' : b.gameSlug === 'free-fire' ? '/assets/banners/banner_freefire.jpg' : '/assets/games/current_roblox.jpg');
            return {
              id: b.id,
              image: bannerImg,
              fallbackImage: bannerImg,
              title: b.title,
              actionLabel: b.actionLabel || 'Shop now',
              providerCode: b.gameSlug === 'roblox' ? 'robuxsend' : b.gameSlug === 'mobile-legends' ? 'ml' : b.gameSlug === 'free-fire' ? 'ff' : 'roslegacy',
              position: 'center'
            };
          });

          // Avoid remounting identical slides on refresh to keep render 100% glitch-free
          setSlides(current => {
            const isSame = current.length === mapped.length && current.every((s, i) => s.id === mapped[i]?.id && s.image === mapped[i]?.image);
            return isSame ? current : mapped;
          });

          try {
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(HERO_CACHE_KEY, JSON.stringify(mapped));
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const wrapIndex = (index) => {
    return (index + slides.length) % slides.length;
  };

  const activeSlide = slides[activeIndex] || slides[0] || PROMO_SLIDES[0];

  const moveBy = (amount) => {
    setDirection(amount > 0 ? 1 : -1);
    setActiveIndex((current) => wrapIndex(current + amount));
  };

  const moveTo = (index) => {
    if (index === activeIndex) return;

    const forwardDistance = wrapIndex(index - activeIndex);
    const backwardDistance = wrapIndex(activeIndex - index);
    setDirection(forwardDistance <= backwardDistance ? 1 : -1);
    setActiveIndex(wrapIndex(index));
  };

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (isPaused || reducedMotion || slides.length < 2) return undefined;

    const timer = window.setTimeout(() => moveBy(1), AUTO_PLAY_MS);
    return () => window.clearTimeout(timer);
  }, [activeIndex, isPaused, slides.length]);

  const handleTouchStart = (event) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
    didSwipe.current = false;
    setIsPaused(true);
  };

  const handleTouchEnd = (event) => {
    const endX = event.changedTouches[0]?.clientX;
    if (touchStartX.current !== null && typeof endX === 'number') {
      const distance = endX - touchStartX.current;
      if (Math.abs(distance) > 42) {
        didSwipe.current = true;
        moveBy(distance < 0 ? 1 : -1);
      }
    }
    touchStartX.current = null;
    setIsPaused(false);
  };

  const browseCatalog = () => {
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activateSlide = async () => {
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }

    if (activeSlide.providerCode) {
      if (isOpeningSlide) return;
      setIsOpeningSlide(true);
      try {
        const game = await fetchSoraGameWithPackages(activeSlide.providerCode);
        onSelectGame?.(game);
      } catch {
        browseCatalog();
      } finally {
        setIsOpeningSlide(false);
      }
      return;
    }

    browseCatalog();
  };

  return (
    <section className="topbar-promo-section" aria-label="Current promotions">
      <div className="seagm-container">
        <div
          className="topbar-promo-carousel"
          role="region"
          aria-roledescription="carousel"
          aria-label="Featured top-up offers"
          aria-describedby="promo-carousel-instructions"
          data-paused={isPaused ? 'true' : 'false'}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              moveBy(-1);
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              moveBy(1);
            }
          }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <p id="promo-carousel-instructions" className="sr-only">
            Use the previous and next buttons, arrow keys, or swipe to change promotions.
          </p>

          <div className="topbar-promo-brandbar">
            <div className="topbar-promo-brand-lockup">
              <YuriGameLogo size="xs" showBadge={false} inverse />
              <span className="topbar-promo-brand-divider" aria-hidden="true" />
              <span className="topbar-promo-brand-label">Official offers</span>
            </div>

            <div className="topbar-promo-assurance" aria-label="Secure and instant top-ups">
              <span><ShieldCheck size={13} /> Secure checkout</span>
              <span><Zap size={13} /> Instant delivery</span>
            </div>
          </div>

          <div className="topbar-promo-stage">
            <article
              className="topbar-promo-card"
              aria-roledescription="slide"
              aria-label={`${activeIndex + 1} of ${slides.length}: ${activeSlide.title}`}
            >
              <div
                key={activeSlide.id}
                className="topbar-promo-media"
                data-direction={direction ? (direction > 0 ? 'next' : 'previous') : undefined}
              >
                {activeSlide.kind === 'brand' ? (
                  <div className="yurigame-brand-slide">
                    <div className="yurigame-brand-slide-copy">
                      <span className="yurigame-brand-slide-kicker">Members exclusive</span>
                      <strong>Win $500<br /><em>store credit</em></strong>
                      <span className="yurigame-brand-slide-note">Instant automated top-ups 24/7</span>
                      <span className="yurigame-brand-slide-cta">View rewards</span>
                    </div>
                    <div className="yurigame-brand-slide-logo">
                      <img src="/assets/brand/yurigame-logo.webp" alt="" draggable="false" />
                    </div>
                  </div>
                ) : (
                  <>
                    <img
                      src={activeSlide.image}
                      alt=""
                      aria-hidden="true"
                      className="topbar-promo-backdrop"
                      draggable="false"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = activeSlide.fallbackImage || '/assets/games/mlbb_hero_4k.jpg';
                      }}
                    />
                    <div className="topbar-promo-image-frame">
                      <img
                        src={activeSlide.image}
                        alt={activeSlide.title}
                        className="topbar-promo-image"
                        style={{ objectPosition: activeSlide.position }}
                        loading={activeIndex === 0 ? 'eager' : 'lazy'}
                        fetchPriority={activeIndex === 0 ? 'high' : 'auto'}
                        draggable="false"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = activeSlide.fallbackImage || '/assets/games/mlbb_hero_4k.jpg';
                        }}
                      />
                    </div>
                  </>
                )}
                <span className="topbar-promo-image-finish" aria-hidden="true" />
              </div>

              {activeSlide.kind !== 'brand' && (
                <span className="topbar-promo-watermark" aria-hidden="true">
                  <YuriGameLogo size="xs" showBadge={false} inverse />
                </span>
              )}

              {isOpeningSlide && (
                <span className="topbar-promo-loading" aria-live="polite">
                  Loading live packages…
                </span>
              )}

              <span className="topbar-promo-brand-corner" aria-hidden="true">
                <span />
                <span />
              </span>

              <button
                type="button"
                className="topbar-promo-hit-area"
                onClick={activateSlide}
                disabled={isOpeningSlide}
                aria-busy={isOpeningSlide}
                aria-label={activeSlide.actionLabel}
              />
            </article>

            <button
              type="button"
              onClick={() => moveBy(-1)}
              className="topbar-promo-arrow topbar-promo-arrow-left"
              aria-label="Previous promotion"
            >
              <ChevronLeft size={19} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => moveBy(1)}
              className="topbar-promo-arrow topbar-promo-arrow-right"
              aria-label="Next promotion"
            >
              <ChevronRight size={19} strokeWidth={2.5} />
            </button>
          </div>

          <div className="topbar-promo-navigation">
            <div className="topbar-promo-caption">
              <span>Featured promotion</span>
              <strong>{activeSlide.title}</strong>
            </div>
            <div className="topbar-promo-dots" role="group" aria-label="Choose a promotion">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => moveTo(index)}
                  className="topbar-promo-dot"
                  data-active={index === activeIndex ? 'true' : 'false'}
                  aria-label={`Show promotion ${index + 1}: ${slide.title}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                >
                  <span aria-hidden="true" />
                </button>
              ))}
            </div>
            <span className="topbar-promo-count" aria-live="polite">
              {String(activeIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
