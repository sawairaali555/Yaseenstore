"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  RotateCcw,
  Search,
  Package,
  Check,
  Plus,
  Minus,
  AlertCircle,
  HelpCircle,
  Banknote,
} from "lucide-react";
import { money } from "@/app/catalog";
import {
  ReturnRequest,
  ReturnReason,
  RETURN_REASONS,
  REFUND_METHODS,
} from "@/lib/return-types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  orders: any[];
  existingReturns: ReturnRequest[];
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateReturn: (data: any) => Promise<boolean>;
}

export default function CreateReturnModal({
  open,
  orders,
  existingReturns,
  busy = false,
  onOpenChange,
  onCreateReturn,
}: Props) {
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [searchOrderQuery, setSearchOrderQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, { returnQty: number; checked: boolean }>>({});
  const [returnReason, setReturnReason] = useState<ReturnReason>("Wrong Size / Fit Issue");
  const [customerComments, setCustomerComments] = useState("");
  const [evidenceImagesInput, setEvidenceImagesInput] = useState("");
  const [refundMethod, setRefundMethod] = useState("EasyPaisa");
  const [refundAccountTitle, setRefundAccountTitle] = useState("");
  const [refundAccountNumber, setRefundAccountNumber] = useState("");
  const [refundBankName, setRefundBankName] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // Filter orders that are eligible for returns (Delivered, Shipped, In Transit, Dispatched; not Cancelled)
  const eligibleOrders = useMemo(() => {
    return orders.filter((o) => {
      if (o.status === "Cancelled") return false;
      const disallowed = ["New", "Pending", "Test order received", "Picklist", "Picking", "Ready for Packing"];
      return !disallowed.includes(o.status);
    });
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!searchOrderQuery.trim()) return eligibleOrders.slice(0, 50);
    const q = searchOrderQuery.toLowerCase();
    return eligibleOrders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        (o.details?.name || "").toLowerCase().includes(q) ||
        (o.details?.phone || "").toLowerCase().includes(q) ||
        (o.details?.city || "").toLowerCase().includes(q)
    );
  }, [eligibleOrders, searchOrderQuery]);

  const activeOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // When order changes, reset selected items and pre-fill customer refund details
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    const ord = orders.find((o) => o.id === orderId);
    if (ord) {
      const initialMap: Record<string, { returnQty: number; checked: boolean }> = {};
      const orderReturns = existingReturns.filter(
        (r) => r.orderId === orderId && r.returnStatus !== "Cancelled" && r.returnStatus !== "Rejected"
      );

      (ord.items || []).forEach((it: any, idx: number) => {
        const itemKey = it.id + ":" + (it.size || "Standard") + ":" + (it.color || "Standard");
        let alreadyReturned = 0;
        orderReturns.forEach((r) => {
          r.items.forEach((ri) => {
            if (ri.id === it.id && (ri.size || "Standard") === (it.size || "Standard") && (ri.color || "Standard") === (it.color || "Standard")) {
              alreadyReturned += ri.returnQty;
            }
          });
        });

        const remaining = Math.max(0, Number(it.qty || 1) - alreadyReturned);
        if (remaining > 0) {
          // Default: select the first item
          initialMap[itemKey] = {
            returnQty: 1,
            checked: idx === 0,
          };
        }
      });
      setSelectedItems(initialMap);
      setRefundAccountTitle(ord.details?.name || "");
      setRefundAccountNumber(ord.details?.phone || "");
    }
  };

  // Calculate live refundable total
  const calculatedTotal = useMemo(() => {
    if (!activeOrder) return 0;
    let sum = 0;
    (activeOrder.items || []).forEach((it: any) => {
      const itemKey = it.id + ":" + (it.size || "Standard") + ":" + (it.color || "Standard");
      const sel = selectedItems[itemKey];
      if (sel && sel.checked) {
        const unitPrice = it.unitPrice || Math.round(Number(activeOrder.total || 0) / Math.max(1, (activeOrder.items || []).length));
        sum += unitPrice * Number(sel.returnQty || 1);
      }
    });
    return sum;
  }, [activeOrder, selectedItems]);

  const hasSelectedItems = Object.values(selectedItems).some((i) => i.checked && i.returnQty > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) {
      toast.error("Please select an order.");
      return;
    }

    const itemsToReturn: any[] = [];
    (activeOrder.items || []).forEach((it: any) => {
      const itemKey = it.id + ":" + (it.size || "Standard") + ":" + (it.color || "Standard");
      const sel = selectedItems[itemKey];
      if (sel && sel.checked && sel.returnQty > 0) {
        const unitPrice = it.unitPrice || Math.round(Number(activeOrder.total || 0) / Math.max(1, (activeOrder.items || []).length));
        itemsToReturn.push({
          id: it.id,
          variantId: it.variantId,
          name: it.name || it.id,
          sku: it.sku || it.id,
          color: it.color,
          size: it.size || "Standard",
          image: it.image,
          orderedQty: Number(it.qty || 1),
          returnQty: Number(sel.returnQty),
          unitPrice,
        });
      }
    });

    if (itemsToReturn.length === 0) {
      toast.error("Please select at least 1 item to return.");
      return;
    }

    const images = evidenceImagesInput
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const payload = {
      action: "create-return",
      orderId: activeOrder.id,
      items: itemsToReturn,
      returnReason,
      customerComments,
      evidenceImages: images,
      refundMethod,
      refundAccountTitle,
      refundAccountNumber,
      refundBankName,
      internalNotes,
    };

    const ok = await onCreateReturn(payload);
    if (ok) {
      toast.success(`Return request created successfully for Order #${activeOrder.id}`);
      onOpenChange(false);
      setSelectedOrderId("");
      setSelectedItems({});
      setCustomerComments("");
      setEvidenceImagesInput("");
      setInternalNotes("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-dialog" style={{ maxWidth: 680, maxHeight: "90vh", overflowY: "auto", padding: "24px 28px" }}>
        <DialogHeader>
          <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "#eff6ff",
                color: "#2563eb",
                display: "grid",
                placeItems: "center",
              }}
            >
              <RotateCcw size={16} />
            </span>
            Create Return &amp; Refund Request
          </DialogTitle>
          <DialogDescription>
            Initiate a return request for a delivered customer order. Supports full or partial item returns.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
          {/* Step 1: Select Order */}
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: "#1e293b", marginBottom: 6, display: "block" }}>
              1. Select Customer Order <span style={{ color: "#dc2626" }}>*</span>
            </label>

            {!selectedOrderId ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ position: "relative" }}>
                  <Search size={15} style={{ position: "absolute", left: 10, top: 12, color: "#94a3b8" }} />
                  <input
                    type="text"
                    placeholder="Search by Order ID, Customer name, phone, or city…"
                    value={searchOrderQuery}
                    onChange={(e) => setSearchOrderQuery(e.target.value)}
                    style={{ width: "100%", height: 38, borderRadius: 8, border: "1px solid #cbd5e1", paddingLeft: 34, paddingRight: 10, fontSize: 13 }}
                  />
                </div>

                <div
                  style={{
                    maxHeight: 180,
                    overflowY: "auto",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    background: "#f8fafc",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {filteredOrders.length === 0 ? (
                    <div style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                      No eligible delivered orders found.
                    </div>
                  ) : (
                    filteredOrders.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => handleSelectOrder(o.id)}
                        style={{
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderBottom: "1px solid #f1f5f9",
                          background: "#ffffff",
                          border: 0,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "background 0.1s ease",
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: 13, color: "#0f172a" }}>#{o.id}</strong> · {o.details?.name || "Customer"} · <span style={{ color: "#64748b", fontSize: 12 }}>{o.details?.phone}</span>
                          <span style={{ display: "block", fontSize: 11, color: "#94a3b8" }}>
                            {o.details?.city || "Pakistan"} · Delivered on {new Date(o.created_at).toLocaleDateString("en-PK")}
                          </span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <strong style={{ fontSize: 13, color: "#0f172a" }}>{money(o.total)}</strong>
                          <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#16a34a" }}>
                            {o.status}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: "12px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <strong style={{ fontSize: 13.5, color: "#15803d" }}>Selected Order #{activeOrder?.id}</strong>
                  <div style={{ fontSize: 12, color: "#166534", marginTop: 2 }}>
                    Customer: <b>{activeOrder?.details?.name}</b> · {activeOrder?.details?.phone} · {activeOrder?.details?.city}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrderId("");
                    setSelectedItems({});
                  }}
                  style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", background: "none", border: 0, cursor: "pointer", padding: "4px 8px" }}
                >
                  Change Order
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Choose Items to Return & Partial Quantities */}
          {activeOrder && (
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <strong style={{ fontSize: 13, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                  <Package size={14} style={{ color: "#2563eb" }} /> 2. Select Items to Return (Partial or Full)
                </strong>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                  Refund Total: {money(calculatedTotal)}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {(activeOrder.items || []).map((it: any, idx: number) => {
                  const itemKey = it.id + ":" + (it.size || "Standard") + ":" + (it.color || "Standard");
                  const sel = selectedItems[itemKey] || { returnQty: 1, checked: false };
                  const maxDelivered = Number(it.qty || 1);
                  const unitPrice = it.unitPrice || Math.round(Number(activeOrder.total || 0) / Math.max(1, (activeOrder.items || []).length));

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: idx < activeOrder.items.length - 1 ? "1px solid #f1f5f9" : "none",
                        background: sel.checked ? "#f8fafc" : "#ffffff",
                        gap: 12,
                      }}
                    >
                      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={sel.checked}
                          onChange={(e) =>
                            setSelectedItems((prev) => ({
                              ...prev,
                              [itemKey]: { ...sel, checked: e.target.checked },
                            }))
                          }
                          style={{ width: 16, height: 16, accentColor: "#2563eb", cursor: "pointer" }}
                        />
                        <img
                          src={it.image || "/images/placeholder.jpg"}
                          alt=""
                          style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 6, border: "1px solid #e2e8f0" }}
                        />
                        <div>
                          <strong style={{ fontSize: 13, color: "#0f172a", display: "block" }}>{it.name || it.id}</strong>
                          <span style={{ fontSize: 11, color: "#64748b" }}>
                            {it.color || "Standard"} · Size {it.size || "Standard"} · Ordered: <b>{maxDelivered} units</b> · {money(unitPrice)}/unit
                          </span>
                        </div>
                      </label>

                      {/* Quantity Stepper */}
                      {sel.checked && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Return:</span>
                          <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: 6, overflow: "hidden", background: "#ffffff" }}>
                            <button
                              type="button"
                              disabled={sel.returnQty <= 1}
                              onClick={() =>
                                setSelectedItems((prev) => ({
                                  ...prev,
                                  [itemKey]: { ...sel, returnQty: Math.max(1, sel.returnQty - 1) },
                                }))
                              }
                              style={{ width: 28, height: 28, border: 0, background: "#f1f5f9", cursor: "pointer", display: "grid", placeItems: "center" }}
                            >
                              <Minus size={12} />
                            </button>
                            <span style={{ width: 32, textAlign: "center", fontSize: 12.5, fontWeight: 700 }}>
                              {sel.returnQty}
                            </span>
                            <button
                              type="button"
                              disabled={sel.returnQty >= maxDelivered}
                              onClick={() =>
                                setSelectedItems((prev) => ({
                                  ...prev,
                                  [itemKey]: { ...sel, returnQty: Math.min(maxDelivered, sel.returnQty + 1) },
                                }))
                              }
                              style={{ width: 28, height: 28, border: 0, background: "#f1f5f9", cursor: "pointer", display: "grid", placeItems: "center" }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", minWidth: 60, textAlign: "right" }}>
                            {money(unitPrice * sel.returnQty)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Return Reason & Customer Comments */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
              Return Reason <span style={{ color: "#dc2626" }}>*</span>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value as ReturnReason)}
                style={{ width: "100%", height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 10px", marginTop: 4, fontSize: 13, background: "#ffffff" }}
              >
                {RETURN_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>

            <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
              Preferred Refund Method <span style={{ color: "#dc2626" }}>*</span>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value)}
                style={{ width: "100%", height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 10px", marginTop: 4, fontSize: 13, background: "#ffffff" }}
              >
                {REFUND_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>

            <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
              Customer Account Title
              <input
                type="text"
                placeholder="Account title for refund payout"
                value={refundAccountTitle}
                onChange={(e) => setRefundAccountTitle(e.target.value)}
                style={{ width: "100%", height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 10px", marginTop: 4, fontSize: 12.5 }}
              />
            </label>

            <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
              Customer Account / Wallet Number
              <input
                type="text"
                placeholder="0300-1234567 or IBAN"
                value={refundAccountNumber}
                onChange={(e) => setRefundAccountNumber(e.target.value)}
                style={{ width: "100%", height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 10px", marginTop: 4, fontSize: 12.5 }}
              />
            </label>

            <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", gridColumn: "1 / -1" }}>
              Customer Comments / Explanation:
              <textarea
                rows={2}
                placeholder="Detailed reason given by the customer on call/WhatsApp…"
                value={customerComments}
                onChange={(e) => setCustomerComments(e.target.value)}
                style={{ width: "100%", borderRadius: 8, border: "1px solid #cbd5e1", padding: "8px 10px", marginTop: 4, fontSize: 12.5, fontFamily: "inherit" }}
              />
            </label>

            <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", gridColumn: "1 / -1" }}>
              Evidence Image URLs (1 per line):
              <textarea
                rows={2}
                placeholder="https://images.unsplash.com/... or uploaded photo URLs"
                value={evidenceImagesInput}
                onChange={(e) => setEvidenceImagesInput(e.target.value)}
                style={{ width: "100%", borderRadius: 8, border: "1px solid #cbd5e1", padding: "8px 10px", marginTop: 4, fontSize: 12, fontFamily: "monospace" }}
              />
            </label>
          </div>

          <DialogFooter style={{ marginTop: 14 }}>
            <button
              type="button"
              className="admin-secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-primary"
              disabled={busy || !activeOrder || !hasSelectedItems}
              style={{
                background: "#2563eb",
                borderColor: "#2563eb",
                cursor: activeOrder && hasSelectedItems ? "pointer" : "not-allowed",
              }}
            >
              {busy ? "Creating…" : `Create Return Request (${money(calculatedTotal)})`}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
