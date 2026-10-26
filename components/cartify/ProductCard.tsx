"use client";

import { Check, ShoppingCart, Star } from "lucide-react";
import type { CartifyProduct } from "@/lib/cartify-products";
import { formatPrice } from "./format";
import { ProductImage } from "./ProductImage";

type ProductCardProps = {
  product: CartifyProduct;
  onAdd: (product: CartifyProduct) => void;
  justAdded: boolean;
};

export function ProductCard({ product, onAdd, justAdded }: ProductCardProps) {
  return (
    <article className={`cartify-product ${justAdded ? "is-added" : ""}`}>
      <div className="cartify-product__image">
        <ProductImage src={product.image} alt={product.title} />
        {product.isAd && <span className="cartify-ad">AD</span>}
        {product.stockLeft && <b className="cartify-stock-pill">Only {product.stockLeft} left</b>}
      </div>
      <p className="cartify-product__title" title={product.title}>{product.title}</p>
      <div className="cartify-product__meta">
        <strong>{formatPrice(product.price, product.currency)}</strong>
        <del>{formatPrice(product.originalPrice, product.currency)}</del>
        <span>🔥 {product.soldCount}</span>
      </div>
      <div className="cartify-product__rating" aria-label={`${product.rating} out of 5 stars`}>
        <span>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={11} fill={index < Math.round(product.rating) ? "currentColor" : "none"} />)}</span>
        <small>{product.reviewCount.toLocaleString("en-PK")}</small>
      </div>
      <div className="cartify-product__badges">
        {product.badges.slice(0, 3).map((badge) => (
          <span key={badge} className={badge === "Star seller" ? "is-purple" : ""}>{badge}</span>
        ))}
      </div>
      <button className="cartify-add" type="button" title="Add to cart" aria-label={`Add ${product.title} to cart`} onClick={() => onAdd(product)}>
        {justAdded ? <Check size={16} /> : <ShoppingCart size={16} />}
        <span>{justAdded ? "Added" : "Add to cart"}</span>
      </button>
    </article>
  );
}
