# YOUR BRAND marketplace

The requested React components live under `src/components`, product data under
`src/data/products.js`, and application state and dialogs in `src/App.jsx`.
Tailwind CSS 4 runs through the existing PostCSS setup. `src/index.css` imports
Tailwind and adds scoped marketplace styling.

## Run locally

- `npm run dev` serves the integrated homepage and existing backend at localhost:5173.
- `npm run dev:marketplace` serves the standalone React/Vite frontend at localhost:5174.
- `npm run build:marketplace` builds the standalone frontend into `dist-marketplace`.

The standalone entry points to the existing account page on localhost:5173.
Update the `accountUrl` prop in `src/main.jsx` for another authentication destination.
The cart and favorites use separate YOUR BRAND browser storage keys. Browser
storage is optional; the UI keeps working when persistence is unavailable.

## Demo scope

The live homepage loads the existing store catalog through `/api/storefront`,
including real product IDs, prices, available sizes, and stock. Original sample
data and SVG artwork remain in `src/data/products.js` for reference and hero art.
Promotional countdowns remain sample presentation data.

Search, filters, sorting, favorites, quick view, cart quantities, responsive
carousels, sign-in popover, and dialogs work locally. The account link opens the
existing account page. Company policies, messaging, social accounts, app-store
buttons, and feedback are explicitly labeled previews until connected to real
services. Product cards and quick view use Buy Now, which opens a size, quantity,
and price review, then navigates to the original Pakistani `/checkout` page.
The original checkout validates the selection against its catalog, preserves
other bag items, and uses its existing province/city, Pakistani phone, delivery,
and Cash on Delivery flow. The standalone frontend hands off to localhost:5173;
only product selection appears in the URL, not customer details.
Feedback is not transmitted or saved.
