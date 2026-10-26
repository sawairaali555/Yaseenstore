"use client";
import { adminFetch } from "@/lib/admin-request";
import { useEffect, useState, useRef } from "react";
import {
  CheckCircle2,
  Eye,
  GripVertical,
  LoaderCircle,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { ManagedProduct } from "@/lib/store-data";

type Props = {
  product: ManagedProduct | null;
  open: boolean;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (product: ManagedProduct) => Promise<void>;
};

const imageUrl = (value: string) => {
  if (!value) return "";
  if (value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) return value;
  return "/images/" + value + ".jpg";
};

const MAX_SIZE = 3 * 1024 * 1024; // 3MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ImageManager({ product, open, busy = false, onOpenChange, onSave }: Props) {
  const [images, setImages] = useState<string[]>([]);
  const [mainImage, setMainImage] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);

  const addFilesInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && product) {
      const allImgs = Array.from(
        new Set([product.image, ...(product.images || [])].filter(Boolean) as string[])
      );
      setImages(allImgs);
      const initialMain = product.image && allImgs.includes(product.image) ? product.image : (allImgs[0] || "");
      setMainImage(initialMain);
      setDeleteConfirmIndex(null);
      setPreviewImage(null);
      setDraggedIndex(null);
      setDragOverIndex(null);
      setReplaceIndex(null);
      setIsFileDragOver(false);
    }
  }, [open, product]);

  async function uploadFiles(files: FileList | File[] | null) {
    if (!files || !files.length) return;
    const fileArray = Array.from(files);

    // Validate files
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
        const response = await adminFetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const data = (await response.json()) as { error?: string; url?: string };
        if (!response.ok) throw new Error(data.error || "Upload failed.");
        if (data.url) uploadedUrls.push(data.url);
      }

      setImages((current) => {
        const next = Array.from(new Set([...current, ...uploadedUrls]));
        if (!mainImage && next.length > 0) {
          setMainImage(next[0]);
        }
        return next;
      });

      toast.success(`${uploadedUrls.length} image${uploadedUrls.length > 1 ? "s" : ""} added to gallery`);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image.");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  async function handleReplace(files: FileList | File[] | null) {
    if (!files || !files.length || replaceIndex === null) return;
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
    const targetIdx = replaceIndex;

    try {
      const response = await adminFetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const data = (await response.json()) as { error?: string; url?: string };
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      if (data.url) {
        const oldUrl = images[targetIdx];
        const newUrl = data.url;
        setImages((curr) => {
          const next = [...curr];
          next[targetIdx] = newUrl;
          return next;
        });

        // If replaced image was Main, retain Main status on the new image
        if (oldUrl === mainImage) {
          setMainImage(newUrl);
        }

        toast.success("Image replaced successfully");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to replace image.");
    } finally {
      setUploading(false);
      setUploadProgress("");
      setReplaceIndex(null);
    }
  }

  function handleDelete(index: number) {
    const deletedUrl = images[index];
    const nextImages = images.filter((_, i) => i !== index);
    setImages(nextImages);

    if (deletedUrl === mainImage) {
      const newMain = nextImages[0] || "";
      setMainImage(newMain);
    }

    toast.info("Image removed from product");
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  }

  function handleDragLeave(e: React.DragEvent, index: number) {
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  }

  function handleDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setImages((current) => {
      const next = [...current];
      const [moved] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  async function save() {
    if (!product) return;
    if (!images.length) {
      toast.error("Product must have at least one image.");
      return;
    }
    const effectiveMain = mainImage && images.includes(mainImage) ? mainImage : images[0];
    await onSave({ ...product, image: effectiveMain, images });
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="admin-dialog"
          style={{
            maxWidth: 780,
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            padding: 0,
            overflow: "hidden",
            borderRadius: 14,
          }}
        >
          {/* Modal Header */}
          <DialogHeader style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <DialogTitle style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                  Product Images — {images.length} {images.length === 1 ? "image" : "images"}
                </DialogTitle>
                <DialogDescription style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
                  Upload, reorder and manage your product images.
                </DialogDescription>
              </div>

              <button
                type="button"
                className="admin-primary"
                onClick={() => addFilesInputRef.current?.click()}
                disabled={busy || uploading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  background: "#203664",
                  color: "#ffffff",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <Plus size={16} /> Add Images
              </button>
            </div>
          </DialogHeader>

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
              handleReplace(e.target.files);
              e.currentTarget.value = "";
            }}
          />

          {/* Modal Body / Gallery */}
          <div
            style={{
              padding: "20px 24px",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              background: isFileDragOver ? "#f0f9ff" : "#ffffff",
              border: isFileDragOver ? "2px dashed #3b82f6" : "2px dashed transparent",
              transition: "background 0.15s ease, border-color 0.15s ease",
            }}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes("Files")) {
                e.preventDefault();
                setIsFileDragOver(true);
              }
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setIsFileDragOver(false);
              }
            }}
            onDrop={(e) => {
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                e.preventDefault();
                setIsFileDragOver(false);
                uploadFiles(e.dataTransfer.files);
              }
            }}
          >
            {uploading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 8,
                  color: "#1d4ed8",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <LoaderCircle size={16} className="animate-spin" />
                <span>{uploadProgress || "Uploading images…"}</span>
              </div>
            )}

            {images.length === 0 ? (
              /* Empty state dropzone */
              <div
                onClick={() => addFilesInputRef.current?.click()}
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: 12,
                  padding: "48px 24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  cursor: "pointer",
                  background: "#f8fafc",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: "#e0e7ff",
                    color: "#4338ca",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Upload size={24} />
                </div>
                <div>
                  <b style={{ fontSize: 14, color: "#1e293b", display: "block" }}>
                    Drop product images here, or click to browse
                  </b>
                  <span style={{ fontSize: 12, color: "#64748b", marginTop: 4, display: "block" }}>
                    Supports JPG, JPEG, PNG, WebP up to 3 MB each
                  </span>
                </div>
                <button
                  type="button"
                  className="admin-primary"
                  style={{
                    marginTop: 6,
                    padding: "7px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "#203664",
                    color: "#ffffff",
                    borderRadius: 8,
                    border: "none",
                  }}
                >
                  <Plus size={15} /> Select Images
                </button>
              </div>
            ) : (
              /* Gallery Grid */
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                  gap: 14,
                }}
              >
                {images.map((val, idx) => {
                  const isMain = val === mainImage || (!mainImage && idx === 0);
                  const isHovered = hoveredIndex === idx;
                  const isDraggingThis = draggedIndex === idx;
                  const isDragTarget = dragOverIndex === idx && draggedIndex !== idx;

                  return (
                    <div
                      key={val + idx}
                      draggable={!uploading}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragLeave={(e) => handleDragLeave(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      style={{
                        position: "relative",
                        aspectRatio: "1 / 1",
                        width: "100%",
                        borderRadius: 10,
                        border: isDragTarget
                          ? "2px solid #3b82f6"
                          : isMain
                          ? "2px solid #2563eb"
                          : "1px solid #cbd5e1",
                        background: "#ffffff",
                        overflow: "hidden",
                        boxShadow: isMain
                          ? "0 3px 10px rgba(37, 99, 235, 0.15)"
                          : "0 1px 3px rgba(0,0,0,0.05)",
                        opacity: isDraggingThis ? 0.35 : 1,
                        cursor: "grab",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {/* Image Thumbnail */}
                      <img
                        src={imageUrl(val)}
                        alt={`Photo ${idx + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          background: "#fafafa",
                          userSelect: "none",
                        }}
                      />

                      {/* MAIN Badge */}
                      {isMain && (
                        <span
                          style={{
                            position: "absolute",
                            top: 6,
                            left: 6,
                            background: "#2563eb",
                            color: "#ffffff",
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: "0.5px",
                            padding: "2px 7px",
                            borderRadius: 5,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            boxShadow: "0 2px 4px rgba(37, 99, 235, 0.3)",
                            zIndex: 10,
                          }}
                        >
                          <Star size={10} style={{ fill: "#ffffff" }} /> MAIN
                        </span>
                      )}

                      {/* Hover Overlay with Action Buttons */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(15, 23, 42, 0.72)",
                          backdropFilter: "blur(2px)",
                          opacity: isHovered ? 1 : 0,
                          transition: "opacity 0.15s ease",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          padding: 6,
                          pointerEvents: isHovered ? "auto" : "none",
                          zIndex: 15,
                        }}
                      >
                        {/* Make Main Button */}
                        {!isMain && (
                          <button
                            type="button"
                            onClick={() => {
                              setMainImage(val);
                              toast.success("Set as Main product image");
                            }}
                            style={{
                              background: "#2563eb",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: 6,
                              padding: "4px 8px",
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                            }}
                            title="Set as Main product image"
                          >
                            <Star size={11} style={{ fill: "#ffffff" }} /> Make Main
                          </button>
                        )}

                        {/* Action Icons Bar */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {/* Preview */}
                          <button
                            type="button"
                            onClick={() => setPreviewImage(val)}
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 6,
                              background: "#ffffff",
                              color: "#0f172a",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="Preview image"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Replace */}
                          <button
                            type="button"
                            onClick={() => {
                              setReplaceIndex(idx);
                              replaceFileInputRef.current?.click();
                            }}
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 6,
                              background: "#ffffff",
                              color: "#0f172a",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="Replace image"
                          >
                            <RefreshCw size={13} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmIndex(idx)}
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 6,
                              background: "#ef4444",
                              color: "#ffffff",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="Delete image"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Compact "+ Add More" Drop/Click Card */}
                <div
                  onClick={() => addFilesInputRef.current?.click()}
                  style={{
                    aspectRatio: "1 / 1",
                    width: "100%",
                    border: "2px dashed #cbd5e1",
                    background: "#f8fafc",
                    borderRadius: 10,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    cursor: uploading ? "wait" : "pointer",
                    transition: "all 0.15s ease",
                    padding: 8,
                    textAlign: "center",
                  }}
                  title="Click to add more images"
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "#e0e7ff",
                      color: "#4338ca",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Plus size={18} />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1e293b" }}>
                    Add Images
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: "14px 24px",
              borderTop: "1px solid #e2e8f0",
              background: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
              <GripVertical size={14} style={{ color: "#94a3b8" }} />
              Drag thumbnails to reorder gallery. Main image remains cover.
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                className="admin-secondary"
                onClick={() => onOpenChange(false)}
                disabled={busy || uploading}
                style={{ padding: "8px 16px", fontSize: 13 }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="admin-primary"
                disabled={busy || uploading}
                onClick={save}
                style={{
                  padding: "8px 20px",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#203664",
                  color: "#ffffff",
                  borderRadius: 8,
                  border: "none",
                  cursor: busy || uploading ? "not-allowed" : "pointer",
                }}
              >
                {busy ? (
                  <>
                    <LoaderCircle size={15} className="animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmIndex !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmIndex(null);
        }}
      >
        <DialogContent
          className="admin-dialog"
          style={{
            maxWidth: 400,
            padding: "20px 24px",
            borderRadius: 12,
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              Delete image?
            </DialogTitle>
            <DialogDescription style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
              This image will be removed from this product.
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
            <button
              type="button"
              className="admin-secondary"
              onClick={() => setDeleteConfirmIndex(null)}
              style={{ padding: "7px 14px", fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (deleteConfirmIndex !== null) {
                  handleDelete(deleteConfirmIndex);
                  setDeleteConfirmIndex(null);
                }
              }}
              style={{
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 600,
                background: "#dc2626",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Photo Preview Lightbox */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent
          className="admin-dialog"
          style={{
            maxWidth: 640,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: 14,
          }}
        >
          {previewImage && (
            <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}>
              <img
                src={imageUrl(previewImage)}
                alt="Enlarged preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "75vh",
                  objectFit: "contain",
                  borderRadius: 8,
                }}
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
                aria-label="Close preview"
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
