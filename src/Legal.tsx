// @ts-nocheck
/* Legal pages — Impressum, Datenschutz, AGB, Widerruf, Versand.
   German content (legally required for a German shop). Routed by pathname
   in main.tsx. Content lives in ./legalContent. */
import React, { useEffect } from "react";
import { PAGES } from "./legalContent";

const COMPANY = {
  name: "Esmee UG (haftungsbeschränkt)",
  street: "Königsallee 63–65",
  city: "40215 Düsseldorf",
  country: "Deutschland",
  phone: "+90 531 567 08 38",
  email: "info@esmee-drinks.de",
  ceo: "Zeynep İnanlı",
};

const NAV = [
  ["/impressum", "Impressum"],
  ["/datenschutz", "Datenschutz"],
  ["/agb", "AGB"],
  ["/widerruf", "Widerruf"],
  ["/versand", "Versand & Zahlung"],
];

export function LegalPage({ slug }) {
  const page = PAGES[slug];
  useEffect(() => {
    window.scrollTo(0, 0);
    if (page) document.title = `${page.title} — Esmee`;
  }, [slug]);
  if (!page) return null;
  return (
    <div className="legal">
      <header className="legal-head">
        <a href="/" className="legal-logo" aria-label="Esmee — Startseite">
          <img src="/assets/logo-esmee.png" alt="Esmee" />
        </a>
        <a href="/" className="legal-back">← Zur Startseite</a>
      </header>

      <main className="legal-body">
        <p className="legal-eyebrow">— Rechtliches</p>
        <h1>{page.title}</h1>
        {page.render(COMPANY)}
      </main>

      <footer className="legal-foot">
        <nav className="legal-foot-nav">
          {NAV.map(([href, label]) => (
            <a key={href} href={href} className={href === "/" + slug ? "active" : ""}>{label}</a>
          ))}
        </nav>
        <span className="legal-foot-c">© 2026 {COMPANY.name} · {COMPANY.city}</span>
      </footer>
    </div>
  );
}
