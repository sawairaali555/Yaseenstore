"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/admin-request";
import { ArrowUpDown, Check, ClipboardList, Eye, History, Search, ShieldCheck, UserRound, X } from "lucide-react";

type CustomerOrder = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  details: Record<string, unknown>;
};

type ProfileRecord = {
  customer_key: string;
  manual_trusted: number;
  manual_reason: string;
  notes: string;
};
type ProfileResponse = { profile: ProfileRecord; error?: string };

type CustomerView = "all" | "returning" | "trusted" | "risk" | "analytics";

const money = (value: number) => `Rs. ${Math.round(value || 0).toLocaleString("en-PK")}`;
const normalizePhone = (value: string = "") => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith("3") && digits.length === 10) return `0${digits}`;
  return digits.slice(-10);
};
const customerKeyFor = (order: CustomerOrder) => {
  const phone = normalizePhone(String(order.details?.phone || ""));
  if (phone) return `phone:${phone}`;
  const email = String(order.details?.email || "").trim().toLowerCase();
  if (email) return `email:${email}`;
  return `account:${String(order.details?.customerId || order.details?.accountId || order.details?.name || order.id).trim().toLowerCase()}`;
};
const isCancelled = (order: CustomerOrder) => order.status === "Cancelled" || order.details?.csrStatus === "Cancelled by Customer";
const isDelivered = (order: CustomerOrder) => order.status === "Delivered" || order.details?.deliveryStatus === "Delivered";
const isReturned = (order: CustomerOrder) => ["Return Requested", "Returned", "Refunded", "RTO", "Failed Delivery"].includes(order.status) || ["Requested", "Approved", "Returned"].includes(String(order.details?.returnStatus || ""));

function trustScore(customer: CustomerRecord) {
  if (!customer.orders.length) return 40;
  const deliveries = customer.delivered / customer.orders.length;
  const failures = customer.cancelled + customer.returned;
  const deliveryPoints = Math.round(deliveries * 55);
  const repeatPoints = Math.min(25, Math.max(0, customer.orders.length - 1) * 5);
  const phonePoints = customer.phone ? 10 : 0;
  const penalty = Math.min(30, failures * 8);
  return Math.max(0, Math.min(100, deliveryPoints + repeatPoints + phonePoints - penalty));
}

type CustomerRecord = {
  key: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  orders: CustomerOrder[];
  total: number;
  delivered: number;
  cancelled: number;
  returned: number;
  lastOrder: string;
};

function makeCustomers(orders: CustomerOrder[]) {
  const map = new Map<string, CustomerRecord>();
  for (const order of orders) {
    const key = customerKeyFor(order);
    const current: CustomerRecord = map.get(key) || {
      key,
      name: String(order.details?.name || "Unknown customer"),
      phone: String(order.details?.phone || ""),
      email: String(order.details?.email || ""),
      city: String(order.details?.city || ""),
      orders: [],
      total: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
      lastOrder: order.created_at,
    };
    current.orders.push(order);
    if (!isCancelled(order)) current.total += Number(order.total || 0);
    if (isDelivered(order)) current.delivered += 1;
    if (isCancelled(order)) current.cancelled += 1;
    if (isReturned(order)) current.returned += 1;
    if (new Date(order.created_at).getTime() > new Date(current.lastOrder).getTime()) current.lastOrder = order.created_at;
    map.set(key, current);
  }
  return Array.from(map.values()).map((customer) => ({ ...customer, score: trustScore(customer) }));
}

function statusFor(customer: CustomerRecord & { score: number }, profile?: ProfileRecord) {
  if (profile?.manual_trusted) return { label: "Trusted Buyer", tone: "trusted" };
  if (customer.orders.length < 2) return { label: "New / Unverified", tone: "new" };
  if (customer.score >= 80) return { label: "Trusted Buyer", tone: "trusted" };
  if (customer.score >= 60) return { label: "Reliable Buyer", tone: "reliable" };
  if (customer.score >= 40) return { label: "New / Unverified", tone: "new" };
  return { label: "Review Required", tone: "risk" };
}

export default function CustomerIntelligence({
  orders,
  view,
  onViewChange,
  onOpenHistory,
}: {
  orders: CustomerOrder[];
  view: CustomerView;
  onViewChange: (view: CustomerView) => void;
  onOpenHistory: (phone: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [threshold, setThreshold] = useState(2);
  const [sort, setSort] = useState<"orders" | "spent" | "last">("orders");
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [selected, setSelected] = useState<(CustomerRecord & { score: number }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    adminFetch("/api/customers").then(async (response) => {
      const data = await response.json() as { profiles?: ProfileRecord[] };
      if (!cancelled && response.ok) setProfiles(data.profiles || []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const customers = useMemo(() => makeCustomers(orders), [orders]);
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.customer_key, profile])), [profiles]);
  const enriched = useMemo(() => customers.map((customer) => ({ ...customer, status: statusFor(customer, profileMap.get(customer.key)) })), [customers, profileMap]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched.filter((customer) => {
      const matchesQuery = !q || [customer.name, customer.phone, customer.email, customer.city].join(" ").toLowerCase().includes(q);
      const matchesThreshold = view !== "returning" || customer.orders.length >= threshold;
      const matchesView = view === "all" || view === "analytics" || (view === "returning" && customer.orders.length >= 2) || (view === "trusted" && customer.status.tone === "trusted") || (view === "risk" && customer.status.tone === "risk");
      return matchesQuery && matchesThreshold && matchesView;
    }).sort((a, b) => sort === "spent" ? b.total - a.total : sort === "last" ? new Date(b.lastOrder).getTime() - new Date(a.lastOrder).getTime() : b.orders.length - a.orders.length);
  }, [enriched, query, threshold, sort, view]);

  const analytics = useMemo(() => {
    const returning = enriched.filter((customer) => customer.orders.length >= 2).length;
    const delivered = orders.filter(isDelivered).length;
    const eligible = orders.filter((order) => !["Pending", "Test order received", "Placed", "New"].includes(order.status)).length;
    return { total: enriched.length, returning, trusted: enriched.filter((customer) => customer.status.tone === "trusted").length, review: enriched.filter((customer) => customer.status.tone === "risk").length, repeatRate: enriched.length ? Math.round((returning / enriched.length) * 100) : 0, deliveryRate: eligible ? Math.round((delivered / eligible) * 100) : 0 };
  }, [enriched, orders]);

  async function saveTrust(trusted: boolean) {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await adminFetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "trust", customerKey: selected.key, trusted, reason }) });
      const data = await response.json() as ProfileResponse;
      if (!response.ok) throw new Error(data.error || "Unable to update trusted status.");
      setProfiles((current) => [...current.filter((profile) => profile.customer_key !== selected.key), data.profile]);
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes() {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await adminFetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "notes", customerKey: selected.key, notes }) });
      const data = await response.json() as ProfileResponse;
      if (!response.ok) throw new Error(data.error || "Unable to save notes.");
      setProfiles((current) => [...current.filter((profile) => profile.customer_key !== selected.key), data.profile]);
    } finally {
      setBusy(false);
    }
  }

  if (view === "analytics") return (
    <div className="customer-intelligence-shell">
      <div className="customer-kpi-grid">
        {[["Total Customers", analytics.total], ["Returning Buyers", analytics.returning], ["Trusted Buyers", analytics.trusted], ["Repeat Purchase Rate", `${analytics.repeatRate}%`], ["COD Delivery Success", `${analytics.deliveryRate}%`], ["Requires Review", analytics.review]].map(([label, value]) => <div className="customer-kpi" key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="customer-analytics-grid"><div className="admin-card customer-chart-card"><h2>Customer loyalty</h2><p>Returning customers compared with the total customer base.</p><div className="customer-bar"><i style={{ width: `${analytics.repeatRate}%` }} /></div><b>{analytics.repeatRate}% repeat purchase rate</b></div><div className="admin-card customer-chart-card"><h2>Successful deliveries</h2><p>Verified delivered orders across this store.</p><div className="customer-bar delivery"><i style={{ width: `${analytics.deliveryRate}%` }} /></div><b>{analytics.deliveryRate}% COD delivery success rate</b></div></div>
    </div>
  );

  return (
    <div className="customer-intelligence-shell">
      <div className="customer-intelligence-tabs">{([["all", "All Customers"], ["returning", "Returning Buyers"], ["trusted", "Trusted Buyers"], ["risk", "High-Risk Buyers"], ["analytics", "Customer Analytics"]] as [CustomerView, string][]).map(([id, label]) => <button key={id} className={view === id ? "active" : ""} onClick={() => onViewChange(id)}>{label}</button>)}</div>
      <div className="customer-toolbar"><div className="admin-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, phone, email or city" /></div><select value={threshold} onChange={(event) => setThreshold(Number(event.target.value))}><option value={2}>2+ orders</option><option value={3}>3+ orders</option><option value={5}>5+ orders</option><option value={10}>10+ orders</option></select><button className="customer-sort-button" onClick={() => setSort(sort === "orders" ? "spent" : sort === "spent" ? "last" : "orders")}><ArrowUpDown size={14} /> Sort: {sort}</button></div>
      <div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>Customer</th><th>Orders</th><th>Delivered</th><th>Cancelled</th><th>Returned</th><th>Total spent</th><th>Last order</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map((customer) => <tr key={customer.key}><td><button className="customer-name-button" onClick={() => { setSelected(customer); setReason(profileMap.get(customer.key)?.manual_reason || ""); setNotes(profileMap.get(customer.key)?.notes || ""); }}><span className="customer-avatar"><UserRound size={16} /></span><span><b>{customer.name}</b><small>{customer.phone || customer.email || "No contact identifier"}</small></span></button></td><td>{customer.orders.length}</td><td>{customer.delivered}</td><td>{customer.cancelled}</td><td>{customer.returned}</td><td>{money(customer.total)}</td><td>{customer.lastOrder ? new Date(customer.lastOrder).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td><td><span className={`customer-status-badge ${customer.status.tone}`}><i />{customer.status.label}</span><small className="customer-score">Score {customer.score}/100</small></td><td><button className="customer-history-button" title="View customer order history" onClick={() => onOpenHistory(customer.phone)}><History size={14} /></button><button className="customer-history-button" title="Open customer profile" onClick={() => { setSelected(customer); setReason(profileMap.get(customer.key)?.manual_reason || ""); setNotes(profileMap.get(customer.key)?.notes || ""); }}><Eye size={14} /></button></td></tr>)}</tbody></table>{!filtered.length && <div className="admin-empty"><ClipboardList /><h3>No customers match this view</h3><p>Customers are calculated from this store's order history.</p></div>}</div>
      {selected && <div className="customer-drawer-backdrop" onClick={() => setSelected(null)}><aside className="customer-profile-drawer" onClick={(event) => event.stopPropagation()}><button className="customer-drawer-close" onClick={() => setSelected(null)}><X size={18} /></button><span className="customer-drawer-eyebrow">CUSTOMER PROFILE</span><h2>{selected.name}</h2><p>{selected.phone || selected.email || "No contact identifier"}{selected.city ? ` · ${selected.city}` : ""}</p><div className="customer-profile-score"><strong>{selected.score}</strong><span>/100<br /><small>{statusFor(selected, profileMap.get(selected.key)).label}</small></span></div><div className="customer-profile-stats"><span><b>{selected.orders.length}</b> Orders</span><span><b>{selected.delivered}</b> Delivered</span><span><b>{selected.cancelled}</b> Cancelled</span><span><b>{selected.returned}</b> Returned</span><span><b>{money(selected.total)}</b> Lifetime spend</span></div><div className="customer-trust-explanation"><ShieldCheck size={17} /><p>Score includes successful deliveries, repeat purchases, cancellations, returns, delivery failures and a verified phone identifier.</p></div><div className="customer-drawer-actions"><button disabled={busy} onClick={() => void saveTrust(true)}><Check size={14} /> Mark trusted</button><button disabled={busy} onClick={() => void saveTrust(false)}>Remove trusted</button></div><label className="customer-note-field">Trust reason<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is this customer trusted?" /></label><label className="customer-note-field">Admin notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add internal notes..." /></label><button className="admin-primary customer-save-notes" disabled={busy} onClick={() => void saveNotes()}>Save customer notes</button><h3>Complete order history</h3><div className="customer-order-history">{selected.orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((order) => <div key={order.id}><span><b>{order.id}</b><small>{new Date(order.created_at).toLocaleDateString("en-PK")}</small></span><span>{money(order.total)}<small>{order.status}</small></span></div>)}</div></aside></div>}
    </div>
  );
}
