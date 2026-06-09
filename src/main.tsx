import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LanguageProvider } from './i18n.tsx'
import { LegalPage } from './Legal.tsx'

// Tiny path-based router for the standalone legal pages. Direct visits work
// because vercel.json rewrites unknown paths to index.html.
const LEGAL = ['impressum', 'datenschutz', 'agb', 'widerruf', 'versand']
const slug = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase()
const isLegal = LEGAL.includes(slug)

// Per-page SEO for the standalone legal pages: distinct titles + a canonical
// link, and a data-legal flag so the language effect leaves their title alone.
if (isLegal) {
  const LEGAL_TITLE: Record<string, string> = {
    impressum: 'Impressum – Esmee Manduraa',
    datenschutz: 'Datenschutzerklärung – Esmee Manduraa',
    agb: 'AGB – Esmee Manduraa',
    widerruf: 'Widerrufsbelehrung – Esmee Manduraa',
    versand: 'Versand & Lieferung – Esmee Manduraa',
  }
  document.documentElement.setAttribute('data-legal', slug)
  document.title = LEGAL_TITLE[slug] || 'Esmee Manduraa'
  const canonical = document.querySelector('link[rel="canonical"]')
  if (canonical) canonical.setAttribute('href', `https://www.esmee-drinks.de/${slug}`)
}

// NOTE: StrictMode is intentionally omitted. This landing page is a faithful port
// of an imperative, DOM-driven prototype (scroll observers, a one-shot preloader,
// rAF loops). StrictMode's dev double-invoke would re-run the preloader and
// re-attach observers on mount, causing a visible first-paint flicker.
createRoot(document.getElementById('root')!).render(
  <LanguageProvider>
    {isLegal ? <LegalPage slug={slug} /> : <App />}
  </LanguageProvider>,
)
