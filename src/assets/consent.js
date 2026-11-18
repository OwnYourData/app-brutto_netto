// Einwilligungs-Banner und Google-Ads-Conversion-Messung (docs/Consent.md).
// Nach dem Muster von dpp-service.ownyourdata.eu.
//
// Google Consent Mode v2, "basic": Vor der Zustimmung wird nichts von Google geladen.
// Nach der Zustimmung wird nur das Google-Ads-Tag geladen, ohne config-Befehl: keine
// Seitenaufrufe, keine Analyse, kein Remarketing, keine Personalisierung. Gesendet wird
// nur, wenn eine Conversion stattfindet. Eingegebene Werte werden nie übergeben: Sie
// stehen weder in der Adresse der Seite noch in einem Ereignis.
// Die Wahl liegt höchstens zwölf Monate im localStorage und kann jederzeit über ein Element
// mit dem Attribut data-consent-settings ("Einwilligung ändern" im Fußbereich) geändert werden.
import config from "./consent-config.js";

const ID_FORMAT = /^AW-\d{6,15}$/;
const LABEL_FORMAT = /^[A-Za-z0-9_-]{1,64}$/;
const STORAGE_KEY = "bnr-consent";
const STORAGE_VERSION = 1;
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const GOOGLE_COOKIE = /^(_gcl_|_gac_)/;
const TAG_URL = "https://www.googletagmanager.com/gtag/js?id=";

const EN = document.documentElement.lang.startsWith("en");
const T = EN ? {
  titel: "Measuring our ads",
  text: "OwnYourData advertises this free calculator with Google Ads. With your consent, Google’s conversion tag tells us when a visit from one of our ads leads to a calculation or to our source code on GitHub. Your input is never transmitted. Google then sets cookies and receives your IP address and browser details, possibly in the USA. No analytics, no remarketing. Without your consent nothing is loaded from Google. You can change your choice at any time under “Consent settings” at the bottom of the page.",
  datenschutz: "Privacy policy", datenschutzUrl: "/en/privacy/",
  ablehnen: "Decline", zustimmen: "Accept",
  aktuellJa: "Your current choice: accepted.", aktuellNein: "Your current choice: declined."
} : {
  titel: "Messung unserer Anzeigen",
  text: "OwnYourData bewirbt diesen kostenlosen Rechner mit Google Ads. Mit Ihrer Einwilligung meldet das Conversion-Tag von Google, wenn ein Besuch über eine unserer Anzeigen zu einer Berechnung oder zu unserem Quellcode auf GitHub führt. Ihre Eingaben werden dabei nie übertragen. Google setzt dann Cookies und erhält Ihre IP-Adresse und Browserdaten, möglicherweise auch in den USA. Keine Analyse, kein Remarketing. Ohne Einwilligung wird nichts von Google geladen. Sie können Ihre Wahl jederzeit unter „Einwilligung ändern“ unten auf der Seite ändern.",
  datenschutz: "Datenschutzerklärung", datenschutzUrl: "/datenschutz/",
  ablehnen: "Ablehnen", zustimmen: "Zustimmen",
  aktuellJa: "Ihre derzeitige Wahl: zugestimmt.", aktuellNein: "Ihre derzeitige Wahl: abgelehnt."
};

const id = ID_FORMAT.test(String(config.id || "")) ? config.id : null;
const targets = {};
if (id) {
  for (const [name, label] of Object.entries(config.conversions || {})) {
    if (LABEL_FORMAT.test(String(label || ""))) targets[name] = `${id}/${label}`;
  }
}

let tagLoaded = false;
let banner = null;
let berechnungGemeldet = false;

function readChoice() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    if (!stored || stored.v !== STORAGE_VERSION || typeof stored.ads !== "boolean") return null;
    const at = Date.parse(stored.at);
    if (!(at > 0) || Date.now() - at > MAX_AGE_MS) return null;
    return stored.ads;
  } catch (e) {
    return null;
  }
}

function storeChoice(ads) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: STORAGE_VERSION, ads, at: new Date().toISOString() }));
  } catch (e) {
    // Ohne Speicher erscheint das Banner beim nächsten Aufruf wieder.
  }
}

function gtag() {
  window.dataLayer.push(arguments);
}

function loadTag() {
  if (tagLoaded) return;
  tagLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = gtag;
  gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" });
  gtag("consent", "update", { ad_storage: "granted", ad_user_data: "granted" });
  gtag("set", { allow_ad_personalization_signals: false });
  gtag("js", new Date());
  const script = document.createElement("script");
  script.async = true;
  script.src = TAG_URL + encodeURIComponent(id);
  document.head.appendChild(script);
}

function convert(name) {
  const target = targets[name];
  if (!tagLoaded || !target) return false;
  gtag("event", "conversion", { send_to: target, transport_type: "beacon" });
  return true;
}

function conversionFor(link) {
  const named = link.getAttribute("data-conversion");
  if (named !== null) return named;
  let url;
  try {
    url = new URL(link.getAttribute("href"), window.location.href);
  } catch (e) {
    return null;
  }
  if (url.hostname === "github.com" && /^\/OwnYourData\/[^/]+/.test(url.pathname)) return "github";
  return null;
}

function onLinkActivated(event) {
  if (event.type === "auxclick" && event.button !== 1) return;
  const link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
  if (!link) return;
  const name = conversionFor(link);
  if (name) convert(name);
}

function onBerechnet(event) {
  if (berechnungGemeldet || !event.detail || !event.detail.durchNutzer) return;
  if (convert("berechnung")) berechnungGemeldet = true;
}

function deleteGoogleCookies() {
  const labels = window.location.hostname.split(".");
  document.cookie.split(";").forEach((pair) => {
    const name = pair.split("=")[0].trim();
    if (!GOOGLE_COOKIE.test(name)) return;
    document.cookie = `${name}=; Max-Age=0; path=/`;
    for (let i = 0; i < labels.length - 1; i++) {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.${labels.slice(i).join(".")}`;
    }
  });
}

function choose(ads) {
  storeChoice(ads);
  if (banner) banner.hidden = true;
  if (ads) {
    loadTag();
    return;
  }
  deleteGoogleCookies();
  if (tagLoaded) {
    gtag("consent", "update", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    window.location.reload();
  }
}

function element(tag, attrs, text) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  if (text) e.textContent = text;
  return e;
}

function showBanner(focus) {
  if (!banner) {
    banner = element("section", { class: "consent", "aria-labelledby": "consent-titel" });
    const box = element("div", { class: "consent-box" });
    const p = element("p", {}, T.text + " ");
    p.append(element("a", { href: T.datenschutzUrl }, T.datenschutz));
    const aktion = element("div", { class: "consent-actions" });
    aktion.append(
      element("button", { type: "button", "data-choice": "decline" }, T.ablehnen),
      element("button", { type: "button", "data-choice": "accept" }, T.zustimmen)
    );
    box.append(element("h2", { id: "consent-titel" }, T.titel), p, element("p", { class: "consent-current", hidden: "" }), aktion);
    banner.append(box);
    banner.addEventListener("click", (event) => {
      const button = event.target.closest ? event.target.closest("button[data-choice]") : null;
      if (button) choose(button.getAttribute("data-choice") === "accept");
    });
    document.body.appendChild(banner);
  }
  const current = banner.querySelector(".consent-current");
  const choice = readChoice();
  current.hidden = choice === null;
  current.textContent = choice === true ? T.aktuellJa : choice === false ? T.aktuellNein : "";
  banner.hidden = false;
  if (focus) banner.querySelector("button").focus();
}

function init() {
  for (const el of document.querySelectorAll("[data-consent-settings]")) {
    el.hidden = false;
    el.addEventListener("click", (event) => { event.preventDefault(); showBanner(true); });
  }
  document.addEventListener("click", onLinkActivated, true);
  document.addEventListener("auxclick", onLinkActivated, true);
  document.addEventListener("bnr:berechnet", onBerechnet);
  const choice = readChoice();
  if (choice === true) loadTag();
  else if (choice === null) showBanner(false);
}

if (id) {
  window.bnrConsent = { open: () => showBanner(true) };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
}
