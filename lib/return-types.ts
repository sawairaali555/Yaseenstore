export type ReturnStatus =
  | "Requested"
  | "Approved"
  | "In Transit"
  | "Received"
  | "Refunded"
  | "Rejected"
  | "Cancelled";

export type RefundStatus =
  | "Not Applicable"
  | "Pending"
  | "Processing"
  | "Refunded"
  | "Rejected";

export type InspectionStatus =
  | "Pending Inspection"
  | "Good Condition"
  | "Opened/Used"
  | "Damaged"
  | "Wrong Item Returned"
  | "Missing Items";

export type InventoryAction =
  | "Pending"
  | "Restocked"
  | "Do Not Restock";

export type ReturnReason =
  | "Damaged / Defective"
  | "Wrong Item Delivered"
  | "Wrong Size / Fit Issue"
  | "Color Mismatch"
  | "Item Not as Described"
  | "Customer Changed Mind"
  | "Missing Accessories / Parts"
  | "Quality Not Satisfactory"
  | "Other";

export interface ReturnItem {
  id: string; // Product ID
  variantId?: string;
  name: string;
  sku: string;
  color?: string;
  colorHex?: string;
  size?: string;
  image?: string;
  orderedQty: number;
  returnQty: number;
  unitPrice: number;
  totalPrice: number; // returnQty * unitPrice
  restocked?: boolean;
  restockedAt?: string;
  restockedBy?: string;
}

export interface ReturnTimelineEntry {
  id: string;
  step:
    | "Requested"
    | "Approved"
    | "In Transit"
    | "Received"
    | "Inspected"
    | "Refund Processing"
    | "Refunded"
    | "Rejected"
    | "Restocked"
    | "Note Added"
    | "Cancelled";
  title: string;
  description?: string;
  actor: string;
  actorRole?: string;
  timestamp: string;
}

export interface ReturnRequest {
  id: string; // e.g. RET-1001
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAltPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  orderDate: string;
  deliveryDate?: string;
  requestedDate: string;
  returnStatus: ReturnStatus;
  refundStatus: RefundStatus;
  inspectionStatus: InspectionStatus;
  inventoryAction: InventoryAction;
  items: ReturnItem[];
  totalRefundableAmount: number;
  approvedRefundAmount: number;
  returnReason: ReturnReason | string;
  customerComments?: string;
  evidenceImages: string[];
  rejectionReason?: string;
  internalNotes?: string;
  // Refund Transaction Details
  refundMethod?: "Bank Transfer" | "EasyPaisa" | "JazzCash" | "Store Credit" | "Cash" | string;
  refundAccountTitle?: string;
  refundAccountNumber?: string;
  refundBankName?: string;
  refundReference?: string;
  refundedAt?: string;
  refundedBy?: string;
  // Tracking & Timeline
  courier?: string;
  trackingNumber?: string;
  timeline: ReturnTimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export const RETURN_REASONS: ReturnReason[] = [
  "Damaged / Defective",
  "Wrong Item Delivered",
  "Wrong Size / Fit Issue",
  "Color Mismatch",
  "Item Not as Described",
  "Customer Changed Mind",
  "Missing Accessories / Parts",
  "Quality Not Satisfactory",
  "Other",
];

export const INSPECTION_STATUSES: InspectionStatus[] = [
  "Pending Inspection",
  "Good Condition",
  "Opened/Used",
  "Damaged",
  "Wrong Item Returned",
  "Missing Items",
];

export const REFUND_METHODS = [
  "EasyPaisa",
  "JazzCash",
  "Bank Transfer",
  "Cash",
  "Store Credit",
] as const;

export function calculateReturnItemsTotal(items: ReturnItem[]): number {
  return items.reduce((sum, it) => sum + (Number(it.unitPrice || 0) * Number(it.returnQty || 0)), 0);
}

export function getReturnStatusBadge(status: ReturnStatus): { label: string; bg: string; color: string; border: string } {
  switch (status) {
    case "Requested":
      return { label: "Requested", bg: "#fef3c7", color: "#b45309", border: "#fde68a" };
    case "Approved":
      return { label: "Approved", bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
    case "In Transit":
      return { label: "In Transit", bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" };
    case "Received":
      return { label: "Received", bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" };
    case "Refunded":
      return { label: "Refunded", bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" };
    case "Rejected":
      return { label: "Rejected", bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" };
    case "Cancelled":
      return { label: "Cancelled", bg: "#f8fafc", color: "#64748b", border: "#cbd5e1" };
    default:
      return { label: status, bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
  }
}

export function getRefundStatusBadge(status: RefundStatus): { label: string; bg: string; color: string; border: string } {
  switch (status) {
    case "Pending":
      return { label: "Refund Pending", bg: "#fffbeb", color: "#b45309", border: "#fde68a" };
    case "Processing":
      return { label: "Refund Processing", bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
    case "Refunded":
      return { label: "Refunded", bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" };
    case "Rejected":
      return { label: "Refund Rejected", bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" };
    case "Not Applicable":
    default:
      return { label: "No Refund", bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };
  }
}

export function getInspectionBadge(status: InspectionStatus): { label: string; bg: string; color: string; border: string } {
  switch (status) {
    case "Good Condition":
      return { label: "Good Condition", bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" };
    case "Opened/Used":
      return { label: "Opened / Used", bg: "#fef3c7", color: "#b45309", border: "#fde68a" };
    case "Damaged":
      return { label: "Damaged", bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" };
    case "Wrong Item Returned":
      return { label: "Wrong Item", bg: "#fdf2f8", color: "#be185d", border: "#fbcfe8" };
    case "Missing Items":
      return { label: "Missing Items", bg: "#fff1f2", color: "#e11d48", border: "#fecdd3" };
    case "Pending Inspection":
    default:
      return { label: "Pending Inspection", bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };
  }
}

export function getInventoryActionBadge(action: InventoryAction): { label: string; bg: string; color: string; border: string } {
  switch (action) {
    case "Restocked":
      return { label: "Restocked", bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" };
    case "Do Not Restock":
      return { label: "Do Not Restock", bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" };
    case "Pending":
    default:
      return { label: "Restock Pending", bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };
  }
}

