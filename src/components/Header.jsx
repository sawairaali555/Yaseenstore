/* eslint-disable @next/next/no-img-element -- This header also runs in the standalone Vite storefront. */
import { useEffect, useRef, useState } from 'react';
import { Search, ShoppingCart, UserRound, Headphones, Globe, ChevronDown, ChevronRight, Package, Menu, X, ArrowRight, Heart, Shirt, Footprints, House, Monitor, Baby, Dumbbell, Gem, Car, Briefcase, Flower2, Palette, Wrench, BookOpen, PawPrint, Sparkles } from 'lucide-react';

function CategoryArtwork({ category }) {
  const image = category.image || category.products[0]?.image;
  if (image) return <img src={image} alt="" />;
  const name = category.name.toLowerCase();
  const Icon = /lingerie|bra|shapewear|panties|underwear/.test(name) ? Heart
    : /shoes|sneakers|sandals|boots|heels|slippers/.test(name) ? Footprints
    : /clothing|fashion|shirt|pants|dress|sleepwear|robe|pajama|lounge|socks/.test(name) ? Shirt
    : /home|kitchen|bedding|bath|cookware|storage/.test(name) ? House
    : /electronic|computer|phone|gaming|audio|camera/.test(name) ? Monitor
    : /beauty|care|makeup|fragrance|skincare/.test(name) ? Sparkles
    : /baby|maternity|toys/.test(name) ? Baby
    : /sports|fitness|yoga|cycling/.test(name) ? Dumbbell
    : /jewelry|accessories|rings|necklaces/.test(name) ? Gem
    : /automotive|car|motorcycle/.test(name) ? Car
    : /bags|luggage|business/.test(name) ? Briefcase
    : /garden|patio|plant/.test(name) ? Flower2
    : /craft|arts|sewing/.test(name) ? Palette
    : /tools|hardware|plumbing/.test(name) ? Wrench
    : /office|school|stationery|notebook/.test(name) ? BookOpen
    : /pet|dog|cat|aquarium/.test(name) ? PawPrint : Package;
  return <Icon size={32} strokeWidth={1.4} aria-hidden="true" />;
}
/** @param {{categories: string[], categoryTree?: any[], products?: any[], query: string, setQuery: (value: string) => void, onCategory: (value: string) => void, onBrowse: (value: string) => void, onSearch?: (value: string) => void, cartCount: number, onCart: () => void, onInfo: (value: string) => void, accountUrl: string, homeUrl?: string}} props */
export default function Header({categories, categoryTree = [], products = [], query, setQuery, onCategory, onBrowse, onSearch, cartCount, onCart, onInfo, accountUrl, homeUrl = '#top'}) {
  const [signIn, setSignIn] = useState(false);
  const [menu, setMenu] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [previewCategory, setPreviewCategory] = useState('Recommended');
  const categoryRoot = useRef(null);
  const categoryTrigger = useRef(null);
  const closeTimer = useRef(null);
  const popover = useRef(null);
  const trigger = useRef(null);
  useEffect(() => {
    if (!signIn) return;
    const close = (event) => { if (!popover.current?.contains(event.target) && !trigger.current?.contains(event.target)) setSignIn(false); };
    const escape = (event) => { if(event.key === 'Escape') { setSignIn(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  },[signIn]);
  const browse = (mode) => { onBrowse(mode); setMenu(false); };
  const matches = (product, name) => product.category === name || product.categoryPath?.includes(name);
  const flatten = (nodes, depth = 0) => nodes.filter(node => node.enabled).flatMap(node => [{ ...node, depth }, ...flatten(node.children || [], depth + 1)]);
  const treeItems = flatten(categoryTree);
  const categoryItems = treeItems.length ? treeItems : [...new Set(categories || [])].filter(name => name !== 'Recommended' && products.some(product => matches(product, name))).map(name => ({ name, depth: 0, children: [] }));
  const previewNode = categoryItems.find(node => node.name === previewCategory);
  const previewProducts = products.filter(product => previewCategory === 'Recommended' || matches(product, previewCategory)).slice(0, 10);
  const featuredCategories = (previewCategory === 'Recommended' ? categoryItems.filter(node => node.depth === 0) : (previewNode?.children || []).filter(node => node.enabled)).map(node => ({ ...node, products: products.filter(product => matches(product, node.name)) }));
  const showCategoryTiles = previewCategory === 'Recommended' || featuredCategories.length > 0;
  const openCategories = () => { clearTimeout(closeTimer.current); setSignIn(false); setCategoriesOpen(true); };
  const closeCategories = () => { clearTimeout(closeTimer.current); setCategoriesOpen(false); };
  const selectCategory = category => { setCategoriesOpen(false); setMenu(false); onCategory(category); };
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  useEffect(() => {
    if (!categoriesOpen) return;
    const closeOutside = event => { if (!categoryRoot.current?.contains(event.target)) closeCategories(); };
    const escape = event => { if (event.key === 'Escape') { closeCategories(); categoryTrigger.current?.focus(); } };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', escape); };
  }, [categoriesOpen]);
  return <header className="market-header">
    <div className="market-nav">
      <button className="market-menu icon-button" onClick={() => setMenu(!menu)} aria-label="Toggle navigation" aria-expanded={menu} aria-controls="market-navigation">{menu ? <X /> : <Menu />}</button>
      <a className="market-logo" href={homeUrl} aria-label="YOUR BRAND home">YOUR<span>BRAND<span className="logo-dot">.</span></span></a>
      <nav id="market-navigation" className={`market-navigation ${menu ? 'is-open' : ''}`} aria-label="Main navigation">
        <button onClick={() => browse('best')}>Best Sellers</button><button onClick={() => browse('new')}>New Arrivals</button>
        <div ref={categoryRoot} className={`market-category-mega ${categoriesOpen ? 'is-open' : ''}`} onMouseEnter={openCategories} onMouseLeave={() => { closeTimer.current = setTimeout(() => setCategoriesOpen(false), 160); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) closeCategories(); }}>
          <button ref={categoryTrigger} className="market-category-trigger" aria-label="Browse categories" aria-expanded={categoriesOpen} aria-controls="market-category-panel" onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); openCategories(); requestAnimationFrame(() => categoryRoot.current?.querySelector('.market-category-list button')?.focus()); } }} onClick={() => { if (categoriesOpen) closeCategories(); else openCategories(); }}>Categories <ChevronDown size={14} /></button>
          {categoriesOpen && <>
          <div className="market-category-backdrop" aria-hidden="true" onPointerDown={closeCategories} onMouseEnter={() => { clearTimeout(closeTimer.current); closeTimer.current = setTimeout(closeCategories, 160); }} />
          <div className="market-category-panel" id="market-category-panel" aria-label="Shop by category" onMouseEnter={openCategories}>
            <aside className="market-category-list">
              <button className={previewCategory === 'Recommended' ? 'is-selected' : ''} onMouseEnter={() => setPreviewCategory('Recommended')} onFocus={() => setPreviewCategory('Recommended')} onClick={() => selectCategory('Recommended')}><span>Featured</span><ChevronRight size={14} /></button>
              {categoryItems.filter(category => category.depth === 0).map(category => {
                const children = (category.children || []).filter(child => child.enabled);
                return <div key={category.id || category.name} id={`market-category-${encodeURIComponent(category.id || category.name)}`} className="market-category-group">
                  <button className={previewCategory === category.name ? 'is-selected' : ''} aria-current={previewCategory === category.name ? 'true' : undefined} onMouseEnter={() => setPreviewCategory(category.name)} onFocus={() => setPreviewCategory(category.name)} onClick={() => children.length ? setPreviewCategory(category.name) : selectCategory(category.name)}><span title={category.name}>{category.name}</span><ChevronRight size={14} /></button>
                </div>;
              })}
            </aside>
            <section key={previewCategory} className="market-category-featured">
              <div className="market-category-featured-head"><button className="market-category-all" onClick={() => selectCategory(previewCategory)}>All {previewCategory === 'Recommended' ? 'Categories' : previewCategory} <ChevronRight size={18} /></button><button aria-label="Close categories" className="market-category-close" onClick={() => { closeCategories(); categoryTrigger.current?.focus(); }}><X size={16} /></button></div>
              <div key={previewCategory} className="market-category-featured-grid">
                {showCategoryTiles ? featuredCategories.map(category => <button key={category.id || category.name} onClick={() => selectCategory(category.name)}><span className="market-category-image"><CategoryArtwork category={category} /></span><b>{category.name}</b></button>) : previewProducts.map(product => <a key={product.id} href={`/product/${encodeURIComponent(product.id)}`}><span className="market-category-image"><img src={product.image} alt="" /></span><b>{product.name}</b></a>)}
              </div>
              {!(showCategoryTiles ? featuredCategories.length : previewProducts.length) && <div className="market-category-empty"><Package size={28} /><strong>More to discover soon</strong><p>Explore the rest of our collections for available products.</p></div>}
            </section>
          </div>
          </>}
        </div>
      </nav>
      <form className="market-search" role="search" onSubmit={event => {event.preventDefault();if (onSearch) onSearch(query); else document.getElementById('market-products')?.scrollIntoView({behavior:'smooth'});}}>
        <input type="search" aria-label="Search products" placeholder="Search products" value={query} onChange={event => setQuery(event.target.value)}/><button aria-label="Submit search"><Search size={20}/></button>
      </form>
      <div className="market-header-actions">
        <div className="market-signin"><button ref={trigger} className="market-account" aria-label="Sign in / Register" aria-expanded={signIn} aria-controls="market-signin-popover" onClick={() => setSignIn(!signIn)}><UserRound size={22}/><span>Sign in / Register<small>Your account</small></span></button>
          {signIn && <div className="market-signin-popover" id="market-signin-popover" ref={popover}><strong>Welcome to YOUR BRAND</strong><p>Your favorites, orders, and everyday finds in one place.</p><a className="market-primary" href={accountUrl}>Sign in / Register <ArrowRight size={16}/></a><small>Continue to your account to sign in.</small></div>}
        </div>
        <button className="market-support" onClick={() => onInfo('Support')}><Headphones size={22}/><span>Support</span></button>
        <label className="market-language"><Globe size={18}/><select aria-label="Language"><option>EN</option></select></label>
        <button className="market-cart-button icon-button" onClick={onCart} aria-label={`Open cart, ${cartCount} items`}><ShoppingCart size={24}/><b>{cartCount}</b></button>
      </div>
    </div>
  </header>;
}
