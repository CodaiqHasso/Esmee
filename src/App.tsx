// @ts-nocheck
/* Esmee — Manduraa luxury storefront landing page.
   Faithfully ported from the Claude Design HTML/JS prototype to React + TS + Vite.
   Type-checking is disabled on this file because it is a 1:1 port of an
   imperative, DOM-driven prototype; runtime behaviour is the source of truth. */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { isShopifyConfigured, createCheckout, fetchVariants, fetchAddons, fetchSellingPlans } from "./lib/shopify";

// Map the cart's chosen pack tier (+ subscription) to its Shopify discount code.
// Codes (ESMEE-3/5/10 one-time, ESMEE-1/3/5/10-ABO subscription) are created by
// scripts/setup-shopify-discounts.mjs. Unknown codes are safely ignored by Shopify.
function discountCodesForCart(cart) {
  // Subscriptions get their discount from the Shopify selling plan, not a code.
  const main = (cart || [])
    .filter(it => it.merchandiseId && it.kind !== "addon" && !it.subActive)
    .slice()
    .sort((a, b) => (b.packCount || 1) - (a.packCount || 1))[0];
  if (!main) return [];
  const cnt = main.packCount || 1;
  if (cnt === 1) return []; // single pouch, one-time → no discount
  return [`ESMEE-${cnt}`];
}


/* ============================================================
   ESMEE — MANDURAA · modern luxury one-product shop
   ============================================================ */

/* ---------- DATA ---------- */
const VARIANTS = [
  {
    id: "original",
    name: "Original",
    sub: "with single-origin coffee",
    swatch: "linear-gradient(135deg,#C4A893,#9B7B61)",
    image: "/assets/scene-6.jpg",
    note: "A composed cup — roasted almonds, Medjool dates, pistachio and a quiet pour of arabica.",
  },
  {
    id: "rose",
    name: "Rose Cardamom",
    sub: "with rose & green cardamom",
    swatch: "linear-gradient(135deg,#E6C6B7,#B4837A)",
    image: "/assets/pack-mauve.jpeg",
    note: "Slow-bloomed rose petals laid over warm cardamom. A perfumed, contemplative cup.",
  },
  {
    id: "decaf",
    name: "Caffeine-free",
    sub: "decaffeinated arabica",
    swatch: "linear-gradient(135deg,#E2D2C2,#B59D87)",
    image: "/assets/scene-5.jpg",
    note: "All of the ritual, none of the lift. A nightcap of dates, almond and cocoa whisper.",
  },
];

// Bulk packs — single purchase only (no subscriptions)
const PACKS = [
  { id: "1",  count: 1,  unit: 32, save: 0,  label: "1 Packung",     sub: "250 g · ≈ 16 cups",          badge: null },
  { id: "3",  count: 3,  unit: 28, save: 12, label: "3 Packungen",   sub: "750 g · ≈ 48 cups",          badge: "Most Loved",        badgeStyle: "copper", mostLoved: true },
  { id: "5",  count: 5,  unit: 25, save: 22, label: "5 Packungen",   sub: "1.25 kg · ≈ 80 cups",        badge: "Bester Wert",       badgeStyle: "dark" },
  { id: "10", count: 10, unit: 22, save: 31, label: "10+ Packungen", sub: "2.5 kg · ≈ 160 cups",        badge: "Maximale Ersparnis", badgeStyle: "copper" },
];

const INGREDIENTS = [
  { name: "Medjool Date", note: "Natural sweetness", color: "#7A4A2B", angle: 18, r: 46,
    origin: "Jordan Valley · Jordan", season: "Autumn '25", grams: "62 g / 250 g pouch", img: "/assets/scene-6.jpg",
    lede: "The only sweetness in the cup.",
    body: "Sun-cured on a single farm in the Jordan Valley by the Al-Saadi family. We use the soft-grade Medjool — pressed by hand into a paste that dissolves into the blend without a trace of graininess."
  },
  { name: "Marcona Almond", note: "Butter, body", color: "#D9B988", angle: 80, r: 48,
    origin: "Alicante · Spain", season: "Summer '25", grams: "48 g / 250 g pouch", img: "/assets/scene-5.jpg",
    lede: "The Spanish butter-almond.",
    body: "Cold-stone milled until the oil releases. Marcona gives the cup its mouthfeel — the round, milky body that lets you skip the dairy entirely."
  },
  { name: "Antep Pistachio", note: "Depth, salinity", color: "#7A8C4F", angle: 142, r: 45,
    origin: "Gaziantep · Türkiye", season: "Late summer '25", grams: "26 g / 250 g pouch", img: "/assets/scene-3.jpg",
    lede: "A low green hum.",
    body: "From the Antep groves outside Gaziantep. Hand-shelled, cold-roasted, milled just enough to keep their salinity intact. The salt-edge that makes the dates taste like dessert."
  },
  { name: "Single-origin Arabica", note: "Quiet lift", color: "#3E2719", angle: 210, r: 47,
    origin: "Haraz · Yemen", season: "Spring '25", grams: "32 g / 250 g pouch", img: "/assets/scene-1.jpg",
    lede: "A measured pour.",
    body: "From the Haraz mountain farms, washed and slow-dried at altitude. We pull less than 15% of the blend in coffee — enough lift to notice, not enough to crash."
  },
  { name: "Green Cardamom", note: "Aromatic warmth", color: "#A48A53", angle: 272, r: 44,
    origin: "Kerala · India", season: "Year-round", grams: "4 g / 250 g pouch", img: "/assets/scene-2.jpg",
    lede: "The perfumed line.",
    body: "Whole pods crushed the morning of blending. Just four grams per pouch — present enough to lift the date, quiet enough never to overwhelm."
  },
  { name: "Cocoa Nib", note: "Bitter contrast", color: "#4E3322", angle: 330, r: 46,
    origin: "Tabasco · Mexico", season: "Winter '25", grams: "18 g / 250 g pouch", img: "/assets/scene-4.jpg",
    lede: "The bitter punctuation.",
    body: "Cocoa nibs from a single co-op in Tabasco, lightly toasted to draw out the chocolate without sweetness. The bitter line that holds the cup together."
  },
];

const BENEFITS = [
  { t: "Zero refined sugar",   d: "Sweetened only by Medjool dates — no glucose spikes, no crash.", g: "leaf" },
  { t: "Slow energy",          d: "A measured pour of single-origin arabica balanced by almond fat. Lift, never jitter.", g: "spark" },
  { t: "Nutrient density",     d: "Pistachio, almond and date deliver magnesium, potassium and fibre per cup.", g: "drop" },
  { t: "Gut-friendly",         d: "Dairy-free, vegan, low-acid. Easier on the stomach than espresso.", g: "circle" },
  { t: "Composed in Dubai",    d: "Hand-blended in our atelier. Single farm, single season, single batch.", g: "marker" },
  { t: "Ready in 90 seconds",  d: "One scoop, hot water or milk. No grinder. No fuss.", g: "clock" },
];

const RITUAL = [
  { n: "I",  t: "Measure",  c: "One heaped spoon of Manduraa for every small cup. We use 7 grams.", img: "/assets/scene-6.jpg" },
  { n: "II", t: "Pour",     c: "Steam — never boil — your milk or water to 78°. Pour over slowly.", img: "/assets/scene-3.jpg" },
  { n: "III",t: "Rest",     c: "Wait a breath. Let the dates settle. The first sip should feel found.", img: "/assets/scene-4.jpg" },
];

const TASTE = [
  { name: "Sweetness", val: 7 },
  { name: "Body",      val: 8 },
  { name: "Roast",     val: 5 },
  { name: "Acidity",   val: 2 },
  { name: "Aromatic",  val: 6 },
  { name: "Caffeine",  val: 4 },
];

const FAQS = [
  { q: "What's actually in Manduraa?", a: "Six ingredients, nothing else: Medjool dates, Marcona almonds, Antep pistachios, single-origin arabica coffee, green cardamom and cocoa nibs. No refined sugar, no syrups, no flavourings, no preservatives. Vegan and gluten-free." },
  { q: "How do I prepare it?", a: "One heaped spoon (7 g) per small cup. Add 150 ml of hot — not boiling — water or steamed milk and stir for ten seconds. Let it rest for thirty seconds before drinking. That's the entire ritual." },
  { q: "Does it contain caffeine?", a: "Original contains about half the caffeine of a regular espresso — gentle, sustained. We also offer a caffeine-free edition using naturally decaffeinated arabica." },
  { q: "How long does a pouch last?", a: "A 250 g pouch makes roughly 16 cups. Stored sealed in a cool, dark place, it stays at peak for six months from the date stamped on the back." },
  { q: "Where do you ship?", a: "Across the GCC, the EU and the UK. Complimentary delivery on orders over €60. Orders ship within 48 hours from our atelier in Dubai." },
  { q: "Can I return it?", a: "Yes. If you don't love your first cup, send the pouch back within 30 days and we'll refund you in full. No questions, no friction." },
];

/* ---------- HOOKS ---------- */
function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { setY(window.scrollY); raf = 0; });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);
  return y;
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -50px 0px" });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function useParallax() {
  useEffect(() => {
    const els = document.querySelectorAll(".frame.parallax");
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      els.forEach(frame => {
        const r = frame.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const t = (center - vh / 2) / vh; // -1..1ish
        const img = frame.querySelector("img");
        if (img) img.style.transform = `translateY(${(-t * 22).toFixed(1)}px) scale(1.06)`;
      });
    };
    const onScroll = () => { if (raf) return; raf = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, []);
}

const clamp01 = (n) => Math.max(0, Math.min(1, n));

/* ============================================================
   PHASE A — wow helpers
   ============================================================ */

/* SplitText — wraps text into words for stagger reveal */
function SplitText({ text, className = "", as: Tag = "span", trigger = "in-view", delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (trigger === "always") {
      const t = setTimeout(() => el.classList.add("in"), delay * 1000);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setTimeout(() => el.classList.add("in"), delay * 1000);
        io.disconnect();
      }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [trigger, delay]);
  const words = String(text).split(" ");
  return (
    <Tag ref={ref} className={"split " + className}>
      {words.map((w, i) => (
        <span className="word" key={i}>
          <span className="inner">{w}{i < words.length - 1 ? "\u00A0" : ""}</span>
        </span>
      ))}
    </Tag>
  );
}

/* useCounter — animate number from 0 to target when in view */
function Counter({ to, duration = 1400, prefix = "", suffix = "", decimals = 0, className = "" }) {
  const ref = useRef(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let raf = 0, start = 0;
    const step = (ts) => {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(to * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { raf = requestAnimationFrame(step); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, duration]);
  return (
    <span ref={ref} className={"counter " + className}>
      {prefix}{decimals > 0 ? v.toFixed(decimals) : Math.round(v)}{suffix}
    </span>
  );
}

/* Smooth scroll — lerp-based, non-invasive (don't fight CSS scroll-snap or sticky) */
function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let target = window.scrollY;
    let current = target;
    let raf = 0;
    const ease = 0.12;
    const onWheel = (e) => {
      // Allow trackpad pinch / horizontal — only intercept vertical wheel
      if (e.ctrlKey) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      // Modal/drawer scrolls (cart) — let native handle
      let n = e.target;
      while (n && n !== document.body) {
        if (n.classList && (n.classList.contains("items") || n.classList.contains("cart-drawer"))) return;
        n = n.parentNode;
      }
      e.preventDefault();
      target = Math.max(0, Math.min(document.documentElement.scrollHeight - window.innerHeight, target + e.deltaY));
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      current += (target - current) * ease;
      if (Math.abs(target - current) < 0.5) { current = target; raf = 0; }
      window.scrollTo(0, current);
      if (raf) raf = requestAnimationFrame(tick);
    };
    // Also sync target if user uses keyboard/scroll bar
    const onScroll = () => {
      if (!raf) { target = window.scrollY; current = target; }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
}

/* Blur-load <img> wrapper */
function BlurImg({ src, alt = "", className = "", ...rest }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      onLoad={() => setLoaded(true)}
      className={"blur-load " + (loaded ? "loaded " : "") + className}
      {...rest}
    />
  );
}

/* HoverWord — inline word with rich tooltip */
function HoverWord({ word, label, text, img }) {
  return (
    <span className="hw">
      {word}
      <span className="hw-pop">
        {img && <span className="hw-img" style={{ backgroundImage: `url(${img})` }} />}
        <span className="hw-label">{label}</span>
        <span className="hw-text">{text}</span>
      </span>
    </span>
  );
}

/* Confetti burst (vanilla) */
function burstConfetti(x, y, opts = {}) {
  const colors = opts.colors || ["#B07A52", "#C99577", "#E2CFB5", "#2B1F17", "#F1DDD5"];
  const count = opts.count || 36;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "confetti";
    el.style.left = (x - 4) + "px";
    el.style.top = (y - 6) + "px";
    el.style.background = colors[i % colors.length];
    el.style.borderRadius = (i % 3 === 0) ? "999px" : "2px";
    document.body.appendChild(el);
    const angle = (Math.PI * (Math.random() * 1.0 - 0.5)) - Math.PI / 2; // mostly up
    const speed = 280 + Math.random() * 260;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const rot = Math.random() * 720 - 360;
    const dur = 900 + Math.random() * 700;
    el.animate(
      [
        { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${vx * 0.4}px, ${vy * 0.45}px) rotate(${rot * 0.5}deg)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${vx}px, ${vy * 0.4 + 380}px) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration: dur, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" }
    );
    setTimeout(() => el.remove(), dur + 50);
  }
}
/* ============================================================
   PHASE C — cinematic
   ============================================================ */

/* Preloader — shows scene-counter while preloading hero images */
function Preloader({ onDone }) {
  const [step, setStep] = useState(1);
  const total = SCENES.length;
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    // CRO: returning-visitor fast-path & hard time cap.
    // - First visit: MIN_MS 800, MAX_MS 2200 (hard cap, image preload no longer blocks).
    // - Returning visit: skip preloader almost entirely.
    let returning = false;
    try { returning = !!window.localStorage.getItem("esmee_visited"); } catch (e) {}
    document.body.classList.add("pre-locked");
    let cancelled = false;
    let loaded = 0;
    const start = performance.now();
    const MIN_MS = returning ? 250 : 800;
    const MAX_MS = returning ? 600 : 2200;
    let finished = false;
    const finish = async () => {
      if (cancelled || finished) return;
      finished = true;
      const elapsed = performance.now() - start;
      if (elapsed < MIN_MS) await new Promise(r => setTimeout(r, MIN_MS - elapsed));
      if (cancelled) return;
      setStep(total);
      await new Promise(r => setTimeout(r, 120));
      setDone(true);
      document.body.classList.remove("pre-locked");
      try { window.localStorage.setItem("esmee_visited", "1"); } catch (e) {}
      setTimeout(() => { setGone(true); onDone && onDone(); }, returning ? 350 : 900);
    };
    // Hard cap — never let the preloader stall the page beyond MAX_MS.
    const hardCap = setTimeout(finish, MAX_MS);
    Promise.all(
      SCENES.map((s) => new Promise(res => {
        const img = new Image();
        const inc = () => { loaded++; setStep(Math.min(total, loaded + 1)); res(); };
        img.onload = inc;
        img.onerror = inc;
        const u = (typeof window !== 'undefined' && window.__withToken) ? window.__withToken(s.src) : s.src;
        img.src = u;
      }))
    ).then(finish);
    // Allow user to skip after 600 ms via a tap on the preloader.
    const skipHandler = () => { if (performance.now() - start > 600) finish(); };
    window.addEventListener("click", skipHandler);
    window.addEventListener("touchstart", skipHandler, { passive: true });
    return () => {
      cancelled = true;
      clearTimeout(hardCap);
      window.removeEventListener("click", skipHandler);
      window.removeEventListener("touchstart", skipHandler);
      document.body.classList.remove("pre-locked");
    };
  }, [onDone, total]);

  const pct = ((step - 1) / Math.max(1, total - 1)) * 100;

  return (
    <div className={"preloader " + (done ? "done " : "") + (gone ? "gone" : "")}>
      <div className="curtain top" />
      <div className="curtain bottom" />
      <div className="center">
        <div className="tag">Esmee · Maison N° 01</div>
        <div className="mark" aria-label="Esmee">
          {"ESMEE".split("").map((l, i) => (<span key={i} className="ltr">{l}</span>))}
        </div>
        <div className="progress-line">
          <div className="step">composing your cup …</div>
          <div className="bar"><div className="fill" style={{ width: pct + "%" }} /></div>
          <div className="step">
            <span className="counter">{String(step).padStart(2, "0")}</span>
            <span className="total"> / {String(total).padStart(2, "0")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Canvas steam particles */
function SteamCanvas({ getIntensity }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    let roRaf = 0;
    const ro = new ResizeObserver(() => {
      if (roRaf) return;
      roRaf = requestAnimationFrame(() => { roRaf = 0; resize(); });
    });
    ro.observe(canvas);
    const MAX = 80;
    const particles = [];
    let raf = 0, last = performance.now();
    const spawn = () => {
      if (particles.length >= MAX) return;
      particles.push({
        x: w * (0.42 + Math.random() * 0.16),
        y: h * 0.58 + Math.random() * 24,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -0.4 - Math.random() * 0.55,
        life: 0,
        max: 4 + Math.random() * 3.5,
        r: 18 + Math.random() * 24,
        drift: (Math.random() - 0.5) * 0.6,
      });
    };
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const intensity = (getIntensity && getIntensity()) || 0;
      if (Math.random() < dt * (0.5 + intensity * 7)) spawn();
      ctx.clearRect(0, 0, w, h);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life > p.max) { particles.splice(i, 1); continue; }
        p.vx += Math.sin((p.y + p.life * 60) * 0.01) * 0.0025 * p.drift;
        p.x += p.vx;
        p.y += p.vy;
        const lifeFrac = p.life / p.max;
        const alpha = (1 - lifeFrac) * Math.sin(lifeFrac * Math.PI) * 0.45 * Math.min(1, intensity * 1.8 + 0.05);
        const r = p.r * (1 + lifeFrac * 1.6);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        grad.addColorStop(0, `rgba(255, 250, 244, ${alpha})`);
        grad.addColorStop(1, "rgba(255, 250, 244, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [getIntensity]);
  return <canvas ref={ref} className="steam-canvas" aria-hidden="true" />;
}

/* Audio: disabled by design — no ambient, no SFX. Returns no-op API to keep call sites stable. */
function useAudio() {
  const noop = useCallback(() => {}, []);
  return { enabled: false, toggle: noop, playTap: noop, playBell: noop };
}

function flyToCart(imageUrl) {
  const cart = document.querySelector(".cart-btn");
  const stage = document.querySelector(".shop .product-stage");
  if (!cart || !stage) return;
  const s = stage.getBoundingClientRect();
  const c = cart.getBoundingClientRect();
  const startX = s.left + s.width / 2;
  const startY = s.top + s.height / 2;
  const endX = c.left + c.width / 2;
  const endY = c.top + c.height / 2;
  const clone = document.createElement("div");
  clone.className = "fly-clone";
  clone.style.backgroundImage = `url(${imageUrl})`;
  clone.style.width = "160px";
  clone.style.height = "160px";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.transform = `translate(${startX - 80}px, ${startY - 80}px) scale(1)`;
  clone.style.opacity = "1";
  clone.style.transition = "transform 1s cubic-bezier(.5,0,.1,1), opacity .9s ease-out, width .9s ease-out, height .9s ease-out";
  document.body.appendChild(clone);
  // Force reflow
  // eslint-disable-next-line no-unused-expressions
  clone.offsetHeight;
  requestAnimationFrame(() => {
    clone.style.width = "28px";
    clone.style.height = "28px";
    clone.style.transform = `translate(${endX - 14}px, ${endY - 14}px) scale(.7)`;
    clone.style.opacity = "0";
  });
  setTimeout(() => clone.remove(), 1050);
  // Bump the cart icon
  cart.classList.remove("bump");
  cart.offsetHeight;
  cart.classList.add("bump");
  setTimeout(() => cart.classList.remove("bump"), 600);
  const cnt = cart.querySelector(".cart-count");
  if (cnt) {
    cnt.classList.remove("flash");
    cnt.offsetHeight;
    cnt.classList.add("flash");
    setTimeout(() => cnt.classList.remove("flash"), 700);
  }
}

function Nav({ onCart, cartCount, scrolled }) {
  return (
    <div className={"nav-shell " + (scrolled ? "scrolled" : "")}>
      <nav className="nav">
        <div className="left">
          <div className="links">
            <a className="link" data-cur="btn" data-cur-label="Read" href="#story-intro">Manduraa</a>
            <a className="link" data-cur="btn" data-cur-label="Open" href="#universe">Ingredients</a>
            <a className="link" data-cur="btn" data-cur-label="Shop" href="#shop">Shop</a>
            <a className="link" data-cur="btn" data-cur-label="FAQ" href="#faq">FAQ</a>
          </div>
        </div>
        <a href="#top" className="brandmark brandmark-logo" data-cur="btn" data-cur-label="Top" aria-label="Esmee">
          <img src="/assets/logo-esmee.png" alt="Esmee" />
        </a>
        <div className="right">
          <button className="cart-btn" data-cur="btn" data-cur-label="Bag" onClick={onCart} aria-label="Open cart">
            <span>Cart</span>
            <span className="cart-count">{cartCount}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

/* ============================================================
   CINEMATIC SCROLL STORY — 6 scenes
   ============================================================ */
const SCENES = [
  {
    src: "/assets/scene-1.jpg",
    kicker: "Esmee · Maison N° 01",
    title: "A composition,\nsuspended.",
    body: "Dates. Almonds. Pistachio. Coffee.\nFour ingredients, held for a breath.",
    pos: "top", sub: "Scroll, slowly",
  },
  {
    src: "/assets/scene-2.jpg",
    kicker: "Phase ii — The settling",
    title: "Each ingredient,\nin its turn.",
    pos: "side-right",
    tags: [
      { side: "l", x: "6vw", y: "30vh", label: "Medjool Date" },
      { side: "r", x: "8vw", y: "36vh", label: "Cocoa Nib" },
      { side: "l", x: "9vw", y: "52vh", label: "Single-origin Arabica" },
    ],
  },
  {
    src: "/assets/scene-3.jpg",
    kicker: "Phase iii — Composition",
    title: "Date. Almond.\nPistachio. Coffee.",
    pos: "top",
    tags: [
      { side: "l", x: "8vw", y: "34vh", label: "Marcona Almond" },
      { side: "r", x: "10vw", y: "44vh", label: "Antep Pistachio" },
    ],
  },
  {
    src: "/assets/scene-4.jpg",
    kicker: "Phase iv — At rest",
    title: "A still cup,\nheld in light.",
    body: "The drama settles. What is left is the\nquiet, the steam, the waiting.",
    pos: "side-right",
  },
  {
    src: "/assets/scene-5.jpg",
    kicker: "Phase v — The reveal",
    title: "From the atelier\nto the cup.",
    body: "One blend. One pouch. Composed\nby hand in Dubai.",
    pos: "top",
  },
  {
    src: "/assets/scene-6.jpg",
    kicker: "Edition № 01",
    title: "Manduraa.",
    body: "Sweetened with dates, not sugar.\n250 g · 6 ingredients · 0 sugar added.",
    pos: "bottom", cta: true,
  },
];

function ScrollStory({ onSteamIntensity, heroFrom }) {
  const stageRef = useRef(null);
  const sceneRefs = useRef([]);
  const intensityRef = useRef(0);
  const [cue, setCue] = useState(0);
  const lastCue = useRef(-1);

  useEffect(() => {
    let raf = 0;
    const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
    const update = () => {
      raf = 0;
      const el = stageRef.current; if (!el) return;
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const h = el.offsetHeight - window.innerHeight;
      const p = Math.max(0, Math.min(1, (window.scrollY - top) / h));
      const N = SCENES.length;
      const playhead = p * (N - 1);
      // Cinematic crossfade: at any moment, two adjacent scenes share the screen
      // and their opacities sum to 1 — so the sand bg never shows through.
      sceneRefs.current.forEach((node, i) => {
        if (!node) return;
        let op = 0;
        if (playhead <= 0)         op = (i === 0)     ? 1 : 0;
        else if (playhead >= N - 1) op = (i === N - 1) ? 1 : 0;
        else {
          const lower = Math.floor(playhead);
          const t = playhead - lower; // 0..1 between lower and lower+1
          // Lower stays at full brightness, upper fades in on top of it.
          // This keeps the screen at full brightness through every transition
          // (one layer is always 100%, the next one just slides in over it).
          if (i === lower)         op = 1;
          else if (i === lower + 1) op = smooth(t);
        }
        node.style.opacity = op.toFixed(3);
        // ken-burns drift across the scene's life
        const dist = Math.abs(playhead - i);
        const lc = Math.max(0, Math.min(1, 1 - dist));
        const s = 1.06 - 0.06 * lc;
        const ty = (0.5 - lc) * 10;
        node.style.transform = `scale(${s}) translateY(${ty}px)`;
      });
      const hint = 1 - clamp01(p / 0.05);
      const counter = clamp01((p - 0.02) / 0.05);
      el.style.setProperty('--hint-opacity', hint);
      el.style.setProperty('--counter-opacity', counter);
      // steam intensity peaks during phases 2-4 (cup + composition)
      const peak = (i) => Math.max(0, 1 - Math.abs(playhead - i));
      const intensity = Math.min(1, 0.15 * peak(0) + 0.55 * peak(1) + 0.85 * peak(2) + 0.95 * peak(3) + 0.55 * peak(4) + 0.2 * peak(5));
      intensityRef.current = intensity;
      onSteamIntensity && onSteamIntensity(intensity);
      const c = Math.min(N - 1, Math.max(0, Math.round(playhead)));
      if (c !== lastCue.current) { lastCue.current = c; setCue(c); }
    };
    const onScroll = () => { if (raf) return; raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [onSteamIntensity]);

  const scrollToShop = () => {
    const el = document.getElementById('shop');
    if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
  };

  const getIntensity = useCallback(() => intensityRef.current, []);

  return (
    <div id="story" className="story" ref={stageRef}>
      <div className="story-stage">
        {SCENES.map((s, i) => (
          <div
            key={i}
            ref={el => { sceneRefs.current[i] = el; }}
            className="scene"
            style={{ backgroundImage: `url(${s.src})`, zIndex: i + 1, opacity: i === 0 ? 1 : 0 }}
            aria-hidden={cue !== i}
          />
        ))}
        <SteamCanvas getIntensity={getIntensity} />
        <div className="phase-counter">
          <span className="big">0{cue + 1}</span> &nbsp; — &nbsp; <span>{SCENES.length} acts</span>
        </div>
        {/* CRO: Hero buy-strip — stars + price + ATC over the first scene */}
        <div className={"hero-buystrip " + (cue === 0 ? "in" : "")} aria-hidden={cue !== 0}>
          <div className="hb-row hb-row-top">
            <span className="hb-stars" aria-label="Produkt-Highlights">
              <span className="hb-rate">0 g raffinierter Zucker · 6 Zutaten · Vegan</span>
            </span>
            <span className="hb-trust">
              <span>30 Tage Geld-zurück</span>
              <span className="hb-dot"></span>
              <span>Versand in 48 h</span>
              <span className="hb-dot"></span>
              <span>Gratis ab €60</span>
            </span>
          </div>
          <div className="hb-row hb-row-bot">
            <div className="hb-meta">
              <span className="hb-edition">Esmee · Edition № 01</span>
              <span className="hb-name">Manduraa · ab <em>€{heroFrom || 22}</em>/Pouch</span>
            </div>
            <div className="hb-cta-wrap">
              <button className="hb-cta" data-cur="btn" data-cur-label="Shop" onClick={scrollToShop}>
                In den Warenkorb <span className="hb-cta-arrow">→</span>
              </button>
              <button className="hb-cta-ghost" onClick={() => { const el = document.getElementById("story-intro"); if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" }); }}>
                Story ansehen
              </button>
            </div>
          </div>
        </div>
        <div className="stage-text">
          {SCENES.map((s, i) => {
            const cls = ["cue", s.pos === "side-right" ? "side-right" : s.pos === "bottom" ? "bottom" : "top", cue === i ? "in" : ""];
            return (
              <div key={i} className={cls.join(" ")}>
                <div className="kicker">{s.kicker}</div>
                <h2 className="head" style={{ whiteSpace: "pre-line" }}>{s.title}</h2>
                {s.body && <p className="body" style={{ whiteSpace: "pre-line" }}>{s.body}</p>}
                {s.sub && <div className="sub">{s.sub}</div>}
                {s.cta && (
                  <button className="reveal-cta" data-cur="btn" data-cur-label="Shop" onClick={scrollToShop}>
                    Discover Manduraa →
                  </button>
                )}
              </div>
            );
          })}
          {SCENES.map((s, i) =>
            s.tags && cue === i
              ? s.tags.map((t, j) => (
                  <span
                    key={`${i}-${j}`}
                    className={"ingredient-tag " + t.side + " in"}
                    style={t.side === "l" ? { left: t.x, top: t.y } : { right: t.x, top: t.y }}
                  >
                    {t.label}
                  </span>
                ))
              : null
          )}
        </div>
        <div className="scroll-hint">
          <span>Scroll, slowly</span>
          <span className="bar"></span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CRO — REVIEWS RIBBON (early proof strip after the hero story)
   ============================================================ */
function ReviewsRibbon() {
  const jump = () => {
    const el = document.querySelector(".reviews-v2") || document.getElementById("reviews");
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };
  return (
    <section className="reviews-ribbon" aria-label="Produktversprechen">
      <div className="rr-score">
        <span className="num">0 g <em>Zucker</em></span>
      </div>
      <div className="rr-quotes">
        <span>Mit Datteln gesüßt.</span>
        <span>Sechs Zutaten.</span>
        <span>Handkomponiert in Dubai.</span>
      </div>
      <button className="rr-jump" type="button" onClick={jump}>Die Komposition entdecken →</button>
    </section>
  );
}

/* ============================================================
   INTRO STORY
   ============================================================ */
function StoryIntro() {
  return (
    <section id="story-intro" className="block story-intro">
      <div className="container grid">
        <div>
          <span className="eyebrow reveal">— A note from the atelier</span>
          <h2 className="reveal delay-1">
            <SplitText text="The cup our grandmothers" />
            <br/>
            <em className="italic"><SplitText text="never had time" delay={0.3} /></em>
            <SplitText text=" to write down." delay={0.55} />
          </h2>
          <p className="reveal delay-2">
            Manduraa is not a coffee, and not quite a chocolate. It is the quiet
            ceremony we kept watching, year after year, in kitchens from{" "}
            <HoverWord word="Beirut" label="Beirut · Lebanon" text="Where the date-syrup tradition still lives in copper saucepans." img="/assets/scene-2.jpg" />{" "}
            to{" "}
            <HoverWord word="Antakya" label="Antakya · Türkiye" text="The pistachio belt — Antep cousins of the cup." img="/assets/scene-3.jpg" />: the women who turned dates into syrup with their hands,
            who ground{" "}
            <HoverWord word="almonds" label="Marcona Almond" text="The buttery Spanish almond. Cold-stone milled into the blend." img="/assets/scene-5.jpg" />{" "}
            patiently because sugar was for guests.
          </p>
          <p className="reveal delay-3">
            We bottled the gesture. Six ingredients, nothing else. The blend is
            sweetened only by{" "}
            <HoverWord word="Jordan Valley dates" label="Medjool Date" text="Sun-cured on a single farm in the Jordan Valley." img="/assets/scene-6.jpg" />.{" "}
            The body comes from cold-stone Marcona. The lift, when you want it,
            is single-origin{" "}
            <HoverWord word="arabica" label="Arabica · Yemen" text="A measured pour from the Haraz mountain farms." img="/assets/scene-1.jpg" />.
          </p>
          <div className="stats reveal delay-3">
            <div className="stat"><strong><Counter to={6} duration={1100} /></strong><span>Ingredients</span></div>
            <div className="stat"><strong><Counter to={0} duration={1100} suffix="g" /></strong><span>Refined sugar</span></div>
            <div className="stat"><strong><Counter to={1} duration={1100} prefix="0" /></strong><span>Atelier · Dubai</span></div>
          </div>
        </div>
        <div className="reveal delay-1">
          <div className="frame aspect-3x4 parallax" data-cur="img" data-cur-label="View">
            <BlurImg src="/assets/scene-4.jpg" alt="A still porcelain cup of Manduraa, steaming softly." />
            <span className="caption">Atelier — Composition no. 04</span>
            <span className="floating-tag"><span className="pulse"></span>Hand-blended · Dubai</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   INGREDIENT UNIVERSE — draggable orbit + click modal
   ============================================================ */
function IngredientUniverse() {
  const innerRef = useRef(null);
  const wrapRef = useRef(null);
  const [rot, setRot] = useState(0);              // current rotation (deg)
  const rotRef = useRef(0);
  const dragging = useRef(false);
  const lastAngle = useRef(0);
  const lastDelta = useRef(0);
  const inertia = useRef(0);
  const auto = useRef(0);
  const [selected, setSelected] = useState(null); // ingredient or null

  // auto-rotate slowly when idle
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (!dragging.current) {
        // inertia decay or gentle auto-rotate
        if (Math.abs(inertia.current) > 0.05) {
          rotRef.current += inertia.current;
          inertia.current *= 0.94;
        } else {
          rotRef.current += 0.05;
          inertia.current = 0;
        }
        setRot(rotRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // drag handlers
  useEffect(() => {
    const wrap = wrapRef.current; if (!wrap) return;
    const center = () => {
      const r = wrap.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    };
    const angleAt = (e) => {
      const { cx, cy } = center();
      return Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
    };
    const down = (e) => {
      dragging.current = true;
      wrap.classList.add("dragging");
      lastAngle.current = angleAt(e);
      lastDelta.current = 0;
    };
    const move = (e) => {
      if (!dragging.current) return;
      const a = angleAt(e);
      let d = a - lastAngle.current;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      rotRef.current += d;
      lastDelta.current = d;
      lastAngle.current = a;
      setRot(rotRef.current);
    };
    const up = () => {
      if (!dragging.current) return;
      dragging.current = false;
      wrap.classList.remove("dragging");
      inertia.current = lastDelta.current * 0.9;
    };
    wrap.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    // touch
    const tdown = (e) => { const t = e.touches[0]; if (t) down(t); };
    const tmove = (e) => { const t = e.touches[0]; if (t) move(t); };
    wrap.addEventListener("touchstart", tdown, { passive: true });
    window.addEventListener("touchmove", tmove, { passive: true });
    window.addEventListener("touchend", up);
    return () => {
      wrap.removeEventListener("mousedown", down);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      wrap.removeEventListener("touchstart", tdown);
      window.removeEventListener("touchmove", tmove);
      window.removeEventListener("touchend", up);
    };
  }, []);

  const placeChip = (ing, idx) => {
    const rad = (ing.angle * Math.PI) / 180;
    const left = 50 + Math.cos(rad) * ing.r;
    const top  = 50 + Math.sin(rad) * ing.r;
    return (
      <div
        key={ing.name}
        className="ing-chip"
        data-cur="btn"
        data-cur-label="Open"
        style={{
          left: `${left}%`,
          top: `${top}%`,
          transform: "translate(-50%, -50%)",
          position: "absolute",
        }}
        onClick={(e) => { e.stopPropagation(); setSelected(ing); }}
      >
        <span className="swatch" style={{ background: ing.color }} />
        <div>
          <div className="name">{ing.name}</div>
          <span className="note">{ing.note}</span>
        </div>
      </div>
    );
  };

  // connectors from each chip to the center
  const connectors = INGREDIENTS.map((ing, i) => {
    const rad = (ing.angle * Math.PI) / 180;
    const x = 50 + Math.cos(rad) * ing.r;
    const y = 50 + Math.sin(rad) * ing.r;
    return <path key={i} d={`M50 50 L${x} ${y}`} />;
  });

  return (
    <section id="universe" className="block universe">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow reveal">— Ingredient universe</span>
          <h2 className="reveal delay-1">
            <SplitText text="Six ingredients" /> <em className="italic"><SplitText text="in orbit." delay={0.25} /></em>
          </h2>
          <p className="reveal delay-2">
            Drag to rotate the orbit. Click any ingredient to meet the farm,
            the season, and the gram-count behind a single cup of Manduraa.
          </p>
        </div>
        <div className="orbit-wrap reveal delay-2" ref={wrapRef}>
          <svg className="orbit-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="orbit-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#B07A52" stopOpacity="0.5"/>
                <stop offset="100%" stopColor="#B07A52" stopOpacity="0"/>
              </linearGradient>
            </defs>
            {connectors}
          </svg>
          <div className="orbit-ring outer" />
          <div className="orbit-ring inner" />
          <div className="orbit-inner" ref={innerRef} style={{ transform: `rotate(${rot}deg)` }}>
            {INGREDIENTS.map((ing, i) => (
              <div key={ing.name} style={{ position: "absolute", inset: 0, transform: `rotate(${-rot}deg)` }}>
                {/* Counter-rotate each chip so labels stay upright. */}
                <div style={{ position: "absolute", inset: 0, transform: `rotate(${rot}deg)` }}>
                  {placeChip(ing, i)}
                </div>
              </div>
            ))}
          </div>
          <div className="orbit-core">
            <BlurImg src="/assets/pack-flat-layout.jpeg" alt="Manduraa pouch" />
          </div>
          <span className="hint">drag to rotate · click any chip</span>
        </div>
      </div>
      <IngredientModal ingredient={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function IngredientModal({ ingredient, onClose }) {
  const open = !!ingredient;
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <>
      <div className={"ing-modal-overlay " + (open ? "open" : "")} onClick={onClose} />
      <div className={"ing-modal " + (open ? "open" : "")} role="dialog" aria-hidden={!open}>
        {ingredient && (
          <>
            <div className="ing-hero" style={{ backgroundImage: `url(${ingredient.img})` }}>
              <div className="stamp">N° {String(INGREDIENTS.indexOf(ingredient) + 1).padStart(2, "0")}</div>
            </div>
            <div className="ing-body">
              <span className="ing-eyebrow">{ingredient.note}</span>
              <h3>{ingredient.name}</h3>
              <p className="lede">"{ingredient.lede}"</p>
              <div className="facts">
                <div className="fact"><span>Origin</span><strong>{ingredient.origin}</strong></div>
                <div className="fact"><span>Season</span><strong>{ingredient.season}</strong></div>
                <div className="fact"><span>Per pouch</span><strong>{ingredient.grams}</strong></div>
                <div className="fact"><span>Sourcing</span><strong>Single-farm</strong></div>
              </div>
              <p className="body">{ingredient.body}</p>
              <button className="back" data-cur="btn" data-cur-label="Close" onClick={onClose}>← Back to orbit</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ============================================================
   VS COMPARISON
   ============================================================ */
function Vs() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add("in"); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const themItems = [
    "10–20 g refined sugar or syrup added",
    "Sharp caffeine spike, 3pm crash",
    "Acidic; harsh on an empty stomach",
    "Empty calories, no nutrient density",
    "Industrial roasts, anonymous origin",
    "Sugar guilt by 4pm",
  ];
  const usItems = [
    "0 g refined sugar — sweetened by Medjool dates",
    "Sustained, balanced energy from almond fat",
    "Low-acid, gentle on the stomach",
    "Fibre, magnesium and potassium per cup",
    "Single-farm, single-batch, single-season",
    "A ritual you can repeat without flinching",
  ];
  // Dash icon (—) for them, check (✓) drawn for us
  const Dash = () => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="11" cy="11" r="9.5" opacity=".4" />
      <path d="M6 11 L 16 11" />
    </svg>
  );
  const Check = () => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="var(--copper)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="9.5" opacity=".4" />
      <path d="M6 11 L 10 15 L 16 7.5" />
    </svg>
  );
  return (
    <section className="block vs">
      <div className="container tight">
        <div className="section-head">
          <span className="eyebrow reveal">— Manduraa vs. the rest</span>
          <h2 className="reveal delay-1">
            <SplitText text="A cup that doesn't" /> <em className="italic"><SplitText text="cost you" delay={0.3} /></em> <SplitText text="the afternoon." delay={0.45} />
          </h2>
        </div>
        <div className="vs-grid reveal delay-2" ref={ref}>
          <div className="vs-col them">
            <span className="vs-label">Coffee · Latte · Energy drink</span>
            <h3>The usual cup</h3>
            <ul>
              {themItems.map((t, i) => <li key={i}><Dash />{t}</li>)}
            </ul>
            <div className="sugar-bar">
              <div className="sb-label"><span>Refined sugar / cup</span><em>~18 g</em></div>
              <div className="bar"><div className="fill" /></div>
            </div>
          </div>
          <div className="vs-col us">
            <span className="vs-label">Manduraa · Edition 01</span>
            <h3>The composed cup</h3>
            <ul>
              {usItems.map((t, i) => <li key={i}><Check />{t}</li>)}
            </ul>
            <div className="sugar-bar">
              <div className="sb-label"><span>Refined sugar / cup</span><em>0 g</em></div>
              <div className="bar"><div className="fill" /></div>
            </div>
          </div>
          <div className="vs-divider">vs</div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   BENEFITS
   ============================================================ */
function BenefitGlyph({ kind }) {
  const c = "var(--copper)";
  if (kind === "leaf") return (<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke={c} strokeWidth="1.4"><path d="M8 24 C 8 14, 18 6, 26 6 C 26 18, 18 26, 8 24 Z"/><path d="M10 22 L 22 10"/></svg>);
  if (kind === "spark") return (<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke={c} strokeWidth="1.4"><path d="M16 4 L 18 14 L 28 16 L 18 18 L 16 28 L 14 18 L 4 16 L 14 14 Z"/></svg>);
  if (kind === "drop") return (<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke={c} strokeWidth="1.4"><path d="M16 4 C 8 14, 6 22, 16 28 C 26 22, 24 14, 16 4 Z"/></svg>);
  if (kind === "circle") return (<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke={c} strokeWidth="1.4"><circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="5"/></svg>);
  if (kind === "marker") return (<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke={c} strokeWidth="1.4"><path d="M16 28 C 8 20, 6 14, 16 4 C 26 14, 24 20, 16 28 Z"/><circle cx="16" cy="14" r="3"/></svg>);
  if (kind === "clock") return (<svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke={c} strokeWidth="1.4"><circle cx="16" cy="16" r="11"/><path d="M16 9 L 16 16 L 21 19"/></svg>);
  return null;
}
function Benefits() {
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);
  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current) setActive(a => (a + 1) % BENEFITS.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);
  return (
    <section className="block benefits">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow reveal">— Why Manduraa</span>
          <h2 className="reveal delay-1">
            <SplitText text="A cup that" /> <em className="italic"><SplitText text="gives back." delay={0.25} /></em>
          </h2>
          <p className="reveal delay-2">Six reasons our customers reorder. None of them are sugar.</p>
        </div>
        <div
          className="benefit-grid"
          onMouseEnter={() => pausedRef.current = true}
          onMouseLeave={() => pausedRef.current = false}
        >
          {BENEFITS.map((b, i) => (
            <div
              key={b.t}
              className={"b-card delay-" + ((i % 4) + 1) + (active === i ? " active" : "")}
              onMouseEnter={() => setActive(i)}
            >
              <div className="b-num">— 0{i + 1}</div>
              <div className="b-glyph"><BenefitGlyph kind={b.g} /></div>
              <h3>{b.t}</h3>
              <p>{b.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   SHOP — sticky split, bulk packs, magnetic ATC
   ============================================================ */
function Shop({ onAdd, onMagnetMove, onTap, liveVariants, sellingPlans }) {
  // Live Shopify catalog drives the display; demo VARIANTS are the offline fallback.
  const variants = (liveVariants && liveVariants.length) ? liveVariants : VARIANTS;
  const singleVariant = variants.length === 1;
  const [variant, setVariant] = useState(variants[0]);
  useEffect(() => {
    if (liveVariants && liveVariants.length) setVariant(liveVariants[0]);
  }, [liveVariants]);
  const [pack, setPack] = useState(PACKS[1]);
  const [qty, setQty] = useState(1);
  const [bump, setBump] = useState(false);
  // CRO T-03: subscription plan toggle
  const [plan, setPlan] = useState("once"); // "once" | "30" | "60"
  // CRO T-11: Gift mode
  const [gift, setGift] = useState(false);
  const [giftMsg, setGiftMsg] = useState("");
  const [giftTo, setGiftTo] = useState("");
  const GIFT_FEE = 6;
  const stageRef = useRef(null);
  const tiltRef = useRef(null);
  const [burstKey, setBurstKey] = useState(0);

  const SUB_DISCOUNT = 0.15; // fallback display discount when no live selling plan
  const subActive = plan !== "once";
  // Live mode: prices derive from the real Shopify variant price.
  //  · one-time   → per-pack tier discount (honoured by the ESMEE-* codes)
  //  · subscription → flat discount from the real Shopify selling plan
  const liveBase = typeof variant.price === "number" ? variant.price : null;
  const r2 = (n) => Math.round(n * 100) / 100;
  const dec = liveBase != null ? 2 : 0;
  const m = (n) => n.toFixed(dec);
  // Match the chosen cadence (30 / 60 days) to a real Shopify selling plan.
  const planFor = (days) => {
    if (!sellingPlans || !sellingPlans.length) return null;
    const exact = sellingPlans.find(sp => sp.intervalDays === days);
    if (exact) return exact;
    const withInterval = sellingPlans.filter(sp => sp.intervalDays != null);
    if (withInterval.length) {
      return withInterval.reduce((best, sp) =>
        Math.abs(sp.intervalDays - days) < Math.abs(best.intervalDays - days) ? sp : best);
    }
    return sellingPlans[0];
  };
  const activePlan = subActive ? planFor(plan === "60" ? 60 : 30) : null;
  const subPct = (activePlan && activePlan.percentage) ? activePlan.percentage / 100 : SUB_DISCOUNT;
  const sellingPlanId = activePlan ? activePlan.id : null;
  const packUnit = (p) => liveBase != null ? r2(liveBase * (1 - p.save / 100)) : p.unit;
  const subUnit = liveBase != null ? r2(liveBase * (1 - subPct)) : Math.round(PACKS[0].unit * (1 - subPct));
  const baseUnit = packUnit(pack);
  const unitPrice = subActive ? subUnit : baseUnit;
  const wasUnit = liveBase != null ? r2(liveBase) : PACKS[0].unit;
  const lineCount = pack.count * qty;
  const total = r2(unitPrice * lineCount);
  // Per-cadence display values for the plan cards (fall back to 15 % with no live plan).
  const plan30 = planFor(30), plan60 = planFor(60);
  const pct30 = (plan30 && plan30.percentage) ? plan30.percentage / 100 : SUB_DISCOUNT;
  const pct60 = (plan60 && plan60.percentage) ? plan60.percentage / 100 : SUB_DISCOUNT;
  const unit30 = liveBase != null ? r2(liveBase * (1 - pct30)) : Math.round(PACKS[0].unit * (1 - pct30));
  const unit60 = liveBase != null ? r2(liveBase * (1 - pct60)) : Math.round(PACKS[0].unit * (1 - pct60));

  const setQtyBump = (n) => { setQty(n); setBump(true); setTimeout(() => setBump(false), 350); onTap && onTap(); };

  // mouse tilt on pouch theater
  useEffect(() => {
    const stage = stageRef.current, tilt = tiltRef.current;
    if (!stage || !tilt) return;
    const onMove = (e) => {
      const r = stage.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;   // -0.5..0.5
      const py = (e.clientY - r.top)  / r.height - 0.5;
      const rX = -py * 10;  // tilt up/down
      const rY = px * 12;
      tilt.style.transform = `rotateX(${rX.toFixed(2)}deg) rotateY(${rY.toFixed(2)}deg) translateZ(0)`;
    };
    const onLeave = () => { tilt.style.transform = "rotateX(0) rotateY(0)"; };
    stage.addEventListener("mousemove", onMove);
    stage.addEventListener("mouseleave", onLeave);
    return () => { stage.removeEventListener("mousemove", onMove); stage.removeEventListener("mouseleave", onLeave); };
  }, []);

  // ingredient burst sprites whenever variant changes
  const burstColors = ["#7A4A2B", "#D9B988", "#7A8C4F", "#3E2719", "#A48A53", "#4E3322"];
  const burst = (
    <div className="burst" key={burstKey} aria-hidden="true">
      {Array.from({ length: 14 }).map((_, i) => {
        const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 110 + Math.random() * 90;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist * 0.9 - 30;
        const rot = (Math.random() - 0.5) * 540;
        const size = 10 + Math.random() * 14;
        const color = burstColors[i % burstColors.length];
        return (
          <span
            key={i}
            className="sprite"
            style={{
              width: size, height: size,
              background: color,
              borderRadius: i % 3 === 0 ? "999px" : "30%",
              animation: `burst${i} 1.2s cubic-bezier(.2,.7,.2,1) forwards`,
            }}
          />
        );
      })}
      <style>{Array.from({ length: 14 }).map((_, i) => {
        const angle = (i / 14) * Math.PI * 2 + 0.15;
        const dist = 130 + (i * 11) % 60;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist - 30;
        const rot = (i % 2 === 0 ? 1 : -1) * (240 + (i * 33) % 200);
        return `
          @keyframes burst${i} {
            0%   { opacity: 0; transform: translate(-50%, -50%) translate(0,0) rotate(0deg) scale(.4); }
            18%  { opacity: 1; }
            100% { opacity: 0; transform: translate(-50%, -50%) translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(1); }
          }`;
      }).join("\n")}</style>
    </div>
  );

  const chooseVariant = (v) => { setVariant(v); setBurstKey(k => k + 1); onTap && onTap(); };
  const choosePack = (p, e) => {
    setPack(p);
    onTap && onTap();
    if (p.id === "10" && pack.id !== "10") {
      const r = e.currentTarget.getBoundingClientRect();
      burstConfetti(r.left + r.width / 2, r.top + 8, { count: 44 });
    }
  };

  const add = () => {
    flyToCart(variant.image);
    setTimeout(() => {
      onAdd({
        variant: variant.id,
        variantName: variant.name,
        packId: pack.id,
        packLabel: pack.label,
        packCount: pack.count,
        qty,
        unitPrice,
        total,
        image: variant.image,
        merchandiseId: variant.merchandiseId,
        sellingPlanId,
        plan,
        subActive,
        gift,
        giftMsg: gift ? giftMsg : null,
        giftTo: gift ? giftTo : null,
        giftFee: gift ? GIFT_FEE : 0,
      });
    }, 850);
  };

  return (
    <section id="shop" className="shop">
      <div className="shop-grid">
        <div className="product-stage" ref={stageRef}>
          <div className={"light-bg var-" + variant.id} />
          <div className="tilt-layer" ref={tiltRef}>
            {variants.map(v => (
              <div
                key={v.id}
                className={"pouch " + (v.id === variant.id ? "active" : "")}
                style={{ backgroundImage: `url(${v.image})` }}
              />
            ))}
          </div>
          {burst}
          <span className="floating-tag"><span className="pulse"></span>In stock · Ships in 48 h</span>
          {!singleVariant && (
            <div className="swatch-row">
              {variants.map(v => (
                <button
                  key={v.id}
                  className={"swatch " + (v.id === variant.id ? "active" : "")}
                  style={{ background: v.swatch }}
                  onClick={() => chooseVariant(v)}
                  data-cur="btn"
                  data-cur-label="Pick"
                  aria-label={v.name}
                  title={v.name}
                />
              ))}
            </div>
          )}
        </div>

        <div className="meta">
          <span className="by">Esmee · Edition № 01</span>
          <h2>Manduraa<em>{variant.name}</em></h2>
          <div className="stars">
            <span>Edition № 01 · 0 g raffinierter Zucker · Vegan · Glutenfrei</span>
          </div>
          <p className="lede">{variant.note}</p>

          <div className="price-row">
            <span className="price">€{m(unitPrice)}</span>
            <span className="price-was">€{m(wasUnit)}</span>
            {!subActive && pack.save > 0 && <span className="price-save">Du sparst {pack.save}%</span>}
            {subActive && <span className="price-save sub-tag">Abo · −{Math.round(subPct*100)}%</span>}
          </div>

          {/* CRO T-03: Subscription / one-time plan toggle */}
          <div className="option-block">
            <div className="option-label">
              <span>Lieferung — Einmalig oder Abo</span>
              <em>{plan === "once" ? "Einmal kaufen" : (plan === "30" ? "Alle 30 Tage" : "Alle 60 Tage")}</em>
            </div>
            <div className="plan-row">
              <button
                type="button"
                className={"plan-card " + (plan === "once" ? "active" : "")}
                onClick={() => { setPlan("once"); onTap && onTap(); }}
                data-cur="btn"
                data-cur-label="Pick"
              >
                <span className="plan-radio"></span>
                <span className="plan-body">
                  <span className="plan-name">Einmal kaufen</span>
                  <span className="plan-sub">Keine Verpflichtung · Lieferung in 48 h</span>
                </span>
                <span className="plan-price">€{m(baseUnit)}<small>/Packung</small></span>
              </button>
              <button
                type="button"
                className={"plan-card with-save " + (plan === "30" ? "active" : "")}
                onClick={() => { setPlan("30"); onTap && onTap(); }}
                data-cur="btn"
                data-cur-label="Pick"
              >
                <span className="plan-badge">Spare {Math.round(pct30 * 100)} %</span>
                <span className="plan-radio"></span>
                <span className="plan-body">
                  <span className="plan-name">Abo · alle 30 Tage</span>
                  <span className="plan-sub">Jederzeit pausieren oder kündigen — in einem Tap.</span>
                </span>
                <span className="plan-price">€{m(unit30)}<small>/Packung</small></span>
              </button>
              <button
                type="button"
                className={"plan-card " + (plan === "60" ? "active" : "")}
                onClick={() => { setPlan("60"); onTap && onTap(); }}
                data-cur="btn"
                data-cur-label="Pick"
              >
                <span className="plan-radio"></span>
                <span className="plan-body">
                  <span className="plan-name">Abo · alle 60 Tage</span>
                  <span className="plan-sub">Für gelegentliche Tassen — gleicher Rabatt.</span>
                </span>
                <span className="plan-price">€{m(unit60)}<small>/Packung</small></span>
              </button>
            </div>
            {subActive && (
              <div className="plan-perks">
                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>Erste Lieferung mit hand­signiertem Brief von Esmee</span>
                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>Pause &amp; Kündigung jederzeit per Mail oder Login</span>
                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>Komplimentärer Versand auf jede Lieferung</span>
              </div>
            )}
          </div>

          {/* CRO T-11: Gift mode toggle */}
          <div className="gift-block">
            <button
              type="button"
              className={"gift-toggle " + (gift ? "on" : "")}
              onClick={() => { setGift(g => !g); onTap && onTap(); }}
              aria-pressed={gift}
            >
              <span className="gift-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="3" y="9" width="18" height="11" rx="1"/>
                  <path d="M3 13 H 21"/>
                  <path d="M12 9 V 20"/>
                  <path d="M12 9 C 9 4, 5 6, 8 9"/>
                  <path d="M12 9 C 15 4, 19 6, 16 9"/>
                </svg>
              </span>
              <span className="gift-text">
                <span className="gift-name">Als Geschenk verschicken</span>
                <span className="gift-sub">Handgeschriebene Karte · Geschenk-Verpackung · +€{GIFT_FEE}</span>
              </span>
              <span className="gift-switch" aria-hidden="true"><span className="knob"></span></span>
            </button>
            {gift && (
              <div className="gift-form">
                <label className="gift-field">
                  <span className="lbl">An (E-Mail oder Name)</span>
                  <input
                    type="text"
                    placeholder="z. B. Maya Rahimi"
                    value={giftTo}
                    onChange={e => setGiftTo(e.target.value)}
                    maxLength={60}
                  />
                </label>
                <label className="gift-field">
                  <span className="lbl">Botschaft <small>({160 - giftMsg.length})</small></span>
                  <textarea
                    placeholder="Eine kurze, ruhige Botschaft. Wir schreiben sie auf Bauwoll-Karton mit Wachssiegel."
                    value={giftMsg}
                    onChange={e => setGiftMsg(e.target.value.slice(0, 160))}
                    rows={2}
                  />
                </label>
                <div className="gift-meta">
                  <span>✓ Geschenk-Quittung statt Rechnung</span>
                  <span>✓ Versand an deine oder Empfänger-Adresse</span>
                </div>
              </div>
            )}
          </div>

          {!singleVariant && (
            <div className="option-block">
              <div className="option-label"><span>Edition</span><em>{variant.name}</em></div>
              <div className="variant-row">
                {variants.map(v => (
                  <button key={v.id} className={"v-chip " + (v.id === variant.id ? "active" : "")} data-cur="btn" data-cur-label="Pick" onClick={() => chooseVariant(v)}>
                    <span className="v-name">{v.name}</span>
                    <span className="v-sub">{v.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="option-block">
            <div className="option-label"><span>Menge — Bulk discount</span><em>{pack.label}</em></div>
            <div className="pack-grid">
              {PACKS.map(p => (
                <button
                  key={p.id}
                  className={"pack " + (p.id === pack.id ? "active" : "")}
                  data-cur="btn"
                  data-cur-label="Pick"
                  data-most-loved={p.mostLoved ? "1" : undefined}
                  onClick={(e) => choosePack(p, e)}
                >
                  {p.badge && (
                    <span className={"badge " + (p.badgeStyle === "copper" ? "copper" : "")}>{p.badge}</span>
                  )}
                  <span className="radio"></span>
                  <div>
                    <div className="pack-name">{p.label}</div>
                    <div className="pack-sub">{p.sub}</div>
                  </div>
                  <div>
                    <div className="pack-price">€{m(packUnit(p) * p.count)}</div>
                    <div className="pack-per">€{m(packUnit(p))} / Packung{p.save ? " · −" + p.save + "%" : ""}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="atc-row">
            <div className="qty">
              <button onClick={() => setQtyBump(Math.max(1, qty - 1))} aria-label="Decrease">—</button>
              <span className={"v " + (bump ? "bump" : "")}>{qty}</span>
              <button onClick={() => setQtyBump(qty + 1)} aria-label="Increase">+</button>
            </div>
            <button
              className="btn-add"
              data-cur="btn"
              data-cur-label="Add"
              onMouseMove={onMagnetMove}
              onClick={add}
            >
              <span>{subActive ? "Abo starten" : "In den Warenkorb"}</span>
              <span className="price-tag"><Counter to={total} duration={500} key={total} prefix="€" decimals={dec} /></span>
            </button>
          </div>

          {/* CRO T-05: Express-Pay row right below the ATC */}
          <div className="express-pay" aria-label="Schnellzahlung">
            <span className="ex-label">— oder direkt zahlen mit</span>
            <div className="ex-buttons">
              <button type="button" className="ex-btn ex-apple" onClick={add} aria-label="Apple Pay">
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor">
                  <path d="M17.05 12.94c-.03-2.66 2.18-3.94 2.27-4-1.24-1.81-3.17-2.06-3.85-2.09-1.64-.17-3.2.97-4.03.97-.85 0-2.12-.95-3.49-.92-1.79.03-3.44 1.04-4.36 2.65-1.86 3.23-.48 8.01 1.34 10.63.89 1.28 1.95 2.72 3.34 2.67 1.34-.06 1.84-.87 3.46-.87 1.6 0 2.07.87 3.49.84 1.44-.03 2.36-1.31 3.24-2.6 1.02-1.49 1.44-2.94 1.47-3.01-.03-.02-2.82-1.08-2.88-4.27zM14.5 5.27c.73-.88 1.22-2.11 1.08-3.33-1.05.04-2.32.7-3.07 1.58-.68.78-1.27 2.03-1.11 3.23 1.17.09 2.37-.59 3.1-1.48z"/>
                </svg>
                <span>Pay</span>
              </button>
              <button type="button" className="ex-btn ex-google" onClick={add} aria-label="Google Pay">
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path fill="#4285F4" d="M12 12v3.6h5.04c-.21 1.14-.84 2.1-1.8 2.76v2.28h2.91c1.71-1.58 2.7-3.9 2.7-6.66 0-.63-.06-1.23-.16-1.81L12 12z"/>
                  <path fill="#34A853" d="M12 22c2.43 0 4.47-.81 5.96-2.18l-2.91-2.28c-.81.55-1.84.87-3.05.87-2.34 0-4.32-1.58-5.03-3.71H3.97v2.34C5.45 19.91 8.5 22 12 22z"/>
                  <path fill="#FBBC05" d="M6.97 14.7c-.18-.55-.28-1.13-.28-1.7s.1-1.15.28-1.7V8.96H3.97A9.97 9.97 0 0 0 3 13c0 1.61.38 3.13 1.06 4.47l2.91-2.34z"/>
                  <path fill="#EA4335" d="M12 7.96c1.32 0 2.5.45 3.43 1.34l2.57-2.57C16.46 5.16 14.42 4.4 12 4.4 8.5 4.4 5.45 6.49 3.97 9.4l2.91 2.34c.71-2.13 2.69-3.78 5.12-3.78z"/>
                </svg>
                <span>Pay</span>
              </button>
              <button type="button" className="ex-btn ex-paypal" onClick={add} aria-label="PayPal">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path fill="#003087" d="M7.2 21l.5-3.4h3.1c3.8 0 6.7-1.8 7.4-5.9.3-1.6.1-2.9-.7-3.8-.9-.9-2.5-1.4-4.6-1.4H6.9c-.4 0-.7.3-.8.6L3.6 21h3.6z"/>
                  <path fill="#009CDE" d="M19.4 9.4c-.2 1.2-.6 2.3-1.3 3.1-1.2 1.6-3.3 2.4-6 2.4H9.7l-.7 4.5-.2 1.1c0 .2.1.4.3.4h3l.1-.5.5-3.2.1-.2c0-.2.2-.4.4-.4H14c2.4 0 4.3-1 4.8-3.8.2-1.1.1-2.1-.4-2.8-.2-.3-.6-.5-1-.6z"/>
                  <path fill="#012169" d="M18.5 9c-.1 0-.2-.1-.3-.1-.2 0-.3-.1-.5-.1-.5-.1-1.1-.1-1.7-.1h-4.4c-.1 0-.2 0-.3.1-.2.1-.4.3-.4.5l-.9 6.1-.1.2c0-.3.3-.5.6-.5h2.3c2.7 0 4.8-.8 6-2.4.7-.9 1.1-1.9 1.3-3.1 0-.4 0-.7-.1-.9 0-.1-.1-.2-.1-.3-.4.2-.7.3-1.1.3-.1.1-.2.2-.3.2z"/>
                </svg>
                <span>PayPal</span>
              </button>
              <button type="button" className="ex-btn ex-klarna" onClick={add} aria-label="Klarna">
                <svg viewBox="0 0 80 24" width="56" height="18" aria-hidden="true" fill="#0B051D">
                  <text x="0" y="18" fontFamily="system-ui, sans-serif" fontSize="20" fontWeight="700">Klarna.</text>
                </svg>
              </button>
            </div>
          </div>

          <div className="trust-row">
            <span className="t-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8 L 12 3 L 21 8 V 16 L 12 21 L 3 16 Z"/></svg>Komplimentärer Versand ab €60</span>
            <span className="t-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M9 12 L 11 14 L 15 10"/></svg>30 Tage Geld-zurück</span>
            <span className="t-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 11 H 20"/></svg>Sichere Bezahlung</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   RITUAL
   ============================================================ */
/* Ritual illustration SVGs */
function RitualIll({ step }) {
  if (step === 0) {
    // Measure — spoon being filled
    return (
      <svg viewBox="0 0 220 120" preserveAspectRatio="xMidYMid meet">
        {/* Pouch */}
        <path d="M30 84 Q 30 50, 60 50 L 80 50 Q 95 50, 95 64 L 95 100 Q 95 110, 85 110 L 40 110 Q 30 110, 30 100 Z" />
        <path d="M55 50 Q 60 38, 75 38 Q 88 38, 88 50" />
        {/* Spoon */}
        <ellipse cx="155" cy="78" rx="22" ry="14" />
        <line x1="172" y1="73" x2="208" y2="48" />
        {/* Fill animation */}
        <ellipse cx="155" cy="78" rx="20" ry="12" className="spoon-fill" />
        <text x="110" y="20" className="timer">7 g · one heaped spoon</text>
      </svg>
    );
  }
  if (step === 1) {
    // Pour — water arc with motion dash
    return (
      <svg viewBox="0 0 220 120" preserveAspectRatio="xMidYMid meet">
        {/* Carafe */}
        <path d="M40 40 L 40 70 Q 40 95, 60 95 L 80 95 Q 100 95, 100 70 L 100 40 Z" />
        <line x1="40" y1="48" x2="100" y2="48" />
        {/* Cup */}
        <path d="M140 70 L 200 70 L 195 110 Q 192 116, 185 116 L 155 116 Q 148 116, 145 110 Z" />
        <ellipse cx="170" cy="70" rx="30" ry="6" />
        {/* Stream — animated dashes */}
        <path d="M102 56 Q 122 60, 142 78" className="accent pour-stream" />
        <text x="80" y="20" className="timer">78° · pour slow</text>
      </svg>
    );
  }
  // Rest — cup with rising steam
  return (
    <svg viewBox="0 0 220 120" preserveAspectRatio="xMidYMid meet">
      <path d="M50 75 L 150 75 L 144 112 Q 142 118, 134 118 L 66 118 Q 58 118, 56 112 Z" />
      <ellipse cx="100" cy="75" rx="50" ry="8" />
      <path d="M150 80 Q 175 80, 175 92 Q 175 104, 150 104" />
      <path d="M84 60 Q 80 50, 88 38" className="accent steam" />
      <path d="M100 58 Q 95 46, 104 32" className="accent steam" style={{ animationDelay: "0.7s" }} />
      <path d="M116 60 Q 112 50, 120 38" className="accent steam" style={{ animationDelay: "1.3s" }} />
      <text x="74" y="20" className="timer">30 s · let it settle</text>
    </svg>
  );
}

function Ritual() {
  const wrapRef = useRef(null);
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  // Compute pinned horizontal progress
  useEffect(() => {
    const wrap = wrapRef.current, track = trackRef.current;
    if (!wrap || !track) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = wrap.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const total = wrap.offsetHeight - window.innerHeight;
      const p = Math.max(0, Math.min(1, (window.scrollY - top) / total));
      // 3 panels → translate left by (N-1)*100vw * p
      const N = RITUAL.length;
      track.style.transform = `translate3d(${(-p * (N - 1) * 100).toFixed(2)}vw, 0, 0)`;
      const idx = Math.min(N - 1, Math.round(p * (N - 1)));
      setActive(idx);
    };
    const onScroll = () => { if (raf) return; raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  const meta = [
    { left: "Pour", leftV: "7 g", right: "Volume", rightV: "150 ml" },
    { left: "Temp", leftV: "78°", right: "Pace", rightV: "Slow" },
    { left: "Rest", leftV: "30 s", right: "Cup",  rightV: "Small" },
  ];
  return (
    <section id="ritual" className="ritual horizontal">
      <div className="h-wrap" ref={wrapRef}>
        <div className="h-stage">
          <div className="h-track" ref={trackRef}>
            {RITUAL.map((r, i) => (
              <div className="h-panel" key={r.n}>
                <span className="big-num">{r.n}</span>
                <div className="h-text">
                  <span className="step-kicker">— Phase {String(i + 1).padStart(2, "0")} of 03</span>
                  <h3>{r.t}.</h3>
                  <p>{r.c}</p>
                  <div className="micro-meta">
                    <div>{meta[i].left}<em>{meta[i].leftV}</em></div>
                    <div>{meta[i].right}<em>{meta[i].rightV}</em></div>
                  </div>
                </div>
                <div className="h-vis">
                  <RitualIll step={i} />
                </div>
              </div>
            ))}
          </div>
          <div className="h-progress">
            {RITUAL.map((r, i) => (
              <React.Fragment key={i}>
                <span className={"tick " + (active === i ? "active" : "")}></span>
                <span className="step-name">{r.n} · {r.t}</span>
              </React.Fragment>
            )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, el], [])}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   TASTE PROFILE
   ============================================================ */
function TasteProfile() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add("in"); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // SVG radar geometry
  const cx = 200, cy = 200, R = 140;
  const N = TASTE.length;
  const angleFor = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
  const ptAt = (i, frac) => {
    const a = angleFor(i);
    return [cx + Math.cos(a) * R * frac, cy + Math.sin(a) * R * frac];
  };
  const dataPts = TASTE.map((t, i) => ptAt(i, t.val / 10));
  const dataPath = dataPts.map(p => p.join(",")).join(" ");
  // grid rings (4 levels)
  const rings = [0.25, 0.5, 0.75, 1.0].map(frac => {
    const pts = TASTE.map((_, i) => ptAt(i, frac).join(","));
    return pts.join(" ");
  });
  return (
    <section className="block taste">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow reveal">— Taste profile</span>
          <h2 className="reveal delay-1">
            <SplitText text="A flavor map," /> <em className="italic"><SplitText text="honestly drawn." delay={0.3} /></em>
          </h2>
          <p className="reveal delay-2">Six dimensions, scored by our atelier as we composed Edition № 01.</p>
        </div>
        <div className="taste-grid">
          <div className="reveal">
            <div className="frame aspect-1x1 parallax" data-cur="img" data-cur-label="View">
              <BlurImg src="/assets/scene-2.jpg" alt="A spoon of Manduraa, ingredients composed." />
            </div>
          </div>
          <div className="radar-wrap reveal delay-1" ref={ref}>
            <svg viewBox="0 0 400 400" role="img" aria-label="Taste profile radar chart">
              {/* grid */}
              {rings.map((r, i) => (
                <polygon key={i} className="grid-poly" points={r} />
              ))}
              {/* axes */}
              {TASTE.map((_, i) => {
                const [x, y] = ptAt(i, 1.0);
                return <line key={i} className="axis-line" x1={cx} y1={cy} x2={x} y2={y} />;
              })}
              {/* data polygon */}
              <polygon className="data-poly" points={dataPath} />
              {/* dots */}
              {dataPts.map(([x, y], i) => (
                <circle key={i} className="data-dot" cx={x} cy={y} />
              ))}
              {/* labels */}
              {TASTE.map((t, i) => {
                const [lx, ly] = ptAt(i, 1.18);
                const align = lx < cx - 5 ? "end" : lx > cx + 5 ? "start" : "middle";
                return (
                  <g key={t.name} className="axis-group">
                    <text className="axis-label" x={lx} y={ly} textAnchor={align} dominantBaseline="middle">
                      {t.name.toUpperCase()}
                    </text>
                    <text className="axis-val" x={lx} y={ly + 14} textAnchor={align} dominantBaseline="middle">
                      {t.val} / 10
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="radar-legend">
              <span><span className="swatch us" />Manduraa · Edition 01</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   TRUST BAND
   ============================================================ */
function TrustBand() {
  const items = [
    { t: "48-hour shipping", d: "From our Dubai atelier to GCC, EU & UK.",
      svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 13 V 7 H 14 V 17 H 3 Z"/><path d="M14 10 H 19 L 21 13 V 17 H 14 Z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg> },
    { t: "Secure payment", d: "Apple Pay, Klarna, Visa, AmEx, SEPA.",
      svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 11 H 21"/></svg> },
    { t: "30-day return", d: "Don't love it? Send it back, no questions.",
      svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 12 a 8 8 0 1 0 3-6"/><path d="M3 4 L 7 6 L 5 10"/></svg> },
    { t: "Concierge support", d: "Real humans, real fast. WhatsApp & email.",
      svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 19 L 5 8 a 3 3 0 0 1 3 -3 H 16 a 3 3 0 0 1 3 3 V 15 a 3 3 0 0 1 -3 3 H 9 Z"/></svg> },
  ];
  return (
    <section className="trust-band">
      <div className="trust-cols">
        {items.map((it, i) => (
          <div key={i} className={"trust-cell reveal delay-" + ((i % 4) + 1)}>
            <span className="icn">{it.svg}</span>
            <div>
              <h4>{it.t}</h4>
              <p>{it.d}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   FAQ (animated)
   ============================================================ */
function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="block faq">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow reveal">— FAQ</span>
          <h2 className="reveal delay-1"><SplitText text="Quiet answers." /></h2>
        </div>
        <div className="faq-list">
          {FAQS.map((f, i) => (
            <div key={i} className={"faq-item " + (open === i ? "open" : "")}>
              <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                {f.q}
                <span className="plus" />
              </button>
              <div className="faq-a"><div className="inner">{f.a}</div></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   GUARANTEE STRIP — signed first-cup promise (CRO T-13)
   ============================================================ */
function GuaranteeStrip() {
  return (
    <section className="guarantee" aria-label="Erste-Tasse-Versprechen">
      <div className="g-inner">
        <div className="g-seal" aria-hidden="true">
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            <defs>
              <path id="g-circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" fill="none" />
            </defs>
            <circle cx="50" cy="50" r="46" fill="none" stroke="#B07A52" strokeWidth="0.8" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="#B07A52" strokeWidth="0.4" strokeDasharray="1 3" />
            <text fill="#B07A52" fontFamily="Cormorant Garamond, serif" fontSize="6.5" letterSpacing="1.4">
              <textPath href="#g-circle" startOffset="0">ESMEE · MAISON N° 01 · DUBAI ·  ESMEE · MAISON N° 01 · DUBAI ·  </textPath>
            </text>
            <g transform="translate(50 50)">
              <text fill="#B07A52" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="13" textAnchor="middle" y="-2">First</text>
              <text fill="#B07A52" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="13" textAnchor="middle" y="13">cup</text>
              <line x1="-14" y1="20" x2="14" y2="20" stroke="#B07A52" strokeWidth="0.5" />
            </g>
          </svg>
        </div>
        <div className="g-body">
          <span className="eyebrow">— Das Erste-Tasse-Versprechen</span>
          <h3>
            Wenn dich der erste Schluck nicht <em className="italic">überrascht</em>,
            <br/>antworte mir auf diese Mail.
          </h3>
          <p>
            30 Tage. Kein Fragebogen, kein Versandlabel-Theater. Ich erstatte dich
            persönlich — bis zur Tasche, die du schon halb leer hast. Wer Tradition
            verkauft, darf bei der Rückgabe nicht kleinlich werden.
          </p>
          <div className="g-meta">
            <div className="g-sig">
              <span className="sig-script">Esmee</span>
              <span className="sig-line">— Esmee · Composer, Maison N° 01</span>
            </div>
            <ul className="g-points">
              <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>30 Tage volle Rückerstattung</li>
              <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>Persönliche Antwort von Esmee</li>
              <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>Versand in 48 h aus Dubai</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FINAL CTA
   ============================================================ */
function FinalCta({ onShop, onMagnetMove, price }) {
  return (
    <section className="final">
      <div className="inner">
        <span className="eyebrow reveal" style={{ color: "var(--copper-soft)" }}>— Begin the ritual</span>
        <h2 className="reveal delay-1">
          <SplitText text="Tradition, distilled." />
          <br/>
          <em className="italic"><SplitText text="Held in your cup." delay={0.3} /></em>
        </h2>
        <p className="reveal delay-2">
          One blend, six ingredients, zero refined sugar. Composed by hand in our
          Dubai atelier and shipped wherever you call quiet.
        </p>
        <div className="cta-row reveal delay-3">
          <button className="btn btn-primary" data-cur="btn" data-cur-label="Shop" onMouseMove={onMagnetMove} onClick={onShop}>Shop Manduraa · €{price || 28}</button>
          <a href="#story-intro" className="btn btn-ghost" data-cur="btn" data-cur-label="Read">Read the story</a>
        </div>
        <div className="final-subline reveal delay-3" aria-label="Risk reversal">
          <span>0 g refined sugar · 6 ingredients</span>
          <span className="sep"></span>
          <span>30-day first-cup promise</span>
          <span className="sep"></span>
          <span>Ships in 48 h · free over €60</span>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CART DRAWER
   ============================================================ */
const ADDONS = [
  {
    id: "spoon",
    name: "Hand-Löffel · Olivenholz",
    sub: "Hand-geschnitzt · Apulien · 14 cm",
    price: 18,
    icon: (
      <svg viewBox="0 0 36 36" width="32" height="32" fill="none" stroke="#B07A52" strokeWidth="1.4" strokeLinecap="round">
        <ellipse cx="11" cy="14" rx="7" ry="4.5"/>
        <line x1="16" y1="16" x2="32" y2="32"/>
      </svg>
    ),
  },
  {
    id: "card",
    name: "Hand­geschriebene Karte",
    sub: "Bauwoll-Karton · Wachssiegel · Esmee-Signatur",
    price: 6,
    icon: (
      <svg viewBox="0 0 36 36" width="32" height="32" fill="none" stroke="#B07A52" strokeWidth="1.4" strokeLinecap="round">
        <rect x="6" y="10" width="24" height="18" rx="1.5"/>
        <path d="M6 12 L 18 21 L 30 12"/>
      </svg>
    ),
  },
  {
    id: "cup",
    name: "Keramik-Becher · Edition № 01",
    sub: "Hand-glasiert · Dubai · Limitiert auf 200 Stück",
    price: 42,
    icon: (
      <svg viewBox="0 0 36 36" width="32" height="32" fill="none" stroke="#B07A52" strokeWidth="1.4" strokeLinecap="round">
        <path d="M9 13 H 24 V 25 Q 24 28, 21 28 H 12 Q 9 28, 9 25 Z"/>
        <path d="M24 16 Q 30 16, 30 21 Q 30 26, 24 26"/>
        <path d="M13 8 Q 12 11, 14 13"/>
        <path d="M17 8 Q 16 11, 18 13"/>
      </svg>
    ),
  },
];
// Icon for a live Shopify add-on, chosen by its product handle.
function addonIcon(id) {
  const h = String(id || "").toLowerCase();
  if (h.includes("kupfer") || h.includes("loffel") || h.includes("löffel") || h.includes("spoon")) {
    return (
      <svg viewBox="0 0 36 36" width="32" height="32" fill="none" stroke="#B07A52" strokeWidth="1.4" strokeLinecap="round">
        <ellipse cx="11" cy="14" rx="7" ry="4.5"/>
        <line x1="16" y1="16" x2="32" y2="32"/>
      </svg>
    );
  }
  if (h.includes("bundle") || h.includes("set")) {
    return (
      <svg viewBox="0 0 36 36" width="32" height="32" fill="none" stroke="#B07A52" strokeWidth="1.4" strokeLinecap="round">
        <rect x="7" y="14" width="22" height="14" rx="1.5"/>
        <path d="M7 18 H 29"/>
        <path d="M18 14 V 28"/>
        <path d="M18 14 C 14 8, 9 11, 13 14"/>
        <path d="M18 14 C 22 8, 27 11, 23 14"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 36 36" width="32" height="32" fill="none" stroke="#B07A52" strokeWidth="1.4" strokeLinecap="round">
      <rect x="6" y="10" width="24" height="18" rx="1.5"/>
      <path d="M6 12 L 18 21 L 30 12"/>
    </svg>
  );
}
function CartDrawer({ open, onClose, items, onQty, onRemove, onAddOne, onAddAddon, onCheckout, liveAddons }) {
  // Live Shopify add-ons (copper set, bundle) when connected; demo add-ons otherwise.
  const addonList = (liveAddons && liveAddons.length)
    ? liveAddons.map(a => ({ ...a, icon: addonIcon(a.id) }))
    : ADDONS;
  // Show 2 decimals once any line has a non-integer (live Shopify) price.
  const money = (n) => Number.isInteger(n) ? String(n) : (Math.round(n * 100) / 100).toFixed(2);
  const moneyDec = items.some(it => !Number.isInteger(it.unitPrice)) ? 2 : 0;
  const itemsSubtotal = items.reduce((s, it) => s + it.unitPrice * it.qty * it.packCount, 0);
  const giftFees = items.reduce((s, it) => s + (it.gift ? (it.giftFee || 0) : 0), 0);
  const subtotal = itemsSubtotal + giftFees;
  const FREE_AT = 60;        // free shipping unlocks here
  const SPOON_AT = 120;      // CRO T-16: free olive-wood spoon at this tier
  const remaining = Math.max(0, FREE_AT - subtotal);
  const remainingSpoon = Math.max(0, SPOON_AT - subtotal);
  const pct = Math.min(100, (subtotal / SPOON_AT) * 100);
  const free = subtotal >= FREE_AT;
  const spoonFree = subtotal >= SPOON_AT;
  const showNudge = items.length > 0 && !free && remaining <= 35 && remaining > 0;
  const hasItems = items.length > 0;
  const inCart = (id) => items.some(it => it.addonId === id);
  return (
    <>
      <div className={"cart-overlay " + (open ? "open" : "")} onClick={onClose} />
      <aside className={"cart-drawer " + (open ? "open" : "")} aria-hidden={!open}>
        <div className="head">
          <h3>Your bag</h3>
          <button className="close" data-cur="btn" data-cur-label="Close" onClick={onClose}>Close ✕</button>
        </div>
        <div className="items">
          {items.length === 0 && (
            <div className="cart-empty">
              <span className="serif">Your bag is quiet.</span>
              <p>Add a pouch of Manduraa to begin the ritual.</p>
              <a className="quiet-cta" data-cur="btn" data-cur-label="Shop" href="#shop" onClick={onClose}>Browse Manduraa</a>
            </div>
          )}
          {items.map((it, idx) => {
            if (it.kind === "addon") {
              return (
                <div className="cart-line addon-line" key={idx}>
                  <div className="addon-icon" aria-hidden="true">{it.icon}</div>
                  <div>
                    <div className="name">{it.name}</div>
                    <div className="vmeta">{it.sub}</div>
                  </div>
                  <div className="right">
                    <div className="price">€{money(it.unitPrice)}</div>
                    <button className="rm" onClick={() => onRemove(idx)}>Entfernen</button>
                  </div>
                </div>
              );
            }
            return (
            <div className="cart-line" key={idx}>
              <div className="thumb" style={{ backgroundImage: `url(${it.image})` }} />
              <div>
                <div className="name">Manduraa · {it.variantName}</div>
                <div className="vmeta">
                  {it.packLabel} · {it.packCount * it.qty} pouches
                  {it.subActive && <span className="abo-chip"> · Abo {it.plan === "60" ? "alle 60 Tage" : "alle 30 Tage"} · −15 %</span>}
                  {it.gift && <span className="gift-chip"> · Geschenk +€{it.giftFee || 6}</span>}
                </div>
                <div className="qty-mini">
                  <button onClick={() => onQty(idx, Math.max(1, it.qty - 1))}>—</button>
                  <span className="v">{it.qty}</span>
                  <button onClick={() => onQty(idx, it.qty + 1)}>+</button>
                </div>
              </div>
              <div className="right">
                <div className="price">€{money(it.unitPrice * it.qty * it.packCount)}</div>
                <button className="rm" onClick={() => onRemove(idx)}>Entfernen</button>
              </div>
            </div>
          );})}
        </div>
        <div className="foot-bar">
          {hasItems && (
            <div className="cart-addons">
              <div className="addon-label">— Vollende deine Bestellung</div>
              <div className="addon-row">
                {addonList.map(a => {
                  const added = inCart(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={"addon-card " + (added ? "added" : "")}
                      onClick={() => onAddAddon && onAddAddon(a)}
                    >
                      <span className="addon-icon">{a.icon}</span>
                      <span className="addon-text">
                        <span className="addon-name">{a.name}</span>
                        <span className="addon-sub">{a.sub}</span>
                      </span>
                      <span className="addon-cta">
                        {added
                          ? <span className="check">✓ Hinzugefügt</span>
                          : <span className="plus">+ €{money(a.price)}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {showNudge && (
            <div className="cart-nudge">
              <span className="ic">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5 V 19 M5 12 H 19"/></svg>
              </span>
              <div className="nudge-text">
                <div className="head">Add 1 more pouch &mdash; save €{Math.round(remaining)} in shipping.</div>
                <div className="sub">Just €{Math.round(remaining)} more for komplimentärer Versand.</div>
              </div>
              <button className="nudge-cta" data-cur="btn" data-cur-label="Add" onClick={onAddOne}>+ Add</button>
            </div>
          )}
          {items.length > 0 && (
            <div className={"ship-progress ship-2 " + (free ? "free-on " : "") + (spoonFree ? "spoon-on " : "")}>
              <div className="label">
                <span>
                  {spoonFree
                    ? "Du erhältst den Olivenholz-Löffel gratis"
                    : free
                      ? "Komplimentärer Versand freigeschaltet"
                      : "Komplimentärer Versand"}
                </span>
                <em>€{Math.round(subtotal)} / €{SPOON_AT}</em>
              </div>
              <div className="bar">
                <div className="fill" style={{ width: pct + "%" }} />
                <span className="tick" style={{ left: (FREE_AT / SPOON_AT * 100) + "%" }} aria-label="Versand frei">
                  <span className={"tick-dot " + (free ? "hit" : "")}></span>
                  <span className="tick-label">€{FREE_AT}<br/>Versand</span>
                </span>
                <span className="tick" style={{ left: "100%" }} aria-label="Löffel frei">
                  <span className={"tick-dot " + (spoonFree ? "hit" : "")}></span>
                  <span className="tick-label">€{SPOON_AT}<br/>Löffel</span>
                </span>
              </div>
              <div className="note">
                {spoonFree
                  ? "✓ Versand + Olivenholz-Löffel von Esmee — beides geht heute mit."
                  : free
                    ? <>Noch <strong>€{Math.round(remainingSpoon)}</strong> bis zum gratis Olivenholz-Löffel.</>
                    : <>Noch <strong>€{Math.round(remaining)}</strong> bis kostenloser Versand.</>}
              </div>
            </div>
          )}
          <div className="sub-row">
            <span className="l">Zwischensumme</span>
            <span className="r">€<Counter to={subtotal} duration={400} key={subtotal} decimals={moneyDec} /></span>
          </div>
          <div className="ship-note">Versand &amp; Steuern werden im Checkout berechnet</div>
          <button className="checkout" data-cur="btn" data-cur-label="Pay" disabled={items.length === 0} onClick={onCheckout}>Zum Checkout →</button>
        </div>
      </aside>
    </>
  );
}

/* ============================================================
   STICKY MINI BUY-BAR
   ============================================================ */
function MiniBar({ visible, variant, total, fromPrice, onShop, onMagnetMove }) {
  return (
    <div className={"mini-bar " + (visible ? "in" : "")}>
      <div className="mini-thumb" style={{ backgroundImage: `url(${variant.image})` }} />
      <div className="mini-meta">
        <div className="mini-name">Manduraa · {variant.name}</div>
        <div className="mini-sub">Edition № 01 · ab €{fromPrice} / Packung</div>
      </div>
      <button className="mini-cta" data-cur="btn" data-cur-label="Add" onMouseMove={onMagnetMove} onClick={onShop}>
        Jetzt kaufen
        <span className="p">€{total}</span>
      </button>
    </div>
  );
}

/* ============================================================
   SPRINT 2/3 — Unboxing, Philosophy, Timeline, Reviews v2, Recovery
   ============================================================ */

/* ---------- Unboxing — pinned 5-step ---------- */
const UNBOX_STEPS = [
  {
    kicker: "Step 01 — The arrival",
    title: "A weighted box,\nclosed with intent.",
    body: "Recycled kraft pulp, debossed in copper foil. Heavier than you expect. The first signal that this is not a delivery — it is a letter.",
    meta: [["Material", "Recycled kraft 350g"], ["Closure", "Copper foil emboss"], ["Carbon", "Offset · DHL GoGreen"]],
  },
  {
    kicker: "Step 02 — The first opening",
    title: "The lid lifts —\nslowly.",
    body: "A double-fold lid with a single magnetic clasp. It opens like a book, and like a book, you can keep it after the cup is gone.",
    meta: [["Closure", "Magnetic clasp"], ["Reuse", "A keepsake box"], ["Sound", "Soft · paper-rustle"]],
  },
  {
    kicker: "Step 03 — The inner letter",
    title: "Cream tissue,\nfolded by hand.",
    body: "A single sheet of acid-free cream paper, folded and stamped in copper with the maison mark. Underneath, a card from the composer.",
    meta: [["Paper", "Cotton-rag, acid-free"], ["Stamp", "Copper foil · hand-pressed"], ["Made by", "One pair of hands"]],
  },
  {
    kicker: "Step 04 — The reveal",
    title: "The pouch,\nin its bed.",
    body: "Laid in soft rose-tone wool. Hand-tied with a single cream linen ribbon. The pouch is heavier than the box suggested.",
    meta: [["Pouch", "250 g · resealable"], ["Bed", "Recycled wool, rose"], ["Tied by", "The composer · always"]],
  },
  {
    kicker: "Step 05 — The card",
    title: "And a note,\nfor you.",
    body: "Handwritten on a small cream card. Always signed, always different. Five seconds of someone you've never met thinking of you.",
    meta: [["Card", "Hand-written"], ["Signed", "— E"], ["Tone", "Warm"]],
  },
];

function Unboxing() {
  const wrapRef = useRef(null);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const wrap = wrapRef.current; if (!wrap) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = wrap.getBoundingClientRect();
      const top = r.top + window.scrollY;
      const total = wrap.offsetHeight - window.innerHeight;
      const p = Math.max(0, Math.min(1, (window.scrollY - top) / total));
      const N = UNBOX_STEPS.length;
      const idx = Math.min(N - 1, Math.floor(p * N - 0.001));
      setStep(Math.max(0, idx));
    };
    const onScroll = () => { if (raf) return; raf = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  const s = UNBOX_STEPS[step];
  // box rotation breathes slightly with step
  const rot = -18 + step * 4;

  return (
    <section className="unbox" data-step={step}>
      <div className="u-wrap" ref={wrapRef}>
        <div className="u-stage">
          <div className="u-text" key={step}>
            <span className="u-kicker">{s.kicker}</span>
            <h3 style={{ whiteSpace: "pre-line" }}><SplitText text={s.title} trigger="always" /></h3>
            <p>{s.body}</p>
            <div className="u-meta">
              {s.meta.map(([k, v], i) => (
                <div className="row" key={i}><span>{k}</span><em>{v}</em></div>
              ))}
            </div>
          </div>
          <div className="u-scene">
            <div className="box" style={{ "--box-rot": rot + "deg" }}>
              <div className="face body" />
              <div className="face lid"><span className="emboss">Esmee</span></div>
              <div className="paper">
                <span className="foil">Maison N° 01<small>— Esmee · Manduraa</small></span>
              </div>
              <div className="pouch" style={{ backgroundImage: "url(/assets/scene-6.jpg)" }} />
              <div className="card">
                Welcome to the maison.<br/>
                Your first cup is a quiet one.
                <small>— E</small>
              </div>
            </div>
          </div>
          <div className="u-progress">
            <span className="num">{String(step + 1).padStart(2, "0")}</span>
            {UNBOX_STEPS.map((_, i) => (
              <span key={i} className={"tick " + (i === step ? "active" : "")} />
            ))}
            <span className="num">{String(UNBOX_STEPS.length).padStart(2, "0")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Reviews v2 ---------- */
const REVIEWS_V2 = [
  { tag: "Most loved", q: "I've replaced my afternoon oat-milk latte completely. No crash, no sugar guilt, and the dates make it feel like dessert.", a: "Layla H.", c: "Curator · Dubai", s: 5, av: "/assets/scene-2.jpg" },
  { tag: "First-cup",  q: "The packaging alone is worth it — feels like opening a perfume. But the taste is what made me reorder. Quietly addictive.", a: "Maya R.", c: "Architect · London", s: 5, av: "/assets/scene-3.jpg" },
  { tag: "Long-term",  q: "Bought the 5-pack to share. Three of my friends signed up the same week. It's become our 4pm ritual.", a: "Sophie K.", c: "Writer · Paris", s: 5, av: "/assets/scene-4.jpg" },
  { tag: "Critical",   q: "Smaller than I expected for the price. But the cup itself — yes, three weeks in, I'm a believer.", a: "Ines D.", c: "Buyer · Madrid", s: 4, av: "/assets/scene-5.jpg" },
  { tag: "Most loved", q: "Subtle, elegant, never too sweet. The first hot drink that feels like a perfume.", a: "Yara N.", c: "Editor · Beirut", s: 5, av: "/assets/scene-6.jpg" },
];
const MOSAIC = [
  { img: "/assets/scene-2.jpg", badge: "08:00 — slow morning", cls: "big" },
  { img: "/assets/scene-3.jpg", badge: "14:00", cls: "tall" },
  { img: "/assets/scene-4.jpg", badge: "weekend", cls: "" },
  { img: "/assets/scene-5.jpg", badge: "20:00 nightcap", cls: "wide" },
  { img: "/assets/scene-6.jpg", badge: "first cup", cls: "" },
  { img: "/assets/scene-1.jpg", badge: "atelier", cls: "tall" },
];
function ReviewsV2() {
  const FILTERS = ["All", "Most loved", "First-cup", "Long-term", "Critical"];
  const [f, setF] = useState("All");
  const visible = REVIEWS_V2.filter(r => f === "All" || r.tag === f);
  const hero = visible[0] || REVIEWS_V2[0];

  const ringRef = useRef(null);
  useEffect(() => {
    const el = ringRef.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        const circ = el.querySelector("circle.pos");
        if (circ) {
          const C = 2 * Math.PI * 70;
          circ.setAttribute("stroke-dasharray", C);
          circ.setAttribute("stroke-dashoffset", C * (1 - 0.98));
        }
        el.querySelectorAll(".bar .fill").forEach((b) => {
          b.style.width = b.dataset.w + "%";
        });
        io.disconnect();
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="reviews" className="reviews-v2">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow reveal">— Edition № 01 · Neu</span>
          <h2 className="display reveal delay-1" style={{ fontSize: "clamp(40px, 5.6vw, 80px)", margin: "14px auto 0" }}>
            <SplitText text="Sei unter" /> <em className="italic"><SplitText text="den Ersten." delay={0.25} /></em>
          </h2>
        </div>

        <div className="hero-review reveal delay-1">
          <span className="open-q">"</span>
          <blockquote>Eine ruhige Zeremonie — mit Datteln gesüßt, nicht mit Zucker. Sechs Zutaten, von Hand komponiert in unserem Atelier in Dubai. Du gehörst zu den Ersten, die sie probieren.</blockquote>
          <div className="author-row">
            <div className="author-text">
              <strong>— Esmee</strong>
              <small>Composer · Maison N° 01</small>
            </div>
          </div>
        </div>

        <div className="section-head" style={{ marginTop: "clamp(60px, 9vh, 100px)" }}>
          <span className="eyebrow reveal">— Momente mit Manduraa</span>
        </div>
        <div className="cust-mosaic reveal delay-1" style={{ marginTop: 32 }}>
          {MOSAIC.map((c, i) => (
            <div key={i} className={"cell " + c.cls} data-cur="img" data-cur-label="View">
              <BlurImg src={c.img} alt="" />
              <span className="badge">{c.badge}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Recovery toast — abandoned cart with concrete recall (T-22) ---------- */
function RecoveryToast({ count, items, onOpen, onDismiss }) {
  const [show, setShow] = useState(false);
  const [abandonedMs, setAbandonedMs] = useState(0);
  useEffect(() => {
    if (count > 0) {
      // How long since they last touched the cart? (set by App on cart mutation)
      try {
        const ts = parseInt(localStorage.getItem("esmee.cart_ts") || "0", 10);
        if (ts) setAbandonedMs(Date.now() - ts);
      } catch (e) {}
      const t = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(t);
    }
  }, [count]);
  if (count <= 0) return null;
  const close = () => { setShow(false); setTimeout(onDismiss, 400); };
  const openBag = () => { setShow(false); setTimeout(() => { onOpen(); onDismiss(); }, 200); };

  // Friendly time-since label
  const hours = abandonedMs ? Math.round(abandonedMs / (1000 * 60 * 60)) : 0;
  const days = hours ? Math.floor(hours / 24) : 0;
  const timeLabel = !abandonedMs
    ? "" : days >= 1
      ? `Vor ${days} ${days === 1 ? "Tag" : "Tagen"}`
      : hours >= 1
        ? `Vor ${hours} ${hours === 1 ? "Stunde" : "Stunden"}`
        : "Gerade eben";

  // Build a short summary of what's waiting
  const real = (items || []).filter(it => it.kind !== "addon");
  const firstItem = real[0];
  const pouches = real.reduce((s, it) => s + (it.packCount || 1) * (it.qty || 1), 0);
  const isAbo = real.some(it => it.subActive);

  return (
    <div className={"toast " + (show ? "in" : "")}>
      {timeLabel && <div className="t-kicker">— {timeLabel}</div>}
      <h5>{isAbo ? "Dein Abo wartet auf dich." : "Deine Tasse wartet auf dich."}</h5>
      <p>
        {firstItem
          ? <>{pouches} {pouches === 1 ? "Beutel" : "Beutel"} Manduraa · {firstItem.variantName}{isAbo ? <> · Abo aktiv</> : null} — genau wie du sie gelassen hast.</>
          : <>{count} Beutel warten — genau wie du sie gelassen hast.</>}
      </p>
      <div className="actions">
        <button className="open-bag" data-cur="btn" data-cur-label="Open" onClick={openBag}>Bestellung fortsetzen →</button>
        <button className="dismiss" data-cur="btn" data-cur-label="Hide" onClick={close}>Später</button>
      </div>
    </div>
  );
}

/* ============================================================
   EMAIL GATE (T-21) — soft inline capture for first-cup discount
   ============================================================ */
function EmailGate({ onShop }) {
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [email, setEmail] = useState("");
  const [err, setErr] = useState(false);

  useEffect(() => {
    // Don't re-prompt if user already engaged or dismissed.
    try {
      const state = localStorage.getItem("esmee.firstcup");
      if (state === "captured" || state === "dismissed") return;
    } catch (e) {}

    let armed = false;
    let pauseTimer = 0;
    const idleMs = 4500;     // user has paused for this long
    const minScroll = 1.2;   // viewport heights — past hero
    const onScroll = () => {
      if (armed) return;
      if (window.scrollY < window.innerHeight * minScroll) return;
      clearTimeout(pauseTimer);
      pauseTimer = setTimeout(() => {
        armed = true;
        setShow(true);
        window.removeEventListener("scroll", onScroll);
      }, idleMs);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // Also arm via timeout fallback (3 minutes)
    const fallback = setTimeout(() => {
      if (!armed) { armed = true; setShow(true); window.removeEventListener("scroll", onScroll); }
    }, 180000);
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(pauseTimer);
      clearTimeout(fallback);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    setTimeout(() => setHidden(true), 400);
    try { localStorage.setItem("esmee.firstcup", "dismissed"); } catch (e) {}
  };
  const submit = (e) => {
    e.preventDefault();
    if (!email.includes("@") || email.length < 5) { setErr(true); return; }
    setErr(false);
    setDone(true);
    try { localStorage.setItem("esmee.firstcup", "captured"); } catch (e) {}
    try { localStorage.setItem("esmee.firstcup_email", email); } catch (e) {}
    // Keep visible briefly with "thanks" state, then auto-dismiss
    setTimeout(() => {
      setShow(false);
      setTimeout(() => setHidden(true), 400);
    }, 3500);
  };

  if (hidden) return null;
  return (
    <aside className={"email-gate " + (show ? "in " : "") + (done ? "done" : "")} aria-live="polite">
      <button type="button" className="eg-close" onClick={dismiss} aria-label="Schließen">✕</button>
      {!done ? (
        <>
          <span className="eg-kicker">— Erste Tasse</span>
          <h5>10 € auf deine erste Manduraa.</h5>
          <p>Trag deine Mail ein — wir schicken dir den Code und einen leisen Brief, kein Spam.</p>
          <form className="eg-form" onSubmit={submit} noValidate>
            <input
              type="email"
              placeholder="deine@mail.de"
              value={email}
              onChange={e => { setEmail(e.target.value); setErr(false); }}
              autoComplete="email"
              aria-invalid={err}
            />
            <button type="submit">Code holen →</button>
          </form>
          {err && <span className="eg-err">Bitte eine gültige E-Mail eintragen.</span>}
          <div className="eg-foot">
            <span>Einlösbar 30 Tage · Eine pro Kundin · Versand inklusive ab €60</span>
          </div>
        </>
      ) : (
        <div className="eg-thanks">
          <span className="eg-kicker">— Willkommen</span>
          <h5>Dein Code: <span className="code">FIRSTCUP10</span></h5>
          <p>Wir haben ihn dir auch per Mail geschickt. Einlösbar im Checkout, gültig 30 Tage.</p>
          <button className="eg-shop" onClick={() => { dismiss(); onShop && onShop(); }}>Manduraa entdecken →</button>
        </div>
      )}
    </aside>
  );
}

/* ---------- Spec sheet — As composed ---------- */
const SPEC = [
  { name: "Medjool Date",          color: "#7A4A2B", pct: 25, gram: "62 g" },
  { name: "Marcona Almond",        color: "#D9B988", pct: 19, gram: "48 g" },
  { name: "Single-origin Arabica", color: "#3E2719", pct: 13, gram: "32 g" },
  { name: "Antep Pistachio",       color: "#7A8C4F", pct: 10, gram: "26 g" },
  { name: "Cocoa Nib",             color: "#4E3322", pct:  7, gram: "18 g" },
  { name: "Green Cardamom",        color: "#A48A53", pct:  2, gram: "4 g"  },
  { name: "Sea salt · trace",      color: "#E2D2C2", pct:  0.3, gram: "<1 g" },
];
function SpecSheet() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        el.classList.add("in");
        el.querySelectorAll(".pct .fill").forEach((f) => {
          f.style.width = f.dataset.w + "%";
        });
        io.disconnect();
      }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section className="spec">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow reveal">— As composed</span>
          <h2 className="display reveal delay-1" style={{ fontSize: "clamp(40px, 5.6vw, 80px)", margin: "14px auto 0" }}>
            <SplitText text="The full recipe," /> <em className="italic"><SplitText text="written down." delay={0.3} /></em>
          </h2>
          <p className="reveal delay-2" style={{ margin: "22px auto 0", maxWidth: "52ch", fontSize: 15, lineHeight: 1.75, color: "var(--grain)" }}>
            We publish what most won't. The full composition by gram, every
            number per cup. Edition № 01 · Manduraa Original · 250 g pouch.
          </p>
        </div>

        <div className="grid">
          <div className="pouch-card reveal">
            <div className="top">
              <BlurImg src="/assets/scene-6.jpg" alt="The Manduraa pouch, hand-tied." />
              <span className="lock-tag">№ 01 · 250 g</span>
            </div>
            <div className="body">
              <h3>Manduraa <em className="italic">Original</em></h3>
              <p>Single-batch, single-season. Composed by hand in our Dubai atelier and tied with cream linen ribbon.</p>
              <div className="badges">
                <span className="badge">Vegan</span>
                <span className="badge">Gluten-free</span>
                <span className="badge">Single-farm</span>
                <span className="badge">Recyclable pouch</span>
                <span className="badge">No additives</span>
              </div>
            </div>
          </div>
          <div className="table-wrap reveal delay-1" ref={ref}>
            <h3>Composition · 250 g pouch</h3>
            <span className="sub">— Edition N° 01 · Batch 124</span>
            <div className="ing-table">
              {SPEC.map((s, i) => (
                <div className="ing-row" key={i}>
                  <span className="sw" style={{ background: s.color }} />
                  <span className="nm">{s.name}</span>
                  <span className="pct"><span className="fill" data-w={s.pct}></span></span>
                  <span className="gram">{s.gram}</span>
                </div>
              ))}
            </div>
            <div className="nutrition">
              <h4>Per cup · 7 g serving</h4>
              <div className="nut-grid">
                <div className="nut-cell"><span className="k">Energy</span><span className="v">28<small>kcal</small></span></div>
                <div className="nut-cell"><span className="k">Sugars</span><span className="v">2.6<small>g · from dates</small></span></div>
                <div className="nut-cell"><span className="k">Refined sugar</span><span className="v">0<small>g</small></span></div>
                <div className="nut-cell"><span className="k">Caffeine</span><span className="v">38<small>mg</small></span></div>
                <div className="nut-cell"><span className="k">Protein</span><span className="v">0.9<small>g</small></span></div>
                <div className="nut-cell"><span className="k">Fat</span><span className="v">1.4<small>g · good fats</small></span></div>
                <div className="nut-cell"><span className="k">Fibre</span><span className="v">0.8<small>g</small></span></div>
                <div className="nut-cell"><span className="k">Magnesium</span><span className="v">14<small>mg · 4% RI</small></span></div>
              </div>
              <div className="footer-row">
                <span><strong>Allergens:</strong> almonds, pistachios.</span>
                <span><strong>Best by:</strong> 06 / 2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Exit-intent toast ---------- */
function ExitIntent({ onShop }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem("esmee.exit")) { setDone(true); return; }
    const onMove = (e) => {
      // Cursor leaves toward top of window
      if (e.clientY <= 4 && !done) {
        setOpen(true);
        setDone(true);
        sessionStorage.setItem("esmee.exit", "1");
      }
    };
    document.addEventListener("mouseout", onMove);
    return () => document.removeEventListener("mouseout", onMove);
  }, [done]);
  if (done && !open) return null;
  const close = () => setOpen(false);
  const goShop = () => { setOpen(false); onShop && onShop(); };
  return (
    <div className={"exit-toast " + (open ? "in" : "")}>
      <span className="kicker">— Before you go</span>
      <h5>10 €. On your first pouch.</h5>
      <p>A small invitation. Use the code at checkout — valid for the next 30 days, no expiry games.</p>
      <span className="code">FIRSTCUP10</span>
      <div className="actions">
        <button className="shop" data-cur="btn" data-cur-label="Shop" onClick={goShop}>Shop now →</button>
        <button className="dismiss" data-cur="btn" data-cur-label="Hide" onClick={close}>Maybe later</button>
      </div>
    </div>
  );
}

/* ---------- Tab title attention pulse ---------- */
function useTabAttention() {
  useEffect(() => {
    const original = document.title;
    const tease = "↩ Manduraa is still waiting · Esmee";
    let int = 0;
    const onVis = () => {
      if (document.hidden) {
        let flip = false;
        int = setInterval(() => {
          document.title = (flip = !flip) ? tease : original;
        }, 1800);
      } else {
        if (int) clearInterval(int);
        int = 0;
        document.title = original;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); if (int) clearInterval(int); document.title = original; };
  }, []);
}

/* ---------- Sugar Tracker ---------- */
function SugarTracker() {
  const [drinks, setDrinks] = useState(8);   // drinks per week
  const sugarPerDrink = 11;                  // grams
  const pricePerDrink = 4.2;                  // €
  const weeks = 52;
  const yearlyG = drinks * sugarPerDrink * weeks;
  const yearlyKg = (yearlyG / 1000).toFixed(1);
  const yearlyEur = Math.round(drinks * pricePerDrink * weeks);
  const manduraaCost = Math.round(drinks * 1.2 * weeks); // ~€1.20 per Manduraa cup
  const saving = yearlyEur - manduraaCost;
  const themHeight = Math.max(3, Math.round(yearlyKg * 2));        // visual stack units
  const usHeight = 0;
  return (
    <section className="block tracker">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow reveal">— Compare yourself</span>
          <h2 className="reveal delay-1">
            <SplitText text="How much sugar" /> <em className="italic"><SplitText text="does your year" delay={0.3} /></em> <SplitText text="hold?" delay={0.55} />
          </h2>
          <p className="reveal delay-2">
            Move the slider. We'll quietly show you the year of refined
            sugar — and the year without it.
          </p>
        </div>
        <div className="grid">
          <div className="panel reveal">
            <h3>Your week, honestly</h3>
            <div className="label">
              <span>Coffee · latte · energy drinks per week</span>
              <em>{drinks}</em>
            </div>
            <div className="slider-row">
              <input
                type="range" min="0" max="25" step="1" value={drinks}
                onChange={(e) => setDrinks(+e.target.value)}
              />
              <div className="scale">
                <span>0</span><span>5</span><span>10</span><span>15</span><span>20</span><span>25+</span>
              </div>
            </div>
            <div className="results">
              <div className="res-card them">
                <span className="tag">— Your year now</span>
                <span className="val"><Counter to={yearlyKg} duration={500} decimals={1} key={drinks} /><small>kg sugar</small></span>
                <span className="sub">Across {drinks * 52} drinks · ≈ €<Counter to={yearlyEur} duration={500} key={"eur" + drinks} /> spent</span>
              </div>
              <div className="res-card us">
                <span className="tag">— Your year with Manduraa</span>
                <span className="val"><Counter to={0} duration={500} /><small>g sugar</small></span>
                <span className="sub">You'd save €<Counter to={saving > 0 ? saving : 0} duration={500} key={"save" + drinks} /> a year</span>
              </div>
            </div>
          </div>
          <div className="stack reveal delay-1">
            <div className="col them">
              <div className="label-top">Your year now<em>{yearlyKg} kg</em></div>
              {Array.from({ length: themHeight }).map((_, i) => (
                <span key={i} className="unit" style={{ animationDelay: (i * 0.02) + "s" }} />
              ))}
            </div>
            <div className="col us">
              <div className="label-top">With Manduraa<em>0 g</em></div>
              {Array.from({ length: usHeight }).map((_, i) => (
                <span key={i} className="unit" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer v2 ---------- */
function FooterV2() {
  const [now, setNow] = useState(() => new Date());
  const [city, setCity] = useState(0);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const wrapRef = useRef(null);
  // City carousel
  useEffect(() => {
    const id = setInterval(() => setCity(c => (c + 1) % 3), 3200);
    return () => clearInterval(id);
  }, []);
  // Clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  // Outline-fill on scroll
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const sigWrap = el.querySelector(".signature-wrap");
        const outline = el.querySelector(".outline");
        if (!sigWrap || !outline) return;
        const r = sigWrap.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height * 0.4)));
        outline.style.setProperty("--fill-pct", (p * 100) + "%");
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);
  const dubai = new Date(now.getTime() + (4 * 60 * 60 * 1000) - (now.getTimezoneOffset() * 60 * 1000));
  const hh = String(dubai.getUTCHours()).padStart(2, "0");
  const mm = String(dubai.getUTCMinutes()).padStart(2, "0");
  const onShift = +hh >= 8 && +hh < 18;
  const cities = ["Dubai", "Beirut", "Antakya"];
  const submit = (e) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSent(true);
  };
  return (
    <footer className="foot-v2" ref={wrapRef}>
      <div className="inner">
        <div className="clock-row">
          <span className="green">
            <span className="pulse"></span>
            {onShift ? "Atelier on shift" : "Atelier sleeps · back at 09:00 GST"}
            <span className="clock">{hh}:{mm} GST</span>
          </span>
          <span>Composed in <span className="city" key={city}>{cities[city]}</span></span>
        </div>

        <div className="signature-wrap">
          <span className="outline">Esmee</span>
          <span className="tag">— Maison N° 01 · founded 2024</span>
        </div>

        <div className="nl-card">
          <div className="nl-text">
            <span className="nl-kicker">— Maison correspondence</span>
            <h3>Letters from the atelier.</h3>
            <p>A short, slow note once a season. Composition diaries, single-farm stories, and quiet invitations to events in Dubai, London and Paris.</p>
          </div>
          {!sent ? (
            <form className="nl-form" onSubmit={submit}>
              <div className="row">
                <input type="email" placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)} data-cur="text" />
                <button data-cur="btn" data-cur-label="Send" type="submit"><span>Subscribe</span><span aria-hidden="true">→</span></button>
              </div>
              <span className="micro">No spam, ever. Unsubscribe in one click.</span>
            </form>
          ) : (
            <div>
              <p className="nl-thanks">Thank you. A first letter is on its way.</p>
              <span className="micro">You're among the first to follow the maison.</span>
            </div>
          )}
        </div>

        <div className="links-grid">
          <div>
            <h4>Product</h4>
            <ul>
              <li><a href="#shop">Manduraa Original<span className="arr">↗</span></a></li>
              <li><a href="#shop">Rose Cardamom<span className="arr">↗</span></a></li>
              <li><a href="#shop">Caffeine-free<span className="arr">↗</span></a></li>
              <li><a href="#shop">Bulk packs<span className="arr">↗</span></a></li>
            </ul>
          </div>
          <div>
            <h4>Maison</h4>
            <ul>
              <li><a href="#composer">The composer<span className="arr">↗</span></a></li>
              <li><a href="#story-intro">Our story<span className="arr">↗</span></a></li>
              <li><a href="#universe">Ingredients<span className="arr">↗</span></a></li>
              <li><a href="#moments">Where it lives<span className="arr">↗</span></a></li>
            </ul>
          </div>
          <div>
            <h4>Care</h4>
            <ul>
              <li><a href="#faq">FAQ<span className="arr">↗</span></a></li>
              <li><a href="#">Shipping & returns<span className="arr">↗</span></a></li>
              <li><a href="#">Contact concierge<span className="arr">↗</span></a></li>
              <li><a href="#">Wholesale<span className="arr">↗</span></a></li>
            </ul>
          </div>
          <div>
            <h4>Follow</h4>
            <ul>
              <li><a href="#">Instagram<span className="arr">↗</span></a></li>
              <li><a href="#">TikTok<span className="arr">↗</span></a></li>
              <li><a href="#">Pinterest<span className="arr">↗</span></a></li>
              <li><a href="#">Spotify · atelier playlist<span className="arr">↗</span></a></li>
            </ul>
          </div>
        </div>

        <div className="bottom">
          <span>© 2026 — Composed slowly · Dubai · Beirut · Antakya</span>
          <span className="pay">
            We accept
            <span>Apple Pay</span>
            <span>Klarna</span>
            <span>Visa</span>
            <span>AmEx</span>
            <span>SEPA</span>
          </span>
          <span>Privacy · Terms · Imprint</span>
        </div>
      </div>
    </footer>
  );
}
function App() {
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem("esmee.cart");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [variant] = useState(VARIANTS[0]);
  const [showApp, setShowApp] = useState(false);
  const [recovery, setRecovery] = useState(0);

  // Live Shopify catalog drives the storefront (real product, price, add-ons).
  // Falls back to the bundled demo data only if the store is unreachable.
  const [liveVariants, setLiveVariants] = useState(null);
  const [liveAddons, setLiveAddons] = useState(null);
  const [sellingPlans, setSellingPlans] = useState(null);
  useEffect(() => {
    let alive = true;
    fetchVariants().then(v => { if (alive && v && v.length) setLiveVariants(v); }).catch(() => {});
    fetchAddons().then(a => { if (alive && a && a.length) setLiveAddons(a); }).catch(() => {});
    fetchSellingPlans().then(p => { if (alive && p && p.length) setSellingPlans(p); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const liveV0 = liveVariants && liveVariants[0];
  const liveBase = liveV0 && typeof liveV0.price === "number" ? liveV0.price : null;
  const miniVariant = liveV0 || variant;
  const miniFrom = liveBase != null ? (Math.round(liveBase * 0.69 * 100) / 100).toFixed(2) : 22;
  const miniTotal = liveBase != null ? liveBase.toFixed(2) : 28 * 3;
  const singlePrice = liveBase != null ? liveBase.toFixed(2) : 28;

  // Persist cart (+ timestamp for abandon-recovery T-22)
  const cartTouched = useRef(false);
  useEffect(() => {
    try {
      localStorage.setItem("esmee.cart", JSON.stringify(cart));
      if (cartTouched.current) {
        if (cart.length > 0) {
          localStorage.setItem("esmee.cart_ts", String(Date.now()));
        } else {
          localStorage.removeItem("esmee.cart_ts");
        }
      }
      cartTouched.current = true;
    } catch (e) {}
  }, [cart]);

  // Recovery toast — show once per session if cart was already populated on mount
  useEffect(() => {
    const seen = sessionStorage.getItem("esmee.recovery");
    if (!seen && cart.length > 0) {
      const total = cart.reduce((s, it) => s + (it.qty || 1) * (it.packCount || 1), 0);
      setRecovery(total);
      sessionStorage.setItem("esmee.recovery", "1");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollY = useScrollY();
  useReveal();
  useParallax();
  useSmoothScroll();
  useTabAttention();
  const audio = useAudio();

  // Floating header behavior
  const scrolled = scrollY > 80;

  // mini buy-bar
  const [miniVisible, setMiniVisible] = useState(false);
  useEffect(() => {
    // CRO: surface the sticky ATC as soon as the user is past the hero.
    const shop = document.getElementById("shop");
    const vh = window.innerHeight || 800;
    let show = scrollY > vh * 0.9;
    if (shop) {
      const r = shop.getBoundingClientRect();
      const sTop = r.top + window.scrollY;
      const sBot = sTop + r.height;
      // Hide while Shop block itself is on screen (its own ATC is right there).
      const inShop = scrollY + vh > sTop + 80 && scrollY < sBot - 120;
      if (inShop) show = false;
    }
    setMiniVisible(show);
  }, [scrollY]);

  const addToCart = useCallback((item) => {
    setCart(prev => {
      const i = prev.findIndex(p => p.variant === item.variant && p.packId === item.packId && p.plan === item.plan);
      if (i !== -1) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + item.qty };
        return next;
      }
      return [...prev, item];
    });
    setCartOpen(true);
    audio.playBell();
  }, [audio]);
  const setQty = (idx, q) => setCart(prev => prev.map((it, i) => i === idx ? { ...it, qty: q } : it));
  const remove = (idx) => setCart(prev => prev.filter((_, i) => i !== idx));
  const addAddon = useCallback((a) => {
    setCart(prev => {
      const i = prev.findIndex(p => p.addonId === a.id);
      if (i !== -1) return prev.filter((_, j) => j !== i); // toggle off
      return [...prev, {
        kind: "addon",
        addonId: a.id,
        name: a.name,
        sub: a.sub,
        icon: a.icon,
        unitPrice: a.price,
        merchandiseId: a.merchandiseId,
        qty: 1,
        packCount: 1,
        packLabel: a.name,
        variant: "addon-" + a.id,
        variantName: a.name,
        packId: "addon-" + a.id,
        image: "",
      }];
    });
  }, []);
  const cartCount = cart.reduce((s, it) => s + it.qty * it.packCount, 0);

  // Smart nudge: bump qty of first cart item by 1
  const nudgeAdd = useCallback(() => {
    setCart(prev => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      next[0] = { ...next[0], qty: next[0].qty + 1 };
      return next;
    });
    audio.playTap();
  }, [audio]);

  const onMagnetMove = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 100) + "%");
    el.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 100) + "%");
  };

  const scrollToShop = () => {
    const el = document.getElementById("shop");
    if (el) window.scrollTo({ top: el.offsetTop - 90, behavior: "smooth" });
  };

  // Real Shopify checkout. Hands off to Shopify's hosted checkout when a store
  // is connected and the bag carries live variant ids; otherwise explains demo
  // mode. Keeps the bundled demo fully functional with no store configured.
  const handleCheckout = useCallback(async () => {
    try {
      if (!isShopifyConfigured()) {
        window.alert(
          "Demo-Modus: Verbinde einen Shopify-Store (siehe README / .env.example), um zur echten Kasse zu gehen."
        );
        return;
      }
      const lines = cart
        .filter(it => it.merchandiseId)
        .map(it => {
          const line = { merchandiseId: it.merchandiseId, quantity: it.qty * (it.packCount || 1) };
          if (it.sellingPlanId) line.sellingPlanId = it.sellingPlanId;
          return line;
        });
      if (lines.length === 0) {
        window.alert("Keine Shopify-Artikel im Warenkorb.");
        return;
      }
      // Auto-apply the discount code matching the chosen pack tier (+ subscription).
      // Codes are created by scripts/setup-shopify-discounts.mjs; unknown codes are
      // safely ignored by Shopify (cart still checks out at full price).
      const codes = discountCodesForCart(cart);
      const url = await createCheckout(lines, codes);
      window.location.href = url;
    } catch (e) {
      window.alert("Checkout fehlgeschlagen: " + ((e && e.message) || e));
    }
  }, [cart]);

  return (
    <div id="top">
      <Preloader onDone={() => setShowApp(true)} />
      <div className="grain" aria-hidden="true" />
      <Nav cartCount={cartCount} onCart={() => { setCartOpen(true); audio.playTap(); }} scrolled={scrolled} />
      <div className={"app-fade " + (showApp ? "in" : "")}>
        <ScrollStory heroFrom={miniFrom} />
        <ReviewsRibbon />
        <StoryIntro />
        <IngredientUniverse />
        <Vs />
        <SugarTracker />
        <Benefits />
        <Shop onAdd={addToCart} onMagnetMove={onMagnetMove} onTap={audio.playTap} liveVariants={liveVariants} sellingPlans={sellingPlans} />
        <Unboxing />
        <SpecSheet />
        <Ritual />
        <TasteProfile />
        <ReviewsV2 />
        <TrustBand />
        <Faq />
        <GuaranteeStrip />
        <FinalCta onShop={scrollToShop} onMagnetMove={onMagnetMove} price={singlePrice} />
        <FooterV2 />
      </div>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={cart} onQty={setQty} onRemove={remove} onAddOne={nudgeAdd} onAddAddon={addAddon} onCheckout={handleCheckout} liveAddons={liveAddons} />
      <MiniBar visible={miniVisible && !cartOpen} variant={miniVariant} total={miniTotal} fromPrice={miniFrom} onShop={scrollToShop} onMagnetMove={onMagnetMove} />
      <RecoveryToast count={recovery} items={cart} onOpen={() => setCartOpen(true)} onDismiss={() => setRecovery(0)} />
      <EmailGate onShop={scrollToShop} />
      <ExitIntent onShop={scrollToShop} />
    </div>
  );
}

export default App;
