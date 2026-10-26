"use client";
import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-request';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { InventoryLog, ManagedProduct } from "@/lib/store-data";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ManagedProduct | null;
  variantSku: string | null;
  variantColor: string | null;
  variantSize: string | null;
}

export default function StockHistoryModal(props: Props) {
  if (!props.open || !props.product) return null;
  return <StockHistoryContent {...props} key={[props.product.id, props.variantSku, props.variantColor, props.variantSize].join(':')} />;
}

function StockHistoryContent({ open, onOpenChange, product, variantSku, variantColor, variantSize }: Props) {
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const variant = product?.variants?.find((v) => {
    if (variantSku) return v.sku === variantSku;
    if (variantColor && variantSize)
      return (v.color || "Standard").toLowerCase() === variantColor.toLowerCase() &&
             (v.size || "Standard").toLowerCase() === variantSize.toLowerCase();
    return false;
  });
  useEffect(() => {
    if (!open || !product) return;
    const controller = new AbortController();
    adminFetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'inventory-logs', productId: product.id, variantId: variant?.id }), signal: controller.signal })
      .then(async response => {
        const data = await response.json() as { logs?: InventoryLog[]; error?: string };
        if (!response.ok) throw new Error(data.error || 'Unable to load stock history.');
        if (!controller.signal.aborted) setLogs(data.logs || []);
      }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load stock history.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, product?.id, variant?.id, attempt]);
  const visibleLogs = logs.filter(log => variant ? log.variant_id === variant.id : variantSku ? log.sku === variantSku : true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-dialog" style={{ maxWidth: 760, maxHeight: "80vh", overflow: "auto", padding: 28 }}>
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
          {loading ? <p role="status" className="admin-empty">Loading stock movements...</p> : error ? <div className="admin-error" role="alert"><p>{error}</p><button className="admin-secondary" onClick={() => { setLoading(true); setError(""); setLogs([]); setAttempt(value => value + 1); }}>Retry</button></div> : visibleLogs.length ? <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>SKU</TableHead><TableHead>Change</TableHead><TableHead>Stock</TableHead><TableHead>Reason</TableHead><TableHead>Recorded by</TableHead></TableRow></TableHeader><TableBody>{visibleLogs.map(log => <TableRow key={log.id}><TableCell>{new Date(log.created_at).toLocaleString('en-PK')}</TableCell><TableCell>{log.sku || '-'}</TableCell><TableCell>{log.change > 0 ? '+' : ''}{log.change}</TableCell><TableCell>{log.previous_stock} to {log.new_stock}</TableCell><TableCell>{log.reason}{log.order_id && <small> {log.order_id}</small>}</TableCell><TableCell>{log.actor_name || 'System'}</TableCell></TableRow>)}</TableBody></Table> : <p className="admin-empty">No stock movements recorded for this selection.</p>}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={() => onOpenChange(false)} style={{ padding: "8px 20px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 13 }}>Close</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
