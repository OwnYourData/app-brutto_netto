# Deployment – Brutto/Netto-Rechner auf dem PACE-Cluster

Statische Seite in einem unprivilegierten nginx-Container, Namespace `brutto-netto`, Host `brutto-netto.ownyourdata.eu`, TLS über cert-manager (`letsencrypt-prod`). Keine Datenbank, keine Secrets außer dem Pull-Secret für das Image. Muster wie dpp-service.

## Dateien

| Datei | Zweck |
|---|---|
| `brutto-netto.yaml` | Namespace, Deployment, Service, Ingress (ohne Zugriffsprotokoll), Certificate |
| `deploy.sh` | Tests → Build (amd64, `CSP=ads`) → Push nach GHCR → Manifest mit Image per Digest nach `tmp/` → Befehle für `pace diff` und `pace apply` |

## Erstinbetriebnahme

1. **DNS**: `brutto-netto.ownyourdata.eu` muss auf den Ingress des PACE-Clusters zeigen (dieselbe Adresse wie `dpp-service.ownyourdata.eu`, Stand 18.11.2026: `89.58.20.114`). Bis dahin zeigt der Eintrag auf `85.13.140.99`.
2. **Namespace und Pull-Secret**: Namespace anlegen und `ghcr-registry-secret` aus dem Namespace `sigbox` kopieren.
3. **Build und Push**: `./k8s/deploy.sh`.
4. **Diff und Apply**: die von `deploy.sh` ausgegebenen Befehle.
5. **Prüfen**: Seite und Header über HTTPS, Zertifikat, und dass der Ingress für diesen Host nichts protokolliert.

## Datensouveränität im Betrieb

- Container: `access_log off` (`nginx/default.conf`).
- Ingress: `nginx.ingress.kubernetes.io/enable-access-log: "false"`. Die Datenschutzerklärung sagt zu, dass auch der Eingangsserver keine Zugriffe protokolliert; das muss nach jedem Deployment stimmen.
- Content-Security-Policy: nur eigene Dateien und, nach Zustimmung, das Google-Ads-Tag (`nginx/security-headers-ads.conf`).
