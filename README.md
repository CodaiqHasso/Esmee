# Esmee — Manduraa storefront

A modern, luxe **one-product** ecommerce landing page for *Manduraa* (Edition № 01),
built with **React 19 + TypeScript + Vite**. The page is a pixel-faithful build of the
Esmee design handoff (a Claude Design HTML/JS prototype), structured to stay
Shopify / Hydrogen migration-ready.

## Run

```bash
npm install
npm run dev      # local dev server (Vite) → http://localhost:5173
npm run build    # type-check (tsc -b) + production build → dist/
npm run preview  # serve the production build locally
npm run lint     # eslint
```

## Structure

```
index.html        # document shell — fonts, SEO/OG meta, #root mount
public/assets/    # all imagery (scene-*.jpg, pack-*, logo-esmee.png, …) served at /assets/*
src/
  main.tsx        # entry — mounts <App/> (StrictMode intentionally omitted, see note)
  App.tsx         # the entire landing page (faithful port of the prototype)
  index.css       # the full design system + every section's styles
```

## The landing page

The experience (top → bottom): a one-shot **preloader**, a cinematic 6-scene
**scroll story** with canvas steam, an early **reviews ribbon**, the atelier
**story**, a draggable **ingredient orbit**, a **vs.** comparison, a **sugar
tracker**, **benefits**, the sticky **shop** (variants · bulk packs ·
subscription · gift · express-pay), **unboxing**, **spec sheet**, a pinned
**ritual**, **taste radar**, **reviews v2**, **trust band**, **FAQ**, the
first-cup **guarantee**, a **final CTA**, and the **footer** — plus a cart
drawer (add-ons + free-shipping progress), sticky mini buy-bar, and
email-gate / exit-intent / recovery toasts.

## Implementation notes

- **`src/App.tsx` carries `// @ts-nocheck`.** It is a 1:1 port of imperative,
  DOM-driven prototype code (scroll observers, rAF loops, a canvas steam
  simulation, direct DOM mutations). Runtime behaviour is the source of truth;
  `npm run build` runs `tsc -b` and passes because of this directive. Behaviour
  is exercised by the running app, not the type checker.
- **`StrictMode` is omitted in `main.tsx`** — its dev double-invoke would re-run
  the one-shot preloader and re-attach scroll observers on mount, causing a
  visible first-paint flicker.
- **Assets** live in `public/assets/` and are referenced as `/assets/…`.
- **Fonts** (Cormorant Garamond, Jost, Bricolage Grotesque) load via `<link>`
  in `index.html`.

## Connect a Shopify store

A typed Storefront API layer lives in `src/lib/shopify/` and is already wired in.
With **no credentials set, the storefront runs on its bundled demo catalog** and
the checkout button explains demo mode — so the repo always works offline.

To go live, copy `.env.example` → `.env.local` and fill in:

```ini
VITE_SHOPIFY_STORE_DOMAIN=your-shop.myshopify.com
VITE_SHOPIFY_STOREFRONT_TOKEN=<public Storefront API token>
VITE_SHOPIFY_API_VERSION=2025-04                      # optional
VITE_SHOPIFY_PRODUCT_HANDLE=manduraa                  # main product handle
VITE_SHOPIFY_ADDON_HANDLES=kupfer-set,manduraa-bundle # optional upsells
VITE_SHOPIFY_DISCOUNT_CODE=                           # optional, see pricing note
```

> Use only the **public** Storefront token client-side — it ships in the bundle
> by design. Never put an Admin (`shpat_…`) token or session secret in `VITE_*`.

**Display vs. checkout — by design.** The visible storefront (editions, pack
prices, add-ons, copy) is intentionally kept **1:1 with the Claude Design** — it
renders the bundled demo catalog, not whatever a connected store happens to
contain. The Shopify connection is wired into **checkout only**:

- **Catalog (display)** — `<Shop>` always shows the demo design (three editions,
  pack tiers, demo add-ons). Pixel-stable regardless of the store's real product
  count.
- **Checkout (real)** — on mount the app fetches the real product's variant id
  and attaches it to every Manduraa cart line (`merchandiseId`). *Zum Checkout*
  runs a `cartCreate` mutation for the real product (quantity = pack count × qty)
  and redirects to Shopify's hosted, PCI-compliant checkout. `discountCodesForCart`
  auto-applies the matching tier code.

> The Shopify mappers (`fetchVariants` / `fetchAddons` / `mapProduct`) remain in
> `src/lib/shopify/` and can drive the *display* from live data too — but the
> storefront deliberately keeps the design catalog so the page matches the mockup
> exactly. Flip `<Shop>`/`<CartDrawer>` to the live props to show real data.

Pricing note: the demo pack prices (€32/€28/…) are shown; Shopify charges the
real variant price at checkout. Reconcile via the discount codes below (or drive
the display from live prices). See the original prototype for the design intent.

### Make the promotional discounts real at checkout

The storefront already **auto-applies the right discount code per pack tier** at
checkout (`discountCodesForCart()` → `ESMEE-3/5/10`, `ESMEE-1/3/5/10-ABO`).
Unknown codes are safely ignored by Shopify, so until the codes exist the cart
just checks out at full price.

To create those codes (one command, idempotent):

```bash
SHOPIFY_STORE_DOMAIN=your-shop.myshopify.com \
SHOPIFY_ADMIN_TOKEN=shpat_xxx \
SHOPIFY_PRODUCT_HANDLE=manduraa \
node scripts/setup-shopify-discounts.mjs
```

The script creates one percentage discount per tier (each targeting only the
Manduraa product, with a matching minimum quantity), so the **checkout total
then equals the displayed total exactly**.

> **Required scope.** Discount creation needs an **Admin API** token with
> `write_discounts` + `read_products`. A public/private *Storefront* token
> cannot create discounts. Recurring **subscription** billing additionally needs
> a Shopify subscriptions app + selling plans; the `-ABO` codes apply the −15 %
> price, but true recurring billing is out of scope for the Storefront API alone.

### Layer (`src/lib/shopify/`)

| File          | Responsibility                                                        |
|---------------|-----------------------------------------------------------------------|
| `client.ts`   | `storefront<T>()` GraphQL fetch + `isShopifyConfigured()`             |
| `queries.ts`  | `PRODUCT_QUERY`, `CART_CREATE` (with discount codes)                  |
| `catalog.ts`  | `mapProduct()` + `fetchVariants()` + `fetchAddons()` (Shopify → UI)   |
| `checkout.ts` | `createCheckout()` → hosted checkout URL                              |
| `types.ts`    | Hand-written Storefront + UI catalog types                            |

These modules are fully typed (no `@ts-nocheck`) and dependency-free, so they
port directly into a **Hydrogen** app. The `PACKS` (bulk pricing tiers) remain
app-defined (your store has one variant, no quantity breaks) — model them as
Shopify variants, a bundle app, or quantity breaks during a full Hydrogen
migration. Sections use stable ids (`#shop`, `#universe`, `#reviews`, `#faq`, …)
suitable for route anchors.
