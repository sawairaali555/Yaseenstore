export const categories = [
  "All products",
  "Fashion",
  "Beauty & Care",
  "Home & Kitchen",
  "Electronics",
  "Accessories",
];
export const products = [
  {
    id: "everyday-headphones",
    name: "Everyday Wireless Headphones",
    category: "Electronics",
    price: 3490,
    old: 4990,
    image: "headphones",
    tag: "Best seller",
    description:
      "Your daily soundtrack, wherever you go. A comfortable over-ear design with simple wireless controls and a clean, minimal finish.",
    features: [
      "Wireless listening",
      "Adjustable padded headband",
      "Includes charging cable",
    ],
  },
  {
    id: "classic-handbag",
    name: "The Everyday Shoulder Bag",
    category: "Accessories",
    price: 2790,
    old: 3990,
    image: "bag",
    tag: "New arrival",
    description:
      "A polished finishing touch for workdays and weekends. A roomy everyday silhouette keeps your essentials close.",
    features: [
      "Everyday carry size",
      "Easy-access closure",
      "Adjustable shoulder strap",
    ],
  },
  {
    id: "daily-sneakers",
    name: "Everyday Low-Top Sneakers",
    category: "Fashion",
    price: 4290,
    old: 5990,
    image: "shoes",
    tag: "Popular pick",
    description:
      "Easy styling starts here. Versatile low-top sneakers for casual days and your everyday wardrobe.",
    features: [
      "Classic low-top shape",
      "Lace-up fastening",
      "Choose your usual size",
    ],
    offerPrice: 4290,
    offerEnd: "2026-12-31T23:59:59Z",
  },
  {
    id: "daily-serum",
    name: "Daily Glow Face Serum · 30 ml",
    category: "Beauty & Care",
    price: 1490,
    old: 1990,
    image: "beauty",
    tag: "Everyday essential",
    description:
      "A simple addition to your daily skincare routine. Apply a small amount to clean skin and follow with moisturiser. Patch test before use.",
    features: ["30 ml bottle", "Dropper applicator", "For external use only"],
  },
  {
    id: "smart-watch",
    name: "Everyday Smart Watch",
    category: "Electronics",
    price: 5490,
    old: 6990,
    image: "watch",
    tag: "Trending",
    description:
      "A streamlined watch for your daily routine, with an easy-to-read display and comfortable everyday strap.",
    features: [
      "Digital display",
      "Adjustable strap",
      "Charging cable included",
    ],
  },
  {
    id: "kitchen-cookware",
    name: "Everyday Kitchen Cookware",
    category: "Home & Kitchen",
    price: 3990,
    old: 5490,
    image: "kitchen",
    tag: "Home favourite",
    description:
      "Make room for easier everyday cooking. Practical cookware with a comfortable handle for home kitchens.",
    features: [
      "Everyday kitchen essential",
      "Easy-grip handle",
      "Hand washing recommended",
    ],
  },
];
export type Product = (typeof products)[number] & {
  subcategory?: string;
  sku?: string;
  color?: string;
  option?: string;
  catalogOwner?: string;
  listingGroup?: string;
  stock?: number;
  sizeStock?: Record<string, number>;
  sizes?: string[];
  images?: string[];
  reviews?: { id: string; name: string; rating: number; text: string; date: string }[];
  pricingMode?: "group" | "option";
  offerPrice?: number;
  offerStart?: string;
  offerEnd?: string;
  pricingType?: "offer" | "bundle";
  bundles?: { id: string; content: string; contentArabic: string; quantity: number; price: number }[];
  deal?: {
    title?: string;
    shippingBadge?: string;
    creditBadge?: string;
    productNote?: string;
    deliveryNote?: string;
    cta?: string;
    trustShipping?: string;
    trustPayment?: string;
    trustGuarantee?: string;
    chips?: string[];
  };
  status?: "Active" | "Draft";
  costPrice?: number;
  seo?: {
    title?: string;
    titleUrdu?: string;
    keywords?: string;
    keywordsUrdu?: string;
    description?: string;
    descriptionUrdu?: string;
    tags?: string;
    tagsUrdu?: string;
  };
};
export const money = (n: number) => "Rs. " + n.toLocaleString("en-PK");
export const shipping = (subtotal: number) => (subtotal >= 5000 ? 0 : 250);

const offerBoundary = (value: string | undefined, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setHours(23, 59, 59, 999);
  }
  return date;
};

export function activeOffer(product: Product, now = new Date()) {
  const offerPrice = Number(product.offerPrice || 0);
  if (!offerPrice || offerPrice >= product.price) return null;
  const start = offerBoundary(product.offerStart);
  const end = offerBoundary(product.offerEnd, true);
  if (start && now < start) return null;
  if (end && now > end) return null;
  return {
    price: offerPrice,
    regularPrice: product.price,
    start,
    end,
    saving: product.price - offerPrice,
  };
}

export const effectivePrice = (product: Product, now = new Date()) =>
  activeOffer(product, now)?.price ?? product.price;
