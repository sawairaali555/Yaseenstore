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
import { productImage } from '@/lib/product-image';
import { saveShoppingData } from '@/lib/shopping-storage';
import { getSizesForColor, getVariantAvailableStock, isProductPurchasable, getSizeAvailabilityDetails } from '@/lib/inventory-engine';
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
  add: (quantity?: number, bundleId?: string, color?: string, variantId?: string) => void;
  buy: () => void;
};
const detectClientSource = () => {
  if (typeof window === "undefined") return "Web Store";
  const params = new URLSearchParams(window.location.search);
  const utm = params.get("utm_source") || params.get("source") || params.get("ref");
  if (utm) {
    const u = utm.toLowerCase();
    if (u.includes("wa") || u.includes("whatsapp")) return "WhatsApp";
    if (u.includes("ig") || u.includes("insta")) return "Instagram";
    if (u.includes("fb") || u.includes("facebook")) return "Facebook";
    if (u.includes("tiktok") || u.includes("tt")) return "TikTok";
    return utm;
  }
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  return isMobile ? "Mobile Web" : "Web Store";
};

const sampleReviews = [
  { name: "Ayesha K.", rating: 5, text: "Really happy with the quality. It looks just like the photos and arrived neatly packed.", date: "2 weeks ago" },
  { name: "Hamza R.", rating: 4, text: "Good value for the price and delivery was quick. I would buy this again.", date: "1 month ago" },
  { name: "Sana M.", rating: 5, text: "A lovely everyday product. Easy to use and exactly what I was looking for.", date: "2 months ago" },
];
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
const renderRichDescription = (value = "") => {
  const allowedTags = new Set(["P", "BR", "H2", "H3", "H4", "UL", "OL", "LI", "STRONG", "B", "EM", "I", "U", "DEL", "S", "BLOCKQUOTE", "PRE", "CODE", "A", "IMG"]);
  const allowedAttrs = new Set(["A:href", "A:target", "IMG:src", "IMG:alt"]);
  if (typeof DOMParser === "undefined") {
    return value
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<\/?(?:script|style|iframe|object|embed|form|meta|link)[^>]*>/gi, "")
      .replace(/<[^>]*>/g, (tag) => tag.replace(/\s+[^\s=>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/g, ""));
  }
  const doc = new DOMParser().parseFromString(`<div>${value}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";
  root.querySelectorAll("*").forEach((node) => {
    if (!allowedTags.has(node.tagName)) {
      node.replaceWith(...Array.from(node.childNodes));
      return;
    }
    Array.from(node.attributes).forEach((attribute) => {
      const key = `${node.tagName}:${attribute.name.toLowerCase()}`;
      if (attribute.name.toLowerCase().startsWith("on") || !allowedAttrs.has(key)) node.removeAttribute(attribute.name);
    });
    if (node.tagName === "A") {
      const href = node.getAttribute("href") || "";
      if (!/^(https?:\/\/|\/)/i.test(href) || /^\s*javascript:/i.test(href)) node.removeAttribute("href");
      if (node.getAttribute("target") === "_blank") node.setAttribute("rel", "noopener noreferrer");
    }
    if (node.tagName === "IMG") {
      const src = node.getAttribute("src") || "";
      if (!/^(https?:\/\/|\/api\/media\/|\/images\/)/i.test(src)) node.removeAttribute("src");
    }
  });
  return root.innerHTML;
};
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
  const [orderSucceeded, setOrderSucceeded] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [now, setNow] = useState(() => new Date());
  const configuredColorOptions = Array.from(new Set([
    ...(p.variantOptions?.find(option => option.name.toLowerCase() === "color")?.values || []),
    ...Object.keys(p.colorGalleries || {}),
    ...(p.variants || []).map(variant => variant.color || ""),
  ].filter(Boolean)));
  const colorOptions = configuredColorOptions.filter(color =>
    getSizesForColor(p, color, false).some(size =>
      p.allowBackorders || getVariantAvailableStock(p, null, size, color) > 0
    )
  );
  const [selectedColor, setSelectedColor] = useState(
    colorOptions.find(color => color.toLowerCase() === (p.color || "").toLowerCase()) || colorOptions[0] || ""
  );
  const selectedGallery = Object.entries(p.colorGalleries || {}).find(([color]) => color.toLowerCase() === selectedColor.toLowerCase())?.[1];
  const selectedVariantImages = (p.variants || [])
    .filter(variant => (variant.color || "").toLowerCase() === selectedColor.toLowerCase())
    .flatMap(variant => [variant.image, ...(variant.images || [])]);
  const colorImages = [selectedGallery?.mainImage, ...(selectedGallery?.images || []), ...selectedVariantImages].filter((value): value is string => Boolean(value));
  const images = Array.from(new Set(colorImages.length ? colorImages : [p.image, ...(p.images || [])].filter(Boolean)));
  const [selectedImage, setSelectedImage] = useState(0);
  const imageValue = images[selectedImage] || images[0] || p.image;
  const image = productImage(imageValue);
  const isBundlePricing = p.pricingType === "bundle" && Boolean(p.bundles?.length);
  const bundleSelection = p.bundles?.[selectedBundle];
  const offer = activeOffer(p, now);
  const selectedVariant = p.variants?.find(variant => (variant.size || 'Standard') === size &&
    (!selectedColor || (variant.color || '').toLowerCase() === selectedColor.toLowerCase()));
  const displayPrice = isBundlePricing
    ? (bundleSelection?.price || effectivePrice(p, now))
    : (selectedVariant?.price && selectedVariant.price > 0 ? selectedVariant.price : effectivePrice(p, now));
  const cost = isBundlePricing ? displayPrice : displayPrice * qty;
  const purchaseQty = isBundlePricing ? (bundleSelection?.quantity || 1) : qty;
  const comparePrice = (p.old > p.price ? p.old : p.price) * (isBundlePricing ? purchaseQty : 1);
  const priceSaving = Math.max(0, comparePrice - displayPrice);
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
  const allSizeOptions = getSizesForColor(p, selectedColor, true);
  const sizeStock = p.sizeStock;
  const hasSizeStock = !!sizeStock && Object.keys(sizeStock).length > 0;
  const configuredSizes = hasSizeStock ? allSizeOptions.filter(s => Object.prototype.hasOwnProperty.call(sizeStock, s)) : allSizeOptions;
  const sizeOptions = configuredSizes.filter(s =>
    p.allowBackorders || getVariantAvailableStock(p, null, s, selectedColor) > 0
  );
  const hasSizeOptions = sizeOptions.length > 1 || (sizeOptions.length === 1 && sizeOptions[0] !== "Standard");
  const richDescription = renderRichDescription(p.description || "");

  const stockForSize = (selected: string) => p.allowBackorders ? 50 : getVariantAvailableStock(p, null, selected, selectedColor);
  const inStock = isProductPurchasable(p);
  const selectedInStock = getSizeAvailabilityDetails(p, hasSizeOptions ? size : 'Standard', selectedColor).isPurchasable;
  const availableForSelected = stockForSize(hasSizeOptions ? size : "Standard");
  const quantityLimit = Math.max(0, Math.min(10, availableForSelected));

  useEffect(() => {
    const nextQty = Math.min(Math.max(qty, 1), Math.max(1, quantityLimit));
    if (nextQty !== qty) setQty(nextQty);
  }, [selectedColor, size, quantityLimit, qty, setQty]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedVariant = p.variants?.find(variant => variant.id === params.get("variantId"));
    const requestedColor = requestedVariant?.color || params.get("color") || p.color || colorOptions[0] || "";
    const matchingColor = colorOptions.find(color => color.toLowerCase() === requestedColor.toLowerCase());
    const defaultColor = colorOptions.find(color => color.toLowerCase() === (p.color || "").toLowerCase()) || colorOptions[0] || "";
    const nextColor = matchingColor || defaultColor;
    const availableSizes = getSizesForColor(p, nextColor, true);
    const requestedSize = requestedVariant?.size || params.get("size") || "";
    const requestedSizeIsAvailable = availableSizes.includes(requestedSize) &&
      (p.allowBackorders || getVariantAvailableStock(p, null, requestedSize, nextColor) > 0);
    const nextSize = requestedSizeIsAvailable
      ? requestedSize
      : availableSizes.find(option => p.allowBackorders || getVariantAvailableStock(p, null, option, nextColor) > 0) ||
        availableSizes[0] || "Standard";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore the selected variant from the product URL.
    setSelectedColor(nextColor);
    setSelectedImage(0);
    setSize(nextSize);
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
    .filter((product) => isProductPurchasable(product))
    .filter((product, index, list) => list.findIndex((item) => item.id === product.id) === index);
  const childColourVariants = colourVariants;
  const hasColourVariants = colorOptions.length > 1 || childColourVariants.length > 0;
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
                  <img style={{ width: "100%", height: "100%", objectFit: "contain" }} src={productImage(value)} alt={`${p.name} image ${index + 1}`} />
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
            {priceSaving > 0 && <del style={{ fontSize: 16, color: "#94a3b8" }}>{money(comparePrice)}</del>}
            {(priceSaving > 0 || (!isBundlePricing && offer)) && (
              <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 13, fontWeight: 600, padding: "3px 9px", borderRadius: 4 }}>
                You save {money(!isBundlePricing && offer ? offer.saving : priceSaving)}
              </span>
            )}
            <button className="pdp-review-summary" type="button" onClick={() => { setActiveTab("reviews"); document.getElementById("product-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} aria-label={`View ${reviewCount} product reviews`} style={{ marginLeft: "auto", margin: 0, padding: 0 }}>
              <span style={{ color: "#d97706" }}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={15} fill="currentColor" />)}</span>
              <b style={{ marginLeft: 4 }}>{averageRating}</b> <u style={{ marginLeft: 4 }}>{reviewCount} {reviewCount === 1 ? "review" : "reviews"}</u>
            </button>
          </div>
          <section className="pdp-deal-box" aria-label="Product offer">
            {!isBundlePricing && <div className="pdp-deal-strip" style={{ background: "#ff0000", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 4, overflow: "hidden", height: 38 }}>
              <strong style={{ background: "#facc15", color: "#b91c1c", fontStyle: "italic", fontSize: 13, fontWeight: 900, padding: "0 12px", height: "100%", display: "flex", alignItems: "center" }}>LIGHTNING DEAL</strong>
              <span style={{ fontSize: 13, fontWeight: 700, paddingRight: 16 }}><Check size={15} /> Free shipping over PKR 3,000</span>
            </div>}

            {!isBundlePricing && hasColourVariants && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
                  Color: <strong>{selectedColor || "Standard"}</strong>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {colorOptions.length > 1 ? colorOptions.map((color) => {
                    const gallery = Object.entries(p.colorGalleries || {}).find(([name]) => name.toLowerCase() === color.toLowerCase())?.[1];
                    const variantImage = p.variants?.find(variant => (variant.color || "").toLowerCase() === color.toLowerCase() && (variant.image || variant.images?.length));
                    const src = productImage(gallery?.mainImage || gallery?.images?.[0] || variantImage?.image || variantImage?.images?.[0] || p.image);
                    const selected = color.toLowerCase() === selectedColor.toLowerCase();
                    return (
                      <button
                        type="button"
                        key={color}
                        aria-label={`Select ${color} colour`}
                        aria-pressed={selected}
                        onClick={() => {
                          setSelectedColor(color);
                          setSelectedImage(0);
                          const nextSizes = getSizesForColor(p, color, true);
                          const available = nextSizes.find(option => p.allowBackorders || getVariantAvailableStock(p, null, option, color) > 0);
                          setSize(available || nextSizes[0] || "Standard");
                          setQty(1);
                        }}
                        style={{ border: selected ? "2px solid #000000" : "1px solid #e2e8f0", borderRadius: 6, padding: 3, width: 62, textAlign: "center", background: "#f8fafc" }}
                      >
                        <img src={src} alt="" style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 4 }} />
                        <span style={{ display: "block", fontSize: 11, fontWeight: selected ? 700 : 400, color: "#334155", marginTop: 2 }}>{color}</span>
                      </button>
                    );
                  }) : childColourVariants.map((variant) => {
                    const value = variant.image;
                    const src = productImage(value);
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

            {!isBundlePricing && hasSizeOptions && (
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

            {!isBundlePricing && <div className="pdp-quantity-control" aria-label="Choose quantity">
              <span>Quantity</span>
              <button type="button" disabled={qty <= 1} aria-label="Decrease quantity" onClick={() => setQty(Math.max(1, qty - 1))}>
                <Minus size={16} />
              </button>
              <strong aria-live="polite">{qty}</strong>
              <button type="button" disabled={qty >= quantityLimit} aria-label="Increase quantity" onClick={() => setQty(Math.min(quantityLimit, qty + 1))}>
                <Plus size={16} />
              </button>
              <small>{quantityLimit > 0 ? `${quantityLimit} available` : "Out of stock"}</small>
            </div>}

            {isBundlePricing && (
              <div className="pdp-bundles">
                <div className="pdp-bundles-heading"><span>BUNDLE &amp; SAVE</span></div>
                <div className="pdp-bundle-options">
                  {p.bundles?.map((bundle, index) => {
                    const regular = (p.old > p.price ? p.old : p.price) * bundle.quantity;
                    const hasDiscount = regular > bundle.price;
                    return (
                      <button
                        type="button"
                        className={`pdp-bundle-option${selectedBundle === index ? " selected" : ""}`}
                        key={bundle.id}
                        onClick={() => setSelectedBundle(index)}
                        aria-pressed={selectedBundle === index}
                      >
                        {index === 1 && p.bundles.length > 1 && <span className="pdp-bundle-popular">Most Popular</span>}
                        <span className="pdp-bundle-radio" aria-hidden="true" />
                        <span className="pdp-bundle-copy">
                          <strong>{bundle.content?.trim() || `Buy ${bundle.quantity}`}</strong>
                          <small>{bundle.price >= config.freeThreshold ? "Free Shipping · " : ""}Pack of {bundle.quantity}</small>
                        </span>
                        <span className="pdp-bundle-prices">
                          <strong>{money(bundle.price)}</strong>
                          {hasDiscount && <del>{money(regular)}</del>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: isBundlePricing ? "1fr" : "1fr 1fr", gap: 14, marginTop: 14 }}>
              {!isBundlePricing && <button
                type="button"
                style={{ width: "100%", height: 48, background: "#ff5000", color: "#ffffff", borderRadius: 24, fontSize: 15, fontWeight: 700, border: 0, cursor: "pointer", boxShadow: "0 4px 12px rgba(255,80,0,.25)" }}
                disabled={!inStock || !selectedInStock}
                onClick={() => {
                  const bundle = p.bundles?.[selectedBundle];
                  add(bundle?.quantity || qty, bundle?.id, selectedColor, selectedVariant?.id);
                }}
              >
                Add to cart
              </button>}
              <button
                type="button"
                className={`pdp-buy-pulse${isBundlePricing ? " pdp-buy-bundle" : ""}`}
                style={{ width: "100%", height: 48, background: isBundlePricing ? "#080808" : "#ff5000", color: "#ffffff", borderRadius: isBundlePricing ? 8 : 24, fontSize: 15, fontWeight: 700, border: 0, cursor: "pointer" }}
                disabled={!inStock || (!isBundlePricing && !selectedInStock)}
                onClick={() => setCheckoutOpen(true)}
              >
                {isBundlePricing ? "Buy with Cash on Delivery" : "Buy It Now"}
              </button>
            </div>

            <div className="pdp-deal-trust" style={{ marginTop: 20 }}>
              <p style={{ color: "#166534", fontSize: 13 }}><Truck size={17} /> <b>Free shipping on orders over PKR 3,000</b> <ChevronRight size={14} /></p>
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
              <div className="pdp-rich-description" dangerouslySetInnerHTML={{ __html: richDescription }} />
              {(p.features?.length ?? 0) > 0 && (
                <>
                  <h3>Key features</h3>
                  <ul>
                    {p.features!.map((f, i) => (
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
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#0f172a" }}>Cash on Delivery ( {purchaseQty} item{purchaseQty > 1 ? "s" : ""} )</h2>
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
              if (orderBusy) return;
              if (!inStock || !selectedInStock) {
                setOrderMessage("This product is out of stock.");
                return;
              }
              const form = new FormData(event.currentTarget);
              const phoneRaw = String(form.get("phone") || "");
              const localPhone = phoneRaw.replace(/\D/g, "");
              const phone = cleanPakistanPhone(localPhone);
              if (!/^03\d{9}$/.test(localPhone) || !isValidPakistanPhone(phone)) {
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
                    source: detectClientSource(),
                    items: [{ id: p.id, qty: orderQty, size: size || "Standard", color: selectedColor, variantId: selectedVariant?.id, bundleId: bundle?.id }],
                  }),
                });
                const data: any = await response.json();
                if (!response.ok) throw Error(data.error || "Unable to place order.");
                saveShoppingData('cartify-last-order', data);
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
                <span style={{ position: "absolute", top: -6, left: -6, background: "#1e293b", color: "#ffffff", fontSize: 11, fontWeight: 700, width: 20, height: 20, borderRadius: "50%", display: "grid", placeItems: "center" }}>{purchaseQty}</span>
              </div>
              <div style={{ fontSize: 12, color: "#334155" }}>
                <b style={{ display: "block", fontSize: 13, color: "#0f172a" }}>{p.name}</b>
                {hasSizeOptions && <div>Size: <strong>{size}</strong></div>}
                {selectedColor && <div>Color: <strong>{selectedColor}</strong></div>}
                <div style={{ color: "#ff5000", fontWeight: 700, marginTop: 2 }}>{money(displayPrice)} {isBundlePricing ? "bundle total" : "each"}</div>
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
                <input
                  name="phone"
                  required
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  pattern="03[0-9]{9}"
                  title="Enter an 11-digit Pakistani mobile number starting with 03"
                  placeholder="0300 1234567"
                  onChange={(event) => {
                    event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 11);
                  }}
                />
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
              className="checkout-complete-order"
              style={{ width: "100%", height: 50, background: "linear-gradient(135deg, #ff5000 0%, #e04400 100%)", color: "#ffffff", borderRadius: 25, fontSize: 16, fontWeight: 800, border: 0, cursor: "pointer", marginBottom: 14, boxShadow: "0 6px 16px rgba(255,80,0,.3)" }}
            >
              {orderBusy ? "Placing Order…" : `Complete Order (Cash on Delivery) · ${money(cost + delivery)}`}
            </button>

            {config.whatsapp && (
              <a
                href={"https://wa.me/" + config.whatsapp.replace(/[^\d]/g, "") + "?text=" + encodeURIComponent(`Assalam o Alaikum! I want to order from Zeliy Pakistan:\n*Product:* ${p.name}\n*Quantity:* ${purchaseQty}${hasSizeOptions ? `\n*Size:* ${size}` : ""}\n*Total:* ${money(cost + delivery)}\n*Payment:* Cash on Delivery`)}
                target="_blank"
                rel="noopener noreferrer"
                className="checkout-whatsapp-order"
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
