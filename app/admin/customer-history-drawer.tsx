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
  User,
  Phone,
  MapPin,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Clock,
  ExternalLink,
  Copy,
  Package,
} from "lucide-react";
import { money } from "@/app/catalog";
import {
  analyzeCustomerHistory,
  CustomerHistoryProfile,
  LifecycleOrder,
} from "@/lib/order-lifecycle";
import { toast } from "sonner";

interface CustomerHistoryDrawerProps {
  phone: string | null;
  orders: LifecycleOrder[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectOrder?: (order: LifecycleOrder) => void;
}

export default function CustomerHistoryDrawer({
  phone,
  orders,
  open,
  onOpenChange,
  onSelectOrder,
}: CustomerHistoryDrawerProps) {
  if (!phone) return null;

  const profile: CustomerHistoryProfile = analyzeCustomerHistory(phone, orders);

  const copyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

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
                  background: "#eff6ff",
                  color: "#2563eb",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <User size={18} />
              </span>
              Customer Profile &amp; History
            </SheetTitle>
          </div>
          <SheetDescription style={{ fontSize: 12.5, color: "#64748b", marginTop: 4 }}>
            Aggregated order frequency, delivery success rate, past delivery addresses, and purchased items.
          </SheetDescription>
        </SheetHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 18 }}>
          {/* Customer Bio Card */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <strong style={{ fontSize: 15, color: "#0f172a" }}>{profile.name}</strong>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: profile.totalOrders > 1 ? "#dcfce7" : "#f1f5f9",
                  color: profile.totalOrders > 1 ? "#166534" : "#475569",
                  border: `1px solid ${profile.totalOrders > 1 ? "#bbf7d0" : "#e2e8f0"}`,
                }}
              >
                {profile.totalOrders === 1 ? "1st Time Customer" : `Repeat Buyer (${profile.totalOrders} Orders)`}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#475569" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Phone size={12} style={{ color: "#64748b" }} /> <b>{profile.phone}</b>
              </span>
              <button
                type="button"
                className="copy-btn-mini"
                onClick={() => copyText(profile.phone, "Phone number")}
                title="Copy phone"
              >
                <Copy size={11} />
              </button>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "10px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 600 }}>TOTAL</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                {profile.totalOrders}
              </div>
            </div>

            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: "10px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 10.5, color: "#166534", fontWeight: 600 }}>DELIVERED</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#16a34a", marginTop: 2 }}>
                {profile.deliveredOrders}
              </div>
            </div>

            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: "10px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 10.5, color: "#991b1b", fontWeight: 600 }}>CANCELLED</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#dc2626", marginTop: 2 }}>
                {profile.cancelledOrders}
              </div>
            </div>

            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fef08a",
                borderRadius: 8,
                padding: "10px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 10.5, color: "#854d0e", fontWeight: 600 }}>RTO / RET</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#d97706", marginTop: 2 }}>
                {profile.returnedOrders}
              </div>
            </div>
          </div>

          {/* Delivery Success Rate & Spending */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "12px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span style={{ fontSize: 12, color: "#64748b" }}>Delivery Success Rate:</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: profile.deliverySuccessRate >= 80 ? "#16a34a" : "#dc2626" }}>
                {profile.deliverySuccessRate}%
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>Lifetime COD Spent:</span>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                {money(profile.totalSpent)}
              </div>
            </div>
          </div>

          {/* Previous Delivery Addresses */}
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <MapPin size={14} style={{ color: "#2563eb" }} />
              Known Delivery Addresses ({profile.previousAddresses.length})
            </div>
            {profile.previousAddresses.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {profile.previousAddresses.map((addr, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: 12,
                      color: "#334155",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 6,
                      padding: "8px 10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{addr}</span>
                    <button
                      type="button"
                      className="copy-btn-mini"
                      onClick={() => copyText(addr, "Address")}
                      title="Copy address"
                    >
                      <Copy size={11} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12, color: "#94a3b8" }}>No previous addresses recorded.</span>
            )}
          </div>

          {/* Previous Orders List */}
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <ShoppingBag size={14} style={{ color: "#16a34a" }} />
              Order History ({profile.orders.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {profile.orders.map((o) => (
                <div
                  key={o.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: onSelectOrder ? "pointer" : "default",
                    transition: "border-color 0.15s ease",
                  }}
                  onClick={() => {
                    if (onSelectOrder) {
                      onOpenChange(false);
                      onSelectOrder(o);
                    }
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <b style={{ fontSize: 13, color: "#0f172a" }}>#{o.id}</b>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: o.status === "Delivered" ? "#f0fdf4" : o.status === "Cancelled" ? "#fef2f2" : "#eff6ff",
                          color: o.status === "Delivered" ? "#16a34a" : o.status === "Cancelled" ? "#dc2626" : "#2563eb",
                        }}
                      >
                        {o.status}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      {o.created_at ? new Date(o.created_at).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" }) : ""} · {o.items.length} item{o.items.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <b style={{ fontSize: 13, color: "#0f172a" }}>{money(o.total)}</b>
                    {onSelectOrder && <ExternalLink size={13} style={{ color: "#94a3b8" }} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

