"use client";
import { type RefObject, useEffect, useRef, useState } from "react";
import { Truck, ShieldCheck, Phone, ChevronRight, ChevronDown, Search, ShoppingBag, User } from "lucide-react";
import type { Settings } from "@/lib/store-data";
import type { CategoryNode } from "@/lib/categories";
import { type Product, effectivePrice } from "@/app/catalog";
import { productImage } from "@/lib/product-image";
const img = (product: Product) => productImage(product.image);

type Props = {
  config: Settings;
  megaMenuRoots: CategoryNode[];
  megaMenuTiles: CategoryNode[];
  categoryImage: (node: CategoryNode) => string;
  searchContainerRef: RefObject<HTMLDivElement | null>;
  isSearchFocused: boolean;
  setIsSearchFocused: (value: boolean) => void;
  searchLiveQuery: string;
  setSearchLiveQuery: (value: string) => void;
  searchSuggestions: Product[];
  count: number;
};

export default function StoreHeader({ config, megaMenuRoots, megaMenuTiles, categoryImage, searchContainerRef, isSearchFocused, setIsSearchFocused, searchLiveQuery, setSearchLiveQuery, searchSuggestions, count }: Props) {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  const openCategories = () => { cancelClose(); setIsSearchFocused(false); setCategoriesOpen(true); };
  const closeCategories = () => { cancelClose(); setCategoriesOpen(false); };
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setCategoriesOpen(false), 180); };
  const selectedCategory = megaMenuRoots.find(node => node.id === activeCategory);
  const visibleTiles = selectedCategory
    ? selectedCategory.children.filter(node => node.enabled)
    : megaMenuTiles.length ? megaMenuTiles : megaMenuRoots;
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  useEffect(() => {
    if (!categoriesOpen) return;
    const outside = (event: PointerEvent) => {
      if (!categoryRef.current?.contains(event.target as Node)) setCategoriesOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setCategoriesOpen(false); categoryButtonRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [categoriesOpen]);
  return (
      <>
      <div className="temu-top">
        <div><Truck size={14} /> Free shipping on all orders <ChevronRight size={12} /></div>
        <div><ShieldCheck size={14} /> Delivery guarantee <span>Refund for any issues</span></div>
        <div><Phone size={14} /> Shopping across Pakistan</div>
      </div>

      <header className="temu-header">
        <div className="temu-header-row">
          <a href="/" className="temu-logo">
            {config.logo ? (
              <img src={config.logo} alt="Store logo" style={{ maxHeight: 42, maxWidth: 200, objectFit: 'contain' }} />
            ) : (
              <span>
                {config.logoText || 'TEMU'}
              </span>
            )}
          </a>
          <a href="/products">Best-Selling Items</a>
          <a href="/products">5-Star Rated</a>
          <a href="/products">New In</a>
          <div ref={categoryRef} className={`temu-category-trigger${categoriesOpen ? ' is-open' : ''}`}
            onMouseEnter={openCategories} onMouseLeave={scheduleClose}
            onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) closeCategories(); }}>
            <button ref={categoryButtonRef} type="button" className="temu-category-button"
              aria-expanded={categoriesOpen} aria-controls="store-category-menu"
              onClick={() => categoriesOpen ? closeCategories() : openCategories()}
              onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); openCategories(); requestAnimationFrame(() => categoryRef.current?.querySelector<HTMLAnchorElement>('.temu-mega-sidebar a')?.focus()); } }}>
              Categories <ChevronDown size={13} />
            </button>
            {categoriesOpen && <>
            <div className="temu-category-backdrop" aria-hidden="true" onMouseEnter={scheduleClose} />
            <div className="temu-mega-menu" id="store-category-menu" aria-label="Shop by category" onMouseEnter={openCategories}>
              <aside className="temu-mega-sidebar">
                <a href="/products" className={`temu-mega-sidebar-item${!activeCategory ? ' active' : ''}`} onMouseEnter={() => setActiveCategory(null)} onFocus={() => setActiveCategory(null)}>Featured <ChevronRight size={14} /></a>
                {megaMenuRoots.map((root) => (
                  <a key={root.id} href={`/products?category=${encodeURIComponent(root.name)}`} className={`temu-mega-sidebar-item${activeCategory === root.id ? ' active' : ''}`}
                    onMouseEnter={() => setActiveCategory(root.id)} onFocus={() => setActiveCategory(root.id)}>
                    <span>{root.name}</span><ChevronRight size={14} />
                  </a>
                ))}
              </aside>
              <div className="temu-mega-content">
                <div className="temu-mega-heading">
                  <strong>{selectedCategory?.name || 'Featured categories'}</strong>
                  <a href={selectedCategory ? `/products?category=${encodeURIComponent(selectedCategory.name)}` : '/products'}>View all <ChevronRight size={14} /></a>
                </div>
                <div className="temu-mega-grid">
                  {(visibleTiles.length ? visibleTiles : selectedCategory ? [selectedCategory] : []).map((node) => (
                    <a key={node.id} href={`/products?category=${encodeURIComponent(node.name)}`} className="temu-mega-tile">
                      <span className="temu-mega-image">
                        {categoryImage(node) ? <img src={categoryImage(node)} alt="" /> : <span>{node.name.charAt(0)}</span>}
                      </span>
                      <span>{node.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
            </>}
          </div>
          <div ref={searchContainerRef} className="temu-search-wrap">
            <form
              className="temu-search"
              onSubmit={(e) => {
                e.preventDefault();
                setIsSearchFocused(false);
                location.href = `/products?q=${encodeURIComponent(searchLiveQuery.trim())}`;
              }}
            >
              <input
                type="text"
                aria-label="Search products"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setIsSearchFocused(false);
                }}
                value={searchLiveQuery}
                onChange={(e) => {
                  setSearchLiveQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search products"
              />
              <button type="submit" aria-label="Search">
                <Search size={18} />
              </button>
            </form>
            {isSearchFocused && searchLiveQuery.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden z-50">
                <div className="p-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 flex justify-between">
                  <span>Product Suggestions</span>
                  <span>{searchSuggestions.length} found</span>
                </div>
                {searchSuggestions.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {searchSuggestions.map((item) => (
                      <a
                        key={item.id}
                        href={`/product/${item.id}`}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors"
                        onClick={() => setIsSearchFocused(false)}
                      >
                        <img
                          src={img(item)}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-contain bg-slate-50 p-1 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 line-clamp-1">{item.name}</p>
                          <p className="text-[11px] text-slate-400">{item.category}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <strong className="text-xs font-bold text-[#203664]">
                            Rs {effectivePrice(item).toLocaleString('en-PK')}
                          </strong>
                        </div>
                      </a>
                    ))}
                    <a
                      href={`/products?q=${encodeURIComponent(searchLiveQuery.trim())}`}
                      className="block p-3 text-center text-xs font-bold text-[#203664] hover:bg-slate-50 bg-slate-50/50"
                      onClick={() => setIsSearchFocused(false)}
                    >
                      See all results for &ldquo;{searchLiveQuery}&rdquo; →
                    </a>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No matching products found for &ldquo;{searchLiveQuery}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="temu-actions">
            <a href="/account"><User size={14} /> Sign in / Register<br />Orders & Account</a>
            <a href="/track-order"><Phone size={14} /> Support</a>
            <a href="/products" className="temu-locale"><span className="temu-language-mark">◐</span> English</a>
            <a href="/cart" aria-label={`Shopping bag, ${count} items`}><ShoppingBag size={17} />{count > 0 && <sup>{count}</sup>}</a>
          </div>
        </div>
      </header>
      </>
  );
}

