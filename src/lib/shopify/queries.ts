/* GraphQL documents for the single-product storefront. */

/** Fetch the Manduraa product with its variants, options, images and prices. */
export const PRODUCT_QUERY = /* GraphQL */ `
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      description
      handle
      options { name values }
      images(first: 10) {
        edges { node { url altText } }
      }
      variants(first: 50) {
        edges {
          node {
            id
            title
            availableForSale
            image { url altText }
            price { amount currencyCode }
            selectedOptions { name value }
          }
        }
      }
      sellingPlanGroups(first: 5) {
        edges {
          node {
            name
            sellingPlans(first: 10) {
              edges {
                node {
                  id
                  name
                  recurringDeliveries
                  options { name value }
                  priceAdjustments {
                    adjustmentValue {
                      __typename
                      ... on SellingPlanPercentagePriceAdjustment { adjustmentPercentage }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

/** Create a cart from line items (optionally with discount codes) and return
    its hosted checkout URL. */
export const CART_CREATE = /* GraphQL */ `
  mutation CartCreate($lines: [CartLineInput!]!, $discountCodes: [String!]) {
    cartCreate(input: { lines: $lines, discountCodes: $discountCodes }) {
      cart {
        id
        checkoutUrl
        totalQuantity
      }
      userErrors { field message }
    }
  }
`
