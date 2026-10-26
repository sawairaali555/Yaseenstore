// Storefront integration placeholders — edit these four values for your store.
export const STORE_CONFIG = {
  checkoutUrl: "/checkout", // TODO: Replace if your checkout lives at a different URL.
  whatsappNumber: "923001234567", // TODO: Country code + number, without + or spaces.
  deliveryFee: 199, // TODO: Standard delivery charge in PKR.
  freeDeliveryThreshold: 3000, // TODO: Free-delivery cart value in PKR.
};

// These IDs and options match the existing checkout catalog.
export const products = [
  {
    id: "demo-wireless-earbuds", name: "Demo product · Wireless earbuds", category: "Electronics",
    price: 2499, oldPrice: 3299, images: ["/images/headphones.jpg"], stock: 7,
    variants: [{ name: "Color", values: ["Black"] }], rating: 0, reviewCount: 0, soldCount: 0,
    description: "A sample electronics product for testing variants, inventory and your checkout connection.",
  },
  {
    id: "demo-ceramic-mug", name: "Demo product · Minimal ceramic mug", category: "Home & kitchen",
    price: 899, oldPrice: 1199, images: ["/images/kitchen.jpg"], stock: 12,
    variants: [{ name: "Color", values: ["White"] }], rating: 0, reviewCount: 0, soldCount: 0,
    description: "A simple ceramic mug for testing stock, product actions and checkout behavior.",
  },
  {
    id: "womens-seamless-high-waist-panties-soft-comfortable-daisy-print-underwear-1792127586002",
    name: "Women's seamless high-waist panties", category: "Fashion", price: 599, oldPrice: 900,
    images: ["/images/beauty.jpg"], stock: 6,
    variants: [{ name: "Size", values: ["L", "XL"] }, { name: "Color", values: ["Green"] }],
    rating: 0, reviewCount: 0, soldCount: 0,
    description: "Soft seamless high-waist briefs with a comfortable everyday fit and daisy detail.",
  },
];

export const categories = ["All products", ...new Set(products.map(product => product.category))];
export const money = value => `Rs. ${Number(value).toLocaleString("en-PK")}`;
