/* eslint-disable @next/next/no-img-element -- Inline original SVG demo artwork. */
import { useEffect, useRef, useState } from 'react';
import { Heart, Eye, ArrowRight, ShoppingCart, Star, Check } from 'lucide-react';
import { money } from '../data/products';
import { productHref } from '../product-link';
export default function ProductCard({product, favorite, onFavorite, onQuickView, onAdd, onBuy}) {
  const [justAdded, setJustAdded] = useState(false);
  const addFeedbackTimer = useRef(null);
  const discount = Math.round((1-product.price/product.originalPrice)*100);
  useEffect(() => () => clearTimeout(addFeedbackTimer.current), []);
  const addToCart = () => {
    onAdd(product);
    setJustAdded(true);
    clearTimeout(addFeedbackTimer.current);
    addFeedbackTimer.current = setTimeout(() => setJustAdded(false), 900);
  };
  const href = productHref(product);
  return <article className="market-product group">
    <div className="market-product-image"><a className="market-product-photo-link" href={href} aria-label={`View details for ${product.name}`}><img src={product.image} alt={product.name} width="400" height="400" loading="lazy"/></a><span className="market-discount">−{discount}%</span><button className={`market-favorite ${favorite ? 'is-favorite' : ''}`} aria-label={`${favorite ? 'Unfavorite' : 'Favorite'} ${product.name}`} aria-pressed={favorite} onClick={() => onFavorite(product.id)}><Heart size={18} fill={favorite ? 'currentColor' : 'none'}/></button><button className="market-quick-view" onClick={() => onQuickView(product)} aria-label={`Quick view ${product.name}`}><Eye size={16}/> Quick view</button></div>
    <div className="market-product-body"><span className="market-product-category">{product.category}</span><h3><a href={href}>{product.name}</a></h3><div className="market-rating"><Star size={13} fill="currentColor"/><strong>{product.rating}</strong><span>({product.reviews})</span><small>{product.sold} sold</small></div><div className="market-price"><strong>{money(product.price)}</strong><del>{money(product.originalPrice)}</del></div><div className="market-product-actions"><button className={`market-add-cart${justAdded ? ' is-added' : ''}`} type="button" onClick={addToCart} aria-label={justAdded ? `${product.name} added to cart` : `Add ${product.name} to cart`} title={justAdded ? 'Added to cart' : 'Add to cart'}>{justAdded ? <Check className="market-add-cart-check" size={17}/> : <ShoppingCart className="market-add-cart-icon" size={17}/>}</button><button className="market-buy" onClick={() => onBuy(product)} aria-label={`Buy ${product.name} now`}>Buy it now <ArrowRight size={16}/></button></div></div>
  </article>;
}
