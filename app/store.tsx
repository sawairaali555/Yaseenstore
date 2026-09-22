"use client";
import { useEffect, useRef, useState } from 'react';
import {
  Search,
  ShoppingBag,
  Heart,
  ArrowRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Grid2X2,
  Minus,
  Plus,
  Trash2,
  Package,
  CheckCircle2,
  MapPin,
  Flame,
  Star,
  X,
  Sparkles,
  Phone,
  User,
  Clock,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster, toast } from 'sonner';
import ProductDetail from "./product-detail";
import ProductCarousel from "@/components/product-carousel";
import OrderProgress from '@/components/order-progress';
import { money, Product, effectivePrice } from './catalog';
import {
  isProductPurchasable,
  isVariantPurchasable,
  getVariantAvailableStock,
  getSizeAvailabilityDetails,
  getSizesForColor,
  getColorGroups,
  filterStorefrontProducts,
  validateCartItems,
} from '@/lib/inventory-engine';
import { buildDefaultCategoryTree, CategoryNode, categorySeed, topLevelCategoryNames } from '@/lib/categories';
import { PAKISTAN_PROVINCES, PAKISTAN_CITIES_BY_PROVINCE, ALL_PAKISTAN_CITIES, cleanPakistanPhone, isValidPakistanPhone } from '@/lib/pakistan-locations';
import type { Settings } from '@/lib/store-data';
import { parseSavedCart, parseSavedWishlist, saveShoppingData } from '@/lib/shopping-storage';
import { productImage } from '@/lib/product-image';

type Item = { id: string; qty: number; size: string; color?: string; variantId?: string };
const img = (p: Product) => productImage(p.image);
const hasVariants = (p: Product) => Array.isArray(p.variants) && p.variants.length > 0;
const sizeOptions = (p: Product) => getSizesForColor(p, undefined, false);
const hasSizes = (p: Product) => sizeOptions(p).length > 1 || (sizeOptions(p).length === 1 && sizeOptions(p)[0] !== 'Standard');
const stockFor = (p: Product, size: string, color?: string) => getVariantAvailableStock(p, null, size, color);
const inStock = (p: Product) => isProductPurchasable(p);
const addWorkingDays = (date: Date, days: number) => {
  const next = new Date(date);
  let added = 0;
  while (added < days) {
    next.setDate(next.getDate() + 1);
    const day = next.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return next;
};
const estimatedDelivery = () =>
  addWorkingDays(new Date(), 3).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

function Choice({ value, onChange, items, label }: { value: string; onChange: (v: string) => void; items: string[]; label: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="h-10 bg-white border-slate-200 text-sm font-medium text-slate-700 min-w-[170px] rounded-lg">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((v) => (
          <SelectItem key={v} value={v}>
            {v}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function findCategory(nodes: CategoryNode[], slug: string): string | undefined {
  for (const node of nodes) {
    if (node.slug === slug) return node.name;
    const child = findCategory(node.children, slug);
    if (child) return child;
  }
  return undefined;
}

const clean = (value: string) => value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
const childHints: Record<string, string[]> = {
  Shoes: ['shoe', 'shoes', 'sneaker', 'sneakers', 'trainer'],
  Clothing: ['clothing', 'cloth', 'shirt', 'dress', 'top', 'blouse', 'pants', 'trouser', 'jeans'],
  Skincare: ['skin', 'skincare', 'serum', 'cream', 'lotion', 'retinol', 'vitamin'],
  Haircare: ['hair', 'shampoo', 'conditioner'],
  Cookware: ['cookware', 'pan', 'pot', 'kitchen'],
  Storage: ['storage', 'organizer', 'container'],
  Audio: ['audio', 'headphone', 'headphones', 'earbud', 'speaker'],
  Wearables: ['watch', 'smart watch', 'wearable'],
  Bags: ['bag', 'handbag', 'shoulder bag', 'purse'],
  Watches: ['watch'],
  Accessories: ['accessory', 'accessories'],
};

function inferredSubcategory(product: Product, parentName: string) {
  if (product.subcategory) return product.subcategory;
  const text = clean([product.name, product.category, product.tag || '', product.description || '', product.sku || ''].join(' '));
  const children = categorySeed[parentName as keyof typeof categorySeed] || [];
  return children.find((child) => (childHints[child] || [child]).some((hint) => text.includes(clean(hint)))) || '';
}

function productInCategory(product: Product, node: CategoryNode, parentName?: string) {
  if (!isProductPurchasable(product)) return false;
  if (product.subcategory && product.subcategory.toLowerCase() === node.name.toLowerCase()) return true;
  if (product.childCategory && product.childCategory.toLowerCase() === node.name.toLowerCase()) return true;
  if (product.category.toLowerCase() === node.name.toLowerCase()) {
    if (!parentName) return true;
    if (product.subcategory) return product.subcategory.toLowerCase() === node.name.toLowerCase();
  }
  if (parentName && product.category.toLowerCase() === parentName.toLowerCase()) {
    if (product.subcategory) return product.subcategory.toLowerCase() === node.name.toLowerCase();
    const inferred = inferredSubcategory(product, parentName);
    return inferred.toLowerCase() === node.name.toLowerCase();
  }
  return false;
}

function filterAvailableCategoryTree(nodes: CategoryNode[], products: Product[], parentName?: string): CategoryNode[] {
  const purchasable = products.filter((p) => isProductPurchasable(p));
  return nodes.flatMap((node) => {
    if (!node.enabled) return [];
    const children = filterAvailableCategoryTree(node.children || [], purchasable, node.name);
    const hasDirectProducts = purchasable.some((product) => productInCategory(product, node, parentName));
    const isParentWithStockedChildren = children.length > 0;

    if (!node.children || node.children.length === 0) {
      return hasDirectProducts ? [{ ...node, children: [] }] : [];
    }

    return hasDirectProducts || isParentWithStockedChildren ? [{ ...node, children }] : [];
  });
}

function flattenAvailableNames(nodes: CategoryNode[]) {
  const names: string[] = [];
  const walk = (items: CategoryNode[]) =>
    items.forEach((item) => {
      names.push(item.name);
      walk(item.children || []);
    });
  walk(nodes);
  return Array.from(new Set(names));
}

function findCategoryNode(nodes: CategoryNode[], name: string, parentName?: string): { node: CategoryNode; parentName?: string } | null {
  for (const node of nodes) {
    if (node.name === name) return { node, parentName };
    const child = findCategoryNode(node.children || [], name, node.name);
    if (child) return child;
  }
  return null;
}

function HeroBannerCarousel({ config }: { config: Settings }) {
  const bannerFrameClass = "w-[min(1400px,calc(100%-32px))] mx-auto mt-6";
  const bannerImageClass = "w-full aspect-[7/2] object-cover object-center block";
  const customBanners = (config.banners && config.banners.length > 0)
    ? config.banners.filter((b) => b.image && b.image.trim().length > 0)
    : (config.bannerImage || config.heroImage)
      ? [
          {
            id: 'legacy-banner',
            image: config.bannerImage || config.heroImage || '',
            link: config.bannerLink || config.heroButtonLink || '/products',
            alt: 'Store Banner',
          },
        ]
      : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const autoplay = config.bannerAutoplay !== false;
  const intervalSeconds = config.bannerInterval && config.bannerInterval >= 2 ? config.bannerInterval : 5;

  useEffect(() => {
    if (customBanners.length <= 1 || !autoplay || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % customBanners.length);
    }, intervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [customBanners.length, autoplay, isPaused, intervalSeconds]);

  useEffect(() => {
    if (currentIndex >= customBanners.length && customBanners.length > 0) {
      setCurrentIndex(0);
    }
  }, [customBanners.length, currentIndex]);

  if (customBanners.length === 0) {
    return (
      <section className={bannerFrameClass}>
        <a
          href="/products"
          className="block w-full min-h-[320px] md:min-h-[360px] overflow-hidden rounded-2xl md:rounded-3xl shadow-lg group bg-[#203664] p-6 md:p-14 text-white relative transition-transform duration-300 hover:scale-[1.003]"
        >
          <div className="max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-xs font-bold tracking-wider text-amber-300 uppercase">
              <Sparkles size={13} />
              <span>Nationwide Cash on Delivery • 3-Day Shipping</span>
            </span>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Everyday Essentials.<br />
              <span className="font-light italic text-blue-200">Delivered Across Pakistan.</span>
            </h1>
            <p className="text-sm md:text-base text-blue-100/90 leading-relaxed">
              Shop high-quality fashion, footwear, bags, and everyday essentials with safe doorstep delivery.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 bg-white text-[#203664] font-bold text-sm px-6 py-3 rounded-xl shadow-md group-hover:bg-slate-100 transition-colors">
                <span>Explore Collection</span>
                <ArrowRight size={16} />
              </span>
            </div>
          </div>
        </a>
      </section>
    );
  }

  if (customBanners.length === 1) {
    const single = customBanners[0];
    return (
      <section className={bannerFrameClass}>
        <a
          href={single.link || '/products'}
          className="block w-full overflow-hidden rounded-2xl md:rounded-3xl shadow-md border border-slate-200/80 group transition-transform duration-300 hover:scale-[1.003]"
        >
          <img
            src={single.image}
            alt={single.alt || 'Store Banner'}
            className={bannerImageClass}
          />
        </a>
      </section>
    );
  }

  return (
    <section className={bannerFrameClass}>
      <div
        className="relative w-full overflow-hidden rounded-2xl md:rounded-3xl shadow-lg border border-slate-200/80 group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
          setIsPaused(true);
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current !== null) {
            const diff = e.changedTouches[0].clientX - touchStartX.current;
            if (diff > 50) {
              setCurrentIndex((prev) => (prev === 0 ? customBanners.length - 1 : prev - 1));
            } else if (diff < -50) {
              setCurrentIndex((prev) => (prev + 1) % customBanners.length);
            }
          }
          touchStartX.current = null;
          setIsPaused(false);
        }}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {customBanners.map((slide, idx) => (
            <div key={slide.id || idx} className="w-full flex-shrink-0">
              <a href={slide.link || '/products'} className="block w-full">
                <img
                  src={slide.image}
                  alt={slide.alt || `Store Banner ${idx + 1}`}
                  className={bannerImageClass}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
              </a>
            </div>
          ))}
        </div>

        {/* Carousel Navigation Arrows */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setCurrentIndex((prev) => (prev === 0 ? customBanners.length - 1 : prev - 1));
          }}
          className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100 hover:scale-105 cursor-pointer z-10"
          aria-label="Previous banner"
        >
          <ChevronLeft size={22} />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setCurrentIndex((prev) => (prev + 1) % customBanners.length);
          }}
          className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100 hover:scale-105 cursor-pointer z-10"
          aria-label="Next banner"
        >
          <ChevronRight size={22} />
        </button>

        {/* Indicator Dots */}
        <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {customBanners.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`size-2.5 rounded-full border border-white/90 shadow-sm transition-all cursor-pointer ${
                currentIndex === idx ? 'bg-white scale-110' : 'bg-white/45 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Store({
  path,
  initialProducts: products,
  config,
  categories: categoryTreeNodes,
}: {
  path: string[];
  initialProducts: Product[];
  config: Settings;
  categories?: CategoryNode[];
}) {
  const page = path[0] || 'home';
  const [cart, setCart] = useState<Item[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [searchLiveQuery, setSearchLiveQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [category, setCategory] = useState('All products');
  const [sort, setSort] = useState('Featured');
  const [size, setSize] = useState('40');
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');
  const [checkoutProvince, setCheckoutProvince] = useState<string>('Punjab');
  const [checkoutCity, setCheckoutCity] = useState<string>('');
  const [checkoutCustomCity, setCheckoutCustomCity] = useState<string>('');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const submittingOrder = useRef(false);

  const resolvedTree = categoryTreeNodes && categoryTreeNodes.length ? categoryTreeNodes : buildDefaultCategoryTree();

  useEffect(() => {
    if (ready) {
      saveShoppingData('cartify-cart', cart);
      saveShoppingData('cartify-saved', saved);
    }
  }, [cart, saved, ready]);

  // Click outside to close search suggestions
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const add = (
    p: Product,
    n = 1,
    chosenSize?: string,
    chosenColor?: string,
    chosenVariantId?: string
  ) => {
    const targetColor = chosenColor || p.color;
    const availableSizes = getSizesForColor(p, targetColor, false);
    const targetSize =
      chosenSize ||
      (hasSizes(p)
        ? availableSizes.includes(size)
          ? size
          : availableSizes[0] || 'Standard'
        : 'Standard');

    const sizeDetail = getSizeAvailabilityDetails(p, targetSize, targetColor);
    if (!sizeDetail.isPurchasable) {
      toast.error(`${sizeDetail.label}: ${sizeDetail.reason || sizeDetail.message}`);
      return;
    }

    const available = sizeDetail.stock;
    const limit = p.allowBackorders ? 50 : Math.min(10, available);

    const existing = cart.find(i => i.id === p.id && i.size === targetSize &&
      (i.color || '').toLowerCase() === (targetColor || '').toLowerCase());
    if (existing && existing.qty >= limit) {
      toast.warning(`Maximum quantity reached (${limit} units).`);
      return;
    }
    setCart((c) => {
      const found = c.find(
        (i) =>
          i.id === p.id &&
          i.size === targetSize &&
          (!targetColor || (i.color || '').toLowerCase() === targetColor.toLowerCase())
      );

      if (found) {
        const newQty = Math.min(found.qty + n, limit);
        if (newQty === found.qty && found.qty >= limit && !p.allowBackorders) {
          toast.warning(`Maximum available stock reached (${limit} units).`);
          return c;
        }
        return c.map((i) =>
          i === found ? { ...i, qty: newQty, variantId: chosenVariantId || i.variantId } : i
        );
      }

      return [
        ...c,
        {
          id: p.id,
          qty: Math.min(n, limit),
          size: targetSize,
          color: targetColor,
          variantId: chosenVariantId,
        },
      ];
    });

    toast.success(
      `Added ${p.name} (${targetSize}${targetColor ? ` - ${targetColor}` : ''}) to bag`,
      {
        action: { label: 'View bag', onClick: () => (location.href = '/cart') },
      }
    );
  };

  const favorite = (id: string) => setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const cartValidation = validateCartItems(cart, products);
  const cartItemsWithDetails = cart.map((i, index) => {
    const prod = products.find((p) => p.id === i.id);
    const detail = prod ? getSizeAvailabilityDetails(prod, i.size, i.color) : null;
    const availableStock = detail ? detail.stock : 0;
    const validated = cartValidation.items[index];
    const isAvailable = Boolean(validated?.purchasable && validated.status === 'ok');
    const unitPrice = validated?.unitPrice ?? 0;
    return {
      ...i,
      product: prod,
      detail,
      availableStock,
      isAvailable,
      unitPrice,
    };
  });

  const hasInvalidCartItems = cartItemsWithDetails.some((i) => !i.isAvailable || !i.product);
  const lines = cartItemsWithDetails;
  const validLines = cartItemsWithDetails.filter((i) => i.product && i.isAvailable);
  const subtotal = validLines.reduce((a, i) => a + (i.unitPrice || i.product!.price) * i.qty, 0);
  const delivery = !validLines.length || subtotal >= config.freeThreshold ? 0 : config.deliveryCharge;
  const count = cart.reduce((a, i) => a + i.qty, 0);
  const freeThresholdProgress = config.freeThreshold > 0 ? Math.min(100, Math.round((subtotal / config.freeThreshold) * 100)) : 100;

  const purchasableProducts = filterStorefrontProducts(products);
  const groupKeys = Array.from(new Set(purchasableProducts.map((p) => p.listingGroup || p.id)));
  const mainProducts = groupKeys.flatMap((group) => {
    const groupItems = purchasableProducts.filter((p) => (p.listingGroup || p.id) === group);
    const parent = groupItems.find((p) => p.id === group);
    const stocked = parent || groupItems[0];
    return stocked ? [stocked] : [];
  });

  const availableTree = filterAvailableCategoryTree(resolvedTree, purchasableProducts);
  const rootCategories = topLevelCategoryNames(availableTree);
  const availableCategoryNames = flattenAvailableNames(availableTree);
  const navCategories = availableTree;
  const productMatchesCategory = (p: Product, name: string) => {
    if (name === 'All products') return true;
    const found = findCategoryNode(availableTree, name);
    return found ? productInCategory(p, found.node, found.parentName) : p.category === name || p.subcategory === name;
  };

  useEffect(() => {
    try {
      const rawCart = parseSavedCart(
        localStorage.getItem('cartify-cart') || localStorage.getItem('zeliy-cart') || '[]'
      );
      const validation = validateCartItems(rawCart, products);
      const validatedItems = validation.items
        .filter((item) => item.purchasable && item.requestedQty > 0)
        .map((item) => ({
          id: item.id,
          size: item.size,
          color: item.color,
          variantId: item.variantId,
          qty: item.status === 'adjusted' ? item.availableStock : item.requestedQty,
        }));

      setCart(validatedItems);
      setSaved(parseSavedWishlist(localStorage.getItem('cartify-saved') || localStorage.getItem('zeliy-saved')));
      if (validation.hasRemovals) toast.info('Some items in your bag became unavailable and were removed.');
      else if (validation.hasAdjustments) toast.info('Quantities in your bag were adjusted to match current stock.');
    } catch {}
    setReady(true);
    const s = new URLSearchParams(location.search);
    const initialQ = s.get('q') || '';
    setQuery(initialQ);
    setSearchLiveQuery(initialQ);
    const requested =
      page === 'category'
        ? findCategory(availableTree, path[1] || '') || 'All products'
        : s.get('category') || 'All products';
    setCategory(
      requested === 'All products' || availableCategoryNames.includes(requested) ? requested : 'All products'
    );
  }, []);

  const searchSuggestions = searchLiveQuery.trim().length >= 2
    ? mainProducts.filter((p) =>
        (p.name + ' ' + p.category + ' ' + (p.subcategory || '')).toLowerCase().includes(searchLiveQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  const list = mainProducts
    .filter(
      (p) =>
        productMatchesCategory(p, category) &&
        (!query || (p.name + ' ' + p.category + ' ' + (p.subcategory || '')).toLowerCase().includes(query.toLowerCase())) &&
        (page !== 'wishlist' || saved.includes(p.id))
    )
    .sort((a, b) => (sort === 'Price: low to high' ? a.price - b.price : sort === 'Price: high to low' ? b.price - a.price : 0));

  function Card({ p }: { p: Product }) {
    const target = p;
    const group = target.listingGroup || p.listingGroup || p.id;
    const colourOptions = products.filter(
      (item) => (item.listingGroup || item.id) === group && item.id !== group && item.status === 'Active' && inStock(item)
    );
    const hasColourChoice = (Array.isArray(p.variants) && p.variants.length > 0) || target.id !== p.id || colourOptions.length > 0;
    const priceNow = effectivePrice(target);
    const oldPrice = target.old || Math.round(priceNow * 1.35);
    const hasDiscount = oldPrice > priceNow;
    const discountPercent = hasDiscount ? Math.round((1 - priceNow / oldPrice) * 100) : 0;
    const soldText = target.soldCount || '1k+ sold';
    const isSaved = saved.includes(p.id);
    const purchasable = inStock(target);

    return (
      <article className="group relative bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full">
        {/* Photo Box */}
        <div className="relative aspect-square w-full bg-slate-50 overflow-hidden flex items-center justify-center p-3">
          <a href={'/product/' + target.id} className="block w-full h-full">
            <img
              src={img(target)}
              alt={target.name}
              loading="lazy"
              className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
            />
          </a>

          {/* Discount Tag */}
          {hasDiscount && (
            <span className="absolute top-3 left-3 bg-orange-600 text-white font-bold text-[11px] px-2 py-0.5 rounded-full shadow-sm">
              -{discountPercent}%
            </span>
          )}

          {/* Tag Pill if present */}
          {!hasDiscount && target.tag && (
            <span className="absolute top-3 left-3 bg-[#203664] text-white font-semibold text-[11px] px-2.5 py-0.5 rounded-full shadow-sm">
              {target.tag}
            </span>
          )}

          {/* Wishlist Button */}
          <button
            type="button"
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isSaved
                ? 'bg-rose-50 text-rose-600 shadow-sm'
                : 'bg-white/90 hover:bg-white text-slate-500 hover:text-rose-600 shadow-sm'
            }`}
            aria-label={'Save ' + p.name}
            onClick={() => favorite(p.id)}
          >
            <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Content Container */}
        <div className="p-4 flex flex-col flex-1">
          {/* Eyebrow / Category */}
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 line-clamp-1">
            {p.category} {p.subcategory ? `• ${p.subcategory}` : ''}
          </div>

          {/* Product Title */}
          <a
            className="font-semibold text-slate-900 text-[14px] md:text-[15px] leading-snug line-clamp-2 min-h-[38px] hover:text-[#203664] transition-colors"
            href={'/product/' + target.id}
            title={p.name}
          >
            {p.name}
          </a>

          {/* Color Preview Swatches */}
          {colourOptions.length > 0 && (
            <div className="flex items-center gap-1.5 my-2 flex-wrap" aria-label={'Available colours for ' + p.name}>
              {colourOptions.slice(0, 5).map((variant) => (
                <a
                  href={'/product/' + variant.id}
                  key={variant.id}
                  title={variant.color || variant.name}
                  className="w-5 h-5 rounded-full border border-slate-300 overflow-hidden hover:border-[#203664] transition-all"
                >
                  <img src={img(variant)} alt={variant.color || variant.name} className="w-full h-full object-cover" />
                </a>
              ))}
              {colourOptions.length > 5 && (
                <span className="text-[10px] text-slate-500 font-medium">+{colourOptions.length - 5}</span>
              )}
            </div>
          )}

          {/* Price & Meta row */}
          <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1 mt-2.5">
            <strong className="text-[16px] md:text-[17px] font-bold text-[#203664]">
              Rs {priceNow.toLocaleString('en-PK')}
            </strong>
            {hasDiscount && (
              <del className="text-xs text-slate-400 font-normal">
                Rs {oldPrice.toLocaleString('en-PK')}
              </del>
            )}
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
              <Flame size={12} className="text-orange-500 fill-orange-500" />
              {soldText}
            </span>
          </div>

          {/* Bottom Action Button (Pinned) */}
          <div className="mt-auto pt-3.5">
            {!purchasable ? (
              <button
                disabled
                className="w-full py-2.5 px-4 rounded-xl text-xs md:text-sm font-semibold bg-slate-100 text-slate-400 cursor-not-allowed flex items-center justify-center gap-2"
              >
                Out of stock
              </button>
            ) : hasColourChoice ? (
              <button
                type="button"
                onClick={() => (location.href = '/product/' + target.id)}
                className="w-full py-2.5 px-4 rounded-xl text-xs md:text-sm font-semibold bg-slate-100 hover:bg-[#203664] text-slate-700 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <span>Choose colour</span>
                <ChevronRight size={15} />
              </button>
            ) : hasSizes(target) ? (
              <button
                type="button"
                onClick={() => (location.href = '/product/' + target.id)}
                className="w-full py-2.5 px-4 rounded-xl text-xs md:text-sm font-semibold bg-slate-100 hover:bg-[#203664] text-slate-700 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <span>Choose size</span>
                <ChevronRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => add(target)}
                className="w-full py-2.5 px-4 rounded-xl text-xs md:text-sm font-semibold bg-[#203664] hover:bg-[#2c4985] text-white transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Add to bag</span>
                <Plus size={16} />
              </button>
            )}
          </div>
        </div>
      </article>
    );
  }

  function Summary() {
    return (
      <aside className="bg-slate-50 border border-slate-200 rounded-2xl p-6 h-fit sticky top-24">
        <h2 className="text-xl font-bold text-slate-900 mb-4 pb-3 border-b border-slate-200">
          Order Summary
        </h2>

        {/* Free Shipping Progress Indicator */}
        <div className="mb-5 bg-white border border-slate-200 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-700 flex items-center gap-1.5">
              <Truck size={14} className="text-[#203664]" />
              {subtotal >= config.freeThreshold
                ? "🎉 You've unlocked FREE Delivery!"
                : `Add Rs ${(config.freeThreshold - subtotal).toLocaleString('en-PK')} for FREE Delivery`}
            </span>
            <span className="text-[#203664] font-bold">{freeThresholdProgress}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                subtotal >= config.freeThreshold ? 'bg-emerald-500' : 'bg-[#203664]'
              }`}
              style={{ width: `${freeThresholdProgress}%` }}
            />
          </div>
        </div>

        {/* Items line summary */}
        <div className="space-y-2 mb-4 max-h-56 overflow-y-auto pr-1">
          {validLines.map((i, n) => (
            <div className="flex justify-between items-center text-xs text-slate-600" key={n}>
              <span className="line-clamp-1 max-w-[70%]">
                {i.product!.name} × {i.qty}
              </span>
              <b className="font-semibold text-slate-800">{money((i.unitPrice || i.product!.price) * i.qty)}</b>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-3 border-t border-slate-200 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-medium text-slate-900">{money(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Delivery Fee</span>
            <span className="font-medium text-slate-900">
              {delivery ? money(delivery) : <span className="text-emerald-600 font-bold">FREE</span>}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold text-slate-900 pt-3 border-t border-slate-200">
            <span>Total (PKR)</span>
            <span className="text-lg text-[#203664]">{money(subtotal + delivery)}</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-4 flex items-center gap-1.5 bg-slate-100/70 p-2.5 rounded-lg">
          <Clock size={14} className="text-slate-500 flex-shrink-0" />
          <span>Estimated delivery: <b>{estimatedDelivery()}</b> (3 working days)</span>
        </p>

        {page === 'cart' && (
          hasInvalidCartItems ? (
            <button
              type="button"
              onClick={() => toast.error('Please remove or change the size of out-of-stock items before checking out.')}
              className="w-full mt-5 py-3.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-sm cursor-pointer"
            >
              <span>Fix Out-of-Stock Items</span>
              <ArrowRight size={17} />
            </button>
          ) : (
            <a
              className="w-full mt-5 py-3.5 px-4 bg-[#203664] hover:bg-[#2c4985] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-sm"
              href="/checkout"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={17} />
            </a>
          )
        )}

        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700">
          <ShieldCheck size={16} className="text-emerald-600" />
          <span>Cash on Delivery Available Across Pakistan</span>
        </div>
      </aside>
    );
  }

  async function checkout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittingOrder.current || !ready || !cart.length) return;
    setBusy(true);
    setError('');

    if (hasInvalidCartItems) {
      setError('Some items in your cart are out of stock or unavailable. Please return to your shopping bag to update your items.');
      toast.error('Some items in your cart are out of stock. Please update your shopping bag.');
      setBusy(false);
      return;
    }

    const form = new FormData(e.currentTarget);
    const phoneRaw = String(form.get('phone') || '');
    const phone = cleanPakistanPhone(phoneRaw);
    if (!isValidPakistanPhone(phone)) {
      setError('Please enter a valid Pakistani mobile number (e.g. 0300 1234567).');
      setBusy(false);
      return;
    }
    const cityVal = checkoutCity === 'Other' ? checkoutCustomCity.trim() : (checkoutCity || String(form.get('city') || '')).trim();
    if (!cityVal) {
      setError('Please select or enter your city.');
      setBusy(false);
      return;
    }
    const address = String(form.get('address') || '').trim();
    const landmark = String(form.get('landmark') || '').trim();
    const fullAddress = landmark ? `${address} (Near: ${landmark})` : address;
    const isMobile = typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const utm = urlParams?.get('utm_source') || urlParams?.get('source') || urlParams?.get('ref');
    let detectedSource = isMobile ? 'Mobile Web' : 'Web Store';
    if (utm) {
      const u = utm.toLowerCase();
      if (u.includes('wa') || u.includes('whatsapp')) detectedSource = 'WhatsApp';
      else if (u.includes('ig') || u.includes('insta')) detectedSource = 'Instagram';
      else if (u.includes('fb') || u.includes('facebook')) detectedSource = 'Facebook';
      else if (u.includes('tiktok') || u.includes('tt')) detectedSource = 'TikTok';
      else detectedSource = utm;
    }
    const data = {
      name: String(form.get('name') || '').trim(),
      phone,
      state: checkoutProvince || form.get('state'),
      province: checkoutProvince || form.get('state'),
      city: cityVal,
      address: fullAddress,
      landmark,
      postal: String(form.get('postal') || '').trim(),
      email: String(form.get('email') || '').trim(),
      note: String(form.get('note') || '').trim(),
      source: detectedSource,
      paymentMethod: 'cod',
    };
    try {
      submittingOrder.current = true;
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, items: cart }),
      });
      const out: any = await r.json();
      if (!r.ok) throw new Error(out.error || 'Please try again.');
      setOrder(out);
      setCart([]);
      saveShoppingData('cartify-cart', []);
      saveShoppingData('cartify-last-order', out);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save order.');
    } finally {
      submittingOrder.current = false;
      setBusy(false);
    }
  }

  const p = products.find((p) => p.id === path[1]);

  return (
    <>
      <Toaster richColors position="bottom-right" />

      {/* Top Announcement Bar */}
      {config.announcementEnabled !== false && (
        <div className="bg-[#1b2d54] text-white text-xs font-medium py-2.5 px-4">
          <div className="wrap flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              <span>{config.announcementText || "Thoughtful finds. Delivered across Pakistan with Cash on Delivery."}</span>
            </span>
            <span className="hidden md:flex items-center gap-2">
              <Truck size={14} />
              <span>{config.announcementHighlight || `Free delivery on orders from ${money(config.freeThreshold)}`}</span>
            </span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 transition-shadow">
        <div className="wrap flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 sm:gap-6 py-4">
          {/* Logo */}
          <a href="/" className="flex flex-col group flex-shrink-0">
            {config.logo ? (
              <img src={config.logo} alt="Store logo" style={{ maxHeight: 42, maxWidth: 200, objectFit: 'contain' }} />
            ) : (
              <span className="text-3xl md:text-[34px] font-black tracking-tight text-slate-900 leading-none">
                cartify<span className="text-[#bc8053]">.</span>
                <span className="block text-[9px] tracking-[3px] font-bold text-slate-400 uppercase mt-1">
                  {config.logoText || 'PAKISTAN'}
                </span>
              </span>
            )}
          </a>

          {/* Interactive Search Bar with Live Autocomplete */}
          <div ref={searchContainerRef} className="relative order-last sm:order-none w-full sm:w-auto sm:flex-1 min-w-0 max-w-2xl sm:mx-2">
            <form
              className="flex items-center bg-slate-100 hover:bg-slate-100/90 focus-within:bg-white border border-slate-200 focus-within:border-[#203664] focus-within:ring-2 focus-within:ring-[#203664]/10 rounded-full px-4 h-11 transition-all"
              onSubmit={(e) => {
                e.preventDefault();
                setIsSearchFocused(false);
                location.href = `/products?q=${encodeURIComponent(searchLiveQuery.trim())}`;
              }}
            >
              <Search size={18} className="text-slate-400 flex-shrink-0 mr-2.5" />
              <input
                type="text"
                aria-label="Search products"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setIsSearchFocused(false);
                }}
                value={searchLiveQuery}
                onChange={(e) => {
                  setSearchLiveQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search products, shoes, bags, skincare..."
                className="w-full bg-transparent border-0 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
              />
              {searchLiveQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchLiveQuery('')}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={16} />
                </button>
              )}
              <button
                type="submit"
                className="bg-[#203664] hover:bg-[#2b4885] text-white text-xs font-semibold px-4 py-1.5 rounded-full ml-2 transition-all flex-shrink-0"
              >
                Search
              </button>
            </form>

            {/* Live Autocomplete Dropdown */}
            {isSearchFocused && searchLiveQuery.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                <div className="p-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 flex justify-between">
                  <span>Product Suggestions</span>
                  <span>{searchSuggestions.length} found</span>
                </div>
                {searchSuggestions.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {searchSuggestions.map((item) => (
                      <a
                        key={item.id}
                        href={`/product/${item.id}`}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors"
                        onClick={() => setIsSearchFocused(false)}
                      >
                        <img
                          src={img(item)}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-contain bg-slate-50 p-1 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 line-clamp-1">{item.name}</p>
                          <p className="text-[11px] text-slate-400">{item.category}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <strong className="text-xs font-bold text-[#203664]">
                            Rs {effectivePrice(item).toLocaleString('en-PK')}
                          </strong>
                        </div>
                      </a>
                    ))}
                    <a
                      href={`/products?q=${encodeURIComponent(searchLiveQuery.trim())}`}
                      className="block p-3 text-center text-xs font-bold text-[#203664] hover:bg-slate-50 bg-slate-50/50"
                      onClick={() => setIsSearchFocused(false)}
                    >
                      See all results for &ldquo;{searchLiveQuery}&rdquo; →
                    </a>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No matching products found for &ldquo;{searchLiveQuery}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Header Action Items */}
          <div className="flex items-center gap-4 md:gap-6">
            <a
              href="/account"
              className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-[#203664] transition-colors"
            >
              <User size={20} className="text-slate-600" />
              <span>Account</span>
            </a>

            <a
              href="/track-order"
              className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-[#203664] transition-colors"
            >
              <Package size={20} className="text-slate-600" />
              <span>Track Order</span>
            </a>

            <a
              href="/wishlist"
              aria-label="Wishlist"
              className="relative p-2 text-slate-700 hover:text-[#203664] transition-colors"
            >
              <Heart size={22} />
              {saved.length > 0 && (
                <span className="absolute top-0 right-0 bg-[#203664] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {saved.length}
                </span>
              )}
            </a>

            <a
              href="/cart"
              aria-label={`Shopping bag, ${count} items`}
              className="relative flex items-center gap-2.5 bg-slate-100 hover:bg-[#203664] text-slate-800 hover:text-white px-3.5 py-2 rounded-full transition-all"
            >
              <div className="relative">
                <ShoppingBag size={20} />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-orange-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {count}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline text-xs font-bold">
                {subtotal > 0 ? money(subtotal) : 'Bag'}
              </span>
            </a>
          </div>
        </div>

        {/* Secondary Category Navigation Bar */}
        <nav className="border-t border-slate-100 bg-white relative z-30">
          <div className="wrap flex items-center gap-6 h-12 text-xs font-semibold text-slate-600 overflow-visible">
            {/* All Categories: Simple direct link */}
            <a
              href="/products"
              className="flex items-center gap-2 text-slate-900 font-bold pr-4 border-r border-slate-200 flex-shrink-0 hover:text-[#203664] transition-colors"
            >
              <Grid2X2 size={16} />
              <span>All Categories</span>
            </a>

            {/* Top Level Category Items with Subcategory Dropdowns on Hover */}
            {navCategories.map((node) => {
              const activeChildren = node.children.filter((child) => child.enabled);
              const hasDropdown = activeChildren.length > 0;
              return (
                <div className="relative group/cat py-3 flex-shrink-0" key={node.id}>
                  <a
                    href={'/products?category=' + encodeURIComponent(node.name)}
                    className="flex items-center gap-1.5 text-slate-700 font-semibold hover:text-[#203664] transition-colors py-1 px-2 rounded-lg hover:bg-slate-50"
                  >
                    <span>{node.name}</span>
                    {hasDropdown && (
                      <ChevronDown
                        size={13}
                        className="text-slate-400 group-hover/cat:rotate-180 group-hover/cat:text-[#203664] transition-transform duration-200"
                      />
                    )}
                  </a>

                  {hasDropdown && (
                    <div className="absolute top-full left-0 min-w-[220px] bg-white rounded-2xl shadow-[0_18px_40px_-10px_rgba(32,54,100,0.18)] border border-slate-200/80 p-2.5 opacity-0 invisible group-hover/cat:opacity-100 group-hover/cat:visible -translate-y-1 group-hover/cat:translate-y-0 transition-all duration-200 ease-out z-50 before:absolute before:-top-3 before:left-0 before:right-0 before:h-3 before:content-['']">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5 border-b border-slate-100 mb-1">
                        {node.name}
                      </div>

                      <div className="space-y-0.5">
                        {activeChildren.map((child) => (
                          <a
                            key={child.id}
                            href={'/products?category=' + encodeURIComponent(child.name)}
                            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#203664] transition-colors group/item"
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover/item:bg-[#203664] transition-colors" />
                              <span>{child.name}</span>
                            </span>
                            <ChevronRight size={13} className="text-slate-400 group-hover/item:text-[#203664] group-hover/item:translate-x-0.5 transition-transform" />
                          </a>
                        ))}
                      </div>

                      <div className="pt-1.5 mt-1.5 border-t border-slate-100">
                        <a
                          href={'/products?category=' + encodeURIComponent(node.name)}
                          className="flex items-center justify-between px-3 py-1.5 rounded-xl text-[11px] font-bold text-[#203664] hover:bg-blue-50/60 transition-colors"
                        >
                          <span>View all in {node.name}</span>
                          <ArrowRight size={12} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <a
              href="/products"
              className="ml-auto flex-shrink-0 flex items-center gap-1.5 text-orange-600 font-bold bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded-full transition-colors"
            >
              <Flame size={14} className="fill-orange-500" />
              <span>Hot Deals</span>
              <span className="bg-orange-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded">SALE</span>
            </a>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="min-h-screen pb-16">
        {page === 'home' ? (
          <>
            {/* Homepage Banner & Carousel Section */}
            <HeroBannerCarousel config={config} />

            {/* Trending Deals Carousel */}
            <div className="mt-8">
              <ProductCarousel
                products={mainProducts}
                title="Trending Deals & Popular Picks"
                subtitle="Flash discounts on top-rated fashion, bags & footwear"
              />
            </div>

            {/* Trust Benefits Bar */}
            <section className="wrap my-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-6">
                <div className="flex items-center gap-3.5 p-2">
                  <div className="w-11 h-11 rounded-xl bg-blue-100 text-[#203664] flex items-center justify-center flex-shrink-0">
                    <Truck size={22} />
                  </div>
                  <div>
                    <b className="text-xs md:text-sm font-bold text-slate-900 block">Nationwide Delivery</b>
                    <small className="text-[11px] text-slate-500 block">TCS, Leopards & Trax</small>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-2">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag size={22} />
                  </div>
                  <div>
                    <b className="text-xs md:text-sm font-bold text-slate-900 block">Cash on Delivery</b>
                    <small className="text-[11px] text-slate-500 block">Pay at your doorstep</small>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-2">
                  <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center flex-shrink-0">
                    <RotateCcw size={22} />
                  </div>
                  <div>
                    <b className="text-xs md:text-sm font-bold text-slate-900 block">7-Day Easy Returns</b>
                    <small className="text-[11px] text-slate-500 block">Hassle-free exchanges</small>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-2">
                  <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <b className="text-xs md:text-sm font-bold text-slate-900 block">100% Authentic</b>
                    <small className="text-[11px] text-slate-500 block">Curated quality in PKR</small>
                  </div>
                </div>
              </div>
            </section>

            {/* Shop by Category Section */}
            <section className="wrap my-10">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    FIND YOUR NEXT FAVOURITE
                  </span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                    Shop by category
                  </h2>
                </div>
                <a
                  href="/products"
                  className="text-xs md:text-sm font-bold text-[#203664] hover:underline flex items-center gap-1"
                >
                  <span>View all categories</span>
                  <ArrowRight size={15} />
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {rootCategories.map((c) => {
                  const cp = mainProducts.find((p) => p.category === c || p.subcategory === c);
                  if (!cp) return null;
                  return (
                    <a
                      href={'/products?category=' + encodeURIComponent(c)}
                      key={c}
                      className="group bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 flex flex-col items-center text-center hover:shadow-lg transition-all duration-300"
                    >
                      <div className="w-full aspect-square rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center p-3 mb-3">
                        <img
                          src={img(cp)}
                          alt={c}
                          className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <b className="text-sm font-bold text-slate-900 group-hover:text-[#203664] transition-colors line-clamp-1">
                        {c}
                      </b>
                      <span className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-0.5">
                        <span>Explore</span>
                        <ChevronRight size={12} />
                      </span>
                    </a>
                  );
                })}
              </div>
            </section>

            {/* Everyday Favourites Product Grid */}
            <section className="wrap my-10">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    TOP PICKS FOR YOU
                  </span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                    Your everyday favourites
                  </h2>
                </div>
                <a
                  href="/products"
                  className="text-xs md:text-sm font-bold text-[#203664] hover:underline flex items-center gap-1"
                >
                  <span>Shop all</span>
                  <ArrowRight size={15} />
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {mainProducts.slice(0, 8).map((p) => (
                  <Card key={p.id} p={p} />
                ))}
              </div>
            </section>
          </>
        ) : page === 'products' || page === 'wishlist' ? (
          /* Products Listing / Search / Wishlist Page */
          <section className="wrap mt-6">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
              <a href="/" className="hover:text-slate-700">Home</a>
              <ChevronRight size={13} />
              <span className="text-slate-900 font-semibold">{page === 'wishlist' ? 'Wishlist' : 'Shop'}</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  {page === 'wishlist' ? 'YOUR SAVED FAVOURITES' : 'DISCOVER THE COLLECTION'}
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                  {page === 'wishlist'
                    ? 'Saved items'
                    : query
                    ? `Results for “${query}”`
                    : category === 'All products'
                    ? 'All Products'
                    : category}
                </h1>
                <p className="text-xs text-slate-500 mt-1">{list.length} items found</p>
              </div>

              <Choice
                label="Sort products"
                value={sort}
                onChange={setSort}
                items={['Featured', 'Price: low to high', 'Price: high to low']}
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
              {['All products', ...rootCategories].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    c === category
                      ? 'bg-[#203664] text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {list.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {list.map((p) => (
                  <Card key={p.id} p={p} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-200 p-8 my-6">
                <Heart size={44} className="mx-auto text-slate-300 mb-4 stroke-1" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  {page === 'wishlist' ? 'No saved items yet' : 'No products found'}
                </h2>
                <p className="text-xs md:text-sm text-slate-500 max-w-sm mx-auto mb-6">
                  Explore our curated collection to find your next everyday favourite.
                </p>
                <a
                  href="/products"
                  className="inline-flex items-center gap-2 bg-[#203664] hover:bg-[#2c4985] text-white font-bold text-xs md:text-sm px-6 py-3 rounded-xl shadow transition-all"
                >
                  <span>Browse all products</span>
                  <ArrowRight size={16} />
                </a>
              </div>
            )}
          </section>
        ) : page === 'product' && p ? (
          /* Product Details Page (PDP) */
          <section className="wrap mt-6">
            <ProductDetail
              product={p}
              products={products}
              config={config}
              qty={qty}
              setQty={setQty}
              size={size}
              setSize={setSize}
              saved={saved.includes(p.id)}
              favorite={() => favorite(p.id)}
              add={() => add(p, qty, size, p.color)}
              buy={() => {
                const targetColor = p.color;
                const targetSize = hasSizes(p) ? size : 'Standard';
                const detail = getSizeAvailabilityDetails(p, targetSize, targetColor);
                if (!detail.isPurchasable) {
                  toast.error(`${detail.label}: ${detail.reason || detail.message}`);
                  return;
                }
                const available = detail.stock;
                const next = [
                  ...cart.filter(
                    (i) =>
                      !(
                        i.id === p.id &&
                        i.size === targetSize &&
                        (!targetColor || (i.color || '').toLowerCase() === targetColor.toLowerCase())
                      )
                  ),
                  {
                    id: p.id,
                    qty: Math.min(qty, p.allowBackorders ? 50 : Math.min(10, available)),
                    size: targetSize,
                    color: targetColor,
                  },
                ];
                setCart(next);
                if (saveShoppingData('cartify-cart', next)) location.href = '/checkout';
                else toast.error('Your browser could not save your bag. Enable site storage before checking out.');
              }}
            />

            {/* Related Products Grid */}
            {mainProducts.some((x) => x.id !== p.id) && (
              <div className="mt-16 pt-10 border-t border-slate-200">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      A FEW MORE GOOD FINDS
                    </span>
                    <h2 className="text-2xl font-extrabold text-slate-900">You might also like</h2>
                  </div>
                  <a
                    href="/products"
                    className="text-xs font-bold text-[#203664] hover:underline flex items-center gap-1"
                  >
                    <span>Shop all</span>
                    <ArrowRight size={15} />
                  </a>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {mainProducts
                    .filter((x) => x.id !== p.id)
                    .slice(0, 4)
                    .map((p) => (
                      <Card p={p} key={p.id} />
                    ))}
                </div>
              </div>
            )}
          </section>
        ) : page === 'cart' || page === 'checkout' ? (
          /* Cart and Checkout Flow */
          <section className="wrap mt-6">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
              <a href="/" className="hover:text-slate-700">Home</a>
              <ChevronRight size={13} />
              <a href="/cart" className="hover:text-slate-700">Shopping bag</a>
              {page === 'checkout' && (
                <>
                  <ChevronRight size={13} />
                  <span className="text-slate-900 font-semibold">Checkout</span>
                </>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              {page === 'cart' ? 'Your Shopping Bag' : 'Checkout & Delivery'}
            </h1>

            {order ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 max-w-xl mx-auto text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900">Order Placed Successfully!</h2>
                <p className="text-sm text-slate-600">
                  Order Reference: <b className="text-slate-900 font-mono text-base">{order.id}</b>
                </p>
                <div className="bg-white p-4 rounded-xl border border-emerald-200 text-left text-xs text-slate-600 space-y-1">
                  <p><b>Payment:</b> Cash on Delivery (COD)</p>
                  <p><b>Tracking Key:</b> <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">{order.token}</code></p>
                  <p className="text-slate-400 text-[11px] pt-1">
                    * This is a store concept preview. Save your tracking key to test order lookup.
                  </p>
                </div>
                <a
                  className="inline-flex items-center gap-2 bg-[#203664] hover:bg-[#2c4985] text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shadow"
                  href="/track-order"
                >
                  <span>Track Order Status</span>
                  <ArrowRight size={16} />
                </a>
              </div>
            ) : lines.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7 space-y-4">
                  {page === 'cart' ? (
                    <div>
                      <p className="text-xs text-slate-500 font-semibold mb-4">{count} items in your bag</p>
                      <div className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                        {lines.map((i, n) => {
                          const prod = i.product;
                          if (!prod) {
                            return (
                              <div className="p-4 sm:p-5 flex gap-4 items-center bg-rose-50/50" key={n}>
                                <div className="flex-1">
                                  <p className="font-bold text-sm text-rose-800">Product No Longer Available</p>
                                  <p className="text-xs text-rose-600 mt-1">This product has been removed from our catalog.</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setCart((c) => c.filter((_, j) => j !== n))}
                                  className="text-xs font-bold text-rose-700 hover:text-rose-900 underline"
                                >
                                  Remove Item
                                </button>
                              </div>
                            );
                          }

                          const inStockSizesForProd = getSizesForColor(prod, i.color, false);
                          const isItemInvalid = !i.isAvailable;
                          const effectiveLimit = prod.allowBackorders ? 50 : Math.max(1, i.availableStock);

                          return (
                            <div
                              className={`p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center ${
                                isItemInvalid ? 'bg-rose-50/40 border-l-4 border-rose-500' : ''
                              }`}
                              key={n}
                            >
                              <img
                                src={img(prod)}
                                alt={prod.name}
                                className="w-20 h-20 rounded-xl object-contain bg-slate-50 p-2 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <a
                                  href={'/product/' + prod.id}
                                  className="font-bold text-sm text-slate-900 hover:text-[#203664] line-clamp-1 block"
                                >
                                  {prod.name}
                                </a>
                                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                  {i.size !== 'Standard' && (
                                    <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                      Size: <strong>{i.size}</strong>
                                    </span>
                                  )}
                                  {i.color && (
                                    <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                      Color: <strong>{i.color}</strong>
                                    </span>
                                  )}
                                  <span className="text-slate-400">{money(i.unitPrice || prod.price)} each</span>
                                </p>

                                {isItemInvalid && (
                                  <div className="mt-2.5 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-1.5">
                                    <div className="font-bold flex items-center gap-1.5 text-rose-900">
                                      <span>⚠️ Size no longer available ({i.detail?.label || 'Out of Stock'})</span>
                                    </div>
                                    <p className="text-[11px] text-rose-700">
                                      {i.detail?.reason || i.detail?.message || 'This variant is currently out of stock.'}
                                    </p>
                                    <div className="flex items-center gap-3 pt-1 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={() => setCart((c) => c.filter((_, j) => j !== n))}
                                        className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 underline"
                                      >
                                        <Trash2 size={13} />
                                        <span>Remove Item</span>
                                      </button>
                                      {inStockSizesForProd.length > 0 && (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[11px] text-slate-600 font-semibold">Change size to:</span>
                                          <select
                                            className="text-xs font-bold py-1 px-2 border border-slate-300 rounded bg-white text-slate-800 cursor-pointer"
                                            defaultValue=""
                                            onChange={(e) => {
                                              const newSz = e.target.value;
                                              if (!newSz) return;
                                              const newStock = stockFor(prod, newSz, i.color);
                                              setCart((c) =>
                                                c.map((x, j) =>
                                                  j === n
                                                    ? { ...x, size: newSz, qty: Math.min(x.qty, Math.max(1, newStock)) }
                                                    : x
                                                )
                                              );
                                              toast.success(`Updated size to ${newSz}`);
                                            }}
                                          >
                                            <option value="" disabled>Select in-stock size</option>
                                            {inStockSizesForProd.map((sz) => (
                                              <option key={sz} value={sz}>
                                                Size {sz} ({stockFor(prod, sz, i.color)} in stock)
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {!isItemInvalid && (
                                  <div className="flex items-center gap-3 mt-3">
                                    <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 text-xs font-semibold">
                                      <button
                                        type="button"
                                        aria-label="Decrease quantity"
                                        disabled={i.qty <= 1}
                                        onClick={() =>
                                          setCart((c) =>
                                            c.map((x, j) => (j === n ? { ...x, qty: Math.max(1, x.qty - 1) } : x))
                                          )
                                        }
                                        className="p-1.5 hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                                      >
                                        <Minus size={14} />
                                      </button>
                                      <span className="px-3">{i.qty}</span>
                                      <button
                                        type="button"
                                        aria-label="Increase quantity"
                                        disabled={i.qty >= effectiveLimit}
                                        onClick={() => {
                                          if (i.qty >= effectiveLimit) {
                                            toast.warning(`Only ${effectiveLimit} units available in this size.`);
                                            return;
                                          }
                                          setCart((c) =>
                                            c.map((x, j) =>
                                              j === n
                                                ? { ...x, qty: Math.min(effectiveLimit, x.qty + 1) }
                                                : x
                                            )
                                          );
                                        }}
                                        className="p-1.5 hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                                      >
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                    {inStockSizesForProd.length > 1 && (
                                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                        <span>Size:</span>
                                        <select
                                          value={i.size}
                                          onChange={(e) => {
                                            const newSz = e.target.value;
                                            const newStock = stockFor(prod, newSz, i.color);
                                            setCart((c) =>
                                              c.map((x, j) =>
                                                j === n
                                                  ? { ...x, size: newSz, qty: Math.min(x.qty, Math.max(1, newStock)) }
                                                  : x
                                              )
                                            );
                                            toast.success(`Changed to Size ${newSz}`);
                                          }}
                                          className="text-xs font-semibold py-0.5 px-1.5 border border-slate-200 rounded bg-white text-slate-700"
                                        >
                                          {inStockSizesForProd.map((sz) => (
                                            <option key={sz} value={sz}>
                                              {sz}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="text-right flex sm:flex-col items-end justify-between self-stretch flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                <b className="text-sm font-bold text-slate-900">
                                  {money((i.unitPrice || prod.price) * i.qty)}
                                </b>
                                <button
                                  type="button"
                                  aria-label={'Remove ' + prod.name}
                                  onClick={() => setCart((c) => c.filter((_, j) => j !== n))}
                                  className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <a
                        className="inline-flex items-center gap-2 text-xs font-bold text-[#203664] hover:underline mt-4"
                        href="/products"
                      >
                        <ArrowRight size={14} className="rotate-180" />
                        <span>Continue shopping</span>
                      </a>
                    </div>
                  ) : (
                    /* Checkout Form */
                    <form className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5" onSubmit={checkout}>
                      {/* COD Banner */}
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800">
                        <b className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                          <Truck size={18} className="text-emerald-700" />
                          <span>Cash on Delivery · All Pakistan</span>
                        </b>
                        <p className="text-xs text-emerald-700 mt-1">
                          Doorstep delivery across Pakistan via TCS, Leopards & Trax. Pay cash when the courier delivers your parcel.
                        </p>
                      </div>

                      <h2 className="text-lg font-bold text-slate-900">
                        Delivery Details / ڈیلیوری کی معلومات
                      </h2>

                      <label className="block text-xs font-bold text-slate-700 space-y-1.5">
                        <span>Full name / پورا نام *</span>
                        <input
                          name="name"
                          required
                          minLength={2}
                          maxLength={80}
                          autoComplete="name"
                          placeholder="e.g. Muhammad Ali"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-[#203664] focus:ring-2 focus:ring-[#203664]/10 outline-none"
                        />
                      </label>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block text-xs font-bold text-slate-700 space-y-1.5">
                          <span>Mobile number / موبائل نمبر *</span>
                          <div className="flex gap-2">
                            <span className="flex items-center px-3 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700">
                              🇵🇰 +92
                            </span>
                            <input
                              name="phone"
                              required
                              type="tel"
                              pattern="(03[0-9]{9}|[+]923[0-9]{9}|3[0-9]{9})"
                              placeholder="0300 1234567"
                              className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-[#203664] focus:ring-2 focus:ring-[#203664]/10 outline-none"
                            />
                          </div>
                        </label>

                        <label className="block text-xs font-bold text-slate-700 space-y-1.5">
                          <span>Email (optional)</span>
                          <input
                            name="email"
                            type="email"
                            maxLength={100}
                            placeholder="you@example.com"
                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-[#203664] focus:ring-2 focus:ring-[#203664]/10 outline-none"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block text-xs font-bold text-slate-700 space-y-1.5">
                          <span>Province / صوبہ *</span>
                          <select
                            name="state"
                            required
                            value={checkoutProvince}
                            onChange={(e) => {
                              setCheckoutProvince(e.target.value);
                              setCheckoutCity('');
                              setCheckoutCustomCity('');
                            }}
                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:border-[#203664] focus:ring-2 focus:ring-[#203664]/10 outline-none"
                          >
                            {PAKISTAN_PROVINCES.map((prov) => (
                              <option key={prov} value={prov}>
                                {prov}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block text-xs font-bold text-slate-700 space-y-1.5">
                          <span>City / شہر *</span>
                          <select
                            name="city"
                            required
                            value={checkoutCity}
                            onChange={(e) => {
                              setCheckoutCity(e.target.value);
                              if (e.target.value !== 'Other') {
                                setCheckoutCustomCity('');
                              }
                            }}
                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:border-[#203664] focus:ring-2 focus:ring-[#203664]/10 outline-none"
                          >
                            <option value="">Select City / شہر منتخب کریں</option>
                            {(PAKISTAN_CITIES_BY_PROVINCE[checkoutProvince] || ALL_PAKISTAN_CITIES).map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                            <option value="Other">Other City / دوسرا شہر</option>
                          </select>
                        </label>
                      </div>

                      {checkoutCity === 'Other' && (
                        <label className="block text-xs font-bold text-slate-700 space-y-1.5">
                          <span>Enter City Name / شہر کا نام *</span>
                          <input
                            name="customCity"
                            required
                            value={checkoutCustomCity}
                            onChange={(e) => setCheckoutCustomCity(e.target.value)}
                            placeholder="Type your city or town name"
                            autoFocus
                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-[#203664] focus:ring-2 focus:ring-[#203664]/10 outline-none"
                          />
                        </label>
                      )}

                      <label className="block text-xs font-bold text-slate-700 space-y-1.5">
                        <span>Street address / مکمل پتہ *</span>
                        <input
                          name="address"
                          required
                          minLength={8}
                          maxLength={250}
                          placeholder="House/Flat #, Street #, Sector/Colony/Area"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-[#203664] focus:ring-2 focus:ring-[#203664]/10 outline-none"
                        />
                      </label>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block text-xs font-bold text-slate-700 space-y-1.5">
                          <span>Famous landmark (قریبی مشہور جگہ - Optional)</span>
                          <input
                            name="landmark"
                            maxLength={120}
                            placeholder="e.g. Near Bilal Masjid, Main Market"
                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-[#203664] focus:ring-2 focus:ring-[#203664]/10 outline-none"
                          />
                        </label>
                        <label className="block text-xs font-bold text-slate-700 space-y-1.5">
                          <span>Postal code (optional)</span>
                          <input
                            name="postal"
                            pattern="[0-9]{5}"
                            placeholder="54000"
                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-[#203664] focus:ring-2 focus:ring-[#203664]/10 outline-none"
                          />
                        </label>
                      </div>

                      <label className="block text-xs font-bold text-slate-700 space-y-1.5">
                        <span>Order note (optional)</span>
                        <textarea
                          name="note"
                          maxLength={300}
                          placeholder="Any special instructions for delivery?"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-[#203664] focus:ring-2 focus:ring-[#203664]/10 outline-none min-h-[70px]"
                        />
                      </label>

                      <h2 className="text-lg font-bold text-slate-900 pt-2">
                        Payment Method / طریقہ ادائیگی
                      </h2>

                      <div className="border-2 border-emerald-600 bg-emerald-50/70 p-4 rounded-xl flex items-center gap-3.5">
                        <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                          <ShoppingBag size={18} />
                        </div>
                        <div>
                          <b className="text-sm font-bold text-emerald-950 block">
                            Cash on delivery (COD) · کیش آن ڈیلیوری
                          </b>
                          <p className="text-xs text-emerald-800 mt-0.5">
                            Pay the courier in cash when your order arrives. Estimated 2–4 working days across Pakistan.
                          </p>
                        </div>
                      </div>

                      {error && (
                        <p role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                          {error}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-4 px-6 bg-[#203664] hover:bg-[#2c4985] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all text-base disabled:opacity-60"
                      >
                        <span>
                          {busy ? 'Saving your order…' : `Place Order (Cash on Delivery) · ${money(subtotal + delivery)}`}
                        </span>
                        <ArrowRight size={18} />
                      </button>
                    </form>
                  )}
                </div>

                <div className="lg:col-span-5">
                  <Summary />
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-200 p-8">
                <ShoppingBag size={48} className="mx-auto text-slate-300 mb-4 stroke-1" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Your shopping bag is empty</h2>
                <p className="text-xs md:text-sm text-slate-500 max-w-sm mx-auto mb-6">
                  Explore our collection to find something you&apos;ll love.
                </p>
                <a
                  href="/products"
                  className="inline-flex items-center gap-2 bg-[#203664] hover:bg-[#2c4985] text-white font-bold text-sm px-6 py-3 rounded-xl shadow transition-all"
                >
                  <span>Start shopping</span>
                  <ArrowRight size={17} />
                </a>
              </div>
            )}
          </section>
        ) : page === 'track-order' ? (
          /* Track Order Page */
          <section className="wrap mt-6 max-w-xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                FROM OUR STORE TO YOUR DOOR
              </span>
              <h1 className="text-3xl font-extrabold text-slate-900">Track your order</h1>
              <p className="text-xs text-slate-500 mt-1">
                Enter your order reference and tracking key to view live status.
              </p>
            </div>

            <form
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError('');
                setOrder(null);
                const f = new FormData(e.currentTarget);
                try {
                  const r = await fetch(
                    '/api/orders?id=' +
                      encodeURIComponent(String(f.get('id'))) +
                      '&token=' +
                      encodeURIComponent(String(f.get('token')))
                  );
                  const d: any = await r.json();
                  if (!r.ok) throw Error(d.error);
                  setOrder(d);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Unable to find order');
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="block text-xs font-bold text-slate-700 space-y-1.5">
                <span>Order reference</span>
                <input
                  name="id"
                  required
                  placeholder="e.g. CPK-00101"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-[#203664] outline-none"
                />
              </label>

              <label className="block text-xs font-bold text-slate-700 space-y-1.5">
                <span>Tracking key</span>
                <input
                  name="token"
                  required
                  placeholder="Your private tracking token"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-[#203664] outline-none"
                />
              </label>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 px-4 bg-[#203664] hover:bg-[#2c4985] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow transition-all text-sm"
              >
                <span>{busy ? 'Checking…' : 'Check order status'}</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="w-full text-center text-xs font-bold text-[#203664] hover:underline pt-2"
                onClick={() => {
                  const v = localStorage.getItem('cartify-last-order') || localStorage.getItem('zeliy-last-order');
                  if (v) {
                    const d = JSON.parse(v);
                    const a = document.querySelector<HTMLInputElement>('[name=id]');
                    const b = document.querySelector<HTMLInputElement>('[name=token]');
                    if (a && b) {
                      a.value = d.id;
                      b.value = d.token;
                    }
                  } else {
                    toast.info('No recent order found on this device');
                  }
                }}
              >
                Use my most recent order
              </button>
            </form>

            {error && (
              <p role="alert" className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                {error}
              </p>
            )}

            {order && (
              <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#203664] flex items-center justify-center flex-shrink-0">
                    <Package size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Status: {order.status || 'Order Received'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {order.id} • {money(order.total)}
                    </p>
                  </div>
                </div>

                {/* Tracking Progress Timeline */}
                <OrderProgress status={order.status || 'Pending'} />
              </div>
            )}
          </section>
        ) : ['about', 'delivery', 'returns', 'privacy', 'contact-us', 'faq'].includes(page) ? (
          /* Informational Pages */
          <section className="wrap mt-6 max-w-3xl">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
              <a href="/" className="hover:text-slate-700">Home</a>
              <ChevronRight size={13} />
              <span className="text-slate-900 font-semibold">Help & Information</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-10 shadow-xs">
              <Info page={page} config={config} />
            </div>
          </section>
        ) : (
          <section className="wrap mt-12 text-center py-20">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Page not found</h1>
            <p className="text-sm text-slate-500 mb-6">The page you are looking for does not exist.</p>
            <a
              href="/products"
              className="inline-flex items-center gap-2 bg-[#203664] text-white font-bold px-6 py-3 rounded-xl shadow text-sm"
            >
              <span>Explore collection</span>
              <ArrowRight size={16} />
            </a>
          </section>
        )}
      </main>

      {/* Modern Multi-Column Footer */}
      <footer className="bg-[#172544] text-white pt-14 pb-8 border-t border-slate-800">
        <div className="wrap grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-12 border-b border-white/10">
          {/* Col 1: Brand */}
          <div className="lg:col-span-4 space-y-4">
            <a href="/" className="inline-block">
              <span className="text-3xl font-black tracking-tight text-white leading-none">
                cartify<span className="text-amber-400">.</span>
                <span className="block text-[8px] tracking-[3px] font-bold text-slate-400 uppercase mt-1">
                  PAKISTAN
                </span>
              </span>
            </a>
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
              Thoughtful finds and everyday essentials delivered across Pakistan. Browse in Pakistani Rupees with verified quality and cash on delivery.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold pt-1">
              <MapPin size={15} className="text-amber-400" />
              <span>Pakistan • PKR</span>
            </div>
            <div className="inline-block bg-white/10 border border-white/20 text-amber-300 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded">
              CASH ON DELIVERY (COD)
            </div>
          </div>

          {/* Col 2: Categories */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Explore Catalog
            </h3>
            <ul className="space-y-2 text-xs text-slate-300 font-medium">
              {rootCategories.map((c) => (
                <li key={c}>
                  <a
                    href={'/products?category=' + encodeURIComponent(c)}
                    className="hover:text-white transition-colors"
                  >
                    {c}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Customer Care */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Customer Support
            </h3>
            <ul className="space-y-2 text-xs text-slate-300 font-medium">
              <li>
                <a href="/track-order" className="hover:text-white transition-colors">
                  Track Your Order
                </a>
              </li>
              <li>
                <a href="/delivery" className="hover:text-white transition-colors">
                  Delivery Information
                </a>
              </li>
              <li>
                <a href="/returns" className="hover:text-white transition-colors">
                  Returns & Exchanges
                </a>
              </li>
              <li>
                <a href="/faq" className="hover:text-white transition-colors">
                  Frequently Asked Questions
                </a>
              </li>
              <li>
                <a href="/contact-us" className="hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: About Cartify */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              About Us
            </h3>
            <ul className="space-y-2 text-xs text-slate-300 font-medium">
              <li>
                <a href="/about" className="hover:text-white transition-colors">
                  Our Story
                </a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/admin/login" className="text-amber-400 hover:underline">
                  Staff Admin Login
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="wrap pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium">
          <span>© 2026 Cartify Pakistan. All rights reserved.</span>
          <span>Sample products & prices • Test orders preview</span>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Tab Bar */}
      <nav className="mobile-tabbar" aria-label="Mobile app navigation">
        <a className={page === 'home' ? 'active' : ''} href="/">
          <Grid2X2 size={20} />
          <span>Home</span>
        </a>
        <a className={page === 'products' || page === 'category' ? 'active' : ''} href="/products">
          <Search size={20} />
          <span>Shop</span>
        </a>
        <a className={page === 'wishlist' ? 'active' : ''} href="/wishlist">
          <Heart size={20} />
          <span>Saved</span>
          {saved.length > 0 && <sup>{saved.length}</sup>}
        </a>
        <a className={page === 'track-order' ? 'active' : ''} href="/track-order">
          <Package size={20} />
          <span>Track</span>
        </a>
        <a className={page === 'cart' || page === 'checkout' ? 'active' : ''} href="/cart">
          <ShoppingBag size={20} />
          <span>Bag</span>
          {count > 0 && <sup>{count}</sup>}
        </a>
      </nav>
    </>
  );
}

function Info({
  page,
  config,
}: {
  page: string;
  config: { deliveryCharge: number; freeThreshold: number; supportEmail: string; whatsapp: string };
}) {
  const deliveryDate = estimatedDelivery();
  const content: Record<string, { title: string; blocks: [string, string][] }> = {
    about: {
      title: 'Everyday finds, all in one place.',
      blocks: [
        [
          'Meet Cartify Pakistan',
          'A Pakistan-focused shopping concept bringing fashion, beauty, home essentials and everyday technology together in one convenient store.',
        ],
        [
          'Made for local shopping',
          'Browse in Pakistani rupees, build your bag and explore a cash-on-delivery checkout without creating an account.',
        ],
        [
          'About this preview',
          'The catalog, prices and shipping rates are samples. This store is not accepting live purchases yet.',
        ],
      ],
    },
    delivery: {
      title: 'Delivery information',
      blocks: [
        [
          'Across Pakistan',
          `Orders are estimated to arrive in 3 working days. For an order placed today, the estimated delivery date is ${deliveryDate}.`,
        ],
        [
          'Simple delivery pricing',
          `The sample delivery charge is Rs. ${config.deliveryCharge || 250} per order, with free delivery on orders of Rs. ${config.freeThreshold || 5000} or more. Your total appears before checkout.`,
        ],
        [
          'Cash on delivery',
          'The checkout is configured for cash on delivery. Preview orders are saved as test orders and are not dispatched.',
        ],
      ],
    },
    returns: {
      title: 'Returns & exchanges',
      blocks: [
        [
          'Before placing a live order',
          'This store is currently a preview. The final return window, eligibility conditions and return address must be confirmed before live sales begin.',
        ],
        [
          'Damaged or incorrect items',
          'For the live store, keep the packaging and order reference so the support team can review the issue. Support contact details will be published here before launch.',
        ],
        [
          'Test orders',
          'No payments or deliveries occur for preview orders, so no refund is required.',
        ],
      ],
    },
    privacy: {
      title: 'Privacy information',
      blocks: [
        [
          'Data in this preview',
          'Checkout saves the name, phone, optional email, address, order note and items you enter. Use sample details only while reviewing this site.',
        ],
        [
          'On your device',
          'Your shopping bag, wishlist and most recent order reference are stored in your browser so you can return to them. Clearing site data removes these local records.',
        ],
        [
          'Order access',
          'Order status requires both the order reference and private tracking key. Do not share your tracking key.',
        ],
        [
          'Before launch',
          'The store operator must publish verified contact details, retention terms and the final privacy policy before collecting live customer information.',
        ],
      ],
    },
    'contact-us': {
      title: 'How can we help?',
      blocks: [
        [
          'Order updates',
          'Use Track your order with your order reference and tracking key to view the status of a saved test order.',
        ],
        [
          'Customer support',
          'The store’s verified WhatsApp number and support email have not been connected yet. These will appear here before the store accepts live orders.',
        ],
      ],
    },
    faq: {
      title: 'A little help with your shopping',
      blocks: [
        [
          'Do I need an account?',
          'You can browse freely. You can also view your saved orders and bag anytime.',
        ],
        [
          'Can I pay cash on delivery?',
          'Yes, the checkout supports cash on delivery across Pakistan.',
        ],
        [
          'How much is delivery?',
          `Delivery is ${money(config.deliveryCharge)}, or free from ${money(config.freeThreshold)}.`,
        ],
        [
          'When will my order arrive?',
          `Estimated delivery is ${deliveryDate}, based on 3 working days from today.`,
        ],
        [
          'Can I pay with Easypaisa or JazzCash?',
          'Online payments are not connected yet. No online payment details are collected.',
        ],
        [
          'Are these products available to buy?',
          'These are sample catalog products for reviewing the storefront. Live inventory and confirmed prices must be added before launch.',
        ],
      ],
    },
  };

  const c = content[page] || { title: 'Help & Information', blocks: [] };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 border-b border-slate-100 pb-4">
        {c.title}
      </h1>

      {page === 'contact-us' && (config.supportEmail || config.whatsapp) && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
          {config.supportEmail && (
            <p className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Email:</span>
              <a href={'mailto:' + config.supportEmail} className="text-[#203664] hover:underline font-medium">
                {config.supportEmail}
              </a>
            </p>
          )}
          {config.whatsapp && (
            <p className="flex items-center gap-2">
              <span className="font-bold text-slate-700">WhatsApp:</span>
              <a
                href={'https://wa.me/' + config.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 hover:underline font-medium"
              >
                Contact us on WhatsApp ({config.whatsapp})
              </a>
            </p>
          )}
        </div>
      )}

      <div className="space-y-6">
        {c.blocks
          .filter(([h]) => !(h === 'Customer support' && (config.supportEmail || config.whatsapp)))
          .map(([h, t]) => (
            <div key={h} className="space-y-1.5">
              <h2 className="text-base font-bold text-slate-900">{h}</h2>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">{t}</p>
            </div>
          ))}
      </div>
    </div>
  );
}
