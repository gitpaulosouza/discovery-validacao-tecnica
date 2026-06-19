# Security Gate — scans back-end and front-end dependencies with Trivy and
# reports, per vulnerable library, the version to bump to in package.json.
# Windows counterpart of security-scan.sh. Never installs anything system-wide.
#
# Env:
#   SECURITY_THRESHOLD   LOW|MEDIUM|HIGH|CRITICAL   (default HIGH)
#   TRIVY_BIN            explicit path to a trivy binary

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $RepoRoot

$Threshold = if ($env:SECURITY_THRESHOLD) { $env:SECURITY_THRESHOLD } else { 'HIGH' }

function Log  ($m) { Write-Host "[security] $m" -ForegroundColor Cyan }
function Warn ($m) { Write-Host "[security] $m" -ForegroundColor Yellow }
function Fail ($m) { Write-Host "[security] $m" -ForegroundColor Red; exit 1 }

# --- locate trivy -----------------------------------------------------------
$Trivy = $null
if ($env:TRIVY_BIN -and (Test-Path $env:TRIVY_BIN)) {
  $Trivy = $env:TRIVY_BIN
} elseif (Get-Command trivy -ErrorAction SilentlyContinue) {
  $Trivy = (Get-Command trivy).Source
} elseif (Test-Path './bin/trivy.exe') {
  $Trivy = './bin/trivy.exe'
}

if (-not $Trivy) {
  Warn 'Trivy não encontrado.'
  Warn 'Instale (escolha um):'
  Warn '  scoop install trivy'
  Warn '  choco install trivy'
  Warn 'Docs: https://trivy.dev/latest/getting-started/installation/'
  Fail 'abortando: nenhuma engine de scan disponível'
}
Log "usando trivy: $Trivy"
Log "threshold de bloqueio: $Threshold"

# --- scan each subproject ---------------------------------------------------
$Targets = @('back-end', 'front-end')
$ReportArgs = @()
$env:TRIVY_NO_PROGRESS = 'true'

foreach ($proj in $Targets) {
  $lockfile = Join-Path $proj 'package-lock.json'
  if (-not (Test-Path $lockfile)) {
    Warn "$proj: sem package-lock.json — pulando (rode 'make setup' antes)"
    continue
  }
  $outdir = Join-Path $proj '.security'
  New-Item -ItemType Directory -Force -Path $outdir | Out-Null
  $outfile = Join-Path $outdir 'trivy-report.json'

  Log "$proj: escaneando dependências…"
  & $Trivy fs --scanners vuln --severity LOW,MEDIUM,HIGH,CRITICAL `
    --format json --output $outfile --quiet $proj
  if ($LASTEXITCODE -ne 0) { Fail "$proj: trivy falhou ao escanear" }

  $ReportArgs += "$proj::$outfile::$proj/package.json"
}

if ($ReportArgs.Count -eq 0) { Fail 'nenhum projeto escaneado' }

# --- render report + apply gate --------------------------------------------
# SECURITY_DETAILED=0 desativa a seção detalhada por CVE no console.
$NodeArgs = @('scripts/lib/security-report.mjs', '--threshold', $Threshold)
if ($env:SECURITY_DETAILED -ne '0') { $NodeArgs += '--detailed' }
New-Item -ItemType Directory -Force -Path '.security' | Out-Null
$NodeArgs += @('--markdown', '.security/report.md')
$NodeArgs += $ReportArgs

& node @NodeArgs
exit $LASTEXITCODE
