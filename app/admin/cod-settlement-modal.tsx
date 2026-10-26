"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Banknote,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Truck,
  DollarSign,
  Search,
  Check,
  RotateCcw,
  Plus,
  Filter,
  X,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import { money } from "@/app/catalog";
import {
  LifecycleOrder,
  CodSettlementTransaction,
  CodSettlementStatus,
  CodPaymentMethod,
  calculateCodBreakdown,
  getCodStatusBadge,
  exportCodSettlementsToCSV,
} from "@/lib/order-lifecycle";
import { toast } from "sonner";

interface CodSettlementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: LifecycleOrder[];
  currentUser?: { role?: string; name?: string; permissions?: string[] };
  onRecordSettlement: (
    orderId: string,
    transaction: {
      amount: number;
      settlementDate: string;
      courier: string;
      reference?: string;
      paymentMethod: string;
      note?: string;
      remittanceId?: string;
    }
  ) => Promise<boolean>;
  onBulkRemittance: (batch: {
    remittanceId: string;
    courier: string;
    settlementDate: string;
    referenceId: string;
    paymentMethod: string;
    receivedAmount: number;
    courierCharges?: number;
    adjustments?: number;
    notes?: string;
    orderSettlements: { orderId: string; amount: number }[];
  }) => Promise<boolean>;
  onReverseSettlement: (
    orderId: string,
    transactionId: string,
    reason: string,
    note?: string
  ) => Promise<boolean>;
  onDisputeOrder: (
    orderId: string,
    reason: string,
    notes: string,
    resolve?: boolean
  ) => Promise<boolean>;
  onSelectOrderForDetails?: (order: LifecycleOrder) => void;
}

const PAYMENT_METHODS: CodPaymentMethod[] = [
  "Bank Transfer",
  "Cash",
  "Cheque",
  "Wallet",
  "Other",
];

const DISPUTE_REASONS = [
  "Amount Mismatch",
  "Missing Remittance",
  "Wrong Order",
  "Courier Deduction Issue",
  "Duplicate Settlement",
  "Incorrect COD",
  "Other",
];

const COURIER_OPTIONS = [
  "Trax Logistics",
  "TCS Express",
  "Leopards",
  "PostEx",
  "M&P",
  "Call Courier",
  "Other",
];

const PAGE_SIZE = 20;

export default function CodSettlementModal({
  open,
  onOpenChange,
  orders,
  currentUser,
  onRecordSettlement,
  onBulkRemittance,
  onReverseSettlement,
  onDisputeOrder,
  onSelectOrderForDetails,
}: CodSettlementModalProps) {
  // Filters & State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [courierFilter, setCourierFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Sub-modal states
  const [settleOrderTarget, setSettleOrderTarget] = useState<LifecycleOrder | null>(null);
  const [bulkRemittanceOpen, setBulkRemittanceOpen] = useState(false);
  const [historyOrderTarget, setHistoryOrderTarget] = useState<LifecycleOrder | null>(null);
  const [disputeOrderTarget, setDisputeOrderTarget] = useState<LifecycleOrder | null>(null);
  const [reverseOrderTarget, setReverseOrderTarget] = useState<LifecycleOrder | null>(null);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, courierFilter]);

  // Delivered COD Orders (eligible for settlement)
  const deliveredCodOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        (o.status === "Delivered" ||
          o.status === "COD Settled" ||
          o.details?.codSettled ||
          o.details?.codCollected ||
          (o.details?.codSettlementHistory && o.details.codSettlementHistory.length > 0)) &&
        o.status !== "Cancelled"
    );
  }, [orders]);

  // Financial Aggregations
  const {
    totalPendingAmount,
    pendingCount,
    totalSettledAmount,
    settledCount,
    disputedCount,
    disputedAmount,
    totalExpectedCod,
  } = useMemo(() => {
    let pendingSum = 0;
    let pendingNum = 0;
    let settledSum = 0;
    let settledNum = 0;
    let disputedNum = 0;
    let disputedSum = 0;
    let totalExpected = 0;

    for (const o of deliveredCodOrders) {
      const breakdown = calculateCodBreakdown(o);
      totalExpected += breakdown.expectedAmount;

      if (breakdown.isDisputed) {
        disputedNum++;
        disputedSum += breakdown.expectedAmount;
      } else if (breakdown.isSettled) {
        settledNum++;
        settledSum += breakdown.receivedAmount;
      } else {
        pendingNum++;
        pendingSum += breakdown.remainingAmount;
        if (breakdown.receivedAmount > 0) {
          settledSum += breakdown.receivedAmount;
        }
      }
    }

    return {
      totalPendingAmount: pendingSum,
      pendingCount: pendingNum,
      totalSettledAmount: settledSum,
      settledCount: settledNum,
      disputedCount: disputedNum,
      disputedAmount: disputedSum,
      totalExpectedCod: totalExpected,
    };
  }, [deliveredCodOrders]);

  // Filtered Orders
  const filtered = useMemo(() => {
    return deliveredCodOrders.filter((o) => {
      const breakdown = calculateCodBreakdown(o);

      // Search Query
      const q = search.trim().toLowerCase();
      if (q) {
        const matchId = o.id.toLowerCase().includes(q);
        const matchName = (o.details?.name || "").toLowerCase().includes(q);
        const matchPhone = (o.details?.phone || "").includes(q);
        const matchCourier = (o.details?.courier || "").toLowerCase().includes(q);
        const matchTracking = (o.details?.trackingNumber || "").toLowerCase().includes(q);
        const matchRef = breakdown.transactions.some(
          (tx) =>
            (tx.reference || "").toLowerCase().includes(q) ||
            (tx.remittanceId || "").toLowerCase().includes(q)
        );
        if (!matchId && !matchName && !matchPhone && !matchCourier && !matchTracking && !matchRef) {
          return false;
        }
      }

      // Status Filter
      if (statusFilter !== "all") {
        if (statusFilter === "pending" && !breakdown.isPending && !breakdown.isPartiallySettled)
          return false;
        if (statusFilter === "partially_settled" && !breakdown.isPartiallySettled) return false;
        if (statusFilter === "settled" && !breakdown.isSettled) return false;
        if (statusFilter === "disputed" && !breakdown.isDisputed) return false;
      }

      // Courier Filter
      if (courierFilter !== "all") {
        const c = (o.details?.courier || "Trax").toLowerCase();
        if (!c.includes(courierFilter.toLowerCase())) return false;
      }

      return true;
    });
  }, [deliveredCodOrders, search, statusFilter, courierFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const startIndex = filtered.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const endIndex = Math.min(currentPage * PAGE_SIZE, filtered.length);

  const hasActiveFilters = statusFilter !== "all" || courierFilter !== "all" || !!search;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="admin-dialog-cod-modal" style={{ overflowX: "hidden" }}>
          {/* Header */}
          <DialogHeader style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 14, flexShrink: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                paddingRight: 32,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: "#ecfdf5",
                    color: "#059669",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Banknote size={22} />
                </span>
                <div>
                  <DialogTitle
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#0f172a",
                      letterSpacing: "-0.3px",
                      margin: 0,
                    }}
                  >
                    Cash on Delivery (COD) Settlement &amp; Reconciliation
                  </DialogTitle>
                  <DialogDescription style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
                    Reconcile courier cash collections, record remittances, track partial payments, and manage COD disputes.
                  </DialogDescription>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => exportCodSettlementsToCSV(filtered)}
                  style={{
                    padding: "7px 14px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    background: "#ffffff",
                    color: "#334155",
                    border: "1px solid #cbd5e1",
                    borderRadius: 7,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                  title="Export filtered records to CSV"
                >
                  <FileText size={15} /> Export CSV
                </button>

                <button
                  type="button"
                  onClick={() => setBulkRemittanceOpen(true)}
                  style={{
                    padding: "7px 16px",
                    fontSize: 12.5,
                    fontWeight: 700,
                    background: "#059669",
                    color: "#ffffff",
                    border: "1px solid #047857",
                    borderRadius: 7,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    transition: "all 0.15s ease",
                  }}
                  title="Record bulk remittance payout received from courier partner"
                >
                  <Plus size={16} /> Record Courier Remittance
                </button>
              </div>
            </div>
          </DialogHeader>

          {/* 4 Clickable Summary Cards (1 Row) */}
          <div className="admin-cod-card-grid" style={{ marginTop: 14, flexShrink: 0 }}>
            {/* 1. All Delivered Orders */}
            <div
              onClick={() => setStatusFilter("all")}
              style={{
                background: statusFilter === "all" ? "#f8fafc" : "#ffffff",
                border: `2px solid ${statusFilter === "all" ? "#0f172a" : "#e2e8f0"}`,
                boxShadow: statusFilter === "all" ? "0 2px 8px rgba(15, 23, 42, 0.08)" : "none",
                borderRadius: 10,
                padding: "12px 16px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: "0.5px" }}>
                  DELIVERED ORDERS
                </span>
                <Truck size={15} style={{ color: "#94a3b8" }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginTop: 3, lineHeight: 1.2 }}>
                {deliveredCodOrders.length}
              </div>
              <span style={{ fontSize: 11.5, color: "#64748b", display: "block", marginTop: 2 }}>
                Total: {money(totalExpectedCod)}
              </span>
            </div>

            {/* 2. Pending Settlement */}
            <div
              onClick={() => setStatusFilter("pending")}
              style={{
                background: statusFilter === "pending" ? "#fefce8" : "#ffffff",
                border: `2px solid ${statusFilter === "pending" ? "#d97706" : "#e2e8f0"}`,
                boxShadow: statusFilter === "pending" ? "0 2px 8px rgba(217, 119, 6, 0.1)" : "none",
                borderRadius: 10,
                padding: "12px 16px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#854d0e", fontWeight: 700, letterSpacing: "0.5px" }}>
                  PENDING SETTLEMENT
                </span>
                <Clock size={15} style={{ color: "#d97706" }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#d97706", marginTop: 3, lineHeight: 1.2 }}>
                {money(totalPendingAmount)}
              </div>
              <span style={{ fontSize: 11.5, color: "#b45309", fontWeight: 600, display: "block", marginTop: 2 }}>
                {pendingCount} {pendingCount === 1 ? "order" : "orders"} awaiting remittance
              </span>
            </div>

            {/* 3. Total Settled */}
            <div
              onClick={() => setStatusFilter("settled")}
              style={{
                background: statusFilter === "settled" ? "#f0fdf4" : "#ffffff",
                border: `2px solid ${statusFilter === "settled" ? "#16a34a" : "#e2e8f0"}`,
                boxShadow: statusFilter === "settled" ? "0 2px 8px rgba(22, 163, 74, 0.1)" : "none",
                borderRadius: 10,
                padding: "12px 16px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#166534", fontWeight: 700, letterSpacing: "0.5px" }}>
                  TOTAL SETTLED
                </span>
                <CheckCircle2 size={15} style={{ color: "#16a34a" }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#16a34a", marginTop: 3, lineHeight: 1.2 }}>
                {money(totalSettledAmount)}
              </div>
              <span style={{ fontSize: 11.5, color: "#15803d", fontWeight: 600, display: "block", marginTop: 2 }}>
                {settledCount} {settledCount === 1 ? "order" : "orders"} reconciled in bank
              </span>
            </div>

            {/* 4. Disputed Issues */}
            <div
              onClick={() => setStatusFilter("disputed")}
              style={{
                background: statusFilter === "disputed" ? "#fef2f2" : "#ffffff",
                border: `2px solid ${statusFilter === "disputed" ? "#dc2626" : "#e2e8f0"}`,
                boxShadow: statusFilter === "disputed" ? "0 2px 8px rgba(220, 38, 38, 0.1)" : "none",
                borderRadius: 10,
                padding: "12px 16px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#991b1b", fontWeight: 700, letterSpacing: "0.5px" }}>
                  DISPUTED ISSUES
                </span>
                <AlertTriangle size={15} style={{ color: "#dc2626" }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#dc2626", marginTop: 3, lineHeight: 1.2 }}>
                {disputedCount}
              </div>
              <span style={{ fontSize: 11.5, color: "#b91c1c", fontWeight: 600, display: "block", marginTop: 2 }}>
                {disputedAmount > 0 ? money(disputedAmount) + " under review" : "No active disputes"}
              </span>
            </div>
          </div>

          {/* Search & Filter Row */}
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flex: "1 1 280px",
                  minWidth: "220px",
                  height: 38,
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "0 12px",
                  background: "#ffffff",
                  boxSizing: "border-box",
                }}
              >
                <Search size={16} style={{ color: "#94a3b8", flexShrink: 0 }} />
                <input
                  style={{
                    fontSize: 13,
                    border: "none",
                    outline: "none",
                    width: "100%",
                    background: "transparent",
                    color: "#1e293b",
                  }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Order #, customer name, phone, courier, tracking AWB, or ref ID…"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      padding: 2,
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Status Select */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  height: 38,
                  padding: "0 12px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#334155",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Remittance</option>
                <option value="partially_settled">Partially Settled</option>
                <option value="settled">Fully Settled</option>
                <option value="disputed">Disputed Issues</option>
              </select>

              {/* Courier Select */}
              <select
                value={courierFilter}
                onChange={(e) => setCourierFilter(e.target.value)}
                style={{
                  height: 38,
                  padding: "0 12px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#334155",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                <option value="all">All Couriers</option>
                <option value="Trax">Trax Logistics</option>
                <option value="TCS">TCS Express</option>
                <option value="Leopards">Leopards Courier</option>
                <option value="PostEx">PostEx</option>
                <option value="M&P">M&amp;P Courier</option>
                <option value="Call Courier">Call Courier</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("all");
                    setCourierFilter("all");
                    setSearch("");
                  }}
                  style={{
                    height: 38,
                    padding: "0 12px",
                    fontSize: 12.5,
                    color: "#dc2626",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    boxSizing: "border-box",
                  }}
                >
                  <RotateCcw size={13} /> Reset Filters
                </button>
              )}
            </div>

            {/* Active Filter Chips */}
            {hasActiveFilters && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  flexWrap: "wrap",
                  fontSize: 12,
                  padding: "2px 0",
                }}
              >
                <span style={{ color: "#64748b", fontWeight: 600 }}>Active Filters:</span>
                {statusFilter !== "all" && (
                  <span
                    style={{
                      background: "#f1f5f9",
                      color: "#1e293b",
                      padding: "3px 9px",
                      borderRadius: 14,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontWeight: 500,
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    Status: {statusFilter.replace("_", " ")}
                    <X size={12} style={{ cursor: "pointer" }} onClick={() => setStatusFilter("all")} />
                  </span>
                )}
                {courierFilter !== "all" && (
                  <span
                    style={{
                      background: "#f1f5f9",
                      color: "#1e293b",
                      padding: "3px 9px",
                      borderRadius: 14,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontWeight: 500,
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    Courier: {courierFilter}
                    <X size={12} style={{ cursor: "pointer" }} onClick={() => setCourierFilter("all")} />
                  </span>
                )}
                {search && (
                  <span
                    style={{
                      background: "#f1f5f9",
                      color: "#1e293b",
                      padding: "3px 9px",
                      borderRadius: 14,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontWeight: 500,
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    Search: "{search}"
                    <X size={12} style={{ cursor: "pointer" }} onClick={() => setSearch("")} />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("all");
                    setCourierFilter("all");
                    setSearch("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#dc2626",
                    fontSize: 12,
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontWeight: 600,
                    padding: 0,
                    marginLeft: 4,
                  }}
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Desktop/Tablet Table & Mobile Card View Container */}
          <div className="admin-cod-table-container" style={{ marginTop: 10, flex: 1, overflowX: "hidden" }}>
            {/* 1. DESKTOP/TABLET TABLE VIEW (>= 768px) */}
            <div className="hidden md:block" style={{ width: "100%", overflowX: "hidden" }}>
              <table className="admin-cod-table">
                <colgroup>
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "19%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "20%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer Details</th>
                    <th>Courier &amp; Tracking</th>
                    <th>COD Financials</th>
                    <th>Settlement Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.length > 0 ? (
                    paginatedOrders.map((o) => {
                      const breakdown = calculateCodBreakdown(o);
                      const badge = getCodStatusBadge(breakdown.status);

                      return (
                        <tr
                          key={o.id}
                          style={{
                            background: breakdown.isDisputed ? "#fff7f7" : undefined,
                          }}
                        >
                          {/* 1. Order ID (Clickable) */}
                          <td>
                            <button
                              type="button"
                              onClick={() => onSelectOrderForDetails?.(o)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#4338ca",
                                fontWeight: 800,
                                fontSize: 13.5,
                                cursor: "pointer",
                                padding: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                textAlign: "left",
                              }}
                              title="Click to view full order details"
                            >
                              #{o.id}
                              <ExternalLink size={12} style={{ opacity: 0.7, flexShrink: 0 }} />
                            </button>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                              {new Date(o.created_at || Date.now()).toLocaleDateString("en-PK", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                          </td>

                          {/* 2. Customer Details */}
                          <td>
                            <div
                              style={{
                                fontWeight: 700,
                                color: "#1e293b",
                                fontSize: 13,
                              }}
                            >
                              {o.details?.name || "Customer"}
                            </div>
                            <div
                              style={{
                                fontSize: 11.5,
                                color: "#64748b",
                                marginTop: 2,
                              }}
                            >
                              {o.details?.phone ? `${o.details.phone} · ` : ""}
                              {o.details?.city || "Pakistan"}
                            </div>
                            {o.details?.address && (
                              <div
                                style={{
                                  fontSize: 10.5,
                                  color: "#94a3b8",
                                  marginTop: 1,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: "220px",
                                }}
                                title={o.details.address}
                              >
                                {o.details.address}
                              </div>
                            )}
                          </td>

                          {/* 3. Courier & Tracking */}
                          <td>
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                color: "#334155",
                                fontWeight: 700,
                                fontSize: 12,
                                background: "#f1f5f9",
                                padding: "2px 8px",
                                borderRadius: 5,
                              }}
                            >
                              <Truck size={13} style={{ color: "#64748b", flexShrink: 0 }} />{" "}
                              <span>{o.details?.courier || "Trax Logistics"}</span>
                            </div>
                            {o.details?.trackingNumber ? (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#334155",
                                  fontFamily: "monospace",
                                  marginTop: 3,
                                  fontWeight: 600,
                                }}
                                title={o.details.trackingNumber}
                              >
                                {o.details.trackingNumber}
                              </div>
                            ) : (
                              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                                No tracking #
                              </div>
                            )}
                          </td>

                          {/* 4. Financial Breakdown */}
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                                <span style={{ fontWeight: 800, color: "#0f172a", fontSize: 13.5 }}>
                                  {money(breakdown.expectedAmount)}
                                </span>
                                {breakdown.receivedAmount > 0 &&
                                  breakdown.receivedAmount < breakdown.expectedAmount && (
                                    <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700 }}>
                                      ({money(breakdown.receivedAmount)} rec'd)
                                    </span>
                                  )}
                              </div>
                              {breakdown.remainingAmount > 0 ? (
                                <div style={{ fontSize: 11.5, color: "#d97706", fontWeight: 700 }}>
                                  Due: {money(breakdown.remainingAmount)}
                                </div>
                              ) : (
                                <div style={{ fontSize: 11.5, color: "#16a34a", fontWeight: 600 }}>
                                  Reconciled in bank
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 5. Settlement Status */}
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
                              <span
                                style={{
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  padding: "3px 9px",
                                  borderRadius: 5,
                                  background: badge.bg,
                                  color: badge.color,
                                  border: `1px solid ${badge.border}`,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  lineHeight: 1.2,
                                }}
                              >
                                {breakdown.isSettled ? (
                                  <CheckCircle2 size={13} style={{ flexShrink: 0 }} />
                                ) : breakdown.isDisputed ? (
                                  <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                                ) : (
                                  <Clock size={13} style={{ flexShrink: 0 }} />
                                )}
                                <span>
                                  {breakdown.isPartiallySettled
                                    ? `Partially Settled (${money(breakdown.receivedAmount)})`
                                    : badge.label}
                                </span>
                              </span>

                              {breakdown.isDisputed && breakdown.disputeReason && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "#dc2626",
                                    fontWeight: 600,
                                  }}
                                  title={`Dispute Reason: ${breakdown.disputeReason}`}
                                >
                                  Reason: {breakdown.disputeReason}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 6. Actions (All Buttons Clearly Shown) */}
                          <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                justifyContent: "flex-end",
                                flexWrap: "wrap",
                              }}
                            >
                              {!breakdown.isSettled ? (
                                <button
                                  type="button"
                                  onClick={() => setSettleOrderTarget(o)}
                                  style={{
                                    padding: "5px 11px",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    background: "#059669",
                                    color: "#ffffff",
                                    border: "1px solid #047857",
                                    borderRadius: 6,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    cursor: "pointer",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                    whiteSpace: "nowrap",
                                  }}
                                  title="Record single settlement payment"
                                >
                                  <Check size={13} /> Settle
                                </button>
                              ) : (
                                <span
                                  style={{
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    color: "#166534",
                                    background: "#dcfce7",
                                    border: "1px solid #bbf7d0",
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  <CheckCircle2 size={12} /> Settled
                                </span>
                              )}

                              {/* History Button */}
                              <button
                                type="button"
                                onClick={() => setHistoryOrderTarget(o)}
                                style={{
                                  padding: "5px 9px",
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  background: "#ffffff",
                                  border: "1px solid #cbd5e1",
                                  color: "#334155",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  whiteSpace: "nowrap",
                                }}
                                title="View settlement history and timeline"
                              >
                                <Clock size={13} /> History
                              </button>

                              {/* Dispute Button */}
                              <button
                                type="button"
                                onClick={() => setDisputeOrderTarget(o)}
                                style={{
                                  padding: "5px 9px",
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  background: breakdown.isDisputed ? "#fee2e2" : "#ffffff",
                                  border: `1px solid ${breakdown.isDisputed ? "#fca5a5" : "#cbd5e1"}`,
                                  color: breakdown.isDisputed ? "#dc2626" : "#64748b",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  whiteSpace: "nowrap",
                                }}
                                title={
                                  breakdown.isDisputed
                                    ? "Review or resolve dispute"
                                    : "Flag settlement dispute"
                                }
                              >
                                <AlertTriangle size={13} /> Dispute
                              </button>

                              {/* Reversal Button */}
                              {(breakdown.receivedAmount > 0 || breakdown.transactions.length > 0) && (
                                <button
                                  type="button"
                                  onClick={() => setReverseOrderTarget(o)}
                                  style={{
                                    padding: "5px 8px",
                                    fontSize: 11.5,
                                    fontWeight: 600,
                                    background: "#ffffff",
                                    border: "1px solid #cbd5e1",
                                    color: "#64748b",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                    whiteSpace: "nowrap",
                                  }}
                                  title="Reverse or adjust previous settlement entry"
                                >
                                  <RotateCcw size={13} /> Reverse
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "44px 20px", color: "#94a3b8" }}>
                        <Banknote size={36} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
                        <div style={{ fontWeight: 700, color: "#475569", fontSize: 14.5 }}>
                          No COD records match the selected filters
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                          Try clearing active filters or searching a different term.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 2. MOBILE RESPONSIVE CARD VIEW (< 768px) */}
            <div className="block md:hidden" style={{ padding: "10px", overflowX: "hidden" }}>
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map((o) => {
                  const breakdown = calculateCodBreakdown(o);
                  const badge = getCodStatusBadge(breakdown.status);

                  return (
                    <div
                      key={o.id}
                      style={{
                        background: breakdown.isDisputed ? "#fff7f7" : "#ffffff",
                        border: `1px solid ${breakdown.isDisputed ? "#fca5a5" : "#e2e8f0"}`,
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 10,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        boxSizing: "border-box",
                      }}
                    >
                      {/* Top Header: Order ID & Status */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => onSelectOrderForDetails?.(o)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#4338ca",
                            fontWeight: 800,
                            fontSize: 14,
                            cursor: "pointer",
                            padding: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          #{o.id}
                          <ExternalLink size={12} style={{ opacity: 0.7 }} />
                        </button>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 5,
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {breakdown.isSettled ? (
                            <CheckCircle2 size={12} />
                          ) : breakdown.isDisputed ? (
                            <AlertTriangle size={12} />
                          ) : (
                            <Clock size={12} />
                          )}
                          {badge.label}
                        </span>
                      </div>

                      {/* Customer & Courier */}
                      <div style={{ marginTop: 8, fontSize: 12, color: "#334155" }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{o.details?.name || "Customer"}</div>
                        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                          {o.details?.phone ? `${o.details.phone} · ` : ""}
                          {o.details?.city || "Pakistan"}
                        </div>
                        <div
                          style={{
                            marginTop: 5,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 11.5,
                            color: "#475569",
                          }}
                        >
                          <Truck size={13} style={{ color: "#64748b" }} />
                          <span style={{ fontWeight: 600 }}>{o.details?.courier || "Trax"}</span>
                          {o.details?.trackingNumber && (
                            <span style={{ fontFamily: "monospace", color: "#64748b" }}>
                              ({o.details.trackingNumber})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Financial Strip */}
                      <div
                        style={{
                          marginTop: 8,
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: 7,
                          padding: "6px 10px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: 12,
                        }}
                      >
                        <div>
                          <span style={{ color: "#64748b" }}>Expected:</span>{" "}
                          <strong style={{ color: "#0f172a" }}>{money(breakdown.expectedAmount)}</strong>
                        </div>
                        {breakdown.remainingAmount > 0 ? (
                          <div>
                            <span style={{ color: "#64748b" }}>Due:</span>{" "}
                            <strong style={{ color: "#d97706" }}>{money(breakdown.remainingAmount)}</strong>
                          </div>
                        ) : (
                          <div style={{ color: "#16a34a", fontWeight: 700 }}>Fully Reconciled</div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          gap: 6,
                          justifyContent: "flex-end",
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        {!breakdown.isSettled && (
                          <button
                            type="button"
                            onClick={() => setSettleOrderTarget(o)}
                            style={{
                              padding: "4px 10px",
                              fontSize: 11.5,
                              fontWeight: 700,
                              background: "#059669",
                              color: "#ffffff",
                              border: "1px solid #047857",
                              borderRadius: 6,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <Check size={12} /> Settle
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setHistoryOrderTarget(o)}
                          style={{
                            padding: "4px 9px",
                            fontSize: 11.5,
                            fontWeight: 600,
                            background: "#f8fafc",
                            border: "1px solid #cbd5e1",
                            color: "#334155",
                            borderRadius: 6,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <Clock size={12} /> History
                        </button>
                        <button
                          type="button"
                          onClick={() => setDisputeOrderTarget(o)}
                          style={{
                            padding: "4px 9px",
                            fontSize: 11.5,
                            fontWeight: 600,
                            background: breakdown.isDisputed ? "#fee2e2" : "#f8fafc",
                            border: `1px solid ${breakdown.isDisputed ? "#fca5a5" : "#cbd5e1"}`,
                            color: breakdown.isDisputed ? "#dc2626" : "#64748b",
                            borderRadius: 6,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <AlertTriangle size={12} /> Dispute
                        </button>
                        {(breakdown.receivedAmount > 0 || breakdown.transactions.length > 0) && (
                          <button
                            type="button"
                            onClick={() => setReverseOrderTarget(o)}
                            style={{
                              padding: "4px 9px",
                              fontSize: 11.5,
                              fontWeight: 600,
                              background: "#f8fafc",
                              border: "1px solid #cbd5e1",
                              color: "#64748b",
                              borderRadius: 6,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <RotateCcw size={12} /> Reverse
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: "center", padding: "28px 14px", color: "#94a3b8" }}>
                  <Banknote size={28} style={{ margin: "0 auto 6px", opacity: 0.4 }} />
                  <div style={{ fontWeight: 700, color: "#475569", fontSize: 13.5 }}>
                    No matching COD orders
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pagination Footer */}
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              fontSize: 12,
              color: "#64748b",
              flexShrink: 0,
            }}
          >
            <div>
              Showing <strong>{startIndex}</strong>–<strong>{endIndex}</strong> of{" "}
              <strong>{filtered.length}</strong> orders
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                style={{
                  padding: "4px 9px",
                  fontSize: 11.5,
                  fontWeight: 600,
                  background: currentPage <= 1 ? "#f8fafc" : "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 5,
                  color: currentPage <= 1 ? "#94a3b8" : "#334155",
                  cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <ChevronLeft size={13} /> Prev
              </button>

              <span style={{ fontSize: 11.5, fontWeight: 700, padding: "0 6px", color: "#0f172a" }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                style={{
                  padding: "4px 9px",
                  fontSize: 11.5,
                  fontWeight: 600,
                  background: currentPage >= totalPages ? "#f8fafc" : "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 5,
                  color: currentPage >= totalPages ? "#94a3b8" : "#334155",
                  cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SUB-MODAL 1: Record Single Order Settlement */}
      {settleOrderTarget && (
        <RecordSingleSettlementModal
          order={settleOrderTarget}
          open={!!settleOrderTarget}
          onOpenChange={(open) => {
            if (!open) setSettleOrderTarget(null);
          }}
          onConfirm={async (params) => {
            const ok = await onRecordSettlement(settleOrderTarget.id, params);
            if (ok) setSettleOrderTarget(null);
            return ok;
          }}
        />
      )}

      {/* SUB-MODAL 2: Bulk Courier Remittance Reconciler */}
      {bulkRemittanceOpen && (
        <BulkCourierRemittanceModal
          open={bulkRemittanceOpen}
          onOpenChange={setBulkRemittanceOpen}
          orders={deliveredCodOrders}
          onConfirm={async (batch) => {
            const ok = await onBulkRemittance(batch);
            if (ok) setBulkRemittanceOpen(false);
            return ok;
          }}
        />
      )}

      {/* SUB-MODAL 3: Settlement History Timeline */}
      {historyOrderTarget && (
        <SettlementHistoryModal
          order={historyOrderTarget}
          open={!!historyOrderTarget}
          onOpenChange={(open) => {
            if (!open) setHistoryOrderTarget(null);
          }}
        />
      )}

      {/* SUB-MODAL 4: Dispute Modal */}
      {disputeOrderTarget && (
        <DisputeModal
          order={disputeOrderTarget}
          open={!!disputeOrderTarget}
          onOpenChange={(open) => {
            if (!open) setDisputeOrderTarget(null);
          }}
          onConfirm={async (reason, notes, resolve) => {
            const ok = await onDisputeOrder(disputeOrderTarget.id, reason, notes, resolve);
            if (ok) setDisputeOrderTarget(null);
            return ok;
          }}
        />
      )}

      {/* SUB-MODAL 5: Reversal / Adjustment Modal */}
      {reverseOrderTarget && (
        <ReverseSettlementModal
          order={reverseOrderTarget}
          open={!!reverseOrderTarget}
          onOpenChange={(open) => {
            if (!open) setReverseOrderTarget(null);
          }}
          onConfirm={async (transactionId, reason, note) => {
            const ok = await onReverseSettlement(reverseOrderTarget.id, transactionId, reason, note);
            if (ok) setReverseOrderTarget(null);
            return ok;
          }}
        />
      )}
    </>
  );
}

// -------------------------------------------------------------
// SUB-MODAL 1: Record Single Order Settlement
// -------------------------------------------------------------
function RecordSingleSettlementModal({
  order,
  open,
  onOpenChange,
  onConfirm,
}: {
  order: LifecycleOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (params: {
    amount: number;
    settlementDate: string;
    courier: string;
    reference?: string;
    paymentMethod: string;
    note?: string;
  }) => Promise<boolean>;
}) {
  const breakdown = calculateCodBreakdown(order);
  const [amount, setAmount] = useState<number>(breakdown.remainingAmount);
  const [settlementDate, setSettlementDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [courier, setCourier] = useState<string>(order.details?.courier || "Trax Logistics");
  const [reference, setReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Bank Transfer");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      toast.error("Please enter a valid settlement amount greater than 0");
      return;
    }
    if (!settlementDate) {
      toast.error("Please select a settlement date");
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm({
        amount: Math.round(amount),
        settlementDate,
        courier,
        reference: reference.trim(),
        paymentMethod,
        note: note.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="admin-dialog-cod-submodal sm:max-w-[540px]"
        style={{
          maxWidth: 540,
          background: "#ffffff",
          padding: "22px 26px",
          overflowX: "hidden",
        }}
      >
        <DialogHeader style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
          <DialogTitle
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#0f172a",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Banknote size={19} style={{ color: "#059669" }} />
            Record COD Settlement
          </DialogTitle>
          <DialogDescription style={{ fontSize: 12, color: "#64748b" }}>
            Record cash remittance received from courier partner for order #{order.id}
          </DialogDescription>
        </DialogHeader>

        {/* Order Info Card */}
        <div
          style={{
            marginTop: 12,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "10px 14px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            gap: 8,
            fontSize: 12,
          }}
        >
          <div>
            <span style={{ color: "#64748b" }}>Order ID:</span>{" "}
            <strong style={{ color: "#0f172a" }}>#{order.id}</strong>
          </div>
          <div>
            <span style={{ color: "#64748b" }}>Customer:</span>{" "}
            <strong style={{ color: "#0f172a" }}>{order.details?.name}</strong>
          </div>
          <div>
            <span style={{ color: "#64748b" }}>Courier / AWB:</span>{" "}
            <strong style={{ color: "#0f172a" }}>
              {order.details?.courier || "Trax"}{" "}
              {order.details?.trackingNumber ? `(${order.details.trackingNumber})` : ""}
            </strong>
          </div>
          <div>
            <span style={{ color: "#64748b" }}>Expected COD:</span>{" "}
            <strong style={{ color: "#0f172a" }}>{money(breakdown.expectedAmount)}</strong>
          </div>
          {breakdown.receivedAmount > 0 && (
            <div
              style={{
                gridColumn: "1 / -1",
                color: "#166534",
                background: "#ecfdf5",
                padding: "5px 9px",
                borderRadius: 5,
                fontWeight: 500,
                fontSize: 11.5,
              }}
            >
              Previously Received: <strong>{money(breakdown.receivedAmount)}</strong> · Remaining Due:{" "}
              <strong>{money(breakdown.remainingAmount)}</strong>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>
                Amount Received (PKR) <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="number"
                min={1}
                max={breakdown.remainingAmount * 2}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                style={{
                  width: "100%",
                  marginTop: 3,
                  padding: "6px 10px",
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>
                Settlement Date <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
                required
                style={{
                  width: "100%",
                  marginTop: 3,
                  padding: "6px 10px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>
                Courier <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                required
                style={{
                  width: "100%",
                  marginTop: 3,
                  padding: "6px 10px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  boxSizing: "border-box",
                }}
              >
                {COURIER_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>
                Payment Method <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                required
                style={{
                  width: "100%",
                  marginTop: 3,
                  padding: "6px 10px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  boxSizing: "border-box",
                }}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>
              Reference / Transaction ID
            </label>
            <input
              type="text"
              placeholder="e.g. Bank IBAN transfer ref / Cheque # / Batch ID"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              style={{
                width: "100%",
                marginTop: 3,
                padding: "6px 10px",
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>Internal Notes</label>
            <textarea
              rows={2}
              placeholder="Optional reconciliation notes..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                width: "100%",
                marginTop: 3,
                padding: "6px 10px",
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              style={{
                padding: "6px 16px",
                fontSize: 12,
                fontWeight: 600,
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "6px 18px",
                fontSize: 12.5,
                fontWeight: 700,
                background: "#059669",
                color: "#ffffff",
                border: "1px solid #047857",
                borderRadius: 6,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Check size={14} /> {submitting ? "Saving…" : "Confirm Settlement"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------
// SUB-MODAL 2: Bulk Courier Remittance Reconciler
// -------------------------------------------------------------
function BulkCourierRemittanceModal({
  open,
  onOpenChange,
  orders,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: LifecycleOrder[];
  onConfirm: (batch: {
    remittanceId: string;
    courier: string;
    settlementDate: string;
    referenceId: string;
    paymentMethod: string;
    receivedAmount: number;
    courierCharges?: number;
    adjustments?: number;
    notes?: string;
    orderSettlements: { orderId: string; amount: number }[];
  }) => Promise<boolean>;
}) {
  const [courier, setCourier] = useState("Trax Logistics");
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().slice(0, 10));
  const [remittanceId, setRemittanceId] = useState(`REM-${Date.now().toString().slice(-5)}`);
  const [referenceId, setReferenceId] = useState("");
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [courierCharges, setCourierCharges] = useState<number>(0);
  const [adjustments, setAdjustments] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [notes, setNotes] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Filter pending/partial orders for this courier
  const eligibleOrders = useMemo(() => {
    return orders.filter((o) => {
      const breakdown = calculateCodBreakdown(o);
      if (breakdown.isSettled) return false;
      const c = (o.details?.courier || "Trax").toLowerCase();
      const selectedC = courier.toLowerCase();
      return (
        c.includes(selectedC.split(" ")[0]) ||
        selectedC.includes(c.split(" ")[0])
      );
    });
  }, [orders, courier]);

  // Selected Orders Total
  const selectedMatchedTotal = useMemo(() => {
    return eligibleOrders
      .filter((o) => selectedOrderIds.includes(o.id))
      .reduce((sum, o) => {
        const bd = calculateCodBreakdown(o);
        return sum + bd.remainingAmount;
      }, 0);
  }, [eligibleOrders, selectedOrderIds]);

  const netExpectedRemittance = Math.max(0, selectedMatchedTotal - courierCharges + adjustments);
  const difference = receivedAmount - netExpectedRemittance;
  const isReconciled = selectedOrderIds.length > 0 && Math.abs(difference) === 0;

  const handleToggleOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.length === eligibleOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(eligibleOrders.map((o) => o.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOrderIds.length === 0) {
      toast.error("Please select at least one order to reconcile with this remittance");
      return;
    }
    if (receivedAmount <= 0) {
      toast.error("Please enter the total net remittance amount received");
      return;
    }
    if (!referenceId.trim()) {
      toast.error("Please provide the courier remittance statement / transaction reference");
      return;
    }

    setSubmitting(true);
    try {
      const orderSettlements = eligibleOrders
        .filter((o) => selectedOrderIds.includes(o.id))
        .map((o) => {
          const bd = calculateCodBreakdown(o);
          return {
            orderId: o.id,
            amount: bd.remainingAmount,
          };
        });

      await onConfirm({
        remittanceId: remittanceId.trim(),
        courier,
        settlementDate,
        referenceId: referenceId.trim(),
        paymentMethod,
        receivedAmount,
        courierCharges,
        adjustments,
        notes: notes.trim(),
        orderSettlements,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="admin-dialog-cod-submodal sm:max-w-[820px]"
        style={{
          maxWidth: 820,
          maxHeight: "90vh",
          overflowY: "auto",
          overflowX: "hidden",
          background: "#ffffff",
          padding: "22px 28px",
          boxSizing: "border-box",
        }}
      >
        <DialogHeader style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
          <DialogTitle
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: "#0f172a",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Layers size={19} style={{ color: "#059669" }} />
            Record Courier Remittance Batch
          </DialogTitle>
          <DialogDescription style={{ fontSize: 12, color: "#64748b" }}>
            Match courier lump-sum bank payouts against multiple delivered customer orders.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Top Form Fields */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#334155" }}>
                Courier <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                value={courier}
                onChange={(e) => {
                  setCourier(e.target.value);
                  setSelectedOrderIds([]);
                }}
                required
                style={{
                  width: "100%",
                  marginTop: 3,
                  padding: "6px 8px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  boxSizing: "border-box",
                }}
              >
                {COURIER_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#334155" }}>
                Settlement Date <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
                required
                style={{
                  width: "100%",
                  marginTop: 3,
                  padding: "6px 8px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#334155" }}>
                Remittance Batch ID <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                value={remittanceId}
                onChange={(e) => setRemittanceId(e.target.value)}
                required
                placeholder="e.g. REM-00021"
                style={{
                  width: "100%",
                  marginTop: 3,
                  padding: "6px 8px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#334155" }}>
                Statement Ref <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                required
                placeholder="e.g. TRAX-REM-8892"
                style={{
                  width: "100%",
                  marginTop: 3,
                  padding: "6px 8px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Financial Breakdown Inputs */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "10px 14px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
              gap: 10,
              boxSizing: "border-box",
            }}
          >
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#334155" }}>
                Net Received <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="number"
                min={1}
                value={receivedAmount || ""}
                onChange={(e) => setReceivedAmount(Number(e.target.value))}
                placeholder="Rs. 0"
                required
                style={{
                  width: "100%",
                  marginTop: 3,
                  padding: "6px 10px",
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: "#0f172a",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                Courier Deductions
              </label>
              <input
                type="number"
                min={0}
                value={courierCharges || ""}
                onChange={(e) => setCourierCharges(Number(e.target.value))}
                placeholder="Rs. 0"
                style={{
                  width: "100%",
                  marginTop: 3,
                  padding: "6px 10px",
                  fontSize: 12.5,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 3,
                  padding: "6px 10px",
                  fontSize: 12.5,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  boxSizing: "border-box",
                }}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Reconciliation Status</label>
              <div style={{ marginTop: 4 }}>
                {isReconciled ? (
                  <span
                    style={{
                      background: "#dcfce7",
                      color: "#166534",
                      border: "1px solid #bbf7d0",
                      padding: "4px 8px",
                      borderRadius: 5,
                      fontSize: 11.5,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <CheckCircle2 size={13} /> Reconciled
                  </span>
                ) : (
                  <span
                    style={{
                      background: "#fef3c7",
                      color: "#92400e",
                      border: "1px solid #fde68a",
                      padding: "4px 8px",
                      borderRadius: 5,
                      fontSize: 11.5,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <AlertTriangle size={13} /> Diff: {money(difference)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Orders Selector Table */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
                Select Delivered Orders for {courier} ({selectedOrderIds.length} of {eligibleOrders.length} selected)
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0284c7",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {selectedOrderIds.length === eligibleOrders.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div
              style={{
                maxHeight: 200,
                overflowY: "auto",
                overflowX: "hidden",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                boxSizing: "border-box",
              }}
            >
              <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", fontSize: 12 }}>
                <colgroup>
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "25%" }} />
                </colgroup>
                <thead>
                  <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                    <th style={{ padding: "7px 10px", textAlign: "center" }}></th>
                    <th style={{ padding: "7px 10px", textAlign: "left" }}>Order ID</th>
                    <th style={{ padding: "7px 10px", textAlign: "left" }}>Customer</th>
                    <th style={{ padding: "7px 10px", textAlign: "left" }}>Tracking AWB</th>
                    <th style={{ padding: "7px 10px", textAlign: "right" }}>Remaining Due</th>
                  </tr>
                </thead>
                <tbody>
                  {eligibleOrders.length > 0 ? (
                    eligibleOrders.map((o) => {
                      const bd = calculateCodBreakdown(o);
                      const isSelected = selectedOrderIds.includes(o.id);

                      return (
                        <tr
                          key={o.id}
                          onClick={() => handleToggleOrder(o.id)}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: isSelected ? "#f0fdf4" : undefined,
                            cursor: "pointer",
                          }}
                        >
                          <td style={{ padding: "7px 10px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleOrder(o.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td style={{ padding: "7px 10px", fontWeight: 700, color: "#0f172a" }}>#{o.id}</td>
                          <td style={{ padding: "7px 10px" }}>
                            {o.details?.name} ({o.details?.city || "PK"})
                          </td>
                          <td style={{ padding: "7px 10px", color: "#64748b", fontFamily: "monospace" }}>
                            {o.details?.trackingNumber || "—"}
                          </td>
                          <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                            {money(bd.remainingAmount)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>
                        No pending COD orders found for {courier}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Reconciliation Summary Strip */}
          <div
            style={{
              background: isReconciled ? "#f0fdf4" : "#fffbeb",
              border: `1px solid ${isReconciled ? "#bbf7d0" : "#fef08a"}`,
              borderRadius: 8,
              padding: "8px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 12.5,
              boxSizing: "border-box",
            }}
          >
            <div>
              <span style={{ color: "#64748b" }}>Matched Orders:</span>{" "}
              <strong>{money(selectedMatchedTotal)}</strong>
              {courierCharges > 0 && (
                <span style={{ color: "#991b1b", marginLeft: 6 }}>
                  - Charges: {money(courierCharges)}
                </span>
              )}
            </div>

            <div>
              <span style={{ color: "#64748b" }}>Net Received:</span>{" "}
              <strong style={{ color: "#0f172a" }}>{money(receivedAmount)}</strong>
            </div>

            <div>
              <span style={{ color: "#64748b" }}>Difference:</span>{" "}
              <strong style={{ color: difference === 0 ? "#16a34a" : "#d97706" }}>
                {money(difference)}
              </strong>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#334155" }}>Batch Notes</label>
            <input
              type="text"
              placeholder="Optional notes or remittance invoice reference"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: "100%",
                marginTop: 3,
                padding: "6px 10px",
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              style={{
                padding: "6px 16px",
                fontSize: 12,
                fontWeight: 600,
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || selectedOrderIds.length === 0}
              style={{
                padding: "6px 18px",
                fontSize: 12.5,
                fontWeight: 700,
                background: "#059669",
                color: "#ffffff",
                border: "1px solid #047857",
                borderRadius: 6,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Check size={14} />{" "}
              {submitting ? "Processing…" : `Reconcile & Settle (${selectedOrderIds.length} Orders)`}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------
// SUB-MODAL 3: Settlement History Timeline
// -------------------------------------------------------------
function SettlementHistoryModal({
  order,
  open,
  onOpenChange,
}: {
  order: LifecycleOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const breakdown = calculateCodBreakdown(order);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="admin-dialog-cod-submodal sm:max-w-[560px]"
        style={{
          maxWidth: 560,
          background: "#ffffff",
          padding: "22px 26px",
          overflowX: "hidden",
          boxSizing: "border-box",
        }}
      >
        <DialogHeader style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
          <DialogTitle
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#0f172a",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Clock size={19} style={{ color: "#0284c7" }} />
            COD Settlement History &amp; Timeline
          </DialogTitle>
          <DialogDescription style={{ fontSize: 12, color: "#64748b" }}>
            Audit trail of cash collection, courier remittances, and adjustments for order #{order.id}
          </DialogDescription>
        </DialogHeader>

        {/* Breakdown Card */}
        <div
          style={{
            marginTop: 10,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "10px 14px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
            gap: 8,
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          <div>
            <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700 }}>EXPECTED COD</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
              {money(breakdown.expectedAmount)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: "#166534", fontWeight: 700 }}>RECEIVED TOTAL</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#16a34a", marginTop: 2 }}>
              {money(breakdown.receivedAmount)}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 10.5,
                color: breakdown.remainingAmount > 0 ? "#d97706" : "#64748b",
                fontWeight: 700,
              }}
            >
              REMAINING DUE
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: breakdown.remainingAmount > 0 ? "#d97706" : "#64748b",
                marginTop: 2,
              }}
            >
              {money(breakdown.remainingAmount)}
            </div>
          </div>
        </div>

        {/* Timeline List */}
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, overflowY: "auto", overflowX: "hidden" }}>
          {/* 1. Order Delivered Event */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "#ecfdf5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              <Truck size={13} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Order Delivered by Courier</div>
              <div style={{ fontSize: 11.5, color: "#64748b" }}>
                Courier: {order.details?.courier || "Trax"} · Tracking: {order.details?.trackingNumber || "N/A"}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
                {order.details?.deliveredAt || order.created_at || "Delivered"}
              </div>
            </div>
          </div>

          {/* 2. Settlement Transactions */}
          {breakdown.transactions.map((tx, idx) => {
            const isReversal = tx.type === "reversal";

            return (
              <div key={tx.id || idx} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: isReversal ? "#fee2e2" : "#f0fdf4",
                    color: isReversal ? "#dc2626" : "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {isReversal ? <RotateCcw size={13} /> : <Check size={13} />}
                </div>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: "#f8fafc",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 800,
                        color: isReversal ? "#dc2626" : "#166534",
                      }}
                    >
                      {isReversal ? `Reversal: -${money(tx.amount)}` : `Payment: +${money(tx.amount)}`}
                    </span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{tx.date}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#334155", marginTop: 2 }}>
                    Method: {tx.paymentMethod} {tx.reference ? `· Ref: ${tx.reference}` : ""}{" "}
                    {tx.remittanceId ? `· Batch: ${tx.remittanceId}` : ""}
                  </div>
                  {tx.note && (
                    <div style={{ fontSize: 11, color: "#64748b", fontStyle: "italic", marginTop: 2 }}>
                      "{tx.note}"
                    </div>
                  )}
                  <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 3 }}>
                    Recorded by: {tx.recordedBy?.name || "Admin"}
                  </div>
                </div>
              </div>
            );
          })}

          {/* 3. Final State Indicator */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: breakdown.isSettled ? "#dcfce7" : "#fef3c7",
                color: breakdown.isSettled ? "#16a34a" : "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {breakdown.isSettled ? <CheckCircle2 size={13} /> : <Clock size={13} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 800,
                  color: breakdown.isSettled ? "#166534" : "#92400e",
                }}
              >
                Current Status: {breakdown.status}
              </div>
              <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 1 }}>
                {breakdown.isSettled
                  ? `All funds (${money(breakdown.receivedAmount)}) fully settled in bank`
                  : `Awaiting remaining courier remittance of ${money(breakdown.remainingAmount)}`}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, textAlign: "right" }}>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            style={{
              padding: "6px 16px",
              fontSize: 12,
              fontWeight: 600,
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------
// SUB-MODAL 4: Dispute Modal
// -------------------------------------------------------------
function DisputeModal({
  order,
  open,
  onOpenChange,
  onConfirm,
}: {
  order: LifecycleOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, notes: string, resolve?: boolean) => Promise<boolean>;
}) {
  const isCurrentlyDisputed = Boolean(order.details?.codDisputed);
  const [reason, setReason] = useState(order.details?.codDisputeReason || "Amount Mismatch");
  const [notes, setNotes] = useState(order.details?.codDisputeNotes || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (resolve = false) => {
    if (!notes.trim()) {
      toast.error("Please enter explanatory notes for this dispute action");
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(reason, notes.trim(), resolve);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="admin-dialog-cod-submodal sm:max-w-[480px]"
        style={{ maxWidth: 480, background: "#ffffff", padding: "20px 24px", overflowX: "hidden", boxSizing: "border-box" }}
      >
        <DialogHeader style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
          <DialogTitle
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: isCurrentlyDisputed ? "#166534" : "#dc2626",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={18} />
            {isCurrentlyDisputed ? "Review / Resolve COD Dispute" : "Flag COD Settlement Dispute"}
          </DialogTitle>
          <DialogDescription style={{ fontSize: 12, color: "#64748b" }}>
            Order #{order.id} · Expected COD: {money(order.total)}
          </DialogDescription>
        </DialogHeader>

        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {!isCurrentlyDisputed && (
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>
                Dispute Reason <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 3,
                  padding: "6px 10px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  boxSizing: "border-box",
                }}
              >
                {DISPUTE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>
              {isCurrentlyDisputed ? "Resolution Notes" : "Investigation Details / Notes"}{" "}
              <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Describe the discrepancy, courier response, or resolution details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
              style={{
                width: "100%",
                marginTop: 3,
                padding: "6px 10px",
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            {isCurrentlyDisputed ? (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={submitting}
                style={{
                  padding: "6px 16px",
                  fontSize: 12,
                  fontWeight: 700,
                  background: "#059669",
                  color: "#ffffff",
                  border: "1px solid #047857",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                {submitting ? "Resolving…" : "Resolve Dispute"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                style={{
                  padding: "6px 16px",
                  fontSize: 12,
                  fontWeight: 700,
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "1px solid #b91c1c",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                {submitting ? "Flagging…" : "Flag as Disputed"}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------
// SUB-MODAL 5: Reverse / Adjust Settlement Modal
// -------------------------------------------------------------
function ReverseSettlementModal({
  order,
  open,
  onOpenChange,
  onConfirm,
}: {
  order: LifecycleOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (transactionId: string, reason: string, note?: string) => Promise<boolean>;
}) {
  const breakdown = calculateCodBreakdown(order);
  const activeTransactions = breakdown.transactions.filter((tx) => tx.type !== "reversal");

  const [selectedTxId, setSelectedTxId] = useState<string>(
    activeTransactions[activeTransactions.length - 1]?.id || ""
  );
  const [reason, setReason] = useState("Courier Payment Correction");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxId) {
      toast.error("Please select a transaction to reverse");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please specify a reason for this reversal");
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm(selectedTxId, reason.trim(), note.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="admin-dialog-cod-submodal sm:max-w-[480px]"
        style={{ maxWidth: 480, background: "#ffffff", padding: "20px 24px", overflowX: "hidden", boxSizing: "border-box" }}
      >
        <DialogHeader style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
          <DialogTitle
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <RotateCcw size={18} />
            Reverse / Adjust COD Settlement
          </DialogTitle>
          <DialogDescription style={{ fontSize: 12, color: "#64748b" }}>
            Create an audited reversal entry to adjust mistakenly recorded funds on order #{order.id}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>
              Select Transaction to Reverse <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              value={selectedTxId}
              onChange={(e) => setSelectedTxId(e.target.value)}
              required
              style={{
                width: "100%",
                marginTop: 3,
                padding: "6px 10px",
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                boxSizing: "border-box",
              }}
            >
              {activeTransactions.map((tx) => (
                <option key={tx.id} value={tx.id}>
                  {tx.date} — {money(tx.amount)} ({tx.paymentMethod} {tx.reference ? `· ${tx.reference}` : ""})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>
              Reversal Reason <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="e.g. Mistaken duplicate settlement / Courier returned funds"
              style={{
                width: "100%",
                marginTop: 3,
                padding: "6px 10px",
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>Audit Note</label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional additional audit justification..."
              style={{
                width: "100%",
                marginTop: 3,
                padding: "6px 10px",
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "6px 16px",
                fontSize: 12,
                fontWeight: 700,
                background: "#dc2626",
                color: "#ffffff",
                border: "1px solid #b91c1c",
                borderRadius: 6,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <RotateCcw size={13} /> {submitting ? "Reversing…" : "Confirm Reversal"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
