"use client";
import React, { useState } from "react";
import {
  AlertTriangle,
  Package,
  PackageX,
  RotateCcw,
  XCircle,
  ShieldAlert,
  Truck,
  FileQuestion,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Order } from "./panel";
import type { ManagedProduct } from "@/lib/store-data";
import { getInventoryStatus } from "@/lib/inventory-engine";
import { evaluateOrderNeedsAttention } from "@/lib/order-lifecycle";

export type AttentionUrgency = "critical" | "warning" | "info";

export interface AttentionItem {
  id: string;
  category: string;
  count: number;
  title: string;
  subtitle: string;
  buttonLabel: string;
  urgency: AttentionUrgency;
  icon: React.ElementType;
  theme: {
    iconBg: string;
    iconColor: string;
    btnBorder: string;
    btnColor: string;
    btnHoverBg: string;
  };
  onClick: () => void;
}

interface ActionCenterProps {
  orders: Order[];
  products: ManagedProduct[];
  navigate: (section: string, options?: any) => void;
  className?: string;
}

export default function ActionCenter({
  orders,
  products,
  navigate,
  className = "",
}: ActionCenterProps) {
  const [showAll, setShowAll] = useState(false);

  // 1. Compute Orders Waiting for Confirmation
  const waitingOrders = orders.filter(
    (o) =>
      o.status !== "Cancelled" &&
      (o.status === "Pending" ||
        o.details.csrStatus === "Pending" ||
        o.details.csrStatus === "Callback Requested" ||
        (o.details.csrStatus && o.details.csrStatus.startsWith("No Answer")))
  );

  // 2. Compute Low Stock Products
  const lowStockProducts = products.filter(
    (p) => p.status === "Active" && getInventoryStatus(p as any) === "Low Stock"
  );

  // 3. Compute Out of Stock Products
  const outOfStockProducts = products.filter(
    (p) =>
      p.status === "Active" &&
      !p.allowBackorders &&
      getInventoryStatus(p as any) === "Out of Stock"
  );

  // 4. Compute Returns & Refunds to Process
  const returnOrders = orders.filter(
    (o) =>
      (o.status === "Returned" && !o.details?.returnRestocked) ||
      o.details?.returnStatus === "Requested" ||
      o.details?.returnStatus === "Returned" ||
      o.status === "Refunded"
  );

  // 5. Compute Cancelled Orders Requiring Review
  const cancelledOrders = orders.filter(
    (o) =>
      o.status === "Cancelled" &&
      (!o.details?.csrHistory ||
        !o.details.csrHistory.some((h) => h.note?.toLowerCase().includes("reviewed")))
  );

  // 6. Compute Failed / Problem Orders (Needs Attention, RTO, Incomplete Address, Delivery Failures)
  const problemOrders = orders.filter((o) => {
    if (o.status === "Cancelled" || o.status === "Delivered") return false;
    return (
      evaluateOrderNeedsAttention(o as any, orders as any) ||
      o.details?.rtoRisk === "high" ||
      o.status === "Failed Delivery" ||
      o.status === "RTO" ||
      o.details?.csrStatus === "Address Incomplete"
    );
  });

  // 7. Compute Unfulfilled Confirmed Orders (Awaiting Fulfillment & Dispatch)
  const unfulfilledOrders = orders.filter((o) => {
    if (o.status === "Cancelled" || o.status === "Delivered" || o.status === "Shipped") return false;
    return (
      o.details?.csrStatus === "Confirmed" ||
      ["Picklist", "Picking", "Pack & AirwayBill", "Processing"].includes(o.status)
    );
  });

  // 8. Compute Product Information Problems
  const problemProducts = products.filter((p) => {
    const hasMissingPrice = !p.price || p.price <= 0;
    const hasMissingImage = !p.image || p.image === "/images/placeholder.jpg";
    const hasMissingSku = !p.sku || p.sku.trim().length === 0;
    const hasMissingCategory = !p.category || p.category.trim().length === 0;
    const hasBrokenVariants = Boolean(p.hasVariants && (!p.variants || p.variants.length === 0));
    return hasMissingPrice || hasMissingImage || hasMissingSku || hasMissingCategory || hasBrokenVariants;
  });

  // Build the list of active attention items
  const alertItems: AttentionItem[] = [];

  // Item 1: Orders Waiting
  if (waitingOrders.length > 0) {
    alertItems.push({
      id: "waiting_orders",
      category: "Orders Waiting for Confirmation",
      count: waitingOrders.length,
      title: `${waitingOrders.length} ${waitingOrders.length === 1 ? "order" : "orders"} waiting on you`,
      subtitle: "Confirm before 6 PM to ship today",
      buttonLabel: "Confirm",
      urgency: "critical",
      icon: AlertTriangle,
      theme: {
        iconBg: "#fee2e2",
        iconColor: "#ef4444",
        btnBorder: "#f87171",
        btnColor: "#dc2626",
        btnHoverBg: "#fef2f2",
      },
      onClick: () => navigate("orders", { mainTab: "new_csr", subTab: "pending" }),
    });
  }

  // Item 2: Low Stock
  if (lowStockProducts.length > 0) {
    alertItems.push({
      id: "low_stock",
      category: "Low Stock",
      count: lowStockProducts.length,
      title: `${lowStockProducts.length} ${lowStockProducts.length === 1 ? "product" : "products"} running low`,
      subtitle: "Restock before they sell out",
      buttonLabel: "Restock",
      urgency: "warning",
      icon: Package,
      theme: {
        iconBg: "#fef3c7",
        iconColor: "#d97706",
        btnBorder: "#fbbf24",
        btnColor: "#d97706",
        btnHoverBg: "#fffbeb",
      },
      onClick: () => navigate("products", { stockFilter: "Low stock" }),
    });
  }

  // Item 3: Out of Stock
  if (outOfStockProducts.length > 0) {
    alertItems.push({
      id: "out_of_stock",
      category: "Out of Stock",
      count: outOfStockProducts.length,
      title: `${outOfStockProducts.length} ${outOfStockProducts.length === 1 ? "product" : "products"} out of stock`,
      subtitle: "These products/variants cannot be purchased",
      buttonLabel: "View",
      urgency: "critical",
      icon: PackageX,
      theme: {
        iconBg: "#ffe4e6",
        iconColor: "#e11d48",
        btnBorder: "#fb7185",
        btnColor: "#e11d48",
        btnHoverBg: "#fff1f2",
      },
      onClick: () => navigate("products", { stockFilter: "Out of stock" }),
    });
  }

  // Item 4: Returns / Refunds
  if (returnOrders.length > 0) {
    alertItems.push({
      id: "returns",
      category: "Returns / Refunds",
      count: returnOrders.length,
      title: `${returnOrders.length} ${returnOrders.length === 1 ? "return" : "returns"} to process`,
      subtitle: "Review pending return requests & inspections",
      buttonLabel: "Review",
      urgency: "info",
      icon: RotateCcw,
      theme: {
        iconBg: "#ccfbf1",
        iconColor: "#0d9488",
        btnBorder: "#2dd4bf",
        btnColor: "#0d9488",
        btnHoverBg: "#f0fdfa",
      },
      onClick: () => navigate("orders", { mainTab: "issues_returns", subTab: "return_requested" }),
    });
  }

  // Item 5: Failed / Problem Orders
  if (problemOrders.length > 0) {
    alertItems.push({
      id: "problem_orders",
      category: "Failed / Problem Orders",
      count: problemOrders.length,
      title: `${problemOrders.length} problem ${problemOrders.length === 1 ? "order needs" : "orders need"} resolution`,
      subtitle: "Address incomplete, high RTO risk, or courier issues",
      buttonLabel: "Resolve",
      urgency: "critical",
      icon: ShieldAlert,
      theme: {
        iconBg: "#fee2e2",
        iconColor: "#b91c1c",
        btnBorder: "#f87171",
        btnColor: "#b91c1c",
        btnHoverBg: "#fef2f2",
      },
      onClick: () => navigate("orders", { mainTab: "issues_returns" }),
    });
  }

  // Item 6: Cancelled Orders Requiring Review
  if (cancelledOrders.length > 0) {
    alertItems.push({
      id: "cancelled_orders",
      category: "Cancelled Orders",
      count: cancelledOrders.length,
      title: `${cancelledOrders.length} cancelled ${cancelledOrders.length === 1 ? "order" : "orders"} to review`,
      subtitle: "Verify cancellation reasons & restock state",
      buttonLabel: "Review",
      urgency: "warning",
      icon: XCircle,
      theme: {
        iconBg: "#ffedd5",
        iconColor: "#ea580c",
        btnBorder: "#fb923c",
        btnColor: "#ea580c",
        btnHoverBg: "#fff7ed",
      },
      onClick: () => navigate("orders", { mainTab: "issues_returns", subTab: "cancelled" }),
    });
  }

  // Item 7: Unfulfilled Orders
  if (unfulfilledOrders.length > 0) {
    alertItems.push({
      id: "unfulfilled_orders",
      category: "Unfulfilled Orders",
      count: unfulfilledOrders.length,
      title: `${unfulfilledOrders.length} unfulfilled ${unfulfilledOrders.length === 1 ? "order" : "orders"} awaiting dispatch`,
      subtitle: "Confirmed orders ready for packing and shipping",
      buttonLabel: "Process",
      urgency: "info",
      icon: Truck,
      theme: {
        iconBg: "#dbeafe",
        iconColor: "#2563eb",
        btnBorder: "#60a5fa",
        btnColor: "#2563eb",
        btnHoverBg: "#eff6ff",
      },
      onClick: () => navigate("orders", { mainTab: "fulfillment", subTab: "picklist" }),
    });
  }

  // Item 8: Product Problems
  if (problemProducts.length > 0) {
    alertItems.push({
      id: "problem_products",
      category: "Product Problems",
      count: problemProducts.length,
      title: `${problemProducts.length} ${problemProducts.length === 1 ? "product" : "products"} with missing details`,
      subtitle: "Missing price, main image, SKU, or category",
      buttonLabel: "Fix",
      urgency: "warning",
      icon: FileQuestion,
      theme: {
        iconBg: "#fef3c7",
        iconColor: "#d97706",
        btnBorder: "#fbbf24",
        btnColor: "#d97706",
        btnHoverBg: "#fffbeb",
      },
      onClick: () => navigate("products"),
    });
  }

  // Sort by urgency: Critical (1) -> Warning (2) -> Info (3), then by count descending
  const urgencyWeight: Record<AttentionUrgency, number> = {
    critical: 1,
    warning: 2,
    info: 3,
  };

  alertItems.sort((a, b) => {
    const diff = urgencyWeight[a.urgency] - urgencyWeight[b.urgency];
    if (diff !== 0) return diff;
    return b.count - a.count;
  });

  const totalCategoriesCount = alertItems.length;
  const visibleItems = showAll ? alertItems : alertItems.slice(0, 5);

  return (
    <section
      className={`admin-attention-card ${className}`}
      style={{
        background: "#ffffff",
        borderRadius: 20,
        border: "1px solid #e2e8f0",
        padding: "22px 24px",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <h2
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: "#0f172a",
            margin: 0,
            letterSpacing: "-0.2px",
          }}
        >
          What needs your attention
        </h2>

        <span
          style={{
            background: totalCategoriesCount > 0 ? "#fef3c7" : "#f0fdf4",
            color: totalCategoriesCount > 0 ? "#b45309" : "#16a34a",
            border: totalCategoriesCount > 0 ? "1px solid #fde68a" : "1px solid #bbf7d0",
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.2px",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {totalCategoriesCount > 0 ? `${totalCategoriesCount} ${totalCategoriesCount === 1 ? "item" : "items"}` : "0 items"}
        </span>
      </div>

      {/* Alerts List or Empty Success State */}
      {totalCategoriesCount === 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 18px",
            background: "#f0fdf4",
            borderRadius: 14,
            border: "1px solid #bbf7d0",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#dcfce7",
              color: "#16a34a",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <b style={{ fontSize: 14, color: "#166534", display: "block" }}>You’re all caught up</b>
            <span style={{ fontSize: 12.5, color: "#15803d" }}>No items currently need your attention.</span>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {visibleItems.map((item, idx) => {
            const Icon = item.icon;
            const isLast = idx === visibleItems.length - 1;

            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 0",
                  gap: 16,
                  borderBottom: isLast ? "none" : "1px solid #f1f5f9",
                }}
              >
                {/* Left: Icon + Title/Subtitle */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    minWidth: 0,
                    cursor: "pointer",
                  }}
                  onClick={item.onClick}
                >
                  {/* Status Icon Squircle */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: item.theme.iconBg,
                      color: item.theme.iconColor,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={20} />
                  </div>

                  {/* Text */}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 750,
                        color: "#1e293b",
                        lineHeight: 1.3,
                        letterSpacing: "-0.1px",
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "#64748b",
                        marginTop: 2,
                        lineHeight: 1.3,
                      }}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                {/* Right: Action Pill Button */}
                <button
                  type="button"
                  onClick={item.onClick}
                  style={{
                    borderRadius: 999,
                    border: `1.5px solid ${item.theme.btnBorder}`,
                    background: "#ffffff",
                    color: item.theme.btnColor,
                    padding: "6px 20px",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                    outline: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = item.theme.btnHoverBg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                  }}
                >
                  {item.buttonLabel}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* View All / Show Less Toggle */}
      {alertItems.length > 5 && (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          style={{
            border: "none",
            background: "#f8fafc",
            borderRadius: 8,
            padding: "8px 12px",
            color: "#475569",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: 4,
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#f8fafc")}
        >
          {showAll ? (
            <>
              Show less <ChevronUp size={14} />
            </>
          ) : (
            <>
              View all ({alertItems.length} categories) <ChevronDown size={14} />
            </>
          )}
        </button>
      )}
    </section>
  );
}

