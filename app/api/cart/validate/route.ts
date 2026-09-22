import { catalog, settings, deliveryFor } from "@/lib/store-data";
import { validateCartItems } from "@/lib/inventory-engine";
import { z } from "zod";

export const dynamic = "force-dynamic";

const itemSchema = z.object({
  id: z.string(),
  qty: z.coerce.number().int().min(1).max(50),
  size: z.string().max(40),
  color: z.string().max(50).optional(),
  variantId: z.string().max(100).optional(),
});

const bodySchema = z.object({
  items: z.array(itemSchema).max(50),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid cart payload.", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const [allProducts, storeConfig] = await Promise.all([catalog(true), settings()]);
    const validation = validateCartItems(parsed.data.items, allProducts);

    const delivery = validation.itemCount ? deliveryFor(validation.subtotal, storeConfig) : 0;
    const total = validation.subtotal + delivery;

    return Response.json(
      {
        ...validation,
        deliveryCharge: delivery,
        total,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch {
    return Response.json(
      { error: "Unable to check your bag right now. Please try again." },
      { status: 500 }
    );
  }
}
