"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, Heart, MessageCircle, Minus, Moon, Plus, Search, ShieldCheck, ShoppingBag, ShoppingCart, Star, Sun, Truck, X } from "lucide-react";
import { categories, money, products, STORE_CONFIG } from "./data/products";
import { normalizeCart, readSavedValue, saveValue } from "./cart";
import SalePopup from "./components/SalePopup";
import "./index.css";

const CART_KEY = "gharcart-cart-v1";
const FAV_KEY = "gharcart-favorites-v1";
const productsById = new Map(products.map(product => [product.id, product]));

// CHECKOUT INTEGRATION: replace only this function body with your checkout logic.
export function goToCheckout(cartItems) {
  const validProductIds = new Set(products.map(product => product.id));
  const checkoutItems = normalizeCart(cartItems, products).filter(item => validProductIds.has(item.id)).map(item => ({
    id: item.id,
    qty: item.qty,
    size: item.variant?.Size || "Standard",
    ...(item.variant?.Color ? { color: item.variant.Color } : {}),
  }));
  try {
    localStorage.setItem("cartify-cart", JSON.stringify(checkoutItems));
    sessionStorage.setItem("checkout-cart", JSON.stringify(checkoutItems));
  } catch {}
  window.location.assign(STORE_CONFIG.checkoutUrl);
}

export default function App() {
  const toastTimer = useRef(null);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);
  const [cartItems,setCartItems]=useState([]), [favorites,setFavorites]=useState([]), [cartOpen,setCartOpen]=useState(false);
  const [toast,setToast]=useState(""), [query,setQuery]=useState(""), [category,setCategory]=useState("All products"), [dark,setDark]=useState(false), [loaded,setLoaded]=useState(false), [pathname,setPathname]=useState("");
  const productId=pathname.startsWith("/product/")?decodeURIComponent(pathname.split("/").pop()):null;
  const selected=products.find(product=>product.id===productId);
  useEffect(() => {
    setPathname(window.location.pathname);
    setCartItems(normalizeCart(readSavedValue(CART_KEY, []), products));
    const savedFavorites = readSavedValue(FAV_KEY, []);
    setFavorites(Array.isArray(savedFavorites) ? [...new Set(savedFavorites.filter(id => productsById.has(id)))] : []);
    try { setDark(localStorage.getItem("gharcart-theme") === "dark"); } catch { /* Storage is optional. */ }
    setLoaded(true);
  }, []);
  const cartState=useMemo(()=>{const subtotal=cartItems.reduce((sum,item)=>sum+item.price*item.qty,0);const delivery=subtotal>0&&subtotal<STORE_CONFIG.freeDeliveryThreshold?STORE_CONFIG.deliveryFee:0;return{items:cartItems,subtotal,delivery,total:subtotal+delivery}},[cartItems]);
  useEffect(()=>{if(!loaded)return;saveValue(CART_KEY,cartItems);window.storeCartState=cartState},[cartItems,cartState,loaded]);
  useEffect(()=>{if(loaded)saveValue(FAV_KEY,favorites)},[favorites,loaded]);
  useEffect(()=>{document.documentElement.classList.toggle("store-dark",dark);if(loaded){try{localStorage.setItem("gharcart-theme",dark?"dark":"light")}catch{ /* Storage is optional. */ }}},[dark,loaded]);
  function notify(){setToast("Added to cart");window.clearTimeout(toastTimer.current);toastTimer.current=window.setTimeout(()=>setToast(""),1800)}
  function nextCart(current, product, qty, variant) {
    return normalizeCart([...current, { id: product.id, qty, variant }], products);
  }
  function add(product, qty = 1, variant = {}) {
    if (!product.stock) return;
    setCartItems(current => nextCart(current, product, qty, variant));
    notify();
    setCartOpen(true);
  }
  function buy(product, qty = 1, variant = {}) {
    if (!product.stock) return;
    const next = nextCart(cartItems, product, qty, variant);
    setCartItems(next);
    goToCheckout(next);
  }
  function changeQty(key, delta) {
    setCartItems(current => {
      const line = current.find(item => item.key === key);
      if (!line) return current;
      const stock = productsById.get(line.id)?.stock || 0;
      const otherQuantity = current.reduce((sum, item) => sum + (item.id === line.id && item.key !== key ? item.qty : 0), 0);
      return normalizeCart(current.map(item => item.key === key
        ? { ...item, qty: Math.min(item.qty + delta, stock - otherQuantity) }
        : item), products);
    });
  }
  function favorite(id){setFavorites(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id])}
  const count=cartItems.reduce((sum,item)=>sum+item.qty,0);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter(product => (category === "All products" || product.category === category) && product.name.toLowerCase().includes(term));
  }, [category, query]);
  return <div className="storefront"><TrustStrip/><StoreHeader count={count} query={query} setQuery={setQuery} category={category} setCategory={setCategory} openCart={()=>setCartOpen(true)} dark={dark} setDark={setDark}/>{selected?<ProductPage product={selected} related={products.filter(p=>p.category===selected.category&&p.id!==selected.id)} favorites={favorites} favorite={favorite} add={add} buy={buy}/>:<Listing products={filtered} category={category} setCategory={setCategory} favorites={favorites} favorite={favorite} add={add} buy={buy}/>}<CartDrawer open={cartOpen} close={()=>setCartOpen(false)} state={cartState} changeQty={changeQty} remove={key=>setCartItems(current=>current.filter(item=>item.key!==key))}/><SalePopup/><a className="whatsapp-float" href={`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent("Assalam-o-alaikum, I need help with my order.")}`} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"><MessageCircle/></a>{toast&&<div className="store-toast" role="status"><Check/> {toast}</div>}</div>
}

function TrustStrip(){return <div className="trust-strip"><span>Cash on delivery</span><span>Delivery in 3–5 days</span><span>7-day returns</span><span>Free delivery over {money(STORE_CONFIG.freeDeliveryThreshold)}</span></div>}
function StoreHeader({count,query,setQuery,category,setCategory,openCart,dark,setDark}){return <header className="store-header"><div className="store-header__inner"><a className="brand" href="/">Ghar<span>Cart</span><small>Made for Pakistan</small></a><nav><a href="/#products">Best sellers</a><a href="/#products">New arrivals</a><label className="header-categories"><span>Categories</span><select aria-label="Browse categories" value={category} onChange={e=>{setCategory(e.target.value);document.getElementById("products")?.scrollIntoView({behavior:"smooth"})}}>{categories.map(value=><option key={value}>{value}</option>)}</select></label></nav><form className="store-search" onSubmit={e=>{e.preventDefault();document.getElementById("products")?.scrollIntoView({behavior:"smooth"})}}><input type="search" aria-label="Search products" placeholder="Search products" value={query} onChange={e=>setQuery(e.target.value)}/><button type="submit" aria-label="Submit search"><Search/></button></form><button className="icon-control" onClick={()=>setDark(!dark)} aria-label={dark?"Use light mode":"Use dark mode"}>{dark?<Sun/>:<Moon/>}</button><button className="cart-control" onClick={openCart}><ShoppingBag/><span>Cart</span><b>{count}</b></button></div></header>}
function Listing({products:items,category,setCategory,favorites,favorite,add,buy}){return <main><section className="store-hero"><div><span className="eyebrow">Thoughtful everyday finds</span><h1>Good things for your <em>everyday.</em></h1><p>Useful products, fair prices and cash on delivery across Pakistan.</p><a href="#products">Shop the collection</a></div><img src="/images/bag.jpg" alt="Featured everyday shoulder bag"/></section><section className="store-benefits" id="trust"><Benefit icon={<Truck/>} title="Nationwide delivery" text="Reliable service across Pakistan"/><Benefit icon={<ShieldCheck/>} title="Shop with confidence" text="COD and easy 7-day returns"/><Benefit icon={<ShoppingBag/>} title="Carefully selected" text="Useful products at fair prices"/></section><section className="catalog" id="products"><div className="category-heading"><div><span className="eyebrow">A little something for everyone</span><h2>Explore your interests</h2></div><span>Find the things that feel like you.</span></div><div className="category-row" id="categories">{categories.map(value=><button aria-pressed={category===value} className={category===value?"active":""} key={value} onClick={()=>setCategory(value)}>{value}</button>)}</div><div className="catalog-head"><div><span className="eyebrow">Browse the shop</span><h2>Everyday favourites</h2></div><p>{items.length} products</p></div><div className="product-grid">{items.map(product=><ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} toggle={favorite} add={add} buy={buy}/>)}</div>{!items.length&&<div className="empty-products"><h3>No products found</h3><button onClick={()=>setCategory("All products")}>View all products</button></div>}</section><footer><a className="brand" href="/">Ghar<span>Cart</span></a><p>Simple shopping, delivered across Pakistan.</p><small>© 2026 GharCart</small></footer></main>}
function Benefit({icon,title,text}){return <div>{icon}<span><strong>{title}</strong><small>{text}</small></span></div>}
function ProductCard({product,favorite,toggle,add,buy}){const discount=Math.round((1-product.price/product.oldPrice)*100),disabled=!product.stock;return <article className="product-card"><div className="product-image"><a href={`/product/${product.id}`}><img src={product.images[0]} alt={product.name} loading="lazy"/></a><span className="discount">-{discount}%</span><button className={`heart ${favorite?"active":""}`} onClick={()=>toggle(product.id)} aria-label="Toggle wishlist"><Heart fill={favorite?"currentColor":"none"}/></button></div><div className="product-info"><span className="product-category">{product.category}</span><h3><a href={`/product/${product.id}`}>{product.name}</a></h3>{product.reviewCount>0&&product.soldCount>0&&<div className="rating"><Star fill="currentColor"/><strong>{product.rating}</strong><span>({product.reviewCount})</span><small>{product.soldCount} sold</small></div>}<span className="cod-tag">COD available</span><div className="price"><strong>{money(product.price)}</strong><del>{money(product.oldPrice)}</del></div><div className="card-actions"><button disabled={disabled} className="add-icon" onClick={()=>add(product)}><ShoppingCart/><span>{disabled?"Out of stock":"Add"}</span></button><button disabled={disabled} className="buy-button" onClick={()=>buy(product)}>{disabled?"Out of stock":"Buy now"}</button></div></div></article>}

function CartDrawer({open,close,state,changeQty,remove}){const remaining=Math.max(0,STORE_CONFIG.freeDeliveryThreshold-state.subtotal),progress=Math.min(100,state.subtotal/STORE_CONFIG.freeDeliveryThreshold*100);return <div className={`drawer-shell ${open?"open":""}`} aria-hidden={!open}><button className="drawer-backdrop" onClick={close} aria-label="Close cart"/><aside className="cart-drawer"><header><div><span className="eyebrow">Your basket</span><h2>Shopping cart ({state.items.reduce((sum,item)=>sum+item.qty,0)})</h2></div><button className="icon-control" onClick={close}><X/></button></header>{state.items.length?<><div className="delivery-progress"><p>{remaining?`Add ${money(remaining)} more for free delivery`:"You unlocked free delivery"}</p><div><span style={{width:`${progress}%`}}/></div></div><div className="cart-lines">{state.items.map(item=>{const product=productsById.get(item.id);return <div className="cart-line" key={item.key}><img src={product?.images[0]} alt=""/><div><h3>{item.name}</h3>{Object.keys(item.variant||{}).length>0&&<small>{Object.entries(item.variant).map(([k,v])=>`${k}: ${v}`).join(" · ")}</small>}<strong>{money(item.price)}</strong><div className="qty"><button onClick={()=>changeQty(item.key,-1)}><Minus/></button><span>{item.qty}</span><button onClick={()=>changeQty(item.key,1)}><Plus/></button></div><button className="remove" onClick={()=>remove(item.key)}>Remove</button></div></div>})}</div><div className="cart-summary"><p><span>Subtotal</span><strong>{money(state.subtotal)}</strong></p><p><span>Delivery</span><strong>{state.delivery?money(state.delivery):"Free"}</strong></p><p className="total"><span>Total</span><strong>{money(state.total)}</strong></p><button className="checkout-button" onClick={()=>goToCheckout(state.items)}>Checkout</button><button className="text-button" onClick={close}>Continue shopping</button></div></>:<div className="cart-empty"><ShoppingBag/><h3>Your cart is empty</h3><p>Add something useful and it will appear here.</p><button onClick={close}>Continue shopping</button></div>}</aside></div>}

function ProductPage({product,related,favorites,favorite,add,buy}){const[qty,setQty]=useState(1),[variant,setVariant]=useState(()=>Object.fromEntries(product.variants.map(o=>[o.name,o.values[0]])));const disabled=!product.stock,discount=Math.round((1-product.price/product.oldPrice)*100),message=`Assalam-o-alaikum, I would like to order ${product.name}: ${typeof window!=="undefined"?window.location.href:""}`;return <main className="product-page"><a className="back-link" href="/"><ChevronLeft/>Back to products</a><section className="product-detail"><div className="gallery"><img className="main-image" src={product.images[0]} alt={product.name}/></div><div className="detail-info"><span className="product-category">{product.category}</span><h1>{product.name}</h1>{product.reviewCount>0&&<div className="rating"><Star fill="currentColor"/><strong>{product.rating}</strong><span>{product.reviewCount} reviews · {product.soldCount} sold</span></div>}<div className="detail-price"><strong>{money(product.price)}</strong><del>{money(product.oldPrice)}</del><span>Save {discount}%</span></div><p className={`stock ${disabled?"out":""}`}>{disabled?"Out of stock":product.stock<=5?`Only ${product.stock} left`:`In stock · ${product.stock} available`}</p>{product.variants.map(option=><fieldset className="variant" key={option.name}><legend>{option.name}: <strong>{variant[option.name]}</strong></legend><div>{option.values.map(value=><button className={variant[option.name]===value?"active":""} onClick={()=>setVariant(current=>({...current,[option.name]:value}))} key={value}>{value}</button>)}</div></fieldset>)}<div className="quantity"><span>Quantity</span><div><button onClick={()=>setQty(Math.max(1,qty-1))}><Minus/></button><span>{qty}</span><button onClick={()=>setQty(Math.min(product.stock||1,qty+1))}><Plus/></button></div></div><div className="detail-actions"><button disabled={disabled} className="detail-add" onClick={()=>add(product,qty,variant)}><ShoppingCart/>{disabled?"Out of stock":"Add to cart"}</button><button disabled={disabled} className="buy-button" onClick={()=>buy(product,qty,variant)}>{disabled?"Out of stock":"Buy now"}</button></div><div className="trust-badges"><span><ShoppingBag/>Cash on delivery</span><span><ShieldCheck/>7-day return</span><span><Truck/>Delivery in 3–5 days</span></div><a className="whatsapp-order" href={`https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"><MessageCircle/>Order on WhatsApp</a></div></section><section className="product-copy"><span className="eyebrow">Product details</span><h2>Made for everyday use</h2><p>{product.description}</p></section><section className="reviews"><span className="eyebrow">Customer reviews</span><h2>Loved across Pakistan</h2><div><article><div>★★★★★</div><p>“The quality is lovely and delivery was quick. Exactly as shown.”</p><strong>Ayesha K. · Lahore</strong></article><article><div>★★★★★</div><p>“Well packed, fair price and easy cash on delivery.”</p><strong>Hamza R. · Islamabad</strong></article></div></section>{related.length>0&&<section className="related"><div className="catalog-head"><div><span className="eyebrow">You may also like</span><h2>Related products</h2></div></div><div className="product-grid">{related.map(item=><ProductCard key={item.id} product={item} favorite={favorites.includes(item.id)} toggle={favorite} add={add} buy={buy}/>)}</div></section>}<div className="mobile-buy-bar"><button disabled={disabled} onClick={()=>add(product,qty,variant)}><ShoppingCart/>Add</button><button disabled={disabled} onClick={()=>buy(product,qty,variant)}>Buy now · {money(product.price*qty)}</button></div></main>}
