"use client";

import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { Product, effectivePrice } from "@/app/catalog";

interface ProductCarouselProps {
  products: Product[];
  title?: string;
  subtitle?: string;
  viewAllHref?: string;
  saved?: string[];
  onFavorite?: (id: string) => void;
  onAdd?: (p: Product) => void;
  availableProduct?: (p: Product) => Product | undefined;
}

const resolveImage = (p: Product) =>
  /^https?:\/\//.test(p.image) ? p.image : `/images/${p.image}.jpg`;

export default function ProductCarousel({
  products,
  title = "Trending Hot Deals",
  subtitle = "Popular finds with verified customer ratings",
  viewAllHref = "/products",
}: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [products]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollAmount = container.clientWidth * 0.75;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="product-carousel-section wrap">
      {title && (
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-[19px] md:text-[22px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600">
                <Flame size={15} className="fill-orange-500" />
              </span>
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs md:text-sm text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {viewAllHref && (
            <a
              href={viewAllHref}
              className="text-xs md:text-sm font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 hover:underline"
            >
              View all
              <ChevronRight size={15} />
            </a>
          )}
        </div>
      )}

      <div className="relative group/carousel">
        {/* Left Arrow Button */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Previous products"
            className="carousel-nav-btn carousel-nav-prev absolute -left-3 md:-left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/95 hover:bg-white text-gray-800 shadow-[0_4px_14px_rgba(0,0,0,0.16)] border border-gray-200/90 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
        )}

        {/* Right Arrow Button */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Next products"
            className="carousel-nav-btn carousel-nav-next absolute -right-3 md:-right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/95 hover:bg-white text-gray-800 shadow-[0_4px_14px_rgba(0,0,0,0.16)] border border-gray-200/90 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>
        )}

        {/* Scrollable Track */}
        <div
          ref={scrollRef}
          className="product-carousel-track flex gap-3 md:gap-3.5 overflow-x-auto scroll-smooth py-2 px-1 scrollbar-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {products.map((item) => {
            const priceNow = effectivePrice(item);
            const oldPrice = item.old || Math.round(priceNow * 1.35);
            const hasDiscount = oldPrice > priceNow;
            const discountPercent = hasDiscount
              ? Math.round((1 - priceNow / oldPrice) * 100)
              : 0;
            const soldText = item.soldCount || "1k+sold";

            return (
              <div
                key={item.id}
                className="product-carousel-card flex-[0_0_calc(50%-6px)] sm:flex-[0_0_calc(33.333%-9px)] md:flex-[0_0_calc(25%-11px)] lg:flex-[0_0_calc(20%-12px)] min-w-[160px] md:min-w-[200px] flex flex-col group cursor-pointer"
              >
                <a
                  href={`/product/${item.id}`}
                  className="block relative aspect-square w-full rounded-md overflow-hidden bg-[#f8f9fa] border border-gray-100/80"
                >
                  <img
                    src={resolveImage(item)}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  />
                </a>

                {/* Product Title */}
                <a
                  href={`/product/${item.id}`}
                  title={item.name}
                  className="mt-2 text-[13px] md:text-[14px] text-gray-800 font-normal leading-[1.35] line-clamp-2 min-h-[36px] hover:text-orange-600 transition-colors"
                >
                  {item.name}
                </a>

                {/* Price & Meta row */}
                <div className="mt-1 flex items-baseline flex-wrap gap-x-1.5 gap-y-1">
                  <span className="font-bold text-[#ea580c] text-[14px] md:text-[15px] whitespace-nowrap">
                    Rs {priceNow.toLocaleString("en-PK")}
                  </span>

                  {hasDiscount && (
                    <del className="text-gray-400 text-[12px] line-through whitespace-nowrap">
                      {oldPrice.toLocaleString("en-PK")}
                    </del>
                  )}

                  <span className="text-gray-600 text-[11px] font-medium flex items-center gap-0.5 whitespace-nowrap">
                    <Flame size={12} className="text-orange-500 fill-orange-500 flex-shrink-0" />
                    {soldText}
                  </span>

                  {hasDiscount && (
                    <span className="text-[#ea580c] border border-[#ea580c] bg-orange-50/70 text-[10px] md:text-[11px] font-bold px-1 py-[0.5px] rounded whitespace-nowrap ml-auto">
                      -{discountPercent}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
