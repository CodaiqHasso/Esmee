/* Maps a Shopify Storefront product onto the UI's variant shape.

   The <Shop> component renders an array of variants of shape
   { id, name, sub, swatch, image, note }. This module turns a live Shopify
   product into exactly that shape (plus `merchandiseId` / `price` for checkout),
   so connecting a real store is a drop-in replacement for the bundled VARIANTS
   constant — no UI changes required. */

import { isShopifyConfigured, storefront } from './client'
import { PRODUCT_QUERY } from './queries'
import type {
  CatalogAddon,
  CatalogVariant,
  SellingPlan,
  StorefrontProduct,
  StorefrontSellingPlan,
} from './types'

/** Swatch gradients reused for live variants (Shopify has no swatch concept). */
const SWATCHES = [
  'linear-gradient(135deg,#C4A893,#9B7B61)',
  'linear-gradient(135deg,#E6C6B7,#B4837A)',
  'linear-gradient(135deg,#E2D2C2,#B59D87)',
  'linear-gradient(135deg,#D8C3AC,#A98C6F)',
]

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Convert a Storefront product into UI-ready catalog variants. */
export function mapProduct(product: StorefrontProduct): CatalogVariant[] {
  const fallbackImage = product.images.edges[0]?.node.url ?? ''
  return product.variants.edges.map((edge, i) => {
    const v = edge.node
    return {
      id: slugify(v.title) || `variant-${i + 1}`,
      name: v.title,
      sub: v.selectedOptions.map((o) => o.value).join(' · '),
      swatch: SWATCHES[i % SWATCHES.length],
      image: v.image?.url ?? fallbackImage,
      note: product.description,
      merchandiseId: v.id,
      price: Number(v.price.amount),
    }
  })
}

/** Fetch live catalog variants, or `null` when no store is configured (the
    caller then falls back to the bundled demo VARIANTS). */
export async function fetchVariants(
  handle: string = import.meta.env.VITE_SHOPIFY_PRODUCT_HANDLE ?? 'manduraa',
): Promise<CatalogVariant[] | null> {
  if (!isShopifyConfigured()) return null
  const data = await storefront<{ product: StorefrontProduct | null }>(PRODUCT_QUERY, {
    handle,
  })
  return data.product ? mapProduct(data.product) : null
}

function firstSentence(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.length <= 80 ? t : `${t.slice(0, 77).trimEnd()}…`
}

/** Best-effort parse of a selling plan's delivery cadence into days.
    Handles "2 Monate" / "30 days" (number + unit) and "Jeden Monat" /
    "monthly" (unit without a number → every 1 unit), DE + EN. */
function parseIntervalDays(plan: StorefrontSellingPlan): number | null {
  const sources = [...plan.options.map((o) => o.value), plan.name]
  for (const raw of sources) {
    const s = String(raw || '').toLowerCase()
    const m = s.match(/(\d+)\s*(day|tag|week|woche|month|monat)/)
    if (m) {
      const n = parseInt(m[1], 10)
      if (/week|woche/.test(m[2])) return n * 7
      if (/month|monat/.test(m[2])) return n * 30
      return n
    }
    if (/monat|month/.test(s)) return 30
    if (/woche|week/.test(s)) return 7
    if (/tag|day/.test(s)) return 1
  }
  return null
}

/** Fetch the product's subscription selling plans, or `null` when none / no store. */
export async function fetchSellingPlans(
  handle: string = import.meta.env.VITE_SHOPIFY_PRODUCT_HANDLE ?? 'manduraa',
): Promise<SellingPlan[] | null> {
  if (!isShopifyConfigured()) return null
  const data = await storefront<{ product: StorefrontProduct | null }>(PRODUCT_QUERY, { handle })
  const groups = data.product?.sellingPlanGroups?.edges ?? []
  const plans: SellingPlan[] = []
  for (const g of groups) {
    for (const e of g.node.sellingPlans.edges) {
      const adj = e.node.priceAdjustments[0]?.adjustmentValue
      const percentage = adj && typeof adj.adjustmentPercentage === 'number' ? adj.adjustmentPercentage : 0
      plans.push({
        id: e.node.id,
        name: e.node.name,
        intervalDays: parseIntervalDays(e.node),
        percentage,
      })
    }
  }
  return plans.length > 0 ? plans : null
}

/** Fetch upsell/add-on products (copper set, bundle, …) as checkout-ready
    add-ons, or `null` when no store is configured. Each add-on carries the
    real `merchandiseId` so it can be checked out alongside the main product. */
export async function fetchAddons(
  handles: string[] = (import.meta.env.VITE_SHOPIFY_ADDON_HANDLES ?? 'kupfer-set,manduraa-bundle')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean),
): Promise<CatalogAddon[] | null> {
  if (!isShopifyConfigured()) return null
  const products = await Promise.all(
    handles.map((handle) =>
      storefront<{ product: StorefrontProduct | null }>(PRODUCT_QUERY, { handle })
        .then((d) => d.product)
        .catch(() => null),
    ),
  )
  const addons: CatalogAddon[] = []
  for (const product of products) {
    const variant = product?.variants.edges[0]?.node
    if (!product || !variant) continue
    addons.push({
      id: product.handle,
      name: product.title,
      sub: firstSentence(product.description),
      price: Number(variant.price.amount),
      merchandiseId: variant.id,
    })
  }
  return addons
}
