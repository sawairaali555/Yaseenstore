"use client";
import { useEffect, useState, useRef, useMemo, type ReactNode } from "react";
import {
  ArrowLeft,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Eye,
  GripVertical,
  HelpCircle,
  Highlighter,
  Image as ImageIcon,
  ImagePlus,
  Info,
  Italic,
  Layers,
  Link2,
  List,
  ListOrdered,
  LoaderCircle,
  Palette,
  Plus,
  Quote,
  RefreshCw,
  RemoveFormatting,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Strikethrough,
  Trash2,
  Underline,
  Upload,
  X,
  Zap,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { categories as defaultCategories, money, type Product, type ProductVariant } from "@/app/catalog";
import type { ManagedProduct } from "@/lib/store-data";
import type { CategoryNode } from "@/lib/categories";
import { SIZE_SYSTEMS, detectSizeSystem, getRecommendedSizeSystems } from "@/lib/size-systems";
import { getVariantEffectiveImage, getColorGalleryImages } from "@/lib/inventory-engine";
import ImageManager from "../image-manager";
import SizeVariantField from "../size-variant-field";
import type { VariantDataCheck } from "../size-selector-modal";
import "./editor.css";

type Props = {
  mode: "create" | "edit";
  initialProductId?: string;
};

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || "product"
  );
}

const COMMON_COLORS = [
  "Black",
  "White",
  "Navy",
  "Grey",
  "Brown",
  "Beige",
  "Red",
  "Blue",
  "Green",
  "Maroon",
  "Pink",
  "Purple",
  "Yellow",
  "Gold",
  "Silver",
];

const COLOR_HEX_MAP: Record<string, string> = {
  Black: "#000000",
  White: "#ffffff",
  Navy: "#000080",
  Grey: "#808080",
  Brown: "#8b4513",
  Beige: "#f5f5dc",
  Red: "#ef4444",
  Blue: "#3b82f6",
  Green: "#22c55e",
  Maroon: "#800000",
  Pink: "#ec4899",
  Purple: "#a855f7",
  Yellow: "#eab308",
  Gold: "#ffd700",
  Silver: "#c0c0c0",
};

function RichTextButton({
  children,
  title,
  onClick,
}: {
  children: ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="editor-toolbar-btn" title={title} onClick={onClick}>
      {children}
    </button>
  );
}

export default function ProductEditor({ mode, initialProductId }: Props) {
  const [loading, setLoading] = useState(mode === "edit");
  const [busy, setBusy] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [descriptionUrlMode, setDescriptionUrlMode] = useState<"link" | "image" | null>(null);
  const [descriptionUrlValue, setDescriptionUrlValue] = useState("");

  // Category Tree
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [existingProducts, setExistingProducts] = useState<ManagedProduct[]>([]);

  // 1. Basic Information
  const [productId, setProductId] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [productType, setProductType] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [childCategory, setChildCategory] = useState("");
  const [status, setStatus] = useState<"Active" | "Draft">("Active");

  // 2. Main Product Gallery
  const [images, setImages] = useState<string[]>([]);
  const [mainImage, setMainImage] = useState<string>("");
  const [isImageManagerOpen, setIsImageManagerOpen] = useState(false);
  const descriptionEditorRef = useRef<HTMLDivElement>(null);
  const descriptionImageInputRef = useRef<HTMLInputElement>(null);

  // 3. Pricing (Master / Base)
  const [price, setPrice] = useState<string>("");
  const [oldPrice, setOldPrice] = useState<string>("");
  const [costPrice, setCostPrice] = useState<string>("");

  // 4. Inventory (Simple Product)
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [stock, setStock] = useState<string>("0");
  const [lowStockAlert, setLowStockAlert] = useState<string>("5");
  const [trackInventory, setTrackInventory] = useState(true);
  const [allowBackorders, setAllowBackorders] = useState(false);

  // 5. Product Structure & Variants Configuration
  const [hasVariants, setHasVariants] = useState(false);
  const [enableColorVariant, setEnableColorVariant] = useState(true);
  const [enableSizeVariant, setEnableSizeVariant] = useState(true);

  // Colors & Color Galleries
  const [productColors, setProductColors] = useState<string[]>([]);
  const [customColorInput, setCustomColorInput] = useState("");
  const [colorGalleries, setColorGalleries] = useState<
    Record<string, { mainImage?: string; images: string[] }>
  >({});
  const [activeColorGalleryTab, setActiveColorGalleryTab] = useState<string>("all");
  const [colorImageUploading, setColorImageUploading] = useState(false);

  // Sizes & Size Presets
  const [selectedSizeType, setSelectedSizeType] = useState<string>("eu");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  // Generated Variants Matrix
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(new Set());

  // Variant Image Override Modal
  const [overrideModalVariant, setOverrideModalVariant] = useState<ProductVariant | null>(null);
  const [overrideImageUrlInput, setOverrideImageUrlInput] = useState("");

  // Variant Table Multi-Filters
  const [tableColorFilter, setTableColorFilter] = useState<string>("all");
  const [tableSizeFilter, setTableSizeFilter] = useState<string>("all");
  const [tableStockFilter, setTableStockFilter] = useState<string>("all");
  const [tableSearchQuery, setTableSearchQuery] = useState<string>("");

  // Bulk Quick Action States
  const [quickBulkStock, setQuickBulkStock] = useState("");
  const [bulkPriceInput, setBulkPriceInput] = useState("");
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [showBulkStockModal, setShowBulkStockModal] = useState(false);
  const [bulkStockInput, setBulkStockInput] = useState("");

  // Set by Size & Set by Color Quick States
  const [filterBySize, setFilterBySize] = useState("");
  const [filterBySizeStock, setFilterBySizeStock] = useState("");
  const [filterByColor, setFilterByColor] = useState("");
  const [filterByColorStock, setFilterByColorStock] = useState("");

  // 6. Shipping (Collapsible)
  const [shippingOpen, setShippingOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [freeShipping, setFreeShipping] = useState(false);

  // 7. SEO (Collapsible)
  const [seoOpen, setSeoOpen] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManual, setIsSlugManual] = useState(false);

  // 8. Storefront Settings
  const [featured, setFeatured] = useState(false);
  const [newArrival, setNewArrival] = useState(true);
  const [bestSeller, setBestSeller] = useState(false);

  function populateForm(prod: ManagedProduct) {
    setProductId(prod.id);
    setName(prod.name || "");
    setDescription(prod.description || "");
    setBrand((prod as any).brand || "");
    setProductType((prod as any).productType || "");
    setCategory(prod.category || "");
    setSubcategory(prod.subcategory || "");
    setChildCategory((prod as any).childCategory || "");
    setStatus(prod.status === "Draft" ? "Draft" : "Active");

    const allImgs = Array.from(new Set([prod.image, ...(prod.images || [])].filter(Boolean) as string[]));
    setImages(allImgs);
    setMainImage(prod.image && allImgs.includes(prod.image) ? prod.image : allImgs[0] || "");

    setPrice(String(prod.price || ""));
    setOldPrice(String(prod.old || ""));
    setCostPrice(prod.costPrice ? String(prod.costPrice) : "");

    setSku(prod.sku || "");
    setBarcode((prod as any).barcode || "");
    setStock(String((prod as any).stock ?? 0));
    setLowStockAlert(String((prod as any).lowStockAlert ?? 5));
    setTrackInventory((prod as any).trackInventory !== false);
    setAllowBackorders(Boolean((prod as any).allowBackorders));

    // Extract Colors
    let loadedColors: string[] = [];
    if (prod.color && prod.color !== "Standard") {
      loadedColors.push(prod.color);
    }
    if ((prod as any).variantOptions && Array.isArray((prod as any).variantOptions)) {
      const colorOpt = (prod as any).variantOptions.find((o: any) => o.name.toLowerCase() === "color");
      if (colorOpt && Array.isArray(colorOpt.values)) {
        loadedColors = Array.from(new Set([...loadedColors, ...colorOpt.values]));
      }
    }
    if (prod.variants && Array.isArray(prod.variants)) {
      for (const v of prod.variants) {
        if (v.color && v.color !== "Standard" && !loadedColors.includes(v.color)) {
          loadedColors.push(v.color);
        }
      }
    }
    setProductColors(loadedColors);

    // Extract Color Galleries
    if (prod.colorGalleries) {
      setColorGalleries(prod.colorGalleries);
    } else {
      const inferred: Record<string, { mainImage?: string; images: string[] }> = {};
      if (prod.variants && Array.isArray(prod.variants)) {
        for (const v of prod.variants) {
          if (v.color && v.color !== "Standard") {
            const list = v.images && v.images.length ? v.images : v.image ? [v.image] : [];
            if (list.length > 0) {
              inferred[v.color] = {
                mainImage: v.image || list[0],
                images: list,
              };
            }
          }
        }
      }
      setColorGalleries(inferred);
    }

    // Extract Sizes
    let loadedSizes: string[] = [];
    if ((prod as any).variantOptions && Array.isArray((prod as any).variantOptions)) {
      const sizeOpt = (prod as any).variantOptions.find((o: any) => o.name.toLowerCase() === "size");
      if (sizeOpt && Array.isArray(sizeOpt.values)) {
        loadedSizes = sizeOpt.values;
      }
    }
    if (loadedSizes.length === 0 && prod.sizes && Array.isArray(prod.sizes)) {
      loadedSizes = prod.sizes.filter((s) => s !== "Standard");
    }
    if (loadedSizes.length === 0 && prod.variants && Array.isArray(prod.variants)) {
      for (const v of prod.variants) {
        if (v.size && v.size !== "Standard" && !loadedSizes.includes(v.size)) {
          loadedSizes.push(v.size);
        }
      }
    }

    const hasVarsActive =
      Boolean((prod as any).hasVariants) ||
      loadedSizes.length > 0 ||
      loadedColors.length > 0 ||
      Boolean(prod.variants && prod.variants.length > 0);

    setHasVariants(hasVarsActive);
    setEnableColorVariant(loadedColors.length > 0 || !hasVarsActive);
    setEnableSizeVariant(loadedSizes.length > 0 || !hasVarsActive);
    setSelectedSizes(loadedSizes);

    if (loadedSizes.length > 0) {
      setSelectedSizeType(detectSizeSystem(loadedSizes));
    }

    const existingVars: ProductVariant[] = prod.variants || [];
    setVariants(existingVars);

    if ((prod as any).shipping) {
      const sh = (prod as any).shipping;
      setWeight(sh.weight || "");
      setLength(sh.length || "");
      setWidth(sh.width || "");
      setHeight(sh.height || "");
      setFreeShipping(Boolean(sh.freeShipping));
    }

    if (prod.seo) {
      setSeoTitle(prod.seo.title || "");
      setSeoDescription(prod.seo.description || "");
      if ((prod.seo as any).slug) {
        setSlug((prod.seo as any).slug);
        setIsSlugManual(true);
      }
    }

    if ((prod as any).storefront) {
      const sf = (prod as any).storefront;
      setFeatured(Boolean(sf.featured));
      setNewArrival(Boolean(sf.newArrival));
      setBestSeller(Boolean(sf.bestSeller));
    }

    setIsDirty(false);
  }

  // Load Data on Mount
  useEffect(() => {
    async function loadData() {
      try {
        const [catRes, adminRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/admin"),
        ]);
        if (catRes.ok) {
          const catData = (await catRes.json()) as any;
          if (catData.categories) setCategoryTree(catData.categories);
        }
        if (adminRes.ok) {
          const adminData = (await adminRes.json()) as any;
          if (adminData.products) setExistingProducts(adminData.products);

          const targetId = initialProductId || new URLSearchParams(location.search).get("id");
          if (mode === "edit" && targetId) {
            const found: ManagedProduct | undefined = (adminData.products || []).find(
              (p: ManagedProduct) => p.id === targetId
            );
            if (found) {
              populateForm(found);
            } else {
              toast.error("Product not found");
            }
          }
        }
      } catch (e: any) {
        toast.error(e.message || "Failed to load product data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [mode, initialProductId]);

  // Unsaved changes warning
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Recommended Size Systems for current category
  const categoryRecommendations = useMemo(() => {
    return getRecommendedSizeSystems(category, subcategory);
  }, [category, subcategory]);

  // Update default size system when category changes
  useEffect(() => {
    if (categoryRecommendations.defaultSystemId && selectedSizes.length === 0) {
      setSelectedSizeType(categoryRecommendations.defaultSystemId);
    }
  }, [categoryRecommendations]);

  // Handle Name change and sync Slug
  function handleNameChange(val: string) {
    setName(val);
    setIsDirty(true);
    if (errors.name) setErrors((e) => ({ ...e, name: "" }));
    if (!isSlugManual) {
      setSlug(slugify(val));
    }
  }

  function syncDescriptionFromEditor() {
    setDescription(descriptionEditorRef.current?.innerHTML || "");
    setIsDirty(true);
  }

  function runDescriptionCommand(command: string, value?: string) {
    descriptionEditorRef.current?.focus();
    document.execCommand(command, false, value);
    syncDescriptionFromEditor();
  }

  async function uploadDescriptionImage(file: File | undefined) {
    if (!file) return;
    try {
      const response = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Image upload failed");
      runDescriptionCommand("insertImage", data.url);
      toast.success("Image added to description");
    } catch (e: any) {
      toast.error(e.message || "Image upload failed");
    } finally {
      if (descriptionImageInputRef.current) descriptionImageInputRef.current.value = "";
    }
  }

  function insertDescriptionLink() {
    setDescriptionUrlMode("link");
    setDescriptionUrlValue("");
  }

  function insertDescriptionImageUrl() {
    setDescriptionUrlMode("image");
    setDescriptionUrlValue("");
  }

  function applyDescriptionUrl() {
    const url = descriptionUrlValue.trim();
    if (!url) return;
    runDescriptionCommand(descriptionUrlMode === "image" ? "insertImage" : "createLink", url);
    setDescriptionUrlMode(null);
    setDescriptionUrlValue("");
  }

  // Dependent Category Options
  const selectedCategoryNode = useMemo(
    () => categoryTree.find((node) => node.name === category),
    [categoryTree, category]
  );

  const subcategoryOptions = useMemo(() => {
    if (!selectedCategoryNode) return [];
    return (selectedCategoryNode.children || []).filter((c) => c.enabled).map((c) => c.name);
  }, [selectedCategoryNode]);

  const selectedSubcategoryNode = useMemo(() => {
    if (!selectedCategoryNode) return null;
    return (selectedCategoryNode.children || []).find((c) => c.name === subcategory);
  }, [selectedCategoryNode, subcategory]);

  const childCategoryOptions = useMemo(() => {
    if (!selectedSubcategoryNode) return [];
    return (selectedSubcategoryNode.children || []).filter((c) => c.enabled).map((c) => c.name);
  }, [selectedSubcategoryNode]);

  // Live Pricing Computations
  const numPrice = Number(price) || 0;
  const numOld = Number(oldPrice) || 0;
  const numCost = Number(costPrice) || 0;

  const discountPercent = useMemo(() => {
    if (numOld > numPrice && numPrice > 0) {
      return Math.round(((numOld - numPrice) / numOld) * 100);
    }
    return 0;
  }, [numPrice, numOld]);

  const profitAmount = useMemo(() => {
    if (numCost > 0 && numPrice > 0) {
      return numPrice - numCost;
    }
    return null;
  }, [numPrice, numCost]);

  const profitMarginPercent = useMemo(() => {
    if (numCost > 0 && numPrice > 0) {
      return Math.round(((numPrice - numCost) / numPrice) * 100);
    }
    return null;
  }, [numPrice, numCost]);

  // Stock Status Badge
  const computedTotalStock = useMemo(() => {
    if (hasVariants) {
      return variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
    }
    return Number(stock) || 0;
  }, [hasVariants, variants, stock]);

  const numLowAlert = Number(lowStockAlert) || 5;
  const stockBadgeStatus = useMemo(() => {
    if (computedTotalStock <= 0) return { label: "Out of Stock", class: "out-of-stock" };
    if (computedTotalStock <= numLowAlert)
      return { label: `Low Stock (${computedTotalStock} left)`, class: "low-stock" };
    return { label: `In Stock (${computedTotalStock} available)`, class: "in-stock" };
  }, [computedTotalStock, numLowAlert]);

  // ----------------------------------------------------
  // Non-destructive Cartesian Combinations Generator
  // ----------------------------------------------------
  function buildVariantMatrix(
    colorsList: string[],
    sizesList: string[],
    currentVariants: ProductVariant[],
    useColors: boolean,
    useSizes: boolean
  ): ProductVariant[] {
    const cleanColors = useColors ? colorsList.map((c) => c.trim()).filter(Boolean) : [];
    const cleanSizes = useSizes ? sizesList.map((s) => s.trim()).filter(Boolean) : [];

    if (!cleanSizes.length && !cleanColors.length) return [];

    // Map existing variants to preserve SKU, price, stock, custom image, status
    const existingMap = new Map<string, ProductVariant>();
    for (const v of currentVariants) {
      if (v.title) existingMap.set(v.title, v);
      if (v.color && v.size) {
        existingMap.set(`${v.color} / ${v.size}`, v);
        existingMap.set(`${v.color}-${v.size}`, v);
      } else if (v.size) {
        existingMap.set(v.size, v);
      } else if (v.color) {
        existingMap.set(v.color, v);
      }
    }

    const baseSku = sku || slugify(name || "PROD").toUpperCase().slice(0, 8);
    const mainRegularPrice = numPrice || 0;
    const mainComparePrice = numOld || 0;

    let combos: Array<{ color?: string; size?: string; title: string }> = [];

    if (cleanColors.length > 0 && cleanSizes.length > 0) {
      // Cartesian Product: Color × Size
      for (const c of cleanColors) {
        for (const s of cleanSizes) {
          combos.push({ color: c, size: s, title: `${c} / ${s}` });
        }
      }
    } else if (cleanSizes.length > 0) {
      // Size Only
      for (const s of cleanSizes) {
        combos.push({ size: s, title: s });
      }
    } else if (cleanColors.length > 0) {
      // Color Only
      for (const c of cleanColors) {
        combos.push({ color: c, title: c });
      }
    }

    return combos.map((combo) => {
      const existing = existingMap.get(combo.title);
      if (existing) {
        return {
          ...existing,
          color: combo.color,
          colorHex: combo.color ? COLOR_HEX_MAP[combo.color] || existing.colorHex : undefined,
          size: combo.size,
          title: combo.title,
          options: {
            ...(combo.color ? { Color: combo.color } : {}),
            ...(combo.size ? { Size: combo.size } : {}),
          },
        };
      }

      // Generate clean unique SKU for new variant
      const colorPart = combo.color ? slugify(combo.color).toUpperCase().slice(0, 4) : "";
      const sizePart = combo.size ? slugify(combo.size).toUpperCase().slice(0, 4) : "";
      const skuParts = [colorPart, sizePart].filter(Boolean);
      const varSku = `${baseSku}-${skuParts.join("-") || "VAR"}`;
      const varId = `${slugify(name || "prod")}-${slugify(combo.title)}-${Date.now()}-${Math.floor(
        Math.random() * 1000
      )}`;

      return {
        id: varId,
        title: combo.title,
        color: combo.color,
        colorHex: combo.color ? COLOR_HEX_MAP[combo.color] : undefined,
        size: combo.size,
        options: {
          ...(combo.color ? { Color: combo.color } : {}),
          ...(combo.size ? { Size: combo.size } : {}),
        },
        sku: varSku,
        price: mainRegularPrice,
        oldPrice: mainComparePrice > mainRegularPrice ? mainComparePrice : undefined,
        stock: 0,
        status: "Active",
      };
    });
  }

  // Handle Updates to Product Colors
  function handleAddColor(colorName: string) {
    const trimmed = colorName.trim();
    if (!trimmed || productColors.includes(trimmed)) return;
    const nextColors = [...productColors, trimmed];
    setProductColors(nextColors);
    setCustomColorInput("");

    // Initialize color gallery if not exists
    if (!colorGalleries[trimmed]) {
      setColorGalleries((cg) => ({
        ...cg,
        [trimmed]: { mainImage: "", images: [] },
      }));
    }

    if (hasVariants) {
      setVariants(
        buildVariantMatrix(
          nextColors,
          selectedSizes,
          variants,
          enableColorVariant,
          enableSizeVariant
        )
      );
    }
    setIsDirty(true);
    toast.success(`Color "${trimmed}" added`);
  }

  function handleRemoveColor(colorIndex: number) {
    const targetColor = productColors[colorIndex];
    const nextColors = productColors.filter((_, i) => i !== colorIndex);
    setProductColors(nextColors);

    // Clean up gallery tab if active
    if (activeColorGalleryTab === targetColor) {
      setActiveColorGalleryTab("all");
    }

    if (hasVariants) {
      setVariants(
        buildVariantMatrix(
          nextColors,
          selectedSizes,
          variants,
          enableColorVariant,
          enableSizeVariant
        )
      );
    }
    setIsDirty(true);
  }

  // Handle Updates to Selected Sizes
  function handleUpdateSizes(newSizes: string[], systemId?: string) {
    setSelectedSizes(newSizes);
    if (systemId) setSelectedSizeType(systemId);
    if (hasVariants) {
      setVariants(
        buildVariantMatrix(
          productColors,
          newSizes,
          variants,
          enableColorVariant,
          enableSizeVariant
        )
      );
    }
    setIsDirty(true);
  }

  // Handle Switching Options
  function handleToggleColorOption(checked: boolean) {
    setEnableColorVariant(checked);
    setIsDirty(true);
    setVariants(
      buildVariantMatrix(
        productColors,
        selectedSizes,
        variants,
        checked,
        enableSizeVariant
      )
    );
  }

  function handleToggleSizeOption(checked: boolean) {
    setEnableSizeVariant(checked);
    setIsDirty(true);
    setVariants(
      buildVariantMatrix(
        productColors,
        selectedSizes,
        variants,
        enableColorVariant,
        checked
      )
    );
  }

  // Existing variant data mapping for size removal protection
  const existingVariantData: Record<string, VariantDataCheck> = useMemo(() => {
    const map: Record<string, VariantDataCheck> = {};
    for (const v of variants) {
      const sizeName = v.size || (v.options ? v.options["Size"] : undefined);
      if (sizeName) {
        map[sizeName] = {
          stock: Number(v.stock || 0),
          sku: v.sku,
          price: v.price,
        };
      }
    }
    return map;
  }, [variants]);

  // Color Gallery Image Upload Handler
  async function handleColorImageUpload(colorName: string, files: FileList | null) {
    if (!files || !files.length) return;
    setColorImageUploading(true);

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const data = (await res.json()) as { error?: string; url?: string };
        if (!res.ok) throw new Error(data.error || "Upload failed.");
        if (data.url) uploadedUrls.push(data.url);
      }

      setColorGalleries((prev) => {
        const current = prev[colorName] || { mainImage: "", images: [] };
        const combined = Array.from(new Set([...current.images, ...uploadedUrls]));
        const effectiveMain = current.mainImage || uploadedUrls[0] || combined[0] || "";
        return {
          ...prev,
          [colorName]: {
            mainImage: effectiveMain,
            images: combined,
          },
        };
      });

      setIsDirty(true);
      toast.success(`Uploaded ${uploadedUrls.length} image(s) for color "${colorName}"`);
    } catch (e: any) {
      toast.error(e.message || "Failed to upload image");
    } finally {
      setColorImageUploading(false);
    }
  }

  function handleSetColorCoverImage(colorName: string, imgUrl: string) {
    setColorGalleries((prev) => {
      const current = prev[colorName] || { mainImage: "", images: [] };
      return {
        ...prev,
        [colorName]: {
          ...current,
          mainImage: imgUrl,
        },
      };
    });
    setIsDirty(true);
    toast.success(`Set primary cover image for "${colorName}"`);
  }

  function handleRemoveColorImage(colorName: string, imgUrl: string) {
    setColorGalleries((prev) => {
      const current = prev[colorName] || { mainImage: "", images: [] };
      const nextImgs = current.images.filter((img) => img !== imgUrl);
      const nextMain =
        current.mainImage === imgUrl ? nextImgs[0] || "" : current.mainImage;
      return {
        ...prev,
        [colorName]: {
          mainImage: nextMain,
          images: nextImgs,
        },
      };
    });
    setIsDirty(true);
  }

  function handleAddMainImageToColor(colorName: string, imgUrl: string) {
    setColorGalleries((prev) => {
      const current = prev[colorName] || { mainImage: "", images: [] };
      if (current.images.includes(imgUrl)) return prev;
      const combined = [...current.images, imgUrl];
      return {
        ...prev,
        [colorName]: {
          mainImage: current.mainImage || imgUrl,
          images: combined,
        },
      };
    });
    setIsDirty(true);
    toast.success(`Added photo to "${colorName}" gallery`);
  }

  // Filtered Variants for Table
  const filteredVariants = useMemo(() => {
    return variants.filter((v) => {
      if (tableColorFilter !== "all" && v.color !== tableColorFilter) return false;
      if (tableSizeFilter !== "all" && v.size !== tableSizeFilter) return false;
      if (tableStockFilter === "in_stock" && Number(v.stock || 0) <= 0) return false;
      if (tableStockFilter === "out_of_stock" && Number(v.stock || 0) > 0) return false;
      if (tableStockFilter === "low_stock") {
        const s = Number(v.stock || 0);
        if (s <= 0 || s > numLowAlert) return false;
      }
      if (tableSearchQuery.trim()) {
        const q = tableSearchQuery.toLowerCase();
        const t = (v.title || "").toLowerCase();
        const s = (v.sku || "").toLowerCase();
        if (!t.includes(q) && !s.includes(q)) return false;
      }
      return true;
    });
  }, [variants, tableColorFilter, tableSizeFilter, tableStockFilter, tableSearchQuery, numLowAlert]);

  // Bulk Operations Handlers
  function handleSelectAllFilteredVariants(checked: boolean) {
    if (checked) {
      setSelectedVariantIds(new Set(filteredVariants.map((v) => v.id)));
    } else {
      setSelectedVariantIds(new Set());
    }
  }

  function handleToggleVariantSelect(id: string) {
    setSelectedVariantIds((c) => {
      const next = new Set(c);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleUpdateVariant(id: string, field: keyof ProductVariant, value: any) {
    setVariants((c) => c.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
    setIsDirty(true);
  }

  // Bulk Quick Actions
  function handleApplyStockToAll() {
    const num = Number(quickBulkStock);
    if (!quickBulkStock.trim() || isNaN(num) || num < 0) {
      toast.error("Please enter a valid stock quantity.");
      return;
    }
    const targetIds =
      selectedVariantIds.size > 0
        ? selectedVariantIds
        : new Set(filteredVariants.map((v) => v.id));
    setVariants((curr) =>
      curr.map((v) => (targetIds.has(v.id) ? { ...v, stock: num } : v))
    );
    setIsDirty(true);
    toast.success(`Set stock to ${num} for ${targetIds.size} variant(s)`);
  }

  function handleBulkSetPrice() {
    const val = Number(bulkPriceInput);
    if (!Number.isFinite(val) || val < 0) {
      toast.error("Please enter a valid price.");
      return;
    }
    const targetIds =
      selectedVariantIds.size > 0
        ? selectedVariantIds
        : new Set(filteredVariants.map((v) => v.id));
    setVariants((c) =>
      c.map((v) => (targetIds.has(v.id) ? { ...v, price: val } : v))
    );
    setShowBulkPriceModal(false);
    setBulkPriceInput("");
    toast.success(`Price updated to ${money(val)} for ${targetIds.size} variant(s)`);
    setIsDirty(true);
  }

  function handleBulkSetStock() {
    const val = Number(bulkStockInput);
    if (!Number.isFinite(val) || val < 0) {
      toast.error("Please enter a valid stock quantity.");
      return;
    }
    const targetIds =
      selectedVariantIds.size > 0
        ? selectedVariantIds
        : new Set(filteredVariants.map((v) => v.id));
    setVariants((c) =>
      c.map((v) => (targetIds.has(v.id) ? { ...v, stock: val } : v))
    );
    setShowBulkStockModal(false);
    setBulkStockInput("");
    toast.success(`Stock updated to ${val} for ${targetIds.size} variant(s)`);
    setIsDirty(true);
  }

  function handleBulkSetStatus(newStatus: "Active" | "Draft") {
    const targetIds =
      selectedVariantIds.size > 0
        ? selectedVariantIds
        : new Set(filteredVariants.map((v) => v.id));
    setVariants((c) =>
      c.map((v) => (targetIds.has(v.id) ? { ...v, status: newStatus } : v))
    );
    toast.success(`Status set to ${newStatus} for ${targetIds.size} variant(s)`);
    setIsDirty(true);
  }

  function handleBulkGenerateSkus() {
    const baseSku = sku || slugify(name || "PROD").toUpperCase().slice(0, 8);
    const targetIds =
      selectedVariantIds.size > 0
        ? selectedVariantIds
        : new Set(filteredVariants.map((v) => v.id));

    setVariants((c) =>
      c.map((v) => {
        if (!targetIds.has(v.id)) return v;
        const colorPart = v.color ? slugify(v.color).toUpperCase().slice(0, 4) : "";
        const sizePart = v.size ? slugify(v.size).toUpperCase().slice(0, 4) : "";
        const skuParts = [colorPart, sizePart].filter(Boolean);
        return {
          ...v,
          sku: `${baseSku}-${skuParts.join("-") || "VAR"}`,
        };
      })
    );
    toast.success(`Regenerated SKUs for ${targetIds.size} variant(s)`);
    setIsDirty(true);
  }

  function handleBulkDeleteVariants() {
    setVariants((c) => c.filter((v) => !selectedVariantIds.has(v.id)));
    setSelectedVariantIds(new Set());
    toast.info("Selected variants removed");
    setIsDirty(true);
  }

  // 3-Tier Image Helper for Variant Row
  const productPreviewObject: Product = useMemo(() => {
    return {
      id: productId || "preview",
      name: name || "Product",
      price: numPrice,
      old: numOld,
      image: mainImage || images[0] || "",
      images,
      colorGalleries,
      variants,
    } as any;
  }, [productId, name, numPrice, numOld, mainImage, images, colorGalleries, variants]);

  // Form Validation
  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Product name is required.";
    }

    if (!category.trim()) {
      newErrors.category = "Please select a category.";
    }

    if (!hasVariants) {
      if (!price || Number(price) <= 0) {
        newErrors.price = "Enter a valid regular price greater than 0.";
      }
      if (oldPrice && Number(oldPrice) < Number(price)) {
        newErrors.oldPrice = "Compare-at price cannot be lower than the selling price.";
      }
    } else {
      if (variants.length === 0) {
        newErrors.variants = "Please select at least one size or color to generate variants.";
      }
      const duplicateSkus = new Set<string>();
      const seenSkus = new Set<string>();
      for (const v of variants) {
        if (v.sku) {
          if (seenSkus.has(v.sku)) duplicateSkus.add(v.sku);
          seenSkus.add(v.sku);
        }
      }
      if (duplicateSkus.size > 0) {
        newErrors.variants = `Duplicate SKU found: ${Array.from(duplicateSkus).join(", ")}`;
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error(Object.values(newErrors)[0]);
      return false;
    }
    return true;
  }

  // Save Product Handler
  async function handleSave(targetStatus?: "Active" | "Draft") {
    if (!validateForm()) return;

    setBusy(true);
    const saveStatus = targetStatus || status;

    try {
      const generatedId =
        productId ||
        (mode === "edit" && initialProductId
          ? initialProductId
          : `${slugify(name)}-${Date.now()}`);

      const effectiveMainImage =
        mainImage && images.includes(mainImage) ? mainImage : images[0] || "";

      // Derive Variant Options structure
      const variantOptionsPayload: Array<{ name: string; values: string[] }> = [];
      if (enableColorVariant && productColors.length > 0) {
        variantOptionsPayload.push({ name: "Color", values: productColors });
      }
      if (enableSizeVariant && selectedSizes.length > 0) {
        variantOptionsPayload.push({ name: "Size", values: selectedSizes });
      }

      const totalStock = hasVariants
        ? variants.reduce((sum, v) => sum + Number(v.stock || 0), 0)
        : Number(stock) || 0;

      const payload: ManagedProduct = {
        id: generatedId,
        name: name.trim(),
        category,
        subcategory: subcategory || "General",
        childCategory: childCategory || undefined,
        brand: brand || undefined,
        productType: productType || undefined,
        description: description || "",
        color: productColors[0] || undefined,
        sizes:
          hasVariants && enableSizeVariant && selectedSizes.length > 0
            ? selectedSizes
            : undefined,
        sku: sku || undefined,
        barcode: barcode || undefined,
        stock: totalStock,
        lowStockAlert: Number(lowStockAlert) || 5,
        trackInventory,
        allowBackorders,
        price: Number(price) || (variants[0]?.price ? Number(variants[0].price) : 0),
        old:
          Number(oldPrice) ||
          (variants[0]?.oldPrice ? Number(variants[0].oldPrice) : Number(price) || 0),
        costPrice: costPrice ? Number(costPrice) : undefined,
        image: effectiveMainImage,
        images,
        status: saveStatus,
        hasVariants,
        colorGalleries:
          hasVariants && enableColorVariant && Object.keys(colorGalleries).length > 0
            ? colorGalleries
            : undefined,
        variantOptions:
          hasVariants && variantOptionsPayload.length > 0 ? variantOptionsPayload : undefined,
        variants: hasVariants && variants.length > 0 ? variants : undefined,
        shipping: {
          weight: weight || undefined,
          length: length || undefined,
          width: width || undefined,
          height: height || undefined,
          freeShipping,
        },
        seo: {
          title: seoTitle || name,
          description: seoDescription || description.slice(0, 150),
          slug: slug || slugify(name),
        },
        storefront: {
          featured,
          newArrival,
          bestSeller,
          showOnStorefront: saveStatus === "Active",
        },
      };

      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "product", product: payload }),
      });

      const data = (await response.json()) as any;
      if (!response.ok) {
        throw new Error(data.error || "Failed to save product.");
      }

      setIsDirty(false);
      toast.success(
        mode === "create" ? "Product created successfully!" : "Product updated successfully!"
      );

      setTimeout(() => {
        location.href = "/admin?section=products";
      }, 600);
    } catch (err: any) {
      toast.error(err.message || "Unable to save product.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div
        className="product-editor-page"
        style={{ display: "grid", placeItems: "center", height: "70vh" }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <LoaderCircle size={32} className="animate-spin" style={{ color: "#2563eb" }} />
          <span style={{ fontSize: 14, color: "#64748b" }}>Loading product information…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="product-editor-page">
      {/* Sticky Top Header */}
      <header className="product-editor-topbar">
        <div className="product-editor-topbar-left">
          <a href="/admin?section=products" className="editor-back-button" title="Back to products">
            <ArrowLeft size={18} />
          </a>
          <div>
            <h1 className="product-editor-title">
              {mode === "create" ? "Add Product" : "Edit Product"}
              {isDirty && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#d97706",
                    background: "#fef3c7",
                    padding: "2px 8px",
                    borderRadius: 4,
                  }}
                >
                  Unsaved Changes
                </span>
              )}
            </h1>
          </div>
        </div>
      </header>

      {/* Main 2-Column Grid */}
      <main className="product-editor-container">
        {/* Left Main Column (70%) */}
        <div className="product-editor-main-col">
          {/* 1. Basic Information Card */}
          <section className="editor-card">
            <div className="editor-card-header">
              <h2>Product Information</h2>
              <small>Basic details and descriptions</small>
            </div>
            <div className="editor-card-body">
              <div className={`editor-field ${errors.name ? "has-error" : ""}`}>
                <label>
                  <span>
                    Product Name <span className="required-star">*</span>
                  </span>
                  <span className="editor-field-hint">{name.length}/120</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Premium Breathable Mesh Sneakers"
                  value={name}
                  maxLength={120}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
                {errors.name && <span className="editor-field-error">{errors.name}</span>}
              </div>

              <div className="editor-field">
                <label>Description</label>
                <div className="editor-richtext-wrap">
                  <div className="editor-textarea-toolbar">
                    <select
                      aria-label="Font family"
                      className="editor-toolbar-select"
                      onChange={(e) => runDescriptionCommand("fontName", e.target.value)}
                      defaultValue="Sans Serif"
                    >
                      <option>Sans Serif</option>
                      <option>Georgia</option>
                      <option>Times New Roman</option>
                      <option>Verdana</option>
                    </select>
                    <select
                      aria-label="Text style"
                      className="editor-toolbar-select"
                      onChange={(e) => runDescriptionCommand("formatBlock", e.target.value)}
                      defaultValue="p"
                    >
                      <option value="p">Normal</option>
                      <option value="h2">Heading 2</option>
                      <option value="h3">Heading 3</option>
                      <option value="h4">Heading 4</option>
                    </select>
                    <span className="editor-toolbar-group">
                      <RichTextButton title="Bold" onClick={() => runDescriptionCommand("bold")}><Bold size={15} /></RichTextButton>
                      <RichTextButton title="Italic" onClick={() => runDescriptionCommand("italic")}><Italic size={15} /></RichTextButton>
                      <RichTextButton title="Underline" onClick={() => runDescriptionCommand("underline")}><Underline size={15} /></RichTextButton>
                      <RichTextButton title="Strikethrough" onClick={() => runDescriptionCommand("strikeThrough")}><Strikethrough size={15} /></RichTextButton>
                    </span>
                    <span className="editor-toolbar-group">
                      <RichTextButton title="Text color" onClick={() => runDescriptionCommand("foreColor", "#203664")}>A</RichTextButton>
                      <RichTextButton title="Highlight" onClick={() => runDescriptionCommand("backColor", "#fff3bf")}><Highlighter size={15} /></RichTextButton>
                    </span>
                    <RichTextButton title="Superscript" onClick={() => runDescriptionCommand("superscript")}>x2</RichTextButton>
                    <RichTextButton title="Subscript" onClick={() => runDescriptionCommand("subscript")}>x2</RichTextButton>
                    <select
                      aria-label="Heading"
                      className="editor-toolbar-select editor-toolbar-heading"
                      onChange={(e) => runDescriptionCommand("formatBlock", e.target.value)}
                      defaultValue="h4"
                    >
                      <option value="h2">Heading 2</option>
                      <option value="h3">Heading 3</option>
                      <option value="h4">Heading 4</option>
                    </select>
                    <RichTextButton title="Quote" onClick={() => runDescriptionCommand("formatBlock", "blockquote")}><Quote size={15} /></RichTextButton>
                    <RichTextButton title="Code" onClick={() => runDescriptionCommand("formatBlock", "pre")}><Code2 size={15} /></RichTextButton>
                    <span className="editor-toolbar-break" />
                    <span className="editor-toolbar-group">
                      <RichTextButton title="Bulleted list" onClick={() => runDescriptionCommand("insertUnorderedList")}><List size={15} /></RichTextButton>
                      <RichTextButton title="Numbered list" onClick={() => runDescriptionCommand("insertOrderedList")}><ListOrdered size={15} /></RichTextButton>
                    </span>
                    <RichTextButton title="Decrease indent" onClick={() => runDescriptionCommand("outdent")}>‹</RichTextButton>
                    <RichTextButton title="Increase indent" onClick={() => runDescriptionCommand("indent")}>›</RichTextButton>
                    <span className="editor-toolbar-group">
                      <RichTextButton title="Align left" onClick={() => runDescriptionCommand("justifyLeft")}><AlignLeft size={15} /></RichTextButton>
                      <RichTextButton title="Align center" onClick={() => runDescriptionCommand("justifyCenter")}><AlignCenter size={15} /></RichTextButton>
                      <RichTextButton title="Align right" onClick={() => runDescriptionCommand("justifyRight")}><AlignRight size={15} /></RichTextButton>
                    </span>
                    <RichTextButton title="Insert link" onClick={insertDescriptionLink}><Link2 size={15} /></RichTextButton>
                    <RichTextButton title="Upload image" onClick={() => descriptionImageInputRef.current?.click()}><ImageIcon size={15} /> Image</RichTextButton>
                    <RichTextButton title="Insert image URL" onClick={insertDescriptionImageUrl}>URL</RichTextButton>
                    <RichTextButton title="Clear formatting" onClick={() => runDescriptionCommand("removeFormat")}><RemoveFormatting size={15} /></RichTextButton>
                    <input
                      ref={descriptionImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="editor-richtext-file"
                      onChange={(e) => uploadDescriptionImage(e.target.files?.[0])}
                    />
                    {descriptionUrlMode && (
                      <span className="editor-richtext-url">
                        <input
                          type="url"
                          placeholder={descriptionUrlMode === "image" ? "Image URL" : "Link URL"}
                          value={descriptionUrlValue}
                          onChange={(e) => setDescriptionUrlValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              applyDescriptionUrl();
                            }
                            if (e.key === "Escape") {
                              setDescriptionUrlMode(null);
                              setDescriptionUrlValue("");
                            }
                          }}
                          autoFocus
                        />
                        <button type="button" onClick={applyDescriptionUrl}>Add</button>
                        <button
                          type="button"
                          onClick={() => {
                            setDescriptionUrlMode(null);
                            setDescriptionUrlValue("");
                          }}
                        >
                          X
                        </button>
                      </span>
                    )}
                  </div>
                  <div
                    ref={descriptionEditorRef}
                    className="editor-richtext-surface"
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder="Describe product materials, fit, care instructions, and what is included in the package..."
                    dangerouslySetInnerHTML={{ __html: description }}
                    onInput={syncDescriptionFromEditor}
                    onBlur={syncDescriptionFromEditor}
                  />
                </div>
              </div>

              <div className="editor-grid-2">
                <div className="editor-field">
                  <label>Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Nike, Dressfair, Handmade"
                    value={brand}
                    onChange={(e) => {
                      setBrand(e.target.value);
                      setIsDirty(true);
                    }}
                  />
                </div>
                <div className="editor-field">
                  <label>Product Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Footwear, Apparel, Accessories"
                    value={productType}
                    onChange={(e) => {
                      setProductType(e.target.value);
                      setIsDirty(true);
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 2. Main Product Gallery Card */}
          <section className="editor-card">
            <div className="editor-card-header">
              <div>
                <h2>
                  <ImagePlus size={18} style={{ color: "#2563eb" }} /> Main Product Gallery (
                  {images.length} {images.length === 1 ? "image" : "images"})
                </h2>
                <small style={{ fontSize: 11.5, color: "#64748b" }}>
                  Default images representing the whole product when no color-specific image is
                  selected.
                </small>
              </div>
              <button
                type="button"
                className="editor-btn-secondary"
                style={{ padding: "5px 12px", fontSize: 12 }}
                onClick={() => setIsImageManagerOpen(true)}
              >
                Manage Gallery
              </button>
            </div>
            <div className="editor-card-body">
              {images.length === 0 ? (
                <div
                  onClick={() => setIsImageManagerOpen(true)}
                  style={{
                    border: "2px dashed #cbd5e1",
                    borderRadius: 10,
                    padding: "30px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: "#f8fafc",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "#e0e7ff",
                      color: "#4338ca",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Upload size={20} />
                  </div>
                  <b style={{ fontSize: 13, color: "#1e293b" }}>Click to upload main product photos</b>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>
                    Multi-upload JPG, PNG, or WebP up to 3MB each
                  </span>
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  {images.map((img, idx) => {
                    const isMain = img === mainImage || (!mainImage && idx === 0);
                    return (
                      <div
                        key={img + idx}
                        style={{
                          position: "relative",
                          width: 80,
                          height: 80,
                          borderRadius: 8,
                          border: isMain ? "2px solid #2563eb" : "1px solid #cbd5e1",
                          overflow: "hidden",
                          background: "#ffffff",
                        }}
                      >
                        <img
                          src={img.startsWith("/") || img.startsWith("http") ? img : `/images/${img}.jpg`}
                          alt={`Thumbnail ${idx + 1}`}
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                        {isMain && (
                          <span
                            style={{
                              position: "absolute",
                              top: 3,
                              left: 3,
                              background: "#2563eb",
                              color: "#fff",
                              fontSize: 8.5,
                              fontWeight: 800,
                              padding: "1px 4px",
                              borderRadius: 3,
                            }}
                          >
                            MAIN
                          </span>
                        )}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setIsImageManagerOpen(true)}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 8,
                      border: "2px dashed #cbd5e1",
                      background: "#f8fafc",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      color: "#475569",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    <Plus size={16} /> Add / Edit
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* 3. Product Structure & Options Card */}
          <section className="editor-card">
            <div className="editor-card-header">
              <h2>
                <Layers size={18} style={{ color: "#2563eb" }} /> Product Structure &amp; Options
              </h2>

              {/* Segmented Switch: Simple Product vs Has Variants */}
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-btn ${!hasVariants ? "active-light" : ""}`}
                  onClick={() => {
                    setHasVariants(false);
                    setIsDirty(true);
                  }}
                >
                  Simple Product
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${hasVariants ? "active" : ""}`}
                  onClick={() => {
                    setHasVariants(true);
                    if (productColors.length === 0 && selectedSizes.length === 0) {
                      setSelectedSizeType(categoryRecommendations.defaultSystemId);
                    }
                    setVariants(
                      buildVariantMatrix(
                        productColors,
                        selectedSizes,
                        variants,
                        enableColorVariant,
                        enableSizeVariant
                      )
                    );
                    setIsDirty(true);
                  }}
                >
                  Has Variants
                </button>
              </div>
            </div>

            <div className="editor-card-body">
              {!hasVariants ? (
                /* Simple Product Inventory Inputs */
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div
                    style={{
                      background: "#f8fafc",
                      padding: "12px 16px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
                      This product is configured as a <b>simple product</b> with single stock and pricing.
                    </p>
                  </div>

                  <div className="editor-grid-2">
                    <div className="editor-field">
                      <label>
                        <span>SKU (Stock Keeping Unit)</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSku(
                              `${slugify(name || "prod").toUpperCase().slice(0, 8)}-${Math.floor(
                                Math.random() * 900 + 100
                              )}`
                            );
                            setIsDirty(true);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#2563eb",
                            fontSize: 11,
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          Auto Generate
                        </button>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. SNEAK-BLK-40"
                        value={sku}
                        onChange={(e) => {
                          setSku(e.target.value);
                          setIsDirty(true);
                        }}
                      />
                    </div>

                    <div className="editor-field">
                      <label>Barcode / UPC (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. 890123456789"
                        value={barcode}
                        onChange={(e) => {
                          setBarcode(e.target.value);
                          setIsDirty(true);
                        }}
                      />
                    </div>
                  </div>

                  <div className="editor-grid-2">
                    <div className="editor-field">
                      <label>
                        <span>Stock Quantity</span>
                        <span className={`stock-badge-pill ${stockBadgeStatus.class}`}>
                          {stockBadgeStatus.label}
                        </span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={stock}
                        onChange={(e) => {
                          setStock(e.target.value);
                          setIsDirty(true);
                        }}
                      />
                    </div>

                    <div className="editor-field">
                      <label>Low Stock Alert Threshold</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="5"
                        value={lowStockAlert}
                        onChange={(e) => {
                          setLowStockAlert(e.target.value);
                          setIsDirty(true);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Variant Attribute Selectors */
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div
                    style={{
                      background: "#f0f9ff",
                      padding: "12px 16px",
                      borderRadius: 8,
                      border: "1px solid #bae6fd",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0369a1" }}>
                      Select attributes that create variants for this product:
                    </span>
                    <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          color: "#0f172a",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={enableColorVariant}
                          onChange={(e) => handleToggleColorOption(e.target.checked)}
                          style={{ width: 16, height: 16, accentColor: "#203664" }}
                        />
                        <Palette size={16} style={{ color: "#2563eb" }} /> Color
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          color: "#0f172a",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={enableSizeVariant}
                          onChange={(e) => handleToggleSizeOption(e.target.checked)}
                          style={{ width: 16, height: 16, accentColor: "#203664" }}
                        />
                        <Layers size={16} style={{ color: "#2563eb" }} /> Size
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 4. Colors & Color-Specific Galleries (When hasVariants & enableColorVariant) */}
          {hasVariants && enableColorVariant && (
            <section className="editor-card">
              <div className="editor-card-header">
                <h2>
                  <Palette size={18} style={{ color: "#2563eb" }} /> Colors &amp; Color-Specific Galleries
                </h2>
                <span style={{ fontSize: 11.5, color: "#64748b" }}>
                  {productColors.length} {productColors.length === 1 ? "color" : "colors"} configured
                </span>
              </div>
              <div className="editor-card-body">
                {/* Active Color Chips */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    minHeight: 34,
                    alignItems: "center",
                  }}
                >
                  {productColors.map((col, idx) => (
                    <span
                      key={col + idx}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: "#1e293b",
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: COLOR_HEX_MAP[col] || col.toLowerCase(),
                          border: "1px solid #94a3b8",
                        }}
                      />
                      {col}
                      <button
                        type="button"
                        onClick={() => handleRemoveColor(idx)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#64748b",
                          cursor: "pointer",
                          padding: 0,
                        }}
                        title={`Remove color ${col}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  {productColors.length === 0 && (
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>
                      No colors added yet. Select quick colors below or add a custom color name.
                    </span>
                  )}
                </div>

                {/* Quick Add Common Colors */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    background: "#f8fafc",
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#475569" }}>
                    + Quick Add Common Colors:
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {COMMON_COLORS.map((c) => {
                      const isAdded = productColors.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => !isAdded && handleAddColor(c)}
                          disabled={isAdded}
                          style={{
                            padding: "3px 8px",
                            borderRadius: 6,
                            border: isAdded ? "1px solid #e2e8f0" : "1px solid #cbd5e1",
                            background: isAdded ? "#f1f5f9" : "#ffffff",
                            color: isAdded ? "#94a3b8" : "#334155",
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: isAdded ? "default" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: COLOR_HEX_MAP[c] || c.toLowerCase(),
                              border: "1px solid #cbd5e1",
                            }}
                          />
                          {c}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Color Input */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <input
                      type="text"
                      placeholder="Add custom color name (e.g. Olive Green, Rose Gold)…"
                      value={customColorInput}
                      onChange={(e) => setCustomColorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddColor(customColorInput);
                        }
                      }}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        fontSize: 12,
                        flex: "1 1 200px",
                        maxWidth: 300,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddColor(customColorInput)}
                      disabled={!customColorInput.trim()}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 6,
                        background: customColorInput.trim() ? "#203664" : "#cbd5e1",
                        color: "#ffffff",
                        fontSize: 12,
                        fontWeight: 600,
                        border: "none",
                        cursor: customColorInput.trim() ? "pointer" : "not-allowed",
                      }}
                    >
                      <Plus
                        size={13}
                        style={{ display: "inline", verticalAlign: "middle", marginRight: 2 }}
                      />
                      Add Color
                    </button>
                  </div>
                </div>

                {/* Color-Specific Galleries Manager */}
                {productColors.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      marginTop: 6,
                      borderTop: "1px solid #e2e8f0",
                      paddingTop: 14,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <b style={{ fontSize: 13, color: "#0f172a" }}>Color-Specific Image Galleries</b>
                      <span style={{ fontSize: 11.5, color: "#64748b" }}>
                        Click a color tab to upload dedicated photos
                      </span>
                    </div>

                    {/* Color Tabs */}
                    <div className="color-gallery-tabs">
                      <button
                        type="button"
                        className={`color-gallery-tab ${activeColorGalleryTab === "all" ? "active" : ""}`}
                        onClick={() => setActiveColorGalleryTab("all")}
                      >
                        All Colors Overview
                      </button>
                      {productColors.map((col) => {
                        const count = colorGalleries[col]?.images?.length || 0;
                        return (
                          <button
                            key={col}
                            type="button"
                            className={`color-gallery-tab ${
                              activeColorGalleryTab === col ? "active" : ""
                            }`}
                            onClick={() => setActiveColorGalleryTab(col)}
                          >
                            <span
                              className="color-dot"
                              style={{ background: COLOR_HEX_MAP[col] || col.toLowerCase() }}
                            />
                            {col} ({count})
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Color Tab Content */}
                    {activeColorGalleryTab === "all" ? (
                      /* Overview of all colors */
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                          gap: 12,
                        }}
                      >
                        {productColors.map((col) => {
                          const cg = colorGalleries[col] || { mainImage: "", images: [] };
                          const coverImg = cg.mainImage || cg.images[0] || "";
                          return (
                            <div
                              key={col}
                              onClick={() => setActiveColorGalleryTab(col)}
                              style={{
                                padding: 12,
                                borderRadius: 8,
                                border: "1px solid #e2e8f0",
                                background: "#f8fafc",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 6,
                                  border: "1px solid #cbd5e1",
                                  overflow: "hidden",
                                  background: "#ffffff",
                                  flexShrink: 0,
                                }}
                              >
                                {coverImg ? (
                                  <img
                                    src={
                                      coverImg.startsWith("/") || coverImg.startsWith("http")
                                        ? coverImg
                                        : `/images/${coverImg}.jpg`
                                    }
                                    alt={col}
                                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      background: COLOR_HEX_MAP[col] || "#e2e8f0",
                                      opacity: 0.3,
                                    }}
                                  />
                                )}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <b style={{ fontSize: 12.5, color: "#1e293b" }}>{col}</b>
                                <span style={{ fontSize: 11, color: "#64748b" }}>
                                  {cg.images.length} {cg.images.length === 1 ? "image" : "images"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Specific Color Gallery Editor */
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                          background: "#f8fafc",
                          padding: 14,
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 10,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: "50%",
                                background:
                                  COLOR_HEX_MAP[activeColorGalleryTab] ||
                                  activeColorGalleryTab.toLowerCase(),
                                border: "1px solid #64748b",
                              }}
                            />
                            <b style={{ fontSize: 13.5, color: "#0f172a" }}>
                              {activeColorGalleryTab} Gallery (
                              {colorGalleries[activeColorGalleryTab]?.images?.length || 0} images)
                            </b>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {/* File Upload for This Color */}
                            <label
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "4px 10px",
                                borderRadius: 6,
                                background: "#203664",
                                color: "#ffffff",
                                fontSize: 11.5,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              <Upload size={13} /> Upload Photos
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                multiple
                                style={{ display: "none" }}
                                onChange={(e) =>
                                  handleColorImageUpload(activeColorGalleryTab, e.target.files)
                                }
                              />
                            </label>
                          </div>
                        </div>

                        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                          ℹ️ All sizes configured for <b>{activeColorGalleryTab}</b> will automatically use
                          this color's primary image unless specifically overridden.
                        </p>

                        {/* Color Image Grid */}
                        <div className="color-gallery-grid">
                          {(colorGalleries[activeColorGalleryTab]?.images || []).map((img, idx) => {
                            const isCover =
                              img === colorGalleries[activeColorGalleryTab]?.mainImage ||
                              (!colorGalleries[activeColorGalleryTab]?.mainImage && idx === 0);
                            return (
                              <div
                                key={img + idx}
                                className={`color-gallery-item ${isCover ? "is-cover" : ""}`}
                              >
                                <img
                                  src={
                                    img.startsWith("/") || img.startsWith("http")
                                      ? img
                                      : `/images/${img}.jpg`
                                  }
                                  alt={`${activeColorGalleryTab} ${idx + 1}`}
                                />
                                {isCover && (
                                  <span className="color-gallery-cover-badge">★ COVER</span>
                                )}
                                <div className="color-gallery-actions">
                                  {!isCover && (
                                    <button
                                      type="button"
                                      className="color-gallery-action-btn"
                                      title="Set as Cover Image"
                                      onClick={() =>
                                        handleSetColorCoverImage(activeColorGalleryTab, img)
                                      }
                                    >
                                      <Star size={12} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="color-gallery-action-btn"
                                    title="Delete from Color Gallery"
                                    onClick={() =>
                                      handleRemoveColorImage(activeColorGalleryTab, img)
                                    }
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {/* Quick pick from Main Gallery if available */}
                          {images.length > 0 && (
                            <div style={{ gridColumn: "1 / -1", marginTop: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                                Quick Add from Main Product Gallery:
                              </span>
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 6,
                                  marginTop: 4,
                                }}
                              >
                                {images.map((mImg, mIdx) => {
                                  const alreadyIn = (
                                    colorGalleries[activeColorGalleryTab]?.images || []
                                  ).includes(mImg);
                                  return (
                                    <button
                                      key={mImg + mIdx}
                                      type="button"
                                      disabled={alreadyIn}
                                      onClick={() =>
                                        handleAddMainImageToColor(activeColorGalleryTab, mImg)
                                      }
                                      style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: 6,
                                        border: alreadyIn
                                          ? "2px solid #22c55e"
                                          : "1px solid #cbd5e1",
                                        overflow: "hidden",
                                        cursor: alreadyIn ? "default" : "pointer",
                                        opacity: alreadyIn ? 0.6 : 1,
                                        background: "#fff",
                                        padding: 0,
                                      }}
                                      title={alreadyIn ? "Already added" : "Click to add to this color"}
                                    >
                                      <img
                                        src={
                                          mImg.startsWith("/") || mImg.startsWith("http")
                                            ? mImg
                                            : `/images/${mImg}.jpg`
                                        }
                                        alt="Thumbnail"
                                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                      />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 5. Sizes & Size Presets (When hasVariants & enableSizeVariant) */}
          {hasVariants && enableSizeVariant && (
            <section className="editor-card">
              <div className="editor-card-header">
                <h2>
                  <Layers size={18} style={{ color: "#2563eb" }} /> Sizes &amp; Size Systems
                </h2>
                {category && (
                  <span
                    style={{
                      fontSize: 11.5,
                      color: "#2563eb",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Sparkles size={13} /> Recommended for {category}:{" "}
                    {categoryRecommendations.recommendedIds
                      .map((id) => SIZE_SYSTEMS.find((s) => s.id === id)?.name)
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
              </div>

              <div className="editor-card-body">
                {/* Size System Presets */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#1e293b" }}>
                    Choose Size Type
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {SIZE_SYSTEMS.map((sys) => {
                      const isSelected = selectedSizeType === sys.id;
                      const isRecommended = categoryRecommendations.recommendedIds.includes(sys.id);
                      return (
                        <button
                          key={sys.id}
                          type="button"
                          onClick={() => setSelectedSizeType(sys.id)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: isSelected
                              ? "2px solid #203664"
                              : isRecommended
                              ? "1.5px solid #93c5fd"
                              : "1px solid #cbd5e1",
                            background: isSelected ? "#203664" : isRecommended ? "#eff6ff" : "#ffffff",
                            color: isSelected ? "#ffffff" : "#1e293b",
                            fontSize: 12,
                            fontWeight: isSelected || isRecommended ? 700 : 500,
                            cursor: "pointer",
                            transition: "all 0.12s ease",
                          }}
                        >
                          {sys.name}
                          {isRecommended && !isSelected && (
                            <span style={{ marginLeft: 4, fontSize: 10, color: "#2563eb" }}>★</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Visual Size Selector Field */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <SizeVariantField
                    label={`Sizes / Variants (${
                      SIZE_SYSTEMS.find((s) => s.id === selectedSizeType)?.name || "Size System"
                    })`}
                    selectedSizes={selectedSizes}
                    existingVariantData={existingVariantData}
                    onChange={(newSizes, systemId) => handleUpdateSizes(newSizes, systemId)}
                  />
                </div>
              </div>
            </section>
          )}

          {/* 6. Generated Combinations Matrix (When hasVariants) */}
          {hasVariants && (
            <section className="editor-card">
              <div className="editor-card-header">
                <div>
                  <h2>
                    <Layers size={18} style={{ color: "#2563eb" }} /> Generated Combinations (
                    {variants.length})
                  </h2>
                  {enableColorVariant &&
                    enableSizeVariant &&
                    productColors.length > 0 &&
                    selectedSizes.length > 0 && (
                      <small>
                        ({productColors.length} Colors × {selectedSizes.length} Sizes)
                      </small>
                    )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    padding: "4px 12px",
                    borderRadius: 20,
                  }}
                >
                  <span style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>
                    Total Variant Stock:
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#15803d" }}>
                    {computedTotalStock} units
                  </span>
                </div>
              </div>

              <div className="editor-card-body">
                {variants.length === 0 ? (
                  <div
                    style={{
                      padding: 24,
                      textAlign: "center",
                      background: "#f8fafc",
                      borderRadius: 8,
                      border: "1px dashed #cbd5e1",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                      No variants generated yet. Please configure at least one color or size above.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* Multi-Filter Strip & Search */}
                    <div className="variants-filter-strip">
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#475569",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Filter size={13} /> Filters:
                        </span>

                        {/* Color Filter */}
                        {productColors.length > 1 && (
                          <select
                            className="filter-select"
                            value={tableColorFilter}
                            onChange={(e) => setTableColorFilter(e.target.value)}
                          >
                            <option value="all">All Colors ({productColors.length})</option>
                            {productColors.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Size Filter */}
                        {selectedSizes.length > 1 && (
                          <select
                            className="filter-select"
                            value={tableSizeFilter}
                            onChange={(e) => setTableSizeFilter(e.target.value)}
                          >
                            <option value="all">All Sizes ({selectedSizes.length})</option>
                            {selectedSizes.map((s) => (
                              <option key={s} value={s}>
                                Size {s}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Stock Filter */}
                        <select
                          className="filter-select"
                          value={tableStockFilter}
                          onChange={(e) => setTableStockFilter(e.target.value)}
                        >
                          <option value="all">All Stock Statuses</option>
                          <option value="in_stock">In Stock (&gt; 0)</option>
                          <option value="low_stock">Low Stock (≤ {numLowAlert})</option>
                          <option value="out_of_stock">Out of Stock (0)</option>
                        </select>
                      </div>

                      {/* Quick Search */}
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          placeholder="Search variants or SKU…"
                          value={tableSearchQuery}
                          onChange={(e) => setTableSearchQuery(e.target.value)}
                          style={{
                            padding: "4px 8px 4px 26px",
                            fontSize: 12,
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            width: 170,
                          }}
                        />
                        <Search
                          size={13}
                          style={{
                            position: "absolute",
                            left: 8,
                            top: 8,
                            color: "#94a3b8",
                            pointerEvents: "none",
                          }}
                        />
                      </div>
                    </div>

                    {/* Bulk Quick Action Bar */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 10,
                        background: "#f8fafc",
                        padding: 10,
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#1e293b",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Zap size={13} style={{ color: "#eab308" }} /> Quick Set Stock:
                        </span>
                        <input
                          type="number"
                          min="0"
                          placeholder="Qty"
                          value={quickBulkStock}
                          onChange={(e) => setQuickBulkStock(e.target.value)}
                          style={{
                            width: 65,
                            padding: "3px 6px",
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            fontSize: 12,
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleApplyStockToAll}
                          disabled={!quickBulkStock.trim()}
                          className="bulk-btn"
                        >
                          Apply to {selectedVariantIds.size > 0 ? `${selectedVariantIds.size} Selected` : "Filtered"}
                        </button>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          type="button"
                          className="bulk-btn"
                          onClick={() => setShowBulkPriceModal(true)}
                        >
                          Set Price
                        </button>
                        <button
                          type="button"
                          className="bulk-btn"
                          onClick={() => setShowBulkStockModal(true)}
                        >
                          Set Stock
                        </button>
                        <button
                          type="button"
                          className="bulk-btn"
                          onClick={handleBulkGenerateSkus}
                        >
                          Generate SKUs
                        </button>
                      </div>
                    </div>

                    {/* Selected Rows Action Bar */}
                    {selectedVariantIds.size > 0 && (
                      <div className="bulk-actions-bar">
                        <span>
                          <b>{selectedVariantIds.size}</b> of {filteredVariants.length} variant(s)
                          selected
                        </span>
                        <div className="bulk-actions-buttons">
                          <button
                            type="button"
                            className="bulk-btn"
                            onClick={() => handleBulkSetStatus("Active")}
                          >
                            Activate
                          </button>
                          <button
                            type="button"
                            className="bulk-btn"
                            onClick={() => handleBulkSetStatus("Draft")}
                          >
                            Deactivate
                          </button>
                          <button
                            type="button"
                            className="bulk-btn"
                            style={{ color: "#dc2626", borderColor: "#fecaca" }}
                            onClick={handleBulkDeleteVariants}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Variants Matrix Table */}
                    <div className="variants-table-wrap">
                      <table className="variants-table">
                        <thead>
                          <tr>
                            <th style={{ width: 34 }}>
                              <input
                                type="checkbox"
                                checked={
                                  selectedVariantIds.size === filteredVariants.length &&
                                  filteredVariants.length > 0
                                }
                                onChange={(e) => handleSelectAllFilteredVariants(e.target.checked)}
                              />
                            </th>
                            <th style={{ width: 60 }}>Image</th>
                            <th>Variant</th>
                            <th>SKU</th>
                            <th>Price (Rs.)</th>
                            <th>Stock</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredVariants.map((v) => {
                            const isSelected = selectedVariantIds.has(v.id);
                            const eff = getVariantEffectiveImage(
                              productPreviewObject,
                              v,
                              v.color
                            );
                            const imgUrl = eff.url
                              ? eff.url.startsWith("/") || eff.url.startsWith("http")
                                ? eff.url
                                : `/images/${eff.url}.jpg`
                              : "";

                            return (
                              <tr
                                key={v.id}
                                style={{ background: isSelected ? "#f0f7ff" : undefined }}
                              >
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleVariantSelect(v.id)}
                                  />
                                </td>
                                <td>
                                  <div className="variant-img-cell">
                                    <button
                                      type="button"
                                      className="variant-thumbnail-btn"
                                      onClick={() => setOverrideModalVariant(v)}
                                      title="Click to customize image for this variant"
                                    >
                                      {imgUrl ? (
                                        <img src={imgUrl} alt={v.title || "Variant"} />
                                      ) : (
                                        <ImagePlus size={14} style={{ color: "#94a3b8" }} />
                                      )}
                                    </button>
                                    <span className={`var-badge ${eff.source}`}>
                                      {eff.source === "override"
                                        ? "Custom"
                                        : eff.source === "color"
                                        ? "Color"
                                        : "Main"}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <b style={{ fontSize: 12.5, color: "#0f172a" }}>
                                    {v.title || `${v.color || ""} / ${v.size || ""}`}
                                  </b>
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="variant-input-cell"
                                    value={v.sku || ""}
                                    placeholder="SKU"
                                    onChange={(e) => handleUpdateVariant(v.id, "sku", e.target.value)}
                                    style={{ width: 140 }}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min="0"
                                    className="variant-input-cell"
                                    value={v.price ?? ""}
                                    placeholder="Rs."
                                    onChange={(e) =>
                                      handleUpdateVariant(v.id, "price", Number(e.target.value))
                                    }
                                    style={{ width: 90 }}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min="0"
                                    className="variant-input-cell"
                                    value={v.stock ?? 0}
                                    placeholder="0"
                                    onChange={(e) =>
                                      handleUpdateVariant(v.id, "stock", Number(e.target.value))
                                    }
                                    style={{ width: 75 }}
                                  />
                                </td>
                                <td>
                                  <select
                                    className="variant-input-cell"
                                    value={v.status || "Active"}
                                    onChange={(e) =>
                                      handleUpdateVariant(v.id, "status", e.target.value as any)
                                    }
                                    style={{ width: 95 }}
                                  >
                                    <option value="Active">Active</option>
                                    <option value="Draft">Draft</option>
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 7. Master / Base Pricing Card */}
          <section className="editor-card">
            <div className="editor-card-header">
              <h2>Pricing</h2>
              <small>All prices in Pakistani Rupees (PKR / Rs.)</small>
            </div>
            <div className="editor-card-body">
              <div className="editor-grid-3">
                <div className={`editor-field ${errors.price ? "has-error" : ""}`}>
                  <label>
                    <span>
                      Sale Price (PKR) <span className="required-star">*</span>
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 2499"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      setIsDirty(true);
                      if (errors.price) setErrors((err) => ({ ...err, price: "" }));
                    }}
                  />
                  {errors.price && <span className="editor-field-error">{errors.price}</span>}
                </div>

                <div className={`editor-field ${errors.oldPrice ? "has-error" : ""}`}>
                  <label>
                    <span>Regular Price (PKR)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 3499 (Strike-through)"
                    value={oldPrice}
                    onChange={(e) => {
                      setOldPrice(e.target.value);
                      setIsDirty(true);
                      if (errors.oldPrice) setErrors((err) => ({ ...err, oldPrice: "" }));
                    }}
                  />
                  {errors.oldPrice && <span className="editor-field-error">{errors.oldPrice}</span>}
                </div>

                <div className="editor-field">
                  <label>
                    <span>Cost Price (PKR)</span>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>Admin only</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 1500 (For profit calculation)"
                    value={costPrice}
                    onChange={(e) => {
                      setCostPrice(e.target.value);
                      setIsDirty(true);
                    }}
                  />
                </div>
              </div>

              {/* Live Calculations Strip */}
              {(discountPercent > 0 || profitAmount !== null) && (
                <div className="pricing-kpis">
                  {discountPercent > 0 && (
                    <div className="pricing-kpi-item">
                      <span className="pricing-kpi-label">Discount</span>
                      <span className="pricing-kpi-val positive">{discountPercent}% OFF</span>
                    </div>
                  )}
                  {profitAmount !== null && (
                    <div className="pricing-kpi-item">
                      <span className="pricing-kpi-label">Est. Profit</span>
                      <span
                        className={`pricing-kpi-val ${profitAmount >= 0 ? "positive" : "negative"}`}
                      >
                        {money(profitAmount)}
                      </span>
                    </div>
                  )}
                  {profitMarginPercent !== null && (
                    <div className="pricing-kpi-item">
                      <span className="pricing-kpi-label">Profit Margin</span>
                      <span
                        className={`pricing-kpi-val ${
                          profitMarginPercent >= 0 ? "neutral" : "negative"
                        }`}
                      >
                        {profitMarginPercent}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* 8. Shipping (Collapsible) */}
          <section className="editor-card">
            <div
              className="editor-card-header"
              style={{ cursor: "pointer", userSelect: "none" }}
              onClick={() => setShippingOpen((v) => !v)}
            >
              <h2>Shipping</h2>
              <ChevronDown
                size={18}
                style={{
                  transform: shippingOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              />
            </div>
            {shippingOpen && (
              <div className="editor-card-body">
                <div className="switch-row" style={{ paddingTop: 0 }}>
                  <div className="switch-label-group">
                    <span className="switch-title">Free Shipping</span>
                    <span className="switch-desc">
                      Exclude this product from shipping fee calculations.
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`switch-btn ${freeShipping ? "active" : ""}`}
                    onClick={() => {
                      setFreeShipping((v) => !v);
                      setIsDirty(true);
                    }}
                  >
                    <span className="switch-handle" />
                  </button>
                </div>

                <div className="editor-grid-2">
                  <div className="editor-field">
                    <label>Weight (kg)</label>
                    <input
                      type="text"
                      placeholder="e.g. 0.5"
                      value={weight}
                      onChange={(e) => {
                        setWeight(e.target.value);
                        setIsDirty(true);
                      }}
                    />
                  </div>
                  <div className="editor-field">
                    <label>Package Dimensions (L × W × H cm)</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                      <input
                        type="text"
                        placeholder="L"
                        value={length}
                        onChange={(e) => {
                          setLength(e.target.value);
                          setIsDirty(true);
                        }}
                      />
                      <input
                        type="text"
                        placeholder="W"
                        value={width}
                        onChange={(e) => {
                          setWidth(e.target.value);
                          setIsDirty(true);
                        }}
                      />
                      <input
                        type="text"
                        placeholder="H"
                        value={height}
                        onChange={(e) => {
                          setHeight(e.target.value);
                          setIsDirty(true);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 9. Search Engine Optimization (SEO) (Collapsible) */}
          <section className="editor-card">
            <div
              className="editor-card-header"
              style={{ cursor: "pointer", userSelect: "none" }}
              onClick={() => setSeoOpen((v) => !v)}
            >
              <h2>Search Engine Optimization (SEO)</h2>
              <ChevronDown
                size={18}
                style={{
                  transform: seoOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              />
            </div>
            {seoOpen && (
              <div className="editor-card-body">
                {/* Google Preview */}
                <div className="seo-preview-card">
                  <span className="seo-preview-url">
                    https://dressfair.pk/product/<b>{slug || "product-url"}</b>
                  </span>
                  <a className="seo-preview-title" href="#" onClick={(e) => e.preventDefault()}>
                    {seoTitle || name || "Product Title Preview"} | Dressfair.pk
                  </a>
                  <p className="seo-preview-snippet">
                    {seoDescription ||
                      description.slice(0, 150) ||
                      "Add a meta description to see how your product listing appears in Google search engine results."}
                  </p>
                </div>

                <div className="editor-field">
                  <label>SEO Title</label>
                  <input
                    type="text"
                    placeholder="Defaults to product name if empty"
                    value={seoTitle}
                    onChange={(e) => {
                      setSeoTitle(e.target.value);
                      setIsDirty(true);
                    }}
                  />
                </div>

                <div className="editor-field">
                  <label>Meta Description</label>
                  <textarea
                    placeholder="Brief description for search engines (up to 160 characters)"
                    value={seoDescription}
                    maxLength={160}
                    onChange={(e) => {
                      setSeoDescription(e.target.value);
                      setIsDirty(true);
                    }}
                    style={{ minHeight: 60 }}
                  />
                </div>

                <div className="editor-field">
                  <label>
                    <span>URL Handle / Slug</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSlugManual(false);
                        setSlug(slugify(name));
                        setIsDirty(true);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#2563eb",
                        fontSize: 11,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Reset to title
                    </button>
                  </label>
                  <input
                    type="text"
                    placeholder="product-url-slug"
                    value={slug}
                    onChange={(e) => {
                      setSlug(slugify(e.target.value));
                      setIsSlugManual(true);
                      setIsDirty(true);
                    }}
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Sidebar Column (30%) */}
        <div className="product-editor-side-col">
          {/* Status & Visibility Card */}
          <section className="editor-card">
            <div className="editor-card-header">
              <h2>Publishing</h2>
            </div>
            <div className="editor-card-body">
              <div className="editor-field">
                <label>Product Status</label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as "Active" | "Draft");
                    setIsDirty(true);
                  }}
                  style={{ fontWeight: 600, color: status === "Active" ? "#16a34a" : "#64748b" }}
                >
                  <option value="Active">● Active (Visible to customers)</option>
                  <option value="Draft">○ Draft (Hidden from storefront)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Category Organization Card (Dependent) */}
          <section className="editor-card">
            <div className="editor-card-header">
              <h2>Category &amp; Organization</h2>
            </div>
            <div className="editor-card-body">
              <div className={`editor-field ${errors.category ? "has-error" : ""}`}>
                <label>
                  <span>
                    Category <span className="required-star">*</span>
                  </span>
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setSubcategory("");
                    setChildCategory("");
                    setIsDirty(true);
                    if (errors.category) setErrors((err) => ({ ...err, category: "" }));
                  }}
                >
                  <option value="">-- Choose Category --</option>
                  {(categoryTree.length ? categoryTree.map((c) => c.name) : defaultCategories).map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    )
                  )}
                </select>
                {errors.category && <span className="editor-field-error">{errors.category}</span>}
              </div>

              {/* Subcategory */}
              {subcategoryOptions.length > 0 && (
                <div className="editor-field">
                  <label>Subcategory</label>
                  <select
                    value={subcategory}
                    onChange={(e) => {
                      setSubcategory(e.target.value);
                      setChildCategory("");
                      setIsDirty(true);
                    }}
                  >
                    <option value="">-- Choose Subcategory --</option>
                    {subcategoryOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Child Category */}
              {childCategoryOptions.length > 0 && (
                <div className="editor-field">
                  <label>Child Category</label>
                  <select
                    value={childCategory}
                    onChange={(e) => {
                      setChildCategory(e.target.value);
                      setIsDirty(true);
                    }}
                  >
                    <option value="">-- Choose Child Category --</option>
                    {childCategoryOptions.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* Storefront Badges Card */}
          <section className="editor-card">
            <div className="editor-card-header">
              <h2>Storefront Badges</h2>
            </div>
            <div className="editor-card-body">
              <div className="switch-row">
                <span className="switch-title">Featured Product</span>
                <button
                  type="button"
                  className={`switch-btn ${featured ? "active" : ""}`}
                  onClick={() => {
                    setFeatured((v) => !v);
                    setIsDirty(true);
                  }}
                >
                  <span className="switch-handle" />
                </button>
              </div>

              <div className="switch-row">
                <span className="switch-title">New Arrival</span>
                <button
                  type="button"
                  className={`switch-btn ${newArrival ? "active" : ""}`}
                  onClick={() => {
                    setNewArrival((v) => !v);
                    setIsDirty(true);
                  }}
                >
                  <span className="switch-handle" />
                </button>
              </div>

              <div className="switch-row">
                <span className="switch-title">Best Seller</span>
                <button
                  type="button"
                  className={`switch-btn ${bestSeller ? "active" : ""}`}
                  onClick={() => {
                    setBestSeller((v) => !v);
                    setIsDirty(true);
                  }}
                >
                  <span className="switch-handle" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Sticky Bottom Action Bar */}
      <footer className="product-editor-bottombar">
        <a href="/admin?section=products" className="editor-btn-secondary">
          Cancel
        </a>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="editor-btn-secondary"
            disabled={busy}
            onClick={() => handleSave("Draft")}
          >
            Save as Draft
          </button>
          <button
            type="button"
            className="editor-btn-primary"
            disabled={busy}
            onClick={() => handleSave("Active")}
          >
            {busy ? (
              <>
                <LoaderCircle size={15} className="animate-spin" /> Saving…
              </>
            ) : (
              <>
                <CheckCircle2 size={16} /> Save &amp; Publish
              </>
            )}
          </button>
        </div>
      </footer>

      {/* Integrated Main Gallery Image Manager Modal */}
      <ImageManager
        product={
          {
            id: productId || "new-prod",
            name: name || "Product",
            price: Number(price) || 0,
            old: Number(oldPrice) || 0,
            image: mainImage || images[0] || "",
            images,
            category: category || "Fashion",
            status: status as any,
          } as any
        }
        open={isImageManagerOpen}
        busy={busy}
        onOpenChange={(open) => setIsImageManagerOpen(open)}
        onSave={async (updatedProd) => {
          setImages(updatedProd.images || []);
          setMainImage(updatedProd.image || "");
          setIsDirty(true);
          toast.success("Main product images updated");
        }}
      />

      {/* Variant Image Override Modal */}
      {overrideModalVariant && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              maxWidth: 440,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <b style={{ fontSize: 16, color: "#0f172a" }}>
                Variant Image: {overrideModalVariant.title}
              </b>
              <button
                type="button"
                onClick={() => setOverrideModalVariant(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Current Resolved Image */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "#f8fafc",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  overflow: "hidden",
                  background: "#fff",
                  flexShrink: 0,
                }}
              >
                {(() => {
                  const eff = getVariantEffectiveImage(
                    productPreviewObject,
                    overrideModalVariant,
                    overrideModalVariant.color
                  );
                  const u = eff.url
                    ? eff.url.startsWith("/") || eff.url.startsWith("http")
                      ? eff.url
                      : `/images/${eff.url}.jpg`
                    : "";
                  return u ? (
                    <img src={u} alt="Current" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  ) : null;
                })()}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
                  Source:{" "}
                  {overrideModalVariant.image
                    ? "Custom Override (This Variant Only)"
                    : overrideModalVariant.color && colorGalleries[overrideModalVariant.color]?.mainImage
                    ? `Color Primary Image (${overrideModalVariant.color})`
                    : "Main Product Gallery Fallback"}
                </span>
                {overrideModalVariant.image && (
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateVariant(overrideModalVariant.id, "image", undefined);
                      setOverrideModalVariant((v) => (v ? { ...v, image: undefined } : null));
                      toast.success("Reverted to color gallery default image");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2563eb",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                      textAlign: "left",
                    }}
                  >
                    Reset to Color Default
                  </button>
                )}
              </div>
            </div>

            {/* Quick Pick from Available Galleries */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                Choose from existing gallery images:
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 120, overflowY: "auto" }}>
                {Array.from(
                  new Set([
                    ...images,
                    ...(overrideModalVariant.color
                      ? colorGalleries[overrideModalVariant.color]?.images || []
                      : []),
                  ])
                ).map((gImg, gIdx) => (
                  <button
                    key={gImg + gIdx}
                    type="button"
                    onClick={() => {
                      handleUpdateVariant(overrideModalVariant.id, "image", gImg);
                      setOverrideModalVariant((v) => (v ? { ...v, image: gImg } : null));
                      toast.success("Variant image updated");
                    }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 6,
                      border:
                        overrideModalVariant.image === gImg
                          ? "2px solid #2563eb"
                          : "1px solid #cbd5e1",
                      overflow: "hidden",
                      background: "#fff",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <img
                      src={gImg.startsWith("/") || gImg.startsWith("http") ? gImg : `/images/${gImg}.jpg`}
                      alt="Thumbnail"
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Upload or Direct URL Input */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                Or upload / specify image URL:
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="https://… or image path"
                  value={overrideImageUrlInput}
                  onChange={(e) => setOverrideImageUrlInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 12,
                  }}
                />
                <button
                  type="button"
                  className="bulk-btn"
                  onClick={() => {
                    if (!overrideImageUrlInput.trim()) return;
                    handleUpdateVariant(overrideModalVariant.id, "image", overrideImageUrlInput.trim());
                    setOverrideModalVariant((v) => (v ? { ...v, image: overrideImageUrlInput.trim() } : null));
                    setOverrideImageUrlInput("");
                    toast.success("Custom image assigned to variant");
                  }}
                >
                  Set URL
                </button>
              </div>

              <label
                style={{
                  marginTop: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "1px dashed #cbd5e1",
                  background: "#f8fafc",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                <Upload size={14} /> Upload New Image File
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const res = await fetch("/api/media", {
                        method: "POST",
                        headers: { "Content-Type": f.type },
                        body: f,
                      });
                      const d = (await res.json()) as any;
                      if (!res.ok) throw new Error(d.error || "Upload failed");
                      if (d.url) {
                        handleUpdateVariant(overrideModalVariant.id, "image", d.url);
                        setOverrideModalVariant((v) => (v ? { ...v, image: d.url } : null));
                        toast.success("Image uploaded and assigned to variant");
                      }
                    } catch (err: any) {
                      toast.error(err.message || "Failed to upload file");
                    }
                  }}
                />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <button
                type="button"
                className="editor-btn-secondary"
                onClick={() => setOverrideModalVariant(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Set Price Modal */}
      {showBulkPriceModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              maxWidth: 360,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <b style={{ fontSize: 16, color: "#0f172a" }}>
              Set Price for{" "}
              {selectedVariantIds.size > 0
                ? `${selectedVariantIds.size} Selected`
                : `${filteredVariants.length} Filtered`}{" "}
              Variant(s)
            </b>
            <div className="editor-field">
              <label>Price in PKR (Rs.)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 2499"
                value={bulkPriceInput}
                onChange={(e) => setBulkPriceInput(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="editor-btn-secondary"
                onClick={() => setShowBulkPriceModal(false)}
              >
                Cancel
              </button>
              <button type="button" className="editor-btn-primary" onClick={handleBulkSetPrice}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Set Stock Modal */}
      {showBulkStockModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              maxWidth: 360,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <b style={{ fontSize: 16, color: "#0f172a" }}>
              Set Stock for{" "}
              {selectedVariantIds.size > 0
                ? `${selectedVariantIds.size} Selected`
                : `${filteredVariants.length} Filtered`}{" "}
              Variant(s)
            </b>
            <div className="editor-field">
              <label>Stock Quantity</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 25"
                value={bulkStockInput}
                onChange={(e) => setBulkStockInput(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="editor-btn-secondary"
                onClick={() => setShowBulkStockModal(false)}
              >
                Cancel
              </button>
              <button type="button" className="editor-btn-primary" onClick={handleBulkSetStock}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
