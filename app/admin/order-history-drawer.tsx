"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Clock,
  CheckCircle2,
  PhoneCall,
  Package,
  Truck,
  AlertTriangle,
  XCircle,
  FileText,
  User,
  RotateCcw,
} from "lucide-react";
import { money } from "@/app/catalog";
import { LifecycleOrder } from "@/lib/order-lifecycle";

interface OrderHistoryDrawerProps {
  order: LifecycleOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OrderHistoryDrawer({
  order,
  open,
  onOpenChange,
}: OrderHistoryDrawerProps) {
  if (!order) return null;

  const createdTime = order.created_at
    ? new Date(order.created_at).toLocaleString("en-PK", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown date";

  const csrHistory = order.details.csrHistory || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="admin-order-sheet sm:max-w-xl"
        style={{
          width: "100%",
          maxWidth: 540,
          background: "#ffffff",
          overflowY: "auto",
          padding: "24px 22px",
        }}
      >
        <SheetHeader style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <SheetTitle style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "#f1f5f9",
                  color: "#475569",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Clock size={18} />
              </span>
              Order Timeline #{order.id}
            </SheetTitle>
          </div>
          <SheetDescription style={{ fontSize: 12.5, color: "#64748b", marginTop: 4 }}>
            Detailed audit log of CSR calls, status transitions, courier booking, and settlement events.
          </SheetDescription>
        </SheetHeader>

        {/* Order Header Summary */}
        <div
          style={{
            marginTop: 16,
            padding: "12px 14px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12.5,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: "#0f172a" }}>{order.details.name}</div>
            <div style={{ color: "#64748b", fontSize: 11.5 }}>
              {order.details.city}, {order.details.province || "PK"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, color: "#16a34a", fontSize: 14 }}>{money(order.total)}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#2563eb" }}>{order.status}</div>
          </div>
        </div>

        {/* Vertical Audit Timeline */}
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20, position: "relative", paddingLeft: 24 }}>
          {/* Timeline connecting line */}
          <div
            style={{
              position: "absolute",
              left: 7,
              top: 8,
              bottom: 8,
              width: 2,
              background: "#e2e8f0",
            }}
          />

          {/* 1. Cancellation Event (if cancelled) */}
          {order.status === "Cancelled" && (
            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  position: "absolute",
                  left: -24,
                  top: 0,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#fee2e2",
                  border: "2px solid #ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: 13, color: "#b91c1c" }}>Order Cancelled</strong>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  {order.details.cancelledAt ? new Date(order.details.cancelledAt).toLocaleString("en-PK") : "Recent"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#475569", background: "#fef2f2", padding: "8px 10px", borderRadius: 6, border: "1px solid #fecaca" }}>
                <div><b>Reason:</b> {order.details.cancelReason || "Cancelled by Customer"}</div>
                {order.details.cancelNotes && (
                  <div style={{ marginTop: 3, fontStyle: "italic" }}>"{order.details.cancelNotes}"</div>
                )}
                <div style={{ fontSize: 10.5, color: "#991b1b", marginTop: 4 }}>
                  Cancelled by {order.details.cancelledBy || order.details.csrAgent || "Admin"} · Inventory Restocked
                </div>
              </div>
            </div>
          )}

          {/* 2. Delivery / COD Settled Event */}
          {["Delivered", "COD Settled"].includes(order.status) && (
            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  position: "absolute",
                  left: -24,
                  top: 0,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#dcfce7",
                  border: "2px solid #16a34a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: 13, color: "#16a34a" }}>
                  {order.status === "COD Settled" ? "COD Settled & Closed" : "Delivered to Customer"}
                </strong>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>Completed</span>
              </div>
              <div style={{ fontSize: 12, color: "#475569" }}>
                {order.status === "COD Settled"
                  ? `COD payment of ${money(order.total)} confirmed and remitted by courier.`
                  : `Parcel delivered successfully. Cash on Delivery collected.`}
              </div>
            </div>
          )}

          {/* 3. Shipping / Courier Event */}
          {order.details.trackingNumber && (
            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  position: "absolute",
                  left: -24,
                  top: 0,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#eff6ff",
                  border: "2px solid #2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: 13, color: "#1e40af" }}>
                  Airway Bill Booked ({order.details.courier || "Trax"})
                </strong>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>Consignment</span>
              </div>
              <div style={{ fontSize: 12, color: "#334155", background: "#f8fafc", padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                <b>Tracking Number:</b> {order.details.trackingNumber}
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  Courier: {order.details.courier || "Trax Logistics"}
                </div>
              </div>
            </div>
          )}

          {/* 4. CSR History Entries */}
          {csrHistory.map((entry) => (
            <div key={entry.id} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  position: "absolute",
                  left: -24,
                  top: 0,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: entry.status === "Confirmed" ? "#dcfce7" : "#fef3c7",
                  border: `2px solid ${entry.status === "Confirmed" ? "#16a34a" : "#f59e0b"}`,
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: 13, color: entry.status === "Confirmed" ? "#166534" : "#92400e" }}>
                  CSR: {entry.status}
                </strong>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  {entry.time ? new Date(entry.time).toLocaleString("en-PK") : ""}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#475569" }}>
                {entry.note ? `"${entry.note}"` : "CSR status updated."}
                {entry.agent && (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    Logged by <b>{entry.agent}</b>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 5. Order Placed Event */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                position: "absolute",
                left: -24,
                top: 0,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#f1f5f9",
                border: "2px solid #64748b",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <strong style={{ fontSize: 13, color: "#0f172a" }}>Order Placed</strong>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>{createdTime}</span>
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              Order placed via <b>{order.details.source || "Web Store"}</b> with {order.items.length} item(s) totaling <b>{money(order.total)}</b>.
              {order.details.note && (
                <div style={{ marginTop: 4, fontStyle: "italic", background: "#f8fafc", padding: "4px 8px", borderRadius: 4, border: "1px solid #e2e8f0" }}>
                  Customer Note: "{order.details.note}"
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

