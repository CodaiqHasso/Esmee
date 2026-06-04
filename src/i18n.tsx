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
  }, [lang]);
  const setLang = (l: Lang) => setLangState(l);
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
