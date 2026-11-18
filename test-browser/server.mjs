// Kleiner Testserver: liefert src/ mit denselben Sicherheits-Headern aus wie nginx
// (gelesen aus nginx/security-headers*.conf), damit die Browser-Tests auch die CSP prüfen.
// Optional ersetzt er src/assets/consent-config.js durch eine Test-Konfiguration.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../src/", import.meta.url));
const MIME = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml" };

export function headerAusNginx(variante) {
  const datei = variante === "ads" ? "security-headers-ads.conf" : "security-headers.conf";
  const text = readFileSync(new URL(`../nginx/${datei}`, import.meta.url), "utf8");
  const header = {};
  for (const m of text.matchAll(/^add_header\s+(\S+)\s+"([^"]*)"\s+always;/gm)) header[m[1]] = m[2];
  return header;
}

export async function starteServer({ csp = "strict", consentConfig = null } = {}) {
  const header = headerAusNginx(csp);
  const server = createServer(async (req, res) => {
    const pfad = decodeURIComponent(new URL(req.url, "http://x").pathname);
    for (const [k, v] of Object.entries(header)) res.setHeader(k, v);
    if (consentConfig && pfad === "/assets/consent-config.js") {
      res.setHeader("Content-Type", MIME[".js"]);
      res.end(`export default ${JSON.stringify(consentConfig)};\n`);
      return;
    }
    let datei = normalize(join(ROOT, pfad));
    if (!datei.startsWith(ROOT)) { res.statusCode = 403; res.end(); return; }
    try {
      if ((await stat(datei)).isDirectory()) datei = join(datei, "index.html");
      const inhalt = await readFile(datei);
      res.setHeader("Content-Type", MIME[extname(datei)] || "application/octet-stream");
      res.end(inhalt);
    } catch {
      res.statusCode = 404;
      res.end("not found");
    }
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}`, close: () => new Promise((ok) => server.close(ok)) };
}
