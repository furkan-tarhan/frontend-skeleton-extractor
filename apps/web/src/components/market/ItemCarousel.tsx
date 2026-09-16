import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import type { Listing } from '@/types/listing';
import { ItemCard } from './ItemCard';

import 'swiper/css';
import 'swiper/css/navigation';

export interface ItemCarouselProps {
  title: string;
  listings: Listing[];
}

export function ItemCarousel({ title, listings }: ItemCarouselProps) {
  if (listings.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-primary">{title}</h2>
      <Swiper
        modules={[Navigation]}
        spaceBetween={16}
        slidesPerView="auto"
        navigation
        className="item-carousel !pb-2"
      >
        {listings.map((listing) => (
          <SwiperSlide key={listing._id} className="!w-[220px]">
            <ItemCard listing={listing} />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
