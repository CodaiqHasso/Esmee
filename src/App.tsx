// @ts-nocheck
/* Esmee — Manduraa luxury storefront landing page.
   Faithfully ported from the Claude Design HTML/JS prototype to React + TS + Vite.
   Type-checking is disabled on this file because it is a 1:1 port of an
   imperative, DOM-driven prototype; runtime behaviour is the source of truth. */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { isShopifyConfigured, createCheckout, fetchVariants, fetchAddons, fetchSellingPlans } from "./lib/shopify";
import { tr, useLang, LANGS, LANG_LABEL } from "./i18n";

/* Language toggler — DE / EN / TR. German is the default. */
function LangToggle({ compact }) {
  const { lang, setLang } = useLang();
  return (
    <div className={"lang-toggle " + (compact ? "compact" : "")} role="group" aria-label="Sprache / Language">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          className={"lang-opt " + (lang === l ? "active" : "")}
          aria-pressed={lang === l}
          data-cur="btn"
          data-cur-label={LANG_LABEL[l]}
          onClick={() => setLang(l)}
        >
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}

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
function getPacks() {
  return [
  { id: "1",  count: 1,  unit: 32, save: 0,  label: tr("1 Packung","1 pack","1 paket"),     sub: tr("250 g · ≈ 16 Tassen","250 g · ≈ 16 cups","250 g · ≈ 16 fincan"),          badge: null },
  { id: "3",  count: 3,  unit: 28, save: 12, label: tr("3 Packungen","3 packs","3 paket"),   sub: tr("750 g · ≈ 48 Tassen","750 g · ≈ 48 cups","750 g · ≈ 48 fincan"),          badge: tr("Am beliebtesten","Most Loved","En sevilen"),        badgeStyle: "copper", mostLoved: true },
  { id: "5",  count: 5,  unit: 25, save: 22, label: tr("5 Packungen","5 packs","5 paket"),   sub: tr("1,25 kg · ≈ 80 Tassen","1.25 kg · ≈ 80 cups","1,25 kg · ≈ 80 fincan"),        badge: tr("Bester Wert","Best value","En iyi değer"),       badgeStyle: "dark" },
  { id: "10", count: 10, unit: 22, save: 31, label: tr("10+ Packungen","10+ packs","10+ paket"), sub: tr("2,5 kg · ≈ 160 Tassen","2.5 kg · ≈ 160 cups","2,5 kg · ≈ 160 fincan"),        badge: tr("Maximale Ersparnis","Max savings","Maks. tasarruf"), badgeStyle: "copper" },
  ];
}

function getIngredients() {
  return [
  { name: tr("Medjool-Dattel","Medjool Date","Medjool Hurması"), note: tr("Natürliche Süße","Natural sweetness","Doğal tatlılık"), color: "#7A4A2B", angle: 18, r: 46,
    origin: tr("Jordantal · Jordanien","Jordan Valley · Jordan","Ürdün Vadisi · Ürdün"), season: tr("Herbst '25","Autumn '25","Sonbahar '25"), grams: tr("62 g / 250-g-Beutel","62 g / 250 g pouch","62 g / 250 g paket"), img: "/assets/scene-6.jpg",
    lede: tr("Die einzige Süße in der Tasse.","The only sweetness in the cup.","Fincandaki tek tatlılık."),
    body: tr("Sonnengetrocknet auf einer einzigen Farm im Jordantal von der Familie Al-Saadi. Wir verwenden die weiche Medjool-Sorte — von Hand zu einer Paste gepresst, die sich ohne jede Körnigkeit in der Mischung auflöst.","Sun-cured on a single farm in the Jordan Valley by the Al-Saadi family. We use the soft-grade Medjool — pressed by hand into a paste that dissolves into the blend without a trace of graininess.","Ürdün Vadisi'nde Al-Saadi ailesi tarafından tek bir çiftlikte güneşte kurutulur. Yumuşak Medjool çeşidini kullanırız — elle ezilerek, harmana hiç tanecik bırakmadan eriyen bir macun hâline getirilir.")
  },
  { name: tr("Marcona-Mandel","Marcona Almond","Marcona Bademi"), note: tr("Cremig & nussig","Creamy & nutty","Kremsi ve fındıksı"), color: "#D9B988", angle: 80, r: 48,
    origin: tr("Alicante · Spanien","Alicante · Spain","Alicante · İspanya"), season: tr("Sommer '25","Summer '25","Yaz '25"), grams: tr("48 g / 250-g-Beutel","48 g / 250 g pouch","48 g / 250 g paket"), img: "/assets/scene-5.jpg",
    lede: tr("Macht die Tasse cremig.","Makes the cup creamy.","Fincanı kremsi yapar."),
    body: tr("Kalt vermahlen, bis das Öl freigesetzt wird. Marcona gibt der Tasse ihr Mundgefühl — den runden, milchigen Körper, der dich auf Milch ganz verzichten lässt.","Cold-stone milled until the oil releases. Marcona gives the cup its mouthfeel — the round, milky body that lets you skip the dairy entirely.","Yağı açığa çıkana dek soğuk taşla öğütülür. Marcona, fincana ağız dolusu hissini verir — sütü tamamen atlamanı sağlayan yuvarlak, sütlü gövde.")
  },
  { name: tr("Antep-Pistazie","Antep Pistachio","Antep Fıstığı"), note: tr("Nussig & salzig","Nutty & salty","Fındıksı ve tuzlu"), color: "#7A8C4F", angle: 142, r: 45,
    origin: tr("Gaziantep · Türkei","Gaziantep · Türkiye","Gaziantep · Türkiye"), season: tr("Spätsommer '25","Late summer '25","Yaz sonu '25"), grams: tr("26 g / 250-g-Beutel","26 g / 250 g pouch","26 g / 250 g paket"), img: "/assets/scene-3.jpg",
    lede: tr("Nussig, leicht salzig.","Nutty, lightly salty.","Fındıksı, hafif tuzlu."),
    body: tr("Aus den Antep-Hainen außerhalb von Gaziantep. Von Hand geschält, kalt geröstet, gerade so weit gemahlen, dass ihre Salzigkeit erhalten bleibt. Die Salzkante, die die Datteln wie Dessert schmecken lässt.","From the Antep groves outside Gaziantep. Hand-shelled, cold-roasted, milled just enough to keep their salinity intact. The salt-edge that makes the dates taste like dessert.","Gaziantep dışındaki Antep bahçelerinden. Elle ayıklanır, soğuk kavrulur, tuzluluğunu koruyacak kadar öğütülür. Hurmaları tatlı gibi tatlandıran o tuz dokunuşu.")
  },
  { name: tr("Single-Origin-Arabica","Single-origin Arabica","Tek Kaynak Arabica"), note: tr("Sanfter Koffein-Kick","Gentle caffeine lift","Hafif kafein"), color: "#3E2719", angle: 210, r: 47,
    origin: tr("Haraz · Jemen","Haraz · Yemen","Haraz · Yemen"), season: tr("Frühling '25","Spring '25","İlkbahar '25"), grams: tr("32 g / 250-g-Beutel","32 g / 250 g pouch","32 g / 250 g paket"), img: "/assets/scene-1.jpg",
    lede: tr("Nur ein Hauch Kaffee.","Just a hint of coffee.","Yalnızca bir tutam kahve."),
    body: tr("Von den Haraz-Bergfarmen, gewaschen und in der Höhe langsam getrocknet. Wir verwenden weniger als 15 % der Mischung an Kaffee — genug Schwung, um ihn zu spüren, nicht genug, um abzustürzen.","From the Haraz mountain farms, washed and slow-dried at altitude. We pull less than 15% of the blend in coffee — enough lift to notice, not enough to crash.","Haraz dağ çiftliklerinden, yıkanmış ve yükseklerde yavaşça kurutulmuş. Harmanın %15'inden azını kahve olarak alırız — fark edilecek kadar canlılık, çökertmeyecek kadar az.")
  },
  { name: tr("Grüner Kardamom","Green Cardamom","Yeşil Kakule"), note: tr("Aromatische Wärme","Aromatic warmth","Aromatik sıcaklık"), color: "#A48A53", angle: 272, r: 44,
    origin: tr("Kerala · Indien","Kerala · India","Kerala · Hindistan"), season: tr("Ganzjährig","Year-round","Yıl boyu"), grams: tr("4 g / 250-g-Beutel","4 g / 250 g pouch","4 g / 250 g paket"), img: "/assets/scene-2.jpg",
    lede: tr("Warm und aromatisch.","Warm and aromatic.","Sıcak ve aromatik."),
    body: tr("Ganze Kapseln, am Morgen des Mischens zerstoßen. Nur vier Gramm pro Beutel — präsent genug, um die Dattel zu heben, leise genug, um nie zu überwältigen.","Whole pods crushed the morning of blending. Just four grams per pouch — present enough to lift the date, quiet enough never to overwhelm.","Bütün kapsüller, harmanlama sabahı dövülür. Paket başına yalnızca dört gram — hurmayı yükseltecek kadar var, asla bastırmayacak kadar sessiz.")
  },
  { name: tr("Kakaonib","Cocoa Nib","Kakao Nibi"), note: tr("Bitterer Kontrast","Bitter contrast","Acı kontrast"), color: "#4E3322", angle: 330, r: 46,
    origin: tr("Tabasco · Mexiko","Tabasco · Mexico","Tabasco · Meksika"), season: tr("Winter '25","Winter '25","Kış '25"), grams: tr("18 g / 250-g-Beutel","18 g / 250 g pouch","18 g / 250 g paket"), img: "/assets/scene-4.jpg",
    lede: tr("Ein bitterer Schoko-Ton.","A bitter chocolate note.","Acı bir çikolata notası."),
    body: tr("Kakaonibs aus einer einzigen Kooperative in Tabasco, leicht geröstet, um die Schokolade ohne Süße hervorzubringen. Die bittere Linie, die die Tasse zusammenhält.","Cocoa nibs from a single co-op in Tabasco, lightly toasted to draw out the chocolate without sweetness. The bitter line that holds the cup together.","Tabasco'da tek bir kooperatiften kakao nibleri, çikolatayı tatlılık olmadan ortaya çıkarmak için hafifçe kavrulur. Fincanı bir arada tutan acı çizgi.")
  },
  ];
}

function getBenefits() {
  return [
  { t: tr("Null raffinierter Zucker","Zero refined sugar","Sıfır rafine şeker"),   d: tr("Nur mit Medjool-Datteln gesüßt — keine Glukosespitzen, kein Absturz.","Sweetened only by Medjool dates — no glucose spikes, no crash.","Yalnızca Medjool hurmasıyla tatlandırılır — glikoz zirvesi yok, çöküş yok."), g: "leaf" },
  { t: tr("Langsame Energie","Slow energy","Yavaş enerji"),          d: tr("Ein bedächtiger Aufguss Single-Origin-Arabica, ausbalanciert durch Mandelfett. Schwung, niemals Zittern.","A measured pour of single-origin arabica balanced by almond fat. Lift, never jitter.","Badem yağıyla dengelenmiş, ölçülü bir tek kaynak arabica. Canlılık, asla titreme."), g: "spark" },
  { t: tr("Nährstoffdichte","Nutrient density","Besin yoğunluğu"),     d: tr("Pistazie, Mandel und Dattel liefern Magnesium, Kalium und Ballaststoffe pro Tasse.","Pistachio, almond and date deliver magnesium, potassium and fibre per cup.","Fıstık, badem ve hurma her fincanda magnezyum, potasyum ve lif sağlar."), g: "drop" },
  { t: tr("Magenfreundlich","Gut-friendly","Mideye dost"),         d: tr("Milchfrei, vegan, säurearm. Magenschonender als Espresso.","Dairy-free, vegan, low-acid. Easier on the stomach than espresso.","Sütsüz, vegan, düşük asit. Espressodan mideye daha hafif."), g: "circle" },
  { t: tr("Von Hand gemischt","Blended by hand","Elde harmanlanır"),    d: tr("In kleinen Chargen in unserem Atelier gemischt. Eine Farm, eine Saison, eine Charge.","Blended in small batches in our atelier. Single farm, single season, single batch.","Atölyemizde küçük partiler hâlinde harmanlanır. Tek çiftlik, tek mevsim, tek parti."), g: "marker" },
  { t: tr("In 90 Sekunden fertig","Ready in 90 seconds","90 saniyede hazır"),  d: tr("Ein Löffel, heißes Wasser oder Milch. Keine Mühle. Kein Aufwand.","One scoop, hot water or milk. No grinder. No fuss.","Bir ölçek, sıcak su ya da süt. Değirmen yok. Zahmet yok."), g: "clock" },
  ];
}

function getRitual() {
  return [
  { n: "I",  t: tr("Dosieren","Measure","Ölç"),  c: tr("Ein gehäufter Löffel Manduraa für jede kleine Tasse. Wir nehmen 7 Gramm.","One heaped spoon of Manduraa for every small cup. We use 7 grams.","Her küçük fincan için bir tepeleme kaşık Manduraa. Biz 7 gram kullanırız."), img: "/assets/scene-6.jpg" },
  { n: "II", t: tr("Aufgießen","Pour","Dök"),     c: tr("Milch oder Wasser auf 78° erhitzen — niemals kochen. Langsam aufgießen.","Steam — never boil — your milk or water to 78°. Pour over slowly.","Sütü ya da suyu 78°'ye ısıt — asla kaynatma. Yavaşça üzerine dök."), img: "/assets/scene-3.jpg" },
  { n: "III",t: tr("Ruhen","Rest","Dinlendir"),     c: tr("Einen Atemzug warten. Die Datteln setzen lassen. Der erste Schluck soll sich gefunden anfühlen.","Wait a breath. Let the dates settle. The first sip should feel found.","Bir nefes bekle. Hurmaların dibe çökmesini bekle. İlk yudum bir keşif gibi hissettirmeli."), img: "/assets/scene-4.jpg" },
  ];
}

function getTaste() {
  return [
  { name: tr("Süße","Sweetness","Tatlılık"), val: 7 },
  { name: tr("Körper","Body","Gövde"),      val: 8 },
  { name: tr("Röstung","Roast","Kavurma"),     val: 5 },
  { name: tr("Säure","Acidity","Asit"),   val: 2 },
  { name: tr("Aromatik","Aromatic","Aromatik"),  val: 6 },
  { name: tr("Koffein","Caffeine","Kafein"),  val: 4 },
  ];
}

function getFaqs() {
  return [
  { q: tr("Was steckt eigentlich in Manduraa?","What's actually in Manduraa?","Manduraa'da aslında ne var?"), a: tr("Sechs Zutaten, mehr nicht: Medjool-Datteln, Marcona-Mandeln, Antep-Pistazien, Single-Origin-Arabica-Kaffee, grüner Kardamom und Kakaonibs. Kein raffinierter Zucker, keine Sirupe, keine Aromen, keine Konservierungsstoffe. Vegan und glutenfrei.","Six ingredients, nothing else: Medjool dates, Marcona almonds, Antep pistachios, single-origin arabica coffee, green cardamom and cocoa nibs. No refined sugar, no syrups, no flavourings, no preservatives. Vegan and gluten-free.","Altı malzeme, başka hiçbir şey: Medjool hurması, Marcona bademi, Antep fıstığı, tek kaynak arabica kahve, yeşil kakule ve kakao nibleri. Rafine şeker yok, şurup yok, aroma yok, koruyucu yok. Vegan ve glutensiz.") },
  { q: tr("Wie bereite ich es zu?","How do I prepare it?","Nasıl hazırlanır?"), a: tr("Ein gehäufter Löffel (7 g) pro kleine Tasse. 150 ml heißes — nicht kochendes — Wasser oder aufgeschäumte Milch dazugeben und zehn Sekunden rühren. Vor dem Trinken dreißig Sekunden ruhen lassen. Das ist das ganze Ritual.","One heaped spoon (7 g) per small cup. Add 150 ml of hot — not boiling — water or steamed milk and stir for ten seconds. Let it rest for thirty seconds before drinking. That's the entire ritual.","Her küçük fincan için bir tepeleme kaşık (7 g). 150 ml sıcak — kaynar değil — su ya da köpürtülmüş süt ekleyip on saniye karıştır. İçmeden önce otuz saniye dinlendir. Tüm ritüel bu kadar.") },
  { q: tr("Enthält es Koffein?","Does it contain caffeine?","Kafein içeriyor mu?"), a: tr("Original enthält etwa halb so viel Koffein wie ein normaler Espresso — sanft, anhaltend. Wir bieten auch eine koffeinfreie Edition mit natürlich entkoffeiniertem Arabica an.","Original contains about half the caffeine of a regular espresso — gentle, sustained. We also offer a caffeine-free edition using naturally decaffeinated arabica.","Original, normal bir espressonun yaklaşık yarısı kadar kafein içerir — yumuşak, sürekli. Ayrıca doğal olarak kafeini alınmış arabica ile kafeinsiz bir edisyon da sunuyoruz.") },
  { q: tr("Wie lange reicht ein Beutel?","How long does a pouch last?","Bir paket ne kadar yeter?"), a: tr("Ein 250-g-Beutel ergibt etwa 16 Tassen. Versiegelt an einem kühlen, dunklen Ort gelagert, bleibt er ab dem auf der Rückseite aufgedruckten Datum sechs Monate auf dem Höhepunkt.","A 250 g pouch makes roughly 16 cups. Stored sealed in a cool, dark place, it stays at peak for six months from the date stamped on the back.","250 g'lık bir paket yaklaşık 16 fincan yapar. Serin, karanlık bir yerde kapalı saklandığında, arkasında yazan tarihten itibaren altı ay boyunca en iyi durumda kalır.") },
  { q: tr("Wohin liefert ihr?","Where do you ship?","Nereye gönderiyorsunuz?"), a: tr("In die EU und das Vereinigte Königreich. Kostenlose Lieferung ab €60. Bestellungen werden innerhalb von 48 Stunden aus unserem Atelier versandt.","Across the EU and the UK. Complimentary delivery on orders over €60. Orders ship within 48 hours from our atelier.","AB'ye ve Birleşik Krallık'a. €60 üzeri siparişlerde ücretsiz teslimat. Siparişler atölyemizden 48 saat içinde gönderilir.") },
  { q: tr("Kann ich es zurückgeben?","Can I return it?","İade edebilir miyim?"), a: tr("Ja. Wenn dir deine erste Tasse nicht gefällt, schick den Beutel innerhalb von 30 Tagen zurück und wir erstatten dir den vollen Betrag. Keine Fragen, keine Hürden.","Yes. If you don't love your first cup, send the pouch back within 30 days and we'll refund you in full. No questions, no friction.","Evet. İlk fincanını sevmezsen, paketi 30 gün içinde geri gönder, tutarın tamamını iade edelim. Soru yok, zorluk yok.") },
  ];
}

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
  const SCENES = getScenes();
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
        <div className="tag">Esmee · Edition N° 01</div>
        <div className="mark" aria-label="Esmee">
          {"ESMEE".split("").map((l, i) => (<span key={i} className="ltr">{l}</span>))}
        </div>
        <div className="progress-line">
          <div className="step">{tr("deine Tasse wird gemischt …","blending your cup …","fincanın hazırlanıyor …")}</div>
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
  useLang();
  return (
    <div className={"nav-shell " + (scrolled ? "scrolled" : "")}>
      <nav className="nav">
        <div className="left">
          <div className="links">
            <a className="link" data-cur="btn" data-cur-label={tr("Lesen","Read","Oku")} href="#story-intro">Manduraa</a>
            <a className="link" data-cur="btn" data-cur-label={tr("Öffnen","Open","Aç")} href="#universe">{tr("Zutaten","Ingredients","İçindekiler")}</a>
            <a className="link" data-cur="btn" data-cur-label="Shop" href="#shop">{tr("Shop","Shop","Mağaza")}</a>
            <a className="link" data-cur="btn" data-cur-label="FAQ" href="#faq">{tr("FAQ","FAQ","SSS")}</a>
          </div>
        </div>
        <a href="#top" className="brandmark brandmark-logo" data-cur="btn" data-cur-label="Top" aria-label="Esmee">
          <img src="/assets/logo-esmee.png" alt="Esmee" />
        </a>
        <div className="right">
          <LangToggle />
          <button className="cart-btn" data-cur="btn" data-cur-label={tr("Tasche","Bag","Çanta")} onClick={onCart} aria-label={tr("Warenkorb öffnen","Open cart","Sepeti aç")}>
            <svg className="cart-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8 H 18 L 17 20 H 7 Z"/><path d="M9 8 a 3 3 0 0 1 6 0"/></svg>
            <span className="cart-label">{tr("Warenkorb","Cart","Sepet")}</span>
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
function getScenes() {
  return [
  {
    src: "/assets/scene-1.jpg",
    kicker: "Esmee · Edition N° 01",
    title: tr("Sechs Zutaten.\nEine Tasse.", "Six ingredients.\nOne cup.", "Altı malzeme.\nBir fincan."),
    body: tr("Datteln, Mandeln, Pistazie und Kaffee.\nMit Datteln gesüßt, nicht mit Zucker.", "Dates, almonds, pistachio and coffee.\nSweetened with dates, not sugar.", "Hurma, badem, fıstık ve kahve.\nŞekerle değil, hurmayla tatlandırıldı."),
    pos: "top", sub: tr("Zum Entdecken scrollen", "Scroll to explore", "Keşfetmek için kaydır"),
  },
  {
    src: "/assets/scene-2.jpg",
    kicker: tr("Die Zutaten", "The ingredients", "Malzemeler"),
    title: tr("Echte Zutaten,\nsonst nichts.", "Real ingredients,\nnothing else.", "Gerçek malzemeler,\nbaşka bir şey yok."),
    pos: "side-right",
    tags: [
      { side: "l", x: "6vw", y: "30vh", label: tr("Medjool-Dattel", "Medjool Date", "Medjool Hurması") },
      { side: "r", x: "8vw", y: "36vh", label: tr("Kakaonib", "Cocoa Nib", "Kakao Nibi") },
      { side: "l", x: "9vw", y: "52vh", label: tr("Single-Origin-Arabica", "Single-origin Arabica", "Tek Kaynak Arabica") },
    ],
  },
  {
    src: "/assets/scene-3.jpg",
    kicker: tr("Die Mischung", "The blend", "Harman"),
    title: tr("Dattel. Mandel.\nPistazie. Kaffee.", "Date. Almond.\nPistachio. Coffee.", "Hurma. Badem.\nFıstık. Kahve."),
    pos: "top",
    tags: [
      { side: "l", x: "8vw", y: "34vh", label: tr("Marcona-Mandel", "Marcona Almond", "Marcona Bademi") },
      { side: "r", x: "10vw", y: "44vh", label: tr("Antep-Pistazie", "Antep Pistachio", "Antep Fıstığı") },
    ],
  },
  {
    src: "/assets/scene-4.jpg",
    kicker: tr("Die Zubereitung", "How to make it", "Hazırlanışı"),
    title: tr("Eine Tasse,\nin 90 Sekunden.", "One cup,\nin 90 seconds.", "Bir fincan,\n90 saniyede."),
    body: tr("Ein Löffel, heißes Wasser oder Milch,\nkurz umrühren. Fertig.", "One scoop, hot water or milk,\na quick stir. Done.", "Bir ölçek, sıcak su ya da süt,\nkısa bir karıştırma. Hazır."),
    pos: "side-right",
  },
  {
    src: "/assets/scene-5.jpg",
    kicker: tr("Die Herstellung", "How it's made", "Nasıl yapılır"),
    title: tr("Von Hand\ngemischt.", "Blended\nby hand.", "Elde\nharmanlandı."),
    body: tr("Eine Charge, ein Beutel,\nfrisch von Hand gemischt.", "One batch, one pouch,\nfreshly blended by hand.", "Tek parti, tek paket,\ntaze elde harmanlandı."),
    pos: "top",
  },
  {
    src: "/assets/scene-6.jpg",
    kicker: "Edition № 01",
    title: "Manduraa.",
    body: tr("Mit Datteln gesüßt, nicht mit Zucker.\n250 g · 6 Zutaten · 0 g zugesetzter Zucker.", "Sweetened with dates, not sugar.\n250 g · 6 ingredients · 0 sugar added.", "Şekerle değil, hurmayla tatlandırıldı.\n250 g · 6 malzeme · 0 g ilave şeker."),
    pos: "bottom", cta: true,
  },
  ];
}

function ScrollStory({ onSteamIntensity, heroFrom }) {
  useLang();
  const SCENES = getScenes();
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
          <span className="big">0{cue + 1}</span> &nbsp; — &nbsp; <span>{SCENES.length} {tr("Akte","acts","perde")}</span>
        </div>
        {/* CRO: Hero buy-strip — highlights + price + ATC over the first scene */}
        <div className={"hero-buystrip " + (cue === 0 ? "in" : "")} aria-hidden={cue !== 0}>
          <div className="hb-row hb-row-top">
            <span className="hb-stars" aria-label={tr("Produkt-Highlights","Product highlights","Ürün öne çıkanları")}>
              <span className="hb-rate">{tr("0 g raffinierter Zucker · 6 Zutaten · Vegan","0 g refined sugar · 6 ingredients · vegan","0 g rafine şeker · 6 malzeme · vegan")}</span>
            </span>
            <span className="hb-trust">
              <span>{tr("30 Tage Geld-zurück","30-day money-back","30 gün iade")}</span>
              <span className="hb-dot"></span>
              <span>{tr("Versand in 48 h","Ships in 48 h","48 saatte kargo")}</span>
              <span className="hb-dot"></span>
              <span>{tr("Gratis ab €60","Free over €60","€60 üzeri ücretsiz")}</span>
            </span>
          </div>
          <div className="hb-row hb-row-bot">
            <div className="hb-meta">
              <span className="hb-edition">Esmee · Edition № 01</span>
              <span className="hb-name">Manduraa · {tr("ab","from","şu fiyattan")} <em>€{heroFrom || 22}</em>/{tr("Beutel","pouch","paket")}</span>
            </div>
            <div className="hb-cta-wrap">
              <button className="hb-cta" data-cur="btn" data-cur-label="Shop" onClick={scrollToShop}>
                {tr("In den Warenkorb","Add to cart","Sepete ekle")} <span className="hb-cta-arrow">→</span>
              </button>
              <button className="hb-cta-ghost" onClick={() => { const el = document.getElementById("story-intro"); if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" }); }}>
                {tr("Story ansehen","Watch the story","Hikâyeyi izle")}
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
                    {tr("Manduraa entdecken","Discover Manduraa","Manduraa'yı keşfet")} →
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
          <span>{tr("Scrolle, langsam","Scroll, slowly","Yavaşça kaydır")}</span>
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
  useLang();
  const jump = () => {
    const el = document.querySelector(".reviews-v2") || document.getElementById("reviews");
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };
  return (
    <section className="reviews-ribbon" aria-label="Produktversprechen">
      <div className="rr-score">
        <span className="num">0 g <em>{tr("Zucker","Sugar","Şeker")}</em></span>
      </div>
      <div className="rr-quotes">
        <span>{tr("Mit Datteln gesüßt.","Sweetened with dates.","Hurmayla tatlandırılmış.")}</span>
        <span>{tr("Sechs Zutaten.","Six ingredients.","Altı malzeme.")}</span>
        <span>{tr("Von Hand gemischt.","Hand-blended.","Elde harmanlandı.")}</span>
      </div>
      <button className="rr-jump" type="button" onClick={jump}>{tr("Die Mischung entdecken","Discover the blend","Harmanı keşfet")} →</button>
    </section>
  );
}

/* ============================================================
   INTRO STORY
   ============================================================ */
function StoryIntro() {
  useLang();
  return (
    <section id="story-intro" className="block story-intro">
      <div className="container grid">
        <div>
          <span className="eyebrow reveal">{tr("— Eine Notiz aus dem Atelier","— A note from the atelier","— Atölyeden bir not")}</span>
          <h2 className="reveal delay-1" key={tr("de","en","tr")}>
            <SplitText text={tr("Die Tasse, die unsere Großmütter","The cup our grandmothers","Büyükannelerimizin o fincanı")} />
            <br/>
            <em className="italic"><SplitText text={tr("nie die Zeit hatten,","never had time","yazmaya hiç")} delay={0.3} /></em>
            <SplitText text={tr(" sie aufzuschreiben.","  to write down.","  vakitleri olmadı.")} delay={0.55} />
          </h2>
          <p className="reveal delay-2">
            {tr("Manduraa ist kein Kaffee und nicht ganz eine Schokolade. Es ist die stille Zeremonie, die wir Jahr für Jahr in Küchen von ","Manduraa is not a coffee, and not quite a chocolate. It is the quiet ceremony we kept watching, year after year, in kitchens from ","Manduraa ne bir kahve ne de tam bir çikolata. Yıllar boyu mutfaklarda izlediğimiz o sessiz tören: ")}
            <HoverWord word={tr("Beirut","Beirut","Beyrut")} label={tr("Beirut · Libanon","Beirut · Lebanon","Beyrut · Lübnan")} text={tr("Wo die Dattelsirup-Tradition noch in kupfernen Töpfen lebt.","Where the date-syrup tradition still lives in copper saucepans.","Hurma pekmezi geleneğinin hâlâ bakır tencerelerde yaşadığı yer.")} img="/assets/scene-2.jpg" />
            {tr(" bis "," to "," — ")}
            <HoverWord word="Antakya" label={tr("Antakya · Türkei","Antakya · Türkiye","Antakya · Türkiye")} text={tr("Der Pistazien-Gürtel — Antep-Verwandte der Tasse.","The pistachio belt — Antep cousins of the cup.","Antep fıstığı kuşağı — fincanın Antep akrabaları.")} img="/assets/scene-3.jpg" />
            {tr(": die Frauen, die Datteln mit ihren Händen zu Sirup verwandelten, die geduldig ",": the women who turned dates into syrup with their hands, who ground "," datilleri elleriyle pekmeze çeviren, şeker misafirlere ayrıldığı için sabırla ")}
            <HoverWord word={tr("Mandeln","almonds","bademleri")} label={tr("Marcona-Mandel","Marcona Almond","Marcona Bademi")} text={tr("Die butterige spanische Mandel. Kalt vermahlen in die Mischung.","The buttery Spanish almond. Cold-stone milled into the blend.","Tereyağsı İspanyol bademi. Soğuk taşla harmana öğütülür.")} img="/assets/scene-5.jpg" />
            {tr(" mahlten, weil Zucker für die Gäste war."," patiently because sugar was for guests."," öğüten kadınlar.")}
          </p>
          <p className="reveal delay-3">
            {tr("Wir haben die Geste eingefangen. Sechs Zutaten, nichts weiter. Die Mischung wird allein durch ","We bottled the gesture. Six ingredients, nothing else. The blend is sweetened only by ","Bu jesti şişeye koyduk. Altı malzeme, başka hiçbir şey. Harman yalnızca ")}
            <HoverWord word={tr("Datteln aus dem Jordantal","Jordan Valley dates","Ürdün Vadisi hurmaları")} label={tr("Medjool-Dattel","Medjool Date","Medjool Hurması")} text={tr("Sonnengetrocknet auf einer einzigen Farm im Jordantal.","Sun-cured on a single farm in the Jordan Valley.","Ürdün Vadisi'nde tek bir çiftlikte güneşte kurutulmuş.")} img="/assets/scene-6.jpg" />
            {tr(" gesüßt. Der Körper kommt von kalt vermahlener Marcona. Der Schwung, wenn du ihn willst, ist Single-Origin-",". The body comes from cold-stone Marcona. The lift, when you want it, is single-origin "," ile tatlandırılır. Gövde, soğuk taşla öğütülmüş Marcona'dan gelir. İstediğinde gelen canlılık ise tek kaynak ")}
            <HoverWord word={tr("Arabica","arabica","arabica")} label={tr("Arabica · Jemen","Arabica · Yemen","Arabica · Yemen")} text={tr("Ein bedächtiger Aufguss von den Haraz-Bergfarmen.","A measured pour from the Haraz mountain farms.","Haraz dağ çiftliklerinden ölçülü bir demleme.")} img="/assets/scene-1.jpg" />
            {tr(".",".",".")}
          </p>
          <div className="stats reveal delay-3">
            <div className="stat"><strong><Counter to={6} duration={1100} /></strong><span>{tr("Zutaten","Ingredients","Malzeme")}</span></div>
            <div className="stat"><strong><Counter to={0} duration={1100} suffix="g" /></strong><span>{tr("Raffinierter Zucker","Refined sugar","Rafine şeker")}</span></div>
            <div className="stat"><strong><Counter to={1} duration={1100} prefix="0" /></strong><span>{tr("Atelier","Atelier","Atölye")}</span></div>
          </div>
        </div>
        <div className="reveal delay-1">
          <div className="frame aspect-3x4 parallax" data-cur="img" data-cur-label={tr("Ansehen","View","Gör")}>
            <BlurImg src="/assets/scene-4.jpg" alt={tr("Eine stille Porzellantasse Manduraa, sanft dampfend.","A still porcelain cup of Manduraa, steaming softly.","Hafifçe tüten, durgun bir porselen Manduraa fincanı.")} />
            <span className="caption">{tr("Atelier — Mischung Nr. 04","Atelier — Blend no. 04","Atölye — Harman No. 04")}</span>
            <span className="floating-tag"><span className="pulse"></span>{tr("Von Hand gemischt","Hand-blended","Elde harmanlanmış")}</span>
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
  useLang();
  const INGREDIENTS = getIngredients();
  const [selected, setSelected] = useState(null); // selected ingredient INDEX or null

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
    // Position the chip at its base angle plus the live rotation. The chip itself
    // stays upright (no transform rotation) so labels never tilt or flip.
    const rad = ((ing.angle + rot) * Math.PI) / 180;
    const left = 50 + Math.cos(rad) * ing.r;
    const top  = 50 + Math.sin(rad) * ing.r;
    return (
      <div
        key={idx}
        className="ing-chip"
        data-cur="btn"
        data-cur-label={tr("Öffnen","Open","Aç")}
        style={{
          left: `${left}%`,
          top: `${top}%`,
          transform: "translate(-50%, -50%)",
          position: "absolute",
        }}
        onClick={(e) => { e.stopPropagation(); setSelected(idx); }}
      >
        <span className="swatch" style={{ background: ing.color }} />
        <div>
          <div className="name">{ing.name}</div>
          <span className="note">{ing.note}</span>
        </div>
      </div>
    );
  };

  // connectors from each chip to the center — follow the same live rotation as the chips
  const connectors = INGREDIENTS.map((ing, i) => {
    const rad = ((ing.angle + rot) * Math.PI) / 180;
    const x = 50 + Math.cos(rad) * ing.r;
    const y = 50 + Math.sin(rad) * ing.r;
    return <path key={i} d={`M50 50 L${x} ${y}`} />;
  });

  return (
    <section id="universe" className="block universe">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow reveal">{tr("— Zutaten-Universum","— Ingredient universe","— Malzeme evreni")}</span>
          <h2 className="reveal delay-1" key={tr("de","en","tr")}>
            <SplitText text={tr("Sechs Zutaten","Six ingredients","Altı malzeme")} /> <em className="italic"><SplitText text={tr("im Orbit.","in orbit.","yörüngede.")} delay={0.25} /></em>
          </h2>
          <p className="reveal delay-2 orbit-desc-d">
            {tr("Ziehe, um den Orbit zu drehen. Klicke auf eine Zutat, um die Farm, die Saison und das Gramm-Gewicht hinter einer einzigen Tasse Manduraa kennenzulernen.","Drag to rotate the orbit. Click any ingredient to meet the farm, the season, and the gram-count behind a single cup of Manduraa.","Yörüngeyi döndürmek için sürükle. Bir fincan Manduraa'nın ardındaki çiftliği, mevsimi ve gram miktarını görmek için herhangi bir malzemeye tıkla.")}
          </p>
          <p className="reveal delay-2 orbit-desc-m">
            {tr("Tippe auf eine Zutat, um die Farm, die Saison und das Gramm-Gewicht hinter einer einzigen Tasse Manduraa kennenzulernen.","Tap any ingredient to meet the farm, the season, and the gram-count behind a single cup of Manduraa.","Bir fincan Manduraa'nın ardındaki çiftliği, mevsimi ve gram miktarını görmek için herhangi bir malzemeye dokun.")}
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
          <div className="orbit-inner" ref={innerRef}>
            {/* Chips are positioned by angle+rot (computed in placeChip) and kept upright. */}
            {INGREDIENTS.map((ing, i) => placeChip(ing, i))}
          </div>
          <div className="orbit-core">
            <BlurImg src="/assets/pack-flat-layout.jpeg" alt="Manduraa pouch" />
          </div>
          <span className="hint">{tr("ziehen zum Drehen · Chip antippen","drag to rotate · click any chip","döndürmek için sürükle · çipe tıkla")}</span>
        </div>
        {/* Mobile: a clean tappable grid replaces the cramped orbit (CSS-toggled). */}
        <div className="orbit-grid-mobile">
          {INGREDIENTS.map((ing, i) => (
            <button key={i} type="button" className="om-card" onClick={() => setSelected(i)} aria-label={ing.name}>
              <span className="om-sw" style={{ background: ing.color }} />
              <span className="om-text">
                <span className="om-name">{ing.name}</span>
                <span className="om-note">{ing.note}</span>
              </span>
              <span className="om-arrow" aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
      </div>
      <IngredientModal ingredient={selected != null ? INGREDIENTS[selected] : null} index={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function IngredientModal({ ingredient, index, onClose }) {
  useLang();
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
              <div className="stamp">N° {String((index ?? 0) + 1).padStart(2, "0")}</div>
            </div>
            <div className="ing-body">
              <span className="ing-eyebrow">{ingredient.note}</span>
              <h3>{ingredient.name}</h3>
              <p className="lede">"{ingredient.lede}"</p>
              <div className="facts">
                <div className="fact"><span>{tr("Herkunft","Origin","Köken")}</span><strong>{ingredient.origin}</strong></div>
                <div className="fact"><span>{tr("Saison","Season","Mevsim")}</span><strong>{ingredient.season}</strong></div>
                <div className="fact"><span>{tr("Pro Beutel","Per pouch","Paket başına")}</span><strong>{ingredient.grams}</strong></div>
                <div className="fact"><span>{tr("Bezug","Sourcing","Tedarik")}</span><strong>{tr("Eine Farm","Single-farm","Tek çiftlik")}</strong></div>
              </div>
              <p className="body">{ingredient.body}</p>
              <button className="back" data-cur="btn" data-cur-label={tr("Schließen","Close","Kapat")} onClick={onClose}>← {tr("Zurück zum Orbit","Back to orbit","Yörüngeye dön")}</button>
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
  useLang();
  const themItems = [
    tr("10–20 g raffinierter Zucker oder Sirup zugesetzt","10–20 g refined sugar or syrup added","10–20 g rafine şeker veya şurup ilave"),
    tr("Scharfer Koffein-Peak, Absturz um 15 Uhr","Sharp caffeine spike, 3pm crash","Sert kafein zirvesi, 15:00 çöküşü"),
    tr("Säurehaltig; hart auf nüchternen Magen","Acidic; harsh on an empty stomach","Asitli; aç mideye sert"),
    tr("Leere Kalorien, keine Nährstoffdichte","Empty calories, no nutrient density","Boş kalori, besin yoğunluğu yok"),
    tr("Industrielle Röstungen, anonyme Herkunft","Industrial roasts, anonymous origin","Endüstriyel kavurmalar, anonim köken"),
    tr("Zuckerschuld bis 16 Uhr","Sugar guilt by 4pm","16:00'da şeker pişmanlığı"),
  ];
  const usItems = [
    tr("0 g raffinierter Zucker — mit Medjool-Datteln gesüßt","0 g refined sugar — sweetened by Medjool dates","0 g rafine şeker — Medjool hurmasıyla tatlandırılmış"),
    tr("Anhaltende, ausgewogene Energie aus Mandelfett","Sustained, balanced energy from almond fat","Badem yağından sürekli, dengeli enerji"),
    tr("Säurearm, magenschonend","Low-acid, gentle on the stomach","Düşük asit, mideye nazik"),
    tr("Ballaststoffe, Magnesium und Kalium pro Tasse","Fibre, magnesium and potassium per cup","Her fincanda lif, magnezyum ve potasyum"),
    tr("Eine Farm, eine Charge, eine Saison","Single-farm, single-batch, single-season","Tek çiftlik, tek parti, tek mevsim"),
    tr("Ein Ritual, das du ohne Reue wiederholen kannst","A ritual you can repeat without flinching","Hiç çekinmeden tekrarlayabileceğin bir ritüel"),
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
          <span className="eyebrow reveal">{tr("— Manduraa vs. der Rest","— Manduraa vs. the rest","— Manduraa vs. gerisi")}</span>
          <h2 className="reveal delay-1" key={tr("de","en","tr")}>
            <SplitText text={tr("Energie ohne","Energy without","Çöküş")} /> <em className="italic"><SplitText text={tr("den Absturz","the crash","yaşatmayan")} delay={0.3} /></em> <SplitText text={tr("am Nachmittag.","at 3pm.","enerji.")} delay={0.45} />
          </h2>
        </div>
        <div className="vs-grid reveal delay-2" ref={ref}>
          <div className="vs-col them">
            <span className="vs-label">{tr("Kaffee · Latte · Energydrink","Coffee · Latte · Energy drink","Kahve · Latte · Enerji içeceği")}</span>
            <h3>{tr("Die übliche Tasse","The usual cup","Alışıldık fincan")}</h3>
            <ul>
              {themItems.map((t, i) => <li key={i}><Dash />{t}</li>)}
            </ul>
            <div className="sugar-bar">
              <div className="sb-label"><span>{tr("Raffinierter Zucker / Tasse","Refined sugar / cup","Rafine şeker / fincan")}</span><em>~18 g</em></div>
              <div className="bar"><div className="fill" /></div>
            </div>
          </div>
          <div className="vs-col us">
            <span className="vs-label">Manduraa · Edition 01</span>
            <h3>{tr("Die bessere Tasse","The better cup","Daha iyi fincan")}</h3>
            <ul>
              {usItems.map((t, i) => <li key={i}><Check />{t}</li>)}
            </ul>
            <div className="sugar-bar">
              <div className="sb-label"><span>{tr("Raffinierter Zucker / Tasse","Refined sugar / cup","Rafine şeker / fincan")}</span><em>0 g</em></div>
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
  useLang();
  const BENEFITS = getBenefits();
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);
  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current) setActive(a => (a + 1) % 6);
    }, 3500);
    return () => clearInterval(id);
  }, []);
  return (
    <section className="block benefits">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow reveal">{tr("— Warum Manduraa","— Why Manduraa","— Neden Manduraa")}</span>
          <h2 className="reveal delay-1" key={tr("de","en","tr")}>
            <SplitText text={tr("Eine Tasse, die","A cup that","Geri veren")} /> <em className="italic"><SplitText text={tr("zurückgibt.","gives back.","bir fincan.")} delay={0.25} /></em>
          </h2>
          <p className="reveal delay-2">{tr("Sechs Gründe, warum unsere Kundinnen nachbestellen. Keiner davon ist Zucker.","Six reasons our customers reorder. None of them are sugar.","Müşterilerimizin yeniden sipariş vermesinin altı nedeni. Hiçbiri şeker değil.")}</p>
        </div>
        <div
          className="benefit-grid"
          onMouseEnter={() => pausedRef.current = true}
          onMouseLeave={() => pausedRef.current = false}
        >
          {BENEFITS.map((b, i) => (
            <div
              key={i}
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
  useLang();
  // Live Shopify catalog drives the display; demo VARIANTS are the offline fallback.
  const variants = (liveVariants && liveVariants.length) ? liveVariants : VARIANTS;
  const singleVariant = variants.length === 1;
  const [variant, setVariant] = useState(variants[0]);
  useEffect(() => {
    if (liveVariants && liveVariants.length) setVariant(liveVariants[0]);
  }, [liveVariants]);
  const PACKS = getPacks();
  const [packId, setPackId] = useState("3");
  const pack = PACKS.find(p => p.id === packId) || PACKS[1];
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
    setPackId(p.id);
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
          <span className="floating-tag"><span className="pulse"></span>{tr("Auf Lager · Versand in 48 h","In stock · Ships in 48 h","Stokta · 48 saatte kargo")}</span>
          {!singleVariant && (
            <div className="swatch-row">
              {variants.map(v => (
                <button
                  key={v.id}
                  className={"swatch " + (v.id === variant.id ? "active" : "")}
                  style={{ background: v.swatch }}
                  onClick={() => chooseVariant(v)}
                  data-cur="btn"
                  data-cur-label={tr("Wählen","Pick","Seç")}
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
            <span>{tr("Edition № 01 · 0 g raffinierter Zucker · Vegan · Glutenfrei","Edition № 01 · 0 g refined sugar · vegan · gluten-free","Edition № 01 · 0 g rafine şeker · vegan · glutensiz")}</span>
          </div>
          <p className="lede">{tr("Geröstete Mandeln, Medjool-Datteln, Pistazie und ein Hauch Arabica-Kaffee. Mit Datteln gesüßt, nicht mit Zucker.","Roasted almonds, Medjool dates, pistachio and a hint of arabica coffee. Sweetened with dates, not sugar.","Kavrulmuş badem, Medjool hurması, fıstık ve bir tutam arabica kahve. Şekerle değil, hurmayla tatlandırılmış.")}</p>

          <div className="price-row">
            <span className="price">€{m(unitPrice)}</span>
            <span className="price-was">€{m(wasUnit)}</span>
            {!subActive && pack.save > 0 && <span className="price-save">{tr("Du sparst","You save","Tasarruf")} {pack.save}%</span>}
            {subActive && <span className="price-save sub-tag">{tr("Abo","Subscription","Abonelik")} · −{Math.round(subPct*100)}%</span>}
          </div>

          {/* CRO T-03: Subscription / one-time plan toggle */}
          <div className="option-block">
            <div className="option-label">
              <span>{tr("Lieferung wählen","Choose your delivery","Teslimatını seç")}</span>
              <em>{plan === "once" ? tr("Einmalkauf","One-time","Tek seferlik") : (plan === "30" ? tr("Abo · alle 30 Tage","Subscription · every 30 days","Abonelik · her 30 günde") : tr("Abo · alle 60 Tage","Subscription · every 60 days","Abonelik · her 60 günde"))}</em>
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
                  <span className="plan-name">{tr("Einmalkauf","One-time","Tek seferlik")}</span>
                  <span className="plan-sub">{tr("Keine Bindung · Versand in 48 Stunden","No commitment · ships in 48 hours","Taahhüt yok · 48 saatte kargo")}</span>
                </span>
                <span className="plan-price">€{m(baseUnit)}<small>{tr("/Packung","/pack","/paket")}</small></span>
              </button>
              <button
                type="button"
                className={"plan-card with-save " + (plan === "30" ? "active" : "")}
                onClick={() => { setPlan("30"); onTap && onTap(); }}
                data-cur="btn"
                data-cur-label={tr("Wählen","Pick","Seç")}
              >
                <span className="plan-badge">{tr("Spare","Save","Tasarruf")} {Math.round(pct30 * 100)} %</span>
                <span className="plan-radio"></span>
                <span className="plan-body">
                  <span className="plan-name">{tr("Abo · alle 30 Tage","Subscription · every 30 days","Abonelik · her 30 günde")}</span>
                  <span className="plan-sub">{tr("15 % Rabatt auf jede Lieferung. Jederzeit pausieren oder kündigen.","15% off every delivery. Pause or cancel anytime.","Her teslimatta %15 indirim. İstediğin zaman duraklat ya da iptal et.")}</span>
                </span>
                <span className="plan-price">€{m(unit30)}<small>{tr("/Packung","/pack","/paket")}</small></span>
              </button>
              <button
                type="button"
                className={"plan-card " + (plan === "60" ? "active" : "")}
                onClick={() => { setPlan("60"); onTap && onTap(); }}
                data-cur="btn"
                data-cur-label={tr("Wählen","Pick","Seç")}
              >
                <span className="plan-radio"></span>
                <span className="plan-body">
                  <span className="plan-name">{tr("Abo · alle 60 Tage","Subscription · every 60 days","Abonelik · her 60 günde")}</span>
                  <span className="plan-sub">{tr("Gleicher Rabatt, längerer Abstand — für ein bis zwei Tassen am Tag.","Same discount, more time between — for one or two cups a day.","Aynı indirim, daha uzun aralık — günde bir iki fincan için.")}</span>
                </span>
                <span className="plan-price">€{m(unit60)}<small>{tr("/Packung","/pack","/paket")}</small></span>
              </button>
            </div>
            {subActive && (
              <div className="plan-perks">
                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>{tr("15 % Rabatt auf jede Lieferung — automatisch","15% off every delivery — automatically","Her teslimatta otomatik %15 indirim")}</span>
                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>{tr("Jederzeit pausieren, ändern oder kündigen","Pause, change or cancel anytime","İstediğin zaman duraklat, değiştir ya da iptal et")}</span>
                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>{tr("Kostenloser Versand bei jeder Lieferung","Free shipping on every delivery","Her teslimatta ücretsiz kargo")}</span>
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
                <span className="gift-name">{tr("Als Geschenk verschicken","Send as a gift","Hediye olarak gönder")}</span>
                <span className="gift-sub">{tr("Handgeschriebene Karte · Geschenk-Verpackung · +€","Handwritten card · gift wrap · +€","El yazısı kart · hediye paketi · +€")}{GIFT_FEE}</span>
              </span>
              <span className="gift-switch" aria-hidden="true"><span className="knob"></span></span>
            </button>
            {gift && (
              <div className="gift-form">
                <label className="gift-field">
                  <span className="lbl">{tr("An (E-Mail oder Name)","To (email or name)","Kime (e-posta veya isim)")}</span>
                  <input
                    type="text"
                    placeholder={tr("z. B. Maya Rahimi","e.g. Maya Rahimi","örn. Maya Rahimi")}
                    value={giftTo}
                    onChange={e => setGiftTo(e.target.value)}
                    maxLength={60}
                  />
                </label>
                <label className="gift-field">
                  <span className="lbl">{tr("Botschaft","Message","Mesaj")} <small>({160 - giftMsg.length})</small></span>
                  <textarea
                    placeholder={tr("Eine kurze, ruhige Botschaft. Wir schreiben sie auf Bauwoll-Karton mit Wachssiegel.","A short, quiet message. We write it on cotton card with a wax seal.","Kısa, sakin bir mesaj. Onu mühür mumlu pamuk kartona yazarız.")}
                    value={giftMsg}
                    onChange={e => setGiftMsg(e.target.value.slice(0, 160))}
                    rows={2}
                  />
                </label>
                <div className="gift-meta">
                  <span>{tr("✓ Geschenk-Quittung statt Rechnung","✓ Gift receipt instead of invoice","✓ Fatura yerine hediye fişi")}</span>
                  <span>{tr("✓ Versand an deine oder Empfänger-Adresse","✓ Ship to your or the recipient's address","✓ Senin veya alıcının adresine kargo")}</span>
                </div>
              </div>
            )}
          </div>

          {!singleVariant && (
            <div className="option-block">
              <div className="option-label"><span>{tr("Edition","Edition","Edisyon")}</span><em>{variant.name}</em></div>
              <div className="variant-row">
                {variants.map(v => (
                  <button key={v.id} className={"v-chip " + (v.id === variant.id ? "active" : "")} data-cur="btn" data-cur-label={tr("Wählen","Pick","Seç")} onClick={() => chooseVariant(v)}>
                    <span className="v-name">{v.name}</span>
                    <span className="v-sub">{v.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="option-block">
            <div className="option-label"><span>{tr("Menge — Mengenrabatt","Quantity — bulk discount","Miktar — toplu indirim")}</span><em>{pack.label}</em></div>
            <div className="pack-grid">
              {PACKS.map(p => (
                <button
                  key={p.id}
                  className={"pack " + (p.id === pack.id ? "active" : "")}
                  data-cur="btn"
                  data-cur-label={tr("Wählen","Pick","Seç")}
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
                    <div className="pack-per">€{m(packUnit(p))}{tr(" / Packung"," / pack"," / paket")}{p.save ? " · −" + p.save + "%" : ""}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="atc-row">
            <div className="qty">
              <button onClick={() => setQtyBump(Math.max(1, qty - 1))} aria-label={tr("Verringern","Decrease","Azalt")}>—</button>
              <span className={"v " + (bump ? "bump" : "")}>{qty}</span>
              <button onClick={() => setQtyBump(qty + 1)} aria-label={tr("Erhöhen","Increase","Artır")}>+</button>
            </div>
            <button
              className="btn-add"
              data-cur="btn"
              data-cur-label={tr("Hinzufügen","Add","Ekle")}
              onMouseMove={onMagnetMove}
              onClick={add}
            >
              <span>{subActive ? tr("Abo starten","Start subscription","Aboneliği başlat") : tr("In den Warenkorb","Add to cart","Sepete ekle")}</span>
              <span className="price-tag"><Counter to={total} duration={500} key={total} prefix="€" decimals={dec} /></span>
            </button>
          </div>

          {/* CRO T-05: Express-Pay row right below the ATC */}
          <div className="express-pay" aria-label={tr("Schnellzahlung","Express checkout","Hızlı ödeme")}>
            <span className="ex-label">{tr("— oder direkt zahlen mit","— or pay directly with","— ya da doğrudan öde")}</span>
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
            <span className="t-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8 L 12 3 L 21 8 V 16 L 12 21 L 3 16 Z"/></svg>{tr("Komplimentärer Versand ab €60","Complimentary shipping over €60","€60 üzeri ücretsiz kargo")}</span>
            <span className="t-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M9 12 L 11 14 L 15 10"/></svg>{tr("30 Tage Geld-zurück","30-day money-back","30 gün para iade")}</span>
            <span className="t-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 11 H 20"/></svg>{tr("Sichere Bezahlung","Secure payment","Güvenli ödeme")}</span>
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
    // Dosieren — a pouch and a measuring spoon with a mound of blend
    return (
      <svg viewBox="0 0 200 230" preserveAspectRatio="xMidYMid meet" className="rit-ill">
        <ellipse cx="94" cy="208" rx="78" ry="10" className="ground" />
        {/* Pouch */}
        <path className="obj fillsoft" d="M50 94 Q50 74 70 72 L120 72 Q140 74 140 94 L135 188 Q134 200 121 200 L69 200 Q56 200 55 188 Z" />
        <path className="obj" d="M68 72 L74 56 Q95 49 116 56 L122 72" />
        <line className="obj" x1="68" y1="72" x2="122" y2="72" />
        <line className="hair" x1="68" y1="120" x2="122" y2="120" />
        <line className="hair" x1="80" y1="136" x2="110" y2="136" />
        {/* Spoon */}
        <path className="obj" d="M158 170 L192 140" />
        <ellipse className="obj" cx="152" cy="174" rx="26" ry="15" />
        <path className="spoon-fill" d="M128 174 Q152 156 176 174 Z" />
        {/* falling grains */}
        <circle className="accent grain g1" cx="112" cy="150" r="2.4" />
        <circle className="accent grain g2" cx="122" cy="162" r="1.9" />
        <circle className="accent grain g3" cx="104" cy="164" r="1.7" />
      </svg>
    );
  }
  if (step === 1) {
    // Aufgießen — a tilted carafe pouring a stream into a cup, steam rising
    return (
      <svg viewBox="0 0 200 230" preserveAspectRatio="xMidYMid meet" className="rit-ill">
        <ellipse cx="100" cy="208" rx="78" ry="10" className="ground" />
        {/* Carafe */}
        <path className="obj fillsoft" d="M38 52 L92 52 L86 104 Q84 118 70 118 L60 118 Q46 118 44 104 Z" />
        <line className="obj" x1="42" y1="68" x2="88" y2="68" />
        <path className="obj" d="M92 60 Q106 62 107 74" />
        {/* Stream */}
        <path className="accent pour-stream" d="M106 76 Q122 104 124 134" />
        {/* Cup */}
        <path className="obj fillsoft" d="M92 152 L170 152 L162 198 Q159 206 150 206 L112 206 Q103 206 100 198 Z" />
        <ellipse className="obj" cx="131" cy="152" rx="39" ry="7" />
        <path className="obj" d="M170 162 Q188 162 188 178 Q188 194 170 194" />
        {/* steam */}
        <path className="accent steam" d="M120 144 Q116 132 124 120" />
        <path className="accent steam" style={{ animationDelay: "0.8s" }} d="M140 144 Q136 132 144 120" />
      </svg>
    );
  }
  // Ruhen — a calm cup on a saucer with rising steam
  return (
    <svg viewBox="0 0 200 230" preserveAspectRatio="xMidYMid meet" className="rit-ill">
      <ellipse cx="100" cy="202" rx="80" ry="11" className="ground" />
      {/* Saucer */}
      <ellipse className="obj" cx="100" cy="184" rx="68" ry="13" />
      {/* Cup */}
      <path className="obj fillsoft" d="M58 118 L142 118 L133 168 Q130 179 118 179 L82 179 Q70 179 67 168 Z" />
      <ellipse className="obj" cx="100" cy="118" rx="42" ry="8" />
      <ellipse className="liquid" cx="100" cy="119" rx="35" ry="6" />
      <path className="obj" d="M142 130 Q166 130 166 151 Q166 172 142 172" />
      {/* steam */}
      <path className="accent steam" d="M82 102 Q77 86 86 70" />
      <path className="accent steam" style={{ animationDelay: "0.7s" }} d="M100 100 Q95 82 104 64" />
      <path className="accent steam" style={{ animationDelay: "1.3s" }} d="M118 102 Q113 86 122 70" />
    </svg>
  );
}

function Ritual() {
  useLang();
  const RITUAL = getRitual();
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
    { left: tr("Menge","Pour","Miktar"), leftV: "7 g", right: tr("Volumen","Volume","Hacim"), rightV: "150 ml" },
    { left: tr("Temp.","Temp","Sıcaklık"), leftV: "78°", right: tr("Tempo","Pace","Tempo"), rightV: tr("Langsam","Slow","Yavaş") },
    { left: tr("Ruhe","Rest","Dinlenme"), leftV: "30 s", right: tr("Tasse","Cup","Fincan"),  rightV: tr("Klein","Small","Küçük") },
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
                  <span className="step-kicker">— {tr("Phase","Phase","Aşama")} {String(i + 1).padStart(2, "0")} {tr("von","of","/")} 03</span>
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
  useLang();
  const TASTE = getTaste();
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
          <span className="eyebrow reveal">{tr("— Geschmacksprofil","— Taste profile","— Tat profili")}</span>
          <h2 className="reveal delay-1" key={tr("de","en","tr")}>
            <SplitText text={tr("So schmeckt","This is how","İşte")} /> <em className="italic"><SplitText text={tr("Manduraa.","Manduraa tastes.","Manduraa'nın tadı.")} delay={0.3} /></em>
          </h2>
          <p className="reveal delay-2">{tr("Sechs Eigenschaften, ehrlich bewertet — damit du genau weißt, was dich erwartet.","Six characteristics, honestly rated — so you know exactly what to expect.","Altı özellik, dürüstçe değerlendirildi — seni neyin beklediğini tam olarak bil.")}</p>
        </div>
        <div className="taste-grid">
          <div className="reveal">
            <div className="frame aspect-1x1 parallax" data-cur="img" data-cur-label={tr("Ansehen","View","Gör")}>
              <BlurImg src="/assets/scene-2.jpg" alt={tr("Ein Löffel Manduraa mit den gemischten Zutaten.","A spoon of Manduraa with the blended ingredients.","Harmanlanmış malzemelerle bir kaşık Manduraa.")} />
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
  useLang();
  const items = [
    { t: tr("Versand in 48 Stunden","48-hour shipping","48 saatte kargo"), d: tr("Aus unserem Atelier in die EU & UK.","From our atelier to the EU & UK.","Atölyemizden AB & İngiltere'ye."),
      svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 13 V 7 H 14 V 17 H 3 Z"/><path d="M14 10 H 19 L 21 13 V 17 H 14 Z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg> },
    { t: tr("Sichere Bezahlung","Secure payment","Güvenli ödeme"), d: "Apple Pay, Klarna, Visa, AmEx, SEPA.",
      svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 11 H 21"/></svg> },
    { t: tr("30 Tage Rückgabe","30-day return","30 gün iade"), d: tr("Gefällt's nicht? Schick es zurück, ohne Fragen.","Don't love it? Send it back, no questions.","Sevmedin mi? Geri gönder, soru sorulmaz."),
      svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 12 a 8 8 0 1 0 3-6"/><path d="M3 4 L 7 6 L 5 10"/></svg> },
    { t: tr("Concierge-Support","Concierge support","Concierge desteği"), d: tr("Echte Menschen, wirklich schnell. WhatsApp & E-Mail.","Real humans, real fast. WhatsApp & email.","Gerçek insanlar, gerçekten hızlı. WhatsApp & e-posta."),
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
  useLang();
  const FAQS = getFaqs();
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="block faq">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow reveal">{tr("— FAQ","— FAQ","— SSS")}</span>
          <h2 className="reveal delay-1" key={tr("de","en","tr")}><SplitText text={tr("Häufige Fragen.","Common questions.","Sık sorulan sorular.")} /></h2>
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
  useLang();
  return (
    <section className="guarantee" aria-label={tr("Erste-Tasse-Versprechen","First-cup promise","İlk fincan sözü")}>
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
              <text fill="#B07A52" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="13" textAnchor="middle" y="-2">{tr("Erste","First","İlk")}</text>
              <text fill="#B07A52" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="13" textAnchor="middle" y="13">{tr("Tasse","cup","fincan")}</text>
              <line x1="-14" y1="20" x2="14" y2="20" stroke="#B07A52" strokeWidth="0.5" />
            </g>
          </svg>
        </div>
        <div className="g-body">
          <span className="eyebrow">{tr("— Das Erste-Tasse-Versprechen","— The first-cup promise","— İlk fincan sözü")}</span>
          <h3 key={tr("de","en","tr")}>
            {tr(<>Wenn dich der erste Schluck nicht <em className="italic">überrascht</em>,<br/>antworte mir auf diese Mail.</>,
                <>If the first sip doesn't <em className="italic">surprise</em> you,<br/>just reply to this email.</>,
                <>İlk yudum seni <em className="italic">şaşırtmazsa</em>,<br/>bu e-postaya yanıt ver.</>)}
          </h3>
          <p>
            {tr("30 Tage. Kein Fragebogen, kein Versandlabel-Theater. Ich erstatte dich persönlich — bis zur Tasche, die du schon halb leer hast. Wer Tradition verkauft, darf bei der Rückgabe nicht kleinlich werden.","30 days. No questionnaire, no shipping-label theatre. I'll refund you personally — even the pouch you've already half-emptied. Anyone who sells tradition shouldn't be stingy about returns.","30 gün. Anket yok, kargo etiketi tiyatrosu yok. Seni bizzat iade ederim — yarısını bitirdiğin paketi bile. Gelenek satan, iadede cimri olmamalı.")}
          </p>
          <div className="g-meta">
            <div className="g-sig">
              <span className="sig-script">Esmee</span>
              <span className="sig-line">{tr("— Esmee · Gründerin","— Esmee · Founder","— Esmee · Kurucu")}</span>
            </div>
            <ul className="g-points">
              <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>{tr("30 Tage volle Rückerstattung","30-day full refund","30 gün tam iade")}</li>
              <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>{tr("Persönliche Antwort von Esmee","Personal reply from Esmee","Esmee'den kişisel yanıt")}</li>
              <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>{tr("Versand in 48 h","Ships in 48 h","48 saatte kargo")}</li>
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
  useLang();
  return (
    <section className="final">
      <div className="inner">
        <span className="eyebrow reveal" style={{ color: "var(--copper-soft)" }}>{tr("— Beginne das Ritual","— Begin the ritual","— Ritüele başla")}</span>
        <h2 className="reveal delay-1" key={tr("de","en","tr")}>
          <SplitText text={tr("Eine bessere Tasse,","A better cup,","Daha iyi bir fincan,")} />
          <br/>
          <em className="italic"><SplitText text={tr("jeden Morgen.","every morning.","her sabah.")} delay={0.3} /></em>
        </h2>
        <p className="reveal delay-2">
          {tr("Eine Mischung, sechs Zutaten, null raffinierter Zucker. Von Hand gemischt und zu dir nach Hause geliefert.","One blend, six ingredients, zero refined sugar. Hand-blended and delivered to your door.","Tek harman, altı malzeme, sıfır rafine şeker. Elde harmanlanır ve kapına teslim edilir.")}
        </p>
        <div className="cta-row reveal delay-3">
          <button className="btn btn-primary" data-cur="btn" data-cur-label="Shop" onMouseMove={onMagnetMove} onClick={onShop}>{tr("Manduraa kaufen","Shop Manduraa","Manduraa al")} · €{price || 28}</button>
          <a href="#story-intro" className="btn btn-ghost" data-cur="btn" data-cur-label={tr("Lesen","Read","Oku")}>{tr("Die Story lesen","Read the story","Hikâyeyi oku")}</a>
        </div>
        <div className="final-subline reveal delay-3" aria-label={tr("Risiko-Umkehr","Risk reversal","Risk tersine")}>
          <span>{tr("0 g raffinierter Zucker · 6 Zutaten","0 g refined sugar · 6 ingredients","0 g rafine şeker · 6 malzeme")}</span>
          <span className="sep"></span>
          <span>{tr("30-Tage-Erste-Tasse-Versprechen","30-day first-cup promise","30 gün ilk fincan sözü")}</span>
          <span className="sep"></span>
          <span>{tr("Versand in 48 h · gratis ab €60","Ships in 48 h · free over €60","48 saatte kargo · €60 üzeri ücretsiz")}</span>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CART DRAWER
   ============================================================ */
function getAddons() {
  return [
  {
    id: "spoon",
    name: tr("Hand-Löffel · Olivenholz","Hand spoon · olive wood","El kaşığı · zeytin ağacı"),
    sub: tr("Hand-geschnitzt · Apulien · 14 cm","Hand-carved · Apulia · 14 cm","Elde oyulmuş · Apulia · 14 cm"),
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
    name: tr("Hand­geschriebene Karte","Handwritten card","El yazısı kart"),
    sub: tr("Bauwoll-Karton · Wachssiegel · Esmee-Signatur","Cotton card · wax seal · Esmee signature","Pamuk karton · mum mühür · Esmee imzası"),
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
    name: tr("Keramik-Becher · Edition № 01","Ceramic mug · Edition № 01","Seramik kupa · Edition № 01"),
    sub: tr("Hand-glasiert · Limitiert auf 200 Stück","Hand-glazed · Limited to 200","Elde sırlanmış · 200 adetle sınırlı"),
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
}
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
  useLang();
  const ADDONS = getAddons();
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
          <h3>{tr("Dein Warenkorb","Your bag","Sepetin")}</h3>
          <button className="close" data-cur="btn" data-cur-label={tr("Schließen","Close","Kapat")} onClick={onClose}>{tr("Schließen","Close","Kapat")} ✕</button>
        </div>
        <div className="items">
          {items.length === 0 && (
            <div className="cart-empty">
              <span className="serif">{tr("Dein Warenkorb ist still.","Your bag is quiet.","Sepetin sessiz.")}</span>
              <p>{tr("Füge einen Beutel Manduraa hinzu, um das Ritual zu beginnen.","Add a pouch of Manduraa to begin the ritual.","Ritüele başlamak için bir paket Manduraa ekle.")}</p>
              <a className="quiet-cta" data-cur="btn" data-cur-label={tr("Shop","Shop","Mağaza")} href="#shop" onClick={onClose}>{tr("Manduraa entdecken","Browse Manduraa","Manduraa'ya göz at")}</a>
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
                    <button className="rm" onClick={() => onRemove(idx)}>{tr("Entfernen","Remove","Kaldır")}</button>
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
                  {it.packLabel} · {it.packCount * it.qty} {tr("Beutel","pouches","paket")}
                  {it.subActive && <span className="abo-chip"> · {tr("Abo","Sub","Abone")} {it.plan === "60" ? tr("alle 60 Tage","every 60 days","her 60 günde") : tr("alle 30 Tage","every 30 days","her 30 günde")} · −15 %</span>}
                  {it.gift && <span className="gift-chip"> · {tr("Geschenk","Gift","Hediye")} +€{it.giftFee || 6}</span>}
                </div>
                <div className="qty-mini">
                  <button onClick={() => onQty(idx, Math.max(1, it.qty - 1))}>—</button>
                  <span className="v">{it.qty}</span>
                  <button onClick={() => onQty(idx, it.qty + 1)}>+</button>
                </div>
              </div>
              <div className="right">
                <div className="price">€{money(it.unitPrice * it.qty * it.packCount)}</div>
                <button className="rm" onClick={() => onRemove(idx)}>{tr("Entfernen","Remove","Kaldır")}</button>
              </div>
            </div>
          );})}
        </div>
        <div className="foot-bar">
          {hasItems && (
            <div className="cart-addons">
              <div className="addon-label">{tr("— Vollende deine Bestellung","— Complete your order","— Siparişini tamamla")}</div>
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
                          ? <span className="check">{tr("✓ Hinzugefügt","✓ Added","✓ Eklendi")}</span>
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
                <div className="head">{tr("Füge 1 Beutel hinzu","Add 1 more pouch","1 paket daha ekle")} &mdash; {tr("spare €","save €","kargoda €")}{Math.round(remaining)}{tr(" beim Versand."," in shipping."," tasarruf et.")}</div>
                <div className="sub">{tr("Nur noch €","Just €","Ücretsiz kargoya yalnızca €")}{Math.round(remaining)}{tr(" bis zum kostenlosen Versand."," more for free shipping."," kaldı.")}</div>
              </div>
              <button className="nudge-cta" data-cur="btn" data-cur-label={tr("Hinzufügen","Add","Ekle")} onClick={onAddOne}>+ {tr("Hinzufügen","Add","Ekle")}</button>
            </div>
          )}
          {items.length > 0 && (
            <div className={"ship-progress ship-2 " + (free ? "free-on " : "") + (spoonFree ? "spoon-on " : "")}>
              <div className="label">
                <span>
                  {spoonFree
                    ? tr("Du erhältst den Olivenholz-Löffel gratis","You get the olive-wood spoon free","Zeytin ağacı kaşığı ücretsiz")
                    : free
                      ? tr("Komplimentärer Versand freigeschaltet","Free shipping unlocked","Ücretsiz kargo açıldı")
                      : tr("Komplimentärer Versand","Free shipping","Ücretsiz kargo")}
                </span>
                <em>€{Math.round(subtotal)} / €{SPOON_AT}</em>
              </div>
              <div className="bar">
                <div className="fill" style={{ width: pct + "%" }} />
                <span className="tick" style={{ left: (FREE_AT / SPOON_AT * 100) + "%" }} aria-label={tr("Versand frei","Free shipping","Ücretsiz kargo")}>
                  <span className={"tick-dot " + (free ? "hit" : "")}></span>
                  <span className="tick-label">€{FREE_AT}<br/>{tr("Versand","Shipping","Kargo")}</span>
                </span>
                <span className="tick" style={{ left: "100%" }} aria-label={tr("Löffel gratis","Free spoon","Ücretsiz kaşık")}>
                  <span className={"tick-dot " + (spoonFree ? "hit" : "")}></span>
                  <span className="tick-label">€{SPOON_AT}<br/>{tr("Löffel","Spoon","Kaşık")}</span>
                </span>
              </div>
              <div className="note">
                {spoonFree
                  ? tr("✓ Versand + Olivenholz-Löffel von Esmee — beides geht heute mit.","✓ Shipping + olive-wood spoon from Esmee — both included today.","✓ Kargo + Esmee'den zeytin ağacı kaşığı — bugün ikisi de dahil.")
                  : free
                    ? <>{tr("Noch ","","")}<strong>€{Math.round(remainingSpoon)}</strong>{tr(" bis zum gratis Olivenholz-Löffel."," more to the free olive-wood spoon."," ücretsiz zeytin ağacı kaşığına kaldı.")}</>
                    : <>{tr("Noch ","","")}<strong>€{Math.round(remaining)}</strong>{tr(" bis kostenloser Versand."," more to free shipping."," ücretsiz kargoya kaldı.")}</>}
              </div>
            </div>
          )}
          <div className="sub-row">
            <span className="l">{tr("Zwischensumme","Subtotal","Ara toplam")}</span>
            <span className="r">€<Counter to={subtotal} duration={400} key={subtotal} decimals={moneyDec} /></span>
          </div>
          <div className="ship-note">{tr("Versand & Steuern werden im Checkout berechnet","Shipping & taxes calculated at checkout","Kargo & vergiler ödemede hesaplanır")}</div>
          <button className="checkout" data-cur="btn" data-cur-label={tr("Bezahlen","Pay","Öde")} disabled={items.length === 0} onClick={onCheckout}>{tr("Zum Checkout","Checkout","Ödemeye geç")} →</button>
        </div>
      </aside>
    </>
  );
}

/* ============================================================
   STICKY MINI BUY-BAR
   ============================================================ */
function MiniBar({ visible, variant, total, fromPrice, onShop, onMagnetMove }) {
  useLang();
  return (
    <div className={"mini-bar " + (visible ? "in" : "")}>
      <div className="mini-thumb" style={{ backgroundImage: `url(${variant.image})` }} />
      <div className="mini-meta">
        <div className="mini-name">Manduraa · {variant.name}</div>
        <div className="mini-sub">Edition № 01 · {tr("ab","from","şu fiyattan")} €{fromPrice} / {tr("Packung","pack","paket")}</div>
      </div>
      <button className="mini-cta" data-cur="btn" data-cur-label={tr("Hinzufügen","Add","Ekle")} onMouseMove={onMagnetMove} onClick={onShop}>
        {tr("Jetzt kaufen","Buy now","Şimdi al")}
        <span className="p">€{total}</span>
      </button>
    </div>
  );
}

/* ---------- Floating WhatsApp widget — online concierge ---------- */
function WhatsAppWidget() {
  useLang();
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const PHONE = "905315670838";              // +90 531 567 08 38
  const PHONE_PRETTY = "+90 531 567 08 38";
  const msg = tr(
    "Hallo Esmee, ich habe eine Frage zu Manduraa.",
    "Hi Esmee, I have a question about Manduraa.",
    "Merhaba Esmee, Manduraa hakkında bir sorum var."
  );
  const waUrl = `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;

  // Gentle one-time teaser bubble after a few seconds (only if not opened).
  useEffect(() => {
    let shown = false;
    try { shown = sessionStorage.getItem("esmee.wa_teaser") === "1"; } catch (e) {}
    if (shown) return;
    const t = setTimeout(() => { setTeaser(true); try { sessionStorage.setItem("esmee.wa_teaser", "1"); } catch (e) {} }, 6000);
    const h = setTimeout(() => setTeaser(false), 14000);
    return () => { clearTimeout(t); clearTimeout(h); };
  }, []);

  const WaGlyph = ({ s = 30 }) => (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
      <path d="M16.02 3.2c-7.06 0-12.8 5.73-12.8 12.79 0 2.26.59 4.46 1.72 6.41L3.2 28.8l6.57-1.72a12.74 12.74 0 0 0 6.24 1.6h.01c7.05 0 12.79-5.74 12.79-12.8 0-3.42-1.33-6.63-3.75-9.05a12.7 12.7 0 0 0-9.04-3.63Zm0 23.32h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-4.03 1.06 1.07-3.93-.25-.4a10.56 10.56 0 0 1-1.62-5.64c0-5.86 4.77-10.63 10.64-10.63 2.84 0 5.51 1.11 7.52 3.12a10.56 10.56 0 0 1 3.11 7.52c0 5.87-4.77 10.64-10.63 10.64Zm5.83-7.96c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.71.16-.21.32-.82 1.04-1 1.25-.18.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.53-.71-.54l-.61-.01c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.66s1.14 3.08 1.3 3.29c.16.21 2.25 3.43 5.45 4.81.76.33 1.36.52 1.82.67.77.24 1.46.21 2.01.13.61-.09 1.89-.77 2.16-1.52.27-.74.27-1.38.19-1.51-.08-.13-.29-.21-.61-.37Z"/>
    </svg>
  );

  return (
    <div className={"wa-widget " + (open ? "open" : "")}>
      {/* Chat panel */}
      <div className="wa-panel" role="dialog" aria-label="WhatsApp" aria-hidden={!open}>
        <div className="wa-head">
          <span className="wa-avatar"><WaGlyph s={22} /></span>
          <div className="wa-id">
            <strong>Esmee · Manduraa</strong>
            <span className="wa-status"><i className="wa-online" />{tr("Online · antwortet meist sofort","Online · usually replies instantly","Çevrimiçi · genelde hemen yanıtlar")}</span>
          </div>
          <button className="wa-close" onClick={() => setOpen(false)} aria-label={tr("Schließen","Close","Kapat")}>×</button>
        </div>
        <div className="wa-body">
          <div className="wa-msg">
            <span className="wa-name">Esmee</span>
            {tr("Hallo! 👋 Schön, dass du da bist. Hast du eine Frage zu Manduraa, deiner Bestellung oder dem Abo? Schreib uns einfach.",
                "Hi there! 👋 Great to see you. Any question about Manduraa, your order or the subscription? Just message us.",
                "Merhaba! 👋 Geldiğine sevindik. Manduraa, siparişin veya abonelik hakkında bir sorun mu var? Bize yazman yeterli.")}
            <span className="wa-time">{tr("Jetzt","Now","Şimdi")}</span>
          </div>
        </div>
        <a className="wa-cta" href={waUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
          <WaGlyph s={20} />
          {tr("Auf WhatsApp chatten","Chat on WhatsApp","WhatsApp'tan yaz")}
        </a>
        <span className="wa-phone">{PHONE_PRETTY}</span>
      </div>

      {/* Teaser bubble */}
      {teaser && !open && (
        <button className="wa-teaser" onClick={() => { setOpen(true); setTeaser(false); }}>
          {tr("Fragen? Schreib uns 👋","Questions? Message us 👋","Sorun mu var? Bize yaz 👋")}
        </button>
      )}

      {/* Floating button */}
      <button
        className="wa-fab"
        onClick={() => { setOpen(o => !o); setTeaser(false); }}
        aria-label={tr("WhatsApp Chat öffnen","Open WhatsApp chat","WhatsApp sohbetini aç")}
      >
        <WaGlyph s={30} />
        <span className="wa-dot" aria-hidden="true" />
      </button>
    </div>
  );
}

/* ============================================================
   SPRINT 2/3 — Unboxing, Philosophy, Timeline, Reviews v2, Recovery
   ============================================================ */

/* ---------- Unboxing — pinned 5-step ---------- */
function getUnboxSteps() {
  return [
  {
    kicker: tr("Schritt 01 — Die Ankunft","Step 01 — The arrival","Adım 01 — Varış"),
    title: tr("Eine schwere Schachtel,\nmit Bedacht verschlossen.","A weighted box,\nclosed with intent.","Ağırlıklı bir kutu,\nözenle kapatılmış."),
    body: tr("Recycelter Kraftzellstoff, mit Kupferfolie geprägt. Schwerer, als du erwartest. Das erste Signal, dass dies keine Lieferung ist — es ist ein Brief.","Recycled kraft pulp, debossed in copper foil. Heavier than you expect. The first signal that this is not a delivery — it is a letter.","Geri dönüştürülmüş kraft hamuru, bakır folyo ile kabartmalı. Beklediğinden ağır. Bunun bir teslimat değil — bir mektup olduğunun ilk işareti."),
    meta: [[tr("Material","Material","Malzeme"), tr("Recycelter Kraft 350 g","Recycled kraft 350g","Geri dönüşüm kraft 350 g")], [tr("Verschluss","Closure","Kapanış"), tr("Kupferfolien-Prägung","Copper foil emboss","Bakır folyo kabartma")], [tr("CO₂","Carbon","Karbon"), tr("Ausgeglichen · DHL GoGreen","Offset · DHL GoGreen","Dengelenmiş · DHL GoGreen")]],
  },
  {
    kicker: tr("Schritt 02 — Das erste Öffnen","Step 02 — The first opening","Adım 02 — İlk açılış"),
    title: tr("Der Deckel hebt sich —\nlangsam.","The lid lifts —\nslowly.","Kapak kalkar —\nyavaşça."),
    body: tr("Ein Doppelfalz-Deckel mit einem einzigen Magnetverschluss. Er öffnet sich wie ein Buch, und wie ein Buch kannst du ihn behalten, wenn die Tasse längst leer ist.","A double-fold lid with a single magnetic clasp. It opens like a book, and like a book, you can keep it after the cup is gone.","Tek mıknatıslı kapaklı çift katlı bir kapak. Bir kitap gibi açılır ve bir kitap gibi, fincan bittikten sonra da saklayabilirsin."),
    meta: [[tr("Verschluss","Closure","Kapanış"), tr("Magnetverschluss","Magnetic clasp","Mıknatıslı kapak")], [tr("Wiederverwendung","Reuse","Tekrar kullanım"), tr("Eine Erinnerungsbox","A keepsake box","Hatıra kutusu")], [tr("Klang","Sound","Ses"), tr("Sanft · Papierrascheln","Soft · paper-rustle","Yumuşak · kâğıt hışırtısı")]],
  },
  {
    kicker: tr("Schritt 03 — Der innere Brief","Step 03 — The inner letter","Adım 03 — İçteki mektup"),
    title: tr("Cremefarbenes Seidenpapier,\nvon Hand gefaltet.","Cream tissue,\nfolded by hand.","Krem ipek kâğıt,\nelle katlanmış."),
    body: tr("Ein einzelnes Blatt säurefreies cremefarbenes Papier, gefaltet und in Kupfer mit dem Esmee-Zeichen gestempelt. Darunter eine handgeschriebene Karte von Esmee.","A single sheet of acid-free cream paper, folded and stamped in copper with the Esmee mark. Underneath, a handwritten card from Esmee.","Tek bir asitsiz krem kâğıt yaprağı, katlanmış ve Esmee mührüyle bakır damgalı. Altında, Esmee'den el yazısı bir kart."),
    meta: [[tr("Papier","Paper","Kâğıt"), tr("Baumwolllumpen, säurefrei","Cotton-rag, acid-free","Pamuk lifli, asitsiz")], [tr("Stempel","Stamp","Damga"), tr("Kupferfolie · handgepresst","Copper foil · hand-pressed","Bakır folyo · elle baskı")], [tr("Gefertigt von","Made by","Yapan"), tr("Ein Paar Hände","One pair of hands","Bir çift el")]],
  },
  {
    kicker: tr("Schritt 04 — Die Enthüllung","Step 04 — The reveal","Adım 04 — Açığa çıkış"),
    title: tr("Der Beutel,\nin seinem Bett.","The pouch,\nin its bed.","Paket,\nyatağında."),
    body: tr("Gebettet in weiche, rosa getönte Wolle. Von Hand mit einem einzigen cremefarbenen Leinenband gebunden. Der Beutel ist schwerer, als die Schachtel vermuten ließ.","Laid in soft rose-tone wool. Hand-tied with a single cream linen ribbon. The pouch is heavier than the box suggested.","Yumuşak, pembe tonlu yüne yatırılmış. Tek bir krem keten kurdeleyle elle bağlanmış. Paket, kutunun ima ettiğinden daha ağır."),
    meta: [[tr("Beutel","Pouch","Paket"), tr("250 g · wiederverschließbar","250 g · resealable","250 g · yeniden kapanabilir")], [tr("Bett","Bed","Yatak"), tr("Recycelte Wolle, Rosé","Recycled wool, rose","Geri dönüşüm yün, pembe")], [tr("Gebunden von","Tied by","Bağlayan"), tr("Esmee · immer","Esmee · always","Esmee · her zaman")]],
  },
  {
    kicker: tr("Schritt 05 — Die Karte","Step 05 — The card","Adım 05 — Kart"),
    title: tr("Und eine Notiz,\nfür dich.","And a note,\nfor you.","Ve bir not,\nsenin için."),
    body: tr("Von Hand auf eine kleine cremefarbene Karte geschrieben. Immer signiert, immer anders. Fünf Sekunden, in denen jemand, den du nie getroffen hast, an dich denkt.","Handwritten on a small cream card. Always signed, always different. Five seconds of someone you've never met thinking of you.","Küçük bir krem karta el yazısıyla yazılmış. Her zaman imzalı, her zaman farklı. Hiç tanımadığın birinin seni düşündüğü beş saniye."),
    meta: [[tr("Karte","Card","Kart"), tr("Handgeschrieben","Hand-written","El yazısı")], [tr("Signiert","Signed","İmza"), "— E"], [tr("Ton","Tone","Ton"), tr("Warm","Warm","Sıcak")]],
  },
  ];
}

function Unboxing() {
  useLang();
  const UNBOX_STEPS = getUnboxSteps();
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
                <span className="foil">Edition N° 01<small>— Esmee · Manduraa</small></span>
              </div>
              <div className="pouch" style={{ backgroundImage: "url(/assets/scene-6.jpg)" }} />
              <div className="card">
                {tr("Willkommen bei Esmee.","Welcome to Esmee.","Esmee'ye hoş geldin.")}<br/>
                {tr("Genieße deine erste Tasse.","Enjoy your first cup.","İlk fincanının tadını çıkar.")}
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
  { tag: "Most loved", q: "I've replaced my afternoon oat-milk latte completely. No crash, no sugar guilt, and the dates make it feel like dessert.", a: "Layla H.", c: "Curator · Berlin", s: 5, av: "/assets/scene-2.jpg" },
  { tag: "First-cup",  q: "The packaging alone is worth it — feels like opening a perfume. But the taste is what made me reorder. Quietly addictive.", a: "Maya R.", c: "Architect · London", s: 5, av: "/assets/scene-3.jpg" },
  { tag: "Long-term",  q: "Bought the 5-pack to share. Three of my friends signed up the same week. It's become our 4pm ritual.", a: "Sophie K.", c: "Writer · Paris", s: 5, av: "/assets/scene-4.jpg" },
  { tag: "Critical",   q: "Smaller than I expected for the price. But the cup itself — yes, three weeks in, I'm a believer.", a: "Ines D.", c: "Buyer · Madrid", s: 4, av: "/assets/scene-5.jpg" },
  { tag: "Most loved", q: "Subtle, elegant, never too sweet. The first hot drink that feels like a perfume.", a: "Yara N.", c: "Editor · Beirut", s: 5, av: "/assets/scene-6.jpg" },
];
function getMosaic() {
  return [
  { img: "/assets/scene-2.jpg", badge: tr("08:00 — langsamer Morgen","08:00 — slow morning","08:00 — yavaş sabah"), cls: "big" },
  { img: "/assets/scene-3.jpg", badge: "14:00", cls: "tall" },
  { img: "/assets/scene-4.jpg", badge: tr("Wochenende","weekend","hafta sonu"), cls: "" },
  { img: "/assets/scene-5.jpg", badge: tr("20:00 Absacker","20:00 nightcap","20:00 gece içkisi"), cls: "wide" },
  { img: "/assets/scene-6.jpg", badge: tr("erste Tasse","first cup","ilk fincan"), cls: "" },
  { img: "/assets/scene-1.jpg", badge: tr("Atelier","atelier","atölye"), cls: "tall" },
  ];
}
function ReviewsV2() {
  useLang();
  const MOSAIC = getMosaic();
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
          <span className="eyebrow reveal">{tr("— Edition № 01 · Neu","— Edition № 01 · New","— Edition № 01 · Yeni")}</span>
          <h2 className="display reveal delay-1" key={tr("de","en","tr")} style={{ fontSize: "clamp(40px, 5.6vw, 80px)", margin: "14px auto 0" }}>
            <SplitText text={tr("Sei unter","Be among","İlk")} /> <em className="italic"><SplitText text={tr("den Ersten.","the first.","tadanlardan ol.")} delay={0.25} /></em>
          </h2>
        </div>

        <div className="hero-review reveal delay-1">
          <span className="open-q">"</span>
          <blockquote>{tr("Mit Datteln gesüßt, nicht mit Zucker. Sechs Zutaten, von Hand gemischt in unserem Atelier. Du gehörst zu den Ersten, die sie probieren.","Sweetened with dates, not sugar. Six ingredients, hand-blended in our atelier. You're among the first to taste it.","Şekerle değil, hurmayla tatlandırılmış. Altı malzeme, atölyemizde elle harmanlanmış. Onu tadan ilk kişilerdensin.")}</blockquote>
          <div className="author-row">
            <div className="author-text">
              <strong>— Esmee</strong>
              <small>{tr("Gründerin · Esmee","Founder · Esmee","Kurucu · Esmee")}</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Recovery toast — abandoned cart with concrete recall (T-22) ---------- */
function RecoveryToast({ count, items, onOpen, onDismiss }) {
  useLang();
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
      ? tr(`Vor ${days} ${days === 1 ? "Tag" : "Tagen"}`, `${days} ${days === 1 ? "day" : "days"} ago`, `${days} gün önce`)
      : hours >= 1
        ? tr(`Vor ${hours} ${hours === 1 ? "Stunde" : "Stunden"}`, `${hours} ${hours === 1 ? "hour" : "hours"} ago`, `${hours} saat önce`)
        : tr("Gerade eben","Just now","Az önce");

  // Build a short summary of what's waiting
  const real = (items || []).filter(it => it.kind !== "addon");
  const firstItem = real[0];
  const pouches = real.reduce((s, it) => s + (it.packCount || 1) * (it.qty || 1), 0);
  const isAbo = real.some(it => it.subActive);

  return (
    <div className={"toast " + (show ? "in" : "")}>
      {timeLabel && <div className="t-kicker">— {timeLabel}</div>}
      <h5>{isAbo ? tr("Dein Abo wartet auf dich.","Your subscription is waiting.","Aboneliğin seni bekliyor.") : tr("Deine Tasse wartet auf dich.","Your cup is waiting.","Fincanın seni bekliyor.")}</h5>
      <p>
        {firstItem
          ? <>{pouches} {tr("Beutel","pouch(es)","paket")} Manduraa · {firstItem.variantName}{isAbo ? <> · {tr("Abo aktiv","Subscription active","Abone aktif")}</> : null} — {tr("genau wie du sie gelassen hast.","exactly as you left them.","tam bıraktığın gibi.")}</>
          : <>{count} {tr("Beutel warten — genau wie du sie gelassen hast.","pouches waiting — exactly as you left them.","paket bekliyor — tam bıraktığın gibi.")}</>}
      </p>
      <div className="actions">
        <button className="open-bag" data-cur="btn" data-cur-label={tr("Öffnen","Open","Aç")} onClick={openBag}>{tr("Bestellung fortsetzen","Continue order","Siparişe devam et")} →</button>
        <button className="dismiss" data-cur="btn" data-cur-label={tr("Ausblenden","Hide","Gizle")} onClick={close}>{tr("Später","Later","Sonra")}</button>
      </div>
    </div>
  );
}

/* ============================================================
   EMAIL GATE (T-21) — soft inline capture for first-cup discount
   ============================================================ */
function EmailGate({ onShop }) {
  useLang();
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
      <button type="button" className="eg-close" onClick={dismiss} aria-label={tr("Schließen","Close","Kapat")}>✕</button>
      {!done ? (
        <>
          <span className="eg-kicker">{tr("— Erste Tasse","— First cup","— İlk fincan")}</span>
          <h5>{tr("10 € auf deine erste Manduraa.","€10 off your first Manduraa.","İlk Manduraa'na 10 € indirim.")}</h5>
          <p>{tr("Trag deine Mail ein — wir schicken dir den Code und einen leisen Brief, kein Spam.","Enter your email — we'll send the code and a quiet letter, no spam.","E-postanı gir — kodu ve sakin bir mektup gönderelim, spam yok.")}</p>
          <form className="eg-form" onSubmit={submit} noValidate>
            <input
              type="email"
              placeholder={tr("deine@mail.de","you@email.com","sen@eposta.com")}
              value={email}
              onChange={e => { setEmail(e.target.value); setErr(false); }}
              autoComplete="email"
              aria-invalid={err}
            />
            <button type="submit">{tr("Code holen","Get the code","Kodu al")} →</button>
          </form>
          {err && <span className="eg-err">{tr("Bitte eine gültige E-Mail eintragen.","Please enter a valid email.","Lütfen geçerli bir e-posta gir.")}</span>}
          <div className="eg-foot">
            <span>{tr("Einlösbar 30 Tage · Eine pro Kundin · Versand inklusive ab €60","Valid 30 days · One per customer · Free shipping over €60","30 gün geçerli · Müşteri başına bir · €60 üzeri ücretsiz kargo")}</span>
          </div>
        </>
      ) : (
        <div className="eg-thanks">
          <span className="eg-kicker">{tr("— Willkommen","— Welcome","— Hoş geldin")}</span>
          <h5>{tr("Dein Code:","Your code:","Kodun:")} <span className="code">FIRSTCUP10</span></h5>
          <p>{tr("Wir haben ihn dir auch per Mail geschickt. Einlösbar im Checkout, gültig 30 Tage.","We've also emailed it to you. Redeemable at checkout, valid 30 days.","Sana e-posta ile de gönderdik. Ödemede kullanılır, 30 gün geçerli.")}</p>
          <button className="eg-shop" onClick={() => { dismiss(); onShop && onShop(); }}>{tr("Manduraa entdecken","Discover Manduraa","Manduraa'yı keşfet")} →</button>
        </div>
      )}
    </aside>
  );
}

/* ---------- Spec sheet — As composed ---------- */
function getSpec() {
  return [
  { name: tr("Medjool-Dattel","Medjool Date","Medjool Hurması"),          color: "#7A4A2B", pct: 25, gram: "62 g" },
  { name: tr("Marcona-Mandel","Marcona Almond","Marcona Bademi"),        color: "#D9B988", pct: 19, gram: "48 g" },
  { name: tr("Single-Origin-Arabica","Single-origin Arabica","Tek Kaynak Arabica"), color: "#3E2719", pct: 13, gram: "32 g" },
  { name: tr("Antep-Pistazie","Antep Pistachio","Antep Fıstığı"),       color: "#7A8C4F", pct: 10, gram: "26 g" },
  { name: tr("Kakaonib","Cocoa Nib","Kakao Nibi"),             color: "#4E3322", pct:  7, gram: "18 g" },
  { name: tr("Grüner Kardamom","Green Cardamom","Yeşil Kakule"),        color: "#A48A53", pct:  2, gram: "4 g"  },
  { name: tr("Meersalz · Spur","Sea salt · trace","Deniz tuzu · eser"),      color: "#E2D2C2", pct:  0.3, gram: "<1 g" },
  ];
}
function SpecSheet() {
  useLang();
  const SPEC = getSpec();
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
          <span className="eyebrow reveal">{tr("— Die volle Rezeptur","— The full recipe","— Tam tarif")}</span>
          <h2 className="display reveal delay-1" key={tr("de","en","tr")} style={{ fontSize: "clamp(40px, 5.6vw, 80px)", margin: "14px auto 0" }}>
            <SplitText text={tr("Das ganze Rezept,","The full recipe,","Tüm tarif,")} /> <em className="italic"><SplitText text={tr("aufgeschrieben.","written down.","yazıya dökülmüş.")} delay={0.3} /></em>
          </h2>
          <p className="reveal delay-2" style={{ margin: "22px auto 0", maxWidth: "52ch", fontSize: 15, lineHeight: 1.75, color: "var(--grain)" }}>
            {tr("Wir zeigen, was die meisten verschweigen: die volle Rezeptur pro Gramm, jede Zahl pro Tasse. Edition № 01 · Manduraa Original · 250-g-Beutel.","We show what most hide: the full recipe by gram, every number per cup. Edition № 01 · Manduraa Original · 250 g pouch.","Çoğunun gizlediğini gösteriyoruz: gram gram tüm tarif, fincan başına her sayı. Edition № 01 · Manduraa Original · 250 g paket.")}
          </p>
        </div>

        <div className="grid">
          <div className="pouch-card reveal">
            <div className="top">
              <BlurImg src="/assets/scene-6.jpg" alt={tr("Der Manduraa-Beutel, von Hand gebunden.","The Manduraa pouch, hand-tied.","Manduraa paketi, elle bağlanmış.")} />
              <span className="lock-tag">№ 01 · 250 g</span>
            </div>
            <div className="body">
              <h3>Manduraa <em className="italic">Original</em></h3>
              <p>{tr("Eine Charge, eine Saison. Von Hand in unserem Atelier gemischt und mit cremefarbenem Leinenband gebunden.","Single-batch, single-season. Hand-blended in our atelier and tied with cream linen ribbon.","Tek parti, tek mevsim. Atölyemizde elle harmanlanmış ve krem keten kurdeleyle bağlanmış.")}</p>
              <div className="badges">
                <span className="badge">Vegan</span>
                <span className="badge">{tr("Glutenfrei","Gluten-free","Glutensiz")}</span>
                <span className="badge">{tr("Eine Farm","Single-farm","Tek çiftlik")}</span>
                <span className="badge">{tr("Recycelbarer Beutel","Recyclable pouch","Geri dönüşümlü paket")}</span>
                <span className="badge">{tr("Ohne Zusätze","No additives","Katkısız")}</span>
              </div>
            </div>
          </div>
          <div className="table-wrap reveal delay-1" ref={ref}>
            <h3>{tr("Zutaten · 250-g-Beutel","Ingredients · 250 g pouch","İçindekiler · 250 g paket")}</h3>
            <span className="sub">{tr("— Edition N° 01 · Charge 124","— Edition N° 01 · Batch 124","— Edition N° 01 · Parti 124")}</span>
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
              <h4>{tr("Pro Tasse · 7-g-Portion","Per cup · 7 g serving","Fincan başına · 7 g porsiyon")}</h4>
              <div className="nut-grid">
                <div className="nut-cell"><span className="k">{tr("Energie","Energy","Enerji")}</span><span className="v">28<small>kcal</small></span></div>
                <div className="nut-cell"><span className="k">{tr("Zucker","Sugars","Şeker")}</span><span className="v">2.6<small>{tr("g · aus Datteln","g · from dates","g · hurmadan")}</small></span></div>
                <div className="nut-cell"><span className="k">{tr("Raffinierter Zucker","Refined sugar","Rafine şeker")}</span><span className="v">0<small>g</small></span></div>
                <div className="nut-cell"><span className="k">{tr("Koffein","Caffeine","Kafein")}</span><span className="v">38<small>mg</small></span></div>
                <div className="nut-cell"><span className="k">{tr("Protein","Protein","Protein")}</span><span className="v">0.9<small>g</small></span></div>
                <div className="nut-cell"><span className="k">{tr("Fett","Fat","Yağ")}</span><span className="v">1.4<small>{tr("g · gute Fette","g · good fats","g · iyi yağlar")}</small></span></div>
                <div className="nut-cell"><span className="k">{tr("Ballaststoffe","Fibre","Lif")}</span><span className="v">0.8<small>g</small></span></div>
                <div className="nut-cell"><span className="k">{tr("Magnesium","Magnesium","Magnezyum")}</span><span className="v">14<small>{tr("mg · 4 % RM","mg · 4% RI","mg · %4 RI")}</small></span></div>
              </div>
              <div className="footer-row">
                <span><strong>{tr("Allergene:","Allergens:","Alerjenler:")}</strong> {tr("Mandeln, Pistazien.","almonds, pistachios.","badem, fıstık.")}</span>
                <span><strong>{tr("Mindestens haltbar bis:","Best by:","Son kullanma:")}</strong> 06 / 2026</span>
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
  useLang();
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
      <span className="kicker">{tr("— Bevor du gehst","— Before you go","— Gitmeden önce")}</span>
      <h5>{tr("10 €. Auf deinen ersten Beutel.","€10. On your first pouch.","10 €. İlk paketine.")}</h5>
      <p>{tr("Eine kleine Einladung. Nutze den Code im Checkout — gültig für die nächsten 30 Tage, ohne Ablaufspielchen.","A small invitation. Use the code at checkout — valid for the next 30 days, no expiry games.","Küçük bir davet. Kodu ödemede kullan — önümüzdeki 30 gün geçerli, son kullanma oyunu yok.")}</p>
      <span className="code">FIRSTCUP10</span>
      <div className="actions">
        <button className="shop" data-cur="btn" data-cur-label={tr("Shop","Shop","Mağaza")} onClick={goShop}>{tr("Jetzt kaufen","Shop now","Şimdi al")} →</button>
        <button className="dismiss" data-cur="btn" data-cur-label={tr("Ausblenden","Hide","Gizle")} onClick={close}>{tr("Vielleicht später","Maybe later","Belki sonra")}</button>
      </div>
    </div>
  );
}

/* ---------- Tab title attention pulse ---------- */
function useTabAttention() {
  useEffect(() => {
    const original = document.title;
    const tease = tr("↩ Manduraa wartet noch · Esmee", "↩ Manduraa is still waiting · Esmee", "↩ Manduraa hâlâ bekliyor · Esmee");
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
  useLang();
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
          <span className="eyebrow reveal">{tr("— Vergleiche dich","— Compare yourself","— Kendini kıyasla")}</span>
          <h2 className="reveal delay-1" key={tr("de","en","tr")}>
            <SplitText text={tr("Wie viel","How much","Yılın ne")} /> <em className="italic"><SplitText text={tr("Zucker steckt","sugar does","kadar şeker")} delay={0.3} /></em> <SplitText text={tr("in deinem Jahr?","your year hold?","tutuyor?")} delay={0.55} />
          </h2>
          <p className="reveal delay-2">
            {tr("Bewege den Regler. Wir zeigen dir, wie viel raffinierten Zucker du im Jahr trinkst — und wie viel du dir mit Manduraa sparst.","Move the slider. We'll show you how much refined sugar you drink in a year — and how much Manduraa saves you.","Kaydırıcıyı hareket ettir. Bir yılda ne kadar rafine şeker içtiğini — ve Manduraa ile ne kadarını azalttığını gösterelim.")}
          </p>
        </div>
        <div className="grid">
          <div className="panel reveal">
            <h3>{tr("Deine Woche, ehrlich","Your week, honestly","Haftanı dürüstçe")}</h3>
            <div className="label">
              <span>{tr("Kaffee · Latte · Energydrinks pro Woche","Coffee · latte · energy drinks per week","Haftada kahve · latte · enerji içeceği")}</span>
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
                <span className="tag">{tr("— Dein Jahr jetzt","— Your year now","— Şimdiki yılın")}</span>
                <span className="val"><Counter to={yearlyKg} duration={500} decimals={1} key={drinks} /><small>{tr("kg Zucker","kg sugar","kg şeker")}</small></span>
                <span className="sub">{tr("Über ","Across ","")}{drinks * 52}{tr(" Getränke · ≈ €"," drinks · ≈ €"," içecek · ≈ €")}<Counter to={yearlyEur} duration={500} key={"eur" + drinks} />{tr(" ausgegeben"," spent"," harcandı")}</span>
              </div>
              <div className="res-card us">
                <span className="tag">{tr("— Dein Jahr mit Manduraa","— Your year with Manduraa","— Manduraa ile yılın")}</span>
                <span className="val"><Counter to={0} duration={500} /><small>{tr("g Zucker","g sugar","g şeker")}</small></span>
                <span className="sub">{tr("Du würdest €","You'd save €","Yılda €")}<Counter to={saving > 0 ? saving : 0} duration={500} key={"save" + drinks} />{tr(" im Jahr sparen"," a year"," tasarruf edersin")}</span>
              </div>
            </div>
          </div>
          <div className="stack reveal delay-1">
            <div className="col them">
              <div className="label-top">{tr("Dein Jahr jetzt","Your year now","Şimdiki yılın")}<em>{yearlyKg} kg</em></div>
              {Array.from({ length: themHeight }).map((_, i) => (
                <span key={i} className="unit" style={{ animationDelay: (i * 0.02) + "s" }} />
              ))}
            </div>
            <div className="col us">
              <div className="label-top">{tr("Mit Manduraa","With Manduraa","Manduraa ile")}<em>0 g</em></div>
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
  useLang();
  const [now, setNow] = useState(() => new Date());
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const wrapRef = useRef(null);
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
  const local = new Date(now.getTime() + (1 * 60 * 60 * 1000) - (now.getTimezoneOffset() * 60 * 1000));
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const mm = String(local.getUTCMinutes()).padStart(2, "0");
  const onShift = +hh >= 8 && +hh < 18;
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
            {onShift ? tr("Atelier im Dienst","Atelier on shift","Atölye vardiyada") : tr("Atelier schläft · zurück um 09:00 CET","Atelier sleeps · back at 09:00 CET","Atölye uyuyor · 09:00 CET'te döner")}
            <span className="clock">{hh}:{mm} CET</span>
          </span>
          <span>{tr("In kleinen Chargen gemischt","Blended in small batches","Küçük partilerde harmanlanır")}</span>
        </div>

        <div className="signature-wrap">
          <span className="outline">Esmee</span>
          <span className="tag">{tr("— Esmee · gegründet 2024","— Esmee · founded 2024","— Esmee · kuruluş 2024")}</span>
        </div>

        <div className="nl-card">
          <div className="nl-text">
            <span className="nl-kicker">{tr("— Post von Esmee","— Letters from Esmee","— Esmee'den mektup")}</span>
            <h3>{tr("Briefe aus dem Atelier.","Letters from the atelier.","Atölyeden mektuplar.")}</h3>
            <p>{tr("Eine kurze Notiz einmal pro Saison: Geschichten von unseren Farmen und leise Einladungen zu Events in London und Paris.","A short note once a season: stories from our farms and quiet invitations to events in London and Paris.","Mevsimde bir kez kısa bir not: çiftliklerimizden hikâyeler ve Londra ve Paris'teki etkinliklere sessiz davetler.")}</p>
          </div>
          {!sent ? (
            <form className="nl-form" onSubmit={submit}>
              <div className="row">
                <input type="email" placeholder={tr("Deine E-Mail-Adresse","Your email address","E-posta adresin")} value={email} onChange={e => setEmail(e.target.value)} data-cur="text" />
                <button data-cur="btn" data-cur-label={tr("Senden","Send","Gönder")} type="submit"><span>{tr("Abonnieren","Subscribe","Abone ol")}</span><span aria-hidden="true">→</span></button>
              </div>
              <span className="micro">{tr("Niemals Spam. Abmeldung mit einem Klick.","No spam, ever. Unsubscribe in one click.","Asla spam yok. Tek tıkla abonelikten çık.")}</span>
            </form>
          ) : (
            <div>
              <p className="nl-thanks">{tr("Danke. Ein erster Brief ist unterwegs.","Thank you. A first letter is on its way.","Teşekkürler. İlk mektup yola çıktı.")}</p>
              <span className="micro">{tr("Du gehörst zu den Ersten, die Esmee folgen.","You're among the first to follow Esmee.","Esmee'yi takip eden ilk kişilerdensin.")}</span>
            </div>
          )}
        </div>

        <div className="links-grid">
          <div>
            <h4>{tr("Produkt","Product","Ürün")}</h4>
            <ul>
              <li><a href="#shop">Manduraa Original<span className="arr">↗</span></a></li>
              <li><a href="#shop">Rose Cardamom<span className="arr">↗</span></a></li>
              <li><a href="#shop">{tr("Koffeinfrei","Caffeine-free","Kafeinsiz")}<span className="arr">↗</span></a></li>
              <li><a href="#shop">{tr("Mengenpakete","Bulk packs","Toplu paketler")}<span className="arr">↗</span></a></li>
            </ul>
          </div>
          <div>
            <h4>{tr("Über uns","About","Hakkımızda")}</h4>
            <ul>
              <li><a href="#story-intro">{tr("Die Gründerin","The founder","Kurucu")}<span className="arr">↗</span></a></li>
              <li><a href="#story-intro">{tr("Unsere Geschichte","Our story","Hikâyemiz")}<span className="arr">↗</span></a></li>
              <li><a href="#universe">{tr("Zutaten","Ingredients","İçindekiler")}<span className="arr">↗</span></a></li>
              <li><a href="#reviews">{tr("Wo es lebt","Where it lives","Nerede yaşar")}<span className="arr">↗</span></a></li>
            </ul>
          </div>
          <div>
            <h4>{tr("Service","Care","Destek")}</h4>
            <ul>
              <li><a href="#faq">{tr("FAQ","FAQ","SSS")}<span className="arr">↗</span></a></li>
              <li><a href="#faq">{tr("Versand & Rückgabe","Shipping & returns","Kargo & iade")}<span className="arr">↗</span></a></li>
              <li><a href="#faq">{tr("Concierge kontaktieren","Contact concierge","Concierge'e ulaş")}<span className="arr">↗</span></a></li>
              <li><a href="#faq">{tr("Großhandel","Wholesale","Toptan")}<span className="arr">↗</span></a></li>
            </ul>
          </div>
          <div>
            <h4>{tr("Folgen","Follow","Takip et")}</h4>
            <ul>
              <li><a href="#">Instagram<span className="arr">↗</span></a></li>
              <li><a href="#">TikTok<span className="arr">↗</span></a></li>
              <li><a href="#">Pinterest<span className="arr">↗</span></a></li>
              <li><a href="#">{tr("Spotify · Atelier-Playlist","Spotify · atelier playlist","Spotify · atölye çalma listesi")}<span className="arr">↗</span></a></li>
            </ul>
          </div>
        </div>

        <div className="bottom">
          <span>{tr("© 2026 — Von Hand gemischt · in Tradition von Beirut & Antakya","© 2026 — Hand-blended · in the tradition of Beirut & Antakya","© 2026 — Elde harmanlandı · Beyrut & Antakya geleneğinde")}</span>
          <span className="pay">
            {tr("Wir akzeptieren","We accept","Kabul ettiklerimiz")}
            <span>Apple Pay</span>
            <span>Klarna</span>
            <span>Visa</span>
            <span>AmEx</span>
            <span>SEPA</span>
          </span>
          <span>{tr("Datenschutz · AGB · Impressum","Privacy · Terms · Imprint","Gizlilik · Şartlar · Künye")}</span>
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
          tr("Demo-Modus: Verbinde einen Shopify-Store (siehe README / .env.example), um zur echten Kasse zu gehen.",
             "Demo mode: connect a Shopify store (see README / .env.example) to reach the real checkout.",
             "Demo modu: gerçek ödemeye ulaşmak için bir Shopify mağazası bağla (README / .env.example).")
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
        window.alert(tr("Keine Shopify-Artikel im Warenkorb.","No Shopify items in the cart.","Sepette Shopify ürünü yok."));
        return;
      }
      // Auto-apply the discount code matching the chosen pack tier (+ subscription).
      // Codes are created by scripts/setup-shopify-discounts.mjs; unknown codes are
      // safely ignored by Shopify (cart still checks out at full price).
      const codes = discountCodesForCart(cart);
      const url = await createCheckout(lines, codes);
      window.location.href = url;
    } catch (e) {
      window.alert(tr("Checkout fehlgeschlagen: ","Checkout failed: ","Ödeme başarısız: ") + ((e && e.message) || e));
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
        <Benefits />
        <Shop onAdd={addToCart} onMagnetMove={onMagnetMove} onTap={audio.playTap} liveVariants={liveVariants} sellingPlans={sellingPlans} />
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
      <WhatsAppWidget />
    </div>
  );
}

export default App;
