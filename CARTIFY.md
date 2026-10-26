# Cartify Homepage

The existing React / Next.js app runs through Vite with vinext. The homepage uses locally scoped CSS alongside the project's Tailwind setup, and lucide-react icons.

## Run Locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173). If that port is occupied, Vite selects the next available port.

```sh
npm run build
```

## Source Files

| File | Purpose |
| --- | --- |
| `app/page.tsx` | Homepage route |
| `app/cartify-home.tsx` | Composes the page and connects filters and cart |
| `data/cartify-products.json` | Local mock catalog with all product fields |
| `lib/cartify-products.ts` | Product types, categories, currency configuration and deal data |
| `components/cartify/Header.tsx` | Responsive navigation, debounced search and keyboard suggestions |
| `components/cartify/TrustBar.tsx` | Trust and security strips |
| `components/cartify/DealsRow.tsx` | Two six-card sale rows with countdowns |
| `components/cartify/CategoryTabs.tsx` | Scrollable category filters |
| `components/cartify/ProductCard.tsx` | Product prices, ratings, badges and cart action |
| `components/cartify/ProductImage.tsx` | Native lazy loading, skeleton and failure fallback |
| `components/cartify/ProductGrid.tsx` | Category/search filtering, sorting and pagination |
| `components/cartify/CartDrawer.tsx` | Accessible native dialog with quantity controls |
| `components/cartify/useCart.ts` | LocalStorage persistence and cross-tab cart synchronization |
| `components/cartify/Footer.tsx` | Footer content |
| `components/cartify/format.ts` | Currency formatting |
| `components/cartify/cartify.css` | Mobile-first homepage styles |

Edit the JSON catalog to replace mock inventory and image paths. Local placeholder images live in `public/images/`. Change `currencyConfig` to configure the price prefix and locale. Cart data uses the `cartify-cart` browser storage key.

The mock homepage does not submit purchases. Account navigation opens the existing account route; informational and social footer links remain placeholders until store destinations are configured.
