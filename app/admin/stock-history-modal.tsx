"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { ManagedProduct } from "@/lib/store-data";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ManagedProduct | null;
  variantSku: string | null;
  variantColor: string | null;
  variantSize: string | null;
}

export default function StockHistoryModal({ open, onOpenChange, product, variantSku, variantColor, variantSize }: Props) {
  const variant = product?.variants?.find((v) => {
    if (variantSku) return v.sku === variantSku;
    if (variantColor && variantSize)
      return (v.color || "Standard").toLowerCase() === variantColor.toLowerCase() &&
             (v.size || "Standard").toLowerCase() === variantSize.toLowerCase();
    return false;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 560, maxHeight: "80vh", overflow: "auto", padding: 28 }}>
        <DialogHeader>
          <DialogTitle>Stock Movement History</DialogTitle>
          <DialogDescription>
            {product?.name ?? ""}{variantColor ? ` — ${variantColor}` : ""}{variantSize ? ` / ${variantSize}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div style={{ marginTop: 16 }}>
          {variant && (
            <div style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                <div><span style={{ color: "#64748b" }}>Color:</span> <b>{variant.color || "Standard"}</b></div>
                <div><span style={{ color: "#64748b" }}>Size:</span> <b>{variant.size || "Standard"}</b></div>
                <div><span style={{ color: "#64748b" }}>SKU:</span> <b style={{ fontFamily: "monospace", fontSize: 11 }}>{variant.sku || "—"}</b></div>
                <div><span style={{ color: "#64748b" }}>Stock:</span> <b style={{ color: (variant.stock ?? 0) > 0 ? "#16a34a" : "#dc2626" }}>{variant.stock ?? 0}</b></div>
              </div>
            </div>
          )}
          <div style={{ marginTop: 20, padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            Stock movement audit log is not yet available.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={() => onOpenChange(false)} style={{ padding: "8px 20px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 13 }}>Close</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
