"use client";
import { useEffect, useState } from "react";
import { Check, CheckCircle2, ImagePlus, LoaderCircle, Star, Trash2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ManagedProduct } from "@/lib/store-data";

type Props = { product: ManagedProduct | null; open: boolean; busy?: boolean; onOpenChange: (open: boolean) => void; onSave: (product: ManagedProduct) => Promise<void> };
const imageUrl = (value: string) => {
  if (!value) return "";
  if (value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) return value;
  return "/images/" + value + ".jpg";
};

export default function ImageManager({ product, open, busy = false, onOpenChange, onSave }: Props) {
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  useEffect(() => {
    if (open && product) {
      const allImgs = [product.image, ...(product.images || [])].filter(Boolean);
      setImages(Array.from(new Set(allImgs)));
    }
  }, [open, product]);

  async function upload(files: FileList | null, replaceIndex?: number) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const response = await fetch("/api/media", { method: "POST", headers: { "Content-Type": file.type }, body: file });
        const data: any = await response.json();
        if (!response.ok) throw Error(data.error || "Upload failed.");
        uploaded.push(data.url);
      }
      setImages((current) => {
        if (replaceIndex === undefined) return Array.from(new Set([...current, ...uploaded]));
        const next = [...current];
        next.splice(replaceIndex, 1, uploaded[0]);
        return next;
      });
    } finally { setUploading(false); }
  }

  function setAsMain(index: number) {
    if (index === 0) return;
    setImages((current) => {
      const selected = current[index];
      const remaining = current.filter((_, i) => i !== index);
      return [selected, ...remaining];
    });
  }

  async function save() {
    if (!product || !images.length) return;
    await onSave({ ...product, image: images[0], images });
    onOpenChange(false);
  }

  const card = (value: string, label: string, index: number) => {
    const isMain = index === 0;
    return (
      <div key={value + index} style={{ textAlign: "center" }} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)}>
        <div style={{ position: "relative", aspectRatio: "1 / 1", width: "100%", maxWidth: 174, margin: "0 auto 8px", border: isMain ? "2.5px solid #16a34a" : "1px solid #dfe4ea", borderRadius: 10, padding: 5, background: value ? "#fff" : "#fafbfc", boxShadow: isMain ? "0 4px 12px rgba(22, 163, 74, 0.15)" : "none", transition: "all 0.2s ease" }}>
          {value ? (
            <img src={imageUrl(value)} alt={label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#7c8798" }}>
              <div>
                <ImagePlus size={25} />
                <small style={{ display: "block", marginTop: 8 }}>{label} placeholder</small>
              </div>
            </div>
          )}

          {/* Main Image Checkmark / Radio Pill */}
          <button
            type="button"
            onClick={() => setAsMain(index)}
            title={isMain ? "Current main cover image" : "Click checkmark to set as Main Image"}
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: isMain ? "3px 8px" : "4px",
              borderRadius: 999,
              background: isMain ? "#16a34a" : "rgba(255, 255, 255, 0.9)",
              color: isMain ? "#ffffff" : "#64748b",
              border: isMain ? "none" : "1px solid #cbd5e1",
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.12)",
              zIndex: 10,
              transition: "all 0.15s ease",
            }}
          >
            <CheckCircle2 size={14} style={{ color: isMain ? "#ffffff" : "#94a3b8" }} />
            {isMain && <span>MAIN</span>}
          </button>

          <div style={{ position: "absolute", inset: 0, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: hovered === index ? "rgba(15, 23, 42, 0.65)" : "transparent", opacity: hovered === index ? 1 : 0, transition: "opacity 150ms ease", pointerEvents: hovered === index ? "auto" : "none", zIndex: 11 }}>
            {!isMain && (
              <button
                type="button"
                title="Set as Main Cover Image"
                onClick={() => setAsMain(index)}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 6, color: "#fff", background: "#16a34a", border: 0, fontWeight: 700, fontSize: 11, cursor: "pointer" }}
              >
                <Check size={14} /> Make Main
              </button>
            )}
            <label title={value ? `Replace image` : `Add image`} style={{ display: "inline-flex", padding: 7, borderRadius: 6, color: "#fff", background: "#4f46e5", cursor: "pointer" }}>
              <Upload size={15} />
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { upload(event.target.files, value ? index : undefined); event.currentTarget.value = ""; }} />
            </label>
            {value && (
              <button type="button" title={`Remove image`} aria-label={`Remove image`} onClick={() => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} style={{ display: "inline-flex", padding: 7, border: 0, borderRadius: 6, color: "#fff", background: "#d53f3f", cursor: "pointer" }}>
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: isMain ? 700 : 500, color: isMain ? "#16a34a" : "#475569" }}>
          {isMain ? "Main Cover Image" : `Gallery Image ${index}`}
        </span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 740, maxHeight: "92vh", overflowY: "auto", borderRadius: 16 }}>
        <DialogHeader>
          <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Product Photo Gallery ({product?.color || product?.name})</DialogTitle>
        </DialogHeader>
        {product && (
          <div>
            <p style={{ textAlign: "center", color: "#64748b", fontSize: 12, margin: "8px 0 18px" }}>
              Click the <b style={{ color: "#16a34a" }}>Checkmark</b> or <b>Make Main</b> button on any photo to make it the primary storefront display image.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 174px))", justifyContent: "center", gap: 22 }}>
              {images.map((value, index) => card(value, index === 0 ? "Main Cover Image" : `Gallery Image ${index}`, index))}
              <label style={{ aspectRatio: "1 / 1", width: "100%", maxWidth: 174, border: "2px dashed #cbd5e1", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: "#475569", background: "#f8fafc", cursor: "pointer", transition: "border-color 0.15s ease" }}>
                <Upload size={24} style={{ color: "#2563eb" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>Add gallery images</span>
                <small style={{ fontSize: 10, color: "#64748b" }}>JPG, PNG, WebP</small>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => { upload(event.target.files); event.currentTarget.value = ""; }} />
              </label>
            </div>
            <button className="admin-primary" type="button" disabled={busy || uploading || !images.length} onClick={save} style={{ width: "100%", justifyContent: "center", marginTop: 28, height: 42, borderRadius: 10, fontSize: 14, fontWeight: 700 }}>
              {uploading ? <><LoaderCircle size={16} />Uploading…</> : busy ? "Saving…" : <><Upload size={16} />Save Gallery & Main Image</>}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
