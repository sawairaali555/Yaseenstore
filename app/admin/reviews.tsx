"use client";
import { useState } from "react";
import { Save, X } from "lucide-react";
import { toast } from 'sonner';
import { uploadAdminImage } from '@/lib/admin-request';
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
    event.preventDefault(); if (!product || busy) return; setBusy(true); setError("");
    try {
      const files = Array.from(images || []);
      if (files.length > 10) throw new Error('Choose at most 10 review images.');
      if (name.trim().length < 2 || english.trim().length < 5) throw new Error('Enter a customer name and a comment of at least 5 characters.');
      const urls: string[] = [];
      for (const file of files) urls.push(await uploadAdminImage(file));
      const review = { id: crypto.randomUUID(), name: name.trim(), rating, text: english.trim(), textArabic: arabic.trim(), status, images: urls, date: new Date().toISOString() };
      const ok = await onSave({ ...product, reviews: [...(product.reviews || []), review] } as ManagedProduct);
      if (!ok) throw new Error('Review could not be saved. Please try again.');
      reset();
      toast.success('Review saved');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Review could not be saved.');
    } finally { setBusy(false); }
  }
  function reset() {
    setName(''); setEnglish(''); setArabic(''); setImages(null); setRating(5); setStatus('Pending'); setError('');
    const input = document.getElementById('review-images') as HTMLInputElement | null;
    if (input) input.value = '';
  }
  return <form className="admin-review-form" onSubmit={submit}>
    <label>Product Group <em>*</em><select required value={productId} onChange={(e) => setProductId(e.target.value)}><option value="">Select Product Group</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <div className="admin-review-two"><label>Customer name <em>*</em><input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter customer name" /></label><label>Rating <em>*</em><select required value={rating} onChange={(e) => setRating(Number(e.target.value))}>{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'star' : 'stars'}</option>)}</select></label></div>
    <label>Comment (English) <em>*</em><textarea required minLength={5} maxLength={1000} value={english} onChange={(e) => setEnglish(e.target.value)} placeholder="Write customer review in English" /></label>
    <label>Comment (Urdu)<textarea dir="rtl" maxLength={1000} value={arabic} onChange={(e) => setArabic(e.target.value)} placeholder="Enter Urdu review" /></label>
    <label>Review images<input id="review-images" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={(e) => setImages(e.target.files)} /></label>
    <label>Approval Status <em>*</em><select value={status} onChange={(e) => setStatus(e.target.value)}><option>Pending</option><option>Approved</option><option>Rejected</option></select></label>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {!products.length && <p className="admin-empty">Add a product before creating a review.</p>}
    <footer><button type="button" className="admin-review-cancel" disabled={busy} onClick={() => { if ((!name && !english && !arabic && !images?.length) || window.confirm('Discard this unsaved review?')) reset(); }}>Clear <X size={15} /></button><button className="admin-primary" disabled={busy || !product}><Save size={15} />{busy ? "Saving…" : "Save review"}</button></footer>
  </form>;
}
