/* Minimal Shopify Storefront API types — only the fields this storefront reads.
   Kept hand-written (no codegen) so the layer stays dependency-free and easy to
   port into a Hydrogen app later. */

export interface Money {
  amount: string
  currencyCode: string
}

export interface ShopifyImage {
  url: string
  altText: string | null
}

export interface SelectedOption {
  name: string
  value: string
}

export interface StorefrontVariant {
  id: string
  title: string
  availableForSale: boolean
  image: ShopifyImage | null
  price: Money
  selectedOptions: SelectedOption[]
}

export interface StorefrontSellingPlan {
  id: string
  name: string
  recurringDeliveries: boolean
  options: { name: string; value: string }[]
  priceAdjustments: { adjustmentValue: { adjustmentPercentage?: number } }[]
}

export interface StorefrontProduct {
  id: string
  title: string
  description: string
  handle: string
  options: { name: string; values: string[] }[]
  images: { edges: { node: ShopifyImage }[] }
  variants: { edges: { node: StorefrontVariant }[] }
  sellingPlanGroups?: {
    edges: { node: { name: string; sellingPlans: { edges: { node: StorefrontSellingPlan }[] } } }[]
  }
}

/** UI-facing subscription plan (one delivery cadence with its discount). */
export interface SellingPlan {
  id: string
  name: string
  /** Delivery interval in days (30, 60, …) or null if unparseable */
  intervalDays: number | null
  /** Subscription discount, 0–100 */
  percentage: number
}

/** UI-facing variant shape consumed by the <Shop> component.
    Mirrors the bundled VARIANTS constant, plus a Shopify reference. */
export interface CatalogVariant {
  id: string
  name: string
  sub: string
  swatch: string
  image: string
  note: string
  /** Storefront variant GID (gid://shopify/ProductVariant/…), present only on live data */
  merchandiseId?: string
  /** Per-unit price from Shopify, when available */
  price?: number
}

/** UI-facing add-on / upsell shape (e.g. the copper set, the bundle). */
export interface CatalogAddon {
  id: string
  name: string
  sub: string
  price: number
  merchandiseId: string
}

export interface CartLineInput {
  merchandiseId: string
  quantity: number
  /** Present for subscription lines — ties the line to a Shopify selling plan */
  sellingPlanId?: string
}

export interface StorefrontUserError {
  field: string[] | null
  message: string
}
