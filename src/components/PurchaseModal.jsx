/* eslint-disable @next/next/no-img-element -- Catalog images use the existing store image URLs. */
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Minus, Plus, ShieldCheck } from 'lucide-react';
import { money } from '../data/products';

export default function PurchaseModal({ product, onClose, checkoutUrl }) {
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState(0);
  const title = useRef(null);
  const option = product.checkoutOptions[selected];
  const total = product.price * quantity;
  useEffect(() => { title.current?.focus(); }, []);

  function checkout() {
    const url = new URL(checkoutUrl, window.location.href);
    url.searchParams.set('buy', product.id);
    url.searchParams.set('qty', String(quantity));
    url.searchParams.set('size', option.size);
    if (option.color) url.searchParams.set('color', option.color);
    if (option.variantId) url.searchParams.set('variantId', option.variantId);
    window.location.assign(url.href);
  }

  return <div className="market-purchase">
    <span className="market-eyebrow">A QUICK LOOK BEFORE YOU BUY</span>
    <h2 id="market-modal-title" ref={title} tabIndex={-1}>Review your purchase</h2>
    <p className="market-purchase-intro">Choose your quantity, then continue to delivery details.</p>
    <div className="market-purchase-product">
      <img src={product.image} alt={product.name} width="100" height="100" />
      <div><span className="market-product-category">{product.category}</span><h3>{product.name}</h3><div className="market-price"><strong>{money(product.price)}</strong><del>{money(product.originalPrice)}</del></div></div>
    </div>
    <label className="market-purchase-option" htmlFor="purchase-option">Size / option
      <select id="purchase-option" value={selected} onChange={event => { const index = Number(event.target.value); setSelected(index); setQuantity(value => Math.min(value, product.checkoutOptions[index].stock)); }}>
        {product.checkoutOptions.map((item, index) => <option key={index} value={index}>{item.size}{item.color ? ` · ${item.color}` : ''}</option>)}
      </select>
    </label>
    <div className="market-purchase-quantity">
      <div><strong>Quantity</strong><small>{option.stock} available</small></div>
      <div className="market-cart-quantity">
        <button aria-label="Decrease purchase quantity" disabled={quantity === 1} onClick={() => setQuantity(value => value - 1)}><Minus size={16} /></button>
        <output aria-label="Purchase quantity" aria-live="polite">{quantity}</output>
        <button aria-label="Increase purchase quantity" disabled={quantity >= option.stock} onClick={() => setQuantity(value => value + 1)}><Plus size={16} /></button>
      </div>
    </div>
    <div className="market-purchase-total"><span>Product subtotal</span><strong>{money(total)}</strong></div>
    <p className="market-purchase-demo">Delivery charges are shown at checkout. Pay with Cash on Delivery.</p>
    <button className="market-primary" onClick={checkout}>Continue to checkout <ArrowRight size={18} /></button>
    <button className="market-purchase-back" onClick={onClose}>Keep browsing</button>
    <small className="market-quick-guarantee"><ShieldCheck size={16} /> Delivery across Pakistan · Cash on Delivery</small>
  </div>;
}
