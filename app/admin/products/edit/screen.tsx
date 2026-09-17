"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  CheckCircle2,
  Image as ImageIcon,
  Moon,
  Search,
  Save,
  UserCircle,
} from "lucide-react";
import { categories, money, Product } from "@/app/catalog";
import type { ManagedProduct } from "@/lib/store-data";
import "./edit.css";

type Tab = "details" | "seo" | "reviews";
type Review = { id: string; name: string; rating: number; text: string; date: string };
type Bundle = { id: string; content: string; contentArabic: string; quantity: number; price: number };
type DealSettings = NonNullable<Product["deal"]>;
const imageUrl = (value: string) =>
  /^https?:\/\//.test(value) ? value : "/images/" + value + ".jpg";
function EditDropdown({ title, summary, open = false, children }: { title: string; summary?: string; open?: boolean; children: React.ReactNode }) {
  return <details className="edit-dropdown" open={open}><summary><span><b>{title}</b>{summary && <small>{summary}</small>}</span><ChevronDown size={16} /></summary><div className="edit-dropdown-body">{children}</div></details>;
}
export default function ProductEdit() {
  const [product, setProduct] = useState<ManagedProduct | null>(null),
    [tab, setTab] = useState<Tab>("details"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [reviews, setReviews] = useState<Review[]>([]),
    [pricingMode, setPricingMode] = useState<"group" | "option">("option"),
    [offerPrice, setOfferPrice] = useState(0),
    [offerStart, setOfferStart] = useState(""),
    [offerEnd, setOfferEnd] = useState(""),
    [deal, setDeal] = useState<DealSettings>({}),
    [pricingType, setPricingType] = useState<"offer" | "bundle">("offer"),
    [bundles, setBundles] = useState<Bundle[]>([]),
    [arabicName, setArabicName] = useState(""),
    [arabicDescription, setArabicDescription] = useState(""),
    [seo, setSeo] = useState({
      title: "",
      titleUrdu: "",
      keywords: "",
      keywordsUrdu: "",
      description: "",
      descriptionUrdu: "",
      tags: "",
      tagsUrdu: "",
    });
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("id");
    fetch("/api/admin")
      .then(async (r) => {
        const data: any = await r.json();
        if (!r.ok) throw Error(data.error);
        const found =
          (data.products || []).find(
            (item: ManagedProduct) => item.id === id,
          ) || data.products?.[0];
        setProduct(found || null);
        if (found?.seo) setSeo((current) => ({ ...current, ...found.seo }));
        setReviews(found?.reviews || []);
        setPricingMode(found?.pricingMode || "option");
        setOfferPrice(found?.offerPrice || 0);
        setOfferStart(found?.offerStart || "");
        setOfferEnd(found?.offerEnd || "");
        setDeal(found?.deal || {});
        setPricingType(found?.pricingType || "offer");
        setBundles(found?.bundles || []);
      })
      .catch((e) => setError(e.message));
  }, []);
  async function update(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    setBusy(true);
    setError("");
    try {
      const images = Array.from(
        new Set([product.image, ...(product.images || [])].filter(Boolean)),
      );
      const payload = {
        ...product,
        image: images[0] || product.image,
        images,
        seo,
        reviews,
        pricingMode,
        offerPrice,
        offerStart,
        offerEnd,
        deal,
        pricingType,
        bundles,
      };
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "product", product: payload }),
      });
      const data: any = await response.json();
      if (!response.ok)
        throw Error(
          data.error ||
            data.details?.[0]?.message ||
            `Unable to save product (${response.status}).`,
        );
      setProduct({ ...product, image: images[0] || product.image, images, seo });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update product.");
    } finally {
      setBusy(false);
    }
  }
  const editSeo = (key: keyof typeof seo, value: string) => {
    setSaved(false);
    setSeo({ ...seo, [key]: value });
  };
  if (!product)
    return (
      <main className="product-edit-page">
        <div className="product-edit-loading">
          {error || "Loading product details…"}
        </div>
      </main>
    );
  const images = [product.image, ...(product.images || [])].filter(Boolean);
  return (
    <main className="product-edit-page">
      <header className="product-edit-top">
        <a href="/admin?section=products" aria-label="Back to products">
          <ArrowLeft size={16} />
        </a>
        <span className="edit-avatar">D</span>
        <div>
          <small>Dressfair.pk</small>
          <b>Edit Detail</b>
        </div>
        <div className="edit-search">
          <Search size={14} />
          <input placeholder="Search orders, products, customers…" />
        </div>
        <div className="edit-actions">
          <Bell size={16} />
          <span>•••</span>
          <Moon size={16} />
          <UserCircle size={21} />
        </div>
      </header>
      <div className="edit-notice">
        <b>86%</b> · Next: Add a product <button>Setup</button>
        <button>Dismiss</button>
      </div>
      <form onSubmit={update} className="product-edit-form">
        <nav className="edit-tabs">
          <button
            type="button"
            className={tab === "details" ? "active" : ""}
            onClick={() => setTab("details")}
          >
            Product Details
          </button>
          <button
            type="button"
            className={tab === "seo" ? "active" : ""}
            onClick={() => setTab("seo")}
          >
            SEO Details
          </button>
          <button
            type="button"
            className={tab === "reviews" ? "active" : ""}
            onClick={() => setTab("reviews")}
          >
            Reviews
          </button>
        </nav>
        {tab === "details" && (
          <section className="edit-details">
            <EditDropdown title="Basic information" summary={product.name} open>
              <div className="edit-two">
                <label>
                  Brand
                  <input placeholder="Brand name" />
                </label>
                <label>
                  Gender
                  <div className="edit-select">
                    Choose a gender <ChevronDown size={14} />
                  </div>
                </label>
              </div>
              <label>
                English Title <span style={{ color: "#ef4444", fontWeight: "bold" }}>*</span>
                <input
                  required
                  value={product.name}
                  onChange={(e) =>
                    setProduct({ ...product, name: e.target.value })
                  }
                  placeholder="Enter English product title"
                />
              </label>
              <div className="urdu-input">
                <button type="button">Translate from English</button>
                <label>
                  Product Name (Urdu)
                  <input
                    dir="rtl"
                    value={arabicName}
                    onChange={(e) => setArabicName(e.target.value)}
                    placeholder="اسم المنتج باللغة العربية"
                  />
                </label>
              </div>
            </EditDropdown>
            <EditDropdown title="Pricing and offers" summary={money(product.price) + " sale price"}>
              <div className="pricing-switch"><label><input type="radio" checked={pricingMode === "group"} onChange={() => setPricingMode("group")} /> Group price</label><label><input type="radio" checked={pricingMode === "option"} onChange={() => setPricingMode("option")} /> Option wise price</label></div>
              <div className="edit-two"><label>Normal price<input type="number" min="1" value={product.old} onChange={e => { setProduct({...product,old:Number(e.target.value)}); setSaved(false); }} /></label><label>Sale price<input type="number" min="1" value={product.price} onChange={e => { setProduct({...product,price:Number(e.target.value)}); setSaved(false); }} /></label></div>
              <div className="edit-two"><label>Offer price<input type="number" min="0" value={offerPrice} onChange={e => { setOfferPrice(Number(e.target.value)); setSaved(false); }} /></label><label>Offer start<input type="date" value={offerStart} onChange={e => { setOfferStart(e.target.value); setSaved(false); }} /></label><label>Offer end<input type="date" value={offerEnd} onChange={e => { setOfferEnd(e.target.value); setSaved(false); }} /></label></div>
              <div className="pricing-switch"><label><input type="radio" checked={pricingType === "offer"} onChange={() => setPricingType("offer")} /> Offer price</label><label><input type="radio" checked={pricingType === "bundle"} onChange={() => { setPricingType("bundle"); if (!bundles.length) setBundles([{ id: crypto.randomUUID(), content: "", contentArabic: "", quantity: 1, price: product.price }]); }} /> Bundle price</label></div>
              {pricingType === "bundle" && <div className="bundle-editor">{bundles.map((bundle, index) => <div className="bundle-row" key={bundle.id}><input placeholder="Promotional content" value={bundle.content} onChange={e => { const n=[...bundles]; n[index]={...bundle,content:e.target.value}; setBundles(n); }} /><input dir="rtl" placeholder="Promotional content (Urdu)" value={bundle.contentArabic} onChange={e => { const n=[...bundles]; n[index]={...bundle,contentArabic:e.target.value}; setBundles(n); }} /><input type="number" min="1" placeholder="Quantity" value={bundle.quantity} onChange={e => { const n=[...bundles]; n[index]={...bundle,quantity:Number(e.target.value)}; setBundles(n); }} /><input type="number" min="0" placeholder="Price" value={bundle.price} onChange={e => { const n=[...bundles]; n[index]={...bundle,price:Number(e.target.value)}; setBundles(n); }} /><button type="button" onClick={() => setBundles(bundles.filter((_, i) => i !== index))}>Remove</button></div>)}<button type="button" className="edit-review-add" onClick={() => setBundles([...bundles,{id:crypto.randomUUID(),content:"",contentArabic:"",quantity:1,price:0}])}>+ Add bundle price</button></div>}
            </EditDropdown>
            <EditDropdown title="Storefront deal block" summary={deal.title || "Lightning deal"}>
              <div className="edit-two">
                <label>Deal title<input value={deal.title || ""} onChange={e => { setDeal({...deal,title:e.target.value}); setSaved(false); }} placeholder="Lightning deal" /></label>
                <label>CTA button<input value={deal.cta || ""} onChange={e => { setDeal({...deal,cta:e.target.value}); setSaved(false); }} placeholder="Add to cart" /></label>
              </div>
              <div className="edit-two">
                <label>Top badge 1<input value={deal.shippingBadge || ""} onChange={e => { setDeal({...deal,shippingBadge:e.target.value}); setSaved(false); }} placeholder="Free shipping" /></label>
                <label>Top badge 2<input value={deal.creditBadge || ""} onChange={e => { setDeal({...deal,creditBadge:e.target.value}); setSaved(false); }} placeholder="Delay credit" /></label>
              </div>
              <label>Applicable product note<input value={deal.productNote || ""} onChange={e => { setDeal({...deal,productNote:e.target.value}); setSaved(false); }} placeholder="Category, size, capacity or offer detail" /></label>
              <label>Delivery note<input value={deal.deliveryNote || ""} onChange={e => { setDeal({...deal,deliveryNote:e.target.value}); setSaved(false); }} placeholder="Delivery estimate: Sep 25-Oct 7" /></label>
              <div className="edit-two">
                <label>Trust row 1<input value={deal.trustShipping || ""} onChange={e => { setDeal({...deal,trustShipping:e.target.value}); setSaved(false); }} placeholder="Free shipping on eligible orders" /></label>
                <label>Trust row 2<input value={deal.trustPayment || ""} onChange={e => { setDeal({...deal,trustPayment:e.target.value}); setSaved(false); }} placeholder="Safe payments · Secure privacy" /></label>
              </div>
              <label>Trust row 3<input value={deal.trustGuarantee || ""} onChange={e => { setDeal({...deal,trustGuarantee:e.target.value}); setSaved(false); }} placeholder="Order guarantee" /></label>
              <label>Green chips<input value={(deal.chips || []).join(", ")} onChange={e => { setDeal({...deal,chips:e.target.value.split(",").map(chip => chip.trim()).filter(Boolean)}); setSaved(false); }} placeholder="Free returns, Delay credit, Return if item damaged" /></label>
            </EditDropdown>
            <EditDropdown title="Description" summary="English and Urdu product copy">
              <div className="edit-rich-grid">
                <RichField
                  label="Description"
                  value={product.description}
                  onChange={(value) =>
                    setProduct({ ...product, description: value })
                  }
                />
                <RichField
                  label="Description (Urdu)"
                  value={arabicDescription}
                  onChange={setArabicDescription}
                  rtl
                />
              </div>
            </EditDropdown>
            <EditDropdown title="Images" summary={`${images.length} image${images.length === 1 ? "" : "s"}`}>
              <div className="edit-image-strip">
                {images.slice(0, 4).map((image, index) => (
                  <div key={image + index}>
                    <img
                      src={imageUrl(image)}
                      alt={`${product.name} ${index + 1}`}
                    />
                    <small>
                      {index === 0 ? "Main image" : `Gallery ${index}`}
                    </small>
                  </div>
                ))}
                <a href={`/admin?section=products`}>
                  <ImageIcon size={18} />
                  Manage images
                </a>
              </div>
            </EditDropdown>
          </section>
        )}
        {tab === "seo" && (
          <section className="edit-panel seo-grid">
            <SeoField
              label="Meta Title"
              value={seo.title || product.name}
              onChange={(value) => editSeo("title", value)}
            />
            <SeoField
              label="Meta Title (Urdu)"
              value={seo.titleUrdu}
              onChange={(value) => editSeo("titleUrdu", value)}
              rtl
              placeholder="میٹا ٹائٹل"
            />
            <SeoField
              label="Meta Keywords"
              value={seo.keywords}
              onChange={(value) => editSeo("keywords", value)}
              multiline
              placeholder="product, category, keyword"
            />
            <SeoField
              label="Meta Keywords (Urdu)"
              value={seo.keywordsUrdu}
              onChange={(value) => editSeo("keywordsUrdu", value)}
              rtl
              multiline
              placeholder="پروڈکٹ، کیٹیگری، کلیدی لفظ"
            />
            <SeoField
              label="Meta Description"
              value={seo.description || product.description}
              onChange={(value) => editSeo("description", value)}
              multiline
            />
            <SeoField
              label="Meta Description (Urdu)"
              value={seo.descriptionUrdu}
              onChange={(value) => editSeo("descriptionUrdu", value)}
              rtl
              multiline
              placeholder="میٹا ڈسکرپشن"
            />
            <SeoField
              label="Product Tags"
              value={seo.tags}
              onChange={(value) => editSeo("tags", value)}
              multiline
              placeholder="Product tag"
            />
            <SeoField
              label="Product Tags (Urdu)"
              value={seo.tagsUrdu}
              onChange={(value) => editSeo("tagsUrdu", value)}
              rtl
              multiline
              placeholder="پروڈکٹ ٹیگز"
            />
          </section>
        )}
        {tab === "reviews" && (
          <section className="edit-panel admin-reviews">
            <h2>Product reviews</h2>
            <p>Add or remove sample customer reviews shown on the storefront.</p>
            {reviews.map((review, index) => <div className="admin-review-row" key={review.id}><input value={review.name} onChange={e => { const next=[...reviews]; next[index]={...review,name:e.target.value}; setReviews(next); setSaved(false); }} placeholder="Customer name" /><select value={review.rating} onChange={e => { const next=[...reviews]; next[index]={...review,rating:Number(e.target.value)}; setReviews(next); setSaved(false); }}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} stars</option>)}</select><textarea value={review.text} onChange={e => { const next=[...reviews]; next[index]={...review,text:e.target.value}; setReviews(next); setSaved(false); }} /><button type="button" onClick={() => { setReviews(reviews.filter((_,i)=>i!==index)); setSaved(false); }}>Remove</button></div>)}
            <button type="button" className="edit-review-add" onClick={() => { setReviews([...reviews,{id:crypto.randomUUID(),name:"",rating:5,text:"",date:"Just now"}]); setSaved(false); }}>+ Add review</button>
          </section>
        )}
        <footer className="edit-footer">
          <a href="/admin?section=products">Cancel</a>
          <button disabled={busy} className="edit-update">
            {saved && !busy ? <CheckCircle2 size={15} /> : <Save size={15} />}
            {busy ? "Updating…" : saved ? "Saved successfully" : "Update"}
          </button>
        </footer>
        {error && <p className="edit-error">{error}</p>}
      </form>
    </main>
  );
}
function RichField({
  label,
  value,
  onChange,
  rtl = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rtl?: boolean;
}) {
  return (
    <label className="rich-field">
      {label}
      <div className="rich-toolbar">
        <span>Sans Serif</span>
        <span>Normal</span>
        <b>B</b>
        <i>I</i>
        <u>U</u>
        <span>↔</span>
        <span>☷</span>
      </div>
      <textarea
        dir={rtl ? "rtl" : "ltr"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function SeoField({
  label,
  value,
  onChange,
  rtl = false,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rtl?: boolean;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="seo-field">
      {label}
      {multiline ? (
        <textarea
          dir={rtl ? "rtl" : "ltr"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          dir={rtl ? "rtl" : "ltr"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}
