# Einwilligung und Conversion-Messung

Der Rechner kann mit Einwilligung messen, ob ein Besuch, der mit einer Google-Ads-Anzeige begonnen hat, zu einer bestimmten Handlung führt. Ohne Konfiguration ist die Funktion aus: kein Banner, kein Skript, keine Anfrage an Google. Aufbau und Verhalten folgen dpp-service.ownyourdata.eu.

## Konfiguration

`src/assets/consent-config.js`:

| Feld | Wert |
|---|---|
| `id` | Conversion-ID des Google-Ads-Kontos, `AW-` gefolgt von Ziffern. Ohne gültigen Wert gilt nichts von dem, was unten steht. |
| `conversions.github` | Label: Klick auf ein Repository unter `github.com/OwnYourData/` (primäre Conversion). |
| `conversions.berechnung` | Label: erste selbst ausgelöste Berechnung je Seitenaufruf (sekundär, nicht für Gebote verwenden). |

Ein Label ist der Teil von `send_to` nach dem Schrägstrich (`AW-…/<label>`). Eine Conversion mit fehlendem oder ungültigem Label wird nicht gemessen, die anderen schon. Enhanced Conversions werden nicht verwendet.

Mit eingetragener ID muss der Container mit `--build-arg CSP=ads` gebaut werden. Die Variante erlaubt zusätzlich die Adressen des Google-Ads-Tags (`nginx/security-headers-ads.conf`). Mit der strikten Standard-CSP sperrt der Browser das Tag auch nach Zustimmung; das ist die Sicherung gegen eine Fehlkonfiguration.

## Verhalten

- Vor der Entscheidung lädt die Seite nichts von Google. Das Banner bietet „Ablehnen“ und „Zustimmen“, gleich groß und gleich gestaltet.
- Nach „Zustimmen“ setzt das Skript Google Consent Mode v2 (alle Signale zunächst verweigert, dann `ad_storage` und `ad_user_data` erlaubt, `ad_personalization` und `analytics_storage` bleiben verweigert), schaltet Personalisierungssignale ab und lädt `gtag.js` für die ID, ohne `gtag("config")`: keine Seitenaufrufe, kein Analytics, kein Remarketing.
- Gesendet wird nur bei einer Conversion. Eingegebene Werte stehen weder in der Adresse der Seite noch in einem Ereignis.
- Die Wahl liegt bis zu zwölf Monate im `localStorage` (`bnr-consent`). „Einwilligung ändern“ im Fußbereich öffnet das Banner erneut; Ablehnen nach Zustimmung löscht die `_gcl_`-Cookies der Domain und lädt die Seite ohne Tag neu.

## Nachweis

`npm run test:browser` prüft im echten Browser (Chromium über Playwright), mit denselben Sicherheits-Headern wie nginx:

1. Ohne ID: auf allen Seiten kein Banner und keine einzige Anfrage nach außen.
2. Mit ID, ohne Entscheidung: Banner, gleich große Knöpfe, keine Anfrage an Google.
3. Abgelehnt: keine Anfrage an Google, auch nach neuem Laden.
4. Zugestimmt: `gtag.js` wird genau einmal geladen, Conversions `berechnung` und `github` werden gemeldet, der eingegebene Betrag steht in keinem Ereignis und keiner Anfrage.
5. Widerruf: danach keine weitere Anfrage an Google.
6. Strikte CSP mit eingetragener ID: Der Browser sperrt das Tag.

Anfragen an Google werden im Test abgefangen und nie ins Netz weitergeleitet.
