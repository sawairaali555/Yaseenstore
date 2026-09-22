"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Trash2,
  Check,
  Layers,
  Grid,
  Zap,
  Minus,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import type { ManagedProduct } from "@/lib/store-data";
import type { ProductVariant } from "@/app/catalog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ManagedProduct | null;
  targetColor: string | null;
  onSave: (updatedProduct: ManagedProduct) => Promise<boolean | void>;
}

export default function InventoryModal({
  open,
  onOpenChange,
  product,
  targetColor,
  onSave,
}: Props) {
  const [activeTab, setActiveTab] = useState<"matrix" | "variant" | "bulk">("matrix");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedColorList, setSelectedColorList] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Local editable state of variants & color galleries
  const [localVariants, setLocalVariants] = useState<ProductVariant[]>([]);
  const [localColorGalleries, setLocalColorGalleries] = useState<
    Record<string, { mainImage?: string; images: string[] }>
  >({});

  // Bulk Edit state
  const [bulkScope, setBulkScope] = useState<"selected_colors" | "all_colors">("all_colors");
  const [bulkStockAction, setBulkStockAction] = useState<"set" | "add" | "subtract" | "none">("none");
  const [bulkStockValue, setBulkStockValue] = useState<string>("");
  const [bulkPriceValue, setBulkPriceValue] = useState<string>("");
  const [bulkSalePriceValue, setBulkSalePriceValue] = useState<string>("");
  const [bulkStatusAction, setBulkStatusAction] = useState<"Active" | "Draft" | "none">("none");

  // New size entry state
  const [newSizeInput, setNewSizeInput] = useState("");
  const [newSizeStockInput, setNewSizeStockInput] = useState("10");

  // Sync state when product opens or changes
  useEffect(() => {
    if (product) {
      const vars = product.variants ? JSON.parse(JSON.stringify(product.variants)) : [];
      setLocalVariants(vars);
      setLocalColorGalleries(
        product.colorGalleries ? JSON.parse(JSON.stringify(product.colorGalleries)) : {}
      );

      const colorsSet = new Set<string>();
      vars.forEach((v: ProductVariant) => {
        if (v.color) colorsSet.add(v.color);
      });
      const colorsArr = Array.from(colorsSet);

      if (targetColor && colorsArr.includes(targetColor)) {
        setSelectedColor(targetColor);
        setSelectedColorList([targetColor]);
      } else if (colorsArr.length > 0) {
        setSelectedColor(colorsArr[0]);
        setSelectedColorList([colorsArr[0]]);
      } else {
        setSelectedColor("Standard");
        setSelectedColorList(["Standard"]);
      }
    }
  }, [product, targetColor, open]);

  // Derived list of all distinct color groups
  const colorGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        color: string;
        sku: string;
        colorHex?: string;
        image: string;
        totalStock: number;
        variantCount: number;
        status: "Active" | "Draft";
        price: number;
        oldPrice?: number;
        offerDates?: string;
        variants: ProductVariant[];
      }
    >();

    localVariants.forEach((v) => {
      const c = v.color || "Standard";
      if (!map.has(c)) {
        map.set(c, {
          color: c,
          sku: v.sku ? v.sku.split("-").slice(0, 2).join("-") : `${product?.sku || "OPT"}-${c.toUpperCase().slice(0, 3)}`,
          colorHex: v.colorHex,
          image: v.image || localColorGalleries[c]?.mainImage || product?.image || "",
          totalStock: 0,
          variantCount: 0,
          status: "Active",
          price: v.price ?? product?.price ?? 0,
          oldPrice: v.oldPrice ?? product?.old ?? undefined,
          offerDates: "06 Mar 2026 — 29 Oct 2026",
          variants: [],
        });
      }
      const group = map.get(c)!;
      group.variants.push(v);
      group.totalStock += Number(v.stock || 0);
      group.variantCount += 1;
    });

    map.forEach((group) => {
      const hasActive = group.variants.some((v) => v.status !== "Draft");
      group.status = hasActive ? "Active" : "Draft";
    });

    return Array.from(map.values());
  }, [localVariants, localColorGalleries, product]);

  // Filtered color groups
  const filteredColorGroups = useMemo(() => {
    if (!searchQuery.trim()) return colorGroups;
    const q = searchQuery.toLowerCase().trim();
    return colorGroups.filter(
      (cg) =>
        cg.color.toLowerCase().includes(q) ||
        cg.sku.toLowerCase().includes(q) ||
        cg.variants.some((v) => (v.sku || "").toLowerCase().includes(q) || (v.size || "").toLowerCase().includes(q))
    );
  }, [colorGroups, searchQuery]);

  // Distinct sorted sizes
  const allSizes = useMemo(() => {
    const sizesSet = new Set<string>();
    localVariants.forEach((v) => {
      if (v.size) sizesSet.add(v.size);
    });
    if (sizesSet.size === 0 && product?.sizes) {
      product.sizes.forEach((s) => sizesSet.add(s));
    }
    const arr = Array.from(sizesSet);

    const orderMap: Record<string, number> = {
      XS: 1,
      S: 2,
      M: 3,
      L: 4,
      XL: 5,
      "2XL": 6,
      "3XL": 7,
      Standard: 0,
    };
    arr.sort((a, b) => {
      if (orderMap[a] !== undefined && orderMap[b] !== undefined) {
        return orderMap[a] - orderMap[b];
      }
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });

    return arr.length > 0 ? arr : ["34", "35", "36", "37", "38", "39"];
  }, [localVariants, product]);

  // Total product stock
  const totalProductStock = useMemo(() => {
    return localVariants.reduce((sum, v) => sum + (v.status !== "Draft" ? Number(v.stock || 0) : 0), 0);
  }, [localVariants]);

  // Update a single variant
  const updateVariant = (variantId: string, updates: Partial<ProductVariant>) => {
    setLocalVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, ...updates } : v))
    );
  };

  // Update cell stock in matrix
  const updateCellStock = (color: string, size: string, newStock: number) => {
    const safeStock = Math.max(0, newStock);
    setLocalVariants((prev) => {
      const existingIdx = prev.findIndex(
        (v) => (v.color || "Standard").toLowerCase() === color.toLowerCase() && (v.size || "Standard") === size
      );

      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], stock: safeStock };
        return next;
      } else {
        const newV: ProductVariant = {
          id: `${product?.id || "prod"}-${color.toLowerCase().replace(/\s+/g, "-")}-${size.toLowerCase()}`,
          color,
          size,
          stock: safeStock,
          sku: `${product?.sku || "SKU"}-${color.toUpperCase().slice(0, 3)}-${size.toUpperCase()}`,
          price: product?.price || 0,
          oldPrice: product?.old || undefined,
          status: "Active",
        };
        return [...prev, newV];
      }
    });
  };

  // Toggle color group status
  const toggleColorStatus = (colorName: string, newStatus: "Active" | "Draft") => {
    setLocalVariants((prev) =>
      prev.map((v) =>
        (v.color || "Standard").toLowerCase() === colorName.toLowerCase()
          ? { ...v, status: newStatus }
          : v
      )
    );
  };

  // Add new size to active color
  const handleAddSizeToColor = () => {
    if (!newSizeInput.trim() || !selectedColor) return;
    const sizeName = newSizeInput.trim();
    const stockVal = Math.max(0, parseInt(newSizeStockInput) || 0);

    const exists = localVariants.some(
      (v) =>
        (v.color || "Standard").toLowerCase() === selectedColor.toLowerCase() &&
        (v.size || "Standard").toLowerCase() === sizeName.toLowerCase()
    );

    if (exists) {
      alert(`Size "${sizeName}" already exists for ${selectedColor}.`);
      return;
    }

    const newV: ProductVariant = {
      id: `${product?.id || "prod"}-${selectedColor.toLowerCase().replace(/\s+/g, "-")}-${sizeName.toLowerCase()}`,
      color: selectedColor,
      size: sizeName,
      stock: stockVal,
      sku: `${product?.sku || "SKU"}-${selectedColor.toUpperCase().slice(0, 3)}-${sizeName.toUpperCase()}`,
      price: product?.price || 0,
      oldPrice: product?.old || undefined,
      status: "Active",
    };

    setLocalVariants((prev) => [...prev, newV]);
    setNewSizeInput("");
  };

  // Apply Bulk Edit
  const applyBulkEdit = () => {
    const targetColors =
      bulkScope === "selected_colors" ? selectedColorList : colorGroups.map((cg) => cg.color);

    setLocalVariants((prev) =>
      prev.map((v) => {
        const vColor = v.color || "Standard";
        if (!targetColors.includes(vColor)) return v;

        let nextStock = v.stock;
        if (bulkStockAction === "set" && bulkStockValue !== "") {
          nextStock = Math.max(0, parseInt(bulkStockValue) || 0);
        } else if (bulkStockAction === "add" && bulkStockValue !== "") {
          nextStock = Math.max(0, (v.stock || 0) + (parseInt(bulkStockValue) || 0));
        } else if (bulkStockAction === "subtract" && bulkStockValue !== "") {
          nextStock = Math.max(0, (v.stock || 0) - (parseInt(bulkStockValue) || 0));
        }

        let nextPrice = v.price;
        if (bulkPriceValue !== "") {
          nextPrice = Math.max(0, parseFloat(bulkPriceValue) || 0);
        }

        let nextSalePrice = v.oldPrice;
        if (bulkSalePriceValue !== "") {
          nextSalePrice = Math.max(0, parseFloat(bulkSalePriceValue) || 0);
        }

        let nextStatus = v.status;
        if (bulkStatusAction !== "none") {
          nextStatus = bulkStatusAction;
        }

        return {
          ...v,
          stock: nextStock,
          price: nextPrice,
          oldPrice: nextSalePrice,
          status: nextStatus,
        };
      })
    );

    setActiveTab("matrix");
  };

  // Save changes to backend
  const handleSaveAll = async () => {
    if (!product) return;
    setBusy(true);

    const updatedProduct: ManagedProduct = {
      ...product,
      variants: localVariants,
      stock: totalProductStock,
      colorGalleries: localColorGalleries,
    };

    const res = await onSave(updatedProduct);
    setBusy(false);
    if (res !== false) {
      onOpenChange(false);
    }
  };

  const activeColorGroup = colorGroups.find(
    (cg) => cg.color.toLowerCase() === selectedColor.toLowerCase()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          maxWidth: 1100,
          width: "95vw",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          background: "#fff",
        }}
      >
        {/* Workspace Top Header Bar */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #edf2f7",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2d3748", margin: 0 }}>
              Products — Variant & Inventory Matrix
            </h2>
            <span style={{ fontSize: 12, color: "#718096" }}>
              ({colorGroups.length} Option Colors • Total Stock: <b style={{ color: "#2b6cb0" }}>{totalProductStock} units</b>)
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#edf2f7",
              padding: 4,
              borderRadius: 10,
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("matrix")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 7,
                border: "none",
                background: activeTab === "matrix" ? "#fff" : "transparent",
                color: activeTab === "matrix" ? "#2b6cb0" : "#4a5568",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: activeTab === "matrix" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <Grid size={14} />
              Matrix View
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("variant")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 7,
                border: "none",
                background: activeTab === "variant" ? "#fff" : "transparent",
                color: activeTab === "variant" ? "#2b6cb0" : "#4a5568",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: activeTab === "variant" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <Layers size={14} />
              Variant View
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bulk")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 7,
                border: "none",
                background: activeTab === "bulk" ? "#fff" : "transparent",
                color: activeTab === "bulk" ? "#2b6cb0" : "#4a5568",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: activeTab === "bulk" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <Zap size={14} style={{ color: "#d69e2e" }} />
              Bulk Edit
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", background: "#fff" }}>
          {/* MATRIX VIEW (Matching Reference Image) */}
          {activeTab === "matrix" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                    color: "#4a5568",
                  }}
                >
                  <thead>
                    {/* Header Row: Option & Color Cards */}
                    <tr style={{ background: "#f0f4f9" }}>
                      <th
                        style={{
                          padding: "16px 20px",
                          textAlign: "left",
                          fontWeight: 600,
                          color: "#4a5568",
                          fontSize: 13,
                          width: 120,
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        Option
                      </th>

                      {colorGroups.map((cg) => (
                        <th
                          key={cg.color}
                          style={{
                            padding: "16px 16px",
                            textAlign: "center",
                            borderBottom: "1px solid #e2e8f0",
                            minWidth: 140,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {/* Square Thumbnail Image Box */}
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 8,
                                border: "2px solid #2563eb",
                                padding: 2,
                                background: "#fff",
                                display: "grid",
                                placeItems: "center",
                                overflow: "hidden",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                              }}
                            >
                              <img
                                src={cg.image || product?.image}
                                alt={cg.color}
                                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4 }}
                              />
                            </div>

                            {/* SKU / Option Code */}
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#2d3748", fontFamily: "sans-serif" }}>
                              {cg.sku}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {/* Size Rows */}
                    {allSizes.map((sz) => (
                      <tr key={sz} style={{ borderBottom: "1px solid #edf2f7" }}>
                        <td
                          style={{
                            padding: "14px 20px",
                            fontWeight: 600,
                            color: "#4a5568",
                            fontSize: 13,
                          }}
                        >
                          {sz}
                        </td>

                        {colorGroups.map((cg) => {
                          const matchedVariant = localVariants.find(
                            (v) =>
                              (v.color || "Standard").toLowerCase() === cg.color.toLowerCase() &&
                              (v.size || "Standard").toLowerCase() === sz.toLowerCase()
                          );

                          const stockVal = matchedVariant ? Number(matchedVariant.stock || 0) : 0;
                          const hasEntry = Boolean(matchedVariant);

                          return (
                            <td
                              key={`${cg.color}-${sz}`}
                              style={{
                                padding: "12px 16px",
                                textAlign: "center",
                              }}
                            >
                              {hasEntry ? (
                                <input
                                  type="number"
                                  min="0"
                                  value={stockVal}
                                  onChange={(e) => updateCellStock(cg.color, sz, parseInt(e.target.value) || 0)}
                                  style={{
                                    width: 54,
                                    padding: "4px 6px",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: 6,
                                    textAlign: "center",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: stockVal > 0 ? "#2b6cb0" : "#a0aec0",
                                    outline: "none",
                                  }}
                                />
                              ) : (
                                <span style={{ color: "#a0aec0", fontWeight: 600 }}>-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Total Stock Row */}
                    <tr style={{ borderBottom: "1px solid #edf2f7" }}>
                      <td
                        style={{
                          padding: "16px 20px",
                          fontWeight: 700,
                          color: "#2d3748",
                          fontSize: 14,
                        }}
                      >
                        Total
                      </td>

                      {colorGroups.map((cg) => (
                        <td
                          key={`total-${cg.color}`}
                          style={{
                            padding: "16px 16px",
                            textAlign: "center",
                            fontWeight: 800,
                            fontSize: 14,
                            color: "#2d3748",
                          }}
                        >
                          {cg.totalStock}
                        </td>
                      ))}
                    </tr>

                    {/* Action Dropdown Row */}
                    <tr style={{ borderBottom: "1px solid #edf2f7" }}>
                      <td
                        style={{
                          padding: "16px 20px",
                          fontWeight: 600,
                          color: "#4a5568",
                          fontSize: 13,
                        }}
                      >
                        Action
                      </td>

                      {colorGroups.map((cg) => (
                        <td
                          key={`action-${cg.color}`}
                          style={{
                            padding: "12px 16px",
                            textAlign: "center",
                          }}
                        >
                          <select
                            value={cg.status}
                            onChange={(e) => toggleColorStatus(cg.color, e.target.value as any)}
                            style={{
                              padding: "6px 12px",
                              border: "1px solid #e2e8f0",
                              borderRadius: 8,
                              background: "#fff",
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: cg.status === "Active" ? "#2b6cb0" : "#a0aec0",
                              cursor: "pointer",
                              outline: "none",
                            }}
                          >
                            <option value="Active">Enable</option>
                            <option value="Draft">Disable</option>
                          </select>
                        </td>
                      ))}
                    </tr>

                    {/* Price & Offer Validity Banner Cards Row */}
                    <tr>
                      <td style={{ padding: "16px 20px" }}></td>
                      {colorGroups.map((cg) => (
                        <td key={`price-${cg.color}`} style={{ padding: "16px 8px", verticalAlign: "top" }}>
                          <div
                            style={{
                              background: "#fff",
                              border: "1px solid #e2e8f0",
                              borderRadius: 10,
                              padding: "10px 12px",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 4,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                              {cg.oldPrice && cg.oldPrice > cg.price && (
                                <span style={{ fontSize: 11, color: "#a0aec0", textDecoration: "line-through", fontWeight: 600 }}>
                                  {cg.oldPrice.toFixed(2)} PKR
                                </span>
                              )}
                              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#2d3748" }}>
                                {cg.price.toFixed(2)} PKR
                              </span>
                            </div>
                            <span style={{ fontSize: 10, color: "#718096", fontWeight: 500 }}>
                              {cg.offerDates}
                            </span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VARIANT VIEW */}
          {activeTab === "variant" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Color Selector Bar */}
              <div style={{ background: "#fff", border: "1px solid #edf2f7", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#2d3748" }}>
                    Select Color Variant ({colorGroups.length})
                  </span>
                  <div style={{ position: "relative", width: 220 }}>
                    <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#a0aec0" }} />
                    <input
                      type="text"
                      placeholder="Search option…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: "100%", padding: "5px 10px 5px 28px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                  {filteredColorGroups.map((cg) => {
                    const isSelected = selectedColor.toLowerCase() === cg.color.toLowerCase();
                    return (
                      <div
                        key={cg.color}
                        onClick={() => setSelectedColor(cg.color)}
                        style={{
                          minWidth: 150,
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                          background: isSelected ? "#eff6ff" : "#fff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <img src={cg.image || product?.image} alt={cg.color} style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover" }} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#2d3748" }}>{cg.color}</div>
                          <div style={{ fontSize: 11, color: "#718096" }}>{cg.totalStock} units</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Size Table for Selected Color */}
              {activeColorGroup && (
                <div style={{ background: "#fff", border: "1px solid #edf2f7", borderRadius: 12, padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#2d3748", margin: 0 }}>
                      Sizes for {activeColorGroup.color}
                    </h3>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Size (e.g. 38)"
                        value={newSizeInput}
                        onChange={(e) => setNewSizeInput(e.target.value)}
                        style={{ width: 110, padding: "5px 8px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12 }}
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Stock"
                        value={newSizeStockInput}
                        onChange={(e) => setNewSizeStockInput(e.target.value)}
                        style={{ width: 65, padding: "5px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12, textAlign: "center" }}
                      />
                      <button
                        type="button"
                        onClick={handleAddSizeToColor}
                        disabled={!newSizeInput.trim()}
                        style={{
                          padding: "5px 12px",
                          border: "none",
                          borderRadius: 6,
                          background: "#16a34a",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f7fafc", borderBottom: "1px solid #edf2f7" }}>
                        <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#718096" }}>Size</th>
                        <th style={{ padding: "8px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#718096", width: 140 }}>Stock</th>
                        <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#718096" }}>SKU</th>
                        <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#718096", width: 120 }}>Price (PKR)</th>
                        <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#718096", width: 120 }}>Sale Price</th>
                        <th style={{ padding: "8px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#718096", width: 100 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeColorGroup.variants.map((v) => (
                        <tr key={v.id} style={{ borderBottom: "1px solid #edf2f7" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 700 }}>{v.size || "Standard"}</td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <input
                              type="number"
                              min="0"
                              value={v.stock}
                              onChange={(e) => updateVariant(v.id, { stock: Math.max(0, parseInt(e.target.value) || 0) })}
                              style={{ width: 60, padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: 6, textAlign: "center", fontSize: 12, fontWeight: 700 }}
                            />
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <input
                              type="text"
                              value={v.sku || ""}
                              onChange={(e) => updateVariant(v.id, { sku: e.target.value })}
                              style={{ width: "100%", padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12 }}
                            />
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <input
                              type="number"
                              min="0"
                              value={v.price ?? product?.price ?? 0}
                              onChange={(e) => updateVariant(v.id, { price: parseFloat(e.target.value) || 0 })}
                              style={{ width: "100%", padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12 }}
                            />
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <input
                              type="number"
                              min="0"
                              value={v.oldPrice ?? ""}
                              placeholder="Optional"
                              onChange={(e) => updateVariant(v.id, { oldPrice: parseFloat(e.target.value) || undefined })}
                              style={{ width: "100%", padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12 }}
                            />
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => updateVariant(v.id, { status: v.status === "Active" ? "Draft" : "Active" })}
                              style={{
                                border: v.status === "Active" ? "1px solid #bbf7d0" : "1px solid #cbd5e1",
                                background: v.status === "Active" ? "#f0fdf4" : "#f8fafc",
                                color: v.status === "Active" ? "#16a34a" : "#64748b",
                                padding: "2px 8px",
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              {v.status === "Active" ? "Enable" : "Disable"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* BULK EDIT VIEW */}
          {activeTab === "bulk" && (
            <div style={{ background: "#fff", border: "1px solid #edf2f7", borderRadius: 12, padding: 24, maxWidth: 640, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <Zap size={18} style={{ color: "#d69e2e" }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#2d3748", margin: 0 }}>
                  Bulk Inventory Editor
                </h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4a5568", marginBottom: 6 }}>Target Colors:</label>
                  <div style={{ display: "flex", gap: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input type="radio" name="bulkScope" checked={bulkScope === "all_colors"} onChange={() => setBulkScope("all_colors")} />
                      All Colors ({colorGroups.length})
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input type="radio" name="bulkScope" checked={bulkScope === "selected_colors"} onChange={() => setBulkScope("selected_colors")} />
                      Selected Colors ({selectedColorList.length})
                    </label>
                  </div>
                </div>

                <div style={{ background: "#f7fafc", padding: 12, borderRadius: 8, border: "1px solid #edf2f7" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4a5568", marginBottom: 6 }}>Stock Quantity Adjustment:</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 10 }}>
                    <select value={bulkStockAction} onChange={(e) => setBulkStockAction(e.target.value as any)} style={{ padding: "6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12 }}>
                      <option value="none">No stock change</option>
                      <option value="set">Set exact stock value</option>
                      <option value="add">Add (+N)</option>
                      <option value="subtract">Subtract (-N)</option>
                    </select>
                    {bulkStockAction !== "none" && (
                      <input type="number" min="0" placeholder="Qty" value={bulkStockValue} onChange={(e) => setBulkStockValue(e.target.value)} style={{ padding: "6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12, textAlign: "center" }} />
                    )}
                  </div>
                </div>

                <div style={{ background: "#f7fafc", padding: 12, borderRadius: 8, border: "1px solid #edf2f7" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4a5568", marginBottom: 6 }}>Price Update (PKR):</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <input type="number" min="0" placeholder="Regular price" value={bulkPriceValue} onChange={(e) => setBulkPriceValue(e.target.value)} style={{ padding: "6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12 }} />
                    <input type="number" min="0" placeholder="Sale price" value={bulkSalePriceValue} onChange={(e) => setBulkSalePriceValue(e.target.value)} style={{ padding: "6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12 }} />
                  </div>
                </div>

                <div style={{ background: "#f7fafc", padding: 12, borderRadius: 8, border: "1px solid #edf2f7" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#4a5568", marginBottom: 6 }}>Status Update:</label>
                  <select value={bulkStatusAction} onChange={(e) => setBulkStatusAction(e.target.value as any)} style={{ width: "100%", padding: "6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12 }}>
                    <option value="none">No status change</option>
                    <option value="Active">Enable (Active)</option>
                    <option value="Draft">Disable (Draft)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={applyBulkEdit}
                  style={{ padding: "10px 16px", border: "none", borderRadius: 8, background: "#203664", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Sparkles size={15} />
                  Apply Bulk Changes
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #edf2f7",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, color: "#718096" }}>
            Total Product Stock: <b style={{ color: "#2b6cb0" }}>{totalProductStock} units</b>
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              style={{ padding: "8px 18px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={busy}
              style={{ padding: "8px 22px", border: 0, borderRadius: 8, background: "#203664", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: busy ? 0.7 : 1 }}
            >
              {busy ? "Saving…" : "Save Inventory"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
