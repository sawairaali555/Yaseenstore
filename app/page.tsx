import Store from "./store";
import { catalog, categoryTree, settings } from "@/lib/store-data";

export const metadata = {
  title: "GharCart | Everyday shopping in Pakistan",
  description: "Shop useful everyday products with cash on delivery across Pakistan.",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const catalogProducts = catalog();
  const [items, config, tree] = await Promise.all([catalogProducts, settings(), categoryTree(catalogProducts)]);
  return <Store path={[]} initialProducts={items} config={config} categories={tree} />;
}
