/* Tiny, dependency-free Shopify Storefront GraphQL client.
   Reads credentials from Vite env vars (see .env.example). When the store is
   not configured the storefront runs entirely on bundled demo data, so this
   client is only ever called once a real store is connected. */

const DOMAIN = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN
const TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN
const VERSION = import.meta.env.VITE_SHOPIFY_API_VERSION ?? '2025-04'

/** True when both a store domain and a Storefront token are present. */
export function isShopifyConfigured(): boolean {
  return Boolean(DOMAIN && TOKEN)
}

interface GraphQLResponse<T> {
  data?: T
  errors?: { message: string }[]
}

/** Execute a Storefront GraphQL operation and return its `data`. Throws on
    network, HTTP, or GraphQL errors with a readable message. */
export async function storefront<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  if (!DOMAIN || !TOKEN) {
    throw new Error(
      'Shopify Storefront is not configured — set VITE_SHOPIFY_STORE_DOMAIN and VITE_SHOPIFY_STOREFRONT_TOKEN.',
    )
  }

  const res = await fetch(`https://${DOMAIN}/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Shopify-Storefront-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    throw new Error(`Storefront API responded ${res.status} ${res.statusText}`)
  }

  const json = (await res.json()) as GraphQLResponse<T>
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors.map((e) => e.message).join('; '))
  }
  if (!json.data) {
    throw new Error('Storefront API returned no data')
  }
  return json.data
}
