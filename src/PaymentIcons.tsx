// @ts-nocheck
/* Payment-method badges — compact 38×24 rounded-card SVGs (Shopify-style). */
import React from "react";

const A = { viewBox: "0 0 38 24", className: "pay-ico" };
const W = "Arial, Helvetica, sans-serif";

export function PaymentIcons() {
  return (
    <span className="pay-icons" aria-label="Akzeptierte Zahlungsarten">
      {/* Visa */}
      <svg {...A} role="img" aria-label="Visa">
        <rect width="38" height="24" rx="4" fill="#fff" stroke="#e7e7e7" />
        <text x="19" y="16.4" textAnchor="middle" fontFamily={W} fontWeight="700" fontStyle="italic" fontSize="10" letterSpacing="0.4" fill="#1A1F71">VISA</text>
      </svg>

      {/* Mastercard */}
      <svg {...A} role="img" aria-label="Mastercard">
        <rect width="38" height="24" rx="4" fill="#fff" stroke="#e7e7e7" />
        <circle cx="16" cy="12" r="6.2" fill="#EB001B" />
        <circle cx="22" cy="12" r="6.2" fill="#F79E1B" />
        <path d="M19 7.3a6.2 6.2 0 0 0 0 9.4 6.2 6.2 0 0 0 0-9.4Z" fill="#FF5F00" />
      </svg>

      {/* American Express */}
      <svg {...A} role="img" aria-label="American Express">
        <rect width="38" height="24" rx="4" fill="#1F72CD" />
        <text x="19" y="15.2" textAnchor="middle" fontFamily={W} fontWeight="700" fontSize="6.6" letterSpacing="0.4" fill="#fff">AMEX</text>
      </svg>

      {/* Apple Pay */}
      <svg {...A} role="img" aria-label="Apple Pay">
        <rect width="38" height="24" rx="4" fill="#fff" stroke="#e7e7e7" />
        <g fill="#000">
          <path d="M11.9 8.6c-.3.4-.8.7-1.3.6-.1-.5.2-1 .4-1.3.3-.4.8-.6 1.2-.7.1.5-.1 1-.3 1.4Zm.3.7c-.7 0-1.3.4-1.6.4-.3 0-.8-.4-1.4-.4-.7 0-1.4.4-1.7 1.1-.7 1.3-.2 3.1.5 4.1.4.5.8 1.1 1.3 1 .5 0 .7-.3 1.3-.3s.8.3 1.3.3.9-.5 1.2-1c.4-.6.6-1.1.6-1.2 0 0-1.1-.4-1.1-1.7 0-1 .8-1.5.9-1.6-.5-.7-1.2-.8-1.5-.8Z" />
          <text x="17.2" y="15.4" fontFamily={W} fontWeight="600" fontSize="8" fill="#000">Pay</text>
        </g>
      </svg>

      {/* Google Pay */}
      <svg {...A} role="img" aria-label="Google Pay">
        <rect width="38" height="24" rx="4" fill="#fff" stroke="#e7e7e7" />
        <text x="9" y="15.6" fontFamily={W} fontWeight="700" fontSize="9" fill="#4285F4">G</text>
        <text x="16" y="15.6" fontFamily={W} fontWeight="500" fontSize="8" fill="#5F6368">Pay</text>
      </svg>

      {/* Klarna */}
      <svg {...A} role="img" aria-label="Klarna">
        <rect width="38" height="24" rx="4" fill="#FFB3C7" />
        <text x="19" y="15.6" textAnchor="middle" fontFamily={W} fontWeight="700" fontSize="7.6" fill="#0B051D">Klarna.</text>
      </svg>

      {/* SEPA */}
      <svg {...A} role="img" aria-label="SEPA-Lastschrift">
        <rect width="38" height="24" rx="4" fill="#fff" stroke="#e7e7e7" />
        <text x="19" y="15.6" textAnchor="middle" fontFamily={W} fontWeight="700" fontSize="7.4" letterSpacing="0.3" fill="#10298E">SEPA</text>
      </svg>
    </span>
  );
}
