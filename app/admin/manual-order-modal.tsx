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
  ShoppingBag,
  User,
  Package,
  Search,
  X,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Printer,
  MessageCircle,
  Sparkles,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  LoaderCircle,
  Phone,
  MapPin,
  RotateCcw,
  FileText,
  Check,
  ChevronDown,
  Info,
  Tag,
  Percent,
} from "lucide-react";
import {
  PAKISTAN_PROVINCES,
  PAKISTAN_CITIES_BY_PROVINCE,
  ALL_PAKISTAN_CITIES,
  cleanPakistanPhone,
  isValidPakistanPhone,
  getDefaultDeliveryChargeForProvince,
} from "@/lib/pakistan-locations";
import { money, effectivePrice } from "@/app/catalog";
import { getWhatsAppConfirmationMessage, openWhatsApp, type Order, type CsrStatus } from "./panel";
import type { ManagedProduct, Settings } from "@/lib/store-data";
import { toast } from "sonner";

export type ManualOrderItem = {
  id: string;
  name: string;
  sku: string;
  image: string;
  color: string;
  size: string;
  qty: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  maxStock: number;
};

interface ManualOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ManagedProduct[];
  orders: Order[];
  config?: Settings | null;
  currentUser?: { name?: string; role?: string };
  onOrderCreated: (newOrder: Order) => void;
  onPrintAirwayBill?: (order: Order) => void;
  onNavigateToOrder?: (orderId: string) => void;
}

const photoUrl = (p: ManagedProduct) => {
  const img = p.image || (p.images && p.images[0]) || "";
  if (!img) return "/images/placeholder.jpg";
  if (img.startsWith("/") || img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:")) return img;
  return "/images/" + img + ".jpg";
};

const getSizesForProduct = (product: ManagedProduct): string[] => {
  if (product.sizeStock && Object.keys(product.sizeStock).length > 0) {
    const keys = Object.keys(product.sizeStock).filter((k) => (product.sizeStock as Record<string, number>)[k] > 0);
    if (keys.length > 0) return keys;
    return Object.keys(product.sizeStock);
  }
  if (product.sizes?.length) return product.sizes;
  if (product.variants?.length) {
    const vSizes = Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean))) as string[];
    if (vSizes.length > 0) return vSizes;
  }
  const text = (product.name + " " + product.category + " " + (product.subcategory || "")).toLowerCase();
  if (text.match(/shoe|sneaker/)) return ["38", "39", "40", "41", "42", "43", "44"];
  if (product.category === "Fashion" || text.match(/dress|clothing/)) return ["XS", "S", "M", "L", "XL"];
  if (text.includes("bag") || product.category === "Accessories") return ["Standard", "Small", "Medium", "Large"];
  return ["Standard"];
};

export default function ManualOrderModal({
  open,
  onOpenChange,
  products,
  orders,
  config,
  currentUser,
  onOrderCreated,
  onPrintAirwayBill,
  onNavigateToOrder,
}: ManualOrderModalProps) {
  // 1. Customer & Delivery Information
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAltPhone, setCustomerAltPhone] = useState("");
  const [customerProvince, setCustomerProvince] = useState("Punjab");
  const [customerCity, setCustomerCity] = useState("Lahore");
  const [customerCustomCity, setCustomerCustomCity] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerLandmark, setCustomerLandmark] = useState("");
  const [customerSource, setCustomerSource] = useState("WhatsApp Order");
  const [initialCsrStatus, setInitialCsrStatus] = useState<"Confirmed" | "Pending">("Confirmed");
  const [orderNote, setOrderNote] = useState("");

  // 2. Product Search & Variant Selection
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedSize, setSelectedSize] = useState("Standard");
  const [selectedQty, setSelectedQty] = useState(1);
  const [selectedItemDiscount, setSelectedItemDiscount] = useState("0");

  // 3. Order Items
  const [orderItems, setOrderItems] = useState<ManualOrderItem[]>([]);

  // 4. Delivery & Discounts
  const [deliveryOverride, setDeliveryOverride] = useState(false);
  const [customDelivery, setCustomDelivery] = useState("200");
  const [discountMode, setDiscountMode] = useState<"fixed" | "percentage">("fixed");
  const [discountInput, setDiscountInput] = useState("0");

  // 5. Actions & Modal Lifecycle
  const [openWhatsappAfter, setOpenWhatsappAfter] = useState(true);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Active products filter
  const activeProducts = useMemo(
    () => products.filter((p) => p.status === "Active"),
    [products]
  );

  // Only reset entire form when the modal opens for the first time (not on subsequent re-renders)
  const prevOpenRef = React.useRef(open);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      resetForm();
    }
    prevOpenRef.current = open;
  }, [open]);

  // Ensure selectedProductId is initialized when activeProducts becomes available
  useEffect(() => {
    if (!selectedProductId && activeProducts.length > 0) {
      setSelectedProductId(activeProducts[0].id);
      setSelectedSize(getSizesForProduct(activeProducts[0])[0] || "Standard");
    }
  }, [activeProducts, selectedProductId]);

  // Reset entire form for new order
  function resetForm() {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAltPhone("");
    setCustomerProvince("Punjab");
    setCustomerCity("Lahore");
    setCustomerCustomCity("");
    setCustomerAddress("");
    setCustomerLandmark("");
    setCustomerSource("WhatsApp Order");
    setInitialCsrStatus("Confirmed");
    setOrderNote("");
    setOrderItems([]);
    setProductSearch("");
    setSelectedQty(1);
    setSelectedItemDiscount("0");
    setDeliveryOverride(false);
    setDiscountMode("fixed");
    setDiscountInput("0");
    setOpenWhatsappAfter(true);
    setDuplicateDismissed(false);
    setBusy(false);
    setErrorMessage("");
    setCreatedOrder(null);
    if (activeProducts.length > 0) {
      setSelectedProductId(activeProducts[0].id);
      setSelectedSize(getSizesForProduct(activeProducts[0])[0] || "Standard");
    }
  }

  // Auto-recalculate delivery charges when Province changes (unless overridden)
  useEffect(() => {
    if (!deliveryOverride) {
      const baseRate = config?.deliveryCharge !== undefined ? config.deliveryCharge : 200;
      const rate = getDefaultDeliveryChargeForProvince(customerProvince, baseRate);
      setCustomDelivery(String(rate));
    }
  }, [customerProvince, deliveryOverride, config?.deliveryCharge]);

  // Cleaned phone for lookup and validation
  const cleanedPhone = useMemo(() => cleanPakistanPhone(customerPhone), [customerPhone]);
  const isPhoneValid = useMemo(() => isValidPakistanPhone(customerPhone), [customerPhone]);

  // 1. CUSTOMER LOOKUP: Search past orders for this phone number (sorted by latest)
  const matchedCustomer = useMemo(() => {
    if (!cleanedPhone || cleanedPhone.length < 10) return null;
    const matchingOrders = orders.filter((o) => {
      const p = cleanPakistanPhone(o.details?.phone || "");
      const alt = cleanPakistanPhone(o.details?.alternatePhone || "");
      return p === cleanedPhone || alt === cleanedPhone;
    });

    if (matchingOrders.length === 0) return null;

    const sorted = [...matchingOrders].sort(
      (a, b) => Date.parse(b.created_at || "") - Date.parse(a.created_at || "")
    );
    const latest = sorted[0];
    return {
      name: latest.details.name || "",
      address: latest.details.address || "",
      city: latest.details.city || "Lahore",
      province: latest.details.province || "Punjab",
      landmark: latest.details.landmark || "",
      ordersCount: matchingOrders.length,
      latestOrder: latest,
    };
  }, [cleanedPhone, orders]);

  // Autofill customer details
  function handleAutofillCustomer() {
    if (!matchedCustomer) return;
    setCustomerName(matchedCustomer.name);
    setCustomerAddress(matchedCustomer.address);
    setCustomerProvince(matchedCustomer.province);
    setCustomerCity(matchedCustomer.city);
    if (matchedCustomer.landmark) setCustomerLandmark(matchedCustomer.landmark);
    toast.success(`Autofilled details for ${matchedCustomer.name} (${matchedCustomer.ordersCount} past order${matchedCustomer.ordersCount > 1 ? "s" : ""})`);
  }

  // 11. DUPLICATE ORDER DETECTION (past 24h)
  const duplicateWarning = useMemo(() => {
    if (!isPhoneValid || duplicateDismissed) return null;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recent = orders.find((o) => {
      const p = cleanPakistanPhone(o.details?.phone || "");
      const orderTime = Date.parse(o.created_at || "");
      return p === cleanedPhone && orderTime >= oneDayAgo && o.status !== "Cancelled";
    });

    if (!recent) return null;

    const minsAgo = Math.max(1, Math.round((Date.now() - Date.parse(recent.created_at)) / (60 * 1000)));
    const timeText = minsAgo < 60 ? `${minsAgo} min${minsAgo > 1 ? "s" : ""} ago` : `${Math.round(minsAgo / 60)} hour(s) ago`;

    return {
      orderId: recent.id,
      timeText,
      total: recent.total,
      status: recent.status,
    };
  }, [isPhoneValid, cleanedPhone, orders, duplicateDismissed]);

  // Current selected product object
  const currentProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  // Available sizes for currently selected product
  const availableSizes = useMemo(() => {
    if (!currentProduct) return ["Standard"];
    return getSizesForProduct(currentProduct);
  }, [currentProduct]);

  // Synchronize selected size when product changes
  useEffect(() => {
    if (currentProduct) {
      const sizes = getSizesForProduct(currentProduct);
      if (sizes.length > 0 && !sizes.includes(selectedSize)) {
        setSelectedSize(sizes[0]);
      }
    }
  }, [currentProduct]);

  // Calculate live variant stock for current selection
  const currentVariantStock = useMemo(() => {
    if (!currentProduct) return 0;
    const sizeStock = currentProduct.sizeStock as Record<string, number> | undefined;
    const hasSizeStock = Boolean(sizeStock && Object.keys(sizeStock).length > 0);
    let rawStock = 0;
    if (hasSizeStock && sizeStock![selectedSize] !== undefined) {
      rawStock = Number(sizeStock![selectedSize] ?? 0);
    } else if (currentProduct.variants && currentProduct.variants.length > 0) {
      const matchVar = currentProduct.variants.find((v) => v.size === selectedSize);
      if (matchVar && matchVar.stock !== undefined) {
        rawStock = Number(matchVar.stock ?? 0);
      } else {
        rawStock = Number(currentProduct.stock ?? 0);
      }
    } else {
      rawStock = Number(currentProduct.stock ?? 0);
    }

    // Subtract already added qty in bag for this exact product+size
    const alreadyInBag = orderItems
      .filter((i) => i.id === currentProduct.id && i.size === selectedSize)
      .reduce((sum, i) => sum + i.qty, 0);

    return Math.max(0, rawStock - alreadyInBag);
  }, [currentProduct, selectedSize, orderItems]);

  // Search filtered products
  const searchResults = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return activeProducts;
    return activeProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.color && p.color.toLowerCase().includes(q)) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
    );
  }, [activeProducts, productSearch]);

  // Add Item to Order Bag
  function handleAddItem() {
    if (!currentProduct) {
      toast.error("Please select a product first.");
      return;
    }
    if (currentVariantStock <= 0) {
      toast.error(`"${currentProduct.name}" (${selectedSize}) is currently out of stock.`);
      return;
    }

    const qtyToAdd = Math.min(selectedQty, currentVariantStock);
    if (qtyToAdd <= 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }

    const unitPrice = effectivePrice(currentProduct);
    const itemDisc = Math.max(0, parseInt(selectedItemDiscount) || 0);

    const existingIdx = orderItems.findIndex(
      (i) => i.id === currentProduct.id && i.size === selectedSize
    );

    if (existingIdx !== -1) {
      setOrderItems((prev) =>
        prev.map((item, idx) => {
          if (idx === existingIdx) {
            const newQty = item.qty + qtyToAdd;
            return {
              ...item,
              qty: newQty,
              totalPrice: Math.max(0, newQty * item.unitPrice - item.discount),
            };
          }
          return item;
        })
      );
    } else {
      setOrderItems((prev) => [
        ...prev,
        {
          id: currentProduct.id,
          name: currentProduct.name,
          sku: currentProduct.sku || currentProduct.id,
          image: photoUrl(currentProduct),
          color: currentProduct.color || "",
          size: selectedSize,
          qty: qtyToAdd,
          unitPrice,
          discount: itemDisc,
          totalPrice: Math.max(0, qtyToAdd * unitPrice - itemDisc),
          maxStock: currentVariantStock,
        },
      ]);
    }

    toast.success(`Added ${currentProduct.name} (${selectedSize}) × ${qtyToAdd}`);
    setSelectedQty(1);
    setSelectedItemDiscount("0");
  }

  // Update item quantity in bag
  function handleUpdateItemQty(index: number, delta: number) {
    setOrderItems((prev) =>
      prev
        .map((item, idx) => {
          if (idx !== index) return item;
          const newQty = item.qty + delta;
          if (newQty <= 0) return null;
          return {
            ...item,
            qty: newQty,
            totalPrice: Math.max(0, newQty * item.unitPrice - item.discount),
          };
        })
        .filter(Boolean) as ManualOrderItem[]
    );
  }

  // Update item discount
  function handleUpdateItemDiscount(index: number, discValue: number) {
    setOrderItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const disc = Math.max(0, discValue);
        return {
          ...item,
          discount: disc,
          totalPrice: Math.max(0, item.qty * item.unitPrice - disc),
        };
      })
    );
  }

  // Remove item from bag
  function handleRemoveItem(index: number) {
    setOrderItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  // Calculations for Order Summary
  const itemsSubtotal = useMemo(() => {
    return orderItems.reduce((acc, i) => acc + i.qty * i.unitPrice, 0);
  }, [orderItems]);

  const totalItemDiscounts = useMemo(() => {
    return orderItems.reduce((acc, i) => acc + i.discount, 0);
  }, [orderItems]);

  const netItemsSubtotal = useMemo(() => {
    return Math.max(0, itemsSubtotal - totalItemDiscounts);
  }, [itemsSubtotal, totalItemDiscounts]);

  // Order-level discount calculation
  const orderDiscountAmount = useMemo(() => {
    const raw = Math.max(0, parseFloat(discountInput) || 0);
    if (discountMode === "percentage") {
      return Math.round((netItemsSubtotal * Math.min(100, raw)) / 100);
    }
    return Math.min(netItemsSubtotal, Math.round(raw));
  }, [discountMode, discountInput, netItemsSubtotal]);

  // Delivery charge
  const deliveryChargeAmount = useMemo(() => {
    if (config?.freeThreshold && netItemsSubtotal >= config.freeThreshold && !deliveryOverride) {
      return 0;
    }
    return Math.max(0, parseInt(customDelivery) || 0);
  }, [config?.freeThreshold, netItemsSubtotal, deliveryOverride, customDelivery]);

  // Total COD Grand Total
  const totalCODAmount = useMemo(() => {
    return Math.max(0, netItemsSubtotal + deliveryChargeAmount - orderDiscountAmount);
  }, [netItemsSubtotal, deliveryChargeAmount, orderDiscountAmount]);

  // Validation Checks
  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (!customerName.trim()) errs.push("Customer full name is required.");
    if (!isPhoneValid) errs.push("Valid 11-digit Pakistani mobile number (03XX XXXXXXX) is required.");
    const finalCity = customerCity === "Other" ? customerCustomCity.trim() : customerCity.trim();
    if (!finalCity) errs.push("Destination city is required.");
    if (!customerAddress.trim() || customerAddress.trim().length < 5) errs.push("Complete delivery address is required.");
    if (orderItems.length === 0) errs.push("Please add at least 1 product item.");
    return errs;
  }, [customerName, isPhoneValid, customerCity, customerCustomCity, customerAddress, orderItems]);

  const isFormValid = validationErrors.length === 0;

  // Submit Order
  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) {
      toast.error(validationErrors[0] || "Please check all required fields.");
      return;
    }

    setBusy(true);
    setErrorMessage("");

    try {
      const finalCity = customerCity === "Other" ? customerCustomCity.trim() : customerCity.trim();
      const fullAddress = customerLandmark.trim()
        ? `${customerAddress.trim()} (Near: ${customerLandmark.trim()})`
        : customerAddress.trim();

      const payload = {
        name: customerName.trim(),
        phone: cleanedPhone,
        alternatePhone: customerAltPhone.trim() || undefined,
        province: customerProvince || undefined,
        city: finalCity,
        state: customerProvince || undefined,
        address: fullAddress,
        landmark: customerLandmark.trim() || undefined,
        source: customerSource || "WhatsApp Order",
        note: orderNote.trim() || undefined,
        paymentMethod: "cod",
        csrStatus: initialCsrStatus,
        csrAgent: currentUser?.name || "Admin",
        csrConfirmedAt: initialCsrStatus === "Confirmed" ? new Date().toISOString() : undefined,
        status: initialCsrStatus === "Confirmed" ? "Picklist" : "Test order received",
        customDelivery: deliveryChargeAmount,
        customDiscount: orderDiscountAmount + totalItemDiscounts,
        discountType: discountMode,
        deliveryOverride,
        items: orderItems.map((i) => ({
          id: i.id,
          qty: i.qty,
          size: i.size,
          discount: i.discount || 0,
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const out = (await res.json()) as any;
      if (!res.ok) {
        throw new Error(out.error || "Unable to place manual order.");
      }

      const newOrder: Order = {
        id: out.id,
        token: out.token,
        total: out.total,
        status: out.status,
        created_at: out.created_at || new Date().toISOString(),
        details: out.details,
        items: out.items,
      };

      onOrderCreated(newOrder);
      setCreatedOrder(newOrder);
      toast.success(`Manual Order #${out.id} created successfully!`);

      // WhatsApp Trigger
      if (openWhatsappAfter && isPhoneValid) {
        try {
          const msg = getWhatsAppConfirmationMessage(newOrder, "urdu", config?.logoText || "Cartify Pakistan");
          openWhatsApp(newOrder.details.phone, msg);
        } catch {}
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : "Unable to place manual order.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) {
          resetForm();
          onOpenChange(false);
        }
      }}
    >
      <DialogContent
        className="admin-dialog admin-dialog-manual-order sm:max-w-6xl"
        style={{
          maxWidth: "min(1180px, 96vw)",
          width: "96vw",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "24px 28px",
          background: "#ffffff",
        }}
      >
        {/* SUCCESS VIEW */}
        {createdOrder ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px", textAlign: "center", gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#dcfce7",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(22, 163, 74, 0.15)",
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Manual Order Created Successfully!
              </h2>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "4px 12px", borderRadius: 6, border: "1px solid #bfdbfe" }}>
                  Order #{createdOrder.id}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: createdOrder.status === "Picklist" ? "#16a34a" : "#d97706", background: createdOrder.status === "Picklist" ? "#f0fdf4" : "#fef3c7", padding: "4px 10px", borderRadius: 6 }}>
                  {createdOrder.status === "Picklist" ? "Direct to Picklist" : "Pending Confirmation"}
                </span>
              </div>
            </div>

            {/* Order Brief Summary Card */}
            <div
              style={{
                width: "100%",
                maxWidth: 580,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                textAlign: "left",
                fontSize: 13.5,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>
                <span style={{ color: "#64748b" }}>Customer:</span>
                <b style={{ color: "#0f172a" }}>{createdOrder.details.name} ({createdOrder.details.phone})</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>
                <span style={{ color: "#64748b" }}>Destination:</span>
                <b style={{ color: "#0f172a" }}>{createdOrder.details.city}, {createdOrder.details.province}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>
                <span style={{ color: "#64748b" }}>Items Ordered:</span>
                <span style={{ color: "#0f172a", fontWeight: 600 }}>
                  {createdOrder.items.map((i) => `${i.name} (${i.size}) × ${i.qty}`).join(", ")}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
                <span style={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>Total COD Amount:</span>
                <span style={{ color: "#16a34a", fontSize: 18, fontWeight: 800 }}>{money(createdOrder.total)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
              {onPrintAirwayBill && (
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() => onPrintAirwayBill(createdOrder)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}
                >
                  <Printer size={16} /> Print Airway Bill / Slip
                </button>
              )}

              {isPhoneValid && (
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() => {
                    const msg = getWhatsAppConfirmationMessage(createdOrder, "urdu", config?.logoText || "Cartify Pakistan");
                    openWhatsApp(createdOrder.details.phone, msg);
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8, fontSize: 13.5, fontWeight: 600, color: "#15803d" }}
                >
                  <MessageCircle size={16} /> Open WhatsApp Chat
                </button>
              )}

              {onNavigateToOrder && (
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={() => {
                    onOpenChange(false);
                    onNavigateToOrder(createdOrder.id);
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}
                >
                  <FileText size={16} /> View Order in Panel
                </button>
              )}

              <button
                type="button"
                className="admin-primary"
                onClick={resetForm}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 8, fontSize: 13.5, fontWeight: 700, background: "#16a34a" }}
              >
                <Plus size={16} /> Place Another Order
              </button>
            </div>
          </div>
        ) : (
          /* FORM VIEW */
          <>
            <DialogHeader>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <DialogTitle style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 19, fontWeight: 700, color: "#0f172a" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: "#dcfce7",
                      color: "#16a34a",
                    }}
                  >
                    <ShoppingBag size={20} />
                  </span>
                  Place Manual Order
                </DialogTitle>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      toast.info("Form cleaned");
                    }}
                    title="Reset and clear all form fields"
                    style={{
                      fontSize: 12,
                      padding: "4px 9px",
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      color: "#475569",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#e2e8f0";
                      e.currentTarget.style.color = "#0f172a";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#f1f5f9";
                      e.currentTarget.style.color = "#475569";
                    }}
                  >
                    <RotateCcw size={12} /> Clear Form
                  </button>
                  <span style={{ fontSize: 12, padding: "3px 8px", background: "#f1f5f9", borderRadius: 6, color: "#475569", fontWeight: 600 }}>
                    Agent: {currentUser?.name || "Admin"}
                  </span>
                </div>
              </div>
              <DialogDescription style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                Record phone, WhatsApp, Instagram, Facebook, or walk-in orders with real-time stock deduction, customer lookup &amp; auto-calculated delivery.
              </DialogDescription>
            </DialogHeader>

            {/* Duplicate Order Banner */}
            {duplicateWarning && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 13,
                  color: "#92400e",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangle size={18} style={{ color: "#d97706", flexShrink: 0 }} />
                  <div>
                    <b>Possible Duplicate Order:</b> Order <b>#{duplicateWarning.orderId}</b> ({money(duplicateWarning.total)}) was placed <b>{duplicateWarning.timeText}</b> with this same phone number.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDuplicateDismissed(true)}
                  style={{
                    background: "#fef3c7",
                    border: "1px solid #fcd34d",
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#92400e",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Dismiss &amp; Proceed
                </button>
              </div>
            )}

            {/* Error Message Box */}
            {errorMessage && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  fontSize: 13,
                  color: "#b91c1c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage("")}
                  style={{ background: "none", border: "none", color: "#b91c1c", cursor: "pointer" }}
                >
                  <X size={15} />
                </button>
              </div>
            )}

            <form
              onSubmit={handleSubmitOrder}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                  e.preventDefault();
                  if ((e.target as HTMLElement).id === "product-search-input") {
                    handleAddItem();
                  }
                }
              }}
            >
              <div className="manual-order-grid" style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 24, marginTop: 14 }}>
                {/* LEFT COLUMN: Customer & Delivery Details */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 6, borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          background: "#ede9fe",
                          color: "#6366f1",
                        }}
                      >
                        <User size={15} />
                      </span>
                      <h4 style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                        1. Customer &amp; Delivery Details
                      </h4>
                    </div>

                    {/* Returning Customer Autofill Badge */}
                    {matchedCustomer && (
                      <button
                        type="button"
                        onClick={handleAutofillCustomer}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          color: "#15803d",
                          padding: "3px 10px",
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                        title="Click to autofill customer address & details"
                      >
                        <Sparkles size={13} />
                        Autofill Returning Customer ({matchedCustomer.ordersCount} past order{matchedCustomer.ordersCount > 1 ? "s" : ""})
                      </button>
                    )}
                  </div>

                  {/* Phone & Alt Phone */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                          Mobile Phone <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        {customerPhone && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: isPhoneValid ? "#16a34a" : "#dc2626",
                            }}
                          >
                            {isPhoneValid ? "✓ Valid Pakistani Mobile" : "Invalid (03XX-XXXXXXX)"}
                          </span>
                        )}
                      </div>
                      <input
                        required
                        type="tel"
                        placeholder="0300 1234567"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 7,
                          border: `1px solid ${customerPhone && !isPhoneValid ? "#f87171" : "#cbd5e1"}`,
                          fontSize: 13,
                          height: 38,
                          background: customerPhone && isPhoneValid ? "#f0fdf4" : "#ffffff",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>Alt Phone (Optional)</label>
                      <input
                        type="tel"
                        placeholder="0321 7654321"
                        value={customerAltPhone}
                        onChange={(e) => setCustomerAltPhone(e.target.value)}
                        style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid #cbd5e1", fontSize: 13, height: 38 }}
                      />
                    </div>
                  </div>

                  {/* Customer Name */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                      Customer Full Name <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      required
                      placeholder="e.g. Muhammad Ali Khan"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid #cbd5e1", fontSize: 13, height: 38 }}
                    />
                  </div>

                  {/* Province & Destination City */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                        Province <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <select
                        value={customerProvince}
                        onChange={(e) => {
                          const newProv = e.target.value;
                          setCustomerProvince(newProv);
                          const cities = (PAKISTAN_CITIES_BY_PROVINCE as any)[newProv] || [];
                          if (cities.length > 0) setCustomerCity(cities[0]);
                        }}
                        style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid #cbd5e1", fontSize: 13, height: 38, background: "#ffffff" }}
                      >
                        {PAKISTAN_PROVINCES.map((prov) => (
                          <option key={prov} value={prov}>
                            {prov}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                        Destination City <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <select
                        value={customerCity}
                        onChange={(e) => setCustomerCity(e.target.value)}
                        style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid #cbd5e1", fontSize: 13, height: 38, background: "#ffffff" }}
                      >
                        {((PAKISTAN_CITIES_BY_PROVINCE as any)[customerProvince] || ALL_PAKISTAN_CITIES).map((c: string) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        <option value="Other">Other City / Area…</option>
                      </select>
                    </div>
                  </div>

                  {customerCity === "Other" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                        Specify City / Tehsil Name <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        required
                        placeholder="e.g. Swabi, Chakwal, etc."
                        value={customerCustomCity}
                        onChange={(e) => setCustomerCustomCity(e.target.value)}
                        style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid #cbd5e1", fontSize: 13, height: 38 }}
                      />
                    </div>
                  )}

                  {/* Delivery Address */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                      Complete Delivery Address <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="House / Flat #, Street #, Mohallah / Block, Sector…"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid #cbd5e1", fontSize: 13, resize: "vertical", lineHeight: 1.4 }}
                    />
                  </div>

                  {/* Nearest Landmark */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>Nearest Landmark (Optional)</label>
                    <input
                      placeholder="e.g. Near Shell Pump, Opp. Gourmet Bakery"
                      value={customerLandmark}
                      onChange={(e) => setCustomerLandmark(e.target.value)}
                      style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid #cbd5e1", fontSize: 13, height: 38 }}
                    />
                  </div>

                  {/* Source & Initial Status */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>Order Source / Channel</label>
                      <select
                        value={customerSource}
                        onChange={(e) => setCustomerSource(e.target.value)}
                        style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid #cbd5e1", fontSize: 13, height: 38, background: "#ffffff" }}
                      >
                        <option value="WhatsApp Order">💬 WhatsApp Order</option>
                        <option value="Phone Call Order">📞 Phone Call Order</option>
                        <option value="Instagram / FB DM">📸 Instagram / FB DM</option>
                        <option value="TikTok Order">🎵 TikTok Order</option>
                        <option value="Counter / Walk-in">🏪 Counter / Walk-in</option>
                        <option value="Direct Web Entry">🌐 Direct Web Entry</option>
                      </select>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>Initial Status</label>
                      <select
                        value={initialCsrStatus}
                        onChange={(e) => setInitialCsrStatus(e.target.value as any)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 7,
                          border: "1px solid #cbd5e1",
                          fontSize: 13,
                          height: 38,
                          background: initialCsrStatus === "Confirmed" ? "#f0fdf4" : "#fefce8",
                          fontWeight: 600,
                        }}
                      >
                        <option value="Confirmed">🟢 CSR Confirmed (Direct to Picklist)</option>
                        <option value="Pending">🟡 Pending Verification Call</option>
                      </select>
                    </div>
                  </div>

                  {/* Order Note */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>Order Note / Customer Request</label>
                    <input
                      placeholder="e.g. Deliver before Friday, call before arriving"
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid #cbd5e1", fontSize: 13, height: 38 }}
                    />
                  </div>
                </div>

                {/* RIGHT COLUMN: Product Picker, Items Table & Pricing */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 6, borderBottom: "1px solid #f1f5f9" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        background: "#dcfce7",
                        color: "#16a34a",
                      }}
                    >
                      <Package size={15} />
                    </span>
                    <h4 style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                      2. Products &amp; Order Items
                    </h4>
                  </div>

                  {/* Product Search & Picker Box */}
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 9,
                      padding: "12px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {/* Search Input */}
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <Search size={14} style={{ position: "absolute", left: 10, color: "#94a3b8", pointerEvents: "none" }} />
                      <input
                        id="product-search-input"
                        type="text"
                        placeholder="Search product by name, SKU, color or category..."
                        value={productSearch}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProductSearch(val);
                          const q = val.trim().toLowerCase();
                          const matches = activeProducts.filter(
                            (p) =>
                              p.name.toLowerCase().includes(q) ||
                              (p.sku && p.sku.toLowerCase().includes(q)) ||
                              (p.color && p.color.toLowerCase().includes(q))
                          );
                          if (matches.length > 0 && !matches.some((p) => p.id === selectedProductId)) {
                            setSelectedProductId(matches[0].id);
                            setSelectedSize(getSizesForProduct(matches[0])[0] || "Standard");
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "7px 28px 7px 30px",
                          borderRadius: 6,
                          border: "1px solid #cbd5e1",
                          fontSize: 12.5,
                          height: 34,
                          background: "#ffffff",
                        }}
                      />
                      {productSearch && (
                        <button
                          type="button"
                          onClick={() => setProductSearch("")}
                          style={{
                            position: "absolute",
                            right: 6,
                            background: "none",
                            border: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            padding: 4,
                            display: "flex",
                            alignItems: "center",
                          }}
                          title="Clear search"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Product Dropdown Selector */}
                    {searchResults.length === 0 ? (
                      <div style={{ padding: "8px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, color: "#b91c1c" }}>
                        No products match "{productSearch}".
                      </div>
                    ) : (
                      <select
                        value={selectedProductId}
                        onChange={(e) => {
                          setSelectedProductId(e.target.value);
                          const p = products.find((x) => x.id === e.target.value);
                          if (p) {
                            setSelectedSize(getSizesForProduct(p)[0] || "Standard");
                          }
                        }}
                        style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, height: 38, background: "#ffffff" }}
                      >
                        {searchResults.map((p) => {
                          const stockNum = p.stock ?? 0;
                          return (
                            <option key={p.id} value={p.id} disabled={stockNum <= 0}>
                              {p.name} · {p.color ? `${p.color} · ` : ""}{money(effectivePrice(p))} {stockNum > 0 ? `(Stock: ${stockNum})` : "[OUT OF STOCK]"}
                            </option>
                          );
                        })}
                      </select>
                    )}

                    {/* Variant & Size Selection Row with Live Stock */}
                    {currentProduct && (
                      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 1fr auto", gap: 8, alignItems: "flex-end" }}>
                        {/* Size / Variant */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <label style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b" }}>
                            Size / Variant
                          </label>
                          <select
                            value={selectedSize}
                            onChange={(e) => setSelectedSize(e.target.value)}
                            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12.5, height: 36, background: "#ffffff" }}
                          >
                            {availableSizes.map((s) => {
                              const sizeStock = currentProduct.sizeStock as Record<string, number> | undefined;
                              const stockVal = sizeStock && sizeStock[s] !== undefined ? sizeStock[s] : currentProduct.stock ?? 0;
                              return (
                                <option key={s} value={s} disabled={stockVal <= 0}>
                                  {s} {stockVal > 0 ? `(${stockVal} in stock)` : `[Out of stock]`}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <label style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b" }}>
                            Qty (Max: {currentVariantStock})
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={Math.max(1, currentVariantStock)}
                            value={selectedQty}
                            onChange={(e) => setSelectedQty(Math.max(1, Math.min(currentVariantStock || 1, parseInt(e.target.value) || 1)))}
                            disabled={currentVariantStock <= 0}
                            style={{ padding: "6px 6px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, fontWeight: 700, textAlign: "center", height: 36, background: "#ffffff" }}
                          />
                        </div>

                        {/* Item Discount */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <label style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b" }}>
                            Item Disc. (Rs.)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={selectedItemDiscount}
                            onChange={(e) => setSelectedItemDiscount(e.target.value)}
                            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12.5, height: 36, background: "#ffffff", textAlign: "right" }}
                          />
                        </div>

                        {/* Add Button */}
                        <button
                          type="button"
                          className="admin-primary"
                          disabled={currentVariantStock <= 0}
                          onClick={handleAddItem}
                          style={{
                            height: 36,
                            padding: "0 14px",
                            fontSize: 12.5,
                            fontWeight: 700,
                            borderRadius: 6,
                            background: currentVariantStock > 0 ? "#203664" : "#94a3b8",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            cursor: currentVariantStock > 0 ? "pointer" : "not-allowed",
                          }}
                        >
                          <Plus size={14} /> Add
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Added Items Table / List */}
                  <div
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      minHeight: 120,
                      maxHeight: 180,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      background: "#ffffff",
                    }}
                  >
                    {orderItems.length === 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 110, color: "#94a3b8", fontSize: 12.5 }}>
                        <ShoppingBag size={24} style={{ marginBottom: 4, opacity: 0.5 }} />
                        <span>No items added. Pick a product above and click Add.</span>
                      </div>
                    ) : (
                      orderItems.map((item, idx) => (
                        <div
                          key={`${item.id}-${item.size}-${idx}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            padding: "8px 10px",
                            borderBottom: idx !== orderItems.length - 1 ? "1px solid #f1f5f9" : "none",
                            background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd",
                          }}
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            style={{ width: 34, height: 34, objectFit: "contain", borderRadius: 4, background: "#ffffff", border: "1px solid #e2e8f0" }}
                          />

                          <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                            <div style={{ fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.name}
                            </div>
                            <div style={{ color: "#64748b", fontSize: 11.5 }}>
                              {item.size} · {item.sku} · {money(item.unitPrice)}
                              {item.discount > 0 && <span style={{ color: "#16a34a", marginLeft: 4 }}>(Disc: -Rs. {item.discount})</span>}
                            </div>
                          </div>

                          {/* Stepper Quantity Buttons */}
                          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#f1f5f9", borderRadius: 5, padding: "2px 4px" }}>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(idx, -1)}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "#475569", display: "flex", alignItems: "center" }}
                              title="Decrease quantity"
                            >
                              <Minus size={12} />
                            </button>
                            <span style={{ fontSize: 12, fontWeight: 700, minWidth: 16, textAlign: "center", color: "#0f172a" }}>
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(idx, 1)}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "#475569", display: "flex", alignItems: "center" }}
                              title="Increase quantity"
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 13, minWidth: 70, textAlign: "right" }}>
                            {money(item.totalPrice)}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" }}
                            title="Remove item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 3. ORDER SUMMARY & TOTALS */}
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      padding: "12px 14px",
                      borderRadius: 9,
                      display: "flex",
                      flexDirection: "column",
                      gap: 7,
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                      <span>Items Subtotal:</span>
                      <b style={{ color: "#0f172a" }}>{money(itemsSubtotal)}</b>
                    </div>

                    {totalItemDiscounts > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#16a34a" }}>
                        <span>Item-Level Discounts:</span>
                        <b>- {money(totalItemDiscounts)}</b>
                      </div>
                    )}

                    {/* Delivery Charges Row with Override */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#475569" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>Delivery Charges ({customerProvince}):</span>
                        {deliveryOverride && (
                          <span style={{ fontSize: 10, background: "#fee2e2", color: "#dc2626", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>
                            Override
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>Rs.</span>
                        <input
                          type="number"
                          min={0}
                          value={customDelivery}
                          onChange={(e) => {
                            setDeliveryOverride(true);
                            setCustomDelivery(e.target.value);
                          }}
                          style={{ width: 70, padding: "3px 6px", borderRadius: 5, border: "1px solid #cbd5e1", fontSize: 13, textAlign: "right", background: "#ffffff" }}
                        />
                      </div>
                    </div>

                    {/* Order Level Discount Row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#475569" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>Order Discount:</span>
                        <div style={{ display: "inline-flex", background: "#e2e8f0", borderRadius: 4, padding: 1 }}>
                          <button
                            type="button"
                            onClick={() => setDiscountMode("fixed")}
                            style={{
                              background: discountMode === "fixed" ? "#ffffff" : "transparent",
                              border: "none",
                              padding: "2px 6px",
                              fontSize: 10,
                              fontWeight: 700,
                              borderRadius: 3,
                              cursor: "pointer",
                              color: discountMode === "fixed" ? "#0f172a" : "#64748b",
                            }}
                          >
                            Rs.
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiscountMode("percentage")}
                            style={{
                              background: discountMode === "percentage" ? "#ffffff" : "transparent",
                              border: "none",
                              padding: "2px 6px",
                              fontSize: 10,
                              fontWeight: 700,
                              borderRadius: 3,
                              cursor: "pointer",
                              color: discountMode === "percentage" ? "#0f172a" : "#64748b",
                            }}
                          >
                            %
                          </button>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>- {discountMode === "fixed" ? "Rs." : "%"}</span>
                        <input
                          type="number"
                          min={0}
                          value={discountInput}
                          onChange={(e) => setDiscountInput(e.target.value)}
                          style={{ width: 70, padding: "3px 6px", borderRadius: 5, border: "1px solid #cbd5e1", fontSize: 13, textAlign: "right", background: "#ffffff" }}
                        />
                      </div>
                    </div>

                    {/* Total COD Amount */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: "#0f172a",
                        fontSize: 14.5,
                        fontWeight: 800,
                        borderTop: "1.5px solid #cbd5e1",
                        paddingTop: 8,
                        marginTop: 2,
                      }}
                    >
                      <span>Total COD Amount:</span>
                      <span style={{ color: "#16a34a", fontSize: 17, fontWeight: 800 }}>
                        {money(totalCODAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: "1px solid #e2e8f0",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                {/* WhatsApp Checkbox */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12.5,
                    color: isPhoneValid ? "#1e293b" : "#94a3b8",
                    cursor: isPhoneValid ? "pointer" : "not-allowed",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={openWhatsappAfter && isPhoneValid}
                    disabled={!isPhoneValid}
                    onChange={(e) => setOpenWhatsappAfter(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: "#16a34a" }}
                  />
                  <span>
                    Send WhatsApp confirmation to <b>{isPhoneValid ? cleanedPhone : "customer mobile"}</b>
                  </span>
                </label>

                {/* Submit & Cancel Buttons */}
                <div style={{ display: "flex", gap: 10, marginLeft: "auto", alignItems: "center" }}>
                  {!isFormValid && (
                    <span style={{ fontSize: 11.5, color: "#dc2626", fontWeight: 600 }}>
                      {validationErrors[0]}
                    </span>
                  )}

                  <button
                    type="button"
                    className="admin-secondary"
                    style={{ padding: "8px 16px", fontSize: 13, height: 38, borderRadius: 7 }}
                    onClick={() => onOpenChange(false)}
                    disabled={busy}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="admin-primary"
                    disabled={busy || !isFormValid}
                    style={{
                      padding: "8px 24px",
                      fontSize: 13.5,
                      fontWeight: 700,
                      height: 38,
                      borderRadius: 7,
                      background: isFormValid ? "#16a34a" : "#94a3b8",
                      cursor: isFormValid && !busy ? "pointer" : "not-allowed",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {busy ? (
                      <>
                        <LoaderCircle className="login-spin" size={15} /> Placing Order…
                      </>
                    ) : (
                      "Place Manual Order"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
