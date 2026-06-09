// @ts-nocheck
/* Esmee — Manduraa luxury storefront landing page.
   Faithfully ported from the Claude Design HTML/JS prototype to React + TS + Vite.
   Type-checking is disabled on this file because it is a 1:1 port of an
   imperative, DOM-driven prototype; runtime behaviour is the source of truth. */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { isShopifyConfigured, createCheckout, fetchVariants, fetchAddons, fetchSellingPlans } from "./lib/shopify";
import { tr, useLang, LANGS, LANG_LABEL } from "./i18n";
import { PaymentIcons } from "./PaymentIcons";

/* Language switcher — compact button + dropdown. DE / EN / TR (German default).
   The menu is portaled to <body> so the nav's overflow:hidden / backdrop-filter
   can never clip or cover it. */
function LangToggle({ compact }) {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const place = () => {
    const b = btnRef.current; if (!b) return;
    const r = b.getBoundingClientRect();
    setPos({ top: Math.round(r.bottom + 8), right: Math.round(window.innerWidth - r.right) });
  };
  useEffect(() => {
    if (!open) return;
    place();
    const onDoc = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onScroll = () => setOpen(false);
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);
  return (
    <div className={"lang-dd " + (open ? "open" : "")}>
      <button
        ref={btnRef}
        type="button"
        className="lang-dd-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Sprache / Language"
        onClick={() => setOpen(o => !o)}
      >
        <svg className="lang-globe" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12 H21" />
          <path d="M12 3 C 15 6, 15 18, 12 21 C 9 18, 9 6, 12 3 Z" />
        </svg>
        {LANG_LABEL[lang]}
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="lang-dd-menu"
          role="listbox"
          style={{ position: "fixed", top: pos.top, right: pos.right }}
        >
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              role="option"
              aria-selected={lang === l}
              className={"lang-dd-opt " + (lang === l ? "active" : "")}
              onClick={() => { setLang(l); setOpen(false); }}
            >
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>,
        document.body
      )}
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
// Two pouch sizes — drives the displayed price. On the live site the real
// Shopify variants override this; offline this is the fallback.
const VARIANTS = [
  {
    id: "250",
    name: "250 g",
    sub: "19,90 €",
    price: 19.90,
    swatch: "linear-gradient(135deg,#C4A893,#9B7B61)",
    image: "/assets/lifestyle-cezve-powder.jpeg",
    note: "decaf · date-sweetened",
  },
  {
    id: "500",
    name: "500 g",
    sub: "29,90 €",
    price: 29.90,
    swatch: "linear-gradient(135deg,#B58A66,#8A5E3C)",
    image: "/assets/lifestyle-cup-pouches.jpeg",
    note: "decaf · date-sweetened",
  },
];

// Product gallery — multiple photos shown in the shop image stage (thumbnails switch).
const PRODUCT_GALLERY = [
  "/assets/lifestyle-cezve-powder.jpeg",
  "/assets/lifestyle-cup-pouches.jpeg",
  "/assets/lifestyle-cup-almonds.jpeg",
  "/assets/lifestyle-pouch-tray.jpeg",
];

// Bulk packs — single purchase only (no subscriptions)
function getPacks() {
  return [
  { id: "1",  count: 1,  unit: 32, save: 0,  label: tr("1 Packung","1 pack","1 paket"),     sub: tr("≈ 10 Tassen","≈ 10 cups","≈ 10 fincan"),          badge: null },
  { id: "3",  count: 3,  unit: 28, save: 12, label: tr("3 Packungen","3 packs","3 paket"),   sub: tr("≈ 30 Tassen","≈ 30 cups","≈ 30 fincan"),          badge: tr("Beliebt","Popular","Popüler"),        badgeStyle: "copper", mostLoved: true },
  { id: "5",  count: 5,  unit: 25, save: 22, label: tr("5 Packungen","5 packs","5 paket"),   sub: tr("≈ 50 Tassen","≈ 50 cups","≈ 50 fincan"),        badge: tr("Bester Wert","Best value","En iyi değer"),       badgeStyle: "dark" },
  { id: "10", count: 10, unit: 22, save: 31, label: tr("10+ Packungen","10+ packs","10+ paket"), sub: tr("≈ 100 Tassen","≈ 100 cups","≈ 100 fincan"),        badge: tr("Bestpreis","Best price","En iyi fiyat"), badgeStyle: "copper" },
  ];
}

function getIngredients() {
  return [
  { name: tr("Datteln","Dates","Hurma"), short: tr("Datteln","Dates","Hurma"), note: tr("Natürliche Süße","Natural sweetness","Doğal tatlılık"), color: "#7A4A2B", angle: 18, r: 46,
    origin: tr("Naher Osten","Middle East","Orta Doğu"), season: tr("Kalium · Magnesium · Eisen","Potassium · magnesium · iron","Potasyum · magnezyum · demir"), grams: tr("Süße & Energie","Sweetness & energy","Tatlılık ve enerji"), img: "/assets/ing/dates.jpg",
    lede: tr("Die einzige Süße in der Tasse.","The only sweetness in the cup.","Fincandaki tek tatlılık."),
    body: tr("Datteln sind die einzige Süße in Manduraa — und ein natürlicher Energiespender. Sie liefern Ballaststoffe, Kalium, Magnesium und Eisen sowie Antioxidantien, die die Zellen schützen. Eine nährstoffreiche Alternative zu raffiniertem Zucker.","Dates are the only sweetness in Manduraa — and a natural source of energy. They bring fibre, potassium, magnesium and iron, plus antioxidants that protect the cells. A nutrient-rich alternative to refined sugar.","Hurma, Manduraa'daki tek tatlılık — ve doğal bir enerji kaynağı. Lif, potasyum, magnezyum ve demir ile hücreleri koruyan antioksidanlar sağlar. Rafine şekere besin değeri yüksek bir alternatif.")
  },
  { name: tr("Mandeln","Almonds","Badem"), short: tr("Mandeln","Almonds","Badem"), note: tr("Cremiger Körper","Creamy body","Kremsi gövde"), color: "#D9B988", angle: 80, r: 48,
    origin: tr("Mittelmeerraum","Mediterranean","Akdeniz"), season: tr("Vitamin E · Magnesium · Protein","Vitamin E · magnesium · protein","E vitamini · magnezyum · protein"), grams: tr("Cremiger Körper","Creamy body","Kremsi gövde"), img: "/assets/ing/almonds.png",
    lede: tr("Macht die Tasse cremig.","Makes the cup creamy.","Fincanı kremsi yapar."),
    body: tr("Mandeln geben der Tasse ihren cremigen Körper. Sie liefern einfach ungesättigte Fette, die das Herz unterstützen, viel Vitamin E als Zellschutz, dazu Magnesium, Ballaststoffe und pflanzliches Protein.","Almonds give the cup its creamy body. They bring heart-friendly monounsaturated fats, plenty of cell-protecting vitamin E, plus magnesium, fibre and plant protein.","Badem, fincana kremsi gövdesini verir. Kalbi destekleyen tekli doymamış yağlar, hücre koruyucu bol E vitamini, ayrıca magnezyum, lif ve bitkisel protein sağlar.")
  },
  { name: tr("Haselnüsse","Hazelnuts","Fındık"), short: tr("Haselnuss","Hazelnut","Fındık"), note: tr("Nussige Tiefe","Nutty depth","Fındıksı derinlik"), color: "#9C6B3F", angle: 142, r: 45,
    origin: tr("Schwarzmeer-Region · Türkei","Black Sea region · Türkiye","Karadeniz · Türkiye"), season: tr("Vitamin E · Magnesium · Ballaststoffe","Vitamin E · magnesium · fibre","E vitamini · magnezyum · lif"), grams: tr("Nussige Tiefe","Nutty depth","Fındıksı derinlik"), img: "/assets/ing/hazelnuts.jpg",
    lede: tr("Nussige, runde Tiefe.","Nutty, rounded depth.","Fındıksı, yuvarlak derinlik."),
    body: tr("Haselnüsse bringen eine warme, nussige Tiefe und einfach ungesättigte Fette, die das Herz unterstützen. Dazu Vitamin E als starkes Antioxidans, Magnesium, Ballaststoffe und pflanzliches Eiweiß.","Hazelnuts bring a warm, nutty depth and heart-friendly monounsaturated fats. Plus vitamin E as a strong antioxidant, magnesium, fibre and plant protein.","Fındık, sıcak ve fındıksı bir derinlik ile kalbi destekleyen tekli doymamış yağlar getirir. Güçlü bir antioksidan olan E vitamini, magnezyum, lif ve bitkisel protein de katar.")
  },
  { name: tr("Pistazien","Pistachios","Antep Fıstığı"), short: tr("Pistazien","Pistachios","Fıstık"), note: tr("Nussig & fein salzig","Nutty & lightly salty","Fındıksı ve hafif tuzlu"), color: "#7A8C4F", angle: 210, r: 47,
    origin: tr("Antep · Türkei","Antep · Türkiye","Antep · Türkiye"), season: tr("Vitamin B6 · Kalium · Protein","Vitamin B6 · potassium · protein","B6 vitamini · potasyum · protein"), grams: tr("Feine Salzkante","Fine salt-edge","İnce tuz dokunuşu"), img: "/assets/ing/pistachios.jpg",
    lede: tr("Nussig, leicht salzig.","Nutty, lightly salty.","Fındıksı, hafif tuzlu."),
    body: tr("Pistazien geben eine feine, leicht salzige Nussigkeit — die Kante, die die Datteln wie Dessert schmecken lässt. Reich an gesunden Fetten, Ballaststoffen, Protein, Vitamin B6 fürs Nervensystem und Kalium.","Pistachios add a fine, lightly salty nuttiness — the edge that makes the dates taste like dessert. Rich in healthy fats, fibre, protein, nerve-supporting vitamin B6 and potassium.","Fıstık, ince ve hafif tuzlu bir fındıksılık katar — hurmaları tatlı gibi gösteren o dokunuş. Sağlıklı yağlar, lif, protein, sinir sistemine iyi gelen B6 vitamini ve potasyum açısından zengindir.")
  },
  { name: tr("Kakao","Cocoa","Kakao"), short: tr("Kakao","Cocoa","Kakao"), note: tr("Bitterer Schoko-Ton","Bitter chocolate note","Acı çikolata"), color: "#4E3322", angle: 272, r: 46,
    origin: tr("Edelkakao","Fine cocoa","Kakao"), season: tr("Flavonoide · Magnesium","Flavonoids · magnesium","Flavonoidler · magnezyum"), grams: tr("Schoko-Tiefe","Chocolate depth","Çikolata derinliği"), img: "/assets/ing/cocoa.jpg",
    lede: tr("Ein bitterer Schoko-Ton.","A bitter chocolate note.","Acı bir çikolata notası."),
    body: tr("Kakao bringt einen bitteren Schokoladen-Ton und wertvolle Flavonoide — starke Antioxidantien, die Herz und Durchblutung unterstützen und sogar die Stimmung heben, weil sie Glückshormone fördern. Dazu Magnesium für Muskeln und Nerven.","Cocoa brings a bitter chocolate note and valuable flavonoids — strong antioxidants that support the heart and circulation and even lift the mood by encouraging feel-good hormones. Plus magnesium for muscles and nerves.","Kakao, acı bir çikolata notası ve değerli flavonoidler getirir — kalbi ve dolaşımı destekleyen, mutluluk hormonlarını artırarak ruh hâlini bile yükselten güçlü antioksidanlar. Ayrıca kaslar ve sinirler için magnezyum.")
  },
  { name: tr("Entkoffeinierter Kaffee","Decaf Coffee","Kafeinsiz Kahve"), short: tr("Kaffee","Coffee","Kahve"), note: tr("Aroma ohne Koffein","Flavour, no caffeine","Kafeinsiz aroma"), color: "#3E2719", angle: 330, r: 47,
    origin: tr("Hochland-Arabica","Highland arabica","Yüksek rakım arabica"), season: tr("Antioxidantien · 97 % koffeinfrei","Antioxidants · 97% caffeine-free","Antioksidan · %97 kafeinsiz"), grams: tr("Kein Herzrasen","No jitters","Çarpıntı yok"), img: "/assets/ing/coffee.jpg",
    lede: tr("Kaffee-Aroma, ganz ohne Koffein.","Coffee aroma, with no caffeine.","Kahve aroması, kafeinsiz."),
    body: tr("Entkoffeinierter Kaffee gibt das vertraute Aroma und wertvolle Antioxidantien — aber über 97 % des Koffeins sind entfernt. Kein Herzrasen, keine Nervosität, kein gestörter Schlaf. Auch am Abend und für koffeinempfindliche Menschen.","Decaf coffee gives the familiar aroma and valuable antioxidants — but over 97% of the caffeine is removed. No racing heart, no jitters, no disturbed sleep. Even in the evening and for caffeine-sensitive people.","Kafeinsiz kahve, tanıdık aromayı ve değerli antioksidanları verir — ama kafeinin %97'sinden fazlası alınmıştır. Çarpıntı yok, gerginlik yok, uyku bozukluğu yok. Akşam da, kafeine duyarlı kişiler için de uygun.")
  },
  { name: tr("Kokosmilchpulver","Coconut Milk Powder","Hindistan Cevizi Sütü Tozu"), short: tr("Kokos","Coconut","Kokos"), note: tr("Seidige Cremigkeit","Silky creaminess","İpeksi kremsilik"), color: "#E6D6BE", angle: 36, r: 46,
    origin: tr("Kokosnuss","Coconut","Hindistan cevizi"), season: tr("MCT-Fette · laktosefrei","MCT fats · lactose-free","MCT yağları · laktozsuz"), grams: tr("Seidig, ohne Milch","Silky, no dairy","İpeksi, sütsüz"), img: "/assets/ing/coconut.jpg",
    lede: tr("Macht die Tasse seidig — ohne Milch.","Makes the cup silky — no dairy.","Fincanı ipeksi yapar — sütsüz."),
    body: tr("Kokosmilchpulver macht jede Tasse seidig-cremig — ganz ohne Milch. Seine mittelkettigen Fettsäuren (MCT) liefern schnelle Energie, dazu kommen Kalium, Magnesium und Eisen. Laktosefrei und vegan.","Coconut milk powder makes every cup silky and creamy — with no dairy at all. Its medium-chain fatty acids (MCT) give quick energy, alongside potassium, magnesium and iron. Lactose-free and vegan.","Hindistan cevizi sütü tozu, her fincanı ipeksi ve kremsi yapar — hiç süt olmadan. Orta zincirli yağ asitleri (MCT) hızlı enerji verir; yanında potasyum, magnezyum ve demir. Laktozsuz ve vegan.")
  },
  { name: tr("Grüner Kardamom","Green Cardamom","Yeşil Kakule"), short: tr("Kardamom","Cardamom","Kakule"), note: tr("Aromatische Wärme","Aromatic warmth","Aromatik sıcaklık"), color: "#8A9A5B", angle: 8, r: 46,
    origin: tr("Kerala · Indien","Kerala · India","Kerala · Hindistan"), season: tr("Ätherische Öle · Antioxidantien","Essential oils · antioxidants","Uçucu yağ · antioksidan"), grams: tr("Aroma & Wärme","Aroma & warmth","Aroma ve sıcaklık"), img: "/assets/ing/cardamom.jpg",
    lede: tr("Warm und aromatisch.","Warm and aromatic.","Sıcak ve aromatik."),
    body: tr("Grüner Kardamom gibt der Tasse ihre warme, aromatische Tiefe. Schon kleine Mengen heben die Datteln und runden den Geschmack — traditionell wirkt er verdauungsfördernd und bringt eigene Antioxidantien mit.","Green cardamom gives the cup its warm, aromatic depth. Even small amounts lift the dates and round out the flavour — traditionally it aids digestion and brings antioxidants of its own.","Yeşil kakule, fincana sıcak ve aromatik derinliğini verir. Az miktarı bile hurmayı öne çıkarır ve tadı tamamlar — geleneksel olarak sindirime iyi gelir ve kendi antioksidanlarını katar.")
  },
  ];
}

function getBenefits() {
  return [
  { t: tr("Null raffinierter Zucker","Zero refined sugar","Sıfır rafine şeker"),   d: tr("Nur mit Medjool-Datteln gesüßt — keine Glukosespitzen, kein Absturz.","Sweetened only by Medjool dates — no glucose spikes, no crash.","Yalnızca Medjool hurmasıyla tatlandırılır — glikoz zirvesi yok, çöküş yok."), g: "leaf" },
  { t: tr("Sanfte Energie, kein Koffein","Gentle energy, no caffeine","Nazik enerji, kafeinsiz"),          d: tr("Datteln, Mandeln und Haselnüsse geben langsame, gleichmäßige Energie — der Kaffee ist entkoffeiniert. Kein Zucker-Hoch, kein Koffein-Absturz.","Dates, almonds and hazelnuts give slow, steady energy — and the coffee is decaffeinated. No sugar high, no caffeine crash.","Hurma, badem ve fındık yavaş ve dengeli enerji verir — kahve ise kafeinsiz. Şeker yükselişi yok, kafein çöküşü yok."), g: "spark" },
  { t: tr("Nährstoffdichte","Nutrient density","Besin yoğunluğu"),     d: tr("Pistazie, Mandel und Dattel liefern Magnesium, Kalium und Ballaststoffe pro Tasse.","Pistachio, almond and date deliver magnesium, potassium and fibre per cup.","Fıstık, badem ve hurma her fincanda magnezyum, potasyum ve lif sağlar."), g: "drop" },
  { t: tr("Magenfreundlich","Gut-friendly","Mideye dost"),         d: tr("Milchfrei, vegan, säurearm. Magenschonender als Espresso.","Dairy-free, vegan, low-acid. Easier on the stomach than espresso.","Sütsüz, vegan, düşük asit. Espressodan mideye daha hafif."), g: "circle" },
  { t: tr("Von Hand gemischt","Blended by hand","Elde harmanlanır"),    d: tr("In kleinen Chargen in unserer Manufaktur gemischt. Frisch, in kleinen Mengen.","Blended in small batches in our workshop. Fresh, in small quantities.","Mutfağımızda küçük partiler hâlinde harmanlanır. Taze, küçük miktarlarda."), g: "marker" },
  { t: tr("In 90 Sekunden fertig","Ready in 90 seconds","90 saniyede hazır"),  d: tr("Ein Löffel, heißes Wasser oder Milch. Keine Mühle. Kein Aufwand.","One scoop, hot water or milk. No grinder. No fuss.","Bir ölçek, sıcak su ya da süt. Değirmen yok. Zahmet yok."), g: "clock" },
  ];
}

function getRitual() {
  return [
  { n: "I",  t: tr("Dosieren","Measure","Ölç"),  c: tr("Ein Kupfer-Messlöffel Manduraa pro Tasse — 25 g, auf 45 ml Wasser.","One copper measuring spoon of Manduraa per cup — 25 g, to 45 ml of water.","Her fincan için bir bakır ölçü kaşığı Manduraa — 25 g, 45 ml suya."), img: "/assets/scene-6.jpg" },
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
  { name: tr("Koffein","Caffeine","Kafein"),  val: 1 },
  ];
}

function getFaqs() {
  return [
  { q: tr("Was steckt eigentlich in Manduraa?","What's actually in Manduraa?","Manduraa'da aslında ne var?"), a: tr("Acht Zutaten, mehr nicht: Datteln, Mandeln, Haselnüsse, Pistazien, Kakao, entkoffeinierter Kaffee, Kokosmilchpulver und grüner Kardamom. Kein raffinierter Zucker, keine Sirupe, keine Aromen, keine Konservierungsstoffe. Vegan und glutenfrei.","Eight ingredients, nothing else: dates, almonds, hazelnuts, pistachios, cocoa, decaffeinated coffee, coconut milk powder and green cardamom. No refined sugar, no syrups, no flavourings, no preservatives. Vegan and gluten-free.","Sekiz malzeme, başka hiçbir şey: hurma, badem, fındık, fıstık, kakao, kafeinsiz kahve, Hindistan cevizi sütü tozu ve yeşil kakule. Rafine şeker yok, şurup yok, aroma yok, koruyucu yok. Vegan ve glutensiz.") },
  { q: tr("Wie bereite ich es zu?","How do I prepare it?","Nasıl hazırlanır?"), a: tr("Ein Kupfer-Messlöffel (25 g) pro Tasse. Mit 45 ml heißem — nicht kochendem — Wasser glatt rühren, dann nach Geschmack mit heißem Wasser oder aufgeschäumter Milch aufgießen. Vor dem Trinken dreißig Sekunden ruhen lassen. Das ist das ganze Ritual.","One copper measuring spoon (25 g) per cup. Stir smooth with 45 ml of hot — not boiling — water, then top up with hot water or steamed milk to taste. Let it rest for thirty seconds before drinking. That's the entire ritual.","Her fincan için bir bakır ölçü kaşığı (25 g). 45 ml sıcak — kaynar değil — suyla pürüzsüz karıştır, ardından damak zevkine göre sıcak su ya da köpürtülmüş sütle tamamla. İçmeden önce otuz saniye dinlendir. Tüm ritüel bu kadar.") },
  { q: tr("Enthält es Koffein?","Does it contain caffeine?","Kafein içeriyor mu?"), a: tr("Kaum. Manduraa wird mit entkoffeiniertem Kaffee gemacht — über 97 % des Koffeins sind entfernt. Du bekommst das Kaffee-Aroma und die Antioxidantien, aber kein Herzrasen und keinen gestörten Schlaf. Auch abends und für koffeinempfindliche Menschen geeignet.","Barely. Manduraa is made with decaffeinated coffee — over 97% of the caffeine is removed. You get the coffee aroma and antioxidants, but no racing heart and no disturbed sleep. Suitable in the evening and for caffeine-sensitive people too.","Neredeyse hiç. Manduraa kafeinsiz kahveyle yapılır — kafeinin %97'sinden fazlası alınmıştır. Kahve aromasını ve antioksidanları alırsın ama çarpıntı ya da uyku bozukluğu olmaz. Akşam ve kafeine duyarlılar için de uygun.") },
  { q: tr("Welche Größen gibt es?","What sizes are available?","Hangi boyutlar var?"), a: tr("Manduraa gibt es in zwei Größen: 250 g für 19,90 € und 500 g für 29,90 €. Die Größe wählst du oben im Shop.","Manduraa comes in two sizes: 250 g for €19.90 and 500 g for €29.90. Pick the size in the shop above.","Manduraa iki boyutta gelir: 19,90 € için 250 g ve 29,90 € için 500 g. Boyutu yukarıdaki mağazadan seçersin.") },
  { q: tr("Wie lange reicht ein Beutel?","How long does a pouch last?","Bir paket ne kadar yeter?"), a: tr("Ein 250-g-Beutel ergibt etwa 10 Tassen, ein 500-g-Beutel etwa 20 — bei einem Kupfer-Messlöffel (25 g) pro Tasse. Versiegelt an einem kühlen, dunklen Ort gelagert, bleibt er ab dem auf der Rückseite aufgedruckten Datum sechs Monate auf dem Höhepunkt.","A 250 g pouch makes about 10 cups, a 500 g pouch about 20 — at one copper spoon (25 g) per cup. Stored sealed in a cool, dark place, it stays at peak for six months from the date stamped on the back.","250 g'lık bir paket yaklaşık 10 fincan, 500 g'lık paket ise yaklaşık 20 fincan yapar — fincan başına bir bakır ölçü kaşığı (25 g). Serin, karanlık bir yerde kapalı saklandığında, arkasında yazan tarihten itibaren altı ay boyunca en iyi durumda kalır.") },
  { q: tr("Wohin liefert ihr?","Where do you ship?","Nereye gönderiyorsunuz?"), a: tr("In die EU und das Vereinigte Königreich. Kostenlose Lieferung ab €60. Bestellungen werden innerhalb von 48 Stunden aus unserer Manufaktur versandt.","Across the EU and the UK. Complimentary delivery on orders over €60. Orders ship within 48 hours from our workshop.","AB'ye ve Birleşik Krallık'a. €60 üzeri siparişlerde ücretsiz teslimat. Siparişler mutfağımızdan 48 saat içinde gönderilir.") },
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
    // Parallax repaints every image on each scroll frame — skip it on phones,
    // where it barely registers visually but costs real scroll smoothness.
    if (window.matchMedia("(max-width: 720px)").matches) return;
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
    // Touch devices: never intercept scrolling. Some mobile browsers dispatch
    // `wheel` events for swipes; hijacking them with preventDefault replaced the
    // native momentum with a lerp animation, so a swipe couldn't be continued
    // until the animation finished. Native touch scrolling only on mobile.
    if (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) return;
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
    // Skip the steam particle loop on phones — drawing dozens of radial-gradient
    // particles per frame is the main source of hero scroll jank on mobile.
    if (window.matchMedia("(max-width: 720px)").matches) return;
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
      raf = visible ? requestAnimationFrame(step) : 0;
    };
    // Only animate while the hero canvas is actually on-screen — once the user
    // scrolls past the hero, the loop pauses (keeps the main thread free for scroll).
    let visible = false;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(step); }
    }, { threshold: 0.01 });
    io.observe(canvas);
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
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
  const [menu, setMenu] = useState(false);
  // Lock body scroll while the mobile menu is open
  useEffect(() => {
    if (!menu) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [menu]);
  const links = [
    { id: "#story-intro", label: "Manduraa" },
    { id: "#universe", label: tr("Zutaten","Ingredients","İçindekiler") },
    { id: "#shop", label: tr("Shop","Shop","Mağaza") },
    { id: "#faq", label: tr("FAQ","FAQ","SSS") },
  ];
  const go = (id) => (e) => {
    e.preventDefault();
    setMenu(false);
    const el = document.querySelector(id);
    if (el) setTimeout(() => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" }), 60);
  };
  return (
    <div className={"nav-shell " + (scrolled ? "scrolled" : "")}>
      <nav className="nav">
        <div className="left">
          <button className={"nav-burger " + (menu ? "open" : "")} aria-label={tr("Menü","Menu","Menü")} aria-expanded={menu} onClick={() => setMenu(m => !m)}>
            <span /><span /><span />
          </button>
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
            <svg className="cart-ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 8.5 H18 L17.05 19.4 A1.7 1.7 0 0 1 15.36 21 H8.64 A1.7 1.7 0 0 1 6.95 19.4 Z" />
              <path d="M9 8.5 V7 A3 3 0 0 1 15 7 V8.5" />
            </svg>
            <span className="cart-count">{cartCount}</span>
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <div className={"nav-menu " + (menu ? "open" : "")} onClick={() => setMenu(false)} aria-hidden={!menu}>
        <div className="nav-menu-panel" onClick={e => e.stopPropagation()}>
          {links.map(l => (
            <a key={l.id} className="nav-menu-link" href={l.id} onClick={go(l.id)}>{l.label}</a>
          ))}
          <a
            className="nav-menu-wa"
            href="https://wa.me/905315670838"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenu(false)}
          >
            <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16.02 3.2c-7.06 0-12.8 5.73-12.8 12.79 0 2.26.59 4.46 1.72 6.41L3.2 28.8l6.57-1.72a12.74 12.74 0 0 0 6.24 1.6h.01c7.05 0 12.79-5.74 12.79-12.8 0-3.42-1.33-6.63-3.75-9.05a12.7 12.7 0 0 0-9.04-3.63Zm5.83 16.16c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.71.16-.21.32-.82 1.04-1 1.25-.18.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.53-.71-.54l-.61-.01c-.21 0-.56.08-.85.4s-1.11 1.09-1.11 2.66 1.14 3.08 1.3 3.29c.16.21 2.25 3.43 5.45 4.81 2.27.98 2.73.79 3.22.74.49-.04 1.89-.77 2.16-1.52.27-.74.27-1.38.19-1.51-.08-.13-.29-.21-.61-.37Z"/></svg>
            {tr("Auf WhatsApp schreiben","Message us on WhatsApp","WhatsApp'tan yaz")}
          </a>
        </div>
      </div>
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
    title: tr("Acht Zutaten.\nEine Tasse.", "Eight ingredients.\nOne cup.", "Sekiz malzeme.\nBir fincan."),
    body: tr("Datteln, Mandeln, Pistazie und Kaffee.\nMit Datteln gesüßt, nicht mit Zucker.", "Dates, almonds, pistachio and coffee.\nSweetened with dates, not sugar.", "Hurma, badem, fıstık ve kahve.\nŞekerle değil, hurmayla tatlandırıldı."),
    pos: "top", sub: tr("Zum Entdecken scrollen", "Scroll to explore", "Keşfetmek için kaydır"),
  },
  {
    src: "/assets/scene-2.jpg",
    kicker: tr("Die Zutaten", "The ingredients", "Malzemeler"),
    title: tr("Echte Zutaten,\nsonst nichts.", "Real ingredients,\nnothing else.", "Gerçek malzemeler,\nbaşka bir şey yok."),
    pos: "side-right",
    tags: [
      { side: "l", x: "6vw", y: "30vh", label: tr("Datteln", "Dates", "Hurma") },
      { side: "r", x: "8vw", y: "36vh", label: tr("Kakao", "Cocoa", "Kakao") },
      { side: "l", x: "9vw", y: "52vh", label: tr("Entkoffeinierter Kaffee", "Decaf Coffee", "Kafeinsiz Kahve") },
    ],
  },
  {
    src: "/assets/scene-3.jpg",
    kicker: tr("Die Mischung", "The blend", "Harman"),
    title: tr("Dattel. Mandel.\nPistazie. Kaffee.", "Date. Almond.\nPistachio. Coffee.", "Hurma. Badem.\nFıstık. Kahve."),
    pos: "top",
    tags: [
      { side: "l", x: "8vw", y: "34vh", label: tr("Haselnüsse", "Hazelnuts", "Fındık") },
      { side: "r", x: "10vw", y: "44vh", label: tr("Pistazien", "Pistachios", "Fıstık") },
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
    body: tr("Mit Datteln gesüßt, nicht mit Zucker.\n250 g · 8 Zutaten · 0 g zugesetzter Zucker.", "Sweetened with dates, not sugar.\n250 g · 8 ingredients · 0 sugar added.", "Şekerle değil, hurmayla tatlandırıldı.\n250 g · 8 malzeme · 0 g ilave şeker."),
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
  const videoRef = useRef(null);

  // iOS needs the `muted` attribute really present (React doesn't reflect it
  // reliably) plus an explicit play() to autoplay inline without a play button.
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    v.muted = true; v.defaultMuted = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    const tryPlay = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    tryPlay();
    const onVis = () => { if (!document.hidden) tryPlay(); };
    const onTouch = () => tryPlay();
    // The bg video has pointer-events:none, so any pause/stall is browser-driven
    // (iOS often pauses bg video on scroll) — resume it.
    const onPause = () => tryPlay();
    const onStall = () => tryPlay();
    const onEnded = () => { try { v.currentTime = 0; } catch (e) {} tryPlay(); };
    v.addEventListener("pause", onPause);
    v.addEventListener("stalled", onStall);
    v.addEventListener("waiting", onStall);
    v.addEventListener("ended", onEnded);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("touchstart", onTouch, { passive: true });
    // Resume whenever the hero scrolls back into view.
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) tryPlay(); }, { threshold: 0.05 });
    io.observe(v);
    return () => {
      v.removeEventListener("pause", onPause); v.removeEventListener("stalled", onStall);
      v.removeEventListener("waiting", onStall); v.removeEventListener("ended", onEnded);
      document.removeEventListener("visibilitychange", onVis); window.removeEventListener("touchstart", onTouch);
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let inView = true;
    const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
    const update = () => {
      raf = 0;
      const el = stageRef.current; if (!el) return;
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const h = el.offsetHeight - window.innerHeight;
      if (h <= 0) { onSteamIntensity && onSteamIntensity(0.6); return; }   // pure single-screen hero: no scrub
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
    // Only react to scroll while the hero is actually on-screen — otherwise this
    // handler keeps mutating styles on every scroll across the whole page, which
    // forces synchronous main-thread scrolling on iOS.
    const onScroll = () => { if (raf || !inView) return; raf = requestAnimationFrame(update); };
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (inView && !raf) raf = requestAnimationFrame(update);
    }, { threshold: 0 });
    const st = stageRef.current; if (st) io.observe(st);
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => { window.removeEventListener('scroll', onScroll); io.disconnect(); cancelAnimationFrame(raf); };
  }, [onSteamIntensity]);

  const scrollToShop = () => {
    const el = document.getElementById('shop');
    if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
  };

  const getIntensity = useCallback(() => intensityRef.current, []);

  return (
    <div id="story" className="story" ref={stageRef}>
      <div className="story-stage">
        <video
          ref={videoRef}
          className="hero-video"
          src="/assets/hero.mp4"
          poster="/assets/hero-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
          aria-hidden="true"
        />
        <div className="hero-video-scrim" aria-hidden="true" />
        <SteamCanvas getIntensity={getIntensity} />
        {/* Pure hero — video + one headline + buy button */}
        <div className="hero-pur">
          <span className="hp-kicker">esmee · manduraa</span>
          <h1 className="hp-title">{tr("Acht Zutaten.\nEine Tasse.","Eight ingredients.\nOne cup.","Sekiz malzeme.\nBir fincan.")}</h1>
          <p className="hp-sub">{tr("Mit Datteln gesüßt · entkoffeiniert · 0 g raffinierter Zucker","Sweetened with dates · decaf · 0 g refined sugar","Hurmayla tatlandırıldı · kafeinsiz · 0 g rafine şeker")}</p>
          <div className="hp-cta">
            <button className="hp-buy" data-cur="btn" data-cur-label="Shop" onClick={scrollToShop}>{tr("In den Warenkorb","Add to cart","Sepete ekle")} <span aria-hidden="true">→</span></button>
            <button className="hp-ghost" onClick={() => { const el = document.getElementById("story-intro"); if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" }); }}>{tr("Story ansehen","Watch the story","Hikâyeyi izle")}</button>
          </div>
          <span className="hp-price">Manduraa · {tr("ab","from","")} €{heroFrom || 19} / {tr("Beutel","pouch","paket")}</span>
        </div>
        <div className="scroll-hint">
          <span>{tr("Mehr entdecken","Discover more","Keşfet")}</span>
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
        <span>{tr("Acht Zutaten.","Eight ingredients.","Sekiz malzeme.")}</span>
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
          <span className="eyebrow reveal">{tr("— Eine Notiz aus der Manufaktur","— A note from the workshop","— Mutfaktan bir not")}</span>
          <h2 className="reveal delay-1" key={tr("de","en","tr")}>
            <SplitText text={tr("Ein Rezept aus den Küchen","A recipe from the kitchens","Büyükannelerimizin mutfağından")} />
            <br/>
            <em className="italic"><SplitText text={tr("unserer Großmütter —","of our grandmothers —","eski bir tarif —")} delay={0.3} /></em>
            <SplitText text={tr(" neu aufgegossen."," poured anew."," yeniden demlendi.")} delay={0.55} />
          </h2>
          <p className="reveal delay-2">
            {tr("Manduraa ist kein Kaffee und keine Schokolade — etwas dazwischen. Eine stille Tradition, weitergegeben in den Küchen zwischen ","Manduraa isn't coffee, and it isn't chocolate — something in between. A quiet tradition passed down in kitchens from ","Manduraa ne kahve ne de çikolata — ikisinin arasında bir şey. Mutfaklarda nesiller boyu aktarılan sessiz bir gelenek: ")}
            <HoverWord word={tr("Elazığ","Elazığ","Elazığ")} label={tr("Elazığ · Anatolien","Elazığ · Anatolia","Elazığ · Anadolu")} text={tr("Esmes Heimat — wo die Tradition begann.","Esme's home — where the tradition began.","Esme'nin memleketi — geleneğin başladığı yer.")} img="/assets/scene-2.jpg" />
            {tr(" und "," to ","'tan ")}
            <HoverWord word="Antakya" label={tr("Antakya · Türkei","Antakya · Türkiye","Antakya · Türkiye")} text={tr("Der Pistazien-Gürtel — Antep-Verwandte der Tasse.","The pistachio belt — Antep cousins of the cup.","Antep fıstığı kuşağı — fincanın Antep akrabaları.")} img="/assets/scene-3.jpg" />
            {tr(": Frauen, die Datteln von Hand zu Sirup einkochten und ",": women who cooked dates into syrup by hand and patiently ground ","'ya kadar datilleri elleriyle pekmeze çeviren, sabırla ")}
            <HoverWord word={tr("Mandeln","almonds","bademleri")} label={tr("Marcona-Mandel","Marcona Almond","Marcona Bademi")} text={tr("Die butterige spanische Mandel. Kalt vermahlen in die Mischung.","The buttery Spanish almond. Cold-stone milled into the blend.","Tereyağsı İspanyol bademi. Soğuk taşla harmana öğütülür.")} img="/assets/scene-5.jpg" />
            {tr(" geduldig mahlten — Zucker war den Gästen vorbehalten."," — because sugar was saved for guests."," öğüten kadınlar — çünkü şeker misafirler içindi.")}
          </p>
          <p className="reveal delay-3">
            {tr("Wir haben die Geste eingefangen. Acht Zutaten, nichts weiter. Gesüßt allein durch ","We bottled the gesture. Eight ingredients, nothing else. Sweetened only by ","Bu jesti şişeye koyduk. Sekiz malzeme, başka hiçbir şey. Yalnızca ")}
            <HoverWord word={tr("Datteln","dates","hurma")} label={tr("Datteln","Dates","Hurma")} text={tr("Die einzige Süße in der Tasse — natürlich, ohne raffinierten Zucker.","The only sweetness in the cup — natural, no refined sugar.","Fincandaki tek tatlılık — doğal, rafine şeker yok.")} img="/assets/scene-6.jpg" />
            {tr(". Der cremige Körper kommt von ",". The creamy body comes from "," ile tatlandırılır. Kremsi gövde ")}
            <HoverWord word={tr("Mandeln & Haselnüssen","almonds & hazelnuts","badem & fındıktan")} label={tr("Mandeln & Haselnüsse","Almonds & hazelnuts","Badem & fındık")} text={tr("Fein vermahlen — der runde, milchige Körper ganz ohne Milch.","Finely milled — the round, milky body with no dairy.","İnce öğütülmüş — sütsüz, yuvarlak ve sütlü gövde.")} img="/assets/scene-5.jpg" />
            {tr(" und Kokosmilchpulver. Der Kaffee ist "," and coconut milk powder. The coffee is "," ve Hindistan cevizi sütü tozundan gelir. Kahve ise ")}
            <HoverWord word={tr("entkoffeiniert","decaffeinated","kafeinsiz")} label={tr("Entkoffeinierter Kaffee","Decaf coffee","Kafeinsiz kahve")} text={tr("Über 97 % koffeinfrei — Aroma ohne Herzrasen.","Over 97% caffeine-free — aroma without the racing heart.","%97'den fazla kafeinsiz — çarpıntısız aroma.")} img="/assets/scene-1.jpg" />
            {tr(" — das Aroma ohne das Koffein."," — the flavour without the caffeine."," — kafeinsiz aroma.")}
          </p>
          <div className="stats reveal delay-3">
            <div className="stat"><strong><Counter to={8} duration={1100} /></strong><span>{tr("Zutaten","Ingredients","Malzeme")}</span></div>
            <div className="stat"><strong><Counter to={0} duration={1100} suffix="g" /></strong><span>{tr("Raffinierter Zucker","Refined sugar","Rafine şeker")}</span></div>
            <div className="stat"><strong><Counter to={90} duration={1100} suffix="s" /></strong><span>{tr("In der Tasse","In the cup","Fincanda")}</span></div>
          </div>
        </div>
        <div className="reveal delay-1">
          <div className="frame aspect-3x4 parallax" data-cur="img" data-cur-label={tr("Ansehen","View","Gör")}>
            <BlurImg src="/assets/scene-4.jpg" alt={tr("Eine stille Porzellantasse Manduraa, sanft dampfend.","A still porcelain cup of Manduraa, steaming softly.","Hafifçe tüten, durgun bir porselen Manduraa fincanı.")} />
            <span className="caption">{tr("Manufaktur — Mischung Nr. 04","Workshop — Blend no. 04","Mutfak — Harman No. 04")}</span>
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
  // On phones the orbit is smaller, so pull the chips onto a tighter ring.
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const on = () => setNarrow(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", on);
    return () => { if (mq.removeEventListener) mq.removeEventListener("change", on); };
  }, []);
  const rScale = narrow ? 0.72 : 1;

  // auto-rotate slowly when idle — ONLY while the orbit is on-screen AND on desktop.
  // On ≤900px the orbit is replaced by a static grid, so we never animate there.
  // (A permanent 60fps loop here re-rendered the whole component every frame and
  //  made mobile scrolling janky.)
  useEffect(() => {
    const wrap = wrapRef.current;
    const mq = window.matchMedia("(min-width: 901px)");
    let raf = 0;
    let visible = false;
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
    const start = () => { if (!raf && visible && mq.matches) raf = requestAnimationFrame(tick); };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    const sync = () => { (visible && mq.matches) ? start() : stop(); };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.02 });
    if (wrap) io.observe(wrap);
    if (mq.addEventListener) mq.addEventListener("change", sync);
    return () => { stop(); io.disconnect(); if (mq.removeEventListener) mq.removeEventListener("change", sync); };
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
      // On phones the orbit auto-spins via CSS and isn't drag-rotated (keeps
      // page scrolling smooth); only tap-to-open is active there.
      if (window.matchMedia("(max-width: 900px)").matches) return;
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
    // Spread the chips evenly around the ring by index (auto-adapts to any
    // ingredient count). The chip itself stays upright (no transform rotation)
    // so labels never tilt or flip.
    const baseAngle = (360 / INGREDIENTS.length) * idx + 18;
    const rad = ((baseAngle + rot) * Math.PI) / 180;
    const left = 50 + Math.cos(rad) * ing.r * rScale;
    const top  = 50 + Math.sin(rad) * ing.r * rScale;
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
        <span className="swatch" style={{ backgroundImage: `url(${ing.img})`, "--ring": ing.color }} />
        <div>
          <div className="name"><span className="nm-full">{ing.name}</span><span className="nm-short">{ing.short || ing.name}</span></div>
          <span className="note">{ing.note}</span>
        </div>
      </div>
    );
  };

  // connectors from each chip to the center — follow the same live rotation as the chips
  const connectors = INGREDIENTS.map((ing, i) => {
    const baseAngle = (360 / INGREDIENTS.length) * i + 18;
    const rad = ((baseAngle + rot) * Math.PI) / 180;
    const x = 50 + Math.cos(rad) * ing.r * rScale;
    const y = 50 + Math.sin(rad) * ing.r * rScale;
    return <path key={i} d={`M50 50 L${x} ${y}`} />;
  });

  return (
    <section id="universe" className="block universe">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow reveal">{tr("— Zutaten-Universum","— Ingredient universe","— Malzeme evreni")}</span>
          <h2 className="reveal delay-1" key={tr("de","en","tr")}>
            <SplitText text={tr("Acht Zutaten","Eight ingredients","Sekiz malzeme")} /> <em className="italic"><SplitText text={tr("im Orbit.","in orbit.","yörüngede.")} delay={0.25} /></em>
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
            <div className="core-mosaic" aria-hidden="true">
              {INGREDIENTS.map((ing, i) => (
                <span key={i} className="cm-cell" style={{ backgroundImage: `url(${ing.img})` }} />
              ))}
            </div>
            <span className="core-badge"><strong>{INGREDIENTS.length}</strong>{tr("Zutaten","ingredients","malzeme")}</span>
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
  return createPortal(
    <>
      <div className={"ing-modal-overlay " + (open ? "open" : "")} onClick={onClose} />
      <div className={"ing-modal " + (open ? "open" : "")} role="dialog" aria-hidden={!open}>
        <button type="button" className="ing-close" onClick={onClose} aria-label={tr("Schließen","Close","Kapat")}>✕</button>
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
                <div className="fact"><span>{tr("Nährstoffe","Nutrients","Besinler")}</span><strong>{ingredient.season}</strong></div>
                <div className="fact"><span>{tr("Wirkung","Benefit","Etki")}</span><strong>{ingredient.grams}</strong></div>
                <div className="fact"><span>{tr("Form","Form","Form")}</span><strong>{tr("Fein vermahlen","Finely milled","İnce öğütülmüş")}</strong></div>
              </div>
              <p className="body">{ingredient.body}</p>
              <button className="back" data-cur="btn" data-cur-label={tr("Schließen","Close","Kapat")} onClick={onClose}>← {tr("Zurück zum Orbit","Back to orbit","Yörüngeye dön")}</button>
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  );
}

/* ============================================================
   FOUNDER STORY — Esme (the real brand origin)
   ============================================================ */
function FounderStory() {
  useLang();
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("in"); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section id="esme" className="block founder" ref={ref}>
      <div className="container founder-grid">
        <div className="founder-media reveal" style={{ backgroundImage: "url(/assets/lifestyle-cup-pouches.jpeg)" }}>
          <span className="founder-cap">{tr("Elazığ → heute","Elazığ → today","Elazığ → bugün")}</span>
        </div>
        <div className="founder-text">
          <span className="eyebrow reveal">{tr("— Unsere Geschichte","— Our story","— Hikâyemiz")}</span>
          <h2 className="reveal delay-1" key={tr("de","en","tr")}><SplitText text="Esme." /></h2>
          <p className="founder-lede reveal delay-1">{tr("Manche Namen bleiben nicht in der Vergangenheit — sie weisen den Weg.","Some names don't stay in the past — they point the way forward.","Bazı isimler geçmişte kalmaz — yolu gösterir.")}</p>
          <p className="reveal delay-2">{tr("Meine Großmutter Esme war eine der starken Frauen aus Elazığ. Früh verwitwet, heiratete sie nie wieder — und zog eine Familie von elf Kindern groß. Das Leben prüfte sie hart, doch sie blieb aufrecht.","My grandmother Esme was one of the strong women of Elazığ. Widowed young, she never remarried — and raised a family of eleven children. Life tested her hard, yet she never broke.","Anneannem Esme, Elazığ'ın güçlü kadınlarından biriydi. Genç yaşta dul kaldı, bir daha evlenmedi — ve on bir çocuklu bir aileyi büyüttü. Hayat onu çok sınadı ama o hiç yıkılmadı.")}</p>
          <p className="reveal delay-2">{tr("Ihre Kraft schöpfte sie aus Liebe, Glauben und Fleiß. Sie lehrte uns, mit wenig zufrieden zu sein, zu teilen und den Wert jeder Arbeit zu schätzen.","Her strength came from love, faith and hard work. She taught us to be content with little, to share, and to value every effort.","Gücünü sevgisinden, inancından ve çalışkanlığından aldı. Bize azla yetinmeyi, paylaşmayı ve her emeğin kıymetini bilmeyi öğretti.")}</p>
          <p className="reveal delay-3">{tr("Aus dieser Energie entstand Manduraa. In jedem Schluck steckt ihre Geschichte — von Arbeit, von Liebe und von der Kraft, die aus tiefen Wurzeln kommt.","Manduraa was born from that energy. In every sip lives her story — of work, of love, and of the strength that comes from deep roots.","Manduraa işte bu enerjiden doğdu. Her yudumunda onun hikâyesi var — emeğin, sevginin ve köklerden gelen gücün.")}</p>
          <p className="founder-sign reveal delay-3"><span>{tr("Heute lassen wir ihren Namen weiterleben.","Today we keep her name alive.","Bugün onun adını yaşatıyoruz.")}</span><em>— Zeynep · {tr("Esmes Enkelin","Esme's granddaughter","Esme'nin torunu")}</em></p>
        </div>
      </div>
    </section>
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
    tr("Koffein — Nervosität, Herzrasen, Schlafprobleme","Caffeine — jitters, racing heart, poor sleep","Kafein — gerginlik, çarpıntı, uyku sorunu"),
    tr("Oft mit Zucker — kalorienreich, belastet den Stoffwechsel","Often with sugar — high in calories, taxes the metabolism","Sık sık şekerli — kalorili, metabolizmayı yorar"),
    tr("Säurehaltig; hart auf nüchternen Magen","Acidic; harsh on an empty stomach","Asitli; aç mideye sert"),
    tr("Künstliche Zusätze, wenig Nährstoffe","Artificial additives, few nutrients","Yapay katkılar, az besin"),
    tr("Zucker fördert Entzündungen & Übergewicht","Sugar fuels inflammation & weight gain","Şeker iltihabı ve kiloyu körükler"),
    tr("Nicht für jeden gut verträglich","Not gentle on everyone","Herkese iyi gelmez"),
  ];
  const usItems = [
    tr("Entkoffeiniert — kein Herzrasen, kein gestörter Schlaf","Decaf — no racing heart, no disturbed sleep","Kafeinsiz — çarpıntı yok, uyku bozulmaz"),
    tr("0 g zugesetzter Zucker — natürlich gesüßt durch Datteln","0 g added sugar — naturally sweetened by dates","0 g ilave şeker — hurmayla doğal tatlandırma"),
    tr("Sanft & gut verträglich, auch für Koffeinempfindliche","Gentle & well tolerated, even if caffeine-sensitive","Nazik ve iyi gelir, kafeine duyarlılar için bile"),
    tr("Reich an natürlichen Nährstoffen: Mandeln, Datteln, Kakao","Rich in natural nutrients: almonds, dates, cocoa","Doğal besinlerle dolu: badem, hurma, kakao"),
    tr("Unterstützt Herz, Immunsystem & Verdauung","Supports heart, immunity & digestion","Kalbi, bağışıklığı ve sindirimi destekler"),
    tr("Nussig, natürlich süß, vollmundig & vielfältig","Nutty, naturally sweet, full-bodied & varied","Fındıksı, doğal tatlı, dolgun ve çeşitli"),
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
            <SplitText text={tr("Kaffeegenuss","Coffee comfort","Kahve keyfi,")} /> <em className="italic"><SplitText text={tr("ohne","without","ama")} delay={0.3} /></em> <SplitText text={tr("die Nebenwirkungen.","the downsides.","yan etkisi yok.")} delay={0.45} />
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
  // Always show the two pouch sizes. If the live Shopify product already has
  // ≥2 variants, use those directly. Otherwise present the two sizes and borrow
  // a live merchandiseId per size (matched by "250"/"500", else the first live
  // variant) so checkout still works until the size variants exist in Shopify.
  const live = (liveVariants && liveVariants.length) ? liveVariants : null;
  const variants = (live && live.length >= 2) ? live : VARIANTS.map(v => {
    const match = live && live.find(l => String(l.name || l.title || "").replace(/\s+/g, "").includes(v.id));
    const fb = live && live[0];
    return { ...v, merchandiseId: (match || fb || {}).merchandiseId,
             price: (match && typeof match.price === "number") ? match.price : v.price };
  });
  const singleVariant = variants.length === 1;
  const [variant, setVariant] = useState(variants[0]);
  const [activeImg, setActiveImg] = useState(0); // product gallery index
  useEffect(() => { setVariant(variants[0]); }, [liveVariants]);
  const PACKS = getPacks();
  const [packId, setPackId] = useState("1");
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
  // Cups scale with the selected pouch size: one 25 g copper spoon per cup,
  // so 250 g ≈ 10 cups, 500 g ≈ 20 cups. The pack tiers multiply by the count.
  const pouchG = parseInt(String(variant.name || "").replace(/[^\d]/g, ""), 10) || 250;
  const cupsPerPouch = Math.max(1, Math.round(pouchG / 25));
  const cupsLabel = (n) => tr(`≈ ${n} Tassen`, `≈ ${n} cups`, `≈ ${n} fincan`);
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
    flyToCart(PRODUCT_GALLERY[activeImg] || variant.image);
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
        image: PRODUCT_GALLERY[activeImg] || variant.image,
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
            {PRODUCT_GALLERY.map((src, i) => (
              <div
                key={i}
                className={"pouch " + (i === activeImg ? "active" : "")}
                style={{ backgroundImage: `url(${src})` }}
              />
            ))}
          </div>
          {burst}
          <span className="floating-tag"><span className="pulse"></span>{tr("Auf Lager · Versand in 48 h","In stock · Ships in 48 h","Stokta · 48 saatte kargo")}</span>
          <div className="gallery-thumbs">
            {PRODUCT_GALLERY.map((src, i) => (
              <button
                key={i}
                type="button"
                className={"gthumb " + (i === activeImg ? "active" : "")}
                style={{ backgroundImage: `url(${src})` }}
                onClick={() => { setActiveImg(i); onTap && onTap(); }}
                aria-label={tr("Bild","Image","Görsel") + " " + (i + 1)}
                aria-current={i === activeImg}
              />
            ))}
          </div>
        </div>

        <div className="meta">
          <span className="by">Esmee · Edition № 01</span>
          <h2>Manduraa<em>{variant.name}</em></h2>
          <div className="stars">
            <span>{tr("Edition № 01 · 0 g raffinierter Zucker · Vegan · Glutenfrei","Edition № 01 · 0 g refined sugar · vegan · gluten-free","Edition № 01 · 0 g rafine şeker · vegan · glutensiz")}</span>
          </div>
          <p className="lede">{tr("Mandeln, Haselnüsse, Datteln, Pistazien, Kakao und ein Hauch entkoffeinierter Kaffee. Mit Datteln gesüßt, nicht mit Zucker.","Almonds, hazelnuts, dates, pistachios, cocoa and a hint of decaffeinated coffee. Sweetened with dates, not sugar.","Badem, fındık, hurma, fıstık, kakao ve bir tutam kafeinsiz kahve. Şekerle değil, hurmayla tatlandırılmış.")}</p>

          <div className="price-row">
            <span className="price">€{m(unitPrice)}</span>
            {wasUnit > unitPrice && <span className="price-was">€{m(wasUnit)}</span>}
            {!subActive && pack.save > 0 && <span className="price-save">{tr("Du sparst","You save","Tasarruf")} {pack.save}%</span>}
            {subActive && <span className="price-save sub-tag">{tr("Abo","Subscription","Abonelik")} · −{Math.round(subPct*100)}%</span>}
          </div>

          {/* Delivery — compact one-time / subscription segmented toggle */}
          <div className="option-block">
            <div className="option-label">
              <span>{tr("Lieferung","Delivery","Teslimat")}</span>
              <em>{plan === "once" ? tr("Einmalkauf","One-time","Tek seferlik") : (plan === "30" ? tr("Abo · alle 30 Tage","Subscription · every 30 days","Abonelik · her 30 günde") : tr("Abo · alle 60 Tage","Subscription · every 60 days","Abonelik · her 60 günde"))}</em>
            </div>
            <div className="deliv-seg">
              <button
                type="button"
                className={"seg " + (plan === "once" ? "active" : "")}
                onClick={() => { setPlan("once"); onTap && onTap(); }}
                data-cur="btn" data-cur-label="Pick"
              >
                <span className="seg-name">{tr("Einmalkauf","One-time","Tek seferlik")}</span>
                <span className="seg-price">€{m(baseUnit)}<small>{tr("/Pkg","/pack","/paket")}</small></span>
              </button>
              <button
                type="button"
                className={"seg " + (subActive ? "active" : "")}
                onClick={() => { if (!subActive) setPlan("30"); onTap && onTap(); }}
                data-cur="btn" data-cur-label={tr("Wählen","Pick","Seç")}
              >
                <span className="seg-badge">−{Math.round(pct30 * 100)} %</span>
                <span className="seg-name">{tr("Im Abo","Subscribe","Abonelik")}</span>
                <span className="seg-price">€{m(unit30)}<small>{tr("/Pkg","/pack","/paket")}</small></span>
              </button>
            </div>
            {subActive && (
              <div className="deliv-extra">
                <div className="cadence-row">
                  <button type="button" className={"cad " + (plan === "30" ? "active" : "")} onClick={() => { setPlan("30"); onTap && onTap(); }}>{tr("Alle 30 Tage","Every 30 days","Her 30 günde")}</button>
                  <button type="button" className={"cad " + (plan === "60" ? "active" : "")} onClick={() => { setPlan("60"); onTap && onTap(); }}>{tr("Alle 60 Tage","Every 60 days","Her 60 günde")}</button>
                </div>
                <div className="plan-perks">
                  <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>{tr("15 % Rabatt auf jede Lieferung","15% off every delivery","Her teslimatta %15 indirim")}</span>
                  <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>{tr("Jederzeit pausieren oder kündigen","Pause or cancel anytime","İstediğin zaman duraklat ya da iptal et")}</span>
                  <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7"/></svg>{tr("Kostenloser Versand bei jeder Lieferung","Free shipping on every delivery","Her teslimatta ücretsiz kargo")}</span>
                </div>
              </div>
            )}
          </div>

          {/* Quantity — bulk discount */}
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
                    <div className="pack-sub">{cupsLabel(p.count * cupsPerPouch)}</div>
                  </div>
                  <div>
                    <div className="pack-price">€{m(packUnit(p) * p.count)}</div>
                    {p.save > 0 && <div className="pack-per">−{p.save}{tr(" % sparen"," % off"," % indirim")}</div>}
                  </div>
                </button>
              ))}
            </div>
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
                    placeholder={tr("Eine kurze, ruhige Botschaft. Wir schreiben sie auf Baumwoll-Karton mit Wachssiegel.","A short, quiet message. We write it on cotton card with a wax seal.","Kısa, sakin bir mesaj. Onu mühür mumlu pamuk kartona yazarız.")}
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
              <div className="option-label"><span>{tr("Größe","Size","Boyut")}</span><em>{variant.name}</em></div>
              <div className="variant-row">
                {variants.map(v => (
                  <button key={v.id} className={"v-chip " + (v.id === variant.id ? "active" : "")} data-cur="btn" data-cur-label={tr("Wählen","Pick","Seç")} onClick={() => chooseVariant(v)}>
                    <span className="v-name">{v.name}</span>
                    <span className="v-sub">{typeof v.price === "number" ? "€" + v.price.toFixed(2).replace(".", ",") : (v.sub && v.sub !== v.name ? v.sub : "")}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
    let inView = true;
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
    // Only run while the section is on-screen (no page-wide style writes on iOS).
    const onScroll = () => { if (raf || !inView) return; raf = requestAnimationFrame(update); };
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (inView && !raf) raf = requestAnimationFrame(update);
    }, { threshold: 0 });
    io.observe(wrap);
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => { window.removeEventListener('scroll', onScroll); io.disconnect(); cancelAnimationFrame(raf); };
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
            <svg viewBox="-48 0 496 400" role="img" aria-label="Taste profile radar chart">
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
    { t: tr("Versand in 48 Stunden","48-hour shipping","48 saatte kargo"), d: tr("Aus unserer Manufaktur in die EU & UK.","From our workshop to the EU & UK.","Mutfağımızdan AB & İngiltere'ye."),
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
              <textPath href="#g-circle" startOffset="0">ESMEE · MANDURAA · EDITION N° 01 ·  ESMEE · MANDURAA · EDITION N° 01 ·  </textPath>
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
            {tr(<>Überzeugt dich der erste Schluck nicht,<br/>bekommst du dein Geld <em className="italic">zurück</em>.</>,
                <>If the first sip doesn't win you over,<br/>you get your money <em className="italic">back</em>.</>,
                <>İlk yudum seni ikna etmezse,<br/>paranı <em className="italic">geri</em> alırsın.</>)}
          </h3>
          <p>
            {tr("30 Tage Zeit, ganz ohne Risiko. Schreib mir einfach eine kurze Nachricht — kein Formular, kein Rücksende-Theater. Du bekommst den vollen Betrag zurück, auch wenn der Beutel schon halb leer ist. Für jede Tasse Manduraa stehe ich persönlich ein.","30 days, no risk at all. Just send me a short message — no form, no return hassle. You get the full amount back, even if the pouch is already half empty. I stand behind every cup of Manduraa, personally.","30 gün, hiçbir risk yok. Bana kısa bir mesaj göndermen yeter — form yok, iade derdi yok. Paket yarı boş olsa bile tutarın tamamını geri alırsın. Her bir fincan Manduraa'nın arkasında bizzat duruyorum.")}
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
          {tr("Eine Mischung, acht Zutaten, null raffinierter Zucker. Von Hand gemischt und zu dir nach Hause geliefert.","One blend, eight ingredients, zero refined sugar. Hand-blended and delivered to your door.","Tek harman, sekiz malzeme, sıfır rafine şeker. Elde harmanlanır ve kapına teslim edilir.")}
        </p>
        <div className="cta-row reveal delay-3">
          <button className="btn btn-primary" data-cur="btn" data-cur-label="Shop" onMouseMove={onMagnetMove} onClick={onShop}>{tr("Manduraa kaufen","Shop Manduraa","Manduraa al")} · €{price || 28}</button>
          <a href="#story-intro" className="btn btn-ghost" data-cur="btn" data-cur-label={tr("Lesen","Read","Oku")}>{tr("Die Story lesen","Read the story","Hikâyeyi oku")}</a>
        </div>
        <div className="final-subline reveal delay-3" aria-label={tr("Risiko-Umkehr","Risk reversal","Risk tersine")}>
          <span>{tr("0 g raffinierter Zucker · 8 Zutaten","0 g refined sugar · 8 ingredients","0 g rafine şeker · 8 malzeme")}</span>
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
    sub: tr("Baumwoll-Karton · Wachssiegel · Esmee-Signatur","Cotton card · wax seal · Esmee signature","Pamuk karton · mum mühür · Esmee imzası"),
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
/* Featured accessory — Copper set (measuring spoon & water gauge) */
function AddonFeature({ addon, inCart, onAdd, onTap }) {
  useLang();
  if (!addon) return null;
  const m = (n) => Number.isInteger(n) ? String(n) : (Math.round(n * 100) / 100).toFixed(2);
  return (
    <section id="zubehoer" className="addon-feature-section">
      <div className="container">
        <div className="addon-feature">
          <div className="af-vis" aria-hidden="true">
            <svg viewBox="0 0 150 120" className="af-illus" fill="none" stroke="url(#cuGrad)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="cuGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#E0A87C" />
                  <stop offset="1" stopColor="#A6663F" />
                </linearGradient>
              </defs>
              {/* measuring spoon */}
              <ellipse cx="40" cy="48" rx="24" ry="14" />
              <ellipse cx="40" cy="48" rx="13" ry="7" strokeWidth="1.5" opacity=".55" />
              <path d="M60 41 L102 16" />
              <circle cx="106" cy="14" r="4.5" />
              {/* water gauge / measuring beaker */}
              <path d="M82 58 L120 58 L114 106 Q113 112 107 112 L95 112 Q89 112 88 106 Z" />
              <path d="M90 76 H112" strokeWidth="1.5" opacity=".6" />
              <path d="M90 90 H106" strokeWidth="1.5" opacity=".6" />
            </svg>
          </div>
          <div className="af-body">
            <span className="af-eyebrow">{tr("Das passende Zubehör","The matching accessory","Uygun aksesuar")}</span>
            <h3 className="af-name">{addon.name || tr("Kupfer-Set — Messlöffel & Wassermesser","Copper set — measuring spoon & water gauge","Bakır set — ölçü kaşığı & su ölçer")}</h3>
            <p className="af-sub">{addon.sub || tr("Handpoliertes Kupfer für die perfekte Tasse — ein Messlöffel für exakt 25 g Manduraa und ein Wassermesser mit 45-ml-Markierung.","Hand-polished copper for the perfect cup — a measuring spoon for exactly 25 g of Manduraa and a 45 ml water gauge.","Mükemmel fincan için elde parlatılmış bakır — tam 25 g Manduraa için ölçü kaşığı ve 45 ml işaretli su ölçer.")}</p>
            <ul className="af-points">
              <li>{tr("Exakt 7 g pro Löffel","Exactly 7 g per scoop","Kaşık başına tam 7 g")}</li>
              <li>{tr("150-ml-Markierung","150 ml mark","150 ml işareti")}</li>
              <li>{tr("Handpoliertes Kupfer","Hand-polished copper","Elde parlatılmış bakır")}</li>
            </ul>
          </div>
          <div className="af-buy">
            <span className="af-price">€{m(addon.price)}</span>
            <button
              type="button"
              className={"af-add " + (inCart ? "in" : "")}
              data-cur="btn"
              data-cur-label={tr("Hinzufügen","Add","Ekle")}
              onClick={() => { onAdd && onAdd(); onTap && onTap(); }}
            >
              {inCart
                ? tr("Im Warenkorb ✓","In your bag ✓","Sepette ✓")
                : tr("Set hinzufügen","Add the set","Seti ekle")}
            </button>
          </div>
        </div>
      </div>
    </section>
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
                <div className="head">{tr("Füge 1 Beutel hinzu","Add 1 more pouch","1 paket daha ekle")} &mdash; {tr("sichere dir kostenlosen Versand.","unlock free shipping.","ücretsiz kargonun kilidini aç.")}</div>
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
  { img: "/assets/scene-1.jpg", badge: tr("Manufaktur","workshop","mutfak"), cls: "tall" },
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
          <blockquote>{tr("Mit Datteln gesüßt, nicht mit Zucker. Acht Zutaten, von Hand gemischt — entkoffeiniert, vegan, ohne raffinierten Zucker. Manduraa erscheint gerade erst. Du gehörst zu den Ersten, die sie probieren.","Sweetened with dates, not sugar. Eight ingredients, blended by hand — decaffeinated, vegan, no refined sugar. Manduraa is only just launching. You're among the first to taste it.","Şekerle değil, hurmayla tatlandırılmış. Sekiz malzeme, elle harmanlanmış — kafeinsiz, vegan, rafine şeker yok. Manduraa daha yeni çıkıyor. Onu tadan ilk kişilerdensin.")}</blockquote>
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

/* ---------- Spec sheet — As composed ---------- */
function getSpec() {
  return [
  { name: tr("Datteln","Dates","Hurma"),                       color: "#7A4A2B", pct: 29, gram: "145 g" },
  { name: tr("Mandeln","Almonds","Badem"),                     color: "#D9B988", pct: 18, gram: "90 g" },
  { name: tr("Kokosmilchpulver","Coconut Milk Powder","Hindistan Cevizi Sütü Tozu"), color: "#E6D6BE", pct: 14, gram: "70 g" },
  { name: tr("Haselnüsse","Hazelnuts","Fındık"),               color: "#9C6B3F", pct: 11, gram: "55 g" },
  { name: tr("Kakao","Cocoa","Kakao"),                         color: "#4E3322", pct: 10, gram: "50 g" },
  { name: tr("Entkoffeinierter Kaffee","Decaf Coffee","Kafeinsiz Kahve"), color: "#3E2719", pct:  9, gram: "45 g" },
  { name: tr("Pistazien","Pistachios","Antep Fıstığı"),        color: "#7A8C4F", pct:  7, gram: "35 g" },
  { name: tr("Grüner Kardamom","Green Cardamom","Yeşil Kakule"), color: "#8A9A5B", pct:  2, gram: "10 g" },
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
            {tr("Wir zeigen, was die meisten verschweigen: die volle Rezeptur pro Gramm, jede Zahl pro Tasse. Edition № 01 · Manduraa · 500-g-Beutel.","We show what most hide: the full recipe by gram, every number per cup. Edition № 01 · Manduraa · 500 g pouch.","Çoğunun gizlediğini gösteriyoruz: gram gram tüm tarif, fincan başına her sayı. Edition № 01 · Manduraa · 500 g paket.")}
          </p>
        </div>

        <div className="grid">
          <div className="pouch-card reveal">
            <div className="top">
              <BlurImg src="/assets/scene-6.jpg" alt={tr("Der Manduraa-Beutel, von Hand gebunden.","The Manduraa pouch, hand-tied.","Manduraa paketi, elle bağlanmış.")} />
              <span className="lock-tag">№ 01 · 500 g</span>
            </div>
            <div className="body">
              <h3>Manduraa <em className="italic">Original</em></h3>
              <p>{tr("Eine Charge, eine Saison. Von Hand in unserer Manufaktur gemischt und mit cremefarbenem Leinenband gebunden.","Single-batch, single-season. Hand-blended in our workshop and tied with cream linen ribbon.","Tek parti, tek mevsim. Mutfağımızda elle harmanlanmış ve krem keten kurdeleyle bağlanmış.")}</p>
              <div className="badges">
                <span className="badge">Vegan</span>
                <span className="badge">{tr("Glutenfrei","Gluten-free","Glutensiz")}</span>
                <span className="badge">{tr("Entkoffeiniert","Decaf","Kafeinsiz")}</span>
                <span className="badge">{tr("Recycelbarer Beutel","Recyclable pouch","Geri dönüşümlü paket")}</span>
                <span className="badge">{tr("Ohne Zusätze","No additives","Katkısız")}</span>
              </div>
            </div>
          </div>
          <div className="table-wrap reveal delay-1" ref={ref}>
            <h3>{tr("Zutaten · 500-g-Beutel","Ingredients · 500 g pouch","İçindekiler · 500 g paket")}</h3>
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
              <h4>{tr("Durchschnittliche Nährwerte · pro 100 g","Average nutrition · per 100 g","Ortalama besin değerleri · 100 g başına")}</h4>
              <div className="nut-grid">
                <div className="nut-cell"><span className="k">{tr("Energie","Energy","Enerji")}</span><span className="v">432<small>{tr("kcal · 1808 kJ","kcal · 1808 kJ","kcal · 1808 kJ")}</small></span></div>
                <div className="nut-cell"><span className="k">{tr("Kohlenhydrate","Carbohydrates","Karbonhidrat")}</span><span className="v">78.6<small>g</small></span></div>
                <div className="nut-cell"><span className="k">{tr("davon Zucker","of which sugars","şeker")}</span><span className="v">18.4<small>{tr("g · aus Datteln","g · from dates","g · hurmadan")}</small></span></div>
                <div className="nut-cell"><span className="k">{tr("Raffinierter Zucker","Refined sugar","Rafine şeker")}</span><span className="v">0<small>g</small></span></div>
                <div className="nut-cell"><span className="k">{tr("Eiweiß","Protein","Protein")}</span><span className="v">5.6<small>g</small></span></div>
                <div className="nut-cell"><span className="k">{tr("Fett","Fat","Yağ")}</span><span className="v">10.6<small>{tr("g · gute Fette","g · good fats","g · iyi yağlar")}</small></span></div>
                <div className="nut-cell"><span className="k">{tr("ges. Fettsäuren","Saturated fat","Doymuş yağ")}</span><span className="v">2.0<small>g</small></span></div>
                <div className="nut-cell"><span className="k">{tr("Salz","Salt","Tuz")}</span><span className="v">0.33<small>g</small></span></div>
              </div>
              <div className="footer-row">
                <span><strong>{tr("Allergene:","Allergens:","Alerjenler:")}</strong> {tr("Mandeln, Haselnüsse, Pistazien.","almonds, hazelnuts, pistachios.","badem, fındık, fıstık.")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Exit-intent toast ---------- */
/* ============================================================
   COUPON POPUP — first-cup 10 € code, no email. Reveals the real
   FIRSTCUP10 Shopify code with a copy button; the shopper enters it
   themselves at checkout (no auto-apply by request).
   ============================================================ */
const FIRSTCUP_CODE = import.meta.env.VITE_SHOPIFY_DISCOUNT_CODE || "FIRSTCUP10";

function CouponGate({ onShop }) {
  useLang();
  const [show, setShow] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Show once per browser; shared flag so the exit-intent popup never doubles up.
    try { if (localStorage.getItem("esmee.coupon_seen")) return; } catch (e) {}
    let armed = false;
    let pauseTimer = 0;
    const idleMs = 4500;     // user has paused this long
    const minScroll = 1.2;   // viewport heights — past the hero
    const arm = () => {
      armed = true;
      setShow(true);
      try { localStorage.setItem("esmee.coupon_seen", "1"); } catch (e) {}
      window.removeEventListener("scroll", onScroll);
    };
    const onScroll = () => {
      if (armed) return;
      if (window.scrollY < window.innerHeight * minScroll) return;
      clearTimeout(pauseTimer);
      pauseTimer = setTimeout(arm, idleMs);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const fallback = setTimeout(() => { if (!armed) arm(); }, 180000);
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(pauseTimer);
      clearTimeout(fallback);
    };
  }, []);

  const dismiss = () => { setShow(false); setTimeout(() => setHidden(true), 400); };
  const copy = () => {
    try { navigator.clipboard?.writeText(FIRSTCUP_CODE); } catch (e) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const goShop = () => { dismiss(); onShop && onShop(); };

  if (hidden) return null;
  return (
    <aside className={"coupon-pop " + (show ? "in" : "")} aria-live="polite">
      <button type="button" className="cp-close" onClick={dismiss} aria-label={tr("Schließen","Close","Kapat")}>✕</button>
      <span className="cp-kicker">{tr("— Erste Tasse","— First cup","— İlk fincan")}</span>
      <h5>{tr("10 € auf deine erste Manduraa.","€10 off your first Manduraa.","İlk Manduraa'na 10 € indirim.")}</h5>
      <p>{tr("Kein Anmelden, kein Spam. Kopier den Code und gib ihn im Checkout ein.","No signup, no spam. Copy the code and enter it at checkout.","Kayıt yok, spam yok. Kodu kopyala ve ödemede gir.")}</p>
      <button type="button" className={"cp-code " + (copied ? "copied" : "")} onClick={copy} aria-label={tr("Code kopieren","Copy code","Kodu kopyala")}>
        <span className="code">{FIRSTCUP_CODE}</span>
        <span className="cp-copy">{copied ? tr("Kopiert ✓","Copied ✓","Kopyalandı ✓") : tr("Kopieren","Copy","Kopyala")}</span>
      </button>
      <button type="button" className="cp-shop" onClick={goShop}>{tr("Jetzt einkaufen","Shop now","Şimdi alışveriş")} →</button>
      <div className="cp-foot">{tr("Gültig 30 Tage · Eine pro Kundin · Versand inklusive ab €60","Valid 30 days · One per customer · Free shipping over €60","30 gün geçerli · Müşteri başına bir · €60 üzeri ücretsiz kargo")}</div>
    </aside>
  );
}

function ExitIntent({ onShop }) {
  useLang();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let seen = false;
    try { seen = !!localStorage.getItem("esmee.coupon_seen"); } catch (e) {}
    if (sessionStorage.getItem("esmee.exit") || seen) { setDone(true); return; }
    const onMove = (e) => {
      // Cursor leaves toward top of window
      if (e.clientY <= 4 && !done) {
        setOpen(true);
        setDone(true);
        sessionStorage.setItem("esmee.exit", "1");
        try { localStorage.setItem("esmee.coupon_seen", "1"); } catch (err) {}
      }
    };
    document.addEventListener("mouseout", onMove);
    return () => document.removeEventListener("mouseout", onMove);
  }, [done]);
  if (done && !open) return null;
  const close = () => setOpen(false);
  const goShop = () => { setOpen(false); onShop && onShop(); };
  const copy = () => {
    try { navigator.clipboard?.writeText(FIRSTCUP_CODE); } catch (e) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className={"exit-toast " + (open ? "in" : "")}>
      <span className="kicker">{tr("— Bevor du gehst","— Before you go","— Gitmeden önce")}</span>
      <h5>{tr("10 €. Auf deinen ersten Beutel.","€10. On your first pouch.","10 €. İlk paketine.")}</h5>
      <p>{tr("Eine kleine Einladung. Kopier den Code und gib ihn im Checkout ein — gültig für die nächsten 30 Tage.","A small invitation. Copy the code and enter it at checkout — valid for the next 30 days.","Küçük bir davet. Kodu kopyala ve ödemede gir — önümüzdeki 30 gün geçerli.")}</p>
      <button type="button" className={"code code-btn " + (copied ? "copied" : "")} onClick={copy} aria-label={tr("Code kopieren","Copy code","Kodu kopyala")}>
        {FIRSTCUP_CODE}<span className="code-hint">{copied ? tr("Kopiert ✓","Copied ✓","Kopyalandı ✓") : tr("Kopieren","Copy","Kopyala")}</span>
      </button>
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
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const wrapRef = useRef(null);
  // Outline-fill on scroll — only while the footer is on-screen
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    let raf = 0;
    let inView = false;
    const run = () => {
      raf = 0;
      const sigWrap = el.querySelector(".signature-wrap");
      const outline = el.querySelector(".outline");
      if (!sigWrap || !outline) return;
      const r = sigWrap.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height * 0.4)));
      outline.style.setProperty("--fill-pct", (p * 100) + "%");
    };
    const onScroll = () => { if (raf || !inView) return; raf = requestAnimationFrame(run); };
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (inView && !raf) raf = requestAnimationFrame(run);
    }, { threshold: 0 });
    io.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); io.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  const submit = (e) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSent(true);
  };
  return (
    <footer className="foot-v2" ref={wrapRef}>
      <div className="inner">
        <div className="clock-row">
          <span>{tr("In kleinen Chargen gemischt","Blended in small batches","Küçük partilerde harmanlanır")}</span>
        </div>

        <div className="signature-wrap">
          <span className="outline">Esmee</span>
          <span className="tag">— Manduraa · traditional inspired hot drink</span>
        </div>

        <div className="nl-card">
          <div className="nl-text">
            <span className="nl-kicker">{tr("— Post von Esmee","— Letters from Esmee","— Esmee'den mektup")}</span>
            <h3>{tr("Briefe aus der Manufaktur.","Letters from the workshop.","Mutfaktan mektuplar.")}</h3>
            <p>{tr("Eine kurze Notiz ab und zu: die Geschichte hinter Manduraa, neue Größen und leise Empfehlungen für deine Tasse. Kein Spam.","An occasional short note: the story behind Manduraa, new sizes and quiet tips for your cup. No spam.","Ara sıra kısa bir not: Manduraa'nın hikâyesi, yeni boyutlar ve fincanın için küçük öneriler. Spam yok.")}</p>
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
              <li><a href="#shop">Manduraa<span className="arr">↗</span></a></li>
              <li><a href="#universe">{tr("Zutaten","Ingredients","Malzemeler")}<span className="arr">↗</span></a></li>
              <li><a href="#zubehoer">{tr("Kupfer-Set","Copper set","Bakır set")}<span className="arr">↗</span></a></li>
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
              <li><a href="/versand">{tr("Versand & Zahlung","Shipping & payment","Kargo & ödeme")}<span className="arr">↗</span></a></li>
              <li><a href="/widerruf">{tr("Widerruf & Rückgabe","Returns & refunds","İade & geri ödeme")}<span className="arr">↗</span></a></li>
              <li><a href="mailto:info@esmee-drinks.de">{tr("Kontakt","Contact","İletişim")}<span className="arr">↗</span></a></li>
            </ul>
          </div>
          <div>
            <h4>{tr("Folgen","Follow","Takip et")}</h4>
            <ul>
              <li><a href="#">Instagram<span className="arr">↗</span></a></li>
              <li><a href="#">TikTok<span className="arr">↗</span></a></li>
              <li><a href="#">Pinterest<span className="arr">↗</span></a></li>
              <li><a href="#">{tr("Spotify · Manufaktur-Playlist","Spotify · workshop playlist","Spotify · mutfak çalma listesi")}<span className="arr">↗</span></a></li>
            </ul>
          </div>
        </div>

        <div className="bottom">
          <span>{tr("© 2026 — Von Hand gemischt · in Tradition von Elazığ & Anatolien","© 2026 — Hand-blended · in the tradition of Elazığ & Anatolia","© 2026 — Elde harmanlandı · Elazığ & Anadolu geleneğinde")}</span>
          <span className="pay">
            <span className="pay-label">{tr("Wir akzeptieren","We accept","Kabul ettiklerimiz")}</span>
            <PaymentIcons />
          </span>
          <span className="foot-legal">
            <a href="/impressum">Impressum</a>
            <a href="/datenschutz">{tr("Datenschutz","Privacy","Gizlilik")}</a>
            <a href="/agb">AGB</a>
            <a href="/widerruf">{tr("Widerruf","Returns","İade")}</a>
          </span>
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

  useReveal();
  useParallax();
  useSmoothScroll();
  useTabAttention();
  const audio = useAudio();

  // Header + mini-bar visibility — derived from scroll WITHOUT storing the raw
  // scroll position in state (that re-rendered the whole App on every frame and
  // forced synchronous main-thread scrolling on iOS Safari → janky/stepped scroll).
  // We only setState when the boolean actually flips, so the tree re-renders a
  // handful of times instead of 60×/second.
  const [scrolled, setScrolled] = useState(false);
  const [miniVisible, setMiniVisible] = useState(false);
  useEffect(() => {
    let raf = 0;
    const compute = () => {
      raf = 0;
      const y = window.scrollY;
      const vh = window.innerHeight || 800;
      setScrolled(prev => { const v = y > 80; return v === prev ? prev : v; });
      const shop = document.getElementById("shop");
      let show = y > vh * 0.9;
      if (shop) {
        const r = shop.getBoundingClientRect();
        const sTop = r.top + y;
        const sBot = sTop + r.height;
        // Hide while the Shop block is on screen (its own ATC is right there).
        const inShop = y + vh > sTop + 80 && y < sBot - 120;
        if (inShop) show = false;
      }
      setMiniVisible(prev => show === prev ? prev : show);
    };
    const onScroll = () => { if (raf) return; raf = requestAnimationFrame(compute); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    compute();
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, []);

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

  // Featured Copper set (measuring spoon & water gauge) — live Shopify add-on
  // when connected, otherwise a safe display fallback.
  const copperAddon = (liveAddons || []).find(a => /kupfer|copper/i.test(String(a.id))) ||
    { id: "kupfer-set", name: null, sub: null, price: 24.90 };
  const copperInCart = cart.some(it => it.addonId === copperAddon.id);
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
        <SpecSheet />
        <Vs />
        <Benefits />
        <Ritual />
        <FounderStory />
        <Shop onAdd={addToCart} onMagnetMove={onMagnetMove} onTap={audio.playTap} liveVariants={liveVariants} sellingPlans={sellingPlans} />
        <AddonFeature
          addon={copperAddon}
          inCart={copperInCart}
          onAdd={() => addAddon({ ...copperAddon, name: copperAddon.name || "Kupfer-Set — Messlöffel & Wassermesser", icon: addonIcon(copperAddon.id) })}
          onTap={audio.playTap}
        />
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
      <CouponGate onShop={scrollToShop} />
      <ExitIntent onShop={scrollToShop} />
      <WhatsAppWidget />
    </div>
  );
}

export default App;
