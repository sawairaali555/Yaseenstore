/* eslint-disable @next/next/no-img-element -- Inline original SVG demo artwork. */
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Zap, ArrowUpRight, Star } from 'lucide-react';
import { money } from '../data/products';
import { productHref } from '../product-link';
export default function DealSection({title, products, clearance = false}) {
  const row = useRef(null);
  const [remaining, setRemaining] = useState(2*3600+34*60+18);
  useEffect(() => { const timer = setInterval(() => setRemaining(value => Math.max(0,value-1)),1000); return () => clearInterval(timer); },[]);
  const time = [Math.floor(remaining/3600),Math.floor(remaining/60)%60,remaining%60].map(value => String(value).padStart(2,'0'));
  return <section className={`market-deals ${clearance ? 'is-clearance' : ''}`} aria-label={title}>
    <div className="market-section-heading"><div><h2>{clearance ? <span className="clearance-mark">%</span> : <Zap size={24} fill="currentColor"/>}{title}</h2><p>{clearance ? 'Last-chance finds. First-class prices.' : 'Small prices. Big discoveries.'}</p></div><div className="market-deal-tools">{!clearance && <div className="market-timer" aria-label={`Deals end in ${time.join(':')}`}><span>Ends in</span>{time.map((part,index) => <b key={index}>{part}</b>)}</div>}<button className="market-carousel-arrow" aria-label={`Scroll ${title} left`} onClick={() => row.current?.scrollBy({left:-460,behavior:'smooth'})}><ChevronLeft size={18}/></button><button className="market-carousel-arrow" aria-label={`Scroll ${title} right`} onClick={() => row.current?.scrollBy({left:460,behavior:'smooth'})}><ChevronRight size={18}/></button></div></div>
    <div className="market-deal-row" ref={row}>{products.map(product => <a className="market-deal" key={product.id} href={productHref(product)} aria-label={`View details for ${product.name}`}><div className="market-deal-image"><img src={product.image} alt={product.name} width="400" height="400" loading="lazy"/><b className="market-discount">−{Math.round((1-product.price/product.originalPrice)*100)}%</b><span className="market-stock">Only {product.stock} left</span></div><h3>{product.name}</h3><div className="market-price"><strong>{money(product.price)}</strong><del>{money(product.originalPrice)}</del></div><div className="market-deal-bottom"><span><Star size={12} fill="currentColor"/>{product.rating} <small>({product.reviews})</small></span><ArrowUpRight size={16}/></div>{!clearance && <div className="market-stock-track"><span style={{width:`${85-product.stock*3}%`}}/></div>}</a>)}</div>
  </section>;
}
