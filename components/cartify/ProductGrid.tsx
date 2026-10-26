"use client";

import { useMemo, useState } from "react";
import type { CartifyProduct } from "@/lib/cartify-products";
import { ProductCard } from "./ProductCard";

type ProductGridProps = {
  products: CartifyProduct[];
  activeCategory: string;
  onAdd: (product: CartifyProduct) => void;
  addedId: string | null;
  search: string;
  browse: string;
};

export function ProductGrid({ products, activeCategory, search, browse, onAdd, addedId }: ProductGridProps) {
  const [visible, setVisible] = useState(20);
  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = products.filter((product) =>
      (activeCategory === "Recommended" || product.category === activeCategory) &&
      (!term || `${product.title} ${product.category} ${product.brand}`.toLowerCase().includes(term)));
    if (browse === "rated") return filtered.sort((a, b) => b.rating - a.rating);
    if (browse === "bestselling") return filtered.sort((a, b) => parseFloat(b.soldCount) - parseFloat(a.soldCount));
    if (browse === "new") return filtered.reverse();
    return filtered;
  }, [activeCategory, search, browse, products]);

  const shownProducts = filteredProducts.slice(0, visible);

  return (
    <section className="cartify-shell cartify-grid-section" id="products" aria-label="Product grid">
      {search && <p className="cartify-results" role="status">{filteredProducts.length} results for &quot;{search}&quot;</p>}
      {filteredProducts.length === 0 && <div className="cartify-empty"><h2>No matches found</h2><p>Try another product or category.</p></div>}
      <div className="cartify-product-grid">
        {shownProducts.map((product) => (
          <ProductCard key={product.id} product={product} onAdd={onAdd} justAdded={addedId === product.id} />
        ))}
      </div>
      {visible < filteredProducts.length && (
        <div className="cartify-load-more">
          <button type="button" onClick={() => setVisible((value) => value + 10)}>See more ⌄</button>
        </div>
      )}
    </section>
  );
}
