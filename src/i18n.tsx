// @ts-nocheck
/* Lightweight i18n for the Esmee storefront.
   Default language: German (de). Also: English (en), Turkish (tr).

   Usage at a call site:
     const { lang } = useLang();          // subscribe so the node re-renders on switch
     tr("Deutsch", "English", "Türkçe")   // returns the string for the active language

   `tr()` reads a module-level `currentLang` that the provider keeps in sync with the
   rendered language, so it also works inside data builders called during render
   (e.g. getScenes()). German is always the fallback. */

import React, { createContext, useContext, useEffect, useState } from "react";

export type Lang = "de" | "en" | "tr";
export const LANGS: Lang[] = ["de", "en", "tr"];
export const LANG_LABEL: Record<Lang, string> = { de: "DE", en: "EN", tr: "TR" };

let currentLang: Lang = "de";

/** Pick the active-language string. German is the default + fallback. */
export function tr(de, en, trk) {
  if (currentLang === "en") return en == null ? de : en;
  if (currentLang === "tr") return trk == null ? de : trk;
  return de;
}

const LangContext = createContext({ lang: "de" as Lang, setLang: (_l: Lang) => {} });

function readInitial(): Lang {
  try {
    const s = localStorage.getItem("esmee.lang");
    if (s === "de" || s === "en" || s === "tr") return s;
  } catch (e) {}
  return "de";
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState<Lang>(readInitial);
  // Sync the module global synchronously during render so tr() in this pass is correct.
  currentLang = lang;
  useEffect(() => {
    currentLang = lang;
    try { document.documentElement.lang = lang; } catch (e) {}
    try { localStorage.setItem("esmee.lang", lang); } catch (e) {}
    // Localize the document title + meta description for the active language so
    // shares and (JS-rendered) crawls reflect the chosen language. Legal pages
    // tag <html data-legal> and set their own title, so they are skipped here.
    try {
      if (!document.documentElement.hasAttribute("data-legal")) {
        const t = {
          de: "Esmee Manduraa – mit Datteln gesüßt, entkoffeiniert | 8 Zutaten",
          en: "Esmee Manduraa – sweetened with dates, decaffeinated | 8 ingredients",
          tr: "Esmee Manduraa – hurmayla tatlandırılmış, kafeinsiz | 8 malzeme",
        }[lang];
        const d = {
          de: "Manduraa von Esmee: ein traditionsinspiriertes Heißgetränk aus 8 Zutaten – mit Datteln gesüßt statt Zucker, entkoffeiniert und vegan. Jetzt ab 19,90 €.",
          en: "Esmee Manduraa: a tradition-inspired hot drink of 8 ingredients – sweetened with dates instead of sugar, decaffeinated and vegan. From €19.90.",
          tr: "Esmee Manduraa: 8 malzemeli, gelenekten ilham alan sıcak içecek – şeker yerine hurmayla tatlandırılmış, kafeinsiz ve vegan. 19,90 €'dan başlayan fiyatlarla.",
        }[lang];
        if (t) document.title = t;
        const md = document.querySelector('meta[name="description"]');
        if (md && d) md.setAttribute("content", d);
      }
    } catch (e) {}
  }, [lang]);
  const setLang = (l: Lang) => setLangState(l);
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
