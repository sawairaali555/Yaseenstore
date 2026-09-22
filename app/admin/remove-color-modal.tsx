"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { ManagedProduct } from "@/lib/store-data";

interface ColorVariant {
  id: string;
  color?: string;
  colorHex?: string;
  image?: string;
  stock?: number;
  status?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ManagedProduct | null;
  colorVariant: ColorVariant | null;
  onDisableInstead: () => void;
  onDeletePermanently: () => void;
  busy?: boolean;
}

export default function RemoveColorModal({ open, onOpenChange, product, colorVariant, onDisableInstead, onDeletePermanently, busy = false }: Props) {
  const colorName = colorVariant?.color || "this color";
  const stock = colorVariant?.stock ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 480, padding: 28 }}>
        <DialogHeader>
          <DialogTitle>Remove Color Variant</DialogTitle>
          <DialogDescription>{product?.name ?? ""} — {colorName}</DialogDescription>
        </DialogHeader>
        <div style={{ marginTop: 16, fontSize: 14, color: "#374151" }}>
          <p>You are about to remove <b style={{ color: "#203664" }}>{colorName}</b> from <b>{product?.name}</b>.</p>
          {stock > 0 && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef3c7", borderRadius: 8, border: "1px solid #fbbf24", fontSize: 13, color: "#92400e" }}>
              ⚠️ This color has <b>{stock}</b> unit{stock !== 1 ? "s" : ""} in stock. Deleting permanently will remove this inventory.
            </div>
          )}
          <p style={{ marginTop: 14, color: "#64748b", fontSize: 13 }}>Choose an action:</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          <button onClick={onDisableInstead} disabled={busy} style={{ padding: "10px 16px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc", cursor: "pointer", fontSize: 13, textAlign: "left", fontWeight: 500 }}>
            🔒 Disable (hide from storefront, keep inventory)
          </button>
          <button onClick={onDeletePermanently} disabled={busy} style={{ padding: "10px 16px", border: "1px solid #fca5a5", borderRadius: 8, background: "#fff1f2", color: "#dc2626", cursor: "pointer", fontSize: 13, textAlign: "left", fontWeight: 500 }}>
            🗑️ Delete permanently (removes all variants of this color)
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={() => onOpenChange(false)} disabled={busy} style={{ padding: "8px 20px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 13 }}>Cancel</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
