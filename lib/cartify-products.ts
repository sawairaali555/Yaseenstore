import catalog from "@/data/cartify-products.json";

export type CartifyProduct = {
  id: string;
  title: string;
  image: string;
  price: number;
  originalPrice: number;
  currency: string;
  soldCount: string;
  rating: number;
  reviewCount: number;
  stockLeft: number | null;
  badges: string[];
  category: string;
  brand: string;
  isAd: boolean;
};

export const currencyConfig = {
  locale: "en-PK",
  currency: "PKR",
  prefix: "Rs.",
};

export const categories = [
  "Recommended",
  "Beauty & Personal Care",
  "Women's Clothing",
  "Home & Kitchen",
  "Men's Clothing",
  "Women's Shoes",
  "Underwear & Sleepwear",
  "Sports & Outdoors",
  "Office & School Supplies",
];

export const products: CartifyProduct[] = catalog.map((product) => ({
  ...product,
  currency: currencyConfig.prefix,
}));

export const deals = products.slice(0, 12).map((product, index) => ({
  ...product,
  stockLeft: product.stockLeft ?? 2 + (index % 8),
  dealEndsIn: 7200 + index * 470,
}));
