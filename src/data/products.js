import { products as storeCatalog } from "../../app/catalog.ts";

// Use the public storefront seed catalog shared with the main application.
// Admin-only test products are exported separately and never reach this list.
export const STORE_CONFIG = {
  checkoutUrl: "/checkout",
  whatsappNumber: "923001234567",
  deliveryFee: 199,
  freeDeliveryThreshold: 3000,
};

const toVariantOptions = (product) => {
  if (product.variantOptions?.length) return product.variantOptions;

  const options = [];
  if (product.sizes?.length) options.push({ name: "Size", values: product.sizes });
  if (product.color) options.push({ name: "Color", values: [product.color] });
  return options;
};

export const products = storeCatalog
  .filter((product) => product.status === "Active")
  .map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.offerPrice ?? product.price,
    oldPrice: product.old ?? product.regularPrice ?? product.price,
    images: product.images?.length ? product.images : [product.image],
    stock: product.stock ?? 0,
    variants: toVariantOptions(product),
    rating: 0,
    reviewCount: product.reviews?.length ?? 0,
    soldCount: Number.parseInt(product.soldCount ?? "0", 10) || 0,
    description: product.description ?? product.shortDescription ?? "",
  }))
  .filter((product) => product.images[0]);

export const categories = ["All products", ...new Set(products.map((product) => product.category))];
export const money = (value) => `Rs. ${Number(value).toLocaleString("en-PK")}`;
