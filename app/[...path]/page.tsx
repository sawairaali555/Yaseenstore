import { notFound } from "next/navigation";
import Store from "../store";
import { catalog, categoryTree, settings } from "@/lib/store-data";
import "@/src/index.css";

export const metadata = { title: "GharCart | Everyday shopping in Pakistan" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const isStorePage = path.length === 1 && ["checkout", "products", "cart", "wishlist", "track-order", "about", "delivery", "returns", "privacy", "contact-us", "faq"].includes(path[0]);
  const isProduct = path.length === 2 && path[0] === "product";
  if (!isStorePage && !isProduct) notFound();

  const catalogProducts = catalog();
  const [items, config, tree] = await Promise.all([catalogProducts, settings(), categoryTree(catalogProducts)]);
  if (isProduct && !items.some((item) => item.id === path[1])) notFound();
  return <Store path={path} initialProducts={items} config={config} categories={tree} />;
}
