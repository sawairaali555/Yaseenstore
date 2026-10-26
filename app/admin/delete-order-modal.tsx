"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
  ShieldAlert,
  Info,
  Lock,
} from "lucide-react";
import { money } from "@/app/catalog";
import { LifecycleOrder } from "@/lib/order-lifecycle";
import { toast } from 'sonner';

export type DeletionReason =
  | "Test Order"
  | "Created by Mistake"
  | "Duplicate Record"
  | "Invalid / Fake Record"
  | "System Error"
  | "Other";

const DELETION_REASONS: DeletionReason[] = [
  "Test Order",
  "Created by Mistake",
  "Duplicate Record",
  "Invalid / Fake Record",
  "System Error",
  "Other",
];

interface DeleteOrderModalProps {
  order: LifecycleOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (order: LifecycleOrder, reason: DeletionReason, note: string) => Promise<boolean>;
  onCancelInstead?: (order: LifecycleOrder) => void;
}

/**
 * Check whether an order has operational or financial history that blocks permanent deletion.
 */
export function checkOrderDeletionEligibility(order: LifecycleOrder): {
  eligible: boolean;
  blockingReasons: string[];
} {
  const blockingReasons: string[] = [];

  // 1. Courier / Tracking check
  if (order.details?.trackingNumber) {
    blockingReasons.push(
      `Courier tracking number already assigned (${order.details.courier || "Courier"}: ${order.details.trackingNumber})`
    );
  }

  // 2. Fulfillment / Pipeline stage check
  const inFulfillmentStages = [
    "Picklist",
    "Picking",
    "Pack & AirwayBill",
    "Packing",
    "Packed",
    "AWB Pending",
    "Ready to Ship",
    "Shipped",
    "Dispatched",
    "In Transit",
    "Out for Delivery",
    "Delivered",
    "COD Settled",
    "Failed Delivery",
    "Delivery Failed",
    "RTO",
    "Returned to Origin",
    "Return Requested",
    "Returned",
    "Exchange Requested",
    "Exchange Processing",
    "Refund Pending",
    "Refunded",
  ];

  if (inFulfillmentStages.includes(order.status)) {
    blockingReasons.push(
      `Order has active operational history in status "${order.status}"`
    );
  }

  // 3. Payment / COD Settlement check
  if (
    order.details?.codSettled ||
    order.details?.codCollected ||
    order.details?.paymentStatus === "Paid"
  ) {
    blockingReasons.push(
      "Financial record: Cash/COD remittance has been collected or settled"
    );
  }

  // 4. Return / Exchange / Refund check
  if (
    order.details?.returnStatus === "Requested" ||
    order.details?.returnStatus === "Returned" ||
    order.details?.refundStatus ||
    order.details?.exchangeStatus
  ) {
    blockingReasons.push(
      "Customer post-delivery dispute or return/exchange request is logged"
    );
  }

  return {
    eligible: blockingReasons.length === 0,
    blockingReasons,
  };
}

export default function DeleteOrderModal({
  order,
  open,
  onOpenChange,
  onDelete,
  onCancelInstead,
}: DeleteOrderModalProps) {
  const [reason, setReason] = useState<DeletionReason | "">("");
  const [note, setNote] = useState("");
  const [typedConfirmation, setTypedConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  // Reset modal state when opened/closed or when order changes
  useEffect(() => {
    if (open) {
      setReason("");
      setNote("");
      setTypedConfirmation("");
      setBusy(false);
    }
  }, [open, order?.id]);

  if (!order) return null;

  const { eligible, blockingReasons } = checkOrderDeletionEligibility(order);
  const isTypingMatching = typedConfirmation.trim() === order.id.trim();
  const isReasonValid = Boolean(reason);
  const isNoteValid = reason !== "Other" || note.trim().length >= 3;
  const canDelete = eligible && isReasonValid && isNoteValid && isTypingMatching && !busy;

  const handleDelete = async () => {
    if (!canDelete || !reason) return;
    setBusy(true);
    try {
      const success = await onDelete(order, reason as DeletionReason, note.trim());
      if (success) onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete order.');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value); }}>
      <DialogContent className="admin-dialog"
        style={{
          maxWidth: 540,
          padding: 0,
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #fca5a5",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Header Strip with Destructive Warning Theme */}
        <div
          style={{
            background: "#fef2f2",
            borderBottom: "1px solid #fecaca",
            padding: "16px 20px",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#dc2626",
              flexShrink: 0,
            }}
          >
            <Trash2 size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <DialogTitle
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#991b1b",
                letterSpacing: "-0.01em",
                margin: 0,
              }}
            >
              DELETE ORDER PERMANENTLY
            </DialogTitle>
            <DialogDescription
              style={{
                fontSize: 12,
                color: "#b91c1c",
                marginTop: 2,
                margin: 0,
              }}
            >
              Remove non-existent, test, duplicate, or errored order records from the database.
            </DialogDescription>
          </div>
        </div>

        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Order Summary Snapshot */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "12px 14px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              fontSize: 12.5,
            }}
          >
            <div>
              <span style={{ color: "#64748b", fontSize: 11, display: "block", fontWeight: 600 }}>ORDER</span>
              <strong style={{ color: "#0f172a", fontFamily: "monospace", fontSize: 13 }}>#{order.id}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", fontSize: 11, display: "block", fontWeight: 600 }}>CUSTOMER</span>
              <strong style={{ color: "#0f172a" }}>{order.details.name || "Unknown Customer"}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", fontSize: 11, display: "block", fontWeight: 600 }}>AMOUNT (COD)</span>
              <strong style={{ color: "#0f172a" }}>{money(order.total)}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", fontSize: 11, display: "block", fontWeight: 600 }}>CURRENT STATUS</span>
              <span
                style={{
                  display: "inline-block",
                  padding: "1px 7px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  background: order.status === "Cancelled" ? "#fee2e2" : "#f1f5f9",
                  color: order.status === "Cancelled" ? "#b91c1c" : "#334155",
                  border: "1px solid #cbd5e1",
                }}
              >
                {order.status}
              </span>
            </div>
          </div>

          {/* Important Delete vs Cancel Warning Notice */}
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fef08a",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontSize: 12,
              color: "#92400e",
              lineHeight: 1.45,
            }}
          >
            <Info size={16} style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>Deleting this order is different from cancelling it.</strong>
              <div style={{ marginTop: 2 }}>
                Use <b>Cancel Order</b> for genuine customer cancellations to preserve history and audit trails.
                Use <b>Delete</b> only for records that should not exist.
              </div>
            </div>
          </div>

          {/* Operational / Financial History Blocking Check */}
          {!eligible ? (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <ShieldAlert size={18} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong style={{ color: "#991b1b", fontSize: 13, display: "block" }}>
                    Permanent Deletion Blocked
                  </strong>
                  <p style={{ color: "#b91c1c", fontSize: 12, margin: "3px 0 0" }}>
                    This order has active operational or financial history and cannot be deleted to preserve audit integrity:
                  </p>
                </div>
              </div>

              <ul style={{ margin: "2px 0 6px 26px", padding: 0, fontSize: 11.5, color: "#7f1d1d" }}>
                {blockingReasons.map((r, i) => (
                  <li key={i} style={{ marginBottom: 3 }}>{r}</li>
                ))}
              </ul>

              {onCancelInstead && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                  <button
                    type="button"
                    className="admin-primary"
                    style={{
                      background: "#b91c1c",
                      borderColor: "#991b1b",
                      fontSize: 12,
                      padding: "6px 14px",
                    }}
                    onClick={() => {
                      onOpenChange(false);
                      onCancelInstead(order);
                    }}
                  >
                    <X size={13} style={{ marginRight: 5 }} />
                    Cancel Order Instead
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Deletion Reason Selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: "#334155" }}>
                  Deletion Reason <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as DeletionReason)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    background: "#ffffff",
                    color: "#0f172a",
                  }}
                >
                  <option value="" disabled>Select deletion reason…</option>
                  {DELETION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Note (Mandatory if 'Other') */}
              {reason === "Other" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
                    Reason Note / Explanation <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Provide detailed explanation for deleting this record…"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      fontSize: 12.5,
                      fontFamily: "inherit",
                    }}
                  />
                </div>
              )}

              {/* Typed Confirmation Field */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 12, color: "#475569" }}>
                  Permanently delete order <strong>#{order.id}</strong>? This action <b>cannot be undone</b>.
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>
                    Type <code style={{ color: "#b91c1c", background: "#fee2e2", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>{order.id}</code> to confirm:
                  </label>
                  <input
                    type="text"
                    value={typedConfirmation}
                    onChange={(e) => setTypedConfirmation(e.target.value)}
                    placeholder={order.id}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 6,
                      border: isTypingMatching ? "1.5px solid #16a34a" : "1px solid #cbd5e1",
                      fontFamily: "monospace",
                      fontSize: 13,
                      background: "#ffffff",
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 10,
              paddingTop: 8,
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <button
              type="button"
              className="admin-secondary"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              style={{ padding: "7px 14px", fontSize: 12.5 }}
            >
              Cancel / Keep Order
            </button>

            {eligible && (
              <button
                type="button"
                className="admin-primary"
                disabled={!canDelete}
                onClick={handleDelete}
                style={{
                  background: canDelete ? "#dc2626" : "#fca5a5",
                  borderColor: canDelete ? "#b91c1c" : "#fca5a5",
                  cursor: canDelete ? "pointer" : "not-allowed",
                  padding: "7px 16px",
                  fontSize: 12.5,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#ffffff",
                  fontWeight: 700,
                }}
              >
                <Trash2 size={14} />
                {busy ? "Deleting…" : "Delete Permanently"}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
