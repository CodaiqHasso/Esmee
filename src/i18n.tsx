import { useSyncExternalStore, type ReactNode } from "react";

export type Lang = "de" | "en" | "tr";
export const LANGS: Lang[] = ["de", "en", "tr"];
export const LANG_LABEL: Record<Lang, string> = { de: "DE", en: "EN", tr: "TR" };
function readInitial(): Lang {
  try {
    const value = localStorage.getItem("esmee.lang");
    if (value === "de" || value === "en" || value === "tr") return value;
  } catch { /* Storage restrictions must not prevent loading the shop. */ }
  return "de";
}
let currentLang: Lang = readInitial();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const getSnapshot = () => currentLang;
const getServerSnapshot = (): Lang => "de";
function setLang(lang: Lang) {
  if (lang === currentLang) return;
  currentLang = lang;
  for (const listener of listeners) listener();
}
/** Read the same external store as useLang; no mutation during React render. */
export function tr(de: string, en: string, trk: string): string;
export function tr(de: ReactNode, en: ReactNode, trk: ReactNode): ReactNode;
export function tr(de: ReactNode, en: ReactNode, trk: ReactNode): ReactNode {
  return currentLang === "en" ? en ?? de : currentLang === "tr" ? trk ?? de : de;
}
export function useLang() {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { lang, setLang };
}
