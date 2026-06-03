import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// NOTE: StrictMode is intentionally omitted. This landing page is a faithful port
// of an imperative, DOM-driven prototype (scroll observers, a one-shot preloader,
// rAF loops). StrictMode's dev double-invoke would re-run the preloader and
// re-attach observers on mount, causing a visible first-paint flicker.
createRoot(document.getElementById('root')!).render(<App />)
