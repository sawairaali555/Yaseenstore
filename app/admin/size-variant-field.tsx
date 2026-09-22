"use client";

import React, { useState } from "react";
import { Layers, Plus, X, Edit3, AlertCircle } from "lucide-react";
import SizeSelectorModal, { VariantDataCheck } from "./size-selector-modal";

interface Props {
  label?: string;
  selectedSizes: string[];
  existingVariantData?: Record<string, VariantDataCheck>;
  onChange: (sizes: string[], systemId?: string) => void;
  disabled?: boolean;
}

export default function SizeVariantField({
  label = "Sizes / Variants",
  selectedSizes = [],
  existingVariantData = {},
  onChange,
  disabled = false,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [protectWarningSize, setProtectWarningSize] = useState<{
    size: string;
    data: VariantDataCheck;
  } | null>(null);

  function handleRemoveChip(size: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (disabled) return;

    // Check if variant has protected data
    const data = existingVariantData[size];
    if (data && ((data.stock !== undefined && data.stock > 0) || (data.ordersCount !== undefined && data.ordersCount > 0))) {
      setProtectWarningSize({ size, data });
      return;
    }

    onChange(selectedSizes.filter((s) => s !== size));
  }

  function confirmRemoval() {
    if (!protectWarningSize) return;
    onChange(selectedSizes.filter((s) => s !== protectWarningSize.size));
    setProtectWarningSize(null);
  }

  return (
    <div className="size-variant-field-wrapper" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* Field Label Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
          <Layers size={15} style={{ color: "#2563eb" }} />
          {label}
        </label>
        {selectedSizes.length > 0 && (
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: "#1d4ed8",
              background: "#eff6ff",
              padding: "2px 8px",
              borderRadius: 12,
              border: "1px solid #bfdbfe",
            }}
          >
            {selectedSizes.length} {selectedSizes.length === 1 ? "size" : "sizes"} selected
          </span>
        )}
      </div>

      {/* Clickable Chips Container */}
      <div
        onClick={() => {
          if (!disabled) setModalOpen(true);
        }}
        className="size-chips-box"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          minHeight: 46,
          background: disabled ? "#f8fafc" : "#ffffff",
          border: "1.5px solid #cbd5e1",
          borderRadius: 8,
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        }}
        title={disabled ? undefined : "Click to open visual size picker"}
      >
        {selectedSizes.map((size) => (
          <span
            key={size}
            className="size-removable-chip"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px 3px 10px",
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              color: "#1e293b",
              userSelect: "none",
            }}
          >
            {size}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => handleRemoveChip(size, e)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#64748b",
                  borderRadius: "50%",
                  width: 14,
                  height: 14,
                }}
                title={`Remove size ${size}`}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#dc2626";
                  e.currentTarget.style.background = "#fee2e2";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#64748b";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <X size={11} />
              </button>
            )}
          </span>
        ))}

        {selectedSizes.length === 0 && (
          <span style={{ fontSize: 12.5, color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> Click to select sizes (EU, UK, US, International, Custom)…
          </span>
        )}

        {!disabled && selectedSizes.length > 0 && (
          <button
            type="button"
            className="edit-sizes-mini-btn"
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              border: "1px solid #bfdbfe",
              background: "#eff6ff",
              color: "#2563eb",
              borderRadius: 6,
              padding: "3px 8px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Edit3 size={11} /> Edit Sizes
          </button>
        )}
      </div>

      {/* Size Selector Modal */}
      <SizeSelectorModal
        open={modalOpen}
        selectedSizes={selectedSizes}
        existingVariantData={existingVariantData}
        onOpenChange={(open) => setModalOpen(open)}
        onConfirm={(newSizes, systemId) => {
          onChange(newSizes, systemId);
        }}
      />

      {/* Chip Removal Data Warning Modal */}
      {protectWarningSize && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
          onClick={() => setProtectWarningSize(null)}
        >
          <div
            style={{
              background: "#ffffff",
              padding: 20,
              borderRadius: 12,
              maxWidth: 400,
              width: "100%",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#dc2626", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={18} /> Remove size {protectWarningSize.size}?
            </h4>
            <p style={{ margin: "10px 0 16px", fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
              This variant has active product data:
              <br />
              {protectWarningSize.data.stock !== undefined && (
                <span>• Stock: <b>{protectWarningSize.data.stock} units</b><br /></span>
              )}
              {protectWarningSize.data.sku && (
                <span>• SKU: <b>{protectWarningSize.data.sku}</b><br /></span>
              )}
              Removing this size will delete these variant details.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                className="admin-secondary"
                onClick={() => setProtectWarningSize(null)}
                style={{ padding: "6px 12px", fontSize: 12 }}
              >
                Keep Size
              </button>
              <button
                type="button"
                className="admin-danger"
                onClick={confirmRemoval}
                style={{ padding: "6px 14px", fontSize: 12 }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

