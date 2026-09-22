"use client";

import React, { useState, useEffect } from "react";
import {
  ImageIcon,
  Upload,
  Save,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Link2,
  Plus,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import type { Settings, BannerSlide } from "@/lib/store-data";

interface BannersManagerProps {
  config: Settings;
  onSave: (updatedConfig: Settings) => Promise<boolean>;
}

export default function BannersManager({ config: initialConfig, onSave }: BannersManagerProps) {
  // Initialize banners array with fallback to legacy single banner if array is empty
  const initialBanners: BannerSlide[] = (initialConfig.banners && initialConfig.banners.length > 0)
    ? initialConfig.banners
    : (initialConfig.bannerImage || initialConfig.heroImage)
      ? [
          {
            id: "banner-1",
            image: initialConfig.bannerImage || initialConfig.heroImage || "",
            link: initialConfig.bannerLink || initialConfig.heroButtonLink || "/products",
            alt: "Store Banner 1",
          },
        ]
      : [];

  const [banners, setBanners] = useState<BannerSlide[]>(initialBanners);
  const [autoplay, setAutoplay] = useState(initialConfig.bannerAutoplay ?? true);
  const [interval, setIntervalVal] = useState(initialConfig.bannerInterval ?? 5);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Live preview active slide state
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPreviewPaused, setIsPreviewPaused] = useState(false);

  // Auto rotate preview if autoplay enabled and > 1 banner
  useEffect(() => {
    if (banners.length <= 1 || !autoplay || isPreviewPaused) return;
    const timer = setInterval(() => {
      setPreviewIndex((prev) => (prev + 1) % banners.length);
    }, interval * 1000);
    return () => clearInterval(timer);
  }, [banners.length, autoplay, interval, isPreviewPaused]);

  // Adjust preview index if banners count changes
  useEffect(() => {
    if (previewIndex >= banners.length && banners.length > 0) {
      setPreviewIndex(0);
    }
  }, [banners.length, previewIndex]);

  const handleAddSlide = () => {
    setSaved(false);
    const newSlide: BannerSlide = {
      id: `banner-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      image: "",
      link: "/products",
      alt: `Store Banner ${banners.length + 1}`,
    };
    setBanners((prev) => [...prev, newSlide]);
    toast.success(`Banner slide #${banners.length + 1} added`);
  };

  const handleUpdateSlide = (id: string, updates: Partial<BannerSlide>) => {
    setSaved(false);
    setBanners((prev) =>
      prev.map((slide) => (slide.id === id ? { ...slide, ...updates } : slide))
    );
  };

  const handleDeleteSlide = (id: string) => {
    setSaved(false);
    setBanners((prev) => prev.filter((s) => s.id !== id));
    toast.info("Banner slide removed");
  };

  const handleMoveSlide = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= banners.length) return;
    setSaved(false);
    setBanners((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(targetIdx, 0, item);
      return copy;
    });
  };

  const handleImageUpload = (file: File, slideId: string) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a valid image file (PNG, JPG, WebP)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      handleUpdateSlide(slideId, { image: dataUrl });
      toast.success("Banner image uploaded successfully");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const validBanners = banners.filter((b) => b.image.trim().length > 0);
    const firstBanner = validBanners[0];

    const updatedConfig: Settings = {
      ...initialConfig,
      banners: validBanners,
      bannerAutoplay: autoplay,
      bannerInterval: interval,
      bannerImage: firstBanner?.image || "",
      bannerLink: firstBanner?.link || "/products",
      heroImage: firstBanner?.image || "",
      heroButtonLink: firstBanner?.link || "/products",
    };

    try {
      const ok = await onSave(updatedConfig);
      if (ok) {
        setSaved(true);
        toast.success(
          validBanners.length > 1
            ? `${validBanners.length} carousel banners updated and live!`
            : "Store banner updated and live!"
        );
      }
    } catch {
      toast.error("Failed to save banners. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const activeSlide = banners[previewIndex];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#203664] flex items-center justify-center">
              <ImageIcon size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Homepage Banners &amp; Carousel
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Upload single or multiple banner slides with links. Multiple banners automatically rotate as an interactive carousel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAddSlide}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Banner</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-[#203664] hover:bg-[#2c4985] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-60 cursor-pointer"
          >
            {saved && !saving ? <CheckCircle2 size={16} /> : <Save size={16} />}
            <span>{saving ? "Saving…" : saved ? "Banners Saved" : "Save Banners"}</span>
          </button>
        </div>
      </div>

      {/* Live Storefront Preview Box */}
      <div
        className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-3"
        onMouseEnter={() => setIsPreviewPaused(true)}
        onMouseLeave={() => setIsPreviewPaused(false)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              Live Storefront Preview
            </h2>
            {banners.length > 1 && (
              <span className="text-[11px] font-semibold bg-blue-50 text-[#203664] border border-blue-100 px-2 py-0.5 rounded-md">
                {banners.length} Carousel Slides
              </span>
            )}
          </div>

          {banners.length > 1 && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <button
                type="button"
                onClick={() => setIsPreviewPaused(!isPreviewPaused)}
                className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer"
                title={isPreviewPaused ? "Resume auto-rotation" : "Pause auto-rotation"}
              >
                {isPreviewPaused ? <Play size={12} /> : <Pause size={12} />}
                <span>{isPreviewPaused ? "Paused" : "Autoplaying"}</span>
              </button>
            </div>
          )}
        </div>

        <div className="border border-slate-200 rounded-2xl p-3 sm:p-4 bg-slate-50/50">
          {banners.length > 0 && activeSlide?.image ? (
            <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200/80 shadow-md group">
              <a
                href={activeSlide.link || "/products"}
                onClick={(e) => e.preventDefault()}
                className="block w-full"
              >
                <img
                  src={activeSlide.image}
                  alt={activeSlide.alt || "Banner Preview"}
                  className="w-full h-auto max-h-[360px] object-cover object-center block transition-opacity duration-300"
                />
              </a>

              {/* Destination Tag */}
              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-xs text-white text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 pointer-events-none">
                <span>Links to: {activeSlide.link || "/products"}</span>
                <ExternalLink size={11} />
              </div>

              {/* Carousel Navigation Arrows in Preview */}
              {banners.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1))
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewIndex((prev) => (prev + 1) % banners.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110"
                    aria-label="Next slide"
                  >
                    <ChevronRight size={18} />
                  </button>

                  {/* Dot Indicators */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
                    {banners.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewIndex(idx)}
                        className={`size-2.5 rounded-full border border-white/90 shadow-sm transition-all cursor-pointer ${
                          previewIndex === idx ? "bg-white scale-110" : "bg-white/45 hover:bg-white/80"
                        }`}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="w-full h-52 rounded-2xl bg-gradient-to-br from-[#1e2f52] to-[#203664] text-white flex flex-col items-center justify-center p-6 text-center shadow-md">
              <ImageIcon size={38} className="text-blue-200/60 mb-2" />
              <b className="text-base font-bold">No Custom Banners Added Yet</b>
              <p className="text-xs text-blue-100/80 mt-1 max-w-sm">
                Add banner slides below to display promotional campaigns and carousel sliders on your storefront.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Carousel Settings Card (shown when 2 or more banners exist) */}
      {banners.length > 1 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sliders size={16} className="text-[#203664]" />
            <span>Carousel Playback Settings</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <div>
                <b className="text-xs font-bold text-slate-800 block">Auto-Rotate Slides</b>
                <span className="text-[11px] text-slate-500">
                  Automatically switch banners smoothly
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoplay}
                onChange={(e) => {
                  setSaved(false);
                  setAutoplay(e.target.checked);
                }}
                className="w-4 h-4 rounded text-[#203664] focus:ring-[#203664]"
              />
            </label>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Rotation Interval (Seconds)
              </label>
              <select
                value={interval}
                onChange={(e) => {
                  setSaved(false);
                  setIntervalVal(Number(e.target.value));
                }}
                disabled={!autoplay}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#203664]"
              >
                <option value={3}>3 Seconds (Fast)</option>
                <option value={4}>4 Seconds</option>
                <option value={5}>5 Seconds (Recommended)</option>
                <option value={7}>7 Seconds</option>
                <option value={10}>10 Seconds (Slow)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Banner Slides List Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Banner Slides ({banners.length})
          </h2>
          <button
            type="button"
            onClick={handleAddSlide}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#203664] hover:text-[#2c4985] bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Slide</span>
          </button>
        </div>

        {banners.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border-2 border-dashed border-slate-300 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#203664] flex items-center justify-center mx-auto">
              <ImageIcon size={24} />
            </div>
            <p className="text-sm font-bold text-slate-800">No banners configured</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click &ldquo;Add First Banner Slide&rdquo; below to upload your first storefront banner.
            </p>
            <button
              type="button"
              onClick={handleAddSlide}
              className="inline-flex items-center gap-2 bg-[#203664] hover:bg-[#2c4985] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer mt-2"
            >
              <Plus size={16} />
              <span>Add First Banner Slide</span>
            </button>
          </div>
        ) : (
          banners.map((slide, index) => (
            <div
              key={slide.id}
              className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4 transition-all"
            >
              {/* Slide Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                    {index + 1}
                  </span>
                  <b className="text-xs sm:text-sm font-bold text-slate-900">
                    Banner Slide #{index + 1}
                  </b>
                  {index === 0 && (
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                      Primary / First
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Reorder Buttons */}
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMoveSlide(index, "up")}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                    title="Move slide up"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={index === banners.length - 1}
                    onClick={() => handleMoveSlide(index, "down")}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                    title="Move slide down"
                  >
                    <ArrowDown size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSlide(slide.id)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg ml-1 cursor-pointer transition-colors"
                    title="Delete slide"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Slide Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* Image Upload / Drop Box */}
                <div className="md:col-span-6 space-y-2">
                  <span className="text-xs font-semibold text-slate-700 block">
                    Banner Image File
                  </span>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleImageUpload(file, slide.id);
                    }}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = (e: any) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, slide.id);
                      };
                      input.click();
                    }}
                    className="border-2 border-dashed border-slate-300 hover:border-[#203664] bg-slate-50/70 hover:bg-blue-50/20 rounded-xl p-5 text-center cursor-pointer transition-all"
                  >
                    <Upload size={20} className="mx-auto text-slate-500 mb-1.5" />
                    <p className="text-xs font-bold text-slate-800">
                      Click or drag image file here
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      PNG, JPG, WebP (1400×450px recommended)
                    </p>
                  </div>
                </div>

                {/* Direct URL & Destination Link */}
                <div className="md:col-span-6 space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Or Paste Image URL
                    </label>
                    <input
                      type="text"
                      value={slide.image}
                      onChange={(e) => handleUpdateSlide(slide.id, { image: e.target.value })}
                      placeholder="https://example.com/banner-slide.jpg"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#203664] focus:ring-2 focus:ring-[#203664]/10 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Link2 size={13} className="text-slate-400" />
                      <span>Destination Link (Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={slide.link || ""}
                      onChange={(e) => handleUpdateSlide(slide.id, { link: e.target.value })}
                      placeholder="/products (Default: All products)"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#203664] focus:ring-2 focus:ring-[#203664]/10 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Mini Slide Preview thumbnail if set */}
              {slide.image && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={slide.image}
                      alt="Thumbnail"
                      className="w-20 h-10 object-cover rounded-lg border border-slate-200"
                    />
                    <span className="text-xs text-slate-600 font-medium line-clamp-1">
                      Target: <b className="text-slate-800">{slide.link || "/products"}</b>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUpdateSlide(slide.id, { image: "" })}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                  >
                    Clear Image
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {/* Bottom Save Buttons */}
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={handleAddSlide}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Another Slide</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-[#203664] hover:bg-[#2c4985] text-white font-bold text-sm px-7 py-3 rounded-xl shadow-md transition-all disabled:opacity-60 cursor-pointer"
          >
            {saved && !saving ? <CheckCircle2 size={17} /> : <Save size={17} />}
            <span>{saving ? "Saving changes…" : saved ? "Banners Saved" : "Save Banners"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
