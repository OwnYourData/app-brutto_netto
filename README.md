# Brutto/Netto-Rechner Österreich – ohne Datenspeicherung

Ein Brutto/Netto-Rechner für unselbständig Beschäftigte in Österreich, der vollständig im Browser rechnet. Eingaben verlassen das Gerät nicht: kein Server-Endpunkt für Eingaben, keine Cookies, keine Analyse-Werkzeuge, keine Schriften oder Skripte von fremden Servern.

Ein Projekt des Vereins [OwnYourData](https://www.ownyourdata.eu/).

## Stand

- Rechenkern (`src/kern/rechner.js`) mit Werten für 2026 und 2027 (`src/werte/`).
- 2026 ist gegen den Brutto-Netto-Rechner des BMF abgeglichen: 20 Fälle, 175 Einzelwerte, keine Abweichung.
- 2027 ist vorläufig: Die Sozialversicherungswerte 2027 sind noch nicht kundgemacht, und der BMF-Rechner 2027 ist noch nicht verfügbar (siehe `offen` in `src/werte/2027.json`).
- Oberfläche auf Deutsch und Englisch (`src/index.html`, `src/en/index.html`), eigene Datenschutzerklärung (`src/datenschutz/`, `src/en/privacy/`), Einwilligung und Conversion-Messung (ausgeschaltet, bis eine Conversion-ID eingetragen ist).

## Was gerechnet wird

Laufende Lohnverrechnung für Angestellte und Arbeiter:innen, wie sie der BMF-Rechner abbildet:

- Sozialversicherung (inkl. reduzierter Arbeitslosenversicherung, Höchstbeitragsgrundlage, Wohnbauförderungsbeitrag Wien)
- Lohnsteuer nach dem Tarif des Jahres, Werbungskostenpauschale, Verkehrsabsetzbetrag (auch erhöht)
- 13. und 14. Bezug: Freibetrag, Freigrenze, Jahressechstel, feste Steuersätze
- Pendlerpauschale (auch zu einem oder zwei Dritteln) und Pendlereuro
- Familienbonus Plus (inkl. Aufteilungsregeln ab 2027), Alleinverdiener-/Alleinerzieherabsetzbetrag
- Umkehrrechnung Netto → Brutto

Dazu eine Schätzung, was die Arbeitnehmerveranlagung voraussichtlich zusätzlich bringt (gleichbleibender Bezug, keine weiteren Einkünfte): Zuschlag zum Verkehrsabsetzbetrag, SV-Rückerstattung samt SV-Bonus, Gutschrift von Alleinverdiener-/Alleinerzieherabsetzbetrag und Kindermehrbetrag. Der BMF-Brutto-Netto-Rechner rechnet diesen Teil nicht; die Tests in `test/veranlagung.test.js` sind deshalb von Hand aus EStG 1988 und LStR 2002 hergeleitet.

Der Rechner ist eine Näherung und ersetzt keine Steuerberatung.

## Werte austauschen

Jedes Jahr hat eine eigene Datei `src/werte/<jahr>.json`. Jeder Wert nennt seine amtliche Quelle (BGBl., RIS, BMF, ÖGK). Für ein neues Jahr: Datei kopieren, Werte aus den Quellen übernehmen, Referenzfälle gegen den BMF-Rechner des neuen Jahres erheben (`test/referenz-<jahr>.json`) und die Tests laufen lassen.

## Lokal starten

Die Seite besteht nur aus statischen Dateien in `src/`. Der Container liefert sie mit nginx aus, ohne Zugriffsprotokoll und mit einer Content-Security-Policy, die nur Dateien dieser Adresse erlaubt:

```
docker build -t brutto-netto-rechner:dev .
docker run -d --rm --name brutto-netto -p 8080:8080 brutto-netto-rechner:dev
```

Danach unter http://localhost:8080 (Deutsch) bzw. http://localhost:8080/en/ (Englisch).

## Tests

```
npm test
```

Benötigt Node.js ab Version 20, sonst keine Abhängigkeiten.

Der Nachweis, dass ohne Einwilligung keine Anfrage nach außen geht, läuft im echten Browser (siehe `docs/Consent.md`). Er braucht Playwright als Entwicklungsabhängigkeit; die ausgelieferte Seite enthält nichts davon:

```
npm install
npx playwright install chromium
npm run test:browser
```

## Lizenz

Code: Apache License 2.0 (`LICENSE`). Erklärtexte: CC BY 4.0. Siehe `NOTICE`.
