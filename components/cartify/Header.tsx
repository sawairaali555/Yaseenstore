"use client";

import Link from "next/link";
import { Menu, Search, ShoppingCart, UserRound, Globe2, Headphones, X, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { categories, type CartifyProduct } from "@/lib/cartify-products";

type HeaderProps = {
  cartCount: number;
  products: CartifyProduct[];
  onSearch: (query: string) => void;
  onCart: () => void;
  onCategory: (category: string) => void;
  onBrowse: (mode: string) => void;
};

export function Header({ cartCount, products, onSearch, onCart, onCategory, onBrowse }: HeaderProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(-1);
  useEffect(() => {
    const timer = window.setTimeout(() => { setDebounced(query); onSearch(query); }, 250);
    return () => window.clearTimeout(timer);
  }, [query, onSearch]);
  const suggestions = useMemo(() => {
    const term = debounced.trim().toLowerCase();
    if (term.length < 2) return [];
    return products.filter((product, index, all) =>
      `${product.title} ${product.category} ${product.brand}`.toLowerCase().includes(term) &&
      all.findIndex((item) => item.title === product.title) === index).slice(0, 5);
  }, [products, debounced]);
  function choose(value: string) {
    setQuery(value); onSearch(value); setFocused(false);
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  }
  const expanded = focused && suggestions.length > 0;
  return (
    <header className="cartify-header">
      <div className="cartify-header__top" aria-label="Cartify service promises">
        <span>Free returns on eligible orders</span><span>Safe payments</span><span>Delivery guarantee</span>
      </div>
      <div className="cartify-header__bar">
        <button className="cartify-icon-button cartify-menu-button" type="button" aria-label="Toggle navigation menu"
          aria-expanded={menuOpen} aria-controls="cartify-navigation" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <a className="cartify-logo" href="#top" aria-label="Cartify home"><b>cartify</b></a>
        <nav id="cartify-navigation" className={`cartify-nav ${menuOpen ? "is-open" : ""}`} aria-label="Primary navigation">
          {[["Best-Selling Items", "bestselling"], ["5-Star Rated", "rated"], ["New In", "new"]].map(([label, mode]) => (
            <a key={mode} href="#products" onClick={() => { onBrowse(mode); onCategory("Recommended"); setMenuOpen(false); }}>{label}</a>
          ))}
          <label className="cartify-category-select">
            <select defaultValue="" aria-label="Categories" onChange={(event) => {
              onCategory(event.target.value || "Recommended"); setMenuOpen(false);
              document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
            }}><option value="">Categories</option>{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select>
            <ChevronDown size={13} />
          </label>
        </nav>
        <form className="cartify-search" role="search" onSubmit={(event) => { event.preventDefault(); choose(selected >= 0 && expanded ? suggestions[selected].title : query); }}>
          <div className="cartify-search__box">
            <input aria-label="Search Cartify products" role="combobox" aria-autocomplete="list"
              aria-expanded={expanded} aria-controls="cartify-suggestions"
              aria-activedescendant={expanded && selected >= 0 ? `suggestion-${selected}` : undefined}
              value={query} onChange={(event) => { setQuery(event.target.value); setSelected(-1); setFocused(true); }}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setFocused(false);
                if (expanded && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                  event.preventDefault(); setSelected((value) => (value + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length);
                }
              }} placeholder="Search for your next favorite find" type="search" />
            <button type="submit" aria-label="Search" title="Search"><Search size={20} /></button>
          </div>
          <div id="cartify-suggestions" className="cartify-suggestions" role="listbox" aria-label="Search suggestions" hidden={!expanded}>
            {suggestions.map((product, index) => (
              <button id={`suggestion-${index}`} key={product.id} type="button" role="option" aria-selected={index === selected}
                onMouseDown={(event) => event.preventDefault()} onClick={() => choose(product.title)}><Search size={15} /><span>{product.title}</span></button>
            ))}
          </div>
        </form>
        <div className="cartify-actions">
          <Link href="/account"><UserRound size={21} /><span>Sign in / Register<small>Orders & Account</small></span></Link>
          <a href="#support"><Headphones size={21} /><span>Support</span></a>
          <label className="cartify-language"><Globe2 size={18} /><select aria-label="Language"><option>🇵🇰 English</option></select></label>
          <button className="cartify-cart" type="button" onClick={onCart} aria-label={`${cartCount} items in cart`} title="Open cart">
            <ShoppingCart size={24} /><b>{cartCount}</b>
          </button>
        </div>
      </div>
    </header>
  );
}
