/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** e.g. "your-shop.myshopify.com" */
  readonly VITE_SHOPIFY_STORE_DOMAIN?: string
  /** Storefront API public access token */
  readonly VITE_SHOPIFY_STOREFRONT_TOKEN?: string
  /** Storefront API version, defaults to a recent stable version */
  readonly VITE_SHOPIFY_API_VERSION?: string
  /** Handle of the single Manduraa product, e.g. "manduraa" */
  readonly VITE_SHOPIFY_PRODUCT_HANDLE?: string
  /** Comma-separated handles of upsell/add-on products, e.g. "kupfer-set,manduraa-bundle" */
  readonly VITE_SHOPIFY_ADDON_HANDLES?: string
  /** Optional discount code applied to every checkout */
  readonly VITE_SHOPIFY_DISCOUNT_CODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
