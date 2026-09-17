"use client";
import { useEffect, useRef, useState } from "react";
import {
  Heart,
  ShoppingBag,
  ArrowRight,
  Truck,
  ShieldCheck,
  Minus,
  Plus,
  ZoomIn,
  Check,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock3,
  Zap,
  RotateCcw,
  MapPin,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Product, activeOffer, effectivePrice, money } from "./catalog";
import {
  PAKISTAN_PROVINCES,
  PAKISTAN_CITIES_BY_PROVINCE,
  ALL_PAKISTAN_CITIES,
  cleanPakistanPhone,
  isValidPakistanPhone,
} from "@/lib/pakistan-locations";
type Props = {
  product: Product;
  products: Product[];
  config: { deliveryCharge: number; freeThreshold: number; whatsapp: string };
  qty: number;
  setQty: (n: number) => void;
  size: string;
  setSize: (s: string) => void;
  saved: boolean;
  favorite: () => void;
  add: () => void;
  buy: () => void;
};
const sampleReviews = [
  { name: "Ayesha K.", rating: 5, text: "Really happy with the quality. It looks just like the photos and arrived neatly packed.", date: "2 weeks ago" },
  { name: "Hamza R.", rating: 4, text: "Good value for the price and delivery was quick. I would buy this again.", date: "1 month ago" },
  { name: "Sana M.", rating: 5, text: "A lovely everyday product. Easy to use and exactly what I was looking for.", date: "2 months ago" },
];
const defaultSizes = (product: Product) => {
  const text = (product.name + " " + product.category + " " + (product.subcategory || "")).toLowerCase();
  if (product.sizes?.length) return product.sizes;
  if (text.includes("shoe") || text.includes("sneaker")) return ["38", "39", "40", "41", "42", "43", "44"];
  if (text.includes("dress") || text.includes("clothing") || product.category === "Fashion") return ["XS", "S", "M", "L", "XL"];
  if (text.includes("bag") || product.category === "Accessories") return ["Standard", "Small", "Medium", "Large"];
  return ["Standard"];
};
const countdownParts = (target: Date | null) => {
  if (!target) return null;
  const remaining = Math.max(0, target.getTime() - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Min", value: minutes },
    { label: "Sec", value: seconds },
  ];
};
const addWorkingDays = (date: Date, days: number) => {
  const next = new Date(date);
  let added = 0;
  while (added < days) {
    next.setDate(next.getDate() + 1);
    const day = next.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return next;
};
const formatDeliveryDate = (date: Date) =>
  date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
export default function ProductDetail({
  product: p,
  products,
  config,
  qty,
  setQty,
  size,
  setSize,
  saved,
  favorite,
  add,
  buy,
}: Props) {
  const [zoom, setZoom] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod] = useState<"cod">("cod");
  const [selectedProvince, setSelectedProvince] = useState<string>("Punjab");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [customCity, setCustomCity] = useState<string>("");
  const [activeTab, setActiveTab] = useState("details");
  const [selectedBundle, setSelectedBundle] = useState(0);
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [now, setNow] = useState(() => new Date());
  const images = Array.from(new Set([p.image, ...(p.images || [])].filter(Boolean)));
  const [selectedImage, setSelectedImage] = useState(0);
  const imageValue = images[selectedImage] || p.image;
  const image = /^https?:\/\//.test(imageValue)
    ? imageValue
    : "/images/" + imageValue + ".jpg";
  const offer = activeOffer(p, now);
  const displayPrice = effectivePrice(p, now);
  const cost = displayPrice * qty;
  const countdown = countdownParts(offer?.end || null);
  const reviews = p.reviews?.length ? p.reviews : sampleReviews;
  const reviewCount = reviews.length;
  const averageRating = reviewCount
    ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviewCount).toFixed(1)
    : "0.0";
  const delivery = cost >= config.freeThreshold ? 0 : config.deliveryCharge;
  const dealPercent = offer
    ? Math.round((1 - offer.price / offer.regularPrice) * 100)
    : p.old > displayPrice
      ? Math.round((1 - displayPrice / p.old) * 100)
      : 0;
  const deliveryWindow = formatDeliveryDate(addWorkingDays(now, 3));
  const deal = {
    title: p.deal?.title || "Lightning deal",
    shippingBadge: p.deal?.shippingBadge || "Free shipping",
    creditBadge: p.deal?.creditBadge || "Delay credit",
    productNote: p.deal?.productNote || `${p.category}${p.subcategory ? ` · ${p.subcategory}` : ""}${p.option ? ` · ${p.option}` : ""}`,
    deliveryNote: p.deal?.deliveryNote || `Estimated delivery: ${deliveryWindow} · 3 working days`,
    cta: p.deal?.cta || "Add to cart",
    trustShipping: p.deal?.trustShipping || "Free shipping on eligible orders",
    trustPayment: p.deal?.trustPayment || "Safe payments · Secure privacy",
    trustGuarantee: p.deal?.trustGuarantee || "Order guarantee",
    chips: p.deal?.chips?.length ? p.deal.chips : ["Free returns", "Delay credit", "Return if item damaged", "15-day refund support"],
  };
  const allSizeOptions = defaultSizes(p);
  const sizeStock = p.sizeStock;
  const hasSizeStock = !!sizeStock && Object.keys(sizeStock).length > 0;
  const configuredSizes = hasSizeStock ? allSizeOptions.filter(s => Object.prototype.hasOwnProperty.call(sizeStock, s)) : allSizeOptions;
  const sizeOptions = configuredSizes.length > 0 ? configuredSizes : allSizeOptions;
  const hasSizeOptions = sizeOptions.length > 1 || (sizeOptions.length === 1 && sizeOptions[0] !== "Standard");

  const stockForSize = (selected: string) => hasSizeStock ? Number(sizeStock?.[selected] || 0) : Number(p.stock || 0);
  const inStock = p.status === "Active" && (hasSizeStock ? Object.values(sizeStock).some((value) => Number(value) > 0) : Number(p.stock || 0) > 0);
  const selectedInStock = inStock && stockForSize(hasSizeOptions ? size : "Standard") > 0;
  const availableForSelected = stockForSize(hasSizeOptions ? size : "Standard");
  const quantityLimit = Math.max(0, Math.min(10, availableForSelected));

  useEffect(() => {
    const inStockSizes = sizeOptions.filter(s => stockForSize(s) > 0);
    if (!inStockSizes.includes(size)) {
      setSize(inStockSizes[0] || sizeOptions[0] || "Standard");
    }
    setQty(1);
  }, [p.id]);

  useEffect(() => {
    if (!p.offerEnd) return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [p.id, p.offerEnd]);

  const variantGroup = p.listingGroup || p.id;
  const colourVariants = products
    .filter((product) => (product.listingGroup || product.id) === variantGroup)
    .filter((product) => product.id !== variantGroup)
    .filter((product) => product.status === "Active" && (Object.values(product.sizeStock || {}).some(v => Number(v) > 0) || Number(product.stock || 0) > 0))
    .filter((product, index, list) => list.findIndex((item) => item.id === product.id) === index);
  const childColourVariants = colourVariants;
  const hasColourVariants = childColourVariants.length > 0;
  return (
    <>
      <div className="breadcrumb">
        <a href="/">Home</a>
        <ChevronRight size={14} />
        <a href={"/products?category=" + encodeURIComponent(p.category)}>
          {p.category}
        </a>
        <ChevronRight size={14} />
        {p.name}
      </div>
      <div className="pdp-layout">
        <div className="pdp-gallery" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          {images.length > 0 && (
            <div className="pdp-thumbnails" aria-label="Product images" style={{ display: "flex", flexDirection: "column", gap: 10, width: 72, flexShrink: 0 }}>
              {images.map((value, index) => (
                <button
                  type="button"
                  key={value + index}
                  className={index === selectedImage ? "selected" : ""}
                  style={{ width: 72, height: 72, padding: 3, border: index === selectedImage ? "2px solid #203664" : "1px solid #dfe4ea", borderRadius: 6, background: "#f3f5f7", overflow: "hidden", cursor: "pointer" }}
                  onClick={() => setSelectedImage(index)}
                  aria-label={`View product image ${index + 1}`}
                >
                  <img style={{ width: "100%", height: "100%", objectFit: "contain" }} src={/^https?:\/\//.test(value) ? value : "/images/" + value + ".jpg"} alt={`${p.name} image ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="pdp-photo"
              onClick={() => setZoom(true)}
              aria-label={"Enlarge image of " + p.name}
            >
              <img src={image} alt={p.name} />
              {images.length > 1 && <>
                <button type="button" className="pdp-carousel-arrow pdp-carousel-prev" aria-label="Previous product image" onClick={(event) => { event.stopPropagation(); setSelectedImage((selectedImage - 1 + images.length) % images.length); }}><ChevronLeft size={20} /></button>
                <button type="button" className="pdp-carousel-arrow pdp-carousel-next" aria-label="Next product image" onClick={(event) => { event.stopPropagation(); setSelectedImage((selectedImage + 1) % images.length); }}><ChevronRight size={20} /></button>
              </>}
              {p.old > p.price && (
                <span className="pdp-sale">
                  Save {Math.round((1 - p.price / p.old) * 100)}%
                </span>
              )}
              <span className="pdp-zoom">
                <ZoomIn size={18} />
                View image
              </span>
            </div>
          </div>
        </div>
        <div className="pdp-info">
          <span className="pdp-category">{p.category}</span>
          <h1>{p.name}</h1>
          <div className="pdp-pricing" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <strong style={{ fontSize: 28, fontWeight: 700, color: "#1e293b" }}>{money(displayPrice)}</strong>
            {p.old > displayPrice && <del style={{ fontSize: 16, color: "#94a3b8" }}>{money(p.old)}</del>}
            {(p.old > displayPrice || offer) && (
              <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 13, fontWeight: 600, padding: "3px 9px", borderRadius: 4 }}>
                You save {money(offer ? offer.saving : p.old - displayPrice)}
              </span>
            )}
            <button className="pdp-review-summary" type="button" onClick={() => { setActiveTab("reviews"); document.getElementById("product-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} aria-label={`View ${reviewCount} product reviews`} style={{ marginLeft: "auto", margin: 0, padding: 0 }}>
              <span style={{ color: "#d97706" }}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={15} fill="currentColor" />)}</span>
              <b style={{ marginLeft: 4 }}>{averageRating}</b> <u style={{ marginLeft: 4 }}>{reviewCount} {reviewCount === 1 ? "review" : "reviews"}</u>
            </button>
          </div>
          <section className="pdp-deal-box" aria-label="Product offer">
            <div className="pdp-deal-strip" style={{ background: "#ff0000", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 4, overflow: "hidden", height: 38 }}>
              <strong style={{ background: "#facc15", color: "#b91c1c", fontStyle: "italic", fontSize: 13, fontWeight: 900, padding: "0 12px", height: "100%", display: "flex", alignItems: "center" }}>LIGHTNING DEAL</strong>
              <span style={{ fontSize: 13, fontWeight: 700, paddingRight: 16 }}><Check size={15} /> Free shipping over PKR 150</span>
            </div>

            {hasColourVariants && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
                  Color: <strong>{p.color || "Black"}</strong>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {childColourVariants.map((variant) => {
                    const value = variant.image;
                    const src = /^https?:\/\//.test(value) ? value : "/images/" + value + ".jpg";
                    const selected = variant.id === p.id;
                    return (
                      <a
                        key={variant.id}
                        href={"/product/" + variant.id}
                        style={{ border: selected ? "2px solid #000000" : "1px solid #e2e8f0", borderRadius: 6, padding: 3, width: 62, textAlign: "center", background: "#f8fafc", textDecoration: "none" }}
                      >
                        <img src={src} alt={variant.color || variant.name} style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 4 }} />
                        <span style={{ display: "block", fontSize: 11, fontWeight: selected ? 700 : 400, color: "#334155", marginTop: 2 }}>{variant.color || "Variant"}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {hasSizeOptions && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
                  Size: <strong>{size}</strong>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {sizeOptions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      style={{ border: s === size ? "2px solid #000000" : "1px solid #cbd5e1", borderRadius: 18, padding: "5px 16px", background: "#ffffff", fontSize: 13, fontWeight: s === size ? 700 : 500, color: "#1e293b", cursor: "pointer" }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 22 }}>
              <button
                type="button"
                style={{ width: "100%", height: 48, background: "#ff5000", color: "#ffffff", borderRadius: 24, fontSize: 15, fontWeight: 700, border: 0, cursor: "pointer", boxShadow: "0 4px 12px rgba(255,80,0,.25)" }}
                disabled={!inStock || !selectedInStock}
                onClick={add}
              >
                Add to cart
              </button>
              <button
                type="button"
                className="pdp-buy-pulse"
                style={{ width: "100%", height: 48, background: "#ff5000", color: "#ffffff", borderRadius: 24, fontSize: 15, fontWeight: 700, border: 0, cursor: "pointer" }}
                disabled={!inStock || !selectedInStock}
                onClick={() => setCheckoutOpen(true)}
              >
                Buy It Now
              </button>
            </div>

            <div className="pdp-deal-trust" style={{ marginTop: 20 }}>
              <p style={{ color: "#166534", fontSize: 13 }}><Truck size={17} /> <b>Free shipping over PKR 150 orders</b> <ChevronRight size={14} /></p>
              <p style={{ color: "#1e293b", fontSize: 13 }}><ShieldCheck size={17} /> <b>Safe payments · Secure privacy</b> <ChevronRight size={14} /></p>
              <p style={{ color: "#1e293b", fontSize: 13 }}><RotateCcw size={17} /> <b>Order Guarantee</b> <ChevronRight size={14} /></p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                <span style={{ background: "#16a34a", color: "#fff", padding: "3px 8px", borderRadius: 3, fontSize: 11, fontWeight: 600 }}>Return if item damaged</span>
                <span style={{ background: "#16a34a", color: "#fff", padding: "3px 8px", borderRadius: 3, fontSize: 11, fontWeight: 600 }}>15-day no update refund</span>
                <span style={{ background: "#16a34a", color: "#fff", padding: "3px 8px", borderRadius: 3, fontSize: 11, fontWeight: 600 }}>30-day no delivery refund</span>
              </div>
            </div>
          </section>
          {offer && countdown && (
            <div className="pdp-offer-counter" aria-label="Offer countdown">
              <b>Offer ends in</b>
              <div>
                {countdown.map((item) => (
                  <span key={item.label}>
                    <strong>{String(item.value).padStart(2, "0")}</strong>
                    <small>{item.label}</small>
                  </span>
                ))}
              </div>
            </div>
          )}
          {!inStock && <p className="pdp-order-message" role="status">Out of stock. This product is currently disabled from ordering.</p>}

          {!!p.bundles?.length && <div className="pdp-bundles"><b>Choose your offer</b><div>{p.bundles.map((bundle, index) => { const regular = p.price * bundle.quantity; const saving = regular > bundle.price ? Math.round((1 - bundle.price / regular) * 100) : 0; return <button type="button" className={selectedBundle === index ? "selected" : ""} key={bundle.id} onClick={() => setSelectedBundle(index)}><span><strong>Buy {index + 1} - Save {saving}%</strong> <small>(Pack of {bundle.quantity})</small><em>+ Free Shipping</em></span><span><strong>{money(bundle.price)}</strong><del>{money(regular)}</del></span>{bundle.content && <i>{bundle.content}</i>}{bundle.contentArabic && <i dir="rtl">{bundle.contentArabic}</i>}</button>; })}</div></div>}
          {hasSizeOptions ? null : (
            <>
              <form className="pdp-order-form" onSubmit={async (event) => { event.preventDefault(); if (!inStock || !selectedInStock) { setOrderMessage("This colour or variant is out of stock."); return; } setOrderBusy(true); setOrderMessage(""); const form = new FormData(event.currentTarget); try { const bundle = p.bundles?.[selectedBundle]; const orderQty = Math.min(bundle?.quantity || qty, stockForSize("Standard")); const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), phone: form.get("phone"), city: form.get("city"), address: form.get("address"), items: [{ id: p.id, qty: orderQty, size: "Standard" }] }) }); const data: any = await response.json(); if (!response.ok) throw Error(data.error || "Unable to place order."); setOrderMessage(`Order placed successfully! (${p.color ? `Color: ${p.color}, ` : ''}Qty: ${orderQty}). Ref: ${data.id}`); event.currentTarget.reset(); } catch (error) { setOrderMessage(error instanceof Error ? error.message : "Unable to place order."); } finally { setOrderBusy(false); } }}>
                <header>
                  <h2>2. Quick Order & Delivery Detail</h2>
                  <p>Fill out the form below to order with your selected options!</p>
                </header>
                <div className="pdp-order-fields">
                  <label>Full name<input name="name" required placeholder="Full name" disabled={!inStock || !selectedInStock} /></label>
                  <label>Phone number<input name="phone" required type="tel" pattern="(03[0-9]{9}|\+923[0-9]{9})" placeholder="03XXXXXXXXX" disabled={!inStock || !selectedInStock} /></label>
                  <label>Province / state<input name="state" required placeholder="Province or state" disabled={!inStock || !selectedInStock} /></label>
                  <label>City<input name="city" required placeholder="City" disabled={!inStock || !selectedInStock} /></label>
                  <label className="wide">Complete address<textarea name="address" required minLength={8} placeholder="House number, street, area" disabled={!inStock || !selectedInStock} /></label>
                </div>
                <fieldset disabled={!inStock || !selectedInStock}>
                  <legend>Payment methods</legend>
                  <label className="cod-highlight">
                    <input type="radio" defaultChecked name="payment" />
                    <span><b>Cash on Delivery</b><small>Available across Pakistan</small></span>
                  </label>
                </fieldset>
                {orderMessage && <p className="pdp-order-message" role="status">{orderMessage}</p>}
                <button className={orderBusy ? "pdp-place-order is-loading" : orderMessage ? "pdp-place-order is-success" : "pdp-place-order"} disabled={!inStock || !selectedInStock || orderBusy || !!orderMessage}>
                  {!inStock || !selectedInStock ? "Out of stock" : orderBusy ? <><span className="pdp-order-spinner" /> Placing order…</> : orderMessage ? "✓ Order placed" : `Confirm & Place Order (${qty} item${qty > 1 ? 's' : ''})`}
                </button>
              </form>
              <div className="pdp-options" style={{ display: "flex", flexDirection: "column", gap: 14, background: "#f8fafc", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", margin: 0 }}>1. Choose Options</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
                  {p.color && (
                    <div style={{ flex: "1 1 150px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#56667e" }}>Colour Confirmation</span>
                      <div style={{ padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 6, background: "#ffffff", fontSize: 13, fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
                        <Check size={14} style={{ color: "#166534" }} /> {p.color}
                      </div>
                    </div>
                  )}
                  <label style={{ flex: "1 1 150px", margin: 0 }}>
                    <span style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <b>Quantity Confirmation</b>
                      <span style={{ fontSize: 11, color: "#166534", fontWeight: 600 }}>✓ Qty: {qty}</span>
                    </span>
                    <div className="quantity">
                      <button
                        type="button"
                        disabled={qty <= 1}
                        aria-label="Decrease quantity"
                        onClick={() => { setQty(qty - 1); setOrderMessage(""); }}
                      >
                        <Minus size={16} />
                      </button>
                      <span aria-live="polite">{qty}</span>
                      <button
                        type="button"
                        disabled={qty >= quantityLimit}
                        aria-label="Increase quantity"
                        onClick={() => { setQty(qty + 1); setOrderMessage(""); }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </label>
                  <button
                    type="button"
                    className={"pdp-save " + (saved ? "is-saved" : "")}
                    onClick={favorite}
                    aria-pressed={saved}
                    style={{ height: 42 }}
                  >
                    <Heart size={19} fill={saved ? "currentColor" : "none"} />
                    {saved ? "Saved" : "Save item"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "#475569", background: "#ffffff", padding: "8px 12px", borderRadius: 6, border: "1px dashed #cbd5e1", marginTop: 4 }}>
                  <span><b>Confirmed Selection:</b></span>
                  {p.color && <span>Colour: <strong>{p.color}</strong></span>}
                  <span>Quantity: <strong>{qty}</strong></span>
                  <span>Total Price: <strong style={{ color: "#203664" }}>{money(displayPrice * qty)}</strong></span>
                </div>
              </div>
            </>
          )}
          {/* Delivery details are shown in the checkout form. */}{false && <div className="pdp-delivery">
            <Truck size={23} />
            <div>
              <b>
                {delivery === 0
                  ? "This selection qualifies for free delivery"
                  : "Delivery across Pakistan"}
              </b>
              <p>
                {delivery === 0
                  ? "No delivery charge on these items."
                  : money(config.deliveryCharge) +
                    " delivery · Free from " +
                    money(config.freeThreshold)}
              </p>
              <small>Final delivery charges appear at checkout.</small>
            </div>
          </div>}
          {false && <div className="pdp-assurance">
            <ShieldCheck size={19} />
            <span>Cash on delivery</span>
            <span>•</span>
            <span>Account-protected checkout</span>
          </div>}
          {config.whatsapp && (
            <a
              className="pdp-question"
              href={
                "https://wa.me/" +
                config.whatsapp +
                "?text=" +
                encodeURIComponent("I have a question about " + p.name)
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={18} />
              Ask about this product
            </a>
          )}
          {false && <p className="pdp-preview">
            Preview product · Checkout saves a test order. No payment is
            collected and no shipment is booked.
          </p>}
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="pdp-tabs" id="product-tabs">
        <TabsList className="pdp-tablist">
          <TabsTrigger value="details">Product details</TabsTrigger>
          <TabsTrigger value="delivery">Delivery & payment</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <div className="pdp-tabgrid">
            <div>
              <h2>About this product</h2>
              <p>{p.description}</p>
              {p.features.length > 0 && (
                <>
                  <h3>Key features</h3>
                  <ul>
                    {p.features.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="pdp-facts">
              <h3>At a glance</h3>
              <dl>
                <div>
                  <dt>Product reference</dt>
                  <dd>{p.id}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{p.category}</dd>
                </div>
                <div>
                  <dt>Price</dt>
                  <dd>{money(displayPrice)}</dd>
                </div>
                {p.category === "Fashion" && (
                  <div>
                    <dt>Selected size</dt>
                    <dd>EU {size}</dd>
                  </div>
                )}
                <div>
                  <dt>Payment</dt>
                  <dd>Cash on delivery</dd>
                </div>
              </dl>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="delivery">
          <h2>Delivered to your doorstep</h2>
          <p>
            Delivery is {money(config.deliveryCharge)} per order, or free when
            your order reaches {money(config.freeThreshold)}. All prices are in
            Pakistani rupees.
          </p>
          <p>
            Choose cash on delivery at checkout. Sign in and activate your
            account before checkout. Delivery estimates and service areas will
            be confirmed when a courier is connected.
          </p>
          <a href="/delivery" className="underlink">
            Delivery information <ArrowRight size={16} />
          </a>
        </TabsContent>
        <TabsContent value="reviews">
          <div className="pdp-reviews-head">
            <div>
              <h2>Customer reviews</h2>
              <div className="pdp-rating"><span>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={18} fill={n <= Math.round(Number(averageRating)) ? "currentColor" : "none"} />)}</span><b>{averageRating} out of 5</b><small>Based on {reviewCount} {reviewCount === 1 ? "review" : "reviews"}</small></div>
            </div>
          </div>
          <div className="pdp-reviews-list">
            {reviews.map((review) => <article className="pdp-review" key={(review as any).id || review.name}><div className="pdp-review-top"><b>{review.name}</b><small>{review.date}</small></div><div className="pdp-review-stars">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={15} fill={n <= review.rating ? "currentColor" : "none"} />)}</div><p>{review.text}</p></article>)}
          </div>
        </TabsContent>
        <TabsContent value="returns">
          <h2>Returns & exchanges</h2>
          <p>
            This store currently accepts test orders only. The final return
            window, eligibility and return address will be published before live
            sales begin.
          </p>
          <p>
            For a product question, visit our contact page. Keep your order
            reference available when asking about an order.
          </p>
          <a href="/returns" className="underlink">
            Read return information <ArrowRight size={16} />
          </a>
        </TabsContent>
      </Tabs>
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="pdp-lightbox">
          <DialogTitle>{p.name}</DialogTitle>
          <DialogDescription>Enlarged product image</DialogDescription>
          <img src={image} alt={p.name} />
        </DialogContent>
      </Dialog>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="checkout-modal-content">
          <div className="checkout-modal-header">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#0f172a" }}>Cash on Delivery ( {qty} item{qty > 1 ? "s" : ""} )</h2>
                <span style={{ fontSize: 11, background: "#15803d", color: "#ffffff", padding: "2px 8px", borderRadius: 12, fontWeight: 700 }}>
                  🇵🇰 Pakistan
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                Pay cash at your doorstep · No advance payment needed
              </p>
            </div>
          </div>
          <DialogDescription className="sr-only">Quick checkout popup for {p.name}</DialogDescription>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!inStock || !selectedInStock) {
                setOrderMessage("This product is out of stock.");
                return;
              }
              const form = new FormData(event.currentTarget);
              const phoneRaw = String(form.get("phone") || "");
              const phone = cleanPakistanPhone(phoneRaw);
              if (!isValidPakistanPhone(phone)) {
                setOrderMessage("Please enter a valid Pakistani mobile number (e.g. 0300 1234567).");
                return;
              }
              setOrderBusy(true);
              setOrderMessage("");
              try {
                const bundle = p.bundles?.[selectedBundle];
                const orderQty = Math.min(bundle?.quantity || qty, stockForSize(size || "Standard"));
                const address = String(form.get("address") || "").trim();
                const landmark = String(form.get("landmark") || "").trim();
                const fullAddress = landmark ? `${address} (Near: ${landmark})` : address;

                const cityVal = selectedCity === "Other" ? customCity.trim() : (selectedCity || String(form.get("city") || "")).trim();
                if (!cityVal) {
                  setOrderMessage("Please select or enter your city.");
                  return;
                }
                const response = await fetch("/api/orders", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: String(form.get("name") || "").trim(),
                    phone,
                    state: selectedProvince || form.get("state"),
                    province: selectedProvince || form.get("state"),
                    city: cityVal,
                    address: fullAddress,
                    landmark,
                    paymentMethod,
                    items: [{ id: p.id, qty: orderQty, size: size || "Standard" }],
                  }),
                });
                const data: any = await response.json();
                if (!response.ok) throw Error(data.error || "Unable to place order.");
                setOrderMessage(`Order placed successfully! Reference: ${data.id}`);
                setTimeout(() => { setCheckoutOpen(false); setOrderMessage(""); }, 2200);
              } catch (error) {
                setOrderMessage(error instanceof Error ? error.message : "Unable to place order.");
              } finally {
                setOrderBusy(false);
              }
            }}
          >
            <div className="checkout-modal-product">
              <div style={{ position: "relative" }}>
                <img src={image} alt={p.name} />
                <span style={{ position: "absolute", top: -6, left: -6, background: "#1e293b", color: "#ffffff", fontSize: 11, fontWeight: 700, width: 20, height: 20, borderRadius: "50%", display: "grid", placeItems: "center" }}>{qty}</span>
              </div>
              <div style={{ fontSize: 12, color: "#334155" }}>
                <b style={{ display: "block", fontSize: 13, color: "#0f172a" }}>{p.name}</b>
                {hasSizeOptions && <div>Size: <strong>{size}</strong></div>}
                {p.color && <div>Color: <strong>{p.color}</strong></div>}
                <div style={{ color: "#ff5000", fontWeight: 700, marginTop: 2 }}>{money(displayPrice)} each</div>
              </div>
            </div>

            <div className="checkout-modal-summary">
              <div className="checkout-modal-summary-line">
                <span>Subtotal:</span>
                <b>{money(cost)}</b>
              </div>
              <div className="checkout-modal-summary-line">
                <span>Shipping across Pakistan:</span>
                <b style={{ color: delivery === 0 ? "#16a34a" : "#0f172a" }}>{delivery === 0 ? "FREE" : money(delivery)}</b>
              </div>
              <div className="checkout-modal-shipping-banner" style={{ background: delivery === 0 ? "#15803d" : "#0f172a" }}>
                {delivery === 0 ? "🎉 FREE Shipping applied for your order!" : `Delivery charges apply on orders below ${money(config.freeThreshold)}`}
              </div>
              <div className="checkout-modal-total">
                <span>Grand Total (Pay on Delivery):</span>
                <b style={{ color: "#ff5000", fontSize: 17 }}>{money(cost + delivery)}</b>
              </div>
            </div>

            <div className="checkout-modal-fields">
              <label>
                Full Name / پورا نام *
                <input name="name" required minLength={2} maxLength={80} placeholder="e.g. Muhammad Ali" />
              </label>
              <label>
                Mobile Number / موبائل نمبر *
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 10px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#1e293b" }}>🇵🇰 +92</span>
                  <input name="phone" required type="tel" pattern="(03[0-9]{9}|[+]923[0-9]{9}|3[0-9]{9})" placeholder="0300 1234567" style={{ flex: 1 }} />
                </div>
              </label>
              <label>
                Province / صوبہ *
                <select
                  name="state"
                  required
                  value={selectedProvince}
                  onChange={(e) => {
                    setSelectedProvince(e.target.value);
                    setSelectedCity("");
                    setCustomCity("");
                  }}
                  style={{ background: "#ffffff" }}
                >
                  {PAKISTAN_PROVINCES.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                City / شہر *
                <select
                  name="city"
                  required
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value);
                    if (e.target.value !== "Other") {
                      setCustomCity("");
                    }
                  }}
                  style={{ background: "#ffffff" }}
                >
                  <option value="">Select City / شہر منتخب کریں</option>
                  {(PAKISTAN_CITIES_BY_PROVINCE[selectedProvince] || ALL_PAKISTAN_CITIES).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="Other">Other City / دوسرا شہر</option>
                </select>
              </label>

              {selectedCity === "Other" && (
                <label className="checkout-modal-wide">
                  Enter City Name / شہر کا نام *
                  <input
                    name="customCity"
                    required
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    placeholder="Type your city or town name"
                    autoFocus
                  />
                </label>
              )}

              <label className="checkout-modal-wide">
                Complete Delivery Address / مکمل پتہ *
                <textarea name="address" required minLength={8} placeholder="House/Flat #, Street #, Sector/Colony/Area" rows={2} />
              </label>
              <label className="checkout-modal-wide">
                Famous Landmark / قریبی مشہور جگہ (Optional)
                <input name="landmark" placeholder="e.g. Near Bilal Masjid, Main Market, Bank Alfalah" />
              </label>
            </div>

            <div className="checkout-payment-options">
              <div className="checkout-payment-option selected" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#15803d" }}>
                    <Truck size={20} style={{ color: "#15803d" }} />
                    <span>Cash on Delivery (COD) · کیش آن ڈیلیوری</span>
                  </div>
                  <span style={{ fontSize: 11, background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                    ✓ Pay at Doorstep
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 400, lineHeight: 1.4 }}>
                  Pay cash to courier when parcel arrives. Estimated delivery: 2-4 working days across Pakistan (TCS / Leopards / Trax).
                </div>
              </div>
            </div>

            {orderMessage && (
              <p style={{ padding: "10px 14px", borderRadius: 8, background: orderMessage.includes("Reference") ? "#f0fdf4" : "#fef2f2", color: orderMessage.includes("Reference") ? "#166534" : "#991b1b", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
                {orderMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={orderBusy}
              style={{ width: "100%", height: 50, background: "linear-gradient(135deg, #ff5000 0%, #e04400 100%)", color: "#ffffff", borderRadius: 25, fontSize: 16, fontWeight: 800, border: 0, cursor: "pointer", marginBottom: 10, boxShadow: "0 6px 16px rgba(255,80,0,.3)" }}
            >
              {orderBusy ? "Placing Order…" : `Complete Order (Cash on Delivery) · ${money(cost + delivery)}`}
            </button>

            {config.whatsapp && (
              <a
                href={"https://wa.me/" + config.whatsapp.replace(/[^\d]/g, "") + "?text=" + encodeURIComponent(`Assalam o Alaikum! I want to order from Zeliy Pakistan:\n*Product:* ${p.name}\n*Quantity:* ${qty}${hasSizeOptions ? `\n*Size:* ${size}` : ""}\n*Total:* ${money(cost + delivery)}\n*Payment:* Cash on Delivery`)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: "100%", height: 48, background: "#25d366", color: "#ffffff", borderRadius: 24, fontSize: 15, fontWeight: 700, border: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none" }}
              >
                <MessageCircle size={19} /> Order via WhatsApp / واٹس ایپ پر آرڈر کریں
              </a>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
function PakistanDropdown({ name, label, options }: { name: string; label: string; options: string[] }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => { const close = (event: MouseEvent) => { if (!wrapper.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  return <div ref={wrapper} onMouseLeave={() => setOpen(false)} className="pdp-dropdown-field"><label>{label}<button type="button" className="pdp-dropdown-trigger" onClick={() => setOpen(!open)}>{value || `Select ${label.toLowerCase()}`}<ChevronRight size={16} className={open ? "pdp-dropdown-arrow open" : "pdp-dropdown-arrow"} /></button></label><input type="hidden" name={name} value={value} required />{open && <div className="pdp-dropdown-menu">{options.map(option => <button type="button" className={option === value ? "active" : ""} key={option} onClick={() => { setValue(option); setOpen(false); }}>{option}</button>)}</div>}</div>
}
