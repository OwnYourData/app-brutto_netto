// Oberfläche des Brutto/Netto-Rechners. Rechnet bei jeder Eingabe neu, ausschließlich im Browser.
// Es gibt keinen Server-Endpunkt für Eingaben; geladen werden nur die Werte-Dateien dieser Seite.
// Ausgaben werden nur über textContent gesetzt, nie als HTML.
import { berechne, bruttoAusNetto, erlaubteFamilienbonusAnteile } from "../kern/rechner.js";

const EN = document.documentElement.lang.startsWith("en");
const T = EN ? {
  nettoMonat: "Net per month", bruttoMonat: "Gross per month",
  vorlaeufig: (j) => `Provisional values for ${j}: the social insurance figures for ${j} have not been officially published yet.`,
  pendlerpauschale: "Commuter allowance per month", pendlereuro: "Commuter euro per month",
  familienbonus: "Family Bonus Plus used per month", verkehrsabsetzbetrag: "Transport tax credit per year",
  stundenBrutto: "Gross per hour", stundenNetto: "Net per hour",
  zuschlag: "Supplement to the transport tax credit and wage tax adjustment", gutschrift: "Refund of social insurance and tax credits",
  kindermehrbetrag: "Additional child amount",
  nachzahlung: "Expected additional payment", proJahr: "per year",
  kind: "Child", alter: "Age", anteil: "Your share", entfernen: "Remove child",
  unter4: "under 4", "4bis17": "4 to 17", ab18: "18 or older",
  ungueltig: "Please enter an amount, e.g. 3,000.", zuHoch: "Please enter an amount below 1,000,000 euros.",
  geringfuegig: "Marginal employment: no employee social insurance contributions.",
  quelle: "Source", stand: "as of"
} : {
  nettoMonat: "Netto pro Monat", bruttoMonat: "Brutto pro Monat",
  vorlaeufig: (j) => `Vorläufige Werte für ${j}: Die Sozialversicherungswerte ${j} sind noch nicht kundgemacht.`,
  pendlerpauschale: "Pendlerpauschale pro Monat", pendlereuro: "Pendlereuro pro Monat",
  familienbonus: "Familienbonus Plus genutzt pro Monat", verkehrsabsetzbetrag: "Verkehrsabsetzbetrag pro Jahr",
  stundenBrutto: "Brutto pro Stunde", stundenNetto: "Netto pro Stunde",
  zuschlag: "Zuschlag zum Verkehrsabsetzbetrag und Ausgleich der Lohnsteuer", gutschrift: "SV-Rückerstattung und Gutschrift von Absetzbeträgen",
  kindermehrbetrag: "Kindermehrbetrag",
  nachzahlung: "Voraussichtliche Nachzahlung", proJahr: "pro Jahr",
  kind: "Kind", alter: "Alter", anteil: "Ihr Anteil", entfernen: "Kind entfernen",
  unter4: "unter 4", "4bis17": "4 bis 17", ab18: "18 oder älter",
  ungueltig: "Bitte einen Betrag eingeben, z. B. 3.000.", zuHoch: "Bitte einen Betrag unter 1.000.000 Euro eingeben.",
  geringfuegig: "Geringfügige Beschäftigung: keine Sozialversicherungsbeiträge der Dienstnehmer:innen.",
  quelle: "Quelle", stand: "Stand"
};

const euro = new Intl.NumberFormat(EN ? "en-GB" : "de-AT", { style: "currency", currency: "EUR" });
// de-DE für die Tabelle: Tausenderpunkt wie im Eurobetrag ("1.200,00" statt "1 200,00").
const zahl = new Intl.NumberFormat(EN ? "en-GB" : "de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const alsEuro = (cent) => euro.format(cent / 100);
const alsZahl = (cent) => zahl.format(cent / 100);

const $ = (id) => document.getElementById(id);
const werteCache = new Map();

async function ladeWerte(jahr) {
  if (!werteCache.has(jahr)) {
    const antwort = await fetch(new URL(`../werte/${jahr}.json`, import.meta.url), { credentials: "omit", cache: "no-cache" });
    if (!antwort.ok) throw new Error(`Werte ${jahr} nicht verfügbar`);
    werteCache.set(jahr, await antwort.json());
  }
  return werteCache.get(jahr);
}

// "3.500,50" (de) bzw. "3,500.50" (en) in Cent; null bei ungültiger Eingabe.
export function leseBetrag(text, englisch) {
  let s = String(text).replace(/[\s€]/g, "");
  if (s === "") return null;
  s = englisch ? s.replace(/,/g, "") : s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

function radio(name) {
  return document.querySelector(`input[name="${name}"]:checked`).value;
}

// ---------------------------------------------------------------------------
// Kinder
// ---------------------------------------------------------------------------

let kindNummer = 0;

function option(wert, text, gewaehlt) {
  const o = document.createElement("option");
  o.value = wert;
  o.textContent = text;
  if (gewaehlt) o.selected = true;
  return o;
}

function fuelleAnteile(werte, zeile) {
  const alter = zeile.querySelector(".k-alter").value;
  const auswahl = zeile.querySelector(".k-anteil");
  const bisher = Number(auswahl.value);
  const erlaubt = erlaubteFamilienbonusAnteile(werte, { alter });
  auswahl.replaceChildren(...erlaubt.map((a) => option(String(a), `${a} %`, a === bisher)));
  if (!erlaubt.includes(bisher)) auswahl.value = String(erlaubt[0]);
}

function neuesKind(werte) {
  kindNummer += 1;
  const n = kindNummer;
  const zeile = document.createElement("div");
  zeile.className = "kind";
  const feld = (klasse, text, element) => {
    const f = document.createElement("div");
    f.className = "field";
    const l = document.createElement("label");
    l.htmlFor = `${klasse}-${n}`;
    l.textContent = text;
    element.id = `${klasse}-${n}`;
    element.className = klasse;
    f.append(l, element);
    return f;
  };
  const alter = document.createElement("select");
  alter.append(option("unter4", T.unter4), option("4bis17", T["4bis17"], true), option("ab18", T.ab18));
  const anteil = document.createElement("select");
  const weg = document.createElement("button");
  weg.type = "button";
  weg.className = "btn small quiet";
  weg.textContent = "×";
  weg.setAttribute("aria-label", `${T.entfernen} ${n}`);
  weg.addEventListener("click", () => { zeile.remove(); aktualisiere(); });
  zeile.append(feld("k-alter", `${T.kind}: ${T.alter}`, alter), feld("k-anteil", T.anteil, anteil), weg);
  alter.addEventListener("change", () => fuelleAnteile(werte, zeile));
  $("kinder").append(zeile);
  fuelleAnteile(werte, zeile);
  alter.focus();
}

// ---------------------------------------------------------------------------
// Rechnen und Anzeigen
// ---------------------------------------------------------------------------

function eingabenAusFormular(werte) {
  const kinder = [...document.querySelectorAll("#kinder .kind")].map((z) => ({
    alter: z.querySelector(".k-alter").value,
    anteil: Number(z.querySelector(".k-anteil").value)
  }));
  const pendeln = $("pendeln").checked;
  return {
    bundesland: $("bundesland").value,
    bezuege: Number($("bezuege").value),
    beginn: werte.sv.av_staffel.alle ? undefined : $("beginn").value,
    pendler: pendeln ? { art: radio("pendlerArt"), km: Math.max(0, Math.floor(Number($("km").value) || 0)), anteil: $("tage").value } : null,
    familienbonus: kinder,
    alleinverdienerKinder: $("avab").checked ? kinder.length : 0
  };
}

function zeigeFehler(text) {
  $("fehler").textContent = text;
  $("fehler").hidden = !text;
}

function setzeZeile(feld, werteJeSpalte) {
  const zellen = document.querySelectorAll(`#tabelle tr[data-feld="${feld}"] td`);
  werteJeSpalte.forEach((w, i) => { zellen[i].textContent = w === null ? "" : alsZahl(w); });
}

function detail(dl, text, wert) {
  const dt = document.createElement("dt");
  dt.textContent = text;
  const dd = document.createElement("dd");
  dd.textContent = wert;
  dl.append(dt, dd);
}

function zeige(werte, r, eingegebenAls, stunden) {
  const m = r.monat;
  const z13 = r.bezug13;
  const z14 = r.bezug14;
  const mitSz = z13 !== null;
  document.querySelectorAll("#tabelle .sz").forEach((e) => { e.hidden = !mitSz; });
  for (const feld of ["brutto", "sozialversicherung", "lohnsteuer", "netto"]) {
    setzeZeile(feld, [m[feld], mitSz ? z13[feld] : null, mitSz ? z14[feld] : null, r.jahressumme[feld]]);
  }
  $("haupt-label").textContent = eingegebenAls === "netto" ? T.bruttoMonat : T.nettoMonat;
  $("haupt-wert").textContent = alsEuro(eingegebenAls === "netto" ? m.brutto : m.netto);

  const dl = $("details");
  dl.replaceChildren();
  if (m.details.geringfuegig) detail(dl, T.geringfuegig, "");
  if (m.details.pendlerpauschale > 0) {
    detail(dl, T.pendlerpauschale, alsEuro(m.details.pendlerpauschale));
    detail(dl, T.pendlereuro, alsEuro(m.details.pendlereuroMonat));
  }
  if (m.details.familienbonusGenutzt > 0) detail(dl, T.familienbonus, alsEuro(m.details.familienbonusGenutzt));
  if (stunden > 0) {
    const stundenJeMonat = (stunden * 52) / 12;
    detail(dl, T.stundenBrutto, euro.format(m.brutto / 100 / stundenJeMonat));
    detail(dl, T.stundenNetto, euro.format(m.netto / 100 / stundenJeMonat));
  }

  const v = r.veranlagung;
  const box = $("veranlagung");
  if (Math.abs(v.ergebnis) >= 100) {
    box.hidden = false;
    $("veranlagung-wert").textContent = v.ergebnis > 0
      ? `+ ${alsEuro(v.ergebnis)} ${T.proJahr}`
      : `${T.nachzahlung}: ${alsEuro(-v.ergebnis)} ${T.proJahr}`;
    const teile = $("veranlagung-teile");
    teile.replaceChildren();
    const teil = (text, cent) => {
      if (cent === 0) return;
      const li = document.createElement("li");
      li.textContent = `${text}: ${alsEuro(cent)}`;
      teile.append(li);
    };
    teil(T.zuschlag, v.ergebnis - v.gutschrift - v.kindermehrbetrag);
    teil(T.gutschrift, v.gutschrift);
    teil(T.kindermehrbetrag, v.kindermehrbetrag);
  } else {
    box.hidden = true;
  }

  const hinweis = $("hinweis-vorlaeufig");
  hinweis.hidden = werte.status !== "vorlaeufig";
  hinweis.textContent = werte.status === "vorlaeufig" ? T.vorlaeufig(werte.jahr) : "";
}

function zeigeQuellen(werte) {
  const liste = $("quellen");
  liste.replaceChildren();
  for (const q of Object.values(werte.quellen)) {
    const li = document.createElement("li");
    li.append(`${q.titel} – ${q.fundstelle} (${T.stand} ${q.stand})`);
    if (q.url) {
      li.append(" ");
      const a = document.createElement("a");
      a.href = q.url;
      a.textContent = T.quelle;
      a.rel = "noreferrer";
      li.append(a);
    }
    liste.append(li);
  }
}

let laufend = 0;

async function aktualisiere() {
  const nummer = ++laufend;
  const jahr = Number($("jahr").value);
  let werte;
  try {
    werte = await ladeWerte(jahr);
  } catch (e) {
    zeigeFehler(e.message);
    return;
  }
  if (nummer !== laufend) return;

  $("beginn-feld").hidden = Boolean(werte.sv.av_staffel.alle);
  $("pendeln-felder").hidden = !$("pendeln").checked;
  $("avab-feld").hidden = document.querySelectorAll("#kinder .kind").length === 0;
  document.querySelectorAll("#kinder .kind").forEach((z) => fuelleAnteile(werte, z));
  zeigeQuellen(werte);

  const betrag = leseBetrag($("betrag").value, EN);
  if (betrag === null) { zeigeFehler(T.ungueltig); return; }
  if (betrag >= 100000000) { zeigeFehler(T.zuHoch); return; }

  const art = radio("art");
  const eingaben = eingabenAusFormular(werte);
  try {
    const r = art === "netto"
      ? bruttoAusNetto(werte, { ...eingaben, nettoMonat: betrag })
      : berechne(werte, { ...eingaben, bruttoMonat: betrag });
    zeigeFehler("");
    zeige(werte, r, art, Number($("stunden").value) || 0);
    document.dispatchEvent(new CustomEvent("bnr:berechnet"));
  } catch (e) {
    zeigeFehler(e.message);
  }
}

async function start() {
  const form = $("eingaben");
  form.addEventListener("input", aktualisiere);
  form.addEventListener("change", aktualisiere);
  form.addEventListener("submit", (e) => e.preventDefault());
  $("kind-dazu").addEventListener("click", async () => {
    neuesKind(await ladeWerte(Number($("jahr").value)));
    aktualisiere();
  });
  await aktualisiere();
}

if (typeof document !== "undefined" && document.getElementById("eingaben")) start();
