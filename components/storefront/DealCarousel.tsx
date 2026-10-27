"use client";

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { effectivePrice, type Product } from '@/app/catalog';
import { productImage } from '@/lib/product-image';
import { getVariantAvailableStock } from '@/lib/inventory-engine';

export default function DealCarousel({ products, title, clearance = false }: { products: Product[]; title: string; clearance?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () => setEdges({ start: element.scrollLeft <= 1, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 1 });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener('scroll', update, { passive: true });
    return () => { observer.disconnect(); element.removeEventListener('scroll', update); };
  }, [products]);
  if (!products.length) return null;
  const move = (direction: number) => {
    const element = track.current;
    if (element) element.scrollBy({ left: direction * element.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  return <section className="deal-carousel" aria-label={title} aria-roledescription="carousel">
    <h2 className={clearance ? 'red' : undefined}><Flame size={18} /> {title}
      <small>{clearance ? 'Limited stock' : 'Limited-time offers'}</small>
      <span className="deal-carousel-controls">
        <button type="button" onClick={() => move(-1)} disabled={edges.start} aria-label={`Previous ${title.toLowerCase()}`}><ChevronLeft size={16} /></button>
        <button type="button" onClick={() => move(1)} disabled={edges.end} aria-label={`Next ${title.toLowerCase()}`}><ChevronRight size={16} /></button>
      </span>
    </h2>
    <div className="deal-carousel-track" ref={track} tabIndex={0} aria-label={`${title} products`}>
      {products.map(product => {
        const stock = getVariantAvailableStock(product, null);
        const price = effectivePrice(product);
        return <a href={'/product/' + encodeURIComponent(product.id)} className="temu-flash" key={product.id}>
        <img src={productImage(product.image)} alt={product.name} loading="lazy" />
        {stock > 0 && <span>{stock} in stock</span>}
        <strong>Rs.{price.toLocaleString('en-PK')}</strong>
        {product.old > price && <del>{product.old.toLocaleString('en-PK')}</del>}
      </a>;
      })}
    </div>
  </section>;
}
