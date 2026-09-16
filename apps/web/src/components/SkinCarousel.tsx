import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Navigation, Pagination } from 'swiper/modules';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export interface CarouselSkin {
  id: string;
  name: string;
  price: string;
  image: string;
}

const PLACEHOLDER_SKINS: CarouselSkin[] = [
  { id: '1', name: 'AK-47 | Redline', price: '$42.18', image: 'https://placehold.co/400x300?text=AK-47+Redline' },
  { id: '2', name: 'AWP | Asiimov', price: '$118.50', image: 'https://placehold.co/400x300?text=AWP+Asiimov' },
  { id: '3', name: 'Karambit | Doppler', price: '$612.99', image: 'https://placehold.co/400x300?text=Karambit+Doppler' },
  { id: '4', name: 'M4A4 | Neo-Noir', price: '$27.30', image: 'https://placehold.co/400x300?text=M4A4+Neo-Noir' },
  { id: '5', name: 'Desert Eagle | Blaze', price: '$305.40', image: 'https://placehold.co/400x300?text=Desert+Eagle+Blaze' },
  { id: '6', name: 'Glock-18 | Fade', price: '$220.00', image: 'https://placehold.co/400x300?text=Glock-18+Fade' },
];

export interface SkinCarouselProps {
  title?: React.ReactNode;
  skins?: CarouselSkin[];
}

export function SkinCarousel({ title = 'Öne çıkan skinler', skins = PLACEHOLDER_SKINS }: SkinCarouselProps) {
  const [activeId, setActiveId] = useState(skins[0]?.id);

  return (
    <section className="w-full bg-canvas py-10">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-6 text-2xl font-bold text-primary">{title}</h2>

        <Swiper
          modules={[EffectCoverflow, Navigation, Pagination]}
          effect="coverflow"
          grabCursor
          centeredSlides
          slidesPerView="auto"
          loop
          coverflowEffect={{
            rotate: 35,
            stretch: 0,
            depth: 120,
            modifier: 1,
            slideShadows: false,
          }}
          navigation
          pagination={{ clickable: true }}
          onSlideChange={(swiper) => {
            const active = skins[swiper.realIndex % skins.length];
            setActiveId(active.id);
          }}
          className="skin-carousel !pb-12"
        >
          {skins.map((skin) => (
            <SwiperSlide key={skin.id} className="!w-[260px]">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={cn(
                  'rounded-md border bg-surface p-4 transition-colors',
                  skin.id === activeId ? 'border-accent' : 'border-subtle'
                )}
              >
                <img
                  src={skin.image}
                  alt={skin.name}
                  className="mb-3 h-[150px] w-full rounded-sm object-cover"
                />
                <p className="truncate text-sm font-medium text-primary">{skin.name}</p>
                <p className="text-sm font-medium text-accent">{skin.price}</p>
              </motion.div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
