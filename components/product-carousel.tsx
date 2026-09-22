"use client";

import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { Product, effectivePrice } from "@/app/catalog";
import { productImage } from '@/lib/product-image';

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

const resolveImage = (p: Product) => productImage(p.image);

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
    <section className="product-carousel-section wrap my-8">
      {title && (
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-600">
                <Flame size={16} className="fill-orange-500" />
              </span>
              <span>{title}</span>
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {viewAllHref && (
            <a
              href={viewAllHref}
              className="text-xs md:text-sm font-bold text-[#203664] hover:underline flex items-center gap-1"
            >
              <span>View all</span>
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
            className="carousel-nav-btn carousel-nav-prev absolute -left-3 md:-left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white hover:bg-slate-50 text-slate-800 shadow-[0_4px_14px_rgba(0,0,0,0.16)] border border-slate-200 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
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
            className="carousel-nav-btn carousel-nav-next absolute -right-3 md:-right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white hover:bg-slate-50 text-slate-800 shadow-[0_4px_14px_rgba(0,0,0,0.16)] border border-slate-200 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>
        )}

        {/* Scrollable Track */}
        <div
          ref={scrollRef}
          className="product-carousel-track flex gap-4 overflow-x-auto scroll-smooth py-2 px-1 scrollbar-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {products.map((item) => {
            const priceNow = effectivePrice(item);
            const oldPrice = item.old || Math.round(priceNow * 1.35);
            const hasDiscount = oldPrice > priceNow;
            const discountPercent = hasDiscount
              ? Math.round((1 - priceNow / oldPrice) * 100)
              : 0;
            const soldText = item.soldCount || "1k+ sold";

            return (
              <div
                key={item.id}
                className="product-carousel-card flex-[0_0_calc(50%-8px)] sm:flex-[0_0_calc(33.333%-11px)] md:flex-[0_0_calc(25%-12px)] lg:flex-[0_0_calc(20%-13px)] min-w-[165px] md:min-w-[210px] bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-3 flex flex-col group hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => (location.href = `/product/${item.id}`)}
              >
                {/* Photo Box */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center p-2 mb-2.5">
                  <img
                    src={resolveImage(item)}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Discount Badge */}
                  {hasDiscount && (
                    <span className="absolute top-2 left-2 bg-orange-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                      -{discountPercent}%
                    </span>
                  )}
                </div>

                {/* Eyebrow */}
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block line-clamp-1 mb-0.5">
                  {item.category}
                </span>

                {/* Product Title */}
                <a
                  href={`/product/${item.id}`}
                  title={item.name}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[13px] md:text-[14px] text-slate-900 font-semibold leading-snug line-clamp-2 min-h-[36px] hover:text-[#203664] transition-colors"
                >
                  {item.name}
                </a>

                {/* Price & Meta row */}
                <div className="mt-auto pt-2 flex items-baseline flex-wrap gap-x-1.5 gap-y-1">
                  <span className="font-bold text-[#203664] text-[15px] md:text-[16px] whitespace-nowrap">
                    Rs {priceNow.toLocaleString("en-PK")}
                  </span>

                  {hasDiscount && (
                    <del className="text-slate-400 text-[11px] line-through whitespace-nowrap">
                      Rs {oldPrice.toLocaleString("en-PK")}
                    </del>
                  )}

                  <span className="text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 whitespace-nowrap ml-auto">
                    <Flame size={11} className="text-orange-500 fill-orange-500 flex-shrink-0" />
                    {soldText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
