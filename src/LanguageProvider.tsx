import { useEffect, type ReactNode } from "react";
import { useLang } from "./i18n";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  useEffect(() => {
    document.documentElement.lang = document.documentElement.hasAttribute("data-legal") ? "de" : lang;
    try { localStorage.setItem("esmee.lang", lang); } catch { /* Browser storage may be unavailable. */ }
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
    } catch { /* Browser storage may be unavailable. */ }
  }, [lang]);
  return <>{children}</>;
}
