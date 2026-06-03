/* Real Shopify checkout: create a cart from the in-app bag and hand the shopper
   off to Shopify's hosted, PCI-compliant checkout. Only usable once a store is
   connected and the bag carries live `merchandiseId`s (variant GIDs). */

import { isShopifyConfigured, storefront } from './client'
import { CART_CREATE } from './queries'
import type { CartLineInput, StorefrontUserError } from './types'

interface CartCreateResult {
  cartCreate: {
    cart: { id: string; checkoutUrl: string; totalQuantity: number } | null
    userErrors: StorefrontUserError[]
  }
}

/** Optional discount code applied to every checkout (set in env). Lets the
    storefront's promotional pricing be honoured by Shopify when a matching
    discount exists in the store. */
const DISCOUNT_CODE = import.meta.env.VITE_SHOPIFY_DISCOUNT_CODE

/** Create a Shopify cart and return the hosted checkout URL. */
export async function createCheckout(
  lines: CartLineInput[],
  discountCodes: string[] = DISCOUNT_CODE ? [DISCOUNT_CODE] : [],
): Promise<string> {
  if (lines.length === 0) throw new Error('Cannot start checkout with an empty bag')
  const data = await storefront<CartCreateResult>(CART_CREATE, { lines, discountCodes })
  const { cart, userErrors } = data.cartCreate
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((e) => e.message).join('; '))
  }
  if (!cart?.checkoutUrl) throw new Error('Shopify did not return a checkout URL')
  return cart.checkoutUrl
}

export { isShopifyConfigured }
export type { CartLineInput }
