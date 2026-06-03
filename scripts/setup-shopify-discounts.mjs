#!/usr/bin/env node
/* Create the Manduraa pack-tier discount codes in Shopify, so the storefront's
   promotional pricing is honoured at the hosted checkout.
   Idempotent: existing codes are skipped.

   Requires an Admin API token with the `write_discounts` (and `read_products`)
   access scope. The PUBLIC Storefront token CANNOT create discounts.

   Usage:
     SHOPIFY_STORE_DOMAIN=gbanea-df.myshopify.com \
     SHOPIFY_ADMIN_TOKEN=shpat_xxx \
     SHOPIFY_PRODUCT_HANDLE=manduraa \
     node scripts/setup-shopify-discounts.mjs

   The codes match src/App.tsx → discountCodesForCart():
     ESMEE-3  / ESMEE-5  / ESMEE-10            one-time pack tiers (−12 / −22 / −31 %)
     ESMEE-1-ABO … ESMEE-10-ABO                subscription tiers (tier × −15 %)
   Each targets only the Manduraa product, with a matching minimum quantity. */

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN
const HANDLE = process.env.SHOPIFY_PRODUCT_HANDLE ?? 'manduraa'
const VERSION = process.env.SHOPIFY_API_VERSION ?? '2025-04'

if (!DOMAIN || !TOKEN) {
  console.error('Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_TOKEN.')
  process.exit(1)
}
if (!TOKEN.startsWith('shpat_') && !TOKEN.startsWith('shpca_')) {
  console.warn('Warning: token does not look like an Admin API token (shpat_…).')
}

const ENDPOINT = `https://${DOMAIN}/admin/api/${VERSION}/graphql.json`

async function admin(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(JSON.stringify(json.errors))
  return json.data
}

// Pack tiers and the subscription factor — keep in sync with PACKS / SUB_DISCOUNT in src/App.tsx.
const TIERS = [
  { count: 3, save: 0.12 },
  { count: 5, save: 0.22 },
  { count: 10, save: 0.31 },
]
const SUB = 0.15
const round4 = (n) => Math.round(n * 10000) / 10000

function plannedCodes() {
  const codes = []
  for (const t of TIERS) {
    codes.push({ code: `ESMEE-${t.count}`, percentage: round4(t.save), minQty: t.count,
      title: `Manduraa ${t.count}er-Pack −${Math.round(t.save * 100)}%` })
  }
  // Subscription tiers: tier discount compounded with −15 %.
  for (const count of [1, 3, 5, 10]) {
    const tier = TIERS.find((t) => t.count === count)
    const base = tier ? tier.save : 0
    const pct = round4(1 - (1 - base) * (1 - SUB))
    codes.push({ code: `ESMEE-${count}-ABO`, percentage: pct, minQty: count,
      title: `Manduraa ${count}er Abo −${(pct * 100).toFixed(2)}%` })
  }
  return codes
}

const PRODUCT_BY_HANDLE = `query($handle:String!){ productByHandle(handle:$handle){ id title } }`
const FIND_CODE = `query($q:String!){ codeDiscountNodes(first:1, query:$q){ edges{ node{ id } } } }`
const CREATE = `
  mutation($b: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $b) {
      codeDiscountNode { id }
      userErrors { field code message }
    }
  }`

async function run() {
  const data = await admin(PRODUCT_BY_HANDLE, { handle: HANDLE })
  const product = data.productByHandle
  if (!product) throw new Error(`Product "${HANDLE}" not found`)
  console.log(`Product: ${product.title} (${product.id})\nStore: ${DOMAIN}\n`)

  const startsAt = new Date().toISOString()
  for (const c of plannedCodes()) {
    const found = await admin(FIND_CODE, { q: `code:${c.code}` })
    if (found.codeDiscountNodes.edges.length > 0) {
      console.log(`= ${c.code.padEnd(14)} exists — skipped`)
      continue
    }
    const input = {
      title: c.title,
      code: c.code,
      startsAt,
      customerSelection: { all: true },
      customerGets: {
        value: { percentage: c.percentage },
        items: { products: { productsToAdd: [product.id] } },
      },
      minimumRequirement: { quantity: { greaterThanOrEqualToQuantity: String(c.minQty) } },
      appliesOncePerCustomer: false,
      combinesWith: { orderDiscounts: true, productDiscounts: true, shippingDiscounts: true },
    }
    const r = await admin(CREATE, { b: input })
    const errs = r.discountCodeBasicCreate.userErrors
    if (errs.length) {
      console.error(`✗ ${c.code.padEnd(14)} ${JSON.stringify(errs)}`)
    } else {
      console.log(`+ ${c.code.padEnd(14)} created (−${(c.percentage * 100).toFixed(2)}%, min ${c.minQty})`)
    }
  }
  console.log('\nDone.')
}

run().catch((e) => { console.error('Failed:', e.message); process.exit(1) })
