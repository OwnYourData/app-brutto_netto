#!/usr/bin/env bash
# =============================================================================
# Brutto/Netto-Rechner: Image bauen, nach GHCR pushen, Manifest mit Digest schreiben.
#
#   ./k8s/deploy.sh            -> Tag = heutiges Datum + 'a' (z. B. 261118a)
#   ./k8s/deploy.sh 261118b    -> expliziter Tag
#
# Voraussetzungen: docker mit buildx, node, Login bei ghcr.io.
# Angewendet wird nicht im Skript: Es gibt am Ende die Befehle für pace diff und
# pace apply aus, damit der Diff zuerst angesehen wird.
# =============================================================================
set -euo pipefail

IMAGE="ghcr.io/oyd-private/brutto-netto-rechner"
NS="brutto-netto"
TAG="${1:-$(date +%y%m%d)a}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ -n "$(git status --porcelain)" ]; then
    echo ">> Uncommitted changes -- commit them first" >&2
    exit 1
fi

echo ">> Tests"
npm test >/dev/null
npm run test:browser >/dev/null

echo ">> Build & Push ${IMAGE}:${TAG} (linux/amd64) from $(git rev-parse --short HEAD)"
META="$(mktemp)"
trap 'rm -f "$META"' EXIT
docker buildx build --platform linux/amd64 --build-arg CSP=ads \
    --metadata-file "$META" -t "${IMAGE}:${TAG}" . --push

DIGEST="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))["containerimage.digest"] || "")' "$META")"
case "$DIGEST" in
    sha256:*) ;;
    *) echo ">> No image digest in the build metadata -- not deploying" >&2; exit 1 ;;
esac
REF="${IMAGE}:${TAG}@${DIGEST}"

mkdir -p tmp
MANIFEST="tmp/brutto-netto-${TAG}.yaml"
sed "s|${IMAGE}:latest|${REF}|g" k8s/brutto-netto.yaml > "$MANIFEST"
if grep -q "${IMAGE}:latest" "$MANIFEST" || ! grep -q "$DIGEST" "$MANIFEST"; then
    echo ">> Image reference in ${MANIFEST} is not pinned -- not deploying" >&2
    exit 1
fi

cat <<MSG

>> Built and pushed: ${REF}
>> Pinned manifest: ${MANIFEST}
>> Review, then apply in your own shell:

cd ${REPO_ROOT} && pace diff -f ${MANIFEST}
cd ${REPO_ROOT} && pace apply -f ${MANIFEST} && pace -n ${NS} rollout status deployment/brutto-netto --timeout=180s
MSG
