import { Product, ProductVariant, effectivePrice } from "@/app/catalog";

/**
 * Type representing the availability status of a product or variant.
 */
export type InventoryStatus = "In Stock" | "Low Stock" | "Out of Stock" | "Inactive";

export interface ColorAvailabilityGroup {
  name: string;
  hex?: string;
  image: string;
  images: string[];
  totalStock: number;
  availableStock: number;
  variants: ProductVariant[];
  availableVariants: ProductVariant[];
  purchasable: boolean;
}

export interface CartValidationItem {
  id: string;
  size: string;
  color?: string;
  variantId?: string;
  requestedQty: number;
  availableStock: number;
  purchasable: boolean;
  unitPrice: number;
  totalPrice: number;
  productName: string;
  sku: string;
  image: string;
  status: "ok" | "adjusted" | "out_of_stock" | "inactive" | "not_found";
  message?: string;
}

export interface CartValidationResult {
  valid: boolean;
  hasAdjustments: boolean;
  hasRemovals: boolean;
  items: CartValidationItem[];
  subtotal: number;
  itemCount: number;
}

export interface InventoryMovementRecord {
  id?: string;
  productId: string;
  variantId?: string;
  sku?: string;
  previousStock: number;
  change: number;
  newStock: number;
  reason:
    | "Sale"
    | "Cancellation"
    | "Return Restock"
    | "Manual Adjustment"
    | "Import"
    | "Damage"
    | "Correction"
    | "Initial";
  orderId?: string;
  actorId?: string;
  actorName?: string;
  createdAt?: string;
}

export interface SizeAvailabilityDetails {
  status: "available" | "out_of_stock" | "unavailable" | "not_found";
  stock: number;
  isPurchasable: boolean;
  message: string;
  label: string;
  reason?: string;
}

/**
 * 1. Checks if a variant (or simple product option) is purchasable.
 *
 * A variant is purchasable only when ALL conditions are met:
 * - Product is Active
 * - Product Storefront Visibility is enabled (showOnStorefront !== false)
 * - Variant is Active (not Inactive/Draft)
 * - Available Stock > 0 (or allowBackorders is true)
 */
export function isVariantPurchasable(
  product: Product,
  variant: ProductVariant | null,
  size?: string,
  color?: string
): boolean {
  // Product-level checks
  if (product.status && product.status !== "Active") return false;
  if (product.storefront?.showOnStorefront === false) return false;

  const allowsBackorders = Boolean(product.allowBackorders);

  // Variant-level checks if variant object provided
  if (variant) {
    if (variant.status && variant.status !== "Active") return false;
    const available = getVariantAvailableStock(product, variant);
    return allowsBackorders || available > 0;
  }

  // If size and/or color is specified, find matching variant in product.variants if present
  if (Array.isArray(product.variants) && product.variants.length > 0 && size) {
    const matched = product.variants.find((v) =>
      (v.size || "Standard") === size &&
      (!color || (v.color || "Standard").toLowerCase() === color.toLowerCase())
    );

    if (matched) {
      if (matched.status && matched.status !== "Active") return false;
      const available = getVariantAvailableStock(product, matched);
      return allowsBackorders || available > 0;
    }
  }

  // If sizeStock is used on simple product
  const sizeStock = product.sizeStock as Record<string, number> | undefined;
  if (sizeStock && size && Object.prototype.hasOwnProperty.call(sizeStock, size)) {
    const stockVal = Number(sizeStock[size] || 0);
    return allowsBackorders || stockVal > 0;
  }

  // Simple product stock check
  const available = getVariantAvailableStock(product, null, size, color);
  return allowsBackorders || available > 0;
}

/**
 * Returns detailed size availability information (status, stock, friendly label & tooltip reason).
 */
export function getSizeAvailabilityDetails(
  product: Product,
  size: string,
  color?: string
): SizeAvailabilityDetails {
  if (product.status && product.status !== "Active") {
    return {
      status: "unavailable",
      stock: 0,
      isPurchasable: false,
      message: `"${product.name}" is currently unavailable.`,
      label: "Unavailable",
      reason: "This product is currently not available for purchase.",
    };
  }

  if (product.storefront?.showOnStorefront === false) {
    return {
      status: "unavailable",
      stock: 0,
      isPurchasable: false,
      message: `"${product.name}" is hidden from storefront.`,
      label: "Unavailable",
      reason: "This product is currently not available for purchase.",
    };
  }

  const allowsBackorders = Boolean(product.allowBackorders);

  // Variant product check
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const matched = product.variants.find((v) =>
      (v.size || "Standard") === size &&
      (!color || (v.color || "Standard").toLowerCase() === color.toLowerCase())
    );

    if (!matched) {
      return {
        status: "unavailable",
        stock: 0,
        isPurchasable: false,
        message: `Size ${size} is not configured for this color.`,
        label: "Unavailable",
        reason: "This size option is not available.",
      };
    }

    if (matched.status && matched.status !== "Active") {
      return {
        status: "unavailable",
        stock: 0,
        isPurchasable: false,
        message: `Size ${size} is currently unavailable.`,
        label: "Unavailable",
        reason: "This size is currently not available for purchase.",
      };
    }

    const available = getVariantAvailableStock(product, matched);
    if (available <= 0 && !allowsBackorders) {
      return {
        status: "out_of_stock",
        stock: 0,
        isPurchasable: false,
        message: `Size ${size} is out of stock.`,
        label: "Out of Stock",
        reason: "This size is currently unavailable.",
      };
    }

    return {
      status: "available",
      stock: available,
      isPurchasable: true,
      message: `Size ${size} is available (${available} in stock).`,
      label: "In Stock",
    };
  }

  // Simple product with sizeStock
  const sizeStock = product.sizeStock as Record<string, number> | undefined;
  if (sizeStock && Object.prototype.hasOwnProperty.call(sizeStock, size)) {
    const stockVal = Number(sizeStock[size] || 0);
    if (stockVal <= 0 && !allowsBackorders) {
      return {
        status: "out_of_stock",
        stock: 0,
        isPurchasable: false,
        message: `Size ${size} is out of stock.`,
        label: "Out of Stock",
        reason: "This size is currently unavailable.",
      };
    }
    return {
      status: "available",
      stock: stockVal,
      isPurchasable: true,
      message: `Size ${size} is available (${stockVal} in stock).`,
      label: "In Stock",
    };
  }

  // Simple product fallback
  const stockVal = Number(product.stock ?? 0);
  if (stockVal <= 0 && !allowsBackorders) {
    return {
      status: "out_of_stock",
      stock: 0,
      isPurchasable: false,
      message: "This item is out of stock.",
      label: "Out of Stock",
      reason: "This item is currently unavailable.",
    };
  }

  return {
    status: "available",
    stock: stockVal,
    isPurchasable: true,
    message: `Available (${stockVal} in stock).`,
    label: "In Stock",
  };
}

/**
 * 2. Computes the available stock for a variant or simple product.
 * Available Stock = max(0, Physical Stock - Reserved Stock)
 */
export function getVariantAvailableStock(
  product: Product,
  variant: ProductVariant | null,
  size?: string,
  color?: string
): number {
  if (!variant && product.variants?.length && size) {
    const matched = product.variants.find(v => (v.size || 'Standard') === size &&
      (!color || (v.color || '').toLowerCase() === color.toLowerCase()));
    return matched ? getVariantAvailableStock(product, matched) : 0;
  }
  if (variant) {
    const physical = Number(variant.stock ?? 0);
    return Math.max(0, physical);
  }

  // Check size-specific stock if defined
  const sizeStock = product.sizeStock as Record<string, number> | undefined;
  if (sizeStock && size && Object.prototype.hasOwnProperty.call(sizeStock, size)) {
    return Math.max(0, Number(sizeStock[size] || 0));
  }

  // Check product-level stock
  if (product.stock !== undefined) {
    return Math.max(0, Number(product.stock));
  }

  return 0;
}

/**
 * 3. Returns all purchasable variants for a product.
 */
export function getAvailableVariants(product: Product): ProductVariant[] {
  if (!Array.isArray(product.variants) || product.variants.length === 0) {
    return [];
  }
  return product.variants.filter((v) => isVariantPurchasable(product, v));
}

/**
 * 4. Extracts color availability groups for a product.
 * A color group is returned ONLY if it contains at least one purchasable variant,
 * OR if includeAll=true (used in Admin).
 */
export function getColorGroups(
  product: Product,
  includeAll = false
): ColorAvailabilityGroup[] {
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;

  if (hasVariants) {
    const map = new Map<string, ColorAvailabilityGroup>();

    for (const v of product.variants!) {
      const cName = (v.color || "Standard").trim();
      const available = getVariantAvailableStock(product, v);
      const isPurchasable = isVariantPurchasable(product, v);

      const colorGallery = product.colorGalleries?.[cName];
      const colorGalleryImages = colorGallery?.images || [];
      const primaryImage =
        v.image ||
        colorGallery?.mainImage ||
        colorGalleryImages[0] ||
        product.image ||
        "";
      const groupImages =
        colorGalleryImages.length > 0
          ? colorGalleryImages
          : v.images && v.images.length
          ? v.images
          : v.image
          ? [v.image]
          : [];

      if (!map.has(cName)) {
        map.set(cName, {
          name: cName,
          hex: v.colorHex,
          image: primaryImage,
          images: groupImages,
          totalStock: Number(v.stock || 0),
          availableStock: available,
          variants: [v],
          availableVariants: isPurchasable ? [v] : [],
          purchasable: isPurchasable,
        });
      } else {
        const group = map.get(cName)!;
        group.variants.push(v);
        group.totalStock += Number(v.stock || 0);
        group.availableStock += available;
        if (isPurchasable) {
          group.availableVariants.push(v);
          group.purchasable = true;
        }
        if ((!group.images || group.images.length === 0) && groupImages.length > 0) {
          group.images = groupImages;
        }
      }
    }

    const groups = Array.from(map.values());
    if (includeAll) return groups;
    return groups.filter((g) => g.purchasable);
  }

  // Simple product fallback
  const isPurchasable = isProductPurchasable(product);
  if (!isPurchasable && !includeAll) return [];

  const defaultColor = product.color || "Standard";
  const allImgs = Array.from(new Set([product.image, ...(product.images || [])].filter(Boolean) as string[]));
  const totalStock = Number(product.stock ?? 0);

  return [
    {
      name: defaultColor,
      image: product.image || "",
      images: allImgs,
      totalStock,
      availableStock: Math.max(0, totalStock),
      variants: [],
      availableVariants: [],
      purchasable: isPurchasable,
    },
  ];
}

/**
 * 5. Returns available sizes for a given color on a product.
 * Returns only sizes that have Available Stock > 0 (or allowBackorders).
 * If includeAll=true, returns all configured sizes (for Admin).
 */
export function getSizesForColor(
  product: Product,
  colorName?: string,
  includeAll = false
): string[] {
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;

  if (hasVariants) {
    let variants = product.variants!;
    if (colorName) {
      variants = variants.filter(
        (v) => (v.color || "Standard").toLowerCase() === colorName.toLowerCase()
      );
    }
    if (!includeAll) {
      variants = variants.filter((v) => isVariantPurchasable(product, v));
    }
    const sizes = Array.from(
      new Set(variants.map((v) => (v.size || "Standard").trim()).filter(Boolean))
    );
    return sizes.length > 0 ? sizes : includeAll ? ["Standard"] : [];
  }

  // Simple product with sizeStock
  const sizeStock = product.sizeStock as Record<string, number> | undefined;
  if (sizeStock && Object.keys(sizeStock).length > 0) {
    const keys = Object.keys(sizeStock);
    if (includeAll) return keys;
    const availableKeys = keys.filter(
      (s) => Number(sizeStock[s] || 0) > 0 || Boolean(product.allowBackorders)
    );
    return availableKeys.length > 0 ? availableKeys : [];
  }

  if (product.sizes?.length) {
    if (includeAll || isProductPurchasable(product)) {
      return product.sizes;
    }
    return [];
  }

  return isProductPurchasable(product) || includeAll ? ["Standard"] : [];
}

/**
 * 6. Checks whether the entire product is purchasable.
 *
 * For Variant Products: At least 1 purchasable variant exists.
 * For Simple Products: Product is Active, Storefront Visible, and Available Stock > 0 (or backorders enabled).
 */
export function isProductPurchasable(product: Product): boolean {
  if (product.status && product.status !== "Active") return false;
  if (product.storefront?.showOnStorefront === false) return false;

  const allowsBackorders = Boolean(product.allowBackorders);

  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  if (hasVariants) {
    return product.variants!.some((v) => isVariantPurchasable(product, v));
  }
  if (allowsBackorders) return true;

  const sizeStock = product.sizeStock as Record<string, number> | undefined;
  if (sizeStock && Object.keys(sizeStock).length > 0) {
    return Object.values(sizeStock).some((val) => Number(val) > 0);
  }

  return (product.stock !== undefined ? Number(product.stock) : 0) > 0;
}

/**
 * 7. Filters products for storefront discovery feeds (Home, Shop, Categories, Search, etc.).
 * Automatically removes products that have zero available purchasable stock.
 */
export function filterStorefrontProducts(products: Product[]): Product[] {
  return products.filter((p) => isProductPurchasable(p));
}

/**
 * 8. Returns formatted inventory status badge for admin / UI.
 */
export function getInventoryStatus(
  product: Product,
  variant?: ProductVariant | null
): InventoryStatus {
  if (product.status && product.status !== "Active") return "Inactive";
  if (variant && variant.status && variant.status !== "Active") return "Inactive";

  const threshold = Number(product.lowStockAlert ?? 5);
  const stock = variant
    ? getVariantAvailableStock(product, variant)
    : (Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants.reduce((acc, v) => acc + getVariantAvailableStock(product, v), 0)
        : getVariantAvailableStock(product, null));

  if (stock <= 0) {
    return product.allowBackorders ? "Low Stock" : "Out of Stock";
  }
  if (stock <= threshold) {
    return "Low Stock";
  }
  return "In Stock";
}

/**
 * 9. Revalidates a customer's cart against live catalog products.
 * Adjusts excess quantities, flags unavailable items, and calculates prices securely.
 */
export function validateCartItems(
  items: Array<{ id: string; size: string; color?: string; variantId?: string; qty: number }>,
  catalogProducts: Product[]
): CartValidationResult {
  const resultItems: CartValidationItem[] = [];
  let hasAdjustments = false;
  let hasRemovals = false;
  let subtotal = 0;
  let itemCount = 0;
  const reserved = new Map<string, number>();
  const productsById = new Map<string, Product>();
  for (const product of catalogProducts) {
    if (!productsById.has(product.id)) productsById.set(product.id, product);
  }

  for (const item of items) {
    const prod = productsById.get(item.id);
    if (!prod) {
      resultItems.push({
        id: item.id,
        size: item.size,
        color: item.color,
        variantId: item.variantId,
        requestedQty: item.qty,
        availableStock: 0,
        purchasable: false,
        unitPrice: 0,
        totalPrice: 0,
        productName: "Unknown Product",
        sku: item.id,
        image: "",
        status: "not_found",
        message: "This product is no longer available.",
      });
      hasRemovals = true;
      continue;
    }

    if ((prod.status && prod.status !== "Active") || prod.storefront?.showOnStorefront === false) {
      resultItems.push({
        id: prod.id,
        size: item.size,
        color: item.color,
        variantId: item.variantId,
        requestedQty: item.qty,
        availableStock: 0,
        purchasable: false,
        unitPrice: effectivePrice(prod),
        totalPrice: 0,
        productName: prod.name,
        sku: prod.sku || prod.id,
        image: prod.image || "",
        status: "inactive",
        message: `"${prod.name}" is currently unavailable.`,
      });
      hasRemovals = true;
      continue;
    }

    const hasVariants = Array.isArray(prod.variants) && prod.variants.length > 0;
    const matchedVariant = hasVariants
      ? prod.variants!.find((v) =>
          item.variantId
            ? v.id === item.variantId && (v.size || "Standard") === item.size &&
              (!item.color || (v.color || "").toLowerCase() === item.color.toLowerCase())
            : (v.size || "Standard") === item.size &&
              (!item.color || (v.color || "").toLowerCase() === item.color.toLowerCase())
        )
      : null;

    const invalidOption = hasVariants ? !matchedVariant :
      Boolean(item.variantId) ||
      (Boolean(item.color) && (prod.color || "").toLowerCase() !== item.color!.toLowerCase()) ||
      (prod.sizeStock && Object.keys(prod.sizeStock).length > 0
        ? !Object.prototype.hasOwnProperty.call(prod.sizeStock, item.size)
        : !getSizesForColor(prod, prod.color, true).includes(item.size));
    if (invalidOption || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 50) {
      resultItems.push({
        ...item, requestedQty: item.qty, availableStock: 0, purchasable: false,
        unitPrice: 0, totalPrice: 0, productName: prod.name, sku: prod.sku || prod.id,
        image: prod.image || "", status: "not_found",
        message: `Please choose an available size, color and quantity for "${prod.name}".`,
      });
      hasRemovals = true;
      continue;
    }

    if (matchedVariant && matchedVariant.status && matchedVariant.status !== "Active") {
      resultItems.push({
        id: prod.id,
        size: item.size,
        color: item.color || matchedVariant.color,
        variantId: matchedVariant.id,
        requestedQty: item.qty,
        availableStock: 0,
        purchasable: false,
        unitPrice: matchedVariant.price && Number(matchedVariant.price) > 0 ? Number(matchedVariant.price) : effectivePrice(prod),
        totalPrice: 0,
        productName: prod.name,
        sku: matchedVariant.sku || prod.sku || prod.id,
        image: matchedVariant.image || prod.image || "",
        status: "inactive",
        message: `"${prod.name}" (${item.size}${matchedVariant.color ? ` - ${matchedVariant.color}` : ""}) is currently unavailable.`,
      });
      hasRemovals = true;
      continue;
    }

    const stock = matchedVariant
      ? getVariantAvailableStock(prod, matchedVariant)
      : getVariantAvailableStock(prod, null, item.size, item.color);
    const stockKey = JSON.stringify([prod.id, matchedVariant?.id ||
      (prod.sizeStock && Object.keys(prod.sizeStock).length ? item.size : "product")]);
    const available = Math.max(0, stock - (reserved.get(stockKey) || 0));

    const allowsBackorders = Boolean(prod.allowBackorders);
    const unitPrice = matchedVariant?.price && Number(matchedVariant.price) > 0
      ? Number(matchedVariant.price)
      : effectivePrice(prod);

    if (available <= 0 && !allowsBackorders) {
      resultItems.push({
        id: prod.id,
        size: item.size,
        color: item.color || matchedVariant?.color,
        variantId: matchedVariant?.id || item.variantId,
        requestedQty: item.qty,
        availableStock: 0,
        purchasable: false,
        unitPrice,
        totalPrice: 0,
        productName: prod.name,
        sku: matchedVariant?.sku || prod.sku || prod.id,
        image: matchedVariant?.image || prod.image || "",
        status: "out_of_stock",
        message: `"${prod.name}" (${item.size}${item.color ? ` - ${item.color}` : ""}) is out of stock.`,
      });
      hasRemovals = true;
      continue;
    }

    const effectiveQty = allowsBackorders ? Math.max(1, item.qty) : Math.min(item.qty, available);
    reserved.set(stockKey, (reserved.get(stockKey) || 0) + effectiveQty);
    const isAdjusted = effectiveQty < item.qty;
    if (isAdjusted) hasAdjustments = true;

    const totalPrice = unitPrice * effectiveQty;
    subtotal += totalPrice;
    itemCount += effectiveQty;

    resultItems.push({
      id: prod.id,
      size: item.size,
      color: item.color || matchedVariant?.color,
      variantId: matchedVariant?.id || item.variantId,
      requestedQty: item.qty,
      availableStock: available,
      purchasable: true,
      unitPrice,
      totalPrice,
      productName: prod.name,
      sku: matchedVariant?.sku || prod.sku || prod.id,
      image: matchedVariant?.image || prod.image || "",
      status: isAdjusted ? "adjusted" : "ok",
      message: isAdjusted
        ? `Only ${available} unit(s) available for "${prod.name}" (${item.size}).`
        : undefined,
    });
  }

  const valid = !hasRemovals && !hasAdjustments;
  return {
    valid,
    hasAdjustments,
    hasRemovals,
    items: resultItems,
    subtotal,
    itemCount,
  };
}

/**
 * 10. Resolves the effective image for a variant using the 3-tier hierarchy:
 * Exact Variant Image Override -> Color Primary Image -> Main Product Gallery
 */
export function getVariantEffectiveImage(
  product: Product,
  variant?: ProductVariant | null,
  colorName?: string
): { url: string; source: "override" | "color" | "main" | "placeholder" } {
  // Tier 1: Variant image override
  if (variant?.image && variant.image.trim() !== "") {
    return { url: variant.image.trim(), source: "override" };
  }

  // Tier 2: Color gallery main image or first image
  const targetColor = (variant?.color || colorName || "").trim();
  const colorGallery = targetColor ? Object.entries(product.colorGalleries || {}).find(
    ([name]) => name.trim().toLowerCase() === targetColor.toLowerCase()
  )?.[1] : undefined;
  if (colorGallery) {
    const cg = colorGallery;
    if (cg.mainImage && cg.mainImage.trim() !== "") {
      return { url: cg.mainImage.trim(), source: "color" };
    }
    if (cg.images && cg.images.length > 0 && cg.images[0].trim() !== "") {
      return { url: cg.images[0].trim(), source: "color" };
    }
  }

  // Tier 2b: Search matching color from variants if color gallery not set
  if (targetColor && Array.isArray(product.variants)) {
    const matchedWithImg = product.variants.find(
      (v) => (v.color || "").trim().toLowerCase() === targetColor.toLowerCase() && (v.image || (v.images && v.images[0]))
    );
    if (matchedWithImg) {
      const img = matchedWithImg.image || (matchedWithImg.images && matchedWithImg.images[0]);
      if (img) return { url: img, source: "color" };
    }
  }

  // Tier 3: Main Product Gallery
  if (product.image && product.image.trim() !== "") {
    return { url: product.image.trim(), source: "main" };
  }
  if (product.images && product.images.length > 0 && product.images[0].trim() !== "") {
    return { url: product.images[0].trim(), source: "main" };
  }

  return { url: "", source: "placeholder" };
}

/**
 * 11. Returns the image gallery list for a given color (or product fallback).
 */
export function getColorGalleryImages(
  product: Product,
  colorName?: string
): string[] {
  const cName = (colorName || "").trim();
  const colorGallery = cName ? Object.entries(product.colorGalleries || {}).find(
    ([name]) => name.trim().toLowerCase() === cName.toLowerCase()
  )?.[1] : undefined;
  if (colorGallery) {
    const cg = colorGallery;
    const set = new Set<string>();
    if (cg.mainImage && cg.mainImage.trim() !== "") {
      set.add(cg.mainImage.trim());
    }
    if (Array.isArray(cg.images)) {
      cg.images.forEach((img) => {
        if (img && img.trim() !== "") set.add(img.trim());
      });
    }
    const arr = Array.from(set);
    if (arr.length > 0) return arr;
  }

  // Fallback: Check variants for this color
  if (cName && Array.isArray(product.variants)) {
    const set = new Set<string>();
    product.variants
      .filter((v) => (v.color || "").trim().toLowerCase() === cName.toLowerCase())
      .forEach((v) => {
        if (v.image) set.add(v.image);
        if (v.images) v.images.forEach((img) => img && set.add(img));
      });
    const arr = Array.from(set);
    if (arr.length > 0) return arr;
  }

  // Fallback to Main Product Gallery
  const mainSet = new Set<string>();
  if (product.image && product.image.trim() !== "") mainSet.add(product.image.trim());
  if (Array.isArray(product.images)) {
    product.images.forEach((img) => {
      if (img && img.trim() !== "") mainSet.add(img.trim());
    });
  }
  const mainArr = Array.from(mainSet);
  return mainArr.length > 0 ? mainArr : product.image ? [product.image] : [];
}
