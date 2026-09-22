"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Check,
  Plus,
  X,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import {
  SIZE_SYSTEMS,
  SizeSystem,
  detectSizeSystem,
  getConflictingSizes,
} from "@/lib/size-systems";
import { toast } from "sonner";

export interface VariantDataCheck {
  stock?: number;
  sku?: string;
  price?: number;
  ordersCount?: number;
}

interface Props {
  open: boolean;
  selectedSizes: string[];
  existingVariantData?: Record<string, VariantDataCheck>;
  onOpenChange: (open: boolean) => void;
  onConfirm: (sizes: string[], systemId: string) => void;
}

export default function SizeSelectorModal({
  open,
  selectedSizes,
  existingVariantData = {},
  onOpenChange,
  onConfirm,
}: Props) {
  // Draft / buffered selections (do NOT commit to product until Confirm is clicked)
  const [draftSizes, setDraftSizes] = useState<string[]>([]);
  const [activeSystemId, setActiveSystemId] = useState<string>("eu");
  const [searchQuery, setSearchQuery] = useState("");
  const [customSizeInput, setCustomSizeInput] = useState("");
  const [customSizesList, setCustomSizesList] = useState<string[]>([]);

  // System switch guard state
  const [pendingSystemSwitch, setPendingSystemSwitch] = useState<string | null>(null);

  // Existing variant removal warning state
  const [sizePendingRemoval, setSizePendingRemoval] = useState<{
    size: string;
    data: VariantDataCheck;
  } | null>(null);

  // Initialize draft when modal opens
  useEffect(() => {
    if (open) {
      setDraftSizes([...selectedSizes]);
      const detected = detectSizeSystem(selectedSizes);
      setActiveSystemId(detected);
      setSearchQuery("");
      setCustomSizeInput("");
      setPendingSystemSwitch(null);
      setSizePendingRemoval(null);

      // Extract any custom sizes not in standard systems
      const allKnownSizes = new Set(SIZE_SYSTEMS.flatMap((s) => s.sizes));
      const customOnes = selectedSizes.filter((s) => !allKnownSizes.has(s));
      setCustomSizesList(customOnes);
    }
  }, [open, selectedSizes]);

  const activeSystem = useMemo(
    () => SIZE_SYSTEMS.find((s) => s.id === activeSystemId) || SIZE_SYSTEMS[0],
    [activeSystemId]
  );

  // Combined available sizes for the active system + any custom sizes
  const availableSizes = useMemo(() => {
    let sizes = [...activeSystem.sizes];
    if (activeSystemId === "other") {
      // Include user-added custom sizes in Other
      for (const cs of customSizesList) {
        if (!sizes.includes(cs)) sizes.push(cs);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      sizes = sizes.filter((s) => s.toLowerCase().includes(q));
    }
    return sizes;
  }, [activeSystem, activeSystemId, customSizesList, searchQuery]);

  // Count selected sizes belonging to each category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sys of SIZE_SYSTEMS) {
      counts[sys.id] = draftSizes.filter((s) => sys.sizes.includes(s)).length;
    }
    return counts;
  }, [draftSizes]);

  // Handle clicking a size system tab
  function handleSelectSystem(targetId: string) {
    if (targetId === activeSystemId) return;

    // Check if user currently has sizes selected from the current system
    const currentSystemSizes = draftSizes.filter((s) => activeSystem.sizes.includes(s));
    const targetSystem = SIZE_SYSTEMS.find((s) => s.id === targetId);

    if (currentSystemSizes.length > 0 && targetSystem) {
      // Check if target system does not contain these sizes
      const conflicting = currentSystemSizes.filter((s) => !targetSystem.sizes.includes(s));
      if (conflicting.length > 0) {
        setPendingSystemSwitch(targetId);
        return;
      }
    }

    setActiveSystemId(targetId);
    setSearchQuery("");
  }

  // Confirm system switch and clear incompatible sizes
  function confirmSystemSwitch(mode: "replace" | "keep_both") {
    if (!pendingSystemSwitch) return;
    const targetId = pendingSystemSwitch;
    const targetSystem = SIZE_SYSTEMS.find((s) => s.id === targetId);

    if (mode === "replace" && targetSystem) {
      // Keep only sizes that exist in the new system (or wipe incompatible ones)
      setDraftSizes((curr) => curr.filter((s) => targetSystem.sizes.includes(s)));
    }
    setActiveSystemId(targetId);
    setPendingSystemSwitch(null);
    setSearchQuery("");
  }

  // Toggle size selection
  function handleToggleSize(size: string) {
    if (draftSizes.includes(size)) {
      // Check if this size has protected existing product data
      const data = existingVariantData[size];
      if (data && ((data.stock !== undefined && data.stock > 0) || (data.ordersCount !== undefined && data.ordersCount > 0))) {
        setSizePendingRemoval({ size, data });
        return;
      }
      setDraftSizes((curr) => curr.filter((s) => s !== size));
    } else {
      setDraftSizes((curr) => [...curr, size]);
    }
  }

  // Confirm removal of protected size
  function confirmRemovalOfProtectedSize() {
    if (!sizePendingRemoval) return;
    setDraftSizes((curr) => curr.filter((s) => s !== sizePendingRemoval.size));
    setSizePendingRemoval(null);
  }

  // Add custom size
  function handleAddCustomSize() {
    const trimmed = customSizeInput.trim();
    if (!trimmed) return;
    if (!customSizesList.includes(trimmed)) {
      setCustomSizesList((curr) => [...curr, trimmed]);
    }
    if (!draftSizes.includes(trimmed)) {
      setDraftSizes((curr) => [...curr, trimmed]);
    }
    setCustomSizeInput("");
    toast.success(`Added "${trimmed}" to sizes`);
  }

  // Quick Select/Deselect all visible sizes in current system
  function handleSelectAllVisible() {
    const next = new Set([...draftSizes, ...availableSizes]);
    setDraftSizes(Array.from(next));
  }

  function handleDeselectAllVisible() {
    const toRemove = new Set(availableSizes);
    setDraftSizes((curr) => curr.filter((s) => !toRemove.has(s)));
  }

  // Confirm and apply changes
  function handleConfirm() {
    onConfirm(draftSizes, activeSystemId);
    onOpenChange(false);
  }

  // Cancel without changes
  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="admin-dialog size-selector-dialog"
          style={{
            maxWidth: 820,
            width: "95vw",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            padding: 0,
            overflow: "hidden",
            borderRadius: 14,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px 14px",
              borderBottom: "1px solid #e2e8f0",
              background: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <DialogTitle style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                <Layers size={18} style={{ color: "#2563eb" }} />
                Select Sizes / Variants
              </DialogTitle>
              <DialogDescription style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                Choose standard size systems (EU, UK, US, International) or add custom size tags.
              </DialogDescription>
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: draftSizes.length > 0 ? "#1e40af" : "#64748b",
                background: draftSizes.length > 0 ? "#eff6ff" : "#f1f5f9",
                border: `1px solid ${draftSizes.length > 0 ? "#bfdbfe" : "#cbd5e1"}`,
                padding: "4px 10px",
                borderRadius: 20,
              }}
            >
              {draftSizes.length} sizes selected
            </span>
          </div>

          {/* Main Content Layout (Left: Categories, Right: Grid) */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", flex: 1, minHeight: 380, maxHeight: "calc(90vh - 145px)", overflow: "hidden" }}>
            {/* Left Column: Size Systems */}
            <div
              style={{
                borderRight: "1px solid #e2e8f0",
                background: "#f8fafc",
                overflowY: "auto",
                padding: "12px 8px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", padding: "4px 8px" }}>
                Size Systems
              </span>
              {SIZE_SYSTEMS.map((sys) => {
                const isActive = activeSystemId === sys.id;
                const count = categoryCounts[sys.id] || 0;
                return (
                  <button
                    key={sys.id}
                    type="button"
                    onClick={() => handleSelectSystem(sys.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: isActive ? "#203664" : "transparent",
                      color: isActive ? "#ffffff" : "#334155",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.12s ease",
                      fontWeight: isActive ? 700 : 500,
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                      <span>{sys.name}</span>
                      <small style={{ fontSize: 10, color: isActive ? "#93c5fd" : "#94a3b8" }}>{sys.category}</small>
                    </div>
                    {count > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          background: isActive ? "#3b82f6" : "#e2e8f0",
                          color: isActive ? "#ffffff" : "#475569",
                          padding: "2px 7px",
                          borderRadius: 999,
                          minWidth: 20,
                          textAlign: "center",
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Column: Size Grid, Search, & Custom Sizes */}
            <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "#ffffff" }}>
              {/* Toolbar: Search + Quick Select All / Deselect All */}
              <div
                style={{
                  padding: "12px 18px",
                  borderBottom: "1px solid #f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                {/* Search Bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: "5px 10px",
                    flex: "1 1 200px",
                    maxWidth: 280,
                  }}
                >
                  <Search size={14} style={{ color: "#94a3b8" }} />
                  <input
                    type="text"
                    placeholder={`Search in ${activeSystem.name}…`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      border: "none",
                      background: "transparent",
                      outline: "none",
                      fontSize: 12.5,
                      width: "100%",
                      color: "#1e293b",
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      style={{ border: "none", background: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Quick Selection Helpers */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    style={{
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#334155",
                      padding: "4px 9px",
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Select All in {activeSystem.name}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllVisible}
                    style={{
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#64748b",
                      padding: "4px 9px",
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Deselect
                  </button>
                </div>
              </div>

              {/* Add Custom Size Strip */}
              <div
                style={{
                  padding: "8px 18px",
                  background: "#f8fafc",
                  borderBottom: "1px solid #f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b", whiteSpace: "nowrap" }}>
                  + Add Custom Size:
                </span>
                <input
                  type="text"
                  placeholder="e.g. Free Size, 4XL, 28-30, Custom…"
                  value={customSizeInput}
                  onChange={(e) => setCustomSizeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomSize();
                    }
                  }}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 12,
                    flex: "1 1 180px",
                    maxWidth: 240,
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomSize}
                  disabled={!customSizeInput.trim()}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "none",
                    background: customSizeInput.trim() ? "#203664" : "#cbd5e1",
                    color: "#ffffff",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: customSizeInput.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  <Plus size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 2 }} />
                  Add
                </button>
              </div>

              {/* Size Buttons Grid */}
              <div
                style={{
                  padding: "16px 18px",
                  overflowY: "auto",
                  flex: 1,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))",
                  gap: 8,
                  alignContent: "start",
                }}
              >
                {availableSizes.map((size) => {
                  const isSelected = draftSizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleToggleSize(size)}
                      style={{
                        position: "relative",
                        padding: "10px 4px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: isSelected ? 700 : 500,
                        textAlign: "center",
                        cursor: "pointer",
                        border: isSelected ? "2px solid #203664" : "1px solid #cbd5e1",
                        background: isSelected ? "#203664" : "#ffffff",
                        color: isSelected ? "#ffffff" : "#1e293b",
                        boxShadow: isSelected ? "0 2px 4px rgba(32, 54, 100, 0.15)" : "none",
                        transition: "all 0.12s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 42,
                      }}
                      title={isSelected ? `Click to deselect size ${size}` : `Click to select size ${size}`}
                    >
                      {size}
                      {isSelected && (
                        <span
                          style={{
                            position: "absolute",
                            top: 2,
                            right: 3,
                            fontSize: 9,
                            background: "#3b82f6",
                            color: "#ffffff",
                            borderRadius: "50%",
                            width: 13,
                            height: 13,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}

                {availableSizes.length === 0 && (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      textAlign: "center",
                      padding: "30px 20px",
                      color: "#94a3b8",
                      fontSize: 13,
                    }}
                  >
                    No sizes match &ldquo;{searchQuery}&rdquo;. Try adding it as a custom size above.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid #e2e8f0",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {/* Left: Summary Counter */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                {draftSizes.length} {draftSizes.length === 1 ? "Size" : "Sizes"} Selected
              </span>
              {draftSizes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDraftSizes([])}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#dc2626",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "2px 6px",
                  }}
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Right: Cancel / Confirm */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                className="admin-secondary"
                onClick={handleCancel}
                style={{ padding: "8px 16px", fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-primary"
                onClick={handleConfirm}
                style={{ padding: "8px 22px", fontSize: 13, fontWeight: 700, background: "#203664" }}
              >
                Confirm ({draftSizes.length})
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Switching Size Systems */}
      <Dialog open={!!pendingSystemSwitch} onOpenChange={(open) => { if (!open) setPendingSystemSwitch(null); }}>
        <DialogContent className="admin-dialog" style={{ maxWidth: 440 }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#92400e", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={18} style={{ color: "#d97706" }} />
              Change size system?
            </DialogTitle>
            <DialogDescription style={{ fontSize: 13, color: "#475569", marginTop: 8, lineHeight: 1.5 }}>
              You currently have <b>{draftSizes.length} {activeSystem.name}</b> sizes selected. Changing to{" "}
              <b>{SIZE_SYSTEMS.find((s) => s.id === pendingSystemSwitch)?.name}</b> may replace these selections.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="admin-secondary"
              onClick={() => confirmSystemSwitch("keep_both")}
              style={{ fontSize: 12.5 }}
            >
              Keep Current &amp; Switch
            </button>
            <button
              type="button"
              className="admin-primary"
              onClick={() => confirmSystemSwitch("replace")}
              style={{ fontSize: 12.5, background: "#203664" }}
            >
              Change Size System
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Removing Size With Existing Product Data */}
      <Dialog open={!!sizePendingRemoval} onOpenChange={(open) => { if (!open) setSizePendingRemoval(null); }}>
        <DialogContent className="admin-dialog" style={{ maxWidth: 440 }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#dc2626", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={18} />
              Remove size {sizePendingRemoval?.size}?
            </DialogTitle>
            <DialogDescription style={{ fontSize: 13, color: "#475569", marginTop: 8, lineHeight: 1.5 }}>
              This variant contains existing product data:
              <br />
              {sizePendingRemoval?.data.stock !== undefined && (
                <span>• Current Stock: <b>{sizePendingRemoval.data.stock} units</b><br /></span>
              )}
              {sizePendingRemoval?.data.sku && (
                <span>• SKU: <b>{sizePendingRemoval.data.sku}</b><br /></span>
              )}
              Are you sure you want to remove this size variant?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="admin-secondary"
              onClick={() => setSizePendingRemoval(null)}
              style={{ fontSize: 12.5 }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="admin-danger"
              onClick={confirmRemovalOfProtectedSize}
              style={{ fontSize: 12.5 }}
            >
              Remove Variant
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

