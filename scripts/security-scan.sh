#!/usr/bin/env bash
# Security Gate — scans back-end and front-end dependencies with Trivy and
# reports, per vulnerable library, the version to bump to in package.json.
#
# - Uses the npm lockfiles (no node_modules needed).
# - Free, no account/token: Trivy aggregates GHSA + OSV + NVD advisories.
# - Fails (exit 1) when any finding reaches SECURITY_THRESHOLD (default HIGH),
#   which is what makes it a *gate* for CI.
#
# Trivy resolution order:
#   1) trivy already on PATH
#   2) ./bin/trivy (local, gitignored — see "install locally" hint below)
# We never install anything system-wide.
#
# Env:
#   SECURITY_THRESHOLD   LOW|MEDIUM|HIGH|CRITICAL   (default HIGH)
#   TRIVY_BIN            explicit path to a trivy binary

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

THRESHOLD="${SECURITY_THRESHOLD:-HIGH}"

log()  { printf '\033[1;36m[security]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[security]\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[1;31m[security]\033[0m %s\n' "$*" >&2; exit 1; }

# --- locate trivy -----------------------------------------------------------
TRIVY=""
if [ -n "${TRIVY_BIN:-}" ] && [ -x "${TRIVY_BIN}" ]; then
  TRIVY="${TRIVY_BIN}"
elif command -v trivy >/dev/null 2>&1; then
  TRIVY="$(command -v trivy)"
elif [ -x "./bin/trivy" ]; then
  TRIVY="./bin/trivy"
fi

if [ -z "${TRIVY}" ]; then
  warn "Trivy não encontrado."
  warn "Instale localmente (sem sudo, fica em ./bin e está no .gitignore):"
  warn ""
  warn "  curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh \\"
  warn "    | sh -s -- -b ./bin"
  warn ""
  warn "macOS:  brew install trivy        |  Linux (Debian/Ubuntu): apt-get install trivy"
  warn "Docs:   https://trivy.dev/latest/getting-started/installation/"
  fail "abortando: nenhuma engine de scan disponível"
fi
log "usando trivy: ${TRIVY}"
log "threshold de bloqueio: ${THRESHOLD}"

# --- scan each subproject ---------------------------------------------------
declare -a TARGETS=("back-end" "front-end")
declare -a REPORT_ARGS=()

# Pull the vuln DB once, quietly; cached afterwards.
export TRIVY_NO_PROGRESS=true

for proj in "${TARGETS[@]}"; do
  lockfile="${proj}/package-lock.json"
  if [ ! -f "${lockfile}" ]; then
    warn "${proj}: sem package-lock.json — pulando (rode 'make setup' antes)"
    continue
  fi
  outdir="${proj}/.security"
  mkdir -p "${outdir}"
  outfile="${outdir}/trivy-report.json"

  log "${proj}: escaneando dependências…"
  # fs scan of the project: Trivy reads the lockfile. Dev deps are excluded by
  # default; flip --include-dev-deps if you want them too.
  "${TRIVY}" fs \
    --scanners vuln \
    --severity LOW,MEDIUM,HIGH,CRITICAL \
    --format json \
    --output "${outfile}" \
    --quiet \
    "${proj}" || fail "${proj}: trivy falhou ao escanear"

  REPORT_ARGS+=("${proj}::${outfile}::${proj}/package.json")
done

if [ "${#REPORT_ARGS[@]}" -eq 0 ]; then
  fail "nenhum projeto escaneado"
fi

# --- render report + apply gate --------------------------------------------
# SECURITY_DETAILED=0 desativa a seção detalhada por CVE no console.
DETAILED_FLAG="--detailed"
if [ "${SECURITY_DETAILED:-1}" = "0" ]; then DETAILED_FLAG=""; fi

mkdir -p .security
node scripts/lib/security-report.mjs \
  --threshold "${THRESHOLD}" \
  ${DETAILED_FLAG} \
  --markdown ".security/report.md" \
  "${REPORT_ARGS[@]}"
