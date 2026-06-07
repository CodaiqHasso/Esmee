/* Vercel serverless function — adds a popup signup to the Shopify customer list
   with explicit email-marketing consent (GDPR / DSGVO, single opt-in).

   Secrets stay server-side. Set these env vars in the Vercel project:
     SHOPIFY_ADMIN_DOMAIN       e.g. esmee-5875.myshopify.com  (falls back to
                                VITE_SHOPIFY_STORE_DOMAIN if unset)
     SHOPIFY_ADMIN_TOKEN        Admin API access token (shpat_…) with
                                write_customers scope — NEVER ship to the client
     SHOPIFY_ADMIN_API_VERSION  optional, default 2025-04

   The discount code itself is configured + emailed inside Shopify (Discounts +
   a Marketing/Flow automation that fires on new subscriber). This endpoint only
   captures the consented email. */

const DOMAIN =
  process.env.SHOPIFY_ADMIN_DOMAIN || process.env.VITE_SHOPIFY_STORE_DOMAIN
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN
const VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || '2025-04'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function admin(query, variables) {
  const res = await fetch(`https://${DOMAIN}/admin/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Shopify Admin ${res.status}: ${JSON.stringify(json).slice(0, 400)}`)
  }
  if (json.errors) {
    throw new Error(`Shopify Admin GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  }
  return json.data
}

const CREATE = `
  mutation customerCreate($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer { id }
      userErrors { field message }
    }
  }`

const FIND = `
  query findCustomer($q: String!) {
    customers(first: 1, query: $q) { edges { node { id } } }
  }`

// Flat input keeps the consent enums inline so there are no nested variables.
const CONSENT_FLAT = `
  mutation consent($id: ID!) {
    customerEmailMarketingConsentUpdate(input: {
      customerId: $id,
      emailMarketingConsent: { marketingState: SUBSCRIBED, marketingOptInLevel: SINGLE_OPT_IN }
    }) {
      userErrors { field message }
    }
  }`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  // Body may arrive parsed or as a raw string depending on runtime.
  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  const email = String(body?.email || '').trim().toLowerCase()
  const consent = body?.consent === true

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'invalid_email' })
  }
  if (!consent) {
    return res.status(400).json({ ok: false, error: 'consent_required' })
  }
  if (!DOMAIN || !TOKEN) {
    return res.status(500).json({ ok: false, error: 'not_configured' })
  }

  try {
    const created = await admin(CREATE, {
      input: {
        email,
        emailMarketingConsent: {
          marketingState: 'SUBSCRIBED',
          marketingOptInLevel: 'SINGLE_OPT_IN',
        },
        tags: ['firstcup-popup'],
      },
    })

    const errs = created?.customerCreate?.userErrors || []
    const taken = errs.some(
      (e) => /taken|already/i.test(e.message) || (e.field || []).includes('email'),
    )

    if (created?.customerCreate?.customer?.id) {
      return res.status(200).json({ ok: true, status: 'created' })
    }

    // Already a customer → make sure consent is set on the existing record.
    if (taken) {
      const found = await admin(FIND, { q: `email:${email}` })
      const id = found?.customers?.edges?.[0]?.node?.id
      if (id) {
        await admin(CONSENT_FLAT, { id })
        return res.status(200).json({ ok: true, status: 'updated' })
      }
      // Customer exists but not retrievable — still a success for the visitor.
      return res.status(200).json({ ok: true, status: 'exists' })
    }

    // Any other user error.
    return res.status(502).json({ ok: false, error: 'shopify', detail: errs })
  } catch (err) {
    return res.status(502).json({ ok: false, error: 'shopify_request', detail: String(err.message || err) })
  }
}
