// Rechenkern des Brutto/Netto-Rechners für unselbständig Beschäftigte in Österreich.
//
// Bildet die laufende Lohnverrechnung ab (wie der Brutto-Netto-Rechner des BMF):
// Sozialversicherung der Dienstnehmer:innen, Lohnsteuer nach dem Tarif des Jahres,
// 13. und 14. Bezug mit festen Steuersätzen, Pendlerpauschale und Pendlereuro,
// Verkehrsabsetzbetrag, Alleinverdiener-/Alleinerzieherabsetzbetrag und Familienbonus Plus.
//
// Alle Beträge sind ganze Cent, alle Sätze Hundertstelprozent (1807 = 18,07 %).
// Gerundet wird kaufmännisch auf ganze Cent, und zwar erst am Ende jeder Teilrechnung.
// Die Werte eines Jahres kommen ausschließlich aus src/werte/<jahr>.json.

const MONATE = 12;
const SATZ_NENNER = 10000;

// Kaufmännisch gerundete Division zweier ganzer Zahlen (halbe Cent werden aufgerundet).
export function rundeDiv(zaehler, nenner) {
  if (nenner <= 0) throw new RangeError("Nenner muss positiv sein");
  if (zaehler < 0) return -rundeDiv(-zaehler, nenner);
  return Math.floor((2 * zaehler + nenner) / (2 * nenner));
}

function wert(eintrag) {
  return typeof eintrag === "object" && eintrag !== null ? eintrag.wert : eintrag;
}

function pruefeCent(name, betrag) {
  if (!Number.isInteger(betrag) || betrag < 0) {
    throw new RangeError(`${name} muss ein nicht negativer Betrag in ganzen Cent sein`);
  }
}

// ---------------------------------------------------------------------------
// Sozialversicherung
// ---------------------------------------------------------------------------

// Dienstnehmeranteil zur Arbeitslosenversicherung; bei geringem Entgelt vermindert.
// Für 2027 hängt die Staffel davon ab, ob das Dienstverhältnis vor 2027 begonnen hat.
export function avSatz(werte, entgelt, beginn) {
  const staffel = werte.sv.av_staffel;
  let stufen = staffel.alle;
  if (!stufen) {
    if (beginn !== "vor" && beginn !== "ab") {
      throw new RangeError(`Für ${werte.jahr} ist anzugeben, ob das Dienstverhältnis vor oder ab dem 1.1.${werte.jahr} begonnen hat`);
    }
    stufen = beginn === "vor" ? staffel.beginn_vor : staffel.beginn_ab;
  }
  for (const stufe of stufen) {
    if (entgelt <= stufe.bis) return stufe.satz;
  }
  return wert(werte.sv.saetze_dn.arbeitslosenversicherung);
}

function svSatzLaufend(werte, entgelt, eingaben) {
  const s = werte.sv.saetze_dn;
  const wf = eingaben.bundesland === "wien" ? s.wohnbaufoerderung.wien : s.wohnbaufoerderung.wert;
  return wert(s.pensionsversicherung) + wert(s.krankenversicherung) + wert(s.arbeiterkammerumlage) + wf +
    avSatz(werte, entgelt, eingaben.beginn);
}

// Von Sonderzahlungen werden weder AK-Umlage noch Wohnbauförderungsbeitrag eingehoben.
function svSatzSonderzahlung(werte, sonderzahlung, eingaben) {
  const s = werte.sv.saetze_dn;
  return wert(s.pensionsversicherung) + wert(s.krankenversicherung) + avSatz(werte, sonderzahlung, eingaben.beginn);
}

export function istGeringfuegig(werte, bruttoMonat) {
  return bruttoMonat <= wert(werte.sv.geringfuegigkeitsgrenze_monat);
}

// ---------------------------------------------------------------------------
// Lohnsteuer
// ---------------------------------------------------------------------------

// Tarifsteuer für ein Jahreseinkommen, als ganze Zahl in Einheiten von 1/10 000 Cent.
export function tarifsteuerSkaliert(werte, einkommenJahr) {
  let steuer = 0;
  let untergrenze = 0;
  for (const stufe of werte.lohnsteuer.tarif.stufen) {
    const obergrenze = stufe.bis === null ? Infinity : stufe.bis;
    if (einkommenJahr > untergrenze) {
      steuer += (Math.min(einkommenJahr, obergrenze) - untergrenze) * stufe.satz;
    }
    untergrenze = obergrenze;
  }
  return steuer;
}

function anteilFaktor(anteil) {
  if (anteil === undefined || anteil === "voll") return { z: 1, n: 1 };
  if (anteil === "zwei_drittel") return { z: 2, n: 3 };
  if (anteil === "ein_drittel") return { z: 1, n: 3 };
  throw new RangeError(`Unbekannter Anteil der Pendlerpauschale: ${anteil}`);
}

// Pendlerpauschale je Monat. art: "klein" (öffentliches Verkehrsmittel zumutbar) oder "gross".
export function pendlerpauschaleMonat(werte, pendler) {
  if (!pendler) return 0;
  const tabelle = werte.lohnsteuer.pendlerpauschale_monat[pendler.art];
  if (!tabelle) throw new RangeError(`Unbekannte Art der Pendlerpauschale: ${pendler.art}`);
  const km = pendler.km;
  if (!Number.isInteger(km) || km < 0) throw new RangeError("Die Entfernung ist in ganzen Kilometern anzugeben");
  if (km < tabelle.ab_km) return 0;
  let betrag = 0;
  for (const stufe of tabelle.stufen) {
    if (stufe.bis_km === null || km <= stufe.bis_km) { betrag = stufe.wert; break; }
  }
  const f = anteilFaktor(pendler.anteil);
  return rundeDiv(betrag * f.z, f.n);
}

export function pendlereuroJahr(werte, pendler) {
  if (!pendler || pendlerpauschaleMonat(werte, pendler) === 0) return 0;
  const f = anteilFaktor(pendler.anteil);
  return rundeDiv(wert(werte.lohnsteuer.pendlereuro_je_km_jahr) * pendler.km * f.z, f.n);
}

export function verkehrsabsetzbetragJahr(werte, einkommenJahr, mitPendlerpauschale) {
  const normal = wert(werte.lohnsteuer.verkehrsabsetzbetrag_jahr);
  if (!mitPendlerpauschale) return normal;
  const e = werte.lohnsteuer.erhoehter_verkehrsabsetzbetrag;
  if (einkommenJahr <= e.einschleifen_von) return e.wert;
  if (einkommenJahr >= e.einschleifen_bis) return normal;
  return e.wert - rundeDiv((e.wert - normal) * (einkommenJahr - e.einschleifen_von), e.einschleifen_bis - e.einschleifen_von);
}

export function alleinverdienerJahr(werte, kinder) {
  if (!kinder) return 0;
  if (!Number.isInteger(kinder) || kinder < 0) throw new RangeError("Kinderzahl muss eine ganze Zahl sein");
  const a = werte.lohnsteuer.alleinverdiener_jahr;
  if (kinder === 1) return a.ein_kind;
  return a.zwei_kinder + (kinder - 2) * a.je_weiteres_kind;
}

// Zulässige Aufteilungen des Familienbonus Plus je Kind (Prozent für diese Person).
export function erlaubteFamilienbonusAnteile(werte, kind) {
  const a = werte.lohnsteuer.familienbonus_aufteilung;
  if (a.anteile) return a.anteile;
  const ohneEinschraenkung = kind.alter === "unter4" || kind.erhoehteFamilienbeihilfe === true;
  return ohneEinschraenkung ? a.anteile_unter4 : a.anteile_ab4;
}

export function familienbonusMonat(werte, kinder) {
  if (!kinder || kinder.length === 0) return 0;
  const fb = werte.lohnsteuer.familienbonus_monat;
  let summe = 0;
  for (const kind of kinder) {
    if (!["unter4", "4bis17", "ab18"].includes(kind.alter)) throw new RangeError(`Unbekannte Altersgruppe: ${kind.alter}`);
    const erlaubt = erlaubteFamilienbonusAnteile(werte, kind);
    if (!erlaubt.includes(kind.anteil)) {
      throw new RangeError(`Aufteilung ${kind.anteil} % ist für dieses Kind ${werte.jahr} nicht zulässig (erlaubt: ${erlaubt.join(", ")} %)`);
    }
    const voll = kind.alter === "ab18" ? fb.ab18 : fb.unter18;
    summe += rundeDiv(voll * kind.anteil, 100);
  }
  return summe;
}

// Lohnsteuer für einen laufenden Monatsbezug (Lohnsteuer-Bemessungsgrundlage in Cent).
function lohnsteuerLaufend(werte, bmgMonat, absetz) {
  const einkommenJahr = Math.max(0, bmgMonat) * MONATE;
  const tarif = tarifsteuerSkaliert(werte, einkommenJahr);
  const fabo = absetz.familienbonusMonat * MONATE * SATZ_NENNER;
  const faboGenutzt = Math.min(tarif, fabo);
  const vab = verkehrsabsetzbetragJahr(werte, einkommenJahr, absetz.mitPendlerpauschale);
  const uebrige = (vab + absetz.alleinverdienerJahr + absetz.pendlereuroJahr) * SATZ_NENNER;
  const rest = tarif - faboGenutzt - uebrige;
  return {
    lohnsteuer: rest > 0 ? rundeDiv(rest, MONATE * SATZ_NENNER) : 0,
    tarifsteuer: rundeDiv(tarif, MONATE * SATZ_NENNER),
    familienbonusGenutzt: rundeDiv(faboGenutzt, MONATE * SATZ_NENNER),
    verkehrsabsetzbetragJahr: vab
  };
}

// Feste Steuersätze für sonstige Bezüge innerhalb des Jahressechstels; "bisher" ist die
// Summe der bereits so besteuerten Bemessungsgrundlagen dieses Jahres.
function steuerSonstigeBezuegeSkaliert(werte, bisher, bmg) {
  let steuer = 0;
  let untergrenze = 0;
  const von = bisher;
  const bis = bisher + bmg;
  for (const stufe of werte.lohnsteuer.sonstige_bezuege.stufen) {
    const a = Math.max(von, untergrenze);
    const b = Math.min(bis, stufe.bis);
    if (b > a) steuer += (b - a) * stufe.satz;
    untergrenze = stufe.bis;
  }
  return steuer;
}

function obergrenzeFesteSaetze(werte) {
  const stufen = werte.lohnsteuer.sonstige_bezuege.stufen;
  return stufen[stufen.length - 1].bis;
}

// ---------------------------------------------------------------------------
// Gesamtrechnung
// ---------------------------------------------------------------------------

/**
 * Berechnet Monat, 13. und 14. Bezug und Jahr.
 *
 * eingaben = {
 *   bruttoMonat: Cent,
 *   bundesland: "wien" | "burgenland" | … (nur Wien weicht beim Wohnbauförderungsbeitrag ab),
 *   bezuege: 14 | 12,
 *   beginn: "vor" | "ab"   (nur ab 2027 nötig: Beginn des Dienstverhältnisses vor/ab 1.1.),
 *   pendler: { art: "klein" | "gross", km, anteil: "voll" | "zwei_drittel" | "ein_drittel" } | null,
 *   alleinverdienerKinder: Anzahl | 0,
 *   familienbonus: [ { alter: "unter4" | "4bis17" | "ab18", anteil: 100 | 75 | 50 | 25, erhoehteFamilienbeihilfe? } ]
 * }
 */
export function berechne(werte, eingaben) {
  pruefeCent("bruttoMonat", eingaben.bruttoMonat);
  const brutto = eingaben.bruttoMonat;
  const bezuege = eingaben.bezuege ?? 14;
  if (bezuege !== 12 && bezuege !== 14) throw new RangeError("bezuege muss 12 oder 14 sein");

  const geringfuegig = istGeringfuegig(werte, brutto);

  // Laufender Monatsbezug
  const hbglMonat = wert(werte.sv.hoechstbeitragsgrundlage_monat);
  const svBmg = Math.min(brutto, hbglMonat);
  const svSatz = geringfuegig ? 0 : svSatzLaufend(werte, brutto, eingaben);
  const sv = rundeDiv(svBmg * svSatz, SATZ_NENNER);

  const pp = pendlerpauschaleMonat(werte, eingaben.pendler);
  const pe = pendlereuroJahr(werte, eingaben.pendler);
  const wkp = rundeDiv(wert(werte.lohnsteuer.werbungskostenpauschale_jahr), MONATE);
  const bmgMonat = brutto - sv - pp - wkp;
  const absetz = {
    familienbonusMonat: familienbonusMonat(werte, eingaben.familienbonus),
    alleinverdienerJahr: alleinverdienerJahr(werte, eingaben.alleinverdienerKinder),
    pendlereuroJahr: pe,
    mitPendlerpauschale: pp > 0
  };
  const lst = lohnsteuerLaufend(werte, bmgMonat, absetz);

  const monat = {
    brutto,
    sozialversicherung: sv,
    svSatz,
    lohnsteuer: lst.lohnsteuer,
    netto: brutto - sv - lst.lohnsteuer,
    details: {
      geringfuegig,
      lohnsteuerBemessungsgrundlage: Math.max(0, bmgMonat),
      pendlerpauschale: pp,
      pendlereuroMonat: rundeDiv(pe, MONATE),
      tarifsteuer: lst.tarifsteuer,
      familienbonusGenutzt: lst.familienbonusGenutzt,
      verkehrsabsetzbetragJahr: lst.verkehrsabsetzbetragJahr,
      alleinverdienerJahr: absetz.alleinverdienerJahr
    }
  };

  // Sonderzahlungen: 13. Bezug (Urlaubszuschuss) vor dem 14. Bezug (Weihnachtsremuneration).
  const sonderzahlungen = [];
  if (bezuege === 14) {
    const hbglSz = wert(werte.sv.hoechstbeitragsgrundlage_sonderzahlungen_jahr);
    const freigrenze = wert(werte.lohnsteuer.sonstige_bezuege.freigrenze_jahressechstel);
    const jahressechstel = rundeDiv(brutto * MONATE, 6);
    const grenzeFest = obergrenzeFesteSaetze(werte);
    let svBmgVerbraucht = 0;
    let szImSechstel = 0;
    let festBesteuert = 0;
    for (const name of ["bezug13", "bezug14"]) {
      const sz = brutto;
      const bmgSv = Math.min(sz, Math.max(0, hbglSz - svBmgVerbraucht));
      svBmgVerbraucht += bmgSv;
      const satzSz = geringfuegig ? 0 : svSatzSonderzahlung(werte, sz, eingaben);
      const svSz = rundeDiv(bmgSv * satzSz, SATZ_NENNER);

      // Teil innerhalb des Jahressechstels: feste Sätze; darüber: wie ein laufender Bezug.
      const imSechstel = Math.min(sz, Math.max(0, jahressechstel - szImSechstel));
      szImSechstel += imSechstel;
      const ueberSechstel = sz - imSechstel;
      let lstSz = 0;
      let alsLaufend = ueberSechstel;
      if (imSechstel > 0 && jahressechstel > freigrenze) {
        const bmgFest = Math.max(0, imSechstel - svSz);
        const festMoeglich = Math.max(0, grenzeFest - festBesteuert);
        const fest = Math.min(bmgFest, festMoeglich);
        lstSz += rundeDiv(steuerSonstigeBezuegeSkaliert(werte, festBesteuert, fest), SATZ_NENNER);
        festBesteuert += fest;
        alsLaufend += bmgFest - fest;
      }
      if (alsLaufend > 0) {
        // § 67 Abs. 10: zum laufenden Tarif des Auszahlungsmonats.
        const mit = lohnsteuerLaufend(werte, bmgMonat + alsLaufend, absetz).lohnsteuer;
        lstSz += Math.max(0, mit - lst.lohnsteuer);
      }
      sonderzahlungen.push({
        name,
        brutto: sz,
        sozialversicherung: svSz,
        lohnsteuer: lstSz,
        netto: sz - svSz - lstSz
      });
    }
  }

  const summe = (feld) => monat[feld] * MONATE + sonderzahlungen.reduce((s, z) => s + z[feld], 0);
  const jahr = {
    brutto: summe("brutto"),
    sozialversicherung: summe("sozialversicherung"),
    lohnsteuer: summe("lohnsteuer"),
    netto: summe("netto")
  };

  return {
    jahr: werte.jahr,
    status: werte.status,
    monat,
    bezug13: sonderzahlungen[0] ?? null,
    bezug14: sonderzahlungen[1] ?? null,
    jahressumme: jahr
  };
}

/**
 * Umkehrrechnung: kleinstes Monatsbrutto (Cent), dessen Monatsnetto mindestens das gewünschte Netto erreicht.
 * Das Netto steigt nicht überall mit dem Brutto (Stufen der Arbeitslosenversicherung); deshalb wird nach
 * der Bisektion noch geprüft, ob ein kleineres Brutto dasselbe Netto erreicht.
 */
export function bruttoAusNetto(werte, eingaben) {
  pruefeCent("nettoMonat", eingaben.nettoMonat);
  const ziel = eingaben.nettoMonat;
  const netto = (b) => berechne(werte, { ...eingaben, bruttoMonat: b }).monat.netto;
  let lo = ziel;
  let hi = Math.max(ziel * 3, 100);
  while (netto(hi) < ziel) hi *= 2;
  while (lo < hi) {
    const mitte = Math.floor((lo + hi) / 2);
    if (netto(mitte) >= ziel) hi = mitte; else lo = mitte + 1;
  }
  let ergebnis = lo;
  for (let b = lo - 1, schritte = 0; b >= ziel && schritte < 20000; b--, schritte++) {
    if (netto(b) >= ziel) ergebnis = b;
  }
  return berechne(werte, { ...eingaben, bruttoMonat: ergebnis });
}
