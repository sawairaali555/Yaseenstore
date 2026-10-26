"use client";

import { ChevronRight, Star } from "lucide-react";
import { useEffect, useState } from "react";
import type { CartifyProduct } from "@/lib/cartify-products";
import { formatPrice } from "./format";
import { ProductImage } from "./ProductImage";

type Deal = CartifyProduct & { dealEndsIn: number };

function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [initialSeconds]);

  const hours = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${secs}`;
}

function DealCard({ deal, showRating }: { deal: Deal; showRating?: boolean }) {
  const countdown = useCountdown(deal.dealEndsIn);
  return (
    <article className="cartify-deal-card">
      <div className="cartify-deal-card__image">
        <ProductImage src={deal.image} alt={deal.title} />
        {deal.isAd && <span className="cartify-ad">AD</span>}
        <b>Only {deal.stockLeft} left</b>
      </div>
      <p>{deal.title}</p>
      <div className="cartify-deal-card__price">
        <strong>{formatPrice(deal.price, deal.currency)}</strong>
        <del>{formatPrice(deal.originalPrice, deal.currency)}</del>
      </div>
      {showRating ? (
        <div className="cartify-deal-rating" aria-label={`${deal.rating} stars`}>
          <Star size={12} fill="currentColor" /> {deal.rating} <span>{deal.reviewCount}</span>
        </div>
      ) : (
        <div className="cartify-countdown">
          <div className="cartify-progress"><span style={{ width: `${35 + ((deal.reviewCount % 55) + 10)}%` }} /></div>
          <time>{countdown}</time>
        </div>
      )}
    </article>
  );
}

export function DealsRow({ deals }: { deals: Deal[] }) {
  const lightning = deals.slice(0, 6);
  const clearance = deals.slice(6, 12);

  return (
    <section className="cartify-shell cartify-deals" aria-label="Flash sale deals">
      <div className="cartify-deals__group">
        <h2>⚡ LIGHTNING DEALS <a href="#products">Limited-time offers <ChevronRight size={14} /></a></h2>
        <div className="cartify-deals__row">
          {lightning.map((deal) => <DealCard key={deal.id} deal={deal} />)}
        </div>
      </div>
      <div className="cartify-deals__group">
        <h2 className="is-red">🔻 CLEARANCE DEALS <a href="#products">Limited stock <ChevronRight size={14} /></a></h2>
        <div className="cartify-deals__row">
          {clearance.map((deal) => <DealCard key={deal.id} deal={deal} showRating />)}
        </div>
      </div>
    </section>
  );
}
