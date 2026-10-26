"use client";

import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { CartifyProduct } from "@/lib/cartify-products";
import { formatPrice } from "./format";

export function CartDrawer({ open, onClose, products, cart, onChange }: {
  open: boolean;
  onClose: () => void;
  products: CartifyProduct[];
  cart: Record<string, number>;
  onChange: (id: string, delta: number) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const items = products.filter((product) => cart[product.id]);
  const total = items.reduce((sum, product) => sum + product.price * cart[product.id], 0);
  useEffect(() => {
    const dialog = ref.current;
    if (open) dialog?.showModal();
    else dialog?.close();
  }, [open]);
  return (
    <dialog ref={ref} className="cartify-drawer" aria-labelledby="cart-title" onCancel={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="cartify-drawer__body">
        <div className="cartify-drawer__heading"><h2 id="cart-title">Your cart</h2>
          <button onClick={onClose} aria-label="Close cart" title="Close cart"><X size={22} /></button></div>
        {items.length === 0 ? <div className="cartify-empty"><ShoppingBag size={40} /><h3>Your cart is empty</h3><button onClick={onClose}>Continue shopping</button></div> : (
          <>
            <div className="cartify-cart-items">{items.map((product) => (
              <div className="cartify-cart-item" key={product.id}>
                <img src={product.image} alt={product.title} width={76} height={76} />
                <div><h3>{product.title}</h3><strong>{formatPrice(product.price, product.currency)}</strong>
                  <div className="cartify-quantity"><button aria-label={`Remove one ${product.title}`} onClick={() => onChange(product.id, -1)}><Minus size={15} /></button>
                    <span>{cart[product.id]}</span><button aria-label={`Add one ${product.title}`} onClick={() => onChange(product.id, 1)}><Plus size={15} /></button></div>
                </div>
              </div>
            ))}</div>
            <div className="cartify-cart-total"><span>Subtotal</span><strong>{formatPrice(total)}</strong></div>
            <button className="cartify-continue" onClick={onClose}>Continue shopping</button>
          </>
        )}
      </div>
    </dialog>
  );
}
