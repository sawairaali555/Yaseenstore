import { money } from "@/app/catalog";
import { cleanPakistanPhone, isValidPakistanPhone } from "@/lib/pakistan-locations";
import type { ManagedProduct } from "@/lib/store-data";

export type CentralizedOrderStatus =
  | "New"
  | "Pending"
  | "Confirmed"
  | "Picklist"
  | "Picking"
  | "Ready for Packing"
  | "Pack & AirwayBill"
  | "Packing"
  | "Packed"
  | "AWB Pending"
  | "Ready to Ship"
  | "Shipped"
  | "Dispatched"
  | "In Transit"
  | "Out for Delivery"
  | "Delivered"
  | "COD Settled"
  | "Needs Attention"
  | "Cancelled"
  | "Delivery Failed"
  | "Failed Delivery"
  | "RTO"
  | "Returned to Origin"
  | "Return Requested"
  | "Returned"
  | "Exchange Requested"
  | "Exchange Processing"
  | "Refund Pending"
  | "Refunded"
  | "On Hold"
  | "Test order received";

export type CsrStatus =
  | "Pending"
  | "Confirmed"
  | "No Answer (1st)"
  | "No Answer (2nd)"
  | "No Answer (3rd)"
  | "WhatsApp Sent"
  | "Callback Requested"
  | "Cancelled by Customer"
  | "Address Incomplete";

export interface CsrHistoryEntry {
  id: string;
  time: string;
  status: CsrStatus | string;
  note?: string;
  agent?: string;
}

export type CodSettlementStatus =
  | "Pending"
  | "Partially Settled"
  | "Settled"
  | "Disputed"
  | "Not Applicable";

export type CodPaymentMethod =
  | "Bank Transfer"
  | "Cash"
  | "Cheque"
  | "Wallet"
  | "Other";

export interface CodSettlementTransaction {
  id: string;
  remittanceId?: string;
  amount: number;
  date: string;
  courier: string;
  reference?: string;
  paymentMethod: CodPaymentMethod | string;
  note?: string;
  recordedBy?: { id?: string; name?: string; role?: string };
  recordedAt: string;
  type?: "payment" | "adjustment" | "reversal";
  reversalOfId?: string;
  reason?: string;
}

export interface CodRemittanceBatch {
  id: string;
  courier: string;
  settlementDate: string;
  referenceId: string;
  paymentMethod: CodPaymentMethod | string;
  expectedAmount: number;
  receivedAmount: number;
  courierCharges?: number;
  adjustments?: number;
  netReceived: number;
  difference: number;
  orderIds: string[];
  status: "Draft" | "Partially Matched" | "Reconciled" | "Disputed";
  createdBy: { id?: string; name?: string; role?: string };
  createdAt: string;
  notes?: string;
}

export interface CodFinancialBreakdown {
  expectedAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  status: CodSettlementStatus;
  transactions: CodSettlementTransaction[];
  isSettled: boolean;
  isPartiallySettled: boolean;
  isPending: boolean;
  isDisputed: boolean;
  disputeReason?: string;
  disputeNotes?: string;
}

export interface OrderDetails {
  name: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address: string;
  city: string;
  state?: string;
  province?: string;
  landmark?: string;
  postal?: string;
  note?: string;
  source?: string;
  paymentMethod?: string;
  courier?: string;
  courierStatus?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  csrStatus?: CsrStatus;
  csrNotes?: string;
  csrConfirmedAt?: string;
  csrAgent?: string;
  csrHistory?: CsrHistoryEntry[];
  rtoRisk?: "low" | "medium" | "high" | string;
  returnStatus?: string;
  paymentStatus?: string;
  codCollected?: boolean;
  codSettled?: boolean;
  codSettledAt?: string;
  codSettlementHistory?: CodSettlementTransaction[];
  codReceivedAmount?: number;
  codRemainingAmount?: number;
  codStatus?: CodSettlementStatus;
  codDisputed?: boolean;
  codDisputeReason?: string;
  codDisputeNotes?: string;
  codDisputedAt?: string;
  remittanceId?: string;
  warehouse?: string;
  cancelReason?: string;
  cancelNotes?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  orderDiscount?: number;
  discountType?: "fixed" | "percentage";
  deliveryOverride?: number;
  subtotal?: number;
  deliveryCharge?: number;
  discount?: number;
  itemsSummary?: string;
  [key: string]: any;
}

export interface OrderItem {
  id: string;
  qty: number;
  size: string;
  name?: string;
  color?: string;
  sku?: string;
  image?: string;
  unitPrice?: number;
  totalPrice?: number;
  discount?: number;
  warehouse?: string;
  [key: string]: any;
}

export interface LifecycleOrder {
  id: string;
  total: number;
  status: string;
  created_at: string;
  token?: string;
  details: OrderDetails;
  items: OrderItem[];
}

/**
 * Standard 5-stage pipeline milestones
 */
export const PIPELINE_STAGES = [
  { id: "Placed", label: "Placed", aliases: ["New", "Pending", "Test order received", "Placed"] },
  { id: "Picklist", label: "Picklist", aliases: ["Confirmed", "Picklist", "Picking"] },
  { id: "Pack & AWB", label: "Pack & AWB", aliases: ["Ready for Packing", "Pack & AirwayBill", "Packing", "Packed", "Processing", "AWB Pending", "Ready to Ship"] },
  { id: "Shipped", label: "Shipped", aliases: ["Shipped", "Dispatched", "In Transit", "Out for Delivery"] },
  { id: "Delivered", label: "Delivered", aliases: ["Delivered", "COD Settled"] },
] as const;

export function getPipelineIndex(status: string): number {
  const norm = (status || "").trim().toLowerCase();
  if (norm === "cancelled" || norm === "refunded" || norm === "rto") return -1;

  if (["delivered", "cod settled", "cod collected"].includes(norm)) return 4;
  if (["shipped", "dispatched", "in transit", "out for delivery"].includes(norm)) return 3;
  if (["pack & airwaybill", "packing", "packed", "ready for packing", "awb pending", "ready to ship", "processing"].includes(norm)) return 2;
  if (["picklist", "picking", "confirmed"].includes(norm)) return 1;
  return 0;
}

/**
 * Normalize and categorize order status
 */
export function normalizeOrderStatus(status: string): string {
  const s = (status || "").trim();
  if (["Test order received", "New", "Placed"].includes(s)) return "Pending";
  if (["Dispatched", "In Transit", "Out for Delivery"].includes(s)) return "Shipped";
  if (["Packing", "Packed", "Ready for Packing", "Processing"].includes(s)) return "Pack & AirwayBill";
  return s || "Pending";
}

/**
 * Courier tracking URL builder for Pakistan couriers
 */
export function getPakistanCourierTrackingUrl(courier?: string, trackingNumber?: string): string {
  if (!trackingNumber) return "#";
  const c = (courier || "").toLowerCase();
  const cleanTrack = encodeURIComponent(trackingNumber.trim());

  if (c.includes("trax")) return `https://sonic.pk/tracking?tracking_number=${cleanTrack}`;
  if (c.includes("tcs")) return `https://www.tcsexpress.com/tracking?tracking_no=${cleanTrack}`;
  if (c.includes("leopard")) return `https://www.leopardscourier.com/tracking?track=${cleanTrack}`;
  if (c.includes("postex")) return `https://postex.pk/tracking?cn=${cleanTrack}`;
  if (c.includes("mnp") || c.includes("m&p")) return `https://mulphilog.com/tracking?cn=${cleanTrack}`;
  if (c.includes("rider")) return `https://withrider.com/tracking?cn=${cleanTrack}`;
  return `https://sonic.pk/tracking?tracking_number=${cleanTrack}`;
}

/**
 * Context-Aware Primary Action Configuration
 */
export interface NextOrderAction {
  label: string;
  nextStatus?: string;
  nextCsrStatus?: CsrStatus;
  actionType:
    | "confirm_csr"
    | "move_picklist"
    | "start_picking"
    | "start_packing"
    | "generate_awb"
    | "mark_ready_to_ship"
    | "mark_shipped"
    | "track_shipment"
    | "mark_delivered"
    | "settle_cod"
    | "review_return"
    | "resolve_delivery"
    | "reactivate"
    | "view_completed";
  variant: "primary" | "success" | "warning" | "info" | "neutral";
  description: string;
  roleRequired?: string[];
}

export function getNextOrderAction(order: LifecycleOrder, userRole: string = "admin"): NextOrderAction {
  const status = order.status;
  const csrStatus = order.details.csrStatus;
  const hasTracking = Boolean(order.details.trackingNumber);
  const isCancelled = status === "Cancelled" || csrStatus === "Cancelled by Customer";
  const isDelivered = status === "Delivered" || status === "COD Settled";
  const isFailedDelivery = status === "Failed Delivery" || order.details.courierStatus === "Failed Delivery";
  const isReturnRequested = status === "Return Requested" || order.details.returnStatus === "Requested";

  if (isCancelled) {
    return {
      label: "Reactivate Order",
      nextStatus: "Pending",
      nextCsrStatus: "Pending",
      actionType: "reactivate",
      variant: "neutral",
      description: "Reopen cancelled order and reset to pending verification",
      roleRequired: ["admin", "super_admin", "csr"],
    };
  }

  if (isReturnRequested) {
    return {
      label: "Review Return",
      actionType: "review_return",
      variant: "warning",
      description: "Review customer return request and approve replacement or refund",
      roleRequired: ["admin", "super_admin", "csr"],
    };
  }

  if (isFailedDelivery) {
    return {
      label: "Resolve Delivery",
      actionType: "resolve_delivery",
      variant: "warning",
      description: "Contact customer and reschedule courier delivery or initiate RTO",
      roleRequired: ["admin", "super_admin", "csr", "shipping"],
    };
  }

  // 1. Unconfirmed / Pending CSR
  if (!csrStatus || csrStatus === "Pending" || csrStatus === "Callback Requested" || csrStatus.startsWith("No Answer")) {
    return {
      label: "Confirm Order",
      nextStatus: "Picklist",
      nextCsrStatus: "Confirmed",
      actionType: "confirm_csr",
      variant: "success",
      description: "Verify customer details and advance order directly to Picklist",
      roleRequired: ["admin", "super_admin", "csr"],
    };
  }

  // 2. Confirmed, waiting for Picklist
  if (csrStatus === "Confirmed" && (status === "Pending" || status === "New" || status === "Test order received" || status === "Placed")) {
    return {
      label: "Create Picklist",
      nextStatus: "Picklist",
      actionType: "move_picklist",
      variant: "primary",
      description: "Move confirmed order to warehouse picklist for item gathering",
      roleRequired: ["admin", "super_admin", "warehouse"],
    };
  }

  // 3. In Picklist
  if (status === "Picklist") {
    return {
      label: "Start Picking",
      nextStatus: "Picking",
      actionType: "start_picking",
      variant: "primary",
      description: "Mark item picking as in progress by warehouse staff",
      roleRequired: ["admin", "super_admin", "warehouse"],
    };
  }

  // 4. In Picking
  if (status === "Picking") {
    return {
      label: "Start Packing",
      nextStatus: "Pack & AirwayBill",
      actionType: "start_packing",
      variant: "primary",
      description: "Items picked; send order to packing station",
      roleRequired: ["admin", "super_admin", "warehouse"],
    };
  }

  // 5. In Packing Station
  if (["Pack & AirwayBill", "Packing", "Processing", "Ready for Packing"].includes(status)) {
    if (!hasTracking) {
      return {
        label: "Generate Airway Bill",
        actionType: "generate_awb",
        variant: "primary",
        description: "Book courier consignment and print official shipping label",
        roleRequired: ["admin", "super_admin", "warehouse", "shipping"],
      };
    }
    return {
      label: "Ready to Ship",
      nextStatus: "Ready to Ship",
      actionType: "mark_ready_to_ship",
      variant: "primary",
      description: "Parcel packed with shipping label attached; waiting for courier pickup",
      roleRequired: ["admin", "super_admin", "warehouse", "shipping"],
    };
  }

  // 6. Ready to Ship
  if (status === "Ready to Ship") {
    return {
      label: "Mark Shipped",
      nextStatus: "Shipped",
      actionType: "mark_shipped",
      variant: "primary",
      description: "Handed over to courier pickup rider; in transit",
      roleRequired: ["admin", "super_admin", "shipping"],
    };
  }

  // 7. Shipped / In Transit
  if (["Shipped", "Dispatched", "In Transit", "Out for Delivery"].includes(status)) {
    return {
      label: "Mark Delivered",
      nextStatus: "Delivered",
      actionType: "mark_delivered",
      variant: "success",
      description: "Confirm package delivery and Cash on Delivery collected by courier",
      roleRequired: ["admin", "super_admin", "shipping"],
    };
  }

  // 8. Delivered / COD Settlement
  if (isDelivered) {
    const codInfo = calculateCodBreakdown(order);
    if (!codInfo.isSettled) {
      return {
        label: codInfo.isPartiallySettled ? "Settle Remaining COD" : "Settle COD",
        nextStatus: "COD Settled",
        actionType: "settle_cod",
        variant: "success",
        description: `Mark courier COD remittance as received (Remaining: ${money(codInfo.remainingAmount)})`,
        roleRequired: ["admin", "super_admin"],
      };
    }
    return {
      label: "COD Settled",
      actionType: "view_completed",
      variant: "neutral",
      description: `Order completed and COD funds reconciled (${money(codInfo.receivedAmount)})`,
      roleRequired: ["admin", "super_admin"],
    };
  }

  return {
    label: "Update Order",
    actionType: "move_picklist",
    variant: "neutral",
    description: "Update order status",
  };
}

/**
 * State Transition Guard
 */
export function canTransitionOrder(
  currentStatus: string,
  targetStatus: string,
  userRole: string = "admin"
): { allowed: boolean; reason?: string } {
  if (userRole === "super_admin") return { allowed: true };

  const validTransitions: Record<string, string[]> = {
    Pending: ["Picklist", "Cancelled", "On Hold"],
    Confirmed: ["Picklist", "Cancelled", "On Hold"],
    Picklist: ["Picking", "Pack & AirwayBill", "Cancelled", "On Hold"],
    Picking: ["Pack & AirwayBill", "Picklist", "Cancelled", "On Hold"],
    "Pack & AirwayBill": ["Ready to Ship", "Shipped", "Cancelled", "On Hold"],
    Packing: ["Ready to Ship", "Shipped", "Cancelled", "On Hold"],
    "Ready to Ship": ["Shipped", "Pack & AirwayBill", "Cancelled", "On Hold"],
    Shipped: ["Delivered", "Failed Delivery", "RTO", "In Transit", "Out for Delivery"],
    "In Transit": ["Delivered", "Failed Delivery", "RTO", "Out for Delivery"],
    "Out for Delivery": ["Delivered", "Failed Delivery", "RTO"],
    "Failed Delivery": ["Shipped", "RTO", "Cancelled"],
    Delivered: ["COD Settled", "Return Requested", "Refunded"],
    "COD Settled": ["Return Requested", "Refunded"],
    "Return Requested": ["Returned", "Exchange Processing", "Refund Pending"],
    Returned: ["Refunded", "Exchange Processing"],
    Cancelled: ["Pending"],
  };

  const allowedTargets = validTransitions[currentStatus] || [];
  if (allowedTargets.includes(targetStatus)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Cannot move directly from "${currentStatus}" to "${targetStatus}". Please follow the standard order lifecycle.`,
  };
}

/**
 * Smart Needs Attention System
 */
export interface AttentionReason {
  type:
    | "stock_conflict"
    | "duplicate_suspected"
    | "incomplete_address"
    | "invalid_phone"
    | "courier_failed"
    | "csr_overdue"
    | "delivery_failed"
    | "return_requested"
    | "cod_discrepancy"
    | "high_rto_risk";
  label: string;
  detail: string;
  severity: "high" | "medium" | "low";
}

export function evaluateOrderNeedsAttention(
  order: LifecycleOrder,
  allOrders: LifecycleOrder[] = [],
  allProducts: ManagedProduct[] = []
): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  const status = order.status;
  const details = order.details;

  if (status === "Cancelled" || status === "Delivered" || status === "COD Settled") {
    return reasons;
  }

  // 1. Invalid phone number
  if (!isValidPakistanPhone(details.phone)) {
    reasons.push({
      type: "invalid_phone",
      label: "Invalid Mobile",
      detail: "Mobile phone does not match valid 11-digit Pakistan format (03XX XXXXXXX).",
      severity: "high",
    });
  }

  // 2. Incomplete delivery address
  if (!details.address || details.address.trim().length < 10 || !details.city) {
    reasons.push({
      type: "incomplete_address",
      label: "Address Incomplete",
      detail: "Delivery address is very short or missing a destination city.",
      severity: "high",
    });
  }

  // 3. Failed delivery / Courier issue
  if (status === "Failed Delivery" || details.courierStatus === "Failed Delivery") {
    reasons.push({
      type: "delivery_failed",
      label: "Delivery Failed",
      detail: "Courier reported delivery failure or customer unreachable.",
      severity: "high",
    });
  }

  // 4. Return or refund requested
  if (status === "Return Requested" || details.returnStatus === "Requested") {
    reasons.push({
      type: "return_requested",
      label: "Return Requested",
      detail: "Customer has requested a return, exchange, or refund.",
      severity: "medium",
    });
  }

  // 5. CSR Verification overdue (> 24 hours in pending)
  if ((!details.csrStatus || details.csrStatus === "Pending") && order.created_at) {
    const hoursSinceCreation = (Date.now() - Date.parse(order.created_at)) / (1000 * 60 * 60);
    if (hoursSinceCreation >= 24) {
      reasons.push({
        type: "csr_overdue",
        label: "CSR Overdue",
        detail: `Order pending verification call for > ${Math.round(hoursSinceCreation)} hours.`,
        severity: "medium",
      });
    }
  }

  // 6. Duplicate order suspected
  const cleanPhone = cleanPakistanPhone(details.phone);
  if (cleanPhone && allOrders.length > 0) {
    const oneDayAgo = Date.now() - 48 * 60 * 60 * 1000;
    const isDuplicate = allOrders.some((o) => {
      if (o.id === order.id || o.status === "Cancelled") return false;
      const otherPhone = cleanPakistanPhone(o.details?.phone || "");
      const otherTime = Date.parse(o.created_at || "");
      return otherPhone === cleanPhone && otherTime >= oneDayAgo;
    });

    if (isDuplicate) {
      reasons.push({
        type: "duplicate_suspected",
        label: "Suspected Duplicate",
        detail: "Another order was placed with the same phone number within 48 hours.",
        severity: "medium",
      });
    }
  }

  // 7. High RTO Risk customer
  if (details.rtoRisk === "high") {
    reasons.push({
      type: "high_rto_risk",
      label: "High RTO Risk",
      detail: "Customer has history of returned parcels or delivery refusals.",
      severity: "high",
    });
  }

  // 8. Stock availability check for pending/picklist orders
  if (["Pending", "Picklist", "Confirmed"].includes(status) && allProducts.length > 0) {
    for (const item of order.items) {
      const prod = allProducts.find((p) => p.id === item.id);
      if (prod) {
        const sizeStock = prod.sizeStock as Record<string, number> | undefined;
        const available = sizeStock && item.size ? (sizeStock[item.size] ?? 0) : (prod.stock ?? 0);
        if (available < item.qty) {
          reasons.push({
            type: "stock_conflict",
            label: "Low/No Stock",
            detail: `"${prod.name}" (${item.size}) has only ${available} available in inventory.`,
            severity: "high",
          });
          break;
        }
      }
    }
  }

  return reasons;
}

/**
 * Duplicate Order Detector
 */
export function detectDuplicateOrder(
  order: LifecycleOrder,
  allOrders: LifecycleOrder[]
): { isDuplicate: boolean; matchedOrder?: LifecycleOrder; reason?: string } {
  const cleanPhone = cleanPakistanPhone(order.details?.phone || "");
  if (!cleanPhone || cleanPhone.length < 10) return { isDuplicate: false };

  const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;

  const match = allOrders.find((o) => {
    if (o.id === order.id || o.status === "Cancelled") return false;
    const otherPhone = cleanPakistanPhone(o.details?.phone || "");
    const otherTime = Date.parse(o.created_at || "");
    return otherPhone === cleanPhone && otherTime >= twoDaysAgo;
  });

  if (!match) return { isDuplicate: false };

  const minsAgo = Math.max(1, Math.round((Date.now() - Date.parse(match.created_at)) / (60 * 1000)));
  const timeText = minsAgo < 60 ? `${minsAgo} min${minsAgo > 1 ? "s" : ""} ago` : `${Math.round(minsAgo / 60)} hour(s) ago`;

  return {
    isDuplicate: true,
    matchedOrder: match,
    reason: `Order #${match.id} was placed ${timeText} by the same customer (${match.status}, ${money(match.total)}).`,
  };
}

/**
 * Customer Profile & History Aggregator
 */
export interface CustomerHistoryProfile {
  phone: string;
  name: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  totalSpent: number;
  deliverySuccessRate: number;
  firstOrderDate: string;
  lastOrderDate: string;
  previousAddresses: string[];
  previousCities: string[];
  purchasedProducts: { id: string; name: string; size?: string; count: number }[];
  orders: LifecycleOrder[];
}

export function analyzeCustomerHistory(
  phone: string,
  allOrders: LifecycleOrder[],
  currentOrderId?: string
): CustomerHistoryProfile {
  const cleanPhone = cleanPakistanPhone(phone);
  const matched = allOrders.filter((o) => {
    const p = cleanPakistanPhone(o.details?.phone || "");
    const alt = cleanPakistanPhone(o.details?.alternatePhone || "");
    return p === cleanPhone || alt === cleanPhone;
  });

  const addresses = new Set<string>();
  const cities = new Set<string>();
  const productMap = new Map<string, { id: string; name: string; size?: string; count: number }>();

  let deliveredCount = 0;
  let cancelledCount = 0;
  let returnedCount = 0;
  let totalSpent = 0;

  let latestName = "";
  let earliestDate = "";
  let latestDate = "";

  for (const o of matched) {
    if (o.details.name && !latestName) latestName = o.details.name;
    if (o.details.address) addresses.add(o.details.address.trim());
    if (o.details.city) cities.add(o.details.city.trim());

    if (o.created_at) {
      if (!earliestDate || o.created_at < earliestDate) earliestDate = o.created_at;
      if (!latestDate || o.created_at > latestDate) latestDate = o.created_at;
    }

    if (o.status === "Delivered" || o.status === "COD Settled") {
      deliveredCount++;
      totalSpent += o.total || 0;
    } else if (o.status === "Cancelled" || o.details.csrStatus === "Cancelled by Customer") {
      cancelledCount++;
    } else if (["RTO", "Returned", "Failed Delivery"].includes(o.status) || o.details.returnStatus === "Returned") {
      returnedCount++;
    }

    for (const item of o.items) {
      const key = `${item.id}-${item.size || "Standard"}`;
      const existing = productMap.get(key);
      if (existing) {
        existing.count += item.qty || 1;
      } else {
        productMap.set(key, {
          id: item.id,
          name: item.name || item.id,
          size: item.size,
          count: item.qty || 1,
        });
      }
    }
  }

  const successRate = matched.length > 0 ? Math.round((deliveredCount / matched.length) * 100) : 100;

  return {
    phone: cleanPhone,
    name: latestName || "Customer",
    totalOrders: matched.length,
    deliveredOrders: deliveredCount,
    cancelledOrders: cancelledCount,
    returnedOrders: returnedCount,
    totalSpent,
    deliverySuccessRate: successRate,
    firstOrderDate: earliestDate,
    lastOrderDate: latestDate,
    previousAddresses: Array.from(addresses),
    previousCities: Array.from(cities),
    purchasedProducts: Array.from(productMap.values()),
    orders: matched,
  };
}

/**
 * Export Orders to CSV
 */
export function exportOrdersToCSV(orders: LifecycleOrder[]): void {
  const headers = [
    "Order ID",
    "Date",
    "Status",
    "CSR Status",
    "Customer Name",
    "Phone",
    "Alternate Phone",
    "Address",
    "City",
    "Province",
    "Landmark",
    "Items Count",
    "Items Summary",
    "Subtotal",
    "Delivery Fee",
    "Discount",
    "Total (COD)",
    "Courier",
    "Tracking Number",
    "Source",
    "CSR Agent",
    "Notes",
  ];

  const rows = orders.map((o) => {
    const itemsSummary = o.items.map((i) => `${i.name || i.id} (${i.size}) × ${i.qty}`).join(" | ");
    return [
      o.id,
      o.created_at ? new Date(o.created_at).toLocaleString("en-PK") : "",
      o.status,
      o.details.csrStatus || "Pending",
      `"${(o.details.name || "").replace(/"/g, '""')}"`,
      o.details.phone || "",
      o.details.alternatePhone || "",
      `"${(o.details.address || "").replace(/"/g, '""')}"`,
      o.details.city || "",
      o.details.province || "",
      `"${(o.details.landmark || "").replace(/"/g, '""')}"`,
      o.items.reduce((s, i) => s + (i.qty || 1), 0),
      `"${itemsSummary.replace(/"/g, '""')}"`,
      o.details.subtotal || o.total,
      o.details.deliveryCharge || 0,
      o.details.discount || 0,
      o.total,
      o.details.courier || "",
      o.details.trackingNumber || "",
      o.details.source || "Website",
      o.details.csrAgent || "",
      `"${(o.details.note || o.details.csrNotes || "").replace(/"/g, '""')}"`,
    ].join(",");
  });

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * COD Financial Reconciliation Source of Truth
 */
export function calculateCodBreakdown(order: LifecycleOrder): CodFinancialBreakdown {
  const isCancelled = order.status === "Cancelled" || order.status === "Refunded";
  const rawPaymentMethod = (order.details?.paymentMethod || "").toLowerCase();
  const isExplicitNonCod = rawPaymentMethod.includes("card") || rawPaymentMethod.includes("bank transfer (prepaid)") || rawPaymentMethod.includes("jazzcash (prepaid)");

  if (isCancelled || (isExplicitNonCod && order.details?.paymentStatus === "Paid")) {
    return {
      expectedAmount: 0,
      receivedAmount: 0,
      remainingAmount: 0,
      status: "Not Applicable",
      transactions: [],
      isSettled: true,
      isPartiallySettled: false,
      isPending: false,
      isDisputed: false,
    };
  }

  const expectedAmount = Math.max(0, Number(order.total || 0));
  const rawHistory: CodSettlementTransaction[] = Array.isArray(order.details?.codSettlementHistory)
    ? order.details.codSettlementHistory
    : [];

  let transactions = [...rawHistory];

  // Backward compatibility: If no history array exists but codSettled or codCollected was true
  if (transactions.length === 0 && (order.details?.codSettled || order.details?.codCollected || order.status === "COD Settled")) {
    transactions.push({
      id: `SET-LEGACY-${order.id}`,
      amount: expectedAmount,
      date: (order.details?.codSettledAt || order.created_at || new Date().toISOString()).slice(0, 10),
      courier: order.details?.courier || "Trax Logistics",
      reference: "Legacy Settlement",
      paymentMethod: "Bank Transfer",
      note: "Migrated legacy settlement record",
      recordedAt: order.details?.codSettledAt || order.created_at || new Date().toISOString(),
      type: "payment",
    });
  }

  // Calculate net received amount: sum positive payments/adjustments minus reversals
  let receivedAmount = 0;
  for (const tx of transactions) {
    if (tx.type === "reversal") {
      receivedAmount -= Number(tx.amount || 0);
    } else {
      receivedAmount += Number(tx.amount || 0);
    }
  }
  receivedAmount = Math.max(0, receivedAmount);
  const remainingAmount = Math.max(0, expectedAmount - receivedAmount);

  const isDisputed = Boolean(order.details?.codDisputed);
  let status: CodSettlementStatus = "Pending";

  if (isDisputed) {
    status = "Disputed";
  } else if (receivedAmount >= expectedAmount && expectedAmount > 0) {
    status = "Settled";
  } else if (receivedAmount > 0) {
    status = "Partially Settled";
  } else {
    status = "Pending";
  }

  return {
    expectedAmount,
    receivedAmount,
    remainingAmount,
    status,
    transactions,
    isSettled: status === "Settled",
    isPartiallySettled: status === "Partially Settled",
    isPending: status === "Pending",
    isDisputed,
    disputeReason: order.details?.codDisputeReason,
    disputeNotes: order.details?.codDisputeNotes,
  };
}

export function isCodSettled(order: LifecycleOrder): boolean {
  return calculateCodBreakdown(order).isSettled;
}

export function getCodStatusBadge(status: CodSettlementStatus): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  switch (status) {
    case "Settled":
      return {
        label: "Settled",
        color: "#166534",
        bg: "#dcfce7",
        border: "#bbf7d0",
      };
    case "Partially Settled":
      return {
        label: "Partially Settled",
        color: "#9a3412",
        bg: "#ffedd5",
        border: "#fed7aa",
      };
    case "Disputed":
      return {
        label: "Disputed",
        color: "#991b1b",
        bg: "#fee2e2",
        border: "#fca5a5",
      };
    case "Not Applicable":
      return {
        label: "N/A (Prepaid)",
        color: "#475569",
        bg: "#f1f5f9",
        border: "#e2e8f0",
      };
    case "Pending":
    default:
      return {
        label: "Pending Remittance",
        color: "#854d0e",
        bg: "#fef9c3",
        border: "#fde047",
      };
  }
}

/**
 * Export COD Settlements to CSV
 */
export function exportCodSettlementsToCSV(orders: LifecycleOrder[]): void {
  const headers = [
    "Order ID",
    "Customer Name",
    "Phone",
    "City",
    "Courier",
    "Tracking Number",
    "Delivered Date",
    "Expected COD (PKR)",
    "Received Amount (PKR)",
    "Remaining Amount (PKR)",
    "Settlement Status",
    "Dispute Reason",
    "Latest Reference",
  ];

  const rows = orders.map((o) => {
    const breakdown = calculateCodBreakdown(o);
    const lastTx = breakdown.transactions[breakdown.transactions.length - 1];
    return [
      `"${o.id}"`,
      `"${(o.details?.name || "").replace(/"/g, '""')}"`,
      `"${o.details?.phone || ""}"`,
      `"${o.details?.city || ""}"`,
      `"${o.details?.courier || "Trax"}"`,
      `"${o.details?.trackingNumber || ""}"`,
      `"${o.details?.deliveredAt || o.created_at || ""}"`,
      breakdown.expectedAmount,
      breakdown.receivedAmount,
      breakdown.remainingAmount,
      `"${breakdown.status}"`,
      `"${(breakdown.disputeReason || "").replace(/"/g, '""')}"`,
      `"${(lastTx?.reference || "").replace(/"/g, '""')}"`,
    ].join(",");
  });

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `cod_settlements_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


