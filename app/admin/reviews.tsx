"use client";
import { useState } from "react";
import { Save, X } from "lucide-react";
import type { ManagedProduct } from "@/lib/store-data";

export default function Reviews({ products, onSave }: { products: ManagedProduct[]; onSave: (product: ManagedProduct) => Promise<boolean> }) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [english, setEnglish] = useState("");
  const [arabic, setArabic] = useState("");
  const [status, setStatus] = useState("Pending");
  const [images, setImages] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const product = products.find((item) => item.id === productId);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!product) return; setBusy(true); setError("");
    const review = { id: crypto.randomUUID(), name, rating, text: english, textArabic: arabic, status, images: Array.from(images || []).map((file) => file.name), date: "Just now" };
    const ok = await onSave({ ...product, reviews: [...((product as any).reviews || []), review] } as ManagedProduct);
    if (ok) { setName(""); setEnglish(""); setArabic(""); setImages(null); const input = document.getElementById("review-images") as HTMLInputElement | null; if (input) input.value = ""; }
    else setError("Review could not be saved. Please check your product and try again.");
    setBusy(false);
  }
  return <form className="admin-review-form" onSubmit={submit}>
    <label>Product Group <em>*</em><select required value={productId} onChange={(e) => setProductId(e.target.value)}><option value="">Select Product Group</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <div className="admin-review-two"><label>Customer Name <em>*</em><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter customer name" /></label><label>Rating <em>*</em><select required value={rating} onChange={(e) => setRating(Number(e.target.value))}><option value="">Select Rating</option>{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} Stars</option>)}</select></label></div>
    <label>Comment (English) <em>*</em><textarea required value={english} onChange={(e) => setEnglish(e.target.value)} placeholder="Write customer review in English" /></label>
    <label>Comment (Urdu) <em>*</em><textarea required dir="rtl" value={arabic} onChange={(e) => setArabic(e.target.value)} placeholder="Enter Urdu review" /></label>
    <label>Review Images<input id="review-images" type="file" accept="image/*" multiple onChange={(e) => setImages(e.target.files)} /><small>You can upload multiple images at once.</small></label>
    <label>Approval Status <em>*</em><select value={status} onChange={(e) => setStatus(e.target.value)}><option>Pending</option><option>Approved</option><option>Rejected</option></select></label>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <footer><button type="button" className="admin-review-cancel" onClick={() => { setName(""); setEnglish(""); setArabic(""); }}>Cancel <X size={15} /></button><button className="admin-primary" disabled={busy}><Save size={15} />{busy ? "Saving…" : "Save"}</button></footer>
  </form>;
}
