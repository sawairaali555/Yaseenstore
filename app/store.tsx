"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
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
  MessageCircle,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster, toast } from 'sonner';
import ProductDetail from "./product-detail";
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
import { PAKISTAN_PROVINCES, PAKISTAN_CITIES_BY_PROVINCE, ALL_PAKISTAN_CITIES, POPULAR_PAKISTAN_CITIES, cleanPakistanPhone, isValidPakistanPhone, normalizePakistanPhone, provinceForPakistanCity } from '@/lib/pakistan-locations';
import type { Settings } from '@/lib/store-data';
import { parseSavedCart, parseSavedWishlist, saveShoppingData } from '@/lib/shopping-storage';
import { productImage } from '@/lib/product-image';
import { calculatePromotions } from '@/lib/promotions';
import StoreHeader from '@/components/storefront/StoreHeader';
import StoreFooter from '@/components/storefront/StoreFooter';
import DealCarousel from '@/components/storefront/DealCarousel';
import { homepageDeals } from '@/lib/homepage-deals';

type Item = { id: string; qty: number; size: string; color?: string; variantId?: string; bundleId?: string };
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
const estimatedDeliveryRange = (city: string) => {
  if (!city.trim()) return null;
  const remote = ['Quetta', 'Gwadar', 'Skardu', 'Gilgit', 'Chitral'].some((name) => city.toLowerCase().includes(name.toLowerCase()));
  const earliest = addWorkingDays(new Date(), remote ? 3 : 2);
  const latest = addWorkingDays(new Date(), remote ? 6 : 4);
  const format = (date: Date) => date.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
  return `${format(earliest)}–${format(latest)}`;
};
const estimatedDelivery = () => addWorkingDays(new Date(), 3).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });

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
  const [phoneValue, setPhoneValue] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [couponOpen, setCouponOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<NonNullable<Settings['coupons']>[number] | null>(null);
  const [couponMessage, setCouponMessage] = useState('');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const checkoutFormRef = useRef<HTMLFormElement>(null);
  const submittingOrder = useRef(false);
  const checkoutRequestId = useRef('');

  const resolvedTree = useMemo(() => categoryTreeNodes ?? buildDefaultCategoryTree(), [categoryTreeNodes]);

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
    chosenVariantId?: string,
    chosenBundleId?: string
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

    const existing = cart.find(i => i.id === p.id && i.size === targetSize && i.bundleId === chosenBundleId &&
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
          i.bundleId === chosenBundleId &&
          (!targetColor || (i.color || '').toLowerCase() === targetColor.toLowerCase())
      );

      if (found) {
        const newQty = Math.min(found.qty + n, limit);
        if (newQty === found.qty && found.qty >= limit && !p.allowBackorders) {
          toast.warning(`Maximum available stock reached (${limit} units).`);
          return c;
        }
        return c.map((i) =>
          i === found ? { ...i, qty: newQty, variantId: chosenVariantId || i.variantId, bundleId: chosenBundleId || i.bundleId } : i
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
          bundleId: chosenBundleId,
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
    const bundle = prod?.bundles?.find((candidate) => candidate.id === i.bundleId);
    const unitPrice = bundle ? bundle.price / Math.max(1, bundle.quantity) : (validated?.unitPrice ?? 0);
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
  const summaryLines = Array.from(validLines.reduce((groups, line) => {
    const color = line.color || line.product?.color || '';
    const key = [line.id, line.variantId || '', line.size || 'Standard', color.toLowerCase(), line.bundleId || ''].join('|');
    const existing = groups.get(key);
    if (existing) {
      existing.qty += line.qty;
      existing.sourceIndexes.push(cartItemsWithDetails.indexOf(line));
    } else {
      groups.set(key, { ...line, color, qty: line.qty, sourceIndexes: [cartItemsWithDetails.indexOf(line)] });
    }
    return groups;
  }, new Map<string, (typeof validLines)[number] & { sourceIndexes: number[] }>()).values());
  const subtotal = validLines.reduce((a, i) => a + (i.unitPrice || i.product!.price) * i.qty, 0);
  const automaticPromotion = calculatePromotions(cart, products, config.offers || []);
  const promotionDiscount = Math.min(subtotal, automaticPromotion.discount);
  const couponBase = Math.max(0, subtotal - promotionDiscount);
  const couponIsEligible = Boolean(appliedCoupon && appliedCoupon.status === 'Active' && subtotal >= Number(appliedCoupon.minSpend || 0) && (!appliedCoupon.expiryDate || Date.parse(appliedCoupon.expiryDate) >= Date.now()));
  const couponDiscount = couponIsEligible && appliedCoupon
    ? Math.min(couponBase, appliedCoupon.type === 'percentage'
      ? Math.round(couponBase * Math.min(100, Number(appliedCoupon.value || 0)) / 100)
      : Number(appliedCoupon.value || 0))
    : 0;
  const discountedSubtotal = Math.max(0, subtotal - promotionDiscount - couponDiscount);
  const delivery = !validLines.length || discountedSubtotal >= config.freeThreshold ? 0 : config.deliveryCharge;
  const orderTotal = Math.max(0, subtotal - promotionDiscount - couponDiscount + delivery);
  const whatsAppNumber = String(config.whatsapp || '').replace(/[^0-9]/g, '');
  const count = cart.reduce((a, i) => a + i.qty, 0);
  const freeThresholdProgress = config.freeThreshold > 0 ? Math.min(100, Math.round((discountedSubtotal / config.freeThreshold) * 100)) : 100;
  const cityOptions = [
    ...POPULAR_PAKISTAN_CITIES.filter((city) => ALL_PAKISTAN_CITIES.includes(city)),
    ...ALL_PAKISTAN_CITIES.filter((city) => !POPULAR_PAKISTAN_CITIES.includes(city)),
  ];

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponMessage('Enter a coupon code.');
      return;
    }
    const coupon = (config.coupons || []).find((candidate) => candidate.code.trim().toUpperCase() === code);
    if (!coupon || coupon.status !== 'Active') {
      setAppliedCoupon(null);
      setCouponMessage('This coupon code is invalid or inactive.');
      return;
    }
    if (coupon.expiryDate && Date.parse(coupon.expiryDate) < Date.now()) {
      setAppliedCoupon(null);
      setCouponMessage('This coupon code has expired.');
      return;
    }
    if (subtotal < Number(coupon.minSpend || 0)) {
      setAppliedCoupon(null);
      setCouponMessage(`Spend ${money(Number(coupon.minSpend || 0))} to use this coupon.`);
      return;
    }
    setCouponInput(coupon.code.toUpperCase());
    setAppliedCoupon(coupon);
    setCouponMessage('Coupon applied successfully.');
  }

  function changeSummaryQuantity(sourceIndexes: number[], delta: number, currentQty: number, availableStock: number) {
    if (delta > 0 && currentQty >= availableStock) {
      toast.warning(`Only ${availableStock} unit(s) available.`);
      return;
    }
    setCart((current) => {
      const next = [...current];
      if (delta > 0) {
        const index = sourceIndexes[0];
        if (index >= 0 && next[index]) next[index] = { ...next[index], qty: next[index].qty + 1 };
      } else {
        const index = [...sourceIndexes].reverse().find((candidate) => next[candidate]?.qty > 0);
        if (index !== undefined && next[index]) {
          if (next[index].qty <= 1) next.splice(index, 1);
          else next[index] = { ...next[index], qty: next[index].qty - 1 };
        }
      }
      return next;
    });
  }

  function openWhatsAppOrder() {
    const form = checkoutFormRef.current;
    if (!form) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const phone = normalizePakistanPhone(String(data.get('phone') || ''));
    const city = checkoutCity.trim();
    const address = String(data.get('address') || '').trim();
    if (!name || !phone || !city || address.length < 8) {
      if (!phone) setPhoneError('Enter a valid mobile number / درست موبائل نمبر درج کریں');
      setError('Please complete your name, valid phone, city and street address before ordering on WhatsApp.');
      form.reportValidity();
      return;
    }
    const savedDetails = { name, phone, province: checkoutProvince, city, address, landmark: String(data.get('landmark') || '') };
    saveShoppingData('cartify-checkout-details', savedDetails);
    const message = [
      'Assalam-o-alaikum, I would like to place this order:',
      `Name: ${name}`,
      `Phone: ${phone}`,
      `City: ${city}, ${checkoutProvince}`,
      `Address: ${address}`,
      ...summaryLines.map((line) => `• ${line.product!.name} × ${line.qty}${line.size !== 'Standard' ? ` (${line.size})` : ''}${line.color ? ` - ${line.color}` : ''}`),
      `Total: ${money(orderTotal)}`,
      'Payment: Cash on Delivery',
    ].join('\n');
    window.location.href = `https://wa.me/${whatsAppNumber}?text=${encodeURIComponent(message)}`;
  }

  const purchasableProducts = useMemo(() => filterStorefrontProducts(products), [products]);
  const mainProducts = useMemo(() => {
    const groups = new Map<string, Product>();
    for (const product of purchasableProducts) {
      const group = product.listingGroup || product.id;
      if (!groups.has(group) || product.id === group) groups.set(group, product);
    }
    return [...groups.values()];
  }, [purchasableProducts]);

  const availableTree = useMemo(() => filterAvailableCategoryTree(resolvedTree, purchasableProducts), [resolvedTree, purchasableProducts]);
  const rootCategories = useMemo(() => topLevelCategoryNames(availableTree), [availableTree]);
  const availableCategoryNames = useMemo(() => flattenAvailableNames(availableTree), [availableTree]);
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
      // Carry product selection across frontend origins, then validate it
      // against this checkout's own catalog before changing the saved bag.
      const purchaseParams = new URLSearchParams(location.search);
      const buyId = page === 'checkout' ? purchaseParams.get('buy') : null;
      if (buyId) {
        const buyItem = parseSavedCart(JSON.stringify([{
          id: buyId,
          qty: Number(purchaseParams.get('qty') || 1),
          size: purchaseParams.get('size') || 'Standard',
          color: purchaseParams.get('color') || undefined,
          variantId: purchaseParams.get('variantId') || undefined,
        }]))[0];
        if (buyItem && validateCartItems([buyItem], products).valid) {
          const existing = rawCart.findIndex(item => item.id === buyItem.id && item.size === buyItem.size && (item.color || '') === (buyItem.color || '') && (item.variantId || '') === (buyItem.variantId || ''));
          if (existing >= 0) rawCart[existing] = buyItem;
          else rawCart.push(buyItem);
          saveShoppingData('cartify-cart', rawCart);
        } else {
          toast.error('This selection is unavailable. Please choose an available product or size.');
        }
        const cleanedUrl = new URL(location.href);
        ['buy', 'qty', 'size', 'color', 'variantId'].forEach(key => cleanedUrl.searchParams.delete(key));
        history.replaceState(history.state, '', cleanedUrl.pathname + cleanedUrl.search + cleanedUrl.hash);
      }
      const validation = validateCartItems(rawCart, products);
      const validatedItems = validation.items
        .filter((item) => item.purchasable && item.requestedQty > 0)
        .map((item) => ({
          id: item.id,
          size: item.size,
          color: item.color,
          variantId: item.variantId,
          bundleId: rawCart.find((cartItem) => cartItem.id === item.id && cartItem.size === item.size && (cartItem.color || '') === (item.color || '') && (cartItem.variantId || '') === (item.variantId || ''))?.bundleId,
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

  const frontProducts = mainProducts;
  const dealProducts = homepageDeals(products, config.lightningDealProductIds);
  const clearanceProducts = homepageDeals(products, config.clearanceDealProductIds, true);
  const interestTabs = [
    'Recommended',
    'Beauty & Personal Care',
    "Women's Clothing",
    'Home & Kitchen',
    "Men's Clothing",
    "Women's Shoes",
    'Sports & Outdoors',
    'Office & School',
  ];

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

  function MarketCard({ p, index }: { p: Product; index: number }) {
    const priceNow = effectivePrice(p);
    const oldPrice = p.old || Math.round(priceNow * 1.42);
    const soldText = p.soldCount || `${Math.max(1, (index % 9) + 1)}k+ sold`;
    const ratingCount = 38 + ((index * 73) % 5200);
    return (
      <article className="temu-card">
        <a href={'/product/' + p.id} className="temu-card-photo">
          <img src={img(p)} alt={p.name} loading="lazy" />
          {(index % 5 === 0 || p.tag) && <span className="temu-ad">AD</span>}
          {index % 3 === 0 && <span className="temu-deal">Deal</span>}
        </a>
        <a href={'/product/' + p.id} className="temu-card-title" title={p.name}>
          {p.name}
        </a>
        <div className="temu-price-line">
          <strong>Rs.{priceNow.toLocaleString('en-PK')}</strong>
          <del>{oldPrice.toLocaleString('en-PK')}</del>
          <span>{soldText}</span>
        </div>
        <div className="temu-rating">
          <span>★★★★★</span>
          <small>{ratingCount.toLocaleString('en-PK')}</small>
          <button type="button" aria-label={`Add ${p.name} to cart`} onClick={() => add(p)}>
            <ShoppingBag size={14} />
          </button>
        </div>
        {p.tag && <div className="temu-store-badge">{p.tag}</div>}
      </article>
    );
  }

  function Summary({ mobile = false }: { mobile?: boolean } = {}) {
    return (
      <aside className={`${mobile ? 'checkout-summary-mobile-panel' : ''} bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-6 h-fit md:sticky md:top-24`}>
        <h2 className="text-xl font-bold text-slate-900 mb-4 pb-3 border-b border-slate-200">
          Order Summary
        </h2>

        {/* Free Shipping Progress Indicator */}
        <div className="mb-5 bg-white border border-slate-200 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-700 flex items-center gap-1.5">
              <Truck size={14} className="text-[#203664]" />
              {discountedSubtotal >= config.freeThreshold
                ? "🎉 You've unlocked FREE Delivery!"
                : `Add Rs ${(config.freeThreshold - discountedSubtotal).toLocaleString('en-PK')} for FREE Delivery`}
            </span>
            <span className="text-[#203664] font-bold">{freeThresholdProgress}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                discountedSubtotal >= config.freeThreshold ? 'bg-emerald-500' : 'bg-[#203664]'
              }`}
              style={{ width: `${freeThresholdProgress}%` }}
            />
          </div>
        </div>

        {/* Items line summary */}
        <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
          {summaryLines.map((line) => (
            <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] gap-3 items-center text-xs text-slate-600" key={[line.id, line.variantId, line.size, line.color].join('|')}>
              <img src={img(line.product!)} alt="" loading="lazy" className="w-12 h-12 rounded-lg object-contain bg-white border border-slate-200" />
              <div className="min-w-0">
                <span className="block truncate font-semibold text-slate-800">{line.product!.name}</span>
                <span className="block mt-0.5">× {line.qty} · {money((line.unitPrice || line.product!.price) * line.qty)}</span>
              </div>
              <div className="inline-flex items-center rounded-full border border-slate-300 bg-white overflow-hidden">
                <button type="button" aria-label={`Decrease ${line.product!.name} quantity`} onClick={() => changeSummaryQuantity(line.sourceIndexes, -1, line.qty, line.availableStock)} className="w-9 h-9 grid place-items-center hover:bg-slate-100"><Minus size={13} /></button>
                <span className="min-w-7 text-center font-bold text-slate-800">{line.qty}</span>
                <button type="button" aria-label={`Increase ${line.product!.name} quantity`} disabled={line.qty >= line.availableStock} onClick={() => changeSummaryQuantity(line.sourceIndexes, 1, line.qty, line.availableStock)} className="w-9 h-9 grid place-items-center hover:bg-slate-100 disabled:opacity-35"><Plus size={13} /></button>
              </div>
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
          {promotionDiscount > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Automatic offer</span>
              <span>-{money(promotionDiscount)}</span>
            </div>
          )}
          {couponDiscount > 0 && appliedCoupon && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Coupon ({appliedCoupon.code.toUpperCase()})</span>
              <span>-{money(couponDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-slate-900 pt-3 border-t border-slate-200">
            <span>Total (PKR)</span>
            <span className="text-lg text-[#203664]">{money(orderTotal)}</span>
          </div>
        </div>

        {automaticPromotion.applied.length === 0 && automaticPromotion.rejected.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <b>{automaticPromotion.rejected[0].title}</b>
            <span className="block mt-0.5">{automaticPromotion.rejected[0].reason}</span>
          </div>
        )}

        {estimatedDeliveryRange(checkoutCity) && (
          <p className="text-xs text-slate-500 mt-4 flex items-center gap-1.5 bg-slate-100/70 p-2.5 rounded-lg">
            <Clock size={14} className="text-slate-500 flex-shrink-0" />
            <span>Estimated delivery to {checkoutCity}: <b>{estimatedDeliveryRange(checkoutCity)}</b></span>
          </p>
        )}

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
    const phone = normalizePakistanPhone(phoneRaw);
    if (!phone) {
      setPhoneError('Enter a valid mobile number / درست موبائل نمبر درج کریں');
      setError('Please enter a valid Pakistani mobile number.');
      setBusy(false);
      return;
    }
    setPhoneError('');
    const cityVal = (checkoutCity || String(form.get('city') || '')).trim();
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
      note: String(form.get('note') || '').trim(),
      couponCode: appliedCoupon?.code,
      checkoutRequestId: checkoutRequestId.current || (checkoutRequestId.current = crypto.randomUUID()),
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

  const megaMenuRoots = availableTree.filter((node) => node.enabled).slice(0, 24);
  const megaMenuTiles = megaMenuRoots.flatMap((root) => root.children.filter((child) => child.enabled)).slice(0, 25);
  const categoryImage = (node: CategoryNode) => {
    if (node.image) return node.image;
    const match = purchasableProducts.find((item) =>
      item.category.toLowerCase() === node.name.toLowerCase() ||
      (item.subcategory || '').toLowerCase() === node.name.toLowerCase()
    );
    return match ? img(match) : '';
  };

  const p = products.find((p) => p.id === path[1]);

  return (
    <div
      className={page === 'product' ? 'cartify-storefront marketplace' : 'cartify-storefront'}
      style={{
        "--store-primary": config.themePrimaryColor || "#203664",
        "--store-accent": config.themeAccentColor || "#ff5000",
        "--store-background": config.themeBackgroundColor || "#ffffff",
        "--store-text": config.themeTextColor || "#1e293b",
        "--store-font": config.themeFontFamily || "Inter, Arial, sans-serif",
        "--store-button-radius": config.themeButtonRadius || "12px",
        "--store-card-radius": config.themeCardRadius || "16px",
      } as React.CSSProperties}
    >
      <Toaster richColors position="bottom-right" />

      <StoreHeader config={config} megaMenuRoots={megaMenuRoots} megaMenuTiles={megaMenuTiles}
        categoryImage={categoryImage} searchContainerRef={searchContainerRef}
        isSearchFocused={isSearchFocused} setIsSearchFocused={setIsSearchFocused}
        searchLiveQuery={searchLiveQuery} setSearchLiveQuery={setSearchLiveQuery}
        searchSuggestions={searchSuggestions} count={count} />

      {/* Main Content Area */}
      <main className="min-h-screen pb-16">
        {page === 'home' ? (
          <>
            <section className="temu-shell">
              <div className="temu-security">
                <span><ShieldCheck size={13} /> Why choose Temu?</span>
                <span><ShieldCheck size={13} /> Secure privacy</span>
                <span><ShieldCheck size={13} /> Safe payments</span>
                <span><Truck size={13} /> Delivery guarantee <ChevronRight size={12} /></span>
              </div>
              <div className="temu-warning">
                <b>Security reminder:</b> Please be wary of scam messages and links. We will not ask for extra fees via SMS or email.
                <a href="/products">View</a>
              </div>

              <div className="temu-deal-board">
                <DealCarousel products={dealProducts} title="LIGHTNING DEALS" />
                <DealCarousel products={clearanceProducts} title="CLEARANCE DEALS" clearance />
              </div>

              <div className="temu-tax"><ShieldCheck size={18} /> Tax & Customs Policy <b>Hassle-free tax service</b> <ChevronRight size={15} /></div>

              <div className="temu-interest-head">
                <span>AUTUMN EDITION</span>
                <h1>EXPLORE YOUR INTERESTS</h1>
              </div>
              <div className="temu-tabs">
                {interestTabs.map((tab) => (
                  <a href="/products" key={tab}>{tab}</a>
                ))}
                <button type="button" aria-label="Next category"><ChevronRight size={16} /></button>
              </div>

              <div className="temu-grid">
                {frontProducts.map((p, index) => (
                  <MarketCard key={`${p.id}-market-${index}`} p={p} index={index} />
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
              add={(quantity = qty, bundleId, color, variantId) => add(p, quantity, size, color || p.color, variantId, bundleId)}
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
                    href="/"
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
                    <form ref={checkoutFormRef} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5" onSubmit={checkout}>
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                        <label className="block text-xs font-bold text-slate-700 space-y-1.5">
                          <span>Mobile number / موبائل نمبر *</span>
                          <input
                            name="phone"
                            required
                            type="tel"
                            inputMode="numeric"
                            maxLength={11}
                            pattern="03[0-9]{9}"
                            title="Enter an 11-digit Pakistani mobile number starting with 03"
                            placeholder="0300 1234567"
                            value={phoneValue}
                            onChange={(event) => {
                              const next = event.target.value.replace(/\D/g, '').slice(0, 11);
                              setPhoneValue(next);
                              setPhoneError(next && !isValidPakistanPhone(next) ? 'Enter 11 digits starting with 03.' : '');
                            }}
                            aria-invalid={Boolean(phoneError)}
                            aria-describedby="checkout-phone-help"
                            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm focus:border-[#203664] focus:ring-2 focus:ring-[#203664]/10 outline-none ${phoneError ? 'border-rose-500' : 'border-slate-300'}`}
                          />
                          {phoneError && <small id="checkout-phone-help" className="text-rose-600">{phoneError}</small>}
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block text-xs font-bold text-slate-700 space-y-1.5" htmlFor="checkout-province">
                          <span className="block">Province / <span lang="ur" dir="rtl" className="urdu-label">صوبہ</span> *</span>
                          <select
                            id="checkout-province"
                            name="state"
                            required
                            value={checkoutProvince}
                            onChange={(e) => {
                              setCheckoutProvince(e.target.value);
                              setCheckoutCity('');
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

                        <label className="block text-xs font-bold text-slate-700 space-y-1.5" htmlFor="checkout-city">
                          <span className="block">City / <span lang="ur" dir="rtl" className="urdu-label">شہر</span> *</span>
                          <input
                            id="checkout-city"
                            name="city"
                            required
                            list="pakistan-cities"
                            value={checkoutCity}
                            onChange={(e) => {
                              const city = e.target.value;
                              setCheckoutCity(city);
                              const detectedProvince = provinceForPakistanCity(city);
                              if (detectedProvince) setCheckoutProvince(detectedProvince);
                            }}
                            placeholder="Search or type your city"
                            autoComplete="address-level2"
                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:border-[#203664] focus:ring-2 focus:ring-[#203664]/10 outline-none"
                          />
                          <datalist id="pakistan-cities">
                            {cityOptions.map((city) => <option key={city} value={city} />)}
                          </datalist>
                        </label>
                      </div>

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
                      <p className="-mt-3 text-xs text-slate-500">Include house/flat number, street, area and a nearby landmark to help the courier find you.</p>

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
                      <p className="flex items-center gap-2 text-xs font-medium text-slate-600"><Phone size={15} className="text-emerald-600" /> We’ll confirm your order by call or WhatsApp before dispatch.</p>

                      {error && (
                        <p role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                          {error}
                        </p>
                      )}

                      <div className="checkout-order-actions flex flex-col gap-2.5 pt-1">
                        <button
                          type="submit"
                          disabled={busy}
                          style={{ backgroundColor: '#ff5708', color: '#ffffff', borderRadius: 9999 }}
                          className="checkout-complete-order w-full min-h-[52px] px-6 active:scale-[0.99] text-white rounded-full flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-60 disabled:cursor-wait"
                        >
                          {busy && <Clock size={19} className="animate-spin" />}
                          <span className="text-base font-bold tracking-wide">
                            {busy ? 'Placing Order…' : 'Complete Order'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={openWhatsAppOrder}
                          disabled={busy}
                          style={{ backgroundColor: '#25d366', color: '#ffffff', borderRadius: 9999 }}
                          className="checkout-whatsapp-order w-full min-h-[52px] px-6 active:scale-[0.99] text-white rounded-full flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-60"
                        >
                          <MessageCircle size={21} strokeWidth={2.5} />
                          <span className="text-base font-bold">Order via WhatsApp</span>
                        </button>
                      </div>
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

      <>
      <StoreFooter rootCategories={rootCategories} />

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
    </div>
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
