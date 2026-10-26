/* eslint-disable @next/next/no-img-element -- Inline original SVG demo artwork. */
import { useState } from 'react';
import { Heart, ArrowRight, Check, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { money } from '../data/products';
export default function QuickViewModal({product, favorite, onFavorite, onAdd}) {
  const [quantity, setQuantity] = useState(1);
  const discount = product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
  const maxQuantity = Math.max(1, Math.min(99, product.stock || 1));
  const image = product.images?.[0] || product.image;
  const sold = product.sold ? `${product.sold.replace(/\s*sold\s*$/i, '')}+ sold` : 'New arrival';

  return <div className="market-quick-content">
    <div className="market-quick-gallery">
      <div className="market-quick-image">
        <img src={image} alt={product.name} width="500" height="500"/>
        <button type="button" aria-label="Previous product image" disabled><ChevronLeft size={22}/></button>
        <button type="button" aria-label="Next product image" disabled><ChevronRight size={22}/></button>
      </div>
      <div className="market-quick-thumbnails" aria-label="Product images">
        <button type="button" className="is-selected" aria-label="Product image 1" aria-current="true">
          <img src={image} alt="" width="64" height="64"/>
        </button>
      </div>
    </div>
    <div className="market-quick-details">
      <h2 id="market-modal-title">{product.name}</h2>
      <div className="market-quick-brand"><ShieldCheck size={14}/> YOUR BRAND · Quality assurance</div>
      <div className="market-quick-sold">{sold}</div>
      <div className="market-quick-price">
        <del>{money(product.originalPrice)}</del>
        <strong>{money(product.price)}</strong>
        {discount > 0 && <span>{discount}% OFF</span>}
      </div>
      {(product.color || product.category) && <p className="market-quick-model"><strong>{product.color ? 'Color:' : 'Category:'}</strong> {product.color || product.category}</p>}
      <div className="market-quick-service"><strong><Check size={15}/> Service</strong><span>SHIPPING AT CHECKOUT</span></div>
      <label className="market-quick-quantity" htmlFor="quick-quantity">Qty
        <select id="quick-quantity" value={quantity} onChange={event => setQuantity(Number(event.target.value))}>
          {Array.from({ length: maxQuantity }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
        </select>
      </label>
      <button className="market-quick-add" type="button" onClick={() => onAdd(product, quantity)}>
        {discount > 0 && <strong>-{discount}% now! </strong>}Add to cart
      </button>
      <a className="market-quick-all-details" href={`/product/${encodeURIComponent(product.id)}`}>All details <ArrowRight size={15}/></a>
      <button className="market-save" onClick={() => onFavorite(product.id)} aria-pressed={favorite}><Heart size={16} fill={favorite ? 'currentColor' : 'none'}/>{favorite ? 'Saved to favorites' : 'Save to favorites'}</button>
    </div>
  </div>;
}
