"use client";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  CheckCircle2,
  Clock,
  Package,
  Truck,
  AlertTriangle,
  XCircle,
  Banknote,
  Check,
  X,
  Phone,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Layers,
  ArrowRight,
  ImageIcon,
  Send,
  HelpCircle,
  MapPin,
  Sparkles,
} from "lucide-react";
import { money } from "@/app/catalog";
import {
  ReturnRequest,
  ReturnStatus,
  RefundStatus,
  InspectionStatus,
  InventoryAction,
  getReturnStatusBadge,
  getRefundStatusBadge,
  getInspectionBadge,
  getInventoryActionBadge,
  INSPECTION_STATUSES,
  REFUND_METHODS,
} from "@/lib/return-types";
import { openWhatsApp } from "./panel";
import { toast } from "sonner";

interface Props {
  returnRequest: ReturnRequest | null;
  open: boolean;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (returnId: string, status: ReturnStatus, opts?: { rejectionReason?: string; courier?: string; trackingNumber?: string; note?: string }) => Promise<void>;
  onInspect: (returnId: string, inspectionStatus: InspectionStatus, notes?: string) => Promise<void>;
  onRestock: (returnId: string, itemIndexes?: number[], note?: string, action?: "restock" | "do_not_restock") => Promise<void>;
  onProcessRefund: (returnId: string, data: { refundAmount: number; refundMethod: string; refundReference: string; refundAccountTitle?: string; refundAccountNumber?: string; refundBankName?: string; refundNotes?: string }) => Promise<void>;
  onAddNote: (returnId: string, note: string) => Promise<void>;
  onNavigateToOrder?: (orderId: string) => void;
}

export default function ReturnDetailDrawer(props: Props) {
  if (!props.open || !props.returnRequest) return null;
  return <ReturnDetailContent {...props} returnRequest={props.returnRequest} key={props.returnRequest.id} />;
}

function ReturnDetailContent({
  returnRequest,
  open,
  busy = false,
  onOpenChange,
  onUpdateStatus,
  onInspect,
  onRestock,
  onProcessRefund,
  onAddNote,
  onNavigateToOrder,
}: Omit<Props, 'returnRequest'> & { returnRequest: ReturnRequest }) {

  // Local interaction states
  const [activeTab, setActiveTab] = useState<"overview" | "inspection" | "refund" | "timeline" | "notes">("overview");
  
  // Inspection form state
  const [inspectStatus, setInspectStatus] = useState<InspectionStatus>(
    returnRequest.inspectionStatus || "Pending Inspection"
  );
  const [inspectNotes, setInspectNotes] = useState("");

  // Restock confirmation modal state
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [restockNote, setRestockNote] = useState("");

  // Refund form state
  const [refundAmount, setRefundAmount] = useState<string>(
    String(returnRequest.approvedRefundAmount || returnRequest.totalRefundableAmount || 0)
  );
  const [refundMethod, setRefundMethod] = useState<string>(
    returnRequest.refundMethod || "EasyPaisa"
  );
  const [refundAccountTitle, setRefundAccountTitle] = useState(returnRequest.refundAccountTitle || "");
  const [refundAccountNumber, setRefundAccountNumber] = useState(returnRequest.refundAccountNumber || "");
  const [refundBankName, setRefundBankName] = useState(returnRequest.refundBankName || "");
  const [refundReference, setRefundReference] = useState(returnRequest.refundReference || "");
  const [refundNotes, setRefundNotes] = useState("");
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false);

  // Status transition state
  const [transitionCourier, setTransitionCourier] = useState(returnRequest.courier || "Trax Logistics");
  const [transitionTracking, setTransitionTracking] = useState(returnRequest.trackingNumber || "");

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [rejectionNoteInput, setRejectionNoteInput] = useState("");

  // Note addition state
  const [newInternalNote, setNewInternalNote] = useState("");

  // Zoom image state
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const retBadge = getReturnStatusBadge(returnRequest.returnStatus);
  const refBadge = getRefundStatusBadge(returnRequest.refundStatus);
  const inspBadge = getInspectionBadge(returnRequest.inspectionStatus);
  const invBadge = getInventoryActionBadge(returnRequest.inventoryAction);

  const canApprove = returnRequest.returnStatus === "Requested";
  const canShip = returnRequest.returnStatus === "Approved";
  const canReceive = returnRequest.returnStatus === "In Transit" || returnRequest.returnStatus === "Approved";
  const isReceived = ["Received", "Refunded"].includes(returnRequest.returnStatus) || returnRequest.inspectionStatus !== "Pending Inspection";
  const canRestock = isReceived && returnRequest.inventoryAction !== "Restocked" && returnRequest.returnStatus !== "Rejected";
  const canRefund = returnRequest.refundStatus !== "Refunded" && returnRequest.returnStatus !== "Rejected";

  const totalDeliveredQty = returnRequest.items.reduce((sum, it) => sum + it.orderedQty, 0);
  const totalReturningQty = returnRequest.items.reduce((sum, it) => sum + it.returnQty, 0);
  const isPartialReturn = totalReturningQty < totalDeliveredQty;

  const milestones: { label: string; done: boolean; current: boolean }[] = [
    { label: "Requested", done: true, current: returnRequest.returnStatus === "Requested" },
    { label: "Approved", done: ["Approved", "In Transit", "Received", "Refunded"].includes(returnRequest.returnStatus), current: returnRequest.returnStatus === "Approved" },
    { label: "In Transit", done: ["In Transit", "Received", "Refunded"].includes(returnRequest.returnStatus), current: returnRequest.returnStatus === "In Transit" },
    { label: "Received", done: ["Received", "Refunded"].includes(returnRequest.returnStatus), current: returnRequest.returnStatus === "Received" },
    { label: "Inspected", done: returnRequest.inspectionStatus !== "Pending Inspection", current: isReceived && returnRequest.inspectionStatus !== "Pending Inspection" && returnRequest.refundStatus !== "Refunded" },
    { label: "Refunded", done: returnRequest.refundStatus === "Refunded", current: returnRequest.refundStatus === "Refunded" },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className="admin-order-sheet"
          style={{
            width: "100%",
            maxWidth: 780,
            background: "#ffffff",
            overflowY: "auto",
            padding: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Top Sticky Header */}
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid #e2e8f0",
              background: "#f8fafc",
              position: "sticky",
              top: 0,
              zIndex: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                  <SheetTitle style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                    Return #{returnRequest.id}
                  </SheetTitle>
                  {isPartialReturn ? (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" }}>
                      Partial Return ({totalReturningQty} of {totalDeliveredQty} items)
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>
                      Full Return ({totalReturningQty} items)
                    </span>
                  )}
                </div>
                <SheetDescription style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Order:{" "}
                  <button
                    type="button"
                    onClick={() => onNavigateToOrder && onNavigateToOrder(returnRequest.orderId)}
                    style={{ background: "none", border: 0, color: "#2563eb", fontWeight: 700, cursor: "pointer", padding: 0, textDecoration: "underline" }}
                  >
                    #{returnRequest.orderId}
                  </button>{" "}
                  · Requested on {new Date(returnRequest.requestedDate || returnRequest.createdAt).toLocaleString("en-PK", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </SheetDescription>
              </div>

              {/* Quick WhatsApp / Call */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => {
                    const cleanPhone = returnRequest.customerPhone.replace(/[^0-9]/g, "");
                    window.open(`tel:${cleanPhone}`, "_self");
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    borderRadius: 7,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#334155",
                    cursor: "pointer",
                  }}
                >
                  <Phone size={13} style={{ color: "#0284c7" }} /> Call
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = `Assalam-o-Alaikum ${returnRequest.customerName}! Regarding your Return Request #${returnRequest.id} for Order #${returnRequest.orderId} at Cartify Pakistan.`;
                    openWhatsApp(returnRequest.customerPhone, text);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    borderRadius: 7,
                    border: "1px solid #86efac",
                    background: "#f0fdf4",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#16a34a",
                    cursor: "pointer",
                  }}
                >
                  <MessageCircle size={13} /> WhatsApp
                </button>
              </div>
            </div>

            {/* 4 Separate Status Pills */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Return Status</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: retBadge.bg, color: retBadge.color, border: `1px solid ${retBadge.border}`, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: retBadge.color }} />
                  {retBadge.label}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Refund Status</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: refBadge.bg, color: refBadge.color, border: `1px solid ${refBadge.border}`, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Banknote size={12} />
                  {refBadge.label}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Inspection Status</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: inspBadge.bg, color: inspBadge.color, border: `1px solid ${inspBadge.border}`, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <ShieldCheck size={12} />
                  {inspBadge.label}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Inventory Action</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: invBadge.bg, color: invBadge.color, border: `1px solid ${invBadge.border}`, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Package size={12} />
                  {invBadge.label}
                </span>
              </div>
            </div>

            {/* Lifecycle Milestone Bar */}
            {returnRequest.returnStatus !== "Rejected" && returnRequest.returnStatus !== "Cancelled" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, background: "#ffffff", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                {milestones.map((m, idx) => (
                  <React.Fragment key={m.label}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: m.done ? 1 : 0.45 }}>
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: m.done ? "#2563eb" : "#e2e8f0",
                          color: "#ffffff",
                          fontSize: 10,
                          fontWeight: 700,
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        {m.done ? <Check size={11} /> : idx + 1}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: m.current ? 800 : 600, color: m.current ? "#1d4ed8" : "#475569" }}>
                        {m.label}
                      </span>
                    </div>
                    {idx < milestones.length - 1 && (
                      <div style={{ flex: 1, height: 2, background: m.done ? "#93c5fd" : "#e2e8f0", margin: "0 8px" }} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Quick Primary Actions Strip */}
          <div style={{ padding: "12px 24px", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {canApprove && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onUpdateStatus(returnRequest.id, "Approved", { note: "Approved by CSR for reverse pickup." })}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 16px",
                    borderRadius: 8,
                    background: "#2563eb",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    border: 0,
                    cursor: "pointer",
                  }}
                >
                  <Check size={14} /> Approve Return
                </button>
              )}

              {canShip && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onUpdateStatus(returnRequest.id, "In Transit", { courier: transitionCourier, trackingNumber: transitionTracking })}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 16px",
                    borderRadius: 8,
                    background: "#7c3aed",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    border: 0,
                    cursor: "pointer",
                  }}
                >
                  <Truck size={14} /> Mark Pickup / In Transit
                </button>
              )}

              {canReceive && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onUpdateStatus(returnRequest.id, "Received", { note: "Parcel delivered by courier rider to warehouse." })}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 16px",
                    borderRadius: 8,
                    background: "#059669",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    border: 0,
                    cursor: "pointer",
                  }}
                >
                  <CheckCircle2 size={14} /> Mark Received at Warehouse
                </button>
              )}

              {canRestock && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRestockModalOpen(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 16px",
                    borderRadius: 8,
                    background: "#0f766e",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    border: 0,
                    cursor: "pointer",
                  }}
                >
                  <Layers size={14} /> Restock Returned Items (+Qty)
                </button>
              )}

              {canRefund && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setActiveTab("refund")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 16px",
                    borderRadius: 8,
                    background: "#16a34a",
                    color: "#ffffff",
                    fontSize: 12.5,
                    fontWeight: 700,
                    border: 0,
                    cursor: "pointer",
                  }}
                >
                  <Banknote size={14} /> Process Refund ({money(returnRequest.totalRefundableAmount)})
                </button>
              )}
            </div>

            {returnRequest.returnStatus !== "Rejected" && returnRequest.returnStatus !== "Refunded" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setRejectModalOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "6px 12px",
                  borderRadius: 7,
                  background: "#fef2f2",
                  color: "#dc2626",
                  fontSize: 11.5,
                  fontWeight: 700,
                  border: "1px solid #fecaca",
                  cursor: "pointer",
                }}
              >
                <XCircle size={13} /> Reject Return
              </button>
            )}
          </div>

          {/* Navigation Sub-Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#ffffff", padding: "0 24px" }}>
            {[
              { id: "overview", label: "Overview & Items" },
              { id: "inspection", label: "Inspection & Restock" },
              { id: "refund", label: "Refund Processing" },
              { id: "timeline", label: `Timeline (${returnRequest.timeline.length})` },
              { id: "notes", label: "Internal Notes" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                style={{
                  padding: "12px 16px",
                  fontSize: 13,
                  fontWeight: activeTab === t.id ? 700 : 500,
                  color: activeTab === t.id ? "#2563eb" : "#64748b",
                  borderBottom: activeTab === t.id ? "2px solid #2563eb" : "2px solid transparent",
                  background: "none",
                  border: 0,
                  borderBottomWidth: 2,
                  borderBottomStyle: "solid",
                  borderBottomColor: activeTab === t.id ? "#2563eb" : "transparent",
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Drawer Body Content */}
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
            {/* TAB 1: OVERVIEW & ITEMS */}
            {activeTab === "overview" && (
              <>
                {/* Rejection Alert if rejected */}
                {returnRequest.returnStatus === "Rejected" && (
                  <div style={{ padding: "14px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <AlertTriangle size={20} style={{ color: "#dc2626", marginTop: 2 }} />
                    <div>
                      <strong style={{ color: "#991b1b", fontSize: 13.5, display: "block" }}>Return Request Rejected</strong>
                      <p style={{ color: "#b91c1c", fontSize: 12.5, marginTop: 2 }}>
                        {returnRequest.rejectionReason || "Customer did not meet return policy criteria."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Customer Information Card */}
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <MapPin size={15} style={{ color: "#2563eb" }} /> Customer &amp; Delivery Details
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: 12.5 }}>
                    <div>
                      <span style={{ color: "#64748b", display: "block", fontSize: 11 }}>Customer Name</span>
                      <strong style={{ color: "#0f172a" }}>{returnRequest.customerName}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block", fontSize: 11 }}>Phone Number</span>
                      <strong style={{ color: "#0f172a" }}>{returnRequest.customerPhone}</strong>
                      {returnRequest.customerAltPhone && (
                        <span style={{ fontSize: 11, color: "#64748b", marginLeft: 4 }}>
                          (Alt: {returnRequest.customerAltPhone})
                        </span>
                      )}
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block", fontSize: 11 }}>City</span>
                      <strong style={{ color: "#0f172a" }}>{returnRequest.customerCity || "Pakistan"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block", fontSize: 11 }}>Address</span>
                      <span style={{ color: "#334155" }}>{returnRequest.customerAddress || "Incomplete Address"}</span>
                    </div>
                  </div>
                </div>

                {/* Returned Items Card */}
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                      <Package size={15} style={{ color: "#2563eb" }} /> Returned Items ({returnRequest.items.length})
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                      Refundable: {money(returnRequest.totalRefundableAmount)}
                    </span>
                  </div>
                  <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#fafafa", color: "#64748b", textAlign: "left", borderBottom: "1px solid #f1f5f9" }}>
                        <th style={{ padding: "10px 14px" }}>Product</th>
                        <th style={{ padding: "10px 14px" }}>Variant / SKU</th>
                        <th style={{ padding: "10px 14px", textAlign: "center" }}>Ordered Qty</th>
                        <th style={{ padding: "10px 14px", textAlign: "center" }}>Return Qty</th>
                        <th style={{ padding: "10px 14px", textAlign: "right" }}>Unit Price</th>
                        <th style={{ padding: "10px 14px", textAlign: "right" }}>Line Total</th>
                        <th style={{ padding: "10px 14px", textAlign: "center" }}>Restock Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnRequest.items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                            <img
                              src={it.image || "/images/placeholder.jpg"}
                              alt={it.name}
                              style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 6, background: "#f8fafc", border: "1px solid #e2e8f0" }}
                            />
                            <div>
                              <strong style={{ color: "#0f172a", display: "block", fontSize: 13 }}>{it.name}</strong>
                              <span style={{ fontSize: 11, color: "#64748b" }}>ID: {it.id}</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                {it.color && (
                                  <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "#f1f5f9", color: "#334155" }}>
                                    {it.color}
                                  </span>
                                )}
                                {it.size && (
                                  <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "#eff6ff", color: "#2563eb" }}>
                                    Size {it.size}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: 10.5, fontFamily: "monospace", color: "#94a3b8" }}>
                                SKU: {it.sku || it.id}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "center", color: "#64748b" }}>
                            {it.orderedQty}
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "center" }}>
                            <span style={{ fontSize: 12.5, fontWeight: 800, color: "#dc2626", background: "#fef2f2", padding: "2px 8px", borderRadius: 5 }}>
                              {it.returnQty}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "right", color: "#475569" }}>
                            {money(it.unitPrice)}
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                            {money(it.totalPrice || it.unitPrice * it.returnQty)}
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "center" }}>
                            {it.restocked ? (
                              <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                <Check size={11} /> Restocked
                              </span>
                            ) : (
                              <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" }}>
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Return Reason & Evidence Gallery */}
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <HelpCircle size={15} style={{ color: "#2563eb" }} /> Return Reason &amp; Customer Notes
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>Reason:</span>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
                        {returnRequest.returnReason}
                      </span>
                    </div>
                    {returnRequest.customerComments && (
                      <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12.5, color: "#334155" }}>
                        <strong style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 2 }}>Customer comments:</strong>
                        "{returnRequest.customerComments}"
                      </div>
                    )}
                    {returnRequest.evidenceImages && returnRequest.evidenceImages.length > 0 && (
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
                          Customer Uploaded Photos ({returnRequest.evidenceImages.length}):
                        </span>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          {returnRequest.evidenceImages.map((imgUrl, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setZoomedImage(imgUrl)}
                              style={{
                                width: 70,
                                height: 70,
                                borderRadius: 8,
                                border: "1px solid #cbd5e1",
                                padding: 2,
                                background: "#f8fafc",
                                cursor: "pointer",
                                overflow: "hidden",
                              }}
                              title="Click to zoom image"
                            >
                              <img src={imgUrl} alt="evidence" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: INSPECTION & RESTOCK */}
            {activeTab === "inspection" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Inspection Controls Card */}
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    <ShieldCheck size={16} style={{ color: "#2563eb" }} /> Quality Inspection Workflow
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
                    Inspect the physical condition of the returned item after receiving it at the warehouse.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                      Select Item Condition:
                      <select
                        value={inspectStatus}
                        onChange={(e) => setInspectStatus(e.target.value as InspectionStatus)}
                        style={{ width: "100%", height: 40, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 12px", marginTop: 6, fontSize: 13, fontWeight: 600, background: "#ffffff" }}
                      >
                        {INSPECTION_STATUSES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </label>

                    <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                      Inspection Findings &amp; Quality Notes:
                      <textarea
                        rows={3}
                        value={inspectNotes}
                        onChange={(e) => setInspectNotes(e.target.value)}
                        placeholder="e.g. Item tested, original packaging and tags intact. No signs of wear. Approved for restocking."
                        style={{ width: "100%", borderRadius: 8, border: "1px solid #cbd5e1", padding: "10px 12px", marginTop: 6, fontSize: 12.5, fontFamily: "inherit" }}
                      />
                    </label>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        await onInspect(returnRequest.id, inspectStatus, inspectNotes);
                        toast.success("Inspection status updated successfully!");
                      }}
                      style={{
                        alignSelf: "flex-start",
                        padding: "8px 20px",
                        borderRadius: 8,
                        background: "#2563eb",
                        color: "#ffffff",
                        fontSize: 13,
                        fontWeight: 700,
                        border: 0,
                        cursor: "pointer",
                      }}
                    >
                      Save Inspection Status
                    </button>
                  </div>
                </div>

                {/* Inventory Action / Restocking Card */}
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    <Layers size={16} style={{ color: "#059669" }} /> Inventory Restocking Action
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
                    Restock returned quantities strictly back into their <b>exact variant stock (Color / Size)</b>.
                  </p>

                  <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: "#475569", marginBottom: 8, fontWeight: 600 }}>Target Inventory Restock Summary:</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#1e293b", display: "flex", flexDirection: "column", gap: 6 }}>
                      {returnRequest.items.map((it, idx) => (
                        <li key={idx}>
                          <strong>{it.name}</strong> · Variant: <span style={{ color: "#2563eb", fontWeight: 700 }}>{it.color || "Standard"} / {it.size || "Standard"}</span> · SKU: <span style={{ fontFamily: "monospace" }}>{it.sku || it.id}</span> · Quantity: <span style={{ color: "#16a34a", fontWeight: 800 }}>+{it.returnQty} units</span> {it.restocked && <span style={{ color: "#16a34a", fontWeight: 700 }}>(Already Restocked)</span>}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {returnRequest.inventoryAction === "Restocked" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#16a34a", fontWeight: 700, fontSize: 13, background: "#f0fdf4", padding: "8px 16px", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                        <CheckCircle2 size={16} /> All returned items have been restocked into exact variant stock.
                      </div>
                    ) : returnRequest.inventoryAction === "Do Not Restock" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#dc2626", fontWeight: 700, fontSize: 13, background: "#fef2f2", padding: "8px 16px", borderRadius: 8, border: "1px solid #fecaca" }}>
                        <XCircle size={16} /> Marked as Do Not Restock (Damaged / Unsalable).
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={busy || !isReceived}
                          onClick={() => setRestockModalOpen(true)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 20px",
                            borderRadius: 8,
                            background: isReceived ? "#059669" : "#94a3b8",
                            color: "#ffffff",
                            fontSize: 13,
                            fontWeight: 700,
                            border: 0,
                            cursor: isReceived ? "pointer" : "not-allowed",
                          }}
                        >
                          <Package size={15} /> Confirm &amp; Restock to Exact Variant
                        </button>

                        <button
                          type="button"
                          disabled={busy || !isReceived}
                          onClick={() => onRestock(returnRequest.id, undefined, "Marked as Do Not Restock due to item condition.", "do_not_restock")}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 18px",
                            borderRadius: 8,
                            background: "#ffffff",
                            color: "#dc2626",
                            fontSize: 12.5,
                            fontWeight: 600,
                            border: "1px solid #fecaca",
                            cursor: isReceived ? "pointer" : "not-allowed",
                          }}
                        >
                          Do Not Restock
                        </button>
                      </>
                    )}
                  </div>
                  {!isReceived && (
                    <small style={{ color: "#94a3b8", display: "block", marginTop: 8, fontSize: 11 }}>
                      * Item must be marked as Received at the warehouse before restocking.
                    </small>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: REFUND PROCESSING */}
            {activeTab === "refund" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {returnRequest.refundStatus === "Refunded" ? (
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "20px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <CheckCircle2 size={24} style={{ color: "#16a34a" }} />
                      <div>
                        <strong style={{ fontSize: 16, color: "#15803d", display: "block" }}>Refund Completed &amp; Settled</strong>
                        <span style={{ fontSize: 12, color: "#16a34a" }}>
                          Processed on {returnRequest.refundedAt ? new Date(returnRequest.refundedAt).toLocaleString("en-PK") : "recently"}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, fontSize: 12.5, marginTop: 14, paddingTop: 14, borderTop: "1px solid #bbf7d0" }}>
                      <div>
                        <span style={{ color: "#15803d", fontSize: 11, display: "block" }}>Refund Amount</span>
                        <strong style={{ fontSize: 16, color: "#0f172a" }}>{money(returnRequest.approvedRefundAmount || returnRequest.totalRefundableAmount)}</strong>
                      </div>
                      <div>
                        <span style={{ color: "#15803d", fontSize: 11, display: "block" }}>Payment Method</span>
                        <strong style={{ color: "#0f172a" }}>{returnRequest.refundMethod || "EasyPaisa"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "#15803d", fontSize: 11, display: "block" }}>Transaction / Ref #</span>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>{returnRequest.refundReference || "N/A"}</span>
                      </div>
                      <div>
                        <span style={{ color: "#15803d", fontSize: 11, display: "block" }}>Processed By</span>
                        <strong style={{ color: "#0f172a" }}>{returnRequest.refundedBy || "Admin"}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                      <Banknote size={18} style={{ color: "#16a34a" }} /> Process Customer Refund
                    </div>
                    <p style={{ fontSize: 12, color: "#64748b", marginBottom: 18 }}>
                      Record customer payout details for returned items. The refund amount cannot exceed total refundable amount.
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                        Refund Amount (PKR) <span style={{ color: "#dc2626" }}>*</span>
                        <input
                          type="number"
                          min="0"
                          max={returnRequest.totalRefundableAmount}
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                          style={{ width: "100%", height: 40, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 12px", marginTop: 6, fontSize: 14, fontWeight: 700, color: "#0f172a" }}
                        />
                        <span style={{ fontSize: 11, color: "#64748b", display: "block", marginTop: 4 }}>
                          Max refundable: <b>{money(returnRequest.totalRefundableAmount)}</b>
                        </span>
                      </label>

                      <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                        Refund Method <span style={{ color: "#dc2626" }}>*</span>
                        <select
                          value={refundMethod}
                          onChange={(e) => setRefundMethod(e.target.value)}
                          style={{ width: "100%", height: 40, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 12px", marginTop: 6, fontSize: 13, fontWeight: 600, background: "#ffffff" }}
                        >
                          {REFUND_METHODS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </label>

                      <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                        Account Title
                        <input
                          type="text"
                          placeholder="e.g. Ayesha Malik"
                          value={refundAccountTitle}
                          onChange={(e) => setRefundAccountTitle(e.target.value)}
                          style={{ width: "100%", height: 40, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 12px", marginTop: 6, fontSize: 13 }}
                        />
                      </label>

                      <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                        Account / Wallet Number
                        <input
                          type="text"
                          placeholder="03001234567 or IBAN"
                          value={refundAccountNumber}
                          onChange={(e) => setRefundAccountNumber(e.target.value)}
                          style={{ width: "100%", height: 40, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 12px", marginTop: 6, fontSize: 13 }}
                        />
                      </label>

                      {refundMethod === "Bank Transfer" && (
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", gridColumn: "1 / -1" }}>
                          Bank Name
                          <input
                            type="text"
                            placeholder="e.g. Meezan Bank / HBL / Standard Chartered"
                            value={refundBankName}
                            onChange={(e) => setRefundBankName(e.target.value)}
                            style={{ width: "100%", height: 40, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 12px", marginTop: 6, fontSize: 13 }}
                          />
                        </label>
                      )}

                      <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", gridColumn: "1 / -1" }}>
                        Transaction / Reference Number <span style={{ color: "#dc2626" }}>*</span>
                        <input
                          type="text"
                          required
                          placeholder="e.g. TRX-99881122 or EasyPaisa TID"
                          value={refundReference}
                          onChange={(e) => setRefundReference(e.target.value)}
                          style={{ width: "100%", height: 40, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 12px", marginTop: 6, fontSize: 13, fontFamily: "monospace" }}
                        />
                      </label>

                      <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", gridColumn: "1 / -1" }}>
                        Refund Notes
                        <textarea
                          rows={2}
                          placeholder="Optional internal note regarding the refund payout..."
                          value={refundNotes}
                          onChange={(e) => setRefundNotes(e.target.value)}
                          style={{ width: "100%", borderRadius: 8, border: "1px solid #cbd5e1", padding: "8px 12px", marginTop: 6, fontSize: 12.5, fontFamily: "inherit" }}
                        />
                      </label>
                    </div>

                    <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        disabled={busy || !refundReference.trim() || Number(refundAmount) <= 0}
                        onClick={() => setRefundConfirmOpen(true)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "9px 24px",
                          borderRadius: 8,
                          background: "#16a34a",
                          color: "#ffffff",
                          fontSize: 13.5,
                          fontWeight: 700,
                          border: 0,
                          cursor: refundReference.trim() && Number(refundAmount) > 0 ? "pointer" : "not-allowed",
                        }}
                      >
                        <CheckCircle2 size={16} /> Mark Refund as Completed ({money(Number(refundAmount || 0))})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: TIMELINE */}
            {activeTab === "timeline" && (
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={16} style={{ color: "#2563eb" }} /> Complete Audit &amp; Event Timeline
                </div>

                <div style={{ position: "relative", paddingLeft: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ position: "absolute", left: 8, top: 4, bottom: 4, width: 2, background: "#e2e8f0" }} />
                  {returnRequest.timeline.map((item, idx) => (
                    <div key={item.id || idx} style={{ position: "relative" }}>
                      <div
                        style={{
                          position: "absolute",
                          left: -20,
                          top: 2,
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: item.step === "Refunded" || item.step === "Restocked" ? "#16a34a" : item.step === "Rejected" ? "#dc2626" : "#2563eb",
                          border: "2px solid #ffffff",
                          boxShadow: "0 0 0 2px #e2e8f0",
                        }}
                      />
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <strong style={{ fontSize: 13, color: "#0f172a" }}>{item.title}</strong>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>
                          {new Date(item.timestamp).toLocaleString("en-PK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {item.description && (
                        <p style={{ fontSize: 12, color: "#475569", margin: "3px 0 0" }}>{item.description}</p>
                      )}
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                        By: <span style={{ fontWeight: 600, color: "#334155" }}>{item.actor}</span> {item.actorRole ? `(${item.actorRole})` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: INTERNAL STAFF NOTES */}
            {activeTab === "notes" && (
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={16} style={{ color: "#2563eb" }} /> Internal Staff Notes (Confidential)
                </div>

                {returnRequest.internalNotes ? (
                  <div style={{ whiteSpace: "pre-wrap", background: "#f8fafc", padding: "14px 16px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12.5, color: "#334155", marginBottom: 16 }}>
                    {returnRequest.internalNotes}
                  </div>
                ) : (
                  <div style={{ color: "#94a3b8", fontSize: 12, padding: "12px 0" }}>No internal notes added yet.</div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Add an internal staff note or call record…"
                    value={newInternalNote}
                    onChange={(e) => setNewInternalNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newInternalNote.trim()) {
                        onAddNote(returnRequest.id, newInternalNote.trim());
                        setNewInternalNote("");
                      }
                    }}
                    style={{ flex: 1, height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 12px", fontSize: 12.5 }}
                  />
                  <button
                    type="button"
                    disabled={busy || !newInternalNote.trim()}
                    onClick={() => {
                      if (newInternalNote.trim()) {
                        onAddNote(returnRequest.id, newInternalNote.trim());
                        setNewInternalNote("");
                      }
                    }}
                    style={{ padding: "0 16px", borderRadius: 8, background: "#2563eb", color: "#ffffff", fontSize: 12.5, fontWeight: 600, border: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
                  >
                    <Send size={13} /> Add Note
                  </button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* CONFIRMATION MODAL: Restock Return Items */}
      <Dialog open={restockModalOpen} onOpenChange={setRestockModalOpen}>
        <DialogContent className="admin-dialog" style={{ maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8, color: "#0f766e" }}>
              <Package size={20} /> Confirm Exact Variant Restocking
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to add the returned quantity back into inventory?
            </DialogDescription>
          </DialogHeader>

          <div style={{ padding: "12px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: 12.5 }}>
            <strong style={{ color: "#166534", display: "block", marginBottom: 6 }}>Items to be restocked:</strong>
            <ul style={{ margin: 0, paddingLeft: 18, color: "#15803d", display: "flex", flexDirection: "column", gap: 4 }}>
              {returnRequest.items.map((it, idx) => (
                <li key={idx}>
                  <b>{it.name}</b> · {it.color || "Standard"} / {it.size || "Standard"} &rarr; <b style={{ color: "#166534" }}>+{it.returnQty} units</b>
                </li>
              ))}
            </ul>
          </div>

          <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginTop: 10 }}>
            Restock Audit Note (Optional):
            <input
              type="text"
              placeholder="e.g. Verified by Quality Team, restocked to shelf A4"
              value={restockNote}
              onChange={(e) => setRestockNote(e.target.value)}
              style={{ width: "100%", height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 10px", marginTop: 4, fontSize: 12.5 }}
            />
          </label>

          <DialogFooter style={{ marginTop: 14 }}>
            <button
              type="button"
              className="admin-secondary"
              onClick={() => setRestockModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="admin-primary"
              disabled={busy}
              onClick={async () => {
                await onRestock(returnRequest.id, undefined, restockNote, "restock");
                setRestockModalOpen(false);
                toast.success("Returned items restocked into variant inventory!");
              }}
              style={{ background: "#059669", borderColor: "#059669" }}
            >
              {busy ? "Restocking…" : "Confirm Restock"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION MODAL: Process Refund */}
      <Dialog open={refundConfirmOpen} onOpenChange={setRefundConfirmOpen}>
        <DialogContent className="admin-dialog" style={{ maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8, color: "#15803d" }}>
              <CheckCircle2 size={20} /> Confirm Refund Payout
            </DialogTitle>
            <DialogDescription>
              Please verify the refund payout details before marking as completed.
            </DialogDescription>
          </DialogHeader>

          <div style={{ padding: "14px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12.5, display: "flex", flexDirection: "column", gap: 6 }}>
            <div>Amount: <strong style={{ fontSize: 15, color: "#16a34a" }}>{money(Number(refundAmount))}</strong></div>
            <div>Method: <strong>{refundMethod}</strong></div>
            <div>Reference / TID: <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{refundReference}</span></div>
            {refundAccountTitle && <div>Account Title: <strong>{refundAccountTitle}</strong></div>}
            {refundAccountNumber && <div>Account / Phone: <strong>{refundAccountNumber}</strong></div>}
          </div>

          <DialogFooter style={{ marginTop: 14 }}>
            <button
              type="button"
              className="admin-secondary"
              onClick={() => setRefundConfirmOpen(false)}
            >
              Back
            </button>
            <button
              type="button"
              className="admin-primary"
              disabled={busy}
              onClick={async () => {
                await onProcessRefund(returnRequest.id, {
                  refundAmount: Number(refundAmount),
                  refundMethod,
                  refundReference,
                  refundAccountTitle,
                  refundAccountNumber,
                  refundBankName,
                  refundNotes,
                });
                setRefundConfirmOpen(false);
                toast.success(`Refund of ${money(Number(refundAmount))} marked as completed!`);
              }}
              style={{ background: "#16a34a", borderColor: "#16a34a" }}
            >
              {busy ? "Processing…" : "Confirm & Mark Refunded"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REJECT RETURN MODAL */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="admin-dialog" style={{ maxWidth: 460 }}>
          <DialogHeader>
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8, color: "#dc2626" }}>
              <XCircle size={20} /> Reject Return Request
            </DialogTitle>
            <DialogDescription>
              Rejecting this return request requires a mandatory reason explaining why the return is declined.
            </DialogDescription>
          </DialogHeader>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
              Rejection Reason <span style={{ color: "#dc2626" }}>*</span>
              <select
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                style={{ width: "100%", height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 10px", marginTop: 4, fontSize: 12.5, background: "#ffffff" }}
              >
                <option value="">-- Select Rejection Reason --</option>
                <option value="Return policy window expired (>7 days)">Return policy window expired (&gt;7 days)</option>
                <option value="Item was heavily used / tags missing">Item was heavily used / tags missing</option>
                <option value="Physical damage caused by customer">Physical damage caused by customer</option>
                <option value="Non-returnable item category (Hygiene/Beauty)">Non-returnable item category (Hygiene/Beauty)</option>
                <option value="Customer provided false evidence">Customer provided false evidence</option>
                <option value="Other">Other reason</option>
              </select>
            </label>

            <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
              Detailed Explanation for Customer:
              <textarea
                rows={3}
                placeholder="Explain the reason for rejecting this return..."
                value={rejectionNoteInput}
                onChange={(e) => setRejectionNoteInput(e.target.value)}
                style={{ width: "100%", borderRadius: 8, border: "1px solid #cbd5e1", padding: "8px 10px", marginTop: 4, fontSize: 12, fontFamily: "inherit" }}
              />
            </label>
          </div>

          <DialogFooter style={{ marginTop: 14 }}>
            <button
              type="button"
              className="admin-secondary"
              onClick={() => setRejectModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="admin-primary"
              disabled={busy || !rejectionReasonInput.trim()}
              onClick={async () => {
                await onUpdateStatus(returnRequest.id, "Rejected", {
                  rejectionReason: rejectionReasonInput,
                  note: rejectionNoteInput,
                });
                setRejectModalOpen(false);
                toast.success("Return request rejected.");
              }}
              style={{ background: "#dc2626", borderColor: "#dc2626" }}
            >
              {busy ? "Rejecting…" : "Confirm Rejection"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ZOOM IMAGE MODAL */}
      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent style={{ maxWidth: 650, padding: 12, background: "#000000" }}>
          {zoomedImage && (
            <img
              src={zoomedImage}
              alt="Zoomed evidence"
              style={{ width: "100%", height: "auto", maxHeight: "80vh", objectFit: "contain", borderRadius: 6 }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
