import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Autoplay } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/effect-coverflow';

const CARD_COUNT = 14;

/**
 * Ambient, non-interactive 3D coverflow that stays fixed behind every page.
 * Purely decorative — pointer-events are disabled and a scrim gradient keeps
 * foreground text readable regardless of what's scrolled behind it.
 */
export function CoverflowBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-canvas">
      <Swiper
        modules={[EffectCoverflow, Autoplay]}
        effect="coverflow"
        centeredSlides
        loop
        slidesPerView={5}
        speed={4000}
        autoplay={{ delay: 0, disableOnInteraction: false, pauseOnMouseEnter: false }}
        allowTouchMove={false}
        coverflowEffect={{ rotate: 32, stretch: 0, depth: 260, modifier: 1.4, slideShadows: false }}
        className="h-full w-full opacity-[0.14]"
      >
        {Array.from({ length: CARD_COUNT }).map((_, i) => (
          <SwiperSlide key={i} className="!h-[380px] !w-[280px]">
            <div
              className="h-full w-full animate-pulse-glow rounded-xl border border-subtle bg-gradient-to-br from-white/15 via-surface to-canvas"
              style={{ animationDelay: `${(i % 6) * 420}ms` }}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="absolute inset-0 bg-gradient-to-b from-canvas/50 via-canvas/75 to-canvas" />
    </div>
  );
}
