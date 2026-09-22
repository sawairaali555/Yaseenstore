"use client";

import React, { useState, useMemo } from "react";
import {
  RotateCcw,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  AlertTriangle,
  XCircle,
  Banknote,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
  Phone,
  MessageCircle,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { money } from "@/app/catalog";
import {
  ReturnRequest,
  ReturnStatus,
  RefundStatus,
  ReturnReason,
  getReturnStatusBadge,
  getRefundStatusBadge,
  getInspectionBadge,
  getInventoryActionBadge,
  RETURN_REASONS,
} from "@/lib/return-types";

interface Props {
  returns: ReturnRequest[];
  onSelectReturn: (ret: ReturnRequest) => void;
  onOpenCreateReturn: () => void;
  busy?: boolean;
}

export default function ReturnsView({
  returns,
  onSelectReturn,
  onOpenCreateReturn,
  busy = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [refundStatusFilter, setRefundStatusFilter] = useState<string>("all");
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7days" | "30days">("all");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Counts for top tab strip
  const tabCounts = useMemo(() => {
    return {
      all: returns.length,
      requested: returns.filter((r) => r.returnStatus === "Requested").length,
      approved: returns.filter((r) => r.returnStatus === "Approved").length,
      in_transit: returns.filter((r) => r.returnStatus === "In Transit").length,
      received: returns.filter((r) => r.returnStatus === "Received").length,
      refunded: returns.filter((r) => r.returnStatus === "Refunded" || r.refundStatus === "Refunded").length,
      rejected: returns.filter((r) => r.returnStatus === "Rejected").length,
    };
  }, [returns]);

  // Filtered returns list
  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      // Top Tab Filtering
      if (activeTab === "requested" && r.returnStatus !== "Requested") return false;
      if (activeTab === "approved" && r.returnStatus !== "Approved") return false;
      if (activeTab === "in_transit" && r.returnStatus !== "In Transit") return false;
      if (activeTab === "received" && r.returnStatus !== "Received") return false;
      if (activeTab === "refunded" && r.returnStatus !== "Refunded" && r.refundStatus !== "Refunded") return false;
      if (activeTab === "rejected" && r.returnStatus !== "Rejected") return false;

      // Status Filter
      if (statusFilter !== "all" && r.returnStatus !== statusFilter) return false;

      // Refund Status Filter
      if (refundStatusFilter !== "all" && r.refundStatus !== refundStatusFilter) return false;

      // Reason Filter
      if (reasonFilter !== "all" && r.returnReason !== reasonFilter) return false;

      // Date Filter
      if (dateFilter !== "all") {
        const reqDate = new Date(r.requestedDate || r.createdAt).getTime();
        const now = Date.now();
        if (dateFilter === "today" && now - reqDate > 86400000) return false;
        if (dateFilter === "7days" && now - reqDate > 7 * 86400000) return false;
        if (dateFilter === "30days" && now - reqDate > 30 * 86400000) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = r.id.toLowerCase().includes(q) || r.orderId.toLowerCase().includes(q);
        const matchCustomer = r.customerName.toLowerCase().includes(q) || r.customerPhone.includes(q) || (r.customerCity || "").toLowerCase().includes(q);
        const matchItems = r.items.some((it) => it.name.toLowerCase().includes(q) || (it.sku || "").toLowerCase().includes(q));
        if (!matchId && !matchCustomer && !matchItems) return false;
      }

      return true;
    });
  }, [returns, activeTab, statusFilter, refundStatusFilter, reasonFilter, dateFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredReturns.length / pageSize));
  const paginatedReturns = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredReturns.slice(start, start + pageSize);
  }, [filteredReturns, page, pageSize]);

  return (
    <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Top KPI Strip */}
      <div className="order-kpi-strip" style={{ margin: "16px 20px 0" }}>
        <button
          type="button"
          className={`order-kpi-pill ${activeTab === "all" ? "active" : ""}`}
          onClick={() => { setActiveTab("all"); setPage(1); }}
        >
          <span>🔄 Total Returns:</span>
          <span className="order-kpi-count">{tabCounts.all}</span>
        </button>

        <button
          type="button"
          className={`order-kpi-pill ${activeTab === "requested" ? "active" : ""}`}
          onClick={() => { setActiveTab("requested"); setPage(1); }}
          style={{ borderColor: "#fde047", background: activeTab === "requested" ? "#fefce8" : undefined }}
        >
          <span>🟡 Requested (Pending):</span>
          <span className="order-kpi-count" style={{ color: "#ca8a04" }}>{tabCounts.requested}</span>
        </button>

        <button
          type="button"
          className={`order-kpi-pill ${activeTab === "approved" ? "active" : ""}`}
          onClick={() => { setActiveTab("approved"); setPage(1); }}
          style={{ borderColor: "#93c5fd", background: activeTab === "approved" ? "#eff6ff" : undefined }}
        >
          <span>🔵 Approved:</span>
          <span className="order-kpi-count" style={{ color: "#2563eb" }}>{tabCounts.approved}</span>
        </button>

        <button
          type="button"
          className={`order-kpi-pill ${activeTab === "in_transit" ? "active" : ""}`}
          onClick={() => { setActiveTab("in_transit"); setPage(1); }}
          style={{ borderColor: "#c4b5fd", background: activeTab === "in_transit" ? "#f5f3ff" : undefined }}
        >
          <span>🚚 In Transit:</span>
          <span className="order-kpi-count" style={{ color: "#7c3aed" }}>{tabCounts.in_transit}</span>
        </button>

        <button
          type="button"
          className={`order-kpi-pill ${activeTab === "received" ? "active" : ""}`}
          onClick={() => { setActiveTab("received"); setPage(1); }}
          style={{ borderColor: "#86efac", background: activeTab === "received" ? "#f0fdf4" : undefined }}
        >
          <span>📦 Received:</span>
          <span className="order-kpi-count" style={{ color: "#16a34a" }}>{tabCounts.received}</span>
        </button>

        <button
          type="button"
          className={`order-kpi-pill ${activeTab === "refunded" ? "active" : ""}`}
          onClick={() => { setActiveTab("refunded"); setPage(1); }}
          style={{ borderColor: "#86efac", background: activeTab === "refunded" ? "#f0fdf4" : undefined }}
        >
          <span>💰 Refunded:</span>
          <span className="order-kpi-count" style={{ color: "#16a34a" }}>{tabCounts.refunded}</span>
        </button>

        <button
          type="button"
          className={`order-kpi-pill ${activeTab === "rejected" ? "active" : ""}`}
          onClick={() => { setActiveTab("rejected"); setPage(1); }}
          style={{ borderColor: "#fca5a5", background: activeTab === "rejected" ? "#fef2f2" : undefined }}
        >
          <span>❌ Rejected:</span>
          <span className="order-kpi-count" style={{ color: "#dc2626" }}>{tabCounts.rejected}</span>
        </button>
      </div>

      {/* Top 7 Navigation Tabs with Badges */}
      <div className="orders-main-tabs" style={{ margin: "14px 20px 0" }}>
        {[
          { id: "all", label: "All Returns", count: tabCounts.all },
          { id: "requested", label: "🟡 Requested", count: tabCounts.requested },
          { id: "approved", label: "🔵 Approved", count: tabCounts.approved },
          { id: "in_transit", label: "🟣 Return in Transit", count: tabCounts.in_transit },
          { id: "received", label: "🟢 Received at Warehouse", count: tabCounts.received },
          { id: "refunded", label: "✅ Refunded", count: tabCounts.refunded },
          { id: "rejected", label: "❌ Rejected", count: tabCounts.rejected },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`orders-tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
            }}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && <span className="badge">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Universal Search, Advanced Filter Bar, and Create Button */}
      <div className="orders-toolbar-container" style={{ margin: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          {/* Universal Search */}
          <div className="admin-search" style={{ flex: 1, minWidth: 260 }}>
            <Search size={18} />
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search by Return ID, Order ID, Customer name, Phone, or SKU…"
              aria-label="Search returns"
            />
          </div>

          {/* Filter Dropdowns */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 10px", fontSize: 12.5, fontWeight: 600, background: "#ffffff" }}
            >
              <option value="all">All Return Statuses</option>
              <option value="Requested">Requested</option>
              <option value="Approved">Approved</option>
              <option value="In Transit">In Transit</option>
              <option value="Received">Received</option>
              <option value="Refunded">Refunded</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              value={refundStatusFilter}
              onChange={(e) => { setRefundStatusFilter(e.target.value); setPage(1); }}
              style={{ height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 10px", fontSize: 12.5, fontWeight: 600, background: "#ffffff" }}
            >
              <option value="all">All Refund Statuses</option>
              <option value="Pending">Refund Pending</option>
              <option value="Processing">Refund Processing</option>
              <option value="Refunded">Refunded</option>
              <option value="Rejected">Refund Rejected</option>
            </select>

            <select
              value={reasonFilter}
              onChange={(e) => { setReasonFilter(e.target.value); setPage(1); }}
              style={{ height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 10px", fontSize: 12.5, fontWeight: 600, background: "#ffffff" }}
            >
              <option value="all">All Return Reasons</option>
              {RETURN_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <select
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value as any); setPage(1); }}
              style={{ height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 10px", fontSize: 12.5, fontWeight: 600, background: "#ffffff" }}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>

            {/* Create Return Request Button */}
            <button
              type="button"
              onClick={onOpenCreateReturn}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                background: "#2563eb",
                color: "#ffffff",
                fontSize: 12.5,
                fontWeight: 700,
                border: 0,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(37,99,235,0.2)",
              }}
            >
              <Plus size={15} /> Create Return Request
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Returns Table */}
      <div style={{ overflowX: "auto", borderTop: "1px solid #e2e8f0" }}>
        <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#f8fafc", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "12px 16px" }}>Return ID</th>
              <th style={{ padding: "12px 16px" }}>Order ID</th>
              <th style={{ padding: "12px 16px" }}>Customer</th>
              <th style={{ padding: "12px 16px" }}>Returned Items</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Refund Amount</th>
              <th style={{ padding: "12px 16px" }}>Reason</th>
              <th style={{ padding: "12px 16px" }}>Requested Date</th>
              <th style={{ padding: "12px 16px", textAlign: "center" }}>Return Status</th>
              <th style={{ padding: "12px 16px", textAlign: "center" }}>Refund Status</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedReturns.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
                  <RotateCcw size={32} style={{ margin: "0 auto 8px", color: "#cbd5e1" }} />
                  <strong style={{ display: "block", color: "#475569", fontSize: 14 }}>No Return Requests Found</strong>
                  <p style={{ fontSize: 12, margin: "4px 0 12px" }}>No returns match the selected filters or search terms.</p>
                  <button
                    type="button"
                    className="admin-secondary"
                    onClick={() => {
                      setActiveTab("all");
                      setSearchQuery("");
                      setStatusFilter("all");
                      setRefundStatusFilter("all");
                      setReasonFilter("all");
                      setDateFilter("all");
                    }}
                    style={{ fontSize: 12, padding: "6px 14px", borderRadius: 6 }}
                  >
                    Clear All Filters
                  </button>
                </td>
              </tr>
            ) : (
              paginatedReturns.map((r) => {
                const retBadge = getReturnStatusBadge(r.returnStatus);
                const refBadge = getRefundStatusBadge(r.refundStatus);
                const totalUnits = r.items.reduce((sum, it) => sum + it.returnQty, 0);

                return (
                  <tr
                    key={r.id}
                    onClick={() => onSelectReturn(r)}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      transition: "background 0.12s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                  >
                    {/* Return ID */}
                    <td style={{ padding: "12px 16px" }}>
                      <strong style={{ color: "#2563eb", fontWeight: 700, fontSize: 13 }}>
                        #{r.id}
                      </strong>
                    </td>

                    {/* Order ID */}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontWeight: 600, color: "#334155" }}>
                        #{r.orderId}
                      </span>
                    </td>

                    {/* Customer Info */}
                    <td style={{ padding: "12px 16px" }}>
                      <div>
                        <strong style={{ color: "#0f172a", display: "block", fontSize: 13 }}>{r.customerName}</strong>
                        <span style={{ fontSize: 11, color: "#64748b" }}>{r.customerPhone} · {r.customerCity || "Pakistan"}</span>
                      </div>
                    </td>

                    {/* Items */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {r.items[0]?.image && (
                          <img
                            src={r.items[0].image}
                            alt=""
                            style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 4, background: "#f8fafc", border: "1px solid #e2e8f0" }}
                          />
                        )}
                        <div>
                          <span style={{ fontWeight: 600, color: "#1e293b", display: "block", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.items[0]?.name || "Product"}
                          </span>
                          <span style={{ fontSize: 11, color: "#64748b" }}>
                            {r.items[0]?.color || "Standard"} {r.items[0]?.size ? `/ ${r.items[0].size}` : ""} · <b style={{ color: "#dc2626" }}>{totalUnits} {totalUnits === 1 ? "unit" : "units"}</b>
                            {r.items.length > 1 && ` (+${r.items.length - 1} more)`}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Amount */}
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <strong style={{ fontSize: 13.5, color: "#0f172a" }}>
                        {money(r.approvedRefundAmount || r.totalRefundableAmount)}
                      </strong>
                    </td>

                    {/* Reason */}
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: "#fef3c7",
                          color: "#92400e",
                          border: "1px solid #fde68a",
                          display: "inline-block",
                          maxWidth: 150,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={r.returnReason}
                      >
                        {r.returnReason}
                      </span>
                    </td>

                    {/* Requested Date */}
                    <td style={{ padding: "12px 16px", color: "#64748b", fontSize: 12 }}>
                      {new Date(r.requestedDate || r.createdAt).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" })}
                    </td>

                    {/* Return Status */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: retBadge.bg,
                          color: retBadge.color,
                          border: `1px solid ${retBadge.border}`,
                          display: "inline-block",
                        }}
                      >
                        {retBadge.label}
                      </span>
                    </td>

                    {/* Refund Status */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: refBadge.bg,
                          color: refBadge.color,
                          border: `1px solid ${refBadge.border}`,
                          display: "inline-block",
                        }}
                      >
                        {refBadge.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectReturn(r);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "5px 12px",
                          borderRadius: 6,
                          background: "#eff6ff",
                          color: "#2563eb",
                          fontSize: 11.5,
                          fontWeight: 700,
                          border: "1px solid #bfdbfe",
                          cursor: "pointer",
                        }}
                      >
                        Details <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          background: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          fontSize: 12,
          color: "#64748b",
        }}
      >
        <div>
          Showing <b>{paginatedReturns.length}</b> of <b>{filteredReturns.length}</b> return requests
        </div>

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: page > 1 ? "pointer" : "not-allowed",
                color: page > 1 ? "#334155" : "#94a3b8",
              }}
            >
              <ChevronLeft size={13} /> Previous
            </button>
            <span>
              Page <b>{page}</b> of <b>{totalPages}</b>
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: page < totalPages ? "pointer" : "not-allowed",
                color: page < totalPages ? "#334155" : "#94a3b8",
              }}
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

