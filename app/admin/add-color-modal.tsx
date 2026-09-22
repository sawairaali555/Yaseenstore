"use client";
import { useState, useEffect, useRef } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  Package,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { money, type ProductVariant } from "@/app/catalog";
import type { ManagedProduct } from "@/lib/store-data";
import SizeVariantField from "./size-variant-field";

type Props = {
  product: ManagedProduct | null;
  open: boolean;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedProduct: ManagedProduct) => Promise<void>;
};

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || "color"
  );
}

const PRESET_COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#ffffff" },
  { name: "Navy", hex: "#1e3a8a" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Red", hex: "#dc2626" },
  { name: "Maroon", hex: "#800000" },
  { name: "Grey", hex: "#64748b" },
  { name: "Green", hex: "#16a34a" },
  { name: "Beige", hex: "#f5f5dc" },
  { name: "Brown", hex: "#78350f" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Purple", hex: "#9333ea" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Orange", hex: "#ea580c" },
  { name: "Cream", hex: "#fffdd0" },
  { name: "Gold", hex: "#d97706" },
  { name: "Silver", hex: "#94a3b8" },
  { name: "Charcoal", hex: "#334155" },
  { name: "Teal", hex: "#0d9488" },
  { name: "Olive", hex: "#808000" },
  { name: "Burgundy", hex: "#6b1724" },
  { name: "Multicolor", hex: "#a855f7" },
];

const STANDARD_SHOE_SIZES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"];
const STANDARD_CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

const MAX_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const imageUrl = (value: string) => {
  if (!value) return "";
  if (value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) return value;
  return "/images/" + value + ".jpg";
};

interface SizeRow {
  size: string;
  sku: string;
  stock: number;
  priceMode: "inherit" | "override";
  priceOverride?: number;
  status: "Active" | "Draft";
}

export default function AddColorModal({ product, open, busy = false, onOpenChange, onSave }: Props) {
  // Step 1: Color
  const [colorMode, setColorMode] = useState<"preset" | "custom">("preset");
  const [colorName, setColorName] = useState("Black");
  const [customColor, setCustomColor] = useState("");
  const [colorHex, setColorHex] = useState("#000000");
  const [colorSearchQuery, setColorSearchQuery] = useState("");

  // Step 2: Images
  const [colorImages, setColorImages] = useState<string[]>([]);
  const [mainImage, setMainImage] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [hoveredImgIdx, setHoveredImgIdx] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [draggedImgIdx, setDraggedImgIdx] = useState<number | null>(null);
  const [dragOverImgIdx, setDragOverImgIdx] = useState<number | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [replaceTargetIdx, setReplaceTargetIdx] = useState<number | null>(null);

  // Step 3: Sizes & Inventory Table
  const [suggestedSizes, setSuggestedSizes] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [customSizeInput, setCustomSizeInput] = useState("");
  const [sizeRows, setSizeRows] = useState<SizeRow[]>([]);

  // Bulk Controls
  const [bulkStockVal, setBulkStockVal] = useState("");
  const [bulkPriceMode, setBulkPriceMode] = useState<"inherit" | "override">("inherit");
  const [bulkPriceVal, setBulkPriceVal] = useState("");
  const [bulkStatus, setBulkStatus] = useState<"Active" | "Draft">("Active");

  const [savingState, setSavingState] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const addFilesInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // Derive active color name
  const effectiveColorName = (colorMode === "custom" ? customColor : colorName).trim();

  // Check if color already exists
  const existingColors = product?.variants
    ? Array.from(new Set(product.variants.map((v) => (v.color || "").trim().toLowerCase()).filter(Boolean)))
    : product?.color
    ? [product.color.trim().toLowerCase()]
    : [];
  const isDuplicateColor = effectiveColorName ? existingColors.includes(effectiveColorName.toLowerCase()) : false;

  // Initialize on open
  useEffect(() => {
    if (open && product) {
      const existingColNames = product.variants
        ? Array.from(new Set(product.variants.map((v) => (v.color || "").trim().toLowerCase()).filter(Boolean)))
        : product.color
        ? [product.color.trim().toLowerCase()]
        : [];

      const defaultPreset = PRESET_COLORS.find((c) => !existingColNames.includes(c.name.toLowerCase())) || PRESET_COLORS[0];

      setColorMode("preset");
      setColorName(defaultPreset.name);
      setCustomColor("");
      setColorHex(defaultPreset.hex);
      setColorSearchQuery("");
      setColorImages([]);
      setMainImage("");
      setPreviewImage(null);
      setReplaceTargetIdx(null);
      setBulkStockVal("");
      setBulkPriceMode("inherit");
      setBulkPriceVal("");
      setBulkStatus("Active");
      setSavingState(false);

      // Extract existing product sizes (strictly from backend configuration)
      const existing: string[] = [];
      if ((product as any).variantOptions && Array.isArray((product as any).variantOptions)) {
        const sizeOpt = (product as any).variantOptions.find((o: any) => o.name.toLowerCase() === "size");
        if (sizeOpt && Array.isArray(sizeOpt.values) && sizeOpt.values.length > 0) {
          existing.push(...sizeOpt.values);
        }
      }
      if (existing.length === 0 && product.sizes && product.sizes.length > 0) {
        existing.push(...product.sizes.filter((s: string) => s !== "Standard"));
      }
      if (existing.length === 0 && product.variants && product.variants.length > 0) {
        product.variants.forEach((v) => {
          if (v.size && v.size !== "Standard" && !existing.includes(v.size)) existing.push(v.size);
        });
      }
      if (existing.length === 0 && product.sizeStock && Object.keys(product.sizeStock).length > 0) {
        existing.push(...Object.keys(product.sizeStock).filter((s) => s !== "Standard"));
      }
      if (existing.length === 0) {
        existing.push("Standard");
      }

      setSuggestedSizes(existing);
      // Smart default: activate all existing sizes
      setSelectedSizes(existing);
      rebuildRows(existing, defaultPreset.name);
    }
  }, [open, product]);

  // Rebuild rows keeping existing customizations if present
  function rebuildRows(sizesList: string[], cName: string) {
    if (!product) return;
    const baseSku = product.sku || product.id || "PROD";
    const cleanColor = cName || "COLOR";

    setSizeRows((prev) => {
      const prevMap = new Map(prev.map((r) => [r.size, r]));
      return sizesList.map((sz) => {
        const existing = prevMap.get(sz);
        if (existing) {
          return {
            ...existing,
            sku: existing.sku || `${baseSku}-${slugify(cleanColor).toUpperCase()}-${slugify(sz).toUpperCase()}`,
          };
        }
        return {
          size: sz,
          sku: `${baseSku}-${slugify(cleanColor).toUpperCase()}-${slugify(sz).toUpperCase()}`,
          stock: 0,
          priceMode: "inherit",
          priceOverride: undefined,
          status: "Active",
        };
      });
    });
  }

  function handleColorSelect(name: string, hex?: string) {
    setColorMode("preset");
    setColorName(name);
    if (hex) {
      setColorHex(hex);
    } else {
      const found = PRESET_COLORS.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (found) setColorHex(found.hex);
    }
    rebuildRows(selectedSizes, name);
  }

  function handleCustomColorChange(name: string) {
    setCustomColor(name);
    rebuildRows(selectedSizes, name);
  }

  function handleToggleSize(sz: string) {
    const next = selectedSizes.includes(sz)
      ? selectedSizes.filter((s) => s !== sz)
      : [...selectedSizes, sz];
    setSelectedSizes(next);
    rebuildRows(next, effectiveColorName);
  }

  function handleSelectAllSizes() {
    const allAvailable = Array.from(new Set([
      ...suggestedSizes,
      ...(suggestedSizes.some((s) => !isNaN(Number(s))) ? STANDARD_SHOE_SIZES : STANDARD_CLOTHING_SIZES),
    ]));
    setSelectedSizes(allAvailable);
    rebuildRows(allAvailable, effectiveColorName);
  }

  function handleClearSizes() {
    setSelectedSizes([]);
    setSizeRows([]);
  }

  function handleAddCustomSize() {
    const trimmed = customSizeInput.trim();
    if (!trimmed) return;
    if (!selectedSizes.includes(trimmed)) {
      const next = [...selectedSizes, trimmed];
      setSelectedSizes(next);
      rebuildRows(next, effectiveColorName);
    }
    setCustomSizeInput("");
  }

  // Bulk Apply Handlers
  function applyBulkStock() {
    const num = Number(bulkStockVal);
    if (!Number.isFinite(num) || num < 0) {
      toast.error("Please enter a valid non-negative stock quantity.");
      return;
    }
    setSizeRows((curr) => curr.map((r) => ({ ...r, stock: num })));
    toast.success(`Set stock to ${num} for all ${sizeRows.length} sizes`);
  }

  function applyBulkPrice() {
    if (bulkPriceMode === "inherit") {
      setSizeRows((curr) => curr.map((r) => ({ ...r, priceMode: "inherit", priceOverride: undefined })));
      toast.success(`Set all sizes to inherit product price (${money(product?.price || 0)})`);
    } else {
      const num = Number(bulkPriceVal);
      if (!Number.isFinite(num) || num <= 0) {
        toast.error("Please enter a valid price override amount.");
        return;
      }
      setSizeRows((curr) => curr.map((r) => ({ ...r, priceMode: "override", priceOverride: num })));
      toast.success(`Set override price to ${money(num)} for all ${sizeRows.length} sizes`);
    }
  }

  function applyBulkStatus() {
    setSizeRows((curr) => curr.map((r) => ({ ...r, status: bulkStatus })));
    toast.success(`Set status to ${bulkStatus} for all ${sizeRows.length} sizes`);
  }

  function setAllRowsStatus(nextStatus: "Active" | "Draft") {
    setBulkStatus(nextStatus);
    setSizeRows((curr) => curr.map((r) => ({ ...r, status: nextStatus })));
  }

  // Upload Files for this Color
  async function uploadFiles(files: FileList | File[] | null) {
    if (!files || !files.length) return;
    const fileArray = Array.from(files);

    for (const f of fileArray) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        toast.error(`"${f.name}" is not supported. Please upload JPG, PNG, or WebP.`);
        return;
      }
      if (f.size > MAX_SIZE) {
        toast.error(`"${f.name}" exceeds 3 MB. Please choose a smaller image.`);
        return;
      }
    }

    setUploading(true);
    setUploadProgress(`Uploading ${fileArray.length} image${fileArray.length > 1 ? "s" : ""}…`);

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setUploadProgress(`Uploading ${i + 1} of ${fileArray.length}…`);
        const response = await fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const data = (await response.json()) as any;
        if (!response.ok) throw new Error(data.error || "Upload failed.");
        if (data.url) uploadedUrls.push(data.url);
      }

      setColorImages((curr) => {
        const next = Array.from(new Set([...curr, ...uploadedUrls]));
        if (!mainImage && next.length > 0) setMainImage(next[0]);
        return next;
      });

      toast.success(`${uploadedUrls.length} image(s) uploaded for ${effectiveColorName || "this color"}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image.");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  // Replace Single File for this Color
  async function handleReplaceFile(files: FileList | File[] | null) {
    if (!files || !files.length || replaceTargetIdx === null) return;
    const file = files[0];
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(`"${file.name}" is not supported. Please upload JPG, PNG, or WebP.`);
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error(`"${file.name}" exceeds 3 MB. Please choose a smaller image.`);
      return;
    }

    setUploading(true);
    setUploadProgress("Replacing image…");
    const targetIdx = replaceTargetIdx;

    try {
      const response = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const data = (await response.json()) as any;
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      if (data.url) {
        const oldUrl = colorImages[targetIdx];
        const newUrl = data.url;
        setColorImages((curr) => {
          const next = [...curr];
          next[targetIdx] = newUrl;
          return next;
        });
        if (oldUrl === mainImage) setMainImage(newUrl);
        toast.success("Image replaced successfully");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to replace image.");
    } finally {
      setUploading(false);
      setUploadProgress("");
      setReplaceTargetIdx(null);
    }
  }

  function handleDeleteImage(idx: number) {
    const deletedUrl = colorImages[idx];
    const next = colorImages.filter((_, i) => i !== idx);
    setColorImages(next);
    if (deletedUrl === mainImage) {
      setMainImage(next[0] || "");
    }
    toast.info("Image removed from color gallery");
  }

  function reorderImages(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    setColorImages((curr) => {
      const copy = [...curr];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      return copy;
    });
  }

  // Submit Handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;

    if (!effectiveColorName) {
      toast.error("Please enter or select a Color Name.");
      return;
    }

    if (isDuplicateColor) {
      toast.error(`"${effectiveColorName}" has already been added to this product.`);
      return;
    }

    if (sizeRows.length === 0) {
      toast.error("Please select at least one size for this color.");
      return;
    }

    // Validate size stock values & SKUs
    const skuSet = new Set<string>();
    for (const row of sizeRows) {
      if (!Number.isFinite(row.stock) || row.stock < 0) {
        toast.error(`Invalid stock quantity for size ${row.size}.`);
        return;
      }
      const cleanSku = row.sku.trim().toUpperCase();
      if (!cleanSku) {
        toast.error(`Please provide an SKU for size ${row.size}.`);
        return;
      }
      if (skuSet.has(cleanSku)) {
        toast.error(`Duplicate SKU "${cleanSku}" found. Each variant SKU must be unique.`);
        return;
      }
      skuSet.add(cleanSku);
    }

    setSavingState(true);

    try {
      const existingVariants = product.variants || [];
      const effectiveMainImg = mainImage || colorImages[0] || product.image;
      const effectiveImages = colorImages.length ? colorImages : (product.images || [product.image]);

      // Construct new variant records for this color
      const newVariants: ProductVariant[] = sizeRows.map((row) => {
        const finalPrice = row.priceMode === "override" && row.priceOverride && row.priceOverride > 0
          ? Number(row.priceOverride)
          : product.price;

        return {
          id: `${product.id}-${slugify(effectiveColorName)}-${slugify(row.size)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          title: `${effectiveColorName} / ${row.size}`,
          color: effectiveColorName,
          colorHex: colorHex || undefined,
          size: row.size,
          sku: row.sku.trim(),
          stock: Number(row.stock) || 0,
          price: finalPrice,
          oldPrice: product.old,
          costPrice: product.costPrice,
          image: effectiveMainImg,
          images: effectiveImages,
          status: row.status,
        };
      });

      const updatedVariants = [...existingVariants, ...newVariants];
      const totalStock = updatedVariants.reduce((sum, v) => sum + Number(v.stock || 0), 0);

      const updatedProduct: ManagedProduct = {
        ...product,
        hasVariants: true,
        variants: updatedVariants,
        stock: totalStock,
      };

      await onSave(updatedProduct);
      toast.success(`${effectiveColorName} added successfully`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add color variant.");
    } finally {
      setSavingState(false);
    }
  }

  const filteredPresetColors = PRESET_COLORS.filter((c) =>
    c.name.toLowerCase().includes(colorSearchQuery.toLowerCase())
  );

  const totalStockForColor = sizeRows.reduce((sum, r) => sum + Number(r.stock || 0), 0);
  const statusSwitchStyle = (active: boolean, compact = false): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: active ? "flex-end" : "flex-start",
    width: compact ? 36 : 42,
    height: compact ? 20 : 24,
    padding: 2,
    borderRadius: 999,
    border: "none",
    background: active ? "#16a34a" : "#cbd5e1",
    cursor: "pointer",
    transition: "background 0.16s ease",
    touchAction: "manipulation",
  });
  const statusKnobStyle = (active: boolean, compact = false): React.CSSProperties => ({
    display: "block",
    width: compact ? 16 : 20,
    height: compact ? 16 : 20,
    borderRadius: "50%",
    background: "#ffffff",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.2)",
    transition: "transform 0.16s ease, background 0.16s ease",
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={`admin-dialog add-color-dialog ${isFullscreen ? "add-color-fullscreen" : ""}`}
          style={{
            maxWidth: isFullscreen ? "100vw" : 1240,
            width: isFullscreen ? "100vw" : "96vw",
            height: isFullscreen ? "100vh" : "auto",
            maxHeight: isFullscreen ? "100vh" : "90vh",
            display: "flex",
            flexDirection: "column",
            padding: 0,
            overflow: "hidden",
            borderRadius: isFullscreen ? 0 : 14,
            border: isFullscreen ? "none" : "1px solid #cbd5e1",
            boxShadow: isFullscreen ? "none" : "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
            background: "#ffffff",
          }}
        >
          {/* Sticky Header */}
          <DialogHeader
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid #e2e8f0",
              background: "#f8fafc",
              flexShrink: 0,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <DialogTitle style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.2px" }}>
                Add New Color
              </DialogTitle>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                Create another color for this product.
              </div>
              {product && (
                <div
                  style={{
                    fontSize: 11.5,
                    color: "#64748b",
                    marginTop: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <Package size={13} style={{ color: "#64748b" }} />
                  <span>Product:</span>
                  <strong style={{ color: "#1e293b", fontWeight: 700 }}>{product.name}</strong>
                  {product.sku && (
                    <span
                      style={{
                        background: "#e2e8f0",
                        color: "#475569",
                        padding: "1px 6px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      SKU: {product.sku}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 24 }}>
              {product?.id && (
                <a
                  href={`/admin/products/edit?id=${product.id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#334155",
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                  title="Open in full-page Product Editor"
                >
                  <ExternalLink size={13} /> Full Page Editor
                </a>
              )}
              <button
                type="button"
                onClick={() => setIsFullscreen((prev) => !prev)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: isFullscreen ? "1px solid #203664" : "1px solid #cbd5e1",
                  background: isFullscreen ? "#203664" : "#ffffff",
                  color: isFullscreen ? "#ffffff" : "#1e293b",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: isFullscreen ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
                  transition: "all 0.15s ease",
                }}
                title={isFullscreen ? "Restore standard modal view" : "Expand to full screen view with maximum width"}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 size={13} /> Standard View
                  </>
                ) : (
                  <>
                    <Maximize2 size={13} /> Full Page View
                  </>
                )}
              </button>
            </div>
          </DialogHeader>

          {/* Scrollable Form Body */}
          <form
            onSubmit={handleSubmit}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            {/* Top Section — 2 Columns (Color Selection | Color Images) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
              }}
            >
              {/* Left Column: Color */}
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "16px 18px",
                  background: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Tag size={16} style={{ color: "#2563eb" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                      1. Color Details <span style={{ color: "#dc2626" }}>*</span>
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 4, background: "#f1f5f9", padding: 2, borderRadius: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setColorMode("preset");
                        if (!colorName) setColorName("Black");
                        rebuildRows(selectedSizes, colorName || "Black");
                      }}
                      style={{
                        padding: "3px 10px",
                        fontSize: 11.5,
                        fontWeight: 600,
                        borderRadius: 4,
                        border: 0,
                        cursor: "pointer",
                        background: colorMode === "preset" ? "#ffffff" : "transparent",
                        color: colorMode === "preset" ? "#1e293b" : "#64748b",
                        boxShadow: colorMode === "preset" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                      }}
                    >
                      Presets
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setColorMode("custom");
                        rebuildRows(selectedSizes, customColor);
                      }}
                      style={{
                        padding: "3px 10px",
                        fontSize: 11.5,
                        fontWeight: 600,
                        borderRadius: 4,
                        border: 0,
                        cursor: "pointer",
                        background: colorMode === "custom" ? "#ffffff" : "transparent",
                        color: colorMode === "custom" ? "#1e293b" : "#64748b",
                        boxShadow: colorMode === "custom" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                      }}
                    >
                      + Custom Color
                    </button>
                  </div>
                </div>

                {colorMode === "preset" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                      Choose Standard Color
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <select
                          value={colorName}
                          onChange={(e) => {
                            if (e.target.value === "__custom__") {
                              setColorMode("custom");
                            } else {
                              handleColorSelect(e.target.value);
                            }
                          }}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#0f172a",
                            background: "#ffffff",
                            outline: "none",
                            cursor: "pointer",
                          }}
                        >
                          {PRESET_COLORS.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                          <option value="__custom__">+ Custom Color…</option>
                        </select>
                      </div>

                      {/* Swatch & Color Picker */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          background: "#f8fafc",
                          padding: "4px 8px",
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                        }}
                        title="Selected color swatch"
                      >
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            background: colorHex,
                            border: "1px solid rgba(0,0,0,0.15)",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                          }}
                        />
                        <input
                          type="color"
                          value={colorHex}
                          onChange={(e) => setColorHex(e.target.value)}
                          style={{
                            width: 24,
                            height: 24,
                            padding: 0,
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                          }}
                          title="Click to adjust hex code"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                      Custom Color Name <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sage Green, Emerald, Burgundy"
                        value={customColor}
                        onChange={(e) => handleCustomColorChange(e.target.value)}
                        autoFocus
                        style={{
                          flex: 1,
                          padding: "9px 12px",
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#0f172a",
                          outline: "none",
                        }}
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          background: "#f8fafc",
                          padding: "4px 8px",
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <input
                          type="color"
                          value={colorHex}
                          onChange={(e) => setColorHex(e.target.value)}
                          style={{
                            width: 26,
                            height: 26,
                            padding: 0,
                            borderRadius: 4,
                            border: "1px solid rgba(0,0,0,0.1)",
                            cursor: "pointer",
                          }}
                          title="Pick custom color swatch"
                        />
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b" }}>{colorHex}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Duplicate Color Warning */}
                {isDuplicateColor && (
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: 6,
                      padding: "8px 12px",
                      fontSize: 12,
                      color: "#b91c1c",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    ⚠️ "{effectiveColorName}" has already been added to this product.
                  </div>
                )}
              </div>

              {/* Right Column: Color Images */}
              <div
                style={{
                  border: isDraggingFile ? "2px dashed #2563eb" : "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "16px 18px",
                  background: isDraggingFile ? "#eff6ff" : "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  transition: "all 0.15s ease",
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  uploadFiles(e.dataTransfer.files);
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <ImagePlus size={16} style={{ color: "#2563eb" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                      2. Color Images ({colorImages.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addFilesInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 12px",
                      borderRadius: 6,
                      background: "#2563eb",
                      color: "#ffffff",
                      fontSize: 11.5,
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={14} /> + Add Images
                  </button>
                </div>

                {uploadProgress && (
                  <div style={{ fontSize: 11.5, color: "#2563eb", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <LoaderCircle size={14} className="animate-spin" /> {uploadProgress}
                  </div>
                )}

                {/* Gallery Dropzone or Thumbnail Grid */}
                {colorImages.length === 0 ? (
                  <div
                    onClick={() => addFilesInputRef.current?.click()}
                    style={{
                      border: "1.5px dashed #cbd5e1",
                      borderRadius: 8,
                      padding: "20px 14px",
                      textAlign: "center",
                      cursor: "pointer",
                      background: "#f8fafc",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      minHeight: 110,
                    }}
                  >
                    <Upload size={22} style={{ color: "#64748b" }} />
                    <b style={{ fontSize: 12.5, color: "#1e293b" }}>
                      Drop images here or click + Add Images
                    </b>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      JPG, PNG, WebP up to 3MB
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))",
                      gap: 10,
                      maxHeight: 130,
                      overflowY: "auto",
                      padding: 2,
                    }}
                  >
                    {colorImages.map((val, idx) => {
                      const isMain = val === mainImage || (!mainImage && idx === 0);
                      const isHovered = hoveredImgIdx === idx;
                      const isDragged = draggedImgIdx === idx;
                      const isDragOver = dragOverImgIdx === idx;

                      return (
                        <div
                          key={val + idx}
                          draggable
                          onDragStart={() => setDraggedImgIdx(idx)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverImgIdx(idx);
                          }}
                          onDragEnd={() => {
                            setDraggedImgIdx(null);
                            setDragOverImgIdx(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedImgIdx !== null) {
                              reorderImages(draggedImgIdx, idx);
                            }
                            setDraggedImgIdx(null);
                            setDragOverImgIdx(null);
                          }}
                          onMouseEnter={() => setHoveredImgIdx(idx)}
                          onMouseLeave={() => setHoveredImgIdx(null)}
                          style={{
                            position: "relative",
                            aspectRatio: "1 / 1",
                            borderRadius: 8,
                            border: isDragOver
                              ? "2px solid #2563eb"
                              : isMain
                              ? "2px solid #2563eb"
                              : "1px solid #cbd5e1",
                            overflow: "hidden",
                            background: "#ffffff",
                            opacity: isDragged ? 0.4 : 1,
                            cursor: "grab",
                            boxShadow: isMain ? "0 0 0 2px rgba(37,99,235,0.2)" : "none",
                          }}
                        >
                          <img
                            src={imageUrl(val)}
                            alt={`Photo ${idx + 1}`}
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          />

                          {/* MAIN Badge */}
                          {isMain && (
                            <span
                              style={{
                                position: "absolute",
                                top: 3,
                                left: 3,
                                background: "#2563eb",
                                color: "#ffffff",
                                fontSize: 8.5,
                                fontWeight: 800,
                                padding: "1px 5px",
                                borderRadius: 3,
                                zIndex: 10,
                                letterSpacing: "0.5px",
                              }}
                            >
                              MAIN
                            </span>
                          )}

                          {/* Drag handle icon */}
                          <div
                            style={{
                              position: "absolute",
                              bottom: 2,
                              right: 2,
                              color: "#64748b",
                              background: "rgba(255,255,255,0.85)",
                              borderRadius: 3,
                              padding: 1,
                              display: isHovered ? "none" : "flex",
                            }}
                          >
                            <GripVertical size={11} />
                          </div>

                          {/* Hover Action Overlay */}
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: "rgba(15, 23, 42, 0.78)",
                              opacity: isHovered ? 1 : 0,
                              transition: "opacity 0.12s ease",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 4,
                              pointerEvents: isHovered ? "auto" : "none",
                              zIndex: 15,
                              padding: 4,
                            }}
                          >
                            {!isMain && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMainImage(val);
                                  toast.success("Set as main image for this color");
                                }}
                                style={{
                                  background: "#2563eb",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: 4,
                                  padding: "2px 5px",
                                  fontSize: 9,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  width: "100%",
                                  textAlign: "center",
                                }}
                              >
                                Make Main
                              </button>
                            )}

                            <div style={{ display: "flex", gap: 3 }}>
                              <button
                                type="button"
                                onClick={() => setPreviewImage(val)}
                                style={{
                                  padding: 3,
                                  borderRadius: 4,
                                  background: "#ffffff",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "#0f172a",
                                }}
                                title="Preview"
                              >
                                <Eye size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setReplaceTargetIdx(idx);
                                  replaceFileInputRef.current?.click();
                                }}
                                style={{
                                  padding: 3,
                                  borderRadius: 4,
                                  background: "#ffffff",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "#0f172a",
                                }}
                                title="Replace image"
                              >
                                <RefreshCw size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteImage(idx)}
                                style={{
                                  padding: 3,
                                  borderRadius: 4,
                                  background: "#fee2e2",
                                  color: "#dc2626",
                                  border: "none",
                                  cursor: "pointer",
                                }}
                                title="Delete image"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add More button */}
                    <div
                      onClick={() => addFilesInputRef.current?.click()}
                      style={{
                        aspectRatio: "1 / 1",
                        borderRadius: 8,
                        border: "1.5px dashed #cbd5e1",
                        background: "#f8fafc",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 2,
                        cursor: "pointer",
                        color: "#475569",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      <Plus size={14} /> More
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hidden File Inputs */}
            <input
              ref={addFilesInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              multiple
              hidden
              disabled={uploading}
              onChange={(e) => {
                uploadFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
            <input
              ref={replaceFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              hidden
              disabled={uploading}
              onChange={(e) => {
                handleReplaceFile(e.target.files);
                e.currentTarget.value = "";
              }}
            />

            {/* Section 2: Visual Size Selector */}
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "16px 18px",
                background: "#ffffff",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <SizeVariantField
                label="3. Available Sizes for this Color"
                selectedSizes={selectedSizes}
                onChange={(newSizes) => {
                  setSelectedSizes(newSizes);
                  rebuildRows(newSizes, effectiveColorName);
                }}
              />
            </div>

            {/* Section 3: Inventory Table with Bulk Controls */}
            {sizeRows.length > 0 && (
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "16px 18px",
                  background: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <b style={{ fontSize: 13.5, color: "#0f172a" }}>
                    Inventory for {effectiveColorName || "this Color"} ({sizeRows.length} {sizeRows.length === 1 ? "size" : "sizes"})
                  </b>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Total Stock: <strong style={{ color: totalStockForColor > 0 ? "#16a34a" : "#dc2626" }}>{totalStockForColor}</strong> units
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setAllRowsStatus(bulkStatus === "Active" ? "Draft" : "Active")}
                        aria-pressed={bulkStatus === "Active"}
                        aria-label={`Set color ${bulkStatus === "Active" ? "inactive" : "active"}`}
                        style={statusSwitchStyle(bulkStatus === "Active")}
                      >
                        <span style={statusKnobStyle(bulkStatus === "Active")} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bulk Controls Toolbar */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    ⚡ Bulk Actions:
                  </span>

                  {/* Bulk Stock */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, color: "#334155" }}>Stock for all:</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={bulkStockVal}
                      onChange={(e) => setBulkStockVal(e.target.value)}
                      style={{ width: 64, padding: "4px 8px", fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1" }}
                    />
                    <button
                      type="button"
                      onClick={applyBulkStock}
                      style={{
                        padding: "4px 8px",
                        fontSize: 11.5,
                        fontWeight: 600,
                        borderRadius: 6,
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        color: "#2563eb",
                        cursor: "pointer",
                      }}
                    >
                      Apply
                    </button>
                  </div>

                  {/* Bulk Price */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, color: "#334155" }}>Price:</span>
                    <select
                      value={bulkPriceMode}
                      onChange={(e) => setBulkPriceMode(e.target.value as any)}
                      style={{ padding: "4px 8px", fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", background: "#ffffff" }}
                    >
                      <option value="inherit">Use product price ({money(product?.price || 0)})</option>
                      <option value="override">Override Price</option>
                    </select>
                    {bulkPriceMode === "override" && (
                      <input
                        type="number"
                        min="1"
                        placeholder="Rs."
                        value={bulkPriceVal}
                        onChange={(e) => setBulkPriceVal(e.target.value)}
                        style={{ width: 80, padding: "4px 8px", fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1" }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={applyBulkPrice}
                      style={{
                        padding: "4px 8px",
                        fontSize: 11.5,
                        fontWeight: 600,
                        borderRadius: 6,
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        color: "#2563eb",
                        cursor: "pointer",
                      }}
                    >
                      Apply
                    </button>
                  </div>

                  {/* Bulk Status */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setAllRowsStatus(bulkStatus === "Active" ? "Draft" : "Active")}
                      aria-pressed={bulkStatus === "Active"}
                      aria-label={`Set all sizes ${bulkStatus === "Active" ? "inactive" : "active"}`}
                      style={statusSwitchStyle(bulkStatus === "Active", true)}
                    >
                      <span style={statusKnobStyle(bulkStatus === "Active", true)} />
                    </button>
                  </div>
                </div>

                {/* Editable Table */}
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflowX: "auto", background: "#ffffff" }}>
                  <table style={{ width: "100%", minWidth: 840, borderCollapse: "collapse", textAlign: "left", fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: 700 }}>
                        <th style={{ padding: "10px 14px", width: 70 }}>Size</th>
                        <th style={{ padding: "10px 14px", minWidth: 300 }}>SKU</th>
                        <th style={{ padding: "10px 14px", width: 100 }}>Stock</th>
                        <th style={{ padding: "10px 14px", minWidth: 280 }}>Price</th>
                        <th style={{ padding: "10px 14px", width: 110 }}>Status</th>
                        <th style={{ padding: "10px 14px", width: 44, textAlign: "center" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sizeRows.map((row, idx) => (
                        <tr key={row.size} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          {/* Size */}
                          <td style={{ padding: "10px 14px" }}>
                            <strong style={{ fontSize: 13, color: "#0f172a", fontWeight: 800 }}>{row.size}</strong>
                          </td>

                          {/* SKU */}
                          <td style={{ padding: "10px 14px" }}>
                            <input
                              type="text"
                              value={row.sku}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSizeRows((curr) => {
                                  const next = [...curr];
                                  next[idx] = { ...next[idx], sku: val };
                                  return next;
                                });
                              }}
                              placeholder="e.g. SNK-BLK-40"
                              style={{
                                width: "100%",
                                padding: "7px 12px",
                                borderRadius: 6,
                                border: "1px solid #cbd5e1",
                                fontSize: 12,
                                fontFamily: "monospace",
                                fontWeight: 600,
                                background: "#ffffff",
                                boxSizing: "border-box",
                              }}
                            />
                          </td>

                          {/* Stock */}
                          <td style={{ padding: "10px 14px" }}>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={row.stock}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setSizeRows((curr) => {
                                  const next = [...curr];
                                  next[idx] = { ...next[idx], stock: Math.max(0, val) };
                                  return next;
                                });
                              }}
                              placeholder="0"
                              style={{
                                width: "100%",
                                padding: "7px 10px",
                                borderRadius: 6,
                                border: "1px solid #cbd5e1",
                                fontSize: 13,
                                fontWeight: 700,
                                color: row.stock > 0 ? "#16a34a" : "#dc2626",
                                textAlign: "center",
                                background: "#ffffff",
                                boxSizing: "border-box",
                              }}
                            />
                          </td>

                          {/* Price */}
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <select
                                value={row.priceMode}
                                onChange={(e) => {
                                  const mode = e.target.value as "inherit" | "override";
                                  setSizeRows((curr) => {
                                    const next = [...curr];
                                    next[idx] = {
                                      ...next[idx],
                                      priceMode: mode,
                                      priceOverride: mode === "override" ? (row.priceOverride || product?.price) : undefined,
                                    };
                                    return next;
                                  });
                                }}
                                style={{
                                  padding: "7px 10px",
                                  borderRadius: 6,
                                  border: "1px solid #cbd5e1",
                                  fontSize: 12,
                                  fontWeight: 500,
                                  background: "#ffffff",
                                  flex: 1,
                                  minWidth: 220,
                                }}
                              >
                                <option value="inherit">Use product price ({money(product?.price || 0)})</option>
                                <option value="override">Override Price</option>
                              </select>

                              {row.priceMode === "override" && (
                                <input
                                  type="number"
                                  min="1"
                                  value={row.priceOverride ?? ""}
                                  placeholder={String(product?.price || 0)}
                                  onChange={(e) => {
                                    const val = e.target.value ? Number(e.target.value) : undefined;
                                    setSizeRows((curr) => {
                                      const next = [...curr];
                                      next[idx] = { ...next[idx], priceOverride: val };
                                      return next;
                                    });
                                  }}
                                  style={{
                                    width: 85,
                                    padding: "7px 8px",
                                    borderRadius: 6,
                                    border: "1px solid #cbd5e1",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    background: "#ffffff",
                                  }}
                                />
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextStatus = row.status === "Active" ? "Draft" : "Active";
                                  setSizeRows((curr) => {
                                    const next = [...curr];
                                    next[idx] = { ...next[idx], status: nextStatus };
                                    return next;
                                  });
                                }}
                                aria-pressed={row.status === "Active"}
                                aria-label={`Set size ${row.size} ${row.status === "Active" ? "inactive" : "active"}`}
                                style={statusSwitchStyle(row.status === "Active", true)}
                              >
                                <span style={statusKnobStyle(row.status === "Active", true)} />
                              </button>
                            </div>
                          </td>

                          {/* Action */}
                          <td style={{ padding: "10px 14px", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleToggleSize(row.size)}
                              style={{
                                border: "none",
                                background: "none",
                                color: "#94a3b8",
                                cursor: "pointer",
                                padding: 2,
                              }}
                              title="Remove size"
                            >
                              <X size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sticky Footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 24px",
                borderTop: "1px solid #e2e8f0",
                background: "#f8fafc",
                position: "sticky",
                bottom: -20,
                margin: "8px -24px -20px -24px",
                flexShrink: 0,
                zIndex: 20,
              }}
            >
              <div style={{ fontSize: 12.5, color: "#64748b" }}>
                Color: <strong style={{ color: "#0f172a" }}>{effectiveColorName || "None"}</strong> ·{" "}
                <span>{sizeRows.length} size(s)</span> · Total Stock:{" "}
                <strong style={{ color: totalStockForColor > 0 ? "#16a34a" : "#dc2626" }}>{totalStockForColor}</strong>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  disabled={busy || savingState}
                  onClick={() => onOpenChange(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#334155",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={busy || uploading || savingState || isDuplicateColor || sizeRows.length === 0}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 20px",
                    borderRadius: 8,
                    background: isDuplicateColor || sizeRows.length === 0 ? "#94a3b8" : "#2563eb",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 700,
                    border: "none",
                    cursor: isDuplicateColor || sizeRows.length === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  {busy || savingState ? (
                    <>
                      <LoaderCircle size={15} className="animate-spin" /> Adding Color…
                    </>
                  ) : (
                    <>
                      <Plus size={16} /> Add Color
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Enlarged Image Preview Lightbox */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent
          className="admin-dialog"
          style={{
            maxWidth: 600,
            padding: 16,
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: 14,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {previewImage && (
            <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}>
              <img
                src={imageUrl(previewImage)}
                alt="Enlarged Preview"
                style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain", borderRadius: 8 }}
              />
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  background: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "50%",
                  width: 28,
                  height: 28,
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={15} />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
