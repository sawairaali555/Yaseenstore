"use client";
import dynamic from "next/dynamic";
import { adminFetch } from "@/lib/admin-request";
import { AdminPagination, useAdminPagination } from './pagination';
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Settings as SettingsIcon,
  ExternalLink,
  Plus,
  Search,
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  ChevronUp,
  Clock,
  ImageIcon,
  Save,
  Store,
  ShieldCheck,
  SlidersHorizontal,
  Pencil,
  Tags,
  Trash2,
  Upload,
  Link,
  Truck,
  Mail,
  MessageSquare,
  Sparkles,
  Printer,
  FileText,
  QrCode,
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  Phone,
  MessageCircle,
  Check,
  X,
  Copy,
  Calendar,
  User,
  Filter,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  Eye,
  MapPin,
  Layers,
  MoreVertical,
  Square,
  CheckSquare,
  Minus,
  EyeOff,
  Info,
  Heart,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster, toast } from "sonner";
import { categories as defaultCategories, money, effectivePrice, type ProductVariant } from "@/app/catalog";
import {
  ALL_PAKISTAN_CITIES,
  PAKISTAN_PROVINCES,
  PAKISTAN_CITIES_BY_PROVINCE,
  cleanPakistanPhone,
  isValidPakistanPhone,
} from "@/lib/pakistan-locations";
import { colors, packOptions } from "@/lib/listing-options";



import ImageManager from "./image-manager";
import AddColorModal from "./add-color-modal";
import InventoryModal from "./inventory-modal";
import StockHistoryModal from "./stock-history-modal";
import RemoveColorModal from "./remove-color-modal";

import Logout from "./logout";



import ManualOrderModal from "./manual-order-modal";
import CustomerHistoryDrawer from "./customer-history-drawer";

import OrderHistoryDrawer from "./order-history-drawer";
import CodSettlementModal from "./cod-settlement-modal";
import DeleteOrderModal, { DeletionReason } from "./delete-order-modal";

import ReturnDetailDrawer from "./return-detail-drawer";
import CreateReturnModal from "./create-return-modal";
import type { ReturnRequest, ReturnStatus, InspectionStatus } from "@/lib/return-types";
import {
  getNextOrderAction,
  evaluateOrderNeedsAttention,
  detectDuplicateOrder,
  analyzeCustomerHistory,
  exportOrdersToCSV,
  getPipelineIndex,
  getPakistanCourierTrackingUrl,
  PIPELINE_STAGES,
  LifecycleOrder,
  calculateCodBreakdown,
  isCodSettled,
} from "@/lib/order-lifecycle";
import "./seller.css";
import "./refinements.css";
import { getInventoryStatus, getVariantEffectiveImage, getColorGalleryImages, InventoryStatus } from "@/lib/inventory-engine";
import { productImage } from "@/lib/product-image";
import type { CategoryNode } from "@/lib/categories";
import type { ManagedProduct, Settings } from "@/lib/store-data";

function AdminSectionLoading() {
  return <p role="status" aria-live="polite">Loading section…</p>;
}

const Overview = dynamic(() => import("./overview"), { loading: AdminSectionLoading });
const Categories = dynamic(() => import("./categories"), { loading: AdminSectionLoading });
const Reviews = dynamic(() => import("./reviews"), { loading: AdminSectionLoading });
const ProductEditor = dynamic(() => import("./products/editor"), { loading: AdminSectionLoading });
const BannersManager = dynamic(() => import("./banners"), { loading: AdminSectionLoading });
const DealCarousels = dynamic(() => import("./deal-carousels"), { loading: AdminSectionLoading });
const ThemeEditor = dynamic(() => import("./theme-editor"), { loading: AdminSectionLoading });
const CustomerIntelligence = dynamic(() => import("./customer-intelligence"), { loading: AdminSectionLoading });
const ReturnsView = dynamic(() => import("./returns-view"), { loading: AdminSectionLoading });

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

export type CsrHistoryEntry = {
  id: string;
  time: string;
  status: CsrStatus;
  note?: string;
  agent?: string;
};

export type Order = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  token?: string;
  details: {
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
    orderDiscount?: number;
    discountType?: "fixed" | "percentage";
    deliveryOverride?: number;
    subtotal?: number;
    deliveryCharge?: number;
    discount?: number;
    itemsSummary?: string;
    [key: string]: any;
  };
  items: {
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
    [key: string]: any;
  }[];
};
type Data = {
  name: string;
  role: string;
  permissions: string[];
  products: ManagedProduct[];
  orders: Order[];
  returns?: ReturnRequest[];
  settings: Settings;
  categories?: CategoryNode[];
};
const sections = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "products", label: "Products", icon: Package },
  { id: "customers", label: "Customers", icon: Users },
  { id: "settings", label: "Store Settings", icon: SettingsIcon },
  { id: "reviews", label: "Reviews", icon: CheckCircle2, hidden: true },
];
export type SettingsSubTab =
  | "settings_home"
  | "store_settings"
  | "store_setup"
  | "offers"
  | "coupons"
  | "info_pages"
  | "theme_setting"
  | "categories";
export type OrderMainTab = "overview" | "new_csr" | "fulfillment" | "shipping" | "completed" | "issues_returns" | "returns";
export type CustomerView = "all" | "returning" | "trusted" | "risk" | "analytics";
export const pipelineSteps = [
  { id: "Pending", label: "Placed", aliases: ["Pending", "Test order received"], icon: Check },
  { id: "Picklist", label: "Picklist", aliases: ["Picklist"], icon: Package },
  { id: "Pack & AirwayBill", label: "Pack & AWB", aliases: ["Pack & AirwayBill", "Processing"], icon: Printer },
  { id: "Shipped", label: "Shipped", aliases: ["Shipped", "Dispatched"], icon: Truck },
  { id: "Delivered", label: "Delivered", aliases: ["Delivered"], icon: CheckCircle2 },
];
const settingsGroups = [
  {
    title: "Store Management",
    cards: [
      { id: "store_settings", title: "General Settings", description: "Store information and contact details", icon: Store },
      { id: "theme_setting", title: "Branding", description: "Logo, colors, fonts, and identity", icon: ImageIcon },
      { id: "store_setup", title: "Domains", description: "Store domains and language settings", icon: Link },
      { id: "store_setup", title: "Languages & Currency", description: "Regional storefront preferences", icon: Banknote },
    ],
  },
  {
    title: "Storefront Customization",
    cards: [
      { id: "theme_setting", title: "Theme Editor", description: "Customize your storefront appearance", icon: SlidersHorizontal },
      { id: "theme_setting", title: "Homepage Builder", description: "Manage sections, banners, and content", icon: LayoutDashboard },
      { id: "theme_setting", title: "Header & Footer", description: "Configure storefront navigation areas", icon: Store },
      { id: "theme_setting", title: "Navigation", description: "Organize menus and category links", icon: Link },
      { id: "theme_setting", title: "Product Page Settings", description: "Control product detail presentation", icon: Package },
    ],
  },
  {
    title: "Orders & Checkout",
    cards: [
      { id: "store_setup", title: "Checkout", description: "Cart, order fields, and validation", icon: ShoppingBag },
      { id: "store_setup", title: "Payments", description: "COD and payment method settings", icon: Banknote },
      { id: "store_setup", title: "Shipping", description: "Delivery zones, rates, and rules", icon: Truck },
      { id: "store_settings", title: "Customer Settings", description: "Accounts, trust, and buyer preferences", icon: Users },
    ],
  },
  {
    title: "Marketing & Advanced",
    cards: [
      { id: "offers", title: "SEO & Marketing", description: "Search, campaigns, and growth tools", icon: Search },
      { id: "info_pages", title: "Policies", description: "Legal pages and customer information", icon: FileText },
      { id: "store_setup", title: "Integrations", description: "Connect tools and external services", icon: Layers },
      { id: "store_setup", title: "Advanced Settings", description: "Technical and operational controls", icon: SettingsIcon },
    ],
  },
] as const;
const statuses = [
  "Pending",
  "Picklist",
  "Pack & AirwayBill",
  "Shipped",
  "Delivered",
  "Cancelled",
];
export function getStepIndex(status: string) {
  const norm = (status || "").trim().toLowerCase();
  if (norm === "cancelled") return -1;
  const idx = pipelineSteps.findIndex(
    (s) => s.id.toLowerCase() === norm || s.aliases.some((a) => a.toLowerCase() === norm)
  );
  return idx !== -1 ? idx : 0;
}

export function getCourierTrackingUrl(courier?: string, trackingNumber?: string) {
  if (!trackingNumber) return "";
  const c = (courier || "").toLowerCase();
  const cleanCn = trackingNumber.trim();
  if (c.includes("trax")) return `https://sonic.trax.pk/tracking?tracking_number=${encodeURIComponent(cleanCn)}`;
  if (c.includes("tcs")) return `https://www.tcsexpress.com/tracking?track=${encodeURIComponent(cleanCn)}`;
  if (c.includes("leopard")) return `https://leopardscourier.com/tracking/`;
  if (c.includes("postex")) return `https://postex.pk/tracking?cn=${encodeURIComponent(cleanCn)}`;
  return `https://www.google.com/search?q=${encodeURIComponent((courier || "courier") + " tracking " + cleanCn)}`;
}

export function timeAgo(dateInput?: string | Date) {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 45) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min${diffInMinutes > 1 ? "s" : ""} ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hr${diffInHours > 1 ? "s" : ""} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "1 day ago";
  if (diffInDays < 30) return `${diffInDays} days ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} mo${diffInMonths > 1 ? "s" : ""} ago`;
}

export function getCustomerHistory(orders: Order[], phone?: string, currentOrderId?: string) {
  if (!phone) return { count: 1, deliveredCount: 0, rtoCount: 0, isFirstOrder: true };
  const clean = phone.replace(/[^0-9]/g, "").slice(-10);
  if (!clean) return { count: 1, deliveredCount: 0, rtoCount: 0, isFirstOrder: true };
  const matching = orders.filter((o) => {
    const op = (o.details?.phone || "").replace(/[^0-9]/g, "").slice(-10);
    return op === clean;
  });
  const count = matching.length;
  const deliveredCount = matching.filter((o) => o.status === "Delivered").length;
  const rtoCount = matching.filter(
    (o) =>
      ["Failed Delivery", "RTO", "Returned", "Refunded"].includes(o.status) ||
      o.details?.csrStatus === "Cancelled by Customer" ||
      o.details?.rtoRisk === "high"
  ).length;
  return {
    count: Math.max(count, 1),
    deliveredCount,
    rtoCount,
    isFirstOrder: count <= 1,
  };
}

export function getOrderExceptions(order: Order, allOrders: Order[]) {
  const exceptions: { type: "duplicate" | "rto" | "incomplete" | "callback"; label: string; bg: string; color: string; border: string }[] = [];
  const cleanPhone = (order.details?.phone || "").replace(/[^0-9]/g, "").slice(-10);
  const orderTime = order.created_at ? new Date(order.created_at).getTime() : 0;

  // Check duplicate (same phone in last 24h)
  const isDuplicate = allOrders.some((o) => {
    if (o.id === order.id) return false;
    const otherPhone = (o.details?.phone || "").replace(/[^0-9]/g, "").slice(-10);
    const otherTime = o.created_at ? new Date(o.created_at).getTime() : 0;
    const isRecent = orderTime > 0 && otherTime > 0 && Math.abs(orderTime - otherTime) < 24 * 60 * 60 * 1000;
    return isRecent && cleanPhone && otherPhone === cleanPhone;
  });
  if (isDuplicate) {
    exceptions.push({ type: "duplicate", label: "⚠️ Possible Duplicate", bg: "#fff7ed", color: "#c2410c", border: "#fdba74" });
  }

  // Check Previous RTO
  const prevRto = allOrders.some((o) => {
    if (o.id === order.id) return false;
    const otherPhone = (o.details?.phone || "").replace(/[^0-9]/g, "").slice(-10);
    return cleanPhone && otherPhone === cleanPhone && (
      ["Failed Delivery", "RTO", "Returned", "Refunded"].includes(o.status) ||
      o.details?.csrStatus === "Cancelled by Customer" ||
      o.details?.rtoRisk === "high"
    );
  });
  if (prevRto || order.details?.rtoRisk === "high") {
    exceptions.push({ type: "rto", label: "⚠️ High RTO Risk", bg: "#fef2f2", color: "#b91c1c", border: "#fca5a5" });
  }

  // Check Address Incomplete
  if (!order.details?.address || order.details.address.trim().length < 12 || !order.details?.city || order.details?.csrStatus === "Address Incomplete") {
    exceptions.push({ type: "incomplete", label: "⚠️ Address Incomplete", bg: "#fefce8", color: "#a16207", border: "#fde047" });
  }

  // Check Callback Overdue
  if (order.details?.csrStatus === "Callback Requested") {
    exceptions.push({ type: "callback", label: "📞 Callback Needed", bg: "#f0f9ff", color: "#0369a1", border: "#7dd3fc" });
  }

  return exceptions;
}

export function getWhatsAppConfirmationMessage(
  order: Order,
  template: "english" | "urdu" | "reminder" | "address" = "urdu",
  storeName = "Cartify Pakistan"
) {
  const itemsText = order.items
    .map(
      (i) =>
        `• ${i.name || i.id} (Qty: ${i.qty}${i.size ? `, Size: ${i.size}` : ""}${i.color ? `, Color: ${i.color}` : ""})`
    )
    .join("\n");
  const totalMoney = `PKR ${order.total.toLocaleString("en-PK")}`;
  const addressText = `${order.details.address}, ${order.details.city}${order.details.province ? `, ${order.details.province}` : ""}`;

  if (template === "urdu") {
    return `السلام علیکم ${order.details.name} صاحب! 🌸

*${storeName}* پر آپ کے آرڈر کا بہت شکریہ!
📦 *آرڈر نمبر:* #${order.id}

📋 *آرڈر کی تفصیلات:*
${itemsText}

💰 *کل رقم (Cash on Delivery):* ${totalMoney}
📍 *ڈیلیوری کا پتہ:* ${addressText}${order.details.landmark ? `\n(مشهور جگہ: ${order.details.landmark})` : ""}

براہ کرم اپنا آرڈر کنفرم کرنے کے لیے اس میسج کا جواب *YES* یا *CONFIRM* لکھ کر دیں۔

شکریہ!
*${storeName} ٹیم*`;
  }

  if (template === "reminder") {
    return `Assalam-o-Alaikum ${order.details.name}! 👋

We tried calling you regarding your order with *${storeName}* (*Order #${order.id}*), but could not connect.

💰 *COD Amount:* ${totalMoney}
📍 *Delivery To:* ${addressText}

Please reply with *CONFIRM* to confirm dispatch of your parcel, or let us know if you need any adjustments.

Thank you!
*${storeName} Team*`;
  }

  if (template === "address") {
    return `Assalam-o-Alaikum ${order.details.name}! 📍

Regarding your *${storeName} Order #${order.id}*:
Please send us your complete delivery address, nearby landmark (مشهور جگہ), and alternate contact number so our courier rider can deliver smoothly without delay.

Current Address: ${order.details.address || "Incomplete"}
City: ${order.details.city}

Thank you!`;
  }

  // Default English template
  return `Assalam-o-Alaikum ${order.details.name}! 🌸

Thank you for shopping with *${storeName}*!
Your Cash on Delivery order is ready for dispatch.

📦 *Order ID:* #${order.id}
📋 *Items:*
${itemsText}
💰 *Total Payable (COD):* ${totalMoney}
📍 *Delivery Address:* ${addressText}${order.details.landmark ? `\nLandmark: ${order.details.landmark}` : ""}

Please reply with *YES* or *CONFIRM* to verify your order for dispatch.

Best regards,
*${storeName} Team*`;
}

export function openWhatsApp(phone: string, text: string) {
  const cleanPhone = phone.replace(/[^0-9]/g, "").replace(/^0/, "92");
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

export function CsrBadge({ status, time }: { status?: CsrStatus; time?: string }) {
  const s = status || "Pending";
  if (s === "Confirmed") {
    return (
      <span className="csr-badge confirmed" title={`Confirmed by CSR at ${time ? new Date(time).toLocaleString("en-PK") : "recently"}`}>
        <CheckCircle2 size={12} /> CSR Confirmed
      </span>
    );
  }
  if (s.startsWith("No Answer")) {
    return (
      <span className="csr-badge no-answer" title="Customer did not answer call">
        <PhoneOff size={12} /> {s}
      </span>
    );
  }
  if (s === "WhatsApp Sent") {
    return (
      <span className="csr-badge whatsapp" title="WhatsApp confirmation message sent">
        <MessageCircle size={12} /> WhatsApp Sent
      </span>
    );
  }
  if (s === "Callback Requested") {
    return (
      <span className="csr-badge callback" title="Customer requested to call later">
        <PhoneForwarded size={12} /> Callback Req.
      </span>
    );
  }
  if (s === "Cancelled by Customer") {
    return (
      <span className="csr-badge cancelled" title="Cancelled or fake order">
        <X size={12} /> Cancelled
      </span>
    );
  }
  if (s === "Address Incomplete") {
    return (
      <span className="csr-badge incomplete" title="Address or contact details incomplete">
        ⚠️ Address Issue
      </span>
    );
  }
  return (
    <span className="csr-badge pending" title="Pending CSR verification call">
      <Clock size={12} /> CSR Pending
    </span>
  );
}
function categoryNamesFromTree(nodes: CategoryNode[] = []) {
  const names = new Set<string>();
  const walk = (items: CategoryNode[]) => {
    for (const item of items) {
      if (item.enabled) names.add(item.name);
      if (item.children?.length) walk(item.children);
    }
  };
  walk(nodes);
  return names.size ? ["All products", ...Array.from(names)] : defaultCategories;
}
const photo = (p: ManagedProduct) => {
  const img = p.image || (p.images && p.images[0]) || "";
  if (!img) return "/images/placeholder.jpg";
  return productImage(img);
};
const imageUrl = (value: string) =>
  /^https?:\/\//.test(value) ? value : "/images/" + value + ".jpg";
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "colour";
const sizeOptionsFor = (product: ManagedProduct) => {
  if ((product as any).variantOptions && Array.isArray((product as any).variantOptions)) {
    const sizeOpt = (product as any).variantOptions.find((o: any) => o.name.toLowerCase() === "size");
    if (sizeOpt && Array.isArray(sizeOpt.values) && sizeOpt.values.length > 0) {
      return sizeOpt.values.filter((s: string) => s && s !== "Standard");
    }
  }
  if (product.sizes?.length) return product.sizes.filter((s) => s && s !== "Standard");
  if (product.variants?.length) {
    const fromVars = Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean))) as string[];
    if (fromVars.length > 0) return fromVars.filter((s) => s && s !== "Standard");
  }
  if (product.sizeStock && Object.keys(product.sizeStock).length > 0) {
    return Object.keys(product.sizeStock).filter((s) => s && s !== "Standard");
  }
  return [];
};
function Choice({
  value,
  onChange,
  items,
  label,
  disabled = false,
}: {
  value: string;
  onChange: (s: string) => void;
  items: string[];
  label: string;
  disabled?: boolean;
}) {
  return (
    <Select disabled={disabled} value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Badge({ status }: { status: string }) {
  const toggleable = ["Active", "Draft"].includes(status);
  return toggleable ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        title={status === "Active" ? "Disable product" : "Enable product"}
        aria-label={status === "Active" ? "Disable product" : "Enable product"}
        className={"admin-badge " + (status === "Active" ? "green" : "gray")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "flex-start",
          width: 48,
          height: 26,
          padding: 3,
          border: 0,
          borderRadius: 999,
          background: status === "Active" ? "#16c96b" : "#aeb7c4",
          cursor: "pointer",
        }}
        onClick={(event) => {
          const row = event.currentTarget.closest("tr");
          const id = row?.querySelector("small")?.textContent?.trim();
          if (id)
            window.dispatchEvent(
              new CustomEvent("product-status-toggle", { detail: { id } }),
            );
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "block",
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 3px #0003",
            transform:
              status === "Active" ? "translateX(20px)" : "translateX(0)",
            transition: "transform 160ms ease",
          }}
        />
      </button>
      <button
        type="button"
        title="Delete product"
        aria-label="Delete product"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          padding: 0,
          border: "1px solid #f0b7b7",
          borderRadius: 6,
          background: "#fff5f5",
          color: "#c43d3d",
          cursor: "pointer",
        }}
        onClick={(event) => {
          const row = event.currentTarget.closest("tr");
          const id = row?.querySelector("small")?.textContent?.trim();
          if (id && window.confirm("Delete this product permanently?"))
            window.dispatchEvent(
              new CustomEvent("product-delete", { detail: { id } }),
            );
        }}
      >
        <Trash2 size={14} />
      </button>
    </span>
  ) : (
    <span
      className={
        "admin-badge " +
        (["Delivered"].includes(status)
          ? "green"
          : status === "Processing"
            ? "blue"
            : "amber")
      }
    >
      {status === "Test order received" ? "Received" : status}
    </span>
  );
}
export default function Admin() {
  const [globalSearch, setGlobalSearch] = useState("");
  const [section, setSection] = useState("overview"),
    [expandedSection, setExpandedSection] = useState<string | null>(null),
    [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>("settings_home"),
    [newOfferTitle, setNewOfferTitle] = useState(""),
    [newOfferTagline, setNewOfferTagline] = useState(""),
    [newOfferType, setNewOfferType] = useState<"percentage" | "fixed" | "bundle">("percentage"),
    [newOfferValue, setNewOfferValue] = useState("10"),
    [newOfferMinQty, setNewOfferMinQty] = useState("2"),
    [newOfferBadge, setNewOfferBadge] = useState("POPULAR"),
    [newCouponCode, setNewCouponCode] = useState(""),
    [newCouponType, setNewCouponType] = useState<"percentage" | "fixed">("percentage"),
    [newCouponValue, setNewCouponValue] = useState("10"),
    [newCouponMinSpend, setNewCouponMinSpend] = useState("1500"),
    [newCouponExpiry, setNewCouponExpiry] = useState(""),
    [selectedInfoPageId, setSelectedInfoPageId] = useState("about"),
    [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All statuses"),
    [categoryFilter, setCategoryFilter] = useState(""),
    [groupStatusFilter, setGroupStatusFilter] = useState(""),
    [stockFilter, setStockFilter] = useState(""),
    [editingProductId, setEditingProductId] = useState<string | null>(null),
    [importDialogOpen, setImportDialogOpen] = useState(false),
    [importUrl, setImportUrl] = useState(""),
    [importBusy, setImportBusy] = useState(false),
    [importedProduct, setImportedProduct] = useState<ManagedProduct | undefined>(undefined),
    [csvDialogOpen, setCsvDialogOpen] = useState(false),
    [csvRows, setCsvRows] = useState<ManagedProduct[]>([]),
    [csvFileName, setCsvFileName] = useState(""),
    [editing, setEditing] = useState<ManagedProduct | null>(null),
    [addColorSource, setAddColorSource] = useState<ManagedProduct | null>(null),
    [imageEditing, setImageEditing] = useState<ManagedProduct | null>(null),
    [priceEditing, setPriceEditing] = useState<ManagedProduct | null>(null),
    [stockEditing, setStockEditing] = useState<ManagedProduct | null>(null),
    [stockHighlightColor, setStockHighlightColor] = useState<string | null>(null),
    [inventoryModalProduct, setInventoryModalProduct] = useState<ManagedProduct | null>(null),
    [inventoryModalTargetColor, setInventoryModalTargetColor] = useState<string | null>(null),
    [stockHistoryModalProduct, setStockHistoryModalProduct] = useState<ManagedProduct | null>(null),
    [stockHistoryVariantSku, setStockHistoryVariantSku] = useState<string | null>(null),
    [stockHistoryVariantColor, setStockHistoryVariantColor] = useState<string | null>(null),
    [stockHistoryVariantSize, setStockHistoryVariantSize] = useState<string | null>(null),
    [removeColorProduct, setRemoveColorProduct] = useState<ManagedProduct | null>(null),
    [removeColorTarget, setRemoveColorTarget] = useState<any | null>(null),
    [expandedColorRows, setExpandedColorRows] = useState<Record<string, boolean>>({}),
    [productVariantFilter, setProductVariantFilter] = useState<Record<string, string>>({}),
    [activeActionDropdown, setActiveActionDropdown] = useState<string | null>(null),
    [expandedVariantLists, setExpandedVariantLists] = useState<Record<string, boolean>>({}),
    [inlinePriceId, setInlinePriceId] = useState<string | null>(null),
    [inlinePriceValue, setInlinePriceValue] = useState(""),
    [inlineColorPriceId, setInlineColorPriceId] = useState<string | null>(null),
    [inlineColorPriceValue, setInlineColorPriceValue] = useState(""),
    [stockValue, setStockValue] = useState(""),
    [stockValues, setStockValues] = useState<Record<string, string>>({}),
    [stockColorChoice, setStockColorChoice] = useState(""),
    [priceValue, setPriceValue] = useState(""),
    [originalPriceValue, setOriginalPriceValue] = useState(""),
    [costPriceValue, setCostPriceValue] = useState(""),
    [offerPriceValue, setOfferPriceValue] = useState(""),
    [offerStartValue, setOfferStartValue] = useState(""),
    [offerEndValue, setOfferEndValue] = useState(""),
    [priceMode, setPriceMode] = useState<"uniform" | "variant" | "offer" | "bundle">("uniform"),
    [variantPrices, setVariantPrices] = useState<Record<string, { price: string; old: string }>>({}),
    [bundleRows, setBundleRows] = useState<Array<{ id: string; quantity: string; totalPrice: string; promo: string; promoArabic: string }>>([]),
    [bundlePriceValues, setBundlePriceValues] = useState(""),
    [isNew, setIsNew] = useState(false),
    [selectedProductIds, setSelectedProductIds] = useState<string[]>([]),
    [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]),
    [selected, setSelected] = useState<Order | null>(null),
    [historyOrder, setHistoryOrder] = useState<Order | null>(null),
    [courierOrder, setCourierOrder] = useState<Order | null>(null),
    [airwayBillOrders, setAirwayBillOrders] = useState<Order[] | null>(null),
    [airwayBillFormat, setAirwayBillFormat] = useState<"thermal" | "a4">("thermal"),
    [airwayWeight, setAirwayWeight] = useState("0.5"),
    [airwayPieces, setAirwayPieces] = useState("1"),
    [courierName, setCourierName] = useState("Trax Logistics"),
    [trackingNumber, setTrackingNumber] = useState(""),
    [status, setStatus] = useState("Pending"),
    [config, setConfig] = useState<Settings | null>(null),
    [saveError, setSaveError] = useState(""),
    [settingsSaved, setSettingsSaved] = useState(false),
    [logoPreviewTheme, setLogoPreviewTheme] = useState<"dark" | "light">("dark"),
    [activeSettingsTab, setActiveSettingsTab] = useState<"all" | "branding" | "shipping" | "support" | "checkout">("all"),
    [orderMainTab, setOrderMainTab] = useState<OrderMainTab>("overview"),
    [orderSubTab, setOrderSubTab] = useState<string>("all"),
    [customerView, setCustomerView] = useState<CustomerView>("all"),
    [csrOrder, setCsrOrder] = useState<Order | null>(null),
    [csrFilter, setCsrFilter] = useState<string>("all"),
    [csrTemplateTab, setCsrTemplateTab] = useState<"english" | "urdu" | "reminder" | "address">("urdu"),
    [csrEditableName, setCsrEditableName] = useState(""),
    [csrEditablePhone, setCsrEditablePhone] = useState(""),
    [csrEditableAltPhone, setCsrEditableAltPhone] = useState(""),
    [csrEditableAddress, setCsrEditableAddress] = useState(""),
    [csrEditableCity, setCsrEditableCity] = useState(""),
    [csrEditableProvince, setCsrEditableProvince] = useState("Punjab"),
    [csrEditableLandmark, setCsrEditableLandmark] = useState(""),
    [csrStatusInput, setCsrStatusInput] = useState<CsrStatus>("Pending"),
    [csrNoteInput, setCsrNoteInput] = useState(""),
    [csrAutoMovePicklist, setCsrAutoMovePicklist] = useState(true),
    [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false),
    [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "7days" | "30days">("all"),
    [cityFilter, setCityFilter] = useState("all"),
    [courierFilter, setCourierFilter] = useState("all"),
    [rtoRiskFilter, setRtoRiskFilter] = useState<"all" | "normal" | "high">("all"),
    [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null),
    [cancelReason, setCancelReason] = useState("Customer changed mind / duplicate order"),
    [cancelCustomNote, setCancelCustomNote] = useState(""),
    [manualOrderModalOpen, setManualOrderModalOpen] = useState(false),
    [manualCustomerName, setManualCustomerName] = useState(""),
    [manualCustomerPhone, setManualCustomerPhone] = useState(""),
    [manualCustomerAltPhone, setManualCustomerAltPhone] = useState(""),
    [manualCustomerAddress, setManualCustomerAddress] = useState(""),
    [manualCustomerCity, setManualCustomerCity] = useState("Lahore"),
    [manualCustomerCustomCity, setManualCustomerCustomCity] = useState(""),
    [manualCustomerProvince, setManualCustomerProvince] = useState("Punjab"),
    [manualCustomerLandmark, setManualCustomerLandmark] = useState(""),
    [manualCustomerSource, setManualCustomerSource] = useState("WhatsApp Order"),
    [manualOrderNote, setManualOrderNote] = useState(""),
    [manualInitialCsrStatus, setManualInitialCsrStatus] = useState<"Confirmed" | "Pending">("Confirmed"),
    [manualOrderItems, setManualOrderItems] = useState<{ id: string; name: string; sku: string; image: string; color: string; size: string; qty: number; unitPrice: number; totalPrice: number }[]>([]),
    [manualProductChoice, setManualProductChoice] = useState(""),
    [manualProductSearch, setManualProductSearch] = useState(""),
    [manualSizeChoice, setManualSizeChoice] = useState("Standard"),
    [manualQtyChoice, setManualQtyChoice] = useState(1),
    [manualCustomDelivery, setManualCustomDelivery] = useState("200"),
    [manualCustomDiscount, setManualCustomDiscount] = useState("0"),
    [manualOpenWhatsappAfter, setManualOpenWhatsappAfter] = useState(true),
    [customerHistoryPhone, setCustomerHistoryPhone] = useState<string | null>(null),
    [historyTimelineOrder, setHistoryTimelineOrder] = useState<Order | null>(null),
    [codSettlementOpen, setCodSettlementOpen] = useState(false),
    [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]),
    [dismissedDuplicateOrderIds, setDismissedDuplicateOrderIds] = useState<string[]>([]),
    [statusFilter, setStatusFilter] = useState("all"),
    [deleteModalOrder, setDeleteModalOrder] = useState<Order | null>(null),
    [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null),
    [createReturnModalOpen, setCreateReturnModalOpen] = useState(false),
    [sourceFilter, setSourceFilter] = useState("all");

  useEffect(() => {
    if (!activeActionDropdown) return;

    const closeMenu = () => setActiveActionDropdown(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    document.addEventListener("click", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeActionDropdown]);

  async function handleCancelOrder(order: Order, reason: string, note?: string) {
    const timestamp = new Date().toISOString();
    const fullNote = reason + (note ? `: ${note}` : "");
    const historyEntry: CsrHistoryEntry = {
      id: Math.random().toString(36).slice(2, 9),
      time: timestamp,
      status: "Cancelled by Customer",
      note: `Cancelled: ${fullNote}`,
      agent: data?.name || "Admin",
    };
    const updatedHistory = [historyEntry, ...(order.details.csrHistory || [])];
    const updatedDetails = {
      ...order.details,
      csrStatus: "Cancelled by Customer" as CsrStatus,
      csrNotes: fullNote,
      csrHistory: updatedHistory,
    };

    const ok = await write({
      action: "order",
      id: order.id,
      status: "Cancelled",
      details: updatedDetails,
      csrStatus: "Cancelled by Customer",
      csrNotes: fullNote,
      csrHistory: updatedHistory,
    });

    if (ok) {
      setData((curr) => curr ? {
        ...curr,
        orders: curr.orders.map((item) => item.id === order.id ? {
          ...item,
          status: "Cancelled",
          details: updatedDetails,
        } : item)
      } : curr);
      toast.success(`Order ${order.id} has been cancelled.`);
      setCancelModalOrder(null);
      if (selected?.id === order.id) {
        setSelected({ ...selected, status: "Cancelled", details: updatedDetails });
      }
    }
  }

  function openCsrModal(order: Order) {
    setCsrOrder(order);
    setCsrEditableName(order.details.name || "");
    setCsrEditablePhone(order.details.phone || "");
    setCsrEditableAltPhone(order.details.alternatePhone || "");
    setCsrEditableAddress(order.details.address || "");
    setCsrEditableCity(order.details.city || "");
    setCsrEditableProvince(order.details.province || "Punjab");
    setCsrEditableLandmark(order.details.landmark || "");
    setCsrStatusInput(order.details.csrStatus || "Pending");
    setCsrNoteInput(order.details.csrNotes || "");
    setCsrAutoMovePicklist(true);
  }

  async function updateCsrStatus(order: Order, newStatus: CsrStatus, note?: string, autoPipeline = false) {
    const timestamp = new Date().toISOString();
    const historyEntry: CsrHistoryEntry = {
      id: Math.random().toString(36).slice(2, 9),
      time: timestamp,
      status: newStatus,
      note: note || (newStatus === "Confirmed" ? "Verified & Confirmed" : `Status updated to ${newStatus}`),
      agent: data?.name || "CSR Agent",
    };
    const updatedHistory = [historyEntry, ...(order.details.csrHistory || [])];
    
    const nextPipelineStatus = (autoPipeline && newStatus === "Confirmed" && ["Pending", "Test order received"].includes(order.status))
      ? "Picklist"
      : newStatus === "Cancelled by Customer" ? "Cancelled" : undefined;

    const payload: any = {
      action: "order",
      id: order.id,
      csrStatus: newStatus,
      csrNotes: note !== undefined ? note : (order.details.csrNotes || ""),
      csrConfirmedAt: newStatus === "Confirmed" ? timestamp : order.details.csrConfirmedAt,
      csrAgent: data?.name || "CSR Agent",
      csrHistory: updatedHistory,
    };
    if (nextPipelineStatus) {
      payload.status = nextPipelineStatus;
    }

    const ok = await write(payload);
    if (ok) {
      setData((curr) => curr ? {
        ...curr,
        orders: curr.orders.map((item) => item.id === order.id ? {
          ...item,
          status: nextPipelineStatus || item.status,
          details: {
            ...item.details,
            csrStatus: newStatus,
            csrNotes: note !== undefined ? note : (item.details.csrNotes || ""),
            csrConfirmedAt: newStatus === "Confirmed" ? timestamp : item.details.csrConfirmedAt,
            csrAgent: data?.name || "CSR Agent",
            csrHistory: updatedHistory,
          }
        } : item)
      } : curr);
      toast.success(`Order ${order.id}: CSR status set to ${newStatus}`);
    }
  }
  const loadSequence = useRef(0);
  const writing = useRef(false);
  async function load() {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setError("");
    try {
      const r = await adminFetch("/api/admin");
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error || 'Unable to load store data.');
      if (sequence !== loadSequence.current) return;
      setData(d);
      setConfig(d.settings);
    } catch (e) {
      if (sequence !== loadSequence.current) return;
      setError(e instanceof Error ? e.message : "Unable to load store data.");
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }
  useEffect(() => {
    function syncNavigation() {
      const params = new URLSearchParams(location.search);
      const sec = params.get('section') || 'overview';
      if (![...sections.map(item => item.id), 'new_product', 'edit_product'].includes(sec)) return;
      setSection(sec);
      setExpandedSection(['products', 'new_product', 'edit_product', 'reviews'].includes(sec) ? 'products' : ['orders', 'settings'].includes(sec) ? sec : null);
      setEditingProductId(params.get('id'));
      const customerTab = params.get('customerTab') as CustomerView | null;
      if (customerTab && ['all', 'returning', 'trusted', 'risk', 'analytics'].includes(customerTab)) setCustomerView(customerTab);
      const tab = params.get('tab');
      if (tab && ['settings_home', 'store_settings', 'store_setup', 'offers', 'coupons', 'info_pages', 'theme_setting', 'categories'].includes(tab)) setSettingsSubTab(tab as SettingsSubTab);
    }
    syncNavigation();
    window.addEventListener('popstate', syncNavigation);
    load();
    return () => { window.removeEventListener('popstate', syncNavigation); ++loadSequence.current; };
  }, []);
  useEffect(() => {
    if (!data) return;
    if ((section === 'settings' && !data.permissions.includes('settings.edit')) || (['orders', 'customers'].includes(section) && !data.permissions.includes('orders.manage'))) {
      setSection('overview');
      setExpandedSection(null);
      history.replaceState(null, '', '/admin');
      toast.error('Your role does not permit this workspace.');
    }
  }, [data?.permissions, section]);
  useEffect(() => {
    if (!priceEditing) return;
    setPriceMode(priceEditing.pricingType === "bundle" || Boolean(priceEditing.bundles?.length) ? "bundle" : "uniform");
  }, [priceEditing]);
  const categoryOptions = categoryNamesFromTree(data?.categories || []);
  useEffect(() => {
    const toggle = (event: Event) => {
      const id = (event as CustomEvent<{ id: string }>).detail?.id;
      const product = data?.products.find((item) => item.id === id);
      if (!product || busy) return;
      const nextStatus = product.status === "Active" ? "Draft" : "Active";
      write({
        action: "product",
        product: { ...product, status: nextStatus },
      }).then((ok) => {
        if (ok) {
          setData((current) =>
            current
              ? {
                  ...current,
                  products: current.products.map((item) =>
                    item.id === id ? { ...item, status: nextStatus } : item,
                  ),
                }
              : current,
          );
          toast.success(
            nextStatus === "Active" ? "Product enabled" : "Product disabled",
          );
        }
      });
    };
    window.addEventListener("product-status-toggle", toggle);
    return () => window.removeEventListener("product-status-toggle", toggle);
  }, [data, busy]);
  useEffect(() => {
    const remove = (event: Event) => {
      const id = (event as CustomEvent<{ id: string }>).detail?.id;
      if (!id || busy) return;
      write({ action: "delete-product", id }).then((ok) => {
        if (ok) {
          setData((current) =>
            current
              ? {
                  ...current,
                  products: current.products.filter((item) => item.id !== id),
                }
              : current,
          );
          toast.success("Product deleted");
        }
      });
    };
    window.addEventListener("product-delete", remove);
    return () => window.removeEventListener("product-delete", remove);
  }, [busy]);
  useEffect(() => {
    if (!data?.role) return;
    const r = data.role.toLowerCase();
    if (r.includes("csr")) {
      setOrderMainTab("new_csr");
      setOrderSubTab("pending");
    } else if (r.includes("warehouse") || r.includes("fulfillment")) {
      setOrderMainTab("fulfillment");
      setOrderSubTab("confirmed");
    } else if (r.includes("shipping")) {
      setOrderMainTab("shipping");
      setOrderSubTab("ready_to_ship");
    } else {
      setOrderMainTab("overview");
      setOrderSubTab("all");
    }
  }, [data?.role]);

  function openManualOrderModal() {
    setManualOrderModalOpen(true);
  }

  function navigate(s: string, optionsOrStatus?: string | { mainTab?: OrderMainTab; subTab?: string; stockFilter?: string; filter?: string; rtoRisk?: "all" | "normal" | "high"; problem?: boolean }) {
    const target = ['categories', 'banners'].includes(s) ? 'settings' : s;
    if (data && ((target === 'settings' && !data.permissions.includes('settings.edit')) || (['orders', 'customers'].includes(target) && !data.permissions.includes('orders.manage')))) {
      toast.error('Your role does not permit this workspace.');
      return;
    }
    const params = new URLSearchParams({ section: target });
    if (s === 'categories') params.set('tab', 'categories');
    if (s === 'banners') params.set('tab', 'theme_setting');
    if (s === 'settings' && typeof optionsOrStatus === 'string') params.set('tab', optionsOrStatus);
    if (s === 'settings' && typeof optionsOrStatus !== 'string') params.set('tab', 'settings_home');
    history.pushState(null, '', '/admin?' + params);
    if (s === "categories") {
      setSection("settings");
      setExpandedSection("settings");
      setSettingsSubTab("categories");
      return;
    }
    if (s === "banners") {
      setSection("settings");
      setExpandedSection("settings");
      setSettingsSubTab("theme_setting");
      return;
    }
    if (s === "settings") {
      setSection("settings");
      setExpandedSection("settings");
      if (typeof optionsOrStatus === "string" && ["settings_home", "store_settings", "store_setup", "offers", "coupons", "info_pages", "theme_setting", "categories"].includes(optionsOrStatus)) {
        setSettingsSubTab(optionsOrStatus as any);
      } else if (typeof optionsOrStatus !== "string") {
        setSettingsSubTab("settings_home");
      }
      return;
    }
    if (s === "orders") {
      setExpandedSection("orders");
    } else if (s === "products" || s === "reviews") {
      setExpandedSection("products");
    } else {
      setExpandedSection(null);
    }
    setSection(s);
    setQuery("");
    setFilter("All statuses");
    setCsrFilter("all");
    setDateFilter("all");
    setCityFilter("all");
    setCourierFilter("all");
    setRtoRiskFilter("all");
    setCategoryFilter("");
    setGroupStatusFilter("");
    setStockFilter("");
    setSaveError("");
    setSettingsSaved(false);

    if (typeof optionsOrStatus === "object" && optionsOrStatus !== null) {
      if (optionsOrStatus.mainTab) setOrderMainTab(optionsOrStatus.mainTab);
      if (optionsOrStatus.subTab) setOrderSubTab(optionsOrStatus.subTab);
      if (optionsOrStatus.stockFilter) setStockFilter(optionsOrStatus.stockFilter);
      if (optionsOrStatus.filter) setFilter(optionsOrStatus.filter);
      if (optionsOrStatus.rtoRisk) setRtoRiskFilter(optionsOrStatus.rtoRisk);
    } else if (typeof optionsOrStatus === "string") {
      const orderFilterStatus = optionsOrStatus;
      if (s === "orders") {
        if (orderFilterStatus === "Pending") {
          setOrderMainTab("new_csr");
          setOrderSubTab("pending");
        } else if (orderFilterStatus === "Picklist") {
          setOrderMainTab("fulfillment");
          setOrderSubTab("picklist");
        } else if (orderFilterStatus === "Pack & AirwayBill" || orderFilterStatus === "Processing") {
          setOrderMainTab("fulfillment");
          setOrderSubTab("packing");
        } else if (orderFilterStatus === "Shipped" || orderFilterStatus === "Dispatched") {
          setOrderMainTab("shipping");
          setOrderSubTab("shipped");
        } else if (orderFilterStatus === "Delivered") {
          setOrderMainTab("completed");
          setOrderSubTab("delivered");
        } else if (orderFilterStatus === "Draft") {
          setFilter("Draft");
        } else {
          setOrderMainTab("overview");
          setOrderSubTab("all");
        }
      } else if (s === "products") {
        if (orderFilterStatus === "Draft" || orderFilterStatus === "Active") {
          setFilter(orderFilterStatus);
        } else if (["In stock", "Low stock", "Out of stock"].includes(orderFilterStatus)) {
          setStockFilter(orderFilterStatus);
        }
      }
    }
  }
  function navigateCustomerView(view: CustomerView) {
    setCustomerView(view);
    setSection("customers");
    setExpandedSection("customers");
    history.pushState(null, "", `/admin?section=customers&customerTab=${encodeURIComponent(view)}`);
  }
  async function write(payload: unknown) {
    if (writing.current) return false;
    writing.current = true;
    setBusy(true);
    setSaveError("");
    try {
      const r = await adminFetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error || 'Unable to save changes.');
      const product = (payload as { product?: ManagedProduct }).product;
      if (product && d.productRevision) {
        product._revision = d.productRevision;
        setData(current => current ? { ...current, products: current.products.map(item => item.id === product.id ? { ...item, _revision: d.productRevision } : item) } : current);
      }
      return d || true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to save changes";
      setSaveError(message);
      toast.error(message);
      return false;
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  function newProduct() {
    setEditingProductId(null);
    setImportedProduct(undefined);
    navigate("new_product");
  }
  async function importListingFromLink() {
    const url = importUrl.trim();
    if (!url) {
      toast.error("Paste a product link first.");
      return;
    }
    setImportBusy(true);
    try {
      const response = await adminFetch("/api/import-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const result = await response.json() as { error?: string; name?: string; description?: string; image?: string; images?: string[]; price?: string; sourceUrl?: string };
      if (!response.ok) throw new Error(result.error || "Unable to import that link.");
      const imported: ManagedProduct = {
        id: `imported-${Date.now()}`,
        name: result.name || "Imported product",
        description: result.description || "",
        category: "",
        subcategory: "",
        price: Number(result.price) || 0,
        old: Number(result.price) || 0,
        image: result.image || "",
        images: result.images || [],
        sourceUrl: result.sourceUrl || url,
        stock: 0,
        status: "Draft",
      } as ManagedProduct;
      setImportedProduct(imported);
      setImportDialogOpen(false);
      setImportUrl("");
      setEditingProductId(null);
      navigate("new_product");
      toast.success("Listing imported. Review the details before saving.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to import that link.");
    } finally {
      setImportBusy(false);
    }
  }
  function parseCsvLine(line: string) {
    const values: string[] = [];
    let value = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"' && quoted) { value += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) { values.push(value.trim()); value = ""; }
      else value += char;
    }
    values.push(value.trim());
    return values;
  }
  function parseCsv(text: string) {
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) throw new Error("CSV must include a header row and at least one product row.");
    const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase().replace(/\s+/g, "_").trim());
    if (!headers.includes("name") || !headers.includes("category") || !headers.includes("price")) {
      throw new Error("CSV headers must include: name, category, price. Optional: subcategory, old, sku, description, image, stock, status.");
    }
    return lines.slice(1).map((line, index) => {
      const values = parseCsvLine(line);
      const row = Object.fromEntries(headers.map((header, position) => [header, values[position] || ""]));
      const name = row.name?.trim();
      const category = row.category?.trim();
      const price = Number(row.price);
      if (!name || !category || !Number.isFinite(price) || price <= 0) throw new Error(`Row ${index + 2}: name, category and a valid price are required.`);
      const id = `${name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-") || "product"}-${Date.now()}-${index}`;
      return {
        id,
        name,
        category,
        subcategory: row.subcategory?.trim() || "General",
        description: row.description?.trim() || "",
        price,
        old: Number(row.old) > 0 ? Number(row.old) : price,
        sku: row.sku?.trim() || undefined,
        image: row.image?.trim() || "",
        images: row.image?.trim() ? [row.image.trim()] : [],
        stock: Number.isFinite(Number(row.stock)) && Number(row.stock) >= 0 ? Math.floor(Number(row.stock)) : 0,
        status: row.status?.toLowerCase() === "active" ? "Active" : "Draft",
      } as ManagedProduct;
    });
  }
  async function readCsv(file: File | undefined) {
    if (!file) return;
    try {
      const rows = parseCsv(await file.text());
      setCsvRows(rows);
      setCsvFileName(file.name);
      toast.success(`${rows.length} product${rows.length === 1 ? "" : "s"} ready to import.`);
    } catch (error) {
      setCsvRows([]);
      setCsvFileName("");
      toast.error(error instanceof Error ? error.message : "Unable to read CSV.");
    }
  }
  async function importCsvRows() {
    if (!csvRows.length || importBusy) return;
    setImportBusy(true);
    const imported: ManagedProduct[] = [];
    try {
      for (const product of csvRows) {
        const result = await write({ action: "product", product });
        if (!result) throw new Error(`Could not import ${product.name}.`);
        imported.push(product);
      }
      setData((current) => current ? { ...current, products: [...current.products, ...imported] } : current);
      setCsvDialogOpen(false);
      setCsvRows([]);
      setCsvFileName("");
      toast.success(`${imported.length} product${imported.length === 1 ? "" : "s"} imported as drafts.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CSV import failed.");
    } finally {
      setImportBusy(false);
    }
  }
  function editProduct(productId: string) {
    setEditingProductId(productId);
    navigate("edit_product");
    history.replaceState(null, '', `/admin?section=edit_product&id=${encodeURIComponent(productId)}`);
  }
  async function deleteProducts(ids: string[]) {
    const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
    if (!uniqueIds.length || busy) return;
    const label = uniqueIds.length === 1 ? "this product" : `${uniqueIds.length} selected products`;
    if (!window.confirm(`Delete ${label} permanently?`)) return;
    for (const id of uniqueIds) {
      const ok = await write({ action: "delete-product", id });
      if (!ok) return;
      setData(current => current ? { ...current, products: current.products.filter(item => item.id !== id) } : current);
      setSelectedProductIds(current => current.filter(item => item !== id));
    }
    setData((current) =>
      current
        ? {
            ...current,
            products: current.products.filter((item) => !uniqueIds.includes(item.id)),
          }
        : current,
    );
    setSelectedProductIds((current) => current.filter((id) => !uniqueIds.includes(id)));
    toast.success(uniqueIds.length === 1 ? "Product deleted" : "Products deleted");
  }

  async function duplicateProduct(product: ManagedProduct) {
    if (busy) return;
    const id = `${product.id}-copy-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 100);
    const copy: ManagedProduct = {
      ...structuredClone(product),
      id,
      name: `${product.name} (Copy)`,
      sku: product.sku ? `${product.sku}-COPY` : undefined,
      status: "Draft",
      variants: product.variants?.map((variant) => ({ ...variant, id: `${variant.id}-copy-${Date.now()}` })),
    };
    if (await write({ action: "product", product: copy })) {
      await load();
      toast.success("Product duplicated as draft");
    }
  }

  async function saveVariantGroupStatus(product: ManagedProduct, status: "Active" | "Draft") {
    const groupId = product.listingGroup || product.id;
    const groupItems = (data?.products || []).filter((item) => (item.listingGroup || item.id) === groupId);
    for (const item of groupItems) {
      const next = { ...item, status };
      if (!(await write({ action: "product", product: next }))) { await load(); return; }
    }
    await load();
    toast.success(`Main & all colour variants ${status === "Active" ? "activated" : "deactivated"}`);
  }

  async function saveProductStatus(product: ManagedProduct, status: "Active" | "Draft") {
    const next = { ...product, status };
    if (!(await write({ action: "product", product: next }))) return false;
    
    // If setting a variant active when parent is draft, activate parent too
    const groupId = product.listingGroup || product.id;
    const groupItems = (data?.products || []).filter((item) => (item.listingGroup || item.id) === groupId);
    if (status === "Active" && product.id !== groupId) {
      const parentItem = groupItems.find(item => item.id === groupId);
      if (parentItem && parentItem.status !== "Active") {
        await write({ action: "product", product: { ...parentItem, status: "Active" } });
      }
    } else if (status === "Draft" && product.id !== groupId) {
      // If all child variants become draft, set parent draft too
      const otherActive = groupItems.filter(item => item.id !== product.id && item.id !== groupId && item.status === "Active");
      if (otherActive.length === 0) {
        const parentItem = groupItems.find(item => item.id === groupId);
        if (parentItem && parentItem.status !== "Draft") {
          await write({ action: "product", product: { ...parentItem, status: "Draft" } });
        }
      }
    }
    await load();
    toast.success(`${product.color || product.name} ${status === "Active" ? "activated" : "deactivated"}`);
    return true;
  }

  async function saveVariantStatus(parent: ManagedProduct, variant: any, status: "Active" | "Draft") {
    if (busy) return false;
    if (parent.variants && parent.variants.length > 0) {
      const vColor = (variant.color || variant.name || "").trim().toLowerCase();
      const updatedVariants = parent.variants.map((v) =>
        (v.color || "").trim().toLowerCase() === vColor ? { ...v, status } : v
      );
      const totalStock = updatedVariants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
      const updatedProduct = {
        ...parent,
        variants: updatedVariants,
        hasVariants: updatedVariants.length > 0,
        stock: totalStock,
      };
      if (await write({ action: "product", product: updatedProduct })) {
        await load();
        toast.success(`${variant.color || variant.name} ${status === "Active" ? "activated" : "deactivated"}`);
        return true;
      }
      return false;
    } else {
      return await saveProductStatus(variant, status);
    }
  }

  async function saveSingleVariantStatus(parent: ManagedProduct, variant: ProductVariant, status: "Active" | "Draft") {
    if (busy || !parent.variants?.length) return;
    const updatedProduct = {
      ...parent,
      variants: parent.variants.map((item) => item.id === variant.id ? { ...item, status } : item),
    };
    if (await write({ action: "product", product: updatedProduct })) {
      await load();
      toast.success(`Variant set to ${status}`);
    }
  }

  async function deleteColorVariant(parent: ManagedProduct, variant: any) {
    if (busy) return;
    const colorName = variant.color || variant.name;
    if (!window.confirm(`Delete "${colorName}" variant from ${parent.name}? This cannot be undone.`)) return;
    if (parent.variants && parent.variants.length > 0) {
      const vColor = (variant.color || variant.name || "").trim().toLowerCase();
      const updatedVariants = parent.variants.filter((v) => (v.color || "").trim().toLowerCase() !== vColor);
      const totalStock = updatedVariants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
      const updatedProduct = {
        ...parent,
        variants: updatedVariants,
        hasVariants: updatedVariants.length > 0,
        stock: totalStock,
      };
      if (await write({ action: "product", product: updatedProduct })) {
        await load();
        toast.success(`Variant ${colorName} deleted`);
      }
    } else {
      await deleteProducts([variant.id]);
    }
  }

  async function handleSaveInventory(updatedProduct: ManagedProduct) {
    if (await write({ action: "product", product: updatedProduct })) {
      await load();
      toast.success("Inventory updated successfully");
      return true;
    }
    return false;
  }

  async function handleDisableColorInstead() {
    if (!removeColorProduct || !removeColorTarget || busy) return;
    const ok = await saveVariantStatus(removeColorProduct, removeColorTarget, "Draft");
    if (ok) {
      setRemoveColorProduct(null);
      setRemoveColorTarget(null);
    }
  }

  async function handleDeleteColorPermanently() {
    if (!removeColorProduct || !removeColorTarget || busy) return;
    const parent = removeColorProduct;
    const variant = removeColorTarget;
    const colorName = variant.color || variant.name;
    if (parent.variants && parent.variants.length > 0) {
      const vColor = (variant.color || variant.name || "").trim().toLowerCase();
      const updatedVariants = (parent.variants || []).filter((v: any) => (v.color || "").trim().toLowerCase() !== vColor);
      const totalStock = updatedVariants.reduce((sum: number, v: any) => sum + Number(v.stock || 0), 0);
      const updatedProduct = {
        ...parent,
        variants: updatedVariants,
        hasVariants: updatedVariants.length > 0,
        stock: totalStock,
      };
      if (await write({ action: "product", product: updatedProduct })) {
        await load();
        toast.success(`Variant ${colorName} permanently removed`);
        setRemoveColorProduct(null);
        setRemoveColorTarget(null);
      }
    } else {
      await deleteProducts([variant.id]);
      setRemoveColorProduct(null);
      setRemoveColorTarget(null);
    }
  }

  async function updateSingleVariantStock(parent: ManagedProduct, variantId: string, newStock: number) {
    if (busy) return;
    const safeStock = Math.max(0, Math.round(newStock));
    if (parent.variants && parent.variants.length > 0) {
      const updatedVariants = parent.variants.map((v) =>
        v.id === variantId ? { ...v, stock: safeStock } : v
      );
      const totalStock = updatedVariants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
      const updatedProduct = {
        ...parent,
        variants: updatedVariants,
        stock: totalStock,
        status: totalStock > 0 ? "Active" : parent.status,
      };
      if (await write({ action: "product", product: updatedProduct })) {
        await load();
        toast.success("Stock updated");
      }
    }
  }
  async function saveInlineProductPrice(product: ManagedProduct) {
    const price = Math.max(0, Math.round(Number(inlinePriceValue)));
    if (!Number.isFinite(price) || !price || busy) return;
    if (await write({ action: "product", product: { ...product, price } })) {
      await load();
      setInlinePriceId(null);
      toast.success("Price updated");
    }
  }
  async function saveInlineColorPrice(parent: ManagedProduct, colorVariant: ManagedProduct) {
    const price = Math.max(0, Math.round(Number(inlineColorPriceValue)));
    if (!Number.isFinite(price) || !price || busy) return;
    const colorName = (colorVariant.color || "").trim().toLowerCase();
    if (parent.variants?.length) {
      const updatedProduct = {
        ...parent,
        variants: parent.variants.map((variant) =>
          (variant.color || "").trim().toLowerCase() === colorName ? { ...variant, price } : variant
        ),
      };
      if (await write({ action: "product", product: updatedProduct })) {
        await load();
        setInlineColorPriceId(null);
        toast.success(`${colorVariant.color} price updated`);
      }
      return;
    }
    const childProduct = products.find((product) => product.id === colorVariant.id);
    if (!childProduct) {
      toast.error(`Could not find the ${colorVariant.color || "colour"} variant to update`);
      return;
    }
    if (await write({ action: "product", product: { ...childProduct, price } })) {
      await load();
      setInlineColorPriceId(null);
      toast.success(`${colorVariant.color || "Colour"} price updated`);
    }
  }
  const orders = data?.orders || [];
  const products = data?.products || [];
  useEffect(() => {
    const addColor = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".product-more")) return;
      const row = target.closest(".product-group-row");
      const sku = row?.querySelector(".product-group-name small")?.textContent?.replace(/^SKU:\s*/, "").trim();
      const source = products.find((item) => (item.sku || item.id) === sku);
      if (!source) return;
      setAddColorSource(source);
    };
    document.addEventListener("click", addColor);
    return () => document.removeEventListener("click", addColor);
  }, [products]);
  const active = products.filter((p) => p.status === "Active").length;
  const pending = orders.filter((o) =>
    ["Pending", "Test order received", "Picklist", "Pack & AirwayBill", "Processing"].includes(o.status),
  );
  const newCsrCount = orders.filter((o) =>
    ["Pending", "Test order received", "New", "Placed"].includes(o.status) ||
    (!o.details.csrStatus || o.details.csrStatus === "Pending") ||
    o.details.csrStatus === "Callback Requested" ||
    o.details.csrStatus?.startsWith("No Answer")
  ).length;
  const fulfillmentCount = orders.filter((o) =>
    o.status === "Picklist" ||
    ["Pack & AirwayBill", "Packing", "Processing", "Ready to Ship"].includes(o.status) ||
    (o.details.csrStatus === "Confirmed" && ["Pending", "Test order received", "New", "Placed"].includes(o.status))
  ).length;
  const packAwbCount = orders.filter((o) =>
    ["Pack & AirwayBill", "Packing", "Processing"].includes(o.status)
  ).length;
  const shippingCount = orders.filter((o) =>
    ["Shipped", "Dispatched", "Out for Delivery", "In Transit"].includes(o.status) ||
    (["Pack & AirwayBill", "Packing", "Processing", "Ready to Ship"].includes(o.status) && !!o.details.trackingNumber)
  ).length;
  const deliveredCount = orders.filter((o) => o.status === "Delivered").length;
  const cancelledCount = orders.filter(
    (o) => o.status === "Cancelled" || o.details.csrStatus === "Cancelled by Customer"
  ).length;
  const returnsRtoCount = orders.filter((o) =>
    ["Failed Delivery", "RTO", "Returned", "Refunded", "On Hold"].includes(o.status) ||
    o.details.rtoRisk === "high" ||
    o.details.returnStatus === "Requested"
  ).length;
  const returnRequests = data?.returns || [];
  const openReturnsCount = returnRequests.filter(
    (r) => r.returnStatus === "Requested" || r.returnStatus === "Received" || r.returnStatus === "In Transit"
  ).length;
  const total = orders
    .filter((o) => o.status !== "Cancelled")
    .reduce((s, o) => s + o.total, 0);
  const customers = Object.values(
    orders.reduce(
      (m, o) => {
        const key = o.details.phone.replace(/^\+92/, "0");
        if (!m[key]) m[key] = { ...o.details, count: 0, total: 0 };
        m[key].count++;
        m[key].total += o.total;
        return m;
      },
      {} as Record<string, Order["details"] & { count: number; total: number }>,
    ),
  );
  const uniqueCities = Array.from(new Set(orders.map((o) => o.details.city).filter(Boolean))).sort();

  const isOrderNeedsAttention = (o: Order) => {
    if (o.status === "Delivered") return false;
    if (o.status === "Cancelled" && o.details.csrStatus === "Cancelled by Customer") return false;
    // 1. CSR Pending or Callback or No Answer
    if (!o.details.csrStatus || o.details.csrStatus === "Pending" || o.details.csrStatus === "Callback Requested" || o.details.csrStatus?.startsWith("No Answer")) return true;
    // 2. Address Problem
    if (o.details.csrStatus === "Address Incomplete" || (o.details.address || "").trim().length < 8) return true;
    // 3. Failed delivery
    if (o.status === "Failed Delivery" || o.details.courierStatus === "Failed Delivery") return true;
    // 4. Return requested
    if (o.status === "Return Requested" || o.details.returnStatus === "Requested") return true;
    // 5. On Hold
    if (o.status === "On Hold") return true;
    // 6. High RTO risk
    if (o.details.rtoRisk === "high") return true;
    return false;
  };

  const filteredOrders = orders.filter((o) => {
    // 1. Two-Tier Tab Filtering
    let matchesTab = true;
    if (orderMainTab === "overview") {
      if (orderSubTab === "csr_confirmation") {
        matchesTab = (!o.details.csrStatus || o.details.csrStatus === "Pending" || o.details.csrStatus === "Callback Requested" || o.details.csrStatus?.startsWith("No Answer")) && o.status !== "Cancelled" && o.status !== "Delivered";
      } else if (orderSubTab === "needs_attention") {
        matchesTab = isOrderNeedsAttention(o);
      } else if (orderSubTab === "cancelled") {
        matchesTab = o.status === "Cancelled" || o.details.csrStatus === "Cancelled by Customer";
      } else if (orderSubTab === "today") {
        if (!o.created_at) matchesTab = false;
        else {
          const orderDate = new Date(o.created_at);
          matchesTab = orderDate.toDateString() === new Date().toDateString();
        }
      } else {
        matchesTab = true;
      }
    } else if (orderMainTab === "new_csr") {
      const cStatus = o.details.csrStatus || "Pending";
      if (orderSubTab === "pending" || orderSubTab === "csr_confirmation") {
        matchesTab = (cStatus === "Pending" || !o.details.csrStatus) && o.status !== "Cancelled";
      } else if (orderSubTab === "callback") {
        matchesTab = cStatus === "Callback Requested";
      } else if (orderSubTab === "no_answer") {
        matchesTab = cStatus.startsWith("No Answer");
      } else if (orderSubTab === "whatsapp") {
        matchesTab = cStatus === "WhatsApp Sent";
      } else if (orderSubTab === "confirmed") {
        matchesTab = cStatus === "Confirmed";
      } else if (orderSubTab === "cancelled") {
        matchesTab = cStatus === "Cancelled by Customer" || o.status === "Cancelled";
      } else {
        matchesTab = true;
      }
    } else if (orderMainTab === "fulfillment") {
      if (orderSubTab === "confirmed") {
        matchesTab = o.details.csrStatus === "Confirmed" && ["Pending", "Test order received", "New", "Placed"].includes(o.status);
      } else if (orderSubTab === "picklist") {
        matchesTab = o.status === "Picklist";
      } else if (orderSubTab === "packing") {
        matchesTab = ["Pack & AirwayBill", "Packing", "Processing"].includes(o.status);
      } else if (orderSubTab === "ready_to_ship") {
        matchesTab = (["Pack & AirwayBill", "Packing", "Processing", "Ready to Ship"].includes(o.status) && !!o.details.trackingNumber) || o.status === "Ready to Ship";
      } else {
        matchesTab = o.status === "Picklist" || ["Pack & AirwayBill", "Packing", "Processing", "Ready to Ship"].includes(o.status) || (o.details.csrStatus === "Confirmed" && ["Pending", "Test order received", "New", "Placed"].includes(o.status));
      }
    } else if (orderMainTab === "shipping") {
      if (orderSubTab === "ready_to_ship") {
        matchesTab = (["Pack & AirwayBill", "Packing", "Processing", "Ready to Ship"].includes(o.status) && !!o.details.trackingNumber) || o.status === "Ready to Ship";
      } else if (orderSubTab === "shipped") {
        matchesTab = ["Shipped", "Dispatched"].includes(o.status);
      } else if (orderSubTab === "in_transit") {
        matchesTab = ["Shipped", "Dispatched", "In Transit"].includes(o.status) || o.details.courierStatus === "In Transit";
      } else if (orderSubTab === "out_for_delivery") {
        matchesTab = o.status === "Out for Delivery" || o.details.courierStatus === "Out for Delivery";
      } else if (orderSubTab === "failed_delivery") {
        matchesTab = o.status === "Failed Delivery" || o.details.courierStatus === "Failed Delivery";
      } else {
        matchesTab = ["Shipped", "Dispatched", "Out for Delivery", "In Transit"].includes(o.status) || (["Pack & AirwayBill", "Packing", "Processing"].includes(o.status) && !!o.details.trackingNumber);
      }
    } else if (orderMainTab === "completed") {
      if (orderSubTab === "delivered") {
        matchesTab = o.status === "Delivered";
      } else if (orderSubTab === "cod_pending") {
        matchesTab = (o.status === "Delivered" && !o.details.codCollected) || (o.status !== "Cancelled" && o.status !== "Delivered");
      } else if (orderSubTab === "cod_collected") {
        matchesTab = o.status === "Delivered" && (o.details.codCollected === true || o.details.paymentStatus === "Paid");
      } else {
        matchesTab = o.status === "Delivered";
      }
    } else if (orderMainTab === "issues_returns") {
      if (orderSubTab === "on_hold") {
        matchesTab = o.status === "On Hold";
      } else if (orderSubTab === "cancelled") {
        matchesTab = o.status === "Cancelled" || o.details.csrStatus === "Cancelled by Customer";
      } else if (orderSubTab === "failed_delivery") {
        matchesTab = o.status === "Failed Delivery" || o.details.courierStatus === "Failed Delivery";
      } else if (orderSubTab === "return_requested") {
        matchesTab = o.status === "Return Requested" || o.details.returnStatus === "Requested";
      } else if (orderSubTab === "returned") {
        matchesTab = o.status === "Returned" || o.details.returnStatus === "Returned";
      } else if (orderSubTab === "rto") {
        matchesTab = o.status === "RTO" || o.details.courierStatus === "RTO" || o.details.rtoRisk === "high";
      } else if (orderSubTab === "refunds") {
        matchesTab = o.status === "Refunded" || o.details.paymentStatus === "Refunded";
      } else {
        matchesTab = ["Failed Delivery", "RTO", "Returned", "Refunded", "On Hold"].includes(o.status) || o.details.rtoRisk === "high" || o.status === "Cancelled" || o.details.csrStatus === "Cancelled by Customer" || o.details.returnStatus === "Requested";
      }
    }

    if (!matchesTab) return false;

    // 2. Date Filter Matching
    if (dateFilter !== "all" && o.created_at) {
      const orderDate = new Date(o.created_at);
      const now = new Date();
      if (dateFilter === "today") {
        if (orderDate.toDateString() !== now.toDateString()) return false;
      } else if (dateFilter === "yesterday") {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (orderDate.toDateString() !== yesterday.toDateString()) return false;
      } else if (dateFilter === "7days") {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (orderDate < sevenDaysAgo) return false;
      } else if (dateFilter === "30days") {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (orderDate < thirtyDaysAgo) return false;
      }
    }

    // 3. City Filter Matching
    if (cityFilter !== "all") {
      if ((o.details.city || "").toLowerCase() !== cityFilter.toLowerCase()) return false;
    }

    // 4. Courier Filter Matching
    if (courierFilter !== "all") {
      const cour = (o.details.courier || "").toLowerCase();
      if (!cour.includes(courierFilter.toLowerCase())) return false;
    }

    // 5. RTO Risk Filter Matching
    if (rtoRiskFilter === "high") {
      if (o.details.rtoRisk !== "high" && !["Failed Delivery", "RTO", "Returned", "Refunded"].includes(o.status)) return false;
    } else if (rtoRiskFilter === "normal") {
      if (o.details.rtoRisk === "high" || ["Failed Delivery", "RTO", "Returned", "Refunded"].includes(o.status)) return false;
    }

    // 6. Universal Query Search
    const q = query.toLowerCase().trim();
    if (q) {
      const haystack = (
        o.id +
        " " +
        o.details.name +
        " " +
        o.details.phone +
        " " +
        (o.details.alternatePhone || "") +
        " " +
        o.details.city +
        " " +
        (o.details.province || "") +
        " " +
        (o.details.address || "") +
        " " +
        (o.details.landmark || "") +
        " " +
        (o.details.courier || "") +
        " " +
        (o.details.trackingNumber || "") +
        " " +
        (o.details.csrNotes || "") +
        " " +
        (o.details.csrStatus || "") +
        " " +
        (o.details.note || "") +
        " " +
        o.items.map((i) => (i.name || "") + " " + (i.sku || "") + " " + (i.color || "") + " " + (i.size || "")).join(" ")
      ).toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
  const orderPage = useAdminPagination(filteredOrders);
  const filteredProducts = products.filter((p) => {
    const matchesStatus = filter === "All statuses" || p.status === filter;
    const matchesCategory = !categoryFilter || p.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchesGroupStatus = !groupStatusFilter || p.status.toLowerCase() === groupStatusFilter.toLowerCase();
    const invStatus = getInventoryStatus(p as any);
    const matchesStock = !stockFilter || (
      stockFilter === "In stock" ? invStatus === "In Stock" :
      stockFilter === "Low stock" ? invStatus === "Low Stock" :
      stockFilter === "Out of stock" ? invStatus === "Out of Stock" : true
    );
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || (p.name + " " + p.category + " " + (p.sku || "") + " " + (p.color || "")).toLowerCase().includes(q);
    return matchesStatus && matchesCategory && matchesGroupStatus && matchesStock && matchesQuery;
  });
  const variantsFor = (product: ManagedProduct) =>
    products
      .filter((item) => (item.listingGroup || item.id) === (product.listingGroup || product.id))
      .filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index);
  const colorVariantsFor = (product: ManagedProduct) => {
    if (product.variants && product.variants.length > 0) {
      const distinctColors = new Map<
        string,
        {
          color: string;
          colorHex?: string;
          images: string[];
          stock: number;
          price?: number;
          sku?: string;
          status?: string;
          sizes: string[];
          sizeStock: Record<string, number>;
          sizeList: Array<{ size: string; stock: number; status?: string; sku?: string }>;
        }
      >();
      for (const v of product.variants) {
        if (!v.color || v.color === "Not applicable") continue;
        const existing = distinctColors.get(v.color);
        const vSize = v.size && v.size !== "Standard" ? v.size : "";
        const vStock = Number(v.stock || 0);

        if (!existing) {
          const sizes = vSize ? [vSize] : [];
          const sizeStock: Record<string, number> = vSize ? { [vSize]: vStock } : {};
          const sizeList = vSize ? [{ size: vSize, stock: vStock, status: v.status || "Active", sku: v.sku }] : [];
          distinctColors.set(v.color, {
            color: v.color,
            colorHex: v.colorHex,
            images: v.images && v.images.length ? v.images : (v.image ? [v.image] : []),
            stock: vStock,
            price: v.price,
            sku: v.sku,
            status: v.status || "Active",
            sizes,
            sizeStock,
            sizeList,
          });
        } else {
          existing.stock += vStock;
          if (vSize && !existing.sizes.includes(vSize)) {
            existing.sizes.push(vSize);
            existing.sizeStock[vSize] = vStock;
            existing.sizeList.push({ size: vSize, stock: vStock, status: v.status || "Active", sku: v.sku });
          } else if (vSize) {
            existing.sizeStock[vSize] = (existing.sizeStock[vSize] || 0) + vStock;
          }
          if ((!existing.images || existing.images.length === 0) && v.images && v.images.length) {
            existing.images = v.images;
          }
        }
      }
      if (distinctColors.size > 0) {
        return Array.from(distinctColors.values()).map((c) => ({
          ...product,
          id: `${product.id}-${c.color}`,
          name: `${product.name} · ${c.color}`,
          color: c.color,
          colorHex: c.colorHex,
          price: c.price,
          sku: c.sku || `${product.sku || product.id}-${c.color.toUpperCase()}`,
          image: getVariantEffectiveImage(product, null, c.color).url || product.image,
          images: getColorGalleryImages(product, c.color),
          stock: c.stock,
          status: c.status || product.status,
          sizes: c.sizes,
          sizeStock: c.sizeStock,
          sizeList: c.sizeList,
        })) as any[];
      }
    }
    const group = product.listingGroup || product.id;
    const variants = variantsFor(product);
    const specificColours = variants.filter(
      (item) => item.id !== group && item.color && item.color !== "Not applicable"
    );
    const targetList = specificColours.length > 0 ? specificColours : variants.filter(
      (item) => item.id !== group && item.color !== "Not applicable"
    );

    return targetList.map((item) => {
      const sizes = sizeOptionsFor(item) as string[];
      const sizeStock: Record<string, number> = item.sizeStock || {};
      const sizeList = sizes.map((sz: string) => ({
        size: sz,
        stock: Number(sizeStock[sz] ?? 0),
        status: item.status,
      }));
      return {
        ...item,
        sizes,
        sizeStock,
        sizeList,
      };
    });
  };
  const openStockEditor = (product: ManagedProduct, targetColor?: string) => {
    setStockEditing(product);
    setStockHighlightColor(targetColor || null);
    setStockColorChoice("");
    setStockValue("");

    const newValues: Record<string, string> = {};

    // Extract only the sizes that were actually configured for THIS product
    const productSizes: string[] = [];
    if ((product as any).variantOptions && Array.isArray((product as any).variantOptions)) {
      const sizeOpt = (product as any).variantOptions.find((o: any) => o.name.toLowerCase() === "size");
      if (sizeOpt && Array.isArray(sizeOpt.values) && sizeOpt.values.length > 0) {
        for (const s of sizeOpt.values) {
          if (s && s !== "Standard" && !productSizes.includes(s)) {
            productSizes.push(s);
          }
        }
      }
    }
    if (productSizes.length === 0 && product.sizes && product.sizes.length > 0) {
      for (const s of product.sizes) {
        if (s && s !== "Standard" && !productSizes.includes(s)) {
          productSizes.push(s);
        }
      }
    }
    if (productSizes.length === 0 && product.variants && product.variants.length > 0) {
      for (const v of product.variants) {
        if (v.size && v.size !== "Standard" && !productSizes.includes(v.size)) {
          productSizes.push(v.size);
        }
      }
    }
    if (productSizes.length === 0 && product.sizeStock && Object.keys(product.sizeStock).length > 0) {
      for (const s of Object.keys(product.sizeStock)) {
        if (s && s !== "Standard" && !productSizes.includes(s)) {
          productSizes.push(s);
        }
      }
    }

    if (product.variants && product.variants.length > 0) {
      const colorMap = new Map<string, { stock: number; sizeStock: Record<string, number> }>();
      for (const v of product.variants) {
        if (!v.color || v.color === "Not applicable") continue;
        const existing = colorMap.get(v.color);
        if (!existing) {
          const sizeStock: Record<string, number> = {};
          if (v.size) sizeStock[v.size] = Number(v.stock || 0);
          colorMap.set(v.color, {
            stock: Number(v.stock || 0),
            sizeStock,
          });
        } else {
          existing.stock += Number(v.stock || 0);
          if (v.size) existing.sizeStock[v.size] = Number(v.stock || 0);
        }
      }

      for (const [cName, info] of colorMap.entries()) {
        newValues[`color:${cName}`] = String(info.stock);
        if (productSizes.length > 0) {
          for (const sz of productSizes) {
            newValues[`color:${cName}:size:${sz}`] = String(info.sizeStock[sz] ?? 0);
          }
        } else {
          for (const [sz, szStock] of Object.entries(info.sizeStock)) {
            newValues[`color:${cName}:size:${sz}`] = String(szStock);
          }
        }
      }
      newValues[product.id] = String(product.stock ?? 0);
    } else {
      const variants = variantsFor(product);
      const effectiveSizes = productSizes.length > 0 ? productSizes : (variants[0] ? sizeOptionsFor(variants[0]) : []);
      for (const item of variants) {
        newValues[item.id] = String((item as any).stock ?? 0);
        for (const size of (effectiveSizes.length > 0 ? effectiveSizes : sizeOptionsFor(item))) {
          newValues[item.id + ":" + size] = String(((item as any).sizeStock || {})[size] ?? "");
        }
      }
    }

    setStockValues(newValues);
  };
  const productRows = Array.from(
    filteredProducts.reduce((map, product) => {
      const group = product.listingGroup || product.id;
      const current = map.get(group);
      if (!current || product.id === group) map.set(group, product);
      return map;
    }, new Map<string, ManagedProduct>()).values(),
  );
  const productPage = useAdminPagination(productRows, 20);
  const productStats = {
    total: productRows.length,
    active: productRows.filter((product) => product.status === "Active").length,
    draft: productRows.filter((product) => product.status === "Draft").length,
    lowStock: productRows.filter((product) => getInventoryStatus(product as any) === "Low Stock").length,
    outOfStock: productRows.filter((product) => getInventoryStatus(product as any) === "Out of Stock").length,
  };

  function AirwayBillSlip({
    order,
    format,
    weight,
    pieces,
    courier,
    trackingNumber,
    storeConfig,
  }: {
    order: Order;
    format: "thermal" | "a4";
    weight: string;
    pieces: string;
    courier: string;
    trackingNumber: string;
    storeConfig?: Settings | null;
  }) {
    const trk = trackingNumber || order.details.trackingNumber || `TRX-${order.id.replace("ZPK-", "")}`;
    const cour = courier || order.details.courier || "Trax Logistics";
    const cityCode = (order.details.city || "PK").slice(0, 3).toUpperCase();
    const totalItemsCount = order.items.reduce((sum, item) => sum + (item.qty || 1), 0);

    return (
      <div className={`airway-bill-sheet ${format}`}>
        {/* Header */}
        <div className="awb-header">
          <div>
            <h2>{storeConfig?.logoText || "CARTIFY PAKISTAN"}</h2>
            <small style={{ fontSize: "10px", color: "#444", display: "block", fontWeight: 600 }}>
              Pakistan E-Commerce COD Express
            </small>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="courier-badge">{cour}</span>
            <div style={{ fontSize: "10px", fontWeight: 700, marginTop: "3px" }}>
              AIRWAY BILL / COD SLIP
            </div>
          </div>
        </div>

        {/* Barcode Block & Routing Destination */}
        <div className="awb-barcode-block">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", padding: "0 6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800 }}>REF: {order.id}</span>
            <span style={{ background: "#000", color: "#fff", padding: "2px 8px", borderRadius: "3px", fontWeight: 900, fontSize: "12px", letterSpacing: "1px" }}>
              DEST: [ {cityCode} ]
            </span>
            <span style={{ fontSize: "10px", color: "#444" }}>
              {new Date(order.created_at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          <div style={{ maxWidth: 260, margin: "0 auto" }}>
            <strong>{trk}</strong>
          </div>
          <div className="tracking-code">CN: {trk}</div>
        </div>

        {/* Consignee & Shipper Info Grid */}
        <div className="awb-grid-two">
          {/* Consignee (Deliver To) */}
          <div className="awb-box">
            <span className="awb-box-title">Deliver To (Consignee)</span>
            <b style={{ fontSize: "12.5px", display: "block", color: "#000" }}>{order.details.name}</b>
            <div style={{ fontSize: "13px", fontWeight: 800, margin: "2px 0", color: "#000" }}>
              📞 {order.details.phone}
            </div>
            <div style={{ fontSize: "10.5px", lineHeight: 1.3, color: "#111" }}>
              {order.details.address}
            </div>
            <div style={{ fontSize: "11px", fontWeight: 700, marginTop: "2px" }}>
              City: {order.details.city}{order.details.province ? `, ${order.details.province}` : ""}, PK
            </div>
            {order.details.landmark && (
              <div style={{ fontSize: "10px", fontStyle: "italic", color: "#333", marginTop: "2px" }}>
                Landmark: {order.details.landmark}
              </div>
            )}
          </div>

          {/* Shipper (Return Address) */}
          <div className="awb-box">
            <span className="awb-box-title">Return If Undelivered To (Shipper)</span>
            <b style={{ fontSize: "11.5px", display: "block" }}>Cartify Pakistan Central Hub</b>
            <div style={{ fontSize: "10px", lineHeight: 1.3, color: "#333", marginTop: "2px" }}>
              Plot 45, Sector 15, Korangi Industrial Area, Karachi, Sindh, Pakistan
            </div>
            <div style={{ fontSize: "10px", fontWeight: 600, marginTop: "3px" }}>
              Support: +92 300 0000000 | info@cartify.pk
            </div>
            <div style={{ fontSize: "10px", fontWeight: 600, marginTop: "2px" }}>
              Pieces: <b>{pieces || String(totalItemsCount)}</b> | Weight: <b>{weight} KG</b>
            </div>
          </div>
        </div>

        {/* Prominent COD Amount Box */}
        <div className="awb-cod-box">
          <div>
            <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px", display: "block" }}>
              Payment Mode: CASH ON DELIVERY
            </span>
            <span style={{ fontSize: "9px", opacity: 0.9 }}>Collect exact amount in PKR before handover</span>
          </div>
          <div className="amount">
            PKR {order.total.toLocaleString("en-PK")}
          </div>
        </div>

        {/* Items Manifest Table */}
        <table className="awb-items-table">
          <thead>
            <tr>
              <th style={{ width: "24px" }}>#</th>
              <th>Item Description</th>
              <th style={{ width: "60px" }}>SKU/Var</th>
              <th style={{ width: "30px", textAlign: "center" }}>Qty</th>
              <th style={{ width: "70px", textAlign: "right" }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>
                  <b>{item.name || item.id}</b>
                  {item.size ? ` (${item.size})` : ""}
                </td>
                <td>{item.sku || item.color || "STD"}</td>
                <td style={{ textAlign: "center" }}>{item.qty}</td>
                <td style={{ textAlign: "right" }}>
                  {item.unitPrice ? money(item.qty * item.unitPrice) : money(order.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Special Instructions & Signatures */}
        <div className="awb-footer">
          <div>
            <b>Special Instructions:</b> {order.details.note || "Handle with Care · Do not open without payment"}
          </div>
          <div style={{ textAlign: "right" }}>
            <span>Customer Sign: ________________</span>
          </div>
        </div>
      </div>
    );
  }

  function getFinalOrderStatus(o: Order): string {
    if (o.status === "Cancelled" || o.details?.csrStatus === "Cancelled by Customer") {
      return "Cancelled";
    }
    if (o.status === "Delivered") {
      return "Delivered";
    }
    if (o.status === "Failed Delivery" || o.details?.courierStatus === "Failed Delivery") {
      return "Failed Delivery";
    }
    if (o.status === "RTO" || o.details?.courierStatus === "RTO") {
      return "RTO";
    }
    if (o.status === "Returned" || o.details?.returnStatus === "Returned") {
      return "Returned";
    }
    if (o.status === "Return Requested" || o.details?.returnStatus === "Requested") {
      return "Return Requested";
    }
    if (o.status === "On Hold") {
      return "On Hold";
    }
    if (["Shipped", "Dispatched", "Out for Delivery", "In Transit"].includes(o.status)) {
      return o.status;
    }
    if (["Pack & AirwayBill", "Packing", "Processing", "Ready to Ship"].includes(o.status)) {
      return o.status;
    }
    if (o.status === "Picklist") {
      return "Picklist";
    }
    if (o.details?.csrStatus === "Confirmed") {
      return "CSR Confirmed";
    }
    if (o.details?.csrStatus && o.details.csrStatus !== "Pending") {
      return o.details.csrStatus;
    }
    return o.status || "Pending";
  }

  function OrderSourceBadge({ source }: { source?: string }) {
    const s = (source || "Web Store").trim();
    const lower = s.toLowerCase();

    let bg = "#f1f5f9";
    let color = "#475569";
    let border = "#e2e8f0";
    let icon = "🌐";
    let label = s;

    if (lower.includes("whatsapp") || lower.includes("wa")) {
      bg = "#dcfce7"; color = "#15803d"; border = "#bbf7d0"; icon = "💬"; label = "WhatsApp";
    } else if (lower.includes("instagram") || lower.includes("insta") || lower.includes("ig")) {
      bg = "#fdf2f8"; color = "#be185d"; border = "#fbcfe8"; icon = "📸"; label = "Instagram";
    } else if (lower.includes("facebook") || lower.includes("fb")) {
      bg = "#eff6ff"; color = "#1d4ed8"; border = "#bfdbfe"; icon = "📘"; label = "Facebook";
    } else if (lower.includes("tiktok") || lower.includes("tt")) {
      bg = "#f8fafc"; color = "#0f172a"; border = "#cbd5e1"; icon = "🎵"; label = "TikTok";
    } else if (lower.includes("phone") || lower.includes("call")) {
      bg = "#fffbeb"; color = "#b45309"; border = "#fde68a"; icon = "📞"; label = "Phone Call";
    } else if (lower.includes("mobile")) {
      bg = "#f0fdfa"; color = "#0f766e"; border = "#99f6e4"; icon = "📱"; label = "Mobile";
    } else if (lower.includes("walk") || lower.includes("counter") || lower.includes("pos")) {
      bg = "#f3f4f6"; color = "#374151"; border = "#e5e7eb"; icon = "🏪"; label = "Walk-in";
    } else if (lower.includes("web") || lower.includes("direct") || lower.includes("online") || lower.includes("store")) {
      bg = "#eef2ff"; color = "#4338ca"; border = "#c7d2fe"; icon = "🌐"; label = "Web";
    }

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2.5px 7.5px",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          background: bg,
          color: color,
          border: `1px solid ${border}`,
          whiteSpace: "nowrap",
        }}
        title={`Order Destination / Channel: ${s}`}
      >
        <span>{icon}</span> {label}
      </span>
    );
  }

  function OrderStatusPill({ status }: { status: string }) {
    const norm = (status || "").toLowerCase();
    let bg = "#f1f5f9";
    let color = "#475569";
    let border = "#e2e8f0";

    if (norm === "pending" || norm === "test order received" || norm === "placed" || norm === "new") {
      bg = "#fef9c3"; color = "#854d0e"; border = "#fef08a";
    } else if (norm.includes("csr confirmed") || norm === "confirmed") {
      bg = "#ecfdf5"; color = "#047857"; border = "#a7f3d0";
    } else if (norm === "picklist") {
      bg = "#eff6ff"; color = "#1d4ed8"; border = "#bfdbfe";
    } else if (norm.includes("pack") || norm === "processing" || norm === "ready to ship") {
      bg = "#f5f3ff"; color = "#6d28d9"; border = "#ddd6fe";
    } else if (norm === "shipped" || norm === "dispatched" || norm === "in transit" || norm === "out for delivery") {
      bg = "#ecfeff"; color = "#0e7490"; border = "#a5f3fc";
    } else if (norm === "delivered") {
      bg = "#dcfce7"; color = "#15803d"; border = "#bbf7d0";
    } else if (norm === "cancelled" || norm.includes("cancelled")) {
      bg = "#fee2e2"; color = "#b91c1c"; border = "#fecaca";
    } else if (norm === "on hold" || norm === "failed delivery" || norm === "rto" || norm.includes("return")) {
      bg = "#fff1f2"; color = "#be123c"; border = "#fecdd3";
    } else if (norm.includes("no answer") || norm.includes("callback")) {
      bg = "#fff7ed"; color = "#c2410c"; border = "#ffedd5";
    }

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "3px 8px",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 700,
          background: bg,
          color: color,
          border: `1px solid ${border}`,
          whiteSpace: "nowrap",
        }}
      >
        {status}
      </span>
    );
  }

  function RecentOrdersTable({
    rows,
    onSelectOrder,
  }: {
    rows: Order[];
    onSelectOrder: (o: Order) => void;
  }) {
    if (!rows.length) {
      return (
        <div style={{ padding: "36px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          <ShoppingBag size={28} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
          <div>No orders in this period.</div>
        </div>
      );
    }

    return (
      <div className="recent-orders-compact-table-wrap">
        <table className="recent-orders-compact-table">
          <thead>
            <tr>
              <th style={{ width: 44, textAlign: "center" }}>#</th>
              <th>Customer Name</th>
              <th>Time</th>
              <th>Payment</th>
              <th>Price</th>
              <th style={{ textAlign: "right" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o, idx) => {
              const finalStatus = getFinalOrderStatus(o);
              const isCancelled = finalStatus === "Cancelled";
              const createdDate = o.created_at ? new Date(o.created_at) : null;
              const relativeAgo = createdDate ? timeAgo(createdDate) : "Just now";

              return (
                <tr
                  key={o.id}
                  onClick={() => onSelectOrder(o)}
                  className="recent-order-row"
                  style={{ cursor: "pointer" }}
                  title={`Order #${o.id} · Click to view full details`}
                >
                  <td style={{ textAlign: "center" }}>
                    <span style={{ fontWeight: 700, color: "#64748b", fontSize: 12.5, background: "#f1f5f9", padding: "2px 7px", borderRadius: 6 }}>
                      {idx + 1}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>
                      {o.details?.name || "Customer"}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11.5, background: "#f1f5f9", color: "#475569", padding: "3px 8px", borderRadius: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                      <Clock size={11} style={{ marginRight: 4, opacity: 0.7 }} />
                      {relativeAgo}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: 6, fontSize: 11.5, fontWeight: 700 }}>
                      COD
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: isCancelled ? "#94a3b8" : "#0f172a" }}>
                      {money(o.total)}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <OrderStatusPill status={finalStatus} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderOrderTable(rows: Order[]) {
    const copyText = async (text: string, label: string) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        toast.success(`${label} copied!`);
      } catch {
        toast.error('Clipboard access is unavailable. Please select and copy the text.');
      }
    };

    const severityStyles: Record<string, { bg: string; color: string; border: string }> = {
      high: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
      medium: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
      low: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
    };

    return rows.length ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "16px 20px" }}>
        {rows.map((o) => {
          const firstItem = o.items[0];
          const prod = products.find((p) => p.id === firstItem?.id);
          const itemImg = firstItem?.image
            ? (firstItem.image.startsWith("http") || firstItem.image.startsWith("/") || firstItem.image.startsWith("data:")
                ? firstItem.image
                : "/images/" + firstItem.image + ".jpg")
            : prod ? photo(prod) : "/images/placeholder.jpg";
          
          const currentStepIdx = getPipelineIndex(o.status);
          const isCancelled = o.status === "Cancelled" || o.details.csrStatus === "Cancelled by Customer";
          const isCsrConfirmed = o.details.csrStatus === "Confirmed";
          const isDelivered = o.status === "Delivered" || o.status === "COD Settled";

          const trackingUrl = getPakistanCourierTrackingUrl(o.details.courier, o.details.trackingNumber);
          const custProfile = analyzeCustomerHistory(o.details.phone, orders as LifecycleOrder[], o.id);
          const isFirstOrder = custProfile.totalOrders <= 1;
          const customerBadge = custProfile.totalOrders <= 1
            ? { label: "New Buyer", tone: "new" }
            : custProfile.returnedOrders > 0 || custProfile.cancelledOrders > 1
              ? { label: "Review Required", tone: "risk" }
              : custProfile.deliverySuccessRate >= 80 && custProfile.deliveredOrders >= 2
                ? { label: "Trusted Buyer", tone: "trusted" }
                : { label: "Returning Buyer", tone: "returning" };
          const exceptions = evaluateOrderNeedsAttention(o as LifecycleOrder, orders as LifecycleOrder[], products);
          const duplicateCheck = detectDuplicateOrder(o as LifecycleOrder, orders as LifecycleOrder[]);
          const nextAction = getNextOrderAction(o as LifecycleOrder, data?.role);

          const createdDate = o.created_at ? new Date(o.created_at) : null;
          const timeFormatted = createdDate && !isNaN(createdDate.getTime())
            ? createdDate.toLocaleDateString("en-PK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
            : "Recent";

          return (
            <div className="order-card-container" key={o.id}>
              {/* Duplicate Order Warning Alert */}
              {duplicateCheck.isDuplicate && !dismissedDuplicateOrderIds.includes(o.id) && (
                <div className="order-duplicate-alert">
                  <div className="order-duplicate-alert-info">
                    <AlertTriangle size={15} style={{ color: "#d97706", flexShrink: 0 }} />
                    <span>
                      <strong>Potential Duplicate Order:</strong> {duplicateCheck.reason}
                    </span>
                  </div>
                  <div className="order-duplicate-alert-actions">
                    {duplicateCheck.matchedOrder && (
                      <button
                        type="button"
                        className="order-duplicate-btn view"
                        onClick={() => {
                          setQuery(duplicateCheck.matchedOrder!.id);
                        }}
                        title="Filter dashboard to inspect the matching duplicate order"
                      >
                        <Eye size={12} /> View Matched Order
                      </button>
                    )}
                    <button
                      type="button"
                      className="order-duplicate-btn dismiss"
                      onClick={() => {
                        setDismissedDuplicateOrderIds((prev) => [...prev, o.id]);
                      }}
                      title="Dismiss this warning and keep processing this order"
                    >
                      <Check size={12} /> Continue / Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Card Top Header */}
              <div className="order-card-header">
                <div className="order-header-left">
                  <input
                    type="checkbox"
                    checked={selectedOrderIds.includes(o.id)}
                    onChange={(e) => {
                      setSelectedOrderIds((curr) =>
                        e.target.checked ? Array.from(new Set([...curr, o.id])) : curr.filter((id) => id !== o.id)
                      );
                    }}
                    style={{ width: 15, height: 15, accentColor: "#203664", cursor: "pointer", flexShrink: 0 }}
                    aria-label={`Select order ${o.id}`}
                  />
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <button
                      type="button"
                      className="order-id-badge"
                      onClick={() => {
                        setSelected(o);
                        setStatus(o.status);
                        setSaveError("");
                      }}
                      title="Click to view and edit full order details"
                    >
                      <b>{o.id}</b>
                    </button>
                    <button
                      type="button"
                      className="copy-btn-mini"
                      onClick={() => copyText(o.id, "Order ID")}
                      title="Copy Order ID"
                    >
                      <Copy size={11} />
                    </button>
                  </div>

                  <span className="order-time-badge" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Clock size={11} style={{ opacity: 0.7 }} />
                    {timeFormatted}
                  </span>
                  <OrderSourceBadge source={o.details.source} />

                  {o.details.trackingNumber && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {trackingUrl && trackingUrl !== "#" ? (
                        <a
                          href={trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="order-cn-badge"
                          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                          title="Open official Courier tracking page"
                        >
                          <Truck size={11} /> {o.details.courier || "Trax"}: {o.details.trackingNumber} <ExternalLink size={9} />
                        </a>
                      ) : (
                        <span className="order-cn-badge" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Truck size={11} /> {o.details.courier || "Trax"}: {o.details.trackingNumber}
                        </span>
                      )}
                      <button
                        type="button"
                        className="copy-btn-mini"
                        onClick={() => copyText(o.details.trackingNumber || "", "Tracking Number")}
                        title="Copy Tracking Number"
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="order-header-right">
                  <span className="order-cod-pill">
                    <Banknote size={12} /> Cash on Delivery
                  </span>
                  <CsrBadge status={o.details.csrStatus} time={o.details.csrConfirmedAt} />
                  <span className="order-price-total">
                    {money(o.total)}
                  </span>
                </div>
              </div>

              {/* Card Main Body */}
              <div className="order-card-body">
                {/* Column 1: Customer & Delivery Address */}
                <div className="order-customer-col">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}>
                    <div className="order-customer-name">
                      <User size={13} style={{ color: "#64748b" }} />
                      <span>{o.details.name}</span>
                      <span className={`customer-order-badge ${customerBadge.tone}`}><i />{customerBadge.label}</span>
                    </div>

                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {isFirstOrder ? (
                        <span className="order-customer-history-tag" title="First time customer on store">
                          1st Order
                        </span>
                      ) : (
                        <span
                          className={`order-customer-history-tag ${custProfile.returnedOrders > 0 ? "risk" : "loyal"}`}
                          title={`${custProfile.totalOrders} lifetime orders · ${custProfile.deliveredOrders} delivered (${custProfile.deliverySuccessRate}% success rate)${custProfile.returnedOrders > 0 ? ` · ${custProfile.returnedOrders} RTO/returned` : ""}`}
                        >
                          {custProfile.totalOrders} Orders · {custProfile.deliveredOrders} Delv{custProfile.returnedOrders > 0 ? ` · ${custProfile.returnedOrders} RTO` : ""}
                        </span>
                      )}
                      <button
                        type="button"
                        className="order-sub-btn"
                        style={{ padding: "2px 7px", fontSize: 10.5, height: "auto" }}
                        onClick={() => setCustomerHistoryPhone(o.details.phone)}
                        title="View full customer lifetime history, past addresses & past ordered products"
                      >
                        <Clock size={10} /> History
                      </button>
                    </div>
                  </div>

                  {/* Smart Warning Exception Badges */}
                  {exceptions.length > 0 && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", margin: "2px 0" }}>
                      {exceptions.map((exc, idx) => {
                        const style = severityStyles[exc.severity] || severityStyles.medium;
                        return (
                          <span
                            key={idx}
                            className="order-exception-pill"
                            style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
                            title={exc.detail}
                          >
                            {exc.label}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="order-phone-row">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Phone size={11} style={{ color: "#64748b" }} />
                      <b>{o.details.phone}</b>
                    </span>
                    <button
                      type="button"
                      className="copy-btn-mini"
                      onClick={() => copyText(o.details.phone, "Phone Number")}
                      title="Copy phone number"
                    >
                      <Copy size={11} />
                    </button>
                    {o.details.alternatePhone && (
                      <span style={{ fontSize: 11, color: "#64748b", background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>
                        Alt: {o.details.alternatePhone}
                      </span>
                    )}
                  </div>

                  <div className="order-address-box">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span className="city-tag" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <MapPin size={11} style={{ color: "#64748b" }} /> {o.details.city}{o.details.province ? `, ${o.details.province}` : ""}, PK
                      </span>
                      <button
                        type="button"
                        className="copy-btn-mini"
                        onClick={() => copyText(`${o.details.name}\n${o.details.phone}\n${o.details.address}, ${o.details.city}${o.details.province ? ", " + o.details.province : ""}`, "Full Delivery Address")}
                        title="Copy full delivery address for rider/courier"
                      >
                        <Copy size={10} /> Copy Address
                      </button>
                    </div>
                    <div style={{ marginTop: 3 }}>
                      {o.details.address || "No street address provided"}
                    </div>
                    {o.details.landmark && (
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        Landmark: {o.details.landmark}
                      </div>
                    )}
                  </div>

                  <div className="order-quick-actions">
                    <a
                      href={`tel:${o.details.phone.replace(/[^0-9+]/g, "")}`}
                      className="csr-btn"
                      title="Call customer via dialer"
                    >
                      <Phone size={12} style={{ color: "#059669" }} /> Call
                    </a>

                    <button
                      type="button"
                      className="csr-btn"
                      title="Send WhatsApp confirmation message in Urdu"
                      onClick={() => {
                        const msg = getWhatsAppConfirmationMessage(o, "urdu", config?.logoText || "Cartify Pakistan");
                        openWhatsApp(o.details.phone, msg);
                      }}
                    >
                      <MessageCircle size={12} style={{ color: "#16a34a" }} /> WhatsApp
                    </button>

                    <button
                      type="button"
                      className="csr-btn"
                      title="Open CSR verification drawer to edit address, log notes, and update verification status"
                      onClick={() => openCsrModal(o)}
                    >
                      <PhoneCall size={12} style={{ color: "#475569" }} /> CSR Confirmation
                    </button>
                  </div>
                </div>

                {/* Column 2: Milestone Stepper (Visual Non-Clickable Display) */}
                <div className="order-stepper-col">
                  <div className="order-stepper-label">
                    <span>Order Progress</span>
                    <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>Pipeline Stage</span>
                  </div>

                  {isCancelled ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 12px", marginTop: 4 }}>
                      <span style={{ color: "#b91c1c", fontWeight: 700, fontSize: 12 }}>❌ Order Cancelled</span>
                      <button
                        type="button"
                        className="admin-secondary"
                        style={{ padding: "4px 10px", fontSize: 11, background: "#ffffff", border: "1px solid #fca5a5", color: "#b91c1c" }}
                        disabled={busy}
                        onClick={async () => {
                          const ok = await write({ action: "order", id: o.id, status: "Pending", csrStatus: "Pending" });
                          if (ok) {
                            setData((curr) => curr ? {
                              ...curr,
                              orders: curr.orders.map((item) => item.id === o.id ? { ...item, status: "Pending", details: { ...item.details, csrStatus: "Pending" } } : item)
                            } : curr);
                            toast.success(`Order ${o.id} restored to Pending`);
                          }
                        }}
                      >
                        <RotateCcw size={12} /> Reactivate
                      </button>
                    </div>
                  ) : (
                    <div className="order-milestone-stepper">
                      {PIPELINE_STAGES.map((step, idx) => {
                        const isCurrent = currentStepIdx === idx;
                        const isPassed = currentStepIdx > idx;
                        const isActive = isCurrent || isPassed;
                        return (
                          <div
                            key={step.id}
                            className={`milestone-step-display ${isActive ? "active" : ""} ${isCurrent ? "current" : ""} ${isPassed ? "passed" : ""}`}
                            title={`Stage: ${step.label}`}
                          >
                            <div className="milestone-circle">
                              {isPassed ? <Check size={13} /> : idx + 1}
                            </div>
                            <span className="milestone-label">{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Stepper Extra Meta Info */}
                  <div className="order-stepper-meta">
                    {o.details.trackingNumber ? (
                      <span className="stepper-meta-item">
                        <Truck size={12} style={{ color: "#64748b" }} /> <b>{o.details.courier || "Trax"}:</b> {o.details.trackingNumber}
                      </span>
                    ) : isCsrConfirmed ? (
                      <span className="stepper-meta-item" style={{ color: "#166534" }}>
                        <CheckCircle2 size={12} style={{ color: "#16a34a" }} /> CSR Verified by {o.details.csrAgent || "CSR Agent"} {o.details.csrConfirmedAt ? `(${new Date(o.details.csrConfirmedAt).toLocaleDateString("en-PK", { month: "short", day: "numeric" })})` : ""}
                      </span>
                    ) : (
                      <span className="stepper-meta-item" style={{ color: "#a16207" }}>
                        <Clock size={12} style={{ color: "#d97706" }} /> Pending customer verification call
                      </span>
                    )}

                    {o.details.note && (
                      <div className="order-stepper-note" title={o.details.note}>
                        💬 <i>"{o.details.note.length > 60 ? o.details.note.slice(0, 57) + "…" : o.details.note}"</i>
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 3: Products & ONE Primary Action */}
                <div className="order-product-col">
                  <div className="order-product-item">
                    <img
                      src={itemImg}
                      alt={firstItem?.name || o.id}
                      className="order-product-img"
                    />
                    <div className="order-product-info">
                      <strong className="order-product-title" title={firstItem?.name || prod?.name || o.id}>
                        {firstItem?.name || prod?.name || firstItem?.sku || o.id}
                      </strong>
                      <span className="order-product-sub">
                        {firstItem?.color ? `Color: ${firstItem.color} · ` : firstItem?.size ? `Size: ${firstItem.size} · ` : ""}
                        Qty: {firstItem?.qty || 1}
                      </span>
                      {o.items.length > 1 && (
                        <div style={{ marginTop: 2 }}>
                          <button
                            type="button"
                            className="multi-item-tag"
                            onClick={() => {
                              setExpandedOrderIds((prev) =>
                                prev.includes(o.id) ? prev.filter((id) => id !== o.id) : [...prev, o.id]
                              );
                            }}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                            title="Toggle all order items list"
                          >
                            {expandedOrderIds.includes(o.id)
                              ? "▲ Collapse items"
                              : `+${o.items.length - 1} more item${o.items.length > 2 ? "s" : ""} (expand)`}
                          </button>
                        </div>
                      )}
                      <div>
                        <span style={{
                          background: "#f1f5f9",
                          color: "#475569",
                          padding: "1px 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 500,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          marginTop: 2,
                        }}>
                          <MapPin size={9} style={{ color: "#64748b" }} /> PK Warehouse
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Item Accordion Dropdown */}
                  {o.items.length > 1 && expandedOrderIds.includes(o.id) && (
                    <div className="order-multi-items-accordion">
                      <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", color: "#64748b", textAlign: "left" }}>
                            <th style={{ padding: "4px 6px" }}>Item</th>
                            <th style={{ padding: "4px 6px" }}>SKU/Var</th>
                            <th style={{ padding: "4px 6px", textAlign: "center" }}>Qty</th>
                            <th style={{ padding: "4px 6px", textAlign: "right" }}>Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {o.items.map((it, idx) => {
                            const itProd = products.find((p) => p.id === it.id);
                            const itImg = it.image
                              ? (it.image.startsWith("http") || it.image.startsWith("/") || it.image.startsWith("data:")
                                  ? it.image
                                  : "/images/" + it.image + ".jpg")
                              : itProd ? photo(itProd) : "/images/placeholder.jpg";
                            return (
                              <tr key={idx} style={{ borderTop: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "4px 6px", display: "flex", alignItems: "center", gap: 6 }}>
                                  <img src={itImg} alt="" style={{ width: 22, height: 22, objectFit: "cover", borderRadius: 4 }} />
                                  <span style={{ fontWeight: 600, color: "#1e293b", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {it.name || itProd?.name || it.id}
                                  </span>
                                </td>
                                <td style={{ padding: "4px 6px", color: "#64748b" }}>
                                  {it.size || it.color || it.sku || "STD"}
                                </td>
                                <td style={{ padding: "4px 6px", textAlign: "center", fontWeight: 700 }}>
                                  {it.qty}
                                </td>
                                <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 600 }}>
                                  {it.unitPrice ? money(it.qty * it.unitPrice) : money(o.total)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Smart ONE Context-Aware Primary Action Button */}
                  <div className="order-smart-actions">
                    {nextAction.actionType === "reactivate" ? (
                      <button
                        type="button"
                        className="order-primary-btn reactivate"
                        disabled={busy}
                        onClick={async () => {
                          const ok = await write({ action: "order", id: o.id, status: "Pending", csrStatus: "Pending" });
                          if (ok) {
                            setData((curr) => curr ? {
                              ...curr,
                              orders: curr.orders.map((item) => item.id === o.id ? { ...item, status: "Pending", details: { ...item.details, csrStatus: "Pending" } } : item)
                            } : curr);
                            toast.success(`Order ${o.id} reactivated to Pending`);
                          }
                        }}
                        title={nextAction.description}
                      >
                        <RotateCcw size={13} /> Reactivate Order
                      </button>
                    ) : nextAction.actionType === "review_return" ? (
                      <button
                        type="button"
                        className="order-primary-btn review-return"
                        onClick={() => {
                          setSelected(o);
                          setStatus(o.status);
                          setSaveError("");
                        }}
                        title={nextAction.description}
                      >
                        <RotateCcw size={13} /> Review Return
                      </button>
                    ) : nextAction.actionType === "resolve_delivery" ? (
                      <button
                        type="button"
                        className="order-primary-btn resolve-delivery"
                        onClick={() => {
                          setCourierOrder(o);
                          setCourierName(o.details.courier || "Trax Logistics");
                          setTrackingNumber(o.details.trackingNumber || `TRX-${o.id.replace("ZPK-", "")}`);
                        }}
                        title={nextAction.description}
                      >
                        <AlertTriangle size={13} /> Resolve Delivery
                      </button>
                    ) : nextAction.actionType === "confirm_csr" ? (
                      <button
                        type="button"
                        className="order-primary-btn confirm"
                        disabled={busy}
                        onClick={() => updateCsrStatus(o, "Confirmed", "Quick verified on call", true)}
                        title={nextAction.description}
                      >
                        <Check size={14} /> Confirm Order
                      </button>
                    ) : nextAction.actionType === "move_picklist" ? (
                      <button
                        type="button"
                        className="order-primary-btn picklist"
                        disabled={busy}
                        onClick={async () => {
                          const ok = await write({ action: "order", id: o.id, status: "Picklist" });
                          if (ok) {
                            setData((curr) => curr ? {
                              ...curr,
                              orders: curr.orders.map((item) => item.id === o.id ? { ...item, status: "Picklist" } : item)
                            } : curr);
                            toast.success(`Order ${o.id} added to Picklist`);
                          }
                        }}
                        title={nextAction.description}
                      >
                        <Package size={14} /> Add to Picklist
                      </button>
                    ) : nextAction.actionType === "start_picking" ? (
                      <button
                        type="button"
                        className="order-primary-btn picklist"
                        disabled={busy}
                        onClick={async () => {
                          const ok = await write({ action: "order", id: o.id, status: "Picking" });
                          if (ok) {
                            setData((curr) => curr ? {
                              ...curr,
                              orders: curr.orders.map((item) => item.id === o.id ? { ...item, status: "Picking" } : item)
                            } : curr);
                            toast.success(`Order ${o.id} moved to Picking`);
                          }
                        }}
                        title={nextAction.description}
                      >
                        <Package size={14} /> Start Picking
                      </button>
                    ) : nextAction.actionType === "start_packing" ? (
                      <button
                        type="button"
                        className="order-primary-btn packing"
                        disabled={busy}
                        onClick={async () => {
                          const ok = await write({ action: "order", id: o.id, status: "Pack & AirwayBill" });
                          if (ok) {
                            setData((curr) => curr ? {
                              ...curr,
                              orders: curr.orders.map((item) => item.id === o.id ? { ...item, status: "Pack & AirwayBill" } : item)
                            } : curr);
                            toast.success(`Order ${o.id} moved to Packing`);
                          }
                        }}
                        title={nextAction.description}
                      >
                        <Package size={14} /> Start Packing
                      </button>
                    ) : nextAction.actionType === "generate_awb" ? (
                      <button
                        type="button"
                        className="order-primary-btn airwaybill"
                        onClick={() => {
                          setAirwayBillOrders([o]);
                          setCourierName(o.details.courier || "Trax Logistics");
                          setTrackingNumber(o.details.trackingNumber || `TRX-${o.id.replace("ZPK-", "")}`);
                        }}
                        title={nextAction.description}
                      >
                        <Printer size={14} /> Generate Airway Bill
                      </button>
                    ) : nextAction.actionType === "mark_ready_to_ship" ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="order-primary-btn shipped"
                          style={{ flex: 1 }}
                          disabled={busy}
                          onClick={async () => {
                            const ok = await write({ action: "order", id: o.id, status: "Ready to Ship" });
                            if (ok) {
                              setData((curr) => curr ? {
                                ...curr,
                                orders: curr.orders.map((item) => item.id === o.id ? { ...item, status: "Ready to Ship" } : item)
                              } : curr);
                              toast.success(`Order ${o.id} marked as Ready to Ship`);
                            }
                          }}
                          title={nextAction.description}
                        >
                          <Package size={14} /> Ready to Ship
                        </button>
                        <button
                          type="button"
                          className="order-sub-btn"
                          style={{ padding: "0 10px" }}
                          onClick={() => {
                            setAirwayBillOrders([o]);
                            setCourierName(o.details.courier || "Trax Logistics");
                            setTrackingNumber(o.details.trackingNumber || `TRX-${o.id.replace("ZPK-", "")}`);
                          }}
                          title="Print Airway Bill label"
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    ) : nextAction.actionType === "mark_shipped" ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="order-primary-btn shipped"
                          style={{ flex: 1 }}
                          disabled={busy}
                          onClick={async () => {
                            const ok = await write({ action: "order", id: o.id, status: "Shipped" });
                            if (ok) {
                              setData((curr) => curr ? {
                                ...curr,
                                orders: curr.orders.map((item) => item.id === o.id ? { ...item, status: "Shipped" } : item)
                              } : curr);
                              toast.success(`Order ${o.id} marked as Shipped`);
                            }
                          }}
                          title={nextAction.description}
                        >
                          <Truck size={14} /> Mark Shipped
                        </button>
                        <button
                          type="button"
                          className="order-sub-btn"
                          style={{ padding: "0 10px" }}
                          onClick={() => {
                            setAirwayBillOrders([o]);
                            setCourierName(o.details.courier || "Trax Logistics");
                            setTrackingNumber(o.details.trackingNumber || `TRX-${o.id.replace("ZPK-", "")}`);
                          }}
                          title="Print Airway Bill label"
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    ) : nextAction.actionType === "mark_delivered" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
                        <button
                          type="button"
                          className="order-primary-btn delivered"
                          disabled={busy}
                          onClick={async () => {
                            const ok = await write({ action: "order", id: o.id, status: "Delivered" });
                            if (ok) {
                              setData((curr) => curr ? {
                                ...curr,
                                orders: curr.orders.map((item) => item.id === o.id ? { ...item, status: "Delivered" } : item)
                              } : curr);
                              toast.success(`Order ${o.id} marked as Delivered!`);
                            }
                          }}
                          title={nextAction.description}
                        >
                          <CheckCircle2 size={14} /> Mark Delivered
                        </button>
                        {trackingUrl && trackingUrl !== "#" && (
                          <a
                            href={trackingUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 11, color: "#2563eb", textAlign: "center", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 2 }}
                            title="Open courier shipment tracking"
                          >
                            Track Shipment <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    ) : nextAction.actionType === "settle_cod" ? (
                      <button
                        type="button"
                        className="order-primary-btn delivered"
                        style={{ background: "#059669", borderColor: "#047857" }}
                        onClick={() => setCodSettlementOpen(true)}
                        title={nextAction.description}
                      >
                        <Banknote size={14} /> Settle COD Remittance
                      </button>
                    ) : isDelivered ? (
                      <div className="order-delivered-pill">
                        <CheckCircle2 size={14} /> Delivered & Collected
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="order-primary-btn picklist"
                        disabled={busy}
                        onClick={async () => {
                          const ok = await write({ action: "order", id: o.id, status: "Picklist" });
                          if (ok) {
                            setData((curr) => curr ? {
                              ...curr,
                              orders: curr.orders.map((item) => item.id === o.id ? { ...item, status: "Picklist" } : item)
                            } : curr);
                            toast.success(`Order ${o.id} added to Picklist`);
                          }
                        }}
                      >
                        <Package size={14} /> Add to Picklist
                      </button>
                    )}

                    {/* Secondary Actions Row */}
                    <div className="order-secondary-btn-row">
                      <button
                        type="button"
                        className="order-sub-btn"
                        onClick={() => {
                          setCourierOrder(o);
                          setCourierName(o.details.courier || "Trax Logistics");
                          setTrackingNumber(o.details.trackingNumber || `TRX-${o.id.replace("ZPK-", "")}`);
                        }}
                        title="Book courier & assign tracking consignment number"
                      >
                        <Truck size={12} style={{ color: "#64748b" }} /> Courier
                      </button>

                      <button
                        type="button"
                        className="order-sub-btn"
                        onClick={() => setHistoryTimelineOrder(o)}
                        title="View chronological status logs and CSR audit timeline"
                      >
                        <Clock size={12} style={{ color: "#64748b" }} /> Timeline
                      </button>

                      <button
                        type="button"
                        className="order-sub-btn"
                        onClick={() => {
                          setSelected(o);
                          setStatus(o.status);
                          setSaveError("");
                        }}
                        title="View and edit full order details drawer"
                      >
                        <SlidersHorizontal size={12} style={{ color: "#64748b" }} /> Details
                      </button>

                      {!isCancelled && (
                        <button
                          type="button"
                          className="order-sub-btn cancel"
                          onClick={() => {
                            setCancelModalOrder(o);
                            setCancelReason("Customer changed mind / duplicate order");
                            setCancelCustomNote("");
                          }}
                          title="Cancel order with reason"
                        >
                          <X size={12} style={{ color: "#dc2626" }} /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="admin-empty">
        <ShoppingBag />
        <h3>No orders found</h3>
        <p>No orders match the selected filters or search criteria.</p>
        <button
          type="button"
          className="admin-secondary"
          onClick={() => {
            setQuery("");
            setFilter("All");
            setCsrFilter("all");
            setDateFilter("all");
            setCityFilter("all");
            setCourierFilter("all");
            setRtoRiskFilter("all");
          }}
        >
          <RotateCcw size={14} /> Clear All Filters
        </button>
      </div>
    );
  }
  const heading =
    section === "settings"
      ? settingsSubTab === "store_settings"
        ? "Store Settings"
        : settingsSubTab === "settings_home"
          ? "Store Settings"
        : settingsSubTab === "store_setup"
          ? "Store Setup"
          : settingsSubTab === "offers"
            ? "Offers & Bundle Deals"
            : settingsSubTab === "coupons"
              ? "Coupons & Discount Vouchers"
              : settingsSubTab === "info_pages"
                ? "Information Pages"
                : settingsSubTab === "theme_setting"
                  ? "Theme Setting · Banner Studio"
                  : "Category Settings"
      : sections.find((s) => s.id === section)?.label || "Dashboard";
  return (
    <SidebarProvider className="admin-shell">
      <Toaster richColors />
      <Sidebar className="admin-sidebar">
        <SidebarHeader className="admin-brand">
          <a href="/admin" className="logo">
            cartify<span>.</span>
            <small>STORE ADMIN</small>
          </a>
        </SidebarHeader>
        <SidebarContent>
          <div className="admin-shop">
            <span>
              <Store size={19} />
            </span>
            <div>
              <b>Cartify Pakistan</b>
              <small>Pakistan · PKR</small>
            </div>
          </div>
          <p className="admin-nav-label">WORKSPACE</p>
          <SidebarMenu>
            {sections
              .filter(
                (s) =>
                  !s.hidden &&
                  (!data ||
                    s.id === "overview" ||
                    s.id === "products" ||
                    (s.id === "settings"
                      ? data.permissions.includes("settings.edit")
                      : data.permissions.includes("orders.manage"))),
              )
              .map((s) => {
                const isSettings = s.id === "settings";
                const isProducts = s.id === "products";
                const isOrders = s.id === "orders";
                const isCustomers = s.id === "customers";
                const hasSubmenu = isSettings || isProducts || isOrders || isCustomers;
                const isExpanded = expandedSection === s.id;
                const isCurrentActive = section === s.id || (isProducts && section === "reviews");

                return (
                  <SidebarMenuItem key={s.id}>
                    <SidebarMenuButton
                      isActive={isCurrentActive}
                      style={
                        isSettings && (section === "settings" || isExpanded)
                          ? {
                              background: "#f3f2ff",
                              color: "#614cff",
                              fontWeight: 700,
                            }
                          : undefined
                      }
                      onClick={() => {
                        if (hasSubmenu) {
                          if (isExpanded) {
                            // Clicking currently open section collapses it
                            setExpandedSection(null);
                          } else {
                            // Open only this section, closing all other accordion sections
                            setExpandedSection(s.id);
                            if (section !== s.id && !(isProducts && section === "reviews")) {
                              navigate(s.id);
                            }
                          }
                        } else {
                          // Standalone section (Overview, Customers, etc.): close any open accordion
                          setExpandedSection(null);
                          navigate(s.id);
                        }
                      }}
                    >
                      <s.icon
                        size={18}
                        style={
                          isSettings && (section === "settings" || isExpanded)
                            ? { color: "#614cff" }
                            : undefined
                        }
                      />
                      <span
                        style={
                          isSettings && (section === "settings" || isExpanded)
                            ? { color: "#614cff", fontWeight: 700 }
                            : undefined
                        }
                      >
                        {s.label}
                      </span>
                      {isProducts && (
                        <ChevronDown
                          className={`admin-submenu-chevron ${isExpanded ? "expanded" : ""}`}
                          size={14}
                        />
                      )}
                      {isOrders && (
                        <>
                          {orders.length > 0 && (
                            <b className="admin-count" style={{ marginLeft: "auto", marginRight: 4 }}>
                              {orders.length}
                            </b>
                          )}
                          <ChevronDown
                            className={`admin-submenu-chevron ${isExpanded ? "expanded" : ""}`}
                            size={14}
                            style={{
                              marginLeft: orders.length > 0 ? 0 : "auto",
                            }}
                          />
                        </>
                      )}
                      {isSettings && (
                        <ChevronDown
                          className={`admin-submenu-chevron ${isExpanded ? "expanded" : ""}`}
                          size={14}
                          style={{
                            marginLeft: "auto",
                            color: section === "settings" || isExpanded ? "#614cff" : undefined,
                          }}
                        />
                      )}
                      {isCustomers && <ChevronDown className={`admin-submenu-chevron ${isExpanded ? "expanded" : ""}`} size={14} style={{ marginLeft: "auto" }} />}
                    </SidebarMenuButton>

                    {isProducts && (
                      <div className={`admin-accordion-collapse ${isExpanded ? "expanded" : ""}`}>
                        <div className="admin-accordion-inner">
                          <div className="admin-product-submenu">
                            <button
                              type="button"
                              className={section === "products" ? "active" : ""}
                              onClick={() => {
                                setExpandedSection("products");
                                navigate("products");
                              }}
                            >
                              <span>My Products</span>
                            </button>
                            <button
                              type="button"
                              className={section === "new_product" ? "active" : ""}
                              onClick={() => {
                                setExpandedSection("products");
                                newProduct();
                              }}
                            >
                              <span>Add My Product</span>
                            </button>
                            <button
                              type="button"
                              className={section === "reviews" ? "active" : ""}
                              onClick={() => {
                                setExpandedSection("products");
                                navigate("reviews");
                              }}
                            >
                              <span>Reviews</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedSection("products");
                                navigate("products");
                              }}
                            >
                              <span>Brands</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {isOrders && (
                      <div className={`admin-accordion-collapse ${isExpanded ? "expanded" : ""}`}>
                        <div className="admin-accordion-inner">
                          <div className="admin-product-submenu">
                            <button
                              type="button"
                              className={section === "orders" && orderMainTab === "overview" && orderSubTab === "all" ? "active" : ""}
                              onClick={() => {
                                setExpandedSection("orders");
                                navigate("orders");
                                setOrderMainTab("overview");
                                setOrderSubTab("all");
                              }}
                            >
                              <span>All Orders</span>
                            </button>
                            <button
                              type="button"
                              className={section === "orders" && orderMainTab === "new_csr" ? "active" : ""}
                              onClick={() => {
                                setExpandedSection("orders");
                                navigate("orders");
                                setOrderMainTab("new_csr");
                                setOrderSubTab("csr_confirmation");
                              }}
                            >
                              <span>New &amp; CSR</span>
                              {newCsrCount > 0 && <span className="admin-sub-badge">{newCsrCount}</span>}
                            </button>
                            <button
                              type="button"
                              className={section === "orders" && orderMainTab === "fulfillment" && orderSubTab !== "packing" ? "active" : ""}
                              onClick={() => {
                                setExpandedSection("orders");
                                navigate("orders");
                                setOrderMainTab("fulfillment");
                                setOrderSubTab("confirmed");
                              }}
                            >
                              <span>Fulfillment</span>
                              {fulfillmentCount > 0 && <span className="admin-sub-badge">{fulfillmentCount}</span>}
                            </button>
                            <button
                              type="button"
                              className={section === "orders" && orderMainTab === "fulfillment" && orderSubTab === "packing" ? "active" : ""}
                              onClick={() => {
                                setExpandedSection("orders");
                                navigate("orders");
                                setOrderMainTab("fulfillment");
                                setOrderSubTab("packing");
                              }}
                            >
                              <span>Pack &amp; Airway Bill</span>
                              {packAwbCount > 0 && <span className="admin-sub-badge">{packAwbCount}</span>}
                            </button>
                            <button
                              type="button"
                              className={section === "orders" && orderMainTab === "shipping" ? "active" : ""}
                              onClick={() => {
                                setExpandedSection("orders");
                                navigate("orders");
                                setOrderMainTab("shipping");
                                setOrderSubTab("ready_to_ship");
                              }}
                            >
                              <span>Shipping</span>
                              {shippingCount > 0 && <span className="admin-sub-badge">{shippingCount}</span>}
                            </button>
                            <button
                              type="button"
                              className={section === "orders" && orderMainTab === "completed" ? "active" : ""}
                              onClick={() => {
                                setExpandedSection("orders");
                                navigate("orders");
                                setOrderMainTab("completed");
                                setOrderSubTab("delivered");
                              }}
                            >
                              <span>Delivered</span>
                              {deliveredCount > 0 && <span className="admin-sub-badge">{deliveredCount}</span>}
                            </button>
                            <button
                              type="button"
                              className={section === "orders" && orderMainTab === "issues_returns" && orderSubTab === "cancelled" ? "active" : ""}
                              onClick={() => {
                                setExpandedSection("orders");
                                navigate("orders");
                                setOrderMainTab("issues_returns");
                                setOrderSubTab("cancelled");
                              }}
                            >
                              <span>Cancelled</span>
                              {cancelledCount > 0 && <span className="admin-sub-badge">{cancelledCount}</span>}
                            </button>
                            <button
                              type="button"
                              className={section === "orders" && orderMainTab === "returns" ? "active" : ""}
                              onClick={() => {
                                setExpandedSection("orders");
                                navigate("orders");
                                setOrderMainTab("returns");
                              }}
                            >
                              <span>Returns &amp; Refunds</span>
                              {openReturnsCount > 0 && <span className="admin-sub-badge">{openReturnsCount}</span>}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {isCustomers && (
                      <div className={`admin-accordion-collapse ${isExpanded ? "expanded" : ""}`}>
                        <div className="admin-accordion-inner">
                          <div className="admin-product-submenu">
                            {([['all', 'All Customers'], ['returning', 'Returning Buyers'], ['trusted', 'Trusted Buyers'], ['risk', 'High-Risk Buyers'], ['analytics', 'Customer Analytics']] as [CustomerView, string][]).map(([id, label]) => (
                              <button key={id} type="button" className={section === "customers" && customerView === id ? "active" : ""} onClick={() => navigateCustomerView(id)}><span>{label}</span></button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {isSettings && (
                      <div className={`admin-accordion-collapse ${isExpanded ? "expanded" : ""}`}>
                        <div className="admin-accordion-inner">
                          <div className="admin-settings-submenu">
                            <button
                              type="button"
                              className={section === "settings" && settingsSubTab === "store_setup" ? "active" : ""}
                              onClick={() => {
                                setExpandedSection("settings");
                                setSection("settings");
                                setSettingsSubTab("store_setup");
                              }}
                            >
                              <span>Store setup</span>
                            </button>
                            <button
                              type="button"
                              className={section === "settings" && settingsSubTab === "offers" ? "active" : ""}
                              onClick={() => {
                                setExpandedSection("settings");
                                setSection("settings");
                                setSettingsSubTab("offers");
                              }}
                            >
                              <span>Offers</span>
                            </button>
                            <button
                              type="button"
                              className={section === "settings" && settingsSubTab === "coupons" ? "active" : ""}
                              onClick={() => {
                                setExpandedSection("settings");
                                setSection("settings");
                                setSettingsSubTab("coupons");
                              }}
                            >
                              <span>Coupons</span>
                            </button>
                            <button
                              type="button"
                              className={section === "settings" && settingsSubTab === "info_pages" ? "active" : ""}
                              onClick={() => {
                                setExpandedSection("settings");
                                setSection("settings");
                                setSettingsSubTab("info_pages");
                              }}
                            >
                              <span>Information Pages</span>
                            </button>
                            <button
                              type="button"
                              className={section === "settings" && settingsSubTab === "theme_setting" ? "active" : ""}
                              onClick={() => {
                                setExpandedSection("settings");
                                setSection("settings");
                                setSettingsSubTab("theme_setting");
                              }}
                            >
                              <span>Theme setting</span>
                            </button>
                            <button
                              type="button"
                              className={section === "settings" && settingsSubTab === "categories" ? "active" : ""}
                              onClick={() => {
                                setExpandedSection("settings");
                                setSection("settings");
                                setSettingsSubTab("categories");
                              }}
                            >
                              <span>Category Settings</span>
                              <ChevronDown size={14} style={{ color: "#8b96aa", marginLeft: "auto" }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </SidebarMenuItem>
                );
              })}
          </SidebarMenu>
          <a className="admin-visit" href="/admin/team">
            <ShieldCheck size={18} />
            Team & access
          </a>
          <a className="admin-visit" href="/admin/your-stores">
            <Store size={18} />
            Your Stores
          </a>
          <div className="admin-sidebar-note">
            <ShieldCheck size={21} />
            <b>Your private workspace</b>
            <p>Access is controlled by your assigned role.</p>
          </div>
        </SidebarContent>
        <SidebarFooter>
          <a className="admin-visit" href="/admin/login?mode=change">
            <ShieldCheck size={16} />
            Change password
          </a>
          <Logout />
          <a className="admin-visit" href="/">
            View storefront <ExternalLink size={16} />
          </a>
          <div className="admin-person">
            <span>YA</span>
            <div>
              <b>{data?.name || "Store team"}</b>
              <small>{data?.role.replaceAll("_", " ") || "Signed in"}</small>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <div className="admin-main">
        <div className="admin-topbar">
          <div>
            <SidebarTrigger />
            <span className="seller-avatar">C</span>
            <div className="seller-greeting">
              <small>Cartify Pakistan</small>
              <b>Good morning, {data?.name || "store team"}</b>
            </div>
          </div>
          <div className="seller-global-search">
            <Search size={16} />
            <input
              aria-label="Search store"
              placeholder="Search orders, products, customers…"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setGlobalSearch("");
              }}
            />
            {globalSearch.trim() && (
              <div className="seller-search-results">
                {products
                  .filter((p) =>
                    p.name.toLowerCase().includes(globalSearch.toLowerCase()),
                  )
                  .slice(0, 4)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setEditing(p);
                        setIsNew(false);
                        setSaveError("");
                        setGlobalSearch("");
                      }}
                    >
                      <Package size={15} />
                      <span>
                        {p.name}
                        <small>Product · {money(p.price)}</small>
                      </span>
                    </button>
                  ))}
                {orders
                  .filter((o) =>
                    (o.id + " " + o.details.name + " " + o.details.phone)
                      .toLowerCase()
                      .includes(globalSearch.toLowerCase()),
                  )
                  .slice(0, 4)
                  .map((o) => (
                    <button
                      key={o.id}
                      onClick={() => {
                        setSelected(o);
                        setStatus(o.status);
                        setSaveError("");
                        setGlobalSearch("");
                      }}
                    >
                      <ShoppingBag size={15} />
                      <span>
                        {o.details.name}
                        <small>
                          {o.id} · {money(o.total)}
                        </small>
                      </span>
                    </button>
                  ))}
                {!products.some((p) =>
                  p.name.toLowerCase().includes(globalSearch.toLowerCase()),
                ) &&
                  !orders.some((o) =>
                    (o.id + " " + o.details.name + " " + o.details.phone)
                      .toLowerCase()
                      .includes(globalSearch.toLowerCase()),
                  ) && <p>No matching orders or products</p>}
              </div>
            )}
          </div>
          <a href="/account" className="admin-preview-label">
            My account
          </a>
        </div>
        <div className="admin-content">
          <div
            className={
              "admin-heading " +
              (section === "overview" ? "seller-dashboard-heading" : "") +
              (section === "settings" && settingsSubTab === "settings_home" ? " settings-home-page-heading" : "")
            }
          >
            <div>
              <span className="admin-overline">CARTIFY PAKISTAN</span>
              <h1>{section === "overview" ? "Dashboard" : heading}</h1>
              <p>
                {section === "overview"
                  ? "Your daily view of orders, products and store performance."
                  : section === "orders"
                    ? "Manage, verify, and fulfill orders with real-time CSR verification and courier tracking."
                    : section === "products"
                      ? "Create, edit and organise your storefront collection."
                      : section === "reviews"
                        ? "Add customer reviews manually and manage approval status."
                      : section === "customers"
                        ? "Customer details from saved orders."
                      : section === "settings"
                        ? settingsSubTab === "settings_home"
                          ? "Choose a workspace to manage your storefront and business preferences."
                          : settingsSubTab === "store_settings"
                          ? "Manage store branding, custom logo, tagline, and customer support contact details."
                          : settingsSubTab === "store_setup"
                            ? "Configure Pakistan delivery charges, free delivery threshold, and Cash on Delivery payment rules."
                            : settingsSubTab === "offers"
                              ? "Create automatic checkout discounts, bundle volume deals, and promotional campaigns."
                              : settingsSubTab === "coupons"
                                ? "Manage promo discount codes and discount vouchers for customer checkout."
                                : settingsSubTab === "info_pages"
                                  ? "Edit customer service policies, About Us, Shipping policy, Return policy, and Terms."
                                  : settingsSubTab === "theme_setting"
                                    ? "Manage hero banner carousel slides, autoplay speed, and promotional banner cards."
                          : "Organize storefront navigation menus and product category taxonomy."
                        : "Manage store settings."}
              </p>
            </div>
            <div className="admin-heading-actions">
              <button
                className="admin-icon"
                aria-label="Refresh store data"
                onClick={load}
                disabled={loading || busy}
              >
                <RefreshCw size={18} />
              </button>
              {section === "orders" && (
                <button
                  className="admin-primary"
                  onClick={openManualOrderModal}
                  disabled={!data || busy}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#16a34a" }}
                >
                  <Plus size={17} />
                  Place Manual Order
                </button>
              )}
              {["overview", "products"].includes(section) && (
                <button
                  className="admin-primary"
                  onClick={newProduct}
                  disabled={!data}
                >
                  <Plus size={17} />
                  Add product
                </button>
              )}
              {["overview", "products"].includes(section) && (
                <button
                  className="admin-secondary"
                  onClick={() => setImportDialogOpen(true)}
                  disabled={!data || importBusy}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
                >
                  <Link size={16} />
                  Import from link
                </button>
              )}
              {["overview", "products"].includes(section) && (
                <button
                  className="admin-secondary"
                  onClick={() => setCsvDialogOpen(true)}
                  disabled={!data || importBusy}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
                >
                  <Upload size={16} />
                  Import CSV
                </button>
              )}
            </div>
          </div>
          {error ? (
            <div className="admin-error" role="alert">
              <h2>We couldn’t load your store</h2>
              <p>{error}</p>
              <button className="admin-primary" onClick={load}>
                Try again
              </button>
            </div>
          ) : loading && !data ? (
            <div className="admin-stats">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-36 w-full" />
              ))}
            </div>
          ) : (
            data && (
              <>
                {section === "overview" && (
                  <Overview
                    orders={orders}
                    products={products}
                    canOrders={data.permissions.includes("orders.manage")}
                    navigate={(s, opts) => {
                      navigate(s, opts);
                    }}
                    edit={(p) => {
                      setEditing(p);
                      setIsNew(false);
                      setSaveError("");
                    }}
                    table={(rows) => (
                      <RecentOrdersTable
                        rows={rows}
                        onSelectOrder={(o) => setSelected(o)}
                      />
                    )}
                  />
                )}
                {section === "reviews" && (
                  <Reviews products={products} onSave={async (product) => {
                    const ok = await write({ action: "product", product });
                    if (ok) setData((current) => current ? { ...current, products: current.products.map((item) => item.id === product.id ? product : item) } : current);
                    return ok;
                  }} />
                )}
                {section === "orders" && (
                  <div className="admin-card">
                    {/* Live Clickable 6 Top Order KPI Summary Cards */}
                    <div className="order-kpi-strip">
                      <button
                        type="button"
                        className={`order-kpi-pill ${orderMainTab === "overview" && orderSubTab === "all" ? "active" : ""}`}
                        onClick={() => { setOrderMainTab("overview"); setOrderSubTab("all"); }}
                      >
                        <span>📦 Total Orders:</span>
                        <span className="order-kpi-count">{orders.length}</span>
                      </button>

                      <button
                        type="button"
                        className={`order-kpi-pill ${orderMainTab === "new_csr" && orderSubTab === "pending" ? "active" : ""}`}
                        onClick={() => { setOrderMainTab("new_csr"); setOrderSubTab("pending"); }}
                        style={{ borderColor: "#fde047", background: orderMainTab === "new_csr" && orderSubTab === "pending" ? "#fefce8" : undefined }}
                      >
                        <span>🟡 Needs CSR Call:</span>
                        <span className="order-kpi-count" style={{ color: "#ca8a04" }}>
                          {orders.filter((o) => (!o.details.csrStatus || o.details.csrStatus === "Pending") && o.status !== "Cancelled").length}
                        </span>
                      </button>

                      <button
                        type="button"
                        className={`order-kpi-pill ${orderMainTab === "fulfillment" && orderSubTab === "ready_to_ship" ? "active" : ""}`}
                        onClick={() => { setOrderMainTab("fulfillment"); setOrderSubTab("ready_to_ship"); }}
                        style={{ borderColor: "#86efac", background: orderMainTab === "fulfillment" && orderSubTab === "ready_to_ship" ? "#f0fdf4" : undefined }}
                      >
                        <span>📦 Ready to Ship:</span>
                        <span className="order-kpi-count" style={{ color: "#16a34a" }}>
                          {orders.filter((o) => (["Pack & AirwayBill", "Packing", "Processing", "Ready to Ship"].includes(o.status) && !!o.details.trackingNumber) || o.status === "Ready to Ship").length}
                        </span>
                      </button>

                      <button
                        type="button"
                        className={`order-kpi-pill ${orderMainTab === "shipping" && orderSubTab === "shipped" ? "active" : ""}`}
                        onClick={() => { setOrderMainTab("shipping"); setOrderSubTab("shipped"); }}
                        style={{ borderColor: "#93c5fd", background: orderMainTab === "shipping" && orderSubTab === "shipped" ? "#eff6ff" : undefined }}
                      >
                        <span>🚚 Shipped:</span>
                        <span className="order-kpi-count" style={{ color: "#2563eb" }}>
                          {orders.filter((o) => ["Shipped", "Dispatched", "In Transit", "Out for Delivery"].includes(o.status)).length}
                        </span>
                      </button>

                      <button
                        type="button"
                        className={`order-kpi-pill ${orderMainTab === "completed" && orderSubTab === "delivered" ? "active" : ""}`}
                        onClick={() => { setOrderMainTab("completed"); setOrderSubTab("delivered"); }}
                        style={{ borderColor: "#c4b5fd", background: orderMainTab === "completed" && orderSubTab === "delivered" ? "#f5f3ff" : undefined }}
                      >
                        <span>✅ Delivered:</span>
                        <span className="order-kpi-count" style={{ color: "#7c3aed" }}>
                          {orders.filter((o) => o.status === "Delivered").length}
                        </span>
                      </button>

                      <button
                        type="button"
                        className={`order-kpi-pill ${orderMainTab === "issues_returns" && orderSubTab === "cancelled" ? "active" : ""}`}
                        onClick={() => { setOrderMainTab("issues_returns"); setOrderSubTab("cancelled"); }}
                        style={{ borderColor: "#fca5a5", background: orderMainTab === "issues_returns" && orderSubTab === "cancelled" ? "#fef2f2" : undefined }}
                      >
                        <span>❌ Cancelled:</span>
                        <span className="order-kpi-count" style={{ color: "#dc2626" }}>
                          {cancelledCount}
                        </span>
                      </button>

                      <button
                        type="button"
                        className={`order-kpi-pill ${orderMainTab === "completed" && orderSubTab === "cod_pending" ? "active" : ""}`}
                        onClick={() => setCodSettlementOpen(true)}
                        style={{ marginLeft: "auto", background: orderMainTab === "completed" && orderSubTab === "cod_pending" ? "#f8fafc" : undefined }}
                        title="Open COD Remittance Reconciliation & Settlement Manager"
                      >
                        <span style={{ color: "#64748b", fontWeight: 600 }}>💰 Settle COD:</span>
                        <span className="order-kpi-count" style={{ color: "#059669" }}>
                          {money(
                            orders
                              .filter((o) => o.status === "Delivered" || o.status === "COD Settled")
                              .reduce((sum, o) => sum + calculateCodBreakdown(o as any).remainingAmount, 0)
                          )}
                        </span>
                      </button>
                    </div>

                    {/* Tier 1 Main Orders Tabs */}
                    <div className="orders-main-tabs">
                      {[
                        { id: "overview" as OrderMainTab, label: "Overview", icon: ShoppingBag, count: orders.length },
                        { id: "new_csr" as OrderMainTab, label: "New & CSR", icon: PhoneCall, count: orders.filter((o) => ["Pending", "Test order received", "New", "Placed"].includes(o.status) || (!o.details.csrStatus || o.details.csrStatus === "Pending") || o.details.csrStatus === "Callback Requested" || o.details.csrStatus?.startsWith("No Answer")).length },
                        { id: "fulfillment" as OrderMainTab, label: "Fulfillment", icon: Package, count: orders.filter((o) => o.status === "Picklist" || ["Pack & AirwayBill", "Packing", "Processing", "Ready to Ship"].includes(o.status) || (o.details.csrStatus === "Confirmed" && ["Pending", "Test order received", "New", "Placed"].includes(o.status))).length },
                        { id: "shipping" as OrderMainTab, label: "Shipping", icon: Truck, count: orders.filter((o) => ["Shipped", "Dispatched", "Out for Delivery", "In Transit"].includes(o.status) || (["Pack & AirwayBill", "Packing", "Processing", "Ready to Ship"].includes(o.status) && !!o.details.trackingNumber)).length },
                        { id: "completed" as OrderMainTab, label: "Completed", icon: CheckCircle2, count: orders.filter((o) => o.status === "Delivered").length },
                        { id: "issues_returns" as OrderMainTab, label: "Issues & Returns", icon: AlertTriangle, count: orders.filter((o) => ["Failed Delivery", "RTO", "Returned", "Refunded", "On Hold"].includes(o.status) || o.details.rtoRisk === "high" || o.status === "Cancelled" || o.details.csrStatus === "Cancelled by Customer" || o.details.returnStatus === "Requested").length },
                        { id: "returns" as OrderMainTab, label: "Returns & Refunds", icon: RotateCcw, count: returnRequests.length },
                      ].map((tab) => {
                        const TabIcon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            className={`orders-main-tab ${orderMainTab === tab.id ? "active" : ""}`}
                            onClick={() => {
                              setOrderMainTab(tab.id);
                              const currentSubs: Record<OrderMainTab, string[]> = {
                                overview: ["all", "csr_confirmation", "needs_attention", "cancelled", "today"],
                                new_csr: ["all", "csr_confirmation", "callback", "no_answer", "whatsapp", "confirmed", "cancelled"],
                                fulfillment: ["confirmed", "picklist", "packing", "ready_to_ship"],
                                shipping: ["ready_to_ship", "shipped", "in_transit", "out_for_delivery", "failed_delivery"],
                                completed: ["delivered", "cod_pending", "cod_collected"],
                                issues_returns: ["on_hold", "cancelled", "failed_delivery", "return_requested", "returned", "rto", "refunds"],
                                returns: ["all"],
                              };
                              const available = currentSubs[tab.id];
                              if (available && !available.includes(orderSubTab)) {
                                setOrderSubTab(available[0]);
                              }
                            }}
                          >
                            <TabIcon size={14} />
                            {tab.label}
                            <span className="badge">{tab.count}</span>
                          </button>
                        );
                      })}
                    </div>

                    {orderMainTab === "returns" ? (
                      <ReturnsView
                        returns={returnRequests}
                        onSelectReturn={(ret) => setSelectedReturn(ret)}
                        onOpenCreateReturn={() => setCreateReturnModalOpen(true)}
                        busy={busy}
                      />
                    ) : (
                      <>
                        {/* Tier 2 Secondary Sub-Tabs (Dynamic based on selected main tab) */}
                        <div className="orders-sub-tabs">
                      {orderMainTab === "overview" && [
                        { id: "all", label: "All Orders", count: orders.length },
                        { id: "csr_confirmation", label: "📞 CSR Confirmation", count: orders.filter((o) => (!o.details.csrStatus || o.details.csrStatus === "Pending" || o.details.csrStatus === "Callback Requested" || o.details.csrStatus?.startsWith("No Answer")) && o.status !== "Cancelled" && o.status !== "Delivered").length },
                        { id: "needs_attention", label: "⚠️ Needs Attention", count: orders.filter(isOrderNeedsAttention).length },
                        { id: "cancelled", label: "❌ Cancelled", count: cancelledCount },
                        { id: "today", label: "📅 Today's Orders", count: orders.filter((o) => o.created_at && new Date(o.created_at).toDateString() === new Date().toDateString()).length },
                      ].map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          className={`orders-sub-tab ${orderSubTab === sub.id ? "active" : ""}`}
                          onClick={() => setOrderSubTab(sub.id)}
                        >
                          {sub.label}
                          <span className="badge">{sub.count}</span>
                        </button>
                      ))}

                      {orderMainTab === "new_csr" && [
                        { id: "all", label: "All Orders", count: orders.length },
                        { id: "csr_confirmation", label: "📞 CSR Confirmation (Pending)", count: orders.filter((o) => (!o.details.csrStatus || o.details.csrStatus === "Pending") && o.status !== "Cancelled").length },
                        { id: "callback", label: "🔵 Callback", count: orders.filter((o) => o.details.csrStatus === "Callback Requested").length },
                        { id: "no_answer", label: "🟠 No Answer", count: orders.filter((o) => o.details.csrStatus?.startsWith("No Answer")).length },
                        { id: "whatsapp", label: "🟣 WhatsApp Sent", count: orders.filter((o) => o.details.csrStatus === "WhatsApp Sent").length },
                        { id: "confirmed", label: "🟢 Confirmed", count: orders.filter((o) => o.details.csrStatus === "Confirmed").length },
                        { id: "cancelled", label: "⚫ Cancelled", count: orders.filter((o) => o.details.csrStatus === "Cancelled by Customer" || o.status === "Cancelled").length },
                      ].map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          className={`orders-sub-tab ${orderSubTab === sub.id ? "active" : ""}`}
                          onClick={() => setOrderSubTab(sub.id)}
                        >
                          {sub.label}
                          <span className="badge">{sub.count}</span>
                        </button>
                      ))}

                      {orderMainTab === "fulfillment" && [
                        { id: "confirmed", label: "Confirmed (Ready for Picklist)", count: orders.filter((o) => o.details.csrStatus === "Confirmed" && ["Pending", "Test order received", "New", "Placed"].includes(o.status)).length },
                        { id: "picklist", label: "Picklist", count: orders.filter((o) => o.status === "Picklist").length },
                        { id: "packing", label: "Pack & Airway Bill", count: orders.filter((o) => ["Pack & AirwayBill", "Packing", "Processing"].includes(o.status)).length },
                        { id: "ready_to_ship", label: "Ready to Ship", count: orders.filter((o) => (["Pack & AirwayBill", "Packing", "Processing", "Ready to Ship"].includes(o.status) && !!o.details.trackingNumber) || o.status === "Ready to Ship").length },
                      ].map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          className={`orders-sub-tab ${orderSubTab === sub.id ? "active" : ""}`}
                          onClick={() => setOrderSubTab(sub.id)}
                        >
                          {sub.label}
                          <span className="badge">{sub.count}</span>
                        </button>
                      ))}

                      {orderMainTab === "shipping" && [
                        { id: "ready_to_ship", label: "Ready to Ship", count: orders.filter((o) => (["Pack & AirwayBill", "Packing", "Processing", "Ready to Ship"].includes(o.status) && !!o.details.trackingNumber) || o.status === "Ready to Ship").length },
                        { id: "shipped", label: "Shipped", count: orders.filter((o) => ["Shipped", "Dispatched"].includes(o.status)).length },
                        { id: "in_transit", label: "In Transit", count: orders.filter((o) => ["Shipped", "Dispatched", "In Transit"].includes(o.status) || o.details.courierStatus === "In Transit").length },
                        { id: "out_for_delivery", label: "Out for Delivery", count: orders.filter((o) => o.status === "Out for Delivery" || o.details.courierStatus === "Out for Delivery").length },
                        { id: "failed_delivery", label: "Failed Delivery", count: orders.filter((o) => o.status === "Failed Delivery" || o.details.courierStatus === "Failed Delivery").length },
                      ].map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          className={`orders-sub-tab ${orderSubTab === sub.id ? "active" : ""}`}
                          onClick={() => setOrderSubTab(sub.id)}
                        >
                          {sub.label}
                          <span className="badge">{sub.count}</span>
                        </button>
                      ))}

                      {orderMainTab === "completed" && [
                        { id: "delivered", label: "Delivered", count: orders.filter((o) => o.status === "Delivered").length },
                        { id: "cod_pending", label: "COD Pending", count: orders.filter((o) => (o.status === "Delivered" && !o.details.codCollected) || (o.status !== "Cancelled" && o.status !== "Delivered")).length },
                        { id: "cod_collected", label: "COD Collected", count: orders.filter((o) => o.status === "Delivered" && (o.details.codCollected === true || o.details.paymentStatus === "Paid")).length },
                      ].map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          className={`orders-sub-tab ${orderSubTab === sub.id ? "active" : ""}`}
                          onClick={() => setOrderSubTab(sub.id)}
                        >
                          {sub.label}
                          <span className="badge">{sub.count}</span>
                        </button>
                      ))}

                      {orderMainTab === "issues_returns" && [
                        { id: "on_hold", label: "On Hold", count: orders.filter((o) => o.status === "On Hold").length },
                        { id: "cancelled", label: "Cancelled", count: orders.filter((o) => o.status === "Cancelled" || o.details.csrStatus === "Cancelled by Customer").length },
                        { id: "failed_delivery", label: "Failed Delivery", count: orders.filter((o) => o.status === "Failed Delivery" || o.details.courierStatus === "Failed Delivery").length },
                        { id: "return_requested", label: "Return Requested", count: orders.filter((o) => o.status === "Return Requested" || o.details.returnStatus === "Requested").length },
                        { id: "returned", label: "Returned", count: orders.filter((o) => o.status === "Returned" || o.details.returnStatus === "Returned").length },
                        { id: "rto", label: "RTO", count: orders.filter((o) => o.status === "RTO" || o.details.courierStatus === "RTO" || o.details.rtoRisk === "high").length },
                        { id: "refunds", label: "Refunds", count: orders.filter((o) => o.status === "Refunded" || o.details.paymentStatus === "Refunded").length },
                      ].map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          className={`orders-sub-tab ${orderSubTab === sub.id ? "active" : ""}`}
                          onClick={() => setOrderSubTab(sub.id)}
                        >
                          {sub.label}
                          <span className="badge">{sub.count}</span>
                        </button>
                      ))}
                    </div>

                    {/* CSR Confirmation Section Info Banner */}
                    {(orderSubTab === "csr_confirmation" || (orderMainTab === "new_csr" && orderSubTab === "pending")) && (
                      <div style={{
                        margin: "12px 20px 0",
                        padding: "12px 18px",
                        background: "#fffbeb",
                        border: "1px solid #fef08a",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 22 }}>📞</span>
                          <div>
                            <strong style={{ color: "#92400e", fontSize: 13, display: "block" }}>
                              CSR Order Confirmation & Verification Section
                            </strong>
                            <span style={{ color: "#b45309", fontSize: 11.5 }}>
                              Verify customer details, items, address & COD amount over call/WhatsApp before dispatching to warehouse picklist.
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#92400e", background: "#fef3c7", padding: "4px 10px", borderRadius: 6, border: "1px solid #fde68a" }}>
                            🟡 Pending Call: <b>{orders.filter((o) => (!o.details.csrStatus || o.details.csrStatus === "Pending") && o.status !== "Cancelled").length}</b>
                          </span>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#1e40af", background: "#eff6ff", padding: "4px 10px", borderRadius: 6, border: "1px solid #bfdbfe" }}>
                            🔵 Callback: <b>{orders.filter((o) => o.details.csrStatus === "Callback Requested").length}</b>
                          </span>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#6b21a8", background: "#faf5ff", padding: "4px 10px", borderRadius: 6, border: "1px solid #e9d5ff" }}>
                            🟣 WhatsApp: <b>{orders.filter((o) => o.details.csrStatus === "WhatsApp Sent").length}</b>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Universal Search & Collapsible Advanced Filters */}
                    <div className="orders-toolbar-container">
                      <div className="admin-toolbar" style={{ borderBottom: "none", paddingBottom: advancedFiltersOpen ? 10 : undefined }}>
                        <div className="admin-search" style={{ flex: 1 }}>
                          <Search size={18} />
                          <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by customer name, phone, city, address, order ID, or product/SKU…"
                            aria-label="Search orders"
                          />
                          {query && (
                            <button
                              type="button"
                              onClick={() => setQuery("")}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}
                              title="Clear search query"
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          className="admin-primary"
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12, fontWeight: 700, background: "#16a34a" }}
                          onClick={openManualOrderModal}
                          disabled={!data || busy}
                        >
                          <Plus size={14} /> Place Manual Order
                        </button>

                        <button
                          type="button"
                          className="admin-secondary"
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600 }}
                          onClick={() => exportOrdersToCSV(filteredOrders as LifecycleOrder[])}
                          title="Export displayed orders to Excel / CSV"
                        >
                          <FileText size={14} /> Export CSV
                        </button>

                        <button
                          type="button"
                          className={`admin-secondary ${advancedFiltersOpen || dateFilter !== "all" || cityFilter !== "all" || courierFilter !== "all" || rtoRiskFilter !== "all" ? "active-filter-btn" : ""}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600 }}
                          onClick={() => setAdvancedFiltersOpen((prev) => !prev)}
                        >
                          <Filter size={15} />
                          <span>Filters</span>
                          {(dateFilter !== "all" || cityFilter !== "all" || courierFilter !== "all" || rtoRiskFilter !== "all") && (
                            <span className="active-filter-dot" />
                          )}
                          <ChevronDown size={14} style={{ transform: advancedFiltersOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
                        </button>

                        {(query || dateFilter !== "all" || cityFilter !== "all" || courierFilter !== "all" || rtoRiskFilter !== "all" || orderMainTab !== "overview" || orderSubTab !== "all") && (
                          <button
                            type="button"
                            className="admin-secondary"
                            style={{ padding: "8px 12px", fontSize: 12, color: "#dc2626", borderColor: "#fca5a5" }}
                            onClick={() => {
                              setQuery("");
                              setOrderMainTab("overview");
                              setOrderSubTab("all");
                              setDateFilter("all");
                              setCityFilter("all");
                              setCourierFilter("all");
                              setRtoRiskFilter("all");
                            }}
                            title="Reset all filters"
                          >
                            <RotateCcw size={13} /> Reset
                          </button>
                        )}
                      </div>

                      {/* Collapsible Advanced Filters Panel */}
                      {advancedFiltersOpen && (
                        <div className="advanced-filters-panel">
                          <div className="filter-group">
                            <label>📅 Date Preset:</label>
                            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as any)}>
                              <option value="all">All Dates</option>
                              <option value="today">Today</option>
                              <option value="yesterday">Yesterday</option>
                              <option value="7days">Last 7 Days</option>
                              <option value="30days">Last 30 Days</option>
                            </select>
                          </div>

                          <div className="filter-group">
                            <label>📍 Destination City:</label>
                            <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                              <option value="all">All Cities ({uniqueCities.length})</option>
                              {uniqueCities.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          <div className="filter-group">
                            <label>🚚 Courier Partner:</label>
                            <select value={courierFilter} onChange={(e) => setCourierFilter(e.target.value)}>
                              <option value="all">All Couriers</option>
                              <option value="trax">Trax Logistics</option>
                              <option value="tcs">TCS Express</option>
                              <option value="leopard">Leopards Courier</option>
                              <option value="postex">PostEx</option>
                              <option value="rider">Direct Rider / Self</option>
                            </select>
                          </div>

                          <div className="filter-group">
                            <label>⚠️ RTO / Fraud Risk:</label>
                            <select value={rtoRiskFilter} onChange={(e) => setRtoRiskFilter(e.target.value as any)}>
                              <option value="all">All Risk Levels</option>
                              <option value="normal">Normal Orders</option>
                              <option value="high">High Risk / Returned</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Contextual Bulk Action Floating Bar (Only shown when 1+ selected) */}
                    {selectedOrderIds.length > 0 && (
                      <div className="bulk-action-floating-bar">
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className="bulk-select-count">
                            ✓ <b>{selectedOrderIds.length}</b> {selectedOrderIds.length === 1 ? "order" : "orders"} selected
                          </span>
                          <button
                            type="button"
                            className="bulk-deselect-btn"
                            onClick={() => setSelectedOrderIds([])}
                          >
                            Deselect All
                          </button>
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <button
                            type="button"
                            className="bulk-action-btn csr"
                            disabled={busy}
                            onClick={async () => {
                              const nowStr = new Date().toISOString();
                              for (const id of selectedOrderIds) {
                                const target = orders.find((o) => o.id === id);
                                if (target) {
                                  const historyEntry: CsrHistoryEntry = {
                                    id: Math.random().toString(36).slice(2, 9),
                                    time: nowStr,
                                    status: "Confirmed",
                                    note: "Bulk CSR Verified",
                                    agent: data?.name || "CSR Agent",
                                  };
                                  const saved = await write({
                                    action: "order",
                                    id,
                                    csrStatus: "Confirmed",
                                    csrConfirmedAt: nowStr,
                                    csrAgent: data?.name || "CSR Agent",
                                    csrHistory: [historyEntry, ...(target.details.csrHistory || [])],
                                  });
                                  if (!saved) { await load(); return; }
                                }
                              }
                              setData((curr) => curr ? {
                                ...curr,
                                orders: curr.orders.map((o) => selectedOrderIds.includes(o.id) ? {
                                  ...o,
                                  details: {
                                    ...o.details,
                                    csrStatus: "Confirmed",
                                    csrConfirmedAt: nowStr,
                                    csrAgent: data?.name || "CSR Agent",
                                  }
                                } : o)
                              } : curr);
                              toast.success(`${selectedOrderIds.length} orders marked as CSR Confirmed`);
                              setSelectedOrderIds([]);
                            }}
                          >
                            <CheckCircle2 size={14} /> Bulk CSR Confirm ({selectedOrderIds.length})
                          </button>

                          <button
                            type="button"
                            className="bulk-action-btn picklist"
                            disabled={busy}
                            onClick={async () => {
                              for (const id of selectedOrderIds) {
                                if (!(await write({ action: "order", id, status: "Picklist" }))) { await load(); return; }
                              }
                              setData((curr) => curr ? {
                                ...curr,
                                orders: curr.orders.map((o) => selectedOrderIds.includes(o.id) ? { ...o, status: "Picklist" } : o)
                              } : curr);
                              toast.success(`${selectedOrderIds.length} orders moved to Picklist`);
                              setSelectedOrderIds([]);
                            }}
                          >
                            <Package size={14} /> Add to Picklist ({selectedOrderIds.length})
                          </button>

                          <button
                            type="button"
                            className="bulk-action-btn print"
                            onClick={() => {
                              const selectedList = orders.filter((o) => selectedOrderIds.includes(o.id));
                              setAirwayBillOrders(selectedList);
                            }}
                          >
                            <Printer size={14} /> Print Airway Bills ({selectedOrderIds.length})
                          </button>

                          <button
                            type="button"
                            className="bulk-action-btn shipped"
                            disabled={busy}
                            onClick={async () => {
                              for (const id of selectedOrderIds) {
                                if (!(await write({ action: "order", id, status: "Shipped" }))) { await load(); return; }
                              }
                              setData((curr) => curr ? {
                                ...curr,
                                orders: curr.orders.map((o) => selectedOrderIds.includes(o.id) ? { ...o, status: "Shipped" } : o)
                              } : curr);
                              toast.success(`${selectedOrderIds.length} orders marked as Shipped`);
                              setSelectedOrderIds([]);
                            }}
                          >
                            <Truck size={14} /> Mark Shipped ({selectedOrderIds.length})
                          </button>

                          <button
                            type="button"
                            className="bulk-action-btn"
                            style={{ background: "#f8fafc", color: "#334155", border: "1px solid #cbd5e1" }}
                            onClick={() => {
                              const selectedList = orders.filter((o) => selectedOrderIds.includes(o.id));
                              exportOrdersToCSV(selectedList as LifecycleOrder[]);
                            }}
                            title="Export selected orders to CSV"
                          >
                            <FileText size={14} /> Export CSV ({selectedOrderIds.length})
                          </button>

                          {data?.role === "super_admin" && (
                            <button
                              type="button"
                              className="bulk-action-btn delete"
                              disabled={busy}
                              onClick={async () => {
                                if (window.confirm(`Super Admin: Are you sure you want to permanently delete ${selectedOrderIds.length} selected orders? This cannot be undone and will restore stock.`)) {
                                  const idsToDelete = [...selectedOrderIds];
                                  if (!(await write({ action: "delete-order", id: idsToDelete }))) return;
                                  setData((curr) => curr ? {
                                    ...curr,
                                    orders: curr.orders.filter((o) => !idsToDelete.includes(o.id))
                                  } : curr);
                                  if (selected && idsToDelete.includes(selected.id)) {
                                    setSelected(null);
                                  }
                                  toast.success(`${idsToDelete.length} orders deleted`);
                                  setSelectedOrderIds([]);
                                }
                              }}
                            >
                              <Trash2 size={14} /> Delete Selected ({selectedOrderIds.length})
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {filteredOrders.length || !orders.length ? (
                      renderOrderTable(orderPage.rows)
                    ) : (
                      <div className="admin-empty">
                        <Search />
                        <h3>No matching orders</h3>
                        <p>No orders match the current search or filters.</p>
                        <button
                          type="button"
                          className="admin-secondary"
                          onClick={() => {
                            setQuery("");
                            setOrderMainTab("overview");
                            setOrderSubTab("all");
                            setDateFilter("all");
                            setCityFilter("all");
                            setCourierFilter("all");
                            setRtoRiskFilter("all");
                          }}
                        >
                          <RotateCcw size={14} /> Clear all filters
                        </button>
                      </div>
                    )}
                    <div className="admin-table-foot">
                      <AdminPagination {...orderPage} />
                      {orders.length >= 1000 && <span>Only the latest 1,000 orders are available in this view.</span>}
                    </div>
                  </>
                )}
              </div>
            )}
                {section === "new_product" && (
                  <div className="admin-card" style={{ padding: 0, background: "transparent", border: 0, boxShadow: "none" }}>
                    <ProductEditor mode="create" initialProduct={importedProduct} />
                  </div>
                )}
                {section === "edit_product" && (
                  <div className="admin-card" style={{ padding: 0, background: "transparent", border: 0, boxShadow: "none" }}>
                    <ProductEditor mode="edit" initialProductId={editingProductId || new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("id") || undefined} />
                  </div>
                )}
                {section === "products" && (
                  <div className="admin-card">
                    <div className="products-section-head">
                      <div>
                        <span className="products-section-kicker">Inventory catalog</span>
                        <h2>Products</h2>
                        <p>Review product details, pricing, stock, images and variants from one place.</p>
                      </div>
                      <div className="products-section-stats" aria-label="Product summary">
                        <span><b>{productStats.total}</b> Total</span>
                        <span><b>{productStats.active}</b> Active</span>
                        <span><b>{productStats.draft}</b> Draft</span>
                        <span className={productStats.lowStock ? "attention" : ""}><b>{productStats.lowStock}</b> Low stock</span>
                        <span className={productStats.outOfStock ? "danger" : ""}><b>{productStats.outOfStock}</b> Out of stock</span>
                      </div>
                    </div>
                    <div className="admin-toolbar">
                      <div className="admin-search">
                        <Search size={18} />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search by product, category, color or SKU"
                          aria-label="Search products"
                        />
                      </div>
                      <Choice
                        label="Filter product status"
                        value={filter}
                        onChange={setFilter}
                        items={["All statuses", "Active", "Draft"]}
                      />
                    </div>
                    <div className="product-bulk-bar">
                      <label><input type="checkbox" checked={productPage.rows.length > 0 && productPage.rows.every((p) => selectedProductIds.includes(p.id))} onChange={(event) => setSelectedProductIds(event.target.checked ? Array.from(new Set([...selectedProductIds, ...productPage.rows.map((p) => p.id)])) : selectedProductIds.filter((id) => !productPage.rows.some((p) => p.id === id)))} /> Select visible products</label>
                      <span>{selectedProductIds.length} selected</span>
                      <button type="button" className="product-delete-bulk" disabled={!selectedProductIds.length || busy} onClick={() => deleteProducts(selectedProductIds)}><Trash2 size={14} /> Delete selected</button>
                    </div>
                    <div className="products-table-head" aria-hidden="true">
                      <span>Product Info</span>
                      <span>Price</span>
                      <span>Stock <Info size={13} /></span>
                      <span>Active</span>
                      <span>Actions</span>
                    </div>
                    <div className="product-groups-list">
                      {productPage.rows.map((p) => {
                        const isSelected = selectedProductIds.includes(p.id);
                        const colorsList = colorVariantsFor(p);
                        const hasVariants = colorsList.length > 0;

                        // Single Source of Truth Stock calculation
                        const totalGroupStock = (p.variants && p.variants.length > 0)
                          ? p.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0)
                          : colorsList.length > 0
                            ? colorsList.reduce((sum, item) => sum + Number((item as any).stock ?? 0), 0)
                            : Number((p as any).stock ?? 0);

                        const invStatus = getInventoryStatus(p as any);
                        const badgeStyles: Record<string, { bg: string; color: string; border: string }> = {
                          "In Stock": { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
                          "Low Stock": { bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
                          "Out of Stock": { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
                          "Inactive": { bg: "#f8fafc", color: "#64748b", border: "#cbd5e1" },
                        };
                        const statusStyle = badgeStyles[invStatus] || badgeStyles["Inactive"];

                        // Count all distinct sizes and total variants
                        const allVariants = p.variants || [];
                        const distinctSizes = new Set<string>();
                        allVariants.forEach((v) => {
                          if (v.size && v.size !== "Standard") distinctSizes.add(v.size);
                        });
                        if (distinctSizes.size === 0 && p.sizes) {
                          p.sizes.forEach((s) => {
                            if (s && s !== "Standard") distinctSizes.add(s);
                          });
                        }

                        const inStockVariantsCount = allVariants.filter(
                          (v) => Number(v.stock || 0) > ((v as any).lowStockThreshold ?? 5)
                        ).length;
                        const lowStockVariantsCount = allVariants.filter(
                          (v) =>
                            Number(v.stock || 0) > 0 &&
                            Number(v.stock || 0) <= ((v as any).lowStockThreshold ?? 5)
                        ).length;
                        const outOfStockVariantsCount = allVariants.filter(
                          (v) => Number(v.stock || 0) <= 0
                        ).length;

                        const currentFilter = productVariantFilter[p.id] || "all";
                        const showAllVariants = expandedVariantLists[p.id] ?? false;
                        const visibleColors = showAllVariants ? colorsList : colorsList.slice(0, 3);
                        const hiddenVariantCount = Math.max(0, colorsList.length - visibleColors.length);

                        return (
                          <div
                            className={`product-row-wrapper ${activeActionDropdown === p.id ? "has-open-action-menu" : ""}`}
                            key={p.id}
                          >
                            {/* Clean Compact Header Card */}
                            <div className="product-header-card">
                              <div className="product-header-left">
                                <input
                                  className="product-select"
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(event) =>
                                    setSelectedProductIds((current) =>
                                      event.target.checked
                                        ? Array.from(new Set([...current, p.id]))
                                        : current.filter((id) => id !== p.id)
                                    )
                                  }
                                  aria-label={"Select " + p.name}
                                  style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#2563eb", flexShrink: 0 }}
                                />

                                {/* 3-Tier Image Resolution Thumbnail */}
                                <button
                                  type="button"
                                  className="product-header-thumb"
                                  onClick={() => setImageEditing(p)}
                                  title="Manage product images & variant gallery"
                                >
                                  <img src={photo(p)} alt={p.name} />
                                </button>

                                {/* Info */}
                                <div className="product-header-info">
                                  <h3 className="product-header-title">{p.name}</h3>
                                  <div className="product-header-meta">
                                    <span className="product-sku-pill">
                                      ID: {p.id}
                                    </span>
                                    <button
                                      type="button"
                                      className="copy-product-id"
                                      title="Copy product ID"
                                      aria-label="Copy product ID"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        navigator.clipboard?.writeText(p.id);
                                        toast.success("Product ID copied");
                                      }}
                                    >
                                      <Copy size={11} />
                                    </button>
                                    {hasVariants ? (
                                      <span>
                                        <b>{colorsList.length}</b> {colorsList.length === 1 ? "Color" : "Colors"} • <b>{distinctSizes.size > 0 ? distinctSizes.size : 1}</b> {distinctSizes.size === 1 ? "Size" : "Sizes"} • <b>{allVariants.length > 0 ? allVariants.length : colorsList.length}</b> Variants
                                      </span>
                                    ) : (
                                      <span style={{ color: "#64748b" }}>Simple Product (No variants)</span>
                                    )}
                                    <span className="product-performance"><Eye size={11} /> {p.soldCount || "0"} <Heart size={11} /> {p.reviews?.length || 0}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Center / Pricing & Dynamic Total Stock */}
                              <div className="product-header-center">
                                {/* Price */}
                                <div className="product-price-box">
                                  {inlinePriceId === p.id ? (
                                    <input
                                      className="inline-product-price-input"
                                      type="number"
                                      min="1"
                                      autoFocus
                                      value={inlinePriceValue}
                                      onChange={(event) => setInlinePriceValue(event.target.value)}
                                      onBlur={() => void saveInlineProductPrice(p)}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") event.currentTarget.blur();
                                        if (event.key === "Escape") setInlinePriceId(null);
                                      }}
                                      aria-label={`Edit price for ${p.name}`}
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      className="inline-price-button"
                                      onClick={() => {
                                        setInlinePriceId(p.id);
                                        setInlinePriceValue(String(p.price || ""));
                                      }}
                                      title="Edit price"
                                    >
                                      <span className="product-price-main">{money(p.price)}</span>
                                      <Pencil size={11} />
                                    </button>
                                  )}
                                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                                    {p.old > p.price && (
                                      <span className="product-price-old">{money(p.old)}</span>
                                    )}
                                  </div>
                                  {p.costPrice ? (
                                    <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>
                                      Cost: {money(p.costPrice)}
                                    </span>
                                  ) : null}
                                </div>

                                {/* Dynamic Total Stock (Single Source of Truth) */}
                                <div className="product-stock-box">
                                  <span className="product-stock-label">Total Stock</span>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span className="product-stock-val" style={{ color: totalGroupStock > 0 ? "#16a34a" : "#dc2626" }}>
                                      {totalGroupStock} <span style={{ fontSize: 11, fontWeight: 500, color: "#64748b" }}>units</span>
                                    </span>
                                    <span
                                      style={{
                                        display: "inline-block",
                                        padding: "2px 6px",
                                        borderRadius: 4,
                                        fontSize: 9.5,
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.3px",
                                        background: statusStyle.bg,
                                        color: statusStyle.color,
                                        border: `1px solid ${statusStyle.border}`,
                                      }}
                                    >
                                      {invStatus}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="product-active-cell">
                                <button
                                  type="button"
                                  className={`catalog-status-toggle ${p.status === "Active" ? "is-active" : ""}`}
                                  onClick={() => saveVariantGroupStatus(p, p.status === "Active" ? "Draft" : "Active")}
                                  aria-label={`${p.status === "Active" ? "Deactivate" : "Activate"} ${p.name}`}
                                  aria-pressed={p.status === "Active"}
                                  disabled={busy}
                                >
                                  <span />
                                </button>
                              </div>

                              {/* Unified Right Actions */}
                              <div className="product-header-actions">
                                {/* Edit Product */}
                                <button
                                  type="button"
                                  className="btn-product-edit"
                                  onClick={() => {
                                    editProduct(p.id);
                                  }}
                                >
                                  <Pencil size={13} />
                                  Edit
                                </button>

                                {/* Primary Manage Inventory */}
                                <button
                                  type="button"
                                  className="btn-manage-inventory"
                                  onClick={() => {
                                    setInventoryModalProduct(p);
                                    setInventoryModalTargetColor(null);
                                  }}
                                >
                                  <Layers size={14} />
                                  Manage Inventory
                                </button>

                                {/* 3-dot Dropdown Actions Menu */}
                                <div className="product-action-menu">
                                  <button
                                    type="button"
                                    className={`btn-more-menu ${activeActionDropdown === p.id ? "active" : ""}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveActionDropdown(activeActionDropdown === p.id ? null : p.id);
                                    }}
                                    aria-label={`More actions for ${p.name}`}
                                    aria-expanded={activeActionDropdown === p.id}
                                    aria-haspopup="menu"
                                    title="More actions"
                                  >
                                    <MoreVertical size={16} />
                                  </button>

                                  {activeActionDropdown === p.id && (
                                    <>
                                      <button
                                        type="button"
                                        className="product-menu-backdrop"
                                        aria-label="Close product actions"
                                        onClick={() => setActiveActionDropdown(null)}
                                      />
                                      <div
                                        className="product-action-dropdown"
                                        role="menu"
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseLeave={() => setActiveActionDropdown(null)}
                                      >
                                        <button
                                          type="button"
                                          className="product-dropdown-item"
                                          role="menuitem"
                                          onClick={() => window.open(`/product/${p.id}`, "_blank", "noopener,noreferrer")}
                                        >
                                          <Eye size={14} style={{ color: "#2563eb" }} />
                                          View product
                                        </button>

                                        <button
                                          type="button"
                                          className="product-dropdown-item"
                                          role="menuitem"
                                          onClick={() => {
                                            setActiveActionDropdown(null);
                                            void duplicateProduct(p);
                                          }}
                                        >
                                          <Copy size={14} style={{ color: "#2563eb" }} />
                                          Duplicate product
                                        </button>

                                        <button
                                          type="button"
                                          className="product-dropdown-item"
                                          role="menuitem"
                                          onClick={() => {
                                            setActiveActionDropdown(null);
                                            setPriceMode(p.pricingType === "bundle" || Boolean(p.bundles?.length) ? "bundle" : "uniform");
                                            setPriceValue(String(p.price || ""));
                                            setOriginalPriceValue(String(p.old || p.price || ""));
                                            setCostPriceValue(String(p.costPrice || ""));
                                            setOfferPriceValue(String(p.offerPrice || ""));
                                            setOfferStartValue(p.offerStart || "");
                                            setOfferEndValue(p.offerEnd || "");
                                            setBundleRows((p.bundles || []).length
                                              ? p.bundles!.map((bundle, index) => ({ id: bundle.id || `bundle-${index}`, quantity: String(bundle.quantity), totalPrice: String(bundle.price), promo: bundle.content || "", promoArabic: bundle.contentArabic || "" }))
                                              : [{ id: `bundle-${Date.now()}`, quantity: "1", totalPrice: String(p.price || ""), promo: "", promoArabic: "" }]);
                                            setVariantPrices(Object.fromEntries((p.variants || []).map((variant) => [variant.id, { price: String(variant.price || p.price || ""), old: String((variant as any).old || p.old || p.price || "") }])));
                                            setPriceEditing(p);
                                          }}
                                        >
                                          <Pencil size={14} style={{ color: "#6254ff" }} />
                                          Update pricing
                                        </button>

                                        <button
                                          type="button"
                                          className="product-dropdown-item"
                                          role="menuitem"
                                          onClick={() => {
                                            setActiveActionDropdown(null);
                                            setInventoryModalProduct(p);
                                            setInventoryModalTargetColor(null);
                                          }}
                                        >
                                          <Layers size={14} style={{ color: "#2563eb" }} />
                                          Manage inventory
                                        </button>

                                        <button
                                          type="button"
                                          className="product-dropdown-item"
                                          role="menuitem"
                                          onClick={() => {
                                            setActiveActionDropdown(null);
                                            setAddColorSource(p);
                                          }}
                                        >
                                          <Plus size={14} style={{ color: "#2563eb" }} />
                                          Add color
                                        </button>

                                        <button
                                          type="button"
                                          className="product-dropdown-item"
                                          role="menuitem"
                                          onClick={() => {
                                            setActiveActionDropdown(null);
                                            setStockHistoryModalProduct(p);
                                            setStockHistoryVariantSku(null);
                                            setStockHistoryVariantColor(null);
                                            setStockHistoryVariantSize(null);
                                          }}
                                        >
                                          <Clock size={14} style={{ color: "#2563eb" }} />
                                          Stock history
                                        </button>

                                        <button
                                          type="button"
                                          className="product-dropdown-item"
                                          role="menuitem"
                                          onClick={() => {
                                            setActiveActionDropdown(null);
                                            saveVariantGroupStatus(p, p.status === "Active" ? "Draft" : "Active");
                                          }}
                                        >
                                          <EyeOff size={14} style={{ color: "#64748b" }} />
                                          Set as {p.status === "Active" ? "Draft" : "Active"}
                                        </button>

                                        <div className="product-dropdown-divider" />

                                        <button
                                          type="button"
                                          className="product-dropdown-item danger"
                                          role="menuitem"
                                          disabled={busy}
                                          onClick={() => {
                                            setActiveActionDropdown(null);
                                            deleteProducts([p.id]);
                                          }}
                                        >
                                          <Trash2 size={14} />
                                          Delete product
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Status Summary Chips Bar (When variants exist) */}
                            {hasVariants && (
                              <div className="product-summary-chips-bar">
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginRight: 4 }}>
                                  Variants:
                                </span>
                                <button
                                  type="button"
                                  className={`summary-chip-btn ${currentFilter === "all" ? "active" : ""}`}
                                  onClick={() => setProductVariantFilter((prev) => ({ ...prev, [p.id]: "all" }))}
                                >
                                  All Variants <span className="summary-chip-count">{allVariants.length || colorsList.length}</span>
                                </button>
                                <button
                                  type="button"
                                  className={`summary-chip-btn ${currentFilter === "in_stock" ? "active" : ""}`}
                                  onClick={() => setProductVariantFilter((prev) => ({ ...prev, [p.id]: "in_stock" }))}
                                >
                                  <span style={{ color: "#16a34a" }}>●</span> In Stock <span className="summary-chip-count">{inStockVariantsCount}</span>
                                </button>
                                <button
                                  type="button"
                                  className={`summary-chip-btn ${currentFilter === "low_stock" ? "active" : ""}`}
                                  onClick={() => setProductVariantFilter((prev) => ({ ...prev, [p.id]: "low_stock" }))}
                                >
                                  <span style={{ color: "#d97706" }}>●</span> Low Stock <span className="summary-chip-count">{lowStockVariantsCount}</span>
                                </button>
                                <button
                                  type="button"
                                  className={`summary-chip-btn ${currentFilter === "out_of_stock" ? "active" : ""}`}
                                  onClick={() => setProductVariantFilter((prev) => ({ ...prev, [p.id]: "out_of_stock" }))}
                                >
                                  <span style={{ color: "#dc2626" }}>●</span> Out of Stock <span className="summary-chip-count">{outOfStockVariantsCount}</span>
                                </button>
                              </div>
                            )}

                            {/* Expandable Color Accordions Area */}
                            {hasVariants && (
                              <div className="product-variants-area">
                                {visibleColors.map((variant) => {
                                  const vColorName = variant.color || variant.name || "Default";
                                  const colorKey = `${p.id}:${vColorName}`;
                                  const isExpanded = expandedColorRows[colorKey] ?? false;

                                  // Filter size variants of this color based on selected chip filter
                                  const colorVariants = (p.variants || []).filter(
                                    (v) => (v.color || "").toLowerCase() === vColorName.toLowerCase()
                                  );

                                  const colorTotalStock = colorVariants.length > 0
                                    ? colorVariants.reduce((sum, v) => sum + Number(v.stock || 0), 0)
                                    : Number((variant as any).stock ?? 0);

                                  const colorStatus = variant.status || (colorTotalStock > 0 ? "Active" : "Draft");

                                  // Filter variants by chip filter
                                  const filteredColorVariants = colorVariants.filter((v) => {
                                    const vStock = Number(v.stock || 0);
                                    const threshold = (v as any).lowStockThreshold ?? 5;
                                    if (currentFilter === "in_stock") return vStock > threshold;
                                    if (currentFilter === "low_stock") return vStock > 0 && vStock <= threshold;
                                    if (currentFilter === "out_of_stock") return vStock <= 0;
                                    return true;
                                  });

                                  return (
                                    <div
                                      key={variant.id || colorKey}
                                      className={`color-accordion-card ${isExpanded ? "expanded" : ""}`}
                                    >
                                      {/* Compact Color Header Row */}
                                      <div
                                        className="color-accordion-header"
                                        onClick={() =>
                                          setExpandedColorRows((prev) => ({
                                            ...prev,
                                            [colorKey]: !isExpanded,
                                          }))
                                        }
                                      >
                                        <div className="color-header-left">
                                          <img className="variant-row-thumbnail" src={photo(variant as ManagedProduct)} alt={`${vColorName} variant`} />
                                          <div className="variant-row-info">
                                            <span className="variant-row-name">{vColorName}{variant.sizes?.[0] ? ` / ${variant.sizes[0]}` : ""}</span>
                                            <span className="variant-row-sku">Seller SKU: {variant.sku || `${p.sku || p.id}-${vColorName}`}</span>
                                          </div>
                                          <span
                                            className="color-swatch-circle"
                                            style={{
                                              background:
                                                variant.colorHex ||
                                                (vColorName.toLowerCase() === "white"
                                                  ? "#f1f5f9"
                                                  : vColorName.toLowerCase() === "black"
                                                  ? "#000000"
                                                  : "#2563eb"),
                                            }}
                                          />
                                          <span className="color-name-heading">{vColorName}</span>
                                        </div>

                                        <div className="color-header-right" onClick={(e) => e.stopPropagation()}>
                                          <div className="variant-row-price">
                                            {inlineColorPriceId === colorKey ? (
                                              <input
                                                className="inline-color-price-input"
                                                type="number"
                                                min="1"
                                                autoFocus
                                                value={inlineColorPriceValue}
                                                onChange={(event) => setInlineColorPriceValue(event.target.value)}
                                                onKeyDown={(event) => {
                                                  if (event.key === "Enter") {
                                                    event.preventDefault();
                                                    void saveInlineColorPrice(p, variant);
                                                  }
                                                  if (event.key === "Escape") {
                                                    event.preventDefault();
                                                    setInlineColorPriceId(null);
                                                  }
                                                }}
                                                onBlur={() => setInlineColorPriceId(null)}
                                                aria-label={`Edit ${vColorName} price`}
                                                title="Press Enter to save or Escape to cancel"
                                              />
                                            ) : (
                                              <>
                                                <b>{money(variant.price ?? p.price)}</b>
                                                {(variant.old || p.old) > (variant.price ?? p.price) && <del>{money(variant.old || p.old)}</del>}
                                                <button
                                                  type="button"
                                                  className="inline-color-price-button"
                                                  onClick={() => {
                                                    setInlineColorPriceId(colorKey);
                                                    setInlineColorPriceValue(String(variant.price ?? p.price ?? ""));
                                                  }}
                                                  aria-label={`Edit ${vColorName} price`}
                                                  title={`Edit ${vColorName} price`}
                                                ><Pencil size={11} /></button>
                                              </>
                                            )}
                                          </div>
                                          <span className="variant-row-stock">{colorTotalStock}</span>
                                          <button
                                            type="button"
                                            className={`catalog-status-toggle compact ${colorStatus === "Active" ? "is-active" : ""}`}
                                            onClick={() => saveVariantStatus(p, variant, colorStatus === "Active" ? "Draft" : "Active")}
                                            aria-label={`${colorStatus === "Active" ? "Deactivate" : "Activate"} ${vColorName}`}
                                            aria-pressed={colorStatus === "Active"}
                                            disabled={busy}
                                          ><span /></button>
                                          <button
                                            type="button"
                                            className="color-btn-quick"
                                            onClick={() => {
                                              setInventoryModalProduct(p);
                                              setInventoryModalTargetColor(vColorName);
                                            }}
                                            title={`Manage stock for ${vColorName}`}
                                          >
                                            <Pencil size={11} />
                                            Manage Stock
                                          </button>

                                          <button
                                            type="button"
                                            className="color-btn-quick"
                                            style={{ color: "#dc2626", borderColor: "#fecaca" }}
                                            onClick={() => {
                                              setRemoveColorProduct(p);
                                              setRemoveColorTarget({
                                                id: variant.id,
                                                color: vColorName,
                                                stock: colorTotalStock,
                                                sizes: variant.sizes,
                                                sizeStock: variant.sizeStock,
                                              });
                                            }}
                                            title={`Remove or disable ${vColorName}`}
                                          >
                                            <Trash2 size={11} />
                                          </button>

                                          <button
                                            type="button"
                                            className="color-btn-quick"
                                            onClick={() =>
                                              setExpandedColorRows((prev) => ({
                                                ...prev,
                                                [colorKey]: !isExpanded,
                                              }))
                                            }
                                            title={isExpanded ? "Collapse" : "Expand"}
                                            style={{ padding: "4px 6px" }}
                                          >
                                            <ChevronDown
                                              size={15}
                                              className={`color-chevron-icon ${isExpanded ? "expanded" : ""}`}
                                            />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Expanded Variant Table */}
                                      {isExpanded && (
                                        <div className="color-variant-table-wrap">
                                          {colorVariants.length === 0 ? (
                                            <div style={{ padding: "12px 10px", color: "#64748b", fontSize: 12 }}>
                                              Single variant with <b>{colorTotalStock} units</b> in stock.
                                            </div>
                                          ) : filteredColorVariants.length === 0 ? (
                                            <div style={{ padding: "12px 10px", color: "#94a3b8", fontSize: 12, textAlign: "center" }}>
                                              No size variants match &ldquo;{currentFilter.replace("_", " ")}&rdquo;.
                                            </div>
                                          ) : (
                                            <table className="variant-inventory-table">
                                              <thead>
                                                <tr>
                                                  <th style={{ width: 90 }}>Size</th>
                                                  <th>Variant SKU</th>
                                                  <th style={{ width: 110 }}>Price</th>
                                                  <th style={{ width: 140, textAlign: "center" }}>Stock</th>
                                                  <th style={{ width: 120 }}>Inventory Status</th>
                                                  <th style={{ width: 100, textAlign: "center" }}>Status</th>
                                                  <th style={{ width: 50, textAlign: "center" }}>Audit</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {filteredColorVariants.map((v) => {
                                                  const vStock = Number(v.stock || 0);
                                                  const threshold = (v as any).lowStockThreshold ?? 5;
                                                  const isOos = vStock <= 0;
                                                  const isLow = vStock > 0 && vStock <= threshold;
                                                  const vStatusText = isOos ? "Out of Stock" : isLow ? "Low Stock" : "In Stock";
                                                  const vStatusColor = isOos ? "#dc2626" : isLow ? "#d97706" : "#16a34a";
                                                  const vStatusBg = isOos ? "#fef2f2" : isLow ? "#fef3c7" : "#f0fdf4";
                                                  const vStatusBorder = isOos ? "#fecaca" : isLow ? "#fde68a" : "#bbf7d0";

                                                  return (
                                                    <tr key={v.id}>
                                                      {/* Size */}
                                                      <td>
                                                        <span
                                                          style={{
                                                            background: "#f1f5f9",
                                                            padding: "2px 7px",
                                                            borderRadius: 4,
                                                            fontWeight: 700,
                                                            fontSize: 11.5,
                                                            color: "#334155",
                                                          }}
                                                        >
                                                          {v.size || "Standard"}
                                                        </span>
                                                      </td>

                                                      {/* Variant SKU */}
                                                      <td>
                                                        <code
                                                          style={{
                                                            background: "#f8fafc",
                                                            border: "1px solid #e2e8f0",
                                                            padding: "2px 6px",
                                                            borderRadius: 4,
                                                            fontSize: 11,
                                                            fontFamily: "monospace",
                                                            color: "#475569",
                                                            fontWeight: 600,
                                                          }}
                                                        >
                                                          {v.sku || `${p.sku || "PROD"}-${vColorName.toUpperCase()}-${(v.size || "STD").toUpperCase()}`}
                                                        </code>
                                                      </td>

                                                      {/* Price */}
                                                      <td>
                                                        <span style={{ fontWeight: 600, color: "#0f172a" }}>
                                                          {money(v.price || p.price)}
                                                        </span>
                                                      </td>

                                                      {/* Stock Quantity Stepper */}
                                                      <td>
                                                        <div className="stock-stepper-cell">
                                                          <button
                                                            type="button"
                                                            className="stock-stepper-btn"
                                                            disabled={vStock <= 0 || busy}
                                                            onClick={() => updateSingleVariantStock(p, v.id, vStock - 1)}
                                                            title="Decrease stock by 1"
                                                          >
                                                            <Minus size={11} />
                                                          </button>
                                                          <input
                                                            type="number"
                                                            min="0"
                                                            defaultValue={vStock}
                                                            key={`${v.id}-${vStock}`}
                                                            onBlur={(e) => {
                                                              const val = Number(e.target.value);
                                                              if (val !== vStock && Number.isFinite(val) && val >= 0) {
                                                                updateSingleVariantStock(p, v.id, val);
                                                              }
                                                            }}
                                                            onKeyDown={(e) => {
                                                              if (e.key === "Enter") {
                                                                e.currentTarget.blur();
                                                              }
                                                            }}
                                                            className="stock-stepper-input"
                                                          />
                                                          <button
                                                            type="button"
                                                            className="stock-stepper-btn"
                                                            disabled={busy}
                                                            onClick={() => updateSingleVariantStock(p, v.id, vStock + 1)}
                                                            title="Increase stock by 1"
                                                          >
                                                            <Plus size={11} />
                                                          </button>
                                                        </div>
                                                      </td>

                                                      {/* Inventory Status Badge */}
                                                      <td>
                                                        <span
                                                          style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: 4,
                                                            padding: "2px 7px",
                                                            borderRadius: 5,
                                                            fontSize: 10.5,
                                                            fontWeight: 700,
                                                            background: vStatusBg,
                                                            color: vStatusColor,
                                                            border: `1px solid ${vStatusBorder}`,
                                                          }}
                                                        >
                                                          <span
                                                            style={{
                                                              width: 5,
                                                              height: 5,
                                                              borderRadius: "50%",
                                                              background: vStatusColor,
                                                            }}
                                                          />
                                                          {vStatusText}
                                                        </span>
                                                      </td>

                                                      {/* Active / Draft Availability Toggle */}
                                                      <td style={{ textAlign: "center" }}>
                                                        <button
                                                          type="button"
                                                          className={`catalog-status-toggle compact ${v.status === "Active" ? "is-active" : ""}`}
                                                          disabled={busy}
                                                          onClick={() => {
                                                            const nextStatus = v.status === "Active" ? "Draft" : "Active";
                                                            const updatedVariants = (p.variants || []).map((x) =>
                                                              x.id === v.id ? { ...x, status: nextStatus } : x
                                                            );
                                                            const updatedProduct = {
                                                              ...p,
                                                              variants: updatedVariants,
                                                            };
                                                            write({ action: "product", product: updatedProduct }).then((ok) => {
                                                              if (ok) {
                                                                load();
                                                                toast.success(`Variant set to ${nextStatus}`);
                                                              }
                                                            });
                                                          }}
                                                        >
                                                          <span />
                                                        </button>
                                                      </td>

                                                      {/* Audit Log Icon */}
                                                      <td style={{ textAlign: "center" }}>
                                                        <button
                                                          type="button"
                                                          onClick={() => {
                                                            setStockHistoryModalProduct(p);
                                                            setStockHistoryVariantSku(v.sku || null);
                                                            setStockHistoryVariantColor(vColorName);
                                                            setStockHistoryVariantSize(v.size || null);
                                                          }}
                                                          title={`View audit history for ${v.sku || v.size}`}
                                                          style={{
                                                            border: 0,
                                                            background: "none",
                                                            cursor: "pointer",
                                                            color: "#2563eb",
                                                            padding: 3,
                                                            borderRadius: 4,
                                                          }}
                                                        >
                                                          <Clock size={14} />
                                                        </button>
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </table>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {colorsList.length > 3 && (
                                  <button
                                    type="button"
                                    className="variant-list-toggle"
                                    onClick={() => setExpandedVariantLists((current) => ({ ...current, [p.id]: !showAllVariants }))}
                                  >
                                    {showAllVariants ? "Show Less" : `See ${hiddenVariantCount} More Variants`}
                                    <ChevronDown size={14} className={showAllVariants ? "rotated" : ""} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                     <div className="product-list-summary">
                       <AdminPagination {...productPage} />
                     </div>
                     {!productRows.length && (
                       <div className="admin-empty">
                         <Package />
                         <h3>No matching products</h3>
                         <p>Try another keyword or clear the status filter.</p>
                         <button
                           onClick={() => {
                             setQuery("");
                             setFilter("All statuses");
                           }}
                         >
                           Clear filters
                         </button>
                       </div>
                     )}
                   </div>
                 )}
                {section === "customers" && (
                  <CustomerIntelligence
                    orders={orders}
                    view={customerView}
                    onViewChange={navigateCustomerView}
                    onOpenHistory={(phone) => setCustomerHistoryPhone(phone || null)}
                  />
                )}
                {section === "settings" && config && (
                  <>
                    {settingsSubTab !== "settings_home" && (
                      <div className="settings-backbar">
                        <button type="button" className="settings-back-button" onClick={() => navigate("settings", "settings_home")}>
                          <ArrowLeft size={16} />
                          <span>Back to Store Settings</span>
                        </button>
                      </div>
                    )}
                    {settingsSubTab === "settings_home" && (
                      <div className="settings-dashboard">
                        <div className="settings-dashboard-heading">
                          <div>
                            <span className="admin-overline">STORE CONTROL CENTER</span>
                            <h1>Store Settings</h1>
                            <p>Manage your storefront and business preferences</p>
                          </div>
                        </div>
                        <div className="settings-dashboard-groups">
                          {settingsGroups.map((group) => (
                            <section className="settings-dashboard-section" key={group.title}>
                              <h2>{group.title}</h2>
                              <div className="settings-dashboard-grid">
                                {group.cards.map((card, index) => {
                                  const Icon = card.icon;
                                  return (
                                    <button
                                      type="button"
                                      className="settings-dashboard-card"
                                      key={`${group.title}-${card.title}-${index}`}
                                      onClick={() => navigate("settings", card.id)}
                                    >
                                      <span className="settings-dashboard-card-icon"><Icon size={17} /></span>
                                      <span className="settings-dashboard-card-copy">
                                        <span className="settings-dashboard-card-title">{card.title}</span>
                                        <span className="settings-dashboard-card-description">{card.description}</span>
                                      </span>
                                      <ChevronRight className="settings-dashboard-card-arrow" size={17} />
                                    </button>
                                  );
                                })}
                              </div>
                            </section>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* 1. Store Settings Subtab */}
                    {settingsSubTab === "store_settings" && (
                      <form
                        className="admin-settings"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setSettingsSaved(false);
                          if (await write({ action: "settings", settings: config })) {
                            setData({ ...data, settings: config });
                            setSettingsSaved(true);
                            toast.success("Store branding and contact settings saved");
                          }
                        }}
                      >
                        <div className="admin-card">
                          <div className="admin-card-head">
                            <div>
                              <h2>Store branding & logo</h2>
                              <p>Upload your store logo. Preview updates live on the right.</p>
                            </div>
                            <Store size={20} />
                          </div>
                          <div className="admin-fields">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, alignItems: "stretch" }}>
                              
                              {/* Left Column: Upload & Tagline */}
                              <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", justifyContent: "space-between" }}>
                                <div>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", display: "block", marginBottom: 8 }}>
                                    Upload Logo File
                                  </span>
                                  <div
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const file = e.dataTransfer.files?.[0];
                                      if (file) {
                                        if (!file.type.startsWith("image/")) {
                                          toast.error("Please drop an image file (PNG, JPG, SVG)");
                                          return;
                                        }
                                        const reader = new FileReader();
                                        reader.onload = (evt) => {
                                          const result = evt.target?.result as string;
                                          setSettingsSaved(false);
                                          setConfig({ ...config, logo: result });
                                          toast.success("Logo uploaded");
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                    style={{
                                      border: "2px dashed #cbd5e1",
                                      borderRadius: 10,
                                      padding: "24px 16px",
                                      textAlign: "center",
                                      background: "#f8fafc",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease",
                                    }}
                                    onClick={() => {
                                      const input = document.createElement("input");
                                      input.type = "file";
                                      input.accept = "image/*";
                                      input.onchange = (e: any) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onload = (evt) => {
                                            const result = evt.target?.result as string;
                                            setSettingsSaved(false);
                                            setConfig({ ...config, logo: result });
                                            toast.success("Logo uploaded");
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      };
                                      input.click();
                                    }}
                                  >
                                    <Upload size={24} style={{ margin: "0 auto 6px", color: "#64748b" }} />
                                    <b style={{ display: "block", fontSize: 13, color: "#1e293b", marginBottom: 2 }}>
                                      Click or drag & drop logo here
                                    </b>
                                    <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>
                                      Recommended size: 200px × 50px (Max height: 42px)
                                    </span>
                                  </div>
                                </div>

                                <label style={{ margin: 0 }}>
                                  Brand tagline
                                  <input
                                    value={config.logoText || ""}
                                    onChange={(e) => {
                                      setSettingsSaved(false);
                                      setConfig({ ...config, logoText: e.target.value });
                                    }}
                                    placeholder="PAKISTAN"
                                    maxLength={80}
                                  />
                                  <small>Shown under text logo when no image logo is uploaded (Default: PAKISTAN).</small>
                                </label>
                              </div>

                              {/* Right Column: Active Logo Preview */}
                              <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%" }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>
                                  Active Store Logo Preview
                                </span>
                                <div style={{
                                  padding: 16,
                                  background: "#ffffff",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: 10,
                                  flex: 1,
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "space-between"
                                }}>
                                  <div>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                                      <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.8px", color: "#64748b", fontWeight: 600 }}>
                                        Live Header Display
                                      </span>
                                      <span style={{ fontSize: 11, color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>
                                        {config.logo ? "Custom Image" : "Default Text"}
                                      </span>
                                    </div>
                                    <div style={{ background: "#203664", padding: "20px 16px", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 90 }}>
                                      {config.logo ? (
                                        <img
                                          src={config.logo}
                                          alt="Active logo preview"
                                          style={{ maxHeight: 42, maxWidth: 200, objectFit: "contain" }}
                                          onError={(e) => (e.currentTarget.style.display = "none")}
                                        />
                                      ) : (
                                        <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "#ffffff", fontSize: 26, fontWeight: 700, textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
                                          <span>cartify<span style={{ color: "#b68b69" }}>.</span></span>
                                          <small style={{ fontSize: 9, color: "#a6b4cc", letterSpacing: "2.5px", marginTop: 4 }}>{config.logoText || "PAKISTAN"}</small>
                                        </a>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: 12, color: "#475569" }}>
                                      {config.logo ? "Custom image logo active" : "Default text logo active"}
                                    </span>
                                    {config.logo && (
                                      <button
                                        type="button"
                                        className="admin-secondary"
                                        onClick={() => {
                                          setSettingsSaved(false);
                                          setConfig({ ...config, logo: "" });
                                          toast.info("Logo removed");
                                        }}
                                        style={{ fontSize: 12, padding: "4px 10px" }}
                                      >
                                        Remove logo
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>

                        <div className="admin-card">
                          <div className="admin-card-head">
                            <div>
                              <h2>Customer support</h2>
                              <p>Displayed on the Contact us page and order tracking.</p>
                            </div>
                            <Mail size={20} />
                          </div>
                          <div className="admin-fields">
                            <label>
                              Support email
                              <input
                                type="email"
                                value={config.supportEmail}
                                onChange={(e) => {
                                  setSettingsSaved(false);
                                  setConfig({
                                    ...config,
                                    supportEmail: e.target.value,
                                  });
                                }}
                                placeholder="support@yourstore.pk"
                                maxLength={100}
                              />
                            </label>
                            <label>
                              WhatsApp number
                              <input
                                value={config.whatsapp}
                                onChange={(e) => {
                                  setSettingsSaved(false);
                                  setConfig({ ...config, whatsapp: e.target.value });
                                }}
                                pattern="(923[0-9]{9})?"
                                placeholder="923001234567"
                              />
                              <small>
                                Use 92 followed by the mobile number, without + or spaces (e.g. 923001234567).
                              </small>
                            </label>
                          </div>
                        </div>

                        <div className="admin-setting-note">
                          <ShieldCheck size={19} />
                          <p>
                            Store Currency: <b>PKR (Pakistani Rupee)</b> · Country: <b>Pakistan</b> · Timezone: <b>Asia/Karachi</b>
                          </p>
                        </div>
                        {saveError && (
                          <p className="admin-error" role="alert">
                            {saveError}
                          </p>
                        )}
                        <button className="admin-primary" disabled={busy}>
                          {settingsSaved && !busy ? <CheckCircle2 size={17} /> : <Save size={17} />}
                          {busy ? "Saving…" : settingsSaved ? "Saved" : "Save settings"}
                        </button>
                      </form>
                    )}

                    {/* 2. Store Setup Subtab */}
                    {settingsSubTab === "store_setup" && (
                      <form
                        className="admin-settings"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setSettingsSaved(false);
                          if (await write({ action: "settings", settings: config })) {
                            setData({ ...data, settings: config });
                            setSettingsSaved(true);
                            toast.success("Store delivery and setup settings saved");
                          }
                        }}
                      >
                        <div className="admin-card">
                          <div className="admin-card-head">
                            <div>
                              <h2>Delivery & checkout</h2>
                              <p>These rates appear in your storefront and customer checkout.</p>
                            </div>
                            <Truck size={20} />
                          </div>
                          <div className="admin-fields">
                            <div className="admin-two">
                              <label>
                                Delivery charge (PKR)
                                <input
                                  type="number"
                                  required
                                  min="0"
                                  max="100000"
                                  value={config.deliveryCharge}
                                  onChange={(e) => {
                                    setSettingsSaved(false);
                                    setConfig({
                                      ...config,
                                      deliveryCharge: Number(e.target.value),
                                    });
                                  }}
                                />
                              </label>
                              <label>
                                Free delivery from (PKR)
                                <input
                                  type="number"
                                  required
                                  min="0"
                                  max="10000000"
                                  value={config.freeThreshold}
                                  onChange={(e) => {
                                    setSettingsSaved(false);
                                    setConfig({
                                      ...config,
                                      freeThreshold: Number(e.target.value),
                                    });
                                  }}
                                />
                              </label>
                            </div>
                            <div className="admin-setting-fixed">
                              <div>
                                <b>Cash on Delivery (COD)</b>
                                <p>Doorstep cash collection enabled across 200+ cities in Pakistan via Trax, TCS, and Leopards Express.</p>
                              </div>
                              <Badge status="Active" />
                            </div>
                          </div>
                        </div>

                        <div className="admin-card">
                          <div className="admin-card-head">
                            <div>
                              <h2>Shipping rules & fulfillment notes</h2>
                              <p>Standard delivery guidelines for Pakistan courier network.</p>
                            </div>
                            <ShieldCheck size={20} />
                          </div>
                          <div className="admin-fields">
                            <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12.5, color: "#334155", lineHeight: 1.6 }}>
                              <p style={{ margin: "0 0 8px" }}>📦 <b>Standard Pakistan Shipping SLA:</b> 2 to 4 working days for major cities (Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, Gujranwala, Sialkot).</p>
                              <p style={{ margin: "0 0 8px" }}>🚚 <b>Courier Integrations:</b> Airway bill generation with barcode slip printing (4"x6" Thermal & A4) supported directly from the Orders fulfillment workspace.</p>
                              <p style={{ margin: 0 }}>💰 <b>Automatic Free Shipping:</b> Cartify automatically applies free delivery at checkout when the order subtotal reaches or exceeds <b>{money(config.freeThreshold)}</b>.</p>
                            </div>
                          </div>
                        </div>

                        {saveError && (
                          <p className="admin-error" role="alert">
                            {saveError}
                          </p>
                        )}
                        <button className="admin-primary" disabled={busy}>
                          {settingsSaved && !busy ? <CheckCircle2 size={17} /> : <Save size={17} />}
                          {busy ? "Saving…" : settingsSaved ? "Saved" : "Save store setup"}
                        </button>
                      </form>
                    )}

                    {/* 3. Offers Subtab */}
                    {settingsSubTab === "offers" && (
                      <div className="admin-settings" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div className="offers-metrics-grid">
                          {[
                            { label: "Total offers", value: (config.offers || []).length, tone: "purple" },
                            { label: "Active offers", value: (config.offers || []).filter((offer) => offer.enabled).length, tone: "green" },
                            { label: "Scheduled offers", value: (config.offers || []).filter((offer) => offer.status === "Scheduled" || Boolean(offer.startAt && Date.parse(offer.startAt) > Date.now())).length, tone: "blue" },
                          ].map((metric) => (
                            <div className={`offers-metric-card ${metric.tone}`} key={metric.label}>
                              <span>{metric.label}</span>
                              <strong>{metric.value}</strong>
                            </div>
                          ))}
                        </div>
                        {/* Add New Offer Card */}
                        <div className="admin-card">
                          <div className="admin-card-head">
                            <div>
                              <h2>Create new offer / bundle deal</h2>
                              <p>Set up automatic checkout discounts, bundle volume deals, and promotional campaigns.</p>
                            </div>
                            <Sparkles size={20} />
                          </div>
                          <div className="admin-fields">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                              <label>
                                Offer title *
                                <input
                                  value={newOfferTitle}
                                  onChange={(e) => setNewOfferTitle(e.target.value)}
                                  placeholder="e.g. Bundle Saver: Buy Any 2 Products"
                                />
                              </label>
                              <label>
                                Tagline / Customer subtitle
                                <input
                                  value={newOfferTagline}
                                  onChange={(e) => setNewOfferTagline(e.target.value)}
                                  placeholder="e.g. Save 10% automatically at checkout"
                                />
                              </label>
                              <label>
                                Discount type
                                <select
                                  value={newOfferType}
                                  onChange={(e: any) => setNewOfferType(e.target.value)}
                                  style={{ width: "100%", height: 38, border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 10px" }}
                                >
                                  <option value="percentage">Percentage Discount (% Off)</option>
                                  <option value="fixed">Fixed Cash Discount (Rs. Off)</option>
                                  <option value="bundle">Bundle Tier Deal</option>
                                </select>
                              </label>
                              <label>
                                Discount value ({newOfferType === "percentage" ? "%" : "PKR"}) *
                                <input
                                  type="number"
                                  min="1"
                                  value={newOfferValue}
                                  onChange={(e) => setNewOfferValue(e.target.value)}
                                />
                              </label>
                              <label>
                                Minimum quantity required
                                <input
                                  type="number"
                                  min="1"
                                  value={newOfferMinQty}
                                  onChange={(e) => setNewOfferMinQty(e.target.value)}
                                />
                              </label>
                              <label>
                                Promotional badge text
                                <input
                                  value={newOfferBadge}
                                  onChange={(e) => setNewOfferBadge(e.target.value)}
                                  placeholder="e.g. POPULAR, BEST VALUE, EID SPECIAL"
                                />
                              </label>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                              <button
                                type="button"
                                className="admin-primary"
                                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                                disabled={!newOfferTitle.trim() || !newOfferValue || busy}
                                onClick={async () => {
                                  const newOffer: any = {
                                    id: `off-${Date.now()}`,
                                    title: newOfferTitle.trim(),
                                    tagline: newOfferTagline.trim() || `${newOfferValue}${newOfferType === "percentage" ? "%" : " PKR"} automatic discount`,
                                    discountType: newOfferType,
                                    discountValue: Number(newOfferValue) || 10,
                                    minQuantity: Number(newOfferMinQty) || 2,
                                    badgeText: newOfferBadge.trim() || "SPECIAL OFFER",
                                    enabled: true,
                                  };
                                  const updatedOffers = [newOffer, ...(config.offers || [])];
                                  const updated = { ...config, offers: updatedOffers };
                                  setConfig(updated);
                                  setSettingsSaved(false);
                                  const ok = await write({ action: "settings", settings: updated });
                                  if (ok) {
                                    setData({ ...data, settings: updated });
                                    setSettingsSaved(true);
                                    setNewOfferTitle("");
                                    setNewOfferTagline("");
                                    setNewOfferValue("10");
                                    setNewOfferMinQty("2");
                                    toast.success(`Offer "${newOffer.title}" created successfully!`);
                                  }
                                }}
                              >
                                <Plus size={16} /> Add Offer
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Existing Offers List */}
                        <div className="admin-card">
                          <div className="admin-card-head">
                            <div>
                              <h2>Active store offers & bundle deals ({(config.offers || []).length})</h2>
                              <p>Deals currently enabled for automatic calculation in the storefront cart and checkout.</p>
                            </div>
                          </div>

                          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                            {(config.offers || []).length === 0 ? (
                              <div className="admin-empty" style={{ padding: "30px 20px" }}>
                                <Sparkles size={32} style={{ color: "#94a3b8" }} />
                                <h3>No offers created yet</h3>
                                <p>Add your first bundle deal or automatic checkout discount using the form above.</p>
                              </div>
                            ) : (
                              (config.offers || []).map((offer, idx) => (
                                <div
                                  key={offer.id || idx}
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 14,
                                    padding: "14px 18px",
                                    borderRadius: 10,
                                    border: offer.enabled ? "1px solid #c7d2fe" : "1px solid #e2e8f0",
                                    background: offer.enabled ? "#f5f3ff" : "#f8fafc",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div
                                      style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: 8,
                                        background: offer.enabled ? "#6351f4" : "#94a3b8",
                                        color: "#ffffff",
                                        display: "grid",
                                        placeItems: "center",
                                        fontWeight: 800,
                                        fontSize: 14,
                                        flexShrink: 0,
                                      }}
                                    >
                                      {offer.discountType === "percentage" ? `${offer.discountValue}%` : `Rs.`}
                                    </div>
                                    <div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <b style={{ fontSize: 13.5, color: "#1e293b" }}>{offer.title}</b>
                                        {offer.badgeText && (
                                          <span style={{ fontSize: 10, fontWeight: 700, background: "#ede9fe", color: "#6d28d9", padding: "1px 7px", borderRadius: 999 }}>
                                            {offer.badgeText}
                                          </span>
                                        )}
                                      </div>
                                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                                        {offer.tagline} · <b style={{ color: "#475569" }}>Min items: {offer.minQuantity || 1}</b>
                                      </p>
                                    </div>
                                  </div>

                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={async () => {
                                        const updatedOffers = (config.offers || []).map((o) =>
                                          o.id === offer.id ? { ...o, enabled: !o.enabled } : o
                                        );
                                        const updated = { ...config, offers: updatedOffers };
                                        setConfig(updated);
                                        const ok = await write({ action: "settings", settings: updated });
                                        if (ok) {
                                          setData({ ...data, settings: updated });
                                          toast.success(`Offer ${offer.enabled ? "disabled" : "enabled"}`);
                                        }
                                      }}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 6,
                                        padding: "4px 10px",
                                        borderRadius: 999,
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        border: offer.enabled ? "1px solid #86efac" : "1px solid #cbd5e1",
                                        background: offer.enabled ? "#f0fdf4" : "#f8fafc",
                                        color: offer.enabled ? "#15803d" : "#64748b",
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: 8,
                                          height: 8,
                                          borderRadius: "50%",
                                          background: offer.enabled ? "#16a34a" : "#94a3b8",
                                        }}
                                      />
                                      {offer.enabled ? "Active" : "Disabled"}
                                    </button>

                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={async () => {
                                        if (window.confirm(`Delete offer "${offer.title}"?`)) {
                                          const updatedOffers = (config.offers || []).filter((o) => o.id !== offer.id);
                                          const updated = { ...config, offers: updatedOffers };
                                          setConfig(updated);
                                          const ok = await write({ action: "settings", settings: updated });
                                          if (ok) {
                                            setData({ ...data, settings: updated });
                                            toast.success("Offer deleted");
                                          }
                                        }
                                      }}
                                      style={{
                                        border: "1px solid #fecaca",
                                        background: "#fff5f5",
                                        color: "#dc2626",
                                        borderRadius: 6,
                                        padding: "5px 8px",
                                        cursor: "pointer",
                                        display: "grid",
                                        placeItems: "center",
                                      }}
                                      title="Delete offer"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 4. Coupons Subtab */}
                    {settingsSubTab === "coupons" && (
                      <div className="admin-settings" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {/* Create Coupon Card */}
                        <div className="admin-card">
                          <div className="admin-card-head">
                            <div>
                              <h2>Create new coupon code</h2>
                              <p>Add voucher discount codes for checkout with custom spend limits and expiry dates.</p>
                            </div>
                            <Tags size={20} />
                          </div>
                          <div className="admin-fields">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                              <label>
                                Coupon code *
                                <input
                                  value={newCouponCode}
                                  onChange={(e) => setNewCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                                  placeholder="e.g. WELCOME10, EID2026"
                                  style={{ textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px" }}
                                />
                              </label>
                              <label>
                                Discount type
                                <select
                                  value={newCouponType}
                                  onChange={(e: any) => setNewCouponType(e.target.value)}
                                  style={{ width: "100%", height: 38, border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 10px" }}
                                >
                                  <option value="percentage">Percentage (% Off)</option>
                                  <option value="fixed">Fixed Cash Amount (PKR Off)</option>
                                </select>
                              </label>
                              <label>
                                Discount value ({newCouponType === "percentage" ? "%" : "PKR"}) *
                                <input
                                  type="number"
                                  min="1"
                                  value={newCouponValue}
                                  onChange={(e) => setNewCouponValue(e.target.value)}
                                />
                              </label>
                              <label>
                                Minimum spend required (PKR)
                                <input
                                  type="number"
                                  min="0"
                                  value={newCouponMinSpend}
                                  onChange={(e) => setNewCouponMinSpend(e.target.value)}
                                  placeholder="e.g. 1500"
                                />
                              </label>
                              <label>
                                Expiry date (Optional)
                                <input
                                  type="date"
                                  value={newCouponExpiry}
                                  onChange={(e) => setNewCouponExpiry(e.target.value)}
                                />
                              </label>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                              <button
                                type="button"
                                className="admin-primary"
                                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                                disabled={!newCouponCode.trim() || !newCouponValue || busy}
                                onClick={async () => {
                                  const code = newCouponCode.trim().toUpperCase();
                                  if ((config.coupons || []).some((c) => c.code === code)) {
                                    toast.error(`Coupon code "${code}" already exists.`);
                                    return;
                                  }
                                  const newCoupon: any = {
                                    id: `c-${Date.now()}`,
                                    code,
                                    type: newCouponType,
                                    value: Number(newCouponValue) || 10,
                                    minSpend: Number(newCouponMinSpend) || 0,
                                    status: "Active",
                                    usageCount: 0,
                                    expiryDate: newCouponExpiry || undefined,
                                  };
                                  const updatedCoupons = [newCoupon, ...(config.coupons || [])];
                                  const updated = { ...config, coupons: updatedCoupons };
                                  setConfig(updated);
                                  setSettingsSaved(false);
                                  const ok = await write({ action: "settings", settings: updated });
                                  if (ok) {
                                    setData({ ...data, settings: updated });
                                    setSettingsSaved(true);
                                    setNewCouponCode("");
                                    setNewCouponValue("10");
                                    setNewCouponExpiry("");
                                    toast.success(`Coupon "${code}" created successfully!`);
                                  }
                                }}
                              >
                                <Plus size={16} /> Create Coupon
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Coupons Table */}
                        <div className="admin-card">
                          <div className="admin-card-head">
                            <div>
                              <h2>Active discount coupons ({(config.coupons || []).length})</h2>
                              <p>Manage customer promo vouchers and usage records.</p>
                            </div>
                          </div>

                          {(config.coupons || []).length === 0 ? (
                            <div className="admin-empty" style={{ padding: "30px 20px" }}>
                              <Tags size={32} style={{ color: "#94a3b8" }} />
                              <h3>No discount coupons created yet</h3>
                              <p>Create promotional vouchers using the form above.</p>
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Coupon Code</TableHead>
                                  <TableHead>Discount Value</TableHead>
                                  <TableHead>Min Spend</TableHead>
                                  <TableHead>Uses</TableHead>
                                  <TableHead>Expiry</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead style={{ textAlign: "right" }}>Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(config.coupons || []).map((cpn) => (
                                  <TableRow key={cpn.id || cpn.code}>
                                    <TableCell>
                                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <code style={{ background: "#ede9fe", color: "#5b21b6", padding: "2px 8px", borderRadius: 6, fontWeight: 800, fontSize: 13, letterSpacing: "0.5px" }}>
                                          {cpn.code}
                                        </code>
                                        <button
                                          type="button"
                                          title="Copy coupon code"
                                          onClick={() => {
                                            navigator.clipboard?.writeText(cpn.code);
                                            toast.info(`Copied "${cpn.code}" to clipboard`);
                                          }}
                                          style={{ border: 0, background: "none", cursor: "pointer", padding: 2, color: "#94a3b8" }}
                                        >
                                          <Copy size={12} />
                                        </button>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <b>{cpn.type === "percentage" ? `${cpn.value}% Off` : money(cpn.value) + " Off"}</b>
                                    </TableCell>
                                    <TableCell>{cpn.minSpend ? money(cpn.minSpend) : "No minimum"}</TableCell>
                                    <TableCell>
                                      <span style={{ fontWeight: 600, color: "#475569" }}>{cpn.usageCount || 0} times</span>
                                    </TableCell>
                                    <TableCell>
                                      {cpn.expiryDate ? new Date(cpn.expiryDate).toLocaleDateString("en-PK") : <span style={{ color: "#94a3b8" }}>Never</span>}
                                    </TableCell>
                                    <TableCell>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={async () => {
                                          const nextStatus = cpn.status === "Active" ? "Inactive" : "Active";
                                          const updatedCoupons = (config.coupons || []).map((c) =>
                                            c.id === cpn.id ? { ...c, status: nextStatus as any } : c
                                          );
                                          const updated = { ...config, coupons: updatedCoupons };
                                          setConfig(updated);
                                          const ok = await write({ action: "settings", settings: updated });
                                          if (ok) {
                                            setData({ ...data, settings: updated });
                                            toast.success(`Coupon ${cpn.code} set to ${nextStatus}`);
                                          }
                                        }}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 6,
                                          padding: "3px 8px",
                                          borderRadius: 999,
                                          fontSize: 11,
                                          fontWeight: 600,
                                          cursor: "pointer",
                                          border: cpn.status === "Active" ? "1px solid #86efac" : "1px solid #cbd5e1",
                                          background: cpn.status === "Active" ? "#f0fdf4" : "#f8fafc",
                                          color: cpn.status === "Active" ? "#15803d" : "#64748b",
                                        }}
                                      >
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: cpn.status === "Active" ? "#16a34a" : "#94a3b8" }} />
                                        {cpn.status}
                                      </button>
                                    </TableCell>
                                    <TableCell style={{ textAlign: "right" }}>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={async () => {
                                          if (window.confirm(`Delete coupon "${cpn.code}"?`)) {
                                            const updatedCoupons = (config.coupons || []).filter((c) => c.id !== cpn.id);
                                            const updated = { ...config, coupons: updatedCoupons };
                                            setConfig(updated);
                                            const ok = await write({ action: "settings", settings: updated });
                                            if (ok) {
                                              setData({ ...data, settings: updated });
                                              toast.success(`Coupon "${cpn.code}" deleted`);
                                            }
                                          }
                                        }}
                                        style={{
                                          border: "1px solid #fecaca",
                                          background: "#fff5f5",
                                          color: "#dc2626",
                                          borderRadius: 6,
                                          padding: "4px 8px",
                                          cursor: "pointer",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 4,
                                          fontSize: 11,
                                          fontWeight: 600,
                                        }}
                                      >
                                        <Trash2 size={12} /> Delete
                                      </button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 5. Information Pages Subtab */}
                    {settingsSubTab === "info_pages" && (() => {
                      const pagesList = config.infoPages && config.infoPages.length > 0
                        ? config.infoPages
                        : [
                            { id: "about", title: "About Cartify Pakistan", slug: "about-us", content: "Cartify is Pakistan's premier destination for curated fashion, footwear, bags, and everyday essentials with guaranteed Cash on Delivery across 200+ cities.", enabled: true },
                            { id: "shipping", title: "Shipping & Delivery Policy", slug: "shipping-policy", content: "We ship all orders across Pakistan via Trax Logistics, TCS, and Leopards Express. Standard delivery takes 2-4 working days. Cash on delivery is accepted nationwide.", enabled: true },
                            { id: "returns", title: "7-Day Easy Returns & Exchange", slug: "return-policy", content: "If you receive a damaged or incorrect item, or if the size doesn't fit, you can request an exchange or return within 7 days of delivery by contacting customer support on WhatsApp.", enabled: true },
                            { id: "privacy", title: "Privacy Policy", slug: "privacy-policy", content: "Your personal details, contact numbers, and delivery address are strictly confidential and only used for order dispatch, verification calls, and courier tracking updates.", enabled: true },
                            { id: "terms", title: "Terms & Conditions", slug: "terms", content: "By placing an order on Cartify Pakistan, you agree to inspect packages upon arrival and provide accurate shipping address details for Cash on Delivery dispatch.", enabled: true },
                          ];
                      const activePage = pagesList.find((p) => p.id === selectedInfoPageId) || pagesList[0];

                      return (
                        <div className="admin-settings" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                          <div className="admin-card">
                            <div className="admin-card-head">
                              <div>
                                <h2>Information & policy pages</h2>
                                <p>Edit customer service policies, About Us, Shipping policy, Return & Refund policy, and Terms.</p>
                              </div>
                              <FileText size={20} />
                            </div>

                            {/* Page Select Pills */}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "14px 20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                              {pagesList.map((page) => (
                                <button
                                  key={page.id}
                                  type="button"
                                  onClick={() => setSelectedInfoPageId(page.id)}
                                  style={{
                                    padding: "7px 14px",
                                    borderRadius: 8,
                                    fontSize: 12.5,
                                    fontWeight: selectedInfoPageId === page.id ? 700 : 500,
                                    background: selectedInfoPageId === page.id ? "#6351f4" : "#ffffff",
                                    color: selectedInfoPageId === page.id ? "#ffffff" : "#475569",
                                    border: selectedInfoPageId === page.id ? "1px solid #6351f4" : "1px solid #cbd5e1",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  {page.title}
                                </button>
                              ))}
                            </div>

                            <form
                              className="admin-fields"
                              onSubmit={async (e) => {
                                e.preventDefault();
                                setSettingsSaved(false);
                                const updated = { ...config, infoPages: pagesList };
                                const ok = await write({ action: "settings", settings: updated });
                                if (ok) {
                                  setData({ ...data, settings: updated });
                                  setSettingsSaved(true);
                                  toast.success(`Page "${activePage.title}" saved successfully!`);
                                }
                              }}
                            >
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                <label>
                                  Page title
                                  <input
                                    value={activePage.title}
                                    onChange={(e) => {
                                      const updatedPages = pagesList.map((p) =>
                                        p.id === activePage.id ? { ...p, title: e.target.value } : p
                                      );
                                      setConfig({ ...config, infoPages: updatedPages });
                                    }}
                                  />
                                </label>
                                <label>
                                  URL Slug
                                  <input
                                    value={activePage.slug}
                                    onChange={(e) => {
                                      const updatedPages = pagesList.map((p) =>
                                        p.id === activePage.id ? { ...p, slug: e.target.value } : p
                                      );
                                      setConfig({ ...config, infoPages: updatedPages });
                                    }}
                                  />
                                </label>
                              </div>

                              <label style={{ marginTop: 12 }}>
                                Policy / page content
                                <textarea
                                  rows={8}
                                  value={activePage.content}
                                  onChange={(e) => {
                                    const updatedPages = pagesList.map((p) =>
                                      p.id === activePage.id ? { ...p, content: e.target.value } : p
                                    );
                                    setConfig({ ...config, infoPages: updatedPages });
                                  }}
                                  style={{ width: "100%", padding: "10px 12px", fontSize: 13, lineHeight: 1.6, border: "1px solid #cbd5e1", borderRadius: 8 }}
                                />
                              </label>

                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", margin: 0 }}>
                                  <input
                                    type="checkbox"
                                    checked={activePage.enabled}
                                    onChange={(e) => {
                                      const updatedPages = pagesList.map((p) =>
                                        p.id === activePage.id ? { ...p, enabled: e.target.checked } : p
                                      );
                                      setConfig({ ...config, infoPages: updatedPages });
                                    }}
                                    style={{ width: 16, height: 16, accentColor: "#6351f4" }}
                                  />
                                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>Publish page on storefront footer links</span>
                                </label>

                                <button type="submit" className="admin-primary" disabled={busy}>
                                  {settingsSaved && !busy ? <CheckCircle2 size={17} /> : <Save size={17} />}
                                  {busy ? "Saving…" : "Save Information Page"}
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 6. Theme Setting / Banners Subtab */}
                    {settingsSubTab === "theme_setting" && (
                      <>
                        <ThemeEditor
                          config={config}
                          onSave={async (updated) => {
                            setConfig(updated);
                            setSettingsSaved(false);
                            const ok = await write({ action: "settings", settings: updated });
                            if (ok) {
                              setSettingsSaved(true);
                              setData({ ...data, settings: updated });
                            }
                            return ok;
                          }}
                        />
                        <DealCarousels config={config} products={products} onSave={async (updated) => {
                          const ok = await write({ action: "settings", settings: updated });
                          if (ok) { setConfig(updated); setData({ ...data, settings: updated }); }
                          return ok;
                        }} />
                        <BannersManager
                          config={config}
                          onSave={async (updated) => {
                            setConfig(updated);
                            setSettingsSaved(false);
                            const ok = await write({ action: "settings", settings: updated });
                            if (ok) {
                              setSettingsSaved(true);
                              setData({ ...data, settings: updated });
                              toast.success("Banner carousel & theme settings saved");
                            }
                            return ok;
                          }}
                        />
                      </>
                    )}

                    {/* 7. Category Settings Subtab */}
                    {settingsSubTab === "categories" && (
                      <Categories
                        onChange={(categories) =>
                          setData((current) => (current ? { ...current, categories } : current))
                        }
                      />
                    )}
                  </>
                )}
              </>
            )
          )}
          <div className="admin-bottom">
            <span>Cartify Pakistan · Store management</span>
            <span>All amounts in PKR</span>
          </div>
        </div>
      </div>
      {priceEditing && (() => {
        const groupVariants = variantsFor(priceEditing);
        const hasVariants = groupVariants.length > 1;
        return (
          <Dialog open onOpenChange={(open) => { if (!open && !busy) setPriceEditing(null); }}>
            <DialogContent className="admin-dialog price-dialog" style={{ width: "94vw", maxWidth: priceMode === "bundle" ? 1120 : 680, maxHeight: "90vh", overflowY: "auto" }}>
              <DialogHeader>
                <DialogTitle>Option / Variant Prices</DialogTitle>
                <DialogDescription>Set normal price and sale price for each variant option of {priceEditing.name}.</DialogDescription>
              </DialogHeader>
              <form
                className="admin-fields"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const price = Number(priceValue);
                  const old = Number(originalPriceValue);
                  const costPrice = costPriceValue !== "" ? Number(costPriceValue) : undefined;
                  const offerPrice = offerPriceValue !== "" ? Number(offerPriceValue) : undefined;
                  const offerStart = offerStartValue || undefined;
                  const offerEnd = offerEndValue || undefined;
                  const bundles = priceMode === "bundle"
                    ? bundleRows
                        .map((row) => ({
                          id: row.id,
                          quantity: Math.max(1, Number(row.quantity) || 1),
                          price: Math.max(0, Number(row.totalPrice) || 0),
                          content: row.promo.trim(),
                          contentArabic: row.promoArabic.trim(),
                        }))
                        .filter((row) => row.price > 0)
                    : [];

                  if (priceMode === "bundle" && !bundles.length) {
                    toast.error("Add at least one valid bundle tier before saving.");
                    return;
                  }

                  // Save parent / base product price
                  let ok = await write({
                    action: "product",
                    product: { ...priceEditing, price, old, costPrice, offerPrice, offerStart, offerEnd, bundles, pricingType: priceMode === "bundle" ? "bundle" : "offer" },
                  });

                  // Save variant-wise Normal Price & Sale Price
                  for (const variant of groupVariants) {
                    if (!ok) break;
                    const vP = variantPrices[variant.id];
                    if (vP) {
                      const vNormal = Number(vP.old) || old;
                      const vSale = Number(vP.price) || price;
                      ok = await write({
                        action: "product",
                        product: { ...variant, price: vSale, old: vNormal, costPrice, offerPrice, offerStart, offerEnd },
                      });
                    }
                  }

                  if (ok) {
                    await load();
                    setPriceEditing(null);
                    setVariantPrices({});
                    setBundleRows([]);
                    toast.success("Option-wise prices updated successfully");
                  }
                }}
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
                {/* Pricing Strategy Mode Selector Radio Buttons */}
                {(
                  <div style={{ background: "#f8fafc", padding: 14, borderRadius: 12, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Select Pricing Strategy Mode
                    </span>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: priceMode === "uniform" ? "#2563eb" : "#475569", margin: 0 }}>
                        <input
                          type="radio"
                          name="priceMode"
                          value="uniform"
                          checked={priceMode === "uniform"}
                          onChange={() => setPriceMode("uniform")}
                          style={{ width: 16, height: 16, accentColor: "#2563eb", cursor: "pointer" }}
                        />
                        Single / Uniform Price (Same for all colours)
                      </label>
                      {hasVariants && (
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: priceMode === "variant" ? "#2563eb" : "#475569", margin: 0 }}>
                          <input
                            type="radio"
                            name="priceMode"
                            value="variant"
                            checked={priceMode === "variant"}
                            onChange={() => setPriceMode("variant")}
                            style={{ width: 16, height: 16, accentColor: "#2563eb", cursor: "pointer" }}
                          />
                          Option / Colour-Wise Custom Prices
                        </label>
                      )}
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: priceMode === "offer" ? "#d48806" : "#475569", margin: 0 }}>
                        <input
                          type="radio"
                          name="priceMode"
                          value="offer"
                          checked={priceMode === "offer"}
                          onChange={() => setPriceMode("offer")}
                          style={{ width: 16, height: 16, accentColor: "#d48806", cursor: "pointer" }}
                        />
                        Offer-Wise Prices
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: priceMode === "bundle" ? "#6254ff" : "#475569", margin: 0 }}>
                        <input
                          type="radio"
                          name="priceMode"
                          value="bundle"
                          checked={priceMode === "bundle"}
                          onChange={() => setPriceMode("bundle")}
                          style={{ width: 16, height: 16, accentColor: "#6254ff", cursor: "pointer" }}
                        />
                        Bundle Price
                      </label>
                    </div>
                  </div>
                )}

                {/* Single / Uniform Price Section */}
                {(!hasVariants || priceMode === "uniform") && (
                  <div style={{ background: "#ffffff", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 12 }}>
                      {hasVariants ? "Uniform Price for All Variants" : "Product Price"}
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      <label style={{ margin: 0 }}>
                        Normal Price (PKR) *
                        <input type="number" min="0" step="1" required value={originalPriceValue} onChange={(e) => setOriginalPriceValue(e.target.value)} />
                      </label>
                      <label style={{ margin: 0 }}>
                        Sale Price (PKR) *
                        <input type="number" min="0" step="1" required value={priceValue} onChange={(e) => setPriceValue(e.target.value)} />
                      </label>
                      <label style={{ margin: 0 }}>
                        Cost Price (PKR)
                        <input type="number" min="0" step="1" placeholder="Optional" value={costPriceValue} onChange={(e) => setCostPriceValue(e.target.value)} />
                      </label>
                    </div>
                  </div>
                )}

                {/* Promotional Offer & Countdown Timer Section - Only shown when Offer-Wise mode is active */}
                {priceMode === "offer" && (
                  <div style={{ background: "#fffbe6", padding: 16, borderRadius: 12, border: "1px solid #ffe58f" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#d48806", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 12 }}>
                      🔥 Promotional Offer & Countdown Timer
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      <label style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#475569" }}>
                        Offer Price (PKR)
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="e.g. 599"
                          value={offerPriceValue}
                          onChange={(e) => setOfferPriceValue(e.target.value)}
                          style={{ marginTop: 4 }}
                        />
                      </label>
                      <label style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#475569" }}>
                        Offer Start Date
                        <input
                          type="date"
                          value={offerStartValue}
                          onChange={(e) => setOfferStartValue(e.target.value)}
                          style={{ marginTop: 4 }}
                        />
                      </label>
                      <label style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#475569" }}>
                        Offer End Date
                        <input
                          type="date"
                          value={offerEndValue}
                          onChange={(e) => setOfferEndValue(e.target.value)}
                          style={{ marginTop: 4 }}
                        />
                      </label>
                    </div>
                    <span style={{ fontSize: 11, color: "#8c6b00", display: "block", marginTop: 8 }}>
                      Note: Active offer price automatically starts the live countdown timer on product detail page when current time is within start/end window.
                    </span>
                  </div>
                )}

                {priceMode === "bundle" && (
                  <div style={{ background: "#ffffff", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(32,54,83,.04)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 750, color: "#33456a", display: "block" }}>Bundle pricing</span>
                        <span style={{ fontSize: 11, color: "#71809a" }}>Set a fixed total for each exact quantity. Customers are charged the selected bundle price.</span>
                      </div>
                      <span style={{ fontSize: 11, color: "#6254ff", background: "#f0eeff", padding: "5px 8px", borderRadius: 6, fontWeight: 700 }}>Automatic savings</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 280px) 1fr", gap: 14, marginBottom: 18 }}>
                      <label style={{ margin: 0, fontSize: 12, fontWeight: 650, color: "#52627e" }}>
                        Normal price *
                        <input type="number" min="0" step="1" required value={originalPriceValue} onChange={(e) => setOriginalPriceValue(e.target.value)} />
                      </label>
                      <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8, fontSize: 11, color: "#7b879b" }}>
                        Bundle rows use the normal price to calculate per-piece savings.
                      </div>
                    </div>

                    <div className="bundle-pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.45fr 28px", gap: 8, alignItems: "center", marginBottom: 8, color: "#52627e", fontSize: 10.5, fontWeight: 750, textTransform: "uppercase", letterSpacing: ".35px" }}>
                      <span>Quantity</span><span>Total price</span><span>Per piece</span><span>Promotional text</span><span />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                      {bundleRows.map((row, index) => {
                        const quantity = Math.max(1, Number(row.quantity) || 1);
                        const total = Math.max(0, Number(row.totalPrice) || 0);
                        const perPiece = quantity ? total / quantity : 0;
                        const normal = Math.max(0, Number(originalPriceValue) || 0);
                        const saving = normal > 0 && perPiece < normal ? Math.round((1 - perPiece / normal) * 100) : 0;
                        return (
                          <div key={row.id} className="bundle-pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.45fr 28px", gap: 8, alignItems: "center" }}>
                            <input aria-label={`Bundle quantity ${index + 1}`} type="number" min="1" step="1" value={row.quantity} onChange={(e) => setBundleRows((rows) => rows.map((current) => current.id === row.id ? { ...current, quantity: e.target.value } : current))} />
                            <input aria-label={`Bundle total price ${index + 1}`} type="number" min="0" step="1" value={row.totalPrice} onChange={(e) => setBundleRows((rows) => rows.map((current) => current.id === row.id ? { ...current, totalPrice: e.target.value } : current))} />
                            <span style={{ fontSize: 12, color: "#52627e", whiteSpace: "nowrap" }}>{money(perPiece)} {saving > 0 && <b style={{ color: "#16a34a", fontSize: 10 }}>(-{saving}%)</b>}</span>
                            <input aria-label={`Bundle promotional text ${index + 1}`} placeholder="Promotional text" value={row.promo} onChange={(e) => setBundleRows((rows) => rows.map((current) => current.id === row.id ? { ...current, promo: e.target.value } : current))} />
                            <button type="button" aria-label={`Remove bundle ${index + 1}`} disabled={bundleRows.length <= 1} onClick={() => setBundleRows((rows) => rows.filter((current) => current.id !== row.id))} style={{ width: 28, height: 28, borderRadius: 7, background: bundleRows.length <= 1 ? "#f8fafc" : "#fff1f2", color: bundleRows.length <= 1 ? "#cbd5e1" : "#ef4444", fontWeight: 800 }}>
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <button type="button" onClick={() => setBundleRows((rows) => [...rows, { id: `bundle-${Date.now()}`, quantity: String((Number(rows[rows.length - 1]?.quantity) || 0) + 1), totalPrice: "", promo: "", promoArabic: "" }])} style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 10px", border: "1px solid #6254ff", borderRadius: 7, color: "#6254ff", fontSize: 11.5, fontWeight: 700, background: "#faf9ff" }}>
                      <Plus size={13} /> Add bundle
                    </button>
                  </div>
                )}

                {/* Option / Variant-Wise Price Fields (Matching User Reference Image) */}
                {hasVariants && priceMode === "variant" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                      Option / Colour-Wise Prices ({groupVariants.length} Variants)
                    </span>
                    {groupVariants.map((variant) => {
                      const vName = variant.color || variant.name || "Default";
                      const vSku = variant.sku || variant.id;
                      const currentP = variantPrices[variant.id] || { price: String(variant.price), old: String(variant.old || variant.price) };
                      return (
                        <div
                          key={variant.id}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                            padding: 14,
                            borderRadius: 10,
                            border: "1px solid #e2e8f0",
                            background: "#ffffff",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <img src={photo(variant)} alt={vName} style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 4, background: "#f8fafc" }} />
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#2563eb" }}>{vName}</span>
                            </div>
                            <span style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>
                              SKU: {vSku}
                            </span>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                            <label style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#475569" }}>
                              {vName}–Normal Price (PKR) *
                              <input
                                type="number"
                                min="0"
                                step="1"
                                required
                                value={currentP.old}
                                onChange={(e) =>
                                  setVariantPrices((prev) => ({
                                    ...prev,
                                    [variant.id]: { ...(prev[variant.id] || currentP), old: e.target.value },
                                  }))
                                }
                                placeholder="120.00"
                                style={{ marginTop: 4 }}
                              />
                            </label>
                            <label style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#475569" }}>
                              {vName}–Sale Price (PKR)
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={currentP.price}
                                onChange={(e) =>
                                  setVariantPrices((prev) => ({
                                    ...prev,
                                    [variant.id]: { ...(prev[variant.id] || currentP), price: e.target.value },
                                  }))
                                }
                                placeholder="79.00"
                                style={{ marginTop: 4 }}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button className="admin-primary" disabled={busy} style={{ height: 42, borderRadius: 10, fontSize: 14, fontWeight: 700, marginTop: 10 }}>
                  {busy ? "Saving…" : "Save Variant Prices"}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        );
      })()}
      {stockEditing && (() => {
        const hasEmbeddedVariants = Boolean(stockEditing.variants && stockEditing.variants.length > 0);

        // Extract strictly only the sizes that were actually configured for THIS product listing
        const productAllSizes: string[] = [];
        if ((stockEditing as any).variantOptions && Array.isArray((stockEditing as any).variantOptions)) {
          const sizeOpt = (stockEditing as any).variantOptions.find((o: any) => o.name.toLowerCase() === "size");
          if (sizeOpt && Array.isArray(sizeOpt.values) && sizeOpt.values.length > 0) {
            for (const s of sizeOpt.values) {
              if (s && s !== "Standard" && !productAllSizes.includes(s)) {
                productAllSizes.push(s);
              }
            }
          }
        }
        if (productAllSizes.length === 0 && stockEditing.sizes && stockEditing.sizes.length > 0) {
          for (const s of stockEditing.sizes) {
            if (s && s !== "Standard" && !productAllSizes.includes(s)) {
              productAllSizes.push(s);
            }
          }
        }
        if (productAllSizes.length === 0 && hasEmbeddedVariants) {
          for (const v of stockEditing.variants || []) {
            if (v.size && v.size !== "Standard" && !productAllSizes.includes(v.size)) {
              productAllSizes.push(v.size);
            }
          }
        }
        if (productAllSizes.length === 0 && stockEditing.sizeStock && Object.keys(stockEditing.sizeStock).length > 0) {
          for (const s of Object.keys(stockEditing.sizeStock)) {
            if (s && s !== "Standard" && !productAllSizes.includes(s)) {
              productAllSizes.push(s);
            }
          }
        }
        
        let colorVariantItems: Array<{
          color: string;
          colorHex?: string;
          sku?: string;
          image?: string;
          stock: number;
          sizes: string[];
          sizeStock: Record<string, number>;
        }> = [];

        if (hasEmbeddedVariants) {
          const colorMap = new Map<string, { color: string; colorHex?: string; sku?: string; image?: string; stock: number; sizes: string[]; sizeStock: Record<string, number> }>();
          for (const v of stockEditing.variants || []) {
            if (!v.color || v.color === "Not applicable") continue;
            const existing = colorMap.get(v.color);
            if (!existing) {
              const sizeStock: Record<string, number> = {};
              const sizes: string[] = [];
              if (v.size && v.size !== "Standard") {
                sizes.push(v.size);
                sizeStock[v.size] = Number(v.stock || 0);
              }
              colorMap.set(v.color, {
                color: v.color,
                colorHex: v.colorHex,
                sku: v.sku || `${stockEditing.sku || stockEditing.id}-${slug(v.color).toUpperCase()}`,
                image: v.images?.[0] || v.image || stockEditing.image,
                stock: Number(v.stock || 0),
                sizes,
                sizeStock,
              });
            } else {
              existing.stock += Number(v.stock || 0);
              if (v.size && v.size !== "Standard" && !existing.sizes.includes(v.size)) {
                existing.sizes.push(v.size);
              }
              if (v.size && v.size !== "Standard") {
                existing.sizeStock[v.size] = Number(v.stock || 0);
              }
            }
          }

          // Duplicate productAllSizes across ALL color variants so every color has all sizes
          for (const item of colorMap.values()) {
            if (productAllSizes.length > 0) {
              for (const sz of productAllSizes) {
                if (!item.sizes.includes(sz)) {
                  item.sizes.push(sz);
                }
                if (item.sizeStock[sz] === undefined) {
                  item.sizeStock[sz] = 0;
                }
              }
              item.sizes.sort((a, b) => {
                const idxA = productAllSizes.indexOf(a);
                const idxB = productAllSizes.indexOf(b);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                return 0;
              });
            }
          }

          colorVariantItems = Array.from(colorMap.values());
        }

        const stockVariants = variantsFor(stockEditing);
        const group = stockEditing.listingGroup || stockEditing.id;
        const hasChildProducts = !hasEmbeddedVariants && stockVariants.some((item) => item.id !== group && item.color && item.color.toLowerCase() !== "not applicable");
        const visibleStockVariants = hasChildProducts
          ? stockVariants.filter((item) => item.id !== group && item.color && item.color.toLowerCase() !== "not applicable")
          : stockVariants;

        const existingColorNames = hasEmbeddedVariants
          ? colorVariantItems.map((c) => c.color.toLowerCase())
          : stockVariants.map((v) => (v.color || "").toLowerCase());
        const availableStockColors = colors.filter((color) => color !== "Not applicable" && !existingColorNames.includes(color.toLowerCase()));

        // Calculate live overall stock from inputs
        let liveOverallStock = 0;
        if (hasEmbeddedVariants) {
          liveOverallStock = colorVariantItems.reduce((acc, c) => {
            if (c.sizes.length > 0) {
              const sum = c.sizes.reduce((sAcc, sz) => {
                const raw = stockValues[`color:${c.color}:size:${sz}`] ?? String(c.sizeStock[sz] ?? 0);
                const val = Number(raw);
                return sAcc + (Number.isFinite(val) && val >= 0 ? val : 0);
              }, 0);
              return acc + sum;
            }
            const val = Number(stockValues[`color:${c.color}`] ?? c.stock);
            return acc + (Number.isFinite(val) && val >= 0 ? val : 0);
          }, 0);
          if (stockColorChoice) {
            if (productAllSizes.length > 0) {
              const newSum = productAllSizes.reduce((sAcc, sz) => {
                const raw = stockValues[`new_color:${stockColorChoice}:size:${sz}`] ?? stockValue ?? "0";
                const val = Number(raw);
                return sAcc + (Number.isFinite(val) && val >= 0 ? val : 0);
              }, 0);
              liveOverallStock += newSum;
            } else if (Number(stockValue) > 0) {
              liveOverallStock += Number(stockValue);
            }
          }
        } else if (hasChildProducts) {
          const effectiveSizes = productAllSizes.length > 0 ? productAllSizes : (visibleStockVariants[0] ? sizeOptionsFor(visibleStockVariants[0]) : []);
          liveOverallStock = visibleStockVariants.reduce((acc, v) => {
            if (effectiveSizes.length > 0) {
              const sum = (effectiveSizes as string[]).reduce((sAcc: number, sz: string) => {
                const raw = stockValues[v.id + ":" + sz] ?? String(((v as any).sizeStock || {})[sz] ?? 0);
                const val = Number(raw);
                return sAcc + (Number.isFinite(val) && val >= 0 ? val : 0);
              }, 0);
              return acc + sum;
            }
            const val = Number(stockValues[v.id] ?? (v as any).stock ?? 0);
            return acc + (Number.isFinite(val) && val >= 0 ? val : 0);
          }, 0);
          if (stockColorChoice) {
            if (productAllSizes.length > 0) {
              const newSum = productAllSizes.reduce((sAcc, sz) => {
                const raw = stockValues[`new_child:${stockColorChoice}:size:${sz}`] ?? stockValue ?? "0";
                const val = Number(raw);
                return sAcc + (Number.isFinite(val) && val >= 0 ? val : 0);
              }, 0);
              liveOverallStock += newSum;
            } else if (Number(stockValue) > 0) {
              liveOverallStock += Number(stockValue);
            }
          }
        } else {
          const val = Number(stockValues[stockEditing.id] ?? (stockEditing as any).stock ?? 0);
          liveOverallStock = Number.isFinite(val) && val >= 0 ? val : 0;
          if (stockColorChoice && Number(stockValue) > 0) {
            liveOverallStock += Number(stockValue);
          }
        }

        return (
          <Dialog
            open
            onOpenChange={(open) => {
              if (!open && !busy) {
                setStockEditing(null);
                setStockHighlightColor(null);
              }
            }}
          >
            <DialogContent className="admin-dialog stock-dialog" style={{ maxWidth: 780, maxHeight: "90vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", borderRadius: 16 }}>
              <DialogHeader style={{ padding: "18px 24px 14px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <DialogTitle style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                      Add & Manage Stock
                    </DialogTitle>
                    <DialogDescription style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                      {hasEmbeddedVariants || hasChildProducts
                        ? "Set and update stock quantity for each colour variant and size. Overall stock syncs automatically."
                        : "Set and update stock quantity for the product."}
                    </DialogDescription>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", background: "#ffffff", padding: "6px 14px", borderRadius: 8, border: "1px solid #cbd5e1" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>Overall Stock</span>
                    <b style={{ fontSize: 16, fontWeight: 800, color: liveOverallStock > 0 ? "#16a34a" : "#dc2626" }}>
                      {liveOverallStock} units
                    </b>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <Package size={14} style={{ color: "#2563eb" }} />
                  <strong style={{ color: "#1e293b", fontWeight: 700 }}>{stockEditing.name}</strong>
                  {stockEditing.sku && (
                    <span style={{ background: "#e2e8f0", color: "#475569", padding: "1px 6px", borderRadius: 4, fontSize: 11, fontFamily: "monospace", fontWeight: 600 }}>
                      SKU: {stockEditing.sku}
                    </span>
                  )}
                </div>
              </DialogHeader>

              <form
                className="admin-fields"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (hasEmbeddedVariants) {
                    const baseSku = stockEditing.sku || stockEditing.id || "PROD";
                    const newVariants: ProductVariant[] = [];

                    // 1. Process all existing colors
                    for (const c of colorVariantItems) {
                      if (c.sizes.length > 0) {
                        for (const sz of c.sizes) {
                          const existingV = (stockEditing.variants || []).find(
                            (v) => (v.color || "").toLowerCase() === c.color.toLowerCase() && v.size === sz
                          );
                          const raw = stockValues[`color:${c.color}:size:${sz}`] ?? String(c.sizeStock[sz] ?? 0);
                          let vStock = Number(raw);
                          if (!Number.isFinite(vStock) || vStock < 0) vStock = 0;

                          newVariants.push({
                            id: existingV?.id || `${stockEditing.id}-${slug(c.color)}-${slug(sz)}-${Date.now()}`,
                            title: `${stockEditing.name.replace(/\s+·\s+.+$/, "")} · ${c.color} · ${sz}`,
                            color: c.color,
                            colorHex: c.colorHex,
                            sku: existingV?.sku || `${baseSku}-${slug(c.color).toUpperCase()}-${slug(sz).toUpperCase()}`,
                            size: sz,
                            stock: vStock,
                            price: existingV?.price ?? stockEditing.price,
                            oldPrice: existingV?.oldPrice ?? stockEditing.old,
                            image: existingV?.image || c.image || stockEditing.image,
                            images: existingV?.images || (c.image ? [c.image] : undefined),
                            status: vStock > 0 ? "Active" : "Draft",
                          });
                        }
                      } else {
                        const existingV = (stockEditing.variants || []).find(
                          (v) => (v.color || "").toLowerCase() === c.color.toLowerCase()
                        );
                        const raw = stockValues[`color:${c.color}`] ?? String(c.stock ?? 0);
                        let vStock = Number(raw);
                        if (!Number.isFinite(vStock) || vStock < 0) vStock = 0;

                        newVariants.push({
                          id: existingV?.id || `${stockEditing.id}-${slug(c.color)}-${Date.now()}`,
                          title: `${stockEditing.name.replace(/\s+·\s+.+$/, "")} · ${c.color}`,
                          color: c.color,
                          colorHex: c.colorHex,
                          sku: existingV?.sku || `${baseSku}-${slug(c.color).toUpperCase()}`,
                          size: existingV?.size || "Standard",
                          stock: vStock,
                          price: existingV?.price ?? stockEditing.price,
                          oldPrice: existingV?.oldPrice ?? stockEditing.old,
                          image: existingV?.image || c.image || stockEditing.image,
                          images: existingV?.images || (c.image ? [c.image] : undefined),
                          status: vStock > 0 ? "Active" : "Draft",
                        });
                      }
                    }

                    // 2. Process newly added color from "+ Add Another Colour"
                    if (stockColorChoice) {
                      if (productAllSizes.length > 0) {
                        for (const sz of productAllSizes) {
                          const raw = stockValues[`new_color:${stockColorChoice}:size:${sz}`] ?? stockValue ?? "0";
                          let vStock = Number(raw);
                          if (!Number.isFinite(vStock) || vStock < 0) vStock = 0;

                          newVariants.push({
                            id: `${stockEditing.id}-${slug(stockColorChoice)}-${slug(sz)}-${Date.now()}`,
                            title: `${stockEditing.name.replace(/\s+·\s+.+$/, "")} · ${stockColorChoice} · ${sz}`,
                            color: stockColorChoice,
                            sku: `${baseSku}-${slug(stockColorChoice).toUpperCase()}-${slug(sz).toUpperCase()}`,
                            size: sz,
                            stock: vStock,
                            price: stockEditing.price,
                            oldPrice: stockEditing.old,
                            image: stockEditing.image,
                            status: vStock > 0 ? "Active" : "Draft",
                          });
                        }
                      } else {
                        const raw = Number(stockValue);
                        const vStock = Number.isFinite(raw) && raw >= 0 ? raw : 0;
                        newVariants.push({
                          id: `${stockEditing.id}-${slug(stockColorChoice)}-${Date.now()}`,
                          title: `${stockEditing.name.replace(/\s+·\s+.+$/, "")} · ${stockColorChoice}`,
                          color: stockColorChoice,
                          sku: `${baseSku}-${slug(stockColorChoice).toUpperCase()}`,
                          size: stockEditing.sizes?.[0] || "Standard",
                          stock: vStock,
                          price: stockEditing.price,
                          oldPrice: stockEditing.old,
                          image: stockEditing.image,
                          status: vStock > 0 ? "Active" : "Draft",
                        });
                      }
                    }

                    const totalStock = newVariants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
                    const updatedProduct: ManagedProduct = {
                      ...stockEditing,
                      hasVariants: true,
                      variants: newVariants,
                      stock: totalStock,
                      status: totalStock > 0 ? "Active" : stockEditing.status,
                    };

                    const ok = await write({ action: "product", product: updatedProduct });
                    if (ok) {
                      await load();
                      setStockEditing(null);
                      setStockHighlightColor(null);
                      setStockColorChoice("");
                      setStockValue("");
                      setStockValues({});
                      toast.success("Stock updated successfully");
                    }
                  } else {
                    let ok = true;
                    let totalOverall = 0;
                    const effectiveSizes = productAllSizes.length > 0 ? productAllSizes : (visibleStockVariants[0] ? sizeOptionsFor(visibleStockVariants[0]) : []);

                    for (const item of stockVariants) {
                      const itemSizes = effectiveSizes.length > 0 ? effectiveSizes : sizeOptionsFor(item);
                      const sizeEntries = (itemSizes as string[])
                        .map((size: string) => [size, stockValues[item.id + ":" + size]])
                        .filter(([, value]: any) => value !== "" && value != null);
                      const sizeStock: Record<string, number> = Object.fromEntries(sizeEntries.map(([size, value]: any) => [size, Number(value)]));
                      const sumSizeStock: number = (Object.values(sizeStock) as number[]).reduce((acc: number, val: number) => acc + (Number(val) || 0), 0);
                      const rawStock: number = Number(stockValues[item.id] ?? (item as any).stock ?? 0);
                      const finalStock: number = sizeEntries.length > 0 ? sumSizeStock : rawStock;
                      if (!Number.isFinite(finalStock) || finalStock < 0) return;

                      totalOverall += finalStock;
                      ok = await write({
                        action: "product",
                        product: {
                          ...item,
                          stock: finalStock,
                          sizes: itemSizes.length > 0 ? itemSizes : item.sizes,
                          sizeStock,
                          listingGroup: item.listingGroup || group,
                          status: finalStock > 0 ? ("Active" as const) : item.status,
                        },
                      });
                      if (!ok) break;
                    }

                    if (ok && stockColorChoice) {
                      const itemSizes = productAllSizes.length > 0 ? productAllSizes : (stockEditing.sizes?.length ? stockEditing.sizes : []);
                      let childStock = 0;
                      let childSizeStock: Record<string, number> = {};

                      if (itemSizes.length > 0) {
                        for (const sz of itemSizes) {
                          const val = Number(stockValues[`new_child:${stockColorChoice}:size:${sz}`] ?? stockValue ?? 0);
                          const cleanVal = Number.isFinite(val) && val >= 0 ? val : 0;
                          childSizeStock[sz] = cleanVal;
                          childStock += cleanVal;
                        }
                      } else {
                        const raw = Number(stockValue);
                        childStock = Number.isFinite(raw) && raw >= 0 ? raw : 0;
                      }

                      const baseId = `${group}-${slug(stockColorChoice)}`;
                      const id = products.some((item) => item.id === baseId) ? `${baseId}-${Date.now()}` : baseId;
                      const child = {
                        ...stockEditing,
                        id,
                        name: `${stockEditing.name.replace(/\s+·\s+.+$/, "")} · ${stockColorChoice}`,
                        sku: stockEditing.sku ? `${stockEditing.sku}-${slug(stockColorChoice).toUpperCase()}` : id,
                        color: stockColorChoice,
                        option: stockEditing.option || "Standard",
                        listingGroup: group,
                        status: childStock > 0 ? ("Active" as const) : ("Draft" as const),
                        stock: childStock,
                        sizes: itemSizes.length > 0 ? itemSizes : stockEditing.sizes,
                        sizeStock: itemSizes.length > 0 ? childSizeStock : undefined,
                      };
                      ok = await write({ action: "product", product: child });
                      if (ok) totalOverall += childStock;
                    }

                    if (ok && stockEditing.listingGroup) {
                      const parent = products.find((p) => p.id === group);
                      if (parent) {
                        await write({
                          action: "product",
                          product: { ...parent, stock: totalOverall, status: totalOverall > 0 ? ("Active" as const) : parent.status },
                        });
                      }
                    }

                    if (ok) {
                      await load();
                      setStockEditing(null);
                      setStockHighlightColor(null);
                      setStockColorChoice("");
                      setStockValue("");
                      setStockValues({});
                      toast.success("Stock updated successfully");
                    }
                  }
                }}
                style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}
              >
                {/* List of Colors and Stock */}
                <div className="stock-colour-list" style={{ display: "flex", flexDirection: "column", gap: 12, margin: 0 }}>
                  {hasEmbeddedVariants ? (
                    colorVariantItems.map((c) => {
                      const isTarget = stockHighlightColor && stockHighlightColor.toLowerCase() === c.color.toLowerCase();
                      
                      // Compute total for this color based on sizes if present
                      let currentNum = 0;
                      if (c.sizes.length > 0) {
                        currentNum = c.sizes.reduce((acc, sz) => {
                          const raw = stockValues[`color:${c.color}:size:${sz}`] ?? String(c.sizeStock[sz] ?? 0);
                          const val = Number(raw);
                          return acc + (Number.isFinite(val) && val >= 0 ? val : 0);
                        }, 0);
                      } else {
                        const raw = stockValues[`color:${c.color}`] ?? String(c.stock);
                        currentNum = Number(raw) || 0;
                      }

                      const invStatus = currentNum > 10 ? "In Stock" : currentNum > 0 ? "Low Stock" : "Out of Stock";
                      return (
                        <div
                          key={c.color}
                          style={{
                            padding: "14px 16px",
                            borderRadius: 12,
                            border: isTarget ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                            background: isTarget ? "#eff6ff" : "#ffffff",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                            transition: "all 0.2s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              {c.image && c.image !== "/images/placeholder.jpg" ? (
                                <img src={imageUrl(c.image)} alt={c.color} style={{ width: 42, height: 42, objectFit: "contain", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }} />
                              ) : (
                                <div style={{ width: 42, height: 42, borderRadius: 8, background: "#f1f5f9", display: "grid", placeItems: "center", color: "#94a3b8" }}>
                                  <Package size={20} />
                                </div>
                              )}
                              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  {c.colorHex && <span style={{ width: 12, height: 12, borderRadius: "50%", background: c.colorHex, border: "1px solid rgba(0,0,0,0.2)" }} />}
                                  <b style={{ fontSize: 14, color: "#0f172a" }}>{c.color}</b>
                                  <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4, textTransform: "uppercase", background: invStatus === "In Stock" ? "#f0fdf4" : invStatus === "Low Stock" ? "#fef3c7" : "#fef2f2", color: invStatus === "In Stock" ? "#16a34a" : invStatus === "Low Stock" ? "#d97706" : "#dc2626", border: `1px solid ${invStatus === "In Stock" ? "#bbf7d0" : invStatus === "Low Stock" ? "#fde68a" : "#fecaca"}` }}>
                                    {invStatus}
                                  </span>
                                </div>
                                <span style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b" }}>SKU: {c.sku}</span>
                              </div>
                            </div>

                            {/* Total Stock for this color */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Total Stock:</span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                required
                                value={String(currentNum)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (c.sizes.length > 0) {
                                    setStockValues((prev) => {
                                      const next = { ...prev };
                                      for (const s of c.sizes) {
                                        next[`color:${c.color}:size:${s}`] = val;
                                      }
                                      next[`color:${c.color}`] = String(Number(val) * c.sizes.length);
                                      return next;
                                    });
                                  } else {
                                    setStockValues((prev) => ({ ...prev, [`color:${c.color}`]: val }));
                                  }
                                }}
                                placeholder="0"
                                style={{ width: 110, height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, fontWeight: 700, color: "#0f172a", textAlign: "center", background: "#ffffff" }}
                              />
                            </div>
                          </div>

                          {/* Per-size inputs with bulk set */}
                          {c.sizes.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                                  Available Sizes ({c.sizes.length})
                                </span>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Qty"
                                    id={`bulk-sz-${slug(c.color)}`}
                                    style={{ width: 65, height: 26, fontSize: 11, padding: "0 6px", borderRadius: 4, border: "1px solid #cbd5e1", textAlign: "center" }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const el = document.getElementById(`bulk-sz-${slug(c.color)}`) as HTMLInputElement;
                                      const bVal = el ? el.value : "";
                                      if (bVal !== "") {
                                        setStockValues((prev) => {
                                          const next = { ...prev };
                                          for (const s of c.sizes) {
                                            next[`color:${c.color}:size:${s}`] = bVal;
                                          }
                                          const sum = c.sizes.length * (Number(bVal) || 0);
                                          next[`color:${c.color}`] = String(sum);
                                          return next;
                                        });
                                      }
                                    }}
                                    style={{ height: 26, padding: "0 8px", fontSize: 11, fontWeight: 600, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 4, cursor: "pointer" }}
                                  >
                                    Set all sizes
                                  </button>
                                </div>
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 8 }}>
                                {c.sizes.map((sz) => (
                                  <label key={sz} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 600, color: "#64748b" }}>
                                    <span>Size {sz}</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={stockValues[`color:${c.color}:size:${sz}`] ?? String(c.sizeStock[sz] ?? "0")}
                                      onChange={(e) => {
                                        const szVal = e.target.value;
                                        setStockValues((prev) => {
                                          const next = { ...prev, [`color:${c.color}:size:${sz}`]: szVal };
                                          const allSizeVals = c.sizes.map((s) => Number(next[`color:${c.color}:size:${s}`] ?? c.sizeStock[s] ?? 0));
                                          const sum = allSizeVals.reduce((acc, v) => acc + (Number.isFinite(v) && v >= 0 ? v : 0), 0);
                                          next[`color:${c.color}`] = String(sum);
                                          return next;
                                        });
                                      }}
                                      placeholder="0"
                                      style={{ height: 32, padding: "0 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12, fontWeight: 600, textAlign: "center", background: "#ffffff" }}
                                    />
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    visibleStockVariants.map((variant) => {
                      const isTarget = stockHighlightColor && (stockHighlightColor.toLowerCase() === (variant.color || "").toLowerCase() || stockHighlightColor.toLowerCase() === (variant.name || "").toLowerCase());
                      const effectiveSizes = productAllSizes.length > 0 ? productAllSizes : sizeOptionsFor(variant);
                      
                      let currentNum = 0;
                      if (effectiveSizes.length > 0) {
                        currentNum = (effectiveSizes as string[]).reduce((acc: number, sz: string) => {
                          const raw = stockValues[variant.id + ":" + sz] ?? String(((variant as any).sizeStock || {})[sz] ?? 0);
                          const val = Number(raw);
                          return acc + (Number.isFinite(val) && val >= 0 ? val : 0);
                        }, 0);
                      } else {
                        const raw = stockValues[variant.id] ?? String((variant as any).stock ?? 0);
                        currentNum = Number(raw) || 0;
                      }

                      const invStatus = currentNum > 10 ? "In Stock" : currentNum > 0 ? "Low Stock" : "Out of Stock";
                      return (
                        <div
                          key={variant.id}
                          style={{
                            padding: "14px 16px",
                            borderRadius: 12,
                            border: isTarget ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                            background: isTarget ? "#eff6ff" : "#ffffff",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                            transition: "all 0.2s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <img src={photo(variant)} alt={variant.color || variant.name} style={{ width: 42, height: 42, objectFit: "contain", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }} />
                              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <b style={{ fontSize: 14, color: "#0f172a" }}>{variant.color || variant.name}</b>
                                  <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4, textTransform: "uppercase", background: invStatus === "In Stock" ? "#f0fdf4" : invStatus === "Low Stock" ? "#fef3c7" : "#fef2f2", color: invStatus === "In Stock" ? "#16a34a" : invStatus === "Low Stock" ? "#d97706" : "#dc2626", border: `1px solid ${invStatus === "In Stock" ? "#bbf7d0" : invStatus === "Low Stock" ? "#fde68a" : "#fecaca"}` }}>
                                    {invStatus}
                                  </span>
                                </div>
                                {variant.sku && <span style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b" }}>SKU: {variant.sku}</span>}
                              </div>
                            </div>

                            {/* Total Stock Input */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Total Stock:</span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                required
                                value={String(currentNum)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (effectiveSizes.length > 0) {
                                    setStockValues((prev) => {
                                      const next = { ...prev };
                                      for (const s of effectiveSizes) {
                                        next[variant.id + ":" + s] = val;
                                      }
                                      next[variant.id] = String(Number(val) * effectiveSizes.length);
                                      return next;
                                    });
                                  } else {
                                    setStockValues((current) => ({ ...current, [variant.id]: val }));
                                  }
                                }}
                                placeholder="0"
                                style={{ width: 110, height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, fontWeight: 700, color: "#0f172a", textAlign: "center", background: "#ffffff" }}
                              />
                            </div>
                          </div>

                          {/* Per-size inputs if sizes exist */}
                          {effectiveSizes.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                                  Available Sizes ({effectiveSizes.length})
                                </span>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Qty"
                                    id={`bulk-sz-${variant.id}`}
                                    style={{ width: 65, height: 26, fontSize: 11, padding: "0 6px", borderRadius: 4, border: "1px solid #cbd5e1", textAlign: "center" }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const el = document.getElementById(`bulk-sz-${variant.id}`) as HTMLInputElement;
                                      const bVal = el ? el.value : "";
                                      if (bVal !== "") {
                                        setStockValues((prev) => {
                                          const next = { ...prev };
                                          for (const s of effectiveSizes) {
                                            next[variant.id + ":" + s] = bVal;
                                          }
                                          const sum = effectiveSizes.length * (Number(bVal) || 0);
                                          next[variant.id] = String(sum);
                                          return next;
                                        });
                                      }
                                    }}
                                    style={{ height: 26, padding: "0 8px", fontSize: 11, fontWeight: 600, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 4, cursor: "pointer" }}
                                  >
                                    Set all sizes
                                  </button>
                                </div>
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 8 }}>
                                {(effectiveSizes as string[]).map((size: string) => (
                                  <label key={size} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 600, color: "#64748b" }}>
                                    <span>Size {size}</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={stockValues[variant.id + ":" + size] ?? String(((variant as any).sizeStock || {})[size] ?? "0")}
                                      onChange={(event) => {
                                        const szVal = event.target.value;
                                        setStockValues((current) => {
                                          const next = { ...current, [variant.id + ":" + size]: szVal };
                                          const sum = (effectiveSizes as string[]).reduce((acc: number, s: string) => {
                                            const num = Number(next[variant.id + ":" + s] ?? ((variant as any).sizeStock || {})[s] ?? 0);
                                            return acc + (Number.isFinite(num) && num >= 0 ? num : 0);
                                          }, 0);
                                          next[variant.id] = String(sum);
                                          return next;
                                        });
                                      }}
                                      placeholder="0"
                                      style={{ height: 32, padding: "0 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12, fontWeight: 600, textAlign: "center", background: "#ffffff" }}
                                    />
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Another Colour Section */}
                <div style={{ border: "1px dashed #94a3b8", borderRadius: 12, padding: "14px 16px", background: "#f8fafc", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                    <Plus size={15} style={{ color: "#2563eb" }} /> Add Another Colour to Inventory
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 12, alignItems: "end" }}>
                    <label style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#475569" }}>
                      Select Colour
                      <select
                        value={stockColorChoice}
                        onChange={(e) => {
                          const newCol = e.target.value;
                          setStockColorChoice(newCol);
                          if (newCol && productAllSizes.length > 0) {
                            setStockValues((prev) => {
                              const next = { ...prev };
                              for (const sz of productAllSizes) {
                                const key = hasEmbeddedVariants
                                  ? `new_color:${newCol}:size:${sz}`
                                  : `new_child:${newCol}:size:${sz}`;
                                if (next[key] === undefined) {
                                  next[key] = stockValue || "0";
                                }
                              }
                              return next;
                            });
                          }
                        }}
                        style={{ width: "100%", height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 10px", marginTop: 4, background: "#ffffff", fontSize: 13, fontWeight: 600 }}
                      >
                        <option value="">-- Choose a color --</option>
                        {availableStockColors.map((color) => (
                          <option key={color} value={color}>{color}</option>
                        ))}
                      </select>
                    </label>
                    {stockColorChoice ? (
                      <label style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#475569" }}>
                        Total Stock
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={
                            productAllSizes.length > 0
                              ? productAllSizes.reduce((sum, sz) => {
                                  const key = hasEmbeddedVariants
                                    ? `new_color:${stockColorChoice}:size:${sz}`
                                    : `new_child:${stockColorChoice}:size:${sz}`;
                                  const val = Number(stockValues[key] ?? stockValue ?? 0);
                                  return sum + (Number.isFinite(val) && val >= 0 ? val : 0);
                                }, 0)
                              : stockValue
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            setStockValue(val);
                            if (productAllSizes.length > 0) {
                              setStockValues((prev) => {
                                const next = { ...prev };
                                for (const sz of productAllSizes) {
                                  const key = hasEmbeddedVariants
                                    ? `new_color:${stockColorChoice}:size:${sz}`
                                    : `new_child:${stockColorChoice}:size:${sz}`;
                                  next[key] = val;
                                }
                                return next;
                              });
                            }
                          }}
                          placeholder="0"
                          style={{ width: "100%", height: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "0 10px", marginTop: 4, background: "#ffffff", fontSize: 13, fontWeight: 700, textAlign: "center" }}
                        />
                      </label>
                    ) : (
                      <div style={{ fontSize: 11, color: "#94a3b8", paddingBottom: 10 }}>Select color to enter initial stock</div>
                    )}
                  </div>

                  {/* Available Sizes Breakdown for Newly Selected Color */}
                  {stockColorChoice && productAllSizes.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 10, borderTop: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>
                          Available Sizes for {stockColorChoice} ({productAllSizes.length} sizes):
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input
                            type="number"
                            min="0"
                            placeholder="Qty"
                            id="bulk-sz-new-color"
                            style={{ width: 65, height: 26, fontSize: 11, padding: "0 6px", borderRadius: 4, border: "1px solid #cbd5e1", textAlign: "center" }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById("bulk-sz-new-color") as HTMLInputElement;
                              const bVal = el ? el.value : "";
                              if (bVal !== "") {
                                setStockValue(bVal);
                                setStockValues((prev) => {
                                  const next = { ...prev };
                                  for (const s of productAllSizes) {
                                    const key = hasEmbeddedVariants
                                      ? `new_color:${stockColorChoice}:size:${s}`
                                      : `new_child:${stockColorChoice}:size:${s}`;
                                    next[key] = bVal;
                                  }
                                  return next;
                                });
                              }
                            }}
                            style={{ height: 26, padding: "0 8px", fontSize: 11, fontWeight: 600, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 4, cursor: "pointer" }}
                          >
                            Set all sizes
                          </button>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 8 }}>
                        {productAllSizes.map((sz) => {
                          const key = hasEmbeddedVariants
                            ? `new_color:${stockColorChoice}:size:${sz}`
                            : `new_child:${stockColorChoice}:size:${sz}`;
                          return (
                            <label key={sz} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 600, color: "#64748b" }}>
                              <span>Size {sz}</span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={stockValues[key] ?? stockValue ?? "0"}
                                onChange={(e) => {
                                  const szVal = e.target.value;
                                  setStockValues((prev) => ({
                                    ...prev,
                                    [key]: szVal,
                                  }));
                                }}
                                placeholder="0"
                                style={{ height: 32, padding: "0 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12, fontWeight: 600, textAlign: "center", background: "#ffffff" }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, paddingTop: 10, borderTop: "1px solid #e2e8f0" }}>
                  <button
                    type="button"
                    className="admin-secondary"
                    disabled={busy}
                    onClick={() => {
                      setStockEditing(null);
                      setStockHighlightColor(null);
                    }}
                    style={{ padding: "8px 18px", borderRadius: 8, fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    className="admin-primary"
                    disabled={busy}
                    style={{ padding: "8px 24px", borderRadius: 8, fontWeight: 700, background: "#2563eb", color: "#ffffff", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    {busy ? "Saving Stock…" : "Save Stock & Recalculate Overall"}
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        );
      })()}
      <ImageManager
        product={imageEditing}
        open={!!imageEditing}
        busy={busy}
        onOpenChange={(open) => {
          if (!open && !busy) setImageEditing(null);
        }}
        onSave={async (product) => {
          if (await write({ action: "product", product })) {
            setData((current) => current ? { ...current, products: current.products.map((item) => item.id === product.id ? product : item) } : current);
            toast.success("Product images saved");
          }
        }}
      />
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open && !busy) setEditing(null);
        }}
      >
        <DialogContent className="admin-dialog">
          <DialogHeader>
            <DialogTitle>
              {isNew ? "Add a product" : "Edit product"}
            </DialogTitle>
            <DialogDescription>
              {isNew
                ? "Create a new item for your collection."
                : "Changes apply to the storefront when you save."}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form
              className="admin-fields"
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await write({
                    action: "product",
                    product: {
                      ...editing,
                      features: (editing.features || [])
                        .map((f) => f.trim())
                        .filter(Boolean),
                    },
                  })
                ) {
                  setData((d) =>
                    d
                      ? {
                          ...d,
                          products: isNew
                            ? [...d.products, editing]
                            : d.products.map((p) =>
                                p.id === editing.id ? editing : p,
                              ),
                        }
                      : d,
                  );
                  setEditing(null);
                  toast.success("Product saved");
                }
              }}
            >
              <label>
                English Title <span className="text-red-500" style={{ color: '#ef4444', fontWeight: 700 }}>*</span>
                <textarea
                  required
                  minLength={3}
                  maxLength={120}
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  placeholder="Enter English product title"
                />
              </label>
              <div className="admin-two">
                <label>
                  Category
                  <Choice
                    label="Product category"
                    disabled={!isNew}
                    value={editing.category}
                    onChange={(v) => setEditing({ ...editing, category: v })}
                    items={categoryOptions.slice(1)}
                  />
                </label>
                <label>
                  Status
                  <Choice
                    label="Product status"
                    value={editing.status}
                    onChange={(v) =>
                      setEditing({
                        ...editing,
                        status: v as "Active" | "Draft",
                      })
                    }
                    items={["Active", "Draft"]}
                  />
                </label>
              </div>
              <div className="admin-two">
                <label>
                  Color
                  <Choice label="Product color" value={editing.color || "Not applicable"} onChange={(v) => setEditing({ ...editing, color: v })} items={colors} />
                </label>
                <label>
                  Option
                  <Choice label="Product option" value={editing.option || "Standard"} onChange={(v) => setEditing({ ...editing, option: v })} items={packOptions} />
                </label>
              </div>
              <label>
                Sizes
                <input
                  value={(editing.sizes || []).join(", ")}
                  onChange={(e) => setEditing({ ...editing, sizes: e.target.value.split(",").map((size) => size.trim()).filter(Boolean) })}
                  placeholder="Example: 38, 39, 40 or S, M, L or Small, Medium, Large"
                />
                <small>Leave blank for Standard size only. Separate multiple sizes with commas.</small>
              </label>
              <div className="admin-two">
                <label>
                  Price (PKR)
                  <input
                    required
                    type="number"
                    min="1"
                    max="10000000"
                    value={editing.price}
                    onChange={(e) =>
                      setEditing({ ...editing, price: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Compare-at price (PKR)
                  <input
                    required
                    type="number"
                    min={editing.price}
                    max="10000000"
                    value={editing.old}
                    onChange={(e) =>
                      setEditing({ ...editing, old: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <label>
                Description
                <textarea
                  required
                  minLength={10}
                  maxLength={3000}
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                />
              </label>
              <label>
                Features (one per line)
                <textarea
                  value={(editing.features || []).join("\n")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      features: e.target.value.split("\n"),
                    })
                  }
                />
                <small>Up to 8 features, 180 characters each.</small>
              </label>
              <label>
                Product images (one per line, first image is the main image)
                <textarea
                  required
                  value={(editing.images?.length ? editing.images : [editing.image]).join("\n")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      image: e.target.value.split("\n").map((value) => value.trim()).filter(Boolean)[0] || "",
                      images: e.target.value.split("\n").map((value) => value.trim()).filter(Boolean),
                    })
                  }
                  placeholder="shoes\nhttps://example.com/shoes-white.jpg"
                />
                <small>
                  Add the main image first, followed by white-background,
                  detail, and lifestyle images.
                </small>
              </label>
              <div className="admin-editor-preview">
                {(editing.images?.length ? editing.images : [editing.image]).map((value, index) => (
                  <img key={value + index} src={imageUrl(value)} alt={`Product image ${index + 1}`} />
                ))}
                <span><ImageIcon size={19} /> {editing.images?.length || 1} product image{(editing.images?.length || 1) === 1 ? "" : "s"}</span>
              </div>
              {saveError && (
                <p className="admin-error" role="alert">
                  {saveError}
                </p>
              )}
              <div className="admin-form-actions">
                {!isNew && <button className="admin-danger" type="button" disabled={busy} onClick={async () => {
                  if (!window.confirm(`Delete ${editing.name}? This cannot be undone.`)) return;
                  if (await write({ action: "delete-product", id: editing.id })) {
                    setData((current) => current ? { ...current, products: current.products.filter((item) => item.id !== editing.id) } : current);
                    setEditing(null);
                    toast.success("Product deleted");
                  }
                }}><Trash2 size={16} /> Delete product</button>}
                <button
                  className="admin-secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button className="admin-primary" disabled={busy}>
                  <Save size={16} />
                  {busy ? "Saving…" : "Save product"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {addColorSource && (
        <AddColorModal
          product={addColorSource}
          open={!!addColorSource}
          busy={busy}
          onOpenChange={(open) => {
            if (!open && !busy) setAddColorSource(null);
          }}
          onSave={async (updatedProd) => {
            if (await write({ action: "product", product: updatedProd })) {
              await load();
              setAddColorSource(null);
            }
          }}
        />
      )}

      {/* Manage Inventory Modal Workspace */}
      <InventoryModal
        open={Boolean(inventoryModalProduct)}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setInventoryModalProduct(null);
            setInventoryModalTargetColor(null);
          }
        }}
        product={inventoryModalProduct}
        targetColor={inventoryModalTargetColor}
        onSave={handleSaveInventory}
      />

      {/* Stock History Audit Modal */}
      <StockHistoryModal
        open={Boolean(stockHistoryModalProduct)}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setStockHistoryModalProduct(null);
            setStockHistoryVariantSku(null);
            setStockHistoryVariantColor(null);
            setStockHistoryVariantSize(null);
          }
        }}
        product={stockHistoryModalProduct}
        variantSku={stockHistoryVariantSku}
        variantColor={stockHistoryVariantColor}
        variantSize={stockHistoryVariantSize}
      />

      {/* Safe Color Removal & Disable Modal */}
      <RemoveColorModal
        open={Boolean(removeColorProduct && removeColorTarget)}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setRemoveColorProduct(null);
            setRemoveColorTarget(null);
          }
        }}
        product={removeColorProduct}
        colorVariant={removeColorTarget}
        onDisableInstead={handleDisableColorInstead}
        onDeletePermanently={handleDeleteColorPermanently}
        busy={busy}
      />

      {/* History Dialog */}
      <Dialog
        open={!!historyOrder}
        onOpenChange={(open) => {
          if (!open) setHistoryOrder(null);
        }}
      >
        <DialogContent className="admin-dialog" style={{ maxWidth: 540 }}>
          <DialogHeader>
            <DialogTitle>Order Timeline & History</DialogTitle>
            <DialogDescription>
              Reference: <b style={{ color: "#203664" }}>{historyOrder?.id}</b>
            </DialogDescription>
          </DialogHeader>
          {historyOrder && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 10 }}>
              <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#64748b" }}>Customer:</span>
                  <b>{historyOrder.details.name} ({historyOrder.details.phone})</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#64748b" }}>Destination:</span>
                  <span>{historyOrder.details.city}{historyOrder.details.province ? `, ${historyOrder.details.province}` : ""}, PK</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#64748b" }}>Current Status:</span>
                  <span style={{ color: "#059669", fontWeight: 700 }}>{historyOrder.status}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Payment Method:</span>
                  <span style={{ background: "#fef3c7", color: "#92400e", padding: "1px 8px", borderRadius: 4, fontWeight: 600, fontSize: 11 }}>Cash on Delivery</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingLeft: 12, borderLeft: "2px solid #e2e8f0" }}>
                <div style={{ position: "relative", paddingLeft: 16 }}>
                  <div style={{ position: "absolute", left: -19, top: 3, width: 12, height: 12, borderRadius: "50%", background: "#10b981", border: "2px solid #fff" }} />
                  <b style={{ fontSize: 13, color: "#1e293b" }}>Order Created</b>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                    {new Date(historyOrder.created_at).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })} via Storefront COD
                  </p>
                </div>
                <div style={{ position: "relative", paddingLeft: 16 }}>
                  <div style={{ position: "absolute", left: -19, top: 3, width: 12, height: 12, borderRadius: "50%", background: "#3b82f6", border: "2px solid #fff" }} />
                  <b style={{ fontSize: 13, color: "#1e293b" }}>Status: {historyOrder.status}</b>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                    Internal tracking key: <code style={{ background: "#e2e8f0", padding: "1px 5px", borderRadius: 3 }}>{historyOrder.token || historyOrder.id}</code>
                  </p>
                </div>
                {historyOrder.details.note && (
                  <div style={{ position: "relative", paddingLeft: 16 }}>
                    <div style={{ position: "absolute", left: -19, top: 3, width: 12, height: 12, borderRadius: "50%", background: "#f59e0b", border: "2px solid #fff" }} />
                    <b style={{ fontSize: 13, color: "#1e293b" }}>Customer Special Note</b>
                    <p style={{ fontSize: 12, color: "#475569", margin: "2px 0 0", fontStyle: "italic", background: "#fffbeb", padding: "6px 10px", borderRadius: 6, border: "1px solid #fef3c7" }}>
                      "{historyOrder.details.note}"
                    </p>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" className="admin-secondary" onClick={() => setHistoryOrder(null)}>
                  Close
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Courier Dialog */}
      <Dialog
        open={!!courierOrder}
        onOpenChange={(open) => {
          if (!open) setCourierOrder(null);
        }}
      >
        <DialogContent className="admin-dialog" style={{ maxWidth: 560 }}>
          <DialogHeader>
            <DialogTitle>Courier tracking</DialogTitle>
            <DialogDescription>
              Assign Pakistan courier partner and consignment number for <b>{courierOrder?.id}</b>
            </DialogDescription>
          </DialogHeader>
          {courierOrder && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
              <div style={{ background: "#f0fdf4", padding: 14, borderRadius: 8, border: "1px solid #bbf7d0", fontSize: 13, color: "#166534" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>COD Collection Amount:</span>
                  <b style={{ fontSize: 15 }}>{money(courierOrder.total)}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Destination:</span>
                  <b>{courierOrder.details.city}{courierOrder.details.province ? `, ${courierOrder.details.province}` : ""}, Pakistan</b>
                </div>
              </div>

              <div className="admin-fields" style={{ padding: 0 }}>
                <label>
                  Select Courier Partner
                  <select
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    style={{ width: "100%", height: 38, border: "1px solid #d4dce8", borderRadius: 6, padding: "0 10px" }}
                  >
                    <option value="Trax Logistics">Trax Logistics (Recommended for Pakistan COD)</option>
                    <option value="TCS Express">TCS Express</option>
                    <option value="Leopards Courier">Leopards Courier</option>
                    <option value="PostEx Express">PostEx Express</option>
                    <option value="M&P Logistics">M&P Express</option>
                    <option value="Call Courier">Call Courier</option>
                  </select>
                </label>

                <label style={{ marginTop: 12 }}>
                  Airway Bill / Tracking Consignment #
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="e.g. TRX-98234123"
                    />
                  </div>
                </label>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() => {
                    setAirwayBillOrders([{
                      ...courierOrder,
                      details: {
                        ...courierOrder.details,
                        courier: courierName,
                        trackingNumber: trackingNumber || courierOrder.details.trackingNumber,
                      }
                    }]);
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Printer size={15} /> Print Airway Bill
                </button>
                <button
                  type="button"
                  className="admin-primary"
                  disabled={busy}
                  onClick={async () => {
                    const ok = await write({
                      action: "order",
                      id: courierOrder.id,
                      status: "Shipped",
                      courier: courierName,
                      trackingNumber,
                    });
                    if (ok) {
                      setData((curr) => curr ? {
                        ...curr,
                        orders: curr.orders.map((item) => item.id === courierOrder.id ? {
                          ...item,
                          status: "Shipped",
                          details: { ...item.details, courier: courierName, trackingNumber }
                        } : item)
                      } : curr);
                      toast.success(`Booked with ${courierName}. Status updated to Shipped.`);
                      setCourierOrder(null);
                    }
                  }}
                >
                  Save & Mark as Shipped
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Order Confirmation Dialog */}
      <Dialog
        open={!!cancelModalOrder}
        onOpenChange={(open) => {
          if (!open && !busy) setCancelModalOrder(null);
        }}
      >
        <DialogContent className="admin-dialog" style={{ maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8, color: "#b91c1c" }}>
              <AlertTriangle size={20} />
              Cancel Order #{cancelModalOrder?.id}
            </DialogTitle>
            <DialogDescription>
              Select a cancellation reason for store records and CSR audit logs.
            </DialogDescription>
          </DialogHeader>

          {cancelModalOrder && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: "#991b1b" }}>Customer: {cancelModalOrder.details.name} (📞 {cancelModalOrder.details.phone})</div>
                <div style={{ color: "#7f1d1d", marginTop: 2 }}>Amount: <b>{money(cancelModalOrder.total)}</b> · City: {cancelModalOrder.details.city}</div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>
                  Cancellation Reason:
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    "Customer changed mind / duplicate order",
                    "Customer unreachable after multiple CSR calls",
                    "Fake or bogus contact details",
                    "Out of stock / inventory shortage",
                    "Delivery address unserviceable by courier",
                    "Price / COD dispute",
                    "Other reason",
                  ].map((reason) => (
                    <label
                      key={reason}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                        color: "#1e293b",
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: cancelReason === reason ? "1px solid #ef4444" : "1px solid #e2e8f0",
                        background: cancelReason === reason ? "#fff5f5" : "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="cancelReasonRadio"
                        checked={cancelReason === reason}
                        onChange={() => setCancelReason(reason)}
                        style={{ accentColor: "#ef4444" }}
                      />
                      {reason}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                  Internal CSR Note (Optional):
                </label>
                <textarea
                  value={cancelCustomNote}
                  onChange={(e) => setCancelCustomNote(e.target.value)}
                  placeholder="Add any extra details (e.g. customer stated they ordered by mistake)…"
                  rows={2}
                  style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 10px", fontSize: 12 }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() => setCancelModalOrder(null)}
                  disabled={busy}
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  className="admin-primary"
                  style={{ background: "#dc2626", color: "#ffffff" }}
                  disabled={busy}
                  onClick={() => handleCancelOrder(cancelModalOrder, cancelReason, cancelCustomNote)}
                >
                  {busy ? "Cancelling…" : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Side Sheet Drawer for Order Details */}
      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !busy) setSelected(null);
        }}
      >
        <SheetContent className="admin-order-sheet">
          <SheetHeader>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <SheetTitle style={{ fontSize: 17, fontWeight: 800 }}>Order #{selected?.id}</SheetTitle>
              {selected && <CsrBadge status={selected.details.csrStatus} time={selected.details.csrConfirmedAt} />}
            </div>
            <SheetDescription>
              {selected?.created_at ? new Date(selected.created_at).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" }) : "Recent Order"} · Cash on Delivery
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="admin-order-details">
              <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Current Status</span>
                    <div style={{ fontSize: 14, fontWeight: 800, color: selected.status === "Cancelled" ? "#dc2626" : "#203664" }}>
                      {selected.status}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Total COD</span>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#059669" }}>
                      {money(selected.total)}
                    </div>
                  </div>
                </div>

                <div className="order-milestone-stepper" style={{ background: "#ffffff", padding: "10px 8px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  {pipelineSteps.map((step, idx) => {
                    const StepIcon = step.icon;
                    const curIdx = getStepIndex(selected.status);
                    const isCurrent = curIdx === idx;
                    const isPassed = curIdx > idx;
                    const isActive = isCurrent || isPassed;
                    return (
                      <button
                        type="button"
                        key={step.id}
                        disabled={busy}
                        onClick={async () => {
                          if (selected.status === step.id) return;
                          const ok = await write({ action: "order", id: selected.id, status: step.id });
                          if (ok) {
                            setSelected((curr) => curr ? { ...curr, status: step.id } : curr);
                            setData((curr) => curr ? {
                              ...curr,
                              orders: curr.orders.map((item) => item.id === selected.id ? { ...item, status: step.id } : item)
                            } : curr);
                            toast.success(`Order #${selected.id} updated to ${step.label}`);
                          }
                        }}
                        className={`milestone-step-display clickable ${isActive ? "active" : ""} ${isCurrent ? "current" : ""} ${isPassed ? "passed" : ""}`}
                        title={`Click to update stage to: ${step.label}`}
                      >
                        <div className="milestone-circle">
                          {isPassed ? <Check size={13} /> : <StepIcon size={12} />}
                        </div>
                        <span className="milestone-label">{step.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <h3>Customer & Contact</h3>
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <b>{selected.details.name}</b>
                  {(() => {
                    const h = getCustomerHistory(orders, selected.details.phone, selected.id);
                    return h.isFirstOrder ? (
                      <span className="order-customer-history-tag">✨ 1st Order</span>
                    ) : (
                      <span className={`order-customer-history-tag ${h.rtoCount > 0 ? "risk" : "loyal"}`}>
                        {h.count} Orders · {h.deliveredCount} Delv{h.rtoCount > 0 ? ` · ⚠️ ${h.rtoCount} RTO` : ""}
                      </span>
                    );
                  })()}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: "#475569" }}>
                  📞 <b>{selected.details.phone}</b>
                  {selected.details.alternatePhone && <span> · Alt: {selected.details.alternatePhone}</span>}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <a
                    href={`tel:${selected.details.phone.replace(/[^0-9+]/g, "")}`}
                    className="csr-btn csr-btn-call"
                    style={{ fontSize: 11, padding: "4px 8px" }}
                  >
                    <Phone size={12} /> Call
                  </a>
                  <a
                    href={`https://wa.me/${selected.details.phone.replace(/[^0-9]/g, "").replace(/^0/, "92")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="csr-btn csr-btn-whatsapp"
                    style={{ fontSize: 11, padding: "4px 8px" }}
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                  <button
                    type="button"
                    className="csr-btn csr-btn-verify"
                    style={{ fontSize: 11, padding: "4px 8px" }}
                    onClick={() => openCsrModal(selected)}
                  >
                    <PhoneCall size={12} /> CSR Confirmation
                  </button>
                </div>
              </div>

              <h3>Delivery Destination</h3>
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, fontSize: 12 }}>
                <div><b>City:</b> {selected.details.city}{selected.details.province ? `, ${selected.details.province}` : ""}, Pakistan</div>
                <div style={{ marginTop: 4 }}><b>Address:</b> {selected.details.address}</div>
                {selected.details.landmark && (
                  <div style={{ marginTop: 4, color: "#64748b" }}><b>Landmark:</b> {selected.details.landmark}</div>
                )}
              </div>

              {selected.details.note && (
                <>
                  <h3>Customer Order Note</h3>
                  <p style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontStyle: "italic", fontSize: 12 }}>
                    "{selected.details.note}"
                  </p>
                </>
              )}

              <h3>Ordered Items ({selected.items.length})</h3>
              {selected.items.map((i, n) => {
                const prod = products.find((p) => p.id === i.id);
                const itemImg = i.image
                  ? (i.image.startsWith("http") || i.image.startsWith("/") || i.image.startsWith("data:") ? i.image : "/images/" + i.image + ".jpg")
                  : prod ? photo(prod) : "/images/placeholder.jpg";
                return (
                  <div className="admin-order-item" key={n} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src={itemImg} alt={i.name || i.id} style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", border: "1px solid #e2e8f0" }} />
                    <div style={{ flex: 1 }}>
                      <b>{i.name || prod?.name || i.id}</b>
                      <small>
                        {i.color ? `Color: ${i.color} · ` : ""}{i.size ? `Size: ${i.size} · ` : ""}Qty: {i.qty}
                      </small>
                    </div>
                    {i.unitPrice !== undefined && (
                      <span style={{ fontWeight: 700 }}>{money(i.qty * i.unitPrice)}</span>
                    )}
                  </div>
                );
              })}

              <div className="admin-order-total">
                <b>Total Amount (COD)</b>
                <strong>{money(selected.total)}</strong>
              </div>

              {/* Courier & Tracking Section */}
              <h3>Courier & Consignment</h3>
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span><b>Courier Partner:</b> {selected.details.courier || "Trax Logistics"}</span>
                  <button
                    type="button"
                    className="order-sub-btn"
                    onClick={() => {
                      setCourierOrder(selected);
                      setCourierName(selected.details.courier || "Trax Logistics");
                      setTrackingNumber(selected.details.trackingNumber || `TRX-${selected.id.replace("ZPK-", "")}`);
                    }}
                  >
                    <Truck size={12} /> Change / Book
                  </button>
                </div>
                <div style={{ marginTop: 6 }}>
                  <b>Tracking Consignment #:</b> {selected.details.trackingNumber || "Not assigned yet"}
                  {selected.details.trackingNumber && (
                    <a
                      href={getCourierTrackingUrl(selected.details.courier, selected.details.trackingNumber)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ marginLeft: 8, color: "#2563eb", fontWeight: 600 }}
                    >
                      Track Online <ExternalLink size={11} style={{ display: "inline" }} />
                    </a>
                  )}
                </div>
              </div>

              {/* CSR Verification History Timeline */}
              {selected.details.csrHistory && selected.details.csrHistory.length > 0 && (
                <>
                  <h3>CSR History & Timeline</h3>
                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
                    <div className="csr-timeline">
                      {selected.details.csrHistory.map((item, idx) => (
                        <div key={item.id || idx} className="csr-timeline-item">
                          <span style={{ fontWeight: 700, color: "#1e293b" }}>{item.status}</span>
                          <span style={{ color: "#64748b", marginLeft: 8 }}>
                            {new Date(item.time).toLocaleString("en-PK", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </span>
                          {item.agent && <span style={{ color: "#3b82f6", marginLeft: 6 }}>({item.agent})</span>}
                          {item.note && <div style={{ color: "#334155", fontSize: 11.5, marginTop: 2 }}>"{item.note}"</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Status Update Control */}
              <label className="admin-status-label">
                Manual Status Override
                <Choice
                  value={status}
                  onChange={setStatus}
                  label="Update order status"
                  items={statuses}
                />
              </label>

              {saveError && (
                <p className="admin-error" role="alert">
                  {saveError}
                </p>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="admin-secondary"
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  onClick={() => {
                    setAirwayBillOrders([selected]);
                    setCourierName(selected.details.courier || "Trax Logistics");
                    setTrackingNumber(selected.details.trackingNumber || `TRX-${selected.id.replace("ZPK-", "")}`);
                  }}
                >
                  <Printer size={15} /> Print Airway Bill
                </button>

                <button
                  disabled={busy || selected.status === status}
                  className="admin-primary"
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  onClick={async () => {
                    if (
                      await write({ action: "order", id: selected.id, status })
                    ) {
                      setSelected({ ...selected, status });
                      setData((d) =>
                        d
                          ? {
                              ...d,
                              orders: d.orders.map((o) =>
                                o.id === selected.id ? { ...o, status } : o,
                              ),
                            }
                          : d,
                      );
                      toast.success("Order status updated");
                    }
                  }}
                >
                  {busy ? "Saving…" : "Save Status"}
                  <CheckCircle2 size={16} />
                </button>
              </div>

              {/* More Actions Section */}
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 12,
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  More Actions
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(["Returned", "RTO", "Failed Delivery"].includes(selected.status) || selected.details?.returnStatus === "Returned") && (
                    <div>
                      {selected.details?.returnRestocked ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#16a34a", fontWeight: 600, background: "#f0fdf4", padding: "8px 12px", borderRadius: 6, border: "1px solid #bbf7d0" }}>
                          <CheckCircle2 size={15} /> Returned items restocked into inventory
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          style={{
                            width: "100%",
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            color: "#1d4ed8",
                            padding: "8px 12px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                          onClick={async () => {
                            if (window.confirm("Restock inspected items from this returned order back into inventory?")) {
                              const res = await write({ action: "restock-return", orderId: selected.id });
                              if (res) {
                                toast.success("Returned items restocked successfully into inventory");
                                const updatedDetails = { ...selected.details, returnRestocked: true };
                                setSelected({ ...selected, details: updatedDetails });
                                setData((d) => d ? {
                                  ...d,
                                  orders: d.orders.map((o) => o.id === selected.id ? { ...o, details: updatedDetails } : o)
                                } : d);
                                await load();
                              }
                            }
                          }}
                        >
                          <RotateCcw size={14} /> Restock Returned Items (Staff Inspected)
                        </button>
                      )}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  {selected.status !== "Cancelled" ? (
                    <button
                      type="button"
                      style={{
                        background: "#fff7ed",
                        border: "1px solid #fed7aa",
                        color: "#c2410c",
                        padding: "6px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                      onClick={() => {
                        setCancelModalOrder(selected);
                        setCancelReason("Customer changed mind / duplicate order");
                        setCancelCustomNote("");
                      }}
                    >
                      <X size={14} /> Cancel Order
                    </button>
                  ) : (
                    <div />
                  )}

                  {(data?.role === "super_admin" || data?.permissions?.includes("orders.delete")) && (
                    <button
                      type="button"
                      style={{
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        color: "#dc2626",
                        padding: "6px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                      onClick={() => {
                        setDeleteModalOrder(selected);
                      }}
                      title="Permanently remove invalid/mistake/test record (Super Admin / Authorized Admin)"
                    >
                      <Trash2 size={14} /> Delete Order
                    </button>
                  )}
                </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Airway Bill Dialog & Preview */}
      <Dialog
        open={!!airwayBillOrders}
        onOpenChange={(open) => {
          if (!open) setAirwayBillOrders(null);
        }}
      >
        <DialogContent className="admin-dialog" style={{ maxWidth: 750, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
          <DialogHeader>
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Printer size={20} />
              Print Airway Bill ({airwayBillOrders?.length} {airwayBillOrders && airwayBillOrders.length > 1 ? "Consignments" : "Consignment"})
            </DialogTitle>
            <DialogDescription>
              Pakistan Courier Airway Bill & Cash On Delivery Shipping Slip with barcode
            </DialogDescription>
          </DialogHeader>

          {airwayBillOrders && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", paddingRight: 4 }}>
              {/* Controls bar */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Format:</label>
                  <div style={{ display: "flex", background: "#e2e8f0", padding: 2, borderRadius: 6 }}>
                    <button
                      type="button"
                      onClick={() => setAirwayBillFormat("thermal")}
                      style={{
                        padding: "4px 10px",
                        fontSize: 12,
                        fontWeight: airwayBillFormat === "thermal" ? 700 : 500,
                        background: airwayBillFormat === "thermal" ? "#fff" : "transparent",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        boxShadow: airwayBillFormat === "thermal" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      }}
                    >
                      🏷️ 4" × 6" Thermal
                    </button>
                    <button
                      type="button"
                      onClick={() => setAirwayBillFormat("a4")}
                      style={{
                        padding: "4px 10px",
                        fontSize: 12,
                        fontWeight: airwayBillFormat === "a4" ? 700 : 500,
                        background: airwayBillFormat === "a4" ? "#fff" : "transparent",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        boxShadow: airwayBillFormat === "a4" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      }}
                    >
                      📄 A4 Invoice Slip
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Weight (KG):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={airwayWeight}
                    onChange={(e) => setAirwayWeight(e.target.value)}
                    style={{ width: 65, height: 32, padding: "0 8px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Pieces:</label>
                  <input
                    type="number"
                    min="1"
                    value={airwayPieces}
                    onChange={(e) => setAirwayPieces(e.target.value)}
                    style={{ width: 55, height: 32, padding: "0 8px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
                  />
                </div>

                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="admin-primary"
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px" }}
                    onClick={() => {
                      window.print();
                    }}
                  >
                    <Printer size={16} />
                    Print Now ({airwayBillOrders.length})
                  </button>
                </div>
              </div>

              {/* Slips preview container */}
              <div style={{ background: "#64748b", padding: 16, borderRadius: 8, maxHeight: "55vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
                {airwayBillOrders.map((ord) => (
                  <div key={ord.id} style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.25)", background: "#fff", width: airwayBillFormat === "thermal" ? "100%" : "100%", maxWidth: airwayBillFormat === "thermal" ? 420 : "100%" }}>
                    <AirwayBillSlip
                      order={ord}
                      format={airwayBillFormat}
                      weight={airwayWeight}
                      pieces={airwayPieces}
                      courier={ord.details.courier || courierName}
                      trackingNumber={ord.details.trackingNumber || trackingNumber}
                      storeConfig={config}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CSR Order Confirmation Modal */}
      <Dialog
        open={!!csrOrder}
        onOpenChange={(open) => {
          if (!open && !busy) setCsrOrder(null);
        }}
      >
        <DialogContent className="admin-dialog" style={{ maxWidth: 820, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
          <DialogHeader>
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PhoneCall size={20} />
              CSR Order Confirmation · {csrOrder?.id}
            </DialogTitle>
            <DialogDescription>
              Pakistan Customer Verification, WhatsApp confirmation, address correction, and call logging.
            </DialogDescription>
          </DialogHeader>

          {csrOrder && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", paddingRight: 4 }}>
              {/* Customer Top Quick Header */}
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, background: "#f0fdf4", padding: "12px 16px", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <b style={{ fontSize: 15, color: "#166534" }}>{csrEditableName || csrOrder.details.name}</b>
                    <CsrBadge status={csrStatusInput} />
                  </div>
                  <div style={{ fontSize: 13, color: "#15803d", marginTop: 2 }}>
                    📞 <b>{csrEditablePhone || csrOrder.details.phone}</b>
                    {csrEditableAltPhone && <span> · Alt: {csrEditableAltPhone}</span>}
                    <span style={{ marginLeft: 8, fontWeight: 700 }}>· COD Total: {money(csrOrder.total)}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <a
                    href={`tel:${(csrEditablePhone || csrOrder.details.phone).replace(/[^0-9+]/g, "")}`}
                    className="csr-btn csr-btn-call"
                    style={{ padding: "7px 14px", fontSize: 12 }}
                  >
                    <Phone size={14} /> Dial Customer
                  </a>
                  <button
                    type="button"
                    className="csr-btn csr-btn-whatsapp"
                    style={{ padding: "7px 14px", fontSize: 12 }}
                    onClick={() => {
                      const msg = getWhatsAppConfirmationMessage(csrOrder, csrTemplateTab, config?.logoText || "Cartify Pakistan");
                      openWhatsApp(csrEditablePhone || csrOrder.details.phone, msg);
                    }}
                  >
                    <MessageCircle size={14} /> Send WhatsApp
                  </button>
                </div>
              </div>

              {/* 2-Column Section: Editable Address (Left) & WhatsApp Template (Right) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 16 }}>
                {/* Left Column: Editable Customer & Delivery Info */}
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14 }}>
                  <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                    📍 Delivery Address & Contact (Editable)
                  </h4>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: "#475569" }}>
                        Customer Name
                        <input
                          value={csrEditableName}
                          onChange={(e) => setCsrEditableName(e.target.value)}
                          style={{ width: "100%", height: 34, border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 8px", fontSize: 12, marginTop: 3 }}
                        />
                      </label>
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: "#475569" }}>
                        Primary Phone #
                        <input
                          value={csrEditablePhone}
                          onChange={(e) => setCsrEditablePhone(e.target.value)}
                          style={{ width: "100%", height: 34, border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 8px", fontSize: 12, marginTop: 3 }}
                        />
                      </label>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: "#475569" }}>
                        Alternate / WhatsApp #
                        <input
                          value={csrEditableAltPhone}
                          onChange={(e) => setCsrEditableAltPhone(e.target.value)}
                          placeholder="e.g. 03211234567"
                          style={{ width: "100%", height: 34, border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 8px", fontSize: 12, marginTop: 3 }}
                        />
                      </label>
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: "#475569" }}>
                        Destination City
                        <input
                          value={csrEditableCity}
                          onChange={(e) => setCsrEditableCity(e.target.value)}
                          placeholder="e.g. Lahore, Karachi"
                          style={{ width: "100%", height: 34, border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 8px", fontSize: 12, marginTop: 3 }}
                        />
                      </label>
                    </div>

                    <label style={{ fontSize: 11.5, fontWeight: 600, color: "#475569" }}>
                      Full Street Address / House / Flat #
                      <textarea
                        value={csrEditableAddress}
                        onChange={(e) => setCsrEditableAddress(e.target.value)}
                        rows={2}
                        style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 12, marginTop: 3, resize: "vertical" }}
                      />
                    </label>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: "#475569" }}>
                        Province
                        <select
                          value={csrEditableProvince}
                          onChange={(e) => setCsrEditableProvince(e.target.value)}
                          style={{ width: "100%", height: 34, border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 8px", fontSize: 12, marginTop: 3 }}
                        >
                          <option value="Punjab">Punjab</option>
                          <option value="Sindh">Sindh</option>
                          <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                          <option value="Balochistan">Balochistan</option>
                          <option value="Islamabad Capital">Islamabad Capital</option>
                          <option value="Azad Kashmir">Azad Kashmir</option>
                          <option value="Gilgit-Baltistan">Gilgit-Baltistan</option>
                        </select>
                      </label>
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: "#475569" }}>
                        Nearby Landmark
                        <input
                          value={csrEditableLandmark}
                          onChange={(e) => setCsrEditableLandmark(e.target.value)}
                          placeholder="e.g. Near Shell Pump"
                          style={{ width: "100%", height: 34, border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 8px", fontSize: 12, marginTop: 3 }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Right Column: WhatsApp Templates & Preview */}
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14, display: "flex", flexDirection: "column" }}>
                  <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                    💬 WhatsApp Confirmation Templates
                  </h4>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {[
                      { id: "urdu", label: "🇵🇰 Urdu (اردو)" },
                      { id: "english", label: "📋 English" },
                      { id: "reminder", label: "⚠️ No Answer" },
                      { id: "address", label: "📍 Address Fix" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={`csr-template-tab ${csrTemplateTab === t.id ? "active" : ""}`}
                        onClick={() => setCsrTemplateTab(t.id as any)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="csr-template-preview" style={{ flex: 1 }}>
                    {getWhatsAppConfirmationMessage(
                      {
                        ...csrOrder,
                        details: {
                          ...csrOrder.details,
                          name: csrEditableName || csrOrder.details.name,
                          address: csrEditableAddress || csrOrder.details.address,
                          city: csrEditableCity || csrOrder.details.city,
                          province: csrEditableProvince || csrOrder.details.province,
                        }
                      },
                      csrTemplateTab,
                      config?.logoText || "Cartify Pakistan"
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      type="button"
                      className="admin-secondary"
                      style={{ flex: 1, padding: "6px 10px", fontSize: 11.5, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                      onClick={() => {
                        const msg = getWhatsAppConfirmationMessage(
                          {
                            ...csrOrder,
                            details: {
                              ...csrOrder.details,
                              name: csrEditableName || csrOrder.details.name,
                              address: csrEditableAddress || csrOrder.details.address,
                              city: csrEditableCity || csrOrder.details.city,
                              province: csrEditableProvince || csrOrder.details.province,
                            }
                          },
                          csrTemplateTab,
                          config?.logoText || "Cartify Pakistan"
                        );
                        navigator.clipboard.writeText(msg);
                        toast.success("WhatsApp message copied to clipboard!");
                      }}
                    >
                      <Copy size={13} /> Copy Message
                    </button>
                    <button
                      type="button"
                      className="admin-primary"
                      style={{ flex: 1, padding: "6px 10px", fontSize: 11.5, background: "#16a34a", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                      onClick={() => {
                        const msg = getWhatsAppConfirmationMessage(
                          {
                            ...csrOrder,
                            details: {
                              ...csrOrder.details,
                              name: csrEditableName || csrOrder.details.name,
                              address: csrEditableAddress || csrOrder.details.address,
                              city: csrEditableCity || csrOrder.details.city,
                              province: csrEditableProvince || csrOrder.details.province,
                            }
                          },
                          csrTemplateTab,
                          config?.logoText || "Cartify Pakistan"
                        );
                        openWhatsApp(csrEditablePhone || csrOrder.details.phone, msg);
                        setCsrStatusInput("WhatsApp Sent");
                      }}
                    >
                      <MessageCircle size={13} /> Send on WhatsApp
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom: CSR Verification Status & Call Notes */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14 }}>
                <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                  📝 CSR Call Verification Status & Internal Log
                </h4>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {[
                    { id: "Confirmed", label: "🟢 Confirmed (Verified)", color: "#15803d", bg: "#f0fdf4" },
                    { id: "Pending", label: "🟡 Pending Call", color: "#a16207", bg: "#fefce8" },
                    { id: "No Answer (1st)", label: "🟠 1st Call No Answer", color: "#c2410c", bg: "#fff7ed" },
                    { id: "No Answer (2nd)", label: "🟠 2nd Call No Answer", color: "#c2410c", bg: "#fff7ed" },
                    { id: "No Answer (3rd)", label: "🔴 3rd Call No Answer", color: "#b91c1c", bg: "#fef2f2" },
                    { id: "WhatsApp Sent", label: "🟣 WhatsApp Sent", color: "#7e22ce", bg: "#faf5ff" },
                    { id: "Callback Requested", label: "🔵 Callback Requested", color: "#0369a1", bg: "#f0f9ff" },
                    { id: "Address Incomplete", label: "🟤 Address Incomplete", color: "#be185d", bg: "#fdf2f8" },
                    { id: "Cancelled by Customer", label: "⚫ Cancelled / Fake", color: "#64748b", bg: "#f1f5f9" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setCsrStatusInput(st.id as CsrStatus)}
                      style={{
                        padding: "5px 11px",
                        fontSize: 11.5,
                        fontWeight: csrStatusInput === st.id ? 700 : 500,
                        borderRadius: 6,
                        border: csrStatusInput === st.id ? `2px solid ${st.color}` : "1px solid #cbd5e1",
                        background: csrStatusInput === st.id ? st.bg : "#ffffff",
                        color: csrStatusInput === st.id ? st.color : "#475569",
                        cursor: "pointer",
                      }}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
                  <input
                    value={csrNoteInput}
                    onChange={(e) => setCsrNoteInput(e.target.value)}
                    placeholder="CSR Note: e.g. Customer confirmed size M, asked to deliver after 3 PM"
                    style={{ width: "100%", height: 38, border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 10px", fontSize: 12.5 }}
                  />

                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#334155", cursor: "pointer", whiteSpace: "nowrap" }}>
                    <input
                      type="checkbox"
                      checked={csrAutoMovePicklist}
                      onChange={(e) => setCsrAutoMovePicklist(e.target.checked)}
                      style={{ accentColor: "#16a34a", width: 16, height: 16 }}
                    />
                    Auto advance to Picklist if Confirmed
                  </label>
                </div>

                {/* Call History Timeline */}
                {csrOrder.details.csrHistory && csrOrder.details.csrHistory.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
                    <b style={{ fontSize: 11.5, color: "#64748b", display: "block", marginBottom: 8 }}>Call History & Verification Log:</b>
                    <div className="csr-timeline">
                      {csrOrder.details.csrHistory.map((item, idx) => (
                        <div key={item.id || idx} className="csr-timeline-item">
                          <span style={{ fontWeight: 700, color: "#1e293b" }}>{item.status}</span>
                          <span style={{ color: "#64748b", marginLeft: 8 }}>
                            {new Date(item.time).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                          </span>
                          {item.agent && <span style={{ color: "#3b82f6", marginLeft: 6 }}>({item.agent})</span>}
                          {item.note && <div style={{ color: "#334155", fontSize: 11.5, marginTop: 2 }}>"{item.note}"</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() => setCsrOrder(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="admin-primary"
                  disabled={busy}
                  onClick={async () => {
                    const timestamp = new Date().toISOString();
                    const newHistoryEntry: CsrHistoryEntry = {
                      id: Math.random().toString(36).slice(2, 9),
                      time: timestamp,
                      status: csrStatusInput,
                      note: csrNoteInput || `Status set to ${csrStatusInput}`,
                      agent: data?.name || "CSR Agent",
                    };
                    const updatedHistory = [newHistoryEntry, ...(csrOrder.details.csrHistory || [])];

                    const nextPipelineStatus = (csrAutoMovePicklist && csrStatusInput === "Confirmed" && ["Pending", "Test order received"].includes(csrOrder.status))
                      ? "Picklist"
                      : csrStatusInput === "Cancelled by Customer" ? "Cancelled" : undefined;

                    const updatedDetails = {
                      ...csrOrder.details,
                      name: csrEditableName || csrOrder.details.name,
                      phone: csrEditablePhone || csrOrder.details.phone,
                      alternatePhone: csrEditableAltPhone,
                      address: csrEditableAddress || csrOrder.details.address,
                      city: csrEditableCity || csrOrder.details.city,
                      province: csrEditableProvince || csrOrder.details.province,
                      landmark: csrEditableLandmark,
                      csrStatus: csrStatusInput,
                      csrNotes: csrNoteInput,
                      csrConfirmedAt: csrStatusInput === "Confirmed" ? timestamp : csrOrder.details.csrConfirmedAt,
                      csrAgent: data?.name || "CSR Agent",
                      csrHistory: updatedHistory,
                    };

                    const payload: any = {
                      action: "order",
                      id: csrOrder.id,
                      details: updatedDetails,
                      csrStatus: csrStatusInput,
                      csrNotes: csrNoteInput,
                      csrConfirmedAt: updatedDetails.csrConfirmedAt,
                      csrAgent: updatedDetails.csrAgent,
                      csrHistory: updatedHistory,
                    };
                    if (nextPipelineStatus) payload.status = nextPipelineStatus;

                    const ok = await write(payload);
                    if (ok) {
                      setData((curr) => curr ? {
                        ...curr,
                        orders: curr.orders.map((o) => o.id === csrOrder.id ? {
                          ...o,
                          status: nextPipelineStatus || o.status,
                          details: updatedDetails,
                        } : o)
                      } : curr);
                      toast.success(`Order ${csrOrder.id}: CSR verification updated!`);
                      setCsrOrder(null);
                    }
                  }}
                >
                  <Save size={15} /> Save CSR Verification
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Manual Order Creation Modal */}
      <ManualOrderModal
        open={manualOrderModalOpen}
        onOpenChange={setManualOrderModalOpen}
        products={products}
        orders={orders}
        config={config}
        currentUser={data ? { name: data.name, role: data.role } : undefined}
        onOrderCreated={(newOrder) => {
          setData((current) =>
            current
              ? {
                  ...current,
                  orders: [newOrder, ...current.orders.filter((o) => o.id !== newOrder.id)],
                }
              : current
          );
          load();
        }}
        onPrintAirwayBill={(order) => {
          setAirwayBillOrders([order]);
          setCourierName(order.details.courier || "Trax Logistics");
          setTimeout(() => window.print(), 150);
        }}
        onNavigateToOrder={(orderId) => {
          setSection("orders");
          setQuery(orderId);
        }}
      />

      {/* Customer Lifetime History Drawer */}
      <CustomerHistoryDrawer
        phone={customerHistoryPhone}
        orders={orders as LifecycleOrder[]}
        open={!!customerHistoryPhone}
        onOpenChange={(open) => {
          if (!open) setCustomerHistoryPhone(null);
        }}
        onSelectOrder={(ord) => {
          setSelected(ord as any);
          setStatus(ord.status);
          setSaveError("");
        }}
      />

      {/* Order Audit Timeline Drawer */}
      <OrderHistoryDrawer
        order={historyTimelineOrder}
        open={!!historyTimelineOrder}
        onOpenChange={(open) => {
          if (!open) setHistoryTimelineOrder(null);
        }}
      />

      {/* COD Settlement & Remittance Reconciliation Modal */}
      <CodSettlementModal
        open={codSettlementOpen}
        onOpenChange={setCodSettlementOpen}
        orders={orders as LifecycleOrder[]}
        currentUser={{ role: data?.role, name: data?.name, permissions: data?.permissions }}
        onRecordSettlement={async (orderId, txParams) => {
          const res = await write({
            action: "cod-settle",
            orderId,
            ...txParams,
          });
          if (res && res.ok) {
            setData((curr) =>
              curr
                ? {
                    ...curr,
                    orders: curr.orders.map((o) =>
                      o.id === orderId
                        ? {
                            ...o,
                            status: res.status || o.status,
                            details: {
                              ...o.details,
                              ...(res.details || {}),
                            },
                          }
                        : o
                    ),
                  }
                : curr
            );
            if (selected?.id === orderId) {
              setSelected((curr) =>
                curr
                  ? {
                      ...curr,
                      status: res.status || curr.status,
                      details: { ...curr.details, ...(res.details || {}) },
                    }
                  : null
              );
            }
            toast.success(`COD settlement of Rs. ${txParams.amount} recorded`);
            return true;
          }
          return false;
        }}
        onBulkRemittance={async (batch) => {
          const res = await write({
            action: "cod-bulk-remittance",
            ...batch,
          });
          if (res && res.ok) {
            await load();
            toast.success(
              `Remittance ${batch.remittanceId} processed: ${batch.orderSettlements.length} orders settled`
            );
            return true;
          }
          return false;
        }}
        onReverseSettlement={async (orderId, transactionId, reason, note) => {
          const res = await write({
            action: "cod-reverse",
            orderId,
            transactionId,
            reason,
            note,
          });
          if (res && res.ok) {
            setData((curr) =>
              curr
                ? {
                    ...curr,
                    orders: curr.orders.map((o) =>
                      o.id === orderId
                        ? {
                            ...o,
                            status: res.status || o.status,
                            details: {
                              ...o.details,
                              ...(res.details || {}),
                            },
                          }
                        : o
                    ),
                  }
                : curr
            );
            if (selected?.id === orderId) {
              setSelected((curr) =>
                curr
                  ? {
                      ...curr,
                      status: res.status || curr.status,
                      details: { ...curr.details, ...(res.details || {}) },
                    }
                  : null
              );
            }
            toast.success("Settlement reversal recorded successfully");
            return true;
          }
          return false;
        }}
        onDisputeOrder={async (orderId, reason, notes, resolve) => {
          const res = await write({
            action: "cod-dispute",
            orderId,
            reason,
            notes,
            resolve,
          });
          if (res && res.ok) {
            setData((curr) =>
              curr
                ? {
                    ...curr,
                    orders: curr.orders.map((o) =>
                      o.id === orderId
                        ? {
                            ...o,
                            details: {
                              ...o.details,
                              ...(res.details || {}),
                            },
                          }
                        : o
                    ),
                  }
                : curr
            );
            if (selected?.id === orderId) {
              setSelected((curr) =>
                curr
                  ? {
                      ...curr,
                      details: { ...curr.details, ...(res.details || {}) },
                    }
                  : null
              );
            }
            toast.success(resolve ? "Dispute resolved" : "Order flagged as Disputed");
            return true;
          }
          return false;
        }}
        onSelectOrderForDetails={(ord) => {
          setSelected(ord as any);
          setStatus(ord.status);
          setSaveError("");
        }}
      />

      {/* Dedicated Permanent Delete Order Modal */}
      <DeleteOrderModal
        order={deleteModalOrder as LifecycleOrder | null}
        open={!!deleteModalOrder}
        onOpenChange={(open) => {
          if (!open) setDeleteModalOrder(null);
        }}
        onDelete={async (targetOrder, reason, note) => {
          const res = await write({
            action: "delete-order",
            id: targetOrder.id,
            reason,
            note,
          });
          if (res) {
            setData((curr) =>
              curr
                ? {
                    ...curr,
                    orders: curr.orders.filter((item) => item.id !== targetOrder.id),
                  }
                : curr
            );
            setSelectedOrderIds((curr) => curr.filter((id) => id !== targetOrder.id));
            if (selected?.id === targetOrder.id) {
              setSelected(null);
            }
            toast.success(`Order #${targetOrder.id.slice(0, 8)} deleted permanently`);
            return true;
          }
          return false;
        }}
        onCancelInstead={(targetOrder) => {
          setCancelModalOrder(targetOrder as any);
          setCancelReason("Customer changed mind / duplicate order");
          setCancelCustomNote("");
        }}
      />

      {/* Returns & Refunds Detail Drawer */}
      <ReturnDetailDrawer
        returnRequest={selectedReturn}
        open={!!selectedReturn}
        busy={busy}
        onOpenChange={(open) => {
          if (!open) setSelectedReturn(null);
        }}
        onUpdateStatus={async (returnId, status, opts) => {
          const res = await write({
            action: "update-return-status",
            returnId,
            status,
            rejectionReason: opts?.rejectionReason,
            courier: opts?.courier,
            trackingNumber: opts?.trackingNumber,
            note: opts?.note,
          });
          if (res) {
            await load();
            setSelectedReturn(res.returnRequest);
          }
          return !!res;
        }}
        onInspect={async (returnId, inspectionStatus, notes) => {
          const res = await write({
            action: "inspect-return",
            returnId,
            inspectionStatus,
            notes,
          });
          if (res) {
            await load();
            setSelectedReturn(res.returnRequest);
            toast.success('Inspection saved');
          }
          return !!res;
        }}
        onRestock={async (returnId, itemIndexes, note, action) => {
          const res = await write({
            action: "restock-return-items",
            returnId,
            itemIndexes,
            note,
            restockAction: action || "restock",
          });
          if (res) {
            await load();
            setSelectedReturn(res.returnRequest);
          }
          return !!res;
        }}
        onProcessRefund={async (returnId, refundData) => {
          const res = await write({
            action: "process-refund",
            returnId,
            ...refundData,
          });
          if (res) {
            await load();
            setSelectedReturn(res.returnRequest);
          }
          return !!res;
        }}
        onAddNote={async (returnId, note) => {
          const res = await write({
            action: "add-return-note",
            returnId,
            note,
          });
          if (res) {
            await load();
            setSelectedReturn(res.returnRequest);
            toast.success('Note added');
          }
          return !!res;
        }}
        onNavigateToOrder={(orderId) => {
          setSelectedReturn(null);
          setSection("orders");
          setExpandedSection("orders");
          setOrderMainTab("overview");
          setOrderSubTab("all");
          const targetOrd = orders.find((o) => o.id === orderId);
          if (targetOrd) {
            setSelected(targetOrd);
          }
        }}
      />

      {/* Create Return Modal */}
      <CreateReturnModal
        open={createReturnModalOpen}
        orders={orders}
        existingReturns={returnRequests}
        busy={busy}
        onOpenChange={(open) => setCreateReturnModalOpen(open)}
        onCreateReturn={async (returnData) => {
          const res = await write({
            action: "create-return",
            ...returnData,
          });
          if (res) {
            await load();
            setCreateReturnModalOpen(false);
            return true;
          }
          return false;
        }}
      />

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="admin-dialog" style={{ maxWidth: 560 }}>
          <DialogHeader>
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link size={18} /> Import listing from link
            </DialogTitle>
            <DialogDescription>
              Paste a public product page URL. Cartify will read its title, description, image and price into a draft for you to review.
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
              Product page link
              <input
                autoFocus
                type="url"
                value={importUrl}
                onChange={(event) => setImportUrl(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") void importListingFromLink(); }}
                placeholder="https://example.com/products/item"
                style={{ width: "100%", marginTop: 7, padding: "11px 12px", border: "1px solid #cbd5e1", borderRadius: 8 }}
              />
            </label>
            <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>
              Only public HTTP/HTTPS pages are supported. You can edit every imported field before saving.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button type="button" className="admin-secondary" onClick={() => setImportDialogOpen(false)} disabled={importBusy}>Cancel</button>
              <button type="button" className="admin-primary" onClick={() => void importListingFromLink()} disabled={importBusy || !importUrl.trim()}>
                {importBusy ? "Importing…" : "Import and review"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
        <DialogContent className="admin-dialog" style={{ maxWidth: 680 }}>
          <DialogHeader>
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Upload size={18} /> Import products from CSV
            </DialogTitle>
            <DialogDescription>
              Upload a CSV with one product per row. Imported products are created as drafts so you can review them before publishing.
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "grid", gap: 14, marginTop: 8 }}>
            <label className="admin-secondary" style={{ display: "inline-flex", width: "fit-content", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <Upload size={16} /> {csvFileName || "Choose CSV file"}
              <input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(event) => void readCsv(event.target.files?.[0])} />
            </label>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, fontSize: 12, color: "#475569" }}>
              Required headers: <b>name, category, price</b><br />
              Optional headers: subcategory, old, sku, description, image, stock, status
            </div>
            {csvRows.length > 0 && (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "auto", maxHeight: 220 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr><th style={{ textAlign: "left", padding: 9 }}>Product</th><th style={{ textAlign: "left", padding: 9 }}>Category</th><th style={{ textAlign: "left", padding: 9 }}>Price</th><th style={{ textAlign: "left", padding: 9 }}>SKU</th></tr></thead>
                  <tbody>{csvRows.slice(0, 10).map((row) => <tr key={row.id}><td style={{ padding: 9 }}>{row.name}</td><td style={{ padding: 9 }}>{row.category}</td><td style={{ padding: 9 }}>Rs. {row.price}</td><td style={{ padding: 9 }}>{row.sku || "—"}</td></tr>)}</tbody>
                </table>
                {csvRows.length > 10 && <p style={{ margin: 0, padding: 9, color: "#64748b" }}>Showing 10 of {csvRows.length} rows.</p>}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="admin-secondary" onClick={() => setCsvDialogOpen(false)} disabled={importBusy}>Cancel</button>
              <button type="button" className="admin-primary" onClick={() => void importCsvRows()} disabled={importBusy || !csvRows.length}>
                {importBusy ? "Importing…" : `Import ${csvRows.length || ""} product${csvRows.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden container that becomes visible during window.print() via @media print */}
      {airwayBillOrders && (
        <div className="printable-airway-bills">
          {airwayBillOrders.map((ord) => (
            <AirwayBillSlip
              key={ord.id}
              order={ord}
              format={airwayBillFormat}
              weight={airwayWeight}
              pieces={airwayPieces}
              courier={ord.details.courier || courierName}
              trackingNumber={ord.details.trackingNumber || trackingNumber}
              storeConfig={config}
            />
          ))}
        </div>
      )}
    </SidebarProvider>
  );
}
function TruckIcon() {
  return <Package size={21} />;
}
