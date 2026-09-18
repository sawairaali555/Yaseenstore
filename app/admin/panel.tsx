"use client";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Settings as SettingsIcon,
  ExternalLink,
  Plus,
  Search,
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
import { categories as defaultCategories, money, effectivePrice } from "@/app/catalog";
import {
  ALL_PAKISTAN_CITIES,
  PAKISTAN_PROVINCES,
  PAKISTAN_CITIES_BY_PROVINCE,
  cleanPakistanPhone,
  isValidPakistanPhone,
} from "@/lib/pakistan-locations";
import { colors, packOptions } from "@/lib/listing-options";
import Overview from "./overview";
import Categories from "./categories";
import Reviews from "./reviews";
import ImageManager from "./image-manager";
import Logout from "./logout";
import "./seller.css";
import type { CategoryNode } from "@/lib/categories";
import type { ManagedProduct, Settings } from "@/lib/store-data";

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
    trackingNumber?: string;
    csrStatus?: CsrStatus;
    csrNotes?: string;
    csrConfirmedAt?: string;
    csrAgent?: string;
    csrHistory?: CsrHistoryEntry[];
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
  }[];
};
type Data = {
  name: string;
  role: string;
  permissions: string[];
  products: ManagedProduct[];
  orders: Order[];
  settings: Settings;
  categories?: CategoryNode[];
};
const sections = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "products", label: "Products", icon: Package },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "customers", label: "Customers", icon: Users },
  { id: "settings", label: "Store settings", icon: SettingsIcon },
  { id: "reviews", label: "Reviews", icon: CheckCircle2, hidden: true },
];
export type OrderMainTab = "overview" | "new_csr" | "fulfillment" | "shipping" | "completed" | "issues_returns";
export const pipelineSteps = [
  { id: "Pending", label: "Placed", aliases: ["Pending", "Test order received"], icon: Check },
  { id: "Picklist", label: "Picklist", aliases: ["Picklist"], icon: Package },
  { id: "Pack & AirwayBill", label: "Pack & AWB", aliases: ["Pack & AirwayBill", "Processing"], icon: Printer },
  { id: "Shipped", label: "Shipped", aliases: ["Shipped", "Dispatched"], icon: Truck },
  { id: "Delivered", label: "Delivered", aliases: ["Delivered"], icon: CheckCircle2 },
];
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
  storeName = "Zeliy Pakistan"
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
  if (img.startsWith("/") || img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:")) return img;
  return "/images/" + img + ".jpg";
};
const imageUrl = (value: string) =>
  /^https?:\/\//.test(value) ? value : "/images/" + value + ".jpg";
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "colour";
const sizeOptionsFor = (product: ManagedProduct) => {
  const text = (product.name + " " + product.category + " " + (product.subcategory || "")).toLowerCase();
  if (product.sizes?.length) return product.sizes;
  if (text.match(/shoe|sneaker/)) return ["38", "39", "40", "41", "42", "43", "44"];
  if (product.category === "Fashion" || text.match(/dress|clothing/)) return ["XS", "S", "M", "L", "XL"];
  if (text.includes("bag") || product.category === "Accessories") return ["Standard", "Small", "Medium", "Large"];
  return ["Standard"];
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
    [productsOpen, setProductsOpen] = useState(true),
    [ordersOpen, setOrdersOpen] = useState(true),
    [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All statuses"),
    [categoryFilter, setCategoryFilter] = useState(""),
    [groupStatusFilter, setGroupStatusFilter] = useState(""),
    [stockFilter, setStockFilter] = useState(""),
    [editing, setEditing] = useState<ManagedProduct | null>(null),
    [addColorSource, setAddColorSource] = useState<ManagedProduct | null>(null),
    [addColorChoice, setAddColorChoice] = useState(""),
    [addColorImages, setAddColorImages] = useState<string[]>([]),
    [imageEditing, setImageEditing] = useState<ManagedProduct | null>(null),
    [priceEditing, setPriceEditing] = useState<ManagedProduct | null>(null),
    [stockEditing, setStockEditing] = useState<ManagedProduct | null>(null),
    [stockValue, setStockValue] = useState(""),
    [stockValues, setStockValues] = useState<Record<string, string>>({}),
    [stockColorChoice, setStockColorChoice] = useState(""),
    [priceValue, setPriceValue] = useState(""),
    [originalPriceValue, setOriginalPriceValue] = useState(""),
    [costPriceValue, setCostPriceValue] = useState(""),
    [offerPriceValue, setOfferPriceValue] = useState(""),
    [offerStartValue, setOfferStartValue] = useState(""),
    [offerEndValue, setOfferEndValue] = useState(""),
    [priceMode, setPriceMode] = useState<"uniform" | "variant" | "offer">("uniform"),
    [variantPrices, setVariantPrices] = useState<Record<string, { price: string; old: string }>>({}),
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
    [manualSizeChoice, setManualSizeChoice] = useState("Standard"),
    [manualQtyChoice, setManualQtyChoice] = useState(1),
    [manualCustomDelivery, setManualCustomDelivery] = useState("200"),
    [manualCustomDiscount, setManualCustomDiscount] = useState("0"),
    [manualOpenWhatsappAfter, setManualOpenWhatsappAfter] = useState(true);

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
  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/admin");
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
      setConfig(d.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load store data.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (new URLSearchParams(location.search).get("section") === "products")
      setSection("products");
    load();
  }, []);
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
    setManualCustomerName("");
    setManualCustomerPhone("");
    setManualCustomerAltPhone("");
    setManualCustomerAddress("");
    setManualCustomerCity("Lahore");
    setManualCustomerCustomCity("");
    setManualCustomerProvince("Punjab");
    setManualCustomerLandmark("");
    setManualCustomerSource("WhatsApp Order");
    setManualOrderNote("");
    setManualInitialCsrStatus("Confirmed");
    setManualOrderItems([]);
    const firstProd = products.find((p) => p.status === "Active") || products[0];
    if (firstProd) {
      setManualProductChoice(firstProd.id);
      setManualSizeChoice(sizeOptionsFor(firstProd)[0] || "Standard");
    }
    setManualQtyChoice(1);
    setManualCustomDelivery(String(config?.deliveryCharge !== undefined ? config.deliveryCharge : 200));
    setManualCustomDiscount("0");
    setManualOpenWhatsappAfter(true);
    setManualOrderModalOpen(true);
  }

  async function handleCreateManualOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCustomerName.trim()) {
      toast.error("Please enter the customer name.");
      return;
    }
    const cleanedPhone = cleanPakistanPhone(manualCustomerPhone);
    if (!isValidPakistanPhone(cleanedPhone)) {
      toast.error("Please enter a valid Pakistani mobile number (e.g. 0300 1234567).");
      return;
    }
    const finalCity = manualCustomerCity === "Other"
      ? manualCustomerCustomCity.trim()
      : manualCustomerCity.trim();
    if (!finalCity) {
      toast.error("Please select or enter destination city.");
      return;
    }
    if (!manualCustomerAddress.trim()) {
      toast.error("Please enter customer street/delivery address.");
      return;
    }
    if (manualOrderItems.length === 0) {
      toast.error("Please add at least one product item to the order.");
      return;
    }

    setBusy(true);
    try {
      const parsedDelivery = Math.max(0, parseInt(manualCustomDelivery) || 0);
      const parsedDiscount = Math.max(0, parseInt(manualCustomDiscount) || 0);
      const fullAddress = manualCustomerLandmark.trim()
        ? `${manualCustomerAddress.trim()} (Near: ${manualCustomerLandmark.trim()})`
        : manualCustomerAddress.trim();

      const payload = {
        name: manualCustomerName.trim(),
        phone: cleanedPhone,
        alternatePhone: manualCustomerAltPhone.trim() || undefined,
        city: finalCity,
        province: manualCustomerProvince || undefined,
        state: manualCustomerProvince || undefined,
        address: fullAddress,
        landmark: manualCustomerLandmark.trim() || undefined,
        source: manualCustomerSource || "Manual Order",
        note: manualOrderNote.trim() || undefined,
        paymentMethod: "cod",
        csrStatus: manualInitialCsrStatus,
        csrAgent: data?.name || "Admin",
        csrConfirmedAt: manualInitialCsrStatus === "Confirmed" ? new Date().toISOString() : undefined,
        customDelivery: parsedDelivery,
        customDiscount: parsedDiscount,
        status: manualInitialCsrStatus === "Confirmed" ? "Picklist" : "Test order received",
        items: manualOrderItems.map((item) => ({
          id: item.id,
          qty: item.qty,
          size: item.size || "Standard",
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const out: any = await res.json();
      if (!res.ok) throw new Error(out.error || "Unable to place order.");

      const newOrder: Order = {
        id: out.id,
        token: out.token,
        total: out.total,
        status: out.status,
        created_at: out.created_at || new Date().toISOString(),
        details: out.details,
        items: out.items,
      };

      setData((current) => current ? {
        ...current,
        orders: [newOrder, ...current.orders.filter((o) => o.id !== newOrder.id)],
      } : current);

      toast.success(`Order ${out.id} placed successfully!`);
      setManualOrderModalOpen(false);

      if (manualOpenWhatsappAfter) {
        const msg = getWhatsAppConfirmationMessage(newOrder, "urdu", config?.logoText || "Zeliy Pakistan");
        openWhatsApp(newOrder.details.phone, msg);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to place manual order.");
    } finally {
      setBusy(false);
    }
  }

  function navigate(s: string, orderFilterStatus?: string) {
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
      } else {
        setOrderMainTab("overview");
        setOrderSubTab("all");
      }
    }
  }
  async function write(payload: unknown) {
    setBusy(true);
    setSaveError("");
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      return d || true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to save changes";
      setSaveError(message);
      toast.error(message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function newProduct() {
    location.href = "/admin/products/new";
  }
  async function deleteProducts(ids: string[]) {
    const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
    if (!uniqueIds.length || busy) return;
    const label = uniqueIds.length === 1 ? "this product" : `${uniqueIds.length} selected products`;
    if (!window.confirm(`Delete ${label} permanently?`)) return;
    for (const id of uniqueIds) {
      const ok = await write({ action: "delete-product", id });
      if (!ok) return;
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

  async function saveVariantGroupStatus(product: ManagedProduct, status: "Active" | "Draft") {
    const groupId = product.listingGroup || product.id;
    const groupItems = (data?.products || []).filter((item) => (item.listingGroup || item.id) === groupId);
    for (const item of groupItems) {
      const next = { ...item, status };
      await write({ action: "product", product: next });
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
      setAddColorSource(source); setAddColorChoice("");
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
  const filteredProducts = products.filter((p) => {
    const matchesStatus = filter === "All statuses" || p.status === filter;
    const matchesCategory = !categoryFilter || p.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchesGroupStatus = !groupStatusFilter || p.status.toLowerCase() === groupStatusFilter.toLowerCase();
    const stockVal = (p as any).stock ?? 0;
    const matchesStock = !stockFilter || (stockFilter === "In stock" ? stockVal > 0 : stockVal <= 0);
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || (p.name + " " + p.category + " " + (p.sku || "") + " " + (p.color || "")).toLowerCase().includes(q);
    return matchesStatus && matchesCategory && matchesGroupStatus && matchesStock && matchesQuery;
  });
  const variantsFor = (product: ManagedProduct) =>
    products
      .filter((item) => (item.listingGroup || item.id) === (product.listingGroup || product.id))
      .filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index);
  const colorVariantsFor = (product: ManagedProduct) => {
    const group = product.listingGroup || product.id;
    const variants = variantsFor(product);
    const specificColours = variants.filter(
      (item) => item.id !== group && item.color && item.color !== "Not applicable"
    );
    if (specificColours.length > 0) return specificColours;
    return variants.filter(
      (item) => item.id !== group && item.color !== "Not applicable"
    );
  };
  const openStockEditor = (product: ManagedProduct) => {
    const variants = variantsFor(product);
    setStockEditing(product);
    setStockValue(String((product as any).stock ?? 0));
    setStockValues(Object.fromEntries(variants.flatMap((item) => [[item.id, String((item as any).stock ?? 0)], ...sizeOptionsFor(item).map((size) => [item.id + ":" + size, String(((item as any).sizeStock || {})[size] ?? "")])])));
    setStockColorChoice("");
  };
  const productRows = Array.from(
    filteredProducts.reduce((map, product) => {
      const group = product.listingGroup || product.id;
      const current = map.get(group);
      if (!current || product.id === group) map.set(group, product);
      return map;
    }, new Map<string, ManagedProduct>()).values(),
  );
  function BarcodeSVG({ value, height = 40 }: { value: string; height?: number }) {
    const bars: number[] = [];
    bars.push(2, 1, 2, 1);
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      bars.push((code % 3) + 1, ((code >> 1) % 2) + 1, ((code >> 2) % 3) + 1, 1);
    }
    bars.push(2, 1, 2, 2);

    let currentX = 0;
    return (
      <svg viewBox={`0 0 260 ${height}`} width="100%" height={height} preserveAspectRatio="none" style={{ display: "block" }}>
        {bars.map((barWidth, idx) => {
          const isBlack = idx % 2 === 0;
          const x = currentX;
          currentX += barWidth * 2.2;
          if (!isBlack) return null;
          return <rect key={idx} x={x} y={0} width={barWidth * 1.8} height={height} fill="#000000" />;
        })}
      </svg>
    );
  }

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
            <h2>{storeConfig?.logoText || "ZELIY PAKISTAN"}</h2>
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
            <BarcodeSVG value={trk} height={36} />
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
            <b style={{ fontSize: "11.5px", display: "block" }}>Zeliy Pakistan Central Hub</b>
            <div style={{ fontSize: "10px", lineHeight: 1.3, color: "#333", marginTop: "2px" }}>
              Plot 45, Sector 15, Korangi Industrial Area, Karachi, Sindh, Pakistan
            </div>
            <div style={{ fontSize: "10px", fontWeight: 600, marginTop: "3px" }}>
              Support: +92 300 0000000 | info@zeliy.pk
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

  function OrderTable({ rows }: { rows: Order[] }) {
    const copyText = (text: string, label: string) => {
      if (!text) return;
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied!`);
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
          
          const currentStepIdx = getStepIndex(o.status);
          const isCancelled = o.status === "Cancelled" || o.details.csrStatus === "Cancelled by Customer";
          const isCsrConfirmed = o.details.csrStatus === "Confirmed";
          const isPlaced = ["Pending", "Test order received", "New", "Placed"].includes(o.status);
          const isPicklist = o.status === "Picklist";
          const isPacking = ["Pack & AirwayBill", "Packing", "Processing"].includes(o.status);
          const isShipped = ["Shipped", "Dispatched", "Out for Delivery", "In Transit"].includes(o.status);
          const isDelivered = o.status === "Delivered";
          const isFailedDelivery = o.status === "Failed Delivery" || o.details.courierStatus === "Failed Delivery";
          const isReturnRequested = o.status === "Return Requested" || o.details.returnStatus === "Requested";

          const trackingUrl = getCourierTrackingUrl(o.details.courier, o.details.trackingNumber);
          const customerHistory = getCustomerHistory(orders, o.details.phone, o.id);
          const exceptions = getOrderExceptions(o, orders);

          const createdDate = o.created_at ? new Date(o.created_at) : null;
          const timeFormatted = createdDate && !isNaN(createdDate.getTime())
            ? createdDate.toLocaleDateString("en-PK", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
            : "Recent";

          return (
            <div className="order-card-container" key={o.id}>
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
                    style={{ width: 16, height: 16, accentColor: "#203664", cursor: "pointer", flexShrink: 0 }}
                    aria-label={`Select order ${o.id}`}
                  />
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
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
                      <Copy size={12} />
                    </button>
                  </div>

                  <span className="order-time-badge">🕒 {timeFormatted}</span>
                  <span className="order-source-badge">
                    {o.details.source ? o.details.source.split(",")[0] : "Web Store"}
                  </span>

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
                          🚚 {o.details.courier || "Trax"}: {o.details.trackingNumber} <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="order-cn-badge">
                          🚚 {o.details.courier || "Trax"}: {o.details.trackingNumber}
                        </span>
                      )}
                      <button
                        type="button"
                        className="copy-btn-mini"
                        onClick={() => copyText(o.details.trackingNumber || "", "Tracking Number")}
                        title="Copy Tracking Number"
                      >
                        <Copy size={12} />
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
                      <User size={15} style={{ color: "#4f46e5" }} />
                      <span>{o.details.name}</span>
                    </div>

                    {customerHistory.isFirstOrder ? (
                      <span className="order-customer-history-tag" title="First time customer on store">
                        ✨ 1st Order
                      </span>
                    ) : (
                      <span
                        className={`order-customer-history-tag ${customerHistory.rtoCount > 0 ? "risk" : "loyal"}`}
                        title={`${customerHistory.count} total orders, ${customerHistory.deliveredCount} delivered, ${customerHistory.rtoCount} RTO/returned`}
                      >
                        {customerHistory.rtoCount > 0 ? "⚠️" : "📦"} {customerHistory.count} Orders · {customerHistory.deliveredCount} Delv{customerHistory.rtoCount > 0 ? ` · ${customerHistory.rtoCount} RTO` : ""}
                      </span>
                    )}
                  </div>

                  {/* Warning Exception Badges */}
                  {exceptions.length > 0 && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", margin: "2px 0" }}>
                      {exceptions.map((exc, idx) => (
                        <span
                          key={idx}
                          className="order-exception-pill"
                          style={{ background: exc.bg, color: exc.color, border: `1px solid ${exc.border}` }}
                        >
                          {exc.label}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="order-phone-row">
                    <span>📞 <b>{o.details.phone}</b></span>
                    <button
                      type="button"
                      className="copy-btn-mini"
                      onClick={() => copyText(o.details.phone, "Phone Number")}
                      title="Copy phone number"
                    >
                      <Copy size={12} />
                    </button>
                    {o.details.alternatePhone && (
                      <span style={{ fontSize: 11, color: "#64748b", background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>
                        Alt: {o.details.alternatePhone}
                      </span>
                    )}
                  </div>

                  <div className="order-address-box">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span className="city-tag">📍 {o.details.city}{o.details.province ? `, ${o.details.province}` : ""}, PK</span>
                      <button
                        type="button"
                        className="copy-btn-mini"
                        onClick={() => copyText(`${o.details.name}\n${o.details.phone}\n${o.details.address}, ${o.details.city}${o.details.province ? ", " + o.details.province : ""}`, "Full Delivery Address")}
                        title="Copy full delivery address for rider/courier"
                      >
                        <Copy size={11} /> Copy Address
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
                      className="csr-btn csr-btn-call"
                      title="Call customer via dialer"
                    >
                      <Phone size={13} /> Call
                    </a>

                    <button
                      type="button"
                      className="csr-btn csr-btn-whatsapp"
                      title="Send WhatsApp confirmation message in Urdu"
                      onClick={() => {
                        const msg = getWhatsAppConfirmationMessage(o, "urdu", config?.logoText || "Zeliy Pakistan");
                        openWhatsApp(o.details.phone, msg);
                      }}
                    >
                      <MessageCircle size={13} /> WhatsApp
                    </button>

                    <button
                      type="button"
                      className="csr-btn csr-btn-verify"
                      title="Open CSR verification drawer to edit address, log notes, and update verification status"
                      onClick={() => openCsrModal(o)}
                    >
                      <PhoneCall size={13} /> CSR Log
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
                      {pipelineSteps.map((step, idx) => {
                        const StepIcon = step.icon;
                        const isCurrent = currentStepIdx === idx;
                        const isPassed = currentStepIdx > idx;
                        const isActive = isCurrent || isPassed;
                        return (
                          <div
                            key={step.id}
                            className={`milestone-step-display ${isActive ? "active" : ""} ${isCurrent ? "current" : ""} ${isPassed ? "passed" : ""}`}
                          >
                            <div className="milestone-circle">
                              {isPassed ? <Check size={13} /> : <StepIcon size={12} />}
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
                        🚚 <b>{o.details.courier || "Trax"}:</b> {o.details.trackingNumber}
                      </span>
                    ) : isCsrConfirmed ? (
                      <span className="stepper-meta-item" style={{ color: "#166534" }}>
                        🟢 CSR Verified by {o.details.csrAgent || "CSR Agent"} {o.details.csrConfirmedAt ? `(${new Date(o.details.csrConfirmedAt).toLocaleDateString("en-PK", { month: "short", day: "numeric" })})` : ""}
                      </span>
                    ) : (
                      <span className="stepper-meta-item" style={{ color: "#a16207" }}>
                        🟡 Pending customer verification call
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
                          <span className="multi-item-tag" onClick={() => { setSelected(o); setStatus(o.status); }}>
                            +{o.items.length - 1} more item{o.items.length > 2 ? "s" : ""}
                          </span>
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
                          display: "inline-block",
                          marginTop: 2,
                        }}>
                          📍 PK Warehouse
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Smart ONE Primary Action Button */}
                  <div className="order-smart-actions">
                    {isCancelled ? (
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
                        title="Reactivate cancelled order"
                      >
                        <RotateCcw size={13} /> Reactivate Order
                      </button>
                    ) : isReturnRequested ? (
                      <button
                        type="button"
                        className="order-primary-btn review-return"
                        onClick={() => {
                          setSelected(o);
                          setStatus(o.status);
                          setSaveError("");
                        }}
                        title="Review customer return request and process resolution"
                      >
                        <RotateCcw size={13} /> Review Return
                      </button>
                    ) : isFailedDelivery ? (
                      <button
                        type="button"
                        className="order-primary-btn resolve-delivery"
                        onClick={() => {
                          setCourierOrder(o);
                          setCourierName(o.details.courier || "Trax Logistics");
                          setTrackingNumber(o.details.trackingNumber || `TRX-${o.id.replace("ZPK-", "")}`);
                        }}
                        title="Resolve courier delivery issue or re-dispatch package"
                      >
                        <AlertTriangle size={13} /> Resolve Delivery
                      </button>
                    ) : !isCsrConfirmed ? (
                      <button
                        type="button"
                        className="order-primary-btn confirm"
                        disabled={busy}
                        onClick={() => updateCsrStatus(o, "Confirmed", "Quick verified on call", true)}
                        title="Confirm order over phone and automatically move to Picklist"
                      >
                        <Check size={14} /> Confirm Order
                      </button>
                    ) : isPlaced ? (
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
                        title="Move order into warehouse picklist"
                      >
                        <Package size={14} /> Add to Picklist
                      </button>
                    ) : isPicklist ? (
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
                        title="Move order to packaging and Airway Bill generation"
                      >
                        <Package size={14} /> Start Packing
                      </button>
                    ) : isPacking ? (
                      !o.details.trackingNumber ? (
                        <button
                          type="button"
                          className="order-primary-btn airwaybill"
                          onClick={() => {
                            setAirwayBillOrders([o]);
                            setCourierName(o.details.courier || "Trax Logistics");
                            setTrackingNumber(o.details.trackingNumber || `TRX-${o.id.replace("ZPK-", "")}`);
                          }}
                          title="Generate and print official Airway Bill shipping label"
                        >
                          <Printer size={14} /> Generate Airway Bill
                        </button>
                      ) : (
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
                            title="Mark as handed over to courier rider"
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
                      )
                    ) : isShipped ? (
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
                          title="Confirm parcel delivery & COD cash collection"
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
                        <Truck size={12} style={{ color: "#059669" }} /> Courier
                      </button>

                      <button
                        type="button"
                        className="order-sub-btn"
                        onClick={() => setHistoryOrder(o)}
                        title="View status logs and CSR timeline"
                      >
                        <Clock size={12} style={{ color: "#6366f1" }} /> History
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
                        <SlidersHorizontal size={12} style={{ color: "#475569" }} /> Details
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
                          <X size={12} /> Cancel
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
  const heading = sections.find((s) => s.id === section)!.label;
  return (
    <SidebarProvider className="admin-shell">
      <Toaster richColors />
      <Sidebar className="admin-sidebar">
        <SidebarHeader className="admin-brand">
          <a href="/admin" className="logo">
            zeliy<span>.</span>
            <small>STORE ADMIN</small>
          </a>
        </SidebarHeader>
        <SidebarContent>
          <div className="admin-shop">
            <span>
              <Store size={19} />
            </span>
            <div>
              <b>Zeliy Pakistan</b>
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
              .map((s) => (
                <SidebarMenuItem key={s.id}>
                  <SidebarMenuButton
                    isActive={section === s.id}
                    onClick={() => {
                      if (s.id === "products") {
                        setProductsOpen((open) => !open);
                        if (section !== "products" && section !== "reviews") {
                          navigate("products");
                        }
                      } else if (s.id === "orders") {
                        setOrdersOpen((open) => !open);
                        if (section !== "orders") {
                          navigate("orders");
                        }
                      } else navigate(s.id);
                    }}
                  >
                    <s.icon size={18} />
                    <span>{s.label}</span>
                    {s.id === "products" && (
                      <ChevronUp
                        className="admin-submenu-chevron"
                        size={14}
                        style={{ transform: productsOpen ? "rotate(0deg)" : "rotate(180deg)" }}
                      />
                    )}
                    {s.id === "orders" && (
                      <>
                        {orders.length > 0 && (
                          <b className="admin-count" style={{ marginLeft: "auto", marginRight: 4 }}>{orders.length}</b>
                        )}
                        <ChevronUp
                          className="admin-submenu-chevron"
                          size={14}
                          style={{
                            marginLeft: orders.length > 0 ? 0 : "auto",
                            transform: ordersOpen ? "rotate(0deg)" : "rotate(180deg)",
                          }}
                        />
                      </>
                    )}
                  </SidebarMenuButton>
                  {s.id === "products" && productsOpen && (
                    <div className="admin-product-submenu">
                      <a href="/admin/products/new">Add My Product</a>
                      <button type="button" onClick={() => navigate("products")}>Dropship catalog</button>
                      <button type="button" onClick={() => { setProductsOpen(true); navigate("products"); }}>My Products</button>
                      <button type="button" onClick={() => { setProductsOpen(true); navigate("reviews"); }}>Reviews</button>
                      <button type="button" onClick={() => { setProductsOpen(true); navigate("products"); }}>Brands</button>
                    </div>
                  )}
                  {s.id === "orders" && ordersOpen && (
                    <div className="admin-product-submenu">
                      <button
                        type="button"
                        className={section === "orders" && orderMainTab === "overview" && orderSubTab === "all" ? "active" : ""}
                        onClick={() => {
                          setOrdersOpen(true);
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
                          setOrdersOpen(true);
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
                          setOrdersOpen(true);
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
                          setOrdersOpen(true);
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
                          setOrdersOpen(true);
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
                          setOrdersOpen(true);
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
                          setOrdersOpen(true);
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
                        className={section === "orders" && orderMainTab === "issues_returns" && orderSubTab !== "cancelled" ? "active" : ""}
                        onClick={() => {
                          setOrdersOpen(true);
                          navigate("orders");
                          setOrderMainTab("issues_returns");
                          setOrderSubTab("return_requested");
                        }}
                      >
                        <span>Returns &amp; RTO</span>
                        {returnsRtoCount > 0 && <span className="admin-sub-badge">{returnsRtoCount}</span>}
                      </button>
                    </div>
                  )}
                </SidebarMenuItem>
              ))}
          </SidebarMenu>
          <a className="admin-visit" href="/admin/team">
            <ShieldCheck size={18} />
            Team & access
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
            <span className="seller-avatar">Z</span>
            <div className="seller-greeting">
              <small>Zeliy Pakistan</small>
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
              (section === "overview" ? "seller-dashboard-heading" : "")
            }
          >
            <div>
              <span className="admin-overline">ZELIY PAKISTAN</span>
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
                        ? "Customer details from your saved test orders."
                        : "Manage delivery charges and customer support details."}
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
                    navigate={(s, status) => {
                      navigate(s);
                      if (status) setFilter(status);
                    }}
                    edit={(p) => {
                      setEditing(p);
                      setIsNew(false);
                      setSaveError("");
                    }}
                    table={(rows) => <OrderTable rows={rows} />}
                  />
                )}
                {section === "reviews" && (
                  <Reviews products={products} onSave={async (product) => {
                    const ok = await write({ action: "product", product });
                    if (ok) setData((current) => current ? { ...current, products: current.products.map((item) => item.id === product.id ? product : item) } : current);
                    return ok;
                  }} />
                )}
                {section === "categories" && <Categories onChange={(categories) => setData((current) => current ? { ...current, categories } : current)} />}
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
                        onClick={() => { setOrderMainTab("completed"); setOrderSubTab("cod_pending"); }}
                        style={{ marginLeft: "auto", background: orderMainTab === "completed" && orderSubTab === "cod_pending" ? "#f8fafc" : undefined }}
                      >
                        <span style={{ color: "#64748b", fontWeight: 600 }}>💰 Pending COD:</span>
                        <span className="order-kpi-count" style={{ color: "#059669" }}>
                          {money(orders.filter((o) => o.status !== "Cancelled" && o.status !== "Delivered").reduce((sum, o) => sum + (o.total || 0), 0))}
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
                                  await write({
                                    action: "order",
                                    id,
                                    csrStatus: "Confirmed",
                                    csrConfirmedAt: nowStr,
                                    csrAgent: data?.name || "CSR Agent",
                                    csrHistory: [historyEntry, ...(target.details.csrHistory || [])],
                                  });
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
                                await write({ action: "order", id, status: "Picklist" });
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
                                await write({ action: "order", id, status: "Shipped" });
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
                        </div>
                      </div>
                    )}

                    {filteredOrders.length || !orders.length ? (
                      <OrderTable rows={filteredOrders} />
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
                      Showing {filteredOrders.length} of {orders.length} orders
                      · Latest 1,000 orders
                    </div>
                  </div>
                )}
                {section === "products" && (
                  <div className="admin-card">
                    <div className="product-filter-panel">
                      <label>Group<input placeholder="Search group" value={query} onChange={(e)=>setQuery(e.target.value)}/></label>
                      <label>Title/Name<input placeholder="Search by title or name" value={query} onChange={(e)=>setQuery(e.target.value)}/></label>
                      <label>Category<select value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value)}><option value="">Select Category</option>{categoryOptions.filter(c=>c!=='All products').map(c=><option key={c} value={c}>{c}</option>)}</select></label>
                      <label>Group Status<select value={groupStatusFilter} onChange={(e)=>setGroupStatusFilter(e.target.value)}><option value="">Select Group Status</option><option value="Active">Active</option><option value="Draft">Draft</option></select></label>
                      <label>Product Status<select value={filter} onChange={(e)=>setFilter(e.target.value)}><option value="All statuses">All statuses</option><option value="Active">Active</option><option value="Draft">Draft</option></select></label>
                      <label>Stock<select value={stockFilter} onChange={(e)=>setStockFilter(e.target.value)}><option value="">Select Stock</option><option value="In stock">In stock</option><option value="Out of stock">Out of stock</option></select></label>
                      <div className="product-filter-actions"><button type="button" onClick={()=>{setQuery('');setFilter('All statuses');setCategoryFilter('');setGroupStatusFilter('');setStockFilter('')}}>× Clear</button></div>
                    </div>
                    <div className="admin-toolbar">
                      <div className="admin-search">
                        <Search size={18} />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search products or categories"
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
                      <label><input type="checkbox" checked={productRows.length > 0 && productRows.every((p) => selectedProductIds.includes(p.id))} onChange={(event) => setSelectedProductIds(event.target.checked ? Array.from(new Set([...selectedProductIds, ...productRows.map((p) => p.id)])) : selectedProductIds.filter((id) => !productRows.some((p) => p.id === id)))} /> Select all visible</label>
                      <span>{selectedProductIds.length} selected</span>
                      <button type="button" className="product-delete-bulk" disabled={!selectedProductIds.length || busy} onClick={() => deleteProducts(selectedProductIds)}><Trash2 size={14} /> Bulk Delete</button>
                    </div>
                    <div className="product-groups-list" style={{ display: "flex", flexDirection: "column", gap: 16, padding: "16px 20px" }}>
                      {productRows.map((p) => (
                        <div
                          className="product-group-row"
                          key={p.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "32px 72px minmax(200px, 1fr) 180px 120px 140px",
                            alignItems: "center",
                            gap: 16,
                            padding: "16px 20px",
                            border: "1px solid #e2e8f0",
                            borderRadius: 12,
                            background: "#ffffff",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                          }}
                        >
                          {/* Checkbox */}
                          <input
                            className="product-select"
                            type="checkbox"
                            checked={selectedProductIds.includes(p.id)}
                            onChange={(event) =>
                              setSelectedProductIds((current) =>
                                event.target.checked
                                  ? Array.from(new Set([...current, p.id]))
                                  : current.filter((id) => id !== p.id)
                              )
                            }
                            aria-label={'Select ' + p.name}
                            style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#203664" }}
                          />

                          {/* Image Thumbnail */}
                          <button
                            type="button"
                            className="product-image-button"
                            onClick={() => setImageEditing(p)}
                            aria-label={'Add images for ' + p.name}
                            style={{
                              width: 64,
                              height: 64,
                              padding: 4,
                              border: "1px solid #cbd5e1",
                              borderRadius: 10,
                              background: "#f8fafc",
                              cursor: "pointer",
                              overflow: "hidden",
                              display: "grid",
                              placeItems: "center",
                            }}
                          >
                            <img
                              src={photo(p)}
                              alt={p.name}
                              style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 6 }}
                            />
                          </button>

                          {/* Title & SKU & Variant Tag */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <strong style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", lineHeight: 1.3 }}>
                              {p.name}
                            </strong>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748b" }}>
                              <span>SKU: {p.sku || p.id}</span>
                              <button
                                type="button"
                                className="sku-edit"
                                aria-label={'Edit SKU for ' + p.name}
                                style={{ border: 0, background: "none", cursor: "pointer", padding: 0, color: "#94a3b8" }}
                              >
                                <Pencil size={11} />
                              </button>
                            </div>
                            {colorVariantsFor(p).length > 0 && (
                              <small className="product-variants-summary" style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                                <b style={{ color: "#203664", fontWeight: 600 }}>{colorVariantsFor(p).length} Colour {colorVariantsFor(p).length === 1 ? "Variant" : "Variants"}</b>: {colorVariantsFor(p).map((item) => item.color || item.name).join(", ")}
                              </small>
                            )}
                          </div>

                          {/* Price Column */}
                          <div className="product-price" style={{ display: "flex", flexDirection: "column", gap: 2, justifySelf: "end" }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>Rs.</span>
                              <b style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{money(p.price)}</b>
                              {p.old > p.price && (
                                <del style={{ fontSize: 11, color: "#94a3b8", marginLeft: 2 }}>{money(p.old)}</del>
                              )}
                              <button
                                type="button"
                                className="inline-edit"
                                aria-label={'Edit price for ' + p.name}
                                onClick={() => {
                                  setPriceEditing(p);
                                  setPriceValue(String(p.price));
                                  setOriginalPriceValue(String(p.old || p.price));
                                  setCostPriceValue(String(p.costPrice || ""));
                                  setOfferPriceValue(String(p.offerPrice || ""));
                                  setOfferStartValue(p.offerStart || "");
                                  setOfferEndValue(p.offerEnd || "");
                                  const groupVariants = variantsFor(p);
                                  const pricesMap: Record<string, { price: string; old: string }> = {};
                                  let hasCustomVariantPrices = false;
                                  for (const v of groupVariants) {
                                    pricesMap[v.id] = {
                                      price: String(v.price),
                                      old: String(v.old || v.price),
                                    };
                                    if (v.price !== p.price || (v.old || v.price) !== (p.old || p.price)) {
                                      hasCustomVariantPrices = true;
                                    }
                                  }
                                  setVariantPrices(pricesMap);
                                  setPriceMode(hasCustomVariantPrices ? "variant" : "uniform");
                                  setBundlePriceValues((p.bundles || []).map((b) => String(b.price)).join(", "));
                                }}
                                style={{ border: 0, background: "none", cursor: "pointer", padding: 2, color: "#94a3b8" }}
                              >
                                <Pencil size={12} />
                              </button>
                            </div>
                            {p.costPrice ? (
                              <small style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>
                                Cost: <span style={{ color: "#475569" }}>{money(p.costPrice)}</span>
                              </small>
                            ) : null}
                          </div>

                          {/* Stock Column */}
                          <div className="product-stock" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Stock:</span>
                            {(() => {
                              const colorsList = colorVariantsFor(p);
                              const totalGroupStock = colorsList.length > 0
                                ? colorsList.reduce((sum, item) => sum + Number((item as any).stock ?? 0), 0)
                                : Number((p as any).stock ?? 0);
                              return (
                                <b style={{ fontSize: 14, fontWeight: 700, color: totalGroupStock > 0 ? "#16a34a" : "#dc2626" }}>
                                  {totalGroupStock}
                                </b>
                              );
                            })()}
                            <button
                              type="button"
                              className="inline-edit"
                              aria-label={'Edit stock for ' + p.name}
                              onClick={() => openStockEditor(p)}
                              style={{ border: 0, background: "none", cursor: "pointer", padding: 2, color: "#94a3b8" }}
                            >
                              <Pencil size={12} />
                            </button>
                          </div>

                          {/* Action Buttons Column */}
                          <div className="product-group-actions" style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                            {/* Main Active Toggle */}
                            <button
                              type="button"
                              className={p.status === "Active" ? "main-status-toggle active" : "main-status-toggle"}
                              disabled={busy}
                              aria-pressed={p.status === "Active"}
                              onClick={() => saveVariantGroupStatus(p, p.status === "Active" ? "Draft" : "Active")}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                padding: "5px 12px",
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                                border: p.status === "Active" ? "1px solid #bbf7d0" : "1px solid #cbd5e1",
                                background: p.status === "Active" ? "#f0fdf4" : "#f8fafc",
                                color: p.status === "Active" ? "#16a34a" : "#64748b",
                              }}
                            >
                              <span aria-hidden="true" style={{ width: 28, height: 16 }} /> Main {p.status === "Active" ? "Active" : "Inactive"}
                            </button>

                            {/* Details Button */}
                            <button
                              type="button"
                              className="product-edit"
                              onClick={() => {
                                location.href = "/admin/products/edit?id=" + encodeURIComponent(p.id);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "6px 12px",
                                borderRadius: 8,
                                background: "#203664",
                                color: "#ffffff",
                                fontSize: 11,
                                fontWeight: 600,
                                border: 0,
                                cursor: "pointer",
                              }}
                            >
                              Details
                            </button>

                            {/* Add colour Button */}
                            <button
                              type="button"
                              className="product-action"
                              onClick={() => {
                                setAddColorChoice("");
                                setAddColorSource(p);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "5px 12px",
                                borderRadius: 8,
                                background: "#ffffff",
                                color: "#2563eb",
                                fontSize: 11,
                                fontWeight: 600,
                                border: "1px solid #bfdbfe",
                                cursor: "pointer",
                              }}
                            >
                              Add colour
                            </button>

                            {/* Add stock Button */}
                            <button
                              type="button"
                              className="product-action"
                              onClick={() => openStockEditor(p)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "5px 12px",
                                borderRadius: 8,
                                background: "#ffffff",
                                color: "#2563eb",
                                fontSize: 11,
                                fontWeight: 600,
                                border: "1px solid #bfdbfe",
                                cursor: "pointer",
                              }}
                            >
                              Add stock
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              className="product-delete"
                              disabled={busy}
                              onClick={() => deleteProducts([p.id])}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 4,
                                padding: "5px 12px",
                                borderRadius: 8,
                                background: "#fef2f2",
                                color: "#dc2626",
                                fontSize: 11,
                                fontWeight: 600,
                                border: "1px solid #fecaca",
                                cursor: "pointer",
                              }}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>

                          {/* Child Color Matrix Section (Matching user reference layout) */}
                          {colorVariantsFor(p).length > 0 && (
                            <div
                              className="product-color-matrix"
                              style={{
                                gridColumn: "1 / -1",
                                marginTop: 12,
                                paddingTop: 14,
                                borderTop: "1px solid #eef2f7",
                                background: "#f8fafc",
                                borderRadius: 10,
                                padding: 14,
                                overflowX: "auto",
                              }}
                            >
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: `100px repeat(${colorVariantsFor(p).length}, minmax(110px, 140px))`,
                                  gap: 12,
                                  alignItems: "center",
                                  textAlign: "center",
                                  fontSize: 12,
                                }}
                              >
                                {/* Header / Label Column */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "left", fontWeight: 700, color: "#475569" }}>
                                  <span style={{ height: 60, display: "flex", alignItems: "center" }}>Variants</span>
                                  <span style={{ height: 24, display: "flex", alignItems: "center" }}>Total Stock</span>
                                  <span style={{ height: 32, display: "flex", alignItems: "center" }}>Action</span>
                                </div>

                                {/* Each Child Color Variant */}
                                {colorVariantsFor(p).map((variant) => (
                                  <div key={variant.id} style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", background: "#ffffff", padding: "10px 8px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                      {/* Clickable Image Thumbnail to Update Images */}
                                      <button
                                        type="button"
                                        onClick={() => setImageEditing(variant)}
                                        title={`Update image for ${variant.color || variant.name}`}
                                        style={{ border: 0, background: "none", cursor: "pointer", padding: 0 }}
                                      >
                                        {photo(variant) && photo(variant) !== "/images/placeholder.jpg" ? (
                                          <img src={photo(variant)} alt={variant.color || variant.name} style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 6, background: "#f1f5f9" }} />
                                        ) : (
                                          <div style={{ width: 36, height: 36, borderRadius: 6, background: "#f1f5f9", display: "grid", placeItems: "center", color: "#94a3b8", border: "1px dashed #cbd5e1" }} title="Click to upload image for this color">
                                            <ImageIcon size={18} />
                                          </div>
                                        )}
                                      </button>
                                      <span style={{ fontSize: 11, fontWeight: 700, color: "#1e293b" }}>{variant.sku || variant.id}</span>
                                      <span style={{ fontSize: 10, fontWeight: 600, color: "#2563eb" }}>{variant.color || variant.name}</span>
                                    </div>
                                    <b style={{ fontSize: 13, color: "#0f172a" }}>{(variant as any).stock ?? 0}</b>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => saveProductStatus(variant, variant.status === "Active" ? "Draft" : "Active")}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 6,
                                          padding: "4px 8px",
                                          borderRadius: 999,
                                          fontSize: 11,
                                          fontWeight: 600,
                                          cursor: "pointer",
                                          border: variant.status === "Active" ? "1px solid #16a34a" : "1px solid #cbd5e1",
                                          background: variant.status === "Active" ? "#f0fdf4" : "#f8fafc",
                                          color: variant.status === "Active" ? "#15803d" : "#64748b",
                                        }}
                                      >
                                        <span
                                          style={{
                                            position: "relative",
                                            display: "inline-block",
                                            width: 28,
                                            height: 16,
                                            borderRadius: 999,
                                            background: variant.status === "Active" ? "#16a34a" : "#cbd5e1",
                                            transition: "background 0.2s ease",
                                          }}
                                        >
                                          <span
                                            style={{
                                              position: "absolute",
                                              top: 2,
                                              left: variant.status === "Active" ? 14 : 2,
                                              width: 12,
                                              height: 12,
                                              borderRadius: "50%",
                                              background: "#ffffff",
                                              boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                                              transition: "left 0.2s ease",
                                            }}
                                          />
                                        </span>
                                        <span>{variant.status === "Active" ? "Active" : "Draft"}</span>
                                      </button>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        title={`Delete ${variant.color || variant.name}`}
                                        onClick={() => deleteProducts([variant.id])}
                                        style={{ border: 0, background: "none", cursor: "pointer", color: "#ef4444", padding: 2 }}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="product-list-summary">{filteredProducts.length} products · Grouped product list</div>
                    <div className="admin-product-legacy">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>
                              <div className="admin-product-cell">
                                <button
                                  type="button"
                                  aria-label={`Update images for ${p.name}`}
                                  title="Update product images"
                                  style={{ padding: 0, border: 0, background: "transparent", cursor: "pointer" }}
                                  onClick={() => {
                                    setImageEditing(p);
                                  }}
                                >
                                  <img src={photo(p)} alt={`Update images for ${p.name}`} />
                                </button>
                                <div>
                                  <b>{p.name}</b>
                                  <small>{p.id}</small>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{p.category}</TableCell>
                            <TableCell>
                              <b>{money(p.price)}</b>
                              {p.old > p.price && (
                                <small>
                                  <del>{money(p.old)}</del>
                                </small>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge status={p.status} />
                            </TableCell>
                            <TableCell>
                              <button
                                className="admin-edit"
                                onClick={() => {
                                  location.href = "/admin/products/edit?id=" + encodeURIComponent(p.id);
                                }}
                              >
                                <Pencil size={15} />
                                Edit
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                    {!filteredProducts.length && (
                      <div className="admin-empty">
                        <Package />
                        <h3>No matching products</h3>
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
                    <div className="admin-table-foot">
                      {filteredProducts.length} products · Drafts are hidden
                      from your storefront
                    </div>
                  </div>
                )}
                {section === "customers" && (
                  <div className="admin-card">
                    <div className="admin-toolbar">
                      <div className="admin-search">
                        <Search size={18} />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search name, phone or city"
                          aria-label="Search customers"
                        />
                      </div>
                    </div>
                    {customers.length ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>City</TableHead>
                            <TableHead>Orders</TableHead>
                            <TableHead>Test order value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customers
                            .filter((c) =>
                              (c.name + " " + c.phone + " " + c.city)
                                .toLowerCase()
                                .includes(query.toLowerCase()),
                            )
                            .map((c) => (
                              <TableRow key={c.phone}>
                                <TableCell>
                                  <b>{c.name}</b>
                                </TableCell>
                                <TableCell>
                                  {c.phone}
                                  <small>
                                    {c.email || "No email provided"}
                                  </small>
                                </TableCell>
                                <TableCell>{c.city}</TableCell>
                                <TableCell>{c.count}</TableCell>
                                <TableCell>{money(c.total)}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="admin-empty">
                        <Users />
                        <h3>Your customer list starts here</h3>
                        <p>
                          Customers appear automatically when a test order is
                          placed.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {section === "settings" && config && (
                  <form
                    className="admin-settings"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setSettingsSaved(false);
                      if (
                        await write({ action: "settings", settings: config })
                      ) {
                        setData({ ...data, settings: config });
                        setSettingsSaved(true);
                        toast.success("Store settings saved");
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
                                      <span>zeliy<span style={{ color: "#b68b69" }}>.</span></span>
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
                          <h2>Delivery & checkout</h2>
                          <p>
                            These rates appear in your storefront and checkout.
                          </p>
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
                            <b>Cash on delivery</b>
                            <p>Enabled for checkout</p>
                          </div>
                          <Badge status="Active" />
                        </div>
                      </div>
                    </div>
                    <div className="admin-card">
                      <div className="admin-card-head">
                        <div>
                          <h2>Customer support</h2>
                          <p>Displayed on the Contact us page when saved.</p>
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
                            Use 92 followed by the mobile number, without + or
                            spaces.
                          </small>
                        </label>
                      </div>
                    </div>
                    <div className="admin-setting-note">
                      <ShieldCheck size={19} />
                      <p>
                        Your store remains in preview mode. Payment providers
                        and couriers are not connected.
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
              </>
            )
          )}
          <div className="admin-bottom">
            <span>Zeliy Pakistan · Store management</span>
            <span>All amounts in PKR</span>
          </div>
        </div>
      </div>
      {priceEditing && (() => {
        const groupVariants = variantsFor(priceEditing);
        const hasVariants = groupVariants.length > 1;
        return (
          <Dialog open onOpenChange={(open) => { if (!open && !busy) setPriceEditing(null); }}>
            <DialogContent className="admin-dialog price-dialog" style={{ maxWidth: 680, maxHeight: "90vh", overflowY: "auto" }}>
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

                  // Save parent / base product price
                  let ok = await write({
                    action: "product",
                    product: { ...priceEditing, price, old, costPrice, offerPrice, offerStart, offerEnd },
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
                    toast.success("Option-wise prices updated successfully");
                  }
                }}
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
                {/* Pricing Strategy Mode Selector Radio Buttons */}
                {hasVariants && (
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
        const stockVariants = variantsFor(stockEditing);
        const group = stockEditing.listingGroup || stockEditing.id;
        const hasChildColors = stockVariants.some((item) => item.id !== group && item.color && item.color.toLowerCase() !== "not applicable");
        const visibleStockVariants = hasChildColors
          ? stockVariants.filter((item) => item.id !== group && item.color && item.color.toLowerCase() !== "not applicable")
          : stockVariants;
        const availableStockColors = colors.filter((color) => color !== "Not applicable" && !stockVariants.some((item) => item.color === color));
        return <Dialog open onOpenChange={(open)=>{if(!open&&!busy)setStockEditing(null)}}><DialogContent className="admin-dialog stock-dialog"><DialogHeader><DialogTitle>Add stock</DialogTitle><DialogDescription>{hasChildColors ? "Set stock for each colour variant." : "Set stock for the product."}</DialogDescription></DialogHeader><form className="admin-fields" onSubmit={async e=>{e.preventDefault();const updates=stockVariants.map((item)=>{const rawStock=Number(stockValues[item.id] ?? (item as any).stock ?? 0);return {item,stock:rawStock};});if(updates.some(({stock})=>!Number.isFinite(stock)||stock<0))return;let ok=true;const parent=stockEditing.listingGroup?{...stockEditing,listingGroup:group}:stockEditing;if(!stockEditing.listingGroup)ok=await write({action:'product',product:{...parent,stock:Number(stockValues[stockEditing.id] ?? (stockEditing as any).stock ?? 0),status:"Active" as const}});for(const {item,stock} of updates){if(!ok)break;const sizeEntries=sizeOptionsFor(item).map((size)=>[size,stockValues[item.id+":"+size]]).filter(([,value])=>value!==""&&value!=null);const sizeStock=Object.fromEntries(sizeEntries.map(([size,value])=>[size,Number(value)]));if(Object.values(sizeStock).some((value)=>!Number.isFinite(value)||value<0))return;const sumSizeStock=Object.values(sizeStock).reduce((acc,val)=>acc+(Number(val)||0),0);const finalStock=sizeEntries.length>0?sumSizeStock:stock;ok=await write({action:'product',product:{...item,stock:finalStock,sizeStock,listingGroup:item.listingGroup||group,status:finalStock>0?"Active" as const:item.status}});}if(ok&&stockColorChoice){const stock=Number(stockValue);if(!Number.isFinite(stock)||stock<0)return;const baseId=`${group}-${slug(stockColorChoice)}`;const id=products.some((item)=>item.id===baseId)?`${baseId}-${Date.now()}`:baseId;const child={...stockEditing,id,name:`${stockEditing.name.replace(/\s+·\s+.+$/,"")} · ${stockColorChoice}`,sku:stockEditing.sku?`${stockEditing.sku}-${slug(stockColorChoice).toUpperCase()}`:id,color:stockColorChoice,option:stockEditing.option||"Standard",listingGroup:group,status:stock>0?"Active" as const:"Draft" as const,stock};ok=await write({action:'product',product:child});}if(ok){await load();setStockEditing(null);setStockColorChoice("");setStockValue("");setStockValues({});toast.success('Stock updated')}}}>
          <div className="stock-colour-list">
            {visibleStockVariants.map((variant) => (
              <label key={variant.id} className="stock-colour-row">
                <span><img src={photo(variant)} alt={variant.color || variant.name}/><b>{variant.color || variant.name}</b></span>
                <input type="number" min="0" step="1" required value={stockValues[variant.id] ?? String((variant as any).stock ?? 0)} onChange={(event)=>setStockValues((current)=>({...current,[variant.id]:event.target.value}))} placeholder="0"/>
                {sizeOptionsFor(variant).length > 1 && <div className="stock-size-grid">{sizeOptionsFor(variant).map((size)=><label key={size}>{size}<input type="number" min="0" step="1" value={stockValues[variant.id+":"+size] ?? ""} onChange={(event)=>setStockValues((current)=>({...current,[variant.id+":"+size]:event.target.value}))} placeholder="Use total"/></label>)}</div>}
              </label>
            ))}
          </div>
          <div className="stock-add-colour">
            <label>Add another colour<select value={stockColorChoice} onChange={(event)=>setStockColorChoice(event.target.value)}><option value="">--select color--</option>{availableStockColors.map((color)=><option key={color} value={color}>{color}</option>)}</select></label>
            {stockColorChoice && <label>{stockColorChoice} stock<input type="number" min="0" step="1" required value={stockValue} onChange={e=>setStockValue(e.target.value)} placeholder="0"/></label>}
          </div>
          <button className="admin-primary" disabled={busy}>{busy?'Saving…':'Save stock'}</button>
        </form></DialogContent></Dialog>;
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
                      features: editing.features
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
                  value={editing.features.join("\n")}
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
        <Dialog open onOpenChange={(open) => { if (!open && !busy) { setAddColorSource(null); setAddColorImages([]); } }}>
          <DialogContent className="add-color-dialog">
            <DialogHeader>
              <DialogTitle>Add Color Variant To {addColorSource.sku || addColorSource.id}</DialogTitle>
              <DialogDescription>Create a child product variant and attach photos.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (!addColorChoice) return;
                const group = addColorSource.listingGroup || addColorSource.id;
                const baseId = `${group}-${slug(addColorChoice)}`;
                const id = products.some((item) => item.id === baseId) ? `${baseId}-${Date.now()}` : baseId;
                const proposedSku = addColorSource.sku ? `${addColorSource.sku}-${slug(addColorChoice).toUpperCase()}` : id;
                const uniqueSku = products.some((item) => (item.sku || "").trim().toLowerCase() === proposedSku.trim().toLowerCase())
                  ? `${proposedSku}-${Math.floor(100 + Math.random() * 900)}`
                  : proposedSku;
                const child = {
                  ...addColorSource,
                  id,
                  name: `${addColorSource.name.replace(/\s+·\s+.+$/, "")} · ${addColorChoice}`,
                  sku: uniqueSku,
                  color: addColorChoice,
                  option: addColorSource.option || "Standard",
                  listingGroup: group,
                  image: addColorImages[0] || addColorSource.image,
                  images: addColorImages.length ? addColorImages : addColorSource.images,
                  status: "Draft" as const,
                };
                const parent = { ...addColorSource, listingGroup: group };
                if (await write({ action: "product", product: parent }) && await write({ action: "product", product: child })) {
                  await load();
                  setAddColorSource(null);
                  setAddColorChoice("");
                  setAddColorImages([]);
                  toast.success(`${addColorChoice} colour variant added with ${addColorImages.length || 1} image(s)`);
                }
              }}
              className="admin-fields"
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <label style={{ margin: 0 }}>
                Choose Color
                <select required value={addColorChoice} onChange={(event) => setAddColorChoice(event.target.value)}>
                  <option value="">--select color--</option>
                  {colors
                    .filter((color) => color !== "Not applicable" && !colorVariantsFor(addColorSource).some((item) => item.color === color))
                    .map((color) => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                </select>
              </label>

              {/* Variant Multi-Image Upload Option */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#49617e" }}>Colour Images</span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{addColorImages.length} image(s) selected</span>
                </div>
                <div
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = Array.from(e.dataTransfer.files || []);
                    if (!files.length) return;
                    const uploadedUrls: string[] = [];
                    for (const file of files) {
                      try {
                        const r = await fetch("/api/media", {
                          method: "POST",
                          headers: { "Content-Type": file.type || "image/jpeg" },
                          body: file,
                        });
                        const d: any = await r.json();
                        if (r.ok && d.url) uploadedUrls.push(d.url);
                        else toast.error(d.error || `Failed to upload ${file.name}`);
                      } catch (err) {
                        toast.error(`Failed to upload ${file.name}`);
                      }
                    }
                    if (uploadedUrls.length) {
                      setAddColorImages((current) => Array.from(new Set([...current, ...uploadedUrls])));
                      toast.success(`Uploaded ${uploadedUrls.length} image(s)`);
                    }
                  }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.multiple = true;
                    input.onchange = async (e: any) => {
                      const files = Array.from(e.target.files || []) as File[];
                      if (!files.length) return;
                      const uploadedUrls: string[] = [];
                      for (const file of files) {
                        try {
                          const r = await fetch("/api/media", {
                            method: "POST",
                            headers: { "Content-Type": file.type || "image/jpeg" },
                            body: file,
                          });
                          const d: any = await r.json();
                          if (r.ok && d.url) uploadedUrls.push(d.url);
                          else toast.error(d.error || `Failed to upload ${file.name}`);
                        } catch (err) {
                          toast.error(`Failed to upload ${file.name}`);
                        }
                      }
                      if (uploadedUrls.length) {
                        setAddColorImages((current) => Array.from(new Set([...current, ...uploadedUrls])));
                        toast.success(`Uploaded ${uploadedUrls.length} image(s)`);
                      }
                    };
                    input.click();
                  }}
                  style={{
                    border: "2px dashed #3b82f6",
                    borderRadius: 10,
                    padding: "20px 16px",
                    textAlign: "center",
                    background: "#eff6ff",
                    cursor: "pointer",
                  }}
                >
                  <Upload size={24} style={{ margin: "0 auto 6px", color: "#2563eb" }} />
                  <b style={{ display: "block", fontSize: 13, color: "#1e3a8a", marginBottom: 2 }}>
                    Click or drag & drop multiple photos here
                  </b>
                  <span style={{ fontSize: 11, color: "#3b82f6" }}>Select multiple image files at once</span>
                </div>

                {/* Multiple Image Preview Gallery */}
                {addColorImages.length > 0 && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8, padding: 8, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    {addColorImages.map((url, idx) => (
                      <div
                        key={url + idx}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 8,
                          border: idx === 0 ? "2px solid #2563eb" : "1px solid #cbd5e1",
                          background: "#ffffff",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <img src={url} alt={`Color variant image ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        {idx === 0 && (
                          <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#2563eb", color: "#fff", fontSize: 8, textAlign: "center", fontWeight: 700 }}>
                            COVER
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddColorImages((current) => current.filter((_, i) => i !== idx));
                          }}
                          style={{
                            position: "absolute",
                            top: 2,
                            right: 2,
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "#ef4444",
                            color: "#fff",
                            border: 0,
                            fontSize: 10,
                            display: "grid",
                            placeItems: "center",
                            cursor: "pointer",
                          }}
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {colorVariantsFor(addColorSource).length > 0 && (
                <p className="variant-link-preview" style={{ margin: 0 }}>
                  <b>{colorVariantsFor(addColorSource).length} Colour {colorVariantsFor(addColorSource).length === 1 ? "Variant" : "Variants"}</b>
                  <span>Available Colours: {colorVariantsFor(addColorSource).map((item) => item.color || item.name).join(" | ")}</span>
                </p>
              )}

              <div className="admin-form-actions" style={{ marginTop: 10 }}>
                <button type="submit" className="admin-primary" disabled={!addColorChoice || busy}>
                  {busy ? "Saving..." : "Save Variant"}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
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
            <DialogTitle>🚚 Courier & Airway Bill Booking</DialogTitle>
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
                    <button
                      type="button"
                      className="admin-secondary"
                      style={{ padding: "0 12px", whiteSpace: "nowrap" }}
                      onClick={() => {
                        const prefix = courierName.includes("Trax") ? "TRX" : courierName.includes("TCS") ? "TCS" : courierName.includes("Leopards") ? "LEO" : courierName.includes("PostEx") ? "PEX" : "CN";
                        setTrackingNumber(`${prefix}-${Math.floor(10000000 + Math.random() * 90000000)}`);
                      }}
                    >
                      Generate #
                    </button>
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
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
                    <PhoneCall size={12} /> CSR Log
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

              {selected.status !== "Cancelled" && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e2e8f0", textAlign: "center" }}>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                    onClick={() => {
                      setCancelModalOrder(selected);
                      setCancelReason("Customer changed mind / duplicate order");
                      setCancelCustomNote("");
                    }}
                  >
                    <X size={14} /> Cancel this order
                  </button>
                </div>
              )}
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
                      const msg = getWhatsAppConfirmationMessage(csrOrder, csrTemplateTab, config?.logoText || "Zeliy Pakistan");
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
                      config?.logoText || "Zeliy Pakistan"
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
                          config?.logoText || "Zeliy Pakistan"
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
                          config?.logoText || "Zeliy Pakistan"
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

      {/* Manual Order Creation Dialog */}
      <Dialog
        open={manualOrderModalOpen}
        onOpenChange={(open) => {
          if (!open && !busy) setManualOrderModalOpen(false);
        }}
      >
        <DialogContent className="admin-dialog admin-dialog-manual-order sm:max-w-6xl" style={{ maxWidth: "min(1180px, 96vw)", width: "96vw", maxHeight: "92vh", overflowY: "auto", padding: "28px 32px" }}>
          <DialogHeader>
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, background: "#dcfce7", color: "#16a34a" }}>
                <ShoppingBag size={20} />
              </span>
              Place Manual Order
            </DialogTitle>
            <DialogDescription style={{ fontSize: 13.5, color: "#64748b", marginTop: 4 }}>
              Record phone, WhatsApp, Instagram, or counter walk-in orders with real-time stock deduction and automated tracking.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateManualOrder}>
            <div className="manual-order-grid" style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 28, marginTop: 18 }}>
              {/* Left Column: Customer & Delivery Info */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 8, borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, background: "#ede9fe", color: "#6366f1" }}>
                    <User size={15} />
                  </span>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    1. Customer &amp; Delivery Details
                  </h4>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>Customer Full Name *</label>
                  <input
                    required
                    placeholder="e.g. Muhammad Ali"
                    value={manualCustomerName}
                    onChange={(e) => setManualCustomerName(e.target.value)}
                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13.5, height: 42 }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>Mobile Phone *</label>
                    <input
                      required
                      placeholder="0300 1234567"
                      value={manualCustomerPhone}
                      onChange={(e) => setManualCustomerPhone(e.target.value)}
                      style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13.5, height: 42 }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>Alt Phone (Optional)</label>
                    <input
                      placeholder="0321 7654321"
                      value={manualCustomerAltPhone}
                      onChange={(e) => setManualCustomerAltPhone(e.target.value)}
                      style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13.5, height: 42 }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>Province</label>
                    <select
                      value={manualCustomerProvince}
                      onChange={(e) => {
                        setManualCustomerProvince(e.target.value);
                        const cities = (PAKISTAN_CITIES_BY_PROVINCE as any)[e.target.value] || [];
                        if (cities.length > 0) setManualCustomerCity(cities[0]);
                      }}
                      style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13.5, height: 42, background: "#ffffff" }}
                    >
                      {PAKISTAN_PROVINCES.map((prov) => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>Destination City *</label>
                    <select
                      value={manualCustomerCity}
                      onChange={(e) => setManualCustomerCity(e.target.value)}
                      style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13.5, height: 42, background: "#ffffff" }}
                    >
                      {((PAKISTAN_CITIES_BY_PROVINCE as any)[manualCustomerProvince] || ALL_PAKISTAN_CITIES).map((c: string) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="Other">Other City / Area…</option>
                    </select>
                  </div>
                </div>

                {manualCustomerCity === "Other" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>Custom City Name *</label>
                    <input
                      required
                      placeholder="Enter custom city or tehsil"
                      value={manualCustomerCustomCity}
                      onChange={(e) => setManualCustomerCustomCity(e.target.value)}
                      style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13.5, height: 42 }}
                    />
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>Complete Delivery Address *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="House / Flat #, Street #, Mohallah / Block, Sector…"
                    value={manualCustomerAddress}
                    onChange={(e) => setManualCustomerAddress(e.target.value)}
                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13.5, resize: "vertical", lineHeight: 1.5 }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>Nearest Landmark (Optional)</label>
                  <input
                    placeholder="e.g. Near Shell Pump / Gourmet Bakery"
                    value={manualCustomerLandmark}
                    onChange={(e) => setManualCustomerLandmark(e.target.value)}
                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13.5, height: 42 }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>Order Channel / Source</label>
                    <select
                      value={manualCustomerSource}
                      onChange={(e) => setManualCustomerSource(e.target.value)}
                      style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13.5, height: 42, background: "#ffffff" }}
                    >
                      <option value="WhatsApp Order">💬 WhatsApp Order</option>
                      <option value="Phone Call Order">📞 Phone Call Order</option>
                      <option value="Instagram / FB DM">📸 Instagram / FB DM</option>
                      <option value="Counter / Walk-in">🏪 Counter / Walk-in</option>
                      <option value="Direct Web Entry">🌐 Direct Web Entry</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>Initial Status</label>
                    <select
                      value={manualInitialCsrStatus}
                      onChange={(e) => setManualInitialCsrStatus(e.target.value as any)}
                      style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13.5, height: 42, background: "#ffffff" }}
                    >
                      <option value="Confirmed">🟢 CSR Confirmed (Direct to Picklist)</option>
                      <option value="Pending">🟡 Pending Verification Call</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>Order Note / Customer Request</label>
                  <input
                    placeholder="e.g. Call before delivery, urgent delivery"
                    value={manualOrderNote}
                    onChange={(e) => setManualOrderNote(e.target.value)}
                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13.5, height: 42 }}
                  />
                </div>
              </div>

              {/* Right Column: Product Selection & Pricing */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 8, borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, background: "#dcfce7", color: "#16a34a" }}>
                    <Package size={15} />
                  </span>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    2. Items &amp; Order Pricing
                  </h4>
                </div>

                {/* Product Picker Box */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>Select Product to Add</label>
                    <select
                      value={manualProductChoice}
                      onChange={(e) => {
                        setManualProductChoice(e.target.value);
                        const p = products.find((x) => x.id === e.target.value);
                        if (p) {
                          const sizes = sizeOptionsFor(p);
                          setManualSizeChoice(sizes[0] || "Standard");
                        }
                      }}
                      style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13.5, height: 42, background: "#ffffff" }}
                    >
                      {products.filter((p) => p.status === "Active").map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {money(effectivePrice(p))} (Stock: {p.stock || 0})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Size & Quantity Picker */}
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Size / Variant</label>
                      <select
                        value={manualSizeChoice}
                        onChange={(e) => setManualSizeChoice(e.target.value)}
                        style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13.5, height: 42, background: "#ffffff" }}
                      >
                        {(() => {
                          const p = products.find((x) => x.id === manualProductChoice);
                          const sizes = p ? sizeOptionsFor(p) : ["Standard"];
                          return sizes.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ));
                        })()}
                      </select>
                    </div>

                    <div style={{ width: 85, display: "flex", flexDirection: "column", gap: 5 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Qty</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={manualQtyChoice}
                        onChange={(e) => setManualQtyChoice(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{ padding: "9px 8px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, fontWeight: 700, textAlign: "center", height: 42, background: "#ffffff" }}
                      />
                    </div>

                    <button
                      type="button"
                      className="admin-primary"
                      style={{ padding: "0 20px", fontSize: 13.5, fontWeight: 600, height: 42, borderRadius: 8, background: "#203664", display: "flex", alignItems: "center", gap: 6 }}
                      onClick={() => {
                        const p = products.find((x) => x.id === manualProductChoice);
                        if (!p) return;
                        const unitPrice = effectivePrice(p);
                        const existingIdx = manualOrderItems.findIndex((item) => item.id === p.id && item.size === manualSizeChoice);
                        if (existingIdx !== -1) {
                          setManualOrderItems((prev) => prev.map((item, idx) => idx === existingIdx ? {
                            ...item,
                            qty: item.qty + manualQtyChoice,
                            totalPrice: (item.qty + manualQtyChoice) * item.unitPrice,
                          } : item));
                        } else {
                          setManualOrderItems((prev) => [
                            ...prev,
                            {
                              id: p.id,
                              name: p.name,
                              sku: p.sku || p.id,
                              image: photo(p),
                              color: p.color || "",
                              size: manualSizeChoice,
                              qty: manualQtyChoice,
                              unitPrice,
                              totalPrice: unitPrice * manualQtyChoice,
                            }
                          ]);
                        }
                        toast.success(`Added ${p.name} (${manualSizeChoice})`);
                      }}
                    >
                      <Plus size={15} /> Add
                    </button>
                  </div>
                </div>

                {/* Added Items List */}
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, minHeight: 140, maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, background: "#ffffff" }}>
                  {manualOrderItems.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", fontSize: 13, padding: "24px 0" }}>
                      <ShoppingBag size={28} style={{ marginBottom: 6, opacity: 0.5 }} />
                      <span>No items added yet. Pick a product above and click Add.</span>
                    </div>
                  ) : (
                    manualOrderItems.map((item, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                        <img src={item.image} alt={item.name} style={{ width: 38, height: 38, objectFit: "contain", borderRadius: 6, background: "#ffffff", border: "1px solid #e2e8f0" }} />
                        <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                          <div style={{ fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                          <div style={{ color: "#64748b", fontSize: 12 }}>{item.size} · {item.qty} × {money(item.unitPrice)}</div>
                        </div>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 13.5 }}>{money(item.totalPrice)}</div>
                        <button
                          type="button"
                          onClick={() => setManualOrderItems((prev) => prev.filter((_, i) => i !== idx))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4, borderRadius: 4 }}
                          title="Remove item"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Price Breakdown */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px 16px", borderRadius: 10, display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5 }}>
                  {(() => {
                    const subtotal = manualOrderItems.reduce((acc, item) => acc + item.totalPrice, 0);
                    const delivery = Math.max(0, parseInt(manualCustomDelivery) || 0);
                    const discount = Math.max(0, parseInt(manualCustomDiscount) || 0);
                    const grandTotal = Math.max(0, subtotal + delivery - discount);
                    return (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                          <span>Items Subtotal:</span>
                          <b style={{ color: "#0f172a" }}>{money(subtotal)}</b>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#475569" }}>
                          <span>Delivery Charges:</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span>Rs.</span>
                            <input
                              type="number"
                              min={0}
                              value={manualCustomDelivery}
                              onChange={(e) => setManualCustomDelivery(e.target.value)}
                              style={{ width: 80, padding: "4px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13.5, textAlign: "right", background: "#ffffff" }}
                            />
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#475569" }}>
                          <span>Discount:</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span>- Rs.</span>
                            <input
                              type="number"
                              min={0}
                              value={manualCustomDiscount}
                              onChange={(e) => setManualCustomDiscount(e.target.value)}
                              style={{ width: 80, padding: "4px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13.5, textAlign: "right", background: "#ffffff" }}
                            />
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#0f172a", fontSize: 15, fontWeight: 800, borderTop: "1.5px solid #cbd5e1", paddingTop: 10, marginTop: 4 }}>
                          <span>Total COD Amount:</span>
                          <span style={{ color: "#16a34a", fontSize: 18, fontWeight: 800 }}>{money(grandTotal)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24, paddingTop: 18, borderTop: "1px solid #e2e8f0", flexWrap: "wrap", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={manualOpenWhatsappAfter}
                  onChange={(e) => setManualOpenWhatsappAfter(e.target.checked)}
                  style={{ width: 17, height: 17, accentColor: "#16a34a" }}
                />
                <span>Send WhatsApp confirmation message to customer after placing order</span>
              </label>

              <div style={{ display: "flex", gap: 12, marginLeft: "auto" }}>
                <button
                  type="button"
                  className="admin-secondary"
                  style={{ padding: "10px 20px", fontSize: 13.5, height: 42, borderRadius: 8 }}
                  onClick={() => setManualOrderModalOpen(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-primary"
                  disabled={busy || manualOrderItems.length === 0}
                  style={{ padding: "10px 28px", fontSize: 14, fontWeight: 700, height: 42, borderRadius: 8, background: "#16a34a" }}
                >
                  {busy ? "Placing Order…" : "Place Manual Order"}
                </button>
              </div>
            </div>
          </form>
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
