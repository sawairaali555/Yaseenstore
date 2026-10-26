"use client";

import "@/components/cartify/cartify.css";

import { useMemo, useState } from "react";
import { ArrowUpRight, ArrowRight, Sparkles } from "lucide-react";
import { categories, deals, products, type CartifyProduct } from "@/lib/cartify-products";
import { CategoryTabs } from "@/components/cartify/CategoryTabs";
import { DealsRow } from "@/components/cartify/DealsRow";
import { Footer } from "@/components/cartify/Footer";
import { Header } from "@/components/cartify/Header";
import { ProductGrid } from "@/components/cartify/ProductGrid";
import { TrustBar } from "@/components/cartify/TrustBar";
import { CartDrawer } from "@/components/cartify/CartDrawer";
import { useCart } from "@/components/cartify/useCart";

export default function CartifyHome() {
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const { cart, changeQuantity } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [browse, setBrowse] = useState("recommended");
  const [addedId, setAddedId] = useState<string | null>(null);

  const cartCount = useMemo(() => Object.values(cart).reduce((sum, quantity) => sum + quantity, 0), [cart]);

  function handleAdd(product: CartifyProduct) {
    changeQuantity(product.id, 1);
    setAddedId(product.id);
    window.setTimeout(() => setAddedId(null), 520);
  }

  return (
    <main className="cartify-page" id="top">
      <Header cartCount={cartCount} products={products} onSearch={setSearch} onCart={() => setCartOpen(true)}
        onCategory={setActiveCategory} onBrowse={setBrowse} />
      <section className="cartify-shell cartify-hero" aria-labelledby="storefront-title">
        <div className="cartify-hero__copy">
          <span className="cartify-eyebrow"><Sparkles size={15} /> A little discovery. An everyday upgrade.</span>
          <h1 id="storefront-title">Your next favorite.<br /><em>For a little less.</em></h1>
          <p>Fresh finds for your wardrobe, your home, and everything in between. Discover something you’ll love.</p>
          <a className="cartify-hero__cta" href="#products" onClick={() => { setActiveCategory("Recommended"); setBrowse("recommended"); }}>Explore the collection <ArrowRight size={18} /></a>
          <span className="cartify-hero__note">Everyday essentials. Prices in PKR.</span>
        </div>
        <a className="cartify-hero__feature" href="#products" onClick={() => { setActiveCategory("Home & Kitchen"); setBrowse("recommended"); }}>
          {/* Local static artwork is served directly without an image optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/kitchen.jpg" alt="Discover the home and kitchen collection" width="500" height="500" fetchPriority="high" />
          <div><span>The everyday edit</span><strong>Make yourself at home.</strong><span className="cartify-feature-link">Shop home & kitchen <ArrowUpRight size={18} /></span></div>
        </a>
      </section>
      <TrustBar />
      <DealsRow deals={deals} />
      <section className="cartify-shell cartify-tax">
        <strong>Tax & Customs Policy</strong>
        <span>Hassle-free tax service &gt;</span>
      </section>
      <CategoryTabs categories={categories} active={activeCategory} onChange={setActiveCategory} />
      <ProductGrid key={`${activeCategory}-${search}-${browse}`} products={products} activeCategory={activeCategory}
        search={search} browse={browse} onAdd={handleAdd} addedId={addedId} />
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} products={products} cart={cart} onChange={changeQuantity} />
      <span className="sr-only" role="status">{addedId ? "Added to cart" : ""}</span>
    </main>
  );
}
